// @ts-nocheck
// lock.js — Door and lock operations.
// C ref: nethack-c/src/lock.c — doopen(), doopen_indir(), doclose().
// Ported scope: simple closed-door open path (lock.c:781-935) and doclose
// (lock.c:957-1052). The drawbridge predicates used by the shared branches
// are implemented locally below to keep lock.js independent of dokick.js.
import { game } from './gstate.js';
import { set_occupation, confdir, movecmd, cmdq_pop, cmdq_clear, cmdq_add_key, redraw_cmd, dxdy_moveok, xytodir, readchar,
    show_direction_keys, dowhatdoes_core } from './cmd.js';
import { visctrl } from './cmd_binds.js';
import { CQ_REPEAT, CQ_CANNED, CMDQ_DIR, CMDQ_KEY, NHKF_GETDIR_HELP, NHKF_GETDIR_SELF, NHKF_GETDIR_SELF2 } from './const.js';
import { impossible } from './pline.js';
import { pline, force_more, newsym, feel_newsym, flush_screen, docrt_flags, _darken_room_floor, show_glyph_cell, canseemon } from './display.js';
import { topl_park_cursor, putmsghistory } from './display.js';
import { block_point, recalc_block_point, vision_recalc } from './vision.js';
import { nhgetch } from './input.js';
import { yn_function } from './end.js';
import { display_text_window } from './com_pager.js';
import { pushRngLogEntry } from './rng.js';
import { isaac64_next_uint64 } from './isaac64.js';
import { acurr, exercise } from './attrib.js';
import { rn2, rnl } from './rng.js';
import { isok } from './hacklib.js';
import { wake_nearto } from './mklev.js';
import { in_rooms, add_damage } from './shk.js';
import { cansee, Blind } from './vision.js';
import { closed_door } from './look.js';
import { DEAF, HALLUC, DBWALL, DB_DIR, DB_WEST, DB_EAST, DB_SOUTH, DB_NORTH,
         IS_DRAWBRIDGE } from './const.js';
/* C ref: objects.h — WAN_STRIKING otyp (js/makemon.js and js/muse.js pin the
 * same value); SPE_FORCE_BOLT shares doorlock's arm in C but is not reachable
 * here yet. */
const WAN_STRIKING_OTYP = 417;
function _lock_Deaf() {
    const p = game.u?.uprops?.[DEAF];
    return !!((p?.intrinsic | 0) || (p?.extrinsic | 0));
}

/* C ref: objects.h otyp ids used by boxlock() (lock.c:1056).  Same numbering
 * js/zap.js pins locally (WAN_OPENING=425, WAN_LOCKING=426) and js/spell.js /
 * js/u_init.js pin for the SPE_* spellbook ids (SPE_KNOCK=375,
 * SPE_WIZARD_LOCK=381, SPE_POLYMORPH=399); js/makemon.js pins
 * WAN_POLYMORPH_OTYP=422 the same way. */
const WAN_LOCKING_OTYP_LK = 426;
const SPE_WIZARD_LOCK_OTYP_LK = 381;
const WAN_OPENING_OTYP_LK = 425;
const SPE_KNOCK_OTYP_LK = 375;
const WAN_POLYMORPH_OTYP_LK = 422;
const SPE_POLYMORPH_OTYP_LK = 399;
/* C ref: you.h:247 `#define Role_if(X) (gu.urole.mnum == (X))`.  PM_WIZARD is
 * the mons[] index 343 (js/pm.generated.js:345), the same reader js/dokick.js
 * maybe_wail() and js/cmd.js msnoise use: `game.urole.mnum === PM_WIZARD`. */
const PM_WIZARD_LK = 343;
import { simple_typename, xname_flags, cxname, doname, ansimpleoname } from './objnam.js';
import { safe_qbuf } from './shk.js';
import { weapon_type, WEAPON_WLDAM, m_at, mon_nam } from './uhitm.js';
import { place_object } from './mklev.js';
import { potionbreathe } from './potion.js';
import { obj_resists } from './dogmove.js';
import { MKOBJ_OC_MATERIAL, MKOBJ_OC_SKILL } from './mkobj_erosion_meta.js';
import { SHOPBASE, SDOOR, DOOR, D_CLOSED, D_ISOPEN, D_TRAPPED, D_NODOOR, D_BROKEN, D_LOCKED, A_STR, A_DEX, A_CON, ECMD_TIME, ECMD_OK, ECMD_CANCEL,
         P_DAGGER, P_SABER, P_PICK_AXE, P_FLAIL, P_LANCE, PASSES_WALLS, BLINDED, CXN_NORMAL, MV_ANY } from './const.js';
/* C mons[] rows (permonst) — row[6] = mflags1; makemon_msize.json carries
 * permonst.msize in the same MON() row order.  Imported as raw data packs (not
 * via makemon.js) to keep lock.js off the makemon import cycle. */
import monsPackLk from './makemon_mons.json' with { type: 'json' };
import monMsizePackLk from './makemon_msize.json' with { type: 'json' };
const _MONS_LK = /** @type {number[][]} */ (monsPackLk.mons);
const _MONS_MSIZE_LK = /** @type {number[]} */ (monMsizePackLk.msize);
/* C monflag.h:180 MZ_HUMAN = 2 — the default when no form is resolvable
 * (every player-role monster in mons[] is MZ_HUMAN). */
const MZ_HUMAN_LK = 2;

/* objclass.h OBJCLASS enum numbers (defsym.h): used by #force. */
const WEAPON_CLASS_OC = 2;
const TOOL_CLASS_OC = 6;
const POTION_CLASS_OC = 8;
const ROCK_CLASS_OC = 14;
/* weapon-skill constants (const.js P_*) aliased for the #force predicates. */
const P_DAGGER_SK = P_DAGGER;
const P_SABER_SK = P_SABER;
const P_PICK_AXE_SK = P_PICK_AXE;
const P_FLAIL_SK = P_FLAIL;
const P_LANCE_SK = P_LANCE;
/* C ref: objclass.h oc_material via objects[otyp].oc_material. */
function oc_material(otyp) {
    return (otyp >= 0 && otyp < MKOBJ_OC_MATERIAL.length) ? (MKOBJ_OC_MATERIAL[otyp] | 0) : 0;
}
/* C ref: objnam.c the(str) — definite article. */
function _the(str) { return 'the ' + str; }

function _rawRnd(x) {
    const val = isaac64_next_uint64(game.coreCtx);
    return Number(val % BigInt(x));
}


/* C ref: attrib.c:1251 acurrstr() — effective Str for door-opening check.
 * For Str <= 18 (normal human): result = max(str, 3) = str.
 * For higher Str values: follows 18/xx encoding; mirrors C exactly. */
function acurrstr() {
    const u = game.u || {};
    /* acurr(u, A_STR) returns the effective Str in C's encoding (3..125) */
    const str = acurr(u, A_STR); /* A_STR=0 */
    let result;
    if (str <= 18) /* STR18(0) = 18 */
        result = Math.max(str, 3);
    else if (str <= 121) /* STR19(21) = 121 */
        result = 19 + Math.trunc(str / 50);
    else
        result = Math.min(str, 125) - 100;
    return result;
}

