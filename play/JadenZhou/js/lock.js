// lock.js -- doors and locks (C ref: lock.c).
//
// Ported so far: doopen_indir() for a known door location (the autoopen
// path from hack.c test_move()) with its autounlock dispatch, autokey(),
// stumble_on_door_mimic(), pick_lock() for doors (the autounlock and
// #apply paths), the picklock() occupation, lock_action(), reset_pick(),
// maybe_reset_pick(), picking_lock() and picking_at(). Not ported yet:
// picking a container's lock, the #open direction prompt, the autounlock
// untrap/kick actions and door traps.  Also ported: #force (doforce(),
// forcelock(), breakchestlock(), u_have_forceable_weapon(),
// chest_shatter_msg()) and #close (doclose()).

import { could_untrap, untrap } from './trap.js';
import { cmdq_add_ec, cmdq_add_dir } from './cmd.js';
import { impossible, is_door_mappear } from './hack.js';
import { touch_artifact, is_magic_key } from './artifact.js';
import { game } from './gstate.js';
import { rn2, rnl } from './rng.js';
import { pline, newsym, You, You_cant, pline_The, canseemon, verbalize,
         You_hear } from './display.js';
import { tty_yn_function } from './wintty.js';
import { get_adjacent_loc } from './cmd.js';
import { update_mapseen_for } from './dungeon.js';
import { container_at, doloot } from './pickup.js';
import { set_occupation } from './allmain.js';
import { mon_nam } from './do_name.js';
import { doname, yname, simple_typename, An } from './objnam.js';
import { can_reach_floor, cant_reach_floor } from './engrave.js';
import { mons, PM_ORACLE, PM_ROGUE } from './monsters.js';
import { ART_ORB_OF_DETECTION, ART_MASTER_KEY_OF_THIEVERY } from './artilist.js';
import { is_quest_artifact } from './questpgr.js';
import { CHEST, carried, greatest_erosion, is_blade, is_pick, Is_box,
         is_weptool } from './objects.js';
import { D_LOCKED, M_AP_OBJECT } from './const.js';
import { recalc_block_point } from './vision.js';
import { unblock_point as unblock_point_lk } from './vision.js';
import { m_at as m_at_lk } from './makemon.js';
import { canseemon as canseemon_lk } from './display.js';
import { mb_trapped as mb_trapped_lk } from './monmove.js';
import { D_NODOOR as D_NODOOR_LK } from "./const.js";
import { dist2 as dist2_lk } from "./hacklib.js";
import { ACURR, acurrstr, exercise } from './attrib.js';
import { m_at, closed_door } from './makemon.js';
import { stumble_onto_mimic } from './uhitm.js';
import { A_STR, A_DEX, A_CON, IS_DOOR, D_CLOSED, D_BROKEN, D_NODOOR,
         D_ISOPEN, D_TRAPPED, DRAWBRIDGE_UP, DRAWBRIDGE_DOWN, M_AP_FURNITURE,
         TT_PIT, CONFUSION, STUNNED, PROT_FROM_SHAPE_CHANGERS } from './const.js';
import { SKELETON_KEY, LOCK_PICK, CREDIT_CARD } from './objects.js';
import { M1_NOHANDS, MZ_SMALL } from './monsters.js';
import { canspotmon, map_invisible, feel_location, feel_newsym } from './display.js';
import { ansimpleoname } from './iactions.js';
import { hliquid } from './potion.js';
import { is_pool, is_lava } from './makemon.js';
import { LEVITATION } from './const.js';
import { Some_Monnam } from './do_name.js';
import { s_suffix } from './hacklib.js';
import { cansee, block_point, vision_recalc } from './vision.js';
import { t_at, chest_trap, b_trapped } from './trap.js';
import { SHOP_DOOR_COST as SHOP_DOOR_COST_LK } from './const.js';
import { FINGER } from './const.js';
import { wake_nearto } from './mon.js';
import { in_rooms } from './hack.js';
import { stop_occupation } from './allmain.js';
import { OBJ_AT, SDOOR, DOOR, SHOPBASE, Is_rogue_level,
         DEAF } from './const.js';
import { WAND_CLASS, WAN_OPENING, WAN_LOCKING, WAN_STRIKING, SPE_KNOCK,
         SPE_FORCE_BOLT, SPE_WIZARD_LOCK } from './objects.js';
import { objects, ICE_BOX, CORPSE, LARGE_BOX, POTION_CLASS, WEAPON_CLASS,
         TOOL_CLASS, ROCK_CLASS, PAPER, WAX, VEGGY, FLESH, GLASS,
         WOOD } from './objects.js';
import { COST_BRKLCK, PASSES_WALLS, DBWALL, BLINDED, P_DAGGER, P_FLAIL,
         P_LANCE, P_SABER, P_PICK_AXE, isok } from './const.js';
