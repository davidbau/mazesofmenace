// were.js -- lycanthropes changing form.
// C ref: were.c -- were_change(), counter_were(), were_beastie(), new_were().
// C ref: were.c were_summon(), you_were(), you_unwere(), set_ulycn().

import { game } from './gstate.js';
import { rn2, rn1, rnd } from './rng.js';
import * as MM from './monsters.js';
import { mons, LOW_PM } from './monsters.js';
import { NON_PM, FULL_MOON, DEAF, HALLUC, HALLUC_RES, I_SPECIAL,
         PROT_FROM_SHAPE_CHANGERS } from './const.js';
import { night } from './calendar.js';
import { canseemon, newsym, pline, You_hear } from './display.js';
import { wake_nearto, healmon, monnear } from './mon.js';
import { is_were, is_human, monsndx, set_mon_data } from './mondata.js';
import { Monnam, pmname, Mgender } from './do_name.js';
import { possibly_unwield } from './weapon.js';
import { mon_break_armor } from './worn.js';
import { onscary, monflee } from './monmove.js';
import { Protection_from_shape_changers, Deaf, Hallucination } from './youprop.js';
import { makemon, makemon_flush_msg } from './makemon.js';
import { NO_MM_FLAGS } from './const.js';
import { tamedog } from './dog.js';
import { Polymorph_control, Stunned, Unaware, Unchanging } from './youprop.js';
import { NEUTRAL, ParanoidWerechange } from './const.js';
import { an } from './objnam.js';
import { paranoid_query } from './cmd.js';
import { monster_nearby } from './hack.js';
import { polymon, rehumanize, set_uasmon } from './polyself.js';
import { You_feel } from './display.js';

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
    await mon_break_armor(mon, false);
    await possibly_unwield(mon, false);

    /* vision capability isn't changing so we don't call set_apparxy() to
       update mon's idea of where hero is; peaceful check is redundant */
    if (game.context.mon_moving && !mon.mpeaceful
        && onscary(mon.mux, mon.muy, mon)
        && monnear(mon, mon.mux, mon.muy))
        await monflee(mon, rn1(9, 2), true, true); /* 2..10 turns */
}

// C ref: were.c were_summon()
/* were-creature (even you) summons a horde; result is
   {total, visible, genbuf} where C has *visible and genbuf out-params */
export async function were_summon(
    ptr,
    yours,
    out) /* out.visible: number of visible helpers created; out.genbuf */ {
    let i, typ;
    const pm = monsndx(ptr);
    let mtmp;
    let total = 0;

    out.visible = 0;
    if (Protection_from_shape_changers() && !yours)
        return 0;
    for (i = rnd(5); i > 0; i--) {
        switch (pm) {
        case MM.PM_WERERAT:
        case MM.PM_HUMAN_WERERAT:
            typ = rn2(3) ? MM.PM_SEWER_RAT
                         : rn2(3) ? MM.PM_GIANT_RAT : MM.PM_RABID_RAT;
            if (out.genbuf !== undefined)
                out.genbuf = "rat";
            break;
        case MM.PM_WEREJACKAL:
        case MM.PM_HUMAN_WEREJACKAL:
            typ = rn2(7) ? MM.PM_JACKAL : rn2(3) ? MM.PM_COYOTE : MM.PM_FOX;
            if (out.genbuf !== undefined)
                out.genbuf = "jackal";
            break;
        case MM.PM_WEREWOLF:
        case MM.PM_HUMAN_WEREWOLF:
            typ = rn2(5) ? MM.PM_WOLF : rn2(2) ? MM.PM_WARG : MM.PM_WINTER_WOLF;
            if (out.genbuf !== undefined)
                out.genbuf = "wolf";
            break;
        default:
            continue;
        }
        game.makemon_want_msg = true; /* see makemon()'s Norep() comment */
        try {
            mtmp = makemon(mons[typ], game.u.ux, game.u.uy, NO_MM_FLAGS);
        } finally {
            game.makemon_want_msg = false;
        }
        await makemon_flush_msg();
        if (mtmp) {
            total++;
            if (canseemon(mtmp))
                out.visible += 1;
        }
        if (yours && mtmp)
            await tamedog(mtmp, null, false);
    }
    return total;
}

// C ref: were.c you_were()
export async function you_were() {
    const u = game.u;
    let qbuf;
    const controllable_poly = Polymorph_control() && !(Stunned() || Unaware());

    if (Unchanging() || u.umonnum === u.ulycn)
        return;
    if (controllable_poly) {
        /* `+4' => skip "were" prefix to get name of beast */
        qbuf = `Do you want to change into ${
            an(mons[u.ulycn].pmnames[NEUTRAL].slice(4))}?`;
        if (!await paranoid_query(ParanoidWerechange(), qbuf))
            return;
    } else if (monster_nearby()) {
        return;
    }
    game.were_changes = (game.were_changes || 0) + 1;
    await polymon(u.ulycn);
}

// C ref: were.c you_unwere()
export async function you_unwere(purify) {
    const u = game.u;
    const controllable_poly = Polymorph_control() && !(Stunned() || Unaware());

    if (purify) {
        await You_feel("purified.");
        set_ulycn(NON_PM); /* cure lycanthropy */
    }
    if (!Unchanging() && is_were(game.youmonst.data)
        && !monster_nearby()
        && (!controllable_poly
            || !await paranoid_query(ParanoidWerechange(), "Remain in beast form?")))
        await rehumanize();
    else if (is_were(game.youmonst.data) && !u.mtimedone)
        u.mtimedone = rn1(200, 200); /* 40% of initial were change */
}

// C ref: were.c set_ulycn()
/* lycanthropy is being caught or cured, but no shape change is involved */
export function set_ulycn(which) {
    game.u.ulycn = which;
    /* add or remove lycanthrope's innate intrinsics (Drain_resistance) */
    set_uasmon();
}
