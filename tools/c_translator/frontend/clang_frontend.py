import hashlib
import os
import re
import subprocess
from pathlib import Path


FUNC_SIG_RE = re.compile(
    r"^\s*(?:[A-Za-z_][\w\s\*\(\)]*?\s+)?([A-Za-z_]\w*)\s*\([^;]*\)\s*$"
)
DEFINE_RE = re.compile(r"^\s*#\s*define\s+([A-Za-z_]\w*)\b")
MACRO_CALL_RE = re.compile(r"\b([A-Z][A-Z0-9_]*)\s*\(")
PP_LINE_RE = re.compile(r'^\s*#\s+(\d+)\s+"([^"]+)"(?:\s+\d+)*\s*$')
FUNC_NAME_RE = re.compile(r"\b([A-Za-z_]\w*)\s*\(")

_GCC_INCLUDE_CACHE = None


def _extract_functions_regex(source_text):
    functions = []
    seen = set()
    lines = source_text.splitlines()
    n = len(lines)
    i = 0

    def _is_comment_or_blank(s):
        t = s.strip()
        return (not t or t.startswith("//") or t.startswith("/*")
                or t.startswith("*") or t.startswith("*/"))

    brace_depth = 0
    while i < n:
        line = lines[i]
        stripped = line.strip()
        if brace_depth > 0:
            brace_depth += line.count("{") - line.count("}")
            i += 1
            continue
        if _is_comment_or_blank(stripped) or stripped.startswith("#"):
            i += 1
            continue

        # Fast path for simple single-line signatures.
        m = FUNC_SIG_RE.match(line)
        if m:
            name = m.group(1)
            j = i + 1
            opener = None
            while j < n:
                probe = lines[j].strip()
                if _is_comment_or_blank(probe):
                    j += 1
                    continue
                opener = probe
                break
            if opener == "{":
                if name not in {"if", "while", "for", "switch"} and name.upper() != name:
                    key = (name, i + 1)
                    if key not in seen:
                        seen.add(key)
                        functions.append({"name": name, "line": i + 1})
                brace_depth = 1
                i = j + 1
                continue

        # Multi-line signature scan (handles split return type/name/params).
        sig_start = i
        sig_parts = []
        paren_depth = 0
        saw_open_paren = False
        j = i
        ended_with_brace = False
        ended_with_proto = False
        while j < n and (j - i) < 60:
            cur = lines[j]
            cur_s = cur.strip()
            if _is_comment_or_blank(cur_s):
                j += 1
                continue
            if cur_s.startswith("#"):
                break
            sig_parts.append(cur_s)
            for ch in cur:
                if ch == "(":
                    paren_depth += 1
                    saw_open_paren = True
                elif ch == ")" and paren_depth > 0:
                    paren_depth -= 1
            if saw_open_paren and paren_depth == 0:
                tail = cur_s
                if tail.endswith(";"):
                    ended_with_proto = True
                elif "{" in tail:
                    ended_with_brace = True
                else:
                    k = j + 1
                    while k < n and _is_comment_or_blank(lines[k]):
                        k += 1
                    if k < n:
                        nxt = lines[k].strip()
                        if nxt.startswith("{"):
                            ended_with_brace = True
                            j = k
                        elif nxt.startswith(";"):
                            ended_with_proto = True
                            j = k
                break
            j += 1

        if ended_with_proto or not ended_with_brace:
            i += 1
            continue

        sig_text = " ".join(sig_parts)
        first_paren = sig_text.find("(")
        if first_paren <= 0:
            i = j + 1
            continue
        prefix = sig_text[:first_paren]
        if "=" in prefix:
            i = j + 1
            continue

        names = FUNC_NAME_RE.findall(sig_text)
        if not names:
            i = j + 1
            continue
        name = names[-1]
        if name in {"if", "while", "for", "switch"} or name.upper() == name:
            i = j + 1
            continue

        key = (name, sig_start + 1)
        if key not in seen:
            seen.add(key)
            functions.append({"name": name, "line": sig_start + 1})
        brace_depth = 1
        i = j + 1

    return functions


def _try_libclang(path, compile_args):
    try:
        from clang import cindex  # type: ignore
    except Exception:
        return {"available": False, "reason": "clang.cindex import failed"}

    _configure_libclang(cindex)

    try:
        index = cindex.Index.create()
        tu = index.parse(str(path), args=_augment_compile_args_for_clang(compile_args))
    except Exception as err:
        return {"available": False, "reason": f"clang parse failed: {err}"}

    diagnostics = []
    for d in tu.diagnostics:
        diagnostics.append({"severity": int(d.severity), "spelling": str(d.spelling)})

    return {
        "available": True,
        "diagnostic_count": len(diagnostics),
        "diagnostics": diagnostics[:20],
    }


