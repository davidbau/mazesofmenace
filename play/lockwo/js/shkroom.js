// shkroom.js — room-entry bookkeeping and the shop greeting.
// C ref: hack.c in_rooms()/move_update()/check_special_room(), shk.c
// u_entered_shop()/u_left_shop().
//
// u.ushops feeds shk_move()'s `avoid` decision (monmove.js), so this is RNG
// state, not just display: without it a shopkeeper picks a different square.

import { game } from './gstate.js';
import { pline } from './display.js';
import { shtypes } from './shtypes.js';
import { Hello } from './role.js';
import {
    ROOMOFFSET, NO_ROOM, SHARED, SHARED_PLUS, SHOPBASE, COLNO, ROWNO,
} from './const.js';

const PICK_AXE = 259, DWARVISH_MATTOCK = 71;

const IS_SHOP = (rt) => rt >= SHOPBASE;

function roomAt(rno) { return game.level?.rooms?.[rno - ROOMOFFSET] || null; }
function rtypeOf(rno) { return roomAt(rno)?.rtype ?? 0; }

// C ref: hack.c in_rooms(x, y, typewanted) — the room numbers covering (x,y),
// filtered by room type.  Returns C's buffer as an array of roomno values in
// C's order (each hit is PREPENDED, so it reads back-to-front of the scan).
export function in_rooms(x, y, typewanted) {
    const out = [];
    const loc = game.level?.at(x, y);
    if (!loc) return out;
    const goodtype = (rno) => {
        if (!typewanted) return true;
        const typefound = rtypeOf(rno);
        return typefound === typewanted
            || (typewanted === SHOPBASE && typefound > SHOPBASE);
    };
    let rno = loc.roomno ?? NO_ROOM;
    let step;
    if (rno === NO_ROOM) return out;
    if (rno === SHARED) step = 2;
    else if (rno === SHARED_PLUS) step = 1;
    else {
        if (goodtype(rno)) out.unshift(rno);
        return out;
    }

    let min_x = x - 1;
    let max_x = x + 1;
    if (x < 1) min_x += step;
    else if (x >= COLNO) max_x -= step;

    let min_y = y - 1, max_y_offset = 2;
    if (min_y < 0) { min_y += step; max_y_offset -= step; }
    else if ((min_y + max_y_offset) >= ROWNO) max_y_offset -= step;

    for (let sx = min_x; sx <= max_x; sx += step) {
        for (let dy = 0; dy <= max_y_offset; dy += step) {
            const l = game.level?.at(sx, min_y + dy);
            rno = l ? (l.roomno ?? NO_ROOM) : NO_ROOM;
            if (rno >= ROOMOFFSET && !out.includes(rno) && goodtype(rno))
                out.unshift(rno);
        }
    }
    return out;
}

// C ref: shk.c shop_keeper(rmno) — the resident shopkeeper of a room number.
export function shop_keeper(rno) {
    if (!(rno >= ROOMOFFSET)) return null;
    const shkp = roomAt(rno)?.resident || null;
    if (!shkp || (shkp.mhp != null && shkp.mhp <= 0)) return null;
    return shkp;
}

// C ref: shk.c inhishop(shkp).
function inhishop(shkp) {
    const loc = game.level?.at(shkp.mx, shkp.my);
    const rmno = loc?.roomno ?? 0;
    return rmno !== 0 && rmno === shkp.eshk?.shoproom;
}

// C ref: shk.c inside_shop(x, y) — strictly inside, i.e. not on the boundary.
function inside_shop(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    const rno = loc.roomno ?? NO_ROOM;
    if (rno < ROOMOFFSET || loc.edge) return false;
    return IS_SHOP(rtypeOf(rno));
}

// C ref: shknam.c shkname() — the personal name with its prefix character
// stripped ('+'/'-'/'|'/'_' encode gender in the shknms[] tables).
export function shkname(shkp) {
    const nm = shkp.eshk?.shknam;
    if (!nm) return shkp.data?.name || 'shopkeeper';
    return /[A-Za-z]/.test(nm[0]) ? nm : nm.slice(1);
}
const s_suffix = (s) => (/s$/.test(s) ? `${s}'` : `${s}'s`);

// C ref: hack.c move_update(newlev) — recompute u.urooms/u.ushops and the
// entered/left deltas for the hero's current square.
function move_update(newlev) {
    const u = game.u;
    u.urooms0 = u.urooms || [];
    u.ushops0 = u.ushops || [];
    if (newlev) {
        u.urooms = []; u.uentered = []; u.ushops = []; u.ushops_entered = [];
        u.ushops_left = u.ushops0.slice();
        return;
    }
    u.urooms = in_rooms(u.ux, u.uy, 0);
    u.uentered = []; u.ushops = []; u.ushops_entered = [];
    for (const c of u.urooms) {
        if (!u.urooms0.includes(c)) u.uentered.push(c);
        if (IS_SHOP(rtypeOf(c))) {
            u.ushops.push(c);
            if (!u.ushops0.includes(c)) u.ushops_entered.push(c);
        }
    }
    u.ushops_left = u.ushops0.filter((c) => !u.ushops.includes(c));
}

