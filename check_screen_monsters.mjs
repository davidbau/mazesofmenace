#!/usr/bin/env node
import { runHeadless } from './selfplay/runner/headless_runner.js';

async function main() {
    let monsterCount = 0;
    let combatActions = 0;
    let turnsChecked = 0;
    
    const result = await runHeadless({
        seed: 22222,
        roleIndex: 12,
        maxTurns: 200,
        debug: false,
        onTurn: (info) => {
            turnsChecked++;
            
            // Track combat actions
            if (info.action && info.action.type === 'attack') {
                combatActions++;
            }
        }
    });
    
    const agent = result.agent;
    
    // Check the current screen for monsters
    if (agent.screen) {
        const map = agent.screen.map;
        let foundMonsters = [];

        for (let y = 0; y < map.length; y++) {
            for (let x = 0; x < map[y].length; x++) {
                const cell = map[y][x];
                const ch = cell.ch;
                
                // Monster glyphs are typically letters (a-z, A-Z) but not @ (player)
                if (ch !== '@' && ch !== ' ' && ch !== '.' && ch !== '#' && 
                    ch !== '>' && ch !== '<' && ch !== '+' && ch !== '-' && ch !== '|' &&
                    /[a-zA-Z]/.test(ch)) {
                    foundMonsters.push({ ch, x, y, color: cell.color });
                }
            }
        }
        
        console.log(`\n=== Monster Analysis ===`);
        console.log(`Turns checked: ${turnsChecked}`);
        console.log(`Combat actions: ${combatActions}`);
        console.log(`Monsters on final screen: ${foundMonsters.length}`);
        
        if (foundMonsters.length > 0) {
            console.log('\nMonsters visible:');
            for (const m of foundMonsters.slice(0, 10)) {
                console.log(`  '${m.ch}' at (${m.x}, ${m.y}) color=${m.color}`);
            }
        }
        
        console.log(`\nFinal depth: ${agent.dungeon.currentDepth}`);
        console.log(`Final HP: ${agent.status.hp}/${agent.status.hpmax}`);
    }
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
