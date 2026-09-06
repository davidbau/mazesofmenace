// polyself.js — Hero polymorph (partial).
// C ref: polyself.c / wizcmds.c wiz_polyself

import { game } from './gstate.js';
import { rn2, rn1, d, rnd } from './rng.js';
import { dist2 } from './hacklib.js';
import {
    pline, urgent_pline, newsym, see_monsters, impossible,
} from './display.js';
import { getlin, yn_function } from './getline.js';
import { getdir } from './lock.js';
import { an, set_body_part } from './objnam.js';
import {
    pmname, mon_nam, s_suffix, Ugender,
} from './do_name.js';
import { attacktype_fordmg, killed } from './uhitm.js';
import {
    AT_SPIT, AT_GAZE, AD_BLND, AD_DRST, AD_ACID,
} from './mhitm.js';
import { mksobj } from './mkobj.js';
import { throwit } from './dothrow.js';
import { were_summon } from './were.js';
import { unpunish } from './read.js';
import { surface, split_mon } from './sit.js';
import { dryup } from './fountain.js';
import { aggravate } from './wizard.js';
import { wakeup } from './mon.js';
import { Punished } from './pray.js';
import { name_to_mon, set_mon_data } from './mondata.js';
import {
    exercise, acurr, A_STR, A_CON, A_WIS, adjabil, redist_attr, newhp,
} from './attrib.js';
import { newpw, rndexp, setuhpmax } from './exper.js';
import { find_ac } from './u_init.js';
import {
    setworn, Helmet_off, Gloves_off, Boots_off, Shield_off,
} from './do_wear.js';
import { dropx, canletgo, make_blinded } from './do.js';
import { setuwep, setuswapwep } from './wield.js';
import { races } from './roles.js';
import { encumber_msg } from './invent.js';
import { losehp, nomul, is_pool } from './hack.js';
import { finish_losehp_done, done } from './end.js';
import { steed_vs_stealth } from './steed.js';
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
    is_golem,
    is_unicorn,
    strongmonst,
    bigmonst,
    humanoid,
    is_whirly,
    noncorporeal,
    nohands,
    verysmall,
    is_flyer,
    is_floater,
    is_vampire,
    is_vampshifter,
    is_were,
    webmaker,
    is_hider,
    hides_under,
    is_mind_flayer,
    mindless,
    telepathic,
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
} from './monsters.js';
import {
    POLY_CONTROLLED,
    POLY_LOW_CTRL,
    POLY_MONSTER,
    POLY_REVERT,
    NON_PM,
    LOW_PM,
    Upolyd,
    DIED,
    ECMD_OK,
    ECMD_TIME,
    MALE,
    FEMALE,
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
    FIRE_RES,
    COLD_RES,
    SLEEP_RES,
    DISINT_RES,
    SHOCK_RES,
    POISON_RES,
    ACID_RES,
    STONE_RES,
    KILLED_BY_AN,
    BOLT_LIM,
    ECMD_CANCEL,
    IS_FOUNTAIN,
    hidespinchars,
    ismnum,
    POLYMORPH_CONTROL,
    UNCHANGING,
    I_SPECIAL,
    TT_PIT,
    NO_PART, ARM, EYE, FINGER, FINGERTIP, FOOT, HAND, HANDED,
    HEAD, LEG, TOE, NOSE, HAIR,
} from './const.js';
import {
    PM_HUMAN,
    PM_ORC,
    PM_ELF,
    PM_DWARF,
    PM_GNOME,
    SPECIAL_PM,
    monsterNames,
} from './generated/monsters_data.js';
import { TOOL_CLASS, objects, objectNames } from './objects.js';

const GRAY_DRAGON_SCALES = objectNames.indexOf('GRAY_DRAGON_SCALES');
const YELLOW_DRAGON_SCALES = objectNames.indexOf('YELLOW_DRAGON_SCALES');
const GRAY_DRAGON_SCALE_MAIL = objectNames.indexOf('GRAY_DRAGON_SCALE_MAIL');
const YELLOW_DRAGON_SCALE_MAIL = objectNames.indexOf('YELLOW_DRAGON_SCALE_MAIL');

