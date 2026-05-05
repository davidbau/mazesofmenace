// objdata.js — small data parsers for object probabilities.

import { createRequire } from 'module';

const require = createRequire(import.meta.url);

let gemProbTable = null;

const DEFAULT_GEM_TABLE = [
    { sn: 'ROCK', prob: 100 },
    { sn: 'LUCKSTONE', prob: 10 },
    { sn: 'LOADSTONE', prob: 10 },
    { sn: 'OTHER', prob: 880 },
];

function splitArgs(argStr) {
    const args = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < argStr.length; i++) {
        const ch = argStr[i];
        if (ch === '"') {
            inQuote = !inQuote;
            cur += ch;
            continue;
        }
        if (ch === ',' && !inQuote) {
            args.push(cur.trim());
            cur = '';
            continue;
        }
        cur += ch;
    }
    if (cur.trim()) args.push(cur.trim());
    return args;
}

function parseMacroCalls(raw, macroName) {
    const calls = [];
    const needle = macroName + '(';
    let idx = 0;
    while (idx < raw.length) {
        const startIdx = raw.indexOf(needle, idx);
        if (startIdx === -1) break;
        const lineStart = raw.lastIndexOf('\n', startIdx) + 1;
        const linePrefix = raw.slice(lineStart, startIdx);
        if (linePrefix.includes('#define')) {
            idx = startIdx + needle.length;
            continue;
        }
        let j = startIdx + needle.length;
        let depth = 1;
        let inQuote = false;
        for (; j < raw.length; j++) {
            const ch = raw[j];
            if (ch === '"') {
                inQuote = !inQuote;
                continue;
            }
            if (!inQuote && ch === '(') depth++;
            if (!inQuote && ch === ')') {
                depth--;
                if (depth === 0) break;
            }
        }
        if (depth !== 0) break;
        const argStr = raw.slice(startIdx + needle.length, j);
        calls.push(argStr);
        idx = j + 1;
    }
    return calls;
}

function parseGemProbTable() {
    try {
        const { readFileSync } = require('fs');
        const { join } = require('path');
        const path = join(process.cwd(), 'nethack-c', 'upstream', 'include', 'objects.h');
        const raw = readFileSync(path, 'utf8');
        const table = [];

        const gemCalls = parseMacroCalls(raw, 'GEM');
        const rockCalls = parseMacroCalls(raw, 'ROCK');

        for (const argStr of gemCalls) {
            const args = splitArgs(argStr);
            const prob = parseInt(args[2], 10);
            if (!Number.isFinite(prob)) continue;
            const sn = args[args.length - 1].trim();
            table.push({ sn, prob });
        }
        for (const argStr of rockCalls) {
            const args = splitArgs(argStr);
            const prob = parseInt(args[3], 10);
            if (!Number.isFinite(prob)) continue;
            const sn = args[args.length - 1].trim();
            table.push({ sn, prob });
        }

        if (!table.length) return DEFAULT_GEM_TABLE.slice();
        return table;
    } catch {
        return DEFAULT_GEM_TABLE.slice();
    }
}

export function getGemProbTable() {
    if (!gemProbTable) gemProbTable = parseGemProbTable();
    return gemProbTable;
}

export function getGemProbTotal() {
    const table = getGemProbTable();
    return table.reduce((sum, entry) => sum + entry.prob, 0);
}
