// artifact.js — Artifact table accessors and touch rules (partial).
// C ref: artifact.c / artilist.h
// defends / defends_when_carried + defn/cary extract (D-1453).

import { game } from './gstate.js';
import {
    NROFARTIFACTS,
    artilistRaw,
} from './generated/artifacts_data.js';
import { objectNames } from './objects.js';
import { monsterNames, NON_PM, M2_UNDEAD } from './monsters.js';
import {
    A_NONE,
    ONAME_WISH,
    ONAME_VIA_NAMING,
    ONAME_GIFT,
    ONAME_VIA_DIP,
    ONAME_LEVEL_DEF,
    ONAME_BONES,
    ONAME_RANDOM,
    ONAME_KNOW_ARTI,
    W_ARM,
    W_ARMC,
    W_ARMH,
    W_ARMS,
    W_ARMG,
    W_ARMF,
    W_ARMU,
    W_AMUL,
    W_RINGL,
    W_RINGR,
    W_TOOL,
    W_ART,
    W_ARTI,
    W_SWAPWEP,
    W_WEP,
    HALLUC_RES,
    REFLECTING,
    ECMD_OK,
    ECMD_TIME,
    ECMD_CANCEL,
    GETOBJ_EXCLUDE,
    GETOBJ_SUGGEST,
    LAST_PROP,
    nothing_happens,
    nothing_seems_to_happen,
    Never_mind,
} from './const.js';
import { rn2, rnd, d, rnz } from './rng.js';
import { nhgetch } from './input.js';
import { flush_screen, flush_topl_more, pline, You_feel } from './display.js';
import { compactify_invlets } from './invent.js';
import { xname, the, vtense } from './objnam.js';

const CRYSTAL_BALL = objectNames.indexOf('CRYSTAL_BALL');
const FAKE_AMULET_OF_YENDOR = objectNames.indexOf('FAKE_AMULET_OF_YENDOR');

export { NROFARTIFACTS };
import {
    ART_NONARTIFACT,
    ART_EXCALIBUR,
    ART_GRIMTOOTH,
    ART_GRAYSWANDIR,
} from './generated/artifacts_data.js';
import { PM_KNIGHT } from './generated/monsters_data.js';
import { aligns } from './roles.js';
export { ART_NONARTIFACT, ART_EXCALIBUR, ART_GRIMTOOTH, ART_GRAYSWANDIR };

// C ref: include/artifact.h — subset used by touch/wish / spec_applies
export const SPFX_NOGEN = 0x00000001;
export const SPFX_RESTR = 0x00000002;
export const SPFX_INTEL = 0x00000004;
export const SPFX_ATTK = 0x00000040;
export const SPFX_HALRES = 0x00000800;
export const SPFX_LUCK = 0x00080000;
export const SPFX_DMONS = 0x00100000;
export const SPFX_DCLAS = 0x00200000;
export const SPFX_DFLAG1 = 0x00400000;
export const SPFX_DFLAG2 = 0x00800000;
export const SPFX_DALIGN = 0x01000000;
export const SPFX_DBONUS = 0x01F00000;
export const SPFX_REFLECT = 0x04000000;
const SILVER = 14; /* objclass.h */

// C artifact.h enum invoke_prop_types — TAMING = LAST_PROP+1 … BLINDING_RAY
export const BLINDING_RAY = LAST_PROP + 14;
export const FLING_POISON = LAST_PROP + 11;
/** C spell.h SPELL_LEV_PW — invoke cost pretends a level-5 spell. */
function SPELL_LEV_PW(lvl) {
    return (lvl | 0) * 5;
}

const PM_GREMLIN = monsterNames.indexOf('PM_GREMLIN');

// C ref: monattk.h — used by spec_applies ATTK arms
const AD_PHYS = 0;
const AD_MAGM = 1;
const AD_FIRE = 2;
const AD_COLD = 3;
const AD_SLEE = 4;
const AD_DISN = 5;
const AD_ELEC = 6;
const AD_DRST = 7;
const AD_ACID = 8;
const AD_BLND = 11;
const AD_STUN = 12;
const AD_SLOW = 13;
const AD_PLYS = 14;
const AD_DRLI = 15;
const AD_STON = 18;
const AD_DISE = 33;
const AD_HALU = 36;

const GRAY_DRAGON_SCALES = objectNames.indexOf('GRAY_DRAGON_SCALES');
const GOLD_DRAGON_SCALES = objectNames.indexOf('GOLD_DRAGON_SCALES');
const RED_DRAGON_SCALES = objectNames.indexOf('RED_DRAGON_SCALES');
const WHITE_DRAGON_SCALES = objectNames.indexOf('WHITE_DRAGON_SCALES');
const GREEN_DRAGON_SCALES = objectNames.indexOf('GREEN_DRAGON_SCALES');
const ORANGE_DRAGON_SCALES = objectNames.indexOf('ORANGE_DRAGON_SCALES');
const BLACK_DRAGON_SCALES = objectNames.indexOf('BLACK_DRAGON_SCALES');
const BLUE_DRAGON_SCALES = objectNames.indexOf('BLUE_DRAGON_SCALES');
const YELLOW_DRAGON_SCALES = objectNames.indexOf('YELLOW_DRAGON_SCALES');
const GRAY_DRAGON_SCALE_MAIL = objectNames.indexOf('GRAY_DRAGON_SCALE_MAIL');
const YELLOW_DRAGON_SCALE_MAIL = objectNames.indexOf('YELLOW_DRAGON_SCALE_MAIL');

// C: gy.youmonst — sentinel for hero touch_artifact / spec_applies path
export const youmonst = { _youmonst: true };

let _artilist = null;

function resolvePm(name) {
    if (!name || name === 'NON_PM') return NON_PM;
    const i = monsterNames.indexOf(name);
    return i >= 0 ? i : NON_PM;
}

