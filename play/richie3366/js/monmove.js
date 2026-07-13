// monmove.js — Monster AI movement (minimal RNG-faithful stubs).
// C ref: monmove.c — distfleeck, dochug, m_move, postmov, set_apparxy, mon_track_add.

import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';
import { dog_move, finish_meating } from './dogmove.js';
import { newsym, pline } from './display.js';
import {
    dist2,
    monnear,
    mon_allowflags,
    mfndpos,
} from './mon.js';
import {
    is_wanderer, is_armed, passes_walls, nohands, verysmall,
    monsterNames, M1_SEE_INVIS, M1_AMORPHOUS,
} from './monsters.js';
import {
    mintrap,
    NO_TRAP_FLAGS,
    Trap_Killed_Mon,
    Trap_Moved_Mon,
    Trap_Caught_Mon,
} from './trap.js';
import { mattacku } from './mhitu.js';
import { cansee, couldsee, vision_recalc, recalc_block_point } from './vision.js';
import {
    isok, ACCESSIBLE, IS_DOOR, D_CLOSED, D_LOCKED, D_ISOPEN, D_NODOOR,
    D_BROKEN, D_TRAPPED, u_at, DISPLACED,
} from './const.js';
import {
    CLOAK_OF_DISPLACEMENT, COIN_CLASS, objectNames,
} from './objects.js';
import { Monnam } from './do_name.js';

const CREDIT_CARD = objectNames.indexOf('CREDIT_CARD');
const SKELETON_KEY = objectNames.indexOf('SKELETON_KEY');
const LOCK_PICK = objectNames.indexOf('LOCK_PICK');
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

/**
 * C ref: monmove.c monhaskey — locking/unlocking tool in minvent.
 */
function monhaskey(mon, for_unlocking) {
    for (let otmp = mon?.minvent; otmp; otmp = otmp.nobj) {
        if (for_unlocking && otmp.otyp === CREDIT_CARD) return true;
        if (otmp.otyp === SKELETON_KEY || otmp.otyp === LOCK_PICK) return true;
    }
    return false;
}

/**
 * C ref: monmove.c mb_trapped — door trap explosion after open/smash.
 * Named omission: wake_nearto; mon_learns_traps(TRAPPED_DOOR); full
 * mondead/lifesave (HP≤0 clears mx and returns died).
 */
async function mb_trapped(mtmp, canseeit) {
    if (game.flags?.verbose !== false) {
        if (canseeit && !game.u?.Unaware) {
            await pline('KABOOM!!  You see a door explode.');
        } else if (!game.u?.Deaf) {
            const far = dist2(mtmp.mx, mtmp.my, game.u.ux, game.u.uy) > 7 * 7;
            await pline(`You hear a ${far ? 'distant' : 'nearby'} explosion.`);
        }
    }
    mtmp.mstun = 1;
    mtmp.mhp -= rnd(15);
    if ((mtmp.mhp | 0) < 1) {
        mtmp.mhp = 0;
        mtmp.mx = 0;
        mtmp.my = 0;
        return true;
    }
    return false;
}

/**
 * C: UnblockDoor macro — set doormask, newsym, recalc vision, refresh cansee.
 */
function unblock_door(here, mtmp, what, didseeit) {
    here.doormask = what;
    if (here.flags !== undefined) here.flags = what;
    newsym(mtmp.mx, mtmp.my);
    recalc_block_point(mtmp.mx, mtmp.my);
    vision_recalc(0);
    return didseeit || cansee(mtmp.mx, mtmp.my);
}

/**
 * C ref: display.h canseemon / canspotmon stubs for door feedback.
 * infrared/invis/worm deferred — lit cansee + !minvis stand-in.
 */
function canseemon(mtmp) {
    if (!mtmp?.mx) return false;
    if (!cansee(mtmp.mx, mtmp.my)) return false;
    return !mtmp.minvis;
}

function canspotmon(mtmp) {
    return canseemon(mtmp);
}

/**
 * C ref: monmove.c postmov — after a successful step: traps then doors.
 * Branch envelope: D_CLOSED open / D_LOCKED unlock / smash doorbuster;
 * amorphous squeeze message; mb_trapped. Named omissions: vampshift fog
 * sequencing; iron bars; mdig_tunnel; engulfing_u; shop add_damage;
 * has_magic_key disarm; full mondied from trap death.
 */
