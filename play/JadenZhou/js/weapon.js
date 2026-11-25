// weapon.js — weapon skills.
// C ref: weapon.c
//
// Ported so far: skill_init(), weapon_type(), unrestrict_weapon_skill(),
// the P_SKILL()/P_MAX_SKILL()/P_ADVANCE()/P_RESTRICTED() accessors
// (skills.h) and practice_needed_to_advance().
//
// u.weapon_skills[] (you.h) lives on game.u.weapon_skills.

import { MON_WEP } from './worn.js';
import { impossible } from './hack.js';
import { is_art } from './artifact.js';
import { minv } from './mon.js';
import { padr } from './pager.js';
import { wizard } from './dungeon.js';
import { game } from './gstate.js';
import { rn2, rnd, d } from './rng.js';
import {
    P_NONE, P_NUM_SKILLS, P_ISRESTRICTED, P_UNSKILLED, P_BASIC, P_EXPERT,
    P_HEALING_SPELL, P_CLERIC_SPELL, P_ATTACK_SPELL, P_ENCHANTMENT_SPELL,
    P_BARE_HANDED_COMBAT, P_RIDING, P_CROSSBOW, P_BOW, P_SLING, P_SPEAR,
    P_AXE, P_PICK_AXE, NO_WEAPON_WANTED, NEED_WEAPON, NEED_RANGED_WEAPON,
    NEED_HTH_WEAPON, NEED_PICK_AXE, NEED_AXE, NEED_PICK_OR_AXE, AKLYS_LIM,
    WT_IRON_BALL_INCR, STONE_RES, NON_PM, W_ARM, W_ARMS, W_ARMG, W_WEP,
    W_ARMC, W_ARMU, W_RINGL, W_RINGR, P_SKILLED, P_LAST_WEAPON, P_LAST_SPELL,
    P_TWO_WEAPON_COMBAT, A_STR, A_DEX, STR18, TIP_ENHANCE,
} from './const.js';
import { objects, WEAPON_CLASS, TOOL_CLASS, GEM_CLASS } from './objects.js';
import * as O from './objects.js';
import * as M from './monsters.js';
import { spell_skilltype, skill_based_spellbook_id } from './spell.js';
import { ART_SUNSWORD, ART_SNICKERSNEE } from './artilist.js';
import { touch_artifact_mon, spec_abon, spec_dbon, shade_glare } from './artifact.js';
import { is_weptool } from './mkobj.js';
import { is_pool } from './makemon.js';
import { is_swimmer, passes_walls, is_undead, is_demon, is_were,
         is_vampshifter, Resists_Elem } from './mondata.js';
import { dist2 } from './hacklib.js';
import { couldsee } from './vision.js';
import { pline } from './display.js';
import { canseemon } from './display.js';
import { Monnam } from './do_name.js';
import { doname } from './objnam.js';
import { which_armor } from './worn.js';
import { mon_hates_silver, mon_hates_blessings } from './mondata.js';
import { ACURR } from './attrib.js';
import { adj_lev } from './makemon.js';
import { handle_tip } from './hack.js';
import { can_advance, P_NAME, skill_level_name, slots_required } from './insight.js';
import { NO_COLOR, ATR_NONE } from './terminal.js';
import { tty_create_nhwindow, tty_start_menu, tty_add_menu, add_menu_str,
         tty_end_menu, tty_select_menu, tty_destroy_nhwindow,
         tty_yn_function } from './wintty.js';
import { add_menu_heading } from './invent.js';
import { P_SKILL_LIMIT, P_FIRST_SPELL, P_FIRST_H_TO_H, P_LAST_H_TO_H,
         P_FIRST_WEAPON, NHW_MENU, MENU_BEHAVE_STANDARD, PICK_NONE, PICK_ONE,
         MAXULEV, MENU_ITEMFLAGS_NONE, ECMD_OK } from './const.js';
import { Upolyd, Role_if } from './const.js';
import { mbodypart as mbodypart_wp } from './insight.js';
import { HAND as HAND_WP } from './const.js';
import { makeplural as makeplural_wp, otense as otense_wp, xname as xname_wp,
         Yname2 as Yname2_wp, Tobjnam as Tobjnam_wp } from './objnam.js';
import { mhis as mhis_wp } from './mhitu.js';
import { s_suffix as s_suffix_wp } from './hacklib.js';
import { mon_nam as mon_nam_wp } from './do_name.js';
import { bimanual as bimanual_wp } from './wield.js';
import { the as the_wp } from './iactions.js';

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

// ── Monster weapons ──
// C ref: weapon.c hitval(), dmgval(), oselect(), select_rwep(),
// select_hwep(), possibly_unwield(), mon_wield_item(), mwepgone(),
// setmnotwielded(), autoreturn_weapon(); wield.c mwelded();
// mthrowu.c m_carrying().

/* monst.h MON_WEP(), MON_NOWEP() */
function MON_NOWEP(mon) { mon.mw = null; }

/* C ref: decl.c hands_obj -- "weapon" meaning bare hands (no propellor) */
export const hands_obj = { otyp: O.STRANGE_OBJECT, oclass: 0, hands_obj: true };
/* C ref: decl.h gp.propellor -- set by select_rwep() */
export function propellor() { return game.propellor ?? null; }
function set_propellor(p) { game.propellor = p; }

/* mondata.h */
function strongmonst(ptr) { return (ptr.mflags2 & M.M2_STRONG) !== 0; }
function is_giant(ptr) { return (ptr.mflags2 & M.M2_GIANT) !== 0; }
function throws_rocks(ptr) { return (ptr.mflags2 & M.M2_ROCKTHROW) !== 0; }
function likes_gems(ptr) { return (ptr.mflags2 & M.M2_JEWELS) !== 0; }
function mindless(ptr) { return (ptr.mflags1 & M.M1_MINDLESS) !== 0; }
function is_animal(ptr) { return (ptr.mflags1 & M.M1_ANIMAL) !== 0; }
function thick_skinned(ptr) { return (ptr.mflags1 & M.M1_THICK_HIDE) !== 0; }
function bigmonst(ptr) { return ptr.msize >= M.MZ_LARGE; }
function is_wooden(ptr) { return ptr === M.mons[M.PM_WOOD_GOLEM]; }
function hates_light(ptr) { return ptr === M.mons[M.PM_GREMLIN]; }
function is_covetous(ptr) { return (ptr.mflags3 & M.M3_COVETOUS) !== 0; }
function is_rider(ptr) {
    return ptr === M.mons[M.PM_DEATH] || ptr === M.mons[M.PM_FAMINE]
        || ptr === M.mons[M.PM_PESTILENCE];
}
function touch_petrifies(ptr) {
    return ptr === M.mons[M.PM_COCKATRICE] || ptr === M.mons[M.PM_CHICKATRICE];
}
// C ref: mondata.c attacktype()
function attacktype(ptr, atyp) {
    return ptr.mattk.some((a) => a.aatyp === atyp);
}
/* C ref: monst.h resists_ston() */
function resists_ston(mon) { return Resists_Elem(mon, STONE_RES); }

