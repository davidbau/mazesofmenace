// do.js -- Miscellaneous player actions
// cf. do.c — dodrop, dodown, doup, flooreffects, goto_level, donull, dowipe

import { nhgetch, ynFunction } from './input.js';
import { ACCESSIBLE, COLNO, ROWNO, STAIRS,
         CORR, ROOM, AIR,
         IS_FURNITURE, IS_LAVA, IS_POOL, MAGIC_PORTAL, VIBRATING_SQUARE } from './config.js';
import { rn1, rn2 } from './rng.js';
import { deltrap, enexto, makelevel } from './dungeon.js';
import { mon_arrive } from './dog.js';
import { initrack } from './monmove.js';
import { COIN_CLASS } from './objects.js';
import { doname } from './mkobj.js';
import { placeFloorObject } from './floor_objects.js';
import { uwepgone, uswapwepgone, uqwepgone } from './wield.js';
import { observeObject } from './discovery.js';
import { compactInvletPromptChars, buildInventoryOverlayLines, renderOverlayMenuUntilDismiss } from './invent.js';


// ============================================================
// Pickup message helpers (used by handlePickup in commands.js)
// ============================================================

export function formatGoldPickupMessage(gold, player) {
    const count = gold?.quan || 1;
    const plural = count === 1 ? '' : 's';
    const total = player?.gold || count;
    if (total !== count) {
        return `$ - ${count} gold piece${plural} (${total} in total).`;
    }
    return `$ - ${count} gold piece${plural}.`;
}

export function formatInventoryPickupMessage(pickedObj, inventoryObj, player) {
    const pickedCount = Number(pickedObj?.quan || 1);
    const total = Number(inventoryObj?.quan || pickedCount);
    const slot = String(inventoryObj?.invlet || pickedObj?.invlet || '?');
    let detail = doname(pickedObj, null);
    if (player?.quiver === inventoryObj) {
        detail += ' (at the ready)';
    }
    if (total > pickedCount) {
        detail += ` (${total} in total)`;
    }
    return `${slot} - ${detail}.`;
}


// ============================================================
// 1. Drop mechanics
// ============================================================

// TODO: cf. do.c dodrop() — full drop command (menu_drop, count handling)
// TODO: cf. do.c drop() — drop a single object
// TODO: cf. do.c dropx() — drop helper with floor effects
// TODO: cf. do.c dropy() — place object on floor at hero location
// TODO: cf. do.c dropz() — drop into water/lava
// TODO: cf. do.c canletgo() — check if object can be released (cursed ball etc)
// TODO: cf. do.c doddrop() — drop from inventory prompt
// TODO: cf. do.c menu_drop() — menu-driven multi-drop
// TODO: cf. do.c menudrop_split() — split stack for partial drop
// TODO: cf. do.c better_not_try_to_drop_that() — warn about dropping quest artifact etc

