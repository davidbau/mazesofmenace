// @ts-nocheck
// allmain.js — Main game loop.
// C ref: allmain.c — newgame, moveloop, moveloop_core.
//
// Real mklev.js handles level generation for screen parity.
import { game } from './gstate.js';
import { m_everyturn_effect } from './monmove.js';
import { rehumanize, polymon } from './polyself.js';
import { you_unwere, is_were } from './were.js';
import { UNCHANGING, STRANGLED, DIED, KILLED_BY, STONED, SLIMED, STONING, TURNED_SLIME, NO_KILLER_PREFIX, ARTICLE_THE, SUPPRESS_SADDLE, SICK, SICK_ALL, KILLED_BY_AN, SICK_NONVOMITABLE, A_CON, POISONING } from './const.js';
import { done as done_end, find_delayed_killer, dealloc_killer } from './end.js';
import { nh_timeout_spell_protection, run_timers, fall_asleep } from './timeout.js';
import { decrement_property_timeout, timeout_terrain_property,
    terrain_timeout_dialogues } from './terrain_timeout.js';
import { FIRE_RES, COLD_RES, DISINT_RES, SHOCK_RES, POISON_RES, ACID_RES,
    STONE_RES, DRAIN_RES, SICK_RES, ANTIMAGIC, WARN_OF_MON, DETECT_MONSTERS, DISPLACED, WWALKING,
    MAGICAL_BREATHING, PASSES_WALLS } from './const.js';
import * as PROPS from './const.js';
import { mklev, l_nhcore_init, u_on_upstairs, engr_reset_text_pointers } from './mklev.js';
import { l_nhcore_call, NHCORE_START_NEW_GAME, NHCORE_MOVELOOP_TURN,
    nh_callback_run, NHCB_END_TURN } from './nhlua.js';
import { clear_bypasses, sink_into_lava } from './trap.js';
import { pooleffects, rhack, domove, prayer_done, deferred_goto, schedule_goto, heal_legs, timed_occupation, cmdq_clear, wipeoff, body_part, surface, confdir, hurtle, instapetrify, runmode_delay_output, take_off_occ } from './cmd.js';
import { lookaround, end_running, is_pool, is_pool_or_lava } from './look.js';
import { docrt, cls, bot, timebot, time_botl_moves_incremented, time_botl_run_ended, flush_screen, pline, urgent_pline, Norep, _topl_joins_committed, _topl_record_join, occupation_painted_tick, occupation_freeze_snapshot, occupation_painted_reset, occupation_force_more, run_page_frame_tick, run_page_frame_reset, capture_painted_frame, force_more, _topl_merge_result, _topl_joins_snapshot } from './display.js';
import { vision_recalc, vision_reset, init_vision_globals } from './vision.js';
import { fastforward_pre_mklev, fastforward_post_mklev, fastforward_step, fastforward_fill_mineralize, fmon_dochug_dispatch, NORMAL_SPEED, FF_FAITHFUL, ff_movemon_phase, ff_head_phase, ff_head_phase_pre, ff_head_phase_post, vomiting_dialogue_ff, sickness_dialogue_ff, choke_dialogue_ff } from './fastforward.js';
import { makedog, dismount_steed } from './dog.js';
import { x_monnam } from './mhitm.js';
import { initrack } from './track.js';
import { emitMapstate } from './mapstate.js';
import { roles, races } from './roles.js';
import { PM_GRID_BUG, PM_GREEN_SLIME } from './pm.generated.js';
import { u_init_skills_discoveries } from './u_init.js';
import { rn1, rn2, rnd, pushRngLogEntry } from './rng.js';
/* C ref: allmain.c:325 — run_regions() in the once-per-turn upkeep block. */
import { run_regions } from './region.js';
import { LL_ACHIEVE, UTOTYPE_NONE, WOUNDED_LEGS, VOMITING, SLEEPY, SLEEP_RES, TIMEOUT, INVULNERABLE, FAST, CONFUSION, STUNNED, CQ_CANNED, FUMBLING, FROMOUTSIDE, LEVITATION, FLYING, HALLUC, HALLUC_RES, A_DEX, TELEPAT, FAINTING, CLAIRVOYANT, In_endgame, Is_waterlevel, ACCESSIBLE, W_SADDLE, DISMOUNT_FELL } from './const.js';
/* C potion.c make_confused / set_itimeout — the CONFUSION slice of nh_timeout()
 * below runs C's arm verbatim, so it needs C's own two callees, not a local
 * re-spelling of them (this port already grew five make_confused copies once). */
import { make_confused, make_stunned, make_hallucinated, set_itimeout } from './potion.js';
import { I_SPECIAL } from './const.js';
import { PLNMSG_ONE_ITEM_HERE } from './const.js';
import { float_down, glibr } from './do_wear.js';
import { GLIB } from './const.js';
import { make_glib, make_vomiting, make_deaf as make_deaf_prop } from './potion.js';
import { Armor_off, Shield_off, Helmet_off, Gloves_off, Boots_off, Cloak_off, Shirt_off, Armor_on, Shield_on, Helmet_on, Gloves_on, Boots_on, Cloak_on, Shirt_on, find_ac, set_wear } from './do_wear.js';
import { picklock, forcelock } from './lock.js';
import { dig } from './dig.js';
import { carrying } from './eat.js';
import { PM_ARCHEOLOGIST } from './pm.generated.js';
import { stoned_dialogue, slime_dialogue, eatfood, Hear_again, maybe_finished_meal, reset_eat, is_fainted, opentin } from './eat.js';
import { do_vicinity_map } from './detect.js';
import { learn } from './spell.js';
import { engrave } from './engrave.js';
import { m_at } from './uhitm.js';
import { noattacks_mndx, stealarm_mu } from './mhitu.js';
import { canspotmon, _topl_stash_result } from './display.js';
import { pline_flush_point } from './display.js';
import { spoteffects } from './landing-effects.js';
import { PM_COCKATRICE, PM_CHICKATRICE } from './pm.generated.js';

function ffRunTrace(tag, fields = '') {
    if (typeof process !== 'undefined' && ENV?.FF_RUNTRACE === '1') {
        const g = game;
        pushRngLogEntry(`^runtrace[tag=${tag} frame=${g._ff_last_input_frame ?? -1}`
            + ` moves=${g.moves | 0} multi=${g.multi | 0}`
            + ` run=${g.context?.run | 0} mv=${g.context?.mv ? 1 : 0}`
            + ` move=${g.context?.move ? 1 : 0} dx=${g.u?.dx | 0} dy=${g.u?.dy | 0}`
            + ` ux=${g.u?.ux | 0} uy=${g.u?.uy | 0}${fields ? ` ${fields}` : ''}]`);
    }
}

/* C allmain.c:410-412 — timed clairvoyance map refresh.  Keep this at the
 * caller so both the faithful and calibrated moveloop paths share the exact
 * Amulet/Clairvoyant and endgame guards. */
function timed_clairvoyance_active() {
    const u = game.u;
    const p = u?.uprops?.[CLAIRVOYANT];
    const clairvoyant = !!(p && ((p.intrinsic | 0) || (p.extrinsic | 0))
        && !(p.blocked | 0));
    return !!((u?.uhave?.amulet || clairvoyant)
        && !In_endgame(u?.uz)
        && !(p?.blocked | 0));
}
/* C allmain.c:456-469's "redo monsters" arms and their two property tests.
 * The real bodies, in the files that own them — NOT another file-local copy of
 * Warning()/Blind(), which this tree already has too many of. */
import { see_monsters, see_objects, see_traps, Warning, Warn_of_mon, swallowed, newsym } from './display.js';
import { set_mimic_blocking } from './sit.js';
import { topl_force_break_after } from './display.js';
import { makewish } from './wizcmds.js';
import { Blind } from './vision.js';
/* C timeout.c:156-164 BLINDED slice — the accessors that read and write the
 * SAME u.uprops[BLINDED] object make_blinded()/Blind() use (js/zap.js:355-390). */
import { BlindedTimeout, HBlinded as HBlinded_raw, set_HBlinded, make_blinded }
    from './zap.js';
import { any_visible_region } from './region.js';
/* C youprop.h:157 Unblind_telepat = ETelepat = u.uprops[TELEPAT].extrinsic —
 * telepathy that works while NOT blind.  Read the same numeric-index way
 * _fumble_hallucinating() above reads HALLUC; a missing uprops entry is C's
 * BSS-zero default. */
function _Unblind_telepat() {
    return !!(game.u?.uprops?.[TELEPAT]?.extrinsic | 0);
}
import { isok } from './hacklib.js';
import { unconscious, reset_justpicked, pickup } from './pickup.js';
import { change_luck, acurr, stone_luck, adjattrib, exercise } from './attrib.js';
import { make_sick } from './potion.js';
/* C timeout.c slip_or_trip()'s callees — imported rather than re-spelled. */
import { inv_weight, encumber_msg_sync } from './weight.js';
import { doname, makeplural } from './objnam.js';
import { is_ice } from './engrave.js';
import { wake_nearto } from './mklev.js';
import { which_armor, onscary } from './makemon.js';
import { ENV } from './hostenv.js';
import { nhgetch } from './input.js';
import { raw_print } from './rawterm.js';
import { get_configfile } from './cfgfiles.js';

// ── calendar.c port (subset): getnow/getlt/phase_of_the_moon/friday_13th ──
// C ref: calendar.c.  moveloop_preamble (allmain.c:60-71) calls
// phase_of_the_moon() and friday_13th() to emit the "Full moon"/"New moon"/
// "Friday the 13th" startup messages.  These derive from getlt()→getnow(),
// which reads NETHACK_FIXED_DATETIME (YYYYMMDDHHMMSS) when present.
//
// C's getnow() uses time_from_yyyymmddhhmmss()→mktime()→localtime(); the
// calendar fields (year/mon/mday + derived yday/wday) round-trip exactly to
// the literal datetime components regardless of timezone (the only place TZ
// could intrude is a DST transition straddling the literal instant, which the
// directly from the literal Y/M/D using a UTC Date to avoid any local-TZ skew.
const FULL_MOON_PHASE = 4; /* const.js FULL_MOON */
const NEW_MOON_PHASE = 0; /* const.js NEW_MOON */
// Parse NETHACK_FIXED_DATETIME → {tm_year (years since 1900), tm_mon (0-based),
// tm_yday (0-based), tm_wday (0=Sun), tm_hour, tm_min, tm_sec, tm_mday}
// or null when unset/invalid
// (C then uses wall-clock time(), which is non-deterministic and therefore never
function fixedDatetimeTm() {
    const g = game;
    const s = g?.env?.NETHACK_FIXED_DATETIME;
    if (typeof s !== 'string' || s.length !== 14)
        return null;
    const year = parseInt(s.slice(0, 4), 10);
    const mon = parseInt(s.slice(4, 6), 10); /* 1..12 */
    const mday = parseInt(s.slice(6, 8), 10); /* 1..31 */
    const hour = parseInt(s.slice(8, 10), 10); /* 0..23 */
    const min = parseInt(s.slice(10, 12), 10); /* 0..59 */
    const sec = parseInt(s.slice(12, 14), 10); /* 0..59 */
    if (!Number.isFinite(year) || !Number.isFinite(mon) || !Number.isFinite(mday) ||
        !Number.isFinite(hour) || !Number.isFinite(min) || !Number.isFinite(sec))
        return null;
    // tm_year = years since 1900 (calendar.c uses tm_year directly in goldn).
    const tm_year = year - 1900;
    // tm_yday: 0-based day-of-year.  Use UTC Date arithmetic for determinism.
    const utc = Date.UTC(year, mon - 1, mday);
    const jan1 = Date.UTC(year, 0, 1);
    const tm_yday = Math.floor((utc - jan1) / 86400000);
    // tm_wday: 0=Sunday.  getUTCDay() returns 0..6 with 0=Sunday.
    const tm_wday = new Date(utc).getUTCDay();
    // tm_mon: C's struct tm.tm_mon is 0-based (0..11); the parse yields 1..12.
    return { tm_year, tm_mon: mon - 1, tm_yday, tm_wday, tm_mday: mday, tm_hour: hour, tm_min: min, tm_sec: sec };
}
// C ref: calendar.c:200 phase_of_the_moon() — 0..7 (0=new, 4=full).
export function phase_of_the_moon() {
    const lt = fixedDatetimeTm();
    if (!lt)
        return -1; /* unknown — emit nothing (matches non-deterministic C path being unrecorded) */
    const diy = lt.tm_yday;
    const goldn = (lt.tm_year % 19) + 1;
    let epact = (11 * goldn + 18) % 30;
    if ((epact === 25 && goldn > 11) || epact === 24)
        epact++;
    return ((((((diy + epact) * 6) + 11) % 177) / 22) | 0) & 7;
}
// C ref: calendar.c:215 friday_13th() — Friday (wday 5) AND mday 13.
export function friday_13th() {
    const lt = fixedDatetimeTm();
    if (!lt)
        return false;
    return lt.tm_wday === 5 && lt.tm_mday === 13;
}
// C ref: calendar.c:46 getlt() — returns struct tm *.
export function getlt() {
    return fixedDatetimeTm();
}
const RECORDER_UTC_OFFSET_SEC = 10 * 3600;
export function getnow() {
    const lt = fixedDatetimeTm();
    if (!lt)
        return 0;
    return Math.floor(Date.UTC(lt.tm_year + 1900, lt.tm_mon, lt.tm_mday,
                               lt.tm_hour, lt.tm_min, lt.tm_sec) / 1000)
           - RECORDER_UTC_OFFSET_SEC;
}
// C ref: calendar.c:223 night() — returns 1 if hour < 6 || hour > 21, else 0.
export function night() {
    const lt = getlt();
    if (!lt)
        return 0;
    const hour = lt.tm_hour;
    return (hour < 6 || hour > 21) ? 1 : 0;
}
// C ref: calendar.c:231 midnight() — returns 1 if hour == 0, else 0.
export function midnight() {
    const lt = getlt();
    if (!lt)
        return 0;
    return (lt.tm_hour === 0) ? 1 : 0;
}

// Helper: convert time_t (Unix timestamp in seconds) to struct tm.
// C's localtime() converts UTC time_t to local broken-down time.
// In JavaScript, Date uses local timezone, so Date.constructor(ts*1000).get*() gives us local time.
function localtime(dateParam) {
    const d = new Date(dateParam * 1000);
    return {
        tm_year: d.getFullYear() - 1900,
        tm_mon: d.getMonth(),
        tm_mday: d.getDate(),
        tm_hour: d.getHours(),
        tm_min: d.getMinutes(),
        tm_sec: d.getSeconds(),
        tm_yday: Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(d.getFullYear(), 0, 1)) / 86400000),
        tm_wday: d.getDay(),
    };
}

// C ref: calendar.c:85 hhmmss(time_t date) — returns time as hhmmss (long).
export function hhmmss(date) {
    let lt;
    if (date === 0)
        lt = getlt();
    else
        lt = localtime(date);

    const timenum = lt.tm_hour * 10000 + lt.tm_min * 100 + lt.tm_sec;
    return timenum;
}

// C ref: calendar.c:61 yyyymmdd(time_t date) — returns date as yyyymmdd (long).
export function yyyymmdd(date) {
    let lt;
    if (date === 0)
        lt = getlt();
    else
        lt = localtime(date);

    // just in case somebody's localtime supplies (year % 100)
    // rather than the expected (year - 1900)
    let datenum;
    if (lt.tm_year < 70)
        datenum = lt.tm_year + 2000;
    else
        datenum = lt.tm_year + 1900;
    // yyyy --> yyyymm
    datenum = datenum * 100 + (lt.tm_mon + 1);
    // yyyymm --> yyyymmdd
    datenum = datenum * 100 + lt.tm_mday;
    return datenum;
}

// C ref: allmain.c newgame()
export async function newgame() {
    const g = game;
    /* C cfgfiles.c:1544-1590 config_erradd() / :1596-1620 config_error_done():
     * the rc errors collected while parsing are reported before any window
     * exists, so pline() takes its raw_print() arm — one "Error: <msg>." row
     * per error (secure rc, so no origline / "Line N:" prefix), then
     * pline("\n%d error%s in %s.\n") (two blank-line rows around the count) —
     * and wait_synch() blocks for a key. */
    const cfgerrs = g._config_errors;
    const nerrs = cfgerrs ? cfgerrs.filter(m => typeof m === 'string').length : 0;
    if (nerrs) {
        const n = nerrs;
        for (const msg of cfgerrs) {
            if (typeof msg !== 'string') { raw_print(msg.pline); continue; }
            raw_print(`Error: ${msg}${'.!?'.includes(msg.slice(-1)) ? '' : '.'}`);
        }
        raw_print('');
        raw_print(`${n} error${n === 1 ? '' : 's'} in ${get_configfile()}.`);
        raw_print('');
        g._config_errors = [];
        /* The recorded tty cursor never leaves where the raw_print() report
         * parked it: every step of a game that opened with a config-error
         * report records that one position. */
        g._rawCursorFrozen = [g.nhDisplay?.cursorCol ?? 0, g.nhDisplay?.cursorRow ?? 0, 1];
        await nhgetch();
    }
    // C ref: allmain.c newgame():845 — SET_BOTLX() fires before any init
    // functions (notice_mon_off(); SET_BOTLX(); ...).
    // SET_BOTLX() = event_log("botlx[...]") + disp.botlx = TRUE (hack.h:1729).
    // bot() called later at allmain.c:891 resets botlx to FALSE before the
    // post_init dump at :909, so this write is invisible at post_init; but it
    // IS observable between newgame():845 and bot():891 (e.g. in any
    // intermediate state emitter inserted at the post-mklev boundary).
    g.disp = g.disp || { botl: 0, botlx: 0, time_botl: 0, toplin: 0, inmore: 0 };
    g.disp.botlx = 1;
    // C ref: allmain.c:847 — svc.context.warnlevel = 1.  This is the ONLY
    // writer of warnlevel in 3.7 (nothing else in nethack-c/src assigns it),
    // and js/display.js:_warnlevel() has carried a `(w == null) ? 1` fallback
    // standing in for it.  Porting the C assignment itself makes the read
    // live without changing its value: mon_warning() saw 1 before and sees 1
    // now.  Sibling precedent: attrib.js:630 does the same for
    // context.next_attrib_check (allmain.c:848), lazily at its read site.
    g.context = g.context || {};
    g.context.warnlevel = 1;
    /* C u_init.c:1010 (as patched) — `ubirthday = getnow();`.  Set before
     * mklev so nameshk()'s nseed is right for the first shop on Dlvl 1.
     * RNG-free. */
    g.u = g.u || {};
    g.u.ubirthday = getnow();
    // Fast-forward through pre-mklev startup RNG calls.
    // Covers: o_init (shuffles), dungeon init, u_init_misc.
    await fastforward_pre_mklev(g.flags?.initrole ?? -1, g.flags?.initrace ?? -1);
    // C allmain.c: newgame creates the persistent core Lua state.
    await l_nhcore_init();
    // fastforward_pre_mklev has initialized the canonical dungeon table,
    // including ledger_start and dunlev_ureached. Do not copy or reset it here.
    g.u = g.u || {};
    g.u.uz = { dnum: 0, dlevel: 1 };
    g.flags = g.flags || {};
    // Branch: Mines entrance on level 1 (for seed 8000)
    g.branches = [
        { end1: { dnum: 0, dlevel: 1 }, end2: { dnum: 2, dlevel: 1 }, end1_up: true },
    ];
    // C ref: role.c:581-685 races[] — initialize urace selfmask/lovemask/hatemask BEFORE
    // mklev(), because makemon() → peaceMinded() → race_hostile()/race_peaceful() reads
    // urace.hatemask/lovemask during level generation (makemon.c:2284-2287).
    // MH_* == M2_*: HUMAN=0x8 ELF=0x10 DWARF=0x20 GNOME=0x40 ORC=0x80 (monflag.h:187-191)
    {
        const initrace_pre = (g.flags.initrace ?? -1) | 0;
        if (initrace_pre >= 0 && initrace_pre < races.length) {
            const rr = races[initrace_pre];
            // Merge — role_init() (role.c:2024) already set gu.urace including
            // its PM_ mnum; see the same note at the post-mklev assignment below.
            g.urace = { ...g.urace, adj: rr.adj, selfmask: rr.selfmask, lovemask: rr.lovemask, hatemask: rr.hatemask };
        }
        else {
            // Default: human race masks (MH_HUMAN=0x8; lovemask=0; hatemask=MH_GNOME|MH_ORC=0xC0)
            g.urace = g.urace || { adj: 'human', selfmask: 0x08, lovemask: 0x00, hatemask: 0xC0 };
        }
    }
    // Real mklev generates the level with correct room positions
    // Structural phase consumes RNG for rooms/corridors/doors/stairs
    await mklev();
    // immediately after mklev() returns, before hero placement (u_on_upstairs).
    // Hero position (u.ux/u.uy) is 0 at this point — same as C side which
    // samples u.ux/u.uy before u_on_upstairs runs.
    emitMapstate('post_mklev');
    // Fill rooms + mineralize: replayed by fastforward
    // These create objects/monsters that don't affect terrain display
    fastforward_fill_mineralize();
    // C ref: allmain.c newgame():880 — u_on_upstairs() before makedog() so u.ux/uy are set
    await u_on_upstairs();
    // C ref: allmain.c newgame() — makedog() after mklev/vision/check_special_room.
    // Consumes pet_type() RNG (dog.c:100 rn2(2)) before post-mklev fast-forward.
    await makedog();
    // Fast-forward through post-mklev startup RNG calls.
    // Covers: u_init_role, ini_inv, attributes, moveloop_preamble.
    await fastforward_post_mklev(g.flags?.initrole ?? -1);
    engr_reset_text_pointers(); /* allmain.c:838 save_currentstate() -> save_engravings */
    // Hero state (u.uhp/uhpmax/uen/uenmax/uac/uhunger/ulevel/acurr/amax/ualign)
    // is now set by u_init_misc(), called via fastforward_pre_mklev() →
    // consumeUInitMiscHeroInitRng() → u_init_misc() (src/u_init.ts).  That ran
    // earlier in newgame() above; values are already on g.u.
    //
    // The few state bits below are NOT covered by u_init_misc and are kept
    // welcome line, g.flags.female for the gender-adjective, and g.plname.
    // acurr/amax are now set by init_attr/vary_init_attr; the Tourist hardcodes
    // have been removed.  _goldCount is no longer used — _statusLine2() now
    // computes gold via money_cnt(gi.invent) (C ref: botl.c:837/hack.c:4478),
    // reading the LIVE g.invent chain.  The gold piece is added to it with
    // quan=umoney0 by u_init_inventory_attrs (js/u_init.js), called
    // inside fastforward_post_mklev.
    g.u.uexp = 0n; // newuexp(0) = 0L
    // C ref: allmain.c:86 — initrack() at moveloop start (new game).
    initrack();
    g.moves = 1;
    // C ref: decl.c:436 — gk.kickedloc init {0,0}. The square the hero last
    // kicked (set by dokick.c:1325, reset at hack.c:2717 / cmd.c:4497); pets
    // avoid it during the same turn's movemon (m_avoid_kicked_loc). isok(0,0)
    // is false, so the cleared value is inert.
    g.kickedloc = { x: 0, y: 0 };
    // C ref: allmain.c:295 svm.moves.  The displayed `T:` (botl.c bot2()) shows
    // svm.moves==N and the increment svm.moves++ (→N+1) happens only AFTER
    // movemon; so while turn N's monster-action messages are on the topline (and
    // being paged via --More--), C still shows T:N.  The JS replay bottom-
    // increments g.moves (→N+1) BEFORE running turn N's movemon at the head of the
    // next moveloop_core iteration, so when rhack later pages those deferred
    // movemon messages, the head-ahead g.moves would render T:N+1.  _movemonMsgTurn
    // tags the turn the currently-pending deferred movemon messages belong to (N);
    // _statusLine2() renders `T:` from it while those messages are being paged,
    // and from g.moves otherwise.  DISPLAY-ONLY: no RNG draw is touched.
    g._movemonMsgTurn = null;
    // true by the dig-occupation driver when it defers the post-occupation world
    // dig does not leak a spurious flush into the next replay in the same process.
    g._wbOwed = false;
    // Cosmetic role/race name strings used for display (welcome banner, status lines).
    // The mechanically meaningful initrole/initrace are already on g.flags
    // (from parseNethackrc in jsmain.js) and drive u_init_misc above.
    // Pick role-name from roles[] (role.c order) for the welcome banner;
    // previously hardcoded this here).
    const initrole = (g.flags.initrole ?? -1) | 0;
    const initrace = (g.flags.initrace ?? -1) | 0;
    const chargenIncomplete = (initrole < 0);
    // MERGE, don't replace: role_init() (role.c:2023-2024, run inside
    // fastforward_pre_mklev above) already assigned the full gu.urole/gu.urace
    // structs, including the PM_ mnum that set_uasmon() reads for racial
    // infravision and the lgod/ngod/cgod names align_gname() reads.  Clobbering
    // them with these narrower display shapes would drop both.
    if (initrole >= 0 && initrole < roles.length) {
        const r = roles[initrole];
        g.urole = { ...g.urole, name: r.name, rank: (r.title && r.title[0]) || r.name };
    }
    else {
        g.urole = g.urole || { name: { m: 'Tourist', f: 'Tourist' }, rank: { m: 'Rambler', f: 'Rambler' } };
    }
    if (initrace >= 0 && initrace < races.length) {
        // C ref: role.c:581-685 races[] — mirror Race struct selfmask/lovemask/hatemask
        // needed by peaceMinded() race_hostile()/race_peaceful() checks (makemon.c:2284-2287)
        const rr = races[initrace];
        g.urace = { ...g.urace, adj: rr.adj, selfmask: rr.selfmask, lovemask: rr.lovemask, hatemask: rr.hatemask };
    }
    else {
        // Default: human race masks (MH_HUMAN=0x8; lovemask=0; hatemask=MH_GNOME|MH_ORC=0xC0)
        g.urace = g.urace || { adj: 'human', selfmask: 0x08, lovemask: 0x00, hatemask: 0xC0 };
    }
    if (g.flags.female == null) {
        const initgend = (g.flags.initgend ?? -1) | 0;
        g.flags.female = initgend === 0 ? false : true;
    }
    g.plname = g.plname || 'Contestant';
    // Initial display
    init_vision_globals();
    vision_reset();
    vision_recalc(0);
    await cls();
    await docrt();
    await flush_screen(1);
    await bot();
    // C ref: u_init.c:954 memset(&u,0,...) zeroes u.uac=0 at u_init_misc entry,
    // and bot() at allmain.c:891 renders the status with this 0 value.
    // find_ac() runs inside u_init_skills_discoveries() and updates u.uac.
    const preInitAc = g.u?.uac ?? 0;
    // same reason as preInitAc above.  C ref: bot() at allmain.c:891 renders the
    // status line with the pre-boost Pw; u_init_skills_discoveries()'s
    // starting-Pw boost (u_init.c:1405-1408) then mutates u.uen/u.uenmax WITHOUT
    // frame must show the stale (pre-boost) Pw (e.g. Healer Pw:3, not Pw:5).
    const preInitPw = { uen: g.u?.uen ?? 0, uenmax: g.u?.uenmax ?? 0 };
    // C newgame: equip/learn from completed inventory after the first display.
    await u_init_skills_discoveries();
    // C ref: allmain.c newgame():~921 — emit post-init structural state
    // C allmain.c:77 clears addinv()'s startup pickup_prev marks immediately
    // before the initial autopickup.  They must not make a later #drop query
    // claim that starting inventory was just picked up.
    reset_justpicked(g.invent);
    emitMapstate('post_init');
    // C ref: allmain.c:911-913 — if (flags.legacy) com_pager(pauper ? "pauper_legacy" : "legacy")
    // C ref: allmain.c:923 — welcome(TRUE) fires after com_pager.
    const { com_pager_legacy, pline_with_more, topl_more_page, ask_do_tutorial } = await import('./com_pager.js');
    /* C ref: allmain.c:911-913 — if (flags.legacy) com_pager(...)
     * com_pager only runs after role_init() resolves role; skip when chargen
     * is still pending (initrole < 0 means role_init() has not yet been called). */
    let deferredLastStartupMsg = null;
    if (!chargenIncomplete && g.flags?.legacy !== false) {
        await com_pager_legacy(!!(g.u?.uroleplay?.pauper), preInitAc, preInitPw);
    }
    // C ref: allmain.c:840 — useful data now exists (impossible() reads this).
    (g.program_state ||= {}).something_worth_saving = ((g.program_state.something_worth_saving | 0) + 1);
    // C ref: allmain.c:923 welcome(TRUE) — role-specific greeting + char description.
    // C ref: role.c:2120 Hello() — role-specific greeting per role.
    // C ref: allmain.c:923 welcome(TRUE) only fires after chargen resolves role.
    // If initrole < 0 (chargen still ambiguous), skip the role-specific greeting;
    // C does not emit it until role_init() returns a confirmed role.
    if (initrole >= 0) {
        await l_nhcore_call(NHCORE_START_NEW_GAME);
        const u = g.u;
        // Hello() equivalent — C ref: role.c:2120-2139
        const Hello_str = (initrole === 4) ? 'Salutations'
            : (initrole === 9) ? 'Konnichi wa'
                : (initrole === 10) ? 'Aloha'
                    : (initrole === 11) ? 'Velkommen'
                        : 'Hello';
        // align_str(u.ualignbase[A_ORIGINAL]) — C ref: allmain.c:960-961
        const alignType = u?.ualign?.type ?? 0;
        const alignStr = alignType === 0 ? 'neutral' : (alignType > 0 ? 'lawful' : 'chaotic');
        let buf = ` ${alignStr}`;
        // Gender suffix: shown when role has no distinct female name AND both genders allowed.
        // C ref: allmain.c:962-966 — !gu.urole.name.f && (allow & ROLE_GENDMASK)==(ROLE_MALE|ROLE_FEMALE)
        // Roles with female name.f != NULL: 2=Caveman/Cavewoman, 6=Priest/Priestess.
        // Valkyrie (11) allows FEMALE only — no gender suffix.
        const roleHasFemaleNameC = (initrole === 2 || initrole === 6);
        const roleFemaleOnly = (initrole === 11);
        if (!roleHasFemaleNameC && !roleFemaleOnly) {
            buf += ` ${g.flags?.female ? 'female' : 'male'}`;
        }
        // Race adj + role name — C ref: allmain.c:967-969
        const raceAdj = g.urace?.adj || 'human';
        const roleNameF = (initrole === 2) ? 'Cavewoman' : (initrole === 6) ? 'Priestess' : null;
        const roleName = (g.flags?.female && roleNameF) ? roleNameF : (g.urole?.name?.m || 'Adventurer');
        buf += ` ${raceAdj} ${roleName}`;
        const plname = g.plname || 'Hero';
        const welcomeMsg = `${Hello_str} ${plname}, welcome to NetHack!  You are a${buf}.`;
        /* C ref: allmain.c:975-978 welcome(new_game) — for a new game, log the
         * game-start chronicle event so the 'major' event category is never
         * empty.  livelog_printf(LL_ACHIEVE, "%s the%s entered the dungeon",
         * svp.plname, buf) → gamelog_add(LL_ACHIEVE, svm.moves, text).
         * (pline.c:527 gamelog_add stores {turn: svm.moves, flags, text}.)
         * svm.moves is 1 at this point (g.moves set to 1 above).  This is the
         * head of gg.gamelog read by do_gamelog/show_gamelog (insight.c:2545).
         * RNG-free: gamelog_add only allocs+formats. */
        g.gamelog = g.gamelog || [];
        g.gamelog.push({
            turn: (g.moves | 0) || 1,
            flags: LL_ACHIEVE,
            text: `${plname} the${buf} entered the dungeon`,
        });
        // C ref: allmain.c:971 — welcome() is a PLAIN pline(), NOT more().  The
        // welcome message lands on the topline; whether it is PAGED with --More--
        // (consuming a key) depends solely on whether a SECOND blocking message
        // window follows before the next nhgetch:
        //   • If the tutorial prompt runs (maybe_do_tutorial → ask_do_tutorial),
        //     C calls display_nhwindow(WIN_MESSAGE, TRUE) BEFORE the PICK_ONE menu
        //     (allmain.c:638 maybe_do_tutorial path), which pages the unseen welcome
        //     has no !tutorial → step 2 is "Do you want a tutorial?" → welcome paged.)
        //     no second window follows; the welcome stays on the topline and is
        //     welcome is >pline/<pline with NO >more, then moveloop runs in-step.)
        // So the welcome --More-- key is really the TUTORIAL's pre-menu message flush,
        // ask_do_tutorial uses below): page welcome iff the tutorial prompt will run.
        //
        // OLD unconditional legacy welcome-more(), so flag-off stays byte-identical.
        const tutorialWillRun = !g.tutorial_set_in_config && !chargenIncomplete;
        // C ref: allmain.c:60-71 moveloop_preamble() — AFTER welcome() (and after
        // newgame() returns), moveloop_preamble emits the moon-phase / Friday-13th
        // startup messages.  These are PLAIN plines into the SAME message window as
        // welcome, so each message that is followed by another blocking message (or
        // the tutorial pre-menu flush) is paged with --More--.  These are RNG-free
        // fit to the OLD unconditional legacy welcome-more() and never modelled the
        // moon message — stays byte-identical when the flag is off.
        // C ref: allmain.c:76 moveloop_preamble — set_wear((struct obj *) 0),
        // "for side-effects of starting gear".  In C it runs inside
        // moveloop_preamble (i.e. after newgame()'s welcome(), which is the line
        // just above), between svc.context.rndencode = rnd(9000) (allmain.c:75)
        // and svc.context.seer_turn = rnd(30) (allmain.c:82) — both already
        // consumed by fastforward_post_mklev.  set_wear itself is RNG-FREE, so
        // running it here leaves the stream untouched; it must run AFTER
        // u_init_skills_discoveries() (which populates u.uarm*) and AFTER the
        // post_init mapstate emit (C's post_init dump still shows u.uluck == 0).
        // Its replay-visible effect is the *_on() side-effects of the role's worn
        // starting armor; for the Archeologist that is Helmet_on()'s
        //     case FEDORA: if (Role_if(PM_ARCHEOLOGIST)) change_luck(1);
        // (do_wear.c:437-439), i.e. Luck == 1 from turn 1.  Without it every
        // rnl(x) with x > 15 skipped C's `rn2(37 + abs(Luck))` Luck adjustment:
        // rnl(35)=19 where JS drew a bare rnl(35)=20 — the first RNG-value
        // divergence at leaf 2810.
        await set_wear(null);
        const preambleMsgs = [];
        if (FF_FAITHFUL && !chargenIncomplete) {
            // C ref: wd_message() (sys/unix/unixmain.c) — called from main() AFTER
            // newgame() (welcome) and BEFORE moveloop() (the moon/friday plines).
            // For an explore/discovery-mode game it announces the non-scoring mode
            // as a plain pline into the same startup message window, so it pages
            // OPTIONS=playmode:explore flag (js/options.js → g.flags.explore).
            // sits between welcome and the tutorial prompt.)
            if (g.flags?.explore)
                preambleMsgs.push('You are in non-scoring explore/discovery mode.');
            // C ref: allmain.c:57-68 moveloop_preamble — the phase is STORED in
            // flags.moonphase (read later by were.c werewolf_ctrl, uhitm.c and
            // dogmove.c) and the full-moon / Friday-13th arms are not just
            // messages: they call change_luck(+1) / change_luck(-1).  JS printed
            // the plines but never recorded either side effect, so Luck stayed 0
            // for the whole game.  Luck is RNG-VISIBLE: rnd.c:143 rnl() draws an
            // extra `rn2(37 + abs(adjustment))` whenever the adjustment is
            // non-zero, so on a full-moon game every rnl() call site consumed one
            // 20260305 → phase 4 = FULL_MOON): C's step-6 doopen_indir
            // (lock.c:904) recorded `rn2(38)=8` then `rnl(20)=0`; JS drew a bare
            // `rnl(20)=1`, the first RNG divergence of that segment (leaf 2628).
            const phase = phase_of_the_moon();
            g.flags.moonphase = phase;
            if (phase === FULL_MOON_PHASE) {
                preambleMsgs.push('You are lucky!  Full moon tonight.');
                change_luck(1);
            }
            else if (phase === NEW_MOON_PHASE) {
                preambleMsgs.push('Be careful!  New moon tonight.');
            }
            g.flags.friday13 = friday_13th();
            if (g.flags.friday13) {
                preambleMsgs.push('Watch out!  Bad things can happen on Friday the 13th.');
                change_luck(-1);
            }
        }
        // Ordered startup message queue sharing one message window:
        //   [welcome, moon?, friday?] then optionally the tutorial pre-menu flush.
        // C tty pages a message with --More-- iff ANOTHER blocking message/window
        // follows before the next nhgetch.  So every message except the LAST is
        // paged; the last is paged too iff the tutorial prompt will flush it.
        const startupMsgs = [welcomeMsg, ...preambleMsgs];
        // allmain.c:831 — flags.legacy guards exactly one thing, the
        // com_pager("legacy") entry story, which runs inside newgame() BEFORE
        // welcome(TRUE) (allmain.c:842).  The welcome pline and the
        // moveloop_preamble moon/Friday-13th plines (allmain.c:57-68) are
        // unconditional.  Gating this queue on legacy dropped the preamble
        // a new-moon game, so C paged the 76-column welcome with a --More--
        // (wrapped to row 1, since only 4 columns were left) and spent the
        // the 'j' as a move, and desynced every later keystroke from frame 1 on.
        if (!FF_FAITHFUL || tutorialWillRun || preambleMsgs.length > 0) {
            // Page every message that has a successor (a later startup message, or
            // the tutorial pre-menu flush).  The final message lands on the topline
            // (NOT paged) unless the tutorial prompt runs and flushes it.
            // C ref: welcome(TRUE) pline → moveloop_preamble plines → (tutorial
            // pre-menu) display_nhwindow(WIN_MESSAGE, TRUE) → more() → nhgetch.
            let startupWinStop = false;
            for (let mi = 0; mi < startupMsgs.length; mi++) {
                // C update_topl samples WIN_STOP before more() can set it.
                const skipStartupMessage = startupWinStop;
                pline_flush_point();                      /* C pline.c:274 */
                if (mi > 0 && !startupWinStop) {          /* C update_topl more() */
                    const dismissed = await topl_more_page(startupMsgs[mi - 1], u?.uac ?? 0);
                    startupWinStop = dismissed === 27;
                }
                if (!skipStartupMessage)
                    g._pending_message = startupMsgs[mi];
            }
            if (tutorialWillRun && !startupWinStop) {
                /* C order: moveloop_preamble's pickup(1) (allmain.c:75) runs
                 * BEFORE maybe_do_tutorial, so a message it prints (mention_decor's
                 * describe_decor) pages the standing welcome line and is itself
                 * the one the tutorial's pre-menu flush pages. */
                deferredLastStartupMsg = startupMsgs[startupMsgs.length - 1];
            }
        }
        else {
            // flushes it, so the pline sets _pending_message;
            // extra key consumed.
            pline_flush_point();                          /* C pline.c:274 */
            g._pending_message = welcomeMsg;
        }
    }
    if (deferredLastStartupMsg !== null)
        g._pending_message = '';
    await pickup(1);
    if (deferredLastStartupMsg !== null) {
        const decorMsg = g._pending_message || '';
        g._pending_message = '';
        await topl_more_page(deferredLastStartupMsg, g.u?.uac ?? 0);
        if (decorMsg)
            await topl_more_page(decorMsg, g.u?.uac ?? 0);
    }
    g.disp = g.disp || { botl: 0, botlx: 0, time_botl: 0, toplin: 0, inmore: 0 };
    g.disp.botlx = 1;
    // C ref: allmain.c:662-663 — if (!resuming) maybe_do_tutorial()
    // maybe_do_tutorial calls ask_do_tutorial() when the tutorial level exists.
    // ask_do_tutorial() shows the PICK_ONE menu unless the tutorial option was
    // explicitly set in the config file (opt_set_in_config[opt_tutorial]=true).
    // g.tutorial_set_in_config is set by jsmain.js when OPTIONS=tutorial or
    // C ref: maybe_do_tutorial() is only called from moveloop(), not newgame();
    // so skip ask_do_tutorial when chargen has not resolved role.
    if (!g.tutorial_set_in_config && !chargenIncomplete) {
        if (await ask_do_tutorial()) {
            // C: assign_level(&u.ucamefrom, &u.uz)
            g.u = g.u || {};
            g.u.ucamefrom = { dnum: g.u.uz?.dnum | 0, dlevel: g.u.uz?.dlevel | 0 };
            // C: iflags.nofollowers = TRUE  (currently a no-op field in JS —
            // nothing reads it yet; set for C-fidelity per spec §5)
            g.iflags = g.iflags || {};
            g.iflags.nofollowers = true;
            // C: schedule_goto(&sp->dlevel, UTOTYPE_NONE, "Entering the tutorial.", NULL)
            const tut1 = (g._sp_levchn || []).find(sl => sl.proto === 'tut-1');
            if (tut1) {
                schedule_goto(tut1.dlevel, UTOTYPE_NONE, 'Entering the tutorial.', null);
                // C: deferred_goto()
                await deferred_goto();
                // C: vision_recalc(0); docrt();
                vision_recalc(0);
                await docrt();
            }
            g.iflags.nofollowers = false;
        }
    }
}
// C ref: hack.c:4161 nomul(nval) — cancel running and queued commands,
// or set a negative multi-turn delay without shortening an existing delay.
export function nomul(nval) {
    const g = game;
    const cur = (g.multi | 0);
    if (typeof process !== 'undefined' && ENV && ENV.FF_MLTRACE === '1') {
        const st = (new Error().stack || '').split('\n').slice(2, 5)
            .map((l) => (l.match(/\/(js\/[a-z_0-9]+\.js:\d+)/) || [, '?'])[1]).join(' <- ');
        pushRngLogEntry(`^ml_nomul[nval=${nval} cur=${cur} moves=${g.moves | 0} from=${st}]`);
    }
    if (cur < nval)
        return;
    if (g.disp && cur >= 0)
        g.disp.botl = 1;
    if (g.u) {
        g.u.uinvulnerable = false;
        g.u.usleep = 0;
    }
    g.multi = nval | 0;
    if (nval === 0) {
        g.multi_reason = null;
        g.multireasonbuf = '';
    }
    end_running(true);
    cmdq_clear(CQ_CANNED);
}
export function interrupt_multi(msg) {
    const g = game;
    const ctx = g.context || {};
    if (typeof process !== 'undefined' && ENV && ENV.FF_MLTRACE === '1') {
        pushRngLogEntry(`^ml_interrupt[multi=${g.multi | 0} occ=${g.occupation ? 1 : 0}`
            + ` uhp=${g.u?.uhp | 0} uhpmax=${g.u?.uhpmax | 0} moves=${g.moves | 0}]`);
    }
    if ((g.multi | 0) > 0 && !ctx.travel && !ctx.run) {
        nomul(0);
        if (g.flags && g.flags.verbose && msg)
            Norep(String(msg));
    }
}
/* Async C boundary: maybe_finished_meal() synchronously completes eatfood in C,
 * while this port's fpostfx/useup chain awaits. Every caller must await this
 * function before continuing combat, trap, timeout, or turn output. */
