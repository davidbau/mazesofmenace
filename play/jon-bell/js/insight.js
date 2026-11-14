// insight.js — C ref: insight.c.
import { youhiding_enlightenment } from './cmd.js';
import { ceiling, surface } from './dungeon.js';
import { waterbody_name } from './pager.js';
import { FLYING, TT_PIT, SPIKED_PIT } from './const.js';
import { game } from './gstate.js';
import { is_pool } from './look.js';
import { ansimpleoname, simple_typename } from './objnam.js';
import { pline } from './pline.js';
import { M1_CLING, M1_FLY, M_AP_FURNITURE_local, M_AP_NOTHING_local, M_AP_OBJECT_local, S_EEL, _hides_under } from './polyself.js';
import { an } from './objnam.js';
import { getnow } from './calendar.js'; // relocate-fns
import { BOTH_SIDES, HALF_PHDAM_ART, HALF_SPDAM_ART, _Blindfolded, _EDOG_local, _Flying, _Levitation, _N_times, _SUPPRESS_INVISIBLE, _SUPPRESS_IT, _ach_rank_of, _align_str, _digests, _enfolds_local, _enl_Very_fast, _enlght_line, _fingers_or_gloves, _from_what, _haseyes, _is_animal_local, _ismnum_local, _piousness, _sticks, _uprop_active, _usick_type, build_enlightenment_lines, create_nhwindow, destroy_nhwindow, display_nhwindow, enl_msg, enlightenment_menu, keyhelp_compress_str, list_vanquished_set_vanq_order, plur, pooleffects_Wwalking, putstr, set_cursor, yn_function } from './cmd.js';
import { mhidden_description } from './pager.js'; // relocate-fns
import { display_text_window, tty_text_window_utf8_line } from './com_pager.js'; // relocate-fns
import { ACH_AMUL, ACH_ASTR, ACH_BELL, ACH_BGRM, ACH_BLND, ACH_BOOK, ACH_CNDL, ACH_ENDG, ACH_HELL, ACH_INVK, ACH_MEDU, ACH_MINE, ACH_MINE_PRIZE, ACH_NOVL, ACH_NUDE, ACH_ORCL, ACH_RNK1, ACH_RNK2, ACH_RNK3, ACH_RNK4, ACH_RNK5, ACH_RNK6, ACH_RNK7, ACH_RNK8, ACH_SHOP, ACH_SOKO, ACH_SOKO_PRIZE, ACH_TMPL, ACH_TOWN, ACH_TUNE, ACH_UWIN, A_CHAOTIC, A_LAWFUL, A_NEUTRAL, A_NONE, A_STR, BASICENLIGHTENMENT, BLINDED, BUFSZ, ECMD_OK, ENL_GAMEINPROGRESS, LEG, LL_SPOILER, LOW_PM, MAGICENLIGHTENMENT, M_AP_NOTHING, M_AP_TYPE, NHW_MENU, N_ACH, SICK_NONVOMITABLE, SICK_VOMITABLE, STR18, STRAT_WAITMASK, TIMEOUT, TT_BURIEDBALL, TT_INFLOOR, TT_LAVA, VANQ_ALPHA_MIX, VANQ_ALPHA_SEP, VANQ_COUNT_H_L, VANQ_COUNT_L_H, VANQ_MCLS_HTOL, VANQ_MCLS_LTOH, VANQ_MSTR_MNDX, WIN_ERR, WOUNDED_LEGS } from './const.js'; // relocate-fns
import { is_pool_or_lava } from './dbridge.js'; // relocate-fns
import { await_more_dismiss, flush_screen } from './display.js'; // relocate-fns
import { discover, wizard } from './gstate.js'; // relocate-fns
import { digit, upstart } from './hacklib.js'; // relocate-fns
import { monsym_explain } from './makemon.js';
import { trapname } from './trap.js'; // relocate-fns
import monsPack from './makemon_mons.json' with { type: 'json' }; // relocate-fns
import monPmnamesPack from './makemon_pmnames.json' with { type: 'json' }; // relocate-fns
import { a_monnam, hliquid, x_monnam } from './do_name.js'; // relocate-fns
import { objName as _objName_full, makeplural, makeplural as makeplural_objnam, the } from './objnam.js'; // relocate-fns
import { livelog_printf, impossible as real_impossible } from './pline.js'; // relocate-fns
import { NUMMONS, PM_DEATH, PM_FAMINE, PM_HIGH_PRIEST, PM_PESTILENCE } from './pm.generated.js'; // relocate-fns
import { body_part, mbodypart } from './polyself.js'; // relocate-fns
import { mon_aligntyp as mon_aligntyp_real } from './priest.js'; // relocate-fns
import { reg_damg, visible_region_at } from './region.js'; // relocate-fns
import { t_at } from './trap.js'; // relocate-fns
import { add_menu_str } from './windows.js'; // relocate-fns
import { count_wsegs as count_wsegs_real, wseg_at } from './worm.js'; // relocate-fns
import { find_mac } from './worn.js'; // relocate-fns

const M_AP_MONSTER_local = 3;        /* monst.h:55 */

// ── C insight.c:2027 youhiding(via_enlghtmt, msgflag) — the dohide() topline. ──
// C ref: nethack-c/src/insight.c:2027-2082.  RNG-free.
//
//   Strcpy(buf, "hiding");
//   if (U_AP_TYPE != M_AP_NOTHING) {          /* mimic */
//       bp = eos(strcpy(buf, "mimicking"));
//       if (U_AP_TYPE == M_AP_OBJECT)    Sprintf(bp, " %s",
//                          an(simple_typename(gy.youmonst.mappearance)));
//       else if (U_AP_TYPE == M_AP_FURNITURE) Strcpy(bp, " something");
//       else if (U_AP_TYPE == M_AP_MONSTER)   Strcpy(bp, " someone");
//   if (via_enlghtmt) you_are(buf, "");
//   else You("are %s %s.", msgflag ? "already" : "now", buf);
//
// mappearance == STRANGE_OBJECT: "You are now mimicking a strange object."
export function youhiding_buf() {
    const g = game;
    const u = g.u;
    let buf = 'hiding';
    const apType = (g.youmonst?.m_ap_type | 0) & 7;
    if (apType !== M_AP_NOTHING_local) {
        buf = 'mimicking';
        if (apType === M_AP_OBJECT_local)
            buf += ' ' + an(simple_typename(g.youmonst.mappearance | 0));
        else if (apType === M_AP_FURNITURE_local)
            buf += ' something';
        else if (apType === M_AP_MONSTER_local)
            buf += ' someone';
        /* else: something unexpected — C leaves 'buf' as "mimicking" */
    } else if (u.uundetected) {
        const data = g.youmonst?.data;
        if (data && (data.mlet | 0) === S_EEL) {
            if (is_pool(u.ux, u.uy))
                buf += ' in the ' + waterbody_name(u.ux, u.uy);
        } else if (data && _hides_under(data)) {
            const otmp = g.level?.levelObjects?.[u.ux]?.[u.uy] ?? null;
            if (otmp)
                buf += ' underneath ' + ansimpleoname(otmp);
        } else if ((data && ((data.mflags1 | 0) & M1_CLING) !== 0)
                            || (((u.uprops?.[FLYING]?.intrinsic | 0)
                                 || (u.uprops?.[FLYING]?.extrinsic | 0)
                                 || (u.usteed?.data?.mflags1 & M1_FLY))
                                && !(u.uprops?.[FLYING]?.blocked | 0))) {
            /* Flying forms hide on the ceiling even when they do not cling. */
            buf += ' on the ' + ceiling(u.ux, u.uy);
        } else if (u.utrap && (u.utraptype | 0) === TT_PIT) {
            const traps = g.level?.traps;
            const trap = Array.isArray(traps)
                ? traps.find(t => (t.tx | 0) === (u.ux | 0)
                              && (t.ty | 0) === (u.uy | 0)) : null;
            buf += ' in a ' + (trap && (trap.ttyp | 0) === SPIKED_PIT
                ? 'spiked ' : '') + 'pit';
        } else {
            buf += ' on the ' + surface(u.ux, u.uy);
        }
    }
    return buf;
}

export function youhiding(via_enlghtmt, msgflag) {
    const buf = youhiding_buf();
    if (via_enlghtmt) {
        youhiding_enlightenment(buf, msgflag);
        return;
    }
    /* C insight.c:2075: finish the blocking message before dohide returns. */
    return pline(`You are ${msgflag ? 'already' : 'now'} ${buf}.`);
}

