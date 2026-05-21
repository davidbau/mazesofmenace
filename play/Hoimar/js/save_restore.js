// save_restore.js -- minimal save/restore snapshot for harness storage.
// C refs: cmd.c:dosave(), files.c:restore_saved_game().

import { game } from './gstate.js';
import { GameMap } from './game.js';

const SAVE_KEY = 'nethack-save';

function replacer(key, value) {
    if (key === 'nhDisplay' || key === 'mockStorage' || key === '_preNhgetchHook') return undefined;
    if (typeof value === 'function') return undefined;
    if (typeof value === 'bigint') return { __type: 'BigInt', value: value.toString() };
    if (value instanceof Set) return { __type: 'Set', values: [...value] };
    if (value instanceof Map) return { __type: 'Map', entries: [...value.entries()] };
    return value;
}

function reviver(key, value) {
    if (!value || typeof value !== 'object') return value;
    if (value.__type === 'BigInt') return BigInt(value.value);
    if (value.__type === 'Set') return new Set(value.values || []);
    if (value.__type === 'Map') return new Map(value.entries || []);
    return value;
}

function rehydrateLevel(level) {
    if (!level) return level;
    const map = new GameMap();
    Object.assign(map, level);
    return map;
}

export function hasSavedGame(storage) {
    return !!storage?.getItem?.(SAVE_KEY);
}

export function writeSavedGame() {
    const storage = game.mockStorage;
    if (!storage?.setItem) return false;
    storage.setItem(SAVE_KEY, JSON.stringify({ game }, replacer));
    return true;
}

export function restoreSavedGameIntoCurrentState(storage) {
    const text = storage?.getItem?.(SAVE_KEY);
    if (!text) return false;
    const snapshot = JSON.parse(text, reviver)?.game;
    if (!snapshot) return false;

    const display = game.nhDisplay;
    const hook = game._preNhgetchHook;
    const currentStorage = game.mockStorage;
    const datetime = game._datetime;
    const lt = game._lt;
    const flags = { ...(game.flags || {}) };
    const iflags = { ...(game.iflags || {}) };
    const seed = game._seed;

    for (const key of Object.keys(game)) delete game[key];
    Object.assign(game, snapshot);
    game.level = rehydrateLevel(game.level);
    game.nhDisplay = display;
    game._preNhgetchHook = hook;
    game.mockStorage = currentStorage;
    game._datetime = datetime;
    game._lt = lt;
    game._seed = seed;
    game.flags = { ...(game.flags || {}), ...flags };
    game.iflags = { ...(game.iflags || {}), ...iflags };
    return true;
}
