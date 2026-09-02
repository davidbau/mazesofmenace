// questpgr.js — the quest/common text pager.
// C ref: src/questpgr.c
//
// newgame() calls com_pager("legacy") when the `legacy` option is on, which it
// is by default, and that is the "It is written in the Book of <god>" screen
// every new game opens with. Two things about it are easy to get wrong:
//
//   * The window is an NHW_MENU, because quest.lua says `output = "menu"` for
//     this entry — but it is filled with putstr(), so cw->data is set and
//     wintty.c renders it through process_text_window(). It is a menu for the
//     purpose of geometry (it insets, and its footer sits under the text) and a
//     text window for the purpose of drawing (leading space, "--More--").
//   * nhl_init() creates a Lua state, and every Lua state costs rn2(3), rn2(2)
//     from nhlib.lua's shuffle(align) — see js/nhlua.js. That is the only PRNG
//     effect com_pager has when the entry carries a literal `text`; an entry
//     that is an ARRAY of strings additionally draws rn2(#array).

import { MSOUND } from './monst_data.js';
import { type_is_pname } from './mondata.js';
import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { nhl_init } from './nhlua.js';
import { questtext } from './quest_data.js';
import { genders } from './role_data.js';
import { rank_of } from './botl.js';
import { an, An, makeplural, makesingular } from './objnam.js';
import { s_suffix } from './hacklib.js';
import { mons } from './monst_data.js';
import { ART_ORB_OF_DETECTION, artifact_names } from './artilist_data.js';
import { A_LAWFUL, A_NEUTRAL, A_CHAOTIC, A_NONE, A_ORIGINAL,
         MIN_QUEST_LEVEL, M2_PNAME } from './const.js';
import {
    tty_create_nhwindow, tty_putstr, tty_display_nhwindow,
    tty_destroy_nhwindow, NHW_MENU, NHW_TEXT,
} from './tty/wintty.js';
import { xwaitforspace } from './tty/getline.js';

const Moloch = 'Moloch';

function note_unported(what) {
    (game.unported ||= new Set()).add(what);
}

// src/questpgr.c:67 is_quest_artifact() — the CURRENT role's quest artifact
// only; other roles' artifacts do not count. Pure state test, no draw.
export function is_quest_artifact(otmp) {
    return (otmp.oartifact ?? 0) === game.urole.questarti;
}

// include/obj.h any_quest_artifact(), every role's quest artifact occupies
// the contiguous artifact range beginning with the Orb of Detection.
export function any_quest_artifact(otmp) {
    return (otmp.oartifact ?? 0) >= ART_ORB_OF_DETECTION;
}

// src/pray.c:2530 align_gname() — a leading '_' marks a goddess and is not
// part of the name.
export function align_gname(alignment) {
    const urole = game.urole;
    let gnam;
    switch (alignment) {
    case A_NONE:    gnam = Moloch; break;
    case A_LAWFUL:  gnam = urole.lgod; break;
    case A_NEUTRAL: gnam = urole.ngod; break;
    case A_CHAOTIC: gnam = urole.cgod; break;
    default:        gnam = 'someone'; break;
    }
    return gnam[0] === '_' ? gnam.slice(1) : gnam;
}

// src/pray.c:2628 align_gtitle()
export function align_gtitle(alignment) {
    const urole = game.urole;
    let gnam;
    switch (alignment) {
    case A_LAWFUL:  gnam = urole.lgod; break;
    case A_NEUTRAL: gnam = urole.ngod; break;
    case A_CHAOTIC: gnam = urole.cgod; break;
    default:        gnam = null; break;
    }
    return (gnam && gnam[0] === '_') ? 'goddess' : 'god';
}

// src/insight.c:3187 align_str()
function align_str(alignment) {
    switch (alignment) {
    case A_CHAOTIC: return 'chaotic';
    case A_NEUTRAL: return 'neutral';
    case A_LAWFUL:  return 'lawful';
    case A_NONE:    return 'unaligned';
    default:        return 'unknown';
    }
}


