#!/usr/bin/env node
/**
 * Fix level files: make all contents callbacks async and await async des.* calls.
 *
 * Transforms:
 *   contents: function() { ... des.object(...) ... }
 * Into:
 *   contents: async function() { ... await des.object(...) ... }
 *
 * Async des functions: object, trap, room, region, map, finalize_level
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const LEVELS_DIR = 'js/levels';
const ASYNC_DES_FUNCS = ['object', 'trap', 'room', 'region', 'map', 'finalize_level'];

// Pattern to match des.X( calls that need await
const DES_CALL_PATTERN = new RegExp(
    `(?<!await\\s)\\bdes\\.(${ASYNC_DES_FUNCS.join('|')})\\s*\\(`,
    'g'
);

function processFile(filepath) {
    let content = readFileSync(filepath, 'utf-8');
    let changed = false;

    // Step 1: Make all non-async contents callbacks async
    // Match: contents: function() or contents: function(rm) etc.
    const contentsPattern = /contents:\s*function\s*\(/g;
    const newContent1 = content.replace(contentsPattern, (match) => {
        changed = true;
        return match.replace('function', 'async function');
    });
    content = newContent1;

    // Step 2: Add await before all unawaited async des.* calls
    // Only add await if not already preceded by 'await '
    const newContent2 = content.replace(DES_CALL_PATTERN, (match) => {
        changed = true;
        return 'await ' + match;
    });
    content = newContent2;

    if (changed) {
        writeFileSync(filepath, content, 'utf-8');
        return true;
    }
    return false;
}

// Process all level files
const files = readdirSync(LEVELS_DIR)
    .filter(f => f.endsWith('.js'))
    .map(f => join(LEVELS_DIR, f));

let fixedCount = 0;
for (const filepath of files) {
    if (processFile(filepath)) {
        console.log(`Fixed: ${filepath}`);
        fixedCount++;
    }
}

console.log(`\nDone: ${fixedCount} files fixed out of ${files.length} total.`);
