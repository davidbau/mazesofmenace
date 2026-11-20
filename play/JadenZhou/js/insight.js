// insight.js — enlightenment, conduct and attribute descriptions.
// C ref: insight.c
//
// Ported so far: align_str(), and the ^X command doattributes() with
// enlightenment()'s basic sections (background, basics, characteristics,
// status, weapon insight, miscellaneous). attributes_enlightenment() (magic
// enlightenment: wizard and explore mode ^X, potions, end of game) and the
// polymorph, steed, trap, engulf, punishment &c. branches are not ported
// yet; each stops with a "not ported yet" error where C would print.
//
// A few helpers from other C files that nothing else in js/ has yet are
// kept here as local functions, each with its own C ref (weapon.c
// skill_level_name()/skill_name()/can_advance()/weapon_descr(), wield.c
// empty_handed(), invent.c hidden_gold()/currency(), polyself.c
// body_part(), shk.c costly_spot(), options.c oc_to_str()).

import { game } from './gstate.js';
import {
    A_CHAOTIC, A_NEUTRAL, A_LAWFUL, A_NONE, A_STR, A_INT, A_WIS, A_DEX,
    A_CON, A_CHA, A_CURRENT, A_ORIGINAL, NHW_MENU, PICK_NONE,
    MENU_BEHAVE_STANDARD, BASICENLIGHTENMENT, MAGICENLIGHTENMENT,
    ENL_GAMEINPROGRESS, ENL_GAMEOVERDEAD, ROLE_GENDMASK, ROLE_MALE,
    ROLE_FEMALE, RIGHT_HANDED, HANDED, LEG, FULL_MOON, NEW_MOON, AC_MAX,
    UNENCUMBERED, SLT_ENCUMBER, MOD_ENCUMBER, HVY_ENCUMBER, EXT_ENCUMBER,
    OVERLOADED, STUNNED, CONFUSION, BLINDED, DEAF, SICK, STONED, STRANGLED,
    VOMITING, GLIB, SLIMED, HALLUC, HALLUC_RES, FUMBLING, WOUNDED_LEGS,
    SLEEPY, HUNGER, LEVITATION, FLYING, WWALKING, FIXED_ABIL, TIMEOUT,
    FROMOUTSIDE, FROMFORM, I_SPECIAL, W_ARTI, W_ARMOR, W_AMUL, W_RING,
    W_TOOL, SICK_NONVOMITABLE, SICK_VOMITABLE, BOTH_SIDES, LEFT_SIDE,
    P_NONE, P_ISRESTRICTED, P_UNSKILLED, P_BASIC, P_SKILLED, P_EXPERT,
    P_MASTER, P_GRAND_MASTER, P_BARE_HANDED_COMBAT, P_LAST_WEAPON,
    P_TWO_WEAPON_COMBAT, P_SKILL_LIMIT, P_SLING, P_BOW, P_CROSSBOW,
    P_FLAIL, P_PICK_AXE, Is_waterlevel, In_endgame, In_quest, WIN_ERR,
} from './const.js';
import {
    tty_create_nhwindow, tty_start_menu, add_menu_str, tty_end_menu,
    tty_select_menu, tty_destroy_nhwindow,
} from './wintty.js';
import {
    objects, OBJ_NAME, WEAPON_CLASS, GEM_CLASS, COIN_CLASS,
    GAUNTLETS_OF_POWER, DUNCE_CAP, SHIELD_OF_REFLECTION, TOWEL, CORPSE, TIN,
    EGG, STATUE, BOULDER, TIN_OPENER, ROCK, GRAPPLING_HOOK, DWARVISH_MATTOCK,
    LUCKSTONE, LOADSTONE, FLINT, TOUCHSTONE, DAGGER, KNIFE, AXE, PICK_AXE,
    SHORT_SWORD, BROADSWORD, LONG_SWORD, TWO_HANDED_SWORD, CLUB, MACE,
    MORNING_STAR, FLAIL, QUARTERSTAFF, SPEAR, TRIDENT, LANCE, BOW, SLING,
    CROSSBOW, DART, SHURIKEN, BOOMERANG, UNICORN_HORN,
} from './objects.js';
import * as M from './monsters.js';
import { rank_of } from './botl.js';
import { an, makeplural, makesingular } from './objnam.js';
import { strstri, highc, lowc, mungspaces } from './hacklib.js';
import { align_gname } from './pray.js';
import { genders } from './role.js';
import { newuexp } from './exper.js';
import { night, midnight } from './calendar.js';
import { depth, dunlev, on_level } from './dungeon.js';
import { find_ac, money_cnt } from './u_init.js';
import { near_capacity, inv_weight } from './hack.js';
import { ACURR, ABASE, AMAX, ATTRMAX } from './attrib.js';
import { P_SKILL, P_MAX_SKILL, P_ADVANCE, P_RESTRICTED, weapon_type,
         practice_needed_to_advance } from './weapon.js';
import { def_oc_syms } from './drawing.js';
import { is_pool, is_lava } from './makemon.js';
import { ART_OGRESMASHER } from './artilist.js';

// C ref: insight.c align_str()
export function align_str(alignment) {
    switch (alignment) {
    case A_CHAOTIC:
        return "chaotic";
    case A_NEUTRAL:
        return "neutral";
    case A_LAWFUL:
        return "lawful";
    case A_NONE:
        return "unaligned";
    }
    return "unknown";
}

// ---------------------------------------------------------------------------
// local helpers: hero state macros (you.h, youprop.h) and small functions
// from other C files

function U() { return game.u; }
function wizard() { return !!game.flags?.debug; }
function discover() { return !!game.flags?.explore; }
function prop(p) { return game.u.uprops[p] || { intrinsic: 0, extrinsic: 0, blocked: 0 }; }

/* C ref: you.h Upolyd, URIGHTY, Role_if() */
function Upolyd() { return U().umonnum !== U().umonster; }
function URIGHTY() { return U().uhandedness === RIGHT_HANDED; }
function Role_if(pm) { return game.urole.mnum === pm; }

