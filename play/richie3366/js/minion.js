// minion.js — Demon/angel summon helpers (partial).
// C ref: minion.c msummon / ndemon / dlord / dprince / monster_census;
//         mondata.c msummon_environ.

import { game } from './gstate.js';
import { rn2, rn1 } from './rng.js';
import { pline, canseemon } from './display.js';
import { Monnam } from './do_name.js';
import { an } from './objnam.js';
import { makemon, mkclass_aligned, newemin } from './makemon.js';
import {
    mons, is_demon, is_ndemon, is_dlord, is_dprince, G_UNIQ,
} from './monsters.js';
import {
    NON_PM, A_NONE, G_GONE, MM_EMIN, MM_NOMSG, GEHENNOM, In_endgame,
} from './const.js';
import { ART_DEMONBANE } from './generated/artifacts_data.js';
import { monsterNames } from './generated/monsters_data.js';

const PM_WATER_DEMON = monsterNames.indexOf('PM_WATER_DEMON');
const PM_BONE_DEVIL = monsterNames.indexOf('PM_BONE_DEVIL');
const PM_SKELETON = monsterNames.indexOf('PM_SKELETON');
const PM_ORCUS = monsterNames.indexOf('PM_ORCUS');
const PM_DEMOGORGON = monsterNames.indexOf('PM_DEMOGORGON');
const PM_JUIBLEX = monsterNames.indexOf('PM_JUIBLEX');
const PM_YEENOGHU = monsterNames.indexOf('PM_YEENOGHU');
const PM_ANGEL = monsterNames.indexOf('PM_ANGEL');
const PM_WIZARD_OF_YENDOR = monsterNames.indexOf('PM_WIZARD_OF_YENDOR');
const PM_AIR_ELEMENTAL = monsterNames.indexOf('PM_AIR_ELEMENTAL');
const PM_FIRE_ELEMENTAL = monsterNames.indexOf('PM_FIRE_ELEMENTAL');
const PM_EARTH_ELEMENTAL = monsterNames.indexOf('PM_EARTH_ELEMENTAL');
const PM_WATER_ELEMENTAL = monsterNames.indexOf('PM_WATER_ELEMENTAL');
const PM_FOG_CLOUD = monsterNames.indexOf('PM_FOG_CLOUD');
const PM_ICE_VORTEX = monsterNames.indexOf('PM_ICE_VORTEX');
const PM_FREEZING_SPHERE = monsterNames.indexOf('PM_FREEZING_SPHERE');
const PM_STEAM_VORTEX = monsterNames.indexOf('PM_STEAM_VORTEX');
const PM_ENERGY_VORTEX = monsterNames.indexOf('PM_ENERGY_VORTEX');
const PM_SHOCKING_SPHERE = monsterNames.indexOf('PM_SHOCKING_SPHERE');
const PM_DUST_VORTEX = monsterNames.indexOf('PM_DUST_VORTEX');
const PM_FIRE_VORTEX = monsterNames.indexOf('PM_FIRE_VORTEX');
const PM_FLAMING_SPHERE = monsterNames.indexOf('PM_FLAMING_SPHERE');
const PM_YELLOW_LIGHT = monsterNames.indexOf('PM_YELLOW_LIGHT');

function sgn(n) {
    const x = n | 0;
    return (x > 0) - (x < 0);
}

/** C ref: dungeon.h Inhell — In_hell(&u.uz) / Gehennom. */
export function Inhell() {
    return (game.u?.uz?.dnum | 0) === GEHENNOM;
}

/** C ref: obj.h u_wield_art — is_art(uwep, art). */
function u_wield_art(art) {
    const uwep = game.u?.uwep;
    return !!(uwep && (uwep.oartifact | 0) === (art | 0));
}

/**
 * C ref: minion.c monster_census — count live fmon (spotted → canspotmon).
 * Named omissions: isgd mx==0 vault-park skip when isgd unset.
 */
