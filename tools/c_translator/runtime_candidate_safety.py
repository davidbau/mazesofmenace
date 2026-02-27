#!/usr/bin/env python3
"""Safety lint for runtime stitch candidates.

Heuristic: mark candidate unsafe if emitted function body calls identifiers
not present in the target JS module scope/imports/exports/builtins.
"""

import argparse
import json
from pathlib import Path
import re
import subprocess
import tempfile


EXPORT_FN_RE = re.compile(r"^\s*export\s+(?:async\s+)?function\s+([A-Za-z_]\w*)\s*\(", re.MULTILINE)
LOCAL_FN_RE = re.compile(r"^\s*(?:async\s+)?function\s+([A-Za-z_]\w*)\s*\(", re.MULTILINE)
LOCAL_VAR_RE = re.compile(r"^\s*(?:const|let|var)\s+([A-Za-z_]\w*)\s*=", re.MULTILINE)
EXPORT_VAR_RE = re.compile(r"^\s*export\s+(?:const|let|var)\s+([A-Za-z_]\w*)\s*=", re.MULTILINE)
IMPORT_RE = re.compile(r"^\s*import\s*\{([^}]*)\}\s*from\s*['\"][^'\"]+['\"]\s*;", re.MULTILINE)
IMPORT_DEFAULT_RE = re.compile(
    r"^\s*import\s+([A-Za-z_]\w*)\s+from\s*['\"][^'\"]+['\"]\s*;",
    re.MULTILINE,
)
CALL_RE = re.compile(r"\b([A-Za-z_]\w*)\s*\(")
IDENT_RE = re.compile(r"\b([A-Za-z_]\w*)\b")


JS_KEYWORDS = {
    "if", "for", "while", "switch", "return", "typeof", "new", "await",
    "Math", "Number", "String", "Object", "Array", "Boolean", "Promise",
    "true", "false", "null", "undefined",
    "const", "let", "var", "function", "export", "import", "default",
    "else", "do", "break", "continue", "case", "throw", "try", "catch",
}

# C parser/emitter artifacts that should not be treated as unresolved symbols.
C_NONSYMBOL_TOKENS = {
    "int", "long", "short", "unsigned", "signed", "char", "void",
    "float", "double", "sizeof",
    "boolean", "uchar", "schar", "xchar", "coord", "aligntyp",
}


def is_escaped(text, i):
    backslashes = 0
    j = i - 1
    while j >= 0 and text[j] == "\\":
        backslashes += 1
        j -= 1
    return (backslashes % 2) == 1


def parse_args():
    p = argparse.ArgumentParser(description="Safety lint runtime stitch candidates")
    p.add_argument("--candidates", required=True, help="runtime_stitch_candidates JSON path")
    p.add_argument("--repo-root", default=".", help="Repo root")
    p.add_argument("--out", required=True, help="Output JSON path")
    return p.parse_args()


def parse_module_symbols(js_text):
    syms = set(EXPORT_FN_RE.findall(js_text))
    syms.update(LOCAL_FN_RE.findall(js_text))
    syms.update(LOCAL_VAR_RE.findall(js_text))
    syms.update(EXPORT_VAR_RE.findall(js_text))
    for m in IMPORT_RE.findall(js_text):
        for part in m.split(","):
            token = part.strip()
            if not token:
                continue
            token = token.split(" as ")[-1].strip()
            if token:
                syms.add(token)
    for m in IMPORT_DEFAULT_RE.findall(js_text):
        syms.add(m.strip())
    return syms


def candidate_unknown_calls(emitted_js, known_syms):
    unknown = set()
    for raw_line in emitted_js.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("//"):
            continue
        if re.search(r"\bfunction\s+[A-Za-z_]\w*\s*\(", line):
            continue
        for name in CALL_RE.findall(line):
            if name in JS_KEYWORDS or name in C_NONSYMBOL_TOKENS:
                continue
            if name in known_syms:
                continue
            unknown.add(name)
    return sorted(unknown)


def extract_emitted_locals(emitted_js):
    locals_set = set(LOCAL_FN_RE.findall(emitted_js))
    locals_set.update(LOCAL_VAR_RE.findall(emitted_js))
    # Add function parameters for exported/local function declarations.
    for m in re.finditer(r"(?:export\s+)?(?:async\s+)?function\s+[A-Za-z_]\w*\s*\(([^)]*)\)", emitted_js):
        raw = m.group(1).strip()
        if not raw:
            continue
        for piece in raw.split(","):
            token = piece.strip()
            if not token:
                continue
            token = token.lstrip("...")
            token = token.split("=")[0].strip()
            if token:
                locals_set.add(token)
    return locals_set


