import { game } from './gstate.js';
import { monsterByRndName } from './mklev.js';
import { rnd } from './rng.js';
import { HATCH_EGG, TIMER_OBJECT, peekTimer, startTimer, stopTimer } from './timeout.js';
import { objectLocations } from './obj_location.js';

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

export function eggHasHatchTimer(egg, g = game) {
    return !!peekTimer(HATCH_EGG, egg, g);
}

export function attachEggHatchTimeout(egg, when = 0, g = game) {
    killEggHatchTimer(egg, g);
    if (!when) {
        for (let i = 151; i <= 200; i++) {
            if (rnd(i) > 150) {
                when = i;
                break;
            }
        }
    }
    if (!when) return false;
    startTimer(when, TIMER_OBJECT, HATCH_EGG, egg, g);
    egg.eggHatchTurn = (g.moves || 0) + when;
    egg._egg_hatch_consumed = true;
    egg._egg_hatch_seq = g._egg_hatch_timer_seq = (g._egg_hatch_timer_seq || 0) + 1;
    return true;
}

export function killEggHatchTimer(egg, g = game) {
    if (!egg) return false;
    const hadTimer = eggHasHatchTimer(egg, g) || egg.eggHatchTurn != null;
    stopTimer(HATCH_EGG, egg, {}, g);
    delete egg.eggHatchTurn;
    delete egg._egg_hatch_seq;
    delete egg._egg_hatch_consumed;
    return hadTimer;
}

export function scanEggObjects(g = game, callback = () => {}) {
    for (const obj of objectLocations(g, true).keys())
        if (isEggObject(obj)) callback(obj);
}

export function killDeadSpeciesEggHatchTimers(g = game) {
    let stopped = 0;
    scanEggObjects(g, egg => {
        if (!eggHasHatchTimer(egg, g) || !eggSpeciesGenocidedForHatching(egg, g)) return;
        if (killEggHatchTimer(egg, g)) stopped++;
    });
    return stopped;
}