function resolveMtype(raw) {
    const kind = raw.mtypeKind || 'num';
    if (kind === 'm2' || kind === 'num') return raw.mtypeVal | 0;
    if (kind === 's') return raw.mtypeTok; // compare to ptr.mlet string
    if (kind === 'pm') return resolvePm(raw.mtypeTok);
    return 0;
}

function sgn(n) {
    const x = n | 0;
    return (x > 0) - (x < 0);
}

/** Build resolved artilist once objects[] names are available. */
export function artifacts_globals_init() {
    _artilist = artilistRaw.map((raw) => ({
        name: raw.name,
        otyp: objectNames.indexOf(raw.otypName),
        spfx: raw.spfx | 0,
        // cspfx not extracted (D-1342: no artilist row has cspfx SPFX_REFLECT)
        cspfx: raw.cspfx | 0,
        mtype: resolveMtype(raw),
        attk: {
            adtyp: raw.attkAdtyp | 0,
            damn: raw.attkDamn | 0,
            damd: raw.attkDamd | 0,
        },
        defn: {
            adtyp: raw.defnAdtyp | 0,
            damn: raw.defnDamn | 0,
            damd: raw.defnDamd | 0,
        },
        cary: {
            adtyp: raw.caryAdtyp | 0,
            damn: raw.caryDamn | 0,
            damd: raw.caryDamd | 0,
        },
        alignment: raw.alignment | 0,
        role: resolvePm(raw.roleName),
        race: resolvePm(raw.raceName),
        // C artilist.h A() inv — property or invoke_prop_types (D-1377)
        inv_prop: raw.inv_prop | 0,
        // C artilist.h A() acolor — glow, not the item's tint (D-1347)
        acolor: raw.acolor | 0,
    }));
    // C: artiexist[NROFARTIFACTS+1]
    game.artiexist = Array.from({ length: NROFARTIFACTS + 1 }, () => ({
        exists: 0,
        found: 0,
        wish: 0,
        gift: 0,
        viadip: 0,
        named: 0,
        lvldef: 0,
        bones: 0,
        rnd: 0,
    }));
    // C: xint16 artidisco[NROFARTIFACTS] — save/rest still named.
    game.artidisco = Array(NROFARTIFACTS).fill(0);
}

function artilist() {
    if (!_artilist) artifacts_globals_init();
    return _artilist;
}

/** C ref: you.h Role_if / Role_switch — urole.mnum. */
function Role_if(pm) {
    return (game.urole?.mnum | 0) === (pm | 0);
}

function Role_switch() {
    return game.urole?.mnum | 0;
}

/**
 * C ref: artifact.c hack_artifacts — gift align, Excalibur role, questarti.
 * Called from init_artifacts after role_init (C allmain.c:785–793), not
 * after u_init despite the C comment. restore_artifacts still named.
 */
function hack_artifacts() {
    const list = artilist();
    const alignIdx = game.flags?.initalign | 0;
    const alignmnt = aligns[alignIdx]?.value | 0;

    // C: for (art = artilist + 1; art->otyp; art++)
    for (let i = 1; i < list.length; i++) {
        const art = list[i];
        if (!art || !art.otyp) break;
        if (art.role === Role_switch() && art.alignment !== A_NONE) {
            art.alignment = alignmnt;
        }
    }

    // C: Excalibur can be used by any lawful character, not just knights
    if (!Role_if(PM_KNIGHT)) {
        list[ART_EXCALIBUR].role = NON_PM;
    }

    const questarti = game.urole?.questarti | 0;
    if (questarti) {
        const qa = list[questarti];
        if (qa) {
            qa.alignment = alignmnt;
            qa.role = Role_switch();
        }
    }
}

/**
 * C ref: artifact.c init_artifacts — zero artiexist/artidisco then
 * hack_artifacts. Caller allmain.c newgame after init_dungeons, before
 * u_init_misc (WIZKIT may name artifacts). Rebuild artilist from generated
 * raw so JS process-reuse matches C's compile-time table.
 */
export function init_artifacts() {
    artifacts_globals_init();
    hack_artifacts();
}

/**
 * C ref: artifact.c artiname
 * @param {number} artinum
 * @returns {string}
 */
export function artiname(artinum) {
    if (artinum <= 0 || artinum > NROFARTIFACTS) return '';
    const list = artilist();
    return list[artinum]?.name || '';
}

/**
 * C ref: artifact.c discover_artifact — insert m into artidisco[].
 * Full-table `impossible` named omit (NROFARTIFACTS slots).
 * @param {number} m
 */
export function discover_artifact(m) {
    if (!game.artidisco) {
        game.artidisco = Array(NROFARTIFACTS).fill(0);
    }
    const artidisco = game.artidisco;
    for (let i = 0; i < NROFARTIFACTS; i++) {
        if (artidisco[i] === 0 || artidisco[i] === m) {
            artidisco[i] = m;
            return;
        }
    }
}

/** C ref: artifact.c get_artifact */
export function get_artifact(obj) {
    const list = artilist();
    if (!obj?.oartifact) return list[0];
    const a = obj.oartifact | 0;
    if (a <= 0 || a > NROFARTIFACTS) return list[0];
    return list[a];
}

const LUCKSTONE_OTYP = objectNames.indexOf('LUCKSTONE');

/**
 * C ref: artifact.c confers_luck — LUCKSTONE or artifact SPFX_LUCK.
 * @param {object} obj
 * @returns {boolean}
 */
export function confers_luck(obj) {
    if (!obj) return false;
    if ((obj.otyp | 0) === LUCKSTONE_OTYP) return true;
    if (!obj.oartifact) return false;
    const arti = get_artifact(obj);
    const list = artilist();
    if (arti === list[0]) return false;
    return ((arti.spfx | 0) & SPFX_LUCK) !== 0;
}

