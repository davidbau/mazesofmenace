#!/usr/bin/env python3
"""Batch emit-helper runner for large-scale translation sweeps.

Outputs per-function emit-helper JSON payloads plus a summary JSON.
"""

import argparse
import fnmatch
import json
from pathlib import Path

from backend import emit_capability_summary, emit_helper_scaffold
from frontend.compile_profile import load_compile_profile
from nir import build_nir_snapshot


def parse_args():
    p = argparse.ArgumentParser(description="Batch emit-helper runner")
    p.add_argument("--src", action="append", required=True, help="C source file path (repeatable)")
    p.add_argument("--out-dir", required=True, help="Directory for per-function emit JSON")
    p.add_argument("--summary-out", required=True, help="Summary JSON output path")
    p.add_argument(
        "--compile-profile",
        default="tools/c_translator/compile_profile.json",
        help="Compile profile JSON path",
    )
    p.add_argument(
        "--include-blocked",
        action="store_true",
        help="Emit functions even when capability-summary marks them blocked",
    )
    p.add_argument("--limit", type=int, default=0, help="Optional max function emits (0 = no limit)")
    p.add_argument(
        "--exclude-sources-file",
        default="tools/c_translator/rulesets/translation_scope_excluded_sources.json",
        help="JSON file with {sources:[], source_globs:[]} to exclude from sweep counts",
    )
    p.add_argument(
        "--no-exclude-sources",
        action="store_true",
        help="Disable source exclusions (useful for fixture-focused translator tests)",
    )
    return p.parse_args()


def sanitize_name(text):
    out = []
    for ch in text:
        if ch.isalnum() or ch in ("_", "-", "."):
            out.append(ch)
        else:
            out.append("_")
    return "".join(out)


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
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    summary_path = Path(args.summary_out)
    summary_path.parent.mkdir(parents=True, exist_ok=True)

    profile = load_compile_profile(args.compile_profile)
    excluded_exact, excluded_globs = (set(), [])
    if not args.no_exclude_sources:
        excluded_exact, excluded_globs = _load_source_exclusions(args.exclude_sources_file)

    emitted = 0
    files = []
    errors = []

    for src in args.src:
        if _source_excluded(src, excluded_exact, excluded_globs):
            continue
        cap = emit_capability_summary(src, profile)
        file_rec = {
            "source": src,
            "function_count": cap.get("function_count", 0),
            "translated_count": cap.get("translated_count", 0),
            "blocked_count": cap.get("blocked_count", 0),
            "emitted": 0,
            "functions": [],
        }
        files.append(file_rec)

        candidates = cap.get("functions", [])
        seen_names = set()
        for fn in candidates:
            if args.limit > 0 and emitted >= args.limit:
                break
            func = fn.get("name")
            if not func:
                continue
            if func in seen_names:
                file_rec["functions"].append(
                    {
                        "name": func,
                        "ok": False,
                        "skipped_duplicate": True,
                    }
                )
                continue
            seen_names.add(func)
            try:
                n = build_nir_snapshot(src, func).get("function_count", 0)
            except Exception:
                n = 0
            if n != 1:
                file_rec["functions"].append(
                    {
                        "name": func,
                        "ok": False,
                        "skipped_ambiguous": True,
                        "match_count": n,
                    }
                )
                continue
            try:
                payload = emit_helper_scaffold(src, func, profile)
            except Exception as exc:  # noqa: BLE001
                err = {
                    "source": src,
                    "function": func,
                    "error": str(exc),
                }
                errors.append(err)
                file_rec["functions"].append(
                    {
                        "name": func,
                        "ok": False,
                        "error": str(exc),
                    }
                )
                continue

            # Capability summary can under-report translatable functions for
            # some signatures; gate on actual emit payload for accuracy.
            if not args.include_blocked and not bool(payload.get("meta", {}).get("translated")):
                file_rec["functions"].append(
                    {
                        "name": func,
                        "ok": False,
                        "skipped_blocked": True,
                        "diag_codes": [d.get("code") for d in (payload.get("diag") or []) if d.get("code")],
                    }
                )
                continue

            basename = sanitize_name(Path(src).stem)
            out_file = out_dir / f"{basename}__{sanitize_name(func)}.json"
            out_file.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")
            emitted += 1
            file_rec["emitted"] += 1
            file_rec["functions"].append(
                {
                    "name": func,
                    "ok": True,
                    "translated": bool(payload.get("meta", {}).get("translated")),
                    "diag_codes": [d.get("code") for d in (payload.get("diag") or []) if d.get("code")],
                    "out_file": str(out_file).replace("\\", "/"),
                }
            )

    summary = {
        "sources": args.src,
        "exclude_sources_file": None if args.no_exclude_sources else args.exclude_sources_file,
        "excluded_sources_count": len(excluded_exact) + len(excluded_globs),
        "include_blocked": bool(args.include_blocked),
        "limit": int(args.limit),
        "totals": {
            "files": len(files),
            "emitted": emitted,
            "errors": len(errors),
        },
        "files": files,
        "errors": errors,
    }
    summary_path.write_text(json.dumps(summary, indent=2, sort_keys=True), encoding="utf-8")
    print(f"translator: batch-emitted {emitted} functions -> {out_dir}")
    print(f"translator: summary -> {summary_path}")
    if errors:
        print(f"translator: encountered {len(errors)} errors")


if __name__ == "__main__":
    main()
