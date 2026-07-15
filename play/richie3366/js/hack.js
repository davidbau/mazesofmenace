// hack.js — Core hero damage / capacity helpers.
// C ref: hack.c — losehp, nomul, unmul, overexertion, moverock/dopush (and related).

import { game } from './gstate.js';
import {
    Upolyd, KILLED_BY, M_AP_FURNITURE, M_AP_OBJECT, M_AP_TYPE, isok,
    IS_OBSTRUCTED, IRONBARS, IS_DOOR, D_NODOOR, D_BROKEN, D_CLOSED, D_LOCKED,
    NO_ROOM, SHARED, SHARED_PLUS, ROOMOFFSET, SHOPBASE, COLNO, ROWNO,
    is_pit,
    POOL, MOAT, WATER, LAVAPOOL, LAVAWALL, ROOM,
    IS_WATERWALL, PARANOID_SWIM, TIP_SWIM,
    TT_BEARTRAP, TT_PIT, TT_WEB, TT_LAVA, TT_INFLOOR, TT_BURIEDBALL,
} from './const.js';
import { pline, Norep, newsym, canspotmon, map_invisible } from './display.js';
import { gethungry } from './eat.js';
import { m_at } from './mon.js';
import { cansee, recalc_block_point } from './vision.js';
import { is_hider, throws_rocks, noncorporeal } from './monsters.js';
import { objects_at, obj_extract_self, place_object } from './mkobj.js';
import { objectNames } from './generated/objects_data.js';
import { xname } from './objnam.js';
import { A_STR, exercise } from './attrib.js';
import { rn2 } from './rng.js';

const BOULDER = objectNames.indexOf('BOULDER');

function sobj_at(otyp, x, y) {
    for (let o = objects_at(x, y); o; o = o.nexthere) {
        if ((o.otyp | 0) === otyp) return o;
    }
    return null;
}

/** C ref: hack.c doorless_door — D_NODOOR / D_BROKEN only. */
function doorless_door(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc || !IS_DOOR(loc.typ)) return false;
    const m = loc.doormask || 0;
    return m === D_NODOOR || m === D_BROKEN;
}

/** C ref: hack.c closed_door — D_CLOSED | D_LOCKED. */
function closed_door(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc || !IS_DOOR(loc.typ)) return false;
    return !!((loc.doormask || 0) & (D_CLOSED | D_LOCKED));
}

/**
 * Local t_at — trap.js imports hack.js, so avoid the cycle.
 * C ref: trap.c t_at.
 */
function t_at_local(x, y) {
    const traps = game.level?.traps;
    if (!traps) return null;
    for (const t of traps) {
        if (t && (t.tx | 0) === (x | 0) && (t.ty | 0) === (y | 0)) return t;
    }
    return null;
}

/** C ref: pline.c You_hear — acoustics/Deaf; Unaware/Underwater deferred. */
async function You_hear(line) {
    const u = game.u || {};
    if (u.Deaf || game.flags?.acoustics === false) return;
    await pline(`You hear ${line}`);
}

/**
 * C ref: do_name.c a_monnam — ARTICLE_A subtype name (uhitm local twin).
 * Hallu / invisible / named-pet arms deferred.
 */
function a_monnam(mtmp) {
    if (!mtmp) return 'a monster';
    if (mtmp.mextra?.mgivenname) return mtmp.mextra.mgivenname;
    const raw = mtmp?.data?.name || 'monster';
    const plain = String(raw).replace(/^PM_/, '').replace(/_/g, ' ').toLowerCase();
    const an = /^[aeiou]/i.test(plain) ? 'an' : 'a';
    return `${an} ${plain}`;
}

/**
 * C ref: hack.c cannot_push_msg — vain-push topline (no monster-behind).
 */
async function cannot_push_msg(otmp, sx, sy) {
    const what = `the ${xname(otmp)}`;
    if (game.u?.usteed) {
        await pline(`Your steed tries to move ${what}, but cannot.`);
    } else {
        await pline(`You try to move ${what}, but in vain.`);
    }
    // Blind feel_location deferred
}

/**
 * C ref: hack.c cannot_push — giant/squeeze may return 0; else -1.
 * Named omissions: throws_rocks pickup/maneuver arms, could_move_onto_boulder.
 */
