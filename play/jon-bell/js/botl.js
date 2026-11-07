// botl.js — C ref: botl.c.
import { money_cnt } from './hack.js';
import { CONFUSION, Is_rogue_level, P_LANCE, P_MORNING_STAR, P_POLEARMS, P_QUARTERSTAFF, P_UNICORN_HORN, SICK, SLIMED, gs } from './const.js';
import { COIN_CLASS_DISP, _ROLE_NAME_TO_IDX, _ROLE_RANKS, _capture_botl, _disp_Blind, _equipView, _hallucinating_dsp, _live_deaf, _live_flying, _live_lev, _mon_mlevel, _statusLine1, _statusLine1Raw, _statusLine2, _statusLine2Parts, _statusRows3, _status_sgr, _threeStatusLines, status_xp_bot_eval, suppress_map_output } from './display.js';
import { bimanual } from './do_wear.js';
import { game } from './gstate.js';
import { humanoid } from './makemon.js';
import { helm_simple_name } from './objnam.js';
import { SYM_OFFSETS, primary_showsym } from './symbols.js';
import { weapon_descr, weapon_type } from './uhitm.js';
import { near_capacity } from './hack.js';
import { attrnames, clr2colorname, match_str2clr } from './coloratt.js'; // relocate-fns
import { display_text_window } from './com_pager.js'; // relocate-fns
import { gather_condition_hilite_lines } from './display.js'; // relocate-fns
import { mungspaces } from './hacklib.js'; // relocate-fns
import { status_fieldname } from './options.js'; // relocate-fns
import { HL_ATTRBITS, drainTopline, query_attr_one, query_color } from './optmenu.js'; // relocate-fns
import { pline } from './pline.js'; // relocate-fns
import { ROLE_RANKS, role_index_by_name } from './rank_data.js'; // relocate-fns
import { ATR_NONE, PICK_ANY, PICK_ONE, TtyMenu } from './tty_menu.js'; // relocate-fns
import { getlin } from './windows.js'; // relocate-fns
import { CONDTESTS, COND_NAMES, cond_enabled_arr } from './options.js'; // relocate-fns
import { describe_level_impl } from './dungeon.js'; // relocate-fns
import { str_start_is } from './hacklib.js'; // relocate-fns
import { NON_PM } from './mhitm.js'; // relocate-fns
import { ROLE_PM_MNUM } from './roles.js'; // relocate-fns

// C ref: botl.c:339-364 rank_of(lev, monnum, female) — find rank title
// Inverse mapping from role index (0-12) to role names for mnum lookup
const _ROLE_IDX_TO_NAMES = [
    { m: 'Archeologist', f: null },
    { m: 'Barbarian', f: null },
    { m: 'Caveman', f: 'Cavewoman' },
    { m: 'Healer', f: null },
    { m: 'Knight', f: null },
    { m: 'Monk', f: null },
    { m: 'Priest', f: 'Priestess' },
    { m: 'Rogue', f: null },
    { m: 'Ranger', f: null },
    { m: 'Samurai', f: null },
    { m: 'Tourist', f: null },
    { m: 'Valkyrie', f: null },
    { m: 'Wizard', f: null },
];

export function rank_of(lev, monnum, female) {
    /* Find the role */
    let roleIdx = -1;
    let roleNameM = null;
    let roleNameF = null;
    /* C botl.c:338-340 scans roles[] for monnum == role->mnum; the mnums are
     * PM_ARCHEOLOGIST (331 in js/pm.generated.js) .. PM_WIZARD in roles[] order,
     * so a player-monster index maps to its role ordinal.  Callers that already
     * hold a role ordinal pass 0..12. */
    if (monnum >= 331 && monnum <= 343) {
        /* monst.h order is ...Priest, Ranger, Rogue, Samurai..., while the
         * role ordinals here follow roles[] (Rogue before Ranger). */
        monnum -= 331;
        if (monnum === 7) monnum = 8;
        else if (monnum === 8) monnum = 7;
    }
    if (monnum >= 0 && monnum <= 12) {
        roleIdx = monnum;
        roleNameM = _ROLE_IDX_TO_NAMES[roleIdx].m;
        roleNameF = _ROLE_IDX_TO_NAMES[roleIdx].f;
    }
    if (roleIdx < 0) {
        const urole = game.urole;
        if (urole) {
            const nm = urole.name;
            if (nm) {
                roleNameM = nm.m;
                roleNameF = nm.f;
            }
            if (roleNameM)
                roleIdx = _ROLE_NAME_TO_IDX[roleNameM] ?? -1;
            if (roleIdx < 0 && roleNameF)
                roleIdx = _ROLE_NAME_TO_IDX[roleNameF] ?? -1;
        }
    }

    /* Find the rank */
    const ranks = (roleIdx >= 0) ? _ROLE_RANKS[roleIdx] : null;
    if (ranks) {
        for (let i = xlev_to_rank(lev); i >= 0; i--) {
            if (female && ranks[i][1])
                return ranks[i][1];
            if (ranks[i][0])
                return ranks[i][0];
        }
    }

    /* Try the role name, instead */
    if (female && roleNameF)
        return roleNameF;
    else if (roleNameM)
        return roleNameM;
    return 'Player';
}

// C ref: botl.c:408-420 max_rank_sz — compute max rank string length
export function max_rank_sz() {
    let maxr = 0;
    const idx = _ROLE_NAME_TO_IDX[game.urole] ?? -1;
    const ranks = (idx >= 0) ? _ROLE_RANKS[idx] : null;
    if (!ranks) return;
    for (let i = 0; i < 9; i++) {
        const rk = ranks[i];
        let r;
        if (rk[0] && (r = rk[0].length) > maxr) maxr = r;
        if (rk[1] && (r = rk[1].length) > maxr) maxr = r;
    }
    game.mrank_sz = maxr;
}

export function weapon_status() {
    const u = _equipView();
    const uwep = u.uwep;
    let res;
    let out = '';
    if (!uwep) {
        res = u.uarmg ? 'Empty-hnd'
            : humanoid(game.youmonst?.data) ? 'Bare-hnds' : 'No-weapon';
        return res;
    } else if (u.twoweap) {
        res = 'Dual-weps';
        if (u.usteed && (weapon_type(uwep) === P_LANCE || weapon_type(u.uswapwep) === P_LANCE))
            res = 'Dual+joust';
        return res;
    }
    const skill = weapon_type(uwep);
    const otyp = uwep.otyp | 0;
    if (u.usteed && skill === P_LANCE) {
        res = 'joust';
    } else if (otyp === 80 /* AKLYS */) {
        res = 'aklys';
    } else if ((uwep.oclass | 0) === 2 && otyp >= 46 && otyp <= 58 /* is_sword */) {
        res = 'sword';
    } else {
        switch (skill) {
        case P_QUARTERSTAFF: res = 'staff'; break;
        case P_MORNING_STAR: res = 'mrng-star'; break;
        case P_POLEARMS: res = 'pole'; break;
        case P_UNICORN_HORN: res = 'unihorn'; break;
        default:
            res = weapon_descr(uwep);
            if (res.toLowerCase() === 'food' && otyp === 306 /* CREAM_PIE */)
                res = 'pie';
            break;
        }
    }
    // C botl.c:544, obj.h:249: is_weptool is TOOL_CLASS with a nonzero skill.
    if (((uwep.oclass | 0) === 2 /* WEAPON_CLASS */
         || ((uwep.oclass | 0) === 6 /* TOOL_CLASS */ && skill !== 0 /* P_NONE */))
        && bimanual(uwep) && res[0] !== '2' && res.slice(0, 3).toLowerCase() !== 'two')
        out += '2H-';
    out += res[0].toUpperCase() + res.slice(1);
    return out.replace(/ /g, '-');
}

