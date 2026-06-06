// dir_input.js — Read a vi movement key into **`u.dx`/`u.dy`/`u.dz`** ( **`cmd.c`** **`getdir`** subset).

import { DIRECTION_KEYS, RUN_KEYS } from './const.js';
import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { flush_screen } from './display.js';
import { openGetdirHelpOverlayLikeC } from './help_dir.js';

/** C: cmd.c getdir — yn_function prompt on WIN_MESSAGE row 0. */
export async function runGetdirPromptLikeC(g = game) {
    g._pending_message = 'In what direction?';
    g._toplineNeedMore = false;
    g._showDefmoreOnTopline = false;
    g._retainMessageAfterCommand = true;
}

/**
 * C: cmd.c getdir / movecmd — sets u.dx, u.dy, u.dz (decl.c zdir).
 * Less-than / greater-than map to doup/dodown (u.dz is -1 or +1, dx and dy are 0); vi keys clear dz; period and s/S are self (all zero).
 * Deferred: dxdy_moveok (grid bug), numpad, cmdq replay, help/redraw_cmd.
 * @param {import('./gstate.js').game} g
 * @returns {Promise<boolean>} false on ESC / unknown key
 */
export async function readDirIntoU(g, firstKey = 0) {
    const u = g.u;
    if (!u) return false;
    let k = firstKey | 0;
    if (!k) k = await nhgetch();
    if (k === 27) return false;
    const ch = String.fromCharCode(k);
    /* C: move_funcs[8]=dodown, move_funcs[9]=doup — zdir[8]=1, zdir[9]=-1 */
    if (ch === '>') {
        u.dx = 0;
        u.dy = 0;
        u.dz = 1;
        return true;
    }
    if (ch === '<') {
        u.dx = 0;
        u.dy = 0;
        u.dz = -1;
        return true;
    }
    if (ch === '.' || ch === 's' || ch === 'S') {
        u.dx = 0;
        u.dy = 0;
        u.dz = 0;
        return true;
    }
    let vec = DIRECTION_KEYS[ch];
    if (!vec) vec = RUN_KEYS[ch];
    if (!vec) {
        /* C: cmd.c getdir — help_dir NHW_TEXT when cmdassist. */
        if (g.iflags?.cmdassist !== false) {
            openGetdirHelpOverlayLikeC(g);
            await flush_screen(1);
        }
        return false;
    }
    u.dx = vec[0] | 0;
    u.dy = vec[1] | 0;
    u.dz = 0;
    return true;
}
