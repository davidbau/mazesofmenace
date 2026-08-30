// topten.js — High-score record + end-of-game score panel (partial).
// C ref: topten.c topten / outheader / outentry / readentry / writeentry.

import { game } from './gstate.js';
import { vfsReadFile, vfsWriteFile } from './storage.js';
import { yyyymmdd } from './calendar.js';
import { depth } from './hacklib.js';
import { genders, aligns } from './roles.js';
import {
    COLNO, VERSION_MAJOR, VERSION_MINOR, PATCHLEVEL,
    PERSMAX, POINTSMIN, ENTRYMAX, PERS_IS_UID,
    PANICKED,
} from './const.js';
import { ATR_BOLD, NO_COLOR } from './terminal.js';

const NAMSZ = 10;
const ROLESZ = 3;
const DTHSZ = 100;
const RECORD_VFS = 'record';

function sysopt() {
    return {
        persmax: PERSMAX,
        pointsmin: POINTSMIN,
        entrymax: ENTRYMAX,
        pers_is_uid: !!PERS_IS_UID,
    };
}

function copynchars(src, n) {
    return String(src || '').slice(0, n);
}

function highc_first(s) {
    const t = String(s || '');
    if (!t) return t;
    return t[0].toUpperCase() + t.slice(1);
}

function onlyspace(s) {
    return !String(s || '').trim();
}

function observable_depth(lev) {
    return depth(lev);
}

function deepest_lev_reached(noquest) {
    let ret = 0;
    const dungeons = game.dungeons || [];
    for (let i = 0; i < dungeons.length; i++) {
        if (noquest && i === (game.quest_dnum | 0)) continue;
        const dlevel = dungeons[i]?.dunlev_ureached | 0;
        if (!dlevel) continue;
        const d = depth({ dnum: i, dlevel });
        if (d > ret) ret = d;
    }
    return ret;
}

function newttentry() {
    return {
        points: 0,
        deathdnum: 0,
        deathlev: 0,
        maxlvl: 0,
        hp: 0,
        maxhp: 0,
        deaths: 0,
        ver_major: VERSION_MAJOR,
        ver_minor: VERSION_MINOR,
        patchlevel: PATCHLEVEL,
        deathdate: 0,
        birthdate: 0,
        uid: 0,
        plrole: '',
        plrace: '',
        plgend: '',
        plalign: '',
        name: '',
        death: '',
    };
}

function writeentry_line(tt) {
    const name = onlyspace(tt.name) ? '_' : tt.name;
    return `${tt.ver_major}.${tt.ver_minor}.${tt.patchlevel} `
        + `${tt.points} ${tt.deathdnum} ${tt.deathlev} ${tt.maxlvl} `
        + `${tt.hp} ${tt.maxhp} ${tt.deaths} ${tt.deathdate} `
        + `${tt.birthdate} ${tt.uid} `
        + `${tt.plrole} ${tt.plrace} ${tt.plgend} ${tt.plalign} `
        + `${name},${tt.death}\n`;
}