async function cannot_push(otmp, sx, sy) {
    if (throws_rocks(game.youmonst?.data)) {
        // giant pickup / maneuver-over plines deferred — still abort push
        return -1;
    }
    // could_move_onto_boulder squeeze deferred
    return -1;
}

/**
 * C ref: hack.c movobj — extract floor obj and place at (ox,oy).
 * maybe_unhide_at deferred. Boulder → recalc_block_point both cells.
 */
function movobj(obj, ox, oy) {
    if (!obj) return;
    const ox0 = obj.ox | 0;
    const oy0 = obj.oy | 0;
    const wasBoulder = (obj.otyp | 0) === BOULDER;
    obj_extract_self(obj);
    newsym(ox0, oy0);
    if (wasBoulder) recalc_block_point(ox0, oy0);
    place_object(obj, ox, oy);
    newsym(ox, oy);
    if (wasBoulder) recalc_block_point(ox, oy);
}

/**
 * C ref: hack.c dopush — message + exercise(A_STR) + movobj.
 * Shop bill / unpaid / stolen_value arms deferred.
 */
async function dopush(sx, sy, rx, ry, otmp) {
    const u = game.u;
    if (!game.bldrpush) game.bldrpush = { oid: 0, time: 0 };
    const bp = game.bldrpush;
    const oid = otmp.o_id | 0;
    if (oid !== bp.oid) {
        bp.time = (game.moves || 0) + 1;
        bp.oid = oid;
    }
    const moves = game.moves || 0;
    const givemesg = moves > bp.time + 2 || moves < bp.time;
    const what = givemesg ? `the ${xname(otmp)}` : null;
    if (!u.usteed) {
        const easypush = throws_rocks(game.youmonst?.data);
        if (givemesg) {
            await pline(
                `With ${easypush ? 'little' : 'great'} effort you move ${what}.`,
            );
        }
        if (!easypush) exercise(A_STR, true);
    } else if (givemesg) {
        // YMonnam(steed) deferred — rare for ordinary push
        await pline(`Your steed moves ${what}.`);
    }
    bp.time = moves;

    // C: if glyph_is_invisible(dest) → unmap_object before movobj/newsym
    // (I from You_hear monster-behind must yield to the pushed boulder).
    const dloc = game.level?.at(rx, ry);
    if (dloc?.remembered_glyph?.invisible) {
        dloc.remembered_glyph = null; // unmap_object trap/engr arms deferred
    }
    otmp.next_boulder = 0;
    movobj(otmp, rx, ry);
    newsym(sx, sy);
}

/**
 * C ref: hack.c moverock_core — push boulder(s) at (sx,sy) along u.dx/u.dy.
 * Branch envelope: clear-dest dopush + monster-behind You_hear/canspotmon
 * + closed_door cannot_push_msg (D-0317). Named omissions: Sokoban diagonal,
 * shop costly, trap/teleport/pool arms, Blind feel, Levitation (present),
 * verysmall, giant/squeeze/nopick, tunneling chew, revive_nasty,
 * next_boulder naming, y_monnam steed wording, cannot_push giant arms.
 * Returns 0 to advance onto vacated cell, -1 to abort the move.
 */