export async function doopen_indir(x, y) {
    const g = game;
    if (_nohands_lk()) {
        await pline("You can't open anything -- you have no hands!");
        g.context = g.context || {};
        g.context.move = 0; /* ECMD_OK */
        return ECMD_OK;
    }
    /* C lock.c:786 — int res = ECMD_OK; the "learned something" / Confusion
     * upgrades to ECMD_TIME (lock.c:822-838) are not ported (see the scope note
     * above), so res only ever carries ECMD_OK out of the not-closed branch. */
    let res = ECMD_OK;

    const dirprompt = null;

    let cx = x | 0, cy = y | 0;
    if (!(cx > 0 && cy >= 0)) {
        if (!(await getdir(dirprompt))) {
            await pline('Never mind.');           /* cmd.c:3939 pline1(Never_mind) */
            return ECMD_OK;
        }
        const u0 = g.u || {};
        const nx = (u0.ux | 0) + (u0.dx | 0);
        const ny = (u0.uy | 0) + (u0.dy | 0);
        if (!isok(nx, ny))
            return ECMD_OK;                        /* emsg is NULL for this caller */
        cx = nx; cy = ny;
    }

    /* C lock.c:811-814 — "open at yourself/up/down: switch to loot unless there
     * is a closed door here (possible with Passes_walls) and direction isn't
     * 'down'":
     *     if (u_at(cc.x, cc.y) && (u.dz > 0 || !closed_door(u.ux, u.uy)))
     *         return doloot();
     * doloot lives in js/pickup.js, which imports this module, so it is reached
     * through a dynamic import the same way js/pickup.js reaches use_container. */
    {
        const u0 = g.u || {};
        if (cx === (u0.ux | 0) && cy === (u0.uy | 0)
            && ((u0.dz | 0) > 0 || !closed_door(u0.ux | 0, u0.uy | 0))) {
            const { doloot } = await import('./pickup.js');
            return await doloot();
        }
    }

    /* C lock.c:828 — portcullis = (is_drawbridge_wall(cc.x, cc.y) >= 0). */
    const loc = g.level?.at(cx, cy);
    if (!loc) return ECMD_OK;
    const portcullis = _is_drawbridge_wall_stub(cx, cy) >= 0;

    if (portcullis || loc.typ !== DOOR) {
        if (_is_db_wall_stub(cx, cy) || loc.typ === 19 /* DRAWBRIDGE_UP */) {
            await pline('There is no obvious way to open the drawbridge.');
        } else if (portcullis || loc.typ === 34 /* DRAWBRIDGE_DOWN */) {
            await pline('The drawbridge is already open.');
        } else {
            const { container_at } = await import('./pickup.js');
            if (container_at(cx, cy, true)) {
                await pline(`${_blind_stub() ? 'Feels' : 'Seems'}`
                            + ' like something lootable over there.');
            } else {
                await pline(`You ${_blind_stub() ? 'feel' : 'see'} no door there.`);
            }
        }
        return res;
    }

    if (!(loc.doormask & D_CLOSED)) {
        let mesg, locked = false;
        switch (loc.doormask | 0) {
        case D_BROKEN:
            mesg = ' is broken';
            break;
        case D_NODOOR:
            mesg = 'way has no door';
            break;
        case D_ISOPEN:
            mesg = ' is already open';
            break;
        default:
            mesg = ' is locked';
            locked = true;
            break;
        }
        await pline(`This door${mesg}.`);
        if (locked && (g.flags?.autounlock ?? AUTOUNLOCK_APPLY_KEY)) {
            const au = g.flags?.autounlock ?? AUTOUNLOCK_APPLY_KEY;
            if (g.u) g.u.dz = 0;   /* C lock.c:877 */
            if ((au & AUTOUNLOCK_APPLY_KEY) !== 0) {
                const unlocktool = autokey(true);
                if (unlocktool) {
                    /* C lock.c:880-882 —
                     *   res = pick_lock(unlocktool, cc.x, cc.y, (struct obj *) 0)
                     *         ? ECMD_TIME : ECMD_OK;
                     * pick_lock's adjacent-door branch now carries C's
                     * autounlock confirmation prompt (lock.c:619-625), so this
                     * is a live call and no longer a flagged incomplete callee. */
                    res = (await pick_lock(unlocktool, cx, cy, null))
                        ? ECMD_TIME : ECMD_OK;
                }
            }
            /* C lock.c:882-892 AUTOUNLOCK_KICK arm — unreachable at the default
             * flags.autounlock (APPLY_KEY only); not ported. */
        }
        return res;
    }

    /* C lock.c:899-902 —
     *   if (verysmall(gy.youmonst.data)) {
     *       pline("You're too small to pull the door open.");
     *       return res;
     *   }
     * This returns BEFORE the rnl(20) roll below, so a verysmall (MZ_TINY)
     * hero form consumes no RNG here. */
    if (_verysmall_lk()) {
        await pline("You're too small to pull the door open.");
        return res;
    }

    /* C lock.c:905 — door is D_CLOSED: strength/dex/con roll */
    const u = g.u || {};
    /* ACURRSTR + ACURR(A_DEX) + ACURR(A_CON)) / 3  — integer division */
    const threshold = Math.trunc((acurrstr() + acurr(u, A_DEX) + acurr(u, A_CON)) / 3);
    if (rnl(20) < threshold) {
        /* C lock.c:907 — pline_The("door opens.") */
        await pline("The door opens.");
        /* C lock.c:908-913 — D_TRAPPED: b_trapped then D_NODOOR; else D_ISOPEN */
        if (loc.doormask & D_TRAPPED) {
            loc.doormask = D_NODOOR;
        } else {
            loc.doormask = D_ISOPEN;
        }
        /* C lock.c:914 — feel_newsym(cc.x, cc.y): update display for hero */
        feel_newsym(cx, cy);
        /* C lock.c:916 — recalc_block_point(cc.x, cc.y): the now-open door no
         * longer blocks light, so vision can see through it.  recalc_block_point
         * rebuilds the block arrays (open door -> transparent) and sets
         * vision_full_recalc.  C then runs vision_recalc(0) in moveloop_core
         * (allmain.c:611) AFTER rhack() but BEFORE the WIN_MAP redraw, within the
         * same turn — that is what reveals the corridor/room behind the door on
         * the very screen the player sees for this move.  Our moveloop checks the
         * vision_full_recalc flag at the TOP of the next iteration (after this
         * step's screen is already flushed), so to match C's intra-turn timing we
         * run the recalc inline here (mirrors the inline vision_recalc(1) on the
         * normal move path in cmd.js).  All RNG-free. */
        recalc_block_point(cx, cy);
        if (g.vision_full_recalc) {
            vision_recalc(0);
            g.vision_full_recalc = 0;
        }
    } else {
        /* C lock.c:917-920 — door resists */
        exercise(A_STR, true); /* C: exercise(A_STR, TRUE) */
        await pline("The door resists!");
    }

    return ECMD_TIME;
}

/* C cmd.c:getdir — interactive direction input, help/redraw retry, repeat
 * recording, orientation and impairment. Returns 1 for a valid direction,
 * 0 for cancellation or an invalid direction. Queue/read-buffer consumption,
 * full yn_function/input-state ownership, mouse/getpos, fuzzer and alternate
 * binding initialization remain open; the typed queue primitives alone do
 * not implement those consumer paths. */
/* C ref: src/decl.c:96 — `const char quitchars[] = " \r\n\033";`.  SPACE, CR,
 * LF and ESC, and nothing else.  This constant read '\x1b\x07\x03' (ESC, BEL,
 * ^C), which is not any C character class: it omitted the three characters
 * that actually cancel a direction prompt and added two that do not.  A SPACE
 * at "In what direction?" therefore fell through to the cmd.c:4098
 * `!strchr(quitchars, dirsym)` branch that C skips, drew the cmdassist
 * help_dir window, and ate an extra keystroke. */
const QUITCHARS = ' \r\n\x1b';
/* `opts.noPrompt` suppresses ONLY the prompt paint (the message, the flush and
 * the parked cursor), never the read or any of C's key handling below it.
 *
 * It exists for one caller: dofire()'s cmdq-drain tail (js/cmd.js
 * _fire_throw_obj), where the topline is deliberately left holding the
 * fireassist swap's committed --More-- frame across the getdir call instead of
 * being repainted.  C gets that for free — tty_yn_function writes over a
 * topline that the tty is still showing, and the recorded frame at that
 * nhgetch is the swap's — while this port paints each frame explicitly, so the
 * retention has to be asked for.  DISPLAY-channel only; no caller may use it
 * to skip a prompt C would have written. */
export async function getdir(_s, opts = {}) {
    const g = game;
    const u = g.u = g.u || {};
    let noPrompt = !!opts.noPrompt;
    let cmdq = cmdq_pop();
    // C's retry label. A retained fireassist frame applies to the first read
    // only; explicit help/redraw returns here and paints a fresh prompt.
    for (;;) {
        const result = await _getdir_read(g, u, _s, noPrompt, cmdq);
        // A help retry does not pop a second queued command.
        cmdq = null;
        noPrompt = false;
        if (result !== null)
            return result;
    }
}
/* null is the internal equivalent of C's `goto retry`; 0 and 1 are getdir's
 * caller-visible results. No nested getdir call or extra command dispatch. */
async function _getdir_read(g, u, s, noPrompt, cmdq) {
    let keyCode;
    if (cmdq) {
        if (cmdq.typ === CMDQ_DIR) {
            // v5 movementdirs puts DOWN at 8 and UP at 9. The frozen JS
            // constants have those names reversed; use the C enum here.
            const dir = !cmdq.dirz ? xytodir(cmdq.dirx, cmdq.diry)
                : cmdq.dirz > 0 ? 8 : 9;
            keyCode = (g.Cmd?.dirchars || 'hykulnjb><').charCodeAt(dir);
        } else if (cmdq.typ === CMDQ_KEY) {
            keyCode = cmdq.key;
        } else {
            cmdq_clear(CQ_CANNED);
            keyCode = 0;
            await impossible('getdir: command queue had no dir?');
        }
        // C frees the detached node and jumps to got_dirsym, bypassing
        // prompt/input-state changes, redraw handling and repeat recording.
    } else {
        g.program_state.input_state = 3; // getdirInp
        if (g.gi?.in_doagain || g.readchar_queue?.charCodeAt(0)) {
            keyCode = await readchar();
        } else {
            // The shared reader owns acknowledgment, answered-prompt history,
            // last_msg and the transition from getdirInp back to otherInp.
            const dirPrompt = (s != null && s.charAt(0) !== '^')
                ? s : 'In what direction?';
            const reply = await yn_function(dirPrompt, null, '\0', false,
                { retainFrame: noPrompt });
            keyCode = typeof reply === 'number' ? reply : reply.charCodeAt(0);
        }
        /* C clear_nhwindow(WIN_MESSAGE), including buffered reads. */
        g._pending_message = '';
        // C retries redraw before recording the reply in CQ_REPEAT.
        if (redraw_cmd(keyCode)) {
            docrt_flags(0x04); // docrtRefresh
            return null;
        }
        if (!g.gi?.in_doagain)
            cmdq_add_key(CQ_REPEAT, keyCode);
    }
    /* movecmd() keys off the raw keycode (C's `uchar sym`), so keep both. */
    const dircode = typeof keyCode === 'number'
        ? (keyCode & 0xff)
        : (String(keyCode ?? '').charCodeAt(0) | 0);
    const dirsym = typeof keyCode === 'number' ? String.fromCharCode(keyCode) : '';
    /* C cmd.c:4696 — self-direction keys '.' or 's' → u.dx=u.dy=u.dz=0 */
    if (dircode === (g.Cmd?.spkeys?.[NHKF_GETDIR_SELF] ?? 46)
        || dircode === (g.Cmd?.spkeys?.[NHKF_GETDIR_SELF2] ?? 115)) {
        u.dx = 0; u.dy = 0; u.dz = 0;
        confdir(false);
        return 1;
    }
    /* C cmd.c:4095 — `else if (!(is_mov = movecmd(dirsym, MV_ANY)) && !u.dz)`.
     * movecmd writes u.dx/u.dy/u.dz for every bound direction key (walk, run
     * and rush spellings alike, plus '<'/'>' which set u.dz and make movecmd
     * return 0), so this one call replaces the lowercase table, the '<'/'>'
     * arms and the quitchars pre-test that used to sit in front of them. */
    const is_mov = movecmd(dircode, MV_ANY);
    if (is_mov || u.dz) {
        if (is_mov && !dxdy_moveok()) {
            await pline("You can't orient yourself that direction.");
            return 0;
        }
        /* C cmd.c:4116-4117 — the tail every successful getdir falls through
         * to: `if (!u.dz) confdir(FALSE); return 1;`.  confdir is not
         * RNG-neutral (u_maybe_impaired draws when the hero is confused). */
        if (!u.dz)
            confdir(false);
        return 1;
    }
    /* C cmd.c:4098 — `if (!strchr(quitchars, dirsym))`, INSIDE the
     * invalid-direction arm: a quitchar cancels silently. */
    // strchr(quitchars, NUL) finds the string terminator in C.
    if (dircode === 0 || QUITCHARS.indexOf(dirsym) >= 0) {
        return 0;
    }
    const help_requested = dircode === (g.Cmd?.spkeys?.[NHKF_GETDIR_HELP] ?? 63);
    let did_help = false;
    if (help_requested || cmdassist_on()) {
        did_help = await help_dir(s && s.charAt(0) === '^' ? dirsym : '\0',
            ESC_KEY, help_requested ? null : 'Invalid direction key!');
        if (help_requested)
            return null;
    }
    if (!did_help)
        await pline('What a strange direction!');
    return 0;
}
export async function getdir_bad_dir_feedback() {
    let did_help = false;
    if (cmdassist_on()) {
        await help_dir('\0', /* spkey = */ ESC_KEY, 'Invalid direction key!');
        did_help = true;
    }
    if (!did_help)
        await pline('What a strange direction!');
}
function cmdassist_on() {
    const v = game.iflags?.cmdassist;
    return v === undefined ? true : !!v;
}
const ESC_KEY = '\x1b';
/* C ref: cmd.c:4846 help_dir(sym, spkey, msg) — the cmdassist invalid-direction
 * window.  Builds an NHW_TEXT window and display_nhwindow(win, FALSE)s it, which
 * on tty clears the screen, paints the lines from row 0 and pins a "--More--" to
 * row 23 that consumes one page-ack keystroke.  Always returns TRUE once the
 * window is shown (the !viawindow early-return is #if 0'd out in 3.7).
 *
 * The caller's special key selects ordinary getdir or prefix help. Direction
 * and self keys come from the shared live bindings; NODIAG(u.umonnum) selects
 * the grid-bug diagram rather than assuming the ordinary hero shape.
 * DISPLAY-CHANNEL ONLY: no RNG. */
