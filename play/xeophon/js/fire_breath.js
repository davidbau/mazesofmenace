import { game } from './gstate.js';
import { DB_MOAT, DB_UNDER, DRAWBRIDGE_UP, FOUNTAIN, IN_SIGHT, Is_waterlevel, IS_POOL, MOAT, PIT, POOL, ROOM, TT_BURIEDBALL, WATER, WEB } from './const.js';
import { d, rn1, rn2, rnd, rnl } from './rng.js';
import { createGasCloud } from './region.js';
import { newsym } from './display.js';
import { createMonsterCorpseOrGlob, dropMonsterInventory, monsterCorpseDropSucceeds, monsterLeavesCorpseLikeDrop } from './mklev.js';
import { dryupFountainResultAt } from './fountain.js';
import { meltIceAt } from './ice.js';
import { applyMeltedIceMonsterLiquidEffects } from './monster_liquid.js';

const WEB_BURST_MESSAGE = 'A web bursts into flames!';
const WATER_GAS_MESSAGE = 'You hear hissing gas.';
const WATER_EVAPORATES_MESSAGE = 'Some water evaporates.';
const POOL_EVAPORATES_MESSAGE = 'The water evaporates.';
const WATER_BOILS_MESSAGE = 'Some water boils.';
const FOUNTAIN_STEAM_MESSAGE = 'Steam billows from the fountain.';
const FOUNTAIN_DRYUP_MESSAGE = 'The fountain dries up!';
const FOUNTAIN_WATCHMAN_MESSAGE = '"Hey, stop using that fountain!"';
const UNEVENTFUL_MESSAGE = 'That seemed remarkably uneventful.';

const FIRE_ARMOR_SLOT = {
    HELMET: 0,
    BODY: 1,
    SHIELD: 2,
    GLOVES: 3,
    BOOTS: 4,
};

const FIRE_FLAMMABLE_ARMOR_KINDS = new Set([
    'elven leather helm', 'fedora', 'cornuthaum', 'dunce cap',
    'studded leather armor', 'leather armor', 'leather jacket',
    'hawaiian shirt', 't-shirt',
    'mummy wrapping', 'elven cloak', 'orcish cloak', 'dwarvish cloak', 'oilskin cloak',
    'robe', 'alchemy smock', 'leather cloak', 'cloak of protection',
    'cloak of invisibility', 'cloak of magic resistance', 'cloak of displacement',
    'small shield', 'shield of drain resistance', 'shield of shock resistance', 'elven shield',
    'leather gloves', 'gauntlets of fumbling', 'gauntlets of dexterity',
    'low boots', 'high boots', 'speed boots', 'water walking boots', 'jumping boots',
    'elven boots', 'fumble boots', 'levitation boots',
]);

const FIRE_NONFLAMMABLE_ARMOR_KINDS = new Set([
    'orcish helm', 'dwarvish iron helm', 'dented pot', 'helm of brilliance',
    'helmet', 'helm of caution', 'helm of opposite alignment', 'helm of telepathy',
    'plate mail', 'crystal plate mail', 'bronze plate mail', 'splint mail',
    'banded mail', 'dwarvish mithril-coat', 'elven mithril-coat', 'chain mail',
    'orcish chain mail', 'scale mail', 'ring mail', 'orcish ring mail',
    'uruk-hai shield', 'orcish shield', 'large shield', 'dwarvish roundshield',
    'shield of reflection', 'gauntlets of power', 'iron shoes', 'kicking boots',
]);

const FIRE_ARMOR_AC_BONUS = new Map([
    ['mummy wrapping', 1], ['elven cloak', 1], ['orcish cloak', 1], ['dwarvish cloak', 1],
    ['oilskin cloak', 1], ['robe', 2], ['alchemy smock', 1], ['leather cloak', 1],
    ['cloak of protection', 3], ['cloak of magic resistance', 1],
    ['cloak of displacement', 1], ['cloak of invisibility', 1],
    ['leather jacket', 1], ['leather armor', 2],
    ['studded leather armor', 3], ['helmet', 1], ['elven leather helm', 1],
    ['small shield', 1], ['shield of drain resistance', 1], ['shield of shock resistance', 1],
    ['elven shield', 2], ['leather gloves', 1],
    ['gauntlets of fumbling', 1], ['gauntlets of dexterity', 1], ['low boots', 1],
    ['high boots', 1], ['speed boots', 1], ['water walking boots', 1], ['jumping boots', 1],
    ['elven boots', 1], ['fumble boots', 1], ['levitation boots', 1],
]);