/* obj.h */
function is_spear(otmp) {
    return otmp.oclass === WEAPON_CLASS && objects[otmp.otyp].oc_skill === P_SPEAR;
}
function is_axe(otmp) {
    return (otmp.oclass === WEAPON_CLASS || otmp.oclass === TOOL_CLASS)
           && objects[otmp.otyp].oc_skill === P_AXE;
}
function is_pick(otmp) {
    return (otmp.oclass === WEAPON_CLASS || otmp.oclass === TOOL_CLASS)
           && objects[otmp.otyp].oc_skill === P_PICK_AXE;
}
function greatest_erosion(otmp) {
    const e1 = otmp.oeroded || 0, e2 = otmp.oeroded2 || 0;
    return e1 > e2 ? e1 : e2;
}
/* C ref: wield.c erodeable_wep(), will_weld() */
function erodeable_wep(optr) {
    return optr.oclass === WEAPON_CLASS || is_weptool(optr)
        || optr.otyp === O.HEAVY_IRON_BALL || optr.otyp === O.IRON_CHAIN;
}
function will_weld(optr) {
    return !!optr.cursed && (erodeable_wep(optr) || optr.otyp === O.TIN_OPENER);
}
// C ref: artifact.c artifact_light()
function artifact_light(obj) {
    if (obj && (obj.otyp === O.GOLD_DRAGON_SCALE_MAIL
                || obj.otyp === O.GOLD_DRAGON_SCALES)
        && ((obj.owornmask || 0) & W_ARM) !== 0)
        return true;
    return !!(obj && obj.oartifact) && is_art(obj, ART_SUNSWORD);
}

/* targets that provide attacker with small to-hit bonus when using a spear */
const kebabable = [M.S_XORN, M.S_DRAGON, M.S_JABBERWOCK, M.S_NAGA, M.S_GIANT];

// C ref: wield.c mwelded()
/* test whether monster's wielded weapon is stuck to hand/paw/whatever */
export function mwelded(obj) {
    /* caller is responsible for making sure this is a monster's item */
    if (obj && ((obj.owornmask || 0) & W_WEP) && will_weld(obj))
        return true;
    return false;
}

// C ref: weapon.c hitval()
/*
 *      hitval returns an integer representing the "to hit" bonuses
 *      of "otmp" against the monster.
 */
export function hitval(otmp, mon) {
    let tmp = 0;
    const ptr = mon.data;
    const Is_weapon = (otmp.oclass === WEAPON_CLASS || is_weptool(otmp));

    if (Is_weapon)
        tmp += (otmp.spe || 0);

    /* Put weapon-specific "to hit" bonuses in below: */
    tmp += objects[otmp.otyp].oc_hitbon;

    /* Put weapon vs. monster type "to hit" bonuses in below: */

    /* Blessed weapons used against undead or demons */
    if (Is_weapon && otmp.blessed && mon_hates_blessings(mon))
        tmp += 2;

    if (is_spear(otmp) && kebabable.includes(ptr.mlet))
        tmp += 2;

    /* trident is highly effective against swimmers */
    if (otmp.otyp === O.TRIDENT && is_swimmer(ptr)) {
        if (is_pool(mon.mx, mon.my))
            tmp += 4;
        else if (ptr.mlet === M.S_EEL || ptr.mlet === M.S_SNAKE)
            tmp += 2;
    }

    /* Picks used against xorns and earth elementals */
    if (is_pick(otmp) && (passes_walls(ptr) && thick_skinned(ptr)))
        tmp += 2;

    /* Check specially named weapon "to hit" bonuses */
    if (otmp.oartifact)
        tmp += spec_abon(otmp, mon);

    return tmp;
}

// C ref: weapon.c dmgval()
/*
 *      dmgval returns an integer representing the damage bonuses
 *      of "otmp" against the monster.
 */
export function dmgval(otmp, mon) {
    let tmp = 0;
    const otyp = otmp.otyp;
    const ptr = mon.data;
    const Is_weapon = (otmp.oclass === WEAPON_CLASS || is_weptool(otmp));

    if (otyp === O.CREAM_PIE)
        return 0;

    if (bigmonst(ptr)) {
        if (objects[otyp].oc_wldam)
            tmp = rnd(objects[otyp].oc_wldam);
        switch (otyp) {
        case O.IRON_CHAIN:
        case O.CROSSBOW_BOLT:
        case O.MORNING_STAR:
        case O.PARTISAN:
        case O.RUNESWORD:
        case O.ELVEN_BROADSWORD:
        case O.BROADSWORD:
            tmp++;
            break;

        case O.FLAIL:
        case O.RANSEUR:
        case O.VOULGE:
            tmp += rnd(4);
            break;

        case O.ACID_VENOM:
        case O.HALBERD:
        case O.SPETUM:
            tmp += rnd(6);
            break;

        case O.BATTLE_AXE:
        case O.BARDICHE:
        case O.TRIDENT:
            tmp += d(2, 4);
            break;

        case O.TSURUGI:
        case O.DWARVISH_MATTOCK:
        case O.TWO_HANDED_SWORD:
            tmp += d(2, 6);
            break;
        }
    } else {
        if (objects[otyp].oc_wsdam)
            tmp = rnd(objects[otyp].oc_wsdam);
        switch (otyp) {
        case O.IRON_CHAIN:
        case O.CROSSBOW_BOLT:
        case O.MACE:
        case O.SILVER_MACE:
        case O.WAR_HAMMER:
        case O.FLAIL:
        case O.SPETUM:
        case O.TRIDENT:
            tmp++;
            break;

        case O.BATTLE_AXE:
        case O.BARDICHE:
        case O.BILL_GUISARME:
        case O.GUISARME:
        case O.LUCERN_HAMMER:
        case O.MORNING_STAR:
        case O.RANSEUR:
        case O.BROADSWORD:
        case O.ELVEN_BROADSWORD:
        case O.RUNESWORD:
        case O.VOULGE:
            tmp += rnd(4);
            break;

        case O.ACID_VENOM:
            tmp += rnd(6);
            break;
        }
    }
    if (Is_weapon) {
        tmp += (otmp.spe || 0);
        /* negative enchantment mustn't produce negative damage */
        if (tmp < 0)
            tmp = 0;
    }

    if (objects[otyp].oc_material <= O.LEATHER && thick_skinned(ptr))
        /* thick-skinned or scaled creatures don't feel it */
        tmp = 0;
    if (ptr === M.mons[M.PM_SHADE] && !shade_glare(otmp))
        tmp = 0;

    /* "very heavy iron ball"; weight increase is in increments */
    if (otyp === O.HEAVY_IRON_BALL && tmp > 0) {
        let wt = objects[O.HEAVY_IRON_BALL].oc_weight;

        if (otmp.owt > wt) {
            wt = Math.trunc((otmp.owt - wt) / WT_IRON_BALL_INCR);
            tmp += rnd(4 * wt);
            if (tmp > 25)
                tmp = 25; /* objects[].oc_wldam */
        }
    }

    /* Put weapon vs. monster type damage bonuses in below: */
    if (Is_weapon || otmp.oclass === GEM_CLASS || otmp.oclass === O.BALL_CLASS
        || otmp.oclass === O.CHAIN_CLASS) {
        let bonus = 0;

        if (otmp.blessed && mon_hates_blessings(mon))
            bonus += rnd(4);
        if (is_axe(otmp) && is_wooden(ptr))
            bonus += rnd(4);
        if (objects[otyp].oc_material === O.SILVER && mon_hates_silver(mon))
            bonus += rnd(20);
        if (artifact_light(otmp) && otmp.lamplit && hates_light(ptr))
            bonus += rnd(8);

        /* if the weapon is going to get a double damage bonus, adjust
           this bonus so that effectively it's added after the doubling */
        if (bonus > 1 && otmp.oartifact && spec_dbon(otmp, mon, 25) >= 25)
            bonus = Math.trunc((bonus + 1) / 2);

        tmp += bonus;
    }

    if (tmp > 0) {
        /* It's debatable whether a rusted blunt instrument
           should do less damage than a pristine one, since
           it will hit with essentially the same impact, but
           there ought to some penalty for using damaged gear
           so always subtract erosion even for blunt weapons. */
        tmp -= greatest_erosion(otmp);
        if (tmp < 1)
            tmp = 1;
    }

    return tmp;
}

