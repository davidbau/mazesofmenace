// save.js -- Minimal save/restore state for cross-segment persistence.

import { game } from './gstate.js';
import { GameMap } from './game.js';
import { HOLE, NORMAL_SPEED } from './const.js';
import { updateMonsterTrack } from './montrack.js';
import { MONS, SPECIAL_PM } from './permonst.js';

const FIGURINE = 795;
const STATUE = 472;
const CORPSE = 471;

// C: objects.h oc_uses_known is set for every weapon, armor, and wand,
// and only these specific types in the remaining classes.
const BONES_USES_KNOWN = new Set([
    'adornment', 'gain strength', 'gain constitution', 'increase accuracy',
    'increase damage', 'protection', 'amulet of yendor',
    'cheap plastic imitation of the amulet of yendor', 'bag of tricks',
    'expensive camera', 'crystal ball', 'tinning kit', 'can of grease',
    'magic marker', 'magic flute', 'frost horn', 'fire horn', 'horn of plenty',
    'magic harp', 'drum of earthquake', 'pick-axe', 'grappling hook',
    'unicorn horn', 'candelabrum of invocation', 'bell of opening',
    'egg', 'tin', 'novel', 'book of the dead',
]);
const BONES_SPECIAL_CORPSES = new Set(MONS.slice(SPECIAL_PM)
    .flatMap(mon => [mon.name, ...(mon.names || [])]).map(name => name.toLowerCase()));

const SKIP_KEYS = new Set([
    'coreCtx',
    'displayCtx',
    'mockStorage',
    'nhDisplay',
    'rng',
    '_launch_drop_spot',
    '_preNhgetchHook',
]);

// C restore.c relinks equipment, occupation objects, and monster pointers.
// Keep those identities in JSON by pointing repeated values at their first path.
function encodeSaveGraph(state) {
    const paths = new WeakMap();
    return JSON.stringify(state, function (key, value) {
        if (SKIP_KEYS.has(key) || typeof value === 'function') return undefined;
        if (typeof value === 'bigint') return Number(value);
        if (!value || typeof value !== 'object') return value;
        if (paths.has(value)) return { __type: 'Reference', path: [...paths.get(value)] };
        const path = paths.has(this) ? [...paths.get(this), key] : [];
        paths.set(value, path);
        if (value instanceof Map) {
            const wrapper = { __type: 'Map', entries: [...value.entries()] };
            paths.set(wrapper, path);
            return wrapper;
        }
        return value;
    });
}

function decodeSaveGraph(content, rootTarget = null) {
    const root = JSON.parse(content);
    const decoded = new WeakMap();
    function restore(value) {
        if (!value || typeof value !== 'object') return value;
        if (value.__type === 'Reference')
            return restore(value.path.reduce((target, key) => target[key], root));
        if (decoded.has(value)) return decoded.get(value);
        const result = value === root && rootTarget ? rootTarget
            : value.__type === 'Map' ? new Map() : Array.isArray(value) ? [] : {};
        decoded.set(value, result);
        if (result === rootTarget)
            for (const key of Object.keys(result)) delete result[key];
        if (result instanceof Map) {
            for (const [key, item] of value.entries || []) result.set(restore(key), restore(item));
        } else {
            for (const [key, item] of Object.entries(value)) result[key] = restore(item);
        }
        return result;
    }
    return restore(root);
}

export function encodeSaveState() {
    return encodeSaveGraph(game);
}

function saveClone(value) {
    return decodeSaveGraph(encodeSaveGraph(value));
}

function countObjects(objects = []) {
    let count = 0;
    for (const obj of objects) {
        count++;
        count += countObjects(obj.cobj || obj.contents || []);
    }
    return count;
}

function countRestoreIdentities(level) {
    let count = countObjects(level?.objects || []) + countObjects(level?.buriedobjlist || []);
    for (const obj of level?.objects || [])
        if (obj.transientProjectile) count++;
    for (const mon of level?.monsters || []) {
        count++;
        count += countObjects(mon.minvent || []);
    }
    return count;
}

