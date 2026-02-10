#!/usr/bin/env node
/**
 * Analyze where the agent searches to see if it's covering diverse areas
 */

import { HeadlessGame, HeadlessAdapter } from './selfplay/runner/headless_runner.js';
import { Agent } from './selfplay/agent.js';

const SEED = 22222;
const ROLE_INDEX = 12;

async function main() {
    const game = new HeadlessGame(SEED, ROLE_INDEX);
    const adapter = new HeadlessAdapter(game);
    const agent = new Agent(adapter, { maxTurns: 300 });

    // Track search positions
    const searchPositions = [];

    // Hook into turn events to track searches
    const originalDecide = agent.decide.bind(agent);
    agent.decide = async function() {
        const decision = await originalDecide();
        if (decision && decision.type === 'search') {
            const pos = {
                x: agent.screen.playerX,
                y: agent.screen.playerY,
                turn: agent.turnNumber
            };
            searchPositions.push(pos);
        }
        return decision;
    };

    await agent.run();

    console.log(`\n=== Search Coverage Analysis for Seed ${SEED} ===\n`);
    console.log(`Total searches: ${searchPositions.length}`);

    // Count unique positions
    const uniquePositions = new Set();
    for (const pos of searchPositions) {
        uniquePositions.add(`${pos.x},${pos.y}`);
    }
    console.log(`Unique search positions: ${uniquePositions.size}`);
    console.log(`Average searches per position: ${(searchPositions.length / uniquePositions.size).toFixed(1)}`);

    // Show distribution
    const positionCounts = {};
    for (const pos of searchPositions) {
        const key = `${pos.x},${pos.y}`;
        positionCounts[key] = (positionCounts[key] || 0) + 1;
    }

    // Sort by count
    const sorted = Object.entries(positionCounts).sort((a, b) => b[1] - a[1]);

    console.log(`\nTop 10 most searched positions:`);
    for (let i = 0; i < Math.min(10, sorted.length); i++) {
        const [pos, count] = sorted[i];
        const [x, y] = pos.split(',').map(Number);
        console.log(`  (${x}, ${y}): ${count} searches`);
    }

    // Check if critical positions were searched
    const criticalPositions = [
        { x: 3, y: 15, desc: 'near SD at (3,16)' },
        { x: 4, y: 15, desc: 'near SD at (4,16)' },
        { x: 43, y: 2, desc: 'near SD at (43,1)' },
    ];

    console.log(`\nCritical positions (near secret doors):`);
    for (const crit of criticalPositions) {
        const key = `${crit.x},${crit.y}`;
        const count = positionCounts[key] || 0;
        console.log(`  (${crit.x}, ${crit.y}) ${crit.desc}: ${count} searches`);
    }

    // Geographic distribution
    const xCoords = searchPositions.map(p => p.x);
    const yCoords = searchPositions.map(p => p.y);
    const minX = Math.min(...xCoords);
    const maxX = Math.max(...xCoords);
    const minY = Math.min(...yCoords);
    const maxY = Math.max(...yCoords);

    console.log(`\nGeographic spread:`);
    console.log(`  X range: ${minX} to ${maxX} (span ${maxX - minX})`);
    console.log(`  Y range: ${minY} to ${maxY} (span ${maxY - minY})`);
    console.log(`  Center of mass: (${(xCoords.reduce((a,b)=>a+b,0)/xCoords.length).toFixed(1)}, ${(yCoords.reduce((a,b)=>a+b,0)/yCoords.length).toFixed(1)})`);
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
