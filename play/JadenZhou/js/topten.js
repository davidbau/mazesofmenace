// topten.js -- the high score list.
// C ref: topten.c -- formatkiller(), topten(), outheader(), outentry(),
// readentry(), writeentry(), classmon(), get_rnd_toptenentry(), tt_oname(),
// tt_doppel().
//
// The record file lives in the contest's virtual filesystem (storage.js),
// which the segments of a session share, like the recorder's playground.
// The recorder starts every session with an empty record file. This build
// doesn't define UPDATE_RECORD_IN_PLACE or NO_SCAN_BRACK, so the record is
// rewritten as a whole. The logfile and xlogfile (LOGFILE, XLOGFILE) are
// only ever appended to and never read back by the game, so no copy of
// them is kept.

import { ordin } from './hacklib.js';
import { game } from './gstate.js';
import { rn2, rnd, rn1 } from './rng.js';
import { vfsReadFile, vfsWriteFile } from './storage.js';
import { KILLED_BY_AN, KILLED_BY, NO_KILLER_PREFIX, PANICKED, COLNO,
         CORPSTAT_FEMALE, CORPSTAT_MALE, ONAME_NO_FLAGS } from './const.js';
import { an } from './objnam.js';
import { highc, copynchars } from './hacklib.js';
import { roles, genders, aligns } from './role.js';
import { PM_HUMAN, PM_RANGER, PM_HUMAN_MUMMY, PM_ARCHEOLOGIST, PM_WIZARD } from './monsters.js';
import { depth, deepest_lev_reached } from './dungeon.js';
import { yyyymmdd } from './calendar.js';
import { tty_raw_print, tty_raw_print_bold } from './wintty.js';
import { set_corpsenm } from './mkobj.js';
import { oname, christen_monst } from './do_name.js';
import { canseemon } from './display.js';
import { HACK_UID } from './files.js';

// C ref: config.h RECORD
const RECORD = 'record';

/* C ref: patchlevel.h */
const VERSION_MAJOR = 5, VERSION_MINOR = 0, PATCHLEVEL = 0;

// C ref: topten.c NAMSZ, DTHSZ, ROLESZ, SCANBUFSZ
const NAMSZ = 10;
const DTHSZ = 100;
const ROLESZ = 3;
const SCANBUFSZ = (4 * (ROLESZ + 1) + (NAMSZ + 1) + (DTHSZ + 1) + 1);

/* svk.killer, created on first use (format KILLED_BY_AN == 0) */
export function killer() {
    if (!game.killer)
        game.killer = { format: KILLED_BY_AN, name: '', next: null };
    return game.killer;
}

// C ref: topten.c struct toptenentry; static struct toptenentry zerott
function zerott() {
    return {
        tt_next: null, points: 0, deathdnum: 0, deathlev: 0,
        maxlvl: 0, hp: 0, maxhp: 0, deaths: 0,
        ver_major: 0, ver_minor: 0, patchlevel: 0,
        deathdate: 0, birthdate: 0, uid: 0,
        plrole: '', plrace: '', plgend: '', plalign: '',
        name: '', death: '',
    };
}

