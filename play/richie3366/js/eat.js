// eat.js — Eat command (getobj / doeat; fortune cookie + reqtime-1 food +
//           CORPSE eatcorpse / start_eating / eatfood occupation; TIN
//           start_tin / opentin / consume_tin; metallivore non-food).
// C ref: eat.c doeat / floorfood / touchfood / fprefx / eatcorpse /
//         start_eating / bite / eatfood / done_eating / lesshungry /
//         morehungry / vomit / obj_nutrition / is_edible / gethungry
//         (metabolic uhunger-- + accessorytime Regen/encumb/Hunger/Conflict);
//         doeat_nonfood / eatspecial / foodword;
//         start_tin / opentin / consume_tin / tin_variety / use_up_tin;
//         invent.c getobj; attrib.c poison_strdmg / gainstr;
//         potion.c make_vomiting / make_glib;
//         costly_tin → shk costly_alteration; use_tin_opener (D-0940).
// Named omissions: floorfood cockatrice-feel; floorfood sacrifice arm;
// hallu AD_STUN covered D-0943; corpse_intrinsic/givit covered D-0944;
// were*/mimic/attrcurse covered D-0945 (set_mimic_blocking /
// retouch_equipment / display_nhwindow WIN_MAP polish / livelog /
// eatmupdate hallu toggle);
// tainted Sick; make_blinded body / Hear_again afternmv;
// sellobj_state on invent-full dropy; costly_alteration COST_BITE;
// ?/* menu; multi-turn choke/newuhs messages; gethungry ring/amulet
// accessorytime + newuhs; losestr setuhpmax / terminal-frailty full
// death path; vomit cantvomit/Sick/FAINTING/acid-breath;
// Fixed_abil Popeye Olive/Bluto;
// livelog conduct; cprefx polymon stone-golem failure polish.
// D-0953: floorfood pool/lava reach + vault_gd_watching(GD_EATGOLD).
// D-0956: Ring_gone / float_up / rescham / choke(strangle) /
// set_mimic_blocking / perceives in eataccessory.

import { game } from './gstate.js';
import { rn2, rnd, rn1, d } from './rng.js';
import { flush_topl_more, pline, You_feel, newsym, see_monsters, more } from './display.js';
import { yn_function } from './getline.js';
import {
    FOOD_CLASS, COIN_CLASS, WEAPON_CLASS, BALL_CLASS, CHAIN_CLASS,
    SCROLL_CLASS, POTION_CLASS, RING_CLASS, AMULET_CLASS,
    objectNames, objects, objectDescrs,
} from './objects.js';
import {
    weight, splitobj, objects_at, delobj, stackobj,
    g_at, is_metallic, is_organic, is_flammable, is_rustprone,
    mksobj, obj_extract_self,
} from './mkobj.js';
import { BY_COOKIE, bcsign, outrumor } from './rumors.js';
import {
    singular, xname, doname, the, makeplural, obj_is_pname, thesimpleoname,
    an,
} from './objnam.js';
import {
    mons, acidic, poisonous, carnivorous, herbivorous, metallivorous,
    vegan, vegetarian, nohands, verysmall,
    is_rider, is_undead, olfaction, is_giant,
    can_teleport, control_teleport, telepathic,
    flesh_petrifies, slimeproof, your_race, poly_when_stoned,
    is_clinger, breathless, is_flyer,
    PM_LICHEN, PM_ACID_BLOB, PM_MONK, monsterNames, pmnames, G_UNIQ,
    MR_FIRE, MR_COLD, MR_SLEEP, MR_DISINT, MR_ELEC, MR_POISON, MR_ACID, MR_STONE,
    M1_SEE_INVIS, is_were,
} from './monsters.js';
import { same_race } from './mondata.js';
import { were_beastie, set_ulycn, you_unwere } from './were.js';
import { monflee } from './monmove.js';
import { dist2, rescham } from './mon.js';
import { set_occupation, can_reach_floor } from './engrave.js';
import {
    OBJ_FLOOR, OBJ_FREE, OBJ_INVENT,
    SLT_ENCUMBER, EXT_ENCUMBER, FROMFORM, W_ARTI, W_WEP, W_RINGL, W_RINGR,
    W_ARMOR, W_TOOL, W_AMUL, W_SADDLE, W_BALL, W_CHAIN,
    HUNGER, CONFLICT, REGENERATION, SLOW_DIGESTION, PROTECTION,
    SATIATED, NOT_HUNGRY, HUNGRY, WEAK, FAINTING,
    TIMEOUT, NON_PM, ROTTEN_TIN, HOMEMADE_TIN, SPINACH_TIN, HEALTHY_TIN,
    ismnum,
    KILLED_BY_AN, KILLED_BY, NO_KILLER_PREFIX, Has_contents, NO_PART,
    IRONBARS, W_NONDIGGABLE, BEAR_TRAP, TT_BEARTRAP,
    STONING, DIED, SLIMED, FROMOUTSIDE, Upolyd, NEUTRAL,
    COST_DSTROY, COST_OPEN, ECMD_OK, ECMD_TIME, ECMD_CANCEL,
    INTRINSIC, POLY_NOFLAGS, DISPLACED,
    FIRE_RES, COLD_RES, SLEEP_RES, DISINT_RES, SHOCK_RES, POISON_RES,
    ACID_RES, STONE_RES, TELEPAT, TELEPORT, TELEPORT_CONTROL, LAST_PROP,
    SEE_INVIS, INVIS, PROT_FROM_SHAPE_CHANGERS, LEVITATION, SLEEPY,
    M_AP_NOTHING, M_AP_OBJECT, DISMOUNT_FELL,
    WWALKING, MAGICAL_BREATHING, FLYING, GD_EATGOLD, Is_waterlevel,
    CHOKING, A_LAWFUL, STRANGLED,
} from './const.js';
import {
    adjattrib, gainstr, acurr, acurrstr, change_luck, exercise, adjalign,
    A_STR, A_DEX, A_CHA, A_WIS, A_INT, A_CON,
} from './attrib.js';
import { nomul, losehp, still_chewing, is_pool, is_lava } from './hack.js';
import { near_capacity, observe_object, makeknown, compactify_invlets,
    freeinv_core, encumber_msg } from './invent.js';
import {
    make_confused, make_vomiting, make_glib, make_stoned, make_slimed,
    make_stunned, make_hallucinated,
} from './potion.js';
import { addinv_nomerge } from './u_init.js';
import { dropy, dropx, make_blinded, revive_corpse } from './do.js';
import { type_is_pname, rndmonnam, pmname, Ugender } from './do_name.js';
import { ART_ORB_OF_DETECTION } from './generated/artifacts_data.js';
import { hands_obj } from './weapon.js';
import { t_at, deltrap, reset_utrap, b_trapped, self_invis_message, float_up } from './trap.js';
import { done, delayed_killer } from './end.js';
import { polymon, polyself, rehumanize, change_sex } from './polyself.js';
import { costly_alteration, costly_spot } from './shk.js';
import {
    wield_tool, uwepgone, uswapwepgone, uqwepgone,
} from './wield.js';
import { pluslvl } from './exper.js';
import { toggle_displacement, setworn, Ring_gone } from './do_wear.js';
import { attrcurse } from './sit.js';
import { dismount_steed } from './steed.js';
import { unpunish } from './read.js';
import { vault_gd_watching } from './vault.js';
import { set_mimic_blocking } from './vision.js';
import { PM_KNIGHT } from './generated/monsters_data.js';

/** C hack.h invlet_basic — a-zA-Z slots before invent-full dropy. */
const INVLET_BASIC = 52;

const FAKE_AMULET_OF_YENDOR = objectNames.indexOf('FAKE_AMULET_OF_YENDOR');
const MEAT_RING = objectNames.indexOf('MEAT_RING');
const RIN_SLOW_DIGESTION = objectNames.indexOf('RIN_SLOW_DIGESTION');
const RIN_PROTECTION = objectNames.indexOf('RIN_PROTECTION');
const BEARTRAP = objectNames.indexOf('BEARTRAP');
const GOLD_PIECE = objectNames.indexOf('GOLD_PIECE');
const ORANGE_OTYP = objectNames.indexOf('ORANGE');
const SCR_SCARE_MONSTER = objectNames.indexOf('SCR_SCARE_MONSTER');
const LEASH = objectNames.indexOf('LEASH');
const TRIDENT = objectNames.indexOf('TRIDENT');
const FLINT = objectNames.indexOf('FLINT');
const RIN_SEE_INVISIBLE = objectNames.indexOf('RIN_SEE_INVISIBLE');
const RIN_INVISIBILITY = objectNames.indexOf('RIN_INVISIBILITY');
const RIN_PROTECTION_FROM_SHAPE_CHAN =
    objectNames.indexOf('RIN_PROTECTION_FROM_SHAPE_CHAN');
const RIN_LEVITATION = objectNames.indexOf('RIN_LEVITATION');
const RIN_ADORNMENT = objectNames.indexOf('RIN_ADORNMENT');
const RIN_GAIN_STRENGTH = objectNames.indexOf('RIN_GAIN_STRENGTH');
const RIN_GAIN_CONSTITUTION = objectNames.indexOf('RIN_GAIN_CONSTITUTION');
const RIN_INCREASE_ACCURACY = objectNames.indexOf('RIN_INCREASE_ACCURACY');
const RIN_INCREASE_DAMAGE = objectNames.indexOf('RIN_INCREASE_DAMAGE');
const RIN_FREE_ACTION = objectNames.indexOf('RIN_FREE_ACTION');
const RIN_SUSTAIN_ABILITY = objectNames.indexOf('RIN_SUSTAIN_ABILITY');
const AMULET_OF_GUARDING = objectNames.indexOf('AMULET_OF_GUARDING');
const AMULET_OF_CHANGE = objectNames.indexOf('AMULET_OF_CHANGE');
const AMULET_OF_UNCHANGING = objectNames.indexOf('AMULET_OF_UNCHANGING');
const AMULET_OF_STRANGULATION = objectNames.indexOf('AMULET_OF_STRANGULATION');
const AMULET_OF_RESTFUL_SLEEP = objectNames.indexOf('AMULET_OF_RESTFUL_SLEEP');
const AMULET_OF_LIFE_SAVING = objectNames.indexOf('AMULET_OF_LIFE_SAVING');
const AMULET_OF_FLYING = objectNames.indexOf('AMULET_OF_FLYING');
const AMULET_OF_REFLECTION = objectNames.indexOf('AMULET_OF_REFLECTION');

/**
 * C ref: gy.youmonst.data via set_uasmon / invent.c basic assign.
 * Full set_uasmon (FROMFORM props) still deferred — diet predicates need
 * role/race form when youmonst is unset (same fallback as wield.js).
 */
function hero_form_data() {
    if (game.youmonst?.data) return game.youmonst.data;
    const mndx = game.u?.umonnum ?? game.urole?.mnum;
    return mons(mndx);
}

const FORTUNE_COOKIE = objectNames.indexOf('FORTUNE_COOKIE');
const SPRIG_OF_WOLFSBANE = objectNames.indexOf('SPRIG_OF_WOLFSBANE');
const APPLE = objectNames.indexOf('APPLE');
const PEAR = objectNames.indexOf('PEAR');
const LEMBAS_WAFER = objectNames.indexOf('LEMBAS_WAFER');
const CRAM_RATION = objectNames.indexOf('CRAM_RATION');
const FOOD_RATION = objectNames.indexOf('FOOD_RATION');
const TRIPE_RATION = objectNames.indexOf('TRIPE_RATION');
const K_RATION = objectNames.indexOf('K_RATION');
const C_RATION = objectNames.indexOf('C_RATION');
const CORPSE = objectNames.indexOf('CORPSE');
const TIN = objectNames.indexOf('TIN');
const CLOVE_OF_GARLIC = objectNames.indexOf('CLOVE_OF_GARLIC');
const TIN_OPENER = objectNames.indexOf('TIN_OPENER');
const DAGGER = objectNames.indexOf('DAGGER');
const SILVER_DAGGER = objectNames.indexOf('SILVER_DAGGER');
const ELVEN_DAGGER = objectNames.indexOf('ELVEN_DAGGER');
const ORCISH_DAGGER = objectNames.indexOf('ORCISH_DAGGER');
const ATHAME = objectNames.indexOf('ATHAME');
const KNIFE = objectNames.indexOf('KNIFE');
const STILETTO = objectNames.indexOf('STILETTO');
const CRYSKNIFE = objectNames.indexOf('CRYSKNIFE');
const PICK_AXE = objectNames.indexOf('PICK_AXE');
const AXE = objectNames.indexOf('AXE');
const PM_LIZARD = monsterNames.indexOf('PM_LIZARD');
const PM_GREEN_SLIME = monsterNames.indexOf('PM_GREEN_SLIME');
const PM_COCKATRICE = monsterNames.indexOf('PM_COCKATRICE');
const PM_CHICKATRICE = monsterNames.indexOf('PM_CHICKATRICE');
const PM_HIGH_CLERIC = monsterNames.indexOf('PM_HIGH_CLERIC');
const PM_LONG_WORM_TAIL = monsterNames.indexOf('PM_LONG_WORM_TAIL');
const PM_WIZARD_OF_YENDOR = monsterNames.indexOf('PM_WIZARD_OF_YENDOR');
const PM_FLOATING_EYE = monsterNames.indexOf('PM_FLOATING_EYE');
const PM_RAVEN = monsterNames.indexOf('PM_RAVEN');
const PM_NEWT = monsterNames.indexOf('PM_NEWT');
const PM_KILLER_BEE = monsterNames.indexOf('PM_KILLER_BEE');
const PM_SCORPION = monsterNames.indexOf('PM_SCORPION');
const PM_FIRE_ELEMENTAL = monsterNames.indexOf('PM_FIRE_ELEMENTAL');
const PM_RUST_MONSTER = monsterNames.indexOf('PM_RUST_MONSTER');
const PM_GHOUL = monsterNames.indexOf('PM_GHOUL');
const PM_GELATINOUS_CUBE = monsterNames.indexOf('PM_GELATINOUS_CUBE');
const PM_LITTLE_DOG = monsterNames.indexOf('PM_LITTLE_DOG');
const PM_DOG = monsterNames.indexOf('PM_DOG');
const PM_LARGE_DOG = monsterNames.indexOf('PM_LARGE_DOG');
const PM_KITTEN = monsterNames.indexOf('PM_KITTEN');
const PM_HOUSECAT = monsterNames.indexOf('PM_HOUSECAT');
const PM_LARGE_CAT = monsterNames.indexOf('PM_LARGE_CAT');
const PM_DEATH = monsterNames.indexOf('PM_DEATH');
const PM_PESTILENCE = monsterNames.indexOf('PM_PESTILENCE');
const PM_FAMINE = monsterNames.indexOf('PM_FAMINE');
const PM_STONE_GOLEM = monsterNames.indexOf('PM_STONE_GOLEM');
const PM_CAVE_DWELLER = monsterNames.indexOf('PM_CAVE_DWELLER');
const PM_ORC = monsterNames.indexOf('PM_ORC');
const PM_WRAITH = monsterNames.indexOf('PM_WRAITH');
const PM_HUMAN_WERERAT = monsterNames.indexOf('PM_HUMAN_WERERAT');
const PM_HUMAN_WEREJACKAL = monsterNames.indexOf('PM_HUMAN_WEREJACKAL');
const PM_HUMAN_WEREWOLF = monsterNames.indexOf('PM_HUMAN_WEREWOLF');
const PM_WERERAT = monsterNames.indexOf('PM_WERERAT');
const PM_WEREJACKAL = monsterNames.indexOf('PM_WEREJACKAL');
const PM_WEREWOLF = monsterNames.indexOf('PM_WEREWOLF');
const PM_NURSE = monsterNames.indexOf('PM_NURSE');
const PM_STALKER = monsterNames.indexOf('PM_STALKER');
const PM_YELLOW_LIGHT = monsterNames.indexOf('PM_YELLOW_LIGHT');
const PM_GIANT_BAT = monsterNames.indexOf('PM_GIANT_BAT');
const PM_BAT = monsterNames.indexOf('PM_BAT');
const PM_GIANT_MIMIC = monsterNames.indexOf('PM_GIANT_MIMIC');
const PM_LARGE_MIMIC = monsterNames.indexOf('PM_LARGE_MIMIC');
const PM_SMALL_MIMIC = monsterNames.indexOf('PM_SMALL_MIMIC');
const PM_QUANTUM_MECHANIC = monsterNames.indexOf('PM_QUANTUM_MECHANIC');
const PM_CHAMELEON = monsterNames.indexOf('PM_CHAMELEON');
const PM_DOPPELGANGER = monsterNames.indexOf('PM_DOPPELGANGER');
const PM_SANDESTIN = monsterNames.indexOf('PM_SANDESTIN');
const PM_GENETIC_ENGINEER = monsterNames.indexOf('PM_GENETIC_ENGINEER');
const PM_DISPLACER_BEAST = monsterNames.indexOf('PM_DISPLACER_BEAST');
const PM_DISENCHANTER = monsterNames.indexOf('PM_DISENCHANTER');
const PM_MIND_FLAYER = monsterNames.indexOf('PM_MIND_FLAYER');
const PM_MASTER_MIND_FLAYER = monsterNames.indexOf('PM_MASTER_MIND_FLAYER');
const PM_VIOLET_FUNGUS = monsterNames.indexOf('PM_VIOLET_FUNGUS');
const EGG = objectNames.indexOf('EGG');
/* C monattk.h — stun / hallucination damage types for cpostfx hallu. */
const AD_STUN = 12;
const AD_HALU = 36;

