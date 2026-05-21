// cmd.js — Command dispatch and movement.
// C ref: cmd.c rhack(), hack.c domove(); hack.c spoteffects (pickup, dotrap, pooleffects order);
//        trap.c drown / lava_effects via spoteffects.js.
//
// Movement: hjklyubn; `>` descend; **`u.dz > 0`** after **`getdir`** **`>`** + walk onto down-stairs → **`goto_level`** subset (**`finishDomoveDzStairsTailLikeC`**); peaceful/tame mons → swap; else bump attack stub.
// Contestants should add: search, kick, eat, drink, read, zap,
// wear, wield, drop (d), throw (t), pray, cast, and all other commands.

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { newsym, flush_screen, pline, docrt, clearPendingMessageAndToplineLikeC } from './display.js';
import { vision_recalc } from './vision.js';
import { dosearch } from './search.js';
import { maybeSmudgeEngr } from './engrave.js';
import { dolookHeroLikeC } from './pickup.js';
import { runExtcmdFromHashPrefix } from './extcmd.js';
import { doZapCmd } from './dozap.js';
import { doReadHeroScrollCmdLikeC } from './read_scroll_hero.js';
import { doBumpMeleeAttack } from './attack.js';
import { tryPeacefulSwap } from './peaceful_displace.js';
import { blocksMovementAt, diagonalHeroMoveBlocked } from './walkable.js';
import { spotEffects } from './spoteffects.js';
import { dokickFromCmd } from './kick.js';
import { snapshotUshops0FromHeroTileLikeC } from './shop.js';
import { doDropOneAtHeroFeetLikeC } from './drop_hero.js';
import { throwOneInventAdjacentLikeC } from './throw_hero.js';
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

    if (key === 27) {
        // C: ESC — dismiss overlays; clear top line (tty dismiss echo)
        if (game._inventoryMode) {
            game._inventoryMode = false;
            clearPendingMessageAndToplineLikeC();
            await docrt();
            await flush_screen(1);
        } else if (game._overlayScreen) {
            game._overlayScreen = null;
            clearPendingMessageAndToplineLikeC();
            await docrt();
            await flush_screen(1);
        } else {
            clearPendingMessageAndToplineLikeC();
            await flush_screen(1);
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
        await docrt();
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

    if (ch === '>') {
        // C: cmd.c → do.c goto_level (subset: down-stairs tumble + deliveries)
        game.context.move = (await applyHeroDescendStairsOneLevelLikeC(game)) ? 1 : 0;
        return;
    }

    if (isMovementKey(ch)) {
        game.context.move = (await domove(DIR_DX[ch], DIR_DY[ch])) ? 1 : 0;
    } else if (ch === 's') {
        // C: cmd.c rhack — #search → dosearch() → dosearch0 (detect.c)
        game.context.move = 1;
        await dosearch();
    } else if (ch === 'i') {
        // C: cmd.c #inventory — minimal full-screen list (invent.c)
        game.context.move = 0;
        game._inventoryMode = true;
        await flush_screen(1);
    } else if (ch === '+') {
        // C: spell menu — no spells known yet
        game.context.move = 0;
        await pline("You don't know any spells right now.");
        game._retainMessageAfterCommand = true;
        await flush_screen(1);
    } else if (ch === ':') {
        // C: invent.c dolook → look_here(0, LOOKHERE_NOFLAGS)
        game.context.move = 0;
        await dolookHeroLikeC();
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

async function domove(dx, dy) {
    const u = game.u;
    const newx = u.ux + dx;
    const newy = u.uy + dy;

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
            const ox = u.ux, oy = u.uy;
            const { swapped } = await tryPeacefulSwap(mtmp, ox, oy, newx, newy);
            if (swapped) {
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