export function monster_census(spotted) {
    let count = 0;
    for (const mtmp of game.fmon || []) {
        if ((mtmp.mhp | 0) < 1) continue;
        if (mtmp.isgd && (mtmp.mx | 0) === 0) continue;
        if (spotted && !canspotmon(mtmp)) continue;
        count++;
    }
    return count;
}

/**
 * C ref: mondata.c msummon_environ — cloud/what pair for appear pline.
 * @returns {{ cloud: string, what: string }}
 */
export function msummon_environ(mptr) {
    const mlet = mptr?.mlet;
    let mndx = mptr?.mndx;
    if (mlet === 'S_ANGEL') mndx = PM_ANGEL;
    else if (mlet === 'S_LIGHT') mndx = PM_YELLOW_LIGHT;

    let cloud = 'cloud';
    let what = 'smoke';
    switch (mndx) {
    case PM_WATER_DEMON:
    case PM_AIR_ELEMENTAL:
    case PM_WATER_ELEMENTAL:
    case PM_FOG_CLOUD:
    case PM_ICE_VORTEX:
    case PM_FREEZING_SPHERE:
        what = 'vapor';
        break;
    case PM_STEAM_VORTEX:
        what = 'steam';
        break;
    case PM_ENERGY_VORTEX:
    case PM_SHOCKING_SPHERE:
        cloud = 'shower';
        what = 'sparks';
        break;
    case PM_EARTH_ELEMENTAL:
    case PM_DUST_VORTEX:
        what = 'dust';
        break;
    case PM_FIRE_ELEMENTAL:
    case PM_FIRE_VORTEX:
    case PM_FLAMING_SPHERE:
        cloud = 'ball';
        what = 'flame';
        break;
    case PM_ANGEL:
    case PM_YELLOW_LIGHT:
        cloud = 'flash';
        what = 'light';
        break;
    default:
        break;
    }
    return { cloud, what };
}

/** C ref: do_name.c Amonnam — highc(a_monnam); ordinary type article. */
function Amonnam(mtmp) {
    const raw = mtmp?.data?.name || 'monster';
    const plain = String(raw).replace(/^PM_/, '').replace(/_/g, ' ').toLowerCase();
    const withArt = an(plain);
    return withArt.charAt(0).toUpperCase() + withArt.slice(1);
}

/** C ref: minion.c ndemon — mkclass_aligned(S_DEMON) that is_ndemon. */
export function ndemon(atyp) {
    const ptr = mkclass_aligned('S_DEMON', 0, atyp);
    return (ptr && is_ndemon(ptr)) ? (ptr.mndx | 0) : NON_PM;
}

/** C ref: minion.c dlord — rn1 among juiblex..yeenoghu, else ndemon. */
export function dlord(atyp) {
    const tryctMax = !In_endgame(game.u?.uz) ? 20 : 0;
    for (let tryct = tryctMax; tryct > 0; --tryct) {
        const pm = rn1(PM_YEENOGHU + 1 - PM_JUIBLEX, PM_JUIBLEX);
        const gone = ((game.mvitals?.[pm]?.mvflags ?? 0) & G_GONE) !== 0;
        const ptr = mons(pm);
        if (!gone && (atyp === A_NONE || sgn(ptr?.maligntyp) === sgn(atyp))) {
            return pm;
        }
    }
    return ndemon(atyp);
}

/** C ref: minion.c dprince — rn1 among orcus..demogorgon, else dlord. */
export function dprince(atyp) {
    const tryctMax = !In_endgame(game.u?.uz) ? 20 : 0;
    for (let tryct = tryctMax; tryct > 0; --tryct) {
        const pm = rn1(PM_DEMOGORGON + 1 - PM_ORCUS, PM_ORCUS);
        const gone = ((game.mvitals?.[pm]?.mvflags ?? 0) & G_GONE) !== 0;
        const ptr = mons(pm);
        if (!gone && (atyp === A_NONE || sgn(ptr?.maligntyp) === sgn(atyp))) {
            return pm;
        }
    }
    return dlord(atyp);
}

