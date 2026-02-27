#!/usr/bin/env python3
"""Audit currently marked autotranslated JS functions against pipeline outputs.

Given translator pipeline artifacts (summary/candidates/safety/apply), this tool
answers: of the currently marked `Autotranslated from ...` JS functions, which
still pass current safety gates and which are blocked now (with concrete
examples).
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple


MARKER_RE = re.compile(r"^\s*//\s*Autotranslated from ([A-Za-z0-9_.-]+\.c:\d+)\s*$")
FN_RE = re.compile(r"^\s*export\s+(?:async\s+)?function\s+([A-Za-z_]\w*)\s*\(")


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Audit marked autotranslations vs current pipeline")
    p.add_argument("--repo-root", default=".", help="Repository root")
    p.add_argument("--summary", required=True, help="batch_emit summary JSON path")
    p.add_argument("--candidates", required=True, help="runtime_stitch_candidates JSON path")
    p.add_argument("--safety", required=True, help="runtime_candidate_safety JSON path")
    p.add_argument("--apply-summary", required=True, help="runtime_stitch_apply JSON path")
    p.add_argument("--examples-per-category", type=int, default=2, help="Example count per category")
    p.add_argument("--out", required=True, help="Output JSON path")
    return p.parse_args()


def find_matching_brace(text: str, open_i: int) -> int:
    depth = 0
    in_str: Optional[str] = None
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
            if c == in_str and (i == 0 or text[i - 1] != "\\"):
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


def extract_function_snippet(file_path: Path, fn_name: str, max_lines: int = 18) -> str:
    text = file_path.read_text(encoding="utf-8", errors="replace")
    pat = re.compile(
        rf"(?:^|\n)(?:\s*//[^\n]*\n)*\s*export\s+(?:async\s+)?function\s+{re.escape(fn_name)}\s*\(",
        re.MULTILINE,
    )
    m = pat.search(text)
    if not m:
        return ""
    fn_start = text.find("function", m.start(), m.end() + 64)
    if fn_start < 0:
        return ""
    open_i = text.find("{", fn_start)
    if open_i < 0:
        return ""
    close_i = find_matching_brace(text, open_i)
    if close_i < 0:
        return ""
    block = text[m.start():close_i + 1]
    lines = block.splitlines()
    if len(lines) <= max_lines:
        return "\n".join(lines)
    return "\n".join(lines[:max_lines] + ["..."])


def parse_marked_functions(repo_root: Path) -> Tuple[List[Dict], int, List[Dict]]:
    out: List[Dict] = []
    marker_total = 0
    unpaired: List[Dict] = []
    for p in sorted((repo_root / "js").glob("*.js")):
        lines = p.read_text(encoding="utf-8", errors="replace").splitlines()
        for i, line in enumerate(lines):
            m = MARKER_RE.match(line)
            if not m:
                continue
            marker_total += 1
            fn_name = None
            fn_line = None
            for j in range(i + 1, min(i + 8, len(lines))):
                fm = FN_RE.match(lines[j])
                if fm:
                    fn_name = fm.group(1)
                    fn_line = j + 1
                    break
            if not fn_name:
                unpaired.append(
                    {
                        "js_module": p.relative_to(repo_root).as_posix(),
                        "marker": m.group(1),
                        "marker_line": i + 1,
                    }
                )
                continue
            out.append(
                {
                    "js_module": p.relative_to(repo_root).as_posix(),
                    "function": fn_name,
                    "marker": m.group(1),
                    "marker_line": i + 1,
                    "function_line": fn_line,
                }
            )
    return out, marker_total, unpaired


def primary_unsafe_category(rec: Dict) -> str:
    if not rec.get("syntax_ok", True):
        return "unsafe_syntax_not_ok"
    if rec.get("semantic_hazards"):
        return "unsafe_semantic_hazards"
    has_calls = bool(rec.get("unknown_calls"))
    has_ids = bool(rec.get("unknown_identifiers"))
    if has_calls and has_ids:
        return "unsafe_unknown_calls_and_identifiers"
    if has_ids:
        return "unsafe_unknown_identifiers_only"
    if has_calls:
        return "unsafe_unknown_calls_only"
    return "unsafe_other"


def load_json(path: str) -> Dict:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def main() -> None:
    args = parse_args()
    repo_root = Path(args.repo_root)

    marked, marker_total, unpaired_markers = parse_marked_functions(repo_root)
    marked_pairs = {(m["js_module"], m["function"]): m for m in marked}

    summary = load_json(args.summary)
    candidates = load_json(args.candidates)
    safety = load_json(args.safety)
    apply_summary = load_json(args.apply_summary)

    # Index summary by (source_stem,function) and by out_file.
    summary_by_stem_fn: Dict[Tuple[str, str], Dict] = {}
    for file_rec in summary.get("files", []):
        source = file_rec.get("source", "")
        stem = Path(source).stem
        for fn in file_rec.get("functions", []):
            key = (stem, fn.get("name", ""))
            if key not in summary_by_stem_fn:
                summary_by_stem_fn[key] = {
                    "source": source,
                    "diag_codes": fn.get("diag_codes", []) or [],
                    "ok": fn.get("ok", False),
                    "out_file": fn.get("out_file"),
                }

    matched_set = {(r["js_module"], r["function"]) for r in candidates.get("matched", [])}
    unmatched_set = {(r["js_module"], r["function"]) for r in candidates.get("unmatched", [])}
    safe_map = {(r["js_module"], r["function"]): r for r in safety.get("safe", [])}
    unsafe_map = {(r["js_module"], r["function"]): r for r in safety.get("unsafe", [])}
    sig_block = {
        (r["js_module"], r["function"]): r
        for r in apply_summary.get("skipped_signature_details", [])
    }

    by_category: Dict[str, List[Dict]] = {}
    for pair, meta in marked_pairs.items():
        js_module, fn = pair
        stem = Path(js_module).stem
        srec = summary_by_stem_fn.get((stem, fn))

        if not srec:
            category = "not_in_summary_by_stem"
        elif not srec.get("ok", False):
            category = "summary_not_ok"
        elif srec.get("diag_codes"):
            category = "summary_diag_blocked"
        elif pair in safe_map:
            category = "safe_signature_blocked" if pair in sig_block else "safe_now"
        elif pair in unsafe_map:
            category = primary_unsafe_category(unsafe_map[pair])
        elif pair in unmatched_set:
            category = "clean_unmatched_export"
        elif pair not in matched_set:
            category = "clean_not_classified"
        else:
            category = "matched_not_classified"

        emitted = ""
        out_file = srec.get("out_file") if srec else None
        if out_file and Path(out_file).exists():
            obj = json.loads(Path(out_file).read_text(encoding="utf-8"))
            js = obj.get("js", "")
            emitted = "\n".join(js.splitlines()[:18]) if js else ""

        sample = {
            "js_module": js_module,
            "function": fn,
            "marker": meta["marker"],
            "marker_line": meta["marker_line"],
            "source": srec.get("source") if srec else None,
            "diag_codes": srec.get("diag_codes") if srec else None,
            "safety": unsafe_map.get(pair) or safe_map.get(pair),
            "signature_block": sig_block.get(pair),
            "current_js_snippet": extract_function_snippet(repo_root / js_module, fn),
            "current_emitted_snippet": emitted,
        }
        by_category.setdefault(category, []).append(sample)

    counts = {k: len(v) for k, v in sorted(by_category.items(), key=lambda kv: kv[0])}
    examples = {
        k: v[: max(0, args.examples_per_category)]
        for k, v in by_category.items()
        if not k.startswith("safe_")
    }

    result = {
        "marked_total": len(marked_pairs),
        "marker_total": marker_total,
        "unpaired_marker_total": len(unpaired_markers),
        "unpaired_marker_examples": unpaired_markers[:5],
        "categories": counts,
        "examples": examples,
        "notes": {
            "safe_now_definition": "Passes current safety gate for restitch input.",
            "safe_signature_blocked_definition": "Safety passes but runtime signature compatibility rejects overwrite.",
            "summary_diag_blocked_definition": "Function emitted with diag codes in batch summary.",
        },
    }

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(f"translator: marked autotranslation audit -> {out_path}")
    print(f"translator: marked_total={result['marked_total']}")
    for k in sorted(counts):
        print(f"  {k}: {counts[k]}")


if __name__ == "__main__":
    main()
