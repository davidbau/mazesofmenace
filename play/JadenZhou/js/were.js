// were.js -- lycanthropes changing form.
// C ref: were.c -- were_change(), counter_were(), were_beastie(), new_were().
// Not ported yet: were_summon(), you_were(), you_unwere(), set_ulycn().

import { game } from './gstate.js';
import { rn2, rn1 } from './rng.js';
import * as MM from './monsters.js';
import { mons, LOW_PM } from './monsters.js';
import { NON_PM, FULL_MOON, DEAF, HALLUC, HALLUC_RES, I_SPECIAL,
         PROT_FROM_SHAPE_CHANGERS } from './const.js';
import { night } from './calendar.js';
import { canseemon, newsym, pline } from './display.js';
import { You_hear } from './sounds.js';
import { wake_nearto, healmon, monnear } from './mon.js';
import { is_were, is_human, monsndx, set_mon_data } from './mondata.js';
import { Monnam, pmname, Mgender } from './do_name.js';
import { possibly_unwield } from './weapon.js';
import { mon_break_armor } from './worn.js';
import { onscary, monflee } from './monmove.js';

/* C ref: youprop.h Protection_from_shape_changers, Deaf, Hallucination */
function uhas(p) {
    const P = game.u.uprops[p];
    return !!(P && (P.intrinsic || P.extrinsic));
}
function Protection_from_shape_changers() { return uhas(PROT_FROM_SHAPE_CHANGERS); }
function Deaf() { return uhas(DEAF) || !!game.u.uroleplay?.deaf; }
function Hallucination() { return uhas(HALLUC) && !uhas(HALLUC_RES); }

// C ref: were.c were_change()
export async function were_change(mon) {
    if (!is_were(mon.data))
        return;

    if (is_human(mon.data)) {
        if (!Protection_from_shape_changers()
            && !rn2(night() ? (game.flags.moonphase === FULL_MOON ? 3 : 30)
                            : (game.flags.moonphase === FULL_MOON ? 10 : 50))) {
            await new_were(mon); /* change into animal form */
            game.were_changes = (game.were_changes || 0) + 1;
            if (!Deaf() && !canseemon(mon)) {
                let howler;

                switch (monsndx(mon.data)) {
                case MM.PM_WEREWOLF:
                    howler = "wolf";
                    break;
                case MM.PM_WEREJACKAL:
                    howler = "jackal";
                    break;
                default:
                    howler = null;
                    break;
                }
                if (howler) {
                    /* Soundeffect(se_canine_howl, 50) */
                    await You_hear(`a ${howler} howling at the moon.`);
                    await wake_nearto(mon.mx, mon.my, 4 * 4);
                }
            }
        }
    } else if (!rn2(30) || Protection_from_shape_changers()) {
        await new_were(mon); /* change back into human form */
        game.were_changes = (game.were_changes || 0) + 1;
    }
}

// C ref: were.c counter_were()
export function counter_were(pm) {
    switch (pm) {
    case MM.PM_WEREWOLF:
        return MM.PM_HUMAN_WEREWOLF;
    case MM.PM_HUMAN_WEREWOLF:
        return MM.PM_WEREWOLF;
    case MM.PM_WEREJACKAL:
        return MM.PM_HUMAN_WEREJACKAL;
    case MM.PM_HUMAN_WEREJACKAL:
        return MM.PM_WEREJACKAL;
    case MM.PM_WERERAT:
        return MM.PM_HUMAN_WERERAT;
    case MM.PM_HUMAN_WERERAT:
        return MM.PM_WERERAT;
    default:
        return NON_PM;
    }
}

// C ref: were.c were_beastie()
/* convert monsters similar to werecritters into appropriate werebeast */
export function were_beastie(pm) {
    switch (pm) {
    case MM.PM_WERERAT:
    case MM.PM_SEWER_RAT:
    case MM.PM_GIANT_RAT:
    case MM.PM_RABID_RAT:
        return MM.PM_WERERAT;
    case MM.PM_WEREJACKAL:
    case MM.PM_JACKAL:
    case MM.PM_FOX:
    case MM.PM_COYOTE:
        return MM.PM_WEREJACKAL;
    case MM.PM_WEREWOLF:
    case MM.PM_WOLF:
    case MM.PM_WARG:
    case MM.PM_WINTER_WOLF:
    case MM.PM_WINTER_WOLF_CUB:
        return MM.PM_WEREWOLF;
    default:
        break;
    }
    return NON_PM;
}

// C ref: were.c new_were()
export async function new_were(mon) {
    let pm;

    /* neither hero nor werecreature can change from human form to
       critter form if hero has Protection_from_shape_changers extrinsic;
       if already in critter form, always change to human form for that */
    if (Protection_from_shape_changers() && is_human(mon.data))
        return;

    pm = counter_were(monsndx(mon.data));
    if (pm < LOW_PM) {
        /* impossible("unknown lycanthrope %s.", ...) */
        return;
    }

    if (canseemon(mon) && !Hallucination())
        await pline(`${Monnam(mon)} changes into a ${
            is_human(mons[pm]) ? "human"
            /* pmname()+4: skip past "were" prefix */
            : pmname(mons[pm], Mgender(mon)).slice(4)}.`);

    set_mon_data(mon, mons[pm]);
    if (mon.msleeping || !mon.mcanmove) { /* helpless() */
        /* transformation wakens and/or revitalizes */
        mon.msleeping = 0;
        mon.mfrozen = 0; /* not asleep or paralyzed */
        mon.mcanmove = 1;
    }
    /* regenerate by 1/4 of the lost hit points */
    healmon(mon, Math.trunc((mon.mhpmax - mon.mhp) / 4), 0);
    newsym(mon.mx, mon.my);
    mon_break_armor(mon, false);
    await possibly_unwield(mon, false);

    /* vision capability isn't changing so we don't call set_apparxy() to
       update mon's idea of where hero is; peaceful check is redundant */
    if (game.context.mon_moving && !mon.mpeaceful
        && onscary(mon.mux, mon.muy, mon)
        && monnear(mon, mon.mux, mon.muy))
        await monflee(mon, rn1(9, 2), true, true); /* 2..10 turns */
}
