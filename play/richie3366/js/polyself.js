// polyself.js — Hero polymorph (partial).
// C ref: polyself.c / wizcmds.c wiz_polyself

import { game } from './gstate.js';
import { rn2, rn1, d, rnd } from './rng.js';
import { dist2, strstri, strsubst } from './hacklib.js';
import {
    pline, You, urgent_pline, newsym, see_monsters, impossible, Hallucination,
    canseemon,
} from './display.js';
import { getlin, yn_function, y_n } from './getline.js';
import { getdir } from './lock.js';
import { an, the, the_unique_pm, set_body_part, yname, vtense, simpleonames, makeplural, cxname, ansimpleoname, simple_typename, otense } from './objnam.js';
import {
    pmname, type_is_pname, mon_nam, Monnam, s_suffix, Ugender, hliquid,
    y_monnam, l_monnam,
} from './do_name.js';
import { Unaware, newuhs } from './eat.js';
import { attacktype_fordmg, killed } from './uhitm.js';
import {
    AT_SPIT, AT_GAZE, AT_ENGL, AD_BLND, AD_DRST, AD_ACID,
    AD_CONF, AD_FIRE, AD_ELEC, AD_COLD,
} from './mhitm.js';
import { mksobj, objects_at, maybe_adjust_light } from './mkobj.js';
import { throwit } from './dothrow.js';
import { ubuzz, ubreatheu, resists_fire, destroy_items } from './zap.js';
import { were_summon, were_beastie, counter_were } from './were.js';
import { unpunish } from './read.js';
import { surface, split_mon } from './sit.js';
import { sticks } from './engrave.js';
import {
    ceiling, t_at, instapetrify, maketrap, deltrap, feeltrap, dotrap,
    ignite_items,
} from './trap.js';
import { has_ceiling } from './dungeon.js';
import { dryup } from './fountain.js';
import { aggravate } from './wizard.js';
import { wakeup, egg_type_from_parent, setmangry } from './mon.js';
import { Punished } from './pray.js';
import { name_to_mon, name_to_monclass, set_mon_data } from './mondata.js';
import {
    exercise, acurr, A_STR, A_CON, A_WIS, A_DEX, adjabil, redist_attr, newhp,
} from './attrib.js';
import { newpw, rndexp, setuhpmax } from './exper.js';
import { find_ac } from './u_init.js';
import {
    setworn, Helmet_off, Gloves_off, Boots_off, Shield_off,
    Armor_gone, Cloak_off, Blindf_off, cloak_simple_name,
} from './do_wear.js';
import { dropx, canletgo, make_blinded } from './do.js';
import { uswapwepgone, uwepgone, could_twoweap, untwoweapon } from './wield.js';
import { races } from './roles.js';
import { encumber_msg, useup, weapon_descr, update_inventory, observe_object, Blind } from './invent.js';
import { end_burn, learn_egg_type, artifact_light, arti_light_radius, Invis } from './timeout.js';
import { racial_exception, has_horns, num_horns, WrappingAllowed, is_flimsy } from './worn.js';
import { helm_simple_name, digests, set_ustuck } from './mhitu.js';
import {
    losehp, nomul, is_pool, waterbody_name, On_stairs, in_rooms,
    monst_to_any,
} from './hack.js';
import { finish_losehp_done, done, find_delayed_killer, dealloc_killer } from './end.js';
import { steed_vs_stealth } from './steed.js';
// polymon whole-body port deps (imports.mjs --can: all SAFE, hoisted fns,
// no new cycle — pline/dig/pickup add no cycle at all).
import { canspotmon } from './display.js';
import { Some_Monnam, Mgender } from './do_name.js';
import { rnl } from './rng.js';
import { hideunder } from './mon.js';
import { makeknown } from './invent.js';
import { unmul, is_lava } from './hack.js';
import { expels } from './mhitu.js';
import { set_utrap, reset_utrap, selftouch } from './trap.js';
import { can_ride, dismount_steed } from './steed.js';
// dogaze/dospinweb/rehumanize arms (imports.mjs --can: both SAFE, hoisted fns).
import { couldsee, set_mimic_blocking } from './vision.js';
import { emits_light, del_light_source } from './light.js';
import {
    flaming, unsolid, amorphous, likes_lava, breathless, poly_when_stoned,
    is_swimmer, MZ_HUGE,
} from './monsters.js';
import {
    TT_WEB, TT_BEARTRAP, TT_LAVA, TT_INFLOOR, TT_BURIEDBALL, DISMOUNT_POLY,
    SICK_ALL, LL_CONDUCT, NECK, STRANGLED,
} from './const.js';
import { livelog_printf } from './pline.js';
import {
    make_stoned, make_sick, make_slimed, make_glib,
} from './potion.js';
import { buried_ball_to_freedom, bury_objs } from './dig.js';
import { spoteffects } from './pickup.js';
import {
    mons,
    polyok,
    is_male,
    is_female,
    is_neuter,
    is_placeholder,
    is_orc,
    is_elf,
    is_dwarf,
    is_gnome,
    is_giant,
    is_undead,
    is_demon,
    is_golem,
    is_clinger,
    is_unicorn,
    strongmonst,
    bigmonst,
    humanoid,
    is_whirly,
    noncorporeal,
    nohands,
    verysmall,
    has_head,
    is_flyer,
    is_floater,
    is_vampire,
    is_vampshifter,
    is_bat,
    your_race,
    G_UNIQ,
    is_were,
    webmaker,
    is_hider,
    hides_under,
    is_mind_flayer,
    lays_eggs,
    eggs_in_water,
    mindless,
    telepathic,
    infravision,
    can_teleport,
    control_teleport,
    regenerates,
    touch_petrifies,
    haseyes,
    MZ_SMALL,
    M1_SLITHY,
    MR_FIRE,
    MR_COLD,
    MR_SLEEP,
    MR_DISINT,
    MR_ELEC,
    MR_POISON,
    MR_ACID,
    MR_STONE,
    M1_SEE_INVIS,
    is_animal,
} from './monsters.js';
import { golemhp, is_home_elemental, mkclass_poly, Is_dragon_scales } from './makemon.js';
import {
    POLY_CONTROLLED,
    POLY_LOW_CTRL,
    POLY_MONSTER,
    POLY_REVERT,
    NON_PM,
    LOW_PM,
    Upolyd,
    DIED,
    GENOCIDED,
    ECMD_OK,
    ECMD_TIME,
    MALE,
    FEMALE,
    NEUTRAL,
    G_GENOD,
    W_ARM,
    W_ARMC,
    W_ARMU,
    W_ARMG,
    W_ARMH,
    W_ARMS,
    W_ARMF,
    In_endgame,
    MAXULEV,
    FROMFORM,
    TIMEOUT,
    FLYING,
    BLINDED,
    TELEPORT,
    TELEPORT_CONTROL,
    FIRE_RES,
    COLD_RES,
    SLEEP_RES,
    DISINT_RES,
    SHOCK_RES,
    POISON_RES,
    ACID_RES,
    STONE_RES,
    DRAIN_RES,
    INFRAVISION,
    REGENERATION,
    KILLED_BY_AN,
    BOLT_LIM,
    BZ_OFS_AD,
    BZ_U_BREATH,
    ECMD_CANCEL,
    IS_FOUNTAIN,
    hidespinchars,
    ismnum,
    POLYMORPH_CONTROL,
    POLYMORPH,
    UNCHANGING,
    I_SPECIAL,
    TT_PIT,
    M_AP_NOTHING,
    M_AP_OBJECT,
    M_AP_FURNITURE,
    M_AP_MONSTER,
    M_AP_TYPE,
    Is_airlevel,
    Is_waterlevel,
    SPIKED_PIT,
    STR18,
    STR19,
    NO_PART, ARM, EYE, FINGER, FINGERTIP, FOOT, HAND, HANDED,
    HEAD, LEG, TOE, NOSE, HAIR,
    NATTK, LS_MONSTER, STONING, KILLED_BY, NO_KILLER_PREFIX, IS_AIR,
    STAIRS, SHOPBASE, SHOP_WEB_COST, NO_TRAP_FLAGS,
    PIT, SQKY_BOARD, TELEP_TRAP, LEVEL_TELEP, MAGIC_PORTAL,
    VIBRATING_SQUARE, WEB, HOLE, TRAPDOOR, ROLLING_BOULDER_TRAP,
    ARROW_TRAP, DART_TRAP, BEAR_TRAP, ROCKTRAP, FIRE_TRAP, LANDMINE,
    SLP_GAS_TRAP, RUST_TRAP, MAGIC_TRAP, ANTI_MAGIC, POLY_TRAP,
} from './const.js';
import {
    PM_HUMAN,
    PM_ORC,
    PM_ELF,
    PM_DWARF,
    PM_GNOME,
    PM_CLERIC,
    SPECIAL_PM,
    monsterNames,
} from './generated/monsters_data.js';
import { objectNames, is_sword } from './objects.js';

const GRAY_DRAGON_SCALES = objectNames.indexOf('GRAY_DRAGON_SCALES');
const SILVER_DRAGON_SCALES = objectNames.indexOf('SILVER_DRAGON_SCALES');
const GOLD_DRAGON_SCALES = objectNames.indexOf('GOLD_DRAGON_SCALES');
const RED_DRAGON_SCALES = objectNames.indexOf('RED_DRAGON_SCALES');
const ORANGE_DRAGON_SCALES = objectNames.indexOf('ORANGE_DRAGON_SCALES');
const WHITE_DRAGON_SCALES = objectNames.indexOf('WHITE_DRAGON_SCALES');
const BLACK_DRAGON_SCALES = objectNames.indexOf('BLACK_DRAGON_SCALES');
const BLUE_DRAGON_SCALES = objectNames.indexOf('BLUE_DRAGON_SCALES');
const GREEN_DRAGON_SCALES = objectNames.indexOf('GREEN_DRAGON_SCALES');
const YELLOW_DRAGON_SCALES = objectNames.indexOf('YELLOW_DRAGON_SCALES');
const GRAY_DRAGON_SCALE_MAIL = objectNames.indexOf('GRAY_DRAGON_SCALE_MAIL');
const SILVER_DRAGON_SCALE_MAIL = objectNames.indexOf('SILVER_DRAGON_SCALE_MAIL');
const GOLD_DRAGON_SCALE_MAIL = objectNames.indexOf('GOLD_DRAGON_SCALE_MAIL');
const RED_DRAGON_SCALE_MAIL = objectNames.indexOf('RED_DRAGON_SCALE_MAIL');
const ORANGE_DRAGON_SCALE_MAIL = objectNames.indexOf('ORANGE_DRAGON_SCALE_MAIL');
const WHITE_DRAGON_SCALE_MAIL = objectNames.indexOf('WHITE_DRAGON_SCALE_MAIL');
const BLACK_DRAGON_SCALE_MAIL = objectNames.indexOf('BLACK_DRAGON_SCALE_MAIL');
const BLUE_DRAGON_SCALE_MAIL = objectNames.indexOf('BLUE_DRAGON_SCALE_MAIL');
const GREEN_DRAGON_SCALE_MAIL = objectNames.indexOf('GREEN_DRAGON_SCALE_MAIL');
const YELLOW_DRAGON_SCALE_MAIL = objectNames.indexOf('YELLOW_DRAGON_SCALE_MAIL');

const PM_GRAY_DRAGON = monsterNames.indexOf('PM_GRAY_DRAGON');
const PM_SILVER_DRAGON = monsterNames.indexOf('PM_SILVER_DRAGON');
const PM_GOLD_DRAGON = monsterNames.indexOf('PM_GOLD_DRAGON');
const PM_RED_DRAGON = monsterNames.indexOf('PM_RED_DRAGON');
const PM_ORANGE_DRAGON = monsterNames.indexOf('PM_ORANGE_DRAGON');
const PM_WHITE_DRAGON = monsterNames.indexOf('PM_WHITE_DRAGON');
const PM_BLACK_DRAGON = monsterNames.indexOf('PM_BLACK_DRAGON');
const PM_BLUE_DRAGON = monsterNames.indexOf('PM_BLUE_DRAGON');
const PM_GREEN_DRAGON = monsterNames.indexOf('PM_GREEN_DRAGON');
const PM_YELLOW_DRAGON = monsterNames.indexOf('PM_YELLOW_DRAGON');
const PM_DEATH = monsterNames.indexOf('PM_DEATH');
const PM_URUK_HAI = monsterNames.indexOf('PM_URUK_HAI');
const PM_ORC_CAPTAIN = monsterNames.indexOf('PM_ORC_CAPTAIN');
const PM_OWLBEAR = monsterNames.indexOf('PM_OWLBEAR');
const PM_MUMAK = monsterNames.indexOf('PM_MUMAK');
const PM_MASTODON = monsterNames.indexOf('PM_MASTODON');
const PM_SHARK = monsterNames.indexOf('PM_SHARK');
const PM_JELLYFISH = monsterNames.indexOf('PM_JELLYFISH');
const PM_KRAKEN = monsterNames.indexOf('PM_KRAKEN');
const PM_FLOATING_EYE = monsterNames.indexOf('PM_FLOATING_EYE');
const PM_MEDUSA = monsterNames.indexOf('PM_MEDUSA');
const AMULET_OF_UNCHANGING = objectNames.indexOf('AMULET_OF_UNCHANGING');
const PM_GREMLIN = monsterNames.indexOf('PM_GREMLIN');
const PM_GREEN_SLIME = monsterNames.indexOf('PM_GREEN_SLIME');
const AMULET_OF_STRANGULATION = objectNames.indexOf('AMULET_OF_STRANGULATION');
// C ref: polyself.c:33 — file-static("No longer petrify-resistant, you").
const no_longer_petrify_resistant = 'No longer petrify-resistant, you';
const CORPSE = objectNames.indexOf('CORPSE');
const STRANGE_OBJECT = objectNames.indexOf('STRANGE_OBJECT');
const PM_GIANT_EEL = monsterNames.indexOf('PM_GIANT_EEL');
const PM_ELECTRIC_EEL = monsterNames.indexOf('PM_ELECTRIC_EEL');
const BLINDING_VENOM = objectNames.indexOf('BLINDING_VENOM');
const ACID_VENOM = objectNames.indexOf('ACID_VENOM');
const ROBE = objectNames.indexOf('ROBE');
const MUMMY_WRAPPING = objectNames.indexOf('MUMMY_WRAPPING');
const ALCHEMY_SMOCK = objectNames.indexOf('ALCHEMY_SMOCK');
const PM_MARILITH = monsterNames.indexOf('PM_MARILITH');
const PM_WINGED_GARGOYLE = monsterNames.indexOf('PM_WINGED_GARGOYLE');
const PM_STONE_GOLEM = monsterNames.indexOf('PM_STONE_GOLEM');
const PM_AMOROUS_DEMON = monsterNames.indexOf('PM_AMOROUS_DEMON');
const PM_VAMPIRE_LEADER = monsterNames.indexOf('PM_VAMPIRE_LEADER');
const PM_WOLF = monsterNames.indexOf('PM_WOLF');
const PM_FOG_CLOUD = monsterNames.indexOf('PM_FOG_CLOUD');
const PM_VAMPIRE_BAT = monsterNames.indexOf('PM_VAMPIRE_BAT');
const PM_RAVEN = monsterNames.indexOf('PM_RAVEN');
const PM_KI_RIN = monsterNames.indexOf('PM_KI_RIN');
const PM_ROTHE = monsterNames.indexOf('PM_ROTHE');
const PM_STALKER = monsterNames.indexOf('PM_STALKER');
// C polyself.c:545–558 placeholder substitutes + :572–575 own-role cleric.
const PM_GIANT = monsterNames.indexOf('PM_GIANT');
const PM_HILL_ORC = monsterNames.indexOf('PM_HILL_ORC');
const PM_MORDOR_ORC = monsterNames.indexOf('PM_MORDOR_ORC');
const PM_GREEN_ELF = monsterNames.indexOf('PM_GREEN_ELF');
const PM_GREY_ELF = monsterNames.indexOf('PM_GREY_ELF');
const PM_STONE_GIANT = monsterNames.indexOf('PM_STONE_GIANT');
const PM_HILL_GIANT = monsterNames.indexOf('PM_HILL_GIANT');
const PM_ALIGNED_CLERIC = monsterNames.indexOf('PM_ALIGNED_CLERIC');

// C ref: monattk.h AT_BREA / AT_CLAW
const AT_BREA = 12;
const AT_CLAW = 1;

