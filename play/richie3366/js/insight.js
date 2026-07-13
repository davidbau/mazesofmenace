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
//            wizard count detail lines. show_achievements only when
//            final||wizard (deferred body). Final disclosure path deferred.
//   vanquished: in-progress #vanquished with defquery 'y' (not ask);
//               mvitals.died census; traditional VANQ_MLVL_MNDX sort;
//               ordinary an()/makeplural lines + total when ntypes>1;
//               uniq "the "/pname + N_times; empty → pline.
//               Deferred: set_vanq_order / 'm #vanquished' force_sort;
//               disclose yn ask; class-header modes; dumplog 'd';
//               Hallucination footer.
//   genocided: in-progress empty → pline "No creatures have been
//              genocided."; ngone>0 NHW_MENU / extinctions deferred.

import { game } from './gstate.js';
import {
    ACH_SOKO,
    ECMD_OK,
    ENL_GAMEINPROGRESS,
    G_GENOD,
    LL_SPOILER,
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
import { pline } from './display.js';
import { show_text_pages, show_nhw_menu_text } from './pager.js';
import {
    NUMMONS, mons, G_UNIQ, M2_PNAME, monsterNames,
} from './monsters.js';
import { an, makeplural } from './objnam.js';

const PM_HIGH_CLERIC = monsterNames.indexOf('PM_HIGH_CLERIC');

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

/** C ref: insight.c N_times */
function N_times(n) {
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
function num_genocides() {
    const mv = game.mvitals || [];
    let n = 0;
    for (let i = LOW_PM; i < NUMMONS; i++) {
        if (((mv[i]?.mvflags ?? 0) & G_GENOD) !== 0) n++;
    }
    return n;
}

/** C ref: insight.c sokoban_in_play — ACH_SOKO in u.uachieved */
function sokoban_in_play() {
    const ach = game.u?.uachieved;
    if (!ach) return false;
    for (let i = 0; ach[i]; i++) {
        if ((ach[i] | 0) === ACH_SOKO) return true;
    }
    return false;
}

/**
 * C ref: insight.c show_achievements — empty unless final||wizard.
 * Achievement list body deferred.
 */
function show_achievements_lines(final) {
    if (!final && !wizardMode()) return [];
    // count_achievements / ordered disclosure deferred
    return [];
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

/** Neutral pmnames[] → display string (PM_KOBOLD → kobold). */
function pmname_neutral(mndx) {
    const raw = monsterNames[mndx] || 'monster';
    return String(raw).replace(/^PM_/, '').replace(/_/g, ' ').toLowerCase();
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
        const name1 = pmname_neutral(indx1);
        const name2 = pmname_neutral(indx2);
        res = name1.toLowerCase().localeCompare(name2.toLowerCase());
        break;
    }
    case VANQ_MCLS_HTOL:
    case VANQ_MCLS_LTOH: {
        // mlet is symbolic string in JS ("S_KOBOLD"); class-header modes
        // need numeric mlet order — deferred; fall back to mndx.
        res = 0;
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
 * C ref: insight.c list_vanquished — #vanquished / disclosure / dumplog.
 * @param {string} defquery 'y'|'a'|'A'|'d'|...
 * @param {boolean} ask end-of-game disclose yn (deferred body for ask)
 */
export async function list_vanquished(defquery, ask) {
    let force_sort = defquery === 'A';
    const dumping = defquery === 'd';
    if (force_sort) {
        // set_vanq_order deferred — keep current vanq_sortmode
    }
    if (dumping || force_sort) {
        defquery = 'y';
        ask = false;
    }

    const mv = game.mvitals || [];
    const mindx = [];
    let total_killed = 0;
    for (let i = LOW_PM; i < NUMMONS; i++) {
        const nkilled = mv[i]?.died | 0;
        if (!nkilled) continue;
        mindx.push(i);
        total_killed += nkilled;
    }
    const ntypes = mindx.length;

    if (ntypes !== 0) {
        let c;
        if (ask) {
            // disclose yn_function path deferred — treat as defquery
            c = defquery;
        } else {
            c = defquery;
        }
        if (c === 'y' || c === 'a') {
            // c=='a' set_vanq_order deferred
            const mode = game.flags?.vanq_sortmode ?? VANQ_MLVL_MNDX;
            const uniq_header = mode === VANQ_ALPHA_SEP;
            // class_header needs def_monsyms explain — deferred (always false)
            const class_header = false;
            void class_header;

            mindx.sort(vanqsort_cmp);
            const lines = [];
            lines.push('Vanquished creatures:');
            if (!dumping) lines.push('');

            let was_uniq = false;
            for (let ni = 0; ni < ntypes; ni++) {
                const i = mindx[ni];
                const nkilled = mv[i]?.died | 0;
                const ptr = mons(i);
                const name = pmname_neutral(i);
                let buf;
                if (UniqCritterIndx(i)) {
                    buf = `${!type_is_pname(ptr) ? 'the ' : ''}${name}`;
                    if (nkilled > 1) buf += ` (${N_times(nkilled)})`;
                    was_uniq = true;
                } else {
                    if (uniq_header && was_uniq) {
                        lines.push('');
                        was_uniq = false;
                    }
                    if (nkilled === 1) buf = an(name);
                    else buf = `${String(nkilled).padStart(3, ' ')} ${makeplural(name)}`;
                }
                let pfx = strncmpi(buf, 'the ', 4) ? 0
                    : strncmpi(buf, 'an ', 3) ? 1
                        : strncmpi(buf, 'a ', 2) ? 2
                            : !isDigit(buf[2] || '') ? 4 : 0;
                // class_header would ++pfx
                lines.push(`${' '.repeat(pfx)}${buf}`);
            }
            if (ntypes > 1) {
                if (!dumping) lines.push('');
                lines.push(`${total_killed} creatures vanquished.`);
            }
            await show_nhw_menu_text(lines);
        }
    } else if (!game.program_state?.gameover) {
        await pline('No creatures have been vanquished.');
    }
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
 * C ref: insight.c list_genocided — in-progress empty path.
 * Full genocided/extinct NHW_MENU body deferred (ngone > 0).
 */
export async function list_genocided(defquery, _ask) {
    const dumping = defquery === 'd';
    const genoing = defquery === 'g';
    if (dumping || genoing) defquery = 'y';
    void defquery;

    // both (extinctions) only at gameover/wizard/discover — deferred
    const ngenocided = num_genocides();
    const nextinct = 0;
    const ngone = ngenocided + nextinct;
    if (ngone === 0) {
        if (!game.program_state?.gameover) {
            await pline(`No creatures have been genocided${genoing ? ' yet' : ''}.`);
        }
        return;
    }
    // ngone > 0 NHW_MENU body deferred (named omission in C-JS-MAP)
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
