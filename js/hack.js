// hack.js -- Movement, running, and travel
// Mirrors hack.c from the C source.
// domove(), findtravelpath(), lookaround(), etc.

import { COLNO, ROWNO, STONE, DOOR, CORR, SDOOR, SCORR, STAIRS, LADDER, FOUNTAIN, SINK, THRONE, ALTAR, GRAVE,
         POOL, LAVAPOOL, IRONBARS, TREE, ROOM, IS_DOOR, D_CLOSED, D_LOCKED,
         D_ISOPEN, D_NODOOR, D_BROKEN, ACCESSIBLE, IS_OBSTRUCTED, IS_WALL, ICE,
         IS_STWALL, IS_ROCK, IS_ROOM, IS_FURNITURE, IS_POOL, IS_LAVA, IS_WATERWALL,
         WATER, LAVAWALL, AIR, MOAT, DRAWBRIDGE_UP, DRAWBRIDGE_DOWN,
         isok, A_STR, A_DEX, A_CON, A_WIS, A_INT, A_CHA,
         ROOMOFFSET, SHOPBASE, OROOM, COURT, SWAMP, VAULT, BEEHIVE, MORGUE,
         BARRACKS, ZOO, DELPHI, TEMPLE, LEPREHALL, COCKNEST, ANTHOLE,
         UNENCUMBERED, SLT_ENCUMBER, MOD_ENCUMBER, HVY_ENCUMBER, EXT_ENCUMBER, OVERLOADED,
         NO_TRAP, VIBRATING_SQUARE, is_pit, BEAR_TRAP, WEB,
         HOLE, TRAPDOOR } from './config.js';
import { SQKY_BOARD, SLP_GAS_TRAP, FIRE_TRAP, PIT, SPIKED_PIT, ANTI_MAGIC } from './symbols.js';
import { rn2, rnd, rnl, d, c_d } from './rng.js';
import { exercise } from './attrib_exercise.js';
import { WEAPON_CLASS, ARMOR_CLASS, RING_CLASS, AMULET_CLASS,
         TOOL_CLASS, FOOD_CLASS, POTION_CLASS, SCROLL_CLASS, SPBOOK_CLASS,
         WAND_CLASS, COIN_CLASS, GEM_CLASS, ROCK_CLASS, BOULDER } from './objects.js';
import { nhgetch } from './input.js';
import { playerAttackMonster } from './uhitm.js';
import { formatGoldPickupMessage, formatInventoryPickupMessage } from './do.js';
import { monDisplayName, monNam } from './mondata.js';
import { maybeSmudgeEngraving, u_wipe_engr } from './engrave.js';
import { describeGroundObjectForPlayer, maybeHandleShopEntryMessage } from './shk.js';
import { observeObject } from './discovery.js';
import { DIRECTION_KEYS } from './dothrow.js';
import { dosearch0 } from './detect.js';
import { monsterNearby, monnear } from './monutil.js';
import { monflee } from './monmove.js';
import { ynFunction } from './input.js';
import { water_friction, maybe_adjust_hero_bubble } from './mkmaze.js';
import { tmp_at, nh_delay_output_nowait, DISP_ALL, DISP_END } from './animation.js';
import { set_getpos_context, getpos_async } from './getpos.js';
// pline available from './pline.js' if needed for direct message output

// Run direction keys (shift = run)
export const RUN_KEYS = {
    'H': [-1,  0],
    'J': [ 0,  1],
    'K': [ 0, -1],
    'L': [ 1,  0],
    'Y': [-1, -1],
    'U': [ 1, -1],
    'B': [-1,  1],
    'N': [ 1,  1],
};

function runTraceEnabled() {
    const env = (typeof process !== 'undefined' && process.env) ? process.env : {};
    return env.WEBHACK_RUN_TRACE === '1';
}

function runTrace(...args) {
    if (!runTraceEnabled()) return;
    console.log('[RUN_TRACE]', ...args);
}

function replayStepLabel(map) {
    const idx = map?._replayStepIndex;
    return Number.isInteger(idx) ? String(idx + 1) : '?';
}

function travelTmpAtDebugEnabled() {
    const env = (typeof process !== 'undefined' && process.env) ? process.env : {};
    return env.WEBHACK_TRAVEL_TMP_AT_DEBUG === '1';
}

function debug_travel_tmp_at(path, startX, startY) {
    if (!travelTmpAtDebugEnabled() || !Array.isArray(path) || path.length === 0) return;
    let x = startX;
    let y = startY;
    tmp_at(DISP_ALL, { ch: '1', color: 14 });
    for (const [dx, dy] of path) {
        x += dx;
        y += dy;
        tmp_at(x, y);
    }
    nh_delay_output_nowait();
    tmp_at(DISP_END, 0);
}