// C ref: insight.c:3421-3510 ustatusline() — full self-probe status line.
export async function ustatusline() {
    const g = game;
    const u = g.u || {};
    let info = '';

    /* insight.c:3409-3428 — sick/stoned/slimed/strangled/vomiting */
    if (_uprop_active('SICK')) {
        info += ', dying from';
        const st = _usick_type();
        if (st & SICK_VOMITABLE) info += ' food poisoning';
        if (st & SICK_NONVOMITABLE) {
            if (st & SICK_VOMITABLE) info += ' and';
            info += ' illness';
        }
    }
    if (_uprop_active('STONED')) info += ', solidifying';
    if (_uprop_active('SLIMED')) info += ', becoming slimy';
    if (_uprop_active('STRANGLED')) info += ', being strangled';
    if (_uprop_active('VOMITING')) info += ', nauseated';
    if (_uprop_active('CONFUSION')) info += ', confused';

    /* insight.c:3429-3437 — blind (+ creamed goop detail) */
    if (_uprop_active('BLINDED')) {
        info += ', blind';
        if (u.ucreamed) {
            const BlindedTimeout = ((u.uprops?.[BLINDED]?.intrinsic | 0) & TIMEOUT);
            const Blindfolded = _Blindfolded();
            if (u.ucreamed < BlindedTimeout || Blindfolded
                || !_haseyes(g.youmonst?.data))
                info += ', cover';
            info += 'ed by sticky goop';
        }
    }
    if (_uprop_active('STUNNED')) info += ', stunned';

    /* insight.c:3440-3452 — Wounded_legs */
    const HWounded_legs = (u.uprops?.[WOUNDED_LEGS]?.intrinsic | 0);
    const EWounded_legs = (u.uprops?.[WOUNDED_LEGS]?.extrinsic | 0);
    if ((EWounded_legs || HWounded_legs) && !u.usteed) {
        let legs = (EWounded_legs & BOTH_SIDES);
        let what = body_part(LEG);
        if (legs === BOTH_SIDES)
            what = makeplural(what);
        info += ', injured ' + what;
    }

    /* insight.c:3453-3454 — Glib */
    if (_uprop_active('GLIB'))
        info += ', slippery ' + _fingers_or_gloves(true);

    /* insight.c:3478-3484 */
    if (u.utrap) info += ', trapped';
    if (_uprop_active('FAST')) {
        /* C youprop.h:376-377: Very_fast is timeout-based HFast or EFast;
         * intrinsic-source bits alone are Fast, not Very_fast. */
        info += _enl_Very_fast() ? ', very fast' : ', fast';
    }
    if (u.uundetected)
        info += ', concealed';
    else if (M_AP_TYPE(g.youmonst) !== M_AP_NOTHING)
        info += ', disguised';
    if (_uprop_active('INVIS')) info += ', invisible';

    /* insight.c:3485-3499 — u.ustuck */
    if (u.ustuck) {
        if (u.uswallow)
            info += _digests(u.ustuck.data) ? ', being digested by ' : ', engulfed by ';
        else if (!_sticks())
            info += ', held by ';
        else
            info += ', holding ';
        info += _a_monnam(u.ustuck);
    }

    /* insight.c:3500-3503 — visible_region_at */
    if (!u.uswallow) {
        let reg = _visible_region_at(u.ux, u.uy);
        if (reg && info.length < BUFSZ) {
            info += ', in a cloud of ' + (_reg_damg(reg) ? 'poison gas' : 'vapor');
        }
    }

    /* insight.c:3505-3508 — the status line itself */
    /* C you.h:554 Upolyd := (u.umonnum != u.umonster).  `u.Upolyd`/`u.upolyd`
     * are two field spellings NOTHING in js/ ever assigns — a constant false;
     * the same defect js/cmd.js _self_lookat_base already fixed. */
    const upolyd = (u.umonnum | 0) !== (u.umonster | 0);
    /* C insight.c:3505 reads the current form's permonst row through
     * gy.youmonst.data; there is no game-level `mons` array in this port. */
    const level = upolyd ? (g.youmonst?.data?.mlevel | 0) : (u.ulevel | 0);
    const hp = upolyd ? (u.mh | 0) : (u.uhp | 0);
    const hpmax = upolyd ? (u.mhmax | 0) : (u.uhpmax | 0);
    const plname = String(g.plname ?? g.u?.plname ?? '');
    await pline('Status of ' + plname + ' (' + _piousness(false, _align_str(u.ualign?.type | 0)) + '):  Level ' + level + '  HP ' + hp + '(' + hpmax + ')  AC ' + (u.uac | 0) + info + '.');
}

function _reg_damg(reg) { return reg_damg(reg); }

/* C do_name.c:1152-1156: named monsters suppress the saddle adjective;
 * insight.c:3477 uses that same a_monnam() for the hero's holder. */
function _a_monnam(mtmp) { return a_monnam(mtmp); }

function _visible_region_at(x, y) { return visible_region_at(x, y); }

// C ref: insight.c mstatusline() — monster status line for stethoscope/probing.
export async function mstatusline(mtmp) {
    const g = game;
    const u = g.u || {};
    const alignment = _mon_aligntyp_local(mtmp);
    let info = '';

    if (mtmp.mtame) {
        info += ', tame';
        if (wizard()) {
            info += _Sprintf_local(' (%d', mtmp.mtame);
            if (!mtmp.isminion)
                info += _Sprintf_local('; hungry %ld; apport %d',
                    _EDOG_local(mtmp).hungrytime, _EDOG_local(mtmp).apport);
            info += ')';
        }
    } else if (mtmp.mpeaceful)
        info += ', peaceful';

    if (mtmp.data && mtmp.data.pmidx === _PM_LONG_WORM) {
        let nsegs = _count_wsegs_local(mtmp);
        if (!nsegs) {
            info += ', single segment';
        } else {
            ++nsegs;
            let segndx = _wseg_at_local(mtmp, (g.bhitpos ?? g.gb?.bhitpos)?.x, (g.bhitpos ?? g.gb?.bhitpos)?.y);
            info += _Sprintf_local(', %d%s of %d segments',
                segndx, _ordin_local(segndx), nsegs);
        }
    }

    /* C insight.c:3308 `ismnum(mtmp->cham) && mtmp->data != &mons[mtmp->cham]`
       — a permonst POINTER comparison against the mons[] row for the innate
       form, i.e. "current form differs from innate form?". monsPack.mons[i]
       is a raw JSON row, never the object hanging off mtmp.data (which
       js/makemon.js permonstTemplate() mints fresh per call), so `!==` here
       was unconditionally true and the guard never blocked. Ported as the
       index comparison the pointer test means; a null mtmp.data reads as -1
       so it stays != cham, matching C's NULL != &mons[cham]. */
    if (_ismnum_local(mtmp.cham)
        && (mtmp.data ? (mtmp.data.pmidx | 0) : -1) !== (mtmp.cham | 0))
        info += ', shapechanger';

    if (mtmp.meating)
        info += ', eating';

    if (mtmp.mundetected || mtmp.m_ap_type
        || _visible_region_at(g.gb?.bhitpos?.x, g.gb?.bhitpos?.y))
        info += await mhidden_description(mtmp, mtmp.mx, mtmp.my, true);

    if (mtmp.mcan) info += ', cancelled';
    if (mtmp.mconf) info += ', confused';
    if (mtmp.mblinded || !mtmp.mcansee) info += ', blind';
    if (mtmp.mstun) info += ', stunned';
    if (mtmp.msleeping) info += ', asleep';
    else if (mtmp.mfrozen || !mtmp.mcanmove) info += ", can't move";
    else if ((mtmp.mstrategy & STRAT_WAITMASK) !== 0) info += ', meditating';

    if (mtmp.mflee) info += ', scared';
    if (mtmp.mtrapped) info += ', trapped';
    if (mtmp.mspeed) {
        info += (mtmp.mspeed === _MFAST) ? ', fast'
              : (mtmp.mspeed === _MSLOW) ? ', slow'
              : ', [? speed]';
    }
    if (mtmp.minvis) info += ', invisible';

    if (mtmp === u.ustuck) {
        let pm = u.ustuck.data;
        info += u.uswallow ? (_digests(pm) ? ', digesting you'
                               : (_is_animal_local(pm) && !_enfolds_local(pm))
                                 ? ', swallowing you'
                                 : ', engulfing you')
                 : (!_sticks() ? ', holding you'
                               : ', held by you');
    }

    if (mtmp === u.usteed) {
        info += ', carrying you';
        let HWounded = u.uprops?.[WOUNDED_LEGS]?.intrinsic | 0;
        let EWounded = u.uprops?.[WOUNDED_LEGS]?.extrinsic | 0;
        if (EWounded || HWounded) {
            let legs = (EWounded & _BOTH_SIDES);
            let what = mbodypart(mtmp, _LEG); // C insight.c:3380
            if (legs === _BOTH_SIDES)
                what = makeplural(what);
            info += _Sprintf_local(', injured %s', what);
        }
    }

    if (mtmp.mleashed)
        info += ', leashed';

    let monnambuf = x_monnam(mtmp, _ARTICLE_YOUR, null,
        _SUPPRESS_IT | _SUPPRESS_INVISIBLE, false);

    return pline('Status of %s (%s, %s):  Level %d  HP %d(%d)  AC %d%s.',
        monnambuf, _align_str(alignment), _size_str_local(mtmp.data?.msize),
        mtmp.m_lev, mtmp.mhp, mtmp.mhpmax, find_mac(mtmp), info);
}

// ── mstatusline local helpers / stubs ──
const _PM_LONG_WORM = 114;

const _MFAST = 2;

const _MSLOW = 1;