function monname(idx) {
    /* C reads mons[i].pmnames[NEUTRAL] — index 2; the male/female slots are
       null for ungendered monsters like Pelias */
    const pm = mons[idx];
    return (type_is_pname(pm) ? '' : 'the ')
           + (pm.pmnames[2] ?? pm.pmnames[0] ?? pm.pmnames[1]);
}

// src/questpgr.c:50 ldrname(), :121 neminame(), :131 guardname()
function ldrname() { return monname(game.urole.ldrnum); }
function neminame() { return monname(game.urole.neminum); }
function guardname() {
    const pm = mons[game.urole.guardnum];
    return pm.pmnames[2] ?? pm.pmnames[0] ?? pm.pmnames[1];
}
function intermed() { return game.urole.intermed; }
function homebase() { return game.urole.homebase; }

// src/questpgr.c:236 convert_arg()
let cvt_buf = '';

function convert_arg(c) {
    const u = game.u, urole = game.urole, flags = game.flags;
    let str;

    switch (c) {
    case 'p': str = game.plname; break;
    case 'c': str = (flags.female && urole.name.f) ? urole.name.f
                                                  : urole.name.m; break;
    case 'r': str = rank_of(u.ulevel, urole, flags.female); break;
    case 'R': str = rank_of(MIN_QUEST_LEVEL, urole, flags.female); break;
    case 's': str = flags.female ? 'sister' : 'brother'; break;
    case 'S': str = flags.female ? 'daughter' : 'son'; break;
    case 'l': str = ldrname(); break;
    case 'i': str = intermed(); break;
    case 'O': case 'o':
        str = artifact_names[urole.questarti] || '';
        if (/^The /i.test(str))
            str = 'the ' + str.slice(4);
        else
            str = 'the ' + str;
        if (c === 'O') {
            const of = str.toLowerCase().indexOf(' of ');
            if (of >= 0)
                str = str.slice(0, of);
        }
        break;
    case 'n': str = neminame(); break;
    case 'g': str = guardname(); break;
    case 'G': str = align_gtitle(u.ualignbase[A_ORIGINAL]); break;
    case 'H': str = homebase(); break;
    case 'a': str = align_str(u.ualignbase[A_ORIGINAL]); break;
    case 'A': str = align_str(u.ualign.type); break;
    case 'd': str = align_gname(u.ualignbase[A_ORIGINAL]); break;
    case 'D': str = align_gname(A_LAWFUL); break;
    case 'C': str = 'chaotic'; break;
    case 'N': str = 'neutral'; break;
    case 'L': str = 'lawful'; break;
    case 'x': str = 'see'; break;      /* Blind ? "sense" : "see" */
    case 'Z': str = game.dungeons[0].dname; break;
    case '%': str = '%'; break;
    default:  str = ''; break;
    }
    cvt_buf = String(str ?? '');
}

// src/questpgr.c:199 qtext_pronoun() — the %dh/%di/%dj forms and their leader,
// nemesis and artifact variants.
//
//   who:   'd' deity, 'l' leader, 'n' nemesis, 'o' artifact
//   which: 'h'|'i'|'j' for subject/object/possessive, uppercase to capitalise
//
// An invalid subject yields the neuter, singular result — index 2 — which is
// what makes the default arm safe.
function qtext_pronoun(who, which) {
    let pnoun;
    const lwhich = which.toLowerCase(); /* H,I,J -> h,i,j */

    /* For %o, ordinary artifacts are neuter singular. Only names which
       makesingular() changes, plus the special "Eyes" name, use plural
       pronouns. cvt_buf still holds the expanded artifact name here. */
    const pluralArtifact = who === 'o'
        && (cvt_buf.toLowerCase().includes('eyes ')
            || cvt_buf.toLowerCase() !== makesingular(cvt_buf).toLowerCase());
    if (pluralArtifact) {
        pnoun = (lwhich === 'h') ? 'they'
              : (lwhich === 'i') ? 'them'
              : (lwhich === 'j') ? 'their' : '?';
    } else {
        const godgend = (who === 'd') ? (game.quest_godgend ?? 2)
                      : (who === 'l') ? (game.quest_ldrgend ?? 2)
                      : (who === 'n') ? (game.quest_nemgend ?? 2)
                      : 2; /* default to neuter */
        const g = genders[godgend] || genders[2];
        pnoun = (lwhich === 'h') ? g.he
              : (lwhich === 'i') ? g.him
              : (lwhich === 'j') ? g.his : '?';
    }
    cvt_buf = pnoun;
    /* capitalize for H,I,J */
    if (lwhich !== which)
        cvt_buf = cvt_buf.charAt(0).toUpperCase() + cvt_buf.slice(1);
    return cvt_buf;
}

