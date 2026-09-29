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
// The replay data does not capture this; conservatively assume false.
function Protection_from_shape_changers() {
    /* C youprop.h:125 —
     *   (HProtection_from_shape_changers || EProtection_from_shape_changers)
     * with no blocker.  Read off the numerically-keyed uprops the rest of this
     * port uses rather than the old unconditional `return false`; no corpus
     * hero has the property, so this is the same answer arrived at honestly —
     * and new_were()'s first guard now reads real state. */
    const p = game.u?.uprops?.[PROT_FROM_SHAPE_CHANGERS];
    return !!p && !!((p.intrinsic | 0) || (p.extrinsic | 0));
}

// C ref: youprop.h:125 — Deaf property (HDeaf || EDeaf || u.uroleplay.deaf).
// No deafness in corpus; default false.
function Deaf() {
    const u = game.u || {};
    const dp = u.uprops?.[DEAF];
    const HDeaf = (dp?.intrinsic | 0) || (u.HDeaf | 0);
    const EDeaf = dp?.extrinsic | 0;
    const roleplayDeaf = !!(u.uroleplay && u.uroleplay.deaf);
    return (HDeaf !== 0) || (EDeaf !== 0) || roleplayDeaf;
}

/* KNOWN GAP — unported helper stubs.
 *
 * CORRECTED 2026-08-17.  This block used to open "These throw, and that is
 * currently safe ONLY because were_change() has no call site at all".  Both
 * halves were false: js/mklev.js:13240 m_calcdistress() calls were_change(),
 * and the You_hear/wake_nearto/Soundeffect throws HALTED the scored run on
 * seed4500-knight-coverage the moment a flying were-creature reached the howl
 * branch (screens 1076/1814).  All three are ported below — You_hear against
 * C pline.c, wake_nearto delegating to js/mklev.js's real body, Soundeffect as
 * the audio-only no-op the rest of the tree already spells.  new_were() is
 * ported below and is likewise reached.
 *
 * Reachability, measured 2026-08-09 against the C record corpus the replay
 * sweep reads for this function (500 C records): exactly ONE record carries a
 * non-empty recorded-RNG list.  So no CAPTURED C call reaches
 * new_were()/You_hear()/wake_nearto()/Soundeffect().
 *
 * DO NOT READ THAT AS THE PAYOFF — corrected 2026-08-09.  This comment
 * previously reported the capture-corpus count as the measured payoff ("ONE
 * were creature ... consumes one rn2 and does nothing").  The captures are a
 * DERIVED instrument; frozen/score.sh compares against sessions/, so the C
 * session traces are the scoring oracle, and they record SIX draws across
 * THREE sessions, not one across one:
 *     seed0364-healer-quest-hellfill  rn2(50)=47, rn2(50)=22   (were.c:17)
 *     seed0372-valkyrie-quest-tour    rn2(50)=17, rn2(50)=17   (were.c:17)
 *     seed0800-wiz-grand-tour         rn2(50)=21, rn2(50)=44   (were.c:17)
 * This is the same capture-vs-trace asymmetry that hid rndorcname()'s reversed
 * draw order; when the two disagree, the trace wins.  (All six are rn2(50) —
 * i.e. !night() && moonphase != FULL_MOON — and all six are non-zero, so C
 * transformed no monster on any of them: the divergence is six MISSING draws,
 * with no state change attached.)
 *
 * Even so the odds are only ~1/30..1/50 per were per turn, so "no captured call
 * transforms" is a corpus fact, not a proof that none ever will.
 *
 * C-side RNG on the gapped paths: new_were() itself draws NO RNG directly, but
 * its callees mon_break_armor() and possibly_unwield() do (were.c:117-118); so a
 * best-effort no-throw new_were() would still under-consume the stream, and the
 * honest fix is a real port, not a silent stub. */

/* C were.c:51-99 new_were(struct monst *mon) — flip a lycanthrope between its
 * human and beast forms.
 *
 * REACHABILITY, corrected.  The block above says this is unreachable because
 * m_calcdistress() is not ported and mcalcdistress() has no callers.  Both
 * halves are now false: js/mklev.js:12745 m_calcdistress() calls were_change()
 * and js/fastforward.js:370 fmon_mcalcmove() calls mcalcdistress(), so the
 * throw was a live HALT.  Measured on seed0116 at HEAD: the scored run stopped
 * at 125 of 127 frames here, and rng-prefix-match shows NO value divergence
 * before it (prefixMatch 12523/12562, JS stream simply ends) — i.e. C took the
 * same !rn2(50) branch on the same draw and transformed the same monster.  C's
 * next leaf is rn2(12) @ mcalcmove(mon.c:1164).
 *
 * RNG: new_were() draws nothing itself.  Its callees mon_break_armor() and
 * possibly_unwield() are RNG-free for a monster carrying no armor or weapon,
 * and the trailing monflee(rn1(9,2)) is gated on mon_moving && !mpeaceful &&
 * onscary(mux,muy) && monnear(...) — the seed0116 were is nowhere near the
 * hero, which is why C draws nothing here either. */
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

