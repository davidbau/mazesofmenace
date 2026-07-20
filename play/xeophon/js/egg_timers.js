import { game } from './gstate.js';
import { monsterByRndName } from './mklev.js';

const EGG = 10001;

export const HATCHLING_BY_EGG_MONSTER = new Map([
    ['cockatrice', 'chickatrice'],
    ['gray dragon', 'baby gray dragon'],
    ['gold dragon', 'baby gold dragon'],
    ['silver dragon', 'baby silver dragon'],
    ['red dragon', 'baby red dragon'],
    ['white dragon', 'baby white dragon'],
    ['orange dragon', 'baby orange dragon'],
    ['black dragon', 'baby black dragon'],
    ['blue dragon', 'baby blue dragon'],
    ['green dragon', 'baby green dragon'],
    ['yellow dragon', 'baby yellow dragon'],
    ['red naga', 'red naga hatchling'],
    ['black naga', 'black naga hatchling'],
    ['golden naga', 'golden naga hatchling'],
    ['guardian naga', 'guardian naga hatchling'],
    ['crocodile', 'baby crocodile'],
]);

export function isEggObject(obj) {
    return obj?.otyp === EGG || String(obj?.kind || obj?.actualKind || '').toLowerCase() === 'egg';
}

function monsterNameKey(name) {
    return String(name || '').toLowerCase();
}

function monsterNameSet(names) {
    return new Set((names || []).map(monsterNameKey).filter(Boolean));
}

function hasMonsterName(names, name) {
    return !!name && monsterNameSet(names).has(monsterNameKey(name));
}

export function eggSourceMonsterName(egg) {
    return String(egg?.corpsenm?.name || '');
}

export function eggHatchlingMonsterName(egg) {
    const name = eggSourceMonsterName(egg);
    return name ? HATCHLING_BY_EGG_MONSTER.get(name) || name : '';
}

function eggHatchlingMonsterData(egg) {
    const hatchName = eggHatchlingMonsterName(egg);
    return hatchName ? monsterByRndName(hatchName) || egg.corpsenm : null;
}

export function eggSpeciesGenocidedForHatching(egg, g = game) {
    const sourceName = eggSourceMonsterName(egg);
    if (!sourceName) return true;
    const hatchName = eggHatchlingMonsterName(egg);
    const genocided = monsterNameSet(g._genocided_monsters);
    return genocided.has(monsterNameKey(sourceName)) || genocided.has(monsterNameKey(hatchName));
}

function eggHatchlingExtinct(egg, g = game) {
    return hasMonsterName(g._extinct_monsters, eggHatchlingMonsterName(egg));
}

export function eggHatchBlockedAtTimeout(egg, g = game) {
    const data = eggHatchlingMonsterData(egg);
    return !data?.name || !!data.unique || eggSpeciesGenocidedForHatching(egg, g) || eggHatchlingExtinct(egg, g);
}

export function eggHatchMonsterData(egg, g = game) {
    return eggHatchBlockedAtTimeout(egg, g) ? null : eggHatchlingMonsterData(egg);
}

export function eggHasHatchTimer(egg) {
    return egg?.eggHatchTurn != null;
}

export function killEggHatchTimer(egg) {
    if (!egg) return false;
    const hadTimer = eggHasHatchTimer(egg) || egg._egg_hatch_seq != null || egg._egg_hatch_consumed != null;
    delete egg.eggHatchTurn;
    delete egg._egg_hatch_seq;
    delete egg._egg_hatch_consumed;
    return hadTimer;
}

function objectContents(obj) {
    const lists = [];
    if (Array.isArray(obj?.contents)) lists.push(obj.contents);
    if (Array.isArray(obj?.cobj) && obj.cobj !== obj.contents) lists.push(obj.cobj);
    return lists.flat();
}

function scanObjectListForEggs(objects, callback, seen) {
    if (!Array.isArray(objects)) return;
    for (const obj of objects) {
        if (!obj || seen.has(obj)) continue;
        seen.add(obj);
        if (isEggObject(obj)) callback(obj);
        scanObjectListForEggs(objectContents(obj), callback, seen);
    }
}

function scanLevelForEggs(level, callback, seen) {
    if (!level) return;
    scanObjectListForEggs(level.objects, callback, seen);
    scanObjectListForEggs(level.buriedobjlist, callback, seen);
    for (const mon of Array.isArray(level.monsters) ? level.monsters : [])
        scanObjectListForEggs(mon?.minvent, callback, seen);
}

function scanMigrationQueuesForEggs(g, callback, seen) {
    if (g._impact_drop_migrations instanceof Map) {
        for (const objects of g._impact_drop_migrations.values())
            scanObjectListForEggs(objects, callback, seen);
    }
    scanObjectListForEggs(g.migrating_objs, callback, seen);
    scanObjectListForEggs(g._migrating_objs, callback, seen);
}

export function scanEggObjects(g = game, callback = () => {}) {
    const seen = new Set();
    scanObjectListForEggs(g.inventory, callback, seen);
    scanLevelForEggs(g.level, callback, seen);
    if (g._saved_levels instanceof Map) {
        for (const saved of g._saved_levels.values())
            scanLevelForEggs(saved?.level || saved, callback, seen);
    }
    scanMigrationQueuesForEggs(g, callback, seen);
}

export function killDeadSpeciesEggHatchTimers(g = game) {
    let stopped = 0;
    scanEggObjects(g, egg => {
        if (!eggHasHatchTimer(egg) || !eggSpeciesGenocidedForHatching(egg, g)) return;
        if (killEggHatchTimer(egg)) stopped++;
    });
    return stopped;
}