import { costly_alteration, obj_extract_self, start_corpse_timeout,
         place_object, level_objects_at } from './mkobj.js';
import { costly_spot, shop_keeper, add_damage, stolen_value } from './shk.js';
import { the, surface } from './iactions.js';
import { xname, singular, an } from './objnam.js';
import { obfree, useup, stackobj, delobj } from './invent.js';
import { currency } from './insight.js';
import { obj_resists } from './dogmove.js';
import { wake_nearby } from './mon.js';
import { There, set_msg_xy } from './display.js';
import { safe_qbuf } from './pickup.js';
import { getdir } from './cmd.js';
import { is_drawbridge_wall } from './dbridge.js';
import { bottlename, potionbreathe } from './potion.js';
import { haseyes, nohands, breathless } from './mondata.js';
import { M1_BREATHLESS } from './monsters.js';
/* boxlock() */
import { Role_if as Role_if_lk } from './const.js';
import { PM_WIZARD as PM_WIZARD_LK } from './monsters.js';
import { WAN_POLYMORPH as WAN_POLYMORPH_LK, SPE_POLYMORPH as SPE_POLYMORPH_LK } from './objects.js';
import {
    Stunned, Confusion, Blind, Deaf, Passes_walls, Protection_from_shape_changers, Unaware
} from './youprop.js';

/* C ref: flag.h AUTOUNLOCK_* */
export const AUTOUNLOCK_UNTRAP = 1;
export const AUTOUNLOCK_APPLY_KEY = 2;
export const AUTOUNLOCK_KICK = 4;
export const AUTOUNLOCK_FORCE = 8;

/* C ref: func_tab.h ECMD_OK, ECMD_TIME */
const ECMD_OK = 0x00;
const ECMD_TIME = 0x01;
const ECMD_CANCEL = 0x02;

