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

EXPORT_FN_RE = re.compile(
    r"^\s*export\s+(?:async\s+)?function\s+([A-Za-z_]\w*)\s*\(",
    re.MULTILINE,
)
EXPORT_LIST_RE = re.compile(r"export\s*\{\s*([^}]*)\s*\};")
AUTOGEN_HEADER_RE = re.compile(r"^\s*//\s*.*[Aa]uto-generated", re.MULTILINE)


def parse_args():
    p = argparse.ArgumentParser(description="Insert safe unmatched translator candidates")
    p.add_argument("--candidates", required=True, help="runtime_stitch_candidates JSON path")
    p.add_argument("--report", required=True, help="output JSON report path")
    p.add_argument("--write", action="store_true", help="apply edits")
    p.add_argument(
        "--mode",
        choices=("strict", "syntax"),
        default="strict",
        help="strict: require no unknown symbols; syntax: require syntax only",
    )
    return p.parse_args()


def is_escaped(text, i):
    backslashes = 0
    j = i - 1
    while j >= 0 and text[j] == "\\":
        backslashes += 1
        j -= 1
    return (backslashes % 2) == 1


def find_matching_paren(text, open_i):
    depth = 0
    in_str = None
    in_line_comment = False
    in_block_comment = False
    i = open_i
    n = len(text)
    while i < n:
        c = text[i]
        nxt = text[i + 1] if i + 1 < n else ""
        if in_line_comment:
            if c == "\n":
                in_line_comment = False
            i += 1
            continue
        if in_block_comment:
            if c == "*" and nxt == "/":
                in_block_comment = False
                i += 2
                continue
            i += 1
            continue
        if in_str:
            if c == in_str and not is_escaped(text, i):
                in_str = None
            i += 1
            continue
        if c == "/" and nxt == "/":
            in_line_comment = True
            i += 2
            continue
        if c == "/" and nxt == "*":
            in_block_comment = True
            i += 2
            continue
        if c in ("'", '"', "`"):
            in_str = c
            i += 1
            continue
        if c == "(":
            depth += 1
        elif c == ")":
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return -1


def find_matching_brace(text, open_i):
    depth = 0
    in_str = None
    in_line_comment = False
    in_block_comment = False
    i = open_i
    n = len(text)
    while i < n:
        c = text[i]
        nxt = text[i + 1] if i + 1 < n else ""
        if in_line_comment:
            if c == "\n":
                in_line_comment = False
            i += 1
            continue
        if in_block_comment:
            if c == "*" and nxt == "/":
                in_block_comment = False
                i += 2
                continue
            i += 1
            continue
        if in_str:
            if c == in_str and not is_escaped(text, i):
                in_str = None
            i += 1
            continue
        if c == "/" and nxt == "/":
            in_line_comment = True
            i += 2
            continue
        if c == "/" and nxt == "*":
            in_block_comment = True
            i += 2
            continue
        if c in ("'", '"', "`"):
            in_str = c
            i += 1
            continue
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return -1


def find_function_span(text, fn_name):
    local_re = re.compile(LOCAL_RE_TMPL.format(name=re.escape(fn_name)), re.MULTILINE)
    m = local_re.search(text)
    if not m:
        return None
    line_start = text.rfind("\n", 0, m.start()) + 1
    sig_open = text.find("(", m.start())
    if sig_open < 0:
        return None
    sig_close = find_matching_paren(text, sig_open)
    if sig_close < 0:
        return None
    brace_open = text.find("{", sig_close + 1)
    if brace_open < 0:
        return None
    brace_close = find_matching_brace(text, brace_open)
    if brace_close < 0:
        return None
    end = brace_close + 1
    if end < len(text) and text[end] == "\n":
        end += 1
    return (line_start, end)


