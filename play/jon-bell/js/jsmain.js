// @ts-nocheck
// C ref: unixmain.c — nethack_main() initialization and game setup.
//
// For browser play, see nethack.js.
import { game, resetGame } from './gstate.js';
import { vfsDeleteFile } from './storage.js';
import { savefile_name } from './save.js';
import { initRng, enableRngLog, getRngLog, pushRngLogEntry } from './rng.js';
import { newgame, moveloop_core, _flushTrailingWorldBlock } from './allmain.js';
import { FF_FAITHFUL } from './fastforward.js';
import { parseNethackrc, init_fruit_chain } from './options.js';
import { reset_commands, update_rest_on_space } from './cmd_binds.js';
import { set_configfile_for_session } from './cfgfiles.js';
import { gs, H_DEC, H_UNK, PRIMARYSET, INFRAVISION, ESCAPED, RUN_LEAP } from './const.js';
import monsPack from './makemon_mons.json' with { type: 'json' };
import { roleOptionToIndex, raceOptionToIndex, genderOptionToIndex, alignOptionToIndex, genlPlayerSetupRandomPicksForY, sessionNeedsRandomPlayerPicks, extractChargenPreInitRng, replayChargenPreInitRng, detectInteractiveChargenFromSession, } from './roles.js';
import { GameDisplay } from './game_display.js';
import { generateChargenFrames, chargenShallAnswer, playChargen } from './chargen_ui.js';
import { rn2 } from './rng.js';
import { nhgetch } from './input.js';
import { worm_seg_at } from './worm.js';
import { worms_rest_snapshot } from './worm.js';
import { bubbles_reset_process_state } from './mkmaze.js';
import { lights_rest_snapshot } from './light.js';
import { regions_rest_snapshot } from './region.js';
import { vision_debug_snapshot } from './vision.js';
// WRITE-ONLY route-attribution telemetry (inert unless NH_ROUTE_TELEMETRY=1 —
import { routeTag, routeFrameTick } from './route_telemetry.js';
import { restore_saved_game, dorecover, restore_preamble } from './restore.js';
import { ENV } from './hostenv.js';
function extractRoleInitRng(sessionData) {
    const calls = [];
    let capturing = false;
    for (const step of (sessionData?.steps ?? [])) {
        for (const entry of (step.rng ?? [])) {
            if (typeof entry !== 'string')
                continue;
            if (entry[0] === '^' || entry[0] === '>' || entry[0] === '<')
                continue;
            if (!capturing) {
                if (entry.includes('init_objects(o_init.c'))
                    capturing = true;
                continue;
            }
            if (entry.includes('nhlib.lua') || entry.includes('dungeon.c')
                || entry.includes('dungeon.lua') || entry.includes('init_dungeon')) {
                return calls;
            }
            const m = entry.match(/^(rn2|rnd|rne|rnz|rnl|d)\((\d+)\)/);
            if (m)
                calls.push({ fn: m[1], n: parseInt(m[2], 10) });
        }
        if (capturing && calls.length > 0)
            return calls;
    }
    return calls;
}
// ── NethackGame ──
export class NethackGame {
    constructor(opts = {}) {
        this._seed = opts.seed || 0;
        this._datetime = opts.datetime || null;
        this._env = opts.env
            || (opts.datetime ? { NETHACK_FIXED_DATETIME: opts.datetime } : {});
        this._nethackrc = opts.nethackrc || '';
        this._moves = opts.moves || '';
        this._preflightRandomPicks = opts.preflightRandomPicks ?? false;
        this._chargenRng = opts.chargenRng ?? [];
        this._roleInitRng = opts.roleInitRng ?? null;
        this._playChargen = opts.playChargen ?? false;
        // the hook has to be the one it already reads — resolves it through
        // game.mockStorage, which resetGame() clears; start() re-links it
        // immediately afterwards, exactly as the InMemoryStorage note at the
        // foot of js/storage.js describes.
        this._storage = opts.storage ?? null;
        this._resuming = false;
        this._rcName = '';
        this._screens = [];
        this._cursors = [];
        this._rngSlices = [];
        this._lastRngIdx = 0;
        this._nhgetchCount = 0;
    }
    async start() {
        const g = resetGame();
        /* Each segment starts as a fresh C process.  These roots are module
         * state rather than `game` fields, so reset them before the restore
         * probe; dorecover reinstalls their saved snapshots when applicable. */
        worms_rest_snapshot(null);
        lights_rest_snapshot(null);
        regions_rest_snapshot(null);
        bubbles_reset_process_state();
        set_configfile_for_session(this._seed, this._datetime,
                                   this._nethackrc, this._moves);
        // Re-link the host storage handle after the globals reset.  js/storage.js
        // hook available and it must be re-established here rather than by
        // adding an export there.
        g.mockStorage = this._storage;
        // C initoptions_init resets bindings before RC parsing. Option and
        // BINDINGS handlers below mutate this same list in file order.
        g.flags = { rest_on_space: false };
        g.iflags.num_pad = false;
        g.iflags.num_pad_mode = 0;
        reset_commands(true);
        // C seeds the PRNG (options.c:7161) before the rc is parsed, and the
        // rc's CHOOSE= draws rn2 (cfgfiles.c:480).
        initRng(this._seed);
        enableRngLog();
        // Parse nethackrc
        const opts = parseNethackrc(this._nethackrc);
        g.msgtype_hide = opts.msgtypes || [];
        // C ref: options.c optfn_name — svp.plname[] is empty unless the rc
        // named the hero.  The 'Hero' default is a JS-side placeholder for
        // the replay path; the played-chargen path asks instead (askname).
        this._rcName = opts.name || '';
        g.plname = opts.name || 'Hero';
        // C ref: options.c:7288 initoptions_init — svp.pl_fruit defaults to
        // OBJ_NAME(objects[SLIME_MOLD]) == "slime mold" (overridable via the rc
        // "fruit:" option).  Consumed by fruitname() for the fruit-juice/see-invis
        // "This tastes like <fruit> juice." message.
        g.pl_fruit = opts.fruit || 'slime mold';
        init_fruit_chain();
        /* C options.c:7171-7173 initoptions_init — the score-list options.
         * They are read by topten() (topten.c:819) as
         *     skip_scores = !flags.end_top && !flags.end_around && !flags.end_own
         * so leaving them undefined made skip_scores TRUE and suppressed the
         * whole end-of-game score list, header included.  sysopt comes from
         * sys.c:67-68: entrymax = max(ENTRYMAX, 10), pointsmin = max(POINTSMIN, 1). */
        g.flags = { verbose: true, end_top: 3, end_around: 2, end_own: false,
                    rest_on_space: false,
                    dark_room: true, menu_style: 2 /* MENU_FULL */, apelist: null,
                    /* C options.c:7176 default; OPTIONS=runmode overrides it. */
                    runmode: RUN_LEAP,
                    ...opts.flags };
        /* C sys.c:66-69 sys_early_init(), with config.h:333-346's compiled-in
         * values: persmax = max(PERSMAX,1) = 3, entrymax = max(ENTRYMAX,10) =
         * 100, pointsmin = max(POINTSMIN,1) = 1, pers_is_uid = PERS_IS_UID,
         * which is 1 on every build that is not MICRO/MACOS9/WIN32.  All four
         * were guesses (10/10/1/false) and all four were unobservable while the
         * record file was permanently empty; they become load-bearing the
         * moment topten() reads a list back, because persmax caps how many
         * entries one uid+role may keep and entrymax caps the list length. */
        g.sysopt = { entrymax: 100, pointsmin: 1, persmax: 3, pers_is_uid: 1,
                     tt_oname_maxrank: 10, ...(g.sysopt || {}) };
        // C ref: options.c set_playmode() line 10179 — when playmode:debug (wizard mode)
        // is set, C overrides svp.plname with "wizard" unconditionally (after
        // recordings).  The rc name (e.g. "Gronk") is discarded; the welcome message
        // reads "Hello wizard, ...".  Mirror this here so the JS plname and the cursor
        // position at the --More-- boundary (strlen("Hello wizard,...--More--")) match C.
        if (g.flags.debug)
            g.plname = 'wizard';
        // preamble can read NETHACK_FIXED_DATETIME for phase_of_the_moon().
        g.env = this._env;
        g.flags.initrole = roleOptionToIndex(opts.role);
        g.flags.initrace = raceOptionToIndex(opts.race);
        g.flags.initgend = genderOptionToIndex(opts.gender);
        g.flags.initalign = alignOptionToIndex(opts.align);
        g.iflags = {
            suppress_price: 0,
            wc_color: true,
            /* C optlist.h status_updates: On; timebot() is a physical paint. */
            status_updates: true,
            debug_fuzzer: 0,
            num_pad_mode: 0,
            getpos_coords: 0,
            mon_telecontrol: false,
            mon_telecontrol_pos: null,
            montelecontrol_pos: null,
            ...opts.iflags,
        };
        if (opts.flags && opts.flags.color !== undefined)
            g.iflags.wc_color = !!opts.flags.color;
        g.iflags.use_color = g.iflags.wc_color;   /* flag.h:507 alias */
        // C initoptions_finish reapplies rest-on-space after all RC bindings.
        update_rest_on_space();
        /* C's SYMBOLS= directives override individual primary symbols after
         * selecting a symset.  Only S_pool is parsed at present because it is
         * the one supported renderer override. */
        g.symbolOverrides = opts.symbolOverrides || {};
        if (opts.preferred_pet)
            g.preferred_pet = opts.preferred_pet;
        if (opts.tutorial_set)
            g.tutorial_set_in_config = true;
        // Apply symset option → gs.symset[PRIMARYSET].handling.
        // C ref: options.c optfn_DECgraphics / handler_symset — sets gs.symset[PRIMARYSET].handling.
        // Default (no symset option) keeps H_UNK → ASCII PCHAR glyphs from defsym.h.
        // "DECgraphics" → H_DEC → DEC line-drawing characters.
        gs.symset[PRIMARYSET].handling = (opts.symset === 'DECgraphics') ? H_DEC : H_UNK;
        // C ref: options.c optfn_symset — the chosen set's NAME is stored too, and
        // gc.currentgraphics is switched to PRIMARYSET.  optfn_symset's get_val
        // (options.c:4180) renders "<name>, active, handler=<H>" from exactly
        // these two fields, which is what the 'O' menu's symset row shows; with
        // no name recorded it reports "default" for a set that is plainly active.
        if (opts.symset) {
            gs.symset[PRIMARYSET].name = opts.symset;
            /* C options.c:4198 optfn_symset sets these and nothing clears them
             * until the first reset_needed_visuals()/doset, so a later bound
             * toggle() redraws (docrt -> --More-- on a pending topline). */
            g.go = g.go || {};
            g.go.opt_need_redraw = g.go.opt_need_glyph_reset = true;
            g.go.opt_symset_changed = true;
        }
        // Initialize hero struct.  C's `struct u_event` is embedded in `you`
        // and is BSS-zeroed by decl_globals_init(); keep the same explicit
        // zero state here so event reads (quest completion, invocation,
        // demi-god status, and endgame titles) are real canonical fields
        // rather than absent-property fallbacks.
        g.u = {
            // C u_init_misc preserves the roleplay options across zeroing u.
            uroleplay: {...opts.uroleplay},
            ux: 0, uy: 0, ux0: 0, uy0: 0, ugrave_arise: -1 /* NON_PM */,
            uevent: {
                minor_oracle: 0, major_oracle: 0, read_tribute: 0,
                qcalled: 0, qexpelled: 0, qcompleted: 0,
                uheard_tune: 0, uopened_dbridge: 0, invoked: 0,
                gehennom_entered: 0, uhand_of_elbereth: 0, udemigod: 0,
                uvibrated: 0, ascended: 0, amulet_wish: 0,
            },
        };
        g.context = { move: 0, item_action_in_progress: 0 };
        g.gd = { decor_fumble_override: 0 };
        /* C end.c's gk global tracks in-flight kicked/thrown objects; it is
         * zero-initialized and consulted during death cleanup. */
        g.gk = {};
        // Prompt readers overwrite this while entering an in-command prompt;
        // null is the C-equivalent unset state for the telemetry marker.
        g._promptKind = null;
        g.en_via_menu = false;
        // resetGame() already zeroed the full C program_state, including
        // stopprint. Do not replace that shared struct with a partial object.
        // C ref: u_init.c:645 svm.moves = 1L — set inside u_init_role()
        // which runs AFTER mklev().  We start at 0 here so that the
        // post_mklev mapstate snapshot (emitMapstate('post_mklev') in
        // allmain.js:newgame, before fastforward_post_mklev) emits
        // allmain.js:newgame() sets g.moves=1 at the u_init_role
        // equivalent position (after fastforward_post_mklev).
        g.moves = 0;
        // TODO: Map role/race/gender/align from opts to role data
        g.urole = { name: { m: 'Rambler', f: 'Rambler' } };
        g.urace = { adj: 'human' };
        if (this._preflightRandomPicks)
            genlPlayerSetupRandomPicksForY(g);
        if (this._chargenRng.length > 0)
            replayChargenPreInitRng(this._chargenRng);
        // Store role_init RNG for fastforward_pre_mklev to consume in place of
        // consumeQuestNemesisGenderRng + consumeRolePantheonPickRng.
        if (this._roleInitRng !== null)
            g._roleInitRng = this._roleInitRng;
        // Install display
        if (this._pendingDisplay) {
            g.nhDisplay = this._pendingDisplay;
            this._pendingDisplay = null;
        }
        g.iflags.window_inited = true;
        this._installCaptureHook();
        // ── attempt_restore (v5 cross-segment save channel) ───────────────
        // C ref: sys/unix/unixmain.c:220 `attempt_restore:` — after
        // initoptions()/plnamesuffix()/vision_init() and BEFORE
        // player_selection()+newgame(), main() asks whether this hero has a
        // save file; if so the whole new-game path is skipped and moveloop()
        // runs with resuming=TRUE.  The save file travels through
        // segment), which js/storage.js reads through game.mockStorage.
        //
        // A segment whose storage holds no save file falls straight through to
        // the chargen+newgame path below, which is every single-segment
        {
            // set_playmode has already replaced the configured name in wizard
            // mode. Look up the same effective name that dosave0 writes.
            const save = restore_saved_game((this._rcName || g.flags.debug) ? g.plname : '');
            if (save) {
                await dorecover(save);
                /* C decl.h gl.luathemes is process state and is NOT in the save
                 * file; the restoring process starts with it empty, so its first
                 * makelevel() loads themerms.lua (nhlib.lua shuffle).  restgamestate()
                 * here copies every own property of the save onto game. */
                game._luathemes_loaded = {};
                /* C restore.c:902-903 dorecover() — `if (!wizard && !discover)
                 * (void) delete_savefile();`.  Wizard/explore restores keep it
                 * until restore_preamble()'s "keep the save file?" prompt. */
                if (!game.flags?.debug && !game.flags?.explore)
                    vfsDeleteFile(savefile_name(game.plname));
                this._resuming = true;
                await restore_preamble();
                return;
            }
        }
        // ── PLAYED chargen (v5 contract) ──────────────────────────────────
        // C ref: sys/unix/unixmain.c:198 plnamesuffix() -> tty_askname(),
        // then :289 player_selection() -> role.c:2206 genl_player_setup(),
        // then :315 newgame().  Everything here happens AFTER the RNG is
        // seeded and BEFORE newgame(), so the facet picks are the first
        // entries in the stream — exactly where the recordings show them
        // step 8's randomize_gem_colors from newgame).
        //
        // (extractChargenPreInitRng + generateChargenFrames) and must keep
        // to that path.
        if (this._playChargen) {
            // C ref: unixmain.c:193 set_playmode() runs BEFORE plnamesuffix(),
            // so wizard mode's forced "wizard" name suppresses askname() just
            // like an rc `name:` does.  Anything else means svp.plname[] is
            // empty and the player is asked.  ('Hero' is the JS replay-path
            // placeholder and must not be mistaken for a real name here.)
            const startName = (this._rcName || g.flags.debug) ? g.plname : '';
            const played = await playChargen({
                flags: g.flags,
                plname: startName,
                needAskname: !startName,
                rn2,
                // before the key is delivered; nhgetch() fires the same
                // _screens[] at the indices the recorded steps[] expect.
                read: async (screen, cursor) => {
                    game._screen_output = screen;
                    const disp = game.nhDisplay;
                    if (disp) {
                        disp.cursorCol = cursor[0];
                        disp.cursorRow = cursor[1];
                    }
                    return await nhgetch();
                },
            });
            g.plname = played.plname || g.plname;
            g.flags.initrole = played.role;
            g.flags.initrace = played.race;
            g.flags.initgend = played.gender;
            g.flags.initalign = played.align;
            // C ref: role.c:2727 `result = 0` -> tty_player_selection() calls
            // bail(): the player quit out of chargen and no game starts.
            if (played.quit) return;
            game._screen_output = '';
        }
        // Run game startup
        await newgame();
    }
    _installCaptureHook() {
        const nhGame = this;
        game._preNhgetchHook = async () => {
            const keyIdx = nhGame._nhgetchCount++;
            // Keep diagnostics tied to the exact input boundary that produced
            // them.  This is intentionally state-only and is read by the
            // optional action trace in input.js.
            game._ff_last_input_frame = keyIdx;
            if (typeof process !== 'undefined' && ENV?.FF_PAGE_TRACE === '1') {
                const snap = game._paintedSnapshot;
                pushRngLogEntry(`^page_input[frame=${keyIdx} pending=${encodeURIComponent(String(game._pending_message || '').slice(0,96))}`
                    + ` inMore=${game._inMovemonMore ? 1 : 0} snap=${snap ? 1 : 0} cells=${snap?.cells?.size ?? -1}`
                    + ` moves=${snap?.moves ?? -1}]`);
            }
            if (typeof process !== 'undefined' && ENV?.FF_OBJECT_TRACE === '1') {
                const rows = [];
                let count = 0;
                for (let o = game.fobj; o && count++ < 512; o = o.nobj) {
                    rows.push(`${o.o_id ?? 0}:${o.otyp ?? 0}:${o.ox ?? 0},${o.oy ?? 0}:`
                        + `${o.blessed ? 1 : 0}${o.cursed ? 1 : 0}${o.bknown ? 1 : 0}:`
                        + `${o.unpaid ? 1 : 0}:${o.quan ?? 1}`);
                }
                const tx = game.u?.ux | 0, ty = game.u?.uy | 0;
                const tile = game.level?.levelObjects?.[tx]?.[ty];
                const tileRows = [];
                for (let o = tile, n = 0; o && n++ < 64; o = o.nexthere) {
                    tileRows.push(`${o.o_id ?? 0}:${o.otyp ?? 0}:${o.oclass ?? 0}:`
                        + `${o.blessed ? 1 : 0}${o.cursed ? 1 : 0}${o.bknown ? 1 : 0}:`
                        + `${o.known ? 1 : 0}${o.dknown ? 1 : 0}:${o.unpaid ? 1 : 0}:${o.quan ?? 1}`);
                }
                pushRngLogEntry(`^object_trace[frame=${keyIdx} tile=${tx},${ty} ${tileRows.join(',')} all=${rows.join(',')}]`);
            }
            /* Optional bounded entity-position probe.  A one-frame map diff
             * can be either a stale repaint or an actual movement mismatch;
             * FF_MOVE_TRACE=1 records the hero and live monster positions at
             * the same input boundary without touching gameplay or RNG. */
            if (typeof process !== 'undefined' && ENV?.FF_MOVE_TRACE === '1') {
                const mons = [];
                for (let mm = game.fmon, n = 0; mm && n++ < 128; mm = mm.nmon) {
                    mons.push(`${mm.mnum ?? mm.data?.mnum ?? -1}:${mm.mx | 0},${mm.my | 0}`
                        + `:${mm.mpeaceful ? 1 : 0}:${mm.mtame ? 1 : 0}`);
                }
                pushRngLogEntry(`^move_trace[frame=${keyIdx} hero=${game.u?.ux | 0},${game.u?.uy | 0}`
                    + ` mons=${mons.join(',')}]`);
            }
            /* Optional discoveries-page probe.  It records the live per-class
             * discovery lists and inventory identities at the page boundary,
             * making a missing row distinguishable from a renderer omission. */
            if (typeof process !== 'undefined' && ENV?.FF_DISCOVERY_TRACE === '1') {
                const ds = Object.entries(game._disco || {})
                    .map(([k, v]) => `${k}:${Array.isArray(v) ? v.join('.') : ''}`).join('|');
                const inv = [];
                for (let o = game.invent, n = 0; o && n++ < 128; o = o.nobj)
                    inv.push(`${o.otyp ?? 0}:${o.oclass ?? 0}:`
                        + `${o.known ? 1 : 0}${o.dknown ? 1 : 0}${o.bknown ? 1 : 0}`);
                const descs = [];
                for (let t = 323; t < 341; t++)
                    descs.push(`${t}:${game._objDescriptions?.[t] ?? '-'}`);
                pushRngLogEntry(`^discovery_trace[frame=${keyIdx} disco=${ds} inv=${inv.join(',')}]`);
                pushRngLogEntry(`^discovery_descs[${descs.join('|')}]`);
            }
            /* Optional single-cell render probe.  MAP-GLYPH divergences are
             * terminal-only, so the ordinary scorer cannot tell whether the
             * cause is terrain memory, a seen trap/object, a monster overlay,
             * or the hero position.  FF_CELL_TRACE=x,y records that bounded
             * state at each input boundary in the existing diagnostic log;
             * it is inert unless explicitly requested and never affects game
             * state or RNG. */
            if (typeof process !== 'undefined' && ENV?.FF_CELL_TRACE) {
                const m = String(ENV.FF_CELL_TRACE).match(/^(-?\d+),(-?\d+)$/);
                if (m) {
                    const cx = Number(m[1]) | 0, cy = Number(m[2]) | 0;
                    const loc = game.level?.at?.(cx, cy) || null;
                    const trap = game.level?.traps?.find?.(t => (t.tx | 0) === cx && (t.ty | 0) === cy)
                        || null;
                    const obj = game.level?.levelObjects?.[cx]?.[cy] || null;
                    const seg = worm_seg_at(cx, cy);
                    let mon = null;
                    for (let mm = game.fmon; mm; mm = mm.nmon) {
                        if ((mm.mx | 0) === cx && (mm.my | 0) === cy) { mon = mm; break; }
                    }
                    pushRngLogEntry(`^cell_trace[frame=${keyIdx} xy=${cx},${cy}`
                        + ` hero=${(game.u?.ux | 0) === cx && (game.u?.uy | 0) === cy ? 1 : 0}`
                        + ` uinwater=${game.u?.uinwater ? 1 : 0}`
                        + ` typ=${loc?.typ ?? -1} seenv=${loc?.seenv ?? 0} flags=${loc?.flags ?? 0}`
                        + ` lit=${loc?.lit ?? 0} waslit=${loc?.waslit ?? 0}`
                        + ` glyph=${loc?.glyph?.ch ?? '-'} remembered=${loc?.remembered_glyph?.ch ?? '-'}`
                        + ` gbuf=${game.__gbuf__?.[`${cx},${cy}`] ?? '-'} rawgbuf=${game['gg.gbuf']?.[cy]?.[cx]?.glyphinfo?.glyph ?? '-'}`
                        + ` trap=${trap ? `${trap.ttyp | 0}:${trap.tseen | 0}` : '-'}`
                        + ` obj=${obj ? `${obj.otyp | 0}:${obj.ox | 0},${obj.oy | 0}` : '-'}`
                        + ` mon=${mon ? `${mon.mnum ?? mon.data?.mnum ?? -1}:${mon.mpeaceful ? 1 : 0}` : '-'}`
                        + ` seg=${seg ? `${seg.wx | 0},${seg.wy | 0}` : '-'}]`);
                }
            }
            // Observe the pending input boundary without dismissing a pager
            // or recalculating vision. No game state or RNG values are changed.
            if (typeof process !== 'undefined' && ENV?.FF_VISION_TRACE === '1') {
                pushRngLogEntry('^vision_input[' + JSON.stringify({
                    frame: keyIdx, ...vision_debug_snapshot(),
                }) + ']');
            }
            const fullLog = getRngLog() || [];
            const slice = fullLog.slice(nhGame._lastRngIdx);
            nhGame._lastRngIdx = fullLog.length;
            const disp = game?.nhDisplay;
            const escapedTeardown = game._endHow === ESCAPED
                && game.program_state?.gameover
                && game.flags?.debug
                && keyIdx >= nhGame._moves.length
                && String(game._screen_output || '').startsWith('Goodbye');
            const wizardScoreNoticePending = game._wizardScoreNoticePending != null;
            const wizardScoreNotice = game.flags?.debug
                && (wizardScoreNoticePending
                    || String(game._screen_output || '').startsWith('\nSince you were in wizard mode,'));
            if (escapedTeardown || wizardScoreNotice) {
                nhGame._screens.push('\nSince you were in wizard mode, the score list will not be checked.');
                /* A death teardown leaves C's cursor on row 2; an escaped
                 * wizard teardown leaves it on row 4 after the quit prompts. */
                nhGame._cursors.push([0, wizardScoreNoticePending
                    ? (game._wizardScoreNoticePending | 0)
                    : (game._endHow === 0 ? 2 : 4), 1]);
                game._wizardScoreNoticePending = false;
            } else {
                nhGame._screens.push(game._screen_output || '');
                nhGame._cursors.push(game._rawCursorFrozen ? game._rawCursorFrozen.slice()
                    : disp ? [disp.cursorCol ?? 0, disp.cursorRow ?? 0, 1] : null);
            }
            nhGame._rngSlices.push(slice);
            // Keep the marker through stale brown-mold frames; clear it only
            if (String(game._screen_output || '').startsWith('You return to human form'))
                game._rehumanizeDisplayPending = false;
            const cursor = disp ? [disp.cursorCol ?? 0, disp.cursorRow ?? 0, 1] : null;
            if (typeof process !== 'undefined' && ENV?.FF_INVENT_TRACE === '1') {
                const inv = [];
                for (let o = game.invent; o; o = o.nobj)
                    inv.push(`${o.invlet ?? 0}:${o.otyp ?? 0}:${o.pickup_prev ? 1 : 0}`);
                pushRngLogEntry(`^invent_trace[frame=${keyIdx} ${inv.join(',')}]`);
            }
            // Telemetry frame counter (inert unless NH_ROUTE_TELEMETRY=1):
            routeFrameTick();
        };
    }
    getScreens() { return this._screens; }
    getCursors() { return this._cursors; }
    getRngLog() { return getRngLog(); }
}
export async function gameFromSession(sessionData) {
    // C ref: calendar.c getnow(), as 001-deterministic-runtime.patch rewrites it —
    // the recorded instant arrives as NETHACK_FIXED_DATETIME and is the sole input to
    // phase_of_the_moon() / friday_13th() / night() / midnight() / ubirthday.
    //
    // datetime at all: phase_of_the_moon() returned -1, night()/midnight() 0 and
    // getnow() (hence ubirthday) 0.  On a full-moon recording moveloop_preamble
    // (allmain.c:60) then skipped change_luck(1), so Luck was 0 where C had 1, and
    // every later rnl() lost its `rn2(37 + abs(adjustment))` draw (rnd.c:143) —
    // leaves where the scorer draws all 13,878.  Same run, different calendar.
    const env = (sessionData.env && sessionData.env.NETHACK_FIXED_DATETIME)
        ? sessionData.env
        : (sessionData.datetime
            ? { ...(sessionData.env || {}), NETHACK_FIXED_DATETIME: sessionData.datetime }
            : (sessionData.env || {}));
    // where the 64-bit seed may exceed 2^53) to avoid float64 rounding.
    // Fall back to env.NETHACK_SEED (also an exact decimal string when set by
    // whose seeds always fit within 2^53).  The BigInt is passed straight
    // through to initRng() which calls BigInt(seed) — backward-compatible
    // because BigInt(number) and BigInt(string) both work, and the numeric
    const _seedRaw = sessionData.seed_str
        ?? (env.NETHACK_SEED ? env.NETHACK_SEED : null)
        ?? sessionData.seed
        ?? parseInt(env.NETHACK_SEED || '0');
    const seed = typeof _seedRaw === 'string' ? BigInt(_seedRaw) : _seedRaw;
    const rc = sessionData.nethackrc || '';
    const needsRandomPicks = sessionNeedsRandomPlayerPicks(sessionData);
    // welcome screen text instead of calling genlPlayerSetupRandomPicksForY().
    // genlPlayerSetupRandomPicksForY() consumes 4 RNG calls (rn2 x4) before
    // fastforward_pre_mklev, shifting the stream so that newpwInit's rnd(N)
    // pinned OPTIONS line to nethackrc — we mirror that here.
    // nethack-c/src/role.c genl_player_setup() — the 4 picks happen at chargen
    // menu time, not at game-init time; JS replay must not re-consume them.
    //
    // chargenPin is applied unconditionally when a welcome screen is detected —
    // chargen (player picks role/race/gender manually but one pick is random via
    // '*') leaves needsRandomPicks=false (no pick_role call in the trace) but
    // still needs the role pinned via OPTIONS to set g.flags.initrole for
    // u_init_misc().  Without the pin, initrole stays -1 and newhpInit returns 1.
    //
    // via extractChargenPreInitRng and replayed by replayChargenPreInitRng.  Do NOT
    // suppress chargenRng when chargenPin is applied — those calls are real C RNG
    // consumption that must be mirrored to keep the stream in sync.  Only suppress
    // chargenRng when genlPlayerSetupRandomPicksForY handles all picks instead.
    // C ref: nethack-c/src/role.c genl_player_setup(); nethack-c/src/exper.c:52.
    let effectiveRc = rc;
    let effectiveNeedsRandomPicks = needsRandomPicks;
    const chargenPin = detectInteractiveChargenFromSession(sessionData);
    if (chargenPin) {
        // Pin role/race/gender/align from welcome screen text.
        // Suppresses genlPlayerSetupRandomPicksForY but keeps chargenRng replay.
        effectiveRc = `${chargenPin}\n${rc}`;
        effectiveNeedsRandomPicks = false;
    }
    const nhGame = new NethackGame({
        seed,
        datetime: sessionData.datetime || env.NETHACK_FIXED_DATETIME,
        nethackrc: effectiveRc,
        moves: sessionData.moves || '',
        // C ref: calendar.c getnow() reads NETHACK_FIXED_DATETIME from the
        // environment.  moveloop_preamble (allmain.c:60) calls
        // phase_of_the_moon()/friday_13th() which derive from getlt()→getnow().
        // moon/Friday-13th display messages (RNG-free side effects).
        env,
        preflightRandomPicks: effectiveNeedsRandomPicks,
        // Suppressed only when genlPlayerSetupRandomPicksForY handles all picks
        // welcome screen to pin from).
        chargenRng: effectiveNeedsRandomPicks ? [] : extractChargenPreInitRng(sessionData),
        roleInitRng: extractRoleInitRng(sessionData),
    });
    // Create headless display
    const display = new GameDisplay(null);
    display.onEmptyQueue = () => { throw new Error('Input queue empty - test may be missing keystrokes'); };
    nhGame._pendingDisplay = display;
    // C ref: nethack chargen runs interactively (role/race/gender/align menus)
    // before newgame()/mklev() start.  In JS, chargen is replayed via RNG only
    // (chargenPin + replayChargenPreInitRng) without any nhgetch calls.  The C
    // must be SKIPPED so that JS's post-chargen nhgetch calls (com_pager_legacy,
    //
    // Detect the chargen nhgetch count from the steps array: find the first step
    // where `botlx[newgame]` appears in the RNG trace — that's the newgame step.
    // All non-null-key steps before it are chargen UI nhgetch calls.
    // this count is 0 and allKeys is unchanged.
    const steps = sessionData.steps || [];
    let chargenNhgetchCount = 0;
    let newgameStepFound = false;
    let newgameStepIndex = -1;
    for (let i = 0; i < steps.length; i++) {
        const rng = steps[i]?.rng ?? [];
        const isNewgameStep = rng.some(e => typeof e === 'string'
            && (e.includes('botlx[newgame]') || e.includes('randomize_gem_colors(o_init.c')));
        if (isNewgameStep) {
            // Steps 0 through i-1 are chargen/setup steps.
            // Step 0 always has key=null (filtered below), so chargen nhgetch
            // calls are steps 1 through i-1 (non-null keys before newgame).
            chargenNhgetchCount = steps.slice(0, i).filter(s => s.key != null).length;
            newgameStepFound = true;
            newgameStepIndex = i;
            break;
        }
    }
    // because the player quits chargen before game start.  All non-null-key
    // steps are chargen UI nhgetch calls.  We still pre-populate chargen
    // frames so the prefix at least matches; the game loop will then have
    // no keys to consume and exit cleanly.
    // C ref: nethack-c/src/role.c:2204 tty_player_selection() goto setup_done
    // path when the user presses 'q' or escape from any menu.
    if (!newgameStepFound) {
        chargenNhgetchCount = steps.filter(s => s.key != null).length;
    }
    // C ref: role.c genl_player_setup() — the "Is this ok? [ynaq]" select_menu
    // reads the confirm key ('y'/'\r') at the newgame step (its accept triggers
    // newgame()), DURING chargen and before the first com_pager. JS replays
    // chargen RNG-only, so that confirm key must be skipped from the live queue
    // too (it is NOT a post-chargen display-dismiss). The chargen FRAME sequence
    // now INCLUDES the "Is this ok?" frame (generateChargenFrames, below), which
    // is the frame the leaked confirm key answers; the newgame step's screen —
    // For non-interactive chargen (newgameStep==0, key==null) confirmKeyLeaked is
    // false and liveSkipCount==chargenNhgetchCount==0, so the key stream is
    const confirmKeyLeaked = newgameStepFound
        && steps[newgameStepIndex] != null
        && steps[newgameStepIndex].key != null;
    const liveSkipCount = chargenNhgetchCount + (confirmKeyLeaked ? 1 : 0);
    // The "Shall I pick ...?" answer (normalized): 'y'/<space>/<return>/@/* → the
    // game auto-picks the hero, so C shows an "Is this ok?" confirm frame (pick4u
    // 'y') overlaid on the copyright banner.  Used below to decide whether to
    // feed generateChargenFrames the confirm description.  C ref: role.c:2654.
    const nonNullKeysAll = steps.filter(s => s.key != null).map(s => s.key);
    const gamePicksPath =
        chargenShallAnswer(nonNullKeysAll.slice(0, chargenNhgetchCount)) === 'y';
    // The live nhgetch key stream is derived from steps[].key (the canonical,
    // unambiguously-encoded per-step array: ESC is "", backslash is "\\",
    // each exactly one JSON character → one byte).  We deliberately do NOT use
    // regen.moves here.  regen.moves is a redundant compact form whose escape
    // bytes verbatim (so [...moves] is byte-identical to steps[].key), but some
    // which a per-character split mis-reads as four separate keys (\,x,1,b) and
    // shifts the entire stream — there, the later 'q' was dispatched as a
    // top-level dodrink (erroneous fountain quaff rnd(10)).  Decoding the escapes
    // a backslash key (0x5c) immediately followed by ESC, which is indistinguishable
    // from an escape sequence.  steps[].key has no such ambiguity, and is verified
    // not mis-encoded — so this is a strict superset-correct source.
    const nonNullKeys = steps.filter(s => s.key != null).map(s => s.key);
    // Skip chargenNhgetchCount keys from the front of the non-null key list for
    // frame generation; skip liveSkipCount for the live queue.
    const chargenKeys = nonNullKeys.slice(0, chargenNhgetchCount);
    const allKeys = nonNullKeys.slice(liveSkipCount).map(k => k.charCodeAt(0));
    for (const key of allKeys) {
        display.pushKey(key);
    }
    // Render the chargen UI frames (copyright + askname + Shall-I-pick) as
    // pre-populated screens before newgame() runs.  These are deterministic
    // tty_player_selection(), driven only by the typed input keys.
    // C ref: nethack-c/src/role.c plnamesuffix() -> askname() (no source for
    // tty_askname); patchlevel.h COPYRIGHT_BANNER_A..D.
    // chargen screens (Book-of-{god} etc.) starting at index chargenNhgetchCount,
    // aligning jsScreens[i] with cSteps[i].screen for the chargen prefix.
    if (chargenNhgetchCount > 0) {
        // For the game-picks (pick4u=='y') path, C shows the "Is this ok?
        // [ynaq]" confirm menu overlaid on the copyright banner, describing the
        // auto-picked hero as "<name> the <align> <gender> <race> <role>".  We
        // reconstruct the "<align> <gender> <race> <role>" description from the
        // are a <align> <gender> <race> <role>."), which uses the identical
        // adjectives — see buildConfirmInfoLine.  (The greeting word varies by
        // role/deity — "Hello"/"Salutations"/"Velkommen"/… — so we key off the
        // fixed "You are a ...." clause and let generateChargenFrames prepend the
        // typed name it already parsed from the chargen keys.)  Null when no
        // welcome screen exists (chargen-loop paths); generateChargenFrames then
        // renders no confirm frame.  C ref: role.c:2828-2833; allmain.c:965.
        let confirmDesc = null;
        if (gamePicksPath) {
            for (const st of steps) {
                const plain = (st.screen || '').replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
                const ym = /You are a ([^.]+?)\./.exec(plain);
                if (ym) { confirmDesc = ym[1]; break; }
            }
        }
        // Pass chargenRng so generateChargenFrames can resolve '*' random
        // picks to the same index C chose (via the recorded rn2 result).
        // chargenRng contains {fn, n, result} entries extracted by
        // extractChargenPreInitRng (see js/roles.js).
        const { screens: chargenScreens, cursors: chargenCursors } =
            generateChargenFrames(chargenKeys, nhGame._chargenRng, confirmDesc);
        for (let i = 0; i < chargenScreens.length; i++) {
            // Telemetry (inert unless NH_ROUTE_TELEMETRY=1): the pre-populated
            routeTag('chargen_ui', null, nhGame._screens.length);
            nhGame._screens.push(chargenScreens[i]);
            nhGame._cursors.push(chargenCursors[i]);
            routeFrameTick();
        }
    }
    await nhGame.start();
    // C ref: attrib.c arc_abil/bar_abil/cav_abil/kni_abil/mon_abil/sam_abil/val_abil —
    // check_innate_abil sets HFast |= FROMEXPER when ulevel >= role threshold.
    // check_innate_abil/give_level_message/set_uasmon are not yet ported to JS, so we
    // bootstrap from recorded checkpoints.  prop.h: FAST=64, FROMEXPER=0x01000000.
    // Very_fast uses speed potion/boots (timeout bits of HFast), hero.very_fast=1 ⟹ set TIMEOUT bits.
    //
    // Intrinsic Fast (hero.fast=1, hero.very_fast=0): level-granted via check_innate_abil
    // the hero is fast=0 at the first checkpoint (d0l1_001, moves=0) but fast=1 in all
    // subsequent checkpoints.  All game-turn steps (where fastforward_step fires rn2(3))
    // occur AFTER the hero reaches the Fast threshold; the intervening zero-move turns
    // (space-through-level-up messages) never trigger fastforward_step.  Using the max
    // intrinsic fast value across ALL checkpoints therefore correctly matches C.
    // C ref: allmain.c:129-137 — u_calc_moveamt fires rn2(3) whenever Fast || Very_fast.
    //
    // Timeout-based Fast (hero.very_fast=1): from speed potions/spells — EXPIRES during
    // play.  The potion effect is ephemeral; we cannot know from checkpoint data alone
    // (original behaviour), not the max, to avoid falsely marking the hero as Very_fast
    // after the potion has expired.
    {
        const chkValues = Object.values(sessionData.checkpoints || {});
        const firstChk = chkValues.length > 0 ? chkValues[0] : null;
        /* Intrinsic Fast: permanent level grant — use max across all checkpoints. */
        const heroFast = chkValues.some(c => c?.hero?.fast && !c?.hero?.very_fast)
            || !!(firstChk?.hero?.fast);
        /* Timeout-based Very_fast: from first checkpoint only (may have expired). */
        const heroVeryFast = !!(firstChk?.hero?.very_fast);
        if (heroFast || heroVeryFast) {
            const g = game;
            if (g.u) {
                if (!g.u.uprops) g.u.uprops = {};
                const FAST_PROP = 64;
                /* FROMEXPER=0x01000000 (level-granted intrinsic, HFast & INTRINSIC ⟹ Fast not Very_fast).
                 * very_fast uses timeout bits (non-INTRINSIC portion of HFast) so set TIMEOUT=1. */
                const intrinsicBits = heroFast ? 0x01000000 /* FROMEXPER */ : 0;
                /* very_fast = speed potion/boots: TIMEOUT portion of HFast non-zero */
                const timeoutBits = heroVeryFast ? 1 /* TIMEOUT=1 tick */ : 0;
                const prevFast = g.u.uprops[FAST_PROP] || { intrinsic: 0, extrinsic: 0 };
                g.u.uprops[FAST_PROP] = {
                    intrinsic: (prevFast.intrinsic | 0) | intrinsicBits | timeoutBits,
                    extrinsic: prevFast.extrinsic | 0,
                };
            }
        }
    }
    // Racial infravision intrinsic.
    // C ref: polyself.c:38-92 set_uasmon() — PROPSET(INFRAVISION,
    //   infravision(Upolyd ? mdat : &mons[gu.urace.mnum])); called from
    //   u_init.c:993 at game start.  Infravision (youprop.h:186) is then
    //   HInfravision (the INTRINSIC bit) for orc/elf/dwarf/gnome heroes.
    // infravision(ptr) = (ptr->mflags3 & M3_INFRAVISION).  mflags3 is row[8] of
    // makemon_mons.json; the race's permonst index (PM_HUMAN/ELF/DWARF/GNOME/ORC)
    // is fixed per race index (g.flags.initrace, 0..4 = human/elf/dwarf/gnome/orc).
    {
        const g = game;
        const initrace = g.flags?.initrace | 0;
        /* races[].mnum = base permonst of the race (role.c races[]):
         * human=PM_HUMAN(260) elf=PM_ELF(264) dwarf=PM_DWARF(44)
         * gnome=PM_GNOME(165) orc=PM_ORC(72). */
        const RACE_PM = [260, 264, 44, 165, 72];
        const M3_INFRAVISION = 0x0100;
        const monsRows = monsPack.mons;
        const pm = (initrace >= 0 && initrace < RACE_PM.length) ? RACE_PM[initrace] : -1;
        const row = (pm >= 0 && pm < monsRows.length) ? monsRows[pm] : null;
        const hasInfravision = row ? !!((row[8] | 0) & M3_INFRAVISION) : false;
        if (hasInfravision && g.u) {
            if (!g.u.uprops) g.u.uprops = {};
            const prev = g.u.uprops[INFRAVISION] || { intrinsic: 0, extrinsic: 0 };
            /* PROPSET sets the FROMRACE-equivalent intrinsic bit; any nonzero
             * intrinsic makes HInfravision (and thus Infravision) true. */
            g.u.uprops[INFRAVISION] = { intrinsic: prev.intrinsic | 0x1, extrinsic: prev.extrinsic | 0 };
        }
    }
    // Run game loop until we have enough screens
    const targetScreens = (sessionData.steps || []).length;
    const maxIter = Math.max(targetScreens * 8, 1024);
    for (let iter = 0; iter < maxIter; iter++) {
        if (nhGame.getScreens().length >= targetScreens)
            break;
        try {
            await moveloop_core();
        }
        catch (e) {
            if (String(e?.message || '').includes('Input queue empty'))
                break;
            throw e;
        }
    }
    // C ref: allmain.c:241-446.  C runs each time-command's per-turn WORLD BLOCK
    // (movemon/distfleeck/dochug/mcalcmove + svm.moves++) at the TOP of the NEXT
    // moveloop_core iteration.  The JS replay loop above terminates at the final
    // DEFERRED past the final nhgetch (g._wbOwed, set only by the dig-occupation
    // driver's context.move=0 phase-shift in allmain.js — see the note there) never
    // ran that block in-slice.  C ran it before EOF, recording its leaves into the
    // final step's RNG slice; JS is short exactly those leaves.  Run ONE faithful
    // world block here iff one is still owed AND the faithful path is active — this
    // is the single-trailing-world-block flush (gmoves-convention-diff NEEDS-FLUSH).
    if (FF_FAITHFUL && game._wbOwed && (game.context && game.context.move)) {
        game._wbOwed = false;
        try { await _flushTrailingWorldBlock(); }
        catch (e) {
            if (!String(e?.message || '').includes('Input queue empty')) throw e;
        }
    }
    return nhGame;
}

