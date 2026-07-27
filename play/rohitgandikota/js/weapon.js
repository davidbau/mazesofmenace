// weapon.js — weapon and skill handling.
// C ref: src/weapon.c
//
// Only skill_init() and its two helpers so far. Nothing here draws, but the
// skill array it builds is read by percent_success() (src/spell.c:2173), whose
// result decides the rnd(100) comparison in spelleffects_check(). Without the
// array that comparison has no input at all.

import { game } from './gstate.js';
import { is_ammo } from './obj.js';
import { STR18, WT_IRON_BALL_INCR } from './const.js';
import { MONSYMS } from './monst_data.js';
import { mon_hates_blessings, thick_skinned, passes_walls,
         is_swimmer } from './mondata.js';
import { is_spear } from './u_init.js';
import { is_pool, is_pick } from './mon.js';
import { is_weptool } from './mkobj.js';
import { ACURR } from './attrib.js';
import { A_STR, A_DEX } from './const.js';
import { AKLYS_LIM } from './const.js';
import { ONAMES, OCLASSES, MATERIALS } from './objects_data.js';
import { bigmonst } from './mondata.js';
import { rnd, d } from './rng.js';
import { spell_skilltype } from './spell.js';
import { discover_object } from './o_init.js';
import {
    P_NONE, P_NUM_SKILLS, P_ISRESTRICTED, P_UNSKILLED, P_BASIC, P_EXPERT,
    P_BARE_HANDED_COMBAT, P_RIDING, P_HEALING_SPELL, P_CLERIC_SPELL,
    P_TWO_WEAPON_COMBAT, P_LAST_WEAPON, P_SKILLED, P_MASTER, P_GRAND_MASTER,
    P_ATTACK_SPELL, P_ENCHANTMENT_SPELL, P_BOW, P_CROSSBOW,
} from './const.js';
import { PMNAMES } from './monst_data.js';

// include/skills.h:106 practice_needed_to_advance()
const practice_needed_to_advance = (level) => level * level * 20;

// include/obj.h:238 is_ammo() — the launcher-fired classes. Ammo alone does
// not confer skill; skill_init waits until it sees the launcher.
/* is_ammo() is include/obj.h:238; it comes from js/obj.js. */

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

/* src/weapon.c:71 kebabable[] — the monster classes a spear skewers. */
const kebabable = [MONSYMS.S_XORN, MONSYMS.S_DRAGON, MONSYMS.S_JABBERWOCK,
                   MONSYMS.S_NAGA, MONSYMS.S_GIANT];

// src/weapon.c:149 hitval() — a weapon's to-hit bonus against a given monster.
//
// Draws nothing. Note that otmp->spe is added ONLY for a weapon or weptool,
// while oc_hitbon applies to anything, so an enchanted non-weapon does not
// gain its enchantment as to-hit.
export function hitval(otmp, mon) {
    let tmp = 0;
    const ptr = game.mons[mon.mnum];
    const Is_weapon = (otmp.oclass === OCLASSES.WEAPON_CLASS
                       || is_weptool(otmp, game.objects));

    if (Is_weapon)
        tmp += otmp.spe || 0;

    /* weapon-specific "to hit" bonus */
    tmp += game.objects[otmp.otyp].oc_hitbon;

    /* blessed weapons used against undead or demons */
    if (Is_weapon && otmp.blessed && mon_hates_blessings(mon))
        tmp += 2;

    if (is_spear(otmp) && kebabable.includes(ptr.mlet))
        tmp += 2;

    /* trident is highly effective against swimmers */
    if (otmp.otyp === ONAMES.TRIDENT && is_swimmer(ptr)) {
        if (is_pool(mon.mx, mon.my))
            tmp += 4;
        else if (ptr.mlet === MONSYMS.S_EEL || ptr.mlet === MONSYMS.S_SNAKE)
            tmp += 2;
    }

    /* picks used against xorns and earth elementals */
    if (is_pick(otmp) && passes_walls(ptr) && thick_skinned(ptr))
        tmp += 2;

    if (otmp.oartifact)
        note_unported_weapon('hitval:spec_abon');

    return tmp;
}

// include/skills.h:81 martial_bonus() — a Samurai's or Monk's martial arts.
const martial_bonus = () =>
    Role_if(PMNAMES.PM_SAMURAI) || Role_if(PMNAMES.PM_MONK);

