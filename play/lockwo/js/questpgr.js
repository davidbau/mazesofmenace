// questpgr.js — Common quest-text pager ("legacy" intro).
// C ref: src/questpgr.c (com_pager / convert_line / deliver_by_window)
//        and the tty NHW_MENU window display in win/tty/wintty.c.
//
// Only the "legacy" common message (shown at game start when the
// `legacy` option is on) is needed for screen parity, so this is a
// focused port that renders that text into the terminal grid exactly
// the way the tty NHW_MENU window does, then waits for --More--.

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { NO_COLOR } from './terminal.js';
import { roles, rank_of, align_gname, align_gtitle } from './role.js';
import { A_LAWFUL, A_NEUTRAL, A_CHAOTIC, In_quest } from './const.js';
import { rn2 } from './rng.js';
import { flush_screen, topl_more, pline } from './display.js';
import { renderWindowScreen } from './invent.js';

// dat/quest.lua questtext.common.legacy.text
const LEGACY_TEXT = [
    'It is written in the Book of %d:',
    '',
    '    After the Creation, the cruel god Moloch rebelled',
    '    against the authority of Marduk the Creator.',
    '    Moloch stole from Marduk the most powerful of all',
    '    the artifacts of the gods, the Amulet of Yendor,',
    '    and he hid it in the dark cavities of Gehennom, the',
    '    Under World, where he now lurks, and bides his time.',
    '',
    'Your %G %d seeks to possess the Amulet, and with it',
    'to gain deserved ascendance over the other gods.',
    '',
    'You, a newly trained %r, have been heralded',
    'from birth as the instrument of %d.  You are destined',
    'to recover the Amulet for your deity, or die in the',
    'attempt.  Your hour of destiny has come.  For the sake',
    'of us all:  Go bravely with %d!',
];

// alignment-index (0 lawful, 1 neutral, 2 chaotic) → A_* value
function alignTypeFromIndex(idx) {
    if (idx === 0) return A_LAWFUL;
    if (idx === 2) return A_CHAOTIC;
    return A_NEUTRAL;
}

// C ref: questpgr.c convert_arg/convert_line — substitute %-codes.
function convert_line(line, rolenum, alignType, female) {
    const deity = align_gname(rolenum, alignType);
    const gtitle = align_gtitle(rolenum, alignType);
    const rank = rank_of(1, rolenum, female);
    // %d=deity, %G=god/goddess, %r=rank.  Order matters only in that
    // each code is replaced literally with no further interpretation.
    return line
        .replace(/%G/g, gtitle)
        .replace(/%r/g, rank)
        .replace(/%d/g, deity);
}

