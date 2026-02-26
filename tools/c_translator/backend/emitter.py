import json
import re
from pathlib import Path

from async_infer import build_async_summary
from cfg import build_cfg_summary
from frontend import function_ast_summary
from nir import build_nir_snapshot


FUNC_SIG_LINE_RE = re.compile(r"^\s*([A-Za-z_]\w*)\s*\(([^)]*)\)\s*$")
IDENT_RE = re.compile(r"[A-Za-z_]\w*$")
DECL_RE = re.compile(
    r"^(?:unsigned\s+)?(?:int|long|short|boolean|coordxy|schar|uchar)\s+(.+);$"
)
PANIC_RE = re.compile(r'^panic\("([^"]+)"\)$')


def _extract_param_names(signature_line):
    m = FUNC_SIG_LINE_RE.match(signature_line.strip())
    if not m:
        return []
    arg_src = m.group(2).strip()
    if not arg_src or arg_src == "void":
        return []
    names = []
    for raw in arg_src.split(","):
        token = raw.strip()
        if token == "...":
            names.append("varargs")
            continue
        ident = IDENT_RE.search(token)
        if ident:
            names.append(ident.group(0))
        else:
            names.append("arg")
    return names


def emit_helper_scaffold(src_path, func_name, compile_profile=None):
    if not func_name:
        raise ValueError("--func is required for emit-helper mode")

    path = Path(src_path)
    text = path.read_text(encoding="utf-8", errors="replace")
    lines = text.splitlines()

    nir = build_nir_snapshot(src_path, func_name)
    if nir["function_count"] != 1:
        raise ValueError(
            f"emit-helper requires exactly one function match, found {nir['function_count']} for {func_name}"
        )
    fn = nir["functions"][0]
    cfg = build_cfg_summary(src_path, func_name)["functions"][0]["cfg"]
    sig_line = lines[fn["span"]["signature_line"] - 1]
    params = _extract_param_names(sig_line)
    ast_summary = None
    translated = False
    lower_diags = []
    required_params = set()
    rewrite_rules = _load_rewrite_rules()
    async_info = _load_async_info(src_path, fn["name"])
    requires_async = async_info["requires_async"]
    awaitable_calls = async_info["awaitable_calls"]
    if compile_profile is not None:
        ast_summary = function_ast_summary(src_path, compile_profile, fn["name"])
    if ast_summary and ast_summary.get("available"):
        translated_lines, lower_diags, required_params = _translate_ast_compound(
            ast_summary["compound"],
            1,
            rewrite_rules,
            awaitable_calls,
        )
        if translated_lines is not None:
            params = ast_summary.get("params") or params
            for p in sorted(required_params):
                if p not in params:
                    params.append(p)
            translated = True

    func_decl = "export async function" if requires_async else "export function"
    if translated:
        js_lines = [
            f"// TRANSLATOR: AUTO ({path.name}:{fn['span']['signature_line']})",
            f"{func_decl} {fn['name']}({', '.join(params)}) {{",
            *translated_lines,
            "}",
        ]
    else:
        js_lines = [
            f"// TRANSLATOR: AUTO ({path.name}:{fn['span']['signature_line']})",
            f"{func_decl} {fn['name']}({', '.join(params)}) {{",
            "  // TODO(iron-parity): translated body pending pass pipeline.",
            '  throw new Error("UNIMPLEMENTED_TRANSLATED_FUNCTION");',
            "}",
        ]

    diags = []
    diags.extend(lower_diags)
    if cfg["goto_count"] > 0 or cfg["label_count"] > 0:
        diags.append(
            {
                "severity": "warning",
                "code": "CFG_COMPLEXITY",
                "message": "Function has labels/gotos; helper scaffold is non-semantic placeholder.",
            }
        )
    if ast_summary and not ast_summary.get("available"):
        diags.append(
            {
                "severity": "warning",
                "code": "CLANG_AST_UNAVAILABLE",
                "message": ast_summary.get("reason", "unknown clang AST failure"),
            }
        )
    if not translated:
        diags.append(
            {
                "severity": "warning",
                "code": "PLACEHOLDER_BODY",
                "message": "Function body emitted as placeholder scaffold.",
            }
        )
    if "varargs" in params:
        diags.append(
            {
                "severity": "warning",
                "code": "VARARGS_APPROX",
                "message": "Varargs parameter approximated as `varargs`.",
            }
        )

    return {
        "emit_mode": "emit-helper",
        "source": str(path).replace("\\", "/"),
        "function": fn["name"],
        "js": "\n".join(js_lines) + "\n",
        "meta": {
            "signature_line": fn["span"]["signature_line"],
            "body_start_line": fn["span"]["body_start_line"],
            "body_end_line": fn["span"]["body_end_line"],
            "body_sha256": fn["body_sha256"],
            "param_names": params,
            "call_count": len(fn["calls"]),
            "assignment_count": len(fn["assignments"]),
            "cfg_tags": cfg["reducible_tags"],
            "translated": translated,
            "requires_async": requires_async,
            "awaitable_calls": sorted(awaitable_calls),
        },
        "diag": diags,
    }