async function moverock_core(sx, sy) {
    const u = game.u;
    while (sobj_at(BOULDER, sx, sy)) {
        const otmp = sobj_at(BOULDER, sx, sy);
        // Ensure boulder is top of pile
        const head = objects_at(sx, sy);
        if (otmp && head && otmp !== head) movobj(otmp, sx, sy);

        const rx = u.ux + 2 * u.dx;
        const ry = u.uy + 2 * u.dy;
        await nomul(0);

        if (u.Levitation || game.dungeon_topology?.Is_airlevel) {
            await pline(`You don't have enough leverage to push the ${xname(otmp)}.`);
            return -1;
        }

        const loc = game.level?.at(rx, ry);
        const typ = loc?.typ ?? 0;
        const clear = isok(rx, ry)
            && !IS_OBSTRUCTED(typ)
            && typ !== IRONBARS
            && (!IS_DOOR(typ) || !(u.dx && u.dy) || doorless_door(rx, ry))
            && !sobj_at(BOULDER, rx, ry);

        if (clear) {
            const ttmp = t_at_local(rx, ry);
            const mtmp = m_at(rx, ry);

            // C: Sokoban diagonal / revive_nasty deferred

            // C ref: hack.c moverock_core — monster on far side of boulder
            if (mtmp && !noncorporeal(mtmp.data)
                && (!mtmp.mtrapped || !(ttmp && is_pit(ttmp.ttyp)))) {
                let deliver_part1 = false;
                // Blind feel_location deferred
                if (canspotmon(mtmp)) {
                    await pline(`There's ${a_monnam(mtmp)} on the other side.`);
                    deliver_part1 = true;
                } else {
                    // Soundeffect deferred
                    await You_hear(`a monster behind the ${xname(otmp)}.`);
                    if (!u.Deaf) deliver_part1 = true;
                    map_invisible(rx, ry);
                }
                if (game.flags?.verbose !== false) {
                    // y_monnam(usteed) deferred — rare on ordinary push
                    const you_or_steed = u.usteed ? 'your steed' : 'you';
                    if (deliver_part1) {
                        await pline(
                            `Perhaps that's why ${you_or_steed} cannot move it.`,
                        );
                    } else {
                        const who = you_or_steed.charAt(0).toUpperCase()
                            + you_or_steed.slice(1);
                        await pline(
                            `${who} cannot move the ${xname(otmp)}.`,
                        );
                    }
                }
                return cannot_push(otmp, sx, sy);
            }

            if (closed_door(rx, ry)) {
                await cannot_push_msg(otmp, sx, sy);
                return cannot_push(otmp, sx, sy);
            }

            // Trap / pool / disturb_buried_zombies arms deferred
            await dopush(sx, sy, rx, ry, otmp);
        } else {
            await cannot_push_msg(otmp, sx, sy);
            return cannot_push(otmp, sx, sy);
        }
    }
    return 0;
}

/**
 * C ref: hack.c moverock — push boulder(s) at hero+dir.
 * Uses u.dx/u.dy already set by domove.
 */
export async function moverock() {
    const u = game.u;
    const sx = u.ux + u.dx;
    const sy = u.uy + u.dy;
    return moverock_core(sx, sy);
}

/** True if floor cell has a boulder (domove test_move gate). */
export function boulder_at(x, y) {
    return !!sobj_at(BOULDER, x, y);
}

const AT_BOOM = 14; // monattk.h — explosion-on-death, not a real attack

/**
 * C ref: mondata.c noattacks — True if mattk slots are empty (ignore AT_BOOM).
 */
export function noattacks(ptr) {
    const slots = ptr?.mattk;
    if (!slots) return true;
    for (let i = 0; i < 6; i++) {
        const aatyp = slots[i]?.aatyp | 0;
        if (aatyp === AT_BOOM) continue;
        if (aatyp) return false;
    }
    return true;
}

/**
 * C ref: hack.c monster_nearby — adjacent hostile the hero can spot.
 * onscary stubbed false (Elbereth / sanctuary still deferred).
 */
export function monster_nearby() {
    const u = game.u;
    if (!u) return false;
    const hallu = !!(u.Hallucination);
    for (let x = u.ux - 1; x <= u.ux + 1; x++) {
        for (let y = u.uy - 1; y <= u.uy + 1; y++) {
            if (!isok(x, y) || (x === u.ux && y === u.uy)) continue;
            const mtmp = m_at(x, y);
            if (!mtmp) continue;
            const ap = M_AP_TYPE(mtmp);
            if (ap === M_AP_FURNITURE || ap === M_AP_OBJECT) continue;
            if (!(hallu || (!mtmp.mpeaceful && !noattacks(mtmp.data)))) continue;
            if (is_hider(mtmp.data) && mtmp.mundetected) continue;
            if (mtmp.msleeping || mtmp.mcanmove === 0) continue; // helpless
            // onscary(u.ux, u.uy, mtmp) deferred
            // canspotmon ≈ canseemon stub
            if (!cansee(mtmp.mx, mtmp.my) || mtmp.minvis) continue;
            return true;
        }
    }
    return false;
}

/**
 * C ref: hack.c overexertion — melee hunger via gethungry; maybe faint.
 * Encumber HP loss (near_capacity / overexert_hp) deferred — no RNG when
 * not heavily encumbered.
 */
export function overexertion() {
    gethungry();
    return (game.multi | 0) < 0;
}