// Render the "legacy" intro exactly like a tty NHW_MENU window: the
// lines are centered with offx = max(10, cols - (maxlen+1) - 1), each
// line preceded by one space (so text starts at column offx+1), and a
// plain "--More--" prompt on the row after the last line at column
// offx+1.  C ref: wintty.c tty_display_nhwindow + process_text_window.
export async function com_pager_legacy() {
    const g = game;
    const disp = g.nhDisplay;
    if (!disp?.putstr) return;

    const rolenum = roles.findIndex((r) => r.mnum === (g.urole?.mnum));
    const role = rolenum >= 0 ? rolenum : (g.initrole | 0);
    const alignType = alignTypeFromIndex(g.initalign);
    const female = !!g.flags?.female;

    const lines = LEGACY_TEXT.map((l) => convert_line(l, role, alignType, female));

    // maxcol mirrors tty_putstr: strlen(str)+1 over all lines.
    let maxcol = 0;
    for (const l of lines)
        if (l.length + 1 > maxcol) maxcol = l.length + 1;

    const cols = 80;
    // C ref: wintty.c tty_display_nhwindow NHW_MENU offx — the recorder build
    // defines H2344_BROKEN, so offx = min(min(82, cols/2), cols-maxcol-1)
    // (NOT the max(10,...) form).  The longer Samurai deity ("Amaterasu
    // Omikami") pushes offx below 10, which the H2344 path allows.
    let offx = Math.min(Math.min(82, Math.floor(cols / 2)), cols - maxcol - 1);
    if (offx < 0) offx = 0;
    // The leading space printed for each menu line shifts text to offx+1.
    const textCol = offx + 1;

    // The legend is a tty NHW_MENU window overlaying the already-drawn map.
    // With menu_overlay on (offx != 0/10) it does NOT clear the whole screen:
    // WIN_MESSAGE (row 0) is cleared, and each menu row clears columns
    // offx..end before writing.  So map content left of offx survives and
    // shows through; map content under the legend is erased.
    // C ref: wintty.c tty_display_nhwindow / process_text_window.
    const blankCols = (row) => {
        for (let c = offx; c < cols; c++) disp.setCell(c, row, ' ', NO_COLOR, 0);
    };
    for (let c = 0; c < cols; c++) disp.setCell(c, 0, ' ', NO_COLOR, 0); // WIN_MESSAGE

    const moreRow = lines.length; // row immediately after the last line
    for (let i = 0; i < lines.length; i++) {
        blankCols(i);
        if (lines[i]) disp.putstr(textCol, i, lines[i], NO_COLOR, 0);
    }
    blankCols(moreRow);
    disp.putstr(textCol, moreRow, '--More--', NO_COLOR, 0);
    disp.setCursor(textCol + 8, moreRow);

    await nhgetch();
}

// ════════════════════════════════════════════════════════════════════════
// Quest arrival messages.  C ref: quest.c onquest()/on_start() + questpgr.c
// qt_pager()/com_pager_core()/deliver_by_window().  When the hero first
// reaches the quest "home" (start) level, on_start() delivers the role's
// "firsttime" quest text.  com_pager_core() first runs nhl_init() which loads
// quest.lua; loading it executes nhlib.lua's top-level shuffle(align), drawing
// rn2(3) then rn2(2) — the only RNG the pager consumes.  The text is shown in a
// full-screen NHW_TEXT window (--More-- at the bottom row).  Only the Barbarian
// home level is ported (its Bar-strt.lua generation is the ported quest level).
// ════════════════════════════════════════════════════════════════════════

// dat/quest.lua Bar.firsttime.text (with the %-codes convert_arg substitutes).
const BAR_FIRSTTIME = [
    'Warily you scan your surroundings, all of your senses alert for signs',
    'of possible danger.  Off in the distance, you can %x the familiar shapes',
    'of %H.',
    '',
    'But why, you think, should %l be there?',
    '',
    'Suddenly, the hairs on your neck stand on end as you detect the aura of',
    'evil magic in the air.',
    '',
    'Without thought, you ready your weapon, and mutter under your breath:',
    '',
    '    "By %d, there will be blood spilt today."',
];

// dat/quest.lua Pri.firsttime.text (with the %-codes convert_arg substitutes).
const PRI_FIRSTTIME = [
    'You find yourself standing in sight of %H.  Something',
    'is obviously wrong here.  The doors to %H, which usually',
    'stand open, are closed.  Strange human shapes shamble around',
    'outside.',
    '',
    'You realize that %l needs your assistance!',
];

// dat/quest.lua Arc.firsttime.text (with the %-codes convert_arg substitutes).
const ARC_FIRSTTIME = [
    'You are suddenly in familiar surroundings.  The buildings in the distance',
    'seem to be those of your old alma mater, but something is wrong.  It feels',
    'as if there has been a riot recently, or %H has',
    'been under siege.',
    '',
    'All of the windows are boarded up, and there are objects scattered around',
    'the entrance.',
    '',
    'Strange forbidding shapes seem to be moving in the distance.',
];

