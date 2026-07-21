// lock.js — Lock picking, door open/close.
// C ref: lock.c pick_lock / picklock / doopen_indir / doclose (subset).

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { flush_screen, pline, newsym } from './display.js';
import { vision_recalc, recalc_block_point } from './vision.js';
import {
    COLNO, ROWNO, IS_DOOR, ECMD_OK, ECMD_TIME, OBJ_FLOOR, OBJ_FREE,
    D_NODOOR, D_BROKEN, D_ISOPEN, D_CLOSED, D_LOCKED, D_TRAPPED,
    P_DAGGER, P_FLAIL, P_LANCE, P_PICK_AXE, P_SABER, P_NONE,
    AUTOUNLOCK_APPLY_KEY, STRAT_WAITMASK, TT_PIT, M_AP_TYPE,
    M_AP_FURNITURE, M_AP_OBJECT, FINGER,
} from './const.js';
import { rnl, rn2 } from './rng.js';
import { acurr, acurrstr, A_STR, A_DEX, A_CON, exercise } from './attrib.js';
import { verysmall, nohands, passes_walls, G_UNIQ } from './monsters.js';
import {
    objects_at, place_object, stackobj, obj_extract_self, delobj,
} from './mkobj.js';
import { can_reach_floor, set_occupation } from './engrave.js';
import {
    WEAPON_CLASS, ROCK_CLASS, TOOL_CLASS, POTION_CLASS, objectNames,
} from './objects.js';
import { doname, xname, cxname, singular } from './objnam.js';
import { obj_resists } from './dogmove.js';
import { setuwep } from './wield.js';
import { PM_ROGUE } from './generated/monsters_data.js';
import { m_at } from './mon.js';
import { getdir_cmdassist } from './dothrow.js';
import { b_trapped } from './trap.js';

const DIR_DX = { h: -1, l: 1, j: 0, k: 0, y: -1, u: 1, b: -1, n: 1 };
const DIR_DY = { h: 0, l: 0, j: 1, k: -1, y: -1, u: -1, b: 1, n: 1 };

const LOCK_PICK = objectNames.indexOf('LOCK_PICK');
const SKELETON_KEY = objectNames.indexOf('SKELETON_KEY');
const CREDIT_CARD = objectNames.indexOf('CREDIT_CARD');
const CHEST = objectNames.indexOf('CHEST');

// C: PICKLOCK_* return codes
const PICKLOCK_LEARNED_SOMETHING = -1;
const PICKLOCK_DID_NOTHING = 0;
const PICKLOCK_DID_SOMETHING = 1;

function Role_if(pm) {
    return (game.urole?.mnum ?? -1) === pm;
}

/** C ref: objnam.c yname — invent → "your ", else "the ". */
function yname(obj) {
    const carried = (game.invent || []).includes(obj);
    return `${carried ? 'your' : 'the'} ${cxname(obj)}`;
}

/** C ref: lock.c reset_pick */
function reset_pick() {
    if (!game.xlock) game.xlock = {};
    const xl = game.xlock;
    xl.usedtime = 0;
    xl.chance = 0;
    xl.picktyp = 0;
    xl.magic_key = false;
    xl.door = null;
    xl.door_x = 0;
    xl.door_y = 0;
    xl.box = null;
}

/**
 * C ref: lock.c lock_action — occupation string for picklock.
 */
function lock_action() {
    const xl = game.xlock || {};
    // C: actions[] +2 → "locking …" when target currently unlocked
    if (xl.door && !(xl.door.doormask & D_LOCKED)) {
        return 'locking the door';
    }
    if (xl.box && !xl.box.olocked) {
        return xl.box.otyp === CHEST ? 'locking the chest' : 'locking the box';
    }
    if (xl.picktyp === LOCK_PICK || xl.picktyp === CREDIT_CARD) {
        return 'picking the lock';
    }
    if (xl.door) return 'unlocking the door';
    if (xl.box) {
        return xl.box.otyp === CHEST ? 'unlocking the chest' : 'unlocking the box';
    }
    return 'picking the lock';
}

/**
 * C ref: lock.c autokey — invent key/pick/card for autounlock.
 * Quest-artifact preference / is_magic_key ranking deferred.
 */
export function autokey(opening) {
    let key = null;
    let pick = null;
    let card = null;
    for (const o of game.invent || []) {
        if (!o) continue;
        if (o.otyp === SKELETON_KEY) {
            if (!key) key = o;
        } else if (o.otyp === LOCK_PICK) {
            if (!pick) pick = o;
        } else if (o.otyp === CREDIT_CARD) {
            if (!card) card = o;
        }
    }
    if (!opening) card = null;
    return key || pick || card || null;
}

/**
 * C ref: lock.c is_magic_key — Master Key bless/curse; ordinary tools false.
 * Full artifact Master Key body deferred (no oartifact check here).
 */
