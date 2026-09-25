// insight.js — #chronicle / #conduct / #vanquished (partial).
// C ref: insight.c do_gamelog / show_gamelog / doconduct / show_conduct /
//        dovanquished / list_vanquished / vanqsort_cmp / num_genocides.
//
// Branch envelope:
//   chronicle: in-progress Logged events NHW_TEXT; empty → pline;
//              spoiler filter for !wizard. Final/Major dump deferred.
//   conduct: in-progress NHW_MENU Voluntary challenges (ENL_GAMEINPROGRESS);
//            uroleplay reroll/blind/deaf/pauper/nudist; food/vegan/veg;
//            gnostic/weaphit/killer/literate/pets; num_genocides;
//            polypiles/polyselfs/wishes(+wisharti); sokoban_in_play;
//            wizard count detail lines; show_achievements when
//            final||wizard (record_achievement / uachieved).
//            record_achievement livelog_printf (achieve_msg; gameover skip).
//            SoundAchievement still named. Final disclosure path deferred.
//   vanquished: in-progress #vanquished with defquery 'y' (not ask);
//               mvitals.died census; traditional VANQ_MLVL_MNDX sort;
//               ordinary an()/makeplural lines + total when ntypes>1;
//               uniq "the "/pname + N_times; empty → pline.
//               Deferred: set_vanq_order / 'm #vanquished' force_sort;
//               disclose yn ask; class-header modes; dumplog 'd';
//               Hallucination footer.
//   genocided: full list_genocided (ngone>0 yn + NHW_MENU with
//              extinctions when gameover/wizard/discover, vanq sort with
//              COUNT→ALPHA_MIX fallback, class headers, extinct suffix,
//              genocided/extinct tallies) + num_extinct/num_gone +
//              set_vanq_order pick-one menu. Named: DUMPLOG file arm;
//              single-entry yn ESC-pad ('ynq', cf. list_vanquished);
//              sort-menu n>1 preselect-skip branch (primitive is pick-one).

import { game } from './gstate.js';
import { yn_function } from './getline.js';
import {
    ACH_BELL,
    ACH_HELL,
    ACH_CNDL,
    ACH_BOOK,
    ACH_INVK,
    ACH_AMUL,
    ACH_ENDG,
    ACH_ASTR,
    ACH_UWIN,
    ACH_MINE_PRIZE,
    ACH_SOKO_PRIZE,
    ACH_MEDU,
    ACH_BLND,
    ACH_NUDE,
    ACH_MINE,
    ACH_TOWN,
    ACH_SHOP,
    ACH_TMPL,
    ACH_ORCL,
    ACH_NOVL,
    ACH_SOKO,
    ACH_BGRM,
    ACH_RNK1,
    ACH_RNK8,
    ACH_TUNE,
    N_ACH,
    ECMD_OK,
    ENL_GAMEINPROGRESS,
    G_GENOD,
    G_GONE,
    G_EXTINCT,
    LL_ACHIEVE,
    LL_UMONST,
    LL_MINORAC,
    LL_SPOILER,
    LL_DUMP,
    LOW_PM,
    VANQ_MLVL_MNDX,
    VANQ_MSTR_MNDX,
    VANQ_ALPHA_SEP,
    VANQ_ALPHA_MIX,
    VANQ_MCLS_HTOL,
    VANQ_MCLS_LTOH,
    VANQ_COUNT_H_L,
    VANQ_COUNT_L_H,
} from './const.js';
import { pline, impossible } from './display.js';
import { DEF_MONSYM_MLET } from './mondata.js';
import { getnow } from './calendar.js';
import { timet_delta } from './allmain.js';
import { livelog_printf } from './pline.js';
import { objectNameStrs } from './objects.js';
import { show_text_pages, show_nhw_menu_text, mhidden_description } from './pager.js';
import { visible_region_at, reg_damg } from './region.js';
import {
    NUMMONS, mons, haseyes, G_UNIQ, M2_PNAME, monsterNames, pmnames, NEUTRAL,
    MZ_TINY, MZ_SMALL, MZ_MEDIUM, MZ_LARGE, MZ_HUGE, is_animal,
    is_rider,
} from './monsters.js';
import { an, makeplural } from './objnam.js';
import { upstart, ordin } from './hacklib.js';
import { align_str, rank_of, rank_to_xlev } from './roles.js';
import { x_monnam, a_monnam } from './do_name.js';
import { find_mac } from './mhitm.js';
import { digests, enfolds } from './mhitu.js';
import { sticks } from './engrave.js';
import { count_wsegs, wseg_at } from './worm.js';
import { fingers_or_gloves } from './do_wear.js';
import { body_part, mbodypart } from './polyself.js';
import { Fast, Very_fast } from './attrib.js';
import { Blind } from './invent.js';
import { Invis } from './timeout.js';
import { Glib } from './potion.js';
import { A_NONE, A_LAWFUL, A_CHAOTIC, A_NEUTRAL, MHID_PREFIX, MHID_ARTICLE, MHID_ALTMON, MHID_REGION } from './const.js';
import {
    SICK, STONED, SLIMED, STRANGLED, VOMITING,
    SICK_VOMITABLE, SICK_NONVOMITABLE, BOTH_SIDES,
    M_AP_NOTHING, M_AP_TYPMASK, LEG, TIMEOUT, Upolyd,
    ARTICLE_YOUR, SUPPRESS_IT, SUPPRESS_INVISIBLE,
    STRAT_WAITMASK, MFAST, MSLOW,
    EPRI, EMIN, EDOG, ismnum,
} from './const.js';

const PM_HIGH_CLERIC = monsterNames.indexOf('PM_HIGH_CLERIC');
// C ref: insight.c mstatusline `:3292` — `mtmp->data == &mons[PM_LONG_WORM]`.
// JS `mons()` builds fresh objects, so compare `data.mndx` (cf. detect.js).
const PM_LONG_WORM = monsterNames.indexOf('PM_LONG_WORM');
// C ref: monflag.h:183 — MZ_GIGANTIC is 7, off the scale (no JS export).
const MZ_GIGANTIC = 7;

/** C LL_majors — only used for final dumplog path (deferred). */
const LL_MAJORS =
    0x0001 | // LL_WISH
    0x0002 | // LL_ACHIEVE
    0x0004 | // LL_UMONST
    0x0008 | // LL_DIVINEGIFT
    0x0010 | // LL_LIFESAVE
    0x0040 | // LL_ARTIFACT
    0x0080 | // LL_GENOCIDE
    0x4000;  // LL_DUMP

const You_ = 'You ';
const have = 'have ';
const were = 'were ';
const have_been = 'have been ';
const have_never = 'have never ';
const never = 'never ';

const CONTRA = [
    [' are not ', " aren't "],
    [' were not ', " weren't "],
    [' have not ', " haven't "],
    [' had not ', " hadn't "],
    [' can not ', " can't "],
    [' could not ', " couldn't "],
];

function majorevent(llmsg) {
    return ((llmsg.flags | 0) & LL_MAJORS) !== 0;
}

function spoilerevent(llmsg) {
    return ((llmsg.flags | 0) & LL_SPOILER) !== 0;
}

function wizardMode() {
    return !!(game.flags?.debug || game.flags?.wizard);
}

function plur(n) {
    return (n | 0) === 1 ? '' : 's';
}

/**
 * C ref: insight.c fmt_elapsed_time `:313–358` (C `staticfn`, exported for
 * the JS enlightenment builders) — format `urealtime.realtime` as
 * " D days, H hours, M minutes and S seconds" with zero-valued fields
 * omitted (`" none"` when every field is 0, which should never happen).
 * For a game still in progress (`!final`; C callers pass
 * ENL_GAMEINPROGRESS = 0) the live delta `:324–325`
 * `timet_delta(getnow(), urealtime.start_timing)` is added; for a game
 * that's over, really_done() already folded it into `.realtime` (end.js).
 * C `eos(outbuf)` appends are plain concatenation here; C `plur(x)` is
 * `hack.h:1520` (`""` iff x == 1), the file-local helper above. Division
 * is trunc-toward-zero like C `long` `/` (non-negative in practice).
 * Sole C caller: insight.c:448 `enlightenment` — wired in js/invent.js
 * `enlightenment` (final disclosure) and `doattributes` (^X overlay).
 * @param {number} final ENL_GAMEINPROGRESS / GAMEOVERALIVE / GAMEOVERDEAD
 * @returns {string} elapsed field text with leading space (C `outbuf`)
 */