def _translate_ast_compound(compound_stmt, base_indent, rewrite_rules, awaitable_calls):
    if not isinstance(compound_stmt, dict) or compound_stmt.get("kind") != "COMPOUND_STMT":
        return None, [_diag("UNSUPPORTED_TOPLEVEL", "Expected COMPOUND_STMT for function body")], set()

    out = []
    diags = []
    required_params = set()
    for child in compound_stmt.get("children", []):
        lines, child_diags, child_required = _translate_stmt(
            child,
            base_indent,
            rewrite_rules,
            awaitable_calls,
        )
        diags.extend(child_diags)
        if lines is None:
            return None, diags, required_params
        out.extend(lines)
        required_params.update(child_required)
    out = _merge_adjacent_let_lines(out)
    unresolved = _find_unresolved_tokens(out)
    if unresolved:
        diags.append(
            _diag(
                "UNRESOLVED_C_TOKENS",
                f"Unresolved C tokens after rewrite: {', '.join(sorted(unresolved))}",
            )
        )
        return None, diags, required_params
    legacy_tokens = _find_legacy_js_tokens(out)
    if legacy_tokens:
        diags.append(
            _diag(
                "LEGACY_JS_TARGETS",
                f"Generated output used legacy JS paths: {', '.join(sorted(legacy_tokens))}",
            )
        )
        return None, diags, required_params
    return out, diags, required_params


def _translate_stmt(stmt, indent, rewrite_rules, awaitable_calls):
    kind = stmt.get("kind")
    text = _normalize_space(stmt.get("text", ""))
    children = stmt.get("children", [])
    pad = "  " * indent

    if kind == "DECL_STMT":
        lowered, req = _lower_decl_stmt(text, rewrite_rules)
        if lowered is None:
            return None, [_diag("UNSUPPORTED_DECL_STMT", text)], set()
        return [pad + lowered], [], req

    if kind == "IF_STMT":
        return _translate_if_stmt(stmt, indent, rewrite_rules, awaitable_calls)

    if kind == "COMPOUND_STMT":
        out = []
        diags = []
        required_params = set()
        for child in children:
            lines, child_diags, child_required = _translate_stmt(
                child,
                indent,
                rewrite_rules,
                awaitable_calls,
            )
            diags.extend(child_diags)
            if lines is None:
                return None, diags, required_params
            out.extend(lines)
            required_params.update(child_required)
        return out, diags, required_params

    if kind in {"BINARY_OPERATOR", "UNARY_OPERATOR", "RETURN_STMT", "CALL_EXPR"}:
        lowered, req = _lower_expr_stmt(text, rewrite_rules, awaitable_calls)
        if lowered is None:
            return None, [_diag("UNSUPPORTED_EXPR_STMT", text)], set()
        return [pad + lowered], [], req

    if kind == "NULL_STMT":
        return [], [], set()

    return None, [_diag("UNSUPPORTED_STMT_KIND", kind)], set()


def _translate_stmt_as_block(stmt, indent, rewrite_rules, awaitable_calls):
    kind = stmt.get("kind")
    if kind == "COMPOUND_STMT":
        return _translate_stmt(stmt, indent, rewrite_rules, awaitable_calls)
    return _translate_stmt(stmt, indent, rewrite_rules, awaitable_calls)