/* C ref: defsym.h S_vcdoor, S_hcdoor (pchar indices) */
const S_vcdoor = 15, S_hcdoor = 16;


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
        await exercise(A_DEX, true); /* even if you don't succeed */
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
            const u = game.u;
            await b_trapped("door", FINGER);
            xl.door.doormask = D_NODOOR;
            unblock_point_lk(u.ux + u.dx, u.uy + u.dy);
            if (in_rooms(u.ux + u.dx, u.uy + u.dy, SHOPBASE).length)
                add_damage(u.ux + u.dx, u.uy + u.dy, SHOP_DOOR_COST_LK);
            newsym(u.ux + u.dx, u.uy + u.dy);
        } else if (xl.door.doormask & D_LOCKED)
            xl.door.doormask = D_CLOSED;
        else
            xl.door.doormask = D_LOCKED;
    } else {
        xl.box.olocked = !xl.box.olocked;
        xl.box.lknown = 1;
        if (xl.box.otrapped)
            await chest_trap(xl.box, FINGER, false);
    }
    await exercise(A_DEX, true);
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

    let dummypick = null;
    /* 'pick' might be Null [called by do_loot_cont() for AUTOUNLOCK_UNTRAP] */
    if (!pick) {
        dummypick = { otyp: 0, oclass: 0, quan: 1 }; /* cg.zeroobj */
        pick = dummypick; /* pick->otyp will be STRANGE_OBJECT */
    }
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
        await You_cant(`${(picktyp === CREDIT_CARD) ? "" : "lock or "}unlock ${
            mon_nam(u.ustuck)}.`);
        return PICKLOCK_DID_NOTHING;
    }

    if (pick !== dummypick && picktyp !== SKELETON_KEY
        && picktyp !== LOCK_PICK && picktyp !== CREDIT_CARD) {
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
        let verb;
        let it;
        let count;

        if (u.dz < 0 && !autounlock) { /* beware stale u.dz value */
            await There(`isn't any sort of lock up ${
                lk_Levitation() ? "here" : "there"}.`);
            return PICKLOCK_LEARNED_SOMETHING;
        } else if (is_lava(u.ux, u.uy)) {
            await pline(`Doing that would probably melt ${yname(pick)}.`);
            return PICKLOCK_LEARNED_SOMETHING;
        } else if (is_pool(u.ux, u.uy) && !u.uinwater /* !Underwater */) {
            await pline_The(`${hliquid("water")} has no lock.`);
            return PICKLOCK_LEARNED_SOMETHING;
        }

        count = 0;
        c = 'n'; /* in case there are no boxes here */
        for (const otmp of lk_objects_at(cc.x, cc.y)) {
            /* autounlock on boxes: only the one that was just discovered to
               be locked; don't include any other boxes which might be here */
            if (autounlock && otmp !== container)
                continue;
            if (Is_box(otmp)) {
                ++count;
                if (!can_reach_floor(true)) {
                    await You_cant(`reach ${the(xname(otmp))} from up here.`);
                    return PICKLOCK_LEARNED_SOMETHING;
                }
                it = false;
                if (otmp.obroken)
                    verb = "fix";
                else if (!otmp.olocked)
                    verb = "lock", it = true;
                else if (picktyp !== LOCK_PICK)
                    verb = "unlock", it = true;
                else
                    verb = "pick";

                const autounlock_flags = game.flags.autounlock ?? AUTOUNLOCK_APPLY_KEY;
                if (autounlock && (autounlock_flags & AUTOUNLOCK_UNTRAP) !== 0
                    && await could_untrap(false, true)
                    && (c = otmp.tknown ? (otmp.otrapped ? 'y' : 'n')
                            : await ynq(safe_qbuf("Check ", " for a trap?",
                                                  otmp, yname, "this")))
                       !== 'n') {
                    if (c === 'q')
                        return PICKLOCK_DID_NOTHING; /* c == 'q' */
                    /* c == 'y' */
                    await untrap(false, 0, 0, otmp);
                    return PICKLOCK_DID_SOMETHING; /* even if no trap found */
                } else if (autounlock
                           && (autounlock_flags & AUTOUNLOCK_APPLY_KEY) !== 0) {
                    c = 'q';
                    if (pick !== dummypick)
                        c = await ynq(`Unlock it with ${yname(pick)}?`);
                    if (c !== 'y')
                        return PICKLOCK_DID_NOTHING;
                } else {
                    /* "There is <a box> here; <verb> <it|its lock>?" */
                    const qsfx = ` here; ${verb} ${it ? "it" : "its lock"}?`;
                    const qbuf = safe_qbuf("There is ", qsfx, otmp, doname,
                                           "a box");
                    otmp.lknown = 1;

                    c = await ynq(qbuf);
                    if (c === 'q')
                        return PICKLOCK_DID_NOTHING;
                    if (c === 'n')
                        continue; /* try next box */
                }

                if (otmp.obroken) {
                    await You_cant(`fix its broken lock with ${ansimpleoname(pick)}.`);
                    return PICKLOCK_LEARNED_SOMETHING;
                } else if (picktyp === CREDIT_CARD && !otmp.olocked) {
                    /* credit cards are only good for unlocking */
                    await You_cant(`do that with ${an(simple_typename(picktyp))}.`);
                    return PICKLOCK_LEARNED_SOMETHING;
                } else if (autounlock
                           && !(await touch_artifact(pick, game.youmonst))) {
                    /* note: for !autounlock, apply already did touch check */
                    return PICKLOCK_DID_SOMETHING;
                }
                switch (picktyp) {
                case CREDIT_CARD:
                    ch = ACURR(A_DEX) + 20 * (game.urole.mnum === PM_ROGUE ? 1 : 0);
                    break;
                case LOCK_PICK:
                    ch = 4 * ACURR(A_DEX) + 25 * (game.urole.mnum === PM_ROGUE ? 1 : 0);
                    break;
                case SKELETON_KEY:
                    ch = 75 + ACURR(A_DEX);
                    break;
                default:
                    ch = 0;
                }
                if (otmp.cursed)
                    ch = Math.trunc(ch / 2);

                xl.box = otmp;
                xl.door = null;
                break;
            }
        }
        if (c !== 'y') {
            if (!count)
                await There("doesn't seem to be any sort of lock here.");
            return PICKLOCK_LEARNED_SOMETHING; /* decided against all boxes */
        }

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
                && (mtmp.isshk || mtmp.data === mons[PM_ORACLE])) {
                /* SetVoice(mtmp, 0, 80, 0); */
                await verbalize("No checks, no credit, no problem.");
            } else {
                await pline(`I don't think ${mon_nam(mtmp)} would appreciate that.`);
            }
            return PICKLOCK_LEARNED_SOMETHING;
        } else if (mtmp && is_door_mappear(mtmp)) {
            /* "The door actually was a <mimic>!" */
            await stumble_onto_mimic(mtmp);
            /* mimic might keep the key (50% chance, 10% for PYEC or MKoT) */
            throw new Error('pick_lock(): maybe_absorb_item() not ported yet');
        }
        if (!IS_DOOR(door.typ)) {
            let res = PICKLOCK_DID_NOTHING;
            const oldglyph = door.remembered_glyph;
            const oldlastseentyp = update_mapseen_for(cc.x, cc.y);

            /* this is probably only relevant when blind */
            feel_location(cc.x, cc.y);
            if (!same_glyph(door.remembered_glyph, oldglyph)
                || (game.level.lastseentyp?.[cc.x]?.[cc.y] ?? 0) !== oldlastseentyp)
                res = PICKLOCK_LEARNED_SOMETHING;

            if (is_drawbridge_wall(cc.x, cc.y) >= 0)
                await You(`${Blind() ? "feel" : "see"} no lock on the drawbridge.`);
            else
                await You(`${Blind() ? "feel" : "see"} no door there.`);
            return res;
        }
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
            if ((autounlock_flags & AUTOUNLOCK_UNTRAP) !== 0
                && await could_untrap(false, false)
                && (c = await ynq("Check this door for a trap?")) !== 'n') {
                if (c === 'q')
                    return PICKLOCK_DID_NOTHING;
                /* c == 'y' */
                await untrap(false, cc.x, cc.y, null);
                return PICKLOCK_DID_SOMETHING; /* even if no trap found */
            }
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
            if (autounlock && !(await touch_artifact(pick, game.youmonst)))
                return PICKLOCK_DID_SOMETHING;

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