function readentry_line(line) {
    const tt = newttentry();
    if (!line || !String(line).trim()) {
        tt.points = 0;
        return tt;
    }
    const m = String(line).match(
        /^(\d+)\.(\d+)\.(\d+) (-?\d+) (-?\d+) (-?\d+) (-?\d+) (-?\d+) (-?\d+) (-?\d+) (-?\d+) (-?\d+) (-?\d+) (.+)$/,
    );
    if (!m) {
        tt.points = 0;
        return tt;
    }
    tt.ver_major = +m[1];
    tt.ver_minor = +m[2];
    tt.patchlevel = +m[3];
    tt.points = +m[4];
    tt.deathdnum = +m[5];
    tt.deathlev = +m[6];
    tt.maxlvl = +m[7];
    tt.hp = +m[8];
    tt.maxhp = +m[9];
    tt.deaths = +m[10];
    tt.deathdate = +m[11];
    tt.birthdate = +m[12];
    tt.uid = +m[13];
    const sm = m[14].match(/^(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+([^,]*),(.*)$/);
    if (!sm) {
        tt.points = 0;
        return tt;
    }
    tt.plrole = copynchars(sm[1], ROLESZ);
    tt.plrace = copynchars(sm[2], ROLESZ);
    tt.plgend = copynchars(sm[3], ROLESZ);
    tt.plalign = copynchars(sm[4], ROLESZ);
    tt.name = copynchars(sm[5], NAMSZ);
    tt.death = copynchars(String(sm[6] || '').replace(/\r?\n$/, ''), DTHSZ);
    if (tt.birthdate < 19000000) tt.birthdate += 19000000;
    if (tt.deathdate < 19000000) tt.deathdate += 19000000;
    return tt;
}

function read_record_entries() {
    const raw = vfsReadFile(RECORD_VFS);
    if (raw == null || raw === '') return [];
    const entries = [];
    for (const line of String(raw).split('\n')) {
        if (!line) continue;
        const tt = readentry_line(line);
        entries.push(tt);
        if (!(tt.points > 0)) break;
    }
    return entries;
}

function write_record_entries(list) {
    let body = '';
    for (const tt of list) {
        if (!(tt.points > 0)) break;
        body += writeentry_line(tt);
    }
    vfsWriteFile(RECORD_VFS, body);
}

function gender_filecode() {
    const idx = game.flags?.female ? 1 : 0;
    return genders[idx]?.filecode || (idx ? 'Fem' : 'Mal');
}

function align_filecode() {
    const t = game.u?.ualign?.type | 0;
    return aligns[1 - t]?.filecode || 'Neu';
}

/**
 * Raw topten panel (!toptenwin): clear + lines; bold pads to COLNO-1.
 * C ref: topten_print / topten_print_bold after exit_nhwindows.
 */
function render_topten_lines(lines) {
    const disp = game.nhDisplay;
    if (!disp) return;
    disp.clearScreen();
    let row = 0;
    for (const item of lines) {
        const text = item.text ?? '';
        const bold = !!item.bold;
        const attr = bold ? ATR_BOLD : 0;
        const width = bold ? (COLNO - 1) : Math.min(text.length, COLNO);
        for (let i = 0; i < width; i++) {
            const ch = i < text.length ? text[i] : ' ';
            disp.setCell(i, row, ch, NO_COLOR, attr);
        }
        row++;
    }
    disp.setCursor(0, row);
}

/**
 * C ref: end.c really_done trailing raw_print("") x2 when done_stopprint.
 */
export function raw_print_blanks(n) {
    const disp = game.nhDisplay;
    if (!disp?.setCursor) return;
    // Prefer cursorRow (GameDisplay delegates); getCursor may be absent.
    const row = (disp.cursorRow != null)
        ? (disp.cursorRow | 0)
        : (disp.getCursor?.()?.[1] | 0);
    disp.setCursor(0, row + (n | 0));
}

function outheader(emit) {
    let line = ' No  Points     Name';
    while (line.length < COLNO - 9) line += ' ';
    line += 'Hp [max]';
    emit(line, false);
}

/**
 * C ref: topten.c outentry.
 * Named omissions: escaped with-amulet paren fixup; astral plane text;
 * choked/poisoned/crushed/petrified first-line arms.
 */
function outentry(rank, t1, so, emit) {
    let second_line = true;
    let linebuf = rank ? String(rank).padStart(3, ' ') : '   ';
    const pts = t1.points ? t1.points : (game.u?.urexp | 0);
    linebuf += ` ${String(pts).padStart(10, ' ')}  ${copynchars(t1.name, NAMSZ)}`;
    linebuf += `-${t1.plrole}`;
    if (t1.plrace[0] !== '?') linebuf += `-${t1.plrace}`;
    linebuf += `-${t1.plgend}`;
    if (t1.plalign[0] !== '?') linebuf += `-${t1.plalign} `;
    else linebuf += ' ';

    const death = String(t1.death || '');
    if (death.startsWith('escaped')) {
        linebuf += 'escaped the dungeon';
        second_line = false;
    } else if (death.startsWith('ascended')) {
        linebuf += `ascended to demigod${t1.plgend[0] === 'F' ? 'dess' : ''}-hood`;
        second_line = false;
    } else {
        // C: quit/starved/died share the dungeon/level append below
        if (death.startsWith('quit')) {
            linebuf += 'quit';
            second_line = false;
        } else if (death.startsWith('died of st')) {
            linebuf += 'starved to death';
            second_line = false;
        } else {
            linebuf += 'died';
        }

        // astral plane arm deferred — ordinary dungeon / knox
        const dname = game.dungeons?.[t1.deathdnum | 0]?.dname
            || 'The Dungeons of Doom';
        linebuf += ` in ${dname}`;
        const knoxDnum = game.knox_level?.dnum;
        if (knoxDnum == null || (t1.deathdnum | 0) !== (knoxDnum | 0)) {
            linebuf += ` on level ${t1.deathlev | 0}`;
        }
        if ((t1.deathlev | 0) !== (t1.maxlvl | 0)) {
            linebuf += ` [max ${t1.maxlvl | 0}]`;
        }

        // C: kludge for "quit while already on Charon's boat"
        if (death.startsWith('quit ')) {
            linebuf += death.slice(4);
        }
    }
    linebuf += '.';

    if (second_line) {
        let bp = `  ${highc_first(death)}.`;
        bp = bp.replace(/; the /g, ', the ');
        linebuf += bp;
    }

    const hpbuf = (t1.hp | 0) <= 0 ? '-' : String(t1.hp | 0);
    const hpposWrap = COLNO - ('  Hp [max]'.length);

    let lngr = linebuf.length;
    while (lngr >= hpposWrap) {
        let bp = linebuf.length - 1;
        while (bp > 0 && !(linebuf[bp] === ' ' && bp < hpposWrap)) bp--;
        if (bp <= 15) bp = hpposWrap - 1;
        if (bp > 5 && linebuf.slice(bp - 5, bp) === ' [max') bp -= 5;
        const rest = linebuf[bp] === ' ' ? linebuf.slice(bp + 1) : linebuf.slice(bp);
        let first = linebuf.slice(0, bp);
        if (so) {
            while (first.length < COLNO - 1) first += ' ';
            emit(first, true);
        } else emit(first, false);
        linebuf = `${' '.repeat(15)} ${rest}`;
        lngr = linebuf.length;
    }

    const hppos = COLNO - 7 - hpbuf.length;
    let out = linebuf;
    if (out.length <= hppos) {
        while (out.length < hppos) out += ' ';
        out += hpbuf;
        const maxhp = t1.maxhp | 0;
        const pad = maxhp < 10 ? '  ' : maxhp < 100 ? ' ' : '';
        out += ` ${pad}[${maxhp}]`;
    }
    if (so) {
        while (out.length < COLNO - 1) out += ' ';
        emit(out, true);
    } else emit(out, false);
}

/**
 * C ref: topten.c topten.
 * @param {number} how
 * @param {number} when  C time_t; yyyymmdd(when) deathdate (0 → getlt)
 * @param {string} deathStr formatkiller(how, TRUE) from caller (avoid cycle)
 *
 * Named omissions: LOGFILE/XLOGFILE; lock_file; toptenwin NHW_TEXT;
 * UPDATE_RECORD_IN_PLACE; prscore; hangup; full escape/ascend/quit
 * outentry arms; ordin() for rank>10 message.
 */
export function topten(how, when = 0, deathStr = '') {
    if (game.program_state?.panicking) return;

    const opt = sysopt();
    const done_stopprint = game.program_state?.done_stopprint | 0;
    const flags = game.flags || {};
    const u = game.u || {};

    // C: wizard || discover → raw message then goto showwin (no RECORD)
    const wizard = !!(flags.debug || flags.wizard);
    const discover = !!(flags.explore || flags.discover);
    if (wizard || discover) {
        if (how !== PANICKED) {
            const mode = wizard ? 'wizard' : 'discover';
            // C topten_print is not gated by done_stopprint; showwin is.
            render_topten_lines([
                { text: '', bold: false },
                {
                    text: `Since you were in ${mode} mode, the score list will not be checked.`,
                    bold: false,
                },
            ]);
        }
        return;
    }

    const end_top = flags.end_top != null ? (flags.end_top | 0) : 3;
    const end_around = flags.end_around != null ? (flags.end_around | 0) : 2;
    const end_own = !!flags.end_own;

    const t0 = newttentry();
    t0.points = u.urexp | 0;
    t0.deathdnum = u.uz?.dnum | 0;
    t0.deathlev = observable_depth(u.uz);
    t0.maxlvl = deepest_lev_reached(true);
    t0.hp = u.uhp | 0;
    t0.maxhp = u.uhpmax | 0;
    t0.deaths = u.umortality | 0;
    t0.uid = 0;
    t0.plrole = copynchars(game.urole?.filecode || 'Tou', ROLESZ);
    t0.plrace = copynchars(game.urace?.filecode || 'Hum', ROLESZ);
    t0.plgend = copynchars(gender_filecode(), ROLESZ);
    t0.plalign = copynchars(align_filecode(), ROLESZ);
    t0.name = copynchars(game.plname || 'Player', NAMSZ);
    t0.death = copynchars(deathStr, DTHSZ);
    t0.birthdate = yyyymmdd(0);
    t0.deathdate = yyyymmdd(when || 0);

    const outLines = [];
    const emit = (text, bold) => {
        outLines.push({ text, bold: !!bold });
    };

    // C: HUP topten_print("") after fopen
    emit('', false);

    if (t0.points < opt.pointsmin) t0.points = 0;

    const fileEntries = read_record_entries();
    const tt_head = [];
    let rank0 = -1;
    let rank1 = 0;
    let occ_cnt = opt.persmax;
    let flg = 0;
    let t0_used = false;
    let rank = 1;
    let fi = 0;

    for (;;) {
        const t1 = fi < fileEntries.length
            ? { ...fileEntries[fi++] }
            : newttentry();
        if (t1.points < opt.pointsmin) t1.points = 0;

        if (rank0 < 0 && t1.points < t0.points) {
            rank0 = rank++;
            tt_head.push(t0);
            t0_used = true;
            occ_cnt--;
            flg++;
            if (t1.points !== 0) tt_head.push(t1);
        } else if (t1.points !== 0) {
            tt_head.push(t1);
        }

        if (t1.points === 0) break;

        const samePerson = opt.pers_is_uid
            ? t1.uid === t0.uid
            : t1.name.slice(0, NAMSZ) === t0.name.slice(0, NAMSZ);
        if (samePerson
            && t1.plrole.slice(0, ROLESZ) === t0.plrole.slice(0, ROLESZ)
            && --occ_cnt <= 0) {
            if (rank0 < 0) {
                rank0 = 0;
                rank1 = rank;
                emit(`You didn't beat your previous score of ${t1.points} points.`, false);
                emit('', false);
            }
            if (occ_cnt < 0) {
                flg++;
                tt_head.pop(); // discard excess personal entry
                continue;
            }
        }

        if (rank <= opt.entrymax) {
            rank++;
        }
        if (rank > opt.entrymax) break;
    }

    if (flg) {
        if (!done_stopprint && rank0 > 0) {
            if (rank0 <= 10) emit('You made the top ten list!', false);
            else {
                emit(
                    `You reached the ${rank0} place on the top ${opt.entrymax} list.`,
                    false,
                );
            }
            emit('', false);
        }
        write_record_entries(tt_head);
    }

    const skip_scores = !end_top && !end_around && !end_own;
    if (rank0 === 0) rank0 = rank1;
    if (rank0 <= 0) rank0 = rank;

    if (!skip_scores && !done_stopprint) outheader(emit);

    rank = 1;
    for (const t1 of tt_head) {
        if (!(t1.points > 0)) break;
        if (!skip_scores && !done_stopprint) {
            const show = rank <= end_top
                || (rank >= rank0 - end_around && rank <= rank0 + end_around)
                || (end_own && (opt.pers_is_uid
                    ? t1.uid === t0.uid
                    : t1.name.slice(0, NAMSZ) === t0.name.slice(0, NAMSZ)));
            if (show) {
                if (rank === rank0 - end_around
                    && rank0 > end_top + end_around + 1
                    && !end_own) {
                    emit('', false);
                }
                if (rank !== rank0) outentry(rank, t1, false, emit);
                else if (!rank1) outentry(rank, t1, true, emit);
                else {
                    outentry(rank, t1, true, emit);
                    outentry(0, t0, true, emit);
                }
            }
        }
        rank++;
    }
    if (rank0 >= rank) {
        if (!skip_scores && !done_stopprint) outentry(0, t0, true, emit);
    }

    void t0_used;

    if (!done_stopprint) render_topten_lines(outLines);
}

/** C ref: end.c nh_terminate + contest post-topten input-boundary capture. */
export function nh_terminate_capture() {
    const capture = game._captureInputBoundary;
    if (typeof capture === 'function') capture();
}