export function fmt_elapsed_time(final) {
    const rt = game.urealtime || {};
    // C `:322–325` — etim = urealtime.realtime (+ live delta if !final).
    let etim = (rt.realtime | 0);
    if (!final) etim += timet_delta(getnow(), (rt.start_timing | 0));
    // C `:328–331` — eseconds = etim % 60, etim /= 60, &c, in C order.
    const eseconds = etim % 60;
    etim = Math.trunc(etim / 60);
    const eminutes = etim % 60;
    etim = Math.trunc(etim / 60);
    const ehours = etim % 24;
    const edays = Math.trunc(etim / 24);
    // C `:332` — fieldcnt = !!edays + !!ehours + !!eminutes + !!eseconds.
    let fieldcnt = (edays ? 1 : 0) + (ehours ? 1 : 0)
        + (eminutes ? 1 : 0) + (eseconds ? 1 : 0);
    // C `:334` — 'none' should never happen.
    let outbuf = fieldcnt ? '' : ' none';
    if (edays) {
        // C `:335–340`.
        outbuf += ` ${edays} day${plur(edays)}`;
        if (fieldcnt > 1) outbuf += (fieldcnt === 2) ? ' and' : ',';
        --fieldcnt; /* edays has been processed */
    }
    if (ehours) {
        // C `:341–346`.
        outbuf += ` ${ehours} hour${plur(ehours)}`;
        if (fieldcnt > 1) outbuf += (fieldcnt === 2) ? ' and' : ',';
        --fieldcnt; /* ehours has been processed */
    }
    if (eminutes) {
        // C `:347–352` (no fieldcnt decrement per C comment).
        outbuf += ` ${eminutes} minute${plur(eminutes)}`;
        if (fieldcnt > 1) outbuf += ' and';
    }
    // C `:353–354`.
    if (eseconds) outbuf += ` ${eseconds} second${plur(eseconds)}`;
    return outbuf;
}

/** C ref: insight.c N_times */
export function N_times(n) {
    switch (n | 0) {
        case 1: return 'once';
        case 2: return 'twice';
        case 3: return 'thrice';
        default: return `${n | 0} times`;
    }
}

/**
 * C ref: insight.c enlght_line + contractions.
 * Builds " %s%s%s%s." then contracts " not " forms.
 */
function enlght_line(start, middle, end, ps) {
    let buf = ` ${start}${middle}${end}${ps}.`;
    if (buf.includes(' not ')) {
        for (const [from, to] of CONTRA) {
            if (buf.includes(from)) buf = buf.split(from).join(to);
        }
    }
    return buf;
}

/** C ref: insight.c enl_msg macro — present vs past by final. */
function enl_msg(final, prefix, present, past, suffix, ps = '') {
    return enlght_line(prefix, final ? past : present, suffix, ps);
}

function you_have_been(final, goodthing) {
    return enl_msg(final, You_, have_been, were, goodthing, '');
}

function you_have_never(final, badthing) {
    return enl_msg(final, You_, have_never, never, badthing, '');
}

function you_have_X(final, something) {
    return enl_msg(final, You_, have, '', something, '');
}

/** C ref: insight.c num_genocides */
export function num_genocides() {
    const mv = game.mvitals || [];
    let n = 0;
    for (let i = LOW_PM; i < NUMMONS; i++) {
        if (((mv[i]?.mvflags ?? 0) & G_GENOD) !== 0) n++;
    }
    return n;
}

/**
 * C ref: insight.c num_extinct `:2969–2981` (C `staticfn`, exported for
 * the maintained `scripts/list-genocided.test.mjs` pin).
 * Counts non-unique species whose G_GONE bits are exactly G_EXTINCT
 * (extinct but not genocided).
 */
export function num_extinct() {
    const mv = game.mvitals || [];
    let n = 0;
    for (let i = LOW_PM; i < NUMMONS; i++) {
        if (UniqCritterIndx(i)) continue;
        if (((mv[i]?.mvflags ?? 0) & G_GONE) === G_EXTINCT) n++;
    }
    return n;
}

/**
 * C ref: insight.c num_gone `:2984–3002` (C `staticfn`, exported for the
 * maintained test pin). C fills the caller's `mindx` buffer and returns
 * the count; JS returns the collected index array (LOW_PM..NUMMONS order,
 * uniques skipped, `(mvflags & mvitals[i].mvflags) != 0`).
 */
export function num_gone(mvflags) {
    const mflg = mvflags | 0;
    const mv = game.mvitals || [];
    const mindx = [];
    for (let i = LOW_PM; i < NUMMONS; i++) {
        /* uniques can't be genocided but can become extinct;
           however, they're never reported as extinct, so skip them */
        if (UniqCritterIndx(i)) continue;
        if ((((mv[i]?.mvflags ?? 0) & mflg) | 0) !== 0) mindx.push(i);
    }
    return mindx;
}

/** Ensure u.uachieved is a 0-terminated sparse list (C N_ACH slots). */
function ensure_uachieved() {
    const u = game.u || (game.u = {});
    if (!Array.isArray(u.uachieved)) u.uachieved = [];
    return u.uachieved;
}

/** C ref: insight.c sokoban_in_play — ACH_SOKO in u.uachieved */
export function sokoban_in_play() {
    const ach = game.u?.uachieved;
    if (!ach) return false;
    for (let i = 0; ach[i]; i++) {
        if ((ach[i] | 0) === ACH_SOKO) return true;
    }
    return false;
}

/** C ref: insight.c count_achievements */
export function count_achievements() {
    const ach = game.u?.uachieved;
    if (!ach) return 0;
    let acnt = 0;
    for (let i = 0; ach[i]; i++) acnt++;
    return acnt;
}

/**
 * C ref: insight.c achieve_rank — rank 1..8 → ACH_RNK*; negate if female.
 */
export function achieve_rank(rank) {
    let achidx = ((rank | 0) - 1) + ACH_RNK1;
    if (game.flags?.female) achidx = -achidx;
    return achidx;
}

/**
 * C ref: insight.c remove_achievement — return true if removed.
 */
export function remove_achievement(achidx) {
    const ach = ensure_uachieved();
    const want = Math.abs(achidx | 0);
    let i = 0;
    for (; ach[i]; i++) {
        if (Math.abs(ach[i] | 0) === want) break;
    }
    if (!ach[i]) return false;
    do {
        ach[i] = ach[i + 1] | 0;
    } while (ach[++i]);
    return true;
}

/**
 * C ref: insight.c achieve_msg[] — ordered per you.h enum achievements.
 * Index 0 unused; ranks 23..30 have empty msg (formatted on the fly).
 */
const achieve_msg = [
    { llflag: 0, msg: '' },
    { llflag: LL_ACHIEVE, msg: 'acquired the Bell of Opening' },
    { llflag: LL_ACHIEVE, msg: 'entered Gehennom' },
    { llflag: LL_ACHIEVE, msg: 'acquired the Candelabrum of Invocation' },
    { llflag: LL_ACHIEVE, msg: 'acquired the Book of the Dead' },
    { llflag: LL_ACHIEVE, msg: 'performed the invocation' },
    { llflag: LL_ACHIEVE, msg: 'acquired The Amulet of Yendor' },
    { llflag: LL_ACHIEVE, msg: 'entered the Elemental Planes' },
    { llflag: LL_ACHIEVE, msg: 'entered the Astral Plane' },
    { llflag: LL_ACHIEVE, msg: 'ascended' },
    { llflag: LL_ACHIEVE | LL_SPOILER, msg: "acquired the Mines' End" },
    { llflag: LL_ACHIEVE | LL_SPOILER, msg: 'acquired the Sokoban' },
    { llflag: LL_ACHIEVE | LL_UMONST, msg: 'killed Medusa' },
    { llflag: 0, msg: 'hero was always blond, no, blind' },
    { llflag: 0, msg: 'hero never wore armor' },
    { llflag: LL_MINORAC | LL_DUMP, msg: 'entered the Gnomish Mines' },
    { llflag: LL_ACHIEVE, msg: 'reached Mine Town' },
    { llflag: LL_MINORAC, msg: 'entered a shop' },
    { llflag: LL_MINORAC, msg: 'entered a temple' },
    { llflag: LL_ACHIEVE, msg: 'consulted the Oracle' },
    { llflag: LL_MINORAC | LL_DUMP, msg: 'read a Discworld novel' },
    { llflag: LL_ACHIEVE, msg: 'entered Sokoban' },
    { llflag: LL_ACHIEVE, msg: 'entered the Bigroom' },
    { llflag: LL_MINORAC | LL_DUMP, msg: '' },
    { llflag: LL_MINORAC | LL_DUMP, msg: '' },
    { llflag: LL_MINORAC | LL_DUMP, msg: '' },
    { llflag: LL_ACHIEVE, msg: '' },
    { llflag: LL_ACHIEVE, msg: '' },
    { llflag: LL_ACHIEVE, msg: '' },
    { llflag: LL_ACHIEVE, msg: '' },
    { llflag: LL_ACHIEVE, msg: '' },
    { llflag: LL_MINORAC, msg: "learned castle drawbridge's tune" },
    { llflag: 0, msg: '' },
];

/**
 * C ref: insight.c record_achievement `:2407–2472` — record an achievement
 * in u.uachieved (0-terminated; ranks stored negated for female), sound it,
 * and livelog it unless recorded during final disclosure.
 */
