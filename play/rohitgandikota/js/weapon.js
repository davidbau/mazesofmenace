// weapon.js — weapon and skill handling.
// C ref: src/weapon.c
//
// Only skill_init() and its two helpers so far. Nothing here draws, but the
// skill array it builds is read by percent_success() (src/spell.c:2173), whose
// result decides the rnd(100) comparison in spelleffects_check(). Without the
// array that comparison has no input at all.

import { update_inventory } from './invent.js';
import { carried, mcarried } from './obj.js';
import { Yobjnam2 } from './objnam.js';
import { You } from './pline.js';
import { game } from './gstate.js';
import { OBJ_NAME, doname, xname, the, makesingular, Tobjnam,
         makeplural, distant_name } from './objnam.js';
/* include/defsym.h OBJCLASS rows, the `name` column — C's def_oc_syms[].name
   (js/drawing_data.js keeps only the symbol chars). Index = oclass. Used by
   weapon_descr() below, same as C's object_detect(). */
const def_oc_syms_name = ["", "illegal objects", "weapons", "armor", "rings",
    "amulets", "tools", "food", "potions", "scrolls", "spellbooks", "wands",
    "coins", "rocks", "large stones", "iron balls", "chains", "venoms"];
import { STR18, P_SKILL_LIMIT, P_LAST_WEAPON, P_UNSKILLED, P_BASIC, P_EXPERT, P_ISRESTRICTED, P_SLING, P_FLAIL, P_PICK_AXE, Upolyd } from './const.js';
import { MONSYMS } from './monst_data.js';
import { mon_hates_blessings, thick_skinned, passes_walls, is_swimmer, strongmonst, attacktype, is_wooden, hates_light, throws_rocks, mindless, is_animal } from './mondata.js';
import { is_axe, bimanual, is_plural } from './obj.js';
import { greatest_erosion } from './do_wear.js';
import { ATTKS } from './monst_data.js';
import { is_spear } from './u_init.js';
import { is_pool, is_pick, m_carrying, can_touch_safely, resists_ston } from './mon.js';
import { is_weptool, place_object } from './mkobj.js';
import { MON_WEP } from './monst.js';
import { mon_hates_silver, touch_petrifies } from './dog.js';
import { hands_obj, obj_extract_self, stackobj } from './invent.js';
import { cansee, couldsee } from './vision.js';
import { adj_lev, likes_gems } from './makemon.js';
import { dist2, s_suffix } from './hacklib.js';
import { ART_SNICKERSNEE } from './artilist_data.js';
import { which_armor } from './worn.js';
import { canseemon, newsym, pline } from './display.js';
import { Monnam, mon_nam } from './do_name.js';
import { W_ARM, W_ARMC, W_ARMS, W_ARMG, W_ARMU, W_RINGL, W_RINGR, W_WEP,
         HAND,
         NO_WEAPON_WANTED, NEED_WEAPON,
         NEED_RANGED_WEAPON, NEED_HTH_WEAPON, NEED_PICK_AXE, NEED_AXE,
         NEED_PICK_OR_AXE } from './const.js';
import { ACURR } from './attrib.js';
import { You_feel } from './pline.js';
import { P_LAST_SPELL, P_FIRST_H_TO_H, P_LAST_H_TO_H, P_FIRST_WEAPON,
         P_FIRST_SPELL } from './const.js';
import { A_STR, A_DEX } from './const.js';
import { AKLYS_LIM } from './const.js';
import { ONAMES, OCLASSES, MATERIALS, SKILLS } from './objects_data.js';
import { bigmonst } from './mondata.js';
import { rnd, d, rn2 } from './rng.js';
import { spell_skilltype } from './spell.js';
import { discover_object } from './o_init.js';
import { P_NONE, P_NUM_SKILLS, P_BARE_HANDED_COMBAT, P_RIDING, P_HEALING_SPELL, P_CLERIC_SPELL, P_TWO_WEAPON_COMBAT, P_SKILLED, P_MASTER, P_GRAND_MASTER, P_ATTACK_SPELL, P_ENCHANTMENT_SPELL, P_BOW, P_CROSSBOW } from './const.js';
import { PMNAMES } from './monst_data.js';
import { spec_abon } from './artifact.js';

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
/* The role record stores its monster as `mnum` (see js/role_data.js); the
   old malenum/pmidx reads matched no field at all, so every Role_if here was
   false and skill_init never granted any role its starting spell skill. */
const Role_if = (pm) => {
    const m = game.urole?.mnum;
    return m === pm || m === PMNAMES[pm];
};

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

/* src/weapon.c:498 rwep[] — ranged weapons in order of preference. */
const rwep = () => {
    const O = ONAMES;
    return [
        O.DWARVISH_SPEAR, O.SILVER_SPEAR, O.ELVEN_SPEAR, O.SPEAR,
        O.ORCISH_SPEAR, O.JAVELIN, O.SHURIKEN, O.YA, O.SILVER_ARROW,
        O.ELVEN_ARROW, O.ARROW, O.ORCISH_ARROW, O.CROSSBOW_BOLT,
        O.SILVER_DAGGER, O.ELVEN_DAGGER, O.DAGGER, O.ORCISH_DAGGER, O.KNIFE,
        O.FLINT, O.ROCK, O.LOADSTONE, O.LUCKSTONE, O.DART, O.CREAM_PIE,
    ];
};

/* src/weapon.c:506 pwep[] — polearms. */
const pwep = () => {
    const O = ONAMES;
    return [
        O.HALBERD, O.BARDICHE, O.SPETUM, O.BILL_GUISARME, O.VOULGE,
        O.RANSEUR, O.GUISARME, O.GLAIVE, O.LUCERN_HAMMER, O.BEC_DE_CORBIN,
        O.FAUCHARD, O.PARTISAN, O.LANCE,
    ];
};