/* C ref: youprop.h */
function HLevitation() { return prop(LEVITATION).intrinsic; }
function ELevitation() { return prop(LEVITATION).extrinsic; }
function Levitation() {
    return (HLevitation() || ELevitation()) && !prop(LEVITATION).blocked;
}
function Lev_at_will() {
    return ((HLevitation() & I_SPECIAL) !== 0 || (ELevitation() & W_ARTI) !== 0)
           && (HLevitation() & ~(I_SPECIAL | TIMEOUT)) === 0
           && (ELevitation() & ~W_ARTI) === 0;
}
function Flying() {
    /* u.usteed && is_flyer(u.usteed->data): Riding stops earlier */
    return (prop(FLYING).intrinsic || prop(FLYING).extrinsic)
           && !prop(FLYING).blocked;
}
function Wwalking() {
    return (prop(WWALKING).intrinsic || prop(WWALKING).extrinsic)
           && !Is_waterlevel(U().uz);
}
function Underwater() { return U().uinwater; }
function Stoned() { return prop(STONED).intrinsic; }
function Slimed() { return prop(SLIMED).intrinsic; }
function Strangled() { return prop(STRANGLED).intrinsic; }
function Sick() { return prop(SICK).intrinsic; }
function Vomiting() { return prop(VOMITING).intrinsic; }
function Stunned() { return prop(STUNNED).intrinsic; }
function Confusion() { return prop(CONFUSION).intrinsic; }
function Hallucination() {
    return prop(HALLUC).intrinsic
           && !(prop(HALLUC_RES).intrinsic || prop(HALLUC_RES).extrinsic);
}
function HBlinded() { return prop(BLINDED).intrinsic; }
function Blindfolded() { return prop(BLINDED).extrinsic; }
function Blinded() { return HBlinded() && !prop(BLINDED).blocked; }
function BlindedTimeout() { return HBlinded() & TIMEOUT; }
function Blindfolded_only() { return Blindfolded() && !Blinded(); }
function Blind() {
    return (HBlinded() || Blindfolded()) && !prop(BLINDED).blocked;
}
function Deaf() {
    return prop(DEAF).intrinsic || prop(DEAF).extrinsic || U().uroleplay?.deaf;
}
function Punished() { return !!game.uball; }
function EWounded_legs() { return prop(WOUNDED_LEGS).extrinsic; }
function Wounded_legs() {
    return prop(WOUNDED_LEGS).intrinsic || prop(WOUNDED_LEGS).extrinsic;
}
function Glib() { return prop(GLIB).intrinsic; }
function Fumbling() { return prop(FUMBLING).intrinsic || prop(FUMBLING).extrinsic; }
function HSleepy() { return prop(SLEEPY).intrinsic; }
function Sleepy() { return prop(SLEEPY).intrinsic || prop(SLEEPY).extrinsic; }
function Hunger() { return prop(HUNGER).intrinsic || prop(HUNGER).extrinsic; }
function Fixed_abil() { return prop(FIXED_ABIL).extrinsic; }

/* C ref: mondata.h humanoid(), haseyes() */
function humanoid(ptr) { return (ptr.mflags1 & M.M1_HUMANOID) !== 0; }
function haseyes(ptr) { return (ptr.mflags1 & M.M1_NOEYES) === 0; }

/* C ref: obj.h is_ammo(), is_wet_towel(), is_graystone(); u_wield_art() */
function is_ammo(otmp) {
    return ((otmp.oclass === WEAPON_CLASS || otmp.oclass === GEM_CLASS)
            && objects[otmp.otyp].oc_skill >= -P_CROSSBOW
            && objects[otmp.otyp].oc_skill <= -P_BOW);
}
function is_wet_towel(o) { return o.otyp === TOWEL && o.spe > 0; }
function is_graystone(obj) {
    return (obj.otyp === LUCKSTONE || obj.otyp === LOADSTONE
            || obj.otyp === FLINT || obj.otyp === TOUCHSTONE);
}
function u_wield_art(art) { return !!game.uwep && game.uwep.oartifact === art; }

/* C ref: hacklib.c plur(), strsubst() (first occurrence only) */
function plur(x) { return (x === 1) ? "" : "s"; }
function strsubst(bp, orig, replacement) {
    const at = bp.indexOf(orig);
    return (at < 0) ? bp : bp.slice(0, at) + replacement + bp.slice(at + orig.length);
}

/* C ref: eat.c hu_stat[], botl.c enc_stat[], attrib.c attrname[] */
const hu_stat = [
    "Satiated", "        ", "Hungry  ", "Weak    ",
    "Fainting", "Fainted ", "Starved "
];
const enc_stat = [
    "",         "Burdened",  "Stressed",
    "Strained", "Overtaxed", "Overloaded"
];
const attrname = [ "strength", "intelligence", "wisdom",
                   "dexterity", "constitution", "charisma" ];

// C ref: attrib.c from_what() -- the source of a property is only
// reported in debug mode
function from_what(propidx) {
    if (wizard())
        throw new Error('from_what(): debug mode property sources not ported yet');
    void propidx;
    return "";
}

// C ref: polyself.c body_part() -- mbodypart(&youmonst, part) for the
// hero's own (unpolymorphed, humanoid) form
function body_part(part) {
    const mptr = game.youmonst?.data;
    if (Upolyd() || !mptr || !humanoid(mptr)
        || mptr.mlet === M.S_DOG || mptr.mlet === M.S_FELINE
        || mptr.mlet === M.S_RODENT || mptr.mlet === M.S_YETI)
        throw new Error('body_part(): non-humanoid hero form not ported yet');
    const humanoid_parts = [ "arm",       "eye",  "face",         "finger",
                             "fingertip", "foot", "hand",         "handed",
                             "head",      "leg",  "light headed", "neck",
                             "spine",     "toe",  "hair",         "blood",
                             "lung",      "nose", "stomach" ];
    return humanoid_parts[part];
}

// C ref: invent.c contained_gold()
function contained_gold(obj, even_if_unknown) {
    let value = 0;

    /* objects other than coins won't have any gold inside them */
    for (let otmp = obj.cobj; otmp; otmp = otmp.nobj)
        if (otmp.oclass === COIN_CLASS)
            value += otmp.quan;
        else if (otmp.cobj && (otmp.cknown || even_if_unknown))
            value += contained_gold(otmp, even_if_unknown);
    return value;
}

// C ref: invent.c hidden_gold()
function hidden_gold(even_if_unknown) {
    let value = 0;

    for (let obj = game.invent; obj; obj = obj.nobj)
        if (obj.cobj && (obj.cknown || even_if_unknown))
            value += contained_gold(obj, even_if_unknown);
    return value;
}

// C ref: invent.c currency()
function currency(amount) {
    let res;

    if (Hallucination())
        throw new Error('currency(): hallucinatory currency (ROLL_FROM) not ported yet');
    res = "zorkmid";
    if (amount !== 1)
        res = makeplural(res);
    return res;
}

// C ref: shk.c costly_spot()
function costly_spot(x, y) {
    if (!game.level.flags?.has_shop)
        return false;
    void x, y;
    throw new Error('costly_spot(): shops not ported yet');
}

// C ref: options.c oc_to_str()
function oc_to_str(src) {
    let dest = '';
    for (const c of src || '')
        dest += def_oc_syms[c.charCodeAt(0)];
    return dest;
}

// C ref: wield.c empty_handed()
/* description of hands when not wielding anything */
function empty_handed() {
    return game.uarmg ? "empty handed" /* gloves imply hands */
           : humanoid(game.youmonst.data)
             /* hands but no weapon and no gloves */
             ? "bare handed"
               /* alternate phrasing for paws or lack of hands */
               : "not wielding anything";
}

/* C ref: weapon.c skill_names_indices[], odd_skill_names[],
   barehands_or_martial[], P_NAME() */
const PN_BARE_HANDED = -1, PN_TWO_WEAPONS = -2, PN_RIDING = -3,
    PN_POLEARMS = -4, PN_SABER = -5, PN_HAMMER = -6, PN_WHIP = -7,
    PN_ATTACK_SPELL = -8, PN_HEALING_SPELL = -9, PN_DIVINATION_SPELL = -10,
    PN_ENCHANTMENT_SPELL = -11, PN_CLERIC_SPELL = -12, PN_ESCAPE_SPELL = -13,
    PN_MATTER_SPELL = -14;