/* mstatusline tests monst.h:177 STRAT_WAITMASK = STRAT_CLOSE|STRAT_WAITFORU
 * = 0x10000000|0x20000000; the removed local `_STRAT_WAITMASK` held 0x44,
 * which is the unrelated monflag.h M3_WAITFORU|M3_CLOSE pair.  Use the
 * const.js export (already imported at the top of this file). */
const _BOTH_SIDES = (0x00020000 | 0x00040000); /* prop.h LEFT_SIDE|RIGHT_SIDE */

const _LEG = 9;

const _ARTICLE_YOUR = 3;

function _mon_aligntyp_local(mtmp) { return mon_aligntyp_real(mtmp); }

function _count_wsegs_local(mtmp) { return count_wsegs_real(mtmp); }

function _wseg_at_local(mtmp, x, y) { return wseg_at(mtmp, x, y); }

/* C insight.c:3203 size_str(msize) */
function _size_str_local(msize) {
    /* C monflag.h:177-183 uses sparse MZ_* values; MZ_GIGANTIC is 7,
     * while 5 and 6 retain size_str()'s unknown-size fallback. */
    switch (msize) {
    case 0: return 'tiny';     /* MZ_TINY */
    case 1: return 'small';    /* MZ_SMALL */
    case 2: return 'medium';   /* MZ_MEDIUM */
    case 3: return 'large';    /* MZ_LARGE */
    case 4: return 'huge';     /* MZ_HUGE */
    case 7: return 'gigantic'; /* MZ_GIGANTIC */
    default: return `unknown size (${msize})`;
    }
}

function _Sprintf_local(fmt) {
    let result = fmt;
    let ai = 1;
    let args = arguments;
    result = result.replace(/%s|%ld|%d/g, function() { return String(args[ai++]); });
    return result;
}

function _ordin_local(n) {
    const dd = n % 10;
    if (dd === 0 || dd > 3 || Math.trunc((n % 100) / 10) === 1) return 'th';
    else if (dd === 1) return 'st';
    else if (dd === 2) return 'nd';
    else return 'rd';
}

// C ref: insight.c:2540 do_gamelog() — the '#chronicle' command bound to 'v'.
//
//   int do_gamelog(void) {
//   #ifdef CHRONICLE
//       if (gg.gamelog) {
//           show_gamelog(ENL_GAMEINPROGRESS);
//       } else {
//           pline("No chronicled events.");
//       }
//   #else
//       pline("Chronicle was turned off during compile-time.");
//   #endif
//       return ECMD_OK;
//   }
//
// CHRONICLE is #defined (nethack-c/include/config.h:660), so the active branch
// is the #ifdef-CHRONICLE one.  `gg.gamelog` is the head of a linked list of
// chronicled events; it is NULL until a chronicle event is logged.  For every
// emitting event has fired), gg.gamelog is NULL → the `pline("No chronicled
// events.")` branch is taken.  show_gamelog is therefore not reachable from
//
// ECMD_OK: command does not consume a turn.  context.move is left as caller
// set it (in rhack the caller default for a non-movement command branch is 0;
// see e.g. the 'i' / ':' arms above which also return ECMD_OK).  This mirrors
// dolook's contract (look.js:165) for the sighted case.
//
// Zero RNG calls on this path.
export async function do_gamelog() {
    /* C ref: insight.c:2532-2543 do_gamelog() */
    const g = game;
    g.gamelog = g.gamelog || [];
    if (g.gamelog.length > 0) {
        /* C ref: insight.c:2535 — show_gamelog(ENL_GAMEINPROGRESS). */
        await show_gamelog(ENL_GAMEINPROGRESS);
    } else {
        await pline('No chronicled events.');
    }
    /* C ref: insight.c:2543 — returns ECMD_OK on every path; rhack handles command vars. */
    return ECMD_OK;
}

/* ENL_GAMEINPROGRESS (used by do_gamelog/show_gamelog) is imported from
 * js/const.js with the rest of the ENL_/*ENLIGHTENMENT family; it used to be
 * re-declared here as a file-local 0. */
/* C ref: global.h LL flags — only the ones show_gamelog inspects. */
const LL_majors = (0x4000 /*LL_WISH*/ | 0x0002 /*LL_ACHIEVE*/ | 0x0008 /*LL_UMONST*/
                   | 0x0010 /*LL_DIVINEGIFT*/ | 0x0080 /*LL_LIFESAVE*/
                   | 0x0100 /*LL_ARTIFACT*/ | 0x0200 /*LL_GENOCIDE*/ | 0x1000 /*LL_DUMP*/);

// C ref: insight.c:2571 show_gamelog(int final) — the '#chronicle' detail window.
//
//   void show_gamelog(int final) {
//       struct gamelog_line *llmsg; winid win; char buf[BUFSZ]; int eventcnt = 0;
//       win = create_nhwindow(NHW_TEXT);
//       Sprintf(buf, "%s events:", final ? "Major" : "Logged");
//       putstr(win, 0, buf);
//       for (llmsg = gg.gamelog; llmsg; llmsg = llmsg->next) {
//           if (final && !majorevent(llmsg)) continue;
//           if (!final && !wizard && spoilerevent(llmsg)) continue;
//           if (!eventcnt++) putstr(win, 0, " Turn");
//           Snprintf(buf, sizeof buf, "%5ld: %s", llmsg->turn, llmsg->text);
//           putstr(win, 0, buf);
//       }
//       if (!eventcnt) putstr(win, 0, " none");
//       display_nhwindow(win, TRUE); destroy_nhwindow(win);
//   }
//
// tty rendering (NHW_TEXT, full-screen at offx=0): putstr lines render at
// column 0 from row 0; display_nhwindow(win, TRUE) pads to the full 24-row
// screen and shows "--More--" at the bottom row (row 23), then reads nhgetch
// until the window is dismissed.  Cursor lands just past "--More--"
// (col = len("--More--") = 8, row 23).  Verified byte-exact against
//
// Zero RNG calls on this path (window build + render only).
async function show_gamelog(final) {
    const g = game;
    const wiz = wizard();
    const lines = [];
    /* Sprintf(buf, "%s events:", final ? "Major" : "Logged") */
    lines.push(`${final ? 'Major' : 'Logged'} events:`);
    let eventcnt = 0;
    for (const llmsg of (g.gamelog || [])) {
        if (final && (((llmsg.flags | 0) & LL_majors) === 0))
            continue;
        if (!final && !wiz && (((llmsg.flags | 0) & LL_SPOILER) !== 0))
            continue;
        if (!eventcnt++)
            lines.push(' Turn');
        /* Snprintf(buf, "%5ld: %s", llmsg->turn, llmsg->text) — %5ld right-justified. */
        const turnStr = String(llmsg.turn | 0).padStart(5, ' ');
        lines.push(`${turnStr}: ${llmsg.text}`);
    }
    if (!eventcnt)
        lines.push(' none');
    /* display_nhwindow(win, TRUE) for a full-screen NHW_TEXT window:
     * render putstr lines at column 0, pad the remaining rows blank, and
     * place "--More--" at the last screen row (row 23).  C ref: tty TEXT
     * window with offx=0 (confirmed by step-12 erase_menu_or_text[offx=0]). */
    /* tty_putstr() runs non-message text through compress_str() when it is
     * at least CO columns wide, then wraps it at the last blank before CO.
     * Besides collapsing whitespace, compress_str() deliberately discards
     * leading blanks.  This matters for long chronicle entries: their %5ld
     * indentation disappears before the line is split (wintty.c:2198-2218,
     * 2402-2417). */
    const ttyTextLines = [];
    for (const sourceLine of lines) {
        const pending = [sourceLine];
        while (pending.length) {
            let line = pending.shift();
            if (line.length >= 80 || line.includes('\n'))
                line = line.replace(/[ \n]+/g, ' ').trim();
            if (line.length >= 80) {
                let split = 79;
                while (split > 0 && line[split] !== ' ' && line[split] !== '\n')
                    split--;
                if (split > 0) {
                    ttyTextLines.push(line.slice(0, split));
                    pending.unshift(line.slice(split + 1));
                    continue;
                }
            }
            /* process_text_window prints at most columns 0..78. */
            ttyTextLines.push(line.slice(0, 79));
        }
    }
    /* display_nhwindow(win, TRUE) → process_text_window: a window longer than
     * the 23 usable rows is shown a page at a time, each ending in "--More--"
     * (wintty.c:1499-1537); display_text_window models that paging, the
     * quitchars-only dismissal and ESC → WIN_CANCELLED. */
    await display_text_window(ttyTextLines);
}

