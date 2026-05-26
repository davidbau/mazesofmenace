// mondata.js — Monster type predicates and locomotion phrasing.
// C ref: mondata.h (is_floater, is_flyer, swims, amphibious, fire_resistant, …), mondata.c raceptr(),
// dmgtype/dmgtype_fromattack, passes_bars, stagger(), monflag.h M1_*, MR_*, MZ_*, G_NOCORPSE; mon.c make_corpse (corpse gate stub); mondata.h is_hider/ceiling_hider.

import { game } from './gstate.js';
import {
    MONS_MLET,
    MONS_MMOVE,
    MONS_MSIZE,
    MONS_GENO_PLAN_B,
    MONS_RNDMONST_MFLAGS1,
    MONS_MFLAGS2,
    MONS_MLEVEL,
    MONS_RNDMONST_MALIGNTYP,
} from './mons_rndmonst_ini_inv_data.js';
import { ESHK } from './const.js';
import {
    XKILL_NOCORPSE,
    PM_FIRE_ELEMENTAL,
    PM_SALAMANDER,
    PM_AIR_ELEMENTAL,
    PM_EARTH_ELEMENTAL,
    PM_WATER_ELEMENTAL,
    PM_DEATH,
    PM_PESTILENCE,
    PM_FAMINE,
    PM_LICHEN,
    PM_FLOATING_EYE,
    PM_CYCLOPS,
    PM_LIZARD,
    PM_GRAY_DRAGON,
    PM_YELLOW_DRAGON,
    OTYP_AMULET_OF_YENDOR,
    OTYP_GRAY_DRAGON_SCALE_MAIL,
    OTYP_YELLOW_DRAGON_SCALE_MAIL,
    OTYP_GRAY_DRAGON_SCALES,
    OTYP_YELLOW_DRAGON_SCALES,
    OTYP_BLACK_DRAGON_SCALES,
    OTYP_DRAGON_MAIL_TO_SCALES_DELTA,
    Is_airlevel,
    Is_firelevel,
    Is_earthlevel,
    Is_waterlevel,
    NON_PM,
    LOW_PM,
    MON_FLOOR,
    S_GOLEM,
    PM_STONE_GOLEM,
    G_GENOD,
} from './const.js';

/**
 * C: mondata.h is_rider(ptr) — `mons[mnum]` is Death / Pestilence / Famine.
 * @param {number} mnum
 * @returns {boolean}
 */
export function isRiderMnum(mnum) {
    const m = mnum | 0;
    return m === PM_DEATH || m === PM_PESTILENCE || m === PM_FAMINE;
}

/**
 * C: **`mons[corpsenm].mlet == S_TROLL`** — NH 5.0 **`monsters.h`** TROLL through OLOG_HAI (**`PM`** **225**–**229**).
 * @param {number} mnum
 */
export function isTrollCorpsenm(mnum) {
    const m = mnum | 0;
    return m >= 225 && m <= 229;
}

/**
 * C: **`mons[corpsenm]`** stub for **`goodpos`/`enexto`** ( **`mlet`** + **`permonstHuman`** base).
 * @param {number} mnum
 * @returns {Permonst}
 */
export function stubPermonstForCorpsenm(mnum) {
    const m = mnum | 0;
    let mlet = S_HUMAN;
    if (isTrollCorpsenm(m)) mlet = S_TROLL;
    else if (m === PM_LIZARD) mlet = S_LIZARD;
    else if (m === PM_LICHEN) mlet = S_FUNGUS;
    /* C: permonst `cnutrit` / `mconveys` / `geno` — shk.c corpse/tin/egg pricing; eat.c intrinsic_possible */
    return {
        ...permonstHuman,
        mlet,
        mnum: m,
        msize: MONS_MSIZE[m] ?? permonstHuman.msize,
        cnutrit: 0,
        mconveys: 0,
        geno: MONS_GENO_PLAN_B[m] ?? 0,
    };
}

/** C: mondata.h **`is_human(ptr)`** — **`M2_HUMAN`**. */
const M2_HUMAN = 0x00000008;
/** C: monflag.h M2_MALE / M2_FEMALE / M2_NEUTER — makemon.c gender. */
const M2_MALE = 0x00010000;
const M2_FEMALE = 0x00020000;
const M2_NEUTER = 0x00040000;

/** C: mondata.h is_male(ptr). */
export function isMalePtrLikeC(ptr) {
    return ((ptr?.mflags2 ?? 0) & M2_MALE) !== 0;
}

/** C: mondata.h is_female(ptr). */
export function isFemalePtrLikeC(ptr) {
    return ((ptr?.mflags2 ?? 0) & M2_FEMALE) !== 0;
}

/** C: mondata.h is_neuter(ptr). */
export function isNeuterPtrLikeC(ptr) {
    /* `mons[PM_KITTEN]` — not neuter; legacy `MONS_MFLAGS2` has stray `M2_NEUTER` bit. */
    if ((ptr?.mnum | 0) === 34) return false;
    return ((ptr?.mflags2 ?? 0) & M2_NEUTER) !== 0;
}

/**
 * C: **`mons[mndx]`** permonst fields used by **`mon_allowflags`** / **`mfndpos`** / **`mcalcmove`**.
 * @param {number} mndx
 * @returns {Permonst}
 */
