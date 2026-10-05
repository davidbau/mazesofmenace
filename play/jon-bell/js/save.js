import { change_luck } from './attrib.js';
// save.js — C ref: nethack-c/src/save.c

import { game } from './gstate.js';
import { pline } from './display.js';
import { TRICKED, VISITED, RANGE_LEVEL, MON_DETACH } from './const.js';
import { save_light_sources, lights_save_snapshot } from './light.js';
import { save_engravings, clear_level_structures } from './mklev.js';
import { dmonsfree } from './mkmaze.js';
import { forget_temple_entry } from './priest.js';
import { regions_save_snapshot } from './region.js';
import { worms_save_snapshot } from './worm.js';
import { object_runtime_save_snapshot } from './o_init.js';
import { bubbles_save_snapshot, bubbles_clear_level, bubbles_copy_snapshot } from './mkmaze.js';
import { save_timers_level } from './timeout.js';
import { vfsWriteFile } from './storage.js';
/* The save-file error path terminates through the shared end-game machinery;
 * keep this import aliased because save.js is also reached by bones.js. */
import { done as done_real } from './end.js';
import { encode_save_graph, decode_save_graph } from './save_graph.js';

function pline1(line) { pline(line); }
function done(how) { return done_real(how); }

function levelStore() {
    return (game.levelStore || (game.levelStore = new Map()));
}

/* C ref: save.c:429 savelev(nhfp, lev).  `lev` is ledger_no(&u.uz) — the
 * absolute cross-branch level index, the same key getlev() reads back. */
export function savelev(lev) {
    /* C save.c:483-488 — savelev_core purges dead monsters before it writes
     * the level when iflags.purge_monsters is set.  mon.c:2796 increments
     * that counter when m_detach sets MON_DETACH; use that state as the
     * persisted equivalent rather than purging every low-HP monster at every
     * save.  dmonsfree preserves vault guards, matching C's exception. */
    let purge_monsters = false;
    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        if ((mtmp.mstate & MON_DETACH) !== 0) {
            purge_monsters = true;
            break;
        }
    }
    if (purge_monsters)
        dmonsfree();
    /* C save.c:475 — `if (lev >= 0 && lev <= maxledgerno())
     *     svl.level_info[lev].flags |= VISITED;`  Marked by the SAVE, not by
     * the departure bookkeeping, so a level is VISITED exactly when a copy of
     * it exists. */
    if (lev >= 0) {
        game.level_info = game.level_info || {};
        const info = (game.level_info[lev] = game.level_info[lev] || { flags: 0 });
        info.flags |= VISITED;
    }
    /* C save.c:894 savemonchn — every priest on the level being saved forgets
     * its temple-entry feedback counters, so a revisit starts fresh. */
    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        if (mtmp.ispriest)
            forget_temple_entry(mtmp);
    }
    const g = game;
    /* C save.c:494 Sfo_long(&svm.moves, "lev-timestmp") — the turn the level
     * was left, read back by getlev() as `svo.omoves` to compute elapsed. */
    const t = g._track;
    levelStore().set(lev, {
        omoves: g.moves | 0,
        level: g.level,
        stairs: g.stairs,
        fmon: g.fmon,
        fobj: g.fobj,
        billobjs: g.billobjs,
        exclusion_zones: g.exclusion_zones,
        ftrap: g.ftrap,
        updest: g.updest,
        dndest: g.dndest,
        smeq: g.smeq,
        made_branch: g.made_branch,
        vault_x: g.vault_x,
        engravings: save_engravings(),
        regions: regions_save_snapshot(),
        worms: worms_save_snapshot(true),
        bubbles: bubbles_save_snapshot(),
        /* C save.c:508 save_timers(nhfp, RANGE_LEVEL) — the level's own timers
         * leave gt.timer_base with the level and come back in getlev(). */
        timers: save_timers_level(),
        /* C save.c:490 save_light_sources(nhfp, RANGE_LEVEL) — takes this
         * level's mobile light sources off gl.light_base and writes them into
         * the level file; getlev() puts them back. */
        light_sources: save_light_sources(RANGE_LEVEL),
        /* track.c:88 save_track() ends with `if (release_data(nhfp)) initrack();`
         * and initrack() rewrites g._track's fields IN PLACE, so this one has to
         * be copied rather than referenced. */
        track: t ? {
            utcnt: t.utcnt | 0,
            utpnt: t.utpnt | 0,
            utrack: t.utrack.map((p) => ({ x: p.x | 0, y: p.y | 0 })),
        } : null,
    });
    /* C save.c:524-529, the tail of savelev_core:
     *     if (release_data(nhfp)) {
     *         clear_level_structures();
     *         gf.ftrap = 0;
     *         gb.billobjs = 0;
     *         (void) memset(svr.rooms, 0, sizeof svr.rooms);
     *     }
     * goto_level always calls savelev in a FREEING mode (do.c:1646-1648 sets
     * WRITING|FREEING, or plain FREEING when the levels are being discarded),
     * so the free ALWAYS happens on this path.  The snapshot above holds
     * REFERENCES, and clear_level_structures() replaces its containers rather
     * than mutating them (a fresh GameMap, g.fmon = null, gr.regions = null —
     * and free_region() is a no-op, js/region.js:298), so the stored copy is
     * unaffected.  The engraving map and the hero track ARE cleared in place,
     * which is exactly why those two are copied rather than referenced.
     * svr.rooms is g.level.rooms, already dropped with the GameMap; billobjs
     * is snapshotted above and detached from the active level below. */
    clear_level_structures();
    bubbles_clear_level();
    g.ftrap = null;
    g.billobjs = null;
}

