#!/usr/bin/env node
import { runHeadless } from './selfplay/runner/headless_runner.js';

async function main() {
    const result = await runHeadless({
        seed: 11111,
        roleIndex: 12,
        maxTurns: 50,  // Just first 50 turns on Dlvl 1
        debug: false
    });
    
    const agent = result.agent;
    
    // Check the final screen for monsters
    if (agent.screen) {
        const map = agent.screen.map;
        let foundMonsters = [];
        
        for (let y = 0; y < map.length; y++) {
            for (let x = 0; x < map[y].length; x++) {
                const cell = map[y][x];
                const ch = cell.ch;
                
                // Monster glyphs
                if (ch !== '@' && ch !== ' ' && ch !== '.' && ch !== '#' && 
                    ch !== '>' && ch !== '<' && ch !== '+' && ch !== '-' && ch !== '|' &&
                    ch !== '·' && ch !== '─' && ch !== '│' && ch !== '┌' && ch !== '┐' &&
                    ch !== '└' && ch !== '┘' && ch !== '┬' && ch !== '┴' && ch !== '├' &&
                    ch !== '┤' && ch !== '┼' && /\S/.test(ch)) {
                    foundMonsters.push({ ch, x, y, color: cell.color });
                }
            }
        }
        
        console.log(`=== Early Level Monster Check (Seed 11111) ===`);
        console.log(`Monsters on screen at turn ${agent.turnNumber}: ${foundMonsters.length}`);
        console.log(`Current depth: ${agent.dungeon.currentDepth}`);
        console.log(`Final HP: ${agent.status.hp}/${agent.status.hpmax}`);
        
        if (foundMonsters.length > 0) {
            console.log('\nMonsters visible:');
            for (const m of foundMonsters) {
                console.log(`  '${m.ch}' at (${m.x}, ${m.y}) color=${m.color}`);
            }
        }
    }
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
