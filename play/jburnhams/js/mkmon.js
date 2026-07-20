import { game } from './gstate.js';
import { M_AP_NOTHING, MSLOW, MON_FLOOR, MON_OFFMAP, MON_DETACH, MON_MIGRATING } from './const.js';
import { next_ident } from './mkobj.js';
import { isok } from './hacklib.js';

export function DEADMONSTER(mon) {
    return mon.mhp < 1;
}

export function newmonst() {
    let mon = {

        nmon: null,
        data: null,
        m_id: 0,
        mnum: 0,
        cham: 0,
        movement: 0,
        m_lev: 0,
        malign: 0,
        mx: 0,
        my: 0,
        mux: 0,
        muy: 0,
        mtrack: [{x:0, y:0}, {x:0, y:0}, {x:0, y:0}, {x:0, y:0}],
        mhp: 0,
        mhpmax: 0,
        mappearance: 0,
        m_ap_type: M_AP_NOTHING,
        mtame: 0,
        mintrinsics: 0,
        mextrinsics: 0,
        seen_resistance: 0,
        mspec_used: 0,
        female: 0,
        minvis: 0,
        invis_blkd: 0,
        perminvis: 0,
        mcan: 0,
        mburied: 0,
        mundetected: 0,
        mcansee: 0,
        mspeed: 0,
        permspeed: 0,
        mrevived: 0,
        mcloned: 0,
        mavenge: 0,
        mflee: 0,
        mfleetim: 0,
        msleeping: 0,
        mblinded: 0,
        mstun: 0,
        mfrozen: 0,
        mcanmove: 0,
        mconf: 0,
        mpeaceful: 0,
        mtrapped: 0,
        mleashed: 0,
        isshk: 0,
        isminion: 0,
        isgd: 0,
        ispriest: 0,
        iswiz: 0,
        wormno: 0,
        mtemplit: 0,
        meverseen: 0,
        mspotted: 0,
        mwandexp: 0,
        mgenmklev: 0,
        mstrategy: 0,
        mgoal: {x:0, y:0},
        mtrapseen: 0,
        mlstmv: 0,
        mstate: MON_FLOOR,
        migflags: 0,
        mspare1: 0,
        minvent: null,
        mw: null,
        misc_worn_check: 0,
        weapon_check: 0,
        meating: 0,
        mextra: null
    };
    // Assign ID during creation like C newmonst()
    mon.m_id = next_ident();
    return mon;
}


export function place_monster(mon, x, y) {
    if (!isok(x, y) && (x !== 0 || y !== 0 || !mon.isgd)) {
        // impossible("trying to place %s at <%d,%d> mstate:%lx on %s", ...
        x = 0;
        y = 0;
    }

    // special case is for convoluted vault guard handling
    if ((mon === game.u?.usteed && !game.gi?.in_steed_dismounting) ||
        (DEADMONSTER(mon) && !(mon.isgd && x === 0 && y === 0))) {
        // impossible("placing %s onto map, mstate:%lx, on %s?", ...
        return;
    }

    let othermon = game.level.monsters[x][y];
    if (othermon) {
        // impossible("placing %s over %s at <%d,%d>, mstates:%lx %lx on %s?", ...
    }

    mon.mx = x;
    mon.my = y;
    game.level.monsters[x][y] = mon;
    mon.mstate = MON_FLOOR;
}

export function m_at(x, y) {
    // svl.level.monsters[x][y] != (struct monst *) 0
    return game.level.monsters[x]?.[y] || null;
}

import { mons } from './monst.js';
import * as C from './const.js';
import * as hacklib from './hacklib.js';
import * as mondata from './mondata.js';
import { rn1, rn2 } from './rng.js';

export function uncommon(mndx) {
    if ((mons[mndx].geno & (C.G_NOGEN | C.G_UNIQ)) !== 0)
        return true;
    if ((game.mvitals[mndx].mvflags & C.G_GONE) !== 0)
        return true;
    if (hacklib.Inhell())
        return mons[mndx].maligntyp > C.A_NEUTRAL;
    else
        return (mons[mndx].geno & C.G_HELL) !== 0;
}

export function align_shift(ptr) {
    let alshift = 0;
    let align = game.dungeons[game.u.uz.dnum]?.flags?.align ?? C.AM_NONE;

    switch (align) {
        default:
        case C.AM_NONE:
            alshift = 0;
            break;
        case C.AM_LAWFUL:
            alshift = Math.trunc((ptr.maligntyp + 20) / (2 * C.ALIGNWEIGHT));
            break;
        case C.AM_NEUTRAL:
            alshift = Math.trunc((20 - Math.abs(ptr.maligntyp)) / C.ALIGNWEIGHT);
            break;
        case C.AM_CHAOTIC:
            alshift = Math.trunc((-(ptr.maligntyp - 20)) / (2 * C.ALIGNWEIGHT));
            break;
    }
    return alshift;
}

export function temperature_shift(ptr) {
    if (game.level.flags.temperature
        && mondata.pm_resistance(ptr, (game.level.flags.temperature > 0)
                         ? C.MR_FIRE : C.MR_COLD))
        return 3;
    return 0;
}

export function isupper_monsym(ptr) {
    return ptr.mlet >= C.S_ANGEL && ptr.mlet <= C.S_ZOMBIE;
}

import { PM_LONG_WORM_TAIL } from './monst.js';

export function rndmonst() {
    return rndmonst_adj(0, 0);
}

export function rndmonst_adj(minadj, maxadj) {
    let ptr;
    let weight, totalweight = 0, selected_mndx = C.NON_PM;

    let zlevel = hacklib.level_difficulty();
    let minmlev = mondata.monmin_difficulty(zlevel) + minadj;
    let maxmlev = mondata.monmax_difficulty(zlevel) + maxadj;
    let upper = C.Is_rogue_level();
    let elemlevel = C.In_endgame() && !C.Is_astralevel();

    for (let mndx = C.LOW_PM; mndx < PM_LONG_WORM_TAIL; ++mndx) {
        ptr = mons[mndx];

        if (mondata.montooweak(mndx, minmlev) || mondata.montoostrong(mndx, maxmlev))
            continue;
        if (upper && !isupper_monsym(ptr))
            continue;
        if (elemlevel && mondata.wrong_elem_type(ptr))
            continue;
        if (uncommon(mndx))
            continue;
        if (hacklib.Inhell() && (ptr.geno & C.G_NOHELL) !== 0)
            continue;

        weight = (ptr.geno & C.G_FREQ) + align_shift(ptr);
        weight += temperature_shift(ptr);

        if (weight < 0 || weight > 127) {
            weight = 0;
        }

        if (weight > 0) {
            for (let count = 0; count < weight; count++) {
                totalweight++;
                if (rn2(totalweight) === 0)
                    selected_mndx = mndx;
            }
        }
    }

    if (selected_mndx === C.NON_PM || uncommon(selected_mndx)) {
        return null;
    }
    return mons[selected_mndx];
}

export function rndmonnum() {
    return rndmonnum_adj(0, 0);
}

export function rndmonnum_adj(minadj, maxadj) {
    let ptr = rndmonst_adj(minadj, maxadj);
    if (ptr)
        return mondata.monsndx(ptr);

    let excludeflags = C.G_UNIQ | C.G_NOGEN | (hacklib.Inhell() ? C.G_NOHELL : C.G_HELL);
    let i;
    do {
        i = rn1(PM_LONG_WORM_TAIL - C.LOW_PM, C.LOW_PM);
        ptr = mons[i];
    } while ((ptr.geno & excludeflags) !== 0);

    return i;
}
