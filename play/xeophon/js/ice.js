import { game } from './gstate.js';
import {
    BEAR_TRAP, BLCORNER, BRCORNER, COLNO, CROSSWALL, DB_FLOOR, DB_ICE,
    DB_LAVA, DB_MOAT, DB_UNDER, DBWALL, DOOR, DRAWBRIDGE_DOWN,
    DRAWBRIDGE_UP, HWALL, ICED_MOAT, ICED_POOL, ICE, IN_SIGHT, IRONBARS,
    IS_DOOR, IS_WALL, IS_POOL, Is_waterlevel, isok, LANDMINE, LAVAPOOL,
    LAVAWALL, MAGIC_PORTAL, MOAT, POOL, ROOM, ROWNO, SDOOR, STONE, TDWALL,
    TLCORNER, TLWALL, TRCORNER, TRWALL, TT_INFLOOR, TT_LAVA, TUWALL,
    VIBRATING_SQUARE, VWALL, WATER,
} from './const.js';
import { rn1, rn2 } from './rng.js';
import { newsym } from './display.js';
import { vision_recalc } from './vision.js';

const BOULDER = 465;
const CORPSE = 471;
const LAND_MINE = 10160;
const BEARTRAP = 10161;

const ICE_MELT_MESSAGE = 'The ice crackles and melts.';
const ICE_TIMER_MELT_MESSAGE = 'Some ice melts away.';
const BOULDER_SETTLES_MESSAGE = 'A boulder settles...';
const WATER_FREEZES_MESSAGE = 'The water freezes.';
const WATER_FREEZES_MOMENT_MESSAGE = 'The water freezes for a moment.';
const LAVA_SOLIDIFIES_MESSAGE = 'The lava cools and solidifies.';
const LAVA_FREEZES_MOMENT_MESSAGE = 'The lava freezes for a moment.';
const SOFT_CRACKLING_MESSAGE = 'You hear a soft crackling.';
const CRACKLING_SOUND_MESSAGE = 'You hear a crackling sound.';
const ROT_ICE_ADJUSTMENT = 2;
const MIN_ICE_TIME = 50;
const MAX_ICE_TIME = 2000;

export function isIceAt(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    return loc.typ === ICE
        || (loc.typ === DRAWBRIDGE_UP && ((loc.flags || 0) & DB_UNDER) === DB_ICE);
}

function heroAt(x, y) {
    return game.u?.ux === x && game.u?.uy === y;
}

function visibleAt(x, y) {
    return !game.u?.blind && !!(game.viz_array?.[y]?.[x] & IN_SIGHT);
}

function heroDeaf() {
    return !!game.u?._deafTimeout || (game.u?._statusSuffix || '').includes('Deaf');
}

function heroPassesRocks() {
    const form = game.u?._polyself_form || {};
    return !!(game.u?.passWalls || (form.passWalls && !form.unsolid && !form.noncorporeal));
}

function stopMeltTimers(x, y) {
    const loc = game.level?.at(x, y);
    if (loc) {
        delete loc.meltIceTurn;
        delete loc.meltIceTimeout;
        delete loc.meltIceAwayTurn;
    }
    if (game.level?.meltIceTimers)
        game.level.meltIceTimers = game.level.meltIceTimers.filter(timer => timer.x !== x || timer.y !== y);
}

function removeMeltTimers(loc, x, y) {
    if (!loc) return;
    stopMeltTimers(x, y);
}

export function spotMeltIceTimeLeft(x, y) {
    const lvl = game.level;
    if (!lvl?.meltIceTimers?.length) return 0;
    const timer = lvl.meltIceTimers
        .filter(item => item.x === x && item.y === y)
        .sort((a, b) => (a.turn || 0) - (b.turn || 0))[0];
    return timer ? Math.max(0, (timer.turn || 0) - (game.moves || 0)) : 0;
}

export function startMeltIceTimeout(x, y, minTime = 0) {
    const loc = game.level?.at(x, y);
    if (!loc) return 0;
    stopMeltTimers(x, y);

    let when = Math.trunc(minTime || 0);
    if (when < MIN_ICE_TIME - 1) when = MIN_ICE_TIME - 1;
    while (++when <= MAX_ICE_TIME) {
        if (!rn2((MAX_ICE_TIME - when) + MIN_ICE_TIME)) break;
    }
    if (when > MAX_ICE_TIME) return 0;

    const turn = (game.moves || 0) + when;
    loc.meltIceTurn = turn;
    loc.meltIceTimeout = turn;
    loc.meltIceAwayTurn = turn;
    game.level.meltIceTimers ??= [];
    game._meltIceTimerSeq = (game._meltIceTimerSeq || 0) + 1;
    game.level.meltIceTimers.push({ x, y, turn, seq: game._meltIceTimerSeq });
    return turn;
}

