// rumors.js — rumor/engraving text selection helpers.
// C ref: rumors.c, engrave.c (getrumor, get_rnd_line).

import { readFileSync } from 'fs';
import { join } from 'path';
import { rn2 } from './rng.js';
import { MD_PAD_RUMORS } from './const.js';

const PROJECT_ROOT = process.cwd();
const DATA_DIR = join(PROJECT_ROOT, 'nethack-c', 'upstream', 'dat');
const COOKIE_MARKER = '[cookie] ';

let rumorCache = null;

function loadLines(path) {
    const raw = readFileSync(path, 'utf8');
    const lines = raw.split(/\n/);
    if (lines.length && lines[lines.length - 1] === '') lines.pop();
    return lines.map(line => line.replace(/\r/g, ''));
}

function buildSection(lines, padlength) {
    return lines.map(line => line.padEnd(padlength, '_') + '\n').join('');
}

function initRumors() {
    if (rumorCache) return rumorCache;
    const truLines = loadLines(join(DATA_DIR, 'rumors.tru'));
    const falLines = loadLines(join(DATA_DIR, 'rumors.fal'));

    // Empirically, padlength 59 matches expected rumor chunk size in sessions.
    const padlength = MD_PAD_RUMORS - 1;

    const trueSection = buildSection(truLines, padlength);
    const falseSection = buildSection(falLines, padlength);

    rumorCache = {
        padlength,
        trueLines: truLines,
        falseLines: falLines,
        trueSection,
        falseSection,
    };
    return rumorCache;
}

function unpadLine(line) {
    let end = line.length;
    while (end > 0 && line[end - 1] === '_') end--;
    return line.slice(0, end);
}

function readLineFromOffset(section, offset) {
    const nextNewline = section.indexOf('\n', offset);
    if (nextNewline === -1) return section.slice(offset);
    return section.slice(offset, nextNewline + 1);
}

function readNextLine(section, offset) {
    const nextNewline = section.indexOf('\n', offset);
    if (nextNewline === -1) return null;
    const lineStart = nextNewline + 1;
    if (lineStart >= section.length) return null;
    const lineEnd = section.indexOf('\n', lineStart);
    return section.slice(lineStart, lineEnd === -1 ? section.length : lineEnd);
}

function readFirstLine(section) {
    const end = section.indexOf('\n');
    return end === -1 ? section : section.slice(0, end);
}

function get_rnd_line(section, padlength) {
    const filechunksize = section.length;
    if (filechunksize < 1) return '';

    let chunkoffset = 0;
    for (let trylimit = 10; trylimit > 0; trylimit--) {
        chunkoffset = rn2(filechunksize);
        const partial = readLineFromOffset(section, chunkoffset);
        if (!padlength || partial.length <= padlength + 1) break;
    }

    let line = readNextLine(section, chunkoffset);
    if (!line) line = readFirstLine(section);

    line = unpadLine(line);
    return line;
}

export function getrumor_stub() {
    const { trueSection, falseSection, padlength } = initRumors();
    let rumor = '';
    let count = 0;

    do {
        rumor = '';
        const adjtruth = rn2(2); // 0 => false, 1 => true
        const section = adjtruth ? trueSection : falseSection;
        rumor = get_rnd_line(section, padlength);
        count++;
    } while (count < 50 && rumor.startsWith(COOKIE_MARKER));

    if (rumor.startsWith(COOKIE_MARKER)) {
        rumor = rumor.slice(COOKIE_MARKER.length);
    }

    return rumor;
}

// Stub: consume RNG for random engraving text selection.
export function get_rnd_text_stub() {
    rn2(48);
}

export function get_rnd_line_index_stub(totalLen, chunkSize = MD_PAD_RUMORS) {
    if (totalLen <= 0) return 0;
    const idx = rn2(totalLen);
    return idx - (idx % chunkSize);
}