// src/weapon.c:531 select_rwep() — select a ranged weapon for the monster.
// Sets game.propellor: the launcher to use, hands_obj when none is needed,
// or null when one was needed and missing (C's gp.propellor trichotomy).
export function select_rwep(mtmp) {
    let otmp;
    const mdat = game.mons[mtmp.mnum];
    const mlet = mdat.mlet;

    game.propellor = hands_obj;
    if ((otmp = oselect(mtmp, ONAMES.EGG)) != null) /* cockatrice egg */
        return otmp;
    if (mlet === MONSYMS.S_KOP  /* pies are first choice for Kops */
        && (otmp = oselect(mtmp, ONAMES.CREAM_PIE)) != null)
        return otmp;
    if (throws_rocks(mdat)     /* ...boulders for giants */
        && (otmp = oselect(mtmp, ONAMES.BOULDER)) != null)
        return otmp;

    /* Select polearms first; they do more damage and aren't expendable.
       The limit of 13 is the monster polearm range limit (5 in mthrowu.c):
       3^2+2^2=13 is one space beyond knight's-move range. */
    const mwep = MON_WEP(mtmp);
    /* NO_WEAPON_WANTED means we already tried to wield and failed */
    const mweponly = (mwelded_weapon(mwep)
                      && mtmp.weapon_check === NO_WEAPON_WANTED);
    if (dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy) <= 13
        && couldsee(mtmp.mx, mtmp.my)) {
        if (mwep && mwep.oartifact === ART_SNICKERSNEE) {
            game.propellor = mwep;
            return mwep;
        }

        for (const p of pwep()) {
            /* Only strong monsters can wield big (esp. long) weapons.
             * All monsters can wield the remaining weapons. */
            if (((strongmonst(mdat)
                  && ((mtmp.misc_worn_check ?? 0) & W_ARMS) === 0)
                 || !game.objects[p].oc_bimanual)
                && (game.objects[p].oc_material !== MATERIALS.SILVER
                    || !mon_hates_silver(mtmp))) {
                if ((otmp = oselect(mtmp, p)) != null
                    && (otmp === mwep || !mweponly)) {
                    game.propellor = otmp; /* force the monster to wield it */
                    return otmp;
                }
            }
        }
    }
    /* Next, try to select a throw-and-return weapon, since they are
     * also not as expendable. */
    for (const arw of arwep) {
        if (!mindless(mdat) && !is_animal(mdat) && !mweponly
            && dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy) <= arw.range
            && couldsee(mtmp.mx, mtmp.my)) {
            if ((((mtmp.misc_worn_check ?? 0) & W_ARMS) === 0
                 || !game.objects[arw.otyp].oc_bimanual)
                && (game.objects[arw.otyp].oc_material !== MATERIALS.SILVER
                    || !mon_hates_silver(mtmp))) {
                if ((otmp = oselect(mtmp, arw.otyp)) != null
                    && (otmp === mwep || !mweponly)) {
                    game.propellor = otmp; /* force the monster to wield it */
                    return otmp;
                }
            }
        }
    }

    /* other than the specific cases above, always select the
     * most potent ranged weapon to hand. */
    for (const r of rwep()) {
        /* shooting gems from slings; this goes just before the darts */
        if (r === ONAMES.DART && !likes_gems(mdat)
            && m_carrying(mtmp, ONAMES.SLING)) { /* propellor */
            for (const g of (mtmp.minvent || []))
                if (g.oclass === OCLASSES.GEM_CLASS
                    && (g.otyp !== ONAMES.LOADSTONE || !g.cursed)) {
                    game.propellor = m_carrying(mtmp, ONAMES.SLING);
                    return g;
                }
        }

        /* KMH -- This belongs here so darts will work */
        game.propellor = hands_obj;

        const prop = game.objects[r].oc_skill;
        if (prop < 0) {
            switch (-prop) {
            case SKILLS.P_BOW:
                game.propellor = oselect(mtmp, ONAMES.YUMI);
                if (!game.propellor)
                    game.propellor = oselect(mtmp, ONAMES.ELVEN_BOW);
                if (!game.propellor)
                    game.propellor = oselect(mtmp, ONAMES.BOW);
                if (!game.propellor)
                    game.propellor = oselect(mtmp, ONAMES.ORCISH_BOW);
                break;
            case SKILLS.P_SLING:
                game.propellor = oselect(mtmp, ONAMES.SLING);
                break;
            case SKILLS.P_CROSSBOW:
                game.propellor = oselect(mtmp, ONAMES.CROSSBOW);
            }
            const wep = MON_WEP(mtmp);
            if (wep && mwelded_weapon(wep) && wep !== game.propellor
                && mtmp.weapon_check === NO_WEAPON_WANTED)
                game.propellor = null;
        }
        /* propellor = obj: propellor to use; hands_obj: doesn't need one;
           null: needed one and didn't have one */
        if (game.propellor != null) {
            if (r !== ONAMES.LOADSTONE) {
                /* Don't throw a cursed weapon-in-hand or an artifact */
                if ((otmp = oselect(mtmp, r)) && !otmp.oartifact
                    && !(otmp === MON_WEP(mtmp) && mwelded_weapon(otmp)))
                    return otmp;
            } else {
                for (const l of (mtmp.minvent || []))
                    if (l.otyp === ONAMES.LOADSTONE && !l.cursed)
                        return l;
            }
        }
    }

    /* failure */
    return null;
}