/**
 * C ref: artifact.c arti_reflects :537–550 — worn SPFX_REFLECT, else
 * carried cspfx. Callers: muse.c mon_reflects MON_WEP (:2807).
 * Hero W_WEP identity is set_artifact_intrinsic EReflecting (:867–872)
 * then ureflects (EReflecting & W_WEP).
 * Named omit: cspfx extract (no row in this artilist has cspfx&SPFX_REFLECT).
 * @param {object|null} obj
 * @returns {boolean}
 */
export function arti_reflects(obj) {
    const list = artilist();
    const arti = get_artifact(obj);
    if (arti !== list[0]) {
        if (((obj.owornmask | 0) & ~W_ART) && ((arti.spfx | 0) & SPFX_REFLECT)) {
            return true;
        }
        if ((arti.cspfx | 0) & SPFX_REFLECT) return true;
    }
    return false;
}

/**
 * C ref: artifact.c shade_glare :555–571 — silver, or non-silver
 * artifact with SPFX_DFLAG2 vs M2_UNDEAD. Does not consider blessed
 * vs undead (that bonus is dmgval after the shade zero).
 * Caller: weapon.c dmgval (D-1354). hmon ranged shade_glare named.
 */
export function shade_glare(obj) {
    if ((game.objects?.[obj.otyp]?.oc_material | 0) === SILVER) {
        return true;
    }
    const list = artilist();
    const arti = get_artifact(obj);
    if (arti !== list[ART_NONARTIFACT]
            && ((arti.spfx | 0) & SPFX_DFLAG2)
            && (arti.mtype | 0) === M2_UNDEAD) {
        return true;
    }
    return false;
}

/**
 * C ref: objnam.c bare_artifactname — artiname with leading "The "→"the ".
 * Non-artifact falls back to xname-like minimal name via artilist miss.
 */
export function bare_artifactname(obj) {
    if (!obj?.oartifact) return 'something';
    const art = get_artifact(obj);
    let name = art?.name || 'something';
    if (name.length >= 4 && name.slice(0, 4) === 'The ') {
        name = `the ${name.slice(4)}`;
    }
    return name;
}

// C coloratt.c colornames[] first match (aliases after the NULL sentinel
// are skipped). Index == CLR_* / NO_COLOR from color.h.
const CLR2COLORNAME = [
    'black', 'red', 'green', 'brown', 'blue', 'magenta', 'cyan', 'gray',
    'no color', 'orange', 'light green', 'yellow', 'light blue',
    'light magenta', 'light cyan', 'white',
];

/** C ref: coloratt.c clr2colorname — first matching colornames[].color. */
export function clr2colorname(clr) {
    const i = clr | 0;
    if (i < 0 || i >= CLR2COLORNAME.length) return '';
    return CLR2COLORNAME[i];
}

/**
 * C ref: artifact.c glow_color `:2427–2433` — artilist[arti].acolor then
 * clr2colorname then hcolor. Hallu hcolor display-rng named omit (identity).
 * doname inlines the same C functions (objnam cannot import this module:
 * artifact→invent→shk calls set_doname_shop_suffix during objnam init).
 */
export function glow_color(arti_indx) {
    const list = artilist();
    const colornum = list[arti_indx | 0]?.acolor | 0;
    return clr2colorname(colornum);
}

// C artifact.c glow_verbs[] — [0] is the blind / no-creatures verb.
const GLOW_VERBS = ['quiver', 'flicker', 'glimmer', 'gleam'];

/**
 * C ref: artifact.c glow_strength `:2442–2448` — 0..3 from warn_obj_cnt.
 */
export function glow_strength(count) {
    const n = count | 0;
    return (n > 12) ? 3 : (n > 4) ? 2 : (n > 0 ? 1 : 0);
}

/**
 * C ref: artifact.c glow_verb `:2451–2462` — verb then optional "ing".
 * Bypasses ing_suffix (would double the last consonant).
 * @param {number} count 0 means blind rather than no applicable creatures
 * @param {boolean} ingsfx
 */
export function glow_verb(count, ingsfx) {
    let resbuf = GLOW_VERBS[glow_strength(count)];
    if (ingsfx) resbuf += 'ing';
    return resbuf;
}

/**
 * C ref: artifact.c set_artifact_intrinsic — SPFX_HALRES subset.
 * C uses make_hallucinated(xtime=!on, talk, wp_mask) which sets
 * EHalluc_resistance |= mask when conferring (xtime==0).
 * Named omissions: defn resist masks; SPFX_SEARCH/ESP/STLTH/REGEN/TCTRL/
 * WARN/EREGEN/HSPDAM/HPHDAM; see_monsters; message paths.
 * SPFX_REFLECT && W_WEP is D-1342 (not other wp_mask).
 * @param {object} otmp
 * @param {boolean} on
 * @param {number} wp_mask
 */
