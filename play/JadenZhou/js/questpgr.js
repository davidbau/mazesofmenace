// questpgr.js — quest and common pager messages.
// C ref: questpgr.c — skip_pager, com_pager_core, com_pager.
//
// Not ported yet: convert_line()/convert_arg() text substitution,
// deliver_by_pline(), and deliver_by_window()'s tty text window
// (wintty.c process_text_window()), so the text is looked up but not
// shown; qt_pager(), qt_montype() and the quest status code.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { NHL_SB_SAFE } from './const.js';
import { nhl_init, nhl_loadlua, nhl_done } from './nhlua.js';

const QTEXT_FILE = 'quest.lua';

function impossible(msg) { console.error(`impossible: ${msg}`); }

// C ref: questpgr.c deliver_by_window()
// The tty text window (create_nhwindow(how), putstr() of each
// convert_line()d line, display_nhwindow(datawin, TRUE)) is not ported yet.
function deliver_by_window(msg, how) {
    void msg, how;
}

// C ref: questpgr.c deliver_by_pline() -- not ported yet (needs
// convert_line())
function deliver_by_pline(str) {
    void str;
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
function com_pager_core(section, msgid, showerror) {
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
            deliver_by_window(text, (output === 3) ? 'NHW_MENU' : 'NHW_TEXT');

        /* synopsis: convert_line() + putmsghistory() for ^P recall -- not
           ported yet */
        res = true;
    }
    if (L)
        nhl_done(L);
    return res;
}

// C ref: questpgr.c com_pager()
export function com_pager(msgid) {
    com_pager_core("common", msgid, true);
}
