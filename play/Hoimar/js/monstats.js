import { game } from './gstate.js';
import { MONSTER_DATA } from './monster_data.js';

const MONSTER_INDEX_BY_NAME = new Map(MONSTER_DATA.map((row, idx) => [row[0], idx]));

function monsterDataName(mon) {
    const data = mon?.data || mon;
    if (!data) return '';
    if (typeof data === 'string') return data;
    return data.name || data[0] || '';
}

export function noteMonsterDied(mon) {
    // C ref: src/mon.c:mondied(), src/mon.c:mondead().
    const name = monsterDataName(mon);
    const idx = MONSTER_INDEX_BY_NAME.get(name);
    if (!Number.isInteger(idx)) return;
    const mvitals = game.mvitals || (game.mvitals = {});
    const record = mvitals[idx] || (mvitals[idx] = {});
    record.died = (record.died || 0) + 1;
}

export function vanquishedMonsterEntries() {
    // C ref: src/insight.c:list_vanquished().
    const mvitals = game.mvitals || {};
    const entries = [];
    for (const [key, record] of Object.entries(mvitals)) {
        const idx = Number(key);
        const died = record?.died || 0;
        const row = MONSTER_DATA[idx];
        if (!row || died <= 0) continue;
        entries.push({
            index: idx,
            count: died,
            name: String(row[0] || 'monster').toLowerCase().replace(/_/g, ' '),
        });
    }
    entries.sort((a, b) => a.index - b.index);
    return entries;
}
