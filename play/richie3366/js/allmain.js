// allmain.js — Main game loop.
// C ref: allmain.c — newgame, moveloop, moveloop_core, moveloop_preamble.

import { game } from './gstate.js';
import { rnd, rn2, rn1 } from './rng.js';
import { mklev, l_nhcore_init, u_on_upstairs, fumaroles, movebubbles } from './mklev.js';
import { dobjsfree, clear_splitobjs } from './mkobj.js';
import { rhack, continue_run, run_active, lookaround, dolookaround, end_of_input, enter_explore_mode, nh_callback_run, NHCB_NAME, domove } from './cmd.js';
import {
    docrt, cls, bot, timebot, curs_on_u, flush_screen, pline, Norep,
    flush_topl_more, see_monsters, You, install_tty_wincap2,
    see_objects, see_traps, swallowed, Hallucination, Warn_of_mon,
    clear_glyph_buffer, glyph_to_cmap, urgent_pline,
    under_water, under_ground, cliparound,
} from './display.js';
import { vision_recalc, vision_reset, init_vision_globals } from './vision.js';
import { initrack, settrack } from './track.js';
import { fastforward_pre_mklev } from './fastforward.js';
import { init_objects } from './o_init.js';
import { activate_chosen_soundlib } from './options.js';
import { init_artifacts, mkot_trap_warn } from './artifact.js';
import { init_dungeons, find_level, print_level_annotation } from './dungeon.js';
import { depth } from './hacklib.js';
import { schedule_goto, deferred_goto, l_nhcore_call, hellish_smoke_mesg, save_currentstate } from './do.js';
import { obj_delivery } from './dokick.js';
import { read_wizkit } from './files.js';
import { setup_role_race_from_rc, u_init_misc, u_init_inventory_attrs, u_init_skills_discoveries, find_ac } from './u_init.js';
import { makedog } from './dog.js';
import { makemon, makemon_appear_msg, reset_align_shift_cache } from './makemon.js';
import {
    mcalcmove, mcalcdistress, movemon, NORMAL_SPEED, see_nearby_monsters,
    m_at, mnexto,
} from './mon.js';
import { LOW_PM, NUMMONS, mons, G_NOCORPSE, PM_WIZARD, PM_MONK, reset_erinys, breathless, monst_globals_init } from './monsters.js';
import { program_state_init, decl_globals_init } from './decl.js';
import { crashreport_init } from './report.js';
import { objects_globals_init } from './objects.js';
import { sys_early_init } from './sys.js';
import { runtime_info_init } from './version.js';
import {
    A_DEX, A_STR, A_CON, A_WIS, A_INT, A_MAX, acurr, exercise, adjattrib,
    change_luck, Fast, Very_fast, Searching, Fumbling,
} from './attrib.js';
import { dosearch0, warnreveal, do_vicinity_map, Clairvoyant } from './detect.js';
import { nhgetch } from './input.js';
import {
    unmul, nomul, monster_nearby, stop_occupation, overexert_hp, is_pool,
    notice_mon_off, notice_mon_on, notice_all_mons, runmode_delay_output,
    check_special_room, end_running,
} from './hack.js';
import { reset_justpicked, pickup, pooleffects } from './pickup.js';
import { fix_shop_damage } from './shk.js';
import { set_wear, glibr } from './do_wear.js';
import { clear_bypasses } from './worn.js';
import { gethungry, reset_eat } from './eat.js';
import { age_spells } from './spell.js';
import { near_capacity, paint_corner_nhw_menu, encumber_msg, update_inventory, prepare_perminvent, reroll_menu } from './invent.js';
import { sanity_check } from './wizcmds.js';
import { done } from './end.js';
import { com_pager_legacy } from './questpgr.js';
import { snapshot_status_lines } from './display.js';
import { status_initialize, status_eval_next_unhilite } from './botl.js';
import { Hello, align_str, role_init } from './roles.js';
import { livelog_printf } from './pline.js';
import { phase_of_the_moon, friday_13th, night, getnow, FULL_MOON, NEW_MOON } from './calendar.js';
import { ATR_INVERSE } from './terminal.js';
import { dosounds } from './sounds.js';
import { ckmailstatus } from './mail.js';
import { invault } from './vault.js';
import { u_wipe_engr, read_engr_at } from './engrave.js';
import { nh_timeout, do_storms } from './timeout.js';
import { amulet, intervene } from './wizard.js';
import { run_regions, any_visible_region } from './region.js';
import { m_everyturn_effect } from './monmove.js';
import { tele } from './teleport.js';
import { sink_into_lava } from './trap.js';
import { polyself, rehumanize, set_uasmon, uasmon_maxStr, ugenocided } from './polyself.js';
import { udeadinside } from './read.js';
import { you_were } from './were.js';
import {
    UNENCUMBERED, SLT_ENCUMBER, MOD_ENCUMBER, HVY_ENCUMBER, EXT_ENCUMBER,
    NO_MM_FLAGS, Upolyd, LL_ACHIEVE, NHCORE_START_NEW_GAME, NHCORE_RESTORE_OLD_GAME,
    NHCORE_MOVELOOP_TURN, NHCB_END_TURN, ESCAPED,
    ROLE_GENDMASK, ROLE_MALE, ROLE_FEMALE,
    UTOTYPE_NONE, TIMEOUT, REGENERATION, CLAIRVOYANT,
    MAXULEV, ENERGY_REGENERATION, MAGICAL_BREATHING, GLIB,
    TELEPORT, TELEPAT, POLYMORPH, UNCHANGING, NON_PM, POLY_NOFLAGS, ismnum,
    TT_LAVA,
    WARNING, HALF_PHDAM, Is_waterlevel, Is_airlevel, In_endgame,
    WIN_ERR, MENU_BEHAVE_STANDARD, MENU_BEHAVE_PERMINV,
    WC2_HILITE_STATUS, WC2_FLUSH_STATUS,
    COLNO, S_upstair, S_brdnladder,
    RLOC_NOMSG, fuzzer_impossible_panic,
    RUN_TPORT, RUN_LEAP, RUN_STEP, RUN_CRAWL,
} from './const.js';

// C ref: allmain.c static mvl_change — delayed polyself(1) / you_were(2).
let mvl_change = 0;

// C pcconf.h:284 defines POSITIONBAR. unixconf.h (the contest tty build)
// does not, so moveloop_core's call stays behind this guard.
const POSITIONBAR = false;

/** C ref: youprop.h Teleportation — H || E via flat + uprops. */
function Teleportation(u = game.u || {}) {
    const e = u.uprops?.[TELEPORT];
    return !!((u.Teleportation || u.HTeleportation || u.ETeleportation)
        || (e?.intrinsic | 0) || (e?.extrinsic | 0));
}

/** C ref: youprop.h Polymorph — H || E via flat + uprops. */
function Polymorph(u = game.u || {}) {
    const e = u.uprops?.[POLYMORPH];
    return !!((u.Polymorph || u.HPolymorph || u.EPolymorph)
        || (e?.intrinsic | 0) || (e?.extrinsic | 0));
}

/** C ref: youprop.h Unchanging — H || E via flat + uprops. */
function Unchanging(u = game.u || {}) {
    const e = u.uprops?.[UNCHANGING];
    return !!((u.Unchanging || u.HUnchanging || u.EUnchanging)
        || (e?.intrinsic | 0) || (e?.extrinsic | 0));
}

/**
 * C ref: allmain.c moveloop once-per-turn after regen_pw —
 * Teleportation !rn2(85) → tele(); Polymorph/ulycn → mvl_change →
 * polyself / you_were when multi >= 0 && !Unchanging.
 * Named omit: cmdq_clear(CQ_REPEAT) when no JS repeat queue.
 */
async function maybe_tele_poly_were() {
    const u = game.u || (game.u = {});
    if (u.uinvulnerable) return;

    if (Teleportation(u) && !rn2(85)) {
        const old_ux = u.ux | 0;
        const old_uy = u.uy | 0;
        await tele();
        if ((u.ux | 0) !== old_ux || (u.uy | 0) !== old_uy) {
            const { next_to_u, check_leash } = await import('./apply.js');
            if (!(await next_to_u())) {
                await check_leash(old_ux, old_uy);
            }
            if (game._cmdq_canned) game._cmdq_canned = [];
            if (game._cmdq_repeat) game._cmdq_repeat = [];
        }
    }
    // delayed change may not be valid anymore
    if ((mvl_change === 1 && !Polymorph(u))
        || (mvl_change === 2 && (u.ulycn | 0) === NON_PM)) {
        mvl_change = 0;
    }
    if (Polymorph(u) && !rn2(100)) {
        mvl_change = 1;
    } else if (ismnum(u.ulycn) && !Upolyd(u) && !rn2(80 - (20 * night()))) {
        mvl_change = 2;
    }
    if (mvl_change && !Unchanging(u)) {
        if ((game.multi == null || game.multi >= 0)) {
            await stop_occupation();
            if (mvl_change === 1) await polyself(POLY_NOFLAGS);
            else await you_were();
            mvl_change = 0;
        }
    }
}