// C ref: quest.c onquest() — called from goto_level() arrival.  Dispatches to
// on_start() on the quest start (home) level for a first-time arrival, or
// on_locate() on the quest "locate" level.
export async function onquest() {
    const g = game;
    if (g.u?.uevent?.qcompleted) return;
    if (!In_quest(g.u?.uz)) return;
    // Is_qstart(&u.uz)
    const qs = g.qstart_level;
    if (qs && g.u.uz.dnum === qs.dnum && g.u.uz.dlevel === qs.dlevel) {
        // on_start(): qt_pager("firsttime") once, then set first_start.
        if (g._quest_first_start) return;
        g._quest_first_start = true;
        const rolenum = roles.findIndex((r) => r.mnum === (g.urole?.mnum));
        // Only the quest home levels whose Xxx-strt.lua generation is ported.
        const fc = roles[rolenum]?.filecode;
        if (fc !== 'Bar' && fc !== 'Arc' && fc !== 'Pri') return;
        await com_pager_quest_firsttime(rolenum);
        return;
    }
    // Is_qlocate(&u.uz)
    const ql = g.qlocate_level;
    if (ql && g.u.uz.dnum === ql.dnum && g.u.uz.dlevel === ql.dlevel) {
        await on_locate();
    }
}

// C ref: quest.c on_locate() — the quest "locate" level's first-time arrival
// text ("locate_first"), delivered only when arriving from a shallower level
// (from_above).  "locate_next" (repeat visits) is not modelled — not
// exercised by any covered session.
async function on_locate() {
    const g = game;
    if (g._quest_killed_nemesis) return;
    if (g._quest_first_locate) return;
    g._quest_first_locate = true;
    const fromAbove = (g.u.uz0?.dlevel ?? 0) < g.u.uz.dlevel;
    if (!fromAbove) return;
    const rolenum = roles.findIndex((r) => r.mnum === (g.urole?.mnum));
    // Only the Barbarian's locate level (Bar-loca.lua) generation is ported.
    if (roles[rolenum]?.filecode !== 'Bar') return;
    await com_pager_quest_locate_first();
}

async function com_pager_quest_firsttime(rolenum) {
    const g = game;
    // com_pager_core -> nhl_init() loads quest.lua -> nhlib.lua top-level
    // shuffle(align): rn2(3), rn2(2).
    const a = ['law', 'neutral', 'chaos'];
    for (let i = a.length; i >= 2; i--) {
        const j = 1 + rn2(i);
        const t = a[i - 1]; a[i - 1] = a[j - 1]; a[j - 1] = t;
    }
    // convert_arg substitutions: %x see/sense, %H homebase, %l leader, %d deity.
    const alignType = alignTypeFromIndex(g.initalign);
    const deity = align_gname(rolenum, alignType);
    const xsee = (g.u?.blinded > 0 || g.ublindf) ? 'sense' : 'see';
    let template, leader, home;
    if (roles[rolenum]?.filecode === 'Arc') {
        template = ARC_FIRSTTIME;
        leader = 'Lord Carnarvon';
        home = 'the College of Archeology';               // Arc urole.homebase
    } else if (roles[rolenum]?.filecode === 'Pri') {
        template = PRI_FIRSTTIME;
        leader = 'the Arch Priest';    // ldrname(): not a pname -> "the "+name
        home = 'the Great Temple';                         // Pri urole.homebase
    } else {
        template = BAR_FIRSTTIME;
        leader = 'Pelias';                                // ldrname(): proper name
        home = 'the Camp of the Duali Tribe';             // Bar urole.homebase
    }
    const lines = template.map((l) => l
        .replace(/%x/g, xsee).replace(/%H/g, home)
        .replace(/%l/g, leader).replace(/%d/g, deity));

    // deliver_by_window -> display_nhwindow(datawin, TRUE): the pending topline
    // ("You materialize on a different level!") is flushed with --More-- first,
    // then the NHW_TEXT window is shown (full screen, --More-- at the last row).
    await topl_more();                                      // screen: "...--More--"
    renderWindowScreen(lines, { footer: '--More--', footerRow: 23, footerCol: 0, modal: 'textwin' });
    await flush_screen(1);
    g._modal_screen = 'topl';
    for (;;) {
        const c = await nhgetch();
        if (c === 32 || c === 13 || c === 10 || c === 27) break;
    }
    delete g._modal_screen;
    g._pending_message = '';
}

