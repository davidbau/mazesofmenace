// dbridge.js — drawbridges and the water/lava terrain tests that live with them.
// C ref: src/dbridge.c
//
// Only is_pool_or_lava() so far, which lookaround() and
// avoid_moving_on_liquid() both need. The drawbridge machinery itself is not
// ported.

import { is_pool, is_lava } from './mon.js';

// src/dbridge.c:77 is_pool_or_lava()
export function is_pool_or_lava(x, y) {
    return !!(is_pool(x, y) || is_lava(x, y));
}