def _translate_if_stmt(stmt, indent, rewrite_rules, awaitable_calls):
    children = stmt.get("children", [])
    pad = "  " * indent
    if len(children) < 2:
        return None, [_diag("BAD_IF_AST", _normalize_space(stmt.get("text", "")))], set()

    cond, cond_req = _lower_expr(_normalize_space(children[0].get("text", "")), rewrite_rules)
    if cond is None:
        return None, [_diag("BAD_IF_COND", _normalize_space(stmt.get("text", "")))], set()

    out = []
    diags = []
    required_params = set(cond_req)

    then_stmt = children[1]
    then_lines, then_diags, then_req = _translate_stmt_as_block(
        then_stmt,
        indent + 1,
        rewrite_rules,
        awaitable_calls,
    )
    if then_lines is None:
        return None, then_diags, required_params
    diags.extend(then_diags)
    required_params.update(then_req)

    if _can_inline_if_body(then_stmt, then_lines):
        out.append(f"{pad}if ({cond}) {then_lines[0].strip()}")
    elif _can_inline_compact_block(then_stmt, then_lines):
        compact = _compact_block_line(then_lines)
        out.append(f"{pad}if ({cond}) {{ {compact} }}")
    else:
        out.append(f"{pad}if ({cond}) {{")
        out.extend(then_lines)
        out.append(f"{pad}}}")

    if len(children) >= 3:
        else_stmt = children[2]
        if else_stmt.get("kind") == "IF_STMT":
            else_lines, else_diags, else_req = _translate_if_stmt(
                else_stmt,
                indent,
                rewrite_rules,
                awaitable_calls,
            )
            if else_lines is None:
                return None, else_diags, required_params
            diags.extend(else_diags)
            required_params.update(else_req)
            if not else_lines:
                return out, diags, required_params
            first = else_lines[0].lstrip()
            out.append(f"{pad}else {first}")
            out.extend(else_lines[1:])
        else:
            else_lines, else_diags, else_req = _translate_stmt_as_block(
                else_stmt,
                indent + 1,
                rewrite_rules,
                awaitable_calls,
            )
            if else_lines is None:
                return None, else_diags, required_params
            diags.extend(else_diags)
            required_params.update(else_req)
            if _can_inline_compact_block(else_stmt, else_lines):
                compact = _compact_block_line(else_lines)
                out.append(f"{pad}else {{ {compact} }}")
            else:
                out.append(f"{pad}else {{")
                out.extend(else_lines)
                out.append(f"{pad}}}")

    return out, diags, required_params


def _can_inline_if_body(stmt, lines):
    if not lines or len(lines) != 1:
        return False
    kind = stmt.get("kind")
    return kind in {"BINARY_OPERATOR", "UNARY_OPERATOR", "RETURN_STMT", "CALL_EXPR"}


def _can_inline_compact_block(stmt, lines):
    if stmt.get("kind") != "COMPOUND_STMT":
        return False
    if not lines or len(lines) > 2:
        return False
    total_len = 0
    for line in lines:
        token = line.strip()
        if not token or "{" in token or "}" in token:
            return False
        if len(token) > 48:
            return False
        total_len += len(token)
    return total_len <= 72


def _compact_block_line(lines):
    return " ".join(line.strip() for line in lines)


def _merge_adjacent_let_lines(lines):
    merged = []
    i = 0
    while i < len(lines):
        line = lines[i]
        if not _is_let_line(line):
            merged.append(line)
            i += 1
            continue

        indent = line[: len(line) - len(line.lstrip())]
        decls = [_let_payload(line)]
        j = i + 1
        while j < len(lines) and _is_let_line(lines[j]):
            next_indent = lines[j][: len(lines[j]) - len(lines[j].lstrip())]
            if next_indent != indent:
                break
            candidate = decls + [_let_payload(lines[j])]
            combined = ", ".join(candidate)
            if len(combined) > 72:
                break
            decls.append(_let_payload(lines[j]))
            j += 1

        merged.append(f"{indent}let {', '.join(decls)};")
        i = j
    return merged


def _is_let_line(line):
    s = line.lstrip()
    return s.startswith("let ") and s.endswith(";")


def _let_payload(line):
    s = line.strip()
    return s[len("let ") : -1].strip()


def _lower_decl_stmt(text, rewrite_rules):
    m = DECL_RE.match(text)
    if not m:
        return None, set()
    decl = m.group(1)
    lowered = []
    req = set()
    for raw in decl.split(","):
        token = raw.strip().replace("*", " ").strip()
        if not token:
            return None, set()
        if "=" in token:
            lhs, rhs = token.split("=", 1)
            rhs, rhs_req = _lower_expr(rhs.strip(), rewrite_rules)
            if rhs is None:
                return None, set()
            req.update(rhs_req)
            lowered.append(f"{lhs.strip()} = {rhs}")
        else:
            lowered.append(token)
    return f"let {', '.join(lowered)};", req