const skill_names_indices = [
    /* Weapon */
    0, DAGGER, KNIFE, AXE, PICK_AXE, SHORT_SWORD, BROADSWORD, LONG_SWORD,
    TWO_HANDED_SWORD, PN_SABER, CLUB, MACE, MORNING_STAR, FLAIL, PN_HAMMER,
    QUARTERSTAFF, PN_POLEARMS, SPEAR, TRIDENT, LANCE, BOW, SLING, CROSSBOW,
    DART, SHURIKEN, BOOMERANG, PN_WHIP, UNICORN_HORN,
    /* Spell */
    PN_ATTACK_SPELL, PN_HEALING_SPELL, PN_DIVINATION_SPELL,
    PN_ENCHANTMENT_SPELL, PN_CLERIC_SPELL, PN_ESCAPE_SPELL, PN_MATTER_SPELL,
    /* Other */
    PN_BARE_HANDED, PN_TWO_WEAPONS, PN_RIDING
];
const odd_skill_names = [
    "no skill", "bare hands", /* use barehands_or_martial[] instead */
    "two weapon combat", "riding", "polearms", "saber", "hammer", "whip",
    "attack spells", "healing spells", "divination spells",
    "enchantment spells", "clerical spells", "escape spells", "matter spells",
];
const barehands_or_martial = [
    "bare handed combat", "martial arts"
];
/* C ref: skills.h martial_bonus() */
function martial_bonus() { return Role_if(M.PM_SAMURAI) || Role_if(M.PM_MONK); }
function P_NAME(type) {
    return (skill_names_indices[type] > 0)
           ? OBJ_NAME(objects[skill_names_indices[type]])
           : (type === P_BARE_HANDED_COMBAT)
             ? barehands_or_martial[martial_bonus() ? 1 : 0]
             : odd_skill_names[-skill_names_indices[type]];
}

/* C ref: drawing.c def_oc_syms[].name */
const def_oc_names = [
    "illegal objects", "weapon", "armor", "ring", "amulet", "tool", "food",
    "potion", "scroll", "spellbook", "wand", "coin", "gem",
    "boulder or statue", "iron ball", "iron chain", "venom",
];

// C ref: weapon.c weapon_descr()
/* weapon's skill category name for use as generalized description of
   weapon */
function weapon_descr(obj) {
    const skill = weapon_type(obj);
    let descr = P_NAME(skill);

    /* assorted special cases */
    switch (skill) {
    case P_NONE:
        /* not a weapon or weptool: use item class name;
           override class name for things where it sounds strange and
           for things that aren't unexpected to find being wielded */
        descr = (obj.otyp === CORPSE || obj.otyp === TIN || obj.otyp === EGG
                 || obj.otyp === STATUE || obj.otyp === BOULDER
                 || obj.otyp === TOWEL || obj.otyp === TIN_OPENER)
                ? OBJ_NAME(objects[obj.otyp])
                : obj.globby ? "glob"
                  : def_oc_names[obj.oclass];
        break;
    case P_SLING:
        if (is_ammo(obj))
            descr = (obj.otyp === ROCK || is_graystone(obj))
                        ? "stone"
                        /* avoid "rock"; what about known glass? */
                        : (obj.oclass === GEM_CLASS)
                            ? "gem"
                            /* in case somebody adds odd sling ammo */
                            : def_oc_names[obj.oclass];
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
        if (obj.otyp === GRAPPLING_HOOK)
            descr = "hook";
        break;
    case P_PICK_AXE:
        /* even if "dwarvish mattock" hasn't been discovered yet */
        if (obj.otyp === DWARVISH_MATTOCK)
            descr = "mattock";
        break;
    default:
        break;
    }
    return makesingular(descr);
}

// C ref: weapon.c skill_level_name()
/* the skill level name */
function skill_level_name(skill) {
    let ptr;

    switch (P_SKILL(skill)) {
    case P_UNSKILLED:
        ptr = "Unskilled";
        break;
    case P_BASIC:
        ptr = "Basic";
        break;
    case P_SKILLED:
        ptr = "Skilled";
        break;
    case P_EXPERT:
        ptr = "Expert";
        break;
    /* these are for unarmed combat/martial arts only */
    case P_MASTER:
        ptr = "Master";
        break;
    case P_GRAND_MASTER:
        ptr = "Grand Master";
        break;
    default:
        ptr = "Unknown";
        break;
    }
    return ptr;
}

// C ref: weapon.c skill_name()
function skill_name(skill) {
    return P_NAME(skill);
}

// C ref: weapon.c slots_required()
/* return the # of slots required to advance the skill */
function slots_required(skill) {
    const tmp = P_SKILL(skill);

    /* The more difficult the training, the more slots it takes. */
    if (skill <= P_LAST_WEAPON || skill === P_TWO_WEAPON_COMBAT)
        return tmp;

    /* Fewer slots used up for unarmed or martial. */
    return Math.trunc((tmp + 1) / 2);
}

// C ref: weapon.c can_advance()
/* return true if this skill can be advanced */
function can_advance(skill, speedy) {
    const u = U();
    if (P_RESTRICTED(skill)
        || P_SKILL(skill) >= P_MAX_SKILL(skill)
        || (u.skills_advanced || 0) >= P_SKILL_LIMIT)
        return false;

    if (wizard() && speedy)
        return true;

    return (P_ADVANCE(skill) >= practice_needed_to_advance(P_SKILL(skill))
            && (u.weapon_slots || 0) >= slots_required(skill));
}

// ---------------------------------------------------------------------------
// enlightenment output

/* C ref: insight.c You_, are, were, have, had, can, could */
const You_ = "You ", are = "are ", were = "were ",
    have = "have ", had = "had ", can = "can ", could = "could ";

/* C ref: insight.c enl_msg(), you_are(), you_have(), you_can() macros;
   'final' is enlightenment()'s argument, kept in ge.en_final here */
function enl_msg(prefix, present, past, suffix, ps) {
    enlght_line(prefix, game.en_final ? past : present, suffix, ps);
}
function you_are(attr, ps) { enl_msg(You_, are, were, attr, ps); }
function you_have(attr, ps) { enl_msg(You_, have, had, attr, ps); }
function you_can(attr, ps) { enl_msg(You_, can, could, attr, ps); }
void you_can;

// C ref: insight.c enlght_out()
function enlght_out(buf) {
    if (game.en_via_menu) {
        add_menu_str(game.en_win, buf);
    } else
        throw new Error('enlght_out(): putstr() to a text window not ported yet');
}

// C ref: insight.c enlght_line()
function enlght_line(start, middle, end, ps) {
    const contra = [
        { twowords: " are not ", contrctn: " aren't " },
        { twowords: " were not ", contrctn: " weren't " },
        { twowords: " have not ", contrctn: " haven't " },
        { twowords: " had not ", contrctn: " hadn't " },
        { twowords: " can not ", contrctn: " can't " },
        { twowords: " could not ", contrctn: " couldn't " },
    ];
    let buf;

    buf = ` ${start}${middle}${end}${ps}.`;
    if (strstri(buf, " not ")) { /* TODO: switch to libc strstr() */
        for (let i = 0; i < contra.length; ++i)
            buf = strsubst(buf, contra[i].twowords, contra[i].contrctn);
    }
    enlght_out(buf);
}