/* C ref: youprop.h Levitation */
function lk_Levitation() {
    const p = game.u?.uprops?.[LEVITATION];
    return !!(p && (p.intrinsic || p.extrinsic) && !p.blocked);
}

/* C ref: display.h level.objects[x][y] -- the pile at <x,y>, top first */
function lk_objects_at(x, y) {
    return level_objects_at(x, y);
}

/* lev->glyph comparison for the remembered-glyph objects JS keeps */
function same_glyph(a, b) {
    if (!a || !b)
        return a === b;
    return a.ch === b.ch && a.color === b.color && !!a.decgfx === !!b.decgfx
        && a.cmap === b.cmap && a.otyp === b.otyp && a.mndx === b.mndx
        && a.corpsenm === b.corpsenm && !!a.trap === !!b.trap
        && a.kind === b.kind;
}

/* C ref: hack.h ynq() */
async function ynq(query) {
    let c = await tty_yn_function(query, "ynq", 'q');
    if (typeof c === 'number')
        c = String.fromCharCode(c);
    return c;
}

// C ref: lock.c autokey() -- the unlocking tool autounlock would apply
/* opening: True: key, pick, or card; False: key or pick */
export function autokey(opening) {
    let o, key, pick, card, akey, apick, acard;

    /* mundane item or regular artifact or own role's quest artifact */
    key = pick = card = null;
    /* other role's quest artifact (Rogue's Key or Tourist's Credit Card) */
    akey = apick = acard = null;
    for (o = game.invent; o; o = o.nobj) {
        if ((o.oartifact || 0) >= ART_ORB_OF_DETECTION /* any_quest_artifact(o) */
            && !is_quest_artifact(o)) {
            switch (o.otyp) {
            case SKELETON_KEY:
                if (!akey)
                    akey = o;
                break;
            case LOCK_PICK:
                if (!apick)
                    apick = o;
                break;
            case CREDIT_CARD:
                if (!acard)
                    acard = o;
                break;
            default:
                break;
            }
        } else {
            switch (o.otyp) {
            case SKELETON_KEY:
                if (!key || is_magic_key(game.youmonst, o))
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
    }
    if (!opening)
        card = acard = null;
    /* only resort to other role's quest artifact if no other choice */
    if (!key && !pick && !card)
        key = akey;
    if (!pick && !card)
        pick = apick;
    if (!card)
        card = acard;
    return key ? key : pick ? pick : card ? card : null;
}

// C ref: lock.c stumble_on_door_mimic()
async function stumble_on_door_mimic(x, y) {
    const mtmp = m_at(x, y);

    if (mtmp && is_door_mappear(mtmp) && !Protection_from_shape_changers()) {
        await stumble_onto_mimic(mtmp);
        return true;
    }
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

    if (await stumble_on_door_mimic(cc.x, cc.y))
        return ECMD_TIME;

    /* when choosing a direction is impaired, use a turn
       regardless of whether a door is successfully targeted */
    if (Confusion() || Stunned())
        res = ECMD_TIME;

    const door = game.level.at(cc.x, cc.y);
    /* is_drawbridge_wall(cc.x, cc.y) >= 0: drawbridges aren't ported */
    const portcullis = false;
    /* this used to be 'if (Blind)' but using a key skips that so we do too */
    {
        /* oldglyph: newsym() redraws what the hero already sees next to
           her, so the remembered glyph doesn't change for a door in view */
        const oldlastseentyp = update_mapseen_for(cc.x, cc.y);

        newsym(cc.x, cc.y);
        if ((game.level.lastseentyp?.[cc.x]?.[cc.y] ?? 0) !== oldlastseentyp)
            res = ECMD_TIME; /* learned something */
    }

    if (portcullis || !IS_DOOR(door.typ)) {
        /* closed portcullis or spot that opened bridge would span */
        if (door.typ === DBWALL /* is_db_wall(cc.x, cc.y) */
            || door.typ === DRAWBRIDGE_UP)
            await There("is no obvious way to open the drawbridge.");
        else if (portcullis || door.typ === DRAWBRIDGE_DOWN)
            await pline_The("drawbridge is already open.");
        else if (container_at(cc.x, cc.y, true))
            await pline(`${Blind() ? "Feels" : "Seems"} like something lootable over there.`);
        else
            await You(`${Blind() ? "feel" : "see"} no door there.`);
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
        set_msg_xy(cc.x, cc.y);
        await pline(`This door${mesg}.`);
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
                cmdq_add_ec("dokick"); /* CQ_CANNED */
                cmdq_add_dir(Math.sign(cc.x - u.ux), Math.sign(cc.y - u.uy), 0);
                /* this was 'ECMD_TIME', but time shouldn't elapse until
                   the canned kick takes place */
                res = ECMD_OK;
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
        set_msg_xy(cc.x, cc.y);
        await pline_The("door opens.");
        if (door.doormask & D_TRAPPED) {
            await b_trapped("door", FINGER);
            door.doormask = D_NODOOR;
            if (in_rooms(cc.x, cc.y, SHOPBASE).length)
                add_damage(cc.x, cc.y, SHOP_DOOR_COST_LK);
        } else
            door.doormask = D_ISOPEN;
        feel_newsym(cc.x, cc.y); /* the hero knows she opened it */
        recalc_block_point(cc.x, cc.y); /* vision: new see through there */
    } else {
        await exercise(A_STR, true);
        set_msg_xy(cc.x, cc.y);
        await pline_The("door resists!");
    }

    return ECMD_TIME;
}

// C ref: lock.c obstructed()
async function obstructed(x, y, quietly) {
    const mtmp = m_at(x, y);

    if (mtmp && (mtmp.m_ap_type || 0) !== M_AP_FURNITURE) {
        if ((mtmp.m_ap_type || 0) !== M_AP_OBJECT) {
            if (!quietly) {
                let Mn = Some_Monnam(mtmp); /* Monnam, Someone or Something */

                if ((mtmp.mx !== x || mtmp.my !== y) && canspotmon(mtmp))
                    Mn = s_suffix(Mn) + " tail";

                await pline(`${Mn} blocks the way!`);
            }
            if (!canspotmon(mtmp))
                map_invisible(x, y);
            return true;
        }
        /* M_AP_OBJECT: goto objhere */
        if (!quietly)
            await pline("Something's in the way.");
        return true;
    }
    if (OBJ_AT(x, y)) {
        /* objhere: */
        if (!quietly)
            await pline("Something's in the way.");
        return true;
    }
    return false;
}

// C ref: lock.c boxlock()
/* box obj was hit with spell or wand effect otmp;
   returns true if something happened */
export async function boxlock(obj, otmp) { /* obj *is* a box */
    let res = false;

    switch (otmp.otyp) {
    case WAN_LOCKING:
    case SPE_WIZARD_LOCK:
        if (!obj.olocked) { /* lock it; fix if broken */
            /* Soundeffect(se_klunk, 50): no sound interface */
            await pline("Klunk!");
            obj.olocked = 1;
            obj.obroken = 0;
            if (Role_if_lk(PM_WIZARD_LK))
                obj.lknown = 1;
            else
                obj.lknown = 0;
            res = true;
        } /* else already closed and locked */
        break;
    case WAN_OPENING:
    case SPE_KNOCK:
        if (obj.olocked) { /* unlock; isn't broken so doesn't need fixing */
            /* Soundeffect(se_klick, 50): no sound interface */
            await pline("Klick!");
            obj.olocked = 0;
            res = true;
            if (Role_if_lk(PM_WIZARD_LK))
                obj.lknown = 1;
            else
                obj.lknown = 0;
        } else /* silently fix if broken */
            obj.obroken = 0;
        break;
    case WAN_POLYMORPH_LK:
    case SPE_POLYMORPH_LK:
        /* maybe start unlocking chest, get interrupted, then zap it;
           we must avoid any attempt to resume unlocking it */
        if (xlock().box === obj)
            reset_pick();
        break;
    }
    return res;
}

// C ref: lock.c doorlock()
/* try to open, close, lock, or unlock a door with a wand/spell or force
   bolt; returns TRUE if something happened */
export async function doorlock(otmp, x, y) {
    const door = game.level.at(x, y);
    let res = true;
    let loudness = 0;
    let msg = null;
    const dustcloud = "A cloud of dust";
    const quickly_dissipates = "quickly dissipates";
    const mysterywand = (otmp.oclass === WAND_CLASS && !otmp.dknown);

    if (door.typ === SDOOR) {
        switch (otmp.otyp) {
        case WAN_OPENING:
        case SPE_KNOCK:
        case WAN_STRIKING:
        case SPE_FORCE_BOLT:
            door.typ = DOOR;
            door.doormask = D_CLOSED | ((door.doormask || 0) & D_TRAPPED);
            newsym(x, y);
            if (cansee(x, y))
                await pline("A door appears in the wall!");
            if (otmp.otyp === WAN_OPENING || otmp.otyp === SPE_KNOCK)
                return true;
            break; /* striking: continue door handling below */
        case WAN_LOCKING:
        case SPE_WIZARD_LOCK:
        default:
            return false;
        }
    }

    switch (otmp.otyp) {
    case WAN_LOCKING:
    case SPE_WIZARD_LOCK:
        if (Is_rogue_level(game.u.uz))
            throw new Error('doorlock(): Rogue level doorway not ported yet');
        if (await obstructed(x, y, mysterywand))
            return false;
        /* Don't allow doors to close over traps.  This is for pits */
        /* & trap doors, but is it ever OK for anything else? */
        if (t_at(x, y)) {
            /* maketrap() clears doormask, so it should be NODOOR */
            await pline(`${dustcloud} springs up in the doorway, but ${
                quickly_dissipates}.`);
            return false;
        }

        switch ((door.doormask || 0) & ~D_TRAPPED) {
        case D_CLOSED:
            msg = "The door locks!";
            break;
        case D_ISOPEN:
            msg = "The door swings shut, and locks!";
            break;
        case D_BROKEN:
            msg = "The broken door reassembles and locks!";
            break;
        case D_NODOOR:
            msg =
               "A cloud of dust springs up and assembles itself into a door!";
            break;
        default:
            res = false;
            break;
        }
        block_point(x, y);
        door.doormask = D_LOCKED | ((door.doormask || 0) & D_TRAPPED);
        newsym(x, y);
        break;
    case WAN_OPENING:
    case SPE_KNOCK:
        if ((door.doormask || 0) & D_LOCKED) {
            msg = "The door unlocks!";
            door.doormask = D_CLOSED | ((door.doormask || 0) & D_TRAPPED);
        } else
            res = false;
        break;
    case WAN_STRIKING:
    case SPE_FORCE_BOLT:
        if ((door.doormask || 0) & (D_LOCKED | D_CLOSED)) {
            /* sawit: closed door location is more visible than open */
            let sawit, seeit;

            if ((door.doormask || 0) & D_TRAPPED) {
                const mtmp = m_at_lk(x, y);

                sawit = mtmp ? canseemon_lk(mtmp) : cansee(x, y);
                door.doormask = D_NODOOR_LK;
                unblock_point_lk(x, y);
                newsym(x, y);
                seeit = mtmp ? canseemon_lk(mtmp) : cansee(x, y);
                if (mtmp) {
                    await mb_trapped_lk(mtmp, sawit || seeit);
                } else {
                    /* for mtmp, mb_trapped() does is own wake_nearto() */
                    loudness = 40;
                    if (game.flags.verbose) {
                        /* Soundeffect(se_kaboom_door_explodes, 75); */
                        if ((sawit || seeit) && !Unaware()) {
                            await pline("KABOOM!!  You see a door explode.");
                        } else if (!Deaf()) {
                            /* Soundeffect(se_explosion, 75); */
                            await You_hear(`a ${
                                (dist2_lk(x, y, game.u.ux, game.u.uy) > 7 * 7)
                                    ? "distant" : "nearby"} explosion.`);
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
                    await pline_The("door crashes open!");
                } else if (!Deaf()) {
                    /* Soundeffect(se_crashing_sound, 100) */
                    await You_hear("a crashing sound.");
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

// C ref: lock.c breakchestlock()
export async function breakchestlock(box, destroyit) {
    const u = game.u;
    if (!destroyit) { /* bill for the box but not for its contents */
        const hide_contents = box.cobj;

        box.cobj = null;
        costly_alteration(box, COST_BRKLCK);
        box.cobj = hide_contents;
        box.olocked = 0;
        box.obroken = 1;
        box.lknown = 1;
    } else { /* #force has destroyed this box (at <u.ux,u.uy>) */
        let otmp;
        const ushops0 = (u.ushops || '').charCodeAt(0) || 0; /* *u.ushops */
        const shkp = (ushops0 && costly_spot(u.ux, u.uy))
                     ? shop_keeper(ushops0) : null;
        const costly = !!shkp,
            peaceful_shk = costly && !!shkp.mpeaceful;
        let loss = 0;

        await pline(`In fact, you've totally destroyed ${the(xname(box))}.`);
        /* Put the contents on ground at the hero's feet. */
        while ((otmp = (box.cobj && box.cobj.length) ? box.cobj[0] : null) != null) {
            obj_extract_self(otmp);
            if (!rn2(3) || otmp.oclass === POTION_CLASS) {
                await chest_shatter_msg(otmp);
                if (costly)
                    loss += await stolen_value(otmp, u.ux, u.uy, peaceful_shk,
                                               true);
                if (otmp.quan === 1) {
                    obfree(otmp, null);
                    continue;
                }
                /* this works because we're sure to have at least 1 left;
                   otherwise it would fail since otmp is not in inventory */
                useup(otmp);
            }
            if (box.otyp === ICE_BOX && otmp.otyp === CORPSE) {
                otmp.age = game.moves - otmp.age; /* actual age */
                start_corpse_timeout(otmp);
            }
            place_object(otmp, u.ux, u.uy);
            stackobj(otmp);
        }
        if (costly)
            loss += await stolen_value(box, u.ux, u.uy, peaceful_shk, true);
        if (loss)
            await You(`owe ${loss} ${currency(loss)} for objects destroyed.`);
        delobj(box);
    }
}

// C ref: lock.c forcelock() -- try to force a locked chest (occupation
// callback)
async function forcelock() {
    const u = game.u;
    const xl = xlock();
    const uwep = game.uwep;

    if ((xl.box.ox !== u.ux) || (xl.box.oy !== u.uy))
        return (xl.usedtime = 0); /* you or it moved */

    if (xl.usedtime++ >= 50 || !uwep || nohands(game.youmonst.data)) {
        await You("give up your attempt to force the lock.");
        if (xl.usedtime >= 50) /* you made the effort */
            await exercise((xl.picktyp) ? A_DEX : A_STR, true);
        return (xl.usedtime = 0);
    }

    if (xl.picktyp) { /* blade */
        if (rn2(1000 - (uwep.spe || 0)) > (992 - greatest_erosion(uwep) * 10)
            && !uwep.cursed && !obj_resists(uwep, 0, 99)) {
            /* for a +0 weapon, probability that it survives an unsuccessful
             * attempt to force the lock is (.992)^50 = .67
             */
            await pline(`${(uwep.quan > 1) ? "One of y" : "Y"}our ${
                xname(uwep)} broke!`);
            useup(uwep);
            await You("give up your attempt to force the lock.");
            await exercise(A_DEX, true);
            return (xl.usedtime = 0);
        }
    } else             /* blunt */
        await wake_nearby(false); /* due to hammering on the container */

    if (rn2(100) >= xl.chance)
        return 1; /* still busy */

    await You("succeed in forcing the lock.");
    await exercise(xl.picktyp ? A_DEX : A_STR, true);
    /* breakchestlock() might destroy xlock.box; if so, xlock context will
       be cleared (delobj -> obfree -> maybe_reset_pick); but it might not,
       so explicitly clear that manually */
    await breakchestlock(xl.box, (!xl.picktyp && !rn2(3)));
    reset_pick(); /* lock-picking context is no longer valid */

    return 0;
}

// C ref: lock.c u_have_forceable_weapon() -- is hero wielding a weapon
// that can #force?
export function u_have_forceable_weapon() {
    const uwep = game.uwep;
    if (!uwep /* proper type test */
        || ((uwep.oclass === WEAPON_CLASS || is_weptool(uwep))
            ? (objects[uwep.otyp].oc_skill < P_DAGGER
               || objects[uwep.otyp].oc_skill === P_FLAIL
               || objects[uwep.otyp].oc_skill > P_LANCE)
            : uwep.oclass !== ROCK_CLASS))
        return false;
    return true;
}

// C ref: lock.c doforce() -- the #force command - try to force a chest
// with your weapon
export async function doforce() {
    const u = game.u;
    const xl = xlock();
    const uwep = game.uwep;
    let c, picktyp;

    /*
     * TODO?
     *  allow force with edged weapon to be performed on doors.
     */

    if (u.uswallow) {
        await You_cant("force anything from inside here.");
        return ECMD_OK;
    }
    if (!u_have_forceable_weapon()) {
        const use_plural = uwep && uwep.quan > 1;

        await You_cant(`force anything ${
            !uwep ? "when not wielding a"
            : (uwep.oclass !== WEAPON_CLASS && !is_weptool(uwep))
              ? (use_plural ? "without proper" : "without a proper")
              : (use_plural ? "with those" : "with that")} weapon${
            use_plural ? "s" : ""}.`);
        return ECMD_OK;
    }
    if (!can_reach_floor(true)) {
        await cant_reach_floor(u.ux, u.uy, false, true, false);
        return ECMD_OK;
    }

    picktyp = (is_blade(uwep) && !is_pick(uwep)) ? 1 : 0;
    if (xl.usedtime && xl.box && picktyp === xl.picktyp) {
        await You("resume your attempt to force the lock.");
        set_occupation(forcelock, "forcing the lock", 0);
        return ECMD_TIME;
    }

    /* A lock is made only for the honest man, the thief will break it. */
    xl.box = null;
    /* svl.level.objects[u.ux][u.uy] via ->nexthere */
    const here = level_objects_at(u.ux, u.uy);
    for (const otmp of here)
        if (Is_box(otmp)) {
            if (otmp.obroken || !otmp.olocked) {
                /* force doname() to omit known "broken" or "unlocked"
                   prefix so that the message isn't worded redundantly;
                   since we're about to set lknown, there's no need to
                   remember and then reset its current value */
                otmp.lknown = 0;
                await There(`is ${doname(otmp)} here, but its lock is already ${
                    otmp.obroken ? "broken" : "unlocked"}.`);
                otmp.lknown = 1;
                continue;
            }
            const qbuf = safe_qbuf("There is ", " here; force its lock?",
                                   otmp, doname, "a box");
            otmp.lknown = 1;

            c = await ynq(qbuf);
            if (c === 'q')
                return ECMD_OK;
            if (c === 'n')
                continue;

            if (picktyp)
                await You(`force ${yname(uwep)} into a crack and pry.`);
            else
                await You(`start bashing it with ${yname(uwep)}.`);
            xl.box = otmp;
            xl.chance = objects[uwep.otyp].oc_wldam * 2;
            xl.picktyp = picktyp;
            xl.magic_key = false;
            xl.usedtime = 0;
            break;
        }

    if (xl.box)
        set_occupation(forcelock, "forcing the lock", 0);
    else
        await You("decide not to force the issue.");
    return ECMD_TIME;
}

// C ref: lock.c doclose() -- try to close a door
export async function doclose() {
    const u = game.u;
    let x, y;
    let res = ECMD_OK;

    if (nohands(game.youmonst.data)) {
        await You_cant("close anything -- you have no hands!");
        return ECMD_OK;
    }

    if (u.utrap && u.utraptype === TT_PIT) {
        await You_cant("reach over the edge of the pit.");
        return ECMD_OK;
    }

    if (!(await getdir(null)))
        return ECMD_CANCEL;

    x = u.ux + u.dx;
    y = u.uy + u.dy;
    if (u.ux === x && u.uy === y && !Passes_walls()) {
        await You("are in the way!");
        return ECMD_TIME;
    }

    if (!isok(x, y)) {
        /* goto nodoor */
        await You(`${Blind() ? "feel" : "see"} no door there.`);
        return res;
    }

    if (await stumble_on_door_mimic(x, y))
        return ECMD_TIME;

    /* when choosing a direction is impaired, use a turn
       regardless of whether a door is successfully targeted */
    if (Confusion() || Stunned())
        res = ECMD_TIME;

    const door = game.level.at(x, y);
    const portcullis = (is_drawbridge_wall(x, y) >= 0);
    if (Blind()) {
        const oldglyph = door.remembered_glyph; /* door->glyph */
        const oldlastseentyp = update_mapseen_for(x, y);

        feel_location(x, y);
        if (!same_glyph(door.remembered_glyph, oldglyph)
            || (game.level.lastseentyp?.[x]?.[y] ?? 0) !== oldlastseentyp)
            res = ECMD_TIME; /* learned something */
    }

    if (portcullis || !IS_DOOR(door.typ)) {
        /* is_db_wall: closed portcullis */
        if (door.typ === DBWALL || door.typ === DRAWBRIDGE_UP)
            await pline_The("drawbridge is already closed.");
        else if (portcullis || door.typ === DRAWBRIDGE_DOWN)
            await There("is no obvious way to close the drawbridge.");
        else {
            /* nodoor: */
            await You(`${Blind() ? "feel" : "see"} no door there.`);
        }
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
        if (game.youmonst.data.msize < MZ_SMALL /* verysmall() */ && !u.usteed) {
            await pline("You're too small to push the door closed.");
            return res;
        }
        if (u.usteed
            || rn2(25) < Math.trunc((acurrstr() + ACURR(A_DEX) + ACURR(A_CON)) / 3)) {
            await pline_The("door closes.");
            door.doormask = D_CLOSED;
            feel_newsym(x, y); /* the hero knows she closed it */
            block_point(x, y); /* vision:  no longer see there */
        } else {
            await exercise(A_STR, true);
            await pline_The("door resists!");
        }
    }

    return ECMD_TIME;
}


// C ref: lock.c chest_shatter_msg()
async function chest_shatter_msg(otmp) {
    let disposition;

    if (otmp.oclass === POTION_CLASS) {
        await You(`${Blind() ? "hear" : "see"} ${an(bottlename())} shatter!`);
        if (!breathless(game.youmonst.data) || haseyes(game.youmonst.data))
            await potionbreathe(otmp);
        return;
    }
    /* We have functions for distant and singular names, but not one */
    /* which does _both_... */
    const bl = game.u.uprops[BLINDED];
    const save_HBlinded = bl.intrinsic, save_BBlinded = bl.blocked;
    bl.intrinsic = 1, bl.blocked = 0;
    const thing = singular(otmp, xname);
    bl.intrinsic = save_HBlinded, bl.blocked = save_BBlinded;
    switch (objects[otmp.otyp].oc_material) {
    case PAPER:
        disposition = "is torn to shreds";
        break;
    case WAX:
        disposition = "is crushed";
        break;
    case VEGGY:
        disposition = "is pulped";
        break;
    case FLESH:
        disposition = "is mashed";
        break;
    case GLASS:
        disposition = "shatters";
        break;
    case WOOD:
        disposition = "splinters to fragments";
        break;
    default:
        disposition = "is destroyed";
        break;
    }
    await pline(`${An(thing)} ${disposition}!`);
}