// Handle directional movement
// C ref: hack.c domove() -- the core movement function
export async function handleMovement(dir, player, map, display, game) {
    const flags = game.flags || {};
    const oldX = player.x;
    const oldY = player.y;
    // Preserve pre-move coordinates for C-style URETREATING checks.
    game.ux0 = oldX;
    game.uy0 = oldY;
    let nx = player.x + dir[0];
    let ny = player.y + dir[1];
    player.dx = dir[0];
    player.dy = dir[1];
    // C ref: cmd.c move-prefix handling is consumed by the attempted move
    // path, even when that move is blocked.
    const nopick = game.menuRequested;
    game.menuRequested = false;

    const tDest = { x: nx, y: ny };
    if (water_turbulence(player, map, display, tDest)) {
        return { moved: false, tookTime: false };
    }
    nx = tDest.x;
    ny = tDest.y;

    if (!isok(nx, ny)) {
        display.putstr_message("You can't move there.");
        return { moved: false, tookTime: false };
    }

    const loc = map.at(nx, ny);

    // C ref: hack.c crawl_destination()/test_move:
    // diagonal movement into a doorway is blocked unless the target door is
    // effectively doorless (D_NODOOR or D_BROKEN).
    if (loc && IS_DOOR(loc.typ) && Math.abs(dir[0]) + Math.abs(dir[1]) === 2) {
        const doorFlags = loc.flags || 0;
        const doorlessDoor = (doorFlags & ~(D_NODOOR | D_BROKEN)) === 0;
        if (!doorlessDoor) {
            if (map?.flags?.mention_walls || map?.flags?.is_tutorial) {
                display.putstr_message("You can't move diagonally into an intact doorway.");
            }
            return { moved: false, tookTime: false };
        }
    }
    // C ref: hack.c test_move() out-of-door diagonal gate:
    // moving diagonally out of an intact doorway is also blocked.
    if (Math.abs(dir[0]) + Math.abs(dir[1]) === 2) {
        const fromLoc = map.at(oldX, oldY);
        if (fromLoc && IS_DOOR(fromLoc.typ)) {
            const fromDoorFlags = fromLoc.flags || 0;
            const fromDoorless = (fromDoorFlags & ~(D_NODOOR | D_BROKEN)) === 0;
            if (!fromDoorless) {
                if (map?.flags?.mention_walls || map?.flags?.is_tutorial) {
                    display.putstr_message("You can't move diagonally out of an intact doorway.");
                }
                return { moved: false, tookTime: false };
            }
        }
    }

    // C ref: cmd.c do_fight() + hack.c domove()/do_attack() fallback.
    // Forced-fight into an empty square produces "You attack thin air."
    // and does not perform normal movement handling.
    if (game.forceFight && !map.monsterAt(nx, ny)) {
        let target = '';
        if (loc) {
            if (IS_WALL(loc.typ)) {
                target = 'the wall';
            } else if (loc.typ === STAIRS) {
                if (map.upstair && map.upstair.x === nx && map.upstair.y === ny) {
                    target = 'the branch staircase up';
                } else if (map.dnstair && map.dnstair.x === nx && map.dnstair.y === ny) {
                    target = 'the branch staircase down';
                } else {
                    target = loc.stairdir ? 'the branch staircase up' : 'the branch staircase down';
                }
            }
        }
        if (target) {
            display.putstr_message(`You harmlessly attack ${target}.`);
        } else {
            display.putstr_message('You attack thin air.');
        }
        game.forceFight = false;
        return { moved: false, tookTime: true };
    }

    // C ref: hack.c:2741 escape_from_sticky_mon(x, y)
    // If hero is stuck to a monster and trying to move away, attempt escape.
    if (player.ustuck && (nx !== player.ustuck.mx || ny !== player.ustuck.my)) {
        const stuckMon = player.ustuck;
        if (stuckMon.dead || !monnear(stuckMon, player.x, player.y)) {
            // Monster died or is no longer adjacent — auto-release
            player.ustuck = null;
        } else {
            // C ref: hack.c:2645 rn2(!u.ustuck->mcanmove ? 8 : 40)
            const canMove = stuckMon.mcanmove !== false && !stuckMon.mfrozen;
            const escapeRoll = rn2(canMove ? 40 : 8);
            if (escapeRoll <= 2) {
                // Escape successful (cases 0, 1, 2)
                display.putstr_message(`You pull free from the ${monDisplayName(stuckMon)}.`);
                player.ustuck = null;
            } else if (escapeRoll === 3 && !canMove) {
                // Wake/release frozen monster, then check tame
                stuckMon.mfrozen = 1;
                stuckMon.sleeping = false;
                if (stuckMon.tame && !game?.flags?.conflict) {
                    display.putstr_message(`You pull free from the ${monDisplayName(stuckMon)}.`);
                    player.ustuck = null;
                } else {
                    display.putstr_message(`You cannot escape from the ${monDisplayName(stuckMon)}!`);
                    return { moved: false, tookTime: true };
                }
            } else {
                // Failed to escape
                if (stuckMon.tame && !game?.flags?.conflict) {
                    display.putstr_message(`You pull free from the ${monDisplayName(stuckMon)}.`);
                    player.ustuck = null;
                } else {
                    display.putstr_message(`You cannot escape from the ${monDisplayName(stuckMon)}!`);
                    return { moved: false, tookTime: true };
                }
            }
        }
    }

    // Check for monster at target position
    const mon = map.monsterAt(nx, ny);
    if (mon) {
        // C ref: hack.c domove() — check for pet displacement
        // C ref: uhitm.c do_attack() is invoked first for safemon targets.
        // Even when displacement succeeds, it consumes rn2(7) via safemon checks.
        // 'F' prefix (forceFight) skips safemon protection and forces attack.
        const shouldDisplace = (mon.tame || mon.peaceful) && !game.forceFight;

        if (shouldDisplace) {
            // C ref: uhitm.c:462-509 — displacement logic for safemon
            // Stormbringer override skipped (artifact not modeled)
            // foo = blocked from displacing (Punished, random, longworm, obstructed)
            const foo = (/* Punished */ false || !rn2(7)
                         /* || is_longworm || IS_OBSTRUCTED */);
            // inshop check skipped for simplicity
            if (foo) {
                // C ref: uhitm.c:495-501 — blocked: flee + "in the way" message
                if (mon.tame) {
                    monflee(mon, rnd(6), false, false, player, display, null);
                }
                // C ref: uhitm.c:497 — y_monnam for "Your little dog"
                const label = mon.tame
                    ? monNam(mon, { article: 'your', capitalize: true })
                    : monNam(mon, { capitalize: true });
                display.putstr_message(`You stop.  ${label} is in the way!`);
                game.forceFight = false;
                return { moved: false, tookTime: true };
            } else if (mon.mfrozen || mon.mcanmove === false || mon.msleeping
                       || ((mon.type?.speed ?? 0) === 0 && rn2(6))) {
                // C ref: uhitm.c:502-506 — frozen/helpless/immobile monster
                const label = monNam(mon, { capitalize: true });
                display.putstr_message(`${label} doesn't seem to move!`);
                game.forceFight = false;
                return { moved: false, tookTime: true };
            }

            // Pet displacement: swap positions
            // C ref: hack.c:2142-2156 — remove_monster + place_monster swaps positions
            const oldPlayerX = player.x;
            const oldPlayerY = player.y;
            mon.mx = oldPlayerX;
            mon.my = oldPlayerY;
            player.x = nx;
            player.y = ny;
            player.moved = true;
            game.lastMoveDir = dir;
            maybeSmudgeEngraving(map, oldPlayerX, oldPlayerY, player.x, player.y);
            player.displacedPetThisTurn = true;
            maybeHandleShopEntryMessage(game, oldPlayerX, oldPlayerY);
            // C ref: hack.c:2150 — x_monnam with ARTICLE_YOUR for tame
            // includes "saddled" when the monster has a saddle worn.
            display.putstr_message(`You swap places with ${monNam(mon)}.`);
            const landedObjs = map.objectsAt(nx, ny);
            if (landedObjs.length === 1) {
                const seen = landedObjs[0];
                if (seen.oclass === COIN_CLASS) {
                    const count = seen.quan || 1;
                    if (count === 1) {
                        display.putstr_message('You see here a gold piece.');
                    } else {
                        display.putstr_message(`You see here ${count} gold pieces.`);
                    }
                } else {
                    observeObject(seen);
                    display.putstr_message(`You see here ${describeGroundObjectForPlayer(seen, player, map)}.`);
                }
            } else if (landedObjs.length > 1) {
                // C ref: invent.c look_here() uses NHW_MENU for piles and
                // display_nhwindow(WIN_MESSAGE, FALSE) before listing items.
                // That clears any prior topline text (e.g. swap message).
                clearTopline(display);
            }
            game.forceFight = false; // Clear prefix (shouldn't reach here but be safe)
            return { moved: true, tookTime: true };
        }

        // Safety checks before attacking
        // C ref: flag.h flags.safe_pet - prevent attacking pets
        if (mon.tame && game.flags?.safe_pet && !game.forceFight) {
            display.putstr_message("You cannot attack your pet!");
            game.forceFight = false;
            return { moved: false, tookTime: false };
        }

        // C ref: flag.h flags.confirm - confirm attacking peacefuls
        if (mon.peaceful && !mon.tame && game.flags?.confirm) {
            const answer = await ynFunction(
                `Really attack ${monDisplayName(mon)}?`,
                'yn',
                'n'.charCodeAt(0),
                display
            );
            if (answer !== 'y'.charCodeAt(0)) {
                display.putstr_message("Cancelled.");
                game.forceFight = false;
                return { moved: false, tookTime: false };
            }
        }

        // Attack the monster (or forced attack on peaceful)
        game.forceFight = false; // Clear prefix after use
        // C ref: hack.c domove() -> do_attack() -> attack() -> hitum()
        // C ref: hack.c:3036 overexertion() unconditionally calls gethungry() -> rn2(20)
        rn2(20); // overexertion/gethungry before attack
        // C ref: uhitm.c:550 exercise(A_STR, TRUE) before hitum()
        exercise(player, A_STR, true);
        // C ref: uhitm.c:552 u_wipe_engr(3) before hitum()
        u_wipe_engr(player, map, 3);
        const killed = playerAttackMonster(player, mon, display, map, game);
        if (killed) {
            map.removeMonster(mon);
        }
        player.moved = true;
        return { moved: false, tookTime: true };
    }

    // Check terrain
    if (IS_WALL(loc.typ)) {
        if (map?.flags?.mention_walls || map?.flags?.is_tutorial) {
            display.putstr_message("It's a wall.");
        }
        return { moved: false, tookTime: false };
    }

    if (loc.typ === 0) { // STONE
        if (map?.flags?.mention_walls || map?.flags?.is_tutorial) {
            display.putstr_message("It's a wall.");
        }
        return { moved: false, tookTime: false };
    }

    // C ref: secret doors/corridors behave like walls until discovered.
    if (loc.typ === SDOOR || loc.typ === SCORR) {
        if (map?.flags?.mention_walls || map?.flags?.is_tutorial) {
            display.putstr_message("It's a wall.");
        }
        return { moved: false, tookTime: false };
    }

    // Handle closed doors — auto-open per C ref: hack.c:1077-1090 + lock.c:904
    // In C, doopen_indir is called within domove_core. After it, context.move
    // remains false (player didn't move), so monsters don't get a turn.
    // The RNG calls (rnl + exercise) happen but no per-turn processing runs.
    if (IS_DOOR(loc.typ) && (loc.flags & D_CLOSED)) {
        const str = player.attributes ? player.attributes[A_STR] : 18;
        const dex = player.attributes ? player.attributes[A_DEX] : 11;
        const con = player.attributes ? player.attributes[A_CON] : 18;
        const threshold = Math.floor((str + dex + con) / 3);
        if (rnl(20) < threshold) {
            loc.flags = (loc.flags & ~D_CLOSED) | D_ISOPEN;
            display.putstr_message("The door opens.");
        } else {
            exercise(player, A_STR, true);
            display.putstr_message("The door resists!");
        }
        return { moved: false, tookTime: false };
    }
    if (IS_DOOR(loc.typ) && (loc.flags & D_LOCKED)) {
        display.putstr_message("This door is locked.");
        return { moved: false, tookTime: false };
    }

    if (!ACCESSIBLE(loc.typ)) {
        display.putstr_message("You can't move there.");
        return { moved: false, tookTime: false };
    }
    const steppingTrap = map.trapAt(nx, ny);
    // C-style confirmation prompt for known anti-magic fields.
    if (steppingTrap && steppingTrap.ttyp === ANTI_MAGIC && steppingTrap.tseen) {
        const ans = await ynFunction(
            'Really step onto that anti-magic field?',
            'yn',
            'n'.charCodeAt(0),
            display
        );
        if (ans !== 'y'.charCodeAt(0)) {
            return { moved: false, tookTime: false };
        }
    }

    // Move the player
    player.x = nx;
    player.y = ny;
    player.moved = true;
    game.lastMoveDir = dir;
    maybeSmudgeEngraving(map, oldX, oldY, player.x, player.y);

    // Clear force-fight prefix after successful movement.
    game.forceFight = false;
    maybeHandleShopEntryMessage(game, oldX, oldY);

    // Check for traps — C ref: hack.c spoteffects() → dotrap()
    // C ref: trap.c trapeffect_*() — trap-specific effects
    const trap = map.trapAt(nx, ny);
    if (trap) {
        // C ref: trap.c seetrap() — mark trap as discovered
        if (!trap.tseen) {
            trap.tseen = true;
        }
        // Trap-specific effects (no RNG for SQKY_BOARD)
        if (trap.ttyp === SQKY_BOARD) {
            display.putstr_message('A board beneath you squeaks loudly.');
            // Match tty topline behavior where later same-turn messages replace
            // this trap notice rather than concatenating with it.
            display.messageNeedsMore = false;
        }
        // C ref: trap.c trapeffect_slp_gas_trap() for hero path
        else if (trap.ttyp === SLP_GAS_TRAP) {
            const duration = rnd(25);
            player.stunned = true;
            display.putstr_message('A cloud of gas puts you to sleep!');
            // Keep duration for future full sleep handling without changing turn loop yet.
            player.sleepTrapTurns = Math.max(player.sleepTrapTurns || 0, duration);
        }
        // C ref: trap.c dofiretrap() for hero path (non-resistant baseline)
        else if (trap.ttyp === FIRE_TRAP) {
            const origDmg = d(2, 4);
            const fireDmg = d(2, 4);
            display.putstr_message('A tower of flame erupts from the floor!');
            player.takeDamage(Math.max(0, fireDmg), 'a fire trap');
            // C ref: burnarmor() || rn2(3)
            rn2(3);
            void origDmg; // kept for parity readability with C's orig_dmg handling.
        }
        // C ref: trap.c trapeffect_pit() — set trap timeout and apply damage.
        else if (trap.ttyp === PIT || trap.ttyp === SPIKED_PIT) {
            const trapTurns = rn2(6) + 2; // rn1(6,2)
            player.pitTrapTurns = Math.max(player.pitTrapTurns || 0, trapTurns);
            const pitDmg = rnd(trap.ttyp === SPIKED_PIT ? 10 : 6);
            player.takeDamage(Math.max(0, pitDmg), trap.ttyp === SPIKED_PIT
                ? 'a pit of spikes'
                : 'a pit');
            if (trap.ttyp === SPIKED_PIT) {
                rn2(6); // C ref: 1-in-6 poison-spike branch gate.
            }
            display.putstr_message(trap.ttyp === SPIKED_PIT
                ? 'You land on a set of sharp iron spikes!'
                : 'You fall into a pit!');
        }
        // C ref: trap.c trapeffect_anti_magic()
        else if (trap.ttyp === ANTI_MAGIC) {
            // C ref: trap.c trapeffect_anti_magic() + drain_en()
            let drain = c_d(2, 6); // 2..12
            const halfd = rnd(Math.max(1, Math.floor(drain / 2)));
            let exclaim = false;
            if (player.pwmax > drain) {
                player.pwmax = Math.max(0, player.pwmax - halfd);
                drain -= halfd;
                exclaim = true;
            }
            if (player.pwmax < 1) {
                player.pw = 0;
                player.pwmax = 0;
                display.putstr_message('You feel momentarily lethargic.');
            } else {
                let n = drain;
                if (n > Math.floor((player.pw + player.pwmax) / 3)) {
                    n = rnd(n);
                }
                let punct = exclaim ? '!' : '.';
                if (n > player.pw) punct = '!';
                player.pw -= n;
                if (player.pw < 0) {
                    player.pwmax = Math.max(0, player.pwmax - rnd(-player.pw));
                    player.pw = 0;
                } else if (player.pw > player.pwmax) {
                    player.pw = player.pwmax;
                }
                display.putstr_message(`You feel your magical energy drain away${punct}`);
            }
        }
    }

    // Helper function: Check if object class matches pickup_types string
    // C ref: pickup.c pickup_filter() and flags.pickup_types
    function shouldAutopickup(obj, pickupTypes) {
        if (obj && obj._thrownByPlayer && game.flags?.pickup_thrown) {
            return true;
        }
        // If pickup_types is empty, pick up all non-gold items (backward compat)
        if (!pickupTypes || pickupTypes === '') {
            return true;
        }

        // Map object class to symbol character
        const classToSymbol = {
            [WEAPON_CLASS]: ')',
            [ARMOR_CLASS]: '[',
            [RING_CLASS]: '=',
            [AMULET_CLASS]: '"',
            [TOOL_CLASS]: '(',
            [FOOD_CLASS]: '%',
            [POTION_CLASS]: '!',
            [SCROLL_CLASS]: '?',
            [SPBOOK_CLASS]: '+',
            [WAND_CLASS]: '/',
            [COIN_CLASS]: '$',
            [GEM_CLASS]: '*',
            [ROCK_CLASS]: '`',
        };

        const symbol = classToSymbol[obj.oclass];
        return symbol && pickupTypes.includes(symbol);
    }

    // Autopickup — C ref: hack.c:3265 pickup(1)
    // C ref: pickup.c pickup() checks flags.pickup && !context.nopick
    const objs = map.objectsAt(nx, ny);
    let pickedUp = false;

    // Pick up gold first if autopickup is enabled
    // C ref: pickup.c pickup() — autopickup gate applies to ALL items including gold
    if (game.flags?.pickup && !nopick && objs.length > 0) {
        const gold = objs.find(o => o.oclass === COIN_CLASS);
        if (gold) {
            player.addToInventory(gold);
            map.removeObject(gold);
            display.putstr_message(formatGoldPickupMessage(gold, player));
            pickedUp = true;
        }
    }

    // Then pick up other items if autopickup is enabled
    // C ref: pickup.c pickup() filters by pickup_types
    if (game.flags?.pickup && !nopick && objs.length > 0) {
        const pickupTypes = game.flags?.pickup_types || '';
        const obj = objs.find(o => o.oclass !== COIN_CLASS && shouldAutopickup(o, pickupTypes));
        if (obj) {
            observeObject(obj);
            const inventoryObj = player.addToInventory(obj);
            map.removeObject(obj);
            display.putstr_message(formatInventoryPickupMessage(obj, inventoryObj, player));
            pickedUp = true;
        }
    }

    // Show what's here if nothing was picked up
    // C ref: hack.c prints "You see here" only if nothing was picked up
    if (!pickedUp && objs.length > 0) {
        if (IS_DOOR(loc.typ) && !(loc.flags & (D_CLOSED | D_LOCKED))) {
            display.putstr_message('There is a doorway here.');
        }
        if (objs.length === 1) {
            const seen = objs[0];
            if (seen.oclass === COIN_CLASS) {
                const count = seen.quan || 1;
                if (count === 1) {
                    display.putstr_message('You see here a gold piece.');
                } else {
                    display.putstr_message(`You see here ${count} gold pieces.`);
                }
            } else {
                observeObject(seen);
                display.putstr_message(`You see here ${describeGroundObjectForPlayer(seen, player, map)}.`);
            }
        } else {
            // C ref: invent.c look_here() — for 2+ objects, C uses a NHW_MENU
            // popup window ("Things that are here:") that the player dismisses.
            // TODO: implement paginated menu display matching C's tty rendering.
        }
    }

    // Check for stairs
    // C ref: do.c:738 flags.verbose gates "There is a staircase..."
    // Messages will be concatenated if both fit (see display.putstr_message)
    if (game.flags.verbose && loc.typ === STAIRS) {
        if (loc.flags === 1) {
            display.putstr_message('There is a staircase up out of the dungeon here.');
        } else {
            display.putstr_message('There is a staircase down here.');
        }
    }

    // C ref: do.c:774 flags.verbose gates terrain feature descriptions
    if (game.flags.verbose && loc.typ === FOUNTAIN) {
        display.putstr_message('There is a fountain here.');
    }

    return { moved: true, tookTime: true };
}