/** C: eat.c CANNIBAL_ALLOWED — Cave Dweller or orc race. */
function CANNIBAL_ALLOWED() {
    const role = game.urole?.mnum | 0;
    const race = game.urace?.mnum | 0;
    return role === PM_CAVE_DWELLER || race === PM_ORC;
}

/** C objclass.h material enum indices used by foodword / doeat_nonfood. */
const MAT_WAX = 2;
const MAT_PAPER = 5;
const MAT_LEATHER = 7;
const MAT_BONE = 9;
const MAT_DRAGON_HIDE = 10;

/**
 * C ref: eat.c foodwords[] — index by oc_material (objclass.h order).
 */
const foodwords = [
    'meal', 'liquid', 'wax', 'food', 'meat', 'paper',
    'cloth', 'leather', 'wood', 'bone', 'scale', 'metal',
    'metal', 'metal', 'silver', 'gold', 'platinum', 'mithril',
    'plastic', 'glass', 'rich food', 'stone',
];

/** C ref: eat.c foodword — material word; coins → "gold". */
function foodword(otmp) {
    if (!otmp) return 'meal';
    if (otmp.oclass === COIN_CLASS) return 'gold';
    const mat = game.objects?.[otmp.otyp]?.oc_material ?? 0;
    return foodwords[mat] ?? 'meal';
}

/**
 * C ref: eat.c tintxts[] — tin variety adjectives + nutrition / flags.
 * TTSZ includes trailing empty sentinel.
 */
const tintxts = [
    { txt: 'rotten', nut: -50, fodder: 0, greasy: 0 },
    { txt: 'homemade', nut: 50, fodder: 1, greasy: 0 },
    { txt: 'soup made from', nut: 20, fodder: 1, greasy: 0 },
    { txt: 'french fried', nut: 40, fodder: 0, greasy: 1 },
    { txt: 'pickled', nut: 40, fodder: 1, greasy: 0 },
    { txt: 'boiled', nut: 50, fodder: 1, greasy: 0 },
    { txt: 'smoked', nut: 50, fodder: 1, greasy: 0 },
    { txt: 'dried', nut: 55, fodder: 1, greasy: 0 },
    { txt: 'deep fried', nut: 60, fodder: 0, greasy: 1 },
    { txt: 'szechuan', nut: 70, fodder: 1, greasy: 0 },
    { txt: 'broiled', nut: 80, fodder: 0, greasy: 0 },
    { txt: 'stir fried', nut: 80, fodder: 0, greasy: 1 },
    { txt: 'sauteed', nut: 95, fodder: 0, greasy: 0 },
    { txt: 'candied', nut: 100, fodder: 1, greasy: 0 },
    { txt: 'pureed', nut: 500, fodder: 1, greasy: 0 },
    { txt: '', nut: 0, fodder: 0, greasy: 0 },
];
const TTSZ = tintxts.length;
// C ref: monattk.h AT_MAGC
const AT_MAGC = 255;

/**
 * C ref: mondata.h attacktype — true if any mattk slot has aatyp.
 * Local copy to avoid makemon export / import cycles.
 */
function attacktype(ptr, aatyp) {
    const slots = ptr?.mattk;
    if (!slots) return false;
    for (let i = 0; i < slots.length; i++) {
        if (slots[i]?.aatyp === aatyp) return true;
    }
    return false;
}

/** C ref: mondata.h dmgtype — true if any mattk slot has adtyp. */
function dmgtype(ptr, adtyp) {
    const slots = ptr?.mattk;
    if (!slots) return false;
    for (let i = 0; i < slots.length; i++) {
        if (slots[i]?.adtyp === adtyp) return true;
    }
    return false;
}

/** C timeout.h set_itimeout — replace TIMEOUT bits on a long prop. */
function set_itimeout_prop(u, key, val) {
    u[key] = ((u[key] | 0) & ~TIMEOUT) | ((val | 0) & TIMEOUT);
}

/** C timeout.h incr_itimeout — add to TIMEOUT bits. */
function incr_itimeout_prop(u, key, incr) {
    const cur = (u[key] | 0) & TIMEOUT;
    u[key] = ((u[key] | 0) & ~TIMEOUT) | ((cur + (incr | 0)) & TIMEOUT);
}

/**
 * C objects.h FOOD nutrition — extractor omits oc_nutrition (named omission).
 * Only otyps exercised by the reqtime-1 / cookie path need entries here.
 */
const FOOD_NUTRITION = {
    FORTUNE_COOKIE: 40,
    APPLE: 50,
    PEAR: 50,
    ORANGE: 80,
    MELON: 100,
    BANANA: 80,
    CARROT: 50,
    FOOD_RATION: 800,
    TRIPE_RATION: 200,
    LEMBAS_WAFER: 800,
    CRAM_RATION: 600,
    K_RATION: 400,
    C_RATION: 300,
    EGG: 80,
    CLOVE_OF_GARLIC: 40,
    SPRIG_OF_WOLFSBANE: 40,
    EUCALYPTUS_LEAF: 1,
    CANDY_BAR: 100,
    CREAM_PIE: 100,
    PANCAKE: 200,
    SLIME_MOLD: 250,
    LUMP_OF_ROYAL_JELLY: 200,
};

/**
 * C ref: trap.c unconscious — multi < 0 and (usleep or wake-msg prefixes).
 */
function unconscious() {
    if ((game.multi || 0) >= 0) return false;
    const u = game.u || {};
    if (u.usleep) return true;
    const msg = game.nomovemsg || '';
    return msg.startsWith('You awake')
        || msg.startsWith('You regain con')
        || msg.startsWith('You are consci');
}

/**
 * C ref: youprop.h Unaware — multi < 0 && (unconscious || fainted).
 * Fainted (uhs == FAINTED) deferred as always-false until newuhs ports it.
 */
function Unaware() {
    return (game.multi || 0) < 0 && unconscious();
}

/** C ref: youprop.h Slow_digestion */
function Slow_digestion() {
    const u = game.u || {};
    if (u.HSlow_digestion || u.ESlow_digestion) return true;
    const prop = u.uprops?.[SLOW_DIGESTION];
    return !!(prop?.intrinsic || prop?.extrinsic);
}

/** C ref: youprop.h Hunger */
function Hunger() {
    const u = game.u || {};
    if (u.HHunger || u.EHunger) return true;
    const prop = u.uprops?.[HUNGER];
    return !!(prop?.intrinsic || prop?.extrinsic);
}

/**
 * C ref: eat.c init_uhunger — 900 / NOT_HUNGRY; botl if was hungry or
 * ATEMP(A_STR)<0; clear that temp STR loss then encumber_msg.
 */
export async function init_uhunger() {
    const u = game.u;
    if (!u) return;
    if (!u.atemp) u.atemp = { a: [0, 0, 0, 0, 0, 0] };
    const strTemp = u.atemp.a[A_STR] | 0;
    // C: disp.botl = (u.uhs != NOT_HUNGRY || ATEMP(A_STR) < 0);
    const botl = ((u.uhs ?? NOT_HUNGRY) !== NOT_HUNGRY) || strTemp < 0;
    if (game.flags) game.flags.botl = botl;
    if (game.disp) game.disp.botl = botl;
    u.uhunger = 900;
    u.uhs = NOT_HUNGRY;
    if (strTemp < 0) {
        u.atemp.a[A_STR] = 0;
        await encumber_msg();
    }
}

/**
 * C ref: eat.c newuhs — recompute u.uhs from uhunger thresholds.
 * Field update only this iteration: occupation force_save_hs, hunger
 * messages, end_running, ATEMP WEAK crossover, faint/starve deferred.
 * @param {boolean} _incr true when called from metabolism (message tone)
 */
export function newuhs(_incr) {
    const u = game.u;
    if (!u) return;
    const h = u.uhunger ?? 900;
    const newhs = (h > 1000)
        ? SATIATED
        : (h > 150) ? NOT_HUNGRY
            : (h > 50) ? HUNGRY : (h > 0) ? WEAK : FAINTING;
    if (newhs !== (u.uhs ?? NOT_HUNGRY)) {
        if (game.flags) game.flags.botl = true;
    }
    u.uhs = newhs;
    void _incr;
}

/**
 * C ref: eat.c gethungry — metabolic uhunger--, accessorytime burns, newuhs.
 * Branch envelope: ordinary diet burn; odd Regen/encumb; even Hunger/
 * Conflict + ring/amulet accessorytime cases 0/4/8/12/16.
 * Named omissions: newuhs messages / faint / ATEMP; +0 RIN_PROTECTION
 * dual-ring MC polish when EProtection unset; meat-ring edge cases.
 */
export function gethungry() {
    if (game.u?.uinvulnerable) return;
    const u = game.u;

    // C: (!Unaware || !rn2(10)) && eats && !Slow_digestion → uhunger--
    // rn2(10) only when Unaware (|| short-circuit).
    const metabolic_tick = !Unaware() || !rn2(10);
    if (metabolic_tick) {
        const youData = hero_form_data();
        if ((carnivorous(youData) || herbivorous(youData)
                || metallivorous(youData))
            && !Slow_digestion()) {
            u.uhunger = (u.uhunger ?? 900) - 1;
        }
    }

    const accessorytime = rn2(20);
    if (accessorytime % 2) {
        // odd — Regeneration / encumbrance
        const HRegen = (u.HRegeneration | 0)
            || (u.uprops?.[REGENERATION]?.intrinsic | 0);
        const ERegen = (u.ERegeneration | 0)
            || (u.uprops?.[REGENERATION]?.extrinsic | 0);
        if ((HRegen & ~FROMFORM) || (ERegen & ~(W_ARTI | W_WEP))) {
            u.uhunger = (u.uhunger ?? 900) - 1;
        }
        if (near_capacity() > SLT_ENCUMBER) {
            u.uhunger = (u.uhunger ?? 900) - 1;
        }
    } else {
        // even — Hunger / Conflict + ring/amulet cases
        if (Hunger()) {
            u.uhunger = (u.uhunger ?? 900) - 1;
        }
        const HConf = (u.HConflict | 0)
            || (u.uprops?.[CONFLICT]?.intrinsic | 0);
        const EConf = (u.EConflict | 0)
            || (u.uprops?.[CONFLICT]?.extrinsic | 0);
        if (HConf || (EConf & ~W_ARTI)) {
            u.uhunger = (u.uhunger ?? 900) - 1;
        }
        // C: switch (accessorytime) even cases 0/4/8/12/16
        const uleft = u.uleft;
        const uright = u.uright;
        const uamul = u.uamul;
        const objs = objects();
        const EProt = (u.EProtection | 0)
            || (u.uprops?.[PROTECTION]?.extrinsic | 0);
        switch (accessorytime) {
        case 0:
            // Slow_digestion from non-ring source (e.g. white DSM) burns
            if (Slow_digestion()
                && (!uright || uright.otyp !== RIN_SLOW_DIGESTION)
                && (!uleft || uleft.otyp !== RIN_SLOW_DIGESTION)) {
                u.uhunger = (u.uhunger ?? 900) - 1;
            }
            break;
        case 4:
            if (uleft && uleft.otyp !== MEAT_RING
                && ((uleft.spe | 0)
                    || !objs?.[uleft.otyp]?.oc_charged
                    || (uleft.otyp === RIN_PROTECTION
                        && ((EProt & ~W_RINGL) === 0
                            || ((EProt & ~W_RINGL) === W_RINGR
                                && uright && uright.otyp === RIN_PROTECTION
                                && !(uright.spe | 0)))))) {
                u.uhunger = (u.uhunger ?? 900) - 1;
            }
            break;
        case 8:
            if (uamul && uamul.otyp !== FAKE_AMULET_OF_YENDOR) {
                u.uhunger = (u.uhunger ?? 900) - 1;
            }
            break;
        case 12:
            if (uright && uright.otyp !== MEAT_RING
                && ((uright.spe | 0)
                    || !objs?.[uright.otyp]?.oc_charged
                    || (uright.otyp === RIN_PROTECTION
                        && (EProt & ~W_RINGR) === 0))) {
                u.uhunger = (u.uhunger ?? 900) - 1;
            }
            break;
        case 16:
            if (u.uhave?.amulet || u.uhave_amulet) {
                u.uhunger = (u.uhunger ?? 900) - 1;
            }
            break;
        default:
            break;
        }
    }
    newuhs(true);
}

/**
 * C ref: eat.c morehungry — nutrition loss after feats of magic / vomit.
 * newuhs field update; hunger messages / faint deferred.
 */
export function morehungry(num) {
    if (!game.u) return;
    game.u.uhunger = (game.u.uhunger ?? 900) - (num | 0);
    newuhs(true);
}

/**
 * C ref: eat.c vomit — side effects of vomiting (fountain foul water, etc.).
 * Branch envelope: nomul(-2) when multi >= -2 + You_can_move_again.
 * Named omissions: cantvomit jaw-gape; Sick SICK_VOMITABLE cure; FAINTING
 * dry-heave message; yellow-dragon AT_BREA AD_ACID spew (RNG when poly).
 */
export function vomit() {
    // cantvomit / Sick / uhs FAINTING / acid-breath deferred
    if ((game.multi || 0) >= -2) {
        nomul(-2);
        game.multi_reason = 'vomiting';
        game.nomovemsg = 'You can move again.';
    }
}

/**
 * C ref: eat.c lesshungry — uhunger += num; choke/fullwarn deferred;
 * field-only newuhs(FALSE).
 */
export function lesshungry(num) {
    if (!game.u) return;
    game.u.uhunger = (game.u.uhunger ?? 900) + (num | 0);
    newuhs(false);
}

/**
 * C ref: eat.c obj_nutrition — CORPSE uses mons[].cnutrit; FOOD oc_nutrition.
 */
function obj_nutrition(otmp) {
    if (!otmp) return 0;
    if (otmp.otyp === CORPSE) {
        return mons(otmp.corpsenm)?.cnutrit ?? 0;
    }
    if (otmp.globby) return otmp.owt | 0;
    const oc = game.objects?.[otmp.otyp];
    if (oc?.oc_nutrition != null) return oc.oc_nutrition | 0;
    const name = objectNames[otmp.otyp];
    return FOOD_NUTRITION[name] ?? 0;
}

/** C ref: eat.c nonrotting_food */
function nonrotting_food(otyp) {
    return otyp === LEMBAS_WAFER || otyp === CRAM_RATION;
}

/** C ref: eat.c nonrotting_corpse macro */
function nonrotting_corpse(mnum) {
    if (mnum === PM_LIZARD || mnum === PM_LICHEN || mnum === PM_ACID_BLOB) {
        return true;
    }
    return is_rider(mons(mnum));
}

/** C hack.c rounddiv — same as weapon.js */
function rounddiv(x, y) {
    if (!y) return 0;
    let divsgn = 1;
    let yy = y | 0;
    let xx = x | 0;
    if (yy < 0) { divsgn = -divsgn; yy = -yy; }
    if (xx < 0) { divsgn = -divsgn; xx = -xx; }
    let r = Math.trunc(xx / yy);
    const m = xx % yy;
    if (2 * m >= yy) r++;
    return divsgn * r;
}

/** C ref: mkobj.c peek_at_iced_corpse_age — non-ice returns otmp.age */
function peek_at_iced_corpse_age(otmp) {
    // on_ice ROT_ICE_ADJUSTMENT deferred
    return otmp?.age ?? 0;
}

/**
 * C ref: eat.c food_xname — CORPSE → "[the ]newt corpse".
 */
function food_xname(food, the_pfx) {
    if (!food) return 'food';
    if (food.otyp === CORPSE) {
        const neut = pmnames[food.corpsenm]?.[2] || 'creature';
        const base = `${neut} corpse`;
        return the_pfx ? `the ${base}` : base;
    }
    const base = singular(food, xname);
    return the_pfx ? `the ${base}` : base;
}

/** C ref: eat.c violated_vegetarian — Monk feels guilty + adjalign(-1). */
function violated_vegetarian() {
    if (!game.u.uconduct) game.u.uconduct = {};
    game.u.uconduct.unvegetarian = (game.u.uconduct.unvegetarian | 0) + 1;
    if ((game.urole?.mnum ?? -1) === PM_MONK) {
        // pline deferred to call site when async; sync bump for align
        if (!game.u.ualign) game.u.ualign = { type: 0, record: 0 };
        game.u.ualign.record = (game.u.ualign.record | 0) - 1;
        return true;
    }
    return false;
}