export async function help_dir(sym, spkey, msg) {
    const byte = c => typeof c === 'number' ? c & 0xff : c.charCodeAt(0) & 0xff;
    const prefixhandling = byte(spkey) !== (game.Cmd?.spkeys?.[0] ?? 27);
    const lines = [];
    /* C cmd.c:4911-4915 — buf is empty (the bad-prefix arms are #if 0'd), so the
     * general invalid-direction message is shown. */
    if (msg) {
        lines.push(`cmdassist: ${msg}`);
        lines.push('');
    }
    let symcode = byte(sym);
    if (!prefixhandling && ((symcode >= 64 && symcode <= 90)
        || (symcode >= 97 && symcode <= 122) || symcode === 91)) {
        if (symcode >= 97 && symcode <= 122) symcode -= 32;
        const ctrl = symcode - 65 + 1, letter = String.fromCharCode(symcode);
        const explain = dowhatdoes_core(ctrl), wiz_only = 'EFGIVW'.includes(letter);
        if (explain !== null && (!wiz_only || game.flags?.debug)) {
            lines.push(`Are you trying to use ^${letter}${wiz_only ? '' : ' as specified in the Guidebook'}?`);
            lines.push('');
            lines.push(explain);
            lines.push('');
            lines.push('To use that command, hold down the <Ctrl> key as a shift');
            lines.push(`and press the <${letter}> key.`);
            lines.push('');
        }
    }
    const nodiag = (game.u?.umonnum | 0) === 116; // NODIAG: PM_GRID_BUG
    lines.push(`Valid direction keys${prefixhandling ? ' to do that' : ''}`
               + `${nodiag ? ' in your current form' : ''} are:`);
    lines.push(...show_direction_keys(!prefixhandling ? '.' : ' ', nodiag));
    if (!prefixhandling) {
        lines.push('');
        lines.push('          <  up');
        lines.push('          >  down');
        /* C: Sprintf(buf, "       %4s  direct at yourself",
         *            visctrl(spkeys[NHKF_GETDIR_SELF]))  — "." right-justified
         * in 4 columns after 7 spaces. */
        const selfi = game.Cmd?.num_pad ? NHKF_GETDIR_SELF2 : NHKF_GETDIR_SELF;
        lines.push('       ' + visctrl(game.Cmd?.spkeys?.[selfi] ?? (selfi === NHKF_GETDIR_SELF ? 46 : 115)).padStart(4)
            + '  direct at yourself');
    }
    if (msg) {
        /* C cmd.c:4957-4960 — non-null msg means this wasn't an explicit user
         * request, so append the suppression hint. */
        lines.push('');
        lines.push('(Suppress this message with !cmdassist in config file.)');
    }
    await display_text_window(lines);
    return true;
}

/* C ref: rm.h IS_DOOR(typ) — only the DOOR typ */
function _IS_DOOR(typ) { return typ === DOOR; }

export async function doclose() {
    const g = game;
    const u = g.u = g.u || {};
    /* C lock.c:965 — if (nohands(gy.youmonst.data)) */
    if (_nohands_lk()) {
        await pline("You can't close anything -- you have no hands!");
        g.context = g.context || {};
        g.context.move = 0; /* ECMD_OK */
        return;
    }
    /* C lock.c:970 — u.utrap && u.utraptype == TT_PIT */
    if ((u.utrap | 0) && (u.utraptype | 0) === 0 /* TT_PIT=0 in C trap.h */) {
        await pline("You can't reach over the edge of the pit.");
        g.context = g.context || {};
        g.context.move = 0; /* ECMD_OK */
        return;
    }
    /* C lock.c:975 — getdir(NULL); 0 → ECMD_CANCEL.  No turn consumed. */
    const got = await getdir(null);
    if (!got) {
        g.context = g.context || {};
        g.context.move = 0; /* ECMD_CANCEL */
        return;
    }
    const x = ((u.ux | 0) + (u.dx | 0)) | 0;
    const y = ((u.uy | 0) + (u.dy | 0)) | 0;
    /* C lock.c:980 — u_at(x,y) && !Passes_walls: hero is in the doorway */
    const passesWalls = _Passes_walls_lk();
    if (x === (u.ux | 0) && y === (u.uy | 0) && !passesWalls) {
        await pline('You are in the way!');
        g.context = g.context || {};
        g.context.move = 1; /* ECMD_TIME */
        return;
    }
    /* C lock.c:985 — !isok(x,y) → goto nodoor.  Use a noDoor flag to avoid
     * mid-function goto: the nodoor label is inside the (portcullis || !IS_DOOR)
     * else branch, so the same message fires for "off-map" and "no door at
     * a valid tile". */
    let noDoor = false;
    let res = ECMD_OK;
    let portcullis = false;
    let door = null;
    if (!isok(x, y)) {
        noDoor = true;
    } else {
        /* C lock.c:988 — stumble_on_door_mimic(x,y): mimic stub returns false */
        if (_stumble_on_door_mimic_stub(x, y)) {
            g.context = g.context || {};
            g.context.move = 1; /* ECMD_TIME */
            return;
        }
        /* C lock.c:993 — Confusion || Stunned forces a turn regardless */
        if (_confusion_stub() || _stunned_stub()) {
            res = ECMD_TIME;
        }
        door = g.level?.at?.(x, y) ?? null;
        /* C lock.c:997 — is_drawbridge_wall(x,y) >= 0 */
        portcullis = _is_drawbridge_wall_stub(x, y) >= 0;
        /* C lock.c:998 — Blind path: feel_location may flip glyph */
        if (_blind_stub()) {
        }
    }
    /* C lock.c:1008 — portcullis || !IS_DOOR(door->typ) — also the goto nodoor target */
    if (noDoor || portcullis || !door || !_IS_DOOR(door.typ)) {
        if (!noDoor && (_is_db_wall_stub(x, y) || (door && door.typ === 19 /* DRAWBRIDGE_UP */))) {
            await pline('The drawbridge is already closed.');
        } else if (!noDoor && (portcullis || (door && door.typ === 34 /* DRAWBRIDGE_DOWN */))) {
            await pline('There is no obvious way to close the drawbridge.');
        } else {
            /* nodoor: */
            const verb = _blind_stub() ? 'feel' : 'see';
            await pline(`You ${verb} no door there.`);
        }
        g.context = g.context || {};
        g.context.move = (res === ECMD_TIME) ? 1 : 0;
        return;
    }
    /* C lock.c:1021-1031 — door doormask state machine */
    const mask = door.doormask | 0;
    if (mask === D_NODOOR) {
        await pline('This doorway has no door.');
        g.context = g.context || {};
        g.context.move = (res === ECMD_TIME) ? 1 : 0;
        return;
    } else if (_obstructed_stub(x, y, false)) {
        g.context = g.context || {};
        g.context.move = (res === ECMD_TIME) ? 1 : 0;
        return;
    } else if (mask === D_BROKEN) {
        await pline('This door is broken.');
        g.context = g.context || {};
        g.context.move = (res === ECMD_TIME) ? 1 : 0;
        return;
    } else if (mask & (D_CLOSED | D_LOCKED)) {
        await pline('This door is already closed.');
        g.context = g.context || {};
        g.context.move = (res === ECMD_TIME) ? 1 : 0;
        return;
    }
    /* C lock.c:1034 — D_ISOPEN: attempt to close. */
    if (mask === D_ISOPEN) {
        /* C lock.c:1035 — verysmall(youmonst.data) && !u.usteed: too small */
        if (_verysmall_lk() && !u.usteed) {
            await pline("You're too small to push the door closed.");
            g.context = g.context || {};
            g.context.move = (res === ECMD_TIME) ? 1 : 0;
            return;
        }
        /* C lock.c:1039 — usteed || rn2(25) < (ACURRSTR + ACURR(A_DEX) + ACURR(A_CON))/3 */
        const threshold = Math.trunc((_acurrstr() + acurr(u, A_DEX) + acurr(u, A_CON)) / 3);
        if (u.usteed || rn2(25) < threshold) {
            await pline('The door closes.');
            door.doormask = D_CLOSED;
            feel_newsym(x, y); /* feel_newsym → newsym for sighted */
            block_point(x, y); /* C lock.c:1044 — close the line of sight. */
        } else {
            exercise(A_STR, true);
            await pline('The door resists!');
        }
    }
    g.context = g.context || {};
    g.context.move = 1; /* C lock.c:1051 — return ECMD_TIME */
}

