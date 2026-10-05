// @ts-nocheck
// were.js — Lycanthrope transformation and were-creature functions.
// C ref: were.c

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { night, monster_nearby } from './allmain.js';
import { canseemon } from './display.js';
import { FULL_MOON, HALLUC, HALLUC_RES, PROT_FROM_SHAPE_CHANGERS,
    POLYMORPH_CONTROL, STUNNED, UNCHANGING, PARANOID_WERECHANGE, DEAF, NEUTRAL } from './const.js';
import { rn1, rnd } from './rng.js';
import { pline, newsym, You_hear } from './display.js';
import { set_uasmon, rehumanize } from './polyself.js';
import { unconscious } from './pickup.js';
import { is_fainted } from './eat.js';
import { paranoid_query } from './paranoid.js';
import { an } from './objnam.js';
import { set_mon_data, permonstTemplate, monPmname, monflee, onscary, monnear } from './makemon.js';
import { polymon } from './polyself.js';
import { healmon, wake_nearto as wake_nearto_mklev, makemon } from './mklev.js';
import { Monnam } from './mcastu.js';
import { mon_break_armor } from './trap.js';
import { possibly_unwield } from './dogmove.js';
import { tamedog } from './dog.js';
import {
    PM_WEREWOLF, PM_WEREJACKAL, PM_WERERAT,
    PM_JACKAL, PM_FOX, PM_COYOTE,
    PM_WOLF, PM_WARG, PM_WINTER_WOLF,
    PM_SEWER_RAT, PM_GIANT_RAT, PM_RABID_RAT,
} from './pm.generated.js';

/* C ref: nethack-c/include/monsym.h — NON_PM (no such permonst). */
const NON_PM = -1;

// C mondata.h — monster property flags
const M2_WERE = 0x00000004;
const M2_HUMAN = 0x00000008;

// C ref: mondata.h:is_were(ptr) — M2_WERE flag on permonst.mflags2
export function is_were(ptr) {
    return !!ptr && ((ptr.mflags2 | 0) & M2_WERE) !== 0;
}

// C ref: mondata.h:is_human(ptr) — M2_HUMAN flag on permonst.mflags2
function is_human(ptr) {
    return (ptr.mflags2 & M2_HUMAN) !== 0;
}

/* C were.c:213-239 — finish a were-form timeout or cure lycanthropy.
 *
 * The timeout caller (allmain.js) awaits this function because rehumanize()
 * owns the C polyman() message/page sequence.  This uses the numeric property slots and C's Unaware definition; named uprops or
 * a truthy `flags.unaware` would change the controlled-poly prompt decision.
 */
export async function you_unwere(purify) {
    const g = game;
    const u = g.u || {};
    const up = u.uprops || {};
    const control = !!((up[POLYMORPH_CONTROL]?.intrinsic | 0)
                    || (up[POLYMORPH_CONTROL]?.extrinsic | 0));
    const stunned = !!(up[STUNNED]?.intrinsic | 0);
    const unaware = ((g.multi | 0) < 0)
        && (!!unconscious() || !!is_fainted());
    const controllable_poly = control && !stunned && !unaware;
    const paranoiaBits = g.flags?.paranoia_bits | 0;
    const paranoid = !!(paranoiaBits & PARANOID_WERECHANGE);

    if (purify) {
        await pline('You feel purified.');
        set_ulycn(NON_PM); /* C: cure lycanthropy, then refresh form data. */
    }

    if (!((up[UNCHANGING]?.intrinsic | 0) || (up[UNCHANGING]?.extrinsic | 0))
        && is_were(g.youmonst?.data)
        && !monster_nearby()
        && (!controllable_poly
            || !(await paranoid_query(paranoid, 'Remain in beast form?')))) {
        await rehumanize();
    } else if (is_were(g.youmonst?.data) && !(u.mtimedone | 0)) {
        u.mtimedone = rn1(200, 200);
    }
}

/* C were.c:192-211 you_were() — enter the hero's lycanthrope form.  Keep
 * this async because polymon() owns the message/page sequence and the
 * resulting state transition must complete before the potion effect returns. */