/* C botl.c:556-610 armor_status(). */
export function armor_status() {
    const u = _equipView();
    const n = !!u.uarmg + !!u.uarmc + !!u.uarm + !!u.uarmu + !!u.uarmh + !!u.uarmf + !!u.uarms;
    let b = '';
    if (n === 0) b = 'naked';
    else if (n === 1)
        b = u.uarmg ? 'gloves' : u.uarmc ? 'cloak' : u.uarm ? 'suit' : u.uarmu ? 'shirt'
            : u.uarmh ? helm_simple_name(u.uarmh) : u.uarmf ? 'boots' : u.uarms ? 'shield' : '';
    else {
        if (u.uarmg) b += 'G';
        if (u.uarmc) b += 'C';
        if (u.uarm) b += 'A';
        if (u.uarmu) b += 'U';
        if (u.uarmh) b += 'H';
        if (u.uarmf) b += 'B';
        if (u.uarms) b += 'S';
    }
    if ((u.uright && (u.uright.otyp | 0) === 178 /* RIN_PROTECTION */)
        || (u.uleft && (u.uleft.otyp | 0) === 178)
        || (u.uamul && (u.uamul.otyp | 0) === 210 /* AMULET_OF_GUARDING */)
        || (u.uarmc && (u.uarmc.otyp | 0) === 146 /* CLOAK_OF_PROTECTION */)
        || (u.uarmh && (u.uarmh.oartifact | 0) === 27 /* ART_MITRE_OF_HOLINESS */)
        || (u.uwep && (u.uwep.oartifact | 0) === 30 /* ART_TSURUGI_OF_MURAMASA */))
        b += '+';
    return b[0].toUpperCase() + b.slice(1);
}

/* C botl.c:2321-2334: rule edits request a redraw; they resend all field
 * values and discard temporary highlights only when highlighting is enabled. */
export function reset_status_hilites() {
    /* botl.c:2321-2331: only sets update_all + botlx; the fields are re-evaluated
     * against the new rules when the next bot() delivers them, so a page
     * raised before that bot() still shows the old colours. */
    if (game.iflags?.hilite_delta) {
        game._statusHilitesReset = true;
        if (game.iflags._blTerrain) game.iflags._blTerrain.updateAll = true;
    }
    game.disp.botlx = true;
}

