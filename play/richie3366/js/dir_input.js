// dir_input.js — Read a vi movement key into **`u.dx`/`u.dy`/`u.dz`** ( **`cmd.c`** **`getdir`** subset).

import { DIRECTION_KEYS, RUN_KEYS } from './const.js';
import { nhgetch } from './input.js';

/**
 * C: cmd.c getdir / movecmd — sets u.dx, u.dy, u.dz (decl.c zdir).
 * Less-than / greater-than map to doup/dodown (u.dz is -1 or +1, dx and dy are 0); vi keys clear dz; period and s/S are self (all zero).
 * Deferred: dxdy_moveok (grid bug), numpad, cmdq replay, help/redraw_cmd.
 * @param {import('./gstate.js').game} g
 * @returns {Promise<boolean>} false on ESC / unknown key
 */
export async function readDirIntoU(g) {
    const u = g.u;
    if (!u) return false;
    const k = await nhgetch();
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
    if (!vec) return false;
    u.dx = vec[0] | 0;
    u.dy = vec[1] | 0;
    u.dz = 0;
    return true;
}
