#!/usr/bin/env python3
"""
gen_constants.py — Parse C headers and patch generated constants blocks in js/const.js.

Sources:
- include/global.h, rm.h, permonst.h (map/global block)
- include/skills.h, monst.h (weapon/skills block)
- include/*.h (all const-style object macros)
"""

from __future__ import annotations

import argparse
import os
import re
import sys

from marker_patch import MarkerSpec, patch_between_markers


SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))


def _pick_existing(*candidates: str) -> str:
    return next((p for p in candidates if os.path.exists(p)), candidates[0])


SKILLS_H = _pick_existing(
    os.path.join(SCRIPT_DIR, "nethack-c", "include", "skills.h"),
    os.path.join(SCRIPT_DIR, "..", "..", "nethack-c", "patched", "include", "skills.h"),
    os.path.join(SCRIPT_DIR, "..", "..", "nethack-c", "include", "skills.h"),
)
MONST_H = _pick_existing(
    os.path.join(SCRIPT_DIR, "nethack-c", "include", "monst.h"),
    os.path.join(SCRIPT_DIR, "..", "..", "nethack-c", "patched", "include", "monst.h"),
    os.path.join(SCRIPT_DIR, "..", "..", "nethack-c", "include", "monst.h"),
)
GLOBAL_H = _pick_existing(
    os.path.join(SCRIPT_DIR, "nethack-c", "include", "global.h"),
    os.path.join(SCRIPT_DIR, "..", "..", "nethack-c", "patched", "include", "global.h"),
    os.path.join(SCRIPT_DIR, "..", "..", "nethack-c", "include", "global.h"),
)
RM_H = _pick_existing(
    os.path.join(SCRIPT_DIR, "nethack-c", "include", "rm.h"),
    os.path.join(SCRIPT_DIR, "..", "..", "nethack-c", "patched", "include", "rm.h"),
    os.path.join(SCRIPT_DIR, "..", "..", "nethack-c", "include", "rm.h"),
)
PERMONST_H = _pick_existing(
    os.path.join(SCRIPT_DIR, "nethack-c", "include", "permonst.h"),
    os.path.join(SCRIPT_DIR, "..", "..", "nethack-c", "patched", "include", "permonst.h"),
    os.path.join(SCRIPT_DIR, "..", "..", "nethack-c", "include", "permonst.h"),
)
HACK_H = _pick_existing(
    os.path.join(SCRIPT_DIR, "nethack-c", "include", "hack.h"),
    os.path.join(SCRIPT_DIR, "..", "..", "nethack-c", "patched", "include", "hack.h"),
    os.path.join(SCRIPT_DIR, "..", "..", "nethack-c", "include", "hack.h"),
)
INCLUDE_DIR = os.path.dirname(HACK_H)

OUTPUT_PATH = os.path.join(SCRIPT_DIR, "..", "..", "js", "const.js")
MARKER_GLOBAL_RM = MarkerSpec("CONST_GLOBAL_RM")
MARKER_ALL_HEADERS = MarkerSpec("CONST_ALL_HEADERS")
MARKER_WEAPON = MarkerSpec("CONST_WEAPON_SKILLS")


def _read(path: str) -> str:
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def _strip_c_comments(text: str) -> str:
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.DOTALL)
    return text


def _strip_cpp_comment_outside_quotes(line: str) -> str:
    out: list[str] = []
    in_single = False
    in_double = False
    escaped = False
    i = 0
    while i < len(line):
        ch = line[i]
        nxt = line[i + 1] if i + 1 < len(line) else ""
        if escaped:
            out.append(ch)
            escaped = False
            i += 1
            continue
        if ch == "\\":
            out.append(ch)
            escaped = True
            i += 1
            continue
        if not in_double and ch == "'":
            in_single = not in_single
            out.append(ch)
            i += 1
            continue
        if not in_single and ch == '"':
            in_double = not in_double
            out.append(ch)
            i += 1
            continue
        if not in_single and not in_double and ch == "/" and nxt == "/":
            break
        out.append(ch)
        i += 1
    return "".join(out)


def _collapse_line_continuations(text: str) -> str:
    return re.sub(r"\\\n", "", text)


