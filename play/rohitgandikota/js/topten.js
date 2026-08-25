// topten.js — the high-score list.
// C ref: src/topten.c
//
// The native record file is represented by one JSON array in the shared
// Web-Storage handle.  That handle outlives each runSegment() call, just as
// NetHack's record file outlives each process.

import { game } from './gstate.js';
import { COLNO } from './const.js';
import { tty_raw_print, tty_raw_print_bold, tty_base_cursor } from './tty/wintty.js';
import { rn1, rn2, rnd } from './rng.js';
import { PMNAMES } from './monst_data.js';
import { depth } from './dungeon.js';

const RECORD_KEY = 'record:topten';

function read_record() {
    const raw = game.storage?.getItem?.(RECORD_KEY);
    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed))
                return parsed;
        } catch {
            /* treat a damaged record file as empty */
        }
    }
    return Array.isArray(game.topten_record) ? game.topten_record : [];
}

function write_record(entries) {
    game.topten_record = entries;
    game.topten_entries = entries;
    game.storage?.setItem?.(RECORD_KEY, JSON.stringify(entries));
}

function note_unported_topten(what) {
    (game.unported ||= new Set()).add('topten:' + what);
}

// src/topten.c:165 topten_print() — raw when there is no topten window.
function topten_print(x) {
    tty_raw_print(x);
}
function topten_print_bold(x) {
    tty_raw_print_bold(x);
}

// src/topten.c:929 outheader()
function outheader() {
    let linebuf = ' No  Points     Name';
    while (linebuf.length < COLNO - 9)
        linebuf += ' ';
    linebuf += 'Hp [max]';
    topten_print(linebuf);
}

// src/topten.c:946 outentry() — one score line, wrapped at the Hp column.
function outentry(rank, t1, so) {
    let linebuf = rank ? String(rank).padStart(3) : '   ';
    linebuf += ` ${String(t1.points || 0).padStart(10)}  ${
        (t1.name || '').slice(0, 10)}`;
    linebuf += `-${t1.plrole}`;
    if (t1.plrace[0] !== '?')
        linebuf += `-${t1.plrace}`;
    linebuf += `-${t1.plgend}`;
    if (t1.plalign[0] !== '?')
        linebuf += `-${t1.plalign} `;
    else
        linebuf += ' ';
    let second_line = true;
    const death = t1.death || 'died';
    if (death.startsWith('escaped')) {
        note_unported_topten('outentry:escaped');
        second_line = false;
    } else if (death.startsWith('ascended')) {
        linebuf += `ascended to demigod${
            t1.plgend[0] === 'F' ? 'dess' : ''}-hood`;
        second_line = false;
    } else {
        if (death.startsWith('quit')) {
            linebuf += 'quit';
            second_line = false;
        } else if (death.startsWith('died of st')) {
            linebuf += 'starved to death';
            second_line = false;
        } else if (death.startsWith('choked')) {
            linebuf += `choked on h${t1.plgend[0] === 'F' ? 'er' : 'is'} food`;
        } else if (death.startsWith('poisoned')) {
            linebuf += 'was poisoned';
        } else if (death.startsWith('crushed')) {
            linebuf += 'was crushed to death';
        } else if (death.startsWith('petrified by ')) {
            linebuf += 'turned to stone';
        } else {
            linebuf += 'died';
        }

        if (game.astral_level && t1.deathdnum === game.astral_level.dnum) {
            note_unported_topten('outentry:endgame planes');
        } else {
            linebuf += ` in ${game.dungeons[t1.deathdnum].dname}`;
            if (!game.knox_level || t1.deathdnum !== game.knox_level.dnum)
                linebuf += ` on level ${t1.deathlev}`;
            if (t1.deathlev !== t1.maxlvl)
                linebuf += ` [max ${t1.maxlvl}]`;
        }

        /* kludge for "quit while already on Charon's boat" */
        if (death.startsWith('quit '))
            linebuf += death.slice(4);
    }
    linebuf += '.';

    /* quit, starved, ascended, and escaped have no second line */
    if (second_line)
        linebuf += `  ${death[0].toUpperCase()}${death.slice(1)}.`
            .replace('; the ', ', the ');

    const hpbuf = (t1.hp <= 0) ? '-' : String(t1.hp);
    /* wrap: continuation lines are "%15s %s" */
    let hppos = COLNO - ('  Hp [max]'.length);
    while (linebuf.length >= hppos) {
        let bp = linebuf.length;
        while (bp > 0 && !(linebuf[bp] === ' ' && bp < hppos))
            bp--;
        if (bp <= 15)
            bp = hppos - 1;
        if (bp > 5 && linebuf.slice(bp - 5, bp) === ' [max')
            bp -= 5;
        const rest = (linebuf[bp] === ' ') ? linebuf.slice(bp + 1)
                                           : linebuf.slice(bp);
        linebuf = linebuf.slice(0, bp);
        if (so) {
            /* C pads the bold line to full width */
            topten_print_bold(linebuf.padEnd(COLNO - 1));
        } else
            topten_print(linebuf);
        linebuf = `${''.padStart(15)} ${rest}`;
    }
    hppos = COLNO - 7 - hpbuf.length;
    if (linebuf.length <= hppos) {
        linebuf = linebuf.padEnd(hppos) + hpbuf;
        linebuf += ` ${t1.maxhp < 10 ? '  ' : t1.maxhp < 100 ? ' ' : ''}[${
            t1.maxhp}]`;
    }
    if (so)
        topten_print_bold(linebuf.padEnd(COLNO - 1));
    else
        topten_print(linebuf);
}

