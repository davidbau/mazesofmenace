// test/comparison/step17_trace.js -- Debug trace for step 17 RNG divergence
//
// Replays seed 1 session steps 0-17, printing at each step:
//   - Step number, key, player position
//   - Kitten position before/after, movement points, number of movemon passes
//   - Objects within SQSRCHRADIUS=5 of kitten (before each dochug pass)
//   - First 30 RNG log entries for that step
//   - Side-by-side comparison with session's expected RNG trace
//   - Analysis of dog_move path: udist, appr, playerInRoom, inventory scan
//
// Key finding: The kitten's position diverges between C and JS because the RNG
// happens to match through step 16 despite subtle game state differences (e.g.,
// the player's inventory being scanned when the kitten is close enough for
// appr=0). At step 17, the kitten's different position causes it to see a
// different number of objects within SQSRCHRADIUS, leading to different numbers
// of obj_resists/rn2(100) calls.
//
// Run: node test/comparison/step17_trace.js

import { readFileSync } from 'fs';
import { initRng, enableRngLog, getRngLog, disableRngLog, rn2 } from '../../js/rng.js';
import { initLevelGeneration, makelevel, wallification } from '../../js/dungeon.js';
import { simulatePostLevelInit } from '../../js/u_init.js';
import { Player } from '../../js/player.js';
import { rhack } from '../../js/commands.js';
import { movemon } from '../../js/monmove.js';
import { FOV } from '../../js/vision.js';
import { NORMAL_SPEED, A_DEX, A_CON, IS_ROOM, COLNO, ROWNO } from '../../js/config.js';
import { objectData } from '../../js/objects.js';
import { dogfood, DOGFOOD, CADAVER, ACCFOOD, MANFOOD, APPORT, POISON, UNDEF, TABU } from '../../js/dog.js';
import { rn1 } from '../../js/rng.js';
import { couldsee, m_cansee } from '../../js/vision.js';

const SQSRCHRADIUS = 5;

const DOGFOOD_NAMES = ['DOGFOOD', 'CADAVER', 'ACCFOOD', 'MANFOOD', 'APPORT', 'POISON', 'UNDEF', 'TABU'];

function dogfoodName(val) {
    return DOGFOOD_NAMES[val] || `UNKNOWN(${val})`;
}

function objName(otyp) {
    const od = objectData[otyp];
    return od ? (od.name || od.desc || `otyp=${otyp}`) : `otyp=${otyp}`;
}

// Convert JS RNG log entry to compact format (matching session_helpers.js)
function toCompactRng(entry) {
    const noCount = entry.replace(/^\d+\s+/, '');
    return noCount.replace(' = ', '=');
}

// Strip @ source tag to get just fn(arg)=result
function rngCallPart(entry) {
    const atIdx = entry.indexOf(' @ ');
    return atIdx >= 0 ? entry.substring(0, atIdx) : entry;
}