// src/weapon.c:1545 weapon_hit_bonus() — the to-hit adjustment from the
// hero's SKILL with the weapon being used.
//
// Draws nothing. Three separate tables, and the two-weapon one is all
// NEGATIVE: fighting with two weapons is a penalty at every skill level, from
// -9 unskilled to -3 expert, so it is not a mirror of the one-weapon table.
//
// The bare-handed arm is arithmetic rather than a table:
//     bonus = max(P_SKILL, P_UNSKILLED) - 1     unskilled becomes 0
//     bonus = ((bonus + 2) * (martial ? 2 : 1)) / 2
// which yields the +1..+3 / +3..+7 spread C documents in its comment.
export function weapon_hit_bonus(weapon) {
    let bonus = 0;
    const sk = game.u.weapon_skills;
    const P_SKILL = (t) => sk[t].skill;

    const wep_type = weapon_type(weapon);
    /* use two-weapon skill only if attacking with one of the wielded weapons */
    const type = (game.u.twoweap
                  && (weapon === game.u.uwep || weapon === game.u.uswapwep))
                 ? P_TWO_WEAPON_COMBAT : wep_type;

    if (type === P_NONE) {
        bonus = 0;
    } else if (type <= P_LAST_WEAPON) {
        switch (P_SKILL(type)) {
        case P_ISRESTRICTED:
        case P_UNSKILLED: bonus = -4; break;
        case P_BASIC:     bonus = 0;  break;
        case P_SKILLED:   bonus = 2;  break;
        case P_EXPERT:    bonus = 3;  break;
        default:          bonus = -4; break;   /* impossible() in C */
        }
    } else if (type === P_TWO_WEAPON_COMBAT) {
        let skill = P_SKILL(P_TWO_WEAPON_COMBAT);
        if (P_SKILL(wep_type) < skill)
            skill = P_SKILL(wep_type);
        switch (skill) {
        case P_ISRESTRICTED:
        case P_UNSKILLED: bonus = -9; break;
        case P_BASIC:     bonus = -7; break;
        case P_SKILLED:   bonus = -5; break;
        case P_EXPERT:    bonus = -3; break;
        default:          bonus = -9; break;   /* impossible() in C */
        }
    } else if (type === P_BARE_HANDED_COMBAT) {
        bonus = P_SKILL(type);
        bonus = Math.max(bonus, P_UNSKILLED) - 1;   /* unskilled => 0 */
        bonus = Math.trunc(((bonus + 2) * (martial_bonus() ? 2 : 1)) / 2);
    }

    /* KMH -- It's harder to hit while you are riding */
    if (game.u.usteed) {
        switch (P_SKILL(P_RIDING)) {
        case P_ISRESTRICTED:
        case P_UNSKILLED: bonus -= 2; break;
        case P_BASIC:     bonus -= 1; break;
        default: break;                         /* skilled and expert: none */
        }
        if (game.u.twoweap)
            bonus -= 2;
    }

    return bonus;
}