export function processMeltIceTimers(g = game) {
    const lvl = g.level;
    if (!lvl?.meltIceTimers?.length) return [];
    const due = [];
    const pending = [];
    for (const timer of lvl.meltIceTimers) {
        if ((timer.turn || 0) <= (g.moves || 0)) due.push(timer);
        else pending.push(timer);
    }
    if (!due.length) return [];
    lvl.meltIceTimers = pending;
    due.sort((a, b) => ((a.turn || 0) - (b.turn || 0)) || ((a.seq || 0) - (b.seq || 0)));

    const messages = [];
    for (const timer of due) {
        const loc = lvl.at(timer.x, timer.y);
        if (!loc) continue;
        delete loc.meltIceTurn;
        delete loc.meltIceTimeout;
        delete loc.meltIceAwayTurn;
        const result = meltIceAt(timer.x, timer.y, { message: ICE_TIMER_MELT_MESSAGE });
        messages.push(...result.messages);
    }
    return messages;
}

function isCorpseObject(obj) {
    return obj?.otyp === CORPSE || obj?.otyp === 'corpse';
}

function corpseOnIce(obj) {
    return !!(obj?.onIce || obj?.on_ice);
}

function setCorpseOnIce(obj, value) {
    obj.onIce = !!value;
    obj.on_ice = value ? 1 : 0;
}

function objectTimerKey(obj) {
    if (obj?.rotAwayTurn) return 'rotAwayTurn';
    if (obj?.reviveTurn) return 'reviveTurn';
    return null;
}

function adjustCorpseIceTimer(obj, x, y, { onLevel = true } = {}) {
    if (!isCorpseObject(obj)) return;
    const key = objectTimerKey(obj);
    if (!key) return;

    const moves = game.moves || 0;
    const nowOnIce = onLevel && isIceAt(x, y);
    const wasOnIce = corpseOnIce(obj);
    let tleft = Math.trunc((obj[key] || 0) - moves);
    if (tleft <= 0) return;

    const ageElapsed = Math.trunc(moves - (obj.age ?? moves));
    if (nowOnIce && !wasOnIce) {
        setCorpseOnIce(obj, true);
        obj[key] = moves + (tleft * ROT_ICE_ADJUSTMENT);
        obj.age = moves - (ageElapsed * ROT_ICE_ADJUSTMENT);
    } else if (wasOnIce && !nowOnIce) {
        setCorpseOnIce(obj, false);
        obj[key] = moves + Math.trunc(tleft / ROT_ICE_ADJUSTMENT);
        obj.age = (obj.age ?? moves) + Math.trunc(ageElapsed * (ROT_ICE_ADJUSTMENT - 1) / ROT_ICE_ADJUSTMENT);
    }
}

export function objectIceEffect(obj, x = obj?.ox, y = obj?.oy, options = {}) {
    if (x == null || y == null) return;
    adjustCorpseIceTimer(obj, x, y, options);
}

export function objIceEffectsAt(x, y, { doBuried = false } = {}) {
    const lvl = game.level;
    if (!lvl) return;
    const seen = new Set();
    for (const obj of lvl.objects || []) {
        if (obj?.ox !== x || obj?.oy !== y || obj.buried) continue;
        seen.add(obj);
        objectIceEffect(obj, x, y);
    }
    if (!doBuried) return;
    for (const obj of lvl.buriedobjlist || []) {
        if (obj?.ox !== x || obj?.oy !== y || seen.has(obj)) continue;
        seen.add(obj);
        objectIceEffect(obj, x, y);
    }
    for (const obj of lvl.objects || []) {
        if (obj?.ox !== x || obj?.oy !== y || !obj.buried || seen.has(obj)) continue;
        objectIceEffect(obj, x, y);
    }
}