export function permonstFromMndxLikeC(mndx) {
    const m = mndx | 0;
    return {
        ...permonstHuman,
        mnum: m,
        mlet: MONS_MLET[m] ?? S_HUMAN,
        mflags1: MONS_RNDMONST_MFLAGS1[m] ?? 0,
        mflags2: MONS_MFLAGS2[m] ?? 0,
        mlevel: MONS_MLEVEL[m] ?? 1,
        mmove: MONS_MMOVE[m] ?? permonstHuman.mmove,
        msize: MONS_MSIZE[m] ?? permonstHuman.msize,
        maligntyp: MONS_RNDMONST_MALIGNTYP[m] ?? 0,
        msound: 0,
        geno: MONS_GENO_PLAN_B[m] ?? 0,
    };
}

/** C: mondata.h **`is_human(ptr)`**. */
export function isHumanPtrLikeC(ptr) {
    return ((ptr?.mflags2 ?? 0) & M2_HUMAN) !== 0;
}

/**
 * C: **`struct monst`** fakemon for **`teleport.c`** **`goodpos`** / **`enexto`** ( **`set_mon_data`** subset).
 * @param {number} mnum
 */
export function fakemonForCorpsenm(mnum) {
    const m = mnum | 0;
    return { mx: 0, my: 0, mnum: m, wormno: 0, data: stubPermonstForCorpsenm(m) };
}

/** C: monattk.h / permonst.h */
export const AT_ANY = -1;
/** C: monattk.h — damage kinds used by passes_bars (iron bars). */
export const AD_RUST = 24;
export const AD_CORR = 42;
/** C: permonst.h NATTK — mattk[] slots scanned by dmgtype_fromattack. */
export const NATTK = 6;

/** @typedef {{ adtyp: number, aatyp: number }} Mattack */
/** @typedef {{ mlet: number, mflags1: number, mflags2?: number, mflags3?: number, msize: number, mmove: number, mlevel?: number, ac?: number, mvflags?: number, mresists?: number, mnum?: number, mattk?: readonly Mattack[], msound?: number, geno?: number, maligntyp?: number }} Permonst */

/** C: monflag.h `G_NOCORPSE` — no ordinary corpse (mon.c make_corpse; genocided / unique rules). */
export const G_NOCORPSE = 0x0010;

/** C: monflag.h `MR_FIRE` — innate fire resistance (goodpos lava, trap.c, …). */
export const MR_FIRE = 0x01;
/** C: monflag.h MR_STONE */
export const MR_STONE = 0x80;
/** C: monflag.h `MR_COLD` */
export const MR_COLD = 0x02;
/** C: monflag.h `MR_SLEEP` — sleep resistance (trap.c sleep gas, …). */
export const MR_SLEEP = 0x04;
/** C: monflag.h `MR_DISINT` */
export const MR_DISINT = 0x08;
/** C: monflag.h `MR_ELEC` */
export const MR_ELEC = 0x10;

// C: monflag.h (subset used by locomotion / stagger / goodpos)
const M1_FLY = 0x00000001;
/** C: monflag.h `M1_CLING` — **`mon.c`** **`minliquid_core`** / **`m_in_air`**. */
const M1_CLING = 0x00000010;
/** C: monflag.h `M1_TPORT` — **`mondata.h`** **`can_teleport`** / **`teleport.c`** **`minliquid_core`**. */
const M1_TPORT = 0x02000000;
const M1_SWIM = 0x00000002;
const M1_AMORPHOUS = 0x00000004;
const M1_WALLWALK = 0x00000008;
const M1_UNSOLID = 0x00100000;
const M1_AMPHIBIOUS = 0x00000200;
const M1_BREATHLESS = 0x00000400;
/** C: monflag.h `M1_NOEYES` — **`mondata.h`** **`haseyes`**. */
const M1_NOEYES = 0x00001000;
const M1_NOLIMBS = 0x00006000;
const M1_SLITHY = 0x00080000;
/** C: monflag.h `M1_HUMANOID` — **`mondata.h`** **`humanoid`**, **`polyself.c`** **`mbodypart`**. */
const M1_HUMANOID = 0x00020000;
const M1_NOTAKE = 0x00000080;
/** C: monflag.h — diet (gethungry ordinary uhunger--); M1_OMNIVORE = CARNIVORE|HERBIVORE */
const M1_CARNIVORE = 0x20000000;
const M1_HERBIVORE = 0x40000000;
const M1_METALLIVORE = 0x80000000;

/** C: monflag.h `M2_ROCKTHROW` — `throws_rocks` / goodpos boulder squares (teleport.c). */
const M2_ROCKTHROW = 0x08000000;

const MZ_SMALL = 1;
/** C: monflag.h `MZ_MEDIUM` / `MZ_LARGE` — `verysmall` / `bigmonst` (mondata.h). */
export const MZ_MEDIUM = 2;
export const MZ_LARGE = 3;