export function record_achievement(achidx) {
    // C `:2412` int i, absidx; int repeat_achievement = 0.
    const ai = achidx | 0;
    const absidx = Math.abs(ai);
    // C `:2414–2421` — valid achievements are 1..N_ACH-1, but ranks may be
    // stored as the complement (negative) to track gender.
    if ((ai < 1 && (absidx < ACH_RNK1 || absidx > ACH_RNK8))
        || ai >= N_ACH) {
        // C `:2419` — sync callers don't await (cf. do_wear.js setworn).
        impossible('Achievement #%d is out of range.', ai);
        return;
    }
    // C `:2423–2433` — the list has an extra slot so at least one 0 always
    // ends it; find the first empty slot or achievement #achidx. Duplicates
    // happen when Bell, Candelabrum, Book or Amulet is dropped and re-taken.
    const ach = ensure_uachieved();
    let i = 0;
    let repeat_achievement = false;
    for (; ach[i]; ++i) {
        if (Math.abs(ach[i] | 0) === absidx) {
            repeat_achievement = true;
            break;
        }
    }
    // C `:2435–2441` — sound even on repeat (level-based theme music hook).
    // sndprocs.h `:232–237` calls sound_achievement when a SND_LIB_* backend
    // is integrated, but no SND_LIB_* backend is defined in this build, so
    // the `:274` empty definition applies: a compile-time no-op, named here.
    if (repeat_achievement) return; // C `:2443–2444` don't duplicate it
    ach[i] = ai; // C `:2445`
    ach[i + 1] = 0; // keep the 0-terminated invariant (C relies on the extra slot)

    // C `:2447–2451` — no livelog during final disclosure (nudist and
    // blind-from-birth); ascension is logged separately in really_done().
    if (game.program_state?.gameover) return;

    if (absidx >= ACH_RNK1 && absidx <= ACH_RNK8) {
        // C `:2453–2461` — rank titles are built on the fly by role.
        const row = achieve_msg[absidx];
        const u = game.u || {};
        livelog_printf(row.llflag,
            'attained the rank of %s (level %d)',
            rank_of(rank_to_xlev(absidx - (ACH_RNK1 - 1)),
                    game.urole?.mnum, // C Role_switch = gu.urole.mnum (you.h:248)
                    (ai < 0) ? true : false),
            u.ulevel | 0);
    } else if (ai === ACH_SOKO_PRIZE || ai === ACH_MINE_PRIZE) {
        // C `:2462–2468` — these two append the prize item's name. C indexes
        // achieve_msg[achidx]; achidx > 0 here so it equals [absidx].
        // OBJ_NAME(objects[otyp]) (objclass.h:190) is the generated oc_name
        // table (both "bag of holding" and "amulet of reflection" are fully
        // named in their objects[] entry, per the C note).
        const otyp = (ai === ACH_SOKO_PRIZE)
            ? (game.context?.achieveo?.soko_prize_otyp | 0)
            : (game.context?.achieveo?.mines_prize_otyp | 0);
        livelog_printf(achieve_msg[ai].llflag, '%s %s',
            achieve_msg[ai].msg, objectNameStrs[otyp] || '');
    } else {
        // C `:2469–2471`
        livelog_printf(achieve_msg[absidx].llflag, '%s', achieve_msg[absidx].msg);
    }
}

/**
 * C ref: insight.c show_achievements — lines appended into conduct menu.
 * Empty unless final||wizard; blank + "Achievement(s):" + ordered list.
 */
function show_achievements_lines(final) {
    if (!final && !wizardMode()) return [];
    let acnt = count_achievements();
    if (acnt === 0) return [];

    // Ascension reorder: force UWIN last, AMUL next-to-last
    if (remove_achievement(ACH_UWIN)) {
        if (remove_achievement(ACH_AMUL)) record_achievement(ACH_AMUL);
        record_achievement(ACH_UWIN);
        acnt = count_achievements();
    }

    const lines = [];
    lines.push('');
    lines.push(`Achievement${plur(acnt)}:`);

    const ach = ensure_uachieved();
    const u = game.u || {};
    const uhave = u.uhave || {};
    const roleMnum = game.urole?.mnum;

    for (let i = 0; i < acnt; i++) {
        const achidx = ach[i] | 0;
        const absidx = Math.abs(achidx);
        switch (absidx) {
        case ACH_BLND:
            lines.push(enl_msg(final, You_, 'are exploring', 'explored',
                ' without being able to see', ''));
            break;
        case ACH_NUDE:
            lines.push(enl_msg(final, You_, 'have gone', 'went',
                ' without any armor', ''));
            break;
        case ACH_MINE:
            lines.push(you_have_X(final, 'entered the Gnomish Mines'));
            break;
        case ACH_TOWN:
            lines.push(you_have_X(final, 'entered Minetown'));
            break;
        case ACH_SHOP:
            lines.push(you_have_X(final, 'entered a shop'));
            break;
        case ACH_TMPL:
            lines.push(you_have_X(final, 'entered a temple'));
            break;
        case ACH_ORCL:
            lines.push(you_have_X(final, 'consulted the Oracle of Delphi'));
            break;
        case ACH_NOVL:
            lines.push(you_have_X(final, 'read from a Discworld novel'));
            break;
        case ACH_SOKO:
            lines.push(you_have_X(final, 'entered Sokoban'));
            break;
        case ACH_SOKO_PRIZE:
            lines.push(you_have_X(final, 'completed Sokoban'));
            break;
        case ACH_MINE_PRIZE:
            lines.push(you_have_X(final, 'completed the Gnomish Mines'));
            break;
        case ACH_BGRM:
            lines.push(you_have_X(final, 'entered the Big Room'));
            break;
        case ACH_MEDU:
            lines.push(you_have_X(final, 'defeated Medusa'));
            break;
        case ACH_TUNE:
            lines.push(you_have_X(final,
                "learned the tune to open and close the Castle's drawbridge"));
            break;
        case ACH_BELL:
            lines.push(enl_msg(
                final, You_,
                uhave.bell ? 'have' : 'have handled',
                uhave.bell ? 'had' : 'handled',
                ' the Bell of Opening', '',
            ));
            break;
        case ACH_HELL:
            lines.push(enl_msg(final, You_, 'have ', '', 'entered Gehennom', ''));
            break;
        case ACH_CNDL:
            lines.push(enl_msg(
                final, You_,
                uhave.menorah ? 'have' : 'have handled',
                uhave.menorah ? 'had' : 'handled',
                ' the Candelabrum of Invocation', '',
            ));
            break;
        case ACH_BOOK:
            lines.push(enl_msg(
                final, You_,
                uhave.book ? 'have' : 'have handled',
                uhave.book ? 'had' : 'handled',
                ' the Book of the Dead', '',
            ));
            break;
        case ACH_INVK:
            lines.push(you_have_X(final, "gained access to Moloch's Sanctum"));
            break;
        case ACH_AMUL:
            lines.push(enl_msg(
                final, You_,
                (uhave.amulet || u.uhave_amulet) ? 'have' : 'have obtained',
                u.uevent?.ascended ? 'delivered'
                    : (uhave.amulet || u.uhave_amulet) ? 'had' : 'had obtained',
                ' the Amulet of Yendor', '',
            ));
            break;
        case ACH_ENDG:
            lines.push(you_have_X(final, 'reached the Elemental Planes'));
            break;
        case ACH_ASTR:
            lines.push(you_have_X(final, 'reached the Astral Plane'));
            break;
        case ACH_UWIN:
            lines.push(' You ascended!');
            break;
        case ACH_RNK1: case ACH_RNK1 + 1: case ACH_RNK1 + 2: case ACH_RNK1 + 3:
        case ACH_RNK1 + 4: case ACH_RNK1 + 5: case ACH_RNK1 + 6: case ACH_RNK8: {
            const rankTitle = rank_of(
                rank_to_xlev(absidx - (ACH_RNK1 - 1)),
                roleMnum,
                achidx < 0,
            );
            lines.push(you_have_X(final, `attained the rank of ${rankTitle}`));
            break;
        }
        default:
            lines.push(` [Unexpected achievement #${achidx}.]`);
            break;
        }
    }
    return lines;
}

/**
 * C ref: insight.c show_gamelog — NHW_TEXT journal.
 * final==0 → "Logged events:"; else "Major events:" + majors only.
 */
export async function show_gamelog(final) {
    const lines = [];
    lines.push(`${final ? 'Major' : 'Logged'} events:`);
    let eventcnt = 0;
    const list = game.gamelog || [];
    for (const llmsg of list) {
        if (final && !majorevent(llmsg)) continue;
        if (!final && !wizardMode() && spoilerevent(llmsg)) continue;
        if (!eventcnt++) lines.push(' Turn');
        const turn = String(llmsg.turn | 0).padStart(5, ' ');
        lines.push(`${turn}: ${llmsg.text}`);
    }
    if (!eventcnt) lines.push(' none');
    await show_text_pages(lines, { moreAtEnd: true });
}

