// eat.js — eating and hunger.
// C ref: eat.c
//
// Ported so far: init_uhunger().

import { game } from './gstate.js';
import { A_STR, NOT_HUNGRY } from './const.js';

// C ref: eat.c init_uhunger()
export function init_uhunger() {
    const g = game;
    const u = g.u;

    if (!g.disp) g.disp = {};
    g.disp.botl = (u.uhs !== NOT_HUNGRY || u.atemp.a[A_STR] < 0);
    u.uhunger = 900;
    u.uhs = NOT_HUNGRY;
    if (u.atemp.a[A_STR] < 0) {
        u.atemp.a[A_STR] = 0;
        throw new Error('init_uhunger(): encumber_msg() not ported yet');
    }
}
