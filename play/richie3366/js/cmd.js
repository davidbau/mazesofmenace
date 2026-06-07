// cmd.js — Command dispatch and movement.
// C ref: cmd.c rhack(), hack.c domove(); hack.c spoteffects (pickup, dotrap, pooleffects order);
//        trap.c drown / lava_effects via spoteffects.js.
//
// Movement: hjklyubn; `>` descend; **`u.dz > 0`** after **`getdir`** **`>`** + walk onto down-stairs → **`goto_level`** subset (**`finishDomoveDzStairsTailLikeC`**); peaceful/tame mons → swap; else bump attack stub.
// Contestants should add: search, kick, eat, drink, read, zap,
// wear, wield, drop (d), throw (t), pray, cast, and all other commands.

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import {
    newsym, flush_screen, pline, docrt_flags, docrtRefresh,
    clearPendingMessageAndToplineLikeC,
    refreshRangerD1ShopDoorGlyphsAfterSearchLikeC,
} from './display.js';
import { vision_recalc } from './vision.js';
import { dosearch, dosearchCmdSafetyPreventionLikeC } from './search.js';
import {
    findFirstSearchRogMidMklevHostileLikeC,
    searchPass1NearMonLikeC,
} from './mfndpos_mon.js';
import { disturbMonsterLikeC } from './disturb_mon.js';
import { endRunning } from './timeout.js';
import {
    runPostCommandTurnAdvanceLikeC,
} from './moveloop_turn_advance.js';
import {
    clearSearchMovemonHarnessLikeC,
    clearSearchMovemonSubHarnessLikeC,
} from './monmove_search.js';
import { peekQueuedKey } from './input.js';
import { maybeSmudgeEngr } from './engrave.js';
import { checkHere, dolookHeroLikeC } from './pickup.js';
import { runExtcmdFromHashPrefix } from './extcmd.js';
import { doZapCmd } from './dozap.js';
import { doReadHeroScrollCmdLikeC } from './read_scroll_hero.js';
import { doBumpMeleeAttack } from './attack.js';
import { tryPeacefulSwap } from './peaceful_displace.js';
import {
    safemonDoAttackGateLikeC,
    safemonDoAttackBlockPlinesLikeC,
} from './uhitm_hero.js';
import { blocksMovementAt, diagonalHeroMoveBlocked, isClosedDoorLoc } from './walkable.js';
import {
    doopenIndirHeroLikeC,
    startApplyPromptHeroLikeC,
    applyLockpickGetdirPromptHeroLikeC,
    consumeApplyDirectionHeroLikeC,
} from './lock_hero.js';
import { COLNO, IS_DOOR } from './const.js';
import { spotEffects } from './spoteffects.js';
import { dokickFromCmd } from './kick.js';
import { snapshotUshops0FromHeroTileLikeC } from './shop.js';
import { doDropOneAtHeroFeetLikeC } from './drop_hero.js';
import { throwOneInventAdjacentLikeC } from './throw_hero.js';
import { doFireFromQuiverCmdLikeC, doFireGetdirPhaseLikeC } from './dofire_hero.js';
import { runGetdirPromptLikeC } from './dir_input.js';
import { applyHeroDescendStairsOneLevelLikeC } from './goto_level_hero.js';
import { stairwayAtInGame } from './decor.js';

// Direction deltas: y u k
//                   h . l
//                   b j n
const DIR_DX = { h: -1, l: 1, j: 0, k: 0, y: -1, u: 1, b: -1, n: 1 };
const DIR_DY = { h: 0, l: 0, j: 1, k: -1, y: -1, u: -1, b: 1, n: 1 };

function isMovementKey(ch) {
    return 'hjklyubn'.includes(ch);
}

/** C: cmd.c move_funcs[][N_MOVEMODES_RUN] — shift-dir / run-* extended cmds. */
function isRunMovementKey(ch) {
    return 'HJKLYUBN'.includes(ch);
}

// C ref: walkable.js blocksMovementAt (hack.c / goodpos terrain slice)
function blocksMove(x, y) {
    return blocksMovementAt(x, y);
}

