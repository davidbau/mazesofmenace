// C exper.c:experience. Species attacks and flags come from the same table
// used for combat; recording-specific XP overrides are not game rules.
import { rnd, rn2 } from './rng.js';
import { game } from './gstate.js';
import { W_AMUL } from './const.js';
import { findMac, mLevel, pmOf } from './mhitm.js';
import { IDENTIFIED_AMULET_NAMES } from './o_init.js';
import * as pm from './permonst.js';

export function monsterExperienceValue(mon, killedCount = 1) {
    const data = pmOf(mon) || mon.data || {};
    const level = mLevel(mon);
    let experience = 1 + level * level;
    const ac = findMac(mon);
    if (ac < 3) experience += (7 - ac) * (ac < 0 ? 2 : 1);
    if (data.mmove > pm.NORMAL_SPEED) experience += data.mmove > 3 * pm.NORMAL_SPEED / 2 ? 5 : 3;
    const form = game.u?._polyself_form || game.u?.youmonst?.data || game.u?.data;
    const heroSpecies = pmOf({ data: form }) || form || {};
    const amphibious = game.u?.amphibious || game.u?.Amphibious
        || game.u?.magicalBreathing || game.u?.magical_breathing || pm.amphibious(heroSpecies)
        || (game.inventory || []).some(obj => (obj.owornmask != null ? obj.owornmask & W_AMUL : obj.worn)
            && (IDENTIFIED_AMULET_NAMES[obj.amuletIndex] || obj.actualKind || obj.kind) === 'amulet of magical breathing');
    for (const attack of data.attacks || (data.attack ? [data.attack] : [])) {
        const type = typeof attack.aatyp === 'number' ? attack.aatyp
            : pm[`AT_${String(attack.aatyp || (attack.weapon ? 'weap' : 'claw')).toUpperCase()}`];
        if (type > pm.AT_BUTT) experience += type === pm.AT_WEAP ? 5 : type === pm.AT_MAGC ? 10 : 3;
        const damage = typeof attack.adtyp === 'number' ? attack.adtyp
            : pm[`AD_${String(attack.adtyp || 'phys').toUpperCase()}`];
        if (damage > pm.AD_PHYS && damage < pm.AD_BLND) experience += 2 * level;
        else if ([pm.AD_DRLI, pm.AD_STON, pm.AD_SLIM].includes(damage)) experience += 50;
        else if (damage !== pm.AD_PHYS) experience += level;
        if ((attack.damn ?? attack.dice ?? 0) * (attack.damd ?? attack.sides ?? 0) > 23) experience += level;
        if (damage === pm.AD_WRAP && data.mlet === pm.S_EEL && !amphibious) experience += 1000;
    }
    if (pm.extra_nasty(data)) experience += 7 * level;
    if (level > 8) experience += 50;
    if (data.pm === pm.PM_MAIL_DAEMON) experience = 1;
    if (mon.mrevived || mon.mcloned) {
        for (let step = 0, threshold = 20; killedCount > threshold && experience > 1; step++) {
            experience = Math.trunc((experience + 1) / 2);
            killedCount -= threshold;
            if (step & 1) threshold += 20;
        }
    }
    return experience;
}

// makemon.c:monhp_per_lvl consumes the default d8 even for species whose
// level-drain increment is subsequently replaced by a fixed or special value.
export function monsterHpPerLevel(mon) {
    const data = pmOf(mon) || mon.data || {};
    let hp = rnd(8);
    if (pm.is_golem(data)) {
        const fixed = { 'straw golem':20, 'paper golem':20, 'rope golem':30,
            'leather golem':40, 'gold golem':60, 'wood golem':50, 'flesh golem':40,
            'clay golem':70, 'stone golem':100, 'glass golem':80, 'iron golem':120 };
        hp = Math.trunc((fixed[data.name] || 0) / data.mlevel);
    } else if (data.mlevel > 49) hp = 4 + rnd(4);
    else if (data.mlet === pm.S_DRAGON && pm.MONS.indexOf(data) >= pm.PM_GRAY_DRAGON) hp = 4 + rn2(5);
    else if (!mLevel(mon)) hp = rnd(4);
    return hp;
}