// C: bones.c resetobjs(FALSE). Only the cloned bones object chains are
// modified; pointers back to containers or monsters are not traversal edges.
function resetBonesObjects(objects = []) {
    for (let index = objects.length - 1; index >= 0; index--) {
        const obj = objects[index];
        resetBonesObjects(obj.cobj || obj.contents || []);
        if (obj.in_use || obj.inUse) {
            objects.splice(index, 1);
            continue;
        }
        const kind = String(obj.actualKind || obj.kind || '')
            .replace(/ named .*$/i, '').trim().toLowerCase();
        if (['weapon', 'armor', 'wand'].includes(obj.cls || obj.oclass)
            || [')', '[', '/'].includes(obj.glyph)
            || [1, 2, 10, 10001, 10004].includes(obj.otyp) // port class IDs, egg, tin
            || (obj.ringRoll >= 1 && obj.ringRoll <= 6)
            || BONES_USES_KNOWN.has(kind.replace(/^ring of /, '')))
            obj.known = false;
        for (const field of ['dknown', 'bknown', 'rknown', 'lknown', 'cknown', 'tknown', 'no_charge'])
            obj[field] = false;
        obj.invlet = 0;
        obj.how_lost = 0;
        // These are the port's cached equivalents of the old inventory letter
        // and doname() output, which include the previous hero's observations.
        delete obj.letter;
        delete obj.line;

        const corpse = obj.otyp === CORPSE || obj.otyp === 'corpse' || kind.endsWith('corpse');
        const specialCorpse = corpse && (Number(obj.corpsenm?.pm ?? obj.corpsenm) >= SPECIAL_PM
            || BONES_SPECIAL_CORPSES.has(String(obj.corpsenm?.name || '').toLowerCase()));
        const keepName = obj.oartifact || obj.artifact || obj.otyp === STATUE
            || kind === 'statue' || kind === 'novel' || specialCorpse;
        if (!keepName) {
            delete obj.oname;
            delete obj._wish_object_name;
            if (obj.oextra) delete obj.oextra.oname;
            if (obj.kind) obj.kind = obj.kind.replace(/ named .*$/i, '');
        }
    }
}

function stripHeroDroppedFigurineTimer(obj) {
    const kind = String(obj?.actualKind || obj?.kind || '').toLowerCase();
    if (obj?.otyp !== FIGURINE && kind !== 'figurine') return;
    delete obj.figurineTransformTurn;
    delete obj._figurine_transform_seq;
}

function findHeroDeathStatue(level, ux, uy) {
    const owner = game.plname || 'wizard';
    return (level.objects || []).find(obj => obj?._death_remains === 'statue')
        || (level.objects || []).find(obj =>
            (obj?.otyp === STATUE || obj?.kind === 'statue')
            && obj.ox === ux && obj.oy === uy && obj.oname === owner);
}

function forceLaunchPlacementForBones() {
    const spot = game._launch_drop_spot;
    if (!spot?.obj || !game.level) return false;
    const obj = spot.obj;
    obj.otrapped = 0;
    obj.hidden = false;
    obj.transientProjectile = false;
    obj.ox = spot.x;
    obj.oy = spot.y;
    game.level.objects = (game.level.objects || []).filter(item => item !== obj);
    game.level.objects.push(obj);
    delete game._launch_drop_spot;
    return true;
}