// C ref: insight.c walking_on_water()
/* is hero actively using water walking capability on water (or lava)? */
function walking_on_water() {
    if (U().uinwater || Levitation() || Flying())
        return false;
    return !!(Wwalking() && (is_pool(U().ux, U().uy) || is_lava(U().ux, U().uy)));
}

// C ref: insight.c cause_known()
/* check whether hero is wearing something that player definitely knows
   confers the target property */
function cause_known(propindx) {
    const mask = W_ARMOR | W_AMUL | W_RING | W_TOOL;

    for (let o = game.invent; o; o = o.nobj) {
        if (!(o.owornmask & mask))
            continue;
        if (objects[o.otyp].oc_oprop === propindx
            && objects[o.otyp].oc_name_known && o.dknown)
            return true;
    }
    return false;
}

// C ref: insight.c attrval()
/* format a characteristic value, accommodating Strength's strangeness */
function attrval(attrindx, attrvalue) {
    if (attrindx !== A_STR || attrvalue <= 18)
        return `${attrvalue}`;
    else if (attrvalue > 18 + 100) /* 19 to 25 */
        return `${attrvalue - 100}`;
    else /* simplify "18/\**" to be "18/100" */
        return `18/${String(attrvalue - 18).padStart(2, '0')}`;
}

// C ref: hacklib.c getnow(), timet_delta() -- the recorder's clock is
// frozen at the game's datetime, so getnow() is that time
function getnow() {
    const dt = game.datetime;
    if (dt && /^\d{14}$/.test(dt))
        return Math.trunc(Date.UTC(+dt.slice(0, 4), +dt.slice(4, 6) - 1,
                                   +dt.slice(6, 8), +dt.slice(8, 10),
                                   +dt.slice(10, 12), +dt.slice(12, 14)) / 1000);
    return Math.trunc(Date.now() / 1000);
}
function timet_delta(a, b) { return a - b; }

// C ref: insight.c fmt_elapsed_time()
/* format urealtime.realtime as " D days, H hours, M minutes and S seconds"
   with any fields having a value of 0 omitted */
function fmt_elapsed_time(final) {
    let fieldcnt;
    let edays, ehours, eminutes, eseconds;
    const urealtime = game.urealtime || { realtime: 0, start_timing: 0 };
    let etim = urealtime.realtime;
    let outbuf;

    if (!final)
        /* allmain.c sets urealtime.start_timing = getnow() when play
           starts; that isn't ported yet, and the clock is frozen, so
           an unset start time is the same moment as now */
        etim += timet_delta(getnow(), urealtime.start_timing || getnow());
    eseconds = etim % 60, etim = Math.trunc(etim / 60);
    eminutes = etim % 60, etim = Math.trunc(etim / 60);
    ehours = etim % 24;
    edays = Math.trunc(etim / 24);
    fieldcnt = (edays ? 1 : 0) + (ehours ? 1 : 0) + (eminutes ? 1 : 0)
               + (eseconds ? 1 : 0);

    outbuf = fieldcnt ? "" : " none"; /* 'none' should never happen */
    if (edays) {
        outbuf += ` ${edays} day${plur(edays)}`;
        if (fieldcnt > 1) /* hours and/or minutes and/or seconds to follow */
            outbuf += (fieldcnt === 2) ? " and" : ",";
        --fieldcnt; /* edays has been processed */
    }
    if (ehours) {
        outbuf += ` ${ehours} hour${plur(ehours)}`;
        if (fieldcnt > 1) /* minutes and/or seconds to follow */
            outbuf += (fieldcnt === 2) ? " and" : ",";
        --fieldcnt; /* ehours has been processed */
    }
    if (eminutes) {
        outbuf += ` ${eminutes} minute${plur(eminutes)}`;
        if (fieldcnt > 1) /* seconds to follow */
            outbuf += " and";
    }
    if (eseconds)
        outbuf += ` ${eseconds} second${plur(eseconds)}`;
    return outbuf;
}

// C ref: insight.c enlightenment()
export async function enlightenment(mode, /* BASICENLIGHTENMENT | MAGICENLIGHTENMENT (| both) */
                                    final) /* ENL_GAMEINPROGRESS:0, ENL_GAMEOVERALIVE, ENL_GAMEOVERDEAD */ {
    const u = U();
    let buf, tmpbuf;

    game.en_win = tty_create_nhwindow(NHW_MENU);
    game.en_via_menu = !final;
    game.en_final = final;
    if (game.en_via_menu)
        tty_start_menu(game.en_win, MENU_BEHAVE_STANDARD);

    tmpbuf = game.plname;
    tmpbuf = highc(tmpbuf[0]) + tmpbuf.slice(1); /* same adjustment as bottom line */
    /* as in background_enlightenment, when poly'd we need to use the saved
       gender in u.mfemale rather than the current you-as-monster gender */
    buf = `${tmpbuf} the ${((Upolyd() ? u.mfemale : game.flags.female)
                            && game.urole.name.f)
                           ? game.urole.name.f
                           : game.urole.name.m}'s attributes:`;

    /* title */
    enlght_out(buf); /* "Conan the Archeologist's attributes:" */
    /* background and characteristics; ^X or end-of-game disclosure */
    if (mode & BASICENLIGHTENMENT) {
        /* role, race, alignment, deities, dungeon level, time, experience */
        background_enlightenment(mode, final);
        /* hit points, energy points, armor class, gold */
        basics_enlightenment(mode, final);
        /* strength, dexterity, &c */
        characteristics_enlightenment(mode, final);
    }
    /* expanded status line information, including things which aren't
       included there due to space considerations;
       shown for both basic and magic enlightenment */
    status_enlightenment(mode, final);
    /* remaining attributes; shown for potion,&c or wizard mode and
       explore mode ^X or end of game disclosure */
    if (mode & MAGICENLIGHTENMENT) {
        /* intrinsics and other traditional enlightenment feedback */
        throw new Error('enlightenment(): attributes_enlightenment() not ported yet');
    }

    enlght_out(""); /* separator */
    enlght_out("Miscellaneous:");
    /* reminder to player and/or information for dumplog */
    if ((mode & BASICENLIGHTENMENT) !== 0 && (wizard() || discover() || final)) {
        if (wizard() || discover()) {
            buf = `running in ${wizard() ? "debug" : "explore"} mode`;
            you_are(buf, "");
        }

        if (!game.flags.bones) {
            /* mention not saving bones iff hero just died */
            buf = `disabled loading${(final === ENL_GAMEOVERDEAD) ? " and storing" : ""} of bones levels`;
            enl_msg(You_, have, "", buf, ""); /* you_have_X() */
        } else if (!u.uroleplay.numbones) {
            enl_msg(You_, "haven't encountered", "didn't encounter",
                    " any bones levels", "");
        } else {
            buf = `encountered ${u.uroleplay.numbones} bones level${plur(u.uroleplay.numbones)}`;
            enl_msg(You_, have, "", buf, ""); /* you_have_X() */
        }
    }
    buf = fmt_elapsed_time(final);
    enl_msg("Total elapsed playing time ", "is", "was", buf, "");

    if (!game.en_via_menu) {
        throw new Error('enlightenment(): end-of-game text window not ported yet');
    } else {
        tty_end_menu(game.en_win, null);
        await tty_select_menu(game.en_win, PICK_NONE);
        game.en_via_menu = false;
    }
    await tty_destroy_nhwindow(game.en_win);
    game.en_win = WIN_ERR;
}