def _parse_tu_with_clang(path, compile_args):
    from clang import cindex  # type: ignore

    _configure_libclang(cindex)
    index = cindex.Index.create()
    args = _augment_compile_args_for_clang(compile_args)
    return cindex, index.parse(str(path), args=args)


def _discover_gcc_include_dir():
    global _GCC_INCLUDE_CACHE
    if _GCC_INCLUDE_CACHE is not None:
        return _GCC_INCLUDE_CACHE
    try:
        proc = subprocess.run(
            ["gcc", "-print-file-name=include"],
            check=False,
            capture_output=True,
            text=True,
        )
    except Exception:
        _GCC_INCLUDE_CACHE = None
        return _GCC_INCLUDE_CACHE
    if proc.returncode != 0:
        _GCC_INCLUDE_CACHE = None
        return _GCC_INCLUDE_CACHE
    candidate = (proc.stdout or "").strip()
    if candidate and Path(candidate).exists():
        _GCC_INCLUDE_CACHE = candidate
        return _GCC_INCLUDE_CACHE
    _GCC_INCLUDE_CACHE = None
    return _GCC_INCLUDE_CACHE


def _augment_compile_args_for_clang(compile_args):
    args = list(compile_args or [])
    if any(a == "-isystem" for a in args):
        return args
    gcc_include = _discover_gcc_include_dir()
    if gcc_include:
        args = [*args, "-isystem", gcc_include]
    return args


def _extent_text(lines, extent):
    sl = extent.start.line
    sc = extent.start.column
    el = extent.end.line
    ec = extent.end.column
    if sl < 1 or el < 1 or sl > len(lines) or el > len(lines):
        return ""
    if sl == el:
        return lines[sl - 1][sc - 1 : ec - 1]
    parts = [lines[sl - 1][sc - 1 :]]
    for i in range(sl, el - 1):
        parts.append(lines[i])
    parts.append(lines[el - 1][: ec - 1])
    return "\n".join(parts)


def _serialize_stmt(cursor, lines):
    return {
        "kind": cursor.kind.name,
        "text": _extent_text(lines, cursor.extent).strip(),
        "children": [_serialize_stmt(ch, lines) for ch in cursor.get_children()],
    }


def function_ast_summary(src_path, compile_profile, func_name):
    path = Path(src_path)
    lines = path.read_text(encoding="utf-8", errors="replace").splitlines()

    try:
        cindex, tu = _parse_tu_with_clang(path, compile_profile.get("args", []))
    except Exception as err:
        return {"available": False, "reason": f"clang parse failed: {err}"}

    source_resolved = str(path.resolve())

    def walk(cur):
        if cur.kind == cindex.CursorKind.FUNCTION_DECL and cur.spelling == func_name:
            f = cur.location.file
            file_resolved = str(Path(str(f)).resolve()) if f else ""
            if not cur.is_definition() or file_resolved != source_resolved:
                return None

            compound = None
            params = []
            for ch in cur.get_children():
                if ch.kind == cindex.CursorKind.PARM_DECL:
                    params.append(ch.spelling or "arg")
                elif ch.kind == cindex.CursorKind.COMPOUND_STMT:
                    compound = ch

            if compound is None:
                return None

            return {
                "available": True,
                "name": cur.spelling,
                "signature_line": cur.extent.start.line,
                "params": params,
                "compound": _serialize_stmt(compound, lines),
            }
        for ch in cur.get_children():
            found = walk(ch)
            if found is not None:
                return found
        return None

    found = walk(tu.cursor)
    if found is None:
        return {"available": False, "reason": f"function not found: {func_name}"}
    return found


def _configure_libclang(cindex):
    if getattr(cindex.Config, "loaded", False):
        return

    # Respect explicit override first.
    explicit = os.environ.get("LIBCLANG_PATH") or os.environ.get("C_TRANSLATOR_LIBCLANG")
    if explicit:
        p = Path(explicit)
        if p.is_file():
            cindex.Config.set_library_file(str(p))
            return
        if p.is_dir():
            cindex.Config.set_library_path(str(p))
            return

    # Next, look for libclang shipped with the python clang package.
    try:
        import clang  # type: ignore
    except Exception:
        return

    clang_root = Path(getattr(clang, "__file__", "")).resolve().parent
    candidates = sorted(clang_root.glob("**/libclang.so*"))
    if not candidates:
        return
    # Prefer exact soname if present, otherwise latest lexical match.
    preferred = None
    for c in candidates:
        if c.name == "libclang.so":
            preferred = c
            break
    cindex.Config.set_library_file(str(preferred or candidates[-1]))


