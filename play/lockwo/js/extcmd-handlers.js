// extcmd-handlers.js — Extended commands (#-commands).
//
// C ref: cmd.c doextcmd()/extcmdlist[]/extcmds_match(), win/tty/getline.c
// tty_get_ext_cmd()/hooked_tty_getlin(), win/tty/topl.c tty_yn_function().
//
// Implements the '#' extended-command entry: the "#" prompt, command-line
// completion echo (autocomplete), and a faithful subset of the individual
// extended commands the recorded sessions exercise (#jump, #twoweapon,
// #levelchange, #pray, #enhance, #chat, #sit).

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { pline, topl_more, update_topl, y_n, flush_screen, m_at, vobj_at, render_map_to_grid, statusLine1Text, statusLine2Text } from './display.js';
import { NO_COLOR, ATR_INVERSE } from './terminal.js';
import {
    obj_doname, sortloot, SORTLOOT_LOOT, SORTLOOT_PACK, mergable,
    name_inventory_object, call_inventory_object, doorganize,
    addinv, prinv, let_to_name, report_merge_discovery,
} from './invent.js';
import { pluslvl, losexp } from './exper.js';
import { MAXULEV, IS_WALL, SDOOR, MM_NOEXCLAM, BOLT_LIM } from './const.js';
import { create_particular_monster } from './makemon.js';
import { newsym } from './display.js';
import { STATUE, objects, place_object, weight, COIN_CLASS } from './mkobj.js';
import { DESCR_BY_OTYP } from './o_descr_data.js';
import { delobj, stackobj } from './invent.js';
import { count_unpaid } from './invent.js';
import { exercise } from './attrib.js';
import { rn2 } from './rng.js';
import { A_STR, A_DEX } from './const.js';
import { getpos, get_valid_jump_position, is_valid_jump_pos, getpos_render, jump_landing, jump_hilite_first_cursor } from './hack.js';
import { dotwoweapon } from './wield.js';
import { doride } from './steed.js';
import { doenhance } from './enhance.js';
import { dorub, dowipe, ECMD as APPLY_ECMD } from './apply.js';
import { readobjnam } from './readobjnam.js';
import { hold_another_object } from './invent.js';
import { rn1 } from './rng.js';
import { dopray as pray_dopray, dosacrifice } from './pray.js';
import { dosit } from './sit.js';
import { dodip } from './potion.js';
import { dogenocided, do_gamelog, doconduct } from './insight.js';
import { isok } from './hacklib.js';
import { Monnam, canspotmon, x_monnam, oc_wldam } from './uhitm.js';
import { domonnoise } from './sounds.js';
import { build_overview_lines } from './dungeon.js';
import { doextversion } from './version.js';
import { name_to_pmidx, monster_by_pmidx } from './makemon.js';
import { polyok_flag } from './monflags_data.js';
import { polymon, newman, domonability, PM_HUMAN } from './polyself.js';

// ── extcmd flag bits (only the ones we filter on) ──
// C ref: hack.h AUTOCOMPLETE / WIZMODECMD / CMD_NOT_AVAILABLE / INTERNALCMD.
const AUTOCOMPLETE = 0x1;
const WIZMODECMD = 0x2;
const CMD_NOT_AVAILABLE = 0x4;
const INTERNALCMD = 0x8;

// extcmds_match flag args (C: ECM_* in hack.h)
const ECM_NOFLAGS = 0;
const ECM_IGNOREAC = 0x1;   // ignore the AUTOCOMPLETE requirement
const ECM_EXACTMATCH = 0x2; // require exact (full) name match

// The extended-command table.  C ref: cmd.c extcmdlist[].  Each entry is
// [ef_txt, flagbits].  We retain only the flag bits relevant to matching
// (AUTOCOMPLETE / WIZMODECMD / CMD_NOT_AVAILABLE / INTERNALCMD); the rest
// don't affect which entries match a typed prefix.  Ordering mirrors C so
// matchlist indexes are stable.
const EXTCMDLIST = [
    ["#", 0],
    ["?", AUTOCOMPLETE],
    ["adjust", AUTOCOMPLETE],
    ["annotate", AUTOCOMPLETE],
    ["apply", 0],
    ["attributes", 0],
    ["autopickup", 0],
    ["bugreport", 0],
    ["call", 0],
    ["cast", 0],
    ["chat", AUTOCOMPLETE],
    ["chronicle", AUTOCOMPLETE],
    ["close", 0],
    ["conduct", AUTOCOMPLETE],
    ["debugfuzzer", WIZMODECMD],
    ["dip", AUTOCOMPLETE],
    ["down", 0],
    ["drop", 0],
    ["droptype", 0],
    ["eat", 0],
    ["engrave", 0],
    ["enhance", AUTOCOMPLETE],
    ["exploremode", 0],
    ["fight", 0],
    ["fire", 0],
    ["force", AUTOCOMPLETE],
    ["genocided", AUTOCOMPLETE],
    ["glance", 0],
    ["help", 0],
    ["herecmdmenu", AUTOCOMPLETE],
    ["history", AUTOCOMPLETE],
    ["inventory", 0],
    ["inventtype", 0],
    ["invoke", AUTOCOMPLETE],
    ["jump", AUTOCOMPLETE],
    ["kick", 0],
    ["known", 0],
    ["knownclass", 0],
    ["levelchange", AUTOCOMPLETE | WIZMODECMD],
    ["lightsources", AUTOCOMPLETE | WIZMODECMD],
    ["look", 0],
    ["lookaround", 0],
    ["loot", AUTOCOMPLETE],
    ["migratemons", AUTOCOMPLETE | WIZMODECMD],
    ["monster", AUTOCOMPLETE],
    ["name", AUTOCOMPLETE],
    ["offer", AUTOCOMPLETE],
    ["open", 0],
    ["options", 0],
    ["optionsfull", 0],
    ["overview", AUTOCOMPLETE],
    ["panic", AUTOCOMPLETE | WIZMODECMD],
    ["pay", 0],
    ["perminv", 0],
    ["pickup", 0],
    ["polyself", AUTOCOMPLETE | WIZMODECMD],
    ["pray", AUTOCOMPLETE],
    ["prevmsg", 0],
    ["puton", 0],
    ["quaff", 0],
    ["quit", AUTOCOMPLETE],
    ["quiver", 0],
    ["read", 0],
    ["redraw", 0],
    ["remove", 0],
    ["repeat", 0],
    ["reqmenu", 0],
    ["retravel", 0],
    ["ride", AUTOCOMPLETE],
    ["rub", AUTOCOMPLETE],
    ["run", 0],
    ["rush", 0],
    ["save", 0],
    ["saveoptions", 0],
    ["search", 0],
    ["seeall", 0],
    ["seeamulet", 0],
    ["seearmor", 0],
    ["seerings", 0],
    ["seetools", 0],
    ["seeweapon", 0],
    ["shell", CMD_NOT_AVAILABLE],
    ["showgold", 0],
    ["showspells", 0],
    ["showtrap", 0],
    ["sit", AUTOCOMPLETE],
    ["stats", AUTOCOMPLETE | WIZMODECMD],
    ["suspend", CMD_NOT_AVAILABLE],
    ["swap", 0],
    ["takeoff", 0],
    ["takeoffall", 0],
    ["teleport", 0],
    ["terrain", AUTOCOMPLETE],
    ["therecmdmenu", AUTOCOMPLETE],
    ["throw", 0],
    ["timeout", AUTOCOMPLETE | WIZMODECMD],
    ["tip", AUTOCOMPLETE],
    ["toggle", 0],
    ["travel", 0],
    ["turn", AUTOCOMPLETE],
    ["twoweapon", 0],
    ["untrap", AUTOCOMPLETE],
    ["up", 0],
    ["vanquished", AUTOCOMPLETE],
    ["version", AUTOCOMPLETE],
    ["versionshort", 0],
    ["vision", AUTOCOMPLETE | WIZMODECMD],
    ["wait", 0],
    ["wear", 0],
    ["whatdoes", 0],
    ["whatis", 0],
    ["wield", 0],
    ["wipe", AUTOCOMPLETE],
    ["wizborn", WIZMODECMD],
    ["wizbury", AUTOCOMPLETE | WIZMODECMD],
    ["wizcast", WIZMODECMD],
    ["wizcustom", WIZMODECMD],
    ["wizdetect", WIZMODECMD],
    ["wizdispmacros", AUTOCOMPLETE | WIZMODECMD],
    ["wizfliplevel", WIZMODECMD],
    ["wizgenesis", WIZMODECMD],
    ["wizidentify", WIZMODECMD],
    ["wizintrinsic", AUTOCOMPLETE | WIZMODECMD],
    ["wizkill", AUTOCOMPLETE | WIZMODECMD],
    ["wizlevelport", WIZMODECMD],
    ["wizloaddes", WIZMODECMD],
    ["wizloadlua", WIZMODECMD],
    ["wizobjprobs", WIZMODECMD],
    ["wizmakemap", WIZMODECMD],
    ["wizmap", WIZMODECMD],
    ["wizmondiff", AUTOCOMPLETE | WIZMODECMD],
    ["wizrumorcheck", AUTOCOMPLETE | WIZMODECMD],
    ["wizseenv", AUTOCOMPLETE | WIZMODECMD],
    ["wizshownhuuid", AUTOCOMPLETE | WIZMODECMD],
    ["wizsmell", AUTOCOMPLETE | WIZMODECMD],
    ["wiztelekinesis", AUTOCOMPLETE | WIZMODECMD],
    ["wizwhere", AUTOCOMPLETE | WIZMODECMD],
    ["wizwish", WIZMODECMD],
    ["wmode", AUTOCOMPLETE | WIZMODECMD],
    ["zap", 0],
    ["movewest", 0],
    ["movenorthwest", 0],
    ["movenorth", 0],
    ["movenortheast", 0],
    ["moveeast", 0],
    ["movesoutheast", 0],
    ["movesouth", 0],
    ["movesouthwest", 0],
    ["rushwest", 0],
    ["rushnorthwest", 0],
    ["rushnorth", 0],
    ["rushnortheast", 0],
    ["rusheast", 0],
    ["rushsoutheast", 0],
    ["rushsouth", 0],
    ["rushsouthwest", 0],
    ["runwest", 0],
    ["runnorthwest", 0],
    ["runnorth", 0],
    ["runnortheast", 0],
    ["runeast", 0],
    ["runsoutheast", 0],
    ["runsouth", 0],
    ["runsouthwest", 0],
    ["clicklook", INTERNALCMD],
    ["mouseaction", INTERNALCMD],
    ["altadjust", INTERNALCMD],
    ["altdip", INTERNALCMD],
    ["alttakeoff", INTERNALCMD],
    ["altunwield", INTERNALCMD],
];