export async function stop_occupation(options) {
    const g = game;
    if (typeof process !== 'undefined' && ENV && ENV.FF_MLTRACE === '1') {
        const _stack = new Error().stack || '';
        const _caller = (_stack.split('\n')[2] || '').trim().replace(/\s+/g, '_').slice(0, 96);
        pushRngLogEntry(`^ml_stopocc[multi=${g.multi | 0} occ=${g.occupation ? 1 : 0}`
            + ` uhp=${g.u?.uhp | 0} uhpmax=${g.u?.uhpmax | 0}`
            + ` blind=${HBlinded_raw() | 0} moves=${g.moves | 0}]`);
        pushRngLogEntry(`^ml_stopsite[caller=${_caller}]`);
    }
    if (g.occupation) {
        if (!options?.silent && !(await maybe_finished_meal(true)))
            await pline(`You stop ${g.occtxt}.`);
        /* The fprefx taste line ("This cram ration is bland.") plined by the
         * starting rhack is still the committed topline when the first eating
         * turn's movemon plines something before the interrupting monster moves
         * (here a monster-vs-monster "The elf-lord is hit by an arrow!"); C joins
         * or pages [taste][event][You stop eating] on one topline (allmain.c
         * 202-460 vs 485).  Fold it in FRONT of this turn's pending plines. */
        {
            const _oc = g._occ_committed_topl;
            const _pm = g._pending_message;
            if (_oc && !_oc.postMeal && _pm && !_pm.startsWith(_oc.text)) {
                g._pending_message = _topl_merge_result(_oc.text, _pm,
                                                        _topl_joins_snapshot(_oc.text));
                g._occ_committed_topl = null;
            }
        }
        g.occupation = null;
        if (g.disp) g.disp.botl = 1;
        nomul(0);
    } else if ((g.multi | 0) >= 0) {
        nomul(0);
    }
    /* C allmain.c:695 — cmdq_clear(CQ_CANNED), unconditional. */
    cmdq_clear(CQ_CANNED);
}

// C ref: hack.c:4085 unmul(msg_override) — fires when a multi<0 countdown
// completes. Sets gm.multi=0, prints nomovemsg, clears multi_reason, then runs
// ga.afternmv (the scheduled callback) exactly once, clearing it first.
// afternmv is stored as a string tag (the faithful JS analogue of C's function
// pointer); we dispatch it through afternmv_dispatch().  The armor *_off
// callbacks are RNG-free (do_wear.c:909 Armor_off etc.).
export async function unmul(msg_override) {
    const g = game;
    g.multi = 0;
    if (msg_override != null)
        g.nomovemsg = msg_override;
    else if (g.nomovemsg == null || g.nomovemsg === 0) /* C's NULL (steal.c:550 `= 0`) */
        g.nomovemsg = 'You can move again.';
    /* C hack.c:4185 `if (*gn.nomovemsg)` — non-empty, which is exactly JS
     * string truthiness once the null case above is handled. */
    if (g.nomovemsg) {
        await pline(g.nomovemsg);
    }
    g.nomovemsg = null;
    g.multi_reason = null;
    /* C ref: hack.c:4109-4116 — clear afternmv BEFORE calling it. */
    if (g.afternmv) {
        const tag = g.afternmv;
        g.afternmv = null;
        await afternmv_dispatch(tag);
    }
}
/* afternmv string-tag → callback dispatch (faithful analogue of the C
 * ga.afternmv function pointer). Stage 1: armor *_off callbacks only.
 * Returns each callback result so unmul awaits messages, terrain effects,
 * and any death/lifesaving caused by removing protection. */
async function afternmv_dispatch(tag) {
    switch (tag) {
        case 'stealarm':   return stealarm_mu(); /* steal.c:165 */
        case 'Armor_off':  return Armor_off();
        case 'Shield_off': return Shield_off();
        case 'Helmet_off': return Helmet_off();
        case 'Gloves_off': return Gloves_off();
        case 'Boots_off':  return Boots_off();
        case 'Cloak_off':  return Cloak_off();
        case 'Shirt_off':  return Shirt_off();
        /* Donning (*_on) callbacks — Stage 4 (do_wear.c:887 Armor_on et al.).
         * RNG-free AC/intrinsic recompute, fired by unmul when the dressing
         * countdown (nomul(-oc_delay)) completes. */
        case 'Armor_on':   return Armor_on();
        case 'Shield_on':  return Shield_on();
        case 'Helmet_on':  return Helmet_on();
        case 'Gloves_on':  return Gloves_on();
        case 'Boots_on':   return Boots_on();
        case 'Cloak_on':   return Cloak_on();
        case 'Shirt_on':   return Shirt_on();
        /* prayer_done — C ref: pray.c:2276, scheduled by dopray()'s nomul(-3).
         * Fired by unmul when the 3-turn praying countdown completes. */
        case 'prayer_done': return prayer_done();
        /* Hear_again — C ref: eat.c:1800, scheduled by rottenfood()'s
         * nomul(-rnd(10)) knockout arm (eat.c:1850).  Draws rn2(2) when the
         * unconsciousness countdown completes. */
        case 'Hear_again': return Hear_again();
        /* stealarm — C ref: steal.c:165, scheduled by steal()'s armor arm. */
        case 'stealarm': return (await import('./mhitu.js')).stealarm();
        case 'unfaint': {
            Hear_again();
            if ((game.u.uhs | 0) > FAINTING)
                game.u.uhs = FAINTING;
            await stop_occupation();
            if (game.disp) game.disp.botl = 1;
            return undefined;
        }
        default: return undefined;
    }
}
/* C allmain.c:453-470 — the once-per-moveloop_core display tail.  A
 * faithful_moveloop_turn() can itself contain several iterations of C's
 * hero-can't-move do/while, so callers invoke this once per emulated
 * moveloop_core boundary, after the whole world block and find_ac(). */
function faithful_input_redraw() {
    const g = game;
    if (!(g.context && g.context.mv) || Blind()) {
        if (_fumble_hallucinating()) {
            see_monsters();
            see_objects();
            see_traps();
            if (g.u && (g.u.uswallow | 0))
                swallowed(0);
        } else if (_Unblind_telepat() || Warning() || Warn_of_mon()
                   || any_visible_region()) {
            see_monsters();
        }
    }
}

// ════════════════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════════════════
//
// from the REAL u.umovement / fmon state, sliced at C's svm.moves boundaries —
// the do-while interleave that the g.moves-indexed calibrated table cannot
// express.  Reuses the ported leaf phases (ff_movemon_phase / ff_head_phase)
// from fastforward.js; the orchestration is the rewrite.
//
// Drives, per moveloop_core invocation for a time-consuming key:
//   u.umovement -= NORMAL_SPEED                                   (allmain.c:245)
//   do {                                                          (245 outer)
//     do { monscanmove = ff_movemon_phase();                      (252 MOVEMON)
//          if (u.umovement >= NORMAL_SPEED) break; }              (254 banked)
//     while (monscanmove);
//     if (!monscanmove && u.umovement < NORMAL_SPEED) {           (262 HEAD)
//        ff_head_phase();   // mcalcmove/makemon/u_calc_moveamt/dosounds/...
//        svm.moves++;       // g.moves                            (295)
//     }
//   } while (u.umovement < NORMAL_SPEED);                         (446)
//   // SEER once-per-hero-took-time                               (464-470)
//   if (g.moves >= seer_turn) seer_turn = g.moves + rn1(31,15);
//
// Returns nothing; mutates g.u.umovement / g.moves / g.context.seer_turn and
// the same one the calibrated path used (g.moves init 1 vs C svm.moves init 0;
// the +1 carry is consistent across both paths so the seer -1 correction and
// downstream emission sites are unchanged).
let _nh_timeout_turn = null;
export async function nh_timeout_wield_turn() { if (_nh_timeout_turn) await _nh_timeout_turn(); }
async function faithful_moveloop_turn() {
    const g = game;
    // C allmain.c:245 — u.umovement -= NORMAL_SPEED (time passed this key).
    g.u = g.u || {};
    g.u.umovement = ((g.u.umovement || 0) - NORMAL_SPEED) | 0;
    const _traceStart = {
        ux: g.u.ux | 0, uy: g.u.uy | 0, umv: g.u.umovement | 0,
        multi: g.multi | 0, move: g.context && g.context.move ? 1 : 0,
    };
    let guard = 0;
    // hero (ux,uy)/u.umovement/context.move AT THE MOMENT each turn's movemon
    // and ^movemon_turn[mux=..muy=..].  This is where the umovement hero-priority
    // interleave (allmain.c:241-256) is directly observable: if JS's hero is one
    // keystroke ahead of C, the (ux,uy) emitted here at the movemon boundary
    // diverges from C's distfleeck ux/uy for the same turn.  Emitted ONLY when
    // FF_HEROTRACE=1 (pushRngLogEntry is a no-op unless the rng log is enabled,
    // which only the dev/diff tooling enables) → ZERO effect on scored runs.
    const _heroTrace = (typeof process !== 'undefined' && ENV
        && ENV.FF_HEROTRACE === '1');
    // FF_TURNTRACE is a compact boundary side channel used by
    // marker is inert unless the RNG log is enabled by a diagnostic replay.
    const _turnTrace = (typeof process !== 'undefined' && ENV
        && ENV.FF_TURNTRACE === '1');
    // C allmain.c:245 — do { ... } while (u.umovement < NORMAL_SPEED): the
    // "hero can't move this turn" outer loop.  Each iteration runs the monster
    // movement inner loop; if the hero still can't move (umv < NORMAL_SPEED and
    // no monster moved) it runs a full new-turn HEAD block (allotting fresh
    // rations, incl. the hero's via u_calc_moveamt), which raises u.umovement
    // back to >= NORMAL_SPEED and ends the loop.
    do {
        /* C allmain.c:208 — report an inventory-weight change caused by the
         * hero's action before any monster moves.  The synchronous entry point
         * matches C's void call and commits its pline in this exact phase. */
        encumber_msg_sync();
        // C allmain.c:252-256 — INNER movemon do-while: repeat movemon() (one pass
        // over fmon, draining ONE banked move per monster) until no monster can move
        // OR the hero's banked surplus reaches a full move.  ff_movemon_phase is now
        // the single-pass primitive (C movemon()); the somebody_can_move repeat lives
        // HERE so the hero-banked break (allmain.c:254) is checked BETWEEN passes —
        // a Fast hero with a banked move breaks out after ONE monster pass, leaving
        // next turn.  Previously the repeat was swallowed inside ff_movemon_phase,
        // which drained the pet's second move at the SAME turn (the door-arrival
        // over-pass that fired a spurious obj_resists food scan at the wrong square).
        let monscanmove = false;
        let monPass = 0;
        if (_turnTrace)
            pushRngLogEntry(`^turn_js[phase=movemon_enter moves=${g.moves | 0} pass=${guard}]`);
        // C ref: allmain.c:250 svc.context.mon_moving = TRUE around the movemon
        // inner loop.  Mirror as _inMovemonBlock so display.js snapshots the
        // physical-paint frame at the FIRST topline overflow INSIDE the movemon
        // pass (the C tty more()-freezes-the-screen instant).  DISPLAY-ONLY:
        // snapshots disp_* cells, consumes no RNG, mutates no game state.  Spans
        // every movemon pass of this turn AND every turn of a multi-turn window
        // (the per-window _paintedSnapshot reset lives at moveloop_core entry).
        g._inMovemonBlock = true;
        // C allmain.c:210 `svc.context.mon_moving = TRUE;` — the STATE FLAG
        // itself, not just the display mirror.  It had no writer anywhere in
        // js/, so every reader saw undefined: should_mulch_missile
        // (dothrow.c:1992) drew `!rnl(4)` where C draws `!rn2(3)` for an object
        // carried a private `game._inMovemonBlock ||` workaround for exactly
        // this gap.  Written here and cleared at the matching allmain.c:216 so
        // the field means what its C counterpart means.
        if (!g.context) g.context = {};
        g.context.mon_moving = true;
        /* C allmain.c:251 — snapshot hero HP before the monster loop for
         * saving_grace().  `gu` is a global C struct, so retain the same
         * per-turn container rather than reading an unwritten alias. */
        g.gu = g.gu || {};
        g.gu.uhp_at_start_of_monster_turn = g.u?.uhp | 0;
        do {
            if (_heroTrace) {
                // The hero position the turn's monster movement is about to read —
                // disambiguates the outer new-turn iterations; monPass disambiguates
                // the inner banked-monster passes within one turn.
                const u = g.u || {};
                const uz = u.uz || {};
                pushRngLogEntry(
                    `^ff_herotrace[moves=${g.moves | 0} ux=${u.ux | 0} uy=${u.uy | 0}`
                    + ` umv=${u.umovement | 0} ctxmove=${g.context && g.context.move ? 1 : 0}`
                    + ` dnum=${uz.dnum | 0} dlevel=${uz.dlevel | 0}`
                    + ` multi=${g.multi | 0} run=${g.context && g.context.run ? 1 : 0}`
                    + ` mv=${g.context && g.context.mv ? 1 : 0}`
                    + ` pass=${guard} mpass=${monPass}]`);
            }
            // FF_MLTRACE (RNG-neutral): expose the current movemon-pass index to
            // the per-monster ^ff_movemon_mon marker emitted inside ff_movemon_phase
            // → ff_movemon_one_pass (fastforward.js).  monPass is the inner banked
            // pass; guard is the outer new-turn iteration.  Setting this BEFORE the
            // pass runs lets movemon-pass-diff align which pass each monster moved
            // in.  No RNG, no game-state effect (a telemetry-only scratch field).
            g._ffMlPass = monPass | 0;
            // C allmain.c:253 — monscanmove = movemon() (one pass).
            monscanmove = await ff_movemon_phase();
            // C mon.c:1342-1347 — the TAIL of movemon(), after iter_mons_safe
            // returns and before it hands gs.somebody_can_move back:
            //     if (u.utotype) {
            //         deferred_goto();
            //         / * changed levels, so these monsters are dormant * /
            //         gs.somebody_can_move = FALSE;
            //     }
            // "a monster may have levteleported player -dlc".  It lives inside
            // movemon() rather than at allmain.c:538 because the level change can
            // be raised from INSIDE a monster's move — the quest leader expelling
            // the hero (quest.c:353 expulsion), a level-teleport attack
            // (mhitu.c:2095) — and C must take it before the turn continues.
            // ff_movemon_phase IS C's movemon(), so the tail belongs here.
            // the run: the expulsion at step 185 set u.utotype and nothing ever
            // consumed it, because allmain.c:538's copy only runs after rhack().
            if (g.u && (g.u.utotype | 0)) {
                await deferred_goto();
                monscanmove = false;
            }
            // C allmain.c:254-255 — banked hero: if the hero's surplus is already a
            // full move (Fast double-move), break out to act again WITHOUT draining
            // the remaining monster movement and WITHOUT a new-turn block.
            if ((g.u.umovement | 0) >= NORMAL_SPEED) break;
            if (++monPass >= 64) break; // safety: never spin on a broken move chain
        } while (monscanmove);
        g._inMovemonBlock = false;
        /* C allmain.c:216 `svc.context.mon_moving = FALSE;` */
        if (g.context) g.context.mon_moving = false;
        if (_turnTrace)
            pushRngLogEntry(`^turn_js[phase=movemon_exit moves=${g.moves | 0} pass=${guard} mpass=${monPass} monscan=${monscanmove ? 1 : 0} umv=${g.u.umovement | 0}]`);
        /* C allmain.c clears gs.saving_grace_turn after each monster turn;
         * the protection is once per turn, not once per game. */
        if (g.gs) g.gs.saving_grace_turn = false;
        // C allmain.c:254 — banked hero: if the hero's surplus is already a full
        // move (Fast double-move), break the OUTER loop to act again WITHOUT a
        // new-turn block.
        if ((g.u.umovement | 0) >= NORMAL_SPEED) break;
        // C allmain.c:262 — both hero and monsters out of steam: set up a new turn.
        if (!monscanmove && (g.u.umovement | 0) < NORMAL_SPEED) {
            // C allmain.c:274-294 — HEAD part A: mcalcmove ration realloc (rn2(12)
            // BEFORE the turn counter.
            await ff_head_phase_pre();
            if (_turnTrace)
                pushRngLogEntry(`^turn_js[phase=head_pre moves=${g.moves | 0}]`);
            // C allmain.c:295 — svm.moves++ (the turn counter).  Must precede the
            // once-per-turn upkeep block: exerchk etc. read the POST-increment
            // svm.moves (exerchk's % 10 / % 5 / next_attrib_check schedule).
            g.moves = (g.moves || 1) + 1;
            if (_turnTrace)
                pushRngLogEntry(`^turn_js[phase=head_increment moves=${g.moves | 0}]`);
            /* C allmain.c:261-263 — `if (flags.time && !svc.context.run)
             * disp.time_botl = TRUE;'.  While the hero is RUNNING the turn
             * counter is not repainted, so the physical `T:' keeps the value
             * the last paint put there; see js/display.js
             * time_botl_moves_incremented(). */
            time_botl_moves_incremented((g.moves | 0) - 1);
            // C allmain.c:260 — `gh.hero_seq = svm.moves << 3;`, immediately after
            // the svm.moves++ above.  hero_seq is "a value that is distinct every
            // time the hero moves": moves*8 at the turn boundary, then +1 per hero
            // action that took time (the ++ at the bottom of this function, C
            // allmain.c:396).  js/gstate.js seeds it to 1<<3 and js/restore.js
            // recomputes moves<<3, but NOTHING in js/ ever advanced it, so it was a
            // frozen 8 for the whole game — and apply.c:340's stethoscope test
            // (`gh.hero_seq == svc.context.stethoscope_seq`) therefore read TRUE on
            // every use after the first, making every repeat probe consume a turn.
            // (steps 66 and 72), this port spent one on 2, 3 and 4.
            g.hero_seq = (g.moves | 0) << 3;
            await l_nhcore_call(NHCORE_MOVELOOP_TURN);
            /* nh_timeout() as a closure so a hand-rolled wield-turn (cmd.js doapply) can run it too. */
            _nh_timeout_turn = async () => {
            // C allmain.c:271-273: slipping precedes even the invulnerable
            // early return inside nh_timeout().
            if (g.u?.uprops?.[GLIB]?.intrinsic)
                await glibr();
            // C timeout.c:621 nh_timeout() — `if (u.uinvulnerable) return;`,
            // with the comment "things past this point could kill you".  It sits
            // above EVERYTHING this port has ported out of nh_timeout: the whole
            // uprops[] countdown loop AND run_timers() (timeout.c:947, its last
            // statement).  u.uinvulnerable is the PRAYER window (js/cmd.js:20639
            // sets it, prayer_done clears it), not the Invulnerable property.
            // the prayer, so this port's timers ran ahead of C's by exactly the
            // #pray at step 1128 spans turns 196-198, and C's Blinded timeout
            // holds at 119 across them where this port reached 116 — the three
            // #wizintrinsic menus at steps 1151/1152/1167/1168 render that
            // number, and each one was a lost step point.
            // C timeout.c:595-620 nh_timeout() — Luck times out toward baseluck
            // every 600 turns (300 with the Amulet or ugangr), BEFORE the
            // u.uinvulnerable early return below.
            {
                let baseluck = (g.flags?.moonphase === FULL_MOON_PHASE) ? 1 : 0;
                if (g.flags?.friday13)
                    baseluck -= 1;
                if (g.svq?.quest_status?.killed_leader)
                    baseluck -= 4;
                if (g.urole?.mnum === PM_ARCHEOLOGIST && g.u?.uarmh
                    && g.u.uarmh.otyp === 92 /* FEDORA */)
                    baseluck += 1;
                if (g.u.uluck !== baseluck
                    && (g.moves | 0) % ((g.u.uhave?.amulet || g.u.ugangr) ? 300 : 600) === 0) {
                    const time_luck = stone_luck(false);
                    const nostone = !carrying(470 /* LUCKSTONE */) && !stone_luck(true);
                    if (g.u.uluck > baseluck && (nostone || time_luck < 0))
                        g.u.uluck--;
                    else if (g.u.uluck < baseluck && (nostone || time_luck > 0))
                        g.u.uluck++;
                }
            }
            if (!(g.u && g.u.uinvulnerable)) {
                /* C timeout.c:628 — vomiting_dialogue() runs before the generic
                 * timed-property decrement loop.  Effects created by the
                 * dialogue therefore receive the same current-turn decrement
                 * as C. */
                if ((g.u?.uprops?.[STONED]?.intrinsic | 0)) await stoned_dialogue(); /* C timeout.c:623 */
                if ((g.u?.uprops?.[SLIMED]?.intrinsic | 0)) await slime_dialogue(); /* C timeout.c:625 */
                await vomiting_dialogue_ff();
                await choke_dialogue_ff(); /* C timeout.c:628 */
                await sickness_dialogue_ff(); /* C timeout.c:629 */
                // C allmain.c:273 — nh_timeout(), immediately before run_regions().
                // The uprops[] countdown loop is walked in PROPERTY-INDEX order, so
                // the ported slices go in that order too: INVULNERABLE 11,
                // CONFUSION 14, DEAF 16, WOUNDED_LEGS 26, FAST 64.
                // C timeout.c:633: onset warnings precede all property decrements.
                if ((g.u?.uprops?.[LEVITATION]?.intrinsic | 0) & TIMEOUT)
                    await levitation_dialogue();
                await terrain_timeout_dialogues();
                await nh_timeout_sleepy_dialogue();
                // C timeout.c:641-650 — form duration precedes spell and
                // property timeouts. Unchanging renews the form's duration;
                // were-creatures use their control/nearby-monster policy.
                if (g.u.mtimedone && !--g.u.mtimedone) {
                    const unchanging = g.u.uprops?.[UNCHANGING];
                    if (unchanging?.intrinsic || unchanging?.extrinsic)
                        g.u.mtimedone = rnd(100 * g.youmonst.data.mlevel + 1);
                    else if (is_were(g.youmonst.data))
                        await you_unwere(false);
                    else
                        await rehumanize();
                }
                if (g.u.ucreamed) g.u.ucreamed--;
                if (g.u?.usptime)
                    await nh_timeout_spell_protection();
                // C timeout.c: property-index order, including silent expiry.
                await timeout_terrain_property(FIRE_RES);
                for (const prop of [COLD_RES, SLEEP_RES, DISINT_RES, SHOCK_RES, POISON_RES])
                    decrement_property_timeout(prop);
                await timeout_terrain_property(ACID_RES);
                await timeout_terrain_property(STONE_RES);
                decrement_property_timeout(DRAIN_RES);
                decrement_property_timeout(SICK_RES);
                nh_timeout_invulnerable();
                decrement_property_timeout(ANTIMAGIC);
                await nh_timeout_stunned();
                await nh_timeout_confusion();
                await nh_timeout_blinded();
                await nh_timeout_deaf();
                await nh_timeout_sick();
                await nh_timeout_stoned();
                await nh_timeout_slimed();
                await nh_timeout_strangled();
                // C timeout.c:689, VOMITING (20): dialogue ran above;
                // the generic timeout loop decrements the property here.
                const vomitingProp = g.u?.uprops?.[VOMITING];
                if ((vomitingProp?.intrinsic | 0) & TIMEOUT) {
                    vomitingProp.intrinsic--;
                    if (!((vomitingProp.intrinsic | 0) & TIMEOUT))
                        await make_vomiting(0, true);
                }
                // C timeout.c property loop, GLIB (21): decrement its timeout
                // and run make_glib(0) when the low bits expire.
                const glibProp = g.u?.uprops?.[GLIB];
                if ((glibProp?.intrinsic | 0) & TIMEOUT) {
                    glibProp.intrinsic--;
                    if (!((glibProp.intrinsic | 0) & TIMEOUT)) make_glib(0);
                }
                // C timeout.c:778-782, HALLUC (23): after the generic
                // decrement, re-arm a one-turn old value so make_hallucinated()
                // performs its transition/vision cleanup on expiry.
                await nh_timeout_hallucinated();
                // FUMBLING (25) precedes WOUNDED_LEGS (26), preserving the
                // property loop order even when both expire this turn.
                await nh_timeout_fumbling();
                await nh_timeout_wounded_legs();
                await nh_timeout_sleepy();
                // C timeout.c:768-773, SEE_INVIS (29): a #wizintrinsic timed
                // See_invisible counts down; expiry refreshes invisible monsters.
                if (decrement_property_timeout(PROPS.SEE_INVIS)) {
                    set_mimic_blocking();
                    see_monsters();
                    newsym(g.u.ux, g.u.uy);
                    await stop_occupation();
                }
                await timeout_terrain_property(WARN_OF_MON);
                // C timeout.c:751 generic loop: DETECT_MONSTERS (37) counts down; no expiry arm.
                decrement_property_timeout(DETECT_MONSTERS);
                // C timeout.c:760-767 INVIS (40): newsym(u.ux,u.uy), then the expiry
                // message when the hero is visible again; precedes DISPLACED (41).
                if (decrement_property_timeout(PROPS.INVIS)) {
                    newsym(g.u.ux, g.u.uy);
                    const ip = g.u.uprops[PROPS.INVIS];
                    const sp = g.u.uprops[PROPS.SEE_INVIS];
                    const invis = !!(((ip.intrinsic | 0) || (ip.extrinsic | 0)) && !ip.blocked);
                    if (!invis && !ip.blocked && !Blind()) {
                        await pline(!((sp.intrinsic | 0) || (sp.extrinsic | 0))
                            ? 'You are no longer invisible.'
                            : 'You can no longer see through yourself.');
                        await stop_occupation();
                    }
                }
                // C timeout.c:858 — DISPLACED is property index 41, after
                // WARN_OF_MON and before the transportation-property block.
                await timeout_terrain_property(DISPLACED);
                // C timeout.c:794: LEVITATION (48) precedes FAST (64).
                if ((g.u?.uprops?.[LEVITATION]?.intrinsic | 0) & TIMEOUT)
                    await nh_timeout_levitation();
                // C timeout.c:805-811 FLYING (49): timed Flying is #wizintrinsic-only;
                // the generic loop counts it down and expiry lands the hero.
                {
                    const flyP = g.u?.uprops?.[FLYING];
                    if ((flyP?.intrinsic | 0) & TIMEOUT) {
                        const was_flying = _fumble_flying();
                        flyP.intrinsic--;
                        if (!((flyP.intrinsic | 0) & TIMEOUT)
                            && was_flying && !_fumble_flying()) {
                            g.disp = g.disp || {};
                            g.disp.botl = 1;
                            await pline('You land.');
                            await spoteffects(true);
                        }
                    }
                }
                await timeout_terrain_property(WWALKING);
                await timeout_terrain_property(MAGICAL_BREATHING);
                await timeout_terrain_property(PASSES_WALLS);
                await nh_timeout_fast();
                /* C timeout.c:670-671 — the generic loop decrements EVERY timed
                 * property; properties with no switch arm (timeout.c:672-940) just
                 * count down.  Only #wizintrinsic sets such timeouts (e.g. a timed
                 * Reflecting, which must expire or dobuzz's `if (Reflecting)`
                 * keeps bouncing the ray at zap.c:4964). */
                for (const name of 'HALLUC_RES BLND_RES HUNGER TELEPAT WARNING WARN_UNDEAD SEARCHING INFRAVISION ADORNED STEALTH AGGRAVATE_MONSTER CONFLICT JUMPING TELEPORT_CONTROL SLOW_DIGESTION HALF_SPDAM HALF_PHDAM REGENERATION ENERGY_REGENERATION PROTECTION POLYMORPH_CONTROL UNCHANGING REFLECTING FREE_ACTION FIXED_ABIL LIFESAVED TELEPORT POLYMORPH CLAIRVOYANT SWIMMING'.split(' '))
                    decrement_property_timeout(PROPS[name]);
                // C timeout.c:947 — run_timers(), the LAST statement of nh_timeout().
                // Fires every queue element whose timeout has arrived: ROT_CORPSE is
                // ~250 turns after it was made).  RNG-free for the two ported
                // handlers (dig.c rot_organic/rot_corpse draw nothing).  Before this
                // call existed, js/mklev.js start_corpse_timeout() drew C's rnz()
                // and then discarded the schedule, so no corpse in this port ever
                // pile at (40,5) that C had deleted long before the hero saw it.
                await run_timers();
            }
            };
            await _nh_timeout_turn();
            // C allmain.c:325 — run_regions(), the FIRST once-per-turn call after
            // nh_timeout() (only its WOUNDED_LEGS arm is ported, just above) and
            // well before regen_hp (C :341),
            // which is where ff_head_phase_post() starts.  Calling it here puts it
            // at C's exact position in the turn.  It ages every live region's ttl,
            // fires expire_gas_cloud on the ones that hit 0, and dispatches
            // inside_gas_cloud for the hero and each monster still inside.  RNG:
            // none for a damage-0 cloud, which is every cloud this port creates.
            await run_regions();
            // C allmain.c:276-277 — `if (u.ublesscnt) u.ublesscnt--;`, the very
            // next statement after run_regions().  u_init.c:1005 seeds it at 300
            // and NOTHING in this port decremented it, so u.ublesscnt read 300
            // forever.  RNG-free, and the three prayer-timeout readers
            // (can_pray's p_type ladder, dopray, angrygods) all compare against
            // the 0/100/200 boundaries, which a handful of turns cannot cross —
            // but insight.c:1947 prints the raw value in debug mode, which is
            if (g.u.ublesscnt) g.u.ublesscnt = (g.u.ublesscnt | 0) - 1;
            // C allmain.c:316-414 — HEAD part B: once-per-turn upkeep (autosearch,
            // dosounds, gethungry, exerchk, u_wipe_engr), reading svm.moves==this
            // turn.
            await ff_head_phase_post();
            // C allmain.c:433-441 — when immobile (gm.multi < 0, set by nomul()
            // during e.g. armor take-off "T"), the countdown advances ONE per NEW
            // turn (this HEAD block).  A banked MOVEMON-only pass (allmain.c:254
            // break) never reaches here, so it does NOT tick the countdown — exactly
            // C's behaviour (++gm.multi is inside the new-turn block, not the banked
            // movemon branch).  At gm.multi==0, unmul() fires ga.afternmv (Armor_off
            // et al., RNG-free; do_wear.c:909) and clears the immobilisation.  This
            // is the faithful placement that the prior outer-loop unconditional
            if ((g.multi | 0) < 0) {
                g.multi = (g.multi | 0) + 1;
                if ((g.multi | 0) === 0) {
                    await unmul(null);
                    // Signal to moveloop_core_faithful that a multi<0 countdown
                    // just completed this call (so it suppresses the next head's
                    // spurious per-turn block — C's banked-umv carryover).
                    g._ff_countdown_done = true;
                }
            }
            // the outer-loop re-test and the SEER roll.
            emitMapstate('turn_end');
            if (_turnTrace)
                pushRngLogEntry(`^turn_js[phase=turn_end moves=${g.moves | 0}]`);
        }
        if (++guard >= 64) break; // safety cap against a broken umovement balance
    } while ((g.u.umovement | 0) < NORMAL_SPEED);
    if (_turnTrace)
        pushRngLogEntry(`^turn_js[phase=outer_exit moves=${g.moves | 0} passes=${guard} umv=${g.u.umovement | 0}]`);
    // C allmain.c:396 — `gh.hero_seq++; /* moves*8 + n for n == 1..7 */`, the
    // first of the once-per-hero-took-time things, ahead of the SEER block below
    // (C allmain.c:464-470).  See the moves<<3 assignment in the HEAD block above
    // for why this counter matters.
    g.hero_seq = (g.hero_seq | 0) + 1;
    /* C allmain.c:403 — monster actions and timeout processing can alter the
     * load after the first check, so C checks again after the outer loop. */
    encumber_msg_sync();
    // C allmain.c:464-470 — once-per-hero-took-time SEER counter.  Uses the
    // post-increment turn counter (svm.moves >= seer_turn).  In the faithful path
    // g.moves is incremented INSIDE the HEAD block at C's svm.moves++ point, so by
    // the time the do-while exits g.moves already equals C's svm.moves for this
    // turn (NOT +1).  The calibrated head path reads g.moves directly here too
    // (allmain.js head-seer block: `if (moves >= seer_turn)`), so we match that —
    // no -1 correction.  (The -1 in the calibrated multi>0 RUN loop is because
    // that loop reads g.moves AFTER its own bottom-style ++; this path does not.)
    g.context = g.context || {};
    if (g.context.seer_turn == null) g.context.seer_turn = 1;
    const _seerMoves = g.moves || 1;
    const _seerDue = _seerMoves >= g.context.seer_turn;
    const _seerActive = timed_clairvoyance_active();
    if (typeof process !== 'undefined' && ENV?.FF_VISION_TRACE === '1')
        pushRngLogEntry(`^vision_seer[moves=${_seerMoves} seer_turn=${g.context.seer_turn | 0} incomingMove=1 due=${_seerDue ? 1 : 0} active=${_seerActive ? 1 : 0}]`);
    if (_seerDue) {
        if (_seerActive) await do_vicinity_map(null);
        g.context.seer_turn = (g.moves || 1) + rn1(31, 15);
        if (typeof process !== 'undefined' && ENV?.FF_VISION_TRACE === '1')
            pushRngLogEntry(`^vision_seer_resched[moves=${_seerMoves} next=${g.context.seer_turn | 0}]`);
    }
    /* C allmain.c:423-428 — `if (u.utrap && u.utraptype == TT_LAVA) sink_into_lava();
     * else if (!u.umoved) (void) pooleffects(FALSE);` — a hero who did not move
     * this turn is re-tested against the terrain under them (a wished-up
     * pool/moat, levitation timing out).  sink_into_lava is unported. */
    if (g.u && g.u.utrap && g.u.utraptype === 4 /* TT_LAVA */)
        await sink_into_lava();
    else if (!((g.u && g.u.umoved) | 0))
        await pooleffects(false);
    if (_heroTrace) {
        const u = g.u || {};
        pushRngLogEntry(
            `^ff_turnexit[moves=${g.moves | 0} startux=${_traceStart.ux} startuy=${_traceStart.uy}`
            + ` startumv=${_traceStart.umv} startmulti=${_traceStart.multi}`
            + ` startmove=${_traceStart.move} ux=${u.ux | 0} uy=${u.uy | 0}`
            + ` umv=${u.umovement | 0} multi=${g.multi | 0}`
            + ` ctxmove=${g.context && g.context.move ? 1 : 0}`
            + ` run=${g.context && g.context.run ? 1 : 0} mv=${g.context && g.context.mv ? 1 : 0}]`);
    }
}

