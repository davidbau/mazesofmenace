#!/usr/bin/env python3
"""Safety lint for runtime stitch candidates.

Heuristic: mark candidate unsafe if emitted function body calls identifiers
not present in the target JS module scope/imports/exports/builtins.
"""

import argparse
import json
from pathlib import Path
import re


EXPORT_FN_RE = re.compile(r"^\s*export\s+(?:async\s+)?function\s+([A-Za-z_]\w*)\s*\(", re.MULTILINE)
LOCAL_FN_RE = re.compile(r"^\s*(?:async\s+)?function\s+([A-Za-z_]\w*)\s*\(", re.MULTILINE)
LOCAL_VAR_RE = re.compile(r"^\s*(?:const|let|var)\s+([A-Za-z_]\w*)\s*=", re.MULTILINE)
IMPORT_RE = re.compile(r"^\s*import\s*\{([^}]*)\}\s*from\s*['\"][^'\"]+['\"]\s*;", re.MULTILINE)
IMPORT_DEFAULT_RE = re.compile(
    r"^\s*import\s+([A-Za-z_]\w*)\s+from\s*['\"][^'\"]+['\"]\s*;",
    re.MULTILINE,
)
CALL_RE = re.compile(r"\b([A-Za-z_]\w*)\s*\(")


JS_KEYWORDS = {
    "if", "for", "while", "switch", "return", "typeof", "new", "await",
    "Math", "Number", "String", "Object", "Array", "Boolean", "Promise",
}


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
            if name in JS_KEYWORDS:
                continue
            if name in known_syms:
                continue
            unknown.add(name)
    return sorted(unknown)


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
        out_rec = {
            **rec,
            "unknown_calls": unknown,
        }
        if unknown:
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
