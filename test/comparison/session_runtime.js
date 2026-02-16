// test/comparison/session_runtime.js -- Thin compatibility facade.
//
// Session replay behavior now lives in core modules under js/.
// This file provides a stable import surface for existing test code.
//
// For new code, import directly from:
// - js/headless_runtime.js for HeadlessGame APIs
// - js/replay_core.js for replaySession and helpers

// Re-export everything from replay_core.js (the former session_runtime content)
export {
    HeadlessDisplay,
    TYP_NAMES,
    typName,
    stripAnsiSequences,
    getSessionScreenLines,
    getSessionStartup,
    getSessionCharacter,
    getSessionGameplaySteps,
    parseTypGrid,
    parseSessionTypGrid,
    compareGrids,
    formatDiffs,
    extractTypGrid,
    generateMapsSequential,
    generateMapsWithRng,
    compareRng,
    getPreStartupRngEntries,
    hasStartupBurstInFirstStep,
    generateStartupWithRng,
    replaySession,
    checkWallCompleteness,
    checkConnectivity,
    checkStairs,
    checkDimensions,
    checkValidTypValues,
    extractTypGridFromMap,
} from '../../js/replay_core.js';

// Re-export HeadlessGame for convenience
export { HeadlessGame } from '../../js/headless_runtime.js';
