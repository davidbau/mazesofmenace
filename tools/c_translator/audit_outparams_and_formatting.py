#!/usr/bin/env python3
"""Audit C out-param and printf-style patterns against translator artifacts.

Uses batch summary metadata (signature/body line ranges) to inspect concrete C source
bodies and report:
- pointer/array param out-write patterns
- sprintf/snprintf/strcpy-style buffer-write patterns
- overlap with currently marked autotranslated JS functions
"""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Dict, List, Tuple

MARKER_RE = re.compile(r"^\s*//\s*Autotranslated from ([A-Za-z0-9_.-]+\.c):(\d+)\s*$")
FN_RE = re.compile(r"^\s*export\s+(?:async\s+)?function\s+([A-Za-z_]\w*)\s*\(")

WRITE_CALLS = [
    "Sprintf",
    "Snprintf",
    "Strcpy",
    "Strcat",
    "memcpy",
    "memset",
    "sprintf",
    "snprintf",
    "strcpy",
    "strcat",
]


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Audit out-param + formatting patterns")
    p.add_argument("--summary", required=True)
    p.add_argument("--repo-root", default=".")
    p.add_argument("--safety", default="")
    p.add_argument("--out", required=True)
    return p.parse_args()


def line_slice(lines: List[str], start: int, end: int) -> str:
    start = max(1, int(start))
    end = max(start, int(end))
    return "\n".join(lines[start - 1:end])


def find_pointer_like_params(signature_src: str, param_names: List[str]) -> Dict[str, str]:
    out = {}
    for p in param_names:
        esc = re.escape(p)
        if re.search(rf"\*\s*{esc}\b", signature_src):
            out[p] = "pointer"
        elif re.search(rf"\b{esc}\s*\[[^\]]*\]", signature_src):
            out[p] = "array"
    return out


def detect_param_writes(body_src: str, param: str) -> Dict[str, bool]:
    esc = re.escape(param)
    return {
        "star_assign": bool(re.search(rf"\*\s*{esc}\s*=", body_src)),
        "index_assign": bool(re.search(rf"\b{esc}\s*\[[^\]]*\]\s*=", body_src)),
        "write_call": bool(re.search(rf"\b(?:{'|'.join(WRITE_CALLS)})\s*\(\s*{esc}\b", body_src)),
        "address_pass": bool(re.search(rf"\&\s*{esc}\b", body_src)),
    }


def find_return_shape(signature_src: str, body_src: str) -> str:
    sig = re.sub(r"\s+", " ", signature_src.strip())
    # Heuristic: treat as void-return when signature includes 'void' before param list
    # and does not look like a pointer-return declarator.
    head = sig.split("(", 1)[0]
    is_void = bool(re.search(r"\bvoid\b", head)) and ("*" not in head.replace(" *", "*"))
    returns = re.findall(r"\breturn\s*([^;]*);", body_src)
    has_value_return = any(x.strip() not in ("",) for x in returns)
    if is_void and not has_value_return:
        return "void_no_value"
    if has_value_return:
        return "returns_value"
    return "unknown"


def get_marked_functions(repo_root: Path) -> Dict[Tuple[str, str], Dict]:
    out = {}
    js_dir = repo_root / "js"
    for p in sorted(js_dir.glob("*.js")):
        lines = p.read_text(encoding="utf-8", errors="replace").splitlines()
        for i, line in enumerate(lines):
            m = MARKER_RE.match(line)
            if not m:
                continue
            fn = None
            for j in range(i + 1, min(i + 8, len(lines))):
                fm = FN_RE.match(lines[j])
                if fm:
                    fn = fm.group(1)
                    break
            if not fn:
                continue
            out[(p.name.replace(".js", ""), fn)] = {
                "js_module": f"js/{p.name}",
                "marker_source": m.group(1),
                "marker_line": int(m.group(2)),
            }
    return out