// Handle running in a direction
// C ref: cmd.c do_run() -> hack.c domove() with context.run
export async function handleRun(dir, player, map, display, fov, game, runStyle = 'run') {
    let runDir = dir;
    let steps = 0;
    let timedTurns = 0;
    const hasRunTurnHook = typeof game?.advanceRunTurn === 'function';
    runTrace(
        `step=${replayStepLabel(map)}`,
        `start=(${player.x},${player.y})`,
        `dir=(${runDir[0]},${runDir[1]})`,
        `style=${runStyle}`,
        `hook=${hasRunTurnHook ? 1 : 0}`,
    );
    while (steps < 80) { // safety limit
        const beforeX = player.x;
        const beforeY = player.y;
        const result = await handleMovement(runDir, player, map, display, game);
        if (result.tookTime) timedTurns++;
        runTrace(
            `step=${replayStepLabel(map)}`,
            `iter=${steps + 1}`,
            `dir=(${runDir[0]},${runDir[1]})`,
            `from=(${beforeX},${beforeY})`,
            `to=(${player.x},${player.y})`,
            `moved=${result.moved ? 1 : 0}`,
            `time=${result.tookTime ? 1 : 0}`,
        );

        // C-faithful run timing: each successful run step advances time once.
        // Important: blocked run steps that still consume time (pet in way,
        // forced-fight air swings, etc.) also advance a turn before run stops.
        if (hasRunTurnHook && result.tookTime) {
            await game.advanceRunTurn();
        }
        if (!result.moved) break;
        steps++;

        // Stop if we see a monster, item, or interesting feature
        fov.compute(map, player.x, player.y);
        const stopReason = checkRunStop(map, player, fov, runDir, runStyle);
        const shouldStop = !!stopReason;
        if (shouldStop) {
            runTrace(
                `step=${replayStepLabel(map)}`,
                `iter=${steps}`,
                `stop=${stopReason}`,
                `at=(${player.x},${player.y})`,
            );
        }
        if (shouldStop) break;

        // C ref: hack.c lookaround() corner-following while running.
        // In corridors, auto-turn when there is exactly one forward continuation
        // aside from the tile we just came from.
        const nextDir = pickRunContinuationDir(map, player, runDir);
        if (nextDir[0] !== runDir[0] || nextDir[1] !== runDir[1]) {
            runTrace(
                `step=${replayStepLabel(map)}`,
                `iter=${steps}`,
                `turn=(${runDir[0]},${runDir[1]})->(${nextDir[0]},${nextDir[1]})`,
                `at=(${player.x},${player.y})`,
            );
        }
        runDir = nextDir;

        // Update display during run
        display.renderMap(map, player, fov);
        display.renderStatus(player);

    }
    return {
        moved: steps > 0,
        tookTime: hasRunTurnHook ? false : timedTurns > 0,
        runSteps: hasRunTurnHook ? 0 : timedTurns,
    };
}

function pickRunContinuationDir(map, player, dir) {
    const loc = map?.at(player.x, player.y);
    if (!loc || (loc.typ !== CORR && loc.typ !== SCORR)) return dir;

    const backDx = -dir[0];
    const backDy = -dir[1];
    const options = [];
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [dx, dy] of dirs) {
        if (dx === backDx && dy === backDy) continue;
        const nx = player.x + dx;
        const ny = player.y + dy;
        if (!isok(nx, ny)) continue;
        const nloc = map.at(nx, ny);
        if (nloc && ACCESSIBLE(nloc.typ)) {
            options.push([dx, dy]);
        }
    }
    return options.length === 1 ? options[0] : dir;
}

