// questpgr.js — quest and common pager messages.
// C ref: questpgr.c — skip_pager, com_pager_core, com_pager.
//
// Not ported yet: the quest-specific convert_arg() substitutions (%l %i
// %o %O %n %g %H, which need the quest leader/nemesis data), the
// pronoun suffixes (qtext_pronoun()), deliver_by_pline() output,
// putmsghistory() of the synopsis, qt_pager(), qt_montype() and the
// quest status code.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { NHL_SB_SAFE } from './const.js';
import { nhl_init, nhl_loadlua, nhl_done } from './nhlua.js';
import { NHW_TEXT, NHW_MENU, A_ORIGINAL, A_LAWFUL } from './const.js';
import { tty_create_nhwindow, tty_putstr, tty_display_nhwindow,
         tty_destroy_nhwindow } from './wintty.js';
import { rank_of } from './botl.js';
import { align_gname, align_gtitle } from './pray.js';
import { align_str } from './insight.js';
import { an } from './objnam.js';
import { highc, s_suffix, strncmpi } from './hacklib.js';

const QTEXT_FILE = 'quest.lua';

function impossible(msg) { console.error(`impossible: ${msg}`); }

// C ref: you.h MIN_QUEST_LEVEL
const MIN_QUEST_LEVEL = 14;

// C ref: questpgr.c convert_arg()
function convert_arg(c) {
    const g = game;
    let str;

    switch (c) {
    case 'p':
        str = g.plname;
        break;
    case 'c':
        str = (g.flags.female && g.urole.name.f) ? g.urole.name.f
                                                 : g.urole.name.m;
        break;
    case 'r':
        str = rank_of(g.u.ulevel, g.urole.mnum /* Role_switch */, g.flags.female);
        break;
    case 'R':
        str = rank_of(MIN_QUEST_LEVEL, g.urole.mnum /* Role_switch */, g.flags.female);
        break;
    case 's':
        str = (g.flags.female) ? "sister" : "brother";
        break;
    case 'S':
        str = (g.flags.female) ? "daughter" : "son";
        break;
    case 'l': case 'i': case 'O': case 'o': case 'n': case 'g': case 'H':
        /* ldrname(), intermed(), the(artiname()), neminame(),
           guardname(), homebase() */
        throw new Error(`convert_arg: %${c} (quest data) not ported yet`);
    case 'G':
        str = align_gtitle(g.u.ualignbase[A_ORIGINAL]);
        break;
    case 'a':
        str = align_str(g.u.ualignbase[A_ORIGINAL]);
        break;
    case 'A':
        str = align_str(g.u.ualign.type);
        break;
    case 'd':
        str = align_gname(g.u.ualignbase[A_ORIGINAL]);
        break;
    case 'D':
        str = align_gname(A_LAWFUL);
        break;
    case 'C':
        str = "chaotic";
        break;
    case 'N':
        str = "neutral";
        break;
    case 'L':
        str = "lawful";
        break;
    case 'x':
        str = g.Blind ? "sense" : "see";
        break;
    case 'Z':
        str = g.dungeons[0].dname;
        break;
    case '%':
        str = "%";
        break;
    default:
        str = "";
        break;
    }
    g.cvt_buf = str;
}

// C ref: questpgr.c convert_line()
function convert_line(in_line) {
    const g = game;
    let out = '';

    for (let c = 0; c < in_line.length; c++) {
        switch (in_line[c]) {
        case '\r':
        case '\n':
            return out;

        case '%':
            if (c + 1 < in_line.length) {
                convert_arg(in_line[++c]);
                switch (in_line[++c]) {
                /* insert "a"/"an" prefix */
                case 'A': {
                    const s = an(g.cvt_buf);
                    out += highc(s[0]) + s.slice(1); /* An() */
                    continue; /* for */
                }
                case 'a':
                    out += an(g.cvt_buf);
                    continue; /* for */

                /* capitalize */
                case 'C':
                    g.cvt_buf = highc(g.cvt_buf[0] || '') + g.cvt_buf.slice(1);
                    break;

                /* replace name with pronoun;
                   valid for %d, %l, %n, and %o */
                case 'h': case 'H': case 'i': case 'I': case 'j': case 'J':
                    if ("dlno".includes(in_line[c - 1].toLowerCase()))
                        throw new Error('convert_line: qtext_pronoun() not ported yet');
                    else
                        --c; /* default action */
                    break;

                /* pluralize */
                case 'P':
                case 'p':
                    throw new Error('convert_line: makeplural() not ported yet');

                /* append possessive suffix */
                case 'S':
                    g.cvt_buf = highc(g.cvt_buf[0] || '') + g.cvt_buf.slice(1);
                    /*FALLTHRU*/
                case 's':
                    g.cvt_buf = s_suffix(g.cvt_buf);
                    break;

                /* strip any "the" prefix */
                case 't':
                    if (!strncmpi(g.cvt_buf, "the ", 4)) {
                        out += g.cvt_buf.slice(4);
                        continue; /* for */
                    }
                    break;

                default:
                    --c; /* undo switch increment */
                    break;
                }
                out += g.cvt_buf;
                break;
            }
            /* FALLTHRU */
        default:
            out += in_line[c];
            break;
        }
    }
    return out;
}