function applyTrapIceEffects(x, y) {
    const trap = (game.level?.traps || []).find(item => item.tx === x && item.ty === y);
    if (!trap) return;
    const mon = (game.level?.monsters || []).find(candidate => candidate.mx === x && candidate.my === y);
    if (mon) mon.mtrapped = 0;
    if (trap.ttyp === BEAR_TRAP || trap.ttyp === LANDMINE) {
        const object = trap.ttyp === LANDMINE
            ? { otyp: LAND_MINE, cls: 'tool', glyph: '(', kind: 'land mine', actualKind: 'land mine' }
            : { otyp: BEARTRAP, cls: 'tool', glyph: '(', kind: 'beartrap', actualKind: 'beartrap' };
        game.level.objects ??= [];
        game.level.objects.push({ ...object, ox: x, oy: y, buried: false, hidden: false });
    }
    if (trap.ttyp !== MAGIC_PORTAL && trap.ttyp !== VIBRATING_SQUARE)
        game.level.traps = (game.level?.traps || []).filter(item => item !== trap);
}

function unearthObjectsAt(x, y) {
    const lvl = game.level;
    if (!lvl) return;
    const unearthed = [];
    if (lvl.buriedobjlist?.length) {
        const buried = [];
        for (const obj of lvl.buriedobjlist) {
            if (obj?.ox === x && obj?.oy === y) unearthed.push(obj);
            else buried.push(obj);
        }
        lvl.buriedobjlist = buried;
    }
    lvl.objects ??= [];
    for (const obj of unearthed) {
        obj.buried = false;
        obj.hidden = false;
        obj.ox = x;
        obj.oy = y;
        if (!lvl.objects.includes(obj)) lvl.objects.push(obj);
        objectIceEffect(obj, x, y);
    }
    for (const obj of lvl.objects) {
        if (obj?.ox !== x || obj?.oy !== y || !obj.buried) continue;
        obj.buried = false;
        obj.hidden = false;
        objectIceEffect(obj, x, y);
    }
    if (lvl.engravings) lvl.engravings = lvl.engravings.filter(engr => engr.x !== x || engr.y !== y);
}

function boulderAt(x, y) {
    return (game.level?.objects || []).find(obj =>
        !obj.buried && !obj.hidden && obj.otyp === BOULDER && obj.ox === x && obj.oy === y);
}

function removeObject(obj) {
    if (!game.level?.objects) return;
    game.level.objects = game.level.objects.filter(item => item !== obj);
}

function buryObjectsAt(x, y) {
    const lvl = game.level;
    if (!lvl?.objects?.length) return;
    lvl.buriedobjlist ??= [];
    const remaining = [];
    for (const obj of lvl.objects) {
        if (obj.ox === x && obj.oy === y && !obj.transientProjectile) {
            obj.buried = true;
            obj.hidden = true;
            lvl.buriedobjlist.push(obj);
        } else {
            remaining.push(obj);
        }
    }
    lvl.objects = remaining;
}

function isSolidTile(x, y) {
    if (!isok(x, y)) return true;
    const typ = game.level?.at(x, y)?.typ ?? STONE;
    return typ === STONE || isWallTile(x, y);
}

function isWallTile(x, y) {
    if (!isok(x, y)) return false;
    const typ = game.level?.at(x, y)?.typ ?? STONE;
    return IS_WALL(typ) || IS_DOOR(typ) || typ === LAVAWALL
        || typ === WATER || typ === SDOOR || typ === IRONBARS;
}

function wallOrStone(x, y) {
    return isSolidTile(x, y) ? 1 : 0;
}

function extendSpine(locale, wallThere, dx, dy) {
    const nx = 1 + dx;
    const ny = 1 + dy;
    if (!wallThere) return 0;
    if (dx) {
        if (locale[1][0] && locale[1][2] && locale[nx][0] && locale[nx][2]) return 0;
        return 1;
    }
    if (locale[0][1] && locale[2][1] && locale[0][ny] && locale[2][ny]) return 0;
    return 1;
}