export async function you_were() {
    const g = game;
    const u = g.u || {};
    const up = u.uprops || {};
    const control = !!((up[POLYMORPH_CONTROL]?.intrinsic | 0)
                    || (up[POLYMORPH_CONTROL]?.extrinsic | 0));
    const stunned = !!(up[STUNNED]?.intrinsic | 0);
    const unaware = ((g.multi | 0) < 0)
        && (!!unconscious() || !!is_fainted());
    const controllable_poly = control && !stunned && !unaware;

    if ((up[UNCHANGING]?.intrinsic | 0) || (up[UNCHANGING]?.extrinsic | 0)
        || (u.umonnum | 0) === (u.ulycn | 0))
        return;
    if (controllable_poly) {
        const paranoid = !!(g.flags?.paranoia_bits & PARANOID_WERECHANGE);
        // C uses the neutral species name and skips its four-letter prefix.
        const beast = monPmname(u.ulycn | 0, NEUTRAL).slice(4);
        const prompt = `Do you want to change into ${an(beast)}?`;
        const yes = await paranoid_query(paranoid, prompt);
        if (!yes)
            return;
    } else if (monster_nearby()) {
        return;
    }
    g.gw = g.gw || {};
    g.gw.were_changes = (g.gw.were_changes | 0) + 1;
    await polymon(u.ulycn | 0);
}

/* C were.c:235-239 — update lycanthropy and the hero's active permonst data.
 * set_uasmon() also applies the intrinsic drain-resistance change associated
 * with switching between the human and were forms. */
export function set_ulycn(which) {
    game.u.ulycn = which | 0;
    set_uasmon();
}

// C ref: youprop.h:125 — Protection_from_shape_changers property.
function Protection_from_shape_changers() {
    const p = game.u?.uprops?.[PROT_FROM_SHAPE_CHANGERS];
    return !!p && !!((p.intrinsic | 0) || (p.extrinsic | 0));
}

// C ref: youprop.h:125 — Deaf property (HDeaf || EDeaf || u.uroleplay.deaf).
function Deaf() {
    const u = game.u || {};
    const dp = u.uprops?.[DEAF];
    const HDeaf = (dp?.intrinsic | 0) || (u.HDeaf | 0);
    const EDeaf = dp?.extrinsic | 0;
    const roleplayDeaf = !!(u.uroleplay && u.uroleplay.deaf);
    return (HDeaf !== 0) || (EDeaf !== 0) || roleplayDeaf;
}


export async function new_were(mon) {
    /* C:57-59 — protection from shape changers keeps a human-form were human;
     * a critter-form one always reverts. */
    if (Protection_from_shape_changers() && is_human(mon.data))
        return;

    const pm = counter_were(monsndx(mon.data));
    if (pm < 0 /* LOW_PM */) {
        /* C:63-66 impossible("unknown lycanthrope %s."); this port has no
         * impossible() channel here, and C returns without transforming. */
        return;
    }
    const newdata = permonstTemplate(pm);

    /* C:68-72 — "%s changes into a %s."; pmname()+4 skips the "were" prefix. */
    if (canseemon(mon) && !Hallucination()) {
        const nm = is_human(newdata) ? 'human'
            : String(monPmname(pm, Mgender(mon)) || '').slice(4);
        pline(`${Monnam(mon)} changes into a ${nm}.`);
    }

    set_mon_data(mon, newdata);
    /* C:75-80 — "transformation wakens and/or revitalizes". */
    if (mon.msleeping || !mon.mcanmove) {
        mon.msleeping = 0;
        mon.mfrozen = 0;
        mon.mcanmove = 1;
    }
    /* C:82 — regenerate by 1/4 of the lost hit points. */
    healmon(mon, Math.trunc(((mon.mhpmax | 0) - (mon.mhp | 0)) / 4), 0);
    newsym(mon.mx, mon.my);
    await mon_break_armor(mon, false);
    await possibly_unwield(mon, false);

    /* C:87-92 — "vision capability isn't changing so we don't call
     * set_apparxy(); peaceful check is redundant".  svc.context.mon_moving has
     * no writer in this port; game._inMovemonBlock is the live signal for the
     * same predicate. */
    if (game._inMovemonBlock && !mon.mpeaceful
        && onscary(mon.mux, mon.muy, mon)
        && monnear(mon, mon.mux, mon.muy))
        await monflee(mon, rn1(9, 2), true, true); /* 2..10 turns */
}
/* C were.c:101-121 counter_were(pm) — the beast/human form pairing.  The six
 * indices are resolved BY NAME out of js/makemon_pmnames.json (rows 15/21/91
 * are the beast forms "werejackal"/"werewolf"/"wererat", rows 261/262/263 the
 * human forms "wererat"/"werejackal"/"werewolf", matching monsters.h's order:
 * werejackal:220, werewolf:267, wererat:911, then human wererat:2609,
 * werejackal:2618, werewolf:2627).  js/pm.generated.js has no PM_HUMAN_*
 * spellings and its beast-form values (15/21/91) agree with the json. */
