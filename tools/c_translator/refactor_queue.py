#!/usr/bin/env python3
"""Build actionable refactor queue from translator safety/apply outputs."""

import argparse
import json
from collections import defaultdict
from pathlib import Path


def parse_args():
    p = argparse.ArgumentParser(description="Build translator refactor queue")
    p.add_argument("--safety", required=True, help="runtime_candidate_safety JSON path")
    p.add_argument("--apply-summary", required=True, help="runtime_stitch_apply summary JSON path")
    p.add_argument("--out", required=True, help="Output JSON path")
    return p.parse_args()


def add_task(tasks, keyset, task):
    key = (task.get("kind"), task.get("js_module"), task.get("function"), task.get("detail"))
    if key in keyset:
        return
    keyset.add(key)
    tasks.append(task)


def main():
    args = parse_args()
    safety = json.loads(Path(args.safety).read_text(encoding="utf-8"))
    apply_summary = json.loads(Path(args.apply_summary).read_text(encoding="utf-8"))

    tasks = []
    dedupe = set()

    for rec in safety.get("unsafe", []):
        js_module = rec.get("js_module")
        function = rec.get("function")
        source = rec.get("source")
        out_file = rec.get("out_file")
        unknown_identifiers = set(rec.get("unknown_identifiers", []))
        alias_candidates = rec.get("alias_candidates", {}) or {}
        alias_sources = set(alias_candidates.keys())
        for src, dst in sorted(alias_candidates.items()):
            add_task(tasks, dedupe, {
                "kind": "rename_alias",
                "js_module": js_module,
                "function": function,
                "source": source,
                "out_file": out_file,
                "detail": f"{src}->{dst}",
            })
        for ident in sorted(unknown_identifiers):
            add_task(tasks, dedupe, {
                "kind": "add_missing_identifier",
                "js_module": js_module,
                "function": function,
                "source": source,
                "out_file": out_file,
                "detail": ident,
            })
        for call in sorted(set(rec.get("unknown_calls", []))):
            # If a symbol is already unresolved as an identifier for this function,
            # the call-binding task is redundant noise in the queue.
            if call in unknown_identifiers or call in alias_sources:
                continue
            add_task(tasks, dedupe, {
                "kind": "add_missing_call_binding",
                "js_module": js_module,
                "function": function,
                "source": source,
                "out_file": out_file,
                "detail": call,
            })
        if not rec.get("syntax_ok", True):
            add_task(tasks, dedupe, {
                "kind": "syntax_emit_fix",
                "js_module": js_module,
                "function": function,
                "source": source,
                "out_file": out_file,
                "detail": rec.get("syntax_error", "node --check failed"),
            })

    for rec in apply_summary.get("skipped_signature_details", []):
        add_task(tasks, dedupe, {
            "kind": "signature_refactor",
            "js_module": rec.get("js_module"),
            "function": rec.get("function"),
            "source": rec.get("source"),
            "out_file": rec.get("out_file"),
            "detail": rec.get("reason"),
            "existing_tokens": rec.get("existing_tokens"),
            "emitted_tokens": rec.get("emitted_tokens"),
        })

    by_kind = defaultdict(int)
    by_module = defaultdict(int)
    for task in tasks:
        by_kind[task["kind"]] += 1
        by_module[task["js_module"]] += 1

    output = {
        "input": {
            "safety": args.safety,
            "apply_summary": args.apply_summary,
        },
        "totals": {
            "tasks": len(tasks),
            "by_kind": dict(sorted(by_kind.items())),
            "by_module": dict(sorted(by_module.items())),
        },
        "tasks": tasks,
    }
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(output, indent=2, sort_keys=True), encoding="utf-8")
    print(f"translator: refactor queue -> {out_path}")
    print(f"translator: tasks={len(tasks)} kinds={dict(sorted(by_kind.items()))}")


if __name__ == "__main__":
    main()