/** C ref: monflag.h MS_SHRIEK — shrieker msound (mon.js keeps its own copy). */
const MS_SHRIEK = 18;

/**
 * C ref: hack.h mdistu — distu(mx, my), squared distance from hero.
 */
function mdistu(mtmp) {
    const u = game.u || {};
    return dist2(u.ux | 0, u.uy | 0, mtmp?.mx | 0, mtmp?.my | 0);
}

function mungspaces(s) {
    return String(s || '').trim().replace(/\s+/g, ' ');
}

/**
 * C ref: mondata.c attacktype — any mattk slot with aatyp.
 * Local copy to avoid makemon import cycles.
 */
function attacktype(ptr, aatyp) {
    const slots = ptr?.mattk;
    if (!slots) return false;
    for (let i = 0; i < slots.length; i++) {
        if (slots[i]?.aatyp === aatyp) return true;
    }
    return false;
}

/** C ref: mondata.h can_breathe — attacktype(ptr, AT_BREA) */
function can_breathe(ptr) {
    return attacktype(ptr, AT_BREA);
}

/** C ref: obj.h Is_dragon_armor — scales or scale mail. */
function Is_dragon_armor(obj) {
    if (!obj) return false;
    const t = obj.otyp | 0;
    return (t >= GRAY_DRAGON_SCALES && t <= YELLOW_DRAGON_SCALES)
        || (t >= GRAY_DRAGON_SCALE_MAIL && t <= YELLOW_DRAGON_SCALE_MAIL);
}

/**
 * C ref: polyself.c armor_to_dragon `:2191–2225` (C staticfn: same-file
 * callers only — module-local here). Worn dragon armor otyp → adult dragon
 * mndx, else NON_PM. SHIMMERING pair omitted: C keeps it under
 * `#if 0 // DEFERRED`.
 * @param {number} atyp worn-armor otyp
 * @returns {number} mndx
 */
function armor_to_dragon(atyp) {
    switch (atyp | 0) {
    case GRAY_DRAGON_SCALE_MAIL:
    case GRAY_DRAGON_SCALES:
        return PM_GRAY_DRAGON;
    case SILVER_DRAGON_SCALE_MAIL:
    case SILVER_DRAGON_SCALES:
        return PM_SILVER_DRAGON;
    case GOLD_DRAGON_SCALE_MAIL:
    case GOLD_DRAGON_SCALES:
        return PM_GOLD_DRAGON;
    case RED_DRAGON_SCALE_MAIL:
    case RED_DRAGON_SCALES:
        return PM_RED_DRAGON;
    case ORANGE_DRAGON_SCALE_MAIL:
    case ORANGE_DRAGON_SCALES:
        return PM_ORANGE_DRAGON;
    case WHITE_DRAGON_SCALE_MAIL:
    case WHITE_DRAGON_SCALES:
        return PM_WHITE_DRAGON;
    case BLACK_DRAGON_SCALE_MAIL:
    case BLACK_DRAGON_SCALES:
        return PM_BLACK_DRAGON;
    case BLUE_DRAGON_SCALE_MAIL:
    case BLUE_DRAGON_SCALES:
        return PM_BLUE_DRAGON;
    case GREEN_DRAGON_SCALE_MAIL:
    case GREEN_DRAGON_SCALES:
        return PM_GREEN_DRAGON;
    case YELLOW_DRAGON_SCALE_MAIL:
    case YELLOW_DRAGON_SCALES:
        return PM_YELLOW_DRAGON;
    default:
        return NON_PM;
    }
}

/** C ref: youprop.h Polymorph_control — H || E via flat + uprops. */
function Polymorph_control(u = game.u || {}) {
    const e = u.uprops?.[POLYMORPH_CONTROL];
    return !!((u.Polymorph_control || u.HPolymorph_control || u.EPolymorph_control)
        || (e?.intrinsic | 0) || (e?.extrinsic | 0));
}

/** C ref: youprop.h Unchanging — H || E via flat + uprops.
 * Exported for do_wear.c Amulet_on CHANGE arm. */
export function Unchanging(u = game.u || {}) {
    const e = u.uprops?.[UNCHANGING];
    return !!((u.Unchanging || u.HUnchanging || u.EUnchanging)
        || (e?.intrinsic | 0) || (e?.extrinsic | 0));
}

/** C ref: mondata.c sliparm — whirly / small / noncorporeal */
function sliparm(ptr) {
    return !!(is_whirly(ptr) || (ptr?.msize ?? 99) <= MZ_SMALL || noncorporeal(ptr));
}

/** C ref: mondata.c breakarm — large forms that shatter armor */
function breakarm(ptr) {
    if (sliparm(ptr)) return false;
    // C mondata.c:645–649 — marilith / winged gargoyle special cases
    // (matches worn.js breakarm).
    const mndx = ptr?.mndx ?? -1;
    return !!(bigmonst(ptr) || ((ptr?.msize ?? 0) > MZ_SMALL && !humanoid(ptr))
        || mndx === PM_MARILITH || mndx === PM_WINGED_GARGOYLE);
}

/** C ref: mondata.h slithy — M1_SLITHY */
function slithy(ptr) {
    return !!((ptr?.mflags1 ?? 0) & M1_SLITHY);
}

/**
 * C ref: polyself.c mbodypart — anatomy noun for a monster's form.
 * Tables and specials match C order. JS mons() allocates, so compare mndx.
 */
const HUMANOID_PARTS = [
    'arm', 'eye', 'face', 'finger', 'fingertip', 'foot', 'hand', 'handed',
    'head', 'leg', 'light headed', 'neck', 'spine', 'toe', 'hair', 'blood',
    'lung', 'nose', 'stomach',
];
const JELLY_PARTS = [
    'pseudopod', 'dark spot', 'front', 'pseudopod extension',
    'pseudopod extremity', 'pseudopod root', 'grasp', 'grasped',
    'cerebral area', 'lower pseudopod', 'viscous', 'middle', 'surface',
    'pseudopod extremity', 'ripples', 'juices', 'surface', 'sensor', 'stomach',
];
const ANIMAL_PARTS = [
    'forelimb', 'eye', 'face', 'foreclaw', 'claw tip', 'rear claw',
    'foreclaw', 'clawed', 'head', 'rear limb', 'light headed', 'neck',
    'spine', 'rear claw tip', 'fur', 'blood', 'lung', 'nose', 'stomach',
];
const BIRD_PARTS = [
    'wing', 'eye', 'face', 'wing', 'wing tip', 'foot', 'wing', 'winged',
    'head', 'leg', 'light headed', 'neck', 'spine', 'toe', 'feathers',
    'blood', 'lung', 'bill', 'stomach',
];
const HORSE_PARTS = [
    'foreleg', 'eye', 'face', 'forehoof', 'hoof tip', 'rear hoof',
    'forehoof', 'hooved', 'head', 'rear leg', 'light headed', 'neck',
    'backbone', 'rear hoof tip', 'mane', 'blood', 'lung', 'nose', 'stomach',
];
const SPHERE_PARTS = [
    'appendage', 'optic nerve', 'body', 'tentacle', 'tentacle tip',
    'lower appendage', 'tentacle', 'tentacled', 'body', 'lower tentacle',
    'rotational', 'equator', 'body', 'lower tentacle tip', 'cilia',
    'life force', 'retina', 'olfactory nerve', 'interior',
];
const FUNGUS_PARTS = [
    'mycelium', 'visual area', 'front', 'hypha', 'hypha', 'root', 'strand',
    'stranded', 'cap area', 'rhizome', 'sporulated', 'stalk', 'root',
    'rhizome tip', 'spores', 'juices', 'gill', 'gill', 'interior',
];
const VORTEX_PARTS = [
    'region', 'eye', 'front', 'minor current', 'minor current',
    'lower current', 'swirl', 'swirled', 'central core', 'lower current',
    'addled', 'center', 'currents', 'edge', 'currents', 'life force',
    'center', 'leading edge', 'interior',
];
const SNAKE_PARTS = [
    'vestigial limb', 'eye', 'face', 'large scale', 'large scale tip',
    'rear region', 'scale gap', 'scale gapped', 'head', 'rear region',
    'light headed', 'neck', 'length', 'rear scale', 'scales', 'blood',
    'lung', 'forked tongue', 'stomach',
];
const WORM_PARTS = [
    'anterior segment', 'light sensitive cell', 'clitellum', 'setae', 'setae',
    'posterior segment', 'segment', 'segmented', 'anterior segment',
    'posterior', 'over stretched', 'clitellum', 'length', 'posterior setae',
    'setae', 'blood', 'skin', 'prostomium', 'stomach',
];
const SPIDER_PARTS = [
    'pedipalp', 'eye', 'face', 'pedipalp', 'tarsus', 'claw', 'pedipalp',
    'palped', 'cephalothorax', 'leg', 'spun out', 'cephalothorax', 'abdomen',
    'claw', 'hair', 'hemolymph', 'book lung', 'labrum', 'digestive tract',
];
const FISH_PARTS = [
    'fin', 'eye', 'premaxillary', 'pelvic axillary', 'pelvic fin', 'anal fin',
    'pectoral fin', 'finned', 'head', 'peduncle', 'played out', 'gills',
    'dorsal fin', 'caudal fin', 'scales', 'blood', 'gill', 'nostril',
    'stomach',
];
const NOT_CLAWS = new Set([
    'S_HUMAN', 'S_MUMMY', 'S_ZOMBIE', 'S_ANGEL', 'S_NYMPH', 'S_LEPRECHAUN',
    'S_QUANTMECH', 'S_VAMPIRE', 'S_ORC', 'S_GIANT',
]);

export function mbodypart(mon, part) {
    part = part | 0;
    if (part <= NO_PART) return 'mystery part';
    const mptr = mon?.data;
    if (!mptr) return HUMANOID_PARTS[part] || 'body part';
    const mlet = mptr.mlet;
    const mndx = mptr.mndx | 0;

    if (mlet === 'S_DOG' || mlet === 'S_FELINE' || mlet === 'S_RODENT'
        || mndx === PM_OWLBEAR) {
        if (part === HAND) return 'paw';
        if (part === HANDED) return 'pawed';
        if (part === FOOT) return 'rear paw';
        if (part === ARM || part === LEG) return HORSE_PARTS[part];
        // other parts: animal_parts[] below
    } else if (mlet === 'S_YETI') {
        return HUMANOID_PARTS[part];
    }
    if ((part === HAND || part === HANDED)
        && humanoid(mptr) && attacktype(mptr, AT_CLAW)
        && !NOT_CLAWS.has(mlet)
        && mndx !== PM_STONE_GOLEM && mndx !== PM_AMOROUS_DEMON) {
        return part === HAND ? 'claw' : 'clawed';
    }
    if ((mndx === PM_MUMAK || mndx === PM_MASTODON) && part === NOSE) {
        return 'trunk';
    }
    if (mndx === PM_SHARK && part === HAIR) return 'skin';
    if ((mndx === PM_JELLYFISH || mndx === PM_KRAKEN)
        && (part === ARM || part === FINGER || part === HAND || part === FOOT
            || part === TOE)) {
        return 'tentacle';
    }
    if (mndx === PM_FLOATING_EYE && part === EYE) return 'cornea';
    if (humanoid(mptr) && (part === ARM || part === FINGER || part === FINGERTIP
            || part === HAND || part === HANDED)) {
        return HUMANOID_PARTS[part];
    }
    if (mlet === 'S_COCKATRICE') {
        return part === HAIR ? SNAKE_PARTS[part] : BIRD_PARTS[part];
    }
    if (mndx === PM_RAVEN) return BIRD_PARTS[part];
    if (mlet === 'S_CENTAUR' || mlet === 'S_UNICORN'
        || mndx === PM_KI_RIN
        || (mndx === PM_ROTHE && part !== HAIR)) {
        return HORSE_PARTS[part];
    }
    if (mlet === 'S_LIGHT') {
        if (part === HANDED) return 'rayed';
        if (part === ARM || part === FINGER || part === FINGERTIP
            || part === HAND) {
            return 'ray';
        }
        return 'beam';
    }
    if (mndx === PM_STALKER && part === HEAD) return 'head';
    if (mlet === 'S_EEL' && mndx !== PM_JELLYFISH) return FISH_PARTS[part];
    if (mlet === 'S_WORM') return WORM_PARTS[part];
    if (mlet === 'S_SPIDER') return SPIDER_PARTS[part];
    if (slithy(mptr) || (mlet === 'S_DRAGON' && part === HAIR)) {
        return SNAKE_PARTS[part];
    }
    if (mlet === 'S_EYE') return SPHERE_PARTS[part];
    if (mlet === 'S_JELLY' || mlet === 'S_PUDDING' || mlet === 'S_BLOB'
        || mndx === PM_JELLYFISH) {
        return JELLY_PARTS[part];
    }
    if (mlet === 'S_VORTEX' || mlet === 'S_ELEMENTAL') return VORTEX_PARTS[part];
    if (mlet === 'S_FUNGUS') return FUNGUS_PARTS[part];
    if (humanoid(mptr)) return HUMANOID_PARTS[part];
    return ANIMAL_PARTS[part] || 'body part';
}

/** C ref: polyself.c body_part — mbodypart(&youmonst, part). */
export function body_part(part) {
    return mbodypart(game.youmonst || {}, part);
}
set_body_part(body_part);

/**
 * C ref: role.c character_race — races[] entry whose mnum matches.
 * @param {number} mndx
 */
function character_race(mndx) {
    for (const r of races) {
        if ((r.mnum | 0) === (mndx | 0)) return r;
    }
    return null;
}

/**
 * C ref: polyself.c uasmon_maxStr — race attrmax STR for current umonnum.
 */
function uasmon_maxStr() {
    let mndx = game.u?.umonnum | 0;
    const ptr = mons(mndx);
    if (is_orc(ptr)) {
        if (mndx !== PM_URUK_HAI && mndx !== PM_ORC_CAPTAIN) mndx = PM_ORC;
    } else if (is_elf(ptr)) {
        mndx = PM_ELF;
    } else if (is_dwarf(ptr)) {
        mndx = PM_DWARF;
    } else if (is_gnome(ptr)) {
        mndx = PM_GNOME;
    }
    const R = character_race(mndx);
    if (strongmonst(ptr)) {
        // C polyself.c:1100–1114 — live giant (giant, not undead) maxes at
        // STR19(19); other strongmonst fall back to STR18(100).
        const liveH = is_giant(ptr) && !is_undead(ptr);
        return R ? (R.attrmax[A_STR] | 0) : liveH ? STR19(19) : STR18(100);
    }
    return R ? (R.attrmax[A_STR] | 0) : 18;
}

/**
 * C ref: polyself.c set_uasmon PROPSET — toggle FROMFORM on uprops + H*.
 * Mirrors C `u.uprops[PropIndx].intrinsic |= / &= ~FROMFORM`.
 */
function propset_fromform(propIdx, hField, on) {
    const u = game.u || (game.u = {});
    if (!u.uprops) u.uprops = {};
    if (!u.uprops[propIdx]) {
        u.uprops[propIdx] = { intrinsic: 0, extrinsic: 0, blocked: 0 };
    }
    if (on) {
        u.uprops[propIdx].intrinsic = (u.uprops[propIdx].intrinsic | 0) | FROMFORM;
        u[hField] = (u[hField] | 0) | FROMFORM;
    } else {
        u.uprops[propIdx].intrinsic = (u.uprops[propIdx].intrinsic | 0) & ~FROMFORM;
        u[hField] = (u[hField] | 0) & ~FROMFORM;
    }
}

/**
 * C ref: polyself.c float_vs_flight — Levitation overrides Flying; trapped
 * floor blocks both; always sets disp.botl (polymon armor-More paints
 * new form via pline→flush_screen→bot before break_armor returns).
 */
export function float_vs_flight() {
    const u = game.u || (game.u = {});
    const stuckInFloor = !!(u.utrap && (u.utraptype | 0) !== TT_PIT);
    const hLev = (u.HLevitation | 0) || (u.ELevitation | 0);
    const hFly = (u.HFlying | 0) || (u.EFlying | 0);
    if (hLev || (hFly && stuckInFloor)) {
        u.BFlying = (u.BFlying | 0) | I_SPECIAL;
    } else {
        u.BFlying = (u.BFlying | 0) & ~I_SPECIAL;
    }
    if (hLev && stuckInFloor) {
        u.BLevitation = (u.BLevitation | 0) | I_SPECIAL;
    } else {
        u.BLevitation = (u.BLevitation | 0) & ~I_SPECIAL;
    }
    steed_vs_stealth();
    if (!game.flags) game.flags = {};
    game.flags.botl = true;
    if (game.disp) game.disp.botl = true;
}