// C ref: weapon.c special_dmgval()
/* check whether blessed and/or silver damage applies for *non-weapon* hit;
   return value is the amount of the extra damage; silverhit_p.val gets
   the output flag mask for silver bonus */
export function special_dmgval(
    magr, /* attacker */
    mdef, /* defender */
    armask, /* armor mask, multiple bits accepted for
             * W_ARMC|W_ARM|W_ARMU or
             * W_ARMG|W_RINGL|W_RINGR only */
    silverhit_p) /* output flag mask for silver bonus */ {
    let obj;
    const left_ring = (armask & W_RINGL) ? true : false,
        right_ring = (armask & W_RINGR) ? true : false;
    let silverhit = 0;
    let bonus = 0;

    obj = null;
    if (armask & (W_ARMC | W_ARM | W_ARMU)) {
        if ((armask & W_ARMC) !== 0
            && (obj = which_armor(magr, W_ARMC)) != null)
            armask = W_ARMC;
        else if ((armask & W_ARM) !== 0
                 && (obj = which_armor(magr, W_ARM)) != null)
            armask = W_ARM;
        else if ((armask & W_ARMU) !== 0
                 && (obj = which_armor(magr, W_ARMU)) != null)
            armask = W_ARMU;
        else
            armask = 0;
    } else if (armask & (W_ARMG | W_RINGL | W_RINGR)) {
        armask = ((obj = which_armor(magr, W_ARMG)) != null) ? W_ARMG : 0;
    } else {
        obj = which_armor(magr, armask);
    }

    if (obj) {
        if (obj.blessed && mon_hates_blessings(mdef))
            bonus += rnd(4);
        /* the only silver armor is shield of reflection (silver dragon
           scales refer to color, not material) and the only way to hit
           with one--aside from throwing--is to wield it and perform a
           weapon hit, but we include a general check here */
        if (objects[obj.otyp].oc_material === O.SILVER
            && mon_hates_silver(mdef)) {
            bonus += rnd(20);
            silverhit |= armask;
        }

    /* when no gloves we check for silver rings (blessed rings ignored) */
    } else if ((left_ring || right_ring) && magr === game.youmonst) {
        if (left_ring && game.uleft) {
            if (objects[game.uleft.otyp].oc_material === O.SILVER
                && mon_hates_silver(mdef)) {
                bonus += rnd(20);
                silverhit |= W_RINGL;
            }
        }
        if (right_ring && game.uright) {
            if (objects[game.uright.otyp].oc_material === O.SILVER
                && mon_hates_silver(mdef)) {
                /* two silver rings don't give double silver damage
                   but 'silverhit' messages might be adjusted for them */
                if (!(silverhit & W_RINGL))
                    bonus += rnd(20);
                silverhit |= W_RINGR;
            }
        }
    }

    if (silverhit_p)
        silverhit_p.val = silverhit;
    return bonus;
}

// C ref: mon.c can_touch_safely()
function can_touch_safely(mtmp, otmp) {
    const otyp = otmp.otyp;
    const mdat = mtmp.data;

    if (otyp === O.CORPSE && touch_petrifies(M.mons[otmp.corpsenm])
        && !((mtmp.misc_worn_check || 0) & W_ARMG) && !resists_ston(mtmp))
        return false;
    if (otyp === O.CORPSE && is_rider(M.mons[otmp.corpsenm]))
        return false;
    if (objects[otyp].oc_material === O.SILVER && mon_hates_silver(mtmp)
        && (otyp !== O.BELL_OF_OPENING || !is_covetous(mdat)))
        return false;
    if (!touch_artifact_mon(otmp, mtmp))
        return false;
    return true;
}

// C ref: weapon.c oselect()
function oselect(mtmp, type) {
    for (const otmp of minv(mtmp)) {
        if (otmp.otyp !== type)
            continue;

        /* never select non-cockatrice corpses */
        if ((type === O.CORPSE || type === O.EGG)
            && (otmp.corpsenm === NON_PM
                || !touch_petrifies(M.mons[otmp.corpsenm])))
            continue;

        if (!can_touch_safely(mtmp, otmp))
            continue;

        return otmp;
    }
    return null;
}

// C ref: mthrowu.c m_carrying()
export function m_carrying(mtmp, type) {
    if (mtmp === game.youmonst) {
        for (let otmp = game.invent; otmp; otmp = otmp.nobj)
            if (otmp.otyp === type)
                return otmp;
        return null;
    }
    for (const otmp of minv(mtmp))
        if (otmp.otyp === type)
            return otmp;
    return null;
}

/* C ref: obj.h is_launcher(), is_ammo(), matching_launcher(),
   ammo_and_launcher() */
function is_launcher(otmp) {
    return otmp.oclass === WEAPON_CLASS && objects[otmp.otyp].oc_skill >= P_BOW
           && objects[otmp.otyp].oc_skill <= P_CROSSBOW;
}
function matching_launcher(a, l) {
    return !!l && objects[a.otyp].oc_skill === -objects[l.otyp].oc_skill;
}
function ammo_and_launcher(a, l) { return is_ammo(a) && matching_launcher(a, l); }

// C ref: mthrowu.c m_has_launcher_and_ammo()
/* TRUE iff mtmp is wielding a launcher and carrying matching ammo */
export function m_has_launcher_and_ammo(mtmp) {
    const mwep = MON_WEP(mtmp);

    if (mwep && is_launcher(mwep)) {
        for (const otmp of minv(mtmp))
            if (ammo_and_launcher(otmp, mwep))
                return true;
    }
    return false;
}

const rwep = [
    O.DWARVISH_SPEAR, O.SILVER_SPEAR, O.ELVEN_SPEAR, O.SPEAR, O.ORCISH_SPEAR,
    O.JAVELIN, O.SHURIKEN, O.YA, O.SILVER_ARROW, O.ELVEN_ARROW, O.ARROW,
    O.ORCISH_ARROW, O.CROSSBOW_BOLT, O.SILVER_DAGGER, O.ELVEN_DAGGER,
    O.DAGGER, O.ORCISH_DAGGER, O.KNIFE, O.FLINT, O.ROCK, O.LOADSTONE,
    O.LUCKSTONE, O.DART, O.CREAM_PIE,
];

// C ref: weapon.c monmightthrowwep()
/* is 'obj' a type of weapon that any monster knows how to throw? */
export function monmightthrowwep(obj) {
    for (let idx = 0; idx < rwep.length; ++idx)
        if (obj.otyp === rwep[idx])
            return true;
    return false;
}

/* polearms */
const pwep = [ O.HALBERD,       O.BARDICHE, O.SPETUM,
               O.BILL_GUISARME, O.VOULGE,   O.RANSEUR,
               O.GUISARME,      O.GLAIVE,   O.LUCERN_HAMMER,
               O.BEC_DE_CORBIN, O.FAUCHARD, O.PARTISAN,
               O.LANCE ];

