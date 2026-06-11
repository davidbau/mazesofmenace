// enhance.js — the #enhance extended command (weapon-skill enhancement menu).
//
// C ref: weapon.c enhance_weapon_skill() / add_skills_to_menu() /
// skill_level_name(); u_init.c skill_init() / skills_for_role() / Skill_* tables.
//
// Builds the hero's weapon-skill array (P_SKILL / P_MAX_SKILL) deterministically
// from the role skill table plus the carried-weapon rule (skill_init: each
// non-ammo weapon-type held at game start gets P_BASIC, martial arts gets
// P_BASIC when its max exceeds P_EXPERT, a starting steed grants P_RIDING basic),
// then renders the "Pick a skill to advance:" / "Current skills:" menu as a
// paged NHW_MENU.  For the recorded sessions no skill is yet advanceable
// (u.weapon_slots == 0 at experience level 1), so the menu is always the
// non-selectable PICK_NONE "Current skills:" form dismissed with ESC.

import { game } from './gstate.js';
import { objects, WEAPON_CLASS, GEM_CLASS } from './mkobj.js';
import { renderWindowScreen, dismiss_invent_screen } from './invent.js';
import {
    P_NONE, P_ISRESTRICTED, P_UNSKILLED, P_BASIC, P_SKILLED, P_EXPERT,
    P_MASTER, P_GRAND_MASTER, P_NUM_SKILLS,
    P_FIRST_WEAPON, P_LAST_WEAPON, P_FIRST_SPELL, P_LAST_SPELL,
    P_FIRST_H_TO_H, P_LAST_H_TO_H,
    P_BARE_HANDED_COMBAT, P_RIDING,
} from './const.js';

const ECMD_OK = 0;

// Role mnums (u_init.c monster order).
const PM_ARCHEOLOGIST = 0, PM_BARBARIAN = 1, PM_CAVE_DWELLER = 2, PM_HEALER = 3,
      PM_KNIGHT = 4, PM_MONK = 5, PM_CLERIC = 6, PM_RANGER = 7, PM_ROGUE = 8,
      PM_SAMURAI = 9, PM_TOURIST = 10, PM_VALKYRIE = 11, PM_WIZARD = 12;

// C ref: u_init.c Skill_* tables — [skill, skmax] pairs (P_NONE terminator
// omitted).  These set P_MAX_SKILL and, by appearing here, unrestrict the skill.
const SKILL_A = [[1,P_BASIC],[2,P_BASIC],[4,P_EXPERT],[5,P_BASIC],[9,P_EXPERT],
    [10,P_SKILLED],[15,P_SKILLED],[21,P_SKILLED],[23,P_BASIC],[25,P_EXPERT],
    [26,P_EXPERT],[27,P_SKILLED],[28,P_BASIC],[29,P_BASIC],[30,P_EXPERT],
    [34,P_BASIC],[37,P_BASIC],[36,P_BASIC],[35,P_EXPERT]];
const SKILL_B = [[1,P_BASIC],[3,P_EXPERT],[4,P_SKILLED],[5,P_EXPERT],[6,P_SKILLED],
    [7,P_SKILLED],[8,P_EXPERT],[9,P_SKILLED],[10,P_SKILLED],[11,P_SKILLED],
    [12,P_SKILLED],[13,P_BASIC],[14,P_EXPERT],[15,P_BASIC],[17,P_SKILLED],
    [18,P_SKILLED],[20,P_BASIC],[28,P_BASIC],[33,P_BASIC],[37,P_BASIC],
    [36,P_BASIC],[35,P_MASTER]];
const SKILL_C = [[1,P_BASIC],[2,P_SKILLED],[3,P_SKILLED],[4,P_BASIC],[10,P_EXPERT],
    [11,P_EXPERT],[12,P_BASIC],[13,P_SKILLED],[14,P_SKILLED],[15,P_EXPERT],
    [16,P_SKILLED],[17,P_EXPERT],[18,P_SKILLED],[20,P_SKILLED],[21,P_EXPERT],
    [28,P_BASIC],[34,P_SKILLED],[25,P_EXPERT],[27,P_BASIC],[35,P_MASTER]];
