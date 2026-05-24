import { game } from './gstate.js';
import { DB_MOAT, DB_UNDER, DRAWBRIDGE_UP, IN_SIGHT, IS_POOL, Is_waterlevel } from './const.js';
import { newsym } from './display.js';
import { dropMonsterInventory, enextoMonsterSpot, mkcorpstat, next_ident, noteleportLevelForMonster, rlocNoMsg } from './mklev.js';
import { d, rn2, rnd } from './rng.js';
import { CLR_BROWN } from './terminal.js';

const CORPSE = 471;
const SCR_BLANK_PAPER = 293;
const POT_ACID = 238;
const POT_WATER = 253;
const POTION_CLASS = 9;
const SPBOOK_NO_NOVEL = 11;
const BOOK_OF_THE_DEAD = 10097;
const OIL_LAMP = 227;
const MAGIC_LAMP = 228;
const BRASS_LANTERN = 226;
const TELEPORTING_MONSTERS = new Set([
    'tengu', 'leprechaun', 'wood nymph', 'water nymph', 'mountain nymph',
    'quantum mechanic', 'genetic engineer', 'Wizard of Yendor',
]);
const BREATHLESS_MLETS = new Set(['E', 'V', 'W', 'M', 'Z', "'", 'vortex']);
const BREATHLESS_NAME_RE = /\b(?:golem|elemental|vortex|ghost|shade|skeleton|zombie|mummy|wraith|lich|vampire)\b/i;
const RUSTABLE_RE = /\b(?:iron|steel|metal|chain mail|scale mail|splint mail|plate mail|ring mail|helm|helmet|dagger|sword|axe|pick-axe|mattock|morning star|flail|mace|spear|trident|shuriken|dart|crossbow bolt|arrow)\b/i;

function monsterVisibleAt(mon, x, y) {
    return !game.u?.blind && !!(game.viz_array?.[y]?.[x] & IN_SIGHT)
        && !mon?.minvis && !mon?.mundetected;
}

function monsterCanStayAbovePool(mon) {
    const data = mon?.data || {};
    return (data.inAir || data.flyer || data.floater) && !Is_waterlevel(game.u?.uz);
}

function monsterCantDrown(mon) {
    const data = mon?.data || {};
    return !!(data.swimmer || data.amphibious || data.breathless || data.nonliving || data.clinger
        || BREATHLESS_MLETS.has(data.mlet) || BREATHLESS_NAME_RE.test(data.name || ''));
}

function isPostMeltLiquid(loc) {
    if (!loc) return false;
    if (loc.typ === DRAWBRIDGE_UP) return ((loc.flags || 0) & DB_UNDER) === DB_MOAT;
    return IS_POOL(loc.typ);
}

function monsterCanTeleport(mon) {
    const data = mon?.data || {};
    return !!(data.canTeleport || data.teleport || data.tport
        || TELEPORTING_MONSTERS.has(data.name || mon?.name));
}

function simpleMonsterName(mon) {
    return mon?.givenName || mon?.data?.name || 'creature';
}

function monsterSubject(mon) {
    const name = simpleMonsterName(mon);
    return /^[A-Z]/.test(name) || mon?.proper ? name : `The ${name}`;
}

function objectKindText(obj) {
    return String(obj?.actualKind || obj?.kind || obj?.spellName || obj?.name || '').toLowerCase();
}

function itemClass(obj) {
    if (!obj) return '';
    if (obj.cls) return obj.cls;
    if (obj.otyp === POTION_CLASS || obj.otyp === POT_WATER
        || (typeof obj.otyp === 'number' && obj.otyp >= 230 && obj.otyp < 270)
        || obj.glyph === '!') return 'potion';
    if (obj.otyp === SCR_BLANK_PAPER || obj.glyph === '?') return 'scroll';
    if (obj.otyp === SPBOOK_NO_NOVEL || obj.otyp === BOOK_OF_THE_DEAD || obj.glyph === '+') return 'spellbook';
    return '';
}

function isWaterPotion(obj) {
    const kind = objectKindText(obj).replace(/^potion of /, '');
    return obj?.otyp === POT_WATER || kind === 'water' || kind === 'holy water' || kind === 'unholy water';
}

