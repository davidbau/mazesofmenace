// rumors.js — random lines from the dat/ text files.
// C ref: src/rumors.c, plus get_rnd_line()/get_rnd_text()/xcrypt()/unpadline().
//
// This exists because of the PRNG, not because of the text. get_rnd_line()
// picks a random *byte offset* into a file range and reads forward to the next
// line; if that line is longer than the pad length it draws again, up to ten
// times. So the number of draws depends on the actual bytes in dat/rumors,
// which is why js/dat_files.js embeds them verbatim.
//
// Verified against seed8000 calls 1632-1634: getrumor(0, ..., TRUE) draws
// rn2(2) for the truth coin and then rn2(25762) twice — 25762 being
// false_rumor_size straight out of the file's own header.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { rumors, engrave, epitaph, bogusmon, oracles, tribute, RUMOR_RANGES } from './dat_files.js';
import { pline } from './display.js';
import { exercise } from './attrib.js';
import { A_WIS, BY_ORACLE, BY_COOKIE, BY_PAPER } from './const.js';
import { is_fainted } from './eat.js';
import { verbalize } from './pline.js';
import { rnd } from './rng.js';
import { tty_create_nhwindow } from './tty/wintty.js';
import { tty_putstr } from './tty/wintty.js';
import { tty_display_nhwindow } from './tty/wintty.js';
import { tty_destroy_nhwindow, tty_next_page } from './tty/wintty.js';
import { xwaitforspace } from './tty/getline.js';
import { NHW_TEXT } from './const.js';
import { money_cnt } from './invent.js';
import { currency } from './invent.js';
import { There } from './pline.js';
import { You } from './pline.js';
import { Monnam } from './do_name.js';
import { tty_yn_function } from './tty/topl.js';
import { money2mon } from './shk.js';
import { record_achievement } from './insight.js';
import { ACH_ORCL } from './const.js';
import { more_experienced } from './exper.js';
import { newexplevel } from './exper.js';
import { ECMD_OK } from './const.js';
import { ECMD_TIME } from './const.js';
import { impossible } from './pline.js';
import { display_nhwindow_message } from './display.js';

// include/global.h:41
export const MD_PAD_RUMORS = 60;

const FILES = { rumors, engrave, epitaph, bogusmon, oracles, tribute };

// A dlb file handle over an in-memory string. Byte offset == string index,
// which tools/gen-datafiles.mjs asserts by rejecting non-ASCII input.
export function dlb_fopen(name) {
    const text = FILES[name];
    if (text === undefined)
        throw new Error(`dlb_fopen: no embedded data file "${name}"`);
    return { text, pos: 0 };
}

export function dlb_fseek(fh, off, whence = 'SET') {
    fh.pos = whence === 'END' ? fh.text.length + off
           : whence === 'CUR' ? fh.pos + off
           : off;
}

export const dlb_ftell = (fh) => fh.pos;

// Reads through the next newline inclusive, as C's fgets does. Returns null at
// end of file so callers can reproduce C's `!dlb_fgets(...)` test.
export function dlb_fgets(fh) {
    if (fh.pos >= fh.text.length)
        return null;
    const nl = fh.text.indexOf('\n', fh.pos);
    const end = nl < 0 ? fh.text.length : nl + 1;
    const line = fh.text.slice(fh.pos, end);
    fh.pos = end;
    return line;
}

// src/hacklib.c xcrypt() — the reversible obfuscation makedefs applies.
export function xcrypt(str) {
    let bitmask = 1, out = '';
    for (let i = 0; i < str.length; i++) {
        let c = str.charCodeAt(i);
        if (c & (32 | 64))
            c ^= bitmask;
        out += String.fromCharCode(c);
        if ((bitmask <<= 1) >= 32)
            bitmask = 1;
    }
    return out;
}

// src/hacklib.c unpadline() — strip the trailing '_' padding makedefs adds.
function unpadline(line) {
    let p = line.length;
    if (p > 0 && line[p - 1] === '\n') --p;
    while (p > 0 && line[p - 1] === '_') --p;
    return line.slice(0, p);
}