// C ref: cmd.c — '^X' (C('x'), charCode 24) is bound to doattributes()
//   (cmd.c:2510).  doattributes() (insight.c:2517) calls
//   enlightenment(BASICENLIGHTENMENT, ENL_GAMEINPROGRESS) and returns ECMD_OK
//   (no turn, no RNG).
//
// enlightenment() (insight.c:360) builds an NHW_MENU window:
//   title  = "<Name> the <rank>'s attributes:"
//   background_enlightenment()    — role/race/align/deities/dungeon/time/exp
//   basics_enlightenment()        — hp/energy/armor class/gold/autopickup
//   characteristics_enlightenment() — Str/Dex/Con/Int/Wis/Cha
//   status_enlightenment()        — hunger/encumbrance/wielded weapon/skill
//   "Miscellaneous:" + fmt_elapsed_time()
// then displays the (too-tall) menu, which tty paginates: 23 content rows on
// page 1 (with " (1 of N)" on screen row 23) and the remainder on page 2.
//
// SCOPE: this port reproduces the BASICENLIGHTENMENT lines for the
// game-in-progress (final==ENL_GAMEINPROGRESS), non-polymorphed hero.  The
// deity pantheon names, weapon-skill name and starting wielded weapon are not
// yet backed by ported tables (quest_pgr/skills/inventory), so they are
// derived from the live role + the role's deterministic starting kit.  Lines
// whose text depends on live game state (turn count, experience, attributes,
// hp/energy, AC, hunger) are read from `game` so both ^X presses in
//
// build_enlightenment_lines() returns the raw content lines (WITHOUT the menu
// leading-space prefix).  enlght_out lines that came from the You_ macro
// already carry a leading space (You_ == " You "); category headers do not.
/* C insight.c:233-268; the counter counts escape attempts, not turns. */
export function trap_predicament(final = 0, wizxtra = false) {
    const u = game.u;
    let description;
    switch (u.utraptype) {
    case TT_BURIEDBALL: description = 'tethered to something buried'; break;
    case TT_LAVA: description = `sinking into ${final ? 'lava' : hliquid('lava')}`; break;
    case TT_INFLOOR: description = `stuck in ${the(surface(u.ux, u.uy))}`; break;
    default: {
        const trap = t_at(u.ux, u.uy);
        description = 'trapped' + (trap ? ` in ${an(trapname(trap.ttyp, false))}` : '');
        break;
    }
    }
    return description + (wizxtra ? ` {${u.utrap >>> 0}}` : '');
}

/* C insight.c:159-197; defense uses wider descriptive ranges. */
export function enlght_combatinc(inctyp, incamt, final) {
    let absamt = Math.abs(incamt);
    if (inctyp === 'defense') absamt = Math.trunc(absamt * 2 / 3);
    const adjective = absamt <= 3 ? 'small' : absamt <= 6 ? 'moderate'
        : absamt <= 12 ? 'large' : 'huge';
    const modif = incamt ? an(adjective) : 'no';
    const bonus = incamt >= 0 ? 'bonus' : 'penalty';
    let buf = inctyp === 'to hit' ? `${modif} ${bonus} ${inctyp}`
        : `${modif} ${inctyp} ${bonus}`;
    if (final || wizard()) buf += ` (${incamt > 0 ? '+' : ''}${incamt})`;
    return buf;
}

/* C insight.c:200-220; the caller appends this line to its menu. */
export async function enlght_halfdmg(category, final) {
    const name = category === HALF_PHDAM_ART ? 'physical'
        : category === HALF_SPDAM_ART ? 'spell' : 'unknown';
    return _enlght_line('You ', final ? 'took' : 'take',
        ` ${final || wizard() ? 'half' : 'reduced'} ${name} damage`,
        await _from_what(category));
}

/* C insight.c:223-229; active support, rather than the potential ability. */
export function walking_on_water() {
    const u = game.u;
    if (u.uinwater || _Levitation() || _Flying()) return false;
    return !!(pooleffects_Wwalking() && is_pool_or_lava(u.ux, u.uy));
}

/* C insight.c:313-357. Times are seconds, from the game's clock. */
export function fmt_elapsed_time(final) {
    const clock = game.urealtime;
    let etim = clock?.realtime ?? 0;
    if (!final && clock)
        etim += Math.trunc(getnow() - clock.start_timing);
    const seconds = etim % 60;
    etim = Math.trunc(etim / 60);
    const minutes = etim % 60;
    etim = Math.trunc(etim / 60);
    const hours = etim % 24, days = Math.trunc(etim / 24);
    const fields = [];
    for (const [n, unit] of [[days, 'day'], [hours, 'hour'],
                             [minutes, 'minute'], [seconds, 'second']])
        if (n) fields.push(`${n} ${unit}${n === 1 ? '' : 's'}`);
    if (!fields.length) return ' none';
    if (fields.length === 1) return ` ${fields[0]}`;
    return ` ${fields.slice(0, -1).join(', ')} and ${fields.at(-1)}`;
}

/* C ref: insight.c:43 static const char You_[] = "You ", ... */
const _CONDUCT_You_ = "You ";

const _CONDUCT_have = "have ";

const _CONDUCT_have_been = "have been ";

const _CONDUCT_were = "were ";

const _CONDUCT_have_never = "have never ";

const _CONDUCT_never = "never ";

/* C ref: insight.c:116 enlght_out(const char *buf) */
function enlght_out(buf) {
    if (game.en_via_menu) {
        add_menu_str(game.en_win, buf);
    } else {
        putstr(game.en_win, 0, buf);
    }
}

/* C ref: insight.c:125 enlght_line(start, middle, end, ps) */
export function enlght_line(start, middle, end, ps) {
    const CONTRA = [
        [" are not ", " aren't "],
        [" were not ", " weren't "],
        [" have not ", " haven't "],
        [" had not ", " hadn't "],
        [" can not ", " can't "],
        [" could not ", " couldn't "],
    ];
    let buf = ` ${start}${middle}${end}${ps}.`;
    if (buf.indexOf(" not ") !== -1) {
        for (const [twowords, contrctn] of CONTRA)
            buf = buf.split(twowords).join(contrctn);
    }
    enlght_out(buf);
}

/* C ref: insight.c:109 #define you_have_been(goodthing) */
function you_have_been(final, goodthing) {
    enl_msg(final, _CONDUCT_You_, _CONDUCT_have_been, _CONDUCT_were, goodthing, "");
}

/* C ref: insight.c:111 #define you_have_never(badthing) */
function you_have_never(final, badthing) {
    enl_msg(final, _CONDUCT_You_, _CONDUCT_have_never, _CONDUCT_never, badthing, "");
}

/* C ref: insight.c:113 #define you_have_X(something) */
function you_have_X(final, something) {
    enl_msg(final, _CONDUCT_You_, _CONDUCT_have, "", something, "");
}

/* C insight.c:2494 count_achievements() — `for (i = 0; u.uachieved[i]; ++i)`.
 * u.uachieved has no writer in this tree, so the count is 0; exported because
 * disclose() needs it to choose between "your conduct?" and "your conduct and
 * achievements?" — a wrong choice there changes the prompt TEXT, which is a
 * whole scored frame. */
export function count_achievements() {
    const ach = game.u?.uachieved;
    if (!Array.isArray(ach)) return 0;
    let acnt = 0;
    while (ach[acnt]) ++acnt;
    return acnt;
}

/* C insight.c:2953 num_genocides().  mvitals and the monster table are both
 * present in the JS state; count the G_GENOD bit directly. */
function num_genocides() {
    const G_GENOD = 0x02;
    const vitals = game.mvitals || [];
    let n = 0;
    for (let i = LOW_PM; i < NUMMONS; i++)
        if ((vitals[i]?.mvflags | 0) & G_GENOD) n++;
    return n;
}

/* C insight.c:2527-2537 sokoban_in_play() — the branch is considered active
 * once the corresponding achievement has been recorded. */
function sokoban_in_play() {
    const achieved = game.u?.uachieved;
    if (!Array.isArray(achieved)) return false;
    for (let i = 0; i < achieved.length && achieved[i]; i++)
        if ((achieved[i] | 0) === ACH_SOKO) return true;
    return false;
}

