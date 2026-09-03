// lock.js — locks, doors and the commands that operate on them.
// C ref: src/lock.c
//
// doopen_indir() is the reason this file exists now: it is the only draw on the
// 'o' command's path, an rnl(20) tested against the average of Strength,
// Dexterity and Constitution, and a session that opens a door runs one call
// short of C without it.

import { stop_occupation } from './allmain.js';
import { add_damage } from './shk.js';
import { in_rooms } from './hack.js';
import { wake_nearto } from './mon.js';
import { distu } from './hacklib.js';
import { Deaf } from './youprop.js';
import { Unaware } from './youprop.js';
import { mb_trapped } from './monmove.js';
import { t_at } from './mon.js';
import { You_hear } from './pline.js';
import { vision_recalc } from './vision.js';
import { cansee } from './vision.js';
import { Is_rogue_level } from './const.js';
import { SHOPBASE } from './const.js';
import { DOOR } from './const.js';
import { SDOOR } from './const.js';
import { OBJ_INVENT } from './const.js';
import { Role_if } from './attrib.js';
import { game } from './gstate.js';
import { pline_xy } from './pline.js';
import { rnl } from './rng.js';
import { A_STR, A_DEX, A_CON, D_CLOSED, D_LOCKED, D_NODOOR, D_BROKEN, D_ISOPEN, D_TRAPPED, IS_DOOR, ECMD_OK, ECMD_TIME } from './const.js';
import { newsym } from './display.js';
import { exercise, acurrstr, ACURR } from './attrib.js';
import { get_adjacent_loc, closed_door } from './cmd.js';
import { container_at, doloot } from './pickup.js';
import { is_db_wall } from './dbridge.js';
import { update_mapseen_for } from './dungeon.js';
import { DRAWBRIDGE_UP, DRAWBRIDGE_DOWN, u_at } from './const.js';
import { Blind } from './youprop.js';
import { m_at } from './mon.js';
import { is_door_mappear } from './monst.js';
import { nohands } from './mondata.js';
import { canspotmon } from './display.js';

import { You_cant, You, pline_The } from './pline.js';
import { getdir } from './cmd.js';
import { ECMD_CANCEL, TT_PIT, isok, M_AP_TYPE, M_AP_FURNITURE, M_AP_OBJECT } from './const.js';
import { Monnam, mon_nam } from './do_name.js';
import { Levitation } from './youprop.js';
import { AUTOUNLOCK_UNTRAP, AUTOUNLOCK_APPLY_KEY, AUTOUNLOCK_KICK,
         OBJ_FLOOR } from './const.js';
