// Instrument dog_move to trace exactly what happens at step 17
import { readFileSync } from 'fs';
import { initRng, enableRngLog, getRngLog, disableRngLog, rn2, rnd, rn1 } from '../../js/rng.js';
import { initLevelGeneration, makelevel, wallification } from '../../js/dungeon.js';
import { simulatePostLevelInit } from '../../js/u_init.js';
import { Player } from '../../js/player.js';
import { rhack } from '../../js/commands.js';
import { FOV } from '../../js/vision.js';
import { NORMAL_SPEED, A_DEX, A_CON, IS_ROOM, CORR, ROOM, STAIRS, COLNO, ROWNO, ACCESSIBLE,
         IS_DOOR, D_CLOSED, D_LOCKED, isok } from '../../js/config.js';
import { dogfood, can_carry, DOGFOOD, CADAVER, ACCFOOD, MANFOOD, APPORT, POISON, UNDEF, TABU } from '../../js/dog.js';
import { couldsee, m_cansee } from '../../js/vision.js';
import { BOULDER } from '../../js/objects.js';
import { PM_GRID_BUG } from '../../js/monsters.js';

const session = JSON.parse(readFileSync('test/comparison/sessions/seed1.session.json', 'utf-8'));

enableRngLog();
initRng(session.seed);
initLevelGeneration();
const map = makelevel(1);
wallification(map);
const player = new Player();
player.initRole(11);

const screen = session.startup?.screen || [];
for (const line of screen) {
    if (!line) continue;
    const m = line.match(/St:(\d+)\s+Dx:(\d+)\s+Co:(\d+)\s+In:(\d+)\s+Wi:(\d+)\s+Ch:(\d+)/);
    if (m) {
        player.attributes[0] = parseInt(m[1]); player.attributes[1] = parseInt(m[4]);
        player.attributes[2] = parseInt(m[5]); player.attributes[3] = parseInt(m[2]);
        player.attributes[4] = parseInt(m[3]); player.attributes[5] = parseInt(m[6]);
    }
    const hpm = line.match(/HP:(\d+)\((\d+)\)\s+Pw:(\d+)\((\d+)\)\s+AC:(\d+)/);
    if (hpm) {
        player.hp = parseInt(hpm[1]); player.hpmax = parseInt(hpm[2]);
        player.pw = parseInt(hpm[3]); player.pwmax = parseInt(hpm[4]);
        player.ac = parseInt(hpm[5]);
    }
}
player.weapon = { name: 'spear', wsdam: 6, wldam: 8, enchantment: 1 };
if (map.upstair) { player.x = map.upstair.x; player.y = map.upstair.y; }
const initResult = simulatePostLevelInit(player, map, 1);

const nullDisplay = { putstr_message() {}, putstr_map() {} };
const fov = new FOV();