export function set_artifact_intrinsic(otmp, on, wp_mask) {
    if (!otmp?.oartifact) return;
    const list = artilist();
    const oart = get_artifact(otmp);
    if (oart === list[0]) return;
    // C: spfx = (wp_mask != W_ART) ? oart->spfx : oart->cspfx
    // cspfx not extracted yet — carried-only props deferred.
    const spfx = (wp_mask !== W_ART) ? (oart.spfx | 0) : 0;
    if (spfx & SPFX_HALRES) {
        // C potion.c make_hallucinated mask arm: !xtime → |= ; xtime → &=~
        const u = game.u || (game.u = {});
        if (!u.uprops) u.uprops = {};
        if (!u.uprops[HALLUC_RES]) {
            u.uprops[HALLUC_RES] = { intrinsic: 0, extrinsic: 0, blocked: 0 };
        }
        if (on) {
            u.uprops[HALLUC_RES].extrinsic =
                (u.uprops[HALLUC_RES].extrinsic | 0) | (wp_mask | 0);
            u.EHalluc_resistance =
                (u.EHalluc_resistance | 0) | (wp_mask | 0);
        } else {
            u.uprops[HALLUC_RES].extrinsic =
                (u.uprops[HALLUC_RES].extrinsic | 0) & ~(wp_mask | 0);
            u.EHalluc_resistance =
                (u.EHalluc_resistance | 0) & ~(wp_mask | 0);
        }
    }
    // C artifact.c:867–872 — only the wielded-weapon slot sets EReflecting
    if ((spfx & SPFX_REFLECT) && (wp_mask & W_WEP)) {
        const u = game.u || (game.u = {});
        if (!u.uprops) u.uprops = {};
        if (!u.uprops[REFLECTING]) {
            u.uprops[REFLECTING] = { intrinsic: 0, extrinsic: 0, blocked: 0 };
        }
        if (on) {
            u.uprops[REFLECTING].extrinsic =
                (u.uprops[REFLECTING].extrinsic | 0) | (wp_mask | 0);
            u.EReflecting = (u.EReflecting | 0) | (wp_mask | 0);
        } else {
            u.uprops[REFLECTING].extrinsic =
                (u.uprops[REFLECTING].extrinsic | 0) & ~(wp_mask | 0);
            u.EReflecting = (u.EReflecting | 0) & ~(wp_mask | 0);
        }
    }
}

/**
 * C ref: artifact.c artifact_name
 * Returns canonical artifact name or null; optionally sets otyp via out.
 */
export function artifact_name(name, out, fuzzy = false) {
    if (!name) return null;
    let n = name;
    if (n.length >= 4 && n.slice(0, 4).toLowerCase() === 'the ') n = n.slice(4);
    const list = artilist();
    for (let i = 1; i < list.length; i++) {
        const a = list[i];
        if (a.otyp < 0) continue;
        let aname = a.name;
        if (aname.length >= 4 && aname.slice(0, 4).toLowerCase() === 'the ') {
            aname = aname.slice(4);
        }
        const match = fuzzy
            ? fuzzymatch(n, aname)
            : n.toLowerCase() === aname.toLowerCase();
        if (match) {
            if (out) out.otyp = a.otyp;
            return a.name;
        }
    }
    return null;
}

/** Spaces/hyphens/case ignored — C fuzzymatch(u, o, " -", TRUE) subset. */
function fuzzymatch(u, t) {
    const norm = (s) => String(s).toLowerCase().replace(/[- ]+/g, '');
    return norm(u) === norm(t);
}

/** C ref: artifact.c nartifact_exist */
export function nartifact_exist() {
    const ax = game.artiexist || [];
    let a = 0;
    for (let i = 1; i <= NROFARTIFACTS; i++) {
        if (ax[i]?.exists) a++;
    }
    return a;
}

/**
 * C ref: artifact.c mk_artifact — A_NONE converts otmp to matching artifact.
 * Named omissions: by_align gift path (mksobj + role/skill checks);
 * gift_value / gen_spe (extractor lacks gv/gs; max_giftvalue=99 covers
 * normal arts; gen_spe defaults 0 → spe adjust no-op); permapoisoned.
 */
export function mk_artifact(otmp, alignment = A_NONE, max_giftvalue = 99,
    adjust_spe = true) {
    const list = artilist();
    const by_align = alignment !== A_NONE;
    if (by_align) {
        // Gift / altar path deferred — return otmp unchanged
        return otmp;
    }
    if (!otmp) return otmp;
    const objects = game.objects;
    const o_typ = otmp.otyp | 0;
    const unique = !!(objects?.[o_typ]?.oc_unique);
    const ax = game.artiexist || [];
    const eligible = [];
    for (let m = 1; m < list.length; m++) {
        const a = list[m];
        if (!a || !a.otyp) break;
        if (ax[m]?.exists) continue;
        if ((a.spfx & SPFX_NOGEN) || unique) continue;
        // gift_value deferred (max_giftvalue=99 always passes for known arts)
        void max_giftvalue;
        if (a.otyp === o_typ) eligible.push(m);
    }
    if (eligible.length) {
        const m = eligible[rn2(eligible.length)];
        const a = list[m];
        if (!otmp.oextra) otmp.oextra = {};
        otmp.oextra.oname = a.name;
        artifact_exists(otmp, a.name, true, 0);
        otmp.oartifact = m;
        artifact_origin(otmp, ONAME_RANDOM);
        otmp.oeroded = 0;
        otmp.oeroded2 = 0;
        if (adjust_spe) {
            const genSpe = a.gen_spe | 0;
            const newSpe = (otmp.spe | 0) + genSpe;
            if (newSpe >= -10 && newSpe < 10) otmp.spe = newSpe;
        }
    }
    return otmp;
}

/** C ref: artifact.c exist_artifact */
export function exist_artifact(otyp, name) {
    const list = artilist();
    const ax = game.artiexist || [];
    for (let i = 1; i < list.length; i++) {
        const a = list[i];
        if (a.otyp === otyp && a.name === name) return !!ax[i]?.exists;
    }
    return false;
}

/** C ref: artifact.c artifact_origin */
export function artifact_origin(arti, aflags) {
    const a = arti?.oartifact | 0;
    if (!a) return;
    if (!game.artiexist) artifacts_globals_init();
    const slot = {
        exists: 1,
        found: (aflags & ONAME_KNOW_ARTI) ? 1 : 0,
        wish: (aflags & ONAME_WISH) ? 1 : 0,
        gift: (aflags & ONAME_GIFT) ? 1 : 0,
        viadip: (aflags & ONAME_VIA_DIP) ? 1 : 0,
        named: (aflags & ONAME_VIA_NAMING) ? 1 : 0,
        lvldef: (aflags & ONAME_LEVEL_DEF) ? 1 : 0,
        bones: (aflags & ONAME_BONES) ? 1 : 0,
        rnd: (aflags & ONAME_RANDOM) ? 1 : 0,
    };
    // Ensure exactly one origin bit when none given — C defaults RANDOM
    const originBits = ONAME_VIA_NAMING | ONAME_WISH | ONAME_GIFT
        | ONAME_VIA_DIP | ONAME_LEVEL_DEF | ONAME_BONES | ONAME_RANDOM;
    if ((aflags & originBits) === 0) slot.rnd = 1;
    game.artiexist[a] = slot;
}

