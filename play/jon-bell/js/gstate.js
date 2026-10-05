// @ts-nocheck
// gstate.js — Global game state reference.
// All game modules import `game` from here.
import {FIRST_AMULET, LAST_AMULET, FIRST_REAL_GEM, LAST_REAL_GEM,
    UNIQUE_OBJECT_TYPES} from './objclass_ranges.js';
import { resetStatics } from './statics.js';
export let game = {};
// C ref: include/flag.h:30-33
//     #define wizard  flags.debug
//     #define discover flags.explore
// Both are MACROS in C, so every `wizard` / `discover` read in the C tree is a
// read of flags.debug / flags.explore.  Transliterating them as a plain
// property (`game.wizard`) produces a field NOTHING EVER WRITES: the rc parser
// sets flags.debug (js/options.js:63 for OPTIONS=playmode:debug) and
// flags.explore (options.js:65), and the misspelled reads then see `undefined`
// in-game exploring it does, not the playmode option.  Exported as functions so there is exactly one
// spelling of each macro and `game`'s late rebinding in resetGame() is picked up.
export function wizard() {
    return !!(game.flags && game.flags.debug);
}
export function discover() {
    return !!(game.flags && game.flags.explore);
}
/* C decl.c `NEARDATA struct q_score svq.quest_status;` (quest.h:25-49) — a
 * file-scope, BSS-zeroed struct reached through the Qstat(x) macro.  It is a
 * GLOBAL, not an allocation: every field is a readable 0 from process start,
 * which is why C can write ldrgend/nemgend in role_init() (role.c:2036, 2059)
 * long before quest.c ever touches first_start/not_ready.
 *
 * Modelling it here rather than lazily inside one reader is what lets those
 * two independent writers share ONE struct.  js/cmd.js's _quest_status() used
 * to create it on first read with a full default object; a role_init() write
 * landing first would then have been silently thrown away by its `||=`.
 * `game.svq.quest_status` is aliased to the same object so both spellings the
 * port uses (`game.quest_status`, `game.svq.quest_status`) stay identical.
 */
