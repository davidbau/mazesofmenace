import json
from pathlib import Path

from nir import build_nir_snapshot


BOUNDARY_RULES_DEFAULT = "tools/c_translator/rulesets/boundary_calls.json"


def _load_boundary_rules(path):
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    boundaries = data.get("boundaries", [])
    out = {}
    for rule in boundaries:
        name = rule.get("name")
        mode = rule.get("mode")
        if not isinstance(name, str) or not isinstance(mode, str):
            continue
        out[name] = rule
    return out


def build_async_summary(src_path, func_filter=None, boundary_rules_path=BOUNDARY_RULES_DEFAULT):
    nir = build_nir_snapshot(src_path, func_filter)
    rules = _load_boundary_rules(boundary_rules_path)

    by_name = {fn["name"]: fn for fn in nir["functions"]}
    state = {}
    for fn in nir["functions"]:
        direct = []
        nowait = []
        sync_only = []
        for call in fn["calls"]:
            rule = rules.get(call)
            if not rule:
                continue
            mode = rule.get("mode")
            if mode == "awaited_boundary":
                direct.append(call)
            elif mode == "nowait_boundary":
                nowait.append(call)
            elif mode == "sync_boundary":
                sync_only.append(call)
        state[fn["name"]] = {
            "name": fn["name"],
            "id": fn["id"],
            "span": fn["span"],
            "direct_awaited_boundaries": sorted(set(direct)),
            "direct_nowait_boundaries": sorted(set(nowait)),
            "direct_sync_boundaries": sorted(set(sync_only)),
            "callees": sorted(set(c for c in fn["calls"] if c in by_name)),
            "requires_async": len(direct) > 0,
            "reasons": ["direct_awaited_boundary"] if len(direct) > 0 else [],
            "awaited_boundary_callsites": [],
        }

    changed = True
    while changed:
        changed = False
        for fn_name, node in state.items():
            if node["requires_async"]:
                continue
            async_callees = [c for c in node["callees"] if state.get(c, {}).get("requires_async")]
            if async_callees:
                node["requires_async"] = True
                node["reasons"].append("async_callee")
                node["awaited_boundary_callsites"] = sorted(async_callees)
                changed = True

    functions = []
    async_count = 0
    for fn in nir["functions"]:
        node = state[fn["name"]]
        if node["requires_async"]:
            async_count += 1
        functions.append(
            {
                "id": node["id"],
                "name": node["name"],
                "span": node["span"],
                "requires_async": node["requires_async"],
                "reasons": node["reasons"],
                "direct_awaited_boundaries": node["direct_awaited_boundaries"],
                "direct_nowait_boundaries": node["direct_nowait_boundaries"],
                "direct_sync_boundaries": node["direct_sync_boundaries"],
                "awaited_boundary_callsites": node["awaited_boundary_callsites"],
                "callees": node["callees"],
            }
        )

    return {
        "async_infer_version": 1,
        "source": nir["source"],
        "source_sha256": nir["source_sha256"],
        "function_count": nir["function_count"],
        "requires_async_count": async_count,
        "boundary_rules_path": str(Path(boundary_rules_path)).replace("\\", "/"),
        "functions": functions,
    }
