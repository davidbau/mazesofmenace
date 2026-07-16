// lock.js — Lock picking and door open.
// C ref: lock.c pick_lock / picklock / doopen_indir (door + autounlock subset).

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { flush_screen, pline, newsym } from './display.js';
import { vision_recalc, recalc_block_point } from './vision.js';
import {
    COLNO, ROWNO, IS_DOOR, ECMD_OK, ECMD_TIME, OBJ_FLOOR,
    D_NODOOR, D_BROKEN, D_ISOPEN, D_CLOSED, D_LOCKED, D_TRAPPED,
    P_DAGGER, P_FLAIL, P_LANCE, P_PICK_AXE, P_SABER, P_NONE,
    AUTOUNLOCK_APPLY_KEY,
} from './const.js';
import { rnl, rn2 } from './rng.js';
import { acurr, acurrstr, A_STR, A_DEX, A_CON, exercise } from './attrib.js';
import { verysmall, nohands } from './monsters.js';
import { objects_at } from './mkobj.js';
import { can_reach_floor, set_occupation } from './engrave.js';
import { WEAPON_CLASS, ROCK_CLASS, TOOL_CLASS, objectNames } from './objects.js';
import { doname, xname, cxname } from './objnam.js';
import { PM_ROGUE } from './generated/monsters_data.js';

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
            // C: b_trapped("door", FINGER) → D_NODOOR + unblock — deferred
            door.doormask = D_NODOOR;
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
    if (key === 27 || ch === '.' || ch === ' ' || ch === '\n' || ch === '\r') {
        return false;
    }
    if (!(ch in DIR_DX)) {
        return false;
    }
    if (!game.u) game.u = {};
    game.u.dx = DIR_DX[ch];
    game.u.dy = DIR_DY[ch];
    game.u.dz = 0;
    return true;
}

/** C ref: cmd.c get_adjacent_loc */
async function get_adjacent_loc(prompt, emsg) {
    if (!(await getdir(prompt))) {
        await pline('Never mind.');
        return null;
    }
    const x = (game.u.ux || 0) + (game.u.dx || 0);
    const y = (game.u.uy || 0) + (game.u.dy || 0);
    if (x < 1 || x >= COLNO || y < 0 || y >= ROWNO) {
        if (emsg) await pline(emsg);
        return null;
    }
    return { x, y };
}

/**
 * C ref: lock.c doopen_indir — open a CLOSED door at (x,y).
 * Autoopen callers pass the door coordinates (x > 0). Interactive
 * getdir / loot-at-feet / portcullis / canned-kick / b_trapped /
 * feel_newsym mapseen gating deferred (named in C-JS-MAP).
 * Returns true when C would return ECMD_TIME (open attempt / lock setup).
 */
export async function doopen_indir(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc || !IS_DOOR(loc.typ)) {
        await pline('You see no door there.');
        return false;
    }

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
            // b_trapped("door", FINGER) deferred — clear to D_NODOOR like C
            loc.doormask = D_NODOOR;
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
 * Branch envelope: swallow / no-weapon / can't-reach → ECMD_OK; scan
 * underfoot boxes; no box → "You decide not to force the issue." +
 * ECMD_TIME. forcelock occupation / resume deferred (C-JS-MAP).
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
    const picktyp = is_blade(uwep) && !is_pick(uwep);

    let box = null;
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
            'n',
        );
        if (c === 'q') return ECMD_OK;
        if (c === 'n') continue;
        if (picktyp) {
            await pline(`You force your ${xname(uwep)} into a crack and pry.`);
        } else {
            await pline(`You start bashing it with your ${xname(uwep)}.`);
        }
        box = otmp;
        break;
    }

    if (box) {
        // set_occupation(forcelock) deferred — still ECMD_TIME
        return ECMD_TIME;
    }
    await pline('You decide not to force the issue.');
    return ECMD_TIME;
}