def sanitize_code_for_identifier_scan(text):
    """Return text with strings/comments replaced by spaces (same length)."""
    out = []
    i = 0
    n = len(text)
    in_str = None
    in_line_comment = False
    in_block_comment = False
    while i < n:
        c = text[i]
        nxt = text[i + 1] if i + 1 < n else ""
        if in_line_comment:
            if c == "\n":
                in_line_comment = False
                out.append("\n")
            else:
                out.append(" ")
            i += 1
            continue
        if in_block_comment:
            if c == "*" and nxt == "/":
                out.append(" ")
                out.append(" ")
                i += 2
                in_block_comment = False
                continue
            out.append("\n" if c == "\n" else " ")
            i += 1
            continue
        if in_str:
            if c == in_str and not is_escaped(text, i):
                in_str = None
                out.append(" ")
            else:
                out.append("\n" if c == "\n" else " ")
            i += 1
            continue
        if c == "/" and nxt == "/":
            in_line_comment = True
            out.append(" ")
            out.append(" ")
            i += 2
            continue
        if c == "/" and nxt == "*":
            in_block_comment = True
            out.append(" ")
            out.append(" ")
            i += 2
            continue
        if c in ("'", '"', "`"):
            in_str = c
            out.append(" ")
            i += 1
            continue
        out.append(c)
        i += 1
    return "".join(out)


def candidate_unknown_identifiers(emitted_js, known_syms):
    known = set(known_syms)
    known.update(JS_KEYWORDS)
    known.update(C_NONSYMBOL_TOKENS)
    known.update(extract_emitted_locals(emitted_js))
    unknown = set()
    scan_text = sanitize_code_for_identifier_scan(emitted_js)
    n = len(scan_text)
    for m in IDENT_RE.finditer(scan_text):
        name = m.group(1)
        start = m.start(1)
        end = m.end(1)
        prev = scan_text[start - 1] if start > 0 else ""
        if prev == ".":  # property access (obj.prop)
            continue
        # object literal key ({ key: value }) should not count as free identifier
        j = end
        while j < n and scan_text[j].isspace():
            j += 1
        if j < n and scan_text[j] == ":":
            continue
        if name in known:
            continue
        unknown.add(name)
    return sorted(unknown)


def candidate_syntax_ok(emitted_js):
    """Return (ok, detail) by validating emitted snippet with node --check."""
    with tempfile.NamedTemporaryFile("w", suffix=".mjs", delete=False, encoding="utf-8") as tmp:
        tmp.write(emitted_js)
        tmp_path = Path(tmp.name)
    try:
        proc = subprocess.run(
            ["node", "--check", str(tmp_path)],
            capture_output=True,
            text=True,
            check=False,
        )
        if proc.returncode == 0:
            return True, ""
        detail = (proc.stderr or proc.stdout or "").strip()
        return False, detail.splitlines()[-1] if detail else "node --check failed"
    finally:
        try:
            tmp_path.unlink(missing_ok=True)
        except OSError:
            pass


def main():
    args = parse_args()
    repo = Path(args.repo_root)
    cand = json.loads(Path(args.candidates).read_text(encoding="utf-8"))

    safe = []
    unsafe = []

    module_cache = {}
    for rec in cand.get("matched", []):
        js_module = rec.get("js_module")
        out_file = rec.get("out_file")
        if not js_module or not out_file:
            continue

        module_path = repo / Path(js_module)
        module_key = str(module_path)
        if module_key not in module_cache:
            if module_path.exists():
                text = module_path.read_text(encoding="utf-8", errors="replace")
                module_cache[module_key] = parse_module_symbols(text)
            else:
                module_cache[module_key] = set()
        known_syms = module_cache[module_key]

        payload = json.loads(Path(out_file).read_text(encoding="utf-8"))
        emitted_js = payload.get("js", "")
        unknown = candidate_unknown_calls(emitted_js, known_syms)
        unknown_idents = candidate_unknown_identifiers(emitted_js, known_syms)
        syntax_ok, syntax_error = candidate_syntax_ok(emitted_js)
        out_rec = {
            **rec,
            "unknown_calls": unknown,
            "unknown_identifiers": unknown_idents,
            "syntax_ok": syntax_ok,
        }
        if not syntax_ok:
            out_rec["syntax_error"] = syntax_error
            unsafe.append(out_rec)
        elif unknown or unknown_idents:
            unsafe.append(out_rec)
        else:
            safe.append(out_rec)

    output = {
        "input": args.candidates,
        "totals": {
            "matched": len(cand.get("matched", [])),
            "safe": len(safe),
            "unsafe": len(unsafe),
        },
        "safe": safe,
        "unsafe": unsafe,
    }
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(output, indent=2, sort_keys=True), encoding="utf-8")
    print(f"translator: runtime safety -> {out_path}")
    print(f"translator: matched={len(cand.get('matched', []))} safe={len(safe)} unsafe={len(unsafe)}")


if __name__ == "__main__":
    main()