// src/weapon.c:216 dmgval() — how much damage this object does to this
// monster, before strength, skill and artifact bonuses.
//
// The draws are the point, and there are a lot of them. Every one is
// conditional, and the conditions are not interchangeable:
//
//   CREAM_PIE returns 0 with NO draw at all, before anything else.
//   The base roll splits on bigmonst(ptr) into TWO tables: rnd(oc_wldam)
//   for large monsters, rnd(oc_wsdam) for small. Both are guarded by the
//   field being nonzero, so a weapon with a 0 entry draws nothing.
//   Each table then has its own switch of per-weapon bonuses, several of
//   which draw AGAIN: rnd(4), rnd(6), d(2,4), d(2,6).
//
// The two switches are NOT the same weapon lists. MORNING_STAR is a +1 on
// the large table and an rnd(4) on the small one; TRIDENT is d(2,4) large
// and +1 small. Deriving one from the other is wrong in both directions.
//
// This table is transcribed from the 5.0 source. SILVER_MACE, PARTISAN and
// RUNESWORD are in it and are not 3.6 entries.
export function dmgval(otmp, mon) {
    let tmp = 0;
    const otyp = otmp.otyp;
    const ptr = game.mons[mon.mnum];
    const Is_weapon = (otmp.oclass === OCLASSES.WEAPON_CLASS
                       || is_weptool(otmp, game.objects));

    if (otyp === ONAMES.CREAM_PIE)
        return 0;

    const O = ONAMES, oc = game.objects[otyp];

    if (bigmonst(ptr)) {
        if (oc.oc_wldam)
            tmp = rnd(oc.oc_wldam);
        switch (otyp) {
        case O.IRON_CHAIN: case O.CROSSBOW_BOLT: case O.MORNING_STAR:
        case O.PARTISAN: case O.RUNESWORD: case O.ELVEN_BROADSWORD:
        case O.BROADSWORD:
            tmp++;
            break;
        case O.FLAIL: case O.RANSEUR: case O.VOULGE:
            tmp += rnd(4);
            break;
        case O.ACID_VENOM: case O.HALBERD: case O.SPETUM:
            tmp += rnd(6);
            break;
        case O.BATTLE_AXE: case O.BARDICHE: case O.TRIDENT:
            tmp += d(2, 4);
            break;
        case O.TSURUGI: case O.DWARVISH_MATTOCK: case O.TWO_HANDED_SWORD:
            tmp += d(2, 6);
            break;
        }
    } else {
        if (oc.oc_wsdam)
            tmp = rnd(oc.oc_wsdam);
        switch (otyp) {
        case O.IRON_CHAIN: case O.CROSSBOW_BOLT: case O.MACE:
        case O.SILVER_MACE: case O.WAR_HAMMER: case O.FLAIL:
        case O.SPETUM: case O.TRIDENT:
            tmp++;
            break;
        case O.BATTLE_AXE: case O.BARDICHE: case O.BILL_GUISARME:
        case O.GUISARME: case O.LUCERN_HAMMER: case O.MORNING_STAR:
        case O.RANSEUR: case O.BROADSWORD: case O.ELVEN_BROADSWORD:
        case O.RUNESWORD: case O.VOULGE:
            tmp += rnd(4);
            break;
        case O.ACID_VENOM:
            tmp += rnd(6);
            break;
        }
    }
    if (Is_weapon) {
        tmp += otmp.spe;
        /* negative enchantment mustn't produce negative damage */
        if (tmp < 0)
            tmp = 0;
    }

    if (oc.oc_material <= MATERIALS.LEATHER && thick_skinned(ptr))
        /* thick-skinned or scaled creatures don't feel it */
        tmp = 0;
    if (ptr === game.mons[PMNAMES.PM_SHADE] && !note_dmgval_unported('shade_glare'))
        tmp = 0;

    /* "very heavy iron ball"; weight increase is in increments */
    if (otyp === O.HEAVY_IRON_BALL && tmp > 0) {
        let wt = game.objects[O.HEAVY_IRON_BALL].oc_weight;

        if (otmp.owt > wt) {
            wt = ((otmp.owt - wt) / WT_IRON_BALL_INCR) | 0;
            tmp += rnd(4 * wt);
            if (tmp > 25)
                tmp = 25;       /* objects[].oc_wldam */
        }
    }

    /* Put weapon vs. monster type damage bonuses in below: */
    if (Is_weapon || otmp.oclass === OCLASSES.GEM_CLASS
        || otmp.oclass === OCLASSES.BALL_CLASS
        || otmp.oclass === OCLASSES.CHAIN_CLASS) {
        let bonus = 0;

        if (otmp.blessed && mon_hates_blessings(mon))
            bonus += rnd(4);
        if (note_dmgval_unported('is_axe') && note_dmgval_unported('is_wooden'))
            bonus += rnd(4);
        if (oc.oc_material === MATERIALS.SILVER
            && note_dmgval_unported('mon_hates_silver'))
            bonus += rnd(20);
        if (note_dmgval_unported('artifact_light') && otmp.lamplit
            && note_dmgval_unported('hates_light'))
            bonus += rnd(8);

        /* if the weapon is going to get a double damage bonus, adjust this
           bonus so that effectively it's added after the doubling */
        if (bonus > 1 && otmp.oartifact
            && note_dmgval_unported('spec_dbon') >= 25)
            bonus = ((bonus + 1) / 2) | 0;

        tmp += bonus;
    }

    if (tmp > 0) {
        tmp -= note_dmgval_unported('greatest_erosion') ? 1 : 0;
        if (tmp < 1)
            tmp = 1;
    }

    return tmp;
}

// include/weight.h:18 WT_IRON_BALL_INCR — verified against the header, not
// recalled: the value was written from memory first and then checked.

// Predicates dmgval needs that are not ported. Each returns 0/false and is
// recorded by name, so game.unported says which one a divergence wanted.
function note_dmgval_unported(what) {
    (game.unported ||= new Set()).add('weapon:dmgval:' + what);
    return 0;
}
