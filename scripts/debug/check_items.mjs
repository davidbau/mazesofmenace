#!/usr/bin/env node
import { runHeadless } from './selfplay/runner/headless_runner.js';

async function main() {
    const result = await runHeadless({
        seed: 11111,
        roleIndex: 12,
        maxTurns: 50,
        debug: false
    });
    
    const agent = result.agent;
    const level = agent.dungeon.currentLevel;
    
    // Check for items on the map
    const items = level.items || [];
    const gold = level.gold || [];
    
    console.log(`=== Item Generation Check ===`);
    console.log(`Items on current level: ${items.length}`);
    console.log(`Gold piles: ${gold.length}`);
    
    // Check screen for item glyphs
    if (agent.screen) {
        const map = agent.screen.map;
        let foundItems = [];
        
        for (let y = 0; y < map.length; y++) {
            for (let x = 0; x < map[y].length; x++) {
                const cell = map[y][x];
                const ch = cell.ch;
                
                // Common item glyphs: ) [ ! ? / = % * $ ( "
                if (')]!?/=%*$("'.includes(ch)) {
                    foundItems.push({ ch, x, y, color: cell.color });
                }
            }
        }
        
        console.log(`Item glyphs on screen: ${foundItems.length}`);
        if (foundItems.length > 0) {
            console.log('\nItems visible:');
            for (const item of foundItems.slice(0, 10)) {
                console.log(`  '${item.ch}' at (${item.x}, ${item.y}) color=${item.color}`);
            }
        }
    }
    
    // Check inventory
    console.log(`\nStarting inventory items: ${agent.inventory ? agent.inventory.length : 'N/A'}`);
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
