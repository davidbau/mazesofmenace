// test/comparison/comparator_policy.js
// Comparator policies decide how raw recorded JS traces are judged against C.
// Replay/runtime should stay policy-free; add sparse-boundary allowances here.

import {
    compareRng,
    compareScreenLines,
    compareScreenAnsi,
    ansiLineToCells,
    compareEvents,
} from './comparators.js';
import { getSessionScreenAnsiLines } from './session_loader.js';
import { decodeDecSpecialChar } from './symset_normalization.js';

function normalizeGameplayScreenLines(lines) {
    return (Array.isArray(lines) ? lines : [])
        .map((line) => String(line || '').replace(/\r$/, '').replace(/[\x0e\x0f]/g, ''));
}

function ansiCellsToPlainLine(line) {
    return ansiLineToCells(line).map((cell) => cell?.ch || ' ').join('');
}

function decodeSOSILine(line) {
    const src = String(line || '').replace(/\r$/, '');
    let result = '';
    let inDec = false;
    for (let i = 0; i < src.length; i++) {
        const ch = src[i];
        if (ch === '\x0e') { inDec = true; continue; }
        if (ch === '\x0f') { inDec = false; continue; }
        result += inDec ? decodeDecSpecialChar(ch) : ch;
    }
    return result;
}

function resolveGameplayComparableLines(plainLines, ansiLines, session) {
    const ansi = Array.isArray(ansiLines) ? ansiLines : [];
    const decgraphics = session?.meta?.options?.symset === 'DECgraphics';
    if (ansi.length > 0) {
        return ansi.map((line) => ansiCellsToPlainLine(line));
    }
    const plain = Array.isArray(plainLines) ? plainLines : [];
    if (!decgraphics) {
        return plain.map(decodeSOSILine);
    }
    return plain
        .map((line) => String(line || '').replace(/\r$/, '').replace(/[\x0e\x0f]/g, ''))
        .map((line) => [...line].map((ch) => decodeDecSpecialChar(ch)).join(''));
}

function compareGameplayScreens(actualLines, expectedLines, session, {
    actualAnsi = null,
    expectedAnsi = null,
} = {}) {
    const comparableActual = resolveGameplayComparableLines(actualLines, actualAnsi, session);
    const comparableExpected = resolveGameplayComparableLines(expectedLines, expectedAnsi, session);
    const normalizedExpected = normalizeGameplayScreenLines(comparableExpected);
    const normalizedActual = normalizeGameplayScreenLines(comparableActual);
    return compareScreenLines(normalizedActual, normalizedExpected);
}

function approximateStepForRngIndex(session, normalizedIndex) {
    let cumulative = 0;
    const count = (entries) => {
        let n = 0;
        for (const e of entries) {
            if (typeof e !== 'string' || !e.length) continue;
            const c = e[0];
            if (c === '>' || c === '<' || c === '^') continue;
            const stripped = e.replace(/^\d+\s+/, '').replace(/ @ .*/, '');
            if (stripped.startsWith('rne(') || stripped.startsWith('rnz(') || stripped.startsWith('d(')) continue;
            n++;
        }
        return n;
    };
    cumulative += count(session.startup?.rng || []);
    for (let i = 0; i < session.steps.length; i++) {
        cumulative += count(session.steps[i].rng || []);
        if (normalizedIndex < cumulative) return i + 1;
    }
    return 'n/a';
}

export function createGameplayComparatorPolicy(session, options = {}) {
    const name = options.name || 'strict-default';
    return {
        name,
        compareRng(allJsRng, allSessionRng) {
            const rngCmp = compareRng(allJsRng, allSessionRng);
            if (rngCmp.firstDivergence) {
                rngCmp.firstDivergence.step = approximateStepForRngIndex(
                    session, rngCmp.firstDivergence.index
                );
            }
            return rngCmp;
        },
        compareScreenStep(actualStep, expectedStep) {
            const expectedAnsi = getSessionScreenAnsiLines(expectedStep);
            return compareGameplayScreens(actualStep?.screen || [], expectedStep?.screen || [], session, {
                actualAnsi: actualStep?.screenAnsi,
                expectedAnsi,
            });
        },
        compareColorStep(actualStep, expectedStep) {
            const expectedAnsi = getSessionScreenAnsiLines(expectedStep);
            if (!expectedAnsi.length || !Array.isArray(actualStep?.screenAnsi)) {
                return null;
            }
            return compareScreenAnsi(actualStep.screenAnsi, expectedAnsi);
        },
        compareEvents(allJsRng, allSessionRng) {
            return compareEvents(allJsRng, allSessionRng);
        },
    };
}
