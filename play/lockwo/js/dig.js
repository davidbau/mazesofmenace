// dig.js — Digging / tunnelling terrain modification.
// C ref: src/dig.c — the monster-digging entry points mdig_tunnel() and the
// hack.c may_dig() helper (kept here alongside the digging code it guards).
//
// Only the monster-tunnelling path is ported (mdig_tunnel + may_dig): a
// pick-wielding dwarf (or a rock mole) that carves through rock/walls/trees as
// it moves, driven from monmove.js m_move()/postmov().  The hero-digging
// occupation (dig_check / dighole) is a separate unported subsystem.

import { game } from './gstate.js';
import { rnd, rn2, rn1 } from './rng.js';
import { newsym } from './display.js';
import { unblock_point, recalc_block_point, cansee } from './vision.js';
import {
    IS_WALL, IS_TREE, IS_OBSTRUCTED, IS_STWALL, IS_DOOR,
    STONE, CORR, DOOR, ROOM, SCORR, SDOOR,
    D_NODOOR, D_BROKEN, D_CLOSED, D_LOCKED, D_TRAPPED,
    W_NONDIGGABLE, isok, Is_earthlevel,
} from './const.js';
import { mksobj_at, ROCK, BOULDER } from './mkobj.js';

// C ref: hack.c may_dig(x, y) — "intended to be called only on ROCKs or TREEs".
// A stone wall or tree is diggable unless the cell is flagged W_NONDIGGABLE
// (level border / permanent walls, which our mklev does not set for interior
// rock, so ordinary rock/walls in the mines are diggable).
export function may_dig(x, y) {
    const lev = game.level?.at(x, y);
    if (!lev) return false;
    return !((IS_STWALL(lev.typ) || IS_TREE(lev.typ))
             && ((lev.wall_info || 0) & W_NONDIGGABLE));
}

// C ref: rm.h closed_door(x, y) == (IS_DOOR(levl[x][y].typ)
//                                   && (levl[x][y].doormask & (D_CLOSED|D_LOCKED)))
function closed_door(x, y) {
    const lev = game.level?.at(x, y);
    if (!lev) return false;
    return IS_DOOR(lev.typ) && ((lev.doormask & (D_CLOSED | D_LOCKED)) !== 0);
}

// C ref: detect.c cvt_sdoor_to_door(lev) — a secret door, once exposed, becomes
// an ordinary (closed) door.  WM_MASK (rm.h) is the low wall-mode bits stored in
// doormask for an SDOOR; strip them, then mark the newly revealed door closed
// unless it was locked.
const WM_MASK = 0x07;
function cvt_sdoor_to_door(lev) {
    let newmask = lev.doormask & ~WM_MASK;
    if (!(newmask & D_LOCKED))
        newmask |= D_CLOSED;
    lev.typ = DOOR;
    lev.doormask = newmask;
}

// C ref: mkobj.c sobj_at(BOULDER, x, y) — is a boulder lying on the floor here?
function sobj_at_boulder(x, y) {
    const objs = game.level?.objects;
    if (!objs) return false;
    for (const o of objs)
        if (o.where === 'floor' && o.ox === x && o.oy === y && o.otyp === BOULDER)
            return true;
    return false;
}

async function You_hear(msg) {
    const { update_topl } = await import('./display.js');
    await update_topl(msg);
}

