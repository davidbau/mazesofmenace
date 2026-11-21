// lock.js -- doors and locks (C ref: lock.c).
//
// Ported so far: doopen_indir() for a known door location (the autoopen
// path from hack.c test_move()) with its autounlock dispatch, autokey(),
// stumble_on_door_mimic(), pick_lock() for doors (the autounlock and
// #apply paths), the picklock() occupation, lock_action(), reset_pick(),
// maybe_reset_pick(), picking_lock() and picking_at(). Not ported yet:
// picking a container's lock, the #open direction prompt, #close, #force,
// the autounlock untrap/kick actions and door traps.

import { game } from './gstate.js';
import { rn2, rnl } from './rng.js';
import { pline, newsym, You, You_cant, pline_The, canseemon } from './display.js';
import { tty_yn_function } from './wintty.js';
import { get_adjacent_loc } from './cmd.js';
import { container_at, doloot } from './pickup.js';
import { set_occupation } from './allmain.js';
import { mon_nam } from './do_name.js';
import { doname, yname } from './objnam.js';
import { can_reach_floor } from './engrave.js';
import { mons, PM_ORACLE, PM_ROGUE } from './monsters.js';
import { CHEST } from './objects.js';
import { D_LOCKED, M_AP_OBJECT } from './const.js';
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

/* C ref: decl.h struct xlock_s gx.xlock */
function xlock() {
    if (!game.xlock)
        game.xlock = { door: null, box: null, picktyp: 0, chance: 0,
                       usedtime: 0, magic_key: false };
    return game.xlock;
}

// C ref: lock.c picking_lock()
export function picking_lock(cc) {
    const u = game.u;
    if (game.occupation === picklock) {
        cc.x = u.ux + u.dx;
        cc.y = u.uy + u.dy;
        return true;
    } else {
        cc.x = cc.y = 0;
        return false;
    }
}

// C ref: lock.c picking_at()
export function picking_at(x, y) {
    return (game.occupation === picklock
            && xlock().door === game.level.at(x, y));
}

// C ref: lock.c lock_action() -- produce an occupation string
// appropriate for the current activity
function lock_action() {
    /* "unlocking"+2 == "locking" */
    const actions = [
        "unlocking the door",   /* [0] */
        "unlocking the chest",  /* [1] */
        "unlocking the box",    /* [2] */
        "picking the lock"      /* [3] */
    ];
    const xl = xlock();

    /* if the target is currently unlocked, we're trying to lock it now */
    if (xl.door && !(xl.door.doormask & D_LOCKED))
        return actions[0].slice(2); /* "locking the door" */
    else if (xl.box && !xl.box.olocked)
        return xl.box.otyp === CHEST ? actions[1].slice(2) : actions[2].slice(2);
    /* otherwise we're trying to unlock it */
    else if (xl.picktyp === LOCK_PICK)
        return actions[3]; /* "picking the lock" */
    else if (xl.picktyp === CREDIT_CARD)
        return actions[3]; /* same as lock_pick */
    else if (xl.door)
        return actions[0]; /* "unlocking the door" */
    else if (xl.box)
        return xl.box.otyp === CHEST ? actions[1] : actions[2];
    else
        return actions[3];
}

// C ref: lock.c picklock() -- try to open/close a lock (occupation
// callback)
async function picklock() {
    const u = game.u;
    const xl = xlock();

    if (xl.box) {
        if (xl.box.where !== 'OBJ_FLOOR'
            || xl.box.ox !== u.ux || xl.box.oy !== u.uy) {
            return (xl.usedtime = 0); /* you or it moved */
        }
    } else { /* door */
        if (xl.door !== game.level.at(u.ux + u.dx, u.uy + u.dy)) {
            return (xl.usedtime = 0); /* you moved */
        }
        switch (xl.door.doormask) {
        case D_NODOOR:
            await pline("This doorway has no door.");
            return (xl.usedtime = 0);
        case D_ISOPEN:
            await You("cannot lock an open door.");
            return (xl.usedtime = 0);
        case D_BROKEN:
            await pline("This door is broken.");
            return (xl.usedtime = 0);
        }
    }

    if (xl.usedtime++ >= 50 || nohands(game.youmonst.data)) {
        await You(`give up your attempt at ${lock_action()}.`);
        exercise(A_DEX, true); /* even if you don't succeed */
        return (xl.usedtime = 0);
    }

    if (rn2(100) >= xl.chance)
        return 1; /* still busy */

    /* using the Master Key of Thievery finds traps if its bless/curse
       state is adequate (non-cursed for rogues, blessed for others;
       checked when setting up 'xlock') */
    if ((!xl.door ? xl.box.otrapped : (xl.door.doormask & D_TRAPPED) !== 0)
        && xl.magic_key)
        throw new Error('picklock(): magic key trap disarming not ported yet');

    await You(`succeed in ${lock_action()}.`);
    if (xl.door) {
        if (xl.door.doormask & D_TRAPPED) {
            throw new Error('picklock(): b_trapped() not ported yet');
        } else if (xl.door.doormask & D_LOCKED)
            xl.door.doormask = D_CLOSED;
        else
            xl.door.doormask = D_LOCKED;
    } else {
        xl.box.olocked = !xl.box.olocked;
        xl.box.lknown = 1;
        if (xl.box.otrapped)
            throw new Error('picklock(): chest_trap() not ported yet');
    }
    exercise(A_DEX, true);
    return (xl.usedtime = 0);
}

