// questpgr.js — quest and common pager messages.
// C ref: questpgr.c — quest_info, ldrname, intermed, is_quest_artifact,
// find_qarti, find_quest_artifact, neminame, guardname, homebase,
// stinky_nemesis, qtext_pronoun, convert_arg, convert_line,
// deliver_by_pline, deliver_by_window, skip_pager, com_pager_core,
// com_pager, qt_pager, deliver_splev_message.
// qt_montype() lives in makemon.js (its only caller).

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { NHL_SB_SAFE } from './const.js';
import { nhl_init, nhl_loadlua, nhl_done, get_table_str_opt,
         get_table_option, lua_istable } from './nhlua.js';
import { NHW_TEXT, NHW_MENU, A_ORIGINAL, A_LAWFUL, NEUTRAL, OBJ_INVENT,
         OBJ_FLOOR, OBJ_MINVENT, OBJ_MIGRATING, OBJ_BURIED } from './const.js';
import { tty_create_nhwindow, tty_putstr, tty_display_nhwindow,
         tty_destroy_nhwindow, tty_putmsghistory } from './wintty.js';
import { pline } from './display.js';
import { rank_of } from './botl.js';
import { align_gname, align_gtitle } from './pray.js';
import { align_str } from './insight.js';
import { an, makeplural, makesingular } from './objnam.js';
import { the } from './iactions.js';
import { artiname } from './artifact.js';
import { genders } from './role.js';
import { mons, M2_PNAME, MS_LEADER, MS_NEMESIS, MS_GUARDIAN } from './monsters.js';
import { highc, lowc, s_suffix, strncmpi, strcmpi, strstri } from './hacklib.js';

const QTEXT_FILE = 'quest.lua';
const BUFSZ = 256;

function impossible(msg) { console.error(`impossible: ${msg}`); }

// C ref: you.h MIN_QUEST_LEVEL
const MIN_QUEST_LEVEL = 14;

// C ref: mondata.h type_is_pname()
function type_is_pname(ptr) { return (ptr.mflags2 & M2_PNAME) !== 0; }

// object chains are either linked through ->nobj (invent) or kept as
// arrays (fobj, minvent, cobj, buriedobjlist)
function* objchain(ochain) {
    if (Array.isArray(ochain)) {
        yield* ochain;
    } else {
        for (let otmp = ochain; otmp; otmp = otmp.nobj)
            yield otmp;
    }
}

// C ref: questpgr.c quest_info()
export function quest_info(typ) {
    switch (typ) {
    case 0:
        return game.urole.questarti;
    case MS_LEADER:
        return game.urole.ldrnum;
    case MS_NEMESIS:
        return game.urole.neminum;
    case MS_GUARDIAN:
        return game.urole.guardnum;
    default:
        impossible(`quest_info(${typ})`);
    }
    return 0;
}

// C ref: questpgr.c ldrname()
/* return your role leader's name */
export function ldrname() {
    const i = game.urole.ldrnum;

    game.nambuf = `${type_is_pname(mons[i]) ? "" : "the "}${
        mons[i].pmnames[NEUTRAL]}`;
    return game.nambuf;
}

// C ref: questpgr.c intermed()
/* return your intermediate target string */
function intermed() {
    return game.urole.intermed;
}

// C ref: questpgr.c is_quest_artifact()
export function is_quest_artifact(otmp) {
    return otmp.oartifact === game.urole.questarti;
}

// C ref: questpgr.c find_qarti()
function find_qarti(ochain) {
    let qarti;

    for (const otmp of objchain(ochain)) {
        if (is_quest_artifact(otmp))
            return otmp;
        if (otmp.cobj /* Has_contents(otmp) */
            && (qarti = find_qarti(otmp.cobj)) !== null)
            return qarti;
    }
    return null;
}

// C ref: questpgr.c find_quest_artifact()
/* check several object chains for the quest artifact to determine
   whether it is present on the current level */
export function find_quest_artifact(whichchains) {
    const g = game;
    let qarti = null;

    if ((whichchains & (1 << OBJ_INVENT)) !== 0)
        qarti = find_qarti(g.invent);
    if (!qarti && (whichchains & (1 << OBJ_FLOOR)) !== 0)
        qarti = find_qarti(g.level.objects);
    if (!qarti && (whichchains & (1 << OBJ_MINVENT)) !== 0)
        for (let mtmp = g.fmon; mtmp; mtmp = mtmp.nmon) {
            if (mtmp.mhp <= 0) /* DEADMONSTER(mtmp) */
                continue;
            if ((qarti = find_qarti(mtmp.minvent)) !== null)
                break;
        }
    if (!qarti && (whichchains & (1 << OBJ_MIGRATING)) !== 0) {
        /* check migrating objects and minvent of migrating monsters */
        for (const mtmp of objchain(g.migrating_mons)) {
            if (mtmp.mhp <= 0) /* DEADMONSTER(mtmp) */
                continue;
            if ((qarti = find_qarti(mtmp.minvent)) !== null)
                break;
        }
        if (!qarti)
            qarti = find_qarti(g.migrating_objs);
    }
    if (!qarti && (whichchains & (1 << OBJ_BURIED)) !== 0)
        qarti = find_qarti(g.level.buriedobjlist);

    return qarti;
}

