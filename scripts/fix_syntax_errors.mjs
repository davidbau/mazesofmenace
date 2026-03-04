#!/usr/bin/env node
// Fix all syntax errors from the async propagation:
// 1. Arrow functions containing await but missing async
// 2. Malformed "export function async name()" → "export async function name()"
// 3. Malformed "function async name()" → "async function name()"

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
        execSync(`node --check "${filePath}"`, { encoding: 'utf8', stdio: 'pipe' });
        return null;
    } catch (e) {
        return (e.stderr || e.stdout || '').toString();
    }
}

function fixFile(filePath) {
    let source = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // Fix 1: "export function async name(" → "export async function name("
    const fix1 = source.replace(/\bexport\s+function\s+async\s+(\w+)\s*\(/g, 'export async function $1(');
    if (fix1 !== source) { source = fix1; changed = true; }

    // Fix 2: "function async name(" → "async function name("
    const fix2 = source.replace(/\bfunction\s+async\s+(\w+)\s*\(/g, 'async function $1(');
    if (fix2 !== source) { source = fix2; changed = true; }

    // Fix 3: Arrow functions with await but no async
    // Pattern: "(...) => await" or "(...) =>\n...await" without preceding "async"
    // We need to be careful not to add async twice
    // Match: non-async arrow functions that contain await
    const arrowAwaitPattern = /(?<!\basync\s)(\([^)]*\)\s*=>)\s*(await\b)/g;
    const fix3 = source.replace(arrowAwaitPattern, 'async $1 $2');
    if (fix3 !== source) { source = fix3; changed = true; }

    // Fix 3b: Single-arg arrow: "x => await" without async
    const fix3b = source.replace(/(?<!\basync\s)(\b\w+\s*=>)\s*(await\b)/g, 'async $1 $2');
    if (fix3b !== source) { source = fix3b; changed = true; }

    if (changed) {
        fs.writeFileSync(filePath, source, 'utf8');
    }
    return changed;
}

function main() {
    const files = getAllJsFiles(JS_DIR);
    let totalFixed = 0;
    let iterations = 0;

    while (iterations < 10) {
        iterations++;
        let fixedThisRound = 0;

        for (const filePath of files) {
            const err = hasSyntaxError(filePath);
            if (!err) continue;

            const rel = path.relative(JS_DIR, filePath);
            if (fixFile(filePath)) {
                fixedThisRound++;
                console.log(`  Fixed: ${rel}`);
            } else {
                // Try iterative approach: find the exact line with await error
                const lineMatch = err.match(/:(\d+)\n/);
                if (lineMatch) {
                    const errLineNum = parseInt(lineMatch[1]);
                    const lines = fs.readFileSync(filePath, 'utf8').split('\n');
                    const errLine = lines[errLineNum - 1] || '';

                    // Check if it's an await at module top level inside a function body
                    // that needs the function to be async
                    // Scan backwards for the enclosing function
                    let fixed = false;
                    let braceDepth = 0;
                    for (let i = errLineNum - 1; i >= 0; i--) {
                        const line = lines[i];
                        for (let c = line.length - 1; c >= 0; c--) {
                            if (line[c] === '}') braceDepth++;
                            else if (line[c] === '{') {
                                if (braceDepth === 0) {
                                    // Found opening brace — check this and preceding lines for function def
                                    for (let j = i; j >= Math.max(0, i - 5); j--) {
                                        const fline = lines[j];
                                        // export function name(
                                        if (fline.match(/\bexport\s+function\s+\w+\s*\(/) && !fline.match(/\basync\b/)) {
                                            lines[j] = fline.replace(/\bexport\s+function\b/, 'export async function');
                                            fixed = true;
                                            break;
                                        }
                                        // function name(
                                        if (fline.match(/^\s*function\s+\w+\s*\(/) && !fline.match(/\basync\b/)) {
                                            lines[j] = fline.replace(/\bfunction\b/, 'async function');
                                            fixed = true;
                                            break;
                                        }
                                        // method: name(args) {
                                        if (fline.match(/^\s+\w+\s*\([^)]*\)\s*\{/) && !fline.match(/\basync\b/) &&
                                            !fline.match(/^\s*(if|for|while|switch|catch|else)\b/)) {
                                            lines[j] = fline.replace(/^(\s+)(\w+\s*\()/, '$1async $2');
                                            fixed = true;
                                            break;
                                        }
                                        // const/let/var name = function(
                                        if (fline.match(/=\s*function\s*\(/) && !fline.match(/\basync\b/)) {
                                            lines[j] = fline.replace(/=\s*function\s*\(/, '= async function(');
                                            fixed = true;
                                            break;
                                        }
                                        // Arrow: (...) => {
                                        if (fline.match(/=>\s*\{?\s*$/) && !fline.match(/\basync\b/)) {
                                            // Find the start of the arrow params
                                            const arrowMatch = fline.match(/(\([^)]*\))\s*=>/);
                                            if (arrowMatch) {
                                                lines[j] = fline.replace(arrowMatch[1], 'async ' + arrowMatch[1]);
                                            } else {
                                                lines[j] = fline.replace(/(\w+)\s*=>/, 'async $1 =>');
                                            }
                                            fixed = true;
                                            break;
                                        }
                                    }
                                    break;
                                }
                                braceDepth--;
                            }
                        }
                        if (fixed) break;
                    }

                    if (fixed) {
                        fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
                        fixedThisRound++;
                        console.log(`  Fixed (iterative): ${rel} line ${errLineNum}`);
                    } else {
                        console.log(`  UNFIXED: ${rel}:${errLineNum} — ${errLine.trim()}`);
                    }
                }
            }
        }

        console.log(`Round ${iterations}: fixed ${fixedThisRound} files`);
        if (fixedThisRound === 0) break;
        totalFixed += fixedThisRound;
    }

    // Final check
    let remaining = 0;
    for (const filePath of files) {
        const err = hasSyntaxError(filePath);
        if (err) {
            remaining++;
            const rel = path.relative(JS_DIR, filePath);
            const lineMatch = err.match(/:(\d+)\n.*\n\s*(.*)/);
            console.log(`  REMAINING ERROR: ${rel}:${lineMatch?.[1]} — ${lineMatch?.[2] || '?'}`);
        }
    }

    console.log(`\nTotal fixed: ${totalFixed}, Remaining errors: ${remaining}`);
}

main();
