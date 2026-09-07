// eat.c: tin contents, variety selection and the details used by xname.
import { rn2 } from './rng.js';
import { game } from './gstate.js';
import { objectTypeData, objectMaterial, objectDamageTraits } from './object_knowledge.js';
import { MONS, is_rider, vegetarian, can_teleport, control_teleport, telepathic,
    vegan, metallivorous, PM_FIRE_ELEMENTAL, PM_RUST_MONSTER, PM_GHOUL, PM_GELATINOUS_CUBE, PM_HUMAN,
    MR_FIRE, MR_COLD, MR_SLEEP, MR_DISINT, MR_ELEC, MR_POISON, MR_ACID, MR_STONE } from './permonst.js';
import { FIRE_RES, COLD_RES, SLEEP_RES, DISINT_RES, SHOCK_RES, POISON_RES, ACID_RES,
    STONE_RES, TELEPORT, TELEPORT_CONTROL, TELEPAT } from './const.js';

// eat.c:is_edible is the hero's selection gate, distinct from monster dogfood.
export function isEdible(item, species = null) {
    const type = objectTypeData(item);
    if (type?.unique || item.unique || item.oc_unique || item.realAmuletOfYendor || item.invocationItem) return false;
    const form = game.u?._polyself_form;
    species ??= MONS[form?.pm] || MONS.find(mon => mon.name === form?.name)
        || MONS[game.u?.umonnum] || MONS[PM_HUMAN];
    const material = objectMaterial(item, type);
    if (species.pm === PM_FIRE_ELEMENTAL && type && objectDamageTraits(item, type).burnt) return true;
    if (metallivorous(species) && material >= 11 && material <= 17
        && (species.pm !== PM_RUST_MONSTER || material === 11)) return true;
    const symbol = type?.symbol;
    if (species.pm === PM_GHOUL) {
        const corpse = corpseMonsterType(item);
        return symbol === 'EGG' || symbol === 'CORPSE' && !!corpse && !vegan(corpse);
    }
    if (species.pm === PM_GELATINOUS_CUBE && material <= 8 && !(item.contents?.length || item.cobj)) return true;
    return type ? type.class === 7 : item.cls === 'food' || item.otyp === 'corpse';
}

// eat.c:intrinsic_possible tests what eating can convey, which is distinct
// from the monster's own resistances. Telepathy is a species predicate.
export function intrinsicPossible(property, monster) {
    const resistance = ({ [FIRE_RES]: MR_FIRE, [COLD_RES]: MR_COLD,
        [SLEEP_RES]: MR_SLEEP, [DISINT_RES]: MR_DISINT, [SHOCK_RES]: MR_ELEC,
        [POISON_RES]: MR_POISON, [ACID_RES]: MR_ACID, [STONE_RES]: MR_STONE })[property];
    if (resistance) return !!(monster.cres & resistance);
    switch (property) {
    case TELEPORT: return can_teleport(monster);
    case TELEPORT_CONTROL: return control_teleport(monster);
    case TELEPAT: return telepathic(monster);
    default: return false;
    }
}

export const TIN_VARIETY_TEXTS = [
    'rotten', 'homemade', 'soup made from', 'french fried', 'pickled',
    'boiled', 'smoked', 'dried', 'deep fried', 'szechuan', 'broiled',
    'stir fried', 'sauteed', 'candied', 'pureed',
];

// Legacy records distinguish human and animal werecreatures by glyph even
// though their names match. Preserve that distinction when resolving mons[].
export function corpseMonsterType(item) {
    const data = item.corpsenm;
    if (typeof data === 'number') return MONS[data];
    if (data?.pm != null) return MONS[data.pm];
    const glyph = data?.wereHuman ? '@' : data?.glyph || (typeof data?.mlet === 'string' ? data.mlet : null);
    return MONS.find(mon => mon.name.toLowerCase() === data?.name?.toLowerCase() && (!glyph || mon.sym === glyph));
}

// eat.c:set_tin_variety stores preparation in spe; cknown controls whether
// the player can see it. Health food shops retain vegetarian contents.
export function setTinVariety(item, force = -2) {
    const monster = corpseMonsterType(item);
    if (force === -1 || force === -3 && (!monster || !vegetarian(monster))) {
        item.corpsenm = -1;
        item.spe = 1;
        return;
    }
    let variety;
    if (force === -3) {
        variety = tinVariety(item, false);
        if (variety < 0 || variety >= 16) variety = 0;
        while (variety === 0 && !item.cursed || ![1, 2, 4, 5, 6, 7, 9, 13, 14].includes(variety))
            variety = rn2(TIN_VARIETY_TEXTS.length);
    } else if (force >= 0 && force < TIN_VARIETY_TEXTS.length) variety = force;
    else {
        variety = rn2(TIN_VARIETY_TEXTS.length);
        if (variety === 0 && monster && (['lizard', 'lichen', 'acid blob'].includes(monster.name) || is_rider(monster))) variety = 1;
    }
    item.spe = -(variety + 1);
}

export function tinVariety(item, display = false) {
    let variety;
    if (item.spe === 1) variety = -1;
    else if (item.cursed) variety = 0;
    else if (item.spe < 0) variety = -item.spe - 1;
    else variety = rn2(TIN_VARIETY_TEXTS.length);
    if (!display && variety === 1 && !item.blessed && !rn2(7)) variety = 0;
    const monster = corpseMonsterType(item);
    if (variety === 0 && monster && (['lizard', 'lichen', 'acid blob'].includes(monster.name) || is_rider(monster))) variety = 1;
    return variety;
}

export function tinDetails(item, name = 'tin', override = false) {
    const variety = tinVariety(item, true);
    if (variety === -1) return name + ' of spinach';
    if (item.corpsenm == null || item.corpsenm === -1) return 'empty tin';
    const monster = corpseMonsterType(item);
    const species = monster?.name || item.corpsenm.name;
    let result = name + ' of ';
    if ((item.cknown || override) && item.spe < 0) {
        const description = TIN_VARIETY_TEXTS[variety];
        result = variety < 2 ? description + ' ' + result : result + description + ' ';
    }
    return result + species + (monster && vegetarian(monster) ? '' : ' meat');
}
