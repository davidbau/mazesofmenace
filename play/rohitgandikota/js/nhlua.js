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
import { freeinv, addinv_nomerge, useupall, update_inventory } from './invent.js';
import { setworn, setnotworn } from './worn.js';
import { init_uhunger } from './eat.js';

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

// dat/nhcore.lua:108 show_getpos_tip() — the NHCORE_GETPOS_TIP callback,
// reached through l_nhcore_call() from handle_tip(). nh.text() (nhlua.c:810)
// splits its string at newlines and builds an NHW_MENU of add_menu_str lines
// displayed PICK_NONE, which is why the window is inset with "(end)" rather
// than a full-screen text page. The call runs in the nhcore state created at
// newgame, so no fresh nhlib load and no RNG.
const GETPOS_TIP_TEXT = [
    'Tip: Farlooking or selecting a map location',
    '',
    'You are now in a "farlook" mode - the movement keys move the cursor,',
    'not your character.  Game time does not advance.  This mode is used',
    'to look around the map, or to select a location on it.',
    '',
    'When in this mode, you can press ESC to return to normal game mode,',
    'and pressing ? will show the key help.',
];

export async function show_getpos_tip() {
    const { tty_create_nhwindow, tty_start_menu, tty_add_menu, tty_end_menu,
            tty_display_nhwindow, tty_destroy_nhwindow, NHW_MENU, ATR_NONE }
        = await import('./tty/wintty.js');
    const { MENU_ITEMFLAGS_NONE, MENU_BEHAVE_STANDARD } = await import('./const.js');
    const { NO_COLOR } = await import('./terminal.js');
    const { xwaitforspace } = await import('./tty/getline.js');

    const win = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(win, MENU_BEHAVE_STANDARD);
    for (const line of GETPOS_TIP_TEXT)
        tty_add_menu(win, null, 0, 0, 0, ATR_NONE, NO_COLOR, line,
                     MENU_ITEMFLAGS_NONE);
    tty_end_menu(win, null);
    /* select_menu(tmpwin, PICK_NONE, &picks) — display and wait for a
       dismissing key. The teardown's erase_menu_or_text() repaints the rows
       under the window from the glyph buffer, which is what keeps a
       #terrain view intact behind the tip; a docrt() here would rebuild the
       REAL map over it (C has no redraw on this path). */
    await tty_display_nhwindow(win);
    await xwaitforspace(' \r\n\x1b');
    tty_destroy_nhwindow(win);
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

// src/nhlua.c:1837 tutorial() — called from goto_level(do.c) on entering or
// leaving the tutorial branch; runs dat/nhcore.lua's enter_tutorial /
// leave_tutorial (nhlib.lua tutorial_enter/tutorial_leave), whose real work
// is nh.gamestate(): stash the whole game state on the way in, restore it on
// the way out.

/* C keeps these object pointers in decl.c globals, outside `struct you`.
   The port stores their equivalents on game.u, so they must not be copied
   into gmst_ubak and later overwrite the pointers rebuilt by setworn(). */
const tutorial_worn_globals = [
    'uarm', 'uarmc', 'uarmh', 'uarms', 'uarmg', 'uarmf', 'uarmu', 'uskin',
    'uleft', 'uright', 'uwep', 'uswapwep', 'uquiver', 'uamul', 'ublindf',
    'uball', 'uchain',
];

/* memcpy() gives the C backup independent copies of every nested struct and
   array in `u`, while retaining its three monster pointers. A shallow JS
   spread let tutorial mutations leak back into the backup, notably letting
   setworn() re-add a cloak's extrinsic property before the backup was
   restored. */
function clone_tutorial_u(u) {
    const valueFields = { ...u };
    for (const field of tutorial_worn_globals)
        delete valueFields[field];
    const pointerFields = {};
    for (const field of ['ustuck', 'usteed', 'umonst']) {
        if (Object.hasOwn(valueFields, field)) {
            pointerFields[field] = valueFields[field];
            delete valueFields[field];
        }
    }
    return Object.assign(JSON.parse(JSON.stringify(valueFields)),
                         pointerFields);
}

export async function tutorial(entering) {
    if (entering)
        nhl_gamestate_save();
    else
        await nhl_gamestate_restore();
    /* nhlib.lua also registers cmd_before (blacklists #save) and end_turn
       (the low-hunger food-ration event) callbacks; the end_turn event
       only acts when u.uhunger < 148, which is recorded when reached */
}

// src/nhlua.c:2058 nhl_gamestate() — the save arm: strip the inventory
// into gmst_invent, snapshot u, discoveries, mvitals and the spellbook.
function nhl_gamestate_save() {
    const g = game;
    if (g.gmst_stored)
        return; /* impossible() */
    const invent = [];
    while ((g.invent || []).length) {
        const otmp = g.invent[0];
        const wornmask = otmp.owornmask;
        setnotworn(otmp);
        freeinv(otmp);
        otmp.owornmask = wornmask; /* flag for later restore */
        invent.push(otmp);
    }
    g.gmst = {
        moves: g.moves,
        invent,
        ubak: clone_tutorial_u(g.u),
        disco: JSON.parse(JSON.stringify(g.disco ?? [])),
        mvitals: JSON.parse(JSON.stringify(g.mvitals ?? {})),
        /* svs.spl_book: the port keeps it as game.spl_book (spell.js) */
        spl_book: JSON.parse(JSON.stringify(g.spl_book ?? [])),
    };
    g.lastinvnr = 51; /* next inventory letter will be 'a' */
    /* memset(svs.spl_book, 0, ...) */
    g.spl_book = [];
    g.gmst_stored = true;
    update_inventory();
}

// the restore arm: put everything back, reset time, re-init hunger.
async function nhl_gamestate_restore() {
    const g = game;
    if (!g.gmst_stored || !g.gmst)
        return; /* impossible() */
    const cur_uz = g.u.uz, cur_uz0 = g.u.uz0;

    g.moves = g.gmst.moves;
    /* pline("Resetting time to move #%ld.") is printed by C here */
    await pline_tutorial_reset(g.moves);

    g.lastinvnr = 51;
    while ((g.invent || []).length)
        useupall(g.invent[0]);
    for (const otmp of g.gmst.invent) {
        const wornmask = otmp.owornmask;
        otmp.owornmask = 0;
        addinv_nomerge(otmp);
        if (wornmask)
            setworn(otmp, wornmask);
    }
    Object.assign(g.u, g.gmst.ubak);
    g.disco = g.gmst.disco;
    g.mvitals = g.gmst.mvitals;
    g.spl_book = g.gmst.spl_book;
    /* uname'd object types are cleared in C; ours stores oc_uname on
       game.objects entries */
    for (const oc of (g.objects || []))
        if (oc && oc.oc_uname)
            oc.oc_uname = null;
    g.u.uz = cur_uz, g.u.uz0 = cur_uz0;
    init_uhunger();
    g.gmst = null;
    g.gmst_stored = false;
    update_inventory();
}

async function pline_tutorial_reset(moves) {
    const { pline } = await import('./display.js');
    await pline(`Resetting time to move #${moves}.`);
}