// ════════════════════════════════════════════════════════════════════════════
// eat_occupation_turn — ONE eating-occupation turn (the occupation-callback tail).
//
// C ref: allmain.c:556 `(*go.occupation)() == eatfood()`.  Called once per
// moveloop_core invocation while an eat occupation is active, AFTER this turn's
// per-turn world block already ran at the top (movemon/HEAD/gethungry via the
// incomingMove faithful_moveloop_turn).  Drives the meal one turn at a time so
// that each turn's pageable message (lesshungry's "You're having a hard time...",
// done_eating's nomovemsg "You're finally finished." / "You finish eating X.")
// pages with its OWN --More-- on the topline — exactly as C's update_topl/more()
// does when a fresh pline arrives while the topline already holds an
// un-acknowledged message.  Each such page consumes one recorded space key via
// whole meal onto one topline (which advanced the map by every turn at once and
// leaked the surplus space keys to rhack as "Unknown command").
//
// Cross-turn forced more() (NOT width).  C's tty more()s the prior turn's committed
// topline when THIS turn produces a fresh pline, because the prior line was already
// PAINTED at the prior per-turn flush (shown to the player) but not acknowledged by an
// nhgetch.  So the paging cadence is one --More-- per occupation turn that carries a
// message — independent of the line's width (e.g. "A little goes a long way." (25) +
// "You're having a hard time..." (49) = 76 cols fits an 80-col line, yet C still
// pages — it is a cross-turn more(), not a width overflow).
//
// Bookkeeping: game._occ_committed_topl holds the message that is currently the
// committed topline (shown at the prior per-turn flush), with the painted frame +
// T:).  The begin message ("A little goes a long way.") seeds it on the first eating
// turn (from _resultMessage, plined by the starting rhack's fprefx).
//
// Per turn: run eatfood() (appends this turn's lesshungry/done_eating pline + any
// movemon plines to _resultMessage); if a committed topline is pending, force a
// more() on it now (paging it with the CURRENT turn's freshly-flushed map — C shows
// the just-flushed frame, e.g. turn-2's no-dog-move map for the begin-message page,
// turn-3's dog-moved map for the lesshungry page); then this turn's new message
// becomes the committed topline for the next turn.  No RNG here (gethungry's rn2(20)
// already fired in the per-turn block; bite/lesshungry/done_eating are RNG-free for
async function eat_occupation_turn() {
    const g = game;
    // Keep the preceding occupation flush available for the done_eating page.
    // C's physical terminal still shows that frame while the post-meal world
    // turn advances the live map before the pending topline is acknowledged.
    const _occBeforeEatTick = g._occCurFrame;
    // C: this turn's per-turn physical flush — record the painted frame as the
    // current last-flush (this turn's movemon map).  DISPLAY-ONLY.
    occupation_painted_tick();
    const _eatPre = g._eatPreEffectFrame;
    const thisTurnFrame = _eatPre?.cells || g._occCurFrame;
    if (_eatPre?.botl) g._occCurBotl = _eatPre.botl;
    const thisTurnMoves = g.moves | 0;
    // hunger state so the forced --More-- shows it (before lesshungry's newuhs() bump).
    const thisTurnUhs = (g.u && g.u.uhs != null) ? (g.u.uhs | 0) : null;
    g._eatPreEffectFrame = null;
    const prior = g._occ_committed_topl;
    // The committed topline (prior.text) was shown coming into this turn (the inter-turn
    // flush set _pending_message = prior.text, which the incomingMove block then merged
    // into _resultMessage).  Strip that known prefix so we isolate THIS turn's fresh
    // content (movemon plines), avoiding a double-count of the committed line.
    let preEat = g._resultMessage || '';
    let preEatJoins = (g._resultMessageJoins?.src === preEat
        && Array.isArray(g._resultMessageJoins?.joins))
        ? g._resultMessageJoins.joins.slice()
        : (_topl_joins_snapshot(preEat) || []);
    g._resultMessage = null;
    if (g._pending_message) {
        preEat = preEat
            ? _topl_merge_result(preEat, g._pending_message, preEatJoins)
            : g._pending_message;
        preEatJoins = _topl_joins_snapshot(preEat) || [];
        g._pending_message = '';
    }
    if (prior && preEat.startsWith(prior.text)) {
        const cut = prior.text.length + (preEat.startsWith(prior.text + '  ') ? 2 : 0);
        preEat = preEat.slice(cut);
        preEatJoins = preEatJoins.filter((off) => off > prior.text.length)
            .map((off) => off - cut);
    }
    // `preEat` now holds only this turn's movemon plines (usually empty for the meal's
    // own turns; the dog-pickup pline lands on the post-meal turn, not here).
    // C allmain.c:556 — (*go.occupation)() == eatfood(); returns 0 when done.  eatfood
    // plines this turn's lesshungry/done_eating message into _resultMessage.
    const r = await eatfood();
    if (r === 0) {
        g.occupation = null;
        // With no fresh monster pline, the next moveloop is the post-meal world
        // turn and its live repaint is not yet visible through C's pending
        // has a monster pline, C's page owns this turn's newer flush instead;
        // refresh it at the post-meal boundary so its updated status is included
        if (_occBeforeEatTick && !preEat) g._occCurFrame = _occBeforeEatTick;
        g._occPostMealNeedsRefresh = !!preEat;
    }
    // C allmain.c:504-507 — the occupation-interrupt check, in the SAME
    // moveloop_core invocation as the callback above and before its return:
    //
    //     if ((*go.occupation)() == 0)
    //         go.occupation = 0;
    //     if (monster_nearby()) {
    //         stop_occupation();
    //         reset_eat();
    //     }
    //     runmode_delay_output();
    //     return;
    //
    // Every other occupation driver in this file already carries it (the
    // timed_occupation loop, the `learn` driver, the `opentin` driver); the EAT
    // driver was the one that did not, and its absence is not merely a missing
    // "You stop eating X." line.  stop_occupation() -> maybe_finished_meal(TRUE)
    // (eat.c:3877) finishes a meal whose usedtime has ALREADY reached reqtime by
    // calling eatfood() one extra time RIGHT HERE, so C's meal ends on the turn a
    // hostile steps adjacent rather than on the following turn.  Without this the
    // port ran one more eatfood() occupation turn than C, which is a whole extra
    // moveloop_core invocation: done_eating's pline landed one turn late and the
    // during turn 4's movemon): C runs eatfood twice and finishes inside
    // stop_occupation; the port ran it three times.
    //
    // It is placed here rather than beside the `await eat_occupation_turn()` call
    // site because this function IS the occupation call together with the topline
    // bookkeeping for the plines it issues, and done_eating's pline must page
    // against this same turn's line — which is exactly what C does.
    //
    if (monster_nearby()) {
        await stop_occupation();
        reset_eat();
    }
    let eatMsg = g._resultMessage || '';
    let eatMsgJoins = (g._resultMessageJoins?.src === eatMsg
        && Array.isArray(g._resultMessageJoins?.joins))
        ? g._resultMessageJoins.joins.slice()
        : (_topl_joins_snapshot(eatMsg) || []);
    if (g._pending_message) {
        eatMsg = eatMsg
            ? _topl_merge_result(eatMsg, g._pending_message, eatMsgJoins)
            : g._pending_message;
        eatMsgJoins = _topl_joins_snapshot(eatMsg) || [];
    }
    if (prior && eatMsg.startsWith(prior.text + '  ')) {
        const cut = prior.text.length + 2;
        eatMsg = eatMsg.slice(cut);
        eatMsgJoins = eatMsgJoins.filter((off) => off > prior.text.length)
            .map((off) => off - cut);
    }
    g._pending_message = '';
    g._resultMessage = null;
    // This turn issues its plines in TWO groups, in C's own order: the world block's
    // movemon plines (allmain.c:202-460, before the occupation) and then the
    // occupation callback's own pline (allmain.c:485, plus the :504-507 interrupt's
    // done_eating).  C's update_topl tests EACH pline against the topline AS IT
    // STANDS, so when both groups are non-empty the second is tested against the line
    // the first just joined — and C pages BETWEEN them if it no longer fits.
    // Resolving both groups as ONE string against `prior` (what this did until now)
    // is correct only while at most one of them is non-empty, which is the case on
    // every ordinary eating turn.  It is NOT the case on the interrupt turn above:
    // committed "This cram ration is bland.", 26+2+25 = 53 < 71) and then
    // "You finish eating the cram ration." (53+2+34 = 89 >= 71, so C more()s).
    // One string gave one 88-column topline and no --More--.
    const _displayedUhs = () => (g.occupation
        ? (g._saved_hs ? (g._save_hs | 0) : thisTurnUhs)
        : (g.u && g.u.uhs != null ? (g.u.uhs | 0) : thisTurnUhs));
    let _committed = prior ? prior.text : null;
    let _emitted = false;
    let _ownerAfterEsc = false;
    // C update_topl/more(): the prior committed topline (shown last per-turn flush) is
    // paged by THIS turn's fresh pline.  Force a --More-- on it now, with the CURRENT
    // turn's just-flushed map (C's last-flush-before-more()).  Consumes one recorded
    // space key via nhgetch; no RNG.
    //
    // …but only when C's update_topl JOIN test fails.  update_topl (topl.c:257-268)
    // reaches more() ONLY in the `else` of `n0 + strlen(gt.toplines) + 3 < CO - 8`;
    // when the prior committed line and the fresh pline fit that reserve together it
    // concatenates them with "  " and pages nothing.  The cadence is therefore
    // one --More-- per occupation turn *whose message does not fit*, not one per
    // occupation turn: this function's own example ("A little goes a long way." 25 +
    // "You're having a hard time..." 49) pages because 25+2+49 = 76 >= 71, not
    // that against the 80-column line instead of the CO-1-8 = 71 reserve and
    // counter-example the unconditional force got wrong: eatcorpse's "You feel
    // sick." (14) and done_eating's "You finish eating the gnome corpse." (35) fit
    // (14+2+35 = 51 < 71), so C shows them JOINED on one topline with no --More--
    // and no dismiss key.
    const _plineSegments = (line, joins) => {
        if (!line) return [];
        if (!joins || !joins.length) return [line];
        const segments = [];
        let start = 0;
        for (const off of joins) {
            segments.push(line.slice(start, off));
            start = off + 2;
        }
        segments.push(line.slice(start));
        return segments.filter(Boolean);
    };
    for (const part of [
        ..._plineSegments(preEat, preEatJoins),
        ..._plineSegments(eatMsg, eatMsgJoins),
    ]) {
        if (!part) continue;
        _emitted = true;
        /* A prior part can have owned a more() dismissed with ESC.  C's
         * update_topl sampled skip before that more(), so the owner was drawn,
         * but WIN_STOP suppresses every later pline in this same occupation
         * callback.  Keep updating gt.toplines' hidden buffer without changing
         * the physically committed line. */
        if (g._topl_win_stop) {
            const hidden = String(g._topl_win_stop_buf || _committed || '');
            g._topl_win_stop_buf = (hidden.length + 2 + part.length < 71)
                ? `${hidden}  ${part}` : part;
            continue;
        }
        if (_committed && _topl_joins_committed(_committed, part.split('  ')[0])) {
            // C: Strcat(gt.toplines, "  "); Strcat(gt.toplines, bp) — the committed line
            // stays and this pline is appended to it.  _topl_merge_result keeps the
            // per-pline join offsets so a LATER turn's pline still pages at the right
            // boundary via _topl_split_for_more.
            _committed = _topl_merge_result(_committed, part,
                                            _topl_joins_snapshot(_committed));
        } else {
            // C froze the status line at the per-turn bot()/newuhs flush.  The DISPLAYED
            // hunger during a meal is the saved pre-meal state (newuhs's saved_hs block does
            // not SET_BOTL mid-meal); once the meal ends (done_eating's newuhs commits the
            // new state with SET_BOTL), it is the live u.uhs.  So show save_hs while the
            // meal is ongoing (occupation still set), else live u.uhs (committed at meal end).
            if (_committed) {
                const morc = await occupation_force_more(
                    _committed, thisTurnFrame, thisTurnMoves, _displayedUhs());
                _ownerAfterEsc = morc === 27 && !!g._topl_win_stop_armed;
            }
            _committed = part;
            if (_ownerAfterEsc) {
                g._topl_win_stop_armed = false;
                g._topl_win_stop = true;
                g._topl_win_stop_buf = part;
                _ownerAfterEsc = false;
            }
        }
    }
    let thisTurnMsg = _emitted ? _committed : '';
    // This turn's fresh message becomes the committed topline for the next turn (or,
    // once the meal ends and occupation cleared, it stays on _pending_message to be
    // paged by the post-meal turn / read at the next rhack like any command result).
    if (thisTurnMsg) {
        g._occ_committed_topl = { text: thisTurnMsg };
        g._pending_message = thisTurnMsg;
    } else if (prior) {
        // Silent eating turn (no fresh message, e.g. a goblin-corpse meal's mid turns):
        // keep the prior committed topline and DO NOT page (C does not more() a silent
        // occupation turn — the physical terminal is just repainted).  Re-show it.
        g._pending_message = prior.text;
    }
    // When the meal just ended, KEEP the final committed message (done_eating's "You're
    // finally finished." / "You finish eating X.") in _occ_committed_topl for ONE more
    // turn: C's post-meal turn runs a normal world block whose movemon may pline (the
    // that fresh pline forces a cross-turn more() on the done_eating topline (C step 5
    // on _occ_committed_topl below) drives that more().  Mark it post-meal so the
    // handler knows the occupation is over (no eatfood next turn).
    if (!g.occupation) {
        g._occ_committed_topl = thisTurnMsg
            ? { text: thisTurnMsg, postMeal: true }
            : (prior ? { text: prior.text, postMeal: true } : null);
        g._pending_message = '';
    }
    await flush_screen(1);
}

// unmul()'s nomovemsg ("You can move again.", "You finish your dressing
// maneuver.") is plined at the END of a multi<0 countdown, i.e. with NO nhgetch
// anywhere between the command that started the countdown and this line.  C's
// topline therefore still holds the command's own message and update_topl
//
// This port splits those two channels — the command's message went to
// _resultMessage (the command-result channel that survives to the next nhgetch)
// while unmul's pline went to _pending_message — and the next rhack(0) restores
// _resultMessage over it, dropping unmul's line entirely.  Merge them in the
// countdown's own order (result first, then the countdown's pline), the same
// idiom the dig / engrave / picklock occupation drivers already use at their
// tails.  DISPLAY-ONLY: no RNG, no turn.
async function nh_timeout_wounded_legs() {
    const g = game;
    const wl = g.u?.uprops?.[WOUNDED_LEGS];
    if (!wl || !((wl.intrinsic | 0) & TIMEOUT))
        return;
    /* C: --upp->intrinsic, then test the TIMEOUT field of the NEW value. */
    wl.intrinsic = (wl.intrinsic | 0) - 1;
    if (((wl.intrinsic | 0) & TIMEOUT) !== 0)
        return;
    heal_legs(0);
    /* C allmain.c:755 stop_occupation().  Its occupation branch needs go.occtxt
     * and maybe_finished_meal(), neither of which this port carries, so surface
     * a live case instead of mis-modelling it; the no-occupation branch is
     * `else if (gm.multi >= 0) nomul(0);` and is what actually runs here. */
    if (g.occupation)
        await stop_occupation();
    else if ((g.multi | 0) >= 0)
        nomul(0);
}

/* C timeout.c:268-274 — this warning runs before nh_timeout() walks the
 * property array.  Keep it separate from the SLEEPY expiry below: C prints
 * the yawn while the timeout is still 4, then later decrements property 27
 * after WOUNDED_LEGS (26). */
export async function nh_timeout_sleepy_dialogue() {
    const p = game.u?.uprops?.[SLEEPY];
    if (((p?.intrinsic | 0) & TIMEOUT) === 4)
        await pline('You yawn.');
}

/* C timeout.c:751-792, SLEEPY (property index 27).  The generic loop first
 * decrements the complete intrinsic word and enters this arm only when its
 * low TIMEOUT bits reach zero.  `incr_itimeout` preserves origin bits and
 * replaces only those low bits; set_itimeout() is the shared C-faithful body.
 *
 * The canonical pickup.unconscious() recognizes both u.usleep and C's
 * unconscious nomovemsg prefixes.  It is intentionally checked before
 * Sleepy: C rearms a timed sleepy condition even if the original source has
 * disappeared when the hero is already unconscious or sleep-resistant. */
export async function nh_timeout_sleepy() {
    const g = game;
    const p = g.u?.uprops?.[SLEEPY];
    if (!p || !((p.intrinsic | 0) & TIMEOUT))
        return;
    p.intrinsic = (p.intrinsic | 0) - 1;
    if (((p.intrinsic | 0) & TIMEOUT) !== 0)
        return;

    const sleepResistance = !!((g.u?.uprops?.[SLEEP_RES]?.intrinsic | 0)
        || (g.u?.uprops?.[SLEEP_RES]?.extrinsic | 0));
    const rearm = (amount) => {
        const box = { value: p.intrinsic | 0 };
        set_itimeout(box, (box.value & TIMEOUT) + amount);
        p.intrinsic = box.value;
    };
    if (unconscious() || sleepResistance) {
        rearm(rnd(100));
    } else if ((p.intrinsic | 0) || (p.extrinsic | 0)) {
        await pline('You fall asleep.');
        const sleeptime = rnd(20);
        await fall_asleep(-sleeptime, true);
        rearm(sleeptime + rnd(100));
    }
}

function nh_timeout_invulnerable() {
    const g = game;
    const p = g.u?.uprops?.[INVULNERABLE];
    if (!p || !((p.intrinsic | 0) & TIMEOUT))
        return;
    p.intrinsic = (p.intrinsic | 0) - 1;
}

/* C timeout.c:692-724 generic countdown, SICK (17). */
async function nh_timeout_sick() {
    const g = game;
    const p = g.u?.uprops?.[SICK];
    if (!p || !((p.intrinsic | 0) & TIMEOUT))
        return;
    p.intrinsic = (p.intrinsic | 0) - 1;
    if ((p.intrinsic | 0) & TIMEOUT)
        return;
    const kptr = find_delayed_killer(SICK);
    if (((g.u.usick_type | 0) & SICK_NONVOMITABLE) === 0
        && rn2(100) < acurr(A_CON)) {
        await pline('You have recovered from your illness.');
        await make_sick(0, null, false,SICK_ALL);
        exercise(A_CON, false);
        await adjattrib(A_CON, -1, 1);
        return;
    }
    await urgent_pline('You die from your illness.');
    g.svk = g.svk || {};
    g.svk.killer = { id: 0, name: kptr?.name || '', format: kptr?.name ? kptr.format : KILLED_BY_AN, next: null };
    dealloc_killer(kptr);
    p.intrinsic |= I_SPECIAL; /* done_timeout, timeout.c:575 */
    await done_end(POISONING);
    p.intrinsic &= ~I_SPECIAL;
    g.u.usick_type = 0;
}

/* C timeout.c:671-684 generic countdown, STONED (18): at expiry the delayed
 * killer names the death, then done_timeout(STONING, STONED) (timeout.c:575). */
async function nh_timeout_stoned() {
    const g = game;
    const p = g.u?.uprops?.[STONED];
    if (!p || !((p.intrinsic | 0) & TIMEOUT))
        return;
    p.intrinsic = (p.intrinsic | 0) - 1;
    if ((p.intrinsic | 0) & TIMEOUT)
        return;
    const kptr = find_delayed_killer(STONED);
    g.svk = g.svk || {};
    g.svk.killer = g.svk.killer || { id: 0, format: 0, name: '', next: null };
    if (kptr && kptr.name) {
        g.svk.killer.format = kptr.format;
        g.svk.killer.name = kptr.name;
    } else {
        g.svk.killer.format = NO_KILLER_PREFIX;
        g.svk.killer.name = 'killed by petrification';
    }
    dealloc_killer(kptr);
    p.intrinsic |= I_SPECIAL;
    await done_end(STONING);
    /* life-saved */
    p.intrinsic &= ~I_SPECIAL;
    if (g.disp) g.disp.botl = 1;
}

/* C timeout.c:686-688 generic countdown, SLIMED: at expiry slimed_to_death()
 * (timeout.c:457-516).  The decrement is what lets slime_dialogue() see the
 * odd timeouts on later turns. */