// C ref: topten.c formatkiller()
/* "killed by",&c ["an"] 'svk.killer.name' (C fills buf[siz]) */
export function formatkiller(siz, how, incl_helpless) {
    const killed_by_prefix = [
        /* DIED, CHOKING, POISONING, STARVING, */
        "killed by ", "choked on ", "poisoned by ", "died of ",
        /* DROWNING, BURNING, DISSOLVED, CRUSHING, */
        "drowned in ", "burned by ", "dissolved in ", "crushed to death by ",
        /* STONING, TURNED_SLIME, GENOCIDED, */
        "petrified by ", "turned to slime by ", "killed by ",
        /* PANICKED, TRICKED, QUIT, ESCAPED, ASCENDED */
        "", "", "", "", ""
    ];
    let buf = '';
    let kname = killer().name;

    switch (killer().format) {
    default:
        /* impossible("bad killer format? (%d)", svk.killer.format); */
        /*FALLTHRU*/
    case NO_KILLER_PREFIX:
        break;
    case KILLED_BY_AN:
        kname = an(kname);
        /*FALLTHRU*/
    case KILLED_BY:
        buf = killed_by_prefix[how].slice(0, siz - 1); /* strncat(buf, ..., siz - 1) */
        siz -= buf.length;
        break;
    }
    /* Copy kname into buf[].
     * Object names and named fruit have already been sanitized, but
     * monsters can have "called 'arbitrary text'" attached to them,
     * so make sure that that text can't confuse field splitting when
     * record, logfile, or xlogfile is re-read at some later point.
     */
    let k = 0;
    while (--siz > 0) {
        let c = kname[k++];
        if (c === undefined)
            break;
        else if (c === ',')
            c = ';';
        /* 'xlogfile' doesn't really need protection for '=', but
           fixrecord.awk for corrupted 3.6.0 'record' does (only
           if using xlogfile rather than logfile to repair record) */
        else if (c === '=')
            c = '_';
        /* tab is not possible due to use of mungspaces() when naming;
           it would disrupt xlogfile parsing if it were present */
        else if (c === '\t')
            c = ' ';
        buf += c;
    }

    if (incl_helpless && game.multi < 0) {
        /* X <= siz: 'sizeof "string"' includes 1 for '\0' terminator */
        if (game.multi_reason
            && game.multi_reason.length + ", while ".length + 1 <= siz)
            buf += `, while ${game.multi_reason}`;
        /* either gm.multi_reason wasn't specified or wouldn't fit */
        else if (", while helpless".length + 1 <= siz)
            buf += ", while helpless";
        /* else extra death info won't fit, so leave it out */
    }
    return buf;
}

// C ref: topten.c topten_print()
function topten_print(x) {
    if (game.toptenwin === undefined || game.toptenwin < 0) /* WIN_ERR */
        tty_raw_print(x);
    else
        throw new Error('topten_print(): toptenwin not ported yet');
}

// C ref: topten.c topten_print_bold()
function topten_print_bold(x) {
    if (game.toptenwin === undefined || game.toptenwin < 0) /* WIN_ERR */
        tty_raw_print_bold(x);
    else
        throw new Error('topten_print_bold(): toptenwin not ported yet');
}

// C ref: topten.c observable_depth()
export function observable_depth(lev) {
    return depth(lev);
}

/* fopen_datafile(RECORD, "r", SCOREPREFIX): the record file's contents
   with a read position; the recorder creates it (empty) before every
   session, so a record that was never written reads as empty */
function open_record() {
    return { data: vfsReadFile(RECORD) || '', pos: 0 };
}

// C ref: topten.c discardexcess()
/* throw away characters until current record has been entirely consumed */
function discardexcess(rfile) {
    const nl = rfile.data.indexOf('\n', rfile.pos);
    rfile.pos = (nl < 0) ? rfile.data.length : nl + 1;
}