// ── bot ──
export async function bot() {
    // C botl.c:255-256: select_menu() suppresses status even during dismissal.
    if (game?._bot_disabled)
        return;
    /* getline.c:63: custompline() reaches flush_screen()->bot(), but the core
     * disables bot processing while ttyDisplay->inread is nonzero.  Prompt
     * repainting must therefore leave status and pending disp flags alone. */
    if (game?._topl_prompt_echo)
        return;
    if (game._statusHilitesReset) { /* reset_status_hilites() */
        game._statusHilitesReset = false;
        delete game._blTemp;
        delete game._statusFieldColors;
    }
    /* botl.c:1670-1672: disp.botlx sends BL_RESET -> FORCE_RESET (wintty.c:4476-4477),
     * so every row-1 field is redrawn whole (check_fields forcefields). */
    /* botl.c:259: with u.uhp == -1 (dosave's flag, or a death that landed on
     * exactly -1) bot() paints nothing, so no BL_RESET rewrite happens. */
    if (game.disp.botlx && (game.u?.uhp | 0) !== -1)
        game._status1Whole = true;
    /* the BL_RESET that -1 swallowed is gone (bot() clears botlx either way),
     * so done()'s later HP:0 paint is a plain BL_FLUSH, not a row-1 rewrite */
    if (game.disp.botlx && (game.u?.uhp | 0) === -1)
        game._botlResetLost = true;
    else if ((game.u?.uhp | 0) > 0)
        game._botlResetLost = false;
    game._status1WholeNext = false;
    // Status line updates happen in _buildScreenOutput
    // C ref: botl.c:188 — bot2() reads (cap = near_capacity()) HERE, at paint
    // time, and the physical bottom line then holds that value until the NEXT
    // bot().  Latch it so a later frozen --More-- page can render what the last
    // paint actually put on the screen rather than the live inventory weight:
    // C's encumber_msg (pickup.c:1990) emits its pline BEFORE its SET_BOTL, and
    // drop() has already run freeinv() by then, so between the drop and the next
    // bot() the screen shows the PRE-drop encumbrance while near_capacity()
    // value " Burdened").  DISPLAY-ONLY; near_capacity() consumes no RNG.
    game._botlPaintedCap = near_capacity() | 0;
    /* Same latch for '$:' (botl.c:837 money_cnt(gi.invent)): goto_level's
     * tutorial exit raises its --More-- before bot() reruns. */
    game._botlPaintedGold = money_cnt(game.invent ?? null);
    game._botlGoldStale = undefined;
    /* A bot() paint ends the tutorial-entry window (do.c:1510 tutorial(TRUE)
     * stashed invent, nothing repainted yet): keepdogs' pline flush_screen()
     * -> bot() (display.c:2286) shows the stashed hero's '$:0'.  done()'s
     * forced paint (end.c:1043-1046) marks the override first: the standing
     * "Resetting time" line (nhlua.c:1738) pages only at a LATER drain, so
     * its page must render THIS paint, not the frozen pre-restore one.  The
     * override dies here either way; carry the mark across for the drain. */
    const _tutFreshLastPage = !!game._tutorialStatusOverride?.freshOnLastPage;
    game._tutorialStatusOverride = null;
    /* botl.c:259-268: only an actual paint replaces the physical BL_TIME.
     * bot() still clears the pending time update when uhp == -1. */
    if ((game.u?.uhp | 0) !== -1 && game.iflags?.status_updates !== false
        && !suppress_map_output())
        game._botlPaintedMoves = game.moves | 0;
    game._botlPaintedDeaf = _live_deaf();
    game._botlPaintedFlying = _live_flying();
    game._botlPaintedRiding = !!game.u?.usteed;
    /* C botl.c condtests[bl_conf]: retain the last painted condition when
     * HConfusion is restored without SET_BOTL after a magic-trap effect. */
    game._botlPaintedConfused = !!(game.u?.uprops?.[CONFUSION]?.intrinsic | 0);
    /* wizcmds.c:184 temporarily clears HHallucination during do_mapping()
     * without flagging status. botl.c:1196's Hallu remains on the physical
     * status line until bot() next paints, just like Conf above. */
    game._botlPaintedHallu = _hallucinating_dsp();
    game._botlPaintedLev = _live_lev(game.u);
    game._botlPaintedBlind = _disp_Blind();
    game._botlPaintedSlimed = !!(game.u?.uprops?.[SLIMED]?.intrinsic | 0);
    game._botlPaintedSickType = (game.u?.uprops?.[SICK]?.intrinsic | 0) ? (game.u.usick_type | 0) : 0;
    if ((game?.u?.uhp | 0) !== -1 && !game._botlHeldEat) {
        /* botl.c:1635-1636 and wintty.c:4472: only a live, enabled XP/HD
         * field receives a new value; the other field's text survives. */
        const poly = (game.u.umonnum | 0) !== (game.u.umonster | 0);
        const fields = game._statusExperienceFields ??=
            { polymorphed: poly };
        if (poly && fields.polymorphed)
            fields.hd = _mon_mlevel(game.u.umonnum | 0);
        else if (!poly && !fields.polymorphed) {
            fields.level = game.u.ulevel | 0;
            if (game.flags?.showexp) fields.experience = game.u.uexp || 0;
        }
        /* botl.c:1514-1614: BL_XP chg/percent evaluation happens per bot(). */
        status_xp_bot_eval();
        /* C botl.c:259-268: a status paint replaces the pre-cast Pw still
         * visible behind a spell's menu. Later menus retain this new paint. */
        game._spellPwStale = null;
        /* end.c:1045-1046 calls bot() directly even while goto_level delays
         * flush_screen().  botl.c:254-270 has no delay_flushing guard: paint
         * the live status, including the new level, and hold that new paint
         * for subsequent delayed flushes. */
        game._lastPaintedBotl = _capture_botl(true);
        /* The tutorial-exit mark only transfers when the paint really ran
         * (botl.c:259's u.uhp != -1 guard): a declined paint leaves C's
         * physical line at the frozen pre-restore hero. */
        if (_tutFreshLastPage)
            game._tutorialFreshLastPage = true;
        /* The physical status row moved; every --More-- raised from here on
         * shows THIS paint (a more() always follows the flush that painted
         * it — pline.c:273-274).  Stamped snapshots refresh off this epoch. */
        game._botlPaintSeq = (game._botlPaintSeq | 0) + 1;
        /* a bot() after the pline (done()'s forced one, end.c:1043-1046)
         * repainted the terminal the lone frame recorded */
        if (game._lonePlineFrame) game._lonePlineFrame.botStale = true;
        game._botlUzFrozen = null;
        /* This IS C's next real paint: whatever done() left pending is now on
         * the physical line, so the death freeze (see js/end.js
         * _done_force_hp_zero) is over. */
        game._botlFrozenDeath = false;
    } else if ((game?.u?.uhp | 0) === -1) {
        /* C botl.c:259 declines this paint. done() then changes HP to zero
         * (end.c:1073), but tty_yn_function's more() precedes its next flush
         * (topl.c:390-392). Keep the physical status until bot() paints again. */
        game._botlFrozenDeath = true;
    }
    /* C botl.c:259 bot() writes the status rows to the terminal at once, even
     * while WIN_STOP suppresses messages after an ESC'd --More-- (topl.c:232).
     * The physical rows must be updated now: a following getlin/yn prompt keeps
     * them (_prompt_physical_status_rows) and showed the pre-bot() HP where C's
     * done() -> bot() had painted the death-time one ("Die?" prompt, C HP:92
     * against 103 painted before the suppressed attacks). */
    if ((game._topl_win_stop || game._topl_win_stop_armed) && game._screen_output
        && !game._status_blanked && !game._statusBlankAfterDocrt
        && (game?.u?.uhp | 0) !== -1 && !game._botlHeldEat) {
        const _rows = String(game._screen_output).split('\n');
        if (_rows.length >= 24 && !_threeStatusLines()) {
            _rows[22] = _status_sgr(_statusLine1());
            _rows[23] = _status_sgr(_statusLine2());
            game._screen_output = _rows.join('\n');
        }
    }
    if (game.u && (game.u.uhp | 0) <= 0 && (game.u.uhp | 0) !== -1 && _threeStatusLines()
        && game.disp?.botlx)
        game._status1Whole = true;
    /* C botl.c:260-269 — bot() repaints the WHOLE status line, `T:' included, so
     * the run-suppression latch above is discharged by any paint that gets here. */
    if (game) game._timeBotlFrozenMoves = null;
    if (game && (game.u?.uhp | 0) !== -1 && game.iflags?.status_updates !== false
        && !suppress_map_output()) {
        _status_note_pushed_fields();
        /* C tty status updates happen at bot(), before its reset is cleared. */
        if (_threeStatusLines() && (game.flags?.weaponstatus
            || game.flags?.armorstatus || game.flags?.terrainstatus)) {
            _statusRows3();
            if (game._lastPaintedBotl) game._lastPaintedBotl.row3 = game._st3?.row;
        }
        /* C botl.c:259-268: a status paint replaces the blank rows left by
         * the level-teleport menu. A pline before delayed flushing starts
         * (nhlua.c:1738, do.c:1720) can repaint them before u_on_rndspot;
         * the menu must no longer make that arrival blank them again. */
        game._levtele_menu = false;
        /* botl.c:259-268: only a real status paint replaces the blank rows
         * left by cls(); u.uhp == -1 suppresses it even while polymorphed. */
        /* C botl.c:259-271: only an enabled status paint replaces the blank
         * rows left by cls().  In particular, self-genocide while polymorphed
         * leaves u.uhp == -1, so bot() clears its flags without painting. */
        /* wintty.c:1061-1068 tty_clear_nhwindow(NHW_STATUS) blanks the physical
         * rows (cl_end + data[][] = ' '), so the next render_status starts from
         * an empty row: no stale cells survive from before the cls. */
        if (game._statusBlankAfterDocrt && game._st3) { game._st3.row = ''; game._st3.signature = undefined; }
        game._statusBlankAfterDocrt = false;
        game._statusCornerClips = null; /* botlx's BL_RESET restores every field */
        game._getobj_menu_win = null; // the clipped status rows were repainted
        game._carryStatusClip = null;
    }
    // C ref: botl.c:277 — bot() resets disp flags after rendering
    if (game && game.disp) {
        /* Count the bot() calls that had a pending botl/botlx to discharge:
         * C moveloop_core runs `bot(); curs_on_u();` (a flush_screen) for
         * exactly those (allmain.c:474-478); doapply's wield turn reads it. */
        if (game.disp.botl || game.disp.botlx)
            game._botlDischarges = ((game._botlDischarges | 0) + 1) | 0;
        /* goto_level sets botlx (do.c), so bot() rewrites the whole status row
         * for the new level, undoing blanks the previous level's map row 20
         * printed over it (wintty.c render_status). */
        if (game.disp.botlx && game._r1wipe && game._r1wipe.lvl !== game.level)
            game._r1wipe = null;
        game.disp.botl = 0;
        game.disp.botlx = 0;
        game.disp.time_botl = 0;
    }
}

// C ref: botl.c:304-318 xlev_to_rank — convert experience level to rank index
// Maps experience level (1..30) to rank index (0..8) using a piecewise formula.
// 1..2 => 0; 3..5 => 1; 6..9 => 2; 10..13 => 3; ... 26..29 => 7; 30 => 8
export function xlev_to_rank(xlev) {
    return (xlev <= 2) ? 0 : (xlev <= 30) ? Math.trunc((xlev + 2) / 4) : 8;
}