async function postmov(mtmp, omx, omy, mmoved, can_tunnel, can_unlock, can_open) {
    if (mmoved !== MMOVE_MOVED) return mmoved;

    // notice_mon deferred
    let canseeit = cansee(mtmp.mx, mtmp.my);
    const didseeit = canseeit;
    const ptr = mtmp.data;

    newsym(omx, omy); // update the old position
    const trapret = await mintrap(mtmp, NO_TRAP_FLAGS);
    if (trapret === Trap_Killed_Mon || trapret === Trap_Moved_Mon) {
        if (mtmp.mx) newsym(mtmp.mx, mtmp.my);
        return MMOVE_DIED;
    }

    // open a door, or crash through it, if mtmp can
    const loc = game.level?.at(mtmp.mx, mtmp.my);
    if (loc && IS_DOOR(loc.typ)
        && !passes_walls(ptr)
        && !can_tunnel) {
        const here = loc;
        let btrapped = !!(here.doormask & D_TRAPPED);
        // has_magic_key disarm deferred
        const verbose = game.flags?.verbose !== false;
        const dm = here.doormask || 0;

        if ((dm & (D_LOCKED | D_CLOSED)) !== 0
            && ((ptr?.mflags1 ?? 0) & M1_AMORPHOUS)) {
            if (verbose && canseemon(mtmp)) {
                const flows = (ptr?.mlet === 'S_LIGHT');
                await pline(
                    `${Monnam(mtmp)} ${flows ? 'flows' : 'oozes'} under the door.`,
                );
            }
        } else if ((dm & D_LOCKED) !== 0 && can_unlock) {
            canseeit = unblock_door(
                here, mtmp, !btrapped ? D_ISOPEN : D_NODOOR, didseeit,
            );
            if (btrapped) {
                if (await mb_trapped(mtmp, canseeit)) return MMOVE_DIED;
            } else if (verbose) {
                if (canseeit && canspotmon(mtmp)) {
                    await pline(`${Monnam(mtmp)} unlocks and opens a door.`);
                } else if (canseeit) {
                    await pline('You see a door unlock and open.');
                } else if (!game.u?.Deaf) {
                    await pline('You hear a door unlock and open.');
                }
            }
        } else if (dm === D_CLOSED && can_open) {
            canseeit = unblock_door(
                here, mtmp, !btrapped ? D_ISOPEN : D_NODOOR, didseeit,
            );
            if (btrapped) {
                if (await mb_trapped(mtmp, canseeit)) return MMOVE_DIED;
            } else if (verbose) {
                if (canseeit && canspotmon(mtmp)) {
                    await pline(`${Monnam(mtmp)} opens a door.`);
                } else if (canseeit) {
                    await pline('You see a door open.');
                } else if (!game.u?.Deaf) {
                    await pline('You hear a door open.');
                }
            }
        } else if ((dm & (D_LOCKED | D_CLOSED)) !== 0) {
            // mfndpos guarantees doorbuster
            const mask = (btrapped
                || ((dm & D_LOCKED) !== 0 && !rn2(2)))
                ? D_NODOOR
                : D_BROKEN;
            canseeit = unblock_door(here, mtmp, mask, didseeit);
            if (btrapped) {
                if (await mb_trapped(mtmp, canseeit)) return MMOVE_DIED;
            } else if (verbose) {
                if (canseeit && canspotmon(mtmp)) {
                    await pline(`${Monnam(mtmp)} smashes down a door.`);
                } else if (canseeit) {
                    await pline('You see a door crash open.');
                } else if (!game.u?.Deaf) {
                    await pline('You hear a door crash open.');
                }
            }
            // shop add_damage deferred
        }
    }
    // IRONBARS / mdig_tunnel / engulfing_u deferred

    if (mtmp.mx) newsym(mtmp.mx, mtmp.my);
    return mmoved;
}

// C ref: monmove.c m_move() — pets → postmov(dog_move); else approach / track path
export async function m_move(mtmp, after) {
    const ptr = mtmp.data;
    // C: can_tunnel = tunnels(ptr) off Rogue level — deferred (always false)
    const can_tunnel = false;
    const can_open = !(nohands(ptr) || verysmall(ptr));
    // C: can_unlock = (can_open && monhaskey) || iswiz || is_rider
    const can_unlock = (can_open && monhaskey(mtmp, true))
        || !!mtmp.iswiz;
    // is_rider deferred
    const omx = mtmp.mx;
    const omy = mtmp.my;

    // C: mtrapped → mintrap before meating / dog_move (pets included)
    if (mtmp.mtrapped) {
        const i = await mintrap(mtmp, NO_TRAP_FLAGS);
        if (i === Trap_Killed_Mon) {
            if (mtmp.mx) newsym(mtmp.mx, mtmp.my);
            return MMOVE_DIED;
        }
        if (i === Trap_Caught_Mon) return MMOVE_NOTHING;
    }

    // C: meating countdown — still eating skips dog_move / approach
    if (mtmp.meating) {
        mtmp.meating--;
        if ((mtmp.meating | 0) <= 0) finish_meating(mtmp);
        return MMOVE_DONE;
    }

    // C: if (mtmp->mtame) return postmov(..., dog_move(...), ...)
    if (mtmp.mtame) {
        const mmoved = await dog_move(mtmp, after);
        return postmov(mtmp, omx, omy, mmoved, can_tunnel, can_unlock, can_open);
    }

    // C: m_move starts with mtrapped → mintrap; still-caught → no move
    // (already handled above for all monsters)

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
    return postmov(mtmp, omx, omy, MMOVE_MOVED, can_tunnel, can_unlock, can_open);
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
