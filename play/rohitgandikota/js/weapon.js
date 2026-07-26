// weapon.js — weapon and skill handling.
// C ref: src/weapon.c
//
// Only skill_init() and its two helpers so far. Nothing here draws, but the
// skill array it builds is read by percent_success() (src/spell.c:2173), whose
// result decides the rnd(100) comparison in spelleffects_check(). Without the
// array that comparison has no input at all.

import { game } from './gstate.js';
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