function itemText(item) {
    return String(item?.actualKind || item?.kind || item?.line || '').toLowerCase();
}

function armorNameIsPlural(name) {
    return /\b(?:boots|shoes|gloves|gauntlets|scales)\b/i.test(name) && !/\bmail\b/i.test(name);
}

function fireArmorVerb(name, singular, plural) {
    return armorNameIsPlural(name) ? plural : singular;
}

function wornFireArmorSlot(item) {
    const text = itemText(item);
    if (/helm|helmet|hat|fedora|cornuthaum|cap|pot/.test(text)) return FIRE_ARMOR_SLOT.HELMET;
    if (/shield/.test(text)) return FIRE_ARMOR_SLOT.SHIELD;
    if (/gloves|gauntlets/.test(text)) return FIRE_ARMOR_SLOT.GLOVES;
    if (/boots|shoes/.test(text)) return FIRE_ARMOR_SLOT.BOOTS;
    return FIRE_ARMOR_SLOT.BODY;
}

function armorLabel(item, slot) {
    const text = itemText(item);
    if (slot === FIRE_ARMOR_SLOT.HELMET) {
        if (text.includes('leather')) return 'leather helmet';
        if (/hat|fedora|cornuthaum|cap/.test(text)) return 'hat';
        return 'helmet';
    }
    if (slot === FIRE_ARMOR_SLOT.SHIELD) return 'shield';
    if (slot === FIRE_ARMOR_SLOT.GLOVES) return 'gloves';
    if (slot === FIRE_ARMOR_SLOT.BOOTS) return 'boots';
    if (/cloak/.test(text)) return 'cloak';
    if (/shirt/.test(text)) return 'shirt';
    if (/robe/.test(text)) return 'robe';
    return String(item?.actualKind || item?.kind || '').toLowerCase() || 'armor';
}

function fireCanErode(item, slot) {
    const text = itemText(item);
    if (!item) return false;
    if (FIRE_FLAMMABLE_ARMOR_KINDS.has(text)) return true;
    if (FIRE_NONFLAMMABLE_ARMOR_KINDS.has(text)) return false;
    if (/leather|cloth|robe|shirt|cloak|gloves|gauntlets|boots|wood|wooden|wrapping|smock|apron/.test(text))
        return true;
    return slot === FIRE_ARMOR_SLOT.GLOVES && /gloves|gauntlets/.test(text);
}

function fireArmorAcValue(item) {
    const base = FIRE_ARMOR_AC_BONUS.get(itemText(item)) ?? 0;
    return base + (item.spe ?? 0) - Math.min(Math.max(item.oeroded || 0, item.oeroded2 || 0), base);
}

function erodeHeroArmorByFire(item, slot) {
    const label = armorLabel(item, slot);
    if (!fireCanErode(item, slot)) return { damaged: false, message: '' };
    if (item.oerodeproof) {
        const message = !item.rknown
            ? `Somehow, your ${label} ${fireArmorVerb(label, 'is', 'are')} not affected by the heat.`
            : '';
        item.rknown = true;
        return { damaged: false, message };
    }
    if (item.blessed && !rnl(4)) return { damaged: false, message: '' };

    const current = Math.min(3, item.oeroded || 0);
    if (current >= 3) return { damaged: false, message: '' };
    const oldAc = fireArmorAcValue(item);
    item.oeroded = current + 1;
    const acDelta = oldAc - fireArmorAcValue(item);
    if (game.u && item.worn && acDelta > 0) {
        game._status_uac_before_more = game.u.uac ?? 10;
        game._status_uac_before_more_seen = 0;
        game._status_uac_before_more_hold_count = 2;
        game.u.uac = (game.u.uac ?? 10) + acDelta;
    }
    const adverb = item.oeroded === 3 ? ' completely' : current ? ' further' : '';
    return { damaged: true, message: `Your ${label} ${fireArmorVerb(label, 'smoulders', 'smoulder')}${adverb}!` };
}