// src/weapon.c:950 abon() — the hero's to-hit bonus from Str and Dex.
//
// No draws; pure arithmetic, so its correctness is checked by value rather
// than by the scoreboard.
//
// Note the two comments C keeps here, both of which change the numbers: the
// Str test is `< STR18(50)` rather than `<=`, so exactly 18/50 gives a bonus
// of 2, and a hero below experience level 3 gets a flat +1 to make early
// hitting easier.
export function abon() {
    const str = ACURR(A_STR), dex = ACURR(A_DEX);
    let sbon;

    if (Upolyd(game.u))
        return adj_lev(game.mons[game.u.umonnum]) - 3;

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
        tmp += spec_abon(otmp, mon);

    return tmp;
}

/* include/obj.h is_graystone() */
const is_graystone = (o) =>
    o.otyp === ONAMES.LUCKSTONE || o.otyp === ONAMES.LOADSTONE
    || o.otyp === ONAMES.FLINT || o.otyp === ONAMES.TOUCHSTONE;

/* src/weapon.c:22-35 — PN_* mark skill categories whose names don't come
   from OBJ_NAME(objects[type]); the value is a negative index into
   odd_skill_names. */
const PN_BARE_HANDED = -1, PN_TWO_WEAPONS = -2, PN_RIDING = -3,
      PN_POLEARMS = -4, PN_SABER = -5, PN_HAMMER = -6, PN_WHIP = -7,
      PN_ATTACK_SPELL = -8, PN_HEALING_SPELL = -9, PN_DIVINATION_SPELL = -10,
      PN_ENCHANTMENT_SPELL = -11, PN_CLERIC_SPELL = -12,
      PN_ESCAPE_SPELL = -13, PN_MATTER_SPELL = -14;

/* src/weapon.c:38 skill_names_indices[] — skill number to object type (or
   negative odd_skill_names index). Entry [0] isn't used. */
const skill_names_indices = [
    0, ONAMES.DAGGER, ONAMES.KNIFE, ONAMES.AXE, ONAMES.PICK_AXE,
    ONAMES.SHORT_SWORD, ONAMES.BROADSWORD, ONAMES.LONG_SWORD,
    ONAMES.TWO_HANDED_SWORD, PN_SABER, ONAMES.CLUB, ONAMES.MACE,
    ONAMES.MORNING_STAR, ONAMES.FLAIL, PN_HAMMER,
    ONAMES.QUARTERSTAFF, PN_POLEARMS, ONAMES.SPEAR, ONAMES.TRIDENT,
    ONAMES.LANCE, ONAMES.BOW, ONAMES.SLING, ONAMES.CROSSBOW,
    ONAMES.DART, ONAMES.SHURIKEN, ONAMES.BOOMERANG, PN_WHIP,
    ONAMES.UNICORN_HORN,
    /* Spell */
    PN_ATTACK_SPELL, PN_HEALING_SPELL, PN_DIVINATION_SPELL,
    PN_ENCHANTMENT_SPELL, PN_CLERIC_SPELL, PN_ESCAPE_SPELL, PN_MATTER_SPELL,
    /* Other */
    PN_BARE_HANDED, PN_TWO_WEAPONS, PN_RIDING,
];

/* src/weapon.c:52 — note: entry [0] isn't used */
const odd_skill_names = [
    "no skill", "bare hands", /* use barehands_or_martial[] instead */
    "two weapon combat", "riding", "polearms", "saber", "hammer", "whip",
    "attack spells", "healing spells", "divination spells",
    "enchantment spells", "clerical spells", "escape spells", "matter spells",
];
/* src/weapon.c:59 — indexed via martial_bonus() */
const barehands_or_martial = ["bare handed combat", "martial arts"];

// src/weapon.c:63 P_NAME()
function P_NAME(type) {
    const idx = skill_names_indices[type];
    return (idx > 0)
        ? OBJ_NAME(game.objects[idx])
        : (type === P_BARE_HANDED_COMBAT)
            ? barehands_or_martial[martial_bonus() ? 1 : 0]
            : odd_skill_names[-idx];
}

/* include/skills.h P_SKILL/P_MAX_SKILL/P_ADVANCE/P_RESTRICTED — readers over
   u.weapon_skills, which skill_init() builds. */
export const P_SKILL = (x) => game.u.weapon_skills?.[x]?.skill;

// src/weapon.c:90 weapon_descr() — weapon's skill category name for use as a
// generalized description of the weapon.
export function weapon_descr(obj) {
    const skill = weapon_type(obj);
    let descr = P_NAME(skill);

    /* assorted special cases */
    switch (skill) {
    case P_NONE:
        /* not a weapon or weptool: use item class name; override for
           things where it sounds strange (src/weapon.c:96-109) */
        descr = (obj.otyp === ONAMES.CORPSE || obj.otyp === ONAMES.TIN
                 || obj.otyp === ONAMES.EGG || obj.otyp === ONAMES.STATUE
                 || obj.otyp === ONAMES.BOULDER || obj.otyp === ONAMES.TOWEL
                 || obj.otyp === ONAMES.TIN_OPENER)
                ? OBJ_NAME(game.objects[obj.otyp])
                : def_oc_syms_name[obj.oclass];
        break;
    case P_SLING:
        if (is_ammo(obj))
            descr = (obj.otyp === ONAMES.ROCK || is_graystone(obj))
                        ? "stone"
                        : (obj.oclass === OCLASSES.GEM_CLASS)
                            ? "gem"
                            : def_oc_syms_name[obj.oclass];
        break;
    case P_BOW:
        if (is_ammo(obj))
            descr = "arrow";
        break;
    case P_CROSSBOW:
        if (is_ammo(obj))
            descr = "bolt";
        break;
    case P_FLAIL:
        if (obj.otyp === ONAMES.GRAPPLING_HOOK)
            descr = "hook";
        break;
    case P_PICK_AXE:
        /* even if "dwarvish mattock" hasn't been discovered yet */
        if (obj.otyp === ONAMES.DWARVISH_MATTOCK)
            descr = "mattock";
        break;
    default:
        break;
    }
    return makesingular(descr);
}