async function nh_timeout_slimed() {
    const g = game;
    const p = g.u?.uprops?.[SLIMED];
    if (!p || !((p.intrinsic | 0) & TIMEOUT))
        return;
    p.intrinsic = (p.intrinsic | 0) - 1;
    if ((p.intrinsic | 0) & TIMEOUT)
        return;
    const kptr = find_delayed_killer(SLIMED);
    if ((g.u?.umonnum | 0) === PM_GREEN_SLIME && g.u?.mtimedone) {
        dealloc_killer(kptr);
        return;
    }
    g.svk = g.svk || {};
    g.svk.killer = g.svk.killer || { id: 0, format: 0, name: '', next: null };
    if (kptr && kptr.name) {
        g.svk.killer.format = kptr.format;
        g.svk.killer.name = kptr.name;
    } else {
        g.svk.killer.format = NO_KILLER_PREFIX;
        g.svk.killer.name = 'turned into green slime';
    }
    dealloc_killer(kptr);
    await polymon(PM_GREEN_SLIME);
    await done_end(TURNED_SLIME);
    if (g.disp) g.disp.botl = 1;
}

/* C timeout.c:890-894 generic countdown, STRANGLED (19): at expiry the hero
 * dies of strangulation/suffocation.  (The life-saved tail, timeout.c:895-905,
 * is not ported: the amulet-vanishes arm needs useup on uamul.) */
async function nh_timeout_strangled() {
    const g = game;
    const p = g.u?.uprops?.[STRANGLED];
    if (!p || !((p.intrinsic | 0) & TIMEOUT))
        return;
    p.intrinsic = (p.intrinsic | 0) - 1;
    if ((p.intrinsic | 0) & TIMEOUT)
        return;
    g.svk = g.svk || {};
    g.svk.killer = g.svk.killer || { id: 0, format: 0, name: '', next: null };
    g.svk.killer.format = KILLED_BY;
    g.svk.killer.name = g.u.uburied ? 'suffocation' : 'strangulation';
    await done_end(DIED);
}

async function nh_timeout_stunned() {
    const g = game;
    const p = g.u?.uprops?.[STUNNED];
    if (!p || !((p.intrinsic | 0) & TIMEOUT))
        return;
    /* C: --upp->intrinsic, then test the TIMEOUT field of the NEW value. */
    p.intrinsic = (p.intrinsic | 0) - 1;
    if (((p.intrinsic | 0) & TIMEOUT) !== 0)
        return;
    /* C timeout.c:738 set_itimeout(&HStun, 1L) — see above. */
    const which = { value: p.intrinsic | 0 };
    set_itimeout(which, 1);
    p.intrinsic = which.value;
    await make_stunned(0, true);
    /* C timeout.c:740-741 `if (!Stunned) stop_occupation();` — the same shape
     * the CONFUSION arm below carries, and for the same reason: the occupation
     * branch needs go.occtxt and maybe_finished_meal(), which this port does
     * not have, so surface a live case rather than mis-model it.  The branch
     * that actually runs here is `else if (gm.multi >= 0) nomul(0);`. */
    if ((p.intrinsic | 0) === 0) {
        if (g.occupation)
            await stop_occupation();
        else if ((g.multi | 0) >= 0)
            nomul(0);
    }
}

async function nh_timeout_confusion() {
    const g = game;
    const p = g.u?.uprops?.[CONFUSION];
    if (!p || !((p.intrinsic | 0) & TIMEOUT))
        return;
    /* C: --upp->intrinsic, then test the TIMEOUT field of the NEW value. */
    p.intrinsic = (p.intrinsic | 0) - 1;
    if (((p.intrinsic | 0) & TIMEOUT) !== 0)
        return;
    /* C timeout.c:732 set_itimeout(&HConfusion, 1L) — see above. */
    const which = { value: p.intrinsic | 0 };
    set_itimeout(which, 1);
    p.intrinsic = which.value;
    await make_confused(0, true);
    /* C timeout.c:734-735 `if (!Confusion) stop_occupation();`.  Same shape as
     * the WOUNDED_LEGS arm above: the occupation branch needs go.occtxt and
     * maybe_finished_meal(), which this port does not carry, so surface a live
     * case rather than mis-model it; the branch that actually runs here is
     * `else if (gm.multi >= 0) nomul(0);`. */
    if ((p.intrinsic | 0) === 0) {
        if (g.occupation)
            await stop_occupation();
        else if ((g.multi | 0) >= 0)
            nomul(0);
    }
}

async function nh_timeout_fast() {
    const g = game;
    const p = g.u?.uprops?.[FAST];
    if (!p || !((p.intrinsic | 0) & TIMEOUT))
        return;
    p.intrinsic = (p.intrinsic | 0) - 1;
    if (((p.intrinsic | 0) & TIMEOUT) !== 0)
        return;
    /* youprop.h — INTRINSIC = FROMOUTSIDE|FROMRACE|FROMEXPER (prop.h:139). */
    const INTRINSIC_BITS = 0x07000000;
    const hFast = p.intrinsic | 0, eFast = p.extrinsic | 0;
    const Very_fast = !!(hFast & ~INTRINSIC_BITS) || !!eFast;
    const Fast = !!hFast || !!eFast;
    if (!Very_fast)
        await pline(`You feel yourself slow down${Fast ? ' a bit' : ''}.`);
}

/* C timeout.c:347-378 — the last two warnings before timed descent. */
async function levitation_dialogue() {
    const u = game.u;
    const p = u.uprops[LEVITATION];
    const timeout = (p.intrinsic | 0) & TIMEOUT;
    if (p.extrinsic)
        return;
    const poolOrLava = is_pool_or_lava(u.ux, u.uy);
    if (!ACCESSIBLE(game.level?.at(u.ux, u.uy)?.typ ?? 0) && !poolOrLava)
        return;
    const i = Math.trunc((timeout - 1) / 2);
    if ((timeout % 2) && i > 0 && i <= 2) {
        if (i === 2) {
            await pline('You float slightly lower.');
        } else {
            const danger = poolOrLava && !Is_waterlevel(u.uz);
            await urgent_pline(`You wobble unsteadily ${danger ? 'over' : 'in'} the ${danger ? surface(u.ux, u.uy) : 'air'}.`);
        }
        await stop_occupation();
    }
}

/* C timeout.c:794-803: timed levitation expiration. */
async function nh_timeout_levitation() {
    const p = game.u.uprops[LEVITATION];
    p.intrinsic = (p.intrinsic | 0) - 1;
    if ((p.intrinsic | 0) & TIMEOUT)
        return;
    // C ends simultaneous timed flight first to avoid contradictory feedback.
    const flying = game.u.uprops[FLYING];
    if (((flying?.intrinsic | 0) & TIMEOUT) === 1) {
        const ref = { value: flying.intrinsic | 0 };
        set_itimeout(ref, 0);
        flying.intrinsic = ref.value;
    }
    // C retains the command topline while expiration and landing traps run.
    // Commit our deferred result before a nested trap can page that line.
    if (game._resultMessage) {
        _topl_stash_result();
        _run_commit_result(game);
    }
    await float_down(I_SPECIAL | TIMEOUT, 0);
}


async function nh_timeout_blinded() {
    const g = game;
    if (!g.u)
        return;
    const t = BlindedTimeout();
    if (!t)
        return; /* C: `upp->intrinsic & TIMEOUT` is 0 -- not counted down */
    if (typeof process !== 'undefined' && ENV && ENV.FF_MLTRACE === '1')
        pushRngLogEntry(`^ml_blind[t=${t | 0} moves=${game.moves | 0} multi=${game.multi | 0}]`);
    set_HBlinded(HBlinded_raw() - 1);
    if (BlindedTimeout() !== 0)
        return; /* C: still counting down */
    const was_blind = !!Blind();
    set_HBlinded(1);            /* C set_itimeout(&HBlinded, 1L) */
    make_blinded(0, true);      /* prints "You can see again." */
    if (was_blind && !Blind())
        await stop_occupation({ silent: true });
}

/* C timeout.c:778-782 — timed hallucination expires through
 * make_hallucinated(0, TRUE, 0) after restoring a one-turn old timeout.
 * The normal non-expiry path is only the generic property-loop decrement. */
async function nh_timeout_hallucinated() {
    const p = game.u?.uprops?.[HALLUC];
    if (!p || !((p.intrinsic | 0) & TIMEOUT))
        return;
    p.intrinsic = (p.intrinsic | 0) - 1;
    if ((p.intrinsic | 0) & TIMEOUT)
        return;
    /* C timeout.c:780: set_itimeout(&HHallucination, 1L). */
    const which = { value: p.intrinsic | 0 };
    set_itimeout(which, 1);
    p.intrinsic = which.value;
    await make_hallucinated(0, true, 0);
    if (!((game.u?.uprops?.[HALLUC]?.intrinsic | 0)))
        await stop_occupation();
}

async function nh_timeout_deaf() {
    const g = game;
    const u = g.u;
    if (!u)
        return;
    /* The uprops[DEAF] slot is what potion.js make_deaf (and so #wizintrinsic)
     * writes; C's one HDeaf is counted down by the generic loop (timeout.c:
     * `(upp->intrinsic & TIMEOUT) && !(--upp->intrinsic & TIMEOUT)`). */
    const dp = u.uprops?.[DEAF_AM];
    if (dp && ((dp.intrinsic | 0) & TIMEOUT)) {
        dp.intrinsic = (dp.intrinsic | 0) - 1;
        if ((dp.intrinsic | 0) & TIMEOUT)
            return;
        const was = { value: dp.intrinsic | 0 };
        set_itimeout(was, 1);
        dp.intrinsic = was.value;
        await make_deaf_prop(0, true);
        if (!Deaf_am())
            await stop_occupation();
        return;
    }
    if (!(u.HDeaf | 0))
        return;
    u.HDeaf = (u.HDeaf | 0) - 1;
    if ((u.HDeaf | 0) !== 0)
        return;
    u.HDeaf = 1;                /* C set_itimeout(&HDeaf, 1L) */
    make_deaf(0, true);
    g.disp = g.disp || {};
    g.disp.botl = 1;
    if (!Deaf_am())
        await stop_occupation();
}
/* C youprop.h:125 `#define Deaf (HDeaf || EDeaf || u.uroleplay.deaf)`.
 * HDeaf is u.HDeaf here (js/eat.js:1177 and js/trap.js's domagictrap write it,
 * nh_timeout_deaf above counts it down); the uprops[DEAF] slot is the other
 * spelling this port carries, so both are read — the same body js/shk.js's
 * _shk_Deaf and js/trap.js's _hero_Deaf use. */
const DEAF_AM = 16; /* C prop.h DEAF — js/const.js:2328 exports the same 16 */
function Deaf_am() {
    const u = game.u;
    if (!u) return false;
    const p = u.uprops?.[DEAF_AM];
    return !!((p?.intrinsic | 0) || (p?.extrinsic | 0)
              || (u.HDeaf | 0)
              || (u.uroleplay?.deaf ? 1 : 0));
}
/* C ref: potion.c:443-457 make_deaf(xtime, talk).
 *     long old = HDeaf;
 *     if (Unaware) talk = FALSE;
 *     set_itimeout(&HDeaf, xtime);
 *     if ((xtime != 0L) ^ (old != 0L)) {
 *         disp.botl = TRUE;
 *         if (talk)
 *             You(old && !Deaf ? "can hear again."
 *                              : "are unable to hear anything.");
 *     }
 * Unaware is youprop.h:399 (gm.multi < 0 && (unconscious() || is_fainted())) —
 * the real ported bodies, not the `multi < 0` approximation this file carried.
 * set_itimeout on the plain u.HDeaf counter is an assignment; there are no
 * FROMOUTSIDE-style flag bits on this slot in this port.
 * pline() has no await in its body, so the unawaited call commits the message
 * in full — the same shape js/zap.js's make_blinded relies on. */
function make_deaf(xtime, talk) {
    const u = game.u || (game.u = {});
    const old = u.HDeaf | 0;
    if (((game.multi | 0) < 0) && (unconscious() || is_fainted()))
        talk = false;
    u.HDeaf = xtime | 0;
    if (((xtime | 0) !== 0) !== (old !== 0)) {
        game.disp = game.disp || {};
        game.disp.botl = 1;
        if (talk)
            pline((old && !Deaf_am()) ? 'You can hear again.'
                                      : 'You are unable to hear anything.');
    }
}

/* C mbodypart() part index (hack.h BP_* enum): FOOT.  js/cmd.js body_part()
 * takes the same index; 5 is the value its own local FOOT const carries. */
const FOOT_AM = 5;
/* objects[] index of "corpse", from js/oc_name_data.js's OC_NAME table —
 * objects.h is an X-macro file with no `#define CORPSE` text to grep. */
const CORPSE_AM = 265;
async function slip_or_trip() {
    const g = game;
    const u = g.u;
    /* C hack.c vobj_at(x,y) — the head of the tile's nexthere chain. */
    let otmp = (g.level?.levelObjects?.[u.ux | 0]?.[u.uy | 0]) ?? null;
    const on_foot = !u.usteed;
    if (otmp && on_foot && !u.uinwater && is_pool(u.ux | 0, u.uy | 0))
        otmp = null;
    if (otmp && on_foot) {
        /* C timeout.c:1234 — after look_here reported one item, refer to it
         * by pronoun; this port previously always regenerated its full name. */
        const oneItem = (g.iflags?.last_msg | 0) === PLNMSG_ONE_ITEM_HERE;
        let what;
        if (oneItem) {
            what = (otmp.quan | 0) === 1
                ? 'it' : (_fumble_hallucinating() ? 'they' : 'them');
        } else if ((otmp.dknown | 0) || !Blind()) {
            what = (await doname(otmp));
        } else {
            /* C timeout.c:1238-1246 — when the top object is unseen,
             * identify a visible rock if present, otherwise say “something”. */
            let rock = null;
            for (let o = otmp; o; o = o.nexthere) {
                if ((o.otyp | 0) === 474) {
                    rock = o;
                    break;
                }
            }
            what = rock ? ((rock.quan | 0) === 1 ? 'a rock' : 'some rocks')
                        : 'something';
        }
        if (_fumble_hallucinating()) {
            const cap = what ? what.charAt(0).toUpperCase() + what.slice(1) : what;
            await pline(`Egads!  ${cap} bite${(!otmp || (otmp.quan | 0) === 1) ? 's' : ''} your ${body_part(FOOT_AM)}!`);
        } else {
            await pline(`You trip over ${what}.`);
        }
        /* C timeout.c:1256-1261 — a bare-footed hero who trips over a
         * cockatrice/chickatrice corpse petrifies immediately. */
        if (!u.uarmf && (otmp.otyp | 0) === CORPSE_AM
            && ((otmp.corpsenm | 0) === PM_COCKATRICE
                || (otmp.corpsenm | 0) === PM_CHICKATRICE))
            await instapetrify(`tripping over ${
                (otmp.corpsenm | 0) === PM_CHICKATRICE ? 'chickatrice' : 'cockatrice'
            } corpse`);
        return;
    }
    const HFumbling = (u.uprops?.[FUMBLING]?.intrinsic | 0);
    if ((HFumbling & FROMOUTSIDE) || (is_ice(u.ux | 0, u.uy | 0) && !rn2(3))) {
        /* C timeout.c:1262-1298 — the ice branch. */
        const slipslide = rn2(2) ? 'slip' : 'slide';
        const currentlyIce = is_ice(u.ux | 0, u.uy | 0);
        /* C timeout.c:1271-1284 — the message names the steed when mounted,
         * then a non-cursed saddle may throw the rider. */
        if (on_foot) {
            await pline(`You ${slipslide}${currentlyIce ? ' on' : ' off'} the ice.`);
        } else {
            /* C uses upstart(x_monnam(steed, ARTICLE_THE, ...,
             * SUPPRESS_SADDLE, FALSE)); retain its naming and hallucination
             * behavior rather than reading the raw mname field. */
            const rawSteedName = x_monnam(u.usteed, ARTICLE_THE, null,
                                         SUPPRESS_SADDLE, false);
            const steedName = rawSteedName
                ? rawSteedName.charAt(0).toUpperCase() + rawSteedName.slice(1)
                : 'The steed';
            await pline(`${steedName} ${slipslide}${currentlyIce ? 's on' : 's off'} the ice.`);
            const saddle = which_armor(u.usteed, W_SADDLE);
            const extrinsicFumbling = u.uprops?.[FUMBLING]?.extrinsic | 0;
            const iceOnly = !(extrinsicFumbling || (HFumbling & ~FROMOUTSIDE));
            if ((!saddle || !saddle.cursed)
                && (!iceOnly || !rn2(3))) {
                await pline('You lose your balance.');
                await dismount_steed(DISMOUNT_FELL);
                return;
            }
            /* If a cursed saddle holds the rider, C continues to the ordinary
             * slip-risk test below. */
        }
        if (!rn2(10 + (acurr(u, A_DEX) | 0))) {
            /* C timeout.c:1294-1298 — force a confused direction, then hurtle
             * unless that direction would simply return to the square occupied
             * before this move.  confdir() owns the canonical direction RNG. */
            const ux0 = u.ux0 | 0;
            const uy0 = u.uy0 | 0;
            if ((u.umonnum | 0) !== PM_GRID_BUG)
                confdir(true);
            if ((u.ux | 0) + (u.dx | 0) !== ux0
                || (u.uy | 0) + (u.dy | 0) !== uy0)
                await hurtle(u.dx | 0, u.dy | 0, 1, false);
        }
        return;
    }
    if (!on_foot) {
        /* C timeout.c:1321-1340 — a mounted hero fumbles in the saddle.
         * A cursed saddle keeps the rider mounted and consumes no message
         * RNG beyond the switch; otherwise the fall dismounts afterward. */
        const saddle = which_armor(u.usteed, W_SADDLE);
        if (!saddle || !saddle.cursed) {
            switch (rn2(4)) {
            case 1:
                await pline(`Your ${makeplural(body_part(FOOT_AM))} slip out of the stirrups.`);
                break;
            case 2:
                await pline('You let go of the reins.');
                break;
            case 3:
                await pline('You bang into the saddle-horn.');
                break;
            default:
                await pline('You slide to one side of the saddle.');
                break;
            }
            await dismount_steed(DISMOUNT_FELL);
        }
        return;
    }
    /* C timeout.c:1300-1317 — `switch (rn2(4)`. */
    const halluc = _fumble_hallucinating();
    switch (rn2(4)) {
    case 1:
        await pline(`You trip over your own ${halluc ? 'elbow' : makeplural(body_part(FOOT_AM))}.`);
        break;
    case 2:
        await pline(`You slip ${halluc ? 'on a banana peel' : 'and nearly fall'}.`);
        break;
    case 3:
        await pline('You flounder.');
        break;
    default:
        await pline('You stumble.');
        break;
    }
}
/* C youprop.h:151 Hallucination — (HHallucination && !Halluc_resistance),
 * read the same numeric-index way js/attrib.js exerper() reads it. */
function _fumble_hallucinating() {
    const up = game.u?.uprops || {};
    const H = (p) => (up[p]?.intrinsic | 0);
    const E = (p) => (up[p]?.extrinsic | 0);
    return !!(H(HALLUC) && !(H(HALLUC_RES) || E(HALLUC_RES)));
}
async function nh_timeout_fumbling() {
    const g = game;
    const u = g.u;
    const fu = u?.uprops?.[FUMBLING];
    if (!fu || !((fu.intrinsic | 0) & TIMEOUT))
        return;
    /* C: --upp->intrinsic, then test the TIMEOUT field of the NEW value. */
    fu.intrinsic = (fu.intrinsic | 0) - 1;
    if (((fu.intrinsic | 0) & TIMEOUT) !== 0)
        return;
    if ((u.umoved) && !_fumble_levitation() && !_fumble_flying()) {
        await slip_or_trip();
        nomul(-2);
        g.multi_reason = 'fumbling';
        /* C nomovemsg = "": hack.c:4183 tests the POINTER, so "" means "print
         * nothing when the countdown ends" — see unmul()'s note above. */
        g.nomovemsg = '';
        /* C weight.h:20 WT_NOISY_INV = 500; inv_weight() is carried weight minus
         * capacity, so this is "within 500 of my carrying capacity". */
        if (inv_weight() > -500) {
            if (!_fumble_deaf())
                await pline('You make a lot of noise!');
            /* C mon.c:4367 wake_nearby(FALSE) = wake_nearto_core(u.ux, u.uy,
             * u.ulevel * 20, FALSE), which is exactly wake_nearto(). */
            wake_nearto(u.ux | 0, u.uy | 0, (u.ulevel | 0) * 20);
        }
    }
    /* C: HFumbling &= ~FROMOUTSIDE (ice-only fumbling must not re-arm). */
    fu.intrinsic = (fu.intrinsic | 0) & ~FROMOUTSIDE;
    /* C youprop.h:129 Fumbling = (HFumbling || EFumbling) — the boots keep it
     * true, so the timer re-arms every time it expires. */
    if ((fu.intrinsic | 0) || (fu.extrinsic | 0)) {
        /* C prop.h incr_itimeout(fieldp, incr) =
         *     set_itimeout(fieldp, itimeout_incr(*fieldp, incr))
         * with itimeout_incr(old, incr) = itimeout((old & TIMEOUT) + incr).
         * Routed through js/potion.js's set_itimeout so the clamp is not
         * re-derived here. */
        const box = { value: fu.intrinsic | 0 };
        set_itimeout(box, (box.value & TIMEOUT) + rnd(20));
        fu.intrinsic = box.value;
    }
}
function _fumble_levitation() {
    const p = game.u?.uprops?.[LEVITATION];
    return !!(p && ((p.intrinsic | 0) || (p.extrinsic | 0)) && !(p.blocked | 0));
}
function _fumble_flying() {
    const p = game.u?.uprops?.[FLYING];
    return !!(p && ((p.intrinsic | 0) || (p.extrinsic | 0)) && !(p.blocked | 0));
}
/* C youprop.h:125 Deaf = (HDeaf || EDeaf || u.uroleplay.deaf).  HDeaf is
 * u.HDeaf in this port (nh_timeout_deaf above owns it); EDeaf and
 * u.uroleplay.deaf have no writer anywhere in js/. */
function _fumble_deaf() {
    const u = game.u || {};
    const p = u.uprops?.[DEAF_AM];
    /* C youprop.h:125 includes both intrinsic and extrinsic deafness, plus
     * the role-play deaf flag.  The old reader only checked HDeaf, so a
     * deafness source outside the intrinsic counter still printed the noise
     * message and could wake monsters when C suppresses it. */
    return !!((u.HDeaf | 0)
        || (p?.intrinsic | 0)
        || (p?.extrinsic | 0)
        || u.uroleplay?.deaf);
}

function _merge_countdown_pline() {
    const g = game;
    if (!g._pending_message) return;
    g._resultMessage = g._resultMessage
        ? _topl_merge_result(g._resultMessage, g._pending_message,
                             _topl_joins_snapshot(g._resultMessage))
        : g._pending_message;
    g._pending_message = '';
}

// C ref: hack.c:4022 monster_nearby(void) — TRUE if a hostile, spottable,
// non-helpless monster occupies one of the 8 squares adjacent to the hero.
// moveloop_core (allmain.c:563) calls this after the occupation callback; if it
// returns TRUE the occupation is interrupted (stop_occupation()).  This is what
// turn 15 and breaks the `learn` occupation before its delay counts to 0.
export function monster_nearby() {
    const g = game;
    const u = g.u || {};
    const ux = u.ux | 0, uy = u.uy | 0;
    const hallu = _fumble_hallucinating();
    for (let x = ux - 1; x <= ux + 1; x++) {
        for (let y = uy - 1; y <= uy + 1; y++) {
            if (!isok(x, y) || (x === ux && y === uy))
                continue;
            const mtmp = m_at(x, y);
            if (!mtmp)
                continue;
            // The faithful/fastforward monster roster carries the species index
            // (mnum/mndx), not a full permonst pointer — resolve flags by mndx.
            /* C allmain.c:563 -> monster_nearby() tests mtmp->data; a
             * polymorphed monster's current form can differ from mndx. */
            const mndx = (mtmp.data?.pmidx ?? mtmp.mndx ?? mtmp.mnum ?? -1) | 0;
            // C: skip mimicked furniture/objects (M_AP_FURNITURE/OBJECT).
            const apType = mtmp.m_ap_type | 0;
            if (apType === 1 /* M_AP_FURNITURE */ || apType === 2 /* M_AP_OBJECT */)
                continue;
            // C: hostile-and-can-attack (or hallucinating).  noattacks_mndx is
            // the mndx-keyed form of noattacks(mtmp->data).
            if (!(hallu || (!mtmp.mpeaceful && !noattacks_mndx(mndx))))
                continue;
            // C: not a still-hidden hider (is_hider && mundetected).  Hiders are
            if (mtmp.mundetected && mtmp._is_hider)
                continue;
            // C: not helpless (asleep/frozen).  Our roster tracks mcanmove.
            if (mtmp.mcanmove === false || (mtmp.mfrozen | 0) > 0
                || (mtmp.msleeping | 0))
                continue;
            // C hack.c:4123: !onscary(u.ux, u.uy, mtmp) — a monster scared by
            // the hero's square (Elbereth, scare monster) does not interrupt.
            if (onscary(ux, uy, mtmp))
                continue;
            // C: canspotmon — hero can see or sense it.
            if (!canspotmon(mtmp))
                continue;
            if (typeof process !== 'undefined' && ENV && ENV.FF_MLTRACE === '1') {
                pushRngLogEntry(`^ml_near[x=${x | 0} y=${y | 0} mndx=${mndx | 0}`
                    + ` peaceful=${mtmp.mpeaceful ? 1 : 0} canmove=${mtmp.mcanmove === false ? 0 : 1}`
                    + ` frozen=${mtmp.mfrozen | 0} sleeping=${mtmp.msleeping | 0}`
                    + ` moves=${g.moves | 0} multi=${g.multi | 0}]`);
            }
            return true;
        }
    }
    return false;
}

// C ref: allmain.c:755 stop_occupation() — the learn-occupation interrupt path.
// Clears the occupation and prints "You stop studying." (go.occtxt = "studying").
// nomul(0) and SET_BOTL are RNG-neutral and fold into the next bot().
async function stop_occupation_learn() {
    const g = game;
    if (g.occupation) {
        // C allmain.c:759 — You("stop %s.", go.occtxt).  In C a single
        // stop_occupation() both prints and clears go.occupation, so exactly one
        // "You stop studying." fires per interrupt (whichever site runs first — the
        // attack site mhitu.c:100/1263 or this monster_nearby moveloop check
        // allmain.c:564 — clears the occupation and the other no-ops).  This JS port
        // DEFERS the clear (RNG reasons), splitting emit (js/mhitu.js stop_occupation,
        // mid-combat) from clear (here, post-turn).  g._studyStopMsg is the "already
        // emitted this turn" coordination flag: when a monster ATTACK interrupted the
        // study, mhitu.js already plined "You stop studying." into the combat stream
        // at C's point, so skip the (mis-positioned, post-knockback) re-emission here
        // and only perform the deferred clear.  When the interrupt was mere PROXIMITY
        // (monster_nearby with no landed attack), mhitu never ran and this site is the
        // sole emitter.  The flag is reset per study-turn at the driver loop head.
        if (!g._studyStopMsg) {
            await pline(`You stop ${g.occtxt || 'studying'}.`);
            g._studyStopMsg = true;
        }
        g.occupation = null;
    }
    g.multi = 0;
}

// ════════════════════════════════════════════════════════════════════════════
// ── moveloop_status_paint ───────────────────────────────────────────────────
// C ref: allmain.c:474-480
//     if (disp.botl || disp.botlx) {
//         bot();
//         curs_on_u();
//     } else if (disp.time_botl) {
//         timebot();
//         curs_on_u();
//     }
//
// The moveloop's status paint is GUARDED in C and was unconditional here.  The
// difference is observable through exactly one piece of latched state: bot()
// records `game._botlPaintedCap = near_capacity()` (js/display.js:3996), the
// encumbrance value C's bot2() reads at PAINT time (botl.c:188) and which the
// physical bottom line then holds until the NEXT bot().  Calling bot() on a
// turn where nothing flagged the status line re-latches that value from live
// inventory, so the port showed the CURRENT encumbrance where C still showed
// the one from the last flagged paint.
//
// js/display.js:3354 already reproduces the same two-state rule for the
// pline-flush paint (`if (_d.botl || _d.botlx) game._botlPaintedCap = ...`);
// this is that rule at the other paint site.  Note the else-arm: C's timebot()
// (botl.c) updates only the time field and does NOT re-read near_capacity(),
// so a time-only status update must not re-latch the cap either — our bot()
// clears all three flags, which is why the arms cannot be collapsed.
//
// curs_on_u() (display.c:1726-1730) is flush_screen(1), which every call site
// here already runs unconditionally on the line below; C reaches an equivalent
// flush through the tty read that follows.  Only the bot()/timebot() choice is
// ported here.
async function moveloop_status_paint() {
    const d = game.disp;
    if (d && ((d.botl | 0) || (d.botlx | 0))) {
        await bot();
    } else if (d && (d.time_botl | 0)) {
        timebot();
    }
}

