// test/comparison/session_comparator.js
// Recorded gameplay trace comparison orchestration.

import { stripAnsiSequences } from './session_loader.js';
import { createGameplayComparatorPolicy } from './comparator_policy.js';

export function compareRecordedGameplaySession(session, replay, options = {}) {
    const policy = options.policy || createGameplayComparatorPolicy(session);
    const allJsRng = [
        ...(replay.startup?.rng || []),
        ...(replay.steps || []).flatMap((s) => s.rng || []),
    ];
    const allSessionRng = [
        ...(session.startup?.rng || []),
        ...session.steps.flatMap((s) => s.rng || []),
    ];

    const rngCmp = policy.compareRng(allJsRng, allSessionRng);

    const count = Math.min(session.steps.length, (replay.steps || []).length);
    let screensMatched = 0;
    let screensTotal = 0;
    let firstScreenDivergence = null;
    let colorsMatched = 0;
    let colorsTotal = 0;
    let firstColorDivergence = null;

    for (let i = 0; i < count; i++) {
        const expected = session.steps[i];
        const actual = replay.steps[i] || {};

        if (expected.screen.length > 0) {
            screensTotal++;
            const screenCmp = policy.compareScreenStep(actual, expected, i);
            if (screenCmp.match) {
                screensMatched++;
            } else if (!firstScreenDivergence && screenCmp.firstDiff) {
                firstScreenDivergence = { step: i + 1, ...screenCmp.firstDiff };
            }
        }

        const colorCmp = policy.compareColorStep(actual, expected, i);
        if (colorCmp) {
            colorsMatched += colorCmp.matched;
            colorsTotal += colorCmp.total;
            if (!firstColorDivergence && !colorCmp.match && colorCmp.firstDiff) {
                firstColorDivergence = { step: i + 1, ...colorCmp.firstDiff };
            }
        }
    }

    const eventCmp = policy.compareEvents(allJsRng, allSessionRng);

    return {
        rng: {
            matched: rngCmp.matched,
            total: rngCmp.total,
            firstDivergence: rngCmp.firstDivergence || null,
        },
        screen: {
            matched: screensMatched,
            total: screensTotal,
            firstDivergence: firstScreenDivergence,
        },
        color: {
            matched: colorsMatched,
            total: colorsTotal,
            firstDivergence: firstColorDivergence,
        },
        event: {
            matched: eventCmp.matched,
            total: eventCmp.total,
            firstDivergence: eventCmp.firstDivergence || null,
        },
    };
}

export { stripAnsiSequences };