// C ref: insight.c background_enlightenment()
/* display role, race, alignment and such to en_win */
function background_enlightenment(unused_mode, final) {
    const u = U();
    const flags = game.flags;
    let role_titl, rank_titl;
    let innategend, difgend, difalgn;
    let buf, tmpbuf;

    /* note that if poly'd, we need to use u.mfemale instead of flags.female
       to access hero's saved gender-as-human/elf/&c rather than current */
    innategend = (Upolyd() ? u.mfemale : flags.female) ? 1 : 0;
    role_titl = (innategend && game.urole.name.f) ? game.urole.name.f
                                                  : game.urole.name.m;
    rank_titl = rank_of(u.ulevel, game.urole.mnum /* Role_switch */, innategend);

    enlght_out(""); /* separator after title */
    enlght_out("Background:");

    /* if polymorphed, report current shape before underlying role */
    if (Upolyd())
        throw new Error('background_enlightenment(): polymorphed hero not ported yet');

    /* report role; omit gender if it's redundant (eg, "female priestess") */
    tmpbuf = "";
    if (!game.urole.name.f
        && ((game.urole.allow & ROLE_GENDMASK) === (ROLE_MALE | ROLE_FEMALE)
            || innategend !== flags.initgend))
        tmpbuf = `${genders[innategend].adj} `;
    buf = "";
    if (Upolyd())
        buf = "actually "; /* "You are actually a ..." */
    if (rank_titl.toLowerCase() === role_titl.toLowerCase()) { /* !strcmpi() */
        /* omit role when rank title matches it */
        buf += `${an(rank_titl)}, level ${u.ulevel} ${tmpbuf}${game.urace.noun}`;
    } else {
        buf += `${an(rank_titl)}, a level ${u.ulevel} ${tmpbuf}${game.urace.adj} ${role_titl}`;
    }
    you_are(buf, "");

    /* report alignment (bypass you_are() in order to omit ending period);
       adverb is used to distinguish between temporary change (helm of opp.
       alignment), permanent change (one-time conversion), and original */
    buf = ` ${You_}${!final ? are : were}${align_str(u.ualign.type)}, ${
            /* helm of opposite alignment (might hide conversion) */
            (u.ualign.type !== u.ualignbase[A_CURRENT])
               ? (!final ? "currently " : "temporarily ")
               /* permanent conversion */
               : (u.ualign.type !== u.ualignbase[A_ORIGINAL])
                  ? (!final ? "now " : "belatedly ")
                  /* atheist (ignored in very early game) */
                  : (!u.uconduct.gnostic && game.moves > 1000)
                     ? "nominally "
                     /* lastly, normal case */
                     : ""}on a mission for ${align_gname(u.ualign.type) /* u_gname() */}`;
    enlght_out(buf);
    /* show the rest of this game's pantheon (finishes previous sentence) */
    buf = ` who ${!final ? "is" : "was"} opposed by`;
    if (u.ualign.type !== A_LAWFUL)
        buf += ` ${align_gname(A_LAWFUL)} (${align_str(A_LAWFUL)}) and`;
    if (u.ualign.type !== A_NEUTRAL)
        buf += ` ${align_gname(A_NEUTRAL)} (${align_str(A_NEUTRAL)})${
                (u.ualign.type !== A_CHAOTIC) ? " and" : ""}`;
    if (u.ualign.type !== A_CHAOTIC)
        buf += ` ${align_gname(A_CHAOTIC)} (${align_str(A_CHAOTIC)})`;
    buf += "."; /* terminate sentence */
    enlght_out(buf);

    /* show original alignment,gender,race,role if any have been changed */
    difgend = (innategend !== flags.initgend);
    difalgn = (((u.ualign.type !== u.ualignbase[A_CURRENT]) ? 1 : 0)
               + ((u.ualignbase[A_CURRENT] !== u.ualignbase[A_ORIGINAL])
                  ? 2 : 0));
    if (difalgn & 1) { /* have temporary alignment so report permanent one */
        buf = `actually ${align_str(u.ualignbase[A_CURRENT])}`;
        you_are(buf, "");
        difalgn &= ~1; /* suppress helm from "started out <foo>" message */
    }
    if (difgend || difalgn) { /* sex change or perm align change or both */
        buf = ` You started out ${difgend ? genders[flags.initgend].adj : ""}${
                (difgend && difalgn) ? " and " : ""}${
                difalgn ? align_str(u.ualignbase[A_ORIGINAL]) : ""}.`;
        enlght_out(buf);
    }

    /* "You are left-handed." won't work well if polymorphed into something
       without hands; use "You are normally left-handed." in that situation */
    buf = `${body_part(HANDED) === "handed" ? "" : "normally "}${
            URIGHTY() ? "right" : "left"}-handed`;
    you_are(buf, "");

    /* dungeon level */
    buf = tmpbuf = "";
    if (In_endgame(u.uz)) {
        throw new Error('background_enlightenment(): endgame level name not ported yet');
    } else if (Is_knox(u.uz)) {
        /* this gives away the fact that the knox branch is only 1 level */
        buf = `on the ${game.dungeons[u.uz.dnum].dname} level`;
    } else {
        let dgnbuf = game.dungeons[u.uz.dnum].dname;
        if (dgnbuf.slice(0, 4).toLowerCase() === "the ") /* !strncmpi() */
            dgnbuf = lowc(dgnbuf[0]) + dgnbuf.slice(1);
        tmpbuf = `level ${In_quest(u.uz) ? dunlev(u.uz) : depth(u.uz)}`;
        /* TODO? maybe extend this bit to include various other automatic
           annotations from the dungeon overview code */
        if (Is_rogue_level(u.uz))
            tmpbuf += ", a primitive area";
        else if (Is_bigroom(u.uz) && !Blind())
            tmpbuf += ", a very big room";
        buf = `in ${dgnbuf}, on ${tmpbuf}`;
    }
    you_are(buf, "");

    /* this is shown even if the 'time' option is off */
    if (game.moves === 1) {
        you_have("just started your adventure", "");
    } else {
        /* 'turns' grates on the nerves in this context... */
        buf = `the dungeon ${game.moves} turn${plur(game.moves)} ago`;
        /* same phrasing for current and final: "entered" is unconditional */
        enlght_line(You_, "entered ", buf, "");
    }

    /* for gameover, these have been obtained in really_done() */
    if (final ? game.iflags.at_midnight : midnight()) {
        enl_msg("It ", "is ", "was ", "the midnight hour", "");
    } else if (final ? game.iflags.at_night : night()) {
        enl_msg("It ", "is ", "was ", "nighttime", "");
    }
    /* other environmental factors */
    if (flags.moonphase === FULL_MOON || flags.moonphase === NEW_MOON) {
        buf = `a ${(flags.moonphase === FULL_MOON) ? "full"
                   : (flags.moonphase === NEW_MOON) ? "new"
                     : (flags.moonphase < FULL_MOON) ? "first quarter"
                       : "last quarter"} moon in effect${
                final ? " when your adventure ended" : ""}`;
        enl_msg("There ", "is ", "was ", buf, "");
    }
    if (flags.friday13) {
        buf = ` Bad things ${!final ? "can happen"
                : (final === 1 /* ENL_GAMEOVERALIVE */) ? "could have happened"
                  : "happened"} on Friday the 13th.`;
        enlght_out(buf);
    }

    if (!Upolyd()) {
        const ulvl = u.ulevel;
        /* [flags.showexp currently does not matter; should it?] */

        /* experience level is already shown above */
        buf = `${u.uexp} experience point${plur(u.uexp)}`;
        if (ulvl < 30 && (final || wizard())) {
            const nxtlvl = newuexp(ulvl), delta = nxtlvl - u.uexp;

            buf += `, ${delta} ${(u.uexp > 0) ? "more " : ""}${
                    !final ? "" : (delta === 1) ? "was " : "were "}needed ${
                    (ulvl < 18) ? "to attain" : "for"} level ${ulvl + 1}`;
        }
        you_have(buf, "");
    }
    /* SCORE_ON_BOTL: flags.showscore is not a recorder option */
}