/**
 * C ref: artifact.c artifact_exists
 * mod true → create; false → un-create (deferred body).
 */
export function artifact_exists(otmp, name, mod, flgs) {
    if (!otmp || !name) return;
    const list = artilist();
    for (let i = 1; i < list.length; i++) {
        const a = list[i];
        if (a.otyp === otmp.otyp && a.name === name) {
            otmp.oartifact = mod ? i : 0;
            otmp.age = 0;
            if (mod) {
                let f = flgs | 0;
                const originBits = ONAME_VIA_NAMING | ONAME_WISH | ONAME_GIFT
                    | ONAME_VIA_DIP | ONAME_LEVEL_DEF | ONAME_BONES | ONAME_RANDOM;
                if ((f & originBits) === 0) f |= ONAME_RANDOM;
                artifact_origin(otmp, f);
            }
            return;
        }
    }
}

/**
 * C ref: artifact.c touch_artifact — hero path subset.
 * Returns 1 if held, 0 if refused. Blast `d()`/`losehp` deferred when
 * the rn2(4) gate fires; gate itself matches C (short-circuit order).
 */
export function touch_artifact(obj, mon) {
    const oart = get_artifact(obj);
    const list = artilist();
    if (oart === list[0]) return 1;

    const yours = mon === youmonst || mon == null;
    const self_willed = (oart.spfx & SPFX_INTEL) !== 0;
    let badclass = false;
    let badalign = false;

    if (yours) {
        const u = game.u || {};
        const rolePm = u.umonster ?? u.role_mnum ?? NON_PM;
        const racePm = u.urace?.mnum ?? NON_PM;
        badclass = self_willed
            && ((oart.role !== NON_PM && oart.role !== rolePm)
                || (oart.race !== NON_PM && oart.race !== racePm));
        const atype = u.ualign?.type;
        const arec = u.ualign?.record ?? 0;
        badalign = ((oart.spfx & SPFX_RESTR) !== 0
            && oart.alignment !== A_NONE
            && (oart.alignment !== atype || arec < 0));
    }
    // bane_applies deferred → leave badalign as-is for non-bane arts

    if (((badclass || badalign) && self_willed)
        || (badalign && (!yours || !rn2(4)))) {
        if (!yours) return 0;
        // C: You("are blasted…"); d(Antimagic?2:4, self_willed?10:4); losehp;
        // exercise(A_WIS,FALSE); touch_blasted=TRUE. Deferred when rn2(4)==0.
    }

    if (badclass && badalign && self_willed) {
        return 0;
    }
    return 1;
}

/**
 * C ref: artifact.c retouch_object — hero wield/wear touch gate.
 * Silver-hate / bane damage and drop paths deferred. Blast `d()`/`losehp`
 * deferred inside touch_artifact when rn2(4)==0.
 * @returns {number} 1 ok, 0 refused
 */
export function retouch_object(obj, _loseit) {
    if (!obj) return 1;
    if (touch_artifact(obj, youmonst)) {
        // ag (Hate_silver) / bane_applies damage deferred → allow when clear
        return 1;
    }
    // remove_worn_item / dropx deferred
    return 0;
}

/**
 * C ref: artifact.c invoke_ok — getobj callback for #invoke.
 */
function invoke_ok(obj) {
    if (!obj) return GETOBJ_EXCLUDE;
    const ocl = game.objects?.[obj.otyp];
    if (obj.oartifact || ocl?.oc_unique
        || (obj.otyp === FAKE_AMULET_OF_YENDOR && !obj.known)) {
        return GETOBJ_SUGGEST;
    }
    if (obj.otyp === CRYSTAL_BALL) return GETOBJ_SUGGEST;
    return GETOBJ_EXCLUDE;
}

function invoke_suggest_lets() {
    const lets = [];
    for (const o of game.invent || []) {
        if (o?.invlet && invoke_ok(o) === GETOBJ_SUGGEST) lets.push(o.invlet);
    }
    lets.sort((a, b) => a.charCodeAt(0) - b.charCodeAt(0));
    return lets.join('');
}

/**
 * C ref: invent.c getobj("invoke", invoke_ok, GETOBJ_PROMPT)
 */
async function getobj_invoke() {
    const raw = invoke_suggest_lets();
    if (!raw) {
        await pline("You don't have anything to invoke.");
        return null;
    }
    for (;;) {
        await flush_topl_more();
        const lets = raw.length > 5 ? compactify_invlets(raw) : raw;
        const query = `What do you want to invoke? [${lets} or ?*]`;
        const prompt = `${query} `;
        game._pending_message = prompt;
        await flush_screen(1);
        const disp = game.nhDisplay;
        if (disp?.setCursor) disp.setCursor(prompt.length, 0);

        const key = await nhgetch();
        if (key === 27) return null;
        const ch = String.fromCharCode(key);
        if (ch === '?' || ch === '*') continue;
        for (const o of game.invent || []) {
            if (o.invlet === ch && invoke_ok(o) === GETOBJ_SUGGEST) return o;
        }
        await pline(`You don't have that object.`);
    }
}

/**
 * C youprop.h Blind ≡ (HBlinded || EBlinded) && !BBlinded (+ roleplay).
 * Do not trust sticky u.Blind (D-0716).
 */
