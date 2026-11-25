// insight.js — enlightenment, conduct and attribute descriptions.
// C ref: insight.c
//
// Ported so far: align_str(), piousness(), and the ^X command
// doattributes() with enlightenment()'s sections (background, basics,
// characteristics, status, weapon insight, attributes_enlightenment(),
// miscellaneous). The end-of-game text window and the polymorph, steed,
// trap, engulf, punishment &c. branches of the status section are not
// ported yet; each stops with a "not ported yet" error where C would print.
//
// A few helpers from other C files that nothing else in js/ has yet are
// kept here as local functions, each with its own C ref (weapon.c
// skill_level_name()/skill_name()/can_advance()/weapon_descr(), wield.c
// empty_handed(), invent.c hidden_gold()/currency(), polyself.c
// body_part(), shk.c costly_spot(), options.c oc_to_str(), eat.c
// temp_resist(), dungeon.c has_ceiling(), hacklib.c ordin(), and the
// youprop.h property macros).

import { getnow } from './calendar.js';
import { lays_eggs } from './polyself.js';
import { ordin } from './hacklib.js';
import { spellid } from './spell.js';
import { wizard } from './dungeon.js';
import { game } from './gstate.js';
import { count_wsegs, wseg_at } from './worm.js';
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
    Is_earthlevel, INVULNERABLE, ANTIMAGIC, FIRE_RES, COLD_RES, SLEEP_RES,
    DISINT_RES, SHOCK_RES, POISON_RES, ACID_RES, DRAIN_RES, SICK_RES,
    STONE_RES, BLND_RES, SEE_INVIS, TELEPAT, WARNING, WARN_OF_MON,
    WARN_UNDEAD, SEARCHING, CLAIRVOYANT, INFRAVISION, DETECT_MONSTERS,
    ADORNED, INVIS, DISPLACED, STEALTH, AGGRAVATE_MONSTER, CONFLICT, JUMPING,
    TELEPORT, TELEPORT_CONTROL, SWIMMING, MAGICAL_BREATHING, PASSES_WALLS,
    REGENERATION, SLOW_DIGESTION, HALF_PHDAM, HALF_SPDAM, PROTECTION,
    PROT_FROM_SHAPE_CHANGERS, POLYMORPH, POLYMORPH_CONTROL, UNCHANGING, FAST,
    REFLECTING, FREE_ACTION, LIFESAVED, INTRINSIC, NO_SPELL, MALE, FEMALE,
    NEUTRAL, ismnum,
} from './const.js';
import {
    tty_create_nhwindow, tty_start_menu, add_menu_str, tty_end_menu,
    tty_select_menu, tty_destroy_nhwindow, tty_yn_function, tty_putstr_sync,
    tty_display_nhwindow, tty_putstr,
} from './wintty.js';
import { VANQ_MLVL_MNDX, VANQ_MSTR_MNDX, VANQ_ALPHA_SEP, VANQ_ALPHA_MIX,
         VANQ_MCLS_HTOL, VANQ_MCLS_LTOH, VANQ_COUNT_H_L,
         VANQ_COUNT_L_H } from './const.js';
import {
    objects, OBJ_NAME, WEAPON_CLASS, GEM_CLASS, COIN_CLASS,
    GAUNTLETS_OF_POWER, DUNCE_CAP, SHIELD_OF_REFLECTION, TOWEL, CORPSE, TIN,
    EGG, STATUE, BOULDER, TIN_OPENER, ROCK, GRAPPLING_HOOK, DWARVISH_MATTOCK,
    LUCKSTONE, LOADSTONE, FLINT, TOUCHSTONE, DAGGER, KNIFE, AXE, PICK_AXE,
    SHORT_SWORD, BROADSWORD, LONG_SWORD, TWO_HANDED_SWORD, CLUB, MACE,
    MORNING_STAR, FLAIL, QUARTERSTAFF, SPEAR, TRIDENT, LANCE, BOW, SLING,
    CROSSBOW, DART, SHURIKEN, BOOMERANG, UNICORN_HORN, RIN_ADORNMENT,
    RIN_PROTECTION, AMULET_OF_GUARDING, ROBE, is_metallic,
} from './objects.js';
import * as M from './monsters.js';
import { rank_of, rank_to_xlev } from './botl.js';
import { an, makeplural, makesingular } from './objnam.js';
import { strstri, highc, lowc, mungspaces } from './hacklib.js';
import { align_gname, u_gname, can_pray } from './pray.js';
import { genders } from './role.js';
import { newuexp } from './exper.js';
import { night, midnight } from './calendar.js';
import { depth, dunlev, on_level } from './dungeon.js';
import { endgamelevelname as endgamelevelname_in } from './dungeon.js';
import { observable_depth as observable_depth_in } from './topten.js';
import { find_ac, money_cnt } from './u_init.js';
import { near_capacity, inv_weight, in_rooms } from './hack.js';
import { SHOPBASE, NO_ROOM, ROOMOFFSET } from './const.js';
import { ACH_RNK1, ACH_RNK8, ACH_SOKO, N_ACH } from './const.js';
import {
    ACH_BELL, ACH_HELL, ACH_CNDL, ACH_BOOK, ACH_INVK, ACH_AMUL, ACH_ENDG,
    ACH_ASTR, ACH_UWIN, ACH_MINE_PRIZE, ACH_SOKO_PRIZE, ACH_MEDU, ACH_BLND,
    ACH_NUDE, ACH_MINE, ACH_TOWN, ACH_SHOP, ACH_TMPL, ACH_ORCL, ACH_NOVL,
    ACH_BGRM, ACH_RNK2, ACH_RNK3, ACH_RNK4, ACH_RNK5, ACH_RNK6, ACH_RNK7,
    ACH_TUNE,
} from './const.js';
import { ACURR, ABASE, AMAX, ATTRMAX, from_what } from './attrib.js';
import { P_SKILL, P_MAX_SKILL, P_ADVANCE, P_RESTRICTED, weapon_type,
         practice_needed_to_advance } from './weapon.js';
import { oc_to_str } from './options.js';
import { is_pool, is_lava } from './makemon.js';
import { ART_OGRESMASHER } from './artilist.js';
import { hates_silver, defended } from './mondata.js';
import { pmname } from './do_name.js';
import { magic_negation } from './mhitu.js';
import { stone_luck } from './attrib.js';
import { carrying } from './invent.js';
import { u_adtyp_resistance_obj, item_what } from './zap.js';
import { shield_simple_name, ansimpleoname } from './iactions.js';
import { pline, livelog_printf } from './display.js';
import { NHW_TEXT, LL_WISH, LL_ACHIEVE, LL_UMONST, LL_DIVINEGIFT, LL_LIFESAVE,
         LL_ARTIFACT, LL_GENOCIDE, LL_DUMP, LL_SPOILER, LL_MINORAC } from './const.js';
import { visible_region_at, reg_damg } from './region.js';
import { find_mac } from './worn.js';
import { x_monnam, ARTICLE_YOUR, SUPPRESS_IT, SUPPRESS_INVISIBLE } from './do_name.js';
import { STRAT_WAITMASK, MFAST, MSLOW } from './const.js';
import {
    Fire_resistance, Cold_resistance, Sleep_resistance, Disint_resistance, Shock_resistance,
    Poison_resistance, Drain_resistance, Antimagic, Acid_resistance, Stone_resistance,
    Sick_resistance, Invulnerable, Punished, Stunned, Confusion, HBlinded, EBlinded, BBlinded,
    BlindedTimeout, PermaBlind, Blindfolded, Blindfolded_only, Blind, Sick, Stoned, Strangled,
    Vomiting, Glib, Slimed, Halluc_resistance, Hallucination, Deaf, Fumbling, EWounded_legs,
    Wounded_legs, HSleepy, Sleepy, Hunger, See_invisible, Blind_telepat, Blnd_resist, Warning,
    Warn_of_mon, Undead_warning, Searching, HClairvoyant, EClairvoyant, BClairvoyant,
    Clairvoyant, Infravision, HDetect_monsters, Detect_monsters, Adornment, HInvis, EInvis,
    BInvis, Invis, Invisible, Displaced, HStealth, EStealth, BStealth, Stealth,
    Aggravate_monster, Conflict, Jumping, Teleportation, Teleport_control, BLevitation,
    Levitation, Lev_at_will, BFlying, Flying, Wwalking, Swimming, Amphibious, Breathless,
    Underwater, Passes_walls, Slow_digestion, Half_spell_damage, Half_physical_damage,
    Regeneration, HProtection, Protection, Protection_from_shape_changers, Polymorph,
    Polymorph_control, Unchanging, Fast, Very_fast, Reflecting, Free_action, Fixed_abil,
    Lifesaved, Hate_silver, Half_gas_damage
} from './youprop.js';
import { Upolyd, Role_if, Luck } from './const.js';
export { costly_spot, shop_keeper, inhishop, inside_shop } from './shk.js';
import { costly_spot } from './shk.js';
import { TT_BURIEDBALL as TT_BURIEDBALL_IS, TT_LAVA as TT_LAVA_IS,
         TT_INFLOOR as TT_INFLOOR_IS } from './const.js';
import { hliquid as hliquid_is } from './potion.js';
import { the as the_is, surface as surface_is } from './iactions.js';
import { t_at as t_at_is, trapname as trapname_is } from './trap.js';
import { a_monnam as a_monnam_in } from './do_name.js';
import { has_mgivenname as has_mgivenname_in, MGIVENNAME as MGIVENNAME_in } from './const.js';
import { dmgtype_fromattack as dmgtype_fromattack_in, dmgtype as dmgtype_in } from './mondata.js';
import { AD_DGST as AD_DGST_IN, AT_ENGL as AT_ENGL_IN } from './monsters.js';
import { sticks as sticks_in } from './engrave.js';
import { dxdy_to_dist_descr as dxdy_to_dist_descr_in } from './getpos.js';
import { ROLL_FROM as ROLL_FROM_is } from './rng.js';

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
function discover() { return !!game.flags?.explore; }
function prop(p) { return game.u.uprops[p] || { intrinsic: 0, extrinsic: 0, blocked: 0 }; }

function URIGHTY() { return U().uhandedness === RIGHT_HANDED; }

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

/* C ref: youprop.h -- the rest of the property macros that
   attributes_enlightenment() checks */

/* C ref: mondata.h is_clinger(), lays_eggs(); monst.h vampshifted() */
function is_clinger(ptr) { return (ptr.mflags1 & M.M1_CLING) !== 0; }
function vampshifted(mon) {
    return (mon.cham === M.PM_VAMPIRE || mon.cham === M.PM_VAMPIRE_LEADER
            || mon.cham === M.PM_VLAD_THE_IMPALER) /* is_vampshifter() */
           && !(mon.data.mlet === M.S_VAMPIRE); /* !is_vampire() */
}

/* C ref: eat.c temp_resist() */
/* if 'prop' is only set because of a timed value (so not an intrinsic
   attribute or because of polymorph shape or worn or carried gear), return
   its timeout, otherwise return 0; used by enlightenment */
function temp_resist(propidx) {
    const p = prop(propidx);
    const timeout = p.intrinsic & TIMEOUT;

    if (timeout
        /* and if not also protected by polymorph form */
        && (p.intrinsic & ~TIMEOUT) === 0
        /* and not by worn gear (dragon armor) */
        && !p.extrinsic
        /* and property is not blocked; we don't expect this, but if it
           is then the timeout doesn't matter so we won't extend that */
        && !p.blocked) {
        return timeout;
    }
    return 0;
}

/* C ref: dungeon.c has_ceiling() */
export function has_ceiling(lev) {
    /* FIXME: some (most? all?) of the quest home levels are conceptually
       above ground and don't have ceilings outside of their buildings
       but we don't presently check for that */
    if (In_endgame(lev) && !Is_earthlevel(lev))
        return false;
    return true;
}

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

