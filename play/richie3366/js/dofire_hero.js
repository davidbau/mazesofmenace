// dofire_hero.js — dothrow.c dofire() subset: quiver fire + fireassist launcher swap.
// C ref: dothrow.c dofire(), ok_to_throw(), throw_obj() getdir; cmd.c `f` → dofire.

import { game } from './gstate.js';
import { pline, flush_screen } from './display.js';
import { readDirIntoU, runGetdirPromptLikeC } from './dir_input.js';
import { nearCapacity } from './encumbr.js';
import { isok } from './hacklib.js';
import { blocksMovementAt } from './walkable.js';
import { ammoAndLauncherLikeC } from './weapon_kind.js';
import { doswapweaponFireassistLikeC } from './wield_hero.js';

/**
 * C: dothrow.c ok_to_throw — capacity / notake / nohands gate (subset).
 * @param {import('./gstate.js').game} g
 * @returns {boolean}
 */
function okToThrowLikeC(g) {
    if (nearCapacity(g) >= 4) {
        return false;
    }
    return true;
}

function needsFireassistSwapLikeC(g, obj) {
    const u = g.u;
    return !!(
        obj
        && g.flags?.fireassist !== false
        && !ammoAndLauncherLikeC(obj, u.uwep)
        && ammoAndLauncherLikeC(obj, u.uswapwep)
    );
}

/**
 * C: dothrow.c dofire getdir — direction after fireassist `--More--` dismissed.
 * @param {import('./gstate.js').game} g
 * @param {number} [firstKey]
 */
export async function doFireGetdirPhaseLikeC(g = game, firstKey = 0) {
    const k = firstKey | 0;
    if (!(await readDirIntoU(g, k))) {
        if (k === 27) {
            g._pending_message = '';
            g._toplineNeedMore = false;
            g._showDefmoreOnTopline = false;
            g._keepToplineUntilNextCommand = false;
        } else if ((g._pending_message || '').startsWith('cmdassist:')) {
            g._retainMessageAfterCommand = true;
        }
        g.context.move = 0;
        g.context._dofireAwaitEscMoveloopLikeC = true;
        return;
    }
    await finishDofireAfterGetdirLikeC(g);
}

async function finishDofireAfterGetdirLikeC(g) {
    const u = g.u;
    const dx = u.dx | 0;
    const dy = u.dy | 0;
    const dz = u.dz | 0;
    if (!dx && !dy && !dz) {
        await pline('Never mind.');
        g.context.move = 0;
        return;
    }
    if (dz) {
        g.context.move = 0;
        return;
    }
    const tx = (u.ux | 0) + dx;
    const ty = (u.uy | 0) + dy;
    if (!isok(tx, ty) || blocksMovementAt(tx, ty, g)) {
        await pline('You cannot throw there.');
        g._retainMessageAfterCommand = true;
        g.context.move = 0;
        return;
    }
    g.context.move = 1;
    g.context._dofireAwaitEscMoveloopLikeC = true;
}

/**
 * C: dothrow.c dofire — fireassist cmdq doswapweapon + canned dofire; getdir deferred.
 * @param {import('./gstate.js').game} [g]
 */
export async function doFireFromQuiverCmdLikeC(g = game) {
    const u = g.u;
    if (!u) {
        g.context.move = 0;
        return;
    }
    if (!okToThrowLikeC(g)) {
        g.context.move = 0;
        return;
    }

    const obj = u.uquiver ?? null;

    if (needsFireassistSwapLikeC(g, obj)) {
        await doswapweaponFireassistLikeC(g);
        await flush_screen(1);
        g.context._dofireDefmoreWaitLikeC = true;
        g.context.move = 0;
        return;
    }

    if (!obj) {
        await pline('You have no ammunition readied.');
        g._retainMessageAfterCommand = true;
        g.context.move = 0;
        return;
    }

    await runGetdirPromptLikeC(g);
    g.context._dofireGetdirPendingLikeC = true;
    g.context.move = 0;
}