const PM_GRAY_DRAGON = monsterNames.indexOf('PM_GRAY_DRAGON');
const PM_URUK_HAI = monsterNames.indexOf('PM_URUK_HAI');
const PM_ORC_CAPTAIN = monsterNames.indexOf('PM_ORC_CAPTAIN');
const PM_OWLBEAR = monsterNames.indexOf('PM_OWLBEAR');
const PM_MUMAK = monsterNames.indexOf('PM_MUMAK');
const PM_MASTODON = monsterNames.indexOf('PM_MASTODON');
const PM_SHARK = monsterNames.indexOf('PM_SHARK');
const PM_JELLYFISH = monsterNames.indexOf('PM_JELLYFISH');
const PM_KRAKEN = monsterNames.indexOf('PM_KRAKEN');
const PM_FLOATING_EYE = monsterNames.indexOf('PM_FLOATING_EYE');
const PM_GREMLIN = monsterNames.indexOf('PM_GREMLIN');
const BLINDING_VENOM = objectNames.indexOf('BLINDING_VENOM');
const ACID_VENOM = objectNames.indexOf('ACID_VENOM');
const PM_STONE_GOLEM = monsterNames.indexOf('PM_STONE_GOLEM');
const PM_AMOROUS_DEMON = monsterNames.indexOf('PM_AMOROUS_DEMON');
const PM_RAVEN = monsterNames.indexOf('PM_RAVEN');
const PM_KI_RIN = monsterNames.indexOf('PM_KI_RIN');
const PM_ROTHE = monsterNames.indexOf('PM_ROTHE');
const PM_STALKER = monsterNames.indexOf('PM_STALKER');

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

/** C ref: youprop.h Polymorph_control — H || E via flat + uprops. */
function Polymorph_control(u = game.u || {}) {
    const e = u.uprops?.[POLYMORPH_CONTROL];
    return !!((u.Polymorph_control || u.HPolymorph_control || u.EPolymorph_control)
        || (e?.intrinsic | 0) || (e?.extrinsic | 0));
}