function isAcidPotion(obj) {
    const kind = objectKindText(obj).replace(/^potion of /, '');
    return obj?.otyp === POT_ACID || obj?.potionIndex === 23 || kind === 'acid';
}

function isBookOfTheDead(obj) {
    const kind = objectKindText(obj);
    return obj?.otyp === BOOK_OF_THE_DEAD || kind === 'book of the dead';
}

function waterDamageLitObject(obj) {
    if (!(obj?.lamplit || obj?.burning)) return false;
    if (obj.otyp === BRASS_LANTERN || objectKindText(obj) === 'brass lantern') {
        if (obj.age != null) obj.age -= obj.age > 200 ? 100 : Math.trunc(obj.age / 2);
        return false;
    }
    obj.lamplit = false;
    obj.burning = false;
    delete obj._burnTimer;
    delete obj.litRadius;
    if (obj.otyp === OIL_LAMP || obj.otyp === MAGIC_LAMP
        || objectKindText(obj) === 'oil lamp' || objectKindText(obj) === 'magic lamp') {
        if (obj.age != null) obj.age -= obj.age > 200 ? 100 : Math.trunc(obj.age / 2);
    }
    return true;
}

function removeMonsterInventoryItem(mon, obj) {
    mon.minvent = (mon.minvent || []).filter(item => item !== obj);
    if (mon.missile === obj) mon.missile = null;
}

function waterDamageMonsterItem(mon, obj) {
    if (!obj) return;
    if (waterDamageLitObject(obj)) return;
    const kind = objectKindText(obj);
    if (kind === 'can of grease' && (obj.spe || 0) > 0) return;
    if (kind === 'towel' && (obj.spe || 0) < 7) {
        const wetness = Math.max(0, obj.spe || 0);
        obj.spe = wetness + rnd(7 - wetness);
        obj.wetness = obj.spe;
        return;
    }
    if (obj.greased) {
        if (!rn2(2)) obj.greased = false;
        if (!obj.greased && itemClass(obj) === 'potion' && isAcidPotion(obj))
            removeMonsterInventoryItem(mon, obj);
        return;
    }
    if ((game.u?.uluck || 0) + (game.u?.moreluck || 0) + 5 > rn2(20)) return;

    const cls = itemClass(obj);
    if (cls === 'scroll') {
        if (obj.otyp === SCR_BLANK_PAPER || kind === 'blank paper') return;
        obj.otyp = SCR_BLANK_PAPER;
        obj.kind = 'blank paper';
        obj.actualKind = '';
        obj.scrollIndex = 21;
        obj.spe = 0;
        obj.known = false;
        return;
    }
    if (cls === 'spellbook') {
        if (isBookOfTheDead(obj) || kind.includes('blank paper')) return;
        if (obj.spestudied) obj.spestudied = rn2(obj.spestudied);
        obj.kind = 'spellbook of blank paper';
        obj.actualKind = '';
        obj.spellName = '';
        obj.spell = null;
        obj.known = false;
        return;
    }
    if (cls === 'potion') {
        if (isAcidPotion(obj)) {
            removeMonsterInventoryItem(mon, obj);
        } else if (obj.odiluted) {
            obj.otyp = POT_WATER;
            obj.kind = 'water';
            obj.actualKind = '';
            obj.blessed = false;
            obj.cursed = false;
            obj.odiluted = false;
            obj.known = false;
        } else if (!isWaterPotion(obj)) {
            obj.odiluted = true;
        }
        return;
    }
    if ((obj.oerodeproof || obj.rustproof) || (obj.oeroded || 0) >= 3) return;
    if (RUSTABLE_RE.test(kind)) obj.oeroded = Math.min(3, (obj.oeroded || 0) + 1);
}

function waterDamageMonsterInventory(mon) {
    for (const obj of [...(mon?.minvent || [])])
        waterDamageMonsterItem(mon, obj);
}

