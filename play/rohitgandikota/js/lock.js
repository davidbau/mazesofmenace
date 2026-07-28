// lock.js — locks, doors and the commands that operate on them.
// C ref: src/lock.c
//
// doopen_indir() is the reason this file exists now: it is the only draw on the
// 'o' command's path, an rnl(20) tested against the average of Strength,
// Dexterity and Constitution, and a session that opens a door runs one call
// short of C without it.

import { game } from './gstate.js';
import { pline_xy } from './pline.js';
import { rnl } from './rng.js';
import { A_STR, A_DEX, A_CON, D_CLOSED, D_LOCKED, D_NODOOR, D_BROKEN, D_ISOPEN, D_TRAPPED, IS_DOOR, ECMD_OK, ECMD_TIME } from './const.js';
import { newsym } from './display.js';
import { exercise, acurrstr, ACURR } from './attrib.js';
import { get_adjacent_loc } from './cmd.js';
import { m_at } from './mon.js';
import { is_door_mappear } from './monst.js';
import { canspotmon } from './display.js';

import { You_cant, You, pline_The } from './pline.js';
import { getdir } from './cmd.js';
import { ECMD_CANCEL, TT_PIT, isok, M_AP_TYPE, M_AP_FURNITURE, M_AP_OBJECT } from './const.js';
import { Monnam } from './do_name.js';
import { pline, canseemon } from './display.js';
/* is_drawbridge_wall — drawbridges are not generated yet */
const is_drawbridge_wall = (x, y) => -1;

function note_unported_lock(what) {
    (game.unported ||= new Set()).add(what);
}

// include/mondata.h verysmall()
function verysmall(ptr) {
    return ptr.msize < 1; /* MZ_SMALL */
}

// src/lock.c doopen_indir() — open the door in the chosen direction.
//
// Only the branch that reaches a known-CLOSED door draws. Everything above it
// is messages and refusals, which cost no PRNG; the draw is rnl(20) against
// (Str + Dex + Con) / 3, so a wrong attribute makes the door open when C says
// it resists without changing the call count.
export async function doopen_indir(x, y) {
    const res = ECMD_OK;
    const cc = { x: 0, y: 0 };

    if (verysmall(game.mons[game.u.umonnum])) {
        /* "You're too small to pull the door open." */
        return res;
    }

    if (x > 0 && y >= 0) {
        cc.x = x;
        cc.y = y;
    } else if (!await get_adjacent_loc(null, null, game.u.ux, game.u.uy, cc)) {
        return ECMD_OK;
    }

    const door = game.level.at(cc.x, cc.y);
    if (!door || !IS_DOOR(door.typ))
        return res;

    if (!(door.doormask & D_CLOSED))
        return res; /* broken / doorless / already open / locked messages */

    /* door is known to be CLOSED */
    if (rnl(20) < Math.trunc((acurrstr() + ACURR(A_DEX) + ACURR(A_CON)) / 3)) {
        await pline_xy(cc.x, cc.y, 'The door opens.');
        if (door.doormask & D_TRAPPED) {
            note_unported_lock('doopen_indir:b_trapped');
            door.doormask = D_NODOOR;
        } else {
            door.doormask = D_ISOPEN;
        }
        newsym(cc.x, cc.y); /* feel_newsym: the hero knows she opened it */
    } else {
        exercise(A_STR, true);
        await pline_xy(cc.x, cc.y, 'The door resists!');
    }

    return ECMD_TIME;
}

// src/lock.c doopen()
export async function doopen() {
    return doopen_indir(0, 0);
}

// src/lock.c:759 stumble_on_door_mimic() — walking a command at a mimicking
// door reveals it. seemimic and the mimic-attack followup are in js/mon.js;
// the attack (stumble_onto_mimic) is recorded.
function stumble_on_door_mimic(x, y) {
    const mtmp = m_at(x, y);
    if (mtmp && is_door_mappear(mtmp)) {
        note_unported('doclose:stumble_onto_mimic');
        return true;
    }
    return false;
}

// src/lock.c:926 obstructed() — is something standing or lying on the door
// square?
async function obstructed(x, y, quietly) {
    const mtmp = m_at(x, y);

    if (mtmp && M_AP_TYPE(mtmp) !== M_AP_FURNITURE) {
        if (M_AP_TYPE(mtmp) === M_AP_OBJECT) {
            if (!quietly)
                await pline("Something's in the way.");
            return true;
        }
        if (!quietly) {
            /* Some_Monnam: Monnam, or Someone/Something when unspottable;
               the tail arm needs long worms, recorded via the same name */
            await pline(`${canspotmon(mtmp) ? Monnam(mtmp) : "Something"} blocks the way!`);
        }
        if (!canspotmon(mtmp))
            note_unported('obstructed:map_invisible');
        return true;
    }
    if ((game.level?.objects || []).some(o => o.ox === x && o.oy === y)) {
        if (!quietly)
            await pline("Something's in the way.");
        return true;
    }
    return false;
}