/* Does a saved copy of this level exist?  C asks the same question through
 * svl.level_info[ledger].flags & LFILE_EXISTS (do.c:1696); this is the
 * store-side cross-check so getlev() can never be entered without one. */
export function levelfile_exists(lev) {
    return levelStore().has(lev);
}

export function stored_level(lev) {
    return levelStore().get(lev) ?? null;
}

/*
 * tricked_fileremoved — C ref: save.c:328-341
 */
export function tricked_fileremoved(nhfp, whynot) {
    if (!nhfp) {
        pline1(whynot);
        pline("Probably someone removed it.");
        game.svk.killer.name = whynot;
        done(TRICKED);
        return true;
    }
    return false;
}


/* C ref: files.c set_savefile_name() — gs.SAVEF is "save/<uid><plname>" (plus
 * a ".gz" once nh_compress runs).  The uid has no meaning in the VFS, so the
 * key is the hero's name, which is what actually distinguishes one save from
 * another; restore_saved_game() rebuilds the same string from the rc-supplied
 * plname before the game state exists, exactly as C's plnamesuffix()/getlock()
 * pair does. */
export function savefile_name(plname) {
    return `save/${plname || ''}`;
}

export const NOT_SAVED = [
    'program_state', 'iflags', 'keybindings', 'sysopt', 'disp', 'env',
    'Cmd', '_command_binding_statics', 'nhcb_counts', 'nhcore_call_available', 'mvl_change',
    'n_menu_mapped', 'mapped_menu_cmds', 'mapped_menu_op', '_config_errors',
    'nhDisplay', '_rawterm', '_screen_output', '_preNhgetchHook',
    'mockStorage', 'currentSeed', 'tutorial_set_in_config',
    '_pending_message', '_prevmsg', '_resultMessage', '_resultMessageJoins',
    '_topl_sticky', '_topl_win_stop', '_topl_win_stop_armed', '_topl_win_stop_buf',
    '_topl_urgent_marks', '_topl_urgent_next',
    '_runPageFrames', '_botlPaintedCap',
    /* go.occupation / gt.timed_occ_fn / go.occtxt: code pointers, which
     * savegamestate() never writes (a counted `20s` armed when `S` is typed
     * leaves timed_occ_fn = a closure the graph encoder rejects). */
    'occupation', 'timed_occ_fn', 'occtxt',
    /* The PRNG contexts (C rnd.c's CORE/DISP isaac64 states) are not in the
     * save file; the restoring process keeps the ones initRng() just seeded. */
    'coreCtx', 'dispCtx',
];

