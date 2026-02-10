#!/usr/bin/env node

async function main() {
    const { makelevel } = await import('./js/dungeon.js');
    
    console.log('=== Stairs Generation Test ===\n');
    
    for (let i = 0; i < 10; i++) {
        const map = makelevel(1);
        const hasUp = map.upstair ? 1 : 0;
        const hasDown = map.dnstair ? 1 : 0;
        console.log(`Level ${i+1}: upstair=${hasUp}, dnstair=${hasDown}`);
    }
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
