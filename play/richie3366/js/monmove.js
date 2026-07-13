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
import {
    is_wanderer, is_armed, passes_walls, monsterNames,
    M1_SEE_INVIS, M1_AMORPHOUS,
} from './monsters.js';
import {
    mintrap,
    NO_TRAP_FLAGS,
    Trap_Killed_Mon,
    Trap_Moved_Mon,
    Trap_Caught_Mon,
} from './trap.js';
import { mattacku } from './mhitu.js';
import { couldsee } from './vision.js';
import {
    isok, ACCESSIBLE, IS_DOOR, D_CLOSED, D_LOCKED, u_at, DISPLACED,
} from './const.js';
import { CLOAK_OF_DISPLACEMENT, COIN_CLASS } from './objects.js';

const MTSZ = 4;
const BOLT_LIM = 8;
const MMOVE_NOTHING = 0;
const MMOVE_MOVED = 1;
const MMOVE_DIED = 2;
const MMOVE_DONE = 3;
const MMOVE_NOMOVES = 4;

// C monsters.h indices (not exported from monsters_data)
const PM_DISPLACER_BEAST = monsterNames.indexOf('PM_DISPLACER_BEAST');
const PM_XORN = monsterNames.indexOf('PM_XORN');

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

/** C ref: invent.c money_cnt — sum COIN_CLASS quan. */
function money_cnt(invent) {
    let sum = 0;
    for (const o of invent || []) {
        if (o.oclass === COIN_CLASS) sum += o.quan || 0;
    }
    return sum;
}

/** C ref: mondata.h perceives — M1_SEE_INVIS. */
function perceives(ptr) {
    return !!((ptr?.mflags1 ?? 0) & M1_SEE_INVIS);
}

/**
 * C ref: youprop.h Displaced — HDisplaced || EDisplaced.
 * Extrinsic from cloak: oc_oprop wiring deferred; match worn
 * CLOAK_OF_DISPLACEMENT (Ranger kit / displacement cloak).
 */
function Displaced() {
    const u = game.u || {};
    if (u.HDisplaced || u.uprops?.[DISPLACED]?.intrinsic) return true;
    if (u.uprops?.[DISPLACED]?.extrinsic) return true;
    const cloak = u.uarmc;
    return !!(cloak && cloak.otyp === CLOAK_OF_DISPLACEMENT);
}

/** C ref: monmove.c closed_door / mthrowu closed_door. */
function closed_door(x, y) {
    const loc = game.level?.at?.(x, y);
    if (!loc || !IS_DOOR(loc.typ)) return false;
    return !!((loc.doormask || 0) & (D_CLOSED | D_LOCKED));
}

/**
 * C ref: monmove.c accessible — ACCESSIBLE(SURFACE_AT) && !closed_door.
 * DRAWBRIDGE_UP under-typ deferred (named omission).
 */
function accessible(x, y) {
    const loc = game.level?.at?.(x, y);
    if (!loc) return false;
    return ACCESSIBLE(loc.typ) && !closed_door(x, y);
}

/**
 * C ref: monmove.c can_ooze — amorphous && !stuff_prevents_passage.
 * stuff_prevents_passage body deferred → treat as empty invent (ok).
 */
function can_ooze(mtmp) {
    return !!((mtmp?.data?.mflags1 ?? 0) & M1_AMORPHOUS);
}

/**
 * C ref: monmove.c can_fog — vampshifter fog form.
 * Named omission: full vampshifter / Protection_from_shape_changers.
 */
function can_fog(_mtmp) {
    return false;
}

/**
 * C ref: monmove.c set_apparxy — decide where monster thinks hero stands.
 * Covers Displaced / Invis / Underwater / already-know early exits.
 */