// C ref: botl.c:321-336 rank_to_xlev — convert rank index to experience level
// Inverse of xlev_to_rank: maps rank index (0..8) to the low end of each experience level range.
// 0 => 1; 1 => 3; 2 => 6; 3 => 10; ... 7 => 26; 8 => 30
export function rank_to_xlev(rank) {
    return (rank < 1) ? 1 : (rank < 2) ? 3 : (rank < 8) ? ((rank * 4) - 2) : 30;
}

// C ref: botl.c:40-46 check_gold_symbol — determine if gold symbol is invisible
// Reads the gold (COIN_CLASS) symbol from gs.showsyms and sets iflags.invis_goldsym
// to true if the symbol is a control character or space (ASCII <= 32).
// gs.showsyms is an array indexed by object class symbol offset (SYM_OFF_O + COIN_CLASS).
// MAXPCHARS=105, so SYM_OFF_O=105, and COIN_CLASS=12 means index=117.
// goto_level checks the destination's graphics before assigning u.uz (do.c:1666-1675).
export function check_gold_symbol(level = game.u?.uz) {
    const g = game || {};
    // gs.showsyms[SYM_OFF_O + COIN_CLASS] = gs.showsyms[105 + 12] = gs.showsyms[117]
    // nhsym goldch = gs.showsyms[COIN_CLASS + SYM_OFF_O];
    // Default COIN symbol is '$' (ASCII 36) from defsym.h OBJCLASS(12, '$', COIN, ...)
    const showsyms = gs.showsyms;
    let goldch;
    if (Is_rogue_level(level)) {
        /* symbols.c:217-233 selects rogue_syms before this check. Resolve
         * that set directly, as the renderer does, rather than the departing
         * level's primary symset. drawing.c:79 defaults Rogue gold to '*'. */
        const idx = SYM_OFFSETS.O + COIN_CLASS_DISP;
        const set = gs.symset?.[1];
        goldch = g.go?.ov_rogue_syms?.[idx] || g.gr?.rogue_syms?.[idx]
            || (String(set?.name ?? '').toLowerCase() === 'blank' ? 32
                : set?.name === 'RogueEpyx' ? 15 : '*'.charCodeAt(0));
    } else if (primary_showsym(SYM_OFFSETS.O + COIN_CLASS_DISP)) {
        goldch = primary_showsym(SYM_OFFSETS.O + COIN_CLASS_DISP);
    } else if (showsyms && showsyms.length > 117) {
        // If showsyms is initialized, read the actual symbol
        const sym = showsyms[117];
        goldch = (typeof sym === 'number') ? sym : (typeof sym === 'string' ? sym.charCodeAt(0) : 36);
    } else {
        // Use default: '$' is ASCII 36
        goldch = 36;
    }
    if (!g.iflags) g.iflags = {};
    g.iflags.invis_goldsym = (goldch <= 32); // goldch <= ' ' (space, ASCII 32)
}

export function timebot() {
    // C botl.c:277-278: the menu's status suppression covers time updates too.
    if (game?._bot_disabled)
        return;
    /* C ref: timebot() — update time display; resets disp.time_botl */
    const g = game || {};
    const flags = g.flags || {};
    const iflags = g.iflags || {};
    if (flags.time && iflags.status_updates && !suppress_map_output()) {
        g._botlPaintedMoves = g.moves | 0;
        /* VIA_WINDOWPORT() is always true in JS GUI environment;
           stat_update_time() is a windowport-specific no-op in JS.  It IS the
           paint, though: whatever the run suppressed is now on the line. */
        g._timeBotlFrozenMoves = null;
        /* botl.c:1285-1294 stat_update_time(): BL_TIME alone goes through
         * eval_notify_windowport_field, so a changed clock marks it chg. */
        _status_note_pushed_time();
    }
    if (g.disp)
        g.disp.time_botl = 0;
}

function _status_note_pushed_fields() {
    const g = game;
    const p = _statusLine2Parts();
    const sig = _statusLine1Raw() + '\n'
        + (p ? `${p.desc} ${p.mid}${p.hunger}${p.conds}` : '');
    if (g._blPushedSig !== sig) g._blChg = true;
    g._blPushedSig = sig;
    _status_note_pushed_time();
}

function _status_note_pushed_time() {
    const g = game;
    if (!g.flags?.time) return;
    const m = g.moves | 0;
    if (g._blPushedMoves !== m) g._blChg = true;
    g._blPushedMoves = m;
}

export function status_eval_next_unhilite() {
    const g = game;
    if (!g) return;
    g.bl_hilite_moves = g.moves | 0;
    /* C botl.c:2293-2303 — a field whose change paint raised chg gets its
     * expiry stamped HERE (time = bl_hilite_moves + hilite_delta for an
     * active temporary rule, 0 otherwise); chg clears and botl is forced. */
    const hist = g._blTemp;
    if (hist && g.iflags?.hilite_delta) {
        for (const k in hist) {
            const h = hist[k];
            if (!h || !h.chg) continue;
            h.time = h.rule ? g.bl_hilite_moves + g.iflags.hilite_delta : 0;
            h.evalStampMoves = g.bl_hilite_moves; /* this turn's eval already consumed an earlier chg */
            h.chg = false;
            if (g.disp) g.disp.botl = 1;
        }
    }
    if (g._blChg) {
        g._blChg = false;
        if (g.disp) g.disp.botl = 1;
    }
}

/* C botl.c:703 initblstats[]: [fldname, anytype (S string, I int, L long, M mask),
 * idxmax >= 0 (INIT_BLSTATP)]. */
const INITBLSTATS = [
    ['title', 'S'], ['strength', 'I'], ['dexterity', 'I'], ['constitution', 'I'],
    ['intelligence', 'I'], ['wisdom', 'I'], ['charisma', 'I'], ['alignment', 'S'],
    ['score', 'L'], ['carrying-capacity', 'I'], ['gold', 'L'], ['power', 'I', true],
    ['power-max', 'I'], ['experience-level', 'I', true], ['armor-class', 'I'],
    ['HD', 'I'], ['time', 'L'], ['hunger', 'I'], ['hitpoints', 'I', true],
    ['hitpoints-max', 'I'], ['dungeon-level', 'S'], ['experience', 'L', true],
    ['condition', 'M'], ['version', 'S'], ['weapon', 'S'], ['armor', 'S'], ['terrain', 'S'],
];

/* C botl.c:3707 status_hilite_menu_choose_behavior; returns the BL_TH_* value,
 * 0 (BL_TH_NONE) for no pick, -1 (BL_TH_NONE - 1) for a cancelled menu. */