function is_magic_key(_mon, _obj) {
    return false;
}

/**
 * C ref: lock.c picking_lock — occupation is picklock; fills door cell.
 * @param {{ x: number, y: number }} out
 * @returns {boolean}
 */
export function picking_lock(out) {
    if (game.occupation === picklock) {
        const u = game.u || {};
        out.x = (u.ux | 0) + (u.dx | 0);
        out.y = (u.uy | 0) + (u.dy | 0);
        return true;
    }
    out.x = 0;
    out.y = 0;
    return false;
}

/**
 * C ref: lock.c picklock — occupation callback; rn2(100) vs xlock.chance.
 * Door + floor-box paths. Deferred: magic-key trap disarm yn, b_trapped
 * door destroy, chest_trap on trapped box unlock.
 * @returns {number} 1 = still busy, 0 = done (C occupation continue)
 */
async function picklock() {
    const xl = game.xlock || {};
    const u = game.u || {};

    if (xl.box) {
        // C: box still on floor under hero
        if (xl.box.where !== OBJ_FLOOR
            || (xl.box.ox | 0) !== (u.ux | 0)
            || (xl.box.oy | 0) !== (u.uy | 0)) {
            xl.usedtime = 0;
            return 0;
        }
    } else {
        const dx = (u.dx | 0);
        const dy = (u.dy | 0);
        const tx = (u.ux | 0) + dx;
        const ty = (u.uy | 0) + dy;
        const door = game.level?.at(tx, ty);
        // C: door pointer identity — you moved away from the target door
        if (!door || door !== xl.door) {
            xl.usedtime = 0;
            return 0;
        }
        switch (door.doormask || 0) {
        case D_NODOOR:
            await pline('This doorway has no door.');
            xl.usedtime = 0;
            return 0;
        case D_ISOPEN:
            await pline('You cannot lock an open door.');
            xl.usedtime = 0;
            return 0;
        case D_BROKEN:
            await pline('This door is broken.');
            xl.usedtime = 0;
            return 0;
        default:
            break;
        }
    }

    xl.usedtime = (xl.usedtime || 0) + 1;
    if (xl.usedtime >= 50 || nohands(game.youmonst?.data)) {
        await pline(`You give up your attempt at ${lock_action()}.`);
        exercise(A_DEX, true);
        xl.usedtime = 0;
        return 0;
    }

    // C ref: lock.c picklock — if (rn2(100) >= gx.xlock.chance) still busy
    if (rn2(100) >= (xl.chance | 0)) {
        return 1;
    }

    // magic_key trap find / disarm deferred (ordinary pick → magic_key false)
    await pline(`You succeed in ${lock_action()}.`);
    if (xl.door) {
        const dx = (u.dx | 0);
        const dy = (u.dy | 0);
        const tx = (u.ux | 0) + dx;
        const ty = (u.uy | 0) + dy;
        const door = xl.door;
        if (door.doormask & D_TRAPPED) {
            // C: b_trapped("door", FINGER) → D_NODOOR + unblock
            door.doormask = D_NODOOR;
            await b_trapped('door', FINGER);
            recalc_block_point(tx, ty);
            vision_recalc(1);
        } else if (door.doormask & D_LOCKED) {
            door.doormask = D_CLOSED;
        } else {
            door.doormask = D_LOCKED;
        }
        // C: locked↔closed still blocks vision — no unblock_point
        newsym(tx, ty);
    } else if (xl.box) {
        // C: toggle olocked; chest_trap(FINGER) deferred when otrapped
        xl.box.olocked = !xl.box.olocked;
        xl.box.lknown = 1;
    }
    exercise(A_DEX, true);
    xl.usedtime = 0;
    return 0;
}

/** C ref: cmd.c getdir — movement key → u.dx/u.dy; default prompt. */
export async function getdir(prompt) {
    const msg = prompt || 'In what direction?';
    game._pending_message = `${msg} `;
    await flush_screen(1);
    const disp = game.nhDisplay;
    if (disp?.setCursor) {
        disp.setCursor(game._pending_message.length, 0);
    }
    const key = await nhgetch();
    const ch = String.fromCharCode(key);
    // Clear yn prompt before returning to the command loop (next capture).
    game._pending_message = '';
    // C ref: cmd.c getdir — NHKF_GETDIR_SELF / SELF2 → dx=dy=dz=0
    // (JS previously treated '.' like ESC/cancel; that desynced #chat.)
    if (key === 27 || ch === ' ' || ch === '\n' || ch === '\r') {
        return false;
    }
    if (!game.u) game.u = {};
    if (ch === '.') {
        game.u.dx = 0;
        game.u.dy = 0;
        game.u.dz = 0;
        return true;
    }
    if (!(ch in DIR_DX)) {
        return false;
    }
    game.u.dx = DIR_DX[ch];
    game.u.dy = DIR_DY[ch];
    game.u.dz = 0;
    return true;
}