// Handle dropping an item
// C ref: do.c dodrop()
export async function handleDrop(player, map, display) {
    if (player.inventory.length === 0) {
        display.putstr_message("You don't have anything to drop.");
        return { moved: false, tookTime: false };
    }

    const dropChoices = compactInvletPromptChars(player.inventory.map((o) => o.invlet).join(''));
    let countMode = false;
    let countDigits = '';
    const replacePromptMessage = () => {
        if (typeof display.clearRow === 'function') display.clearRow(0);
        display.topMessage = null;
        display.messageNeedsMore = false;
    };
    while (true) {
        replacePromptMessage();
        if (countMode && countDigits.length > 1) {
            display.putstr_message(`Count: ${countDigits}`);
        } else {
            display.putstr_message(`What do you want to drop? [${dropChoices} or ?*]`);
        }
        const ch = await nhgetch();
        let c = String.fromCharCode(ch);
        if (ch === 22) { // Ctrl+V
            countMode = true;
            countDigits = '';
            continue;
        }
        if (countMode && c >= '0' && c <= '9') {
            countDigits += c;
            continue;
        }
        if (ch === 27 || ch === 10 || ch === 13 || c === ' ') {
            replacePromptMessage();
            display.putstr_message('Never mind.');
            return { moved: false, tookTime: false };
        }
        if (c === '?' || c === '*') {
            replacePromptMessage();
            const invLines = buildInventoryOverlayLines(player);
            const selection = await renderOverlayMenuUntilDismiss(display, invLines, dropChoices);
            if (!selection) continue;
            c = selection;
        }

        const item = player.inventory.find(o => o.invlet === c);
        if (!item) continue;

        const isWornArmor =
            player.armor === item
            || player.shield === item
            || player.helmet === item
            || player.gloves === item
            || player.boots === item
            || player.cloak === item
            || player.amulet === item;
        if (isWornArmor) {
            replacePromptMessage();
            display.putstr_message('You cannot drop something you are wearing.');
            return { moved: false, tookTime: false };
        }

        // Unequip weapon slots if dropping the item.
        if (player.weapon === item) uwepgone(player);
        if (player.swapWeapon === item) uswapwepgone(player);
        if (player.quiver === item) uqwepgone(player);

        player.removeFromInventory(item);
        item.ox = player.x;
        item.oy = player.y;
        placeFloorObject(map, item);
        if (typeof display.clearRow === 'function') display.clearRow(0);
        display.topMessage = null;
        display.messageNeedsMore = false;
        display.putstr_message(`You drop ${doname(item, null)}.`);
        return { moved: false, tookTime: true };
    }
}


// ============================================================
// 2. Floor effects
// ============================================================

// TODO: cf. do.c boulder_hits_pool() — boulder falls into pool/lava/moat
// TODO: cf. do.c flooreffects() — effects of object landing on floor (sink, altar, etc)
// TODO: cf. do.c obj_no_longer_held() — cleanup when object leaves inventory


// ============================================================
// 3. Altar/sink/fountain interactions
// ============================================================

// TODO: cf. do.c doaltarobj() — drop object on altar (BUC identification)
// TODO: cf. do.c trycall() — prompt to name object class after altar drop
// TODO: cf. do.c polymorph_sink() — polymorph effect at kitchen sink
// TODO: cf. do.c teleport_sink() — teleportation effect at kitchen sink
// TODO: cf. do.c dosinkring() — drop ring into kitchen sink effects


// ============================================================
// 4. Stair commands
// ============================================================

// TODO: cf. do.c u_stuck_cannot_go() — check if engulfed/grabbed preventing movement

// Handle going downstairs
// C ref: do.c dodown()
export async function handleDownstairs(player, map, display, game) {
    const loc = map.at(player.x, player.y);
    if (!loc || loc.typ !== STAIRS || loc.flags !== 0) {
        display.putstr_message("You can't go down here.");
        return { moved: false, tookTime: false };
    }

    // Go to next level
    const newDepth = player.dungeonLevel + 1;
    if (newDepth > player.maxDungeonLevel) {
        player.maxDungeonLevel = newDepth;
    }
    // Generate new level (changeLevel sets player.dungeonLevel)
    game.changeLevel(newDepth, 'down');
    return { moved: false, tookTime: true };
}

// Handle going upstairs
// C ref: do.c doup()
export async function handleUpstairs(player, map, display, game) {
    const loc = map.at(player.x, player.y);
    if (!loc || loc.typ !== STAIRS || loc.flags !== 1) {
        display.putstr_message("You can't go up here.");
        return { moved: false, tookTime: false };
    }

    if (player.dungeonLevel <= 1) {
        const ans = await ynFunction('Escape the dungeon?', 'yn', 'n'.charCodeAt(0), display);
        if (String.fromCharCode(ans) === 'y') {
            game.gameOver = true;
            game.gameOverReason = 'escaped';
            player.deathCause = 'escaped';
            display.putstr_message('You escape the dungeon...');
        }
        return { moved: false, tookTime: false };
    }

    const newDepth = player.dungeonLevel - 1;
    game.changeLevel(newDepth, 'up');
    return { moved: false, tookTime: true };
}


