import { game } from './gstate.js';
import {
    BEAR_TRAP, BLCORNER, BRCORNER, COLNO, CROSSWALL, DB_FLOOR, DB_ICE,
    DB_LAVA, DB_MOAT, DB_UNDER, DBWALL, DOOR, DRAWBRIDGE_DOWN, D_CLOSED,
    D_LOCKED, D_NODOOR,
    DRAWBRIDGE_UP, HWALL, ICED_MOAT, ICED_POOL, ICE, IN_SIGHT, IRONBARS,
    IS_DOOR, IS_WALL, IS_POOL, Is_rogue_level, Is_waterlevel, isok, LANDMINE, LAVAPOOL,
    LAVAWALL, MAGIC_PORTAL, MOAT, POOL, ROOM, ROWNO, SDOOR, STONE, TDWALL,
    TLCORNER, TLWALL, TRCORNER, TRWALL, TT_BURIEDBALL, TT_INFLOOR, TT_LAVA, TUWALL,
    VIBRATING_SQUARE, VWALL, WATER,
} from './const.js';
import { rn1, rn2, rnd } from './rng.js';
import { newsym } from './display.js';
import { vision_recalc } from './vision.js';

const BOULDER = 465;
const CORPSE = 471;
const ROCK = 467;
const HEAVY_IRON_BALL = 474;
const IRON_CHAIN = 475;
const POTION_CLASS = 9;
const FOOD_CLASS = 7;
const POT_OIL = 252;
const BELL = 358;
const BOOK_OF_THE_DEAD = 10097;
const CANDELABRUM_OF_INVOCATION = 10076;
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
const SECRET_DOOR_REVEAL_MESSAGE = 'Your bolt reveals a secret door.';
const DEEP_CRACKING_SOUND_MESSAGE = 'You hear a deep cracking sound.';
const DOOR_FREEZES_SHATTERS_MESSAGE = 'The door freezes and shatters!';
const ROT_ICE_ADJUSTMENT = 2;
const MIN_ICE_TIME = 50;
const MAX_ICE_TIME = 2000;
const RIDER_CORPSE_NAMES = new Set(['death', 'pestilence', 'famine']);
const ORGANIC_MATERIALS = new Set(['liquid', 'wax', 'veggy', 'flesh', 'paper', 'cloth', 'leather', 'wood']);

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