// src/rumors.c get_rnd_line()
//
// `endpos` of 0 means end-of-file. The retry loop is the part that matters for
// the RNG: a landing whose line is longer than padlength + 1 is rejected and
// redrawn, so long lines cost extra calls.
export function get_rnd_line(fh, rng, startpos, endpos, padlength) {
    let buf = '';

    if (!endpos) {
        dlb_fseek(fh, 0, 'END');
        endpos = dlb_ftell(fh);
    }
    const filechunksize = endpos - startpos;
    if (filechunksize < 1)
        return '';

    for (let trylimit = 10; trylimit > 0; --trylimit) {
        const chunkoffset = rng(filechunksize);
        dlb_fseek(fh, startpos + chunkoffset);
        buf = dlb_fgets(fh) ?? '';
        if (!padlength || buf.length <= padlength + 1)
            break;
    }

    /* use the *next* line; reaching endpos counts as end-of-file so a seek
       into the last true rumor does not return the first false one */
    if (dlb_ftell(fh) >= endpos) {
        dlb_fseek(fh, startpos);
        buf = dlb_fgets(fh) ?? '';
    } else {
        const next = dlb_fgets(fh);
        if (next === null) {
            dlb_fseek(fh, startpos);
            buf = dlb_fgets(fh) ?? '';
        } else {
            buf = next;
        }
    }

    const nl = buf.indexOf('\n');
    if (nl >= 0) buf = buf.slice(0, nl);
    buf = xcrypt(buf);
    if (padlength) buf = unpadline(buf);
    return buf;
}

// src/rumors.c get_rnd_text()
export function get_rnd_text(fname, rng, padlength) {
    const fh = dlb_fopen(fname);
    /* skip the "don't edit" comment, then start from wherever that left us */
    dlb_fgets(fh);
    const starttxt = dlb_ftell(fh);
    return get_rnd_line(fh, rng, starttxt, 0, padlength);
}

/* include/hack.h — quitchars */
const quitchars = ' \r\n\x1b';

const COOKIE_MARKER = '[cookie] ';

// src/rumors.c:118 getrumor()
//
//   input:      1    0   -1
//    rn2 \ +1  2=T  1=T  0=F
//    adj./ +0  1=T  0=F -1=F
export function getrumor(truth, exclude_cookie) {
    const fh = dlb_fopen('rumors');
    const R = RUMOR_RANGES;
    let rumor_buf = '';
    let count = 0;
    let adjtruth = 0;

    do {
        rumor_buf = '';
        adjtruth = truth + rn2(2);
        let beginning, ending;
        switch (adjtruth) {
        case 2:
        case 1:
            beginning = R.true_rumor_start;
            ending = R.true_rumor_end;
            break;
        default:   /* 0 and -1 both mean false */
            beginning = R.false_rumor_start;
            ending = R.false_rumor_end;
            break;
        }
        rumor_buf = get_rnd_line(fh, rn2, beginning, ending, MD_PAD_RUMORS);
    } while (count++ < 50 && exclude_cookie
             && rumor_buf.startsWith(COOKIE_MARKER));

    /* src/rumors.c:175 — "avoid exercising wisdom for graffiti"; the cookie
       and oracle paths land here with in_mklev false and DO draw the
       exercise rn2(19). */
    if (!game.in_mklev)
        exercise(A_WIS, adjtruth > 0);

    /* src/rumors.c:181 — a cookie-only rumor keeps its marker until it is
       actually delivered by a cookie */
    if (!exclude_cookie && rumor_buf.startsWith(COOKIE_MARKER))
        rumor_buf = rumor_buf.slice(COOKIE_MARKER.length);
    return rumor_buf;
}

