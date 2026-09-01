// were.js — lycanthropes.
// C ref: src/were.c
//
// were_change() draws every turn boundary for every werecreature on the
// level (the rn2 whose size depends on day/night and moon phase), so a
// level with a werejackal on it desyncs immediately without this.

import { game } from './gstate.js';
import { rn1, rn2, rnd } from './rng.js';
import { pline } from './display.js';
import { Norep, set_msg_xy, You_hear } from './pline.js';
import { Amonnam, Monnam, pmname } from './do_name.js';
import { canseemon, canspotmon } from './display.js';
import { newsym } from './display.js';
import { helpless } from './monst.js';
import { healmon, wake_nearto } from './mon.js';
import { is_human, resists_drli } from './mondata.js';
import { MFLAGS, PMNAMES } from './monst_data.js';
import { night } from './calendar.js';
import { Deaf, Hallucination, Protection_from_shape_changers }
    from './youprop.js';
import { BOLT_LIM, FROMFORM, FULL_MOON, NON_PM, NO_MM_FLAGS }
    from './const.js';

/* include/mondata.h:96 is_were() */
export const is_were = (ptr) => (ptr.mflags2 & MFLAGS.M2_WERE) !== 0;

// src/were.c:140 were_summon(). Return the counts and generic species name
// which summonmu() uses for its visible and unseen feedback.
export async function were_summon(ptr, yours) {
    let visible = 0;
    let total = 0;
    let generic = 'creature';

    if (Protection_from_shape_changers() && !yours)
        return { total, visible, generic };

    const [{ makemon }, { tamedog }] = await Promise.all([
        import('./makemon.js'), import('./dog.js'),
    ]);
    for (let i = rnd(5); i > 0; --i) {
        let typ = -1;
        switch (ptr.pmidx) {
        case PMNAMES.PM_WERERAT:
        case PMNAMES.PM_HUMAN_WERERAT:
            typ = rn2(3) ? PMNAMES.PM_SEWER_RAT
                         : rn2(3) ? PMNAMES.PM_GIANT_RAT
                                  : PMNAMES.PM_RABID_RAT;
            generic = 'rat';
            break;
        case PMNAMES.PM_WEREJACKAL:
        case PMNAMES.PM_HUMAN_WEREJACKAL:
            typ = rn2(7) ? PMNAMES.PM_JACKAL
                         : rn2(3) ? PMNAMES.PM_COYOTE : PMNAMES.PM_FOX;
            generic = 'jackal';
            break;
        case PMNAMES.PM_WEREWOLF:
        case PMNAMES.PM_HUMAN_WEREWOLF:
            typ = rn2(5) ? PMNAMES.PM_WOLF
                         : rn2(2) ? PMNAMES.PM_WARG
                                  : PMNAMES.PM_WINTER_WOLF;
            generic = 'wolf';
            break;
        default:
            continue;
        }
        const helper = makemon(game.mons[typ], game.u.ux, game.u.uy,
                               NO_MM_FLAGS);
        if (helper) {
            /* makemon.c:1471 prints this before returning. makemon() is
               synchronous here, so its async caller supplies the message. */
            if (canspotmon(helper)) {
                set_msg_xy(helper.mx, helper.my);
                const dx = helper.mx - game.u.ux;
                const dy = helper.my - game.u.uy;
                const nearby = Math.abs(dx) <= 1 && Math.abs(dy) <= 1;
                const close = dx * dx + dy * dy <= BOLT_LIM * BOLT_LIM;
                await Norep(`${Amonnam(helper)} suddenly appears${
                    nearby ? ' next to you' : close ? ' close by' : ''}!`);
            }
            total++;
            if (canseemon(helper))
                visible++;
            if (yours)
                await tamedog(helper, null, false);
        }
    }
    return { total, visible, generic };
}

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

// src/were.c:69 were_beastie(). Map each helper family back to the
// corresponding were-beast. This is also used by the cannibalism check.
export function were_beastie(pm) {
    const P = PMNAMES;
    switch (pm) {
    case P.PM_WERERAT:
    case P.PM_SEWER_RAT:
    case P.PM_GIANT_RAT:
    case P.PM_RABID_RAT:
        return P.PM_WERERAT;
    case P.PM_WEREJACKAL:
    case P.PM_JACKAL:
    case P.PM_FOX:
    case P.PM_COYOTE:
        return P.PM_WEREJACKAL;
    case P.PM_WEREWOLF:
    case P.PM_WOLF:
    case P.PM_WARG:
    case P.PM_WINTER_WOLF:
    case P.PM_WINTER_WOLF_CUB:
        return P.PM_WEREWOLF;
    default:
        return NON_PM;
    }
}

// src/were.c:232 set_ulycn(). Catching or curing lycanthropy changes the
// hero's innate drain resistance without changing the current body.
export function set_ulycn(which) {
    game.u.ulycn = which;
    const intr = (game.u.intrinsic ||= {});
    intr.HDrain_resistance = (intr.HDrain_resistance || 0) & ~FROMFORM;
    if (resists_drli(game.youmonst))
        intr.HDrain_resistance |= FROMFORM;
    /* src/polyself.c:set_uasmon() clears this after rebuilding the
       form-derived properties which set_ulycn() has just refreshed. */
    game.were_changes = 0;
}

