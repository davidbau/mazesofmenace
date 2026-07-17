// questpgr.js — Quest / legacy pager text.
// C ref: questpgr.c com_pager / deliver_by_window (NHW_MENU);
//        pray.c align_gname / align_gtitle; win/tty/wintty.c menu offx.

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import {
    docrt, flush_screen, flush_topl_more, pline, status_line_2,
} from './display.js';
import { NO_COLOR } from './terminal.js';
import { align_gname, align_gtitle, rank_of } from './roles.js';
import {
    A_NEUTRAL, A_LAWFUL, A_CHAOTIC, MIN_QUEST_LEVEL,
} from './const.js';
import {
    A_INT, A_WIS, A_DEX, A_CON, A_CHA, acurr, get_strength_str,
} from './attrib.js';
import { nhl_nhlib_align_shuffle } from './dungeon.js';
import { show_text_pages } from './pager.js';
import { mons, M2_PNAME } from './monsters.js';
import { NON_PM, pmnames } from './generated/monsters_data.js';
import { artilistRaw } from './generated/artifacts_data.js';
import { an, the } from './objnam.js';

/**
 * C ref: quest.lua common.legacy + convert_arg %d/%G/%r.
 * Layout: wintty.c H2344_BROKEN NHW_MENU offx.
 * Returns unpadded raw lines + geometry; caller paints corner vs fullscreen.
 */
function legacy_lines() {
    const urole = game.urole || {};
    const female = !!game.flags?.female;
    // C: align_gname(u.ualignbase[A_ORIGINAL])
    const aOrig = game.u?.ualignbase?.original ?? game.u?.ualign?.type ?? A_NEUTRAL;
    const deity = align_gname(urole, aOrig);
    const gtitle = align_gtitle(urole, aOrig);
    // C questpgr.c convert_arg %r → rank_of(u.ulevel, Role_switch, female)
    const rank = rank_of(
        game.u?.ulevel | 0,
        urole.mnum,
        female,
    );

    // Raw lines as after convert_line (lua paragraph indent is 4 spaces).
    // C dmore() appends --More--; include as final row for tty cursor match.
    const raw = [
        `It is written in the Book of ${deity}:`,
        '',
        '    After the Creation, the cruel god Moloch rebelled',
        '    against the authority of Marduk the Creator.',
        '    Moloch stole from Marduk the most powerful of all',
        '    the artifacts of the gods, the Amulet of Yendor,',
        '    and he hid it in the dark cavities of Gehennom, the',
        '    Under World, where he now lurks, and bides his time.',
        '',
        `Your ${gtitle} ${deity} seeks to possess the Amulet, and with it`,
        'to gain deserved ascendance over the other gods.',
        '',
        `You, a newly trained ${rank}, have been heralded`,
        `from birth as the instrument of ${deity}.  You are destined`,
        'to recover the Amulet for your deity, or die in the',
        'attempt.  Your hour of destiny has come.  For the sake',
        `of us all:  Go bravely with ${deity}!`,
        '--More--',
    ];

    // C ref: wintty.c tty_putstr NHW_MENU — n0 = strlen(str)+1 → maxcol;
    //        tty_display_nhwindow with #define H2344_BROKEN (always on in
    //        upstream wintty.c): offx = min(min(82, cols/2), cols-maxcol-1).
    //        Fullscreen only when maxrow>=rows || !menu_overlay — NOT offx==10.
    const cols = 80;
    const rows = 24;
    let maxcol = 0;
    for (const line of raw) {
        if (line === '--More--') continue; // C: dmore, not putstr
        const n0 = line.length + 1;
        if (n0 > maxcol) maxcol = n0;
    }
    let offx = Math.min(Math.min(82, Math.floor(cols / 2)), cols - maxcol - 1);
    if (offx < 0) offx = 0;
    const maxrow = raw.length;
    if (maxrow >= rows || game.flags?.menu_overlay === false) offx = 0;
    const moreRow = raw.length - 1;
    // C: NHW_MENU dmore — leading pad at offx, --More-- at offx+1, cursor past it
    const moreCol = offx + 1 + '--More--'.length;
    return { raw, offx, moreRow, moreCol };
}