/**
 * C ref: hack.h Maybe_Half_Phys — Half_physical_damage halves ((dmg+1)/2).
 * Prop not yet wired → identity.
 */
export function maybe_half_phys(dmg) {
    const u = game.u;
    const half = !!(u?.HHalf_physical_damage || u?.EHalf_physical_damage);
    if (half) return Math.trunc((dmg + 1) / 2);
    return dmg;
}

/**
 * C ref: hack.c nomul — start/replace multi-turn inactivity (negative = occupation).
 * end_running / cmdq_clear deferred.
 */
export function nomul(nval) {
    if ((game.multi || 0) < nval) return;
    if (!game.flags) game.flags = {};
    if ((game.multi || 0) >= 0) game.flags.botl = true;
    game.multi = nval;
    if (nval === 0) {
        game.multi_reason = null;
        game.nomovemsg = null;
    }
    if (game.context) {
        game.context.run = 0;
        game.context.mv = 0;
    }
}

/**
 * C ref: allmain.c stop_occupation — interrupt multi-turn occupation.
 * maybe_finished_meal / reset_eat callers deferred at call sites.
 */
export async function stop_occupation() {
    if (typeof game.occupation === 'function') {
        const txt = game.occtxt;
        if (txt) await pline(`You stop ${txt}.`);
        game.occupation = null;
        if (!game.flags) game.flags = {};
        game.flags.botl = true;
        nomul(0);
    } else if ((game.multi || 0) >= 0) {
        nomul(0);
    }
    game._repeat_search = false;
    // C: cmdq_clear(CQ_CANNED) — avoid importing cmd.js
    if (game._cmdq_canned) game._cmdq_canned = [];
}

/**
 * C ref: timeout.c fall_asleep — nomul(how_long) with sleeping reason.
 * Deafness / Hear_again afternmv (#if 0 in C) deferred.
 * @param {number} how_long negative multi turns
 * @param {boolean} wakeup_msg if true, nomovemsg is "You wake up."
 */
export function fall_asleep(how_long, wakeup_msg) {
    // stop_occupation — clear multi-turn occupation without message
    if (typeof game.occupation === 'function') game.occupation = null;
    nomul(how_long);
    game.multi_reason = 'sleeping';
    if (!game.u) game.u = {};
    game.u.usleep = game.moves | 0;
    game.nomovemsg = wakeup_msg ? 'You wake up.' : 'You can move again.';
}

/**
 * C ref: hack.c unmul — finish multi-turn action; run afternmv if set.
 * @param {string|null|undefined} msg_override
 */
export async function unmul(msg_override) {
    if (!game.flags) game.flags = {};
    game.flags.botl = true;
    game.multi = 0;
    let msg = msg_override;
    if (msg === undefined) msg = null;
    if (msg != null) game.nomovemsg = msg;
    else if (!game.nomovemsg) game.nomovemsg = 'You can move again.';
    if (game.nomovemsg) {
        if (game.nomovemsg.length) await pline(game.nomovemsg);
        game.nomovemsg = null;
    }
    game.multi_reason = null;
    const f = game.afternmv;
    game.afternmv = null;
    if (typeof f === 'function') await f();
}

/**
 * C ref: hack.c losehp() — subtract HP (or mh when Upolyd).
 * Fatal: set killer + gameover + `_losehp_needs_done` so callers must not
 * continue (C `done(DIED)` is noreturn). Callers in async paths await
 * `finish_losehp_done` from end.js; showdamage / maybe_wail / rehumanize
 * deferred.
 */