async function status_hilite_menu_choose_behavior(fld, preserveStatus) {
    const [fldname, at, hasMax] = INITBLSTATS[fld];
    const isCond = fldname === 'condition', isCap = fldname === 'carrying-capacity';
    const isHunger = fldname === 'hunger';
    const m = new TtyMenu({ overlay: true, statusClipCol: preserveStatus ? undefined : 0 });
    let nopts = 0, onlybeh = 0;
    const ent = (beh, ch, text) => { m.add_menu(beh, ch, ATR_NONE, text, false, false); onlybeh = beh; nopts++; };
    if (!isCond) ent(105, 'a', `Always highlight ${fldname}`);
    if (isCond) ent(103, 'b', 'Bitmask of conditions');
    if (!isCond && fldname !== 'version') ent(102, 'c', `${fldname} value changes`);
    if (!isCap && !isHunger && (at === 'I' || at === 'L')) ent(101, 'n', 'Number threshold');
    if (hasMax) ent(100, 'p', 'Percentage threshold');
    if (fldname === 'hitpoints') ent(106, 'C', `Highlight critically low ${fldname}`);
    if (at === 'S' || isCap || isHunger) ent(104, 't', `${fldname} text match`);
    m.end_menu(`Select ${fldname} field hilite behavior:`);
    let beh = -1;
    if (nopts > 1) {
        const { count, picks } = await m.select_menu(PICK_ONE);
        if (count > 0) beh = picks[0];
        else if (count === 0) beh = 0;
    } else if (onlybeh !== 0) {
        beh = onlybeh;
    }
    return beh;
}

/* C botl.c:3811 status_hilite_menu_choose_updownboth; returns the
 * LT/LE/EQ/GE/GT relation, -1 (NO_LTEQGT) when nothing is picked. */
async function status_hilite_menu_choose_updownboth(fld, str, ltok, gtok, preserveStatus) {
    const isAC = INITBLSTATS[fld][0] === 'armor-class';
    const m = new TtyMenu({ overlay: true, statusClipCol: preserveStatus ? undefined : 0 });
    if (ltok) {
        m.add_menu(10 + 1, 0, ATR_NONE, str ? `${isAC ? 'Better (lower)' : 'Less'} than ${str}` : 'Value goes down', false, false);
        if (str) m.add_menu(10 + 2, 0, ATR_NONE, `${str} or ${isAC ? 'better (lower)' : 'less'}`, false, false);
    }
    m.add_menu(10 + 0, 0, ATR_NONE, str ? `Exactly ${str}` : 'Value changes', false, false);
    if (gtok) {
        if (str) m.add_menu(10 + 3, 0, ATR_NONE, `${str} or ${isAC ? 'worse (higher)' : 'more'}`, false, false);
        m.add_menu(10 + 4, 0, ATR_NONE, str ? `${isAC ? 'Worse (higher)' : 'More'} than ${str}` : 'Value goes up', false, false);
    }
    m.end_menu(`Select field ${INITBLSTATS[fld][0]} value:`);
    const { count, picks } = await m.select_menu(PICK_ONE);
    return count > 0 ? picks[0] - 10 : -1;
}

function status_hilite2str_rules(spec) {
    const out = [], fz = s => s.replace(/[ \-_]/g, '').toLowerCase();
    const origs = spec.split(' ').filter(Boolean);
    for (const [oi, one] of spec.toLowerCase().split(' ').filter(Boolean).entries()) {
        const s = one.split('/'), os = origs[oi].split('/');
        const fldname = status_fieldname(s[0]);
        const fld = INITBLSTATS.findIndex(([n]) => n === fldname);
        if (fld < 0 || fldname === 'condition' || fldname === 'characteristics') continue;
        const at = INITBLSTATS[fld][1];
        for (let i = 1; i < s.length && s[i]; i += 2) {
            const t = s[i];
            let beh;
            if (!s[i + 1] || t === 'always') { beh = 'always'; if (!s[i + 1]) i--; }
            else if ((t === 'up' || t === 'down') && at !== 'S') beh = t;
            else if (t === 'up' || t === 'down' || t === 'changed') beh = 'changed';
            else if (fldname === 'hitpoints' && t === 'criticalhp') beh = 'criticalhp';
            else if (/^[<>]?=?[-+]?[0-9]+%?$/.test(t) && at !== 'S') {
                const op = /^(<=|>=|<|>)/.exec(t)?.[1] || '=';
                beh = `${op}${parseInt(t.replace(/[%<>=+]/g, ''), 10)}${t.includes('%') ? '%' : ''}`;
            } else {
                const arr = fldname === 'carrying-capacity'
                    ? ['Burdened', 'Stressed', 'Strained', 'Overtaxed', 'Overloaded']
                    : fldname === 'alignment' ? ['chaotic', 'neutral', 'lawful']
                    : fldname === 'hunger' ? ['Satiated', 'Hungry', 'Weak', 'Fainting', 'Fainted', 'Starved']
                    : null;
                const k = arr ? arr.find(a => a.toLowerCase() === t) : null;
                if (k) beh = k;
                else if (at === 'S') beh = os[i].trim(); /* botl.c:3093 textmatch keeps case */
                else break; /* config_error: rule rejected */
            }
            let clr = null, attr = 0;
            for (const sf of (s[i + 1] || '').split(/[&+]/)) {
                const a = attrnames.find(x => x.name && fz(x.name) === fz(sf));
                if (a && a.attr === 0) attr = 1;
                else if (a) attr |= HL_ATTRBITS.find(b => b[0] === a.attr)[1];
                else clr = match_str2clr(sf, true);
            }
            let clrbuf = (clr2colorname(clr ?? 8 /* NO_COLOR */) || '').replace(/ /g, '-');
            if (attr === 1) clrbuf += '&normal';
            else if (attr) clrbuf += '&' + HL_ATTRBITS.filter(b => attr & b[1]).map(b => b[2]).join('+');
            const str = `${INITBLSTATS[fld][0]}/${beh}/${clrbuf}`;
            out.push({ fld, str: fld === 0 ? str : str.replace(/ /g, '') });
        }
    }
    return out;
}

function status_hilite_linestr_gather() {
    const lines = (game.status_field_hilites || []).flatMap(status_hilite2str_rules)
        .map((l, k) => ({ ...l, k })).sort((a, b) => a.fld - b.fld || a.k - b.k);
    const cfld = INITBLSTATS.findIndex(([n]) => n === 'condition');
    /* C botl.c:3487-3566 re-serializes the condition rules from the bitmask
     * array (canonical names in conditions[] order, "&normal" for a rule with
     * no attribute) instead of echoing the config text as typed. */
    for (const str of gather_condition_hilite_lines())
        lines.push({ fld: cfld, str });
    return lines;
}

/* C botl.c:2747 query_arrayvalue (arrmin 0): returns the index, -1 on ESC. */
async function query_arrayvalue(querystr, arr, preserveStatus) {
    const m = new TtyMenu({ overlay: true, statusClipCol: preserveStatus ? undefined : 0 });
    arr.forEach((a, i) => m.add_menu(i + arr.length, 0, ATR_NONE, a, false, false));
    m.end_menu(querystr);
    const { count, picks } = await m.select_menu(PICK_ONE);
    return count > 0 ? picks[0] - arr.length : -1;
}

/* C botl.c:4170-4300 status_hilite_menu_add, BL_TH_TEXTMATCH arm for BL_TITLE.
 * The rolelist, the color/attribute retries and the " or " split into two rules
 * follow C; other text fields are not ported. */
