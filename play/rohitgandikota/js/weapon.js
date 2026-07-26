// weapon.js — weapon and skill handling.
// C ref: src/weapon.c
//
// Only skill_init() and its two helpers so far. Nothing here draws, but the
// skill array it builds is read by percent_success() (src/spell.c:2173), whose
// result decides the rnd(100) comparison in spelleffects_check(). Without the
// array that comparison has no input at all.

import { game } from './gstate.js';
import { STR18 } from './const.js';
import { ACURR } from './attrib.js';
import { A_STR, A_DEX } from './const.js';
import { AKLYS_LIM } from './const.js';
import { ONAMES } from './objects_data.js';
import { spell_skilltype } from './spell.js';
import { discover_object } from './o_init.js';
import { OCLASSES } from './objects_data.js';
import {
    P_NONE, P_NUM_SKILLS, P_ISRESTRICTED, P_UNSKILLED, P_BASIC, P_EXPERT,
    P_BARE_HANDED_COMBAT, P_RIDING, P_HEALING_SPELL, P_CLERIC_SPELL,
    P_ATTACK_SPELL, P_ENCHANTMENT_SPELL, P_BOW, P_CROSSBOW,
} from './const.js';
import { PMNAMES } from './monst_data.js';

// include/skills.h:106 practice_needed_to_advance()
const practice_needed_to_advance = (level) => level * level * 20;

// include/obj.h:238 is_ammo() — the launcher-fired classes. Ammo alone does
// not confer skill; skill_init waits until it sees the launcher.
const is_ammo = (otmp) =>
    (otmp.oclass === OCLASSES.WEAPON_CLASS || otmp.oclass === OCLASSES.GEM_CLASS)
    && game.objects[otmp.otyp].oc_skill >= -P_CROSSBOW
    && game.objects[otmp.otyp].oc_skill <= -P_BOW;

// src/weapon.c:1517 weapon_type() — the skill an object trains. A NEGATIVE
// oc_skill marks ammo, and the sign is dropped here.
export function weapon_type(obj) {
    if (!obj)
        return P_BARE_HANDED_COMBAT;    /* not using a weapon */
    if (obj.oclass !== OCLASSES.WEAPON_CLASS
        && obj.oclass !== OCLASSES.TOOL_CLASS
        && obj.oclass !== OCLASSES.GEM_CLASS)
        return P_NONE;
    const type = game.objects[obj.otyp].oc_skill;
    return (type < 0) ? -type : type;
}

// src/weapon.c:1738 skill_init() — build u.weapon_skills from the role's
// def_skill table and the starting inventory.
//
// Order matters and is not obvious: everything starts RESTRICTED, carried
// weapons are raised to Basic, the role's magic school is raised to Basic,
// and only THEN does the role table set the maxima and lift anything still
// restricted to Unskilled. A skill the role does not list stays restricted.
export function skill_init(class_skill) {
    const sk = game.u.weapon_skills = [];
    for (let s = 0; s < P_NUM_SKILLS; s++)
        sk[s] = { skill: P_ISRESTRICTED, max: P_ISRESTRICTED, advance: 0 };

    /* every weapon in inventory becomes Basic; ammo waits for its launcher */
    for (const obj of game.invent || []) {
        if (is_ammo(obj))
            continue;
        const skill = weapon_type(obj);
        if (skill !== P_NONE)
            sk[skill].skill = P_BASIC;
    }

    /* magic */
    if (Role_if(PMNAMES.PM_HEALER) || Role_if(PMNAMES.PM_MONK)) {
        sk[P_HEALING_SPELL].skill = P_BASIC;
    } else if (Role_if(PMNAMES.PM_CLERIC)) {
        sk[P_CLERIC_SPELL].skill = P_BASIC;
    } else if (Role_if(PMNAMES.PM_WIZARD)) {
        sk[P_ATTACK_SPELL].skill = P_BASIC;
        sk[P_ENCHANTMENT_SPELL].skill = P_BASIC;
    }

    /* the role's table sets the maxima, and lifts anything still restricted */
    for (const row of class_skill || []) {
        const [skill, skmax] = row;
        if (skill === P_NONE)
            break;
        sk[skill].max = skmax;
        if (sk[skill].skill === P_ISRESTRICTED)
            sk[skill].skill = P_UNSKILLED;
    }

    /* high-potential fighters already know how to use their hands */
    if (sk[P_BARE_HANDED_COMBAT].max > P_EXPERT)
        sk[P_BARE_HANDED_COMBAT].skill = P_BASIC;

    /* roles that start with a horse know how to ride it */
    if (game.urole.petnum === PMNAMES.PM_PONY)
        sk[P_RIDING].skill = P_BASIC;

    for (let s = 0; s < P_NUM_SKILLS; s++)
        if (sk[s].skill !== P_ISRESTRICTED)
            sk[s].advance = practice_needed_to_advance(sk[s].skill - 1);

    /* the role's special spell is always at least unskilled */
    unrestrict_weapon_skill(spell_skilltype(game.urole.spelspec));

    if (!game.u.uroleplay?.pauper)  /* paupers lack advanced book access */
        skill_based_spellbook_id();
}