function isWizard() { return !!game.flags?.debug; }

// C ref: cmd.c extcmds_match().  Returns the list of matching extcmdlist
// indexes for `findstr` under the given flags.
function extcmds_match(findstr, ecmflags) {
    const ignoreac = (ecmflags & ECM_IGNOREAC) !== 0;
    const exactmatch = (ecmflags & ECM_EXACTMATCH) !== 0;
    const fslen = findstr ? findstr.length : 0;
    const out = [];
    for (let i = 0; i < EXTCMDLIST.length; i++) {
        const [txt, flags] = EXTCMDLIST[i];
        if (flags & (CMD_NOT_AVAILABLE | INTERNALCMD)) continue;
        if (!isWizard() && (flags & WIZMODECMD)) continue;
        if (!ignoreac && !(flags & AUTOCOMPLETE)) continue;
        if (findstr == null) {
            out.push(i);
        } else if (exactmatch) {
            if (findstr.toLowerCase() === txt.toLowerCase()) out.push(i);
        } else {
            if (txt.slice(0, fslen).toLowerCase() === findstr.toLowerCase()) out.push(i);
        }
    }
    return out;
}

// C ref: win/tty/getline.c ext_cmd_getlin_hook() — if the typed prefix
// uniquely identifies an AUTOCOMPLETE command, expand it to the full name.
// Returns the expanded string, or null when there is no unique expansion.
function ext_cmd_getlin_hook(base) {
    const matches = extcmds_match(base, ECM_NOFLAGS);
    if (matches.length === 1)
        return EXTCMDLIST[matches[0]][0];
    return null;
}

// mungspaces: collapse runs of whitespace and trim.  C ref: hacklib.c.
function mungspaces(s) {
    return s.replace(/\s+/g, ' ').replace(/^ | $/g, '');
}

// Render the top-line getline prompt: clear row 0, draw "<query> <buf>",
// place the cursor right after the typed text (the autocompleted tail is
// drawn but the cursor is parked at the end of what was actually typed).
// C ref: win/tty/getline.c hooked_tty_getlin() display behavior.
function draw_getlin(query, shown, cursorCol) {
    const disp = game?.nhDisplay;
    if (!disp?.setCell) return;
    const line = query + ' ' + shown;
    for (let c = 0; c < disp.cols; c++) {
        const ch = c < line.length ? line[c] : ' ';
        disp.setCell(c, 0, ch, NO_COLOR, 0);
    }
    disp.setCursor(Math.min(cursorCol, disp.cols - 1), 0);
}

// C ref: win/tty/getline.c hooked_tty_getlin().  Reads a line at the top
// line, with optional completion hook.  Each keystroke is its own captured
// screen frame (the nhgetch fires the capture hook for the freshly drawn
// prompt state).  Returns the typed string, or "\x1b" if escaped out of an
// empty buffer.
export async function hooked_tty_getlin(query, hook) {
    // C ref: win/tty/getline.c hooked_tty_getlin():53-54 — if a top-line message
    // is still awaiting acknowledgment (toplin == NEED_MORE), page it with
    // --More-- (its own captured frame) before drawing the getlin prompt.  This
    // fires for e.g. a confused scroll's "Being confused, ..." line preceding the
    // level-teleport prompt; ordinary command-initiated getlins start with a
    // cleared top line, so it is a no-op for them.
    if (game._toplin === 1) {
        await topl_more();
        game._pending_message = '';
        game._toplin = 0;
    }

    let typed = '';   // what the user actually typed (obufp/bufp content)
    let shown = '';   // what is displayed (typed, possibly autocompleted)
    const base = (query + ' ').length; // column of first input char

    for (;;) {
        // Cursor sits one past the typed characters.
        draw_getlin(query, shown, base + typed.length);
        const code = await nhgetch();

        if (code === 27) { // ESC
            if (typed.length > 0) {
                // Clear current contents and keep prompting from the start.
                typed = '';
                shown = '';
                continue;
            }
            return '\x1b';
        }
        if (code === 13 || code === 10) { // newline: done
            // C ref: ext_cmd_getlin_hook() writes the unique completion into the
            // buffer (obufp), so Return returns the completed command name, not
            // just what was typed (e.g. "l" -> "loot").  `shown` already holds
            // that completion (or the raw typed text when none applies).
            return shown;
        }
        if (code === 8 || code === 127) { // backspace / delete-prev
            if (typed.length > 0) {
                typed = typed.slice(0, -1);
                const expanded = hook ? hook(typed) : null;
                shown = expanded != null ? expanded : typed;
            }
            continue;
        }
        if (code >= 32 && code !== 0x7f && typed.length < 79) {
            typed += String.fromCharCode(code);
            const expanded = hook ? hook(typed) : null;
            shown = expanded != null ? expanded : typed;
        }
        // any other key: ignore (tty bell), reloop and redraw.
    }
}

// C ref: win/tty/getline.c tty_get_ext_cmd().  Read a full-word extended
// command name with completion, then resolve it to an extcmdlist index via
// an exact (autocomplete-ignoring) match.  Returns the index, or -1.
async function tty_get_ext_cmd() {
    let buf = await hooked_tty_getlin('#', ext_cmd_getlin_hook);
    buf = mungspaces(buf);

    if (buf === '' || buf[0] === '\x1b') return -1;
    const matches = extcmds_match(buf, ECM_IGNOREAC | ECM_EXACTMATCH);
    if (matches.length !== 1) {
        await pline(`#${buf}: unknown extended command.`);
        return -1;
    }
    return matches[0];
}

// C ref: win/tty/topl.c tty_yn_function() — prompt "query [resp] (def) " on
// the top line and read a single allowed key.  `def` is returned for
// space/return; ESC maps to 'q' (if allowed) else 'n' (if allowed) else def.
export async function yn_function(query, resp, def) {
    let prompt = query;
    if (resp != null) {
        prompt += ` [${resp}]`;
        if (def) prompt += ` (${def})`;
        prompt += ' ';
    } else {
        prompt += ' ';
    }
    const disp = game?.nhDisplay;
    const drawPrompt = () => {
        if (!disp?.setCell) return;
        for (let c = 0; c < disp.cols; c++) {
            const ch = c < prompt.length ? prompt[c] : ' ';
            disp.setCell(c, 0, ch, NO_COLOR, 0);
        }
        disp.setCursor(Math.min(prompt.length, disp.cols - 1), 0);
    };
    for (;;) {
        drawPrompt();
        let q = await nhgetch();
        if (resp == null) return String.fromCharCode(q);
        let c = String.fromCharCode(q).toLowerCase();
        if (q === 27) { // ESC
            if (resp.includes('q')) return 'q';
            if (resp.includes('n')) return 'n';
            return def || '\0';
        }
        if (q === 32 || q === 13 || q === 10) return def || '\0';
        if (resp.includes(c)) return c;
        // otherwise: bell, reloop.
    }
}

// ── individual extended commands ──

// C ref: apply.c dojump()/jump().  For the recorded knight (innate Jumping)
// this reaches the "Where do you want to jump?" prompt and then enters
// getpos() targeting mode.  A picked target is validated with
// is_valid_jump_pos(showmsg=TRUE); on failure the failure message is shown
// and no time passes (ECMD_FAIL).  On a valid, non-self target the hero
// hurtles to the landing spot (teleds) and morehungry(rnd(25)) is rolled —
// the command then costs a turn (ECMD_TIME) so monsters move once.
async function dojump() {
    // C ref: apply.c jump():  pline("Where do you want to jump?"); cc = <u>;
    // getpos_sethilite(...); getpos(&cc, TRUE, "the desired position").
    // C places the cursor on the hero (curs WIN_MAP) and flush_screen()s with
    // the prompt before getpos()'s first readchar blocks.  There is NO --More--:
    // handle_tip(TIP_GETPOS) only fires a (no-op) Lua hook, it does not page.
    const u = game.u;
    await pline('Where do you want to jump?');
    // C ref: getpos() -> handle_tip(TIP_GETPOS) shows a tty NHW_TEXT window the
    // FIRST time getpos is used.  Displaying that window pages the pending
    // message window first, so the prompt is shown with a trailing --More--;
    // the tip text is then rendered by getpos_tip() inside getpos().  On every
    // later getpos use the tip is suppressed (no --More--, no tip text): the
    // cursor goes straight onto the map at the hero.  Mirror that gating with
    // the TIP_GETPOS flag (1 << 4) so only the first #jump pages the prompt.
    const TIP_GETPOS = 1 << 4;
    const tipPending = !((game.context?.tips || 0) & TIP_GETPOS);
    if (tipPending) {
        await topl_more();
    } else {
        await getpos_render('Where do you want to jump?', u.ux, u.uy);
        // C ref: getpos.c getpos() opening "curs(WIN_MAP,u.ux,u.uy);
        // flush_screen(0)".  jump()'s getpos_sethilite() marked every valid
        // jump position gnew (selection_force_newsyms -> newsym_force); the
        // opening flush redraws those cells and leaves the tty cursor one past
        // the last (row-major) one rather than on the hero.  Reproduce that
        // first-frame cursor placement (subsequent frames track <cx,cy>).
        const hc = jump_hilite_first_cursor();
        if (hc) { const disp = game.nhDisplay; if (disp?.setCursor) disp.setCursor(hc[0], hc[1]); }
    }
    // getpos with force=TRUE (jump/teleport targeting): unknown keys keep the
    // loop alive, the '(invalid target)' suffix uses get_valid_jump_position.
    const cc = await getpos('the desired position', u.ux, u.uy,
                            (x, y) => get_valid_jump_position(x, y), /*force=*/true);
    if (!cc) return 0; // ESC -> ECMD_CANCEL (no time)

    // is_valid_jump_pos(showmsg=TRUE): emits "Illegal move!" / "Too far!" /
    // "There is an obstacle preventing that jump." on failure -> ECMD_FAIL.
    if (!(await is_valid_jump_pos(cc.x, cc.y, /*showmsg=*/true))) {
        return 0;
    }
    // (no steed: the "isn't capable of jumping in place" branch is N/A)
    // Jumping onto the hero's own spot in the recorded sessions never happens
    // when not trapped (an in-place jump on empty floor is free, ECMD_OK), and
    // the knight here is never trapped.  Treat a same-spot pick as a free no-op.
    if (cc.x === u.ux && cc.y === u.uy) {
        return 0;
    }
    // Perform the jump: walk_path/hurtle (RNG-inert over open floor) then
    // teleds(cc) relocates the hero; morehungry(rnd(25)) is then rolled.
    await jump_landing(cc.x, cc.y);
    return 1; // ECMD_TIME — the move loop advances a turn (monsters move).
}

