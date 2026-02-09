// test_depth2_before_stairs.js - Check rooms BEFORE stairs are placed

import { initRng, enableRngLog } from './js/rng.js';
import { initLevelGeneration, setGameSeed } from './js/dungeon.js';
import { initrack } from './js/monmove.js';
import { simulatePostLevelInit } from './js/u_init.js';
import { Player } from './js/player.js';
import { rn2 } from './js/rng.js';

// We need to check room counts
import { OROOM, THEMEROOM } from './js/config.js';

// Initialize
initrack();
enableRngLog();
initRng(163);
setGameSeed(163);
initLevelGeneration();

// Generate depth 1
import { makelevel, wallification } from './js/dungeon.js';
const map1 = makelevel(1);
wallification(map1);
const player = new Player();
player.initRole(11); // Valkyrie
if (map1.upstair) {
    player.x = map1.upstair.x;
    player.y = map1.upstair.y;
}
simulatePostLevelInit(player, map1, 1);

console.log('=== Checking depth 2 BEFORE makelevel completes ===');

// I need to modify the approach - let me just count what makelevel creates
const map2 = makelevel(2);

// The stairs are placed during makelevel, but let me check room creation
// Actually, let me just count OROOM vs THEMEROOM before stairs

console.log(`\nDepth 2 has ${map2.nroom} rooms`);

let oroomCount = 0;
let themeroomCount = 0;
for (let i = 0; i < map2.nroom; i++) {
    if (map2.rooms[i].rtype === OROOM) oroomCount++;
    if (map2.rooms[i].rtype === THEMEROOM) themeroomCount++;
}

console.log(`OROOM count: ${oroomCount}`);
console.log(`THEMEROOM count: ${themeroomCount}`);
console.log(`Total: ${oroomCount + themeroomCount}`);

console.log('\nIf C has 7 OROOM rooms and JS has 9, then:');
console.log('  - JS created 2 extra OROOM rooms');
console.log('  - OR C created 2 THEMEROOM rooms where JS created OROOM');
console.log('  - OR there\'s a difference in room count logic');