const game = {
    player, map, display: nullDisplay, fov,
    levels: { 1: map }, gameOver: false, turnCount: 0, wizard: true,
    seerTurn: initResult.seerTurn,
    mcalcmove(mon) {
        let mmove = mon.speed;
        const mmoveAdj = mmove % NORMAL_SPEED;
        mmove -= mmoveAdj;
        if (rn2(NORMAL_SPEED) < mmoveAdj) mmove += NORMAL_SPEED;
        return mmove;
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
    simulateTurnEnd() {
        this.turnCount++;
        this.player.turns = this.turnCount;
        for (const mon of this.map.monsters) {
            if (mon.dead) continue;
            mon.movement += this.mcalcmove(mon);
        }
        rn2(70);
        if (this.player.hp < this.player.hpmax) {
            const con = this.player.attributes ? this.player.attributes[A_CON] : 10;
            const heal = (this.player.level + con) > rn2(100) ? 1 : 0;
            if (heal) this.player.hp = Math.min(this.player.hp + heal, this.player.hpmax);
        }
        this.dosounds();
        rn2(20);
        this.player.hunger--;
        const moves = this.turnCount + 1;
        if (moves % 10 === 0) rn2(19);
        const dex = this.player.attributes ? this.player.attributes[A_DEX] : 14;
        rn2(40 + dex * 3);
        if (this.turnCount >= this.seerTurn) {
            this.seerTurn = this.turnCount + rn1(31, 15);
        }
    }
};

// Import movemon but use our own for step 17
import { movemon } from '../../js/monmove.js';

// Run steps 0-16 normally
for (let step = 0; step <= 16; step++) {
    const st = session.steps[step];
    const ch = st.key.charCodeAt(0);
    const result = await rhack(ch, game);
    if (result && result.tookTime) {
        movemon(game.map, game.player, game.display, game.fov);
        game.simulateTurnEnd();
    }
}

// Now at step 17, manually trace dog_move
const kitten = map.monsters.find(m => m.tame && !m.dead);
console.log('=== STEP 17 DETAILED DOG_MOVE TRACE ===');
console.log(`Player: (${player.x},${player.y})`);
console.log(`Kitten: (${kitten.mx},${kitten.my}) mvmt=${kitten.movement}`);
console.log(`Objects on map: ${map.objects.length}`);
for (let i = 0; i < map.objects.length; i++) {
    const obj = map.objects[i];
    console.log(`  [${i}] ${obj.name || 'otyp=' + obj.otyp} at (${obj.ox},${obj.oy}) oclass=${obj.oclass} cursed=${obj.cursed}`);
}
console.log(`Player inventory: ${player.inventory.length}`);
for (const obj of player.inventory) {
    console.log(`  ${obj.name || 'otyp=' + obj.otyp} oclass=${obj.oclass}`);
}

// Execute step 17's rhack
const st17 = session.steps[17];
const prevCount = getRngLog().length;
const ch17 = st17.key.charCodeAt(0);
const result17 = await rhack(ch17, game);

console.log(`\nAfter rhack: player=(${player.x},${player.y}) tookTime=${result17?.tookTime}`);

if (result17 && result17.tookTime) {
    // Now manually run movemon with instrumentation
    console.log('\n--- movemon ---');
    const SQSRCHRADIUS = 5;

    for (const mon of map.monsters) {
        if (mon.dead) continue;
        if (mon.movement >= NORMAL_SPEED) {
            mon.movement -= NORMAL_SPEED;
            console.log(`\nProcessing ${mon.name} at (${mon.mx},${mon.my}) mvmt=${mon.movement + NORMAL_SPEED}->${mon.movement}`);

            if (mon.tame) {
                // Inline dog_move trace
                const omx = mon.mx, omy = mon.my;
                const udist = (omx - player.x)**2 + (omy - player.y)**2;
                const edog = mon.edog || { apport: 0, hungrytime: 1000, whistletime: 0 };
                const turnCount = (player.turns || 0) + 1;
                const whappr = (turnCount - edog.whistletime) < 5 ? 1 : 0;

                console.log(`  udist=${udist} whappr=${whappr}`);
                console.log(`  dog_goal scan: omx=${omx} omy=${omy}`);
                const minX = Math.max(1, omx - SQSRCHRADIUS);
                const maxX = Math.min(COLNO - 1, omx + SQSRCHRADIUS);
                const minY = Math.max(0, omy - SQSRCHRADIUS);
                const maxY = Math.min(ROWNO - 1, omy + SQSRCHRADIUS);
                console.log(`  SQSRCH range: x=[${minX},${maxX}] y=[${minY},${maxY}]`);

                let gx = 0, gy = 0, gtyp = UNDEF;
                const inMastersSight = couldsee(map, player, omx, omy);
                const dogHasMinvent = !!(mon.minvent && mon.minvent.length > 0);
                const dogLoc = map.at(omx, omy);
                const playerLoc0 = map.at(player.x, player.y);
                const dogLit = !!(dogLoc && dogLoc.lit);
                const playerLit = !!(playerLoc0 && playerLoc0.lit);

                for (let oi = map.objects.length - 1; oi >= 0; oi--) {
                    const obj = map.objects[oi];
                    const ox = obj.ox, oy = obj.oy;
                    if (ox < minX || ox > maxX || oy < minY || oy > maxY) continue;
                    console.log(`    object in range: ${obj.name || 'otyp=' + obj.otyp} at (${ox},${oy})`);
                }

                console.log(`  gtyp=${gtyp} (UNDEF=${UNDEF})`);
                console.log(`  Follow player logic:`);
                console.log(`    IS_ROOM(player at ${player.x},${player.y})=${IS_ROOM(map.at(player.x, player.y)?.typ)}`);
                console.log(`    Player terrain typ=${map.at(player.x, player.y)?.typ}`);

                let appr;
                if (gtyp === UNDEF) {
                    gx = player.x; gy = player.y;
                    appr = (udist >= 9) ? 1 : (mon.flee) ? -1 : 0;
                    console.log(`    appr_init=${appr} (udist=${udist})`);
                    if (udist > 1) {
                        const playerLoc = map.at(player.x, player.y);
                        const playerInRoom = playerLoc && IS_ROOM(playerLoc.typ);
                        console.log(`    udist>1: playerInRoom=${playerInRoom}`);
                        if (!playerInRoom) {
                            console.log(`    !playerInRoom -> appr=1 (no rn2(4) consumed)`);
                            appr = 1;
                        }
                    } else {
                        console.log(`    udist<=1: skipping approach check`);
                    }
                    if (appr === 0) {
                        const onStairs = (player.x === map.upstair.x && player.y === map.upstair.y)
                            || (player.x === map.dnstair.x && player.y === map.dnstair.y);
                        console.log(`    appr=0: onStairs=${onStairs}`);
                        if (!onStairs) {
                            console.log(`    inventory scan would run: ${player.inventory.length} items`);
                        }
                    }
                }
            }
        }
    }

    // Now actually run the real movemon
    // We already consumed the kitten's movement above, so reset
    // Actually, let's just run the original code
}

// Show RNG trace for step 17
const stepLog = getRngLog().slice(prevCount);
const jsRng = stepLog.map(e => e.replace(/^\d+\s+/, '').replace(' = ', '='));
console.log('\n--- Step 17 RNG trace ---');
for (let i = 0; i < jsRng.length; i++) {
    console.log(`  [${i}] ${jsRng[i]}`);
}