/** C ref: youprop.h Unchanging — H || E via flat + uprops. */
function Unchanging(u = game.u || {}) {
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
    return !!(bigmonst(ptr) || ((ptr?.msize ?? 0) > MZ_SMALL && !humanoid(ptr)));
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
        return R ? (R.attrmax[A_STR] | 0) : 18 + 100; // STR18(100) fallback
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
 * C ref: polyself.c set_uasmon — point youmonst.data at mons[umonnum]
 * via set_mon_data (prorates u.umovement when new form is slower).
 * Named omissions: DRAIN_RES (uwep-suppressed resists_drli); ANTIMAGIC;
 * SICK_RES fungus/ghoul; STUNNED/HALLUC_RES/SEE_INVIS/TELEPAT/INFRAVISION/
 * INVIS/TELEPORT/TELEPORT_CONTROL/LEVITATION/SWIMMING/PASSES_WALLS/
 * REGENERATION/REFLECTING/BLND_RES; vamp cham; polysense;
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

    // C: PROPSET(FLYING, is_flyer(mdat) && !is_floater(mdat)) — D-0724
    // floating eye is flyer+floater; suppress Flying under Levitation.
    propset_fromform(FLYING, 'HFlying', is_flyer(mdat) && !is_floater(mdat));
    // C: PROPSET(BLINDED, !haseyes(mdat)) — eyeless forms (molds) Blind
    // so Monnam → "It"; long "The cockatrice …" lines were forcing
    // mid-turn --More-- that ate #version (D-0928 #1109).
    propset_fromform(BLINDED, 'HBlinded', !haseyes(mdat));

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
 */
function poly_gender() {
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
 * C ref: polyself.c polyman — revert to original race form after newman.
 * Envelope: restore macurr/mamax; clear mh/mtimedone; set_uasmon; find_ac;
 * newsym; pline; was_blind→make_blinded; see_monsters.
 * Named omissions: skinback; ugenocided; stick/mimic/twoweapon;
 * strangling; pool spoteffects; retouch_equipment/selftouch.
 */
async function polyman(fmt, arg) {
    const u = game.u || (game.u = {});
    const flags = game.flags || (game.flags = {});
    // C: was_blind = !!Blind before set_uasmon clears FROMFORM Blind
    const wasBlind = !!(((u.HBlinded | 0) || (u.EBlinded | 0))
        && !(u.BBlinded | 0)) || !!u.uroleplay?.blind;
    if (Upolyd(u)) {
        u.acurr = copyAttrBundle(u.macurr);
        u.amax = copyAttrBundle(u.mamax);
        u.umonnum = u.umonster | 0;
        flags.female = !!u.mfemale;
    }
    set_uasmon();
    u.mh = 0;
    u.mhmax = 0;
    u.mtimedone = 0;
    // skinback deferred
    u.uundetected = 0;
    find_ac();
    newsym(u.ux, u.uy);
    // C urgent_pline(fmt, arg) — fmt has one %s; overrides WIN_STOP
    await urgent_pline(String(fmt).replace('%s', arg));
    // C: was_blind && !Blind → set_itimeout(HBlinded,1); make_blinded(0,TRUE)
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
    see_monsters();
}

/**
 * C ref: polyself.c newman — fail-to-poly / force-human: level±2, sex
 * rn2(10), rndexp, redist_attr, HP/EN rebuild, hunger rn1(500,500),
 * then polyman.
 * Named omissions: Sick/Stoned clear; Slimed residual; death/lifesave;
 * livelog; retouch_equipment/selftouch; Polymorph_control uhp clamp.
 */
async function newman() {
    const u = game.u || (game.u = {});
    const flags = game.flags || (game.flags = {});
    const oldlvl = u.ulevel | 0;
    let newlvl = oldlvl + rn1(5, -2); // rn2(5)+(-2)
    if (newlvl > 127 || newlvl < 1) {
        // dead: unsuccessful polymorph — deferred; keep old level
        await pline("Your new form doesn't seem healthy enough to survive.");
        return;
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
 * C ref: polyself.c rehumanize — poly timeout / HP death while poly'd.
 * Envelope: Unchanging stuck arm deferred (caller handles timeout reset);
 * polyman return-to-race; nomul; botl/vision; encumber_msg.
 * Named omissions: emits_light del_light_source; uhp<1 done(DIED);
 * flying steed pline; retouch_equipment; selftouch; update_inventory.
 */
export async function rehumanize() {
    const u = game.u || {};
    // C: Unchanging && mh<1 → done(DIED); decline keeps creature form
    if (Unchanging(u) && (u.mh | 0) < 1) {
        if (!game.killer) game.killer = { name: '', format: 0 };
        game.killer.format = 2; // NO_KILLER_PREFIX
        game.killer.name = 'killed while stuck in creature form';
        await done(DIED);
        return;
    }

    const race = game.urace || {};
    const adj = race.adj || race.noun || 'human';
    await polyman('You return to %s form!', adj);
    nomul(0);
    if (game.flags) game.flags.botl = true;
    game.vision_full_recalc = 1;
    await encumber_msg();
    // retouch_equipment / selftouch deferred
}

/**
 * C ref: mondata.h cantwield — nohands || verysmall.
 * @param {object|null|undefined} ptr
 */
function cantwield(ptr) {
    return nohands(ptr) || verysmall(ptr);
}

/**
 * C ref: weapon.c weapon_descr subset for drop_weapon alone-message.
 * TOOL_CLASS → "tool" (magic lamp); else "weapon".
 * @param {object} obj
 */
function poly_weapon_descr(obj) {
    if (!obj) return 'weapon';
    if ((obj.oclass | 0) === TOOL_CLASS) return 'tool';
    const od = objects()?.[obj.otyp | 0];
    const nm = String(od?.oc_name || od?.name || '').toLowerCase();
    if (nm.includes('sword') || nm.includes('saber')) return 'sword';
    return 'weapon';
}

/**
 * C ref: polyself.c drop_weapon(alone) — cantwield forms must drop uwep.
 * Named omissions: twoweapon dual-drop detail; in_use defer; could_twoweap
 * untwoweapon arm; update_inventory side effects; Heart-of-Ahriman note.
 * @param {number} alone
 */
async function drop_weapon(alone) {
    const u = game.u || {};
    if (!u.uwep) return;
    const uptr = game.youmonst?.data;
    // C: if (!alone || cantwield(youmonst.data))
    if (alone && !cantwield(uptr)) {
        // could_twoweap untwoweapon deferred
        return;
    }
    const candropwep = await canletgo(u.uwep, '');
    let candropswapwep = true;
    if (u.twoweap && u.uswapwep) {
        candropswapwep = await canletgo(u.uswapwep, '');
    } else if (u.twoweap) {
        candropswapwep = false;
    }
    if (alone) {
        const what = (candropwep && candropswapwep) ? 'drop' : 'release';
        let which = poly_weapon_descr(u.uwep);
        if (u.twoweap && u.uswapwep) {
            const whichtoo = poly_weapon_descr(u.uswapwep);
            if (which !== whichtoo) which = 'weapon';
        }
        if ((u.uwep.quan || 1) !== 1 || u.twoweap) {
            // makeplural deferred — quan>1 uncommon for wielded tools
            if (!which.endsWith('s')) which += 's';
        }
        // C: the_your[!!strncmp(which,"corpse",6)] — "tool" → "your"
        const your = which.startsWith('corpse') ? 'the' : 'your';
        await pline(`You find you must ${what} ${your} ${which}!`);
    }
    if (u.twoweap && u.uswapwep) {
        const otmp = u.uswapwep;
        setuswapwep(null);
        if (!otmp.in_use && candropswapwep) await dropx(otmp);
    }
    {
        const otmp = u.uwep;
        setuwep(null);
        if (!otmp.in_use && candropwep) await dropx(otmp);
    }
}

/**
 * C ref: polyself.c break_armor — sliparm / breakarm gear shedding.
 * setworn(..., {skip_find_ac}) matches C worn.c (no find_ac); polymon
 * calls find_ac after encumber_msg so --More-- keeps cached AC.
 * Named omissions: mummy wrapping / alchemy smock / horns / flimsy-helm
 * pierce; racial_exception; donning cancel; end_burn DSM; ublindf
 * !has_head; surface()→"ground".
 */
async function break_armor() {
    const u = game.u || {};
    const uptr = game.youmonst?.data;
    if (!uptr) return;
    const noAc = { skip_find_ac: true };

    if (breakarm(uptr)) {
        const otmp = u.uarm;
        if (otmp) {
            await pline('You break out of your armor!');
            exercise(A_STR, false);
            setworn(null, W_ARM, noAc);
            // useup deferred — drop to floor like sliparm dropp
            await dropx(otmp);
        }
        const cloak = u.uarmc;
        if (cloak) {
            await pline('The clasp on your cloak breaks open!');
            setworn(null, W_ARMC, noAc);
            await dropx(cloak);
        }
        if (u.uarmu) {
            const shirt = u.uarmu;
            await pline('Your shirt rips to shreds!');
            setworn(null, W_ARMU, noAc);
            await dropx(shirt);
        }
    } else if (sliparm(uptr)) {
        const otmp = u.uarm;
        if (otmp) {
            await pline('Your armor falls around you!');
            setworn(null, W_ARM, noAc);
            // C dropp→dropx→dropz→encumber_msg mid-break_armor (before gloves)
            await dropx(otmp);
        }
        const cloak = u.uarmc;
        if (cloak) {
            if (is_whirly(uptr)) {
                await pline('Your cloak falls, unsupported!');
            } else {
                await pline('You shrink out of your cloak!');
            }
            setworn(null, W_ARMC, noAc);
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
    // C: has_horns helm pierce / drop — deferred (named omit)

    // C: nohands || verysmall → gloves, shield, helm
    if (nohands(uptr) || verysmall(uptr)) {
        const gloves = u.uarmg;
        if (gloves) {
            // C: Drop weapon along with gloves
            await pline(`You drop your gloves${u.uwep ? ' and weapon' : ''}!`);
            await drop_weapon(0);
            Gloves_off();
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
            // C: helm_simple_name + surface() — "helm" / "ground" stand-in
            await pline('Your helm falls to the ground!');
            Helmet_off();
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
    // C: ublindf without has_head — deferred
}

/**
 * C ref: polyself.c polymon — become mntmp.
 * Envelope: geno abort; conduct; CON/WIS exercise; sex_change_ok rn2(10);
 * turn-into pline; rn1(500,500) mtimedone; set_uasmon; STR clamp;
 * mhmax (dragon / golem / d(mlvl,8)); break_armor; drop_weapon;
 * find_ac; newsym; botl; see_monsters; encumber_msg; verbose breath tip.
 * Named omissions: Stoned/Sick/Slimed/strangle/glib; hideunder; utrap;
 * Blind restore; egg learn; swallow expel; light sources;
 * full skinback; livelog first-poly text; break_armor horns /
 * flimsy-helm pierce / ublindf; drop_weapon twoweapon/in_use arms;
 * retouch_equipment; non-breath verbose tips.
 * @param {number} mntmp
 * @returns {Promise<number>} 1 on success, 0 on geno abort
 */
export async function polymon(mntmp) {
    const u = game.u || (game.u = {});
    const flags = game.flags || (game.flags = {});
    let dochange = false;

    const mv = game.mvitals?.[mntmp];
    if (mv && ((mv.mvflags | 0) & G_GENOD)) {
        const nm = pmname(mntmp, flags.female ? FEMALE : MALE);
        await pline(`You feel rather ${nm}-ish.`);
        exercise(A_WIS, true);
        return 0;
    }

    if (!u.uconduct) u.uconduct = {};
    u.uconduct.polyselfs = (u.uconduct.polyselfs | 0) + 1;
    // first-poly livelog deferred

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

    const mdat = mons(mntmp);
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

    // Stoned → stone golem deferred

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

    const mlvl = mdat?.mlevel | 0;
    if (mdat?.mlet === 'S_DRAGON' && mntmp >= PM_GRAY_DRAGON) {
        u.mhmax = In_endgame(u.uz) ? (8 * mlvl) : (4 * mlvl + d(mlvl, 4));
    } else if (is_golem(mdat)) {
        // golemhp deferred — treat as ordinary d()
        u.mhmax = mlvl ? d(mlvl, 8) : rnd(4);
    } else {
        if (!mlvl) u.mhmax = rnd(4);
        else u.mhmax = d(mlvl, 8);
        // is_home_elemental ×3 deferred
    }
    u.mh = u.mhmax;

    if ((u.ulevel | 0) < mlvl) {
        u.mtimedone = Math.trunc((u.mtimedone | 0) * (u.ulevel | 0) / mlvl);
    }

    await break_armor();
    // C: drop_weapon(1) — cantwield (dragon/nohands) must drop uwep
    await drop_weapon(1);
    // hideunder / Blind / egg / swallow / steed arms deferred
    newsym(u.ux, u.uy); /* Change symbol */
    // spoteffects / Passes_walls / amorphous / webmaker deferred
    // C: find_ac() before encumber_msg; tty more() paints *cached* botl
    // from the prior bot() (AC still stale at 9 after Cloak_off/setworn).
    // JS flush before encumber more would bot post-find_ac AC:10 and
    // poison that cache — defer find_ac until after encumber_msg so the
    // More capture matches C (AC:9) then next screen gets AC:10.
    flags.botl = true;
    if (game.disp) game.disp.botl = true;
    // C: gv.vision_full_recalc = 1 before see_monsters — eyeless
    // FROMFORM Blind must clear stale IN_SIGHT (floating-eye glyph)
    // on the next allmain/pline vision_recalc (D-0928).
    game.vision_full_recalc = 1;
    see_monsters();
    await encumber_msg();
    find_ac();
    find_ac(); /* C repeats */
    // retouch_equipment / selftouch deferred
    // C: polyself.c polymon — flags.verbose ability tips after encumber
    // (breath tip forces --More-- on the encumber pline; D-0725).
    if (flags.verbose !== false) {
        const uptr = game.youmonst?.data;
        if (can_breathe(uptr)) {
            await pline('Use the command #monster to use your breath weapon.');
        }
        // spit/nymph/gaze/hide/web/were/gremlin/unicorn/mindflayer/
        // shriek/vampire/sit-egg tips deferred
    }
    return 1;
}

/**
 * C ref: polyself.c polyself — system-shock, POLY_CONTROLLED getlin,
 * random ordinary pick, then polymon/newman.
 * Named omissions: were/vamp/dragon-merge/POLY_MONSTER/POLY_REVERT;
 * placeholder orc/elf/giant substitutes; mkclass_poly; controllable_poly
 * getlin (non-force); wizard rehumanize own-role; light-source bookkeeping.
 * POLY_LOW_CTRL forcecontrol downgrade is live (D-1428).
 * @param {number} [psflags=POLY_NOFLAGS]
 */
export async function polyself(psflags = 0) {
    const u = game.u || (game.u = {});
    let forcecontrol = (psflags & POLY_CONTROLLED) !== 0;
    const low_control = (psflags & POLY_LOW_CTRL) !== 0;
    const monsterpoly = (psflags & POLY_MONSTER) !== 0;
    // formrevert named omit
    void (psflags & POLY_REVERT);

    if (Unchanging(u)) {
        await pline('You fail to transform!');
        return;
    }

    // C: !Polymorph_control && !forcecontrol && !draconian && !iswere && !isvamp
    const draconian = !!(u.uarm && Is_dragon_armor(u.uarm));
    const iswere = ismnum(u.ulycn);
    const youdata = game.youmonst?.data;
    const isvamp = !!(is_vampire(youdata) || is_vampshifter(game.youmonst));
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

    // C polyself.c :506–508 — blessed potion LOW_CTRL does not prompt
    // when already a dragon-merge / monster-poly / vamp / were form.
    if (forcecontrol && low_control
        && (draconian || monsterpoly || isvamp || iswere)) {
        forcecontrol = false;
    }

    let mntmp = NON_PM;
    if (forcecontrol) {
        let tryct = 5;
        do {
            mntmp = NON_PM;
            let buf = await getlin('Become what kind of monster? [type the name]');
            buf = mungspaces(buf);
            if (buf === '\x1b' || buf == null) {
                await pline('Never mind.');
                return;
            }
            if (buf === '*' || buf.toLowerCase() === 'random') {
                tryct = 0;
                continue;
            }
            mntmp = name_to_mon(buf);
            if (mntmp < LOW_PM) {
                await pline("I've never heard of such monsters.");
            } else if (is_placeholder(mons(mntmp))
                && mntmp !== PM_HUMAN
                /* your_race placeholder arm deferred */) {
                await pline(`You can't polymorph into ${an(pmname(mntmp, FEMALE))}.`);
                mntmp = NON_PM;
            } else if (!polyok(mons(mntmp))
                && !(mntmp === PM_HUMAN
                    || mntmp === (game.urole?.mnum | 0))) {
                await pline(`You can't polymorph into ${an(pmname(mntmp, game.flags?.female ? FEMALE : MALE))}.`);
                mntmp = NON_PM;
            } else {
                break;
            }
        } while (--tryct > 0);

        if (!tryct && mntmp < LOW_PM) {
            await pline("That's enough tries!");
            return;
        }
    }

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
 * C ref: polyself.c dobreathe — hero breath weapon while poly'd.
 * Envelope: Strangled refuse; u.uen < 15 energy pline.
 * Named omissions: uen drain + getdir; ubreatheu / ubuzz BZ_U_BREATH.
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
    // C: u.uen -= 15; botl; getdir; attacktype_fordmg AT_BREA;
    // ubreatheu / ubuzz(BZ_U_BREATH) — deferred (seed0108 hits uen < 15).
    return ECMD_OK;
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
 * C ref: cmd.c domonability — #monster special ability while poly'd.
 * Envelope: hide/web prompt; breathe → spit → nymph → gaze → were →
 * hide → web → mindflayer → gremlin → unicorn → shriek → vampire →
 * steed → reflexive/normal.
 * Named omissions: dogaze, dohide, dospinweb (polyself.c arms, queued);
 * steed breath via pet_ranged_attk (missing). Deferred arms keep the
 * old reflexive/normal fallthrough.
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
    let c = '\0';
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
        return tail(); // dogaze deferred
    } else if (is_were(uptr)) {
        return dosummon();
    } else if (c ? c === 'h' : might_hide) {
        return tail(); // dohide deferred
    } else if (c ? c === 's' : webmaker(uptr)) {
        return tail(); // dospinweb deferred
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
