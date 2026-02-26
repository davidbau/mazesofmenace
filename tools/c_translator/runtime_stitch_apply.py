#!/usr/bin/env python3
"""Apply runtime-safe translator candidates into JS modules.

This tool replaces matching JS function declarations with emitted translator
snippets for records marked safe by runtime_candidate_safety.py.
"""

import argparse
import json
from pathlib import Path
import re
from collections import defaultdict


FN_HEAD_RE_TMPL = r"(?:^|\n)(?:export\s+)?(?:async\s+)?function\s+{name}\s*\("
FN_HEAD_RE_FLAGS = re.MULTILINE


def parse_args():
    p = argparse.ArgumentParser(description="Apply runtime-safe translator candidates")
    p.add_argument("--safety", required=True, help="runtime_candidate_safety output JSON")
    p.add_argument("--repo-root", default=".", help="Repo root")
    p.add_argument("--write", action="store_true", help="Write updates (default: dry run)")
    p.add_argument(
        "--only-unmarked",
        action="store_true",
        default=True,
        help="Only stitch functions not already tagged TRANSLATOR: AUTO (default: true)",
    )
    p.add_argument(
        "--max-functions",
        type=int,
        default=0,
        help="Cap number of stitched functions (>0 enables cap)",
    )
    return p.parse_args()


def is_escaped(text, i):
    backslashes = 0
    j = i - 1
    while j >= 0 and text[j] == "\\":
        backslashes += 1
        j -= 1
    return (backslashes % 2) == 1


def find_matching_brace(text, open_i):
    depth = 0
    in_str = None
    in_line_comment = False
    in_block_comment = False
    i = open_i
    n = len(text)
    while i < n:
        c = text[i]
        nxt = text[i + 1] if i + 1 < n else ""
        if in_line_comment:
            if c == "\n":
                in_line_comment = False
            i += 1
            continue
        if in_block_comment:
            if c == "*" and nxt == "/":
                in_block_comment = False
                i += 2
                continue
            i += 1
            continue
        if in_str:
            if c == in_str and not is_escaped(text, i):
                in_str = None
            i += 1
            continue
        if c == "/" and nxt == "/":
            in_line_comment = True
            i += 2
            continue
        if c == "/" and nxt == "*":
            in_block_comment = True
            i += 2
            continue
        if c in ("'", '"', "`"):
            in_str = c
            i += 1
            continue
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return -1


def find_matching_paren(text, open_i):
    depth = 0
    in_str = None
    in_line_comment = False
    in_block_comment = False
    i = open_i
    n = len(text)
    while i < n:
        c = text[i]
        nxt = text[i + 1] if i + 1 < n else ""
        if in_line_comment:
            if c == "\n":
                in_line_comment = False
            i += 1
            continue
        if in_block_comment:
            if c == "*" and nxt == "/":
                in_block_comment = False
                i += 2
                continue
            i += 1
            continue
        if in_str:
            if c == in_str and not is_escaped(text, i):
                in_str = None
            i += 1
            continue
        if c == "/" and nxt == "/":
            in_line_comment = True
            i += 2
            continue
        if c == "/" and nxt == "*":
            in_block_comment = True
            i += 2
            continue
        if c in ("'", '"', "`"):
            in_str = c
            i += 1
            continue
        if c == "(":
            depth += 1
        elif c == ")":
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return -1


def find_function_span(text, name):
    pat = re.compile(FN_HEAD_RE_TMPL.format(name=re.escape(name)), FN_HEAD_RE_FLAGS)
    m = pat.search(text)
    if not m:
        return None
    # Anchor at actual "function", skipping optional leading newline.
    fn_idx = text.find("function", m.start(), m.end() + 64)
    if fn_idx < 0:
        return None
    line_start = text.rfind("\n", 0, fn_idx) + 1
    sig_open = text.find("(", fn_idx)
    if sig_open < 0:
        return None
    sig_close = find_matching_paren(text, sig_open)
    if sig_close < 0:
        return None
    open_i = text.find("{", sig_close + 1)
    if open_i < 0:
        return None
    close_i = find_matching_brace(text, open_i)
    if close_i < 0:
        return None
    end = close_i + 1
    if end < len(text) and text[end] == "\n":
        end += 1
    return (line_start, end)


def has_auto_marker_near(text, fn_start):
    lookback_start = max(0, fn_start - 200)
    segment = text[lookback_start:fn_start]
    return "TRANSLATOR: AUTO" in segment


def load_emitted_js(out_file):
    payload = json.loads(Path(out_file).read_text(encoding="utf-8"))
    js = payload.get("js", "")
    return js if js.endswith("\n") else (js + "\n")


def main():
    args = parse_args()
    repo = Path(args.repo_root)
    safety = json.loads(Path(args.safety).read_text(encoding="utf-8"))
    safe = list(safety.get("safe", []))

    grouped = defaultdict(list)
    for rec in safe:
        grouped[rec["js_module"]].append(rec)

    changes = []
    stitched = 0
    skipped_marked = 0
    skipped_missing = 0

    for js_module, records in grouped.items():
        module_path = repo / js_module
        if not module_path.exists():
            continue
        text = module_path.read_text(encoding="utf-8")
        module_changed = False

        # Process in file-order by function position when present.
        indexed = []
        for rec in records:
            span = find_function_span(text, rec["function"])
            if not span:
                skipped_missing += 1
                continue
            indexed.append((span[0], rec))
        indexed.sort(key=lambda t: t[0], reverse=True)

        for _, rec in indexed:
            if args.max_functions > 0 and stitched >= args.max_functions:
                break
            span = find_function_span(text, rec["function"])
            if not span:
                skipped_missing += 1
                continue
            start, end = span
            if args.only_unmarked and has_auto_marker_near(text, start):
                skipped_marked += 1
                continue
            emitted_js = load_emitted_js(rec["out_file"])
            text = text[:start] + emitted_js + text[end:]
            stitched += 1
            module_changed = True
            changes.append({
                "js_module": js_module,
                "function": rec["function"],
                "source": rec.get("source"),
                "out_file": rec.get("out_file"),
            })

        if module_changed and args.write:
            module_path.write_text(text, encoding="utf-8")

    summary = {
        "safe_total": len(safe),
        "stitched": stitched,
        "skipped_marked": skipped_marked,
        "skipped_missing": skipped_missing,
        "write": bool(args.write),
        "changes": changes,
    }
    print(json.dumps(summary, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