function towelWetness(item) {
    return Math.max(0, item?.spe || item?.wetness || 0);
}

function dryWetTowelFromFire(items, messages = null) {
    for (const item of items || []) {
        if (itemText(item) !== 'towel') continue;
        const oldWetness = towelWetness(item);
        if (oldWetness <= 0) continue;
        const newWetness = rn2(oldWetness + 1);
        if (item.spe != null || !('wetness' in item)) item.spe = newWetness;
        if (item.wetness != null) item.wetness = newWetness;
        if (newWetness >= oldWetness) continue;
        if (messages) messages.push(`Your towel dries${newWetness ? '' : ' out'}.`);
        return true;
    }
    return false;
}

function burnHeroArmorFromFire() {
    const messages = [];
    dryWetTowelFromFire(game.inventory || [], messages);
    const wornArmor = (game.inventory || []).filter(item =>
        item.cls === 'armor' && (item.worn || item.line?.includes('being worn')));
    for (;;) {
        const slot = rn2(5);
        let item = wornArmor.find(armor => wornFireArmorSlot(armor) === slot);
        if (slot === FIRE_ARMOR_SLOT.BODY) {
            item = wornArmor.find(armor => /cloak|robe|wrapping|smock|apron/i.test(itemText(armor)))
                || wornArmor.find(armor => wornFireArmorSlot(armor) === slot);
            if (item) {
                const result = erodeHeroArmorByFire(item, slot);
                if (result.message) messages.push(result.message);
            }
            return { bodyHit: true, messages };
        }
        if (!item) continue;
        const result = erodeHeroArmorByFire(item, slot);
        if (result.message) messages.push(result.message);
        if (result.damaged) return { bodyHit: false, messages };
    }
}

function erodeMonsterArmorByFire(item, slot) {
    if (!fireCanErode(item, slot)) return false;
    if (item.oerodeproof) {
        item.rknown = true;
        return false;
    }
    if (item.blessed && !rnl(4)) return false;
    const current = Math.min(3, item.oeroded || 0);
    if (current >= 3) return false;
    item.oeroded = current + 1;
    return true;
}

function burnMonsterArmorFromFire(mon) {
    dryWetTowelFromFire(mon.minvent || []);
    const wornArmor = (mon.minvent || []).filter(item => item.worn || item.owornmask);
    for (;;) {
        const slot = rn2(5);
        let item = wornArmor.find(armor => wornFireArmorSlot(armor) === slot);
        if (slot === FIRE_ARMOR_SLOT.BODY) {
            item = wornArmor.find(armor => /cloak|robe|wrapping|smock|apron/i.test(itemText(armor)))
                || item;
            if (item) erodeMonsterArmorByFire(item, slot);
            return true;
        }
        if (!item || !erodeMonsterArmorByFire(item, slot)) continue;
        return false;
    }
}

// C ref: zap.c zap_over_floor() fire case for webs.
export function burnFireRayWebTrap(x, y, { previousMessage = '' } = {}) {
    const trap = (game.level?.traps || []).find(item =>
        item.tx === x && item.ty === y && item.ttyp === WEB);
    if (!trap) return [];
    const visible = !game.u?.blind && !!(game.viz_array?.[y]?.[x] & IN_SIGHT);
    if (game.u?.ux === x && game.u?.uy === y
        && game.u.utraptype !== TT_BURIEDBALL && game.u.utraptype !== 'buriedball') {
        game.u.utrap = 0;
        game.u.utraptype = null;
    } else {
        const mon = (game.level?.monsters || []).find(candidate =>
            candidate.mx === x && candidate.my === y);
        if (mon) mon.mtrapped = 0;
    }
    game.level.traps = (game.level?.traps || []).filter(item => item !== trap);
    if (visible) {
        newsym(x, y);
        if (previousMessage === WEB_BURST_MESSAGE
            || (!previousMessage && game._last_pline_message === WEB_BURST_MESSAGE))
            return [];
        return [WEB_BURST_MESSAGE];
    }
    return [];
}

function norep(message, previousMessage = '') {
    return previousMessage === message || (!previousMessage && game._last_pline_message === message);
}

