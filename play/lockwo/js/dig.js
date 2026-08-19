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
import { A_STR, A_INT, A_WIS, A_DEX, A_CON, A_CHA, HEAD } from './const.js';
import { unblock_point, recalc_block_point, cansee } from './vision.js';
import {
    IS_WALL, IS_TREE, IS_OBSTRUCTED, IS_STWALL, IS_DOOR,
    STONE, CORR, DOOR, ROOM, SCORR, SDOOR,
    D_NODOOR, D_BROKEN, D_CLOSED, D_LOCKED, D_TRAPPED,
    W_NONDIGGABLE, isok, Is_earthlevel,
} from './const.js';
import { mksobj_at, ROCK, BOULDER, STATUE, objects as OBJECTS_TBL } from './mkobj.js';
import {
    DIGTYP_UNDIGGABLE, DIGTYP_ROCK, DIGTYP_STATUE, DIGTYP_BOULDER,
    DIGTYP_DOOR, DIGTYP_TREE, N_DIRS, N_DIRS_Z, TT_WEB,
} from './const.js';
import { is_pick, is_axe } from './weapon.js';
import { Is_special } from './dungeon.js';
import { inside_room } from './mkroom.js';

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

// C ref: hack.h Hallucination — the timer lives under three different names in
// this port depending on which file wrote it (see cmd.js Hallucination()).
function Hallucination() {
    const u = game.u;
    if (!u) return false;
    if ((u.HHalluc_resistance || 0) > 0) return false;
    return !!(u.uhallu || u.HHallucination || u.uprops?.Hallucination);
}

const sgn = (n) => (n > 0 ? 1 : n < 0 ? -1 : 0);

// C ref: dig.c draft_message(unexpected).  NOT display-only: the hallucinating
// draft_message(FALSE) arm draws rn1(2, ...) and (below STRIDENT alignment
// record) a second rn1(3, ...), and BOTH arms emit a topline the port used to
// swallow entirely on the secret-corridor path.
const STRIDENT = 4;   /* dig.c:1497, from pray.c */
const DRAFT_REACTION = ['enlisting', 'marching', 'protesting', 'fleeing'];
async function draft_message(unexpected) {
    const u = game.u || {};
    if (unexpected) {
        if (!Hallucination()) {
            await You_hear('You feel an unexpected draft.');
        } else {
            const { acurr_eff } = await import('./attrib.js');
            const weak = (acurr_eff(A_STR) < 6 || acurr_eff(A_DEX) < 6
                          || acurr_eff(A_CON) < 6 || acurr_eff(A_CHA) < 6
                          || acurr_eff(A_INT) < 6 || acurr_eff(A_WIS) < 6);
            await You_hear(`You feel like you are ${weak ? '4-F' : '1-A'}.`);
        }
    } else {
        if (!Hallucination()) {
            await You_hear('You feel a draft.');
        } else {
            const atyp = u.ualign?.type ?? 0;
            let dridx = rn1(2, 1 - sgn(atyp));
            if ((u.ualign?.record ?? 0) < STRIDENT)
                dridx += rn1(3, sgn(atyp) - 1);
            await You_hear(`You feel like ${DRAFT_REACTION[dridx]}.`);
        }
    }
}

// C ref: mkobj.c treefruits[] + rnd_treefruit_at() = mksobj_at(ROLL_FROM(...)),
// i.e. an rn2(5) that mdig_tunnel/zap-dig draw whenever a felled tree drops
// fruit.  Skipping it left the stream one rn2(5) short on every arboreal level.
const TREEFRUITS = [277 /*APPLE*/, 278 /*ORANGE*/, 279 /*PEAR*/,
                    281 /*BANANA*/, 276 /*EUCALYPTUS_LEAF*/];
function rnd_treefruit_at(x, y) {
    return mksobj_at(TREEFRUITS[rn2(TREEFRUITS.length)], x, y, true, false);
}

// C ref: stairs.c stairway_at(x, y) — the stairway record on this square, or
// null.  On_stairs(x,y) is `stairway_at(x,y) != 0`.  The stair list is a
// singly-linked chain hanging off `game.stairs` (cf. hack.js).
function stairway_at(x, y) {
    for (let s = game.stairs; s; s = s.next)
        if (s.sx === x && s.sy === y) return s;
    return null;
}

// C ref: trap.c ceiling(x, y).  Same reduction as trap.js ceiling(): no
// air/water/quest/earth level is generated here.
function ceiling(x, y) {
    const typ = game.level?.at(x, y)?.typ ?? STONE;
    if (typ === ROOM || IS_WALL(typ) || IS_DOOR(typ) || typ === SDOOR)
        return 'ceiling';
    return 'rock cavern';
}

