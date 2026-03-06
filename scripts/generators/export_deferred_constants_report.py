#!/usr/bin/env python3
"""
Write the deferred-constants JSON report to a file.

Default output:
  docs/metrics/deferred_constants_report_latest.json
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys


def main() -> None:
    parser = argparse.ArgumentParser(description="Export deferred constants report JSON to a file.")
    parser.add_argument(
        "--output",
        default=os.path.join("docs", "metrics", "deferred_constants_report_latest.json"),
        help="Output JSON file path.",
    )
    args = parser.parse_args()

    cmd = ["python3", os.path.join("scripts", "generators", "gen_constants.py"), "--report-deferred-json"]
    raw = subprocess.check_output(cmd, text=True)
    payload = json.loads(raw)

    out_path = args.output
    out_dir = os.path.dirname(out_path)
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, sort_keys=True)
        f.write("\n")
    print(f"Wrote {out_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
