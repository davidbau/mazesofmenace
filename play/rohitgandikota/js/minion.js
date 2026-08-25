// minion.js — aligned minions.
// C ref: src/minion.c
//
// Ports demon and aligned summoning plus the Astral-arrival guardian angel
// machinery. Demon bribery and direct god-sent minion summons remain gaps.

import { game } from './gstate.js';
import { rn1, rn2, rnd, d } from './rng.js';
import { PMNAMES, MONSYMS, MFLAGS } from './monst_data.js';
import { ONAMES } from './objects_data.js';
import { A_NONE, A_LAWFUL, A_NEUTRAL, A_CHAOTIC, G_GONE, G_UNIQ,
         In_endgame, W_ARMS } from './const.js';
import { enexto } from './teleport.js';
import { mk_roamer } from './priest.js';
import { makemon, mkclass, mkclass_aligned, monsndx, mongets,
         MM_EMIN, MM_NOMSG } from './makemon.js';
import { mksobj, bless } from './mkobj.js';
import { mpickobj } from './steal.js';
import { select_hwep } from './weapon.js';
import { which_armor, m_dowear } from './worn.js';
import { newsym, pline, canseemon, canspotmon } from './display.js';
import { You_feel } from './pline.js';
import { Deaf } from './youprop.js';
import { mongone } from './mon.js';
import { Amonnam, Monnam } from './do_name.js';
import { is_demon, is_lord, is_prince } from './mondata.js';
import { ART_DEMONBANE } from './artilist_data.js';
import { show_transient_light } from './light.js';
import { sgn } from './hacklib.js';

function note_unported_minion(what) {
    (game.unported ||= new Set()).add('minion:' + what);
}

const elementals = [
    PMNAMES.PM_AIR_ELEMENTAL, PMNAMES.PM_FIRE_ELEMENTAL,
    PMNAMES.PM_EARTH_ELEMENTAL, PMNAMES.PM_WATER_ELEMENTAL,
];

const is_dprince = (ptr) => is_demon(ptr) && is_prince(ptr);
const is_dlord = (ptr) => is_demon(ptr) && is_lord(ptr);
const is_ndemon = (ptr) => is_demon(ptr) && !is_lord(ptr) && !is_prince(ptr);
const mon_aligntyp = (mon) => mon.ispriest
    ? (mon.epri?.shralign ?? mon.mextra?.epri?.shralign ?? A_NONE)
    : mon.isminion
        ? (mon.emin?.min_align ?? mon.mextra?.emin?.min_align ?? A_NONE)
        : mon.data.maligntyp;
const is_lminion = (mon) =>
    (mon.data.mflags2 & MFLAGS.M2_MINION) !== 0
    && mon_aligntyp(mon) === A_LAWFUL;

// src/minion.c:39 monster_census()
export function monster_census(spotted) {
    let count = 0;

    for (const mtmp of game.level?.monsters || []) {
        if ((mtmp.mhp ?? 0) < 1)
            continue;
        if (mtmp.isgd && mtmp.mx === 0)
            continue;
        if (spotted && !canspotmon(mtmp))
            continue;
        ++count;
    }
    return count;
}

function msummon_environ(mptr) {
    const mndx = mptr.mlet === MONSYMS.S_ANGEL ? PMNAMES.PM_ANGEL
               : mptr.mlet === MONSYMS.S_LIGHT ? PMNAMES.PM_YELLOW_LIGHT
                 : monsndx(mptr);

    switch (mndx) {
    case PMNAMES.PM_WATER_DEMON:
    case PMNAMES.PM_AIR_ELEMENTAL:
    case PMNAMES.PM_WATER_ELEMENTAL:
    case PMNAMES.PM_FOG_CLOUD:
    case PMNAMES.PM_ICE_VORTEX:
    case PMNAMES.PM_FREEZING_SPHERE:
        return { cloud: 'cloud', what: 'vapor' };
    case PMNAMES.PM_STEAM_VORTEX:
        return { cloud: 'cloud', what: 'steam' };
    case PMNAMES.PM_ENERGY_VORTEX:
    case PMNAMES.PM_SHOCKING_SPHERE:
        return { cloud: 'shower', what: 'sparks' };
    case PMNAMES.PM_EARTH_ELEMENTAL:
    case PMNAMES.PM_DUST_VORTEX:
        return { cloud: 'cloud', what: 'dust' };
    case PMNAMES.PM_FIRE_ELEMENTAL:
    case PMNAMES.PM_FIRE_VORTEX:
    case PMNAMES.PM_FLAMING_SPHERE:
        return { cloud: 'ball', what: 'flame' };
    case PMNAMES.PM_ANGEL:
    case PMNAMES.PM_YELLOW_LIGHT:
        return { cloud: 'flash', what: 'light' };
    default:
        return { cloud: 'cloud', what: 'smoke' };
    }
}