export function encodeBonesLevel() {
    forceLaunchPlacementForBones();
    const level = saveClone(game.level);
    const ux = game.u?.ux || 0;
    const uy = game.u?.uy || 0;
    level.monsters = (level.monsters || []).filter(Boolean);
    for (const trap of level.traps || []) {
        trap.madeby_u = false;
        trap.tseen = trap.ttyp === HOLE;
    }
    level.objects ??= [];
    const heroStatue = game._death_bones_body === 'statue' ? findHeroDeathStatue(level, ux, uy) : null;
    for (const obj of level.objects) delete obj._death_remains;
    if (heroStatue) heroStatue.contents = [];
    for (const item of game.inventory || []) {
        const dropped = saveClone(item);
        stripHeroDroppedFigurineTimer(dropped);
        delete dropped.worn;
        delete dropped.wielded;
        delete dropped.alternate;
        if (heroStatue) {
            delete dropped.ox;
            delete dropped.oy;
            dropped.contained = true;
            heroStatue.contents.push(dropped);
        } else {
            dropped.ox = ux;
            dropped.oy = uy;
            level.objects.push(dropped);
        }
    }
    if (game._bones_ghost) {
        level.monsters ??= [];
        level.monsters.push(saveClone(game._bones_ghost));
    }
    resetBonesObjects(level.objects);
    resetBonesObjects(level.buriedobjlist);
    for (const mon of level.monsters) {
        resetBonesObjects(mon.minvent);
        mon.mlstmv = 0;
        mon.seen_resistance = 0;
        updateMonsterTrack(mon);
        // C ref: bones.c savebones() — only tame monsters are stripped of
        // tameness/peacefulness; other monsters keep their saved state and
        // getbones()/getlev() recompute it against the next hero at load time.
        if (mon.mtame || mon.pet) {
            mon.mtame = 0;
            mon.pet = false;
            mon.mpeaceful = 0;
        }
    }
    return encodeSaveGraph({
        dnum: game.u?.uz?.dnum ?? 0,
        dlevel: game.u?.uz?.dlevel ?? 1,
        owner: game.plname || '',
        level,
        stairs: saveClone(game.stairs),
        utrack: saveClone(game._utrack || []),
        restoreIdentityCount: countRestoreIdentities(level),
    });
}

export function restoreBonesLevel(content) {
    const restored = decodeSaveGraph(content);
    if (!restored.level) return false;
    Object.setPrototypeOf(restored.level, GameMap.prototype);
    for (const column of restored.level.locations || []) {
        for (const loc of column || []) {
            loc.disp_ch = '';
            loc.disp_color = 8;
            loc.disp_attr = 0;
            loc.seenv = 0;
            loc.waslit = false;
            loc.lastseentyp = null;
            loc.lastseendoormask = null;
            loc.lastseenwall_info = null;
            loc.remembered_glyph = null;
        }
    }
    for (const mon of restored.level.monsters || []) updateMonsterTrack(mon);
    game.level = restored.level;
    game.stairs = restored.stairs || null;
    game._utrack = [...(restored.utrack || [])];
    game._bones_familiar = !!restored.owner && restored.owner === game.plname;
    game._bones_restore_identity_count = restored.restoreIdentityCount || countRestoreIdentities(restored.level);
    if ((restored.level.monsters || []).some(mon => (mon.movement || 0) >= NORMAL_SPEED))
        game._monster_turns_started = 1;
    return true;
}

export function restoreSaveState(content) {
    // Root references must resolve to the live game, including Map keys.
    decodeSaveGraph(content, game);
    game.program_state = {};
    if (game.level) Object.setPrototypeOf(game.level, GameMap.prototype);
    if (game._saved_levels instanceof Map) {
        for (const saved of game._saved_levels.values()) {
            if (saved.level) Object.setPrototypeOf(saved.level, GameMap.prototype);
        }
    }
}