export function losehp(n, knam, k_format = KILLED_BY) {
    const u = game.u || (game.u = {});
    if (!game.flags) game.flags = {};
    game.flags.botl = true;
    // C: end_running(TRUE) — clear rush; do NOT force multi=0 (nomul owns that)
    if (game.context) {
        game.context.run = 0;
        game.context.mv = 0;
        game.context.travel = 0;
    }
    if ((game.multi | 0) > 0) game.multi = 0;

    if (Upolyd(u)) {
        u.mh = (u.mh || 0) - n;
        if ((u.mhmax || 0) < (u.mh || 0)) u.mhmax = u.mh;
        if ((u.mh || 0) < 1) {
            // rehumanize deferred — treat as fatal for now
            u.mh = 0;
            if (!game.program_state) game.program_state = {};
            game.program_state.gameover = true;
            game._losehp_needs_done = true;
            if (!game.killer) game.killer = { name: '', format: 0 };
            game.killer.name = knam || '';
            game.killer.format = k_format;
        }
        return;
    }

    u.uhp = (u.uhp || 0) - n;
    if ((u.uhp || 0) > (u.uhpmax || 0)) u.uhpmax = u.uhp;
    // C hack.c losehp: do not clamp uhp on fatal — leave negative so bot()
    // no-ops when uhp==-1 (exact overkill) and prior botl stays through the
    // deferred hit --More-- before urgent_pline("You die...") / done().
    // done() zeros uhp after its bot() call (end.c).
    if ((u.uhp || 0) < 1) {
        // C: urgent_pline("You die..."); done(DIED); — noreturn
        if (!game.program_state) game.program_state = {};
        game.program_state.gameover = true;
        game._losehp_needs_done = true;
        if (!game.killer) game.killer = { name: '', format: 0 };
        game.killer.name = knam || '';
        game.killer.format = k_format;
    }
    // else if (n > 0 && u.uhp * 10 < u.uhpmax) maybe_wail() — deferred
}

/** C: IS_SHOP(x) — rooms[x].rtype >= SHOPBASE */
function IS_SHOP(roomIdx) {
    const rooms = game.level?.rooms || [];
    return ((rooms[roomIdx]?.rtype | 0) >= SHOPBASE);
}

/**
 * C ref: hack.c in_rooms — roomno chars at (x,y), optionally filtered by type.
 * SHARED / SHARED_PLUS neighbor walk included; returns string of room chars.
 */
export function in_rooms(x, y, typewanted = 0) {
    const level = game.level;
    if (!level?.at) return '';
    const loc0 = level.at(x, y);
    if (!loc0) return '';

    function goodtype(rno) {
        if (!typewanted) return true;
        const typefound = level.rooms?.[rno - ROOMOFFSET]?.rtype | 0;
        return typefound === typewanted
            || (typewanted === SHOPBASE && typefound > SHOPBASE);
    }

    const rno0 = loc0.roomno | 0;
    if (rno0 === NO_ROOM) return '';
    if (rno0 !== SHARED && rno0 !== SHARED_PLUS) {
        return goodtype(rno0) ? String.fromCharCode(rno0) : '';
    }

    const step = rno0 === SHARED ? 2 : 1;
    let min_x = x - 1;
    let max_x = x + 1;
    if (x < 1) min_x += step;
    else if (x >= COLNO) max_x -= step;

    let min_y = y - 1;
    let max_y_offset = 2;
    if (min_y < 0) {
        min_y += step;
        max_y_offset -= step;
    } else if ((min_y + max_y_offset) >= ROWNO) {
        max_y_offset -= step;
    }

    // C builds into buf[5] from the end; collect then reverse for stable order
    const found = [];
    for (let cx = min_x; cx <= max_x; cx += step) {
        for (let dy = 0; dy <= max_y_offset; dy += step) {
            const loc = level.at(cx, min_y + dy);
            const rno = loc?.roomno | 0;
            if (rno >= ROOMOFFSET && !found.includes(rno) && goodtype(rno)) {
                found.push(rno);
            }
        }
    }
    // C prepends (--ptr), so later discoveries appear earlier in the string
    found.reverse();
    return found.map((r) => String.fromCharCode(r)).join('');
}

/** Ensure shop/room occupancy strings exist on u (C you.h char arrays). */
function ensure_u_room_strings(u) {
    if (u.urooms == null) u.urooms = '';
    if (u.urooms0 == null) u.urooms0 = '';
    if (u.uentered == null) u.uentered = '';
    if (u.ushops == null) u.ushops = '';
    if (u.ushops0 == null) u.ushops0 = '';
    if (u.ushops_entered == null) u.ushops_entered = '';
    if (u.ushops_left == null) u.ushops_left = '';
}

/**
 * C ref: hack.c move_update — refresh urooms/ushops and enter/leave deltas.
 */