/* C ref: polyself.c mbodypart() static tables */
const humanoid_parts = [ "arm",       "eye",  "face",         "finger",
                         "fingertip", "foot", "hand",         "handed",
                         "head",      "leg",  "light headed", "neck",
                         "spine",     "toe",  "hair",         "blood",
                         "lung",      "nose", "stomach" ],
    jelly_parts = [ "pseudopod", "dark spot", "front",
                    "pseudopod extension", "pseudopod extremity",
                    "pseudopod root", "grasp", "grasped",
                    "cerebral area", "lower pseudopod", "viscous",
                    "middle", "surface", "pseudopod extremity",
                    "ripples", "juices", "surface", "sensor",
                    "stomach" ],
    animal_parts = [ "forelimb",  "eye",           "face",
                     "foreclaw",  "claw tip",      "rear claw",
                     "foreclaw",  "clawed",        "head",
                     "rear limb", "light headed",  "neck",
                     "spine",     "rear claw tip", "fur",
                     "blood",     "lung",          "nose",
                     "stomach" ],
    bird_parts = [ "wing",     "eye",  "face",         "wing",
                   "wing tip", "foot", "wing",         "winged",
                   "head",     "leg",  "light headed", "neck",
                   "spine",    "toe",  "feathers",     "blood",
                   "lung",     "bill", "stomach" ],
    horse_parts = [ "foreleg",  "eye",           "face",
                    "forehoof", "hoof tip",      "rear hoof",
                    "forehoof", "hooved",        "head",
                    "rear leg", "light headed",  "neck",
                    "backbone", "rear hoof tip", "mane",
                    "blood",    "lung",          "nose",
                    "stomach" ],
    sphere_parts = [ "appendage", "optic nerve", "body", "tentacle",
                     "tentacle tip", "lower appendage", "tentacle",
                     "tentacled", "body", "lower tentacle",
                     "rotational", "equator", "body",
                     "lower tentacle tip", "cilia", "life force",
                     "retina", "olfactory nerve", "interior" ],
    fungus_parts = [ "mycelium", "visual area", "front",
                     "hypha",    "hypha",       "root",
                     "strand",   "stranded",    "cap area",
                     "rhizome",  "sporulated",  "stalk",
                     "root",     "rhizome tip", "spores",
                     "juices",   "gill",        "gill",
                     "interior" ],
    vortex_parts = [ "region",        "eye",           "front",
                     "minor current", "minor current", "lower current",
                     "swirl",         "swirled",       "central core",
                     "lower current", "addled",        "center",
                     "currents",      "edge",          "currents",
                     "life force",    "center",        "leading edge",
                     "interior" ],
    snake_parts = [ "vestigial limb", "eye", "face", "large scale",
                    "large scale tip", "rear region", "scale gap",
                    "scale gapped", "head", "rear region",
                    "light headed", "neck", "length", "rear scale",
                    "scales", "blood", "lung", "forked tongue",
                    "stomach" ],
    worm_parts = [ "anterior segment", "light sensitive cell",
                   "clitellum", "setae", "setae", "posterior segment",
                   "segment", "segmented", "anterior segment",
                   "posterior", "over stretched", "clitellum",
                   "length", "posterior setae", "setae", "blood",
                   "skin", "prostomium", "stomach" ],
    spider_parts = [ "pedipalp", "eye", "face", "pedipalp", "tarsus",
                     "claw", "pedipalp", "palped", "cephalothorax",
                     "leg", "spun out", "cephalothorax", "abdomen",
                     "claw", "hair", "hemolymph", "book lung",
                     "labrum", "digestive tract" ],
    fish_parts = [ "fin", "eye", "premaxillary", "pelvic axillary",
                   "pelvic fin", "anal fin", "pectoral fin", "finned",
                   "head", "peduncle", "played out", "gills",
                   "dorsal fin", "caudal fin", "scales", "blood",
                   "gill", "nostril", "stomach" ];
/* claw attacks are overloaded in mons[]; most humanoids with
   such attacks should still reference hands rather than claws */
const not_claws = [
    M.S_HUMAN,     M.S_MUMMY,   M.S_ZOMBIE, M.S_ANGEL, M.S_NYMPH, M.S_LEPRECHAUN,
    M.S_QUANTMECH, M.S_VAMPIRE, M.S_ORC,    M.S_GIANT, /* quest nemeses */
];
/* C ref: polyself.c mbodypart() body part indices (polyself.h) */
const BP_ARM = 0, BP_EYE = 1, BP_FINGER = 3, BP_FINGERTIP = 4, BP_FOOT = 5,
      BP_HAND = 6, BP_HANDED = 7, BP_HEAD = 8, BP_LEG = 9, BP_TOE = 13,
      BP_HAIR = 14, BP_NOSE = 17, BP_NO_PART = -1;

// C ref: polyself.c mbodypart()
export function mbodypart(mon, part) {
    const mptr = mon.data;
    /* mondata.h attacktype(), slithy() */
    const attacktype = (ptr, atyp) => ptr.mattk.some(a => a.aatyp === atyp);
    const slithy = (ptr) => (ptr.mflags1 & M.M1_SLITHY) !== 0;

    if (part <= BP_NO_PART) {
        /* impossible("mbodypart: bad part %d", part) */
        return "mystery part";
    }

    /* some special cases */
    if (mptr.mlet === M.S_DOG || mptr.mlet === M.S_FELINE
        || mptr.mlet === M.S_RODENT || mptr === M.mons[M.PM_OWLBEAR]) {
        switch (part) {
        case BP_HAND:
            return "paw";
        case BP_HANDED:
            return "pawed";
        case BP_FOOT:
            return "rear paw";
        case BP_ARM:
        case BP_LEG:
            return horse_parts[part]; /* "foreleg", "rear leg" */
        default:
            break; /* for other parts, use animal_parts[] below */
        }
    } else if (mptr.mlet === M.S_YETI) { /* excl. owlbear due to 'if' above */
        /* opposable thumbs, hence "hands", "arms", "legs", &c */
        return humanoid_parts[part]; /* yeti/sasquatch, monkey/ape */
    }
    if ((part === BP_HAND || part === BP_HANDED)
        && (humanoid(mptr) && attacktype(mptr, M.AT_CLAW)
            && !not_claws.includes(mptr.mlet)
            && mptr !== M.mons[M.PM_STONE_GOLEM]
            && mptr !== M.mons[M.PM_AMOROUS_DEMON]))
        return (part === BP_HAND) ? "claw" : "clawed";
    if ((mptr === M.mons[M.PM_MUMAK] || mptr === M.mons[M.PM_MASTODON])
        && part === BP_NOSE)
        return "trunk";
    if (mptr === M.mons[M.PM_SHARK] && part === BP_HAIR)
        return "skin"; /* sharks don't have scales */
    if ((mptr === M.mons[M.PM_JELLYFISH] || mptr === M.mons[M.PM_KRAKEN])
        && (part === BP_ARM || part === BP_FINGER || part === BP_HAND
            || part === BP_FOOT || part === BP_TOE))
        return "tentacle";
    if (mptr === M.mons[M.PM_FLOATING_EYE] && part === BP_EYE)
        return "cornea";
    if (humanoid(mptr) && (part === BP_ARM || part === BP_FINGER
                           || part === BP_FINGERTIP || part === BP_HAND
                           || part === BP_HANDED))
        return humanoid_parts[part];
    if (mptr.mlet === M.S_COCKATRICE)
        return (part === BP_HAIR) ? snake_parts[part] : bird_parts[part];
    if (mptr === M.mons[M.PM_RAVEN])
        return bird_parts[part];
    if (mptr.mlet === M.S_CENTAUR || mptr.mlet === M.S_UNICORN
        || mptr === M.mons[M.PM_KI_RIN]
        || (mptr === M.mons[M.PM_ROTHE] && part !== BP_HAIR))
        return horse_parts[part];
    if (mptr.mlet === M.S_LIGHT) {
        if (part === BP_HANDED)
            return "rayed";
        else if (part === BP_ARM || part === BP_FINGER
                 || part === BP_FINGERTIP || part === BP_HAND)
            return "ray";
        else
            return "beam";
    }
    if (mptr === M.mons[M.PM_STALKER] && part === BP_HEAD)
        return "head";
    if (mptr.mlet === M.S_EEL && mptr !== M.mons[M.PM_JELLYFISH])
        return fish_parts[part];
    if (mptr.mlet === M.S_WORM)
        return worm_parts[part];
    if (mptr.mlet === M.S_SPIDER)
        return spider_parts[part];
    if (slithy(mptr) || (mptr.mlet === M.S_DRAGON && part === BP_HAIR))
        return snake_parts[part];
    if (mptr.mlet === M.S_EYE)
        return sphere_parts[part];
    if (mptr.mlet === M.S_JELLY || mptr.mlet === M.S_PUDDING
        || mptr.mlet === M.S_BLOB || mptr === M.mons[M.PM_JELLYFISH])
        return jelly_parts[part];
    if (mptr.mlet === M.S_VORTEX || mptr.mlet === M.S_ELEMENTAL)
        return vortex_parts[part];
    if (mptr.mlet === M.S_FUNGUS)
        return fungus_parts[part];
    if (humanoid(mptr))
        return humanoid_parts[part];
    return animal_parts[part];
}

// C ref: polyself.c body_part()
export function body_part(part) {
    return mbodypart(game.youmonst, part);
}

// C ref: invent.c contained_gold()
function contained_gold(obj, even_if_unknown) {
    let value = 0;

    /* objects other than coins won't have any gold inside them
       (JS container contents are an array) */
    for (const otmp of (Array.isArray(obj.cobj) ? obj.cobj : []))
        if (otmp.oclass === COIN_CLASS)
            value += otmp.quan;
        else if (otmp.cobj && (otmp.cknown || even_if_unknown))
            value += contained_gold(otmp, even_if_unknown);
    return value;
}

// C ref: invent.c hidden_gold()
export function hidden_gold(even_if_unknown) {
    let value = 0;

    for (let obj = game.invent; obj; obj = obj.nobj)
        if (obj.cobj && (obj.cknown || even_if_unknown))
            value += contained_gold(obj, even_if_unknown);
    return value;
}

/* C ref: invent.c currencies[] */
const currencies = [
    "Altarian Dollar",       /* The Hitchhiker's Guide to the Galaxy */
    "Ankh-Morpork Dollar",   /* Discworld */
    "auric",                 /* The Domination of Draka */
    "buckazoid",             /* Space Quest */
    "cirbozoid",             /* Starslip */
    "credit chit",           /* Deus Ex */
    "cubit",                 /* Battlestar Galactica */
    "Flanian Pobble Bead",   /* The Hitchhiker's Guide to the Galaxy */
    "fretzer",               /* Jules Verne */
    "imperial credit",       /* Star Wars */
    "Hong Kong Luna Dollar", /* The Moon is a Harsh Mistress */
    "kongbuck",              /* Snow Crash */
    "nanite",                /* System Shock 2 */
    "quatloo",               /* Star Trek, Sim City */
    "simoleon",              /* Sim City */
    "solari",                /* Spaceballs */
    "spacebuck",             /* Spaceballs */
    "sporebuck",             /* Spore */
    "Triganic Pu",           /* The Hitchhiker's Guide to the Galaxy */
    "woolong",               /* Cowboy Bebop */
    "zorkmid",               /* Zork, NetHack */
];

// C ref: invent.c currency()
export function currency(amount) {
    let res;

    res = Hallucination() ? ROLL_FROM_is(currencies) : "zorkmid";
    if (amount !== 1)
        res = makeplural(res);
    return res;
}

// C ref: shk.c costly_spot(), shop_keeper(), inhishop(), inside_shop()
// live in shk.js