// src/questpgr.c:327 convert_line() — expands the %-codes of ONE line and
// stops at the first newline, which is how deliver_by_window() splits the
// message into rows.
function convert_line(in_line) {
    let out = '';
    for (let i = 0; i < in_line.length; i++) {
        const ch = in_line[i];
        if (ch === '\r' || ch === '\n')
            return out;
        if (ch === '%' && i + 1 < in_line.length) {
            convert_arg(in_line[++i]);
            const mod = in_line[++i];
            switch (mod) {
            case 'A': out += An(cvt_buf); continue;
            case 'a': out += an(cvt_buf); continue;
            case 'C':
                cvt_buf = cvt_buf.charAt(0).toUpperCase() + cvt_buf.slice(1);
                break;
            case 'h': case 'H': case 'i': case 'I': case 'j': case 'J':
                if ('dlno'.includes(in_line[i - 1].toLowerCase()))
                    qtext_pronoun(in_line[i - 1], mod);
                else
                    --i;                       /* default action */
                break;
            case 'P':
                cvt_buf = cvt_buf.charAt(0).toUpperCase() + cvt_buf.slice(1);
                /* FALLTHRU */
            case 'p':
                cvt_buf = makeplural(cvt_buf);
                break;
            case 'S':
                cvt_buf = cvt_buf.charAt(0).toUpperCase() + cvt_buf.slice(1);
                /* FALLTHRU */
            case 's':
                cvt_buf = s_suffix(cvt_buf);
                break;
            case 't':
                if (/^the /i.test(cvt_buf)) {
                    out += cvt_buf.slice(4);
                    continue;
                }
                break;
            default:
                --i;                           /* undo switch increment */
                break;
            }
            out += cvt_buf;
            continue;
        }
        out += ch;
    }
    return out;
}

// src/questpgr.c:423 deliver_by_pline() — one pline per newline-separated
// line, each through convert_line()'s %-code expansion.
async function deliver_by_pline(str) {
    const { pline } = await import('./display.js');
    for (const line of String(str).split('\n'))
        await pline(convert_line(line));
}

// src/questpgr.c:655 deliver_splev_message() — special levels can include a
// custom arrival message (des.message); display it once, then discard it.
export async function deliver_splev_message() {
    if (game.lev_message) {
        await deliver_by_pline(game.lev_message);
        game.lev_message = null;
    }
}

// src/questpgr.c:438 deliver_by_window()
async function deliver_by_window(msg, how) {
    const win = tty_create_nhwindow(how);
    for (const line of msg.split('\n'))
        tty_putstr(win, 0, convert_line(line));

    await tty_display_nhwindow(win);
    /* display_nhwindow(win, TRUE) blocks in dmore() until a key arrives; the
       recorder captures the frame at that read. dmore() accepts quitchars,
       not every key, so control and command keys leave the page open. */
    await xwaitforspace(' \r\n\x1b');
    tty_destroy_nhwindow(win);
}

// src/questpgr.c:468 com_pager_core()
//
// "pline"/"window"/"text"/"menu"/"default" map to 1/2/2/3/0, and an entry with
// no explicit output that contains a newline is promoted from pline to window.
const HOWTOPUT2I = { pline: 1, window: 2, text: 2, menu: 3, default: 0 };

