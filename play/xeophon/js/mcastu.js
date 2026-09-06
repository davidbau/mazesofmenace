// C mcastu.c:choose_monster_spell/spell_would_be_useless and include/mcastu.h.
import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { couldsee } from './vision.js';
import { AD_CLRC } from './permonst.js';
import { MFAST } from './const.js';
import { noOfWizards, hasAggravatables } from './wizard.js';

export const MONSTER_SPELLS = new Map([
    ['PSI_BOLT', 0], ['OPEN_WOUNDS', 0], ['CURE_SELF', 1], ['HASTE_SELF', 2],
    ['CONFUSE_YOU', 2], ['STUN_YOU', 3], ['DISAPPEAR', 4], ['PARALYZE', 4],
    ['BLIND_YOU', 6], ['WEAKEN_YOU', 6], ['DESTRY_ARMR', 8], ['INSECTS', 8],
    ['CURSE_ITEMS', 10], ['LIGHTNING', 11], ['FIRE_PILLAR', 12], ['GEYSER', 13],
    ['AGGRAVATION', 13], ['SUMMON_MONS', 15], ['CLONE_WIZ', 18], ['DEATH_TOUCH', 20],
]);
export const MCAST_INDIRECT = new Set(['CURE_SELF', 'HASTE_SELF', 'DISAPPEAR', 'INSECTS', 'AGGRAVATION', 'SUMMON_MONS', 'CLONE_WIZ']);
const SELF_SPELLS = new Set(['CURE_SELF', 'HASTE_SELF', 'DISAPPEAR']);
const WIZARD_SPELLS = ['PSI_BOLT', 'CURE_SELF', 'HASTE_SELF', 'STUN_YOU', 'DISAPPEAR',
    'WEAKEN_YOU', 'DESTRY_ARMR', 'CURSE_ITEMS', 'AGGRAVATION', 'SUMMON_MONS', 'CLONE_WIZ', 'DEATH_TOUCH'];
const CLERIC_SPELLS = ['OPEN_WOUNDS', 'CURE_SELF', 'CONFUSE_YOU', 'PARALYZE', 'BLIND_YOU',
    'INSECTS', 'CURSE_ITEMS', 'LIGHTNING', 'FIRE_PILLAR', 'GEYSER'];

export function monsterSpellWouldBeUseless(mon, spell, hero = {}) {
    if (!SELF_SPELLS.has(spell) && (mon.mpeaceful || !couldsee(mon.mx, mon.my))) return true;
    switch (spell) {
    case 'DEATH_TOUCH': return !!(hero.antimagic || hero.hallucination) && !rn2(2);
    case 'GEYSER': return !rn2(5);
    case 'CLONE_WIZ': return !mon.iswiz || noOfWizards() > 1;
    case 'AGGRAVATION': return hasAggravatables(mon) ? false : !!rn2(100);
    case 'HASTE_SELF': return mon.permspeed === 'fast' || mon.permspeed === MFAST;
    case 'DISAPPEAR': return !!(mon.minvis || mon.invis_blkd || (mon.mpeaceful && !hero.seeInvisible));
    case 'CURE_SELF': return mon.mhp === mon.mhpmax;
    case 'BLIND_YOU': return !!hero.blinded;
    default: return false;
    }
}

export function chooseMonsterSpell(mon, attackType, hero = {}) {
    const list = attackType === AD_CLRC ? CLERIC_SPELLS : WIZARD_SPELLS;
    const maximum = MONSTER_SPELLS.get(list.at(-1));
    let value = rn2(mon.m_lev ?? mon.data?.hpLevel ?? mon.data?.mlevel ?? 0);
    if (value > maximum && rn2(maximum)) value = rn2(maximum);
    for (let i = list.length - 1; i >= 0; i--)
        if (MONSTER_SPELLS.get(list[i]) <= value && !monsterSpellWouldBeUseless(mon, list[i], hero)) return list[i];
    return list[0];
}