// ============================================================
// 5. Level transitions — C ref: do.c goto_level(), u_collide_m()
//    and dungeon.c u_on_rndspot(), mkmaze.c place_lregion()
// ============================================================

// TODO: cf. do.c schedule_goto() — schedule a deferred level change
// TODO: cf. do.c deferred_goto() — execute a scheduled level change
// TODO: cf. do.c save_currentstate() — save current level state before transition
// TODO: cf. do.c currentlevel_rewrite() — rewrite current level after transition
// TODO: cf. do.c badspot() — check if landing spot is unsuitable
// TODO: cf. do.c familiar_level_msg() — "You have a sense of déjà vu" message
// TODO: cf. do.c final_level() — handle arrival on the Astral Plane
// TODO: cf. do.c hellish_smoke_mesg() — Gehennom smoke flavor messages
// TODO: cf. do.c temperature_change_msg() — temperature change on level transition
// TODO: cf. do.c maybe_lvltport_feedback() — feedback after level teleport

// --- Teleport arrival placement (C ref: dungeon.c u_on_rndspot, mkmaze.c place_lregion) ---

function isTeleportArrivalBlocked(map, x, y) {
    if (map?.trapAt?.(x, y)) return true;
    const loc = map?.at?.(x, y);
    if (!loc) return true;
    if (IS_FURNITURE(loc.typ)) return true;
    if (IS_LAVA(loc.typ) || IS_POOL(loc.typ)) return true;
    if (map._isInvocationLevel && map._invPos
        && x === map._invPos.x && y === map._invPos.y) {
        return true;
    }
    return false;
}

function isValidTeleportArrivalCell(map, x, y) {
    if (isTeleportArrivalBlocked(map, x, y)) return false;
    const loc = map?.at?.(x, y);
    if (!loc) return false;
    return ((loc.typ === CORR && !!map?.flags?.is_maze_lev)
        || loc.typ === ROOM
        || loc.typ === AIR);
}

function withinBoundedArea(x, y, lx, ly, hx, hy) {
    return x >= lx && x <= hx && y >= ly && y <= hy;
}

function normalizeRegion(region) {
    return {
        lx: Number.isFinite(region?.lx) ? region.lx : 0,
        ly: Number.isFinite(region?.ly) ? region.ly : 0,
        hx: Number.isFinite(region?.hx) ? region.hx : 0,
        hy: Number.isFinite(region?.hy) ? region.hy : 0,
        nlx: Number.isFinite(region?.nlx) ? region.nlx : 0,
        nly: Number.isFinite(region?.nly) ? region.nly : 0,
        nhx: Number.isFinite(region?.nhx) ? region.nhx : 0,
        nhy: Number.isFinite(region?.nhy) ? region.nhy : 0,
    };
}

// C ref: dungeon.c u_on_rndspot() + mkmaze.c place_lregion().
function getTeleportRegion(map, opts = {}) {
    const up = !!opts.up;
    const wasInWTower = !!opts.wasInWTower;
    if (wasInWTower && map?.dndest) {
        return normalizeRegion({
            lx: map.dndest.nlx,
            ly: map.dndest.nly,
            hx: map.dndest.nhx,
            hy: map.dndest.nhy,
            nlx: 0, nly: 0, nhx: 0, nhy: 0,
        });
    }
    return normalizeRegion(up ? map?.updest : map?.dndest);
}