function normalizeSavedGenocideName(name) {
    let lower = String(name || '').trim().toLowerCase();
    lower = lower.replace(/^['"]|['"]$/g, '').replace(/^(?:a|an|the) /, '').replace(/\s+/g, ' ');
    const irregular = {
        dwarves: 'dwarf',
        elves: 'elf',
        fungi: 'fungus',
        men: 'human',
        humans: 'human',
        bees: 'bee',
        vortices: 'vortex',
        liches: 'lich',
    }[lower];
    if (irregular) return irregular;
    if (lower.endsWith('ies')) return `${lower.slice(0, -3)}y`;
    if (lower.endsWith('ves')) return `${lower.slice(0, -3)}f`;
    if (lower.endsWith('ses') || lower.endsWith('xes') || lower.endsWith('zes')
        || lower.endsWith('ches') || lower.endsWith('shes'))
        return lower.slice(0, -2);
    if (lower.endsWith('s') && !lower.endsWith('ss')) return lower.slice(0, -1);
    return lower;
}

function savedHeroRoleName(g) {
    return g.urole?.name?.[g.flags?.female ? 'f' : 'm']
        || g.urole?.name?.m
        || g._startup_role
        || 'adventurer';
}

function savedHeroBaseIsGenocided(g) {
    const role = normalizeSavedGenocideName(savedHeroRoleName(g));
    const race = normalizeSavedGenocideName(g._startup_race || g.urace?.noun || g.urace?.adj || '');
    const raceAdj = normalizeSavedGenocideName(g.urace?.adj || '');
    return (g._genocided_monsters || []).some(name => {
        const lower = normalizeSavedGenocideName(name);
        return !!lower && (lower === role || lower === race || lower === raceAdj
            || (race === 'human' && lower === 'human') || (raceAdj === 'human' && lower === 'human'));
    });
}

function savedPolyselfDeadInsideState(g) {
    const form = g.u?._polyself_form || g.u?.youmonst?.data || {};
    const name = String(form.name || '').toLowerCase();
    const mlet = form.mlet || form.glyph || '';
    if (name.endsWith(' golem') || name.includes('vortex') || mlet === "'" || mlet === 'v')
        return 'empty';
    if (form.undead || form.vampshifter || ['L', 'M', 'V', 'W', 'Z', 'ghost'].includes(mlet)
        || /\b(?:ghost|shade|lich|mummy|zombie|vampire|wraith|nazgul|skeleton|ghoul)\b/.test(name))
        return 'condemned';
    return 'dead';
}

export function restoredPolymorphedGenocideWelcomeMessage(g = game) {
    if (!g.u?._polyself_form) return '';
    if (!savedHeroBaseIsGenocided(g)) return '';
    return `You're back, but you still feel ${savedPolyselfDeadInsideState(g)} inside.`;
}

export function setRestoreCalendar(datetime) {
    const g = game;
    g.flags ??= {};
    g._calendar_messages = [];
    g.flags.friday13 = 0;
    if (!/^\d{14}$/.test(String(datetime || ''))) return;
    const dt = String(datetime);
    const year = Number(dt.slice(0, 4));
    const month = Number(dt.slice(4, 6));
    const day = Number(dt.slice(6, 8));
    const diy = Math.trunc((Date.UTC(year, month - 1, day) - Date.UTC(year, 0, 1)) / 86400000);
    const goldn = ((year - 1900) % 19) + 1;
    let epact = (11 * goldn + 18) % 30;
    if ((epact === 25 && goldn > 11) || epact === 24) epact++;
    g.flags.moonphase = (Math.trunc(((((diy + epact) * 6) + 11) % 177) / 22) & 7);
    if (g.flags.moonphase === 4) {
        g.u.uluck = (g.u.uluck || 0) + 1;
        g._calendar_messages.push('You are lucky!  Full moon tonight.');
    } else if (g.flags.moonphase === 0) {
        g._calendar_messages.push('Be careful!  New moon tonight.');
    }
    if (new Date(Date.UTC(year, month - 1, day)).getUTCDay() === 5 && day === 13) {
        g.flags.friday13 = 1;
        g.u.uluck = (g.u.uluck || 0) - 1;
        g._calendar_messages.push('Watch out!  Bad things can happen on Friday the 13th.');
    }
}