// src/lock.c:957 doclose() — the 'c' command: try to close a door.
export async function doclose() {
    let res = ECMD_OK;

    /* nohands(youmonst.data) cannot fire un-polymorphed */
    if (game.u.utrap && game.u.utraptype === TT_PIT) {
        await You_cant("reach over the edge of the pit.");
        return ECMD_OK;
    }

    if (!await getdir(null))
        return ECMD_CANCEL;

    const x = game.u.ux + game.u.dx;
    const y = game.u.uy + game.u.dy;
    if (x === game.u.ux && y === game.u.uy) {
        await You("are in the way!");
        return ECMD_TIME;
    }

    let nodoor = !isok(x, y);

    if (!nodoor && stumble_on_door_mimic(x, y))
        return ECMD_TIME;

    /* Confusion/Stunned would set res = ECMD_TIME; both unreachable yet.
       The Blind feel_location arm is recorded. */
    if (game.u?.ublind)
        note_unported('doclose:blind_feel');

    const door = nodoor ? null : game.level.at(x, y);
    /* drawbridges are not generated yet; the portcullis arms are recorded
       when a drawbridge tile is ever seen */
    if (nodoor || !IS_DOOR(door.typ)) {
        await You(`${game.u?.ublind ? "feel" : "see"} no door there.`);
        return res;
    }

    if (door.doormask === D_NODOOR) {
        await pline("This doorway has no door.");
        return res;
    } else if (await obstructed(x, y, false)) {
        return res;
    } else if (door.doormask === D_BROKEN) {
        await pline("This door is broken.");
        return res;
    } else if (door.doormask & (D_CLOSED | D_LOCKED)) {
        await pline("This door is already closed.");
        return res;
    }

    if (door.doormask === D_ISOPEN) {
        /* verysmall(youmonst.data) cannot fire un-polymorphed */
        if (game.u.usteed
            || rn2(25) < (acurrstr() + ACURR(A_DEX) + ACURR(A_CON)) / 3) {
            await pline_The("door closes.");
            door.doormask = D_CLOSED;
            newsym(x, y); /* feel_newsym: the hero knows she closed it */
            note_unported('doclose:block_point'); /* vision shadow map absent */
        } else {
            exercise(A_STR, true);
            await pline_The("door resists!");
        }
    }

    return ECMD_TIME;
}

/* src/lock.c:352 — pick_lock result codes. */
const PICKLOCK_LEARNED_SOMETHING = -1;  /* time passes */
const PICKLOCK_DID_NOTHING = 0;         /* no time passes */
const PICKLOCK_DID_SOMETHING = 1;

// src/lock.c:358 pick_lock() — apply a key, lock pick or credit card.
//
// The reachable slice is the door arms: no lock on this terrain, "This
// doorway has no door.", "You cannot lock an open door.", "This door is
// broken.", each of which teaches something and so takes the turn. The
// container arm, the resume-an-interrupted-attempt arm and the real picking
// occupation (its ynq prompt and chance rolls) are recorded when reached.
export async function pick_lock(pick, rx, ry, container) {
    const picktyp = pick.otyp;
    const cc = { x: 0, y: 0 };

    if (game.xlock?.usedtime && picktyp === game.xlock?.picktyp) {
        note_unported_lock('pick_lock:resume');
        return PICKLOCK_LEARNED_SOMETHING;
    }

    if (!await get_adjacent_loc(null, 'Invalid location!',
                                game.u.ux, game.u.uy, cc))
        return PICKLOCK_DID_NOTHING;

    if (cc.x === game.u.ux && cc.y === game.u.uy) {
        /* pick lock on a container (or complain about the lack of one) */
        note_unported_lock('pick_lock:container');
        return PICKLOCK_DID_NOTHING;
    }

    const mtmp = m_at(cc.x, cc.y);
    if (mtmp && canseemon(mtmp)) {
        note_unported_lock('pick_lock:monster_in_the_way');
        return PICKLOCK_LEARNED_SOMETHING;
    }

    const door = game.level?.at(cc.x, cc.y);
    if (!door || !IS_DOOR(door.typ)) {
        await You(`see no ${is_drawbridge_wall(cc.x, cc.y) >= 0
                            ? 'lock on the drawbridge' : 'door there'}.`);
        return PICKLOCK_DID_NOTHING;
    }
    switch (door.doormask) {
    case D_NODOOR:
        await pline('This doorway has no door.');
        return PICKLOCK_LEARNED_SOMETHING;
    case D_ISOPEN:
        await You('cannot lock an open door.');
        return PICKLOCK_LEARNED_SOMETHING;
    case D_BROKEN:
        await pline('This door is broken.');
        return PICKLOCK_LEARNED_SOMETHING;
    default:
        /* the Unlock/Lock ynq, the chance table and the picklock
           occupation are the real picking machinery */
        note_unported_lock('pick_lock:pick_occupation');
        return PICKLOCK_DID_NOTHING;
    }
}