// Compute squared distance (matching C's dist2/distu)
function dist2(x1, y1, x2, y2) {
    return (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
}

// ========================================================================
// Load session
// ========================================================================
const session = JSON.parse(readFileSync('test/comparison/sessions/seed1.session.json', 'utf-8'));

// ========================================================================
// Initialize game (matching replaySession from session_helpers.js)
// ========================================================================
enableRngLog();
initRng(session.seed);
initLevelGeneration();

const map = makelevel(1);
wallification(map);

const player = new Player();
player.initRole(11); // PM_VALKYRIE
player.name = session.character?.name || 'Wizard';
player.gender = session.character?.gender === 'female' ? 1 : 0;

// Parse attributes from session screen
const screen = session.startup?.screen || [];
for (const line of screen) {
    if (!line) continue;
    const m = line.match(/St:(\d+)\s+Dx:(\d+)\s+Co:(\d+)\s+In:(\d+)\s+Wi:(\d+)\s+Ch:(\d+)/);
    if (m) {
        player.attributes[0] = parseInt(m[1]); // A_STR
        player.attributes[1] = parseInt(m[4]); // A_INT
        player.attributes[2] = parseInt(m[5]); // A_WIS
        player.attributes[3] = parseInt(m[2]); // A_DEX
        player.attributes[4] = parseInt(m[3]); // A_CON
        player.attributes[5] = parseInt(m[6]); // A_CHA
    }
    const hpm = line.match(/HP:(\d+)\((\d+)\)\s+Pw:(\d+)\((\d+)\)\s+AC:(\d+)/);
    if (hpm) {
        player.hp = parseInt(hpm[1]);
        player.hpmax = parseInt(hpm[2]);
        player.pw = parseInt(hpm[3]);
        player.pwmax = parseInt(hpm[4]);
        player.ac = parseInt(hpm[5]);
    }
}

player.weapon = { name: 'spear', wsdam: 6, wldam: 8, enchantment: 1 };

if (map.upstair) {
    player.x = map.upstair.x;
    player.y = map.upstair.y;
}

const initResult = simulatePostLevelInit(player, map, 1);

// ========================================================================
// HeadlessGame (inlined from session_helpers.js)
// ========================================================================

const nullDisplay = {
    putstr_message() {},
    putstr() {},
    clearRow() {},
    renderMap() {},
    renderStatus() {},
};

const game = {
    player,
    map,
    display: nullDisplay,
    fov: new FOV(),
    levels: { 1: map },
    gameOver: false,
    turnCount: 0,
    wizard: true,
    seerTurn: initResult.seerTurn,

    mcalcmove(mon) {
        let mmove = mon.speed;
        const mmoveAdj = mmove % NORMAL_SPEED;
        mmove -= mmoveAdj;
        if (rn2(NORMAL_SPEED) < mmoveAdj) mmove += NORMAL_SPEED;
        return mmove;
    },

    simulateTurnEnd() {
        this.turnCount++;
        this.player.turns = this.turnCount;

        for (const mon of this.map.monsters) {
            if (mon.dead) continue;
            mon.movement += this.mcalcmove(mon);
        }

        rn2(70);   // monster spawn check

        if (this.player.hp < this.player.hpmax) {
            const con = this.player.attributes ? this.player.attributes[A_CON] : 10;
            const heal = (this.player.level + con) > rn2(100) ? 1 : 0;
            if (heal) {
                this.player.hp = Math.min(this.player.hp + heal, this.player.hpmax);
            }
        }

        this.dosounds();
        rn2(20);   // gethungry
        this.player.hunger--;

        const moves = this.turnCount + 1;
        if (moves % 10 === 0) {
            rn2(19); // exercise(A_CON, TRUE)
        }

        const dex = this.player.attributes ? this.player.attributes[A_DEX] : 14;
        rn2(40 + dex * 3); // engrave wipe

        if (this.turnCount >= this.seerTurn) {
            this.seerTurn = this.turnCount + rn1(31, 15);
        }
    },

    dosounds() {
        const f = this.map.flags;
        if (f.nfountains && !rn2(400)) { rn2(3); }
        if (f.nsinks && !rn2(300)) { rn2(2); }
        if (f.has_court && !rn2(200)) { return; }
        if (f.has_swamp && !rn2(200)) { rn2(2); return; }
        if (f.has_vault && !rn2(200)) { rn2(2); return; }
        if (f.has_beehive && !rn2(200)) { return; }
        if (f.has_morgue && !rn2(200)) { return; }
        if (f.has_barracks && !rn2(200)) { rn2(3); return; }
        if (f.has_zoo && !rn2(200)) { return; }
        if (f.has_shop && !rn2(200)) { rn2(2); return; }
        if (f.has_temple && !rn2(200)) { return; }
    },
};

// ========================================================================
// Replay steps 0-17 with detailed per-step logging
// ========================================================================

const MAX_STEP = 17;
const SHOW_RNG = 30;

console.log('='.repeat(80));
console.log('Step 17 RNG Divergence Trace -- Seed 1');
console.log('='.repeat(80));
console.log();

// Show initial state
console.log(`Initial objects on map: ${map.objects.length}`);
for (const obj of map.objects) {
    console.log(`  otyp=${obj.otyp} "${objName(obj.otyp)}" at (${obj.ox},${obj.oy}) oclass=${obj.oclass}`);
}
console.log();

console.log(`Initial monsters on map: ${map.monsters.length}`);
for (const mon of map.monsters) {
    console.log(`  ${mon.name} at (${mon.mx},${mon.my}) tame=${mon.tame} mnum=${mon.mnum ?? mon.mndx ?? '?'} speed=${mon.speed}`);
}
console.log();

for (let stepIdx = 0; stepIdx <= MAX_STEP; stepIdx++) {
    const step = session.steps[stepIdx];
    const kitten = map.monsters.find(m => m.tame && !m.dead);
    const preMx = kitten ? kitten.mx : '?';
    const preMy = kitten ? kitten.my : '?';
    const preMvmt = kitten ? kitten.movement : '?';

    // Show objects within SQSRCHRADIUS of kitten BEFORE the step
    const nearbyObjsBefore = [];
    if (kitten) {
        for (let oi = map.objects.length - 1; oi >= 0; oi--) {
            const obj = map.objects[oi];
            if (Math.abs(obj.ox - kitten.mx) <= SQSRCHRADIUS
                && Math.abs(obj.oy - kitten.my) <= SQSRCHRADIUS) {
                nearbyObjsBefore.push({
                    otyp: obj.otyp,
                    name: objName(obj.otyp),
                    ox: obj.ox,
                    oy: obj.oy,
                    oclass: obj.oclass,
                    dist: Math.max(Math.abs(obj.ox - kitten.mx), Math.abs(obj.oy - kitten.my)),
                });
            }
        }
    }

    // Compute dog_move analysis BEFORE step executes
    let dogMoveAnalysis = '';
    if (kitten && step.key !== ':') {
        const udist = dist2(kitten.mx, kitten.my, player.x, player.y);
        const appr0 = (udist >= 9) ? 1 : (kitten.flee) ? -1 : 0;
        const playerLoc = map.at(player.x, player.y);
        const playerInRoom = playerLoc && IS_ROOM(playerLoc.typ);
        const onStairs = (player.x === map.upstair.x && player.y === map.upstair.y)
            || (player.x === map.dnstair.x && player.y === map.dnstair.y);

        // How many movemon passes will the kitten get?
        const passes = Math.floor(kitten.movement / NORMAL_SPEED);

        dogMoveAnalysis = `  dog_move: udist=${udist} appr_init=${appr0} playerInRoom=${!!playerInRoom} onStairs=${onStairs} passes=${passes}`;
        if (appr0 === 0 && !onStairs) {
            dogMoveAnalysis += ' --> INVENTORY SCAN may run (appr=0, not on stairs)';
        }
    }

    // Capture RNG for this step
    const prevCount = getRngLog().length;

    // Execute the step
    const ch = step.key.charCodeAt(0);
    const result = await rhack(ch, game);

    if (result && result.tookTime) {
        movemon(game.map, game.player, game.display, game.fov);
        game.simulateTurnEnd();
    }

    const fullLog = getRngLog();
    const stepLog = fullLog.slice(prevCount);
    const jsRng = stepLog.map(toCompactRng);

    const postMx = kitten ? kitten.mx : '?';
    const postMy = kitten ? kitten.my : '?';
    const postMvmt = kitten ? kitten.movement : '?';

    // Session's expected RNG
    const sessionRng = step.rng || [];

    // Find first divergence
    let divIdx = -1;
    const minLen = Math.min(jsRng.length, sessionRng.length);
    for (let i = 0; i < minLen; i++) {
        if (rngCallPart(jsRng[i]) !== rngCallPart(sessionRng[i])) {
            divIdx = i;
            break;
        }
    }
    if (divIdx === -1 && jsRng.length !== sessionRng.length) {
        divIdx = minLen;
    }

    // Count obj_resists calls in each trace
    const jsObjResists = jsRng.filter(r => r.includes('rn2(100)=')).length;
    const cObjResists = sessionRng.filter(r => r.includes('obj_resists')).length;

    // Print step header
    const marker = divIdx >= 0 ? ' *** DIVERGES ***' : '';
    console.log('-'.repeat(80));
    console.log(`Step ${stepIdx} (key="${step.key}") player=(${player.x},${player.y})${marker}`);
    console.log(`  Kitten: (${preMx},${preMy}) mvmt=${preMvmt} -> (${postMx},${postMy}) mvmt=${postMvmt}`);
    console.log(`  Objects on map: ${map.objects.length}, alive monsters: ${map.monsters.filter(m=>!m.dead).length}`);

    if (dogMoveAnalysis) {
        console.log(dogMoveAnalysis);
    }

    // Show objects near kitten (before step)
    if (nearbyObjsBefore.length > 0) {
        console.log(`  Objects within SQSRCHRADIUS=${SQSRCHRADIUS} of kitten at (${preMx},${preMy}):`);
        for (const obj of nearbyObjsBefore) {
            console.log(`    otyp=${obj.otyp} "${obj.name}" at (${obj.ox},${obj.oy}) cheby_dist=${obj.dist}`);
        }
    } else if (kitten) {
        console.log(`  No objects within SQSRCHRADIUS=${SQSRCHRADIUS} of kitten at (${preMx},${preMy})`);
    }

    // RNG comparison
    console.log(`  RNG calls: JS=${jsRng.length} session=${sessionRng.length} | obj_resists: JS=${jsObjResists} C=${cObjResists}`);
    if (divIdx >= 0) {
        console.log(`  DIVERGENCE at call ${divIdx}:`);
        console.log(`    JS:      ${jsRng[divIdx] || '(end)'}`);
        console.log(`    Session: ${sessionRng[divIdx] || '(end)'}`);
    }

    // Show first N RNG entries side-by-side
    const showCount = Math.min(SHOW_RNG, Math.max(jsRng.length, sessionRng.length));
    if (showCount > 0) {
        console.log(`  RNG trace (first ${showCount}):`);
        for (let i = 0; i < showCount; i++) {
            const js = jsRng[i] || '(end)';
            const se = sessionRng[i] || '(end)';
            const match = (jsRng[i] && sessionRng[i] && rngCallPart(jsRng[i]) === rngCallPart(sessionRng[i]))
                ? '  ' : '>>'; // mark divergent lines
            console.log(`    ${match} [${i}] JS: ${js}`);
            if (!jsRng[i] || !sessionRng[i] || rngCallPart(jsRng[i]) !== rngCallPart(sessionRng[i])) {
                console.log(`    ${match} [${i}] C:  ${se}`);
            }
        }
    }
    console.log();
}

// ========================================================================
// Final summary
// ========================================================================
const kittenFinal = map.monsters.find(m => m.tame && !m.dead);
if (kittenFinal) {
    console.log('='.repeat(80));
    console.log(`Final state: Kitten at (${kittenFinal.mx},${kittenFinal.my}), turnCount=${game.turnCount}`);
    console.log(`All objects on map (${map.objects.length}):`);
    for (const obj of map.objects) {
        const dx = Math.abs(obj.ox - kittenFinal.mx);
        const dy = Math.abs(obj.oy - kittenFinal.my);
        const inRange = (dx <= SQSRCHRADIUS && dy <= SQSRCHRADIUS);
        console.log(`  otyp=${obj.otyp} "${objName(obj.otyp)}" at (${obj.ox},${obj.oy}) ${inRange ? '<-- IN RANGE' : ''}`);
    }
}

console.log();
console.log('='.repeat(80));
console.log('Step 17 Analysis');
console.log('='.repeat(80));

console.log(`
Player inventory at step 17 (${player.inventory.length} items):`);
for (const item of player.inventory) {
    console.log(`  otyp=${item.otyp} "${objName(item.otyp)}" oclass=${item.oclass}`);
}

console.log(`
Stairs: up=(${map.upstair.x},${map.upstair.y}) down=(${map.dnstair.x},${map.dnstair.y})

C trace for step 17 shows 4 obj_resists (rn2(100)) calls, then post-distfleeck.
JS trace for step 17 shows 2 obj_resists (rn2(100)) calls, then post-distfleeck.

The obj_resists calls come from three possible sources:
  1. dog_goal scan: iterates ALL map objects within SQSRCHRADIUS, calling dogfood()
     on each (1 rn2(100) per object via obj_resists)
  2. Player inventory scan: if appr==0 and player NOT on stairs, iterates player
     inventory calling dogfood() on each item (1 rn2(100) per item)
  3. Position eval food check: at each adjacent position, calls dogfood() on objects
     there (1 rn2(100) per object found at the position)

Key question: Why does C produce 4 and JS produce 2?

  - JS kitten at (63,3): 1 map object in SQSRCHRADIUS (corpse at (62,3))
    udist = dist2(63,3, 60,4) = 10 >= 9, so appr=1
    --> No inventory scan (appr != 0)
    --> dog_goal: 1 obj_resists (corpse)
    --> position eval: corpse at adjacent (62,3) -> 1 obj_resists -> CADAVER found -> break
    --> Total: 2 obj_resists

  - C kitten position may differ from (63,3), seeing 4 objects.
    OR C has extra objects on the map (e.g., monster inventory drops).
    OR the kitten in C is close enough to the player for appr=0 + inventory scan.
`);

disableRngLog();