// src/were.c:187 you_were(). Hostile adjacent monsters suppress an
// uncontrolled change, but the outer turn loop has already spent its roll.
export async function you_were() {
    const u = game.u;
    const unchanging = !!(u.intrinsic?.HUnchanging || u.uprops?.UNCHANGING);
    if (unchanging || u.umonnum === u.ulycn)
        return;

    const controlled = !!(u.intrinsic?.HPolymorph_control
                           || u.uprops?.POLYMORPH_CONTROL)
                       && !(u.intrinsic?.HStun || u.uprops?.STUNNED)
                       && !(await import('./youprop.js')).Unaware();
    if (controlled) {
        const beast = pmname(game.mons[u.ulycn], 2).slice(4);
        const [{ paranoid_ynq }, options] = await Promise.all([
            import('./cmd.js'), import('./options.js'),
        ]);
        if (await paranoid_ynq(
            !!(options.paranoia_bits() & options.PARANOID_WERECHANGE),
            `Do you want to change into a ${beast}?`, false) !== 'y') {
            return;
        }
    } else {
        const { monster_nearby } = await import('./hack.js');
        if (monster_nearby())
            return;
    }
    game.were_changes = (game.were_changes || 0) + 1;
    const { polymon } = await import('./polyself.js');
    await polymon(u.ulycn, { allowSexChange: false });
}

// src/were.c:215 you_unwere(). Holy water can cure the infection and, when
// the current body is a werebeast, either return the hero to normal or leave
// a blocked form with a fresh timer.
export async function you_unwere(purify) {
    const u = game.u;
    const unchanging = !!(u.intrinsic?.HUnchanging || u.uprops?.UNCHANGING);
    const controlled = !!(u.intrinsic?.HPolymorph_control
                           || u.uprops?.POLYMORPH_CONTROL)
                       && !(u.intrinsic?.HStun || u.uprops?.STUNNED)
                       && !(await import('./youprop.js')).Unaware();

    if (purify) {
        const { You_feel } = await import('./pline.js');
        await You_feel('purified.');
        set_ulycn(NON_PM);
    }

    const inWereForm = is_were(game.youmonst.data);
    const { monster_nearby } = await import('./hack.js');
    const nearby = inWereForm && monster_nearby();
    let remain = false;
    if (inWereForm && !unchanging && !nearby && controlled) {
        const [{ paranoid_ynq }, options] = await Promise.all([
            import('./cmd.js'), import('./options.js'),
        ]);
        remain = await paranoid_ynq(
            !!(options.paranoia_bits() & options.PARANOID_WERECHANGE),
            'Remain in beast form?', false) === 'y';
    }

    if (inWereForm && !unchanging && !nearby
        && (!controlled || !remain)) {
        const { rehumanize } = await import('./polyself.js');
        await rehumanize();
    } else if (inWereForm && !u.mtimedone) {
        u.mtimedone = rn1(200, 200);
    }
}

// src/were.c:96 new_were() — transform between human and beast form.
export async function new_were(mon) {
    if (Protection_from_shape_changers()
        && is_human(mon.data || game.mons[mon.mnum])) {
        return;
    }
    const pm = counter_were(mon.mnum);
    if (pm < 0)
        return;

    if (canseemon(mon) && !Hallucination())
        await pline(`${Monnam(mon)} changes into a ${
            is_human(game.mons[pm]) ? 'human'
                : pmname(game.mons[pm], 2).slice(4) /* skip "were" */}.`);

    /* set_mon_data() */
    mon.mnum = pm;
    mon.data = game.mons[pm];
    if (helpless(mon)) {
        mon.msleeping = 0;
        mon.mfrozen = 0;
        mon.mcanmove = 1;
    }
    /* regenerate by 1/4 of the lost hit points */
    healmon(mon, Math.trunc((mon.mhpmax - mon.mhp) / 4), 0);
    newsym(mon.mx, mon.my);
    const [{ mon_break_armor }, { possibly_unwield }]
        = await Promise.all([import('./worn.js'), import('./weapon.js')]);
    await mon_break_armor(mon, false);
    await possibly_unwield(mon, false);

    if (game.context?.mon_moving && !mon.mpeaceful) {
        const { onscary, monnear, monflee } = await import('./monmove.js');
        if (onscary(mon.mux, mon.muy, mon)
            && monnear(mon, mon.mux, mon.muy)) {
            await monflee(mon, rn1(9, 2), true, true);
        }
    }
}

// src/were.c:9 were_change() — maybe shift form; the rn2 size depends on
// night() and the moon phase.
export async function were_change(mon) {
    const ptr = game.mons[mon.mnum];
    if (!is_were(ptr))
        return;

    if (is_human(ptr)) {
        if (!Protection_from_shape_changers()
            && !rn2(night()
                    ? (game.flags?.moonphase === FULL_MOON ? 3 : 30)
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
    } else if (!rn2(30) || Protection_from_shape_changers()) {
        await new_were(mon); /* change back into human form */
        game.were_changes = (game.were_changes || 0) + 1;
    }
}