/* throw-and-return weapons */
const arwep = [
    /* { BOOMERANG, 5, 0 }, */
    { otyp: O.AKLYS, range: AKLYS_LIM * AKLYS_LIM, tethered: 1 },
];

// C ref: weapon.c autoreturn_weapon()
export function autoreturn_weapon(otmp) {
    for (let i = 0; i < arwep.length; i++) {
        if (otmp.otyp === arwep[i].otyp)
            return arwep[i];
    }
    return null;
}

// C ref: weapon.c select_rwep()
/* select a ranged weapon for the monster */
export function select_rwep(mtmp) {
    let otmp;
    let mwep;
    let mweponly;
    let i;

    const mlet = mtmp.data.mlet;

    set_propellor(hands_obj);
    if ((otmp = oselect(mtmp, O.EGG)) != null) /* cockatrice egg */
        return otmp;
    if (mlet === M.S_KOP) /* pies are first choice for Kops */
        if ((otmp = oselect(mtmp, O.CREAM_PIE)) != null)
            return otmp;
    if (throws_rocks(mtmp.data)) /* ...boulders for giants */
        if ((otmp = oselect(mtmp, O.BOULDER)) != null)
            return otmp;

    /* Select polearms first; they do more damage and aren't expendable.
       But don't pick one if monster's weapon is welded, because then
       we'd never have a chance to throw non-wielding missiles. */
    /* The limit of 13 here is based on the monster polearm range limit
     * (defined as 5 in mthrowu.c).  5 corresponds to a distance of 2 in
     * one direction and 1 in another; one space beyond that would be 3 in
     * one direction and 2 in another; 3^2+2^2=13.
     */
    mwep = MON_WEP(mtmp);
    /* NO_WEAPON_WANTED means we already tried to wield and failed */
    mweponly = (mwelded(mwep) && mtmp.weapon_check === NO_WEAPON_WANTED);
    if (dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy) <= 13
        && couldsee(mtmp.mx, mtmp.my)) {
        if (is_art(mwep, ART_SNICKERSNEE)) {
            set_propellor(mwep);
            return mwep;
        }

        for (i = 0; i < pwep.length; i++) {
            /* Only strong monsters can wield big (esp. long) weapons.
             * Big weapon is basically the same as bimanual.
             * All monsters can wield the remaining weapons.
             */
            if (((strongmonst(mtmp.data)
                  && ((mtmp.misc_worn_check || 0) & W_ARMS) === 0)
                 || !objects[pwep[i]].oc_bimanual)
                && (objects[pwep[i]].oc_material !== O.SILVER
                    || !mon_hates_silver(mtmp))) {
                if ((otmp = oselect(mtmp, pwep[i])) != null
                    && (otmp === mwep || !mweponly)) {
                    set_propellor(otmp); /* force the monster to wield it */
                    return otmp;
                }
            }
        }
    }
    /* Next, try to select a throw-and-return weapon, since they are
     * also not as expendable. Again, don't pick one if monster's
     * weapon is welded.
     */
    for (i = 0; i < arwep.length; i++) {
        const arw = arwep[i];

        if (!mindless(mtmp.data) && !is_animal(mtmp.data) && !mweponly
            && dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy) <= arw.range
            && couldsee(mtmp.mx, mtmp.my)) {
            if ((((mtmp.misc_worn_check || 0) & W_ARMS) === 0
                 || !objects[arw.otyp].oc_bimanual)
                && (objects[arw.otyp].oc_material !== O.SILVER
                    || !mon_hates_silver(mtmp))) {
                if ((otmp = oselect(mtmp, arw.otyp)) != null
                    && (otmp === mwep || !mweponly)) {
                    set_propellor(otmp); /* force the monster to wield it */
                    return otmp;
                }
            }
        }
    }

    /*
     * other than the specific cases above, always select the
     * most potent ranged weapon to hand.
     */
    for (i = 0; i < rwep.length; i++) {
        let prop;

        /* shooting gems from slings; this goes just before the darts */
        /* (shooting rocks is already handled via the rwep[] ordering) */
        if (rwep[i] === O.DART && !likes_gems(mtmp.data)
            && m_carrying(mtmp, O.SLING)) { /* propellor */
            for (const o of minv(mtmp))
                if (o.oclass === GEM_CLASS
                    && (o.otyp !== O.LOADSTONE || !o.cursed)) {
                    set_propellor(m_carrying(mtmp, O.SLING));
                    return o;
                }
        }

        /* KMH -- This belongs here so darts will work */
        set_propellor(hands_obj);

        prop = objects[rwep[i]].oc_skill;
        if (prop < 0) {
            switch (-prop) {
            case P_BOW:
                set_propellor(oselect(mtmp, O.YUMI));
                if (!propellor())
                    set_propellor(oselect(mtmp, O.ELVEN_BOW));
                if (!propellor())
                    set_propellor(oselect(mtmp, O.BOW));
                if (!propellor())
                    set_propellor(oselect(mtmp, O.ORCISH_BOW));
                break;
            case P_SLING:
                set_propellor(oselect(mtmp, O.SLING));
                break;
            case P_CROSSBOW:
                set_propellor(oselect(mtmp, O.CROSSBOW));
            }
            if ((otmp = MON_WEP(mtmp)) && mwelded(otmp) && otmp !== propellor()
                && mtmp.weapon_check === NO_WEAPON_WANTED)
                set_propellor(null);
        }
        /* propellor = obj, propellor to use
         * propellor = &hands_obj, doesn't need a propellor
         * propellor = 0, needed one and didn't have one
         */
        if (propellor() != null) {
            /* Note: cannot use m_carrying for loadstones, since it will
             * always select the first object of a type, and maybe the
             * monster is carrying two but only the first is unthrowable.
             */
            if (rwep[i] !== O.LOADSTONE) {
                /* Don't throw a cursed weapon-in-hand or an artifact */
                if ((otmp = oselect(mtmp, rwep[i])) && !otmp.oartifact
                    && !(otmp === MON_WEP(mtmp) && mwelded(otmp)))
                    return otmp;
            } else
                for (const o of minv(mtmp)) {
                    if (o.otyp === O.LOADSTONE && !o.cursed)
                        return o;
                }
        }
    }

    /* failure */
    return null;
}

/* Weapons in order of preference */
const hwep = [
    O.CORPSE, /* cockatrice corpse */
    O.TSURUGI, O.RUNESWORD, O.DWARVISH_MATTOCK, O.TWO_HANDED_SWORD,
    O.BATTLE_AXE, O.KATANA, O.UNICORN_HORN, O.CRYSKNIFE, O.TRIDENT,
    O.LONG_SWORD, O.ELVEN_BROADSWORD, O.BROADSWORD, O.SCIMITAR,
    O.SILVER_SABER, O.MORNING_STAR, O.ELVEN_SHORT_SWORD,
    O.DWARVISH_SHORT_SWORD, O.SHORT_SWORD, O.ORCISH_SHORT_SWORD,
    O.SILVER_MACE, O.MACE, O.AXE, O.DWARVISH_SPEAR, O.SILVER_SPEAR,
    O.ELVEN_SPEAR, O.SPEAR, O.ORCISH_SPEAR, O.FLAIL, O.BULLWHIP,
    O.QUARTERSTAFF, O.JAVELIN, O.AKLYS, O.CLUB, O.PICK_AXE, O.RUBBER_HOSE,
    O.WAR_HAMMER, O.SILVER_DAGGER, O.ELVEN_DAGGER, O.DAGGER, O.ORCISH_DAGGER,
    O.ATHAME, O.SCALPEL, O.KNIFE, O.WORM_TOOTH,
];