/**
 * C ref: allmain.c init_sound_disp_gamewindows `:699–763` — window-system
 * init singleton. Called once from `unixmain.c:217` after `vision_init`,
 * before `attempt_restore`; JS caller is `jsmain.js start()` after
 * `window_inited` is set, before `try_restore_save` (same relative order).
 * C creates WIN_MESSAGE / WIN_STATUS-or-windowport-status / WIN_MAP /
 * WIN_INVEN (`:719–726`), styles the inventory prompt (`:727–728`), runs
 * the empty `start_menu`/`end_menu` Qt pacify (`:738`), then displays
 * MESSAGE, clears the glyph buffer, and displays MAP (`:756–758`).
 * JS has no `create_nhwindow` for MESSAGE/STATUS/MAP (the terminal grid in
 * `display.js`/`game_display.js` is the window); the WIN_* fields below are
 * the same sentinel-id stand-in pattern as `invent.js` `WIN_INVEN_ID = 20`
 * for `create_nhwindow(NHW_MENU)` (not `WIN_ERR`). No RNG draws in C, so
 * this stays sync — `display_nhwindow(..., FALSE)` never blocks.
 * Named omissions: both `SoundAchievement` arms (`sndprocs.h:232–241`
 * no-op without `iflags.sounds` + achievement procs — cf.
 * `exper.js`/`insight.js` SoundAchievement debt); `#ifdef CHANGE_COLOR`
 * `change_palette` (`coloratt.c:1098–1108`, compiled out — `windconf.h`
 * leaves `CHANGE_COLOR` commented); `adjust_menu_promptstyle` ctrl relay
 * (`windows.c:1769–1778`, JS menus read `iflags.menu_headings` directly);
 * `start_menu`/`end_menu` empty-menu Qt pacify (no Qt window to pacify);
 * the three `display_nhwindow(..., FALSE)` paints (at init there is no
 * pending `--More--`, no level yet for MAP, and status is repainted by the
 * later `newgame`/`dorecover` `docrt`+`bot`; porting C control flow, never
 * a grid snapshot/restore per D-1831); `#ifndef STATUS_HILITES`
 * `display_nhwindow(WIN_STATUS)` (compiled out — `STATUS_HILITES` is
 * defined in `config.h:616`); `#ifdef TTY_PERM_INVENT`
 * `check_perm_invent_again` (`options.c:5532–5542`, `perm_invent_pending`
 * is falsy at init — the later `sync_perminvent` TOO_EARLY arm sets it).
 */
export function init_sound_disp_gamewindows() {
    let menu_behavior = MENU_BEHAVE_STANDARD | 0;

    activate_chosen_soundlib(); // C `:703` — soundlib table switch + init.
    // C `:705–710` if (iflags.wc_splash_screen && !flags.randomall)
    // SoundAchievement(0, sa2_splashscreen, 0) else SoundAchievement(0,
    // sa2_newgame_nosplash, 0) — both arms no-op without sound procs, but
    // keep the C condition reads in order (no short-circuit change).
    const wantSplash = !!((game.iflags?.wc_splash_screen) && !(game.flags?.randomall | 0));
    void wantSplash;

    // C `:712–717` #ifdef CHANGE_COLOR change_palette() — compiled out in
    // this build (see header comment); ga.altpalette stays all-zero so the
    // per-color win_change_color loop would no-op anyway.
    // C `:719` WIN_MESSAGE = create_nhwindow(NHW_MESSAGE) — sentinel id.
    game.WIN_MESSAGE = 10;
    // C `:720–724` if (VIA_WINDOWPORT()) status_initialize(FALSE) else
    // WIN_STATUS = create_nhwindow(NHW_STATUS). tty_procs sets the full
    // `:111–125` set; the installer carries every bit except the four
    // status bits (VIA_WINDOWPORT would reroute into the unported
    // status_update delivery, botl.js header), so this stays on the
    // else arm.
    install_tty_wincap2();
    const wincap2 = game.windowprocs?.wincap2 | 0;
    const viaWindowport = (wincap2 & (WC2_HILITE_STATUS | WC2_FLUSH_STATUS)) !== 0;
    if (viaWindowport) {
        // C allmain.c:721 status_initialize(FALSE).
        status_initialize(false);
    } else {
        game.WIN_STATUS = 11;
    }
    // C `:725` WIN_MAP = create_nhwindow(NHW_MAP) — sentinel id.
    game.WIN_MAP = 12;
    // C `:726` WIN_INVEN = create_nhwindow(NHW_MENU) — 20 matches the
    // invent.js WIN_INVEN_ID stand-in (any non-WIN_ERR id satisfies the
    // `:727`/`sync_perminvent` gates the same way).
    game.WIN_INVEN = 20;
    // C `:727–728` if (WIN_INVEN != WIN_ERR)
    // adjust_menu_promptstyle(WIN_INVEN, &iflags.menu_headings) — the ctrl
    // relay is implicit in JS (menus read menu_headings directly, cf.
    // invent.js add_menu_heading); keep the opt_need_promptstyle clear.
    if ((game.WIN_INVEN ?? WIN_ERR) !== WIN_ERR) {
        if (!game.go) game.go = {};
        game.go.opt_need_promptstyle = false;
    }
    // C `:730–735` #ifdef TTY_PERM_INVENT if (WINDOWPORT(tty) &&
    // WIN_INVEN != WIN_ERR) { menu_behavior = MENU_BEHAVE_PERMINV;
    // prepare_perminvent(WIN_INVEN); } — contest JS is tty
    // (options.js windowport_tty() always true); invent.js prepare_perminvent
    // is live, so wire it in C order. Default perminv_mode InvOptNone keeps
    // it a no-op until the mode changes (D-1600).
    const isTty = (game.windowprocs?.name ?? 'tty') === 'tty';
    if (isTty && (game.WIN_INVEN ?? WIN_ERR) !== WIN_ERR) {
        menu_behavior = MENU_BEHAVE_PERMINV | 0;
        prepare_perminvent(game.WIN_INVEN);
    }
    // C `:738` start_menu(WIN_INVEN, menu_behavior), end_menu(WIN_INVEN,
    // (char *) 0) — empty menu so an early quit never destroys an unused
    // Qt window. JS has no Qt window and no start/end_menu exports; the
    // WIN_INVEN id above is the pacify. menu_behavior is consumed here so
    // the PERMINV assignment is not dead state.
    void menu_behavior;
    // C `:753–755` #ifndef STATUS_HILITES display_nhwindow(WIN_STATUS,
    // FALSE) — compiled out (STATUS_HILITES defined); status paints via bot().
    // C `:756` display_nhwindow(WIN_MESSAGE, FALSE) — nothing pending at
    // init; later welcome/docrt flush paints. Intentionally no grid touch.
    // C `:757` clear_glyph_buffer() — live; no-ops when no level yet, same
    // as C forcing an empty gbuf before the first mklev.
    clear_glyph_buffer();
    // C `:758` display_nhwindow(WIN_MAP, FALSE) — no level yet; the newgame
    // / dorecover docrt paints the map. Intentionally no grid touch.
    // C `:759–762` #ifdef TTY_PERM_INVENT if (iflags.perm_invent_pending)
    // check_perm_invent_again() — falsy at init (named above).
}

// C ref: allmain.c moveloop_preamble() — moon/friday; new-game RNG only when !resuming
export async function moveloop_preamble(resuming) {
    if (!game.context) game.context = {};
    game.flags = game.flags || {};

    // C allmain.c:53–54 — a normal save restored under an explore request
    // is a normal restore, then the 'X' command (uses the save, confirms).
    if (resuming && game.iflags?.deferred_X) {
        await enter_explore_mode();
    }

    // C: flags.moonphase = phase_of_the_moon();
    game.flags.moonphase = phase_of_the_moon();
    if (game.flags.moonphase === FULL_MOON) {
        await pline('You are lucky!  Full moon tonight.');
        change_luck(1);
    } else if (game.flags.moonphase === NEW_MOON) {
        await pline('Be careful!  New moon tonight.');
    }
    game.flags.friday13 = friday_13th();
    if (game.flags.friday13) {
        await pline('Watch out!  Bad things can happen on Friday the 13th.');
        change_luck(-1);
    }

    if (!resuming) {
        // C allmain.c:71 — for TTY_PERM_INVENT; gates invent.c
        // sync_perminvent display_inventory (D-1603 / review 561).
        if (!game.program_state) game.program_state = {};
        game.program_state.beyond_savefile_load = 1;
        // C order: rndencode → set_wear → reset_justpicked → pickup(1) →
        // seer_turn → umovement → initrack (pickup deferred).
        game.context.rndencode = rnd(9000);
        // C: set_wear(NULL) — Helmet_on fedora luck, Blindf_on, etc.
        await set_wear(null);
        reset_justpicked(game.invent);
        await pickup(1); // C `:76` — autopickup at initial location
        game.context.seer_turn = rnd(30);
        game.u.umovement = NORMAL_SPEED;
        // C decl.c: hero_seq starts as 1<<3; moveloop resets on moves++
        game.hero_seq = ((game.moves || 1) | 0) << 3;
        initrack();
    } else {
        // C restore.c: hero_seq = moves << 3 (not saved)
        game.hero_seq = ((game.moves || 1) | 0) << 3;
        // C allmain.c:87–88 — subset of pickup() on restore, then shop repair.
        await read_engr_at(game.u?.ux, game.u?.uy);
        await fix_shop_damage(); // C `:88`
    }
    // C `:84` disp.botlx = TRUE (STATUS_HILITES); bot() reads flags.botlx.
    if (!game.disp) game.disp = {};
    game.disp.botlx = true;
    game.flags.botlx = true;
    // C: encumber_msg() — sync go.oldcap (auto-pickup / starting load)
    await encumber_msg();
    // C `:90–93` — deferred see_monsters catch-up.
    if (game.defer_see_monsters) {
        game.defer_see_monsters = false;
        see_monsters();
    }
    // C allmain.c:97 — u_init leaves uz0.dlevel at 0 (u_init.c:984).
    // Until this copy, on_level(uz, uz0) is false on the starting
    // level, so u_on_newpos takes the level-change arm every move.
    if (game.u) {
        if (!game.u.uz0) game.u.uz0 = { dnum: game.u.uz?.dnum | 0, dlevel: 0 };
        game.u.uz0.dlevel = game.u.uz?.dlevel | 0;
    }
    game.context.move = 0;
    // C `:100–103` — finish "--debug:fuzzer" command-line processing.
    if (game.iflags?.fuzzerpending) {
        game.iflags.debug_fuzzer = fuzzer_impossible_panic;
        game.iflags.fuzzerpending = false;
    }
    // C: program_state.in_moveloop = 1 — gates adjattrib STR/CON encumber_msg
    if (!game.program_state) game.program_state = {};
    game.program_state.in_moveloop = 1;
    // C allmain.c:107–110 — perm_invent preset after invent is populated
    // and in_moveloop is set. Default Off is a no-op (D-1603).
    if (game.iflags?.perm_invent) update_inventory();
}

