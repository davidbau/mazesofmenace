/**
 * Test helpers for capturing and comparing animations
 */

import { tmp_at, initAnimations } from '../../js/animation.js';

/**
 * Capture display for recording animation events
 */
export class CaptureDisplay {
    constructor() {
        this.events = [];
        this.startTime = null;
    }

    showTempGlyph(x, y, glyph) {
        this.events.push({
            call: 'tmp_at',
            type: 'display',
            x,
            y,
            glyph,
            timestamp: this.getTimestamp()
        });
    }

    redraw(x, y) {
        this.events.push({
            call: 'tmp_at',
            type: 'cleanup',
            x,
            y,
            timestamp: this.getTimestamp()
        });
    }

    flush() {
        this.events.push({
            call: 'flush',
            timestamp: this.getTimestamp()
        });
    }

    getTimestamp() {
        if (!this.startTime) {
            this.startTime = Date.now();
            return 0;
        }
        return Date.now() - this.startTime;
    }

    getEvents() {
        return this.events;
    }

    clear() {
        this.events = [];
        this.startTime = null;
    }
}

/**
 * Compare JS animation events with C trace
 */
export function compareAnimations(jsEvents, cTrace, options = {}) {
    const tolerance = options.timingTolerance || 5; // ms
    const cEvents = cTrace.animation_events;
    const errors = [];

    // Filter to comparable events
    const jsDisplay = jsEvents.filter(e => e.type === 'display');
    const cDisplay = cEvents.filter(e => e.type === 'display');

    // Compare event counts
    if (jsDisplay.length !== cDisplay.length) {
        errors.push(`Event count mismatch: JS has ${jsDisplay.length}, C has ${cDisplay.length}`);
    }

    // Compare each event
    const minLen = Math.min(jsDisplay.length, cDisplay.length);
    for (let i = 0; i < minLen; i++) {
        const jsEvent = jsDisplay[i];
        const cEvent = cDisplay[i];

        // Compare positions
        if (jsEvent.x !== cEvent.x || jsEvent.y !== cEvent.y) {
            errors.push(`Event ${i}: position mismatch - JS (${jsEvent.x},${jsEvent.y}), C (${cEvent.x},${cEvent.y})`);
        }

        // Compare timing (if not skipping delays)
        if (!options.skipTiming && cEvent.timestamp !== undefined) {
            const timeDiff = Math.abs(jsEvent.timestamp - cEvent.timestamp);
            if (timeDiff > tolerance) {
                errors.push(`Event ${i}: timing mismatch - JS ${jsEvent.timestamp}ms, C ${cEvent.timestamp}ms (diff: ${timeDiff}ms)`);
            }
        }
    }

    return {
        passed: errors.length === 0,
        errors
    };
}

/**
 * Run animation and capture events
 */
export async function captureAnimation(animationFn) {
    const display = new CaptureDisplay();
    initAnimations(display);

    await animationFn();

    return display.getEvents();
}

export default {
    CaptureDisplay,
    compareAnimations,
    captureAnimation
};