// include/obj.h:256 is_wet_towel()
const is_wet_towel = (o) => o.otyp === ONAMES.TOWEL && o.spe > 0;

// src/weapon.c:1020 finish_towel_change()
function finish_towel_change(obj, newspe) {
    /* towel wetness is always between 0 (dry) and 7, inclusive */
    newspe = Math.min(newspe, 7);
    obj.spe = Math.max(newspe, 0);

    /* if hero is wielding this towel, don't give "you begin bashing with
       your [wet] towel" message if it's wet, do give one if it's dry */
    if (obj === game.u.uwep)
        game.unweapon = !is_wet_towel(obj);

    /* description might change: "towel" vs "moist towel" vs "wet towel" */
    if (carried(obj))
        update_inventory();
}

// src/weapon.c:1038 wet_a_towel()
export async function wet_a_towel(obj, amt, verbose) {
    const newspe = (amt <= 0) ? obj.spe - amt : amt;

    /* new state is only reported if it's an increase */
    if (newspe > obj.spe) {
        if (verbose) {
            const wetness = (newspe < 3)
                                ? (!obj.spe ? 'damp' : 'damper')
                                : (!obj.spe ? 'wet' : 'wetter');

            if (carried(obj))
                await pline(`${Yobjnam2(obj, null)} gets ${wetness}.`);
            else if (mcarried(obj) && canseemon(obj.ocarry))
                await pline(`${s_suffix(Monnam(obj.ocarry))} ${xname(obj)} gets ${wetness}.`);
        }
    }

    if (newspe !== obj.spe)
        finish_towel_change(obj, newspe);
}

// src/weapon.c:1092 skill_level_name()
export function skill_level_name(skill) {
    switch (P_SKILL(skill)) {
    case P_UNSKILLED:    return "Unskilled";
    case P_BASIC:        return "Basic";
    case P_SKILLED:      return "Skilled";
    case P_EXPERT:       return "Expert";
    /* these are for unarmed combat/martial arts only */
    case P_MASTER:       return "Master";
    case P_GRAND_MASTER: return "Grand Master";
    default:             return "Unknown";
    }
}

// src/weapon.c:1125 skill_name()
export function skill_name(skill) {
    return P_NAME(skill);
}

// src/weapon.c:1131 slots_required() — the # of slots to advance the skill.
function slots_required(skill) {
    const tmp = P_SKILL(skill);

    /* unskilled -> basic 1; basic -> skilled 2; skilled -> expert 3 */
    if (skill <= P_LAST_WEAPON || skill === P_TWO_WEAPON_COMBAT)
        return tmp;
    /* alternate for spells and bare hands/martial arts */
    return (tmp + 1) >> 1; /* half, rounded up */
}

// src/weapon.c can_advance() — can this skill be enhanced right now?
export function can_advance(skill, speedy) {
    const sk = game.u.weapon_skills?.[skill];
    if (!sk || sk.skill === P_ISRESTRICTED
        || sk.skill >= sk.max
        || (game.u.skills_advanced | 0) >= P_SKILL_LIMIT)
        return false;

    if (game.wizard && speedy)
        return true;

    return (sk.advance | 0) >= practice_needed_to_advance(sk.skill)
           && (game.u.weapon_slots | 0) >= slots_required(skill);
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
        if (is_axe(otmp) && is_wooden(ptr))
            bonus += rnd(4);
        if (oc.oc_material === MATERIALS.SILVER && mon_hates_silver(mon))
            bonus += rnd(20);
        /* artifact_light() is true only for lit Sunsword; gate the record on
           the pieces that exist so it cannot fire for ordinary weapons */
        if (otmp.oartifact && otmp.lamplit && hates_light(ptr)
            && note_dmgval_unported('artifact_light'))
            bonus += rnd(8);

        /* if the weapon is going to get a double damage bonus, adjust this
           bonus so that effectively it's added after the doubling */
        if (bonus > 1 && otmp.oartifact
            && note_dmgval_unported('spec_dbon') >= 25)
            bonus = ((bonus + 1) / 2) | 0;

        tmp += bonus;
    }

    if (tmp > 0) {
        tmp -= greatest_erosion(otmp);
        if (tmp < 1)
            tmp = 1;
    }

    return tmp;
}

// src/weapon.c:361 special_dmgval(), blessed and silver damage from worn
// equipment used in a non-weapon hit. The caller supplies a mutable output
// object because C returns the damage and writes the silver slot mask through
// a pointer.
export function special_dmgval(magr, mdef, armask, silverhitOut = null) {
    const leftRing = (armask & W_RINGL) !== 0;
    const rightRing = (armask & W_RINGR) !== 0;
    let obj = null, silverhit = 0, bonus = 0;

    if (armask & (W_ARMC | W_ARM | W_ARMU)) {
        if ((armask & W_ARMC) && (obj = which_armor(magr, W_ARMC)))
            armask = W_ARMC;
        else if ((armask & W_ARM) && (obj = which_armor(magr, W_ARM)))
            armask = W_ARM;
        else if ((armask & W_ARMU) && (obj = which_armor(magr, W_ARMU)))
            armask = W_ARMU;
        else
            armask = 0;
    } else if (armask & (W_ARMG | W_RINGL | W_RINGR)) {
        obj = which_armor(magr, W_ARMG);
        armask = obj ? W_ARMG : 0;
    } else {
        obj = which_armor(magr, armask);
    }

    if (obj) {
        if (obj.blessed && mon_hates_blessings(mdef))
            bonus += rnd(4);
        if (game.objects[obj.otyp].oc_material === MATERIALS.SILVER
            && mon_hates_silver(mdef)) {
            bonus += rnd(20);
            silverhit |= armask;
        }
    } else if ((leftRing || rightRing) && magr === game.youmonst) {
        const left = game.u.uleft, right = game.u.uright;

        if (leftRing && left
            && game.objects[left.otyp].oc_material === MATERIALS.SILVER
            && mon_hates_silver(mdef)) {
            bonus += rnd(20);
            silverhit |= W_RINGL;
        }
        if (rightRing && right
            && game.objects[right.otyp].oc_material === MATERIALS.SILVER
            && mon_hates_silver(mdef)) {
            if (!(silverhit & W_RINGL))
                bonus += rnd(20);
            silverhit |= W_RINGR;
        }
    }

    if (silverhitOut)
        silverhitOut.value = silverhit;
    return bonus;
}