/**
 * C ref: insight.c do_gamelog (#chronicle).
 */
export async function do_gamelog() {
    if (game.gamelog && game.gamelog.length) {
        await show_gamelog(ENL_GAMEINPROGRESS);
    } else {
        await pline('No chronicled events.');
    }
    return ECMD_OK;
}

/**
 * C ref: insight.c show_conduct — NHW_MENU "Voluntary challenges:".
 * @param {number} final ENL_GAMEINPROGRESS / GAMEOVER*
 */
export async function show_conduct(final) {
    const u = game.u || {};
    if (!u.uconduct) u.uconduct = {};
    if (!u.uroleplay) u.uroleplay = {};
    const c = u.uconduct;
    const rp = u.uroleplay;
    const wiz = wizardMode();
    const lines = [];

    lines.push('Voluntary challenges:');

    // rerolling (always past-tense wording in C)
    if (!rp.reroll) {
        lines.push(' Character rerolling was not enabled.');
    } else if (!(rp.numrerolls | 0)) {
        lines.push(' Your character was not rerolled.');
    } else {
        lines.push(` Your character was rerolled ${N_times(rp.numrerolls)}.`);
    }

    if (rp.blind) lines.push(you_have_been(final, 'blind from birth'));
    if (rp.deaf) lines.push(you_have_been(final, 'deaf from birth'));
    if (rp.pauper) {
        const invent = game.invent;
        lines.push(enl_msg(
            final,
            You_,
            invent ? 'started' : 'are',
            'started out',
            ' without possessions',
            '',
        ));
    }
    if (rp.nudist) lines.push(you_have_been(final, 'faithfully nudist'));

    if (!(c.food | 0)) {
        lines.push(enl_msg(final, You_, 'have gone', 'went', ' without food', ''));
    } else if (!(c.unvegan | 0)) {
        lines.push(you_have_X(final, 'followed a strict vegan diet'));
    } else if (!(c.unvegetarian | 0)) {
        lines.push(you_have_been(final, 'vegetarian'));
    }

    if (!(c.gnostic | 0)) lines.push(you_have_been(final, 'an atheist'));

    if (!(c.weaphit | 0)) {
        lines.push(you_have_never(final, 'hit with a wielded weapon'));
    } else if (wiz) {
        const n = c.weaphit | 0;
        lines.push(you_have_X(final, `hit with a wielded weapon ${n} time${plur(n)}`));
    }

    if (!(c.killer | 0)) lines.push(you_have_been(final, 'a pacifist'));

    if (!(c.literate | 0)) {
        lines.push(you_have_been(final, 'illiterate'));
    } else if (wiz) {
        const n = c.literate | 0;
        lines.push(you_have_X(final, `read items or engraved ${n} time${plur(n)}`));
    }

    if (!(c.pets | 0)) lines.push(you_have_never(final, 'had a pet'));

    const ngenocided = num_genocides();
    if (ngenocided === 0) {
        lines.push(you_have_never(final, 'genocided any monsters'));
    } else {
        lines.push(you_have_X(
            final,
            `genocided ${ngenocided} type${plur(ngenocided)} of monster${plur(ngenocided)}`,
        ));
    }

    if (!(c.polypiles | 0)) {
        lines.push(you_have_never(final, 'polymorphed an object'));
    } else if (wiz) {
        const n = c.polypiles | 0;
        lines.push(you_have_X(final, `polymorphed ${n} item${plur(n)}`));
    }

    if (!(c.polyselfs | 0)) {
        lines.push(you_have_never(final, 'changed form'));
    } else if (wiz) {
        const n = c.polyselfs | 0;
        lines.push(you_have_X(final, `changed form ${n} time${plur(n)}`));
    }

    if (!(c.wishes | 0)) {
        lines.push(you_have_X(final, 'used no wishes'));
    } else {
        const wishes = c.wishes | 0;
        const wisharti = c.wisharti | 0;
        let buf = `used ${wishes} wish${wishes > 1 ? 'es' : ''}`;
        if (wisharti) {
            if (wisharti === wishes) {
                buf += ` (${wisharti > 2 ? 'all ' : wisharti === 2 ? 'both ' : ''}`;
            } else {
                buf += ` (${wisharti} `;
            }
            buf += `for ${wisharti === 1 ? 'an artifact' : 'artifacts'})`;
        }
        lines.push(you_have_X(final, buf));
        if (!wisharti) {
            lines.push(enl_msg(
                final,
                You_,
                'have not wished',
                'did not wish',
                ' for any artifacts',
                '',
            ));
        }
    }

    if (sokoban_in_play()) {
        let presentverb = 'have violated';
        let pastverb = 'violated';
        let buf;
        if (!(c.sokocheat | 0)) {
            presentverb = 'have not violated';
            pastverb = 'did not violate';
            buf = ' any of the special Sokoban rules';
        } else {
            buf = ` the special Sokoban rules ${N_times(c.sokocheat)}`;
        }
        lines.push(enl_msg(final, You_, presentverb, pastverb, buf, ''));
    }

    for (const L of show_achievements_lines(final)) lines.push(L);

    await show_nhw_menu_text(lines);
}

/**
 * C ref: insight.c doconduct (#conduct).
 */
export async function doconduct() {
    await show_conduct(ENL_GAMEINPROGRESS);
    return ECMD_OK;
}

/** C ref: insight.c UniqCritterIndx */
function UniqCritterIndx(mndx) {
    const ptr = mons(mndx);
    return !!((ptr?.geno ?? 0) & G_UNIQ) && mndx !== PM_HIGH_CLERIC;
}

/** C ref: mondata.h type_is_pname */
function type_is_pname(ptr) {
    return !!((ptr?.mflags2 ?? 0) & M2_PNAME);
}

/** C ref: insight.c list_vanquished — mons[i].pmnames[NEUTRAL] (case,
 * hyphens and all: "Uruk-hai", "Keystone Kop"); never the PM_* enum label. */
function pmname_neutral(mndx) {
    return pmnames[mndx]?.[NEUTRAL] ?? 'monster';
}

function strncmpi(a, b, n) {
    return a.slice(0, n).toLowerCase() === b.slice(0, n).toLowerCase();
}

function isDigit(ch) {
    return ch >= '0' && ch <= '9';
}

/**
 * C ref: insight.c vanqsort_cmp — qsort comparator on mindx[].
 * Contest stable sort; JS Array.sort is stable.
 */
function vanqsort_cmp(indx1, indx2) {
    const mode = game.flags?.vanq_sortmode ?? VANQ_MLVL_MNDX;
    const p1 = mons(indx1);
    const p2 = mons(indx2);
    let res = 0;
    switch (mode) {
    default:
    case VANQ_MLVL_MNDX:
        res = (p2?.mlevel | 0) - (p1?.mlevel | 0);
        break;
    case VANQ_MSTR_MNDX:
        res = (p2?.difficulty | 0) - (p1?.difficulty | 0);
        break;
    case VANQ_ALPHA_SEP: {
        const uniq1 = UniqCritterIndx(indx1) ? 1 : 0;
        const uniq2 = UniqCritterIndx(indx2) ? 1 : 0;
        if (uniq1 !== uniq2) {
            res = uniq2 - uniq1;
            break;
        }
    }
    // FALLTHROUGH
    case VANQ_ALPHA_MIX: {
        // C strcmpi — byte order, not ICU localeCompare (Linux vs macOS).
        const nam1 = pmname_neutral(indx1).toLowerCase();
        const nam2 = pmname_neutral(indx2).toLowerCase();
        res = nam1 < nam2 ? -1 : nam1 > nam2 ? 1 : 0;
        break;
    }
    case VANQ_MCLS_HTOL:
    case VANQ_MCLS_LTOH: {
        /* C `:2658–2699`; JS mlet is the S_* name, its defsym.h enum
           ordinal is the DEF_MONSYM_MLET index (S_ANT == 1). */
        let mcls1 = DEF_MONSYM_MLET.indexOf(p1?.mlet);
        let mcls2 = DEF_MONSYM_MLET.indexOf(p2?.mlet);
        const S_ZOMBIE = DEF_MONSYM_MLET.indexOf('S_ZOMBIE');
        if (mcls1 > S_ZOMBIE && mcls2 > S_ZOMBIE) {
            const punctclasses = [
                'S_LIZARD', 'S_EEL', 'S_GOLEM', 'S_GHOST', 'S_DEMON', 'S_HUMAN',
            ];
            let punct = punctclasses.indexOf(p1?.mlet);
            if (punct >= 0) mcls1 = S_ZOMBIE + 1 + punct;
            punct = punctclasses.indexOf(p2?.mlet);
            if (punct >= 0) mcls2 = S_ZOMBIE + 1 + punct;
        }
        res = mcls1 - mcls2; /* class */
        if (res === 0) {
            /* force Riders to be sorted before demons */
            res = (is_rider(p2) ? 1 : 0) - (is_rider(p1) ? 1 : 0);
            if (res) break;
            res = (p1?.mlevel | 0) - (p2?.mlevel | 0); /* mlevel low to high */
            if (mode === VANQ_MCLS_HTOL) res = -res; /* mlevel high to low */
        }
        break;
    }
    case VANQ_COUNT_H_L:
    case VANQ_COUNT_L_H: {
        const mv = game.mvitals || [];
        let died1 = mv[indx1]?.died | 0;
        let died2 = mv[indx2]?.died | 0;
        res = died2 - died1;
        if (mode === VANQ_COUNT_L_H) res = -res;
        break;
    }
    }
    if (res === 0) res = indx1 - indx2;
    return res;
}