// C ref: allmain.c u_calc_moveamt()
function u_calc_moveamt(wtcap) {
    let moveamt = 0;
    // Steed path when riding and hero actually moved this turn
    if (game.u?.usteed && game.u?.umoved) {
        moveamt = mcalcmove(game.u.usteed, true);
    } else {
        // C: gy.youmonst.data->mmove — non-poly role form is NORMAL_SPEED.
        const youData = game.youmonst?.data;
        moveamt = youData?.mmove ?? NORMAL_SPEED;

        if (Very_fast()) {
            // gain a free action on 2/3 of turns
            if (rn2(3) !== 0) moveamt += NORMAL_SPEED;
        } else if (Fast()) {
            // gain a free action on 1/3 of turns
            if (rn2(3) === 0) moveamt += NORMAL_SPEED;
        }
    }
    switch (wtcap) {
        case SLT_ENCUMBER:
            moveamt -= Math.trunc(moveamt / 4);
            break;
        case MOD_ENCUMBER:
            moveamt -= Math.trunc(moveamt / 2);
            break;
        case HVY_ENCUMBER:
            moveamt -= Math.trunc((moveamt * 3) / 4);
            break;
        case EXT_ENCUMBER:
            moveamt -= Math.trunc((moveamt * 7) / 8);
            break;
        case UNENCUMBERED:
        default:
            break;
    }
    game.u.umovement = (game.u.umovement || 0) + moveamt;
    if (game.u.umovement < 0) game.u.umovement = 0;
}

// C ref: allmain.c maybe_generate_rnd_mon()
// C: !rn2(udemigod ? 25 : (depth(&u.uz) > depth(&stronghold_level)) ? 50 : 70)
async function maybe_generate_rnd_mon() {
    const u = game.u || {};
    let rate = 70;
    if (u.uevent?.udemigod) {
        rate = 25;
    } else if (depth(u.uz) > depth(game.stronghold_level)) {
        rate = 50;
    }
    if (!rn2(rate)) {
        const rndmon = makemon(null, 0, 0, NO_MM_FLAGS);
        // C: the appear Norep is inside makemon (:1476–1500).
        if (rndmon) await makemon_appear_msg(rndmon, rndmon.mx | 0, rndmon.my | 0, NO_MM_FLAGS);
    }
}

/** C youprop.h Regeneration — H || E via flat + uprops. */
function Regeneration(u = game.u || {}) {
    return !!(u.HRegeneration || u.ERegeneration
        || (u.uprops?.[REGENERATION]?.intrinsic | 0)
        || (u.uprops?.[REGENERATION]?.extrinsic | 0));
}

/** C youprop.h Breathless — Magical_breathing || breathless(form). */
function Breathless(u = game.u || {}) {
    const prop = u.uprops?.[MAGICAL_BREATHING];
    if ((prop?.intrinsic | 0) || (prop?.extrinsic | 0)
        || (u.HMagical_breathing | 0) || (u.EMagical_breathing | 0)) {
        return true;
    }
    return breathless(game.youmonst?.data);
}

/** C youprop.h Half_physical_damage — H || E HALF_PHDAM. */
function Half_physical_damage(u = game.u || {}) {
    const e = u.uprops?.[HALF_PHDAM];
    return !!((u.HHalf_physical_damage | 0) || (u.EHalf_physical_damage | 0)
        || (e?.intrinsic | 0) || (e?.extrinsic | 0));
}

/** C youprop.h Warning — H || E via flat + uprops. */
function Warning(u = game.u || {}) {
    const e = u.uprops?.[WARNING];
    return !!((u.HWarning | 0) || (u.EWarning | 0) || u.Warning
        || (e?.intrinsic | 0) || (e?.extrinsic | 0));
}

/** C: U_CAN_REGEN() — Regeneration || (Sleepy && u.usleep). */
function u_can_regen() {
    const u = game.u || {};
    const sleepy = !!(u.HSleepy || u.ESleepy);
    return Regeneration(u) || (sleepy && !!u.usleep);
}

/**
 * C ref: allmain.c:975–983 interrupt_multi(msg) — stop voluntary multi-turn
 * activity via nomul(0), then verbose-gated Norep(msg).
 */
async function interrupt_multi(msg) {
    const ctx = game.context || {};
    if ((game.multi || 0) > 0 && !ctx.travel && !ctx.run) {
        nomul(0);
        // C: if (flags.verbose && msg) Norep("%s", msg) — verbose defaults on.
        if (msg && (game.flags?.verbose !== false)) await Norep(msg);
    }
}

/**
 * C ref: allmain.c:624–679 regen_hp(wtcap) — maybe recover HP once/turn;
 * Upolyd eel out of water may lose hp (rn2(mh) > rn2(8)); Upolyd mh<1
 * rehumanize() :632–634 ("shouldn't happen" guard; live polyself.js export).
 */
async function regen_hp(wtcap) {
    const u = game.u || (game.u = {});
    let heal = 0;
    let reached_full = false;
    const encumbrance_ok = (wtcap < MOD_ENCUMBER || !u.umoved);

    if (Upolyd(u)) {
        if ((u.mh || 0) < 1) {
            // C :632–634: shouldn't happen, but rehumanize back to human form.
            await rehumanize();
        } else if (
            game.youmonst?.data?.mlet === 'S_EEL'
            && !is_pool(u.ux | 0, u.uy | 0)
            && !Is_waterlevel(u.uz)
            && !Breathless(u)
        ) {
            // eel out of water loses hp (monster eels similar)
            if (
                (u.mh | 0) > 1
                && !Regeneration(u)
                && rn2(u.mh | 0) > rn2(8)
                && (!Half_physical_damage(u) || !((game.moves | 0) % 2))
            ) {
                heal = -1;
            }
        } else if ((u.mh || 0) < (u.mhmax || 0)) {
            if (u_can_regen() || (encumbrance_ok && !((game.moves || 0) % 20))) {
                heal = 1;
            }
        }
        if (heal) {
            if (!game.flags) game.flags = {};
            game.flags.botl = true;
            u.mh = (u.mh || 0) + heal;
            reached_full = (u.mh === u.mhmax);
        }
    } else if (
        (u.uhp || 0) < (u.uhpmax || 0) && (encumbrance_ok || u_can_regen())
    ) {
        // C: heal = (u.ulevel + (int)ACURR(A_CON)) > rn2(100);
        heal = ((u.ulevel || 1) + acurr(A_CON)) > rn2(100) ? 1 : 0;
        if (u_can_regen()) heal += 1;
        if ((u.HSleepy || u.ESleepy) && u.usleep) heal++;

        if (heal) {
            if (!game.flags) game.flags = {};
            game.flags.botl = true;
            u.uhp = (u.uhp || 0) + heal;
            if (u.uhp > u.uhpmax) u.uhp = u.uhpmax;
            reached_full = (u.uhp === u.uhpmax);
        }
    }

    if (reached_full) await interrupt_multi('You are in full health.');
}

/**
 * C ref: allmain.c regen_pw(wtcap) — maybe recover Pw once/turn.
 */
async function regen_pw(wtcap) {
    const u = game.u || (game.u = {});
    if ((u.uen | 0) >= (u.uenmax | 0)) return;

    // C: Energy_regeneration ≡ H || E ENERGY_REGENERATION uprops
    const energy_regen = !!(
        (u.uprops?.[ENERGY_REGENERATION]?.intrinsic | 0)
        || (u.uprops?.[ENERGY_REGENERATION]?.extrinsic | 0)
        || u.HEnergy_regeneration
        || u.EEnergy_regeneration
    );
    const period = Math.trunc(
        ((MAXULEV + 8 - (u.ulevel | 0))
            * (game.urole?.mnum === PM_WIZARD ? 3 : 4))
            / 6,
    );
    const tick_ok = wtcap < MOD_ENCUMBER
        && period > 0
        && !((game.moves || 0) % period);
    if (!tick_ok && !energy_regen) return;

    // C: upper = (ACURR(WIS)+ACURR(INT))/15 + 1; EMagical_breathing += 2
    let upper = Math.trunc((acurr(A_WIS) + acurr(A_INT)) / 15) + 1;
    const e_mag_breath = !!(
        (u.uprops?.[MAGICAL_BREATHING]?.extrinsic | 0)
        || u.EMagical_breathing
    );
    if (e_mag_breath) upper += 2;

    u.uen = (u.uen | 0) + rn1(upper, 1);
    if (u.uen > (u.uenmax | 0)) u.uen = u.uenmax | 0;
    if (!game.flags) game.flags = {};
    game.flags.botl = true;
    if (u.uen === (u.uenmax | 0)) {
        await interrupt_multi('You feel full of energy.');
    }
}

/**
 * C ref: attrib.c exerper — hunger / encumbrance / status exercise ticks.
 * Named omissions: full Sick/Vomiting timeout bodies (flags only when set).
 */
