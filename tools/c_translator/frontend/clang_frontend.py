import hashlib
import re
import subprocess
from pathlib import Path


FUNC_SIG_RE = re.compile(
    r"^\s*(?:[A-Za-z_][\w\s\*\(\)]*?\s+)?([A-Za-z_]\w*)\s*\([^;]*\)\s*$"
)
DEFINE_RE = re.compile(r"^\s*#\s*define\s+([A-Za-z_]\w*)\b")
MACRO_CALL_RE = re.compile(r"\b([A-Z][A-Z0-9_]*)\s*\(")
PP_LINE_RE = re.compile(r'^\s*#\s+(\d+)\s+"([^"]+)"(?:\s+\d+)*\s*$')


def _extract_functions_regex(source_text):
    functions = []
    lines = source_text.splitlines()
    for i, line in enumerate(lines, start=1):
        m = FUNC_SIG_RE.match(line)
        if not m:
            continue
        name = m.group(1)
        if name in {"if", "while", "for", "switch"}:
            continue
        if name.upper() == name:
            continue
        if "=" in line:
            continue
        # C style often puts "{" on the next line; confirm it.
        j = i
        opener = None
        while j < len(lines):
            probe = lines[j].strip()
            if not probe or probe.startswith("/*") or probe.startswith("*"):
                j += 1
                continue
            opener = probe
            break
        if opener != "{":
            continue
        functions.append({"name": name, "line": i})
    return functions


def _try_libclang(path, compile_args):
    try:
        from clang import cindex  # type: ignore
    except Exception:
        return {"available": False, "reason": "clang.cindex import failed"}

    try:
        index = cindex.Index.create()
        tu = index.parse(str(path), args=compile_args)
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
