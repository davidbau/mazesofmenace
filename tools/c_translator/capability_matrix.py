#!/usr/bin/env python3
import argparse
import fnmatch
import json
from collections import Counter
from pathlib import Path

from backend import emit_capability_summary
from frontend import load_compile_profile


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


def _iter_sources(src, include_glob, max_files, excluded_exact, excluded_globs):
    if src:
        for p in src:
            if _source_excluded(p, excluded_exact, excluded_globs):
                continue
            yield Path(p)
        return
    root = Path("nethack-c/src")
    files = sorted(root.glob(include_glob))
    files = [p for p in files if not _source_excluded(str(p), excluded_exact, excluded_globs)]
    if max_files and max_files > 0:
        files = files[:max_files]
    for p in files:
        yield p


def _top_blockers(file_payloads, n=12):
    c = Counter()
    for payload in file_payloads:
        for code, count in (payload.get("diag_histogram") or {}).items():
            c[code] += count
    return [{"code": code, "count": count} for code, count in c.most_common(n)]


def main():
    ap = argparse.ArgumentParser(description="Translator capability matrix report")
    ap.add_argument(
        "--src",
        action="append",
        help="Specific C source file(s). Can be passed multiple times.",
    )
    ap.add_argument(
        "--include-glob",
        default="*.c",
        help="Glob under nethack-c/src when --src is omitted (default: *.c)",
    )
    ap.add_argument(
        "--max-files",
        type=int,
        default=0,
        help="Limit file count when using include-glob (0 = all)",
    )
    ap.add_argument(
        "--compile-profile",
        default="tools/c_translator/compile_profile.json",
        help="Compile profile path",
    )
    ap.add_argument(
        "--exclude-sources-file",
        default="tools/c_translator/rulesets/translation_scope_excluded_sources.json",
        help="JSON file with {sources:[], source_globs:[]} to exclude from counts",
    )
    ap.add_argument(
        "--no-exclude-sources",
        action="store_true",
        help="Disable source exclusions (useful for fixture-focused translator tests)",
    )
    ap.add_argument("--out", required=True, help="Output JSON path")
    args = ap.parse_args()

    profile = load_compile_profile(args.compile_profile)
    excluded_exact, excluded_globs = (set(), [])
    if not args.no_exclude_sources:
        excluded_exact, excluded_globs = _load_source_exclusions(args.exclude_sources_file)
    sources = list(_iter_sources(args.src, args.include_glob, args.max_files, excluded_exact, excluded_globs))

    files = []
    totals = Counter()
    detail_counter = Counter()
    for path in sources:
        payload = emit_capability_summary(str(path), profile)
        function_count = int(payload.get("function_count") or 0)
        translated_count = int(payload.get("translated_count") or 0)
        blocked_count = int(payload.get("blocked_count") or 0)
        ratio = (translated_count / function_count) if function_count else 0.0

        files.append(
            {
                "source": payload.get("source"),
                "function_count": function_count,
                "translated_count": translated_count,
                "blocked_count": blocked_count,
                "translated_ratio": ratio,
                "diag_histogram": payload.get("diag_histogram") or {},
            }
        )
        for fn in (payload.get("functions") or []):
            for d in (fn.get("diag") or []):
                code = d.get("code")
                if not code:
                    continue
                msg = d.get("message") or ""
                detail_counter[(code, msg)] += 1
        totals["files"] += 1
        totals["functions"] += function_count
        totals["translated"] += translated_count
        totals["blocked"] += blocked_count

    files.sort(key=lambda x: (-x["translated_ratio"], -x["translated_count"], x["source"]))
    overall_ratio = (totals["translated"] / totals["functions"]) if totals["functions"] else 0.0
    out = {
        "report": "translator-capability-matrix",
        "exclude_sources_file": None if args.no_exclude_sources else args.exclude_sources_file,
        "excluded_sources_count": len(excluded_exact) + len(excluded_globs),
        "files_analyzed": totals["files"],
        "totals": {
            "functions": totals["functions"],
            "translated": totals["translated"],
            "blocked": totals["blocked"],
            "translated_ratio": overall_ratio,
        },
        "top_blockers": _top_blockers(files),
        "top_blocker_details": [
            {"code": code, "message": msg, "count": count}
            for (code, msg), count in detail_counter.most_common(20)
        ],
        "files": files,
    }

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(out, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(f"translator: wrote {out_path}")


if __name__ == "__main__":
    main()