// src/weapon.c unrestrict_weapon_skill() — lift a restriction to Unskilled.
// Draws nothing; it is pure state, and it is what lets a role cast its own
// special spell at all.
export function unrestrict_weapon_skill(skill) {
    const sk = game.u.weapon_skills;
    if (skill < P_NUM_SKILLS && sk[skill].skill === P_ISRESTRICTED) {
        sk[skill].skill = P_UNSKILLED;
        sk[skill].max = P_BASIC;
        sk[skill].advance = 0;
    }
}

// src/spell.c:864 skill_based_spellbook_id() — a Wizard starts already
// knowing the low-level spellbooks its skills cover.
//
// Draws nothing. Wizards only; every other role returns immediately, which is
// why this was reachable in 100% of games while mattering in a fraction of
// them. discover_object is called with mark_as_known but NOT as encountered,
// which is C's own distinction: the book is identified without being treated
// as seen.
function skill_based_spellbook_id() {
    if (!Role_if(PMNAMES.PM_WIZARD))
        return;

    const first = game.bases[OCLASSES.SPBOOK_CLASS];
    const last = game.bases[OCLASSES.SPBOOK_CLASS + 1];

    for (let booktype = first; booktype < last; booktype++) {
        const skill = spell_skilltype(booktype);
        if (skill === P_NONE)
            continue;

        let known_up_to_level;
        switch (game.u.weapon_skills[skill].skill) {
        case P_BASIC:   known_up_to_level = 3; break;
        case P_SKILLED: known_up_to_level = 5; break;
        case P_EXPERT:
        case P_MASTER:
        case P_GRAND_MASTER:
            known_up_to_level = 7; break;
        case P_UNSKILLED:
        default:
            /* paupers need more skill than this to ID books, but most
               wizards know the basics */
            known_up_to_level = game.u.uroleplay?.pauper ? 0 : 1;
            break;
        }

        if (game.objects[booktype].oc_level <= known_up_to_level)
            /* makeknown(booktype) but don't exercise Wisdom or mark as
               encountered */
            discover_object(booktype, true, false, false);
    }
}

// src/role.c Role_if()
const Role_if = (pm) => game.urole?.malenum === pm || game.urole?.pmidx === pm;

function note_unported_weapon(what) {
    (game.unported ||= new Set()).add(what);
}

/* AKLYS_LIM comes from js/const.js; the table stores its SQUARE because the
   caller compares against dist2. */

/* src/weapon.c:514 arwep[] — the throw-and-return weapons. BOOMERANG is
   commented out in the C and is left out here for the same reason. */
const arwep = [
    { otyp: ONAMES.AKLYS, range: AKLYS_LIM * AKLYS_LIM, retmult: 1 },
];

// src/weapon.c:520 autoreturn_weapon()
export function autoreturn_weapon(otmp) {
    for (const a of arwep)
        if (otmp.otyp === a.otyp)
            return a;
    return null;
}

// src/weapon.c:950 abon() — the hero's to-hit bonus from Str and Dex.
//
// No draws; pure arithmetic, so its correctness is checked by value rather
// than by the scoreboard. The Upolyd arm needs adj_lev and is recorded.
//
// Note the two comments C keeps here, both of which change the numbers: the
// Str test is `< STR18(50)` rather than `<=`, so exactly 18/50 gives a bonus
// of 2, and a hero below experience level 3 gets a flat +1 to make early
// hitting easier.
export function abon() {
    const str = ACURR(A_STR), dex = ACURR(A_DEX);
    let sbon;

    if (game.u.umonnum !== undefined && game.u.umonnum !== game.u.umonster) {
        note_unported_weapon('abon:Upolyd');
        return 0;
    }

    if (str < 6)                 sbon = -2;
    else if (str < 8)            sbon = -1;
    else if (str < 17)           sbon = 0;
    else if (str < STR18(50))    sbon = 1;      /* up to 18/49 */
    else if (str < STR18(100))   sbon = 2;
    else                         sbon = 3;

    /* Game tuning kludge: make it a bit easier for a low level character */
    sbon += (game.u.ulevel < 3) ? 1 : 0;

    if (dex < 4)        return sbon - 3;
    else if (dex < 6)   return sbon - 2;
    else if (dex < 8)   return sbon - 1;
    else if (dex < 14)  return sbon;
    else                return sbon + dex - 14;
}