// C ref: questpgr.c neminame()
/* return your role nemesis' name */
function neminame() {
    const i = game.urole.neminum;

    game.nambuf = `${type_is_pname(mons[i]) ? "" : "the "}${
        mons[i].pmnames[NEUTRAL]}`;
    return game.nambuf;
}

// C ref: questpgr.c guardname()
function guardname() { /* return your role leader's guard monster name */
    const i = game.urole.guardnum;

    return mons[i].pmnames[NEUTRAL];
}

// C ref: questpgr.c homebase()
function homebase() { /* return your role leader's location */
    return game.urole.homebase;
}

// C ref: questpgr.c stinky_nemesis()
/* returns 1 if nemesis death message mentions noxious fumes, otherwise 0;
   does not display the message */
export async function stinky_nemesis(mon) {
    const mesg = { text: null };
    let res = 0;

    void mon;
    /* since nemdead() just gave the message for hero's nemesis even if 'mon'
       is some other role's nemesis (feasible in wizard mode), base any gas
       cloud on the text that was shown even if not appropriate for 'mon' */
    await com_pager_core(game.urole.filecode, "killed_nemesis", false, mesg);

    /* this is somewhat fragile; it assumes that when both {noxious or
       poisonous or toxic} and {gas or fumes} are present, the latter
       refers to the former rather than to something unrelated; it does
       make sure that fumes occurs after noxious rather than before */
    if (mesg.text) {
        /* change newlines into spaces to cope with "...noxious\nfumes..." */
        const m = mesg.text.replace(/\n/g, " ");
        let p;

        if (((p = strstri(m, "noxious")) >= 0
             || (p = strstri(m, "poisonous")) >= 0
             || (p = strstri(m, "toxic")) >= 0)
            && (strstri(m.slice(p), " gas") >= 0
                || strstri(m.slice(p), " fumes") >= 0))
            res = 1;
    }
    return res;
}

// C ref: questpgr.c qtext_pronoun()
/* replace deity, leader, nemesis, or artifact name with pronoun;
   overwrites cvt_buf[] */
function qtext_pronoun(
    who,   /* 'd' => deity, 'l' => leader, 'n' => nemesis, 'o' => arti */
    which) /* 'h'|'H'|'i'|'I'|'j'|'J' */
{
    const g = game;
    let pnoun;
    const lwhich = lowc(which); /* H,I,J -> h,i,j */

    /*
     * Invalid subject (not d,l,n,o) yields neuter, singular result.
     *
     * For %o, treat all artifacts as neuter; some have plural names,
     * which genders[] doesn't handle; cvt_buf[] already contains name.
     */
    if (who === 'o'
        && (strstri(g.cvt_buf, "Eyes ") >= 0
            || strcmpi(g.cvt_buf, makesingular(g.cvt_buf)))) {
        pnoun = (lwhich === 'h') ? "they"
                : (lwhich === 'i') ? "them"
                : (lwhich === 'j') ? "their" : "?";
    } else {
        const godgend = (who === 'd') ? g.quest_status.godgend
            : (who === 'l') ? g.quest_status.ldrgend
            : (who === 'n') ? g.quest_status.nemgend
            : 2; /* default to neuter */
        pnoun = (lwhich === 'h') ? genders[godgend].he
                : (lwhich === 'i') ? genders[godgend].him
                : (lwhich === 'j') ? genders[godgend].his : "?";
    }
    g.cvt_buf = pnoun;
    /* capitalize for H,I,J */
    if (lwhich !== which)
        g.cvt_buf = highc(g.cvt_buf[0]) + g.cvt_buf.slice(1);
    return;
}

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
    case 'l':
        str = ldrname();
        break;
    case 'i':
        str = intermed();
        break;
    case 'O':
    case 'o':
        str = the(artiname(g.urole.questarti));
        if (c === 'O') {
            /* shorten "the Foo of Bar" to "the Foo"
               (buffer returned by the() is modifiable) */
            const p = strstri(str, " of ");

            if (p >= 0)
                str = str.slice(0, p);
        }
        break;
    case 'n':
        str = neminame();
        break;
    case 'g':
        str = guardname();
        break;
    case 'G':
        str = align_gtitle(g.u.ualignbase[A_ORIGINAL]);
        break;
    case 'H':
        str = homebase();
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
                case 'h': /* he/she */
                case 'H': /* He/She */
                case 'i': /* him/her */
                case 'I':
                case 'j': /* his/her */
                case 'J':
                    if ("dlno".includes(lowc(in_line[c - 1])))
                        qtext_pronoun(in_line[c - 1], in_line[c]);
                    else
                        --c; /* default action */
                    break;

                /* pluralize */
                case 'P':
                    g.cvt_buf = highc(g.cvt_buf[0] || '') + g.cvt_buf.slice(1);
                    /*FALLTHRU*/
                case 'p':
                    g.cvt_buf = makeplural(g.cvt_buf);
                    break;

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