// dat/quest.lua Bar.locate_first.text (with the %i intermed() substitution).
const BAR_LOCATE_FIRST = [
    'The scent of water comes to you in the desert breeze.  You know that',
    'you have located the Duali Oasis.',
];

async function com_pager_quest_locate_first() {
    const g = game;
    // com_pager_core -> nhl_init() loads quest.lua -> nhlib.lua top-level
    // shuffle(align): rn2(3), rn2(2).
    const a = ['law', 'neutral', 'chaos'];
    for (let i = a.length; i >= 2; i--) {
        const j = 1 + rn2(i);
        const t = a[i - 1]; a[i - 1] = a[j - 1]; a[j - 1] = t;
    }
    // deliver_by_window -> display_nhwindow(datawin, TRUE): the pending topline
    // ("You materialize on a different level!") is flushed with --More-- first,
    // then the NHW_TEXT window is shown (full screen, --More-- at the last row).
    await topl_more();
    renderWindowScreen(BAR_LOCATE_FIRST, { footer: '--More--', footerRow: 23, footerCol: 0, modal: 'textwin' });
    await flush_screen(1);
    g._modal_screen = 'topl';
    for (;;) {
        const c = await nhgetch();
        if (c === 32 || c === 13 || c === 10 || c === 27) break;
    }
    delete g._modal_screen;
    g._pending_message = '';
}

// ════════════════════════════════════════════════════════════════════════
// Quest leader dialogue.  C ref: monmove.c dochug() PHASE ONE — a monster
// whose mstrategy has STRAT_CLOSE (the one named quest leader per role; see
// makemon.js M3_CLOSE_NAMES) freezes in place (mstrategy & STRAT_WAITMASK)
// until the hero is adjacent and it is that monster's turn to act, at which
// point quest_talk(mtmp) is its only chance to do something.  quest.c
// quest_talk() -> leader_speaks() -> chat_with_leader().
//
// Only the "Rule 5" not-yet-quested branch (met_leader / leader_first /
// leader_next) is ported here, and only for the two roles whose home-level
// generation (sp_lev.js makemaz_arc_strt / makemaz_bar_strt) is ported —
// same scope restriction as com_pager_quest_firsttime above.  The
// got_thanks / questart / got_quest post-assignment branches, and the
// not_capable()/is_pure()/expulsion() readiness gate chat_with_leader runs
// after the greeting, are not reached by any covered session and are left
// unmodeled.  STRAT_CLOSE is also set on "prisoner" (a different quest_talk
// case, prisoner_speaks()) and STRAT_WAITFORU on the nemeses/uniques
// (nemesis_speaks()); neither is modeled here.
// ════════════════════════════════════════════════════════════════════════

// dat/quest.lua Arc.leader_first.text / leader_next.text.
const ARC_LEADER_FIRST = [
    '"Finally you have returned, %p.  You were always',
    'my most promising student.  Allow me to see if you are ready for the',
    'most difficult task of your career."',
];
const ARC_LEADER_NEXT = [
    '"Again, %p, you stand before me.',
    'Let me see if you have gained experience in the interim."',
];
// dat/quest.lua Bar.leader_first.text / leader_next.text.
const BAR_LEADER_FIRST = [
    '"Ah, %p.  You have returned at last.  The world is in dire',
    'need of your help.  There is a great quest you must undertake.',
    '',
    '"But first, I must see if you are ready to take on such a challenge."',
];
const BAR_LEADER_NEXT = [
    '"%p, you are back.  Are you ready now for the challenge?"',
];