/** C ref: eat.c consume_oeaten — amt>0 → >>= amt; amt<0 → += amt (floor 1). */
function consume_oeaten(obj, amt) {
    if (!obj) return;
    if (!obj_nutrition(obj)) {
        obj.oeaten = 0;
        return;
    }
    if (amt > 0) {
        obj.oeaten = (obj.oeaten | 0) >> amt;
    } else if ((obj.oeaten | 0) > -amt) {
        obj.oeaten = (obj.oeaten | 0) + amt;
    } else {
        obj.oeaten = 0;
    }
    if ((obj.oeaten | 0) === 0) obj.oeaten = 1;
}

/**
 * C ref: eat.c is_edible — unique protect + poly diet predicates + FOOD.
 * Branch envelope: fire-elemental flammable; metallivore metallic
 * (rust monster → rustprone only); ghoul corpse/egg; gel cube organic
 * without contents; else FOOD_CLASS.
 */
function is_edible(obj) {
    if (!obj) return false;
    const oc = game.objects?.[obj.otyp];
    if (oc?.oc_unique) return false;

    const form = hero_form_data();
    const fmndx = form?.mndx ?? -1;
    const umon = game.u?.umonnum ?? -1;

    if (fmndx === PM_FIRE_ELEMENTAL && is_flammable(obj)) return true;

    if (metallivorous(form) && is_metallic(obj)
        && (fmndx !== PM_RUST_MONSTER || is_rustprone(obj))) {
        return true;
    }

    if (umon === PM_GHOUL) {
        return (obj.otyp === CORPSE && !vegan(mons(obj.corpsenm)))
            || obj.otyp === EGG;
    }

    if (umon === PM_GELATINOUS_CUBE && is_organic(obj) && !Has_contents(obj)) {
        return true;
    }

    return obj.oclass === FOOD_CLASS;
}

/** Build getobj allow-string of edible inventory letters (e.g. "b-g"). */
function edible_lets() {
    const inv = game.invent || [];
    const lets = [];
    for (const o of inv) {
        if (is_edible(o) && o.invlet) lets.push(o.invlet);
    }
    lets.sort();
    if (!lets.length) return '';
    // Compact consecutive runs: b,c,d,e,f,g → b-g
    // C invent.c compactify uses dashes for runs of 3+; short runs stay literal.
    // seed1800 C shows "bcdef" (no dash) — emit uncompacted for ≤5 letters.
    if (lets.length <= 5) return lets.join('');
    let out = lets[0];
    let runStart = lets[0];
    let prev = lets[0];
    for (let i = 1; i < lets.length; i++) {
        const ch = lets[i];
        if (ch.charCodeAt(0) === prev.charCodeAt(0) + 1) {
            prev = ch;
            continue;
        }
        if (prev !== runStart) {
            out += prev === String.fromCharCode(runStart.charCodeAt(0) + 1)
                ? prev
                : `-${prev}`;
        }
        out += ch;
        runStart = prev = ch;
    }
    if (prev !== runStart) {
        out += prev === String.fromCharCode(runStart.charCodeAt(0) + 1)
            ? prev
            : `-${prev}`;
    }
    return out;
}

/**
 * C ref: invent.c getobj("eat", is_edible) — yn_function free-letter loop;
 * missing letter → You("don't have that object.") + continue (next
 * yn_function flushes NEED_MORE → --More--). Empty SUGGEST → early
 * "don't have anything to eat."
 */
async function getobj_eat() {
    for (;;) {
        await flush_topl_more();
        const lets = edible_lets();
        if (!lets) {
            await pline("You don't have anything to eat.");
            return null;
        }
        // C: yn_function(qbuf, NULL, '\0') — any char; leave prompt on line
        const query = `What do you want to eat? [${lets} or ?*]`;
        const ch = await yn_function(query, null, '\0');

        // quitchars: space, Esc, etc.
        if (ch === '\x1b' || ch === ' ' || ch === '\n' || ch === '\r') {
            if (game.flags?.verbose !== false) await pline('Never mind.');
            return null;
        }
        if (ch === '?' || ch === '*') {
            // Menu path deferred
            await pline('Never mind.');
            return null;
        }

        const otmp = (game.invent || []).find(o => o.invlet === ch);
        if (!otmp) {
            // C: You("don't have that object."); continue;
            await pline("You don't have that object.");
            continue;
        }
        return otmp;
    }
}

/**
 * C ref: dbridge.c is_pool_or_lava — drawbridge-under deferred.
 * @param {number} x
 * @param {number} y
 */
function is_pool_or_lava(x, y) {
    return is_pool(x, y) || is_lava(x, y);
}

/** C ref: youprop.h Wwalking — (H||E) && !waterlevel. */
function Wwalking() {
    const u = game.u || {};
    const prop = u.uprops?.[WWALKING];
    const bits = (prop?.intrinsic | 0) || (prop?.extrinsic | 0)
        || (u.HWwalking | 0) || (u.EWwalking | 0);
    return !!(bits && !Is_waterlevel(u.uz));
}

/**
 * C ref: youprop.h Flying — (H||E||steed-flyer) && !B.
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

/** C ref: youprop.h Breathless — magical breathing || breathless(form). */
function Breathless() {
    const u = game.u || {};
    const prop = u.uprops?.[MAGICAL_BREATHING];
    if ((prop?.intrinsic | 0) || (prop?.extrinsic | 0)
        || (u.HMagical_breathing | 0) || (u.EMagical_breathing | 0)) {
        return true;
    }
    return breathless(hero_form_data());
}

/**
 * C ref: eat.c floorfood("eat", 0) — yn floor edibles, else invent getobj.
 * Branch envelope: can_reach_floor / !usteed / !menu_requested /
 * pool-lava+(Wwalking|clinger|(Flying&&!Breathless)) skip to invent;
 * metallivore beartrap + IRONBARS + floor gold ynq; edible floor
 * FOOD (non-coin) ynq; invent getobj_eat.
 * Named omissions: will_feel_cockatrice;
 * safe_qbuf ansimpleoname fallback; getobj_else "else" wording;
 * sacrifice corpsecheck arm (tin: D-1027 floorfood("tin", 2)).
 */
async function floorfood_eat() {
    const u = game.u || {};
    const ux = u.ux | 0;
    const uy = u.uy | 0;
    const form = hero_form_data();
    // C: menu_requested || !can_reach_floor || usteed ||
    //    (pool/lava && (Wwalking || clinger || (Flying && !Breathless)))
    //    → skipfloor
    const skip_floor = !!(game.flags?.menu_requested
        || !can_reach_floor(true)
        || u.usteed
        || (is_pool_or_lava(ux, uy)
            && (Wwalking() || is_clinger(form)
                || (Flying() && !Breathless()))));
    if (!skip_floor) {
        // C: feeding && metallivorous — beartrap, bars, then gold
        if (metallivorous(form)) {
            const ttmp = t_at(ux, uy);
            if (ttmp && ttmp.tseen && (ttmp.ttyp | 0) === BEAR_TRAP) {
                const u_in_beartrap = !!(u.utrap
                    && (u.utraptype | 0) === TT_BEARTRAP);
                const qbuf = `There is a bear trap here (${
                    u_in_beartrap ? 'holding you' : 'armed'
                }); eat it?`;
                const c = await yn_function(qbuf, 'ynq', 'n');
                if (c === 'y') {
                    deltrap(ttmp);
                    if (u_in_beartrap) reset_utrap(true);
                    const beartrap = mksobj(BEARTRAP, true, false);
                    const msg = `You only manage to ${
                        u_in_beartrap ? 'free yourself from' : 'disarm'
                    } the bear trap.`;
                    if (near_capacity() >= EXT_ENCUMBER && beartrap) {
                        await pline(msg);
                        obj_extract_self(beartrap);
                        await dropy(beartrap);
                        return null;
                    }
                    return beartrap;
                }
                if (c === 'q') return null;
                // 'n' → getobj_else++; continue metallivore arms
            }
            const loc = game.level?.at(ux, uy);
            if (loc && loc.typ === IRONBARS) {
                const wi = (loc.wall_info | 0) | (loc.flags | 0);
                const nodig = (wi & W_NONDIGGABLE) !== 0;
                let c = 'n';
                let qbuf = 'There are iron bars here';
                if (nodig || (u.uhunger | 0) > 1500) {
                    await pline(
                        `${qbuf} but you ${
                            nodig ? 'cannot' : 'are too full to'
                        } eat them.`,
                    );
                } else {
                    const dig = game.context?.digging;
                    const resume = !!(dig?.chew
                        && (dig.pos?.x | 0) === ux
                        && (dig.pos?.y | 0) === uy
                        && dig.level
                        && (dig.level.dnum | 0) === (u.uz?.dnum | 0)
                        && (dig.level.dlevel | 0) === (u.uz?.dlevel | 0));
                    qbuf += resume
                        ? '; resume eating them?'
                        : '; eat them?';
                    c = await yn_function(qbuf, 'ynq', 'n');
                }
                if (c === 'y') return hands_obj;
                if (c === 'q') return null;
            }
            if ((form?.mndx ?? -1) !== PM_RUST_MONSTER) {
                const gold = g_at(ux, uy);
                if (gold) {
                    const quan = gold.quan || 1;
                    const qbuf = quan === 1
                        ? 'There is 1 gold piece here; eat it?'
                        : `There are ${quan} gold pieces here; eat them?`;
                    const c = await yn_function(qbuf, 'ynq', 'n');
                    if (c === 'y') return gold;
                    if (c === 'q') return null;
                }
            }
        }
        for (let otmp = objects_at(ux, uy); otmp; otmp = otmp.nexthere) {
            if (otmp.oclass === COIN_CLASS || !is_edible(otmp)) continue;
            // will_feel_cockatrice deferred
            const one = (otmp.quan || 1) === 1;
            // C: "There is <doname> here; eat it?" (otense + safe_qbuf)
            const qbuf = `There ${one ? 'is' : 'are'} ${doname(otmp)} here; eat ${one ? 'it' : 'one'}?`;
            const c = await yn_function(qbuf, 'ynq', 'n');
            if (c === 'y') return otmp;
            if (c === 'q') return null;
            // 'n' → try next floor edible / fall through to invent
        }
    }
    return getobj_eat();
}

/**
 * C ref: invent.c useup / useupf — consume one; invent or floor.
 * Floor path matches useupf(obj,1): maybe splitobj then delobj →
 * obj_resists(0,0) always rolls rn2(100). Invent useup never rolls.
 *
 * Detect floor via where===OBJ_FLOOR or presence on the floor pile —
 * invent-split children may copy where or be OBJ_FREE without addinv
 * (touchfood freeinv/addinv_nomerge still deferred).
 */
export function useup(otmp) {
    if (!otmp) return;
    const inInvent = otmp.where === OBJ_INVENT
        || (game.invent || []).includes(otmp);
    let onFloor = otmp.where === OBJ_FLOOR;
    if (!onFloor && !inInvent && otmp.ox != null && otmp.oy != null) {
        for (let o = objects_at(otmp.ox, otmp.oy); o; o = o.nexthere) {
            if (o === otmp) { onFloor = true; break; }
        }
    }
    if (!onFloor) {
        // Invent / free invent-child: invent.c useup — no obj_resists
        if ((otmp.quan || 1) > 1) {
            otmp.quan--;
            otmp.owt = weight(otmp);
            return;
        }
        freeinv_core(otmp);
        const inv = game.invent || [];
        const idx = inv.indexOf(otmp);
        if (idx >= 0) inv.splice(idx, 1);
        otmp.quan = 0;
        otmp.where = OBJ_FREE;
        return;
    }
    // Floor: invent.c useupf(otmp, 1L)
    let victim = otmp;
    if ((otmp.quan || 1) > 1) {
        victim = splitobj(otmp, 1) || otmp;
    }
    delobj(victim);
}

/**
 * C invent.c freeinv subset — splice from game.invent[]; clear nobj link.
 */
function freeinv_touchfood(obj) {
    if (!obj) return;
    const inv = game.invent || [];
    const idx = inv.indexOf(obj);
    if (idx >= 0) inv.splice(idx, 1);
    for (const o of inv) {
        if (o.nobj === obj) o.nobj = obj.nobj || null;
    }
    obj.nobj = null;
    obj.pickup_prev = 0;
    obj.where = OBJ_FREE;
}

/**
 * C ref: eat.c touchfood — split stack, set oeaten, freeinv+addinv_nomerge
 * so a bitten piece gets its own invent slot (steal weight / invlet).
 * Named omit: costly_alteration COST_BITE; sellobj_state around invent-full
 * dropy; OBJ_DELETED after drop.
 */
async function touchfood(otmp) {
    if ((otmp.quan || 1) > 1) {
        // C: floor → splitobj(otmp, quan-1); carried → otmp = splitobj(otmp, 1)
        const carried = otmp.where === OBJ_INVENT
            || (game.invent || []).includes(otmp);
        if (!carried) {
            splitobj(otmp, (otmp.quan | 0) - 1);
        } else {
            const child = splitobj(otmp, 1);
            if (child) otmp = child;
        }
    }
    if (!otmp.oeaten) {
        // costly_alteration deferred
        otmp.oeaten = obj_nutrition(otmp);
    }

    // C: carried(otmp) ≡ where == OBJ_INVENT (split child copies where)
    if (otmp.where === OBJ_INVENT || (game.invent || []).includes(otmp)) {
        freeinv_touchfood(otmp);
        // C: inv_cnt(FALSE) after freeinv — non-gold invent letters
        let n = 0;
        for (const o of game.invent || []) {
            if (o.oclass !== COIN_CLASS) n++;
        }
        if (n >= INVLET_BASIC) {
            await dropy(otmp);
            if (otmp.where === OBJ_FREE) return null; // deleted approx
        } else {
            otmp = await addinv_nomerge(otmp);
        }
    }
    return otmp;
}

/**
 * C ref: attrib.c poison_strdmg → losestr + losehp.
 * losestr rn1(4,3) only when ABASE-strloss would go below ATTRMIN.
 */
export async function poison_strdmg(strloss, dmg) {
    const u = game.u || (game.u = {});
    if (!u.acurr) u.acurr = { a: [10, 10, 10, 10, 10, 10] };
    const amin = game.urace?.attrmin?.[A_STR] ?? 3;
    let n = strloss | 0;
    let ustr = (u.acurr.a[A_STR] | 0) - n;
    let frailty = 0;
    while (ustr < amin) {
        ustr++;
        n--;
        frailty += rn1(4, 3);
    }
    if (frailty) {
        u.uhp = (u.uhp | 0) - frailty;
    }
    if (n > 0) await adjattrib(A_STR, -n, 1);
    u.uhp = (u.uhp | 0) - (dmg | 0);
    if ((u.uhp | 0) < 1) {
        u.uhp = 0;
        if (game.program_state) game.program_state.gameover = true;
    }
    if (!game.flags) game.flags = {};
    game.flags.botl = true;
}

/**
 * C ref: eat.c garlic_breath — nearby smelling mons flee (untimed).
 */
async function garlic_breath(mtmp) {
    if (!mtmp || (mtmp.mhp | 0) <= 0) return;
    const u = game.u || {};
    const d2 = dist2(mtmp.mx | 0, mtmp.my | 0, u.ux | 0, u.uy | 0);
    if (olfaction(mtmp.data) && d2 < 7) {
        await monflee(mtmp, 0, false, false);
    }
}

/**
 * C ref: eat.c fprefx — first-bite messages for non-rotten non-tin food.
 * Contest recorder is MACOS → APPLE "Macintosh!"; UNIX Core dumped deferred.
 * Returns false if eating should abort (egg explode etc. deferred → true).
 */
async function fprefx(otmp) {
    if (otmp.otyp === FOOD_RATION) {
        const hung = game.u?.uhunger ?? 900;
        if (hung <= 200) {
            await pline('This food really hits the spot!');
        } else if (hung < 700) {
            await pline('This satiates your stomach!');
        }
        return true;
    }
    if (otmp.otyp === TRIPE_RATION) {
        await pline('Yak - dog food!');
        return true;
    }
    // C: CLOVE_OF_GARLIC — undead vomit; else scare nearby then fall through
    if (otmp.otyp === CLOVE_OF_GARLIC) {
        if (is_undead(hero_form_data())) {
            // make_vomiting(rn1(reqtime,5)) deferred for undead poly hero
            return true;
        }
        for (const mtmp of game.fmon || []) {
            await garlic_breath(mtmp);
        }
        // FALLTHROUGH to default delicious feedback
    }
    // Contest C build defines MACOS (recorder on macOS).
    if (otmp.otyp === APPLE && !otmp.cursed) {
        await pline('Delicious!  Must be a Macintosh!');
        return true;
    }
    if (otmp.otyp === PEAR && !otmp.cursed) {
        await pline('Core dumped.');
        return true;
    }
    // default give_feedback
    const cursed = !!otmp.cursed;
    const bland = otmp.otyp === CRAM_RATION
        || otmp.otyp === K_RATION
        || otmp.otyp === C_RATION;
    const adj = cursed ? 'terrible!' : bland ? 'bland.' : 'delicious!';
    await pline(`This ${singular(otmp, xname)} is ${adj}`);
    return true;
}