function Blind() {
    const u = game.u || {};
    if (u.uroleplay?.blind) return true;
    return !!(((u.HBlinded | 0) || (u.EBlinded | 0)) && !(u.BBlinded | 0));
}

function otense(obj, verb) {
    if ((obj?.quan | 0) !== 1) return verb;
    return vtense(null, verb);
}

/**
 * C ref: artifact.c arti_invoke_cost_pw :2088–2101 — Pw for invoke while
 * tired. Negative means the invoke cannot be paid with Pw.
 */
function arti_invoke_cost_pw(obj) {
    const oart = get_artifact(obj);
    const inv = oart?.inv_prop | 0;
    if (inv === FLING_POISON || inv === BLINDING_RAY) {
        return SPELL_LEV_PW(5);
    }
    return -1;
}

/**
 * C ref: artifact.c arti_invoke_cost :2104–2128 — cooldown or Pw.
 * age > moves: pay SPELL_LEV_PW(5) or "ignoring you" + d(3,10).
 * else age = moves + rnz(100).
 */
async function arti_invoke_cost(obj) {
    const moves = game.moves | 0;
    if ((obj.age | 0) > moves) {
        const pw_cost = arti_invoke_cost_pw(obj);
        if (pw_cost < 0 || (game.u?.uen | 0) < pw_cost) {
            await You_feel(`that ${the(xname(obj))} ${otense(obj, 'are')} ignoring you.`);
            obj.age = (obj.age | 0) + d(3, 10);
            return false;
        }
        await You_feel('drained...');
        game.u.uen = (game.u.uen | 0) - pw_cost;
        if (game.disp) game.disp.botl = true;
        if (game.flags) game.flags.botl = true;
    } else {
        obj.age = moves + rnz(100);
    }
    return true;
}

/**
 * C ref: artifact.c invoke_blinding_ray :2054–2086 — Sunsword #invoke.
 * getdir: dx||dy → apply.c do_blinding_ray; dz → litroom(TRUE,obj) then
 * "It is lit here now." vs nothing_seems_to_happen; else self
 * lightdamage (gremlin) + flashburn(damg+rnd(damg), FALSE).
 * Cancel: Never_mind, age=moves, ECMD_CANCEL.
 * Named omit: other inv_prop specials; transient_light_cleanup;
 * resists_blnd_by_arti sparkle (flashburn).
 */
async function invoke_blinding_ray(obj) {
    const { getdir } = await import('./lock.js');
    if (await getdir(null)) {
        const u = game.u || {};
        if ((u.dx | 0) || (u.dy | 0)) {
            const { do_blinding_ray } = await import('./apply.js');
            await do_blinding_ray(obj);
        } else if (u.dz) {
            const { litroom } = await import('./read.js');
            await litroom(true, obj);
            const loc = game.level?.at(u.ux | 0, u.uy | 0);
            await pline((!Blind() && loc?.lit && !loc?.waslit)
                ? 'It is lit here now.'
                : nothing_seems_to_happen);
        } else {
            const vulnerable = (u.umonnum | 0) === PM_GREMLIN;
            const damg = obj.blessed ? 15 : !obj.cursed ? 10 : 5;
            const { lightdamage, flashburn } = await import('./zap.js');
            if (vulnerable) {
                await lightdamage(obj, true, 2 * damg);
            }
            if (!(await flashburn(damg + rnd(damg), false)) && !vulnerable) {
                await pline(nothing_seems_to_happen);
            }
        }
    } else {
        await pline(Never_mind);
        obj.age = game.moves | 0;
        return ECMD_CANCEL;
    }
    return ECMD_TIME;
}

/**
 * C ref: artifact.c arti_invoke — special powers / property toggle.
 * Envelope: !inv_prop → crystal ball or nothing_happens + ECMD_TIME.
 * inv_prop > LAST_PROP: BLINDING_RAY (D-1377) via arti_invoke_cost then
 * invoke_blinding_ray; other specials (taming/healing/portal/…) named.
 * Property toggle (INVIS/LEVITATION/CONFLICT) named.
 * @returns {number} ECMD_*
 */
export async function arti_invoke(obj) {
    if (!obj) {
        // C: impossible("arti_invoke without obj")
        return ECMD_OK;
    }
    const list = artilist();
    const oart = get_artifact(obj);
    const invProp = oart?.inv_prop | 0;
    if (oart === list[ART_NONARTIFACT] || !invProp) {
        if (obj.otyp === CRYSTAL_BALL) {
            // C artifact.c arti_invoke → use_crystal_ball (D-1010)
            const { use_crystal_ball } = await import('./detect.js');
            await use_crystal_ball(obj);
        } else {
            await pline(nothing_happens);
        }
        return ECMD_TIME;
    }
    if (invProp > LAST_PROP) {
        if (invProp === BLINDING_RAY) {
            if (!(await arti_invoke_cost(obj))) return ECMD_TIME;
            return invoke_blinding_ray(obj);
        }
        // TAMING / HEALING / ENERGY_BOOST / UNTRAP / CHARGE_OBJ /
        // LEV_TELE / CREATE_PORTAL / ENLIGHTENING / CREATE_AMMO /
        // BANISH / FLING_POISON / FIRESTORM / SNOWSTORM named
        await pline(nothing_happens);
        return ECMD_TIME;
    }
    // property toggle (INVIS / LEVITATION / CONFLICT) named
    await pline(nothing_happens);
    return ECMD_TIME;
}

/**
 * C ref: artifact.c doinvoke — #invoke command.
 * @returns {number} ECMD_*
 */
export async function doinvoke() {
    const obj = await getobj_invoke();
    if (!obj) return ECMD_CANCEL;
    if (!retouch_object(obj, false)) return ECMD_TIME;
    return arti_invoke(obj);
}