const SKILL_H = [[1,P_SKILLED],[2,P_EXPERT],[5,P_SKILLED],[9,P_BASIC],[10,P_SKILLED],
    [11,P_BASIC],[15,P_EXPERT],[16,P_BASIC],[17,P_BASIC],[18,P_BASIC],
    [21,P_SKILLED],[23,P_EXPERT],[24,P_SKILLED],[27,P_EXPERT],[29,P_EXPERT],
    [35,P_BASIC]];
const SKILL_K = [[1,P_BASIC],[2,P_BASIC],[3,P_SKILLED],[4,P_BASIC],[5,P_SKILLED],
    [6,P_SKILLED],[7,P_EXPERT],[8,P_SKILLED],[9,P_SKILLED],[10,P_BASIC],
    [11,P_SKILLED],[12,P_SKILLED],[13,P_BASIC],[14,P_BASIC],[16,P_SKILLED],
    [17,P_SKILLED],[18,P_BASIC],[19,P_EXPERT],[20,P_BASIC],[22,P_SKILLED],
    [28,P_SKILLED],[29,P_SKILLED],[32,P_SKILLED],[37,P_EXPERT],[36,P_SKILLED],
    [35,P_EXPERT]];
const SKILL_MON = [[15,P_BASIC],[17,P_BASIC],[22,P_BASIC],[24,P_BASIC],[28,P_BASIC],
    [29,P_EXPERT],[30,P_BASIC],[31,P_BASIC],[32,P_SKILLED],[33,P_SKILLED],
    [34,P_BASIC],[35,P_GRAND_MASTER]];
const SKILL_P = [[10,P_EXPERT],[11,P_EXPERT],[12,P_EXPERT],[13,P_EXPERT],[14,P_EXPERT],
    [15,P_EXPERT],[16,P_SKILLED],[17,P_SKILLED],[18,P_SKILLED],[19,P_BASIC],
    [20,P_BASIC],[21,P_BASIC],[22,P_BASIC],[23,P_BASIC],[24,P_BASIC],
    [25,P_BASIC],[27,P_SKILLED],[29,P_EXPERT],[30,P_EXPERT],[32,P_EXPERT],
    [35,P_BASIC]];
const SKILL_R = [[1,P_EXPERT],[2,P_EXPERT],[5,P_EXPERT],[6,P_SKILLED],[7,P_SKILLED],
    [8,P_BASIC],[9,P_SKILLED],[10,P_SKILLED],[11,P_SKILLED],[12,P_BASIC],
    [13,P_BASIC],[14,P_BASIC],[16,P_BASIC],[17,P_BASIC],[22,P_EXPERT],
    [23,P_EXPERT],[24,P_SKILLED],[30,P_SKILLED],[33,P_SKILLED],[34,P_SKILLED],
    [37,P_BASIC],[36,P_EXPERT],[35,P_EXPERT]];
const SKILL_RAN = [[1,P_EXPERT],[2,P_SKILLED],[3,P_SKILLED],[4,P_BASIC],[5,P_BASIC],
    [12,P_BASIC],[13,P_SKILLED],[14,P_BASIC],[15,P_BASIC],[16,P_SKILLED],
    [17,P_EXPERT],[18,P_BASIC],[20,P_EXPERT],[21,P_EXPERT],[22,P_EXPERT],
    [23,P_EXPERT],[24,P_SKILLED],[25,P_EXPERT],[26,P_BASIC],[29,P_BASIC],
    [30,P_EXPERT],[33,P_BASIC],[37,P_BASIC],[35,P_BASIC]];
const SKILL_S = [[1,P_BASIC],[2,P_SKILLED],[5,P_EXPERT],[6,P_SKILLED],[7,P_EXPERT],
    [8,P_EXPERT],[9,P_BASIC],[13,P_SKILLED],[15,P_BASIC],[16,P_SKILLED],
    [17,P_SKILLED],[19,P_SKILLED],[20,P_EXPERT],[24,P_EXPERT],[28,P_BASIC],
    [30,P_BASIC],[32,P_SKILLED],[37,P_SKILLED],[36,P_EXPERT],[35,P_MASTER]];