// C ref: topten.c readentry()
function readentry(rfile, tt) {
    /* fmt = "%d.%d.%d %ld %d %d %d %d %d %d %ld %ld %d " */
    const num = '\\s*([-+]?\\d+)';
    const fmt = new RegExp(`^${num}\\.([-+]?\\d+)\\.([-+]?\\d+)`
                           + `${num}${num}${num}${num}${num}${num}${num}${num}${num}${num}\\s*`);
    const m = fmt.exec(rfile.data.slice(rfile.pos));

    if (!m) {
        tt.points = 0;
        discardexcess(rfile);
    } else {
        [tt.ver_major, tt.ver_minor, tt.patchlevel, tt.points, tt.deathdnum,
         tt.deathlev, tt.maxlvl, tt.hp, tt.maxhp, tt.deaths, tt.deathdate,
         tt.birthdate, tt.uid] = m.slice(1, 14).map(Number);
        rfile.pos += m[0].length;
        /* load remainder of record into a local buffer;
           this imposes an implicit length limit of SCANBUFSZ
           on every string field extracted from the buffer */
        let inbuf;
        const nl = rfile.data.indexOf('\n', rfile.pos);
        const end = (nl < 0) ? rfile.data.length : nl + 1;
        if (rfile.pos >= rfile.data.length) {
            /* sscanf will fail and tt->points will be set to 0 */
            inbuf = '';
        } else if (end - rfile.pos > SCANBUFSZ - 1 || nl < 0) {
            /* fgets() stops short of the newline */
            const len = Math.min(end - rfile.pos, SCANBUFSZ - 1);
            inbuf = rfile.data.slice(rfile.pos, rfile.pos + len);
            rfile.pos += len;
            if (!inbuf.includes('\n')) {
                inbuf = inbuf.slice(0, SCANBUFSZ - 2) + '\n';
                discardexcess(rfile);
            }
        } else {
            inbuf = rfile.data.slice(rfile.pos, end);
            rfile.pos = end;
        }
        /* Check for backwards compatibility */
        if (tt.ver_major < 3 || (tt.ver_major === 3 && tt.ver_minor < 3)) {
            throw new Error('readentry(): a pre-3.3 record entry not ported yet');
        } else {
            /* fmt33 = "%s %s %s %s %[^,],%[^\n]%*c" */
            const m33 = /^\s*(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s*([^,]+),([^\n]+)/.exec(inbuf);
            if (m33) {
                tt.plrole = copynchars(m33[1], ROLESZ);
                tt.plrace = copynchars(m33[2], ROLESZ);
                tt.plgend = copynchars(m33[3], ROLESZ);
                tt.plalign = copynchars(m33[4], ROLESZ);
                tt.name = copynchars(m33[5], NAMSZ);
                tt.death = copynchars(m33[6], DTHSZ);
            } else
                tt.points = 0;
        }
    }

    /* check old score entries for Y2K problem and fix whenever found */
    if (tt.points > 0) {
        if (tt.birthdate < 19000000)
            tt.birthdate += 19000000;
        if (tt.deathdate < 19000000)
            tt.deathdate += 19000000;
    }
}

// C ref: topten.c writeentry() -- returns the text fprintf() writes
function writeentry(tt) {
    let s = `${tt.ver_major}.${tt.ver_minor}.${tt.patchlevel} ${tt.points}`
            + ` ${tt.deathdnum} ${tt.deathlev} ${tt.maxlvl} ${tt.hp}`
            + ` ${tt.maxhp} ${tt.deaths} ${tt.deathdate} ${tt.birthdate}`
            + ` ${tt.uid} `;
    if (tt.ver_major < 3 || (tt.ver_major === 3 && tt.ver_minor < 3))
        s += `${tt.plrole[0]}${tt.plgend[0]} `; /* fmt32 */
    else
        s += `${tt.plrole} ${tt.plrace} ${tt.plgend} ${tt.plalign} `; /* fmt33 */
    s += `${/^\s*$/.test(tt.name) ? "_" : tt.name},${tt.death}\n`; /* fmtX */
    return s;
}

// C ref: topten.c topten()
export async function topten(how, when) {
    const g = game;
    const u = g.u;
    const sysopt = g.sysopt;
    const flags = g.flags;
    const uid = HACK_UID; /* getuid() */
    let rank, rank0 = -1, rank1 = 0;
    let occ_cnt = sysopt.persmax;
    let flg = 0;
    let t0_used, skip_scores;
    let rfile, t1, tprev;
    const wizard = !!flags.debug, discover = !!flags.explore;
    const done_stopprint = g.program_state.stopprint || 0;

    /* If we are in the midst of a panic, cut out topten entirely.
     * topten uses alloc() several times, which will lead to
     * problems if the panic was the result of an alloc() failure.
     */
    if (g.program_state.panicking)
        return;

    if (g.iflags.toptenwin)
        throw new Error('topten(): toptenwin not ported yet');

    /* create a new 'topten' entry */
    t0_used = false;
    const t0 = zerott();
    t0.ver_major = VERSION_MAJOR;
    t0.ver_minor = VERSION_MINOR;
    t0.patchlevel = PATCHLEVEL;
    t0.points = u.urexp;
    t0.deathdnum = u.uz.dnum;
    /* deepest_lev_reached() is in terms of depth(), and reporting the
     * deepest level reached in the dungeon death occurred in doesn't
     * seem right, so we have to report the death level in depth() terms
     * as well (which also seems reasonable since that's all the player
     * sees on the screen anyway)
     */
    t0.deathlev = observable_depth(u.uz);
    t0.maxlvl = deepest_lev_reached(true);
    t0.hp = u.uhp;
    t0.maxhp = u.uhpmax;
    t0.deaths = u.umortality;
    t0.uid = uid;
    t0.plrole = copynchars(g.urole.filecode, ROLESZ);
    t0.plrace = copynchars(g.urace.filecode, ROLESZ);
    t0.plgend = copynchars(genders[flags.female ? 1 : 0].filecode, ROLESZ);
    t0.plalign = copynchars(aligns[1 - u.ualign.type].filecode, ROLESZ);
    t0.name = copynchars(g.plname, NAMSZ);
    t0.death = formatkiller(DTHSZ + 1, how, true);
    t0.birthdate = yyyymmdd(g.ubirthday);
    t0.deathdate = yyyymmdd(when);
    t0.tt_next = null;

    /* LOGFILE, XLOGFILE: writeentry(lfile, t0), writexlentry(xlfile, t0,
       how) -- append-only files, see the top of this file */

    if (wizard || discover) {
        if (how !== PANICKED) {
            topten_print("");
            topten_print(`Since you were in ${wizard ? "wizard" : "discover"
                          } mode, the score list will not be checked.`);
        }
        return; /* goto showwin; */
    }

    /* lock_file(RECORD, SCOREPREFIX, 60) */
    rfile = open_record();

    topten_print("");

    /* assure minimum number of points */
    if (t0.points < sysopt.pointsmin)
        t0.points = 0;

    t1 = g.tt_head = zerott();
    tprev = null;
    /* rank0: -1 undefined, 0 not_on_list, n n_th on list */
    for (rank = 1; ;) {
        readentry(rfile, t1);
        if (t1.points < sysopt.pointsmin)
            t1.points = 0;
        if (rank0 < 0 && t1.points < t0.points) {
            rank0 = rank++;
            if (tprev === null)
                g.tt_head = t0;
            else
                tprev.tt_next = t0;
            t0.tt_next = t1;
            t0_used = true;
            occ_cnt--;
            flg++; /* ask for a rewrite */
        } else
            tprev = t1;

        if (t1.points === 0)
            break;
        if ((sysopt.pers_is_uid ? t1.uid === t0.uid
                                : t1.name.slice(0, NAMSZ) === t0.name.slice(0, NAMSZ))
            && t1.plrole.slice(0, ROLESZ) === t0.plrole.slice(0, ROLESZ)
            && --occ_cnt <= 0) {
            if (rank0 < 0) {
                rank0 = 0;
                rank1 = rank;
                topten_print(
                    `You didn't beat your previous score of ${t1.points} points.`);
                topten_print("");
            }
            if (occ_cnt < 0) {
                flg++;
                continue;
            }
        }
        if (rank <= sysopt.entrymax) {
            t1.tt_next = zerott();
            t1 = t1.tt_next;
            rank++;
        }
        if (rank > sysopt.entrymax) {
            t1.points = 0;
            break;
        }
    }
    let wfile = null;
    if (flg) { /* rewrite record file */
        /* fclose(rfile); rfile = fopen_datafile(RECORD, "w", SCOREPREFIX) */
        wfile = '';
        if (!done_stopprint)
            if (rank0 > 0) {
                if (rank0 <= 10) {
                    topten_print("You made the top ten list!");
                } else {
                    topten_print(`You reached the ${rank0}${ordin(rank0)
                                  } place on the top ${sysopt.entrymax} list.`);
                }
                topten_print("");
            }
    }
    skip_scores = !flags.end_top && !flags.end_around && !flags.end_own;
    if (rank0 === 0)
        rank0 = rank1;
    if (rank0 <= 0)
        rank0 = rank;
    if (!skip_scores && !done_stopprint)
        outheader();
    for (t1 = g.tt_head, rank = 1; t1.points !== 0; t1 = t1.tt_next, ++rank) {
        if (flg)
            wfile += writeentry(t1);
        if (skip_scores || done_stopprint)
            continue;
        if (rank <= flags.end_top
            || (rank >= rank0 - flags.end_around
                && rank <= rank0 + flags.end_around)
            || (flags.end_own && (sysopt.pers_is_uid
                                  ? t1.uid === t0.uid
                                  : t1.name.slice(0, NAMSZ) === t0.name.slice(0, NAMSZ)))) {
            if (rank === rank0 - flags.end_around
                && rank0 > flags.end_top + flags.end_around + 1
                && !flags.end_own)
                topten_print("");

            if (rank !== rank0) {
                outentry(rank, t1, false);
            } else if (!rank1) {
                outentry(rank, t1, true);
            } else {
                outentry(rank, t1, true);
                outentry(0, t0, true);
            }
        }
    }
    if (rank0 >= rank)
        if (!skip_scores && !done_stopprint)
            outentry(0, t0, true);
    /* fclose(rfile); unlock_file(RECORD); free_ttlist(tt_head) */
    if (wfile !== null)
        vfsWriteFile(RECORD, wfile);
    void t0_used;

    /* showwin: when not a window, nothing comparable to more() is done */
}

// C ref: topten.c outheader()
function outheader() {
    let linebuf = " No  Points     Name";
    while (linebuf.length < COLNO - 9)
        linebuf += ' ';
    linebuf += "Hp [max]";
    topten_print(linebuf);
}

// C ref: topten.c outentry()
/* so>0: standout line; so=0: ordinary line */
function outentry(rank, t1, so) {
    const u = game.u;
    const topo = game.dungeon_topology;
    let second_line = true;
    let linebuf = '';
    let bp, hpbuf, linebuf3, hppos, lngr;

    if (rank)
        linebuf += String(rank).padStart(3);
    else
        linebuf += "   ";

    linebuf += ` ${String(t1.points ? t1.points : u.urexp).padStart(10)}  ${
                t1.name.slice(0, 10)}`;
    linebuf += `-${t1.plrole}`;
    if (t1.plrace[0] !== '?')
        linebuf += `-${t1.plrace}`;
    /* Printing of gender and alignment is intentional.  It has been
     * part of the NetHack Geek Code, and illustrates a proper way to
     * specify a character from the command line.
     */
    linebuf += `-${t1.plgend}`;
    if (t1.plalign[0] !== '?')
        linebuf += `-${t1.plalign} `;
    else
        linebuf += " ";
    if (t1.death.startsWith("escaped")) {
        throw new Error('outentry(): an escaped entry not ported yet');
    } else if (t1.death.startsWith("ascended")) {
        linebuf += `ascended to demigod${(t1.plgend[0] === 'F') ? "dess" : ""}-hood`;
        second_line = false;
    } else {
        if (t1.death.startsWith("quit")) {
            linebuf += "quit";
            second_line = false;
        } else if (t1.death.startsWith("died of st")) {
            linebuf += "starved to death";
            second_line = false;
        } else if (t1.death.startsWith("choked")) {
            linebuf += `choked on h${(t1.plgend[0] === 'F') ? "er" : "is"} food`;
        } else if (t1.death.startsWith("poisoned")) {
            linebuf += "was poisoned";
        } else if (t1.death.startsWith("crushed")) {
            linebuf += "was crushed to death";
        } else if (t1.death.startsWith("petrified by ")) {
            linebuf += "turned to stone";
        } else
            linebuf += "died";

        if (t1.deathdnum === topo.d_astral_level.dnum) {
            let arg, fmt = (a) => ` on the Plane of ${a}`;

            switch (t1.deathlev) {
            case -5:
                fmt = (a) => ` on the ${a} Plane`;
                arg = "Astral";
                break;
            case -4:
                arg = "Water";
                break;
            case -3:
                arg = "Fire";
                break;
            case -2:
                arg = "Air";
                break;
            case -1:
                arg = "Earth";
                break;
            default:
                arg = "Void";
                break;
            }
            linebuf += fmt(arg);
        } else {
            linebuf += ` in ${game.dungeons[t1.deathdnum].dname}`;
            if (t1.deathdnum !== topo.d_knox_level.dnum)
                linebuf += ` on level ${t1.deathlev}`;
            if (t1.deathlev !== t1.maxlvl)
                linebuf += ` [max ${t1.maxlvl}]`;
        }

        /* kludge for "quit while already on Charon's boat" */
        if (t1.death.startsWith("quit "))
            linebuf += t1.death.slice(4);
    }
    linebuf += ".";

    /* Quit, starved, ascended, and escaped contain no second line */
    if (second_line) {
        const start = linebuf.length;
        linebuf += `  ${highc(t1.death[0])}${t1.death.slice(1)}.`;
        /* fix up "Killed by Mr. Asidonhopo; the shopkeeper"; that starts
           with a comma but has it changed to semi-colon to keep the comma
           out of 'record'; change it back for display */
        const tail = linebuf.slice(start);
        if (tail.includes("; the "))
            linebuf = linebuf.slice(0, start) + tail.replace("; the ", ", the ");
    }

    lngr = linebuf.length;
    if (t1.hp <= 0)
        hpbuf = "-";
    else
        hpbuf = String(t1.hp);
    /* beginning of hp column after padding (not actually padded yet) */
    hppos = COLNO - ("  Hp [max]".length);
    while (lngr >= hppos) {
        for (bp = linebuf.length; !(linebuf[bp] === ' ' && bp < hppos); bp--)
            ;
        /* special case: word is too long, wrap in the middle */
        if (15 >= bp)
            bp = hppos - 1;
        /* special case: if about to wrap in the middle of maximum
           dungeon depth reached, wrap in front of it instead */
        if (bp > 5 && linebuf.slice(bp - 5, bp) === " [max")
            bp -= 5;
        if (linebuf[bp] !== ' ')
            linebuf3 = linebuf.slice(bp);
        else
            linebuf3 = linebuf.slice(bp + 1);
        linebuf = linebuf.slice(0, bp);
        if (so) {
            while (linebuf.length < COLNO - 1)
                linebuf += ' ';
            topten_print_bold(linebuf);
        } else
            topten_print(linebuf);
        linebuf = `${"".padStart(15)} ${linebuf3}`;
        lngr = linebuf.length;
    }
    /* beginning of hp column not including padding */
    hppos = COLNO - 7 - hpbuf.length;

    if (linebuf.length <= hppos) {
        /* pad any necessary blanks to the hit point entry */
        while (linebuf.length < hppos)
            linebuf += ' ';
        linebuf += hpbuf;
        linebuf += ` ${(t1.maxhp < 10) ? "  " : (t1.maxhp < 100) ? " " : ""}[${t1.maxhp}]`;
    }

    if (so) {
        while (linebuf.length < COLNO - 1)
            linebuf += ' ';
        topten_print_bold(linebuf);
    } else
        topten_print(linebuf);
}

// C ref: topten.c classmon()
function classmon(plch) {
    let i;

    /* Look for this role in the role table */
    for (i = 0; roles[i] && roles[i].name.m; i++) {
        if (plch.slice(0, ROLESZ) === roles[i].filecode.slice(0, ROLESZ)) {
            if (roles[i].mnum !== -1 /* NON_PM */)
                return roles[i].mnum;
            else
                return PM_HUMAN;
        }
    }
    /* this might be from a 3.2.x score for former Elf class */
    if (plch === "E")
        return PM_RANGER;

    /* impossible("What weird role is this? (%s)", plch); */
    return PM_HUMAN_MUMMY;
}

// C ref: topten.c get_rnd_toptenentry()
/*
 * Get a random player name and class from the high score list,
 */
function get_rnd_toptenentry() {
    let rank, i;

    /* rfile = fopen_datafile(RECORD, "r", SCOREPREFIX): the recorder
       creates the record file (empty) before every session */
    const rfile = open_record();

    let tt = zerott(); /* static struct toptenentry tt_buf */
    rank = rnd(game.sysopt.tt_oname_maxrank);
    for (;;) { /* pickentry: */
        for (i = rank; i; i--) {
            readentry(rfile, tt);
            if (tt.points === 0)
                break;
        }

        if (tt.points === 0) {
            if (rank > 1) {
                rank = 1;
                rfile.pos = 0; /* rewind(rfile) */
                continue; /* goto pickentry; */
            }
            tt = null;
        }
        break;
    }

    return tt;
}

// C ref: topten.c tt_oname()
/*
 * Attach random player name and class from high score list
 * to an object (for statues or morgue corpses).
 */
export function tt_oname(otmp) {
    if (!otmp)
        return null;

    const tt = get_rnd_toptenentry();

    if (!tt)
        return null;

    set_corpsenm(otmp, classmon(tt.plrole));
    if (tt.plgend[0] === 'F')
        otmp.spe = CORPSTAT_FEMALE;
    else if (tt.plgend[0] === 'M')
        otmp.spe = CORPSTAT_MALE;
    otmp = oname(otmp, tt.name, ONAME_NO_FLAGS);

    return otmp;
}

// C ref: topten.c tt_doppel()
/* Randomly select a topten entry to mimic */
export function tt_doppel(mon) {
    const tt = rn2(13) ? get_rnd_toptenentry() : null;
    let ret;

    if (!tt)
        ret = rn1(PM_WIZARD - PM_ARCHEOLOGIST + 1, PM_ARCHEOLOGIST);
    else {
        if (tt.plgend[0] === 'F')
            mon.female = 1;
        else if (tt.plgend[0] === 'M')
            mon.female = 0;
        ret = classmon(tt.plrole);
        /* Only take on a name if the player can see
           the doppelganger, otherwise we end up with
           named monsters spoiling the fun - Kes */
        if (canseemon(mon))
            christen_monst(mon, tt.name);
    }
    return ret;
}
