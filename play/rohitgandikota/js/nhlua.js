// nhlua.js — the NetHack/Lua boundary.
// C ref: src/nhlua.c
//
// nhl_init() creates a Lua state and loads dat/nhlib.lua into it. That load has
// a side effect that shows up in the RNG log: nhlib.lua runs `shuffle(align)`
// at file scope, and its `shuffle` uses the math.random shim the same file
// installs three lines earlier — which forwards to nh.rn2. So every Lua state
// NetHack creates costs exactly rn2(3), rn2(2).
//
//   dat/nhlib.lua:5    math.random = function(...) ... nh.rn2(arg[1]) ... end
//   dat/nhlib.lua:19   shuffle(list) -- Fisher-Yates, high to low
//   dat/nhlib.lua:25   shuffle(align)
//
// The recordings tag these as
//   rn2(3)=2 @ random src=nhlib.lua:8 parent=shuffle(nhlib.lua:19)
//
// Counting the states is therefore the whole job until the interpreter lands.
// A normal game creates three: one in newgame(), one in mklev()'s nhl_init(),
// and one inside makelevel() for themerooms. A game with the `legacy` option
// on creates a FOURTH, because com_pager() spins up its own state to read
// dat/questtxt.lua.

import { game } from './gstate.js';
import { rn2 } from './rng.js';

// dat/nhlib.lua:19 shuffle() — Fisher-Yates from the top down, so a list of
// three draws rn2(3) then rn2(2).
export function lua_shuffle(list) {
    for (let i = list.length; i > 1; i--) {
        const j = rn2(i);          /* nhlib's math.random(i) is 1 + nh.rn2(i) */
        const t = list[i - 1];
        list[i - 1] = list[j];
        list[j] = t;
    }
    return list;
}

// src/nhlua.c nhl_init() — a fresh Lua state with dat/nhlib.lua loaded.
//
// Returns the shuffled alignment list, which is what the level generator reads
// back as splev_align.
export function nhl_init() {
    /* A_LAWFUL, A_NEUTRAL, A_CHAOTIC in nhlib.lua's own order */
    const align = ['law', 'neutral', 'chaos'];
    lua_shuffle(align);
    return align;
}

// src/nhlua.c l_nhcore_init() — the core state, created once in newgame().
export function l_nhcore_init() {
    game.splev_align = nhl_init();
}

// dat/nhlib.lua:43 percent() — `math.random(0, 99) < threshold`, and the
// math.random shim turns that two-argument form into nh.random(0, 100), i.e.
// exactly one rn2(100). It is the gate on nearly every themeroom decoration.
export function percent(threshold) {
    return rn2(100) < threshold;
}

// src/nhlua.c:940 nhl_random() — nh.random(a) is rn2(a), nh.random(a,b) is
// a + rn2(b).
export function nh_random(a, b) {
    return (b === undefined) ? rn2(a) : a + rn2(b);
}

// dat/nhlib.lua:29 d() — dice. math.random(1, faces) goes through the shim as
// nh.random(1, faces), i.e. 1 + rn2(faces), so d(5,5) is FIVE draws and d(3)
// is one.
//
// Lua evaluates a numeric-for's bound once, so `for i = 1, d(5,5)` spends its
// five draws before the body runs at all, not once per iteration.
export function lua_d(dice, faces) {
    if (faces === undefined)
        return nh_random(1, dice);      /* 1-arg: `dice` is the face count */

    let sum = 0;
    for (let i = 1; i <= dice; i++)
        sum += nh_random(1, faces);
    return sum;
}