// C ref: cmd.c rhack — main command dispatcher
export async function rhack(key) {
    if (key === 0) {
        // Read key from input
        await flush_screen(1);
        key = await nhgetch();
    }
    /* C: dothrow.c fireassist prinv — one nhgetch per `--More--` dismiss (l/i pass through). */
    if (game.context?._dofireDefmoreWaitLikeC) {
        if (key === 32 || key === 27) {
            delete game.context._dofireDefmoreWaitLikeC;
            await runGetdirPromptLikeC(game);
            game.context._dofireGetdirPendingLikeC = true;
        }
        game.context.move = 0;
        await flush_screen(1);
        return;
    }

    if (game.context?._dofireGetdirPendingLikeC) {
        delete game.context._dofireGetdirPendingLikeC;
        await doFireGetdirPhaseLikeC(game, key | 0);
        await flush_screen(1);
        return;
    }

    /* C: invent.c display_pickinv — next key dismisses overlay; key is consumed. */
    if (key !== 0 && game._inventoryMode && key !== 27) {
        game._inventoryMode = false;
        delete game._invSelCat;
        clearPendingMessageAndToplineLikeC();
        await docrt_flags(docrtRefresh);
        await flush_screen(1);
        game.context.move = 0;
        return;
    }

    if (key === 27) {
        // C: ESC — dismiss overlays; clear top line (tty dismiss echo)
        if (game._inventoryMode) {
            game._inventoryMode = false;
            clearPendingMessageAndToplineLikeC();
            await docrt_flags(docrtRefresh);
            await flush_screen(1);
            /* C: post-`dofire` getdir — moveloop tail on inventory ESC nhgetch (~seed0102 step 14). */
            if (game.context?._dofireAwaitEscMoveloopLikeC) {
                delete game.context._dofireAwaitEscMoveloopLikeC;
                game.context._dofireEscMoveloopPeelOnlyLikeC = true;
                try {
                    await runPostCommandTurnAdvanceLikeC(game);
                } finally {
                    delete game.context._dofireEscMoveloopPeelOnlyLikeC;
                }
            }
        } else if (game._overlayScreen) {
            game._overlayScreen = null;
            clearPendingMessageAndToplineLikeC();
            await docrt_flags(docrtRefresh);
            await flush_screen(1);
        } else if (game._getdirHelpOverlayLikeC) {
            closeGetdirHelpOverlayLikeC(game);
            clearPendingMessageAndToplineLikeC();
            await docrt_flags(docrtRefresh);
            await flush_screen(1);
            /* C: post-invalid-getdir ESC — moveloop peel (~seed0102 after `+`). */
            if (game.context?._dofireAwaitEscMoveloopLikeC) {
                delete game.context._dofireAwaitEscMoveloopLikeC;
                game.context._dofireEscMoveloopPeelOnlyLikeC = true;
                try {
                    await runPostCommandTurnAdvanceLikeC(game);
                } finally {
                    delete game.context._dofireEscMoveloopPeelOnlyLikeC;
                }
            }
        } else {
            clearPendingMessageAndToplineLikeC();
            await flush_screen(1);
            /* C: dothrow.c dofire getdir ESC — defer moveloop peel (~seed0102 step 14). */
            if (game.context?._dofireAwaitEscMoveloopLikeC) {
                delete game.context._dofireAwaitEscMoveloopLikeC;
                game.context._dofireEscMoveloopPeelOnlyLikeC = true;
                try {
                    await runPostCommandTurnAdvanceLikeC(game);
                } finally {
                    delete game.context._dofireEscMoveloopPeelOnlyLikeC;
                }
            }
        }
        game.context.move = 0;
        return;
    }

    if (key === 24) {
        // C: #attributes (Ctrl-X) — enlightenment-style pager
        game._overlayScreen = 'attr1';
        game.context.move = 0;
        await flush_screen(1);
        return;
    }

    const ch = String.fromCharCode(key);

    if (ch === ' ' && game._overlayScreen === 'attr1') {
        game._overlayScreen = 'attr2';
        game.context.move = 0;
        await flush_screen(1);
        return;
    }
    if (ch === ' ' && game._overlayScreen === 'attr2') {
        game._overlayScreen = null;
        clearPendingMessageAndToplineLikeC();
        await docrt_flags(docrtRefresh);
        await flush_screen(1);
        game.context.move = 0;
        return;
    }

    if (ch === '#') {
        await runExtcmdFromHashPrefix();
        return;
    }

    if (key === 4) {
        // C: #kick — default tty binding ^D (ASCII EOT); getdir consumes next keystroke.
        await dokickFromCmd(game);
        return;
    }

    if (ch === 'z') {
        await doZapCmd();
        return;
    }

    if (ch === 'r') {
        /* C: cmd.c → read.c doread (subset: first invent scroll, no getobj / seffects yet) */
        await doReadHeroScrollCmdLikeC(game);
        return;
    }

    if (ch === 'd') {
        // C: cmd.c → invent.c dodrop (subset: top invent item, no getobj menu)
        await doDropOneAtHeroFeetLikeC(game);
        return;
    }

    if (ch === 't') {
        // C: cmd.c → dothrow.c throwit (subset: one tile, horizontal)
        await throwOneInventAdjacentLikeC(game);
        return;
    }

    if (ch === 'f') {
        /* C: cmd.c → dothrow.c dofire — getdir consumes next key (not domove). */
        await doFireFromQuiverCmdLikeC(game);
        return;
    }

    if (ch === '>') {
        // C: cmd.c → do.c goto_level (subset: down-stairs tumble + deliveries)
        game.context.move = (await applyHeroDescendStairsOneLevelLikeC(game)) ? 1 : 0;
        return;
    }

    if (game.context?._applyGetdirPendingLikeC) {
        if (isMovementKey(ch)) {
            await consumeApplyDirectionHeroLikeC(
                game,
                DIR_DX[ch],
                DIR_DY[ch],
            );
            game.context.move = 1;
        } else {
            delete game.context._applyGetdirPendingLikeC;
            game.context.move = 0;
        }
        return;
    }
    if (game.context?._applyPromptLikeC) {
        if (ch === 'e') {
            await applyLockpickGetdirPromptHeroLikeC(game);
            game.context.move = 0;
            return;
        }
        delete game.context._applyPromptLikeC;
    }
    if (ch === 'a') {
        await startApplyPromptHeroLikeC(game);
        game.context.move = 0;
        return;
    }
    if (isMovementKey(ch)) {
        const moved = await domoveHeroDirLikeC(DIR_DX[ch], DIR_DY[ch]);
        if (
            game.urole?.abbr === 'Wiz'
            && (game.u?.uz?.dnum | 0) === 0
            && (game.u?.uz?.dlevel | 0) === 1
        ) {
            /* C: hack.c test_move autoopen — `move = (ux != u.ux || uy != u.uy)` only. */
            game.context.move = moved ? 1 : 0;
        } else {
            game.context.move = moved || game.context?.door_opened ? 1 : 0;
        }
        if (game.context?.door_opened) {
            delete game.context._wizD1BlockedRunNoTimeLikeC;
        }
    } else if (isRunMovementKey(ch)) {
        /* C: cmd.c DOMOVE_RUSH — set_move_cmd + gm.multi=COLNO + context.mv; first domove here. */
        const lower = ch.toLowerCase();
        const g = game;
        const dx = DIR_DX[lower];
        const dy = DIR_DY[lower];
        g.context = g.context || {};
        g.u = g.u || {};
        g.u.dx = dx;
        g.u.dy = dy;
        g.context.run = 1;
        g.context.mv = true;
        g.multi = COLNO;
        const touD1LPostArmedLikeC =
            g.urole?.abbr === 'Tou'
            && (g.u?.uz?.dnum | 0) === 0
            && (g.u?.uz?.dlevel | 0) === 1
            && !!g.context?._touristD1LPostArmedLikeC;
        const moved = await domoveHeroDirLikeC(dx, dy);
        const promoteTouD1LPostLikeC = () => {
            g.context._touristD1LPostMovemonPendingLikeC = true;
            delete g.context._touristD1LPostArmedLikeC;
            endRunning(true);
            g.multi = 0;
            g.context.move = 1;
            delete g.context._wizD1BlockedRunNoTimeLikeC;
        };
        /* C: blocked run (e.g. closed door without autoopen) — no hero time; next cmd is autoopen. */
        if (!moved && !g.context?.door_opened) {
            endRunning(true);
            g.context.move = 0;
            g.context._wizD1BlockedRunNoTimeLikeC = true;
            /* C: tourist D:1 **`L`** into wall — still ECMD_TIME + pet peel (~2582+). */
            if (touD1LPostArmedLikeC) promoteTouD1LPostLikeC();
        } else {
            g.context.move = moved ? 1 : 0;
            if (touD1LPostArmedLikeC) promoteTouD1LPostLikeC();
        }
    } else if (ch === '.') {
        /* C: do.c donull — wait/rest one turn (ECMD_TIME). */
        game.context.move = 1;
    } else if (ch === 's') {
        // C: cmd.c rhack — #search → dosearch() → dosearch0 (detect.c)
        if (await dosearchCmdSafetyPreventionLikeC()) {
            game.context.move = 0;
            return;
        }
        game.context.move = 1;
        game.context._searchStep11Passes = (game.context._searchStep11Passes | 0) + 1;
        if ((game.context._searchStep11Passes | 0) === 2) {
            game.context._westApportTwinSearchDoneLikeC = true;
        }
        if ((game.context._searchStep11Passes | 0) === 1) {
            delete game.context._searchRogGateCountLikeC;
            delete game.context._searchPass1DogGoalDoneLikeC;
            delete game.context._searchRogGateDoneLikeC;
            delete game.context._searchPostGatePeelDoneLikeC;
            delete game.context._searchPostGate2PeelDoneLikeC;
            const rogueLike =
                game.urole?.abbr === 'Rog'
                || game.pl_character === 'Rogue'
                || (game.urole?.mnum | 0) === 7;
            const nearHostile = findFirstSearchRogMidMklevHostileLikeC(game);
            const rangerLike =
                game.urole?.abbr === 'Ran'
                || game.pl_character === 'Ranger'
                || (game.urole?.mnum | 0) === 8;
            game.context._searchPass1NearMonLikeC =
                !rangerLike
                && (rogueLike || searchPass1NearMonLikeC(game) || !!nearHostile);
            /* C: ranger D:1 first `#search` — no rogue gate peel; skip `disturb` on mklev sleeper
             * (`seed0102` ~4448 `rn2(7)` before pet `distfleeck` `rn2(5)`). */
            if (game.context._searchPass1NearMonLikeC && nearHostile) {
                disturbMonsterLikeC(game, nearHostile);
                if ((nearHostile.msleeping | 0)) nearHostile.msleeping = 0;
            }
        }
        await dosearch();
        const searchPassAfter = game.context._searchStep11Passes | 0;
        const nextKey = peekQueuedKey();
        const nextCh = nextKey == null ? null : String.fromCharCode(nextKey);
        const rogueLike =
            game.urole?.abbr === 'Rog'
            || game.pl_character === 'Rogue'
            || (game.urole?.mnum | 0) === 7;
        /* C: twin `#search` — blank topline before second search; single search retains trap msg. */
        if (nextCh === 's') {
            clearPendingMessageAndToplineLikeC();
        } else {
            game._retainMessageAfterCommand = true;
        }
        /* C: tourist twin `#search` — second pass with no finds leaves blank topline. */
        if (searchPassAfter >= 2 && nextCh !== 's' && !rogueLike) {
            clearPendingMessageAndToplineLikeC();
        }
        /* C: **`#search`** costs time — inline **`movemon`** + new-turn tail on the **`s`** step. */
        game.context._searchInlinePostDoneLikeC = true;
        await runPostCommandTurnAdvanceLikeC(game);
        if (
            game.urole?.abbr === 'Tou'
            && (game.u?.uz?.dnum | 0) === 0
            && (game.u?.uz?.dlevel | 0) === 1
        ) {
            /* C: inline **`#search`** post advanced moveloop — skip duplicate top post once. */
            game.context._touristD1SearchInlinePostCompleteLikeC = true;
        }
        /* C: twin **`#search`** — keep **`_searchStep11Passes`**; full clear only before **`:`** / other cmds. */
        if (nextCh === 's') {
            clearSearchMovemonSubHarnessLikeC(game);
        } else {
            clearSearchMovemonHarnessLikeC(game);
            /* C: ranger twin **`#search`** post-**`movemon`** — shop hdoor before **`:`** snapshot. */
            if (searchPassAfter >= 2) refreshRangerD1ShopDoorGlyphsAfterSearchLikeC();
        }
        /* C: **`seed0077`** — twin **`#search`** moveloop (gate + **`dog_invent`**) on second **`s`**;
         * **`:`** is **`dolook`** only (session has **0** RNG on **`:`**). */
        game.context.move = 0;
        if (game.context._touristD1PostRestMonsterMovemonDoneLikeC) {
            game.context._touristD1LPostArmedLikeC = true;
            delete game.context._touristD1PostRestMonsterMovemonDoneLikeC;
        } else if (
            game.urole?.abbr === 'Tou'
            && (game.u?.uz?.dnum | 0) === 0
            && (game.u?.uz?.dlevel | 0) === 1
            && nextCh === 'L'
        ) {
            /* C: **`seed0900`** — run-east **`L`** immediately after **`#search`** post-rest tail. */
            game.context._touristD1LPostArmedLikeC = true;
        }
        if (nextCh !== ':') {
            delete game.context._searchInlinePostDoneLikeC;
        }
    } else if (ch === 'i') {
        // C: cmd.c #inventory — display_pickinv overlay (map stays visible)
        game.context.move = 0;
        if (!game._inventoryMode) {
            game._inventoryMode = true;
            game._invSelCat =
                game.urole?.abbr === 'Tou' ? 'Coins' : 'Weapons';
            await flush_screen(1);
        }
    } else if (ch === '+') {
        // C: spell menu — no spells known yet
        game.context.move = 0;
        await pline("You don't know any spells right now.");
        game._retainMessageAfterCommand = true;
        await flush_screen(1);
    } else if (ch === ',') {
        /* C: pickup.c **`pickup(0)`** / **`check_here`** — costs time; moveloop **`movemon`** tail. */
        if (
            game.urole?.abbr === 'Wiz'
            && (game.u?.uz?.dnum | 0) === 0
            && (game.u?.uz?.dlevel | 0) === 1
            && game.context?._wizD1DeferredRunKPendingLikeC
        ) {
            /* C: **`seed0006`** — comma promotes deferred east-tail peel (~2908, ~90 RNG). */
            game.context._wizD1PromoteDeferredRunKLikeC = true;
        }
        await checkHere(false);
        game.context.move = 1;
        if (
            game.urole?.abbr === 'Wiz'
            && (game.u?.uz?.dnum | 0) === 0
            && (game.u?.uz?.dlevel | 0) === 1
        ) {
            game.context._wizD1CommaPickupCapOuterLikeC = true;
        }
        game._retainMessageAfterCommand = true;
        await flush_screen(1);
    } else if (ch === ':') {
        // C: invent.c dolook → look_here(0, LOOKHERE_NOFLAGS)
        await dolookHeroLikeC();
        /* C: **`dolook`** — no **`movemon`** on **`:`** after twin **`#search`** (RNG on second **`s`**). */
        game.context.move = 0;
        game._retainMessageAfterCommand = true;
        await flush_screen(1);
    } else if (ch === '\\') {
        // C: #discoveries (\\)
        game.context.move = 0;
        game._overlayScreen = 'discoveries';
        await flush_screen(1);
    } else {
        // Unknown command
        game.context.move = 0;
        await pline(`Unknown command '${ch}'.`);
    }
}