function heroIsDeaf() {
    return (game.u?._deafTimeout || 0) > 0 || (game.u?._statusSuffix || '').includes('Deaf');
}

function fireRayWaterTerrainKind(loc) {
    if (!loc) return null;
    if (loc.typ === POOL || loc.typ === MOAT || loc.typ === WATER) return loc.typ;
    if (loc.typ === DRAWBRIDGE_UP && ((loc.flags || 0) & DB_UNDER) === DB_MOAT)
        return DRAWBRIDGE_UP;
    return null;
}

function makeFireRayPitTrap(x, y) {
    const existing = (game.level?.traps || []).find(trap => trap.tx === x && trap.ty === y);
    const trap = existing || { tx: x, ty: y };
    Object.assign(trap, {
        ttyp: PIT,
        tseen: false,
        once: false,
        launch: { x: -1, y: -1 },
        launch2: null,
        teledest: null,
        dst: { dnum: -1, dlevel: -1 },
        conjoined: 0,
    });
    if (!existing) {
        game.level.traps ??= [];
        game.level.traps.push(trap);
    }
    return trap;
}

function monsterVisibleAt(mon, x, y) {
    return !game.u?.blind && !!(game.viz_array?.[y]?.[x] & IN_SIGHT)
        && !mon.minvis && !mon.mundetected;
}

function killMonsterByPit(mon, messages, visible) {
    if (visible) messages.push(`The ${mon.data?.name || 'creature'} is killed!`);
    const data = mon.data || {};
    const corpseData = data.corpse || data;
    const dropCorpse = monsterCorpseDropSucceeds(mon, data);
    dropMonsterInventory(mon);
    if (dropCorpse && monsterLeavesCorpseLikeDrop(corpseData))
        createMonsterCorpseOrGlob(mon, corpseData, mon.mx, mon.my, { messages });
    game.level.monsters = (game.level?.monsters || []).filter(other => other !== mon);
    newsym(mon.mx, mon.my);
}

function applyFireRayPitEffects(x, y, trap) {
    const messages = [];
    if (game.u?.ux === x && game.u?.uy === y) {
        if (game.u.levitating || game.u.flying) return messages;
        trap.tseen = true;
        game.u.utrap = rn1(6, 2);
        game.u.utraptype = 'pit';
        game.u.uhp = Math.max(0, (game.u.uhp || 1) - rnd(6));
        if ((game.u.uhp || 0) <= 0) game._death_cause = 'fell into a pit';
        newsym(x, y);
        messages.push('You fall into a pit!');
        return messages;
    }

    const mon = (game.level?.monsters || []).find(candidate =>
        candidate.mx === x && candidate.my === y && (candidate.mhp == null || candidate.mhp > 0));
    if (!mon || mon.data?.inAir || mon.data?.flyer || mon.data?.floater) return messages;
    const visible = monsterVisibleAt(mon, x, y);
    if (visible) {
        trap.tseen = true;
        messages.push(`The ${mon.data?.name || 'creature'} falls into a pit!`);
    }
    mon.mtrapped = 1;
    mon.mhp = (mon.mhp || 1) - rnd(6);
    if ((mon.mhp || 0) <= 0) killMonsterByPit(mon, messages, visible);
    else newsym(x, y);
    return messages;
}

// C ref: zap.c zap_over_floor() fire case for ice.
export function applyFireRayIceTerrain(x, y, { heroRay = false, recordKill = null, buriedMerchandiseDebtMessage = null } = {}) {
    const result = meltIceAt(x, y, {
        buriedMerchandiseDebtMessage: heroRay ? buriedMerchandiseDebtMessage : null,
    });
    if (!result.melted) return { messages: [], handled: false, rangeMod: 0 };
    const messages = [...result.messages];
    if (result.becameLiquid)
        messages.push(...applyMeltedIceMonsterLiquidEffects(x, y, {
            heroCaused: heroRay,
            recordKill,
        }));
    return { messages, handled: true, rangeMod: 0 };
}