function exerper() {
    const moves = game.moves || 0;
    const u = game.u || {};
    // C attrib.c:523–524 — exerper hunger/encumbrance ticks every 10 moves.
    if (!(moves % 10)) {
        // Hunger Checks — Tourist starts Not Hungry → exercise(A_CON, TRUE)
        const hunger = u.uhunger ?? 900;
        const isMonk = (game.urole?.mnum | 0) === PM_MONK;
        if (hunger > 1000) {
            exercise(A_DEX, false);
            // C attrib.c:534–536 — SATIATED Monk also trains WIS
            if (isMonk) exercise(A_WIS, false);
        } else if (hunger > 150) {
            exercise(A_CON, true);
        } else if (hunger > 50) {
            /* HUNGRY — no exercise in switch until WEAK */
        } else if (hunger > 0) {
            exercise(A_STR, false);
            // C attrib.c:542–544 — WEAK fasting Monk trains WIS
            if (isMonk) exercise(A_WIS, true);
        } else {
            exercise(A_CON, false);
        }

        // Encumbrance Checks
        switch (near_capacity()) {
        case MOD_ENCUMBER:
            exercise(A_STR, true);
            break;
        case HVY_ENCUMBER:
            exercise(A_STR, true);
            exercise(A_DEX, false);
            break;
        case EXT_ENCUMBER:
            exercise(A_DEX, false);
            exercise(A_CON, false);
            break;
        default:
            break;
        }
    }

    // status checks every 5 moves
    if (!(moves % 5)) {
        // C attrib.c:570–575 — intrinsic clairvoyance trains WIS (H only;
        // extrinsic does not count), regeneration trains STR (H only).
        const clairProp = u.uprops?.[CLAIRVOYANT];
        const hasClair = (u.HClairvoyant | 0) || (clairProp?.intrinsic | 0);
        const blockClair = (u.BClairvoyant | 0) || (clairProp?.blocked | 0);
        if (hasClair && !blockClair) exercise(A_WIS, true);
        const regenProp = u.uprops?.[REGENERATION];
        if ((u.HRegeneration | 0) || (regenProp?.intrinsic | 0)) {
            exercise(A_STR, true);
        }
        // C: Confusion ≡ HConfusion; Hallucination ≡ HHallucination && !res
        if (u.Sick || u.Vomiting) exercise(A_CON, false);
        if ((u.HConfusion | u.Confusion)
            || ((u.HHallucination | 0) && !(u.Halluc_resistance | 0))
            || u.Hallucination) {
            exercise(A_WIS, false);
        }
        // C: (Wounded_legs && !usteed) || Fumbling || HStun
        // Fumbling ≡ HFumbling || EFumbling (youprop.h), not a boolean flag.
        const wounded = !!(u.Wounded_legs
            || ((u.HWounded_legs | 0) & TIMEOUT)
            || (u.EWounded_legs | 0));
        if ((wounded && !u.usteed) || Fumbling() || (u.HStun | 0)) {
            exercise(A_DEX, false);
        }
    }
}

/* Exercise/abuse text — C attrib.c exertext[A_MAX][2] `:588–595`.
   Int/Cha are {0,0}: exercise never accumulates them, so the `:621–624`
   `!ax → continue` below keeps those arms unreachable (C comment there). */
const EXERTEXT = [
    ['exercising diligently', 'exercising properly'],           // Str
    [null, null],                                               // Int
    ['very observant', 'paying attention'],                     // Wis
    ['working on your reflexes', 'working on reflexes lately'], // Dex
    ['leading a healthy life-style', 'watching your health'],   // Con
    [null, null],                                               // Cha
];

/**
 * C ref: attrib.c exerchk `:598–677` — periodic exercise/abuse resolve,
 * in C order. Caller: allmain.c:356 → moveloop below.
 * Named omissions: debugpline1/0/2 (`:608`, `:614`, `:646–656`, `:676` —
 * D_DEBUG-only, D-2586 precedent); exerper Clairvoyant/Regen/Monk arms +
 * makeknown-credit (open D-1994); Fixed_abil/Dunce gate inside adjattrib.
 */
async function exerchk() {
    /* C `:602–604`: check out the periodic accumulations first. */
    exerper();
    const g = game;
    const moves = g.moves || 0;
    if (!g.context) g.context = {};
    // C: next_attrib_check defaults to 600 at newgame
    if (g.context.next_attrib_check == null) g.context.next_attrib_check = 600;
    /* C `:607–612`: are we ready for a test? moves past the mark, not multi. */
    if (moves < g.context.next_attrib_check || (g.multi || 0)) return;

    const AVAL = 50; // C `:486` tune value for exercise gains
    const u = g.u || {};
    if (!u.aexe) u.aexe = { a: [0, 0, 0, 0, 0, 0] };
    const race = g.urace || {};

    for (let i = 0; i < A_MAX; ++i) { // C `:618`
        let ax = u.aexe.a[i] || 0; // C `:620` ax = AEXE(i)
        /* C `:621–624`: nothing to do if no exercise/abuse has occurred
           (Int and Cha always fall into this category); ok to skip nextattrib. */
        if (!ax) continue;

        const mod_val = ax > 0 ? 1 : -1; // C `:626` sgn(ax): +1 or -1
        /* C `:627–632`: lolim = ATTRMIN(i), hilim = ATTRMAX(i) capped at 18 —
           ATTRMAX (attrib.h:43) takes the Upolyd-Str arm via uasmon_maxStr. */
        const lolim = race.attrmin?.[i] ?? 3;
        let hilim = (i === A_STR && Upolyd(u)) ? uasmon_maxStr() : (race.attrmax?.[i] ?? 18);
        if (hilim > 18) hilim = 18;
        const abase = u.acurr?.a?.[i] ?? 0; // C ABASE(i) (attrib.h:21)
        /* C `:633–634`: no further effect for exercise at max / abuse at min.
           C `:635–637`: can't exercise non-Wisdom while polymorphed.
           Both goto nextattrib, which still halves AEXE below. */
        let skipChange = false;
        if ((ax < 0) ? (abase <= lolim) : (abase >= hilim)) {
            skipChange = true;
        } else if (Upolyd(u) && i !== A_WIS) {
            skipChange = true;
        } else {
            /* C `:648–659`: diminishing returns part III — don't always gain.
               Wis treated specially for balance (MRS 92/10/28). */
            const thresh = (i !== A_WIS)
                ? Math.trunc(Math.abs(ax) * 2 / 3)
                : Math.abs(ax);
            if (rn2(AVAL) > thresh) skipChange = true;
        }

        if (!skipChange && (await adjattrib(i, mod_val, -1))) { // C `:661–662`
            /* C `:663–665`: a real change zeroes the accumulation. */
            ax = 0;
            u.aexe.a[i] = 0;
            /* C `:666–669`: print an explanation via You (Int/Cha null
               arms unreachable — see EXERTEXT note above). */
            await You(
                '%s %s.',
                mod_val > 0 ? 'must have been' : "haven't been",
                EXERTEXT[i][mod_val > 0 ? 0 : 1],
            );
        }
        /* C nextattrib `:670–673`: halve (truncation toward zero, never
           platform-dependent /=2 on negatives). */
        u.aexe.a[i] = Math.trunc(Math.abs(ax) / 2) * mod_val;
    }
    /* C `:674–676`: schedule the next check. */
    g.context.next_attrib_check += rn1(200, 800);
}

// C ref: allmain.c welcome() `:854–929` — whole body in C order.
export async function welcome(new_game) {
    const g = game;
    const u = g.u || {};
    const role = g.urole || {};
    const race = g.urace || {};
    // C `:858–859`: currentgend = Upolyd ? u.mfemale : flags.female;
    // adrift = (u.ualign.type != u.ualignbase[A_CURRENT])
    const currentgend = Upolyd(u) ? !!u.mfemale : !!g.flags?.female;
    const atype = u.ualign?.type ?? 0;
    const baseCur = u.ualignbase?.current ?? atype;
    const baseOrig = u.ualignbase?.original ?? atype;
    const adrift = atype !== baseCur;

    // C `:860`
    await l_nhcore_call(new_game ? NHCORE_START_NEW_GAME : NHCORE_RESTORE_OLD_GAME);

    // C `:862–866`: skip "welcome back" if restoring a doomed character
    if (!new_game && Upolyd(u) && ugenocided()) {
        // C `:864–865`: death via self-genocide is pending
        await pline("You're back, but you still feel %s inside.", udeadinside());
        return;
    }

    // C `:869–870` (Hallucination ≡ HHallucination && !res — a call here,
    // js/display.js:1047; the bare binding is always truthy)
    if (Hallucination())
        await pline('NetHack is filmed in front of an undead studio audience.');

    // C `:872–910`: the "welcome back" message describes the innate form;
    // align shown for new games, or restores when base changed or adrift.
    // (The `#if 0` A_ORIGINAL arm is dead in C — only the `#else` ships.)
    let buf = ''; // C `*buf = '\0'`
    if (new_game || baseOrig !== baseCur || adrift) {
        buf += ` ${adrift ? 'adrift ' : ''}${align_str(adrift ? atype : baseCur)}`;
    }
    // C: if (!urole.name.f && both genders allowed on new_game) add gender adj
    const allowGend = (role.allow ?? 0) & ROLE_GENDMASK;
    if (!role.name?.f
        && (new_game
            ? allowGend === (ROLE_MALE | ROLE_FEMALE)
            : currentgend !== !!g.flags?.initgend)) {
        buf += ` ${currentgend ? 'female' : 'male'}`;
    }
    buf += ` ${race.adj || 'human'}`;
    buf += ` ${(currentgend && role.name?.f) ? role.name.f : (role.name?.m || 'Adventurer')}`;

    const hello = Hello(role.mnum);
    const plname = g.plname || 'Hero';
    await pline(new_game ? `${hello} ${plname}, welcome to NetHack!  You are a${buf}.`
        : `${hello} ${plname}, the${buf}, welcome back to NetHack!`);

    if (new_game) {
        // C `:918–920`: guarantee that 'major' event category is never empty
        livelog_printf(LL_ACHIEVE, '%s the%s entered the dungeon', plname, buf);
    } else {
        // C `:922–927`: restoring in Gehennom gets the entry message again,
        // plus the level-annotation reminder from goto_level()
        await hellish_smoke_mesg();
        await print_level_annotation();
    }
}