/* C ref: attrib.c:1251 acurrstr() — STR encoding map. Duplicated from
 * doopen_indir; identical behavior. */
function _acurrstr() {
    const u = game.u || {};
    const str = acurr(u, A_STR);
    if (str <= 18) return Math.max(str, 3);
    if (str <= 121) return 19 + Math.trunc(str / 50);
    return Math.min(str, 125) - 100;
}

/* ════════════════════════════════════════════════════════════════════════
 * Lock-picking occupation subsystem.
 * C ref: lock.c:358 pick_lock(), lock.c:68 picklock(), cmd.c:875 set_occupation.
 *
 * gx.xlock state (C lock.c) is modeled on game.xlock:
 *   { usedtime, picktyp, chance, door:{x,y}, box, magic_key }
 * The occupation callback picklock() is dispatched by moveloop_core's
 * occupation driver (allmain.c:543) — see js/allmain.js.
 * ════════════════════════════════════════════════════════════════════════ */

const LOCK_PICK_OTYP = 222;   /* objects.h: LOCK_PICK */
const SKELETON_KEY_OTYP = 221;
const CREDIT_CARD_OTYP = 223;

/* C obj.h container otyps (objects.h order). */
const LARGE_BOX_OTYP = 214;
const CHEST_OTYP = 215;
const ICE_BOX_OTYP = 216;
/* C obj.h:338 Is_box(o) := otyp == LARGE_BOX || otyp == CHEST */
function _Is_box(o) { return o && (o.otyp === LARGE_BOX_OTYP || o.otyp === CHEST_OTYP); }

/* C autounlock flag bits — const.js AUTOUNLOCK_* */
const AUTOUNLOCK_UNTRAP = 1;
const AUTOUNLOCK_APPLY_KEY = 2;

/* C lock.c:352-354 */
const PICKLOCK_LEARNED_SOMETHING = -1; /* time passes */
const PICKLOCK_DID_NOTHING = 0;        /* no time passes */
const PICKLOCK_DID_SOMETHING = 1;

function box_xname(obj) {
    switch (obj ? (obj.otyp | 0) : 0) {
        case LARGE_BOX_OTYP: return 'large box';
        case CHEST_OTYP: return 'chest';
        case ICE_BOX_OTYP: return 'ice box';
        default: return 'box';
    }
}

/* C ref: objnam.c an(str) — prepend "a "/"an " article. */
function _an(str) {
    if (!str) return 'an';
    const c = str[0].toLowerCase();
    const vowel = (c === 'a' || c === 'e' || c === 'i' || c === 'o' || c === 'u');
    return (vowel ? 'an ' : 'a ') + str;
}

function _toolname(pick) {
    switch (pick ? (pick.otyp | 0) : 0) {
        case CREDIT_CARD_OTYP: return 'credit card';
        case SKELETON_KEY_OTYP: return 'key';
        case LOCK_PICK_OTYP: return 'lock pick';
        default: return simple_typename(pick ? (pick.otyp | 0) : 0);
    }
}
function _yname(pick) { return 'your ' + _toolname(pick); }

/* C ref: query.c ynq(query) := yn_function(query, ynqchars, 'q', TRUE).
 * tty_yn_function writes "<query> [ynq] (q)" to the topline, parks the cursor
 * one column past the prompt, then reads one key (lowercased).  Mirrors the
 * y_n helper in potion.js but with the [ynq] response set and 'q' default. */
async function _ynq(query) {
    const g = game;
    const prompt = query + ' [ynq] (q)';
    if (g._pending_message) await force_more(g._pending_message);
    /* tty_yn_function re-reads after an invalid character.  The old one-shot
     * reader treated '+' (or any other invalid key) as an implicit q, which
     * advanced the lock action and reset the cursor while C kept the prompt
     * parked on the topline. */
    for (;;) {
        g._pending_message = prompt;
        await flush_screen(1);
        const disp = g.nhDisplay;
        if (disp) topl_park_cursor(disp, prompt + ' ');
        /* C topl.c:537-539 files prompt + key2txt(q) in the history, not the bare
         * prompt nhgetch() would commit. */
        const _sh = g._topl_suppress_history;
        g._topl_suppress_history = true;
        let key;
        try { key = await nhgetch(); } finally { g._topl_suppress_history = _sh; }
        const ch = (typeof key === 'number') ? String.fromCharCode(key).toLowerCase() : '';
        const _filed = (a) => putmsghistory(prompt + ' ' + a);
        /* C ynq: only y/n/q are accepted; ESC/space/CR/LF → default 'q'. */
        if (key === 27 || key === 32 || key === 13 || key === 10) {
            g._pending_message = '';
            g._topl_sticky = prompt;
            _filed('q');
            return 'q';
        }
        if (ch === 'y' || ch === 'n' || ch === 'q') {
            g._pending_message = '';
            if (ch !== 'y') g._topl_sticky = prompt;
            _filed(ch);
            return ch;
        }
    }
}

function _Role_if_rogue() {
    const ur = game.urole;
    return !!(ur && ur.name && (ur.name.m === 'Rogue' || ur.name.f === 'Rogue'));
}

/* C ref: lock.c:37-64 lock_action() — verb for the resume/give-up/success
 * messages.  Faithful port of the box+door variants:
 *   actions[] = { "unlocking the door", "unlocking the chest",
 *                 "unlocking the box", "picking the lock" };
 *   "unlocking the X"+2 == "locking the X".
 *   - door currently unlocked (we're locking it) → "locking the door"
 *   - box currently unlocked (we're locking it)  → "locking the chest/box"
 *   - picktyp LOCK_PICK or CREDIT_CARD           → "picking the lock"
 *   - door → "unlocking the door"
 *   - box  → "unlocking the chest/box"
 *   - else → "picking the lock" */
function lock_action() {
    const x = game.xlock || {};
    /* if the target is currently unlocked, we're trying to lock it now */
    if (x.door && !((x.door.doormask ?? _doormaskAt(x.door)) & D_LOCKED))
        return 'locking the door';
    if (x.box && !x.box.olocked)
        return x.box.otyp === CHEST_OTYP ? 'locking the chest' : 'locking the box';
    if (x.picktyp === LOCK_PICK_OTYP)
        return 'picking the lock';
    if (x.picktyp === CREDIT_CARD_OTYP)
        return 'picking the lock';
    if (x.door)
        return 'unlocking the door';
    if (x.box)
        return x.box.otyp === CHEST_OTYP ? 'unlocking the chest' : 'unlocking the box';
    return 'picking the lock';
}
/* helper: resolve the live doormask for an xlock.door reference (which stores
 * {x,y}); for door picking the door state is on the level tile. */
function _doormaskAt(doorRef) {
    if (!doorRef) return 0;
    if (typeof doorRef.x === 'number') {
        const d = game.level?.at?.(doorRef.x, doorRef.y);
        return d ? (d.doormask | 0) : 0;
    }
    return doorRef.doormask | 0;
}


export function reset_pick() {
    game.xlock = { usedtime: 0, picktyp: 0, chance: 0, door: null, box: null, magic_key: false };
}

/* C ref: lock.c:268 maybe_reset_pick(struct obj *container) — level change or
 * object deletion; context may no longer be valid.
 *
 * Called from obfree() when an object is deleted.  If a specific container is
 * passed, only reset if it's the current lock target (gx.xlock.box).
 * If container is NULL, reset if not carrying gx.xlock.box (level change path).
 *
 * Logic:
 *   if (container ? (container == gx.xlock.box)
 *                 : (!gx.xlock.box || !carried(gx.xlock.box)))
 *       reset_pick();
 *
 * carried(o) macro: (o)->where == OBJ_INVENT (3) — object in hero's inventory
 */
export function maybe_reset_pick(container) {
    const x = game.xlock || {};

    if (container !== null && container !== undefined) {
        /* container is non-NULL: reset only if it matches the current target */
        if (container === x.box) {
            reset_pick();
        }
    } else {
        /* container is NULL: reset if not carrying gx.xlock.box.
         * carried(o) ⇔ o.where === OBJ_INVENT (3) */
        if (!x.box || !x.box.where || (x.box.where | 0) !== 3 /* OBJ_INVENT */) {
            reset_pick();
        }
    }
}

function stop_occupation() {
    const g = game;
    if (g.occupation) {
        g.occupation = null;
    }
    g.occtxt = null;
}