function move_update(newlev) {
    const u = game.u;
    if (!u) return;
    ensure_u_room_strings(u);

    u.urooms0 = u.urooms || '';
    u.ushops0 = u.ushops || '';
    if (newlev) {
        u.urooms = '';
        u.uentered = '';
        u.ushops = '';
        u.ushops_entered = '';
        u.ushops_left = u.ushops0;
        return;
    }

    u.urooms = in_rooms(u.ux, u.uy, 0);
    let entered = '';
    let shops = '';
    let shopsEntered = '';
    for (let i = 0; i < u.urooms.length; i++) {
        const c = u.urooms[i];
        const code = u.urooms.charCodeAt(i);
        if (!u.urooms0.includes(c)) entered += c;
        if (IS_SHOP(code - ROOMOFFSET)) {
            shops += c;
            if (!u.ushops0.includes(c)) shopsEntered += c;
        }
    }
    u.uentered = entered;
    u.ushops = shops;
    u.ushops_entered = shopsEntered;

    let left = '';
    for (let i = 0; i < u.ushops0.length; i++) {
        const c = u.ushops0[i];
        if (!u.ushops.includes(c)) left += c;
    }
    u.ushops_left = left;
}

// --- swim / liquid move danger (hack.c swim_move_danger) -----------------

/** C ref: dbridge.c is_waterwall — drawbridge under deferred. */
function is_waterwall_at(x, y) {
    if (!isok(x, y)) return false;
    const loc = game.level?.at(x, y);
    return !!(loc && IS_WATERWALL(loc.typ));
}

/**
 * C ref: dbridge.c is_pool — POOL/MOAT/WATER; juiblex/drawbridge arms deferred.
 */
export function is_pool(x, y) {
    if (!isok(x, y)) return false;
    const typ = game.level?.at(x, y)?.typ;
    return typ === POOL || typ === MOAT || typ === WATER;
}

/**
 * C ref: dbridge.c is_lava — LAVAPOOL/LAVAWALL; drawbridge-under deferred.
 */
export function is_lava(x, y) {
    if (!isok(x, y)) return false;
    const typ = game.level?.at(x, y)?.typ;
    return typ === LAVAPOOL || typ === LAVAWALL;
}

/** C ref: hacklib.c / pline.h hliquid — Hallucination rename deferred. */
function hliquid(waterish) {
    return waterish;
}

/**
 * C ref: pager.c waterbody_name — pool/moat/lava/wall; medusa/juiblex/
 * samurai pond / Hallucination / SURFACE_AT drawbridge deferred.
 */
export function waterbody_name(x, y) {
    if (!isok(x, y)) return 'drink';
    const typ = game.level?.at(x, y)?.typ;
    if (typ === LAVAPOOL) return `molten ${hliquid('lava')}`;
    if (typ === POOL) return `pool of ${hliquid('water')}`;
    if (typ === MOAT) return 'moat';
    if (IS_WATERWALL(typ)) return `wall of ${hliquid('water')}`;
    if (typ === LAVAWALL) return `wall of ${hliquid('lava')}`;
    return 'water';
}

/**
 * C ref: hacklib.c ing_suffix — gerund; on/off/with split + full vowel
 * doubling kept for "step"→"stepping".
 */
function ing_suffix(s) {
    let buf = String(s);
    const vowel = 'aeiouwy';
    let onoff = '';
    if (/\s+on$/i.test(buf) || /\s+off$/i.test(buf) || /\s+with$/i.test(buf)) {
        const sp = buf.lastIndexOf(' ');
        onoff = buf.slice(sp);
        buf = buf.slice(0, sp);
    }
    const n = buf.length;
    if (n >= 2 && buf.slice(-2).toLowerCase() === 'er') {
        // slither + ing
    } else if (n >= 3
        && !vowel.includes(buf[n - 1].toLowerCase())
        && vowel.includes(buf[n - 2].toLowerCase())
        && !vowel.includes(buf[n - 3].toLowerCase())) {
        buf += buf[n - 1]; // tip → tipp
    } else if (n >= 2 && buf.slice(-2).toLowerCase() === 'ie') {
        buf = `${buf.slice(0, -2)}y`;
    } else if (n >= 1 && buf[n - 1].toLowerCase() === 'e') {
        buf = buf.slice(0, -1);
    }
    return `${buf}ing${onoff}`;
}

/**
 * C ref: hack.c u_locomotion — Lev/Fly capitalize path; poly locomotion deferred.
 */