// C: sym.h / defsym.h — S_EYE, S_LIGHT, S_VORTEX, S_ELEMENTAL, S_HUMAN enum indices
const S_EYE = 5;
const S_LIGHT = 25;
const S_VORTEX = 22;
/** C: defsym.h MONSYM(16,'p',PIERCER,...) — piercer / lurker ceiling drop (**`hack.c`** **`spoteffects`**). */
export const S_PIERCER = 16;
/** C: defsym.h / monsym.h — **`S_ELEMENTAL`**. */
export const S_ELEMENTAL = 31;
/** C: defsym.h **`MONSYM(57, ';', EEL, …)`** — **`mon.c`** **`minliquid_core`** eel-on-land. */
export const S_EEL = 57;
const S_HUMAN = 53;
/** C: defsym.h MONSYM — troll / lizard / fungus (lichen). */
const S_TROLL = 46;
const S_LIZARD = 58;
const S_FUNGUS = 32;
/** C: defsym.h / monsym.h — `S_GHOST` (noncorporeal). */
const S_GHOST = 54;

/** C: monflag.h MZ_SMALL — used by bear trap and encumber paths. */
export { MZ_SMALL };

/** C: monflag.h M2_UNDEAD / M2_WERE / M2_DEMON / M2_WANDER */
const M2_UNDEAD = 0x00000002;
const M2_WERE = 0x00000004;
const M2_DEMON = 0x00000100;
const M2_WANDER = 0x00800000;

/** C: objects.h GOLD_PIECE — steal.c findgold(). */
const GOLD_PIECE = 466;

/**
 * C: mondata.h is_undead(ptr) / is_were(ptr) / is_demon(ptr)
 * @param {Permonst|null|undefined} ptr
 */
export function isUndeadPtr(ptr) {
    return ((ptr?.mflags2 ?? 0) & M2_UNDEAD) !== 0;
}

export function isWerePtr(ptr) {
    return ((ptr?.mflags2 ?? 0) & M2_WERE) !== 0;
}

export function isDemonPtr(ptr) {
    return ((ptr?.mflags2 ?? 0) & M2_DEMON) !== 0;
}

/** C: mondata.h is_wanderer(ptr). */
export function isWandererPtr(ptr) {
    return ((ptr?.mflags2 ?? 0) & M2_WANDER) !== 0;
}

/**
 * C: steal.c findgold(chain) — first GOLD_PIECE on an object chain.
 * @param {{ otyp?: number, nobj?: unknown } | null | undefined} chain
 */
export function findgoldChainLikeC(chain) {
    for (let o = chain; o; o = o.nobj) {
        if ((o.otyp | 0) === GOLD_PIECE) return o;
    }
    return null;
}

/** C: monst.h **`is_vampshifter`** — **`cham`** vs **`PM_VAMPIRE`** / **`PM_VAMPIRE_LEADER`** / **`PM_VLAD_THE_IMPALER`** (**`monsters.h`** NH 5.0). */
const PM_VAMPIRE = 224;
const PM_VAMPIRE_LEADER = 225;
const PM_VLAD_THE_IMPALER = 226;

/**
 * C: monst.h **`is_vampshifter(mon)`**.
 * @param {Record<string, unknown>|null|undefined} mtmp
 */
export function isVampshifterMonsterLikeC(mtmp) {
    const c = mtmp?.cham | 0;
    return c === PM_VAMPIRE || c === PM_VAMPIRE_LEADER || c === PM_VLAD_THE_IMPALER;
}

/** C: monattk.h — `defended` / `defends` drain-life. */
const AD_DRLI = 15;
/** C: monattk.h — paired with **AD_DRLI** on black dragon scales in **`artifact.c`** **`defends`**. */
const AD_DISN = 5;

/** C: obj.h **`Is_dragon_scales`** / **`Is_dragon_mail`** (NH 5.0 **`OBJECTS_ENUM`**). */
function isDragonArmorOtypLikeC(otyp) {
    const t = otyp | 0;
    return (
        (t >= OTYP_GRAY_DRAGON_SCALE_MAIL && t <= OTYP_YELLOW_DRAGON_SCALE_MAIL)
        || (t >= OTYP_GRAY_DRAGON_SCALES && t <= OTYP_YELLOW_DRAGON_SCALES)
    );
}

/** C: artifact.c **`defends(adtyp, otmp)`** — artifact **`defn.adtyp`** + dragon armor subset. */
export function defendsAdtypOnObjHeroSubsetLikeC(g, adtyp, obj) {
    if (!obj) return false;
    const ax = obj.oartifact | 0;
    if (ax) {
        const row = g?.artilist?.[ax];
        const defnAd = row?.defn?.adtyp;
        if (Number.isFinite(defnAd) && (defnAd | 0) === (adtyp | 0)) return true;
        /* C: artilist.h — **`Excalibur`**, **`Stormbringer`**, **`The Staff of Aesculapius`** **`defn`** **`DRLI`**. */
        if ((adtyp | 0) === AD_DRLI && (ax === 1 || ax === 2 || ax === 25)) return true;
    }
    if (isDragonArmorOtypLikeC(obj.otyp | 0)) {
        let otyp = obj.otyp | 0;
        if (otyp >= OTYP_GRAY_DRAGON_SCALE_MAIL && otyp <= OTYP_YELLOW_DRAGON_SCALE_MAIL) {
            otyp += OTYP_DRAGON_MAIL_TO_SCALES_DELTA;
        }
        if (otyp < OTYP_GRAY_DRAGON_SCALES || otyp > OTYP_YELLOW_DRAGON_SCALES) return false;
        const ad = adtyp | 0;
        if (ad === AD_DISN || ad === AD_DRLI) return otyp === OTYP_BLACK_DRAGON_SCALES;
    }
    return false;
}

