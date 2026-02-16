// test/unit/comparators.test.js -- Unit tests for comparison functions
//
// Phase 6: Harden Comparators, Diagnostics, and Insight Speed

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
    compareRng,
    compareScreenLines,
    compareGrids,
    formatRngDivergence,
    formatScreenDiff,
    formatGridDiff,
    createDiagnosticReport,
} from '../comparison/comparators.js';

describe('compareRng', () => {
    it('returns matched count for identical arrays', () => {
        const result = compareRng(
            ['rn2(10)=5', 'rnd(6)=3'],
            ['rn2(10)=5', 'rnd(6)=3']
        );
        assert.strictEqual(result.matched, 2);
        assert.strictEqual(result.total, 2);
        assert.strictEqual(result.firstDivergence, null);
    });

    it('detects first divergence', () => {
        const result = compareRng(
            ['rn2(10)=5', 'rn2(10)=7', 'rnd(6)=3'],
            ['rn2(10)=5', 'rn2(10)=3', 'rnd(6)=3']
        );
        assert.strictEqual(result.matched, 2);
        assert.strictEqual(result.firstDivergence.index, 1);
        assert.strictEqual(result.firstDivergence.js, 'rn2(10)=7');
        assert.strictEqual(result.firstDivergence.session, 'rn2(10)=3');
    });

    it('includes context around divergence', () => {
        const result = compareRng(
            ['rn2(1)=0', 'rn2(2)=1', 'rn2(3)=2', 'rn2(4)=3', 'rn2(5)=4'],
            ['rn2(1)=0', 'rn2(2)=1', 'rn2(3)=9', 'rn2(4)=3', 'rn2(5)=4'],
            { contextLines: 2 }
        );
        assert.ok(result.firstDivergence.contextBefore);
        assert.strictEqual(result.firstDivergence.contextBefore.js.length, 2);
        assert.strictEqual(result.firstDivergence.contextAfter.js.length, 2);
    });

    it('strips source tags from entries', () => {
        const result = compareRng(
            ['1 rn2(10)=5 @ source.js:123'],
            ['rn2(10)=5']
        );
        assert.strictEqual(result.matched, 1);
        assert.strictEqual(result.firstDivergence, null);
    });

    it('handles empty arrays', () => {
        const result = compareRng([], []);
        assert.strictEqual(result.matched, 0);
        assert.strictEqual(result.total, 0);
        assert.strictEqual(result.firstDivergence, null);
    });

    it('handles mismatched lengths', () => {
        const result = compareRng(
            ['rn2(10)=5'],
            ['rn2(10)=5', 'rnd(6)=3']
        );
        assert.strictEqual(result.matched, 1);
        assert.strictEqual(result.total, 2);
        assert.ok(result.firstDivergence);
        assert.strictEqual(result.firstDivergence.index, 1);
    });
});

describe('compareScreenLines', () => {
    it('returns match true for identical screens', () => {
        const result = compareScreenLines(
            ['Hello', 'World'],
            ['Hello', 'World']
        );
        assert.strictEqual(result.match, true);
        assert.strictEqual(result.matched, 2);
    });

    it('detects line differences', () => {
        const result = compareScreenLines(
            ['Hello', 'World'],
            ['Hello', 'Universe']
        );
        assert.strictEqual(result.match, false);
        assert.strictEqual(result.diffs.length, 1);
        assert.strictEqual(result.diffs[0].row, 1);
    });

    it('trims trailing spaces', () => {
        const result = compareScreenLines(
            ['Hello   '],
            ['Hello']
        );
        assert.strictEqual(result.match, true);
    });
});

describe('compareGrids', () => {
    it('returns empty diffs for identical grids', () => {
        const grid = [[1, 2, 3], [4, 5, 6]];
        const result = compareGrids(grid, grid);
        assert.strictEqual(result.length, 0);
    });

    it('detects cell differences', () => {
        const grid1 = [[1, 2, 3], [4, 5, 6]];
        const grid2 = [[1, 9, 3], [4, 5, 6]];
        const result = compareGrids(grid1, grid2);
        assert.strictEqual(result.length, 1);
        assert.deepStrictEqual(result[0], { x: 1, y: 0, js: 2, session: 9 });
    });
});

describe('formatRngDivergence', () => {
    it('formats divergence for display', () => {
        const divergence = {
            index: 5,
            js: 'rn2(10)=7',
            session: 'rn2(10)=3',
        };
        const output = formatRngDivergence(divergence);
        assert.ok(output.includes('index 5'));
        assert.ok(output.includes('rn2(10)=7'));
        assert.ok(output.includes('rn2(10)=3'));
    });

    it('returns message for null divergence', () => {
        const output = formatRngDivergence(null);
        assert.strictEqual(output, 'No divergence');
    });
});

describe('formatScreenDiff', () => {
    it('formats screen diff for display', () => {
        const comparison = {
            matched: 22,
            total: 24,
            match: false,
            diffs: [
                { row: 5, js: 'Hello', session: 'World' },
                { row: 10, js: 'Foo', session: 'Bar' },
            ],
        };
        const output = formatScreenDiff(comparison);
        assert.ok(output.includes('22/24'));
        assert.ok(output.includes('Row 5'));
        assert.ok(output.includes('Row 10'));
    });

    it('returns match message for matching screens', () => {
        const comparison = { match: true };
        const output = formatScreenDiff(comparison);
        assert.strictEqual(output, 'Screens match');
    });
});

describe('createDiagnosticReport', () => {
    it('creates report with RNG divergence', () => {
        const result = {
            session: 'test.session.json',
            type: 'chargen',
            seed: 12345,
            passed: false,
            firstDivergence: {
                index: 10,
                js: 'rn2(5)=3',
                session: 'rn2(5)=2',
            },
        };
        const report = createDiagnosticReport(result);
        assert.strictEqual(report.session, 'test.session.json');
        assert.strictEqual(report.passed, false);
        assert.ok(report.channels.rng);
        assert.strictEqual(report.channels.rng.divergenceIndex, 10);
    });

    it('includes error channel when present', () => {
        const result = {
            session: 'test.session.json',
            passed: false,
            error: new Error('Test error'),
        };
        const report = createDiagnosticReport(result);
        assert.ok(report.channels.error);
        assert.strictEqual(report.channels.error.message, 'Test error');
    });
});