/** C ref: cmd.c get_adjacent_loc — getdir (cmdassist) then adjacent cell. */
async function get_adjacent_loc(prompt, emsg) {
    // C: getdir(prompt) — invalid key → help_dir cmdassist then fail
    const dir = await getdir_cmdassist(prompt);
    if (!dir) {
        await pline('Never mind.');
        return null;
    }
    if (!game.u) game.u = {};
    game.u.dx = dir.dx | 0;
    game.u.dy = dir.dy | 0;
    game.u.dz = 0;
    const x = (game.u.ux || 0) + (game.u.dx || 0);
    const y = (game.u.uy || 0) + (game.u.dy || 0);
    if (x < 1 || x >= COLNO || y < 0 || y >= ROWNO) {
        if (emsg) await pline(emsg);
        return null;
    }
    return { x, y };
}

/**
 * C ref: lock.c doopen — #open / `o` command.
 * @returns {Promise<boolean>} true when C would return ECMD_TIME
 */
export async function doopen() {
    return doopen_indir(0, 0);
}

/**
 * C ref: lock.c doopen_indir — open a CLOSED door at (x,y).
 * Autoopen callers pass door coordinates (x > 0). Interactive `o`
 * uses get_adjacent_loc → getdir ("In what direction?").
 * Named omissions: loot-at-feet (u_at → doloot); pit reach; door-mimic
 * stumble; Confusion/Stunned always-TIME; portcullis/drawbridge;
 * feel_newsym mapseen gating; AUTOUNLOCK_KICK canned dokick.
 * Returns true when C would return ECMD_TIME (open attempt / lock setup).
 */
export async function doopen_indir(x, y) {
    // C: nohands(gy.youmonst.data) before getdir
    if (nohands(game.youmonst?.data)) {
        await pline("You can't open anything -- you have no hands!");
        return false;
    }

    let cc;
    // C: x > 0 && y >= 0 → caller supplied coords (autoopen); else getdir
    if (x > 0 && y >= 0) {
        cc = { x, y };
    } else {
        // C: get_adjacent_loc(dirprompt, NULL, u.ux, u.uy, &cc)
        // dirprompt NULL unless pit+container ("Open where? [.>]") — deferred
        cc = await get_adjacent_loc(null, null);
        if (!cc) return false; // Never mind. already plined
    }

    // C: u_at(cc) && (u.dz > 0 || !closed_door) → doloot() — deferred
    // C: u.utrap TT_PIT reach — deferred
    // C: stumble_on_door_mimic — deferred

    const loc = game.level?.at(cc.x, cc.y);
    if (!loc || !IS_DOOR(loc.typ)) {
        await pline('You see no door there.');
        return false;
    }
    // Rebind for door body below (autoopen used bare x,y)
    x = cc.x;
    y = cc.y;

    const mask = loc.doormask || 0;
    if (!(mask & D_CLOSED)) {
        let mesg;
        let locked = false;
        if (mask === D_BROKEN) mesg = ' is broken';
        else if (mask === D_NODOOR) mesg = 'way has no door';
        else if (mask === D_ISOPEN) mesg = ' is already open';
        else {
            mesg = ' is locked';
            locked = true;
        }
        await pline(`This door${mesg}.`);
        // C ref: lock.c doopen_indir — locked && flags.autounlock → pick_lock
        if (locked) {
            if (!game.flags) game.flags = {};
            // C options.c default AUTOUNLOCK_APPLY_KEY when unset
            const au = game.flags.autounlock ?? AUTOUNLOCK_APPLY_KEY;
            if (au) {
                const u = game.u || {};
                u.dz = 0;
                if ((au & AUTOUNLOCK_APPLY_KEY) !== 0) {
                    const unlocktool = autokey(true);
                    if (unlocktool) {
                        const pl = await pick_lock(unlocktool, x, y, null);
                        return pl !== 0;
                    }
                }
                // AUTOUNLOCK_KICK canned dokick deferred
            }
        }
        return false;
    }

    if (verysmall(game.youmonst?.data)) {
        await pline("You're too small to pull the door open.");
        return false;
    }

    // C: rnl(20) < (ACURRSTR + ACURR(A_DEX) + ACURR(A_CON)) / 3
    const chance = Math.trunc(
        (acurrstr() + acurr(A_DEX) + acurr(A_CON)) / 3,
    );
    if (rnl(20) < chance) {
        await pline('The door opens.');
        if (mask & D_TRAPPED) {
            // C: b_trapped("door", FINGER) → D_NODOOR
            loc.doormask = D_NODOOR;
            await b_trapped('door', FINGER);
        } else {
            loc.doormask = D_ISOPEN;
        }
        newsym(x, y);
        // C: feel_location + recalc_block_point(cc) then vision via full recalc
        recalc_block_point(x, y);
        vision_recalc(1);
    } else {
        exercise(A_STR, true);
        await pline('The door resists!');
    }
    return true;
}

