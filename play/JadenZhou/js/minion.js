// minion.js — minions and summoned monsters.
// C ref: minion.c — monster_census(), summon_minion(), lminion()
// (ndemon() lives in makemon.js).
//
// Not ported yet: the rest of minion.c (msummon(), demon_talk(), bribe(),
// dprince(), dlord(), llord(), lose_guardian_angel(), gain_guardian_angel()).

import { game } from './gstate.js';
import { canspotmon, pline, You_feel, verbalize } from './display.js';
import { ROLL_FROM } from './rng.js';
import { makemon, mkclass, ndemon } from './makemon.js';
import { monsndx, is_lord } from './mondata.js';
import { mons, S_ANGEL, PM_ANGEL, PM_SHOPKEEPER, PM_GUARD,
         PM_ALIGNED_CLERIC, PM_HIGH_CLERIC, PM_AIR_ELEMENTAL,
         PM_FIRE_ELEMENTAL, PM_EARTH_ELEMENTAL,
         PM_WATER_ELEMENTAL } from './monsters.js';
import { A_NONE, A_LAWFUL, A_NEUTRAL, A_CHAOTIC, NON_PM, MM_EMIN, MM_NOMSG,
         STRAT_APPEARMSG, DEAF } from './const.js';
import { Amonnam } from './do_name.js';
import { s_suffix } from './hacklib.js';
import { align_gname } from './pray.js';

/* used to pick among the four basic elementals without worrying whether
   they've been reordered (difficulty reassessment?) or any new ones have
   been introduced (hybrid types added to 'E'-class?) */
const elementals = [
    PM_AIR_ELEMENTAL, PM_FIRE_ELEMENTAL,
    PM_EARTH_ELEMENTAL, PM_WATER_ELEMENTAL,
];

// C ref: minion.c summon_minion()
export async function summon_minion(alignment, talk) {
    const u = game.u;
    let mon;
    let mnum;

    switch (alignment) {
    case A_LAWFUL:
        mnum = lminion();
        break;
    case A_NEUTRAL:
        mnum = ROLL_FROM(elementals);
        break;
    case A_CHAOTIC:
    case A_NONE:
        mnum = ndemon(alignment);
        break;
    default:
        console.error("impossible: unaligned player?");
        mnum = ndemon(A_NONE);
        break;
    }
    if (mnum === NON_PM) {
        mon = null;
    } else if (mnum === PM_ANGEL) {
        mon = makemon(mons[mnum], u.ux, u.uy, MM_EMIN | MM_NOMSG);
        if (mon) {
            mon.isminion = 1;
            mon.emin.min_align = alignment;
            mon.emin.renegade = false;
        }
    } else if (mnum !== PM_SHOPKEEPER && mnum !== PM_GUARD
               && mnum !== PM_ALIGNED_CLERIC && mnum !== PM_HIGH_CLERIC) {
        /* This was mons[mnum].pxlth == 0 but is this restriction
           appropriate or necessary now that the structures are separate? */
        mon = makemon(mons[mnum], u.ux, u.uy, MM_EMIN | MM_NOMSG);
        if (mon) {
            mon.isminion = 1;
            mon.emin.min_align = alignment;
            mon.emin.renegade = false;
        }
    } else {
        mon = makemon(mons[mnum], u.ux, u.uy, MM_NOMSG);
    }
    if (mon) {
        if (talk) {
            const Deaf = !!(u.uprops[DEAF]?.intrinsic || u.uprops[DEAF]?.extrinsic
                            || u.uroleplay?.deaf);
            if (!Deaf)
                await pline(`The voice of ${align_gname(alignment)} booms:`); /* pline_The() */
            else
                await You_feel(`${s_suffix(align_gname(alignment))} booming voice:`);
            /* SetVoice(mon, 0, 80, 0): speech synthesis only */
            await verbalize("Thou shalt pay for thine indiscretion!");
            if (canspotmon(mon))
                await pline(`${Amonnam(mon)} appears before you.`);
            mon.mstrategy &= ~STRAT_APPEARMSG;
        }
        mon.mpeaceful = 0;
        /* don't call set_malign(); player was naughty */
    }
}

// C ref: minion.c lminion()
export function lminion() {
    let tryct;
    let ptr;

    for (tryct = 0; tryct < 20; tryct++) {
        ptr = mkclass(S_ANGEL, 0);
        if (ptr && !is_lord(ptr))
            return monsndx(ptr);
    }

    return NON_PM;
}

// C ref: minion.c monster_census()
/* count the number of monsters on the level */
export function monster_census(spotted) /* seen|sensed vs all */
{
    let count = 0;

    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        if (mtmp.mhp < 1) /* DEADMONSTER() */
            continue;
        if (mtmp.isgd && mtmp.mx === 0)
            continue;
        if (spotted && !canspotmon(mtmp))
            continue;
        ++count;
    }
    return count;
}