/**
 * C ref: mondata.c resists_drli for &gy.youmonst — undead/demon/were form,
 * human-form ulycn arm (mondata.c:206-207), Death, vampshifter. set_uasmon
 * zeroes uwep before calling, so the wielded-weapon path is suppressed;
 * the defended(mon, AD_DRLI) disjunct has no JS export (named omission).
 */
function resists_drli_you(mdat) {
    const u = game.u || {};
    if (!mdat) return false;
    if (is_undead(mdat) || is_demon(mdat) || is_were(mdat)) return true;
    if (ismnum((u.ulycn ?? NON_PM) | 0)) return true;
    if ((u.umonnum | 0) === PM_DEATH) return true;
    if (is_vampshifter(game.youmonst || {})) return true;
    return false;
}

/**
 * C ref: polyself.c set_uasmon — point youmonst.data at mons[umonnum]
 * via set_mon_data (prorates u.umovement when new form is slower).
 * Named omissions: defended(AD_DRLI) disjunct of resists_drli (no JS
 * defended export); ANTIMAGIC;
 * SICK_RES fungus/ghoul; STUNNED/HALLUC_RES/SEE_INVIS/TELEPAT/
 * INVIS/LEVITATION/SWIMMING/PASSES_WALLS/
 * REFLECTING/BLND_RES; vamp cham; polysense;
 * light-source bookkeeping.
 */
export function set_uasmon() {
    const u = game.u || (game.u = {});
    const mndx = u.umonnum | 0;
    const mdat = mons(mndx);
    if (!game.youmonst) game.youmonst = {};
    // C: set_mon_data(&gy.youmonst, mdat) — umovement prorate on slowdown
    set_mon_data(game.youmonst, mdat);
    game.youmonst.mnum = mndx;
    game.youmonst.m_id = 1;
    // Protection_from_shape_changers / vampire cham deferred
    if (game.youmonst.cham == null) game.youmonst.cham = NON_PM;
    u.mcham = game.youmonst.cham;

    // C: resist_from_form(MRtyp) — mdat->mresists & MRtyp
    const mres = mdat?.mresists | 0;
    propset_fromform(FIRE_RES, 'HFire_resistance', !!(mres & MR_FIRE));
    propset_fromform(COLD_RES, 'HCold_resistance', !!(mres & MR_COLD));
    propset_fromform(SLEEP_RES, 'HSleep_resistance', !!(mres & MR_SLEEP));
    propset_fromform(DISINT_RES, 'HDisint_resistance', !!(mres & MR_DISINT));
    propset_fromform(SHOCK_RES, 'HShock_resistance', !!(mres & MR_ELEC));
    propset_fromform(POISON_RES, 'HPoison_resistance', !!(mres & MR_POISON));
    propset_fromform(ACID_RES, 'HAcid_resistance', !!(mres & MR_ACID));
    propset_fromform(STONE_RES, 'HStone_resistance', !!(mres & MR_STONE));
    // C: PROPSET(DRAIN_RES, resists_drli(&gy.youmonst)) with uwep suppressed
    propset_fromform(DRAIN_RES, 'HDrain_resistance', resists_drli_you(mdat));
    // C polyself.c set_uasmon — PROPSET(INFRAVISION, infravision(Upolyd ?
    // mdat : &mons[gu.urace.mnum])): form grants while poly'd, else race.
    // The enlightenment/from_what "from your creature form" suffix reads it.
    propset_fromform(INFRAVISION, 'HInfravision',
        infravision(Upolyd(u) ? mdat : mons(game.urace?.mnum)));
    // C polyself.c:94-95 — PROPSET(TELEPORT, can_teleport(mdat)) and
    // PROPSET(TELEPORT_CONTROL, control_teleport(mdat)): a tengu form
    // confers FROMFORM teleport, gating moveloop rn2(85) (allmain.c:308).
    propset_fromform(TELEPORT, 'HTeleportation', can_teleport(mdat));
    propset_fromform(TELEPORT_CONTROL, 'HTeleport_control', control_teleport(mdat));

    // C: PROPSET(FLYING, is_flyer(mdat) && !is_floater(mdat)) — D-0724
    // floating eye is flyer+floater; suppress Flying under Levitation.
    propset_fromform(FLYING, 'HFlying', is_flyer(mdat) && !is_floater(mdat));
    // C: PROPSET(BLINDED, !haseyes(mdat)) — eyeless forms (molds) Blind
    // so Monnam → "It"; long "The cockatrice …" lines were forcing
    // mid-turn --More-- that ate #version (D-0928 #1109).
    propset_fromform(BLINDED, 'HBlinded', !haseyes(mdat));
    // C polyself.c:105 — PROPSET(REGENERATION, regenerates(mdat)): an
    // M1_REGEN form (troll, vampire, …) heals +1/turn via regen_hp; without
    // the FROMFORM bit a poly'd hero never regenerates (D-2148).
    propset_fromform(REGENERATION, 'HRegeneration', regenerates(mdat));

    // C: if (!program_state.restoring) float_vs_flight();
    if (!game.program_state?.restoring) float_vs_flight();
}

function copyAttrBundle(src) {
    return { a: [...(src?.a || [0, 0, 0, 0, 0, 0])] };
}

/** C hack.c rounddiv — trunc with round-half-up on abs values. */
function rounddiv(x, y) {
    if (!y) return 0;
    let divsgn = 1;
    let yy = y;
    let xx = x;
    if (yy < 0) { divsgn = -divsgn; yy = -yy; }
    if (xx < 0) { divsgn = -divsgn; xx = -xx; }
    let r = Math.trunc(xx / yy);
    const m = xx % yy;
    if (2 * m >= yy) r++;
    return divsgn * r;
}

/**
 * C ref: polyself.c poly_gender — 0/1 ≡ flags.female, 2=none.
 * Exported for do_wear.c Amulet_on CHANGE arm. */
export function poly_gender() {
    const ptr = game.youmonst?.data;
    if (is_neuter(ptr) || !humanoid(ptr)) return 2;
    return game.flags?.female ? 1 : 0;
}

/**
 * C ref: polyself.c change_sex — flip flags.female / mfemale.
 * Named omissions: pl_character rename; amorous-demon set_uasmon.
 * Exported for eat.c eataccessory AMULET_OF_CHANGE.
 */
export function change_sex() {
    const u = game.u || (game.u = {});
    const flags = game.flags || (game.flags = {});
    const ptr = game.youmonst?.data;
    if (!Upolyd(u)
        || (!is_male(ptr) && !is_female(ptr) && !is_neuter(ptr))) {
        flags.female = !flags.female;
    }
    if (Upolyd(u)) u.mfemale = !u.mfemale;
    if (!Upolyd(u)) u.umonnum = u.umonster | 0;
    // PM_AMOROUS_DEMON arm deferred
}

/**
 * C ref: polyself.c uunstick :1941–1951 — release u.ustuck then pline.
 * set_ustuck runs before pline() per C (D-2131; was a uhitm.js local clone).
 */
export async function uunstick() {
    const mtmp = (game.u || {}).ustuck;
    if (!mtmp) {
        await impossible('uunstick: no ustuck?');
        return;
    }
    // C: set_ustuck(0) before pline()
    set_ustuck(null);
    await pline(`${Monnam(mtmp)} is no longer in your clutches.`);
}

/**
 * C ref: polyself.c ugenocided `:2265–2270` — True iff hero's role or race
 * has been genocided (mvitals G_GENOD on either mnum; game.mvitals mirrors
 * svm.mvitals per allmain.js:726).
 * @returns {boolean}
 */
export function ugenocided() {
    const mv = game.mvitals || [];
    return !!(((mv[(game.urole?.mnum | 0)]?.mvflags | 0) & G_GENOD)
        || ((mv[(game.urace?.mnum | 0)]?.mvflags | 0) & G_GENOD));
}

/**
 * C ref: polyself.c polyman `:199–268` (C staticfn: same-file callers
 * only — module-local here). Revert to original race form after newman
 * (`:443`) / rehumanize (`:1395`): restore macurr/mamax; clear
 * mh/mtimedone; set_uasmon; sticking uunstick (D-2131); find_ac; mimic
 * stop; newsym; urgent pline; self-genocide done; See_invisible toggle;
 * twoweapon drop; pit-timer reset; was_blind→make_blinded;
 * check_strangling(TRUE); pool/lava spoteffects; see_monsters.
 * skinback(FALSE) `:217` (D-2262).
 */
async function polyman(fmt, arg) {
    const u = game.u || (game.u = {});
    const flags = game.flags || (game.flags = {});
    // C :200–201 — sticking reads the CURRENT (poly) form, before set_uasmon
    const sticking = !!(sticks(game.youmonst?.data) && u.ustuck && !u.uswallow);
    // C :202 — U_AP_TYPE is youmonst.m_ap_type & mask (const.js M_AP_TYPE)
    const wasMimicking = M_AP_TYPE(game.youmonst) !== M_AP_NOTHING;
    // C :203–204 — was_blind = !!Blind, had_see_invis = !!See_invisible,
    // both before set_uasmon clears the FROMFORM bits
    const wasBlind = !!(((u.HBlinded | 0) || (u.EBlinded | 0))
        && !(u.BBlinded | 0)) || !!u.uroleplay?.blind;
    // C youprop.h See_invisible ≡ H || E (+ sticky flat, per-module idiom)
    const hadSeeInvis = !!((u.HSee_invisible | 0) || (u.ESee_invisible | 0)
        || u.See_invisible);
    // C :206–211 — restore old attribs when reverting from poly'd
    if (Upolyd(u)) {
        u.acurr = copyAttrBundle(u.macurr);
        u.amax = copyAttrBundle(u.mamax);
        u.umonnum = u.umonster | 0;
        flags.female = !!u.mfemale;
    }
    // C :212
    set_uasmon();
    // C :214–217
    u.mh = 0;
    u.mhmax = 0;
    u.mtimedone = 0;
    await skinback(false);
    u.uundetected = 0;
    // C :220–221 — release the hold before the return-to-form pline
    if (sticking) await uunstick();
    // C :222
    find_ac();
    // C :223–227 — stop mimicking (multi < 0 ends the occupation first)
    if (wasMimicking) {
        if ((game.multi | 0) < 0) await unmul('');
        if (game.youmonst) {
            game.youmonst.m_ap_type = M_AP_NOTHING;
            game.youmonst.mappearance = 0;
        }
    }
    // C :229
    newsym(u.ux, u.uy);
    // C :231 — fmt has one %s; urgent overrides WIN_STOP (display.js)
    await urgent_pline(fmt, arg);
    // C :234–247 — genocided self while poly'd (killer survives via
    // the delayed POLYMORPH node; done returns only if lifesaved)
    if (ugenocided()) {
        /* intervening activity might have clobbered genocide info */
        const kptr = find_delayed_killer(POLYMORPH);
        if (!game.killer) game.killer = { name: '', format: 0 };
        if (kptr && kptr.name) {
            game.killer.format = kptr.format;
            game.killer.name = kptr.name;
        } else {
            game.killer.format = KILLED_BY;
            game.killer.name = 'self-genocide';
        }
        dealloc_killer(kptr);
        await done(GENOCIDED);
    }
    // C :249–250 — See_invisible just toggled
    const seeInvis = !!((u.HSee_invisible | 0) || (u.ESee_invisible | 0)
        || u.See_invisible);
    if (seeInvis !== hadSeeInvis) set_mimic_blocking();
    // C :252–253 — new form cannot two-weapon
    if (u.twoweap && !could_twoweap(game.youmonst?.data)) await untwoweapon();
    // C :255–257 — time to escape resets
    if ((u.utrap | 0) && ((u.utraptype | 0) === TT_PIT)) {
        set_utrap(rn1(6, 2), TT_PIT);
    }
    // C :258–260 — reverting from eyeless (timeout.js:992 same shape)
    const nowBlind = !!(((u.HBlinded | 0) || (u.EBlinded | 0))
        && !(u.BBlinded | 0)) || !!u.uroleplay?.blind;
    if (wasBlind && !nowBlind) {
        u.HBlinded = ((u.HBlinded | 0) & ~TIMEOUT) | (1 & TIMEOUT);
        if (!u.uprops) u.uprops = {};
        if (!u.uprops[BLINDED]) {
            u.uprops[BLINDED] = { intrinsic: 0, extrinsic: 0, blocked: 0 };
        }
        u.uprops[BLINDED].intrinsic =
            ((u.uprops[BLINDED].intrinsic | 0) & ~TIMEOUT) | (1 & TIMEOUT);
        await make_blinded(0, true);
    }
    // C :261 — maybe resume strangling in the vulnerable new form
    await check_strangling(true);
    // C :263–264 — dbridge.c is_pool_or_lava ≡ is_pool || is_lava (trap.js:693)
    const levitation = !!(((u.HLevitation | 0) || (u.ELevitation | 0))
        && !((u.BLevitation | 0)));
    if (!levitation && !u.ustuck && (is_pool(u.ux, u.uy) || is_lava(u.ux, u.uy))) {
        await spoteffects(true);
    }
    // C :266
    see_monsters();
}

/**
 * C ref: polyself.c newman — fail-to-poly / force-human: level±2, sex
 * rn2(10), rndexp, redist_attr, HP/EN rebuild, hunger rn1(500,500),
 * then polyman.
 * Named omissions: Sick/Stoned clear; Slimed residual;
 * livelog; retouch_equipment/selftouch; Polymorph_control uhp clamp.
 * (dead-arm lifesave via done(DIED) is live.)
 */
async function newman() {
    const u = game.u || (game.u = {});
    const flags = game.flags || (game.flags = {});
    const oldlvl = u.ulevel | 0;
    let newlvl = oldlvl + rn1(5, -2); // rn2(5)+(-2)
    if (newlvl > 127 || newlvl < 1) {
        // C polyself.c:426-439 dead arm — old level intact (u.ulevel is
        // still oldlvl here); urgent_pline blocks (--More--), then
        // lifesave via done(DIED); lifesaved resumes with newuhs.
        await urgent_pline("Your new form doesn't seem healthy enough to survive.");
        if (!game.killer) game.killer = { name: '', format: 0 };
        game.killer.format = KILLED_BY_AN;
        game.killer.name = 'unsuccessful polymorph';
        await done(DIED);
        /* must have been life-saved to get here */
        await newuhs(false);
        await encumber_msg();
        return; /* lifesaved */
    }
    if (newlvl > MAXULEV) newlvl = MAXULEV;
    if (newlvl < oldlvl) u.ulevelmax = (u.ulevelmax | 0) - (oldlvl - newlvl);
    if ((u.ulevelmax | 0) < newlvl) u.ulevelmax = newlvl;
    u.ulevel = newlvl;

    // oldgend unused until livelog; still match C call order
    void poly_gender();
    if (game.sex_change_ok && !rn2(10)) change_sex();

    await adjabil(oldlvl, u.ulevel | 0);
    u.uexp = rndexp(false);
    redist_attr();

    // New hit points (C newman hpmax rebuild)
    if (!u.uhpinc) u.uhpinc = [];
    let hpmax = u.uhpmax | 0;
    for (let i = 0; i < oldlvl; i++) hpmax -= (u.uhpinc[i] | 0);
    hpmax = rounddiv(hpmax * rn1(4, 8), 10);
    for (let i = 0; (u.ulevel = i) < newlvl; i++) hpmax += newhp();
    if (hpmax < (u.ulevel | 0)) hpmax = u.ulevel | 0;
    const oldHpmax = u.uhpmax | 0;
    u.uhp = rounddiv((u.uhp | 0) * hpmax, oldHpmax || 1);
    setuhpmax(hpmax, true);

    // Spell power
    if (!u.ueninc) u.ueninc = [];
    let enmax = u.uenmax | 0;
    for (let i = 0; i < oldlvl; i++) enmax -= (u.ueninc[i] | 0);
    enmax = rounddiv(enmax * rn1(4, 8), 10);
    for (let i = 0; (u.ulevel = i) < newlvl; i++) enmax += newpw();
    if (enmax < (u.ulevel | 0)) enmax = u.ulevel | 0;
    const oldEnmax = (u.uenmax | 0) < 1 ? 1 : (u.uenmax | 0);
    u.uen = rounddiv((u.uen | 0) * enmax, oldEnmax);
    u.uenmax = enmax;

    u.uhunger = rn1(500, 500);
    // Sick/Stoned clear deferred (no-op when unset)

    if ((u.uhp | 0) <= 0) {
        // Poly_control clamp / done(DIED) deferred — keep 1 hp
        u.uhp = 1;
    }

    const female = Upolyd(u) ? !!u.mfemale : !!flags.female;
    const race = game.urace || {};
    // C: ((Upolyd ? u.mfemale : flags.female) && urace.individual.f)
    //    ? individual.f : individual.m ? individual.m : urace.noun
    const newform = (female && race.individual?.f)
        ? race.individual.f
        : (race.individual?.m)
            ? race.individual.m
            : (race.noun || race.adj || 'human');
    await polyman('You feel like a new %s!', newform);

    // Slimed residual / livelog deferred
    flags.botl = true;
    see_monsters();
    await encumber_msg();
    // retouch_equipment(2) / selftouch deferred
}

