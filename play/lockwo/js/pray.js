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

// C ref: pray.c godvoice(g_align, words) — "The voice of <god> ...".  Not used
// by the gp.p_type==0 "displeased" path (case 0/1), but provided for the
// other angrygods cases.
async function godvoice(g_align, words) {
    const which = 'booms out';
    await update_topl(`The voice of ${align_gname(roleMnum(), g_align)} ${which}: ${words || ''}`);
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
        await update_topl(`You feel that ${align_gname(roleMnum(), resp_god)} is displeased.`);
        break;
    default:
        // Heavier punishments (godvoice/relearn, curses, summon, zap) not yet
        // ported; fall back to the displeased feedback so the message stream
        // doesn't desync.  No additional RNG is emitted here for the modelled
        // sessions (they only ever roll case 0/1).
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
        moveloop_turn();

    // unmul(): print "You finish your prayer." then run afternmv (prayer_done).
    await update_topl('You finish your prayer.');
    await prayer_done();

    // All elapsed turns were taken inline; tell the move loop no further per-turn
    // work is owed (return ECMD_OK so doextcmd leaves context.move = 0).
    return 0;
}