/**
 * C ref: eat.c bite — nutrition per turn; choke deferred (canchoke always 0).
 * @returns {number} 1 if choked (abort), else 0
 */
function bite() {
    const v = game.context?.victual;
    if (!v?.piece) return 0;
    if (v.doreset) {
        game.context.victual = {};
        return 0;
    }
    if ((v.nmod | 0) < 0) {
        let nut = -(v.nmod | 0);
        if (nut < 1) nut = 1;
        lesshungry(nut);
        consume_oeaten(v.piece, v.nmod | 0);
    } else if ((v.nmod | 0) > 0 && ((v.usedtime | 0) % (v.nmod | 0))) {
        lesshungry(1);
        consume_oeaten(v.piece, -1);
    }
    return 0;
}

/**
 * C ref: eat.c eye_of_newt_buzz — small Pw boost from newt / AT_MAGC corpse.
 */
async function eye_of_newt_buzz() {
    const u = game.u || (game.u = {});
    // C: if (rn2(3) || 3 * u.uen <= 2 * u.uenmax)
    if (rn2(3) || 3 * (u.uen | 0) <= 2 * (u.uenmax | 0)) {
        const old_uen = u.uen | 0;
        u.uen = (u.uen | 0) + rnd(3);
        if ((u.uen | 0) > (u.uenmax | 0)) {
            if (!rn2(3)) {
                u.uenmax = (u.uenmax | 0) + 1;
                if ((u.uenmax | 0) > (u.uenpeak | 0)) u.uenpeak = u.uenmax;
            }
            u.uen = u.uenmax;
        }
        if (old_uen !== (u.uen | 0)) {
            await You_feel('a mild buzz.');
            if (game.disp) game.disp.botl = true;
            if (game.flags) game.flags.botl = true;
        }
    }
}

/**
 * C ref: eat.c intrinsic_possible — true iff corpse can convey `type`.
 */
function intrinsic_possible(type, ptr) {
    if (!ptr) return 0;
    const mc = ptr.mconveys | 0;
    switch (type | 0) {
    case FIRE_RES: return (mc & MR_FIRE) !== 0 ? 1 : 0;
    case SLEEP_RES: return (mc & MR_SLEEP) !== 0 ? 1 : 0;
    case COLD_RES: return (mc & MR_COLD) !== 0 ? 1 : 0;
    case DISINT_RES: return (mc & MR_DISINT) !== 0 ? 1 : 0;
    case SHOCK_RES: return (mc & MR_ELEC) !== 0 ? 1 : 0;
    case POISON_RES: return (mc & MR_POISON) !== 0 ? 1 : 0;
    case ACID_RES: return (mc & MR_ACID) !== 0 ? 1 : 0;
    case STONE_RES: return (mc & MR_STONE) !== 0 ? 1 : 0;
    case TELEPORT: return can_teleport(ptr) ? 1 : 0;
    case TELEPORT_CONTROL: return control_teleport(ptr) ? 1 : 0;
    case TELEPAT: return telepathic(ptr) ? 1 : 0;
    default: return 0;
    }
}

/**
 * C ref: eat.c should_givit — permanent-intrinsic chance vs mlevel.
 */
function should_givit(type, ptr) {
    let chance;
    switch (type | 0) {
    case POISON_RES:
        if ((ptr?.mndx === PM_KILLER_BEE || ptr?.mndx === PM_SCORPION)
            && !rn2(4)) {
            chance = 1;
        } else {
            chance = 15;
        }
        break;
    case TELEPORT:
        chance = 10;
        break;
    case TELEPORT_CONTROL:
        chance = 12;
        break;
    case TELEPAT:
        chance = 1;
        break;
    default:
        chance = 15;
        break;
    }
    return (ptr?.mlevel | 0) > rn2(chance);
}

/**
 * C ref: eat.c temp_givit — timed acid/stone resist chance.
 */
function temp_givit(type, ptr) {
    const chance = (type | 0) === STONE_RES ? 6
        : (type | 0) === ACID_RES ? 3 : 0;
    return chance ? ((ptr?.mlevel | 0) > rn2(chance)) : false;
}

/**
 * C ref: eat.c givit — grant permanent or timed intrinsic from corpse.
 * Named omissions: debugpline only.
 */
async function givit(type, ptr) {
    if (!should_givit(type, ptr) && !temp_givit(type, ptr)) return;

    const u = game.u || (game.u = {});
    const hallu = !!(u.Hallucination || ((u.HHallucination | 0) & TIMEOUT));

    switch (type | 0) {
    case FIRE_RES:
        if (!((u.HFire_resistance | 0) & FROMOUTSIDE)) {
            await pline(hallu ? 'You be chillin\'.' : 'You feel a momentary chill.');
            u.HFire_resistance = (u.HFire_resistance | 0) | FROMOUTSIDE;
        }
        break;
    case SLEEP_RES:
        if (!((u.HSleep_resistance | 0) & FROMOUTSIDE)) {
            await You_feel('wide awake.');
            u.HSleep_resistance = (u.HSleep_resistance | 0) | FROMOUTSIDE;
        }
        break;
    case COLD_RES:
        if (!((u.HCold_resistance | 0) & FROMOUTSIDE)) {
            await You_feel('full of hot air.');
            u.HCold_resistance = (u.HCold_resistance | 0) | FROMOUTSIDE;
        }
        break;
    case DISINT_RES:
        if (!((u.HDisint_resistance | 0) & FROMOUTSIDE)) {
            await You_feel(hallu ? 'totally together, man.' : 'very firm.');
            u.HDisint_resistance = (u.HDisint_resistance | 0) | FROMOUTSIDE;
        }
        break;
    case SHOCK_RES:
        if (!((u.HShock_resistance | 0) & FROMOUTSIDE)) {
            if (hallu) await You_feel('grounded in reality.');
            else await pline('Your health currently feels amplified!');
            u.HShock_resistance = (u.HShock_resistance | 0) | FROMOUTSIDE;
        }
        break;
    case POISON_RES:
        if (!((u.HPoison_resistance | 0) & FROMOUTSIDE)) {
            const had = !!(u.Poison_resistance || u.HPoison_resistance
                || u.EPoison_resistance);
            await You_feel(had ? 'especially healthy.' : 'healthy.');
            u.HPoison_resistance = (u.HPoison_resistance | 0) | FROMOUTSIDE;
        }
        break;
    case TELEPORT:
        if (!((u.HTeleportation | 0) & FROMOUTSIDE)) {
            await You_feel(hallu ? 'diffuse.' : 'very jumpy.');
            u.HTeleportation = (u.HTeleportation | 0) | FROMOUTSIDE;
        }
        break;
    case TELEPORT_CONTROL:
        if (!((u.HTeleport_control | 0) & FROMOUTSIDE)) {
            await You_feel(hallu
                ? 'centered in your personal space.'
                : 'in control of yourself.');
            u.HTeleport_control = (u.HTeleport_control | 0) | FROMOUTSIDE;
        }
        break;
    case TELEPAT:
        if (!((u.HTelepat | 0) & FROMOUTSIDE)) {
            await You_feel(hallu
                ? 'in touch with the cosmos.'
                : 'a strange mental acuity.');
            u.HTelepat = (u.HTelepat | 0) | FROMOUTSIDE;
            const Blind = !!(u.Blind || ((u.HBlinded | 0) & TIMEOUT));
            if (Blind) see_monsters();
        }
        break;
    case ACID_RES: {
        const Acid_resistance = !!(u.Acid_resistance || u.HAcid_resistance
            || u.EAcid_resistance);
        if (!Acid_resistance) {
            await You_feel(hallu
                ? 'secure from flashbacks'
                : 'less concerned about being harmed by acid');
        }
        incr_itimeout_prop(u, 'HAcid_resistance', d(3, 6));
        break;
    }
    case STONE_RES: {
        const Stone_resistance = !!(u.Stone_resistance || u.HStone_resistance
            || u.EStone_resistance);
        if (!Stone_resistance) {
            await You_feel(hallu
                ? 'unusually limber'
                : 'less concerned about becoming petrified');
        }
        incr_itimeout_prop(u, 'HStone_resistance', d(3, 6));
        break;
    }
    default:
        break;
    }
}

/**
 * C ref: eat.c corpse_intrinsic — pick one conveyable prop (or -1 STR).
 * Non-deterministic; call once per corpse.
 */
function corpse_intrinsic(ptr) {
    const conveys_STR = is_giant(ptr);
    let count = 0;
    let prop = 0;
    if (conveys_STR) {
        count = 1;
        prop = -1;
    }
    for (let i = 1; i <= LAST_PROP; i++) {
        if (!intrinsic_possible(i, ptr)) continue;
        ++count;
        if (!rn2(count)) prop = i;
    }
    // if strength is the only candidate, give it 50% chance
    if (conveys_STR && count === 1 && !rn2(2)) prop = 0;
    return prop;
}

/**
 * C ref: eat.c eatmdone — end gold-pile mimicry (afternmv / leak cleanup).
 */
function eatmdone() {
    if (game.eatmbuf) {
        if (game.nomovemsg === game.eatmbuf) game.nomovemsg = null;
        game.eatmbuf = null;
    }
    const ym = game.youmonst;
    if (ym && (ym.m_ap_type | 0) !== M_AP_NOTHING) {
        ym.m_ap_type = M_AP_NOTHING;
        ym.mappearance = 0;
        const u = game.u || {};
        newsym(u.ux | 0, u.uy | 0);
    }
    return 0;
}

/**
 * C ref: eat.c cpostfx — post-corpse effects.
 * Branch envelope (D-0943/D-0944/D-0945): named specials + check_intrinsics
 * hallu/newt + corpse_intrinsic → givit / gainstr; were* set_ulycn;
 * mimic gold eatmdone/afternmv; disenchanter attrcurse.
 * Named omissions: retouch_equipment after set_ulycn; set_mimic_blocking;
 * curs_on_u; livelog first polyself conduct; eatmupdate hallu toggle.
 */
async function cpostfx(pm) {
    let tmp = 0;
    let catch_lycanthropy = NON_PM;
    let check_intrinsics = false;
    const u = game.u || (game.u = {});
    const ptr = mons(pm);

    // C: prior gold-mimic eatmbuf leak cleanup
    if (game.eatmbuf) eatmdone();

    switch (pm | 0) {
    case PM_WRAITH:
        await pluslvl(false);
        break;
    case PM_HUMAN_WERERAT:
        catch_lycanthropy = PM_WERERAT;
        break;
    case PM_HUMAN_WEREJACKAL:
        catch_lycanthropy = PM_WEREJACKAL;
        break;
    case PM_HUMAN_WEREWOLF:
        catch_lycanthropy = PM_WEREWOLF;
        break;
    case PM_NURSE:
        if (Upolyd(u)) u.mh = u.mhmax | 0;
        else u.uhp = u.uhpmax | 0;
        await make_blinded(0, !u.ucreamed);
        if (game.disp) game.disp.botl = true;
        if (game.flags) game.flags.botl = true;
        check_intrinsics = true;
        break;
    case PM_STALKER: {
        const Invis = !!(u.Invis || (u.HInvis | 0) || (u.EInvis | 0));
        const Blind = !!(u.Blind || ((u.HBlinded | 0) & TIMEOUT));
        const BInvis = !!(u.BInvis | 0);
        if (!Invis) {
            set_itimeout_prop(u, 'HInvis', rn1(100, 50));
            if (!Blind && !BInvis) await self_invis_message();
        } else {
            if (!((u.HInvis | 0) & INTRINSIC)) {
                await You_feel('hidden!');
            }
            u.HInvis = (u.HInvis | 0) | FROMOUTSIDE;
            u.HSee_invisible = (u.HSee_invisible | 0) | FROMOUTSIDE;
        }
        newsym(u.ux | 0, u.uy | 0);
        // FALLTHROUGH → yellow light / giant bat stun
    }
    // falls through
    case PM_YELLOW_LIGHT:
    case PM_GIANT_BAT:
        await make_stunned(((u.HStun | 0) & TIMEOUT) + 30, false);
        // FALLTHROUGH → bat stun
    // falls through
    case PM_BAT:
        await make_stunned(((u.HStun | 0) & TIMEOUT) + 30, false);
        break;
    case PM_GIANT_MIMIC:
        tmp += 10;
        // FALLTHROUGH
    case PM_LARGE_MIMIC:
        tmp += 20;
        // FALLTHROUGH
    case PM_SMALL_MIMIC: {
        tmp += 20;
        const youdata = hero_form_data();
        const Unchanging = !!(u.Unchanging || u.HUnchanging || u.EUnchanging);
        if (youdata?.mlet !== 'S_MIMIC' && !Unchanging) {
            const hallu = !!(u.Hallucination
                || ((u.HHallucination | 0) & TIMEOUT));
            const tempshape = hallu ? 'an orange' : 'a pile of gold';
            if (!game.u.uconduct) game.u.uconduct = {};
            // livelog first polyselfs deferred; still count
            game.u.uconduct.polyselfs = (game.u.uconduct.polyselfs | 0) + 1;
            await pline(
                `You can't resist the temptation to mimic ${tempshape}.`,
            );
            if (u.usteed) await dismount_steed(DISMOUNT_FELL);
            nomul(-tmp);
            game.multi_reason = 'pretending to be a pile of gold';
            const formNoun = Upolyd(u)
                ? pmname(youdata?.mndx ?? u.umonnum, Ugender())
                : (game.urace?.noun || 'human');
            const again = an(formNoun);
            game.eatmbuf = hallu
                ? `You suddenly dread being peeled and mimic ${again} again!`
                : `You now prefer mimicking ${again} again.`;
            game.nomovemsg = game.eatmbuf;
            game.afternmv = eatmdone;
            if (!game.youmonst) game.youmonst = {};
            game.youmonst.m_ap_type = M_AP_OBJECT;
            game.youmonst.mappearance = hallu ? ORANGE_OTYP : GOLD_PIECE;
            newsym(u.ux | 0, u.uy | 0);
            // C: curs_on_u deferred; display_nhwindow(WIN_MAP,TRUE) → more()
            await more();
        }
        break;
    }
    case PM_QUANTUM_MECHANIC:
        await pline('Your velocity suddenly seems very uncertain!');
        if ((u.HFast | 0) & INTRINSIC) {
            u.HFast = (u.HFast | 0) & ~INTRINSIC;
            await pline('You seem slower.');
        } else {
            u.HFast = (u.HFast | 0) | FROMOUTSIDE;
            await pline('You seem faster.');
        }
        break;
    case PM_LIZARD:
        if (((u.HStun | 0) & TIMEOUT) > 2) {
            await make_stunned(2, false);
        }
        if (((u.HConfusion | 0) & TIMEOUT) > 2) {
            await make_confused(2, false);
        }
        check_intrinsics = true;
        break;
    case PM_CHAMELEON:
    case PM_DOPPELGANGER:
    case PM_SANDESTIN:
    case PM_GENETIC_ENGINEER: {
        const Unchanging = !!(u.Unchanging || u.HUnchanging || u.EUnchanging);
        if (Unchanging) {
            await You_feel('momentarily different.');
        } else {
            if (game.context?.tin?.tin) {
                use_up_tin(game.context.tin.tin);
                lesshungry(200 + (metallivorous(hero_form_data()) ? 5 : 0));
            }
            if ((pm | 0) === PM_GENETIC_ENGINEER) {
                await pline('You undergo a freakish metamorphosis.');
            } else {
                await pline('You feel a change coming over you.');
            }
            await polyself(POLY_NOFLAGS);
        }
        break;
    }
    case PM_DISPLACER_BEAST: {
        const Displaced = !!(u.HDisplaced || u.EDisplaced
            || (u.uprops?.[DISPLACED]?.intrinsic | 0)
            || (u.uprops?.[DISPLACED]?.extrinsic | 0));
        if (!Displaced) await toggle_displacement(null, 0, true);
        incr_itimeout_prop(u, 'HDisplaced', d(6, 6));
        break;
    }
    case PM_DISENCHANTER:
        await attrcurse();
        break;
    case PM_DEATH:
    case PM_PESTILENCE:
    case PM_FAMINE:
        break;
    case PM_MIND_FLAYER:
    case PM_MASTER_MIND_FLAYER: {
        const intBase = u.acurr?.a?.[A_INT] | 0;
        const intMax = game.urace?.attrmax?.[A_INT] ?? 18;
        if (intBase < intMax) {
            if (!rn2(2)) {
                await pline('Yum!  That was real brain food!');
                await adjattrib(A_INT, 1, false);
                break; // don't give telepathy via check_intrinsics
            }
        } else {
            await pline('For some reason, that tasted bland.');
        }
        // FALLTHROUGH → default check_intrinsics
    }
    // falls through
    default:
        check_intrinsics = true;
        break;
    }

    if (check_intrinsics) {
        if (dmgtype(ptr, AD_STUN) || dmgtype(ptr, AD_HALU)
            || (pm | 0) === PM_VIOLET_FUNGUS) {
            await pline('Oh wow!  Great stuff!');
            await make_hallucinated(
                ((u.HHallucination | 0) & TIMEOUT) + 200,
                false,
                0,
            );
        }
        if (attacktype(ptr, AT_MAGC) || (pm | 0) === PM_NEWT) {
            await eye_of_newt_buzz();
        }
        // C: corpse_intrinsic → givit / gainstr (D-0944)
        const prop = corpse_intrinsic(ptr);
        if (prop === -1) {
            await gainstr(null, 0, true);
        } else if (prop > 0) {
            await givit(prop, ptr);
        }
    }

    if (ismnum(catch_lycanthropy)) {
        set_ulycn(catch_lycanthropy);
        // retouch_equipment(2) deferred
    }
}

