// lock.js -- Lock picking, door opening/closing, chest forcing
// cf. lock.c — picking_lock, picking_at, lock_action, picklock,
//              breakchestlock, forcelock, reset_pick, maybe_reset_pick,
//              autokey, pick_lock, u_have_forceable_weapon, doforce,
//              stumble_on_door_mimic, doopen, doopen_indir, obstructed,
//              doclose, boxlock, doorlock, chest_shatter_msg
//
// lock.c handles all lock manipulation mechanics:
//   doopen()/doclose(): #open and #close door commands.
//   pick_lock(): initiate lock-picking on door or container.
//   picklock(): occupation callback that picks the lock each turn.
//   doforce(): #force command — force a locked chest open with a weapon.
//   autokey(): find appropriate key/pick for auto-unlocking.
//   boxlock()/doorlock(): wand/spell effects on boxes and doors.

import { IS_DOOR, D_CLOSED, D_LOCKED, D_ISOPEN, D_NODOOR, A_STR, A_DEX, A_CON } from './config.js';
import { rn2, rnl } from './rng.js';
import { nhgetch, ynFunction } from './input.js';
import { exercise } from './attrib_exercise.js';
import { objectData, WEAPON_CLASS } from './objects.js';
import { doname } from './mkobj.js';
import { DIRECTION_KEYS } from './dothrow.js';
import { handleLoot } from './pickup.js';

// cf. lock.c doforce() / forcelock() — #force command: bash open a locked chest
// C ref: ARM_BONUS for weapons uses oc_wldam (JS: objectData[otyp].ldam) * 2 as chance.
export async function handleForce(game) {
    const { player, map, display } = game;

    // C ref: lock.c doforce() checks u_have_forceable_weapon()
    const wep = player.weapon;
    if (!wep || wep.oclass !== WEAPON_CLASS) {
        const msg = !wep
            ? "You can't force anything when not wielding a weapon."
            : "You can't force anything with that weapon.";
        display.putstr_message(msg);
        return { moved: false, tookTime: false };
    }

    // Find a locked box on the floor at the player's position.
    // C ref: lock.c doforce() scans level.objects[u.ux][u.uy] for Is_box().
    const floorObjs = map.objectsAt(player.x, player.y) || [];
    const box = floorObjs.find((o) => !!objectData[o?.otyp]?.container
        && o.olocked && !o.obroken);
    if (!box) {
        const anyBox = floorObjs.find((o) => !!objectData[o?.otyp]?.container);
        if (anyBox) {
            display.putstr_message(`There is ${doname(anyBox)} here, but its lock is already ${anyBox.obroken ? 'broken' : 'unlocked'}.`);
        } else {
            display.putstr_message("You decide not to force the issue.");
        }
        return { moved: false, tookTime: false };
    }

    // Prompt player.
    // C ref: lock.c doforce() ynq() prompt
    const ans = await ynFunction(`There is ${doname(box)} here; force its lock?`, 'ynq', 'n'.charCodeAt(0), display);
    const ansC = String.fromCharCode(ans);
    if (ansC === 'q' || ansC === 'n') {
        return { moved: false, tookTime: false };
    }

    // C ref: picktyp = is_blade(uwep) && !is_pick(uwep); simplified: always bash
    display.putstr_message(`You start bashing it with ${doname(wep)}.`);

    // C ref: chance = objects[uwep->otyp].oc_wldam * 2 (JS: ldam field)
    const ldam = Number(objectData[wep.otyp]?.ldam || 4);
    const chance = Math.max(2, ldam * 2);
    let usedtime = 0;

    // Set occupation: one rn2(100) check per turn.
    // C ref: lock.c forcelock() returns 1 (continue) or 0 (done).
    game.occupation = {
        occtxt: 'forcing the lock',
        fn(g) {
            if (usedtime++ >= 50) {
                display.putstr_message("You give up trying to force the lock.");
                return false;
            }
            if (rn2(100) < chance) {
                // C ref: box is destroyed after repeated successful hits
                box.olocked = false;
                box.obroken = true;
                display.putstr_message("You destroy the lock!");
                return false;
            }
            display.putstr_message("WHAM!");
            if (g.multi > 0) g.multi--;
            return true;
        },
    };
    return { moved: false, tookTime: true };
}

// Handle opening a door
// C ref: lock.c doopen()
export async function handleOpen(player, map, display, game) {
    display.putstr_message('In what direction?');
    const dirCh = await nhgetch();
    // Prompt should not concatenate with outcome message.
    display.topMessage = null;
    const c = String.fromCharCode(dirCh);
    let dir = DIRECTION_KEYS[c];
    // C ref: getdir() accepts self-direction ('.' and 's').
    if (!dir && (c === '.' || c === 's')) {
        dir = [0, 0];
    }
    if (!dir) {
        // C ref: getdir() + get_adjacent_loc() — wizard sessions (cmdassist on)
        // silently fail with just "Never mind."; non-wizard sessions emit
        // "What a strange direction!" before the caller's "Never mind."
        if (game?.player?.wizard) {
            display.putstr_message('Never mind.');
        } else {
            display.putstr_message('What a strange direction!  Never mind.');
        }
        return { moved: false, tookTime: false };
    }

    // C ref: doopen() with self-direction routes through loot handling.
    if (dir[0] === 0 && dir[1] === 0) {
        return await handleLoot(game);
    }

    const nx = player.x + dir[0];
    const ny = player.y + dir[1];
    const loc = map.at(nx, ny);

    if (!loc || !IS_DOOR(loc.typ)) {
        display.putstr_message('You see no door there.');
        return { moved: false, tookTime: false };
    }

    if (loc.flags & D_ISOPEN) {
        display.putstr_message('This door is already open.');
        return { moved: false, tookTime: false };
    }

    if (loc.flags === D_NODOOR) {
        display.putstr_message("This doorway has no door.");
        return { moved: false, tookTime: false };
    }

    if (loc.flags & D_LOCKED) {
        display.putstr_message("This door is locked.");
        return { moved: false, tookTime: false };
    }

    if (loc.flags & D_CLOSED) {
        // C ref: lock.c:904 doopen_indir — rnl(20) strength check
        const str = player.attributes ? player.attributes[A_STR] : 18;
        const dex = player.attributes ? player.attributes[A_DEX] : 11;
        const con = player.attributes ? player.attributes[A_CON] : 18;
        const threshold = Math.floor((str + dex + con) / 3);
        if (rnl(20) < threshold) {
            loc.flags = D_ISOPEN;
            display.putstr_message("The door opens.");
        } else {
            exercise(player, A_STR, true);
            display.putstr_message("The door resists!");
        }
        return { moved: false, tookTime: true };
    }

    return { moved: false, tookTime: false };
}