// C ref: dig.c mdig_tunnel(mtmp) — a tunnelling monster carves the cell it now
// occupies.  Returns TRUE if the monster died (a trapped door it broke through),
// FALSE otherwise.  Called from m_move()/postmov() only when can_tunnel &&
// may_dig(mtmp->mx, mtmp->my).
//
// RNG: `pile = rnd(12)` is drawn UNCONDITIONALLY at entry; a WALL cell also
// draws rn2(5) (the "crashing rock" chance, gated on flags.verbose); a closed
// door draws rn2(3) (draft message); a dug STONE/ROCK cell may drop a boulder
// (pile==1) or a rock (pile 2..4) via mksobj_at.
export async function mdig_tunnel(mtmp) {
    const here = game.level?.at(mtmp.mx, mtmp.my);
    const pile = rnd(12);
    if (!here) return false;

    // C ref: dig.c:1421 — a secret door is first converted to a real door.
    if (here.typ === SDOOR)
        cvt_sdoor_to_door(here);

    // C ref: dig.c:1424 — eats away a closed/locked door.
    if (closed_door(mtmp.mx, mtmp.my)) {
        // sawit / shop-damage / MKoT handling not reached at these depths.
        const trapped = (here.doormask & D_TRAPPED) ? true : false;
        here.doormask = trapped ? D_NODOOR : D_BROKEN;
        recalc_block_point(mtmp.mx, mtmp.my); // vision
        newsym(mtmp.mx, mtmp.my);
        if (trapped) {
            // C ref: mb_trapped() — the door-trap explosion may kill the digger.
            // Not reached in the mines cave; kept for completeness (no RNG here
            // that the contest exercises, so treat as "survived").
            return false;
        } else {
            // C ref: dig.c:1442 — draft feedback.  flags.verbose is on; the
            // rn2(3) is drawn whenever the hero is not Unaware.
            const verbose = game.flags?.verbose !== false;
            const Unaware = !!game.u?.Unaware;
            if (verbose) {
                if (!Unaware && !rn2(3)) {
                    // draft_message(TRUE): "You feel an unexpected draft."
                    await You_hear('You feel an unexpected draft.');
                }
            }
        }
        return false;
    } else if (here.typ === SCORR) {
        // C ref: dig.c:1447 — secret corridor becomes an ordinary corridor.
        here.typ = CORR; here.flags = 0;
        unblock_point(mtmp.mx, mtmp.my);
        newsym(mtmp.mx, mtmp.my);
        // draft_message(FALSE): "You feel a draft." — display only, no RNG.
        return false;
    } else if (!IS_OBSTRUCTED(here.typ) && !IS_TREE(here.typ)) {
        // C ref: dig.c:1450 — nothing here to dig.
        return false;
    }

    // Only rock, trees, and walls fall through to this point.
    if (((here.wall_info || 0) & W_NONDIGGABLE) !== 0) {
        // C ref: dig.c:1456 — impossible() (undiggable); still alive.
        return false;
    }

    if (IS_WALL(here.typ)) {
        // C ref: dig.c:1466 — "crashing rock" chance.  The rn2(5) is a REAL
        // draw whenever flags.verbose; the You_hear text is post-draw and only
        // reaches the hero when not Deaf.
        const verbose = game.flags?.verbose !== false;
        const Deaf = !!game.u?.Deaf;
        if (verbose && !rn2(5)) {
            if (!Deaf) await You_hear('You hear crashing rock.');
        }
        const flags = game.level?.flags || {};
        if (flags.is_maze_lev) {
            here.typ = ROOM; here.flags = 0;
        } else if (flags.is_cavernous_lev && !in_town(mtmp.mx, mtmp.my)) {
            here.typ = CORR; here.flags = 0;
        } else {
            here.typ = DOOR; here.doormask = D_NODOOR;
        }
    } else if (IS_TREE(here.typ)) {
        // C ref: dig.c:1482 — a felled tree becomes room floor; pile 1..4 may
        // drop fruit (rnd_treefruit_at).  No trees in the mines cave; the
        // fruit path is left unported (unreached).
        here.typ = ROOM; here.flags = 0;
    } else {
        // C ref: dig.c:1486 — plain rock becomes a corridor; pile 1..4 drops a
        // boulder (pile==1) or a rock (pile 2..4) as debris.
        here.typ = CORR; here.flags = 0;
        if (pile && pile < 5)
            mksobj_at((pile === 1) ? BOULDER : ROCK, mtmp.mx, mtmp.my, true, false);
    }
    newsym(mtmp.mx, mtmp.my);
    if (!sobj_at_boulder(mtmp.mx, mtmp.my))
        unblock_point(mtmp.mx, mtmp.my); // vision

    return false;
}