const TEXTMATCH_MENU_FLDS = ['title', 'hunger', 'alignment', 'carrying-capacity'];
async function status_hilite_add_title_textmatch(fld, preserveStatus) {
    const name = INITBLSTATS[fld][0];
    const ranks = ROLE_RANKS[role_index_by_name(game.urole?.name?.m || game.urole?.name?.f || '')].rank;
    const female = !!game.flags?.female;
    const rolelist = [];
    /* botl.c:4148-4158 BL_HUNGER: hutxt[] minus its null gap (query_arrayvalue skips it) */
    const fixed = name === 'hunger' ? ['Satiated', 'Hungry', 'Weak', 'Fainting', 'Fainted', 'Starved']
        : name === 'alignment' ? ['chaotic', 'neutral', 'lawful']
        : name === 'carrying-capacity' ? ['Burdened', 'Stressed', 'Strained', 'Overtaxed', 'Overloaded']
        : null;
    if (fixed) rolelist.push(...fixed);
    else for (let i = 0; i < 9; i++) {
        const mbuf = `"${ranks[i][0]}"`;
        let fbuf = '', obuf = '';
        if (ranks[i][1]) {
            fbuf = `"${ranks[i][1]}"`;
            obuf = `${female ? fbuf : mbuf} or ${female ? mbuf : fbuf}`;
        }
        if (female) {
            if (fbuf) rolelist.push(fbuf);
            rolelist.push(mbuf);
            if (obuf) rolelist.push(obuf);
        } else {
            rolelist.push(mbuf);
            if (fbuf) rolelist.push(fbuf);
            if (obuf) rolelist.push(obuf);
        }
    }
    if (!fixed) rolelist.push('"none of the above (polymorphed)"');
    for (;;) {
        const rv = await query_arrayvalue(`Choose ${name} text value to match:`, rolelist, preserveStatus);
        if (rv < 0) return false;
        let textmatch = rolelist[rv];
        for (;;) {
            const clr = await query_color(`Choose a color for when ${name} is '${textmatch}':`, 8, preserveStatus);
            if (clr === -1) break;
            const atr = await query_attr_one(`Choose attribute for when ${name} is '${textmatch}':`, 0, preserveStatus);
            if (atr === -1) continue;
            const attrs = atr === 1 ? 'normal' : HL_ATTRBITS.filter(b => atr & b[1]).map(b => b[2]).join('+');
            const clrname = clr2colorname(clr).replace(/ /g, '-');
            const p = textmatch.indexOf(' or ');
            if (p >= 0) {
                const first = textmatch.slice(0, p);
                (game.status_field_hilites ||= []).push(`${name}/${first}/${clrname}&${attrs}`);
                await pline('Added hilite %s', `${name}/${first}/${clrname}&${attrs}`);
                textmatch = textmatch.slice(p + 4);
            }
            const rule = `${name}/${textmatch}/${clrname}&${attrs}`;
            (game.status_field_hilites ||= []).push(rule);
            await pline('Added hilite %s', rule);
            reset_status_hilites();
            await drainTopline();
            return true;
        }
    }
}

/* C botl.c:4447 status_hilites_viewall. */
async function status_hilites_viewall(lines) {
    await display_text_window(lines.map(l => `OPTIONS=hilite_status: ${l.str}`));
}

/* C botl.c:4369-4443 status_hilite_menu_fld's "Current %s hilites:" menu once a
 * rule exists; returns the behavior for a further status_hilite_menu_add (0 = none). */
async function status_hilite_menu_fld_current(fld, name) {
    const current = new TtyMenu({ overlay: true }); // C botl.c:4369-4443
    status_hilite_linestr_gather().filter(l => l.fld === fld).forEach((l, i) =>
        current.add_menu(i + 1, 0, ATR_NONE, l.str, false, false));
    current.add_menu_str('');
    current.add_menu(-1, 'X', ATR_NONE, 'Remove selected hilites', false, false);
    if (name !== 'score') // C botl.c:4407-4421: no SCORE_ON_BOTL.
        current.add_menu(-2, 'Z', ATR_NONE, 'Add new hilites', false, false);
    current.end_menu(`Current ${name} hilites:`);
    const selected = await current.select_menu(PICK_ANY);
    /* botl.c:4430-4455: 'Z' (-2) creates new hilites via status_hilite_menu_add */
    const mode = (selected.picks || []).slice(0, Math.max(selected.count, 0));
    if (mode.includes(-1)) throw new Error('not yet ported: status hilite rule removal');
    return mode.includes(-2)
        ? await status_hilite_menu_choose_behavior(fld, true) : 0;
}

/* C botl.c:4498 status_hilite_menu.  Picking a field with no rules reaches
 * status_hilite_menu_add() at its choose_behavior step (botl.c:3922-3931);
 * a cancelled behavior menu returns FALSE and the field menu is redone.
 * Existing rules first open status_hilite_menu_fld's menu (botl.c:4357). */