// C ref: weapon.c select_hwep()
/* select a hand to hand weapon for the monster */
export function select_hwep(mtmp) {
    let otmp;
    let i;
    const strong = strongmonst(mtmp.data);
    const wearing_shield = ((mtmp.misc_worn_check || 0) & W_ARMS) !== 0;

    /* prefer artifacts to everything else */
    for (const o of minv(mtmp)) {
        if (o.oclass === WEAPON_CLASS && o.oartifact
            && touch_artifact_mon(o, mtmp)
            && ((strong && !wearing_shield)
                || !objects[o.otyp].oc_bimanual))
            return o;
    }

    if (is_giant(mtmp.data)) { /* giants just love to use clubs */
        if ((otmp = oselect(mtmp, O.CLUB)) != null)
            return otmp;
    } else if (mtmp.data === M.mons[M.PM_BALROG] && game.uwep) {
        if ((otmp = oselect(mtmp, O.BULLWHIP)) != null)
            return otmp;
    }

    /* only strong monsters can wield big (esp. long) weapons */
    /* big weapon is basically the same as bimanual */
    /* all monsters can wield the remaining weapons */
    for (i = 0; i < hwep.length; i++) {
        if (hwep[i] === O.CORPSE && !((mtmp.misc_worn_check || 0) & W_ARMG)
            && !resists_ston(mtmp))
            continue;
        if (((strong && !wearing_shield) || !objects[hwep[i]].oc_bimanual)
            && (objects[hwep[i]].oc_material !== O.SILVER
                || !mon_hates_silver(mtmp)))
            if ((otmp = oselect(mtmp, hwep[i])) != null)
                return otmp;
    }

    /* failure */
    return null;
}

// C ref: weapon.c possibly_unwield()
/* Called after polymorphing a monster, robbing it, etc....  Monsters
 * otherwise never unwield stuff on their own.  Might print message.
 */
export async function possibly_unwield(mon, polyspot) {
    let obj = null, mw_tmp;

    if (!(mw_tmp = MON_WEP(mon)))
        return;
    for (const o of minv(mon))
        if (o === mw_tmp) {
            obj = o;
            break;
        }
    if (!obj) { /* The weapon was stolen or destroyed */
        MON_NOWEP(mon);
        mon.weapon_check = NEED_WEAPON;
        return;
    }
    if (!attacktype(mon.data, M.AT_WEAP)) {
        setmnotwielded(mon, mw_tmp);
        mon.weapon_check = NO_WEAPON_WANTED;
        void polyspot;
        /* "%s drops %s.", obj_extract_self(), flooreffects(),
           bypass_obj(), place_object() and stackobj() */
        throw new Error('possibly_unwield(): dropping the weapon not ported yet');
    }
    /* The remaining case where there is a change is where a monster
     * is polymorphed into a stronger/weaker monster with a different
     * choice of weapons.  This has no parallel for players.  It can
     * be handled by waiting until mon_wield_item is actually called.
     * Though the monster still wields the wrong weapon until then,
     * this is OK since the player can't see it.  (FIXME: Not okay since
     * probing can reveal it.)
     * Note that if there is no change, setting the check to NEED_WEAPON
     * is harmless.
     * Possible problem: big monster with big cursed weapon gets
     * polymorphed into little monster.  But it's not quite clear how to
     * handle this anyway....
     */
    if (!(mwelded(mw_tmp) && mon.weapon_check === NO_WEAPON_WANTED))
        mon.weapon_check = NEED_WEAPON;
    return;
}

// C ref: weapon.c mon_wield_item()
/* Let a monster try to wield a weapon, based on mon->weapon_check.
 * Returns 1 if the monster took time to do it, 0 if it did not.
 */
export async function mon_wield_item(mon) {
    let obj;
    let exclaim = true; /* assume mon is planning to attack */

    /* This case actually should never happen */
    if (mon.weapon_check === NO_WEAPON_WANTED)
        return 0;
    switch (mon.weapon_check) {
    case NEED_HTH_WEAPON:
        obj = select_hwep(mon);
        break;
    case NEED_RANGED_WEAPON:
        select_rwep(mon);
        obj = propellor();
        break;
    case NEED_PICK_AXE:
        obj = m_carrying(mon, O.PICK_AXE);
        /* KMH -- allow other picks */
        if (!obj && !which_armor(mon, W_ARMS))
            obj = m_carrying(mon, O.DWARVISH_MATTOCK);
        exclaim = false; /* mon is just planning to dig */
        break;
    case NEED_AXE:
        /* currently, only 2 types of axe */
        obj = m_carrying(mon, O.BATTLE_AXE);
        if (!obj || which_armor(mon, W_ARMS))
            obj = m_carrying(mon, O.AXE);
        exclaim = false;
        break;
    case NEED_PICK_OR_AXE:
        /* prefer pick for fewer switches on most levels */
        obj = m_carrying(mon, O.DWARVISH_MATTOCK);
        if (!obj)
            obj = m_carrying(mon, O.BATTLE_AXE);
        if (!obj || which_armor(mon, W_ARMS)) {
            obj = m_carrying(mon, O.PICK_AXE);
            if (!obj)
                obj = m_carrying(mon, O.AXE);
        }
        exclaim = false;
        break;
    default:
        impossible(`weapon_check ${mon.weapon_check} for monster?`);
        return 0;
    }
    if (obj && obj !== hands_obj) {
        const mw_tmp = MON_WEP(mon);

        if (mw_tmp && mw_tmp.otyp === obj.otyp) {
            /* already wielding it */
            mon.weapon_check = NEED_WEAPON;
            return 0;
        }
        /* Actually, this isn't necessary--as soon as the monster
         * wields the weapon, the weapon welds itself, so the monster
         * can know it's cursed and needn't even bother trying.
         * Still....
         */
        if (mw_tmp && mwelded(mw_tmp)) {
            if (canseemon(mon)) {
                let mon_hand = mbodypart_wp(mon, HAND_WP);

                if (bimanual_wp(mw_tmp))
                    mon_hand = makeplural_wp(mon_hand);
                const welded_buf = `${otense_wp(mw_tmp, "are")} welded to ${
                    mhis_wp(mon)} ${mon_hand}`;

                if (obj.otyp === O.PICK_AXE) {
                    await pline(`Since ${s_suffix_wp(mon_nam_wp(mon))} weapon${
                        (mw_tmp.quan === 1) ? "" : "s"} ${welded_buf},`);
                    await pline(`${mon_nam_wp(mon)} cannot wield that ${xname_wp(obj)}.`);
                } else {
                    await pline(`${Monnam(mon)} tries to wield ${doname(obj)}.`); /* pline_mon() */
                    await pline(`${Yname2_wp(mw_tmp)} ${welded_buf}!`);
                }
                mw_tmp.bknown = 1;
            }
            mon.weapon_check = NO_WEAPON_WANTED;
            return 1;
        }
        mon.mw = obj; /* wield obj */
        setmnotwielded(mon, mw_tmp);
        mon.weapon_check = NEED_WEAPON;
        if (canseemon(mon)) {
            let newly_welded;
            let arw;

            await pline(`${Monnam(mon)} wields ${doname(obj)}${exclaim ? '!' : '.'}`); /* pline_mon() */
            if ((arw = autoreturn_weapon(obj)) != null && arw.tethered !== 0) /* pline_mon() */
                await pline(`${Monnam(mon)} secures the tether on ${the_wp(xname_wp(obj))}.`);

            /* 3.6.3: mwelded() predicate expects the object to have its
               W_WEP bit set in owormmask, but the pline here and for
               artifact_light don't want that because they'd have '(weapon
               in hand/claw)' appended; so we set it for the mwelded test
               and then clear it, until finally setting it for good below */
            obj.owornmask = (obj.owornmask || 0) | W_WEP;
            newly_welded = mwelded(obj);
            obj.owornmask &= ~W_WEP;
            if (newly_welded) {
                let mon_hand = mbodypart_wp(mon, HAND_WP);

                if (bimanual_wp(obj))
                    mon_hand = makeplural_wp(mon_hand);
                await pline(`${Tobjnam_wp(obj, "weld")} ${
                    (obj.quan !== 1) /* is_plural(obj) */ ? "themselves" : "itself"} to ${
                    s_suffix_wp(mon_nam_wp(mon))} ${mon_hand}!`);
                obj.bknown = 1;
            }
        }
        if (artifact_light(obj) && !obj.lamplit)
            throw new Error('mon_wield_item(): begin_burn() not ported yet');
        obj.owornmask = W_WEP;
        return 1;
    }
    mon.weapon_check = NEED_WEAPON;
    return 0;
}

