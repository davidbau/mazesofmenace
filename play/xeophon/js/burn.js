// C: timeout.c begin_burn, end_burn, cleanup_burn and burn_object.
import { game } from './gstate.js';
import { W_ARM } from './const.js';
import { cansee } from './vision.js';
import { newsym } from './display.js';
import { BURN_OBJECT, TIMER_OBJECT, startTimer, stopTimer, peekTimer, runTimers } from './timeout.js';
import { objectLocations } from './obj_location.js';
import { artifactDefinitionForName } from './mklev.js';

const LIGHT_KINDS = new Map([[226, 'brass lantern'], [227, 'oil lamp'], [228, 'magic lamp'],
    [252, 'potion of oil'], [370, 'tallow candle'], [371, 'wax candle'],
    [10076, 'candelabrum of invocation'], [10140, 'gold dragon scale mail'], [10149, 'gold dragon scales']]);

export function lightObjectKind(obj) {
    return LIGHT_KINDS.get(obj?.otyp) || String(obj?.actualKind || obj?.kind || '').toLowerCase();
}

export function artifactLight(obj, g = game) {
    const kind = lightObjectKind(obj);
    return artifactDefinitionForName(obj?.artifact || obj?.oartifact)?.name === 'Sunsword'
        || ((kind === 'gold dragon scale mail' || kind === 'gold dragon scales')
            && !!((obj.owornmask & W_ARM) || obj.worn || obj === g.u?.uskin));
}

export function beginBurn(obj, alreadyLit = false, g = game) {
    const kind = lightObjectKind(obj);
    if (!obj.age && kind !== 'magic lamp' && !artifactLight(obj, g)) return false;
    const untimed = kind === 'magic lamp' || artifactLight(obj, g);
    let turns = 0;
    if (!untimed) {
        if (kind === 'potion of oil') {
            turns = obj.odiluted ? Math.trunc((3 * obj.age + 2) / 4) : obj.age;
            obj.litRadius = 1;
        } else {
            const thresholds = kind.includes('candle') || kind === 'candelabrum of invocation'
                ? [75, 15, 0] : [150, 100, 50, 25, 0];
            turns = obj.age - thresholds.find(value => obj.age > value);
        }
        if (!startTimer(turns, TIMER_OBJECT, BURN_OBJECT, obj, g)) {
            obj.lamplit = obj.burning = false;
            return false;
        }
        obj.age -= turns;
        obj._burnTimer = turns;
    }
    obj.lamplit = obj.burning = true;
    if (!alreadyLit) g.vision_full_recalc = 1;
    delete obj.line;
    return true;
}

export function cleanupBurn(obj, expiry, g = game) {
    obj.age = (obj.age || 0) + expiry - (g.moves || 0);
    obj.lamplit = obj.burning = false;
    delete obj._burnTimer;
    delete obj.litRadius;
    delete obj.line;
    g.vision_full_recalc = 1;
}

export function endBurn(obj, timerAttached = true, g = game) {
    if (timerAttached && peekTimer(BURN_OBJECT, obj, g)) {
        stopTimer(BURN_OBJECT, obj, { [BURN_OBJECT]: { cleanup: cleanupBurn } }, g);
    } else {
        obj.lamplit = obj.burning = false;
        delete obj._burnTimer;
        delete obj.litRadius;
        delete obj.line;
        g.vision_full_recalc = 1;
    }
}

