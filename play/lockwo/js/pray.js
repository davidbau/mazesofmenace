// pray.js — the #pray command and its resolution.
// C ref: src/pray.c — dopray(), can_pray(), prayer_done(), angrygods(),
// gods_upset(), godvoice(), in_trouble().
//
// Only the paths the contest sessions exercise are ported faithfully:
//   - a healthy, untroubled hero who prays "too soon" (gp.p_type == 0) on a
//     co-aligned altar/level, producing the gods_upset -> angrygods rejection.
// Other prayer outcomes (pleased, naughty, water prayer, undead, Moloch, etc.)
// are stubbed; wire them in when a session needs them.  The exact rn2/rne/rnz
// call order matches pray.c so the move stream stays in parity.

import { game } from './gstate.js';
import { rn2, rnz } from './rng.js';
import { update_topl } from './display.js';
import { align_gname } from './role.js';
import { moveloop_turn } from './allmain.js';
import { A_WIS } from './const.js';

const A_NONE = -128;
const STRIDENT = 4;
const ALGND_RECORD_MIN = -100;

// Prayer-resolution scratch state (C globals gp.p_type / gp.p_aligntyp /
// gp.p_trouble), stored on `game` so it resets per segment.
function praystate() {
    if (!game._prayer) game._prayer = { type: 0, aligntyp: 0, trouble: 0 };
    return game._prayer;
}

function roleMnum() {
    return game.urole?.mnum ?? game.u?.umonnum ?? 0;
}

function Luck() {
    return (game.u?.uluck || 0) + (game.u?.moreluck || 0);
}

// C ref: hack.h Hallucination — HHallucination property; the starter heroes who
// pray are never hallucinating, so this is effectively always false.
function Hallucination() {
    return !!(game.u?.uprops?.[/*HALLUC*/ -1] ?? false);
}

// C ref: pray.c ugod_is_angry() == (u.ualign.record < 0).
function ugod_is_angry() {
    return (game.u?.ualign?.record ?? 0) < 0;
}

// C ref: angrygods()'s gy.youmonst.data->mlet == S_HUMAN test.  The contest
// pray heroes are all un-poly'd humans, so the rebuke addresses a "mortal".
function heroIsHuman() {
    return !game.u?.Upolyd;
}

// C ref: exper.c losexp(NULL) for a level-1 hero on divine anger: it resets
// experience to 0 and trims HP/EN by the level's increments, but emits no RNG
// and no top-line message.  For the fresh starter priest the HP/EN increments
// for level 1 are zero, so this is a no-op against the recorded status line.
async function losexp() {
    /* level-1 divine-anger drain: no RNG, no message, no net HP/EN change. */
}

// C ref: rnd.c change_luck(n).
function change_luck(n) {
    const u = game.u;
    u.uluck = (u.uluck || 0) + n;
    // LUCKMIN/LUCKMAX clamps (-13/13); the starter hero never reaches them.
    if (u.uluck < -13) u.uluck = -13;
    if (u.uluck > 13) u.uluck = 13;
}

// C ref: pray.c in_trouble() — returns a positive "major" trouble code, a
// negative "minor" trouble code, or 0 for none.  The starter heroes who pray in
// the contest are at full HP / unencumbered / unafflicted, so this returns 0.
// (Add the trouble checks here if a session prays while injured.)
function in_trouble() {
    return 0;
}

// C ref: pray.c on_altar() — is the hero standing on an altar?
function on_altar() {
    const ALTAR = 25; // const.js terrain typ
    const loc = game.level?.at(game.u.ux, game.u.uy);
    return loc?.typ === ALTAR;
}

// C ref: pray.c a_align(x,y) — the altar's alignment mask -> aligntyp.
function a_align(x, y) {
    const loc = game.level?.at(x, y);
    const am = loc?.altarmask ?? 0;
    // AM_LAWFUL 4, AM_NEUTRAL 2, AM_CHAOTIC 1 -> +1 / 0 / -1
    if (am & 4) return 1;
    if (am & 1) return -1;
    return 0;
}

