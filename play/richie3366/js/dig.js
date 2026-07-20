// dig.js — Monster tunneling / terrain dig / wand dig.
// C ref: dig.c mdig_tunnel / zap_dig / draft_message; hack.c may_dig.

import { game } from './gstate.js';
import { rn1, rn2, rnd } from './rng.js';
import {
    newsym, pline, You_feel, tmp_at, nh_delay_output,
} from './display.js';
import { cansee, recalc_block_point } from './vision.js';
import { cvt_sdoor_to_door } from './detect.js';
import { mksobj_at, objects_at } from './mkobj.js';
import { in_rooms } from './hack.js';
import { objectNames } from './generated/objects_data.js';
import { CLR_WHITE } from './terminal.js';
import {
    IS_STWALL, IS_TREE, IS_WALL, IS_OBSTRUCTED, IS_DOOR,
    W_NONDIGGABLE, SDOOR, SCORR, CORR, ROOM, DOOR, TREE, STONE,
    D_NODOOR, D_BROKEN, D_TRAPPED, D_CLOSED, D_LOCKED,
    SHOPBASE, TT_PIT, isok, Is_earthlevel,
    DISP_BEAM, DISP_END,
} from './const.js';

const BOULDER = objectNames.indexOf('BOULDER');
const ROCK = objectNames.indexOf('ROCK');
const TREEFRUITS = [
    objectNames.indexOf('APPLE'),
    objectNames.indexOf('ORANGE'),
    objectNames.indexOf('PEAR'),
    objectNames.indexOf('BANANA'),
    objectNames.indexOf('EUCALYPTUS_LEAF'),
].filter((i) => i >= 0);

function dist2(x0, y0, x1, y1) {
    const dx = x0 - x1;
    const dy = y0 - y1;
    return dx * dx + dy * dy;
}

/**
 * C: `#define wall_info flags` — one field. JS sometimes writes W_* bits to
 * `flags` while WM_MASK orientation lives on `wall_info` (D-0865). OR both
 * for dig/passwall checks so nondiggable maze walls are honored.
 */
function rm_wall_info(lev) {
    return ((lev.wall_info | 0) | (lev.flags | 0));
}

/** C ref: hack.c may_dig — diggable unless STWALL/TREE + W_NONDIGGABLE. */
export function may_dig(x, y) {
    const lev = game.level?.at(x, y);
    if (!lev) return false;
    const typ = lev.typ;
    return !((IS_STWALL(typ) || IS_TREE(typ))
        && (rm_wall_info(lev) & W_NONDIGGABLE));
}

function closed_door(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc || !IS_DOOR(loc.typ)) return false;
    return !!((loc.doormask || 0) & (D_CLOSED | D_LOCKED));
}

function sobj_at(otyp, x, y) {
    for (let o = objects_at(x, y); o; o = o.nexthere) {
        if (o.otyp === otyp) return o;
    }
    return null;
}

function canseemon(mtmp) {
    if (!mtmp?.mx) return false;
    if (!cansee(mtmp.mx, mtmp.my)) return false;
    return !mtmp.minvis;
}

function Unaware() {
    return ((game.u?.multi | 0) < 0) && !!game.u?.usleep;
}

function Blind() {
    return !!(game.u?.Blind || game.u?.ublind);
}

/** C: cmap_to_glyph(S_digbeam) — defsym '*' CLR_WHITE. */
function digbeam_glyph() {
    return { ch: '*', color: CLR_WHITE, dec: false };
}

/** C ref: dig.c draft_message — Hallucination branches deferred. */
async function draft_message(unexpected) {
    if (game.u?.Hallucination) return;
    if (unexpected) await You_feel('an unexpected draft.');
    else await You_feel('a draft.');
}

/**
 * C ref: mkobj.c rnd_treefruit_at — ROLL_FROM(treefruits) mksobj_at.
 */
function rnd_treefruit_at(x, y) {
    if (!TREEFRUITS.length) return null;
    return mksobj_at(TREEFRUITS[rn2(TREEFRUITS.length)], x, y, true, false);
}

/**
 * C ref: monmove.c mb_trapped subset — door trap after digger eats door.
 * wake_nearto / mon_learns_traps / full mondead deferred.
 */
