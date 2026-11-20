// lock.js -- doors and locks (C ref: lock.c).
//
// Ported so far: doopen_indir() for a known door location (the autoopen
// path from hack.c test_move()), autokey(), stumble_on_door_mimic().
// Picking locks (pick_lock()), the #open direction prompt, #close,
// #force and door traps are not ported yet.

import { game } from './gstate.js';
import { rnl } from './rng.js';
import { pline, newsym, You, You_cant, pline_The } from './display.js';
import { recalc_block_point } from './vision.js';
import { ACURR, acurrstr, exercise } from './attrib.js';
import { m_at, closed_door } from './makemon.js';
import { A_STR, A_DEX, A_CON, IS_DOOR, D_CLOSED, D_BROKEN, D_NODOOR,
         D_ISOPEN, D_TRAPPED, DRAWBRIDGE_UP, DRAWBRIDGE_DOWN, M_AP_FURNITURE,
         TT_PIT, CONFUSION, STUNNED, PROT_FROM_SHAPE_CHANGERS } from './const.js';
import { SKELETON_KEY, LOCK_PICK, CREDIT_CARD } from './objects.js';
import { M1_NOHANDS, MZ_SMALL } from './monsters.js';

/* C ref: flag.h AUTOUNLOCK_* */
export const AUTOUNLOCK_UNTRAP = 1;
export const AUTOUNLOCK_APPLY_KEY = 2;
export const AUTOUNLOCK_KICK = 4;
export const AUTOUNLOCK_FORCE = 8;

/* C ref: func_tab.h ECMD_OK, ECMD_TIME */
const ECMD_OK = 0x00;
const ECMD_TIME = 0x01;

/* C ref: defsym.h S_vcdoor, S_hcdoor (pchar indices) */
const S_vcdoor = 15, S_hcdoor = 16;

function uhave(prop) {
    const p = game.u?.uprops?.[prop];
    return !!(p && (p.intrinsic || p.extrinsic));
}

// C ref: monst.h is_door_mappear()
function is_door_mappear(mon) {
    return mon.m_ap_type === M_AP_FURNITURE
           && (mon.mappearance === S_hcdoor || mon.mappearance === S_vcdoor);
}

// C ref: lock.c autokey() -- the unlocking tool autounlock would apply
/* opening: True: key, pick, or card; False: key or pick */
export function autokey(opening) {
    let key = null, pick = null, card = null;

    for (let o = game.invent; o; o = o.nobj) {
        /* any_quest_artifact(o) && !is_quest_artifact(o): other roles'
           quest artifacts (Rogue's Key, Tourist's Credit Card) aren't
           in a starting inventory */
        if (o.oartifact)
            throw new Error('autokey(): quest artifact unlocking tools not ported yet');
        switch (o.otyp) {
        case SKELETON_KEY:
            /* || is_magic_key(&youmonst, o): only artifact keys */
            if (!key)
                key = o;
            break;
        case LOCK_PICK:
            if (!pick)
                pick = o;
            break;
        case CREDIT_CARD:
            if (!card)
                card = o;
            break;
        default:
            break;
        }
    }
    if (!opening)
        card = null;
    return key ? key : pick ? pick : card ? card : null;
}

// C ref: lock.c stumble_on_door_mimic()
function stumble_on_door_mimic(x, y) {
    const mtmp = m_at(x, y);

    if (mtmp && is_door_mappear(mtmp) && !uhave(PROT_FROM_SHAPE_CHANGERS))
        throw new Error('stumble_on_door_mimic(): stumble_onto_mimic() not ported yet');
    return false;
}