const SKILL_T = [[1,P_EXPERT],[2,P_SKILLED],[3,P_BASIC],[4,P_BASIC],[5,P_EXPERT],
    [6,P_BASIC],[7,P_BASIC],[8,P_BASIC],[9,P_SKILLED],[11,P_BASIC],
    [12,P_BASIC],[13,P_BASIC],[14,P_BASIC],[15,P_BASIC],[16,P_BASIC],
    [17,P_BASIC],[18,P_BASIC],[19,P_BASIC],[20,P_BASIC],[21,P_BASIC],
    [22,P_BASIC],[23,P_EXPERT],[24,P_BASIC],[25,P_BASIC],[26,P_BASIC],
    [27,P_SKILLED],[30,P_BASIC],[31,P_BASIC],[33,P_SKILLED],[37,P_BASIC],
    [36,P_SKILLED],[35,P_SKILLED]];
const SKILL_V = [[1,P_EXPERT],[3,P_EXPERT],[4,P_SKILLED],[5,P_SKILLED],[6,P_SKILLED],
    [7,P_EXPERT],[8,P_EXPERT],[9,P_BASIC],[14,P_EXPERT],[15,P_BASIC],
    [16,P_SKILLED],[17,P_EXPERT],[18,P_BASIC],[19,P_SKILLED],[21,P_BASIC],
    [28,P_BASIC],[33,P_BASIC],[37,P_SKILLED],[36,P_SKILLED],[35,P_EXPERT]];
const SKILL_W = [[1,P_EXPERT],[2,P_SKILLED],[3,P_SKILLED],[5,P_BASIC],[10,P_SKILLED],
    [11,P_BASIC],[15,P_EXPERT],[16,P_SKILLED],[17,P_BASIC],[18,P_BASIC],
    [21,P_SKILLED],[23,P_EXPERT],[24,P_BASIC],[28,P_EXPERT],[29,P_SKILLED],
    [30,P_EXPERT],[31,P_SKILLED],[32,P_SKILLED],[33,P_EXPERT],[34,P_EXPERT],
    [37,P_BASIC],[35,P_BASIC]];

// C ref: u_init.c skills_for_role().
const SKILLS_FOR_ROLE = {
    [PM_ARCHEOLOGIST]: SKILL_A, [PM_BARBARIAN]: SKILL_B, [PM_CAVE_DWELLER]: SKILL_C,
    [PM_HEALER]: SKILL_H, [PM_KNIGHT]: SKILL_K, [PM_MONK]: SKILL_MON,
    [PM_CLERIC]: SKILL_P, [PM_RANGER]: SKILL_RAN, [PM_ROGUE]: SKILL_R,
    [PM_SAMURAI]: SKILL_S, [PM_TOURIST]: SKILL_T, [PM_VALKYRIE]: SKILL_V,
    [PM_WIZARD]: SKILL_W,
};

// C ref: weapon.c skill_names_indices[] resolved through P_NAME() (OBJ_NAME for
// object-backed skills, odd_skill_names[] / barehands_or_martial[] otherwise).
// Bare-handed-combat (35) is filled in per-hero (martial arts vs bare handed).
const P_NAMES = {
    1: 'dagger', 2: 'knife', 3: 'axe', 4: 'pick-axe', 5: 'short sword',
    6: 'broadsword', 7: 'long sword', 8: 'two-handed sword', 9: 'saber',
    10: 'club', 11: 'mace', 12: 'morning star', 13: 'flail', 14: 'hammer',
    15: 'quarterstaff', 16: 'polearms', 17: 'spear', 18: 'trident', 19: 'lance',
    20: 'bow', 21: 'sling', 22: 'crossbow', 23: 'dart', 24: 'shuriken',
    25: 'boomerang', 26: 'whip', 27: 'unicorn horn',
    28: 'attack spells', 29: 'healing spells', 30: 'divination spells',
    31: 'enchantment spells', 32: 'clerical spells', 33: 'escape spells',
    34: 'matter spells',
    36: 'two weapon combat', 37: 'riding',
};