// C ref: wizcmds.c wiz_level_change().  getlin a target experience level, then
// drive pluslvl()/losexp() to reach it.  Each level gain prints "You feel more
// experienced." + "Welcome to experience level N." (and any adjabil intrinsic
// message); the topline accumulates two messages per line and fires --More--
// when the next message won't fit (display.js update_topl).  pluslvl/losexp
// roll the per-level newhp()/newpw() RNG.
async function wiz_level_change() {
    const buf = mungspaces(await getlin_top('To what experience level do you want to be set?'));
    if (buf === '' || buf[0] === '\x1b') return 0;
    const m = buf.match(/^(-?\d+)/);
    if (!m) { await pline('Never mind.'); return 0; }
    let newlevel = parseInt(m[1], 10);
    const u = game.u;

    // Reset the topline-accumulation state for this command (toplin starts
    // empty: the first message replaces the line without a --More--).
    game._toplin = 0;

    if (newlevel === (u.ulevel || 0)) {
        await pline('You are already that experienced.');
    } else if (newlevel < (u.ulevel || 0)) {
        if ((u.ulevel || 0) === 1) {
            await pline('You are already as inexperienced as you can get.');
            return 0;
        }
        if (newlevel < 1) newlevel = 1;
        while ((u.ulevel || 0) > newlevel)
            await losexp('#levelchange', update_topl);
    } else {
        if ((u.ulevel || 0) >= MAXULEV) {
            await pline('You are already as experienced as you can get.');
            return 0;
        }
        if (newlevel > MAXULEV) newlevel = MAXULEV;
        while ((u.ulevel || 0) < newlevel)
            await pluslvl(false, update_topl);
    }
    u.ulevelmax = u.ulevel;
    return 0;
}

// C ref: pray.c dopray().  ParanoidPray is on by default, so confirm first; the
// full prayer resolution (can_pray + nomul(-3) occupation + prayer_done) lives
// in pray.js, which drives the input-free occupation turns itself.
async function dopray() {
    return await pray_dopray(paranoid_query);
}

// C ref: cmd.c paranoid_query()/paranoid_ynq() with be_paranoid=FALSE
// (ParanoidConfirm unset): yn_function(prompt, "yn", 'n').
async function paranoid_query(prompt) {
    return (await yn_function(prompt, 'yn', 'n')) === 'y';
}

// C ref: sounds.c dochat() — the #chat command.  The starter heroes can speak
// (not silent/strangled/swallowed/underwater) and aren't standing on shop
// merchandise, so the modelled path is: getdir("Talk to whom?...") then, for an
// adjacent square, talk to a monster (domonnoise) / statue / wall / empty air.
// getdir consumes no RNG; domonnoise() drives a turn (ECMD_TIME) when it talks
// to a real monster, otherwise the command is free (ECMD_OK).
async function dochat() {
    const u = game.u;
    // (is_silent / Strangled / uswallow / Underwater / shop-object short-circuits
    //  don't apply to the speaking starter heroes on a normal floor.)
    const { getdir } = await import('./cmd.js');
    const dir = await getdir('Talk to whom? (in what direction)');
    if (!dir) return 0; /* ECMD_CANCEL -> no turn */
    u.dx = dir.dx; u.dy = dir.dy; u.dz = dir.dz || 0;

    // talking up/down (no steed) — "They won't hear you up/down there." (no turn)
    if (u.dz) {
        await update_topl(`They won't hear you ${u.dz < 0 ? 'up' : 'down'} there.`);
        return 0;
    }
    // talking to yourself.
    if (u.dx === 0 && u.dy === 0) {
        await update_topl('Talking to yourself is a bad habit for a dungeoneer.');
        return 0;
    }

    const tx = u.ux + u.dx, ty = u.uy + u.dy;
    if (!isok(tx, ty)) return 0;

    let mtmp = m_at(tx, ty);
    if (!mtmp || mtmp.mundetected) {
        // statue / wall talk: a STATUE on the floor, or a wall/SDOOR.  None of
        // the owned chats target these (the squares are empty floor), so this
        // simply yields no message (ECMD_OK), matching an empty-air chat.
        const otmp = vobj_at(tx, ty);
        if (otmp && otmp.otyp === STATUE) {
            await update_topl('The statue seems not to notice you.');
            return 0;
        }
        const tgt = game.level?.at(tx, ty);
        if (tgt && (IS_WALL(tgt.typ) || tgt.typ === SDOOR)) {
            await update_topl("It's like talking to a wall.");
            return 0;
        }
        if (!mtmp) return 0; // empty air: no message, no turn
    }

    // sleeping non-priest monsters won't talk.
    if ((mtmp.msleeping || mtmp.mfrozen) && !mtmp.ispriest) {
        if (canspotmon(mtmp))
            await update_topl(`${Monnam(mtmp)} seems not to notice you.`);
        return 0;
    }
    // a tame pet that is busy eating just makes eating noises (no turn).
    if (mtmp.mtame && mtmp.meating) {
        await update_topl(`${Monnam(mtmp)} is eating noisily.`);
        return 0;
    }
    return await domonnoise(mtmp);
}

// ── getlin (plain top-line line input, no completion) ──
// C ref: win/tty/getline.c tty_getlin().
async function getlin_top(query) {
    return await hooked_tty_getlin(query, null);
}

// ── #wizwish (wizcmds.c wiz_wish -> zap.c makewish) ──
//
// Wizard-mode wish.  C ref: wizcmds.c:32 wiz_wish() sets flags.verbose=FALSE
// (so the "You may wish for an object." line is suppressed) then calls
// makewish().  makewish (zap.c:6314) prompts "For what do you wish?", parses
// the reply with readobjnam(), creates the object, holds it, and finally rolls
// u.ublesscnt += rn1(100, 50) — recorded as rn2(100) @ makewish(zap.c:6421).
//
// readobjnam() drives the one RNG draw in name resolution (rn2(maxprob) @
// rnd_otyp_by_namedesc) plus the artifact rn2(nartifact_exist()) when an
// artifact is wished for; mksobj() supplies the object-creation RNG.
const MAXWISHTRY = 5;
// Exported so cmd.js can bind the C('w') keymap entry (cmd.c:2000-2001) in
// addition to the '#wizwish' extended command both route here.
export async function wiz_wish() {
    if (!isWizard()) return 0;
    await makewish();
    return 0;
}

async function makewish() {
    let tries = 0;
    let result = null;
    for (;;) {
        const prompt = (game.iflags?.cmdassist && tries > 0)
            ? 'For what do you wish (enter \'help\' for assistance)?'
            : 'For what do you wish?';
        let buf = mungspaces(await getlin_top(prompt));
        if (buf === '\x1b' || (buf.length && buf[0] === '\x1b')) buf = '';
        if (strcmpi_eq(buf, 'help')) { continue; }

        const r = readobjnam(buf);
        if (!r || r.kind == null) {
            await pline('Nothing fitting that description exists in the game.');
            if (++tries < MAXWISHTRY) continue;
            await pline("That's enough tries!");
            // C: otmp = readobjnam(0,0) -> random object; not exercised.
            return;
        }
        if (r.kind === 'nothing') return; /* declined to make a wish */
        if (r.kind === 'hands') return;   /* terrain wish; not exercised */
        result = r.obj;
        break;
    }

    // hold the wished object (addinv).  drop_fmt/hold_msg as in C makewish.
    await hold_another_object(result, 'Oops!  %s to the floor!', null, null);

    // u.ublesscnt += rn1(100, 50);  /* the gods take notice */
    const u = game.u;
    if (u) u.ublesscnt = (u.ublesscnt || 0) + rn1(100, 50);
    else rn1(100, 50);
}

function strcmpi_eq(a, b) { return String(a).toLowerCase() === String(b).toLowerCase(); }

// ── #wizgenesis / ^G (wizcmds.c wiz_genesis -> read.c create_particular) ──
//
// Wizard-mode create-monster.  C ref: wizcmds.c:203 wiz_genesis() clears
// iflags.debug_mongen then calls create_particular(), which prompts "Create
// what kind of monster?" with getlin, parses the reply (create_particular_parse,
// RNG-free), and on a valid single named monster calls
// create_particular_creation() -> makemon(whichpm, u.ux, u.uy, MM_NOEXCLAM).
//
// The recorded seed5002 sessions create exactly one named monster per ^G (no
// quantity/gender/disposition prefixes), so we model that common case: resolve
// the name, place via enexto next to the hero (collect_coords RNG), run makemon,
// then print the C "<Mon> appears next to you." materialize line.  Unknown
// names print "I've never heard of such monsters." (matching the !*bufp branch).
const CP_TRYLIM = 5;
async function create_particular() {
    let prompt = 'Create what kind of monster?';
    let tryct = CP_TRYLIM, altmsg = 0;
    let made = null, buf = '';
    do {
        buf = mungspaces(await getlin_top(prompt));
        if (buf === '\x1b' || (buf.length && buf[0] === '\x1b')) return; // ESC -> abort

        made = create_particular_monster(buf, MM_NOEXCLAM);
        if (made) break;

        // no good; try again (mirror C's altmsg/prompt expansion)
        if (buf || altmsg || tryct < 2) {
            await pline("I've never heard of such monsters.");
        } else {
            await pline('Try again (type * for random, ESC to cancel).');
            ++altmsg;
        }
        if (tryct === CP_TRYLIM) prompt += ' [type name or symbol]';
    } while (--tryct > 0);

    if (!tryct) {
        await pline("That's enough tries!");
        return;
    }
    if (!made) return;

    // C makemon.c:1473-1508 — newsym + "<Mon> appears<place>." (MM_NOEXCLAM, so
    // no " suddenly" and a trailing '.').  what = Amonnam(mtmp) when spottable.
    newsym(made.x, made.y);
    const what = capitalize(x_monnam(made.mtmp, /*ARTICLE_A*/ 2, null, 0, false));
    const place = made.next2u ? ' next to you'
        : (distu_xy(made.x, made.y) <= BOLT_LIM * BOLT_LIM) ? ' close by' : '';
    await pline(`${what} appears${place}.`);
}

