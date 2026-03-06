#!/usr/bin/env python3
"""
gen_constants.py — Parse C headers and patch generated constants blocks.

Sources:
- nethack-c/include/skills.h
- nethack-c/include/monst.h (weapon_check enum)
- nethack-c/include/global.h, rm.h, permonst.h
"""

from __future__ import annotations

import argparse
import os
import re
import sys

from marker_patch import MarkerSpec, patch_between_markers


SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

_SKILLS_H_CANDIDATES = [
    os.path.join(SCRIPT_DIR, "nethack-c", "include", "skills.h"),
    os.path.join(SCRIPT_DIR, "..", "..", "nethack-c", "patched", "include", "skills.h"),
    os.path.join(SCRIPT_DIR, "..", "..", "nethack-c", "include", "skills.h"),
]
SKILLS_H = next((p for p in _SKILLS_H_CANDIDATES if os.path.exists(p)), _SKILLS_H_CANDIDATES[0])

_MONST_H_CANDIDATES = [
    os.path.join(SCRIPT_DIR, "nethack-c", "include", "monst.h"),
    os.path.join(SCRIPT_DIR, "..", "..", "nethack-c", "patched", "include", "monst.h"),
    os.path.join(SCRIPT_DIR, "..", "..", "nethack-c", "include", "monst.h"),
]
MONST_H = next((p for p in _MONST_H_CANDIDATES if os.path.exists(p)), _MONST_H_CANDIDATES[0])

_GLOBAL_H_CANDIDATES = [
    os.path.join(SCRIPT_DIR, "nethack-c", "include", "global.h"),
    os.path.join(SCRIPT_DIR, "..", "..", "nethack-c", "patched", "include", "global.h"),
    os.path.join(SCRIPT_DIR, "..", "..", "nethack-c", "include", "global.h"),
]
GLOBAL_H = next((p for p in _GLOBAL_H_CANDIDATES if os.path.exists(p)), _GLOBAL_H_CANDIDATES[0])

_RM_H_CANDIDATES = [
    os.path.join(SCRIPT_DIR, "nethack-c", "include", "rm.h"),
    os.path.join(SCRIPT_DIR, "..", "..", "nethack-c", "patched", "include", "rm.h"),
    os.path.join(SCRIPT_DIR, "..", "..", "nethack-c", "include", "rm.h"),
]
RM_H = next((p for p in _RM_H_CANDIDATES if os.path.exists(p)), _RM_H_CANDIDATES[0])

_PERMONST_H_CANDIDATES = [
    os.path.join(SCRIPT_DIR, "nethack-c", "include", "permonst.h"),
    os.path.join(SCRIPT_DIR, "..", "..", "nethack-c", "patched", "include", "permonst.h"),
    os.path.join(SCRIPT_DIR, "..", "..", "nethack-c", "include", "permonst.h"),
]
PERMONST_H = next((p for p in _PERMONST_H_CANDIDATES if os.path.exists(p)), _PERMONST_H_CANDIDATES[0])

OUTPUT_PATH = os.path.join(SCRIPT_DIR, "..", "..", "js", "const.js")
MARKER_WEAPON = MarkerSpec("CONST_WEAPON_SKILLS")
MARKER_GLOBAL_RM = MarkerSpec("CONST_GLOBAL_RM")


def _read(path: str) -> str:
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def _parse_enum_block(text: str, enum_name: str) -> list[tuple[str, str]]:
    m = re.search(rf"enum\s+{re.escape(enum_name)}\s*\{{(.*?)\}};", text, re.DOTALL)
    if not m:
        return []
    body = re.sub(r"/\*.*?\*/", "", m.group(1), flags=re.DOTALL)
    out: list[tuple[str, str]] = []
    for raw in body.split(","):
        line = raw.strip()
        if not line:
            continue
        if "=" not in line:
            continue
        name, val = line.split("=", 1)
        out.append((name.strip(), val.strip()))
    return out


def _parse_defines(text: str, names: list[str]) -> dict[str, str]:
    result: dict[str, str] = {}
    for n in names:
        m = re.search(rf"^\s*#define\s+{re.escape(n)}\s+(.+?)\s*$", text, re.MULTILINE)
        if m:
            value = m.group(1)
            value = re.sub(r"/\*.*?\*/", "", value)
            value = re.sub(r"//.*$", "", value)
            result[n] = value.strip()
    return result


def _strip_c_comments(text: str) -> str:
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.DOTALL)
    text = re.sub(r"//[^\n]*", "", text)
    return text


def _parse_define_int(text: str, name: str) -> str | None:
    m = re.search(rf"^\s*#define\s+{re.escape(name)}\s+([^\s/][^\n]*)$", text, re.MULTILINE)
    if not m:
        return None
    return m.group(1).strip()


def _parse_enum_int_pairs(text: str, enum_name: str) -> list[tuple[str, str]]:
    m = re.search(rf"enum\s+{re.escape(enum_name)}\s*\{{(.*?)\}};", text, re.DOTALL)
    if not m:
        return []
    body = _strip_c_comments(m.group(1))
    out: list[tuple[str, str]] = []
    current = None
    for raw in body.split(","):
        line = raw.strip()
        if not line:
            continue
        if "=" not in line:
            continue
        name, value = line.split("=", 1)
        name = name.strip()
        value = value.strip()
        current = value
        out.append((name, value))
    return out


def generate_global_rm_block() -> str:
    global_h = _read(GLOBAL_H)
    rm_h = _read(RM_H)
    permonst_h = _read(PERMONST_H)

    colno = _parse_define_int(global_h, "COLNO")
    rowno = _parse_define_int(global_h, "ROWNO")
    normal_speed = _parse_define_int(permonst_h, "NORMAL_SPEED")
    if not colno or not rowno or not normal_speed:
        raise RuntimeError("Failed parsing COLNO/ROWNO/NORMAL_SPEED from C headers.")

    levl_types = _parse_enum_int_pairs(rm_h, "levl_typ_types")
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
    parser.add_argument("--stdout", action="store_true", help="Print generated constants block to stdout.")
    parser.add_argument("--output", default=OUTPUT_PATH, help="Target js file (default: js/const.js).")
    args = parser.parse_args()

    weapon_block = generate_weapon_constants_block()
    global_rm_block = generate_global_rm_block()
    if args.stdout:
        print(f"/* {MARKER_GLOBAL_RM.tag} */")
        print(global_rm_block)
        print(f"/* {MARKER_WEAPON.tag} */")
        print(weapon_block)
        return

    patch_between_markers(args.output, MARKER_GLOBAL_RM, global_rm_block)
    patch_between_markers(args.output, MARKER_WEAPON, weapon_block)
    print(f"Patched {args.output} ({MARKER_GLOBAL_RM.tag}, {MARKER_WEAPON.tag})", file=sys.stderr)


if __name__ == "__main__":
    main()