// C ref: zap.c zap_over_floor() for fire over water.
export function applyFireRayWaterTerrain(x, y, {
    previousMessage = '',
    heardGas = false,
    heroRay = false,
} = {}) {
    const loc = game.level?.at(x, y);
    const terrain = fireRayWaterTerrainKind(loc);
    if (terrain == null) return { messages: [], heardGas, rangeMod: 0 };

    const onWaterLevel = Is_waterlevel(game.u?.uz);
    const visible = !game.u?.blind && !!(game.viz_array?.[y]?.[x] & IN_SIGHT);
    const deaf = heroIsDeaf();
    if (!onWaterLevel) createGasCloud(x, y, rnd(5), 0);

    let message = !deaf ? WATER_GAS_MESSAGE : heroRay ? UNEVENTFUL_MESSAGE : '';
    let gasHeard = heardGas;
    let rangeMod = 0;
    let followupMessages = [];
    if (terrain !== POOL) {
        if (onWaterLevel) message = (visible || !deaf) ? WATER_BOILS_MESSAGE : '';
        else if (visible) message = WATER_EVAPORATES_MESSAGE;
        else if (message === WATER_GAS_MESSAGE && heardGas) message = '';
    } else {
        rangeMod = -3;
        loc.typ = ROOM;
        loc.flags = 0;
        loc.doormask = 0;
        loc.wall_info = 0;
        const trap = makeFireRayPitTrap(x, y);
        if (visible) message = POOL_EVAPORATES_MESSAGE;
        else if (message === WATER_GAS_MESSAGE && heardGas) message = '';
        const mon = (game.level?.monsters || []).find(candidate => candidate.mx === x && candidate.my === y);
        if (mon?.data?.swimmer && mon.mundetected) mon.mundetected = 0;
        newsym(x, y);
        followupMessages = applyFireRayPitEffects(x, y, trap);
    }
    if (message === WATER_GAS_MESSAGE)
        gasHeard = true;
    const messages = !message || norep(message, previousMessage) ? [] : [message];
    messages.push(...followupMessages);
    return { messages, heardGas: gasHeard, rangeMod };
}

// C ref: zap.c zap_over_floor() for fire over fountains.
export function applyFireRayFountainTerrain(x, y, { heroRay = false } = {}) {
    const loc = game.level?.at(x, y);
    if (loc?.typ !== FOUNTAIN) return { messages: [], rangeMod: 0 };

    const visible = !game.u?.blind && !!(game.viz_array?.[y]?.[x] & IN_SIGHT);
    createGasCloud(x, y, rnd(3), 0);
    const messages = visible ? [FOUNTAIN_STEAM_MESSAGE] : [];
    const dryup = dryupFountainResultAt(x, y, { isYou: heroRay });
    if (dryup.dried) {
        if (visible) messages.push(FOUNTAIN_DRYUP_MESSAGE);
    } else if (dryup.warning) {
        messages.push(dryup.warning, FOUNTAIN_WATCHMAN_MESSAGE);
    } else if (dryup.trickle) {
        messages.push(dryup.trickle);
    }
    return { messages, rangeMod: -1 };
}

// C ref: zap.c zap_hit().
export function fireBreathZapHits(ac) {
    const chance = rn2(20);
    if (!chance) return rnd(10) < ac;
    if (ac < 0) ac = -rnd(-ac);
    return 3 - chance < ac;
}

export function advanceFireBreathRay(ray, sourceId, { floorFire = null } = {}) {
    const messages = [];
    while (ray.remaining > 0) {
        ray.remaining--;
        ray.x += ray.dx;
        ray.y += ray.dy;
        messages.push(...burnFireRayWebTrap(ray.x, ray.y, {
            previousMessage: messages[messages.length - 1] || '',
        }));
        const ice = applyFireRayIceTerrain(ray.x, ray.y);
        messages.push(...ice.messages);
        if (!ice.handled) {
            const terrain = applyFireRayWaterTerrain(ray.x, ray.y, {
                previousMessage: messages[messages.length - 1] || '',
                heardGas: ray.heardGas,
            });
            messages.push(...terrain.messages);
            ray.heardGas = terrain.heardGas;
            ray.remaining += terrain.rangeMod;
            const fountain = applyFireRayFountainTerrain(ray.x, ray.y);
            messages.push(...fountain.messages);
            ray.remaining += fountain.rangeMod;
        }
        if (floorFire) {
            const floorMessages = floorFire(ray.x, ray.y) || [];
            messages.push(...floorMessages);
        }

        const mon = (game.level?.monsters || []).find(candidate =>
            candidate.m_id !== sourceId && candidate.mx === ray.x && candidate.my === ray.y
            && (candidate.mhp == null || candidate.mhp > 0));
        if (mon) return { messages, target: { type: 'monster', mon }, ray };
        if (ray.x === game.u?.ux && ray.y === game.u?.uy && ray.remaining >= 0)
            return { messages, target: { type: 'hero' }, ray };
    }
    return { messages, target: null, ray };
}

