#!/usr/bin/env node
/**
 * Debug exploration target selection to understand why agent gets stuck locally
 */

import { HeadlessGame, HeadlessAdapter } from './selfplay/runner/headless_runner.js';
import { Agent } from './selfplay/agent.js';
import { findExplorationTarget } from './selfplay/brain/pathing.js';

const SEED = parseInt(process.argv[2]) || 22222;
const MAX_TURNS = 150;
const ROLE_INDEX = 12; // Wizard

async function main() {
    console.log(`=== Debug Exploration Targets for Seed ${SEED} ===\n`);

    // Create game and agent
    const game = new HeadlessGame(SEED, ROLE_INDEX);
    const adapter = new HeadlessAdapter(game);
    const agent = new Agent(adapter, { maxTurns: MAX_TURNS });

    let turnCount = 0;

    // Hook into exploration target selection
    agent.onTurn = (info) => {
    turnCount++;

    // Log every 30 turns
    if (turnCount % 30 !== 0) return;

    const level = agent.dungeon.currentLevel;
    const pos = info.position;

    console.log(`\n=== Turn ${turnCount} ===`);
    console.log(`Position: (${pos.x}, ${pos.y})`);
    console.log(`Explored: ${level.exploredCount} cells (${(100*level.exploredCount/(80*21)).toFixed(1)}%)`);

    // Get frontier cells manually to analyze
    const frontier = level.getExplorationFrontier();
    console.log(`Frontier size: ${frontier.length} cells`);

    if (frontier.length > 0) {
        // Calculate distance distribution
        const distances = frontier.map(f => {
            const dx = Math.abs(f.x - pos.x);
            const dy = Math.abs(f.y - pos.y);
            return dx + dy; // Manhattan distance
        });

        const minDist = Math.min(...distances);
        const maxDist = Math.max(...distances);
        const avgDist = distances.reduce((a,b) => a+b, 0) / distances.length;

        console.log(`Frontier distances: min=${minDist}, max=${maxDist}, avg=${avgDist.toFixed(1)}`);

        // Show distribution
        const buckets = { near: 0, mid: 0, far: 0 };
        for (const d of distances) {
            if (d < 10) buckets.near++;
            else if (d < 30) buckets.mid++;
            else buckets.far++;
        }
        console.log(`  Near (<10): ${buckets.near}, Mid (10-30): ${buckets.mid}, Far (>30): ${buckets.far}`);

        // Show actual frontier cell positions (sample)
        if (frontier.length <= 20) {
            console.log(`Frontier cells:`, frontier.map(f => `(${f.x},${f.y})`).join(', '));
        } else {
            // Show nearest 5 and farthest 5
            const sorted = [...frontier].sort((a, b) => {
                const distA = Math.abs(a.x - pos.x) + Math.abs(a.y - pos.y);
                const distB = Math.abs(b.x - pos.x) + Math.abs(b.y - pos.y);
                return distA - distB;
            });
            const nearest = sorted.slice(0, 5);
            const farthest = sorted.slice(-5);
            console.log(`  Nearest 5:`, nearest.map(f => {
                const d = Math.abs(f.x - pos.x) + Math.abs(f.y - pos.y);
                return `(${f.x},${f.y})@${d}`;
            }).join(', '));
            console.log(`  Farthest 5:`, farthest.map(f => {
                const d = Math.abs(f.x - pos.x) + Math.abs(f.y - pos.y);
                return `(${f.x},${f.y})@${d}`;
            }).join(', '));
        }
    }

    // Check if stuck conditions are met
    const exploredPercent = level.exploredCount / (80 * 21);
    const isStuckExploring = (
        turnCount > 100 &&
        frontier.length > 50 &&
        exploredPercent < 0.20
    );
    console.log(`Stuck conditions: turn>${100}=${turnCount>100}, frontier>${50}=${frontier.length>50}, explored<20%=${exploredPercent<0.20} => STUCK=${isStuckExploring}`);

    // Try to find exploration target (both normal and preferFar)
    const normalTarget = findExplorationTarget(level, pos.x, pos.y, agent.recentPositions, { preferFar: false });
    const farTarget = findExplorationTarget(level, pos.x, pos.y, agent.recentPositions, { preferFar: true });

    if (normalTarget && normalTarget.path.length > 0) {
        const dest = normalTarget.path[normalTarget.path.length - 1];
        const dist = normalTarget.path.length;
        console.log(`Normal target: (${dest.x}, ${dest.y}) at distance ${dist}`);
    }

    if (farTarget && farTarget.path.length > 0) {
        const dest = farTarget.path[farTarget.path.length - 1];
        const dist = farTarget.path.length;
        console.log(`Far target: (${dest.x}, ${dest.y}) at distance ${dist}`);
    }
    };

    // Run agent
    console.log(`Running for ${MAX_TURNS} turns...`);
    await agent.run();

    console.log(`\n=== Final State ===`);
    const level = agent.dungeon.currentLevel;
    console.log(`Explored: ${level.exploredCount} cells`);
    console.log(`Frontier: ${level.getExplorationFrontier().length} cells`);
    console.log(`Found stairs: ${level.stairsDown.length > 0 ? 'YES' : 'NO'}`);
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
