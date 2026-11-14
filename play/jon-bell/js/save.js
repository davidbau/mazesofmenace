import { change_luck } from './attrib.js';
// save.js — C ref: nethack-c/src/save.c

import { game } from './gstate.js';
import { getnow } from './calendar.js';
import { yyyymmddhhmmss } from './calendar.js';
import { pline, There } from './pline.js';
import { TRICKED, VISITED, RANGE_LEVEL, MON_DETACH, OBJ_FREE, W_BALL, W_CHAIN } from './const.js';
import { setworn } from './worn.js';
import { save_light_sources, lights_save_snapshot, dangling_light_check } from './light.js';
import { clear_level_structures } from './mklev.js';
import { dobjsfree } from './mkobj.js';
import { save_engravings } from './engrave.js';
import { maxledgerno } from './dungeon.js';
import { dmonsfree } from './mon.js';
import { forget_temple_entry } from './priest.js';
import { regions_save_snapshot } from './region.js';
import { worms_save_snapshot } from './worm.js';
import { object_runtime_save_snapshot } from './o_init.js';
import { bubbles_save_snapshot, bubbles_clear_level, bubbles_copy_snapshot } from './mkmaze.js';
import { save_timers_level, restore_timer_order } from './timeout.js';
import { vfsWriteFile, vfsReadFile, vfsListFiles } from './storage.js';
import { force_more_pages, _topl_more_pages, _topl_joins_snapshot } from './display.js';
/* The save-file error path terminates through the shared end-game machinery;
 * keep this import aliased because save.js is also reached by bones.js. */
import { done, done_object_cleanup } from './end.js';
import { encode_save_graph, decode_save_graph } from './save_graph.js';

async function pline1(line) { await pline(line); }

function levelStore() {
    return (game.levelStore || (game.levelStore = new Map()));
}

/* C ref: save.c:429 savelev(nhfp, lev).  `lev` is ledger_no(&u.uz) — the
 * absolute cross-branch level index, the same key getlev() reads back. */
