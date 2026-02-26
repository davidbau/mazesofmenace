#!/usr/bin/env python3
import argparse
import json
from pathlib import Path

from backend import emit_helper_scaffold
from cfg import build_cfg_summary
from frontend import load_compile_profile, parse_summary, provenance_summary
from nir import build_nir_snapshot


def build_parser():
    p = argparse.ArgumentParser(description="Operation Iron Parity translator scaffold")
    p.add_argument("--src", required=True, help="C source file path")
    p.add_argument("--func", help="Optional function filter")
    p.add_argument(
        "--compile-profile",
        default="tools/c_translator/compile_profile.json",
        help="Compile profile JSON path",
    )
    p.add_argument(
        "--emit",
        default="parse-summary",
        choices=[
            "parse-summary",
            "provenance-summary",
            "nir-snapshot",
            "cfg-summary",
            "emit-helper",
            "scaffold",
            "patch",
        ],
        help="Output mode",
    )
    p.add_argument("--out", required=True, help="Output file path")
    return p


def main():
    args = build_parser().parse_args()
    profile = load_compile_profile(args.compile_profile)

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    if args.emit == "parse-summary":
        payload = parse_summary(args.src, profile, args.func)
    elif args.emit == "provenance-summary":
        payload = provenance_summary(args.src, profile)
    elif args.emit == "nir-snapshot":
        payload = build_nir_snapshot(args.src, args.func)
    elif args.emit == "cfg-summary":
        payload = build_cfg_summary(args.src, args.func)
    elif args.emit == "emit-helper":
        payload = emit_helper_scaffold(args.src, args.func)
    else:
        # Scaffold placeholders for next M3 steps.
        payload = {
            "emit_mode": args.emit,
            "status": "not_implemented",
            "source": str(Path(args.src)).replace("\\", "/"),
            "function": args.func,
        }

    out_path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(f"translator: wrote {out_path}")


if __name__ == "__main__":
    main()