/**
 * C: mondata.c **`defended(&gy.youmonst, adtyp)`** — wielded artifact, adult dragon body, worn **`uarm`** dragon suit.
 * @param {typeof game} g
 * @param {number} adtyp
 */
export function defendedHeroAdtypLikeC(g, adtyp) {
    const u = g?.u;
    if (!u) return false;
    const uw = u.uwep;
    if (uw && defendsAdtypOnObjHeroSubsetLikeC(g, adtyp, uw)) return true;
    const mndx = (g.youmonst?.mnum ?? u.umonnum) | 0;
    if (mndx >= PM_GRAY_DRAGON && mndx <= PM_YELLOW_DRAGON) {
        const otyp = OTYP_GRAY_DRAGON_SCALES + (mndx - PM_GRAY_DRAGON);
        const ad = adtyp | 0;
        if ((ad === AD_DISN || ad === AD_DRLI) && otyp === OTYP_BLACK_DRAGON_SCALES) return true;
    }
    const arm = u.uarm;
    if (arm && defendsAdtypOnObjHeroSubsetLikeC(g, adtyp, arm)) return true;
    return false;
}

/**
 * C: mondata.c **`resists_drli(&gy.youmonst)`** — undead/demon/were, lycanthrope hero, **`PM_DEATH`**, **`is_vampshifter`**, **`defended(AD_DRLI)`** (no separate **`Drain_resistance`** intrinsic; C **`exper.c`** **`losexp`** gates on this only).
 * @param {typeof game} g
 */
export function resistsDrliHeroLikeC(g) {
    const u = g?.u;
    if (!u) return true;
    const ptr = raceptr(g.youmonst);
    if (isUndeadPtr(ptr) || isDemonPtr(ptr) || isWerePtr(ptr)) return true;
    const lycn = u.ulycn;
    if (Number.isInteger(lycn) && lycn !== NON_PM && lycn >= LOW_PM) return true;
    const mnum = (g.youmonst?.mnum ?? u.umonnum) | 0;
    if (mnum === PM_DEATH) return true;
    if (isVampshifterMonsterLikeC(g.youmonst)) return true;
    return defendedHeroAdtypLikeC(g, AD_DRLI);
}

/**
 * C: mondata.c dmgtype_fromattack(ptr, dtyp, atyp)
 * @param {Permonst|null|undefined} ptr
 * @param {number} dtyp
 * @param {number} atyp `AT_ANY` matches any attack slot.
 * @returns {Mattack|null}
 */
export function dmgtypeFromattack(ptr, dtyp, atyp) {
    const attacks = ptr?.mattk;
    if (!attacks) return null;
    for (let i = 0; i < NATTK; i++) {
        const a = attacks[i];
        if (!a) continue;
        if (a.adtyp === dtyp && (atyp === AT_ANY || a.aatyp === atyp)) return a;
    }
    return null;
}

/**
 * C: mondata.c dmgtype(ptr, dtyp)
 * @param {Permonst|null|undefined} ptr
 * @param {number} dtyp
 */
export function dmgtype(ptr, dtyp) {
    return dmgtypeFromattack(ptr, dtyp, AT_ANY) != null;
}

/** C: monattk.h `AT_BOOM` — explodes when killed; not an attack for `noattacks()`. */
const AT_BOOM = 14;

/**
 * C: mondata.c noattacks(ptr) — true if monster type has no attack slots (except `AT_BOOM`).
 * @param {Permonst|null|undefined} ptr
 */
export function noattacksPtr(ptr) {
    const mattk = ptr?.mattk;
    if (!mattk) return true;
    for (let i = 0; i < NATTK; i++) {
        const a = mattk[i];
        if (!a) continue;
        if ((a.aatyp | 0) === AT_BOOM) continue;
        if (a.aatyp | 0) return false;
    }
    return true;
}

/** Innate human (PM_HUMAN–style) for encumber / stagger when not polymorphed. */
export const permonstHuman = Object.freeze({
    mlet: S_HUMAN,
    /* C: mons[PM_HUMAN] — M1_HUMANOID | M1_OMNIVORE (ordinary food consumption in eat.c gethungry) */
    mflags1: 0x00020000 | (M1_CARNIVORE | M1_HERBIVORE),
    mflags2: 0,
    msize: 2, /* MZ_MEDIUM */
    mmove: 12,
    mlevel: 1, /* C: mons[].mlevel — `dofiretrap` / `mhmax` floor vs polymonst */
    ac: 10, /* C: mons[].ac — find_ac() base for naked humanoid hero */
    mvflags: 0,
    mresists: 0,
});

/**
 * C: mon.c make_corpse — `svm.mvitals[mndx].mvflags & G_NOCORPSE`, plus per-monst overrides.
 * Stub: `mtmp.mvflags`, `mtmp.data.mvflags`, or `g.mvitals[mnum].mvflags` when those exist.
 * `xkillFlags`: C `mondead` / `xkilled` — `XKILL_NOCORPSE` suppresses corpse regardless of mvitals.
 * @param {{ mnum?: number, mvflags?: number, data?: Permonst }} mtmp
 * @param {typeof game} [g]
 * @param {number} [xkillFlags]
 */