/**
 * C ref: insight.c vanqorders `:2601–2618` — [key, short, menu-desc].
 * Index is the VANQ_* mode (0..7); the menu shows the long desc.
 */
export const vanqorders = [
    ['t', 'traditional: by monster level',
        'traditional: by monster level, by internal monster index'],
    ['d', 'by monster difficulty rating',
        'by monster difficulty rating, by internal monster index'],
    ['a', 'alphabetically, unique monsters separate',
        'alphabetically, first unique monsters, then others'],
    ['A', 'alphabetically, unique monsters intermixed',
        'alphabetically, unique monsters and others intermixed'],
    ['C', 'by monster class, high to low level in class',
        'by monster class, high to low level within class'],
    ['c', 'by monster class, low to high level in class',
        'by monster class, low to high level within class'],
    ['n', 'by count, high to low',
        'by count, high to low, by internal index within tied count'],
    ['z', 'by count, low to high',
        'by count, low to high, by internal index within tied count'],
];

/**
 * C ref: insight.c set_vanq_order `:2717–2765` — #vanquished/#genocided
 * sort-order menu (PICK_ONE over vanqorders; ALPHA_MIX + MCLS_HTOL
 * suppressed, COUNT_* suppressed for genocided, ALPHA_SEP relabelled
 * for genocided; current mode preselected — `selected` paints '*' via
 * the pick-one primitive, wintty.c `:1467–1473`). C can return 2 picks
 * (preselected + choice); the primitive returns one, so that branch is
 * a named omission — behaviour (cancel → -1, mode unchanged;
 * pick → mode set) matches.
 * Dynamic options.js import: same shape as artifact.js invoke menus.
 */
export async function set_vanq_order(for_vanq) {
    const { select_menu_pick_one } = await import('./options.js');
    const { ATR_INVERSE } = await import('./terminal.js');
    // C: MENU_ITEMFLAGS_SELECTED on the current mode (paints '*' via wintty).
    const cur = game.flags?.vanq_sortmode ?? VANQ_MLVL_MNDX;
    const items = [
        {
            text: `Sort order for ${
                for_vanq ? 'vanquished monster counts (also genocided types)'
                    : 'genocided monster types (also vanquished counts)'}`,
            attr: ATR_INVERSE,
            selectable: false,
        },
        { text: '', attr: 0, selectable: false },
    ];
    for (let i = 0; i < vanqorders.length; i++) {
        if (i === VANQ_ALPHA_MIX || i === VANQ_MCLS_HTOL) continue;
        /* suppress some orderings if this menu is for '#genocided' */
        if (!for_vanq && (i === VANQ_COUNT_H_L || i === VANQ_COUNT_L_H)) continue;
        let desc = vanqorders[i][2];
        /* unique monsters can't be genocided so "alpha, unique separate"
           and "alpha, unique intermixed" are confusing descriptions when
           this menu is for #genocided rather than for #vanquished */
        if (!for_vanq && i === VANQ_ALPHA_SEP) desc = 'alphabetically';
        items.push({
            text: desc,
            attr: 0,
            selectable: true,
            selector: vanqorders[i][0],
            a_int: i + 1,
            selected: i === cur,
        });
    }
    const n = await select_menu_pick_one(items);
    if (n?.kind !== 'pick' || !n.item) return -1;
    const choice = ((n.item.a_int | 0) - 1) | 0;
    if (!game.flags) game.flags = {};
    game.flags.vanq_sortmode = choice;
    return choice;
}

/**
 * C ref: defsym.h MONSYM descs (`def_monsyms[].explain`, via drawing.c)
 * keyed by the JS S_* mlet string. Only read for the class-header arm
 * (by-class sort modes); S_invisible has no live member (absent from
 * generated mlets) but is kept for table completeness.
 */
const MLET_EXPLAIN = {
    S_ANT: 'ant or other insect',
    S_BLOB: 'blob',
    S_COCKATRICE: 'cockatrice',
    S_DOG: 'dog or other canine',
    S_EYE: 'eye or sphere',
    S_FELINE: 'cat or other feline',
    S_GREMLIN: 'gremlin',
    S_HUMANOID: 'humanoid',
    S_IMP: 'imp or minor demon',
    S_JELLY: 'jelly',
    S_KOBOLD: 'kobold',
    S_LEPRECHAUN: 'leprechaun',
    S_MIMIC: 'mimic',
    S_NYMPH: 'nymph',
    S_ORC: 'orc',
    S_PIERCER: 'piercer',
    S_QUADRUPED: 'quadruped',
    S_RODENT: 'rodent',
    S_SPIDER: 'arachnid or centipede',
    S_TRAPPER: 'trapper or lurker above',
    S_UNICORN: 'unicorn or horse',
    S_VORTEX: 'vortex',
    S_WORM: 'worm',
    S_XAN: 'xan or other mythical/fantastic insect',
    S_LIGHT: 'light',
    S_ZRUTY: 'zruty',
    S_ANGEL: 'angelic being',
    S_BAT: 'bat or bird',
    S_CENTAUR: 'centaur',
    S_DRAGON: 'dragon',
    S_ELEMENTAL: 'elemental',
    S_FUNGUS: 'fungus or mold',
    S_GNOME: 'gnome',
    S_GIANT: 'giant humanoid',
    S_invisible: 'invisible monster',
    S_JABBERWOCK: 'jabberwock',
    S_KOP: 'Keystone Kop',
    S_LICH: 'lich',
    S_MUMMY: 'mummy',
    S_NAGA: 'naga',
    S_OGRE: 'ogre',
    S_PUDDING: 'pudding or ooze',
    S_QUANTMECH: 'quantum mechanic',
    S_RUSTMONST: 'rust monster or disenchanter',
    S_SNAKE: 'snake',
    S_TROLL: 'troll',
    S_UMBER: 'umber hulk',
    S_VAMPIRE: 'vampire',
    S_WRAITH: 'wraith',
    S_XORN: 'xorn',
    S_YETI: 'apelike creature',
    S_ZOMBIE: 'zombie',
    S_HUMAN: 'human or elf',
    S_GHOST: 'ghost',
    S_GOLEM: 'golem',
    S_DEMON: 'major demon',
    S_EEL: 'sea monster',
    S_LIZARD: 'lizard',
    S_WORM_TAIL: 'long worm tail',
};

/**
 * C ref: insight.c list_vanquished `:2784–2949` — #vanquished / disclosure /
 * dumplog ('A' force-sort menu, 'd' => 'y'). ask-path yn (`:2834–2843`;
 * single-type C `"ynq\033a"` ESC-pad simplified to 'ynq' — named, same as
 * list_genocided); 'q' bumps done_stopprint (`:2848–2849`); 'a' with
 * ntypes>1 goes through set_vanq_order(TRUE), cancel returns (`:2854–2855`);
 * class-header modes head each mlet run with the upstart'ed def_monsyms
 * explain, Riders under their own "Rider" header (`:2873–2886`; ATR_NONE at
 * final disclosure else iflags.menu_headings — the text-menu primitive
 * carries no per-line attr, so headings ride as plain lines, genocided
 * precedent); uniq `:2888–2895`, non-uniq `:2896–2907`, pfx `:2910–2917`,
 * tally `:2923–2927`. Named: DUMPLOG-only `putstr(0, ...)` "No creatures
 * were vanquished." (`:2944–2947` — compiled out, config.h; DUMPLOG
 * retired, D-1776).
 * @param {string} defquery 'y'|'a'|'A'|'d'|...
 * @param {boolean} ask end-of-game disclose yn
 */