/* C ref: save.c:246 savegamestate() — everything between the current level and
 * the other levels.  Returns the graph root; the caller serializes it into a
 * detached byte representation. */
async function savegamestate() {
    const state = {};
    for (const k of Object.keys(game))
        if (!NOT_SAVED.includes(k) && typeof game[k] !== 'function')
            state[k] = game[k];
    // C save_luadata serializes the Lua variables, never the interpreter or
    // its closures. Preserve the other gl fields (including light roots).
    state.gl = { ...game.gl, luacore: null };
    const { get_nh_lua_variables } = await import('./nhlua.js');
    state.__luadata = await get_nh_lua_variables() ?? '';
    /* The engraving map is module-scoped in js/mklev.js rather than hanging off
     * `game` (C: gh.head_engr, a file-scope static), so it needs the same
     * copy-out savelev() already gives it.  C ref: save.c:518
     * save_engravings() in savelev_core, and engrave.c's save/restore pair. */
    state.__engravings = save_engravings();
    state.__regions = regions_save_snapshot();
    state.__worms = worms_save_snapshot();
    state.__objectRuntime = object_runtime_save_snapshot();
    state.__lights = lights_save_snapshot();
    state.__bubbles = bubbles_save_snapshot();
    state.vision_full_recalc = 0;
    return state;
}

export async function dosave0() {
    const g = game;
    g.program_state = g.program_state || {};
    g.program_state.saving = (g.program_state.saving | 0) + 1;
    /* C save.c:98 — `if (!program_state.something_worth_saving || !gs.SAVEF[0])
     * goto done;` i.e. no game in progress, or no file name. */
    const path = savefile_name(g.plname);
    if (!g.plname) {
        g.program_state.saving = 0;
        return 0;
    }
    /* C save.c:141-145 — undo the date-dependent luck that moveloop_preamble
     * applied at startup, so the FILE carries Luck without it; the restoring
     * process's own preamble re-applies its date. */
    if ((g.flags?.moonphase | 0) === 4 /* FULL_MOON */)
        change_luck(-1);
    if (g.flags?.friday13)
        change_luck(1);
    try {
        /* Detach before C's inactive-level copy pass: those getlev/savelev
         * operations work on file records, not on the live current level. */
        const state = decode_save_graph(encode_save_graph(await savegamestate()));
        const uz = g.u?.uz;
        const current = uz
            ? ((g.dungeons?.[uz.dnum]?.ledger_start | 0) + (uz.dlevel | 0))
            : -1;
        if (uz) {
            try {
                g.u.uz = { dnum: 0, dlevel: 0 };
                const stored = state.levelStore instanceof Map
                    ? [...state.levelStore.entries()] : [];
                stored.sort((a, b) => a[0] - b[0]);
                for (const [lev, snap] of stored) {
                    if ((lev | 0) === current || !snap?.bubbles)
                        continue;
                    snap.bubbles = await bubbles_copy_snapshot(snap.bubbles, snap.level);
                }
            } finally {
                g.u.uz = uz;
            }
        }
        const payload = encode_save_graph(state);
        /* C save.c:129 create_savefile() plus version and player header. */
        return vfsWriteFile(path, `NHSAVE 2\n${g.plname}\n${payload}\n`) ? 1 : 0;
    } catch {
        return 0;
    } finally {
        g.program_state.saving = 0;
    }
}

/* Decode a fresh detached graph for every restore attempt. */
export function saved_state_for(body) {
    if (typeof body !== 'string')
        return null;
    const lines = body.split('\n');
    if (lines[0] !== 'NHSAVE 2')
        return null;
    try {
        return decode_save_graph(lines[2]);
    } catch {
        return null;
    }
}