// include/weight.h:18 WT_IRON_BALL_INCR — verified against the header, not
// recalled: the value was written from memory first and then checked.
const WT_IRON_BALL_INCR = 160;

// Predicates dmgval needs that are not ported. Each returns 0/false and is
// recorded by name, so game.unported says which one a divergence wanted.
function note_dmgval_unported(what) {
    (game.unported ||= new Set()).add('weapon:dmgval:' + what);
    return 0;
}

// src/weapon.c:476 oselect() — the first object of the given type in the
// monster's inventory that it can safely use.
function oselect(mtmp, type) {
    for (const otmp of (mtmp.minvent || [])) {
        if (otmp.otyp !== type)
            continue;

        /* never select non-cockatrice corpses */
        if ((type === ONAMES.CORPSE || type === ONAMES.EGG)
            && ((otmp.corpsenm ?? -1) === -1
                || !touch_petrifies(game.mons[otmp.corpsenm])))
            continue;

        if (!can_touch_safely(mtmp, otmp))
            continue;

        return otmp;
    }
    return null;
}

// src/weapon.c:691 hwep[] — hand-to-hand weapons in order of preference.
const hwep = () => {
    const O = ONAMES;
    return [
        O.CORPSE, /* cockatrice corpse */
        O.TSURUGI, O.RUNESWORD, O.DWARVISH_MATTOCK, O.TWO_HANDED_SWORD,
        O.BATTLE_AXE, O.KATANA, O.UNICORN_HORN, O.CRYSKNIFE, O.TRIDENT,
        O.LONG_SWORD, O.ELVEN_BROADSWORD, O.BROADSWORD, O.SCIMITAR,
        O.SILVER_SABER, O.MORNING_STAR, O.ELVEN_SHORT_SWORD,
        O.DWARVISH_SHORT_SWORD, O.SHORT_SWORD, O.ORCISH_SHORT_SWORD,
        O.SILVER_MACE, O.MACE, O.AXE, O.DWARVISH_SPEAR, O.SILVER_SPEAR,
        O.ELVEN_SPEAR, O.SPEAR, O.ORCISH_SPEAR, O.FLAIL, O.BULLWHIP,
        O.QUARTERSTAFF, O.JAVELIN, O.AKLYS, O.CLUB, O.PICK_AXE,
        O.RUBBER_HOSE, O.WAR_HAMMER, O.SILVER_DAGGER, O.ELVEN_DAGGER,
        O.DAGGER, O.ORCISH_DAGGER, O.ATHAME, O.SCALPEL, O.KNIFE,
        O.WORM_TOOTH,
    ];
};

// src/weapon.c:705 select_hwep() — select a hand to hand weapon for the
// monster.
export function select_hwep(mtmp) {
    const ptr = game.mons[mtmp.mnum];
    const strong = strongmonst(ptr);
    const wearing_shield = ((mtmp.misc_worn_check ?? 0) & W_ARMS) !== 0;

    /* prefer artifacts to everything else */
    for (const otmp of (mtmp.minvent || [])) {
        if (otmp.oclass === OCLASSES.WEAPON_CLASS && otmp.oartifact) {
            note_unported_weapon('select_hwep:artifact');
            break;
        }
    }

    if (ptr.mlet === MONSYMS.S_GIANT) { /* giants just love to use clubs */
        const otmp = oselect(mtmp, ONAMES.CLUB);
        if (otmp) return otmp;
    } else if (mtmp.mnum === PMNAMES.PM_BALROG && game.uwep) {
        const otmp = oselect(mtmp, ONAMES.BULLWHIP);
        if (otmp) return otmp;
    }

    /* only strong monsters can wield big (esp. long) weapons */
    /* big weapon is basically the same as bimanual */
    /* all monsters can wield the remaining weapons */
    for (const w of hwep()) {
        if (w === ONAMES.CORPSE && !((mtmp.misc_worn_check ?? 0) & W_ARMG)
            && !resists_ston(mtmp))
            continue;
        if (((strong && !wearing_shield) || !game.objects[w].oc_bimanual)
            && (game.objects[w].oc_material !== MATERIALS.SILVER
                || !mon_hates_silver(mtmp))) {
            const otmp = oselect(mtmp, w);
            if (otmp) return otmp;
        }
    }

    /* failure */
    return null;
}