def _parse_defines(text: str, names: list[str]) -> dict[str, str]:
    cleaned = _strip_c_comments(_collapse_line_continuations(text))
    result: dict[str, str] = {}
    for n in names:
        m = re.search(rf"^\s*#define\s+{re.escape(n)}\s+(.+?)\s*$", cleaned, re.MULTILINE)
        if m:
            result[n] = _strip_cpp_comment_outside_quotes(m.group(1)).strip()
    return result


def _parse_define_int(text: str, name: str) -> str | None:
    m = re.search(rf"^\s*#define\s+{re.escape(name)}\s+([^\s/][^\n]*)$", text, re.MULTILINE)
    if not m:
        return None
    return m.group(1).strip()


def _parse_enum_block(text: str, enum_name: str) -> list[tuple[str, str]]:
    m = re.search(rf"enum\s+{re.escape(enum_name)}\s*\{{(.*?)\}};", text, re.DOTALL)
    if not m:
        return []
    body = _strip_c_comments(m.group(1))
    out: list[tuple[str, str]] = []
    for raw in body.split(","):
        line = raw.strip()
        if not line or "=" not in line:
            continue
        name, val = line.split("=", 1)
        out.append((name.strip(), val.strip()))
    return out


def _parse_object_defines(text: str, *, ignore: set[str] | None = None) -> list[tuple[str, str]]:
    ignore = ignore or set()
    cleaned = _strip_c_comments(_collapse_line_continuations(text))
    out: list[tuple[str, str]] = []
    for raw in cleaned.splitlines():
        line = _strip_cpp_comment_outside_quotes(raw).strip()
        if not line:
            continue
        m = re.match(r"^#define\s+([A-Z][A-Z0-9_]*)(\(([^)]*)\))?\s+(.+)$", line)
        if not m:
            continue
        name = m.group(1)
        if name in ignore:
            continue
        is_function_like = bool(m.group(2))
        if is_function_like:
            continue
        value = m.group(4).strip()
        if value:
            out.append((name, value))
    return out


def _sanitize_c_expr_for_js(expr: str) -> str:
    expr = expr.strip()
    # Remove C integer suffixes (U/L/UL/...) from literals.
    expr = re.sub(r"\b(0[xX][0-9A-Fa-f]+|\d+)([uUlL]+)\b", r"\1", expr)
    # Convert legacy C-style octal integer literals (e.g., 011) to JS 0o11 form.
    expr = re.sub(
        r"(?<![A-Za-z0-9_])0([0-7]{2,})(?![A-Za-z0-9_])",
        lambda m: f"0o{m.group(1)}",
        expr,
    )
    return expr


def _expr_identifiers(expr: str) -> list[str]:
    no_strings = re.sub(r'"(?:[^"\\]|\\.)*"', '""', expr)
    no_strings = re.sub(r"'(?:[^'\\]|\\.)*'", "''", no_strings)
    return re.findall(r"\b[A-Za-z_]\w*\b", no_strings)


def _is_potential_const_style(expr: str) -> bool:
    if any(tok in expr for tok in ("{", "}", ";", "->", "sizeof", "#")):
        return False
    if re.search(r"\b[A-Za-z_]\w*\s*\(", expr):
        return False
    # identifiers must be macro-style (all caps/underscore)
    for ident in _expr_identifiers(expr):
        if not re.fullmatch(r"[A-Z_][A-Z0-9_]*", ident):
            return False
    return True


def _existing_export_names_before_marker(path: str, marker_tag: str) -> set[str]:
    text = _read(path)
    begin = f"// AUTO-IMPORT-BEGIN: {marker_tag}"
    names: set[str] = set()
    for line in text.splitlines():
        if begin in line:
            break
        m = re.match(r"^\s*export const\s+([A-Z][A-Z0-9_]*)\b", line)
        if m:
            names.add(m.group(1))
    return names


def _existing_export_names_outside_marker(path: str, marker_tag: str) -> set[str]:
    text = _read(path)
    begin = f"// AUTO-IMPORT-BEGIN: {marker_tag}"
    end = f"// AUTO-IMPORT-END: {marker_tag}"
    in_marker = False
    names: set[str] = set()
    for line in text.splitlines():
        if begin in line:
            in_marker = True
            continue
        if end in line:
            in_marker = False
            continue
        if in_marker:
            continue
        m = re.match(r"^\s*export const\s+([A-Z][A-Z0-9_]*)\b", line)
        if m:
            names.add(m.group(1))
    return names


