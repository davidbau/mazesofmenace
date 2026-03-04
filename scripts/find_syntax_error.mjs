#!/usr/bin/env node
// Find which JS file causes a SyntaxError when imported via ESM module chain.
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

function walk(dir) {
    const results = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory() && entry.name !== 'node_modules') {
            results.push(...walk(full));
        } else if (entry.name.endsWith('.js') && !entry.name.endsWith('.backup')) {
            results.push(full);
        }
    }
    return results;
}

const files = walk('js').sort();
console.log(`Checking ${files.length} files...`);

for (const f of files) {
    try {
        await import('./' + f);
    } catch (e) {
        if (e instanceof SyntaxError) {
            console.log(`SYNTAX ERROR in import chain involving: ${f}`);
            console.log(`  ${e.message}`);
            // Try to find the actual file from the error
            const stack = e.stack || '';
            const fileMatch = stack.match(/file:\/\/\/(.*?):\d+/);
            if (fileMatch) console.log(`  Actual file: ${fileMatch[1]}`);
        }
    }
}
console.log('Done');