export function set_apparxy(mtmp) {
    const u = game.u || {};
    let mx = mtmp.mux;
    let my = mtmp.muy;
    const umoney = money_cnt(game.invent);

    // pet / grabber / still believes hero at current mux,muy
    if (mtmp.mtame || mtmp === u.ustuck || u_at(mx, my)) {
        mtmp.mux = u.ux;
        mtmp.muy = u.uy;
        return;
    }

    const Invis = !!(u.Invis);
    const Underwater = !!(u.Underwater);
    const notseen = (!mtmp.mcansee || (Invis && !perceives(mtmp.data)));
    const notthere = (
        Displaced() && mtmp.data?.mndx !== PM_DISPLACER_BEAST
    );

    let displ;
    if (Underwater) {
        displ = 1;
    } else if (notseen) {
        displ = (mtmp.data?.mndx === PM_XORN && umoney) ? 0 : 1;
    } else if (notthere) {
        displ = couldsee(mx, my) ? 2 : 1;
    } else {
        displ = 0;
    }
    if (!displ) {
        mtmp.mux = u.ux;
        mtmp.muy = u.uy;
        return;
    }

    // gotu = notseen ? !rn2(3) : notthere ? !rn2(4) : FALSE
    const gotu = notseen ? !rn2(3) : notthere ? !rn2(4) : false;

    if (!gotu) {
        let try_cnt = 0;
        for (;;) {
            if (++try_cnt > 200) {
                mx = u.ux;
                my = u.uy;
                break;
            }
            mx = u.ux - displ + rn2(2 * displ + 1);
            my = u.uy - displ + rn2(2 * displ + 1);
            if (!isok(mx, my)) continue;
            if (displ !== 2 && mx === mtmp.mx && my === mtmp.my) continue;
            if (
                (mx !== u.ux || my !== u.uy)
                && !passes_walls(mtmp.data)
                && !(
                    accessible(mx, my)
                    || (closed_door(mx, my) && (can_ooze(mtmp) || can_fog(mtmp)))
                )
            ) {
                continue;
            }
            if (!couldsee(mx, my)) continue;
            break;
        }
    } else {
        mx = u.ux;
        my = u.uy;
    }

    mtmp.mux = mx;
    mtmp.muy = my;
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

    // C: m_move starts with mtrapped → mintrap; still-caught → no move
    if (mtmp.mtrapped) {
        const i = await mintrap(mtmp, NO_TRAP_FLAGS);
        if (i === Trap_Killed_Mon) {
            if (mtmp.mx) newsym(mtmp.mx, mtmp.my);
            return MMOVE_DIED;
        }
        if (i === Trap_Caught_Mon) return MMOVE_NOTHING;
    }

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
    // Named omission: gettrack goal, shortsighted, m_search_items, balks.

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
    // C returns MMOVE_NOTHING here; DONE is close enough for fall-through.
    if (nix === game.u.ux && niy === game.u.uy) {
        return MMOVE_DONE;
    }

    // C: place_monster + mon_track_add then postmov (mintrap on new cell)
    mtmp.mx = nix;
    mtmp.my = niy;
    mon_track_add(mtmp, omx, omy);
    return postmov(mtmp, omx, omy, MMOVE_MOVED);
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

    let status = MMOVE_NOTHING;
    // PHASE THREE: move if not adjacent-hostile (attack path)
    if (want_move) {
        status = await m_move(mtmp, 0);
        if (status !== MMOVE_DIED) {
            ({ inrange, nearby, scared } = distfleeck(mtmp));
        }
        if (status === MMOVE_MOVED) {
            // C: monsters can move then shoot — fall through when !nearby
            // and AT_WEAP / ranged available (is_armed stand-in).
            if (nearby || !is_armed(mdat)) {
                return 0;
            }
            // else fall through to PHASE FOUR
        }
        // NOTHING/DONE/NOMOVES also fall through to attacks
    }

    // PHASE FOUR: attack hero if hostile + in range
    // C: ((inrange && !scared) || panicattk) && !noattacks — no nearby gate
    if (
        status !== MMOVE_DONE
        && !mtmp.mpeaceful
        && inrange
        && !scared
    ) {
        if (await mattacku(mtmp)) return 1;
    }
    return 0;
}

// C ref: monmove.c dochugw()
export async function dochugw(mtmp, chug) {
    if (chug) await dochug(mtmp);
    return 0;
}
