import { change_luck } from './attrib.js';
// save.js — C ref: nethack-c/src/save.c

import { game } from './gstate.js';
import { getnow } from './calendar.js';
import { yyyymmddhhmmss } from './calendar.js';
import { pline, There } from './pline.js';
import { TRICKED, VISITED, RANGE_LEVEL, MON_DETACH, OBJ_FREE, W_BALL, W_CHAIN, MAX_MSG_HISTORY } from './const.js';
import { setworn } from './worn.js';
import { save_light_sources, lights_save_snapshot, dangling_light_check, dangling_light_panics } from './light.js';
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
    /* C save.c:891-894 savemonchn under update_file(): every priest on the
     * level being saved forgets its temple-entry feedback counters, so a
     * revisit starts fresh. */
    if (!freeing) {
        for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
            if (mtmp.ispriest)
                forget_temple_entry(mtmp);
        }
    }
    /* C save.c:520-522,570-574 save_adjust_levelflags(): store stasis_until
     * relative to svm.moves when writing a level file so elapsed turns on other
     * levels do not tick down stasis while the level is inactive. */
    if (!freeing && game.level?.flags)
        game.level.flags.stasis_until = (game.level.flags.stasis_until | 0) - (game.moves | 0);
    const g = game;
    /* C save.c:494 Sfo_long(&svm.moves, "lev-timestmp") — the turn the level
     * was left, read back by getlev() as `svo.omoves` to compute elapsed. */
    const t = g._track;
    levelStore().set(lev, {
        omoves: g.moves | 0,
        // C save.c:673-684,924-934 writes same-dungeon destinations relative
        // to u.uz. Keep that origin alongside our absolute graph pointers so
        // restore.c can rebase bones loaded at a different special-level depth.
        saved_uz: { ...g.u.uz },
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


function apfs_fold(path) {
    const bytes = Uint8Array.from(path, c => c.charCodeAt(0) & 0xff);
    let s;
    try { s = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
    catch { return path; }
    let out = '';
    for (const ch of s.normalize('NFD')) {
        /* full case folding (CaseFolding.txt C+F) as an equivalence: iterate
         * upper->lower to a fixpoint so ẞ -> ß -> ss and ς -> σ. */
        /* U+0131 DOTLESS I has no CaseFolding.txt entry (only a Turkic 'T'
         * one, which full folding excludes), but toUpperCase() maps it to 'I'. */
        let f = ch, prev;
        if (ch !== '\u0131')
            for (let i = 0; i < 4 && f !== prev; i++) { prev = f; f = f.toUpperCase().toLowerCase(); }
        out += f;
    }
    return out.normalize('NFD');
}

/* APFS refuses (EILSEQ) to create a name whose bytes are not valid UTF-8. */
function apfs_name_ok(path) {
    const bytes = Uint8Array.from(String(path), c => c.charCodeAt(0) & 0xff);
    try { new TextDecoder('utf-8', { fatal: true }).decode(bytes); return true; }
    catch { return false; }
}

/* unixunix.c:297-303 regularize(): '.', '/' and ' ' become '_'. */
function regularize(s) {
    return s.replace(/[./ ]/g, '_');
}

export function savefile_name(plname) {
    const want = `save/${regularize(plname || '')}`;
    const key = apfs_fold(want);
    for (const path of vfsListFiles('save/'))
        if (apfs_fold(path) === key) return path;
    return want;
}

export const NOT_SAVED = [
    // pline.c:50-60 and save.c:1086,1164: these allocations/counters are
    // process state, separate from the tty history written by save_msghistory.
    '_youBuf', 'saved_plines', 'saved_pline_index', 'early_raw_messages',
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
    // botl.c:1498-1499 static oldrndencode/oldgoldsym and the two blstats[] buffers
    // (percent_value, now_or_before_idx) are zeroed in each new process.
    '_blPctSlots', '_blExpPercent', '_blOldGoldSym',
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
    // C save.c:265-333 omits symbol tables and symset metadata.
    // Keep symbols.c:85-215/options.c:7199-7213 state built by this rc.
    'gs',
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
    // C pager.c:2661 dowhatdoes() `static boolean once = FALSE;` is process-local.
    '_whatdoes_once',
    /* C decl.h:886 gs.simple_options_help lives in struct instance_globals_s
     * (decl.c:708 initial FALSE), which savegamestate() (save.c:264-333) never
     * writes; the `O` menu's '?' toggle (options.c:8657) therefore does not
     * survive a save: the restoring process shows "? - show help" again. */
    'simple_options_help',
    // gm.multi / multi_reason / multireasonbuf (decl.h:592-594), ga.afternmv,
    // gn.nomovemsg (decl.h:658), go.occtime (decl.h:710): a restored process
    // starts with no pending multi-turn action.
    'multi', 'multi_reason', 'multireasonbuf', 'afternmv', 'occtime',
    // gc.command_count (decl.h:244), gl.last_command_count (decl.h:521),
    // gc.cmd_key (decl.h:242), gc.current_wand (decl.h:246) — command memory.
    'command_count', 'last_command_count', 'cmd_key', 'gc_current_wand',
    // gc.clicklook_cc (decl.h), the last farlook/click position.
    'clicklook_cc',
    // gu.unweapon (decl.h:978; restore.c:691-699 recomputes it), gv.vision_
    // full_recalc (decl.h:1019), gn.notonhead (decl.h:681), gt.thrownobj
    // (decl.h:931), gk.kickedloc (decl.h:507), ga.at_ladder (decl.h:149).
    'unweapon', 'notonhead', 'thrownobj', 'kickedloc', 'at_ladder',
    // gp.petname_used (decl.h:770), gp.preferred_pet (decl.h:771, from the rc),
    // gy.yn_number, gm.mrank_sz (decl.h:589), gv.vault_x/y (decl.h:1003),
    // ge.en_win / en_via_menu (decl.h:354-355), gi.initial_don (decl.h:474).
    'petname_used', 'preferred_pet', 'yn_number', 'mrank_sz', 'vault_x', 'vault_y',
    'en_win', 'en_via_menu', 'initial_don',
    // Level-creation transients: gm.made_branch (decl.h:616), gi.in_mklev
    // (decl.h:467), gl.lev_message (decl.h:567), gi.in_mk_themerooms
    // (decl.h:490), gt.themeroom_failed (decl.h:957), gr.ransacked (decl.h:
    // 822), sp_lev.c's splev map.
    'made_branch', 'in_mklev', 'lev_message', 'in_mk_themerooms', 'themeroom_failed',
    'ransacked', 'splev_map',
    // gc.current_container (decl.h:284), ga.abort_looting (decl.h:169),
    // ga.acid_ctx (decl.h:181), gb.bughack (decl.h:208), ball.c's
    // bcrestriction static, gm.m muse state (has_defense ... misc,
    // decl.h:633 m_using), gj.jumping_is_magic (decl.h:500),
    // gi.in_steed_dismounting (decl.h:468), pray.c turn_undead statics,
    // gv.vamp_rise_msg (decl.h:1007), gw.wasinwater (decl.h:1034),
    // invent.c's getobj_else static, gd.defer_see_monsters (decl.h:315),
    // gd.done_seq (decl.h:329), gl.loot_reset_justpicked (decl.h:560),
    // gp.pickup_encumbrance (decl.h:781), gs.sex_change_ok (decl.h:899).
    'current_container', 'abort_looting', 'acid_ctx', 'bughack', 'bcrestriction',
    'has_defense', 'has_offense', 'has_misc', 'defensive', 'offensive', 'misc',
    'm_using', 'jumping_is_magic', 'in_steed_dismounting', 'turn_undead_range',
    'turn_undead_msg_cnt', 'vamp_rise_msg', 'wasinwater', 'getobj_else',
    'defer_see_monsters', 'done_seq', 'loot_reset_justpicked', 'pickup_encumbrance',
    'sex_change_ok',
    // gs.spl_sortmode / spl_orderindx (decl.h:909-910): the `+` menu's sort
    // order is process state; svs.spl_book itself is saved (save.c:316-318).
    'spl_sortmode', 'spl_orderindx',
    // gm.mydogs (decl.h:603): only non-empty during a level change.
    'mydogs',
    // rumors.c true/false rumor offsets (gt.true_rumor_size decl.h:949 ...),
    // computed from the rumors file by each process.
    'true_rumor_size', 'true_rumor_start', 'true_rumor_end',
    'false_rumor_size', 'false_rumor_start', 'false_rumor_end',
    // vision.c process state (gv.viz_array family, cs_rows/left/right
    // clear-path tables, the vision iterator); restore.c:927 recomputes.
    'cs_rows', 'cs_left', 'cs_right', 'vis_func', 'vis_varg', 'vis_start_row',
    'vis_start_col', 'vis_step', 'v',
    // struct display_hints disp (decl.h:123) aliases.
    'botl', 'botlx',
    // Option/rc state: `struct a11y_info a11y` (flag.h, options-only, never
    // saved), ga.apelist autopickup exceptions (decl.h; options.c:5974 adds,
    // save.c never writes — a restored process has only its rc's), the
    // SYMBOLS= overrides, role filter, options menu runtime bookkeeping.
    'a11y', 'apelist', 'symbolOverrides', 'rc_rolefilter', 'options_runtime',
    // gb.bl_hilite_moves (decl.h:192), gc.corpsenm_digested (decl.h:297),
    // gd.did_dig_msg (decl.h:318), ge.eatmbuf (decl.h:359), gk.kickedobj
    // (decl.h:510), gm.mentioned_water (decl.h:645), gm.mswallower
    // (decl.h:610), gs.stoned (decl.h:850), gz.zap_oseen (decl.h:1098).
    'bl_hilite_moves', 'corpsenm_digested', 'did_dig_msg', 'eatmbuf', 'kickedobj',
    'mentioned_water', 'mswallower', 'stoned', 'zap_oseen',
    // JS-only: map-dump channel counter, the `cg.zeroany` constant, `s`.
    'mapdump_serial', 'cg', 's',
];

/* JS-private `_name` keys.  The port hangs a great deal of window-port and
 * display bookkeeping (tty topline/botl/--More-- state) off `game` under
 * leading-underscore names; C keeps the equivalent in wintty.c/botl.c/
 * display.c statics, which no save function writes.  So a `_name` key is
 * PROCESS state unless it is listed here as the port's spelling of a field C
 * does save: */
export const SAVED_PRIVATE = new Set([
    '_artiexist',            // artifact.c:124 save_artifacts artiexist[]
    '_disco',                // o_init.c:384-386 savenames svd.disco[]
    // o_init.c:387-389 savenames writes objects[] whole (Sfo_objclass):
    // oc_name_known, oc_encountered, oc_uname (:394-400), the shuffled
    // descriptions/colors/materials, and the price-seen columns (objects.h:51).
    '_oc_name_known', '_oc_encountered', '_oc_uname', '_oc_price_seen',
    '_objDescrIdx', '_objDescriptions', '_objColors', '_objMaterials', '_objTough',
    // dungeon.c save_dungeon: dungeons[], branches, n_dgns, sp_levchn,
    // mapseenchn (the #overview database).
    '_dungeon_branches', '_dungeons_full', '_n_dgns', '_sp_levchn',
    '_tune',                 // decl.h:1214 svt.tune
    '_msg_history',          // save.c:326 save_msghistory
    /* Which _msg_history lines a getlin filed (getline.c:81) — a property of
     * the saved strings themselves in C (no word-wrap '\n', so ^P hard-wraps
     * them, topl.c:121-142); it must travel with _msg_history. */
    '_getlin_hist',
    '_track',                // save.c:553 save_track (track.c:81-84)
    '_lastinvnr',            // restgamestate resets it (decl.h:536)
]);
/* Prefixes of `_` keys holding saved per-level / overview state:
 * svl.level.flags (save.c:521 Sfo_levelflags) and mapseenchn. */
const SAVED_PRIVATE_PREFIXES = ['_level_', '_mapseen_'];

/* struct instance_globals_<x> containers (decl.h:141-1106) are process
 * state except for the few fields a save function writes. */
export const SAVED_CONTAINER_FIELDS = {
    gt: ['timer_base'],      // save.c:297 save_timers
    gm: ['migrating_objs'],  // save.c:306 saveobjchn(&gm.migrating_objs)
};
const PROCESS_CONTAINERS = new Set(['ga', 'gb', 'gc', 'gd', 'ge', 'gf', 'gg', 'gh',
    'gi', 'gj', 'gk', 'gl', 'gm', 'gn', 'go', 'gp', 'gq', 'gr', 'gs', 'gt', 'gu',
    'gv', 'gw', 'gx', 'gy', 'gz']);

/* C struct flag (flag.h) — saved whole (save.c:279 Sfo_flag).  Options the
 * port parks on game.flags that are NOT struct flag fields (the rc parser's
 * fallthrough arm, cond_* condition options which C keeps in botl.c
 * condtests[], pet names in gc/gd/gh, `color` = iflags.wc_color, mhitm's
 * gz.zombify) belong to the process that reads its own rc. */
export const C_FLAG_FIELDS = new Set(['acoustics', 'armorstatus', 'autodig', 'autoquiver',
    'autoopen', 'beginner', 'biff', 'bones', 'confirm', 'dark_room', 'debug', 'end_own',
    'explore', 'female', 'friday13', 'goldX', 'help', 'tips', 'tutorial', 'ignintr',
    'implicit_uncursed', 'ins_chkpt', 'invlet_constant', 'legacy', 'lit_corridor',
    'mention_decor', 'mention_walls', 'nap', 'nopick_dropped', 'null', 'pickup',
    'pickup_stolen', 'pickup_thrown', 'pushweapon', 'quick_farsight', 'rest_on_space',
    'safe_dog', 'safe_wait', 'showexp', 'showscore', 'showvers', 'silent', 'sortpack',
    'sparkle', 'standout', 'terrainstatus', 'time', 'tombstone', 'verbose',
    'weaponstatus', 'end_top', 'end_around', 'autounlock', 'moonphase', 'suppress_alert',
    'paranoia_bits', 'versinfo', 'pickup_burden', 'pile_limit', 'discosort', 'sortloot',
    'vanq_sortmode', 'inv_order', 'pickup_types', 'end_disclose', 'menu_style',
    'made_fruit', 'initrole', 'initrace', 'initgend', 'initalign', 'randomall',
    'pantheon', 'lootabc', 'showrace', 'travelcmd', 'runmode']);
/* C struct context_info (context.h) — saved whole (save.c:277). */
export const C_CONTEXT_FIELDS = new Set(['ident', 'no_of_wizards', 'run', 'startingpet_mid',
    'current_fruit', 'mysteryforce', 'rndencode', 'startingpet_typ', 'warnlevel',
    'next_attrib_check', 'seer_turn', 'snickersnee_turn', 'stethoscope_seq', 'travel',
    'travel1', 'forcefight', 'nopick', 'made_amulet', 'mon_moving', 'move', 'mv',
    'bypasses', 'door_opened', 'resume_wish', 'tips', 'digging', 'victual', 'engraving',
    'tin', 'spbook', 'takeoff', 'warntype', 'polearm', 'objsplit', 'tribute', 'novel',
    'achieveo', 'lifelist', 'jingle']);

/* Is top-level `game[k]` part of the save file?  The single predicate both
 * savegamestate() and restgamestate() consult. */
export function isSavedGameKey(k) {
    if (NOT_SAVED.includes(k)) return false;
    if (PROCESS_CONTAINERS.has(k)) return false; /* see SAVED_CONTAINER_FIELDS */
    if (k.startsWith('_'))
        return SAVED_PRIVATE.has(k) || SAVED_PRIVATE_PREFIXES.some(p => k.startsWith(p));
    return true;
}

/* Keep only the keys of `saved` that C's struct carries; every other key keeps
 * the restoring process's own value from `fresh`. */
export function merge_c_struct(fresh, saved, cfields) {
    const out = {};
    for (const k of Object.keys(fresh || {}))
        if (!cfields.has(k)) out[k] = fresh[k];
    for (const k of Object.keys(saved || {}))
        if (cfields.has(k)) out[k] = saved[k];
    return out;
}

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
        if (isSavedGameKey(k) && typeof game[k] !== 'function')
            state[k] = game[k];
    /* Only the instance_globals fields a save function writes (decl.h; see
     * SAVED_CONTAINER_FIELDS).  gm.migrating_objs is copied by value while
     * keeping graph identity with game.migrating_objs (save.c:306).  The rest
     * — gd.did_nothing_flag (do.c:2330-2333), gl.luacore, gc's queues, go's
     * option flags, gv.valid_menu_classes, gb.bucx_filter, gc.class_filter
     * ... — belongs to the process. */
    for (const [c, fields] of Object.entries(SAVED_CONTAINER_FIELDS)) {
        if (!game[c]) continue;
        const o = {};
        for (const f of fields) if (Object.hasOwn(game[c], f)) o[f] = game[c][f];
        state[c] = o;
    }
    /* struct flag / struct context_info are written whole (save.c:277,279);
     * JS-only keys parked on them are process state. */
    if (game.flags) state.flags = merge_c_struct(null, game.flags, C_FLAG_FIELDS);
    if (game.context) state.context = merge_c_struct(null, game.context, C_CONTEXT_FIELDS);
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
    /* C topl.c:578-596 msghistory_snapshot() collects only what the tty
     * message ring still holds: cw->rows slots, iflags.msg_history clamped to
     * [20, MAX_MSG_HISTORY] when WIN_MESSAGE was created (wintty.c:889-893),
     * empty slots skipped.  Older lines were overwritten in their slots and
     * never reach the save file, so a restoring process with a larger
     * msghistory cannot list them. */
    if (Array.isArray(state._msg_history)) {
        const rows = Math.min(Math.max((game.iflags?.msg_history ?? 20) | 0, 20), MAX_MSG_HISTORY);
        state._msg_history = state._msg_history.filter((m) => m).slice(-rows);
    }
    return state;
}

/* Remember any standing topline into _msg_history and clear _pending_message,
 * matching C clear_nhwindow(WIN_MESSAGE) -> remember_topl(). */
function _remember_and_clear_topl(g) {
    if (g._pending_message
        && !(g._topl_suppress_history || g._topl_suppress_once)
        && g._pending_message !== g._topl_history_recall) {
        let text = String(g._pending_message);
        if (text.endsWith('--More--'))
            text = text.slice(0, -8);
        if (text.length > 0)
            (g._msg_history ||= []).push(text);
    }
    g._pending_message = '';
}

/* C ref: save.c:72 dosave0() — "returns 1 if save successful". */
export async function dosave0() {
    const g = game;
    g.program_state = g.program_state || {};
    g.program_state.saving = (g.program_state.saving | 0) + 1;
    try {
        /* C save.c:87-93 — hangup fixups so restored state is consistent. */
        if (g.u) g.u.uinvulnerable = 0;
        if (g.iflags?.save_uswallow) {
            if (g.u) g.u.uswallow = 1;
            g.iflags.save_uswallow = 0;
        }
        if (g.iflags?.save_uinwater) {
            if (g.u) g.u.uinwater = 1;
            g.iflags.save_uinwater = 0;
        }
        if (g.iflags?.save_uburied) {
            if (g.u) g.u.uburied = 1;
            g.iflags.save_uburied = 0;
        }
        // C save.c:98 — settle active inventory and objects in transit before saving.
        await done_object_cleanup();
        if (g._pending_message
            && _topl_more_pages(g._pending_message, _topl_joins_snapshot(g._pending_message)).length > 1)
            await force_more_pages(g._pending_message, true, false, '');
        /* C save.c:100 — `if (!program_state.something_worth_saving || !gs.SAVEF[0])
         * goto done;` i.e. no game in progress, or no file name. */
        const path = savefile_name(g.plname);
        if (!g.program_state.something_worth_saving || !g.plname)
            return 0;
        /* C save.c:113-122 — an existing save file (a wizard/explore restore
         * that answered 'y' to "keep the save file?") asks before overwriting;
         * 'n' is `goto done` with res 0. */
        if (g.iflags?.window_inited && vfsReadFile(path) !== null) {
            _remember_and_clear_topl(g); /* C save.c:116 clear_nhwindow(WIN_MESSAGE) */
            await There('seems to be an old save file.');
            const { y_n_default } = await import('./cmd.js');
            if (await y_n_default('Overwrite the old file?', 'n') === 'n')
                return 0;
            /* y_n_default's _answered already recorded the answered prompt. */
            g._pending_message = '';
        }
        if (!apfs_name_ok(path)) {
            await pline('Cannot open save file.');
            return 0;
        }
        /* C save.c:141-145 — undo the date-dependent luck that moveloop_preamble
         * applied at startup, so the FILE carries Luck without it; the restoring
         * process's own preamble re-applies its date. */
        if ((g.flags?.moonphase | 0) === 4 /* FULL_MOON */)
            change_luck(-1);
        if (g.flags?.friday13)
            change_luck(1);
        if (g.iflags?.window_inited)
            _remember_and_clear_topl(g); /* C save.c:147 clear_nhwindow(WIN_MESSAGE) */
        if (dangling_light_panics())
            vfsWriteFile(path, SAVE_TRUNCATED);
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
            /* C save.c:959 savefruitchn — omit negative fruit IDs from the save. */
            if (state.ffruit) {
                let head = null, tail = null;
                for (let f = state.ffruit; f; f = f.nextf) {
                    if ((f.fid | 0) >= 0) {
                        if (!head) head = f;
                        else tail.nextf = f;
                        tail = f;
                    }
                }
                if (tail) tail.nextf = null;
                state.ffruit = head;
            }
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
                    const { find_lev_obj_no_longer_held,
                            restmonchn_place_diagnostics } = await import('./restore.js');
                    for (const [lev, snap] of stored) {
                        if ((lev | 0) === current || !snap)
                            continue;
                        /* C save.c:210 getlev() re-prepends the stairway, trap
                         * and damage chains and re-inserts the level timers
                         * (restore.c:978, 1159-1160, restdamage, restore_timers),
                         * and find_lev_obj() -> place_object() calls
                         * obj_no_longer_held() on fobj in reverse order
                         * (restore.c:93-97, 1168) before save.c:213 savelev() writes
                         * them back. */
                        snap.stairs = reverse_chain(snap.stairs, 'next');
                        snap.ftrap = reverse_chain(snap.ftrap, 'ntrap');
                        if (snap.level)
                            snap.level.damagelist = reverse_chain(snap.level.damagelist, 'next');
                        await find_lev_obj_no_longer_held(snap.fobj);
                        // C save.c:210 -> restore.c:1177-1194: even a copying
                        // read rebuilds monster occupancy and reports overlaps.
                        await restmonchn_place_diagnostics(snap.fmon, snap.worms);
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
            if (vfsWriteFile(path, `NHSAVE 2\n${g.plname}\n${payload}\n`)) {
                g.program_state.something_worth_saving = 0; // C save.c:227
                // Copying getlev() diagnostics leave a final tty message for
                // save.c:63 display_nhwindow(WIN_MESSAGE, TRUE). Ordinary saves
                // have no pending message after save.c:147's clear above.
                if (g._pending_message && !g._topl_win_stop) {
                    await force_more_pages(g._pending_message);
                    g._pending_message = '';
                }
                return 1;
            }
            return 0;
        } catch (e) {
            const msg = String(e?.message || '');
            if (msg.includes('Input queue empty') || msg.startsWith('nh_terminate:'))
                throw e;
            return 0;
        }
    } finally {
        g.program_state.saving = Math.max(0, (g.program_state.saving | 0) - 1);
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

/* A save file whose writer panicked part way (see dosave0's
 * dangling_light_panics() arm): it exists, but restore's first short read
 * fails.  js/jsmain.js turns it into C's restore failure. */
export const SAVE_TRUNCATED = 'NHSAVE TRUNCATED\n';

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
    const { free_menu_coloring } = await import('./coloratt.js');
    free_menu_coloring(); // C save.c:1084
    const { free_tutorial } = await import('./nhlua.js');
    await free_tutorial(); // C save.c:1135 (only needed if quitting while in tutorial)
    const { release_runtime_info } = await import('./mdlib.js');
    release_runtime_info(); // C save.c:1167
    const { wish_history_flush } = await import('./zap.js');
    wish_history_flush();
    const { sysopt_release } = await import('./sys.js');
    sysopt_release(); // C save.c:1188
}
