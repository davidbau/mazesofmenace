// test_depth2_divergence.js - Investigate depth 2 RNG divergence at call 1336

import { initRng, enableRngLog, getRngLog, disableRngLog } from './js/rng.js';
import { initLevelGeneration, makelevel, wallification, place_lregion, setGameSeed } from './js/dungeon.js';
import { initrack } from './js/monmove.js';
import { simulatePostLevelInit } from './js/u_init.js';
import { Player } from './js/player.js';
import { readFileSync } from 'fs';

// Filtering functions
function isMidlogEntry(entry) {
    return entry.length > 0 && (entry[0] === '>' || entry[0] === '<');
}

function isCompositeEntry(entry) {
    return entry.startsWith('rne(') || entry.startsWith('rnz(') || entry.startsWith('d(');
}

function toCompactRng(entry) {
    if (isMidlogEntry(entry)) return entry;
    return entry.replace(/^\d+\s+/, '');
}

function rngCallPart(entry) {
    const atIdx = entry.indexOf(' @ ');
    return atIdx >= 0 ? entry.substring(0, atIdx) : entry;
}

// Load C session
const cSession = JSON.parse(readFileSync('test/comparison/maps/seed163_maps_c.session.json', 'utf8'));
const cDepth2 = cSession.levels.find(l => l.depth === 2);

// Initialize
initrack();
enableRngLog();
initRng(163);
setGameSeed(163);
initLevelGeneration();

console.log('=== Generating depth 1 ===');
const map1 = makelevel(1);
wallification(map1);
// NO place_lregion for depth 1!

const player = new Player();
player.initRole(11); // Valkyrie
if (map1.upstair) {
    player.x = map1.upstair.x;
    player.y = map1.upstair.y;
}
simulatePostLevelInit(player, map1, 1);

console.log('=== Generating depth 2 ===');
const beforeDepth2 = getRngLog().length;

const map2 = makelevel(2);
wallification(map2);
// YES place_lregion for depth 2 (branch level)
place_lregion(map2, 0, 0, 0, 0, 0, 0, 0, 0, 4);

// Pet arrival for depth 2
import { rn2 } from './js/rng.js';
rn2(10); // untaming check
for (let i = 8; i >= 2; i--) rn2(i);   // 7 calls
for (let i = 16; i >= 2; i--) rn2(i);  // 15 calls
for (let i = 24; i >= 2; i--) rn2(i);  // 23 calls

const afterDepth2 = getRngLog().length;
const fullLog = getRngLog();
const depth2Log = fullLog.slice(beforeDepth2);
const compactRng = depth2Log.map(toCompactRng);
const filteredRng = compactRng.filter(e => !isCompositeEntry(rngCallPart(e)) && !isMidlogEntry(e));

console.log(`\nDepth 2 RNG calls: ${depth2Log.length} raw, ${filteredRng.length} filtered`);
console.log(`C depth 2: ${cDepth2.rng.length} calls`);

// Find divergence
console.log('\n=== Finding divergence ===');
let si = 0, ji = 0;
while (ji < filteredRng.length && si < cDepth2.rng.length) {
    if (isMidlogEntry(cDepth2.rng[si])) { si++; continue; }

    const jsPart = rngCallPart(filteredRng[ji]);
    const cPart = rngCallPart(cDepth2.rng[si]);

    if (jsPart !== cPart) {
        console.log(`Divergence at filtered index ${ji}/${si}:`);
        console.log(`  JS: ${filteredRng[ji]}`);
        console.log(`  C:  ${cDepth2.rng[si]}`);

        console.log(`\nContext (JS calls):`);
        for (let k = Math.max(0, ji - 10); k < Math.min(filteredRng.length, ji + 5); k++) {
            const marker = k === ji ? '>>>' : '   ';
            console.log(`${marker} [${k}]: ${filteredRng[k]}`);
        }

        console.log(`\nContext (C calls):`);
        for (let k = Math.max(0, si - 10); k < Math.min(cDepth2.rng.length, si + 5); k++) {
            if (!isMidlogEntry(cDepth2.rng[k])) {
                const marker = k === si ? '>>>' : '   ';
                console.log(`${marker} [${k}]: ${cDepth2.rng[k]}`);
            }
        }
        break;
    }
    ji++;
    si++;
}

if (ji >= filteredRng.length || si >= cDepth2.rng.length) {
    if (ji >= filteredRng.length) {
        console.log(`JS ended at ${ji}, C has ${cDepth2.rng.length - si} more calls`);
    } else {
        console.log(`C ended at ${si}, JS has ${filteredRng.length - ji} more calls`);
    }
}

disableRngLog();