/**
 * C ref: lock.c obstructed — mon/obj blocks closing a door.
 * Named omissions: worm-tail phrasing; map_invisible; Something vs Some_Monnam.
 */
async function obstructed_close(x, y) {
    const mtmp = m_at(x, y);
    if (mtmp && M_AP_TYPE(mtmp) !== M_AP_FURNITURE) {
        if (M_AP_TYPE(mtmp) === M_AP_OBJECT) {
            await pline("Something's in the way.");
            return true;
        }
        await pline('Something blocks the way!');
        return true;
    }
    if ((objects_at(x, y) || []).length > 0) {
        await pline("Something's in the way.");
        return true;
    }
    return false;
}

/**
 * C ref: lock.c doclose — #close / `c` command.
 * Envelope: nohands/pit gates, getdir (cmdassist), door mask arms, close roll.
 * Named omissions: stumble_on_door_mimic; Blind feel_location/mapseen;
 * Confusion/Stunned always-TIME; portcullis/drawbridge; steed close path;
 * feel_newsym mapseen gating; Some_Monnam obstructed polish.
 * @returns {Promise<boolean>} true when C would return ECMD_TIME
 */
export async function doclose() {
    if (nohands(game.youmonst?.data)) {
        await pline("You can't close anything -- you have no hands!");
        return false;
    }
    const u = game.u || {};
    if (u.utrap && (u.utraptype | 0) === TT_PIT) {
        await pline("You can't reach over the edge of the pit.");
        return false;
    }

    // C: getdir(NULL) — cmdassist NHW_TEXT on invalid key, then cancel
    const dir = await getdir_cmdassist(null);
    if (!dir) return false;
    u.dx = dir.dx;
    u.dy = dir.dy;
    u.dz = 0;

    const x = (u.ux | 0) + (dir.dx | 0);
    const y = (u.uy | 0) + (dir.dy | 0);
    const Passes_walls = !!(u.Passes_walls
        || passes_walls(game.youmonst?.data));
    if (x === (u.ux | 0) && y === (u.uy | 0) && !Passes_walls) {
        await pline('You are in the way!');
        return true;
    }

    let res = false; // C: res starts ECMD_OK; Confusion→TIME deferred
    if (x < 1 || x >= COLNO || y < 0 || y >= ROWNO) {
        await pline('You see no door there.');
        return res;
    }

    const loc = game.level?.at(x, y);
    if (!loc || !IS_DOOR(loc.typ)) {
        // C: portcullis/drawbridge arms deferred
        await pline('You see no door there.');
        return res;
    }

    const mask = loc.doormask || 0;
    if (mask === D_NODOOR) {
        await pline('This doorway has no door.');
        return res;
    }
    if (await obstructed_close(x, y)) return res;
    if (mask === D_BROKEN) {
        await pline('This door is broken.');
        return res;
    }
    if (mask & (D_CLOSED | D_LOCKED)) {
        await pline('This door is already closed.');
        return res;
    }

    if (mask === D_ISOPEN) {
        if (verysmall(game.youmonst?.data) && !u.usteed) {
            await pline("You're too small to push the door closed.");
            return res;
        }
        // C: u.usteed || rn2(25) < (ACURRSTR + A_DEX + A_CON) / 3
        const chance = Math.trunc(
            (acurrstr() + acurr(A_DEX) + acurr(A_CON)) / 3,
        );
        if (u.usteed || rn2(25) < chance) {
            await pline('The door closes.');
            loc.doormask = D_CLOSED;
            newsym(x, y);
            recalc_block_point(x, y); // C: block_point
            vision_recalc(1);
        } else {
            exercise(A_STR, true);
            await pline('The door resists!');
        }
    }
    return true; // C: return ECMD_TIME after open-door arm
}

/**
 * C ref: lock.c pick_lock — door + floor-box autounlock (APPLY_KEY).
 * Deferred: AUTOUNLOCK_UNTRAP, interactive non-autounlock multi-box menu,
 * touch_artifact, magic-key ranking, lava/pool underfoot gates.
 * @param {object} pick key / lock pick / credit card
 * @param {number} [rx=0] autounlock x (0 → prompt getdir)
 * @param {number} [ry=0] autounlock y
 * @param {object|null} [container=null] box for #loot autounlock
 * @returns {number} PICKLOCK_* ; caller maps != 0 to ECMD_TIME
 */