// Check if running should stop
// C ref: hack.c lookaround() -- checks for interesting things while running
function checkRunStop(map, player, fov, dir, runStyle = 'run') {
    const inFrontX = player.x + dir[0];
    const inFrontY = player.y + dir[1];
    // C lookaround() stops when a visible monster blocks the current heading,
    // even for otherwise safe monsters; nearby unsafe monsters also stop run.
    for (const mon of map.monsters) {
        if (mon.dead) continue;
        if (!fov.canSee(mon.mx, mon.my)) continue;
        if (mon.mx === inFrontX && mon.my === inFrontY) return 'monster-in-front';
        if (mon.tame || mon.peaceful || mon.mpeaceful) continue;
        const dx = Math.abs(mon.mx - player.x);
        const dy = Math.abs(mon.my - player.y);
        if (dx <= 1 && dy <= 1) return 'hostile-nearby';
    }

    // Check for objects at current position
    const objs = map.objectsAt(player.x, player.y);
    if (objs.length > 0) return 'objects-on-square';

    // C ref: hack.c lookaround() run=3 ("rush") nearby-interesting scan.
    if (runStyle === 'rush') {
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;
                const x = player.x + dx;
                const y = player.y + dy;
                if (!isok(x, y)) continue;
                const inFront = (x === inFrontX && y === inFrontY);
                // C: ignore the exact square we're moving away from.
                if (x === player.x - dir[0] && y === player.y - dir[1]) continue;
                const mon = map.monsterAt(x, y);
                if (mon && !mon.dead && fov.canSee(mon.mx, mon.my)) {
                    const hostile = !(mon.tame || mon.peaceful || mon.mpeaceful);
                    if (hostile || inFront) return 'rush-mon-scan';
                }
                const loc = map.at(x, y);
                if (!loc) continue;
                if (loc.typ === STONE) continue;
                const isClosedDoor = IS_DOOR(loc.typ) && (loc.flags & (D_CLOSED | D_LOCKED));
                if (isClosedDoor) {
                    // C ignores diagonal doors for this stop path.
                    if (x !== player.x && y !== player.y) continue;
                    return 'rush-door-near';
                }
                if (loc.typ === CORR || loc.typ === SCORR) continue;
                if (IS_OBSTRUCTED(loc.typ) || loc.typ === ROOM || loc.typ === ICE) continue;
                if ((loc.typ === POOL || loc.typ === LAVAPOOL) && inFront) return 'rush-liquid-ahead';
                if (map.trapAt(x, y) && inFront) return 'rush-trap-ahead';
                // C's final "interesting square" branch keeps some behind-edge
                // exclusions to avoid stopping on irrelevant side squares.
                if (mon && !mon.dead) continue;
                if ((x === player.x - dir[0] && y !== player.y + dir[1])
                    || (y === player.y - dir[1] && x !== player.x + dir[0])) {
                    continue;
                }
                return 'rush-interesting-near';
            }
        }
    }

    // Check for interesting terrain
    const loc = map.at(player.x, player.y);
    if (loc && (loc.typ === STAIRS || loc.typ === FOUNTAIN)) return 'interesting-terrain';

    // Only treat corridor forks as run-stoppers.
    if (loc && (loc.typ === CORR || loc.typ === SCORR)) {
        let exits = 0;
        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        for (const [dx, dy] of dirs) {
            const nx = player.x + dx;
            const ny = player.y + dy;
            if (!isok(nx, ny)) continue;
            const nloc = map.at(nx, ny);
            if (nloc && ACCESSIBLE(nloc.typ)) exits++;
        }
        if (exits > 2) return 'corridor-fork';
    }

    return null;
}

// BFS pathfinding for travel command
// C ref: hack.c findtravelpath()
export function findPath(map, startX, startY, endX, endY) {
    if (!isok(endX, endY)) return null;
    if (startX === endX && startY === endY) return [];

    const queue = [[startX, startY, []]];
    const visited = new Set();
    visited.add(`${startX},${startY}`);

    while (queue.length > 0) {
        const [x, y, path] = queue.shift();

        // Check all 8 directions
        for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
            const nx = x + dx;
            const ny = y + dy;

            if (nx === endX && ny === endY) {
                const result = [...path, [dx, dy]];
                debug_travel_tmp_at(result, startX, startY);
                return result;
            }

            const key = `${nx},${ny}`;
            if (visited.has(key)) continue;
            if (!isok(nx, ny)) continue;

            const loc = map.at(nx, ny);
            if (!loc || !ACCESSIBLE(loc.typ)) continue;

            visited.add(key);
            queue.push([nx, ny, [...path, [dx, dy]]]);
        }

        // Limit search to prevent infinite loops
        if (visited.size > 500) return null;
    }

    return null; // No path found
}

// Handle travel command (_)
// C ref: cmd.c dotravel()
export async function handleTravel(game) {
    const { player, map, display } = game;

    display.putstr_message('Where do you want to travel to?');
    set_getpos_context({ map, display, flags: game.flags, goalPrompt: 'travel to' });
    const cc = { x: player.x, y: player.y };
    const result = await getpos_async(cc, true, 'travel to');
    if (result < 0) {
        display.putstr_message('Travel cancelled.');
        return { moved: false, tookTime: false };
    }
    const cursorX = cc.x;
    const cursorY = cc.y;

    // Store travel destination
    game.travelX = cursorX;
    game.travelY = cursorY;

    // Find path
    const path = findPath(map, player.x, player.y, cursorX, cursorY);
    if (!path) {
        display.putstr_message('No path to that location.');
        return { moved: false, tookTime: false };
    }

    if (path.length === 0) {
        display.putstr_message('You are already there.');
        return { moved: false, tookTime: false };
    }

    // Start traveling
    game.travelPath = path;
    game.travelStep = 0;
    display.putstr_message(`Traveling... (${path.length} steps)`);

    // Execute first step
    return executeTravelStep(game);
}

// Execute one step of travel
// C ref: hack.c domove() with context.travel flag
export async function executeTravelStep(game) {
    const { player, map, display } = game;

    if (!game.travelPath || game.travelStep >= game.travelPath.length) {
        // Travel complete
        game.travelPath = null;
        game.travelStep = 0;
        display.putstr_message('You arrive at your destination.');
        return { moved: false, tookTime: false };
    }

    const [dx, dy] = game.travelPath[game.travelStep];
    game.travelStep++;

    // Execute movement
    const result = await handleMovement([dx, dy], player, map, display, game);

    // If movement failed, stop traveling
    if (!result.moved) {
        game.travelPath = null;
        game.travelStep = 0;
        display.putstr_message('Travel interrupted.');
    }

    return result;
}

// Wait/search safety warning and execution helpers for rhack()
// C ref: do.c cmd_safety_prevention()
export function performWaitSearch(cmd, game, map, player, fov, display) {
    if (game && game.flags && game.flags.safe_wait
        && !game.menuRequested && !(game.multi > 0) && !game.occupation) {
        if (monsterNearby(map, player, fov)) {
            safetyWarning(cmd, game, display);
            return { moved: false, tookTime: false };
        }
    }
    resetSafetyWarningCounter(cmd, game);
    if (cmd === 's') {
        dosearch0(player, map, display, game);
    }
    return { moved: false, tookTime: true };
}

function safetyWarning(cmd, game, display) {
    const search = cmd === 's';
    const counterKey = search ? 'alreadyFoundFlag' : 'didNothingFlag';
    const cmddesc = search ? 'another search' : 'a no-op (to rest)';
    const act = search ? 'You already found a monster.' : 'Are you waiting to get hit?';

    if (!Number.isInteger(game[counterKey])) game[counterKey] = 0;
    const includeHint = !!(game.flags?.cmdassist || game[counterKey] === 0);
    if (!game.flags?.cmdassist) game[counterKey] += 1;

    const msg = includeHint ? `${act}  Use 'm' prefix to force ${cmddesc}.` : act;
    if (game.lastSafetyWarningMessage === msg) {
        clearTopline(display);
        return;
    }
    display.putstr_message(msg);
    game.lastSafetyWarningMessage = msg;
}

function resetSafetyWarningCounter(cmd, game) {
    if (cmd === 's') {
        game.alreadyFoundFlag = 0;
    } else {
        game.didNothingFlag = 0;
    }
    game.lastSafetyWarningMessage = '';
}

function clearTopline(display) {
    if (!display) return;
    if (typeof display.clearRow === 'function') display.clearRow(0);
    if ('topMessage' in display) display.topMessage = '';
    if ('messageNeedsMore' in display) display.messageNeedsMore = false;
}

// ========================================================================
// Ported from C hack.c — utility, terrain, capacity, movement, room, and
// combat helper functions.
// ========================================================================

// Weight constants (weight.h)
const WT_WEIGHTCAP_STRCON = 25;
const WT_WEIGHTCAP_SPARE = 50;
const MAX_CARR_CAP = 1000;
const WT_HUMAN = 1450;
const WT_WOUNDEDLEG_REDUCT = 100;

// --------------------------------------------------------------------
// Utility
// --------------------------------------------------------------------

// C ref: hack.c rounddiv() — round-aware integer division
export function rounddiv(x, y) {
    if (y === 0) return 0; // avoid panic in JS
    let divsgn = 1;
    if (y < 0) { divsgn = -divsgn; y = -y; }
    if (x < 0) { divsgn = -divsgn; x = -x; }
    let r = Math.floor(x / y);
    const m = x % y;
    if (2 * m >= y) r++;
    return divsgn * r;
}

// C ref: hack.c invocation_pos() — is (x,y) the invocation position?
export function invocation_pos(x, y, map) {
    if (!map || !map.flags) return false;
    const inv = map.inv_pos || map.flags.inv_pos;
    if (!inv) return false;
    // Invocation_lev check: only on the invocation level
    if (!map.flags.is_invocation_lev) return false;
    return x === inv.x && y === inv.y;
}

// --------------------------------------------------------------------
// Terrain checks
// --------------------------------------------------------------------

// C ref: hack.c may_dig() — is (x,y) diggable?
export function may_dig(x, y, map) {
    const loc = map.at(x, y);
    if (!loc) return false;
    return !((IS_STWALL(loc.typ) || loc.typ === TREE)
             && (loc.wall_info & 1)); // W_NONDIGGABLE = 1
}

// C ref: hack.c may_passwall() — can phase through wall at (x,y)?
export function may_passwall(x, y, map) {
    const loc = map.at(x, y);
    if (!loc) return false;
    return !(IS_STWALL(loc.typ) && (loc.wall_info & 2)); // W_NONPASSWALL = 2
}

// C ref: hack.c bad_rock() — is (x,y) impassable rock for given monster?
export function bad_rock(mdat, x, y, map) {
    const loc = map.at(x, y);
    if (!loc) return true;
    // Sokoban boulder check omitted (Sokoban not yet modeled)
    if (!IS_OBSTRUCTED(loc.typ)) return false;
    const tunnels = !!(mdat && mdat.flags2 & 0x00000040); // M2_TUNNEL placeholder
    const needspick = !!(mdat && mdat.flags1 & 0x00002000); // M1_NEEDPICK placeholder
    const passes = !!(mdat && mdat.flags1 & 0x00000100); // M1_WALLWALK placeholder
    if (tunnels && !needspick) return false;
    if (passes && may_passwall(x, y, map)) return false;
    return true;
}

// C ref: hack.c doorless_door() — does (x,y) have a doorless doorway?
export function doorless_door(x, y, map) {
    const loc = map.at(x, y);
    if (!loc || !IS_DOOR(loc.typ)) return false;
    // Rogue level: all doors are doorless but block diagonal
    if (map.flags && map.flags.is_rogue_level) return false;
    return !((loc.flags || 0) & ~(D_NODOOR | D_BROKEN));
}