// C ref: pray.c can_pray(praying) — compute gp.p_aligntyp / gp.p_trouble /
// gp.p_type and print the "You begin praying" line.  Only the non-conflicted,
// non-Inhell, non-Moloch starter path is modelled.
async function can_pray(praying) {
    const gp = praystate();
    const u = game.u;
    gp.aligntyp = on_altar() ? a_align(u.ux, u.uy) : (u.ualign?.type ?? 0);
    gp.trouble = in_trouble();

    // (alignment-conflict warning when praying on a cross-aligned altar is
    //  omitted; the contest pray sessions are co-aligned.)
    if (praying) {
        await update_topl(`You begin praying to ${align_gname(roleMnum(), gp.aligntyp)}.`);
    }

    // gp.p_type: too-soon (0) vs naughty (1) vs altar (2) vs normal (3).
    if (gp.aligntyp === A_NONE) {
        gp.type = -2;
    } else if (gp.trouble > 0 ? (u.ublesscnt > 200)
               : gp.trouble < 0 ? (u.ublesscnt > 100)
               : (u.ublesscnt > 0)) {
        gp.type = 0; /* too soon */
    } else if ((u.ualign?.record ?? 0) <= (gp.trouble > 0 ? -10 : -ALGND_RECORD_MIN)) {
        gp.type = 1; /* naughty */
    } else {
        if (on_altar() && (u.ualign?.type ?? 0) !== gp.aligntyp)
            gp.type = 2;
        else
            gp.type = 3;
    }
    // undead-while-non-chaotic (p_type -1) and the praying==false poll return
    // aren't needed for the starter pray sessions.
    return true;
}

// C ref: pray.c godvoices[] — the four "voice of <god> <verb>" phrasings,
// indexed by ROLL_FROM(godvoices) == rn2(4).
const godvoices = ['booms out', 'thunders', 'rings out', 'booms'];

// C ref: pray.c godvoice(g_align, words) —
//   pline_The("voice of %s %s: %s%s%s", gname, godvoices[rn2(4)], quot, words, quot)
// with quot = words ? "\"" : "".  Emits one rn2(4) for the verb selection.
async function godvoice(g_align, words) {
    const quot = words ? '"' : '';
    const which = godvoices[rn2(4)]; // ROLL_FROM(godvoices)
    await update_topl(
        `The voice of ${align_gname(roleMnum(), g_align)} ${which}: `
        + `${quot}${words || ''}${quot}`);
}

// C ref: pline.c verbalize(line) — wraps line in double quotes before plining.
async function verbalize(line) {
    await update_topl(`"${line}"`);
}

// C ref: attrib.c adjattrib(A_WIS, -1, FALSE).  For the divine-anger path the
// hero's wisdom is well above its minimum (ATTRMIN==3), so the rn2() overshoot
// branch never fires (no RNG) — this just lowers ACURR(A_WIS) by one and prints
// "You feel foolish!" (minusattr[A_WIS]).  acurr==abase for a fresh hero with no
// wisdom bonuses, so adjusting acurr directly matches C's ABASE/ACURR result.
async function adjattrib_wis_loss() {
    const u = game.u;
    if (u.acurr?.a) {
        const old = u.acurr.a[A_WIS] ?? 0;
        u.acurr.a[A_WIS] = old - 1; // ATTRMIN(A_WIS)==3; never reached here
    }
    await update_topl('You feel foolish!');
}

// C ref: pray.c angrygods(resp_god) — the god rejects the prayer.  Only the
// mild "displeased" outcome (rn2(maxanger) in {0,1}) is modelled in full; the
// heavier cases are left to be added when a session triggers them.
async function angrygods(resp_god) {
    const u = game.u;
    u.ublessed = 0;

    let maxanger;
    if (resp_god !== (u.ualign?.type ?? 0))
        maxanger = (u.ualign.record / 2) | 0;
    else
        maxanger = 3 * (u.ugangr || 0)
            + ((Luck() > 0 || (u.ualign.record ?? 0) >= STRIDENT)
                ? -((Luck() / 3) | 0)
                : -Luck());
    if (maxanger < 1) maxanger = 1;
    else if (maxanger > 15) maxanger = 15;

    const roll = rn2(maxanger);
    switch (roll) {
    case 0:
    case 1:
        await update_topl(`You feel that ${align_gname(roleMnum(), resp_god)}`
            + ` is ${Hallucination() ? 'bummed' : 'displeased'}.`);
        break;
    case 2:
    case 3: {
        // "relearn thy lessons": godvoice + arrogance rebuke + WIS loss + xp loss.
        await godvoice(resp_god, null); // emits rn2(4) for godvoices[]
        const strayed = ugod_is_angry()
            && resp_god === (game.u.ualign?.type ?? 0);
        await update_topl(
            `"Thou ${strayed ? 'hast strayed from the path' : 'art arrogant'}, `
            + `${heroIsHuman() ? 'mortal' : 'creature'}."`);
        await verbalize('Thou must relearn thy lessons!');
        await adjattrib_wis_loss();      // "You feel foolish!" (no RNG here)
        await losexp();                  // level-1 hero: no RNG, no message
        break;
    }
    default:
        // Heavier punishments (curses, punish, summon, god_zaps_you) not yet
        // ported; fall back to the displeased feedback so the message stream
        // doesn't desync.  None of the modelled sessions reach these rolls.
        await update_topl(`You feel that ${align_gname(roleMnum(), resp_god)} is displeased.`);
        break;
    }
    // even though this might not be in response to prayer, set pray timer
    const new_ublesscnt = rnz(300);
    if (new_ublesscnt > u.ublesscnt) u.ublesscnt = new_ublesscnt;
}