export async function pick_lock(pick, rx = 0, ry = 0, container = null) {
    const picktyp = pick?.otyp ?? 0;
    const autounlock = (rx !== 0 || container != null);

    // C: resume interrupted attempt when usedtime && same picktyp
    if ((game.xlock?.usedtime | 0) && picktyp === game.xlock.picktyp) {
        if (nohands(game.youmonst?.data)) {
            await pline('Unfortunately, you can no longer hold the pick.');
            reset_pick();
            return PICKLOCK_LEARNED_SOMETHING;
        }
        const action = lock_action();
        await pline(`You resume your attempt at ${action}.`);
        game.xlock.magic_key = is_magic_key(null, pick);
        set_occupation(picklock, action, 0);
        return PICKLOCK_DID_SOMETHING;
    }

    if (nohands(game.youmonst?.data)) {
        await pline(`You can't hold ${doname(pick)} -- you have no hands!`);
        return PICKLOCK_DID_NOTHING;
    }

    let cc;
    if (rx !== 0) {
        cc = { x: rx, y: ry };
    } else {
        cc = await get_adjacent_loc(null, 'Invalid location!');
        if (!cc) return PICKLOCK_DID_NOTHING;
    }

    const u = game.u || {};
    let ch = 0;

    if (cc.x === u.ux && cc.y === u.uy) {
        // C ref: lock.c pick_lock — underfoot box path
        let c = 'n';
        let count = 0;
        for (let otmp = objects_at(cc.x, cc.y); otmp; otmp = otmp.nexthere) {
            if (autounlock && otmp !== container) continue;
            if (!Is_box(otmp)) continue;
            count++;
            if (!can_reach_floor(true)) {
                await pline(`You can't reach ${the(xname(otmp))} from up here.`);
                return PICKLOCK_LEARNED_SOMETHING;
            }
            // AUTOUNLOCK_UNTRAP trap-check deferred
            if (autounlock) {
                const au = game.flags?.autounlock ?? AUTOUNLOCK_APPLY_KEY;
                if ((au & AUTOUNLOCK_APPLY_KEY) !== 0) {
                    c = 'q';
                    if (pick) {
                        const { yn_function } = await import('./getline.js');
                        c = await yn_function(
                            `Unlock it with ${yname(pick)}?`,
                            'ynq',
                            'q',
                        );
                    }
                    if (c !== 'y') return PICKLOCK_DID_NOTHING;
                } else {
                    return PICKLOCK_DID_NOTHING;
                }
            } else {
                // interactive apply-to-box ynq deferred
                await pline("There doesn't seem to be any sort of lock here.");
                return PICKLOCK_LEARNED_SOMETHING;
            }

            if (otmp.obroken) {
                await pline(
                    `You can't fix its broken lock with ${yname(pick)}.`,
                );
                return PICKLOCK_LEARNED_SOMETHING;
            }
            if (picktyp === CREDIT_CARD && !otmp.olocked) {
                await pline(
                    `You can't do that with ${an(simple_typename(picktyp))}.`,
                );
                return PICKLOCK_LEARNED_SOMETHING;
            }

            // C: box chance — differs from door (4*DEX+25 rogue pick)
            switch (picktyp) {
            case CREDIT_CARD:
                ch = acurr(A_DEX) + 20 * (Role_if(PM_ROGUE) ? 1 : 0);
                break;
            case LOCK_PICK:
                ch = 4 * acurr(A_DEX) + 25 * (Role_if(PM_ROGUE) ? 1 : 0);
                break;
            case SKELETON_KEY:
                ch = 75 + acurr(A_DEX);
                break;
            default:
                ch = 0;
            }
            if (otmp.cursed) ch = Math.trunc(ch / 2);

            if (!game.xlock) game.xlock = {};
            game.xlock.box = otmp;
            game.xlock.door = null;
            game.xlock.door_x = 0;
            game.xlock.door_y = 0;
            break;
        }
        if (c !== 'y') {
            if (!count) {
                await pline("There doesn't seem to be any sort of lock here.");
            }
            return PICKLOCK_LEARNED_SOMETHING;
        }
    } else {
        const loc = game.level?.at(cc.x, cc.y);
        if (!loc || !IS_DOOR(loc.typ)) {
            await pline('You see no door there.');
            return PICKLOCK_LEARNED_SOMETHING;
        }

        // C ref: lock.c pick_lock — switch (door->doormask) exact cases
        const mask = loc.doormask || 0;
        switch (mask) {
        case D_NODOOR:
            await pline('This doorway has no door.');
            return PICKLOCK_LEARNED_SOMETHING;
        case D_ISOPEN:
            await pline('You cannot lock an open door.');
            return PICKLOCK_LEARNED_SOMETHING;
        case D_BROKEN:
            await pline('This door is broken.');
            return PICKLOCK_LEARNED_SOMETHING;
        default: {
            // CLOSED / LOCKED (+ TRAPPED): ynq then occupation
            // AUTOUNLOCK_UNTRAP door check deferred
            if (picktyp === CREDIT_CARD && !(mask & D_LOCKED)) {
                await pline("You can't lock a door with a credit card.");
                return PICKLOCK_LEARNED_SOMETHING;
            }

            let qbuf = (mask & D_LOCKED) ? 'Unlock it' : 'Lock it';
            if (autounlock) qbuf += ` with ${yname(pick)}`;
            qbuf += '?';

            const { yn_function } = await import('./getline.js');
            // C: ynq → yn_function(..., ynqchars, 'q')
            const c = await yn_function(qbuf, 'ynq', 'q');
            if (c !== 'y') return PICKLOCK_DID_NOTHING;

            switch (picktyp) {
            case CREDIT_CARD:
                ch = 2 * acurr(A_DEX) + 20 * (Role_if(PM_ROGUE) ? 1 : 0);
                break;
            case LOCK_PICK:
                ch = 3 * acurr(A_DEX) + 30 * (Role_if(PM_ROGUE) ? 1 : 0);
                break;
            case SKELETON_KEY:
                ch = 70 + acurr(A_DEX);
                break;
            default:
                ch = 0;
            }

            if (!game.xlock) game.xlock = {};
            game.xlock.door = loc;
            game.xlock.door_x = cc.x;
            game.xlock.door_y = cc.y;
            game.xlock.box = null;
            break;
        }
        }
    }

    // C: svc.context.move = 0 before occupation setup
    if (!game.context) game.context = {};
    game.context.move = 0;
    game.xlock.chance = ch;
    game.xlock.picktyp = picktyp;
    game.xlock.magic_key = is_magic_key(null, pick);
    game.xlock.usedtime = 0;
    set_occupation(picklock, lock_action(), 0);
    return PICKLOCK_DID_SOMETHING;
}