// src/rumors.c:196 rumor_check() — the #wizrumorcheck listing: the rumor
// file's section offsets, the first and last true and false rumors, then
// the engraving, epitaph and bogus-monster files via others_check()
export async function rumor_check() {
    let tmpwin = null;
    let line, endp, l2;
    const R = RUMOR_RANGES;
    const chop = (str) => ((endp = str.indexOf('\n')) >= 0) ? str.slice(0, endp) : str;
    const d6 = (n) => String(n).padStart(6, '0');
    const x6 = (n) => (n >>> 0).toString(16).padStart(6, '0');

    const rumors = (R.true_rumor_size >= 0) ? dlb_fopen('rumors') : null;
    if (rumors) {
        let ftell_rumor_start = 0;
        let rumor_buf = '';

        /* if this is 1st outrumor(): init_rumors() reads the section
           offsets from the file's header; RUMOR_RANGES holds them here */
        tmpwin = tty_create_nhwindow(NHW_TEXT);

        /*
         * reveal the values.
         */
        rumor_buf = `T start=${d6(R.true_rumor_start)} (${x6(R.true_rumor_start)}), end=${
            d6(R.true_rumor_end)} (${x6(R.true_rumor_end)}), size=${
            d6(R.true_rumor_size)} (${x6(R.true_rumor_size)})`;
        tty_putstr(tmpwin, 0, rumor_buf);
        rumor_buf = `F start=${d6(R.false_rumor_start)} (${x6(R.false_rumor_start)}), end=${
            d6(R.false_rumor_end)} (${x6(R.false_rumor_end)}), size=${
            d6(R.false_rumor_size)} (${x6(R.false_rumor_size)})`;
        tty_putstr(tmpwin, 0, rumor_buf);

        /*
         * check the first rumor (start of true rumors) by
         * skipping the first two lines.
         *
         * Then seek to the start of the false rumors (based on
         * the value read in rumors, and display it.
         */
        rumor_buf = '';
        dlb_fseek(rumors, R.true_rumor_start, 'SET');
        ftell_rumor_start = dlb_ftell(rumors);
        line = dlb_fgets(rumors) ?? '';
        line = chop(line);
        rumor_buf = `T ${d6(ftell_rumor_start)} ${xcrypt(line)}`;
        tty_putstr(tmpwin, 0, rumor_buf);
        /* find last true rumor: fgets() overwrites line before the
           position test, so line ends up as the one that crossed the end */
        while ((l2 = dlb_fgets(rumors)) !== null
               && ((line = l2), dlb_ftell(rumors) < R.true_rumor_end))
            continue;
        line = chop(line);
        rumor_buf = `  ${''.padStart(6)} ${xcrypt(line)}`;
        tty_putstr(tmpwin, 0, rumor_buf);

        rumor_buf = '';
        dlb_fseek(rumors, R.false_rumor_start, 'SET');
        ftell_rumor_start = dlb_ftell(rumors);
        line = dlb_fgets(rumors) ?? '';
        line = chop(line);
        rumor_buf = `F ${d6(ftell_rumor_start)} ${xcrypt(line)}`;
        tty_putstr(tmpwin, 0, rumor_buf);
        /* find last false rumor */
        while ((l2 = dlb_fgets(rumors)) !== null
               && ((line = l2), dlb_ftell(rumors) < R.false_rumor_end))
            continue;
        line = chop(line);
        rumor_buf = `  ${''.padStart(6)} ${xcrypt(line)}`;
        tty_putstr(tmpwin, 0, rumor_buf);

        /* (void) dlb_fclose(rumors); */

    /* if a previous attempt couldn't open file or rejected its contents,
       we didn't bother trying again this time */
    } else if (R.true_rumor_size < 0) {
        /* no_rumors: file could be opened but init_rumors() didn't like it */
        await pline('rumors not accessible.');
        /* engravings, epitaphs, and bogus monsters will still be shown,
           and in tmpwin rather than via additional pline() calls */
        await display_nhwindow_message(); /* --more-- */

    /* first attempt to open file has just failed */
    } else {
        await couldnt_open_file('rumors');
        R.true_rumor_size = -1; /* don't try to open it again */
    }

    /* initial implementation of default epitaph/engraving/bogusmon
       contained an error; check those along with rumors */
    const winptr = { win: tmpwin };
    await others_check('Engravings:', 'engrave', winptr);
    await others_check('Epitaphs:', 'epitaph', winptr);
    await others_check('Bogus monsters:', 'bogusmon', winptr);
    tmpwin = winptr.win;

    if (tmpwin) {
        /* display_nhwindow(tmpwin, TRUE): page through the text window,
           ESC cancelling the remaining pages */
        await tty_display_nhwindow(tmpwin);
        for (;;) {
            await xwaitforspace(quitchars);
            if (game.morc === '\x1b')
                break;
            if (!tty_next_page(tmpwin))
                break;
        }
        tty_destroy_nhwindow(tmpwin);
    }
}

