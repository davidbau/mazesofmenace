#!/usr/bin/env node
import { runHeadless } from './selfplay/runner/headless_runner.js';

async function main() {
    let monsterEncounters = 0;
    let combatActions = 0;
    
    const result = await runHeadless({
        seed: 11111,
        roleIndex: 12,
        maxTurns: 200,
        debug: false,
        onTurn: (info) => {
            // Track combat
            if (info.action) {
                if (info.action.type === 'attack') {
                    combatActions++;
                }
            }
        }
    });
    
    console.log('\n=== Monster Encounter Test ===');
    console.log(`Turns: ${result.stats.turns}`);
    console.log(`Combat actions: ${combatActions}`);
    console.log(`Max depth: ${result.stats.maxDepth}`);
    console.log(`Final HP: ${result.agent.status.hp}/${result.agent.status.hpmax}`);
    console.log(`Died: ${result.stats.died || false}`);
    
    // Check current level for monsters
    const level = result.agent.dungeon.currentLevel;
    console.log(`\nMonsters on final level: ${level.monsters ? level.monsters.filter(m => !m.dead).length : 0}`);
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
