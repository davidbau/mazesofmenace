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

function itemText(item) {
    return String(item?.actualKind || item?.kind || item?.line || '').toLowerCase();
}

function wornFireArmorSlot(item) {
    const text = itemText(item);
    if (/helm|helmet|hat/.test(text)) return FIRE_ARMOR_SLOT.HELMET;
    if (/shield/.test(text)) return FIRE_ARMOR_SLOT.SHIELD;
    if (/gloves|gauntlets/.test(text)) return FIRE_ARMOR_SLOT.GLOVES;
    if (/boots|shoes/.test(text)) return FIRE_ARMOR_SLOT.BOOTS;
    return FIRE_ARMOR_SLOT.BODY;
}

function armorLabel(item, slot) {
    const text = itemText(item);
    if (slot === FIRE_ARMOR_SLOT.HELMET) return text.includes('leather') ? 'leather helmet' : 'helmet';
    if (slot === FIRE_ARMOR_SLOT.SHIELD) return text.includes('wood') || text.includes('elven') ? 'wooden shield' : 'shield';
    if (slot === FIRE_ARMOR_SLOT.GLOVES) return 'gloves';
    if (slot === FIRE_ARMOR_SLOT.BOOTS) return 'boots';
    if (/cloak/.test(text)) return 'cloak';
    if (/shirt/.test(text)) return 'shirt';
    if (/robe/.test(text)) return 'robe';
    return 'armor';
}

function fireCanErode(item, slot) {
    const text = itemText(item);
    if (!item) return false;
    if (/leather|cloth|robe|shirt|cloak|gloves|gauntlets|boots|wood|wooden|elven|wrapping|smock|apron/.test(text))
        return true;
    return slot === FIRE_ARMOR_SLOT.GLOVES && /gloves|gauntlets/.test(text);
}

function erodeHeroArmorByFire(item, slot) {
    const label = armorLabel(item, slot);
    if (!fireCanErode(item, slot)) return { damaged: false, message: '' };
    if (item.oerodeproof || (item.blessed && !rnl(4, false))) {
        item.rknown = !!item.oerodeproof;
        const verb = /gloves|boots/.test(label) ? 'are' : 'is';
        return { damaged: false, message: `Somehow, your ${label} ${verb} not affected by the fire.` };
    }

    item.oeroded2 = (item.oeroded2 || 0) + 1;
    item.bknown = true;
    if (game.u && item.worn && item.oeroded2 === 1) {
        game._status_uac_before_more = game.u.uac ?? 10;
        game._status_uac_before_more_seen = 0;
        game._status_uac_before_more_hold_count = 2;
        game.u.uac = (game.u.uac ?? 10) + 1;
    }
    const verb = /gloves|boots/.test(label) ? 'smoulder' : 'smoulders';
    const adverb = item.oeroded2 > 1 ? ' further' : '';
    return { damaged: true, message: `Your ${label} ${verb}${adverb}!` };
}

function burnHeroArmorFromFire() {
    const wornArmor = (game.inventory || []).filter(item =>
        item.cls === 'armor' && (item.worn || item.line?.includes('being worn')));
    for (;;) {
        const slot = rn2(5);
        let item = wornArmor.find(armor => wornFireArmorSlot(armor) === slot);
        if (slot === FIRE_ARMOR_SLOT.BODY) {
            item = wornArmor.find(armor => /cloak|robe|wrapping|smock|apron/i.test(itemText(armor)))
                || wornArmor.find(armor => wornFireArmorSlot(armor) === slot);
            if (item) return { bodyHit: true, messages: [erodeHeroArmorByFire(item, slot).message].filter(Boolean) };
            return { bodyHit: true, messages: [] };
        }
        if (!item) continue;
        const result = erodeHeroArmorByFire(item, slot);
        if (result.damaged) return { bodyHit: false, messages: [result.message] };
    }
}

function burnMonsterArmorFromFire(mon) {
    const wornArmor = (mon.minvent || []).filter(item => item.worn || item.owornmask);
    for (;;) {
        const slot = rn2(5);
        const item = wornArmor.find(armor => wornFireArmorSlot(armor) === slot);
        if (slot === FIRE_ARMOR_SLOT.BODY) return true;
        if (!item || !fireCanErode(item, slot)) continue;
        item.oeroded2 = (item.oeroded2 || 0) + 1;
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

export function advanceFireBreathRay(ray, sourceId) {
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

        const mon = (game.level?.monsters || []).find(candidate =>
            candidate.m_id !== sourceId && candidate.mx === ray.x && candidate.my === ray.y
            && (candidate.mhp == null || candidate.mhp > 0));
        if (mon) return { messages, target: { type: 'monster', mon }, ray };
        if (ray.x === game.u?.ux && ray.y === game.u?.uy) return { messages, target: { type: 'hero' }, ray };
    }
    return { messages, target: null, ray };
}

// C ref: zap.c zhitm() fire case.
export function fireBreathDamageMonster(mon, nd = 6) {
    if (mon.data?.resistsFire) return { damage: 0, killedHidden: false };
    const damage = d(nd, 6);
    const bodyHit = burnMonsterArmorFromFire(mon);
    if (bodyHit) rn2(3);
    mon.mhp = (mon.mhp ?? 1) - damage;
    let killedHidden = false;
    if (mon.mhp <= 0) {
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
    return { damage, killedHidden };
}

// C ref: zap.c zhitu() fire case.
export function fireBreathDamageHero(nd = 6) {
    const origDamage = d(nd, 6);
    const messages = [];
    if (game.u?.fireResistance) messages.push("You don't feel hot!");
    else if (game.u) game.u.uhp = Math.max(0, (game.u.uhp || 0) - origDamage);

    const armor = burnHeroArmorFromFire();
    messages.push(...armor.messages);
    if (armor.bodyHit) {
        rn2(3);
        rn2(3);
    }
    return { damage: game.u?.fireResistance ? 0 : origDamage, messages };
}

export function finishHeroTargetedBreath(mon) {
    if (!mon) return;
    if (!rn2(3)) mon.mspec_used = 8 + rn2(18);
}
