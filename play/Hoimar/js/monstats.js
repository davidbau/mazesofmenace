import { game } from './gstate.js';
import { MONSTER_DATA } from './monster_data.js';
import { G_EXTINCT, G_GONE, MAXMONNO } from './const.js';

const MONSTER_INDEX_BY_NAME = new Map(MONSTER_DATA.map((row, idx) => [row[0], idx]));
const PM_NAZGUL = MONSTER_INDEX_BY_NAME.get('NAZGUL');
const PM_ERINYS = MONSTER_INDEX_BY_NAME.get('ERINYS');
const G_NOGEN = 0x0200;
const G_UNIQ = 0x1000;

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

function monsterIndex(mon) {
    return MONSTER_INDEX_BY_NAME.get(monsterDataName(mon));
}

function mbirthLimit(idx) {
    // C ref: src/makemon.c:mbirth_limit().
    if (idx === PM_NAZGUL) return 9;
    if (idx === PM_ERINYS) return 3;
    return MAXMONNO;
}

export function noteMonsterBorn(mon, tally = true) {
    // C refs: src/makemon.c:makemon(), src/makemon.c:propagate().
    const idx = monsterIndex(mon);
    if (!Number.isInteger(idx)) return;
    const row = MONSTER_DATA[idx];
    if (!row) return;
    const mvitals = game.mvitals || (game.mvitals = {});
    const record = mvitals[idx] || (mvitals[idx] = {});
    const geno = row[5] || 0;
    if (geno & G_UNIQ) record.mvflags = (record.mvflags || 0) | G_EXTINCT;
    if (tally && (record.born || 0) < 255) record.born = (record.born || 0) + 1;
    if ((record.born || 0) >= mbirthLimit(idx)
        && !(geno & G_NOGEN)
        && !((record.mvflags || 0) & G_EXTINCT)) {
        record.mvflags = (record.mvflags || 0) | G_EXTINCT;
    }
}

export function monsterMvflags(mon) {
    const idx = monsterIndex(mon);
    if (!Number.isInteger(idx)) return 0;
    return game.mvitals?.[idx]?.mvflags || 0;
}

export function monsterGenocided(mon) {
    return !!(monsterMvflags(mon) & 0x02);
}

export function monsterGone(mon) {
    return !!(monsterMvflags(mon) & G_GONE);
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