// C ref: questpgr.c deliver_by_window()
async function deliver_by_window(msg, how) {
    const datawin = tty_create_nhwindow(how);

    /* copynchars() stops at each newline */
    for (const in_line of msg.split('\n'))
        tty_putstr(datawin, 0, convert_line(in_line));

    await tty_display_nhwindow(datawin, true);
    tty_destroy_nhwindow(datawin);
}

// C ref: questpgr.c deliver_by_pline() -- not ported yet (pline output
// of each converted line)
function deliver_by_pline(str) {
    void str;
    throw new Error('deliver_by_pline: not ported yet');
}

// C ref: questpgr.c skip_pager()
function skip_pager(common) {
    void common;
    /* WIZKIT: suppress plot feedback if starting with quest artifact */
    if (game.program_state?.wizkit_wishing)
        return true;
    return false;
}

// C ref: questpgr.c com_pager_core()
// The Lua stack walk (lua_getglobal/lua_getfield) is done as table lookups
// on the state's globals.
async function com_pager_core(section, msgid, showerror) {
    const howtoput = [ "pline", "window", "text", "menu", "default" ];
    const howtoput2i = [ 1, 2, 2, 3, 0, 0 ];
    let output;
    let L = null;
    let text = null, synopsis = null, fallback_msgid = null;
    let res = false;
    const sbi = { flags: NHL_SB_SAFE, memlimit: 1 * 1024 * 1024, steps: 0,
                  perpcall: 1 * 1024 * 1024 };

    if (skip_pager(true))
        return false;

    compagerdone: {
        L = nhl_init(sbi);
        if (!L) {
            if (showerror)
                impossible("com_pager: nhl_init() failed");
            break compagerdone;
        }

        if (!nhl_loadlua(L, QTEXT_FILE)) {
            if (showerror)
                impossible(`com_pager: ${QTEXT_FILE} not found.`);
            break compagerdone;
        }

        const questtext = L.globals.questtext;
        if (!questtext || typeof questtext !== 'object') {
            if (showerror)
                impossible(`com_pager: questtext in ${QTEXT_FILE} is not a lua table`);
            break compagerdone;
        }

        const sect = questtext[section];
        if (!sect || typeof sect !== 'object') {
            if (showerror)
                impossible(`com_pager: questtext[${section}] in ${QTEXT_FILE} is not a lua table`);
            break compagerdone;
        }

        let msg;
        for (;;) { /* tryagain: */
            msg = sect[fallback_msgid ? fallback_msgid : msgid];
            if (!msg || typeof msg !== 'object') {
                if (!fallback_msgid) {
                    /* Do we have questtxt[msg_fallbacks][<msgid>]? */
                    const fb = questtext.msg_fallbacks;
                    if (fb && typeof fb === 'object') {
                        fallback_msgid = fb[msgid] || null;
                        if (fallback_msgid)
                            continue; /* goto tryagain */
                    }
                }
                if (showerror) {
                    if (!fallback_msgid)
                        impossible(`com_pager: questtext[${section}][${msgid}] in ${QTEXT_FILE} is not a lua table`);
                    else
                        impossible(`com_pager: questtext[${section}][${msgid}] and [][${fallback_msgid}] in ${QTEXT_FILE} are not lua tables`);
                }
                break compagerdone;
            }
            break;
        }

        text = (typeof msg.text === 'string') ? msg.text : null;
        synopsis = (typeof msg.synopsis === 'string') ? msg.synopsis : null;
        const oidx = howtoput.indexOf(msg.output ?? "default");
        output = howtoput2i[oidx < 0 ? howtoput.length : oidx];

        if (!text) {
            const nelems = Array.isArray(msg) ? msg.length : 0;

            if (nelems < 2) {
                if (showerror)
                    impossible(`com_pager: questtext[${section}][${fallback_msgid ? fallback_msgid : msgid}] in ${QTEXT_FILE} is not an array of strings`);
                break compagerdone;
            }
            text = msg[rn2(nelems)]; /* Lua index rn2(nelems) + 1 */
        }

        /* switch from by_pline to by_window if line has multiple segments or
           is unreasonably long */
        if (output === 0 && (text.includes('\n') || text.length >= 256 - 1)) {
            output = 2;
            if (!synopsis)
                synopsis = `[${text}]`.replace(/\n/g, ' ');
        }

        if (output === 0 || output === 1)
            deliver_by_pline(text);
        else
            await deliver_by_window(text, (output === 3) ? NHW_MENU : NHW_TEXT);

        /* synopsis: convert_line() + putmsghistory() for ^P recall -- not
           ported yet */
        res = true;
    }
    if (L)
        nhl_done(L);
    return res;
}

// C ref: questpgr.c com_pager()
export async function com_pager(msgid) {
    await com_pager_core("common", msgid, true);
}
