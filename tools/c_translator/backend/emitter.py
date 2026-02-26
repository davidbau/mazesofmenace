import re
from pathlib import Path

from cfg import build_cfg_summary
from nir import build_nir_snapshot


FUNC_SIG_LINE_RE = re.compile(r"^\s*([A-Za-z_]\w*)\s*\(([^)]*)\)\s*$")
IDENT_RE = re.compile(r"[A-Za-z_]\w*$")


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


def emit_helper_scaffold(src_path, func_name):
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

    js_lines = [
        f"// TRANSLATOR: AUTO ({path.name}:{fn['span']['signature_line']})",
        f"export function {fn['name']}({', '.join(params)}) {{",
        "  // TODO(iron-parity): translated body pending pass pipeline.",
        '  throw new Error("UNIMPLEMENTED_TRANSLATED_FUNCTION");',
        "}",
    ]

    diags = []
    if cfg["goto_count"] > 0 or cfg["label_count"] > 0:
        diags.append(
            {
                "severity": "warning",
                "code": "CFG_COMPLEXITY",
                "message": "Function has labels/gotos; helper scaffold is non-semantic placeholder.",
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
        },
        "diag": diags,
    }