// C ref: hack.c crawl_destination() — can hero crawl from water to (x,y)?
export function crawl_destination(x, y, player, map) {
    const loc = map.at(x, y);
    if (!loc || !ACCESSIBLE(loc.typ)) return false;
    // Orthogonal movement is unrestricted
    if (x === player.x || y === player.y) return true;
    // Diagonal restrictions
    if (IS_DOOR(loc.typ) && !doorless_door(x, y, map)) return false;
    return true;
}

// C ref: hack.c still_chewing() — chew on wall/door/boulder (poly'd)
// Returns true if still eating, false when done.
export function still_chewing(_x, _y, _player, _map, _display) {
    // Full chewing behavior requires multi-turn state and polymorph system.
    // Stub: always returns false (hero cannot chew).
    return false;
}

// C ref: hack.c is_pool_or_lava() helper
function is_pool_or_lava(x, y, map) {
    const loc = map.at(x, y);
    if (!loc) return false;
    return IS_POOL(loc.typ) || IS_LAVA(loc.typ);
}

// C ref: hack.c is_pool() helper
function is_pool(x, y, map) {
    const loc = map.at(x, y);
    return loc ? IS_POOL(loc.typ) : false;
}

// C ref: hack.c is_lava() helper
function is_lava(x, y, map) {
    const loc = map.at(x, y);
    return loc ? IS_LAVA(loc.typ) : false;
}

// C ref: hack.c is_ice() helper
function is_ice(x, y, map) {
    const loc = map.at(x, y);
    return loc ? loc.typ === ICE : false;
}

// C ref: hack.c is_waterwall() helper
function is_waterwall(x, y, map) {
    const loc = map.at(x, y);
    return loc ? IS_WATERWALL(loc.typ) : false;
}

// C ref: hack.c closed_door() helper
function closed_door(x, y, map) {
    const loc = map.at(x, y);
    if (!loc || !IS_DOOR(loc.typ)) return false;
    return !!((loc.flags || 0) & (D_CLOSED | D_LOCKED));
}

// C ref: hack.c sobj_at() — find object of given type at (x,y)
function sobj_at(otyp, x, y, map) {
    const objs = map.objectsAt ? map.objectsAt(x, y) : [];
    for (const obj of objs) if (obj.otyp === otyp) return obj;
    return null;
}

// --------------------------------------------------------------------
// Carrying capacity (hack.c weight_cap / inv_weight / calc_capacity etc.)
// --------------------------------------------------------------------

// C ref: hack.c weight_cap() — maximum carrying capacity
export function weight_cap(player) {
    const str = player.attributes ? player.attributes[A_STR] : 10;
    const con = player.attributes ? player.attributes[A_CON] : 10;
    let carrcap = WT_WEIGHTCAP_STRCON * (str + con) + WT_WEIGHTCAP_SPARE;
    // Polymorph adjustments omitted for now
    if (player.levitating || player.flying) {
        carrcap = MAX_CARR_CAP;
    } else {
        if (carrcap > MAX_CARR_CAP) carrcap = MAX_CARR_CAP;
        // Wounded legs reduction
        if (!player.flying) {
            if (player.woundedLegLeft) carrcap -= WT_WOUNDEDLEG_REDUCT;
            if (player.woundedLegRight) carrcap -= WT_WOUNDEDLEG_REDUCT;
        }
    }
    return Math.max(carrcap, 1);
}

// C ref: hack.c inv_weight() — weight beyond carrying capacity (negative = under)
export function inv_weight(player) {
    let wt = 0;
    const inv = player.inventory || [];
    for (const obj of inv) {
        if (!obj) continue;
        if (obj.oclass === COIN_CLASS) {
            wt += Math.floor(((obj.quan || 0) + 50) / 100);
        } else {
            wt += obj.owt || 0;
        }
    }
    const wc = weight_cap(player);
    // Store wc on player for calc_capacity to use (mirrors C's global gw.wc)
    player._wc = wc;
    return wt - wc;
}

// C ref: hack.c calc_capacity() — encumbrance level with extra weight
export function calc_capacity(player, xtra_wt) {
    const wt = inv_weight(player) + (xtra_wt || 0);
    if (wt <= 0) return UNENCUMBERED;
    const wc = player._wc || weight_cap(player);
    if (wc <= 1) return OVERLOADED;
    const cap = Math.floor(wt * 2 / wc) + 1;
    return Math.min(cap, OVERLOADED);
}

// C ref: hack.c near_capacity() — current encumbrance level
export function near_capacity(player) {
    return calc_capacity(player, 0);
}

// C ref: hack.c max_capacity() — how far over max capacity
export function max_capacity(player) {
    const wt = inv_weight(player);
    const wc = player._wc || weight_cap(player);
    return wt - 2 * wc;
}

// C ref: hack.c check_capacity() — too encumbered to act?
export function check_capacity(player, str, display) {
    if (near_capacity(player) >= EXT_ENCUMBER) {
        if (display) {
            if (str) {
                display.putstr_message(str);
            } else {
                display.putstr_message("You can't do that while carrying so much stuff.");
            }
        }
        return true;
    }
    return false;
}

// C ref: hack.c inv_cnt() — count inventory items
export function inv_cnt(player, incl_gold) {
    let ct = 0;
    const inv = player.inventory || [];
    for (const obj of inv) {
        if (!obj) continue;
        if (incl_gold || obj.oclass !== COIN_CLASS) ct++;
    }
    return ct;
}

// C ref: hack.c money_cnt() — count gold in inventory
export function money_cnt(player) {
    const inv = player.inventory || [];
    for (const obj of inv) {
        if (obj && obj.oclass === COIN_CLASS) return obj.quan || 0;
    }
    return 0;
}

// --------------------------------------------------------------------
// Movement validation (test_move, carrying_too_much, etc.)
// --------------------------------------------------------------------

// Movement mode constants matching C
export const DO_MOVE = 0;
export const TEST_MOVE = 1;
export const TEST_TRAV = 2;
export const TEST_TRAP = 3;

// C ref: hack.c test_move() — validate a move from (ux,uy) by (dx,dy)
export function test_move(ux, uy, dx, dy, mode, player, map, display) {
    const x = ux + dx;
    const y = uy + dy;
    const flags = map.flags || {};

    if (!isok(x, y)) return false;

    const loc = map.at(x, y);
    if (!loc) return false;

    // Check for physical obstacles at destination
    if (IS_OBSTRUCTED(loc.typ) || loc.typ === IRONBARS) {
        if (loc.typ === IRONBARS) {
            // Iron bars: currently no passes_bars or chewing support
            if (mode === DO_MOVE && flags.mention_walls) {
                if (display) display.putstr_message('You cannot pass through the bars.');
            }
            return false;
        }
        // Wall/rock
        if (mode === DO_MOVE) {
            if (flags.mention_walls) {
                if (display) display.putstr_message("It's a wall.");
            }
        }
        return false;
    } else if (IS_DOOR(loc.typ)) {
        if (closed_door(x, y, map)) {
            // Closed door blocks movement
            if (mode === DO_MOVE) {
                // Auto-open handled elsewhere in handleMovement
                if (flags.mention_walls) {
                    if (display) display.putstr_message('That door is closed.');
                }
            } else if (mode === TEST_TRAV || mode === TEST_TRAP) {
                // Fall through to diagonal check
            } else {
                return false;
            }
            if (mode !== TEST_TRAV && mode !== TEST_TRAP) return false;
        }
        // Diagonal into intact doorway
        if (dx && dy && !doorless_door(x, y, map)) {
            if (mode === DO_MOVE) {
                if (flags.mention_walls) {
                    if (display) display.putstr_message("You can't move diagonally into an intact doorway.");
                }
            }
            return false;
        }
    }

    // Diagonal squeeze check
    if (dx && dy && bad_rock(null, ux, y, map) && bad_rock(null, x, uy, map)) {
        if (mode === DO_MOVE) {
            if (display) display.putstr_message('Your body is too large to fit through.');
        }
        return false;
    }

    // Travel path: avoid traps and liquid
    if (mode === TEST_TRAV || mode === TEST_TRAP) {
        const trap = map.trapAt ? map.trapAt(x, y) : null;
        if (trap && trap.tseen && trap.ttyp !== VIBRATING_SQUARE) {
            return mode === TEST_TRAP;
        }
        if (is_pool_or_lava(x, y, map)) {
            return mode === TEST_TRAP;
        }
    }
    if (mode === TEST_TRAP) return false;

    // Diagonal out of intact doorway
    const fromLoc = map.at(ux, uy);
    if (dx && dy && fromLoc && IS_DOOR(fromLoc.typ)
        && !doorless_door(ux, uy, map)) {
        if (mode === DO_MOVE && flags.mention_walls) {
            if (display) display.putstr_message("You can't move diagonally out of an intact doorway.");
        }
        return false;
    }

    // Boulder check
    if (sobj_at(BOULDER, x, y, map)) {
        if (mode !== TEST_TRAV && mode !== DO_MOVE) return false;
        // For travel, allow passing through boulders optimistically
    }

    return true;
}

// C ref: hack.c carrying_too_much() — can hero move?
export function carrying_too_much(player, display) {
    const wtcap = near_capacity(player);
    if (wtcap >= OVERLOADED
        || (wtcap > SLT_ENCUMBER
            && (player.hp < 10 && player.hp !== player.hpmax))) {
        if (wtcap < OVERLOADED) {
            if (display) display.putstr_message("You don't have enough stamina to move.");
            exercise(player, A_CON, false);
        } else {
            if (display) display.putstr_message('You collapse under your load.');
        }
        return true;
    }
    return false;
}

// C ref: hack.c u_rooted() — is hero rooted in place?
export function u_rooted(player, display) {
    // Only applies when polymorphed into an immobile form
    if (player.polyData && player.polyData.mmove === 0) {
        if (display) display.putstr_message('You are rooted to the ground.');
        return true;
    }
    return false;
}

// C ref: hack.c move_out_of_bounds() — is (x,y) off the map?
export function move_out_of_bounds(x, y, display, flags) {
    if (!isok(x, y)) {
        if (flags && flags.mention_walls) {
            if (display) display.putstr_message('You have already gone as far as possible.');
        }
        return true;
    }
    return false;
}