async function show_achievements(final) {
    const u = game.u || {};
    let acnt;
    let awin = WIN_ERR;
    /* C: "we can't show the achievements while the game is in progress because
       it would give away the ID of luckstone (at Mine's End) and of the real
       Amulet of Yendor" */
    if (!final && !wizard())
        return;
    if ((acnt = count_achievements()) === 0)
        return;
    /* C insight.c:2264-2270 — append to the disclosure window when there is one. */
    if (game.en_win !== undefined && game.en_win !== null && game.en_win !== WIN_ERR) {
        awin = game.en_win;
        putstr(awin, 0, '');
    } else {
        awin = create_nhwindow(NHW_MENU);
    }
    putstr(awin, 0, `Achievement${plur(acnt)}:`);
    /* C insight.c:2277-2283 — keep Amulet delivery immediately before victory. */
    if (remove_achievement(ACH_UWIN)) {
        if (remove_achievement(ACH_AMUL)) record_achievement(ACH_AMUL);
        record_achievement(ACH_UWIN);
    }
    const ach = Array.isArray(u.uachieved) ? u.uachieved : [];
    for (let i = 0; i < acnt; ++i) {
        const achidx = ach[i] | 0;
        const absidx = Math.abs(achidx);
        switch (absidx) {
        case ACH_BLND:
            enl_msg(final, _CONDUCT_You_, 'are exploring', 'explored',
                    ' without being able to see', '');
            break;
        case ACH_NUDE:
            enl_msg(final, _CONDUCT_You_, 'have gone', 'went',
                    ' without any armor', '');
            break;
        case ACH_MINE:   you_have_X(final, 'entered the Gnomish Mines'); break;
        case ACH_TOWN:   you_have_X(final, 'entered Minetown'); break;
        case ACH_SHOP:   you_have_X(final, 'entered a shop'); break;
        case ACH_TMPL:   you_have_X(final, 'entered a temple'); break;
        case ACH_ORCL:   you_have_X(final, 'consulted the Oracle of Delphi'); break;
        case ACH_NOVL:   you_have_X(final, 'read from a Discworld novel'); break;
        case ACH_SOKO:   you_have_X(final, 'entered Sokoban'); break;
        case ACH_SOKO_PRIZE: you_have_X(final, 'completed Sokoban'); break;
        case ACH_MINE_PRIZE: you_have_X(final, 'completed the Gnomish Mines'); break;
        case ACH_BGRM:   you_have_X(final, 'entered the Big Room'); break;
        case ACH_MEDU:   you_have_X(final, 'defeated Medusa'); break;
        case ACH_TUNE:
            you_have_X(final,
                "learned the tune to open and close the Castle's drawbridge");
            break;
        case ACH_BELL:
            /* C: "alternate phrasing for present vs past and also for
               possessing the item vs once held it" */
            enl_msg(final, _CONDUCT_You_,
                    u.uhave?.bell ? 'have' : 'have handled',
                    u.uhave?.bell ? 'had' : 'handled',
                    ' the Bell of Opening', '');
            break;
        case ACH_HELL:
            enl_msg(final, _CONDUCT_You_, 'have ', '', 'entered Gehennom', '');
            break;
        case ACH_CNDL:
            enl_msg(final, _CONDUCT_You_,
                    u.uhave?.menorah ? 'have' : 'have handled',
                    u.uhave?.menorah ? 'had' : 'handled',
                    ' the Candelabrum of Invocation', '');
            break;
        case ACH_BOOK:
            enl_msg(final, _CONDUCT_You_,
                    u.uhave?.book ? 'have' : 'have handled',
                    u.uhave?.book ? 'had' : 'handled',
                    ' the Book of the Dead', '');
            break;
        case ACH_INVK:
            you_have_X(final, "gained access to Moloch's Sanctum");
            break;
        case ACH_AMUL:
            /* C: "alternate wording for ascended (always past tense) since hero
               had it until #offer forced it to be relinquished" */
            enl_msg(final, _CONDUCT_You_,
                    u.uhave?.amulet ? 'have' : 'have obtained',
                    u.uevent?.ascended ? 'delivered'
                      : u.uhave?.amulet ? 'had' : 'had obtained',
                    ' the Amulet of Yendor', '');
            break;
        /* C: "reaching Astral makes feedback about reaching the Planes be
           redundant and ascending makes both be redundant, but we display all
           that apply" */
        case ACH_ENDG:   you_have_X(final, 'reached the Elemental Planes'); break;
        case ACH_ASTR:   you_have_X(final, 'reached the Astral Plane'); break;
        case ACH_UWIN:   enlght_out(' You ascended!'); break;
        /* C: "rank 0 is the starting condition, not an achievement; 8 is Xp 30" */
        case ACH_RNK1: case ACH_RNK2: case ACH_RNK3: case ACH_RNK4:
        case ACH_RNK5: case ACH_RNK6: case ACH_RNK7: case ACH_RNK8:
            you_have_X(final,
                `attained the rank of ${_ach_rank_of(rank_to_xlev_cmd(absidx - (ACH_RNK1 - 1)),
                                                    achidx < 0)}`);
            break;
        default:
            enlght_out(` [Unexpected achievement #${achidx}.]`);
            break;
        }
    }
    if (awin !== game.en_win) {
        await display_nhwindow(awin, true);
        destroy_nhwindow(awin);
    }
}

/* C botl.c:315-329 rank_to_xlev_cmd(rank) — the LOW end of each rank's xlevel
 * range: 0 => 1, 1 => 3, 2..7 => rank*4 - 2, 8 => 30. */
function rank_to_xlev_cmd(rank) {
    return ((rank | 0) < 1) ? 1 : ((rank | 0) < 2) ? 3
         : ((rank | 0) < 8) ? (((rank | 0) * 4) - 2) : 30;
}

async function list_vanquished_yn_function(qbuf, choices, def, addcmdq) {
    return (await yn_function(qbuf, choices,
                              String.fromCharCode(def | 0), addcmdq)).charCodeAt(0);
}

const _VANQ_S_ZOMBIE = 52, _VANQ_S_HUMAN = 53, _VANQ_S_GHOST = 54,
      _VANQ_S_GOLEM = 55, _VANQ_S_DEMON = 56, _VANQ_S_EEL = 57,
      _VANQ_S_LIZARD = 58;

/* C's `static const char punctclasses[]`, in C's order. */
const _VANQ_PUNCTCLASSES = [_VANQ_S_LIZARD, _VANQ_S_EEL, _VANQ_S_GOLEM,
                            _VANQ_S_GHOST, _VANQ_S_DEMON, _VANQ_S_HUMAN];

function list_vanquished_vanqsort_cmp(indx1, indx2) {
    const g = game;
    const MONS = monsPack.mons;
    const MONS_PMNAMES = monPmnamesPack.pmnames;
    const NEUTRAL = 2;
    const G_UNIQ = 0x1000;
    const sortmode = g.flags?.vanq_sortmode | 0;
    const is_rider = (i) => (i === PM_DEATH || i === PM_FAMINE || i === PM_PESTILENCE);
    let res;

    switch (sortmode) {
    case VANQ_MSTR_MNDX:
        /* sort by monster toughness — mons[].difficulty, high to low */
        res = (MONS[indx2][2] | 0) - (MONS[indx1][2] | 0);
        break;
    case VANQ_ALPHA_SEP: {
        const uniq1 = (((MONS[indx1][3] | 0) & G_UNIQ) !== 0 && indx1 !== PM_HIGH_PRIEST) ? 1 : 0;
        const uniq2 = (((MONS[indx2][3] | 0) & G_UNIQ) !== 0 && indx2 !== PM_HIGH_PRIEST) ? 1 : 0;
        if (uniq1 ^ uniq2) { /* one or other uniq, but not both */
            res = uniq2 - uniq1;
            break;
        } /* else both unique or neither unique — C FALLTHROUGH */
    }
    /* FALLTHROUGH */
    case VANQ_ALPHA_MIX: {
        /* caseblind alpha, low to high */
        const name1 = String(MONS_PMNAMES[indx1][NEUTRAL]).toLowerCase();
        const name2 = String(MONS_PMNAMES[indx2][NEUTRAL]).toLowerCase();
        res = (name1 < name2) ? -1 : (name1 > name2) ? 1 : 0;
        break;
    }
    case VANQ_MCLS_HTOL:
    case VANQ_MCLS_LTOH: {
        let mcls1 = MONS[indx1][0] | 0, mcls2 = MONS[indx2][0] | 0;
        if (mcls1 > _VANQ_S_ZOMBIE && mcls2 > _VANQ_S_ZOMBIE) {
            /* force a specific order to the punctuation classes that's
               different from the internal order */
            const p1 = _VANQ_PUNCTCLASSES.indexOf(mcls1);
            if (p1 >= 0) mcls1 = _VANQ_S_ZOMBIE + 1 + p1;
            const p2 = _VANQ_PUNCTCLASSES.indexOf(mcls2);
            if (p2 >= 0) mcls2 = _VANQ_S_ZOMBIE + 1 + p2;
        }
        res = mcls1 - mcls2; /* class */
        if (res === 0) {
            /* Riders share a class with major demons; force Riders first. */
            res = (is_rider(indx2) ? 1 : 0) - (is_rider(indx1) ? 1 : 0);
            if (res)
                break;
            res = (MONS[indx1][1] | 0) - (MONS[indx2][1] | 0); /* mlevel low to high */
            if (sortmode === VANQ_MCLS_HTOL)
                res = -res;
        }
        break;
    }
    case VANQ_COUNT_H_L:
    case VANQ_COUNT_L_H: {
        const died1 = (g.mvitals && g.mvitals[indx1]) ? (g.mvitals[indx1].died | 0) : 0;
        const died2 = (g.mvitals && g.mvitals[indx2]) ? (g.mvitals[indx2].died | 0) : 0;
        res = died2 - died1; /* dead count high to low */
        if (sortmode === VANQ_COUNT_L_H)
            res = -res;
        break;
    }
    default: /* C `default:` shares its label with VANQ_MLVL_MNDX */
        res = (MONS[indx2][1] | 0) - (MONS[indx1][1] | 0); /* mlevel high to low */
        break;
    }
    /* tiebreaker: internal mons[] index, low to high */
    if (res === 0)
        res = indx1 - indx2;
    return res;
}

function list_vanquished_class_explain(_mlet) {
    return monsym_explain(_mlet);
}