/**
 * C ref: eat.c done_eating — finish meal; cpostfx for CORPSE; fpostfx.
 * Envelope: fortune cookie rumor; wolfsbane you_unwere(TRUE).
 * Named omissions: carrot blindness; other fpostfx otyps.
 */
async function done_eating(message) {
    const piece = game.context?.victual?.piece;
    if (!piece) {
        if (game.context) game.context.victual = {};
        game.occupation = null;
        return;
    }
    // C: occupation = 0 early so newuhs knows we're done
    game.occupation = null;
    newuhs(false);
    if (message) {
        await pline(`You finish eating ${food_xname(piece, true)}.`);
    }
    if (piece.otyp === CORPSE || piece.globby) {
        await cpostfx(piece.corpsenm | 0);
    } else if (piece.otyp === FORTUNE_COOKIE) {
        // C: fpostfx — cookie rumor
        await outrumor(bcsign(piece), BY_COOKIE);
    } else if (piece.otyp === SPRIG_OF_WOLFSBANE) {
        // C: fpostfx SPRIG_OF_WOLFSBANE → you_unwere(TRUE)
        const u = game.u || {};
        if (ismnum(u.ulycn) || is_were(game.youmonst?.data)) {
            await you_unwere(true);
        }
    }
    useup(piece);
    if (game.context) game.context.victual = {};
}

/**
 * C ref: eat.c eatfood — occupation each move while eating.
 * Returns 1 to continue, 0 when done.
 */
async function eatfood() {
    const food = game.context?.victual?.piece;
    if (!food || !game.context?.victual?.eating) {
        if (game.context) game.context.victual = {};
        return 0;
    }
    // floor-moved food: C checks ox/oy still under hero; deferred beyond
    // leaving the square (occupation cancels). Same-cell floor OK.
    game.context.victual.usedtime = (game.context.victual.usedtime | 0) + 1;
    if ((game.context.victual.usedtime | 0)
        <= (game.context.victual.reqtime | 0)) {
        if (bite()) return 0;
        return 1;
    }
    await done_eating(true);
    return 0;
}

/**
 * C ref: eat.c start_eating — first bite; occupation if reqtime remains.
 */
async function start_eating(otmp, already_partly_eaten) {
    if (!game.context?.victual) return;
    game.context.victual.fullwarn = 0;
    game.context.victual.doreset = 0;
    game.context.victual.eating = 1;

    // C: cprefx before first bite; may clear victual on death/revive
    if (otmp.otyp === CORPSE || otmp.globby) {
        await cprefx(game.context.victual.piece?.corpsenm | 0);
        if (!game.context?.victual?.piece || !game.context.victual.eating) {
            return;
        }
    }

    if (bite()) {
        game.context.victual.usedtime = (game.context.victual.usedtime | 0) + 1;
        if ((game.context.victual.usedtime | 0)
            >= (game.context.victual.reqtime | 0)) {
            await done_eating(false);
        }
        return;
    }

    game.context.victual.usedtime = (game.context.victual.usedtime | 0) + 1;
    if ((game.context.victual.usedtime | 0)
        >= (game.context.victual.reqtime | 0)) {
        await done_eating(
            (game.context.victual.reqtime | 0) > 1 || already_partly_eaten,
        );
        return;
    }

    set_occupation(eatfood, `eating ${food_xname(otmp, true)}`);
}

/**
 * C ref: eat.c Hear_again — afternmv after fainting/rotten-food knock-out.
 * Chance of deafness clearing while out.
 */
function Hear_again() {
    // C: if (!rn2(2)) { make_deaf(0L, FALSE); disp.botl = TRUE; }
    if (!rn2(2)) {
        const u = game.u || (game.u = {});
        u.HDeaf = (u.HDeaf | 0) & ~TIMEOUT;
        if (game.disp) game.disp.botl = true;
        if (game.flags) game.flags.botl = true;
    }
    return 0;
}

/**
 * C ref: eat.c rottenfood — first bite of rotten food.
 * @returns {number} 1 if fainted (dont_start), else 0
 */
async function rottenfood(obj) {
    // C: "Blecch!  Rotten/Awful foodword!" — foodword poly deferred
    await pline('Blecch!  Rotten food!');
    if (!rn2(4)) {
        const u = game.u || {};
        if (u.Hallucination || u.HHallucination) {
            await pline('You feel rather trippy.');
        } else {
            await pline('You feel rather light headed.');
        }
        // C: make_confused(HConfusion + d(2, 4), FALSE)
        await make_confused((u.HConfusion | 0) + d(2, 4), false);
    } else if (!rn2(4) && !(game.u?.Blind || ((game.u?.HBlinded | 0) & TIMEOUT))) {
        await pline('Everything suddenly goes dark.');
        // C: make_blinded(BlindedTimeout + d(2, 10), FALSE) — body deferred
        d(2, 10);
    } else if (!rn2(3)) {
        const duration = rnd(10);
        await pline('The world spins and goes dark.');
        // C: incr_itimeout(&HDeaf, duration); nomul(-duration); afternmv=Hear_again
        const u = game.u || (game.u = {});
        u.HDeaf = ((u.HDeaf | 0) & ~TIMEOUT) | (((u.HDeaf | 0) & TIMEOUT) + duration);
        nomul(-duration);
        game.multi_reason = 'unconscious from rotten food';
        game.nomovemsg = 'You are conscious again.';
        game.afternmv = Hear_again;
        return 1;
    }
    return 0;
}

/**
 * C ref: eat.c eatcorpse — rotting / acid / poison / taste; sets reqtime.
 * @returns {number} 0 ok, 1 dont_start, 2 used up
 */
async function eatcorpse(otmp) {
    let retcode = 0;
    let tp = 0;
    const mnum = otmp.corpsenm | 0;
    let rotted = 0;
    const ptr = mons(mnum);
    const glob = !!otmp.globby;
    // flesh_petrifies / slimeable deferred — stoneable/slimeable stay false
    // unless green slime without resistances (named omission beyond flag)
    const slimeable = mnum === PM_GREEN_SLIME; // Unchanging/Slimed deferred
    const stoneable = false;

    if (!vegan(ptr)) {
        if (!game.u.uconduct) game.u.uconduct = {};
        game.u.uconduct.unvegan = (game.u.uconduct.unvegan | 0) + 1;
    }
    if (!vegetarian(ptr)) {
        if (violated_vegetarian()) {
            await pline('You feel guilty.');
        }
    }

    if (!nonrotting_corpse(mnum)) {
        const age = peek_at_iced_corpse_age(otmp);
        const moves = game.moves ?? 0;
        rotted = Math.trunc((moves - age) / (10 + rn2(20)));
        if (otmp.cursed) rotted += 2;
        else if (otmp.blessed) rotted -= 2;
    }

    if (!glob && !stoneable && !slimeable && rotted > 5) {
        // tainted path — Sick_resistance / make_sick deferred; use up
        await pline(
            `Ulch - that ${
                ptr?.mlet === 'S_FUNGUS' ? 'fungoid vegetation'
                    : vegetarian(ptr) ? 'protoplasm' : 'meat'
            } was tainted!`,
        );
        useup(otmp);
        return 2;
    } else if (acidic(ptr) && !(game.u?.HAcid_resistance || game.u?.EAcid_resistance
        || game.u?.Acid_resistance)) {
        tp++;
        await pline('You have a very bad case of stomach acid.');
        // C: losehp(rnd(15), ...) — inline to avoid eat↔hack import cycle
        // Must call rnd() (logs rnd(N)=…) not 1+rn2 (logs rn2(N)=…).
        if (game.u) {
            const dmg = rnd(15);
            game.u.uhp = (game.u.uhp | 0) - dmg;
        }
    } else if (poisonous(ptr) && rn2(5)) {
        tp++;
        await pline('Ecch - that must have been poisonous!');
        const poisRes = !!(game.u?.HPoison_resistance || game.u?.EPoison_resistance
            || game.u?.Poison_resistance);
        if (!poisRes) {
            // C: poison_strdmg(rnd(4), rnd(15), ...) — clang LTR arg eval
            const strloss = rnd(4);
            const dmg = rnd(15);
            await poison_strdmg(strloss, dmg);
        } else {
            await pline('You seem unaffected by the poison.');
        }
    } else if ((rotted > 5 || (rotted > 3 && rn2(5)))
        && !(game.u?.HSick_resistance || game.u?.ESick_resistance)) {
        tp++;
        await pline(`You feel ${game.u?.Sick ? 'very ' : ''}sick.`);
        // C: losehp(rnd(8), !glob ? "cadaver" : "rotted glob", KILLED_BY_AN)
        if (game.u) {
            const dmg = rnd(8);
            game.u.uhp = (game.u.uhp | 0) - dmg;
        }
    }

    // delay is weight dependent
    const cwt = glob ? (otmp.owt | 0) : (ptr?.cwt ?? 0);
    if (!game.context) game.context = {};
    if (!game.context.victual) game.context.victual = {};
    game.context.victual.reqtime = 3 + (cwt >> 6);

    if (!tp && !nonrotting_corpse(mnum) && (otmp.orotten || !rn2(7))) {
        // C: if (rottenfood(otmp)) { orotten; touchfood; retcode=1; }
        // Non-faint still eats — only faint sets dont_start (D-0443).
        if (await rottenfood(otmp)) {
            otmp.orotten = true;
            otmp = await touchfood(otmp);
            if (!otmp) return 1;
            if (game.context?.victual) game.context.victual.piece = otmp;
            retcode = 1;
        }

        const cm = mons(otmp.corpsenm);
        if (!(cm?.cnutrit)) {
            if (!retcode) await pline('The corpse rots away completely.');
            useup(otmp);
            return 2;
        }
        if (!retcode) consume_oeaten(otmp, 2); /* oeaten >>= 2 */
    } else if ((mnum === PM_COCKATRICE || mnum === PM_CHICKATRICE)
        && (game.u?.HStone_resistance || game.u?.Hallucination)) {
        await pline('This tastes just like chicken!');
    } else if (mnum === PM_FLOATING_EYE
        && (game.u?.umonnum ?? -1) === PM_RAVEN) {
        await pline('You peck the eyeball with delight.');
    } else if (tp) {
        // message already delivered
    } else {
        // C: gy.youmonst.data — herbivorous must be true for omnivores so
        // palatable's rn2(10) is not short-circuited away (D-0409).
        const youData = hero_form_data();
        const yummy = vegan(ptr)
            ? (!carnivorous(youData) && herbivorous(youData))
            : (carnivorous(youData) && !herbivorous(youData));
        const palatable = (vegetarian(ptr)
            ? herbivorous(youData)
            : carnivorous(youData))
            && rn2(10)
            && (rotted < 1 || !rn2((rotted | 0) + 1));
        const palatable_msgs = [
            'Tokay', 'Istringy', 'Igamey', 'Ifatty', 'Itough',
        ];
        const idx = vegetarian(ptr) ? 0 : rn2(palatable_msgs.length);
        const palat_msg = palatable_msgs[idx];
        const use_is = !!(game.u?.Hallucination)
            || (!!palatable && palat_msg[0] === 'I');
        const pmxnam = food_xname(otmp, false);
        const taste = game.u?.Hallucination
            ? (yummy ? 'gnarly' : palatable ? 'copacetic' : 'grody')
            : (yummy ? 'delicious' : palatable
                ? palat_msg.slice(1) : 'terrible');
        const bang = (yummy || !palatable) ? '!' : '.';
        await pline(
            `This ${pmxnam} ${use_is ? 'is' : 'tastes'} ${taste}${bang}`,
        );
    }

    return retcode;
}

/** C ref: mondata.h cantwield — nohands || verysmall. */
function cantwield(ptr) {
    return nohands(ptr) || verysmall(ptr);
}

/** C invent.c carried — object is in invent[]. */
export function carried(obj) {
    if (!obj) return false;
    return (game.invent || []).includes(obj);
}

/** C mkobj.c obj_here — object present at (x,y) floor pile. */
function obj_here(obj, x, y) {
    if (!obj) return false;
    for (let o = objects_at(x, y); o; o = o.nexthere) {
        if (o === obj) return true;
    }
    return false;
}

/**
 * C ref: objnam.c the_unique_pm — G_UNIQ "the Name" article gate.
 * High priest / worm-tail / Wizard-of-Yendor exceptions match C.
 */
function the_unique_pm(ptr) {
    if (!ptr || type_is_pname(ptr)) return false;
    let uniq = !!((ptr.geno | 0) & G_UNIQ);
    if (PM_HIGH_CLERIC >= 0 && ptr === mons(PM_HIGH_CLERIC)) uniq = false;
    if (PM_LONG_WORM_TAIL >= 0 && ptr === mons(PM_LONG_WORM_TAIL)) {
        uniq = false;
    }
    if (PM_WIZARD_OF_YENDOR >= 0 && ptr === mons(PM_WIZARD_OF_YENDOR)) {
        uniq = true;
    }
    return uniq;
}

/** C ref: potion.c / youprop fingers_or_gloves — gloves vs fingers. */
function fingers_or_gloves(_capitalize) {
    return game.u?.uarmg ? 'gloves' : 'fingers';
}

/** C ref: objnam.c yobjnam(obj, NULL) subset — "your dagger". */
function yobjnam(obj) {
    if (!obj) return 'your weapon';
    return `your ${xname(obj)}`;
}

/**
 * C ref: eat.c tin_variety(obj, displ) — gameplay path (displ=false).
 * Homemade→rotten rn2(7) and lizard remap match C.
 */
function tin_variety(obj, displ) {
    let r;
    const mnum = obj.corpsenm;
    const spe = obj.spe | 0;
    if (spe === 1) {
        r = SPINACH_TIN;
    } else if (obj.cursed) {
        r = ROTTEN_TIN;
    } else if (spe < 0) {
        r = -spe;
        --r;
    } else {
        r = rn2(TTSZ - 1);
    }
    if (!displ && r === HOMEMADE_TIN && !obj.blessed && !rn2(7)) {
        r = ROTTEN_TIN;
    }
    if (r === ROTTEN_TIN && ismnum(mnum) && nonrotting_corpse(mnum)) {
        r = HOMEMADE_TIN;
    }
    return r;
}

/**
 * C ref: eat.c set_tin_variety(obj, forcetype). HOMEMADE_TIN is the
 * tinning-kit path (spe = -(r+1) = -2, no rn2). SPINACH/HEALTHY/RANDOM
 * kept with the C function so callers do not invent a second encoding.
 */
export function set_tin_variety(obj, forcetype) {
    if (!obj) return;
    let r;
    const mnum = obj.corpsenm;
    if (forcetype === SPINACH_TIN
        || (forcetype === HEALTHY_TIN
            && (mnum === NON_PM || !vegetarian(mons(mnum))))) {
        obj.corpsenm = NON_PM;
        obj.spe = 1;
        return;
    } else if (forcetype === HEALTHY_TIN) {
        r = tin_variety(obj, false);
        if (r < 0 || r >= TTSZ) r = ROTTEN_TIN;
        while ((r === ROTTEN_TIN && !obj.cursed) || !tintxts[r]?.fodder) {
            r = rn2(TTSZ - 1);
        }
    } else if (forcetype >= 0 && forcetype < TTSZ - 1) {
        r = forcetype;
    } else {
        /* RANDOM_TIN */
        r = rn2(TTSZ - 1);
        if (r === ROTTEN_TIN && ismnum(mnum) && nonrotting_corpse(mnum)) {
            r = HOMEMADE_TIN;
        }
    }
    obj.spe = -(r + 1);
}

/**
 * C ref: eat.c costly_tin — shop unpaid alteration of tin being opened.
 * Split stack if quan>1; costly_alteration(COST_OPEN/COST_DSTROY).
 */