// C ref: lock.c reset_pick()
export function reset_pick() {
    const xl = xlock();
    xl.usedtime = xl.chance = xl.picktyp = 0;
    xl.magic_key = false;
    xl.door = null;
    xl.box = null;
}

// C ref: lock.c maybe_reset_pick() -- level change or object deletion;
// context may no longer be valid
export function maybe_reset_pick(container) {
    const xl = xlock();
    if (container ? (container === xl.box)
                  : (!xl.box || !carried(xl.box)))
        reset_pick();
}

function carried(obj) { return obj.where === 'OBJ_INVENT'; }
function nohands(ptr) { return (ptr.mflags1 & M1_NOHANDS) !== 0; }

// C ref: artifact.c is_magic_key() -- only the Master Key of Thievery
function is_magic_key(mon, obj) {
    if (obj.oartifact)
        throw new Error('is_magic_key(): artifacts not ported yet');
    return false;
}

/* C ref: lock.c PICKLOCK_* */
const PICKLOCK_LEARNED_SOMETHING = -1; /* time passes */
const PICKLOCK_DID_NOTHING = 0;        /* no time passes */
const PICKLOCK_DID_SOMETHING = 1;

// C ref: lock.c pick_lock() -- player is applying a key, lock pick, or
// credit card; rx,ry are the door/container coordinates for autounlock
// (doesn't prompt for direction if these are set)
export async function pick_lock(pick, rx, ry, container) {
    const u = game.u;
    const xl = xlock();
    let picktyp, c, ch;
    const cc = { x: 0, y: 0 };
    const autounlock = (rx !== 0 || container != null);

    /* 'pick' might be Null [called by do_loot_cont() for AUTOUNLOCK_UNTRAP] */
    if (!pick)
        throw new Error('pick_lock(): dummypick (AUTOUNLOCK_UNTRAP) not ported yet');
    picktyp = pick.otyp;

    /* check whether we're resuming an interrupted previous attempt */
    if (xl.usedtime && picktyp === xl.picktyp) {
        if (nohands(game.youmonst.data)) {
            let what = (picktyp === LOCK_PICK) ? "pick" : "key";

            if (picktyp === CREDIT_CARD)
                what = "card";
            await pline(`Unfortunately, you can no longer hold the ${what}.`);
            reset_pick();
            return PICKLOCK_LEARNED_SOMETHING;
        } else if (u.uswallow || (xl.box && !can_reach_floor(true))) {
            await pline("Unfortunately, you can no longer reach the lock.");
            reset_pick();
            return PICKLOCK_LEARNED_SOMETHING;
        } else {
            const action = lock_action();

            await You(`resume your attempt at ${action}.`);
            xl.magic_key = is_magic_key(game.youmonst, pick);
            set_occupation(picklock, action, 0);
            return PICKLOCK_DID_SOMETHING;
        }
    }

    if (nohands(game.youmonst.data)) {
        await You_cant(`hold ${doname(pick)} -- you have no hands!`);
        return PICKLOCK_DID_NOTHING;
    } else if (u.uswallow) {
        throw new Error('pick_lock(): swallowed not ported yet');
    }

    if (picktyp !== SKELETON_KEY && picktyp !== LOCK_PICK
        && picktyp !== CREDIT_CARD) {
        impossible(`picking lock with object ${picktyp}?`);
        return PICKLOCK_DID_NOTHING;
    }
    ch = 0; /* lint suppression */

    if (rx !== 0) { /* autounlock; caller has provided coordinates */
        cc.x = rx;
        cc.y = ry;
    } else if (!(await get_adjacent_loc(null, "Invalid location!",
                                        u.ux, u.uy, cc))) {
        return PICKLOCK_DID_NOTHING;
    }

    if (u.ux === cc.x && u.uy === cc.y) { /* pick lock on a container */
        throw new Error('pick_lock(): picking the lock of a container not ported yet');

    /* not the hero's location; pick the lock in an adjacent door */
    } else {
        if (u.utrap && u.utraptype === TT_PIT) {
            await You_cant("reach over the edge of the pit.");
            /* this used to return PICKLOCK_LEARNED_SOMETHING but the
               #open command doesn't use a turn for similar situation */
            return PICKLOCK_DID_NOTHING;
        }

        const door = game.level.at(cc.x, cc.y);
        const mtmp = m_at(cc.x, cc.y);
        if (mtmp && canseemon(mtmp) && mtmp.m_ap_type !== M_AP_FURNITURE
            && mtmp.m_ap_type !== M_AP_OBJECT) {
            if (picktyp === CREDIT_CARD
                && (mtmp.isshk || mtmp.data === mons[PM_ORACLE]))
                throw new Error('pick_lock(): verbalize() not ported yet');
            await pline(`I don't think ${mon_nam(mtmp)} would appreciate that.`);
            return PICKLOCK_LEARNED_SOMETHING;
        } else if (mtmp && is_door_mappear(mtmp)) {
            /* "The door actually was a <mimic>!" */
            throw new Error('pick_lock(): stumble_onto_mimic() not ported yet');
        }
        if (!IS_DOOR(door.typ))
            throw new Error('pick_lock(): picking a non-door not ported yet');
        switch (door.doormask) {
        case D_NODOOR:
            await pline("This doorway has no door.");
            return PICKLOCK_LEARNED_SOMETHING;
        case D_ISOPEN:
            await You("cannot lock an open door.");
            return PICKLOCK_LEARNED_SOMETHING;
        case D_BROKEN:
            await pline("This door is broken.");
            return PICKLOCK_LEARNED_SOMETHING;
        default: {
            const autounlock_flags = game.flags.autounlock ?? AUTOUNLOCK_APPLY_KEY;
            if ((autounlock_flags & AUTOUNLOCK_UNTRAP) !== 0)
                throw new Error('pick_lock(): could_untrap() not ported yet');
            /* credit cards are only good for unlocking */
            if (picktyp === CREDIT_CARD && !(door.doormask & D_LOCKED)) {
                await You_cant("lock a door with a credit card.");
                return PICKLOCK_LEARNED_SOMETHING;
            }

            const qbuf = `${(door.doormask & D_LOCKED) ? "Unlock" : "Lock"} it`
                + `${autounlock ? " with " : ""}${autounlock ? yname(pick) : ""}?`;
            c = await ynq(qbuf);
            if (c !== 'y')
                return PICKLOCK_DID_NOTHING;

            /* note: for !autounlock, 'apply' already did touch check */
            if (autounlock && pick.oartifact)
                throw new Error('pick_lock(): touch_artifact() not ported yet');

            switch (picktyp) {
            case CREDIT_CARD:
                ch = 2 * ACURR(A_DEX) + 20 * (game.urole.mnum === PM_ROGUE ? 1 : 0);
                break;
            case LOCK_PICK:
                ch = 3 * ACURR(A_DEX) + 30 * (game.urole.mnum === PM_ROGUE ? 1 : 0);
                break;
            case SKELETON_KEY:
                ch = 70 + ACURR(A_DEX);
                break;
            default:
                ch = 0;
            }
            xl.door = door;
            xl.box = null;
        }
        }
    }
    game.context.move = 0;
    xl.chance = ch;
    xl.picktyp = picktyp;
    xl.magic_key = is_magic_key(game.youmonst, pick);
    xl.usedtime = 0;
    set_occupation(picklock, lock_action(), 0);
    return PICKLOCK_DID_SOMETHING;
}