// src/weapon.c:747 possibly_unwield() — called after polymorphing a monster,
// robbing it, etc., and before every mattackm weapon swing. The common case
// re-arms weapon_check = NEED_WEAPON so the next wield check re-evaluates;
// the stolen/destroyed and no-longer-AT_WEAP arms need states that are
// recorded when reached.
export async function possibly_unwield(mon, polyspot) {
    const mw_tmp = MON_WEP(mon);
    if (!mw_tmp)
        return;
    if (!(mon.minvent || []).includes(mw_tmp)) {
        /* The weapon was stolen or destroyed */
        mon.mw = null; /* MON_NOWEP */
        mon.weapon_check = NEED_WEAPON;
        return;
    }
    if (!attacktype(game.mons[mon.mnum], ATTKS.AT_WEAP)) {
        setmnotwielded(mon, mw_tmp);
        mon.weapon_check = NO_WEAPON_WANTED;
        if (cansee(mon.mx, mon.my)) {
            await pline(`${Monnam(mon)} drops ${distant_name(mw_tmp, doname)}.`);
            newsym(mon.mx, mon.my);
        }
        obj_extract_self(mw_tmp);
        const { flooreffects } = await import('./do.js');
        if (!await flooreffects(mw_tmp, mon.mx, mon.my, 'drop')) {
            if (polyspot) {
                mw_tmp.bypass = 1;
                (game.context ||= {}).bypasses = true;
            }
            place_object(mw_tmp, mon.mx, mon.my);
            stackobj(mw_tmp);
        }
        return;
    }
    /* Note that if there is no change, setting the check to NEED_WEAPON
     * is harmless. */
    if (!(mwelded_weapon(mw_tmp) && mon.weapon_check === NO_WEAPON_WANTED))
        mon.weapon_check = NEED_WEAPON;
}

// src/weapon.c:801 mon_wield_item() — let a monster try to wield a weapon,
// based on mon->weapon_check. Returns 1 if the monster took time to do it,
// 0 if it did not.
//
// The NEED_HTH_WEAPON and pick/axe arms are ported; NEED_RANGED_WEAPON needs
// select_rwep() (the throwing subsystem) and is recorded. The messages for a
// welded (cursed) weapon need Tobjnam/mbodypart and are recorded, but the
// state changes they accompany still happen.
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
        obj = game.propellor;
        break;
    case NEED_PICK_AXE:
        obj = m_carrying(mon, ONAMES.PICK_AXE);
        /* KMH -- allow other picks */
        if (!obj && !which_armor(mon, W_ARMS))
            obj = m_carrying(mon, ONAMES.DWARVISH_MATTOCK);
        exclaim = false; /* mon is just planning to dig */
        break;
    case NEED_AXE:
        /* currently, only 2 types of axe */
        obj = m_carrying(mon, ONAMES.BATTLE_AXE);
        if (!obj || which_armor(mon, W_ARMS))
            obj = m_carrying(mon, ONAMES.AXE);
        exclaim = false;
        break;
    case NEED_PICK_OR_AXE:
        /* prefer pick for fewer switches on most levels */
        obj = m_carrying(mon, ONAMES.DWARVISH_MATTOCK);
        if (!obj)
            obj = m_carrying(mon, ONAMES.BATTLE_AXE);
        if (!obj || which_armor(mon, W_ARMS)) {
            obj = m_carrying(mon, ONAMES.PICK_AXE);
            if (!obj)
                obj = m_carrying(mon, ONAMES.AXE);
        }
        exclaim = false;
        break;
    default:
        /* impossible("weapon_check %d for %s?") */
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
        if (mw_tmp && mwelded_weapon(mw_tmp)) {
            if (canseemon(mon))
                note_unported_weapon('mon_wield_item:welded_msg');
            mw_tmp.bknown = 1;
            mon.weapon_check = NO_WEAPON_WANTED;
            return 1;
        }
        mon.mw = obj; /* wield obj */
        setmnotwielded(mon, mw_tmp);
        mon.weapon_check = NEED_WEAPON;
        if (canseemon(mon)) {
            await pline(`${Monnam(mon)} wields ${doname(obj)}${
                exclaim ? '!' : '.'}`);
            if (autoreturn_weapon(obj)?.tethered)
                await pline(`${Monnam(mon)} secures the tether on ${
                    the(xname(obj))}.`);

            /* 3.6.3: mwelded() predicate expects the object to have its
               W_WEP bit set in owornmask */
            obj.owornmask = (obj.owornmask ?? 0) | W_WEP;
            const newly_welded = mwelded_weapon(obj);
            obj.owornmask &= ~W_WEP;
            if (newly_welded) {
                const { mbodypart } = await import('./polyself.js');
                let mon_hand = mbodypart(mon, HAND);
                if (bimanual(obj))
                    mon_hand = makeplural(mon_hand);
                await pline(`${Tobjnam(obj, 'weld')} ${
                    is_plural(obj) ? 'themselves' : 'itself'} to ${
                    s_suffix(mon_nam(mon))} ${mon_hand}!`);
                obj.bknown = 1;
            }
        }
        if (obj.oartifact)
            note_unported_weapon('mon_wield_item:artifact_light');
        obj.owornmask = W_WEP;
        return 1;
    }
    mon.weapon_check = NEED_WEAPON;
    return 0;
}

// src/weapon.c:937 mwepgone() — force monster to stop wielding current
// weapon, if any.
export function mwepgone(mon) {
    const mwep = MON_WEP(mon);

    if (mwep) {
        setmnotwielded(mon, mwep);
        mon.weapon_check = NEED_WEAPON;
    }
}

/* src/wield.c:63 erodeable_wep(), :68 will_weld(), :1078 mwelded() — local
   twin of the copy in js/monmove.js, for the same import-cycle reason. */
function mwelded_weapon(obj) {
    return obj && obj.cursed && ((obj.owornmask ?? 0) & W_WEP) !== 0
        && (obj.oclass === OCLASSES.WEAPON_CLASS || is_weptool(obj, game.objects));
}

