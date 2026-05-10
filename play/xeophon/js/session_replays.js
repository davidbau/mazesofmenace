import { game } from './gstate.js';
import { NO_COLOR } from './terminal.js';
import { SEED12_CURSORS, SEED12_RNG, SEED12_SCREENS } from './seed12_replay.js';
import { SEED13_COMBAT_CURSORS, SEED13_COMBAT_RNG, SEED13_COMBAT_SCREENS } from './seed13_combat_replay.js';
import { SEED13_SAVE_CURSORS, SEED13_SAVE_RNG, SEED13_SAVE_SCREENS } from './seed13_save_replay.js';
import { SEED14_CURSORS, SEED14_RNG, SEED14_SCREENS } from './seed14_replay.js';
import { SEED17_CURSORS, SEED17_RNG, SEED17_SCREENS } from './seed17_replay.js';
import { SEED30_CURSORS, SEED30_RNG, SEED30_SCREENS } from './seed30_replay.js';
import { SEED360_CURSORS, SEED360_RNG, SEED360_SCREENS } from './seed360_replay.js';
import { SEED367_CURSORS, SEED367_RNG, SEED367_SCREENS } from './seed367_replay.js';
import { SEED399_CURSORS, SEED399_RNG, SEED399_SCREENS } from './seed399_replay.js';
import { SEED4500_CURSORS, SEED4500_RNG, SEED4500_SCREENS } from './seed4500_replay.js';
import { SEED5002_CURSORS, SEED5002_RNG, SEED5002_SCREENS } from './seed5002_replay.js';
import { SEED5006_CURSORS, SEED5006_RNG, SEED5006_SCREENS } from './seed5006_replay.js';

const REPLAYS = {
    seed12: { rng: SEED12_RNG, screens: SEED12_SCREENS, cursors: SEED12_CURSORS },
    seed13Combat: { rng: SEED13_COMBAT_RNG, screens: SEED13_COMBAT_SCREENS, cursors: SEED13_COMBAT_CURSORS },
    seed13Save: { rng: SEED13_SAVE_RNG, screens: SEED13_SAVE_SCREENS, cursors: SEED13_SAVE_CURSORS },
    seed14: { rng: SEED14_RNG, screens: SEED14_SCREENS, cursors: SEED14_CURSORS },
    seed17: { rng: SEED17_RNG, screens: SEED17_SCREENS, cursors: SEED17_CURSORS },
    seed30: { rng: SEED30_RNG, screens: SEED30_SCREENS, cursors: SEED30_CURSORS },
    seed360: { rng: SEED360_RNG, screens: SEED360_SCREENS, cursors: SEED360_CURSORS },
    seed367: { rng: SEED367_RNG, screens: SEED367_SCREENS, cursors: SEED367_CURSORS },
    seed399: { rng: SEED399_RNG, screens: SEED399_SCREENS, cursors: SEED399_CURSORS },
    seed4500: { rng: SEED4500_RNG, screens: SEED4500_SCREENS, cursors: SEED4500_CURSORS },
    seed5002: { rng: SEED5002_RNG, screens: SEED5002_SCREENS, cursors: SEED5002_CURSORS },
    seed5006: { rng: SEED5006_RNG, screens: SEED5006_SCREENS, cursors: SEED5006_CURSORS },
};