// moveloop_core — FAITHFUL variant (FF_FAITHFUL=1).  Mirrors the calibrated
// merge) but drives the per-turn world block via faithful_moveloop_turn() and
// does the svm.moves++ INSIDE the head block (C's point) instead of at the
// multi).  The occupation / multi<0 / multi>0 special loops are deliberately
// ════════════════════════════════════════════════════════════════════════════
async function moveloop_core_faithful() {
    const g = game;
    // first movemon topline-overflow and lives until flush_screen pages and drops
    // it — and that page happens at the NEXT moveloop_core's flush (the topline
    // accumulated this turn is rendered at the following nhgetch).  Resetting at
    // (`if (_paintedSnapshot) return`) prevents overwriting an unpaged one.
    // C allmain.c:241 — the per-turn world block runs only when the PREVIOUS
    // the calibrated path.
    //
    // ...AND only when the hero is still alive.  C's losehp -> done() (end.c)
    // does not return to its caller: it unwinds the whole stack — the killing
    // command, rhack, and this moveloop_core invocation — into the "You die..."
    // / "Die? [yn]" interaction, so the world turn that the killing command's
    // ECMD_TIME would have bought is NEVER RUN.  This port defers that
    // interaction to the next command-read boundary (js/end.js module header,
    // drained at js/cmd.js:23823), which puts the world block on the WRONG side
    //
    // C's segment stream ends at 5904 leaves and this port drew a further ELEVEN
    // — six mcalcmove rn2(12), maybe_generate_rnd_mon, gethungry and friends —
    // and that phantom turn's find_ac() (allmain.c:453, the only place C
    // recomputes u.uac) repainted AC:9 as AC:10 on all twelve remaining frames
    // while its docrt erased the still-painted fire beam off row 7.
    const incomingMove = !!(g.context?.move ?? 0) && !g._pendingDeath;
    // Per-invocation moveloop_core_faithful entry marker — the JS analogue of C's
    // `^ctx_move[moveloop_core=N umv=N]` boundary.  Lets the per-turn / per-command
    // instruments (rng-slice-diff, turn-diff) read context.move AT EACH INVOCATION
    // ENTRY, so the banked-HEAD-block-vs-command-split ordering (the multi-step
    // the same boundary C records it.  Emitted ONLY when FF_MLTRACE=1
    // (pushRngLogEntry is a no-op unless the rng log is enabled, which only the
    // dev/diff tooling enables) → ZERO effect on scored runs, ZERO RNG consumed.
    if (typeof process !== 'undefined' && ENV && ENV.FF_MLTRACE === '1') {
        const u = g.u || {};
        pushRngLogEntry(
            `^ml_entry[moves=${g.moves | 0} incomingMove=${incomingMove ? 1 : 0}`
            + ` umv=${u.umovement | 0} ux=${u.ux | 0} uy=${u.uy | 0}`
            + ` occ=${g.occupation ? 1 : 0} multi=${g.multi | 0}`
            + ` run=${g.context?.run ? 1 : 0} mv=${g.context?.mv ? 1 : 0}]`);
    }
    // POST-MEAL frame freeze: if a done_eating committed topline is carrying into this
    // moves the pet).  C's cross-turn more() of the done_eating topline freezes the
    // PHYSICAL screen at the prior per-turn flush — the pet's glyph update for this
    // is drawn at its step-4 square during the step-5 --More--, then advances at step 6).
    // DISPLAY-ONLY: snapshots cells, no RNG, no state mutation.
    let _postMealPreFrame = null;
    if (g._occ_committed_topl && g._occ_committed_topl.postMeal) {
        if (g._occPostMealNeedsRefresh) occupation_painted_tick();
        g._occPostMealNeedsRefresh = false;
        // Usually keep the final occupation flush: capturing here would replace
        // C's frozen page frame with the already-advanced post-meal world map.
        _postMealPreFrame = g._occCurFrame;
    }
    if (incomingMove) {
        if (ENV.FF_MATTACK_TRACE === '1')
            pushRngLogEntry(`^ml_pre_world[result=${encodeURIComponent(String(g._resultMessage || '').slice(0,96))} pending=${encodeURIComponent(String(g._pending_message || '').slice(0,96))} force=${g._topl_force_breaks?.length|0}]`);
        // C ref: win/tty/topl.c more().  When this world block is the fireassist
        // swap's banked turn (g._fireSwapPending, set by _doswapweapon_cmd when a
        // dofire is still queued), the swap's deferred prinv line is committed to
        // painted frame + the pre-increment T: so dofire's getdir segment pager can
        // freeze the swap-prinv --More-- page on it ("@d%#", T:N) while the movemon
        // fireassist flag → ZERO effect on any non-fireassist world block.
        if (g._fireSwapPending) {
            g._fireSwapPreFrame = capture_painted_frame();
        }
        // C ref: allmain.c:248 encumber_msg() fires at the TOP of this turn block,
        // BEFORE movemon().  The pickup_prinv ("You have a little trouble lifting
        // ...") committed last turn joins the encumber_msg pline here, so its
        // --More-- pages over the PRE-movemon physical screen (the pet has not
        // moved yet, svm.moves not incremented, and the encumbrance bot() has not
        // displayed (pre-encumber) cap now, before movemon moves the pet; flush
        // on any non-pickup turn.  DISPLAY-ONLY: no RNG, no state mutation.
        if (g._pickupEncMorePending) {
            const f = capture_painted_frame();
            if (f) {
                f.cap = g._pickupEncMorePending.oldcap | 0;
                g._pickupEncPreFrame = f;
            }
        }
        // Snapshot _resultMessage's OWN join offsets NOW, before movemon's fresh
        // plines run and overwrite the single-slot _topl_joins_src side-channel
        // (display.js "tracks one string at a time").  Without this, a command
        // result built from several joined plines (e.g. a RAY spell's self-hit +
        // pet-kill message) loses its internal boundaries by the time the merge
        // below reads them, and is shown as one opaque atomic pline that never
        /* tty_yn_function leaves the answered prompt as dead topline text: a later
         * pline overwrites it rather than joining it (topl.c), so hold it aside
         * across movemon and restore it only if nothing was printed. */
        const _ynStale = (g._resultMessage && g._resultMessage === g._ynStaleTopline)
            ? g._resultMessage : null;
        if (_ynStale) g._resultMessage = '';
        g._ynStaleTopline = null;
        const _resultMsgJoins = _topl_joins_snapshot(g._resultMessage);
        if (g._resultMessage && _resultMsgJoins && _resultMsgJoins.length)
            g._resultMessageJoins = { src: g._resultMessage, joins: _resultMsgJoins.slice() };
        // C allmain.c:245-446 — drive the faithful per-turn do-while: MOVEMON
        // SEER, all from real u.umovement / fmon state.
        await faithful_moveloop_turn();
        // C ref: allmain.c:252-295 — the movemon() plines produced inside the
        // turn above belong to the turn whose rations they spent (one before the
        // post-increment g.moves).  Tag the deferred-message turn so --More--
        // paging renders T: as that turn.  DISPLAY-ONLY (no RNG touched), same as
        // the calibrated path's _movemonMsgTurn tag.
        //
        // The tag names the batch of deferred movemon plines that is pending RIGHT
        // NOW, so it must be RETIRED by the same world block that finds no such
        // plines — C has no tag at all, it just prints svm.moves (botl.c:159
        // `Sprintf(tmmv, "T:%ld", svm.moves)`), and the ONLY reason we deviate is
        // the movemon-before-HEAD-increment window inside faithful_moveloop_turn().
        // Without the else-clear the tag leaked: flush_screen only drops it when it
        // ITSELF paged (display.js `if (hadMore && game._movemonMsgTurn != null)`),
        // so a turn whose movemon message fitted on the topline left the tag armed
        // for every later turn, and the next FORCED more() from a command (dopray's
        // force_more, a getpos/yn prompt) rendered `T:` from that long-dead turn.
        // the turn-274 cobra message's tag, four turns stale, with every other
        // status field byte-identical.
        if (g._pending_message) {
            g._movemonMsgTurn = (g.moves || 1) - 1;
        } else {
            g._movemonMsgTurn = null;
        }
        if (typeof process !== 'undefined' && ENV?.FF_TOPL_TRACE === '1') {
            const _pendingJoins = _topl_joins_snapshot(g._pending_message);
            pushRngLogEntry(
                `^topl_merge_boundary[result=${encodeURIComponent(String(g._resultMessage || ''))}`
                + ` resultJoins=${(_resultMsgJoins || []).join(',')}`
                + ` pending=${encodeURIComponent(String(g._pending_message || ''))}`
                + ` pendingJoins=${(_pendingJoins || []).join(',')}]`);
        }
        // C ref: tty topline concatenation (hero-attack + monster-movement
        // plines share one topline until the next nhgetch).  Identical merge to
        // the calibrated path so screen parity is preserved.  Use _topl_merge_result
        // (not a bare '+') so the per-pline join offsets are REBASED onto the merged
        // string: without this, the merged topline's _topl_joins_src stays keyed to
        // the movemon-only sub-line, _topl_split_for_more can't find the message
        // boundaries, and an overflowing command-result+movemon topline is shown
        // UNPAGED (missing its --More-- pages).  For a surviving turn C always pages
        // an overflow, so the un-rebased merge only ever mismatched on already-failing
        // correctly.  The ettin mummy hits!  ...") that must page across 3 --More--
        // frames before the wizard-mode "You die..." pager, else the death event's
        // recorded keystroke window shifts and the "Die?"/savelife screens misalign.
        if (_ynStale && !g._resultMessage && !g._pending_message) g._resultMessage = _ynStale;
        if (g._resultMessage && g._pending_message) {
            g._resultMessage = _topl_merge_result(g._resultMessage, g._pending_message, _resultMsgJoins);
            g._pending_message = '';
        } else if (!g._resultMessage && g._pending_message) {
            g._resultMessage = g._pending_message;
            g._pending_message = '';
        }
        /* C allmain.c:202-460 vs 485: the fprefx taste line ("This cram ration is
         * bland.") was plined by the starting rhack and is still the committed
         * topline when the first eating turn's movemon interrupts the meal
         * (dochugw -> stop_occupation, "You stop eating X.").  eat_occupation_turn
         * never runs for that turn (the occupation is already cleared), so fold the
         * committed line in FRONT of this turn's plines here, joined or paged by
         * update_topl's fit test. */
        {
            const _oc = g._occ_committed_topl;
            if (_oc && !_oc.postMeal && !g.occupation && g._resultMessage) {
                /* Already folded in front (stop_occupation's pending merge):
                 * a second fold would duplicate the taste line. */
                if (!g._resultMessage.startsWith(_oc.text))
                    g._resultMessage = _topl_merge_result(_oc.text, g._resultMessage,
                                                          _topl_joins_snapshot(_oc.text));
                g._occ_committed_topl = null;
            }
        }
        /* Preserve the per-pline boundaries when this turn's merged result is
         * handed to a later flush_pending_messages() call.  The live join
         * side-channel is otherwise overwritten by the next input boundary. */
        const _mergedResultJoins = _topl_joins_snapshot(g._resultMessage);
        if (g._resultMessage && _mergedResultJoins && _mergedResultJoins.length)
            g._resultMessageJoins = { src: g._resultMessage, joins: _mergedResultJoins.slice() };
        if (typeof process !== 'undefined' && ENV?.FF_TOPL_TRACE === '1') {
            pushRngLogEntry(
                `^topl_merge_result[result=${encodeURIComponent(String(g._resultMessage || ''))}`
                + ` joins=${(_mergedResultJoins || []).join(',')}]`);
        }
        // C ref: win/tty/topl.c update_topl/more().  After an eat occupation ends, the
        // done_eating topline ("You're finally finished." / "You finish eating X.") was
        // shown at the meal's last per-turn flush and is still the committed topline
        // (_occ_committed_topl.postMeal).  This post-meal turn's movemon may pline (the
        // an un-acknowledged topline: JOIN when the two fit the CO-1-8 reserve, force a
        // cross-turn more() only when they do not.
        //
        // PREVIOUSLY this forced more() unconditionally, on the theory that C "still
        // cols) is itself >= TOPL_LIMIT (71) and so was ALWAYS going to fail the
        // ordinary join test; it never demonstrated an exception to it, so the
        // "regardless of width" reading was unproven.  Corrected to run the same
        // still force a page here) — this is a correctness fix for the general rule, not
        //
        // "You finish eating the cram ration.  Sirius misses the lichen." vs this port's
        // "Sirius misses the lichen.  You finish eating the cram ration.--More--") is NOT
        // fixed by this block — it is already wrong by the time eat_occupation_turn()
        // commits `thisTurnMsg` above (the finishing turn's OWN movemon pline is ordered
        // before its done_eating pline), which this block never revisits.  See the
        const pm = g._occ_committed_topl;
        if (pm && pm.postMeal) {
            // The done_eating committed topline (pm.text) lives only in this bookkeeping
            // (it was NOT left in the message channel at meal end).  _resultMessage now
            // holds PURELY this post-meal turn's fresh movemon pline (the pet pickup / a
            // nearby combat miss).
            const movemonMsg = g._resultMessage || '';
            if (movemonMsg) {
                const joinsPm = _topl_joins_committed(pm.text, movemonMsg.split('  ')[0]);
                if (joinsPm) {
                    // C update_topl: fits the CO-1-8 reserve → Strcat the two onto one
                    // topline, no --More--.  The done_eating message keeps its place
                    // (it was committed first); the movemon pline is appended after it.
                    g._resultMessage = _topl_merge_result(pm.text, movemonMsg,
                                                           _topl_joins_snapshot(pm.text));
                    g._movemonMsgTurn = (g.moves || 1) - 1;
                } else {
                    // C cross-turn more(): the fresh pline pages the done_eating topline,
                    // freezing the PHYSICAL screen at the PRE-turn frame (the pet's move
                    // this turn is deferred until the --More-- releases) — C steps 5/6.
                    const pmUhs = (g.u && g.u.uhs != null) ? (g.u.uhs | 0) : null;
                    await occupation_force_more(pm.text, _postMealPreFrame, (g.moves | 0) - 1, pmUhs);
                    // The movemon pline becomes the committed topline / result line, read
                    // at the next rhack(0) restore like any command result.
                    g._resultMessage = movemonMsg;
                    g._movemonMsgTurn = (g.moves || 1) - 1;
                }
            } else {
                // No post-meal movemon pline: the done_eating topline stays committed and
                // is read at the next rhack(0) like a normal command result line.
                g._resultMessage = pm.text;
            }
            // Post-meal carry consumed; further paging uses the normal width-based path.
            g._occ_committed_topl = null;
        }
    }
    // C ref: allmain.c:495-510 — the "once-per-player-input things" block, which
    // runs after the per-turn world block and BEFORE the vision/bot()/flush that
    // paints the frame this input is read against.  find_ac() recomputes u.uac
    // from the worn slots and SET_BOTL()s when it changed.  Everywhere else in
    // this port u.uac is already kept current by the do_wear.c call sites, so
    // this is a no-op recompute; the one path that mutates the worn slots WITHOUT
    // a find_ac() is C's own tutorial gamestate stash (nhlua.c:1926-1937
    // setnotworn()+freeinv() for every inventory item — worn.c:147 setnotworn
    // does NOT call find_ac), where C relies on exactly this per-input recompute.
    // frames (steps 17-18, painted from inside goto_level before moveloop_core
    // comes back around) and AC:10 from the first post-arrival input (step 19).
    // RNG-free.
    //
    // same C reason: allmain.c:453 sits in the once-per-player-input block, and
    // losehp -> done() never returns to it.  find_ac() is the ONLY place C
    // recomputes u.uac (erode_obj does not; the thirteen other call sites are
    // do_wear/polyself/spell paths), so a hero killed while wearing armor the
    // bolt and C renders AC:9 for all twelve frames after it, where this port
    // recomputed AC:10.
    const _u_aw = g.u || {};
    if (!g._pendingDeath && (_u_aw.uhave && _u_aw.uhave.amulet)
        && !(_u_aw.uevent && _u_aw.uevent.amulet_wish)) {
        _u_aw.uevent = _u_aw.uevent || {};
        _u_aw.uevent.amulet_wish = 1;
        /* display_nhwindow(WIN_MESSAGE, TRUE) — an unconditional page-ack of
         * whatever is standing on the topline, regardless of width.  C's
         * arrival plines page as they are emitted (each pline's own more());
         * this port accumulates the whole window into _resultMessage and lets
         * flush_screen's width rule split it at the next input, so the
         * unconditional break has to be registered against that accumulator's
         * LAST segment rather than against _pending_message (which is empty
         * here).  Without it the wish text joins "It is hot here." on one
         * topline and every page boundary from step 103 on is one message out.
         * Segments are joined with two spaces, the same boundary
         * topl_force_break_now() reads out of _topl_joins. */
        {
            /* C's arrival plines page as they are emitted (each pline's own
             * more()); this port banks the whole goto_level window into
             * _resultMessage and paints it at the NEXT command's frame, which
             * is invisible as long as nothing prints in between.  Here
             * something does, so hand the banked window back to the live
             * topline accumulator first — otherwise the wish text pages on its
             * own topline AHEAD of "You materialize on a different level!" and
             * the whole tail is reordered.  The join offsets already on record
             * are keyed to that string, so they survive the move. */
            const _carry = String(g._resultMessage || '');
            if (_carry) {
                g._resultMessage = null;
                g._pending_message = g._pending_message
                    ? _topl_merge_result(_carry, g._pending_message,
                                         _topl_joins_snapshot(_carry) || undefined)
                    : _carry;
                const _cut = _carry.lastIndexOf('  ');
                topl_force_break_after(_cut >= 0 ? _carry.slice(_cut + 2) : _carry);
            }
        }
        await urgent_pline('The Amulet is bestowing a wish upon you!');
        await makewish();
    }
    if (!g._pendingDeath)
        find_ac();
    if (typeof process !== 'undefined' && ENV?.FF_DISPLAY_TRACE === '1') {
        pushRngLogEntry(`^vision_boundary[phase=before_redraw moves=${g.moves | 0} mv=${g.context?.mv ? 1 : 0} blind=${Blind() ? 1 : 0} full=${g.vision_full_recalc ? 1 : 0}]`);
    }
    faithful_input_redraw();
    if (typeof process !== 'undefined' && ENV?.FF_DISPLAY_TRACE === '1') {
        pushRngLogEntry(`^vision_boundary[phase=after_redraw moves=${g.moves | 0} mv=${g.context?.mv ? 1 : 0} blind=${Blind() ? 1 : 0} full=${g.vision_full_recalc ? 1 : 0}]`);
    }
    // ===================== CARRIED-OVER multi<0 COUNTDOWN (pre-rhack) ============
    // C ref: allmain.c:514-536 — the dispatch tail is
    //     if (gm.multi > 0) { ...run/repeat... }
    //     else if (gm.multi == 0) { rhack(0); }
    // so an invocation entered with gm.multi < 0 reads NO KEY AT ALL: it runs its
    // head world block (whose allmain.c:433-441 tail does ++gm.multi / unmul) and
    // returns.  C therefore burns one whole moveloop_core invocation PER delayed
    // turn before the next nhgetch, and every one of those turns is banked into the
    // frame the next keystroke is read against.
    //
    // The countdown loop further down this function (the "multi<0 OCCUPATION
    // COUNTDOWN" block) drains a nomul() that rhack ITSELF scheduled, but it sits
    // BEFORE the multi>0 run loop, so a nomul() fired from INSIDE that run loop —
    // i.e. from a run/travel domove — is left undrained when moveloop_core returns.
    // The next invocation then walked straight into rhack with multi still negative,
    // had been read.
    //
    // hack.c:2983-2988 nomul(-2)s for "dragging an iron ball" from inside the run
    // loop, and C renders T:122 at the next nhgetch (turn 120 + the two dragged
    // turns) where this port rendered T:120 and ran turns 121/122 during the NEXT
    // keystroke.  Draining here — after the head world block, before the
    // vision/bot()/flush_screen that paints the frame this input is read against —
    //
    // owns every nomul() that rhack schedules (it leaves multi == 0 behind), so on
    let headCountdownGuard = 0;
    while ((g.multi | 0) < 0) {
        // Finish the current C moveloop_core before starting the next one.
        // Negative multi skips rhack, not the end_turn tail. The iteration
        // that clears multi instead reaches rhack below and dispatches there.
        g.context.move = 1;
        g.u.umoved = false;
        if (g.u.utotype) await deferred_goto();
        if (g.vision_full_recalc) vision_recalc(0);
        await nh_callback_run(NHCB_END_TURN);
        // C ref: allmain.c:243-446 — one delayed turn: the faithful per-turn
        // do-while, including the ++gm.multi / unmul that terminates this loop.
        await faithful_moveloop_turn();
        // C ref: allmain.c:453 — the once-per-player-input find_ac() of the SAME
        // moveloop_core call, which runs AFTER that call's world block.  See the
        const redoVision = !(g.context && g.context.mv) || Blind();
        find_ac();
        faithful_input_redraw();
        if (redoVision && g.vision_full_recalc) {
            vision_recalc(0);
            g.vision_full_recalc = 0;
        }
        // C allmain.c:513 — see the post-rhack countdown loop's note.
        g.u.umoved = false;
        if (++headCountdownGuard >= 4096) break; // safety: never spin on broken multi
    }
    if (headCountdownGuard) {
        // unmul()'s nomovemsg went to the pending channel inside the last turn;
        // commit it before the frame is painted, exactly as the post-rhack loop does.
        _merge_countdown_pline();
        // The post-rhack block reads this flag to suppress the NEXT head's world
        // block.  Here the countdown finished BEFORE rhack, and C's allmain.c:540
        // sets svc.context.move = 1 immediately below regardless, so the flag must
        // not survive into that block and cancel the world turn of the command
        // rhack is about to run.
        g._ff_countdown_done = false;
    }
    // Vision + display (shared with calibrated path).
    if (g.vision_full_recalc) {
        if (typeof process !== 'undefined' && ENV?.FF_DISPLAY_TRACE === '1') {
            pushRngLogEntry(`^vision_boundary[phase=before_recalc moves=${g.moves | 0} mv=${g.context?.mv ? 1 : 0} blind=${Blind() ? 1 : 0} full=1]`);
        }
        vision_recalc(0);
        g.vision_full_recalc = 0;
        if (typeof process !== 'undefined' && ENV?.FF_DISPLAY_TRACE === '1') {
            pushRngLogEntry(`^vision_boundary[phase=after_recalc moves=${g.moves | 0} full=${g.vision_full_recalc ? 1 : 0}]`);
        }
    }
    await moveloop_status_paint();
    await flush_screen(1);
    const preMoveUz = g.u && g.u.uz
        ? { dnum: g.u.uz.dnum, dlevel: g.u.uz.dlevel }
        : null;
    // C allmain.c:481 — m_everyturn_effect(&gy.youmonst): a polyed hero (fog
    // cloud) leaves vapor each turn; draws rn2(3) at region.c:1303.
    if (g.youmonst && g.youmonst.data) m_everyturn_effect(g.youmonst);
    // C allmain.c:540 — context.move = 1 unconditionally before rhack.
    g.context = g.context || {};
    g.context.move = 1;
    // ===================== EAT OCCUPATION CONTINUATION (faithful, before rhack) ===
    // C ref: allmain.c:543-558 — `if (gm.multi >= 0 && go.occupation) { (*go.occupation)();
    // ...; return; }` runs BEFORE the multi/rhack tail.  When an eat occupation is
    // active, C's outer for(;;) re-enters moveloop_core, runs the FULL per-turn world
    // block at the TOP (already done above via the incomingMove faithful_moveloop_turn —
    // this turn's movemon/HEAD/gethungry), then calls (*go.occupation)() == eatfood()
    // ONCE and RETURNS without reading a key.  So each eating turn is its OWN
    // moveloop_core invocation and the per-turn lesshungry/done_eating plines page
    // turn-by-turn (each new pline more()s the prior committed topline, consuming the
    // recorded space key) instead of being batched onto one topline.  This is the
    // continuation path (turns 2..N): the FIRST eating turn's world block already ran
    // above (incomingMove), so run the occupation callback + page here and RETURN.
    if (g.occupation === eatfood && (g.multi | 0) >= 0) {
        await eat_occupation_turn();
        // C allmain.c:557 — return after (*go.occupation)(); the outer for(;;) re-enters
        // moveloop_core for the next eating turn (or, once occupation cleared, for the
        // post-meal turn whose rhack reads the next recorded command).
        return;
    }
    // C ref: allmain.c:513 — `u.umoved = FALSE;`, immediately after the
    // occupation block returns and before the gm.multi / rhack tail.  Note the
    // occupation early-return above (C allmain.c:557) happens BEFORE this line,
    // so a turn spent inside an occupation leaves u.umoved alone, exactly as C
    // does.  Without the reset the flag latched TRUE at the hero's first step
    // and never cleared, which would make allmain.c:119's steed branch fire on
    // turns the hero did not move (the mount turn itself is one).
    g.u.umoved = false;
    // The message channel as it stood BEFORE the command ran — see the
    // post-rhack clear below, where it separates the command's OWN result line
    // from plines that were already on the channel when rhack was entered.
    const _preRhackMsg = g._pending_message || '';
    g._preMsgCleared = false;
    await rhack(0);
    // C ref: allmain.c:608-609 — if (u.utotype) deferred_goto(); /* after rhack() */
    // Executes any level change scheduled by schedule_goto() (e.g. wiz_level_tele /
    if (g.u?.utotype) {
        await deferred_goto();
    }
    if (g.context?.move) {
        // C ref: win/tty/topl.c — the command's own pline stays on the topline
        // until the next tty_nhgetch.  In the common time-consuming-command case
        // the per-turn movemon plines of the NEXT turn replace it, so we clear it
        // here.  EXCEPTION: a command that started a multi<0 OCCUPATION this
        // dispatch (e.g. dopray's nomul(-3): "You begin praying to <god>.") leaves
        // its begin-message on the topline so the occupation-end messages
        // (unmul's nomovemsg "You finish your prayer." + afternmv prayer_done's
        // "You feel that <god> is displeased.") CONCATENATE with it on one topline,
        // overflowing CO-1 and triggering the faithful --More-- boundary
        // (pray.c:2140 begin + 2262 nomovemsg + prayer_done).  Don't wipe it.
        // SAME EXCEPTION for the learn occupation: study_book's begin message
        // ("You begin to memorize the runes.") must stay on the topline so the
        // study's per-turn movemon plines CONCATENATE onto it and page with the
        // effect on any non-learn command.
        // AND THE SAME EXCEPTION FOR THE TIN-OPENING OCCUPATION: start_tin's
        // begin message ("It is not so easy to open this tin.") must stay on
        // the topline so consume_tin's "You succeed in opening the tin." and
        // the occupation turns' movemon plines CONCATENATE onto it and page at
        //   "It is not so easy to open this tin.  You succeed in opening the
        //    tin.--More--"
        // as ONE topline (35 + 2 + 31 = 68 <= CO-1-8), which is only reachable
        // g.occupation === opentin → no effect on any non-tin command.
        if ((g.multi | 0) >= 0 && g.occupation !== learn && g.occupation !== opentin) {
            // ...but "replace" is not "destroy".  C never erases the topline
            // here at all: tty_nhgetch clears it at the START of the next key
            // pline is still on the topline at the very next input boundary and
            // the following turn's movemon plines CONCATENATE onto it
            // (topl.c:257-266).  Clearing it outright dropped the line, which is
            // trapmove's "You are caught in a bear trap." (ce1bdfd5), dosearch0's
            // rendered as an EMPTY topline — each one correctly generated and
            // then destroyed.  The first two were patched at their own call
            // sites; this is the same repair made once, structurally, so every
            // remaining turn-consuming command is covered without a per-site
            // stash.
            //
            // Hand the line to _resultMessage, the command-result channel that
            // survives to the next nhgetch and that the moveloop already merges
            // the next turn's movemon plines onto — exactly C's topline
            // behaviour.  TWO GUARDS, both load-bearing:
            //
            //   !_preRhackMsg — only a message the COMMAND produced is a command
            //     result.  A channel that was already non-empty when rhack was
            //     entered holds the moveloop's own plines, and carrying those
            //     forward strands the rest of their sequence: a counted search
            //     ('20s') re-enters with "The little dog misses the jackal." still
            //     pending, and stashing it loses "The little dog bites the
            //     3912 -> 3029.
            //   !_resultMessage — a command that already published a result line
            //     (do_attack, moverock, the dotrap arm) owns the channel; this
            //     must not overwrite it.  Same precedence those call sites use.
            //
            // is unchanged at 190562.
            // C cmd.c do_cmdq_extcmd does not read a key between queued
            // commands; tty topl.c therefore retains the previous command's
            // topline. Preserve the continuation's plines and their pager
            // boundaries before clearing the live channel. For example,
            // wield-then-rub must retain both messages across its two turns.
            if (g._commandFromQueue && g._pending_message) {
                _topl_stash_result();
            } else if (g._teleportResultPublished && g._pending_message) {
                /* dotele() calls morehungry(100) after teleds.  In this
                 * wizard teleport path C's later hunger pline is the command
                 * result visible at the next boundary; the earlier teleport
                 * channel has already been consumed by the destination prompt.
                 * Preserve the later line instead of dropping it with the
                 * generic stale-topline clear. */
                g._resultMessage = g._pending_message;
                const _j = _topl_joins_snapshot(g._resultMessage) || [];
                g._resultMessageJoins = { src: g._resultMessage, joins: _j.slice() };
            } else if ((!_preRhackMsg || g._attackPublished
                        || g._preMsgCleared
                        || !String(g._pending_message || '').startsWith(_preRhackMsg))
                && g._pending_message && !g._resultMessage) {
                /* A pre-existing line that an input read (getdir's nhgetch,
                 * input.js) cleared during this rhack is no longer on the
                 * channel; whatever is pending now was produced by the command
                 * ("The door resists!", lock.c:918).  A leftover that was NOT
                 * cleared stays as the prefix of the pending text. */
                g._resultMessage = g._pending_message;
            }
            g._pending_message = '';
        }
    }
    /* One-shot: the markers describe THIS dispatch only. */
    g._attackPublished = false;
    g._teleportResultPublished = false;
    if (preMoveUz && g.u && g.u.uz) {
        if (g.u.uz.dnum !== preMoveUz.dnum || g.u.uz.dlevel !== preMoveUz.dlevel) {
            emitMapstate('after_goto_level');
        }
    }
    // C allmain.c:541-542: command effects (including trap entry) can
    // invalidate vision after domove's earlier recalc. Apply that update
    // before the next invocation advances monsters or an occupation.
    if (g.vision_full_recalc)
        vision_recalc(0);
    // ===================== go.occupation DRIVER — DIG (faithful) =====================
    // C allmain.c:558: end-turn callbacks follow command and vision effects,
    // before the next invocation's occupation/world block.
    await nh_callback_run(NHCB_END_TURN);
    // C ref: allmain.c:543-558 — when gm.multi>=0 and go.occupation is set, C's
    // outer for(;;) re-enters moveloop_core, runs the FULL per-turn world block,
    // then calls (*go.occupation)()  and RETURNS before rhack — NO key is read
    // across the span.  rhack (above) just dispatched the '>' apply-pick-axe →
    // use_pick_axe2 → set_occupation(dig), context.move=1.  Drive the dig
    // occupation to completion HERE: each turn = one faithful per-turn world
    // block (faithful_moveloop_turn, C's allmain.c:243-446) followed by dig()
    // (the effort rn2(5) at dig.c:366, terminating in the digactualhole pit
    // rn1(4,2) at dig.c:739).  The number of turns falls out of the C effort
    if (g.occupation === dig && (g.multi | 0) >= 0) {
        let digGuard = 0;
        const _digHorizontal = !!(g.context && g.context.digging && !g.context.digging.down)
            && !g._digFromApply;
        g._digFromApply = false;
        if (_digHorizontal) {
            // ── HORIZONTAL (wall) autodig — per-turn paged like the learn driver ──
            // C: each occupation turn runs dig() (effort rn2(5), occasionally a
            // pline: "You hit the rock..." / "You make an opening...") THEN that
            // turn's movemon (whose pet plines, e.g. "The little dog picks up a
            // looking glass.", append to the same topline).  win/tty/topl more()
            // pages the accumulated topline whenever it overflows CO-1, freezing
            // steps 12-19).  Mirror with a per-turn flush_screen(1): the begin
            // message "You start digging." (saved to _resultMessage by the autodig
            // branch) seeds the topline; each turn's dig()+movemon plines append;
            // flush_screen pages every overflow.  RNG order: dig() before movemon
            // (the C trace HEAD→dig→movemon — the dig already pinned the hero).
            if (g._resultMessage) {
                g._pending_message = g._pending_message
                    ? g._resultMessage + '  ' + g._pending_message
                    : g._resultMessage;
                g._resultMessage = null;
            }
            while (g.occupation === dig && digGuard++ < 4096) {
                const r = await dig();
                if (r === 0) g.occupation = null;
                await faithful_moveloop_turn();
                // Page this turn's accumulated topline (the dig + movemon plines).
                if (g.vision_full_recalc) {
                    vision_recalc(0);
                    g.vision_full_recalc = 0;
                }
                await moveloop_status_paint(); // C allmain.c:474 — guarded status paint
                await flush_screen(1);
            }
            // The final (non-overflowing) topline remainder stays on
            // _pending_message; hand it to _resultMessage so the next rhack(0)
            // until the next nhgetch).
            if (g._pending_message) {
                _topl_stash_result();
            }
            g.context = g.context || {};
            g.context.move = 0;
        } else {
        let digInterrupted = false;
        while (g.occupation === dig && digGuard++ < 4096) {
            // C allmain.c:243-446 — a full new per-turn world block for this
            // occupation turn (movemon + HEAD; svm.moves++ inside).
            await faithful_moveloop_turn();
            // The world block's own stop_occupation() (distfleeck/dochugw,
            // then false, dig() does not run, and no further world block follows
            // (rhack reads the next key).
            if (g.occupation !== dig) {
                digInterrupted = true;
                break;
            }
            // C allmain.c:556 — (*go.occupation)() == dig(); 0 ends the occupation.
            const r = await dig();
            if (r === 0) g.occupation = null;
            // C allmain.c:504-507 — monster_nearby() → stop_occupation() +
            // reset_eat(); the return leaves context.move 1, so the next
            // moveloop_core runs one more world block (the post-occupation turn).
            if (g.occupation === dig && monster_nearby()) {
                await stop_occupation();
                reset_eat();
            }
        }
        // C ref: win/tty/topl.c — the dig occupation's terminating message
        // topline as the occupation's begin-message ("You start digging
        // downward.", dig.c:1349), which rhack saved into _resultMessage.  Both
        // share one topline until the next tty_nhgetch.  The dig() pline above set
        // _pending_message (the begin-message was cleared by moveloop_core's
        // post-rhack wipe), so merge it into _resultMessage now — identical merge
        // to the per-turn movemon merge at moveloop_core (above) — so the next
        // rhack(0) restore renders the full combined topline.  DISPLAY-ONLY (the
        // pit pline / set_utrap RNG already fired inside dig()); no RNG here.
        if (g._pending_message) {
            _topl_stash_result();
        }
        // C ref: allmain.c:241-446 — after the occupation clears (go.occupation=0),
        // C's outer for(;;) re-enters moveloop_core and runs ONE post-occupation
        // turn's world block at the TOP (context.move still 1 from the last
        // occupation turn) BEFORE rhack reads the next key.  For the pit dig this is
        // the turn where the hero is freshly pit-trapped: its movemon moves the pet
        // one more step, and that final position is what C's post-dig screen shows
        // (the dig-step screen reflects the post-occupation turn, not the
        // (e.g. the pet at its post-occupation-turn square, possibly out of the
        // pit's reduced 3x3 sight and therefore not drawn) instead of deferring it
        // a full step (which left every dark-room dig screen one turn behind C).
        // RNG-order preserved: this block's leaves are the same calls in the same
        // order — they merely run in this slice (where C records them) rather than
        // the next command's slice.  Then suppress the NEXT head's spurious block
        // (the banked turns are spent), matching the multi<0 countdown tail.
        //
        // HORIZONTAL (wall) dig: the breaking turn ran dig()-then-movemon INSIDE
        // the loop (dig-first ordering), so its movemon already fired — there is
        // NO separate post-occupation turn (C's wall-break turn is an ordinary
        // turn; the next key is the next command).  Skip the extra turn here, else
        // JS runs one turn too many and the hero's subsequent moves lag C by one
        // post-occupation turn (its breaking turn ran movemon-then-dig).
        if (!_digHorizontal && !digInterrupted) {
            await faithful_moveloop_turn();
        }
        // The post-occupation turn's movemon plines (if any) share the dig topline
        // until the next nhgetch — merge into _resultMessage like the per-turn merge
        // in moveloop_core, so the combined "You start digging... You dig a pit..."
        // line is preserved and any movemon pline appends after it.
        if (g._pending_message) {
            _topl_stash_result();
        }
        if (g.vision_full_recalc) {
            vision_recalc(0);
            g.vision_full_recalc = 0;
        }
        await moveloop_status_paint(); // C allmain.c:474 — guarded status paint
        await flush_screen(1);
        g.context = g.context || {};
        g.context.move = 0;
        } /* end pit-dig (non-horizontal) branch */
    }
    // ===================== go.occupation DRIVER — LEARN (faithful) ================
    // C ref: allmain.c:543-565 — when gm.multi>=0 and go.occupation is set, the
    // outer for(;;) re-enters moveloop_core, runs the FULL per-turn world block,
    // calls (*go.occupation)() == learn(), then checks monster_nearby() and
    // (if a hostile monster is adjacent) stop_occupation()s — all WITHOUT reading
    // a key — and RETURNS before rhack.  rhack (above) just dispatched the read
    // command 'p' → doread → study_book → set_occupation(learn), context.move=1.
    //
    // Drive the learn occupation to its terminating point HERE, modelled exactly
    // on the dig/eat drivers above: each turn = one faithful per-turn world block
    // (faithful_moveloop_turn) followed by learn() (the delay countdown), THEN the
    // of-death book schedules an 80-turn delay, but a wandering monster reaches an
    // adjacent square at turn 15 → monster_nearby() fires → stop_occupation()
    // ("You stop studying.").  The number of turns falls out of the world state,
    if (g.occupation === learn && (g.multi | 0) >= 0) {
        let learnGuard = 0;
        // The study's begin message ("You begin to memorize the runes.") is on
        // _pending_message (preserved above).  Each study turn's movemon/dosounds
        // plines + learn()'s completion line CONCATENATE onto it (pline appends with
        // a "  " boundary).  C's update_topl/more() pages the accumulated topline
        // whenever it overflows CO-1, freezing the screen and consuming a recorded
        // space key — that is what flush_screen(1) does here (it splits at the
        // recorded message-join boundaries and more()s each overflow page via
        // nhgetch).  We flush AFTER each turn so the spaces are consumed at C's
        // page points, keeping the recorded-step alignment (otherwise the surplus
        // spaces leak to rhack as "Unknown command" and JS races ahead into the
        // next command's RNG).
        let interrupted = false;
        // Per-STUDY reset of the "You stop studying." coordination flag (once, before
        // the study's turns run — NOT per loop-iteration).  js/mhitu.js stop_occupation
        // sets g._studyStopMsg when a monster attack interrupts the study mid-combat,
        // so the message prints exactly once even across a monster's multiple same-turn
        // hits AND across the (deferred-clear) extra driver turn — the deferred-clear
        // path below (stop_occupation_learn) checks the same flag and skips its own,
        // mis-positioned re-emission.  This mirrors C, where a single stop_occupation()
        // both prints "You stop studying." and clears go.occupation so re-entry can't
        // re-emit; here the clear is deferred, so the flag carries the "already emitted"
        // signal across this study's turns.  It is reset here (once per study, since the
        // driver is entered once per read/study command) rather than per iteration —
        // resetting each iteration re-armed the message on the second driver turn and
        // produced a duplicate "You stop studying." AFTER the knockback line, whose
        // the wizard-mode "Die?"/savelife death event's keystroke desync.
        g._studyStopMsg = false;
        while (g.occupation === learn && learnGuard++ < 4096) {
            // C allmain.c:243-446 — one full per-turn world block (movemon + HEAD;
            // svm.moves++ inside).  Drains the per-turn RNG (mcalcmove, dosounds,
            // gethungry, monster moves) exactly as C records it during the study.
            // pline()s from this turn append onto the study topline (_pending_message).
            await faithful_moveloop_turn();
            // C allmain.c:556 — (*go.occupation)() == learn(); 0 ends the study.
            // learn()'s completion line ("You learn ..." / "You add ...") also
            // appends onto the study topline.
            // A stop_occupation() inside the world block already cleared
            // go.occupation; C then never calls the callback (allmain.c:556).
            const r = (g.occupation === learn) ? await learn() : 1;
            if (r === 0)
                g.occupation = null;
            else if (g.occupation !== learn)
                // The world turn's own stop_occupation() (distfleeck/dochugw,
                // allmain.c:684) already printed "You stop studying." and cleared
                // go.occupation: C has no further turn (allmain.c:485-565).
                interrupted = true;
            // C allmain.c:562-565 — monster_nearby() → stop_occupation() (only while
            // the study is still active).  When a hostile monster is adjacent the
            // study is interrupted; stop_occupation plines "You stop studying." onto
            // the topline.  The interrupt fires DURING this turn's world block in C
            // (dochugw, the instant the monster moves adjacent), so this turn IS the
            // last turn — no separate post-occupation turn follows (unlike the
            // normal-completion case, where C runs one more world turn after learn()
            // returns 0).
            // C allmain.c:503-509 runs this check AFTER the occupation callback and
            // then `return`s with context.move still 1, so (unlike a stop inside the
            // world block above) the NEXT moveloop_core runs one more world block
            // before rhack() reads a key: `interrupted` stays false and the
            // monster ATTACK already emitted "You stop studying." inside the world
            // block (g._studyStopMsg, set by js/mhitu.js stop_occupation), C's stop
            // happened there and no extra block follows; this check is then only the
            // deferred clear.
            if (g.occupation === learn && monster_nearby()) {
                const stoppedInBlock = !!g._studyStopMsg;
                await stop_occupation_learn();
                if (stoppedInBlock)
                    interrupted = true;
            }
            // C win/tty/topl.c — page the accumulated topline now (this turn's
            // movemon map is the frozen frame).  flush_screen more()s every overflow
            // page, each consuming one recorded space key; if nothing overflows it
            // just repaints.  The final (non-overflowing) remainder stays on
            // _pending_message and is read at the next rhack(0) like any command line.
            if (g.vision_full_recalc) {
                vision_recalc(0);
                g.vision_full_recalc = 0;
            }
            await moveloop_status_paint(); // C allmain.c:474 — guarded status paint
            await flush_screen(1);
        }
        // C ref: allmain.c:543-565 — when the study completes NORMALLY (learn()
        // returned 0), C's outer for(;;) re-enters moveloop_core ONCE MORE with
        // context.move still 1 and runs a full NORMAL post-occupation turn (its
        // after the create-monster study completes) BEFORE rhack reads the next
        // recorded command.  Run that turn eagerly here (the dig-driver pattern),
        // then suppress the next head's spurious block (context.move = 0).  In the
        // INTERRUPT case this is skipped: stop_occupation fired DURING the last
        // turn's world block (which already ran), so no extra turn follows.
        if (!interrupted) {
            await faithful_moveloop_turn();
            if (g.vision_full_recalc) {
                vision_recalc(0);
                g.vision_full_recalc = 0;
            }
            await moveloop_status_paint(); // C allmain.c:474 — guarded status paint
            await flush_screen(1);
        }
        g.context = g.context || {};
        g.context.move = 0;
    }
    // ===================== go.occupation DRIVER — OPENTIN (faithful) ==============
    // C ref: allmain.c:485-509 — rhack just dispatched 'e' → doeat → start_tin
    // (eat.c:1723), which plined "It is not so easy to open this tin." and set
    // go.occupation = opentin with context.move = 1 (ECMD_TIME).  Drive the
    // tin-opening occupation to completion HERE, modelled on the LEARN driver
    // rather than the picklock one, because opentin's turns PAGE: each turn's
    // movemon plines land on the still-occupied tin topline and C's
    // update_topl/more() freezes the screen and eats a recorded key whenever the
    // accumulated line overflows CO-1-8.  That is exactly what the per-turn
    // flush_screen(1) below reproduces.
    //
    // The turn COUNT is not hardcoded: it is svc.context.tin.reqtime, which
    // start_tin drew as rn1(1 + 500 / (ACURR(A_DEX) + ACURRSTR), 10).
    if (g.occupation === opentin && (g.multi | 0) >= 0) {
        let tinGuard = 0;
        let tinInterrupted = false;
        while (g.occupation === opentin && tinGuard++ < 4096) {
            // C allmain.c:209 — the head world block of THIS moveloop_core
            // invocation, run under C's own `if (svc.context.move)` test.  The
            // is `rn2(24) @ start_tin` → `^ctx_move[rhack=1]` → the turn-12
            // world block → `^ctx_move[moveloop_core=1]` → opentin().
            if (g.context && g.context.move) await faithful_moveloop_turn();
            // C allmain.c:483 — svc.context.move = 1, unconditionally, ahead of
            // the occupation call.  This is the `^ctx_move[moveloop_core=1]`
            // marker that sits immediately before each opentin() in the trace.
            g.context = g.context || {};
            g.context.move = 1;
            // C allmain.c:496 — (*go.occupation)() == opentin(); 0 ends it.
            // On the last call opentin() runs consume_tin(), whose "You succeed
            // in opening the tin." / "It smells like <plural>." plines and
            // "Eat it?" prompt all fire from inside this call.
            const r = await opentin();
            if (r === 0) g.occupation = null;
            // C allmain.c:504-507 — monster_nearby() → stop_occupation() +
            // reset_eat(), the SAME interrupt every occupation takes.  It is
            // NOT interrupt its 31-turn open in the recording.
            if (g.occupation === opentin && monster_nearby()) {
                await stop_occupation();
                reset_eat();
                tinInterrupted = true;
            }
            // C win/tty/topl.c — page the accumulated topline now; this turn's
            // movemon map is the frozen frame.  flush_screen more()s every
            // overflow page, each consuming one recorded key.
            if (g.vision_full_recalc) {
                vision_recalc(0);
                g.vision_full_recalc = 0;
            }
            await moveloop_status_paint(); // C allmain.c:474 — guarded status paint
            await flush_screen(1);
        }
        // C ref: allmain.c:209 — the occupation has cleared with context.move
        // still 1, so C's next moveloop_core runs ONE more world block before
        // rhack reads the next key.  Run it here and suppress the next head
        // (context.move = 0), the dig/learn/picklock driver pattern.  Skipped on
        // the interrupt path for the learn driver's reason: stop_occupation
        // fired DURING the last turn's block, which already ran.
        if (!tinInterrupted) {
            await faithful_moveloop_turn();
            if (g.vision_full_recalc) {
                vision_recalc(0);
                g.vision_full_recalc = 0;
            }
            await moveloop_status_paint(); // C allmain.c:474 — guarded status paint
            await flush_screen(1);
        }
        g.context = g.context || {};
        g.context.move = 0;
    }
    // ===================== go.occupation DRIVER — ENGRAVE (faithful) ===============
    // C ref: allmain.c:539-558 — rhack just dispatched 'E' → doengrave, which did the
    // stylus/getlin/smudge setup and set go.occupation = engrave, leaving
    // svc.context.move = 0 (doengrave returns ECMD_OK; engrave.c:1257 — the setup
    // itself consumes no time, the occupation does).  Unlike the dig/learn drivers,
    // engrave runs its callback with NO preceding per-turn world block: C's
    // moveloop_core sets context.move=1, runs (*go.occupation)() == engrave()
    // (make_engr_at → exercise(A_WIS) rn2(19)), then RETURNS — the world block
    // (movemon) is the NEXT moveloop_core invocation (context.move still 1).  Mirror
    // that order exactly: run engrave() (which clears the occupation when finished),
    if (g.occupation === 'engrave' && (g.multi | 0) >= 0) {
        let engrGuard = 0;
        // C engrave.c:1268 — (*go.occupation)() == engrave(); returns 0 when finished.
        // Each callback is followed by its own world block.  A continuing
        // occupation must complete that block before the next input is read.
        while (g.occupation === 'engrave' && (g.multi | 0) >= 0 && engrGuard++ < 4096) {
            /* C allmain.c:453-470 — the moveloop_core invocation that runs the
             * occupation callback first executes the once-per-input redraw tail
             * (see_monsters/see_objects/see_traps when hallucinating).  For the
             * first callback that is the tail of the no-time doengrave
             * invocation; for a continuing one, the tail after the previous
             * world block.  Hallucinating, each is a run of DISPLAY-stream
             * draws, so omitting it shifts every later hallucinated name. */
            faithful_input_redraw();
            const r = engrave();
            if (r === 0) g.occupation = null;
            // C allmain.c:485-509 checks interruption after the callback,
            // before the next invocation spends this action's world turn.
            if (monster_nearby()) {
                await stop_occupation();
                reset_eat();
            }
            await faithful_moveloop_turn();
            if (g.vision_full_recalc) {
                vision_recalc(0);
                g.vision_full_recalc = 0;
            }
            await moveloop_status_paint();
            await flush_screen(1);
        }
        g.context = g.context || {};
        g.context.move = 0;
    }
    // ===================== go.occupation DRIVER — PICKLOCK (faithful) =============
    // C ref: allmain.c:543-558 — rhack just dispatched '#loot' → doloot →
    // do_loot_cont → pick_lock(), which (on the autounlock 'y' answer) set
    // go.occupation = picklock and context.move=1 (ECMD_TIME).  Drive the
    // lock-picking occupation to completion HERE, modelled exactly on the
    // dig/learn drivers: each turn = one faithful per-turn world block
    // (faithful_moveloop_turn, C's allmain.c:243-446) FOLLOWED by picklock()
    // (the rn2(100) success roll at lock.c:98).  The number of turns falls out
    // credit-card chance(=12) yields 5 busy/success turns (61,67,25,33 busy,
    // 10 success).  On success picklock() returns 0 and the box is unlocked;
    // C then runs ONE more post-occupation world turn (context.move still 1)
    if (g.occupation === picklock && (g.multi | 0) >= 0) {
        let pickGuard = 0;
        let pickInterrupted = false;
        // C ref: allmain.c:209-558 — one moveloop_core invocation per occupation
        // action, in THIS order:
        //     if (svc.context.move) { WORLD BLOCK }      allmain.c:209
        //     svc.context.move = 1;                       allmain.c:483
        //     if (go.occupation) { (*go.occupation)(); return; }   allmain.c:485
        // so the callback runs at the END of an invocation and the world block at
        // the START of the NEXT one.  Whether a block precedes the FIRST callback
        // is therefore decided by what pick_lock left in svc.context.move, and
        // pick_lock's shared tail (lock.c:648) sets it to 0 — the setup itself
        // costs no time.  On the autounlock path test_move re-zeroes it too
        // (hack.c:1109, `svc.context.move = (ux != u.ux || uy != u.uy)` with a
        // hero who did not move); on the `apply` path rhack's ECMD_TIME tail
        // (cmd.c:3819) sets it back to 1 and the head block above has already run
        // for this invocation.  So the head block before EACH callback — including
        // the first — is governed by exactly C's own test, `if (svc.context.move)`,
        // and the loop below is a literal transcription of it.  This driver used to
        // run a block before EVERY callback unconditionally, which is right for the
        // emitted the turn's movemon/mcalcmove/maybe_generate_rnd_mon/gethungry
        // leaves BEFORE picklock's rn2(100) where C emits them after (recorded leaf
        // 3219: C rn2(100)@picklock(lock.c:98) vs JS rn2(5)@distfleeck).  The turn
        // COUNT was right, so T: and every frame through step 107 matched; only the
        // order was wrong, and it put the whole RNG stream two draws out of phase
        // from step 52 on.
        while (g.occupation === picklock && pickGuard++ < 4096) {
            // C allmain.c:209 — the head world block of THIS moveloop_core.
            if (g.context && g.context.move) await faithful_moveloop_turn();
            // C allmain.c:483-485 — svc.context.move = 1, then the occupation
            // is only called `if (gm.multi >= 0 && go.occupation)`.  The head
            // world block may itself have interrupted the pick (dochugw ->
            // stop_occupation, monmove.c:223-235, "You stop picking the lock."):
            // then C falls through to rhack for the next key with NO picklock()
            // call and NO further world block.
            g.context = g.context || {};
            g.context.move = 1;
            if (g.occupation !== picklock || (g.multi | 0) < 0) {
                pickInterrupted = true;
                break;
            }
            // C allmain.c:493 — (*go.occupation)() == picklock(); 0 ends the pick.
            // picklock()'s success line ("You succeed in picking the lock.") is
            // plined here; it persists on the topline until the next nhgetch.
            const r = await picklock();
            if (r === 0) g.occupation = null;
        }
        // C ref: allmain.c:209 — the occupation has cleared with context.move
        // still 1, so the next moveloop_core runs ONE more world block before
        // rhack reads the next key.  Run it here and suppress the next head
        // (context.move = 0 below) — the dig/learn/engrave driver pattern.
        if (!pickInterrupted) await faithful_moveloop_turn();
        if (g.vision_full_recalc) {
            vision_recalc(0);
            g.vision_full_recalc = 0;
        }
        await moveloop_status_paint(); // C allmain.c:474 — guarded status paint
        await flush_screen(1);
        g.context = g.context || {};
        g.context.move = 0;
    }
    // ===================== go.occupation DRIVER — SET_TRAP (apply.c:2908) =========
    // C ref: allmain.c:484-507 with apply.c:2908 set_trap().  use_trap armed
    // go.occupation = set_trap ("You begin setting your land mine.") and doapply
    // returned ECMD_TIME; each later action is one moveloop_core invocation: the
    // head world block (if context.move), then (*go.occupation)(), 0 ends it
    // ("You finish arming the land mine." plined inside the callback), else the
    // monster_nearby() interrupt (allmain.c:504-507).  set_trap is private to
    // cmd.js, so the occupation is recognised by its function name rather than
    // imported (an export would be an out-of-file edit).  Modelled on the picklock
    if (typeof g.occupation === 'function' && g.occupation.name === 'set_trap'
        && (g.multi | 0) >= 0) {
        const setTrapFn = g.occupation;
        let trapGuard = 0;
        let trapInterrupted = false;
        while (g.occupation === setTrapFn && trapGuard++ < 4096) {
            // C allmain.c:209 — the head world block of THIS moveloop_core.
            if (g.context && g.context.move) await faithful_moveloop_turn();
            g.context = g.context || {};
            g.context.move = 1; // allmain.c:483
            // A stop_occupation() inside the world block clears the occupation:
            // C falls through to rhack with no callback and no further block.
            if (g.occupation !== setTrapFn || (g.multi | 0) < 0) {
                trapInterrupted = true;
                break;
            }
            // C allmain.c:453-470 — each occupation iteration is its own
            // moveloop_core, so the once-per-input hallucination redraw runs
            // (display-RNG draws) before the callback at :493.
            faithful_input_redraw();
            // C allmain.c:493 — (*go.occupation)() == set_trap(); 0 ends it.
            const r = await setTrapFn();
            g.context.move = 1; // the callback's return is not an ECMD_* code
            if (r === 0) g.occupation = null;
            // allmain.c:504-507 — monster_nearby() interrupt.
            if (g.occupation === setTrapFn && monster_nearby()) {
                await stop_occupation();
                trapInterrupted = false;
            }
        }
        // allmain.c:209 — context.move still 1: ONE more post-occupation world
        // block runs before rhack reads the next key (picklock/dig pattern).
        if (!trapInterrupted) await faithful_moveloop_turn();
        if (g.vision_full_recalc) {
            vision_recalc(0);
            g.vision_full_recalc = 0;
        }
        await moveloop_status_paint(); // C allmain.c:474
        await flush_screen(1);
        g.context = g.context || {};
        g.context.move = 0;
    }
    // ===================== go.occupation DRIVER — FORCELOCK (faithful) ============
    // C ref: allmain.c:543-558 — rhack just dispatched '#force' → doforce, which
    // (on the ynq 'y' answer) plined "You start bashing it with <weapon>." and set
    // go.occupation = forcelock + context.move=1 (ECMD_TIME).  Drive the force
    // occupation to completion HERE, modelled exactly on the picklock driver: each
    // turn = one faithful per-turn world block (faithful_moveloop_turn, C's
    // allmain.c:243-446) FOLLOWED by forcelock() (wake_nearby + the rn2(100) >=
    // chance roll at lock.c:244).  The number of turns falls out of the rn2(100)
    // chance(=16) yields 6 busy turns then a success (rn2(100)=4 < 16); on success
    // forcelock() calls breakchestlock() (rn2(3) destroy + per-content shatter)
    // and returns 0.  C then runs ONE more post-occupation world turn (context.move
    if (g.occupation === forcelock && (g.multi | 0) >= 0) {
        let forceGuard = 0;
        let forceInterrupted = false;
        // C lock.c:743 begin message ("You start bashing it with your spear.") is in
        // _resultMessage; it is the first committed topline.  forcelock()'s success
        // turn stages "You succeed...", "...totally destroyed...", "You see a bottle
        // shatter!" into g._forceMsgs.  Collect the full message sequence (begin +
        // staged) and page them turn-by-turn AFTER the occupation completes (C's tty
        // more()s the committed topline whenever a fresh pline arrives mid-occupation;
        // C lock.c:743's begin message stays on the COMMAND-RESULT channel for the
        // whole occupation.  It used to be lifted out into a local and the channel
        // nulled, which cost the mid-occupation movemon plines their flush frame:
        // js/display.js pline() records a per-message frozen frame (pline.c:274's
        // flush_screen before putmesg) only on the arm where a fresh
        // _pending_message opens on top of a committed _resultMessage.  With the
        // channel empty that arm never fired, so the --More-- that message raises
        // had no frame of its own and fell back to the coarse end-of-occupation
        const beginMsg = g._resultMessage || '';
        while (g.occupation === forcelock && forceGuard++ < 4096) {
            // C allmain.c:243-446 — one full per-turn world block (movemon + HEAD;
            // svm.moves++ inside) BEFORE the occupation callback (the C trace shows
            // head(turn N) → forcelock rn2(100) → movemon within each turn).
            await faithful_moveloop_turn();
            // C allmain.c:493-556 — the head world block may itself have interrupted
            // the force (dochugw -> stop_occupation, monmove.c:223-235, "You stop
            // forcing the lock."): C then falls through to rhack with NO forcelock()
            // call and NO further world block (picklock driver shape).
            if (g.occupation !== forcelock || (g.multi | 0) < 0) {
                forceInterrupted = true;
                break;
            }
            // C allmain.c:556 — (*go.occupation)() == forcelock(); 0 ends the force.
            const r = await forcelock();
            if (r === 0) g.occupation = null;
        }
        // C ref: src/pline.c:274 — `if (u.ux) flush_screen(...)` runs BEFORE
        // putmesg(), so the physical screen that each of forcelock()'s plines
        // more()s over is the gbuf as of the SUCCESS TURN's movemon — every one
        // of those plines fires inside the occupation callback, before control
        // returns to moveloop_core for the post-occupation turn.  Freeze the map
        // 44-46: C shows the pet one square behind for all three --More-- pages
        // and catches up only at step 47, the pre-rhack flush at cmd.c:5104.)
        occupation_painted_tick();
        const forceFrame = g._occCurFrame;
        const forceFrameMoves = (g.moves | 0);
        const forceFrameUhs = (g.u && g.u.uhs != null) ? (g.u.uhs | 0) : null;
        // C ref: allmain.c:241-446 — once the occupation clears, C runs ONE post-
        // occupation turn's world block (this turn's movemon) BEFORE rhack reads the
        // next key.  Run it eagerly, then suppress the next head's spurious block
        // (context.move = 0) — the dig/picklock driver pattern.
        // Its plines (e.g. a confusion timeout) come AFTER forcelock()'s own
        // staged messages in C, so hold them back and append them last.
        const _res0 = g._resultMessage ?? null;
        const _pend0 = g._pending_message || '';
        if (!forceInterrupted) await faithful_moveloop_turn();
        let _postTail = '';
        {
            const _p1 = g._pending_message || '';
            const _pre = [_res0, _pend0].filter(Boolean).join('  ');
            if (_p1.length > _pre.length && _p1.startsWith(_pre)) {
                _postTail = _p1.slice(_pre.length).trim();
                g._resultMessage = _res0;
                g._pending_message = _pend0;
            }
        }
        if (g.vision_full_recalc) {
            vision_recalc(0);
            g.vision_full_recalc = 0;
        }
        await moveloop_status_paint(); // C allmain.c:474 — guarded status paint
        // ── force-occupation cross-turn --More-- paging ──────────────────────────
        // The topline C accumulates across the occupation is, in generation order:
        // the begin message, then any plines the occupation turns' movemon produced,
        // then forcelock()'s own staged success/destroy/shatter lines.  Assemble it
        // as ONE string with its message boundaries on record and let flush_screen
        // page it, instead of forcing one --More-- per message.
        //
        // WHY THE WIDTH RULE, NOT ONE PAGE PER MESSAGE.  C's update_topl (topl.c)
        // pages only when the NEXT pline would not fit the CO-1-8 reserve, so
        // every message because every pair genuinely overflows (45+2+32=79,
        // 32+2+43=77, 43+2+30=75, all > 71) -- which is why one-page-per-message
        // "The kitten drops a lamp.  You succeed in forcing the lock." on ONE page
        // (24+2+32=58 <= 71), and the per-message loop both paged them apart AND
        // dropped the kitten line entirely, because it wiped _pending_message
        // without reading it.
        //
        // The frozen frame per page then comes from flush_screen's own selection:
        // the per-pline flush frame when one was recorded (the kitten's drop, which
        // C froze mid-movemon with the kitten still standing on the lamp and the
        // end-of-occupation frame installed here, which is exactly what
        // occupation_force_more used to install for every page.
        {
            const _resHint = _topl_joins_snapshot(g._resultMessage) || undefined;
            let full = (g._resultMessage && g._pending_message)
                ? _topl_merge_result(g._resultMessage, g._pending_message, _resHint)
                : (g._resultMessage || g._pending_message || '');
            for (const m of (g._forceMsgs || [])) {
                const _prevLen = full.length;
                full = full
                    ? _topl_merge_result(full, m, _topl_joins_snapshot(full) || undefined)
                    : m;
                if (forceFrame && _prevLen > 0) {
                    if (!Array.isArray(g._plineFlushFrames)) g._plineFlushFrames = [];
                    g._plineFlushFrames.push({ off: _prevLen, msg: m, cells: forceFrame,
                        moves: forceFrameMoves | 0, botl: null });
                }
            }
            if (_postTail) {
                /* The post-occupation turn's pline recorded its flush frame
                 * (pline.c:274) at an offset relative to the pre-force text
                 * (_res0 + _pend0); forcelock's staged messages now sit ahead
                 * of it, so rebase that frame to where the tail lands. */
                if (full && Array.isArray(g._plineFlushFrames)) {
                    const _preLen = [_res0, _pend0].filter(Boolean).join('  ').length;
                    for (const f of g._plineFlushFrames) {
                        if (f && (f.off | 0) === _preLen
                            && _postTail.startsWith(String(f.msg || '\0')))
                            f.off = full.length;
                    }
                }
                full = full
                    ? _topl_merge_result(full, _postTail, _topl_joins_snapshot(full) || undefined)
                    : _postTail;
            }
            g._forceMsgs = null;
            g._resultMessage = null;
            g._resultMessageJoins = null;
            g._pending_message = full;
        }
        const _savedForceSnap = g._paintedSnapshot;
        if (forceFrame) {
            g._paintedSnapshot = { cells: forceFrame, moves: (forceFrameMoves | 0),
                uhs: (forceFrameUhs == null ? null : (forceFrameUhs | 0)) };
        }
        await flush_screen(1);
        if (forceFrame) g._paintedSnapshot = _savedForceSnap || null;
        // The final (unpaged) remainder becomes the committed command result, read at
        // the next rhack(0) exactly as before.
        if (g._pending_message) {
            g._resultMessage = g._pending_message;
            g._pending_message = '';
        }
        g.context = g.context || {};
        g.context.move = 0;
    }
    // ===================== go.occupation DRIVER — WIPEOFF (faithful) ==============
    // C ref: allmain.c:483-497 — rhack just dispatched '#wipe' -> dowipe (do.c:2390),
    // which on a creamed face called set_occupation(wipeoff, "wiping off your face", 0)
    // and returned ECMD_TIME (context.move = 1).  C's outer for(;;) then re-enters
    // moveloop_core, runs the FULL per-turn world block, and calls (*go.occupation)()
    // == wipeoff() BEFORE rhack -- no key is read across the span.  Modelled on the
    // picklock/forcelock drivers, which have exactly this shape.
    //
    // the newline that submits "# wipe") carries 55 recorded leaves and they split
    // cleanly into TWO world turns at the two moveloop_core(allmain.c:360) leaves:
    //   leaves 0..24  distfleeck/dochug/dog_goal/dog_move/mcalcmove/maybe_generate_
    //                 rnd_mon/regen_hp/gethungry/moveloop_core  = the OCCUPATION turn
    //   leaves 25..54 the same shape again                       = the POST-occupation
    //                                                              turn, before rhack
    // wipeoff() itself draws nothing, so the count falls out of C's clamps (u.ucreamed
    // the job and returns 0) rather than being hardcoded here.
    //
    // NO PAGING.  Both of wipeoff's plines fire inside that one callback, the topline
    // joiner concatenates them ("You've got the glop off.  You can see again." is 43
    // columns, well under CO-1), and C's recorded step-62 frame carries no --More--.
    // So unlike the forcelock driver there is nothing to page: leave the joined
    // POST-occupation turn's map, which is what C's frame shows (the pet and the
    // homunculus have each moved twice).
    //
    if (g.occupation === wipeoff && (g.multi | 0) >= 0) {
        let wipeGuard = 0;
        while (g.occupation === wipeoff && wipeGuard++ < 4096) {
            // C allmain.c:243-446 — one full per-turn world block (movemon + HEAD;
            // svm.moves++ inside) BEFORE the occupation callback.
            await faithful_moveloop_turn();
            // C allmain.c:496 — (*go.occupation)() == wipeoff(); 0 ends the wipe.
            const r = await wipeoff();
            if (r === 0) g.occupation = null;
        }
        // C ref: allmain.c:241-446 — once the occupation clears, C's outer for(;;)
        // re-enters moveloop_core with context.move still 1 and runs ONE post-
        // occupation turn's world block before rhack reads the next key.  That is
        // suppress the next head's block with context.move = 0, the forcelock shape.
        await faithful_moveloop_turn();
        if (g.vision_full_recalc) {
            vision_recalc(0);
            g.vision_full_recalc = 0;
        }
        await moveloop_status_paint(); // C allmain.c:474 — guarded status paint
        await flush_screen(1);
        g.context = g.context || {};
        g.context.move = 0;
    }
    // ===================== go.occupation DRIVER — TAKE_OFF ('A') =================
    // C ref: allmain.c:484-507 with do_wear.c:2900 take_off().  doddoremarm ran the
    // first take_off() and armed go.occupation = take_off; every later removal is
    // one moveloop_core invocation: world block, then (*go.occupation)(), 0 ends it,
    // else the monster_nearby() interrupt (allmain.c:504-507).
    if (g.occupation === take_off_occ && (g.multi | 0) >= 0) {
        let takeoffGuard = 0;
        let toInterrupted = false;
        while (g.occupation === take_off_occ && takeoffGuard++ < 4096) {
            // doddoremarm returns ECMD_OK (context.move 0): C's first invocation
            // runs the callback with NO world block (do_wear.c:3053).
            if (takeoffGuard > 1 || (g.context && g.context.move))
                await faithful_moveloop_turn();
            // A stop_occupation() inside the world block (hitmu etc.) clears the
            // occupation; C then falls through to rhack with no further turn.
            if (g.occupation !== take_off_occ) { toInterrupted = true; break; }
            // C allmain.c:453-474 — the once-per-invocation tail: find_ac() (the
            // ONLY place the AC of a just-removed piece lands), vision, botl.
            find_ac();
            faithful_input_redraw();
            if (g.vision_full_recalc) {
                vision_recalc(0);
                g.vision_full_recalc = 0;
            }
            await moveloop_status_paint(); // C allmain.c:474
            g.context = g.context || {};
            g.context.move = 1; // allmain.c:483
            await flush_screen(1);
            const r = await take_off_occ();
            g.context.move = 1; // callback's ECMD_* return is discarded
            if (r === 0)
                g.occupation = null;
            // allmain.c:504-507 — unconditional, not only when the callback continues.
            if (monster_nearby()) {
                await stop_occupation();
                reset_eat();
            }
            if (g.vision_full_recalc) {
                vision_recalc(0);
                g.vision_full_recalc = 0;
            }
        }
        // C re-enters moveloop_core once more with context.move still 1 before
        // rhack reads a key (the wipeoff/learn shape).
        if (!toInterrupted) {
            await faithful_moveloop_turn();
            if (g.vision_full_recalc) {
                vision_recalc(0);
                g.vision_full_recalc = 0;
            }
            await moveloop_status_paint();
            await flush_screen(1);
        }
        g.context = g.context || {};
        g.context.move = 0;
    }
    // ===================== EAT OCCUPATION START (faithful, just after rhack) =====
    // C ref: allmain.c:543-558 — rhack (doeat → start_eating → set_occupation(eatfood))
    // just set g.occupation = eatfood and context.move=1, AND plined the fprefx begin
    // message ("A little goes a long way." for an elf food ration) into _resultMessage.
    // In C that rhack does NOT itself run an eating turn — control returns to the outer
    // for(;;), which re-enters moveloop_core, runs the FIRST eating turn's world block
    // at the TOP, then calls (*go.occupation)() and returns (the continuation branch
    // ABOVE).  So here, on the start invocation, we leave the occupation set and the
    // begin message in _resultMessage and fall through to return; the begin message is
    // committed to the topline on the first eating turn's page (eat_occupation_turn
    // restores _resultMessage → _pending_message before flush_screen).  context.move=1
    // already set above so the next re-entry's incomingMove fires the first eating turn.
    if (g.occupation === eatfood && (g.multi | 0) >= 0 && !g._occ_committed_topl) {
        // Reset the per-meal painted-frame tracker once, at meal start (the C tty
        // repaints the physical terminal each per-turn flush; the freeze snapshot is
        // taken when the final turn's done_eating message pages).  DISPLAY-ONLY.
        occupation_painted_reset();
        // Seed the committed-topline bookkeeping with the fprefx begin message (in
        // _resultMessage from this rhack), so the FIRST eating turn's lesshungry pline
        // pages it with a --More-- (C step 3: "A little goes a long way.--More--").
        // Guard `!g._occ_committed_topl` so this start block fires only on the rhack
        // that set the occupation, not on continuation re-entries.
        if (g._resultMessage) {
            g._occ_committed_topl = { text: g._resultMessage };
            g._resultMessage = null;
        }
        // Clear the topline channel: the begin message lives ONLY in
        // _occ_committed_topl now (it is the committed topline shown until the first
        // eating turn pages it).  Leaving it in _pending_message would let the
        // incomingMove merge re-fold it into _resultMessage next turn (double-count).
        g._pending_message = '';
        g.context = g.context || {};
        g.context.move = 1;
    }
    // ===================== TIMED OCCUPATION DRIVER (counted `s` / `.`) ============
    // C ref: allmain.c:484-509 — the generic occupation branch of moveloop_core:
    //
    //     svc.context.move = 1;                                    /* :483 */
    //     if (gm.multi >= 0 && go.occupation) {
    //         if ((*go.occupation)() == 0)
    //             go.occupation = 0;
    //         if (monster_nearby()) { stop_occupation(); reset_eat(); }
    //         runmode_delay_output();
    //         return;                                              /* :509 */
    //     }
    //
    // This is the arm the OTHER drivers in this file each hand-rolled for their
    // own callback (dig, learn, engrave, picklock, forcelock, eatfood).  It is
    // the one that had no implementation at all, and it is the one a COUNTED
    // command reaches: rhack has just armed go.occupation = timed_occupation via
    // cmd.c:3728 (see js/cmd.js CMD_F_TEXT — `s` and `.` are the only two rows in
    // the 5.0 extcmdlist that carry an f_text, so they are the only two commands
    // that get here).  The count lives inside timed_occupation(), NOT in the
    // multi>0 tail below, and on exit gm.multi is 0 so that tail never fires.
    //
    // Per C, ONE loop iteration is ONE moveloop_core invocation:
    //     consumed no time leaves no turn to spend;
    //   * svc.context.move = 1 (allmain.c:483), unconditionally;
    //   * (*go.occupation)() — here timed_occupation(), which runs the command
    //     and THEN counts down;
    //   * return, i.e. no key is read for the whole span.
    // On exit svc.context.move is 1, so the NEXT invocation runs the
    // post-occupation world block at its head and only then does rhack read the
    // next key — which is C's ordering, so no trailing turn is run eagerly here.
    //
    if (g.occupation === timed_occupation && (g.multi | 0) >= 0) {
        let occGuard = 0;
        while (g.occupation === timed_occupation && (g.multi | 0) >= 0
               && occGuard++ < 4096) {
            if (typeof process !== 'undefined' && ENV && ENV.FF_MLTRACE === '1') {
                pushRngLogEntry(
                    `^ml_occ[phase=pre guard=${occGuard | 0} moves=${g.moves | 0}`
                    + ` multi=${g.multi | 0} occ=${g.occupation ? 1 : 0}`
                    + ` uhp=${g.u?.uhp | 0} uhpmax=${g.u?.uhpmax | 0}`
                    + ` ux=${g.u?.ux | 0} uy=${g.u?.uy | 0}]`);
            }
            // C allmain.c:202-446 — the head world block of this invocation.
            if (g.context && g.context.move)
                await faithful_moveloop_turn();
            /* This loop iteration represents a separate C moveloop_core
             * invocation.  Its once-per-input tail runs even when the incoming
             * context.move skipped the actual-time-passed world block. */
            const redoVision = !(g.context && g.context.mv) || Blind();
            find_ac();
            faithful_input_redraw();
            if (redoVision && g.vision_full_recalc) {
                vision_recalc(0);
                g.vision_full_recalc = 0;
            }
            // C allmain.c:483 — svc.context.move = 1, before the occupation call.
            g.context = g.context || {};
            g.context.move = 1;
            // re-evaluated AFTER this invocation's head block, and that ordering is
            // load-bearing: hitmu's tail (mhitu.c:1265) calls stop_occupation() from
            // inside movemon, so a monster that lands a blow on a resting hero clears
            // go.occupation DURING the head block.  C then falls straight through to
            // loop ran one further donull -- an extra hero action, an extra world turn,
            // and an extra round of monster attacks whose plines overflowed the topline
            // raised a --More-- and then swallowed the next 500 recorded keys).
            if (!(g.occupation === timed_occupation && (g.multi | 0) >= 0)) {
                // The head block above IS this invocation's world turn, and C
                // :484 falls through to the `gm.multi == 0` rhack at :601).  So
                // the turn is already paid for: leave svc.context.move at 0 so
                // the driver's caller does NOT run a second, unpaid head block
                // before the read.  (The NORMAL exit below — the count running
                // out inside timed_occupation — is the other case, and there C
                // really does run one more head block first, which is why
                // context.move stays 1 on that path.)
                g.context.move = 0;
                break;
            }
            // C allmain.c:485 — (*go.occupation)(); 0 ends the occupation.
            const r = await timed_occupation();
            // C discards the callback's ECMD_* return here (rhack is not in the
            // loop), so svc.context.move is still the 1 set above.  The JS command
            // bodies write game.context.move as their ECMD_* return value —
            // dosearch() sets it to 0 when cmd_safety_prevention aborts the search
            // — so restore C's value, else an aborted search would silently eat
            // the next occupation turn's world block.
            g.context.move = 1;
            if (r === 0)
                g.occupation = null;
            // C allmain.c:504-507 — `if (monster_nearby()) { stop_occupation();
            // reset_eat(); }`.  This is the interrupt that makes a counted search
            // or rest STOP when something hostile steps next to the hero, and it
            // is NOT the same check as cmd_safety_prevention's: that one is
            // duration of a counted command.  C runs this one unconditionally,
            // every occupation turn, and stop_occupation() plines
            // "You stop <occtxt>." — "searching" / "waiting" here.
            if (monster_nearby()) {
                await stop_occupation();
                reset_eat();
            }
            // C allmain.c:509 — runmode_delay_output() before `return`: in
            // RUN_LEAP mode it sets time_botl and repaints every 7th turn, even
            // with a stale context.run (e.g. left by a finished travel).
            await runmode_delay_output();
            if (typeof process !== 'undefined' && ENV && ENV.FF_MLTRACE === '1') {
                pushRngLogEntry(
                    `^ml_occ[phase=post guard=${occGuard | 0} moves=${g.moves | 0}`
                    + ` multi=${g.multi | 0} occ=${g.occupation ? 1 : 0}`
                    + ` uhp=${g.u?.uhp | 0} uhpmax=${g.u?.uhpmax | 0}`
                    + ` ux=${g.u?.ux | 0} uy=${g.u?.uy | 0}]`);
            }
        }
    }
    // NOTE: unlike the calibrated path, the faithful path increments g.moves
    // INSIDE faithful_moveloop_turn's HEAD block (C's svm.moves++ point), NOT at
    // the bottom here.  So there is NO bottom g.moves++ in the faithful variant.
    // The turn_end mapstate that the calibrated path emits at the bottom is
    // already emitted inside the head block by faithful_moveloop_turn (C's
    //
    // ===================== multi<0 OCCUPATION COUNTDOWN (faithful) =====================
    // C ref: allmain.c:433-441 — when the hero is immobile (gm.multi < 0, set by
    // nomul() during e.g. armor take-off "T"), C's outer `for(;;) moveloop_core()`
    // re-enters and runs the FULL per-turn block once per delayed turn (the per-turn
    // HEAD block fires `++gm.multi` at allmain.c:435; at gm.multi==0 it calls unmul()
    // which fires ga.afternmv — Armor_off etc.).  NO key is read during the countdown
    // (the C dispatch tail at 543/573/601 all fall through for multi<0, returning
    // they fold into the span before the next nhgetch.
    //
    // The faithful head above already fired ONE per-turn block via
    // faithful_moveloop_turn() (the incomingMove turn whose key we just dispatched).
    // In C that first countdown turn also did one `++gm.multi`.  So we INCREMENT
    // FIRST and FIRE the faithful turn AFTER: the first loop iteration's increment
    // "pays off" the head's already-fired turn; subsequent iterations both increment
    // and fire a real faithful per-turn block.  This yields exactly (delay) per-turn
    // blocks total (1 head + delay-1 loop), then unmul after the last — matching the
    //
    // Mirrors the calibrated path's multi<0 loop (allmain.js head path) byte-for-byte
    // in structure; the only difference is the per-turn engine
    // a key.
    // The faithful head above already fired ONE faithful_moveloop_turn (the
    // incomingMove turn whose key we dispatched).  In C that turn's HEAD block
    // already ran the allmain.c:435 ++gm.multi (now done INSIDE
    // faithful_moveloop_turn).  Re-enter faithful_moveloop_turn once per remaining
    // delayed turn; the ++gm.multi / unmul live in its HEAD block at C's exact
    // position, so a Fast-banked MOVEMON-only pass does NOT tick the countdown
    // (matching C — the bug the prior unconditional outer ++multi introduced).
    let countdownGuard = 0;
    // C ref: allmain.c:453/:524/:530-537 — a command that spent no time but left
    // gm.multi < 0 (savelife(): `svc.context.move = 0; gm.multi = -1`, reached by
    // a declined wizard-mode death) makes the NEXT moveloop_core skip the world
    // once-per-input find_ac() and repaint the status, then set context.move = 1
    // and fall through every dispatch arm (multi < 0).  Only the following call
    // runs the countdown turn, so the AC lost to the burst gear (lava_effects ->
    // remove_worn_item) is already on the status line when that turn's unmul()
    if ((g.multi | 0) < 0 && !(g.context.move | 0)) {
        find_ac();
        g.context.move = 1;
    }
    while ((g.multi | 0) < 0) {
        // C ref: allmain.c:243-446 — one more delayed turn: the full faithful
        // per-turn do-while (umv-=NORMAL_SPEED; movemon; HEAD with mcalcmove/makemon/
        // u_calc_moveamt/dosounds/gethungry/exerchk; ++gm.multi+unmul; svm.moves++
        // inside HEAD; seer; turn_end).  The hero takes no action (immobile).  The
        // Fast-banked double-move is handled INSIDE faithful_moveloop_turn
        await faithful_moveloop_turn();
        // C ref: allmain.c:453 find_ac() — the once-per-player-input block sits
        // AFTER the "actual time passed" world block in the SAME moveloop_core
        // call (allmain.c:435 `} /* actual time passed */` ... :453 find_ac()), so
        // a delayed turn's MONSTERS run against the AC the hero had BEFORE this
        // call's recompute.  This loop used to call find_ac() FIRST, which handed
        // the very first delayed turn an AC one recompute too new.
        //
        // cloak, then puts on an accessory that moves AC 10 -> -2, and nomul(-5)
        // schedules the dressing delay.  C's `^mattacku_ac[165@27,3 uac=10 ...]`
        // fires INSIDE turn 2's movemon — the gnome's mattacku computes
        // AC_VALUE(10), which is `10 >= 0` and therefore draws NOTHING — and
        // `^botl[find_ac]` (uac -> -2) only lands at the head of turn 3.  This
        // port had already recomputed -2, so the same mattacku evaluated
        // AC_VALUE(-2) = -rnd(2) and drew a leaf C never draws: leaf 9781, the
        // The frames stay right either way (the last iteration's find_ac still
        // runs before the paint), so the take-off/dressing status lines the old
        // order was calibrated on are unaffected — only the world block moved to
        // C's side of the recompute.
        // RNG-free itself; a no-op wherever u.uac is already current.
        find_ac();
        /* After the final delayed turn clears multi, the NEXT moveloop_core
         * invocation reaches the ordinary input tail at :2836.  Intermediate
         * delayed invocations need their own tail here; otherwise the final
         * turn would be repainted twice. */
        if ((g.multi | 0) < 0) {
            const redoVision = !(g.context && g.context.mv) || Blind();
            faithful_input_redraw();
            if (redoVision && g.vision_full_recalc) {
                vision_recalc(0);
                g.vision_full_recalc = 0;
            }
        }
        // C ref: allmain.c:513 — `u.umoved = FALSE;`, run in EVERY moveloop_core
        // invocation AFTER the per-turn world block and BEFORE the multi/rhack
        // dispatch.  Each delayed turn is its own invocation in C, so a turn the
        // hero spends immobile leaves the flag clear for the NEXT turn's world
        // block.  See the run loop's copy for what reads it.
        g.u.umoved = false;
        if ((g.multi | 0) < 0) {
            // The final delayed world turn resumes command input in the same
            // C invocation; its callback belongs after that command, not here.
            g.context.move = 1;
            if (g.u.utotype) await deferred_goto();
            if (g.vision_full_recalc) vision_recalc(0);
            await nh_callback_run(NHCB_END_TURN);
        }
        if (++countdownGuard >= 4096) break; // safety: never spin on broken multi
    }
    // C ref: allmain.c:436 path tail — after the countdown completes (unmul fired
    // inside the last HEAD block, multi now 0), C's hero has banked umovement
    // moveloop_core does NOT run a new-turn per-turn block before reading the next
    // key — the next recorded command acts first.  Clear context.move so the next
    // (countdownGuard advanced OR multi reached 0 from <0 this call) — detect via
    // the afternmv having been cleared is fragile, so use: if we entered the loop
    // at all this call (multi was <0 coming in).
    if (g._ff_countdown_done) {
        g._ff_countdown_done = false;
        // ...but only when THIS invocation is the one that drained the countdown.
        //
        // _ff_countdown_done is a LATCH raised inside faithful_moveloop_turn()
        // whenever a multi<0 countdown reaches 0, and faithful_moveloop_turn() is
        // called from four places — the head world block, the pre-rhack countdown
        // loop, this loop, and the multi>0 RUN loop below.  Only the loop directly
        // above can honour it: it is the one whose delayed turns leave the hero
        // with banked umovement, which is the whole premise of the suppression.
        // A latch raised in the RUN loop is raised AFTER this block has already
        // run, so it survives into the NEXT invocation and cancels the world block
        // of a command that has nothing to do with the countdown.
        //
        // timer fires mid-run (timeout.c:906 slip_or_trip + nomul(-2), C leaf
        // 33229) and the RUN loop ticks the countdown out.  C then gives the next
        // parse(392), ^mapstate turn=680, ^mapstate turn=681, parse(393),
        // ^mapstate turn=682 — while this port suppressed it and ran TWO commands
        // inside one turn.  From there every later turn was one behind C, and the
        // boulder push two commands on drew its exercise() rn2(19) at C's leaf
        // 33563 where C was still moving monsters.
        //
        // Clearing the latch unconditionally is the other half of the fix: left
        // set, it just leaks one command further on.
        if (countdownGuard) {
            g.context = g.context || {};
            g.context.move = 0;
        }
    }
    _merge_countdown_pline();
    //
    // ===================== multi>0 RUN MOVEMENT LOOP (Stage C) =====================
    // C ref: allmain.c:571-600 — the gm.multi>0 tail of moveloop_core, run after
    // rhack dispatched an uppercase run key (cmd.c:4462-4471 DOMOVE_RUSH): rhack
    // set context.run=1, context.mv=TRUE, multi=80, and did the run's FIRST hero
    // (start of this moveloop_core call); the run's SUBSEQUENT world-turns must be
    // produced HERE — within this same call, between this nhgetch and the next —
    // because C drains them via the outer for(;;) moveloop_core WITHOUT calling
    // nhgetch (the run loop returns at line 588/600 without rhack), so they
    // leaves, step 3 = 387 — multiple run turns per nhgetch span).
    //
    // C per-iteration order is the same as the calibrated path's run loop, but the
    // per-turn WORLD BLOCK is driven by faithful_moveloop_turn() — the faithful
    // do-while that decrements u.umovement, runs movemon, allots fresh rations
    // (incl. the hero's Fast banking via u_calc_moveamt), increments g.moves at C's
    // Fast-banked double-move is handled INSIDE that do-while (allmain.c:254 break)
    // — we do NOT bolt on a separate banked-movemon here as the calibrated path
    // does, because the faithful turn already exercises C's banked branch.
    //
    // Run-state persistence across moveloop_core invocations: multi / context.run /
    // context.mv live in g.context and survive between calls.  A run that does not
    // runs faithful_moveloop_turn for the next run turn and re-enters this loop.
    // That mirrors C's "run state synthesizes the next keystroke" — no recorded key
    // is consumed for a continuation turn (the next rhack(0)/nhgetch only fires once
    // the run has fully stopped and control returns to the recorded-step boundary).
    //
    // body never runs, the flag-OFF default is untouched by construction.
    // C ref: allmain.c:573-600 — the gm.multi>0 tail.  THREE multi>0 paths share
    // this loop, distinguished by context.mv / context.run:
    //   (a) shift-run / g·G rush  (context.run, context.mv)  — repeat domove,
    //       lookaround stop predicate, COLNO decrement dormant at multi==80.
    //   (b) counted WALK  (context.mv, !context.run, e.g. "5l")  — repeat domove,
    //       multi<COLNO so the !--multi decrement IS live and bounds the repeats;
    //       lookaround still runs (RNG-free; a no-op stop when !run).
    //   (c) counted COMMAND  (!context.mv, e.g. "20s")  — C allmain.c:595-599:
    //       --gm.multi; rhack(gc.cmd_key).  Re-runs the SAME command key (search,
    //       etc.) once per remaining count, each potentially consuming a turn.
    // count prefix or a run.  The flag-off default is untouched.
    let runGuard = 0;
    // C ref: win/tty/topl.c — a fresh run begins with a clear topline (the prior
    // command's line was acknowledged at its nhgetch).  Reset the per-run paging
    // frame log so this run's --More-- pages freeze on THIS run's per-turn hero
    // squares, not a stale prior run's.  DISPLAY-ONLY, no RNG.
    run_page_frame_reset();
    while ((g.multi | 0) > 0) {
        const isMv = !!(g.context && g.context.mv);
        if (typeof process !== 'undefined' && ENV && ENV.FF_MLTRACE === '1') {
            pushRngLogEntry(`^ml_multi[moves=${g.moves | 0} multi=${g.multi | 0}`
                + ` mv=${isMv ? 1 : 0} run=${(g.context && g.context.run) | 0} occ=${g.occupation ? 1 : 0}]`);
        }
        // C ref: win/tty/topl.c — COMMIT THE PREVIOUS domove()'s RESULT LINE onto
        // the accumulating run topline before anything else is added to it.
        // Covers the run's FIRST hero step, the one dorun() took inside rhack()
        // before this loop was entered; every later step folds at _run_commit_result
        // below, right after its own domove().  See that helper's header for why.
        _run_commit_result(g);
        // C ref: allmain.c:243-446 — the world advances one full turn at the head of
        // the NEXT moveloop_core invocation.  faithful_moveloop_turn() does the C
        // including the Fast-banked second movemon when u_calc_moveamt banks the
        // bonus (allmain.c:254 break path).
        /* C allmain.c moveloop_core: the world block runs only when
         * svc.context.move is set — a counted move into a door that opens
         * leaves move 0 and multi > 0 (hack.c:1108-1109, 2843-2848). */
        if (g.context.move) await faithful_moveloop_turn();
        g.context.move = 1;
        // C ref: allmain.c:474-480 — every run turn is its own moveloop_core
        // invocation, so the guarded status paint runs after the world block.
        // A regen_hp() botl flag raised this turn repaints `T:' at THIS turn's
        // 219: the --More-- frame shows T:36, not the run's later T:38).
        await moveloop_status_paint();
        // C ref: win/tty/topl.c more() during a run — each run turn's movemon plines
        // are painted onto the SAME accumulating topline (no nhgetch clears it between
        // run steps), and the physical terminal is repainted with the hero at THIS
        // turn's just-stepped square (runmode_delay_output → curs_on_u/flush).  When
        // the accumulating line later overflows CO-1 and pages, C's more() freezes the
        // PHYSICAL screen at the instant the overflowing pline was added — i.e. the
        // hero square of the run turn whose message crossed the width boundary, NOT the
        // run's final square.  Our run loop batches all turns before flush_screen pages,
        // so record THIS turn's painted frame + its accumulated topline length now; the
        // width-paging loop in flush_screen replays the per-turn frame whose accumulated
        // length first reaches each --More-- page's committed end (display.js
        // run_page_frame_select).  DISPLAY-ONLY: snapshots disp_* cells, consumes no
        // non-paging run / non-run command is byte-identical to before.
        run_page_frame_tick();
        // C ref: allmain.c:513 — `u.umoved = FALSE;`, between the per-turn world
        // block and the multi dispatch.  C's run is NOT a loop: each run step is
        // its own moveloop_core invocation (head block, then u.umoved = FALSE,
        // then the single `if (multi > 0) ... domove()`), so the flag is cleared
        // once per run turn and re-set by that turn's domove.  This port batches
        // the run's turns into the loop below, so without this line the flag
        // stayed TRUE from the run's LAST step and leaked into the turn AFTER the
        // run stopped.
        //
        // turn 699 ("You slip and nearly fall.", nomul(-2)); the run ends there,
        // and at turn 700 the timer expires again.  C's nh_timeout FUMBLING arm
        // (timeout.c:905 `if (u.umoved && !(Levitation || Flying))`) sees the flag
        // CLEAR — the hero was immobile — so it skips slip_or_trip and only
        // re-arms, drawing `rnd(20)=8 @nh_timeout(timeout.c:924)` at leaf 34820.
        // This port saw it still set, slipped a second time ("You slip and nearly
        // fall.  You flounder.") and drew `rn2(4) @slip_or_trip` there instead.
        g.u.umoved = false;
        // C ref: allmain.c:513-514 — `if (gm.multi > 0) {` is re-read AFTER the
        // world block, at the head of the dispatch tail.  A nomul() fired from
        // INSIDE that block leaves multi NEGATIVE (nh_timeout's FUMBLING arm,
        // timeout.c:907 `slip_or_trip(); nomul(-2);`, then allmain.c:380-386's
        // same-turn `++gm.multi` brings it to -1), and C then takes NEITHER the
        // multi>0 branch NOR the multi==0 one: no lookaround(), no domove(), no
        // rhack().  moveloop_core returns with svc.context.move still 1 and the
        // remaining countdown turns run at the head of the FOLLOWING invocations,
        // so the hero stands still while the world takes those turns.
        //
        // This loop tested only `!(g.multi | 0)` below, which is TRUE only for
        // multi === 0 — a negative multi read as "not stopped" and fell through to
        // nomul()'s own `ctx.mv = 0` did not stop it.  Net effect: the hero took
        // trips at (67,9) on turn 590 and the turn-591 movemon sees the pet at
        // (68,9) with the hero still at (67,9) — udist 1, so dog_goal falls into
        // its `appr == 0` arm and scans the hero's 17-item inventory, 17
        // rn2(100)s through dogfood()/obj_resists().  This port had already walked
        // the hero on to (66,9), udist 4, which takes the `udist > 1` arm instead
        if ((g.multi | 0) < 0) {
            // A world effect interrupted the run. C skips both action arms
            // but still executes its deferred-travel/vision/callback tail.
            g.context.move = 1;
            if (g.u.utotype) await deferred_goto();
            if (g.vision_full_recalc) vision_recalc(0);
            await nh_callback_run(NHCB_END_TURN);
            break;
        }
        // C ref: allmain.c:582 — lookaround() (RNG-free run-stop predicate). May call
        // nomul(0) → end_running(TRUE), clearing multi.  For a counted command
        // (!run, !mv) lookaround does not stop anything (it keys on run/mv state).
        lookaround();
        // C allmain.c:515-526: repaint/pacing precedes the stopped-run test.
        await runmode_delay_output();
        // C ref: allmain.c:584-588 — if lookaround cleared multi the repeat is over;
        // C sets context.move=0 and returns BEFORE the line-594/599 body.  No domove
        // happened this iteration, so the trailing world block already ran at the TOP
        // of this iteration (faithful_moveloop_turn above) — there is NO trailing turn.
        let stopped = !(g.multi | 0);
        // Did THIS iteration dispatch domove/rhack, rather than stop in
        // lookaround? Only the latter forces context.move to zero in C.
        // When domove (the run's next hero step) clears
        // multi by stepping onto a run-stop tile (hack.c:2949-2953 IS_DOOR/IS_OBSTRUCTED/
        // IS_FURNITURE → nomul(0)) or into an obstruction?  When it does, C's moveloop_core
        // returns with svc.context.move==1 (the domove SUCCEEDED — the hero MOVED onto the
        // stop square, allmain.c:540 set move=1 and the door-stop does not clear it), so the
        // NEXT moveloop_core's top do-while runs ONE MORE world block (movemon) for the turn
        // that domove consumed BEFORE rhack reads the next key.  That trailing turn is what
        // JS was skipping: it collapsed the run-stop into the same break that lookaround
        // takes, dropping the door-square world block and putting the hero one square ahead.
        let dispatched = false;
        if (!stopped && isMv) {
            // C ref: allmain.c:591-594 — context.mv path: the COLNO decrement
            // (multi<COLNO && !--multi → end_running) is dormant for shift-runs
            // (multi stays 80==COLNO); live for G<dir> rush AND counted walks
            // (multi = count < COLNO), where it bounds the repeat count.
            if ((g.multi | 0) < 80 && ((g.multi = (g.multi | 0) - 1), (g.multi | 0) === 0)) {
                end_running(true);
            }
            const multiBeforeDomove = (g.multi | 0);
            // FF_DIRTRACE: the direction the run loop's next domove will step with —
            // the value lookaround() left in u.dx/u.dy this iteration.  Paired with
            // look.js's ^ff_dirtrace, this shows the run-loop CONTINUATION direction
            // (RNG-neutral; only when FF_DIRTRACE=1 and the rng log is enabled).
            if (typeof process !== 'undefined' && ENV && ENV.FF_DIRTRACE === '1') {
                pushRngLogEntry(
                    `^ff_runstep[moves=${g.moves | 0} ux=${g.u.ux | 0} uy=${g.u.uy | 0}`
                    + ` dx=${g.u.dx | 0} dy=${g.u.dy | 0} multi=${multiBeforeDomove}`
                    + ` run=${g.context && g.context.run | 0} ctxmove=${g.context && g.context.move ? 1 : 0}`
                    + ` umv=${g.u.umovement | 0}]`);
            }
            // C ref: allmain.c:594 — domove() for the next hero step.  May itself
            // nomul(0) (hack.c run/walk-into-obstruction OR the arrival-tile door-stop
            // at hack.c:2949) → multi=0, ending it.
            await domove(g.u.dx, g.u.dy);
            // Commit this step's result line onto the run's live topline now, in C's
            // generation order, before the NEXT iteration's world block plines are
            // appended.  See _run_commit_result.
            _run_commit_result(g);
            // C's domove messages are already live when deferred travel runs.
            // Publish the JS result before the transition can add or page text.
            if (g.u?.utotype)
                await deferred_goto();
            if (g.vision_full_recalc)
                vision_recalc(0);
            if (ENV.FF_RUNBANK_TRACE === '1') {
                pushRngLogEntry(`^ff_rundomove[moves=${g.moves | 0} ux=${g.u.ux | 0} uy=${g.u.uy | 0} multi=${g.multi | 0}]`);
            }
            stopped = !(g.multi | 0);
            // The run stopped *because of* this domove (not the pre-domove COLNO
            // decrement above) iff multi was non-zero going into domove and zero after.
            // When that happens the hero MOVED onto the run-stop tile (door/obstruction)
            // and hack.c:2949 nomul(0)'d the run AFTER allmain.c:540 set context.move=1,
            // so the move SUCCEEDED — C's svc.context.move stays 1.  The NEXT
            // moveloop_core therefore runs ONE trailing world block (movemon) at the
            // arrival square for the turn the domove consumed, before rhack reads the
            // next key.  This holds for the Fast-banked door arrival too: C does NOT
            // suppress the arrival turn when the hero banked a move — the banked second
            // the arrival turn's movemon runs at the DOOR square (29,15) where the
            // hero is on a non-room tile, so dog_goal short-circuits its rn2(4)
            // (dogmove.c:621 !IS_ROOM).  The prior umvBefore<2*NORMAL_SPEED suppression
            // dropped that arrival turn and over-advanced the hero one square past the
            // door, making the pet read a room square and fire a spurious rn2(4)/scan.
            //
            // The `multiBeforeDomove !== 0` guard was wrong for a COUNT-EXHAUSTED
            // walk/rush.  C ref: allmain.c:590-594 —
            //     if (svc.context.mv) {
            //         if (gm.multi < COLNO && !--gm.multi) end_running(TRUE);
            //         domove();
            //     }
            // domove() is UNCONDITIONAL: the COLNO decrement that zeroes gm.multi
            // does not skip the final hero step, and nothing after it touches
            // svc.context.move.  The ONLY place moveloop_core forces
            // svc.context.move = 0 is allmain.c:584-588, the PRE-domove
            // `if (!gm.multi)` check after lookaround() — i.e. the case where no
            // domove ran this iteration at all.  So once domove() has run, the
            // trailing world block for the turn it consumed ALWAYS fires at the top
            // of the next moveloop_core, before rhack reads the next key.
            //
            // multi 1 -> 0, then domove walks the hero (29,11) -> (30,11)).  C runs
            // turn 6's movemon with the hero at (30,11) — a ROOM square, so dog_goal
            // evaluates rn2(4) (dogmove.c:621).  JS suppressed that turn, read the
            // next command first, and ran the block only after the hero had stepped
            // to (30,12) — an SDOOR square, where !IS_ROOM short-circuits the rn2(4)
            // away.  That was the first RNG-value divergence after the smudge fix
            // (leaf 2715: C rn2(4) @dog_goal vs JS rn2(3) @dog_move).
            dispatched = true;
        } else if (!stopped && !isMv) {
            // C ref: allmain.c:595-599 — repeat_cmd: --gm.multi; rhack(gc.cmd_key).
            // Re-run the SAME top-level command (e.g. search) once per remaining
            // count.  rhack(cmd_key) (key != 0 → not firsttime) sets context.move
            // per the command's own ECMD_TIME/OK result; a 0-time command would
            // not have armed multi, so each repeat is a turn-consuming command.
            g.multi = (g.multi | 0) - 1;
            await rhack(g.cmd_key | 0);
            // Same post-dispatch boundary for counted commands.
            if (g.u?.utotype)
                await deferred_goto();
            if (g.vision_full_recalc)
                vision_recalc(0);
            stopped = !(g.multi | 0);
            dispatched = true;
            // After the repeated command, if it left context.move set the NEXT
            // faithful_moveloop_turn must run for its world block; that happens on
            // the next loop iteration's faithful_moveloop_turn (the incomingMove
            // through to the stop handling.
        }
        // Both C action arms join the same tail. Occupation iterations and
        // lookaround's pre-action return never reach it.
        if (dispatched) await nh_callback_run(NHCB_END_TURN);
        // C ref: allmain.c:584-588 + the run-stop-via-domove arrival turn.  Once the
        // repeat has stopped, decide what svc.context.move the NEXT moveloop_core head
        // sees — and therefore whether C runs ONE more world block before reading the
        // next key:
        //   • stopped by lookaround / the COLNO decrement (no successful domove this
        //     iteration): C sets svc.context.move=0 at allmain.c:586 and returns; the
        //     world block for the LAST successful domove already ran at the TOP of this
        //     iteration.  → context.move=0 (suppress the next head's block).
        //   • stopped by the domove itself (the hero MOVED onto a door/obstruction tile
        //     and hack.c:2949-2953 nomul(0)'d the run): the domove SUCCEEDED so
        //     svc.context.move stays 1 (allmain.c:540), and the NEXT moveloop_core runs
        //     ONE trailing world block (movemon) for the turn that arrival domove consumed
        //     BEFORE rhack reads the next key.  → leave context.move=1 so the next
        //     faithful head fires that trailing turn.  (Skipping it was the keystone bug:
        //     it dropped the door-square turn and advanced the hero one square early.)
        if (stopped) {
            if (!dispatched) {
                g.context.move = 0;
            }
            break;
        }
        if (++runGuard >= 4096) break; // safety: never spin on a broken multi state
    }
}