// C ref: weapon.c mwepgone()
/* force monster to stop wielding current weapon, if any */
export function mwepgone(mon) {
    const mwep = MON_WEP(mon);

    if (mwep) {
        setmnotwielded(mon, mwep);
        mon.weapon_check = NEED_WEAPON;
    }
}

function martial_bonus() { return Role_if(M.PM_SAMURAI) || Role_if(M.PM_MONK); }

// C ref: weapon.c abon()
/* attack bonus for strength & dexterity */
export function abon() {
    let sbon;
    const str = ACURR(A_STR), dex = ACURR(A_DEX);

    if (Upolyd())
        return (adj_lev(M.mons[game.u.umonnum]) - 3);

    /* this used to be '<= 18/50' for bonus of 1 but got changed to '< 18/50'
       so that '18/50' gives a bonus of 2; gnome and orc player characters
       have max Str of 18/50 and giving an extra bonus at that break point
       provides an incentive for them to max out that characteristic */
    if (str < 6)
        sbon = -2;
    else if (str < 8)
        sbon = -1;
    else if (str < 17)
        sbon = 0;
    else if (str < STR18(50))
        sbon = 1; /* up to 18/49 */
    else if (str < STR18(100))
        sbon = 2;
    else
        sbon = 3;

    /* Game tuning kludge: make it a bit easier for a low level character to
     * hit */
    sbon += (game.u.ulevel < 3) ? 1 : 0;

    if (dex < 4)
        return (sbon - 3);
    else if (dex < 6)
        return (sbon - 2);
    else if (dex < 8)
        return (sbon - 1);
    else if (dex < 14)
        return sbon;
    else
        return (sbon + dex - 14);
}

// C ref: weapon.c dbon()
/* damage bonus for strength */
export function dbon() {
    const str = ACURR(A_STR);

    if (Upolyd())
        return 0;

    if (str < 6)
        return -1;
    else if (str < 16)
        return 0;
    else if (str < 18)
        return 1;
    else if (str === 18)
        return 2; /* up to 18 */
    else if (str <= STR18(75))
        return 3; /* up to 18/75 */
    else if (str <= STR18(90))
        return 4; /* up to 18/90 */
    else if (str < STR18(100))
        return 5; /* up to 18/99 */
    else
        return 6;
}

// C ref: weapon.c give_may_advance_msg()
async function give_may_advance_msg(skill) {
    await pline(`You feel more confident in your ${
        (skill === P_NONE) ? ''
        : (skill <= P_LAST_WEAPON) ? 'weapon '
          : (skill <= P_LAST_SPELL) ? 'spell casting '
            : 'fighting '}skills.`);
    await handle_tip(TIP_ENHANCE);
}

// C ref: weapon.c use_skill()
export async function use_skill(skill, degree) {
    let advance_before;

    if (skill !== P_NONE && !P_RESTRICTED(skill)) {
        advance_before = can_advance(skill, false);
        set_P_ADVANCE(skill, P_ADVANCE(skill) + degree);
        if (!advance_before && can_advance(skill, false))
            await give_may_advance_msg(skill);
    }
}

// C ref: weapon.c add_weapon_skill()
export async function add_weapon_skill(n) /* number of slots to gain; normally one */ {
    const u = game.u;
    let i, before, after;

    for (i = 0, before = 0; i < P_NUM_SKILLS; i++)
        if (can_advance(i, false))
            before++;
    u.weapon_slots = (u.weapon_slots || 0) + n;
    for (i = 0, after = 0; i < P_NUM_SKILLS; i++)
        if (can_advance(i, false))
            after++;
    if (before < after)
        await give_may_advance_msg(P_NONE);
}

// C ref: weapon.c lose_weapon_skill()
export function lose_weapon_skill(n) /* number of slots to lose; normally one */ {
    const u = game.u;
    let skill;

    while (--n >= 0) {
        /* deduct first from unused slots then from last placed one, if any */
        if (u.weapon_slots) {
            u.weapon_slots--;
        } else if (u.skills_advanced) {
            skill = u.skill_record[--u.skills_advanced];
            if (P_SKILL(skill) <= P_UNSKILLED)
                throw new Error(`lose_weapon_skill (${skill})`); /* panic() */
            set_P_SKILL(skill, P_SKILL(skill) - 1); /* drop skill one level */
            /* Lost skill might have taken more than one slot; refund rest. */
            u.weapon_slots = slots_required(skill) - 1;
            /* It might now be possible to advance some other pending
               skill by using the refunded slots, but giving a message
               to that effect would seem pretty confusing.... */
        }
    }
}

// C ref: weapon.c drain_weapon_skill()
export async function drain_weapon_skill(n) { /* number of skills to drain */
    const u = game.u;
    let skill;
    let i;
    let curradv;
    let prevadv;
    const tmpskills = new Array(P_NUM_SKILLS).fill(0);

    while (--n >= 0) {
        if (u.skills_advanced) {
            /* Pick a random skill, deleting it from the list. */
            i = rn2(u.skills_advanced);
            skill = u.skill_record[i];
            tmpskills[skill] = 1;
            for (; i < u.skills_advanced - 1; i++) {
                u.skill_record[i] = u.skill_record[i + 1];
            }
            u.skills_advanced--;
            if (P_SKILL(skill) <= P_UNSKILLED)
                throw new Error(`drain_weapon_skill (${skill})`); /* panic() */
            set_P_SKILL(skill, P_SKILL(skill) - 1); /* drop skill one level */
            /* refund slots used for skill */
            u.weapon_slots = (u.weapon_slots || 0) + slots_required(skill);
            /* drain skill training to a value appropriate for new level */
            curradv = practice_needed_to_advance(P_SKILL(skill));
            prevadv = practice_needed_to_advance(P_SKILL(skill) - 1);
            if (P_ADVANCE(skill) >= curradv)
                set_P_ADVANCE(skill, prevadv + rn2(curradv - prevadv));
        }
    }

    for (skill = 0; skill < P_NUM_SKILLS; skill++)
        if (tmpskills[skill]) {
            await pline(`You forget ${P_SKILL(skill) >= P_BASIC ? "some of " : ""}your training in ${
                P_NAME(skill)}.`);
        }
}