// C ref: lock.c doopen_indir() -- try to open a door at <x,y> (the #open
// direction prompt, x == 0, isn't ported yet)
export async function doopen_indir(x, y) {
    const u = game.u;
    const cc = { x: 0, y: 0 };
    let res = ECMD_OK;

    if ((game.youmonst.data.mflags1 & M1_NOHANDS) !== 0) {
        await You_cant("open anything -- you have no hands!");
        return ECMD_OK;
    }

    /* dirprompt "Open where? [.>]" for a hero in a pit over a container:
       only used by get_adjacent_loc() */
    if (x > 0 && y >= 0) {
        cc.x = x;
        cc.y = y;
    } else {
        throw new Error('doopen_indir(): get_adjacent_loc() not ported yet');
    }

    /* open at yourself/up/down: switch to loot unless there is a closed
       door here (possible with Passes_walls) and direction isn't 'down' */
    if (u.ux === cc.x && u.uy === cc.y && (u.dz > 0 || !closed_door(u.ux, u.uy)))
        throw new Error('doopen_indir(): doloot() not ported yet');

    if (u.utrap && u.utraptype === TT_PIT) {
        await You_cant("reach over the edge of the pit.");
        return ECMD_OK;
    }

    if (stumble_on_door_mimic(cc.x, cc.y))
        return ECMD_TIME;

    /* when choosing a direction is impaired, use a turn
       regardless of whether a door is successfully targeted */
    if (uhave(CONFUSION) || uhave(STUNNED))
        res = ECMD_TIME;

    const door = game.level.at(cc.x, cc.y);
    /* is_drawbridge_wall(cc.x, cc.y) >= 0: drawbridges aren't ported */
    const portcullis = false;
    /* oldglyph/update_mapseen_for(): newsym() redraws what the hero
       already sees next to her, so neither the glyph nor lastseentyp
       changes ("learned something") for a door in view */
    newsym(cc.x, cc.y);

    if (portcullis || !IS_DOOR(door.typ)) {
        /* closed portcullis or spot that opened bridge would span */
        if (door.typ === DRAWBRIDGE_UP || door.typ === DRAWBRIDGE_DOWN)
            throw new Error('doopen_indir(): drawbridges not ported yet');
        /* container_at(cc.x, cc.y, TRUE): "Seems like something lootable" */
        await You("see no door there.");
        return res;
    }

    if (!(door.doormask & D_CLOSED)) {
        let mesg;
        let locked = false;

        switch (door.doormask) {
        case D_BROKEN:
            mesg = " is broken";
            break;
        case D_NODOOR:
            mesg = "way has no door";
            break;
        case D_ISOPEN:
            mesg = " is already open";
            break;
        default:
            mesg = " is locked";
            locked = true;
            break;
        }
        await pline(`This door${mesg}.`); /* set_msg_xy(cc.x, cc.y) */
        const autounlock = game.flags.autounlock ?? AUTOUNLOCK_APPLY_KEY;
        if (locked && autounlock) {
            let unlocktool;

            u.dz = 0; /* should already be 0 since hero moved toward door */
            if ((autounlock & AUTOUNLOCK_APPLY_KEY) !== 0
                && (unlocktool = autokey(true)) != null) {
                throw new Error('doopen_indir(): pick_lock() not ported yet');
            } else if ((autounlock & AUTOUNLOCK_KICK) !== 0
                       && !u.usteed) {
                throw new Error('doopen_indir(): autounlock kick not ported yet');
            }
        }
        return res;
    }

    if (game.youmonst.data.msize < MZ_SMALL) { /* verysmall() */
        await pline("You're too small to pull the door open.");
        return res;
    }

    /* door is known to be CLOSED */
    if (rnl(20) < Math.trunc((acurrstr() + ACURR(A_DEX) + ACURR(A_CON)) / 3)) {
        await pline_The("door opens."); /* set_msg_xy() */
        if (door.doormask & D_TRAPPED) {
            throw new Error('doopen_indir(): b_trapped() not ported yet');
        } else
            door.doormask = D_ISOPEN;
        newsym(cc.x, cc.y); /* feel_newsym(): the hero knows she opened it */
        recalc_block_point(cc.x, cc.y); /* vision: new see through there */
    } else {
        exercise(A_STR, true);
        await pline_The("door resists!"); /* set_msg_xy() */
    }

    return ECMD_TIME;
}
