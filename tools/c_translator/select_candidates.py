#!/usr/bin/env python3
"""Select stitch candidates from batch_emit summary.

By default selects only fully clean outputs (no diag codes).
"""

import argparse
import json
from pathlib import Path


def parse_args():
    p = argparse.ArgumentParser(description="Select stitch candidates from batch summary")
    p.add_argument("--summary", required=True, help="batch_emit summary JSON")
    p.add_argument("--out", required=True, help="candidate manifest JSON")
    p.add_argument(
        "--allow-diag",
        action="append",
        default=[],
        help="diag code allowed in selection (repeatable)",
    )
    p.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Optional max selected functions (0 = no limit)",
    )
    return p.parse_args()


def main():
    args = parse_args()
    summary = json.loads(Path(args.summary).read_text(encoding="utf-8"))
    allow = set(args.allow_diag)

    selected = []
    rejected = {
        "not_ok": 0,
        "diag_blocked": 0,
    }

    for file_rec in summary.get("files", []):
        source = file_rec.get("source")
        for fn in file_rec.get("functions", []):
            if args.limit > 0 and len(selected) >= args.limit:
                break
            if not fn.get("ok"):
                rejected["not_ok"] += 1
                continue
            diags = fn.get("diag_codes", []) or []
            if any(code not in allow for code in diags):
                rejected["diag_blocked"] += 1
                continue
            selected.append(
                {
                    "source": source,
                    "name": fn.get("name"),
                    "out_file": fn.get("out_file"),
                    "diag_codes": diags,
                }
            )

    out = {
        "summary_file": args.summary,
        "allow_diag": sorted(allow),
        "selected_count": len(selected),
        "rejected": rejected,
        "selected": selected,
    }
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(out, indent=2, sort_keys=True), encoding="utf-8")
    print(f"translator: selected {len(selected)} candidates -> {out_path}")
    print(f"translator: rejected not_ok={rejected['not_ok']} diag_blocked={rejected['diag_blocked']}")


if __name__ == "__main__":
    main()