async function costly_tin(alter_type) {
    let tin = game.context?.tin?.tin;
    if (!tin) return null;
    const unpaidCarried = carried(tin) && tin.unpaid;
    const unpaidFloor = !carried(tin)
        && costly_spot(tin.ox | 0, tin.oy | 0)
        && !tin.no_charge;
    if (unpaidCarried || unpaidFloor) {
        if ((tin.quan | 0) > 1) {
            tin = splitobj(tin, 1) || tin;
            if (!game.context) game.context = {};
            if (!game.context.tin) game.context.tin = {};
            game.context.tin.tin = tin;
            game.context.tin.o_id = tin.o_id | 0;
        }
        await costly_alteration(tin, alter_type);
    }
    return tin;
}

/** C ref: eat.c use_up_tin — invent useup or floor useupf; clear tin ctx. */
function use_up_tin(tin) {
    if (carried(tin)) useup(tin);
    else useup(tin); // floor path via useup's OBJ_FLOOR arm
    if (!game.context) game.context = {};
    game.context.tin = { tin: null, o_id: 0, reqtime: 0, usedtime: 0 };
}

/**
 * C ref: invent.c useupall — remove entire invent stack (setnotworn deferred).
 */
function useupall(otmp) {
    if (!otmp) return;
    const inv = game.invent || [];
    const idx = inv.indexOf(otmp);
    if (idx >= 0) inv.splice(idx, 1);
    otmp.quan = 0;
    otmp.where = OBJ_FREE;
}

/**
 * C ref: invent.c useupf — consume numused from floor pile (shop bill deferred).
 */
export function useupf(otmp, numused) {
    if (!otmp) return;
    let victim = otmp;
    const n = numused | 0;
    if ((otmp.quan || 1) > n) {
        victim = splitobj(otmp, n) || otmp;
    }
    delobj(victim);
}

/**
 * C ref: o_init.c objdescr_is — OBJ_DESCR(objects[otyp]) vs descr.
 */
function objdescr_is(obj, descr) {
    if (!obj) return false;
    const oc = game.objects?.[obj.otyp];
    if (!oc) return false;
    const dn = objectDescrs[oc.oc_descr_idx ?? obj.otyp];
    return dn != null && dn === descr;
}

/** C util.h sgn — sign of n as -1/0/1. */
function sgn(n) {
    n |= 0;
    return n < 0 ? -1 : n > 0 ? 1 : 0;
}

/**
 * C ref: apply.c o_unleash — clear leashmon on destroy/steal.
 * Named omissions: update_inventory.
 */
function o_unleash(otmp) {
    if (!otmp) return;
    const lid = otmp.leashmon | 0;
    if (lid) {
        for (const mtmp of game.fmon || []) {
            if ((mtmp.m_id | 0) === lid) {
                mtmp.mleashed = 0;
                break;
            }
        }
    }
    otmp.leashmon = 0;
}

/**
 * C ref: youprop.h Strangled — extrinsic STRANGLED or flat.
 */
function Strangled() {
    const u = game.u || {};
    if (u.Strangled) return true;
    const prop = u.uprops?.[STRANGLED];
    return !!((prop?.extrinsic | 0) || (u.EStrangled | 0));
}

/** C mondata.h perceives — form sees invisible. */
function perceives(ptr) {
    return !!(((ptr?.mflags1 | 0) & M1_SEE_INVIS) !== 0);
}

/** Ensure uprops[prop] exists; return intrinsic bits. */
function prop_intrinsic(prop) {
    const u = game.u || (game.u = {});
    if (!u.uprops) u.uprops = {};
    if (!u.uprops[prop]) u.uprops[prop] = { intrinsic: 0, extrinsic: 0, blocked: 0 };
    return u.uprops[prop].intrinsic | 0;
}

/** Set uprops[prop].intrinsic (and common H* mirrors). */
function set_prop_intrinsic(prop, bits) {
    const u = game.u || (game.u = {});
    if (!u.uprops) u.uprops = {};
    if (!u.uprops[prop]) u.uprops[prop] = { intrinsic: 0, extrinsic: 0, blocked: 0 };
    u.uprops[prop].intrinsic = bits | 0;
    // Mirror flats used elsewhere in the port
    if (prop === SEE_INVIS) u.HSee_invisible = bits | 0;
    else if (prop === INVIS) u.HInvis = bits | 0;
    else if (prop === SLEEP_RES) u.HSleep_resistance = bits | 0;
    else if (prop === PROTECTION) u.HProtection = bits | 0;
    else if (prop === SLEEPY) u.HSleepy = bits | 0;
    else if (prop === LEVITATION) u.HLevitation = bits | 0;
    else if (prop === PROT_FROM_SHAPE_CHANGERS) {
        u.HProtection_from_shape_changers = bits | 0;
    }
}

/**
 * C ref: eat.c bounded_increase — combat intrinsic growth caps.
 */
function bounded_increase(old, inc, typ) {
    const u = game.u || {};
    old |= 0;
    inc |= 0;
    typ |= 0;
    if (u.uright && (u.uright.otyp | 0) === typ && typ !== RIN_PROTECTION) {
        old -= u.uright.spe | 0;
    }
    if (u.uleft && (u.uleft.otyp | 0) === typ && typ !== RIN_PROTECTION) {
        old -= u.uleft.spe | 0;
    }
    let absold = Math.abs(old);
    let absinc = Math.abs(inc);
    const sgnold = sgn(old);
    const sgninc = sgn(inc);

    if (absinc === 0 || sgnold !== sgninc || absold + absinc < 10) {
        // use inc as-is
    } else if (absold + absinc < 20) {
        absinc = rnd(absinc);
        if (absold + absinc < 10) absinc = 10 - absold;
        inc = sgninc * absinc;
    } else if (absold + absinc < 40) {
        absinc = rn2(absinc) ? 1 : 0;
        if (absold + absinc < 20) absinc = rnd(20 - absold);
        inc = sgninc * absinc;
    } else {
        inc = 0;
    }
    if (u.uright && (u.uright.otyp | 0) === typ && typ !== RIN_PROTECTION) {
        old += u.uright.spe | 0;
    }
    if (u.uleft && (u.uleft.otyp | 0) === typ && typ !== RIN_PROTECTION) {
        old += u.uleft.spe | 0;
    }
    return (old + inc) | 0;
}

/**
 * C ref: eat.c choke — satiated stuffing or amulet of strangulation.
 * Branch envelope: non-satiated only AoS; lawful Knight adjalign; exercise CON;
 * Breathless/Hunger/!Strangled&&!rn2(20) → vomit path (AoS composure);
 * else killer + done(CHOKING).
 * Named omissions: killer_xname polish (xname stand-in); multi-turn food choke
 * callers beyond eataccessory.
 */
async function choke(food) {
    const u = game.u || (game.u = {});
    if ((u.uhs | 0) !== SATIATED) {
        if (!food || (food.otyp | 0) !== AMULET_OF_STRANGULATION) return;
    } else if ((game.urole?.mnum | 0) === PM_KNIGHT
        && (u.ualign?.type | 0) === A_LAWFUL) {
        adjalign(-1);
        await You_feel('like a glutton!');
    }

    exercise(A_CON, false);

    if (Breathless() || Hunger() || (!Strangled() && !rn2(20))) {
        if (food && (food.otyp | 0) === AMULET_OF_STRANGULATION) {
            await pline('You choke, but recover your composure.');
            return;
        }
        await pline('You stuff yourself and then vomit voluminously.');
        morehungry(Hunger() ? ((u.uhunger | 0) - 60) : 1000);
        vomit();
    } else {
        if (!game.killer) game.killer = { name: '', format: 0 };
        game.killer.format = KILLED_BY_AN;
        if (food) {
            await pline(`You choke over your ${foodword(food)}.`);
            if (food.oclass === COIN_CLASS) {
                game.killer.name = 'very rich meal';
            } else {
                game.killer.format = KILLED_BY;
                game.killer.name = xname(food);
            }
        } else {
            await pline('You choke over it.');
            game.killer.name = 'quick snack';
        }
        await pline('You die...');
        await done(CHOKING);
    }
}

/**
 * C ref: eat.c accessory_has_effect — digest magic pline.
 */
async function accessory_has_effect(otmp) {
    const kind = otmp.oclass === RING_CLASS ? 'ring' : 'amulet';
    await pline(`Magic spreads through your body as you digest the ${kind}.`);
}

/**
 * C ref: eat.c eataccessory — ring/amulet digest effects.
 * Branch envelope: Ring_gone; observe+known; rn2(3/5) switch
 * (default oc_oprop FROMOUTSIDE + see-invis/invis/levitation/PfSC arms;
 * adorn/gain-str/con/increase/protection/free-action; amulet change/
 * unchanging/strangle choke/restful; sustain/life/fly/reflect no-ops).
 * Named omissions: sink-fall death beyond Ring_gone;
 * restartcham polish beyond restartcham helper.
 */
async function eataccessory(otmp) {
    const u = game.u || (game.u = {});
    const typ = otmp.otyp | 0;
    const oc = game.objects?.[typ] || {};
    const prop = oc.oc_oprop | 0;
    let oldprop = prop_intrinsic(prop);

    if (otmp === u.uleft || otmp === u.uright) {
        await Ring_gone(otmp);
        if ((u.uhp | 0) <= 0) return; // died from sink fall (if Ring_gone ports it)
    }
    observe_object(otmp);
    otmp.known = 1;

    const chance = otmp.oclass === RING_CLASS ? 3 : 5;
    if (rn2(chance)) return;

    switch (typ) {
    default: {
        if (!prop) break;
        if (!(prop_intrinsic(prop) & FROMOUTSIDE)) {
            await accessory_has_effect(otmp);
        }
        set_prop_intrinsic(prop, prop_intrinsic(prop) | FROMOUTSIDE);

        switch (typ) {
        case RIN_SEE_INVISIBLE: {
            set_mimic_blocking();
            see_monsters();
            const blind = !!(u.Blind || ((u.HBlinded | 0) & TIMEOUT)
                || (u.EBlinded | 0) || u.uroleplay?.blind);
            const invis = !!(prop_intrinsic(INVIS)
                || (u.EInvis | 0) || (u.BInvis | 0) || u.Invis);
            if (invis && !oldprop && !(u.ESee_invisible | 0)
                && !perceives(hero_form_data()) && !blind) {
                newsym(u.ux | 0, u.uy | 0);
                await pline('Suddenly you can see yourself.');
                makeknown(typ);
            }
            break;
        }
        case RIN_INVISIBILITY: {
            const blind = !!(u.Blind || ((u.HBlinded | 0) & TIMEOUT)
                || (u.EBlinded | 0) || u.uroleplay?.blind);
            const seeInv = !!(prop_intrinsic(SEE_INVIS)
                || (u.ESee_invisible | 0) || u.See_invisible);
            if (!oldprop && !(u.EInvis | 0) && !(u.BInvis | 0)
                && !seeInv && !blind) {
                newsym(u.ux | 0, u.uy | 0);
                const hallu = !!(u.Hallucination
                    || ((u.HHallucination | 0) & TIMEOUT));
                await pline(
                    `Your body takes on a ${hallu ? 'normal' : 'strange'} transparency...`,
                );
                makeknown(typ);
            }
            break;
        }
        case RIN_PROTECTION_FROM_SHAPE_CHAN:
            rescham();
            break;
        case RIN_LEVITATION: {
            // undo the intrinsic |= FROMOUTSIDE done above
            set_prop_intrinsic(LEVITATION, oldprop);
            const levit = !!(prop_intrinsic(LEVITATION)
                || (u.ELevitation | 0) || u.Levitation);
            if (!levit) {
                await float_up();
                incr_itimeout_prop(u, 'HLevitation', d(10, 20));
                if (!u.uprops) u.uprops = {};
                if (!u.uprops[LEVITATION]) {
                    u.uprops[LEVITATION] = { intrinsic: 0, extrinsic: 0, blocked: 0 };
                }
                u.uprops[LEVITATION].intrinsic = u.HLevitation | 0;
                makeknown(typ);
            }
            break;
        }
        default:
            break;
        }
        break;
    }
    case RIN_ADORNMENT:
        await accessory_has_effect(otmp);
        if (await adjattrib(A_CHA, otmp.spe | 0, -1)) makeknown(typ);
        break;
    case RIN_GAIN_STRENGTH:
        await accessory_has_effect(otmp);
        if (await adjattrib(A_STR, otmp.spe | 0, -1)) makeknown(typ);
        break;
    case RIN_GAIN_CONSTITUTION:
        await accessory_has_effect(otmp);
        if (await adjattrib(A_CON, otmp.spe | 0, -1)) makeknown(typ);
        break;
    case RIN_INCREASE_ACCURACY:
        await accessory_has_effect(otmp);
        u.uhitinc = bounded_increase(u.uhitinc | 0, otmp.spe | 0,
            RIN_INCREASE_ACCURACY);
        break;
    case RIN_INCREASE_DAMAGE:
        await accessory_has_effect(otmp);
        u.udaminc = bounded_increase(u.udaminc | 0, otmp.spe | 0,
            RIN_INCREASE_DAMAGE);
        break;
    case RIN_PROTECTION:
    case AMULET_OF_GUARDING:
        await accessory_has_effect(otmp);
        set_prop_intrinsic(PROTECTION,
            prop_intrinsic(PROTECTION) | FROMOUTSIDE);
        u.HProtection = prop_intrinsic(PROTECTION);
        {
            const bump = typ === RIN_PROTECTION ? (otmp.spe | 0) : 2;
            u.ublessed = bounded_increase(u.ublessed | 0, bump, typ);
        }
        if (game.disp) game.disp.botl = true;
        if (game.flags) game.flags.botl = true;
        break;
    case RIN_FREE_ACTION: {
        if (!(prop_intrinsic(SLEEP_RES) & FROMOUTSIDE)
            && !((u.HSleep_resistance | 0) & FROMOUTSIDE)) {
            await accessory_has_effect(otmp);
        }
        const sleepRes = !!(prop_intrinsic(SLEEP_RES)
            || (u.HSleep_resistance | 0) || (u.ESleep_resistance | 0)
            || u.Sleep_resistance);
        if (!sleepRes) await You_feel('wide awake.');
        u.HSleep_resistance = (u.HSleep_resistance | 0) | FROMOUTSIDE;
        set_prop_intrinsic(SLEEP_RES,
            prop_intrinsic(SLEEP_RES) | FROMOUTSIDE);
        break;
    }
    case AMULET_OF_CHANGE:
        await accessory_has_effect(otmp);
        makeknown(typ);
        change_sex();
        {
            const female = !!(game.flags?.female);
            await pline(`You are suddenly very ${female ? 'feminine' : 'masculine'}!`);
        }
        if (game.disp) game.disp.botl = true;
        if (game.flags) game.flags.botl = true;
        break;
    case AMULET_OF_UNCHANGING:
        if (!u.Unchanging && !((u.HUnchanging | 0) & FROMOUTSIDE)
            && Upolyd(u)) {
            await accessory_has_effect(otmp);
            makeknown(typ);
            await rehumanize();
        }
        break;
    case AMULET_OF_STRANGULATION:
        await choke(otmp);
        break;
    case AMULET_OF_RESTFUL_SLEEP: {
        const newnap = rnd(100);
        const oldnap = (u.HSleepy | 0) & TIMEOUT;
        if (!((u.HSleepy | 0) & FROMOUTSIDE)
            && !(prop_intrinsic(SLEEPY) & FROMOUTSIDE)) {
            await accessory_has_effect(otmp);
        }
        u.HSleepy = (u.HSleepy | 0) | FROMOUTSIDE;
        set_prop_intrinsic(SLEEPY, prop_intrinsic(SLEEPY) | FROMOUTSIDE);
        if (newnap < oldnap || oldnap === 0) {
            u.HSleepy = ((u.HSleepy | 0) & ~TIMEOUT) | newnap;
            set_prop_intrinsic(SLEEPY, u.HSleepy | 0);
        }
        break;
    }
    case RIN_SUSTAIN_ABILITY:
    case AMULET_OF_LIFE_SAVING:
    case AMULET_OF_FLYING:
    case AMULET_OF_REFLECTION:
        break;
    }
}

/**
 * C ref: eat.c eatspecial — finish non-food meal: lesshungry + side
 * effects + useup.
 * Branch envelope: coin useupall/useupf + vault_gd_watching(GD_EATGOLD);
 * PAPER messages; dopotion; eataccessory; leash o_unleash;
 * trident/flint exercise; uwep/uqwep/uswapwep gone; unpunish ball/chain;
 * carried useup else useupf.
 * Named omissions: SCR_MAIL ifdef;
 * artifact_light in uwepgone; sink-fall death beyond Ring_gone;
 * sink-fall death polish beyond Ring_gone.
 */