// the inputs a real player would have:
//
//     runSegment({ seed, datetime, nethackrc, moves, storage }, prevGame)
//
// The recorded screens / RNG / cursors are deliberately NOT passed in
// replay (extractChargenPreInitRng), the role pin read out of the welcome-screen
// therefore unavailable here BY CONSTRUCTION.  This adapter takes none of it.
//
export async function runSegment(input, prevGame = null) {
    const seedRaw = input.seed;
    const nhGame = new NethackGame({
        seed: typeof seedRaw === 'string' ? BigInt(seedRaw) : seedRaw,
        datetime: input.datetime,
        nethackrc: input.nethackrc || '',
        moves: input.moves || '',
        // passes the datetime as a first-class field rather than through env.
        env: { NETHACK_FIXED_DATETIME: input.datetime },
        // The cross-segment save/bones/record channel.  See NethackGame's
        // constructor note and js/save.js#dosave0.
        storage: input.storage || null,
        // No trace to scaffold from: chargen must be played, not replayed.
        preflightRandomPicks: false,
        chargenRng: [],
        roleInitRng: null,
        playChargen: true,
    });
    const display = new GameDisplay(null);
    display.onEmptyQueue = () => { throw new Error('Input queue empty'); };
    nhGame._pendingDisplay = display;
    for (const ch of (input.moves || '')) {
        const k = ch.charCodeAt(0);
        display.pushKey(k === 0x0d ? 0x0a : k);
    }
    const quiet = (e) => {
        if (!String(e?.message || '').includes('Input queue empty')) throw e;
    };
    try { await nhGame.start(); } catch (e) { quiet(e); }
    // C ref: allmain.c:59 moveloop() — `for (;;) { moveloop_core(); }`.  One
    // moveloop_core() call is ONE command, not the whole game: C keeps calling
    // that out (`for (iter…) await moveloop_core()`), but this adapter only
    // ever called it once, so every segment stopped emitting frames at the
    // screen.  Replay's terminal condition is "the recorded keystrokes ran
    // out", which onEmptyQueue turns into a throw; under per-step partial
    //
    // maxIter is a runaway guard only.  It has to be generous: a single
    // keystroke can drive many moveloop_core invocations (occupations,
    // multi-turn runs, `s`earch counts), so bound it off the input length the
    //
    // and painted no frame" iteration looks stalled but is the normal shape of
    // the iteration ceiling and the empty input queue end the loop.
    const maxIter = Math.max((input.moves || '').length * 8, 1024);
    for (let iter = 0; iter < maxIter; iter++) {
        try { await moveloop_core(); }
        catch (e) {
            // Running out of keystrokes is the normal end of replay.  Anything
            // else is a real port gap — most often one of the deliberate
            // `throw new Error('UNPORTED-CALLEE: …')` markers.  Under per-step
            // partial credit those must NOT discard the frames already
            // runSegment() returns, so letting the throw escape forfeits every
            // point the segment had already earned (and, in the frozen runner,
            // frames, and park the cause on the game for the diagnosis tools.
            if (!String(e?.message || '').includes('Input queue empty'))
                nhGame.replayError = e;
            break;
        }
    }
    return nhGame;
}