/**
 * C ref: allmain.c early_init `:32–45` — whole body in C order.
 * Process-start global reset; sole C caller unixmain.c:66 (port entry —
 * JS caller is jsmain.js start(), immediately after resetGame()).
 * `:36–39` CRASHREPORT is active in the contest Linux build (config.h:249
 * defines it for __linux__ unless NOCRASHREPORT, which unixconf.h does
 * not set), so the `:38` call is live, not compiled out. (argc, argv) are
 * C pass-through (USED_FOR_CRASHREPORT); the JS entry has no argv
 * (Rule #2: no process plumbing — earlyarg.js), so jsmain passes (0, [])
 * and crashreport voids them (report.js).
 * Sync like C (pure startup init, no window/RNG work).
 * @param {number} argc C argc (nhUse: unread)
 * @param {string[]} argv C argv (nhUse: unread)
 */
export function early_init(argc, argv) {
    program_state_init(); // C `:35`
    crashreport_init(argc, argv); // C `:38`
    decl_globals_init(); // C `:40`
    objects_globals_init(); // C `:41`
    monst_globals_init(); // C `:42`
    sys_early_init(); // C `:43`
    runtime_info_init(); // C `:44`
}

// C ref: allmain.c newgame()
export async function newgame() {
    const g = game;

    // C allmain.c:771 — notice_mon_off first so welcome / legacy /
    // docrt happen before noticing monsters (D-1200). Catch-up after
    // welcome. Default mon_notices Off (optlist spot_monsters).
    notice_mon_off();

    // C `:772` disp.botlx = TRUE; bot() reads flags.botlx.
    if (!g.disp) g.disp = {};
    g.disp.botlx = true;
    g.flags = g.flags || {};
    g.flags.botlx = true;

    // C: moves starts 0 until u_init_role; reset align_shift statics
    g.moves = 0;
    reset_align_shift_cache();
    // C: mons[PM_ERINYS] starts at monsters.h baseline each process;
    // JS reuses the module — undo prior adj_erinys mutations.
    reset_erinys();

    // C ref: allmain.c newgame — context.ident / tribute before init_objects
    if (!g.context) g.context = {};
    if (g.context.ident == null) g.context.ident = 2;
    // C: svc.context.warnlevel = 1
    if (g.context.warnlevel == null) g.context.warnlevel = 1;
    // C: svc.context.next_attrib_check = 600L
    if (g.context.next_attrib_check == null) g.context.next_attrib_check = 600;
    if (!g.context.tribute) g.context.tribute = {};
    g.context.tribute.enabled = true;
    g.context.tribute.bookstock = !!g.context.tribute.bookstock;

    // C ref: allmain.c — mvitals.mvflags = geno & G_NOCORPSE (before init_objects)
    if (!g.mvitals) g.mvitals = [];
    for (let i = LOW_PM; i < NUMMONS; i++) {
        const ptr = mons(i);
        g.mvitals[i] = {
            ...(g.mvitals[i] || {}),
            mvflags: (ptr?.geno ?? 0) & G_NOCORPSE,
            born: g.mvitals[i]?.born ?? 0,
            died: g.mvitals[i]?.died ?? 0,
        };
    }

    // C ref: allmain.c → init_objects() (o_init.c)
    init_objects();

    // C ref: allmain.c:785-786 — pantheon reset + role_init() before
    // init_dungeons(), u_init() and init_artifacts(). role_init resolves
    // role/race/gender/align into flags.init* (random fallback per C),
    // copies urole/urace, and runs the quest-pm/pantheon/godgend/Cleric
    // arms; setup_role_race_from_rc then shapes the JS role objects.
    g.flags = g.flags || {};
    g.flags.pantheon = -1; // role_init() will reset this
    await role_init(); // must be before init_dungeons(), u_init(), init_artifacts()
    // Role/race before init_dungeons (quest filecode in fixup_level_locations)
    const rc = g._parsed_rc || {};
    setup_role_race_from_rc({
        role: rc.role || 'Tourist',
        race: rc.race || 'human',
        gender: rc.gender || 'female',
        align: rc.align || 'neutral',
        name: rc.name || g.plname || 'Contestant',
    });

    // C ref: allmain.c → init_dungeons() (dungeon.c) — peels fastforward_pre_mklev
    init_dungeons();
    // C allmain.c:792 — init_artifacts after role_init/init_dungeons,
    // before u_init_misc so WIZKIT can name artifacts (D-1201). Not
    // wizkit delivery / reset_glyphmap.
    init_artifacts();
    // C ref: allmain.c → u_init_misc() (u_init.c)
    await u_init_misc();
    // C optlist.h:530/560 — pauper/nudist addrs are &u.uroleplay.*
    // (SET_IN_CONFIG, parsed before newgame); options.c:5290–5292 pauper
    // implies nudist. JS parses into flags.* (options.js rows), so bridge
    // them onto u.uroleplay before the first readers (makedog saddle,
    // u_init_role inventory, legacy dispatch). flags.nudist already
    // carries pauper-implies-nudist (options.js after-change arm), so a
    // straight copy reproduces C's parse sequence exactly.
    g.u.uroleplay = g.u.uroleplay || {};
    g.u.uroleplay.pauper = !!g.flags?.pauper;
    g.u.uroleplay.nudist = !!g.flags?.nudist;
    fastforward_pre_mklev(); // emptied — kept as delete-only hook

    // C ref: allmain.c l_nhcore_init() — shuffle align[] for Lua (second nhlib load)
    l_nhcore_init();

    g.u = g.u || {};
    g.u.uz = g.u.uz || { dnum: 0, dlevel: 1 };
    // ulevel/HP/Pw/ualign already set in u_init_misc (C order)
    g.u.ulevel = g.u.ulevel || 1; // needed during mklev for monmax_difficulty / rne
    g.u.uac = 0; // C: 0 until find_ac(); first bot may show AC:0
    g.flags = g.flags || {};
    // mines_dnum / oracle_level / branches set by init_dungeons / fixup_level_locations

    // Real mklev: rooms/corridors + fill_ordinary_room + mineralize
    await mklev();

    // Post-mklev placeholders that u_init_misc does not set
    g.u.ulevel = 1;
    g.u.uexp = 0;
    g.u.urexp = 0;
    g.u.uhunger = g.u.uhunger ?? 900;
    // C: svm.moves = 1 in u_init_role via u_init_inventory_attrs (after mklev)
    g.flags.female = g.flags.female !== false;
    g.plname = g.plname || 'Contestant';

    // C ref: allmain.c newgame() — u_on_upstairs before makedog
    await u_on_upstairs();
    // C `:806` — special-room arrival checks (rogue level, etc.).
    await check_special_room(false);
    // C `:808–809` — a monster on the hero's starting spot is moved off.
    {
        const heroSpot = m_at(g.u?.ux | 0, g.u?.uy | 0); // MON_AT
        if (heroSpot) await mnexto(heroSpot, RLOC_NOMSG);
    }
    // C ref: allmain.c → makedog() (skipped when preferred_pet === 'n')
    await makedog();

    // C ref: allmain.c → u_init_inventory_attrs() (after makedog)
    await u_init_inventory_attrs();

    // Initial display BEFORE wear (C: docrt/bot then u_init_skills_discoveries)
    init_vision_globals();
    initrack(); // C: allmain.c / cmd.c — clear hero track ring
    vision_reset();
    vision_recalc(0);
    await cls();
    await docrt();
    await flush_screen(1);
    await bot();
    // C ref: allmain.c newgame() `:820–823` — reroll loop before skills.
    while ((g.u?.uroleplay?.reroll) && (await reroll_menu())) {
        await u_init_inventory_attrs();
        await bot();
    }
    // Snapshot status for legacy window — C tty often still shows pre-wear botl
    const statusSnap = snapshot_status_lines();

    // C ref: allmain.c → u_init_skills_discoveries() (wear/wield/discover)
    u_init_skills_discoveries();

    // C allmain.c:826–829 — wizard read_wizkit + obj_delivery(FALSE)
    // after skills, before flags.legacy. Overflow WIZKIT items are
    // MIGR_WITH_HERO (files.c wizkit_addinv); FALSE delivers that dest.
    if (g.flags?.debug || g.flags?.wizard) {
        await read_wizkit();
        await obj_delivery(false);
    }

    // C ref: allmain.c:831–833 — if (flags.legacy)
    // com_pager(u.uroleplay.pauper ? "pauper_legacy" : "legacy")
    if (g.flags.legacy !== false) {
        const align = ['law', 'neutral', 'chaos'];
        for (let i = align.length; i > 1; i--) {
            const j = rn2(i);
            [align[i - 1], align[j]] = [align[j], align[i - 1]];
        }
        g._legacy_align = align;
        await com_pager_legacy(statusSnap, !!g.u?.uroleplay?.pauper);
    }

    // Refresh map/status after wear (and after legacy dismiss)
    await docrt();
    await flush_screen(1);
    await bot();

    // C allmain.c `:835–838` — wall-clock play time, then the insurance
    // checkpoint, then something_worth_saving.
    g.urealtime = { realtime: 0, start_timing: getnow(), finish_time: 0 };
    save_currentstate();
    if (!g.program_state) g.program_state = {};
    g.program_state.something_worth_saving =
        (g.program_state.something_worth_saving | 0) + 1;

    // C ref: allmain.c welcome(TRUE)
    await welcome(true);

    // C allmain.c:844–848 — notice_mon_on after welcome; glyph_updates
    // then dolookaround else notice_all_mons(TRUE) (D-1200/D-1217).
    notice_mon_on();
    if (g.a11y?.glyph_updates) {
        await dolookaround();
    } else {
        await notice_all_mons(true);
    }

    // C ref: unixmain.c wd_message() after newgame() — explore/discovery
    if (g.flags.explore || g.flags.discover) {
        await pline('You are in non-scoring explore/discovery mode.');
    }

    // C ref: allmain.c moveloop() → moveloop_preamble(FALSE) before first turn
    await moveloop_preamble(false);
    // C ref: allmain.c moveloop() → maybe_do_tutorial() before core loop
    await maybe_do_tutorial();
}