// C ref: insight.c:2793-2970 list_vanquished(char defquery, boolean ask)
// Used for '#vanquished' and end-of-game disclosure/dumplog (insight.c:2792).
//
//   UniqCritterIndx(mndx) macro (insight.c:2787-2788):
//     (mons[mndx].geno & G_UNIQ) != 0 && mndx != PM_HIGH_CLERIC
//   done_stopprint macro (insight.c:2790): program_state.stopprint
//
// Window primitives above retain the lines and render the blocking menu.
export async function list_vanquished(defquery, ask) {
    const g = game;
    const MONS = monsPack.mons;
    const MONS_PMNAMES = monPmnamesPack.pmnames;
    const G_UNIQ = 0x1000; /* C monflag.h G_UNIQ */
    const M2_PNAME = 0x00080000; /* C monflag.h M2_PNAME */
    const NEUTRAL = 2; /* C monflag.h mgender: MALE=0, FEMALE=1, NEUTRAL=2 */
    const CH_A = 65, CH_a = 97, CH_d = 100, CH_q = 113, CH_y = 121; /* 'A' 'a' 'd' 'q' 'y' */

    let total_killed = 0;
    const mindx = [];

    /* boolean force_sort = (defquery == 'A'), dumping = (defquery == 'd'); */
    const force_sort = (defquery === CH_A);
    const dumping = (defquery === CH_d);

    if (force_sort) {
        await list_vanquished_set_vanq_order(true);
    }
    if (dumping || force_sort) {
        defquery = CH_y;
        ask = false; /* redundant, matches C */
    }

    /* get totals first */
    let ntypes = 0;
    for (let i = LOW_PM; i < MONS.length; i++) {
        const nkilled = (g.mvitals && g.mvitals[i]) ? (g.mvitals[i].died | 0) : 0;
        if (nkilled === 0)
            continue;
        mindx[ntypes++] = i;
        total_killed += nkilled;
    }

    /* vanquished creatures list; includes all dead monsters, not just those
       killed by the player */
    if (ntypes !== 0) {
        let prev_mlet = 0;
        let was_uniq = false, special_hdr = false;
        let c;

        if (ask) {
            let allow_yn;
            if (ntypes > 1) {
                allow_yn = 'ynaq'; /* ynaqchars */
            } else {
                /* 'a' is accepted but, following ESC, not shown in the
                 * prompt's choice suffix (topl.c:410-428). */
                allow_yn = 'ynq\x1ba'; /* ynqchars + "\033a" (insight.c:2832-2833) */
                if (defquery === CH_a) /* potential default from 'disclose' */
                    defquery = CH_y;
            }
            c = await list_vanquished_yn_function(
                'Do you want an account of creatures vanquished?',
                allow_yn, defquery, true);
        } else {
            c = defquery;
        }

        if (c === CH_q) {
            g.program_state = g.program_state || {};
            g.program_state.stopprint = (g.program_state.stopprint | 0) + 1;
        }
        if (c === CH_y || c === CH_a) {
            if (c === CH_a && ntypes > 1) { /* ask user to choose sort order */
                if ((await list_vanquished_set_vanq_order(true)) < 0)
                    return;
            }
            const uniq_header = (g.flags.vanq_sortmode === VANQ_ALPHA_SEP);
            const class_header = ((g.flags.vanq_sortmode === VANQ_MCLS_LTOH
                                    || g.flags.vanq_sortmode === VANQ_MCLS_HTOL)
                                   && ntypes > 1);

            const klwin = create_nhwindow(NHW_MENU);
            putstr(klwin, 0, 'Vanquished creatures:');
            if (!dumping)
                putstr(klwin, 0, '');

            if (ntypes > 1)
                mindx.sort(list_vanquished_vanqsort_cmp);

            for (let ni = 0; ni < ntypes; ni++) {
                const i = mindx[ni];
                const nkilled = (g.mvitals && g.mvitals[i]) ? (g.mvitals[i].died | 0) : 0;
                const Rider = (i === PM_DEATH || i === PM_FAMINE || i === PM_PESTILENCE);
                const mlet = MONS[i][0];
                let buf;
                if (class_header
                    && (mlet !== prev_mlet || (special_hdr && !Rider))) {
                    if (!Rider) {
                        buf = list_vanquished_class_explain(mlet);
                        special_hdr = false;
                    } else {
                        buf = 'Rider';
                        special_hdr = true;
                    }
                    putstr(klwin, ask ? 0 /* ATR_NONE */ : (g.iflags?.menu_headings?.attr | 0),
                           upstart(buf));
                    prev_mlet = mlet;
                }
                if ((MONS[i][3] & G_UNIQ) !== 0 && i !== PM_HIGH_PRIEST) {
                    const isPname = (MONS[i][7] & M2_PNAME) !== 0;
                    buf = (!isPname ? 'the ' : '') + MONS_PMNAMES[i][NEUTRAL];
                    if (nkilled > 1) {
                        switch (nkilled) {
                        case 2:
                            buf += ' (twice)';
                            break;
                        case 3:
                            buf += ' (thrice)';
                            break;
                        default:
                            buf += ` (${nkilled} times)`;
                            break;
                        }
                    }
                    was_uniq = true;
                } else {
                    if (uniq_header && was_uniq) {
                        putstr(klwin, 0, '');
                        was_uniq = false;
                    }
                    if (nkilled === 1)
                        buf = an(MONS_PMNAMES[i][NEUTRAL]);
                    else
                        buf = `${String(nkilled).padStart(3, ' ')} ${makeplural_objnam(MONS_PMNAMES[i][NEUTRAL])}`;
                }
                /* number of leading spaces to match 3 digit prefix */
                let pfx;
                if (buf.slice(0, 4).toLowerCase() === 'the ')
                    pfx = 0;
                else if (buf.slice(0, 3).toLowerCase() === 'an ')
                    pfx = 1;
                else if (buf.slice(0, 2).toLowerCase() === 'a ')
                    pfx = 2;
                else if (!digit(buf.charCodeAt(2)))
                    pfx = 4;
                else
                    pfx = 0;
                if (class_header)
                    ++pfx;
                const buftoo = ' '.repeat(Math.max(0, pfx)) + buf;
                putstr(klwin, 0, buftoo);
            }
            if (ntypes > 1) {
                if (!dumping)
                    putstr(klwin, 0, '');
                putstr(klwin, 0, `${total_killed} creatures vanquished.`);
            }
            await display_nhwindow(klwin, true);
            destroy_nhwindow(klwin);
        }
    } else if (!g.program_state?.gameover) {
        /* C insight.c:2943 / pline.c:283: finish any message acknowledgement. */
        await pline('No creatures have been vanquished.');
    }
}

/* C insight.c:2970 num_extinct()/2985 num_gone(). */
function num_extinct() {
    const G_EXTINCT = 0x01, G_GONE = 0x03, G_UNIQ = 0x1000;
    const mons = monsPack.mons, vitals = game.mvitals || [];
    let n = 0;
    for (let i = LOW_PM; i < mons.length; i++) {
        if ((mons[i]?.[3] | 0) & G_UNIQ) continue;
        if (((vitals[i]?.mvflags | 0) & G_GONE) === G_EXTINCT) n++;
    }
    return n;
}

function num_gone(mvflags, mindx) {
    const G_UNIQ = 0x1000;
    const mons = monsPack.mons, vitals = game.mvitals || [];
    let n = 0;
    if (Array.isArray(mindx)) mindx.fill(0);
    for (let i = LOW_PM; i < mons.length; i++) {
        if ((mons[i]?.[3] | 0) & G_UNIQ) continue;
        if ((vitals[i]?.mvflags | 0) & (mvflags | 0)) {
            if (Array.isArray(mindx)) mindx[n] = i;
            n++;
        }
    }
    return n;
}

/* C insight.c:3027 yn_function(qbuf, allow, defquery, TRUE). */
async function list_genocided_yn_function(qbuf, choices, def, _sensitive) {
    return (await yn_function(qbuf, choices,
                              String.fromCharCode(def | 0))).charCodeAt(0);
}

/* C insight.c:3066 reuses the same vanqsort_cmp comparator as the
 * vanquished list.  Keep one canonical implementation for both disclosures. */
function list_genocided_vanqsort_cmp(a, b) {
    return list_vanquished_vanqsort_cmp(a, b);
}

/* not yet ported: def_monsyms[].explain */
function list_genocided_class_explain(_mlet) {
    return monsym_explain(_mlet);
}