function u_locomotion(defWord) {
    const u = game.u || {};
    if (u.Levitation) return 'float';
    if (u.Flying) return 'fly';
    return defWord;
}

/**
 * C ref: hack.c u_simple_floortyp — grounded pool/lava vs air; poly
 * !grounded flyer arm deferred (treat as grounded unless Lev/Fly).
 */
function u_simple_floortyp(x, y) {
    const u = game.u || {};
    const uInAir = !!(u.Levitation || u.Flying);
    if (is_waterwall_at(x, y)) return WATER;
    const loc = game.level?.at(x, y);
    if (loc?.typ === LAVAWALL) return LAVAWALL;
    if (!uInAir) {
        if (is_pool(x, y)) return POOL;
        if (is_lava(x, y)) return LAVAPOOL;
    }
    return ROOM;
}

/**
 * C ref: hack.c handle_tip — tips option + once-per-bit context.tips.
 * TIP_ENHANCE / TIP_UNTRAP_MON / TIP_GETPOS deferred (callers elsewhere).
 */
export async function handle_tip(tip) {
    if (game.flags?.tips === false) return false;
    if (tip < 0 || tip >= 4 /* NUM_TIPS */) return false;
    if (!game.context) game.context = {};
    const bits = game.context.tips | 0;
    if (bits & (1 << tip)) return false;
    game.context.tips = bits | (1 << tip);
    if (tip === TIP_SWIM) {
        // C: visctrl(cmd_from_func(do_reqmenu)) → 'm' under default binds
        await pline("(Tip: use 'm' prefix to step in if you really want to.)");
        return true;
    }
    return false;
}

/**
 * C ref: hack.c swim_move_danger — ParanoidSwim / liquid-wall avoid pline.
 * Known_wwalking / Known_lwalking / steed / Underwater pool stay deferred
 * beyond the seenv + nopick + ParanoidSwim|liquid_wall envelope used here.
 * @returns {Promise<boolean>} true → stop move (dangerous)
 */
export async function swim_move_danger(x, y) {
    const u = game.u || {};
    const newtyp = u_simple_floortyp(x, y);
    const liquidWall = IS_WATERWALL(newtyp) || newtyp === LAVAWALL;
    const loc = game.level?.at(x, y);

    if (u.Underwater && (is_pool(x, y) || IS_WATERWALL(newtyp))) return false;

    if (newtyp !== u_simple_floortyp(u.ux, u.uy)
        && !u.Stunned && !u.Confusion && loc?.seenv
        && (is_pool(x, y) || is_lava(x, y) || liquidWall)) {
        // Known_wwalking / Known_lwalking deferred → treat as unknown
        if ((is_pool(x, y) /* && !Known_wwalking */)
            || (is_lava(x, y) && !is_lava(u.ux, u.uy))
            || liquidWall) {
            if (game.context?.nopick) {
                // m-prefix: allow step; suppress future tip
                game.context.tips = (game.context.tips | 0) | (1 << TIP_SWIM);
                return false;
            }
            const bits = game.flags?.paranoia_bits;
            const paranoidSwim = bits == null
                ? true
                : (bits & PARANOID_SWIM) !== 0;
            if (paranoidSwim || liquidWall) {
                await pline(`You avoid ${ing_suffix(u_locomotion('step'))} into the ${waterbody_name(x, y)}.`);
                await handle_tip(TIP_SWIM);
                return true;
            }
        }
    }
    return false;
}

/**
 * C ref: hack.c crawl_destination — orthogonal always; diagonal door/
 * squeeze checks. NODIAG / Passes_walls / bad_rock squeeze deferred →
 * diagonal allowed when goodpos.
 */
export function crawl_destination(x, y) {
    const u = game.u;
    if (!u) return false;
    // Lazy goodpos via teleport to avoid hack→teleport→… cycles at load
    // Inline ACCESSIBLE floor check approximating goodpos for hero crawl.
    if (!isok(x, y)) return false;
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    // C: goodpos(x,y,&youmonst,0) — pool/lava not good for grounded hero
    if (is_pool(x, y) || is_lava(x, y) || IS_WATERWALL(loc.typ)
        || loc.typ === LAVAWALL) return false;
    if (IS_OBSTRUCTED(loc.typ) || loc.typ === IRONBARS) return false;
    if (IS_DOOR(loc.typ) && closed_door(x, y)) return false;
    // occupied by monster
    if (m_at(x, y)) return false;
    if (x === u.ux || y === u.uy) return true;
    // diagonal: intact doorway ban
    if (IS_DOOR(loc.typ) && !doorless_door(x, y)) return false;
    return true;
}