function fixWallSpinesNear(x1, y1, x2, y2) {
    const spineArray = [VWALL, HWALL, HWALL, HWALL,
        VWALL, TRCORNER, TLCORNER, TDWALL,
        VWALL, BRCORNER, BLCORNER, TUWALL,
        VWALL, TLWALL, TRWALL, CROSSWALL];
    const map = game.level;
    if (!map) return;
    for (let x = x1; x <= x2; x++) {
        for (let y = y1; y <= y2; y++) {
            const loc = map.at(x, y);
            const typ = loc?.typ ?? STONE;
            if (!(IS_WALL(typ) && typ !== DBWALL)) continue;
            const locale = [
                [wallOrStone(x - 1, y - 1), wallOrStone(x - 1, y), wallOrStone(x - 1, y + 1)],
                [wallOrStone(x, y - 1), 0, wallOrStone(x, y + 1)],
                [wallOrStone(x + 1, y - 1), wallOrStone(x + 1, y), wallOrStone(x + 1, y + 1)],
            ];
            const bits = (extendSpine(locale, isWallTile(x, y - 1), 0, -1) << 3)
                | (extendSpine(locale, isWallTile(x, y + 1), 0, 1) << 2)
                | (extendSpine(locale, isWallTile(x + 1, y), 1, 0) << 1)
                | extendSpine(locale, isWallTile(x - 1, y), -1, 0);
            if (bits) loc.typ = spineArray[bits];
        }
    }
}

function redrawNear(x1, y1, x2, y2) {
    for (let x = x1; x <= x2; x++) {
        for (let y = y1; y <= y2; y++) {
            if (isok(x, y)) newsym(x, y);
        }
    }
}

function moatAt(loc) {
    return loc?.typ === MOAT
        || (loc?.typ === DRAWBRIDGE_UP && ((loc.flags || 0) & DB_UNDER) === DB_MOAT);
}

function lavaAt(loc) {
    return loc?.typ === LAVAPOOL || loc?.typ === LAVAWALL
        || (loc?.typ === DRAWBRIDGE_UP && ((loc.flags || 0) & DB_UNDER) === DB_LAVA);
}

function lavaWallTurnsVertical(x, y) {
    return (isok(x, y - 1) && IS_WALL(game.level?.at(x, y - 1)?.typ))
        || (isok(x, y + 1) && IS_WALL(game.level?.at(x, y + 1)?.typ));
}

function applyHeroCoolingLavaTrap(messages) {
    if (!game.u?.utrap || !(game.u.utraptype === TT_LAVA || game.u.utraptype === 'lava')) return;
    if (heroPassesRocks()) {
        messages.push('You pass through the now-solid rock.');
        game.u.utrap = 0;
        game.u.utraptype = null;
        return;
    }
    game.u.utrap = rn1(50, 20);
    game.u.utraptype = TT_INFLOOR;
    messages.push('You are firmly stuck in the cooling rock.');
}

function waterbodyName(loc) {
    if (loc?.typ === MOAT || loc?.typ === DRAWBRIDGE_UP) return 'moat';
    return 'pool of water';
}

function isLiquidPoolLocation(loc) {
    if (!loc) return false;
    if (loc.typ === DRAWBRIDGE_UP) return ((loc.flags || 0) & DB_UNDER) === DB_MOAT;
    return IS_POOL(loc.typ);
}

function settleBouldersAt(x, y) {
    const messages = [];
    let loc = game.level?.at(x, y);
    while (isLiquidPoolLocation(loc)) {
        const boulder = boulderAt(x, y);
        if (!boulder) break;
        const visible = visibleAt(x, y);
        if (visible) messages.push(BOULDER_SETTLES_MESSAGE);
        removeObject(boulder);
        const fills = !Is_waterlevel(game.u?.uz) && rn2(10) !== 0;
        const what = waterbodyName(loc);
        if (fills) {
            if (loc.typ === DRAWBRIDGE_UP) loc.flags = ((loc.flags || 0) & ~DB_UNDER) | DB_FLOOR;
            else {
                loc.typ = ROOM;
                loc.flags = 0;
            }
            game.level.traps = (game.level?.traps || []).filter(trap => trap.tx !== x || trap.ty !== y);
            buryObjectsAt(x, y);
            newsym(x, y);
        }
        if (visible) {
            messages.push(`There is a large splash as the boulder ${fills ? 'fills' : 'falls into'} the ${what}.`);
        } else if (!game.u?._deafTimeout && !(game.u?._statusSuffix || '').includes('Deaf')) {
            messages.push('You hear a splash.');
        }
        loc = game.level?.at(x, y);
    }
    return messages;
}