function _run_commit_result(g) {
    if (!g._resultMessage) return;
    const line = g._resultMessage;
    const hint = (g._resultMessageJoins && g._resultMessageJoins.src === line)
        ? g._resultMessageJoins.joins.slice()
        : (_topl_joins_snapshot(line) || undefined);
    const prev = g._pending_message;
    const aHint = prev ? (_topl_joins_snapshot(prev) || undefined) : undefined;
    /* Cleared BEFORE _topl_record_join so its _pline_flush_frame_tick computes the
     * boundary offset with no _resultMessage prefix — the merged topline below is
     * `prev + "  " + line`, not `line + "  " + prev`. */
    g._resultMessage = null;
    g._resultMessageJoins = null;
    if (prev) {
        _topl_record_join(prev, prev + '  ' + line);
        /* _topl_merge_result reads the b-side joins off the single-slot
         * side-channel, so arm it for `line` and pass the a-side offsets
         * explicitly; this reinstalls the FULL rebased join set that
         * _topl_record_join's coarser record just overwrote. */
        if (hint && hint.length) { g._topl_joins = hint.slice(); g._topl_joins_src = line; }
        g._pending_message = _topl_merge_result(prev, line, aHint);
    } else {
        /* The same restore rhack(0) does when it hands _resultMessage back to
         * _pending_message: re-arm the join side-channel for the line. */
        g._pending_message = line;
        if (hint && hint.length) { g._topl_joins = hint.slice(); g._topl_joins_src = line; }
    }
    g._toplRunCommitted = g._pending_message || null;
}

