// weapon.js — weapon skills.
// C ref: weapon.c
//
// Ported so far: skill_init(), weapon_type(), unrestrict_weapon_skill(),
// the P_SKILL()/P_MAX_SKILL()/P_ADVANCE()/P_RESTRICTED() accessors
// (skills.h) and practice_needed_to_advance().
//
// u.weapon_skills[] (you.h) lives on game.u.weapon_skills.

import { game } from './gstate.js';
import {
    P_NONE, P_NUM_SKILLS, P_ISRESTRICTED, P_UNSKILLED, P_BASIC, P_EXPERT,
    P_HEALING_SPELL, P_CLERIC_SPELL, P_ATTACK_SPELL, P_ENCHANTMENT_SPELL,
    P_BARE_HANDED_COMBAT, P_RIDING, P_CROSSBOW, P_BOW,
} from './const.js';
import { objects, WEAPON_CLASS, TOOL_CLASS, GEM_CLASS } from './objects.js';
import * as M from './monsters.js';
import { spell_skilltype, skill_based_spellbook_id } from './spell.js';

function impossible(msg) { console.error(`impossible: ${msg}`); }

function weapon_skills() {
    const u = game.u;
    if (!u.weapon_skills) {
        u.weapon_skills = [];
        for (let i = 0; i < P_NUM_SKILLS; i++)
            u.weapon_skills.push({ skill: P_ISRESTRICTED, max_skill: P_ISRESTRICTED,
                                   advance: 0 });
    }
    return u.weapon_skills;
}

/* C ref: skills.h P_SKILL(), P_MAX_SKILL(), P_ADVANCE(), P_RESTRICTED() */
export function P_SKILL(type) { return weapon_skills()[type].skill; }
export function P_MAX_SKILL(type) { return weapon_skills()[type].max_skill; }
export function P_ADVANCE(type) { return weapon_skills()[type].advance; }
export function P_RESTRICTED(type) {
    return weapon_skills()[type].skill === P_ISRESTRICTED;
}
function set_P_SKILL(type, v) { weapon_skills()[type].skill = v; }
function set_P_MAX_SKILL(type, v) { weapon_skills()[type].max_skill = v; }
function set_P_ADVANCE(type, v) { weapon_skills()[type].advance = v; }

/* C ref: skills.h practice_needed_to_advance() */
export function practice_needed_to_advance(level) { return level * level * 20; }

/* C ref: obj.h is_ammo() */
function is_ammo(otmp) {
    return ((otmp.oclass === WEAPON_CLASS || otmp.oclass === GEM_CLASS)
            && objects[otmp.otyp].oc_skill >= -P_CROSSBOW
            && objects[otmp.otyp].oc_skill <= -P_BOW);
}

// C ref: weapon.c unrestrict_weapon_skill()
export function unrestrict_weapon_skill(skill) {
    if (skill < P_NUM_SKILLS && P_RESTRICTED(skill)) {
        set_P_SKILL(skill, P_UNSKILLED);
        set_P_MAX_SKILL(skill, P_BASIC);
        set_P_ADVANCE(skill, 0);
    }
}

// C ref: weapon.c weapon_type()
export function weapon_type(obj) {
    /* KMH -- now uses the object table */
    let type;

    if (!obj)
        return P_BARE_HANDED_COMBAT; /* Not using a weapon */
    if (obj.oclass !== WEAPON_CLASS && obj.oclass !== TOOL_CLASS
        && obj.oclass !== GEM_CLASS)
        return P_NONE; /* Not a weapon, weapon-tool, or ammo */
    type = objects[obj.otyp].oc_skill;
    return (type < 0) ? -type : type;
}

// C ref: weapon.c skill_init()
/*
 * Initialize weapon skill array for the game.  Start by setting all
 * skills to restricted, then set the skill for every weapon the
 * hero is holding, finally reading the given array that sets
 * maximums.
 */
export function skill_init(class_skill) {
    let obj;
    let skmax, skill;

    /* initialize skill array; by default, everything is restricted */
    for (skill = 0; skill < P_NUM_SKILLS; skill++) {
        set_P_SKILL(skill, P_ISRESTRICTED);
        set_P_MAX_SKILL(skill, P_ISRESTRICTED);
        set_P_ADVANCE(skill, 0);
    }

    /* Set skill for all weapons in inventory to be basic */
    for (obj = game.invent; obj; obj = obj.nobj) {
        /* don't give skill just because of carried ammo, wait until
           we see the relevant launcher (prevents an archeologist's
           touchstone from inadvertently providing skill in sling) */
        if (is_ammo(obj))
            continue;

        skill = weapon_type(obj);
        if (skill !== P_NONE)
            set_P_SKILL(skill, P_BASIC);
    }

    /* set skills for magic */
    const role = game.urole.mnum;
    if (role === M.PM_HEALER || role === M.PM_MONK) {
        set_P_SKILL(P_HEALING_SPELL, P_BASIC);
    } else if (role === M.PM_CLERIC) {
        set_P_SKILL(P_CLERIC_SPELL, P_BASIC);
    } else if (role === M.PM_WIZARD) {
        set_P_SKILL(P_ATTACK_SPELL, P_BASIC);
        set_P_SKILL(P_ENCHANTMENT_SPELL, P_BASIC);
    }

    /* walk through array to set skill maximums */
    for (let i = 0; class_skill[i].skill !== P_NONE; i++) {
        skmax = class_skill[i].skmax;
        skill = class_skill[i].skill;

        set_P_MAX_SKILL(skill, skmax);
        if (P_SKILL(skill) === P_ISRESTRICTED) /* skill pre-set */
            set_P_SKILL(skill, P_UNSKILLED);
    }

    /* High potential fighters already know how to use their hands. */
    if (P_MAX_SKILL(P_BARE_HANDED_COMBAT) > P_EXPERT)
        set_P_SKILL(P_BARE_HANDED_COMBAT, P_BASIC);

    /* Roles that start with a horse know how to ride it */
    if (game.urole.petnum === M.PM_PONY)
        set_P_SKILL(P_RIDING, P_BASIC);

    /*
     * Make sure we haven't missed setting the max on a skill
     * & set advance
     */
    for (skill = 0; skill < P_NUM_SKILLS; skill++) {
        if (!P_RESTRICTED(skill)) {
            if (P_MAX_SKILL(skill) < P_SKILL(skill)) {
                impossible(`skill_init: curr > max: ${skill}`);
                set_P_MAX_SKILL(skill, P_SKILL(skill));
            }
            set_P_ADVANCE(skill, practice_needed_to_advance(P_SKILL(skill) - 1));
        }
    }

    /* each role has a special spell; allow at least basic for its type
       (despite the function name, this works for spell skills too) */
    unrestrict_weapon_skill(spell_skilltype(game.urole.spelspec));

    if (!game.u.uroleplay?.pauper) /* paupers lack advanced access to books */
        skill_based_spellbook_id();
}
