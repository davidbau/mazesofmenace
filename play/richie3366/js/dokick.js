// dokick.js — #kick command.
// C ref: dokick.c — dokick, kick_dumb, kick_nondoor (empty-space / open-floor
// envelope). Monster, object, closed-door, secret-door, and furniture kicks
// are named omissions in C-JS-MAP.md.

import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';
import { acurr, A_DEX, A_STR, A_CON, exercise } from './attrib.js';
import { pline } from './display.js';
import { getdir } from './lock.js';
import { near_capacity } from './invent.js';
import { objects_at } from './mkobj.js';
import { mon_at } from './uhitm.js';
import { losehp, maybe_half_phys } from './hack.js';
import {
    COLNO, ROWNO,
    SDOOR, SCORR, STAIRS, LADDER, IRONBARS, LAVAWALL,
    D_ISOPEN, D_BROKEN, D_NODOOR, LA_DOWN, SLT_ENCUMBER,
    IS_DOOR, IS_STWALL, IS_POOL, IS_THRONE, IS_FOUNTAIN, IS_SINK, IS_GRAVE,
    IS_TREE, KILLED_BY,
} from './const.js';

function isok(x, y) {
    return x >= 1 && x < COLNO && y >= 0 && y < ROWNO;
}

/** C ref: dokick.c martial() — Monk/Samurai/Sasquatch/kicking-boots deferred. */
function martial() {
    return false;
}

/**
 * C ref: dokick.c kick_dumb — empty space / open doorway.
 * RNG: exercise(A_DEX, FALSE) always; low-DEX strain path adds rn2(3),
 * exercise(A_STR, FALSE), and rnd(5) for wounded legs.
 */
async function kick_dumb(x, y) {
    exercise(A_DEX, false);
    if (martial() || acurr(A_DEX) >= 16 || rn2(3)) {
        await pline('You kick at empty space.');
        // Blind feel_location deferred
    } else {
        await pline('Dumb move!  You strain a muscle.');
        exercise(A_STR, false);
        // set_wounded_legs(RIGHT_SIDE, 5 + rnd(5)) — legs state deferred;
        // still consume the rnd when the strain message fires.
        rnd(5);
    }
    // Airlevel / Levitation hurtle deferred
    void x;
    void y;
}

/**
 * C ref: dokick.c kick_ouch — solid terrain / failed impact (partial).
 * Blind feel_location / wake_nearto / drawbridge / set_wounded_legs body /
 * airlevel hurtle deferred. losehp applies the damage roll (regen_hp needs
 * uhp < uhpmax).
 */
async function kick_ouch(x, y, kickobjnam = '') {
    await pline('Ouch!  That hurts!');
    exercise(A_DEX, false);
    exercise(A_STR, false);
    // Blind feel_location / wake_nearto / drawbridge deferred
    if (!rn2(3)) {
        // set_wounded_legs(RIGHT_SIDE, 5 + rnd(5))
        rnd(5);
    }
    // C: dmg = rnd(ACURR(A_CON) > 15 ? 3 : 5);
    //     losehp(Maybe_Half_Phys(dmg), kickstr(...), KILLED_BY);
    const dmg = rnd(acurr(A_CON) > 15 ? 3 : 5);
    const what = kickobjnam || 'a wall';
    losehp(maybe_half_phys(dmg), what, KILLED_BY);
    // Is_airlevel / Levitation hurtle deferred
    void x;
    void y;
}

/**
 * C ref: dokick.c kick_door — open/broken/nodoor → kick_dumb; else partial.
 */
async function kick_door(x, y, _avrg_attrib) {
    const loc = game.level?.at(x, y);
    const mask = loc?.doormask ?? D_NODOOR;
    if (mask === D_ISOPEN || mask === D_BROKEN || mask === D_NODOOR) {
        await kick_dumb(x, y);
        return;
    }
    // Closed/locked door bust (Whammm / shop / trap) deferred — kick_ouch
    // is only a stand-in so the command still consumes a turn.
    await kick_ouch(x, y);
}