export async function list_vanquished(defquery, ask) {
    /* C `:2796–2797` */
    const force_sort = defquery === 'A';
    const dumping = defquery === 'd';
    if (force_sort) { /* iflags.menu_requested via dovanquished() */
        /* choose value for vanq_sortmode via menu; ESC cancels choosing
           sort order but continues with vanquishd monsters display */
        await set_vanq_order(true); /* (void) — keep going either way */
    }
    if (dumping || force_sort) {
        /* switch from 'A' or 'd' to 'y' (`:2810–2811`) */
        defquery = 'y';
        ask = false; /* redundant */
    }

    /* get totals first (C `:2815–2820`) */
    const mv = game.mvitals || [];
    const mindx = [];
    let total_killed = 0;
    for (let i = LOW_PM; i < NUMMONS; i++) {
        const nkilled = mv[i]?.died | 0;
        if (!nkilled)
            continue;
        mindx.push(i);
        total_killed += nkilled;
    }
    const ntypes = mindx.length;

    /* vanquished creatures list; includes all dead monsters, not just those
       killed by the player (`:2823–2826`) */
    if (ntypes !== 0) {
        let c;
        if (ask) {
            let allow;
            let dq = defquery;
            if (ntypes > 1) {
                allow = 'ynaq'; /* ynaqchars (`:2835`; decl.c) */
            } else {
                allow = 'ynq'; /* ynqchars (`:2837`); C `:2838` appends
                    "\033a" so a lone type still accepts 'a' — ESC-pad
                    simplified (named, same as list_genocided) */
                if (dq === 'a') /* potential default from 'disclose' */
                    dq = 'y';
            }
            c = await yn_function(
                'Do you want an account of creatures vanquished?',
                allow,
                dq,
                true, /* C `:2842–2843` TRUE */
            );
        } else {
            c = defquery;
        }
        if (c === 'q') { /* C `:2848–2849` */
            if (!game.program_state) game.program_state = {};
            game.program_state.done_stopprint =
                (game.program_state.done_stopprint | 0) + 1;
        }
        if (c === 'y' || c === 'a') {
            if (c === 'a' && ntypes > 1) { /* ask user to choose sort order */
                /* choose value for vanq_sortmode via menu; ESC cancels list
                   of vanquished monsters but does not set 'done_stopprint' */
                if ((await set_vanq_order(true)) < 0) /* `:2854–2855` */
                    return;
            }
            /* C `:2857–2860` */
            const mode = game.flags?.vanq_sortmode ?? VANQ_MLVL_MNDX;
            const uniq_header = mode === VANQ_ALPHA_SEP;
            const class_header = (mode === VANQ_MCLS_LTOH
                || mode === VANQ_MCLS_HTOL) && ntypes > 1;

            /* C `:2867` — JS sort is stable, like the contest qsort. */
            mindx.sort(vanqsort_cmp);
            const lines = [];
            lines.push('Vanquished creatures:'); /* C `:2863` */
            if (!dumping) lines.push(''); /* C `:2864–2865` */

            /* C `:2827–2829`; prev_mlet 0 matches no class (S_ANT is 1,
               defsym.h) so the first header always prints — numeric 0 never
               equals a JS mlet string, same effect. */
            let was_uniq = false, special_hdr = false;
            let prev_mlet = 0;
            for (let ni = 0; ni < ntypes; ni++) {
                const i = mindx[ni];
                const nkilled = mv[i]?.died | 0;
                const ptr = mons(i);
                const rider = is_rider(ptr); /* C `:2871` */
                const mlet = ptr?.mlet; /* C `:2872` */
                if (class_header
                    && (mlet !== prev_mlet || (special_hdr && !rider))) {
                    let hdr;
                    if (!rider) {
                        hdr = MLET_EXPLAIN[mlet] ?? mlet; /* `:2876` */
                        special_hdr = false;
                    } else {
                        hdr = 'Rider'; /* `:2879` */
                        special_hdr = true;
                    }
                    /* 'ask' implies final disclosure, where highlighting
                       of various header lines is suppressed (`:2882–2885`;
                       ATR_NONE vs iflags.menu_headings — the text-menu
                       primitive carries no per-line attr, plain line). */
                    lines.push(upstart(hdr));
                    prev_mlet = mlet;
                }
                const name = pmname_neutral(i);
                let buf;
                if (UniqCritterIndx(i)) { /* C `:2888–2895` */
                    buf = `${!type_is_pname(ptr) ? 'the ' : ''}${name}`;
                    if (nkilled > 1)
                        buf += ` (${N_times(nkilled)})`; /* eos+`:2893–2894` */
                    was_uniq = true;
                } else { /* C `:2896–2907` */
                    if (uniq_header && was_uniq) {
                        lines.push('');
                        was_uniq = false;
                    }
                    /* trolls or undead might have come back,
                       but we don't keep track of that */
                    if (nkilled === 1)
                        buf = an(name);
                    else
                        buf = `${String(nkilled).padStart(3, ' ')} ${makeplural(name)}`; /* `%3d %s` */
                }
                /* number of leading spaces to match 3 digit prefix
                   (`:2910–2913`; the strncmpi clone returns boolean-true on
                   match, so `? 0 :` keeps C's `!strncmpi ? 0 :` sense) */
                let pfx = strncmpi(buf, 'the ', 4) ? 0
                    : strncmpi(buf, 'an ', 3) ? 1
                        : strncmpi(buf, 'a ', 2) ? 2
                            : !isDigit(buf[2] || '') ? 4 : 0;
                if (class_header) /* `:2914–2915` */
                    ++pfx;
                lines.push(`${' '.repeat(pfx)}${buf}`); /* `%*s%s` `:2916–2917` */
            }
            /* C's commented-out Hallucination partridge (`:2919–2922`) stays out. */
            if (ntypes > 1) {
                if (!dumping) lines.push('');
                lines.push(`${total_killed} creatures vanquished.`); /* `:2926` */
            }
            /* show_nhw_menu_text ≡ create/display/destroy (`:2862`,`:2929–2930`) */
            await show_nhw_menu_text(lines);
        }

    /* For end-of-game disclosure, we're only called when some monsters
       were vanquished and won't reach these 'else-if's (`:2933–2940`). */
    } else if (!game.program_state?.gameover) {
        /* #vanquished rather than final disclosure, so pline() is ok */
        await pline('No creatures have been vanquished.');
    }
    /* C `:2944–2947` — `#ifdef DUMPLOG ... else if (dumping)
       putstr(0, 0, "No creatures were vanquished.")` is compiled out in the
       pinned build (config.h) and DUMPLOG is retired (D-1776); named. */
}

/**
 * C ref: insight.c dovanquished (#vanquished).
 */
export async function dovanquished() {
    const defq = game.iflags?.menu_requested ? 'A' : 'y';
    await list_vanquished(defq, false);
    if (game.iflags) game.iflags.menu_requested = false;
    return ECMD_OK;
}

/**
 * C ref: insight.c list_genocided `:3043–3048` prompt assembly
 * (`"Do you want a list of %sspecies%s%s?"`). Pure for the maintained
 * test pin.
 */
export function genocided_prompt(nextinct, ngenocided) {
    return 'Do you want a list of ' +
        ((nextinct && !ngenocided) ? 'extinct ' : '') +
        'species' +
        (ngenocided ? ' genocided' : '') +
        ((nextinct && ngenocided) ? ' and extinct' : '') +
        '?';
}

/**
 * C ref: insight.c list_genocided `:3072–3074` menu title
 * (`"%s%s species:"`). Pure for the maintained test pin.
 */
export function genocided_title(ngenocided, nextinct) {
    return (ngenocided ? 'Genocided' : 'Extinct') +
        ((nextinct && ngenocided) ? ' or extinct' : '') +
        ' species:';
}

/**
 * C ref: insight.c list_genocided `:3092–3103` per-species line
 * (`" %s"` + `" (extinct)"` when G_GONE bits are exactly G_EXTINCT).
 */
export function genocided_line(mndx) {
    let buf = ` ${makeplural(pmname_neutral(mndx))}`;
    /* "Extinct" is unfortunate terminology ... we only append
       "(extinct)" if the G_GENOD bit is clear. */
    if ((((game.mvitals?.[mndx]?.mvflags ?? 0) & G_GONE) | 0) === G_EXTINCT)
        buf += ' (extinct)';
    return buf;
}

/**
 * C ref: insight.c list_genocided `:3007–3131` — #genocided / disclosure /
 * dumplog ('d' => 'y', 'g' => 'y' genocides-only). Extinctions join the
 * census only at gameover/wizard/discover. ngone>1 asks ynaq (single:
 * ynq — C `"ynq\\033a"` ESC-pad simplified, same as list_vanquished);
 * 'q' bumps done_stopprint; 'a' with ngone>1 goes through
 * set_vanq_order(FALSE); COUNT_* sort falls back to VANQ_ALPHA_MIX;
 * class-header modes head each mlet run with the upstart'ed
 * def_monsyms explain (ATR_NONE at final disclosure, else
 * iflags.menu_headings — the text-menu primitive carries no per-line
 * attr, so headings ride as plain lines, named in the envelope).
 * DUMPLOG-only `putstr(0, ...)` "No species..." arm stays named
 * (DUMPLOG retired, D-1776).
 */