export async function com_pager_core(section, msgid, showerror) {
    /* nhl_init() — the Lua state, and its rn2(3), rn2(2) */
    nhl_init();

    const sect = questtext[section];
    if (!sect) return false;

    let entry = sect[msgid];
    if (!entry) {
        /* questtext[msg_fallbacks][msgid] */
        const fb = questtext.msg_fallbacks?.[msgid];
        if (fb) entry = sect[fb];
        if (!entry) return false;
    }

    let text = Array.isArray(entry) ? null : entry.text;
    const synopsis = Array.isArray(entry) ? null : entry.synopsis;
    let output = HOWTOPUT2I[Array.isArray(entry) ? 'default'
                                                 : (entry.output ?? 'default')];

    if (text == null) {
        /* an array of alternatives; the pick is a real PRNG draw */
        const list = Array.isArray(entry) ? entry
                   : Object.keys(entry).filter(k => /^\d+$/.test(k))
                           .map(k => entry[k]);
        if (list.length < 2) return false;
        text = list[rn2(list.length)];
    }

    if (output === 0 && text.includes('\n'))
        output = 2;

    if (output === 0 || output === 1) {
        await deliver_by_pline(text);
    } else {
        await deliver_by_window(text, (output === 3) ? NHW_MENU : NHW_TEXT);
    }

    /* the synopsis goes to putmsghistory(), which never reaches the screen */
    if (synopsis) convert_line(synopsis);
    return true;
}

// src/questpgr.c:624 com_pager()
export async function com_pager(msgid) {
    return com_pager_core('common', msgid, true);
}

// src/questpgr.c:630 qt_pager()
export async function qt_pager(msgid) {
    if (!await com_pager_core(game.urole.filecode, msgid, false))
        return com_pager_core('common', msgid, true);
    return true;
}

// src/questpgr.c:150 stinky_nemesis(), inspect the raw death text without
// displaying it. Loading quest.lua still creates a Lua state and consumes its
// two alignment-shuffle draws.
export function stinky_nemesis() {
    nhl_init();
    const section = questtext[game.urole.filecode];
    let entry = section?.killed_nemesis;
    if (!entry) {
        const fallback = questtext.msg_fallbacks?.killed_nemesis;
        if (fallback)
            entry = section?.[fallback];
    }
    const text = Array.isArray(entry) ? null : entry?.text;
    if (!text)
        return false;

    const flat = text.replace(/\n/g, ' ').toLowerCase();
    const starts = ['noxious', 'poisonous', 'toxic']
        .map(word => flat.indexOf(word)).filter(pos => pos >= 0);
    if (!starts.length)
        return false;
    const tail = flat.slice(Math.min(...starts));
    return tail.includes(' gas') || tail.includes(' fumes');
}

// src/questpgr.c:637 qt_montype() — the quest branch's biased random
// monster: usually one of the role's two signature enemies, otherwise a
// random member of that enemy's class.
export function qt_montype() {
    let qpm;

    if (rn2(5)) {
        qpm = pmIndex(game.urole.enemy1num);
        if (qpm !== -1 && rn2(5)
            && !((game.mvitals?.[qpm]?.mvflags ?? 0) & 0x02 /* G_GENOD */))
            return game.mons[qpm];
        return mkclass_fn ? mkclass_fn(game.urole.enemy1sym, 0) : null;
    }
    qpm = pmIndex(game.urole.enemy2num);
    if (qpm !== -1 && rn2(5)
        && !((game.mvitals?.[qpm]?.mvflags ?? 0) & 0x02 /* G_GENOD */))
        return game.mons[qpm];
    return mkclass_fn ? mkclass_fn(game.urole.enemy2sym, 0) : null;
}

/* enemy1num in the generated role table may be a PM_ name or an index */
function pmIndex(v) {
    if (typeof v === 'number') return v;
    return -1;
}

/* makemon.js imports qt_montype from here; mkclass comes back through this
   wire to avoid the import cycle. */
let mkclass_fn = null;
export function questpgr_wire_mkclass(fn) { mkclass_fn = fn; }

// src/questpgr.c:31 quest_info(); the role's quest leader/nemesis/guardian
// monster index, or the quest artifact for typ 0
export function quest_info(typ) {
    switch (typ) {
    case 0:
        return game.urole.questarti;
    case MSOUND.MS_LEADER:
        return game.urole.ldrnum;
    case MSOUND.MS_NEMESIS:
        return game.urole.neminum;
    case MSOUND.MS_GUARDIAN:
        return game.urole.guardnum;
    default:
        /* impossible("quest_info(%d)", typ) */
        break;
    }
    return 0;
}