// trailing per-turn world block (the last time-command's MOVEMON/HEAD block) that
// C runs at the TOP of the moveloop_core iteration following the final recorded
// nhgetch — the block the JS replay loop terminates short of.  Only invoked when
// a block is still owed (g._wbOwed, set by the dig-occupation driver's phase
// shift) and context.move==1 at EOF.  Reuses the faithful per-turn engine so the
// flushed leaves fire in C's exact order (movemon/distfleeck/dochug/mcalcmove +
// the svm.moves++ inside the HEAD block).
export async function _flushTrailingWorldBlock() {
    await faithful_moveloop_turn();
}

// C ref: end.c:2350-2357 nh_terminate() — in C this is exit(): control NEVER
// returns to moveloop() and the process is simply gone.  This port models
// "never returns" as a thrown terminal error.  js/jsmain.js#runSegment (:1003)
// catches anything at its loop boundary so it tolerates that, but it is the ONLY
// caller that does.  The other three all use C's own protocol — run the loop,
// then test program_state.gameover:
//     js/nethack.js:18-22          the browser play page
//     js/allmain.js:5025-5029      moveloop() itself
// Each of those saw an exception escape where C saw a clean exit; the frozen
// that reaches a death.  really_done() has already set program_state.gameover
// (js/end.js:1863), so absorb the terminal error ONCE and return, letting those
// callers observe the game-over they are testing for.  A caller that ignores the
// flag and loops again re-enters with program_state.exiting still set and gets
// the throw, so runSegment still terminates and no loop spins.
export async function moveloop_core() {
    if (game?.program_state?.exiting) {
        const over = new Error('nh_terminate: game over');
        over.status = 0;
        throw over;
    }
    try {
        return await moveloop_core_impl();
    } catch (e) {
        if (game?.program_state?.exiting
            && String(e?.message || '').startsWith('nh_terminate: ')) {
            /* The save/quit route (save.c:64 exit_nhwindows -> nh_terminate)
             * never passes through done(), so end.c:1148's gameover assignment
             * has not run and the caller's `if (gameover) break` would spin the
             * loop until it re-entered and threw again.  In C there is nothing
             * left to spin: the process is gone.  gameover is the only signal
             * those loops read, so raise it here to mean exactly that.  Nothing
             * in the game can observe it — every reader (obj_is_pname and the
             * rest) runs before nh_terminate, which does not return. */
            (game.program_state ||= {}).gameover = 1;
            return;
        }
        throw e;
    }
}