// C ref: hack.c air_turbulence() — plane of air movement disruption
export function air_turbulence(player, map, display) {
    if (map.flags && map.flags.is_airlevel && rn2(4)
        && !player.levitating && !player.flying) {
        switch (rn2(3)) {
        case 0:
            if (display) display.putstr_message('You tumble in place.');
            exercise(player, A_DEX, false);
            break;
        case 1:
            if (display) display.putstr_message("You can't control your movements very well.");
            break;
        case 2:
            if (display) display.putstr_message("It's hard to walk in thin air.");
            exercise(player, A_DEX, true);
            break;
        }
        return true;
    }
    return false;
}

// C ref: hack.c water_turbulence() — underwater movement disruption
export function water_turbulence(player, map, display, target = null) {
    if (!player?.uinwater) return false;

    if (map?.flags?.is_waterlevel) {
        maybe_adjust_hero_bubble(map, {
            x: player.x,
            y: player.y,
            dx: player.dx,
            dy: player.dy,
        });
    }
    water_friction(map, player, display);
    if (!player.dx && !player.dy) {
        return true;
    }

    const x = player.x + player.dx;
    const y = player.y + player.dy;
    if (target) {
        target.x = x;
        target.y = y;
    }

    if (isok(x, y) && !IS_POOL(map?.at(x, y)?.typ)
        && !(map?.flags?.is_waterlevel) && near_capacity(player) > (player.swimming ? MOD_ENCUMBER : SLT_ENCUMBER)) {
        if (display) display.putstr_message('You are carrying too much to climb out of the water.');
        player.dx = 0;
        player.dy = 0;
        return true;
    }
    return false;
}

// C ref: hack.c slippery_ice_fumbling() — fumble on ice
export function slippery_ice_fumbling(player, map) {
    if (player.levitating) return;
    const loc = map.at(player.x, player.y);
    if (!loc || loc.typ !== ICE) return;
    // Cold-resistant or flying heroes don't fumble
    if (player.coldResistant || player.flying) return;
    if (!rn2(player.coldResistant ? 3 : 2)) {
        // Fumbling flag would be set here in full implementation
        player.fumbling = true;
    }
}

// C ref: hack.c u_maybe_impaired() — is hero stunned or confused?
export function u_maybe_impaired(player) {
    return !!(player.stunned || (player.confused && !rn2(5)));
}

// C ref: hack.c impaired_movement() — randomize movement if impaired
export function impaired_movement(player, _map) {
    // Full implementation requires confdir() which randomizes direction
    // Stub: returns false (movement proceeds normally)
    if (u_maybe_impaired(player)) {
        // In full implementation, direction would be randomized
    }
    return false;
}

// C ref: hack.c swim_move_danger() — is it dangerous to move into water/lava?
export function swim_move_danger(x, y, player, map, display) {
    const loc = map.at(x, y);
    if (!loc) return false;
    const isLiquid = IS_POOL(loc.typ) || IS_LAVA(loc.typ);
    if (!isLiquid) return false;
    if (player.levitating || player.flying) return false;
    // If player is underwater, pool is ok
    if (player.uinwater && IS_POOL(loc.typ)) return false;
    // Warn about stepping into liquid
    if (!player.stunned && !player.confused) {
        if (display) {
            const what = IS_POOL(loc.typ) ? 'water' : 'lava';
            display.putstr_message(`You avoid stepping into the ${what}.`);
        }
        return true;
    }
    return false;
}

// C ref: hack.c avoid_moving_on_trap() — stop for known trap during run
export function avoid_moving_on_trap(x, y, msg, map, display, flags) {
    const trap = map.trapAt ? map.trapAt(x, y) : null;
    if (trap && trap.tseen && trap.ttyp !== VIBRATING_SQUARE) {
        if (msg && flags && flags.mention_walls) {
            if (display) display.putstr_message('You stop in front of a trap.');
        }
        return true;
    }
    return false;
}

// C ref: hack.c avoid_moving_on_liquid() — stop at edge of pool/lava
export function avoid_moving_on_liquid(x, y, msg, player, map, display, flags) {
    if (!is_pool_or_lava(x, y, map)) return false;
    if (player.levitating || player.flying) return false;
    const loc = map.at(x, y);
    if (!loc || !loc.seenv) return false;
    if (msg && flags && flags.mention_walls) {
        const what = IS_POOL(loc.typ) ? 'water' : 'lava';
        if (display) display.putstr_message(`You stop at the edge of the ${what}.`);
    }
    return true;
}

// C ref: hack.c avoid_running_into_trap_or_liquid()
export function avoid_running_into_trap_or_liquid(x, y, player, map, display, run) {
    if (!run) return false;
    const wouldStop = run >= 2;
    const flags = map.flags || {};
    if (avoid_moving_on_trap(x, y, wouldStop, map, display, flags)
        || (player.blind && avoid_moving_on_liquid(x, y, wouldStop, player, map, display, flags))) {
        if (wouldStop) return true;
    }
    return false;
}

// --------------------------------------------------------------------
// Running control
// --------------------------------------------------------------------

// C ref: hack.c end_running() — stop running/traveling
export function end_running(and_travel, game) {
    if (!game) return;
    game.running = false;
    if (and_travel) {
        game.travelPath = null;
        game.travelStep = 0;
        game.traveling = false;
    }
    if (game.multi > 0) game.multi = 0;
}

// C ref: hack.c nomul() — set multi-turn action count
export function nomul(nval, game) {
    if (!game) return;
    if (typeof game.multi !== 'number') game.multi = 0;
    if (game.multi < nval) return; // bug fix from C
    game.multi = nval;
    if (nval === 0) {
        game.multi_reason = null;
    }
    end_running(true, game);
}

// C ref: hack.c unmul() — end a multi-turn action
export function unmul(msg_override, player, display, game) {
    if (!game) return;
    game.multi = 0;
    const msg = msg_override || 'You can move again.';
    if (msg && display) {
        display.putstr_message(msg);
    }
    if (player) player.usleep = 0;
    game.multi_reason = null;
}

// --------------------------------------------------------------------
// Room / location helpers
// --------------------------------------------------------------------

// C ref: hack.c in_rooms() — which rooms contain (x,y)?
// Returns array of room indices (offset by ROOMOFFSET).
export function in_rooms(x, y, typewanted, map) {
    if (!map || !map.rooms) return [];
    const loc = map.at(x, y);
    if (!loc) return [];
    const roomno = loc.roomno;
    if (roomno === undefined || roomno === null) return [];

    const NO_ROOM = 0;
    const SHARED = 1;
    const SHARED_PLUS = 2;

    const result = [];

    function goodtype(rno) {
        const idx = rno - ROOMOFFSET;
        if (idx < 0 || idx >= map.rooms.length) return false;
        if (!typewanted) return true;
        const rt = map.rooms[idx].rtype || OROOM;
        return rt === typewanted || (typewanted === SHOPBASE && rt > SHOPBASE);
    }

    if (roomno === NO_ROOM) return result;
    if (roomno !== SHARED && roomno !== SHARED_PLUS) {
        // Regular room
        if (goodtype(roomno)) result.push(roomno);
        return result;
    }

    // SHARED or SHARED_PLUS: scan neighbors
    const step = roomno === SHARED ? 2 : 1;
    const minX = Math.max(1, x - 1);
    const maxX = Math.min(COLNO - 1, x + 1);
    const minY = Math.max(0, y - 1);
    const maxY = Math.min(ROWNO - 1, y + 1);

    for (let sx = minX; sx <= maxX; sx += step) {
        for (let sy = minY; sy <= maxY; sy += step) {
            const nloc = map.at(sx, sy);
            if (!nloc) continue;
            const rno = nloc.roomno;
            if (rno >= ROOMOFFSET && !result.includes(rno) && goodtype(rno)) {
                result.push(rno);
            }
        }
    }
    return result;
}

// C ref: hack.c in_town() — is (x,y) in a town?
export function in_town(x, y, map) {
    if (!map || !map.flags || !map.flags.has_town) return false;
    if (!map.rooms) return false;
    let has_subrooms = false;
    for (const room of map.rooms) {
        if (!room || room.hx <= 0) continue;
        if (room.nsubrooms > 0) {
            has_subrooms = true;
            if (x >= room.lx && x <= room.hx && y >= room.ly && y <= room.hy) {
                return true;
            }
        }
    }
    return !has_subrooms;
}

// C ref: hack.c monstinroom() — find monster of type in room
export function monstinroom(mdat_pmid, roomno, map) {
    if (!map || !map.monsters) return null;
    for (const mon of map.monsters) {
        if (mon.dead) continue;
        if (mon.mnum === mdat_pmid || (mon.type && mon.type.mnum === mdat_pmid)) {
            const rooms = in_rooms(mon.mx, mon.my, 0, map);
            if (rooms.includes(roomno + ROOMOFFSET)) return mon;
        }
    }
    return null;
}

// C ref: hack.c furniture_present() — check for furniture type in room
export function furniture_present(furniture, roomno, map) {
    if (!map || !map.rooms || roomno < 0 || roomno >= map.rooms.length) return false;
    const room = map.rooms[roomno];
    if (!room) return false;
    for (let y = room.ly; y <= room.hy; y++) {
        for (let x = room.lx; x <= room.hx; x++) {
            const loc = map.at(x, y);
            if (loc && loc.typ === furniture) return true;
        }
    }
    return false;
}

// C ref: hack.c move_update() — track room entry/exit
export function move_update(newlev, player, map) {
    if (!player || !map) return;
    player.urooms0 = player.urooms || '';
    player.ushops0 = player.ushops || '';
    if (newlev) {
        player.urooms = '';
        player.uentered = '';
        player.ushops = '';
        player.ushops_entered = '';
        player.ushops_left = player.ushops0;
        return;
    }
    const rooms = in_rooms(player.x, player.y, 0, map);
    player.urooms = rooms.map(r => String.fromCharCode(r)).join('');

    let entered = '';
    let shops = '';
    let shopsEntered = '';
    for (const rno of rooms) {
        const c = String.fromCharCode(rno);
        if (!player.urooms0.includes(c)) entered += c;
        const idx = rno - ROOMOFFSET;
        if (idx >= 0 && map.rooms && map.rooms[idx]) {
            const rt = map.rooms[idx].rtype || OROOM;
            if (rt >= SHOPBASE) {
                shops += c;
                if (!player.ushops0.includes(c)) shopsEntered += c;
            }
        }
    }
    player.uentered = entered;
    player.ushops = shops;
    player.ushops_entered = shopsEntered;

    // Build ushops_left
    let left = '';
    for (const ch of player.ushops0) {
        if (!player.ushops.includes(ch)) left += ch;
    }
    player.ushops_left = left;
}