def dedupe_export_lists(source_text):
    export_fns = set(EXPORT_FN_RE.findall(source_text))
    block_comment_re = re.compile(r"/\*.*?\*/", re.DOTALL)

    def parsed_export_names(part):
        clean = block_comment_re.sub("", part)
        clean = re.sub(r"//.*", "", clean)
        clean = clean.strip()
        if not clean:
            return ("", "")
        if " as " in clean:
            src_name, export_name = [x.strip() for x in clean.split(" as ", 1)]
        else:
            src_name, export_name = clean, clean
        return (src_name, export_name)

    def repl(match):
        body = match.group(1)
        parts = [x.strip() for x in body.split(",") if x.strip()]
        kept = []
        for part in parts:
            src_name, export_name = parsed_export_names(part)
            if not src_name and not export_name:
                continue
            if src_name in export_fns or export_name in export_fns:
                continue
            kept.append(part)
        if not kept:
            return ""
        return "export { " + ", ".join(kept) + " };"

    return EXPORT_LIST_RE.sub(repl, source_text)


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
        ok, syntax_detail = candidate_syntax_ok(emitted_js)
        if not ok:
            skipped.append(
                {"record": rec, "reason": "syntax_bad", "syntax_error": syntax_detail}
            )
            continue
        unknown_calls = candidate_unknown_calls(emitted_js, known)
        unknown_ids, _ = candidate_unknown_identifiers(emitted_js, known, module, alias_map)
        if args.mode == "strict" and (unknown_calls or unknown_ids):
            skipped.append({"record": rec, "reason": "unknown_symbols"})
            continue

        source_text = mpath.read_text(encoding="utf-8")
        if AUTOGEN_HEADER_RE.search(source_text):
            skipped.append({"record": rec, "reason": "autogenerated_module"})
            continue
        exp_re = re.compile(EXPORT_RE_TMPL.format(name=re.escape(fn)), re.MULTILINE)
        loc_re = re.compile(LOCAL_RE_TMPL.format(name=re.escape(fn)), re.MULTILINE)
        if exp_re.search(source_text):
            skipped.append({"record": rec, "reason": "already_exported"})
            continue

        local_matches = list(loc_re.finditer(source_text))
        if len(local_matches) == 1:
            # Overwrite existing by-hand local implementation with emitted body.
            span = find_function_span(source_text, fn)
            if not span:
                skipped.append({"record": rec, "reason": "local_span_not_found"})
                continue
            start, end = span
            replacement = emitted_js.rstrip() + "\n"
            patched = source_text[:start] + replacement + source_text[end:]
            patched = dedupe_export_lists(patched)
            if args.write:
                mpath.write_text(patched, encoding="utf-8")
            edits.append({"record": rec, "mode": "replace_local"})
            module_symbols.pop(module, None)
            continue

        if len(local_matches) > 1:
            skipped.append({"record": rec, "reason": "multiple_local_defs"})
            continue

        # No local function to promote. If this name is already bound in module
        # scope (import/const/etc), appending a function would be a duplicate
        # declaration syntax error.
        appended = source_text
        if not appended.endswith("\n"):
            appended += "\n"
        appended += "\n" + emitted_js.rstrip() + "\n"
        appended = dedupe_export_lists(appended)
        # If function name was previously bound by alias/import/local var, only
        # keep this append when the whole module still parses.
        if fn in known:
            parse_ok, _ = candidate_syntax_ok(appended)
            if not parse_ok:
                skipped.append({"record": rec, "reason": "name_already_bound"})
                continue
        if args.write:
            mpath.write_text(appended, encoding="utf-8")
        edits.append({"record": rec, "mode": "append_emit"})
        module_symbols.pop(module, None)

    report = {
        "candidates": args.candidates,
        "write": bool(args.write),
        "mode": args.mode,
        "applied": len(edits),
        "promoted": sum(1 for e in edits if e["mode"] == "promote_local"),
        "appended": sum(1 for e in edits if e["mode"] == "append_emit"),
        "replaced": sum(1 for e in edits if e["mode"] == "replace_local"),
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