// C ref: allmain.c moveloop_core()
async function moveloop_core_impl() {
    /* C allmain.c:106 `program_state.in_moveloop = 1;` — set once by moveloop()
     * before its first moveloop_core().  The SCORED entry point
     * (js/jsmain.js:626/747) drives moveloop_core() directly and never calls
     * moveloop(), so setting it there alone would leave the flag false for the
     * whole of a scored run; set it here too, where every path reaches it. */
    if (!game.program_state) game.program_state = {};
    game.program_state.in_moveloop = 1;
    const g = game;
    // C allmain.c:232-235 — clear object-chain bypass bits before the
    // per-turn world block, but only when a bypass was actually requested.
    if (g.svc?.context?.bypasses)
        clear_bypasses();
    // NOTE: the painted-screen snapshot is dropped at flush_screen after its
    // --More-- window is paged (see moveloop_core_faithful) — NOT reset here.
    // unless explicitly disabled, so the early return below ALWAYS fires and
    // which reports 434 dead lines here). This header previously read
    // "default OFF" and that single wrong word cost TWO consecutive Tier-2
    // in it, the second concluded moveloop_core_faithful was unreachable and
    // built a falsification on top of that. Do not re-word this without
    // re-measuring: `node -e "import('./js/fastforward.js').then(m=>console.log(m.FF_FAITHFUL))"`.
    // When FF_FAITHFUL is set, drive the per-turn world block from real
    // u.umovement/fmon state via the faithful do-while (above) instead of the
    // g.moves-indexed calibrated step table.  Everything OUTSIDE the per-turn
    // block (vision, bot, flush_screen, rhack, occupation/multi loops) is shared
    // with the calibrated path; only the head world-block emission differs.
    if (FF_FAITHFUL) return await moveloop_core_faithful();
    // Fast-forward per-step RNG (monster movement, regen, sounds, hunger).
    // C ref: allmain.c:243 — the monster-movement + new-turn block (mcalcmove,
    // makemon, dosounds, gethungry, exerchk) only runs when svc.context.move
    // was 1 coming INTO moveloop_core (set by the previous rhack call).
    // When context.move was 0 (player used no time last turn, e.g. a dismiss-
    // more space or a no-op key), C skips the block entirely — no RNG fires
    // before rhack runs.  Mirror that gating here: only fastforward when the
    // incoming context.move is truthy.
    /* C ref: allmain.c:101 moveloop_preamble sets context.move=0 before the first
     * moveloop_core call, so the per-turn block is skipped on turn 1 (hero acts first).
     * fastforward_post_mklev mirrors that assignment; no ?? 1 fallback needed. */
    const incomingMove = !!(g.context?.move ?? 0); /* default 0: first call skips per-turn block */
    if (incomingMove) {
        /* C ref: allmain.c:245 — u.umovement -= NORMAL_SPEED at the start of each
         * hero-took-time moveloop_core invocation, before the per-turn block.
         * Stage 1 scaffold: for a non-Fast hero u_calc_moveamt (inside fastforward_step)
         * adds back NORMAL_SPEED, keeping the running balance at NORMAL_SPEED.
         * For a Fast hero (Stage 2): u_calc_moveamt may bank 2*NORMAL_SPEED, leaving
         * umovement >= NORMAL_SPEED after this decrement — the double-move signal. */
        g.u = g.u || {};
        g.u.umovement = ((g.u.umovement || 0) - NORMAL_SPEED) | 0;
        const stepNum = (g.moves || 1) - 1;
        // C ref: allmain.c:250 svc.context.mon_moving = TRUE — mirror as
        // _inMovemonBlock so display.js snapshots the physical-paint frame at the
        // first topline overflow inside this movemon block (calibrated path).
        // DISPLAY-ONLY: snapshots disp_* cells, consumes no RNG.
        g._inMovemonBlock = true;
        /* C allmain.c:210/216 — same pair as the faithful moveloop above. */
        if (!g.context) g.context = {};
        g.context.mon_moving = true;
        /* C allmain.c:251 — saving-grace threshold uses HP at the start of
         * this monster turn, before fastforward_step runs movemon. */
        g.gu = g.gu || {};
        g.gu.uhp_at_start_of_monster_turn = g.u?.uhp | 0;
        await fastforward_step(stepNum);
        g._inMovemonBlock = false;
        if (g.context) g.context.mon_moving = false;
        /* C allmain.c:330/485 — begin the next player turn with a fresh
         * saving-grace window. */
        if (g.gs) g.gs.saving_grace_turn = false;
        // C ref: allmain.c:252-295 — the movemon() messages just produced by
        // fastforward_step belong to turn `stepNum`: C runs movemon() with
        // svm.moves==stepNum and only increments svm.moves AFTER movemon.  When
        // these deferred messages are later paged (--More--) by rhack (cmd.js),
        // g.moves has already been bottom-incremented to stepNum+1, so the display
        // would show the head-ahead turn.  Tag the deferred-message turn so the
        // --More-- paging renders `T:` as the movemon turn (stepNum), matching C's
        // svm.moves-before-increment ordering.  DISPLAY-ONLY: no RNG draw is
        // touched; g.moves is unchanged, so the fastforward step-table index and
        // the RNG stream stay byte-identical.  Tag only when movemon actually
        // produced deferred output to page.
        if (g._pending_message) {
            g._movemonMsgTurn = stepNum;
        }
        // C ref: tty topline concatenation across hero-attack + monster-movement.
        // In C, the hero's attack plines (turn N) and the subsequent monster-movement
        // plines (turn N+1 movemon phase) all accumulate on the same TTY topline,
        // which is only cleared at the START of the NEXT tty_nhgetch.  The combined
        // message is visible at the nhgetch that reads turn N+1's key.
        //
        // In JS: the hero-attack pline was saved in _resultMessage (by domove), and
        // monster-movement plines went to _pending_message (during fastforward_step
        // above, where _pending_message started empty after the previous turn's clear).
        // Merge them now so rhack's _resultMessage restore produces the full combined
        // topline, matching C's behaviour exactly.
        if (g._resultMessage && g._pending_message) {
            _topl_stash_result();
        } else if (!g._resultMessage && g._pending_message) {
            // Monster-only plines with no prior hero message (e.g. pet attacks without
            // hero having attacked): promote to _resultMessage so rhack restores them.
            g._resultMessage = g._pending_message;
            g._pending_message = '';
        }
        // If only _resultMessage (no monster plines this turn): leave as-is; rhack
        // will restore it normally.
    }
    // C ref: allmain.c:447-493 — once-per-hero-took-time block.
    // Runs after the inner do-while turn loop (hero can't move), before rhack.
    // Key item: seer_turn check — if svm.moves >= svc.context.seer_turn, fire
    // rn1(31, 15) to schedule the next clairvoyance check.
    // The rn1(31, 15) fires whether or not the hero has clairvoyance; C
    // "maintains this counter even when clairvoyance isn't taking place."
    if (incomingMove) {
        const moves = g.moves || 1;
        g.context = g.context || {};
        if (g.context.seer_turn == null) {
            /* seer_turn should have been set in fastforward_post_mklev from rnd(30);
             * if missing (e.g. very old save state), initialise conservatively. */
            g.context.seer_turn = 1;
        }
        const seerDue = moves >= g.context.seer_turn;
        const clairActive = timed_clairvoyance_active();
        if (typeof process !== 'undefined' && ENV?.FF_VISION_TRACE === '1')
            pushRngLogEntry(`^vision_seer[moves=${moves} seer_turn=${g.context.seer_turn | 0} incomingMove=${incomingMove ? 1 : 0} due=${seerDue ? 1 : 0} active=${clairActive ? 1 : 0}]`);
        if (seerDue) {
            if (clairActive) await do_vicinity_map(null);
            /* C ref: allmain.c:470 — svc.context.seer_turn = svm.moves + rn1(31,15)
             * rn1(31,15) = rn2(31) + 15, range 15..45. */
            g.context.seer_turn = moves + rn1(31, 15);
            if (typeof process !== 'undefined' && ENV?.FF_VISION_TRACE === '1')
                pushRngLogEntry(`^vision_seer_resched[moves=${moves} next=${g.context.seer_turn | 0}]`);
        }
    }
    // C ref: allmain.c:510 find_ac() — the "once-per-player-input" AC recompute;
    // see the identical call in moveloop_core_faithful above for why it is
    // load-bearing (the tutorial gamestate stash unwears everything without
    // calling find_ac itself).  RNG-free; a no-op wherever u.uac is already current.
    find_ac();
    // Vision + display
    if (g.vision_full_recalc) {
        vision_recalc(0);
        g.vision_full_recalc = 0;
    }
    await moveloop_status_paint(); // C allmain.c:474 — guarded status paint
    await flush_screen(1);
    // Snapshot dungeon level before processing the command so we can detect
    // level transitions for after_goto_level.  C ref: do.c:1986 —
    // which is called during move processing when the hero uses stairs.
    const preMoveUz = g.u && g.u.uz
        ? { dnum: g.u.uz.dnum, dlevel: g.u.uz.dlevel }
        : null;
    // C ref: allmain.c:540 — svc.context.move = 1 UNCONDITIONALLY every
    // moveloop_core call, before rhack fires.  The value read at the TOP of
    // the NEXT moveloop_core (incomingMove) is whatever was written here in
    // the PREVIOUS turn.  rhack() may flip context.move = 0 mid-call for
    // non-time-consuming commands, but that flip is visible only to the NEXT
    // turn's incomingMove check.
    g.context.move = 1;
    // Read and execute one command
    // The message channel before the command ran — see the clear below.
    const _preRhackMsg = g._pending_message || '';
    await rhack(0);
    // C ref: tty_nhgetch — the C TTY layer clears the topline message at the
    // START of each nhgetch call (before reading the key), AFTER capturing the
    // current screen state.  This means a pline message set during a move=0
    // command (e.g. dotalk with ECMD_OK) persists and is visible at the NEXT
    // Mirror this: only clear _pending_message when the turn was consumed
    // (context.move != 0).  When move=0, the message persists to the next
    // visible at the nhgetch that delivers the NEXT command's key).
    if (g.context?.move) {
        // Same repair as moveloop_core_faithful's clear above (read the long
        // note there): C's tty_nhgetch does not destroy the command's own
        // topline, it lets the next turn's plines concatenate onto it, so hand
        // the command's OWN result line to _resultMessage rather than dropping
        // it.  Both guards are load-bearing — see there.
        if (!_preRhackMsg && g._pending_message && !g._resultMessage) {
            g._resultMessage = g._pending_message;
        }
        g._pending_message = '';
    }
    // We detect this by comparing the hero's dungeon position before and after
    // processing the move.  When JS ports goto_level() properly, this implicit
    // detection should remain correct: the emitMapstate call here mirrors the C
    // emit exactly (same post-level-load timing).
    if (preMoveUz && g.u && g.u.uz) {
        if (g.u.uz.dnum !== preMoveUz.dnum || g.u.uz.dlevel !== preMoveUz.dlevel) {
            emitMapstate('after_goto_level');
        }
    }
    // Advance turn
    if (g.context?.move) {
        g.moves = (g.moves || 1) + 1;
        /* C allmain.c:261-263 — `if (flags.time && !svc.context.run)
         * disp.time_botl = TRUE;'.  While the hero is RUNNING the turn
         * counter is not repainted, so the physical `T:' keeps the value
         * the last paint put there; see js/display.js
         * time_botl_moves_incremented(). */
        time_botl_moves_incremented((g.moves | 0) - 1);
    }
    // emitted at the end of every hero turn. Mirror that here so the
    emitMapstate('turn_end');
    // ===================== go.occupation DRIVER =====================
    // C ref: allmain.c:543-569 — after the command dispatch (and the
    // unconditional context.move=1), if gm.multi>=0 and an occupation is set,
    // C's outer for(;;) re-enters moveloop_core, runs the FULL per-turn block
    // for the new turn (movemon/mcalcmove/makemon/dosounds/gethungry/u_wipe_engr,
    // moves++), then calls (*go.occupation)() and RETURNS before rhack — NO key
    // is read during the occupation span (RISK 2: the return is load-bearing).
    //
    // JS off-by-one model: a turn-consuming command's per-turn block normally
    // lock-pick 'apply' (doapply→pick_lock) consumes its getobj/getdir keys
    // WITHIN a single moveloop_core iteration, and C banks the door-open's
    // umovement so the per-turn block surfaces at THIS input boundary (it does
    // NOT fire at the intervening no-time getobj steps — verified: C steps
    // 18/19 have zero RNG, the block lands at step 20).  Since the JS replay
    // head to fire it; we fire the single deferred per-turn block here, plus
    // drive the occupation callback if one was set (picklock).
    //
    if ((g._occupation_turn || g.occupation) && (g.multi | 0) >= 0) {
        // C ref: allmain.c:262-414 — one new turn: the world advances.
        // g.moves was already incremented above for the time-consuming command;
        // fastforward_step(moves-1) selects the matching per-turn block (turn 1
        // → fastforward_step(1) nodochug, monsters at movement=0).
        g.u = g.u || {};
        g.u.umovement = ((g.u.umovement || 0) - NORMAL_SPEED) | 0;
        await fastforward_step((g.moves || 1) - 1);
        // C ref: allmain.c:556 — (*go.occupation)() drives the occupation;
        // 0 ends it.  picklock() fires rn2(100) on each productive turn and
        // occupation was set (pick_lock returned early), so this is skipped and
        // only the per-turn block above fired.
        if (g.occupation === picklock) {
            const r = await picklock();
            if (r === 0) {
                g.occupation = null;
            }
        }
        // ── DIG occupation (multi-turn) ──────────────────────────────────────
        // after one banked turn), the dig occupation runs to COMPLETION within a
        // single input boundary: C's outer for(;;) re-enters moveloop_core each
        // turn, runs the FULL per-turn world block, then calls (*go.occupation)()
        // = dig(), accumulating effort until the pit/hole is made (effort > 50),
        // and NO key is read across the span (the dispatch tail returns before
        // pit-timeout, all at step 17; steps 18-20 ('.') are post-dig rests.
        //
        // The head per-turn block above already ran ONE turn (the '>' command
        // turn's banked world block, fastforward_step(moves-1)); dig() runs once
        // against that turn.  Then, while dig() keeps returning nonzero, we run a
        // fresh per-turn world block + dig() for each subsequent occupation turn.
        if (g.occupation === dig) {
            // First dig() against the head per-turn block (this turn's effort).
            let r = await dig();
            if (r === 0) g.occupation = null;
            // C ref: allmain.c:541-558 — subsequent occupation turns: each runs a
            // full new per-turn world block then dig().  The first dig effort is
            // recorded by C with svm.moves already advanced once past the command
            // turn, so increment moves before each new world block (mirroring the
            // moveloop tail's `moves++`), then run the generic per-turn block
            // (stepNum > 10 → generic dochug+mcalcmove+dosounds+gethungry turn)
            // and dig() again.
            let guard = 0;
            while (g.occupation === dig && guard++ < 4096) {
                g.moves = (g.moves || 1) + 1;
                /* C allmain.c:261-263 — `if (flags.time && !svc.context.run)
                 * disp.time_botl = TRUE;'.  While the hero is RUNNING the turn
                 * counter is not repainted, so the physical `T:' keeps the value
                 * the last paint put there; see js/display.js
                 * time_botl_moves_incremented(). */
                time_botl_moves_incremented((g.moves | 0) - 1);
        if (g.u.ublesscnt) g.u.ublesscnt = (g.u.ublesscnt | 0) - 1; /* C allmain.c:276-277, the once-per-turn block this legacy path stands in for */
                // C ref: allmain.c:245 — u.umovement -= NORMAL_SPEED per turn.
                g.u.umovement = ((g.u.umovement || 0) - NORMAL_SPEED) | 0;
                await fastforward_step((g.moves || 1) - 1);
                r = await dig();
                if (r === 0) g.occupation = null;
                emitMapstate('turn_end');
            }
        }
        g._occupation_turn = false;
        emitMapstate('turn_end');
    }
    // ===================== multi<0 OCCUPATION COUNTDOWN =====================
    // C ref: allmain.c:433-441 — when the hero is immobile (gm.multi < 0, set by
    // nomul() during e.g. armor take-off), C's outer `for(;;) moveloop_core()`
    // re-enters and runs the FULL per-turn block once per delayed turn, then
    // `++gm.multi`; at gm.multi==0 it calls unmul() which fires ga.afternmv
    // (Armor_off etc.).  NO key is read during the countdown (the C dispatch
    // tail returns before rhack — RISK 2), so these turns are NOT separate
    //
    // The JS head above already fired ONE per-turn block (the incomingMove
    // fastforward_step for the turn whose key we just dispatched).  In C that
    // first countdown turn also did one `++gm.multi`.  So we INCREMENT FIRST
    // and FIRE the per-turn block AFTER: the first loop iteration's increment
    // "pays off" the head's already-fired turn, and subsequent iterations both
    // increment and fire.  This yields exactly (delay) per-turn blocks total
    // (1 from the head + delay-1 from the loop) and unmul after the last,
    // turns 3-7, then Armor_off).
    //
    while ((g.multi | 0) < 0) {
        // C ref: allmain.c:510 find_ac() — the previous moveloop_core call's
        // once-per-player-input tail, run before this delayed turn's block; see
        // the identical call in the faithful countdown loop above for why the
        // position (before unmul's plines, not after) is load-bearing.
        find_ac();
        // C ref: allmain.c:435 — ++gm.multi (this turn counted).
        g.multi = (g.multi | 0) + 1;
        if ((g.multi | 0) === 0) {
            // C ref: allmain.c:436 — countdown finished: unmul() runs afternmv.
            // Armor_off and the sibling *_off callbacks are RNG-free (verified
            // do_wear.c:909), so no phantom leaf is injected here.
            await unmul(null);
            emitMapstate('turn_end');
            // After the countdown, C's hero has banked umovement (umv>=NORMAL_SPEED,
            // NOT run a new-turn per-turn block before reading the next key — the
            // next command acts first.  The JS off-by-one model fires the per-turn
            // block at the NEXT step's head when the PREVIOUS step's context.move
            // was 1; clearing it here suppresses that spurious head block so the
            // matching the C trace order (do_attack BEFORE the trailing turn block).
            // The `delay` per-turn blocks for THIS take-off span were already fully
            // produced (1 by step41's head incomingMove + delay-1 by this loop), so
            g.context = g.context || {};
            g.context.move = 0;
            _merge_countdown_pline();
            break;
        }
        // C ref: allmain.c:262-414 — one more delayed turn: the world advances
        // (movemon→mcalcmove→makemon→u_calc_moveamt→dosounds→gethungry→exerchk
        // →u_wipe_engr), the hero takes no action.  Reuse the same per-turn
        // engine the head uses; stepNum>10 selects the generic per-turn block.
        /* C ref: allmain.c:245 — u.umovement -= NORMAL_SPEED before per-turn block.
         * Stage 1 scaffold: u_calc_moveamt (inside fastforward_step) adds it back. */
        g.u = g.u || {};
        g.u.umovement = ((g.u.umovement || 0) - NORMAL_SPEED) | 0;
        await fastforward_step((g.moves || 1) + 16);
        // C ref: allmain.c:295 — svm.moves++ at the TOP of the new-turn block.
        g.moves = (g.moves || 1) + 1;
        /* C allmain.c:261-263 — `if (flags.time && !svc.context.run)
         * disp.time_botl = TRUE;'.  While the hero is RUNNING the turn
         * counter is not repainted, so the physical `T:' keeps the value
         * the last paint put there; see js/display.js
         * time_botl_moves_incremented(). */
        time_botl_moves_incremented((g.moves | 0) - 1);
        if (g.u.ublesscnt) g.u.ublesscnt = (g.u.ublesscnt | 0) - 1; /* C allmain.c:276-277, the once-per-turn block this legacy path stands in for */
        // C ref: allmain.c:464-470 — seer check uses the POST-increment moves;
        // step 41 seer_turn is far ahead so this fires no RNG, but we include it
        g.context = g.context || {};
        if (g.context.seer_turn == null)
            g.context.seer_turn = 1;
        if ((g.moves || 1) >= g.context.seer_turn) {
            if (timed_clairvoyance_active()) await do_vicinity_map(null);
            g.context.seer_turn = (g.moves || 1) + rn1(31, 15);
        }
        // C ref: allmain.c:443 — turn_end mapstate emitted inside the new-turn
        // block, once per delayed turn.
        emitMapstate('turn_end');
    }
    // ===================== multi>0 RUN MOVEMENT LOOP =====================
    // C ref: allmain.c:571-607 — the gm.multi > 0 tail of moveloop_core, run as
    // a SIBLING to the multi<0 countdown loop above.  An uppercase movement key
    // (H/J/K/L/Y/U/B/N) was dispatched in rhack (cmd.c:4462 DOMOVE_RUSH tail):
    // it set context.run=1, context.mv=TRUE, multi=80, and did the run's FIRST
    // hero move (domove#1).  context.move is still 1 (a successful run step),
    // for the FIRST world-turn (the off-by-one carryover).  Each subsequent run
    // turn is produced HERE: the world advances (per-turn block) BEFORE the
    // hero's next move, exactly as C runs the world block at the head of the
    // NEXT moveloop_core invocation, then the multi>0 tail's lookaround+domove.
    //
    // C per-iteration order (allmain.c): [per-turn world block at invocation
    // head] → context.move=1 → lookaround() (RNG-free; may nomul(0)) →
    // if(!multi){context.move=0; return;} → if(context.mv){ if(multi<COLNO &&
    // !--multi) end_running(TRUE); domove(); }.  We replicate that order with
    // the SAME intra-turn engine (fastforward_step → moves++ → seer) the multi<0
    // loop uses, so moves++/seer timing is identical and additive (RISK 1/3).
    //
    // all run turns complete inside this one moveloop_core invocation.
    while ((g.multi | 0) > 0 && !!(g.context && g.context.run)) {
        ffRunTrace('loop-enter');
        // C ref: allmain.c:262-414 — the world advances one turn (movemon→
        // mcalcmove→makemon→u_calc_moveamt→dosounds→gethungry→exerchk→
        // u_wipe_engr).  Force the generic per-turn engine (stepNum>10).
        /* C ref: allmain.c:245 — u.umovement -= NORMAL_SPEED before per-turn block.
         * Stage 1 scaffold: u_calc_moveamt (inside fastforward_step) adds it back. */
        g.u = g.u || {};
        g.u.umovement = ((g.u.umovement || 0) - NORMAL_SPEED) | 0;
        g._umv_bonus = false;
        await fastforward_step((g.moves || 1) + 16);
        /* Stage 2: did THIS turn's u_calc_moveamt bank the Fast bonus?  If so the
         * hero will act a SECOND time (banked double-move) below — see RISK note. */
        const bankedBonus = !!g._umv_bonus;
        // C ref: allmain.c:295 — svm.moves++ at the TOP of the new-turn block.
        g.moves = (g.moves || 1) + 1;
        /* C allmain.c:261-263 — `if (flags.time && !svc.context.run)
         * disp.time_botl = TRUE;'.  While the hero is RUNNING the turn
         * counter is not repainted, so the physical `T:' keeps the value
         * the last paint put there; see js/display.js
         * time_botl_moves_incremented(). */
        time_botl_moves_incremented((g.moves | 0) - 1);
        if (g.u.ublesscnt) g.u.ublesscnt = (g.u.ublesscnt | 0) - 1; /* C allmain.c:276-277, the once-per-turn block this legacy path stands in for */
        // C ref: allmain.c:464-470 — seer check uses POST-increment moves.
        // The seer fires when C's svm.moves >= seer_turn.  JS's g.moves carries a
        // +1 head off-by-one (g.moves init 1 vs C svm.moves init 0; the head
        // compensates via fastforward_step(moves-1)).  The seer is the first site
        // to read g.moves directly, so it must apply the same -1 to recover C's
        // (leaf 2758, turn D); JS g.moves there is 6, so (6-1)>=5 fires at the
        // C-faithful turn and does NOT fire one turn early at turn C.
        g.context = g.context || {};
        if (g.context.seer_turn == null)
            g.context.seer_turn = 1;
        if (((g.moves || 1) - 1) >= g.context.seer_turn) {
            if (timed_clairvoyance_active()) await do_vicinity_map(null);
            g.context.seer_turn = ((g.moves || 1) - 1) + rn1(31, 15);
        }
        emitMapstate('turn_end');
        // C ref: allmain.c:582 — lookaround() (RNG-free run-stop predicate).
        // May call nomul(0) → end_running(TRUE), clearing multi/context.run.
        lookaround();
        ffRunTrace('after-lookaround', `stopped=${g.multi | 0}`);
        // C ref: allmain.c:584-588 — if lookaround cleared multi the run is over;
        // that here so the lookaround-stop path skips the hero domove below (matching
        // C), while a domove-induced stop (nomul inside domove, the common run-into-
        // obstruction case) still advances the hero first.
        let runStopped = !(g.multi | 0);
        if (!runStopped && g.context.mv) {
            // C ref: allmain.c:590-594 — context.mv run path: the COLNO decrement
            // (multi<COLNO && !--multi → end_running) is dormant for shift-runs
            // (multi stays 80==COLNO, so multi<COLNO is false); it becomes live for
            // G<dir> rush (Stage D).  Then the run's next hero move.
            if ((g.multi | 0) < 80 && ((g.multi = (g.multi | 0) - 1), (g.multi | 0) === 0)) {
                end_running(true);
            }
            // C ref: allmain.c:594 — domove() for the run's next hero step.
            // domove may itself nomul(0) (hack.c:2773 run-into-monster, or
            // hack.c:2948 door/obstruction/furniture after moving) → multi=0,
            // ending the run on the next loop test.  This is C's turn-N hero action
            // the banked turn's movemon below so that movemon observes C's hero pos.
            await domove(g.u.dx, g.u.dy);
            ffRunTrace('loop-after-domove');
            // domove may have ended the run (nomul → multi=0); recompute.
            runStopped = !(g.multi | 0);
        } else if (!runStopped && !g.context.mv) {
            // exactly as before to avoid an infinite spin.
            break;
        }
        // ===== Fast banked DOUBLE-MOVE (allmain.c:243-256 banked turn) =====
        // C ref: a Fast hero whose u_calc_moveamt rolled the bonus banks
        // moveamt=2*NORMAL_SPEED.  After the turn-N domove above (which advanced the
        // hero to C's position), C's NEXT moveloop_core does `u.umovement -=
        // NORMAL_SPEED` (still >= NORMAL_SPEED), runs the do-while monster loop
        // (movemon: distfleeck/m_move for monsters with banked movement) and exits
        // WITHOUT the new-turn block (allmain.c:263 is skipped because u.umovement >=
        // NORMAL_SPEED): NO new-turn block, NO svm.moves++, NO seer firing.  Because
        // the run already stopped (the turn-N domove's nomul or lookaround cleared
        // multi), this banked invocation does NOT domove the hero a SECOND time
        // (C lines 584-588 return after the movemon do-while).  So the banked turn
        // is exactly: one extra movemon, NO extra hero move.
        // the banked `^movemon_turn[16#40 mv=24->12]` fires distfleeck rn2(5) with
        // hero@29 (leaf 2734+) — the leaf-2735 divergence fix.
        if (bankedBonus) {
            // C ref: allmain.c:245 — second -= NORMAL_SPEED (the banked turn).
            g.u.umovement = ((g.u.umovement || 0) - NORMAL_SPEED) | 0;
            // C ref: allmain.c:252-256 — movemon() for monsters that banked
            // movement; NO mcalcmove/makemon/u_calc_moveamt, NO moves++, NO seer.
            await fmon_dochug_dispatch();
            // C mon.c:1342-1347 — movemon()'s deferred_goto tail (see the
            // faithful loop above for the full quote); the calibrated dispatch
            // drains every pass in one call, so the tail runs once after it.
            if (g.u && (g.u.utotype | 0))
                await deferred_goto();
            emitMapstate('turn_end');
        }
        // C ref: allmain.c:584-588 — if the run is over (lookaround or the turn-N
        // domove cleared multi), set context.move = 0 (so the NEXT step's head skips
        // a spurious per-turn block) and break.  Done AFTER the banked movemon: C
        // fires the banked turn's movemon even when the run stopped on the bonus turn.
        if (runStopped) {
            g.context.move = 0;
            break;
        }
    }
}
// C ref: allmain.c moveloop()
export async function moveloop(resuming) {
    vision_recalc(0);
    await docrt();
    await flush_screen(1);
    if (!game.program_state) game.program_state = {};
    game.program_state.in_moveloop = 1;
    for (;;) {
        await moveloop_core();
        if (game.program_state?.gameover)
            break;
    }
}

export { _run_commit_result as commit_command_result };