// C ref: do_wear.c hard_helmet(obj) = is_helmet(obj)
//        && (is_metallic(obj) || is_crackable(obj)).
// Driven by oc_material (IRON..MITHRIL, or GLASS for a crackable helm), NOT by
// a name regex — a helm whose name doesn't contain "helm" (dented pot) is hard
// and an "elven leather helm" is not.  Only ever called on the worn head slot,
// so C's is_helmet() guard is implied by the caller.
const MAT_IRON = 11, MAT_MITHRIL = 17, MAT_GLASS = 19;
function hard_helmet(otmp) {
    const mat = OBJECTS_TBL[otmp?.otyp]?.material;
    if (mat === undefined) return false;
    return (mat >= MAT_IRON && mat <= MAT_MITHRIL) || mat === MAT_GLASS;
}

// C ref: hack.c losehp(dmg, ...) — HP subtraction only; the death path
// (done(DIED)) lives in the callers this port does model.
function losehp(dmg) {
    const u = game.u;
    if (!u || dmg <= 0) return;
    u.uhp = (u.uhp ?? 0) - dmg;
    if (u.uhp < 0) u.uhp = 0;
    if (game.disp) game.disp.botl = true;
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
                if (!Unaware && !rn2(3))
                    await draft_message(true);
            }
        }
        return false;
    } else if (here.typ === SCORR) {
        // C ref: dig.c:1447 — secret corridor becomes an ordinary corridor.
        here.typ = CORR; here.flags = 0;
        unblock_point(mtmp.mx, mtmp.my);
        newsym(mtmp.mx, mtmp.my);
        await draft_message(false);
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
        // C ref: dig.c:1482 — a felled tree becomes room floor; pile 1..4 drops
        // fruit (rnd_treefruit_at -> rn2(5) + mksobj_at).
        here.typ = ROOM; here.flags = 0;
        if (pile && pile < 5)
            rnd_treefruit_at(mtmp.mx, mtmp.my);
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
        // C ref: dig.c:1584.  Is_airlevel/Is_waterlevel/Underwater are all
        // false for every level this port generates.
        const sway = stairway_at(u.ux, u.uy);
        if (u.dz < 0 || sway) {
            const { update_topl } = await import('./display.js');
            const _invent = await import('./invent.js');
            if (sway) {
                await update_topl(`The beam bounces off the ${
                    sway.isladder ? 'ladder' : 'stairs'} and hits the ${
                    ceiling(u.ux, u.uy)}.`);
            }
            await update_topl(`You loosen a rock from the ${ceiling(u.ux, u.uy)}.`);
            await update_topl(`It falls on your ${_invent.body_part(HEAD)}!`);
            // C: dmg = rnd(hard_helmet(uarmh) ? 2 : 6) — a REAL draw whether or
            // not the rock lands on a helmet.  Maybe_Half_Phys() is the identity
            // for a hero without Half_physical_damage (none of these have it).
            const dmg = rnd(hard_helmet(game.uarmh) ? 2 : 6);
            losehp(dmg);
            const otmp = mksobj_at(ROCK, u.ux, u.uy, false, false);
            if (otmp) {
                _invent.xname(otmp);       /* sets dknown / maybe bknown */
                _invent.stackobj(otmp);
            }
            newsym(u.ux, u.uy);
        }
        // NOT PORTED: the else arm, watch_dig() + dighole(FALSE, TRUE, 0) —
        // digging a pit/hole straight down.  dighole/digactualhole (and the
        // level change that follows a hole) are a separate unported subsystem,
        // so a downward zap off the stairs still consumes no RNG here.
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

// C ref: hack.c:3564 in_town(x, y) — a room WITH subrooms is Mine Town; with no
// subroomed rooms at all the whole level counts.  Was a `return false` stub, so
// a tunnelling dwarf inside Mine Town carved CORR where C leaves a doorless
// DOOR (mdig_tunnel's is_cavernous_lev arm, and the same arm of zap_dig).
// Duplicated from makemon.js in_town_js()/fountain.js in_town() rather than
// imported: those two are file-private, and the S_LEVEL `town` flag stands in
// for svl.level.flags.has_town, which nothing in this port writes.
export function in_town(x, y) {
    const lvl = game.level;
    const slev = Is_special(game.u?.uz);
    if (!slev || !slev.flags?.town) return false;
    let has_subrooms = false;
    for (let i = 0; i < (lvl?.nroom ?? 0); i++) {
        const sroom = lvl.rooms[i];
        if (!sroom || (sroom.hx ?? 0) <= 0) break;
        if ((sroom.nsubrooms ?? 0) > 0) {
            has_subrooms = true;
            if (inside_room(sroom, x, y)) return true;
        }
    }
    return !has_subrooms;
}

// C ref: dig.c dig_typ(otmp, x, y) — what a pick/axe would be working on at
// <x,y>.  Only a pick digs rock/boulders/statues; only an axe fells a tree;
// both chop a closed door.  Anything else is DIGTYP_UNDIGGABLE, which is what
// keeps ordinary floor out of use_pick_axe()'s direction list.
export function dig_typ(otmp, x, y) {
    if (!isok(x, y) || !otmp || (!is_pick(otmp) && !is_axe(otmp)))
        return DIGTYP_UNDIGGABLE;
    const ltyp = game.level?.at(x, y)?.typ;
    if (is_axe(otmp))
        return closed_door(x, y) ? DIGTYP_DOOR
             : IS_TREE(ltyp) ? DIGTYP_TREE
             : DIGTYP_UNDIGGABLE;
    // is_pick(otmp)
    if (sobj_at_typ(STATUE, x, y) && pick_can_reach(otmp, x, y))
        return DIGTYP_STATUE;
    if (sobj_at_boulder(x, y) && pick_can_reach(otmp, x, y))
        return DIGTYP_BOULDER;
    if (closed_door(x, y)) return DIGTYP_DOOR;
    if (IS_TREE(ltyp)) return DIGTYP_UNDIGGABLE;   // pick vs tree
    if (IS_OBSTRUCTED(ltyp) && (!game.level?.flags?.arboreal || IS_WALL(ltyp)))
        return DIGTYP_ROCK;
    return DIGTYP_UNDIGGABLE;
}

// C ref: dig.c pick_can_reach(otmp, x, y) — a pick reaches a boulder/statue
// only from a square the hero can actually swing from; the airborne and
// engulfed cases are the whole of the guard the hero ever meets here.
function pick_can_reach(_otmp, _x, _y) {
    const u = game.u;
    return !(u?.uswallow) && !(u?.uprops?.Levitation);
}

function sobj_at_typ(otyp, x, y) {
    for (let o = game.level?.at(x, y)?.objects; o; o = o.nexthere)
        if (o.otyp === otyp) return o;
    return null;
}

// C ref: dig.c use_pick_axe(obj) — applying a pick-axe/mattock or an axe.
// An unwielded tool is wielded first and the command re-queues itself
// (cmdq_add_ec(doapply) + the invlet), so the direction prompt only appears on
// the second pass, one turn later.  The prompt's bracketed key list is built
// from the directions that actually have something to work on, which is why an
// axe swung in an ordinary room offers only "[>]".
export async function use_pick_axe(obj) {
    const u = game.u;
    const { wield_tool } = await import('./invent.js');
    const { pline } = await import('./display.js');

    // Check tool
    if (obj !== game.uwep) {
        if (await wield_tool(obj, 'swing')) return USE_PICK_AXE_REWIELDED;
        return 0;                        // ECMD_OK
    }
    const ispick = is_pick(obj);
    const verb = ispick ? 'dig' : 'chop';

    if (u.utrap && u.utraptype === TT_WEB) {
        // res is always 0 here: the wielded-already path prints nothing first.
        await pline(`Unfortunately, you can't ${verb} while entangled in a web.`);
        return 0;
    }

    // C ref: dig.c:1122 — "construct list of directions to show player for
    // likely choices".  dir 0..7 are the plane moves in sdir[] order, 8 is
    // down and 9 is up; a plane direction survives only if something there is
    // diggable, and the up/down pair is filtered by can_reach_floor().
    const { can_reach_floor } = await import('./engrave.js');
    const { Cmd_dirchars } = await import('./cmd.js');
    const dirchars = Cmd_dirchars();
    const downok = !!can_reach_floor(false);
    let dirsyms = '';
    for (let dir = 0; dir < N_DIRS_Z; dir++) {
        const dirch = dirchars[dir];
        if (u.uswallow) {
            /* all directions are viable when swallowed */
        } else if (dir < N_DIRS) {
            const [dx, dy] = DIG_DIR_XY[dir];
            // C: dxdy_moveok() — only a grid bug is barred from diagonals.
            if (dx && dy && NODIAG(u.umonnum)) continue;
            const rx = u.ux + dx, ry = u.uy + dy;
            if (!isok(rx, ry) || dig_typ(obj, rx, ry) === DIGTYP_UNDIGGABLE)
                continue;
        } else {
            // C: `if ((u.dz > 0) ^ downok) continue;` — dir 8 is '>' (dz > 0).
            if ((dir === 8) !== downok) continue;
        }
        dirsyms += dirch;
    }

    const { getdir } = await import('./cmd.js');
    if (!(await getdir(`In what direction do you want to ${verb}? [${dirsyms}]`)))
        return 1;                        // ECMD_CANCEL
    // use_pick_axe2() — the dig itself (dig_check/dighole and the multi-turn
    // digging occupation) is a separate unported subsystem; reaching it means
    // the hero answered the direction prompt, which no covered session does.
    return USE_PICK_AXE_DIG;
}

// Direction deltas in sdir[] order (h y k u l n j b), matching cmd.js DIR_XYZ.
const DIG_DIR_XY = [
    [-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1],
];
// C ref: mondata.h NODIAG(mnum) == (mnum == PM_GRID_BUG).
const PM_GRID_BUG = 116;
function NODIAG(mnum) { return mnum === PM_GRID_BUG; }

// Sentinels for apply.js: the tool had to be wielded (C re-queues doapply), or
// the direction prompt was answered and the dig occupation would start.
export const USE_PICK_AXE_REWIELDED = -1;
export const USE_PICK_AXE_DIG = -2;