/**
 * C ref: options.c ask_do_tutorial() — NHW_MENU y/n unless OPTIONS=tutorial set.
 * C ref: wintty.c tty_end_menu / tty_display_nhwindow / process_menu_window
 *        H2344_BROKEN corner offx = min(min(82, cols/2), cols-maxcol-1);
 *        title uses menu_headings (ATR_INVERSE) after adjust_menu_promptstyle.
 *
 * process_menu_window: invalid letter → nhbell + stay open (no rebuild);
 * space/return with no pick → select_menu n==0 → outer loop rebuilds and
 * pass++ adds "(Please choose 'y' or 'n'.)".
 */
async function ask_do_tutorial() {
    if (game.tutorial_set_in_config) return !!game.flags.tutorial;
    // C flushes pending topline --More-- (welcome) before the tutorial menu
    await flush_topl_more();
    let pass = 0;
    for (;;) {
        // C: nh_basename(get_configfile()) — contest sessions use .nethackrc
        const rcname = '.nethackrc';
        const footer =
            `Put "OPTIONS=!tutorial" in ${rcname} to skip this query.`;
        // Order after tty_end_menu(prompt): prompt, "", y, n, "", footer [, hint]
        const entries = [
            { text: 'Do you want a tutorial?', attr: ATR_INVERSE },
            { text: '', attr: 0 },
            { text: 'y - Yes, do a tutorial', attr: 0 },
            { text: 'n - No, just start play', attr: 0 },
            { text: '', attr: 0 },
            { text: footer, attr: 0 },
        ];
        if (pass > 0)
            entries.push({ text: "(Please choose 'y' or 'n'.)", attr: 0 });

        await paint_corner_nhw_menu(entries, '(end) ');

        // Inner loop ≡ process_menu_window while (!finished)
        let dismissNoPick = false;
        for (;;) {
            const key = await nhgetch();
            const ch = String.fromCharCode(key);
            if (ch === 'y' || ch === 'Y') {
                game._menu_overlay = false;
                await docrt();
                await flush_screen(1);
                return true;
            }
            if (ch === 'n' || ch === 'N' || key === 27) {
                game._menu_overlay = false;
                await docrt();
                await flush_screen(1);
                return false;
            }
            // C: space/return finish with no selection → n==0
            if (ch === ' ' || key === 13 || key === 10) {
                dismissNoPick = true;
                break;
            }
            // C: unacceptable input → tty_nhbell; cursor stays; wait again
            continue;
        }

        game._menu_overlay = false;
        await docrt();
        await flush_screen(1);
        if (dismissNoPick) pass++;
    }
}

/** C ref: allmain.c maybe_do_tutorial() — schedule_goto tut-1 + deferred_goto. */
async function maybe_do_tutorial() {
    // C: s_level *sp = find_level("tut-1"); if (!sp) return;
    const sp = find_level('tut-1');
    if (!sp) return;
    if (!(await ask_do_tutorial())) return;
    const u = game.u;
    if (!u.ucamefrom) u.ucamefrom = { dnum: 0, dlevel: 0 };
    u.ucamefrom.dnum = u.uz.dnum | 0;
    u.ucamefrom.dlevel = u.uz.dlevel | 0;
    if (!game.iflags) game.iflags = {};
    game.iflags.nofollowers = true;
    schedule_goto(sp.dlevel, UTOTYPE_NONE, 'Entering the tutorial.', null);
    await deferred_goto();
    vision_recalc(0);
    await docrt();
    game.iflags.nofollowers = false;
}

/** C allmain.c:944 — static char pbar[COLNO], reused across calls. */
const positionbarBuf = new Array(COLNO).fill(0);

/** C sym.h:107 is_cmap_stairs — S_upstair through S_brdnladder. */
function is_cmap_stairs(symbol) {
    return symbol >= S_upstair && symbol <= S_brdnladder;
}

/**
 * C winprocs.h:145 update_positionbar → tty_update_positionbar
 * (wintty.c:4159–4167). The tty body is video_update_positionbar only
 * under MSDOS (sys/msdos/video.c:701–716, then vga/vesa). The contest
 * unix tty compiles that function empty, so the buffer is not painted.
 * @param {number[]} _posbar static pbar, 0-terminated
 */
function update_positionbar(_posbar) {
    // unix tty has no statement here. MSDOS would call
    // video_update_positionbar(_posbar) (sys/msdos/video.c:703).
}

/**
 * Truncate to C signed char, the `(char)` store in do_positionbar.
 * x86_64 char is signed; columns above 127 become negative.
 * @param {number} n
 */
function positionbar_char(n) {
    return (n << 24) >> 24;
}

/**
 * C allmain.c:933–972 do_positionbar.
 * #ifdef POSITIONBAR (pcconf.h:284). unixconf.h does not define it, so
 * moveloop_core does not enter this on the contest tty build.
 *
 * The C FIXME stays: a coordinate wider than char does not fit; the
 * buffer is direction/x pairs, not a line of spaces; levl.glyph is used
 * as stored, so an object covering a stair hides it (the getpos() TODO
 * is not implemented in C); the stairs list skips mimics that only pose
 * as stairs.
 */
export function do_positionbar() {
    // C :936–943 — (char) cannot hold a wide coordxy. MS-DOS video reads
    // that byte as unsigned char. The buffer stays static pairs of
    // direction and x, not a line of spaces.
    let p = 0;
    // C :949 — the getpos() method that would ignore objects covering
    // stairs is a TODO in C and is not called.
    // C :950 — walking gs.stairs skips mimics that only pose as stairs.
    // C :951–961 — glyph is levl[x][y].glyph, the remembered int.
    for (let stway = game.stairs; stway; stway = stway.next) {
        const x = stway.sx | 0;
        const y = stway.sy | 0;
        const loc = game.level?.at?.(x, y);
        const memg = loc?.remembered_glyph?.glyph;
        const glyph = typeof memg === 'number' ? (memg | 0) : 0;
        const symbol = glyph_to_cmap(glyph);
        if (is_cmap_stairs(symbol)) {
            // C :958 — upstairs '<', otherwise '>'.
            positionbarBuf[p++] = stway.up ? 60 : 62;
            // C :959 — (char) x.
            positionbarBuf[p++] = positionbar_char(x);
        }
    }
    // C :963–967 — hero column. ux 0 is omitted.
    const ux = game.u?.ux | 0;
    if (ux) {
        positionbarBuf[p++] = 64; // '@'
        positionbarBuf[p++] = positionbar_char(ux);
    }
    // C :968–969 — fence post. Bytes past the NUL stay, as in the static buf.
    positionbarBuf[p] = 0;
    update_positionbar(positionbarBuf);
}