async function mb_trapped(mtmp, canseeit) {
    if (game.flags?.verbose !== false) {
        if (canseeit && !Unaware()) {
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
 * C ref: dig.c mdig_tunnel — return true if monster died.
 * Branch envelope: SDOOR convert; closed-door eat (+trap); SCORR open;
 * open-floor early return (still burns pile=rnd(12)); WALL/TREE/STONE dig;
 * maze→ROOM / cavernous→CORR / else DOOR; pile&lt;5 boulder/rock or fruit.
 * Named omissions: shop add_damage; Hallucination draft; in_town cavernous
 * gate; Soundeffect; full mondead on trap death.
 */
export async function mdig_tunnel(mtmp) {
    const pile = rnd(12);
    const here = game.level?.at(mtmp.mx, mtmp.my);
    if (!here) return false;

    if (here.typ === SDOOR) cvt_sdoor_to_door(here);

    if (closed_door(mtmp.mx, mtmp.my)) {
        // shop add_damage deferred
        const sawit = canseemon(mtmp);
        const trapped = !!((here.doormask || 0) & D_TRAPPED);
        here.doormask = trapped ? D_NODOOR : D_BROKEN;
        if (here.flags !== undefined) here.flags = here.doormask;
        recalc_block_point(mtmp.mx, mtmp.my);
        newsym(mtmp.mx, mtmp.my);
        if (trapped) {
            const seeit = canseemon(mtmp);
            if (await mb_trapped(mtmp, sawit || seeit)) {
                if (mtmp.mx) newsym(mtmp.mx, mtmp.my);
                return true;
            }
        } else if (game.flags?.verbose !== false) {
            if (!Unaware() && !rn2(3)) await draft_message(true);
        }
        return false;
    }

    if (here.typ === SCORR) {
        here.typ = CORR;
        here.flags = 0;
        recalc_block_point(mtmp.mx, mtmp.my);
        newsym(mtmp.mx, mtmp.my);
        await draft_message(false);
        return false;
    }

    if (!IS_OBSTRUCTED(here.typ) && !IS_TREE(here.typ)) {
        return false;
    }

    if ((rm_wall_info(here) & W_NONDIGGABLE) !== 0) {
        return false;
    }

    const lf = game.level?.flags || {};
    if (IS_WALL(here.typ)) {
        if (game.flags?.verbose !== false && !rn2(5)) {
            if (!game.u?.Deaf) await pline('You hear crashing rock.');
        }
        // shop add_damage deferred
        if (lf.is_maze_lev) {
            here.typ = ROOM;
            here.flags = 0;
        } else if (lf.is_cavernous_lev /* in_town deferred */) {
            here.typ = CORR;
            here.flags = 0;
        } else {
            here.typ = DOOR;
            here.doormask = D_NODOOR;
            if (here.flags !== undefined) here.flags = D_NODOOR;
        }
    } else if (IS_TREE(here.typ) || here.typ === TREE) {
        here.typ = ROOM;
        here.flags = 0;
        if (pile && pile < 5) rnd_treefruit_at(mtmp.mx, mtmp.my);
    } else {
        // stone / other obstructed
        here.typ = CORR;
        here.flags = 0;
        if (pile && pile < 5) {
            mksobj_at(
                (pile === 1) ? BOULDER : ROCK,
                mtmp.mx, mtmp.my, true, false,
            );
        }
    }
    newsym(mtmp.mx, mtmp.my);
    if (!sobj_at(BOULDER, mtmp.mx, mtmp.my)) {
        recalc_block_point(mtmp.mx, mtmp.my);
    }
    return false;
}

/**
 * C ref: dig.c zap_dig — wand/spell dig beam across the level.
 * Branch envelope: horizontal digdepth=rn1(18,8) + door/SDOOR + maze_dig
 * wall/tree/stone + ordinary IS_OBSTRUCTED dig; DISP_BEAM trail.
 * Named omissions: swallowed pierce; u.dz falling-rock / dighole;
 * pitdig conjoined / adj_pit_checks / pit_flow; watch_dig town arrest;
 * shop add_damage / pay_for_damage; in_town cavernous gate.
 */
export async function zap_dig() {
    const u = game.u;
    if (!u) return;

    if (u.uswallow) {
        // pierce / expels deferred
        return;
    }

    if (u.dz) {
        // ceiling rock / dighole deferred
        return;
    }

    let shopdoor = false;
    let shopwall = false;
    const maze_dig = !!(game.level?.flags?.is_maze_lev) && !Is_earthlevel(u.uz);
    let zx = (u.ux | 0) + (u.dx | 0);
    let zy = (u.uy | 0) + (u.dy | 0);
    const pitdig = !!(u.utrap && u.utraptype === TT_PIT);
    // trap_with_u / xytodir used only by deferred pitdig body

    let digdepth = rn1(18, 8);
    tmp_at(DISP_BEAM, digbeam_glyph());
    try {
        while (--digdepth >= 0) {
            if (!isok(zx, zy)) break;
            const room = game.level?.at(zx, zy);
            if (!room) break;
            tmp_at(zx, zy);
            await nh_delay_output();

            if (pitdig) {
                // conjoined pits / dighole deferred — one adjacent only
                break;
            } else if (closed_door(zx, zy) || room.typ === SDOOR) {
                if (in_rooms(zx, zy, SHOPBASE)) {
                    // add_damage(SHOP_DOOR_COST) deferred
                    shopdoor = true;
                }
                if (room.typ === SDOOR) {
                    room.typ = DOOR;
                } else if (cansee(zx, zy)) {
                    await pline('The door is razed!');
                }
                // watch_dig deferred
                room.doormask = D_NODOOR;
                if (room.flags !== undefined) room.flags = D_NODOOR;
                recalc_block_point(zx, zy);
                digdepth -= 2;
                if (maze_dig) break;
            } else if (maze_dig) {
                if (IS_WALL(room.typ)) {
                    if (!(rm_wall_info(room) & W_NONDIGGABLE)) {
                        if (in_rooms(zx, zy, SHOPBASE)) {
                            shopwall = true;
                        }
                        room.typ = ROOM;
                        room.flags = 0;
                        recalc_block_point(zx, zy);
                    } else if (!Blind()) {
                        await pline('The wall glows then fades.');
                    }
                    break;
                } else if (IS_TREE(room.typ)) {
                    if (!(rm_wall_info(room) & W_NONDIGGABLE)) {
                        room.typ = ROOM;
                        room.flags = 0;
                        recalc_block_point(zx, zy);
                    } else if (!Blind()) {
                        await pline('The tree shudders but is unharmed.');
                    }
                    break;
                } else if (room.typ === STONE || room.typ === SCORR) {
                    if (!(rm_wall_info(room) & W_NONDIGGABLE)) {
                        room.typ = CORR;
                        room.flags = 0;
                        recalc_block_point(zx, zy);
                    } else if (!Blind()) {
                        await pline('The rock glows then fades.');
                    }
                    break;
                }
            } else if (IS_OBSTRUCTED(room.typ)) {
                if (!may_dig(zx, zy)) break;
                if (IS_WALL(room.typ) || room.typ === SDOOR) {
                    if (in_rooms(zx, zy, SHOPBASE)) {
                        shopwall = true;
                    }
                    // watch_dig deferred
                    if (game.level?.flags?.is_cavernous_lev /* !in_town */) {
                        room.typ = CORR;
                        room.flags = 0;
                    } else {
                        room.typ = DOOR;
                        room.doormask = D_NODOOR;
                        if (room.flags !== undefined) room.flags = D_NODOOR;
                    }
                    digdepth -= 2;
                } else if (IS_TREE(room.typ)) {
                    room.typ = ROOM;
                    room.flags = 0;
                    digdepth -= 2;
                } else {
                    room.typ = CORR;
                    room.flags = 0;
                    digdepth--;
                }
                recalc_block_point(zx, zy);
            }
            zx += u.dx | 0;
            zy += u.dy | 0;
        }
    } finally {
        tmp_at(DISP_END, 0);
    }

    // pit_flow deferred
    if (shopdoor || shopwall) {
        // pay_for_damage deferred
    }
}