export function monsterLeavesCorpse(mtmp, g = game, xkillFlags = 0) {
    if (!mtmp) return false;
    if (((xkillFlags | 0) & XKILL_NOCORPSE) !== 0) return false;
    if (((mtmp.mvflags | 0) & G_NOCORPSE) !== 0) return false;
    const d = mtmp.data;
    if (d && ((d.mvflags | 0) & G_NOCORPSE) !== 0) return false;
    const mndx = mtmp.mnum | 0;
    const slot = g?.mvitals?.[mndx];
    if (slot && ((slot.mvflags | 0) & G_NOCORPSE) !== 0) return false;
    return true;
}

/** C: mondata.h carnivorous(ptr) — true for carnivores and omnivores */
export function carnivorous(/** @type {Permonst} */ ptr) {
    return ((ptr?.mflags1 ?? 0) & M1_CARNIVORE) !== 0;
}

/** C: mondata.h herbivorous(ptr) */
export function herbivorous(/** @type {Permonst} */ ptr) {
    return ((ptr?.mflags1 ?? 0) & M1_HERBIVORE) !== 0;
}

/** C: mondata.h metallivorous(ptr) */
export function metallivorous(/** @type {Permonst} */ ptr) {
    return ((ptr?.mflags1 ?? 0) & M1_METALLIVORE) !== 0;
}

/**
 * C: eat.c gethungry — (carnivorous||herbivorous||metallivorous)(gy.youmonst.data).
 * When polymorphed, uses `game.youmonst.data` (stub with permonstHuman if unset).
 */
export function heroEatsOrdinaryFood() {
    const g = game;
    const u = g.u;
    const ptr = (u?.Upolyd | 0) ? (g.youmonst?.data ?? permonstHuman) : raceptr(g.youmonst);
    return carnivorous(ptr) || herbivorous(ptr) || metallivorous(ptr);
}

/** C: mondata.h breathless */
export function breathless(/** @type {Permonst} */ ptr) {
    return (ptr.mflags1 & M1_BREATHLESS) !== 0;
}

/** C: mondata.h `haseyes(ptr)` — true unless **`M1_NOEYES`**. */
export function haseyes(/** @type {Permonst|null|undefined} */ ptr) {
    return ((ptr?.mflags1 ?? 0) & M1_NOEYES) === 0;
}

/** C: mondata.c `can_track(ptr)` — Excalibur or **`haseyes`** (Excalibur wield when artifact path is ported). */
export function canTrackPtrLikeC(/** @type {Permonst|null|undefined} */ ptr) {
    return haseyes(ptr);
}

/** C: monflag.h `M2_GREEDY`. */
const M2_GREEDY = 0x10000000;

export function likesGoldPtrLikeC(/** @type {Permonst|null|undefined} */ ptr) {
    return ((ptr?.mflags2 ?? 0) & M2_GREEDY) !== 0;
}

/**
 * C: hack.c `cant_squeeze_thru(mon)` — subset (no **`curr_mon_load`** / steed fog).
 * @param {Record<string, unknown>} mtmp
 * @returns {0|1|2|3}
 */
export function cantSqueezeThruMonsterLikeC(mtmp) {
    const ptr = raceptr(mtmp);
    if (passesWalls(ptr)) return 0;
    if (
        bigmonst(ptr)
        && !(amorphous(ptr) || isWhirly(ptr) || noncorporeal(ptr) || slithy(ptr))
    ) {
        return 1;
    }
    return 0;
}

/**
 * C: mondata.h `eyecount(ptr)` — cyclops / floating eye **1**, else **2** if **`haseyes`**, else **0**.
 * @param {Permonst|null|undefined} ptr
 */
export function eyecountLikeC(ptr) {
    if (!haseyes(ptr)) return 0;
    const m = ptr?.mnum | 0;
    if (m === PM_FLOATING_EYE || m === PM_CYCLOPS) return 1;
    return 2;
}

/** C: youprop.h `Half_gas_damage` — damp/wet towel on **`ublindf`**. */
export function halfGasDamageHeroLikeC(g) {
    const b = g?.u?.ublindf;
    const OTYP_TOWEL = 235;
    return !!(b && (b.otyp | 0) === OTYP_TOWEL && (b.spe | 0) > 0);
}

/** C: mondata.h passes_walls */
export function passesWalls(/** @type {Permonst} */ ptr) {
    return (ptr.mflags1 & M1_WALLWALK) !== 0;
}

/** C: monflag.h `M3_COVETOUS` — any `M3_WANTS*` artifact drive (wizard.c `strategy` / `tactics`). */
export const M3_COVETOUS = 0x001f;

/** C: mondata.h `is_covetous(ptr)` — covetous monsters get `tactics` + second `set_apparxy` before `distfleeck`. */
export function isCovetousPtrLikeC(/** @type {Permonst|null|undefined} */ ptr) {
    return ((ptr?.mflags3 ?? 0) & M3_COVETOUS) !== 0;
}

/** C: monst.h `mon_offmap(mon)` — `(mon)->mstate != MON_FLOOR` (monmove.c after `m_move`). */
export function monOffmapLikeC(/** @type {{ mstate?: number }|null|undefined} */ mtmp) {
    return (mtmp?.mstate | 0) !== MON_FLOOR;
}

/** C: mondata.h throws_rocks — giants, xorns, titans, … (goodpos boulder tile). */
export function throwsRocks(/** @type {Permonst} */ ptr) {
    return ((ptr?.mflags2 ?? 0) & M2_ROCKTHROW) !== 0;
}