// src/topten.c:664 topten()
export async function topten(how) {
    /* logfile/xlogfile writes are filesystem-only */

    if (game.wizard || game.discover) {
        topten_print('');
        topten_print(`Since you were in ${game.wizard ? 'wizard' : 'discover'}`
                     + ' mode, the score list will not be checked.');
        return;
    }

    const u = game.u;
    const { formatkiller } = await import('./end.js');
    /* src/topten.c:697 — fill t0 from the current game */
    const t0 = {
        points: u.urexp | 0,
        deathdnum: u.uz.dnum,
        deathlev: depth(u.uz), /* observable_depth() is depth() outside endgame */
        maxlvl: game.deepest_lev_reached_depth ?? u.uz.dlevel,
        hp: (u.umonnum !== u.umonster ? u.mh : u.uhp) | 0,
        maxhp: (u.umonnum !== u.umonster ? u.mhmax : u.uhpmax) | 0,
        name: (game.plname || '').slice(0, 10),
        plrole: game.urole?.filecode ?? '???',
        plrace: game.urace?.filecode ?? '?',
        plgend: game.flags?.female ? 'Fem' : 'Mal',
        plalign: ({ '1': 'Law', '0': 'Neu', '-1': 'Cha' })[
            String(u.ualign?.type ?? 0)] ?? '?',
        death: formatkiller(how, true),
    };

    topten_print('');

    /* assure minimum number of points (sysconf pointsmin default 1) */
    if (t0.points < 1)
        t0.points = 0;

    const record = read_record();
    let rank0 = -1;
    let list = record.slice();
    if (t0.points > 0) {
        const at = list.findIndex(t1 => (t1.points | 0) < t0.points);
        const insertAt = at < 0 ? list.length : at;
        rank0 = insertAt + 1;
        list.splice(insertAt, 0, t0);
        list = list.slice(0, 100); /* sysopt.entrymax */
        if (rank0 <= list.length)
            write_record(list);
        else
            rank0 = -1;
    }

    if (rank0 > 0 && !game.done_stopprint) {
        if (rank0 <= 10) {
            topten_print('You made the top ten list!');
        } else {
            const mod100 = rank0 % 100;
            const suffix = (mod100 >= 11 && mod100 <= 13) ? 'th'
                : rank0 % 10 === 1 ? 'st'
                : rank0 % 10 === 2 ? 'nd'
                : rank0 % 10 === 3 ? 'rd' : 'th';
            topten_print(`You reached the ${rank0}${suffix} place on the top 100 list.`);
        }
        topten_print('');
    }

    const end_top = game.flags?.end_top ?? 3;
    const end_around = game.flags?.end_around ?? 2;
    const end_own = game.flags?.end_own ?? false;
    const skip_scores = !end_top && !end_around && !end_own;
    const rankAfterList = list.length + 1;
    if (rank0 <= 0)
        rank0 = rankAfterList;
    if (!skip_scores && !game.done_stopprint)
        outheader();
    let r = 1;
    for (const t1 of list) {
        if (skip_scores || game.done_stopprint)
            break;
        if (r <= end_top
            || (r >= rank0 - end_around && r <= rank0 + end_around)
            || (end_own && t1.name === t0.name)) {
            if (r === rank0 - end_around
                && rank0 > end_top + end_around + 1 && !end_own)
                topten_print('');
            outentry(r, t1, r === rank0);
        }
        r++;
    }
    /* the sub-minimum score still gets shown, rankless and highlighted */
    if (rank0 >= rankAfterList)
        if (!skip_scores && !game.done_stopprint)
            outentry(0, t0, true);
}

// src/topten.c:1381 get_rnd_toptenentry() — pick a random scorefile entry.
// The rnd(tt_oname_maxrank) draw happens BEFORE the file is read, so an
// empty record (every wizard/debug game skips score insertion) still costs
// the draw and returns null.
export function get_rnd_toptenentry() {
    const maxrank = 10;             /* sysconf tt_oname_maxrank default */
    const rank = rnd(maxrank);
    const entries = read_record();
    return entries[rank - 1] ?? null;
}

// src/topten.c:1356 classmon() — role filecode to its monster.
// roles[] resolved through game to stay out of the role_data import cycle.
function classmon(plch) {
    for (const r of (game.roles_table ?? [])) {
        if (r.filecode === plch) {
            if (r.mnum !== undefined && r.mnum !== -1)
                return (typeof r.mnum === 'string') ? PMNAMES[r.mnum] : r.mnum;
            return PMNAMES.PM_HUMAN;
        }
    }
    if (plch === 'E')
        return PMNAMES.PM_RANGER;
    return PMNAMES.PM_HUMAN_MUMMY;
}

// src/topten.c:1445 tt_doppel() — a doppelganger takes a top-ten hero's
// role and name, or a random role when the scorefile is empty.
export function tt_doppel(mon) {
    const tt = rn2(13) ? get_rnd_toptenentry() : null;
    let ret;

    if (!tt) {
        ret = rn1(PMNAMES.PM_WIZARD - PMNAMES.PM_ARCHEOLOGIST + 1,
                  PMNAMES.PM_ARCHEOLOGIST);
    } else {
        if (tt.plgend?.[0] === 'F')
            mon.female = 1;
        else if (tt.plgend?.[0] === 'M')
            mon.female = 0;
        ret = classmon(tt.plrole);
        /* christen only when the player can see the doppelganger */
        note_unported_topten('tt_doppel:christen');
    }
    return ret;
}