export async function list_genocided(defquery, ask) {
    const dumping = defquery === 'd';
    const genoing = defquery === 'g';
    if (dumping || genoing) defquery = 'y';
    let both = !!(
        game.program_state?.gameover || wizardMode() ||
        game.flags?.explore || game.flags?.discover
    );
    if (genoing) both = false; /* genocides only, not extinctions */

    /* this goes through the whole monster list up to three times but will
       happen rarely and is simpler than a more general single pass check;
       extinctions are only revealed during end of game disclosure or when
       running in wizard or explore mode */
    const ngenocided = num_genocides();
    const nextinct = both ? num_extinct() : 0;
    const mvflags = G_GENOD | (both ? G_EXTINCT : 0);
    const mindx = num_gone(mvflags);
    const ngone = mindx.length;

    /* genocided or extinct species list */
    if (ngone > 0) {
        const c = ask
            ? await yn_function(
                genocided_prompt(nextinct, ngenocided),
                ngone > 1 ? 'ynaq' : 'ynq',
                defquery,
            )
            : defquery;
        if (c === 'q') {
            if (!game.program_state) game.program_state = {};
            game.program_state.done_stopprint =
                (game.program_state.done_stopprint | 0) + 1;
        }
        if (c === 'y' || c === 'a') {
            let class_header = false;
            if (ngone > 1) {
                if (c === 'a') { /* ask player to choose sort order */
                    /* #genocided shares #vanquished's sort order */
                    if ((await set_vanq_order(false)) < 0) return;
                }
                /* sort orderings count-high-to-low or count-low-to-high
                   don't make sense for genocides; if the preferred order
                   to set to either of those, use alphabetical instead;
                   note: the tie breaker for by-class is level-high-to-low
                   or level-low-to-high rather than count so is ok as-is */
                if (!game.flags) game.flags = {};
                const save_sortmode = game.flags.vanq_sortmode;
                if (save_sortmode === VANQ_COUNT_H_L
                    || save_sortmode === VANQ_COUNT_L_H)
                    game.flags.vanq_sortmode = VANQ_ALPHA_MIX;
                mindx.sort(vanqsort_cmp);
                class_header = game.flags.vanq_sortmode === VANQ_MCLS_LTOH
                    || game.flags.vanq_sortmode === VANQ_MCLS_HTOL;
                game.flags.vanq_sortmode = save_sortmode;
            }

            const lines = [];
            lines.push(genocided_title(ngenocided, nextinct));
            if (!dumping) lines.push('');

            let prev_mlet = 0;
            for (let i = 0; i < ngone; i++) {
                const mndx = mindx[i];
                const mlet = mons(mndx)?.mlet;
                if (class_header && mlet !== prev_mlet) {
                    /* 'ask' implies final disclosure, where highlighting
                       of various header lines is suppressed */
                    lines.push(upstart(MLET_EXPLAIN[mlet] ?? mlet));
                    prev_mlet = mlet;
                }
                lines.push(genocided_line(mndx));
            }
            if (!dumping) lines.push('');
            if (ngenocided > 0) lines.push(`${ngenocided} species genocided.`);
            if (nextinct > 0) lines.push(`${nextinct} species extinct.`);

            await show_nhw_menu_text(lines);
        }

    /* See the comment for similar code near the end of list_vanquished(). */
    } else if (!game.program_state?.gameover) {
        /* #genocided rather than final disclosure, so pline() is ok and
           extinction has been ignored */
        await pline(`No creatures have been genocided${genoing ? ' yet' : ''}.`);
    }
}

/**
 * C ref: insight.c dogenocided (#genocided).
 */
export async function dogenocided() {
    const defq = game.iflags?.menu_requested ? 'a' : 'y';
    await list_genocided(defq, false);
    if (game.iflags) game.iflags.menu_requested = false;
    return ECMD_OK;
}

/**
 * C ref: insight.c piousness — alignment fervor adverb for ustatusline.
 * showneg=false path used by stethoscope/self-probe.
 */
export function piousness(showneg, suffix) {
    const record = game.u?.ualign?.record | 0;
    let pio;
    if (record >= 20) pio = 'piously';
    else if (record > 13) pio = 'devoutly';
    else if (record > 8) pio = 'fervently';
    else if (record > 3) pio = 'stridently';
    else if (record === 3) pio = '';
    else if (record > 0) pio = 'haltingly';
    else if (record === 0) pio = 'nominally';
    else if (!showneg) pio = 'insufficiently';
    else if (record >= -3) pio = 'strayed';
    else if (record >= -8) pio = 'sinned';
    else pio = 'transgressed';

    let buf = pio;
    if (suffix && (!showneg || record >= 0)) {
        if (record !== 3) buf += ' ';
        buf += suffix;
    }
    return buf;
}

/**
 * C ref: insight.c size_str :3203–3230 — msize → adjective for mstatusline.
 * C order: TINY/SMALL/MEDIUM/LARGE/HUGE/GIGANTIC, else `unknown size (%d)`.
 */
function size_str(msize) {
    switch (msize | 0) {
    case MZ_TINY: return 'tiny';
    case MZ_SMALL: return 'small';
    case MZ_MEDIUM: return 'medium';
    case MZ_LARGE: return 'large';
    case MZ_HUGE: return 'huge';
    case MZ_GIGANTIC: return 'gigantic';
    default: return `unknown size (${msize | 0})`;
    }
}

/**
 * C ref: priest.c mon_aligntyp :280–290 — ispriest ? EPRI shralign
 * : isminion ? EMIN min_align : data.maligntyp; A_NONE passthrough,
 * else sign → LAWFUL/CHAOTIC/NEUTRAL. Caller: insight.c mstatusline :3277.
 */
function mon_aligntyp(mon) {
    const algn = mon?.ispriest ? (EPRI(mon)?.shralign ?? 0)
        : mon?.isminion ? (EMIN(mon)?.min_align ?? 0)
            : (mon?.data?.maligntyp ?? 0);
    if (algn === A_NONE) return A_NONE;
    if (algn > 0) return A_LAWFUL;
    if (algn < 0) return A_CHAOTIC;
    return A_NEUTRAL;
}

/**
 * C ref: insight.c mstatusline :3275–3398 — stethoscope/probe monster status.
 * C order: mon_aligntyp :3277; tame/peaceful+wizard :3281–3290; long-worm
 * :3292–3306 (count_wsegs, head-inclusive ++nsegs, wseg_at(bhitpos)+ordin);
 * shapechanger :3307; eating :3311; mhidden :3315 (mundetected||m_ap_type||
 * visible_region_at(bhitpos)); cancelled/confused/blind/stunned :3320–3326;
 * asleep/can't-move/meditating :3328–3337 (#else arm live); scared/trapped/
 * speed/invisible :3338–3347; ustuck :3348–3366 (uswallow digests/is_animal+
 * enfolds, else sticks(youmonst)); usteed :3368–3380 (carrying + Wounded_legs
 * EWounded_legs&BOTH_SIDES mbodypart LEG makeplural); leashed :3381;
 * x_monnam ARTICLE_YOUR SUPPRESS_IT|SUPPRESS_INVISIBLE :3386; pline :3391.
 * Callers set gb.bhitpos (apply.c:395 stethoscope rx,ry; zap bhitm);
 * JS reads game.bhitpos ?? game._bhitpos, falling back to the head pos
 * when no caller set it (apply stethoscope currently doesn't).
 */