// src/rumors.c:305 others_check() — 5.0: augments rumors_check(); test
// 'engrave' or 'epitaph' or 'bogusmon'. winptr.win is the text window for
// output; created here if necessary.
async function others_check(ftype, fname, winptr) {
    const errfmt = (f, s) => `others_check("${f}"): ${s}`;
    let line, xbuf = '', endp;
    let tmpwin = winptr.win;
    let entrycount = 0;
    const chop = (str) => ((endp = str.indexOf('\n')) >= 0) ? str.slice(0, endp) : str;

    const fh = FILES[fname] !== undefined ? dlb_fopen(fname) : null;
    if (fh) {
        if (!tmpwin) {
            winptr.win = tmpwin = tty_create_nhwindow(NHW_TEXT);
            /* (WIN_ERR: "can't create temporary window" can't happen with
               the tty port's window table) */
        }
        tty_putstr(tmpwin, 0, '');
        tty_putstr(tmpwin, 0, ftype);
        /* "don't edit" comment */
        line = dlb_fgets(fh);
        if (line === null) {
            tty_putstr(tmpwin, 0, errfmt(fname, "error; can't read comment line"));
            return; /* closeit */
        }
        if (line[0] !== '#') {
            tty_putstr(tmpwin, 0,
                       errfmt(fname, 'malformed; first line is not a comment line:'));
            /* show the bad line; we don't know whether it has been
               encrypted via xcrypt() so show it both ways */
            line = chop(line);
            tty_putstr(tmpwin, 0, '- first line, as is');
            tty_putstr(tmpwin, 0, line);
            tty_putstr(tmpwin, 0, '- xcrypt of first line');
            tty_putstr(tmpwin, 0, xcrypt(line));
            return; /* closeit */
        }
        /* first line; should be default one inserted by makedefs when
           building the file but we don't have the expected value so
           can only require a line to exist */
        line = dlb_fgets(fh);
        if (line === null || line === '\n') {
            tty_putstr(tmpwin, 0,
                       errfmt(fname, line === null ? "can't read first non-comment line"
                                                   : 'first non-comment line is empty'));
            return; /* closeit */
        }
        ++entrycount;
        line = chop(line);
        tty_putstr(tmpwin, 0, xcrypt(line));
        line = dlb_fgets(fh);
        if (line === null) {
            tty_putstr(tmpwin, 0, '(no second entry)');
        } else {
            let l2;
            ++entrycount;
            line = chop(line);
            tty_putstr(tmpwin, 0, xcrypt(line));
            while ((l2 = dlb_fgets(fh)) !== null) {
                ++entrycount;
                line = chop(l2);
                xbuf = xcrypt(line);
            }
            /* count will be 2 if the default entry and the first ordinary
               entry are the only ones present (if either of those were
               missing, we wouldn't have gotten here...) */
            if (entrycount === 2) {
                tty_putstr(tmpwin, 0, '(only two entries)');
            } else {
                /* showing an ellipsis avoids ambiguity about whether
                   there are other lines; doing so three times (once for
                   each file) results in total output being 24 lines,
                   forcing a --More-- prompt if using a 24 line screen;
                   displaying 23 lines and --More-- followed by second
                   page with 1 line doesn't look very good but isn't
                   incorrect, and taller screens where that won't be an
                   issue are more common than 24 line terminals nowadays */
                if (entrycount > 3)
                    tty_putstr(tmpwin, 0, ' ...');
                tty_putstr(tmpwin, 0, xbuf); /* already decrypted */
            }
        }
        /* closeit: (void) dlb_fclose(fh); */
    } else {
        /* since this comes out via impossible(), it won't be integrated
           with the text window of values, but it shouldn't ever happen
           so we won't waste effort integrating it */
        await couldnt_open_file(fname);
    }
}