export async function savelev(lev, freeing = false) {
    game.program_state.saving = (game.program_state.saving | 0) + 1; // save.c:460
    /* C save.c:483-488 — savelev_core purges dead monsters before it writes
     * the level when iflags.purge_monsters is set (mon.c:2796's m_detach
     * counter — every m_detach twin increments it).  Only a WRITING save
     * purges: goto_level's cant_go_back teardown (do.c:1652) saves FREEING,
     * where C skips the purge and the counter survives the level change. */
    if (!freeing && (game.iflags.purge_monsters | 0) > 0)
        await dmonsfree();
    if (!freeing && game.objs_deleted) dobjsfree(); // save.c:489-491
    /* C save.c:475 — `if (lev >= 0 && lev <= maxledgerno())
     *     svl.level_info[lev].flags |= VISITED;`  Marked by the SAVE, not by
     * the departure bookkeeping, so a level is VISITED exactly when a copy of
     * it exists. */
    if (!freeing && lev >= 0 && lev <= maxledgerno()) {
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
        light_sources: await save_light_sources(RANGE_LEVEL),
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
     * and free_region() only nulls the live region's rects/monsters/msgs,
     * which regions_save_snapshot() deep-copied), so the stored copy is
     * unaffected.  The engraving map and the hero track ARE cleared in place,
     * which is exactly why those two are copied rather than referenced.
     * svr.rooms is g.level.rooms, already dropped with the GameMap; billobjs
     * is snapshotted above and detached from the active level below. */
    for (let otmp = g.fobj; otmp; otmp = otmp.nobj) {
        const bc = (otmp.owornmask | 0) & (W_BALL | W_CHAIN);
        if (bc)
            await setworn(null, bc);
    }
    game.program_state.saving--; // save.c:560, before clear_level_structures
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
export async function tricked_fileremoved(nhfp, whynot) {
    if (!nhfp) {
        await pline1(whynot);
        await pline("Probably someone removed it.");
        game.svk.killer.name = whynot;
        await done(TRICKED);
        return true;
    }
    return false;
}


export function savefile_name(plname) {
    const want = `save/${plname || ''}`;
    const lc = want.toLowerCase();
    for (const path of vfsListFiles('save/'))
        if (path.toLowerCase() === lc) return path;
    return want;
}

export const NOT_SAVED = [
    'roleoptvals', // C options.c:800-844: saveoptvals/restoptvals are #if 0.
    // C do_name.c:22-23: nextmbuf's storage is process-local static data.
    '_mbufs',
    'program_state', 'iflags', 'keybindings', 'sysopt', 'disp', 'env',
    // wintty.c:4349 tty_status_init: tty_status[][].valid is window-port
    // process state; a restored process starts with every field invalid.
    '_ttyStatusValid',
    // C decl.c:400-401 gh.hitmsg_mid/hitmsg_prev are process globals that
    // savegamestate() never writes; a restored process starts them 0/NULL.
    '_hitmsg_mid', '_hitmsg_prev_ai', '_hitmsg_prev_ao', '_hitmsg_prev_aatyp',
    // C decl.h:545 gl.last_hider (set mon.c:4796) is a process global that
    // savegamestate() never writes; a restored process starts it 0.
    'l',
    // C save.c:265-333 omits vision.c's process-local sight buffers; keep
    // vision_init()'s empty view until restore.c:927 rebuilds visibility.
    'viz_array', '_viz_rmin', '_viz_rmax', 'active_buf',
    'Cmd', '_command_binding_statics', 'nhcb_counts', 'nhcore_call_available', 'mvl_change',
    // C save.c:246-333 omits artifact.c's process-local warning count.
    'mkot_trap_warn_count',
    // C decl.c:807 initializes this to 0; save.c:265-333 does not save it.
    'warn_obj_cnt',
    // C save.c:246-333 omits the process-local warning counts
    // (decl.c:807 initializes warn_obj_cnt to zero in each new process).
    'mkot_trap_warn_count', 'warn_obj_cnt',
    'n_menu_mapped', 'mapped_menu_cmds', 'mapped_menu_op', '_config_errors',
    // save.c:265-328 omits menu patterns; cfgfiles.c:1164 reloads them from rc.
    'menu_colorings', 'color_colorings', 'save_colorings',
    // C options.c:7731 stores MSGTYPE rules in gp.plinemsg_types; save.c:265
    // savegamestate omits them. Each process rebuilds them from its own rc.
    'msgtypes',
    // C decl.c:341,555 initializes these to FALSE/0; save.c:265-333 omits
    // mhitm.c's noise throttle, so a restored process hears fights afresh.
    'far_noise', 'noisetime',
    // C decl.h gb.bldrpush_oid / gb.bldrpushtime (hack.c:182-189) are process
    // globals that save.c never writes; a restored process pushes afresh.
    '_bldrpush_oid', '_bldrpushtime',
    'nhDisplay', '_rawterm', '_screen_output', '_preNhgetchHook',
    '_rawCursorFrozen', '_configfile', '_generated_configfile', '_hilite_rc',
    // C save.c:265-333 omits blstats; botl.c:1694,1759-1795 initializes
    // field values, colors and temporary highlight timers in each process.
    '_blTemp', '_statusFieldColors', '_statusHilitesReset', '_statusHiliteHeld',
    // botl.c:2784 status_hilite_add_threshold keeps rules in
    // blstats[].thresholds, which save.c never writes: a restored process has
    // only its config's hilite_status rules, not ones added from 'O'.
    'status_field_hilites', 'status_condition_hilites',
    // C utf8map.c glyphmap_u / reset_customsymbols() state is process-local
    // (apply_customizations at startup from the rc); save.c never writes it.
    '_gm_customsymbols',
    // C decl.h gp.primary_syms / glyphs' UTF-8 table are process-local too: a restored
    // process keeps the Unicode map its own rc built, not the saving process's.
    'gp',
    'mockStorage', 'currentSeed', 'tutorial_set_in_config',
    '_pending_message', '_prevmsg', '_resultMessage', '_resultMessageJoins',
    // C save.c:265-333 omits the physical tty frame held by more()
    // (topl.c:205-248); restore.c:944 rebuilds the new process's display.
    '_paintedSnapshot', '_inMovemonMore',
    '_topl_sticky', '_topl_win_stop', '_topl_win_stop_armed', '_topl_win_stop_buf',
    '_topl_urgent_marks', '_topl_urgent_next',
    // C wintty.h:104 ttyDisplay->dismiss_more is tty process state (wintty.c:544
    // zeroes it at init); save.c never writes it.
    '_ttyDismissMore',
    '_ttyDismissMore', // C wintty.c:544: window state starts at zero in each process.
    '_runPageFrames', '_botlPaintedCap',
    /* go.occupation / gt.timed_occ_fn / go.occtxt: code pointers, which
     * savegamestate() never writes (a counted `20s` armed when `S` is typed
     * leaves timed_occ_fn = a closure the graph encoder rejects). */
    'occupation', 'timed_occ_fn', 'occtxt',
    /* gx.xlock (lock.c lock-picking/forcing context) is a process static that
     * save.c never writes; a restored process starts with it zeroed. */
    'xlock',
    /* The PRNG contexts (C rnd.c's CORE/DISP isaac64 states) are not in the
     * save file; the restoring process keeps the ones initRng() just seeded. */
    'coreCtx', 'dispCtx',
    // C rect.c:19-21: room-placement rectangles are process-local statics;
    // savegamestate() does not serialize the allocator.
    'nhrect', 'n_rects', 'rect_cnt',
    // C decl.h:849: gs.smeq is outside the saved instance globals.
    'smeq',
    // C mkmaze.c:701-703 gl.lregions / gn.num_lregions: decl.c:568 zeroes
    // them per process and savegamestate() never writes them, so a lregion
    // left pending by #wizloadlua does not reach a restored game's next
    // fixup_special().
    '_lregions',
    // C decl.h gx.xlock (lock.c lock-pick state) is outside savegamestate();
    // the restoring process starts with it zeroed.
    'xlock',
];

/* C ref: save.c:246 savegamestate() — everything between the current level and
 * the other levels.  Returns the graph root; the caller serializes it into a
 * detached byte representation. */
async function savegamestate() {
    // C save.c:282-292 — accumulate play time, then restart the interval.
    if (game.urealtime) {
        const clock = game.urealtime;
        clock.finish_time = getnow();
        clock.realtime += Math.trunc(clock.finish_time - clock.start_timing);
        clock.start_timing = clock.finish_time;
    }
    /* C save.c:166-167,704-718 — only a swallowed hero's free (OBJ_FREE) ball
     * and chain are kept as gl.looseball/loosechain and written by save_bc();
     * otherwise a free one is freed with no copy, so restore finds it gone
     * (restore.c:910 "lost ball & chain"). */
    {
        const u = game.u;
        if (u.uball && u.uball.where === OBJ_FREE && !u.uswallow)
            await setworn(null, W_BALL);
        if (u.uchain && u.uchain.where === OBJ_FREE && !u.uswallow)
            await setworn(null, W_CHAIN);
    }
    const state = {};
    for (const k of Object.keys(game))
        if (!NOT_SAVED.includes(k) && typeof game[k] !== 'function')
            state[k] = game[k];
    // C save.c:306 saves the migrating object chain, not JS's getter alias.
    // Copy its value while retaining graph identity with game.migrating_objs.
    if (game.gm)
        state.gm = { ...game.gm };
    // C decl.c: gd.did_nothing_flag is a decl global savegamestate() never
    // writes, so a restored process starts with it 0 (the first blocked
    // wait/search gets the "Use 'm' prefix" suffix again, do.c:2330-2333).
    if (game.gd)
        state.gd = { ...game.gd, did_nothing_flag: 0 };
    // C save_luadata serializes the Lua variables, never the interpreter or
    // its closures. Preserve the other gl fields (including light roots).
    state.gl = { ...game.gl, luacore: null };
    // C save.c:288: ubirthday is a 14-character local date, not a time_t.
    state.__ubirthday = yyyymmddhhmmss(game.u.ubirthday);
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
    /* C save.c:326 save_msghistory() -> tty_getmsghistory(TRUE) ->
     * msghistory_snapshot() -> topl.c:572 remember_topl(): the standing
     * topline (dosave's "Saving...") is filed once before history is written. */
    if (game._pending_message
        && !(game._topl_suppress_history || game._topl_suppress_once)) {
        let text = String(game._pending_message);
        if (text.endsWith('--More--'))
            text = text.slice(0, -8);
        if (text.length > 0)
            state._msg_history = [...(game._msg_history || []), text];
    }
    return state;
}

/* C ref: save.c:72 dosave0() — "returns 1 if save successful".  The C body's
 * work that has no JS counterpart is called out rather than silently dropped:
 * program_state.saving/notice_mon_off() (display suppression during the write),
 * the hangup fixups (u.uinvulnerable, iflags.save_uswallow/uinwater/uburied —
 * none of which this port sets), and the per-level file writes (savelev() already keeps those in game.levelStore,
 * which travels inside the snapshot). */
export async function dosave0() {
    const g = game;
    g.program_state = g.program_state || {};
    g.program_state.saving = (g.program_state.saving | 0) + 1;
    // C save.c:98 — settle active inventory and objects in transit before saving.
    await done_object_cleanup();
    if (g._pending_message
        && _topl_more_pages(g._pending_message, _topl_joins_snapshot(g._pending_message)).length > 1)
        await force_more_pages(g._pending_message, true, false, '');
    /* C save.c:98 — `if (!program_state.something_worth_saving || !gs.SAVEF[0])
     * goto done;` i.e. no game in progress, or no file name. */
    const path = savefile_name(g.plname);
    if (!g.plname) {
        g.program_state.saving = 0;
        return 0;
    }
    /* C save.c:113-122 — an existing save file (a wizard/explore restore
     * that answered 'y' to "keep the save file?") asks before overwriting;
     * 'n' is `goto done` with res 0. */
    if (g.iflags?.window_inited && vfsReadFile(path) !== null) {
        g._pending_message = '';    /* clear_nhwindow(WIN_MESSAGE) */
        await There('seems to be an old save file.');
        const { y_n_default } = await import('./cmd.js');
        if (await y_n_default('Overwrite the old file?', 'n') === 'n') {
            g.program_state.saving = 0;
            return 0;
        }
    }
    /* C save.c:141-145 — undo the date-dependent luck that moveloop_preamble
     * applied at startup, so the FILE carries Luck without it; the restoring
     * process's own preamble re-applies its date. */
    if ((g.flags?.moonphase | 0) === 4 /* FULL_MOON */)
        change_luck(-1);
    if (g.flags?.friday13)
        change_luck(1);
    await dangling_light_check(); /* save_light_sources -> obj_is_local panic */
    try {
        // C save.c:168 -> savelev_core(:483-488): purge before writing.
        if ((g.iflags.purge_monsters | 0) > 0)
            await dmonsfree();
        if (g.objs_deleted) dobjsfree(); // save.c:489-491
        /* C save.c:168-169,307,894: saving the current level and migrating
         * monsters runs savemonchn(), resetting each priest's entry timers
         * before the save is written, just as savelev() does on departure. */
        for (const head of [g.fmon, g.migrating_mons]) {
            for (let mon = head; mon; mon = mon.nmon)
                if (mon.ispriest) forget_temple_entry(mon);
        }
        /* C save.c:168 savelev(nhfp, ledger_no(&u.uz)) -> save.c:494 marks the
         * level being saved VISITED, so the restored game's level_info has it
         * (lev_by_name's "branch to ..." needs both ends VISITED). */
        if (g.u?.uz) {
            const cur = (g.dungeons?.[g.u.uz.dnum]?.ledger_start | 0) + (g.u.uz.dlevel | 0);
            g.level_info = g.level_info || {};
            if (cur >= 0 && cur <= maxledgerno())
                (g.level_info[cur] = g.level_info[cur] || { flags: 0 }).flags |= VISITED;
        }
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
                    if ((lev | 0) === current || !snap)
                        continue;
                    /* C save.c:210 getlev() re-prepends the stairway, trap
                     * and damage chains and re-inserts the level timers
                     * (restore.c:978, 1159-1160, restdamage, restore_timers)
                     * before save.c:213 savelev() writes them back, so this
                     * copy pass reverses each chain once, exactly as the
                     * inactive-level pass of dorecover does again. */
                    snap.stairs = reverse_chain(snap.stairs, 'next');
                    snap.ftrap = reverse_chain(snap.ftrap, 'ntrap');
                    if (snap.level)
                        snap.level.damagelist = reverse_chain(snap.level.damagelist, 'next');
                    if (snap.timers) restore_timer_order(snap.timers);
                    if (!snap.bubbles)
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

/* Reverse a singly linked chain in place via its `link` field. */
function reverse_chain(head, link) {
    let prev = null, cur = head ?? null;
    while (cur) {
        const nxt = cur[link] ?? null;
        cur[link] = prev;
        prev = cur;
        cur = nxt;
    }
    return prev;
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

/* C save.c:1077 freedynamicdata — release the saved role-option strings
 * (save.c:1131) and process-local wish history (save.c:1136) before exit. */
export async function freedynamicdata() {
    const { freeroleoptvals } = await import('./options.js');
    freeroleoptvals(); // C save.c:1131, before wish_history_flush().
    const { wish_history_flush } = await import('./zap.js');
    wish_history_flush();
}