// C ref: dungeon.c u_on_rndspot() -> mkmaze.c place_lregion().
function getTeleportArrivalPosition(map, opts = {}) {
    let { lx, ly, hx, hy, nlx, nly, nhx, nhy } = getTeleportRegion(map, opts);

    if (!lx) {
        lx = 1;
        hx = COLNO - 1;
        ly = 0;
        hy = ROWNO - 1;
    }

    if (lx < 1) lx = 1;
    if (hx > COLNO - 1) hx = COLNO - 1;
    if (ly < 0) ly = 0;
    if (hy > ROWNO - 1) hy = ROWNO - 1;

    const oneshot = (lx === hx && ly === hy);

    const isBadLocation = (x, y) => {
        if (withinBoundedArea(x, y, nlx, nly, nhx, nhy)) return true;
        if (!isValidTeleportArrivalCell(map, x, y)) return true;
        return false;
    };

    const canPlaceAt = (x, y, force) => {
        let invalid = isBadLocation(x, y);
        if (invalid && !force) return false;
        if (invalid && force) {
            const trap = map?.trapAt?.(x, y);
            if (trap && trap.ttyp !== MAGIC_PORTAL && trap.ttyp !== VIBRATING_SQUARE) {
                deltrap(map, trap);
            }
            invalid = isBadLocation(x, y);
            if (invalid) return false;
        }
        const mon = map?.monsterAt?.(x, y);
        if (mon) return false;
        return true;
    };

    for (let i = 0; i < 200; i++) {
        const x = rn1((hx - lx) + 1, lx);
        const y = rn1((hy - ly) + 1, ly);
        if (canPlaceAt(x, y, oneshot)) {
            return { x, y };
        }
    }

    for (let x = lx; x <= hx; x++) {
        for (let y = ly; y <= hy; y++) {
            if (canPlaceAt(x, y, true)) {
                return { x, y };
            }
        }
    }

    return { x: 1, y: 1 };
}

// --- Hero arrival position (C ref: stairs.c u_on_upstairs/u_on_dnstairs, dungeon.c u_on_rndspot) ---

// Determine the hero arrival position on a level.
// transitionDir:
//   'down' -> arriving from above, place on upstair
//   'up'   -> arriving from below, place on downstairs
//   'teleport' -> random placement via place_lregion
//   null   -> default startup/legacy behavior
export function getArrivalPosition(map, dungeonLevel, transitionDir = null) {
    if (transitionDir === 'teleport') {
        return getTeleportArrivalPosition(map, { up: false, wasInWTower: false });
    }

    const hasUpstair = !!(map?.upstair && map.upstair.x > 0 && map.upstair.y > 0);
    const hasDownstair = !!(map?.dnstair && map.dnstair.x > 0 && map.dnstair.y > 0);
    const hasUpdest = !!(map?.updest && Number.isFinite(map.updest.lx) && Number.isFinite(map.updest.ly));
    const hasDndest = !!(map?.dndest && Number.isFinite(map.dndest.lx) && Number.isFinite(map.dndest.ly));

    if (transitionDir === 'down' && hasUpdest) {
        return { x: map.updest.lx, y: map.updest.ly };
    }
    if (transitionDir === 'up' && hasDndest) {
        return { x: map.dndest.lx, y: map.dndest.ly };
    }

    if (transitionDir === 'down' && hasUpstair) {
        return { x: map.upstair.x, y: map.upstair.y };
    }
    if (transitionDir === 'up' && hasDownstair) {
        return { x: map.dnstair.x, y: map.dnstair.y };
    }

    // Backward-compatible default.
    if (hasUpstair) {
        return { x: map.upstair.x, y: map.upstair.y };
    }

    if (map.rooms.length > 0) {
        const room = map.rooms[0];
        return {
            x: Math.floor((room.lx + room.hx) / 2),
            y: Math.floor((room.ly + room.hy) / 2),
        };
    }

    for (let x = 1; x < COLNO - 1; x++) {
        for (let y = 1; y < ROWNO - 1; y++) {
            const loc = map.at(x, y);
            if (loc && ACCESSIBLE(loc.typ)) {
                return { x, y };
            }
        }
    }

    return { x: 1, y: 1 };
}

// --- u_collide_m (C ref: do.c u_collide_m) ---

