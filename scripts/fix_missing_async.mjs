#!/usr/bin/env node
// scripts/fix_missing_async.mjs — Fix missing async keywords on functions that contain await.
//
// Scans all JS files for syntax errors caused by `await` in non-async functions,
// and adds `async` to those function definitions.

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const JS_DIR = path.resolve(import.meta.dirname, '..', 'js');

function getAllJsFiles(dir) {
    const results = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...getAllJsFiles(fullPath));
        } else if (entry.name.endsWith('.js')) {
            results.push(fullPath);
        }
    }
    return results;
}

function hasSyntaxError(filePath) {
    try {
        execSync(`node --check "${filePath}" 2>&1`, { encoding: 'utf8' });
        return null;
    } catch (e) {
        const output = e.stdout || e.stderr || '';
        const m = output.match(/(\d+)\n\s+await /);
        if (m) return parseInt(m[1]);
        // Try alternative pattern
        const m2 = output.match(/:(\d+)\n/);
        if (m2) return parseInt(m2[1]);
        return null;
    }
}

function fixFile(filePath) {
    let fixed = 0;
    let iterations = 0;
    while (iterations < 50) {
        iterations++;
        const errLine = hasSyntaxError(filePath);
        if (!errLine) break;

        const source = fs.readFileSync(filePath, 'utf8');
        const lines = source.split('\n');
        const awaitLineIdx = errLine - 1;

        // Scan backwards from the await line to find the enclosing non-async function
        let depth = 0;
        let foundFuncLine = -1;
        for (let i = awaitLineIdx; i >= 0; i--) {
            const line = lines[i];
            // Count braces (reverse direction)
            for (let c = line.length - 1; c >= 0; c--) {
                if (line[c] === '}') depth++;
                else if (line[c] === '{') {
                    if (depth === 0) {
                        // This is the opening brace of the function containing our await
                        // Look at this line and preceding lines for the function definition
                        for (let j = i; j >= Math.max(0, i - 3); j--) {
                            if (lines[j].match(/\bfunction\s*\(/) && !lines[j].match(/\basync\s+function/)) {
                                foundFuncLine = j;
                                break;
                            }
                            if (lines[j].match(/=>\s*\{?\s*$/) && !lines[j].match(/\basync\s/)) {
                                foundFuncLine = j;
                                break;
                            }
                            // method: name(args) {
                            if (lines[j].match(/\w+\s*\([^)]*\)\s*\{/) && !lines[j].match(/\basync\s/) && !lines[j].match(/\b(if|for|while|switch|catch)\s*\(/)) {
                                foundFuncLine = j;
                                break;
                            }
                        }
                        break;
                    }
                    depth--;
                }
            }
            if (foundFuncLine >= 0) break;
        }

        if (foundFuncLine < 0) {
            console.error(`  Cannot find enclosing function for await at line ${errLine} in ${filePath}`);
            break;
        }

        // Add async to the function definition
        let line = lines[foundFuncLine];
        if (line.match(/\bfunction\s*\(/)) {
            line = line.replace(/\bfunction\s*\(/, 'async function(');
        } else if (line.match(/=>\s*\{?\s*$/)) {
            // Arrow function — add async before the args
            line = line.replace(/(\()([^)]*\)\s*=>\s*\{?\s*$)/, 'async ($2');
            if (!line.includes('async')) {
                // Might be single-arg arrow: `x => {`
                line = line.replace(/(\w+)\s*(=>\s*\{?\s*$)/, 'async $1 $2');
            }
        } else if (line.match(/\w+\s*\([^)]*\)\s*\{/)) {
            // Method definition
            line = line.replace(/(\w+\s*\()/, 'async $1');
        }

        lines[foundFuncLine] = line;
        fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
        fixed++;
    }
    return fixed;
}

function main() {
    const files = getAllJsFiles(JS_DIR);
    let totalFixed = 0;

    for (const filePath of files) {
        const errLine = hasSyntaxError(filePath);
        if (!errLine) continue;

        const rel = path.relative(JS_DIR, filePath);
        const fixed = fixFile(filePath);
        if (fixed > 0) {
            console.log(`  Fixed ${fixed} in ${rel}`);
            totalFixed += fixed;
        }
    }

    console.log(`\nTotal fixes: ${totalFixed}`);
}

main();