// C ref: hacklib.c copynchars()
/* copy at most n chars, stopping at newline */
function copynchars(src, from, n) {
    let end = from;

    while (n > 0 && end < src.length && src[end] !== '\n') {
        end++;
        --n;
    }
    return src.slice(from, end);
}

// C ref: questpgr.c deliver_by_pline()
async function deliver_by_pline(str) {
    let msgp = 0;
    const msgend = str.length;

    while (msgp < msgend) {
        /* copynchars() will stop at newline if it finds one */
        const in_line = copynchars(str, msgp, BUFSZ - 1);
        msgp += in_line.length + 1;

        const out_line = convert_line(in_line);
        await pline(out_line);
    }
}

// C ref: questpgr.c deliver_by_window()
async function deliver_by_window(msg, how) {
    let msgp = 0;
    const msgend = msg.length;
    const datawin = tty_create_nhwindow(how);

    while (msgp < msgend) {
        /* copynchars() will stop at newline if it finds one */
        const in_line = copynchars(msg, msgp, BUFSZ - 1);
        msgp += in_line.length + 1;

        const out_line = convert_line(in_line);
        await tty_putstr(datawin, 0, out_line);
    }

    await tty_display_nhwindow(datawin, true);
    await tty_destroy_nhwindow(datawin);
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
// on the state's globals. 'rawtext', when given, is an out-parameter
// object: rawtext.text receives the message's text (C: char **rawtext).
async function com_pager_core(section, msgid, showerror, rawtext) {
    const howtoput = [ "pline", "window", "text", "menu", "default", null ];
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
        if (!lua_istable(questtext)) {
            if (showerror)
                impossible(`com_pager: questtext in ${QTEXT_FILE} is not a lua table`);
            break compagerdone;
        }

        const sect = questtext[section];
        if (!lua_istable(sect)) {
            if (showerror)
                impossible(`com_pager: questtext[${section}] in ${QTEXT_FILE} is not a lua table`);
            break compagerdone;
        }

        let msg;
        for (;;) { /* tryagain: */
            msg = sect[fallback_msgid ? fallback_msgid : msgid];
            if (!lua_istable(msg)) {
                if (!fallback_msgid) {
                    /* Do we have questtxt[msg_fallbacks][<msgid>]? */
                    const fb = questtext.msg_fallbacks;
                    if (lua_istable(fb)) {
                        fallback_msgid = get_table_str_opt(fb, msgid, null);
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

        text = get_table_str_opt(msg, "text", null);
        if (rawtext) {
            rawtext.text = text; /* dupstr(text) */
            res = true;
            break compagerdone;
        }
        synopsis = get_table_str_opt(msg, "synopsis", null);
        output = howtoput2i[get_table_option(msg, "output", "default", howtoput)];

        if (!text) {
            /* lua_len(L, -1): the string array's border */
            let nelems = Array.isArray(msg) ? msg.length : 0;

            if (nelems < 2) {
                if (showerror)
                    impossible(`com_pager: questtext[${section}][${fallback_msgid ? fallback_msgid : msgid}] in ${QTEXT_FILE} is not an array of strings`);
                break compagerdone;
            }
            nelems = rn2(nelems) + 1;
            text = msg[nelems - 1]; /* Lua index nelems */
        }

        /* switch from by_pline to by_window if line has multiple segments or
           is unreasonably long (the latter ought to checked after formatting
           conversions rather than before...) */
        if (output === 0 && (text.includes('\n') || text.length >= BUFSZ - 1)) {
            output = 2;

            /*
             * FIXME:  should update quest.lua to include proper synopsis line
             * for any item subject to having its delivery converted to by_window.
             */
            if (!synopsis) {
                /* Sprintf(tmpbuf, "[%.*s]", BUFSZ - 1 - 2, text);
                   change every newline character to a space */
                synopsis = `[${text.slice(0, BUFSZ - 1 - 2)}]`.replace(/\n/g, ' ');
            }
        }

        if (output === 0 || output === 1)
            await deliver_by_pline(text);
        else
            await deliver_by_window(text, (output === 3) ? NHW_MENU : NHW_TEXT);

        if (synopsis) {
            const in_line = synopsis;
            const out_line = convert_line(in_line);
            /* bypass message delivery but be available for ^P recall */
            tty_putmsghistory(out_line, false);
        }
        res = true;
    }
    if (L)
        nhl_done(L);
    return res;
}

// C ref: questpgr.c com_pager()
export async function com_pager(msgid) {
    await com_pager_core("common", msgid, true, null);
}

// C ref: questpgr.c qt_pager()
export async function qt_pager(msgid) {
    if (!await com_pager_core(game.urole.filecode, msgid, false, null))
        await com_pager_core("common", msgid, true, null);
}

// C ref: questpgr.c deliver_splev_message()
/* special levels can include a custom arrival message; display it */
export async function deliver_splev_message() {
    /* there's no provision for delivering via window instead of pline */
    if (game.lev_message) {
        await deliver_by_pline(game.lev_message);

        game.lev_message = null;
    }
}