function splitGremlin(mon, messages, visible) {
    if ((mon.mhp || 0) <= 1) return false;
    const spot = enextoMonsterSpot(mon.mx, mon.my, mon.data || {});
    if (!spot) return false;
    const cloneHp = Math.trunc((mon.mhp || 2) / 2);
    const cloneMaxHp = Math.trunc((mon.mhpmax || mon.mhp || 2) / 2);
    mon.mhp -= cloneHp;
    mon.mhpmax = Math.max(1, (mon.mhpmax || mon.mhp) - cloneMaxHp);
    const clone = {
        ...mon,
        mx: spot.x,
        my: spot.y,
        m_id: next_ident(),
        mhp: Math.max(1, cloneHp),
        mhpmax: Math.max(1, cloneMaxHp),
        minvent: [],
        missile: null,
        mundetected: 0,
        mtrapped: 0,
        mleashed: 0,
        mcloned: 1,
    };
    game.level.monsters.push(clone);
    if (visible) messages.push(`${monsterSubject(mon)} multiplies!`);
    newsym(spot.x, spot.y);
    return true;
}

function rustIronGolemInPool(mon, messages, visible, recordKill) {
    if ((mon?.data?.name || '') !== 'iron golem' || rn2(5)) return false;
    const damage = d(2, 6);
    if (visible) messages.push(`${monsterSubject(mon)} rusts.`);
    mon.mhp = (mon.mhp || 1) - damage;
    if ((mon.mhpmax || 0) > damage) mon.mhpmax -= damage;
    if ((mon.mhp || 0) <= 0) {
        removeLiquidKilledMonster(mon, recordKill, false);
        return true;
    }
    waterDamageMonsterInventory(mon);
    newsym(mon.mx, mon.my);
    return true;
}

function maybeTeleportAwayFromWater(mon, messages, visible) {
    if (!monsterCanTeleport(mon) || noteleportLevelForMonster(mon)) return false;
    const oldX = mon.mx;
    const oldY = mon.my;
    if (!rlocNoMsg(mon)) return false;
    if (visible) {
        messages.push(monsterVisibleAt(mon, mon.mx, mon.my)
            ? `${monsterSubject(mon)} vanishes and reappears.`
            : `${monsterSubject(mon)} vanishes!`);
    }
    newsym(oldX, oldY);
    newsym(mon.mx, mon.my);
    return true;
}

function removeLiquidKilledMonster(mon, recordKill = null, awardExperience = false) {
    const data = mon.data || {};
    const corpseData = data.corpse || data;
    const corpseChance = 2 + ((data.genoFreq ?? 1) < 2 ? 1 : 0) + (data.verysmall ? 1 : 0);
    const corpseRoll = rn2(corpseChance);
    dropMonsterInventory(mon);
    if (!corpseRoll && corpseData && !corpseData.noCorpse) {
        const corpse = mkcorpstat(CORPSE, mon, corpseData, mon.mx, mon.my, 8);
        Object.assign(corpse, {
            otyp: 'corpse',
            glyph: '%',
            color: corpseData.color ?? data.color ?? CLR_BROWN,
            corpsenm: corpseData,
            oldCorpse: !!data.corpse,
        });
    }
    recordKill?.(mon, awardExperience);
    const loc = game.level?.at(mon.mx, mon.my);
    if (loc?.map_invisible) {
        loc.map_invisible = false;
        loc.remembered_glyph = null;
    }
    game.level.monsters = (game.level?.monsters || []).filter(other => other !== mon);
    mon.movement = 0;
    mon.dead = true;
    newsym(mon.mx, mon.my);
}

export function applyMeltedIceMonsterLiquidEffects(x, y, {
    heroCaused = false,
    recordKill = null,
} = {}) {
    const loc = game.level?.at(x, y);
    if (!isPostMeltLiquid(loc)) return [];
    const mon = (game.level?.monsters || []).find(candidate =>
        candidate.mx === x && candidate.my === y && (candidate.mhp == null || candidate.mhp > 0));
    if (!mon || monsterCanStayAbovePool(mon)) return [];

    const messages = [];
    const visible = monsterVisibleAt(mon, x, y);
    if ((mon.data?.name || '') === 'gremlin' && rn2(3)) {
        splitGremlin(mon, messages, visible);
        waterDamageMonsterInventory(mon);
        return messages;
    }
    if (rustIronGolemInPool(mon, messages, visible, recordKill)) return messages;
    if (monsterCantDrown(mon)) return [];
    if (maybeTeleportAwayFromWater(mon, messages, visible)) return messages;

    if (visible)
        messages.push(heroCaused ? `You drown the ${simpleMonsterName(mon)}.` : `${monsterSubject(mon)} drowns.`);
    removeLiquidKilledMonster(mon, recordKill, heroCaused);
    return messages;
}
