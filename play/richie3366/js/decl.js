// decl.js — process-start global reset (C: decl.c decl_globals_init).
//
// C ref: nethack-c/upstream/src/decl.c `decl_globals_init` `:1080–1187` —
// whole body in C order. C copies 26 `g_init_*` tables over `ga..gz`,
// 20 `init_sv*` tables over `svb..svy`, wires `gv.valuables`, validates
// static init with 26 `MAGICCHECK`s, links `gs.subrooms`, `ZERO`s seven
// structs, NULLs the worn-slot pointers, parks `WIN_*` at `WIN_ERR`, and
// installs the `urole`/`urace` "Undefined" sentinels.
//
// JS mapping: scored JS keeps C's `gX.<field>` namespaces on the `game`
// object (`game.gb.blstats`, `game.gc.coder`, …) with lazy `{}` defaults
// at each use site, and `resetGame()` (`gstate.js`) already establishes
// the all-zero baseline the `g_init_*`/`init_sv*` tables are made of
// (`UNDEFINED_PTR` is NULL, `UNDEFINED_VALUE` is 0 — `hack.h:1092–1094`;
// the tables hold no other nonzero scalars except the arms named below).
// This function re-establishes that baseline unconditionally (C assigns,
// never merges) plus every nonzero arm JS models, so a second call
// mid-process matches C's `dump_weights` re-init caller.
// Sole wired C caller: `allmain.c:40` `early_init` — JS caller is
// `jsmain.js start()`, immediately after `resetGame()`, before
// `sys_early_init()` (same relative order as C `:40–43`).
//
// Named omissions (see D-log): the 10 unmodeled `g*` namespaces
// (`ge,gj,gk,gl,gq,gt,gv,gx,gy,gz` — no JS readers/writers); the 18
// unmodeled `sv*` namespaces (only `svi`/`svc` are modeled); the 26
// `MAGICCHECK`s (compile-time static-init validation — a JS literal
// either evaluates or throws at module load, nothing to re-check);
// `gs.subrooms` (`:1169` — JS levels keep rooms in arrays with
// `nsubroom` counts, no freelist-head pointer); `gb.bones`/`gb.bughack`
// nonzero members (`BONESINIT` template / `{COLNO,ROWNO}` debug cells —
// no JS readers); `ZERO(a11y)` (`:1173` — `jsmain.js` options parse owns
// the zero-then-fill lifecycle and its `msg_loc` default is guarded by
// `!g.a11y`); `gu.urole`/`gu.urace` sentinel tables (`:1185–1186` —
// split: `jsmain.js` placeholders + `roles.js` whole-struct selection
// copy); `gv.valuables` wiring (`:1132–1137` — split: `end.js`
// `reset_valuables`, lazily ensured by `get_valuables`); the `hack.c:4429`
// `dump_weights` caller (no JS counterpart) and `sfctool.c:657` (tool,
// not the game).
import { game } from './gstate.js';
import { WIN_ERR } from './const.js';

// C `:1085–1110` — `ga = g_init_a` … `gz = g_init_z`. Every modeled
// namespace returns to the fresh-table baseline; the ten namespaces
// with no JS readers/writers (`ge,gj,gk,gl,gq,gt,gv,gx,gy,gz`) have no
// table to reset (named above). All use-site guards create bare `{}`,
// so pre-creation suppresses no default.
function reset_instance_globals() {
    game.ga = {}; // `:1085`
    game.gb = {}; // `:1086`
    game.gc = {}; // `:1087`
    game.gd = {}; // `:1088`
    game.gf = {}; // `:1090`
    game.gg = {}; // `:1091`
    game.gh = {}; // `:1092`
    game.gi = {}; // `:1093`
    game.gm = {}; // `:1097`
    game.gn = {}; // `:1098`
    game.go = {}; // `:1099`
    game.gp = {}; // `:1100`
    game.gr = {}; // `:1102`
    game.gs = {}; // `:1103`
    game.gu = {}; // `:1105`
    game.gw = {}; // `:1107`
}

// C `:1111–1130` — `svb = init_svb` … `svy = init_svy`. The tables are
// all `DUMMY`/`NULL`/zero (`:859–~1060`); only `svi`/`svc` are modeled
// in JS, the rest have no table to reset (named above).
function reset_saved_globals() {
    game.svi = {}; // `:1119`
    game.svc = {}; // `:1113`
}

/**
 * C ref: decl.c `decl_globals_init` `:1080–1187` — whole body in C order.
 * Unconditional reset of process-start state; takes no arguments and
 * returns nothing, like C. Must run before any init that fills state
 * (`sys_early_init`, options parse, role selection overwrite everything
 * established here with richer defaults — the same layering as C, where
 * `initoptions`/`role_init` follow `decl_globals_init`).
 */
export function decl_globals_init() {
    reset_instance_globals(); // C `:1085–1110`
    reset_saved_globals(); // C `:1111–1130`
    // C `:1132–1137` valuables wiring — split: end.js reset_valuables.
    // C `:1142–1167` MAGICCHECKs — named omit (no JS static-init state).
    // C `:1169` gs.subrooms freelist head — named omit (array model).
    // C `:1171–1177` ZERO(flags, iflags, a11y, disp, u, ubirthday,
    // urealtime). `a11y` stays unset here (named above); the rest:
    game.flags = {}; // `:1171`
    game.iflags = {}; // `:1172`
    game.disp = {}; // `:1174`
    // C `:1175–1177` ZERO(u, ubirthday, urealtime). Worn slots live on
    // `u` in JS (`u.uwep`, …), so the `:1179–1181` NULLs land there.
    game.u = {
        uwep: null, // `:1179`
        uarm: null, // `:1179`
        uswapwep: null, // `:1179`
        uquiver: null, // `:1179`
        uarmu: null, // `:1180`
        uskin: null, // `:1180`
        uarmc: null, // `:1180`
        uarmh: null, // `:1181`
        uarms: null, // `:1181`
        uarmg: null, // `:1181`
        uarmf: null, // `:1181`
        uamul: null, // `:1181`
        uright: null, // `:1181`
        uleft: null, // `:1181`
        ublindf: null, // `:1181`
        uchain: null, // `:1181`
        uball: null, // `:1181`
    };
    game.ubirthday = 0; // `:1176`
    game.urealtime = { realtime: 0, start_timing: 0, finish_time: 0 }; // `:1177`
    // C `:1183` WIN_MESSAGE = WIN_STATUS = WIN_MAP = WIN_INVEN = WIN_ERR.
    // Later `init_sound_disp_gamewindows` installs the real sentinel ids.
    game.WIN_MESSAGE = WIN_ERR; // `:1183`
    game.WIN_STATUS = WIN_ERR; // `:1183`
    game.WIN_MAP = WIN_ERR; // `:1183`
    game.WIN_INVEN = WIN_ERR; // `:1183`
    // C `:1185–1186` urole/urace sentinels — split: jsmain placeholders
    // + roles.js selection copy (named above).
}
