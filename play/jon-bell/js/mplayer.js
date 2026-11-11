// mplayer.js — C ref: mplayer.c.
import { COLNO, ROWNO } from './const.js';
import { _PM_ARCHEOLOGIST, _PM_WIZARD, mkMplayer, permonstTemplate } from './makemon.js';
import { rn1, rnd } from './rng.js';
import { goodpos } from './trap.js';

/**
 * C mplayer.c:318-352 create_mplayers(num, special) — create `num` monster-players
 * at random free locations.  RNG per iteration: rn1(PM_WIZARD-PM_ARCHEOLOGIST+1,
 * PM_ARCHEOLOGIST), then (rn1(COLNO-4,2), rnd(ROWNO-2)) per placement try, with
 * goodpos() on a zeromonst fakemon (it may draw, e.g. rn2(13) for S_EEL forms),
 * then mk_mplayer.  Gives up silently once tryct exceeds 50.
 * NOT WIRED: final_level (do.c:2043) in js/cmd.js is the caller.
 * @param {number} num
 * @param {boolean} special
 * @param {object} cbs — mkMplayer callbacks (must include makemon)
 */
export async function create_mplayers(num, special, cbs) {
    /* C: fakemon = cg.zeromonst; set_mon_data() below fills in .data and .mnum;
       m_id and wormno stay zero from zeromonst. */
    const fakemon = { data: null, mnum: -1, m_id: 0, wormno: 0,
                      mx: 0, my: 0, minvent: null };
    while (num) {
        let tryct = 0;
        let x, y;
        /* roll for character class */
        const pm = rn1(_PM_WIZARD - _PM_ARCHEOLOGIST + 1, _PM_ARCHEOLOGIST);
        fakemon.mnum = pm;
        fakemon.data = permonstTemplate(pm);
        /* roll for an available location */
        do {
            x = rn1(COLNO - 4, 2);
            y = rnd(ROWNO - 2);
        } while (!goodpos(x, y, fakemon, 0) && tryct++ <= 50);
        /* if pos not found in 50 tries, don't bother to continue */
        if (tryct > 50)
            return;
        await mkMplayer(pm, x, y, special, cbs);
        num--;
    }
}