// Handle hero landing on a monster at arrival.
export function resolveArrivalCollision(game) {
    const mtmp = game.map?.monsterAt?.(game.player.x, game.player.y);
    if (!mtmp || mtmp === game.player?.usteed) return;

    const moveMonsterNearby = () => {
        const pos = enexto(game.player.x, game.player.y, game.map);
        if (pos) { mtmp.mx = pos.x; mtmp.my = pos.y; }
    };

    if (!rn2(2)) {
        const cc = enexto(game.player.x, game.player.y, game.map);
        if (cc && Math.abs(cc.x - game.player.x) <= 1 && Math.abs(cc.y - game.player.y) <= 1) {
            game.player.x = cc.x;
            game.player.y = cc.y;
        } else {
            moveMonsterNearby();
        }
    } else {
        moveMonsterNearby();
    }

    const still = game.map?.monsterAt?.(game.player.x, game.player.y);
    if (!still) return;
    const fallback = enexto(game.player.x, game.player.y, game.map);
    if (fallback) { still.mx = fallback.x; still.my = fallback.y; }
    else { game.map.removeMonster(still); }
}

// --- goto_level core (C ref: do.c goto_level) ---

// Core level transition: cache old level, install new map, place hero,
// migrate followers, resolve collisions.
//
// game must provide: .map, .player, .levels
// opts.map: pre-generated map (e.g., wizloaddes)
// opts.makeLevel(depth): custom level generator (default: makelevel(depth))
export function changeLevel(game, depth, transitionDir = null, opts = {}) {
    const previousDepth = game.player?.dungeonLevel;
    const fromX = game.player?.x;
    const fromY = game.player?.y;

    // Cache current level
    if (game.map) {
        game.levels[game.player.dungeonLevel] = game.map;
    }
    const previousMap = game.levels[game.player.dungeonLevel];

    // Use pre-generated map if provided, otherwise check cache or generate new.
    if (opts.map) {
        game.map = opts.map;
        game.levels[depth] = opts.map;
    } else if (game.levels[depth]) {
        game.map = game.levels[depth];
    } else {
        game.map = opts.makeLevel ? opts.makeLevel(depth) : makelevel(depth);
        game.levels[depth] = game.map;
    }

    game.player.dungeonLevel = depth;
    game.player.inTutorial = !!game.map?.flags?.is_tutorial;

    // C ref: dungeon.c u_on_rndspot() / stairs.c u_on_upstairs()
    const pos = getArrivalPosition(game.map, depth, transitionDir);
    game.player.x = pos.x;
    game.player.y = pos.y;

    // C ref: cmd.c goto_level() clears hero track history on level change.
    if (Number.isInteger(previousDepth) && depth !== previousDepth) {
        initrack();
    }

    // C ref: do.c goto_level() -> losedogs() -> mon_arrive()
    // Migrate followers from old level; resolve hero-monster collision.
    if (previousMap && previousMap !== game.map) {
        mon_arrive(previousMap, game.map, game.player, {
            sourceHeroX: fromX,
            sourceHeroY: fromY,
            heroX: game.player.x,
            heroY: game.player.y,
        });
        resolveArrivalCollision(game);
    }
}


// ============================================================
// 6. Corpse revival
// ============================================================

// TODO: cf. do.c revive_corpse() — revive a corpse into a monster
// TODO: cf. do.c revive_mon() — internal revive helper
// TODO: cf. do.c zombify_mon() — turn corpse into zombie


// ============================================================
// 7. Null/wait/wipe
// ============================================================

// TODO: cf. do.c donull() — do nothing (wait/search command)
// TODO: cf. do.c wipeoff() — wipe face while blinded (continuation)
// TODO: cf. do.c dowipe() — start wiping face
// TODO: cf. do.c cmd_safety_prevention() — prevent dangerous commands
// TODO: cf. do.c danger_uprops() — check dangerous hero properties
// TODO: cf. do.c engulfer_digests_food() — engulfing monster digests held food


// ============================================================
// 8. Wounded legs
// ============================================================

// TODO: cf. do.c legs_in_no_shape() — check if legs are too wounded to act
// TODO: cf. do.c set_wounded_legs() — set wounded legs condition
// TODO: cf. do.c heal_legs() — heal wounded legs