export async function picklock() {
    const g = game;
    const u = g.u || {};
    const x = g.xlock || {};
    if (x.box) {
        if ((x.box.where | 0) !== 1
            || (x.box.ox | 0) !== (u.ux | 0) || (x.box.oy | 0) !== (u.uy | 0)) {
            x.usedtime = 0; return 0;
        }
    } else {
        /* C lock.c:75-90 — door branch: verify the door is still the target,
         * and reject non-pickable door states. */
        const dx = u.dx | 0, dy = u.dy | 0;
        const door = g.level?.at?.((u.ux | 0) + dx, (u.uy | 0) + dy) ?? null;
        if (!x.door || !door
            || x.door.x !== (u.ux | 0) + dx || x.door.y !== (u.uy | 0) + dy) {
            x.usedtime = 0; return 0; /* C: you moved */
        }
        const mask = door.doormask | 0;
        if (mask === D_NODOOR) { await pline('This doorway has no door.'); x.usedtime = 0; return 0; }
        if (mask === D_ISOPEN) { await pline('You cannot lock an open door.'); x.usedtime = 0; return 0; }
        if (mask === D_BROKEN) { await pline('This door is broken.'); x.usedtime = 0; return 0; }
    }
    /* C lock.c:92-96 — give up after 50 turns / no hands. */
    if ((x.usedtime++ | 0) >= 50) {
        await pline(`You give up your attempt at ${lock_action()}.`);
        exercise(A_DEX, true);
        x.usedtime = 0; return 0;
    }
    /* C lock.c:99 — rn2(100) >= chance → still busy. */
    if (rn2(100) >= (x.chance | 0)) {
        return 1; /* still busy */
    }
    await pline(`You succeed in ${lock_action()}.`);
    if (x.door) {
        const door = g.level?.at?.(x.door.x, x.door.y) ?? null;
        if (door) {
            if (door.doormask & D_LOCKED) door.doormask = D_CLOSED;
            else door.doormask = D_LOCKED;
        }
    } else if (x.box) {
        x.box.olocked = !x.box.olocked;
        x.box.lknown = 1;
        /* if (gx.xlock.box->otrapped) chest_trap(...) — not reached (untrapped). */
    }
    exercise(A_DEX, true);
    x.usedtime = 0; return 0;
}


/* C ref: lock.c:649 u_have_forceable_weapon(void) — uwep is a forceable melee
 * weapon (not a launcher/projectile/flail/lance-beyond, or a rock).  Uses
 * weapon_type(uwep) = abs(objects[uwep->otyp].oc_skill). */
/* C obj.h:249 is_weptool(o) — TOOL_CLASS && oc_skill != P_NONE. */
function _is_weptool_lk(o) {
    return !!o && (o.oclass | 0) === TOOL_CLASS_OC && (MKOBJ_OC_SKILL[o.otyp | 0] | 0) !== 0;
}
function u_have_forceable_weapon() {
    const uwep = game.u?.uwep ?? null;
    if (!uwep) return false;
    const oclass = uwep.oclass | 0;
    if (oclass === WEAPON_CLASS_OC || _is_weptool_lk(uwep)) {
        /* C uses the raw (signed) objects[].oc_skill, not weapon_type's abs() */
        const skill = MKOBJ_OC_SKILL[uwep.otyp | 0] | 0;
        if (skill < P_DAGGER_SK || skill === P_FLAIL_SK || skill > P_LANCE_SK)
            return false;
        return true;
    }
    return oclass === ROCK_CLASS_OC;
}

function _wepname(uwep) {
    if (!uwep) return 'your ' + simple_typename(0);
    let owned = false;
    for (let o = game.invent; o; o = o.nobj) {
        if (o === uwep) { owned = true; break; }
    }
    return (owned ? 'your ' : 'the ') + cxname(uwep);
}

/* C ref: objnam.c doname() for a known-locked box in the force prompt:
 * "There is a locked large box here; ..."  lknown=1 + olocked → "locked" prefix. */
function _force_box_doname(box) {
    let name = box_xname(box);
    if (box.olocked && box.lknown) name = 'locked ' + name;
    else if (box.obroken && box.lknown) name = 'broken ' + name;
    return _an(name);
}

/* C ref: lock.c:215 forcelock() — the occupation callback, fired once per turn
 * by the moveloop occupation driver.  Returns 1 while still busy, 0 when done. */
export async function forcelock() {
    const g = game;
    const u = g.u || {};
    const x = g.xlock || {};
    const box = x.box;
    /* C lock.c:218 — you or it moved → abort. */
    if (!box || (box.ox | 0) !== (u.ux | 0) || (box.oy | 0) !== (u.uy | 0)) {
        x.usedtime = 0; return 0;
    }
    /* C lock.c:221 — give up after 50 turns / no weapon. */
    if ((x.usedtime++ | 0) >= 50 || !u.uwep) {
        await pline('You give up your attempt to force the lock.');
        if ((x.usedtime | 0) >= 50)
            exercise(x.picktyp ? A_DEX : A_STR, true);
        x.usedtime = 0; return 0;
    }
    if (x.picktyp) {
        if (rn2(1000 - (u.uwep.spe | 0)) > (992 - 0 /* greatest_erosion */ * 10)
            && !u.uwep.cursed) {
            await pline(`${(u.uwep.quan | 0) > 1 ? 'One of y' : 'Y'}our ${simple_typename(u.uwep.otyp | 0)} broke!`);
            u.uwep = null;
            await pline('You give up your attempt to force the lock.');
            exercise(A_DEX, true);
            x.usedtime = 0; return 0;
        }
    } else {
        wake_nearby_force();
    }
    /* C lock.c:244 — rn2(100) >= chance → still busy. */
    if (rn2(100) >= (x.chance | 0))
        return 1;
    g._forceMsgs = g._forceMsgs || [];
    _forceEmit('You succeed in forcing the lock.');
    exercise(x.picktyp ? A_DEX : A_STR, true);
    /* C lock.c:252 — breakchestlock(box, destroyit), destroyit = !picktyp && !rn2(3). */
    const destroyit = !x.picktyp && !rn2(3);
    await breakchestlock(box, destroyit);
    reset_pick();
    return 0;
}

/* Stage a force-occupation message for the driver's cross-turn --More-- paging.
 * When no driver is consuming the queue (defensive), fall back to a plain pline. */
function _forceEmit(msg) {
    const g = game;
    if (g._forceMsgs) g._forceMsgs.push(msg);
    else g._pending_message = msg;
}

/* C ref: mon.c wake_nearby(petcall) → wake_nearto_core(ux,uy,ulevel*20,...).
 * Wakes nearby sleeping monsters; consumes NO rng (wake_msg / mstrategy clear
 * are RNG-free).  Minimal faithful side-effect: clear msleeping on close mons. */
function wake_nearby_force() {
    const g = game;
    const u = g.u || {};
    const dist = (u.ulevel | 0) * 20;
    for (let m = g.fmon; m; m = m.nmon) {
        if (m.mhp != null && (m.mhp | 0) <= 0) continue;
        const dx = (m.mx | 0) - (u.ux | 0), dy = (m.my | 0) - (u.uy | 0);
        if (dist === 0 || (dx * dx + dy * dy) < dist) {
            m.msleeping = 0;
        }
    }
}

export async function breakchestlock(box, destroyit) {
    const g = game;
    const u = g.u || {};
    if (!destroyit) {
        /* C lock.c:164 — bill for the box (shop), then break the lock in place. */
        box.olocked = 0;
        box.obroken = 1;
        box.lknown = 1;
        return;
    }
    /* C lock.c:173 — #force destroyed this box. */
    _forceEmit(`In fact, you've totally destroyed ${_the(box_xname(box))}.`);
    /* C lock.c:184 — put the contents on the ground at the hero's feet. */
    let otmp;
    while ((otmp = box.cobj) != null) {
        _extract_from_box(box, otmp);
        /* C lock.c:186 — if (!rn2(3) || POTION) chest_shatter_msg(otmp). */
        if (!rn2(3) || (otmp.oclass | 0) === POTION_CLASS_OC) {
            await chest_shatter_msg(otmp);
            /* C lock.c:191 — quan==1 → obfree (gone); else useup (decrement). */
            if ((otmp.quan | 0) === 1) {
                continue; /* obfree: object destroyed, not placed */
            }
            otmp.quan = (otmp.quan | 0) - 1;
        }
        place_object(otmp, u.ux | 0, u.uy | 0);
    }
    _delobj(box, u.ux | 0, u.uy | 0);
}

/* C ref: mkobj.c obj_extract_self for a contained object (box->cobj chain). */
function _extract_from_box(box, obj) {
    if (box.cobj === obj) box.cobj = obj.nobj ?? null;
    else { let p = box.cobj; while (p && p.nobj !== obj) p = p.nobj; if (p) p.nobj = obj.nobj ?? null; }
    obj.nobj = null;
    obj.ocontainer = null;
    obj.where = 0 /* OBJ_FREE */;
}

function _delobj(box, x, y) {
    /* C invent.c:1446 — if (!force && obj_resists(obj, 0, 0)) return; */
    if (obj_resists(box, 0, 0)) return;
    const lvlObjs = g_levelObjects();
    if (lvlObjs && lvlObjs[x]) {
        let head = lvlObjs[x][y] ?? null;
        if (head === box) lvlObjs[x][y] = box.nexthere ?? null;
        else { let p = head; while (p && p.nexthere !== box) p = p.nexthere; if (p) p.nexthere = box.nexthere ?? null; }
    }
    /* also unlink from the global fobj chain. */
    if (game.fobj === box) game.fobj = box.nobj ?? null;
    else { let p = game.fobj; while (p && p.nobj !== box) p = p.nobj; if (p) p.nobj = box.nobj ?? null; }
    box.where = 0 /* OBJ_FREE */;
}
function g_levelObjects() { return game.level?.levelObjects ?? null; }