// C ref: shk.c u_left_shop(leavestring, newlev).
async function u_left_shop(leavestring, _newlev) {
    const u = game.u;
    const loc = game.level?.at(u.ux, u.uy);
    const loc0 = game.level?.at(u.ux0 ?? u.ux, u.uy0 ?? u.uy);
    if (!leavestring.length && (!loc?.edge || loc0?.edge)) return;
    const shkp = shop_keeper(leavestring.length ? leavestring[0] : u.ushops0[0]);
    if (!shkp || !inhishop(shkp)) return;
    const eshk = shkp.eshk;
    if (!eshk.billct && !eshk.debit) return; /* bill is settled */
    if (!leavestring.length) {
        await pline(`"${game.plname}!  ${eshk.surcharge
            ? "Don't you leave without paying!" : 'Please pay before leaving.'}"`);
        return;
    }
    // rob_shop()/call_kops(): nothing is ever billed, so this is unreachable.
}

// C ref: shk.c u_entered_shop(enterstring).
async function u_entered_shop(enterstring) {
    if (!enterstring.length) return;
    const u = game.u;
    const shkp = shop_keeper(enterstring[0]);
    if (!shkp || !inhishop(shkp)) {
        // deserted_shop(): the "This shop is untended." flavour needs a shop
        // whose keeper has left it, which no recorded level produces.
        u.ushops = [];
        return;
    }
    const eshk = shkp.eshk;
    if ((!eshk.visitct || eshk.customer)
        && String(eshk.customer || '').toLowerCase()
           !== String(game.plname || '').toLowerCase()) {
        eshk.visitct = 0;
        eshk.following = 0;
        eshk.customer = game.plname;
        // pacify_shk(): clears anger/surcharge; no RNG.
        shkp.mpeaceful = 1;
        eshk.surcharge = 0;
    }
    if (eshk.following) return; /* no dialog */

    const rt = rtypeOf(enterstring[0]);
    const shopname = shtypes[rt - SHOPBASE]?.name || 'store';
    if (!shkp.mpeaceful) {
        await pline(`"So, ${game.plname}, you dare return to ${
            s_suffix(shkname(shkp))} ${shopname}?!"`);
    } else if (eshk.surcharge) {
        await pline(`"Back again, ${game.plname}?  I've got my eye on you."`);
    } else if (eshk.robbed) {
        await pline(`${shkname(shkp)} mutters imprecations against shoplifters.`);
    } else {
        await pline(`"${Hello(game.urole?.mnum, shkp)}, ${game.plname}!  Welcome${
            eshk.visitct++ ? ' again' : ''} to ${s_suffix(shkname(shkp))} ${shopname}!"`);
    }

    // C ref: shk.c — a hero who stopped in the doorway carrying a digging tool
    // (or riding) is asked to leave it outside and the shk gets an extra move.
    if (inside_shop(u.ux, u.uy)) return;
    const not_upset = !eshk.surcharge;
    const inv = game.invent || [];
    const pick = inv.find((o) => o.otyp === PICK_AXE) || null;
    const mattock = inv.find((o) => o.otyp === DWARVISH_MATTOCK) || null;
    let should_block;
    if (pick || mattock) {
        let cnt = 1, tool;
        if (pick && mattock) { tool = 'digging tool'; cnt = 2; }
        else if (pick) { tool = 'pick-axe'; cnt = inv.filter((o) => o.otyp === PICK_AXE).length; }
        else { tool = 'mattock'; cnt = inv.filter((o) => o.otyp === DWARVISH_MATTOCK).length; }
        const plur = cnt === 1 ? '' : 's';
        await pline(not_upset ? `"Will you please leave your ${tool}${plur} outside?"`
            : `"Leave the ${tool}${plur} outside."`);
        should_block = true;
    } else {
        const here = (game.level?.objects || []).filter(
            (o) => o.where === 'floor' && o.ox === u.ux && o.oy === u.uy);
        should_block = !!(u.Fast
            && here.some((o) => o.otyp === PICK_AXE || o.otyp === DWARVISH_MATTOCK));
    }
    if (should_block) {
        const { dochug } = await import('./monmove.js');
        await dochug(shkp); /* shk gets extra move */
    }
}

// C ref: hack.c check_special_room(newlev).  The u.uentered switch (zoo/court/
// morgue/... entry messages, each with its own rn2(3) wake-up roll per resident
// monster) is not ported; only the shop arm runs here.
export async function check_special_room(newlev) {
    const u = game.u;
    if (!u || !game.level) return;
    move_update(newlev);

    if (u.ushops0.length) await u_left_shop(u.ushops_left, newlev);

    if (!u.uentered.length && !u.ushops_entered.length) return;

    if (u.ushops_entered.length) await u_entered_shop(u.ushops_entered);
}
