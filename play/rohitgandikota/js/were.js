// were.js — lycanthropes.
// C ref: src/were.c
//
// were_change() draws every turn boundary for every werecreature on the
// level (the rn2 whose size depends on day/night and moon phase), so a
// level with a werejackal on it desyncs immediately without this.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { pline } from './display.js';
import { You_hear } from './pline.js';
import { Monnam, pmname } from './do_name.js';
import { canseemon } from './display.js';
import { newsym } from './display.js';
import { helpless } from './monst.js';
import { healmon, wake_nearto } from './mon.js';
import { is_human } from './mondata.js';
import { MFLAGS, PMNAMES } from './monst_data.js';
import { night } from './calendar.js';
import { Deaf, Hallucination } from './youprop.js';
import { FULL_MOON } from './const.js';

function note_unported_were(what) {
    (game.unported ||= new Set()).add('were:' + what);
}

/* include/mondata.h:96 is_were() */
export const is_were = (ptr) => (ptr.mflags2 & MFLAGS.M2_WERE) !== 0;

// src/were.c:47 counter_were()
export function counter_were(pm) {
    const P = PMNAMES;
    switch (pm) {
    case P.PM_WEREWOLF:          return P.PM_HUMAN_WEREWOLF;
    case P.PM_HUMAN_WEREWOLF:    return P.PM_WEREWOLF;
    case P.PM_WEREJACKAL:        return P.PM_HUMAN_WEREJACKAL;
    case P.PM_HUMAN_WEREJACKAL:  return P.PM_WEREJACKAL;
    case P.PM_WERERAT:           return P.PM_HUMAN_WERERAT;
    case P.PM_HUMAN_WERERAT:     return P.PM_WERERAT;
    default:                     return -1 /* NON_PM */;
    }
}

// src/were.c:96 new_were() — transform between human and beast form.
export async function new_were(mon) {
    /* Protection_from_shape_changers — extrinsic not modelled; nothing
       grants it in the recorded sessions */
    const pm = counter_were(mon.mnum);
    if (pm < 0)
        return;

    if (canseemon(mon) && !Hallucination())
        await pline(`${Monnam(mon)} changes into a ${
            is_human(game.mons[pm]) ? 'human'
                : pmname(game.mons[pm], 2).slice(4) /* skip "were" */}.`);

    /* set_mon_data() */
    mon.mnum = pm;
    if (mon.data !== undefined)
        mon.data = game.mons[pm];
    if (helpless(mon)) {
        mon.msleeping = 0;
        mon.mfrozen = 0;
        mon.mcanmove = 1;
    }
    /* regenerate by 1/4 of the lost hit points */
    healmon(mon, Math.trunc((mon.mhpmax - mon.mhp) / 4), 0);
    newsym(mon.mx, mon.my);
    note_unported_were('new_were:break_armor_unwield');
}

// src/were.c:9 were_change() — maybe shift form; the rn2 size depends on
// night() and the moon phase.
export async function were_change(mon) {
    const ptr = game.mons[mon.mnum];
    if (!is_were(ptr))
        return;

    if (is_human(ptr)) {
        if (!rn2(night() ? (game.flags?.moonphase === FULL_MOON ? 3 : 30)
                         : (game.flags?.moonphase === FULL_MOON ? 10 : 50))) {
            await new_were(mon); /* change into animal form */
            game.were_changes = (game.were_changes || 0) + 1;
            if (!Deaf() && !canseemon(mon)) {
                let howler = null;
                switch (mon.mnum) {
                case PMNAMES.PM_WEREWOLF:   howler = 'wolf'; break;
                case PMNAMES.PM_WEREJACKAL: howler = 'jackal'; break;
                default: break;
                }
                if (howler) {
                    await You_hear(`a ${howler} howling at the moon.`);
                    wake_nearto(mon.mx, mon.my, 4 * 4);
                }
            }
        }
    } else if (!rn2(30)) {
        await new_were(mon); /* change back into human form */
        game.were_changes = (game.were_changes || 0) + 1;
    }
}
