/**
 * delay.js - compatibility wrappers for animation delay APIs.
 *
 * Canonical implementation now lives in animation.js.
 */

import {
    nh_delay_output,
    skipAnimationDelays,
    configureAnimation,
    getAnimationPolicy,
} from './animation.js';

let animationDelayMs = 50;

export async function delay_output(ms = animationDelayMs) {
    await nh_delay_output(ms);
}

export async function delay_output_raf(ms = animationDelayMs) {
    await nh_delay_output(ms);
}

export function setAnimationDelay(ms) {
    if (!Number.isFinite(ms) || ms < 0) return;
    animationDelayMs = Math.floor(ms);
    configureAnimation({ delayMs: animationDelayMs });
}

export function getAnimationDelay() {
    const policy = getAnimationPolicy();
    if (Number.isFinite(policy.delayMs)) return policy.delayMs;
    return animationDelayMs;
}

export { skipAnimationDelays };

export default {
    delay_output,
    delay_output_raf,
    setAnimationDelay,
    getAnimationDelay,
    skipAnimationDelays,
};
