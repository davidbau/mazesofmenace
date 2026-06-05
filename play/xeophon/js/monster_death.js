import { game } from './gstate.js';
import { d } from './rng.js';

function normalizedAttackCode(value) {
    return String(value || '').toLowerCase();
}

export function gasSporeDeathExplosionAttack(mon) {
    const data = mon?.data || mon || {};
    const attack = data.attack || {};
    const aatyp = normalizedAttackCode(attack.aatyp);
    const adtyp = normalizedAttackCode(attack.adtyp || 'phys');
    if (aatyp === 'boom' && adtyp === 'phys')
        return { dice: attack.dice ?? attack.damn ?? 4, sides: attack.sides ?? attack.damd ?? 6 };
    if (data.name === 'gas spore')
        return { dice: 4, sides: 6 };
    return null;
}

export function queueGasSporeDeathExplosion(mon, { messages = null } = {}) {
    const attack = gasSporeDeathExplosionAttack(mon);
    if (!attack || !game.level) return null;
    const dice = Math.max(1, Math.trunc(attack.dice || 4));
    const sides = Math.max(1, Math.trunc(attack.sides || 6));
    d(dice, sides);
    const damage = d(dice, sides);
    if (Array.isArray(messages)) messages.push('Boom!');

    const x = mon.mx;
    const y = mon.my;
    const sourceLevel = Math.max(1, Math.min(50, mon.m_lev ?? mon.data?.mlevel ?? 1));
    const targets = (game.level.monsters || []).filter(other => other !== mon
        && !other.dead
        && (other.mhp == null || other.mhp > 0)
        && Math.abs(other.mx - x) <= 1 && Math.abs(other.my - y) <= 1);

    if (targets.length) {
        const first = targets[0];
        game._preserve_gas_spore_residue = 1;
        game._gas_spore_residue_mon = first;
        game._gas_spore_residue_initial_x = first.mx;
        game._gas_spore_residue_initial_y = first.my;
        game._gas_spore_residue_x = first.mx;
        game._gas_spore_residue_y = first.my;
        game._gas_spore_residue_visible_x = first.mx;
        game._gas_spore_residue_visible_y = first.my;
        game._gas_spore_residue_frames = 0;
    }

    for (const target of targets) {
        const targetLevel = Math.max(1, Math.min(50, target.m_lev ?? target.data?.mlevel ?? 1));
        const resistBound = Math.max(1, 100 + sourceLevel - targetLevel);
        game._queued_messages_after_more ??= [];
        game._queued_messages_after_more.push({
            text: `The ${target.data?.name || 'monster'} is caught in the gas spore's explosion!`,
            more: true,
            gasSporeMonsterExplosion: {
                target,
                damage,
                resistBound,
            },
        });
    }

    if (game.u && Math.abs((game.u.ux ?? 0) - x) <= 1 && Math.abs((game.u.uy ?? 0) - y) <= 1) {
        game._queued_messages_after_more ??= [];
        game._queued_messages_after_more.push({
            text: "You are caught in the gas spore's explosion!",
            gasSporeHeroExplosion: { damage },
            processTime: true,
        });
    }
    game._process_time_with_more = 0;
    return { damage, message: 'Boom!' };
}