const PM_HUMAN_WERERAT = 261, PM_HUMAN_WEREJACKAL = 262, PM_HUMAN_WEREWOLF = 263;
export function counter_were(pm) {
    switch (pm) {
    case PM_WEREWOLF:          return PM_HUMAN_WEREWOLF;
    case PM_HUMAN_WEREWOLF:    return PM_WEREWOLF;
    case PM_WEREJACKAL:        return PM_HUMAN_WEREJACKAL;
    case PM_HUMAN_WEREJACKAL:  return PM_WEREJACKAL;
    case PM_WERERAT:           return PM_HUMAN_WERERAT;
    case PM_HUMAN_WERERAT:     return PM_WERERAT;
    default:                   return NON_PM;
    }
}
/* C monst.h Mgender(mon) — (mon)->female ? FEMALE : MALE (do_name.h 1 / 0). */
function Mgender(mtmp) { return mtmp.female ? 1 : 0; }
/* C youprop.h Hallucination — (HHallucination || EHallucination) && !Halluc_resistance;
 * read off the numerically-keyed uprops the rest of this port uses. */
function Hallucination() {
    const p = game.u?.uprops?.[HALLUC];
    const r = game.u?.uprops?.[HALLUC_RES];
    const onres = !!r && !!((r.intrinsic | 0) || (r.extrinsic | 0));
    return !!p && !!((p.intrinsic | 0) || (p.extrinsic | 0)) && !onres;
}

/* C pline.c You_hear(line, ...) —
 *     if ((Deaf && !Unaware) || !flags.acoustics) return;
 *     YouPrefix(tmp, Underwater ? "You barely hear " : Unaware
 *                    ? "You dream that you hear " : "You hear ", line);
 *     vpline(strcat(tmp, line), the_args);
 * The acoustics read is `?? true` because C's optlist.h defaults it On and
 * nothing in js/ writes it at init (option-default-lint MISSING-INIT); this is
 * the same spelling js/cmd.js:245 and js/dokick.js:244 already use.  This
 * replaces a throwing stub — `wake_nearto` and `Soundeffect` below were the
 * same, and were_change() DOES reach all three (js/mklev.js m_calcdistress). */
/* Imported from js/display.js.  This copy had the fullest guard in the tree and
 * was still wrong in two ways: it invented `Unaware = (u.usleep || u.uunaware)`,
 * dropping C's `gm.multi < 0` conjunct entirely, and its Deaf() (:51) reads the
 * writer-less u.uprops[DEAF] slot. */

/* C mon.c wake_nearto(x, y, distance) — wake_nearto_core(x, y, distance, FALSE).
 * js/mklev.js:10777 is the tree's single real body (this file already imports
 * healmon from that module, so the edge exists). */
function wake_nearto(x, y, distance) {
    wake_nearto_mklev(x, y, distance);
}

/* C sounds.h Soundeffect(se, vol) — audio only; it touches no game state and
 * draws no RNG, so a no-op IS the port.  Same reading as js/dig.js:817 and
 * js/mklev.js:12401, which already spell it that way. */