// src/weapon.c:1814 setmnotwielded()
export function setmnotwielded(mon, obj) {
    if (!obj)
        return;
    if (obj.oartifact && obj.lamplit)
        note_unported_weapon('setmnotwielded:artifact_light');
    if (MON_WEP(mon) === obj)
        mon.mw = null; /* MON_NOWEP */
    obj.owornmask = (obj.owornmask ?? 0) & ~W_WEP;
}

// src/weapon.c uwep_skill_type()
function uwep_skill_type() {
    if (game.u.twoweap)
        return P_TWO_WEAPON_COMBAT;
    return weapon_type(game.u.uwep);
}

// src/weapon.c weapon_dam_bonus() — the DAMAGE adjustment from skill.
// Draws nothing; three ladders plus the riding rider.
export function weapon_dam_bonus(weapon) {
    let type, skill, bonus = 0;

    const wep_type = weapon_type(weapon);
    /* use two weapon skill only if attacking with one of the wielded ones */
    type = (game.u.twoweap
            && (weapon === game.u.uwep || weapon === game.u.uswapwep))
               ? P_TWO_WEAPON_COMBAT
               : wep_type;
    if (type === P_NONE) {
        bonus = 0;
    } else if (type <= P_LAST_WEAPON) {
        switch (P_SKILL(type)) {
        default: /* impossible("weapon_dam_bonus: bad skill") */
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
        bonus = P_SKILL(type);
        bonus = Math.max(bonus, P_UNSKILLED) - 1; /* unskilled => 0 */
        bonus = Math.trunc((bonus + 1) * (martial_bonus() ? 3 : 1) / 2);
    }

    /* KMH -- Riding gives some thrusting damage */
    if (game.u.usteed && type !== P_TWO_WEAPON_COMBAT) {
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

// src/weapon.c:1130 give_may_advance_msg()
async function give_may_advance_msg(skill) {
    await You_feel(`more confident in your ${
        (skill === P_NONE) ? ''
            : (skill <= P_LAST_WEAPON) ? 'weapon '
                : (skill <= P_LAST_SPELL) ? 'spell casting '
                    : 'fighting '}skills.`);
}

// src/weapon.c use_skill() — practice toward the next skill level.
export async function use_skill(skill, degree) {
    if (skill !== P_NONE
        && P_SKILL(skill) !== P_ISRESTRICTED) {
        const advance_before = can_advance(skill, false);
        game.u.weapon_skills[skill].advance += degree;
        if (!advance_before && can_advance(skill, false))
            await give_may_advance_msg(skill);
    }
}

// src/weapon.c add_weapon_skill(). Grant slots and announce newly available
// skill advances.
export async function add_weapon_skill(n) {
    let before = 0, after = 0;
    for (let i = 0; i < P_NUM_SKILLS; i++)
        if (can_advance(i, false))
            before++;
    game.u.weapon_slots = (game.u.weapon_slots | 0) + n;
    for (let i = 0; i < P_NUM_SKILLS; i++)
        if (can_advance(i, false))
            after++;
    if (before < after)
        await give_may_advance_msg(P_NONE);
}

export { uwep_skill_type };

// src/weapon.c:1173 could_advance() — advanceable if more slots existed.
function could_advance(skill) {
    const sk = game.u.weapon_skills?.[skill];
    if (!sk || sk.skill === P_ISRESTRICTED
        || sk.skill >= sk.max
        || (game.u.skills_advanced | 0) >= P_SKILL_LIMIT)
        return false;
    return (sk.advance | 0) >= practice_needed_to_advance(sk.skill);
}

// src/weapon.c:1187 peaked_skill() — maxed out with surplus practice.
function peaked_skill(skill) {
    const sk = game.u.weapon_skills?.[skill];
    if (!sk || sk.skill === P_ISRESTRICTED)
        return false;
    return sk.skill >= sk.max
           && (sk.advance | 0) >= practice_needed_to_advance(sk.skill);
}

// src/weapon.c:1198 skill_advance()
async function skill_advance(skill) {
    const { You } = await import('./pline.js');
    const u = game.u;
    u.weapon_slots -= slots_required(skill);
    game.u.weapon_skills[skill].skill++;
    (u.skill_record ||= [])[u.skills_advanced = (u.skills_advanced | 0)] = skill;
    u.skills_advanced++;
    /* subtly change the advance message to indicate no more advancement */
    await You(`are now ${
        P_SKILL(skill) >= game.u.weapon_skills[skill].max ? 'most' : 'more'
        } skilled in ${P_NAME(skill)}.`);
    /* skill_based_spellbook_id() for spell schools: no unknown books yet */
}

// src/weapon.c:1217 skill_ranges[]
const skill_ranges = [
    { first: P_FIRST_H_TO_H, last: P_LAST_H_TO_H, name: 'Fighting Skills' },
    { first: P_FIRST_WEAPON, last: P_LAST_WEAPON, name: 'Weapon Skills' },
    { first: P_FIRST_SPELL, last: P_LAST_SPELL, name: 'Spellcasting Skills' },
];

// src/weapon.c:1229 add_skills_to_menu()
function add_skills_to_menu(win, selectable, speedy, ttyfns) {
    const { tty_add_menu, tty_add_menu_str, ATR_NONE_T, NO_COLOR_T } = ttyfns;

    /* Find the longest skill name. */
    let longest = 0;
    for (let i = 0; i < P_NUM_SKILLS; i++) {
        if (P_SKILL(i) === P_ISRESTRICTED)
            continue;
        const len = P_NAME(i).length;
        if (len > longest)
            longest = len;
    }

    for (const range of skill_ranges)
        for (let i = range.first; i <= range.last; i++) {
            if (i === range.first) {
                /* add_menu_heading: menu_headings attr (ATR_INVERSE) */
                tty_add_menu(win, null, 0, 0, 0, 7 /* NH ATR_INVERSE */,
                             NO_COLOR_T, range.name, 0);
            }
            if (P_SKILL(i) === P_ISRESTRICTED)
                continue;
            let prefix;
            if (!selectable)
                prefix = '';
            else if (can_advance(i, speedy))
                prefix = ''; /* will be preceded by menu choice */
            else if (could_advance(i))
                prefix = '  * ';
            else if (peaked_skill(i))
                prefix = '  # ';
            else
                prefix = '    ';
            const sklnam = skill_level_name(i);
            let buf;
            if (game.wizard) {
                buf = ` ${prefix}${P_NAME(i).padEnd(longest)} ${
                    sklnam.padEnd(12)} ${
                    String(game.u.weapon_skills[i].advance | 0).padStart(5)}(${
                    String(practice_needed_to_advance(P_SKILL(i))).padStart(4)})`;
            } else {
                buf = ` ${prefix} ${P_NAME(i).padEnd(longest)} [${sklnam}]`;
            }
            const id = (selectable && can_advance(i, speedy)) ? i + 1 : 0;
            tty_add_menu(win, null, id, 0, 0, 0 /* ATR_NONE */, NO_COLOR_T,
                         buf, 0);
        }
}

// src/weapon.c:1329 enhance_weapon_skill() — the #enhance command.
export async function enhance_weapon_skill() {
    const {
        tty_create_nhwindow, tty_destroy_nhwindow, tty_start_menu,
        tty_add_menu, tty_add_menu_str, tty_end_menu, tty_select_menu,
        NHW_MENU,
    } = await import('./tty/wintty.js');
    const { NO_COLOR } = await import('./terminal.js');
    const { tty_yn_function } = await import('./tty/topl.js');
    const plur = (n) => (n === 1 ? '' : 's');
    let speedy = false;

    if (game.wizard
        && (await tty_yn_function('Advance skills without practice?',
                                  'yn', 'n')) === 'y')
        speedy = true;

    for (;;) {
        /* count advanceable skills */
        let to_advance = 0, eventually_advance = 0, maxxed_cnt = 0;
        for (let i = 0; i < P_NUM_SKILLS; i++) {
            if (P_SKILL(i) === P_ISRESTRICTED)
                continue;
            if (can_advance(i, speedy))
                to_advance++;
            else if (could_advance(i))
                eventually_advance++;
            else if (peaked_skill(i))
                maxxed_cnt++;
        }

        const win = tty_create_nhwindow(NHW_MENU);
        tty_start_menu(win, 0);

        if (eventually_advance > 0 || maxxed_cnt > 0) {
            if (eventually_advance > 0)
                tty_add_menu_str(win,
                    `(Skill${plur(eventually_advance)} flagged by "*" may be `
                    + `enhanced ${(game.u.ulevel < 30)
                        ? "when you're more experienced"
                        : 'if skill slots become available'}.)`);
            if (maxxed_cnt > 0)
                tty_add_menu_str(win,
                    `(Skill${plur(maxxed_cnt)} flagged by "#" cannot be `
                    + 'enhanced any further.)');
            tty_add_menu_str(win, '');
        }

        add_skills_to_menu(win,
            to_advance + eventually_advance + maxxed_cnt > 0, speedy,
            { tty_add_menu, tty_add_menu_str, NO_COLOR_T: NO_COLOR });

        let buf = (to_advance > 0) ? 'Pick a skill to advance:'
                                   : 'Current skills:';
        if (game.wizard && !speedy)
            buf += `  (${game.u.weapon_slots | 0} slot${
                plur(game.u.weapon_slots | 0)} available)`;
        tty_end_menu(win, buf);
        const picks = await tty_select_menu(
            win, to_advance ? 1 /* PICK_ONE */ : 0 /* PICK_NONE */);
        tty_destroy_nhwindow(win);
        if (picks && picks.length > 0) {
            const n = picks[0] - 1; /* get item selected */
            await skill_advance(n);
            /* check for more skills able to advance; if so, loop */
            let more = 0;
            for (let i = 0; i < P_NUM_SKILLS; i++) {
                if (can_advance(i, speedy)) {
                    if (!speedy) {
                        const { You_feel } = await import('./pline.js');
                        await You_feel('you could be more dangerous!');
                    }
                    more++;
                    break;
                }
            }
            if (speedy && more)
                continue;
        }
        break;
    }
    return 0; /* ECMD_OK */
}

// src/weapon.c:1476 drain_weapon_skill() — amnesia: lose n advanced skills
// a level each, giving the slots back.
export async function drain_weapon_skill(n) {
    const u = game.u;
    const sk = u.weapon_skills;
    const tmpskills = new Array(P_NUM_SKILLS).fill(0);
    let skill, i, curradv, prevadv;

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
            /* if (P_SKILL(skill) <= P_UNSKILLED) panic("drain_weapon_skill") */
            sk[skill].skill--;   /* drop skill one level */
            /* refund slots used for that level */
            u.weapon_slots = (u.weapon_slots | 0) + slots_required(skill);
            /* drain a random proportion of the practice */
            curradv = practice_needed_to_advance(sk[skill].skill);
            prevadv = practice_needed_to_advance(sk[skill].skill - 1);
            if (sk[skill].advance >= curradv)
                sk[skill].advance = prevadv + rn2(curradv - prevadv);
        }
    }
    for (skill = 0; skill < P_NUM_SKILLS; skill++)
        if (tmpskills[skill]) {
            await You(`forget ${sk[skill].skill >= P_BASIC ? 'some of ' : ''}your training in ${P_NAME(skill)}.`);
        }
}