/**
 * C ref: polyself.c rehumanize `:1367–1418` — poly timeout / HP death
 * while poly'd, in C order: was_flying entry; Unchanging stuck arm
 * (mh<1 done(DIED) + early return, else amulet-of-unchanging
 * Your/observe/makeknown); emits_light del_light_source; polyman
 * return-to-race; uhp<1 done(DIED); nomul; botl/vision; encumber_msg;
 * update_inventory; flying-steed You; gloveless selftouch.
 * Named omissions: retouch_equipment(2) (`artifact.c:2639`, own coverage row).
 */
export async function rehumanize() {
    const u = game.u || {};
    const wasFlying = Flying();
    // C: Unchanging && mh<1 → done(DIED); decline keeps creature form
    if (Unchanging(u)) {
        if ((u.mh | 0) < 1) {
            if (!game.killer) game.killer = { name: '', format: 0 };
            game.killer.format = NO_KILLER_PREFIX;
            game.killer.name = 'killed while stuck in creature form';
            await done(DIED);
            return; // don't rehumanize after all
        } else if (u.uamul && (u.uamul.otyp | 0) === AMULET_OF_UNCHANGING) {
            await pline(`Your ${simpleonames(u.uamul)} ${otense(u.uamul, 'fail')}!`);
            observe_object(u.uamul);
            makeknown(AMULET_OF_UNCHANGING);
        }
    }

    if (emits_light(game.youmonst?.data))
        del_light_source(LS_MONSTER, monst_to_any(game.youmonst));
    const race = game.urace || {};
    const adj = race.adj || race.noun || 'human';
    await polyman('You return to %s form!', adj);

    if ((u.uhp | 0) < 1) {
        // C: some bit of code reduced u.uhp instead of u.mh while poly'd
        await pline('Your old form was not healthy enough to survive.');
        if (!game.killer) game.killer = { name: '', format: 0 };
        game.killer.name = `reverting to unhealthy ${adj} form`;
        game.killer.format = KILLED_BY;
        await done(DIED);
    }
    nomul(0);

    if (game.flags) game.flags.botl = true;
    game.vision_full_recalc = 1;
    await encumber_msg();
    update_inventory();
    if (wasFlying && !Flying() && u.usteed)
        // C polyself.c:1413 You("and %s return gently to the %s.",
        // mon_nam(u.usteed), surface(u.ux, u.uy)).
        await You('and %s return gently to the %s.', mon_nam(u.usteed), surface(u.ux, u.uy));
    // retouch_equipment(2) named above
    if (!u.uarmg) await selftouch(no_longer_petrify_resistant);
}

/**
 * C ref: mondata.h cantwield — nohands || verysmall.
 * @param {object|null|undefined} ptr
 */
function cantwield(ptr) {
    return nohands(ptr) || verysmall(ptr);
}

/**
 * C ref: polyself.c drop_weapon(alone) `:1305–1362` — cantwield forms must drop uwep.
 * `:1313` !alone||cantwield gate; `:1316–1317` canletgo pair; `:1318–1332`
 * alone message via is_sword/weapon_descr + twoweap whichtoo compare +
 * makeplural + the_your corpse gate; `:1334–1353` uswapwep-then-uwep
 * gone/dropx with in_use defer + update_inventory; `:1354–1356`
 * could_twoweap untwoweapon arm. weapon_descr P_NONE specials / ammo
 * arms stay named in invent.js (live callee, C-matched on skill names).
 * @param {number} alone
 */
async function drop_weapon(alone) {
    const u = game.u || {};
    if (!u.uwep) return;
    // C `:1313` — the !alone check is superfluous per C comment but kept.
    if (!alone || cantwield(game.youmonst?.data)) {
        const candropwep = await canletgo(u.uwep, '');
        // C `:1317` — !twoweap short-circuits; twoweap implies uswapwep set.
        const candropswapwep = !u.twoweap || (await canletgo(u.uswapwep, ''));
        if (alone) {
            const what = (candropwep && candropswapwep) ? 'drop' : 'release';
            // C `:1320–1321` — is_sword maps to "sword", else weapon_descr.
            let which = is_sword(u.uwep) ? 'sword' : weapon_descr(u.uwep);
            if (u.twoweap && u.uswapwep) {
                const whichtoo = is_sword(u.uswapwep) ? 'sword' : weapon_descr(u.uswapwep);
                // C `:1325–1326` — strcmp(which, whichtoo).
                if (which !== whichtoo) which = 'weapon';
            }
            // C `:1328–1329` — quan != 1 (long) or twoweap.
            if ((u.uwep.quan || 1) !== 1 || u.twoweap) which = makeplural(which);
            // C `:1331` — the_your[!!strncmp(which, "corpse", 6)].
            const your = which.startsWith('corpse') ? 'the' : 'your';
            await pline(`You find you must ${what} ${your} ${which}!`);
        }
        // C `:1334–1342` — swap weapon first; in_use defers drop+inventory.
        let updateinv = true;
        if (u.twoweap) {
            const otmp = u.uswapwep;
            uswapwepgone();
            if (otmp?.in_use) updateinv = false;
            else if (otmp && candropswapwep) await dropx(otmp);
        }
        // C `:1343–1349` — then the main wielded weapon.
        {
            const otmp = u.uwep;
            await uwepgone();
            if (otmp?.in_use) updateinv = false;
            else if (otmp && candropwep) await dropx(otmp);
        }
        // C `:1351–1353` — dropp-vs-dropx note lives in dropx (do.js).
        if (updateinv) update_inventory();
    } else if (!could_twoweap(game.youmonst?.data)) {
        // C `:1354–1356` — new form can wield but not two-weapon.
        await untwoweapon();
    }
}

/**
 * C ref: polyself.c break_armor `:1157–1302` — breakarm destroy order
 * (uarm useup, cloak 3-way, shirt useup), sliparm shed order (racial
 * gate, whirly cloak/shirt), horns helm pierce/drop, nohands gloves /
 * shield / helm, boots, ublindf eyewear. dropx is the dropp equivalent;
 * the one raw setworn keeps {skip_find_ac} (C worn.c has no find_ac;
 * polymon's own find_ac pair runs in C order: after drop_weapon (:890)
 * and before encumber_msg (:967), arming botl for the post-strip paints).
 * Named omissions: donning/cancel_don (do_wear locals, unwired).
 */
async function break_armor() {
    const u = game.u || {};
    const uptr = game.youmonst?.data;
    if (!uptr) return;
    const noAc = { skip_find_ac: true };

    if (breakarm(uptr)) {
        // C :1162–1176 — donning cancel omitted (do_wear local unwired);
        // lamplit DSM end_burn, message, exercise, Armor_gone, useup
        // (armor is DESTROYED, not dropped).
        const otmp = u.uarm;
        if (otmp) {
            if (otmp.lamplit) end_burn(otmp, false);
            await pline('You break out of your armor!');
            exercise(A_STR, false);
            await Armor_gone();
            useup(otmp);
        }
        // C :1177–1195 — wrapping tears (useup) / smock knot (drop) /
        // clasp (drop), each through cloak_simple_name + Cloak_off.
        const cloak = u.uarmc;
        if (cloak
            && ((cloak.otyp | 0) !== MUMMY_WRAPPING
                || !WrappingAllowed(uptr))) {
            if ((cloak.otyp | 0) === MUMMY_WRAPPING) {
                await pline(`Your ${cloak_simple_name(cloak)} tears apart!`);
                await Cloak_off();
                useup(cloak);
            } else if ((cloak.otyp | 0) === ALCHEMY_SMOCK) {
                await pline(`The knot on your ${cloak_simple_name(cloak)} is pulled apart!`);
                await Cloak_off();
                await dropx(cloak);
            } else {
                await pline(`The clasp on your ${cloak_simple_name(cloak)} breaks open!`);
                await Cloak_off();
                await dropx(cloak);
            }
        }
        // C :1196–1199 — shirt is destroyed with no _off call (useupall
        // setnotworns, matching C useup on the worn shirt).
        if (u.uarmu) {
            await pline('Your shirt rips to shreds!');
            useup(u.uarmu);
        }
    } else if (sliparm(uptr)) {
        // C :1201–1211 — racial_exception keeps hobbit elven suits on.
        const otmp = u.uarm;
        if (otmp && racial_exception(game.youmonst, otmp) < 1) {
            await pline('Your armor falls around you!');
            await Armor_gone();
            // C dropp→dropx→dropz→encumber_msg mid-break_armor (before gloves)
            await dropx(otmp);
        }
        // C :1212–1220 — same wrapping gate as the breakarm cloak arm.
        const cloak = u.uarmc;
        if (cloak
            && ((cloak.otyp | 0) !== MUMMY_WRAPPING
                || !WrappingAllowed(uptr))) {
            if (is_whirly(uptr)) {
                await pline(`Your ${cloak_simple_name(cloak)} falls, unsupported!`);
            } else {
                await pline(`You shrink out of your ${cloak_simple_name(cloak)}!`);
            }
            await Cloak_off();
            await dropx(cloak);
        }
        if (u.uarmu) {
            const shirt = u.uarmu;
            if (is_whirly(uptr)) {
                await pline('You seep right through your shirt!');
            } else {
                await pline('You become much too small for your shirt!');
            }
            setworn(null, W_ARMU, noAc);
            await dropx(shirt);
        }
    }
    // C :1230–1251 — horned forms pierce flimsy helms, else the helm
    // falls (donning cancel omitted like the other arms in this function).
    if (has_horns(uptr)) {
        const hornhelm = u.uarmh;
        if (hornhelm) {
            if (is_flimsy(hornhelm)) {
                const hornbuf = `horn${num_horns(uptr) === 1 ? '' : 's'}`;
                await pline(`Your ${hornbuf} ${vtense(hornbuf, 'pierce')} through ${yname(hornhelm)}.`);
            } else {
                await pline(`Your ${helm_simple_name(hornhelm)} falls to the ${surface(u.ux, u.uy)}!`);
                await Helmet_off();
                await dropx(hornhelm);
            }
        }
    }

    // C :1253–1276 — nohands || verysmall → gloves, shield, helm
    if (nohands(uptr) || verysmall(uptr)) {
        const gloves = u.uarmg;
        if (gloves) {
            // C: Drop weapon along with gloves
            await pline(`You drop your gloves${u.uwep ? ' and weapon' : ''}!`);
            await drop_weapon(0);
            await Gloves_off();
            await dropx(gloves);
        }
        const shield = u.uarms;
        if (shield) {
            await pline('You can no longer hold your shield!');
            Shield_off();
            await dropx(shield);
        }
        const helm = u.uarmh;
        if (helm) {
            await pline(`Your ${helm_simple_name(helm)} falls to the ${surface(u.ux, u.uy)}!`);
            await Helmet_off();
            await dropx(helm);
        }
    }

    // C: nohands || verysmall || slithy || centaur → boots
    if (nohands(uptr) || verysmall(uptr)
        || slithy(uptr) || uptr.mlet === 'S_CENTAUR') {
        const boots = u.uarmf;
        if (boots) {
            if (is_whirly(uptr)) {
                await pline('Your boots fall away!');
            } else {
                const how = verysmall(uptr) ? 'slide' : 'are pushed';
                await pline(`Your boots ${how} off your feet!`);
            }
            await Boots_off();
            await dropx(boots);
        }
    }
    // C :1294–1307 — eyewear cannot stay worn without a head to wear
    // it on (amulet stays worn; rings stay worn even with no hands).
    // Blindf_off Null skips the usual off message (do_wear.c:1498).
    const blindf = u.ublindf;
    if (blindf && !has_head(uptr)) {
        let eyewear = simpleonames(blindf);
        if (eyewear.startsWith('pair of ')) eyewear = eyewear.slice(8);
        await pline(`Your ${eyewear} ${vtense(eyewear, 'fall')} off!`);
        await Blindf_off(null);
        await dropx(blindf);
    }
    // C :1308 — rings stay worn even when no hands
}

/**
 * C ref: polyself.c check_strangling `:167–194` (C staticfn: same-file
 * callers only — module-local here). polymon() calls it twice: FALSE to
 * maybe stop strangling in a form that can't be strangled, TRUE to maybe
 * resume when the amulet constricts again.
 * The strangleable test is the mon==&youmonst hero arm of
 * mondata.c can_be_strangled `:590–619` (headless immune; a mindless new
 * form that needs no breath is immune); the monster arm never applies
 * here, so it is not copied.
 * @param {boolean} on
 * @returns {Promise<void>}
 */
async function check_strangling(on) {
    const u = game.u || (game.u = {});
    const youdata = game.youmonst?.data;
    // Hero arm of can_be_strangled (mondata.c:603-616): has_head fails
    // outright; mindless forms are safe only while Breathless.
    const nobrainer = mindless(youdata);
    const nonbreathing = !!((u.Breathless | 0) || (u.HBreathless | 0)
        || (u.EBreathless | 0) || (u.HMagical_breathing | 0)
        || (u.EMagical_breathing | 0) || breathless(youdata));
    const strangleable = !!has_head(youdata) && (!nobrainer || !nonbreathing);
    if (on) {
        /* on -- maybe resume strangling */
        const wasStrangled = ((u.Strangled | 0) !== 0)
            || (((u.uprops?.[STRANGLED]?.intrinsic) | 0) !== 0);
        const uamul = u.uamul;
        /* when Strangled is already set, polymorphing from one
           vulnerable form into another causes the counter to be reset */
        if (uamul && ((uamul.otyp | 0) === AMULET_OF_STRANGULATION)
            && strangleable) {
            u.Strangled = 6;
            if (!u.uprops) u.uprops = {};
            if (!u.uprops[STRANGLED]) u.uprops[STRANGLED] = { intrinsic: 0, extrinsic: 0, blocked: 0 };
            u.uprops[STRANGLED].intrinsic = 6;
            if (game.disp) game.disp.botl = true;
            await pline(`Your ${simpleonames(uamul)} ${wasStrangled ? 'still constricts' : 'begins constricting'} your ${body_part(NECK)}!`);
            makeknown(AMULET_OF_STRANGULATION);
        }
    /* off -- maybe block strangling */
    } else {
        const strangled = ((u.Strangled | 0) !== 0)
            || (((u.uprops?.[STRANGLED]?.intrinsic) | 0) !== 0);
        if (strangled && !strangleable) {
            u.Strangled = 0;
            if (u.uprops?.[STRANGLED]) u.uprops[STRANGLED].intrinsic = 0;
            if (game.disp) game.disp.botl = true;
            await pline('You are no longer being strangled.');
        }
    }
}

/**
 * C ref: polyself.c polymon — become mntmp.
 * Envelope (whole C body :735–1071 in C order): geno abort; conduct +
 * first-poly livelog; CON/WIS exercise; human-stat save/restore; unmul
 * mimic stop; mimic clear; sex_change_ok rn2(10); turn-into pline;
 * Stoned golem redirect; rn1(500,500) mtimedone; set_uasmon; STR clamp;
 * Stone/Sick/Slime cures; check_strangling(FALSE); glib;
 * mhmax (dragon / golem / d(mlvl,8), home-elemental x3); ulevel clamp;
 * uskin/break_armor/drop_weapon/find_ac; hideunder; pit reset; blind;
 * newsym; egg learn; swallow expel / ustuck release / uunstick; steed
 * petrify/dismount; find_ac#2; pool spoteffects; Passes_walls/lava/
 * amorphous/web arms; check_strangling(TRUE); botl; see_monsters;
 * encumber_msg; selftouch; verbose ability tips.
 * Named omissions: retouch_equipment(2) (artifact.c:2639, own row);
 * light-source bookkeeping (set_uasmon map note); break_armor horns /
 * flimsy-helm pierce / ublindf (break_armor map note).
 * @param {number} mntmp
 * @returns {Promise<number>} 1 on success, 0 on geno abort
 */