// src/rumors.c:545 outrumor() — deliver a rumor via cookie, paper or Oracle.
export async function outrumor(truth, mechanism) {
    const fortune_msg = 'This cookie has a scrap of paper inside.';
    const reading = (mechanism === BY_COOKIE || mechanism === BY_PAPER);

    if (reading) {
        /* deal with various things that prevent reading */
        if (is_fainted() && mechanism === BY_COOKIE) {
            return;
        } else if (game.u.ublind) {
            if (mechanism === BY_COOKIE)
                await pline(fortune_msg);
            await pline('What a pity that you cannot read it!');
            return;
        }
    }

    let line = getrumor(truth, reading ? false : true);
    if (!line)
        line = 'NetHack rumors file closed for renovation.';
    switch (mechanism) {
    case BY_ORACLE:
        /* Oracle delivers the rumor */
        await pline(`True to her word, the Oracle ${
            (!rn2(4) ? 'offhandedly '
                     : (!rn2(3) ? 'casually '
                                : (rn2(2) ? 'nonchalantly ' : '')))}says: `);
        /* SetVoice((struct monst *) 0, 0, 80, voice_oracle) */
        await verbalize(line);
        /* [WIS exercised by getrumor()] */
        return;
    case BY_COOKIE:
        await pline(fortune_msg);
        /* FALLTHRU */
    case BY_PAPER:
        await pline('It reads:');
        break;
    }
    await pline(line);
}

function note_unported_rumors(what) {
    (game.unported ||= new Set()).add(what);
}

// src/rumors.c:580 init_oracles() — the oracles file's header: a "don't
// edit" line, the count, then one hex offset per oracle.
function init_oracles(fp) {
    let cnt = 0;

    /* this assumes we're only called once */
    dlb_fgets(fp); /* skip "don't edit" comment*/
    const line = dlb_fgets(fp);
    const m = line && line.match(/^\s*(\d{1,5})/);
    if (m && (cnt = parseInt(m[1], 10)) > 0) {
        game.oracle_cnt = cnt;
        game.oracle_loc = new Array(cnt);
        for (let i = 0; i < cnt; i++) {
            const l = dlb_fgets(fp);
            game.oracle_loc[i] = parseInt((l || '').slice(0, 5), 16);
        }
    }
    return;
}

// src/rumors.c:640 outoracle() — the Oracle's consultation text (special:
// the P vs NP quotation; otherwise one random unused oracle).
export async function outoracle(special, delphi) {
    let line;

    /* early return if we couldn't open ORACLEFILE on previous attempt,
       or if all the oracularities are already exhausted */
    if ((game.oracle_flg | 0) < 0 || ((game.oracle_flg | 0) > 0 && (game.oracle_cnt | 0) === 0))
        return;

    const fp = dlb_fopen('oracles');
    if (fp) {
        if ((game.oracle_flg | 0) === 0) { /* if this is the first outoracle() */
            init_oracles(fp);
            game.oracle_flg = 1;
            if ((game.oracle_cnt | 0) === 0)
                return; /* close_oracles */
        }
        /* oracle_loc[0] is the special oracle;
           oracle_loc[1..oracle_cnt-1] are normal ones */
        if (game.oracle_cnt <= 1 && !special)
            return; /*(shouldn't happen)*/
        const oracle_idx = special ? 0 : rnd(game.oracle_cnt - 1);
        dlb_fseek(fp, game.oracle_loc[oracle_idx], 'SET');
        if (!special) /* move offset of very last one into this slot */
            game.oracle_loc[oracle_idx] = game.oracle_loc[--game.oracle_cnt];

        const tmpwin = tty_create_nhwindow(NHW_TEXT);
        if (delphi)
            tty_putstr(tmpwin, 0,
                       special
                         ? 'The Oracle scornfully takes all your gold and says:'
                         : 'The Oracle meditates for a moment and then intones:');
        else
            tty_putstr(tmpwin, 0, 'The message reads:');
        tty_putstr(tmpwin, 0, '');

        while ((line = dlb_fgets(fp)) != null && line !== '---\n') {
            line = line.replace(/\n$/, '');
            tty_putstr(tmpwin, 0, xcrypt(line));
        }
        await tty_display_nhwindow(tmpwin);
        tty_destroy_nhwindow(tmpwin);
    } else {
        game.oracle_flg = -1; /* don't try to open it again */
    }
}

