// wizard.js — Wizard of Yendor harassment from wizard.c.
// C ref: wizard.c resurrect (new-Wizard makemon arm).

import { game } from './gstate.js';
import { makemon, set_malign } from './makemon.js';
import { mons } from './monsters.js';
import { monsterNames } from './generated/monsters_data.js';
import { MM_NOWAIT, STRAT_WAITMASK } from './const.js';
import { pline, verbalize, Norep } from './display.js';
import { Monnam } from './do_name.js';

const PM_WIZARD_OF_YENDOR = monsterNames.indexOf('PM_WIZARD_OF_YENDOR');

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