/** C: mondata.h verysmall */
export function verysmall(/** @type {Permonst} */ ptr) {
    return ((ptr?.msize ?? MZ_MEDIUM) | 0) < MZ_SMALL;
}

/** C: mondata.h bigmonst */
export function bigmonst(/** @type {Permonst} */ ptr) {
    return ((ptr?.msize ?? 0) | 0) >= MZ_LARGE;
}

/** C: mondata.h unsolid */
export function unsolid(/** @type {Permonst} */ ptr) {
    return (ptr.mflags1 & M1_UNSOLID) !== 0;
}

/** C: mondata.h passes_rocks */
export function passesRocks(/** @type {Permonst} */ ptr) {
    return passesWalls(ptr) && !unsolid(ptr);
}

/** C: mondata.h webmaker — PM_CAVE_SPIDER / PM_GIANT_SPIDER; false until pmidx wired. */
export function webmaker(/** @type {Permonst} */ ptr) {
    void ptr;
    return false;
}

/**
 * C: raceptr(mtmp) — innate race permonst; hero uses mons[urace.mnum] when !Upolyd.
 * @param {{ data?: Permonst }|null|undefined} mtmp
 * @returns {Permonst}
 */
export function raceptr(mtmp) {
    const g = game;
    if (mtmp === g.youmonst && !g.u?.Upolyd) return g.urace?.permonst ?? permonstHuman;
    return mtmp?.data ?? permonstHuman;
}

/** C: monflag.h — **`MS_SOLDIER`** (watchmen share **`msound`** with army; **`is_watch`** in C is **`PM_*`** only). */
const MS_SOLDIER_MONFLAG = 27;
/** C: monflag.h `M2_MERC` / `M2_HOSTILE` / `M2_PEACEFUL` / `M2_STALK` — watch vs soldier (monsters.h). */
const M2_MERC_WATCH = 0x00000200;
const M2_HOSTILE_WATCH = 0x00100000;
const M2_PEACEFUL_WATCH = 0x00200000;
const M2_STALK_WATCH = 0x01000000;

/**
 * C: mondata.h **`is_watch(ptr)`** — Town watch **`mons[]`** entries only (peaceful **`M2_MERC`** **`MS_SOLDIER`**).
 * Army ranks use **`M2_HOSTILE`** instead of **`M2_PEACEFUL`**.
 * @param {{ data?: Permonst }|null|undefined} mtmp
 * @returns {boolean}
 */
export function isWatchMonsterLikeC(mtmp) {
    const ptr = raceptr(mtmp);
    const m2 = ptr?.mflags2 | 0;
    if ((ptr?.msound | 0) !== MS_SOLDIER_MONFLAG) return false;
    if ((m2 & M2_MERC_WATCH) === 0 || (m2 & M2_STALK_WATCH) === 0) return false;
    if ((m2 & M2_PEACEFUL_WATCH) === 0) return false;
    if ((m2 & M2_HOSTILE_WATCH) !== 0) return false;
    return true;
}

function highc(ch) {
    if (!ch || typeof ch !== 'string') return ch;
    const c = ch[0];
    return c === c.toLowerCase() ? c.toUpperCase() : c;
}

/** C: mondata.h is_floater */
export function isFloater(/** @type {Permonst} */ ptr) {
    return ptr.mlet === S_EYE || ptr.mlet === S_LIGHT;
}

/** C: mondata.h is_flyer */
export function isFlyer(/** @type {Permonst} */ ptr) {
    return (ptr.mflags1 & M1_FLY) !== 0;
}

/** C: mondata.h **`is_clinger`** */
export function isClinger(/** @type {Permonst} */ ptr) {
    return ((ptr?.mflags1 ?? 0) & M1_CLING) !== 0;
}

/** C: monflag.h `M1_HIDE` — mondata.h **`is_hider`**. */
const M1_HIDE = 0x00010000;
/** C: defsym.h **`MONSYM(13,'m',MIMIC,...)`** — **`S_MIMIC`**. */
const S_MIMIC = 13;

/** C: mondata.h **`is_hider(ptr)`** */
export function isHider(/** @type {Permonst|null|undefined} */ ptr) {
    return ((ptr?.mflags1 ?? 0) & M1_HIDE) !== 0;
}

/**
 * C: mondata.h **`ceiling_hider`** — lurker / piercer ceiling forms (**`trap.c`** **`fall_through`**).
 * @param {Permonst|null|undefined} ptr
 */
export function ceilingHider(ptr) {
    if (!ptr || !isHider(ptr)) return false;
    return (isClinger(ptr) && ptr.mlet !== S_MIMIC) || isFlyer(ptr);
}

/** C: mondata.h **`cant_drown`** (`is_swimmer` ≡ **`swims`**) */
export function cantDrown(/** @type {Permonst} */ ptr) {
    return swims(ptr) || amphibious(ptr) || breathless(ptr);
}

/** C: mondata.h **`can_teleport(ptr)`** — **`M1_TPORT`**. */
export function canTeleportMon(/** @type {Permonst} */ ptr) {
    return ((ptr?.mflags1 ?? 0) & M1_TPORT) !== 0;
}

/**
 * C: teleport.c **`tele_restrict(mon)`** → **`noteleport_level`** (subset: level flags + stasis).
 * Omits Gehennom **`m_blocks_teleporting`**, covetous bypass.
 * @param {typeof game} [g]
 * @param {unknown} [_mtmp]
 */