/** C ref: objnam.c an / simple_typename stub for pick messages. */
function an(s) {
    if (!s) return s;
    const c = s.charAt(0).toLowerCase();
    return `${'aeiou'.includes(c) ? 'an' : 'a'} ${s}`;
}
function the(s) {
    return `the ${s}`;
}
function simple_typename(otyp) {
    const n = objectNames[otyp];
    if (!n) return 'tool';
    return n.toLowerCase().replace(/_/g, ' ');
}

/** C ref: obj.h Is_box — LARGE_BOX / CHEST. */
function Is_box(obj) {
    const n = objectNames[obj?.otyp];
    return n === 'LARGE_BOX' || n === 'CHEST';
}

/** C ref: obj.h is_weptool */
function is_weptool(obj) {
    if (!obj || obj.oclass !== TOOL_CLASS) return false;
    const sk = game.objects?.[obj.otyp]?.oc_skill;
    return sk != null && sk !== P_NONE;
}

/** C ref: obj.h is_pick */
function is_pick(obj) {
    return (game.objects?.[obj?.otyp]?.oc_skill ?? 0) === P_PICK_AXE;
}

/** C ref: obj.h is_blade */
function is_blade(obj) {
    if (!obj || obj.oclass !== WEAPON_CLASS) return false;
    const sk = game.objects?.[obj.otyp]?.oc_skill ?? 0;
    return sk >= P_DAGGER && sk <= P_SABER;
}

/** C ref: obj.h greatest_erosion — max(oeroded, oeroded2). */
function greatest_erosion(obj) {
    const a = obj?.oeroded | 0;
    const b = obj?.oeroded2 | 0;
    return a > b ? a : b;
}

/**
 * C ref: invent.c useup — invent/wield consume one (no obj_resists).
 * Floor useupf deferred; #force blade-break only hits wielded invent.
 */
function useup_invent(otmp) {
    if (!otmp) return;
    if ((otmp.quan || 1) > 1) {
        otmp.quan--;
        return;
    }
    if (game.u?.uwep === otmp) setuwep(null);
    const inv = game.invent || [];
    const idx = inv.indexOf(otmp);
    if (idx >= 0) inv.splice(idx, 1);
    otmp.quan = 0;
    otmp.where = OBJ_FREE;
}

/**
 * C ref: mon.c wake_nearby / wake_nearto_core — clear sleep/wait within
 * ulevel*20. G_UNIQ keep STRAT_WAITMASK (quest leaders stay meditating).
 * Named omissions: wake_msg; disturb_buried_zombies; petcall whistletime.
 */
function wake_nearby(_petcall) {
    const u = game.u || {};
    const x = u.ux | 0;
    const y = u.uy | 0;
    const distance = ((u.ulevel | 0) * 20) | 0;
    for (const mtmp of game.fmon || []) {
        if (!mtmp || mtmp.mx == null) continue;
        const dx = (mtmp.mx | 0) - x;
        const dy = (mtmp.my | 0) - y;
        if (distance === 0 || dx * dx + dy * dy < distance) {
            mtmp.msleeping = 0;
            const geno = mtmp.data?.geno | 0;
            if (!(geno & G_UNIQ) && mtmp.mstrategy != null) {
                mtmp.mstrategy &= ~STRAT_WAITMASK;
            }
        }
    }
    void _petcall;
}