// C ref: hacklib.c upstart() — capitalize first letter.
function capitalize(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// C ref: hack.c distu(x,y) — squared distance from the hero.
function distu_xy(x, y) {
    const u = game.u;
    const dx = x - u.ux, dy = y - u.uy;
    return dx * dx + dy * dy;
}

// Wizard ^G handler (also reachable via #wizgenesis).  C ref: wiz_genesis().
export async function wiz_genesis() {
    if (!isWizard()) return 0;
    await create_particular();
    return 0;
}

// ── #polyself (wizcmds.c wiz_polyself -> polyself.c polyself(POLY_CONTROLLED)) ──
//
// Wizard-mode polymorph-self.  wiz_polyself() always calls polyself() with
// forcecontrol=TRUE and controllable_poly=FALSE (no ring of polymorph
// control in any covered session), so the "Become <x>?" y_n confirmation and
// the draconian/vampire/lycanthrope goto-shortcuts (none of which a covered
// session's hero ever is) never fire; those branches are therefore left out
// rather than half-wired.  Random ("*") selection is likewise unreached (no
// covered session ever types "*"/"random"/ESC at this prompt) and left out.
//
// Name resolution mirrors makemon.js's create_particular_monster(): a plain
// name_to_pmidx() exact-match lookup (matching that established precedent),
// not C's full name_to_mon() prefix/plural/alt-spelling matching.
const POLYSELF_TRYLIM = 5;
export async function wiz_polyself() {
    if (!isWizard()) return 0;
    let tryct = POLYSELF_TRYLIM;
    do {
        const raw = await getlin_top('Become what kind of monster? [type the name]');
        if (raw === '\x1b' || (raw.length && raw[0] === '\x1b')) {
            await pline('Never mind.');
            return 0;
        }
        const buf = mungspaces(raw);
        let mntmp = name_to_pmidx(buf);

        if (mntmp < 0) {
            await pline("I've never heard of such monsters.");
            continue;
        }
        // is_placeholder() ORC/ELF/GIANT substitution (mkclass_poly-style
        // random pick within the class): not modeled — no covered session
        // types a bare class placeholder name ("orc"/"elf"/"giant"); PM_HUMAN
        // is exempted from is_placeholder() handling entirely, matching C.
        const mdat = monster_by_pmidx(mntmp);
        if (mntmp !== PM_HUMAN && !polyok_flag(mdat)) {
            const pmName = mdat?.name || 'that';
            await pline(`You can't polymorph into ${/^[aeiou]/i.test(pmName) ? 'an' : 'a'} ${pmName}.`);
            continue;
        }
        if (mntmp === PM_HUMAN) {
            await newman();
        } else {
            await polymon(mntmp);
        }
        return 0;
    } while (--tryct > 0);
    await pline("That's enough tries!");
    return 0;
}

// ── #name / #call (do_name.c docallcmd) ──
//
// Builds the "What do you want to name?" PICK_ONE menu, displays it as the
// tty corner-overlay NHW_MENU, then dispatches the chosen sub-action.  The
// recorded sessions take the cancel (ESC) path, so once a selection is made
// we hand off to the matching sub-handler; unmodelled sub-actions are no-ops.
//
// C ref: do_name.c docallcmd + win/tty/wintty.c tty_display_nhwindow (the
// H2344_BROKEN corner-menu offx) + process_menu_window item/morestr layout.

// Render a tty corner-overlay menu to the grid: title (inverse) on row 0,
// a blank separator, the item lines, then the "(end)" morestr with the
// cursor parked after it.  Columns left of offx keep the pre-existing
// screen content (the map shows through).  C ref: process_menu_window.
function render_corner_menu(disp, title, items) {
    if (!disp?.setCell) return null;
    const cols = disp.cols || 80;

    // maxcols mirrors tty_end_menu: max(str.length + 2) over all rendered
    // lines (items are "ch - text"; the title and blank line included).
    const lines = [];
    lines.push({ text: title, attr: ATR_INVERSE });   // menu prompt (title)
    lines.push({ text: '' });                           // blank separator
    for (const it of items) lines.push({ text: `${it.ch} - ${it.desc}` });

    let maxcols = 0;
    for (const l of lines) maxcols = Math.max(maxcols, l.text.length + 2);

    // C: offx = min(min(82, cols/2), cols - maxcol - 1).  (H2344_BROKEN)
    let offx = Math.min(Math.min(82, Math.floor(cols / 2)), cols - maxcols - 1);
    if (offx < 0) offx = 0;
    // Items render at column offx+1 (a leading space sits at offx).
    const textCol = offx + 1;

    const blankCols = (row) => {
        for (let c = offx; c < cols; c++) disp.setCell(c, row, ' ', NO_COLOR, 0);
    };
    // The message window (row 0) is cleared in full when the menu is raised.
    for (let c = 0; c < cols; c++) disp.setCell(c, 0, ' ', NO_COLOR, 0);

    for (let i = 0; i < lines.length; i++) {
        blankCols(i);
        if (lines[i].text) disp.putstr(textCol, i, lines[i].text, NO_COLOR, lines[i].attr || 0);
    }
    // morestr "(end) " on the row after the last line (single-page menu).
    const moreRow = lines.length;
    blankCols(moreRow);
    disp.putstr(textCol, moreRow, '(end)', NO_COLOR, 0);
    // C dmore: cursor parked at offx + strlen("(end) ") + 2 = textCol + 6.
    disp.setCursor(textCol + 6, moreRow);
    return offx;
}

function current_level_annotation_key() {
    const uz = game.u?.uz || { dnum: 0, dlevel: 1 };
    return `${uz.dnum}:${uz.dlevel}`;
}

// C ref: dungeon.c query_annotation()/donamelevel().
async function donamelevel() {
    const annotations = game._level_annotations || (game._level_annotations = {});
    const key = current_level_annotation_key();
    const current = annotations[key] || '';
    const query = current
        ? `Replace annotation "${current.slice(0, 30)}${current.length > 30 ? '...' : ''}" with?`
        : 'What do you want to call this dungeon level?';
    await flush_screen(1);
    const raw = await hooked_tty_getlin(query, null);
    game._pending_message = '';
    if (!raw || raw === '\x1b') return 0;
    const annotation = mungspaces(raw);
    if (annotation) annotations[key] = annotation;
    else delete annotations[key];
    return 0;
}

// C ref: do_name.c docallcmd.  Present the name/call menu, read a single
// PICK_ONE selection (ESC/space cancels), then dispatch the sub-action.
async function docallcmd() {
    const disp = game?.nhDisplay;
    // C: inventory branches are only present when the pack is non-empty.
    const haveInvent = (game.invent || game.gi?.invent || []).length > 0;
    const items = [{ ch: 'm', desc: 'a monster' }];
    if (haveInvent) {
        items.push({ ch: 'i', desc: 'a particular object in inventory' });
        items.push({ ch: 'o', desc: 'the type of an object in inventory' });
    }
    items.push({ ch: 'f', desc: 'the type of an object upon the floor' });
    items.push({ ch: 'd', desc: 'the type of an object on discoveries list' });
    items.push({ ch: 'a', desc: 'record an annotation for the current level' });

    render_corner_menu(disp, 'What do you want to name?', items);
    // Direct accelerators and the historical group accelerators both select;
    // invalid input leaves the PICK_ONE menu active.
    const aliases = { C: 'm', y: 'i', n: 'o', ',': 'f', '\\': 'd', l: 'a' };
    let ch;
    for (;;) {
        const key = await nhgetch();
        if (key === 27 || key === 32 || key === 13 || key === 10) {
            ch = 'q';
            break;
        }
        const c = String.fromCharCode(key);
        const selected = aliases[c] || c;
        if (items.some((it) => it.ch === selected)) {
            ch = selected;
            break;
        }
    }

    // The menu is left on the grid; the next rhack() iteration's
    // flush_screen(1) clears it and redraws the map with the cursor parked at
    // the hero (matching tty_dismiss_nhwindow -> docorner/docrt).

    switch (ch) {
    case 'q':
    default:
        break;
    case 'm': // name a visible monster (do_mgivenname)
    case 'f': // name a type of object on the floor (namefloorobj)
    case 'd': // rename a discovered type (rename_disco)
        break;
    case 'i': // name an individual object (do_oname)
        await name_inventory_object();
        break;
    case 'o': // name a type of object (docall)
        await call_inventory_object();
        break;
    case 'a': // annotate the level (donamelevel)
        await donamelevel();
        break;
    }
    return 0;
}

// LARGE_BOX..BAG_OF_TRICKS is the full Is_container() range (objclass.h).
const LARGE_BOX_OTYP = 214, CHEST_OTYP = 215, ICE_BOX_OTYP = 216,
      BAG_OF_TRICKS_OTYP = 220;
// Unlocking tools (objclass.h otyp values from mkobj.js).
const SKELETON_KEY = 221, LOCK_PICK = 222, CREDIT_CARD = 223;
const PM_ROGUE = 8;
// C ref: objclass.h Is_container(o) — any #loot-able floor container
// (large box, chest, ice box, sack, oilskin sack, bag of holding/tricks).
function is_container_otyp(otyp) { return otyp >= LARGE_BOX_OTYP && otyp <= BAG_OF_TRICKS_OTYP; }
// C ref: objclass.h Is_box(o) — large box / chest only: the two *lockable*
// containers.  Narrower than is_container_otyp; #force only recognizes these.
function is_lockbox_otyp(otyp) { return otyp === LARGE_BOX_OTYP || otyp === CHEST_OTYP; }
// C ref: attrib.h ACURR(x) — current attribute value.
function ACURR(i) { return game.u?.acurr?.a?.[i] ?? 0; }
// C ref: objnam.c minimal_xname()/OBJ_DESCR — bare (article-less, BUC-less)
// type name: the real name once identified (oc_name_known), else the shared
// unidentified appearance ("bag" for sack/oilskin sack/bag of holding/tricks
// before they're told apart; large box/chest/ice box have no separate
// description and so are name-known from the start).
function box_basename(otyp) {
    const ocl = objects[otyp];
    if (!ocl) return 'large box';
    if (ocl.oc_name_known) return ocl.name;
    const idx = ocl.oc_descr_idx != null ? ocl.oc_descr_idx : otyp;
    return DESCR_BY_OTYP[idx] ?? ocl.name;
}

function floor_obj_here(pred) {
    const u = game.u;
    if (!u) return null;
    const objs = (game.level?.objects || []).filter(
        (o) => o.where === 'floor' && o.ox === u.ux && o.oy === u.uy && pred(o.otyp));
    return objs.length ? objs[0] : null;
}
// Return the floor container at the hero's square (first container in the
// object chain), or null.  C ref: container_at()/do_loot_cont() iterate the
// floor object list at (u.ux, u.uy), testing Is_container().
function floor_box_here() { return floor_obj_here(is_container_otyp); }
// C ref: lock.c doforce() — scans for Is_box() (large box/chest) only.
function floor_lockbox_here() { return floor_obj_here(is_lockbox_otyp); }

// Status-line text for the modal container renders (mirrors invent.js's
// putStatusLines: statusLine1Text carries cursor-forward escapes that must be
// expanded to spaces for the direct putstr path).
function _container_status1() {
    return statusLine1Text().replace(/\x1b\[[0-9;]*[A-Za-z]/g, (m) =>
        m.match(/\x1b\[\d+C/) ? ' '.repeat(parseInt(m.slice(2), 10)) : '');
}
function _container_status2() { return statusLine2Text(); }

// C ref: win/tty/wintty.c tty_display_nhwindow NHW_MENU (H2344_BROKEN offx) +
// process_menu_window()/process_text_window().  Draw a partial-width corner
// window over the map: clear the screen, lay the map + status back down, blank
// the window's column band, draw the lines (each already "selector - text" or a
// header), then the morestr, and park the cursor after it.
//   lines   : [{ text, attr }] (attr defaults to normal; the title is inverse)
//   maxcol  : window width for the offx calc (add_menu uses len+2; putstr len+1)
//   morestr : "(end)" for a menu, "--More--" for a text window
//   curPad  : extra columns past the morestr where the cursor parks (the menu's
//             "(end) " has a trailing space -> +1; the text "--More--" -> +0)
function draw_corner_window(lines, maxcol, morestr, curPad) {
    const disp = game?.nhDisplay;
    if (!disp?.clearScreen) return;
    const cols = disp.cols || 80;
    // H2344_BROKEN: offx = min(min(82, cols/2), cols - maxcol - 1); text at offx+1.
    let offx = Math.min(Math.min(82, Math.floor(cols / 2)), cols - maxcol - 1);
    if (offx < 0) offx = 0;
    const textCol = offx + 1;
    disp.clearScreen();
    render_map_to_grid();
    const moreRow = lines.length;
    for (let r = 0; r <= moreRow && r < 22; r++)
        for (let c = offx; c < cols; c++) disp.setCell(c, r, ' ', NO_COLOR, 0);
    for (let r = 0; r < lines.length; r++) {
        const ln = lines[r];
        if (ln && ln.text) disp.putstr(textCol, r, ln.text, NO_COLOR, ln.attr || 0);
    }
    disp.putstr(textCol, moreRow, morestr, NO_COLOR, 0);
    disp.putstr(0, 22, _container_status1(), NO_COLOR, 0);
    disp.putstr(0, 23, _container_status2(), NO_COLOR, 0);
    disp.setCursor(textCol + morestr.length + (curPad || 0), moreRow);
    game._modal_screen = 'container';
}

// C ref: pickup.c in_or_out_menu().  Build and render the "Do what with <box>?"
// PICK_ONE corner menu.  The menu always offers ':' (look inside) and 'q'
// (quit, pre-selected default when there is no next container); 'o'/'b' appear
// when the container has contents (outokay) and 'i'/'r'/'s' when the hero
// carries other inventory (inokay).
function render_in_or_out_menu(box, outokay, inokay, alreadyused, more_containers) {
    const name = `the ${box_basename(box.otyp)}`;
    const title = `Do what with ${name}?`;
    // C ref: menuselector = flags.lootabc ? abc_chars : lootchars.  With the
    // 'lootabc' option on, the entries are lettered a/b/c/d/e in place of the
    // mnemonic o/i/b/r/s.  a.a_int (1..8) indexes the selector; element [0]
    // ('_') is a skipped placeholder.
    const sel = game?.flags?.lootabc ? '_:abcdenq' : '_:oibrsnq';
    const lines = [{ text: title, attr: ATR_INVERSE }, { text: '' }];
    lines.push({ text: `${sel[1]} - Look inside ${name}` });
    if (outokay) lines.push({ text: `${sel[2]} - take something out` });
    if (inokay) lines.push({ text: `${sel[3]} - put something in` });
    if (outokay) lines.push({ text: `${sel[4]} - ${inokay ? 'both; ' : ''}take out, then put in` });
    if (inokay) {
        lines.push({ text: `${sel[5]} - ${outokay ? 'both reversed; ' : ''}put in, then take out` });
        lines.push({ text: `${sel[6]} - stash one item into ${name}` });
    }
    lines.push({ text: '' }); // C: add_menu_str(win, "") — blank separator
    if (more_containers) lines.push({ text: `${sel[7]} - loot next container` });
    // The 'q' entry is the pre-selected PICK_ONE default (no next container),
    // so process_menu_window renders its selection indicator '*' (count == -1).
    lines.push({ text: `${sel[8]} * ${alreadyused ? 'done' : 'do nothing'}` });
    // add_menu width convention: cw.maxcol = max(str.length + 2), vs "(end) ".
    let maxcol = '(end) '.length;
    for (const ln of lines) maxcol = Math.max(maxcol, ln.text.length + 2);
    draw_corner_window(lines, maxcol, '(end)', 1);
}

// Reproduce C's add_to_container() content chain (mkobj.c) on shallow display
// copies WITHOUT mutating the real objects: each object is prepended to the
// head of the list and merged into an existing mergable stack when possible.
// This yields the same cobj ordering C holds, so sortloot's stable-by-index
// tiebreak (e.g. "2 jackal corpses" before "a jackal corpse") lands
// identically.  (The live cobj chain stays in creation/push order because the
// force-lock chest-destruction path elsewhere depends on that ordering.)
function container_display_stacks(box) {
    const stacks = [];
    for (const o of (box.cobj || [])) {
        let hit = null;
        for (const s of stacks) if (mergable(s, o)) { hit = s; break; }
        if (hit) hit.quan = (hit.quan || 1) + (o.quan || 1);
        else stacks.unshift({ ...o });
    }
    return stacks;
}

// C ref: end.c container_contents(box, FALSE, FALSE, TRUE) + win/tty
// process_text_window().  Render "Contents of <box>:", a blank line, then the
// sorted content stacks (each with two leading spaces), as a corner window with
// a "--More--" footer.  Sets cknown (we're looking at the contents now).
function render_container_contents(box) {
    box.cknown = 1;
    const name = `the ${box_basename(box.otyp)}`;
    const lines = [{ text: `Contents of ${name}:` }, { text: '' }];
    // sortflags mirror the default options (sortloot=loot, sortpack=on).
    const sorted = sortloot(container_display_stacks(box), SORTLOOT_LOOT | SORTLOOT_PACK, false, null);
    for (const sli of sorted) {
        if (!sli.obj) break;
        lines.push({ text: '  ' + obj_doname(sli.obj) });
    }
    // putstr width convention: cw.maxcol = max(str.length + 1).
    let maxcol = 0;
    for (const ln of lines) maxcol = Math.max(maxcol, ln.text.length + 1);
    draw_corner_window(lines, maxcol, '--More--', 0);
}

// C ref: pickup.c use_container().  Loot an unlocked, untrapped floor container.
// Loops the in/out menu: ':' shows the contents (costs a turn to gain the info),
// 'q'/ESC quits.  The take-out ('o'/'b') and put-in ('i'/'r'/'s') actions are
// not yet modelled — selecting them ends the loop without moving items, which
// leaves the container state untouched (no false RNG/screen divergence).
// Returns 1 (ECMD_TIME) iff the command elapsed a turn, else 0.
async function use_container(box, more_containers) {
    let used = 0;
    box.lknown = 1;
    // C ref: use_container() outmaybe = outokay || !cknown — the take-out
    // choices ('o'/'b') still appear for a container whose contents aren't
    // known yet, even if it turns out to be empty; only a container already
    // known-empty (cknown && !Has_contents) hides them.
    const outmaybe = !!(box.cobj && box.cobj.length) || !box.cknown;
    const inv = Array.isArray(game.invent) ? game.invent : [];
    // inokay: hero carries anything besides the container itself (the box is on
    // the floor, so any inventory qualifies).
    const inokay = inv.length > 0;
    let c = 'q';
    for (;;) { // repeats iff ':' (look inside) gets chosen
        render_in_or_out_menu(box, outmaybe, inokay, used !== 0, !!more_containers);
        const key = await nhgetch();
        const ch = (key === 27) ? '\x1b' : String.fromCharCode(key);
        if (ch === ':') {
            if (!box.cknown) used = 1; // gaining info costs a turn
            render_container_contents(box);
            await nhgetch(); // --More-- (any key dismisses)
            continue;
        }
        // ':' loops; anything else (a valid action, 'q', or ESC) ends the menu.
        c = (ch === '\x1b') ? 'q' : ch;
        break;
    }
    // Map the chosen accelerator back to the canonical loot action.  The menu is
    // rendered with the same accelerators (lootabc's a/b/c/d/e or the mnemonic
    // o/i/b/r/s), and the picked slot maps to lootchars[slot].  C ref: pickup.c
    // in_or_out_menu() return -> use_container() c.
    const sel = game?.flags?.lootabc ? '_:abcdenq' : '_:oibrsnq';
    const lootchars = '_:oibrsnq';
    const idx = sel.indexOf(c);
    const action = idx >= 1 ? lootchars[idx] : 'q';
    // loot_out: 'o' (take out), 'b'/'r' (both) — only the take-out portion is
    // modelled; the put-in half stays a no-op.  C ref: use_container() loot_out.
    const loot_out = (action === 'o' || action === 'b' || action === 'r');
    if (loot_out) {
        if (box.cobj && box.cobj.length) {
            if (await menu_loot_out(box)) used = 1;
        } else {
            // C ref: use_container() — Has_contents() false: pline1(emptymsg)
            // ("The <box> is empty."); gaining that info costs a turn the first
            // time (cknown was false), then cknown is set.
            if (!box.cknown) used = 1;
            await pline(`The ${box_basename(box.otyp)} is empty.`);
            box.cknown = 1;
        }
    }
    delete game._modal_screen;
    return used ? 1 : 0;
}

// C ref: options.c def_inv_order[] — the default packorder (sortpack) sequence
// used to group objects by class in loot/inventory menus.
const DEFAULT_INV_ORDER = [12, 5, 2, 3, 7, 9, 10, 8, 4, 11, 6, 13, 14, 15, 16];

// process_menu_window auto-accelerator advance: 'a'..'z' then 'A'..'Z'.
function nextMenuCh(ch) {
    if (ch === 'z') return 'A';
    if (ch === 'Z') return 'a';
    return String.fromCharCode(ch.charCodeAt(0) + 1);
}

// A PICK_ANY menu item line: "<accel> <sel> <text>", where the selection
// indicator is '-' (off) or '+' (on; C uses '#' for a counted pick, not reached
// here).  C ref: wintty.c tty_add_menu "%c - " + set_item_state.
function menuItemLine(it) {
    return `${it.letter} ${it.selected ? '+' : '-'} ${it.desc}`;
}

// C ref: mkobj.c add_to_container() merges compatible stacks as items are placed;
// the JS container fill leaves them separate.  Fold mergeable stacks (e.g. two
// gold piles) so the item menu and take-out messages present one stack per type.
function consolidate_container(box) {
    const src = box.cobj || [];
    const out = [];
    for (const o of src) {
        let hit = null;
        for (const s of out) if (mergable(s, o)) { hit = s; break; }
        if (hit) { hit.quan = (hit.quan || 1) + (o.quan || 1); hit.owt = weight(hit); }
        else out.push(o);
    }
    box.cobj = out;
}

// Shared PICK_ANY selection loop for the loot menus.  Renders the current
// selection state, reads one key, applies a menu command (invert/select/deselect
// all) or toggles the matching accelerator, and repeats until <return>/space
// (confirm) or ESC (cancel).  Returns the selected items, or null on cancel.
// C ref: wintty.c process_menu_window() + set_all/unset_all/invert_all with the
// default menuinvertmode 1 (SKIPINVERT entries never bulk-select, only deselect).
async function run_pickany_menu(items, buildLines) {
    // menuitem_invert_test(mode 0) under menuinvertmode 1: non-SKIPINVERT items
    // always toggle; SKIPINVERT items toggle only when already selected.
    const invert_ok = (it) => !it.skipinvert || it.selected;
    for (;;) {
        const lines = buildLines();
        let maxcol = '(end) '.length;
        for (const ln of lines) maxcol = Math.max(maxcol, ln.text.length + 2);
        draw_corner_window(lines, maxcol, '(end)', 1);
        const key = await nhgetch();
        if (key === 27) return null;             // ESC: cancel
        if (key === 13 || key === 10) break;     // <return>: confirm
        const ch = String.fromCharCode(key);
        if (ch === ' ') break;                   // single-page: space confirms
        if (ch === '@') {                        // menu_invert_all
            for (const it of items) if (invert_ok(it)) it.selected = !it.selected;
            continue;
        }
        if (ch === '.') {                        // menu_select_all
            for (const it of items) if (!it.skipinvert) it.selected = true;
            continue;
        }
        if (ch === '-') {                        // menu_deselect_all
            for (const it of items) it.selected = false;
            continue;
        }
        const hit = items.find((it) => it.letter === ch);
        if (hit) hit.selected = !hit.selected;   // accelerator toggle
        // any other key: ignored (PICK_ANY keeps waiting)
    }
    return items.filter((it) => it.selected);
}

// C ref: pickup.c query_category() for menustyle:Full — the "Take out what type
// of objects?" class-filter menu.  Returns the picked tokens ('A' auto, 'ALL'
// all-types, or oclass numbers / 'B'/'C'/'U'/'X' BUC classes), or null on ESC.
async function query_category_take_out(box) {
    const cobj = box.cobj || [];
    const order = game?.flags?.inv_order || DEFAULT_INV_ORDER;
    const presentClasses = order.filter((oc) => cobj.some((o) => o.oclass === oc));
    const ccount = presentClasses.length;

    // C count_buc(): gold counts as Uncursed (or Unknown when goldX), other
    // items by bknown/blessed/cursed.
    const goldX = !!(game?.flags?.goldX);
    const bucCount = (type) => {
        let n = 0;
        for (const o of cobj) {
            if (o.oclass === COIN_CLASS) { if (type === (goldX ? 'X' : 'U')) n++; continue; }
            const actual = !o.bknown ? 'X' : o.blessed ? 'B' : o.cursed ? 'C' : 'U';
            if (actual === type) n++;
        }
        return n;
    };
    const do_blessed = bucCount('B') > 0, do_cursed = bucCount('C') > 0;
    const do_uncursed = bucCount('U') > 0, do_unknown = bucCount('X') > 0;
    const anyBUC = do_blessed || do_cursed || do_uncursed || do_unknown;
    const num_buc_types = [do_blessed, do_cursed, do_uncursed, do_unknown].filter(Boolean).length;

    // C query_category(): "no point in actually showing a menu for a single
    // category" — when the container holds exactly one object class (and no
    // unpaid items / ambiguous BUC split), silently pick that class without
    // drawing the type-selection menu at all.
    if (ccount === 1 && count_unpaid(cobj) === 0 && num_buc_types <= 1) {
        return [presentClasses[0]];
    }
    const show_a = ccount > 1; // ALL_TYPES entry only when >1 class

    const items = []; // {letter, token, skipinvert, selected, desc}
    items.push({ letter: 'A', token: 'A', skipinvert: true, selected: false,
                 desc: 'Auto-select every relevant item' });
    if (show_a) items.push({ letter: 'a', token: 'ALL', skipinvert: true, selected: false,
                             desc: 'All types' });
    let invlet = 'b';
    for (const oc of presentClasses) {
        items.push({ letter: invlet, token: oc, skipinvert: false, selected: false,
                     desc: let_to_name(oc, false, false) });
        invlet = nextMenuCh(invlet);
    }
    if (do_blessed) items.push({ letter: 'B', token: 'B', skipinvert: true, selected: false, desc: 'Items known to be Blessed' });
    if (do_cursed) items.push({ letter: 'C', token: 'C', skipinvert: true, selected: false, desc: 'Items known to be Cursed' });
    if (do_uncursed) items.push({ letter: 'U', token: 'U', skipinvert: true, selected: false, desc: 'Items known to be Uncursed' });
    if (do_unknown) items.push({ letter: 'X', token: 'X', skipinvert: true, selected: false, desc: 'Items of unknown Bless/Curse status' });

    const buildLines = () => {
        const lines = [{ text: 'Take out what type of objects?', attr: ATR_INVERSE }, { text: '' }];
        let k = 0;
        lines.push({ text: menuItemLine(items[k++]) }); // 'A'
        // The hint always shows (cmdassist defaults On); C: A_first_hint/cmdassist.
        lines.push({ text: '    (ignored unless some other choices are also picked)' });
        lines.push({ text: '' });
        if (show_a) lines.push({ text: menuItemLine(items[k++]) });         // 'a'
        for (let c = 0; c < presentClasses.length; c++) lines.push({ text: menuItemLine(items[k++]) });
        if (anyBUC) lines.push({ text: '' });                              // blank before B/C/U/X
        for (; k < items.length; k++) lines.push({ text: menuItemLine(items[k]) });
        return lines;
    };

    const picked = await run_pickany_menu(items, buildLines);
    if (picked === null) return null;
    return picked.map((it) => it.token);
}

// C ref: pickup.c query_objlist() (via menu_loot) — the "Take out what?" item
// menu, grouped by class with inverse headings.  Gold takes the '$' accelerator;
// the rest auto-letter a,b,c...  Returns the chosen objects (menu order), or null
// on ESC.
async function query_objlist_take_out(box, allow) {
    const cobj = box.cobj || [];
    const items = [];      // {letter, obj, selected, skipinvert, desc}
    const linePlan = [];   // {type:'header'|'item', ...}
    let menu_ch = 'a', first = true;
    // C ref: pickup.c query_objlist() sortflags = INVORDER_SORT with the
    // default sortloot='loot'/sortpack=on options -> sortloot(SORTLOOT_LOOT |
    // SORTLOOT_PACK) — group by class in packorder, alphabetized within class
    // (not raw cobj/creation order).
    const sorted = sortloot(cobj, SORTLOOT_LOOT | SORTLOOT_PACK, false, allow);
    let curClass = null;
    for (const sli of sorted) {
        if (!sli.obj) break;
        const o = sli.obj;
        if (o.oclass !== curClass) {
            curClass = o.oclass;
            linePlan.push({ type: 'header', text: let_to_name(curClass, false, false) });
        }
        let letter;
        if (first && o.oclass === COIN_CLASS) letter = '$';        // C: first && COIN -> '$'
        else { letter = menu_ch; menu_ch = nextMenuCh(menu_ch); }
        first = false;
        const it = { letter, obj: o, selected: false, skipinvert: false, desc: obj_doname(o) };
        items.push(it);
        linePlan.push({ type: 'item', item: it });
    }
    const buildLines = () => {
        const lines = [{ text: 'Take out what?', attr: ATR_INVERSE }, { text: '' }];
        for (const p of linePlan) {
            if (p.type === 'header') lines.push({ text: p.text, attr: ATR_INVERSE });
            else lines.push({ text: menuItemLine(p.item) });
        }
        return lines;
    };
    const picked = await run_pickany_menu(items, buildLines);
    if (picked === null) return null;
    return picked.map((it) => it.obj);
}

// C ref: pickup.c menu_loot(retry=0, put_in=FALSE) for menustyle:Full — pick the
// object classes ("Take out what type of objects?"), then the items ("Take out
// what?"), then out_container() each.  Returns the number removed (>0 => a turn
// elapsed).
async function menu_loot_out(box) {
    consolidate_container(box);

    const picks = await query_category_take_out(box);
    if (!picks || picks.length === 0) return 0;

    let autopick = false, all_categories = false;
    const validClasses = new Set();
    for (const p of picks) {
        if (p === 'A') autopick = true;
        else if (p === 'ALL') all_categories = true;
        else if (typeof p === 'number') validClasses.add(p);
        // 'B'/'C'/'U'/'X' BUC filters are not reached by the recorded sessions;
        // treat them as no additional class filter (fall through to item menu).
    }
    const allow = (autopick || all_categories)
        ? () => true
        : (o) => validClasses.has(o.oclass);

    let chosen;
    if (autopick) {
        chosen = (box.cobj || []).filter(allow);
    } else {
        chosen = await query_objlist_take_out(box, allow);
        if (chosen === null) return 0; // ESC cancelled
    }
    if (!chosen.length) return 0;

    // Take-out messages page with --More-- over the MAP (not the menu), so drop
    // the corner-menu overlay and start the topline fresh.  C ref: out_container
    // -> pickup_prinv -> prinv -> pline (update_topl accumulation + more()).
    delete game._modal_screen;
    game._pending_message = '';
    game._toplin = 0;
    let n = 0;
    for (const obj of chosen) {
        const i = (box.cobj || []).indexOf(obj);
        if (i < 0) continue;
        const count = obj.quan;
        box.cobj.splice(i, 1);
        obj.where = 'free';
        box.owt = weight(box);
        const otmp = addinv(obj);
        await report_merge_discovery();
        // No encumbrance change here, so pickup_prinv's load prefix is absent.
        // prinv() formats "<letter> - <name>." into _pending_message; capture it
        // and feed update_topl so successive lines accumulate / page correctly.
        const acc = game._pending_message;
        prinv(null, otmp, count);
        const line = game._pending_message;
        game._pending_message = acc;
        await update_topl(line);
        n++;
    }
    return n;
}

// C ref: lock.c autokey(opening=TRUE) — pick an unlocking tool from inventory:
// skeleton key, else lock pick, else credit card.  (The quest-artifact
// preference ordering is irrelevant for the starter inventory.)
function autokey_unlock() {
    const inv = Array.isArray(game.invent) ? game.invent : [];
    let key = null, pick = null, card = null;
    for (const o of inv) {
        if (o.otyp === SKELETON_KEY && !key) key = o;
        else if (o.otyp === LOCK_PICK && !pick) pick = o;
        else if (o.otyp === CREDIT_CARD && !card) card = o;
    }
    return key || pick || card || null;
}

// C ref: lock.c lock_action() — the "-ing" phrase naming the current lock
// activity, chosen from the target's state and the tool.  A locked box picked
// with a lock pick / credit card yields "picking the lock".
function lock_action(xl) {
    const box = xl.box;
    if (box && !box.olocked)
        return box.otyp === CHEST_OTYP ? 'locking the chest' : 'locking the box';
    if (xl.picktyp === LOCK_PICK || xl.picktyp === CREDIT_CARD)
        return 'picking the lock';
    if (box)
        return box.otyp === CHEST_OTYP ? 'unlocking the chest' : 'unlocking the box';
    return 'picking the lock';
}

// C ref: lock.c pick_lock() — the autounlock box branch (rx/container supplied,
// so no direction prompt).  Under the default AUTOUNLOCK_APPLY_KEY it prompts
// "Unlock it with <yname(tool)>?" and, on 'y', sets up the lock-picking
// occupation.  The success chance (box branch): LOCK_PICK 4*DEX+25*rogue,
// SKELETON_KEY 75+DEX, CREDIT_CARD DEX+20*rogue, halved if the box is cursed.
// Returns 1 (PICKLOCK_DID_SOMETHING, occupation started) on 'y', else 0
// (PICKLOCK_DID_NOTHING, declined -> no time passes).
async function pick_lock_box(pick, box) {
    const picktyp = pick.otyp;
    // yname(uncursed lock pick) -> "your lock pick"; skeleton key -> "your key".
    const toolname = picktyp === LOCK_PICK ? 'your lock pick'
                   : picktyp === SKELETON_KEY ? 'your key'
                   : picktyp === CREDIT_CARD ? 'your credit card'
                   : 'your tool';
    // ynq(): the "Hmmm... turns out to be locked." topline is still pending, so
    // it is paged with --More-- before the prompt is drawn.
    game._yn_need_more = true;
    const c = await y_n(`Unlock it with ${toolname}?`, 'ynq\x1b', 'q');
    if (c !== 'y')
        return 0; // PICKLOCK_DID_NOTHING (c == 'q'/'n'/ESC)

    const isRogue = (game.urole?.mnum === PM_ROGUE);
    let ch;
    switch (picktyp) {
    case CREDIT_CARD:  ch = ACURR(A_DEX) + 20 * (isRogue ? 1 : 0); break;
    case LOCK_PICK:    ch = 4 * ACURR(A_DEX) + 25 * (isRogue ? 1 : 0); break;
    case SKELETON_KEY: ch = 75 + ACURR(A_DEX); break;
    default:           ch = 0;
    }
    if (box.cursed) ch = Math.trunc(ch / 2);

    // C: svc.context.move = 0; gx.xlock.{box,chance,picktyp,usedtime,magic_key}.
    // The move loop then runs picklock() each turn (do_occupation).
    game.xlock = {
        box,
        door: null,
        chance: ch,
        picktyp,
        usedtime: 0,
        magic_key: false, // is_magic_key(): a plain lock pick is not the MKoT
    };
    game._picklock_box = box;
    return 1; // PICKLOCK_DID_SOMETHING — a turn elapses
}

// C ref: pickup.c doloot()/do_loot_cont().  Floor container under the hero:
// locked -> announce the lock, then attempt the default autounlock
// (AUTOUNLOCK_APPLY_KEY): pick an unlocking tool and run pick_lock(); unlocked
// -> use_container().
async function doloot() {
    const box = floor_box_here();
    if (!box) {
        // C: "You don't find anything here to loot." (ECMD_TIME elsewhere, but
        // the simple no-container case the sessions might hit prints this).
        await pline("You don't find anything here to loot.");
        return 0;
    }
    if (box.olocked) {
        const name = box_basename(box.otyp);
        if (box.lknown) await pline(`The ${name} is locked.`);
        else await pline(`Hmmm, the ${name} turns out to be locked.`);
        box.lknown = 1;
        // flags.autounlock defaults to AUTOUNLOCK_APPLY_KEY: find an unlocking
        // tool (autokey) and, if one is carried, attempt pick_lock() at the
        // hero's square (coords supplied -> no direction prompt).
        const unlocktool = autokey_unlock();
        if (unlocktool) {
            const r = await pick_lock_box(unlocktool, box);
            return r ? 1 : 0;
        }
        // no unlocking tool -> nothing further; no time passes.
        return 0;
    }
    box.lknown = 1;
    return await use_container(box, false);
}

// C ref: lock.c picklock() — the lock-picking occupation, run each turn from the
// move loop (do_occupation).  Returns 1 while still busy (keep the occupation),
// 0 when finished (success, give-up, or the box/hero moved).
export async function picklock() {
    const u = game.u;
    const xl = game.xlock;
    if (!xl || !xl.box) { game._picklock_box = null; game.xlock = null; return 0; }

    // you or the box moved -> abort (usedtime = 0), no message.
    if (xl.box.where !== 'floor' || xl.box.ox !== u.ux || xl.box.oy !== u.uy) {
        game._picklock_box = null; game.xlock = null; return 0;
    }
    // give-up check (usedtime >= 50 || nohands).  The starter hero has hands.
    if (xl.usedtime++ >= 50) {
        await update_topl(`You give up your attempt at ${lock_action(xl)}.`);
        exercise(A_DEX, true); // even if you don't succeed
        game._picklock_box = null; game.xlock = null; return 0;
    }

    // rn2(100) >= chance -> still busy (re-roll next turn).  C ref: lock.c:98.
    if (rn2(100) >= xl.chance)
        return 1;

    // (The Master-Key-of-Thievery trap-disarm branch is skipped: a plain lock
    // pick is not a magic key and the starter box is untrapped.)

    await pline(`You succeed in ${lock_action(xl)}.`);
    xl.box.olocked = !xl.box.olocked;
    xl.box.lknown = 1;
    // if (xl.box.otrapped) chest_trap(...) — chest traps are not modeled; the
    // starter box is untrapped so this path is inert.
    exercise(A_DEX, true); // -> rn2(19)
    game._picklock_box = null;
    game.xlock = null;
    return 0; // usedtime = 0
}

// C ref: lock.c doforce().  Scoped to the recorded path: a forceable weapon
// (the dwarvish spear is a blunt/non-blade weapon -> picktyp 0), a single
// locked floor box.  Prompts "There is <a locked box> here; force its lock?
// [ynq] (q)"; on 'y' announces "You start bashing it with <your weapon>." and
// begins the forcelock occupation (which elapses game turns via the move loop).
async function doforce() {
    const uwep = game.uwep;
    // u_have_forceable_weapon(): a wielded weapon/weapon-tool that isn't purely
    // for cutting.  The recorded hero wields a dwarvish spear (a weapon).
    if (!uwep || uwep.oclass !== 2 /*WEAPON_CLASS*/) {
        await pline("You can't force anything without a proper weapon.");
        return 0;
    }
    const box = floor_lockbox_here();
    if (!box) {
        await pline('You decide not to force the issue.');
        return 1;
    }
    if (box.obroken || !box.olocked) {
        const name = box_basename(box.otyp);
        await pline(`There is a ${name} here, but its lock is already ${box.obroken ? 'broken' : 'unlocked'}.`);
        box.lknown = 1;
        await pline('You decide not to force the issue.');
        return 1;
    }
    // safe_qbuf: doname(locked box) -> "a locked <box>".
    const name = box_basename(box.otyp);
    box.lknown = 1;
    const c = await yn_function(`There is a locked ${name} here; force its lock?`, 'ynq', 'q');
    if (c === 'q') return 0;
    if (c === 'n') {
        await pline('You decide not to force the issue.');
        return 1;
    }
    // 'y': non-blade weapon -> bashing.  C: "You start bashing it with <yname>."
    // yname(uwep) -> "your dwarvish spear" (single, uncursed-known not shown).
    // update_topl (not plain pline) so the message is left in NEED_MORE state —
    // the forcelock occupation's first message then pages it with "--More--".
    await update_topl(`You start bashing it with ${force_yname(uwep)}.`);
    // Begin the forcelock occupation (set_occupation(forcelock,...)).  C ref:
    // lock.c doforce(): picktyp = is_blade(uwep) && !is_pick(uwep) (0 for a
    // spear/blunt weapon -> bashing); chance = objects[uwep->otyp].oc_wldam * 2;
    // usedtime = 0.  The forcelock() occupation then runs each turn from the
    // move loop (do_occupation), which checks rn2(100) >= chance.
    const picktyp = 0; // dwarvish spear: not a blade -> blunt bash path
    game.xlock = {
        box,
        chance: oc_wldam(uwep.otyp) * 2,
        picktyp,
        usedtime: 0,
        magic_key: false,
    };
    game._force_box = box;
    return 1; // ECMD_TIME — a turn elapses (the move loop advances monsters)
}

// yname for the wielded weapon in the force message: "your <weapon>".  The
// base type name comes from the objects table (objclass.h oc_name).
function force_yname(uwep) {
    const nm = (uwep != null && objects[uwep.otyp]?.name) || 'weapon';
    return `your ${nm}`;
}

// C ref: mon.c wake_nearby(FALSE) -> wake_nearto_core(u.ux, u.uy, ulevel*20,
// FALSE).  Wakes nearby monsters without angering them: clears msleeping and the
// 'meditation' STRAT_WAITMASK strategy.  No RNG.  (wake_msg prints "X wakes up."
// only for a *sleeping*, visible monster; the goblin here is already awake.)
function wake_nearby_force() {
    const u = game.u;
    if (!u) return;
    const dist = (u.ulevel || 1) * 20;
    const dist2 = (x1, y1, x2, y2) => (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
    for (const mtmp of (game.level?.monsters || [])) {
        if (mtmp.mhp != null && mtmp.mhp <= 0) continue;
        if (dist === 0 || dist2(mtmp.mx, mtmp.my, u.ux, u.uy) < dist) {
            mtmp.msleeping = 0;
            // wake 'meditation' (STRAT_WAITMASK) unless G_UNIQ; the starter
            // goblin/sewer rat are not unique.  mstrategy isn't otherwise
            // modelled; clearing a wait flag if present is harmless.
            if (mtmp.mstrategy != null) mtmp.mstrategy &= ~0x00ff0000; /* STRAT_WAITMASK */
        }
    }
}

// C ref: lock.c chest_shatter_msg(otmp) — the message when a forced-open chest's
// contents are destroyed.  The disposition depends on oc_material; a spellbook
// (PAPER) "is torn to shreds".  The name is the *blind* (unidentified) singular,
// e.g. "spellbook".  Potions instead announce "You see a <potion> shatter!".
// C ref: objclass.h material enum — WAX=2 VEGGY=3 FLESH=4 PAPER=5 WOOD=8 GLASS=19.
const MAT_WAX = 2, MAT_VEGGY = 3, MAT_FLESH = 4, MAT_PAPER = 5, MAT_WOOD = 8, MAT_GLASS = 19;
function chest_shatter_disposition(material) {
    switch (material) {
    case MAT_PAPER: return 'is torn to shreds';
    case MAT_WAX:   return 'is crushed';
    case MAT_VEGGY: return 'is pulped';
    case MAT_FLESH: return 'is mashed';
    case MAT_GLASS: return 'shatters';
    case MAT_WOOD:  return 'splinters to fragments';
    default:        return 'is destroyed';
    }
}
async function chest_shatter_msg(otmp) {
    const ocl = objects[otmp.otyp];
    // Blind/unidentified singular name (HBlinded=1 in C): a spellbook of an
    // undiscovered type reads simply "spellbook".
    let thing;
    if (otmp.oclass === 10 /*SPBOOK_CLASS*/) thing = 'spellbook';
    else if (otmp.oclass === 8 /*POTION_CLASS*/) thing = 'potion';
    else if (otmp.oclass === 9 /*SCROLL_CLASS (objclass.h); 7 is FOOD_CLASS*/) thing = 'scroll';
    else thing = ocl?.name || 'object';
    const disposition = chest_shatter_disposition(ocl?.material);
    // An()/An(thing): capitalised indefinite article.
    const an = /^[aeiou]/i.test(thing) ? 'An' : 'A';
    await update_topl(`${an} ${thing} ${disposition}!`);
}

// C ref: lock.c breakchestlock(box, destroyit) — destroy-it path only (the
// forcelock success on a non-blade weapon with !rn2(3)).  Spills the contents at
// the hero's feet; each non-potion item has a 1/3 chance (and every potion) of
// being destroyed (chest_shatter_msg), the rest land on the floor.  No shop on
// the starting level, so no costly_alteration.  C ref: lock.c:172-211.
async function breakchestlock(box, destroyit) {
    await update_topl(`In fact, you've totally destroyed the ${box_basename(box.otyp)}.`);
    const contents = box.cobj || [];
    box.cobj = [];
    for (const otmp of contents) {
        const isPotion = otmp.oclass === 8 /*POTION_CLASS*/;
        if (!rn2(3) || isPotion) {
            await chest_shatter_msg(otmp);
            // single-quantity item is freed (destroyed); no shop loss here.
            if (otmp.quan === 1) {
                continue; // obfree: gone
            }
            // multi-quantity: useup one, the rest fall to the floor.
            otmp.quan -= 1;
            otmp.owt = weight(otmp);
        }
        place_object(otmp, game.u.ux, game.u.uy);
        stackobj(otmp);
    }
    delobj(box);
}

// C ref: lock.c forcelock() — the #force occupation, run each turn from the move
// loop.  Returns 1 while still busy (keep the occupation), 0 when finished.
export async function forcelock() {
    const u = game.u;
    const xl = game.xlock;
    if (!xl || !xl.box) { game._force_box = null; game.xlock = null; return 0; }

    // you or the box moved -> abort (usedtime = 0).
    if (xl.box.ox !== u.ux || xl.box.oy !== u.uy) {
        game._force_box = null; game.xlock = null; return 0;
    }
    // give-up check (usedtime >= 50 || no weapon).
    if (xl.usedtime++ >= 50 || !game.uwep) {
        await update_topl('You give up your attempt to force the lock.');
        if (xl.usedtime >= 50) exercise(xl.picktyp ? A_DEX : A_STR, true);
        game._force_box = null; game.xlock = null; return 0;
    }

    if (xl.picktyp) {
        // blade path not exercised by the recorded sessions (dwarvish spear is
        // blunt); fall through would need rn2(1000-...) here.
    } else {
        wake_nearby_force(); // blunt weapon: hammering wakes nearby monsters.
    }

    // rn2(100) >= chance -> still busy.  C ref: lock.c:244.
    if (rn2(100) >= xl.chance) return 1;

    await update_topl('You succeed in forcing the lock.');
    exercise(xl.picktyp ? A_DEX : A_STR, true); // -> rn2(19)
    // breakchestlock(box, !picktyp && !rn2(3)).  C ref: lock.c:252.
    const destroyit = !xl.picktyp && !rn2(3);
    await breakchestlock(xl.box, destroyit);
    game._force_box = null;
    game.xlock = null;
    return 0;
}

// ── #overview (C ref: dungeon.c dooverview()/show_overview(), win/tty/wintty.c
// process_menu_window's H2344_BROKEN corner-menu layout) ──
//
// Renders the plain-text (non-selectable) overview menu at the corner offset,
// waits for the dismissal key, then restores the screen the menu covered.
function render_overview_menu(lines) {
    const disp = game?.nhDisplay;
    if (!disp?.setCell) return;
    const cols = disp.cols || 80;
    let maxcol = '(end) '.length;
    for (const l of lines) maxcol = Math.max(maxcol, l.text.length + 2);
    let offx = Math.min(Math.min(82, Math.floor(cols / 2)), cols - maxcol - 1);
    if (offx < 0) offx = 0;
    const textCol = offx + 1;
    // The message window (row 0) is cleared in full when the menu is raised.
    for (let c = 0; c < cols; c++) disp.setCell(c, 0, ' ', NO_COLOR, 0);
    const moreRow = lines.length;
    for (let r = 0; r <= moreRow; r++) {
        for (let c = offx; c < cols; c++) disp.setCell(c, r, ' ', NO_COLOR, 0);
    }
    for (let r = 0; r < lines.length; r++) {
        disp.putstr(textCol, r, lines[r].text, NO_COLOR, lines[r].attr || 0);
    }
    disp.putstr(textCol, moreRow, '(end)', NO_COLOR, 0);
    // C dmore: cursor parked at offx + strlen("(end) ") + 2 = textCol + 6.
    disp.setCursor(textCol + 6, moreRow);
}

// C ref: dungeon.c dooverview() -> show_overview(0, 0) -> select_menu(win,
// PICK_NONE, ...): a plain display, dismissed by ESC/space/return (tty
// dismissal keys for a finished, non-counting menu).  Afterwards
// tty_dismiss_nhwindow()'s corner-menu path (docorner) repaints the area the
// menu covered with the real map/status; flush_screen(1) reproduces that.
export async function dooverview() {
    await show_overview_disclosure(0, 0);
    return 0;
}

// C ref: end.c disclose() 'o' query -> show_overview((how>=PANICKED)?1:2, how).
// Same corner-menu rendering as the live command, just with build_overview_lines'
// `final`/`how` params threaded through so it lists every visited level and
// (for a real death) appends the "Final resting place for you, ..." lines.
export async function show_overview_disclosure(final, how) {
    const lines = build_overview_lines(final, how);
    if (!lines.length) return;
    render_overview_menu(lines);
    for (;;) {
        const key = await nhgetch();
        if (key === 27 || key === 13 || key === 10 || key === 32) break;
    }
    await flush_screen(1);
}

// Map extcmdlist index -> handler.  Unimplemented commands fall through to
// a no-op (no message), which keeps RNG/state untouched.
const HANDLERS = {
    adjust: doorganize_extcmd,
    annotate: donamelevel,
    jump: dojump,
    levelchange: wiz_level_change,
    twoweapon: dotwoweapon,
    pray: dopray,
    chat: dochat,
    name: docallcmd,
    call: docallcmd,
    ride: doride,
    loot: doloot,
    force: doforce,
    wizwish: wiz_wish,
    enhance: doenhance,
    rub: dorub_extcmd,
    wipe: dowipe_extcmd,
    sit: dosit,
    dip: dodip,
    offer: dosacrifice,
    genocided: dogenocided,
    chronicle: do_gamelog,
    conduct: doconduct,
    wizgenesis: wiz_genesis,
    overview: dooverview,
    version: doextversion,
    quit: doquit_extcmd,
    polyself: wiz_polyself,
    monster: domonability_extcmd,
};

// C ref: cmd.c domonability() return convention — ECMD_OK(0)/ECMD_TIME(1);
// the extcmd dispatcher's turn convention already treats non-1 as "no turn",
// so this is a direct pass-through (kept as its own wrapper only so the
// HANDLERS table above reads the same way as its neighbors).
async function domonability_extcmd() {
    return await domonability();
}

// C ref: end.c done2() — '#quit'.  Implemented in end.js (it shares state/
// helpers with done()/disclose()); dynamic import matches this file's
// existing pattern for the other end.js-adjacent commands.
async function doquit_extcmd() {
    const { doquit } = await import('./end.js');
    return await doquit();
}

// C ref: apply.c dorub()/do.c dowipe() return ECMD_* (OK=0/CANCEL=1/TIME=2).
// The extcmd dispatcher's turn convention is "return 1 -> a turn elapses", so
// translate ECMD_TIME into 1 (turn) and everything else into 0 (no turn).
async function dorub_extcmd() {
    const res = await dorub();
    return res === APPLY_ECMD.ECMD_TIME ? 1 : 0;
}
async function doorganize_extcmd() {
    await doorganize();
    return 0;
}
async function dowipe_extcmd() {
    const res = await dowipe();
    return res === APPLY_ECMD.ECMD_TIME ? 1 : 0;
}

// C ref: cmd.c doextcmd().  '#' entry: read an extended command name and
// dispatch it.
export async function doextcmd() {
    const idx = await tty_get_ext_cmd();
    if (idx < 0) {
        game.context.move = 0;
        return 0;
    }
    const txt = EXTCMDLIST[idx][0];
    const fn = HANDLERS[txt];
    let res = 0;
    if (fn) {
        res = await fn();
    }
    // C ref: doextcmd returns the command's ECMD_* result; ECMD_TIME (1)
    // makes the move loop advance a turn.  Commands we don't model return 0.
    game.context.move = res === 1 ? 1 : 0;
    return res;
}
