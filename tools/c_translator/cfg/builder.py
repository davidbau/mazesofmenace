import hashlib
import re
from pathlib import Path

from nir.builder import build_nir_snapshot


LABEL_RE = re.compile(r"^\s*([A-Za-z_]\w*)\s*:\s*(?:/\*.*)?$")
GOTO_RE = re.compile(r"\bgoto\s+([A-Za-z_]\w*)\s*;")
SWITCH_RE = re.compile(r"\bswitch\s*\(")
CASE_RE = re.compile(r"\bcase\b")
DEFAULT_RE = re.compile(r"\bdefault\s*:")
BREAK_RE = re.compile(r"\bbreak\s*;")


def _extract_cfg_for_function(lines, func_span):
    start = func_span["body_start_line"]
    end = func_span["body_end_line"]
    body_lines = lines[start - 1 : end]

    labels = []
    gotos = []
    switch_lines = []
    case_lines = []
    default_lines = []
    break_lines = []

    for offset, line in enumerate(body_lines):
        line_no = start + offset
        m = LABEL_RE.match(line)
        if m:
            labels.append({"name": m.group(1), "line": line_no})
        for gm in GOTO_RE.finditer(line):
            gotos.append({"target": gm.group(1), "line": line_no})
        if SWITCH_RE.search(line):
            switch_lines.append(line_no)
        if CASE_RE.search(line):
            case_lines.append(line_no)
        if DEFAULT_RE.search(line):
            default_lines.append(line_no)
        if BREAK_RE.search(line):
            break_lines.append(line_no)

    label_map = {entry["name"]: entry["line"] for entry in labels}
    goto_edges = []
    for g in gotos:
        target_line = label_map.get(g["target"])
        goto_edges.append(
            {
                "from_line": g["line"],
                "target_label": g["target"],
                "target_line": target_line,
                "direction": "backward" if target_line and target_line < g["line"] else "forward",
            }
        )

    reducible_tags = _tag_reducible_patterns(goto_edges, labels, end)

    return {
        "label_count": len(labels),
        "labels": labels,
        "goto_count": len(goto_edges),
        "gotos": goto_edges,
        "switch_count": len(switch_lines),
        "switch_lines": switch_lines,
        "case_count": len(case_lines),
        "case_lines": case_lines,
        "default_count": len(default_lines),
        "default_lines": default_lines,
        "break_count": len(break_lines),
        "break_lines": break_lines,
        "reducible_tags": reducible_tags,
    }


def _tag_reducible_patterns(goto_edges, labels, body_end_line):
    tags = []
    if any(edge["direction"] == "backward" for edge in goto_edges):
        tags.append("retry_loop_candidate")

    forward_targets = [edge["target_label"] for edge in goto_edges if edge["direction"] == "forward"]
    if forward_targets and len(set(forward_targets)) == 1:
        target = forward_targets[0]
        tag = f"single_exit_goto_ladder:{target}"
        tags.append(tag)

    if labels:
        trailing_labels = [l for l in labels if body_end_line - l["line"] <= 6]
        if trailing_labels:
            tags.append("trailing_cleanup_label_present")

    return sorted(set(tags))


def build_cfg_summary(src_path, func_filter=None):
    path = Path(src_path)
    text = path.read_text(encoding="utf-8", errors="replace")
    source_lines = text.splitlines()
    base_nir = build_nir_snapshot(src_path, func_filter)

    functions = []
    for fn in base_nir["functions"]:
        cfg = _extract_cfg_for_function(source_lines, fn["span"])
        functions.append(
            {
                "id": fn["id"],
                "name": fn["name"],
                "span": fn["span"],
                "cfg": cfg,
            }
        )

    return {
        "cfg_version": 1,
        "source": str(path).replace("\\", "/"),
        "source_sha256": hashlib.sha256(text.encode("utf-8")).hexdigest(),
        "function_count": len(functions),
        "functions": functions,
    }