def _collect_macro_definitions(lines):
    definitions = []
    for i, line in enumerate(lines, start=1):
        m = DEFINE_RE.match(line)
        if not m:
            continue
        definitions.append({"name": m.group(1), "line": i})
    return definitions


def _collect_pp_macro_names(pp_text):
    names = set()
    for line in pp_text.splitlines():
        m = DEFINE_RE.match(line)
        if m:
            names.add(m.group(1))
    return names


def _collect_macro_invocations(lines, macro_names):
    invocations = []
    macro_name_set = set(macro_names)
    for i, line in enumerate(lines, start=1):
        if line.lstrip().startswith("#"):
            continue
        for m in MACRO_CALL_RE.finditer(line):
            name = m.group(1)
            if macro_name_set and name not in macro_name_set:
                continue
            invocations.append(
                {
                    "name": name,
                    "line": i,
                    "column": m.start(1) + 1,
                    "defined_in_file": name in macro_name_set,
                }
            )
    return invocations


def _filter_cpp_args(compile_args):
    filtered = []
    skip_next = False
    for i, arg in enumerate(compile_args):
        if skip_next:
            skip_next = False
            continue
        if arg == "-x":
            skip_next = True
            continue
        if arg.startswith("-std="):
            continue
        filtered.append(arg)
    return filtered


def _run_cpp(path, compile_args):
    cpp_cmd = ["cpp", "-E", "-dD", *_filter_cpp_args(compile_args), str(path)]
    try:
        proc = subprocess.run(
            cpp_cmd,
            check=False,
            capture_output=True,
            text=True,
        )
    except Exception as err:
        return {"available": False, "reason": f"cpp invocation failed: {err}"}
    if proc.returncode != 0:
        return {
            "available": False,
            "reason": f"cpp returned {proc.returncode}",
            "stderr": proc.stderr.strip().splitlines()[:10],
        }
    return {"available": True, "stdout": proc.stdout}


def _build_pp_crosswalk(pp_text, source_path):
    logical_file = None
    logical_line = 0
    crosswalk = []
    source_norm = str(source_path).replace("\\", "/")
    for i, raw_line in enumerate(pp_text.splitlines(), start=1):
        marker = PP_LINE_RE.match(raw_line)
        if marker:
            logical_line = int(marker.group(1)) - 1
            logical_file = marker.group(2).replace("\\", "/")
            continue
        logical_line += 1
        if logical_file == source_norm:
            crosswalk.append({"pp_line": i, "source_line": logical_line})
    return crosswalk


def parse_summary(src_path, compile_profile, func_filter=None):
    path = Path(src_path)
    text = path.read_text(encoding="utf-8", errors="replace")
    sha = hashlib.sha256(text.encode("utf-8")).hexdigest()
    functions = _extract_functions_regex(text)
    if func_filter:
        functions = [f for f in functions if f["name"] == func_filter]

    clang_state = _try_libclang(path, compile_profile.get("args", []))
    backend = "libclang+regex" if clang_state.get("available") else "regex-only"

    return {
        "source": str(path).replace("\\", "/"),
        "source_sha256": sha,
        "line_count": len(text.splitlines()),
        "function_count": len(functions),
        "functions": functions,
        "clang": clang_state,
        "backend": backend,
    }


def provenance_summary(src_path, compile_profile):
    path = Path(src_path)
    text = path.read_text(encoding="utf-8", errors="replace")
    sha = hashlib.sha256(text.encode("utf-8")).hexdigest()
    lines = text.splitlines()

    definitions = _collect_macro_definitions(lines)
    macro_names = {entry["name"] for entry in definitions}

    cpp_result = _run_cpp(path, compile_profile.get("args", []))
    pp = {
        "available": bool(cpp_result.get("available")),
        "crosswalk_count": 0,
        "crosswalk_sample": [],
    }
    if cpp_result.get("available"):
        macro_names.update(_collect_pp_macro_names(cpp_result["stdout"]))
        invocations = _collect_macro_invocations(lines, macro_names)
        crosswalk = _build_pp_crosswalk(cpp_result["stdout"], path)
        pp["crosswalk_count"] = len(crosswalk)
        pp["crosswalk_sample"] = crosswalk[:200]
    else:
        invocations = _collect_macro_invocations(lines, macro_names)
        pp["reason"] = cpp_result.get("reason")
        if cpp_result.get("stderr"):
            pp["stderr"] = cpp_result["stderr"]

    return {
        "source": str(path).replace("\\", "/"),
        "source_sha256": sha,
        "line_count": len(lines),
        "macro_definition_count": len(definitions),
        "macro_definitions": definitions,
        "macro_invocation_count": len(invocations),
        "macro_invocations": invocations,
        "macro_name_count": len(macro_names),
        "pp": pp,
    }