/* C ref: dungeon.h Is_bigroom(), Is_rogue_level(), Is_knox() */
function Is_bigroom(uz) {
    return on_level(uz, game.dungeon_topology.d_bigroom_level);
}
function Is_rogue_level(uz) {
    return on_level(uz, game.dungeon_topology.d_rogue_level);
}
function Is_knox(uz) {
    return on_level(uz, game.dungeon_topology.d_knox_level);
}

// C ref: insight.c basics_enlightenment()
/* hit points, energy points, armor class -- essential information which
   doesn't fit very well in other categories */
function basics_enlightenment(mode, final) {
    const u = U();
    const flags = game.flags;
    const Power = "energy points (spell power)";
    let buf;
    let pw = u.uen, hp = (Upolyd() ? u.mh : u.uhp);
    const pwmax = u.uenmax, hpmax = (Upolyd() ? u.mhmax : u.uhpmax);

    enlght_out(""); /* separator after background */
    enlght_out("Basics:");

    if (hp < 0)
        hp = 0;
    /* "1 out of 1" rather than "all" if max is only 1; should never happen */
    if (hp === hpmax && hpmax > 1)
        buf = `all ${hpmax} hit points`;
    else
        buf = `${hp} out of ${hpmax} hit point${plur(hpmax)}`;
    you_have(buf, "");

    /* low max energy is feasible, so handle couple of extra special cases */
    if (pwmax === 0 || (pw === pwmax && pwmax === 2)) /* both: not "all 2" */
        buf = `${!pwmax ? "no" : "both"} ${Power}`;
    else if (pw === pwmax && pwmax > 2)
        buf = `all ${pwmax} ${Power}`;
    else
        buf = `${pw} out of ${pwmax} ${Power}`;
    you_have(buf, "");

    if (Upolyd())
        throw new Error('basics_enlightenment(): polymorphed hit dice not ported yet');

    find_ac(); /* enforces AC_MAX cap */
    buf = `${u.uac}`;
    if (Math.abs(u.uac) === AC_MAX)
        buf += `, the ${(u.uac < 0) ? "best" : "worst"} possible`;
    enl_msg("Your armor class ", "is ", "was ", buf, "");

    /* gold; similar to doprgold (#showgold) but without shop billing info;
       includes container contents, unlike status line but like doprgold */
    {
        const umoney = money_cnt(game.invent), hmoney = hidden_gold(final);

        if (!umoney) {
            buf = ` Your wallet ${!final ? "is" : "was"} empty`;
        } else {
            buf = ` Your wallet contain${!final ? "s" : "ed"} ${umoney} ${currency(umoney)}`;
        }
        /* terminate the wallet line if appropriate, otherwise add an
           introduction to subsequent continuation; output now either way */
        buf += !hmoney ? "." : !umoney ? ", but" : ", and";
        enlght_out(buf);

        /* put contained gold on its own line to avoid excessive width */
        if (hmoney) {
            buf = `${hmoney} ${umoney ? "more" : currency(hmoney)} stashed away in your pack`;
            enl_msg("you ", "have ", "had ", buf, "");
        }
    }

    if (flags.pickup) {
        let ocl;

        buf = "on";
        if (costly_spot(u.ux, u.uy)) {
            /* being in a shop inhibits autopickup, even 'pickup_thrown' */
            buf += ", but temporarily disabled while inside the shop";
        } else {
            ocl = oc_to_str(flags.pickup_types);
            buf += ` for ${ocl ? "'" : ""}${ocl ? ocl : "all types"}${ocl ? "'" : ""}`;
            if (flags.pickup_thrown && ocl)
                buf += " plus thrown"; /* show when not 'all types' */
            if (game.apelist)
                buf += ", with exceptions";
        }
    } else
        buf = "off";
    enl_msg("Autopickup ", "is ", "was ", buf, "");
}

// C ref: insight.c characteristics_enlightenment()
/* characteristics: expanded version of bottom line strength, dexterity, &c */
function characteristics_enlightenment(mode, final) {
    enlght_out("");
    enlght_out(`${!final ? "" : "Final "}Characteristics:`);

    /* bottom line order */
    one_characteristic(mode, final, A_STR); /* strength */
    one_characteristic(mode, final, A_DEX); /* dexterity */
    one_characteristic(mode, final, A_CON); /* constitution */
    one_characteristic(mode, final, A_INT); /* intelligence */
    one_characteristic(mode, final, A_WIS); /* wisdom */
    one_characteristic(mode, final, A_CHA); /* charisma */
}

