// dog.c:627-724: state changes while a monster was off the active level.
import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { newsym } from './display.js';
import { LARGEST_INT, M_AP_TYPE } from './const.js';
import { carnivorous, herbivorous, regenerates, S_MIMIC } from './permonst.js';
import { pmOf } from './mhitm.js';

export function monCatchupElapsedTime(mon, elapsed) {
    if (elapsed < 0) throw new RangeError('catchup from future time');
    const turns = elapsed >= LARGEST_INT ? LARGEST_INT - 1 : Math.trunc(elapsed);
    for (const field of ['mblinded', 'mfrozen', 'mfleetim']) {
        if (mon[field]) mon[field] = Math.max(1, mon[field] - turns);
    }
    for (const [field, threshold] of [['mtrapped', 20], ['mconf', 25], ['mstun', 5]]) {
        if (mon[field] && rn2(turns + 1) > threshold) mon[field] = 0;
    }
    const species = pmOf(mon) || mon.data || {};
    if (mon.meating) {
        if (turns > mon.meating) {
            mon.meating = 0;
            // dogmove.c:finish_meating clears a disguise gained by eating
            // a mimic, while an actual mimic keeps its normal disguise.
            if (M_AP_TYPE(mon) && species.mlet !== S_MIMIC) {
                mon.m_ap_type = 0;
                mon.mappearance = 0;
                mon.appearObj = mon.appearGlyph = mon.appearColor = null;
                newsym(mon.mx, mon.my);
            }
        } else mon.meating -= turns;
    }
    mon.mspec_used = Math.max(0, (mon.mspec_used || 0) - turns);
    if (mon.mtame) {
        const wilder = Math.trunc((turns + 75) / 150);
        if (mon.mtame > wilder) mon.mtame -= wilder;
        else if (mon.mtame > rn2(wilder)) mon.mtame = 0;
        else mon.mtame = mon.mpeaceful = 0;
    }
    const edog = mon.mextra?.edog;
    if (mon.mtame && !mon.isminion && edog && (carnivorous(species) || herbivorous(species))) {
        const now = game.moves || 1;
        if ((now > edog.hungrytime + 500 && mon.mhp < 3) || now > edog.hungrytime + 750)
            mon.mtame = mon.mpeaceful = 0;
    }
    if (!mon.mtame && mon.mleashed) {
        const leash = (game.inventory || []).find(obj => obj.leashmon === (mon.m_id ?? mon.id ?? mon.mid));
        if (leash) leash.leashmon = 0;
        mon.mleashed = false;
    }
    if (mon.pet != null || edog) mon.pet = !!mon.mtame;
    mon.mhp = Math.min(mon.mhpmax, mon.mhp + (regenerates(species) ? turns : Math.trunc(turns / 20)));
    mon.mlstmv = game.moves || 1;
}