export function processMeltIceTimers(g = game, { afterMelt = null } = {}) {
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
        if (afterMelt) messages.push(...afterMelt(timer.x, timer.y, result));
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

export function unearthObjectsAt(x, y) {
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
        if (restoreBuriedBallIfNeeded(obj, x, y, lvl)) continue;
        obj.buried = false;
        obj.hidden = false;
        clearBuriedOrganicRotTimer(obj);
        obj.ox = x;
        obj.oy = y;
        if (!lvl.objects.includes(obj)) lvl.objects.push(obj);
        objectIceEffect(obj, x, y);
    }
    for (const obj of [...lvl.objects]) {
        if (obj?.ox !== x || obj?.oy !== y || !obj.buried) continue;
        if (restoreBuriedBallIfNeeded(obj, x, y, lvl)) continue;
        obj.buried = false;
        obj.hidden = false;
        clearBuriedOrganicRotTimer(obj);
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

function objectKindText(obj) {
    return String(obj?.actualKind || obj?.kind || obj?.name || obj?.artifact || '').toLowerCase();
}

function isHeroChain(obj) {
    return !!obj && obj === game.u?.uchain;
}

function isHeroBall(obj) {
    return !!obj && obj === game.u?.uball;
}

function isHeavyIronBallObject(obj) {
    return obj?.otyp === HEAVY_IRON_BALL || obj?.cls === 'ball'
        || objectKindText(obj) === 'heavy iron ball';
}

function isBuriedBallTrapType() {
    return game.u?.utraptype === TT_BURIEDBALL || game.u?.utraptype === 'buriedball';
}

export function isBuriedBallTrapActive() {
    return !!game.u?.utrap && isBuriedBallTrapType();
}

function nextLocalIdent() {
    const ident = game._next_ident ?? 2;
    game._next_ident = ident + rnd(2);
    game._level_object_ident_count = (game._level_object_ident_count || 0) + 1;
    return ident;
}

function isRiderCorpse(obj) {
    if (!(obj?.otyp === CORPSE || obj?.otyp === 'corpse')) return false;
    const corpse = obj.corpsenm || obj.corpse || {};
    const name = String(corpse.name || corpse.mname || '').toLowerCase();
    return !!corpse.rider || RIDER_CORPSE_NAMES.has(name);
}

function objectAlwaysResistsBurial(obj) {
    if (isHeroChain(obj)) return true;
    const actual = String(obj?.actualKind || '').toLowerCase();
    const kind = objectKindText(obj);
    if (obj?.realAmuletOfYendor || actual === 'amulet of yendor'
        || (!actual && kind === 'amulet of yendor')) return true;
    if (obj?.otyp === BOOK_OF_THE_DEAD || kind === 'book of the dead') return true;
    if (obj?.otyp === CANDELABRUM_OF_INVOCATION || kind === 'candelabrum of invocation') return true;
    if ((obj?.otyp === BELL || obj?.otyp === 'bell') && kind === 'bell of opening') return true;
    return isRiderCorpse(obj);
}

function deleteHeroChainForBuriedBall(lvl) {
    const chain = game.u?.uchain;
    if (!chain) return;
    rn2(100); // C delobj(chain) reaches obj_resists(chain, 0, 0).
    chain._burialDeleted = true;
    chain.buried = false;
    chain.hidden = false;
    if (lvl?.objects) lvl.objects = lvl.objects.filter(obj => obj !== chain);
}

function clearPunishmentForBuriedBall(ball, lvl) {
    deleteHeroChainForBuriedBall(lvl);
    if (ball) {
        ball.worn = false;
        ball.buriedPunishmentBall = true;
    }
    if (game.u) {
        game.u.uchain = null;
        game.u.uball = null;
        game.u.upunished = false;
        game.u._bcFelt = 0;
    }
    game._punished = 0;
}

function makeRestoredChain(x, y) {
    rnd(1); // C mkobj(CHAIN_CLASS) still consumes the class selection RNG.
    return {
        id: nextLocalIdent(),
        otyp: IRON_CHAIN,
        cls: 'chain',
        kind: 'iron chain',
        actualKind: 'iron chain',
        glyph: '_',
        owt: 120,
        ox: x,
        oy: y,
        bknown: true,
        known: true,
        worn: true,
    };
}

function buriedBallCandidates(lvl) {
    const seen = new Set();
    const candidates = [];
    for (const obj of lvl?.buriedobjlist || []) {
        if (!isHeavyIronBallObject(obj) || seen.has(obj)) continue;
        seen.add(obj);
        candidates.push(obj);
    }
    for (const obj of lvl?.objects || []) {
        if (!obj?.buried || !isHeavyIronBallObject(obj) || seen.has(obj)) continue;
        seen.add(obj);
        candidates.push(obj);
    }
    return candidates;
}

export function findBuriedBallNear(x = game.u?.ux, y = game.u?.uy, lvl = game.level) {
    if (!lvl || x == null || y == null) return null;
    if (game.u?.utrap && !isBuriedBallTrapType()) return null;
    let nearest = null;
    let nearestDist = Infinity;
    for (const obj of buriedBallCandidates(lvl)) {
        if (obj.ox === x && obj.oy === y) return { obj, x, y };
        const dist = (obj.ox - x) ** 2 + (obj.oy - y) ** 2;
        if (dist <= 8 && dist < nearestDist) {
            nearest = obj;
            nearestDist = dist;
        }
    }
    return nearest ? { obj: nearest, x: nearest.ox, y: nearest.oy } : null;
}

function removeBuriedBallFromLevel(ball, lvl) {
    if (!ball || !lvl) return;
    if (lvl.buriedobjlist)
        lvl.buriedobjlist = lvl.buriedobjlist.filter(obj => obj !== ball);
    if (lvl.objects)
        lvl.objects = lvl.objects.filter(obj => obj !== ball || !obj.buried);
}

export function restoreBuriedBallIfNeeded(obj, x, y, lvl = game.level) {
    if (!obj || !isHeavyIronBallObject(obj) || !isBuriedBallTrapType()) return false;
    const ux = game.u.ux ?? x;
    const uy = game.u.uy ?? y;
    removeBuriedBallFromLevel(obj, lvl);
    clearBuriedOrganicRotTimer(obj);
    obj.buried = false;
    obj.hidden = false;
    obj.worn = true;
    obj.ox = ux;
    obj.oy = uy;
    obj.buriedPunishmentBall = false;
    const chain = makeRestoredChain(ux, uy);
    if (lvl) {
        lvl.objects ??= [];
        lvl.objects = (lvl.objects || []).filter(item => item !== obj && item !== chain);
        lvl.objects.push(obj, chain);
    }
    game.u.uball = obj;
    game.u.uchain = chain;
    game.u.upunished = true;
    game.u.utrap = 0;
    game.u.utraptype = null;
    game._punished = 1;
    if (lvl?.engravings) lvl.engravings = lvl.engravings.filter(engr => engr.x !== x || engr.y !== y);
    newsym(x, y);
    newsym(ux, uy);
    return true;
}

export function buriedBallToPunishment(lvl = game.level) {
    const found = findBuriedBallNear(game.u?.ux, game.u?.uy, lvl);
    return !!(found && restoreBuriedBallIfNeeded(found.obj, found.x, found.y, lvl));
}

export function buriedBallToFreedom(lvl = game.level) {
    const found = findBuriedBallNear(game.u?.ux, game.u?.uy, lvl);
    if (!found) return false;
    const ball = found.obj;
    removeBuriedBallFromLevel(ball, lvl);
    clearBuriedOrganicRotTimer(ball);
    ball.buried = false;
    ball.hidden = false;
    ball.worn = false;
    ball.ox = found.x;
    ball.oy = found.y;
    ball.buriedPunishmentBall = false;
    if (lvl) {
        lvl.objects ??= [];
        if (!lvl.objects.includes(ball)) lvl.objects.push(ball);
        if (lvl.engravings) lvl.engravings = lvl.engravings.filter(engr => engr.x !== found.x || engr.y !== found.y);
    }
    if (game.u) {
        game.u.utrap = 0;
        game.u.utraptype = null;
    }
    newsym(found.x, found.y);
    return true;
}

function objectResistsBurial(obj) {
    if (objectAlwaysResistsBurial(obj)) return true;
    rn2(100); // C obj_resists(obj, 0, 0): ordinary objects always fail after RNG.
    return false;
}

function objectResistsChance(obj, ordinaryChance, artifactChance) {
    if (objectAlwaysResistsBurial(obj)) return true;
    const chance = rn2(100);
    return chance < (obj?.artifact || obj?.oartifact ? artifactChance : ordinaryChance);
}

function isPotionObject(obj) {
    return obj?.otyp === POTION_CLASS
        || (typeof obj?.otyp === 'number' && obj.otyp >= 230 && obj.otyp < 270)
        || obj?.cls === 'potion'
        || obj?.glyph === '!';
}

function isPotionOfOilObject(obj) {
    const kind = objectKindText(obj);
    return obj?.otyp === POT_OIL || obj?.potionIndex === 24
        || kind === 'oil' || kind === 'potion of oil';
}

function isRockObject(obj) {
    return obj?.otyp === ROCK || obj?.kind === 'rock' || obj?.isRock;
}

function isBoulderObject(obj) {
    return obj?.otyp === BOULDER || obj?.kind === 'boulder';
}

function isCorpseObjectForBurial(obj) {
    return obj?.otyp === CORPSE || obj?.otyp === 'corpse';
}

function isOrganicObject(obj) {
    if (!obj || isCorpseObjectForBurial(obj) || isPotionObject(obj) || isRockObject(obj) || isBoulderObject(obj))
        return false;
    const material = String(obj.material || obj.oc_material || '').toLowerCase();
    if (ORGANIC_MATERIALS.has(material)) return true;
    if (obj.otyp === FOOD_CLASS || obj.cls === 'food')
        return !/\btin\b/.test(objectKindText(obj));
    if (obj.cls === 'scroll' || obj.cls === 'spellbook') return true;
    const kind = objectKindText(obj);
    return /\b(?:wax|leather|cloth|wood|wooden|paper|scroll|spellbook|book|sack|bag|leash|rope|bow|arrow|club|quarterstaff|aklys|bullwhip|sling|flute|harp|drum|whistle|horn)\b/.test(kind);
}

export function clearBuriedOrganicRotTimer(obj) {
    if (!obj) return;
    delete obj.buriedOrganicRotTurn;
    delete obj.rotOrganicTurn;
    delete obj.rotOrganicTimeout;
    delete obj._buriedOrganicTimed;
}

function maybeStartBuriedOrganicRot(obj, underIce) {
    clearBuriedOrganicRotTimer(obj);
    if (isCorpseObjectForBurial(obj)) return;
    const candidate = underIce ? isPotionObject(obj) : isOrganicObject(obj);
    if (!candidate || objectResistsChance(obj, 5, 95)) return;
    const turn = (game.moves || 0) + (underIce ? 0 : 250) + rnd(250);
    obj.buriedOrganicRotTurn = turn;
    obj.rotOrganicTurn = turn;
    obj.rotOrganicTimeout = turn;
    obj._buriedOrganicTimed = true;
}

function stopObjectBurningForBurial(obj) {
    if (!(obj?.lamplit || obj?.burning) || isPotionOfOilObject(obj)) return;
    obj.lamplit = false;
    obj.burning = false;
    delete obj._burnTimer;
    delete obj.litRadius;
}

function unleashObjectForBurial(obj) {
    if (objectKindText(obj) !== 'leash' || !obj.leashmon) return;
    const leashmon = obj.leashmon;
    obj.leashmon = 0;
    const mon = (game.level?.monsters || []).find(candidate =>
        candidate?.id === leashmon || candidate?.m_id === leashmon || candidate?.mid === leashmon);
    if (mon) {
        mon.mleashed = 0;
        mon.leashed = false;
    }
}

function containedObjects(obj) {
    if (Array.isArray(obj?.contents)) return obj.contents;
    if (Array.isArray(obj?.cobj)) return obj.cobj;
    return [];
}

function buryOneObject(obj, x, y, lvl, underIce = isIceAt(x, y), messages = []) {
    if (isHeroBall(obj)) {
        clearPunishmentForBuriedBall(obj, lvl);
        if (game.u) {
            game.u.utrap = rn1(50, 20);
            game.u.utraptype = TT_BURIEDBALL;
        }
        messages.push('The iron ball gets buried!');
    }
    if (objectResistsBurial(obj)) return 'floor';
    unleashObjectForBurial(obj);
    stopObjectBurningForBurial(obj);
    obj.ox = x;
    obj.oy = y;
    if ((isRockObject(obj) && !underIce) || isBoulderObject(obj)) {
        clearBuriedOrganicRotTimer(obj);
        obj.buried = false;
        obj.hidden = false;
        return 'deleted';
    }
    maybeStartBuriedOrganicRot(obj, underIce);
    obj.buried = true;
    obj.hidden = true;
    lvl.buriedobjlist.push(obj);
    return 'buried';
}

export function buryObjectsAt(x, y, { ignore = null } = {}) {
    const lvl = game.level;
    const messages = [];
    if (!lvl) return messages;
    if (lvl.engravings) lvl.engravings = lvl.engravings.filter(engr => engr.x !== x || engr.y !== y);
    if (!lvl.objects?.length) {
        newsym(x, y);
        return messages;
    }
    lvl.buriedobjlist ??= [];
    const remaining = [];
    const underIce = isIceAt(x, y);
    for (const obj of lvl.objects) {
        if (obj === ignore) {
            remaining.push(obj);
            continue;
        }
        if (obj._burialDeleted) continue;
        if (obj.ox === x && obj.oy === y && !obj.transientProjectile) {
            if (buryOneObject(obj, x, y, lvl, underIce, messages) === 'floor') {
                remaining.push(obj);
            }
        } else {
            remaining.push(obj);
        }
    }
    lvl.objects = remaining.filter(obj => !obj._burialDeleted);
    for (const obj of remaining) delete obj._burialDeleted;
    newsym(x, y);
    return messages;
}

export function processBuriedOrganicRot(g = game) {
    const lvl = g.level;
    if (!lvl?.buriedobjlist?.length) return [];
    const remaining = [];
    const rotted = [];
    const newlyBuried = [];
    const savedList = lvl.buriedobjlist;
    lvl.buriedobjlist = newlyBuried;
    for (const obj of savedList) {
        if (obj?.buriedOrganicRotTurn && obj.buriedOrganicRotTurn <= (g.moves || 0)) {
            const x = obj.ox;
            const y = obj.oy;
            for (const content of containedObjects(obj)) {
                content.ox = x;
                content.oy = y;
                const outcome = buryOneObject(content, x, y, lvl, isIceAt(x, y));
                if (outcome === 'floor') {
                    clearBuriedOrganicRotTimer(content);
                    content.buried = false;
                    content.hidden = false;
                    if (!lvl.objects.includes(content)) lvl.objects.push(content);
                }
            }
            if (Array.isArray(obj.contents)) obj.contents = [];
            if (Array.isArray(obj.cobj)) obj.cobj = [];
            clearBuriedOrganicRotTimer(obj);
            obj.buried = false;
            obj.hidden = false;
            rotted.push(obj);
        } else {
            remaining.push(obj);
        }
    }
    lvl.buriedobjlist = remaining.concat(newlyBuried);
    for (const obj of rotted) newsym(obj.ox, obj.oy);
    return rotted;
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
            messages.push(...buryObjectsAt(x, y));
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

    if (loc.typ === SDOOR || (loc.typ === DOOR && (loc.doormask & (D_CLOSED | D_LOCKED)))) {
        const messages = [];
        const visible = visibleAt(x, y);
        if (loc.typ === SDOOR) {
            loc.typ = DOOR;
            const mask = loc.doormask || 0;
            loc.doormask = Is_rogue_level(game.u?.uz)
                ? D_NODOOR
                : (mask & D_LOCKED) ? mask : (mask | D_CLOSED);
            newsym(x, y);
            if (visible) messages.push(SECRET_DOOR_REVEAL_MESSAGE);
        }
        if (loc.typ === DOOR && (loc.doormask & (D_CLOSED | D_LOCKED))) {
            loc.doormask = D_NODOOR;
            newsym(x, y);
            if (visible) messages.push(DOOR_FREEZES_SHATTERS_MESSAGE);
            else if (!heroDeaf()) messages.push(DEEP_CRACKING_SOUND_MESSAGE);
            return { handled: true, messages, rangeMod: -1000, stopped: true };
        }
        if (messages.length) return { handled: true, messages, rangeMod: 0, stopped: false };
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
    const buryMessages = buryObjectsAt(x, y);
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
    messages.push(...buryMessages);
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
