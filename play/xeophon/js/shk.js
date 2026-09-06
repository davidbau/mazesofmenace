// shk.c: record_price_quote and append_price_quote. Quotes belong to the
// object type, so another stack and a restored game see the same range.
import { game } from './gstate.js';
import { objectTypeData } from './object_knowledge.js';
import { G_UNIQ } from './permonst.js';
import { intrinsicPossible, corpseMonsterType } from './eat.js';
import { FIRE_RES, COLD_RES, SLEEP_RES, DISINT_RES, SHOCK_RES, POISON_RES, ACID_RES,
    STONE_RES, TELEPORT, TELEPORT_CONTROL, TELEPAT, HUNGRY } from './const.js';

// shk.c:getprice starts with the intrinsic object/artifact cost. Market
// markups and rounding are applied by get_cost/set_cost after these changes.
export function shopObjectPrice(item, buying, baseCost) {
    const type = objectTypeData(item);
    let price = baseCost;
    if (buying && (item.artifact || item.oartifact)) price = Math.trunc(price / 4);
    switch (type?.class || ({ food: 7, wand: 11, potion: 8, armor: 3, weapon: 2, tool: 6 })[item.cls]) {
    case 7: {
        const monster = corpseMonsterType(item);
        if (['TIN', 'EGG', 'CORPSE'].includes(type?.symbol) && monster) {
            let multiplier = 1;
            for (const [property, cost] of [[FIRE_RES, 2], [SLEEP_RES, 3], [COLD_RES, 2],
                [DISINT_RES, 5], [SHOCK_RES, 4], [POISON_RES, 2], [ACID_RES, 1],
                [STONE_RES, 3], [TELEPORT, 2], [TELEPORT_CONTROL, 3], [TELEPAT, 5]])
                if (intrinsicPossible(property, monster)) multiplier += cost;
            if (monster.geno & G_UNIQ) multiplier += 50;
            let value = Math.max(1, (monster.lvl - 1) * 2);
            if (type.symbol === 'CORPSE') value += Math.max(1, Math.trunc(monster.nutrition / 30));
            price += value * multiplier;
        }
        if (!buying && game.u?.uhs >= HUNGRY) price *= game.u.uhs;
        if (item.oeaten) price = 0;
        break;
    }
    case 11: if (item.spe === -1) price = 0; break;
    case 8: if (type?.symbol === 'POT_WATER' && !item.blessed && !item.cursed) price = 0; break;
    case 2: case 3: if (item.spe > 0) price += 10 * item.spe; break;
    case 6:
        if (['TALLOW_CANDLE', 'WAX_CANDLE'].includes(type?.symbol) && item.age < 20 * type.cost)
            price = Math.trunc(price / 2);
        break;
    }
    return price;
}

export function recordPriceQuote(typeId, price, buying) {
    if (typeId == null) return;
    const quotes = game._object_price_quotes ??= {};
    const type = quotes[typeId] ??= {};
    const direction = buying ? 'buy' : 'sell';
    const seen = type[direction] ??= { min: price, max: price };
    seen.min = Math.min(seen.min, price);
    seen.max = Math.max(seen.max, price);
}

export function appendPriceQuote(name, typeId) {
    const quotes = game._object_price_quotes?.[typeId];
    if (!quotes) return name;
    const prices = [];
    for (const direction of ['buy', 'sell']) {
        const seen = quotes[direction];
        if (seen) prices.push(direction + ' ' + seen.min + (seen.min < seen.max ? '-' + seen.max : ''));
    }
    const suffix = ' {' + prices.join(' ') + '}';
    // C deliberately leaves another byte beyond the terminating NUL.
    return suffix.length < 256 - name.length - 1 ? name + suffix : name;
}
