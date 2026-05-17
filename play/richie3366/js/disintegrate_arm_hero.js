// disintegrate_arm_hero.js — C do_wear.c `disintegrate_arm` subset for `pray.c` `god_zaps_you` (non-swallow beam).
// C ref: do_wear.c disintegrate_arm (~3201), maybe_destroy_armor (~3188); pray.c god_zaps_you (~658–671).

import { pline } from './display.js';
import { objResists } from './obj_resists.js';
import { setnotwornHeroMinimalLikeC } from './wear.js';
import { removeObjFromHeroInvent, waterDamageObjPhrase } from './water_damage.js';
import { updateInventory } from './invent.js';

/** @typedef {'arms' | 'armc' | 'arm' | 'armu'} DisintegrateArmSlotPrayGodZaps */

function isPluralArmorPhraseDisint(s) {
    const x = String(s || '').toLowerCase();
    return (
        /scales$/.test(x)
        || /^some /.test(x)
        || (!/^a |^an /.test(x) && x.length > 2 && x.endsWith('s') && !x.endsWith('ss'))
    );
}

function vtenseTurnDisintLikeC(subj) {
    return isPluralArmorPhraseDisint(subj) ? 'turn' : 'turns';
}

function vtenseFallDisintLikeC(subj) {
    return isPluralArmorPhraseDisint(subj) ? 'fall' : 'falls';
}

/**
 * C: do_wear.c disintegrate_arm(atmp) when atmp is a specific worn piece (pray.c god_zaps_you: uarms, uarmc, uarm, uarmu).
 * Omits full wornarm_destroyed (cancel_don, Cloak_off); uses setnotwornHeroMinimalLikeC + removeObjFromHeroInvent.
 * urgent_pline omitted (pline only). selftouch glove path N/A for this pray.c call order.
 * @param {import('./gstate.js').game} g
 * @param {object|null|undefined} obj
 * @param {DisintegrateArmSlotPrayGodZaps} which
 * @returns {Promise<number>} 1 if destroyed, 0 if skipped or resisted
 */
export async function disintegrateArmHeroAtObjGodZapsLikeC(g, obj, which) {
    if (!obj) return 0;
    if (objResists(obj, 0, 90)) return 0;

    if (obj.lamplit | 0) obj.lamplit = 0;

    const phrase = waterDamageObjPhrase(obj);
    switch (which) {
        case 'armc':
            await pline(`Your ${phrase} crumbles and turns to dust!`);
            break;
        case 'arm':
            await pline(
                `Your ${phrase} ${vtenseTurnDisintLikeC(phrase)} to dust and ${vtenseFallDisintLikeC(phrase)} to the floor!`,
            );
            break;
        case 'armu':
            await pline(`Your ${phrase} crumbles into tiny threads and falls apart!`);
            break;
        case 'arms':
        default:
            await pline(`Your ${phrase} crumbles away!`);
            break;
    }

    setnotwornHeroMinimalLikeC(g, obj);
    removeObjFromHeroInvent(g, obj);
    if (g.iflags?.perm_invent) updateInventory();
    return 1;
}