export async function polymon(mntmp) {
    const u = game.u || (game.u = {});
    const flags = game.flags || (game.flags = {});
    let dochange = false;
    // C :735-739 entry locals: sticking (FROMFORM grabber holding ustuck),
    // was_blind, was_hiding_under — all read before set_uasmon swaps form.
    const fromdat = game.youmonst?.data;
    const sticking = !!(sticks(fromdat) && u.ustuck && !u.uswallow);
    // C polyself.c:739 — was_blind = !!Blind at entry, before set_uasmon
    // swaps the FROMFORM eyeless bit (same shape as the polyman arm).
    const wasBlind = !!(((u.HBlinded | 0) || (u.EBlinded | 0))
        && !(u.BBlinded | 0)) || !!u.uroleplay?.blind;
    const wasHidingUnder = !!(u.uundetected && hides_under(fromdat));
    let wasExpelled = false;
    let ustuckNam = '';

    const mv = game.mvitals?.[mntmp];
    if (mv && ((mv.mvflags | 0) & G_GENOD)) {
        const nm = pmname(mntmp, flags.female ? FEMALE : MALE);
        await pline(`You feel rather ${nm}-ish.`);
        exercise(A_WIS, true);
        return 0;
    }

    // C :745-749 — KMH conduct: first-ever polyself is livelogged.
    if (!u.uconduct) u.uconduct = {};
    if (!(u.uconduct.polyselfs | 0)) {
        livelog_printf(LL_CONDUCT,
            'changed form for the first time, becoming %s',
            an(pmname(mntmp, flags.female ? FEMALE : MALE)));
    }
    u.uconduct.polyselfs = (u.uconduct.polyselfs | 0) + 1;

    exercise(A_CON, false);
    exercise(A_WIS, true);

    if (!Upolyd(u)) {
        u.macurr = copyAttrBundle(u.acurr);
        u.mamax = copyAttrBundle(u.amax);
        u.mfemale = !!flags.female;
    } else {
        u.acurr = copyAttrBundle(u.macurr);
        u.amax = copyAttrBundle(u.mamax);
        flags.female = !!u.mfemale;
    }

    // C :775-781 — stuck mimicking gold: stop at once; becoming a
    // non-mimic clears any mimicry (as in polyman()).
    if ((game.multi | 0) < 0 && ((game.youmonst?.m_ap_type | 0) === M_AP_OBJECT)
        && fromdat?.mlet !== 'S_MIMIC') {
        await unmul('');
    }
    let mdat = mons(mntmp);
    if (mdat && mdat.mlet !== 'S_MIMIC') {
        if (game.youmonst) {
            game.youmonst.m_ap_type = 0; // M_AP_NOTHING
            game.youmonst.mappearance = 0;
        }
    }

    if (is_male(mdat)) {
        if (flags.female) dochange = true;
    } else if (is_female(mdat)) {
        if (!flags.female) dochange = true;
    } else if (!is_neuter(mdat) && mntmp !== (u.ulycn | 0)) {
        if (game.sex_change_ok && !rn2(10)) dochange = true;
    }

    // C :797 — ustuck's name is saved before the change (seeing it may
    // change with the new form's eyes).
    ustuckNam = u.ustuck ? Some_Monnam(u.ustuck) : '';
    let buf = (u.umonnum | 0) !== mntmp ? '' : 'new ';
    if (dochange) {
        flags.female = !flags.female;
        if (!(is_male(mdat) || is_female(mdat))) {
            buf += flags.female ? 'female ' : 'male ';
        }
    }
    buf += pmname(mntmp, flags.female ? FEMALE : MALE);
    const verb = (u.umonnum | 0) !== mntmp ? 'turn into' : 'feel like';
    await pline(`You ${verb} ${an(buf)}!`);

    // C :810-814 — stoned into a poly_when_stoned form: become a stone
    // golem instead (poly_when_stoned already checked golem genocide).
    if ((u.Stoned | 0) && poly_when_stoned(mdat)) {
        mntmp = PM_STONE_GOLEM;
        await make_stoned(0, 'You turn to stone!', 0, null);
        mdat = mons(mntmp);
    }

    u.mtimedone = rn1(500, 500);
    u.umonnum = mntmp;
    set_uasmon();

    const newMaxStr = uasmon_maxStr();
    if (strongmonst(mdat)) {
        u.acurr.a[A_STR] = newMaxStr;
        u.amax.a[A_STR] = newMaxStr;
    } else {
        u.amax.a[A_STR] = newMaxStr;
        if ((u.acurr.a[A_STR] | 0) > newMaxStr) u.acurr.a[A_STR] = newMaxStr;
    }

    // C :831-837 — resistances read on the NEW form (after set_uasmon):
    // petrification and sickness end at once.
    const stoneRes = !!(u.Stone_resistance || u.HStone_resistance || u.EStone_resistance);
    if (stoneRes && (u.Stoned | 0)) {
        await make_stoned(0, 'You no longer seem to be petrifying.', 0, null);
    }
    const sickRes = !!(u.Sick_resistance || u.HSick_resistance || u.ESick_resistance);
    if (sickRes && (u.Sick | 0)) {
        await make_sick(0, null, false, SICK_ALL);
        await pline('You no longer feel sick.');
    }
    // C :838-845 — slime on a flaming new form burns away; a new green
    // slime keeps it silently.
    if ((u.Slimed | 0)) {
        if (flaming(game.youmonst?.data)) {
            await make_slimed(0, 'The slime burns away!');
        } else if ((u.umonnum | 0) === PM_GREEN_SLIME) {
            /* do it silently */
            await make_slimed(0, null);
        }
    }
    await check_strangling(false); /* maybe stop strangling */
    // C :847-848 — a handless new form starts at glib dexterity.
    if (nohands(game.youmonst?.data)) make_glib(0);

    const mlvl = mdat?.mlevel | 0;
    if (mdat?.mlet === 'S_DRAGON' && mntmp >= PM_GRAY_DRAGON) {
        u.mhmax = In_endgame(u.uz) ? (8 * mlvl) : (4 * mlvl + d(mlvl, 4));
    } else if (is_golem(mdat)) {
        // C polyself.c:863 — fixed golem HP table, no RNG (makemon.c:2233).
        u.mhmax = golemhp(mntmp);
    } else {
        if (!mlvl) u.mhmax = rnd(4);
        else u.mhmax = d(mlvl, 8);
        // C polyself.c:869-870 — home-plane elementals triple HP.
        if (is_home_elemental(mdat)) u.mhmax *= 3;
    }
    u.mh = u.mhmax;

    if ((u.ulevel | 0) < mlvl) {
        u.mtimedone = Math.trunc((u.mtimedone | 0) * (u.ulevel | 0) / mlvl);
    }

    // C polyself.c:886–887 — a merged dragon skin reverts unless the new
    // form is that same dragon (the do_merge polymon keeps it).
    if (u.uskin && mntmp !== armor_to_dragon(u.uskin.otyp | 0)) {
        await skinback(false);
    }
    await break_armor();
    // C: drop_weapon(1) — cantwield (dragon/nohands) must drop uwep
    await drop_weapon(1);
    // C polyself.c:890 — first find_ac (repeated below at :967): recompute
    // uac + arm botl BEFORE the post-strip paints, so a --More-- flush that
    // lands here (Tourist-92095 step 46) shows the post-strip AC like C.
    // RNG-free; the D-0722 gnome AC:9 capture precedes this in code order
    // on both sides, so it stays stale there as C shows it.
    find_ac();
    /* if hiding under something and can't hide anymore, unhide now;
       but don't auto-hide when not already hiding-under */
    if (wasHidingUnder) hideunder(game.youmonst);

    // C :896-898 — pit time-to-escape resets in the new form.
    if ((u.utrap | 0) && ((u.utraptype | 0) === TT_PIT)) {
        set_utrap(rn1(6, 2), TT_PIT); /* time to escape resets */
    }
    // C polyself.c:899-902 — previous form was eyeless and the new form
    // sees: set HBlinded timeout then make_blinded(0,TRUE) "can see again"
    // (same shape as the polyman arm; break_armor's Blindf_off above ran
    // first, matching C :888 before :899).
    const nowBlind = !!(((u.HBlinded | 0) || (u.EBlinded | 0))
        && !(u.BBlinded | 0)) || !!u.uroleplay?.blind;
    if (wasBlind && !nowBlind) {
        u.HBlinded = ((u.HBlinded | 0) & ~TIMEOUT) | (1 & TIMEOUT);
        if (!u.uprops) u.uprops = {};
        if (!u.uprops[BLINDED]) {
            u.uprops[BLINDED] = { intrinsic: 0, extrinsic: 0, blocked: 0 };
        }
        u.uprops[BLINDED].intrinsic =
            ((u.uprops[BLINDED].intrinsic | 0) & ~TIMEOUT) | (1 & TIMEOUT);
        await make_blinded(0, true);
    }
    newsym(u.ux, u.uy); /* Change symbol */
    /* C polyself.c:905-911 — you now know what an egg of your type looks
       like (moved up in case expels() -> spoteffects() drops you onto
       eggs); queen bees also recognize killer bee eggs via the TRUE
       (force_ordinary, draw-free) roll. sit.c lay_an_egg FALSE arm is
       already wired in js/sit.js. */
    if (lays_eggs(game.youmonst?.data)) {
        learn_egg_type(u.umonnum | 0);
        /* make queen bees recognize killer bee eggs */
        learn_egg_type(egg_type_from_parent(u.umonnum | 0, true));
    }
    // C :918-946 — swallowed: a new form that can't be held there makes
    // the engulfer expel the hero (unsolid, huge, or too big for the
    // holder unless the holder is a whirly accommodating it).
    if (u.uswallow) {
        const swdat = game.youmonst?.data;
        const usiz = swdat?.msize | 0;
        const holderdat = u.ustuck?.data;
        if (unsolid(swdat) || usiz >= MZ_HUGE
            || (((holderdat?.msize | 0) < usiz) && !is_whirly(holderdat))) {
            let expelsMesg = true;
            if (unsolid(swdat)) {
                /* [see below for explanation] */
                if (canspotmon(u.ustuck)) ustuckNam = Monnam(u.ustuck);
                await pline(`${ustuckNam} can no longer contain you.`);
                expelsMesg = false;
            }
            await expels(u.ustuck, u.ustuck?.data, expelsMesg);
            wasExpelled = true;
            /* FIXME? if expels() triggered rehumanize then we should
               return early */
        }
    /* [note: this 'sticking' handling is only sufficient for changing from
       grabber to engulfer or vice versa because engulfing by poly'd hero
       always ends immediately so won't be in effect during a polymorph] */
    } else if (u.ustuck && !sticking
               /* being held; if now capable of holding, make holder
                  release so that hero doesn't automagically start holding
                  it; or, release if no longer capable of being held */
               && (sticks(game.youmonst?.data) || unsolid(game.youmonst?.data))) {
        /* u.ustuck name was saved above in case we're changing from can-see
           to can't-see; but might have changed from can't-see to can-see so
           override here if hero knows who u.ustuck is */
        if (canspotmon(u.ustuck)) ustuckNam = Monnam(u.ustuck);
        set_ustuck(null);
        await pline(`${ustuckNam} loses its grip on you.`);
    } else if (sticking && !sticks(game.youmonst?.data)) {
        /* was holding onto u.ustuck but no longer capable of that */
        await uunstick();
    }

    // C :948-956 — a petrifying steed unseats a newly vulnerable rider;
    // an unrideable new form dismounts (DISMOUNT_POLY).
    if (u.usteed) {
        if (touch_petrifies(u.usteed?.data) && !stoneRes && rnl(3)) {
            await pline(`${no_longer_petrify_resistant} touch ${mon_nam(u.usteed)}.`);
            const steedbuf = `riding ${an(pmname(u.usteed?.data, Mgender(u.usteed)))}`;
            await instapetrify(steedbuf);
        }
        if (!can_ride(u.usteed)) await dismount_steed(DISMOUNT_POLY);
    }

    // C :967 — second find_ac ("repeated" after :890). In C order it runs
    // before the pool check so a --More-- there paints post-strip AC
    // (supersedes the D-2402 site below see_monsters; verify guards it).
    find_ac();
    // C :968-971 — landing wet in a non-swimming new form (unless expels()
    // already ran spoteffects above). is_pool_or_lava (dbridge.c:76) is an
    // 8-line predicate over live is_pool/is_lava, inlined at its only site.
    const levit = !!(((u.HLevitation | 0) || (u.ELevitation | 0)) && !(u.BLevitation | 0));
    const swim = !!((u.HSwimming | 0) || (u.ESwimming | 0)
        || (u.usteed && is_swimmer(u.usteed?.data)));
    const under = !!(u.uinwater);
    if (((!levit && !u.ustuck && !Flying() && (is_pool(u.ux, u.uy) || is_lava(u.ux, u.uy)))
         || (under && !swim))
        /* if expelled above, expels() already called spoteffects() */
        && !wasExpelled) {
        await spoteffects(true);
        /* FIXME? if spoteffects() triggered rehumanize then we should
           return early */
    }
    // C :972-979 — passing through rock frees floor-trapped heroes; a lava
    // lover's lava trap turns soothing.
    const passesWalls = !!(u.Passes_walls || u.HPasses_walls || u.EPasses_walls);
    if (passesWalls && (u.utrap | 0)
        && (((u.utraptype | 0) === TT_INFLOOR) || ((u.utraptype | 0) === TT_BURIEDBALL))) {
        if ((u.utraptype | 0) === TT_INFLOOR) {
            await pline('The rock seems to no longer trap you.');
        } else {
            await pline('The buried ball is no longer bound to you.');
            buried_ball_to_freedom();
        }
        reset_utrap(true);
    } else if (likes_lava(game.youmonst?.data) && (u.utrap | 0)
               && ((u.utraptype | 0) === TT_LAVA)) {
        await pline(`The ${hliquid('lava')} now feels soothing.`);
        reset_utrap(true);
    }
    // C :980-986 — amorphous/whirly/unsolid new forms slip chains and balls.
    const newdat = game.youmonst?.data;
    if (amorphous(newdat) || is_whirly(newdat) || unsolid(newdat)) {
        if (Punished()) {
            await pline('You slip out of the iron chain.');
            unpunish();
        } else if ((u.utrap | 0) && ((u.utraptype | 0) === TT_BURIEDBALL)) {
            await pline('You slip free of the buried ball and chain.');
            buried_ball_to_freedom();
        }
    }
    // C :987-994 — webs and bear traps can't hold the insubstantial (nor a
    // small victim of a bear trap).
    if ((u.utrap | 0) && (((u.utraptype | 0) === TT_WEB) || ((u.utraptype | 0) === TT_BEARTRAP))
        && (amorphous(newdat) || is_whirly(newdat) || unsolid(newdat)
            || (((newdat?.msize | 0) <= MZ_SMALL) && ((u.utraptype | 0) === TT_BEARTRAP)))) {
        await pline(`You are no longer stuck in the ${((u.utraptype | 0) === TT_WEB) ? 'web' : 'bear trap'}.`);
        /* probably should burn webs too if PM_FIRE_ELEMENTAL */
        reset_utrap(true);
    }
    // C :995-998 — web spinners settle onto webs instead of being stuck.
    if (webmaker(newdat) && (u.utrap | 0) && ((u.utraptype | 0) === TT_WEB)) {
        await pline('You orient yourself on the web.');
        reset_utrap(true);
    }
    await check_strangling(true); /* maybe start strangling */

    flags.botl = true;
    if (game.disp) game.disp.botl = true;
    // C: gv.vision_full_recalc = 1 before see_monsters — eyeless
    // FROMFORM Blind must clear stale IN_SIGHT (floating-eye glyph)
    // on the next allmain/pline vision_recalc (D-0928).
    game.vision_full_recalc = 1;
    see_monsters();
    await encumber_msg();

    /* retouch_equipment(2) stays a named omission (artifact.c:2639 — its own
       coverage row, map-kept); the selftouch below it is live. */
    // C :1019-1024 — bare-handed after the change: risk the touch. This may
    // recurse into polymon() (stone golem wielding cockatrice corpse hit by
    // stone-to-flesh); neither form uses #monster so no loop guard is added.
    if (!u.uarmg) await selftouch(no_longer_petrify_resistant);
    // C: polyself.c:1030–1070 — flags.verbose ability tips after encumber
    // (breath tip forces --More-- on the encumber pline; D-0725).
    // Branch order matches C; the #sit arm keeps the giant/electric-eel
    // exclusion (JS compares mndx; mons() allocates, so no &mons[] eq).
    if (flags.verbose !== false) {
        const uptr = game.youmonst?.data;
        const might_hide = !!(is_hider(uptr) || hides_under(uptr));
        if (can_breathe(uptr)) {
            await pline('Use the command #monster to use your breath weapon.');
        }
        if (attacktype(uptr, AT_SPIT)) {
            await pline('Use the command #monster to spit venom.');
        }
        if (uptr?.mlet === 'S_NYMPH') {
            await pline('Use the command #monster to remove an iron ball.');
        }
        if (attacktype(uptr, AT_GAZE)) {
            await pline('Use the command #monster to gaze at monsters.');
        }
        if (might_hide && webmaker(uptr)) {
            await pline('Use the command #monster to hide or to spin a web.');
        } else if (might_hide) {
            await pline('Use the command #monster to hide.');
        } else if (webmaker(uptr)) {
            await pline('Use the command #monster to spin a web.');
        }
        if (is_were(uptr)) {
            await pline('Use the command #monster to summon help.');
        }
        if ((u.umonnum | 0) === PM_GREMLIN) {
            await pline('Use the command #monster to multiply in a fountain.');
        }
        if (is_unicorn(uptr)) {
            await pline('Use the command #monster to use your horn.');
        }
        if (is_mind_flayer(uptr)) {
            await pline('Use the command #monster to emit a mental blast.');
        }
        if (((uptr?.msound) | 0) === MS_SHRIEK) {
            await pline('Use the command #monster to shriek.');
        }
        if (is_vampire(uptr) || is_vampshifter(game.youmonst)) {
            await pline('Use the command #monster to change shape.');
        }
        if (lays_eggs(uptr) && flags.female
            && (uptr?.mndx !== PM_GIANT_EEL
                && uptr?.mndx !== PM_ELECTRIC_EEL)) {
            await pline(`Use the command #sit to ${eggs_in_water(uptr) ? 'spawn in the water' : 'lay an egg'}.`);
        }
    }
    return 1;
}