// C ref: hack.c check_special_room() — room entry messages
export function check_special_room(newlev, player, map, display) {
    move_update(newlev, player, map);

    if (!player.uentered && !player.ushops_entered) return;

    // Shop entry handled by maybeHandleShopEntryMessage elsewhere

    if (!player.uentered) return;
    if (!map || !map.rooms) return;

    for (const ch of player.uentered) {
        const roomno = ch.charCodeAt(0) - ROOMOFFSET;
        if (roomno < 0 || roomno >= map.rooms.length) continue;
        const rt = map.rooms[roomno].rtype || OROOM;

        switch (rt) {
        case ZOO:
            if (display) display.putstr_message("Welcome to David's treasure zoo!");
            break;
        case SWAMP:
            if (display) display.putstr_message('It looks rather muddy down here.');
            break;
        case COURT:
            if (display) {
                const hasThrone = furniture_present(THRONE, roomno, map);
                display.putstr_message(`You enter an opulent${hasThrone ? ' throne' : ''} room!`);
            }
            break;
        case LEPREHALL:
            if (display) display.putstr_message('You enter a leprechaun hall!');
            break;
        case MORGUE:
            if (display) display.putstr_message('You have an uncanny feeling...');
            break;
        case BEEHIVE:
            if (display) display.putstr_message('You enter a giant beehive!');
            break;
        case COCKNEST:
            if (display) display.putstr_message('You enter a disgusting nest!');
            break;
        case ANTHOLE:
            if (display) display.putstr_message('You enter an anthole!');
            break;
        case BARRACKS:
            if (display) display.putstr_message('You enter a military barracks!');
            break;
        case DELPHI:
            // Oracle greeting handled separately
            break;
        case TEMPLE:
            // Temple entry handled separately
            break;
        default:
            break;
        }

        // Mark room as discovered (type -> OROOM) after first entry
        if (rt !== OROOM && rt !== TEMPLE && rt < SHOPBASE) {
            map.rooms[roomno].rtype = OROOM;
        }
    }
}

// --------------------------------------------------------------------
// Spot effects (spoteffects, pooleffects, switch_terrain)
// --------------------------------------------------------------------

// C ref: hack.c set_uinwater()
export function set_uinwater(player, in_out) {
    player.uinwater = in_out ? 1 : 0;
}

// C ref: hack.c switch_terrain() — toggle levitation/flight when entering
//   solid terrain
export function switch_terrain(player, map, display) {
    const loc = map.at(player.x, player.y);
    if (!loc) return;
    const blocklev = IS_OBSTRUCTED(loc.typ) || closed_door(player.x, player.y, map)
                     || IS_WATERWALL(loc.typ) || loc.typ === LAVAWALL;
    if (blocklev) {
        if (player.levitating && display) {
            display.putstr_message("You can't levitate in here.");
        }
        if (player.flying && display) {
            display.putstr_message("You can't fly in here.");
        }
    }
}

// C ref: hack.c pooleffects() — check for entering/leaving water/lava
// Returns true to skip rest of spoteffects.
export function pooleffects(newspot, player, map, display) {
    // Check for leaving water
    if (player.uinwater) {
        if (!is_pool(player.x, player.y, map)) {
            if (display) display.putstr_message('You are back on solid ground.');
            set_uinwater(player, 0);
        }
        // Still in water: no further pool effects
    }

    // Check for entering water or lava
    if (!player.ustuck && !player.levitating && !player.flying
        && is_pool_or_lava(player.x, player.y, map)) {
        if (is_lava(player.x, player.y, map)) {
            // lava_effects() would be called here
            if (display) display.putstr_message('The lava burns you!');
            // Simplified: don't kill outright
            return true;
        } else {
            // drown() would be called here for non-water-walkers
            if (!player.waterWalking) {
                if (display) display.putstr_message('You fall into the water!');
                return true;
            }
        }
    }
    return false;
}

// C ref: hack.c spoteffects() — effects of stepping on current square
export function spoteffects(pick, player, map, display, game) {
    // Prevent recursion
    if (player._inSpoteffects) return;
    player._inSpoteffects = true;

    try {
        // Terrain-dependent levitation/flight changes
        const oldLoc = map.at(game.ux0 || player.x, game.uy0 || player.y);
        const curLoc = map.at(player.x, player.y);
        if (curLoc && oldLoc && curLoc.typ !== oldLoc.typ) {
            switch_terrain(player, map, display);
        }

        // Pool/lava effects
        if (pooleffects(true, player, map, display)) {
            return;
        }

        // Room entry messages
        check_special_room(false, player, map, display);

        // Sink + levitation
        if (curLoc && curLoc.typ === SINK && player.levitating) {
            // dosinkfall() would be called
        }

        // Trap effects
        const trap = map.trapAt ? map.trapAt(player.x, player.y) : null;
        const isPit = trap && is_pit(trap.ttyp);

        // Pick up before trap (unless pit)
        if (pick && !isPit) {
            // Autopickup handled by handleMovement
        }

        // Trigger trap (already handled in handleMovement for basic traps)

        // Pick up after pit trap
        if (pick && isPit) {
            // Autopickup handled by handleMovement
        }

    } finally {
        player._inSpoteffects = false;
    }
}

// C ref: hack.c invocation_message() — vibration at invocation pos
export function invocation_message(player, map, display) {
    if (!invocation_pos(player.x, player.y, map)) return;
    // Check not on stairs
    const loc = map.at(player.x, player.y);
    if (loc && loc.typ === STAIRS) return;

    if (display) {
        if (player.levitating || player.flying) {
            display.putstr_message('You feel a strange vibration beneath you.');
        } else {
            display.putstr_message('You feel a strange vibration under your feet.');
        }
    }
    player.uvibrated = true;
}

// C ref: hack.c spot_checks() — handle terrain changes at (x,y)
export function spot_checks(_x, _y, _old_typ, _map) {
    // ICE melting effects and drawbridge ice checks
    // Stub: no timer system yet
}

// --------------------------------------------------------------------
// Pickup
// --------------------------------------------------------------------

// C ref: hack.c pickup_checks() — validate pickup attempt
// Returns: 1 = cannot pickup (time taken), 0 = cannot pickup (no time),
//          -1 = do normal pickup, -2 = loot monster inventory
export function pickup_checks(player, map, display) {
    // Swallowed
    if (player.uswallow) {
        if (display) {
            display.putstr_message("You don't see anything in here to pick up.");
        }
        return 1;
    }
    // Pool
    if (is_pool(player.x, player.y, map)) {
        if (player.levitating || player.flying) {
            if (display) display.putstr_message('You cannot dive into the water to pick things up.');
            return 0;
        }
    }
    // Lava
    if (is_lava(player.x, player.y, map)) {
        if (player.levitating || player.flying) {
            if (display) display.putstr_message("You can't reach the bottom to pick things up.");
            return 0;
        }
    }
    // No objects
    const objs = map.objectsAt ? map.objectsAt(player.x, player.y) : [];
    if (objs.length === 0) {
        const loc = map.at(player.x, player.y);
        if (loc) {
            if (loc.typ === THRONE) {
                if (display) display.putstr_message('It must weigh a ton!');
            } else if (loc.typ === SINK) {
                if (display) display.putstr_message('The plumbing connects it to the floor.');
            } else if (loc.typ === GRAVE) {
                if (display) display.putstr_message("You don't need a gravestone.  Yet.");
            } else if (loc.typ === FOUNTAIN) {
                if (display) display.putstr_message('You could drink the water...');
            } else if (IS_DOOR(loc.typ) && ((loc.flags || 0) & D_ISOPEN)) {
                if (display) display.putstr_message("It won't come off the hinges.");
            } else if (loc.typ === ALTAR) {
                if (display) display.putstr_message('Moving the altar would be a very bad idea.');
            } else if (loc.typ === STAIRS) {
                if (display) display.putstr_message('The stairs are solidly affixed.');
            } else {
                if (display) display.putstr_message('There is nothing here to pick up.');
            }
        } else {
            if (display) display.putstr_message('There is nothing here to pick up.');
        }
        return 0;
    }
    // Can't reach floor (levitating without landing, in a pit, etc.)
    // Simplified: always reachable for now
    return -1;
}

// C ref: hack.c dopickup() — the #pickup command
export function dopickup(player, map, display) {
    const ret = pickup_checks(player, map, display);
    if (ret >= 0) {
        return ret ? { tookTime: true } : { tookTime: false };
    }
    // Normal pickup: handled elsewhere via pickup() in pickup.js
    return { tookTime: false, doPickup: true };
}

// --------------------------------------------------------------------
// Combat / damage helpers
// --------------------------------------------------------------------

// C ref: hack.c overexert_hp() — lose 1 HP or pass out from overexertion
export function overexert_hp(player, display) {
    if (player.hp > 1) {
        player.hp -= 1;
    } else {
        if (display) display.putstr_message('You pass out from exertion!');
        exercise(player, A_CON, false);
        // fall_asleep(-10, false) would be called
    }
}

// C ref: hack.c overexertion() — combat metabolism check
// Returns true if hero fainted (multi < 0).
export function overexertion(player, game, display) {
    // gethungry()
    rn2(20);
    const moves = game.moves || 0;
    if ((moves % 3) !== 0 && near_capacity(player) >= HVY_ENCUMBER) {
        overexert_hp(player, display);
    }
    return (game.multi || 0) < 0;
}

