import { game } from './gstate.js';
import { IS_POOL } from './const.js';
import { d, rn2, rnd, rnl } from './rng.js';
import { createGasCloud } from './region.js';
import { newsym } from './display.js';
import { dropMonsterInventory, mkcorpstat } from './mklev.js';
import { CLR_BROWN } from './terminal.js';

const CORPSE = 471;

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

// C ref: zap.c zap_over_floor() for fire over water.
export function applyFireBreathTerrain(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc || !IS_POOL(loc.typ)) return '';
    createGasCloud(x, y, rnd(5), 0);
    return 'You hear hissing gas.';
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
        const terrainMessage = applyFireBreathTerrain(ray.x, ray.y);
        if (terrainMessage && !ray.heardGas) {
            messages.push(terrainMessage);
            ray.heardGas = true;
        }
        if (floorFire) {
            const floorMessages = floorFire(ray.x, ray.y) || [];
            messages.push(...floorMessages);
        }

        const mon = (game.level?.monsters || []).find(candidate =>
            candidate.m_id !== sourceId && candidate.mx === ray.x && candidate.my === ray.y
            && (candidate.mhp == null || candidate.mhp > 0));
        if (mon) return { messages, target: { type: 'monster', mon }, ray };
        if (ray.x === game.u?.ux && ray.y === game.u?.uy) return { messages, target: { type: 'hero' }, ray };
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
    if (game.u?.fireResistance) messages.push("You don't feel hot!");

    const armor = burnHeroArmorFromFire();
    messages.push(...armor.messages);
    if (armor.bodyHit) {
        if (inventoryFire) {
            const inventory = inventoryFire(origDamage);
            messages.push(...(inventory.messages || []));
            damage += inventory.damage || 0;
            deathCause = inventory.deathCause || '';
        } else {
            rn2(3);
            rn2(3);
        }
    }
    if (damage && game.u) game.u.uhp = Math.max(0, (game.u.uhp || 0) - damage);
    let lethal = false;
    if ((game.u?.uhp || 0) <= 0) {
        lethal = true;
        game._death_cause = deathCause || 'killed by a blast of fire';
    }
    return { damage, messages, lethal, deathCause: game._death_cause || deathCause };
}

export function finishHeroTargetedBreath(mon) {
    if (!mon) return;
    if (!rn2(3)) mon.mspec_used = 8 + rn2(18);
}