export async function status_hilite_menu(preserveStatus = false) {
    for (;;) {
        const lines = status_hilite_linestr_gather();
        const m = new TtyMenu(); /* 26 rows + header: full-screen, not an overlay */
        if (lines.length) {
            m.add_menu(-1, 0, ATR_NONE, 'View all hilites in config format', false, false);
            m.add_menu_str('');
        }
        INITBLSTATS.forEach(([name], i) => {
            const count = lines.filter(l => l.fld === i).length;
            if (name === 'score' && !count) return; /* no SCORE_ON_BOTL */
            m.add_menu(i + 1, 0, ATR_NONE,
                name.padEnd(18) + (count ? ` (${count} defined)` : ''), false, false);
        });
        m.end_menu('Status hilites:');
        const { count, picks } = await m.select_menu(PICK_ONE);
        if (count <= 0) {
            if (lines.length && !game.iflags.hilite_delta) game.iflags.hilite_delta = 3;
            return;
        }
        const fld = picks[0] - 1;
        if (fld < 0) {
            await status_hilites_viewall(lines);
            continue;
        }
        let adding = lines.some(l => l.fld === fld);
        /* the 24-row menu window covered the status rows and its dismissal
         * does not repaint them: the pending "You see your kitten." --More--
         * (and the submenu after it) stand over blank status rows */
        game._status_blanked = game._decStaleFrom != null;
        /* the menu's dismissal docrt()s (display.c:1747 cls, 1769 botlx) and
         * nothing calls bot() before the behavior menu, so its status rows
         * stay blank unless a pending pline flushed them (pline.c flush_screen) */
        const flushed = !!game._pending_message;
        await drainTopline();
        game._status_blanked = false;
        let beh = adding
            ? await status_hilite_menu_fld_current(fld, INITBLSTATS[fld][0])
            : await status_hilite_menu_choose_behavior(fld, flushed);
        // C botl.c:4225-4243,4285-4301: always rule, with color/attribute retries.
        /* each add re-offers a behavior (botl.c:4445-4447); dispatch it again */
        for (;;) {
            while (beh === 105 || beh === 102) { // botl.c:4088-4102: up/down picker and retry.
                const name = INITBLSTATS[fld][0];
                let rel = beh === 105 ? 'always' : 'changed';
                if (beh === 102 && INITBLSTATS[fld][1] !== 'S') {
                    const change = new TtyMenu({ overlay: true, statusClipCol: flushed ? undefined : 0 });
                    if (name !== 'time') change.add_menu(1, 0, ATR_NONE, 'Value goes down', false, false);
                    change.add_menu(2, 0, ATR_NONE, 'Value changes', false, false);
                    change.add_menu(3, 0, ATR_NONE, 'Value goes up', false, false);
                    change.end_menu(`Select field ${name} value:`);
                    const result = await change.select_menu(PICK_ONE);
                    if (result.count <= 0) { beh = await status_hilite_menu_choose_behavior(fld, flushed); continue; }
                    rel = ['down', 'changed', 'up'][result.picks[0] - 1];
                }
                const when = { down: 'decreases', changed: 'changes', up: 'increases' }[rel];
                let color, attr;
                do { // C botl.c:4240-4243: cancelled attributes retry only color.
                    color = await query_color(beh === 105 ? `Choose a color to always hilite ${name}:`
                        : `Choose a color for when ${name} ${when}:`, 8, flushed);
                    if (color < 0) break;
                    attr = await query_attr_one(beh === 105 ? `Choose attribute to always hilite ${name}:`
                        : `Choose attribute for when ${name} ${when}:`, 0, flushed);
                } while (attr < 0);
                if (color < 0) {
                    if (beh === 105) beh = await status_hilite_menu_choose_behavior(fld, flushed);
                    continue;
                }
                const attrs = attr === 1 ? 'normal' : HL_ATTRBITS.filter(b => attr & b[1]).map(b => b[2]).join('+');
                const rule = `${name}/${rel}/${clr2colorname(color).replace(/ /g, '-')}&${attrs}`;
                (game.status_field_hilites ||= []).push(rule);
                await pline('Added hilite %s', rule);
                reset_status_hilites();
                await drainTopline();
                // C botl.c:4445-4447: Z repeats additions until one is cancelled.
                beh = adding ? await status_hilite_menu_choose_behavior(fld, true)
                    : await status_hilite_menu_fld_current(fld, name);
                adding = true;
            }
            if (beh === 104 && TEXTMATCH_MENU_FLDS.includes(INITBLSTATS[fld][0])) {
                const added = await status_hilite_add_title_textmatch(fld, flushed || adding);
                /* C botl.c:4445-4447: once adding, each add re-offers the behavior menu */
                beh = !added ? 0 : adding ? await status_hilite_menu_choose_behavior(fld, true)
                    : await status_hilite_menu_fld_current(fld, INITBLSTATS[fld][0]);
                if (added) adding = true;
            }
            /* C botl.c:3943-4070 choose_value for BL_TH_VAL_ABSOLUTE/PERCENTAGE:
             * the getlin prompt, its rejection arms, the up/down/both menu for a
             * bare number, then choose_color (botl.c:4232-4300). */
            for (let retry = 0; beh === 100 || beh === 101;) {
                if (retry++ > 5) { await pline("That's enough tries."); await drainTopline(); beh = 0; break; }
                const percent = beh === 100;
                const name = INITBLSTATS[fld][0];
                const inbuf = mungspaces(await getlin(`Enter ${percent ? 'percentage ' : ''}value for ${name} threshold:`));
                if (inbuf === '' || inbuf[0] === '\x1b') {
                    beh = await status_hilite_menu_choose_behavior(fld, true);
                    continue;
                }
                let k = 0, lt = -1; /* NO_LTEQGT */
                if ('<>='.includes(inbuf[0])) {
                    lt = inbuf[0] === '>' ? (inbuf[1] === '=' ? 3 : 4) /* GE, GT */
                        : inbuf[0] === '<' ? (inbuf[1] === '=' ? 2 : 1) /* LE, LT */
                        : 0; /* EQ_VALUE */
                    k += (lt === 2 || lt === 3) ? 2 : 1;
                }
                let strbuf = inbuf, numfrom = k; /* botl.c:3980 '+' is overwritten with ' ' in inbuf */
                if (inbuf[k] === '-') k++;
                else if (inbuf[k] === '+') { strbuf = inbuf.slice(0, k) + ' ' + inbuf.slice(k + 1); numfrom = ++k; }
                let gotnum = false;
                while (/[0-9]/.test(inbuf[k] ?? '')) { k++; gotnum = true; }
                if (inbuf[k] === '%') {
                    if (!percent) {
                        await pline('Not expecting a percentage.');
                        await drainTopline();
                        beh = await status_hilite_menu_choose_behavior(fld, true);
                        continue;
                    }
                    strbuf = strbuf.slice(0, k); /* strip '%' [this accepts trailing junk!] */
                } else if (k < inbuf.length) {
                    await pline('"%s" is not a recognized number.', inbuf.slice(k));
                    continue;
                }
                if (!gotnum) { await pline('Is that an invisible number?'); continue; }
                const op = ['=', '<', '<=', '>=', '>'][lt] ?? '';
                let numstart = inbuf.slice(numfrom, k);
                const val = parseInt(numstart, 10); /* s_to_anything: atoi/atol */
                const dt = percent ? 'I' : INITBLSTATS[fld][1];
                const isAC = name === 'armor-class';
                if (percent) {
                    if (!INITBLSTATS[fld][2]) {
                        await pline("Field '%s' does not support percentage values.", name);
                        beh = 101; /* BL_TH_VAL_ABSOLUTE */
                        continue;
                    }
                    if ((val < 0 && (val !== -1 || lt !== 4))
                        || (val === 0 && lt === 1)
                        || (val === 100 && lt === 4)
                        || (val > 100 && (val !== 101 || lt !== 1))) {
                        await pline("'%s%d%%' is not a valid percent value.", op, val);
                        continue;
                    }
                    numstart += '%';
                    strbuf += '%'; /* Strcat(numstart, "%") also restores inbuf (botl.c:4033) */
                } else if (val < ((dt === 'I' && isAC) ? -128 : lt === 4 ? -1 : lt === 1 ? 1 : 0)) {
                    await pline('%s', `hilite_status threshold '${op}${val}' is out of range`);
                    continue;
                }
                if (lt === -1) {
                    const ltok = dt === 'I' ? (val > 0 || isAC) : val > 0;
                    const gtok = !percent || val < 100;
                    lt = await status_hilite_menu_choose_updownboth(fld, strbuf, ltok, gtok, true);
                    if (lt === -1) continue;
                }
                const rel = (lt === 1) ? 'less than ' : (lt === 4) ? 'more than ' : '';
                const tail = (lt === 2) ? ' or less' : (lt === 3) ? ' or more' : '';
                let clr = -1;
                for (;;) { /* choose_color */
                    clr = await query_color(`Choose a color for when ${name} is ${rel}${numstart}${tail}:`, 8, true);
                    if (clr === -1) break;
                    const atr = await query_attr_one(`Choose attribute for when ${name} is ${rel}${numstart}${tail}:`, 0, true);
                    if (atr === -1) continue;
                    const attrs = atr === 1 ? 'normal' : HL_ATTRBITS.filter(b => atr & b[1]).map(b => b[2]).join('+');
                    const behave = `${['=', '<', '<=', '>=', '>'][lt]}${val}${percent ? '%' : ''}`;
                    const rule = `${name}/${behave}/${clr2colorname(clr).replace(/ /g, '-')}&${attrs}`;
                    (game.status_field_hilites ||= []).push(rule);
                    await pline('Added hilite %s', rule);
                    /* the --More-- page still shows the old status: C re-evaluates
                     * unchanged fields only at reset_status_hilites (botl.c:4302) */
                    await drainTopline();
                    reset_status_hilites();
                    break;
                }
                if (clr === -1) continue; /* goto choose_value */
                beh = adding ? await status_hilite_menu_choose_behavior(fld, true)
                    : await status_hilite_menu_fld_current(fld, name);
                adding = true;
                retry = 0;
            }
            if (!(beh === 105 || beh === 102 || beh === 100 || beh === 101
                  || (beh === 104 && TEXTMATCH_MENU_FLDS.includes(INITBLSTATS[fld][0])))) break;
        }
        if (beh > 0) throw new Error('not yet ported: status_hilite_menu_add value entry');
        preserveStatus = true;
    }
}