// C ref: allmain.c moveloop_core()
export async function moveloop_core() {
    const g = game;
    if (!g.context) g.context = {};
    if (!g.u) g.u = {};

    // C allmain.c:181–184 — SAFERHANGUP (unixconf.h) done_hup →
    // end_of_input before get_nh_event / dobjsfree.
    if (g.program_state?.done_hup) {
        await end_of_input();
        return;
    }

    // C allmain.c:185–201 — get_nh_event is a tty no-op (wintty.c:758).
    // do_positionbar() at :187 is inside #ifdef POSITIONBAR. That macro
    // is pcconf.h only, so the unix tty call is not compiled.
    if (POSITIONBAR) do_positionbar();
    // C allmain.c:189–190 — after descriptions shuffle, move object-glyph
    // custom colors onto the glyph that now shows that description.
    // Dynamic import: a static glyphs.js edge is evaluated while display.js
    // is still initializing (glyphs.js:72 reads S_sw_tl at load).
    if (g.iflags?.pending_customizations) {
        const { maybe_shuffle_customizations } = await import('./glyphs.js');
        maybe_shuffle_customizations();
    }
    // Then dobjsfree, bypasses, sanity_check, resume_wish in C order.
    dobjsfree();
    // C allmain.c:194–196 — bypass flags left by bypass_objlist /
    // nxt_unbypassed_obj (worn.c:1067); worm mcorpsenm back to NON_PM.
    if (g.context.bypasses) clear_bypasses();
    // sanity_check before context.move (opt_in Off; gold/invlet D-1664).
    if (g.iflags?.sanity_check || g.iflags?.debug_fuzzer) {
        await sanity_check();
    }
    // C allmain.c:199–201 — a wish cut short by term_gone resumes here
    // (zap.c:6341 sets, makewish clears at entry per zap.c:6323).
    if (g.context.resume_wish) {
        const { makewish } = await import('./zap.js');
        await makewish();
    }

    // C: if (svc.context.move) { actual time passed ... }
    if (g.context.move) {
        g.u.umovement = (g.u.umovement || 0) - NORMAL_SPEED;

        let monscanmove = false;
        let mvl_wtcap = UNENCUMBERED;
        do {
            // C: encumber_msg() at top of hero-can't-move loop
            await encumber_msg();

            // C allmain.c:210–216 — mon_moving around movemon so lava/pool
            // minliquid uses mondead/mondied, not hero xkilled (D-1138).
            g.context.mon_moving = true;
            do {
                monscanmove = await movemon();
                if (g.program_state?.gameover) {
                    g.context.mon_moving = false;
                    return;
                }
                if ((g.u.umovement || 0) >= NORMAL_SPEED) break;
            } while (monscanmove);
            g.context.mon_moving = false;

            // C: after monster loop (burden may have changed)
            mvl_wtcap = near_capacity();

            if (!monscanmove && (g.u.umovement || 0) < NORMAL_SPEED) {
                // End of turn: C mcalcdistress before movement reallocation
                // (mfrozen/mblinded/mfleetim timeouts; mon_regen)
                if (g.were_changes != null) g.were_changes = 0;
                await mcalcdistress();
                for (const mtmp of g.fmon || []) {
                    mtmp.movement = (mtmp.movement || 0) + mcalcmove(mtmp, true);
                }
                await maybe_generate_rnd_mon();
                u_calc_moveamt(mvl_wtcap);
                // C: settrack() before svm.moves++
                settrack();
                g.moves = (g.moves || 1) + 1;
                // C allmain.c:253–257 — never let moves wrap: mystic
                // decimal cap, then the dungeon capitulates. Unreachable
                // in play (1e9 turns); display_nhwindow(WIN_MESSAGE,TRUE)
                // is flush_topl_more per the amulet-wish house arm below.
                if ((g.moves | 0) >= 1000000000) {
                    await flush_topl_more();
                    await urgent_pline('The dungeon capitulates.');
                    await done(ESCAPED);
                }
                // C: hero_seq = moves << 3 — distinct every hero turn
                g.hero_seq = (g.moves | 0) << 3;
                // C allmain.c: if (flags.time && !svc.context.run)
                //   disp.time_botl = TRUE — pline→flush_screen→timebot
                // before --More-- (seed4500 mold multi-EOT footsteps).
                if (g.flags?.time && !g.context?.run) {
                    g.flags.time_botl = true;
                }

                // C allmain.c:269 — per-turn Lua hook before Glib. The
                // nhcore.lua function is commented out, so the first call
                // marks it unavailable and every call after is a no-op.
                await l_nhcore_call(NHCORE_MOVELOOP_TURN);

                // once-per-turn — C: if (Glib) glibr(); then nh_timeout
                const glib = (g.u.uprops?.[GLIB]?.intrinsic | 0)
                    || (g.u.HGlib | 0) || (g.u.Glib | 0);
                if (glib) await glibr();
                await nh_timeout();
                await run_regions();
                // C allmain.c moveloop: if (u.ublesscnt) u.ublesscnt--;
                if (g.u.ublesscnt) g.u.ublesscnt = (g.u.ublesscnt | 0) - 1;

                // once-per-turn — C: regen_hp before dosounds when HP below max
                // (Upolyd eel always enters regen_hp even at full mh)
                if (g.u.uinvulnerable) {
                    mvl_wtcap = UNENCUMBERED;
                } else if (
                    !Upolyd(g.u)
                        ? ((g.u.uhp || 0) < (g.u.uhpmax || 0))
                        : ((g.u.mh || 0) < (g.u.mhmax || 0)
                            || game.youmonst?.data?.mlet === 'S_EEL')
                ) {
                    await regen_hp(mvl_wtcap);
                }
                // C: moving around while encumbered is hard work
                if (mvl_wtcap > MOD_ENCUMBER && g.u.umoved) {
                    if (!(
                        mvl_wtcap < EXT_ENCUMBER
                            ? ((game.moves | 0) % 30)
                            : ((game.moves | 0) % 10)
                    )) {
                        await overexert_hp();
                    }
                }
                // C: regen_pw(mvl_wtcap) always; gates + rn1 inside
                await regen_pw(mvl_wtcap);
                // C: !uinvulnerable Teleportation / Polymorph / ulycn arms
                await maybe_tele_poly_were();
                // C: Searching && !noautosearch && multi >= 0 → dosearch0(1)
                if (
                    Searching()
                    && !game.level?.flags?.noautosearch
                    && (game.multi == null || game.multi >= 0)
                ) {
                    await dosearch0(1);
                }
                // C: if (Warning) warnreveal();
                if (Warning(g.u)) await warnreveal();
                // C allmain.c:347–353 — were_changes → set_uasmon;
                // mkot_trap_warn; dosounds; do_storms.
                if (g.were_changes) set_uasmon();
                await mkot_trap_warn();
                await dosounds();
                await do_storms();
                await gethungry();
                age_spells();
                await exerchk();
                // C: invault() before wipe_engr / amulet
                await invault();

                // C ref: allmain.c:359 — once-per-turn amulet() when the
                // hero holds the Amulet (wizard.c:61; uhave.amulet gate).
                if (g.u?.uhave?.amulet) await amulet();

                // C allmain.c `:360–361` — after invault / amulet()
                // if (!rn2(40 + ACURR(A_DEX)*3)) u_wipe_engr(rnd(3)).
                // Callee D-1051; dokick(2) D-1360; uhitm(3) D-1373;
                // dothrow(2) D-1374. dig.c still named.
                if (!rn2(40 + (acurr(A_DEX) * 3))) {
                    u_wipe_engr(rnd(3));
                }

                // C ref: allmain.c:362–368 — udemigod doom clock after
                // wipe_engr (wizard.c intervene:785; rn1(200,50) reschedule).
                if (g.u?.uevent?.udemigod && !g.u?.uinvulnerable) {
                    if (g.u.udg_cnt) g.u.udg_cnt--;
                    if (!g.u.udg_cnt) {
                        await intervene();
                        g.u.udg_cnt = rn1(200, 50);
                    }
                }

                // C allmain.c:370–377 — after udemigod intervene
                // before multi<0. Water/air movebubbles else fumaroles.
                // Callee D-1156; this is the once-per-turn twin of
                // goto_level (D-1168).
                if (Is_waterlevel(g.u?.uz) || Is_airlevel(g.u?.uz)) {
                    await movebubbles();
                } else if (g.level?.flags?.fumaroles) {
                    await fumaroles();
                }

                // C: when immobile, count is in turns — multi < 0 occupation
                if ((g.multi || 0) < 0) {
                    // C allmain.c:381 — before ++gm.multi
                    await runmode_delay_output();
                    g.multi++;
                    if (g.multi === 0) {
                        await unmul(null);
                        // C: if unmul caused a level change, take it now
                        if (g.u?.utotype) await deferred_goto();
                    }
                }
            }
            if (g.program_state?.gameover) return;
        } while ((g.u.umovement || 0) < NORMAL_SPEED);

        // C: once-per-hero-took-time — hero_seq++ then seer_turn
        // (allmain.c: moves*8 + n for n == 1..7)
        g.hero_seq = (g.hero_seq | 0) + 1;

        // C allmain.c — although encumbrance was checked above, check again
        // for message purposes: inventory weight may have changed in
        // nh_timeout(), so the player gets immediate feedback if their own
        // action encumbered them.
        await encumber_msg();

        // C allmain.c:405–407 — STATUS_HILITES is on (config.h:616).
        // hilite_delta 0 skips the walk. status_eval only sets botl.
        if (game.iflags?.hilite_delta) status_eval_next_unhilite();

        // C: once-per-hero-took-time — seer_turn after umovement loop
        // (not inside once-per-turn EOT). Always rolls rn1 even without
        // Clairvoyant; the vicinity map only with Amulet/Clairvoyance.
        if ((g.moves || 0) >= (g.context.seer_turn || 0)) {
            // C allmain.c — (uhave.amulet || Clairvoyant) && !In_endgame &&
            // !BClairvoyant → do_vicinity_map((struct obj *)0), i.e. the
            // random-farsight arm (detect.c, D-1391).
            const su = g.u || {};
            if ((su.uhave?.amulet || Clairvoyant())
                && !In_endgame(su.uz) && !(su.BClairvoyant | 0)) {
                await do_vicinity_map(null);
            }
            g.context.seer_turn = g.moves + rn1(31, 15);
        }
        // C allmain.c:424-428 — [fast hero sinks multiple times per turn];
        // lava-trapped hero sinks, else a stationary hero feels pool
        // effects (D-1000 deferral retired: on dry land pooleffects is a
        // predicate-only no-op; in water it drowns the waiting hero).
        if ((g.u.utrap | 0) && (g.u.utraptype | 0) === TT_LAVA)
            await sink_into_lava();
        else if (!g.u.umoved)
            await pooleffects(false);

        // C allmain.c:430–434 — vision while buried or underwater is
        // updated here. Underwater ≡ u.uinwater (youprop.h:279); the (0)
        // refresh completes the (2)→(1) dela protocol wired at the
        // detect/dig/display/trap sites.
        if ((g.u.uinwater | 0))
            await under_water(0);
        else if ((g.u.uburied | 0))
            await under_ground(0);

        // see_nearby_monsters at end of actual-time-passed (D-1000).
        await see_nearby_monsters();
    }

    // Vision + display (before getch — screen capture in nhgetch)
    // C: allmain.c once-per-player-input — clear_splitobjs() first (zero
    // split parent/child oids, mkobj.c), then Amulet wish before find_ac
    // (D-0559). display_nhwindow(WIN_MESSAGE,TRUE) ≈ flush pending More.
    clear_splitobjs();
    {
        const u = g.u;
        if (u && (u.uhave?.amulet || u.uhave_amulet)
            && !(u.uevent?.amulet_wish)) {
            if (!u.uevent) u.uevent = {};
            u.uevent.amulet_wish = 1;
            await flush_topl_more();
            await pline('The Amulet is bestowing a wish upon you!');
            const { makewish } = await import('./zap.js');
            await makewish();
        }
    }
    // C: allmain.c once-per-player-input find_ac() before bot/flush/rhack
    find_ac();
    // C allmain.c:453–468 — if (!context.mv || Blind) {
    //   Hallucination → see_monsters/objects/traps + swallowed(0)
    //   else Unblind_telepat || Warning || Warn_of_mon
    //        || any_visible_region() → see_monsters
    // }
    {
        const u = g.u || {};
        const Blind = !!(u.Blind || u.ublind
            || (((u.HBlinded | 0) || (u.EBlinded | 0)) && !(u.BBlinded | 0)));
        if (!g.context.mv || Blind) {
            if (Hallucination()) {
                see_monsters();
                see_objects();
                see_traps();
                if (u.uswallow) swallowed(0);
            } else {
                // C youprop.h Unblind_telepat ≡ ETelepat
                const Unblind_telepat = !!(u.ETelepat | 0)
                    || !!(u.uprops?.[TELEPAT]?.extrinsic | 0);
                if (Unblind_telepat || Warning(u) || Warn_of_mon()
                    || any_visible_region()) {
                    see_monsters();
                }
            }
        }
    }
    if (g.vision_full_recalc) {
        vision_recalc(0);
        g.vision_full_recalc = 0;
    }
    // C allmain.c:473–479 — paint status only on request: full bot() when
    // disp.botl|botlx, time-only timebot() when disp.time_botl; either arm
    // then parks the cursor (curs_on_u ≡ flush_screen(1) in JS). game.flags
    // is the live store bot()/flush_screen gate on; game.disp mirrors it.
    // The unconditional flush_screen(1) below still runs (C flush_screen
    // carries the same gate at display.c:2237–2240, a no-op here since the
    // arm above just consumed the flags).
    {
        const _fl = g.flags || {};
        if (_fl.botl || _fl.botlx) {
            await bot();
            await curs_on_u();
        } else if (_fl.time_botl) {
            await timebot();
            await curs_on_u();
        }
    }
    await flush_screen(1);

    // C allmain.c:481 — once-per-player-input m_everyturn_effect(&youmonst)
    // after bot, before context.move = 1. Fog vapor at current u.ux
    // (not ux0 trail — that is m_postmove_effect / D-1167).
    await m_everyturn_effect(game.youmonst);

    // C: svc.context.move = 1; then occupation or rhack(0)
    // When multi < 0 (dressing etc.), skip input; leave move=1 for next turn.
    g.context.move = 1;
    if ((g.multi || 0) >= 0 && typeof g.occupation === 'function') {
        // C ref: allmain.c go.occupation — runs before rhack; return ends this tick
        const cont = await g.occupation();
        if (!cont) g.occupation = null;
        // C allmain.c:504–508 — monster_nearby() → stop_occupation()
        // + reset_eat() (the actual reset runs on the next bite).
        if (monster_nearby()) {
            await stop_occupation();
            reset_eat();
        }
        // C allmain.c:509 — post-occupation, before return
        await runmode_delay_output();
        return;
    }
    // C allmain.c — u.umoved = FALSE after the occupation arm (which
    // returns) and before the multi branches, so an ongoing occupation
    // still sees last turn's umoved.
    g.u.umoved = false;
    if ((g.multi || 0) < 0) {
        // multi-turn inactivity continues without nhgetch
    } else if (run_active()) {
        await continue_run();
    } else if ((g.multi || 0) > 0) {
        // C allmain.c:514–531 — multi > 0 without run: a counted command
        // returned ECMD_TIME with no f_text occupation (s/. set occupations
        // via cmd.c:3728; only those two carry f_text). lookaround() may
        // clear multi (stop instead of repeating). Counted walks (mv=1,
        // set by the DOMOVE_WALK arm, cmd.c:3786) replay domove() directly:
        // short counts tick down with end_running at 0, run-sized counts
        // (>= COLNO) ride until something clears multi; replay steps skip
        // the rhack re-dispatch, the smudge (attempting cleared by the
        // first domove, hack.c:2706) and the per-step see_monsters refresh
        // (the !mv gate above). Other commands --multi and re-run the
        // stored key; the :529 nhassert(command_count != 0) is a release
        // no-op, cmd_key persists from parse (sole writer js/cmd.js
        // parse), and a 0 key falls back to the parse path. The old
        // search_repeat_active() branch was dead (game._repeat_search has
        // no `= true` in js/**; Ns runs as a dosearch occupation) and C
        // has no such arm.
        await lookaround();
        await runmode_delay_output();
        if (!((g.multi || 0) > 0)) {
            // C :517–521 — lookaround cleared multi: no move this tick.
            g.context.move = 0;
            return;
        }
        if (g.context.mv) {
            // C :524–528 — mv replay. multi is >= 1 here (re-checked
            // above); end_running(TRUE) clears mv/travel (multi already 0,
            // so its cancel-multi is a no-op). u.dx/u.dy persist from the
            // first step, as in C.
            if ((g.multi | 0) < COLNO && !--g.multi) end_running(true);
            await domove(g.u?.dx | 0, g.u?.dy | 0);
        } else {
            g.multi--;
            await rhack(g.cmd_key | 0);
        }
    } else {
        // C allmain.c:532–536 — multi == 0, #ifdef MAIL: ckmailstatus()
        // then rhack(0). The multi > 0 arm calls rhack(cmd_key) with no
        // mail check; run stays on the branch above.
        if ((g.multi || 0) === 0) await ckmailstatus();
        await rhack(0);
    }
    // C: if (u.utotype) deferred_goto() after rhack()
    if (g.u?.utotype) await deferred_goto();
    // C allmain.c:541-542 — after rhack(): consume vision_full_recalc now
    // so next iteration's monsters see post-hero-action vision (D-1863:
    // pit fall restricts to 3×3 before the monsters move).
    if (g.vision_full_recalc) {
        vision_recalc(0);
        g.vision_full_recalc = 0;
    }
    // C allmain.c:543–547 — CLIPPING (config.h:538, compiled in):
    // cliparound(u.ux, u.uy) after rhack() + vision_recalc so the map
    // redraws once with correct vision data, not twice. No-op at the
    // contest fixed size (clipping never set — no resize path).
    await cliparound(g.u.ux | 0, g.u.uy | 0);
    // C allmain.c:548–556 — periodic MAP redisplay after cliparound:
    // (!run || runmode == RUN_TPORT) && multi && every 7th (multi, or
    // moves when travelling). The time&&run botl sub-arm refreshes the
    // status clock during runs (the per-turn time_botl at :1253 is
    // !run-gated, so a quiet run otherwise never refreshes the clock). The
    // display_nhwindow(WIN_MAP, FALSE) repaint itself is subsumed by the
    // every-tick flush_screen(1) (:1481), which paints identical map
    // content each turn — no second repaint call. runmode defaults to
    // RUN_LEAP when unset (initoptions_init `:7176`; runmodeNow).
    {
        const _rm = g.flags?.runmode;
        const runmode = (_rm === RUN_TPORT || _rm === RUN_LEAP
            || _rm === RUN_STEP || _rm === RUN_CRAWL) ? _rm : RUN_LEAP;
        const multi = g.multi | 0;
        if ((!g.context.run || runmode === RUN_TPORT)
            && multi && (!g.context.travel ? !(multi % 7)
                : !((g.moves | 0) % 7))) {
            if (g.flags?.time && g.context.run) g.flags.botl = true;
        }
    }
    // Message cleared at start of next rhack so pline() survives until the
    // following nhgetch capture (C keeps topline until next command).

    // C allmain.c:558–563 — Lua end-of-turn callbacks. nhcb_counts stays
    // all-zero without a registered nh.callback (cmd.js can_do_extcmd
    // guards NHCB_CMD_BEFORE the same way), so this only runs handlers.
    if (g.luacore && g.nhcb_counts && (g.nhcb_counts[NHCB_END_TURN] | 0)) {
        await nh_callback_run(NHCB_NAME[NHCB_END_TURN]);
    }
}