export function applyColdRayTerrain(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return { handled: false, messages: [], rangeMod: 0, stopped: false };

    const lava = lavaAt(loc);
    const lavawall = loc.typ === LAVAWALL;
    const momentaryLavaWall = lavawall && rn2(Math.max(2, 5 + (game.level?.flags?.temperature || 0) * 10));

    if (loc.typ === WATER || momentaryLavaWall) {
        const messages = [];
        if (visibleAt(x, y)) messages.push(lavawall ? LAVA_FREEZES_MOMENT_MESSAGE : WATER_FREEZES_MOMENT_MESSAGE);
        else if (!heroDeaf()) messages.push(SOFT_CRACKLING_MESSAGE);
        return { handled: true, messages, rangeMod: -1000, stopped: true };
    }

    if (isIceAt(x, y)) {
        const meltTime = spotMeltIceTimeLeft(x, y);
        if (meltTime) startMeltIceTimeout(x, y, meltTime);
        return { handled: true, messages: [], rangeMod: 0, stopped: false };
    }

    if (!(lava || loc.typ === POOL || loc.typ === MOAT
        || (loc.typ === DRAWBRIDGE_UP && ((loc.flags || 0) & DB_UNDER) === DB_MOAT))) {
        return { handled: false, messages: [], rangeMod: 0, stopped: false };
    }

    const wasMoat = moatAt(loc);
    let solidifiedWall = false;
    if (loc.typ === DRAWBRIDGE_UP) {
        loc.flags = ((loc.flags || 0) & ~DB_UNDER) | (lava ? DB_FLOOR : DB_ICE);
    } else if (lavawall) {
        loc.flags = 0;
        loc.icedpool = 0;
        loc.typ = lavaWallTurnsVertical(x, y) ? VWALL : HWALL;
        fixWallSpinesNear(Math.max(0, x - 1), Math.max(0, y - 1), Math.min(COLNO - 1, x + 1), Math.min(ROWNO - 1, y + 1));
        solidifiedWall = true;
    } else {
        loc.icedpool = lava ? 0 : loc.typ === POOL ? ICED_POOL : ICED_MOAT;
        if (lava) loc.flags = 0;
        loc.typ = lava ? ROOM : ICE;
    }
    buryObjectsAt(x, y);
    if (!lava) {
        startMeltIceTimeout(x, y, 0);
        objIceEffectsAt(x, y, { doBuried: true });
    }

    const mon = (game.level?.monsters || []).find(candidate => candidate.mx === x && candidate.my === y);
    const heroMessages = [];
    if (mon?.mundetected) mon.mundetected = 0;
    if (game.u?.uinwater && heroAt(x, y)) {
        game.u.uinwater = 0;
        game.u.underwater = false;
        game.u.uunderwater = false;
        game.u.uundetected = 0;
        vision_recalc(1);
    } else if (lava && heroAt(x, y)) {
        applyHeroCoolingLavaTrap(heroMessages);
    }
    newsym(x, y);
    if (solidifiedWall)
        redrawNear(Math.max(0, x - 1), Math.max(0, y - 1), Math.min(COLNO - 1, x + 1), Math.min(ROWNO - 1, y + 1));

    const messages = [];
    if (visibleAt(x, y)) messages.push(lava ? LAVA_SOLIDIFIES_MESSAGE : wasMoat ? 'The moat is bridged with ice!' : WATER_FREEZES_MESSAGE);
    else if (!lava && !heroDeaf()) messages.push(CRACKLING_SOUND_MESSAGE);
    messages.push(...heroMessages);
    return { handled: true, messages, rangeMod: -3, stopped: false, blocked: solidifiedWall };
}

export function meltIceAt(x, y, { message = ICE_MELT_MESSAGE } = {}) {
    const loc = game.level?.at(x, y);
    if (!loc || !isIceAt(x, y)) return { melted: false, messages: [], becameLiquid: false };

    if (loc.typ === DRAWBRIDGE_UP || loc.typ === DRAWBRIDGE_DOWN) {
        loc.flags = ((loc.flags || 0) & ~DB_UNDER) | DB_MOAT;
    } else {
        loc.typ = (loc.flags || loc.icedpool) === ICED_POOL ? POOL : MOAT;
        loc.flags = 0;
        delete loc.icedpool;
    }
    removeMeltTimers(loc, x, y);
    applyTrapIceEffects(x, y);
    objIceEffectsAt(x, y, { doBuried: false });
    unearthObjectsAt(x, y);
    if (game.u?.underwater || game.u?.uunderwater) vision_recalc(1);
    newsym(x, y);

    const messages = [];
    if (visibleAt(x, y) || heroAt(x, y)) messages.push(message);
    messages.push(...settleBouldersAt(x, y));
    const finalLoc = game.level?.at(x, y);
    return { melted: true, messages, becameLiquid: isLiquidPoolLocation(finalLoc) };
}