export function teleRestrictMon(g = game, _mtmp) {
    const f = g?.level?.flags;
    if (!f) return false;
    if (f.noteleport) return true;
    const st = f.stasis_until | 0;
    if (st > 0 && (g.moves | 0) < st) return true;
    return false;
}

/** C: mondata.h swims */
export function swims(/** @type {Permonst} */ ptr) {
    return (ptr.mflags1 & M1_SWIM) !== 0;
}

/** C: mondata.h amphibious */
export function amphibious(/** @type {Permonst} */ ptr) {
    return (ptr.mflags1 & M1_AMPHIBIOUS) !== 0;
}

/** C: mondata.h fire_resistant — `mons[].mresists & MR_FIRE` (subset). */
export function fireResistant(/** @type {Permonst} */ ptr) {
    return ((ptr?.mresists ?? 0) & MR_FIRE) !== 0;
}

/** C: mondata.c pm_resistance — innate `mresists` only. */
export function pmResistanceLikeC(/** @type {Permonst} */ ptr, mr) {
    return ((ptr?.mresists ?? 0) & (mr | 0)) !== 0;
}

/** C: mondata.c is_golem */
export function isGolemPtrLikeC(/** @type {Permonst} */ ptr) {
    return (ptr?.mlet | 0) === S_GOLEM;
}

/**
 * C: mondata.c poly_when_stoned — non-stone golems petrify to stone golem unless genocided.
 * @param {import('./gstate.js').game} g
 */
export function polyWhenStonedLikeC(g, /** @type {Permonst} */ ptr) {
    if (!isGolemPtrLikeC(ptr)) return false;
    if ((ptr.mnum | 0) === PM_STONE_GOLEM) return false;
    if (((g.mvitals?.[PM_STONE_GOLEM]?.mvflags | 0) & G_GENOD) !== 0) return false;
    return true;
}

/** C: mondata.h resists_sleep — `mons[].mresists & MR_SLEEP` (subset; no `defended`/`resist()` yet). */
export function resistsSleep(/** @type {Permonst} */ ptr) {
    return ((ptr?.mresists ?? 0) & MR_SLEEP) !== 0;
}

/**
 * C: monst.h **`mon_resistancebits(mon)`** — **`mresists|mextrinsics|mintrinsics`**.
 * JS: **`mextrinsics`/`mintrinsics`** on **`struct monst`** not modeled; **`raceptr`** for **`data`**.
 * @param {{ data?: Permonst }|null|undefined} mtmp
 */
export function monResistanceBitsLikeC(mtmp) {
    return (raceptr(mtmp)?.mresists ?? 0) | 0;
}

/** C: monst.h **`resists_elec`** — **`Resists_Elem`** innate-bit subset (**`MR_ELEC`** only; no worn **`defends`** yet). */
export function resistsElecMonLikeC(mtmp) {
    return (monResistanceBitsLikeC(mtmp) & MR_ELEC) !== 0;
}

/** C: monst.h **`resists_disint`** — innate **`MR_DISINT`** subset. */
export function resistsDisintMonLikeC(mtmp) {
    return (monResistanceBitsLikeC(mtmp) & MR_DISINT) !== 0;
}

/** C: mondata.h likes_lava(ptr) — fire elemental or salamander (`mons[]` identity). */
export function likesLava(/** @type {Permonst} */ ptr) {
    const m = ptr?.mnum | 0;
    return m === PM_FIRE_ELEMENTAL || m === PM_SALAMANDER;
}

/** C: mondata.h slithy */
export function slithy(/** @type {Permonst} */ ptr) {
    return (ptr.mflags1 & M1_SLITHY) !== 0;
}

/** C: mondata.h **`humanoid(ptr)`** — **`(ptr)->mflags1 & M1_HUMANOID`**. */
export function humanoidLikeC(/** @type {Permonst|null|undefined} */ ptr) {
    return ((ptr?.mflags1 ?? 0) & M1_HUMANOID) !== 0;
}

/** C: mondata.h amorphous */
export function amorphous(/** @type {Permonst} */ ptr) {
    return (ptr.mflags1 & M1_AMORPHOUS) !== 0;
}

/**
 * C: wizard.c **`mon_has_amulet(mtmp)`** — walk **`minvent`** for **`AMULET_OF_YENDOR`**.
 * @param {{ minvent?: { otyp?: number, nobj?: unknown } | null }} mtmp
 */
export function monHasAmulet(mtmp) {
    for (let o = mtmp?.minvent; o; o = o.nobj) {
        if ((o.otyp | 0) === OTYP_AMULET_OF_YENDOR) return true;
    }
    return false;
}

/** C: shk.c **`is_fshk`** — fleeing shopkeeper follows across levels. */
export function isFshkMonsterLikeC(mtmp) {
    return !!(mtmp?.isshk && (ESHK(mtmp)?.following | 0));
}

/**
 * C: mondata.c **`levl_follower(mtmp)`** — tame / wiz / fleeing shk / stalkers.
 * @param {import('./gstate.js').game} g
 */