/**
 * C ref: polyself.c skinback `:1953–1969` — dragon armor merged into the
 * hero's skin (uskin) goes back to being worn body armor.
 * @param {boolean} silently
 */
export async function skinback(silently) {
    const u = game.u || (game.u = {});
    if (u.uskin) {
        const old_light = arti_light_radius(u.uskin);

        if (!silently) await pline('Your skin returns to its original form.');
        u.uarm = u.uskin;
        u.uskin = null;
        /* undo save/restore hack */
        u.uarm.owornmask = (u.uarm.owornmask | 0) & ~I_SPECIAL;

        if (artifact_light(u.uarm)) await maybe_adjust_light(u.uarm, old_light);
    }
}

/**
 * C ref: polyself.c polyself `:469–733` — system-shock, POLY_CONTROLLED
 * getlin, special forms (do_merge / do_shift / do_vampyr), random
 * ordinary pick, then polymon/newman.
 * Live: POLY_LOW_CTRL forcecontrol downgrade (D-1428);
 * controllable_poly getlin incl. non-force ESC-to-random (D-2177);
 * !polyok the()/bare/an() article (D-2063); POLY_MONSTER isvamp
 * do_vampyr shape change (D-2063); by_class class-word pick with the
 * `rn2(3)` re-pick (D-2248).
 * Live (D-2262): POLY_REVERT; placeholder orc/elf/giant substitutes;
 * wizard own-role rehumanize; were do_shift; draconian do_merge into
 * uskin; post-loop draconian/isvamp gotos. The C gotos are flattened
 * into `target` (the label control jumps to).
 * Named omissions: made_change light-source bookkeeping (JS
 * do_light_sources has no hero arm like C get_mon_location, so a
 * youmonst LS_MONSTER source would be misplaced).
 * @param {number} [psflags=POLY_NOFLAGS]
 */
export async function polyself(psflags = 0) {
    const u = game.u || (game.u = {});
    let forcecontrol = (psflags & POLY_CONTROLLED) !== 0;
    const low_control = (psflags & POLY_LOW_CTRL) !== 0;
    let monsterpoly = (psflags & POLY_MONSTER) !== 0;
    const formrevert = (psflags & POLY_REVERT) !== 0;
    // C :472 — gvariant starts NEUTRAL, name_to_mon fills it, and the
    // do_vampyr "Become %s?" prompt reads it; one box for the whole loop.
    const gvariant = { gender: NEUTRAL };

    if (Unchanging(u)) {
        await pline('You fail to transform!');
        return;
    }

    // C: !Polymorph_control && !forcecontrol && !draconian && !iswere && !isvamp
    const draconian = !!(u.uarm && Is_dragon_armor(u.uarm));
    const iswere = ismnum(u.ulycn);
    const youdata = game.youmonst?.data;
    const isvamp = !!(is_vampire(youdata) || is_vampshifter(game.youmonst));
    // C polyself.c:480 — controllable_poly = Polymorph_control && !(Stunned || Unaware);
    // Stunned shape mirrors hack.js Stunned_prop ((u.HStun|0) || u.Stunned).
    let controllable_poly = Polymorph_control(u) && !((u.HStun | 0) || u.Stunned) && !Unaware();
    if (!Polymorph_control(u) && !forcecontrol && !draconian && !iswere
        && !isvamp) {
        // C: if (rn2(20) > ACURR(A_CON)) system shock
        if (rn2(20) > acurr(A_CON)) {
            await pline('You shudder for a moment.');
            losehp(rnd(30), 'system shock', KILLED_BY_AN);
            if (game._losehp_needs_done || game.program_state?.gameover) {
                await finish_losehp_done();
            }
            exercise(A_CON, false);
            return;
        }
    }

    let mntmp = NON_PM;
    // C :500–504 — POLY_REVERT: back to the vampshifter's base form, as a
    // monster poly with no control prompt.
    if (formrevert) {
        mntmp = game.youmonst?.cham ?? NON_PM;
        monsterpoly = true;
        controllable_poly = false;
    }

    // C polyself.c :506–508 — blessed potion LOW_CTRL does not prompt
    // when already a dragon-merge / monster-poly / vamp / were form.
    if (forcecontrol && low_control
        && (draconian || monsterpoly || isvamp || iswere)) {
        forcecontrol = false;
    }

    // C gotos flattened: `target` names the label control jumps to —
    // 'do_merge' | 'do_shift' | 'do_vampyr' | 'made_change'; null falls
    // through to the :698 random funnel.
    let target = null;
    // C polyself.c:510 — `if (monsterpoly && isvamp) goto do_vampyr`: a #monster
    // shape change as a vampire skips the getlin block entirely.
    if (monsterpoly && isvamp) {
        target = 'do_vampyr';
    } else if (controllable_poly || forcecontrol) {
        // C polyself.c:513 — poly-control (worn ring) prompts even for
        // POLY_NOFLAGS (D-2177).
        let tryct = 5;
        do {
            mntmp = NON_PM;
            let buf = await getlin('Become what kind of monster? [type the name]');
            buf = mungspaces(buf);
            // C :521–528 — ESC cancels only wizard #polyself (forcecontrol);
            // ordinary control falls through to "*" (resort to random).
            if (buf === '\x1b' || buf == null) {
                if (forcecontrol) {
                    await pline('Never mind.');
                    return;
                }
                buf = '*';
            }
            // C :529 — exact strcmp "random" (not case-folded).
            if (buf === '*' || buf === 'random') {
                tryct = 0;
                continue;
            }
            // C polyself.c:536 — `class` is 0 unless the by_class arm below
            // resolves a class word (name_to_monclass returns 0 on no match).
            let cls = 0;
            mntmp = name_to_mon(buf, gvariant);
            let by_class = mntmp < LOW_PM;
            let accepted = false;
            // One pass per C arm chain; `continue` is C :600 `goto by_class`,
            // which re-enters the class pick without re-running name_to_mon.
            for (;;) {
                if (by_class) {
                    // C polyself.c:537-542 by_class: a class word (single
                    // symbol or explain text) resolves to a candidate type —
                    // a specific match rides as-is, otherwise a worn-dragon
                    // draconian merges with their armor and any other class
                    // picks via mkclass_poly (no polyok() check here).
                    const box = { mndx: NON_PM };
                    cls = name_to_monclass(buf, box);
                    mntmp = box.mndx | 0;
                    if (cls && mntmp === NON_PM) {
                        mntmp = (draconian && cls === 'S_DRAGON')
                            ? armor_to_dragon(u.uarm?.otyp | 0)
                            : mkclass_poly(cls);
                    }
                } else if (is_placeholder(mons(mntmp))
                    /* when your own race, fall to !polyok() case */
                    && !your_race(mons(mntmp))
                    /* same for generic human, even if hero isn't human */
                    && mntmp !== PM_HUMAN) {
                    // C :544–563 — placeholders are reasonable polymorph
                    // targets; pick a substitute (which might be geno'd).
                    if (mntmp === PM_ORC)
                        mntmp = rn2(3) ? PM_HILL_ORC : PM_MORDOR_ORC;
                    else if (mntmp === PM_ELF)
                        mntmp = rn2(3) ? PM_GREEN_ELF : PM_GREY_ELF;
                    else if (mntmp === PM_GIANT)
                        mntmp = rn2(3) ? PM_STONE_GIANT : PM_HILL_GIANT;
                }

                if (mntmp < LOW_PM) {
                    // C :566-569 — bare-name miss vs class with no live pick.
                    if (!cls) await pline("I've never heard of such monsters.");
                    else await pline("You can't polymorph into any of those.");
                } else if ((game.flags?.debug || game.flags?.wizard) && Upolyd(u)
                    && (mntmp === (u.umonster | 0)
                        /* "priest" and "priestess" match the monster rather
                           than the role; override that unless the text
                           explicitly contains "aligned" */
                        || ((u.umonster | 0) === PM_CLERIC
                            && mntmp === PM_ALIGNED_CLERIC
                            && !strstri(buf, 'aligned')))) {
                    // C :570–582 — wizard mode: own role while poly'd reverts
                    // without newman()'s chance of level or sex change.
                    // (C's `old_light = 0` belongs to the omitted light arm.)
                    await rehumanize();
                    target = 'made_change';
                } else if (iswere && (were_beastie(mntmp) === u.ulycn
                    || mntmp === counter_were(u.ulycn)
                    || (Upolyd(u) && mntmp === PM_HUMAN))) {
                    target = 'do_shift'; // C :583–586
                } else if (!polyok(mons(mntmp))
                    // C polyself.c:587–597 — humans are illegal as monsters,
                    // but an illegal monster forces newman(), which is what
                    // own race (non-unique) and own role want.
                    && !(mntmp === PM_HUMAN
                        || (your_race(mons(mntmp)) && ((mons(mntmp)?.geno | 0) & G_UNIQ) === 0)
                        || mntmp === (game.urole?.mnum | 0))) {
                    // C :598-604 — mkclass_poly() can pick a !polyok()
                    // candidate; if so, usually try again. The rn2(3)
                    // short-circuit re-picks without consuming a try; on
                    // exhaustion one try goes back so the loop decrement
                    // yields 0 (thats_enough_tries).
                    if (cls) {
                        if (rn2(3) || --tryct > 0) {
                            by_class = true;
                            continue;
                        }
                        ++tryct;
                    }
                    // C polyself.c:608–613 — unique → the(), proper name →
                    // bare, otherwise an(). mntmp is not reset: C keeps it, so
                    // a last refused pick reaches newman() below, not the
                    // random funnel.
                    const mptr = mons(mntmp);
                    let pm_name = pmname(mntmp, game.flags?.female ? FEMALE : MALE);
                    if (the_unique_pm(mptr)) pm_name = the(pm_name);
                    else if (!type_is_pname(mptr)) pm_name = an(pm_name);
                    await pline(`You can't polymorph into ${pm_name}.`);
                } else {
                    accepted = true;
                }
                break;
            }
            if (target || accepted) break;
        } while (--tryct > 0);

        // The do_shift / made_change gotos leave before this tail.
        // C :618–625 — no return:
        // ordinary forms fall through to the :698 random funnel (D-2177).
        if (!target) {
            if (!tryct) {
                await pline("That's enough tries!");
            }
            /* allow skin merging, even when polymorph is controlled */
            if (draconian
                && (tryct <= 0 || mntmp === armor_to_dragon(u.uarm.otyp | 0))) {
                target = 'do_merge';
            } else if (isvamp
                && (tryct <= 0 || mntmp === PM_WOLF || mntmp === PM_FOG_CLOUD
                    || is_bat(mons(mntmp)))) {
                target = 'do_vampyr';
            }
        }
    } else if (draconian) {
        // C :626 — special changes that don't require polyok()
        target = 'do_merge';
    } else if (iswere) {
        target = 'do_shift';
    } else if (isvamp) {
        target = 'do_vampyr';
    }

    if (target === 'do_merge') {
        // C polyself.c:629–664 do_merge — worn dragon armor becomes uskin.
        mntmp = armor_to_dragon(u.uarm.otyp | 0);
        if (!((game.mvitals?.[mntmp]?.mvflags | 0) & G_GENOD)) {
            const uarm = u.uarm;
            const was_lit = uarm.lamplit;
            const arm_light = artifact_light(uarm) ? arti_light_radius(uarm) : 0;

            /* allow G_EXTINCT */
            if (Is_dragon_scales(uarm)) {
                /* dragon scales remain intact as uskin */
                await pline('You merge with your scaly armor.');
            } else { /* dragon scale mail reverts to scales */
                /* similar to noarmor(invent.c),
                   shorten to "<color> scale mail" */
                const buf = strsubst(simpleonames(uarm), ' dragon ', ' ');
                /* dragon scale mail is singular, dragon scales plural */
                await pline(`Your ${buf} reverts to scales as you merge with them.`);
                /* uarm->spe enchantment remains unchanged */
                uarm.otyp = (uarm.otyp | 0) + GRAY_DRAGON_SCALES - GRAY_DRAGON_SCALE_MAIL;
                observe_object(uarm);
                if (game.flags) game.flags.botl = true; /* AC is changing */
                if (game.disp) game.disp.botl = true;
            }
            u.uskin = uarm;
            u.uarm = null;
            /* save/restore hack */
            u.uskin.owornmask = (u.uskin.owornmask | 0) | I_SPECIAL;
            if (was_lit) await maybe_adjust_light(u.uskin, arm_light);
            update_inventory();
        }
    } else if (target === 'do_shift') {
        // C polyself.c:665–670 do_shift
        if (Upolyd(u) && were_beastie(mntmp) !== u.ulycn)
            mntmp = PM_HUMAN; /* Illegal; force newman() */
        else
            mntmp = u.ulycn;
    } else if (target === 'do_vampyr') {
        // C polyself.c:671–686 do_vampyr — vampire shape change skips the
        // polyok gate: re-pick wolf/fog/bat (cham override), y_n prompt when
        // controlled. RNG short-circuit order kept: leader rn2(10) first,
        // else rn2(4), then cham rn2(2).
        if (mntmp < LOW_PM || ((mons(mntmp)?.geno | 0) & G_UNIQ)) {
            const isLeader = (youdata?.mndx ?? -1) === PM_VAMPIRE_LEADER;
            if (isLeader && !rn2(10)) mntmp = PM_WOLF;
            else if (!rn2(4)) mntmp = PM_FOG_CLOUD;
            else mntmp = PM_VAMPIRE_BAT;
            const cham = game.youmonst?.cham;
            if (ismnum(cham) && !is_vampire(youdata) && !rn2(2)) mntmp = cham;
        }
        if (controllable_poly) {
            if ((await y_n(`Become ${an(pmname(mntmp, gvariant.gender))}?`)) !== 'y') return;
        }
    }

    if (target === 'do_merge' || target === 'do_shift' || target === 'do_vampyr') {
        // C :688–695 — if polymon fails, "you feel" message has been given
        // so don't follow up with another polymon or newman; sex_change_ok
        // left disabled here; then goto made_change.
        if (mntmp === PM_HUMAN) await newman(); /* werecritter */
        else await polymon(mntmp);
    } else if (!target) {
        // C: mntmp < LOW_PM → tryct=200; rn1(SPECIAL_PM-LOW_PM, LOW_PM)
        if (mntmp < LOW_PM) {
            let tryct = 200;
            do {
                mntmp = rn1(SPECIAL_PM - LOW_PM, LOW_PM);
                if (polyok(mons(mntmp)) && !is_placeholder(mons(mntmp))) {
                    break;
                }
            } while (--tryct > 0);
        }

        game.sex_change_ok = (game.sex_change_ok | 0) + 1;
        try {
            const ptr = mons(mntmp);
            const yourRaceBit = game.urace?.selfmask | 0;
            const isYourRace = yourRaceBit !== 0
                && ((ptr?.mflags2 | 0) & yourRaceBit) !== 0;
            // C: !polyok || (!forcecontrol && !rn2(5)) || your_race → newman()
            if (!polyok(ptr) || (!forcecontrol && !rn2(5)) || isYourRace) {
                await newman();
            } else {
                await polymon(mntmp);
            }
        } finally {
            game.sex_change_ok = (game.sex_change_ok | 0) - 1;
        }
    }
    // C made_change `:720–730` — light-source bookkeeping named omission.
}