// C ref: insight.c one_characteristic()
/* display one attribute value for characteristics_enlightenment() */
function one_characteristic(mode, final, attrindx) {
    let hide_innate_value = false, interesting_alimit;
    let acurrent, abase, apeak, alimit;
    let paren_pfx;
    let subjbuf, valubuf;
    const uarmg = game.uarmg, uarmh = game.uarmh;

    /* being polymorphed or wearing certain cursed items prevents
       hero from reliably tracking changes to characteristics */
    if (Upolyd()) {
        hide_innate_value = true;
    } else if (Fixed_abil()) {
        throw new Error('one_characteristic(): stuck_ring() not ported yet');
    }
    switch (attrindx) {
    case A_STR:
        if (uarmg && uarmg.otyp === GAUNTLETS_OF_POWER && uarmg.cursed)
            hide_innate_value = true;
        break;
    case A_DEX:
        break;
    case A_CON:
        if (u_wield_art(ART_OGRESMASHER) && game.uwep.cursed)
            hide_innate_value = true;
        break;
    case A_INT:
        if (uarmh && uarmh.otyp === DUNCE_CAP && uarmh.cursed)
            hide_innate_value = true;
        break;
    case A_WIS:
        if (uarmh && uarmh.otyp === DUNCE_CAP && uarmh.cursed)
            hide_innate_value = true;
        break;
    case A_CHA:
        break;
    default:
        return; /* impossible */
    }
    /* note: final disclosure includes MAGICENLIGHTENTMENT */
    if ((mode & MAGICENLIGHTENMENT) && !Upolyd())
        hide_innate_value = false;

    acurrent = ACURR(attrindx);
    valubuf = attrval(attrindx, acurrent); /* Sprintf(valubuf,"%d",) */
    subjbuf = `Your ${attrname[attrindx]} `;

    if (!hide_innate_value) {
        /* show abase, amax, and/or attrmax if acurr doesn't match abase
           (a magic bonus or penalty is in effect) or abase doesn't match
           amax (some points have been lost to poison or exercise abuse
           and are restorable) or attrmax is different from normal human
           (while game is in progress) or attrmax was different from
           abase (at end of game; this attribute wasn't maxed out) */
        abase = ABASE(attrindx);
        apeak = AMAX(attrindx);
        alimit = ATTRMAX(attrindx);
        /* criterium for whether the limit is interesting varies */
        interesting_alimit =
            final ? true /* was originally `(abase != alimit)' */
                  : (alimit !== (attrindx !== A_STR ? 18 : 18 + 100));
        paren_pfx = final ? " (" : " (current; ";
        if (acurrent !== abase) {
            valubuf += `${paren_pfx}base:${attrval(attrindx, abase)}`;
            paren_pfx = ", ";
        }
        if (abase !== apeak) {
            valubuf += `${paren_pfx}peak:${attrval(attrindx, apeak)}`;
            paren_pfx = ", ";
        }
        if (interesting_alimit) {
            valubuf += `${paren_pfx}${
                /* more verbose if exceeding 'limit' due to magic bonus */
                (acurrent > alimit) ? "innate " : ""}limit:${attrval(attrindx, alimit)}`;
            /* paren_pfx = ", "; */
        }
        if (acurrent !== abase || abase !== apeak || interesting_alimit)
            valubuf += ")";
    }
    enl_msg(subjbuf, "is ", "was ", valubuf, "");
}

// C ref: insight.c status_enlightenment()
/* status: selected obvious capabilities, assorted troubles */
function status_enlightenment(mode, final) {
    const u = U();
    const magic = (mode & MAGICENLIGHTENMENT) ? true : false;
    let cap;
    let buf, youtoo;
    const Riding = (u.usteed
                    /* if hero dies while dismounting, u.usteed will still
                       be set; we want to ignore steed in that situation */
                    && !(final === ENL_GAMEOVERDEAD
                         && game.killer?.name === "riding accident"));

    if (Riding)
        throw new Error('status_enlightenment(): steed name (x_monnam) not ported yet');

    /*\
     * Status (many are abbreviated on bottom line; others are or
     *     should be discernible to the hero hence to the player)
    \*/
    enlght_out(""); /* separator after title or characteristics */
    enlght_out(final ? "Final Status:" : "Status:");

    youtoo = You_;
    /* not a traditional status but inherently obvious to player; more
       detail given below (attributes section) for magic enlightenment */
    if (Upolyd())
        throw new Error('status_enlightenment(): polymorphed hero not ported yet');
    /* other movement situations that hero should always know */
    if (Levitation()) {
        if (Lev_at_will() && magic)
            you_are("levitating, at will", "");
        else
            enl_msg(youtoo, are, were, "levitating", from_what(LEVITATION));
    } else if (Flying()) { /* can only fly when not levitating */
        enl_msg(youtoo, are, were, "flying", from_what(FLYING));
    }
    if (Underwater()) {
        you_are("underwater", "");
    } else if (u.uinwater) {
        throw new Error('status_enlightenment(): swimming not ported yet');
    } else if (walking_on_water()) {
        /* show active Wwalking here, potential Wwalking elsewhere */
        buf = `walking on ${is_pool(u.ux, u.uy) ? "water"
                            : is_lava(u.ux, u.uy) ? "lava"
                              : "?"}`; /* surface(): catchall; can't happen */
        you_are(buf, from_what(WWALKING));
    }

    /* internal troubles, mostly in the order that prayer ranks them */
    if (Stoned()) {
        if (final && (Stoned() & I_SPECIAL))
            enlght_out(" You turned into stone.");
        else
            you_are("turning to stone", "");
    }
    if (Slimed()) {
        if (final && (Slimed() & I_SPECIAL))
            enlght_out(" You turned into slime.");
        else
            you_are("turning into slime", "");
    }
    if (Strangled()) {
        if (u.uburied) {
            you_are("buried", "");
        } else {
            if (final && (Strangled() & I_SPECIAL)) {
                enlght_out(" You died from strangulation.");
            } else {
                buf = "being strangled";
                if (wizard())
                    buf += ` (${Strangled() & TIMEOUT})`;
                you_are(buf, from_what(STRANGLED));
            }
        }
    }
    if (Sick()) {
        /* the two types of sickness are lumped together */
        if (final && (Sick() & I_SPECIAL)) {
            buf = ` ${You_}died from ${(u.usick_type & SICK_NONVOMITABLE)
                                       ? "terminal illness" : "food poisoning"}.`;
            enlght_out(buf);
        } else {
            /* unlike death due to sickness, report the two cases separately
               because it is possible to cure one without curing the other */
            if (u.usick_type & SICK_NONVOMITABLE)
                you_are("terminally sick from illness", "");
            if (u.usick_type & SICK_VOMITABLE)
                you_are("terminally sick from food poisoning", "");
        }
    }
    if (Vomiting())
        you_are("nauseated", "");
    if (Stunned())
        you_are("stunned", "");
    if (Confusion())
        you_are("confused", "");
    if (Hallucination())
        you_are("hallucinating", "");
    if (Blind()) {
        /* check the reasons in same order as from_what() */
        buf = `${(HBlinded() & FROMOUTSIDE) !== 0 ? "permanently"
                 : (HBlinded() & FROMFORM) ? "innately"
                   /* better phrasing desperately wanted... */
                   : Blindfolded_only() ? "deliberately"
                     /* timed, possibly combined with blindfold */
                     : "temporarily"} blind`;
        if (wizard() && (HBlinded() === BlindedTimeout() && !Blindfolded()))
            buf += ` (${BlindedTimeout()})`;
        /* !haseyes: avoid "you are innately blind innately" */
        you_are(buf, !haseyes(game.youmonst.data) ? "" : from_what(BLINDED));
    }
    if (Deaf())
        you_are("deaf", from_what(DEAF));

    /* external troubles, more or less */
    if (Punished())
        throw new Error('status_enlightenment(): punishment not ported yet');
    if (u.utrap)
        throw new Error('status_enlightenment(): trap_predicament() not ported yet');
    if (u.ustuck) /* includes u.uswallow */
        throw new Error('status_enlightenment(): held/engulfed hero not ported yet');
    if (Wounded_legs()) {
        /* EWounded_legs is used to track left/right/both rather than some
           form of extrinsic impairment; HWounded_legs is used for timeout;
           both apply to steed instead of hero when mounted */
        const whichleg = (EWounded_legs() & BOTH_SIDES);
        let bp = body_part(LEG), /* u.usteed: Riding stops earlier */
            article = "a ", /* precedes "wounded", so never "an " */
            leftright = "";

        if (whichleg === BOTH_SIDES)
            bp = makeplural(bp), article = "";
        else
            leftright = (whichleg === LEFT_SIDE) ? "left " : "right ";
        buf = `${article}wounded ${leftright}${bp}`;
        you_have(buf, "");
    }
    if (Glib())
        throw new Error('status_enlightenment(): fingers_or_gloves() not ported yet');
    if (Fumbling()) {
        if (magic || cause_known(FUMBLING))
            enl_msg(You_, "fumble", "fumbled", "", from_what(FUMBLING));
    }
    if (Sleepy()) {
        if (magic || cause_known(SLEEPY)) {
            buf = from_what(SLEEPY);
            if (wizard())
                buf += ` (${HSleepy() & TIMEOUT})`;
            enl_msg("You ", "fall", "fell", " asleep uncontrollably", buf);
        }
    }
    /* hunger/nutrition */
    if (Hunger()) {
        if (magic || cause_known(HUNGER))
            enl_msg(You_, "hunger", "hungered", " rapidly",
                    from_what(HUNGER));
    }
    buf = hu_stat[u.uhs];                    /* hunger status; omitted if "normal" */
    buf = mungspaces(buf);                   /* strip trailing spaces */
    /* status line doesn't show hunger when state is "not hungry", we do */
    if (!buf)
        buf = "not hungry";
    if (buf) { /* (since "not hungry" was added, this will always be True) */
        buf = lowc(buf[0]) + buf.slice(1); /* override capitalization */
        if (buf === "weak")
            buf += " from severe hunger";
        else if (buf.startsWith("faint")) /* fainting, fainted */
            buf += " due to starvation";
        if (wizard())
            buf += ` <${u.uhunger}>`;
        you_are(buf, "");
    }
    /* encumbrance */
    if ((cap = near_capacity()) > UNENCUMBERED) {
        let adj = "?_?"; /* (should always get overridden) */

        buf = enc_stat[cap];
        buf = lowc(buf[0]) + buf.slice(1);
        switch (cap) {
        case SLT_ENCUMBER:
            adj = "slightly";
            break; /* burdened */
        case MOD_ENCUMBER:
            adj = "moderately";
            break; /* stressed */
        case HVY_ENCUMBER:
            adj = "very";
            break; /* strained */
        case EXT_ENCUMBER:
            adj = "extremely";
            break; /* overtaxed */
        case OVERLOADED:
            adj = "not possible";
            break;
        }
        if (wizard())
            buf += ` <${inv_weight()}>`;
        buf += `; movement ${!final ? "is" : "was"} ${adj}${
                (cap < OVERLOADED) ? " slowed" : ""}`;
        you_are(buf, "");
    } else {
        /* last resort entry, guarantees Status section is non-empty */
        buf = "unencumbered";
        if (wizard())
            buf += ` <${inv_weight()}>`;
        you_are(buf, "");
    }
    /* current weapon(s) and corresponding skill level(s) */
    weapon_insight(final);
    /* unlike ring of increase accuracy's effect, the monk's suit penalty
       is too blatant to be restricted to magical enlightenment */
    if (game.iflags.tux_penalty && !Upolyd())
        throw new Error('status_enlightenment(): suit penalty (enlght_combatinc) not ported yet');
    /* report 'nudity' */
    if (!game.uarm && !game.uarmu && !game.uarmc && !game.uarms && !game.uarmg
        && !game.uarmf && !game.uarmh) {
        if (u.uroleplay.nudist)
            enl_msg(You_, "do", "did", " not wear any armor", "");
        else
            you_are("not wearing any armor", "");
    }
}