function Soundeffect(senum, vol) { /* audio only — no state, no RNG */ }

/* C ref: nethack-c/src/mon.c monsndx(ptr) — `ptr - &mons[0]`, i.e. the permonst's
 * index in mons[].  The JS permonst carries that index as `pmidx` (the replay
 * reconstructor's name) or `mndx`; js/dog.js:248 uses the same two-name lookup. */
function monsndx(ptr) {
    if (!ptr) return NON_PM;
    return (ptr.pmidx != null ? ptr.pmidx
            : ptr.mndx != null ? ptr.mndx
            : NON_PM) | 0;
}

export async function were_summon(ptr, yours, visible, genbuf) {
    const pm = monsndx(ptr);
    let typ;
    let total = 0;

    visible.value = 0;
    if (Protection_from_shape_changers() && !yours)
        return 0;
    for (let i = rnd(5); i > 0; i--) {
        switch (pm) {
        case PM_WERERAT:
        case PM_HUMAN_WERERAT:
            typ = rn2(3) ? PM_SEWER_RAT
                         : rn2(3) ? PM_GIANT_RAT : PM_RABID_RAT;
            if (genbuf != null) { /* Strcpy(genbuf, "rat") — see header note */ }
            break;
        case PM_WEREJACKAL:
        case PM_HUMAN_WEREJACKAL:
            typ = rn2(7) ? PM_JACKAL : rn2(3) ? PM_COYOTE : PM_FOX;
            if (genbuf != null) { /* Strcpy(genbuf, "jackal") — see header note */ }
            break;
        case PM_WEREWOLF:
        case PM_HUMAN_WEREWOLF:
            typ = rn2(5) ? PM_WOLF : rn2(2) ? PM_WARG : PM_WINTER_WOLF;
            if (genbuf != null) { /* Strcpy(genbuf, "wolf") — see header note */ }
            break;
        default:
            continue;
        }
        const mtmp = await makemon(typ, game.u.ux, game.u.uy, 0 /* NO_MM_FLAGS */);
        if (mtmp) {
            total++;
            if (canseemon(mtmp))
                visible.value += 1;
        }
        if (yours && mtmp)
            await tamedog(mtmp, null, false);
    }
    return total;
}

export async function were_change(mon) {
    if (!is_were(mon.data))
        return;

    if (is_human(mon.data)) {
        if (!Protection_from_shape_changers()
            && !rn2(night() ? (game.flags.moonphase === FULL_MOON ? 3 : 30)
                            : (game.flags.moonphase === FULL_MOON ? 10 : 50))) {
            await new_were(mon); /* change into animal form */
            game.gw.were_changes++;
            if (!Deaf() && !canseemon(mon)) {
                let howler;

                /* C were.c:23-33 — monsndx() is read AFTER new_were(), so these
                 * are the BEAST-form indices.  The literals here were 16 and 20,
                 * which are neither: js/makemon_mons.json's M2_WERE rows are
                 * mndx 15 (werejackal), 21 (werewolf), 91 (wererat) for the beast
                 * forms and 261/262/263 for the human forms, and js/pm.generated.js
                 * agrees (PM_WEREJACKAL = 15, PM_WEREWOLF = 21).  16 and 20 named
                 * unrelated monsters, so both howls were unreachable and any real
                 * werewolf/werejackal fell to the `default:` no-howl arm.
                 * Message-only: no RNG on any arm of this switch. */
                switch (monsndx(mon.data)) {
                case PM_WEREWOLF:
                    howler = "wolf";
                    break;
                case PM_WEREJACKAL:
                    howler = "jackal";
                    break;
                default:
                    howler = null;
                    break;
                }
                if (howler) {
                    Soundeffect(0, 50); /* se_canine_howl = 0 (stub) */
                    You_hear("a %s howling at the moon.", howler);
                    wake_nearto(mon.mx, mon.my, 4 * 4);
                }
            }
        }
    } else if (!rn2(30) || Protection_from_shape_changers()) {
        await new_were(mon); /* change back into human form */
        game.gw.were_changes++;
    }
}
