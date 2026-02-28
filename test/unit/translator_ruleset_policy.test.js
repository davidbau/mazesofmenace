import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const FUNCTION_MAP_PATH = 'tools/c_translator/rulesets/function_map.json';

test('translator function_map rewrites target canonical invocation names', () => {
    const raw = fs.readFileSync(FUNCTION_MAP_PATH, 'utf8');
    const data = JSON.parse(raw);
    const rewrites = Array.isArray(data.rewrites) ? data.rewrites : [];

    for (const rule of rewrites) {
        const js = String(rule?.js || '');
        assert.equal(
            js.includes('map._'),
            false,
            `legacy map underscore target in rewrite js="${js}"`,
        );
    }
});

