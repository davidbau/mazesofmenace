// monmove.js — Monster AI movement (minimal RNG-faithful stubs).
// C ref: monmove.c — distfleeck, dochug, m_move, postmov, set_apparxy, mon_track_add.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { dog_move } from './dogmove.js';
import { newsym } from './display.js';
import {
    dist2,
    monnear,
    mon_allowflags,
    mfndpos,
} from './mon.js';
import { is_wanderer } from './monsters.js';
import {
    mintrap,
    NO_TRAP_FLAGS,
    Trap_Killed_Mon,
    Trap_Moved_Mon,
} from './trap.js';

const MTSZ = 4;
const BOLT_LIM = 8;
const MMOVE_NOTHING = 0;
const MMOVE_MOVED = 1;
const MMOVE_DIED = 2;
const MMOVE_DONE = 3;
const MMOVE_NOMOVES = 4;

// C ref: monmove.c mon_track_add()
export function mon_track_add(mtmp, x, y) {
    if (!mtmp.mtrack) {
        mtmp.mtrack = [
            { x: 0, y: 0 },
            { x: 0, y: 0 },
            { x: 0, y: 0 },
            { x: 0, y: 0 },
        ];
    }
    for (let j = MTSZ - 1; j > 0; j--) {
        mtmp.mtrack[j] = { ...mtmp.mtrack[j - 1] };
    }
    mtmp.mtrack[0] = { x, y };
}

// C ref: monmove.c set_apparxy() — visible, non-displaced path (no RNG)
export function set_apparxy(mtmp) {
    // Pets / already-know / seen: mux/muy = hero. Seed8000 commons see hero.
    mtmp.mux = game.u.ux;
    mtmp.muy = game.u.uy;
}

// C ref: monmove.c distfleeck()
export function distfleeck(mtmp) {
    // bravegremlin roll always happens even if unused
    const bravegremlin = rn2(5) === 0;
    void bravegremlin;

    const inrange = dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy)
        <= (BOLT_LIM * BOLT_LIM);
    const nearby = inrange && monnear(mtmp, mtmp.mux, mtmp.muy);
    // onscary / flees_light / sanctuary not hit for seed8000 starter path
    const scared = 0;
    return { inrange: inrange ? 1 : 0, nearby: nearby ? 1 : 0, scared };
}

// C ref: monmove.c postmov() — after a successful step, trigger traps
async function postmov(mtmp, omx, omy, mmoved) {
    if (mmoved === MMOVE_MOVED) {
        newsym(omx, omy); // update the old position
        const trapret = await mintrap(mtmp, NO_TRAP_FLAGS);
        if (trapret === Trap_Killed_Mon || trapret === Trap_Moved_Mon) {
            if (mtmp.mx) newsym(mtmp.mx, mtmp.my);
            return MMOVE_DIED;
        }
        // door open / tunnel / notice_mon / engulf deferred
        // C: else of engulfing_u — always newsym new position after mintrap
        if (mtmp.mx) newsym(mtmp.mx, mtmp.my);
    }
    return mmoved;
}

