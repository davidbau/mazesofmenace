#!/usr/bin/env python3
"""
gen_weapon_constants.py — Parse C headers and patch weapon constants in js/weapon.js.

Sources:
- nethack-c/include/skills.h
- nethack-c/include/monst.h (weapon_check enum)
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

OUTPUT_PATH = os.path.join(SCRIPT_DIR, "..", "..", "js", "weapon.js")
MARKER = MarkerSpec("WEAPON_CONSTANTS")


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
            result[n] = m.group(1).strip()
    return result


def generate_weapon_constants() -> str:
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
    ]
    defs = _parse_defines(skills, define_names)

    if not p_skills or not skill_levels or not weapon_check:
        raise RuntimeError("Failed parsing required weapon constants from C headers.")

    lines: list[str] = []
    lines.append("// Auto-imported weapon constants from C headers")
    lines.append(f"// Sources: {os.path.basename(SKILLS_H)}, {os.path.basename(MONST_H)}")
    lines.append("")
    lines.append("// Skill constants — cf. skills.h enum p_skills")

    exported = {
        "P_BOW",
        "P_ATTACK_SPELL", "P_HEALING_SPELL", "P_DIVINATION_SPELL",
        "P_ENCHANTMENT_SPELL", "P_CLERIC_SPELL", "P_ESCAPE_SPELL", "P_MATTER_SPELL",
        "P_BARE_HANDED_COMBAT", "P_TWO_WEAPON_COMBAT", "P_RIDING",
        "P_FIRST_WEAPON", "P_LAST_WEAPON", "P_FIRST_SPELL", "P_LAST_SPELL",
        "P_FIRST_H_TO_H", "P_LAST_H_TO_H", "P_NUM_SKILLS",
        "P_ISRESTRICTED", "P_UNSKILLED", "P_BASIC", "P_SKILLED",
        "P_EXPERT", "P_MASTER", "P_GRAND_MASTER",
        "NO_WEAPON_WANTED", "NEED_WEAPON", "NEED_HTH_WEAPON", "NEED_RANGED_WEAPON",
        "NEED_PICK_AXE", "NEED_AXE", "NEED_PICK_OR_AXE",
    }

    for name, value in p_skills:
        prefix = "export const" if name in exported else "const"
        lines.append(f"{prefix} {name} = {value};")
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
    lines.append("// BOLT_LIM for distance checks (hack.h)")
    lines.append("const BOLT_LIM = 8;")
    lines.append("const AKLYS_LIM = BOLT_LIM / 2;")
    lines.append("")

    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description="Patch weapon constants block in js/weapon.js")
    parser.add_argument("--stdout", action="store_true", help="Print generated constants block to stdout.")
    parser.add_argument("--output", default=OUTPUT_PATH, help="Target js file (default: js/weapon.js).")
    args = parser.parse_args()

    block = generate_weapon_constants()
    if args.stdout:
        print(block)
        return

    patch_between_markers(args.output, MARKER, block)
    print(f"Patched {args.output} ({MARKER.tag})", file=sys.stderr)


if __name__ == "__main__":
    main()
