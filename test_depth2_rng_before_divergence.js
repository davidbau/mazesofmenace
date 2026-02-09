// test_depth2_rng_before_divergence.js - Check if RNG matches before divergence

import { initRng, enableRngLog, getRngLog, disableRngLog } from './js/rng.js';
import { initLevelGeneration, makelevel, wallification, place_lregion, setGameSeed } from './js/dungeon.js';
import { initrack } from './js/monmove.js';
import { simulatePostLevelInit } from './js/u_init.js';
import { Player } from './js/player.js';
import { rn2 } from './js/rng.js';
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

// Generate depth 1
const map1 = makelevel(1);
wallification(map1);
const player = new Player();
player.initRole(11); // Valkyrie
if (map1.upstair) {
    player.x = map1.upstair.x;
    player.y = map1.upstair.y;
}
simulatePostLevelInit(player, map1, 1);

// Generate depth 2
const beforeDepth2 = getRngLog().length;
const map2 = makelevel(2);
wallification(map2);
place_lregion(map2, 0, 0, 0, 0, 0, 0, 0, 0, 4);

// Pet arrival
rn2(10);
for (let i = 8; i >= 2; i--) rn2(i);
for (let i = 16; i >= 2; i--) rn2(i);
for (let i = 24; i >= 2; i--) rn2(i);

const fullLog = getRngLog();
const depth2Log = fullLog.slice(beforeDepth2);
const compactRng = depth2Log.map(toCompactRng);
const filteredRng = compactRng.filter(e => !isCompositeEntry(rngCallPart(e)) && !isMidlogEntry(e));

console.log('=== Checking RNG match BEFORE divergence ===');
console.log(`Divergence is at JS index 1336`);

let matchCount = 0;
let ji = 0, ci = 0;
while (ji < 1336 && ji < filteredRng.length && ci < cDepth2.rng.length) {
    // Skip midlog entries in C
    if (isMidlogEntry(cDepth2.rng[ci])) {
        ci++;
        continue;
    }

    const jsCall = rngCallPart(filteredRng[ji]);
    const cCall = rngCallPart(cDepth2.rng[ci]);
    if (jsCall === cCall) {
        matchCount++;
        ji++;
        ci++;
    } else {
        console.log(`MISMATCH at JS index ${ji}, C index ${ci}:`);
        console.log(`  JS: ${filteredRng[ji]}`);
        console.log(`  C:  ${cDepth2.rng[ci]}`);
        console.log(`\nContext:`);
        for (let k = Math.max(0, ji - 3); k <= Math.min(filteredRng.length - 1, ji + 3); k++) {
            const marker = k === ji ? '>>>' : '   ';
            console.log(`${marker} JS[${k}]: ${filteredRng[k]}`);
        }
        for (let k = Math.max(0, ci - 3); k <= Math.min(cDepth2.rng.length - 1, ci + 3); k++) {
            if (!isMidlogEntry(cDepth2.rng[k])) {
                const marker = k === ci ? '>>>' : '   ';
                console.log(`${marker} C[${k}]: ${cDepth2.rng[k]}`);
            }
        }
        break;
    }
}

console.log(`\nMatched: ${matchCount} / 1336 calls before divergence`);
if (matchCount === 1336) {
    console.log('✅ ALL calls before divergence MATCH!');
    console.log('\nThis means the difference in room count is NOT due to RNG divergence.');
    console.log('The rooms are created by the same RNG sequence, but JS interprets it differently.');
} else {
    console.log(`❌ Divergence happens earlier at call ${matchCount}`);
}

disableRngLog();