// src/rumors.c:706 doconsult() — consult the Oracle for gold.
export async function doconsult(oracl) {
    let umoney;
    let u_pay;
    const minor_cost = 50, major_cost = 500 + 50 * game.u.ulevel;
    let add_xpts;
    let qbuf;

    game.multi = 0;
    umoney = money_cnt(game.invent || []);

    if (!oracl) {
        await There('is no one here to consult.');
        return ECMD_OK;
    } else if (!oracl.mpeaceful) {
        await pline(`${Monnam(oracl)} is in no mood for consultations.`);
        return ECMD_OK;
    } else if (!umoney) {
        await You('have no gold.');
        return ECMD_OK;
    }

    qbuf = `"Wilt thou settle for a minor consultation?" (${minor_cost} ${currency(minor_cost)})`;
    switch (await tty_yn_function(qbuf, 'ynq', 'q')) {
    default:
    case 'q':
        return ECMD_OK;
    case 'y':
        if (umoney < minor_cost) {
            await You("don't even have enough gold for that!");
            return ECMD_OK;
        }
        u_pay = minor_cost;
        break;
    case 'n':
        if (umoney <= minor_cost /* don't even ask */
            || (game.oracle_cnt === 1 || (game.oracle_flg | 0) < 0))
            return ECMD_OK;
        qbuf = `"Then dost thou desire a major one?" (${major_cost} ${currency(major_cost)})`;
        if (await tty_yn_function(qbuf, 'yn', 'n') !== 'y')
            return ECMD_OK;
        u_pay = (umoney < major_cost) ? umoney : major_cost;
        break;
    }

    await money2mon(oracl, u_pay);
    (game.disp ||= {}).botl = true;
    if (!game.u.uevent?.major_oracle && !game.u.uevent?.minor_oracle)
        record_achievement(ACH_ORCL);
    add_xpts = 0; /* first oracle of each type gives experience points */
    if (u_pay === minor_cost) {
        await outrumor(1, BY_ORACLE);
        if (!game.u.uevent?.minor_oracle)
            add_xpts = Math.trunc(u_pay / (game.u.uevent?.major_oracle ? 25 : 10));
        /* 5 pts if very 1st, or 2 pts if major already done */
        (game.u.uevent ||= {}).minor_oracle = true;
    } else {
        const cheapskate = u_pay < major_cost;

        await outoracle(cheapskate, true);
        if (!cheapskate && !game.u.uevent?.major_oracle)
            add_xpts = Math.trunc(u_pay / (game.u.uevent?.minor_oracle ? 25 : 10));
        /* ~100 pts if very 1st, ~40 pts if minor already done */
        (game.u.uevent ||= {}).major_oracle = true;
        exercise(A_WIS, !cheapskate);
    }
    if (add_xpts) {
        more_experienced(add_xpts, Math.trunc(u_pay / 50));
        await newexplevel();
    }
    return ECMD_TIME;
}

// src/rumors.c:770 couldnt_open_file() — a data file that can't be read;
// impossible() without its "saving and restoring might fix this" clause
export async function couldnt_open_file(filename) {
    const state = (game.program_state ||= {});
    const save_something = state.something_worth_saving;

    /* most likely the file is missing, so suppress impossible()'s
       "saving and restoring might fix this" (unless the fuzzer,
       which escalates impossible to panic, is running) */
    if (!game.iflags?.debug_fuzzer)
        state.something_worth_saving = 0;

    await impossible(`Can't open '${filename}' file.`);
    state.something_worth_saving = save_something;
}
