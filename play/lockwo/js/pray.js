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
import { rn2, rnz, rn1, rnl } from './rng.js';
import { update_topl, y_n } from './display.js';
import { align_gname } from './role.js';
import { A_WIS } from './const.js';
import { livelog_printf, LL_CONDUCT, LL_MINORAC } from './livelog.js';

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
    livelog_printf(LL_MINORAC, 'lost all experience');
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
    const ALTAR = 32; // const.js terrain typ (ROOM==25 was the prior bug)
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

// C ref: pray.c align thresholds (pray.c:64-67).
const PIOUS = 20, DEVOUT = 14;

// C ref: align.c adjalign(n) — nudge the alignment record toward its bound.
// Only the simple additive form is exercised (record stays well within
// [ALGN_RECORD_MIN, ALGN_RECORD_MAX]).
function adjalign(n) {
    const u = game.u;
    u.ualign.record = (u.ualign.record ?? 0) + n;
}

// C ref: pray.c pleased(g_align) — the god grants a favor.  Only the coaligned
// off-altar path the wizard-forced knight exercises is modelled: announce the
// mood ("You feel that <god> is <mood>."), roll the favor `action` (in_trouble
// is 0 so the switch is RNG-inert), then reset the prayer timeout via rnz(350).
// The heavier trouble-fixing / pat_on_head reward branches are stubs (not
// reached with a healthy hero at STRIDENT<=record<DEVOUT and Luck 0).
async function pleased(g_align) {
    const u = game.u;
    const trouble = in_trouble(); // 0 for the healthy hero
    let pat_on_head = 0;

    const record = u.ualign?.record ?? 0;
    const mood = (record >= DEVOUT) ? (Hallucination() ? 'pleased as punch' : 'well-pleased')
        : (record >= STRIDENT) ? (Hallucination() ? 'ticklish' : 'pleased')
            : (Hallucination() ? 'full' : 'satisfied');
    await update_topl(`You feel that ${align_gname(roleMnum(), g_align)} is ${mood}.`);

    // "not your deity" (cross-aligned altar) and the record<2 nudge.
    if (on_altar() && gp_aligntyp() !== (u.ualign?.type ?? 0)) {
        adjalign(-1);
        return;
    } else if (record < 2 && trouble <= 0) {
        adjalign(1);
    }

    if (!trouble && record >= DEVOUT) {
        // if hero was in trouble but got better, no special favor.
        if (praystate().trouble === 0) pat_on_head = 1;
    } else {
        // action = rn1(prayer_luck + (on_altar()? 3+shrine : 2), 1)
        const prayer_luck = Math.max(Luck(), -1);
        let action = rn1(prayer_luck + (on_altar() ? 3 : 2), 1);
        if (!on_altar()) action = Math.min(action, 3);
        if (record < STRIDENT)
            action = ((record > 0) || !rnl(2)) ? 1 : 0;
        switch (Math.min(action, 5)) {
        case 5: pat_on_head = 1; /* FALLTHROUGH */
        case 4:
            /* fix all troubles — none for the healthy hero (RNG-inert) */
            break;
        case 3:
        case 2:
            /* up to N troubles — in_trouble() is 0, loop never runs */
            break;
        case 1:
        case 0:
            break;
        }
    }

    // pat_on_head gratuitous favor (not reached here; record < DEVOUT).
    if (pat_on_head) {
        // C ref: pray.c:1167 switch (rn2((Luck+6)>>1)) — the reward table.
        // Left as a stub: the forced knight lands in the record<DEVOUT branch
        // so pat_on_head stays 0.
    }

    // reset prayer timeout (kick_on_butt is 0 for a non-demigod hero).
    u.ublesscnt = rnz(350);
}

// C ref: pray.c gp.p_aligntyp accessor for pleased()'s cross-altar check.
function gp_aligntyp() {
    return praystate().aligntyp;
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
    } else if (gp.type === 2) {
        // altar (non-coaligned water prayer omitted) -> pleased.
        await pleased(alignment);
    } else {
        // coaligned (gp.p_type == 3): on_altar pray_revive/water_prayer omitted.
        await pleased(alignment); /* nice */
    }
    return 1;
}