/**
 * C ref: dokick.c kick_nondoor — empty-floor envelope.
 * SDOOR/SCORR open rolls, throne/fountain/grave/tree/sink specials deferred.
 */
async function kick_nondoor(x, y, avrg_attrib) {
    const loc = game.level?.at(x, y);
    if (!loc) {
        await kick_dumb(x, y);
        return true;
    }
    const typ = loc.typ;

    if (typ === SDOOR || typ === SCORR) {
        // Secret door/passage open attempt deferred → failed kick hurts
        await kick_ouch(x, y);
        return true;
    }
    if (IS_THRONE(typ) || IS_FOUNTAIN(typ) || IS_GRAVE(typ) || IS_TREE(typ)
        || IS_SINK(typ) || typ === IRONBARS) {
        // Furniture / bars specials deferred
        await kick_ouch(x, y);
        return true;
    }
    if (typ === STAIRS || typ === LADDER || IS_STWALL(typ)) {
        // Down ladder/stairs → empty-space kick; solid wall → ouch
        if (!IS_STWALL(typ) && loc.ladder === LA_DOWN) {
            await kick_dumb(x, y);
            return true;
        }
        await kick_ouch(x, y);
        return true;
    }
    void avrg_attrib;
    await kick_dumb(x, y);
    return true;
}

/**
 * C ref: dokick.c dokick — #kick (Ctrl-D).
 * Returns true if the action consumes a turn (ECMD_TIME).
 */
export async function dokick() {
    const u = game.u || (game.u = {});
    let no_kick = false;

    // Poly / steed / trap / boulder no_kick branches deferred beyond
    // encumbrance (common) and wounded-legs message-only path.
    if ((u.utrap | 0) !== 0) {
        no_kick = true;
        await pline("There's not enough room to kick down here.");
    } else if (near_capacity() > SLT_ENCUMBER) {
        await pline('Your load is too heavy to balance yourself for a kick.');
        no_kick = true;
    }

    if (no_kick) {
        // C: display_nhwindow(WIN_MESSAGE, TRUE) — --More-- ownership deferred
        return false;
    }

    if (!(await getdir(null))) return false;
    if (!u.dx && !u.dy) return false;

    const x = (u.ux || 0) + (u.dx || 0);
    const y = (u.uy || 0) + (u.dy || 0);
    // C ref: dokick.c — gk.kickedloc set before kick resolution; pets avoid it
    game.kickedloc = { x, y };

    const avrg_attrib = Math.trunc(
        (acurr(A_STR) + acurr(A_DEX) + acurr(A_CON)) / 3,
    );

    // Swallow / pit / levitation brace paths deferred

    const mtmp = isok(x, y) ? mon_at(x, y) : null;
    if (mtmp) {
        // maybe_kick_monster / kick_monster deferred
        await kick_ouch(x, y);
        return true;
    }

    // wake_nearby(FALSE) / u_wipe_engr(2) — no RNG when no engraving;
    // wake/engraving side effects deferred

    if (!isok(x, y)) {
        await kick_ouch(x, y);
        return true;
    }

    const loc = game.level?.at(x, y);
    if (!loc) {
        await kick_dumb(x, y);
        return true;
    }

    if ((IS_POOL(loc.typ) || loc.typ === LAVAWALL) !== !!(u.uinwater)) {
        await pline(`You splash some ${IS_POOL(loc.typ) ? 'water' : 'lava'} around.`);
        return true;
    }

    // OBJ_AT — kick_object body deferred
    if (objects_at(x, y)) {
        await kick_ouch(x, y);
        return true;
    }

    if (IS_DOOR(loc.typ)) {
        await kick_door(x, y, avrg_attrib);
        return true;
    }
    await kick_nondoor(x, y, avrg_attrib);
    return true;
}
