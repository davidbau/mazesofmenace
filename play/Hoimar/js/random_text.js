// random_text.js — NetHack random text data selection.
// C refs: rumors.c:getrumor/get_rnd_line/get_rnd_text, engrave.c:random_engraving.

import { rn2, rn2Display } from './rng.js';
import { game } from './gstate.js';
import { BOGUSMON_LINES } from './bogusmon_data.js';
import { MONSTER_DATA } from './monster_data.js';
import { ENGRAVINGS_TEXT, RUMORS_FALSE_TEXT, RUMORS_TRUE_TEXT } from './random_text_data.js';

const MD_PAD_RUMORS = 60;
const MD_PAD_BOGONS = 20;
const COOKIE_MARKER = '[cookie] ';
const BOGUSMONSIZE = 100;
const BOGON_CODES = '-_+|=';
const G_NOGEN = 0x0200;
const M2_PNAME = 0x00080000;
const SPECIAL_PM = MONSTER_DATA.findIndex((m) => m?.[0] === 'LONG_WORM_TAIL');
const HLIQUIDS = [
    'yoghurt', 'oobleck', 'clotted blood', 'diluted water', 'purified water',
    'instant coffee', 'tea', 'herbal infusion', 'liquid rainbow',
    'creamy foam', 'mulled wine', 'bouillon', 'nectar', 'grog', 'flubber',
    'ketchup', 'slow light', 'oil', 'vinaigrette', 'liquid crystal', 'honey',
    'caramel sauce', 'ink', 'aqueous humour', 'milk substitute',
    'fruit juice', 'glowing lava', 'gastric acid', 'mineral water',
    'cough syrup', 'quicksilver', 'sweet vitriol', 'grey goo', 'pink slime',
    'cosmic latte', 'bone oil', 'custard', 'lard', 'vinegar', 'creosote',
];

let rumorData = null;
let engraveData = null;
let bogusMonData = null;

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

export function randomEpitaph() {
    // C ref: engrave.c:make_grave() -> rumors.c:get_rnd_text(EPITAPHFILE).
    // The padded epitaph data is 24075 bytes in NetHack 5.0. The actual
    // headstone text is not displayed in current evidence, but the data-file
    // offset roll is part of the core RNG stream.
    rn2(24075);
    return '';
}

export function getRumor(truth, excludeCookie) {
    const data = loadRumors();
    let rumor = '';
    let count = 0;
    do {
        const adjtruth = truth + rn2(2);
        const chunk = adjtruth > 0 ? data.trueText : data.falseText;
        rumor = getRndLine(chunk, 0, chunk.length, MD_PAD_RUMORS, rn2);
    } while (count++ < 50 && excludeCookie && rumor.startsWith(COOKIE_MARKER));
    return rumor.startsWith(COOKIE_MARKER) ? rumor.slice(COOKIE_MARKER.length) : rumor;
}

function getRndEngravingText() {
    const text = loadEngravings();
    return getRndLine(text, 0, text.length, MD_PAD_RUMORS, rn2);
}

function getRndLine(text, startpos, endpos, padlength, rng) {
    const filechunksize = endpos - startpos;
    if (filechunksize < 1) return '';

    let firstLine = '';
    let firstEnd = startpos;
    for (let trylimit = 10; trylimit > 0; --trylimit) {
        const chunkoffset = rng(filechunksize);
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
    const trueText = compilePlainLines(RUMORS_TRUE_TEXT);
    const falseText = compilePlainLines(RUMORS_FALSE_TEXT);
    rumorData = { trueText, falseText };
    return rumorData;
}

function loadEngravings() {
    if (engraveData) return engraveData;
    const lines = [`No matter where you go, there you are.\n`];
    lines.push(...plainLines(ENGRAVINGS_TEXT)
        .filter((line) => line[0] !== '#' && line !== '\n'));
    engraveData = lines.map((line) => xcrypt(padline(line))).join('');
    return engraveData;
}

function compilePlainLines(text) {
    return plainLines(text).map((line) => xcrypt(padline(line))).join('');
}

function loadBogusMonsters() {
    if (bogusMonData) return bogusMonData;
    bogusMonData = BOGUSMON_LINES.map((line) => xcrypt(padline(line, MD_PAD_BOGONS))).join('');
    return bogusMonData;
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

export function randomHallucinatedMonsterName(article = '') {
    if (SPECIAL_PM < 0) return applyArticle(bogusmon(), article);
    let index = 0;
    do {
        index = rn2Display(SPECIAL_PM + BOGUSMONSIZE);
    } while (index < SPECIAL_PM && isHallucinationSuppressedMonster(index));

    if (index >= SPECIAL_PM) return applyArticle(bogusmon(), article);
    rn2Display(2);
    return applyArticle({ name: monsterDataName(MONSTER_DATA[index]), personal: false }, article);
}

export function hallucinatedLiquidName(liquidpref = '') {
    const hallucinating = !!((game.u?.uhallucination || game.u?.uprops?.hallucination)
        && !game.program_state?.gameover);
    if (hallucinating || !liquidpref) {
        const count = HLIQUIDS.length + (liquidpref ? 1 : 0);
        const index = rn2Display(count);
        if (index >= 0 && index < HLIQUIDS.length) return HLIQUIDS[index];
    }
    return liquidpref;
}

function isHallucinationSuppressedMonster(index) {
    const mdat = MONSTER_DATA[index];
    return !mdat || !!(mdat[13] & M2_PNAME) || !!(mdat[5] & G_NOGEN);
}

function bogusmon() {
    const text = loadBogusMonsters();
    let name = getRndLine(text, 0, text.length, MD_PAD_BOGONS, rn2Display);
    if (!name) name = 'bogon';
    const code = BOGON_CODES.includes(name[0]) ? name[0] : '';
    if (code) name = name.slice(1);
    return { name, code, personal: !!code && '-+='.includes(code) };
}

function applyArticle(entry, article) {
    if (!article || (entry.personal && article !== 'your')) return entry.name;
    if (article === 'the') return `the ${entry.name}`;
    if (article === 'your') return `your ${entry.name}`;
    if (article === 'a') return `${/^[aeiou]/i.test(entry.name) ? 'an' : 'a'} ${entry.name}`;
    return entry.name;
}

function monsterDataName(mdat) {
    return String(mdat?.[0] || 'monster').toLowerCase().replaceAll('_', ' ');
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