// src/minion.c:59 msummon()
export async function msummon(mon) {
    let ptr, dtype = -1, cnt = 0, atyp;

    if (mon) {
        ptr = mon.data;

        if (game.u.uwep?.oartifact === ART_DEMONBANE && is_demon(ptr)) {
            if (canseemon(mon))
                await pline(`${Monnam(mon)} looks puzzled for a moment.`);
            return 0;
        }

        atyp = mon.ispriest
            ? (mon.epri?.shralign ?? mon.mextra?.epri?.shralign ?? A_NONE)
            : mon.isminion
                ? (mon.emin?.min_align ?? mon.mextra?.emin?.min_align ?? A_NONE)
                : ptr.maligntyp === A_NONE ? A_NONE : sgn(ptr.maligntyp);
    } else {
        ptr = game.mons[PMNAMES.PM_WIZARD_OF_YENDOR];
        atyp = ptr.maligntyp === A_NONE ? A_NONE : sgn(ptr.maligntyp);
    }

    if (is_dprince(ptr) || ptr === game.mons[PMNAMES.PM_WIZARD_OF_YENDOR]) {
        dtype = !rn2(20) ? dprince(atyp)
              : !rn2(4) ? dlord(atyp) : ndemon(atyp);
        cnt = dtype !== -1 && !rn2(4) && is_ndemon(game.mons[dtype]) ? 2 : 1;
    } else if (is_dlord(ptr)) {
        dtype = !rn2(50) ? dprince(atyp)
              : !rn2(20) ? dlord(atyp) : ndemon(atyp);
        cnt = dtype !== -1 && !rn2(4) && is_ndemon(game.mons[dtype]) ? 2 : 1;
    } else if (ptr === game.mons[PMNAMES.PM_BONE_DEVIL]) {
        dtype = PMNAMES.PM_SKELETON;
        cnt = 1;
    } else if (is_ndemon(ptr)) {
        dtype = !rn2(20) ? dlord(atyp)
              : !rn2(6) ? ndemon(atyp) : monsndx(ptr);
        cnt = 1;
    } else if (is_lminion(mon)) {
        dtype = is_lord(ptr) && !rn2(20)
            ? llord()
            : is_lord(ptr) || !rn2(6) ? lminion() : monsndx(ptr);
        cnt = dtype !== -1 && !rn2(4) && !is_lord(game.mons[dtype]) ? 2 : 1;
    } else if (ptr === game.mons[PMNAMES.PM_ANGEL]) {
        if (!rn2(6)) {
            switch (atyp) {
            case A_NEUTRAL:
                dtype = elementals[rn2(elementals.length)];
                break;
            case A_CHAOTIC:
            case A_NONE:
                dtype = ndemon(atyp);
                break;
            default:
                break;
            }
        } else {
            dtype = PMNAMES.PM_ANGEL;
        }
        cnt = dtype !== -1 && !rn2(4) && !is_lord(game.mons[dtype]) ? 2 : 1;
    }

    if (dtype === -1)
        return 0;

    if (cnt > 1 && (game.mons[dtype].geno & G_UNIQ) !== 0)
        cnt = 1;
    if ((game.mvitals[dtype].mvflags & G_GONE) !== 0) {
        dtype = ndemon(atyp);
        if (dtype === -1)
            return 0;
    }

    const census = monster_census(false);
    let result = 0;

    while (cnt > 0) {
        const mtmp = makemon(game.mons[dtype], game.u.ux, game.u.uy,
                             MM_EMIN | MM_NOMSG);
        if (mtmp) {
            ++result;
            if (dtype === PMNAMES.PM_ANGEL) {
                const emin = {
                    min_align: atyp,
                    renegade: (atyp !== game.u.ualign.type) !== !mtmp.mpeaceful,
                };
                mtmp.emin = emin;
                (mtmp.mextra ||= {}).emin = emin;
                mtmp.isminion = 1;
            }

            if (mtmp.data.mlet === MONSYMS.S_ANGEL && !game.u.ublind)
                show_transient_light(null, mtmp.mx, mtmp.my);

            if (cnt === 1 && canseemon(mtmp)) {
                const { cloud, what } = msummon_environ(mtmp.data);
                await pline(`${Amonnam(mtmp)} appears in a ${cloud} of ${what}!`);
            }
        }
        --cnt;
    }

    if (result)
        result = monster_census(false) - census;
    return result;
}

// src/minion.c:391 dprince()
export function dprince(atyp) {
    for (let tryct = !In_endgame(game.u.uz) ? 20 : 0; tryct > 0; --tryct) {
        const pm = rn1(PMNAMES.PM_DEMOGORGON + 1 - PMNAMES.PM_ORCUS,
                       PMNAMES.PM_ORCUS);
        if (!(game.mvitals[pm].mvflags & G_GONE)
            && (atyp === A_NONE
                || sgn(game.mons[pm].maligntyp) === sgn(atyp)))
            return pm;
    }
    return dlord(atyp);
}

// src/minion.c:405 dlord()
export function dlord(atyp) {
    for (let tryct = !In_endgame(game.u.uz) ? 20 : 0; tryct > 0; --tryct) {
        const pm = rn1(PMNAMES.PM_YEENOGHU + 1 - PMNAMES.PM_JUIBLEX,
                       PMNAMES.PM_JUIBLEX);
        if (!(game.mvitals[pm].mvflags & G_GONE)
            && (atyp === A_NONE
                || sgn(game.mons[pm].maligntyp) === sgn(atyp)))
            return pm;
    }
    return ndemon(atyp);
}

