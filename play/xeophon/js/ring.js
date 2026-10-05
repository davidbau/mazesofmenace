// C include/objects.h rings, in the same order as the runtime ringRoll index.
import * as C from './const.js';
export const RING_DEFINITIONS = [
    ['adornment', C.ADORNED, null, C.A_CHA],
    ['gain strength', 0, null, C.A_STR],
    ['gain constitution', 0, null, C.A_CON],
    ['increase accuracy', 0, null, 'uhitinc'],
    ['increase damage', 0, null, 'udaminc'],
    ['protection', C.PROTECTION, null, 'uac'],
    ['regeneration', C.REGENERATION, 'regeneration'],
    ['searching', C.SEARCHING, 'searching'],
    ['stealth', C.STEALTH, 'stealth'],
    ['sustain ability', C.FIXED_ABIL, 'fixedAbilities'],
    ['levitation', C.LEVITATION, 'levitating'],
    ['hunger', C.HUNGER, 'hunger'],
    ['aggravate monster', C.AGGRAVATE_MONSTER, 'aggravateMonster'],
    ['conflict', C.CONFLICT, 'conflict'],
    ['warning', C.WARNING, 'warning'],
    ['poison resistance', C.POISON_RES, 'poisonResistance'],
    ['fire resistance', C.FIRE_RES, 'fireResistance'],
    ['cold resistance', C.COLD_RES, 'coldResistance'],
    ['shock resistance', C.SHOCK_RES, 'shockResistance'],
    ['free action', C.FREE_ACTION, 'freeAction'],
    ['slow digestion', C.SLOW_DIGESTION, 'slowDigestion'],
    ['teleportation', C.TELEPORT, 'teleportation'],
    ['teleport control', C.TELEPORT_CONTROL, 'teleportControl'],
    ['polymorph', C.POLYMORPH, 'polymorph'],
    ['polymorph control', C.POLYMORPH_CONTROL, 'polymorphControl'],
    ['invisibility', C.INVIS, 'invisible'],
    ['see invisible', C.SEE_INVIS, 'seeInvisible'],
    ['protection from shape changers', C.PROT_FROM_SHAPE_CHANGERS, 'protectionFromShapeChangers'],
].map(([name, property, field, attribute], index) => ({ name, property, field, attribute, index, charged: index < 6 }));
const BY_NAME = new Map(RING_DEFINITIONS.map(def => [def.name, def]));

export function ringDefinition(obj) {
    if (!obj) return null;
    const index = (obj.ringRoll || obj.roll || 0) - 1;
    if (index >= 0 && index < RING_DEFINITIONS.length) return RING_DEFINITIONS[index];
    for (const value of [obj.actualKind, obj.kind]) {
        const name = String(value || '').toLowerCase().replace(/^ring of /, '').replace(/ named .*$/, '');
        const def = BY_NAME.get(name);
        if (def) return def;
    }
    return null;
}
