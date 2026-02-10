/**
 * Animation comparison tests - verify JS matches C NetHack behavior
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'fs';
import { tmp_at, DISP_FLASH, DISP_END } from '../../js/animations.js';
import { delay_output, skipAnimationDelays } from '../../js/delay.js';
import { captureAnimation, compareAnimations } from './helpers.js';

describe('Animation Comparison Tests', () => {
    it('should match C trace for thrown dagger', async () => {
        // Load C trace
        const cTrace = JSON.parse(
            readFileSync('test/animations/traces/c/sample_throw_dagger.json', 'utf8')
        );

        // Skip delays for fast testing
        skipAnimationDelays(true);

        // Execute same animation in JS
        const jsEvents = await captureAnimation(async () => {
            const glyph = 2456; // Dagger glyph (from C trace)
            
            tmp_at(DISP_FLASH, glyph);
            
            // Animate 4 squares (from C trace: 41,11 -> 42,11 -> 43,11 -> 44,11)
            for (let x = 41; x <= 44; x++) {
                tmp_at(x, 11);
                await delay_output();
            }
            
            tmp_at(DISP_END, 0);
        });

        // Compare with C trace
        const result = compareAnimations(jsEvents, cTrace, { 
            skipTiming: true  // We're using skipAnimationDelays
        });

        if (!result.passed) {
            console.log('Comparison errors:', result.errors);
        }

        assert.strictEqual(result.passed, true, 
                          'JS animation should match C trace');
    });

    it('should validate animation event structure', async () => {
        skipAnimationDelays(true);

        const events = await captureAnimation(async () => {
            tmp_at(DISP_FLASH, 100);
            tmp_at(10, 5);
            await delay_output();
            tmp_at(11, 5);
            await delay_output();
            tmp_at(DISP_END, 0);
        });

        // Should have display events
        const displayEvents = events.filter(e => e.type === 'display');
        assert.strictEqual(displayEvents.length, 2);

        // First position
        assert.strictEqual(displayEvents[0].x, 10);
        assert.strictEqual(displayEvents[0].y, 5);

        // Second position
        assert.strictEqual(displayEvents[1].x, 11);
        assert.strictEqual(displayEvents[1].y, 5);

        // Should have cleanup events (FLASH mode erases previous)
        const cleanupEvents = events.filter(e => e.type === 'cleanup');
        assert.ok(cleanupEvents.length >= 1);
    });

    it('should match timing when not skipping delays', async () => {
        skipAnimationDelays(false);

        const start = Date.now();
        const events = await captureAnimation(async () => {
            tmp_at(DISP_FLASH, 100);
            tmp_at(10, 5);
            await delay_output(); // 50ms
            tmp_at(11, 5);
            await delay_output(); // 50ms
            tmp_at(DISP_END, 0);
        });
        const elapsed = Date.now() - start;

        // Should take ~100ms (2 x 50ms)
        assert.ok(elapsed >= 95 && elapsed <= 115, 
                 `Expected ~100ms, got ${elapsed}ms`);

        // Events should have timestamps
        const displayEvents = events.filter(e => e.type === 'display');
        assert.ok(displayEvents[0].timestamp !== undefined);
        assert.ok(displayEvents[1].timestamp !== undefined);

        skipAnimationDelays(true);
    });
});
