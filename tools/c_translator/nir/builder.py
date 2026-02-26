import hashlib
import re
from pathlib import Path


FUNC_SIG_RE = re.compile(
    r"^\s*(?:[A-Za-z_][\w\s\*\(\)]*?\s+)?([A-Za-z_]\w*)\s*\([^;]*\)\s*$"
)
CALL_RE = re.compile(r"\b([A-Za-z_]\w*)\s*\(")
ASSIGN_RE = re.compile(r"\b([A-Za-z_]\w*)\s*([+\-*/%&|^]?=)")
KEYWORDS = {
    "if",
    "for",
    "while",
    "switch",
    "return",
    "sizeof",
    "case",
    "do",
}


def _find_function_regions(text):
    lines = text.splitlines()
    regions = []
    for i, line in enumerate(lines, start=1):
        m = FUNC_SIG_RE.match(line)
        if not m:
            continue
        name = m.group(1)
        if name in KEYWORDS or name.upper() == name or "=" in line:
            continue
        opener_line = None
        j = i
        while j < len(lines):
            probe = lines[j].strip()
            if not probe or probe.startswith("/*") or probe.startswith("*"):
                j += 1
                continue
            opener_line = j + 1 if probe == "{" else None
            break
        if opener_line is None:
            continue
        end_line = _scan_function_end(lines, opener_line)
        if end_line is None:
            continue
        regions.append(
            {
                "name": name,
                "signature_line": i,
                "body_start_line": opener_line,
                "body_end_line": end_line,
            }
        )
    return regions


def _scan_function_end(lines, opener_line):
    depth = 0
    in_string = False
    in_char = False
    in_block_comment = False
    in_line_comment = False
    escape = False
    for i in range(opener_line - 1, len(lines)):
        line = lines[i]
        j = 0
        in_line_comment = False
        while j < len(line):
            ch = line[j]
            nxt = line[j + 1] if j + 1 < len(line) else ""
            if in_line_comment:
                break
            if in_block_comment:
                if ch == "*" and nxt == "/":
                    in_block_comment = False
                    j += 2
                    continue
                j += 1
                continue
            if in_string:
                if not escape and ch == '"':
                    in_string = False
                escape = (ch == "\\") and not escape
                if ch != "\\":
                    escape = False
                j += 1
                continue
            if in_char:
                if not escape and ch == "'":
                    in_char = False
                escape = (ch == "\\") and not escape
                if ch != "\\":
                    escape = False
                j += 1
                continue
            if ch == "/" and nxt == "/":
                in_line_comment = True
                j += 2
                continue
            if ch == "/" and nxt == "*":
                in_block_comment = True
                j += 2
                continue
            if ch == '"':
                in_string = True
                escape = False
                j += 1
                continue
            if ch == "'":
                in_char = True
                escape = False
                j += 1
                continue
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    return i + 1
            j += 1
    return None


def _collect_calls(body):
    calls = []
    seen = set()
    for m in CALL_RE.finditer(body):
        name = m.group(1)
        if name in KEYWORDS or name in seen:
            continue
        seen.add(name)
        calls.append(name)
    return calls


def _collect_assignments(body):
    out = []
    for m in ASSIGN_RE.finditer(body):
        out.append({"target": m.group(1), "op": m.group(2)})
    return out


def build_nir_snapshot(src_path, func_filter=None):
    path = Path(src_path)
    text = path.read_text(encoding="utf-8", errors="replace")
    src_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()
    lines = text.splitlines()
    regions = _find_function_regions(text)
    if func_filter:
        regions = [r for r in regions if r["name"] == func_filter]

    functions = []
    for idx, region in enumerate(regions, start=1):
        body_lines = lines[region["body_start_line"] - 1 : region["body_end_line"]]
        body = "\n".join(body_lines)
        functions.append(
            {
                "id": f"fn_{idx:04d}_{region['name']}",
                "name": region["name"],
                "span": {
                    "signature_line": region["signature_line"],
                    "body_start_line": region["body_start_line"],
                    "body_end_line": region["body_end_line"],
                },
                "body_line_count": len(body_lines),
                "body_sha256": hashlib.sha256(body.encode("utf-8")).hexdigest(),
                "calls": _collect_calls(body),
                "assignments": _collect_assignments(body),
            }
        )

    return {
        "nir_version": 1,
        "source": str(path).replace("\\", "/"),
        "source_sha256": src_hash,
        "function_count": len(functions),
        "functions": functions,
    }