/**
 * C ref: wizcmds.c wiz_polyself — #polyself
 * @returns {Promise<number>} ECMD_OK
 */
export async function wiz_polyself() {
    if (!(game.flags?.debug || game.flags?.wizard)) {
        await pline("You can't do that.");
        return ECMD_OK;
    }
    await polyself(POLY_CONTROLLED);
    return ECMD_OK;
}

/**
 * C ref: polyself.c dobreathe `:1420–1447` — hero breath weapon while poly'd.
 * Envelope: Strangled refuse; u.uen < 15 refuse; u.uen -= 15 + botl;
 * getdir (ECMD_CANCEL on quit); attacktype_fordmg AT_BREA AD_ANY;
 * self-directed → ubreatheu, else ubuzz(BZ_U_BREATH(BZ_OFS_AD(adtyp)), damn).
 * @returns {Promise<number>} ECMD_OK | ECMD_CANCEL | ECMD_TIME
 */
export async function dobreathe() {
    const u = game.u || (game.u = {});
    if (u.Strangled) {
        await pline("You can't breathe.  Sorry.");
        return ECMD_OK;
    }
    if ((u.uen | 0) < 15) {
        await pline("You don't have enough energy to breathe!");
        return ECMD_OK;
    }
    // C `:1433–1434` — energy cost lands before the direction prompt,
    // so a cancelled breath still costs 15 (dosummon botl pattern).
    u.uen = (u.uen | 0) - 15;
    if (!game.flags) game.flags = {};
    game.flags.botl = true;
    if (game.disp) game.disp.botl = true;
    // C `:1436–1437` — live getdir (lock.js); 'b'-style dirsym consumed here.
    if (!(await getdir(null))) return ECMD_CANCEL;
    // C `:1439–1445` — AD_ANY is -1 (monattk.h; dospit pattern).
    const mattk = attacktype_fordmg(game.youmonst?.data, AT_BREA, -1);
    if (!mattk) {
        await impossible('bad breath attack?');
    } else if (!(u.dx | 0) && !(u.dy | 0) && !(u.dz | 0)) {
        await ubreatheu(mattk);
    } else {
        await ubuzz(BZ_U_BREATH(BZ_OFS_AD(mattk.adtyp | 0)), mattk.damn | 0);
    }
    return ECMD_TIME;
}

/**
 * C ref: polyself.c dospit — hero spit attack while poly'd.
 * Envelope: getdir; venom by adtyp (BLND/DRST → blinding, ACID → acid);
 * spe=1 yours; throwit.
 * @returns {Promise<number>} ECMD_CANCEL | ECMD_TIME
 */
export async function dospit() {
    if (!(await getdir(null))) return ECMD_CANCEL;
    // C: attacktype_fordmg(data, AT_SPIT, AD_ANY); AD_ANY is -1 (monattk.h)
    const mattk = attacktype_fordmg(game.youmonst?.data, AT_SPIT, -1);
    if (!mattk) {
        await impossible('bad spit attack?');
    } else {
        let otmp;
        switch (mattk.adtyp | 0) {
        case AD_BLND:
        case AD_DRST:
            otmp = mksobj(BLINDING_VENOM, true, false);
            break;
        default:
            await impossible('bad attack type in dospit');
            /* FALLTHROUGH */
        case AD_ACID:
            otmp = mksobj(ACID_VENOM, true, false);
            break;
        }
        otmp.spe = 1; /* to indicate it's yours */
        await throwit(otmp, 0, false, null);
    }
    return ECMD_TIME;
}

/**
 * C ref: polyself.c doremove — #monster while poly'd as nymph: unpunish.
 * @returns {Promise<number>} ECMD_OK | ECMD_TIME
 */
export async function doremove() {
    const u = game.u || {};
    if (!Punished()) {
        if (u.utrap && (u.utraptype | 0) === TT_BURIEDBALL) {
            await pline(`The ball and chain are buried firmly in the ${surface(u.ux, u.uy)}.`);
            return ECMD_OK;
        }
        await pline('You are not chained to anything!');
        return ECMD_OK;
    }
    unpunish();
    return ECMD_TIME;
}

/**
 * C ref: polyself.c dosummon — #monster while poly'd as were-creature.
 * Envelope: uen<10 refuse; uen-=10 + botl; were_summon tame-by-you.
 * @returns {Promise<number>} ECMD_OK | ECMD_TIME
 */
export async function dosummon() {
    const u = game.u || (game.u = {});
    if ((u.uen | 0) < 10) {
        await pline('You lack the energy to send forth a call for help!');
        return ECMD_OK;
    }
    u.uen = (u.uen | 0) - 10;
    if (!game.flags) game.flags = {};
    game.flags.botl = true;
    if (game.disp) game.disp.botl = true;
    await pline('You call upon your brethren for help!');
    exercise(A_WIS, true);
    // C: were_summon(data, TRUE, &placeholder, NULL); visible is { n }
    if (!(await were_summon(game.youmonst?.data, true, { n: 0 }, null))) {
        await pline('But none arrive.');
    }
    return ECMD_TIME;
}

/**
 * C ref: polyself.c dopoly — #monster while poly'd as vampire: re-poly.
 * @returns {Promise<number>} ECMD_TIME
 */
export async function dopoly() {
    const u = game.u || {};
    const savedat = game.youmonst?.data;
    if (is_vampire(game.youmonst?.data) || is_vampshifter(game.youmonst)) {
        await polyself(POLY_MONSTER);
        if (savedat !== game.youmonst?.data) {
            await pline(`You transform into ${an(pmname(game.youmonst?.data, Ugender()))}.`);
            newsym(u.ux, u.uy);
        }
    }
    return ECMD_TIME;
}

/**
 * C ref: polyself.c domindblast :1893–1938 — #monster while poly'd as mind flayer.
 * Envelope: uen<10 refuse; uen-=10 + botl; BOLT_LIM range, !peaceful,
 * !mindless, telepathy/rn2 gates; wakeup-before-blast hostility rule.
 * C never calls passive() here: gaze retaliation (floating eye, Medusa)
 * fires on melee only (review 868).
 * @returns {Promise<number>} ECMD_OK | ECMD_TIME
 */
export async function domindblast() {
    const u = game.u || (game.u = {});
    if ((u.uen | 0) < 10) {
        await pline('You concentrate but lack the energy to maintain doing so.');
        return ECMD_OK;
    }
    u.uen = (u.uen | 0) - 10;
    if (!game.flags) game.flags = {};
    game.flags.botl = true;
    if (game.disp) game.disp.botl = true;
    await pline('You concentrate.');
    await pline('A wave of psychic energy pours out.');
    // C saves nmon before the body (killed() can unlink); snapshot matches
    for (const mtmp of [...(game.fmon || [])]) {
        if ((mtmp.mhp | 0) < 1) continue; /* DEADMONSTER */
        if (mdistu(mtmp) > BOLT_LIM * BOLT_LIM) continue;
        if (mtmp.mpeaceful) continue;
        if (mindless(mtmp.data)) continue;
        const u_sen = telepathic(mtmp.data) && !mtmp.mcansee;
        if (u_sen || (telepathic(mtmp.data) && rn2(2)) || !rn2(10)) {
            const dmg = rnd(15);
            /* wake it up first, to bring hidden monster out of hiding;
               but in case it is currently peaceful, don't make it hostile
               unless it will survive the psychic blast, otherwise hero
               would avoid the penalty for killing it while peaceful */
            await wakeup(mtmp, dmg > (mtmp.mhp | 0));
            await pline(`You lock in on ${s_suffix(mon_nam(mtmp))} ${
                u_sen ? 'telepathy'
                : telepathic(mtmp.data) ? 'latent telepathy' : 'mind'}.`);
            mtmp.mhp = (mtmp.mhp | 0) - dmg;
            if ((mtmp.mhp | 0) < 1) await killed(mtmp);
        }
    }
    return ECMD_TIME;
}

/**
 * C ref: youprop.h Flying — (H||E||steed-flyer) && !B.
 * File-local per-module idiom (eat.js Flying); dohide/youhiding need the
 * ceiling test without importing another module's local.
 * @returns {boolean}
 */
function Flying() {
    const u = game.u || {};
    if (u.Flying) return true;
    const prop = u.uprops?.[FLYING];
    const blocked = (u.BFlying | 0) || (prop?.blocked | 0);
    if (u.usteed && is_flyer(u.usteed.data) && !blocked) return true;
    return !!(((u.HFlying | 0) || (u.EFlying | 0)
        || (prop?.intrinsic | 0) || (prop?.extrinsic | 0))
        && !blocked);
}

/** C ref: dungeon.c plur — "s" unless 1 (end.js file-local idiom). */
function plur(n) {
    return (n | 0) === 1 ? '' : 's';
}

/**
 * C ref: insight.c youhiding :2022–2077 — describe the hero's hiding place.
 * Envelope: mimic shape detail (U_AP_TYPE) vs uundetected eel-in-pool /
 * hides_under pile / ceiling-clinger-or-flyer / pit-floor trapper /
 * surface; via_enlghtmt menu line vs topline message.
 * Named omission: the via_enlghtmt arm (insight.c:2074–2077 `you_are`) —
 * JS enlightenment (invent.js) never calls youhiding and the menu-line
 * channel has no polyself-side endpoint.
 */
export async function youhiding(via_enlghtmt, msgflag) {
    const u = game.u || {};
    const youdata = game.youmonst?.data;
    let buf = 'hiding';
    const ap_type = M_AP_TYPE(game.youmonst);
    if (ap_type !== M_AP_NOTHING) {
        /* mimic; the hero only ever mimics a strange object or gold
           (or its hallucinatory stand-in), so furniture/monster detail
           arms stay exactly as C wrote them */
        buf = 'mimicking';
        if (ap_type === M_AP_OBJECT) {
            buf += ` ${an(simple_typename(game.youmonst?.mappearance))}`;
        } else if (ap_type === M_AP_FURNITURE) {
            buf += ' something';
        } else if (ap_type === M_AP_MONSTER) {
            buf += ' someone';
        }
        /* else: something unexpected; leave buf as-is */
    } else if (u.uundetected) {
        if (youdata?.mlet === 'S_EEL') {
            if (is_pool(u.ux, u.uy)) buf += ` in the ${waterbody_name(u.ux, u.uy)}`;
        } else if (hides_under(youdata)) {
            const o = objects_at(u.ux, u.uy);
            if (o) buf += ` underneath ${ansimpleoname(o)}`;
        } else if (is_clinger(youdata) || Flying()) {
            /* Flying: 'lurker above' hides on ceiling but doesn't cling */
            buf += ` on the ${ceiling(u.ux, u.uy)}`;
        } else if ((u.utrap | 0) && (u.utraptype | 0) === TT_PIT) {
            /* on floor; is_hider() but otherwise not special: 'trapper' */
            const t = t_at(u.ux, u.uy);
            buf += ` in a ${t && (t.ttyp | 0) === SPIKED_PIT ? 'spiked ' : ''}pit`;
        } else {
            buf += ` on the ${surface(u.ux, u.uy)}`;
        }
    }
    /* else: shouldn't happen; falls through to generic "you are hiding" */
    if (via_enlghtmt) return; /* named omission above */
    /* C: You("are %s %s.", msgflag ? "already" : "now", buf) */
    await pline(`You are ${msgflag ? 'already' : 'now'} ${buf}.`);
}

/**
 * C ref: polyself.c dohide :1777–1874 — #monster hide for hiders/mimics.
 * Branch order matches C: held/trapped refuse (+reveal uundetected/mimic)
 * → eel-out-of-water → hides_under pile (incl. all-'trice petrify) →
 * ceiling-without-ceiling / floor-hider-on-air-or-water → already-hiding
 * → mimic-appearance set / uundetected set + newsym + youhiding.
 * @returns {Promise<number>} ECMD_OK | ECMD_TIME
 */
export async function dohide() {
    const u = game.u || (game.u = {});
    if (!game.youmonst) game.youmonst = {};
    const you = game.youmonst;
    const youdata = you.data;
    const ismimic = youdata?.mlet === 'S_MIMIC';
    const on_ceiling = is_clinger(youdata) || Flying();

    /* can't hide while being held (or holding) or while trapped
       (except for floor hiders [trapper or mimic] in pits) */
    if (u.ustuck || ((u.utrap | 0) && ((u.utraptype | 0) !== TT_PIT || on_ceiling))) {
        /* C: You_cant("hide while you're %s.", ...) — nesting kept */
        const why = !u.ustuck ? 'trapped'
            : u.uswallow ? (digests(u.ustuck?.data) ? 'swallowed' : 'engulfed')
            : !sticks(youdata) ? 'being held'
            : (humanoid(u.ustuck?.data) ? 'holding someone' : 'holding that creature');
        await pline(`You can't hide while you're ${why}.`);
        if (u.uundetected || (ismimic && M_AP_TYPE(you) !== M_AP_NOTHING)) {
            u.uundetected = 0;
            you.m_ap_type = M_AP_NOTHING;
            newsym(u.ux, u.uy);
        }
        return ECMD_OK;
    }
    /* note: hero-as-eel handling is incomplete but unnecessary;
       such critters aren't offered the option of hiding via #monster */
    if (youdata?.mlet === 'S_EEL' && !is_pool(u.ux, u.uy)) {
        if (IS_FOUNTAIN(game.level?.at(u.ux, u.uy)?.typ)) {
            await pline('The fountain is not deep enough to hide in.');
        } else {
            await pline(`There is no ${hliquid('water')} to hide in here.`);
        }
        u.uundetected = 0;
        return ECMD_OK;
    }
    if (hides_under(youdata)) {
        let ct = 0;
        const otop = objects_at(u.ux, u.uy);
        if (!otop) {
            await pline('There is nothing to hide under here.');
            u.uundetected = 0;
            return ECMD_OK;
        }
        let otmp;
        for (otmp = otop;
             otmp && (otmp.otyp | 0) === CORPSE
                && touch_petrifies(mons(otmp.corpsenm));
             otmp = otmp.nexthere) {
            ct += (otmp.quan | 0);
        }
        /* otmp is null iff the entire pile consists of 'trice corpses */
        if (!otmp && !(u.Stone_resistance || u.HStone_resistance || u.EStone_resistance)) {
            let corpse_name = cxname(otop);
            /* plural case says "cockatrice corpses" / "chickatrice corpses"
               from the top of the pile even if both types are present */
            if (ct === 1) corpse_name = an(corpse_name);
            /* no need to check poly_when_stoned(); no hide-underers can
               turn into stone golems instead of becoming petrified */
            await pline(`Hiding under ${corpse_name}${plur(ct)} is a fatal mistake...`);
            await instapetrify(`hiding under ${corpse_name}${plur(ct)}`);
            /* only reach here if life-saved */
            u.uundetected = 0;
            return ECMD_TIME;
        }
    }
    /* Planes of Air and Water */
    if (on_ceiling && !has_ceiling(u.uz)) {
        await pline('There is nowhere to hide above you.');
        u.uundetected = 0;
        return ECMD_OK;
    }
    if (is_hider(youdata) && !Flying()
        && (Is_airlevel(u.uz) || Is_waterlevel(u.uz))) {
        await pline('There is nowhere to hide beneath you.');
        u.uundetected = 0;
        return ECMD_OK;
    }
    /* TODO? inhibit floor hiding at furniture locations, or
     * else make youhiding() give smarter messages at such spots. */

    if (u.uundetected || (ismimic && M_AP_TYPE(you) !== M_AP_NOTHING)) {
        await youhiding(false, 1); /* "you are already hiding" */
        return ECMD_OK;
    }

    if (ismimic) {
        /* should bring up a dialog "what would you like to imitate?" */
        you.m_ap_type = M_AP_OBJECT;
        you.mappearance = STRANGE_OBJECT;
    } else {
        u.uundetected = 1;
    }
    newsym(u.ux, u.uy);
    await youhiding(false, 0); /* "you are now hiding" */
    return ECMD_TIME;
}