// src/minion.c:420 llord()
export function llord() {
    if (!(game.mvitals[PMNAMES.PM_ARCHON].mvflags & G_GONE))
        return PMNAMES.PM_ARCHON;
    return lminion();
}

// src/minion.c:429 lminion()
export function lminion() {
    for (let tryct = 0; tryct < 20; ++tryct) {
        const ptr = mkclass(MONSYMS.S_ANGEL, 0);
        if (ptr && !is_lord(ptr))
            return monsndx(ptr);
    }
    return -1;
}

// src/minion.c:444 ndemon()
export function ndemon(atyp) {
    const ptr = mkclass_aligned(MONSYMS.S_DEMON, 0, atyp);
    return ptr && is_ndemon(ptr) ? monsndx(ptr) : -1;
}

// src/minion.c:469 lose_guardian_angel() — the angel rebukes a conflict
// hero (or never appears) and 2 to 4 hostile angels arrive instead.
export async function lose_guardian_angel(mon) {
    const mm = { x: 0, y: 0 };

    if (mon) {
        if (canspotmon(mon)) {
            if (!Deaf()) {
                await pline(`${Monnam(mon)} rebukes you, saying:`);
                await pline('"Since you desire conflict, have some more!"');
            } else {
                await pline(`${Monnam(mon)} vanishes!`);
            }
        }
        mongone(mon);
    }
    /* create 2 to 4 hostile angels to replace the lost guardian */
    for (let i = rn1(3, 2); i > 0; --i) {
        mm.x = game.u.ux;
        mm.y = game.u.uy;
        if (enexto(mm, mm.x, mm.y, game.mons[PMNAMES.PM_ANGEL]))
            mk_roamer(game.mons[PMNAMES.PM_ANGEL], game.u.ualign.type,
                      mm.x, mm.y, false);
    }
}

// src/minion.c:498 gain_guardian_angel() — just entered the Astral Plane;
// receive a tame guardian angel if worthy (alignment record > 8).
export async function gain_guardian_angel() {
    const mm = { x: 0, y: 0 };

    /* Hear_again() (eat.c:1800): attempt to cure any deafness now (divine
       message will be heard even if that fails). The rn2(2) is
       unconditional; make_deaf(0) itself is the unwired part (the DEAF
       property timer machinery), so on success the timer is just cleared. */
    if (!rn2(2)) {
        (game.u.intrinsic ||= {}).HDeaf = 0;  /* make_deaf(0L, FALSE) */
        game.botl = true;
    }
    if (game.u.uprops?.CONFLICT) {
        if (!Deaf())
            await pline('A voice booms:');
        else
            await You_feel('a booming voice:');
        await pline('"Thy desire for conflict shall be fulfilled!"');
        /* send in some hostile angels instead */
        await lose_guardian_angel(null);
    } else if (game.u.ualign.record > 8) { /* fervent */
        if (!Deaf())
            await pline('A voice whispers:');
        else
            await You_feel('a soft voice:');
        await pline('"Thou hast been worthy of me!"');
        mm.x = game.u.ux;
        mm.y = game.u.uy;
        let mtmp;
        if (enexto(mm, mm.x, mm.y, game.mons[PMNAMES.PM_ANGEL])
            && (mtmp = mk_roamer(game.mons[PMNAMES.PM_ANGEL],
                                 game.u.ualign.type, mm.x, mm.y,
                                 true)) != null) {
            mtmp.mstrategy = (mtmp.mstrategy | 0) & ~0x80000000; /* APPEARMSG */
            /* guardian angel -- the one case mtame doesn't imply an
               edog structure. Petless conduct is preserved: the angel
               appears but won't be tamed. */
            if (game.u.uconduct?.pets) {
                mtmp.mtame = 10;
                game.u.uconduct.pets++;
            }
            /* for 'hilite_pet'; after making tame, before next message */
            await newsym(mtmp.mx, mtmp.my);
            if (!game.u.ublind)
                await pline('An angel appears near you.');
            else
                await You_feel(
                    'the presence of a friendly angel near you.');
            /* make him strong enough vs. endgame foes */
            mtmp.m_lev = rn1(8, 15);
            mtmp.mhp = mtmp.mhpmax =
                d(mtmp.m_lev, 10) + 30 + rnd(30);
            let otmp = select_hwep(mtmp);
            if (!otmp) {
                otmp = mksobj(ONAMES.SILVER_SABER, false, false);
                if (mpickobj(mtmp, otmp))
                    throw new Error('merged weapon?');
            }
            bless(otmp);
            if (otmp.spe < 4)
                otmp.spe += rnd(4);
            otmp = which_armor(mtmp, W_ARMS);
            if (!otmp || otmp.otyp !== ONAMES.SHIELD_OF_REFLECTION) {
                mongets(mtmp, ONAMES.AMULET_OF_REFLECTION);
                m_dowear(mtmp, true);
            }
        }
    }
}