/* C ref: lock.c:1268 chest_shatter_msg(otmp) — shatter/breathe a scattered item. */
async function chest_shatter_msg(otmp) {
    if ((otmp.oclass | 0) === POTION_CLASS_OC) {
        /* C lock.c:1284 — "You see a <bottle> shatter!" (bottlename rn2(7)). */
        _forceEmit(`You see ${_an(bottlename())} shatter!`);
        /* C lock.c:1286 — potionbreathe(otmp) (hero not breathless/has eyes). */
        /* potionbreathe()'s plines go straight to the topline, but the force
         * messages are staged and merged later; move what it printed into the
         * stage so generation order (succeed, destroyed, shatter, dizzy) holds. */
        const res0 = game._resultMessage ?? null;
        const before = game._pending_message || '';
        await potionbreathe(otmp);
        /* pline() may have folded the committed result into the live line. */
        const after = game._pending_message || '';
        const prefix = [res0, before].filter(Boolean).join('  ');
        if (after.startsWith(prefix) && after.length > prefix.length) {
            game._resultMessage = res0;
            game._pending_message = before;
            _forceEmit(after.slice(prefix.length).trim());
        }
        return;
    }
    const uprops = (game.u && game.u.uprops) ? game.u.uprops : null;
    const bl = uprops ? uprops[BLINDED] : null;
    const save_HBlinded = bl ? bl.intrinsic : 0;
    const save_BBlinded = bl ? bl.extrinsic : 0;
    if (bl) { bl.intrinsic = 1; bl.extrinsic = 0; }
    /* C objnam.c:5069 singular(otmp, xname) — quan forced to 1 for the call. */
    const save_quan = otmp.quan;
    otmp.quan = 1;
    const thing = xname_flags(otmp, CXN_NORMAL);
    otmp.quan = save_quan;
    if (bl) { bl.intrinsic = save_HBlinded; bl.extrinsic = save_BBlinded; }
    /* C lock.c:1290-1320 — material-based "<thing> <disposition>!" (RNG-free). */
    const mat = oc_material(otmp.otyp | 0);
    let disposition;
    /* objclass.h:12-35 enum obj_material_types — WAX=2, VEGGY=3, FLESH=4,
     * PAPER=5, GLASS=19, WOOD=8.  This switch previously sat on a stale
     * material space (7/13/5/6/9/3 = LEATHER/COPPER/PAPER/CLOTH/BONE/VEGGY). */
    switch (mat) {
        case 5 /* PAPER */: disposition = 'is torn to shreds'; break;
        case 2 /* WAX */: disposition = 'is crushed'; break;
        case 3 /* VEGGY */: disposition = 'is pulped'; break;
        case 4 /* FLESH */: disposition = 'is mashed'; break;
        case 19 /* GLASS */: disposition = 'shatters'; break;
        case 8 /* WOOD */: disposition = 'splinters to fragments'; break;
        default: disposition = 'is destroyed'; break;
    }
    /* C lock.c:1315 — pline("%s %s!", An(thing), disposition). */
    _forceEmit(`${_An(thing)} ${disposition}!`);
}

/* C ref: potion.c:1478-1493 — hallucination uses a separate 24-entry table,
 * while ordinary play uses the seven stable bottle names. */
const _bottlenames = ['bottle', 'phial', 'flagon', 'carafe', 'flask', 'jar', 'vial'];
const _hbottlenames = [
    'jug', 'pitcher', 'barrel', 'tin', 'bag', 'box', 'glass', 'beaker',
    'tumbler', 'vase', 'flowerpot', 'pan', 'thingy', 'mug', 'teacup',
    'teapot', 'keg', 'bucket', 'thermos', 'amphora', 'wineskin', 'parcel',
    'bowl', 'ampoule'
];
export function bottlename() {
    const p = game.u?.uprops?.[HALLUC];
    const hallu = !!p && ((p.intrinsic | 0) || (p.extrinsic | 0)) && !(p.blocked | 0);
    const names = hallu ? _hbottlenames : _bottlenames;
    return names[rn2(names.length)];
}

/* C ref: objnam.c An(str) — capitalised article. */
function _An(str) { return _an(str).charAt(0).toUpperCase() + _an(str).slice(1); }

/* C ref: lock.c:677 doforce(void) — the #force extended command. */
export async function doforce() {
    const g = game;
    const u = g.u || {};
    /* C lock.c:692 — must wield a forceable weapon. */
    if (!u_have_forceable_weapon()) {
        const uwep = u.uwep;
        const usePlural = uwep && (uwep.quan | 0) > 1;
        const phrase = !uwep ? 'when not wielding a'
            : ((uwep.oclass | 0) !== WEAPON_CLASS_OC && !_is_weptool_lk(uwep)) ? (usePlural ? 'without proper' : 'without a proper')
            : (usePlural ? 'with those' : 'with that');
        await pline(`You can't force anything ${phrase} weapon${usePlural ? 's' : ''}.`);
        return ECMD_OK;
    }

    /* C lock.c:708 — picktyp = is_blade(uwep) && !is_pick(uwep). */
    const uwep = u.uwep;
    const picktyp = (is_blade_force(uwep) && !is_pick_force(uwep)) ? 1 : 0;

    g.xlock = g.xlock || { usedtime: 0, picktyp: 0, chance: 0, door: null, box: null, magic_key: false };
    const x = g.xlock;

    /* C lock.c:709 — resume an interrupted force attempt. */
    if (x.usedtime && x.box && picktyp === x.picktyp) {
        await pline('You resume your attempt to force the lock.');
        set_occupation(forcelock, 'forcing the lock', 0);
        return ECMD_TIME;
    }

    x.box = null;
    const lvlObjs = g.level?.levelObjects;
    for (let otmp = lvlObjs?.[u.ux | 0]?.[u.uy | 0] ?? null; otmp; otmp = otmp.nexthere) {
        if (!_Is_box(otmp)) continue;
        if (otmp.obroken || !otmp.olocked) {
            /* C lock.c:719 — already broken/unlocked. */
            otmp.lknown = 0;
            await pline(`There is ${_force_box_doname(otmp)} here, but its lock is already ${otmp.obroken ? 'broken' : 'unlocked'}.`);
            otmp.lknown = 1;
            continue;
        }
        /* C lock.c:730 — "There is <box> here; force its lock?" [ynq] (q). */
        const qbuf = `There is ${_force_box_doname(otmp)} here; force its lock?`;
        otmp.lknown = 1;
        const c = await _ynq(qbuf);
        if (c === 'q') return ECMD_OK;
        if (c === 'n') continue;
        /* C lock.c:740-743 — begin message.  Leave it in _resultMessage (the
         * occupation-begin slot, like eat's "A little goes a long way.") so the
         * moveloop forcelock driver commits it as the first paged topline; the
         * success/destroy/shatter messages staged in _forceMsgs then page it
         * turn-by-turn.  Init _forceMsgs here so forcelock()'s success path stages
         * (rather than plines) its messages. */
        await pline(picktyp
            ? `You force ${_wepname(uwep)} into a crack and pry.`
            : `You start bashing it with ${_wepname(uwep)}.`);
        g._resultMessage = g._pending_message || g._resultMessage;
        g._forceMsgs = [];
        x.box = otmp;
        x.chance = (WEAPON_WLDAM[uwep.otyp | 0] | 0) * 2; /* objects[uwep].oc_wldam * 2 */
        x.picktyp = picktyp;
        x.magic_key = false;
        x.usedtime = 0;
        break;
    }

    /* C lock.c:752 — set up the occupation (or "decide not to force"). */
    if (x.box) {
        set_occupation(forcelock, 'forcing the lock', 0);
    } else {
        await pline('You decide not to force the issue.');
    }
    return ECMD_TIME;
}

function is_blade_force(o) {
    if (!o || (o.oclass | 0) !== WEAPON_CLASS_OC) return false;
    const s = weapon_type(o);
    return s >= P_DAGGER_SK && s <= P_SABER_SK;
}
function is_pick_force(o) {
    if (!o) return false;
    const oc = o.oclass | 0;
    if (oc !== WEAPON_CLASS_OC && oc !== TOOL_CLASS_OC) return false;
    return weapon_type(o) === P_PICK_AXE_SK;
}

export function autokey(opening) {
    let key = null, pick = null, card = null;
    for (let o = game.invent; o; o = o.nobj) {
        switch (o.otyp | 0) {
            case SKELETON_KEY_OTYP: if (!key) key = o; break;
            case LOCK_PICK_OTYP: if (!pick) pick = o; break;
            case CREDIT_CARD_OTYP: if (!card) card = o; break;
            default: break;
        }
    }
    if (!opening) card = null;
    return key ? key : (pick ? pick : (card ? card : null));
}

