import { game } from './gstate.js';
import { armorSlot, GAUNTLETS_OF_POWER, DUNCE_CAP } from './armor.js';
import { MONS, S_NYMPH, PM_AMOROUS_DEMON } from './permonst.js';
import { A_STR, A_INT, A_WIS, A_CON, A_CHA, W_ARMH, W_ARMG, W_WEP } from './const.js';

// attrib.c:acurr combines base, equipment and temporary values before applying
// equipment/form overrides. Those overrides never change the base attribute.
export function currentHeroAttribute(index, g = game) {
    const u = g.u || {}, inventory = g.inventory || [];
    const value = (u.acurr?.a?.[index] ?? 10) + (u.abon?.a?.[index] || 0) + (u.atemp?.a?.[index] || 0);
    if (index === A_STR) {
        const gloves = u.uarmg || inventory.find(item => item.owornmask & W_ARMG
            || (item.worn || item.line?.includes('being worn')) && armorSlot(item) === 'gloves');
        return gloves && (gloves.otyp === GAUNTLETS_OF_POWER || (gloves.actualKind || gloves.kind) === 'gauntlets of power')
            ? 125 : Math.max(3, Math.min(125, value));
    }
    if (index === A_CHA) {
        const form = u._polyself_form || u.youmonst?.data || u.data || MONS[u.umonnum] || {};
        const species = MONS[form.pm ?? form.mnum] || MONS.find(mon => mon.name === form.name);
        if (value < 18 && (form.mlet === S_NYMPH || form.mlet === 'n' || species?.mlet === S_NYMPH
            || u.umonnum === PM_AMOROUS_DEMON || species?.pm === PM_AMOROUS_DEMON
            || ['incubus', 'succubus'].includes(form.name))) return 18;
    }
    if (index === A_CON) {
        const weapon = u.uwep || inventory.find(item => item.wielded || item.owornmask & W_WEP);
        if ((weapon?.artifact || weapon?.oartifact) === 'Ogresmasher') return 25;
    }
    if (index === A_INT || index === A_WIS) {
        const helm = u.uarmh || inventory.find(item => item.owornmask & W_ARMH
            || (item.worn || item.line?.includes('being worn')) && armorSlot(item) === 'helm');
        if (helm && (helm.otyp === DUNCE_CAP || (helm.actualKind || helm.kind) === 'dunce cap')) return 6;
    }
    return Math.max(3, Math.min(25, value));
}

// attrib.c:acurrstr compresses the exceptional Strength representation for
// formulas which use the ordinary 3..25 scale, including carrying capacity.
export function currentHeroStrength(g = game) {
    const str = currentHeroAttribute(A_STR, g);
    return str <= 18 ? str : str <= 121 ? 19 + Math.trunc(str / 50) : str - 100;
}