// C ref: hack.c domove — execute a movement; returns true if hero moved or attacked.
function mAt(x, y) {
    return game.level?.monsters?.find((m) => m.mx === x && m.my === y) ?? null;
}

/**
 * C: hack.c **`domove`** + **`do.c`** **`dodown`** — **`u.dz > 0`** on a down stair after a successful move (**`getdir`** **`>`** leaves **`u.dz`** set until movement).
 * @param {import('./gstate.js').game} g
 */
async function finishDomoveDzStairsTailLikeC(g) {
    const ua = g.u;
    if (!ua) return;
    const dz = ua.dz | 0;
    if (dz > 0) {
        const st = stairwayAtInGame(g, ua.ux | 0, ua.uy | 0);
        if (st && !st.up) await applyHeroDescendStairsOneLevelLikeC(g);
    }
    ua.dz = 0;
}

/** C: hack.c domove — hero move / bump / door (uses u.dx/u.dy when called from multi tail). */
export async function domoveHeroDirLikeC(dx, dy) {
    const g = game;
    const u = g.u;
    const newx = u.ux + dx;
    const newy = u.uy + dy;

    g.context = g.context || {};
    g.context.door_opened = false;

    const dest = g.level?.at(newx, newy);
    if (
        dest
        && IS_DOOR(dest.typ | 0)
        && isClosedDoorLoc(dest)
        && g.flags?.autoopen
        && !g.context?.run
        && !(u.Confusion | 0)
        && !(u.HStun | 0)
        && !(u.Fumbling | 0)
    ) {
        await doopenIndirHeroLikeC(g, newx, newy);
        g.context.door_opened = !isClosedDoorLoc(dest);
        u.dz = 0;
        /* C: hack.c test_move — autoopen without moving does not spend hero time. */
        if (
            g.urole?.abbr === 'Wiz'
            && (g.u?.uz?.dnum | 0) === 0
            && (g.u?.uz?.dlevel | 0) === 1
        ) {
            g.context.move = 0;
            g.context._wizD1AutoopenNoMoveLikeC = true;
        }
        /* C: autoopen pline stays on row 0 until the next command (do not cls here). */
        if (!g._retainMessageAfterCommand) clearPendingMessageAndToplineLikeC();
        g._overlayScreen = null;
        g._inventoryMode = false;
        /* C: no domove vision_recalc when autoopen without moving — moveloop_core tail. */
        return false;
    }

    if (
        g.context?.run
        && dest
        && IS_DOOR(dest.typ | 0)
        && isClosedDoorLoc(dest)
    ) {
        /* C: hack.c test_move — run into closed door (no autoopen); no turn elapses. */
        await pline('That door is closed.');
        endRunning(true);
        g.context.move = 0;
        g.context._wizD1BlockedRunNoTimeLikeC = true;
        if (game.u) game.u.dz = 0;
        return false;
    }

    if (blocksMove(newx, newy)) {
        // Can't move there — no game time (C: domove returns without moving)
        if (game.u) game.u.dz = 0;
        return false;
    }
    if (diagonalHeroMoveBlocked(dx, dy, newx, newy)) {
        // C: hack.c test_move — `bad_rock` corners + `cant_squeeze_thru` + `NODIAG`
        if (game.u) game.u.dz = 0;
        return false;
    }

    const mtmp = mAt(newx, newy);
    if (mtmp) {
        if (mtmp.mpeaceful | 0) {
            const gate = safemonDoAttackGateLikeC(g, mtmp);
            if (gate === 'stop' || gate === 'frozen') {
                await safemonDoAttackBlockPlinesLikeC(g, mtmp, gate);
                newsym(newx, newy);
                if (game.u) game.u.dz = 0;
                clearPendingMessageAndToplineLikeC();
                game._overlayScreen = null;
                game._inventoryMode = false;
                vision_recalc(1);
                return true;
            }
            const ox = u.ux, oy = u.uy;
            const { swapped } = await tryPeacefulSwap(mtmp, ox, oy, newx, newy);
            if (swapped) {
                /* C: tourist D:1 peaceful swap — step-1 peel runs **`dog_goal`** floor+invent
                 * **`obj_resists`** then **`dog_move`** **`mfndpos`** (~2482+ on **`seed0900`**). */
                if (
                    g.urole?.abbr === 'Tou'
                    && (u.uz?.dnum | 0) === 0
                    && (u.uz?.dlevel | 0) === 1
                ) {
                    const ctx = g.context || (g.context = {});
                    ctx._touristD1PostSwapDogGoalPrescanLikeC = true;
                }
                u.ux0 = ox;
                u.uy0 = oy;
                u.dx = dx;
                u.dy = dy;
                maybeSmudgeEngr(ox, oy, newx, newy);
                await spotEffects(game, true, { fromDx: dx, fromDy: dy });
                await finishDomoveDzStairsTailLikeC(game);
                const hx = u.ux, hy = u.uy;
                newsym(ox, oy);
                if (hx !== newx || hy !== newy) newsym(newx, newy);
                newsym(hx, hy);
            } else {
                newsym(newx, newy);
                if (game.u) game.u.dz = 0;
            }
        } else {
            await doBumpMeleeAttack(mtmp);
            newsym(newx, newy);
            if (game.u) game.u.dz = 0;
        }
        clearPendingMessageAndToplineLikeC();
        game._overlayScreen = null;
        game._inventoryMode = false;
        vision_recalc(1);
        return true;
    }

    // Move the hero
    const oldx = u.ux, oldy = u.uy;
    snapshotUshops0FromHeroTileLikeC(game);
    u.ux0 = oldx;
    u.uy0 = oldy;
    u.dx = dx;
    u.dy = dy;
    u.ux = newx;
    u.uy = newy;
    // C: hack.c domove — after domove_core walk/rush
    maybeSmudgeEngr(oldx, oldy, newx, newy);
    await spotEffects(game, true, { fromDx: dx, fromDy: dy });
    await finishDomoveDzStairsTailLikeC(game);
    const hx = u.ux, hy = u.uy;
    clearPendingMessageAndToplineLikeC();
    game._overlayScreen = null;
    game._inventoryMode = false;

    // Update display (hero may have crawled from pool to `hx,hy` ≠ `newx,newy`)
    newsym(oldx, oldy);
    vision_recalc(1);
    if (hx !== newx || hy !== newy) newsym(newx, newy);
    newsym(hx, hy);
    return true;
}
