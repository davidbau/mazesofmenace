#!/usr/bin/env python3
"""Find runtime stitch-ready candidates from batch summary.

A candidate is:
1) emitted by batch_emit,
2) has no diag codes,
3) maps to an existing JS module by C source stem,
4) and the JS module already exports a function with the same name.
"""

import argparse
import fnmatch
import json
from pathlib import Path
import re


EXPORT_RE = re.compile(r"^\s*export\s+(?:async\s+)?function\s+([A-Za-z_]\w*)\s*\(", re.MULTILINE)


def parse_args():
    p = argparse.ArgumentParser(description="Find runtime stitch-ready translator candidates")
    p.add_argument("--summary", required=True, help="batch_emit summary JSON")
    p.add_argument("--repo-root", default=".", help="Repository root (default: .)")
    p.add_argument("--out", required=True, help="Output JSON path")
    p.add_argument(
        "--exclude-sources-file",
        default="tools/c_translator/rulesets/translation_scope_excluded_sources.json",
        help="JSON file with {\"sources\":[...], \"source_globs\":[...]} C sources to exclude from counts",
    )
    p.add_argument(
        "--no-exclude-sources",
        action="store_true",
        help="Disable source exclusions (useful for fixture-focused translator tests)",
    )
    return p.parse_args()


def load_js_exports(js_path):
    if not js_path.exists():
        return set()
    text = js_path.read_text(encoding="utf-8", errors="replace")
    return set(EXPORT_RE.findall(text))


def _normalize_source_path(src):
    return str(Path(src)).replace("\\", "/").lstrip("./")


def _load_source_exclusions(path):
    if not path:
        return set(), []
    p = Path(path)
    if not p.exists():
        return set(), []
    payload = json.loads(p.read_text(encoding="utf-8"))
    exact = set()
    globs = []
    for src in payload.get("sources", []):
        if isinstance(src, str) and src.strip():
            norm = _normalize_source_path(src.strip())
            exact.add(norm)
            exact.add(Path(norm).name)
    for patt in payload.get("source_globs", []):
        if isinstance(patt, str) and patt.strip():
            globs.append(patt.strip())
    return exact, globs


def _source_excluded(src, exact, globs):
    norm = _normalize_source_path(src)
    base = Path(norm).name
    if norm in exact or base in exact:
        return True
    return any(fnmatch.fnmatch(norm, patt) or fnmatch.fnmatch(base, patt) for patt in globs)


def main():
    args = parse_args()
    repo = Path(args.repo_root)
    summary = json.loads(Path(args.summary).read_text(encoding="utf-8"))
    js_dir = repo / "js"
    excluded_exact, excluded_globs = (set(), [])
    if not args.no_exclude_sources:
        excluded_exact, excluded_globs = _load_source_exclusions(args.exclude_sources_file)

    js_exports = {}
    for js_file in js_dir.glob("*.js"):
        js_exports[js_file.stem] = load_js_exports(js_file)

    records = []
    for file_rec in summary.get("files", []):
        source = file_rec.get("source", "")
        if _source_excluded(source, excluded_exact, excluded_globs):
            continue
        stem = Path(source).stem
        module_exports = js_exports.get(stem, set())
        js_module_path = (js_dir / f"{stem}.js")
        for fn in file_rec.get("functions", []):
            if not fn.get("ok"):
                continue
            diags = fn.get("diag_codes", []) or []
            if diags:
                continue
            name = fn.get("name")
            if not name:
                continue
            exists = name in module_exports
            records.append(
                {
                    "source": source,
                    "source_stem": stem,
                    "js_module": str(js_module_path).replace("\\", "/"),
                    "function": name,
                    "has_matching_js_export": bool(exists),
                    "out_file": fn.get("out_file"),
                }
            )

    matched = [r for r in records if r["has_matching_js_export"]]
    unmatched = [r for r in records if not r["has_matching_js_export"]]

    output = {
        "summary": args.summary,
        "exclude_sources_file": None if args.no_exclude_sources else args.exclude_sources_file,
        "excluded_sources_count": len(excluded_exact) + len(excluded_globs),
        "totals": {
            "clean_candidates": len(records),
            "runtime_matching_exports": len(matched),
            "clean_without_matching_export": len(unmatched),
        },
        "matched": matched,
        "unmatched": unmatched,
    }

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(output, indent=2, sort_keys=True), encoding="utf-8")
    print(f"translator: runtime stitch candidates -> {out_path}")
    print(
        "translator: "
        f"clean={len(records)} matched={len(matched)} unmatched={len(unmatched)}"
    )


if __name__ == "__main__":
    main()