const SKILL_LEVEL_NAME = {
    [P_UNSKILLED]: 'Unskilled', [P_BASIC]: 'Basic', [P_SKILLED]: 'Skilled',
    [P_EXPERT]: 'Expert', [P_MASTER]: 'Master', [P_GRAND_MASTER]: 'Grand Master',
};

// C ref: include/skills.h martial_bonus() = Role_if(SAMURAI) || Role_if(MONK).
function martial_bonus(rolemnum) {
    return rolemnum === PM_SAMURAI || rolemnum === PM_MONK;
}

function P_NAME(skill, rolemnum) {
    if (skill === P_BARE_HANDED_COMBAT)
        return martial_bonus(rolemnum) ? 'martial arts' : 'bare handed combat';
    return P_NAMES[skill] || 'no skill';
}

// C ref: weapon.c weapon_type — |oc_skill| (ammo's skill is the negated
// launcher skill).  P_NONE (0) for non-weapons.
function weapon_type(obj) {
    const sk = objects[obj.otyp]?.oc_skill ?? P_NONE;
    return sk < 0 ? -sk : sk;
}
function is_ammo(obj) {
    const sk = objects[obj.otyp]?.oc_skill ?? 0;
    return (obj.oclass === WEAPON_CLASS || obj.oclass === GEM_CLASS)
        && sk >= -22 && sk <= -20; // -P_CROSSBOW .. -P_BOW
}

function current_role_mnum() {
    return game.urole?.mnum ?? game.u?.umonnum ?? PM_SAMURAI;
}

// Build {skill, max, level, restricted} state for all P_NUM_SKILLS skills.
// C ref: weapon.c skill_init() (restricted by default; basic for carried
// non-ammo weapons; role table sets max + unrestricts; martial arts basic
// when its max > EXPERT; pony-riders get P_RIDING basic).
function build_skill_state() {
    const rolemnum = current_role_mnum();
    const P_SKILL = new Array(P_NUM_SKILLS).fill(P_ISRESTRICTED);
    const P_MAX = new Array(P_NUM_SKILLS).fill(P_ISRESTRICTED);

    // Carried non-ammo weapons -> P_BASIC.
    const invent = Array.isArray(game.invent) ? game.invent
        : (Array.isArray(game.gi?.invent) ? game.gi.invent : []);
    for (const obj of invent) {
        if (!obj || is_ammo(obj)) continue;
        const sk = weapon_type(obj);
        if (sk !== P_NONE) P_SKILL[sk] = P_BASIC;
    }

    // Role spell-skill basics (skill_init magic block).
    if (rolemnum === PM_HEALER || rolemnum === PM_MONK) P_SKILL[29] = P_BASIC;
    else if (rolemnum === PM_CLERIC) P_SKILL[32] = P_BASIC;
    else if (rolemnum === PM_WIZARD) { P_SKILL[28] = P_BASIC; P_SKILL[31] = P_BASIC; }

    // Role table: set maxes + unrestrict.
    const table = SKILLS_FOR_ROLE[rolemnum] || SKILL_S;
    for (const [sk, skmax] of table) {
        P_MAX[sk] = skmax;
        if (P_SKILL[sk] === P_ISRESTRICTED) P_SKILL[sk] = P_UNSKILLED;
    }

    // High-potential fighters already know their hands.
    if (P_MAX[P_BARE_HANDED_COMBAT] > P_EXPERT) P_SKILL[P_BARE_HANDED_COMBAT] = P_BASIC;
    // Roles starting with a horse (Knight's pony) know how to ride it.
    if (rolemnum === PM_KNIGHT) P_SKILL[P_RIDING] = P_BASIC;

    return { P_SKILL, P_MAX, rolemnum };
}

// C ref: weapon.c skill_ranges[].
const SKILL_RANGES = [
    [P_FIRST_H_TO_H, P_LAST_H_TO_H, 'Fighting Skills'],
    [P_FIRST_WEAPON, P_LAST_WEAPON, 'Weapon Skills'],
    [P_FIRST_SPELL, P_LAST_SPELL, 'Spellcasting Skills'],
];