/**
 * C ref: hack.c trapmove — try to escape u.utrap by walking; return true iff
 * movement should continue toward destination. Always false for bear trap
 * (escape still leaves hero on the trap square this turn).
 *
 * Branch envelope this iteration: TT_BEARTRAP full (no steed); TT_WEB
 * decrement+msgs; TT_PIT adjacent-pit continue + climb_pit stub; TT_LAVA /
 * TT_INFLOOR / TT_BURIEDBALL / steed / Sting / buried_ball_to_punishment /
 * surface() culprit text deferred.
 *
 * @param {number} x destination x
 * @param {number} y destination y
 * @param {object|null} desttrap trap at destination or null
 * @returns {Promise<boolean>}
 */
export async function trapmove(x, y, desttrap) {
    const u = game.u;
    if (!u || !(u.utrap | 0)) return true;

    const verbose = game.flags?.verbose !== false;
    let anchored = false;

    switch (u.utraptype | 0) {
    case TT_BEARTRAP: {
        if (verbose) {
            // steed Norep deferred
            await Norep('You are caught in a bear trap.');
        }
        // C: diagonal or !rn2(5) decrements escape counter
        if ((u.dx && u.dy) || !rn2(5)) {
            u.utrap = (u.utrap | 0) - 1;
        }
        if (!(u.utrap | 0)) {
            // wriggle_free — steed / wrench-ball arms deferred
            await pline('You finally wriggle free.');
        }
        break;
    }
    case TT_PIT: {
        if (desttrap && desttrap.tseen && is_pit(desttrap.ttyp)) {
            return true; // move into adjacent pit
        }
        // climb_pit() body deferred — still consume the attempt
        break;
    }
    case TT_WEB: {
        // u_wield_art(ART_STING) cut-through deferred
        u.utrap = (u.utrap | 0) - 1;
        if (u.utrap | 0) {
            if (verbose) {
                await Norep('You are stuck to the web.');
            }
        } else {
            await pline('You disentangle yourself.');
        }
        break;
    }
    case TT_LAVA: {
        if (verbose) {
            await Norep('You are stuck in the lava.');
        }
        if (!is_lava(x, y)) {
            u.utrap = (u.utrap | 0) - 1;
            if (((u.utrap | 0) & 0xff) === 0) {
                u.utrap = 0;
                await pline('You pull yourself to the edge of the lava.');
            }
        }
        u.umoved = true;
        break;
    }
    case TT_INFLOOR:
    case TT_BURIEDBALL: {
        anchored = (u.utraptype | 0) === TT_BURIEDBALL;
        // buried_ball radius-1 free-move arm deferred
        u.utrap = (u.utrap | 0) - 1;
        if (u.utrap | 0) {
            if (verbose) {
                const msg = anchored
                    ? 'You are chained to the buried ball.'
                    : 'You are stuck in the floor.';
                await Norep(msg);
            }
        } else if (anchored) {
            await pline('You finally wrench the ball free.');
            // buried_ball_to_punishment deferred
        } else {
            await pline('You finally wriggle free.');
        }
        break;
    }
    case TT_NONE:
    default:
        break;
    }
    return false;
}

/**
 * C ref: hack.c check_special_room — shop enter/leave + special-room messages.
 * Named omissions: Mine Town ACH_TOWN; zoo/swamp/court/… plines; room_discovered
 * mapseen; shop rtype→OROOM clear path (shops keep rtype via default).
 */
export async function check_special_room(newlev) {
    const u = game.u;
    if (!u) return;
    move_update(!!newlev);

    // Lazy import avoids hack → shk → mhitu → hack cycle.
    const { u_entered_shop, u_left_shop } = await import('./shk.js');

    if (u.ushops0) {
        await u_left_shop(u.ushops_left || '', !!newlev);
    }

    if (!u.uentered && !u.ushops_entered) return;

    if (u.ushops_entered) {
        await u_entered_shop(u.ushops_entered);
    }
    // other special-room entrance plines deferred
}