// C ref: insight.c weapon_insight()
/* extracted from status_enlightenment() to reduce clutter there */
function weapon_insight(final) {
    const u = U();
    const uwep = game.uwep;
    let buf;
    let wtype;

    /* report being weaponless; distinguish whether gloves are worn */
    if (!uwep) {
        you_are(empty_handed(), "");

    /* two-weaponing implies hands and
       a weapon or wep-tool (not other odd stuff) in each hand */
    } else if (u.twoweap) {
        you_are("wielding two weapons at once", "");

    /* report most weapons by their skill class (so a katana will be
       described as a long sword, for instance; mattock, hook, and aklys
       are exceptions), or wielded non-weapon item by its object class */
    } else {
        let what = weapon_descr(uwep);

        /* [what about other silver items?] */
        if (uwep.otyp === SHIELD_OF_REFLECTION)
            throw new Error('weapon_insight(): shield_simple_name() not ported yet');
        else if (is_wet_towel(uwep))
            what = /* (uwep->spe < 3) ? "moist towel" : */ "wet towel";

        if (what.toLowerCase() === "armor" || what.toLowerCase() === "food"
            || what.toLowerCase() === "venom") /* !strcmpi() */
            buf = `wielding some ${what}`;
        else
            /* [maybe include known blessed?] */
            buf = `wielding ${(uwep.quan === 1) ? an(what) : makeplural(what)}`;
        you_are(buf, "");
    }

    /*
     * Skill with current weapon.  Might help players who've never
     * noticed #enhance or decided that it was pointless.
     */
    if ((wtype = weapon_type(uwep)) !== P_NONE && (!uwep || !is_ammo(uwep))) {
        let sklvlbuf;
        const sklvl = P_SKILL(wtype);
        const hav = (sklvl !== P_UNSKILLED && sklvl !== P_SKILLED);

        if (sklvl === P_ISRESTRICTED)
            sklvlbuf = "no";
        else
            sklvlbuf = skill_level_name(wtype).toLowerCase(); /* lcase() */
        /* "you have no/basic/expert/master/grand-master skill with <skill>"
           or "you are unskilled/skilled in <skill>" */
        buf = `${sklvlbuf} ${hav ? "skill with" : "in"} ${skill_name(wtype)}`;

        if (!u.twoweap) {
            if (can_advance(wtype, false))
                buf += ` and ${!final ? "can enhance" : "could have enhanced"} that`;
            if (hav)
                you_have(buf, "");
            else
                you_are(buf, "");

        } else { /* two-weapon */
            throw new Error('weapon_insight(): two-weapon skill insight not ported yet');
        }
    } /* skill applies */
}

// C ref: insight.c doattributes() -- ^X command
export async function doattributes() {
    let mode = BASICENLIGHTENMENT;

    /* show more--as if final disclosure--for wizard and explore modes */
    if (wizard() || discover())
        mode |= MAGICENLIGHTENMENT;

    await enlightenment(mode, ENL_GAMEINPROGRESS);
    return 0; /* ECMD_OK */
}