import { unblock_point } from './vision.js';
import { PMNAMES } from './monst_data.js';
import { pline, canseemon, feel_location } from './display.js';
import { rn2 } from './rng.js';
import { OCLASSES, ONAMES } from './objects_data.js';
import { xname, doname, singular, An, the, yname } from './objnam.js';
import { useup, obj_extract_self, stackobj } from './invent.js';
import { place_object } from './mkobj.js';
import { is_blade, is_pick, wake_nearby, delobj, is_pool, is_lava } from './mon.js';
import { can_reach_floor } from './pickup.js';
import { set_occupation } from './allmain.js';
import { obj_resists } from './zap.js';
import { There } from './pline.js';
import { block_point, recalc_block_point } from './vision.js';
import { tty_yn_function } from './tty/topl.js';
import { is_drawbridge_wall } from './dbridge.js';
import { an } from './objnam.js';
import { breathless } from './mondata.js';
import { haseyes } from './mondata.js';
import { bottlename } from './potion.js';
import { potionbreathe } from './potion.js';
import { MATERIALS } from './objects_data.js';
import { costly_alteration } from './shk.js';
import { costly_spot } from './shk.js';
import { shop_keeper } from './shk.js';
import { stolen_value } from './shk.js';
import { COST_BRKLCK } from './const.js';
import { obfree } from './invent.js';
import { currency } from './invent.js';
import { start_corpse_timeout } from './mkobj.js';



























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
    let res = ECMD_OK;
    const cc = { x: 0, y: 0 };

    if (nohands(game.youmonst.data)) {
        await You_cant('open anything -- you have no hands!');
        return ECMD_OK;
    }

    let dirprompt = null; /* have get_adjacent_loc() -> getdir() use default */
    if (game.u.utrap && game.u.utraptype === TT_PIT
        && container_at(game.u.ux, game.u.uy, false))
        dirprompt = 'Open where? [.>]';

    if (x > 0 && y >= 0) {
        /* nonzero <x,y> is used when hero in amorphous form tries to
           flow under a closed door at <x,y>; the test here was using
           'y > 0' but that would give incorrect results if doors are
           ever allowed to be placed on the top row of the map */
        cc.x = x;
        cc.y = y;
    } else if (!await get_adjacent_loc(dirprompt, null, game.u.ux, game.u.uy, cc)) {
        return ECMD_OK;
    }

    /* open at yourself/up/down: switch to loot unless there is a closed
       door here (possible with Passes_walls) and direction isn't 'down' */
    if (u_at(cc.x, cc.y) && (game.u.dz > 0 || !closed_door(game.u.ux, game.u.uy)))
        return await doloot();

    /* this used to be done prior to get_adjacent_loc() but doing so was
       incorrect once open at hero's spot became an alternate way to loot */
    if (game.u.utrap && game.u.utraptype === TT_PIT) {
        await You_cant('reach over the edge of the pit.');
        return ECMD_OK;
    }

    if (await stumble_on_door_mimic(cc.x, cc.y))
        return ECMD_TIME;

    /* when choosing a direction is impaired, use a turn
       regardless of whether a door is successfully targeted */
    if (game.u.uprops?.CONFUSION || game.u.uprops?.STUNNED)
        res = ECMD_TIME;

    const door = game.level.at(cc.x, cc.y);
    const portcullis = (is_drawbridge_wall(cc.x, cc.y) >= 0);
    /* this used to be 'if (Blind)' but using a key skips that so we do too */
    {
        const oldglyph = door.glyph;
        const oldlastseentyp = update_mapseen_for(cc.x, cc.y);

        newsym(cc.x, cc.y);
        if (door.glyph !== oldglyph
            || game.level.at(cc.x, cc.y)?.lastseentyp !== oldlastseentyp)
            res = ECMD_TIME; /* learned something */
    }

    if (portcullis || !IS_DOOR(door.typ)) {
        /* closed portcullis or spot that opened bridge would span */
        if (is_db_wall(cc.x, cc.y) || door.typ === DRAWBRIDGE_UP)
            await There('is no obvious way to open the drawbridge.');
        else if (portcullis || door.typ === DRAWBRIDGE_DOWN)
            await pline_The('drawbridge is already open.');
        else if (container_at(cc.x, cc.y, true))
            await pline(`${Blind() ? 'Feels' : 'Seems'} like something lootable over there.`);
        else
            await You(`${Blind() ? 'feel' : 'see'} no door there.`);
        return res;
    }

    if (!(door.doormask & D_CLOSED)) {
        /* src/lock.c:855-876 — say why the door won't open. */
        let mesg;
        let locked = false;
        switch (door.doormask) {
        case D_BROKEN:
            mesg = ' is broken';
            break;
        case D_NODOOR:
            mesg = 'way has no door';
            break;
        case D_ISOPEN:
            mesg = ' is already open';
            break;
        default:
            mesg = ' is locked';
            locked = true;
            break;
        }
        await pline_xy(cc.x, cc.y, `This door${mesg}.`);
        /* src/lock.c:879 — flags.autounlock defaults to AUTOUNLOCK_APPLY_KEY
           (options.c:7150 via the allopt initval machinery), so a locked
           door tries the best carried key/pick/card automatically */
        const autounlock = game.flags?.autounlock ?? AUTOUNLOCK_APPLY_KEY;
        if (locked && autounlock) {
            game.u.dz = 0; /* should already be 0 since hero moved toward door */
            let unlocktool;
            if ((autounlock & AUTOUNLOCK_APPLY_KEY) !== 0
                && (unlocktool = autokey(true)) != null) {
                res = (await pick_lock(unlocktool, cc.x, cc.y, null))
                      ? ECMD_TIME : ECMD_OK;
            } else if ((autounlock & AUTOUNLOCK_KICK) !== 0
                       && !game.u.usteed) {
                /* "Kick it?" then a canned dokick through the command
                   queue; no recorded rc turns Kick on */
                note_unported_lock('doopen_indir:autounlock_kick');
            }
        }
        return res;
    }

    if (verysmall(game.youmonst.data)) {
        await pline("You're too small to pull the door open.");
        return res;
    }

    /* door is known to be CLOSED */
    if (rnl(20) < Math.trunc((acurrstr() + ACURR(A_DEX) + ACURR(A_CON)) / 3)) {
        await pline_xy(cc.x, cc.y, 'The door opens.');
        if (door.doormask & D_TRAPPED) {
            const { b_trapped } = await import('./trap.js');
            const { FINGER } = await import('./const.js');
            await b_trapped('door', FINGER);
            door.doormask = D_NODOOR;
        } else {
            door.doormask = D_ISOPEN;
        }
        newsym(cc.x, cc.y); /* feel_newsym: the hero knows she opened it */
        recalc_block_point(cc.x, cc.y); /* vision: new see through there */
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
export async function obstructed(x, y, quietly) {
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

    if (nohands(game.youmonst.data)) {
        await You_cant('close anything -- you have no hands!');
        return ECMD_OK;
    }

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
        note_unported_lock('doclose:blind_feel');

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
            block_point(x, y); /* vision:  no longer see there */
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

// src/lock.c:38 lock_action() — occupation string for the current activity.
function lock_action() {
    const xl = game.xlock || {};
    /* "unlocking"+2 == "locking" */
    if (xl.door && !(xl.door.doormask & D_LOCKED))
        return 'locking the door';
    else if (xl.box && !xl.box.olocked)
        return xl.box.otyp === ONAMES.CHEST ? 'locking the chest'
                                            : 'locking the box';
    else if (xl.picktyp === ONAMES.LOCK_PICK)
        return 'picking the lock';
    else if (xl.picktyp === ONAMES.CREDIT_CARD)
        return 'picking the lock';
    else if (xl.door)
        return 'unlocking the door';
    else if (xl.box)
        return xl.box.otyp === ONAMES.CHEST ? 'unlocking the chest'
                                            : 'unlocking the box';
    return 'picking the lock';
}

// src/lock.c:68 picklock() — the per-turn occupation: try to open/close
// the lock the xlock context points at.
export async function picklock() {
    const xl = game.xlock || (game.xlock = {});
    const u = game.u;

    if (xl.box) {
        if (xl.box.where !== OBJ_FLOOR
            || xl.box.ox !== u.ux || xl.box.oy !== u.uy) {
            return (xl.usedtime = 0); /* you or it moved */
        }
    } else { /* door */
        if (xl.door !== game.level.at(u.ux + u.dx, u.uy + u.dy)) {
            return (xl.usedtime = 0); /* you moved */
        }
        switch (xl.door.doormask) {
        case D_NODOOR:
            await pline('This doorway has no door.');
            return (xl.usedtime = 0);
        case D_ISOPEN:
            await You('cannot lock an open door.');
            return (xl.usedtime = 0);
        case D_BROKEN:
            await pline('This door is broken.');
            return (xl.usedtime = 0);
        }
    }

    if (xl.usedtime++ >= 50 /* || nohands: un-polymorphed hero has hands */) {
        await You(`give up your attempt at ${lock_action()}.`);
        exercise(A_DEX, true); /* even if you don't succeed */
        return (xl.usedtime = 0);
    }

    if (rn2(100) >= xl.chance)
        return 1; /* still busy */

    /* the Master Key of Thievery finds traps; no artifacts exist yet so
       xl.magic_key is only ever false, and D_TRAPPED doors/otrapped boxes
       take the b_trapped arms below */
    if ((!xl.door ? xl.box.otrapped : (xl.door.doormask & D_TRAPPED) !== 0)
        && xl.magic_key) {
        note_unported_lock('picklock:magic_key_disarm');
    }

    await You(`succeed in ${lock_action()}.`);
    if (xl.door) {
        if (xl.door.doormask & D_TRAPPED) {
            const { b_trapped } = await import('./trap.js');
            const { FINGER } = await import('./const.js');
            await b_trapped('door', FINGER);
            xl.door.doormask = D_NODOOR;
            unblock_point(u.ux + u.dx, u.uy + u.dy);
            newsym(u.ux + u.dx, u.uy + u.dy);
        } else if (xl.door.doormask & D_LOCKED)
            xl.door.doormask = D_CLOSED;
        else
            xl.door.doormask = D_LOCKED;
    } else {
        xl.box.olocked = xl.box.olocked ? 0 : 1;
        xl.box.lknown = 1;
        if (xl.box.otrapped) {
            const { chest_trap } = await import('./trap.js');
            const { FINGER } = await import('./const.js');
            await chest_trap(xl.box, FINGER, false);
        }
    }
    exercise(A_DEX, true);
    return (xl.usedtime = 0);
}

// src/lock.c:289 autokey() — pick the best unlocking tool in inventory.
// opening TRUE: key, pick, or card; FALSE: key or pick.
export function autokey(opening) {
    /* mundane item or regular artifact or own role's quest artifact */
    let key = null, pick = null, card = null;
    /* other role's quest artifact (Rogue's Key or Tourist's Credit Card):
       no artifacts are generated yet, so o.oartifact is always 0 and the
       akey/apick/acard split never diverges from the plain one */
    for (const o of game.invent || []) {
        switch (o.otyp) {
        case ONAMES.SKELETON_KEY:
            if (!key /* || is_magic_key(): artifact, never yet */)
                key = o;
            break;
        case ONAMES.LOCK_PICK:
            if (!pick)
                pick = o;
            break;
        case ONAMES.CREDIT_CARD:
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
    const autounlock = (rx !== 0 && rx != null) || container != null;

    /* check whether we're resuming an interrupted previous attempt */
    if (game.xlock?.usedtime && picktyp === game.xlock?.picktyp) {
        /* the nohands and uswallow "can no longer" refusals cannot fire
           un-polymorphed and unswallowed */
        const action = lock_action();
        await You(`resume your attempt at ${action}.`);
        game.xlock.magic_key = false;   /* is_magic_key(): no artifacts yet */
        set_occupation(picklock, action, 0);
        return PICKLOCK_DID_SOMETHING;
    }

    if (rx !== 0 && rx != null) { /* autounlock; caller has coordinates */
        cc.x = rx;
        cc.y = ry;
    } else if (!await get_adjacent_loc(null, 'Invalid location!',
                                       game.u.ux, game.u.uy, cc))
        return PICKLOCK_DID_NOTHING;

    if (cc.x === game.u.ux && cc.y === game.u.uy) {
        /* pick lock on a container (or complain about the lack of one) */
        if (game.u.dz < 0 && !autounlock) {
            await There(`isn't any sort of lock up ${
                Levitation() ? 'here' : 'there'}.`);
            return PICKLOCK_LEARNED_SOMETHING;
        } else if (is_lava(game.u.ux, game.u.uy)) {
            await pline(`Doing that would probably melt ${yname(pick)}.`);
            return PICKLOCK_LEARNED_SOMETHING;
        } else if (is_pool(game.u.ux, game.u.uy) && !game.u.uinwater) {
            await pline_The('water has no lock.');
            return PICKLOCK_LEARNED_SOMETHING;
        }

        let count = 0;
        let c = 'n'; /* in case there are no boxes here */
        let ch = 0;
        let box = null;
        for (const otmp of (game.level?.objects || [])
                 .filter(o => o.ox === cc.x && o.oy === cc.y)) {
            /* autounlock on boxes: only the one that was just discovered
               to be locked; don't include any other boxes here */
            if (autounlock && otmp !== container)
                continue;
            if (!Is_box(otmp))
                continue;
            ++count;
            if (!can_reach_floor(true)) {
                await You_cant(`reach ${the(xname(otmp))} from up here.`);
                return PICKLOCK_LEARNED_SOMETHING;
            }
            let it = 0;
            let verb;
            if (otmp.obroken)
                verb = 'fix';
            else if (!otmp.olocked)
                verb = 'lock', it = 1;
            else if (picktyp !== ONAMES.LOCK_PICK)
                verb = 'unlock', it = 1;
            else
                verb = 'pick';

            const au = game.flags?.autounlock ?? AUTOUNLOCK_APPLY_KEY;
            if (autounlock && (au & AUTOUNLOCK_UNTRAP) !== 0) {
                /* could_untrap/untrap on containers is not ported; the
                   default autounlock setting never includes Untrap */
                note_unported_lock('pick_lock:container_untrap');
            }
            if (autounlock && (au & AUTOUNLOCK_APPLY_KEY) !== 0) {
                c = 'q';
                if (pick) {
                    c = await ynq(`Unlock it with ${yname(pick)}?`);
                }
                if (c !== 'y')
                    return PICKLOCK_DID_NOTHING;
            } else {
                /* "There is <a box> here; <verb> <it|its lock>?" */
                otmp.lknown = 1;
                c = await ynq(`There is ${doname(otmp)} here; `
                              + `${verb} ${it ? 'it' : 'its lock'}?`);
                if (c === 'q')
                    return PICKLOCK_DID_NOTHING;
                if (c === 'n')
                    continue; /* try next box */
            }

            if (otmp.obroken) {
                /* You_cant("fix its broken lock with %s.",
                   ansimpleoname(pick)) — ansimpleoname is not in
                   js/objnam.js yet */
                note_unported_lock('pick_lock:fix_broken_lock');
                return PICKLOCK_LEARNED_SOMETHING;
            } else if (picktyp === ONAMES.CREDIT_CARD && !otmp.olocked) {
                /* credit cards are only good for unlocking;
                   simple_typename is not in js/objnam.js yet */
                note_unported_lock('pick_lock:credit_card_lock');
                return PICKLOCK_LEARNED_SOMETHING;
            }
            /* touch_artifact: 'pick' is never an artifact yet */
            switch (picktyp) {
            case ONAMES.CREDIT_CARD:
                ch = ACURR(A_DEX) + 20 * (Role_if_rogue() ? 1 : 0);
                break;
            case ONAMES.LOCK_PICK:
                ch = 4 * ACURR(A_DEX) + 25 * (Role_if_rogue() ? 1 : 0);
                break;
            case ONAMES.SKELETON_KEY:
                ch = 75 + ACURR(A_DEX);
                break;
            default:
                ch = 0;
            }
            if (otmp.cursed)
                ch = Math.trunc(ch / 2);

            box = otmp;
            break;
        }
        if (c !== 'y') {
            if (!count)
                await There("doesn't seem to be any sort of lock here.");
            return PICKLOCK_LEARNED_SOMETHING; /* decided against all boxes */
        }
        const xl = game.xlock || (game.xlock = {});
        xl.box = box;
        xl.door = null;

        game.context.move = 0;
        xl.chance = ch;
        xl.picktyp = picktyp;
        xl.magic_key = false;       /* is_magic_key(): no artifacts yet */
        xl.usedtime = 0;
        set_occupation(picklock, lock_action(), 0);
        return PICKLOCK_DID_SOMETHING;
    }

    /* not the hero's location; pick the lock in an adjacent door */
    if (game.u.utrap && game.u.utraptype === TT_PIT) {
        await You_cant('reach over the edge of the pit.');
        return PICKLOCK_DID_NOTHING;
    }

    const mtmp = m_at(cc.x, cc.y);
    if (mtmp && canseemon(mtmp) && M_AP_TYPE(mtmp) !== M_AP_FURNITURE
        && M_AP_TYPE(mtmp) !== M_AP_OBJECT) {
        /* shopkeeper/Oracle credit-card quip needs a shk; plain refusal */
        if (picktyp === ONAMES.CREDIT_CARD && mtmp.isshk)
            note_unported_lock('pick_lock:no_checks_no_credit');
        else
            await pline(`I don't think ${mon_nam(mtmp)} would appreciate that.`);
        return PICKLOCK_LEARNED_SOMETHING;
    } else if (mtmp && is_door_mappear(mtmp)) {
        note_unported_lock('pick_lock:door_mimic');
        return PICKLOCK_LEARNED_SOMETHING;
    }

    const door = game.level?.at(cc.x, cc.y);
    if (!door || !IS_DOOR(door.typ)) {
        /* src/lock.c:578-593 — the attempt FEELS the location; if the map
           memory changes, the hero learned something and time passes. */
        let res = PICKLOCK_DID_NOTHING;
        const before = JSON.stringify(door?.remembered_glyph ?? null);
        const beforetyp = door?.lastseentyp;
        feel_location(cc.x, cc.y);
        if (JSON.stringify(door?.remembered_glyph ?? null) !== before
            || door?.lastseentyp !== beforetyp)
            res = PICKLOCK_LEARNED_SOMETHING;
        await You(`see no ${is_drawbridge_wall(cc.x, cc.y) >= 0
                            ? 'lock on the drawbridge' : 'door there'}.`);
        return res;
    }
    let ch;
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
    default: {
        /* AUTOUNLOCK_UNTRAP is not in the default autounlock setting and
           could_untrap needs trap-detection machinery; record if an rc
           ever turns it on */
        if (((game.flags?.autounlock ?? AUTOUNLOCK_APPLY_KEY)
             & AUTOUNLOCK_UNTRAP) !== 0)
            note_unported_lock('pick_lock:autounlock_untrap');

        /* credit cards are only good for unlocking */
        if (picktyp === ONAMES.CREDIT_CARD && !(door.doormask & D_LOCKED)) {
            await You_cant('lock a door with a credit card.');
            return PICKLOCK_LEARNED_SOMETHING;
        }

        const qbuf = `${(door.doormask & D_LOCKED) ? 'Unlock' : 'Lock'} it`
                     + `${autounlock ? ' with ' : ''}`
                     + `${autounlock ? yname(pick) : ''}?`;
        const c = await ynq(qbuf);
        if (c !== 'y')
            return PICKLOCK_DID_NOTHING;

        /* touch_artifact: 'pick' is never an artifact yet */

        switch (picktyp) {
        case ONAMES.CREDIT_CARD:
            ch = 2 * ACURR(A_DEX) + 20 * (Role_if_rogue() ? 1 : 0);
            break;
        case ONAMES.LOCK_PICK:
            ch = 3 * ACURR(A_DEX) + 30 * (Role_if_rogue() ? 1 : 0);
            break;
        case ONAMES.SKELETON_KEY:
            ch = 70 + ACURR(A_DEX);
            break;
        default:
            ch = 0;
        }
        const xl = game.xlock || (game.xlock = {});
        xl.door = door;
        xl.box = null;

        game.context.move = 0;
        xl.chance = ch;
        xl.picktyp = picktyp;
        xl.magic_key = false;       /* is_magic_key(): no artifacts yet */
        xl.usedtime = 0;
        set_occupation(picklock, lock_action(), 0);
        return PICKLOCK_DID_SOMETHING;
    }
    }
}

/* include/you.h:247 Role_if(PM_ROGUE) — the pick-lock chance bonus. */
function Role_if_rogue() {
    const m = game.urole?.mnum;
    return m === 'PM_ROGUE' || m === PMNAMES?.PM_ROGUE;
}

/* ---- #force ----
   C keeps breakchestlock() at lock.c:162, forcelock() at :216, reset_pick()
   at :259, u_have_forceable_weapon() at :660 and doforce() at :676, i.e.
   above doopen_indir(). This file was started from doopen_indir() and is
   already out of C's order; these go at the end rather than reshuffling
   working code. */

/* include/obj.h:338 Is_box() */
const Is_box = (o) => o.otyp === ONAMES.LARGE_BOX || o.otyp === ONAMES.CHEST;

/* include/skills.h — the ranks u_have_forceable_weapon() compares against. */
const P_NONE = 0, P_DAGGER = 1, P_FLAIL = 13, P_LANCE = 24;

/* include/objclass.h — the materials chest_shatter_msg() switches on. */
const PAPER = 5, WAX = 8, VEGGY = 9, FLESH = 10, GLASS = 16, WOOD = 13;

// src/lock.c:259 reset_pick()
export function reset_pick() {
    const xl = game.xlock || (game.xlock = {});
    xl.usedtime = xl.chance = xl.picktyp = 0;
    xl.magic_key = false;
    xl.door = null;
    xl.box = null;
}

// src/lock.c picking_at(); is the hero currently picking the lock at <x,y>?
export function picking_at(x, y) {
    return (game.occupation === picklock
            && game.xlock?.door === game.level.at(x, y));
}

/* include/obj.h is_weptool() */
function is_weptool(o) {
    return o.oclass === OCLASSES.TOOL_CLASS
           && game.objects[o.otyp].oc_skill !== P_NONE;
}

// src/lock.c:660 u_have_forceable_weapon()
function u_have_forceable_weapon() {
    const uwep = game.u.uwep;
    if (!uwep)
        return false;
    const oc = game.objects[uwep.otyp];
    if (uwep.oclass === OCLASSES.WEAPON_CLASS || is_weptool(uwep))
        return !(oc.oc_skill < P_DAGGER || oc.oc_skill === P_FLAIL
                 || oc.oc_skill > P_LANCE);
    return uwep.oclass === OCLASSES.ROCK_CLASS;
}

/* src/objnam.c greatest_erosion() — the worse of the two erosion counters,
   unless the object is erodeproof. */
function greatest_erosion(otmp) {
    if (otmp.oerodeproof)
        return 0;
    const e1 = otmp.oeroded | 0, e2 = otmp.oeroded2 | 0;
    return (e1 > e2) ? e1 : e2;
}

// src/lock.c:129 chest_shatter_msg(); a container item was destroyed
async function chest_shatter_msg(otmp) {
    let disposition;
    let thing;
    let save_HBlinded, save_BBlinded;

    if (otmp.oclass === OCLASSES.POTION_CLASS) {
        await You(`${Blind() ? 'hear' : 'see'} ${an(bottlename())} shatter!`);
        if (!breathless(game.youmonst.data) || haseyes(game.youmonst.data))
            await potionbreathe(otmp);
        return;
    }
    /* We have functions for distant and singular names, but not one */
    /* which does _both_... */
    /* u.ublind is the JS twin of HBlinded; the BBlinded half has no twin */
    save_HBlinded = game.u.ublind,  save_BBlinded = 0;
    game.u.ublind = 1;
    thing = singular(otmp, xname);
    game.u.ublind = save_HBlinded;
    switch (game.objects[otmp.otyp].oc_material) {
    case MATERIALS.PAPER:
        disposition = 'is torn to shreds';
        break;
    case MATERIALS.WAX:
        disposition = 'is crushed';
        break;
    case MATERIALS.VEGGY:
        disposition = 'is pulped';
        break;
    case MATERIALS.FLESH:
        disposition = 'is mashed';
        break;
    case MATERIALS.GLASS:
        disposition = 'shatters';
        break;
    case MATERIALS.WOOD:
        disposition = 'splinters to fragments';
        break;
    default:
        disposition = 'is destroyed';
        break;
    }
    await pline(`${An(thing)} ${disposition}!`);
}

// src/lock.c:162 breakchestlock(); the lock is broken (kick, #force) or the box
// itself is destroyed (#force with a blunt weapon)
export async function breakchestlock(box, destroyit) {
    if (!destroyit) { /* bill for the box but not for its contents */
        const hide_contents = box.cobj;

        box.cobj = [];
        await costly_alteration(box, COST_BRKLCK);
        box.cobj = hide_contents;
        box.olocked = 0;
        box.obroken = 1;
        box.lknown = 1;
    } else { /* #force has destroyed this box (at <u.ux,u.uy>) */
        let otmp;
        const shkp = (game.u.ushops && costly_spot(game.u.ux, game.u.uy))
                     ? shop_keeper(game.u.ushops.charCodeAt(0))
                     : null;
        const costly = (shkp != null),
              peaceful_shk = costly && !!shkp.mpeaceful;
        let loss = 0;

        await pline(`In fact, you've totally destroyed ${the(xname(box))}.`);
        /* Put the contents on ground at the hero's feet. */
        while ((otmp = (box.cobj && box.cobj[0])) != null) {
            obj_extract_self(otmp);
            if (!rn2(3) || otmp.oclass === OCLASSES.POTION_CLASS) {
                await chest_shatter_msg(otmp);
                if (costly)
                    loss += await stolen_value(otmp, game.u.ux, game.u.uy, peaceful_shk,
                                               true);
                if (otmp.quan === 1) {
                    obfree(otmp, null);
                    continue;
                }
                /* this works because we're sure to have at least 1 left;
                   otherwise it would fail since otmp is not in inventory */
                useup(otmp);
            }
            if (box.otyp === ONAMES.ICE_BOX && otmp.otyp === ONAMES.CORPSE) {
                otmp.age = game.moves - otmp.age; /* actual age */
                start_corpse_timeout(otmp);
            }
            place_object(otmp, game.u.ux, game.u.uy);
            stackobj(otmp);
        }
        if (costly)
            loss += await stolen_value(box, game.u.ux, game.u.uy, peaceful_shk, true);
        if (loss)
            await You(`owe ${loss} ${currency(loss)} for objects destroyed.`);
        await delobj(box);
    }
}



// src/lock.c:216 forcelock() — the occupation doforce() installs.
export async function forcelock() {
    const xl = game.xlock;
    const uwep = game.u.uwep;

    if (xl.box.ox !== game.u.ux || xl.box.oy !== game.u.uy)
        return (xl.usedtime = 0); /* you or it moved */

    if (xl.usedtime++ >= 50 || !uwep) {
        await You('give up your attempt to force the lock.');
        if (xl.usedtime >= 50) /* you made the effort */
            exercise(xl.picktyp ? A_DEX : A_STR, true);
        return (xl.usedtime = 0);
    }

    if (xl.picktyp) { /* blade */
        if (rn2(1000 - (uwep.spe | 0)) > (992 - greatest_erosion(uwep) * 10)
            && !uwep.cursed && !obj_resists(uwep, 0, 99)) {
            /* for a +0 weapon, probability that it survives an unsuccessful
             * attempt to force the lock is (.992)^50 = .67
             */
            await pline(`${uwep.quan > 1 ? 'One of y' : 'Y'}our ${
                xname(uwep)} broke!`);
            useup(uwep);
            await You('give up your attempt to force the lock.');
            exercise(A_DEX, true);
            return (xl.usedtime = 0);
        }
    } else {            /* blunt */
        await wake_nearby(false); /* due to hammering on the container */
    }

    if (rn2(100) >= xl.chance)
        return 1; /* still busy */

    await You('succeed in forcing the lock.');
    exercise(xl.picktyp ? A_DEX : A_STR, true);
    /* breakchestlock() might destroy xlock.box; if so the context is cleared
       through delobj(), but it might not, so clear it explicitly after. */
    await breakchestlock(xl.box, !xl.picktyp && !rn2(3));
    reset_pick(); /* lock-picking context is no longer valid */

    return 0;
}

// src/lock.c:676 doforce() — the #force command.
export async function doforce() {
    const uwep = game.u.uwep;

    if (game.u.uswallow) {
        await You_cant('force anything from inside here.');
        return ECMD_OK;
    }
    if (!u_have_forceable_weapon()) {
        const use_plural = !!(uwep && uwep.quan > 1);
        const how = !uwep ? 'when not wielding a'
            : (uwep.oclass !== OCLASSES.WEAPON_CLASS && !is_weptool(uwep))
              ? (use_plural ? 'without proper' : 'without a proper')
              : (use_plural ? 'with those' : 'with that');
        await You_cant(`force anything ${how} weapon${use_plural ? 's' : ''}.`);
        return ECMD_OK;
    }
    if (!can_reach_floor(true)) {
        note_unported_lock('doforce:cant_reach_floor');
        return ECMD_OK;
    }

    const xl = game.xlock || (game.xlock = {});
    const picktyp = (is_blade(uwep) && !is_pick(uwep)) ? 1 : 0;
    if (xl.usedtime && xl.box && picktyp === xl.picktyp) {
        await You('resume your attempt to force the lock.');
        set_occupation(forcelock, 'forcing the lock', 0);
        return ECMD_TIME;
    }

    /* A lock is made only for the honest man, the thief will break it. */
    xl.box = null;
    for (const otmp of (game.level?.objects || [])) {
        if (otmp.ox !== game.u.ux || otmp.oy !== game.u.uy || !Is_box(otmp))
            continue;
        if (otmp.obroken || !otmp.olocked) {
            /* force doname() to omit the known "broken" or "unlocked" prefix
               so that the message isn't worded redundantly */
            otmp.lknown = 0;
            await There(`is ${doname(otmp)} here, but its lock is already ${
                otmp.obroken ? 'broken' : 'unlocked'}.`);
            otmp.lknown = 1;
            continue;
        }
        /* safe_qbuf(qbuf, "There is ", " here; force its lock?", otmp,
                     doname, ansimpleoname, "a box") */
        otmp.lknown = 1;
        const c = await ynq(`There is ${doname(otmp)} here; force its lock?`);
        if (c === 'q')
            return ECMD_OK;
        if (c === 'n')
            continue;

        if (picktyp)
            await You(`force ${yname(uwep)} into a crack and pry.`);
        else
            await You(`start bashing it with ${yname(uwep)}.`);
        xl.box = otmp;
        xl.chance = game.objects[uwep.otyp].oc_wldam * 2;
        xl.picktyp = picktyp;
        xl.magic_key = false;
        xl.usedtime = 0;
        break;
    }

    if (xl.box)
        set_occupation(forcelock, 'forcing the lock', 0);
    else
        await You('decide not to force the issue.');
    return ECMD_TIME;
}

/* include/hack.h:1330 ynq() */
async function ynq(query) {
    return await tty_yn_function(query, 'ynq', 'q');
}

// src/lock.c:1056 boxlock(), magical locking/unlocking of a box.
export async function boxlock(obj, otmp) /* obj *is* a box */
{
    let res = 0;

    switch (otmp.otyp) {
    case ONAMES.WAN_LOCKING:
    case ONAMES.SPE_WIZARD_LOCK:
        if (!obj.olocked) { /* lock it; fix if broken */
            await pline('Klunk!');
            obj.olocked = 1;
            obj.obroken = 0;
            if (Role_if(PMNAMES.PM_WIZARD))
                obj.lknown = 1;
            else
                obj.lknown = 0;
            res = 1;
        } /* else already closed and locked */
        break;
    case ONAMES.WAN_OPENING:
    case ONAMES.SPE_KNOCK:
        if (obj.olocked) { /* unlock; isn't broken so doesn't need fixing */
            await pline('Klick!');
            obj.olocked = 0;
            res = 1;
            if (Role_if(PMNAMES.PM_WIZARD))
                obj.lknown = 1;
            else
                obj.lknown = 0;
        } else /* silently fix if broken */
            obj.obroken = 0;
        break;
    case ONAMES.WAN_POLYMORPH:
    case ONAMES.SPE_POLYMORPH:
        /* maybe start unlocking chest, get interrupted, then zap it;
           we must avoid any attempt to resume unlocking it */
        if (game.xlock?.box === obj)
            reset_pick();
        break;
    }
    return res;
}

/* include/obj.h carried() */
const carried = (o) => o.where === OBJ_INVENT;

// src/lock.c maybe_reset_pick(); clear the lock-picking context when the
// container it refers to is being deleted (or, with a null container, when
// leaving a level behind while not carrying the context's box)
export function maybe_reset_pick(container) {
    const xl = game.xlock || {};

    if (container ? (container === xl.box)
                  : (!xl.box || !carried(xl.box)))
        reset_pick();
}

// src/lock.c doorlock(); opening, locking or striking magic hits a door;
// returns True if something happened
export async function doorlock(otmp, x, y) {
    const door = game.level.at(x, y);
    let res = true;
    let loudness = 0;
    let msg = null;
    const dustcloud = 'A cloud of dust';
    const quickly_dissipates = 'quickly dissipates';
    const mysterywand = (otmp.oclass === OCLASSES.WAND_CLASS && !otmp.dknown);

    if (door.typ === SDOOR) {
        switch (otmp.otyp) {
        case ONAMES.WAN_OPENING:
        case ONAMES.SPE_KNOCK:
        case ONAMES.WAN_STRIKING:
        case ONAMES.SPE_FORCE_BOLT:
            door.typ = DOOR;
            door.doormask = D_CLOSED | (door.doormask & D_TRAPPED);
            newsym(x, y);
            if (cansee(x, y))
                await pline('A door appears in the wall!');
            if (otmp.otyp === ONAMES.WAN_OPENING || otmp.otyp === ONAMES.SPE_KNOCK)
                return true;
            break; /* striking: continue door handling below */
        case ONAMES.WAN_LOCKING:
        case ONAMES.SPE_WIZARD_LOCK:
        default:
            return false;
        }
    }

    switch (otmp.otyp) {
    case ONAMES.WAN_LOCKING:
    case ONAMES.SPE_WIZARD_LOCK:
        if (Is_rogue_level(game.u.uz)) {
            const vis = cansee(x, y);

            /* Can't have real locking in Rogue, so just hide doorway */
            if (vis) {
                await pline(`${dustcloud} springs up in the older, more primitive doorway.`);
            } else {
                /* Soundeffect(se_swoosh, 25); */
                await You_hear('a swoosh.');
            }
            if (await obstructed(x, y, mysterywand)) {
                if (vis)
                    await pline_The(`cloud ${quickly_dissipates}.`);
                return false;
            }
            block_point(x, y);
            door.typ = SDOOR, door.doormask = D_NODOOR;
            if (vis)
                await pline_The('doorway vanishes!');
            newsym(x, y);
            return true;
        }
        if (await obstructed(x, y, mysterywand))
            return false;
        /* Don't allow doors to close over traps.  This is for pits */
        /* & trap doors, but is it ever OK for anything else? */
        if (t_at(x, y)) {
            /* maketrap() clears doormask, so it should be NODOOR */
            await pline(`${dustcloud} springs up in the doorway, but ${quickly_dissipates}.`);
            return false;
        }

        switch (door.doormask & ~D_TRAPPED) {
        case D_CLOSED:
            msg = 'The door locks!';
            break;
        case D_ISOPEN:
            msg = 'The door swings shut, and locks!';
            break;
        case D_BROKEN:
            msg = 'The broken door reassembles and locks!';
            break;
        case D_NODOOR:
            msg =
               'A cloud of dust springs up and assembles itself into a door!';
            break;
        default:
            res = false;
            break;
        }
        block_point(x, y);
        door.doormask = D_LOCKED | (door.doormask & D_TRAPPED);
        newsym(x, y);
        break;
    case ONAMES.WAN_OPENING:
    case ONAMES.SPE_KNOCK:
        if (door.doormask & D_LOCKED) {
            msg = 'The door unlocks!';
            door.doormask = D_CLOSED | (door.doormask & D_TRAPPED);
        } else
            res = false;
        break;
    case ONAMES.WAN_STRIKING:
    case ONAMES.SPE_FORCE_BOLT:
        if (door.doormask & (D_LOCKED | D_CLOSED)) {
            /* sawit: closed door location is more visible than open */
            let sawit, seeit;

            if (door.doormask & D_TRAPPED) {
                const mtmp = m_at(x, y);

                sawit = mtmp ? canseemon(mtmp) : cansee(x, y);
                door.doormask = D_NODOOR;
                unblock_point(x, y);
                newsym(x, y);
                seeit = mtmp ? canseemon(mtmp) : cansee(x, y);
                if (mtmp) {
                    await mb_trapped(mtmp, sawit || seeit);
                } else {
                    /* for mtmp, mb_trapped() does is own wake_nearto() */
                    loudness = 40;
                    if (game.flags.verbose) {
                        /* Soundeffect(se_kaboom_door_explodes, 75); */
                        if ((sawit || seeit) && !Unaware()) {
                            await pline('KABOOM!!  You see a door explode.');
                        } else if (!Deaf()) {
                            /* Soundeffect(se_explosion, 75); */
                            await You_hear(`a ${(distu(x, y) > 7 * 7) ? 'distant' : 'nearby'} explosion.`);
                        }
                    }
                }
                break;
            }
            sawit = cansee(x, y);
            door.doormask = D_BROKEN;
            recalc_block_point(x, y);
            seeit = cansee(x, y);
            newsym(x, y);
            if (game.flags.verbose) {
                if ((sawit || seeit) && !Unaware()) {
                    await pline_The('door crashes open!');
                } else if (!Deaf()) {
                    /* Soundeffect(se_crashing_sound, 100); */
                    await You_hear('a crashing sound.');
                }
            }
            /* force vision recalc before printing more messages */
            if (game.vision_full_recalc)
                vision_recalc(0);
            loudness = 20;
        } else
            res = false;
        break;
    default:
        /* impossible("magic (%d) attempted on door.", otmp->otyp) */
        break;
    }
    if (msg && cansee(x, y))
        await pline(msg);
    if (loudness > 0) {
        /* door was destroyed */
        await wake_nearto(x, y, loudness);
        if (in_rooms(x, y, SHOPBASE).length)
            add_damage(x, y, 0);
    }

    if (res && picking_at(x, y)) {
        /* maybe unseen monster zaps door you're unlocking */
        await stop_occupation();
        reset_pick();
    }
    return res;
}
