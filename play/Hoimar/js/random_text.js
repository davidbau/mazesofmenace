// random_text.js — NetHack random text data selection.
// C refs: rumors.c:getrumor/get_rnd_line/get_rnd_text, engrave.c:random_engraving.

import { readFileSync } from 'fs';
import { rn2 } from './rng.js';

const MD_PAD_RUMORS = 60;
const COOKIE_MARKER = '[cookie] ';
const DATA_ROOT = '../nethack-c/upstream/dat/';

let rumorData = null;
let engraveData = null;

export function randomEngraving() {
    let pristine = '';
    if (!rn2(4)) {
        pristine = getRndEngravingText();
    } else {
        pristine = getRumor(0, true);
        if (!pristine) pristine = getRndEngravingText();
    }
    return { text: wipeoutText(pristine, Math.trunc(pristine.length / 4), 0), pristine };
}

function getRumor(truth, excludeCookie) {
    const data = loadRumors();
    let rumor = '';
    let count = 0;
    do {
        const adjtruth = truth + rn2(2);
        const chunk = adjtruth > 0 ? data.trueText : data.falseText;
        rumor = getRndLine(chunk, 0, chunk.length, MD_PAD_RUMORS);
    } while (count++ < 50 && excludeCookie && rumor.startsWith(COOKIE_MARKER));
    return rumor.startsWith(COOKIE_MARKER) ? rumor.slice(COOKIE_MARKER.length) : rumor;
}

function getRndEngravingText() {
    const text = loadEngravings();
    return getRndLine(text, 0, text.length, MD_PAD_RUMORS);
}

function getRndLine(text, startpos, endpos, padlength) {
    const filechunksize = endpos - startpos;
    if (filechunksize < 1) return '';

    let firstLine = '';
    let firstEnd = startpos;
    for (let trylimit = 10; trylimit > 0; --trylimit) {
        const chunkoffset = rn2(filechunksize);
        const pos = startpos + chunkoffset;
        const line = readLineAt(text, pos, endpos);
        firstLine = line.value;
        firstEnd = line.end;
        if (!padlength || firstLine.length <= padlength + 1) break;
    }

    let line;
    if (firstEnd >= endpos) {
        line = readLineAt(text, startpos, endpos).value;
    } else {
        line = readLineAt(text, firstEnd, endpos).value;
        if (!line) line = readLineAt(text, startpos, endpos).value;
    }
    return unpadline(xcrypt(stripNewline(line)));
}

function readLineAt(text, pos, endpos) {
    const nl = text.indexOf('\n', pos);
    const end = nl < 0 || nl + 1 > endpos ? endpos : nl + 1;
    return { value: text.slice(pos, end), end };
}

function loadRumors() {
    if (rumorData) return rumorData;
    const trueText = compilePlainLines(readDataFile('rumors.tru'), () => true);
    const falseText = compilePlainLines(readDataFile('rumors.fal'), () => true);
    rumorData = { trueText, falseText };
    return rumorData;
}

function loadEngravings() {
    if (engraveData) return engraveData;
    const lines = [`No matter where you go, there you are.\n`];
    lines.push(...plainLines(readDataFile('engrave.txt'))
        .filter((line) => line[0] !== '#' && line !== '\n'));
    engraveData = lines.map((line) => xcrypt(padline(line))).join('');
    return engraveData;
}

function compilePlainLines(text) {
    return plainLines(text).map((line) => xcrypt(padline(line))).join('');
}

function plainLines(text) {
    const normalized = text.replace(/\r\n/g, '\n');
    const parts = normalized.split('\n');
    if (parts[parts.length - 1] === '') parts.pop();
    return parts.map((line) => `${line}\n`);
}

function padline(line, padlength = MD_PAD_RUMORS) {
    if (line.length <= padlength) {
        const newline = line.endsWith('\n') ? '\n' : '';
        let body = newline ? line.slice(0, -1) : line;
        while (body.length + newline.length < padlength) body += '_';
        return `${body}${newline}`;
    }
    return line;
}

function unpadline(line) {
    return line.replace(/_+$/u, '');
}

function stripNewline(line) {
    return line.endsWith('\n') ? line.slice(0, -1) : line;
}

function xcrypt(str) {
    let out = '';
    let bitmask = 1;
    for (let i = 0; i < str.length; i++) {
        let code = str.charCodeAt(i);
        if (code & (32 | 64)) code ^= bitmask;
        out += String.fromCharCode(code);
        bitmask <<= 1;
        if (bitmask >= 32) bitmask = 1;
    }
    return out;
}

function wipeoutText(text, cnt, seed) {
    const chars = [...text];
    let lth = chars.length;
    while (lth && cnt-- > 0) {
        let nxt;
        let useRubout;
        if (!seed) {
            nxt = rn2(lth);
            useRubout = rn2(4);
        } else {
            nxt = seed % lth;
            seed *= 31;
            seed %= 255;
            useRubout = seed & 3;
        }

        const ch = chars[nxt];
        if (ch === ' ') continue;
        if ("?.,'`-|_".includes(ch)) {
            chars[nxt] = ' ';
            continue;
        }

        const subst = RUBOUTS.get(ch);
        if (useRubout && subst) {
            let j;
            if (!seed) j = rn2(subst.length);
            else {
                seed *= 31;
                seed %= 255;
                j = seed % subst.length;
            }
            chars[nxt] = subst[j];
        } else {
            chars[nxt] = '?';
        }
    }
    while (lth && chars[lth - 1] === ' ') lth--;
    return chars.slice(0, lth).join('');
}

function readDataFile(name) {
    return readFileSync(new URL(`${DATA_ROOT}${name}`, import.meta.url), 'utf8');
}

const RUBOUTS = new Map([
    ['A', '^'], ['B', 'Pb['], ['C', '('], ['D', '|)['], ['E', '|FL[_'],
    ['F', '|-'], ['G', 'C('], ['H', '|-'], ['I', '|'], ['K', '|<'],
    ['L', '|_'], ['M', '|'], ['N', '|\\'], ['O', 'C('], ['P', 'F'],
    ['Q', 'C('], ['R', 'PF'], ['T', '|'], ['U', 'J'], ['V', '/\\'],
    ['W', 'V/\\'], ['Z', '/'], ['b', '|'], ['d', 'c|'], ['e', 'c'],
    ['g', 'c'], ['h', 'n'], ['j', 'i'], ['k', '|'], ['l', '|'],
    ['m', 'nr'], ['n', 'r'], ['o', 'c'], ['q', 'c'], ['w', 'v'],
    ['y', 'v'], [':', '.'], [';', ',:'], [',', '.'], ['=', '-'],
    ['+', '-|'], ['*', '+'], ['@', '0'], ['0', 'C('], ['1', '|'],
    ['6', 'o'], ['7', '/'], ['8', '3o'],
]);