// C ref: weapon.c enhance_weapon_skill() + add_skills_to_menu().  Builds the
// ordered line list (title, optional legend, headings, items) for the menu.
// Returns { lines, title } where lines is [{text, attr}].
function build_skill_menu_lines(state) {
    const { P_SKILL, P_MAX, rolemnum } = state;
    const restricted = (i) => P_SKILL[i] === P_ISRESTRICTED;

    // At experience level 1 with no weapon slots, nothing can advance and
    // nothing is flagged "*"/"#" (P_ADVANCE never reaches the threshold), so
    // the menu is the non-selectable "Current skills:" form with no legend.
    // (The recorded sessions only ever take this path.)
    const to_advance = 0;       // u.weapon_slots == 0
    const selectable = false;

    // longest unrestricted skill name (for %-*s padding).
    let longest = 0;
    for (let i = 0; i < P_NUM_SKILLS; i++) {
        if (restricted(i)) continue;
        const len = P_NAME(i, rolemnum).length;
        if (len > longest) longest = len;
    }

    const lines = [];
    for (const [first, last, name] of SKILL_RANGES) {
        // Heading (ATR_INVERSE) emitted at the start of each range.
        lines.push({ text: name, attr: 1 /* ATR_INVERSE */ });
        for (let i = first; i <= last; i++) {
            if (restricted(i)) continue;
            const lvl = SKILL_LEVEL_NAME[P_SKILL[i]] || 'Unknown';
            // C: " %s %-*s [%s]" with prefix == "" (selectable false) ->
            // "  " + name.padEnd(longest) + " [" + level + "]".
            const text = '  ' + P_NAME(i, rolemnum).padEnd(longest) + ' [' + lvl + ']';
            lines.push({ text });
        }
    }

    const title = (to_advance > 0) ? 'Pick a skill to advance:' : 'Current skills:';
    return { lines, title, selectable };
}

// Render one page of the skill menu.  C ref: win/tty/wintty.c
// process_menu_window — a full-screen (multi-page) NHW_MENU: the end_menu()
// prompt is the first line (ATR_INVERSE), 23 content lines per page, the
// "(N of M)" morestr on the last row (indented one column by dmore).
function renderSkillPage() {
    const pages = game._skill_pages;
    if (!pages) return;
    const idx = game._skill_page || 0;
    const page = pages[idx];
    const footer = `(${idx + 1} of ${pages.length})`;
    renderWindowScreen(page, {
        menu: true,
        footer,
        footerRow: page.length,
        footerCol: 1,
        modal: 'skillwin',
    });
}

// C ref: cmd.c doextcmd -> weapon.c enhance_weapon_skill().
export function doenhance() {
    // svc.context.tips |= (1 << TIP_ENHANCE) — player now knows about #enhance.
    const state = build_skill_state();
    const { lines, title } = build_skill_menu_lines(state);

    // end_menu() prepends the title (ATR_INVERSE) + a blank separator line.
    const allLines = [{ text: title, attr: 1 }, { text: '' }, ...lines];

    // Paginate: 23 content lines per page (row 23 holds the "(N of M)" morestr).
    const totalRows = game.nhDisplay?.rows ?? 24;
    const perPage = totalRows - 1;
    const pages = [];
    for (let i = 0; i < allLines.length; i += perPage)
        pages.push(allLines.slice(i, i + perPage));
    game._skill_pages = pages;
    game._skill_page = 0;
    renderSkillPage();
    return ECMD_OK;
}

// Advance the paged skill window (space / '>' next page; dismiss after last).
// C ref: process_menu_window() page navigation.  Returns true if a window was
// active and consumed the key.
export async function skill_window_advance() {
    if (game._modal_screen !== 'skillwin') return false;
    const pages = game._skill_pages || [];
    const idx = (game._skill_page || 0) + 1;
    if (idx < pages.length) {
        game._skill_page = idx;
        renderSkillPage();
        return true;
    }
    delete game._skill_pages;
    delete game._skill_page;
    await dismiss_invent_screen();
    return true;
}