// C ref: zap.c zhitm() fire case.
export function fireBreathDamageMonster(mon, nd = 6, inventoryFire = null, {
    applyDamage = true,
    adjustDamage = null,
} = {}) {
    if (mon.data?.resistsFire || mon.fireResistance)
        return { damage: 0, killed: false, killedHidden: false, messages: [], resistedFire: true };
    const origDamage = d(nd, 6);
    let damage = origDamage;
    const messages = [];
    if (mon.data?.resistsCold || mon.data?.coldResistance || mon.coldResistance) damage += 7;
    const bodyHit = burnMonsterArmorFromFire(mon);
    if (bodyHit && !rn2(3)) {
        if (inventoryFire) {
            const inventory = inventoryFire(origDamage) || {};
            messages.push(...(inventory.messages || []));
            damage += inventory.damage || 0;
        }
    }
    if (adjustDamage && damage > 0) damage = adjustDamage(damage, { origDamage, mon });
    if (!applyDamage) return { damage, killed: false, killedHidden: false, messages, resistedFire: false };

    mon.mhp = (mon.mhp ?? 1) - damage;
    let killedHidden = false;
    let killed = false;
    if (mon.mhp <= 0) {
        killed = true;
        const loc = game.level?.at(mon.mx, mon.my);
        if (loc?.map_invisible) {
            killedHidden = true;
            loc.map_invisible = false;
            loc.remembered_glyph = null;
            for (const obj of game.level?.objects || [])
                if (obj.ox === mon.mx && obj.oy === mon.my) obj.seen = false;
            newsym(mon.mx, mon.my);
        }
        const data = mon.data || {};
        const corpseData = data.corpse || data;
        const dropCorpse = monsterCorpseDropSucceeds(mon, data);
        dropMonsterInventory(mon);
        if (dropCorpse && monsterLeavesCorpseLikeDrop(corpseData))
            createMonsterCorpseOrGlob(mon, corpseData, mon.mx, mon.my, { messages });
        game.level.monsters = (game.level?.monsters || []).filter(other => other !== mon);
        newsym(mon.mx, mon.my);
    }
    return { damage, killed, killedHidden, messages, resistedFire: false };
}

// C ref: zap.c zhitu() fire case.
export function fireBreathDamageHero(nd = 6, inventoryFire = null) {
    const origDamage = d(nd, 6);
    const messages = [];
    let damage = game.u?.fireResistance ? 0 : origDamage;
    let deathCause = '';
    let lifeSaving = false;
    let fatal = false;
    if (game.u?.fireResistance) messages.push("You don't feel hot!");

    const armor = burnHeroArmorFromFire();
    messages.push(...armor.messages);
    if (armor.bodyHit) {
        if (inventoryFire) {
            const inventory = inventoryFire(origDamage);
            messages.push(...(inventory.messages || []));
            lifeSaving = !!inventory.lifeSaving;
            fatal = !!inventory.fatal;
            if (lifeSaving || fatal) {
                damage = 0;
            } else {
                damage += inventory.damage || 0;
                deathCause = inventory.deathCause || '';
            }
        } else {
            rn2(3);
            rn2(3);
        }
    }
    if (!lifeSaving && !fatal && damage && game.u)
        game.u.uhp = Math.max(0, (game.u.uhp || 0) - damage);
    let lethal = false;
    if (!lifeSaving && !fatal && (game.u?.uhp || 0) <= 0) {
        lethal = true;
        game._death_cause = deathCause || 'killed by a blast of fire';
    }
    return { damage, messages, lethal, lifeSaving, fatal, deathCause: game._death_cause || deathCause };
}

export function finishHeroTargetedBreath(mon) {
    if (!mon) return;
    if (!rn2(3)) mon.mspec_used = 8 + rn2(18);
}