/**
 * C ref: polyself.c dogaze `:1642–1773` — #monster gaze attack while
 * poly'd, in C order: AT_GAZE mattk scan (AD_CONF/AD_FIRE else
 * impossible); Blind/Hallucination/uen<15 gates; uen-=15 + botl; per
 * visible monster: Invis/perceives, minvis/See_invisible, mimic-appear,
 * safe_dog tame, confirm peaceful y_n, setmangry, helpless/stun/blind/
 * eyeless skip (looked--), AD_CONF mconf, AD_FIRE destroy+ignite+killed,
 * floating-eye freeze (nomul/multi_reason/nomovemsg + ECMD_TIME) or
 * stiffen, Medusa done(STONING); looked==0 pline; ECMD_TIME.
 * `You_cant`/`Your`/`pline_The` render as prefixed pline (file idiom);
 * `helpless` is `monst.h:251` (msleeping || !mcanmove); `perceives` is
 * `mondata.h:81` (mflags1 & M1_SEE_INVIS).
 * @returns {Promise<number>} ECMD_OK | ECMD_TIME
 */
export async function dogaze() {
    const u = game.u || {};
    const flags = game.flags || {};
    const mattk = game.youmonst?.data?.mattk;
    let adtyp = 0;
    for (let i = 0; i < NATTK; i++) {
        if ((mattk?.[i]?.aatyp | 0) === AT_GAZE) {
            adtyp = mattk[i].adtyp | 0;
            break;
        }
    }
    if (adtyp !== AD_CONF && adtyp !== AD_FIRE) {
        await impossible(`gaze attack ${adtyp}?`);
        return ECMD_OK;
    }

    if (Blind()) {
        await pline("You can't see anything to gaze at.");
        return ECMD_OK;
    } else if (Hallucination()) {
        await pline("You can't gaze at anything you can see.");
        return ECMD_OK;
    }
    if ((u.uen | 0) < 15) {
        await You('lack the energy to use your special gaze!');
        return ECMD_OK;
    }
    u.uen = (u.uen | 0) - 15;
    flags.botl = true;

    let looked = 0;
    // C youprop.h See_invisible ≡ H || E (+ sticky flat, per-module idiom).
    const See_invisible = !!((u.HSee_invisible | 0) || (u.ESee_invisible | 0)
        || u.See_invisible);
    const confused = !!((u.HConfusion | 0) || u.Confusion);
    // C walks live fmon; snapshot preserves one-visit-per-monster order
    // while killed() unlinks mid-loop (priest.js/monmove.js idiom).
    for (const mtmp of [...(game.fmon || [])]) {
        if ((mtmp.mhp | 0) < 1) continue; // DEADMONSTER
        if (canseemon(mtmp) && couldsee(mtmp.mx, mtmp.my)) {
            looked++;
            if (Invis() && (((mtmp.data?.mflags1 | 0) & M1_SEE_INVIS) === 0)) {
                await pline(`${Monnam(mtmp)} seems not to notice your gaze.`);
            } else if (mtmp.minvis && !See_invisible) {
                await pline(`You can't see where to gaze at ${Monnam(mtmp)}.`);
            } else if (M_AP_TYPE(mtmp) === M_AP_FURNITURE
                       || M_AP_TYPE(mtmp) === M_AP_OBJECT) {
                looked--;
                continue;
            } else if (flags.safe_dog !== false && mtmp.mtame && !confused) {
                // C polyself.c:1689 You("avoid gazing at %s.", y_monnam(mtmp)).
                await You('avoid gazing at %s.', y_monnam(mtmp));
            } else {
                if (flags.confirm !== false && mtmp.mpeaceful && !confused) {
                    const qbuf = `Really ${adtyp === AD_CONF ? 'confuse' : 'attack'} ${mon_nam(mtmp)}?`;
                    if ((await y_n(qbuf)) !== 'y') continue;
                }
                await setmangry(mtmp, true);
                if (mtmp.msleeping || !mtmp.mcanmove || mtmp.mstun
                    || !mtmp.mcansee || !haseyes(mtmp.data)) {
                    looked--;
                    continue;
                }
                /* No reflection check for consistency with when a monster
                 * gazes at *you*--only medusa gaze gets reflected then. */
                if (adtyp === AD_CONF) {
                    if (!mtmp.mconf)
                        await pline(`Your gaze confuses ${mon_nam(mtmp)}!`);
                    else
                        await pline(`${Monnam(mtmp)} is getting more and more confused.`);
                    mtmp.mconf = 1;
                } else if (adtyp === AD_FIRE) {
                    let dmg = d(2, 6);
                    const orig_dmg = dmg;
                    const lev = u.ulevel | 0;

                    // C polyself.c:1717 You("attack %s with a fiery gaze!",
                    // mon_nam(mtmp)).
                    await You('attack %s with a fiery gaze!', mon_nam(mtmp));
                    if (resists_fire(mtmp)) {
                        await pline(`The fire doesn't burn ${mon_nam(mtmp)}!`);
                        dmg = 0;
                    }
                    if (lev > rn2(20)) {
                        dmg += await destroy_items(mtmp, AD_FIRE, orig_dmg);
                        await ignite_items(mtmp.minvent);
                    }
                    if (dmg) mtmp.mhp = (mtmp.mhp | 0) - dmg;
                    if ((mtmp.mhp | 0) < 1) await killed(mtmp);
                }
                /* For consistency with passive() in uhitm.c, this only
                 * affects you if the monster is still alive. */
                if ((mtmp.mhp | 0) < 1) continue;

                if (((mtmp.data?.mndx | 0) === PM_FLOATING_EYE) && !mtmp.mcan) {
                    // C youprop.h Free_action (mhitu.js/potion.js idiom).
                    const freeAction = !!(u.Free_action || u.HFree_action
                        || u.EFree_action);
                    if (!freeAction) {
                        // C polyself.c:1739 You("are frozen by %s gaze!",
                        // s_suffix(mon_nam(mtmp))).
                        await You('are frozen by %s gaze!', s_suffix(mon_nam(mtmp)));
                        nomul(((u.ulevel | 0) > 6 || rn2(4))
                            ? -d((mtmp.m_lev | 0) + 1,
                                (mtmp.data?.mattk?.[0]?.damd | 0))
                            : -200);
                        game.multi_reason = "frozen by a monster's gaze";
                        game.nomovemsg = 0;
                        return ECMD_TIME;
                    } else {
                        // C polyself.c:1749 You("stiffen momentarily under %s
                        // gaze.", s_suffix(mon_nam(mtmp))).
                        await You('stiffen momentarily under %s gaze.', s_suffix(mon_nam(mtmp)));
                    }
                }
                /* Technically this one shouldn't affect you at all because
                 * the Medusa gaze is an active monster attack that only
                 * works on the monster's turn, but for it to *not* have an
                 * effect would be too weird. */
                if (((mtmp.data?.mndx | 0) === PM_MEDUSA) && !mtmp.mcan) {
                    await pline(`Gazing at the awake ${l_monnam(mtmp)} is not a very good idea.`);
                    /* as if gazing at a sleeping anything is fruitful... */
                    await urgent_pline('You turn to stone...');
                    if (!game.killer) game.killer = { name: '', format: 0 };
                    game.killer.format = KILLED_BY;
                    game.killer.name = "deliberately meeting Medusa's gaze";
                    await done(STONING);
                }
            }
        }
    }
    if (!looked) await You('gaze at no place in particular.');
    return ECMD_TIME;
}

/**
 * C ref: polyself.c dospinweb `:1497–1621` — #monster spin-a-web while
 * poly'd, in C order: Levitation/terrain gate (is_pool_or_lava is
 * `dbridge.c:77–83`); uswallow arm (animal expels, whirly AT_ENGL
 * sweep, else dissolve); utrap gate; exercise DEX; trap arms
 * (pit/bury, squeaky, teleports vanish, WEB thicken, hole/door cover,
 * boulder jam, armed trigger via dotrap, default impossible); stairs
 * cop-out; maketrap WEB + madeby_u + feeltrap + shop damage.
 * add_damage rides a dynamic shk.js import (zap.js precedent, no new
 * static edge).
 * @returns {Promise<number>} ECMD_OK | ECMD_TIME
 */
export async function dospinweb() {
    const u = game.u || {};
    const x = u.ux, y = u.uy;
    const ttmp = t_at(x, y);
    /* disallow webs on water, lava, air & cloud */
    const rejectTerrain = is_pool(x, y) || is_lava(x, y)
        || IS_AIR(game.level?.at(x, y)?.typ);

    /* [at the time this was written, it was not possible to be both a
       webmaker and a flyer, but with the advent of amulet of flying that
       became a possibility; at present hero can spin a web while flying] */
    const levitation = !!(((u.HLevitation | 0) || (u.ELevitation | 0))
        && !((u.BLevitation | 0)));
    if (levitation || rejectTerrain) {
        // C polyself.c:1508 You("must be on %s ground to spin a web.",
        // reject_terrain ? "solid" : "the").
        await You('must be on %s ground to spin a web.', rejectTerrain ? 'solid' : 'the');
        return ECMD_OK;
    }
    if (u.uswallow) {
        // C polyself.c:1513 You("release web fluid inside %s.",
        // mon_nam(u.ustuck)).
        await You('release web fluid inside %s.', mon_nam(u.ustuck));
        if (is_animal(u.ustuck?.data)) {
            await expels(u.ustuck, u.ustuck?.data, true);
            return ECMD_OK;
        }
        if (is_whirly(u.ustuck?.data)) {
            const eattk = u.ustuck?.data?.mattk;
            let i = 0;
            for (; i < NATTK; i++)
                if ((eattk?.[i]?.aatyp | 0) === AT_ENGL) break;
            if (i === NATTK) {
                await impossible('Swallower has no engulfing attack?');
            } else {
                let sweep = '';
                switch ((eattk[i]?.adtyp | 0)) {
                case AD_FIRE:
                    sweep = 'ignites and ';
                    break;
                case AD_ELEC:
                    sweep = 'fries and ';
                    break;
                case AD_COLD:
                    sweep = 'freezes, shatters and ';
                    break;
                }
                await pline(`The web ${sweep}is swept away!`);
            }
            return ECMD_OK;
        } /* default: a nasty jelly-like creature */
        await pline(`The web dissolves into ${mon_nam(u.ustuck)}.`);
        return ECMD_OK;
    }
    if (u.utrap) {
        await You('cannot spin webs while stuck in a trap.');
        return ECMD_OK;
    }
    exercise(A_DEX, true);
    if (ttmp) {
        switch (ttmp.ttyp | 0) {
        case PIT:
        case SPIKED_PIT:
            await You('spin a web, covering up the pit.');
            deltrap(ttmp);
            await bury_objs(x, y);
            newsym(x, y);
            return ECMD_TIME;
        case SQKY_BOARD:
            await pline('The squeaky board is muffled.');
            deltrap(ttmp);
            newsym(x, y);
            return ECMD_TIME;
        case TELEP_TRAP:
        case LEVEL_TELEP:
        case MAGIC_PORTAL:
        case VIBRATING_SQUARE:
            await pline('Your webbing vanishes!');
            return ECMD_OK;
        case WEB:
            await You('make the web thicker.');
            return ECMD_TIME;
        case HOLE:
        case TRAPDOOR:
            // C polyself.c:1578 You("web over the %s.", TRAPDOOR?"trap door":"hole").
            await You('web over the %s.', (ttmp.ttyp | 0) === TRAPDOOR ? 'trap door' : 'hole');
            deltrap(ttmp);
            newsym(x, y);
            return ECMD_TIME;
        case ROLLING_BOULDER_TRAP:
            await You('spin a web, jamming the trigger.');
            deltrap(ttmp);
            newsym(x, y);
            return ECMD_TIME;
        case ARROW_TRAP:
        case DART_TRAP:
        case BEAR_TRAP:
        case ROCKTRAP:
        case FIRE_TRAP:
        case LANDMINE:
        case SLP_GAS_TRAP:
        case RUST_TRAP:
        case MAGIC_TRAP:
        case ANTI_MAGIC:
        case POLY_TRAP:
            await You('have triggered a trap!');
            await dotrap(ttmp, NO_TRAP_FLAGS);
            return ECMD_TIME;
        default:
            await impossible(`Webbing over trap type ${(ttmp.ttyp | 0)}?`);
            return ECMD_OK;
        }
    } else if (On_stairs(x, y)) {
        /* cop out: don't let them hide the stairs */
        await pline(`Your web fails to impede access to the ${(game.level?.at(x, y)?.typ | 0) === STAIRS ? 'stairs' : 'ladder'}.`);
        return ECMD_TIME;
    }
    const web = maketrap(x, y, WEB);
    if (web) {
        await You('spin a web.');
        web.madeby_u = 1;
        feeltrap(web);
        if (in_rooms(x, y, SHOPBASE)) {
            const { add_damage } = await import('./shk.js');
            add_damage(x, y, SHOP_WEB_COST);
        }
    }
    return ECMD_TIME;
}

/**
 * C ref: cmd.c domonability — #monster special ability while poly'd.
 * Envelope: hide/web prompt; breathe → spit → nymph → gaze → were →
 * hide → web → mindflayer → gremlin → unicorn → shriek → vampire →
 * steed → reflexive/normal.
 * Named omissions: steed breath via pet_ranged_attk (missing).
 * Deferred arms keep the old reflexive/normal fallthrough.
 * @returns {Promise<number>} ECMD_OK | ECMD_TIME
 */
export async function domonability() {
    const u = game.u || {};
    const uptr = game.youmonst?.data;
    const tail = async () => {
        if (Upolyd(u)) {
            await pline('Any special ability you may have is purely reflexive.');
        } else {
            await pline("You don't have a special ability in your normal form!");
        }
        return ECMD_OK;
    };
    // C: might_hide prompt rides before every arm
    const might_hide = is_hider(uptr) || hides_under(uptr);
    /* C: char c = '\0' — 0 is falsy so `c ? ... : ...` falls to the
       predicate arms. A JS '\0' string has length 1 (truthy) and would
       wrongly skip every c-gated arm, so the no-answer state is 0. */
    let c = 0;
    if (might_hide && webmaker(uptr)) {
        c = await yn_function('Hide [h] or spin a web [s]?',
            hidespinchars, 'q', true);
        if (c === 'q' || c === '\x1b') return ECMD_OK;
    }
    if (can_breathe(uptr)) {
        return dobreathe();
    } else if (attacktype(uptr, AT_SPIT)) {
        return dospit();
    } else if ((uptr?.mlet) === 'S_NYMPH') {
        return doremove();
    } else if (attacktype(uptr, AT_GAZE)) {
        return dogaze(); // C cmd.c:909
    } else if (is_were(uptr)) {
        return dosummon();
    } else if (c ? c === 'h' : might_hide) {
        return dohide();
    } else if (c ? c === 's' : webmaker(uptr)) {
        return dospinweb(); // C cmd.c:915
    } else if (is_mind_flayer(uptr)) {
        return domindblast();
    } else if ((u.umonnum | 0) === PM_GREMLIN) {
        if (IS_FOUNTAIN(game.level?.at(u.ux, u.uy)?.typ)) {
            if (await split_mon(game.youmonst, null)) {
                await dryup(u.ux, u.uy, true);
            }
        } else if (is_pool(u.ux, u.uy)) {
            /* is_pool: might be wearing water walking boots or amulet
               of magical breathing */
            await split_mon(game.youmonst, null);
        } else {
            await pline('There is no fountain here.');
        }
    } else if (is_unicorn(uptr)) {
        // C cmd.c: is_unicorn(uptr) → use_unicorn_horn(NULL) (D-1030)
        const { use_unicorn_horn } = await import('./apply.js');
        await use_unicorn_horn(null);
        return ECMD_TIME;
    } else if (((uptr?.msound) | 0) === MS_SHRIEK) {
        await pline('You shriek.');
        if (u.uburied) {
            await pline('Unfortunately sound does not carry well through rock.');
        } else {
            aggravate();
        }
    } else if (is_vampire(uptr) || is_vampshifter(game.youmonst)) {
        return dopoly();
    } else if (u.usteed && can_breathe(u.usteed?.data)) {
        return tail(); // steed breath via pet_ranged_attk deferred
    }
    return tail();
}