/* C ref: hack.h ynq() */
async function ynq(query) {
    let c = await tty_yn_function(query, "ynq", 'q');
    if (typeof c === 'number')
        c = String.fromCharCode(c);
    return c;
}

// C's impossible() (pline.c) is not ported yet.
function impossible(msg) { console.error(`impossible: ${msg}`); }

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

// C ref: lock.c doopen() -- try to open a door
export async function doopen() {
    return await doopen_indir(0, 0);
}

// C ref: lock.c doopen_indir()
export async function doopen_indir(x, y) {
    const u = game.u;
    const cc = { x: 0, y: 0 };
    let res = ECMD_OK;

    if ((game.youmonst.data.mflags1 & M1_NOHANDS) !== 0) {
        await You_cant("open anything -- you have no hands!");
        return ECMD_OK;
    }

    let dirprompt = null; /* have get_adjacent_loc() -> getdir() use default */
    if (u.utrap && u.utraptype === TT_PIT && container_at(u.ux, u.uy, false))
        dirprompt = "Open where? [.>]";

    if (x > 0 && y >= 0) {
        /* nonzero <x,y> is used when hero in amorphous form tries to
           flow under a closed door at <x,y>; the test here was using
           'y > 0' but that would give incorrect results if doors are
           ever allowed to be placed on the top row of the map */
        cc.x = x;
        cc.y = y;
    } else if (!(await get_adjacent_loc(dirprompt, null, u.ux, u.uy, cc))) {
        return ECMD_OK;
    }

    /* open at yourself/up/down: switch to loot unless there is a closed
       door here (possible with Passes_walls) and direction isn't 'down' */
    if (u.ux === cc.x && u.uy === cc.y && (u.dz > 0 || !closed_door(u.ux, u.uy)))
        return await doloot();

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
                res = (await pick_lock(unlocktool, cc.x, cc.y, null))
                      ? ECMD_TIME : ECMD_OK;
            } else if ((autounlock & AUTOUNLOCK_KICK) !== 0
                       && !u.usteed /* kicking is different when mounted */
                       && (await ynq("Kick it?")) === 'y') {
                /* cmdq_add_ec(CQ_CANNED, dokick); cmdq_add_dir(...) */
                throw new Error('doopen_indir(): autounlock kick (dokick()) not ported yet');
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