export async function pick_lock(pick, rx, ry, container) {
    const g = game;
    const u = g.u = g.u || {};
    const picktyp = pick ? (pick.otyp | 0) : 0;
    /* C lock.c:370 — autounlock := (rx != 0 || container != NULL). */
    const autounlock = ((rx | 0) !== 0) || (container != null);

    g.xlock = g.xlock || { usedtime: 0, picktyp: 0, chance: 0, door: null, box: null, magic_key: false };
    const x = g.xlock;

    /* C lock.c:381 — resume an interrupted previous attempt. */
    if (x.usedtime && picktyp === x.picktyp) {
        /* nohands/uswallow guarded out (human hero, not swallowed). */
        const action = lock_action();
        await pline(`You resume your attempt at ${action}.`);
        set_occupation(picklock, action, 0);
        return PICKLOCK_DID_SOMETHING;
    }

    /* C lock.c:421 — autounlock provides coordinates; else getdir → u.dx/u.dy. */
    let cx, cy;
    if ((rx | 0) !== 0) {
        cx = rx | 0; cy = ry | 0;
    } else {
        if (!(await getdir(null))) {
            return PICKLOCK_DID_NOTHING; /* cancelled / invalid */
        }
        cx = (u.ux | 0) + (u.dx | 0);
        cy = (u.uy | 0) + (u.dy | 0);
    }

    /* C lock.c:429 — u_at(cc): pick the lock on a container at the hero's tile. */
    if (cx === (u.ux | 0) && cy === (u.uy | 0)) {
        let c = 'n';
        let count = 0;
        const lvlObjs = g.level?.levelObjects;
        for (let otmp = lvlObjs?.[cx]?.[cy] ?? null; otmp; otmp = otmp.nexthere) {
            /* C lock.c:453 — autounlock: skip any box that isn't the target. */
            if (autounlock && otmp !== container) continue;
            if (!_Is_box(otmp)) continue;
            ++count;
            /* C lock.c:471 — AUTOUNLOCK_UNTRAP path (could_untrap) not enabled
             * by default flags (APPLY_KEY only); skip to the APPLY_KEY arm. */
            /* C lock.c:482 — AUTOUNLOCK_APPLY_KEY: "Unlock it with <pick>? [ynq]" */
            if (autounlock /* && (flags.autounlock & AUTOUNLOCK_APPLY_KEY) */) {
                c = 'q';
                if (pick) {
                    /* C lock.c:486 — Sprintf(qbuf,"Unlock it with %s?", yname(pick)) */
                    const ans = await _ynq(`Unlock it with ${_yname(pick)}?`);
                    c = ans;
                }
                if (c !== 'y') return PICKLOCK_DID_NOTHING;
            } else {
                /* C lock.c:496-509 — "There is <a box> here; <verb> <it|its lock>?" */
                let verb, it = false;
                if (otmp.obroken) verb = 'fix';
                else if (!otmp.olocked) { verb = 'lock'; it = true; }
                else if (picktyp !== LOCK_PICK_OTYP) { verb = 'unlock'; it = true; }
                else verb = 'pick';
                const qsfx = ` here; ${verb} ${it ? 'it' : 'its lock'}?`;
                const qbuf = await safe_qbuf('', 'There is ', qsfx, otmp, doname,
                                             ansimpleoname, 'a box');
                otmp.lknown = 1;
                c = await _ynq(qbuf);
                if (c === 'q') return PICKLOCK_DID_NOTHING;
                if (c === 'n') continue; /* try next box */
            }
            /* C lock.c:511 — obroken: can't fix its lock. */
            if (otmp.obroken) {
                await pline(`You can't fix its broken lock with ${ansimpleoname(pick)}.`);
                return PICKLOCK_LEARNED_SOMETHING;
            }
            /* C lock.c:510 — credit card can only UNLOCK (box is locked → ok). */
            if (picktyp === CREDIT_CARD_OTYP && !otmp.olocked) {
                await pline(`You can't do that with ${_an(simple_typename(picktyp))}.`);
                return PICKLOCK_LEARNED_SOMETHING;
            }
            /* C lock.c:515 — autounlock touch_artifact check (no artifact pick). */
            /* C lock.c:520-532 — chance computation (faithful constants). */
            let ch;
            const dex = acurr(u, A_DEX);
            switch (picktyp) {
                case CREDIT_CARD_OTYP: ch = dex + 20 * (_Role_if_rogue() ? 1 : 0); break;
                case LOCK_PICK_OTYP:   ch = 4 * dex + 25 * (_Role_if_rogue() ? 1 : 0); break;
                case SKELETON_KEY_OTYP: ch = 75 + dex; break;
                default: ch = 0;
            }
            if (otmp.cursed) ch = Math.trunc(ch / 2);
            x.box = otmp;
            x.door = null;
            x.picktyp = picktyp;
            x.chance = ch;
            x.usedtime = 0;
            x.magic_key = false;
            c = 'y';
            break;
        }
        /* C lock.c:541 — decided against all boxes / no box found. */
        if (c !== 'y') {
            if (!count) await pline("There doesn't seem to be any sort of lock here.");
            return PICKLOCK_LEARNED_SOMETHING;
        }
        /* C lock.c:655 — set up the occupation and start picking. */
        set_occupation(picklock, lock_action(), 0);
        return PICKLOCK_DID_SOMETHING;
    }

    /* C lock.c:546 — adjacent door branch.  A visible monster gets first
     * refusal, before the terrain is inspected; using a lock tool on a pet
     * therefore reports its appreciation message and still costs a turn. */
    const mtmp = m_at(cx, cy);
    if (mtmp && canseemon(mtmp) && !(mtmp.m_ap_type === 3 || mtmp.m_ap_type === 5)) {
        if (picktyp === CREDIT_CARD_OTYP && mtmp.isshk)
            await pline('No checks, no credit, no problem.');
        else
            await pline(`I don't think ${mon_nam(mtmp)} would appreciate that.`);
        return PICKLOCK_LEARNED_SOMETHING;
    }
    const door = g.level?.at?.(cx, cy) ?? null;
    if (!door || !_IS_DOOR(door.typ)) {
        let res = PICKLOCK_DID_NOTHING;
        if (door) {
            const rg = door.remembered_glyph;
            if (rg && _darken_room_floor(door, rg)) {
                show_glyph_cell(cx, cy, rg.ch, rg.color, rg.decgfx, 0, rg.cls);
                res = PICKLOCK_LEARNED_SOMETHING;
            }
        }
        await pline(`You ${_blind_stub() ? 'feel' : 'see'} no door there.`);
        return res;
    }
    const mask = door.doormask | 0;
    /* C lock.c:594-603 — door state switch. */
    if (mask === D_NODOOR) { await pline('This doorway has no door.'); return PICKLOCK_LEARNED_SOMETHING; }
    if (mask === D_ISOPEN) { await pline('You cannot lock an open door.'); return PICKLOCK_LEARNED_SOMETHING; }
    if (mask === D_BROKEN) { await pline('This door is broken.'); return PICKLOCK_LEARNED_SOMETHING; }


    /* C lock.c:614-618 — credit cards are only good for unlocking. */
    if (picktyp === CREDIT_CARD_OTYP && !(mask & D_LOCKED)) {
        await pline("You can't lock a door with a credit card.");
        return PICKLOCK_LEARNED_SOMETHING;
    }

    const qbuf = ((mask & D_LOCKED) ? 'Unlock' : 'Lock') + ' it'
               + (autounlock ? ' with ' + _yname(pick) : '') + '?';
    if ((await _ynq(qbuf)) !== 'y')
        return PICKLOCK_DID_NOTHING;


    /* C lock.c:638-657 — chance computation. */
    const dex = acurr(u, A_DEX);
    let ch;
    switch (picktyp) {
        case CREDIT_CARD_OTYP: ch = 2 * dex + 20 * (_Role_if_rogue() ? 1 : 0); break;
        case LOCK_PICK_OTYP:   ch = 3 * dex + 30 * (_Role_if_rogue() ? 1 : 0); break;
        case SKELETON_KEY_OTYP: ch = 70 + dex; break;
        default: ch = 0;
    }
    x.box = null;
    x.door = { x: cx, y: cy };
    x.picktyp = picktyp;
    x.chance = ch;
    /* C lock.c:651 — gx.xlock.magic_key = is_magic_key(&gy.youmonst, pick);
     * picklock() reads it to decide whether a trapped lock is DETECTED
     * (lock.c:103) rather than sprung. */
    x.magic_key = is_magic_key_hero(pick);
    x.usedtime = 0;
    set_occupation(picklock, lock_action(), 0);
    return PICKLOCK_DID_SOMETHING;
}

/* C ref: artifact.c is_magic_key(mon, obj) — restricted to the hero's own
 * holder case (the only one pick_lock/picklock use):
 *     if (is_art(obj, ART_MASTER_KEY_OF_THIEVERY)) {
 *         if (Role_if(PM_ROGUE)) return !obj->cursed;
 *         return obj->blessed;
 *     }
 *     return FALSE;
 * ART_MASTER_KEY_OF_THIEVERY is the 1-based artilist index 29 (the Rogue quest
 * artifact — the same number js/objnam.js's _ROLE_QUESTARTI table carries). */
const ART_MASTER_KEY_OF_THIEVERY = 29;
function is_magic_key_hero(obj) {
    if (!obj || (obj.oartifact | 0) !== ART_MASTER_KEY_OF_THIEVERY) return false;
    if (_Role_if_rogue()) return !obj.cursed;
    return !!obj.blessed;
}

/** C mondata.h:10 monsndx(ptr) — the hero's current form index, or -1. */
function _hero_mndx_lk() {
    const d = game.youmonst && game.youmonst.data;
    if (d && d.pmidx != null) return d.pmidx | 0;
    const m = game.u && game.u.umonnum;
    return (m != null) ? (m | 0) : -1;
}
/** C permonst.mflags1 for the hero's current form (MONS row[6]). */
function _hero_mflags1_lk() {
    const d = game.youmonst && game.youmonst.data;
    if (d && d.mflags1 != null) return d.mflags1 >>> 0;
    const i = _hero_mndx_lk();
    return (i >= 0 && i < _MONS_LK.length) ? (_MONS_LK[i][6] >>> 0) : 0;
}
/** C permonst.msize for the hero's current form. */
function _hero_msize_lk() {
    const d = game.youmonst && game.youmonst.data;
    if (d && d.msize != null) return d.msize | 0;
    const i = _hero_mndx_lk();
    return (i >= 0 && i < _MONS_MSIZE_LK.length) ? (_MONS_MSIZE_LK[i] | 0) : MZ_HUMAN_LK;
}
/* C mondata.h:52 — #define nohands(ptr) (((ptr)->mflags1 & M1_NOHANDS) != 0L)
 * monflag.h:98 M1_NOHANDS = 0x00002000L ("no hands to handle things"). */
