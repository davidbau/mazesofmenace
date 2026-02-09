// test_depth2_rooms.js - Check room count and types at depth 2

import { initRng, enableRngLog, getRngLog } from './js/rng.js';
import { initLevelGeneration, makelevel, wallification, place_lregion, setGameSeed } from './js/dungeon.js';
import { initrack } from './js/monmove.js';
import { simulatePostLevelInit } from './js/u_init.js';
import { Player } from './js/player.js';
import { rn2 } from './js/rng.js';

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

console.log('=== Generating depth 2 ===');
const beforeDepth2 = getRngLog().length;

const map2 = makelevel(2);

console.log(`\nDepth 2 rooms: ${map2.nroom} total`);
console.log(`Upstairs: (${map2.upstair.x}, ${map2.upstair.y})`);
console.log(`Downstairs: (${map2.dnstair.x}, ${map2.dnstair.y})`);

console.log('\nRoom details:');
for (let i = 0; i < map2.nroom; i++) {
    const room = map2.rooms[i];
    const rtypeName = ['OROOM', 'THEMEROOM', 'SHOPBASE', 'BEEHIVE', 'ZOO', 'REALZOO',
                       'BARRACKS', 'LEPREHALL', 'DRAGONLAIR', 'MORGUE', 'ARMORY',
                       'COURT', 'LIBRARY', 'TEMPLE', 'SWAMP', 'VAULT'][room.rtype] || `UNKNOWN(${room.rtype})`;

    const has_upstairs = (map2.upstair.x >= room.lx && map2.upstair.x <= room.hx
                       && map2.upstair.y >= room.ly && map2.upstair.y <= room.hy);
    const has_dnstairs = (map2.dnstair.x >= room.lx && map2.dnstair.x <= room.hx
                       && map2.dnstair.y >= room.ly && map2.dnstair.y <= room.hy);

    console.log(`  Room ${i}: rtype=${rtypeName}, needjoining=${room.needjoining}, ` +
                `stairs=${has_upstairs ? 'UP' : ''}${has_dnstairs ? 'DN' : ''}${!has_upstairs && !has_dnstairs ? 'NONE' : ''}`);
}

// Now run the candidate selection for phase 2
console.log('\n=== Candidate selection (like generate_stairs_find_room) ===');
for (let phase = 2; phase > -1; phase--) {
    const candidates = [];
    for (let i = 0; i < map2.nroom; i++) {
        const room = map2.rooms[i];
        const has_upstairs = (map2.upstair.x >= room.lx && map2.upstair.x <= room.hx
                           && map2.upstair.y >= room.ly && map2.upstair.y <= room.hy);
        const has_dnstairs = (map2.dnstair.x >= room.lx && map2.dnstair.x <= room.hx
                           && map2.dnstair.y >= room.ly && map2.dnstair.y <= room.hy);
        const good = (room.needjoining || phase < 0)
            && ((!has_dnstairs && !has_upstairs) || phase < 1)
            && (room.rtype === 0 || (phase < 2 && room.rtype === 1)); // OROOM=0, THEMEROOM=1
        if (good) candidates.push(i);
    }
    console.log(`Phase ${phase}: ${candidates.length} candidates - ${candidates.join(', ')}`);
    if (candidates.length > 0) {
        console.log(`  Would call rn2(${candidates.length})`);
        break;
    }
}
