#!/usr/bin/env node
// scripts/propagate_async.mjs — Mechanically propagate async/await through the codebase.
//
// Usage: node scripts/propagate_async.mjs [--dry-run] [--verbose]

import fs from 'fs';
import path from 'path';

const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

const JS_DIR = path.resolve(import.meta.dirname, '..', 'js');

// Initial set of async functions from pline.js
const SEED_ASYNC = new Set([
    'pline', 'custompline', 'vpline', 'raw_printf', 'vraw_printf',
    'urgent_pline', 'Norep', 'pline_dir', 'pline_xy', 'pline_mon',
    'You', 'Your', 'You_feel', 'You_cant', 'pline_The', 'There',
    'You_hear', 'You_see', 'verbalize',
    'putstr_message',
]);

// Skip these files — already converted manually or special
const SKIP_FILES = new Set([
    'pline.js', 'display.js', 'headless.js', 'replay_core.js',
]);

function getAllJsFiles(dir) {
    const results = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...getAllJsFiles(fullPath));
        } else if (entry.name.endsWith('.js') && !SKIP_FILES.has(entry.name)) {
            results.push(fullPath);
        }
    }
    return results;
}

// Parse a file: find function definitions with brace-counted ranges
function analyzeFile(filePath) {
    const source = fs.readFileSync(filePath, 'utf8');
    const lines = source.split('\n');

    const funcDefLines = new Map(); // lineIdx -> { name, isAsync, kind }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let m;

        // Strip comments for matching
        const stripped = line.replace(/\/\/.*$/, '').replace(/'[^']*'/g, '""').replace(/"[^"]*"/g, '""').replace(/`[^`]*`/g, '""');

        // export [async] function name(
        m = stripped.match(/^(\s*)(export\s+)?(async\s+)?function\s+(\w+)\s*\(/);
        if (m) {
            funcDefLines.set(i, { name: m[4], isAsync: !!m[3], kind: 'function', isExport: !!m[2] });
            continue;
        }

        // [async] name(args) { — method in class (indented, not a keyword)
        m = stripped.match(/^(\s+)(async\s+)?(\w+)\s*\([^)]*\)\s*\{/);
        if (m && !stripped.match(/^\s*(if|else|for|while|switch|try|catch|do|return|const|let|var|class|new|throw|typeof)\b/)) {
            funcDefLines.set(i, { name: m[3], isAsync: !!m[2], kind: 'method', isExport: false });
            continue;
        }

        // const/let/var name = [async] function(
        m = stripped.match(/^(\s*)(export\s+)?(const|let|var)\s+(\w+)\s*=\s*(async\s+)?function/);
        if (m) {
            funcDefLines.set(i, { name: m[4], isAsync: !!m[5], kind: 'function-expr', isExport: !!m[2] });
            continue;
        }

        // const/let/var name = [async] (...) => or arg =>
        m = stripped.match(/^(\s*)(export\s+)?(const|let|var)\s+(\w+)\s*=\s*(async\s+)?(?:\([^)]*\)|\w+)\s*=>/);
        if (m) {
            funcDefLines.set(i, { name: m[4], isAsync: !!m[5], kind: 'arrow', isExport: !!m[2] });
            continue;
        }
    }

    // Build function ranges using brace counting
    const funcRanges = [];
    let depth = 0;
    const braceStack = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let inStr = false;
        let strCh = '';
        for (let c = 0; c < line.length; c++) {
            const ch = line[c];
            if (inStr) {
                if (ch === strCh && line[c-1] !== '\\') inStr = false;
                continue;
            }
            if (ch === '"' || ch === "'" || ch === '`') {
                inStr = true;
                strCh = ch;
                continue;
            }
            if (ch === '/' && line[c+1] === '/') break;
            if (ch === '{') {
                const fd = funcDefLines.get(i);
                braceStack.push({ lineIdx: i, funcDef: fd || null, depth });
                depth++;
            } else if (ch === '}') {
                depth--;
                if (braceStack.length > 0) {
                    const top = braceStack.pop();
                    if (top.funcDef) {
                        funcRanges.push({ ...top.funcDef, startLine: top.lineIdx, endLine: i });
                    }
                }
            }
        }
    }

    return { lines, funcRanges, funcDefLines, source };
}

