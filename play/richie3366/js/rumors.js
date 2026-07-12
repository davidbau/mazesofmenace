// rumors.js — Rumor file load + getrumor for graffiti / fortune cookies.
// C ref: rumors.c getrumor / get_rnd_line / outrumor; makedefs.c padline + xcrypt packing.

import { rn2 } from './rng.js';
import { game } from './gstate.js';
import { A_WIS, exercise } from './attrib.js';
import { pline } from './display.js';
import {
    TRUE_RUMOR_BUF,
    FALSE_RUMOR_BUF,
    MD_PAD_RUMORS,
} from './generated/rumors_data.js';

export const BY_ORACLE = 0;
export const BY_COOKIE = 1;
export const BY_PAPER = 2;

// C ref: hacklib.c xcrypt() — involution
function xcrypt(str) {
    let bitmask = 1;
    let out = '';
    for (let i = 0; i < str.length; i++) {
        let c = str.charCodeAt(i);
        if (c & (32 | 64)) c ^= bitmask;
        out += String.fromCharCode(c);
        bitmask <<= 1;
        if (bitmask >= 32) bitmask = 1;
    }
    return out;
}

function unpadline(line) {
    return line.replace(/_+$/, '');
}

/**
 * C ref: rumors.c get_rnd_line for a single section buffer.
 * Landing mid-line: fgets rest-of-line; accept if strlen <= pad+1; then next line.
 */
function get_rnd_line(buf) {
    const filechunksize = buf.length;
    if (filechunksize < 1) return '';

    let accepted = '';
    for (let trylimit = 10; trylimit > 0; --trylimit) {
        const chunkoffset = rn2(filechunksize);
        // Rest of current line from mid-line landing (like fgets after fseek)
        let i = chunkoffset;
        while (i < buf.length && buf[i] !== '\n') i++;
        const partialLen = i - chunkoffset + (i < buf.length ? 1 : 0); // include newline if present
        if (!MD_PAD_RUMORS || partialLen <= MD_PAD_RUMORS + 1) {
            // Accept — use next line
            let start = i + 1;
            if (start >= buf.length) start = 0;
            let end = start;
            while (end < buf.length && buf[end] !== '\n') end++;
            accepted = buf.slice(start, end);
            break;
        }
    }
    if (!accepted) return '';
    return unpadline(xcrypt(accepted));
}

/**
 * C ref: rumors.c getrumor(truth, rumor_buf, exclude_cookie)
 */
export function getrumor(truth = 0, exclude_cookie = true) {
    let rumor = '';
    let count = 0;
    let adjtruth = 0;
    do {
        rumor = '';
        adjtruth = truth + rn2(2);
        const buf = (adjtruth === 1 || adjtruth === 2) ? TRUE_RUMOR_BUF : FALSE_RUMOR_BUF;
        rumor = get_rnd_line(buf);
        if (exclude_cookie && rumor.startsWith('[cookie] ')) rumor = '';
    } while (count++ < 50 && exclude_cookie && !rumor);

    if (!exclude_cookie && rumor.startsWith('[cookie] '))
        rumor = rumor.slice('[cookie] '.length);

    // C: graffiti during mklev skips WIS exercise
    if (!game.in_mklev)
        exercise(A_WIS, adjtruth > 0);

    return rumor;
}

/**
 * C ref: obj.h bcsign()
 */
export function bcsign(otmp) {
    if (!otmp) return 0;
    return (otmp.blessed ? 1 : 0) - (otmp.cursed ? 1 : 0);
}

/**
 * C ref: rumors.c outrumor()
 */
export async function outrumor(truth, mechanism) {
    const reading = mechanism === BY_COOKIE || mechanism === BY_PAPER;
    let line = getrumor(truth, reading ? false : true);
    if (!line) line = 'NetHack rumors file closed for renovation.';

    if (mechanism === BY_ORACLE) {
        await pline(`True to her word, the Oracle says: `);
        await pline(line);
        return;
    }
    if (mechanism === BY_COOKIE)
        await pline('This cookie has a scrap of paper inside.');
    if (mechanism === BY_COOKIE || mechanism === BY_PAPER)
        await pline('It reads:');
    await pline(line);
}