/**
 * C ref: artifact.c spec_applies — whether artifact special attacks apply.
 * Branch envelope: PHYS early-return (no DBONUS|ATTK); DMONS/DCLAS/DFLAG2/
 * DALIGN; ATTK Magm/Stun rn2(100)<mr. Named omissions: defended();
 * DFLAG1; hero Fire/Cold/Shock/Poison/Drain/Stone/Antimagic props;
 * mon resists_* via mresists (intrinsic bits only when set elsewhere);
 * DFLAG2 yours/Upolyd/ulycn arms (hero as target).
 */
function spec_applies(weap, mtmp) {
    if (!weap) return 0;
    if (!((weap.spfx | 0) & (SPFX_DBONUS | SPFX_ATTK))) {
        return (weap.attk?.adtyp | 0) === AD_PHYS ? 1 : 0;
    }
    if (!mtmp) return 0;
    const yours = mtmp === youmonst || mtmp._youmonst;
    const ptr = mtmp.data;
    const spfx = weap.spfx | 0;

    if (spfx & SPFX_DMONS) {
        return ptr && game.mons && ptr === game.mons[weap.mtype | 0] ? 1 : 0;
    }
    if (spfx & SPFX_DCLAS) {
        return ptr && weap.mtype === ptr.mlet ? 1 : 0;
    }
    if (spfx & SPFX_DFLAG1) {
        // DFLAG1 mflags1 arms deferred
        return 0;
    }
    if (spfx & SPFX_DFLAG2) {
        const m2 = (ptr?.mflags2 | 0) & (weap.mtype | 0);
        // yours / urace.selfmask / ulycn were-arms deferred
        return m2 ? 1 : 0;
    }
    if (spfx & SPFX_DALIGN) {
        if (yours) {
            return ((game.u?.ualign?.type | 0) !== (weap.alignment | 0)) ? 1 : 0;
        }
        const mal = ptr?.maligntyp | 0;
        return (mal === A_NONE || sgn(mal) !== (weap.alignment | 0)) ? 1 : 0;
    }
    if (spfx & SPFX_ATTK) {
        // defended(mtmp, adtyp) deferred → treat as undefended
        const ad = weap.attk?.adtyp | 0;
        switch (ad) {
        case AD_FIRE:
        case AD_COLD:
        case AD_ELEC:
        case AD_DRST:
        case AD_DRLI:
        case AD_STON:
            // hero *Resistance + mon resists_* deferred → bonus applies
            return 1;
        case AD_MAGM:
        case AD_STUN:
            if (yours) {
                const u = game.u || {};
                const am = !!(u.Antimagic || u.HAntimagic || u.EAntimagic);
                return am ? 0 : 1;
            }
            return rn2(100) < (ptr?.mr | 0) ? 0 : 1;
        default:
            return 0;
        }
    }
    return 0;
}

/**
 * C ref: artifact.c spec_abon — special attack (to-hit) bonus.
 * Returns rnd(attk.damn) when artifact applies; else 0.
 */
export function spec_abon(otmp, mon) {
    const list = artilist();
    const weap = get_artifact(otmp);
    if (weap === list[0]) return 0;
    if ((weap.attk?.damn | 0) && spec_applies(weap, mon)) {
        return rnd(weap.attk.damn | 0);
    }
    return 0;
}

/** C gs.spec_dbon_applies — set by spec_dbon; read by artifact_hit. */
let spec_dbon_applies = false;

/** C ref: artifact.c is_art — otmp->oartifact == art index. */
export function is_art(otmp, art) {
    return !!(otmp && (otmp.oartifact | 0) === (art | 0));
}

/**
 * C ref: artifact.c attacks — artifact attk.adtyp matches adtyp.
 */
export function attacks(adtyp, otmp) {
    const list = artilist();
    const weap = get_artifact(otmp);
    return weap !== list[ART_NONARTIFACT] && (weap.attk?.adtyp | 0) === (adtyp | 0);
}

/** C ref: obj.h Is_dragon_mail / Is_dragon_armor. */
function Is_dragon_mail(obj) {
    const t = obj?.otyp | 0;
    return t >= GRAY_DRAGON_SCALE_MAIL && t <= YELLOW_DRAGON_SCALE_MAIL;
}

function Is_dragon_armor(obj) {
    if (!obj) return false;
    const t = obj.otyp | 0;
    return (t >= GRAY_DRAGON_SCALES && t <= YELLOW_DRAGON_SCALES)
        || Is_dragon_mail(obj);
}

/**
 * C ref: artifact.c defends :636–683 — artifact defn.adtyp, else
 * dragon armor converted mail→scales. Caller: zap.c drain_item
 * (D-1453). Named omit: defended() worn walk (mondata).
 */
export function defends(adtyp, otmp) {
    if (!otmp) return false;
    const list = artilist();
    const weap = get_artifact(otmp);
    if (weap !== list[ART_NONARTIFACT]) {
        return (weap.defn?.adtyp | 0) === (adtyp | 0);
    }
    if (Is_dragon_armor(otmp)) {
        let otyp = otmp.otyp | 0;
        if (Is_dragon_mail(otmp)) {
            otyp += GRAY_DRAGON_SCALES - GRAY_DRAGON_SCALE_MAIL;
        }
        switch (adtyp | 0) {
        case AD_MAGM:
            return otyp === GRAY_DRAGON_SCALES;
        case AD_HALU:
            return otyp === GOLD_DRAGON_SCALES;
        case AD_FIRE:
            return otyp === RED_DRAGON_SCALES;
        case AD_COLD:
            return otyp === WHITE_DRAGON_SCALES;
        case AD_DRST:
        case AD_DISE:
            return otyp === GREEN_DRAGON_SCALES;
        case AD_SLEE:
        case AD_PLYS:
            return otyp === ORANGE_DRAGON_SCALES;
        case AD_DISN:
        case AD_DRLI:
            return otyp === BLACK_DRAGON_SCALES;
        case AD_ELEC:
        case AD_SLOW:
            return otyp === BLUE_DRAGON_SCALES;
        case AD_ACID:
        case AD_STON:
            return otyp === YELLOW_DRAGON_SCALES;
        default:
            break;
        }
    }
    return false;
}