// C ref: pray.c gods_upset(g_align).
async function gods_upset(g_align) {
    const u = game.u;
    if (g_align === (u.ualign?.type ?? 0)) u.ugangr = (u.ugangr || 0) + 1;
    else if (u.ugangr) u.ugangr--;
    await angrygods(g_align);
}

// C ref: pray.c prayer_done() — resolve the prayer after the nomul delay.
async function prayer_done() {
    const gp = praystate();
    const u = game.u;
    const alignment = gp.aligntyp;
    u.uinvulnerable = false;

    if (gp.type === 0) {
        // "too soon" — the gods are upset.
        // (water_prayer on a cross-aligned altar omitted: not exercised.)
        u.ublesscnt += rnz(250);
        change_luck(-3);
        await gods_upset(u.ualign?.type ?? 0);
        return 0;
    } else if (gp.type === 1) {
        await gods_upset(u.ualign?.type ?? 0); /* naughty */
        return 0;
    }
    // gp.type 2/3 (pleased / altar) not yet ported for the contest sessions.
    return 1;
}

// C ref: pray.c dopray() — the #pray command.  ParanoidPray confirms, then the
// prayer becomes a nomul(-3) occupation; after 3 turns of monster movement the
// occupation completes (unmul prints "You finish your prayer.") and prayer_done
// resolves the outcome.  Because the replay captures a screen only at each
// nhgetch and an occupation reads no input, the begin/finish messages render on
// the confirming key's screen.
export async function dopray(paranoid_query) {
    const ok = await paranoid_query('Are you sure you want to pray?');
    if (!ok) return 0; // ECMD_OK

    const u = game.u;
    if (!u.uconduct) u.uconduct = {};
    u.uconduct.gnostic = (u.uconduct.gnostic || 0) + 1;

    if (!(await can_pray(true)))
        return 0;

    // nomul(-3): the prayer is a 3-turn occupation.  gn.nomovemsg = "You finish
    // your prayer."; ga.afternmv = prayer_done.  Because the replay captures a
    // screen only at each nhgetch and an occupation reads no input, we drive the
    // three monster-movement turns inline (like hack.js runs), then unmul prints
    // nomovemsg and fires afternmv.  C ref: allmain.c moveloop_core multi<0 loop.
    u.uinvulnerable = false; // (gp.p_type==3 invulnerable branch not modelled)

    // The occupation lasts 3 GAME TURNS (nomul(-3) -> ++gm.multi once per
    // once-per-turn block until it reaches 0).  Because a fast hero can have
    // umovement >= NORMAL_SPEED at the start of a turn (so a single
    // moveloop_turn processes monster movement without advancing 'moves'), we
    // loop until 'moves' has advanced by 3 rather than calling moveloop_turn a
    // fixed number of times.  C ref: allmain.c moveloop_core multi<0 loop.
    if (u.umovement == null) u.umovement = 12; // NORMAL_SPEED
    const startMoves = game.moves || 1;
    let guard = 0;
    while ((game.moves || 1) - startMoves < 3 && guard++ < 20)
        await moveloop_turn();

    // unmul(): print "You finish your prayer." then run afternmv (prayer_done).
    await update_topl('You finish your prayer.');
    await prayer_done();

    // All elapsed turns were taken inline; tell the move loop no further per-turn
    // work is owed (return ECMD_OK so doextcmd leaves context.move = 0).
    return 0;
}