/* C objclass.h enum obj_material_types — shatter disposition subset. */
const MAT_WAX = 2;
const MAT_VEGGY = 3;
const MAT_FLESH = 4;
const MAT_PAPER = 5;
const MAT_WOOD = 8;
const MAT_GLASS = 19;

/**
 * C ref: lock.c chest_shatter_msg — destroy-path content messages.
 * Temporarily Blind so xname does not observe_object (appearance leak).
 * potionbreathe / Blind hear-vs-see polish deferred (pline only).
 */
async function chest_shatter_msg(otmp) {
    if (otmp.oclass === POTION_CLASS) {
        await pline(`You see ${an(xname(otmp))} shatter!`);
        return;
    }
    // C: save Blind props; force Blind for singular(xname) only.
    const u = game.u || (game.u = {});
    const save_HBlinded = u.HBlinded | 0;
    const save_BBlinded = u.BBlinded | 0;
    const save_Blind = u.Blind;
    u.HBlinded = 1;
    u.BBlinded = 0;
    u.Blind = true; // JS xname checks sticky Blind (not props)
    const thing = singular(otmp, xname);
    u.HBlinded = save_HBlinded;
    u.BBlinded = save_BBlinded;
    u.Blind = save_Blind;
    const mat = game.objects?.[otmp.otyp]?.oc_material | 0;
    let disposition = 'is destroyed';
    if (mat === MAT_PAPER) disposition = 'is torn to shreds';
    else if (mat === MAT_WAX) disposition = 'is crushed';
    else if (mat === MAT_VEGGY) disposition = 'is pulped';
    else if (mat === MAT_FLESH) disposition = 'is mashed';
    else if (mat === MAT_GLASS) disposition = 'shatters';
    else if (mat === MAT_WOOD) disposition = 'splinters to fragments';
    // C: pline("%s %s!", An(thing), disposition);
    const named = an(thing);
    await pline(`${named.charAt(0).toUpperCase()}${named.slice(1)} ${disposition}!`);
}

/**
 * C ref: lock.c breakchestlock — unlock+break or destroy box + spill.
 * Named omissions: costly_alteration / stolen_value shop bill; ice-box
 * corpse age / start_corpse_timeout; potionbreathe on shatter.
 */
async function breakchestlock(box, destroyit) {
    if (!destroyit) {
        // C: costly_alteration(COST_BRKLCK) deferred
        box.olocked = 0;
        box.obroken = 1;
        box.lknown = 1;
        return;
    }
    const u = game.u || {};
    await pline(`In fact, you've totally destroyed ${the(xname(box))}.`);
    while (box.cobj) {
        const otmp = box.cobj;
        obj_extract_self(otmp);
        if (!rn2(3) || otmp.oclass === POTION_CLASS) {
            await chest_shatter_msg(otmp);
            // shop stolen_value deferred
            if ((otmp.quan || 1) === 1) {
                // C: obfree — no obj_resists
                otmp.quan = 0;
                otmp.where = OBJ_FREE;
                continue;
            }
            useup_invent(otmp);
            // remaining stack still placed below when quan>1 after useup
            if ((otmp.quan || 0) <= 0) continue;
        }
        // ICE_BOX corpse age deferred
        place_object(otmp, u.ux | 0, u.uy | 0);
        stackobj(otmp);
    }
    delobj(box);
}

/**
 * C ref: lock.c forcelock — occupation; rn2(100) vs xlock.chance.
 * Blade erosion break + blunt wake_nearby; then breakchestlock.
 * @returns {number} 1 = still busy, 0 = done
 */
async function forcelock() {
    const xl = game.xlock || {};
    const u = game.u || {};
    const box = xl.box;
    if (!box
        || (box.ox | 0) !== (u.ux | 0)
        || (box.oy | 0) !== (u.uy | 0)) {
        xl.usedtime = 0;
        return 0;
    }

    xl.usedtime = (xl.usedtime || 0) + 1;
    const uwep = u.uwep;
    if (xl.usedtime >= 50 || !uwep || nohands(game.youmonst?.data)) {
        await pline('You give up your attempt to force the lock.');
        if (xl.usedtime >= 50) {
            exercise(xl.picktyp ? A_DEX : A_STR, true);
        }
        xl.usedtime = 0;
        return 0;
    }

    if (xl.picktyp) {
        // C: blade — may break weapon (rn2 then cursed short-circuit then resist)
        if (rn2(1000 - (uwep.spe | 0)) > (992 - greatest_erosion(uwep) * 10)
            && !uwep.cursed
            && !obj_resists(uwep, 0, 99)) {
            const plural = (uwep.quan || 1) > 1;
            await pline(
                `${plural ? 'One of y' : 'Y'}our ${xname(uwep)} broke!`,
            );
            useup_invent(uwep);
            await pline('You give up your attempt to force the lock.');
            exercise(A_DEX, true);
            xl.usedtime = 0;
            return 0;
        }
    } else {
        // blunt — hammering wakes nearby monsters (no RNG)
        wake_nearby(false);
    }

    // C ref: lock.c forcelock — if (rn2(100) >= gx.xlock.chance) still busy
    if (rn2(100) >= (xl.chance | 0)) {
        return 1;
    }

    await pline('You succeed in forcing the lock.');
    exercise(xl.picktyp ? A_DEX : A_STR, true);
    // C: destroyit = !picktyp && !rn2(3) — rn2 only when blunt
    const destroyit = !xl.picktyp && !rn2(3);
    await breakchestlock(box, destroyit);
    reset_pick();
    return 0;
}