// C ref: monmove.c m_move() — pets → postmov(dog_move); else approach / track path
export async function m_move(mtmp, after) {
    // C: if (mtmp->mtame) return postmov(..., dog_move(...), ...)
    if (mtmp.mtame) {
        const omx = mtmp.mx;
        const omy = mtmp.my;
        const mmoved = await dog_move(mtmp, after);
        return postmov(mtmp, omx, omy, mmoved);
    }

    const omx = mtmp.mx;
    const omy = mtmp.my;

    set_apparxy(mtmp);

    const ggx = mtmp.mux;
    const ggy = mtmp.muy;
    let appr = mtmp.mflee ? -1 : 1;
    if (mtmp.mconf) {
        appr = 0;
    } else if (mtmp.mpeaceful && !mtmp.isshk) {
        // C: peaceful (non-shk) → appr = 0
        appr = 0;
    }

    // Hostiles keep appr=1; peaceful wander uses !rn2(++chcnt) instead of track.

    const flag = mon_allowflags(mtmp);
    const mfp = { cnt: 0, poss: [], info: [] };
    const cnt = mfndpos(mtmp, mfp, flag);
    if (cnt === 0) return MMOVE_NOMOVES;

    let nix = omx;
    let niy = omy;
    let chcnt = 0;
    const jcnt = Math.min(MTSZ, cnt - 1);
    let nidist = dist2(nix, niy, ggx, ggy);
    let mmoved = MMOVE_NOTHING;

    for (let i = 0; i < cnt; i++) {
        const nx = mfp.poss[i].x;
        const ny = mfp.poss[i].y;
        let skip = false;

        if (appr !== 0) {
            for (let j = 0; j < jcnt; j++) {
                const mtrk = mtmp.mtrack[j];
                if (mtrk && nx === mtrk.x && ny === mtrk.y) {
                    // C ref: monmove.c:1963
                    if (rn2(4 * (cnt - j))) {
                        skip = true;
                        break;
                    }
                }
            }
            if (skip) continue;
        }

        const ndist = dist2(nx, ny, ggx, ggy);
        const nearer = ndist < nidist;
        // Match C left-to-right short-circuit: only peaceful path bumps chcnt/rn2
        if (
            (appr === 1 && nearer)
            || (appr === -1 && !nearer)
            || (!appr && !rn2(++chcnt))
            || mmoved === MMOVE_NOTHING
        ) {
            nix = nx;
            niy = ny;
            nidist = ndist;
            mmoved = MMOVE_MOVED;
        }
    }

    if (mmoved === MMOVE_NOTHING) return MMOVE_NOTHING;

    // Attack-you square: leave in place for now (mattacku not ported)
    if (nix === game.u.ux && niy === game.u.uy) {
        return MMOVE_DONE;
    }

    // Actually step
    mtmp.mx = nix;
    mtmp.my = niy;
    mon_track_add(mtmp, omx, omy);
    newsym(omx, omy);
    newsym(nix, niy);
    return MMOVE_MOVED;
}

// C ref: monmove.c dochug()
export async function dochug(mtmp) {
    if (!mtmp.mcanmove) return 0;
    if (mtmp.msleeping) return 0; // disturb not needed: fill mons start awake

    set_apparxy(mtmp);
    let { inrange, nearby, scared } = distfleeck(mtmp);

    const mdat = mtmp.data;
    // C: short-circuit OR — wanderer rn2(4) is evaluated before mpeaceful
    const want_move = (
        !nearby
        || mtmp.mflee
        || scared
        || mtmp.mconf
        || mtmp.mstun
        || (mtmp.minvis && !rn2(3))
        || (is_wanderer(mdat) && !rn2(4))
        || (!mtmp.mcansee && !rn2(4))
        || mtmp.mpeaceful
    );

    // PHASE THREE: move if not adjacent-hostile (attack path)
    if (want_move) {
        let status = MMOVE_NOTHING;
        status = await m_move(mtmp, 0);
        if (status !== MMOVE_DIED) {
            ({ inrange, nearby, scared } = distfleeck(mtmp));
        }
        if (status === MMOVE_MOVED) {
            // can move then shoot — not on seed8000 commons at range
            return 0;
        }
        // fall through to attacks for NOTHING/DONE/NOMOVES
    }

    // PHASE FOUR: attack hero if hostile + in range — stub (no RNG for miss)
    if (
        !mtmp.mpeaceful
        && inrange
        && !scared
        && nearby
    ) {
        // mattacku stub — seed8000 starter never reaches melee with these mons
    }
    return 0;
}

// C ref: monmove.c dochugw()
export async function dochugw(mtmp, chug) {
    if (chug) await dochug(mtmp);
    return 0;
}