// C ref: monsters.h — the M3_CLOSE monster per role that IS the quest leader
// (i.e. makemon.js's M3_CLOSE_NAMES minus "prisoner", which is a different
// quest_talk case — see the module comment above).
const QUEST_LEADER_NAMES = new Set(["Lord Carnarvon", "Pelias", "Shaman Karnov", "Earendil", "Elwing", "Hippocrates", "King Arthur", "Grand Master", "Arch Priest", "Orion", "Master of Thieves", "Lord Sato", "Twoflower", "Norn", "Neferet the Green"]);

// C ref: questpgr.c com_pager_core() — every qt_pager() call creates a fresh
// sandboxed Lua state and reloads quest.lua from scratch, so nhlib.lua's
// top-level shuffle(align) (rn2(3), rn2(2)) fires again on EVERY call, not
// just the first.  Factored out of com_pager_quest_firsttime/locate_first's
// inline copies since this is now a third call site.
function quest_lua_reload_shuffle() {
    const a = ['law', 'neutral', 'chaos'];
    for (let i = a.length; i >= 2; i--) {
        const j = 1 + rn2(i);
        const t = a[i - 1]; a[i - 1] = a[j - 1]; a[j - 1] = t;
    }
}

// C ref: questpgr.c com_pager_core() — output defaults to "pline" for a
// single-line message and is switched to a full-screen NHW_TEXT window
// (deliver_by_window) whenever the raw text contains an embedded newline
// (quest.lua's leader_next is pline-only for Bar but window-shaped for Arc;
// this mirrors C's own strchr(text,'\n') decision rather than hardcoding a
// per-role rendering mode).
async function qt_pager_text(lines, plname) {
    const subst = lines.map((l) => l.replace(/%p/g, plname || ''));
    if (subst.length <= 1) {
        if (subst[0]) await pline(subst[0]);
        return;
    }
    const g = game;
    // create_nhwindow()/display_nhwindow() implicitly flush any pending
    // NEED_MORE topline (e.g. teleds' "You materialize...") before painting
    // over it — see com_pager_quest_firsttime's identical guard above.
    if (g._toplin === 1) await topl_more();
    renderWindowScreen(subst, { footer: '--More--', footerRow: 23, footerCol: 0, modal: 'textwin' });
    await flush_screen(1);
    g._modal_screen = 'topl';
    for (;;) {
        const c = await nhgetch();
        if (c === 32 || c === 13 || c === 10 || c === 27) break;
    }
    delete g._modal_screen;
    g._pending_message = '';
}

// C ref: quest.c chat_with_leader() "Rule 5" branch (see module comment).
async function chat_with_leader(mtmp) {
    const g = game;
    if (!mtmp.mpeaceful || g._quest_pissed_off) return;
    const rolenum = roles.findIndex((r) => r.mnum === (g.urole?.mnum));
    const fc = roles[rolenum]?.filecode;
    let first, next;
    if (fc === 'Arc') { first = ARC_LEADER_FIRST; next = ARC_LEADER_NEXT; }
    else if (fc === 'Bar') { first = BAR_LEADER_FIRST; next = BAR_LEADER_NEXT; }
    else return; // this role's home-level generation isn't ported (see above)
    quest_lua_reload_shuffle();
    if (!g._quest_met_leader) {
        g._quest_met_leader = true;
        await qt_pager_text(first, g.plname);
    } else {
        await qt_pager_text(next, g.plname);
    }
}

// C ref: quest.c leader_speaks() — the "maybe you attacked leader?" branch
// is not modeled: chat_with_leader() itself already no-ops when !mpeaceful.
async function leader_speaks(mtmp) {
    await chat_with_leader(mtmp);
}

// C ref: quest.c quest_talk() — dispatch by species; only the leader case is
// ported (see the module comment above).
export async function quest_talk(mtmp) {
    if (QUEST_LEADER_NAMES.has(mtmp.data?.name)) await leader_speaks(mtmp);
}