/**
 * C ref: minion.c msummon — summon help for demon fight (or WoY-like).
 * Named omissions: is_lminion / PM_ANGEL arms; show_transient_light /
 * transient_light_cleanup for S_ANGEL; full EPRI/EMIN align when unset.
 */
export async function msummon(mon) {
    let ptr;
    let atyp;
    let dtype = NON_PM;
    let cnt = 0;
    let result = 0;

    if (mon) {
        ptr = mon.data;
        if (u_wield_art(ART_DEMONBANE) && is_demon(ptr)) {
            if (canseemon(mon)) {
                await pline(`${Monnam(mon)} looks puzzled for a moment.`);
            }
            return 0;
        }
        if (mon.ispriest && mon.mextra?.epri?.shralign != null) {
            atyp = mon.mextra.epri.shralign | 0;
        } else if (mon.isminion && mon.mextra?.emin?.min_align != null) {
            atyp = mon.mextra.emin.min_align | 0;
        } else if ((ptr?.maligntyp | 0) === A_NONE) {
            atyp = A_NONE;
        } else {
            atyp = sgn(ptr?.maligntyp | 0);
        }
    } else {
        ptr = mons(PM_WIZARD_OF_YENDOR);
        atyp = ((ptr?.maligntyp | 0) === A_NONE) ? A_NONE : sgn(ptr?.maligntyp | 0);
    }

    const mndx = ptr?.mndx ?? NON_PM;
    if (is_dprince(ptr) || mndx === PM_WIZARD_OF_YENDOR) {
        dtype = (!rn2(20)) ? dprince(atyp) : (!rn2(4)) ? dlord(atyp) : ndemon(atyp);
        cnt = ((dtype !== NON_PM) && !rn2(4) && is_ndemon(mons(dtype))) ? 2 : 1;
    } else if (is_dlord(ptr)) {
        dtype = (!rn2(50)) ? dprince(atyp) : (!rn2(20)) ? dlord(atyp) : ndemon(atyp);
        cnt = ((dtype !== NON_PM) && !rn2(4) && is_ndemon(mons(dtype))) ? 2 : 1;
    } else if (mndx === PM_BONE_DEVIL) {
        dtype = PM_SKELETON;
        cnt = 1;
    } else if (is_ndemon(ptr)) {
        dtype = (!rn2(20)) ? dlord(atyp) : (!rn2(6)) ? ndemon(atyp) : mndx;
        cnt = 1;
    }
    // is_lminion / PM_ANGEL deferred — dtype stays NON_PM

    if (dtype === NON_PM) return 0;

    if (cnt > 1 && ((mons(dtype)?.geno ?? 0) & G_UNIQ) !== 0) cnt = 1;
    if (((game.mvitals?.[dtype]?.mvflags ?? 0) & G_GONE) !== 0) {
        dtype = ndemon(atyp);
        if (dtype === NON_PM) return 0;
    }

    const census = monster_census(false);
    const u = game.u || {};

    while (cnt > 0) {
        const mtmp = makemon(mons(dtype), u.ux, u.uy, MM_EMIN | MM_NOMSG);
        if (mtmp) {
            result++;
            if (dtype === PM_ANGEL) {
                mtmp.isminion = 1;
                if (!mtmp.mextra?.emin) newemin(mtmp);
                mtmp.mextra.emin.min_align = atyp;
                // C: (atyp != u.ualign.type) ^ !mtmp->mpeaceful
                mtmp.mextra.emin.renegade =
                    ((atyp !== (u.ualign?.type | 0)) ^ !(mtmp.mpeaceful | 0)) !== 0;
            }
            // S_ANGEL transient light deferred
            if (cnt === 1 && canseemon(mtmp)) {
                const { cloud, what } = msummon_environ(mtmp.data);
                await pline(`${Amonnam(mtmp)} appears in a ${cloud} of ${what}!`);
            }
        }
        cnt--;
    }

    if (result) result = monster_census(false) - census;
    return result;
}