function findEnclosing(funcRanges, lineIdx) {
    let best = null;
    for (const fr of funcRanges) {
        if (fr.startLine < lineIdx && fr.endLine > lineIdx) {
            if (!best || fr.startLine > best.startLine) best = fr;
        }
    }
    return best;
}

// Check if a position in a line is inside a string literal
function isInString(line, pos) {
    let inStr = false;
    let strCh = '';
    for (let i = 0; i < pos; i++) {
        const ch = line[i];
        if (inStr) {
            if (ch === strCh && line[i-1] !== '\\') inStr = false;
        } else if (ch === '"' || ch === "'" || ch === '`') {
            inStr = true;
            strCh = ch;
        }
    }
    return inStr;
}

function main() {
    const files = getAllJsFiles(JS_DIR);
    console.log(`Found ${files.length} JS files to process`);

    const asyncFunctions = new Set(SEED_ASYNC);
    let pass = 0;

    while (true) {
        pass++;
        console.log(`\n=== Pass ${pass} (${asyncFunctions.size} async functions) ===`);

        const escaped = [...asyncFunctions].map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        const callRe = new RegExp(`(?<![\\w])(?:(?:this|\\w+)\\.)?(?:${escaped.join('|')})\\s*\\(`, 'g');

        let passModified = 0;
        const newAsyncSet = new Set();

        for (const filePath of files) {
            const { lines, funcRanges, funcDefLines, source } = analyzeFile(filePath);
            const callsPerLine = new Map();
            const enclosingToMakeAsync = new Set();

            // Set of lines that are function definitions (should not have await added)
            const defLineSet = new Set(funcDefLines.keys());

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                // Skip import/comment lines
                if (line.match(/^\s*import\s/)) continue;
                if (line.match(/^\s*\/\//)) continue;
                if (line.match(/^\s*\*/)) continue;

                // Skip function definition lines — the function name in a def is NOT a call
                if (defLineSet.has(i)) {
                    // But a definition line CAN also contain calls in its body (one-liners)
                    // e.g. `function foo() { return pline("x"); }`
                    // Only skip the definition part, not the body.
                    // For safety, check if there's a { on the line — if so, only look after it
                    const braceIdx = line.indexOf('{');
                    if (braceIdx < 0) continue; // no body on this line
                    // Only search after the opening brace
                    const bodyPart = line.substring(braceIdx + 1);
                    callRe.lastIndex = 0;
                    let match;
                    while ((match = callRe.exec(bodyPart)) !== null) {
                        const absPos = braceIdx + 1 + match.index;
                        if (isInString(line, absPos)) continue;
                        // Walk backwards to find the start of the full expression chain
                        let insertPos = absPos;
                        while (insertPos > braceIdx + 1) {
                            const beforeInsert = line.substring(0, insertPos);
                            const chainMatch = beforeInsert.match(/(\w+)\.\s*$/) || beforeInsert.match(/(\w+)\?\.\s*$/);
                            if (chainMatch) {
                                insertPos = insertPos - chainMatch[0].length;
                            } else {
                                break;
                            }
                        }
                        const before = line.substring(0, insertPos);
                        if (before.match(/await\s+$/)) continue;
                        const commentIdx = line.indexOf('//', braceIdx);
                        if (commentIdx >= 0 && absPos > commentIdx) continue;
                        const fnMatch = match[0].match(/(\w+)\s*\($/);
                        if (!fnMatch || !asyncFunctions.has(fnMatch[1])) continue;
                        if (!callsPerLine.has(i)) callsPerLine.set(i, []);
                        callsPerLine.get(i).push({ pos: insertPos, funcName: fnMatch[1] });
                    }
                    // Still need to make enclosing function async if there are calls here
                    if (callsPerLine.has(i)) {
                        const fd = funcDefLines.get(i);
                        if (fd && !fd.isAsync) {
                            enclosingToMakeAsync.add(i);
                            newAsyncSet.add(fd.name);
                        }
                    }
                    continue;
                }

                callRe.lastIndex = 0;
                let match;
                while ((match = callRe.exec(line)) !== null) {
                    const pos = match.index;
                    if (isInString(line, pos)) continue;
                    const commentIdx = line.indexOf('//');
                    if (commentIdx >= 0 && pos > commentIdx) continue;
                    const fnMatch = match[0].match(/(\w+)\s*\($/);
                    if (!fnMatch || !asyncFunctions.has(fnMatch[1])) continue;
                    // Walk backwards to find start of full property chain
                    let insertPos = pos;
                    while (insertPos > 0) {
                        const beforeInsert = line.substring(0, insertPos);
                        const chainMatch = beforeInsert.match(/(\w+)\.\s*$/) || beforeInsert.match(/(\w+)\?\.\s*$/);
                        if (chainMatch) {
                            insertPos = insertPos - chainMatch[0].length;
                        } else {
                            break;
                        }
                    }
                    const before = line.substring(0, insertPos);
                    if (before.match(/await\s+$/)) continue;

                    if (!callsPerLine.has(i)) callsPerLine.set(i, []);
                    callsPerLine.get(i).push({ pos: insertPos, funcName: fnMatch[1] });

                    const enclosing = findEnclosing(funcRanges, i);
                    if (enclosing && !enclosing.isAsync) {
                        enclosingToMakeAsync.add(enclosing.startLine);
                        newAsyncSet.add(enclosing.name);
                    }
                }
            }

            if (callsPerLine.size === 0 && enclosingToMakeAsync.size === 0) continue;

            // Apply transformations
            const newLines = [...lines];

            // Add await before calls (reverse column order)
            for (const [lineIdx, calls] of callsPerLine) {
                let line = newLines[lineIdx];
                const sorted = [...calls].sort((a, b) => b.pos - a.pos);
                for (const call of sorted) {
                    // Walk backwards from match to find start of full expression
                    // e.g. for `game.display.putstr_message(`, the match starts at
                    // `display.putstr_message(` but we want `await game.display...`
                    let insertPos = call.pos;
                    while (insertPos > 0) {
                        // Check if preceded by `identifier.` or `?.`
                        const beforeInsert = line.substring(0, insertPos);
                        const chainMatch = beforeInsert.match(/(\w+)\.\s*$/) || beforeInsert.match(/(\w+)\?\.\s*$/);
                        if (chainMatch) {
                            insertPos = insertPos - chainMatch[0].length;
                        } else {
                            break;
                        }
                    }
                    const before = line.substring(0, insertPos);
                    const after = line.substring(insertPos);
                    if (!before.match(/await\s+$/)) {
                        line = before + 'await ' + after;
                    }
                }
                newLines[lineIdx] = line;
            }

            // Make enclosing functions async
            for (const startLine of enclosingToMakeAsync) {
                let line = newLines[startLine];
                const fd = funcDefLines.get(startLine);
                if (!fd || fd.isAsync) continue;

                if (fd.kind === 'function') {
                    if (fd.isExport) {
                        line = line.replace(/(export\s+)(function\s)/, '$1async $2');
                    } else {
                        line = line.replace(/^(\s*)(function\s)/, '$1async $2');
                    }
                } else if (fd.kind === 'method') {
                    line = line.replace(/^(\s+)(\w+\s*\()/, '$1async $2');
                } else if (fd.kind === 'function-expr') {
                    line = line.replace(/(=\s*)(function)/, '$1async $2');
                } else if (fd.kind === 'arrow') {
                    line = line.replace(/(=\s*)(\(|(\w+)\s*=>)/, '$1async $2');
                }
                newLines[startLine] = line;
                // Mark as async so we don't re-process
                fd.isAsync = true;
            }

            const newSource = newLines.join('\n');
            if (newSource !== source) {
                passModified++;
                if (!DRY_RUN) {
                    fs.writeFileSync(filePath, newSource, 'utf8');
                }
                if (VERBOSE) console.log(`  Modified: ${path.relative(JS_DIR, filePath)}`);
            }
        }

        // Remove already-known functions
        for (const f of asyncFunctions) newAsyncSet.delete(f);

        console.log(`  Files modified: ${passModified}`);
        console.log(`  New async functions: ${newAsyncSet.size}`);

        if (newAsyncSet.size === 0) {
            console.log(`  Propagation complete.`);
            break;
        }

        for (const name of newAsyncSet) {
            asyncFunctions.add(name);
            if (VERBOSE) console.log(`    + ${name}`);
        }

        if (pass > 20) {
            console.error('Too many passes — possible infinite loop');
            break;
        }
    }

    console.log(`\n=== Summary ===`);
    console.log(`Total passes: ${pass}`);
    console.log(`Async functions (${asyncFunctions.size})`);
}

main();
