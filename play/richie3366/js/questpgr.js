// questpgr.js — Quest / legacy pager text.
// C ref: questpgr.c com_pager / deliver_by_window (NHW_MENU);
//        pray.c align_gname / align_gtitle; win/tty/wintty.c menu offx.

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { docrt, flush_screen, status_line_2 } from './display.js';
import { NO_COLOR } from './terminal.js';
import { align_gname, align_gtitle } from './roles.js';
import { A_NEUTRAL } from './const.js';
import {
    A_INT, A_WIS, A_DEX, A_CON, A_CHA, acurr, get_strength_str,
} from './attrib.js';

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
    const rankEnt = urole.rank || urole.title?.[0];
    const rank = (female && rankEnt?.f) ? rankEnt.f : (rankEnt?.m || urole.name?.m || 'Adventurer');

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
