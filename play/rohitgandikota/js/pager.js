// pager.js — the "long help" text windows.
// C ref: src/pager.c
//
// Only com_pager() is here, and only for its side effect: com_pager_core()
// calls nhl_init() to read dat/questtxt.lua, and every Lua state costs
// rn2(3), rn2(2) from nhlib.lua's shuffle(align) — see js/nhlua.js.
//
// newgame() calls com_pager("legacy") when the `legacy` option is on, which it
// is by default. That is why a session whose rc says `!legacy` shows three
// nhlib shuffles in its log and one that does not shows four. Missing it
// desynchronises everything from moveloop_preamble onward.

import { nhl_init } from './nhlua.js';

// src/pager.c com_pager_core()
export function com_pager_core(section, msgid, showerror) {
    /* The text lookup itself draws nothing; creating the state does. */
    nhl_init();
    return true;
}

// src/pager.c com_pager()
export function com_pager(msgid) {
    return com_pager_core('common', msgid, true);
}