// Handle closing a door
// C ref: lock.c doclose()
export async function handleClose(player, map, display, game) {
    display.putstr_message('In what direction?');
    const dirCh = await nhgetch();
    display.topMessage = null;
    display.messageNeedsMore = false;
    const c = String.fromCharCode(dirCh);
    const dir = DIRECTION_KEYS[c];
    if (!dir) {
        if (typeof display.clearRow === 'function') display.clearRow(0);
        return { moved: false, tookTime: false };
    }

    const nx = player.x + dir[0];
    const ny = player.y + dir[1];
    const loc = map.at(nx, ny);

    if (!loc || !IS_DOOR(loc.typ)) {
        display.putstr_message('You see no door there.');
        return { moved: false, tookTime: false };
    }

    if (loc.flags & D_ISOPEN) {
        // Check for monsters in the doorway
        if (map.monsterAt(nx, ny)) {
            display.putstr_message("There's a monster in the way!");
            return { moved: false, tookTime: false };
        }
        loc.flags = D_CLOSED;
        display.putstr_message("The door closes.");
        return { moved: false, tookTime: true };
    }

    display.putstr_message("This door is already closed.");
    return { moved: false, tookTime: false };
}

// cf. lock.c:17 — picking_lock(x, y): check if picking a lock
// Returns true if currently picking a lock and sets x,y to the target location.
// TODO: lock.c:17 — picking_lock(): active lock-picking check

// cf. lock.c:30 — picking_at(x, y): check if picking lock at location
// Returns true if currently picking the lock at the specified location.
// TODO: lock.c:30 — picking_at(): location lock-picking check

// cf. lock.c:38 [static] — lock_action(void): current lock-picking action description
// Returns a descriptive string for the current lock-picking action.
// TODO: lock.c:38 — lock_action(): lock action description

// cf. lock.c:68 [static] — picklock(void): lock-picking occupation callback
// Occupation callback that handles the lock-picking action each turn.
// TODO: lock.c:68 — picklock(): lock-picking turn callback

// cf. lock.c:162 — breakchestlock(box, destroyit): break chest lock
// Breaks a chest's lock, optionally destroying it and scattering contents.
// TODO: lock.c:162 — breakchestlock(): chest lock breaking

// cf. lock.c:216 [static] — forcelock(void): forced lock occupation callback
// Occupation callback that handles forcing a locked chest open.
// TODO: lock.c:216 — forcelock(): chest forcing turn callback

// cf. lock.c:259 — reset_pick(void): clear lock-picking context
// Clears the lock-picking context when the activity is abandoned.
// TODO: lock.c:259 — reset_pick(): lock-picking context reset

// cf. lock.c:269 — maybe_reset_pick(container): reset pick if container gone
// Clears lock-picking context if the container was deleted or level was changed.
// TODO: lock.c:269 — maybe_reset_pick(): conditional lock-picking reset

// cf. lock.c:289 — autokey(opening): find appropriate key
// Finds an appropriate key, pick, or card for automatic lock unlocking.
// TODO: lock.c:289 — autokey(): automatic key selection

// cf. lock.c:358 — pick_lock(pick, rx, ry, container): initiate lock-picking
// Initiates lock-picking on a door or container.
// TODO: lock.c:358 — pick_lock(): lock-picking initiation

// cf. lock.c:660 — u_have_forceable_weapon(void): check for force weapon
// Returns true if the hero is wielding a weapon suitable for forcing locks.
// TODO: lock.c:660 — u_have_forceable_weapon(): forceable weapon check

// cf. lock.c:759 — stumble_on_door_mimic(x, y): detect door mimic
// Detects and triggers a door mimic at a location if present.
// TODO: lock.c:759 — stumble_on_door_mimic(): door mimic detection

// cf. lock.c:926 [static] — obstructed(x, y, quietly): check location obstruction
// Returns true if a monster or object blocks the specified location.
// TODO: lock.c:926 — obstructed(): location obstruction check

// cf. lock.c:1056 — boxlock(obj, otmp): wand/spell effect on box
// Applies spell or wand effects to a box, handling locking/unlocking.
// TODO: lock.c:1056 — boxlock(): box lock/unlock spell effect

// cf. lock.c:1103 — doorlock(otmp, x, y): wand/spell effect on door
// Applies spell or wand effects to a door, handling locking/unlocking and secret doors.
// TODO: lock.c:1103 — doorlock(): door lock/unlock spell effect

// cf. lock.c:1276 [static] — chest_shatter_msg(otmp): chest shatter message
// Prints a message describing how an item inside a destroyed chest is destroyed.
// TODO: lock.c:1276 — chest_shatter_msg(): chest destruction message