// C ref: weapon.c could_advance()
/* return true if this skill could be advanced if more slots were available */
function could_advance(skill) {
    if (P_RESTRICTED(skill)
        || P_SKILL(skill) >= P_MAX_SKILL(skill)
        || (game.u.skills_advanced || 0) >= P_SKILL_LIMIT)
        return false;

    return (P_ADVANCE(skill)
            >= practice_needed_to_advance(P_SKILL(skill)));
}

// C ref: weapon.c peaked_skill()
/* return true if this skill has reached its maximum and there's been enough
   practice to become eligible for the next step if that had been possible */
function peaked_skill(skill) {
    if (P_RESTRICTED(skill))
        return false;

    return (P_SKILL(skill) >= P_MAX_SKILL(skill)
            && (P_ADVANCE(skill)
                >= practice_needed_to_advance(P_SKILL(skill))));
}

// C ref: weapon.c skill_advance()
async function skill_advance(skill) {
    const u = game.u;
    u.weapon_slots = (u.weapon_slots || 0) - slots_required(skill);
    set_P_SKILL(skill, P_SKILL(skill) + 1);
    if (!u.skill_record)
        u.skill_record = [];
    u.skills_advanced = u.skills_advanced || 0;
    u.skill_record[u.skills_advanced++] = skill;
    /* subtly change the advance message to indicate no more advancement */
    await pline(`You are now ${P_SKILL(skill) >= P_MAX_SKILL(skill) ? "most" : "more"
                } skilled in ${P_NAME(skill)}.`);

    /* wizards discover spellbook IDs depending on spell 'school' skill limits;
       this allows them to successfully write books for unknown spells without
       the Luck bias they used to have over other roles */
    if (skill >= P_FIRST_SPELL && skill <= P_LAST_SPELL)
        skill_based_spellbook_id();
}

/* C ref: weapon.c skill_ranges[] */
const skill_ranges = [
    { first: P_FIRST_H_TO_H, last: P_LAST_H_TO_H, name: "Fighting Skills" },
    { first: P_FIRST_WEAPON, last: P_LAST_WEAPON, name: "Weapon Skills" },
    { first: P_FIRST_SPELL, last: P_LAST_SPELL, name: "Spellcasting Skills" },
];

function padl(s, w) { s = String(s); return s.length >= w ? s : ' '.repeat(w - s.length) + s; }

// C ref: weapon.c add_skills_to_menu()
/* write a list of skills onto the given menu

   if selectable is set, give selection letters for skills that can be
   advanced and leave room for them on skills that can't be advanced */
function add_skills_to_menu(win, selectable, speedy) {
    let i, len, longest;
    let buf, prefix;
    const clr = NO_COLOR;

    /* Find the longest skill name. */
    for (longest = 0, i = 0; i < P_NUM_SKILLS; i++) {
        if (P_RESTRICTED(i))
            continue;
        if ((len = P_NAME(i).length) > longest)
            longest = len;
    }

    /* List the skills, making ones that could be advanced selectable if
       selectable is set.  List the miscellaneous skills first.  Possible
       future enhancement: list spell skills before weapon skills for
       spellcaster roles. */
    for (let pass = 0; pass < skill_ranges.length; pass++)
        for (i = skill_ranges[pass].first; i <= skill_ranges[pass].last;
             i++) {
            /* Print headings for skill types */
            if (i === skill_ranges[pass].first)
                add_menu_heading(win, skill_ranges[pass].name);

            if (P_RESTRICTED(i))
                continue;
            /*
             * Sigh, this assumes a monospaced font unless
             * iflags.menu_tab_sep is set in which case it puts
             * tabs between columns.
             * The 12 is the longest skill level name.
             * The "    " is room for a selection letter and dash, "a - ".
             */
            if (!selectable)
                prefix = "";
            else if (can_advance(i, speedy))
                prefix = ""; /* will be preceded by menu choice */
            else if (could_advance(i))
                prefix = "  * ";
            else if (peaked_skill(i))
                prefix = "  # ";
            else
                prefix = "    ";
            const sklnambuf = skill_level_name(i);
            if (wizard()) {
                if (!game.iflags.menu_tab_sep)
                    buf = ` ${prefix}${padr(P_NAME(i), longest)} ${padr(sklnambuf, 12)} ${
                        padl(P_ADVANCE(i), 5)}(${
                        padl(practice_needed_to_advance(P_SKILL(i)), 4)})`;
                else
                    buf = ` ${prefix}${P_NAME(i)}\t${sklnambuf}\t${
                        padl(P_ADVANCE(i), 5)}(${
                        padl(practice_needed_to_advance(P_SKILL(i)), 4)})`;
            } else {
                if (!game.iflags.menu_tab_sep)
                    buf = ` ${prefix} ${padr(P_NAME(i), longest)} [${sklnambuf}]`;
                else
                    buf = ` ${prefix}${P_NAME(i)}\t[${sklnambuf}]`;
            }
            const any = (selectable && can_advance(i, speedy)) ? i + 1 : 0;
            tty_add_menu(win, null, any, '', '', ATR_NONE, clr, buf,
                         MENU_ITEMFLAGS_NONE);
        }
}

/* C ref: hack.h plur() */
function plur(x) { return (x === 1) ? "" : "s"; }

// C ref: weapon.c enhance_weapon_skill()
/*
 * The `#enhance' extended command.  What we _really_ would like is
 * to keep being able to pick things to advance until we couldn't any
 * more.  This is currently not possible -- the menu code has no way
 * to call us back for instant action.  Even if it did, we would also need
 * to be able to update the menu since selecting one item could make
 * others unselectable.
 */
export async function enhance_weapon_skill() {
    const u = game.u;
    let i, n, to_advance, eventually_advance, maxxed_cnt;
    let buf;
    let speedy = false;

    /* player knows about #enhance, don't show tip anymore */
    game.context.tips = (game.context.tips || 0) | (1 << TIP_ENHANCE);

    if (wizard() && await tty_yn_function("Advance skills without practice?",
                                          "yn", 'n') === 'y')
        speedy = true;

    do {
        /* count advanceable skills */
        to_advance = eventually_advance = maxxed_cnt = 0;
        for (i = 0; i < P_NUM_SKILLS; i++) {
            if (P_RESTRICTED(i))
                continue;
            if (can_advance(i, speedy))
                to_advance++;
            else if (could_advance(i))
                eventually_advance++;
            else if (peaked_skill(i))
                maxxed_cnt++;
        }

        const win = tty_create_nhwindow(NHW_MENU);
        tty_start_menu(win, MENU_BEHAVE_STANDARD);

        /* start with a legend if any entries will be annotated
           with "*" or "#" below */
        if (eventually_advance > 0 || maxxed_cnt > 0) {
            if (eventually_advance > 0) {
                buf = `(Skill${plur(eventually_advance)} flagged by "*" may be enhanced ${
                    (u.ulevel < MAXULEV)
                        ? "when you're more experienced"
                        : "if skill slots become available"}.)`;
                add_menu_str(win, buf);
            }
            if (maxxed_cnt > 0) {
                buf = `(Skill${plur(maxxed_cnt)} flagged by "#" cannot be enhanced any further.)`;
                add_menu_str(win, buf);
            }
            add_menu_str(win, "");
        }

        add_skills_to_menu(
            win, to_advance + eventually_advance + maxxed_cnt > 0, speedy);

        buf = (to_advance > 0) ? "Pick a skill to advance:"
                               : "Current skills:";
        if (wizard() && !speedy)
            buf += `  (${u.weapon_slots || 0} slot${plur(u.weapon_slots || 0)} available)`;
        tty_end_menu(win, buf);
        const res = await tty_select_menu(win, to_advance ? PICK_ONE : PICK_NONE);
        n = res.n;
        await tty_destroy_nhwindow(win);
        if (n > 0) {
            n = res.selected[0].item - 1; /* get item selected */
            await skill_advance(n);
            /* check for more skills able to advance; if so, then... */
            for (n = i = 0; i < P_NUM_SKILLS; i++) {
                if (can_advance(i, speedy)) {
                    if (!speedy)
                        await pline("You feel you could be more dangerous!");
                    n++;
                    break;
                }
            }
        }
    } while (speedy && n > 0);
    return ECMD_OK;
}