export function questStatusStruct() {
    let q = game.quest_status;
    if (!q) {
        q = game.quest_status = {
            first_start: false, met_leader: false, not_ready: 0,
            pissed_off: false, got_quest: false, first_locate: false,
            killed_leader: false, made_goal: 0, met_nemesis: false,
            killed_nemesis: false, in_battle: false, cheater: false,
            touched_artifact: false, offered_artifact: false,
            got_thanks: false, leader_m_id: 0, leader_is_dead: 0,
            /* quest.h:33-35 — 2-bit gender fields, 0=male 1=female 2=neuter */
            ldrgend: 0, nemgend: 0, godgend: 0,
        };
    }
    const svq = (game.svq ||= {});
    if (svq.quest_status !== q)
        svq.quest_status = q;
    return q;
}
export function resetGame() {
    resetStatics();
    for (const k of Object.keys(game))
        delete game[k];
    // Static objects[].oc_unique column copied by C objects_globals_init.
    game._oc_unique = Object.fromEntries(UNIQUE_OBJECT_TYPES.map(typ => [typ, true]));
    // C svn.n_dgns and svd.dungeons: no active topology before init_dungeons.
    game._n_dgns = 0;
    game.dungeons = [];
    // C decl.c:decl_globals_init (g_init_c/d/e/i/k). Command dispatch uses
    // these globals before any command or movement has lazily allocated them.
    game.gc = { command_queue: [null, null], cmd_bind: null };
    game.gd = { domove_attempting: 0 };
    game.ge = { ext_tlist: null };
    game.gl = { luacore: null };
    game.nhcb_counts = [0, 0, 0, 0];
    game.nhcore_call_available = [false, false, false, false, false, false, false];
    // C allmain.c:174 file-static pending transformation. A new game process
    // starts at zero; this is neither part of struct you nor saved state.
    game.mvl_change = 0;
    // C decl.c: tutorial state is process-global, separate from struct you.
    game.gg = { gmst_stored: false, gmst_moves: 0, gmst_invent: null,
        gmst_ubak: null, gmst_disco: null, gmst_mvitals: null, gmst_spl_book: [] };
    // C decl.h valuable_data arrays; decl.c:decl_globals_init installs aliases.
    game.ga = {amulets: Array.from({length: LAST_AMULET + 1 - FIRST_AMULET},
        () => ({count: 0n, typ: 0}))};
    game.gg.gems = Array.from({length: LAST_REAL_GEM + 2 - FIRST_REAL_GEM},
        () => ({count: 0n, typ: 0}));
    game.gv = {valuables: [
        {list: game.gg.gems, size: game.gg.gems.length},
        {list: game.ga.amulets, size: game.ga.amulets.length},
        {list: null, size: 0},
    ]};
    // C decl.c gn: startup exclusions persist across ini_inv calls.
    game.gn = { nocreate: 0, nocreate2: 0, nocreate3: 0, nocreate4: 0 };
    game.gi = { in_doagain: false, item_action_in_progress: false };
    game.kickedloc = { x: 0, y: 0 };
    // C ref: decl.c:394 g_init_h.hero_seq = 1L << 3. The hero_seq counter
    // is statically initialized to 8 in C's gh struct; `moveloop()` bumps
    // it (`gh.hero_seq++` allmain.c:451) and rewrites it (`gh.hero_seq =
    // svm.moves << 3` allmain.c:311). Pre-turn-1, no increments fire, so
    // at post_init the value is the static-init constant 8.
    game.hero_seq = 1 << 3;
    // C decl.c:g_init_d — deaths within the current hero sequence.
    game.done_seq = 0;
    // C ref: decl.h:123-127 struct display_hints + decl.c global `disp`.
    // BSS-zero-initialized in C; mirror the same default-zero shape here
    // so the JS port and the mapstate bridge (boolSlot(['disp', 'botl']))
    // can read/write through the real slot rather than a __bridge__
    // placeholder. SET_BOTL() / init_uhunger() / etc. mutate disp.botl
    // (hack.h:1728) to drive partial status-line redraws.
    game.disp = { botl: 0, botlx: 0, time_botl: 0, toplin: 0, inmore: 0 };
    // C ref: options.c:7288 initoptions_init —
    //   nmcpy(svp.pl_fruit, OBJ_NAME(objects[SLIME_MOLD]), PL_FSIZ);
    // svp.pl_fruit is a char[PL_FSIZ] that initoptions_init fills with
    // "slime mold" UNCONDITIONALLY, before any rc parsing and before any game
    // code runs, so no ported function can ever observe it empty. The rc
    // "fruit:" option (options.c:1763) overwrites it afterwards — js/jsmain.js
    // start() does exactly that on top of this default. Setting it only in
    // jsmain left game.pl_fruit undefined on every path that does not boot a
    // "undefined juice" instead of C's "slime mold juice".
    game.pl_fruit = 'slime mold';
    // C ref: decl.c:995 `static const struct sinfo init_program_state = { 0 };`
    // and decl.c:1117 `program_state = init_program_state;` inside
    // decl_globals_init() — the exact C analogue of this function. C's
    // `struct sinfo program_state` (hack.h:783-826) is a file-scope global:
    // it exists BSS-zeroed from process start and decl_globals_init() re-zeroes
    // it, so every field is a readable 0 on every path. It is never a pointer
    // and is never absent; hack.h:782 notes it is "not saved and restored".
    //
    // `gameover` in particular is 0 for the whole of normal play — its ONLY
    // assignment in the entire C tree is end.c:1148 `program_state.gameover = 1`
    // inside done(). So the C-correct value at every mid-game read is 0.
    // not_fully_identified() (objnam.c:1791) is TRUE, and C's recorded return
    // is the non-pname form "war hammer named Mjollnir drops". That output is
    // reachable only if obj_is_pname() (objnam.c:333-341) took the
    // `!program_state.gameover` branch — i.e. gameover was 0.)
    //
    // Assigning only in js/jsmain.js:113 (`g.program_state = {}`) left it
    // replay reaches game code through mapstate_game_bridge.js:550 resetGame()
    // — where objnam.c:337's port threw instead of reading a zero. Modelling
    // C's struct here, rather than guarding each read with `?.`, is what makes
    // the JS ANSWER the question the way C does: `?.` yields undefined-by-
    // absence, which only coincidentally reads falsy, and cannot serve the
    // read-modify-write users at all (js/display.js:1423 in_docrt = true,
    // js/cmd.js:9288/9450 stopprint++). Fields listed are the unconditional
    // members of struct sinfo plus HANGUPHANDLING's done_hup; other #ifdef'd
    // members (preserve_locks,
    // in_paniclog, resize_pending, getting_char) are interface/porting-host
    // concerns with no JS counterpart.
    game.program_state = {
        done_hup: 0,               /* HANGUPHANDLING, defined for UNIX */
        gameover: 0,               /* hack.h:784 */
        stopprint: 0,              /* hack.h:785 */
        something_worth_saving: 0, /* hack.h:791 */
        panicking: 0,              /* hack.h:792 */
        exiting: 0,                /* hack.h:793 */
        saving: 0,                 /* hack.h:794 */
        restoring: 0,              /* hack.h:795 */
        freeingdata: 0,            /* hack.h:796 */
        in_getlev: 0,              /* hack.h:797 */
        in_moveloop: 0,            /* hack.h:798 */
        in_impossible: 0,          /* hack.h:799 */
        in_docrt: 0,               /* hack.h:800 */
        in_self_recover: 0,        /* hack.h:801 */
        in_checkpoint: 0,          /* hack.h:802 */
        in_parseoptions: 0,        /* hack.h:803 */
        in_role_selection: 0,      /* hack.h:804 */
        in_getlin: 0,              /* hack.h:805 */
        in_sanity_check: 0,        /* hack.h:806 */
        config_error_ready: 0,     /* hack.h:807 */
        beyond_savefile_load: 0,   /* hack.h:808 */
        savefile_completed: 0,     /* hack.h:809 */
        wizkit_wishing: 0,         /* hack.h:813 */
        input_state: 0,            /* hack.h:820; enum InputState otherInp == 0 */
    };
    // C ref: decl.c:1159 `ZERO(iflags);` — in the SAME decl_globals_init() as
    // the program_state reset above (decl.c:1067 is the function head), and
    // decl.c:86 `NEARDATA struct instance_flags iflags;` is likewise a
    // file-scope struct, never a pointer. So the C-observable fact this must
    // model is that the struct EXISTS on every path.
    //
    // Deliberately PARTIAL, and that is the C-faithful choice rather than a
    // shortcut. decl_globals_init() zeroes iflags, but initoptions() runs
    // afterwards and sets many members to NON-zero defaults, so enumerating
    // all of struct instance_flags (flag.h) as 0 here would assert values that
    // so the option-derived members lose nothing by being omitted — whereas
    // writing `0` for them would be a fabricated claim. js/jsmain.js:97
    // (`g.iflags = { ...opts.iflags }`) overwrites this on the boot path, which
    // mirrors C's decl_globals_init() → initoptions() order exactly.
    //
    // point is provably 0: it is not an option, and every setter is a
    // bracketed toggle that restores it — objnam.c:2492-2494 (actualoname),
    // mkobj.c:3329-3331, invent.c:2580-2587, invent.c:3391, and the wizard-mode
    // ^I path at wizcmds.c:53-62. Its reader objnam.c:337 (obj_is_pname) threw
    game.iflags = {
        window_inited: false,
        override_ID: 0,            /* flag.h:271 */
        suppress_price: 0,         /* flag.h; temporary object-name formatting */
    };
    return game;
}
