#!/usr/bin/env python3
"""Insert unmatched translator candidates that are runtime-safe.

For each unmatched candidate:
1) verify emitted snippet is syntax-valid,
2) verify no unknown calls/identifiers for target module scope,
3) if module already has local `function name(...)`, promote to export,
4) else append emitted snippet.
"""

import argparse
import json
import re
from pathlib import Path

from runtime_candidate_safety import (
    candidate_syntax_ok,
    candidate_unknown_calls,
    candidate_unknown_identifiers,
    load_identifier_aliases,
    parse_module_symbols,
)


EXPORT_RE_TMPL = r"^\s*export\s+(?:async\s+)?function\s+{name}\s*\("
LOCAL_RE_TMPL = r"^\s*(?:async\s+)?function\s+{name}\s*\("


def parse_args():
    p = argparse.ArgumentParser(description="Insert safe unmatched translator candidates")
    p.add_argument("--candidates", required=True, help="runtime_stitch_candidates JSON path")
    p.add_argument("--report", required=True, help="output JSON report path")
    p.add_argument("--write", action="store_true", help="apply edits")
    return p.parse_args()


def main():
    args = parse_args()
    cand = json.loads(Path(args.candidates).read_text(encoding="utf-8"))
    unmatched = cand.get("unmatched", [])
    alias_map = load_identifier_aliases()

    module_symbols = {}
    edits = []
    skipped = []

    for rec in unmatched:
        module = rec.get("js_module")
        out_file = rec.get("out_file")
        fn = rec.get("function")
        if not module or not out_file or not fn:
            skipped.append({"record": rec, "reason": "missing_fields"})
            continue
        mpath = Path(module)
        opath = Path(out_file)
        if not mpath.exists():
            skipped.append({"record": rec, "reason": "missing_module"})
            continue
        if not opath.exists():
            skipped.append({"record": rec, "reason": "missing_out_file"})
            continue

        payload = json.loads(opath.read_text(encoding="utf-8"))
        emitted_js = payload.get("js", "")
        if not emitted_js:
            skipped.append({"record": rec, "reason": "empty_emit"})
            continue

        if module not in module_symbols:
            module_symbols[module] = parse_module_symbols(
                mpath.read_text(encoding="utf-8", errors="replace")
            )
        known = module_symbols[module]
        ok, _ = candidate_syntax_ok(emitted_js)
        if not ok:
            skipped.append({"record": rec, "reason": "syntax_bad"})
            continue
        unknown_calls = candidate_unknown_calls(emitted_js, known)
        unknown_ids, _ = candidate_unknown_identifiers(emitted_js, known, module, alias_map)
        if unknown_calls or unknown_ids:
            skipped.append({"record": rec, "reason": "unknown_symbols"})
            continue

        source_text = mpath.read_text(encoding="utf-8")
        exp_re = re.compile(EXPORT_RE_TMPL.format(name=re.escape(fn)), re.MULTILINE)
        loc_re = re.compile(LOCAL_RE_TMPL.format(name=re.escape(fn)), re.MULTILINE)
        if exp_re.search(source_text):
            skipped.append({"record": rec, "reason": "already_exported"})
            continue

        local_matches = list(loc_re.finditer(source_text))
        if len(local_matches) == 1:
            m = local_matches[0]
            # Safe prefix injection: only replace this exact token.
            patched = source_text[:m.start()] + "export " + source_text[m.start():]
            if args.write:
                mpath.write_text(patched, encoding="utf-8")
            edits.append({"record": rec, "mode": "promote_local"})
            module_symbols.pop(module, None)
            continue

        if len(local_matches) > 1:
            skipped.append({"record": rec, "reason": "multiple_local_defs"})
            continue

        # No local function to promote. If this name is already bound in module
        # scope (import/const/etc), appending a function would be a duplicate
        # declaration syntax error.
        if fn in known:
            skipped.append({"record": rec, "reason": "name_already_bound"})
            continue

        appended = source_text
        if not appended.endswith("\n"):
            appended += "\n"
        appended += "\n" + emitted_js.rstrip() + "\n"
        if args.write:
            mpath.write_text(appended, encoding="utf-8")
        edits.append({"record": rec, "mode": "append_emit"})
        module_symbols.pop(module, None)

    report = {
        "candidates": args.candidates,
        "write": bool(args.write),
        "applied": len(edits),
        "promoted": sum(1 for e in edits if e["mode"] == "promote_local"),
        "appended": sum(1 for e in edits if e["mode"] == "append_emit"),
        "skipped": len(skipped),
        "edits": edits,
        "skipped_items": skipped,
    }
    rpath = Path(args.report)
    rpath.parent.mkdir(parents=True, exist_ok=True)
    rpath.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(
        f"translator: safe unmatched insert -> {rpath} "
        f"(applied={report['applied']}, promoted={report['promoted']}, "
        f"appended={report['appended']}, skipped={report['skipped']})"
    )


if __name__ == "__main__":
    main()