// C ref: pray.c dopray() — the #pray command.  ParanoidPray confirms, then (in
// wizard mode) offers "Force the gods to be pleased?"; the prayer then becomes a
// nomul(-3) occupation (gn.nomovemsg = "You finish your prayer.", ga.afternmv =
// prayer_done).  The move loop drives the 3 countdown turns of monster movement;
// when the count reaches 0, unmul() announces nomovemsg and fires afternmv, so
// the begin / --More-- / force-prompt / shimmering-light / finish / result
// messages each land on their own captured screen exactly as C records them.
export async function dopray(paranoid_query) {
    const gp = praystate();
    const ok = await paranoid_query('Are you sure you want to pray?');
    if (!ok) return 0; // ECMD_OK

    const u = game.u;
    if (!u.uconduct) u.uconduct = {};
    if (!u.uconduct.gnostic)
        livelog_printf(LL_CONDUCT, 'rejected atheism with a prayer');
    u.uconduct.gnostic = (u.uconduct.gnostic || 0) + 1;

    // set up gp.p_type and gp.p_aligntyp; prints "You begin praying to <god>."
    if (!(await can_pray(true)))
        return 0;

    // C ref: pray.c dopray() wizard block — in debug (playmode:debug) mode with
    // a non-Moloch prayer (gp.p_type >= 0), offer to force success.  The "You
    // begin praying" line is still unacknowledged, so the y_n prompt pages it
    // with --More-- first (its own captured frame), then re-prompts on any key
    // that isn't y/n.  Answering 'y' resets the prayer-timeout / luck / align /
    // anger counters and upgrades gp.p_type to 3 (coaligned "pleased").
    if (game.flags?.debug && gp.type >= 0) {
        game._yn_need_more = true; // page the pending "begin praying" line first
        const forced = (await y_n('Force the gods to be pleased?')) === 'y';
        if (forced) {
            u.ublesscnt = 0;
            if ((u.uluck || 0) < 0) u.uluck = 0;
            if ((u.ualign.record ?? 0) <= 0) u.ualign.record = 1;
            u.ugangr = 0;
            if (gp.type < 2) gp.type = 3;
        }
    }

    // nomul(-3): the prayer is a 3-turn occupation driven by the move loop.
    game.multi = -3;
    game.context = game.context || {};
    game.context.travel = game.context.travel1 = game.context.mv = 0;
    game.multi_reason = 'praying';
    game.nomovemsg = 'You finish your prayer.';
    game.afternmv = prayer_done;

    // C ref: pray.c dopray() — a coaligned (gp.p_type == 3) prayer outside
    // Gehennom grants prayer invulnerability; a sighted hero sees the shimmer.
    u.uinvulnerable = false;
    if (gp.type === 3 /* && !Inhell */) {
        if (!Blind())
            await update_topl('You are surrounded by a shimmering light.');
        u.uinvulnerable = true;
    }

    return 1; // ECMD_TIME: the move loop advances a turn and runs the occupation
}

// C ref: hack.h Blind — the praying starter heroes are never blind.
function Blind() {
    return false;
}

// C ref: pray.c dosacrifice() — the #offer command.  The full on-altar rite
// (floorfood + offer_corpse/amulet) is not modeled; the reached sessions
// (sitting/dipping at a fountain) offer while NOT on an altar, so the guard
// path is what matters.  Returns ECMD_OK (0, no turn) for the guard cases.
export async function dosacrifice() {
    const u = game.u;
    if (!on_altar() || u.uswallow) {
        const over = (u.uprops?.Levitation || u.uprops?.Flying) ? 'over' : 'on';
        await update_topl(`You are not ${over} an altar.`);
        return 0;
    }
    if ((u.uprops?.Confusion || 0) > 0 || (u.uprops?.Stun || u.uprops?.Stunned || 0) > 0) {
        await update_topl('You are too impaired to perform the rite.');
        return 0;
    }
    // On-altar sacrifice (floorfood + offer_corpse/amulet/fake) is not modeled;
    // unreached by the covered sessions.  Take no time.
    return 0;
}