// C ref: allmain.c moveloop `:587–597` — preamble + tutorial gate +
// core loop, in C order. Live entries hoist the head (newgame `:993–996`
// runs preamble(FALSE)+tutorial; jsmain restore runs preamble(TRUE));
// this export stays C-whole for direct callers. The gameover break exits
// the harness turn driver (C never returns; unixmain.c:319).
export async function moveloop(resuming) {
    await moveloop_preamble(resuming); // C `:590`

    if (!resuming) // C `:592`
        await maybe_do_tutorial(); // C `:593`

    for (;;) {
        await moveloop_core(); // C `:596`
        if (game.program_state?.gameover) break;
    }
}

/**
 * C ref: allmain.c timet_delta `:995–1001` — seconds between two time_t
 * values (`(long) difftime(etim, stim)`). Contest getnow() is unix
 * seconds; subtraction matches.
 * @param {number} etim
 * @param {number} stim
 * @returns {number}
 */
export function timet_delta(etim, stim) {
    return (Number(etim) || 0) - (Number(stim) || 0);
}

/**
 * C ref: allmain.c timet_to_seconds `:987–993` — seconds since the epoch
 * (`timet_delta(ttim, (time_t) 0)`; the Unix-cast comment is the rationale).
 * Contest time values are unix seconds; the live timet_delta matches.
 * @param {number} ttim
 * @returns {number}
 */
export function timet_to_seconds(ttim) {
    return timet_delta(ttim, 0);
}