function write_status_to_grid(disp, statusSnap = null) {
    let s1, s2;
    if (statusSnap && statusSnap.length >= 2) {
        [s1, s2] = statusSnap;
    } else {
        const u = game.u || {};
        let name = game.plname || 'Hero';
        if (name.length && name.charCodeAt(0) >= 97 && name.charCodeAt(0) <= 122) {
            name = String.fromCharCode(name.charCodeAt(0) - 32) + name.slice(1);
        }
        const role = game.urole?.rank?.m || game.urole?.name?.m || 'Adventurer';
        const title = `${name} the ${role}`;
        // C ref: botl.c do_statusline1 — get_strength_str + ACURR
        const stats = u.acurr?.a
            ? `St:${get_strength_str()} Dx:${acurr(A_DEX)} Co:${acurr(A_CON)} In:${acurr(A_INT)} Wi:${acurr(A_WIS)} Ch:${acurr(A_CHA)}`
            : 'St:? Dx:? Co:? In:? Wi:? Ch:?';
        const align = u.ualign?.type === 0 ? 'Neutral' : u.ualign?.type > 0 ? 'Lawful' : 'Chaotic';
        const gap = Math.max(1, 31 - title.length);
        const s1raw = gap > 4
            ? `${title}\x1b[${gap}C${stats} ${align}`
            : `${title}${' '.repeat(gap)}${stats} ${align}`;
        s1 = s1raw.replace(/\x1b\[[0-9;]*[A-Za-z]/g, m =>
            m.match(/\x1b\[\d+C/) ? ' '.repeat(parseInt(m.slice(2), 10) || 0) : '');
        s2 = status_line_2();
    }
    for (let c = 0; c < Math.min(s1.length, disp.cols); c++)
        disp.setCell(c, 22, s1[c], NO_COLOR, 0);
    for (let c = 0; c < Math.min(s2.length, disp.cols); c++)
        disp.setCell(c, 23, s2[c], NO_COLOR, 0);
}

/**
 * C ref: questpgr.c com_pager("legacy") → deliver_by_window(NHW_MENU)
 *         → wintty process_text_window with corner offx.
 * Corner path (offx>0): do not term_clear_screen — map below text stays.
 * @param {string[]|null} statusSnap — pre-wear botl lines (C often stale)
 */
export async function com_pager_legacy(statusSnap = null) {
    const disp = game?.nhDisplay;
    if (!disp) return;

    const { raw, offx, moreRow, moreCol } = legacy_lines();
    game._pending_message = '';
    game._menu_overlay = true;

    if (offx === 0) {
        // Fullscreen: clear everything then paint padded text + status
        disp.clearScreen();
        for (let r = 0; r < raw.length && r < 21; r++) {
            const text = raw[r];
            for (let i = 0; i < text.length && i < disp.cols; i++)
                disp.setCell(i, r, text[i], NO_COLOR, 0);
        }
    } else {
        // C ref: wintty.c process_text_window — tty_curs(1,n)+cl_end from offx;
        // putchar(' ') then text; columns < offx and rows below keep the map.
        for (let r = 0; r < raw.length && r < 21; r++) {
            for (let c = offx; c < disp.cols; c++)
                disp.setCell(c, r, ' ', NO_COLOR, 0);
            const text = raw[r];
            // C: leading pad space at offx, text at offx+1
            disp.setCell(offx, r, ' ', NO_COLOR, 0);
            for (let i = 0; i < text.length && offx + 1 + i < disp.cols; i++)
                disp.setCell(offx + 1 + i, r, text[i], NO_COLOR, 0);
        }
    }

    write_status_to_grid(disp, statusSnap);
    // C tty places cursor past "--More--" on the more row (offx + 1 + len)
    disp.setCursor(moreCol, moreRow);
    await flush_screen(1);

    for (;;) {
        const c = await nhgetch();
        if (c === 27 || c === 32 || c === 13 || c === 10) break;
    }

    game._menu_overlay = false;
    await docrt();
}

/**
 * C ref: dat/quest.lua firsttime texts (Arc seed0361; Bar seed0373).
 * Arc+Bar exercised; other roles burn nhl_init shuffle only.
 */
const QUEST_FIRSTTIME = {
    // C ref: dat/quest.lua Arc firsttime (output=text)
    Arc: `You are suddenly in familiar surroundings.  The buildings in the distance
seem to be those of your old alma mater, but something is wrong.  It feels
as if there has been a riot recently, or %H has
been under siege.

All of the windows are boarded up, and there are objects scattered around
the entrance.

Strange forbidding shapes seem to be moving in the distance.`,
    Bar: `Warily you scan your surroundings, all of your senses alert for signs
of possible danger.  Off in the distance, you can %x the familiar shapes
of %H.

But why, you think, should %l be there?

Suddenly, the hairs on your neck stand on end as you detect the aura of
evil magic in the air.

Without thought, you ready your weapon, and mutter under your breath:

    "By %d, there will be blood spilt today."`,
};

/** C ref: dat/quest.lua leader_first (Arc). */
const QUEST_LEADER_FIRST = {
    Arc: `"Finally you have returned, %p.  You were always
my most promising student.  Allow me to see if you are ready for the
most difficult task of your career."`,
};

/** C ref: dat/quest.lua badalign (Arc). */
const QUEST_BADALIGN = {
    Arc: `"%pC!  I've heard that you've been using sloppy techniques.  Your
results lately can hardly be called suitable for %ra!

"How could you have strayed from the %a path?  Go from here, and come
back only when you have purified yourself."`,
};

/** C ref: dat/quest.lua locate_first (Bar + Arc exercised). */
const QUEST_LOCATE_FIRST = {
    Bar: `The scent of water comes to you in the desert breeze.  You know that
you have located %i.`,
    Arc: `A plain opens before you.  Beyond the plain lies a foreboding edifice.

You have the feeling that you will soon find the entrance to
%i.`,
};

/** C ref: dat/quest.lua locate_next (Bar + Arc). */
const QUEST_LOCATE_NEXT = {
    Bar: `Yet again you have a chance to infiltrate %i.`,
    Arc: `Once again, you are near the entrance to %i.`,
};

/** C ref: dat/quest.lua nexttime (Arc + Bar). */
const QUEST_NEXTTIME = {
    Arc: `Once again, you are back at %H.`,
    Bar: `Once again, you near %H.  You know that %l
will be waiting.`,
};

/** C ref: dat/quest.lua othertime (Arc + Bar). */
const QUEST_OTHERTIME = {
    Arc: `You are back at %H.
You have an odd feeling this may be the last time you ever come here.`,
    Bar: `Again, and you think possibly for the last time, you approach
%H.`,
};

/** C ref: dat/quest.lua goal_first (Arc + Bar; output=text). */
const QUEST_GOAL_FIRST = {
    Arc: `A strange feeling washes over you, and you think back to things you
learned during the many lectures of %l.

You realize the feeling must be the presence of %o.`,
    Bar: `The hairs on the nape of your neck lift as you sense an energy in the
very air around you.  You fight down a primordial panic that seeks to
make you turn and run.  This is surely the lair of %n.`,
};

/** C ref: dat/quest.lua goal_next (Arc + Bar). */
const QUEST_GOAL_NEXT = {
    Arc: `The familiar presence of %o is in the ether.`,
    Bar: `Yet again you feel the air around you heavy with malevolent magical energy.`,
};

/** C ref: dat/quest.lua goal_alt (Arc; Bar falls back to goal_next in C). */
const QUEST_GOAL_ALT = {
    Arc: `You have returned to %ns lair.`,
};

/** C ref: questpgr.c ldrname */
function ldrname() {
    const i = game.urole?.ldrnum ?? NON_PM;
    if (i === NON_PM || i == null) return '';
    const ptr = mons(i);
    const names = pmnames[i];
    const nm = names?.[2] || names?.[0] || names?.[1] || '';
    const pname = !!((ptr?.mflags2 ?? 0) & M2_PNAME);
    return pname ? nm : `the ${nm}`;
}

/**
 * C ref: questpgr.c convert_arg — subset used by firsttime/goal (%x/%H/%l/%d/%o/%n).
 * Named omission: full convert_arg catalogue + %c/%g/… pronoun arms.
 */
function convert_arg(c) {
    const urole = game.urole || {};
    const u = game.u || {};
    const Blind = !!(u.Blind || u.HBlind || u.EBlind);
    switch (c) {
    case 'l':
        return ldrname();
    case 'H':
        return urole.homebase || '';
    case 'i':
        return urole.intermed || '';
    case 'd': {
        const aOrig = u.ualignbase?.original ?? u.ualign?.type ?? A_NEUTRAL;
        return align_gname(urole, aOrig);
    }
    case 'x':
        return Blind ? 'sense' : 'see';
    case 'p':
        return game.plname || '';
    case 'a': {
        const aOrig = u.ualignbase?.original ?? u.ualign?.type ?? A_NEUTRAL;
        if (aOrig === A_LAWFUL) return 'lawful';
        if (aOrig === A_CHAOTIC) return 'chaotic';
        return 'neutral';
    }
    case 'r':
        // C: rank_of(u.ulevel, Role_switch, flags.female) — not sticky urole.rank
        return rank_of(u.ulevel | 0, urole.mnum, !!game.flags?.female);
    case 'R':
        // C: rank_of(MIN_QUEST_LEVEL, Role_switch, flags.female)
        return rank_of(MIN_QUEST_LEVEL, urole.mnum, !!game.flags?.female);
    case 'o':
    case 'O': {
        // C: the(artiname(urole.questarti)); %O shortens "the Foo of Bar"
        const qi = urole.questarti | 0;
        const raw = (artilistRaw[qi]?.name) || '';
        let str = raw ? the(raw) : '';
        if (c === 'O') {
            const p = str.toLowerCase().indexOf(' of ');
            if (p >= 0) str = str.slice(0, p);
        }
        return str;
    }
    case 'n': {
        // C: neminame() — proper-name vs "the <name>"
        const i = urole.neminum ?? NON_PM;
        if (i === NON_PM || i == null) return '';
        const ptr = mons(i);
        const names = pmnames[i];
        const nm = names?.[2] || names?.[0] || names?.[1] || '';
        const pname = !!((ptr?.mflags2 ?? 0) & M2_PNAME);
        return pname ? nm : `the ${nm}`;
    }
    case '%':
        return '%';
    default:
        return '';
    }
}

/**
 * C ref: questpgr.c convert_line — %X then optional modifier.
 * Covered: %Xa → an(), %XA → An(), %XC capitalize. Pronoun/plural deferred.
 */
function convert_line(inLine) {
    let out = '';
    for (let i = 0; i < inLine.length; i++) {
        if (inLine[i] === '%' && i + 1 < inLine.length) {
            const code = inLine[++i];
            let piece = convert_arg(code);
            if (i + 1 < inLine.length) {
                const mod = inLine[i + 1];
                if (mod === 'a') {
                    i++;
                    piece = an(piece);
                } else if (mod === 'A') {
                    i++;
                    // C: An() — capitalized article
                    const withArt = an(piece);
                    piece = withArt
                        ? withArt.charAt(0).toUpperCase() + withArt.slice(1)
                        : withArt;
                } else if (mod === 'C') {
                    i++;
                    if (piece)
                        piece = piece.charAt(0).toUpperCase() + piece.slice(1);
                }
                // %Xh/%XP/… pronoun + plural deferred
            }
            out += piece;
        } else {
            out += inLine[i];
        }
    }
    return out;
}

/**
 * C ref: questpgr.c qt_pager / com_pager_core.
 * nhl_init → nhlib.lua shuffle(align) then load quest text + deliver.
 *
 * Delivery matches C default `output` (howtoput "default" → 0):
 * deliver_by_pline unless text has `\n` or length >= BUFSZ-1, which
 * promotes to deliver_by_window(NHW_TEXT). Explicit lua `output="text"`
 * on multi-line bodies is covered by the newline rule. Arc nexttime is
 * single-line default → pline (D-0616); wrong NHW_TEXT stole rhack keys.
 *
 * Named omissions: common fallback; explicit single-line output=text;
 * menu output; array rn2 picks; convert_line pronoun/%cC arms;
 * synopsis putmsghistory; other-role goal/nexttime bodies.
 */
export async function qt_pager(msgid) {
    // C: com_pager_core → nhl_init → nhlib.lua top-level shuffle(align)
    nhl_nhlib_align_shuffle();

    const code = game.urole?.filecode || 'Tou';
    let raw = null;
    if (msgid === 'firsttime') raw = QUEST_FIRSTTIME[code] || null;
    else if (msgid === 'leader_first') raw = QUEST_LEADER_FIRST[code] || null;
    else if (msgid === 'badalign') raw = QUEST_BADALIGN[code] || null;
    else if (msgid === 'locate_first') raw = QUEST_LOCATE_FIRST[code] || null;
    else if (msgid === 'locate_next') raw = QUEST_LOCATE_NEXT[code] || null;
    else if (msgid === 'nexttime') raw = QUEST_NEXTTIME[code] || null;
    else if (msgid === 'othertime') raw = QUEST_OTHERTIME[code] || null;
    else if (msgid === 'goal_first') raw = QUEST_GOAL_FIRST[code] || null;
    else if (msgid === 'goal_next') raw = QUEST_GOAL_NEXT[code] || null;
    else if (msgid === 'goal_alt') {
        // C: qt_pager reverts to QT_NEXTGOAL when role lacks QT_ALTGOAL
        raw = QUEST_GOAL_ALT[code] || QUEST_GOAL_NEXT[code] || null;
    }
    // Other msgid bodies deferred (C-JS-MAP)
    if (!raw) return;

    const converted = convert_line(raw);
    // C: BUFSZ is 256; long/default+newline → by_window
    const useWindow = converted.includes('\n') || converted.length >= 255;
    if (useWindow) {
        // C: display_nhwindow flushes pending WIN_MESSAGE NEED_MORE first
        await flush_topl_more();
        await show_text_pages(converted.split('\n'));
    } else {
        // C: deliver_by_pline — pline more()s pending materialize, then text
        await pline(converted);
    }
}
