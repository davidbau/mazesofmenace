// weapon.js — weapon and skill handling.
// C ref: src/weapon.c
//
// Only skill_init() and its two helpers so far. Nothing here draws, but the
// skill array it builds is read by percent_success() (src/spell.c:2173), whose
// result decides the rnd(100) comparison in spelleffects_check(). Without the
// array that comparison has no input at all.

import { game } from './gstate.js';
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

    /* unrestrict_weapon_skill(spell_skilltype(urole.spelspec)) and
       skill_based_spellbook_id() still to come; neither draws. */
    note_unported_weapon('skill_init:unrestrict + spellbook_id');
}

// src/role.c Role_if()
const Role_if = (pm) => game.urole?.malenum === pm || game.urole?.pmidx === pm;

function note_unported_weapon(what) {
    (game.unported ||= new Set()).add(what);
}