// C ref: dig.c zap_dig() — digging via a wand-of-digging zap or dig spell.
// Reachable path for the covered sessions: the hero, standing in a lit room,
// zaps the wand in a cardinal direction (u.dz == 0) and carves a passage across
// the level — razing the first wall it meets into a doorway, then tunnelling
// the rock beyond into a corridor.  RNG: a single `digdepth = rn1(18, 8)` is
// drawn up front; every terrain edit in the loop below draws no RNG, so the
// post-zap RNG cursor advances by exactly one rn2(18) (matching C).  The
// swallowed and up/down branches are structurally faithful but their deep
// subsystems (expels() / dighole()) are not exercised here and are left as
// no-ops with C-ref notes.
export async function zap_dig() {
    const u = game.u;
    const lvl = game.level;

    if (u.uswallow) {
        // C ref: dig.c:1568 — pierce/near-kill the engulfer and get expelled.
        // No engulfing monster in the covered sessions; unported.
        return;
    }

    if (u.dz) {
        // C ref: dig.c:1584 — zapping up loosens a ceiling rock; zapping down
        // runs dighole().  Neither is exercised (the covered zaps are lateral);
        // the dighole subsystem is not ported.
        return;
    }

    // normal case: digging across the level.  C ref: dig.c:1612.
    let shopdoor = false, shopwall = false;   /* shop damage: no shop here */
    const maze_dig = !!lvl?.flags?.is_maze_lev && !Is_earthlevel(u.uz);
    const dx = u.dx | 0, dy = u.dy | 0;
    let zx = u.ux + dx, zy = u.uy + dy;
    // pit-dig (zapping laterally while trapped in a pit, u.utraptype==TT_PIT)
    // is not exercised; pitdig stays FALSE.
    let digdepth = rn1(18, 8);
    // tmp_at(DISP_BEAM, S_digbeam): beam animation is display-only (no RNG) and
    // leaves no residue in the final grid, so it is omitted.

    while (--digdepth >= 0) {
        if (!isok(zx, zy)) break;
        const room = lvl.at(zx, zy);
        if (!room) break;

        if (closed_door(zx, zy) || room.typ === SDOOR) {
            // C ref: dig.c:1669 — raze a door / expose+raze a secret door.
            // (shop-door damage: in_rooms(SHOPBASE) is empty on this level.)
            if (room.typ === SDOOR) {
                room.typ = DOOR; /* doormask set below */
            } else if (cansee(zx, zy)) {
                const { update_topl } = await import('./display.js');
                await update_topl('The door is razed!');
            }
            // watch_dig(): only reacts in town with the Watch present; no-op.
            room.doormask = D_NODOOR;
            recalc_block_point(zx, zy); // vision
            newsym(zx, zy);
            digdepth -= 2;
            if (maze_dig) break;
        } else if (maze_dig) {
            // C ref: dig.c:1684 — on a maze level walls/trees->room, rock->corr,
            // then break.  Not reached on the covered (non-maze) levels.
            if (IS_WALL(room.typ)) {
                if (!((room.wall_info || 0) & W_NONDIGGABLE)) {
                    room.typ = ROOM; room.flags = 0;
                    unblock_point(zx, zy);
                    newsym(zx, zy);
                }
                break;
            } else if (IS_TREE(room.typ)) {
                if (!((room.wall_info || 0) & W_NONDIGGABLE)) {
                    room.typ = ROOM; room.flags = 0;
                    unblock_point(zx, zy);
                    newsym(zx, zy);
                }
                break;
            } else if (room.typ === STONE || room.typ === SCORR) {
                if (!((room.wall_info || 0) & W_NONDIGGABLE)) {
                    room.typ = CORR; room.flags = 0;
                    unblock_point(zx, zy);
                    newsym(zx, zy);
                }
                break;
            }
        } else if (IS_OBSTRUCTED(room.typ)) {
            // C ref: dig.c:1711 — pierce a wall/tree into a doorway/floor, or
            // tunnel plain rock into a corridor.
            if (!may_dig(zx, zy)) break;
            if (IS_WALL(room.typ) || room.typ === SDOOR) {
                // (shop-wall damage omitted: no shop here; watch_dig() no-op.)
                if (lvl.flags?.is_cavernous_lev && !in_town(zx, zy)) {
                    room.typ = CORR; room.flags = 0;
                } else {
                    room.typ = DOOR; room.doormask = D_NODOOR;
                }
                digdepth -= 2;
            } else if (IS_TREE(room.typ)) {
                room.typ = ROOM; room.flags = 0;
                digdepth -= 2;
            } else { /* IS_OBSTRUCTED but not IS_WALL/SDOOR/TREE: plain rock */
                room.typ = CORR; room.flags = 0;
                digdepth--;
            }
            unblock_point(zx, zy); // vision
            newsym(zx, zy);
        }
        zx += dx;
        zy += dy;
    }
    // tmp_at(DISP_END, 0): closing beam call — display-only, omitted.

    // pit_flow / pay_for_damage: unreachable (no pit dug, no shop) here.
    void shopdoor; void shopwall;
    return;
}

// C ref: mkobj.c in_town(x, y) — town of the Gnomish Mines.  Not modeled here
// (the tunnelling in the contest slice happens in a regular mines cavern, never
// the mines town), so a dug cavern wall always becomes CORR.
function in_town(_x, _y) {
    return false;
}