export function levlFollowerLikeC(g, mtmp) {
    const u = g?.u;
    if (!u || !mtmp) return false;
    if (mtmp === u.usteed) return true;
    if ((mtmp.iswiz | 0) && monHasAmulet(mtmp)) return false;
    if ((mtmp.mtame | 0) || (mtmp.iswiz | 0) || isFshkMonsterLikeC(mtmp)) return true;
    const ptr = raceptr(mtmp);
    if ((ptr?.mflags2 & M2_STALK_WATCH) !== 0 && (!((mtmp.mflee | 0)) || u.uhave?.amulet)) {
        return true;
    }
    return false;
}

/**
 * C: makemon.c **`is_home_elemental(ptr)`** — **`monsndx`** vs plane (**`u.uz`**).
 * @param {{ mnum?: number, data?: Permonst } | null} mtmp
 * @param {{ dnum?: number, dlevel?: number }} [uz]
 */
export function isHomeElemental(mtmp, uz) {
    if (!mtmp) return false;
    const ptr = raceptr(mtmp);
    if ((ptr.mlet | 0) !== S_ELEMENTAL) return false;
    const m = mtmp.mnum | 0;
    if (m === PM_AIR_ELEMENTAL) return Is_airlevel(uz);
    if (m === PM_FIRE_ELEMENTAL) return Is_firelevel(uz);
    if (m === PM_EARTH_ELEMENTAL) return Is_earthlevel(uz);
    if (m === PM_WATER_ELEMENTAL) return Is_waterlevel(uz);
    return false;
}

/** C: mondata.h is_whirly — vortex or air elemental (C: &mons[PM_AIR_ELEMENTAL]). */
export function isWhirly(/** @type {Permonst} */ ptr) {
    if (ptr.mlet === S_VORTEX) return true;
    /* Air: elemental, unsolid, flies; fire elemental also flies but has M1_NOTAKE. */
    return ptr.mlet === S_ELEMENTAL && unsolid(ptr) && isFlyer(ptr)
        && (ptr.mflags1 & M1_NOTAKE) === 0;
}

/**
 * C: mondata.c passes_bars — iron bars (`hack.c` test_move).
 * Rust/corr via `dmgtype`; `still_chewing` / occupation not ported in `walkable.js`.
 */
export function passesBars(/** @type {Permonst} */ ptr) {
    return passesWalls(ptr) || amorphous(ptr) || unsolid(ptr) || isWhirly(ptr)
        || verysmall(ptr) || dmgtype(ptr, AD_RUST) || dmgtype(ptr, AD_CORR)
        || metallivorous(ptr) || (slithy(ptr) && !bigmonst(ptr));
}

/** C: mondata.h noncorporeal */
export function noncorporeal(/** @type {Permonst} */ ptr) {
    return ptr.mlet === S_GHOST;
}

/**
 * C: monmove.c can_fog — vampshifter fog escape under doors.
 * @param {Record<string, unknown>} [_g]
 */
export function canFogHero(_g) {
    void _g;
    return false;
}

/** C: mondata.h nolimbs */
export function nolimbs(/** @type {Permonst} */ ptr) {
    return (ptr.mflags1 & M1_NOLIMBS) === M1_NOLIMBS;
}

/** C: mondata.c static locoverbs */
const LEVITATE = ['float', 'Float', 'wobble', 'Wobble'];
const FLYS = ['fly', 'Fly', 'flutter', 'Flutter'];
const FLYL = ['fly', 'Fly', 'stagger', 'Stagger'];
const SLITHER = ['slither', 'Slither', 'falter', 'Falter'];
const OOZE = ['ooze', 'Ooze', 'tremble', 'Tremble'];
const IMMOBILE = ['wiggle', 'Wiggle', 'pulsate', 'Pulsate'];
const CRAWL = ['crawl', 'Crawl', 'falter', 'Falter'];

/**
 * Shared branch table: returns table string or null to use caller `def`.
 * @param {Permonst} ptr
 * @param {0|1|2|3} locoindx
 * @returns {string|null}
 */
function locomotionBranch(ptr, locoindx) {
    if (isFloater(ptr)) return LEVITATE[locoindx];
    if (isFlyer(ptr) && ptr.msize <= MZ_SMALL) return FLYS[locoindx];
    if (isFlyer(ptr) && ptr.msize > MZ_SMALL) return FLYL[locoindx];
    if (slithy(ptr)) return SLITHER[locoindx];
    if (amorphous(ptr)) return OOZE[locoindx];
    if (!ptr.mmove) return IMMOBILE[locoindx];
    if (nolimbs(ptr)) return CRAWL[locoindx];
    return null;
}

/**
 * C: locomotion(const struct permonst *ptr, const char *def)
 * @param {Permonst|null|undefined} ptr
 * @param {string} def
 * @returns {string}
 */
export function locomotion(ptr, def) {
    if (!ptr || typeof def !== 'string' || !def.length) return def || 'move';
    const locoindx = def[0] !== highc(def[0]) ? 0 : 1;
    return locomotionBranch(ptr, locoindx) ?? def;
}

/**
 * C: stagger(const struct permonst *ptr, const char *def)
 * @param {Permonst|null|undefined} ptr
 * @param {string} def
 * @returns {string}
 */
export function stagger(ptr, def) {
    if (!ptr || typeof def !== 'string' || !def.length) return def || 'stagger';
    const locoindx = def[0] !== highc(def[0]) ? 2 : 3;
    return locomotionBranch(ptr, locoindx) ?? def;
}