async function eatspecial() {
    const otmp = game.context?.victual?.piece;
    if (!otmp) return;
    const nmod = game.context.victual.nmod | 0;
    // C: set_occupation(eatfood,…) so lesshungry choke msgs see occupation
    set_occupation(eatfood, 'eating non-food');
    lesshungry(nmod);
    game.occupation = null;
    if (game.context) game.context.victual = {};

    if (otmp.oclass === COIN_CLASS) {
        if (carried(otmp)) useupall(otmp);
        else useupf(otmp, otmp.quan || 1);
        vault_gd_watching(GD_EATGOLD);
        return;
    }

    const material = game.objects?.[otmp.otyp]?.oc_material ?? 0;
    if (material === MAT_PAPER) {
        // SCR_MAIL ifdef MAIL_STRUCTURES deferred
        if ((otmp.otyp | 0) === SCR_SCARE_MONSTER) {
            await pline(`Yuck${otmp.blessed ? '!' : '.'}`);
        } else if (otmp.oclass === SCROLL_CLASS
            && objdescr_is(otmp, 'YUM YUM')) {
            await pline(`Yum${otmp.blessed ? '!' : '.'}`);
        } else {
            await pline('Needs salt...');
        }
    }

    if (otmp.oclass === POTION_CLASS) {
        otmp.quan = (otmp.quan || 1) + 1; // dopotion() does a useup()
        const { dopotion } = await import('./potion.js');
        await dopotion(otmp);
    } else if (otmp.oclass === RING_CLASS || otmp.oclass === AMULET_CLASS) {
        await eataccessory(otmp);
    } else if ((otmp.otyp | 0) === LEASH && (otmp.leashmon | 0)) {
        o_unleash(otmp);
    }

    if ((otmp.otyp | 0) === TRIDENT && !otmp.cursed) {
        const hallu = !!(game.u?.Hallucination
            || ((game.u?.HHallucination | 0) & TIMEOUT));
        await pline(hallu
            ? 'Four out of five dentists agree.'
            : 'That was pure chewing satisfaction!');
        exercise(A_WIS, true);
    }
    if ((otmp.otyp | 0) === FLINT && !otmp.cursed) {
        await pline('Yabba-dabba delicious!');
        exercise(A_CON, true);
    }

    const u = game.u || {};
    if (otmp === u.uwep && (otmp.quan || 1) === 1) uwepgone();
    if (otmp === u.uquiver && (otmp.quan || 1) === 1) uqwepgone();
    if (otmp === u.uswapwep && (otmp.quan || 1) === 1) uswapwepgone();

    if (otmp === u.uball) {
        unpunish();
    }
    if (otmp === u.uchain) {
        unpunish(); // but no useup()
    } else if (carried(otmp)) {
        useup(otmp);
    } else {
        useupf(otmp, 1);
    }
}

/**
 * C ref: eat.c doeat_nonfood — one-turn non-FOOD meal for poly diets.
 * Branch envelope: nutrition from quan/weight/oc_nutrition; vegan/
 * vegetarian conduct for leather/bone/dragon_hide/wax; cursed rottenfood;
 * poisoned weapon; delicious pline; eatspecial.
 * Named omissions: SCR_MAIL; livelog first-time conduct.
 */
async function doeat_nonfood(otmp) {
    if (!game.context) game.context = {};
    game.context.victual = {
        piece: otmp,
        o_id: otmp.o_id,
        usedtime: 0,
        eating: 1,
        canchoke: (game.u?.uhs | 0) === SATIATED ? 1 : 0,
        fullwarn: 0,
        doreset: 0,
        reqtime: 1,
        nmod: 0,
    };

    let basenutrit;
    let nodelicious = false;
    if (otmp.oclass === COIN_CLASS) {
        const quan = otmp.quan || 0;
        basenutrit = quan > 200000 ? 2000 : Math.trunc(quan / 100);
    } else if (otmp.oclass === BALL_CLASS || otmp.oclass === CHAIN_CLASS) {
        basenutrit = weight(otmp);
    } else {
        basenutrit = game.objects?.[otmp.otyp]?.oc_nutrition ?? 0;
    }
    game.context.victual.nmod = basenutrit;

    if (!game.u.uconduct) game.u.uconduct = {};
    game.u.uconduct.food = (game.u.uconduct.food | 0) + 1;

    const material = game.objects?.[otmp.otyp]?.oc_material ?? 0;
    if (material === MAT_LEATHER || material === MAT_BONE
        || material === MAT_DRAGON_HIDE || material === MAT_WAX) {
        game.u.uconduct.unvegan = (game.u.uconduct.unvegan | 0) + 1;
        if (material !== MAT_WAX) violated_vegetarian();
    }

    if (otmp.cursed) {
        await rottenfood(otmp);
        nodelicious = true;
    } else if (material === MAT_PAPER) {
        nodelicious = true;
    }

    if (otmp.oclass === WEAPON_CLASS && otmp.opoisoned) {
        await pline('Ecch - that must have been poisonous!');
        const poisRes = !!(game.u?.HPoison_resistance || game.u?.EPoison_resistance
            || game.u?.Poison_resistance);
        if (!poisRes) {
            await poison_strdmg(rnd(4), rnd(15));
        } else {
            await pline('You seem unaffected by the poison.');
        }
    } else if (!nodelicious) {
        const artSkip = obj_is_pname(otmp)
            && ((otmp.oartifact | 0) < ART_ORB_OF_DETECTION);
        const noun = otmp.oclass === COIN_CLASS
            ? foodword(otmp)
            : singular(otmp, xname);
        await pline(`${artSkip ? '' : 'This '}${noun} is delicious!`);
    }
    await eatspecial();
    return 1;
}

/**
 * C ref: eat.c eating_conducts — food/unvegan/unvegetarian counters.
 * Livelog first-time messages deferred.
 */
function eating_conducts(pd) {
    if (!game.u.uconduct) game.u.uconduct = {};
    game.u.uconduct.food = (game.u.uconduct.food | 0) + 1;
    if (!vegan(pd)) {
        game.u.uconduct.unvegan = (game.u.uconduct.unvegan | 0) + 1;
    }
    if (!vegetarian(pd)) {
        violated_vegetarian();
    }
}

/**
 * C ref: eat.c maybe_cannibal — own-species / poly-form / lycanthrope.
 * Returns true when cannibalism penalty applied (luck + aggravate).
 */
async function maybe_cannibal(pm, allowmsg) {
    const u = game.u || {};
    const moves = game.moves | 0;
    // C: static ate_brains — one penalty per turn (mind flayer multi-hit)
    if ((game.context?.eat_ate_brains | 0) === moves) return false;
    if (!game.context) game.context = {};
    game.context.eat_ate_brains = moves;

    const fptr = mons(pm);
    if (!fptr) return false;
    if (!CANNIBAL_ALLOWED()
        && (your_race(fptr)
            || (Upolyd(u) && same_race(hero_form_data(), fptr))
            || (ismnum(u.ulycn) && were_beastie(pm) === (u.ulycn | 0)))) {
        if (allowmsg) {
            if (Upolyd(u) && your_race(fptr)) {
                await pline('You have a bad feeling deep inside.');
            }
            await pline('You cannibal!  You will regret this!');
        }
        u.HAggravate_monster = (u.HAggravate_monster | 0) | FROMOUTSIDE;
        change_luck(-rn1(4, 2)); // -5..-2
        return true;
    }
    return false;
}

/**
 * C ref: eat.c fix_petrification — clear Stoned via make_stoned(0).
 */
async function fix_petrification() {
    const hallu = !!(game.u?.Hallucination || game.u?.HHallucination);
    let buf;
    if (hallu) {
        const fine = acurr(A_CHA) > 15 ? 'fine ' : '';
        buf = `What a pity--you just ruined a future piece of ${fine}art!`;
    } else {
        buf = 'You feel limber!';
    }
    await make_stoned(0, buf, 0, '');
}

/**
 * C ref: eat.c cprefx — pre-corpse / pre-tin-meat effects.
 * Branch envelope: maybe_cannibal; flesh_petrifies → stone / polymon;
 * dog/cat aggravate; lizard unstone; Death/Pestilence/Famine done +
 * revive_corpse(victual.piece) when CORPSE (not tin) then zero_victual
 * (D-1081); green slime; acidic unstone.
 * Named omissions: polymon failure detail when stone-golem form
 * unavailable.
 */
async function cprefx(pm) {
    await maybe_cannibal(pm, true);

    const ptr = mons(pm);
    if (ptr && flesh_petrifies(ptr)) {
        const u = game.u || {};
        const Stone_resistance = !!(u.HStone_resistance || u.EStone_resistance
            || u.Stone_resistance);
        const youData = hero_form_data();
        let polyed = false;
        if (!Stone_resistance && poly_when_stoned(youData)) {
            polyed = !!(await polymon(PM_STONE_GOLEM));
        }
        if (!Stone_resistance && !polyed) {
            if (game.context?.tin?.tin) {
                use_up_tin(game.context.tin.tin);
            }
            if (!game.killer) game.killer = { name: '', format: 0 };
            const meat = pmnames[pm]?.[NEUTRAL] || 'strange';
            game.killer.name = `tasting ${meat} meat`;
            game.killer.format = KILLED_BY;
            await pline('You turn to stone.');
            await done(STONING);
            if (game.context?.victual?.piece) {
                game.context.victual.eating = 0;
            }
            return;
        }
    }

    switch (pm | 0) {
    case PM_LITTLE_DOG:
    case PM_DOG:
    case PM_LARGE_DOG:
    case PM_KITTEN:
    case PM_HOUSECAT:
    case PM_LARGE_CAT:
        if (!CANNIBAL_ALLOWED()) {
            const nm = pmnames[pm]?.[NEUTRAL] || 'animal';
            await You_feel(`that eating the ${nm} was a bad idea.`);
            const u = game.u || (game.u = {});
            u.HAggravate_monster = (u.HAggravate_monster | 0) | FROMOUTSIDE;
        }
        break;
    case PM_LIZARD:
        if (game.u?.Stoned) await fix_petrification();
        break;
    case PM_DEATH:
    case PM_PESTILENCE:
    case PM_FAMINE: {
        await pline('Eating that is instantly fatal.');
        if (!game.killer) game.killer = { name: '', format: 0 };
        const nm = pmnames[pm]?.[NEUTRAL] || 'a Rider';
        game.killer.name = `unwisely ate the body of ${nm}`;
        game.killer.format = NO_KILLER_PREFIX;
        await done(DIED);
        // C: life-saving needed to reach here
        exercise(A_WIS, false);
        // revive an actual corpse; can't do that if it was a tin
        const piece = game.context?.victual?.piece;
        if (piece
            && (piece.otyp | 0) === CORPSE
            && await revive_corpse(piece)) {
            game.context.victual = {}; // C: zero_victual
        }
        return;
    }
    case PM_GREEN_SLIME: {
        const u = game.u || {};
        const Slimed = !!(u.Slimed & TIMEOUT);
        const Unchanging = !!(u.Unchanging || u.HUnchanging || u.EUnchanging);
        if (!Slimed && !Unchanging && !slimeproof(hero_form_data())) {
            await pline("You don't feel very well.");
            await make_slimed(10, null);
            delayed_killer(SLIMED, KILLED_BY_AN, '');
        }
    }
    // FALLTHROUGH
    default:
        if (ptr && acidic(ptr) && (game.u?.Stoned)) {
            await fix_petrification();
        }
        break;
    }
}

/**
 * C ref: eat.c consume_tin — open tin contents + nutrition / spinach.
 * Branch envelope: ordinary meat tin + spinach; otrapped → b_trapped;
 * cursed trap roll burns rn2; costly_tin shop bill; Fixed_abil
 * Popeye Olive/Bluto deferred (!Fixed_abil → Popeye).
 */
async function consume_tin(mesg) {
    const always_eat = metallivorous(hero_form_data());
    let tin = game.context?.tin?.tin;
    if (!tin) return;

    const r = tin_variety(tin, false);
    // C: otrapped || (cursed && r != HOMEMADE && !rn2(8)) → b_trapped
    if (tin.otrapped || (tin.cursed && r !== HOMEMADE_TIN && !rn2(8))) {
        await b_trapped('tin', NO_PART);
        tin = await costly_tin(COST_DSTROY);
        use_up_tin(tin);
        return;
    }

    await pline(mesg);

    if (r !== SPINACH_TIN) {
        let mnum = tin.corpsenm | 0;
        if (mnum === NON_PM) {
            const hallu = !!(game.u?.Hallucination || game.u?.HHallucination);
            if (hallu) {
                await pline(`It's full of ${
                    rn2(2) ? 'air elemental souffle' : 'dehydrated water'
                }.`);
            } else {
                await pline('It turns out to be empty.');
            }
            observe_object(tin);
            tin.known = 1;
            tin = await costly_tin(COST_OPEN);
            use_up_tin(tin);
            if (always_eat) lesshungry(5);
            return;
        }

        let which = 0; // 0 plural, 1 as-is, 2 "the"
        let what;
        const hallu = !!(game.u?.Hallucination || game.u?.HHallucination);
        const stoneRes = !!(game.u?.HStone_resistance || game.u?.Stone_resistance);
        if ((mnum === PM_COCKATRICE || mnum === PM_CHICKATRICE)
            && (stoneRes || hallu)) {
            what = 'chicken';
            which = 1;
        } else if (hallu) {
            what = rndmonnam(null);
        } else {
            what = pmnames[mnum]?.[2] || 'creature';
            const ptr = mons(mnum);
            if (the_unique_pm(ptr)) which = 2;
            else if (type_is_pname(ptr)) which = 1;
        }
        if (which === 0) what = makeplural(what);
        else if (which === 2) what = the(what);

        if (!always_eat) {
            await pline(`It smells like ${what}.`);
            if ((await yn_function('Eat it?', 'yn', 'n')) === 'n') {
                if (game.flags?.verbose) {
                    await pline('You discard the open tin.');
                }
                if (!hallu) {
                    observe_object(tin);
                    tin.known = 1;
                }
                tin = await costly_tin(COST_OPEN);
                use_up_tin(tin);
                return;
            }
        }

        if (!game.context) game.context = {};
        game.context.victual = {};

        const ptr = mons(mnum);
        const meat = pmnames[mnum]?.[2] || 'creature';
        await pline(`You consume ${tintxts[r].txt} ${meat}.`);
        eating_conducts(ptr);
        observe_object(tin);
        tin.known = 1;
        tin = game.context.tin.tin = await costly_tin(COST_OPEN);

        await cprefx(mnum);
        if (game.context?.tin?.tin) await cpostfx(mnum);
        if (!game.context?.tin?.tin) return;

        if (tintxts[r].nut < 0) {
            await make_vomiting(rn1(15, 10), false);
        } else {
            let nutamt = tintxts[r].nut | 0;
            if (r === HOMEMADE_TIN) {
                const cnut = ptr?.cnutrit | 0;
                if (nutamt > cnut) nutamt = cnut;
            }
            if (always_eat) nutamt += 5;
            use_up_tin(tin);
            tin = null;
            lesshungry(nutamt);
        }

        if (tintxts[r].greasy) {
            const alreadyglib = (game.u?.Glib | 0) & TIMEOUT;
            make_glib(alreadyglib + rn1(11, 5));
            await pline(
                `Eating ${tintxts[r].txt} food made your ${
                    fingers_or_gloves(true)
                } ${alreadyglib ? 'even more' : 'very'} slippery.`,
            );
        }
    } else {
        // spinach
        const hallu = !!(game.u?.Hallucination || game.u?.HHallucination);
        const blind = !!(game.u?.Blind || (game.u?.HBlinded | 0));
        if (tin.cursed) {
            await pline(
                `It contains some decaying${blind ? '' : ' '}${
                    blind ? '' : 'green'
                } substance.`,
            );
        } else {
            await pline('It contains spinach.');
            observe_object(tin);
            tin.known = 1;
        }

        if (!always_eat
            && (await yn_function('Eat it?', 'yn', 'n')) === 'n') {
            if (game.flags?.verbose) {
                await pline('You discard the open tin.');
            }
            tin = await costly_tin(COST_OPEN);
            use_up_tin(tin);
            return;
        }

        if (!game.u.uconduct) game.u.uconduct = {};
        game.u.uconduct.food = (game.u.uconduct.food | 0) + 1;
        if (!tin.cursed) {
            // Fixed_abil Olive/Bluto deferred — always Popeye like !Fixed_abil
            await pline(
                `This makes you feel like ${
                    hallu ? "Swee'pea" : 'Popeye'
                }!`,
            );
        }
        await gainstr(tin, 0, false);

        tin = game.context.tin.tin = await costly_tin(COST_OPEN);
        let nutamt = tin.blessed ? 600
            : !tin.cursed ? (400 + rnd(200))
                : (200 + rnd(400));
        if (always_eat) nutamt += 5;
        use_up_tin(tin);
        tin = null;
        lesshungry(nutamt);
    }
    if (tin) use_up_tin(tin);
}

/**
 * C ref: eat.c opentin — occupation tick while opening a tin.
 * @returns {number} 1 continue, 0 done
 */