def generate_global_rm_block() -> str:
    global_h = _read(GLOBAL_H)
    rm_h = _read(RM_H)
    permonst_h = _read(PERMONST_H)

    colno = _parse_define_int(global_h, "COLNO")
    rowno = _parse_define_int(global_h, "ROWNO")
    normal_speed = _parse_define_int(permonst_h, "NORMAL_SPEED")
    if not colno or not rowno or not normal_speed:
        raise RuntimeError("Failed parsing COLNO/ROWNO/NORMAL_SPEED from C headers.")

    levl_types = _parse_enum_block(rm_h, "levl_typ_types")
    if not levl_types:
        raise RuntimeError("Failed parsing enum levl_typ_types from rm.h")

    door_names = ["D_NODOOR", "D_BROKEN", "D_ISOPEN", "D_CLOSED", "D_LOCKED", "D_TRAPPED", "D_SECRET"]
    door_defs = _parse_defines(rm_h, door_names)
    if any(name not in door_defs for name in door_names):
        missing = [n for n in door_names if n not in door_defs]
        raise RuntimeError(f"Failed parsing door constants from rm.h: {missing}")

    lines: list[str] = []
    lines.append("// Auto-imported global/rm constants from C headers")
    lines.append(f"// Sources: {os.path.basename(GLOBAL_H)}, {os.path.basename(RM_H)}, {os.path.basename(PERMONST_H)}")
    lines.append("")
    lines.append("// Map dimensions — cf. global.h")
    lines.append(f"export const COLNO = {colno};")
    lines.append(f"export const ROWNO = {rowno};")
    lines.append("")
    lines.append("// Level location types — cf. rm.h enum levl_typ_types")
    for name, value in levl_types:
        if name in ("MATCH_WALL", "INVALID_TYPE"):
            continue
        lines.append(f"export const {name} = {value};")
    lines.append("")
    lines.append("// Door states — cf. rm.h")
    for name in door_names:
        lines.append(f"export const {name} = {door_defs[name]};")
    lines.append("")
    lines.append("// Movement speed — cf. permonst.h")
    lines.append(f"export const NORMAL_SPEED = {normal_speed};")
    lines.append("")
    return "\n".join(lines)


def generate_all_headers_block(existing_exports_before: set[str], existing_exports_outside: set[str]) -> str:
    header_paths = sorted(
        os.path.join(INCLUDE_DIR, name)
        for name in os.listdir(INCLUDE_DIR)
        if name.endswith(".h")
    )

    merged: dict[str, tuple[str, str]] = {}
    for path in header_paths:
        header_name = os.path.basename(path)
        guard_guess = os.path.splitext(header_name)[0].upper() + "_H"
        for name, value in _parse_object_defines(_read(path), ignore={guard_guess}):
            merged.setdefault(name, (header_name, _sanitize_c_expr_for_js(value)))

    # Candidate constants: const-style macros not already exported elsewhere.
    candidates: dict[str, tuple[str, str]] = {}
    for name, (src, expr) in merged.items():
        if name in existing_exports_outside:
            continue
        if _is_potential_const_style(expr):
            candidates[name] = (src, expr)

    # Resolve dependency order: identifiers must already be known or emitted earlier.
    known = set(existing_exports_before)
    emitted: list[tuple[str, str, str]] = []
    pending = dict(candidates)
    while pending:
        progress = False
        for name in sorted(list(pending.keys())):
            src, expr = pending[name]
            deps = set(_expr_identifiers(expr))
            if deps.issubset(known | {name}):
                emitted.append((name, expr, src))
                known.add(name)
                del pending[name]
                progress = True
        if not progress:
            break

    unresolved = sorted((name, src) for name, (src, _expr) in pending.items())

    lines: list[str] = []
    lines.append("// Auto-imported const-style object macros from C include headers")
    lines.append(f"// Source dir: {INCLUDE_DIR}")
    lines.append("//")
    lines.append("// Rules:")
    lines.append("// - include only object-like #define macros (not function-like)")
    lines.append("// - include only const-style expressions (no runtime/lowercase identifiers)")
    lines.append("// - emit only when dependencies are already resolvable at this marker location")
    lines.append("")
    lines.append(f"// Added direct exports: {len(emitted)}")
    lines.append(f"// Deferred unresolved const-style macros: {len(unresolved)}")
    for name, expr, src in emitted:
        lines.append(f"// {src}")
        lines.append(f"export const {name} = {expr};")
    lines.append("")
    lines.append("export const DEFERRED_HEADER_CONST_MACROS = Object.freeze([")
    for name, src in unresolved:
        lines.append(f'    "{name} ({src})",')
    lines.append("]);")
    lines.append("")
    return "\n".join(lines)