// C ref: wield.c empty_handed()
/* description of hands when not wielding anything */
export function empty_handed() {
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
export function P_NAME(type) {
    return (skill_names_indices[type] > 0)
           ? OBJ_NAME(objects[skill_names_indices[type]])
           : (type === P_BARE_HANDED_COMBAT)
             ? barehands_or_martial[martial_bonus() ? 1 : 0]
             : odd_skill_names[-skill_names_indices[type]];
}

/* C ref: drawing.c def_oc_syms[].name */
const def_oc_names = [
    "", /* placeholder for the "random class" */
    "illegal objects", "weapons", "armor", "rings", "amulets", "tools",
    "food", "potions", "scrolls", "spellbooks", "wands", "coins", "rocks",
    "large stones", "iron balls", "chains", "venoms",
];

// C ref: weapon.c weapon_descr()
/* weapon's skill category name for use as generalized description of
   weapon */
export function weapon_descr(obj) {
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
export function skill_level_name(skill) {
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
export function skill_name(skill) {
    return P_NAME(skill);
}

// C ref: weapon.c slots_required()
/* return the # of slots required to advance the skill */
export function slots_required(skill) {
    const tmp = P_SKILL(skill);

    /* The more difficult the training, the more slots it takes. */
    if (skill <= P_LAST_WEAPON || skill === P_TWO_WEAPON_COMBAT)
        return tmp;

    /* Fewer slots used up for unarmed or martial. */
    return Math.trunc((tmp + 1) / 2);
}

// C ref: weapon.c can_advance()
/* return true if this skill can be advanced */
export function can_advance(skill, speedy) {
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

/* C ref: insight.c achieve_msg[] -- for livelogging; ordered per
   'enum achievements' in you.h */
const achieve_msg = [
    { llflag: 0, msg: "" }, /* actual achievements are numbered from 1 */
    { llflag: LL_ACHIEVE, msg: "acquired the Bell of Opening" },
    { llflag: LL_ACHIEVE, msg: "entered Gehennom" },
    { llflag: LL_ACHIEVE, msg: "acquired the Candelabrum of Invocation" },
    { llflag: LL_ACHIEVE, msg: "acquired the Book of the Dead" },
    { llflag: LL_ACHIEVE, msg: "performed the invocation" },
    { llflag: LL_ACHIEVE, msg: "acquired The Amulet of Yendor" },
    { llflag: LL_ACHIEVE, msg: "entered the Elemental Planes" },
    { llflag: LL_ACHIEVE, msg: "entered the Astral Plane" },
    { llflag: LL_ACHIEVE, msg: "ascended" },
    /* if the type of item isn't discovered yet, disclosing the event
       via #chronicle would be a spoiler (particularly for gray stone);
       the ID'd name for the type of item will be appended to the next
       two messages, for display via livelog and/or dumplog */
    { llflag: LL_ACHIEVE | LL_SPOILER, msg: "acquired the Mines' End" }, /* " luckstone" */
    { llflag: LL_ACHIEVE | LL_SPOILER, msg: "acquired the Sokoban" }, /* " <item>" */
    { llflag: LL_ACHIEVE | LL_UMONST, msg: "killed Medusa" },
     /* these two are not logged */
    { llflag: 0, msg: "hero was always blond, no, blind" },
    { llflag: 0, msg: "hero never wore armor" },
     /* */
    { llflag: LL_MINORAC | LL_DUMP, msg: "entered the Gnomish Mines" },
    { llflag: LL_ACHIEVE, msg: "reached Mine Town" }, /* probably minor, but dnh logs it */
    { llflag: LL_MINORAC, msg: "entered a shop" },
    { llflag: LL_MINORAC, msg: "entered a temple" },
    { llflag: LL_ACHIEVE, msg: "consulted the Oracle" }, /* minor, but rare enough */
    { llflag: LL_MINORAC | LL_DUMP, msg: "read a Discworld novel" }, /* even more so */
    { llflag: LL_ACHIEVE, msg: "entered Sokoban" }, /* keep as major for turn comparison
                                                     * with completed sokoban */
    { llflag: LL_ACHIEVE, msg: "entered the Bigroom" },
    /* The following 8 are for advancing through the ranks
       and messages differ by role so are created on the fly;
       rank 0 (Xp 1 and 2) isn't an achievement */
    { llflag: LL_MINORAC | LL_DUMP, msg: "" }, /* Xp 3 */
    { llflag: LL_MINORAC | LL_DUMP, msg: "" }, /* Xp 6 */
    { llflag: LL_MINORAC | LL_DUMP, msg: "" }, /* Xp 10 */
    { llflag: LL_ACHIEVE, msg: "" }, /* Xp 14, so able to attempt the quest */
    { llflag: LL_ACHIEVE, msg: "" }, /* Xp 18 */
    { llflag: LL_ACHIEVE, msg: "" }, /* Xp 22 */
    { llflag: LL_ACHIEVE, msg: "" }, /* Xp 26 */
    { llflag: LL_ACHIEVE, msg: "" }, /* Xp 30 */
    { llflag: LL_MINORAC, msg: "learned castle drawbridge's tune" }, /* achievement #31 */
    { llflag: 0, msg: "" }, /* keep this one at the end */
];

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

// C ref: insight.c enlght_out()
function enlght_out(buf) {
    if (game.en_via_menu) {
        add_menu_str(game.en_win, buf);
    } else
        tty_putstr_sync(game.en_win, 0, buf);
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
    if (strstri(buf, " not ") >= 0) { /* TODO: switch to libc strstr() */
        for (let i = 0; i < contra.length; ++i)
            buf = strsubst(buf, contra[i].twowords, contra[i].contrctn);
    }
    enlght_out(buf);
}

// C ref: insight.c enlght_combatinc()
/* format increased chance to hit or damage or defense (Protection) */
function enlght_combatinc(inctyp, /* "to hit" or "damage" or "defense" */
                          incamt, /* amount of increment (negative if decrement) */
                          final)  /* ENL_{GAMEINPROGRESS,GAMEOVERALIVE,GAMEOVERDEAD} */ {
    let modif, bonus;
    let invrt;
    let absamt;
    let outbuf;

    absamt = Math.abs(incamt);
    /* Protection amount is typically larger than damage or to-hit;
       reduce magnitude by a third in order to stretch modifier ranges
       (small:1..5, moderate:6..10, large:11..19, huge:20+) */
    if (inctyp === "defense")
        absamt = Math.trunc((absamt * 2) / 3);

    if (absamt <= 3)
        modif = "small";
    else if (absamt <= 6)
        modif = "moderate";
    else if (absamt <= 12)
        modif = "large";
    else
        modif = "huge";

    modif = !incamt ? "no" : an(modif); /* ("no" case shouldn't happen) */
    bonus = (incamt >= 0) ? "bonus" : "penalty";
    /* "bonus <foo>" (to hit) vs "<bar> bonus" (damage, defense) */
    invrt = (inctyp !== "to hit") ? true : false;

    outbuf = `${modif} ${invrt ? inctyp : bonus} ${invrt ? bonus : inctyp}`;
    if (final || wizard())
        outbuf += ` (${(incamt > 0) ? "+" : ""}${incamt})`;

    return outbuf;
}

// C ref: insight.c enlght_halfdmg()
/* report half physical or half spell damage */
function enlght_halfdmg(category, final) {
    let category_name;
    let buf;

    switch (category) {
    case HALF_PHDAM:
        category_name = "physical";
        break;
    case HALF_SPDAM:
        category_name = "spell";
        break;
    default:
        category_name = "unknown";
        break;
    }
    buf = ` ${(final || wizard()) ? "half" : "reduced"} ${category_name} damage`;
    enl_msg(You_, "take", "took", buf, from_what(category));
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

// C ref: insight.c N_times()
function N_times(n) {
    switch (n) {
    case 0:
    default:
        return `${n} times`;
    case 1:
        return "once";
    case 2:
        return "twice";
    case 3:
        return "thrice";
    }
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
        await attributes_enlightenment(mode, final);
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
        await tty_display_nhwindow(game.en_win, true);
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
        const egdepth = observable_depth_in(u.uz);

        tmpbuf = endgamelevelname_in(egdepth);
        buf = `in the endgame, on the ${
                tmpbuf.startsWith("Plane") ? "Elemental " : ""}${tmpbuf}`;
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
    if (Punished()) {
        if (game.uball) {
            buf = `chained to ${ansimpleoname(game.uball)}`;
        } else {
            /* impossible("Punished without uball?") */
            buf = "punished";
        }
        you_are(buf, "");
    }
    if (u.utrap) {
        const predicament = trap_predicament(final, wizard());

        if (u.usteed) /* not `Riding' here */
            throw new Error('status_enlightenment(): trapped steed not ported yet');
        else
            you_are(predicament, "");
    } /* (u.utrap) */
    let heldmon = ''; /* lint suppression */
    if (u.ustuck) { /* includes u.uswallow */
        heldmon = a_monnam_in(u.ustuck);
        if (heldmon === "it"
            && (!has_mgivenname_in(u.ustuck)
                || MGIVENNAME_in(u.ustuck) !== "it"))
            heldmon = "an unseen creature";
    }
    if (u.uswallow) {
        buf = `${dmgtype_fromattack_in(u.ustuck.data, AD_DGST_IN, AT_ENGL_IN) /* digests() */
                 ? "swallowed" : "engulfed"} by ${heldmon}`;
        if (dmgtype_in(u.ustuck.data, AD_DGST_IN)) {
            /* if final, death via digestion can be deduced by u.uswallow
               still being True and u.uswldtim having been decremented to 0 */
            if (final && !u.uswldtim)
                buf += " and got totally digested";
            else
                buf += ` and ${final ? "were" : "are"} being digested`;
        }
        if (wizard())
            buf += ` (${u.uswldtim >>> 0})`;
        you_are(buf, "");
    } else if (u.ustuck) {
        const ustick = (Upolyd() && sticks_in(game.youmonst.data));
        const dx = u.ustuck.mx - u.ux, dy = u.ustuck.my - u.uy;

        buf = `${ustick ? "holding" : "held by"} ${heldmon} (${
            dxdy_to_dist_descr_in(dx, dy, true)})`;
        you_are(buf, "");
    }
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
            what = shield_simple_name(uwep); /* silver|smooth shield */
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
            const also_ = "also ";
            let pfx, sfx, twobuf;
            let also = "", also2 = "", also3 = null, verb_present, verb_past;
            const wtype2 = weapon_type(game.uswapwep),
                sklvl2 = P_SKILL(wtype2);
            let twoskl = P_SKILL(P_TWO_WEAPON_COMBAT);
            const hav2 = (sklvl2 !== P_UNSKILLED && sklvl2 !== P_SKILLED);

            /* normally hero must have access to two-weapon skill in
               order to initiate u.twoweap, but not if polymorphed into
               a form which has multiple weapon attacks, so we need to
               avoid getting bitten by unexpected skill value */
            if (twoskl === P_ISRESTRICTED) {
                twoskl = P_UNSKILLED;
                /* restricted is the same as unskilled as far as bonus
                   or penalty goes, and it isn't ordinarily seen so
                   skill_level_name() returns "Unknown" for it */
                twobuf = "restricted";
            } else {
                twobuf = skill_level_name(P_TWO_WEAPON_COMBAT).toLowerCase();
            }

            /* keep buf[] from above in case skill levels match */
            pfx = sfx = "";
            if (twoskl < sklvl) {
                /* twoskil won't be restricted so sklvl is at least basic */
                pfx = `Your skill in ${skill_name(wtype)} `;
                sfx = ` limited by being ${twobuf} with two weapons`;
                also = also_;
            } else if (twoskl > sklvl) {
                /* sklvl might be restricted */
                pfx = "Your two weapon skill ";
                sfx = " limited by ";
                if (sklvl > P_ISRESTRICTED)
                    sfx += `being ${sklvlbuf}`;
                else
                    sfx += "having no skill";
                sfx += ` with ${skill_name(wtype)}`;
                also2 = also_;
            } else {
                buf += " and two weapons";
                also3 = also_;
            }
            if (pfx)
                enl_msg(pfx, "is", "was", sfx, "");
            else if (hav)
                you_have(buf, "");
            else
                you_are(buf, "");

            /* skip comparison between secondary and two-weapons if it is
               identical to the comparison between primary and twoweap */
            if (wtype2 !== wtype) {
                const sknambuf2 = skill_name(wtype2);
                const sklvlbuf2 = skill_level_name(wtype2).toLowerCase();
                verb_present = "is", verb_past = "was";
                pfx = sfx = buf = "";
                if (twoskl < sklvl2) {
                    /* twoskil is at least unskilled, sklvl2 at least basic */
                    pfx = `Your skill in ${sknambuf2} `;
                    sfx = ` ${also}limited by being ${twobuf} with two weapons`;
                } else if (twoskl > sklvl2) {
                    /* sklvl2 might be restricted */
                    pfx = "Your two weapon skill ";
                    sfx = ` ${also2}limited by `;
                    if (sklvl2 > P_ISRESTRICTED)
                        sfx += `being ${sklvlbuf2}`;
                    else
                        sfx += "having no skill";
                    sfx += ` with ${sknambuf2}`;
                } else {
                    /* equal; two-weapon is at least unskilled, so sklvl2 is
                       too; "you [also] have basic/expert/master/grand-master
                       skill with <skill>" or "you [also] are unskilled/
                       skilled in <skill> */
                    buf = `${sklvlbuf2} ${hav2 ? "skill with" : "in"} ${sknambuf2}`;
                    buf += " and two weapons";
                    if (also3) {
                        pfx = "You also ";
                        sfx = ` ${buf}`, buf = "";
                        verb_present = hav2 ? "have" : "are";
                        verb_past = hav2 ? "had" : "were";
                    }
                }
                if (pfx)
                    enl_msg(pfx, verb_present, verb_past, sfx, "");
                else if (hav2)
                    you_have(buf, "");
                else
                    you_are(buf, "");
            } /* wtype2 != wtype */

            /* if training and available skill credits already allow
               #enhance for any of primary, secondary, or two-weapon,
               tell the player; avoid attempting figure out whether
               spending skill credits enhancing one might make either
               or both of the others become ineligible for enhancement */
            const a1 = can_advance(wtype, false);
            const a2 = (wtype2 !== wtype) ? can_advance(wtype2, false) : false;
            const ab = can_advance(P_TWO_WEAPON_COMBAT, false);
            if (a1 || a2 || ab) {
                const also_wik_ = " and also with ";

                sfx = ` skill${((a1 ? 1 : 0) + (a2 ? 1 : 0) + (ab ? 1 : 0) > 1) ? "s" : ""} with ${
                    a1 ? skill_name(wtype) : ""}${
                    ((a1 && a2 && ab) ? ", "
                     : (a1 && (a2 || ab)) ? also_wik_ : "")}${
                    a2 ? skill_name(wtype2) : ""}${
                    ((a1 && a2 && ab) ? ", and "
                     : (a2 && ab) ? also_wik_ : "")}${
                    ab ? "two weapons" : ""}`;
                enl_msg(You_, "can enhance", "could have enhanced", sfx, "");
            }
        }
    } /* skill applies */
}

// C ref: insight.c item_resistance_message()
function item_resistance_message(adtyp, prot_message, final) {
    const protection = u_adtyp_resistance_obj(adtyp);

    void final;
    if (protection) {
        const somewhat = protection < 99;

        enl_msg("Your items ",
                somewhat ? "are somewhat" : "are",
                somewhat ? "were somewhat" : "were",
                prot_message, item_what(adtyp));
    }
}

// C ref: insight.c attributes_enlightenment()
/* attributes: intrinsics and the like, other non-obvious capabilities */
async function attributes_enlightenment(unused_mode, final) {
    const if_surroundings_permitted = " if surroundings permitted";
    const u = U();
    const flags = game.flags;
    const uleft = game.uleft, uright = game.uright, uamul = game.uamul;
    const uarm = game.uarm, uarmc = game.uarmc;
    const warntype = game.context.warntype || {};
    let ltmp, armpro, warnspecies;
    let buf;

    void unused_mode;
    /*\
     *  Attributes
    \*/
    enlght_out("");
    enlght_out(final ? "Final Attributes:" : "Attributes:");

    if (u.uevent.uhand_of_elbereth) {
        const hofe_titles = [ "the Hand of Elbereth",
                              "the Envoy of Balance",
                              "the Glory of Arioch" ];
        you_are(hofe_titles[u.uevent.uhand_of_elbereth - 1], "");
    }

    buf = piousness(true, "aligned");
    if (u.ualign.record >= 0)
        you_are(buf, "");
    else
        you_have(buf, "");

    if (wizard()) {
        buf = ` ${u.ualign.record}`;
        enl_msg("Your alignment ", "is", "was", buf, "");
    }

    /*** Resistances to troubles ***/
    if (Invulnerable())
        you_are("invulnerable", from_what(INVULNERABLE));
    if (Antimagic())
        you_are("magic-protected", from_what(ANTIMAGIC));
    if (Fire_resistance())
        you_are("fire resistant", from_what(FIRE_RES));
    item_resistance_message(M.AD_FIRE, " protected from fire", final);
    if (Cold_resistance())
        you_are("cold resistant", from_what(COLD_RES));
    item_resistance_message(M.AD_COLD, " protected from cold", final);
    if (Sleep_resistance())
        you_are("sleep resistant", from_what(SLEEP_RES));
    if (Disint_resistance())
        you_are("disintegration resistant", from_what(DISINT_RES));
    item_resistance_message(M.AD_DISN, " protected from disintegration", final);
    if (Shock_resistance())
        you_are("shock resistant", from_what(SHOCK_RES));
    item_resistance_message(M.AD_ELEC, " protected from electric shocks",
                            final);
    if (Poison_resistance())
        you_are("poison resistant", from_what(POISON_RES));
    if (Acid_resistance()) {
        buf = `${temp_resist(ACID_RES) ? "temporarily " : ""}${"acid resistant"}`;
        you_are(buf, from_what(ACID_RES));
    }
    item_resistance_message(M.AD_ACID, " protected from acid", final);
    if (Drain_resistance())
        you_are("level-drain resistant", from_what(DRAIN_RES));
    if (Sick_resistance())
        you_are("immune to sickness", from_what(SICK_RES));
    if (Stone_resistance()) {
        buf = `${temp_resist(STONE_RES) ? "temporarily " : ""}${"petrification resistant"}`;
        you_are(buf, from_what(STONE_RES));
    }
    if (Halluc_resistance())
        enl_msg(You_, "resist", "resisted", " hallucinations",
                from_what(HALLUC_RES));
    if (u.uedibility)
        you_can("recognize detrimental food", "");

    /*** Vision and senses ***/
    if ((HBlinded() || EBlinded()) && BBlinded()) /* blind w/ blindness blocked */
        you_can("see", from_what(-BLINDED)); /* Eyes of the Overworld */
    if (Blnd_resist() && !Blind()) /* skip if no eyes or blindfolded */
        you_are("not subject to light-induced blindness",
                from_what(BLND_RES));
    if (See_invisible()) {
        if (!Blind())
            enl_msg(You_, "see", "saw", " invisible", from_what(SEE_INVIS));
        else if (!PermaBlind())
            enl_msg(You_, "will see", "would have seen",
                    " invisible when not blind", "");
        else
            enl_msg(You_, "would see", "would have seen",
                    " invisible if not blind", "");
    }
    if (Blind_telepat())
        you_are("telepathic", from_what(TELEPAT));
    if (Warning())
        you_are("warned", from_what(WARNING));
    if (Warn_of_mon() && warntype.obj) {
        buf = `aware of the presence of ${
                (warntype.obj & M.M2_ORC) ? "orcs"
                : (warntype.obj & M.M2_ELF) ? "elves"
                  : (warntype.obj & M.M2_DEMON) ? "demons"
                    : "something"}`;
        you_are(buf, from_what(WARN_OF_MON));
    }
    if (Warn_of_mon() && warntype.polyd) {
        buf = `aware of the presence of ${
                ((warntype.polyd & (M.M2_HUMAN | M.M2_ELF))
                 === (M.M2_HUMAN | M.M2_ELF)) ? "humans and elves"
                    : (warntype.polyd & M.M2_HUMAN) ? "humans"
                      : (warntype.polyd & M.M2_ELF) ? "elves"
                        : (warntype.polyd & M.M2_ORC) ? "orcs"
                          : (warntype.polyd & M.M2_DEMON) ? "demons"
                            : "certain monsters"}`;
        you_are(buf, "");
    }
    warnspecies = warntype.speciesidx;
    if (Warn_of_mon() && ismnum(warnspecies)) {
        buf = `aware of the presence of ${
                makeplural(M.mons[warnspecies].pmnames[NEUTRAL])}`;
        you_are(buf, from_what(WARN_OF_MON));
    }
    if (Undead_warning())
        you_are("warned of undead", from_what(WARN_UNDEAD));
    if (Searching())
        you_have("automatic searching", from_what(SEARCHING));
    if (Clairvoyant()) {
        you_are("clairvoyant", from_what(CLAIRVOYANT));
    } else if ((HClairvoyant() || EClairvoyant()) && BClairvoyant()) {
        buf = from_what(-CLAIRVOYANT);
        buf = strsubst(buf, " because of ", " if not for ");
        enl_msg(You_, "could be", "could have been", " clairvoyant", buf);
    }
    if (Infravision())
        you_have("infravision", from_what(INFRAVISION));
    if (Detect_monsters()) {
        buf = "sensing the presence of monsters";
        if (wizard()) {
            const detectmon_timeout = (HDetect_monsters() & TIMEOUT);

            if (detectmon_timeout)
                buf += ` (${detectmon_timeout})`;
        }
        you_are(buf, "");
    }
    if (u.umconf) { /* 'u.umconf' is a counter rather than a timeout */
        buf = " monsters when hitting them";
        if (wizard() && !final) {
            if (u.umconf === 1)
                buf += " (next hit only)";
            else /* u.umconf > 1 */
                buf += ` (next ${u.umconf} hits)`;
        }
        enl_msg(You_, "will confuse", "would have confused", buf, "");
    }

    /*** Appearance and behavior ***/
    if (Adornment()) {
        let adorn = 0;

        if (uleft && uleft.otyp === RIN_ADORNMENT)
            adorn += uleft.spe;
        if (uright && uright.otyp === RIN_ADORNMENT)
            adorn += uright.spe;
        /* the sum might be 0 (+0 ring or two which negate each other);
           that yields "you are charismatic" (which isn't pointless
           because it potentially impacts seduction attacks) */
        buf = `${(adorn > 0) ? "more " : (adorn < 0) ? "less " : ""}charismatic`;
        you_are(buf, from_what(ADORNED));
    }
    if (Invisible())
        you_are("invisible", from_what(INVIS));
    else if (Invis())
        you_are("invisible to others", from_what(INVIS));
    /* ordinarily "visible" is redundant; this is a special case for
       the situation when invisibility would be an expected attribute */
    else if ((HInvis() || EInvis()) && BInvis())
        you_are("visible", from_what(-INVIS));
    if (Displaced())
        you_are("displaced", from_what(DISPLACED));
    if (Stealth()) {
        you_are("stealthy", from_what(STEALTH));
    } else if (BStealth() && (HStealth() || EStealth())) {
        buf = ` stealthy${(BStealth() === FROMOUTSIDE) ? " if not mounted" : ""}`;
        enl_msg(You_, "would be", "would have been", buf, "");
    }
    if (Aggravate_monster())
        enl_msg("You aggravate", "", "d", " monsters",
                from_what(AGGRAVATE_MONSTER));
    if (Conflict())
        enl_msg("You cause", "", "d", " conflict", from_what(CONFLICT));

    /*** Transportation ***/
    if (Jumping())
        you_can("jump", from_what(JUMPING));
    if (Teleportation())
        you_can("teleport", from_what(TELEPORT));
    if (Teleport_control())
        you_have("teleport control", from_what(TELEPORT_CONTROL));
    /* actively levitating handled earlier as a status condition */
    if (BLevitation()) { /* levitation is blocked */
        const save_BLev = BLevitation();

        prop(LEVITATION).blocked = 0; /* BLevitation = 0L */
        if (Levitation()) {
            /* either trapped in the floor or inside solid rock
               (or both if chained to buried iron ball and have
               moved one step into solid rock somehow) */
            const trapped = (save_BLev & I_SPECIAL) !== 0,
                terrain = (save_BLev & FROMOUTSIDE) !== 0;

            buf = `${trapped ? " if not trapped" : ""}${
                    (trapped && terrain) ? " and" : ""}${
                    terrain ? if_surroundings_permitted : ""}`;
            enl_msg(You_, "would levitate", "would have levitated", buf, "");
        }
        prop(LEVITATION).blocked = save_BLev; /* BLevitation = save_BLev */
    }
    /* actively flying handled earlier as a status condition */
    if (BFlying()) { /* flight is blocked */
        const save_BFly = BFlying();

        prop(FLYING).blocked = 0; /* BFlying = 0L */
        if (Flying()) {
            enl_msg(You_, "would fly", "would have flown",
                    /* wording quibble: for past tense, "hadn't been"
                       would sound better than "weren't" (and
                       "had permitted" better than "permitted"), but
                       "weren't" and "permitted" are adequate so the
                       extra complexity to handle that isn't worth it */
                    Levitation()
                       ? " if you weren't levitating"
                       : (save_BFly === I_SPECIAL)
                          /* this is an oversimplification; being trapped
                             might also be blocking levitation so flight
                             would still be blocked after escaping trap */
                          ? " if you weren't trapped"
                          : (save_BFly === FROMOUTSIDE)
                             ? if_surroundings_permitted
                             /* two or more of levitation, surroundings,
                                and being trapped in the floor */
                             : " if circumstances permitted",
                    "");
        }
        prop(FLYING).blocked = save_BFly; /* BFlying = save_BFly */
    }
    /* including this might bring attention to the fact that ceiling
       clinging has inconsistencies... */
    if (is_clinger(game.youmonst.data)) {
        const has_lid = has_ceiling(u.uz);

        if (has_lid && !u.uinwater) {
            you_can("cling to the ceiling", "");
        } else {
            buf = ` to the ceiling if ${!has_lid ? "there was one" : ""}${
                    (!has_lid && u.uinwater) ? " and " : ""}${
                    u.uinwater ? (Underwater() ? "you weren't underwater"
                                  : "you weren't in the water") : ""}`;
            /* past tense is applicable for death while Unchanging */
            enl_msg(You_, "could cling", "could have clung", buf, "");
        }
    }
    /* actively walking on water handled earlier as a status condition */
    if (Wwalking() && !walking_on_water())
        you_can("walk on water", from_what(WWALKING));
    /* actively swimming (in water but not under it) handled earlier */
    if (Swimming() && (Underwater() || !u.uinwater))
        you_can("swim", from_what(SWIMMING));
    if (Breathless())
        you_can("survive without air", from_what(MAGICAL_BREATHING));
    else if (Amphibious())
        you_can("breathe water", from_what(MAGICAL_BREATHING));
    if (Passes_walls())
        you_can("walk through walls", from_what(PASSES_WALLS));

    /*** Physical attributes ***/
    if (Regeneration())
        enl_msg("You regenerate", "", "d", "", from_what(REGENERATION));
    if (Slow_digestion())
        you_have("slower digestion", from_what(SLOW_DIGESTION));
    if (u.uhitinc) {
        buf = enlght_combatinc("to hit", u.uhitinc, final);
        if (game.iflags.tux_penalty && !Upolyd())
            buf += ` ${(u.uhitinc < 0) ? "increasing"
                       : (u.uhitinc < Math.trunc(4 * game.urole.spelarmr / 5))
                         ? "partly offsetting"
                         : (u.uhitinc < game.urole.spelarmr) ? "nearly offsetting"
                           : "overcoming"} your suit's penalty`;
        you_have(buf, "");
    }
    if (u.udaminc)
        you_have(enlght_combatinc("damage", u.udaminc, final), "");
    if (u.uspellprot || Protection()) {
        let prot = 0;

        if (uleft && uleft.otyp === RIN_PROTECTION)
            prot += uleft.spe;
        if (uright && uright.otyp === RIN_PROTECTION)
            prot += uright.spe;
        if (uamul && uamul.otyp === AMULET_OF_GUARDING)
            prot += 2;
        if (HProtection() & INTRINSIC)
            prot += u.ublessed;
        prot += u.uspellprot;
        if (prot)
            you_have(enlght_combatinc("defense", prot, final), "");
    }
    if ((armpro = magic_negation(game.youmonst)) > 0) {
        /* magic cancellation factor, conferred by worn armor */
        const mc_types = [
            "" /*ordinary*/, "warded", "guarded", "protected",
        ];
        /* sanity check */
        if (armpro >= mc_types.length)
            armpro = mc_types.length - 1;
        you_are(mc_types[armpro], "");
    }
    if (Half_physical_damage())
        enlght_halfdmg(HALF_PHDAM, final);
    if (Half_spell_damage())
        enlght_halfdmg(HALF_SPDAM, final);
    if (Half_gas_damage())
        enl_msg(You_, "take", "took", " reduced poison gas damage", "");
    if (spellid(0) > NO_SPELL) { /* skip if no spells are known yet */
        /* greatly simplified edition of percent_success(spell.c)--may need
           to be suppressed if oversimplification leads to player confusion */
        let cast_adj;
        const suit = uarm && is_metallic(uarm),
            robe = uarmc && uarmc.otyp === ROBE;

        cast_adj = "";
        if (suit) /* omit "wearing" to shorten the text */
            cast_adj = ` impaired by metallic armor${
                        robe ? ", mitigated by your robe" : ""}`;
        else if (robe)
            cast_adj = " enhanced by wearing a robe";

        if (cast_adj)
            enl_msg("Your spell casting ", "is", "was", cast_adj, "");
    }
    /* polymorph and other shape change */
    if (Protection_from_shape_changers())
        you_are("protected from shape changers",
                from_what(PROT_FROM_SHAPE_CHANGERS));
    if (Unchanging()) {
        let what = null;

        if (!Upolyd()) /* Upolyd handled below after current form */
            you_can("not change from your current form",
                    from_what(UNCHANGING));
        /* blocked shape changes */
        if (Polymorph())
            what = !final ? "polymorph" : "have polymorphed";
        else if (ismnum(u.ulycn))
            what = !final ? "change shape" : "have changed shape";
        if (what) {
            buf = `would ${what} periodically`;
            /* omit from_what(UNCHANGING); too verbose */
            enl_msg(You_, buf, buf, " if not locked into your current form",
                    "");
        }
    } else if (Polymorph()) {
        you_are("polymorphing periodically", from_what(POLYMORPH));
    }
    if (Polymorph_control())
        you_have("polymorph control", from_what(POLYMORPH_CONTROL));
    if (Upolyd() && u.umonnum !== u.ulycn
        /* if we've died from turning into slime, we're polymorphed
           right now but don't want to list it as a temporary attribute
           [we need a more reliable way to detect this situation] */
        && !(final === ENL_GAMEOVERDEAD
             && u.umonnum === M.PM_GREEN_SLIME && !Unchanging())) {
        /* foreign shape (except were-form which is handled below) */
        if (!vampshifted(game.youmonst))
            buf = `polymorphed into ${
                    an(pmname(game.youmonst.data, flags.female ? FEMALE : MALE))}`;
        else
            buf = `polymorphed into ${
                    an(pmname(M.mons[game.youmonst.cham],
                              flags.female ? FEMALE : MALE))} in ${
                    pmname(game.youmonst.data, flags.female ? FEMALE : MALE)} form`;
        if (wizard())
            buf += ` (${u.mtimedone})`;
        you_are(buf, "");
    }
    if (lays_eggs(game.youmonst.data) && flags.female) /* Upolyd */
        you_can("lay eggs", "");
    if (ismnum(u.ulycn)) {
        /* "you are a werecreature [in beast form]" */
        buf = an(pmname(M.mons[u.ulycn], flags.female ? FEMALE : MALE));
        if (u.umonnum === u.ulycn) {
            buf += " in beast form";
            if (wizard())
                buf += ` (${u.mtimedone})`;
        }
        you_are(buf, "");
    }
    if (Unchanging() && Upolyd()) /* !Upolyd handled above */
        you_can("not change from your current form", from_what(UNCHANGING));
    if (Hate_silver())
        you_are("harmed by silver", "");
    /* movement and non-armor-based protection */
    if (Fast())
        you_are(Very_fast() ? "very fast" : "fast", from_what(FAST));
    if (Reflecting())
        you_have("reflection", from_what(REFLECTING));
    if (Free_action())
        you_have("free action", from_what(FREE_ACTION));
    if (Fixed_abil())
        you_have("fixed abilities", from_what(FIXED_ABIL));
    if (Lifesaved())
        enl_msg("Your life ", "will be", "would have been", " saved", "");

    /*** Miscellany ***/
    if (Luck()) {
        ltmp = Math.abs(Luck());
        buf = `${ltmp >= 10 ? "extremely " : ltmp >= 5 ? "very " : ""}${
                Luck() < 0 ? "un" : ""}lucky`;
        if (wizard())
            buf += ` (${Luck()})`;
        you_are(buf, "");
    } else if (wizard())
        enl_msg("Your luck ", "is", "was", " zero", "");
    if (u.moreluck > 0)
        you_have("extra luck", "");
    else if (u.moreluck < 0)
        you_have("reduced luck", "");
    if (carrying(LUCKSTONE) || stone_luck(true)) {
        ltmp = stone_luck(false);
        if (ltmp <= 0)
            enl_msg("Bad luck ", "does", "did", " not time out for you", "");
        if (ltmp >= 0)
            enl_msg("Good luck ", "does", "did", " not time out for you", "");
    }

    if (u.ugangr) {
        buf = ` ${u.ugangr > 6 ? "extremely " : u.ugangr > 3 ? "very " : ""}angry with you`;
        if (wizard())
            buf += ` (${u.ugangr})`;
        enl_msg(u_gname(), " is", " was", buf, "");
    } else {
        /*
         * We need to suppress this when the game is over, because death
         * can change the value calculated by can_pray(), potentially
         * resulting in a false claim that you could have prayed safely.
         */
        if (!final) {
            buf = `${(await can_pray(false)) ? "" : "not "}safely pray`;
            if (wizard())
                buf += ` (${u.ublesscnt})`;
            you_can(buf, "");
        }
    }

    /* DEBUG named fruit debugging: explicitdebug("fruit") is off */

    {
        let p;

        buf = "";
        if (final < 2) { /* still in progress, or quit/escaped/ascended */
            p = "survived after being killed ";
            if (!u.umortality)
                p = !final ? null : "survived";
            else
                buf = N_times(u.umortality);
        } else { /* game ended in character's death */
            p = "are dead";
            switch (u.umortality) {
            case 0:
                /* impossible("dead without dying?"); */
                /* FALLTHRU */
            case 1:
                break; /* just "are dead" */
            default:
                buf = ` (${u.umortality}${ordin(u.umortality)} time!)`;
                break;
            }
        }
        if (p)
            enl_msg(You_, "have been killed ", p, buf, "");
    }
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

/* C ref: insight.c have_been, have_never, never */
const have_been = "have been ", have_never = "have never ";

/* C ref: insight.c you_have_been(), you_have_never(), you_have_X() macros */
function you_have_been(goodthing) { enl_msg(You_, have_been, were, goodthing, ""); }
function you_have_never(badthing) {
    enl_msg(You_, have_never, "never ", badthing, "");
}
function you_have_X(something) { enl_msg(You_, have, "", something, ""); }

// C ref: insight.c doconduct() -- #conduct command [KMH]; shares
// enlightenment's tense handling
export async function doconduct() {
    await show_conduct(ENL_GAMEINPROGRESS);
    return 0; /* ECMD_OK */
}

// C ref: insight.c show_conduct()
/* display conducts; for doconduct(), also disclose() and dump_everything() */
export async function show_conduct(final) {
    const u = U();
    let buf;
    let ngenocided;

    /* 'final' is used by the enl_msg() macros */
    game.en_final = final;
    /* Create the conduct window */
    game.en_win = tty_create_nhwindow(NHW_MENU);
    tty_putstr_sync(game.en_win, 0, "Voluntary challenges:");

    /* rerolling; "You <this or that>" is about the character, rerolling
       is about the player so phrase it differently;
       also, always use past tense since the chance to do something with it
       is gone by time player can issue #conduct command or see disclosure */
    if (!u.uroleplay.reroll)
        buf = " Character rerolling was not enabled.";
    else if (!u.uroleplay.numrerolls)
        buf = " Your character was not rerolled.";
    else
        buf = ` Your character was rerolled ${N_times(u.uroleplay.numrerolls)}.`;
    enlght_out(buf);

    if (u.uroleplay.blind)
        you_have_been("blind from birth");
    if (u.uroleplay.deaf)
        you_have_been("deaf from birth");
    /* note: we don't report "you are without possessions" unless the
       game started with the pauper option set */
    if (u.uroleplay.pauper)
        enl_msg(You_, game.invent ? "started" : "are", "started out",
                " without possessions", "");
    /* nudist is far more than a subset of possessionless, and a much
       more impressive accomplishment, but showing "started out without
       possessions" before "faithfully nudist" looks more logical */
    if (u.uroleplay.nudist)
        you_have_been("faithfully nudist");

    const cnd = u.uconduct;
    if (!cnd.food)
        enl_msg(You_, "have gone", "went", " without food", "");
        /* but beverages are okay */
    else if (!cnd.unvegan)
        you_have_X("followed a strict vegan diet");
    else if (!cnd.unvegetarian)
        you_have_been("vegetarian");

    if (!cnd.gnostic)
        you_have_been("an atheist");

    if (!cnd.weaphit) {
        you_have_never("hit with a wielded weapon");
    } else if (wizard()) {
        buf = `hit with a wielded weapon ${cnd.weaphit} time${plur(cnd.weaphit)}`;
        you_have_X(buf);
    }
    if (!cnd.killer)
        you_have_been("a pacifist");

    if (!cnd.literate) {
        you_have_been("illiterate");
    } else if (wizard()) {
        buf = `read items or engraved ${cnd.literate} time${plur(cnd.literate)}`;
        you_have_X(buf);
    }

    if (!cnd.pets)
        you_have_never("had a pet");

    ngenocided = num_genocides();
    if (ngenocided === 0) {
        you_have_never("genocided any monsters");
    } else {
        buf = `genocided ${ngenocided} type${plur(ngenocided)} of monster${plur(ngenocided)}`;
        you_have_X(buf);
    }

    if (!cnd.polypiles) {
        you_have_never("polymorphed an object");
    } else if (wizard()) {
        buf = `polymorphed ${cnd.polypiles} item${plur(cnd.polypiles)}`;
        you_have_X(buf);
    }

    if (!cnd.polyselfs) {
        you_have_never("changed form");
    } else if (wizard()) {
        buf = `changed form ${cnd.polyselfs} time${plur(cnd.polyselfs)}`;
        you_have_X(buf);
    }

    if (!cnd.wishes) {
        you_have_X("used no wishes");
    } else {
        buf = `used ${cnd.wishes} wish${(cnd.wishes > 1) ? "es" : ""}`;
        if (cnd.wisharti) {
            /* if wisharti == wishes
             *  1 wish (for an artifact)
             *  2 wishes (both for artifacts)
             *  N wishes (all for artifacts)
             * else (N is at least 2 in order to get here; M < N)
             *  N wishes (1 for an artifact)
             *  N wishes (M for artifacts)
             */
            if (cnd.wisharti === cnd.wishes)
                buf += ` (${(cnd.wisharti > 2) ? "all "
                            : (cnd.wisharti === 2) ? "both " : ""}`;
            else
                buf += ` (${cnd.wisharti} `;

            buf += `for ${(cnd.wisharti === 1) ? "an artifact" : "artifacts"})`;
        }
        you_have_X(buf);

        if (!cnd.wisharti)
            enl_msg(You_, "have not wished", "did not wish",
                    " for any artifacts", "");
    }

    /* only report Sokoban conduct if the Sokoban branch has been entered */
    if (sokoban_in_play()) {
        let presentverb = "have violated", pastverb = "violated";

        if (!cnd.sokocheat) {
            presentverb = "have not violated";
            pastverb = "did not violate";
            buf = " any of the special Sokoban rules";
        } else {
            buf = " the special Sokoban rules ";
            buf += N_times(cnd.sokocheat);
        }
        enl_msg(You_, presentverb, pastverb, buf, "");
    }

    show_achievements(final);

    /* Pop up the window and wait for a key */
    await tty_display_nhwindow(game.en_win, true);
    await tty_destroy_nhwindow(game.en_win);
    game.en_win = WIN_ERR;
}

// C ref: insight.c show_achievements()
/* 'final' is used "behind the curtain" by enl_foo() macros; the
   stand-alone window (awin != en_win: #achievements) isn't ported */
function show_achievements(final) {
    const u = U();
    let i, achidx, absidx, acnt;
    let title, buf;
    let awin = WIN_ERR;

    /* unfortunately we can't show the achievements (at least not all of
       them) while the game is in progress because it would give away the
       ID of luckstone (at Mine's End) and of real Amulet of Yendor */
    if (!final && !wizard())
        return;

    /* first, figure whether any achievements have been accomplished
       so that we don't show the header for them if the resulting list
       below it would be empty */
    if ((acnt = count_achievements()) === 0)
        return;

    if (game.en_win !== WIN_ERR) {
        awin = game.en_win; /* end of game disclosure window */
        tty_putstr_sync(awin, 0, "");
    } else {
        throw new Error('show_achievements(): stand-alone window not ported yet');
    }
    title = `Achievement${plur(acnt)}:`;
    tty_putstr_sync(awin, 0, title);

    /* display achievements in the order in which they were recorded;
       lone exception is to defer the Amulet if we just ascended;
       it warrants alternate wording when given away during ascension,
       but the Amulet achievement is always attained before entering
       endgame and the alternate wording looks strange if shown before
       "reached endgame" and "reached Astral" */
    if (remove_achievement(ACH_UWIN)) { /* UWIN == Ascended! */
        /* for ascension, force it to be last and Amulet next to last
           by taking them out and then adding them back */
        if (remove_achievement(ACH_AMUL)) /* should always be True here */
            record_achievement(ACH_AMUL);
        record_achievement(ACH_UWIN);
    }
    for (i = 0; i < acnt; ++i) {
        achidx = u.uachieved[i];
        absidx = Math.abs(achidx);

        switch (absidx) {
        case ACH_BLND:
            enl_msg(You_, "are exploring", "explored",
                    " without being able to see", "");
            break;
        case ACH_NUDE:
            enl_msg(You_, "have gone", "went", " without any armor", "");
            break;
        case ACH_MINE:
            you_have_X("entered the Gnomish Mines");
            break;
        case ACH_TOWN:
            you_have_X("entered Minetown");
            break;
        case ACH_SHOP:
            you_have_X("entered a shop");
            break;
        case ACH_TMPL:
            you_have_X("entered a temple");
            break;
        case ACH_ORCL:
            you_have_X("consulted the Oracle of Delphi");
            break;
        case ACH_NOVL:
            you_have_X("read from a Discworld novel");
            break;
        case ACH_SOKO:
            you_have_X("entered Sokoban");
            break;
        case ACH_SOKO_PRIZE: /* hard to reach guaranteed bag or amulet */
            you_have_X("completed Sokoban");
            break;
        case ACH_MINE_PRIZE: /* hidden guaranteed luckstone */
            you_have_X("completed the Gnomish Mines");
            break;
        case ACH_BGRM:
            you_have_X("entered the Big Room");
            break;
        case ACH_MEDU:
            you_have_X("defeated Medusa");
            break;
        case ACH_TUNE:
            you_have_X(
                "learned the tune to open and close the Castle's drawbridge");
            break;
        case ACH_BELL:
            /* alternate phrasing for present vs past and also for
               possessing the item vs once held it */
            enl_msg(You_,
                    u.uhave.bell ? "have" : "have handled",
                    u.uhave.bell ? "had" : "handled",
                    " the Bell of Opening", "");
            break;
        case ACH_HELL:
            enl_msg(You_, "have ", "", "entered Gehennom", "");
            break;
        case ACH_CNDL:
            enl_msg(You_,
                    u.uhave.menorah ? "have" : "have handled",
                    u.uhave.menorah ? "had" : "handled",
                    " the Candelabrum of Invocation", "");
            break;
        case ACH_BOOK:
            enl_msg(You_,
                    u.uhave.book ? "have" : "have handled",
                    u.uhave.book ? "had" : "handled",
                    " the Book of the Dead", "");
            break;
        case ACH_INVK:
            you_have_X("gained access to Moloch's Sanctum");
            break;
        case ACH_AMUL:
            /* alternate wording for ascended (always past tense) since
               hero had it until #offer forced it to be relinquished */
            enl_msg(You_,
                    u.uhave.amulet ? "have" : "have obtained",
                    u.uevent.ascended ? "delivered"
                     : u.uhave.amulet ? "had" : "had obtained",
                    " the Amulet of Yendor", "");
            break;

        /* reaching Astral makes feedback about reaching the Planes
           be redundant and ascending makes both be redundant, but
           we display all that apply */
        case ACH_ENDG:
            you_have_X("reached the Elemental Planes");
            break;
        case ACH_ASTR:
            you_have_X("reached the Astral Plane");
            break;
        case ACH_UWIN:
            /* the ultimate achievement... */
            enlght_out(" You ascended!");
            break;

        /* rank 0 is the starting condition, not an achievement; 8 is Xp 30 */
        case ACH_RNK1: case ACH_RNK2: case ACH_RNK3: case ACH_RNK4:
        case ACH_RNK5: case ACH_RNK6: case ACH_RNK7: case ACH_RNK8:
            buf = `attained the rank of ${
                rank_of(rank_to_xlev(absidx - (ACH_RNK1 - 1)),
                        game.urole.mnum /* Role_switch */,
                        (achidx < 0) ? true : false)}`;
            you_have_X(buf);
            break;

        default:
            buf = ` [Unexpected achievement #${achidx}.]`;
            enlght_out(buf);
            break;
        } /* switch */
    } /* for */

    /* (awin != en_win: the stand-alone window isn't ported, see above) */
}

// C ref: insight.c num_genocides()
/* number of monster species which have been genocided */
export function num_genocides() {
    let i, n = 0;
    const G_GENOD = 0x02; /* C ref: monflag.h */

    for (i = M.LOW_PM; i < M.NUMMONS; ++i) {
        if (game.mvitals[i].mvflags & G_GENOD) {
            ++n;
            if (UniqCritterIndx(i))
                console.error(`impossible: unique creature '${i}: ${M.mons[i].pmnames[NEUTRAL]}' genocided?`);
        }
    }
    return n;
}

// C ref: insight.c piousness()
/* used for self-probing */
export function piousness(showneg, suffix) {
    const u = U();
    let buf; /* bigger than "insufficiently neutral" */
    let pio;

    /* note: piousness 20 matches MIN_QUEST_ALIGN (quest.h) */
    if (u.ualign.record >= 20)
        pio = "piously";
    else if (u.ualign.record > 13)
        pio = "devoutly";
    else if (u.ualign.record > 8)
        pio = "fervently";
    else if (u.ualign.record > 3)
        pio = "stridently";
    else if (u.ualign.record === 3)
        pio = "";
    else if (u.ualign.record > 0)
        pio = "haltingly";
    else if (u.ualign.record === 0)
        pio = "nominally";
    else if (!showneg)
        pio = "insufficiently";
    else if (u.ualign.record >= -3)
        pio = "strayed";
    else if (u.ualign.record >= -8)
        pio = "sinned";
    else
        pio = "transgressed";

    buf = pio;
    if (suffix && (!showneg || u.ualign.record >= 0)) {
        if (u.ualign.record !== 3)
            buf += " ";
        buf += suffix;
    }
    return buf;
}

// C ref: insight.c size_str()
export function size_str(msize) {
    switch (msize) {
    case M.MZ_TINY:
        return "tiny";
    case M.MZ_SMALL:
        return "small";
    case M.MZ_MEDIUM:
        return "medium";
    case M.MZ_LARGE:
        return "large";
    case M.MZ_HUGE:
        return "huge";
    case M.MZ_GIGANTIC:
        return "gigantic";
    default:
        return `unknown size (${msize})`;
    }
}

/* C ref: priest.c mon_aligntyp() */
function mon_aligntyp_s(mon) {
    const algn = mon.ispriest ? mon.epri?.shralign
                 : mon.isminion ? mon.emin?.min_align
                   : mon.data.maligntyp;

    if (algn === A_NONE)
        return A_NONE; /* negative but differs from chaotic */
    return (algn > 0) ? A_LAWFUL : (algn < 0) ? A_CHAOTIC : A_NEUTRAL;
}

// C ref: insight.c mstatusline() -- stethoscope or probing applied to
// monster -- one-line feedback
export async function mstatusline(mtmp) {
    const u = game.u;
    const alignment = mon_aligntyp_s(mtmp);
    let info = "";

    if (mtmp.mtame) {
        info += ", tame";
        if (game.flags.debug)
            throw new Error('mstatusline(): wizard-mode tameness details not ported yet');
    } else if (mtmp.mpeaceful)
        info += ", peaceful";

    if (mtmp.data === M.mons[M.PM_LONG_WORM]) {
        let segndx, nsegs = count_wsegs(mtmp);

        /* the worm code internals don't consider the head to be one of
           the worm's segments, but we count it as such when presenting
           worm feedback to the player */
        if (!nsegs) {
            info += ", single segment";
        } else {
            ++nsegs; /* include head in the segment count */
            segndx = wseg_at(mtmp, game.bhitpos.x, game.bhitpos.y);
            info += `, ${segndx}${ordin(segndx)} of ${nsegs} segments`;
        }
    }
    if (mtmp.cham != null && mtmp.cham >= 0 /* ismnum() */
        && mtmp.data !== M.mons[mtmp.cham])
        /* don't reveal the innate form (chameleon, vampire, &c),
           just expose the fact that this current form isn't it */
        info += ", shapechanger";
    /* pets eating mimic corpses mimic while eating, so this comes first */
    if (mtmp.meating)
        info += ", eating";
    /* a stethoscope exposes mimic before getting here so this
       won't be relevant for it, but wand of probing doesn't */
    if (mtmp.mundetected || mtmp.m_ap_type
        || visible_region_at(game.bhitpos?.x, game.bhitpos?.y))
        throw new Error('mstatusline(): mhidden_description() not ported yet');
    if (mtmp.mcan)
        info += ", cancelled";
    if (mtmp.mconf)
        info += ", confused";
    if (mtmp.mblinded || !mtmp.mcansee)
        info += ", blind";
    if (mtmp.mstun)
        info += ", stunned";
    if (mtmp.msleeping)
        info += ", asleep";
    else if (mtmp.mfrozen || !mtmp.mcanmove)
        info += ", can't move";
    /* [arbitrary reason why it isn't moving] */
    else if (((mtmp.mstrategy || 0) & STRAT_WAITMASK) !== 0)
        info += ", meditating";
    if (mtmp.mflee)
        info += ", scared";
    if (mtmp.mtrapped)
        info += ", trapped";
    if (mtmp.mspeed)
        info += (mtmp.mspeed === MFAST) ? ", fast"
                : (mtmp.mspeed === MSLOW) ? ", slow"
                  : ", [? speed]";
    if (mtmp.minvis)
        info += ", invisible";
    if (mtmp === u.ustuck)
        throw new Error('mstatusline(): u.ustuck holding/engulfing text not ported yet');
    if (mtmp === u.usteed)
        throw new Error('mstatusline(): steed text not ported yet');
    if (mtmp.mleashed)
        info += ", leashed";

    /* avoid "Status of the invisible newt ..., invisible" */
    /* and unlike a normal mon_nam, use "saddled" even if it has a name */
    const monnambuf = x_monnam(mtmp, ARTICLE_YOUR, null,
                               (SUPPRESS_IT | SUPPRESS_INVISIBLE), false);

    await pline(`Status of ${monnambuf} (${align_str(alignment)}, `
                + `${size_str(mtmp.data.msize)}):  Level ${mtmp.m_lev}  `
                + `HP ${mtmp.mhp}(${mtmp.mhpmax})  AC ${find_mac(mtmp)}${info}.`);
}

// C ref: insight.c ustatusline() -- stethoscope or probing applied to
// hero -- one-line feedback
export async function ustatusline() {
    const u = game.u;
    const has = (p) => !!(u.uprops[p]?.intrinsic || u.uprops[p]?.extrinsic);
    let info = "";

    if (has(SICK))
        throw new Error('ustatusline(): Sick not ported yet');
    if (has(STONED))
        info += ", solidifying";
    if (has(SLIMED))
        info += ", becoming slimy";
    if (has(STRANGLED))
        info += ", being strangled";
    if (has(VOMITING))
        info += ", nauseated"; /* !"nauseous" */
    if (has(CONFUSION))
        info += ", confused";
    if (has(BLINDED) && !u.uprops[BLINDED]?.blocked) { /* Blind */
        info += ", blind";
        if (u.ucreamed)
            throw new Error('ustatusline(): sticky goop not ported yet');
    }
    if (has(STUNNED))
        info += ", stunned";
    if (has(WOUNDED_LEGS) && !u.usteed)
        throw new Error('ustatusline(): Wounded_legs not ported yet');
    if (has(GLIB))
        throw new Error('ustatusline(): Glib not ported yet');
    if (u.utrap)
        info += ", trapped";
    if (has(FAST)) /* Fast */
        /* Very_fast: (HFast & ~INTRINSIC) || EFast */
        info += (((u.uprops[FAST].intrinsic || 0) & ~INTRINSIC)
                 || u.uprops[FAST].extrinsic) ? ", very fast" : ", fast";
    if (u.uundetected)
        info += ", concealed";
    else if ((game.youmonst.m_ap_type || 0) !== 0) /* U_AP_TYPE != M_AP_NOTHING */
        info += ", disguised";
    if (has(INVIS))
        info += ", invisible";
    if (u.ustuck)
        throw new Error('ustatusline(): u.ustuck text not ported yet');
    let reg;
    if (!u.uswallow
        && (reg = visible_region_at(u.ux, u.uy)) != null)
        info += `, in a cloud of ${reg_damg(reg) ? "poison gas" : "vapor"}`;

    const Upolyd = (u.umonnum !== u.umonster);
    await pline(`Status of ${game.plname} (${piousness(false, align_str(u.ualign.type))}):  `
                + `Level ${Upolyd ? M.mons[u.umonnum].mlevel : u.ulevel}  `
                + `HP ${Upolyd ? u.mh : u.uhp}(${Upolyd ? u.mhmax : u.uhpmax})  `
                + `AC ${u.uac}${info}.`);
}

/* C ref: insight.c UniqCritterIndx() -- high priests aren't unique but
   are flagged as such to simplify something */
function UniqCritterIndx(mndx) {
    return (M.mons[mndx].geno & M.G_UNIQ) !== 0 && mndx !== M.PM_HIGH_CLERIC;
}

// C ref: insight.c num_gone() -- the indices of the monster types whose
// mvitals flags match mvflags
function num_gone(mvflags) {
    const mflg = mvflags & 0xff;
    const mindx = [];

    for (let i = M.LOW_PM; i < M.NUMMONS; ++i) {
        /* uniques can't be genocided but can become extinct;
           however, they're never reported as extinct, so skip them */
        if (UniqCritterIndx(i))
            continue;

        if ((game.mvitals[i].mvflags & mflg) !== 0)
            mindx.push(i);
    }
    return mindx;
}

// C ref: insight.c record_achievement()
/* add an achievement to the list; C's list is 0-terminated, here it's a
   plain array */
export function record_achievement(achidx) {
    const u = game.u;
    let i;
    let repeat_achievement = 0;
    const absidx = Math.abs(achidx);

    if (!u.uachieved)
        u.uachieved = [];
    /* valid achievements range from 1 to N_ACH-1; however, ranks can be
       stored as the complement (ie, negative) to track gender */
    if ((achidx < 1 && (absidx < ACH_RNK1 || absidx > ACH_RNK8))
        || achidx >= N_ACH) {
        console.error(`impossible: Achievement #${achidx} is out of range.`);
        return;
    }

    /* find first empty slot or achievement #achidx; an attempt to
       duplicate an achievement can happen if any of Bell, Candelabrum,
       Book, or Amulet is dropped then picked up again */
    for (i = 0; i < u.uachieved.length; ++i)
        if (Math.abs(u.uachieved[i]) === absidx) {
            repeat_achievement = 1;
            break;
        }

    /* SoundAchievement(achidx, 0, repeat_achievement): no sound interface */

    if (repeat_achievement)
        return; /* already recorded, don't duplicate it */
    u.uachieved[i] = achidx;

    /* avoid livelog for achievements recorded during final disclosure:
       nudist and blind-from-birth; also ascension which is suppressed
       by this gets logged separately in really_done() */
    if (game.program_state?.gameover)
        return;

    if (absidx >= ACH_RNK1 && absidx <= ACH_RNK8) {
        livelog_printf(achieve_msg[absidx].llflag,
                       `attained the rank of ${
                           rank_of(rank_to_xlev(absidx - (ACH_RNK1 - 1)),
                                   game.urole.mnum /* Role_switch */,
                                   (achidx < 0) ? true : false)} (level ${u.ulevel})`);
    } else if (achidx === ACH_SOKO_PRIZE
               || achidx === ACH_MINE_PRIZE) {
        /* need to supply extra information for these two */
        const otyp = ((achidx === ACH_SOKO_PRIZE)
                      ? game.context.achieveo.soko_prize_otyp
                      : game.context.achieveo.mines_prize_otyp);

        /* note: OBJ_NAME() works here because both "bag of holding" and
           "amulet of reflection" are fully named in their objects[] entry
           but that's not true in the general case */
        livelog_printf(achieve_msg[achidx].llflag,
                       `${achieve_msg[achidx].msg} ${OBJ_NAME(objects[otyp])}`);
    } else {
        livelog_printf(achieve_msg[absidx].llflag, achieve_msg[absidx].msg);
    }
}

// C ref: insight.c remove_achievement()
/* discard a recorded achievement; return True if removed, False otherwise */
export function remove_achievement(achidx) {
    const u = game.u;
    const list = u.uachieved || [];
    let i;

    for (i = 0; i < list.length; ++i)
        if (Math.abs(list[i]) === Math.abs(achidx))
            break; /* stop when found */
    if (i >= list.length) /* not found */
        return false;
    list.splice(i, 1);
    return true;
}

// C ref: insight.c count_achievements()
export function count_achievements() {
    return (game.u.uachieved || []).length;
}

// C ref: insight.c achieve_rank()
/* convert a rank index to an achievement number; encode it when female
   in order to subsequently report gender-specific ranks accurately */
export function achieve_rank(rank) /* 1..8 */ {
    let achidx = (rank - 1) + ACH_RNK1;

    if (game.flags.female)
        achidx = -achidx;
    return achidx;
}

// C ref: insight.c sokoban_in_play()
/* return True if sokoban branch has been entered, False otherwise */
export function sokoban_in_play() {
    for (const a of game.u.uachieved || [])
        if (a === ACH_SOKO)
            return true;
    return false;
}

// C ref: insight.c vanqsort_cmp() -- qsort() comparison for the
// vanquished list, by flags.vanq_sortmode
function vanqsort_cmp(indx1, indx2) {
    const sortmode = game.flags.vanq_sortmode || 0;
    let res;

    switch (sortmode) {
    default:
    case VANQ_MLVL_MNDX:
        /* sort by monster level */
        res = M.mons[indx2].mlevel - M.mons[indx1].mlevel; /* mlevel high to low */
        break;
    case VANQ_MSTR_MNDX:
        /* sort by monster toughness */
        res = M.mons[indx2].difficulty - M.mons[indx1].difficulty; /* monstr high to low */
        break;
    case VANQ_ALPHA_SEP: {
        const uniq1 = UniqCritterIndx(indx1) ? 1 : 0,
              uniq2 = UniqCritterIndx(indx2) ? 1 : 0;
        if (uniq1 ^ uniq2) { /* one or other uniq, but not both */
            res = uniq2 - uniq1;
            break;
        } /* else both unique or neither unique */
    }
    /*FALLTHRU*/
    case VANQ_ALPHA_MIX: { // eslint-disable-line no-fallthrough
        /* strcmpi(): caseblind alpha, low to high */
        const name1 = M.mons[indx1].pmnames[NEUTRAL].toLowerCase(),
              name2 = M.mons[indx2].pmnames[NEUTRAL].toLowerCase();
        res = name1 < name2 ? -1 : name1 > name2 ? 1 : 0;
        break;
    }
    case VANQ_MCLS_HTOL:
    case VANQ_MCLS_LTOH:
        throw new Error('vanqsort_cmp(): sorting by monster class not ported yet');
    case VANQ_COUNT_H_L:
    case VANQ_COUNT_L_H:
        res = game.mvitals[indx2].died - game.mvitals[indx1].died; /* dead count high to low */
        if (sortmode === VANQ_COUNT_L_H)
            res = -res; /* dead count low to high */
        break;
    }
    /* tiebreaker: internal mons[] index */
    if (res === 0)
        res = indx1 - indx2; /* mndx low to high */
    return res;
}

/* C ref: mondata.h is_rider(), type_is_pname() */
function is_rider(ptr) {
    return ptr === M.mons[M.PM_DEATH] || ptr === M.mons[M.PM_FAMINE]
           || ptr === M.mons[M.PM_PESTILENCE];
}
function type_is_pname(ptr) { return (ptr.mflags2 & M.M2_PNAME) !== 0; }

// C ref: insight.c list_vanquished()
export async function list_vanquished(defquery, ask) {
    let c;
    /* 'A' is only supplied by 'm #vanquished'; 'd' is only supplied by
       dump_everything() when writing dumplog */
    const force_sort = (defquery === 'A'),
          dumping = (defquery === 'd');

    if (force_sort)
        throw new Error('list_vanquished(): set_vanq_order() not ported yet');
    if (dumping || force_sort) {
        defquery = 'y';
        ask = false; /* redundant */
    }

    /* get totals first */
    let ntypes = 0;
    let total_killed = 0;
    const mindx = [];
    for (let i = M.LOW_PM; i < M.NUMMONS; i++) {
        let nkilled;
        if ((nkilled = (game.mvitals[i]?.died || 0)) === 0)
            continue;
        mindx[ntypes++] = i;
        total_killed += nkilled;
    }

    /* vanquished creatures list;
     * includes all dead monsters, not just those killed by the player
     */
    if (ntypes !== 0) {
        if (ask) {
            let allow_yn;

            if (ntypes > 1) {
                allow_yn = "ynaq"; /* ynaqchars */
            } else {
                allow_yn = "ynq"; /* don't include 'a', but */
                allow_yn += "\x1ba"; /* allow user to answer 'a' */
                if (defquery === 'a') /* potential default from 'disclose' */
                    defquery = 'y';
            }
            c = await tty_yn_function("Do you want an account of creatures vanquished?",
                                      allow_yn, defquery);
        } else {
            c = defquery;
        }

        if (c === 'q')
            game.program_state.stopprint = (game.program_state.stopprint || 0) + 1;
        if (c === 'y' || c === 'a') {
            let mlet, prev_mlet = 0; /* used as small integer, not character */
            let was_uniq = false, special_hdr = false;
            let buf, buftoo;

            if (c === 'a' && ntypes > 1) /* ask user to choose sort order */
                throw new Error('list_vanquished(): set_vanq_order() not ported yet');
            const sortmode = game.flags.vanq_sortmode || 0;
            const uniq_header = (sortmode === VANQ_ALPHA_SEP);
            const class_header = ((sortmode === VANQ_MCLS_LTOH
                                   || sortmode === VANQ_MCLS_HTOL)
                                  && ntypes > 1);

            const klwin = tty_create_nhwindow(NHW_MENU);
            await tty_putstr(klwin, 0, "Vanquished creatures:");
            if (!dumping)
                await tty_putstr(klwin, 0, "");

            mindx.sort(vanqsort_cmp); /* qsort() */
            for (let ni = 0; ni < ntypes; ni++) {
                const i = mindx[ni];
                const nkilled = game.mvitals[i].died;
                const Rider = is_rider(M.mons[i]);
                mlet = M.mons[i].mlet;
                if (class_header
                    && (mlet !== prev_mlet || (special_hdr && !Rider))) {
                    throw new Error('list_vanquished(): class headers (def_monsyms[].explain) not ported yet');
                }
                if (UniqCritterIndx(i)) {
                    buf = `${!type_is_pname(M.mons[i]) ? "the " : ""}${
                        M.mons[i].pmnames[NEUTRAL]}`;
                    if (nkilled > 1)
                        buf += ` (${N_times(nkilled)})`;
                    was_uniq = true;
                } else {
                    if (uniq_header && was_uniq) {
                        await tty_putstr(klwin, 0, "");
                        was_uniq = false;
                    }
                    /* trolls or undead might have come back,
                       but we don't keep track of that */
                    if (nkilled === 1)
                        buf = an(M.mons[i].pmnames[NEUTRAL]);
                    else
                        buf = `${String(nkilled).padStart(3)} ${
                            makeplural(M.mons[i].pmnames[NEUTRAL])}`;
                }
                /* number of leading spaces to match 3 digit prefix */
                const lc = buf.toLowerCase();
                let pfx = lc.startsWith("the ") ? 0
                          : lc.startsWith("an ") ? 1
                            : lc.startsWith("a ") ? 2
                              : !(buf[2] >= '0' && buf[2] <= '9') ? 4 : 0;
                if (class_header)
                    ++pfx;
                buftoo = ' '.repeat(pfx) + buf;
                await tty_putstr(klwin, 0, buftoo);
            }
            /*
             * if (Hallucination)
             *     putstr(klwin, 0, "and a partridge in a pear tree");
             */
            if (ntypes > 1) {
                if (!dumping)
                    await tty_putstr(klwin, 0, "");
                buf = `${total_killed} creatures vanquished.`;
                await tty_putstr(klwin, 0, buf);
            }
            await tty_display_nhwindow(klwin, true);
            await tty_destroy_nhwindow(klwin);
        }
    } else if (!game.program_state?.gameover) {
        /* #vanquished rather than final disclosure, so pline() is ok */
        await pline("No creatures have been vanquished.");
    } else if (dumping) {
        throw new Error('list_vanquished(): DUMPLOG not ported yet');
    }
}

// C ref: insight.c list_genocided() -- the #genocided command case
// and the end-of-game question; the species list itself isn't ported
export async function list_genocided(defquery, ask) {
    const G_GENOD = 0x02, G_EXTINCT = 0x01; /* C ref: monflag.h */
    let both = !!(game.program_state?.gameover || game.flags.debug
                  || game.flags.explore);
    const dumping = (defquery === 'd');
    const genoing = (defquery === 'g');

    if (dumping || genoing)
        defquery = 'y';
    if (genoing)
        both = false; /* genocides only, not extinctions */

    const ngenocided = num_gone(G_GENOD).length; /* num_genocides() */
    const nextinct = both ? num_gone(G_EXTINCT).length : 0; /* num_extinct() */
    const mvflags = G_GENOD | (both ? G_EXTINCT : 0);
    const ngone = num_gone(mvflags).length;

    /* genocided or extinct species list */
    if (ngone > 0) {
        const buf = `Do you want a list of ${(nextinct && !ngenocided) ? "extinct " : ""
                     }species${ngenocided ? " genocided" : ""}${
                     (nextinct && ngenocided) ? " and extinct" : ""}?`;
        const c = ask ? await tty_yn_function(buf, (ngone > 1) ? "ynaq" : "ynq\x1ba",
                                              defquery)
                      : defquery;
        if (c === 'q')
            game.program_state.stopprint = (game.program_state.stopprint || 0) + 1;
        if (c === 'y' || c === 'a')
            throw new Error('list_genocided(): the species list not ported yet');
    /* See the comment for similar code near the end of list_vanquished(). */
    } else if (!game.program_state?.gameover) {
        /* #genocided rather than final disclosure, so pline() is ok and
           extinction has been ignored */
        await pline(`No creatures have been genocided${genoing ? " yet" : ""}.`);
    } else if (dumping) { /* 'gameover' is True if we make it here */
        throw new Error('list_genocided(): DUMPLOG not ported yet');
    }
}

// C ref: insight.c dogenocided() -- M-g - #genocided command
export async function dogenocided() {
    await list_genocided(game.iflags.menu_requested ? 'a' : 'y', false);
    return 0; /* ECMD_OK */
}

// C ref: insight.c do_gamelog() -- #chronicle command (CHRONICLE is on)
export async function do_gamelog() {
    if (game.gamelog) {
        await show_gamelog(ENL_GAMEINPROGRESS);
    } else {
        await pline("No chronicled events.");
    }
    return 0; /* ECMD_OK */
}

/* C ref: insight.c LL_majors, majorevent(), spoilerevent() --
   'major' events for dumplog */
const LL_majors = (0
                   | LL_WISH
                   | LL_ACHIEVE
                   | LL_UMONST
                   | LL_DIVINEGIFT
                   | LL_LIFESAVE
                   | LL_ARTIFACT
                   | LL_GENOCIDE
                   | LL_DUMP); /* explicitly for dumplog */
function majorevent(llmsg) { return (llmsg.flags & LL_majors) !== 0; }
function spoilerevent(llmsg) { return (llmsg.flags & LL_SPOILER) !== 0; }

// C ref: insight.c show_gamelog() -- #chronicle details
export async function show_gamelog(final) {
    let llmsg;
    let buf;
    let eventcnt = 0;

    const win = tty_create_nhwindow(NHW_TEXT);
    buf = `${final ? "Major" : "Logged"} events:`;
    await tty_putstr(win, 0, buf);
    for (llmsg = game.gamelog; llmsg; llmsg = llmsg.next) {
        if (final && !majorevent(llmsg))
            continue;
        if (!final && !wizard() && spoilerevent(llmsg))
            continue;
        if (!eventcnt++)
            await tty_putstr(win, 0, " Turn");
        buf = `${String(llmsg.turn).padStart(5)}: ${llmsg.text}`;
        await tty_putstr(win, 0, buf);
    }
    /* since start of game is logged as a major event, 'eventcnt' should
       never end up as 0; for 'final', end of game is a major event too */
    if (!eventcnt)
        await tty_putstr(win, 0, " none");

    await tty_display_nhwindow(win, true);
    await tty_destroy_nhwindow(win);
}

// C ref: insight.c dovanquished() -- #vanquished command
export async function dovanquished() {
    await list_vanquished(game.iflags.menu_requested ? 'A' : 'y', false);
    game.iflags.menu_requested = false;
    return 0; /* ECMD_OK */
}

// C ref: insight.c trap_predicament()
/* describe u.utraptype; used by status_enlightenment() and self_lookat() */
export function trap_predicament(final, wizxtra) {
    const u = game.u;
    let outbuf;
    let t;

    /* caller has verified u.utrap */
    switch (u.utraptype) {
    case TT_BURIEDBALL_IS:
        outbuf = "tethered to something buried";
        break;
    case TT_LAVA_IS:
        outbuf = `sinking into ${final ? "lava" : hliquid_is("lava")}`;
        break;
    case TT_INFLOOR_IS:
        outbuf = `stuck in ${the_is(surface_is(u.ux, u.uy))}`;
        break;
    default: /* TT_BEARTRAP, TT_PIT, or TT_WEB */
        outbuf = "trapped";
        if ((t = t_at_is(u.ux, u.uy)) != null) /* should never be null */
            outbuf += ` in ${an(trapname_is(t.ttyp, false))}`;
        break;
    }
    if (wizxtra) { /* give extra information for wizard mode enlightenment */
        /* curly braces: u.utrap is an escape attempt counter rather than a
           turn timer so use different ornamentation than usual parentheses */
        outbuf += ` {${u.utrap}}`;
    }
    return outbuf;
}