// C ref: insight.c:3026-3152 list_genocided(char defquery, boolean ask)
export async function list_genocided(defquery, ask) {
    const g = game;
    const MONS = monsPack.mons;
    const MONS_PMNAMES = monPmnamesPack.pmnames;
    const NEUTRAL = 2;
    const CH_d = 100, CH_g = 103, CH_y = 121, CH_q = 113, CH_a = 97;
    const G_GENOD = 0x02;
    const G_EXTINCT = 0x01;
    const G_GONE = G_GENOD | G_EXTINCT;
    const VANQ_ALPHA_MIX = 3;
    const VANQ_COUNT_H_L = 6;
    const VANQ_COUNT_L_H = 7;
    const VANQ_MCLS_LTOH = 5;
    const VANQ_MCLS_HTOL = 4;

    let dumping = (defquery === CH_d);
    let genoing = (defquery === CH_g);
    if (dumping || genoing)
        defquery = CH_y;
    let both = !!(g.program_state?.gameover || wizard() || discover());
    if (genoing)
        both = false;

    const ngenocided = num_genocides();
    const nextinct = both ? num_extinct() : 0;
    const mvflags = G_GENOD | (both ? G_EXTINCT : 0);
    const mindx = [];
    const ngone = num_gone(mvflags, mindx);

    if (ngone > 0) {
        let buf = 'Do you want a list of ' +
            ((nextinct && !ngenocided) ? 'extinct ' : '') +
            'species' +
            (ngenocided ? ' genocided' : '') +
            ((nextinct && ngenocided) ? ' and extinct' : '') +
            '?';
        let c = ask ? await list_genocided_yn_function(buf, (ngone > 1) ? 'ynaq' : 'ynq\x1ba', defquery, true)
                    : defquery;
        if (c === CH_q) {
            g.program_state = g.program_state || {};
            g.program_state.stopprint = (g.program_state.stopprint | 0) + 1;
        }
        if (c === CH_y || c === CH_a) {
            let save_sortmode;
            let prev_mlet = 0;
            let class_header = false;

            if (ngone > 1) {
                if (c === CH_a) {
                    if ((await list_vanquished_set_vanq_order(false)) < 0)
                        return;
                }
                save_sortmode = g.flags.vanq_sortmode;
                if (g.flags.vanq_sortmode === VANQ_COUNT_H_L
                    || g.flags.vanq_sortmode === VANQ_COUNT_L_H)
                    g.flags.vanq_sortmode = VANQ_ALPHA_MIX;
                mindx.sort(list_genocided_vanqsort_cmp);
                class_header = (g.flags.vanq_sortmode === VANQ_MCLS_LTOH
                                || g.flags.vanq_sortmode === VANQ_MCLS_HTOL);
                g.flags.vanq_sortmode = save_sortmode;
            }

            const klwin = create_nhwindow(NHW_MENU);
            buf = (ngenocided ? 'Genocided' : 'Extinct') +
                  ((nextinct && ngenocided) ? ' or extinct' : '') +
                  ' species:';
            putstr(klwin, 0, buf);
            if (!dumping)
                putstr(klwin, 0, '');

            for (let i = 0; i < ngone; i++) {
                const mndx = mindx[i];
                const mlet = MONS[mndx][0];
                if (class_header && mlet !== prev_mlet) {
                    buf = list_genocided_class_explain(mlet);
                    putstr(klwin, ask ? 0 : (g.iflags?.menu_headings?.attr | 0),
                           upstart(buf));
                    prev_mlet = mlet;
                }
                buf = ' ' + makeplural_objnam(MONS_PMNAMES[mndx][NEUTRAL]);
                if ((g.mvitals && g.mvitals[mndx] && (g.mvitals[mndx].mvflags & G_GONE)) === G_EXTINCT)
                    buf += ' (extinct)';
                putstr(klwin, 0, buf);
            }
            if (!dumping)
                putstr(klwin, 0, '');
            if (ngenocided > 0) {
                buf = ngenocided + ' species genocided.';
                putstr(klwin, 0, buf);
            }
            if (nextinct > 0) {
                buf = nextinct + ' species extinct.';
                putstr(klwin, 0, buf);
            }

            await display_nhwindow(klwin, true);
            destroy_nhwindow(klwin);
        }
    } else if (!g.program_state?.gameover) {
        pline('No creatures have been genocided' + (genoing ? ' yet' : '') + '.');
    } else if (dumping) {
        putstr(0, 0, 'No species were genocided or became extinct.');
    }
}

// C ref: insight.c:2093 show_conduct(int final)
export async function show_conduct(final) {
    const u = game.u;
    const uconduct = u.uconduct || {};
    const uroleplay = u.uroleplay || {};

    /* Create the conduct window */
    game.en_win = create_nhwindow(NHW_MENU);
    putstr(game.en_win, 0, "Voluntary challenges:");

    /* rerolling; always past tense (insight.c:2098-2109) */
    if (!uroleplay.reroll)
        enlght_out(' Character rerolling was not enabled.');
    else if (!uroleplay.numrerolls)
        enlght_out(' Your character was not rerolled.');
    else
        enlght_out(` Your character was rerolled ${_N_times(uroleplay.numrerolls)}.`);

    if (uroleplay.blind)
        you_have_been(final, "blind from birth");
    if (uroleplay.deaf)
        you_have_been(final, "deaf from birth");
    if (uroleplay.pauper)
        enl_msg(final, _CONDUCT_You_, game.invent ? "started" : "are",
                "started out", " without possessions", "");
    if (uroleplay.nudist)
        you_have_been(final, "faithfully nudist");

    if (!(uconduct.food | 0))
        enl_msg(final, _CONDUCT_You_, "have gone", "went", " without food", "");
        /* but beverages are okay */
    else if (!(uconduct.unvegan | 0))
        you_have_X(final, "followed a strict vegan diet");
    else if (!(uconduct.unvegetarian | 0))
        you_have_been(final, "vegetarian");

    if (!(uconduct.gnostic | 0))
        you_have_been(final, "an atheist");

    if (!(uconduct.weaphit | 0)) {
        you_have_never(final, "hit with a wielded weapon");
    } else if (wizard()) {
        const weaphit = uconduct.weaphit | 0;
        you_have_X(final, `hit with a wielded weapon ${weaphit} time${plur(weaphit)}`);
    }
    if (!(uconduct.killer | 0))
        you_have_been(final, "a pacifist");

    if (!(uconduct.literate | 0)) {
        you_have_been(final, "illiterate");
    } else if (wizard()) {
        const literate = uconduct.literate | 0;
        you_have_X(final, `read items or engraved ${literate} time${plur(literate)}`);
    }

    if (!(uconduct.pets | 0))
        you_have_never(final, "had a pet");

    const ngenocided = num_genocides();
    if (ngenocided === 0) {
        you_have_never(final, "genocided any monsters");
    } else {
        you_have_X(final, `genocided ${ngenocided} type${plur(ngenocided)} of monster${plur(ngenocided)}`);
    }

    if (!(uconduct.polypiles | 0)) {
        you_have_never(final, "polymorphed an object");
    } else if (wizard()) {
        const polypiles = uconduct.polypiles | 0;
        you_have_X(final, `polymorphed ${polypiles} item${plur(polypiles)}`);
    }

    if (!(uconduct.polyselfs | 0)) {
        you_have_never(final, "changed form");
    } else if (wizard()) {
        const polyselfs = uconduct.polyselfs | 0;
        you_have_X(final, `changed form ${polyselfs} time${plur(polyselfs)}`);
    }

    if (!(uconduct.wishes | 0)) {
        you_have_X(final, "used no wishes");
    } else {
        const wishes = uconduct.wishes | 0;
        const wisharti = uconduct.wisharti | 0;
        let buf = `used ${wishes} wish${(wishes > 1) ? "es" : ""}`;
        if (wisharti) {
            /* if wisharti == wishes
             *  1 wish (for an artifact)
             *  2 wishes (both for artifacts)
             *  N wishes (all for artifacts)
             * else (N is at least 2 in order to get here; M < N)
             *  N wishes (1 for an artifact)
             *  N wishes (M for artifacts)
             */
            if (wisharti === wishes)
                buf += ` (${(wisharti > 2) ? "all " : (wisharti === 2) ? "both " : ""}`;
            else
                buf += ` (${wisharti} `;

            buf += `for ${(wisharti === 1) ? "an artifact" : "artifacts"})`;
        }
        you_have_X(final, buf);

        if (!wisharti)
            enl_msg(final, _CONDUCT_You_, "have not wished", "did not wish",
                    " for any artifacts", "");
    }

    /* only report Sokoban conduct if the Sokoban branch has been entered */
    if (sokoban_in_play()) {
        let presentverb = "have violated", pastverb = "violated";
        let buf = " the special Sokoban rules ";
        const sokocheat = uconduct.sokocheat | 0;
        switch (sokocheat) {
        case 0:
            presentverb = "have not violated";
            pastverb = "did not violate";
            buf = " any of the special Sokoban rules";
            break;
        case 1:
            buf += "once";
            break;
        case 2:
            buf += "twice";
            break;
        case 3:
            buf += "thrice";
            break;
        default:
            buf += `${sokocheat} times`;
            break;
        }
        enl_msg(final, _CONDUCT_You_, presentverb, pastverb, buf, "");
    }

    await show_achievements(final);

    /* Pop up the window and wait for a key */
    await display_nhwindow(game.en_win, true);
    destroy_nhwindow(game.en_win);
    game.en_win = WIN_ERR;
}

/* C ref: insight.c:2516-2522 achieve_rank(int rank) — compute the achievement
 * index for a given rank (1..8), optionally negating based on female hero.
 * Return type is schar: `schar achidx = (schar) ((rank - 1) + ACH_RNK1);` —
 * narrow to signed 8-bit BEFORE the female negation (C casts before the `if`,
 * not after). (x << 24) >> 24 is JS's signed-32 idiom for a schar truncation. */
export function achieve_rank(rank) {
    let achidx = (((rank - 1) + ACH_RNK1) << 24) >> 24;
    if (game.flags.female) {
        achidx = -achidx;
    }
    return achidx;
}