/* C ref: botl.c:817 condtests[].useroption */
const COND_USEROPTIONS = ['barehanded', 'blind', 'busy', 'conf', 'deaf', 'iron', 'fly',
    'foodPois', 'glowhands', 'grab', 'hallucinat', 'held', 'ice', 'lava', 'levitate', 'paralyzed',
    'ride', 'sleep', 'slime', 'slip', 'stone', 'strngl', 'stun', 'submerged', 'termIll', 'tethered',
    'trap', 'unconscious', 'woundedlegs', 'holding'];

/* C ref: botl.c:1354-1371 parse_cond_option(); returns 0 ok, 1 unknown, 2 too short.
 * The per-condition choice flags are not modelled here (condopt()). */
export function parse_cond_option(opts) {
    const prefixLen = 5; /* sizeof "cond_" - 1 */
    if (!opts || opts.length <= prefixLen)
        return 2;
    const uniqpart = opts.slice(prefixLen);
    for (const compareto of COND_USEROPTIONS) {
        const minlen = compareto.length >= 4 ? 4 : compareto.length;
        if (uniqpart.length >= minlen && compareto.toLowerCase().startsWith(uniqpart.toLowerCase()))
            return 0;
    }
    return 1;
}

const COND_ALIASES = ['strangled', 'all', 'major_troubles', 'minor_troubles', 'movement', 'opt_in'];

/* C ref: botl.c:3167-3201 match_str2conditionbitmask() — truthiness only */
export function match_str2conditionbitmask(str) {
    const fz = (t) => t.toLowerCase().replace(/[ \-_]/g, '');
    const f = fz(str);
    if (!f) return false;
    if (COND_NAMES.some(n => fz(n) === f)) return true;
    if (COND_ALIASES.some(n => fz(n) === f)) return true;
    return COND_ALIASES.some(n => n.toLowerCase().startsWith(str.toLowerCase()));
}

/* C botl.c:3477 count_status_hilites() -> status_hilite_linestr_countfield(BL_FLUSH):
 * one line per field threshold rule; condition rules are gathered one line per
 * distinct color/attr (botl.c:3487 status_hilite_linestr_gather_conditions). */
export function count_status_hilites() {
    let count = 0;
    for (const spec of game.status_field_hilites || []) {
        const parts = spec.split('/');
        count += Math.max(1, Math.trunc((parts.length - 1) / 2));
    }
    const seen = new Set();
    for (const spec of game.status_condition_hilites || []) {
        const parts = spec.toLowerCase().split('/');
        seen.add(parts.slice(2).join('/').split(/[&+]/).map(s => s.trim()).sort().join('&'));
    }
    return count + seen.size;
}

const strcmpi = (a, b) => { a = a.toLowerCase(); b = b.toLowerCase(); return a < b ? -1 : a > b ? 1 : 0; };

/* C botl.c:1376 cond_menu: toggle status conditions; returns true iff changed. */
export async function cond_menu() {
    const enabled = cond_enabled_arr();
    const menutitle = ['alphabetically', 'by ranking'];
    let idx = 0, res, showmenu = true;
    const choice = new Array(CONDTESTS.length).fill(false);
    game.condmenu_sortorder |= 0;
    do {
        const sequence = CONDTESTS.map((_, i) => i);
        sequence.sort(game.condmenu_sortorder
            ? (a, b) => (CONDTESTS[a][1] - CONDTESTS[b][1]) || strcmpi(CONDTESTS[a][0], CONDTESTS[b][0])
            : (a, b) => strcmpi(CONDTESTS[a][0], CONDTESTS[b][0]));
        const m = new TtyMenu();
        const so = game.condmenu_sortorder;
        m.add_menu(1, 'S', ATR_NONE, `change sort order from "${menutitle[so]}" to "${menutitle[1 - so]}"`, true, false);
        m.add_menu_heading(`sorted ${menutitle[so]}`);
        for (const i of sequence) {
            choice[i] = false;
            m.add_menu(i + 2, 0, ATR_NONE, `cond_${CONDTESTS[i][0].padEnd(14)}`, false, enabled[i]);
        }
        m.end_menu('Choose status conditions to toggle');
        const r = await m.select_menu(PICK_ANY);
        res = r.count;
        showmenu = false;
        if (res > 0) {
            for (let i = 0; i < res; i++) {
                idx = r.picks[i];
                if (idx === 1) {
                    game.condmenu_sortorder = 1 - so;
                    showmenu = true;
                    break;
                } else {
                    idx -= 2;
                    choice[idx] = true;
                }
            }
        }
    } while (showmenu);
    let changed = false;
    if (res >= 0) {
        for (let i = 0; i < CONDTESTS.length; i++) {
            if (enabled[i] !== choice[i]) {
                enabled[i] = choice[i];
                if (game.flags) game.flags['cond_' + CONDTESTS[i][0]] = choice[i];
                changed = true;
            }
        }
        if (changed) game.botl = true;
    }
    return changed;
}

export function describe_level(buf, dflgs, uz) {
    const r = describe_level_impl(dflgs, uz);
    if (buf && typeof buf === 'object')
        buf.s = r.buf;
    return r.ret;
}

export function exp_percent_changing() {
    return false;
}

export function title_to_mon(str, rank_indx, title_length) {
    /* Loop through each of the roles */
    for (let i = 0; i < ROLE_RANKS.length; i++) {
        /* loop through each of the rank titles for role #i */
        for (let j = 0; j < 9; j++) {
            const rm = ROLE_RANKS[i].rank[j][0];
            const rf = ROLE_RANKS[i].rank[j][1];
            if (rm && str_start_is(str, rm, true)) {
                if (rank_indx) rank_indx.value = j;
                if (title_length) title_length.value = rm.length;
                return ROLE_PM_MNUM[i];
            }
            if (rf && str_start_is(str, rf, true)) {
                if (rank_indx) rank_indx.value = j;
                if (title_length) title_length.value = rf.length;
                return ROLE_PM_MNUM[i];
            }
        }
    }
    if (title_length) title_length.value = 0;
    return NON_PM;
}