def generate_weapon_constants_block() -> str:
    skills = _read(SKILLS_H)
    monst = _read(MONST_H)

    p_skills = _parse_enum_block(skills, "p_skills")
    skill_levels = _parse_enum_block(skills, "skill_levels")
    weapon_check = _parse_enum_block(monst, "wpn_chk_flags")

    define_names = [
        "P_FIRST_WEAPON",
        "P_LAST_WEAPON",
        "P_FIRST_SPELL",
        "P_LAST_SPELL",
        "P_FIRST_H_TO_H",
        "P_LAST_H_TO_H",
        "P_MARTIAL_ARTS",
        "P_SKILL_LIMIT",
    ]
    defs = _parse_defines(skills, define_names)

    if not p_skills or not skill_levels or not weapon_check:
        raise RuntimeError("Failed parsing required weapon constants from C headers.")

    lines: list[str] = []
    lines.append("// Auto-imported weapon/skill constants from C headers")
    lines.append(f"// Sources: {os.path.basename(SKILLS_H)}, {os.path.basename(MONST_H)}")
    lines.append("")
    lines.append("// Skill constants — cf. skills.h enum p_skills")
    for name, value in p_skills:
        lines.append(f"export const {name} = {value};")
    lines.append("")

    for n in define_names:
        value = defs.get(n)
        if value:
            lines.append(f"export const {n} = {value};")
    lines.append("")

    lines.append("// Skill levels — cf. skills.h enum skill_levels")
    for name, value in skill_levels:
        lines.append(f"export const {name} = {value};")
    lines.append("")

    lines.append("// Monster weapon_check states — cf. monst.h enum wpn_chk_flags")
    for name, value in weapon_check:
        lines.append(f"export const {name} = {value};")
    lines.append("")
    lines.append("// Distance limits (hack.h)")
    lines.append("export const BOLT_LIM = 8;")
    lines.append("export const AKLYS_LIM = BOLT_LIM / 2;")
    lines.append("")
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description="Patch generated constants blocks in js/const.js")
    parser.add_argument("--stdout", action="store_true", help="Print generated constants blocks to stdout.")
    parser.add_argument("--output", default=OUTPUT_PATH, help="Target js file (default: js/const.js).")
    args = parser.parse_args()

    global_rm_block = generate_global_rm_block()
    before = _existing_export_names_before_marker(args.output, MARKER_ALL_HEADERS.tag)
    outside = _existing_export_names_outside_marker(args.output, MARKER_ALL_HEADERS.tag)
    all_headers_block = generate_all_headers_block(before, outside)
    weapon_block = generate_weapon_constants_block()

    if args.stdout:
        print(f"/* {MARKER_GLOBAL_RM.tag} */")
        print(global_rm_block)
        print(f"/* {MARKER_ALL_HEADERS.tag} */")
        print(all_headers_block)
        print(f"/* {MARKER_WEAPON.tag} */")
        print(weapon_block)
        return

    patch_between_markers(args.output, MARKER_GLOBAL_RM, global_rm_block)
    patch_between_markers(args.output, MARKER_ALL_HEADERS, all_headers_block)
    patch_between_markers(args.output, MARKER_WEAPON, weapon_block)
    print(
        f"Patched {args.output} ({MARKER_GLOBAL_RM.tag}, {MARKER_ALL_HEADERS.tag}, {MARKER_WEAPON.tag})",
        file=sys.stderr,
    )


if __name__ == "__main__":
    main()