def main() -> None:
    args = parse_args()
    repo_root = Path(args.repo_root)
    summary = json.loads(Path(args.summary).read_text(encoding="utf-8"))
    marked = get_marked_functions(repo_root)

    safety_unsafe = {}
    if args.safety:
        s = json.loads(Path(args.safety).read_text(encoding="utf-8"))
        safety_unsafe = {(r["js_module"], r["function"]): r for r in s.get("unsafe", [])}

    all_fn = 0
    pointer_param_fn = 0
    outparam_fn = 0
    single_out_void = 0
    multi_or_with_return = 0
    sprintf_fn = 0
    sprintf_outparam_fn = 0

    examples = defaultdict(list)
    examples_single_out_void: List[Dict] = []
    examples_multi_or_ret: List[Dict] = []
    examples_sprintf_outparam: List[Dict] = []
    call_counter = Counter()

    for file_rec in summary.get("files", []):
        source = file_rec.get("source", "")
        src_path = Path(source)
        if not src_path.exists():
            # tolerate relative/alt paths
            src_path = repo_root / source
            if not src_path.exists():
                continue
        lines = src_path.read_text(encoding="utf-8", errors="replace").splitlines()
        src_stem = src_path.stem

        for fn in file_rec.get("functions", []):
            all_fn += 1
            out_file = fn.get("out_file")
            meta = {}
            if out_file and Path(out_file).exists():
                try:
                    out_obj = json.loads(Path(out_file).read_text(encoding="utf-8"))
                    meta = out_obj.get("meta") or {}
                except Exception:
                    meta = {}
            name = fn.get("name") or ""
            param_names = list(meta.get("param_names") or [])
            sig_line = int(meta.get("signature_line") or 1)
            body_start = int(meta.get("body_start_line") or sig_line)
            body_end = int(meta.get("body_end_line") or body_start)

            signature_src = line_slice(lines, max(1, sig_line - 2), min(len(lines), sig_line + 2))
            body_src = line_slice(lines, body_start, body_end)

            if re.search(r"\b(?:Sprintf|Snprintf|sprintf|snprintf)\s*\(", body_src):
                sprintf_fn += 1

            ptr_like = find_pointer_like_params(signature_src, param_names)
            if ptr_like:
                pointer_param_fn += 1

            out_params = []
            for p, kind in ptr_like.items():
                w = detect_param_writes(body_src, p)
                direct_write = w["star_assign"] or w["index_assign"] or w["write_call"]
                if direct_write:
                    out_params.append((p, kind, w))
                    for c in WRITE_CALLS:
                        if re.search(rf"\b{c}\s*\(\s*{re.escape(p)}\b", body_src):
                            call_counter[c] += 1

            if out_params:
                outparam_fn += 1
                ret_shape = find_return_shape(signature_src, body_src)
                if len(out_params) == 1 and ret_shape == "void_no_value":
                    single_out_void += 1
                    if len(examples_single_out_void) < 20:
                        examples_single_out_void.append(
                            {
                                "source": source,
                                "function": name,
                                "signature_line": sig_line,
                                "out_param": out_params[0][0],
                            }
                        )
                else:
                    multi_or_with_return += 1
                    if len(examples_multi_or_ret) < 20:
                        examples_multi_or_ret.append(
                            {
                                "source": source,
                                "function": name,
                                "signature_line": sig_line,
                                "out_param_count": len(out_params),
                                "return_shape": ret_shape,
                            }
                        )

                if any(op[2]["write_call"] and re.search(r"\b(?:Sprintf|Snprintf|sprintf|snprintf)\s*\(", body_src) for op in out_params):
                    sprintf_outparam_fn += 1
                    if len(examples_sprintf_outparam) < 20:
                        examples_sprintf_outparam.append(
                            {
                                "source": source,
                                "function": name,
                                "signature_line": sig_line,
                                "out_params": [op[0] for op in out_params],
                            }
                        )

                key = (src_stem, name)
                marked_meta = marked.get(key)
                cat = "marked" if marked_meta else "unmarked"
                if len(examples[cat]) < 40:
                    rec = {
                        "source": source,
                        "function": name,
                        "signature_line": sig_line,
                        "out_params": [
                            {
                                "name": p,
                                "kind": k,
                                "writes": w,
                            }
                            for p, k, w in out_params
                        ],
                        "return_shape": ret_shape,
                    }
                    if marked_meta:
                        rec.update(marked_meta)
                        unsafe = safety_unsafe.get((marked_meta["js_module"], name))
                        if unsafe:
                            rec["safety_unknown_calls"] = unsafe.get("unknown_calls", [])[:8]
                            rec["safety_unknown_identifiers"] = unsafe.get("unknown_identifiers", [])[:8]
                    examples[cat].append(rec)

    result = {
        "counts": {
            "functions_in_summary": all_fn,
            "functions_with_pointer_like_params": pointer_param_fn,
            "functions_with_detected_outparam_writes": outparam_fn,
            "single_outparam_void_no_value_return": single_out_void,
            "multi_outparam_or_has_return_value": multi_or_with_return,
            "functions_with_sprintf_or_snprintf_calls": sprintf_fn,
            "functions_with_sprintf_or_snprintf_on_outparam": sprintf_outparam_fn,
        },
        "write_call_frequency_on_outparams": dict(call_counter.most_common()),
        "examples": {
            "marked": examples["marked"][:20],
            "unmarked": examples["unmarked"][:20],
            "single_outparam_void_no_value": examples_single_out_void,
            "multi_outparam_or_has_return": examples_multi_or_ret,
            "sprintf_outparam_functions": examples_sprintf_outparam,
        },
    }

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(result, indent=2), encoding="utf-8")

    print(f"audit -> {out_path}")
    for k, v in result["counts"].items():
        print(f"  {k}: {v}")


if __name__ == "__main__":
    main()
