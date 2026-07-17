// artifact.js — Artifact table accessors and touch rules (partial).
// C ref: artifact.c / artilist.h

import { game } from './gstate.js';
import {
    NROFARTIFACTS,
    artilistRaw,
} from './generated/artifacts_data.js';
import { objectNames } from './objects.js';
import { monsterNames, NON_PM } from './monsters.js';
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
} from './const.js';
import { rn2, rnd } from './rng.js';

export { NROFARTIFACTS };
import {
    ART_NONARTIFACT,
    ART_GRIMTOOTH,
    ART_GRAYSWANDIR,
} from './generated/artifacts_data.js';
export { ART_NONARTIFACT, ART_GRIMTOOTH, ART_GRAYSWANDIR };

// C ref: include/artifact.h — subset used by touch/wish / spec_applies
export const SPFX_RESTR = 0x00000002;
export const SPFX_INTEL = 0x00000004;
export const SPFX_ATTK = 0x00000040;
export const SPFX_HALRES = 0x00000800;
export const SPFX_DMONS = 0x00100000;
export const SPFX_DCLAS = 0x00200000;
export const SPFX_DFLAG1 = 0x00400000;
export const SPFX_DFLAG2 = 0x00800000;
export const SPFX_DALIGN = 0x01000000;
export const SPFX_DBONUS = 0x01F00000;

// C ref: monattk.h — used by spec_applies ATTK arms
const AD_PHYS = 0;
const AD_MAGM = 1;
const AD_FIRE = 2;
const AD_COLD = 3;
const AD_ELEC = 6;
const AD_DRST = 7;
const AD_STUN = 12;
const AD_DRLI = 15;
const AD_STON = 18;

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
        mtype: resolveMtype(raw),
        attk: {
            adtyp: raw.attkAdtyp | 0,
            damn: raw.attkDamn | 0,
            damd: raw.attkDamd | 0,
        },
        alignment: raw.alignment | 0,
        role: resolvePm(raw.roleName),
        race: resolvePm(raw.raceName),
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
}

function artilist() {
    if (!_artilist) artifacts_globals_init();
    return _artilist;
}

/** C ref: artifact.c get_artifact */
export function get_artifact(obj) {
    const list = artilist();
    if (!obj?.oartifact) return list[0];
    const a = obj.oartifact | 0;
    if (a <= 0 || a > NROFARTIFACTS) return list[0];
    return list[a];
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
 * Ported: non-artifact wornmask match (rings/armor/amulet/tool).
 * Named omissions: artifact cary/defn/cspfx/spfx arms; Sunsword EBlnd;
 * abil_to_adtyp / abil_to_spfx.
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
    if (!wornbits) return null;
    for (const obj of game.invent || []) {
        if (!obj) continue;
        // Artifact convey arms deferred — skip so ordinary worn match wins.
        if (obj.oartifact) continue;
        if (wornbits === (wornmask & (obj.owornmask | 0))) return obj;
    }
    return null;
}
