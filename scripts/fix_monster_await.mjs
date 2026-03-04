#!/usr/bin/env node
/**
 * Add await before unawaited des.monster() calls in level files.
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const LEVELS_DIR = 'js/levels';
const pattern = new RegExp(`(?<!await\\s)\\bdes\\.monster\\s*\\(`, 'g');

const files = readdirSync(LEVELS_DIR)
    .filter(f => f.endsWith('.js'))
    .map(f => join(LEVELS_DIR, f));

let fixedCount = 0;
for (const filepath of files) {
    let content = readFileSync(filepath, 'utf-8');
    const newContent = content.replace(pattern, (match) => {
        return 'await ' + match;
    });
    if (newContent !== content) {
        writeFileSync(filepath, newContent, 'utf-8');
        const added = (newContent.match(/await des\.monster/g) || []).length - (content.match(/await des\.monster/g) || []).length;
        console.log(`${filepath}: added ${added} awaits`);
        fixedCount++;
    }
}
console.log(`\nFixed ${fixedCount} files`);