// C ref: weapon.c uwep_skill_type()
export function uwep_skill_type() {
    if (game.u.twoweap)
        return P_TWO_WEAPON_COMBAT;
    return weapon_type(game.uwep);
}

// C ref: weapon.c weapon_hit_bonus()
/*
 * Return hit bonus/penalty based on skill of weapon.
 * weapon can be null, meaning bare-handed combat.
 * Treat restricted weapons as unskilled.
 */
export function weapon_hit_bonus(weapon) {
    let type, skill, bonus = 0;
    const u = game.u;

    const wep_type = weapon_type(weapon);
    /* use two weapon skill only if attacking with one of the wielded weapons
     */
    type = (u.twoweap && (weapon === game.uwep || weapon === game.uswapwep))
               ? P_TWO_WEAPON_COMBAT
               : wep_type;
    if (type === P_NONE) {
        bonus = 0;
    } else if (type <= P_LAST_WEAPON) {
        switch (P_SKILL(type)) {
        default:
            impossible(`weapon_hit_bonus: bad skill ${P_SKILL(type)}`);
            /* FALLTHRU */
        case P_ISRESTRICTED:
        case P_UNSKILLED:
            bonus = -4;
            break;
        case P_BASIC:
            bonus = 0;
            break;
        case P_SKILLED:
            bonus = 2;
            break;
        case P_EXPERT:
            bonus = 3;
            break;
        }
    } else if (type === P_TWO_WEAPON_COMBAT) {
        skill = P_SKILL(P_TWO_WEAPON_COMBAT);
        if (P_SKILL(wep_type) < skill)
            skill = P_SKILL(wep_type);
        switch (skill) {
        default:
            impossible(`weapon_hit_bonus: bad skill ${skill}`);
            /* FALLTHRU */
        case P_ISRESTRICTED:
        case P_UNSKILLED:
            bonus = -9;
            break;
        case P_BASIC:
            bonus = -7;
            break;
        case P_SKILLED:
            bonus = -5;
            break;
        case P_EXPERT:
            bonus = -3;
            break;
        }
    } else if (type === P_BARE_HANDED_COMBAT) {
        /*
         *        b.h. m.a.
         * unskl:  +1  n/a
         * basic:  +1   +3
         * skild:  +2   +4
         * exprt:  +2   +5
         * mastr:  +3   +6
         * grand:  +3   +7
         */
        bonus = P_SKILL(type);
        bonus = Math.max(bonus, P_UNSKILLED) - 1; /* unskilled => 0 */
        bonus = Math.trunc(((bonus + 2) * (martial_bonus() ? 2 : 1)) / 2);
    }

    /* KMH -- It's harder to hit while you are riding */
    if (u.usteed) {
        switch (P_SKILL(P_RIDING)) {
        case P_ISRESTRICTED:
        case P_UNSKILLED:
            bonus -= 2;
            break;
        case P_BASIC:
            bonus -= 1;
            break;
        case P_SKILLED:
            break;
        case P_EXPERT:
            break;
        }
        if (u.twoweap)
            bonus -= 2;
    }

    return bonus;
}

// C ref: weapon.c weapon_dam_bonus()
/*
 * Return damage bonus/penalty based on skill of weapon.
 * weapon can be null, meaning bare-handed combat.
 * Treat restricted weapons as unskilled.
 */
export function weapon_dam_bonus(weapon) {
    let type, skill, bonus = 0;
    const u = game.u;

    const wep_type = weapon_type(weapon);
    /* use two weapon skill only if attacking with one of the wielded weapons
     */
    type = (u.twoweap && (weapon === game.uwep || weapon === game.uswapwep))
               ? P_TWO_WEAPON_COMBAT
               : wep_type;
    if (type === P_NONE) {
        bonus = 0;
    } else if (type <= P_LAST_WEAPON) {
        switch (P_SKILL(type)) {
        default:
            impossible(`weapon_dam_bonus: bad skill ${P_SKILL(type)}`);
            /* FALLTHRU */
        case P_ISRESTRICTED:
        case P_UNSKILLED:
            bonus = -2;
            break;
        case P_BASIC:
            bonus = 0;
            break;
        case P_SKILLED:
            bonus = 1;
            break;
        case P_EXPERT:
            bonus = 2;
            break;
        }
    } else if (type === P_TWO_WEAPON_COMBAT) {
        skill = P_SKILL(P_TWO_WEAPON_COMBAT);
        if (P_SKILL(wep_type) < skill)
            skill = P_SKILL(wep_type);
        switch (skill) {
        default:
        case P_ISRESTRICTED:
        case P_UNSKILLED:
            bonus = -3;
            break;
        case P_BASIC:
            bonus = -1;
            break;
        case P_SKILLED:
            bonus = 0;
            break;
        case P_EXPERT:
            bonus = 1;
            break;
        }
    } else if (type === P_BARE_HANDED_COMBAT) {
        /*
         *        b.h. m.a.
         * unskl:   0  n/a
         * basic:  +1   +3
         * skild:  +1   +4
         * exprt:  +2   +6
         * mastr:  +2   +7
         * grand:  +3   +9
         */
        bonus = P_SKILL(type);
        bonus = Math.max(bonus, P_UNSKILLED) - 1; /* unskilled => 0 */
        bonus = Math.trunc(((bonus + 1) * (martial_bonus() ? 3 : 1)) / 2);
    }

    /* KMH -- Riding gives some thrusting damage */
    if (u.usteed && type !== P_TWO_WEAPON_COMBAT) {
        switch (P_SKILL(P_RIDING)) {
        case P_ISRESTRICTED:
        case P_UNSKILLED:
            break;
        case P_BASIC:
            break;
        case P_SKILLED:
            bonus += 1;
            break;
        case P_EXPERT:
            bonus += 2;
            break;
        }
    }

    return bonus;
}

// C ref: weapon.c setmnotwielded()
export function setmnotwielded(mon, obj) {
    if (!obj)
        return;
    if (artifact_light(obj) && obj.lamplit)
        throw new Error('setmnotwielded(): end_burn() not ported yet');
    if (MON_WEP(mon) === obj)
        MON_NOWEP(mon);
    obj.owornmask = (obj.owornmask || 0) & ~W_WEP;
}