// C ref: hack.c maybe_wail() — low HP warning for certain roles
export function maybe_wail(player, game, display) {
    const moves = game.moves || 0;
    if (moves <= (game.wailmsg || 0) + 50) return;
    game.wailmsg = moves;

    const role = player.role;
    const race = player.race;
    const isWizard = role === 'Wizard' || role === 12;
    const isValkyrie = role === 'Valkyrie' || role === 11;
    const isElf = race === 'Elf' || race === 1;

    if (isWizard || isElf || isValkyrie) {
        const who = (isWizard || isValkyrie)
            ? (player.roleName || 'Adventurer')
            : 'Elf';
        if (player.hp === 1) {
            if (display) display.putstr_message(`${who} is about to die.`);
        } else {
            if (display) display.putstr_message(`${who}, your life force is running out.`);
        }
    } else {
        if (player.hp === 1) {
            if (display) display.putstr_message('You hear the wailing of the Banshee...');
        } else {
            if (display) display.putstr_message('You hear the howling of the CwnAnnwn...');
        }
    }
}

// C ref: hack.c saving_grace() — one-time survival of lethal blow
export function saving_grace(dmg, player, game) {
    if (dmg < 0) return 0;
    // Only protects from monster attacks
    if (!game.mon_moving) return dmg;
    if (dmg < player.hp || player.hp <= 0) return dmg;
    // Already used?
    if (game.saving_grace_turn) return player.hp - 1;
    if (!player.usaving_grace
        && player._uhp_at_start >= 0
        && (player._uhp_at_start * 100 / player.hpmax) >= 90) {
        dmg = player.hp - 1;
        player.usaving_grace = 1;
        game.saving_grace_turn = true;
        end_running(true, game);
    }
    return dmg;
}

// C ref: hack.c showdamage() — display HP loss
export function showdamage(dmg, player, display) {
    if (!dmg) return;
    const hp = player.hp || 0;
    if (display) display.putstr_message(`[HP ${-dmg}, ${hp} left]`);
}

// C ref: hack.c losehp() — hero loses hit points
export function losehp(n, knam, k_format, player, display, game) {
    end_running(true, game);
    player.hp -= n;
    if (player.hpmax < player.hp) player.hpmax = player.hp;
    if (player.hp < 1) {
        if (display) display.putstr_message('You die...');
        // done(DIED) would be called in full implementation
        // For now, set hp to 0
        player.hp = 0;
        if (game) {
            game.killer = { format: k_format, name: knam || '' };
            game.playerDied = true;
        }
    } else if (n > 0 && player.hp * 10 < player.hpmax) {
        maybe_wail(player, game, display);
    }
}

// --------------------------------------------------------------------
// Monster awareness
// --------------------------------------------------------------------

// C ref: hack.c monster_nearby() — is a threatening monster adjacent?
// Re-export from monutil.js for convenience.
export { monsterNearby as monster_nearby };

// C ref: hack.c notice_mon() — accessibility notice for a monster
export function notice_mon(_mtmp) {
    // Accessibility feature: announce newly spotted monsters.
    // Stub: not yet implemented.
}

// C ref: hack.c notice_all_mons() — notice all visible monsters
export function notice_all_mons(_reset) {
    // Stub: not yet implemented.
}

// --------------------------------------------------------------------
// Locomotion helpers
// --------------------------------------------------------------------

// C ref: hack.c u_locomotion() — appropriate movement verb for hero
export function u_locomotion(def, player) {
    if (player && player.levitating) {
        return def.charAt(0) === def.charAt(0).toUpperCase() ? 'Float' : 'float';
    }
    if (player && player.flying) {
        return def.charAt(0) === def.charAt(0).toUpperCase() ? 'Fly' : 'fly';
    }
    return def;
}

// C ref: hack.c handle_tip() — show gameplay tip
export function handle_tip(_tip, _player, _display) {
    // Tips system not yet implemented.
    return false;
}

// --------------------------------------------------------------------
// Escape from traps
// --------------------------------------------------------------------

// C ref: hack.c trapmove() — try to escape from a trap
// Returns true if hero can continue moving to intended destination.
export function trapmove(player, _x, _y, display) {
    if (!player.utrap) return true;

    switch (player.utraptype) {
    case 'beartrap':
        if (display) display.putstr_message('You are caught in a bear trap.');
        if (rn2(5) === 0) player.utrap--;
        if (!player.utrap) {
            if (display) display.putstr_message('You finally wriggle free.');
        }
        return false;
    case 'pit':
        // climb_pit() would be called
        if (display) display.putstr_message('You are in a pit.');
        return false;
    case 'web':
        player.utrap--;
        if (!player.utrap) {
            if (display) display.putstr_message('You disentangle yourself.');
        } else {
            if (display) display.putstr_message('You are stuck to the web.');
        }
        return false;
    case 'lava':
        if (display) display.putstr_message('You are stuck in the lava.');
        player.utrap--;
        return false;
    default:
        return false;
    }
}

// C ref: hack.c is_valid_travelpt() — can hero travel to (x,y)?
export function is_valid_travelpt(x, y, player, map) {
    if (player.x === x && player.y === y) return true;
    if (!isok(x, y)) return false;
    const loc = map.at(x, y);
    if (!loc) return false;
    // Stone that hasn't been seen is not a valid travel point
    if (loc.typ === STONE && !loc.seenv) return false;
    // Check if we can path there
    const path = findPath(map, player.x, player.y, x, y);
    return path !== null;
}

// C ref: hack.c revive_nasty() — revive rider corpses at (x,y)
export function revive_nasty(_x, _y, _msg, _map) {
    // Rider revival system not yet implemented.
    return false;
}

// C ref: hack.c movobj() — move an object to new position
export function movobj(obj, ox, oy, map) {
    if (map && map.removeObject) map.removeObject(obj);
    obj.ox = ox;
    obj.oy = oy;
    if (map && map.placeObject) map.placeObject(obj, ox, oy);
}

// C ref: hack.c dosinkfall() — fall into a sink while levitating
export function dosinkfall(player, map, display) {
    if (!player.levitating) return;
    const loc = map.at(player.x, player.y);
    if (!loc || loc.typ !== SINK) return;
    // Innate levitation just wobbles
    if (player.inherentLevitation) {
        if (display) display.putstr_message('You wobble unsteadily for a moment.');
        return;
    }
    if (display) display.putstr_message('You crash to the floor!');
    const con = player.attributes ? player.attributes[A_CON] : 10;
    const dmg = rn2(8) + Math.max(1, 25 - con); // rn1(8, 25-CON)
    if (typeof player.takeDamage === 'function') {
        player.takeDamage(dmg, 'fell onto a sink');
    }
    exercise(player, A_DEX, false);
}

// C ref: hack.c impact_disturbs_zombies()
export function impact_disturbs_zombies(_obj, _violent) {
    // Buried zombie timer system not yet implemented.
}

// C ref: hack.c disturb_buried_zombies()
export function disturb_buried_zombies(_x, _y) {
    // Buried zombie timer system not yet implemented.
}

// C ref: hack.c u_simple_floortyp() — simplified floor type for hero
export function u_simple_floortyp(x, y, player, map) {
    const loc = map.at(x, y);
    if (!loc) return ROOM;
    if (IS_WATERWALL(loc.typ)) return WATER;
    if (loc.typ === LAVAWALL) return LAVAWALL;
    const inAir = player.levitating || player.flying;
    if (!inAir) {
        if (IS_POOL(loc.typ)) return POOL;
        if (IS_LAVA(loc.typ)) return LAVAPOOL;
    }
    return ROOM;
}

// C ref: hack.c feel_location() — feel terrain when blind
export function feel_location(_x, _y, _map) {
    // Display update for blind hero; stub.
}

// C ref: hack.c feel_newsym() — update map display for a newly felt location
export function feel_newsym(_map, _x, _y) {
    // Display update for blind hero; stub.
}

// C ref: hack.c lava_effects() — effects of stepping on lava
// Returns true if hero moved while surviving.
export function lava_effects(player, map, display) {
    if (!is_lava(player.x, player.y, map)) return false;
    if (player.fireResistant) {
        if (display) display.putstr_message('The lava feels warm.');
        return false;
    }
    // Damage from lava
    const dmg = d(6, 6);
    if (display) display.putstr_message("The lava burns you!");
    if (typeof player.takeDamage === 'function') {
        player.takeDamage(dmg, 'molten lava');
    }
    return false;
}

// C ref: hack.c swamp_effects() — effects of stepping in swamp
// Note: C doesn't have a standalone swamp_effects; swamp is a room type.
// This is a convenience stub for swamp terrain interaction.
export function swamp_effects(_player, _map, _display) {
    // Swamp rooms just give an entry message (handled by check_special_room).
    // No per-step swamp terrain effect in C.
}

// C ref: hack.c search_demand() — forced search from trap
// Note: C doesn't have search_demand in hack.c; this may refer to
// dosearch0 in detect.c. Re-export for convenience.
export { dosearch0 as search_demand };

// C ref: hack.c getdir() — get direction from player input
// Note: getdir() is actually in cmd.c in C; included here as it was
// mentioned in the task. Uses DIRECTION_KEYS from dothrow.js.
export async function getdir(prompt, display) {
    if (display && prompt) display.putstr_message(prompt);
    const ch = await nhgetch();
    const c = String.fromCharCode(ch);
    const dir = DIRECTION_KEYS[c.toLowerCase()];
    if (dir) return { dx: dir[0], dy: dir[1], dz: 0 };
    if (c === '>' || c === '<') return { dx: 0, dy: 0, dz: c === '>' ? 1 : -1 };
    if (c === '.') return { dx: 0, dy: 0, dz: 0 };
    return null; // invalid direction
}

// C ref: hack.c hurtle_step() — one step of hurtling through the air
// Note: hurtle_step is actually in dothrow.c in C. Included here as
// mentioned in the task.
export function hurtle_step(x, y, player, map) {
    if (!isok(x, y)) return false;
    const loc = map.at(x, y);
    if (!loc || !ACCESSIBLE(loc.typ)) return false;
    // Check for monster blocking
    const mon = map.monsterAt ? map.monsterAt(x, y) : null;
    if (mon && !mon.dead) return false;
    // Move hero
    player.x = x;
    player.y = y;
    return true;
}

// C ref: hack.c drag_ball() — drag ball & chain when punished
// Returns true if movement can proceed.
export function drag_ball(_x, _y, _player, _map) {
    // Ball & chain (punishment) system not yet fully implemented.
    // Always allow movement.
    return true;
}
