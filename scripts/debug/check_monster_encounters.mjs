#!/usr/bin/env node
import { runHeadless } from './selfplay/runner/headless_runner.js';

async function main() {
    const result = await runHeadless({
        seed: 22222,
        roleIndex: 12,
        maxTurns: 200,
        debug: false
    });
    
    const agent = result.agent;
    
    // Check perception data
    let monsterTurns = 0;
    let combatTurns = 0;
    
    // We need to hook into the agent to track this
    // For now, let's check final map state
    const level = agent.dungeon.currentLevel;
    const monsters = level.getMonsters();
    
    console.log(`\n=== Monster Encounter Analysis ===`);
    console.log(`Final depth: ${agent.dungeon.currentDepth}`);
    console.log(`Monsters on current level: ${monsters.length}`);
    
    if (monsters.length > 0) {
        console.log('\nMonsters present:');
        for (const m of monsters.slice(0, 10)) {
            console.log(`  ${m.glyph} at (${m.x}, ${m.y})`);
        }
    }
    
    // Check if there's combat tracking in stats
    console.log(`\nStats kills: ${agent.stats.kills || 0}`);
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