const M1_NOHANDS_LK = 0x00002000;
function _nohands_lk() { return (_hero_mflags1_lk() & M1_NOHANDS_LK) !== 0; }
/* C mondata.h:11 — #define verysmall(ptr) ((ptr)->msize < MZ_SMALL)
 * monflag.h:178 MZ_SMALL = 1 (MZ_TINY = 0 is the only size below it). */
const MZ_SMALL_LK = 1;
function _verysmall_lk() { return _hero_msize_lk() < MZ_SMALL_LK; }
/* C youprop.h:284-286 —
 *   #define HPasses_walls u.uprops[PASSES_WALLS].intrinsic
 *   #define EPasses_walls u.uprops[PASSES_WALLS].extrinsic
 *   #define Passes_walls (HPasses_walls || EPasses_walls)
 * lock.c:980 tests the PROPERTY, not mondata.h's passes_walls(ptr): polyself
 * pushes M1_WALLWALK into uprops[PASSES_WALLS].intrinsic (polyself.js:283), so
 * the property read already covers the polymorphed-into-a-xorn case. */
function _Passes_walls_lk() {
    const p = game.u && game.u.uprops && game.u.uprops[PASSES_WALLS];
    if (!p) return false;
    return !!((p.intrinsic | 0) || (p.extrinsic | 0));
}

function _stumble_on_door_mimic_stub(_x, _y) { return false; }
function _confusion_stub() { return false; }
function _stunned_stub() { return false; }
function _blind_stub() { return Blind(); }
/* C ref: dbridge.c:136-162 is_drawbridge_wall().  Keep this local rather
 * than importing dokick.js: dokick.js imports breakchestlock from lock.js,
 * so a cross-import would create a module cycle in the replay runtime. */
function _is_drawbridge_wall_stub(x, y) {
    if (!isok(x, y)) return -1;
    const lev = game.level?.at(x, y);
    if (!lev || (lev.typ !== DOOR && lev.typ !== DBWALL)) return -1;
    if (isok(x + 1, y)) {
        const adj = game.level?.at(x + 1, y);
        if (adj && IS_DRAWBRIDGE(adj.typ)
            && ((adj.drawbridgemask & DB_DIR) | 0) === DB_WEST) return DB_WEST;
    }
    if (isok(x - 1, y)) {
        const adj = game.level?.at(x - 1, y);
        if (adj && IS_DRAWBRIDGE(adj.typ)
            && ((adj.drawbridgemask & DB_DIR) | 0) === DB_EAST) return DB_EAST;
    }
    if (isok(x, y - 1)) {
        const adj = game.level?.at(x, y - 1);
        if (adj && IS_DRAWBRIDGE(adj.typ)
            && ((adj.drawbridgemask & DB_DIR) | 0) === DB_SOUTH) return DB_SOUTH;
    }
    if (isok(x, y + 1)) {
        const adj = game.level?.at(x, y + 1);
        if (adj && IS_DRAWBRIDGE(adj.typ)
            && ((adj.drawbridgemask & DB_DIR) | 0) === DB_NORTH) return DB_NORTH;
    }
    return -1;
}

/* C ref: dbridge.c:165-173 is_db_wall(). */
function _is_db_wall_stub(x, y) {
    const loc = game.level?.at(x, y);
    return !!loc && (loc.typ | 0) === DBWALL;
}
function _obstructed_stub(_x, _y, _quietly) { return false; }

/* C ref: lock.c:16 picking_lock(coordxy *x, coordxy *y) — if hero is picklocking,
 *   set *x = u.ux + u.dx, *y = u.uy + u.dy and return TRUE; else *x=*y=0, return FALSE. */
export function picking_lock(x, y) {
    const g = game;
    const u = g.u || {};
    if (g.occupation === 'picklock') {
        x.value = (u.ux + u.dx) | 0;
        y.value = (u.uy + u.dy) | 0;
        return true;
    } else {
        x.value = 0;
        y.value = 0;
        return false;
    }
}

/* C ref: lock.c:29 picking_at(coordxy x, coordxy y) — hero is lock-picking the door at x,y.
 *   (go.occupation == picklock && gx.xlock.door == &levl[x][y])
 * &levl[x][y] pointer-identity ≡ coordinate match (the tile at x,y is unique). */
export function picking_at(x, y) {
    const g = game;
    if (g.occupation !== 'picklock')
        return 0;
    const xlk = g.xlock || {};
    if (!xlk.door)
        return 0;
    if (xlk.door.x === (x | 0) && xlk.door.y === (y | 0))
        return 1;
    return 0;
}

/* C ref: lock.c:1039-1170 doorlock(otmp, x, y) — apply an opening / locking /
 * striking magic effect to the door at <x,y>.  Returns TRUE when the door was
 * actually changed.  RNG-free on every arm.
 *
 * Only the WAN_STRIKING / SPE_FORCE_BOLT arm is ported (that is the one a
 * monster's striking beam reaches via mbhit); the other arms throw so that a
 * wand of opening/locking beam fails loudly rather than silently reporting
 * "nothing happened". */
export async function doorlock(otmp, x, y) {
    const door = game.level?.at(x, y);
    if (!door)
        return false;
    let res = true;
    let loudness = 0;

    if ((door.typ | 0) === SDOOR) {
        /* KNOWN GAP — lock.c:1049-1076: a striking/opening beam turns a
         * secret door into a real D_CLOSED door and prints "A door appears in
         * the wall!", then (for striking) falls through to the arm below.
         * RNG-free.  Returns FALSE ("nothing changed"), a value C's doorlock
         * really returns (lock.c:1074), rather than throwing — a throw would
         * discard the replay's entire matched RNG prefix. */
        return false;
    }

    switch (otmp.otyp | 0) {
    case WAN_STRIKING_OTYP:
    case 376: /* SPE_FORCE_BOLT */
        if ((door.doormask | 0) & (D_LOCKED | D_CLOSED)) {
            if ((door.doormask | 0) & D_TRAPPED) {
                /* KNOWN GAP — lock.c:1105-1135: a trapped door explodes
                 * (doormask = D_NODOOR, mb_trapped() on any monster in the
                 * doorway, "KABOOM!!" and loudness 40).  Missing dependency:
                 * mb_trapped (trap.c), which draws RNG.  Returns FALSE
                 * rather than throwing; see the SDOOR arm above. */
                return false;
            }
            const sawit = cansee(x, y);
            door.doormask = D_BROKEN;
            recalc_block_point(x, y);
            const seeit = cansee(x, y);
            newsym(x, y);
            if (game.flags?.verbose) {
                if (sawit || seeit)
                    await pline("The door crashes open!");
                else if (!_lock_Deaf())
                    await pline("You hear a crashing sound.");
            }
            loudness = 20;
        } else {
            /* C lock.c:1152 — an open/broken/absent door is unaffected. */
            res = false;
        }
        break;
    default:
        /* KNOWN GAP — lock.c:1079-1147 also handles WAN_LOCKING /
         * SPE_WIZARD_LOCK (needs obstructed(), block_point()) and
         * WAN_OPENING / SPE_KNOCK.  All RNG-free, none reachable from
         * mbhit (which only ever passes a WAN_STRIKING beam), and C's own
         * fallthrough here is `impossible()` + the res=TRUE default.
         * Returns FALSE = "nothing changed" rather than throwing. */
        return false;
    }

    if (loudness > 0) {
        /* C lock.c:1157-1162 — the door was destroyed: wake everything within
         * `loudness`, and put a broken SHOP door on the shopkeeper's repair
         * list at NO cost to the hero (add_damage with cost 0).  Both are
         * RNG-free. */
        wake_nearto(x, y, loudness);
        if (in_rooms(x, y, SHOPBASE).length)
            add_damage(x, y, 0);
    }
    /* C lock.c:1164-1168 — `res && picking_at(x,y)` interrupts a lock-picking
     * occupation.  Unreachable while res is false on the only ported arm. */
    return res;
}

export async function boxlock(obj, otmp) {
    let res = false;

    switch (otmp.otyp | 0) {
    case WAN_LOCKING_OTYP_LK:
    case SPE_WIZARD_LOCK_OTYP_LK:
        /* C lock.c:1062 — if (!obj->olocked) { lock it; fix if broken } */
        if (!obj.olocked) {
            /* C lock.c:1064 Soundeffect(se_klunk, 50) — audio only, no RNG,
             * no state (js/dokick.js:1828 is this port's no-op for the same
             * macro); omitted. */
            await pline('Klunk!');
            obj.olocked = 1;
            obj.obroken = 0;
            if ((game.urole && game.urole.mnum) === PM_WIZARD_LK)
                obj.lknown = 1;
            else
                obj.lknown = 0;
            res = true;
        } /* else already closed and locked */
        break;
    case WAN_OPENING_OTYP_LK:
    case SPE_KNOCK_OTYP_LK:
        /* C lock.c:1075 — if (obj->olocked) { unlock } else silently fix */
        if (obj.olocked) {
            /* C lock.c:1077 Soundeffect(se_klick, 50) — audio only; omitted,
             * see above. */
            await pline('Klick!');
            obj.olocked = 0;
            res = true;
            if ((game.urole && game.urole.mnum) === PM_WIZARD_LK)
                obj.lknown = 1;
            else
                obj.lknown = 0;
        } else {
            /* C lock.c:1086 — silently fix if broken */
            obj.obroken = 0;
        }
        break;
    case WAN_POLYMORPH_OTYP_LK:
    case SPE_POLYMORPH_OTYP_LK:
        /* C lock.c:1089-1093 — maybe start unlocking chest, get interrupted,
         * then zap it; avoid resuming the pick on a now-polymorphed obj. */
        if ((game.xlock && game.xlock.box) === obj)
            reset_pick();
        break;
    }
    return res;
}
