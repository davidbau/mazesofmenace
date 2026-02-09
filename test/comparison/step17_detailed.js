// Detailed step-by-step trace for seed 1 steps 0-17
// Tracks kitten + fox positions, terrain at player, objects near kitten
import { readFileSync } from 'fs';
import { initRng, enableRngLog, getRngLog, disableRngLog, rn2, rnd, rn1 } from '../../js/rng.js';
import { initLevelGeneration, makelevel, wallification } from '../../js/dungeon.js';
import { simulatePostLevelInit } from '../../js/u_init.js';
import { Player } from '../../js/player.js';
import { rhack } from '../../js/commands.js';
import { movemon } from '../../js/monmove.js';
import { FOV } from '../../js/vision.js';
import { NORMAL_SPEED, A_DEX, A_CON, IS_ROOM, CORR, ROOM, STAIRS } from '../../js/config.js';
import { dogfood, DOGFOOD, CADAVER, ACCFOOD, MANFOOD, APPORT, UNDEF, TABU } from '../../js/dog.js';

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

const SQSRCHRADIUS = 5;

// Show player inventory
console.log('Player inventory:');
for (const obj of player.inventory) {
    console.log(`  ${obj.name || 'otyp=' + obj.otyp} oclass=${obj.oclass}`);
}
console.log();

function typName(typ) {
    const names = ['STONE','VWALL','HWALL','TLCORNER','TRCORNER','BLCORNER',
        'BRCORNER','CROSSWALL','TUWALL','TDWALL','TLWALL','TRWALL',
        'DBWALL','TREE','SDOOR','SCORR','POOL','MOAT','WATER',
        'DRAWBRIDGE_UP','LAVAPOOL','LAVAWALL','IRONBARS','DOOR','CORR',
        'ROOM','STAIRS','LADDER','FOUNTAIN','THRONE','SINK','GRAVE',
        'ALTAR','ICE','DRAWBRIDGE_DOWN','AIR','CLOUD'];
    return names[typ] || `?${typ}`;
}

// Run steps 0-17
for (let step = 0; step <= 17; step++) {
    const kitten = map.monsters.find(m => m.tame && !m.dead);
    const fox = map.monsters.find(m => !m.tame && !m.dead);
    const st = session.steps[step];

    const playerLoc = map.at(player.x, player.y);
    const playerTyp = playerLoc ? playerLoc.typ : -1;
    const playerIsRoom = playerLoc ? IS_ROOM(playerLoc.typ) : false;

    const kittenPre = kitten ? `(${kitten.mx},${kitten.my}) mvmt=${kitten.movement}` : 'dead';
    const foxPre = fox ? `(${fox.mx},${fox.my}) hp=${fox.mhp}/${fox.mhpmax} mvmt=${fox.movement}` : 'dead';

    // Calculate udist and appr analysis for kitten
    let kittenAnalysis = '';
    if (kitten) {
        const udist = (kitten.mx - player.x)**2 + (kitten.my - player.y)**2;
        kittenAnalysis += ` udist=${udist}`;

        // What objects within SQSRCHRADIUS?
        const nearObjs = [];
        for (const obj of map.objects) {
            if (Math.abs(obj.ox - kitten.mx) <= SQSRCHRADIUS &&
                Math.abs(obj.oy - kitten.my) <= SQSRCHRADIUS) {
                nearObjs.push(`${obj.name||'otyp='+obj.otyp}@(${obj.ox},${obj.oy})`);
            }
        }
        kittenAnalysis += ` nearObjs=${nearObjs.length}[${nearObjs.join(', ')}]`;
    }

    const prevCount = getRngLog().length;

    const ch = st.key.charCodeAt(0);
    const result = await rhack(ch, game);
    if (result && result.tookTime) {
        movemon(game.map, game.player, game.display, game.fov);
        game.simulateTurnEnd();
    }

    const kittenPost = kitten ? `(${kitten.mx},${kitten.my}) mvmt=${kitten.movement}` : 'dead';
    const foxPost = fox ? (fox.dead ? 'KILLED' : `(${fox.mx},${fox.my}) hp=${fox.mhp}`) : 'dead';

    const stepLog = getRngLog().slice(prevCount);
    const jsRng = stepLog.map(e => e.replace(/^\d+\s+/, '').replace(' = ', '='));
    const sessionRng = session.steps[step].rng || [];

    // Find divergence
    let divergeIdx = -1;
    const minLen = Math.min(jsRng.length, sessionRng.length);
    for (let i = 0; i < minLen; i++) {
        const jsCall = jsRng[i].indexOf(' @ ') >= 0 ? jsRng[i].substring(0, jsRng[i].indexOf(' @ ')) : jsRng[i];
        const cCall = sessionRng[i].indexOf(' @ ') >= 0 ? sessionRng[i].substring(0, sessionRng[i].indexOf(' @ ')) : sessionRng[i];
        if (jsCall !== cCall) { divergeIdx = i; break; }
    }
    if (divergeIdx === -1 && jsRng.length !== sessionRng.length) divergeIdx = minLen;

    const status = divergeIdx >= 0 ? `DIVERGE@${divergeIdx}` : 'OK';

    console.log(`--- Step ${step} (key=${JSON.stringify(st.key)}) player=(${player.x},${player.y}) terrain=${typName(playerTyp)} IS_ROOM=${playerIsRoom} ${status}`);
    console.log(`  kitten: ${kittenPre} -> ${kittenPost}${kittenAnalysis}`);
    console.log(`  fox: ${foxPre} -> ${foxPost}`);
    console.log(`  objects: ${map.objects.length} | rng: JS=${jsRng.length} C=${sessionRng.length}`);

    if (divergeIdx >= 0 || step >= 14) {
        const showN = Math.min(Math.max(jsRng.length, sessionRng.length), 20);
        for (let i = 0; i < showN; i++) {
            const js = jsRng[i] || '(end)';
            const c = sessionRng[i] || '(end)';
            const marker = i === divergeIdx ? '>>' : '  ';
            console.log(`  ${marker}[${i}] JS: ${js}`);
            console.log(`    [${i}]  C: ${c}`);
        }
    }
}