export async function mstatusline(mtmp) {
    if (!mtmp) return;
    const u = game.u || {};
    const alignment = mon_aligntyp(mtmp); // C :3277
    let info = '';
    // C :3281–3290 — tame (wizard count + hungry/apport unless minion)
    if (mtmp.mtame) {
        info += ', tame';
        if (wizardMode()) {
            info += ` (${mtmp.mtame | 0}`;
            if (!mtmp.isminion) {
                const edog = EDOG(mtmp) || {};
                info += `; hungry ${edog.hungrytime | 0}; apport ${edog.apport | 0}`;
            }
            info += ')';
        }
    } else if (mtmp.mpeaceful) {
        info += ', peaceful';
    }
    // C :3292–3306 — long worm segment feedback (head counts as a segment)
    if ((mtmp.data?.mndx ?? mtmp.mnum) === PM_LONG_WORM && PM_LONG_WORM >= 0) {
        const nsegs0 = count_wsegs(mtmp);
        if (!nsegs0) {
            info += ', single segment';
        } else {
            const nsegs = (nsegs0 | 0) + 1; // include head
            const bhit = game.bhitpos ?? game._bhitpos;
            const segndx = wseg_at(mtmp,
                (bhit?.x ?? mtmp.mx) | 0, (bhit?.y ?? mtmp.my) | 0);
            info += `, ${segndx | 0}${ordin(segndx)} of ${nsegs} segments`;
        }
    }
    // C :3307–3310 — shapechanger (innate form hidden, fact exposed)
    if (ismnum(mtmp.cham) && (mtmp.data?.mndx ?? -1) !== (mtmp.cham | 0)) {
        info += ', shapechanger';
    }
    // C :3311–3314 — pets eating mimic corpses mimic while eating
    if (mtmp.meating) info += ', eating';
    // C :3315–3319 — stethoscope exposes mimic first; probing wand doesn't
    {
        const bhit = game.bhitpos ?? game._bhitpos;
        const bx = ((bhit?.x ?? mtmp.mx) | 0);
        const by = ((bhit?.y ?? mtmp.my) | 0);
        if (mtmp.mundetected || (mtmp.m_ap_type | 0)
            || visible_region_at(bx, by)) {
            info += mhidden_description(mtmp,
                MHID_PREFIX | MHID_ARTICLE | MHID_ALTMON | MHID_REGION);
        }
    }
    // C :3320–3327 — cancellable ailments
    if (mtmp.mcan) info += ', cancelled';
    if (mtmp.mconf) info += ', confused';
    if (mtmp.mblinded || !mtmp.mcansee) info += ', blind';
    if (mtmp.mstun) info += ', stunned';
    // C :3328–3337 — asleep; #else live arm: frozen||!mcanmove; else waitmask
    if (mtmp.msleeping) {
        info += ', asleep';
    } else if (mtmp.mfrozen || !mtmp.mcanmove) {
        info += ", can't move";
    } else if (((mtmp.mstrategy | 0) & STRAT_WAITMASK) !== 0) {
        info += ', meditating';
    }
    // C :3338–3347 — flee/trapped/speed/invisible
    if (mtmp.mflee) info += ', scared';
    if (mtmp.mtrapped) info += ', trapped';
    if (mtmp.mspeed) {
        info += (mtmp.mspeed === MFAST) ? ', fast'
            : (mtmp.mspeed === MSLOW) ? ', slow'
                : ', [? speed]';
    }
    if (mtmp.minvis) info += ', invisible';
    // C :3348–3366 — ustuck: swallow/engulf wins over sticks(youmonst)
    if (mtmp === u.ustuck) {
        const pm = u.ustuck?.data;
        if (u.uswallow) {
            info += digests(pm) ? ', digesting you'
                : (is_animal(pm) && !enfolds(pm)) ? ', swallowing you'
                    : ', engulfing you';
        } else {
            info += !sticks(game.youmonst?.data) ? ', holding you'
                : ', held by you';
        }
    }
    // C :3368–3380 — usteed carries; hero leg damage applies to steed
    if (mtmp === u.usteed) {
        info += ', carrying you';
        if (((u.HWounded_legs | 0) || (u.EWounded_legs | 0) || u.Wounded_legs)) {
            const legs = ((u.EWounded_legs | 0) & BOTH_SIDES);
            let what = mbodypart(mtmp, LEG);
            if (legs === BOTH_SIDES) what = makeplural(what);
            info += `, injured ${what}`;
        }
    }
    // C :3381–3384 — leashed
    if (mtmp.mleashed) info += ', leashed';
    // C :3386–3389 — saddled even when named; invisible already suppressed
    const monnambuf = x_monnam(mtmp, ARTICLE_YOUR, null,
        SUPPRESS_IT | SUPPRESS_INVISIBLE, false);
    // C :3391–3397 — `Status of %s (%s, %s):  Level %d  HP %d(%d)  AC %d%s.`
    await pline(
        `Status of ${monnambuf} (${align_str(alignment)}, ${size_str(mtmp.data?.msize ?? MZ_MEDIUM)}):  `
        + `Level ${mtmp.m_lev | 0}  HP ${mtmp.mhp | 0}(${mtmp.mhpmax | 0})  `
        + `AC ${find_mac(mtmp)}${info}.`,
    );
}

/**
 * C ref: insight.c:3402–3489 ustatusline — one-line stethoscope/self-probe
 * status. Callers: apply.c use_stethoscope; zap.c zapyourself WAN_PROBING.
 * Full info chain in C order: Sick dying-from, Stoned, Slimed, Strangled,
 * Vomiting, Confusion, Blind (+ucreamed goop), Stunned, Wounded_legs
 * (EWounded_legs side mask; no side naming per C), Glib, utrap,
 * Fast/Very_fast, uundetected/U_AP_TYPE, Invis, ustuck/uswallow,
 * visible-region cloud; Upolyd mh/mlevel arms live.
 */
export async function ustatusline() {
    const u = game.u || {};
    const name = game.plname || 'Hero';
    const atype = u.ualign?.type ?? 0;
    let info = '';
    // C: Sick → ", dying from[ food poisoning][ and][ illness]"
    if ((u.Sick | 0) || (u.uprops?.[SICK]?.intrinsic | 0)) {
        info += ', dying from';
        if ((u.usick_type | 0) & SICK_VOMITABLE) info += ' food poisoning';
        if ((u.usick_type | 0) & SICK_NONVOMITABLE) {
            if ((u.usick_type | 0) & SICK_VOMITABLE) info += ' and';
            info += ' illness';
        }
    }
    // C: Stoned / Slimed / Strangled / Vomiting / Confusion
    if ((u.Stoned | 0) || (u.uprops?.[STONED]?.intrinsic | 0)) {
        info += ', solidifying';
    }
    if ((u.Slimed | 0) || (u.uprops?.[SLIMED]?.intrinsic | 0)) {
        info += ', becoming slimy';
    }
    if ((u.Strangled | 0) || (u.HStrangled | 0) || (u.EStrangled | 0)
        || (u.uprops?.[STRANGLED]?.intrinsic | 0)
        || (u.uprops?.[STRANGLED]?.extrinsic | 0)) {
        info += ', being strangled';
    }
    if ((u.Vomiting | 0) || (u.uprops?.[VOMITING]?.intrinsic | 0)) {
        info += ', nauseated'; /* !"nauseous" */
    }
    if ((u.HConfusion | 0) || u.Confusion) info += ', confused';
    // C: Blind + ucreamed goop ("goop" == "glop"; variation intentional)
    if (Blind()) {
        info += ', blind';
        if (u.ucreamed | 0) {
            // C: (long) u.ucreamed < BlindedTimeout || Blindfolded
            //     || !haseyes(youmonst.data); BlindedTimeout ≡ HBlinded &
            //     TIMEOUT, Blindfolded ≡ EBlinded (cf. potion.js)
            if (((u.ucreamed | 0) < (((u.HBlinded | 0) & TIMEOUT)))
                || (u.EBlinded | 0) || !haseyes(game.youmonst?.data)) {
                info += ', cover';
            }
            info += 'ed by sticky goop';
        }
    }
    if ((u.HStun | 0) || u.Stunned) info += ', stunned';
    // C: Wounded_legs && !u.usteed; EWounded_legs tracks left/right/both
    // (HWounded_legs is the timeout); ustatusline never names the side
    if (((u.HWounded_legs | 0) || (u.EWounded_legs | 0) || u.Wounded_legs)
        && !u.usteed) {
        const legs = (u.EWounded_legs | 0) & BOTH_SIDES;
        let what = body_part(LEG);
        if (legs === BOTH_SIDES) what = makeplural(what);
        info += `, injured ${what}`;
    }
    // C: Glib / utrap / Fast
    if (Glib()) info += `, slippery ${fingers_or_gloves(true)}`;
    if (u.utrap) info += ', trapped';
    if (Fast()) info += Very_fast() ? ', very fast' : ', fast';
    // C: uundetected → concealed, else U_AP_TYPE → disguised
    if (u.uundetected) {
        info += ', concealed';
    } else if (((game.youmonst?.m_ap_type | 0) & M_AP_TYPMASK)
        !== M_AP_NOTHING) {
        info += ', disguised';
    }
    if (Invis()) info += ', invisible';
    // C: ustuck — uswallow digests ? digested : engulfed; else sticks ?
    // holding : held; then a_monnam(u.ustuck)
    if (u.ustuck) {
        if (u.uswallow) {
            info += digests(u.ustuck.data)
                ? ', being digested by '
                : ', engulfed by ';
        } else if (!sticks(game.youmonst?.data)) {
            info += ', held by ';
        } else {
            info += ', holding ';
        }
        info += a_monnam(u.ustuck);
    }
    // C: !uswallow + visible region at hero → cloud of poison gas / vapor
    if (!u.uswallow) {
        const reg = visible_region_at(u.ux, u.uy);
        if (reg) info += `, in a cloud of ${reg_damg(reg) ? 'poison gas' : 'vapor'}`;
    }
    const poly = Upolyd(u);
    const level = poly ? (mons(u.umonnum | 0)?.mlevel | 0) : (u.ulevel ?? 1);
    const hp = poly ? (u.mh ?? 0) : (u.uhp ?? 0);
    const hpmax = poly ? (u.mhmax ?? hp) : (u.uhpmax ?? hp);
    const ac = u.uac ?? 10;
    await pline(
        `Status of ${name} (${piousness(false, align_str(atype))}):  `
        + `Level ${level}  HP ${hp}(${hpmax})  AC ${ac}${info}.`,
    );
}