/* C were.c:141-190 were_summon(ptr, yours, visible, genbuf) — "were-creature
 * (even you) summons a horde".  makemon() is async in this port
 * (js/mklev.js:4911), so were_summon must be too; its callers already await
 * (mhitu.js's summonmu is the only wired caller today, per js/mhitu.js:5191's
 * KNOWN GAP note, and it is not yet reached from a live path either).
 *
 * `visible` arrives as the reconstructor's `{ value }` pseudo-struct for a
 * captured `int *` (js/struct_reconstructor.js STRUCT_FIELDS['int *']); C's
 * unconditional `*visible = 0;` is `visible.value = 0`.
 *
 * `genbuf` arrives as a plain JS string (capture_arg_string), not an
 * object — a JS string is immutable, so this port CANNOT write the chosen
 * generic name back through it the way C's Strcpy(genbuf, "rat") does. That
 * is a harness limitation, not a skipped C behaviour: no `args_after` group
 * is captured for this fn's genbuf (checked against the two board records at
 * brief time), so the mutation is unobserved by the replay oracle either way.
 * The `!= null` guard mirrors C's pointer-non-NULL test (genbuf's CONTENT,
 * e.g. an empty string, must not be read as "no buffer"). */
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

/* C ref: nethack-c/src/were.c:8-45 were_change() — transform a were-creature
 * when needed.  If the monster is human-form were and not protected, RNG-based
 * chance to shift.  If non-human form, always shift back to human.
 * Side effects: gw.were_changes counter, audible howl, wake_nearto.
 *
 * KNOWN GAP — NOT WIRED, deliberately (investigated 2026-08-09).  C has two call
 * sites:
 *   nethack-c/src/mon.c:1180  m_calcdistress(mtmp)  — once per monster per turn,
 *                             reached from mcalcdistress() at allmain.c:269.
 *   nethack-c/src/uhitm.c:3068 — the AD_CANCEL mhitm arm, gated on
 *                             !magr->mcan && !rn2(10) && is_were(pd).
 * Neither exists on the JS live path.  m_calcdistress() is not ported at all;
 * js/mklev.js:9440 mcalcdistress() is exported but has ZERO callers and its body
 * calls an undefined `m_calcdistress` (js/mklev.js:9445 — the only mention of
 * that name in js/), so it would raise a ReferenceError if wired as-is.  The JS
 * per-turn head (js/fastforward.js:280 fmon_mcalcmove and its three call sites
 * at :913, :949, :1073) jumps straight from movemon to allmain.c:274, skipping
 * allmain.c:268-269 (`gw.were_changes = 0L; mcalcdistress();`).
 * ALL THREE re-verified against HEAD d71bd00a on 2026-08-09 — still blocked.
 *
 * Wiring were_change therefore means porting m_calcdistress (mon_regen +
 * decide_to_shapeshift + the mblinded/mfrozen/mfleetim countdowns + the
 * mmove==0/minliquid guard) and inserting mcalcdistress() into the per-turn head
 * — a turn-loop change affecting all 60 sessions, and one that touches
 * js/mklev.js and js/fastforward.js, not this file.
 *
 * C-side RNG on this gap: C draws exactly one rn2 per is_were() monster per turn
 * that JS does not draw — six such draws across seed0364/seed0372/seed0800 (the
 * corrected count; see the KNOWN GAP note above, and note the earlier "observed
 * once, in seed0372" was a capture-corpus artefact).
 *
 * Payoff is still nil TODAY, for a reason that outranks the count: all three
 * sessions already fail, and every one of the six draws sits downstream of its
 * own session's first divergence, so by Cardinal Rule 3 they are cascade, not
 * the bug, and closing them flips nothing.  Indices below are frozen/score.sh's
 * own RNG-call step (its firstDivergence.step axis; 1-based over steps[].rng
 * with the ^toplin/^botlx markers dropped) measured at HEAD d71bd00a, with the
 * session keystroke step in parentheses:
 *     seed0364  first divergence 4775 (step 174)  vs 34294 (220), 34343 (222)
 *     seed0372  first divergence 3757 (step 173)  vs 15387 (177), 15445 (184)
 *     seed0800  first divergence 2619 (step 109)  vs 34097 (164), 49270 (186)
 * Both axes agree (seed0372 is the tightest: only 4 keystrokes, but still
 * after).  Do not use tools/first-divergence.mjs's "leaf" index for this
 * comparison without re-deriving it — it is 0-based over a DIFFERENT stream,
 * and a naive regex over the session JSON silently misaligns by dropping
 * non-rn* draws such as `d(2,4)`.
 *
 * Do not re-litigate the count; re-check the first divergences instead.  Needs
 * its own per-turn monster-distress instrument (Gate 0) before anyone tries. */
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
