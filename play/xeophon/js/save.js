// save.js -- Minimal save/restore state for cross-segment persistence.

import { game } from './gstate.js';
import { GameMap } from './game.js';
import { NORMAL_SPEED } from './const.js';
import { updateMonsterTrack } from './montrack.js';

const FIGURINE = 795;
const STATUE = 472;

const SKIP_KEYS = new Set([
    'coreCtx',
    'displayCtx',
    'mockStorage',
    'nhDisplay',
    'rng',
    '_launch_drop_spot',
    '_preNhgetchHook',
]);

export function encodeSaveState() {
    const state = {};
    for (const [key, value] of Object.entries(game)) {
        if (SKIP_KEYS.has(key)) continue;
        state[key] = value instanceof Map ? { __type: 'Map', entries: [...value.entries()] } : value;
    }
    const seen = new WeakSet();
    return JSON.stringify(state, (key, value) => {
        if (SKIP_KEYS.has(key) || typeof value === 'function') return undefined;
        if (typeof value === 'bigint') return Number(value);
        if (!value || typeof value !== 'object') return value;
        if (value instanceof Map) return { __type: 'Map', entries: [...value.entries()] };
        if (seen.has(value)) return undefined;
        seen.add(value);
        return value;
    });
}

function saveClone(value) {
    const seen = new WeakSet();
    return JSON.parse(JSON.stringify(value, (key, item) => {
        if (SKIP_KEYS.has(key) || typeof item === 'function') return undefined;
        if (typeof item === 'bigint') return Number(item);
        if (!item || typeof item !== 'object') return item;
        if (item instanceof Map) return { __type: 'Map', entries: [...item.entries()] };
        if (seen.has(item)) return undefined;
        seen.add(item);
        return item;
    }));
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
    for (const mon of level.monsters || []) {
        mon.mlstmv = 0;
        updateMonsterTrack(mon);
        mon.mtame = 0;
        mon.pet = false;
        mon.mpeaceful = 0;
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
    return JSON.stringify({
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
    const restored = JSON.parse(content, (_key, value) => {
        if (value?.__type === 'Map') return new Map(value.entries || []);
        return value;
    });
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
    const restored = JSON.parse(content, (_key, value) => {
        if (value?.__type === 'Map') return new Map(value.entries || []);
        return value;
    });
    for (const key of Object.keys(game)) delete game[key];
    Object.assign(game, restored);
    game.program_state = {};
    if (game.level) Object.setPrototypeOf(game.level, GameMap.prototype);
    if (game._saved_levels instanceof Map) {
        for (const saved of game._saved_levels.values()) {
            if (saved.level) Object.setPrototypeOf(saved.level, GameMap.prototype);
        }
    }
    if (game.u?.usteed && game.level?.monsters?.length) {
        const steed = game.level.monsters.find(mon =>
            mon.mx === game.u.usteed.mx
            && mon.my === game.u.usteed.my
            && mon.data?.name === game.u.usteed.data?.name);
        if (steed) game.u.usteed = steed;
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
