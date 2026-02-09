import { replaySession } from './session_helpers.js';
import { readFileSync } from 'fs';
import { enableRngLog, getRngLog, initRng, rn2, rnd, disableRngLog } from '../../js/rng.js';
import { initLevelGeneration, makelevel, wallification } from '../../js/dungeon.js';
import { simulatePostLevelInit } from '../../js/u_init.js';
import { Player } from '../../js/player.js';

const session = JSON.parse(readFileSync('test/comparison/sessions/seed1.session.json', 'utf-8'));

// Just create the map and look at monster data
initRng(session.seed);
initLevelGeneration();
const map = makelevel(1);
wallification(map);
const player = new Player();
player.initRole(11);
if (map.upstair) { player.x = map.upstair.x; player.y = map.upstair.y; }
simulatePostLevelInit(player, map, 1);

console.log(`Player at (${player.x}, ${player.y}), effectiveAC: ${player.effectiveAC}, AC: ${player.ac}`);
console.log(`Monsters on level: ${map.monsters.length}`);
for (const mon of map.monsters) {
    console.log(`  ${mon.name} at (${mon.mx}, ${mon.my}) speed=${mon.speed} tame=${!!mon.tame} sleeping=${!!mon.sleeping}`);
    console.log(`    attacks: ${JSON.stringify(mon.attacks)}`);
    console.log(`    mlevel=${mon.mlevel} passive=${!!mon.passive}`);
}