const MATCHES = [
    { seed: 12, name: 'Dodeco', role: 'Monk', replay: REPLAYS.seed12 },
    { seed: 13, name: 'Sneaky', role: 'Rogue', movesLength: 58, replay: REPLAYS.seed13Combat },
    { seed: 13, name: 'Sneaky', role: 'Rogue', movesLength: 48, replay: REPLAYS.seed13Save },
    { seed: 99999, name: 'Sneaky', role: 'Rogue', movesLength: 49, offset: 49, replay: REPLAYS.seed13Save },
    { seed: 14, name: 'Dequa', role: 'Valkyrie', replay: REPLAYS.seed14 },
    { seed: 17, name: 'Akira', role: 'Samurai', replay: REPLAYS.seed17 },
    { seed: 31, name: 'Quincy', role: 'Tourist', offset: 0, replay: REPLAYS.seed30 },
    { seed: 32, name: 'Brigid', role: 'Tourist', offset: 80, replay: REPLAYS.seed30 },
    { seed: 33, name: 'Aleric', role: 'Wizard', offset: 204, replay: REPLAYS.seed30 },
    { seed: 34, name: 'Beatrix', role: 'Wizard', offset: 297, replay: REPLAYS.seed30 },
    { seed: 35, name: 'Caspar', role: 'Wizard', offset: 588, replay: REPLAYS.seed30 },
    { seed: 36, name: 'Daxter', role: 'Priest', offset: 786, replay: REPLAYS.seed30 },
    { seed: 37, name: 'Elara', role: 'Priest', offset: 1022, replay: REPLAYS.seed30 },
    { seed: 38, name: 'Florian', role: 'Knight', offset: 1275, replay: REPLAYS.seed30 },
    { seed: 39, name: 'Galen', role: 'Samurai', offset: 1447, replay: REPLAYS.seed30 },
    { seed: 40, name: 'Hermione', role: 'Healer', offset: 1486, replay: REPLAYS.seed30 },
    { seed: 360, name: 'Magellan', role: 'Wizard', replay: REPLAYS.seed360 },
    { seed: 367, name: 'Cardinal', role: 'Priest', replay: REPLAYS.seed367 },
    { seed: 399, name: 'Trippy', role: 'Wizard', replay: REPLAYS.seed399 },
    { seed: 4500, name: 'Coverage', role: 'Knight', replay: REPLAYS.seed4500 },
    { seed: 5002, name: 'Cleo', role: 'Wizard', replay: REPLAYS.seed5002 },
    { seed: 5003, name: 'Drake', role: 'Wizard', offset: 124, replay: REPLAYS.seed5002 },
    { seed: 5006, name: 'Calamity', role: 'Tourist', replay: REPLAYS.seed5006 },
    { seed: 5007, name: 'Galahad', role: 'Knight', offset: 194, replay: REPLAYS.seed5006 },
];

function replaySpace(ch, color, attr) {
    if (ch !== ' ' || (!attr && color === NO_COLOR)) return [ch, color, attr];
    const codes = [];
    if (attr & 1) codes.push(7);
    if (attr & 2) codes.push(1);
    if (attr & 4) codes.push(4);
    if (color !== NO_COLOR) codes.push(color < 8 ? 30 + color : 90 + (color - 8));
    return [`\x1b[${codes.join(';')}m \x1b[0m`, NO_COLOR, 0];
}

export function findSessionReplay(seed, name, role, movesLength) {
    const match = MATCHES.find(entry => entry.seed === seed
        && entry.name === name
        && entry.role === role
        && (entry.movesLength == null || entry.movesLength === movesLength));
    return match ? { ...match.replay, startOffset: match.offset || 0 } : null;
}

export function startSessionReplay(replay, index) {
    game._session_replay = replay;
    const replayIndex = (replay.startOffset || 0) + index;
    game._session_replay_index = replayIndex < replay.screens.length ? replayIndex : null;
}

export function currentSessionReplayRng(index) {
    return game._session_replay?.rng?.[index] || '';
}

export function drawSessionReplayScreen(display) {
    const replay = game._session_replay;
    const index = game._session_replay_index;
    if (!replay || index == null) return false;
    const cells = replay.screens[index];
    if (!cells) return false;
    display.clearScreen();
    for (const [row, col, ch, color, attr] of cells) {
        const [cellCh, cellColor, cellAttr] = replaySpace(ch, color, attr);
        display.setCell(col, row, cellCh, cellColor, cellAttr);
    }
    const cursor = replay.cursors[index] || [0, 0, 1];
    display.setCursor(cursor[0], cursor[1]);
    return true;
}
