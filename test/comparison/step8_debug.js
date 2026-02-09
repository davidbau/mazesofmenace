import { replaySession } from './session_helpers.js';
import { readFileSync } from 'fs';
import { initRng } from '../../js/rng.js';
import { initLevelGeneration, makelevel, wallification } from '../../js/dungeon.js';
import { simulatePostLevelInit } from '../../js/u_init.js';
import { Player } from '../../js/player.js';

const session = JSON.parse(readFileSync('test/comparison/sessions/seed1.session.json', 'utf-8'));

// Create the map and look at monster data
initRng(session.seed);
initLevelGeneration();
const map = makelevel(1);
wallification(map);
const player = new Player();
player.initRole(11);
if (map.upstair) { player.x = map.upstair.x; player.y = map.upstair.y; }
simulatePostLevelInit(player, map, 1);

console.log(`Player at (${player.x}, ${player.y}), effectiveAC: ${player.effectiveAC}, AC: ${player.ac}`);
for (const mon of map.monsters) {
    console.log(`${mon.name}: mlevel=${mon.mlevel}`, JSON.stringify(mon, (k,v) => {
        if (k === 'mtrack') return undefined; // skip noise
        return v;
    }, 2));
}

// Also replay and compare step 9
const result = await replaySession(session.seed, session);
const STEP = 9;
const jsStep = result.steps[STEP];
const cStep = session.steps[STEP];
console.log(`\nStep ${STEP} JS trace vs C:`);
const maxLen = Math.max(jsStep.rng.length, cStep.rng.length);
for (let i = 0; i < Math.min(30, maxLen); i++) {
    const js = i < jsStep.rng.length ? jsStep.rng[i] : '(end)';
    const c = i < cStep.rng.length ? cStep.rng[i] : '(end)';
    const jsPart = js.split(' @ ')[0];
    const cPart = c.split(' @ ')[0];
    const match = jsPart === cPart ? '✓' : '✗';
    console.log(`  [${String(i).padStart(2)}] ${match} JS: ${jsPart.padEnd(25)} C: ${c}`);
}
console.log(`JS total: ${jsStep.rngCalls}, C total: ${cStep.rng.length}`);