async function opentin() {
    const tin = game.context?.tin?.tin;
    const u = game.u || {};
    if (!carried(tin)
        && (!obj_here(tin, u.ux | 0, u.uy | 0) || !can_reach_floor(true))) {
        return 0;
    }
    game.context.tin.usedtime = (game.context.tin.usedtime | 0) + 1;
    if ((game.context.tin.usedtime | 0) >= 50) {
        await pline('You give up your attempt to open the tin.');
        return 0;
    }
    if ((game.context.tin.usedtime | 0) < (game.context.tin.reqtime | 0)) {
        return 1;
    }
    await consume_tin('You succeed in opening the tin.');
    return 0;
}

/**
 * C ref: eat.c start_tin — begin opening (immediate or occupation).
 */
async function start_tin(otmp) {
    let mesg = null;
    let tmp = 0;
    const form = hero_form_data();
    const u = game.u || {};
    const uwep = u.uwep;
    let need_no_opener = false;

    if (metallivorous(form)) {
        mesg = 'You bite right into the metal tin...';
        tmp = 0;
    } else if (cantwield(form)) {
        await pline('You cannot handle the tin properly to open it.');
        return;
    } else if (otmp.blessed) {
        tmp = (uwep && uwep.blessed && uwep.otyp === TIN_OPENER) ? 0 : rn2(2);
        if (!tmp) mesg = 'The tin opens like magic!';
        else await pline('The tin seems easy to open.');
    } else if (uwep) {
        switch (uwep.otyp) {
        case TIN_OPENER:
            mesg = 'You easily open the tin.';
            tmp = rn2(uwep.cursed ? 3 : !uwep.blessed ? 2 : 1);
            break;
        case DAGGER:
        case SILVER_DAGGER:
        case ELVEN_DAGGER:
        case ORCISH_DAGGER:
        case ATHAME:
        case KNIFE:
        case STILETTO:
        case CRYSKNIFE:
            tmp = 3;
            break;
        case PICK_AXE:
        case AXE:
            tmp = 6;
            break;
        default:
            need_no_opener = true;
            break;
        }
        if (!need_no_opener) {
            await pline(`Using ${yobjnam(uwep)} you try to open the tin.`);
        }
    } else {
        need_no_opener = true;
    }

    if (need_no_opener) {
        await pline('It is not so easy to open this tin.');
        if (u.Glib) {
            await pline(
                `The tin slips from your ${fingers_or_gloves(false)}.`,
            );
            let tin = otmp;
            if ((tin.quan || 1) > 1) tin = splitobj(tin, 1) || tin;
            if (carried(tin)) await dropx(tin);
            else stackobj(tin);
            return;
        }
        tmp = rn1(
            1 + Math.trunc(500 / ((acurr(A_DEX) | 0) + (acurrstr() | 0))),
            10,
        );
    }

    if (!game.context) game.context = {};
    game.context.tin = {
        tin: otmp,
        o_id: otmp.o_id,
        reqtime: 0,
        usedtime: 0,
    };
    if (!tmp) {
        await consume_tin(mesg);
    } else {
        game.context.tin.reqtime = tmp;
        game.context.tin.usedtime = 0;
        set_occupation(opentin, 'opening the tin');
    }
}

/** C invent getobj ranks (hack.h) — match apply.js / C. */
const GETOBJ_EXCLUDE = -3;
const GETOBJ_EXCLUDE_NONINVENT = -2;
const GETOBJ_EXCLUDE_SELECTABLE = 0;
const GETOBJ_DOWNPLAY = 1;
const GETOBJ_SUGGEST = 2;

/**
 * C eat.c getobj_else — floorfood declined a floor candidate; tin_ok(null)
 * then EXCLUDE_NONINVENT so empty invent says "anything else to tin".
 */
let getobj_else = 0;

/**
 * C ref: apply.c tinnable — !oeaten && mons[corpsenm].cnutrit.
 * In eat.js so tin_ok/floorfood stay acyclic (C exports from apply.c).
 */
export function tinnable(corpse) {
    if (!corpse || corpse.oeaten) return false;
    const ptr = mons(corpse.corpsenm);
    if (!ptr || !ptr.cnutrit) return false;
    return true;
}

/**
 * C ref: eat.c tin_ok — FOOD only; CORPSE+tinnable SUGGEST else
 * EXCLUDE_SELECTABLE; null → EXCLUDE or EXCLUDE_NONINVENT.
 */
function tin_ok(obj) {
    if (!obj) return getobj_else ? GETOBJ_EXCLUDE_NONINVENT : GETOBJ_EXCLUDE;
    if (obj.oclass !== FOOD_CLASS) return GETOBJ_EXCLUDE;
    if ((obj.otyp | 0) !== CORPSE || !tinnable(obj)) {
        return GETOBJ_EXCLUDE_SELECTABLE;
    }
    return GETOBJ_SUGGEST;
}

/**
 * C ref: invent.c getobj("tin", tin_ok, GETOBJ_NOFLAGS).
 * Named omit: ?/* pickinv menu; sortloot; compactify '-' hands (tin_ok
 * null is never SUGGEST).
 */
async function getobj_tin() {
    const word = 'tin';
    const q = game._cmdq_canned;
    if (q?.length) {
        const head = q[0];
        if (head && typeof head === 'object' && head.typ === 'key') {
            q.shift();
            const ch = typeof head.key === 'string'
                ? head.key
                : String.fromCharCode(head.key);
            for (const o of game.invent || []) {
                if (o.invlet === ch) {
                    const v = tin_ok(o);
                    if (v === GETOBJ_SUGGEST || v === GETOBJ_DOWNPLAY) return o;
                }
            }
            game._cmdq_canned = [];
            return null;
        }
    }

    const suggest_lets = () => {
        const lets = [];
        for (const o of game.invent || []) {
            if (o?.invlet && tin_ok(o) === GETOBJ_SUGGEST) lets.push(o.invlet);
        }
        lets.sort((a, b) => a.charCodeAt(0) - b.charCodeAt(0));
        return lets.join('');
    };

    for (;;) {
        await flush_topl_more();
        const rawLets = suggest_lets();
        if (!rawLets) {
            const else_ = getobj_else ? 'else ' : '';
            await pline(`You don't have anything ${else_}to ${word}.`);
            return null;
        }
        const lets = rawLets.length > 5 ? compactify_invlets(rawLets) : rawLets;
        const query = `What do you want to ${word}? [${lets} or ?*]`;
        const ch = await yn_function(query, null, '\0');
        if (ch === '\x1b' || ch === ' ' || ch === '\n' || ch === '\r') {
            if (game.flags?.verbose !== false) await pline('Never mind.');
            return null;
        }
        if (ch === '?' || ch === '*') {
            await pline('Never mind.');
            return null;
        }
        const otmp = (game.invent || []).find((o) => o.invlet === ch);
        if (!otmp) {
            await pline("You don't have that object.");
            continue;
        }
        const v = tin_ok(otmp);
        if (otmp.oclass === COIN_CLASS && v <= GETOBJ_EXCLUDE) {
            await pline(`You cannot ${word} gold.`);
            return null;
        }
        if (v === GETOBJ_EXCLUDE) {
            await pline(`That is a silly thing to ${word}.`);
            return null;
        }
        return otmp;
    }
}

/**
 * C ref: eat.c floorfood("tin", 2) — yn tinnable floor corpses, else
 * invent getobj tin_ok. Not feeding: usteed does not skip floor.
 * Named omit: will_feel_cockatrice; sacrifice arm; safe_qbuf fallback.
 */
async function floorfood_tin() {
    const u = game.u || {};
    const ux = u.ux | 0;
    const uy = u.uy | 0;
    const form = hero_form_data();
    getobj_else = 0;
    const skip_floor = !!(game.flags?.menu_requested
        || !can_reach_floor(true)
        || (is_pool_or_lava(ux, uy)
            && (Wwalking() || is_clinger(form)
                || (Flying() && !Breathless()))));
    if (!skip_floor) {
        for (let otmp = objects_at(ux, uy); otmp; otmp = otmp.nexthere) {
            if ((otmp.otyp | 0) !== CORPSE || !tinnable(otmp)) continue;
            const one = (otmp.quan || 1) === 1;
            const qbuf = `There ${one ? 'is' : 'are'} ${doname(otmp)} here; tin ${one ? 'it' : 'one'}?`;
            const c = await yn_function(qbuf, 'ynq', 'n');
            if (c === 'y') return otmp;
            if (c === 'q') return null;
            getobj_else++;
        }
    }
    let otmp = await getobj_tin();
    if (otmp && ((otmp.otyp | 0) !== CORPSE || !tinnable(otmp))) {
        await pline("You can't tin that!");
        otmp = null;
    }
    getobj_else = 0;
    return otmp;
}

/**
 * C ref: eat.c floorfood(verb, corpsecheck). Eat (0) and tin (2);
 * sacrifice (1) deferred.
 */
export async function floorfood(verb, corpsecheck) {
    if ((corpsecheck | 0) === 0) return floorfood_eat();
    if ((corpsecheck | 0) === 2) return floorfood_tin();
    return null;
}

/** C ref: eat.c tinopen_ok — SUGGEST TIN only. */
function tinopen_ok(obj) {
    if (obj && (obj.otyp | 0) === TIN) return GETOBJ_SUGGEST;
    return GETOBJ_EXCLUDE;
}

/** Invent letters with tin SUGGEST (C getobj "open"). */
function tinopen_lets() {
    const lets = [];
    for (const o of game.invent || []) {
        if (o?.invlet && tinopen_ok(o) === GETOBJ_SUGGEST) lets.push(o.invlet);
    }
    lets.sort((a, b) => a.charCodeAt(0) - b.charCodeAt(0));
    return lets.join('');
}

/**
 * C ref: invent.c getobj("open", tinopen_ok, GETOBJ_NOFLAGS).
 */
async function getobj_tinopen() {
    for (;;) {
        await flush_topl_more();
        const lets = tinopen_lets();
        if (!lets) {
            await pline("You don't have anything to open.");
            return null;
        }
        const query = `What do you want to open? [${lets} or ?*]`;
        const ch = await yn_function(query, null, '\0');
        if (ch === '\x1b' || ch === ' ' || ch === '\n' || ch === '\r') {
            if (game.flags?.verbose !== false) await pline('Never mind.');
            return null;
        }
        if (ch === '?' || ch === '*') {
            await pline('Never mind.');
            return null;
        }
        const otmp = (game.invent || []).find((o) => o.invlet === ch);
        if (!otmp) {
            await pline("You don't have that object.");
            continue;
        }
        if (tinopen_ok(otmp) === GETOBJ_EXCLUDE) {
            await pline('You cannot open that!');
            return null;
        }
        return otmp;
    }
}

/** C invent.c carrying — first invent[] match by otyp. */
function carrying_otyp(otyp) {
    return (game.invent || []).find((o) => (o.otyp | 0) === (otyp | 0)) || null;
}

/**
 * C ref: eat.c use_tin_opener — apply tin opener; wield if needed; start_tin.
 * Named omit: safe_qbuf doname/thesimpleoname polish (simple qbuf).
 * @returns {number} ECMD_*
 */
export async function use_tin_opener(obj) {
    let res = ECMD_OK;
    if (!carrying_otyp(TIN)) {
        await pline('You have no tin to open.');
        return ECMD_OK;
    }
    const u = game.u || {};
    if (obj !== u.uwep) {
        if (obj.cursed && obj.bknown) {
            const qbuf = `Really wield ${doname(obj) || thesimpleoname(obj) || 'that'}?`;
            if ((await yn_function(qbuf, 'ynq', 'n')) !== 'y') {
                return ECMD_OK;
            }
        }
        if (!(await wield_tool(obj, 'use'))) return ECMD_OK;
        res = ECMD_TIME;
    }
    const otmp = await getobj_tinopen();
    if (!otmp) return res | ECMD_CANCEL;
    await start_tin(otmp);
    return ECMD_TIME;
}

/**
 * C ref: eat.c doeat() — food-class path incl. TIN + multi-turn rations.
 * Ordinary rotten food via rottenfood + Hear_again (D-0911).
 * @returns {number} 0 = no turn (ECMD_OK), 1 = took time
 */
export async function doeat() {
    // C: floorfood("eat", 0) — floor yn then invent getobj
    const otmp0 = await floorfood_eat();
    if (!otmp0) return 0;

    // C ref: eat.c doeat — check_capacity((char *)0) before is_edible
    // (hack.c: near_capacity >= EXT_ENCUMBER → You_cant carry stuff).
    if (near_capacity() >= EXT_ENCUMBER) {
        await pline("You can't do that while carrying so much stuff.");
        return 0;
    }

    // C: floorfood &hands_obj → metallivore chewing IRONBARS via still_chewing
    if (otmp0 === hands_obj) {
        const u = game.u || {};
        const loc = game.level?.at(u.ux | 0, u.uy | 0);
        if ((await still_chewing(u.ux | 0, u.uy | 0))
            && loc && loc.typ === IRONBARS) {
            await pline('You pause to swallow.');
        }
        return 1;
    }

    if (otmp0.oclass === COIN_CLASS && !is_edible(otmp0)) {
        await pline('You cannot eat that!');
        return 0;
    }
    if (!is_edible(otmp0)) {
        await pline('You cannot eat that!');
        return 0;
    }

    // C: worn armor/tool/amulet/saddle — rings allowed
    const worn = otmp0.owornmask | 0;
    if (worn & (W_ARMOR | W_TOOL | W_AMUL | W_SADDLE)) {
        await pline("You can't eat something you're wearing.");
        return 0;
    }

    // KMH — Slow digestion ring is indigestible
    if (otmp0.otyp === RIN_SLOW_DIGESTION) {
        await pline('This ring is indigestible!');
        await rottenfood(otmp0);
        return 1;
    }

    if (otmp0.oclass !== FOOD_CLASS) {
        return doeat_nonfood(otmp0);
    }

    // C: tins are a special case — start_tin; conduct inside consume_tin
    if (otmp0.otyp === TIN) {
        await start_tin(otmp0);
        return 1;
    }

    // KMH, conduct
    if (!game.u.uconduct) game.u.uconduct = {};
    game.u.uconduct.food = (game.u.uconduct.food | 0) + 1;

    const already_partly_eaten = !!otmp0.oeaten;
    let otmp = await touchfood(otmp0);
    if (!otmp) return 1;

    if (!game.context) game.context = {};
    game.context.victual = {
        piece: otmp,
        o_id: otmp.o_id,
        usedtime: 0,
        eating: 0,
        canchoke: 0,
        fullwarn: 0,
        doreset: 0,
        reqtime: 0,
        nmod: 0,
    };

    let dont_start = false;

    if (otmp.otyp === CORPSE || otmp.globby) {
        const tmp = await eatcorpse(otmp);
        if (tmp === 2) {
            game.context.victual = {};
            return 1;
        }
        if (tmp) dont_start = true;
        // eatcorpse set reqtime / may have modified oeaten
    } else {
        const oc = game.objects?.[otmp.otyp];
        game.context.victual.reqtime = oc?.oc_delay ?? 1;

        // C: rotten check — FORTUNE_COOKIE skipped; nonrotting_food skips age gate
        const moves = game.moves ?? 0;
        const age = otmp.age ?? moves;
        if (otmp.otyp !== FORTUNE_COOKIE
            && (otmp.cursed
                || (!nonrotting_food(otmp.otyp)
                    && (moves - age) > (otmp.blessed ? 50 : 30)
                    && (otmp.orotten || !rn2(7))))) {
            if (await rottenfood(otmp)) {
                otmp.orotten = true;
                dont_start = true;
            }
            consume_oeaten(otmp, 1); /* oeaten >>= 1 */
        } else if (!already_partly_eaten) {
            if (!(await fprefx(otmp))) {
                game.context.victual = {};
                return 1;
            }
        } else {
            const req = game.context.victual.reqtime;
            await pline(
                `You ${req === 1 ? 'eat' : 'begin eating'} ${doname(otmp)}.`,
            );
        }
    }

    const basenutrit = obj_nutrition(otmp) | 0;
    const oeaten = otmp.oeaten | 0;
    if (basenutrit === 0) {
        game.context.victual.reqtime = 0;
    } else {
        game.context.victual.reqtime = rounddiv(
            (game.context.victual.reqtime | 0) * oeaten,
            basenutrit,
        );
    }
    const reqtime = game.context.victual.reqtime | 0;
    if (reqtime === 0 || oeaten === 0) {
        game.context.victual.nmod = 0;
    } else if (oeaten >= reqtime) {
        game.context.victual.nmod = -Math.trunc(oeaten / reqtime);
    } else {
        game.context.victual.nmod = reqtime % oeaten;
    }
    game.context.victual.canchoke = 0; // u.uhs == SATIATED deferred

    if (dont_start) {
        otmp.owt = weight(otmp);
        return 1;
    }

    // C: start_eating handles reqtime>1 via eatfood occupation (rations etc.)
    await start_eating(otmp, already_partly_eaten);
    return 1;
}