def _lower_expr_stmt(text, rewrite_rules, awaitable_calls):
    t = text.rstrip(";").strip()
    if not t:
        return None, set()
    original_call = _extract_call_name(t)
    pm = PANIC_RE.match(t)
    if pm:
        return f"throw new Error('{pm.group(1)}');", set()
    lowered, req = _lower_expr(t, rewrite_rules)
    if lowered is None:
        return None, set()
    lowered_call = _extract_call_name(lowered)
    if (original_call in awaitable_calls or lowered_call in awaitable_calls) and not lowered.startswith("await "):
        return f"await {lowered};", req
    return f"{lowered};", req


def _lower_expr(expr, rewrite_rules):
    out = _normalize_space(expr)
    if not out:
        return None, set()
    out, required_params = _apply_rewrite_rules(out, rewrite_rules)
    out = re.sub(
        r"\(\s*(?:unsigned\s+)?(?:int|long|short|coordxy|schar|uchar)\s*\)\s*\(([^()]+)\)",
        r"Math.trunc(\1)",
        out,
    )
    out = re.sub(r"\(\s*boolean\s*\)\s*", "", out)
    out = re.sub(r"(?<![=!<>])==(?![=])", "===", out)
    out = re.sub(r"(?<![=!<>])!=(?![=])", "!==", out)
    return out, required_params


def _normalize_space(text):
    return " ".join((text or "").replace("\n", " ").split())


def _diag(code, message):
    return {"severity": "warning", "code": code, "message": message}


def _load_async_info(src_path, func_name):
    try:
        summary = build_async_summary(src_path)
    except Exception:
        return {"requires_async": False, "awaitable_calls": set()}

    fn = None
    for candidate in summary.get("functions", []):
        if candidate.get("name") == func_name:
            fn = candidate
            break
    if fn is None:
        return {"requires_async": False, "awaitable_calls": set()}
    direct = set(fn.get("direct_awaited_boundaries", []))
    async_callees = set(fn.get("awaited_boundary_callsites", []))
    awaitable = direct | async_callees
    return {
        "requires_async": bool(fn.get("requires_async")),
        "awaitable_calls": awaitable,
    }


def _extract_call_name(expr):
    m = re.match(r"^\s*([A-Za-z_]\w*)\s*\(", expr or "")
    if not m:
        return None
    return m.group(1)


def _load_rewrite_rules():
    rules = []
    base = Path("tools/c_translator/rulesets")
    for fname in ("function_map.json", "state_paths.json"):
        p = base / fname
        if not p.exists():
            continue
        data = json.loads(p.read_text(encoding="utf-8"))
        for rule in data.get("rewrites", []):
            cexpr = rule.get("c")
            jexpr = rule.get("js")
            if isinstance(cexpr, str) and isinstance(jexpr, str):
                rules.append(
                    {
                        "c": cexpr,
                        "js": jexpr,
                        "requires_params": set(rule.get("requires_params", [])),
                    }
                )
    rules.sort(key=lambda r: len(r["c"]), reverse=True)
    return rules


def _apply_rewrite_rules(expr, rules):
    out = expr
    required = set()
    for rule in rules:
        if rule["c"] in out:
            out = out.replace(rule["c"], rule["js"])
            required.update(rule["requires_params"])
    return out, required


def _find_unresolved_tokens(lines):
    bad = set()
    joined = "\n".join(lines)
    if re.search(r"\bsvi\.", joined):
        bad.add("svi.")
    if re.search(r"&\s*u\.", joined):
        bad.add("&u.")
    if re.search(r"\bu\.[A-Za-z_]\w*", joined):
        bad.add("u.")
    if re.search(r"\blevl\s*\[", joined):
        bad.add("levl[]")
    if re.search(r"\bSokoban\b", joined):
        bad.add("Sokoban")
    if re.search(r"\bW_[A-Z0-9_]+\b", joined):
        bad.add("W_*")
    if "->" in joined:
        bad.add("->")
    return bad


def _find_legacy_js_tokens(lines):
    bad = set()
    joined = "\n".join(lines)
    if re.search(r"\bmap\._[A-Za-z_]\w*", joined):
        bad.add("map._*")
    if re.search(r"\bgame\._[A-Za-z_]\w*", joined):
        bad.add("game._*")
    if re.search(r"\bcontext\.", joined):
        bad.add("context.*")
    if re.search(r"\bglobals\.", joined):
        bad.add("globals.*")
    if re.search(r"\bstate\.", joined):
        bad.add("state.*")
    return bad