// C ref: insight.c:1279 — starting wielded weapon.  Derived from the role's
// deterministic starting kit (Wizard wields a quarterstaff).
/* C ref: insight.c:287 attrval(attrindx, attrvalue, resultbuf) —
 * format a characteristic value, accommodating Strength's strangeness. */
export function attrval(attrindx, attrvalue) {
    if (attrindx !== A_STR || attrvalue <= 18) {
        return String(attrvalue);
    } else if (attrvalue > STR18(100)) { /* 19 to 25 */
        return String(attrvalue - 100);
    } else { /* C insight.c:296 — "18/**" is formatted as "18/100" */
        return `18/${String(attrvalue - 18).padStart(2, '0')}`;
    }
}

export async function enlightenment(mode, final) {
    if (!final) return await enlightenment_menu(mode); // C insight.c:394,449-456
    const g = game;
    const content = await build_enlightenment_lines(final, mode);
    /* tty putstr stops at `curx < cols - 1`, so column 80 is never written. */
    const TTY_COLS = 80, SCREEN_ROWS = 24;
    const PER_PAGE = SCREEN_ROWS - 1;   /* rows 0..22; the break fires at n==23 */
    /* wintty.c:2253,2402-2417: compress non-message putstr lines before
     * clipping, and recursively split an over-wide line at its last space. */
    const lines = [];
    for (let line of content) {
        for (;;) {
            if (line.length >= TTY_COLS || line.includes('\n'))
                line = keyhelp_compress_str(line);
            let split = 0;
            if (line.length >= TTY_COLS) {
                split = TTY_COLS - 1;
                while (split && line[split] !== ' ') split--;
            }
            lines.push(line.slice(0, split || TTY_COLS - 1));
            if (!split) break;
            line = line.slice(split + 1);
        }
    }
    const MOREPROMPT = '--More--';
    const pages = [];
    for (let i = 0; i < lines.length; i += PER_PAGE)
        pages.push(lines.slice(i, i + PER_PAGE));
    if (!pages.length) pages.push([]);

    for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
        const pageLines = pages[pageIdx];
        /* The mid-loop dmore sits on row 23 because the page is full by
         * construction; the trailing one sits just past the last line. */
        const moreRow = (pageIdx === pages.length - 1) ? pageLines.length : PER_PAGE;
        const rows = new Array(SCREEN_ROWS).fill('');
        /* C wintty.c:1817-1834: putstr NHW_MENU uses the same UTF8
         * linestart g_putch() path as NHW_TEXT. */
        for (let r = 0; r < pageLines.length && r < SCREEN_ROWS; r++)
            rows[r] = tty_text_window_utf8_line(pageLines[r]);
        rows[moreRow] = ' ' + MOREPROMPT;   /* dmore's curx + 2 → column 1 */
        const _show = async () => {
            g._screen_output = rows.join('\n');
            set_cursor(1 + MOREPROMPT.length, moreRow);
        };
        await _show();
        const c = await await_more_dismiss(_show);
        if (c === 27 /* ESC → morc == '\033' → WIN_CANCELLED */)
            break;
    }
    if (final) {
        const { docrt } = await import('./display.js');
        await docrt();
        await flush_screen(1);
    }
}

// C ref: insight.c:2517 doattributes() → enlightenment(BASICENLIGHTENMENT,
// ENL_GAMEINPROGRESS).  Renders the enlightenment NHW_MENU and paginates it
// like the tty menu pager.  Bound to '^X' (cmd.c:2510).  ECMD_OK: no turn,
// no RNG.
export async function doattributes() {
    const g = game;
    /* C insight.c:2011-2014 — `int mode = BASICENLIGHTENMENT; if (wizard ||
     * discover) mode |= MAGICENLIGHTENMENT;`.  The MAGIC bit used to be read
     * straight off wizard()/discover() inside the builder; it is a parameter
     * now because disclose() sets it unconditionally. */
    const mode = BASICENLIGHTENMENT
        | ((wizard() || discover()) ? MAGICENLIGHTENMENT : 0);
    /* Build the menu content (raw lines, no leading menu prefix). */
    await enlightenment_menu(mode);
    /* ECMD_OK — no turn consumed; map re-renders on the next moveloop flush.
     * No topline clear here: C's docrt on dismiss (wintty.c:972-974) may have
     * re-announced a spotted monster (vision.c:856 notice_all_mons). */
    /* C: this handler returns ECMD_OK on every path; rhack() maps it. */
    return ECMD_OK;
}

/* C insight.c:2475-2490 — match either gender's signed achievement id. */
export function remove_achievement(achidx) {
    const ach = game.u?.uachieved;
    if (!ach) return false;
    let i = 0;
    for (; ach[i]; ++i)
        if (Math.abs(ach[i]) === Math.abs(achidx)) break;
    if (!ach[i]) return false;
    do {
        ach[i] = ach[i + 1] || 0;
    } while (ach[++i]);
    return true;
}

export function record_achievement(achidx) {
    const absidx = Math.abs(achidx | 0);
    if (((achidx | 0) < 1 && (absidx < ACH_RNK1 || absidx > ACH_RNK8))
        || (achidx | 0) >= N_ACH)
        return real_impossible('Achievement #%d is out of range.', achidx);
    const u = game.u || (game.u = {});
    const ach = (u.uachieved = Array.isArray(u.uachieved) ? u.uachieved : []);
    let i;
    for (i = 0; ach[i]; ++i)
        if (Math.abs(ach[i] | 0) === absidx)
            return;   /* C: repeat_achievement -> don't duplicate it */
    ach[i] = achidx | 0;
    /* C insight.c:2444-2470 — livelog the new achievement (feeds #chronicle). */
    if (game.program_state?.gameover) return;
    if (absidx >= ACH_RNK1 && absidx <= ACH_RNK8) {
        /* C insight.c:2450-2455 — the rank's achieve_msg[] row is LL_MINORAC|LL_DUMP
         * for Xp 3/6/10 (ranks 1-3) and LL_ACHIEVE for Xp 14..30. */
        const rankFlag = (absidx <= ACH_RNK1 + 2) ? (0x1000 | 0x4000) : 0x0002;
        livelog_printf(rankFlag, `attained the rank of ${_ach_rank_of(rank_to_xlev_cmd(absidx - (ACH_RNK1 - 1)), achidx < 0)} (level ${game.u?.ulevel | 0})`);
        return;
    }
    if (achidx === ACH_SOKO_PRIZE || achidx === ACH_MINE_PRIZE) {
        const prizes = game.context?.achieveo;
        const otyp = achidx === ACH_SOKO_PRIZE
            ? prizes?.soko_prize_otyp : prizes?.mines_prize_otyp;
        const am = _ACHIEVE_MSG[achidx];
        livelog_printf(am[0], '%s %s', am[1], _objName_full(otyp));
        return;
    }
    const am = _ACHIEVE_MSG[absidx];
    livelog_printf(am[0], '%s', am[1]);
}

/* C insight.c:58-93 achieve_msg[] (llflag, msg), indexed by achievement. */
const _ACHIEVE_MSG = {
    [ACH_MINE_PRIZE]: [0x0002 | LL_SPOILER, "acquired the Mines' End"],
    [ACH_SOKO_PRIZE]: [0x0002 | LL_SPOILER, 'acquired the Sokoban'],
    [ACH_BELL]: [0x0002, 'acquired the Bell of Opening'],
    [ACH_HELL]: [0x0002, 'entered Gehennom'],
    [ACH_CNDL]: [0x0002, 'acquired the Candelabrum of Invocation'],
    [ACH_BOOK]: [0x0002, 'acquired the Book of the Dead'],
    [ACH_INVK]: [0x0002, 'performed the invocation'],
    [ACH_AMUL]: [0x0002, 'acquired The Amulet of Yendor'],
    [ACH_ENDG]: [0x0002, 'entered the Elemental Planes'],
    [ACH_ASTR]: [0x0002, 'entered the Astral Plane'],
    [ACH_UWIN]: [0x0002, 'ascended'],
    [ACH_MEDU]: [0x0002 | 0x0004, 'killed Medusa'],
    [ACH_BLND]: [0, 'hero was always blond, no, blind'],
    [ACH_NUDE]: [0, 'hero never wore armor'],
    [ACH_MINE]: [0x1000 | 0x4000, 'entered the Gnomish Mines'],
    [ACH_TOWN]: [0x0002, 'reached Mine Town'],
    [ACH_SHOP]: [0x1000, 'entered a shop'],
    [ACH_TMPL]: [0x1000, 'entered a temple'],
    [ACH_ORCL]: [0x0002, 'consulted the Oracle'],
    [ACH_NOVL]: [0x1000 | 0x4000, 'read a Discworld novel'],
    [ACH_SOKO]: [0x0002, 'entered Sokoban'],
    [ACH_BGRM]: [0x0002, 'entered the Bigroom'],
    [ACH_TUNE]: [0x1000, "learned castle drawbridge's tune"],
};

export function align_str(align) {
    switch (align | 0) {
    case A_CHAOTIC:
        return 'chaotic';
    case A_NEUTRAL:
        return 'neutral';
    case A_LAWFUL:
        return 'lawful';
    case A_NONE:
        return 'unaligned';
    }
    return 'unknown';
}
