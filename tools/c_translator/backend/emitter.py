import re
from pathlib import Path

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
    if compile_profile is not None:
        ast_summary = function_ast_summary(src_path, compile_profile, fn["name"])
    if ast_summary and ast_summary.get("available"):
        translated_lines, lower_diags = _translate_ast_compound(ast_summary["compound"], 1)
        if translated_lines is not None:
            params = ast_summary.get("params") or params
            translated = True

    if translated:
        js_lines = [
            f"// TRANSLATOR: AUTO ({path.name}:{fn['span']['signature_line']})",
            f"export function {fn['name']}({', '.join(params)}) {{",
            *translated_lines,
            "}",
        ]
    else:
        js_lines = [
            f"// TRANSLATOR: AUTO ({path.name}:{fn['span']['signature_line']})",
            f"export function {fn['name']}({', '.join(params)}) {{",
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
        },
        "diag": diags,
    }


def _translate_ast_compound(compound_stmt, base_indent):
    if not isinstance(compound_stmt, dict) or compound_stmt.get("kind") != "COMPOUND_STMT":
        return None, [_diag("UNSUPPORTED_TOPLEVEL", "Expected COMPOUND_STMT for function body")]

    out = []
    diags = []
    for child in compound_stmt.get("children", []):
        lines, child_diags = _translate_stmt(child, base_indent)
        diags.extend(child_diags)
        if lines is None:
            return None, diags
        out.extend(lines)
    return out, diags


def _translate_stmt(stmt, indent):
    kind = stmt.get("kind")
    text = _normalize_space(stmt.get("text", ""))
    children = stmt.get("children", [])
    pad = "  " * indent

    if kind == "DECL_STMT":
        lowered = _lower_decl_stmt(text)
        if lowered is None:
            return None, [_diag("UNSUPPORTED_DECL_STMT", text)]
        return [pad + lowered], []

    if kind == "IF_STMT":
        if len(children) < 2:
            return None, [_diag("BAD_IF_AST", text)]
        cond = _lower_expr(_normalize_space(children[0].get("text", "")))
        if cond is None:
            return None, [_diag("BAD_IF_COND", text)]
        out = [f"{pad}if ({cond}) {{"]
        then_lines, then_diags = _translate_stmt_as_block(children[1], indent + 1)
        if then_lines is None:
            return None, then_diags
        out.extend(then_lines)
        out.append(f"{pad}}}")
        all_diags = list(then_diags)

        if len(children) >= 3:
            out.append(f"{pad}else {{")
            else_lines, else_diags = _translate_stmt_as_block(children[2], indent + 1)
            if else_lines is None:
                return None, else_diags
            out.extend(else_lines)
            out.append(f"{pad}}}")
            all_diags.extend(else_diags)
        return out, all_diags

    if kind == "COMPOUND_STMT":
        out = []
        diags = []
        for child in children:
            lines, child_diags = _translate_stmt(child, indent)
            diags.extend(child_diags)
            if lines is None:
                return None, diags
            out.extend(lines)
        return out, diags

    if kind in {"BINARY_OPERATOR", "UNARY_OPERATOR", "RETURN_STMT", "CALL_EXPR"}:
        lowered = _lower_expr_stmt(text)
        if lowered is None:
            return None, [_diag("UNSUPPORTED_EXPR_STMT", text)]
        return [pad + lowered], []

    if kind == "NULL_STMT":
        return [], []

    return None, [_diag("UNSUPPORTED_STMT_KIND", kind)]


def _translate_stmt_as_block(stmt, indent):
    kind = stmt.get("kind")
    if kind == "COMPOUND_STMT":
        return _translate_stmt(stmt, indent)
    return _translate_stmt(stmt, indent)


def _lower_decl_stmt(text):
    m = DECL_RE.match(text)
    if not m:
        return None
    decl = m.group(1)
    lowered = []
    for raw in decl.split(","):
        token = raw.strip().replace("*", " ").strip()
        if not token:
            return None
        if "=" in token:
            lhs, rhs = token.split("=", 1)
            rhs = _lower_expr(rhs.strip())
            if rhs is None:
                return None
            lowered.append(f"{lhs.strip()} = {rhs}")
        else:
            lowered.append(token)
    return f"let {', '.join(lowered)};"


def _lower_expr_stmt(text):
    t = text.rstrip(";").strip()
    if not t:
        return None
    pm = PANIC_RE.match(t)
    if pm:
        return f"throw new Error('{pm.group(1)}');"
    lowered = _lower_expr(t)
    if lowered is None:
        return None
    return f"{lowered};"


def _lower_expr(expr):
    out = _normalize_space(expr)
    if not out:
        return None
    out = re.sub(
        r"\(\s*(?:unsigned\s+)?(?:int|long|short|coordxy|schar|uchar)\s*\)\s*\(([^()]+)\)",
        r"Math.trunc(\1)",
        out,
    )
    out = re.sub(r"\(\s*boolean\s*\)\s*", "", out)
    out = re.sub(r"(?<![=!<>])==(?![=])", "===", out)
    out = re.sub(r"(?<![=!<>])!=(?![=])", "!==", out)
    return out


def _normalize_space(text):
    return " ".join((text or "").replace("\n", " ").split())


def _diag(code, message):
    return {"severity": "warning", "code": code, "message": message}