export function burnObject(obj, timeout, deps = {}, g = game) {
    const entry = objectLocations(g).get(obj);
    if (!obj.lamplit || !entry) {
        endBurn(obj, false, g);
        return [];
    }
    const kind = lightObjectKind(obj);
    const menorah = kind === 'candelabrum of invocation';
    const candle = kind === 'tallow candle' || kind === 'wax candle';
    const oil = kind === 'potion of oil';
    const lantern = kind === 'brass lantern';
    const many = menorah ? obj.spe > 1 : obj.quan > 1;
    const floor = entry.source === 'floor' && !entry.parent && !entry.buried;
    const carried = entry.source === 'inventory' && !entry.parent;
    const visible = !g.u?.blind && !entry.parent && !entry.buried
        && entry.source !== 'migrating' && cansee(entry.x, entry.y);
    const bytouch = carried && !lantern;
    const name = (deps.name?.(obj) || (obj.quan > 1 ? `${kind}s` : kind)).replace(/ \(lit\)$/, '');
    const ownerName = entry.owner ? deps.monsterName?.(entry.owner) || entry.owner.name || entry.owner.data?.name || 'monster' : '';
    const whose = carried ? 'Your ' : ownerName ? `${ownerName.endsWith('s') ? ownerName + "'" : ownerName + "'s"} ` : 'The ';
    const owned = `${whose}${name}`;
    const article = `${/^[aeiou]/i.test(name) ? 'an' : 'a'} ${name}`;
    const messages = [];
    const late = timeout !== (g.moves || 0);
    if (late) {
        obj.age = Math.max(0, obj.age - ((g.moves || 0) - timeout));
        if (obj.age > 0) {
            beginBurn(obj, true, g);
            return [];
        }
    }
    if (!late && visible) {
        if (oil) messages.push(floor ? 'You see a burning potion of oil go out.' : `${whose}potion of oil has burnt away.`);
        else if (kind === 'oil lamp' || lantern) {
            if ([150, 100, 50, 25].includes(obj.age)) {
                if (lantern) {
                    messages.push(floor ? 'You see a lantern getting dim.' : `${whose}lantern is getting dim.`);
                    if (carried && g.u?.hallucinating) messages.push('Batteries have not been invented yet.');
                } else if (obj.age === 25) messages.push(floor ? `You see ${article} about to go out.` : `${owned} seems about to go out.`);
                else messages.push(floor ? `You see ${article} flicker${obj.age === 50 ? ' considerably' : ''}.`
                    : `${owned} flickers${obj.age === 50 ? ' considerably' : ''}.`);
            }
        } else if (obj.age === 75) {
            messages.push(floor ? `You see ${menorah ? "a candelabrum's " : many ? 'some ' : 'a '}candle${many ? 's' : ''} getting short.`
                : `${whose}${menorah ? "candelabrum's " : ''}candle${many ? 's are' : ' is'} getting short.`);
        } else if (obj.age === 15) {
            messages.push(floor ? `You see ${menorah ? "a candelabrum's " : many ? 'some ' : 'a '}candle${many ? "s'" : "'s"} flame${many ? 's' : ''} flicker low!`
                : `${whose}${menorah ? "candelabrum's " : ''}candle${many ? "s'" : "'s"} flame${many ? 's' : ''} flicker${many ? '' : 's'} low!`);
        }
    }
    if (oil || !obj.age) {
        if (!late && !oil && (visible || bytouch)) {
            if (menorah) messages.push(floor ? `You see a candelabrum's flame${many ? 's' : ''} die.`
                : `${whose}candelabrum's flame${many ? 's die' : ' dies'}.`);
            else if (candle) {
                messages.push(floor ? `You see ${many ? 'some ' + name : article} consumed!` : `${owned} ${many ? 'are' : 'is'} consumed!`);
                if (g.u?.hallucinating) messages.push(many ? 'They shriek!' : 'It shrieks!');
                else if (!g.u?.blind) messages.push(many ? 'Their flames die.' : 'Its flame dies.');
            } else if (lantern) messages.push(floor ? 'You see a lantern run out of power.' : `${whose}lantern has run out of power.`);
            else messages.push(floor ? `You see ${article} go out.` : `${owned} has gone out.`);
        }
        endBurn(obj, false, g);
        if (menorah) { obj.spe = 0; obj.owt = 200; }
        else if (candle || oil) {
            if (deps.remove) deps.remove(obj, entry);
            else entry.list.splice(entry.list.indexOf(obj), 1);
            const recheckHiding = late ? (g.level?.monsters || []).some(mon =>
                mon.mx === entry.x && mon.my === entry.y && !mon.dead && (mon.mhp ?? 1) > 0) : candle;
            if (floor && recheckHiding) deps.unhide?.(entry.x, entry.y);
        }
    } else beginBurn(obj, true, g);
    if (floor && !entry.parent && !late) newsym(entry.x, entry.y);
    delete obj.line;
    return messages;
}

export async function processBurnTimers(g = game, deps = {}) {
    return (await runTimers({ [BURN_OBJECT]: { run: (obj, time) => burnObject(obj, time, deps, g) } }, g,
        timer => timer.func === BURN_OBJECT && !objectLocations(g, true).get(timer.arg)?.saved)).flat();
}