/**
 * C ref: artifact.c defends_when_carried :687–694 — artifact
 * cary.adtyp. No dragon-armor walk. Caller: zap.c drain_item
 * (D-1453). No current artilist row has CARY(AD_DRLI).
 */
export function defends_when_carried(adtyp, otmp) {
    const list = artilist();
    const weap = get_artifact(otmp);
    if (weap !== list[ART_NONARTIFACT]) {
        return (weap.cary?.adtyp | 0) === (adtyp | 0);
    }
    return false;
}

/**
 * C ref: artifact.c spec_dbon — special damage bonus.
 * Grimtooth always applies; else spec_applies. When applies: rnd(damd) or
 * max(tmp,1) when damd==0 (Grayswandir / Orcrist double). Sets
 * spec_dbon_applies for artifact_hit side-effect gates.
 */
export function spec_dbon(otmp, mon, tmp) {
    const list = artilist();
    const weap = get_artifact(otmp);
    if (weap === list[ART_NONARTIFACT]
        || ((weap.attk?.adtyp | 0) === AD_PHYS
            && (weap.attk?.damn | 0) === 0
            && (weap.attk?.damd | 0) === 0)) {
        spec_dbon_applies = false;
    } else if (is_art(otmp, ART_GRIMTOOTH)) {
        spec_dbon_applies = true;
    } else {
        spec_dbon_applies = !!spec_applies(weap, mon);
    }
    if (spec_dbon_applies) {
        const damd = weap.attk?.damd | 0;
        return damd ? rnd(damd) : Math.max(tmp | 0, 1);
    }
    return 0;
}

/**
 * C ref: artifact.c artifact_hit — add spec_dbon then elemental/special arms.
 * Ported: damage add via spec_dbon (Grayswandir max(tmp,1) double).
 * Named omissions: realizes_damage plines; destroy_items/ignite on
 * FIRE/COLD/ELEC (still burn their rn2 gates); Mb_hit; SPFX_BEHEAD;
 * SPFX_DRLI; wake_nearto; Slimed burn_away.
 * @param {object} dmgBox mutable `{ dmg }` (C int *dmgptr)
 * @returns {boolean} whether caller should suppress ordinary hit pline
 */
export function artifact_hit(magr, mdef, otmp, dmgBox, dieroll) {
    void magr;
    if (!otmp?.oartifact || !dmgBox) return false;
    dmgBox.dmg = (dmgBox.dmg | 0) + spec_dbon(otmp, mdef, dmgBox.dmg | 0);

    // Elemental / Magicbane gates — burn C RNG order; bodies deferred.
    if (attacks(AD_FIRE, otmp)) {
        if (!rn2(4)) {
            // destroy_items AD_FIRE + ignite_items deferred
        }
        return true;
    }
    if (attacks(AD_COLD, otmp)) {
        if (!rn2(4)) {
            // destroy_items AD_COLD deferred
        }
        return true;
    }
    if (attacks(AD_ELEC, otmp)) {
        // wake_nearto when spec_dbon_applies deferred
        if (!rn2(5)) {
            // destroy_items AD_ELEC deferred
        }
        return true;
    }
    if (attacks(AD_MAGM, otmp)) {
        return true;
    }
    // C: MB_MAX_DIEROLL 8 — rolls above this aren't magical
    if (attacks(AD_STUN, otmp) && (dieroll | 0) <= 8) {
        // Mb_hit deferred — Magicbane specials
        return false;
    }
    if (!spec_dbon_applies) return false;
    // SPFX_BEHEAD / SPFX_DRLI deferred
    return false;
}

/**
 * C ref: artifact.c what_gives — first invent item conveying extrinsic.
 * Ported: artifact SPFX_HALRES when wielded/worn; non-artifact wornmask
 * match (rings/armor/amulet/tool).
 * Named omissions: other abil_to_spfx / abil_to_adtyp arms; Sunsword EBlnd;
 * cary/defn/cspfx beyond HALRES.
 * @param {number} extrinsicBits u.uprops[prop].extrinsic
 * @returns {object|null}
 */
export function what_gives(extrinsicBits) {
    const bits = extrinsicBits | 0;
    if (!bits) return null;
    let wornmask = W_ARM | W_ARMC | W_ARMH | W_ARMS
        | W_ARMG | W_ARMF | W_ARMU
        | W_AMUL | W_RINGL | W_RINGR | W_TOOL
        | W_ART | W_ARTI;
    if (game.u?.twoweap) wornmask |= W_SWAPWEP;
    const wornbits = wornmask & bits;
    // C: abil_to_spfx(&EHalluc_resistance) → SPFX_HALRES; other props 0 here
    const needSpfx = (bits & (W_WEP | W_SWAPWEP | W_ART | W_ARTI))
        ? SPFX_HALRES
        : 0;
    const list = artilist();
    for (const obj of game.invent || []) {
        if (!obj) continue;
        if (obj.oartifact) {
            const art = get_artifact(obj);
            if (art === list[0]) continue;
            // C: (art->spfx & spfx) == spfx && obj->owornmask
            if (needSpfx && ((art.spfx | 0) & needSpfx) === needSpfx
                && (obj.owornmask | 0)) {
                return obj;
            }
            continue;
        }
        if (wornbits && wornbits === (wornmask & (obj.owornmask | 0))) {
            return obj;
        }
    }
    return null;
}
