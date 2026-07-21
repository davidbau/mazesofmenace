// wizard.js — Wizard of Yendor harassment from wizard.c.
// C ref: wizard.c resurrect (new-Wizard makemon arm); aggravate; tactics.

import { game } from './gstate.js';
import { makemon, set_malign } from './makemon.js';
import { mons, is_covetous } from './monsters.js';
import { monsterNames } from './generated/monsters_data.js';
import {
    MM_NOWAIT, STRAT_WAITMASK, STRAT_WAITFORU, STRAT_APPEARMSG,
    STRAT_NONE, STRAT_HEAL, RLOC_MSG,
} from './const.js';
import { pline, verbalize, Norep } from './display.js';
import { Monnam } from './do_name.js';
import { rn2 } from './rng.js';
import { noteleport_level } from './teleport.js';
import { mnexto } from './mon.js';
import { inhishop } from './shk.js';

const PM_WIZARD_OF_YENDOR = monsterNames.indexOf('PM_WIZARD_OF_YENDOR');

/**
 * C ref: wizard.c aggravate — wake/unfreeze monsters on this W-tower side.
 * Named omission: In_W_tower filter (always treat same side until W-tower
 * regions exist) — both hero and mon treated as non-tower.
 */
export function aggravate() {
    for (const mtmp of game.fmon || []) {
        if (!mtmp || (mtmp.mhp | 0) <= 0) continue;
        // In_W_tower mismatch skip deferred (always same side)
        mtmp.mstrategy = (mtmp.mstrategy | 0)
            & ~(STRAT_WAITFORU | STRAT_APPEARMSG);
        mtmp.msleeping = 0;
        if (!mtmp.mcanmove && !rn2(5)) {
            mtmp.mfrozen = 0;
            mtmp.mcanmove = 1;
        }
    }
}

/**
 * C ref: wizard.c strategy — HP-band + covetous/shop/temple gates.
 * Envelope: cases 0–3 → STRAT_HEAL / STRAT_NONE. Named omissions:
 * target_on(M3_WANTS*) pursuit; inhistemple (ispriest always treated as
 * in-temple skip like shopkeeper-in-shop).
 */
function strategy(mtmp) {
    if (!is_covetous(mtmp.data)
        || (mtmp.isshk && inhishop(mtmp))
        || mtmp.ispriest) {
        return STRAT_NONE;
    }
    const hpmax = mtmp.mhpmax | 0;
    const band = hpmax > 0 ? (((mtmp.mhp | 0) * 3) / hpmax) | 0 : 0;
    switch (band) {
    default:
    case 0:
        return STRAT_HEAL;
    case 1:
        if (mtmp.data !== mons(PM_WIZARD_OF_YENDOR)) return STRAT_HEAL;
        // FALLTHROUGH — Wizard less cautious
    case 2:
        // C: dstrat=HEAL then target_on… — target deferred → HEAL
        return STRAT_HEAL;
    case 3:
        // C: dstrat=NONE then target_on… — target deferred → NONE
        return STRAT_NONE;
    }
}

/**
 * C ref: wizard.c tactics — covetous special move before distfleeck.
 * Envelope: strategy → mstrategy update → STRAT_NONE harass rn2/mnexto.
 * STRAT_HEAL: set mavenge only; choose_stairs / rloc / healmon /
 * FALLTHROUGH-to-harass deferred (falling through burned extra rn2 when C
 * early-returned from HEAL).
 */
export function tactics(mtmp) {
    const strat = strategy(mtmp);
    mtmp.mstrategy = ((mtmp.mstrategy | 0) & (STRAT_WAITMASK | STRAT_APPEARMSG))
        | strat;

    switch (strat) {
    case STRAT_HEAL:
        // choose_stairs / In_W_tower rloc / healmon / FALLTHROUGH deferred
        mtmp.mavenge = 1;
        return 0;
    case STRAT_NONE:
        if (!noteleport_level(mtmp) && !rn2(!mtmp.mflee ? 5 : 33)) {
            mnexto(mtmp, RLOC_MSG);
        }
        return 0;
    default:
        // STRAT_PLAYER / GROUND / MONSTR pursuit deferred
        return 0;
    }
}

/**
 * C ref: wizard.c resurrect — confront hero with Wizard on endgame entry.
 * Envelope: no_of_wizards==0 → makemon(PM_WIZARD, ux,uy, MM_NOWAIT) +
 * mrevived; clear WAITMASK; hostile + set_malign; voice pline.
 * Named omissions: migrating-Wizard mon_arrive(Wiz_arrive) path when
 * no_of_wizards>0; SetVoice; Deaf-aware acoustics polish.
 */
export async function resurrect() {
    const u = game.u;
    if (!u) return;

    if (!game.context) game.context = {};
    let mtmp = null;
    let verb = 'kill';

    if (!(game.context.no_of_wizards | 0)) {
        // C: make a new Wizard
        verb = 'kill';
        mtmp = makemon(
            mons(PM_WIZARD_OF_YENDOR),
            u.ux | 0,
            u.uy | 0,
            MM_NOWAIT,
        );
        if (mtmp) mtmp.mrevived = 1;
    } else {
        // Migrating-Wizard search / mon_arrive(Wiz_arrive) deferred
        verb = 'elude';
        return;
    }

    if (mtmp) {
        mtmp.mstrategy = (mtmp.mstrategy | 0) & ~STRAT_WAITMASK;
        mtmp.mtame = 0;
        mtmp.mpeaceful = 0;
        set_malign(mtmp);
        // C: makemon !in_mklev !MM_NOMSG appear Norep (D-0559) — before voice.
        // Envelope: canseemon/sensemon + mimic arms deferred; Wizard is visible.
        {
            const ux = u.ux | 0;
            const uy = u.uy | 0;
            const dx = Math.abs((mtmp.mx | 0) - ux);
            const dy = Math.abs((mtmp.my | 0) - uy);
            const next2u = dx <= 1 && dy <= 1 && (dx || dy);
            const where = next2u ? ' next to you'
                : ((dx * dx + dy * dy) <= 64) ? ' close by' : '';
            await Norep(`${Monnam(mtmp)} suddenly appears${where}!`);
        }
        if (!u.Deaf) {
            await pline('A voice booms out...');
            await verbalize(`So thou thought thou couldst ${verb} me, fool.`);
        }
    }
}
