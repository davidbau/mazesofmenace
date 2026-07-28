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
import { rumors, engrave, epitaph, bogusmon, RUMOR_RANGES } from './dat_files.js';
import { pline } from './display.js';
import { exercise } from './attrib.js';
import { A_WIS, BY_ORACLE, BY_COOKIE, BY_PAPER } from './const.js';
import { is_fainted } from './eat.js';

// include/global.h:41
export const MD_PAD_RUMORS = 60;

const FILES = { rumors, engrave, epitaph, bogusmon };

// A dlb file handle over an in-memory string. Byte offset == string index,
// which tools/gen-datafiles.mjs asserts by rejecting non-ASCII input.
function dlb_fopen(name) {
    const text = FILES[name];
    if (text === undefined)
        throw new Error(`dlb_fopen: no embedded data file "${name}"`);
    return { text, pos: 0 };
}

function dlb_fseek(fh, off, whence = 'SET') {
    fh.pos = whence === 'END' ? fh.text.length + off
           : whence === 'CUR' ? fh.pos + off
           : off;
}

const dlb_ftell = (fh) => fh.pos;

// Reads through the next newline inclusive, as C's fgets does. Returns null at
// end of file so callers can reproduce C's `!dlb_fgets(...)` test.
function dlb_fgets(fh) {
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
        /* the Oracle's delivery draws rn2(4)/rn2(3)/rn2(2) for its adverb */
        note_unported_rumors('outrumor:oracle');
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