/** C ref: lock.c u_have_forceable_weapon */
function u_have_forceable_weapon() {
    const uwep = game.u?.uwep;
    if (!uwep) return false;
    if (uwep.oclass === WEAPON_CLASS || is_weptool(uwep)) {
        const sk = game.objects?.[uwep.otyp]?.oc_skill ?? 0;
        if (sk < P_DAGGER || sk === P_FLAIL || sk > P_LANCE) return false;
        return true;
    }
    return uwep.oclass === ROCK_CLASS;
}

/**
 * C ref: lock.c doforce — #force chest lock with wielded weapon.
 * Branch envelope: swallow / no-weapon / can't-reach → ECMD_OK; resume
 * interrupted forcelock; scan underfoot boxes; set_occupation(forcelock);
 * no box → "You decide not to force the issue." + ECMD_TIME.
 * Named omissions: door force with edged weapon (C TODO).
 */
export async function doforce() {
    const u = game.u;
    if (!u) return ECMD_OK;

    if (u.uswallow) {
        await pline("You can't force anything from inside here.");
        return ECMD_OK;
    }
    if (!u_have_forceable_weapon()) {
        const uwep = u.uwep;
        const use_plural = !!(uwep && (uwep.quan || 1) > 1);
        let mid;
        if (!uwep) mid = 'when not wielding a';
        else if (uwep.oclass !== WEAPON_CLASS && !is_weptool(uwep)) {
            mid = use_plural ? 'without proper' : 'without a proper';
        } else {
            mid = use_plural ? 'with those' : 'with that';
        }
        await pline(
            `You can't force anything ${mid} weapon${use_plural ? 's' : ''}.`,
        );
        return ECMD_OK;
    }
    if (!can_reach_floor(true)) {
        await pline("You can't reach the floor.");
        return ECMD_OK;
    }

    const uwep = u.uwep;
    const picktyp = !!(is_blade(uwep) && !is_pick(uwep));

    // C: resume interrupted attempt when usedtime && same picktyp
    if ((game.xlock?.usedtime | 0) && game.xlock.box && picktyp === !!game.xlock.picktyp) {
        await pline('You resume your attempt to force the lock.');
        set_occupation(forcelock, 'forcing the lock', 0);
        return ECMD_TIME;
    }

    if (!game.xlock) game.xlock = {};
    game.xlock.box = null;

    for (let otmp = objects_at(u.ux, u.uy); otmp; otmp = otmp.nexthere) {
        if (!Is_box(otmp)) continue;
        if (otmp.obroken || !otmp.olocked) {
            otmp.lknown = 0;
            await pline(
                `There is ${doname(otmp)} here, but its lock is already ${
                    otmp.obroken ? 'broken' : 'unlocked'
                }.`,
            );
            otmp.lknown = 1;
            continue;
        }
        otmp.lknown = 1;
        const { yn_function } = await import('./getline.js');
        const c = await yn_function(
            `There is ${doname(otmp)} here; force its lock?`,
            'ynq',
            'q', // C: ynq() → yn_function(..., 'q', TRUE)
        );
        if (c === 'q') return ECMD_OK;
        if (c === 'n') continue;
        if (picktyp) {
            await pline(`You force ${yname(uwep)} into a crack and pry.`);
        } else {
            await pline(`You start bashing it with ${yname(uwep)}.`);
        }
        game.xlock.box = otmp;
        // C: chance = objects[uwep->otyp].oc_wldam * 2
        game.xlock.chance = ((game.objects?.[uwep.otyp]?.oc_wldam | 0) * 2) | 0;
        game.xlock.picktyp = picktyp;
        game.xlock.magic_key = false;
        game.xlock.usedtime = 0;
        game.xlock.door = null;
        break;
    }

    if (game.xlock.box) {
        set_occupation(forcelock, 'forcing the lock', 0);
    } else {
        await pline('You decide not to force the issue.');
    }
    return ECMD_TIME;
}
