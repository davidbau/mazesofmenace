#!/usr/bin/env python3
"""Hunt unresolved identifier follow-ups from translator refactor queues.

Emits two actionable buckets:
1) alias_candidates: likely renamed symbols within the same JS module.
2) binding_candidates: exact symbol exists in other JS module(s), likely import/binding gap.
"""

import argparse
import json
import re
from collections import defaultdict
from difflib import SequenceMatcher
from pathlib import Path


def parse_args():
    p = argparse.ArgumentParser(description="Find unresolved identifier follow-ups")
    p.add_argument("--queue", required=True, help="refactor_queue JSON path")
    p.add_argument("--out", required=True, help="output JSON path")
    return p.parse_args()


def normalize(name):
    return re.sub(r"[_\W]+", "", name).lower()


def module_symbols(path):
    text = path.read_text(encoding="utf-8", errors="replace")
    syms = set()
    syms.update(re.findall(r"\b(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_]\w*)\s*\(", text))
    syms.update(re.findall(r"\bclass\s+([A-Za-z_]\w*)\b", text))
    for m in re.finditer(r"^\s*import\s*\{([^}]*)\}\s*from\s*['\"][^'\"]+['\"]\s*;", text, re.MULTILINE):
        for part in m.group(1).split(","):
            token = part.strip()
            if not token:
                continue
            syms.add(token.split(" as ")[-1].strip())
    return syms


def global_exports(js_root):
    exports = defaultdict(set)
    for p in sorted(Path(js_root).glob("*.js")):
        text = p.read_text(encoding="utf-8", errors="replace")
        for fn in re.findall(r"\bexport\s+(?:async\s+)?function\s+([A-Za-z_]\w*)\s*\(", text):
            exports[fn].add(str(p))
        for var in re.findall(r"\bexport\s+(?:const|let|var)\s+([A-Za-z_]\w*)\b", text):
            exports[var].add(str(p))
    return exports


def main():
    args = parse_args()
    queue = json.loads(Path(args.queue).read_text(encoding="utf-8"))

    by_module = defaultdict(set)
    for t in queue.get("tasks", []):
        if t.get("kind") != "add_missing_identifier":
            continue
        mod = t.get("js_module")
        ident = t.get("detail")
        if mod and ident:
            by_module[mod].add(ident)

    mod_sym_cache = {}
    for mod in by_module:
        p = Path(mod)
        mod_sym_cache[mod] = module_symbols(p) if p.exists() else set()

    alias_candidates = []
    for mod, idents in sorted(by_module.items()):
        syms = {s for s in mod_sym_cache.get(mod, set()) if len(s) >= 4}
        for ident in sorted(idents):
            if len(ident) < 4:
                continue
            n1 = normalize(ident)
            cands = []
            for sym in syms:
                if sym == ident:
                    continue
                n2 = normalize(sym)
                if not n2 or n1 == n2:
                    continue
                ratio = SequenceMatcher(None, n1, n2).ratio()
                overlap = any(tok and tok in n2 for tok in re.split(r"[_\W]+", n1) if len(tok) >= 4)
                if ratio >= 0.86 or (ratio >= 0.78 and overlap):
                    cands.append({"target": sym, "score": round(ratio, 3)})
            if cands:
                cands.sort(key=lambda c: c["score"], reverse=True)
                alias_candidates.append({
                    "js_module": mod,
                    "identifier": ident,
                    "candidates": cands[:3],
                })

    exports = global_exports("js")
    binding_candidates = []
    for mod, idents in sorted(by_module.items()):
        for ident in sorted(idents):
            locs = sorted(exports.get(ident, []))
            if locs and mod not in locs:
                binding_candidates.append({
                    "js_module": mod,
                    "identifier": ident,
                    "exported_in": locs[:5],
                })

    out = {
        "input_queue": args.queue,
        "summary": {
            "alias_candidates": len(alias_candidates),
            "binding_candidates": len(binding_candidates),
        },
        "alias_candidates": alias_candidates,
        "binding_candidates": binding_candidates,
    }
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(out, indent=2, sort_keys=True), encoding="utf-8")
    print(f"translator: identifier hunt -> {out_path}")
    print(f"translator: alias_candidates={len(alias_candidates)} binding_candidates={len(binding_candidates)}")


if __name__ == "__main__":
    main()

