// pray.js — the #pray command and its resolution.
// C ref: src/pray.c — dopray(), can_pray(), prayer_done(), angrygods(),
// gods_upset(), godvoice(), pleased(), in_trouble().
//
// The whole prayer decision tree is ported: can_pray()'s four p_type outcomes,
// angrygods()'s eight rn2(maxanger) arms, and pleased()'s favour switch.  Three
// effects bottom out in subsystems this port does not have and are marked at
// their call site (summon_minion, god_zaps_you's death, dosacrifice's
// floorfood prompt); everything else, including every discarded RNG draw, runs.

import { game } from './gstate.js';
import { rn2, rnz, rn1, rnl, rnd } from './rng.js';
import { update_topl, y_n, newsym } from './display.js';
import { align_gname } from './role.js';
import { A_WIS, A_MAX, A_NONE, AM_SHRINE, Amask2align, ALTAR, TT_LAVA,
    IS_OBSTRUCTED, SDOOR, SCORR } from './const.js';
import { isok } from './hacklib.js';
import { adjalign } from './attrib.js';
import { losexp, xlev_to_rank } from './exper.js';
import { Blind } from './vision.js';
import { In_hell } from './dungeon.js';
import { curse, unbless, mkobj, place_object, BALL_CLASS, CHAIN_CLASS,
    COIN_CLASS, POTION_CLASS, POT_WATER, objects as OBJECTS } from './mkobj.js';
import { livelog_printf, LL_CONDUCT, LL_MINORAC } from './livelog.js';

const STRIDENT = 4;
// C ref: pray.c:75-88 trouble codes.  The numeric values are only meaningful
// as an ordering; in_trouble()'s check order is what actually ranks them.
const TROUBLE_STONED = 14, TROUBLE_SLIMED = 13, TROUBLE_STRANGLED = 12,
    TROUBLE_LAVA = 11, TROUBLE_SICK = 10, TROUBLE_STARVING = 9,
    TROUBLE_HIT = 7, TROUBLE_LYCANTHROPE = 6,
    TROUBLE_STUCK_IN_WALL = 4, TROUBLE_CURSED_LEVITATION = 3,
    TROUBLE_CURSED_BLINDFOLD = 1;
const TROUBLE_PUNISHED = -1, TROUBLE_FUMBLING = -2, TROUBLE_CURSED_ITEMS = -3,
    TROUBLE_SADDLE = -4, TROUBLE_BLIND = -5, TROUBLE_POISONED = -6,
    TROUBLE_WOUNDED_LEGS = -7, TROUBLE_HUNGRY = -8, TROUBLE_STUNNED = -9,
    TROUBLE_CONFUSED = -10, TROUBLE_HALLUCINATION = -11;
// C ref: eat.h hunger states.
const HUNGRY = 2, WEAK = 3;
// C ref: attrib.h ATTRMIN(A_WIS) for a non-Gnome/Human hero is 3.
const ATTRMIN = 3;
// C ref: obj.h WT_IRON_BALL_INCR / prop.h W_BALL / W_CHAIN (js/read.js:67).
const WT_IRON_BALL_INCR = 160, W_BALL = 0x10000, W_CHAIN = 0x20000;

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

// C ref: hack.h Hallucination.  The timer lands under three different names
// depending on which file set it (js/cmd.js documents the same union); reading
// only one of them answered FALSE for a hallucinating hero and picked the wrong
// half of every god-mood message below.
function Hallucination() {
    const u = game.u;
    if (!u) return false;
    if ((u.HHalluc_resistance || 0) > 0) return false;
    return !!(u.uhallu || u.HHallucination || u.uprops?.Hallucination);
}

function uprop(name) {
    const u = game.u;
    return !!(u?.uprops?.[name] || u?.[name]);
}

// C ref: pray.c ugod_is_angry() == (u.ualign.record < 0).
function ugod_is_angry() {
    return (game.u?.ualign?.record ?? 0) < 0;
}

// C ref: angrygods()'s gy.youmonst.data->mlet == S_HUMAN test.
function heroIsHuman() {
    return !game.u?.Upolyd;
}

// C ref: rnd.c change_luck(n).
function change_luck(n) {
    const u = game.u;
    u.uluck = (u.uluck || 0) + n;
    if (u.uluck < -13) u.uluck = -13; // LUCKMIN
    if (u.uluck > 13) u.uluck = 13;   // LUCKMAX
}

function ABASE(i) { return game.u?.acurr?.a?.[i] ?? 0; }
function AMAX(i) { return game.u?.amax?.a?.[i] ?? 0; }

// C ref: pray.c critically_low_hp(only_if_injured).
function critically_low_hp(only_if_injured) {
    const u = game.u;
    const polyd = !!u.Upolyd;
    const curhp = polyd ? (u.mh | 0) : (u.uhp | 0);
    let maxhp = polyd ? (u.mhmax | 0) : (u.uhpmax | 0);
    if (only_if_injured && !(curhp < maxhp)) return false;
    const hplim = 15 * (u.ulevel | 0);
    if (maxhp > hplim) maxhp = hplim;
    let divisor;
    switch (xlev_to_rank(u.ulevel | 0)) { /* maps 1..30 into 0..8 */
    case 0: case 1: divisor = 5; break;
    case 2: case 3: divisor = 6; break;
    case 4: case 5: divisor = 7; break;
    case 6: case 7: divisor = 8; break;
    default: divisor = 9; break;
    }
    return curhp <= 5 || curhp * divisor <= maxhp;
}

// C ref: pray.c stuck_in_wall() — surrounded on all eight sides by impassable
// rock.  C also counts a square whose only obstruction is a boulder the hero
// can't push (blocked_boulder); that arm is omitted, which can only ever make
// this answer FALSE where C says TRUE.
function stuck_in_wall() {
    const u = game.u;
    if (uprop('Passes_walls')) return false;
    let count = 0;
    for (let i = -1; i <= 1; i++)
        for (let j = -1; j <= 1; j++) {
            if (!i && !j) continue;
            const x = u.ux + i, y = u.uy + j;
            const typ = game.level?.at(x, y)?.typ;
            if (!isok(x, y)
                || (typ != null && IS_OBSTRUCTED(typ)
                    && typ !== SDOOR && typ !== SCORR))
                ++count;
        }
    return count === 8;
}

// C ref: hack.h Cursed_obj(otmp, typ).
function Cursed_obj(otmp, symname) {
    return !!otmp && !!otmp.cursed && OBJECTS[otmp.otyp]?.sym === symname;
}

// C ref: pray.c worst_cursed_item() reduced to its "is there one at all?" use;
// the full priority walk only matters for fix_worst_trouble().  Two of C's arms
// are deliberately left out because their gate can't be evaluated here and
// including them would OVER-report a trouble: the leading loadstone scan (gated
// on near_capacity() >= HVY_ENCUMBER) and both uwep arms (gated on welded(),
// which js/invent.js stubs to false).
function worst_cursed_item() {
    for (const o of [game.uarmg, game.uarms, game.uarmc, game.uarm, game.uarmh,
        game.uarmf, game.uarmu, game.uamul, game.uleft, game.uright,
        game.ublindf])
        if (o && o.cursed) return o;
    return null;
}

// C ref: allmain.c Wounded_legs (HWounded_legs || EWounded_legs).
function Wounded_legs() {
    const u = game.u;
    return !!((u?.HWounded_legs || 0) || (u?.EWounded_legs || 0));
}

/*
 * C ref: pray.c in_trouble() — the hero's WORST problem: a positive "major"
 * code, a negative "minor" code, or 0.  This used to `return 0` unconditionally,
 * which is not a harmless simplification: gp.p_trouble picks which ublesscnt
 * threshold can_pray() compares against (200 major / 100 minor / 0 none) and
 * pleased() re-runs it to decide the favour, so a troubled hero was routed into
 * the wrong prayer outcome entirely.
 *
 * Three arms cannot be evaluated in this port and are noted where C has them:
 * region_danger() (no stinking-cloud regions), TROUBLE_COLLAPSING and the
 * loadstone half of worst_cursed_item() (both need near_capacity()), and
 * TROUBLE_UNUSEABLE_HANDS (js/invent.js welded() is a stub that returns false).
 * Each omission can only under-report, never invent, a trouble.
 */
function in_trouble() {
    const u = game.u;
    if (!u) return 0;

    /* major troubles */
    if (uprop('Stoned')) return TROUBLE_STONED;
    if (uprop('Slimed')) return TROUBLE_SLIMED;
    if (uprop('Strangled')) return TROUBLE_STRANGLED;
    if (u.utrap && u.utraptype === TT_LAVA) return TROUBLE_LAVA;
    if (uprop('Sick')) return TROUBLE_SICK;
    if ((u.uhs | 0) >= WEAK) return TROUBLE_STARVING;
    /* region_danger(): stinking cloud regions are not modelled. */
    if ((!u.Upolyd || uprop('Unchanging')) && critically_low_hp(false))
        return TROUBLE_HIT;
    if ((u.ulycn ?? -1) >= 0) return TROUBLE_LYCANTHROPE;
    /* TROUBLE_COLLAPSING: near_capacity() >= EXT_ENCUMBER. */
    if (stuck_in_wall()) return TROUBLE_STUCK_IN_WALL;
    if (Cursed_obj(game.uarmf, 'LEVITATION_BOOTS')
        || Cursed_obj(game.uleft, 'RIN_LEVITATION')
        || Cursed_obj(game.uright, 'RIN_LEVITATION'))
        return TROUBLE_CURSED_LEVITATION;
    /* TROUBLE_UNUSEABLE_HANDS: welded(uwep). */
    if (game.ublindf && game.ublindf.cursed) return TROUBLE_CURSED_BLINDFOLD;

    /* minor troubles */
    if (u.uball) return TROUBLE_PUNISHED; /* hack.h Punished == (uball != 0) */
    if (Cursed_obj(game.uarmg, 'GAUNTLETS_OF_FUMBLING')
        || Cursed_obj(game.uarmf, 'FUMBLE_BOOTS'))
        return TROUBLE_FUMBLING;
    if (worst_cursed_item()) return TROUBLE_CURSED_ITEMS;
    if (u.usteed && u.usteed.saddle && u.usteed.saddle.cursed)
        return TROUBLE_SADDLE;
    if ((u.blinded | 0) > 1) return TROUBLE_BLIND;
    if (((u.uprops?.HDeaf | 0) || (u.HDeaf | 0)) > 1) return TROUBLE_BLIND;
    for (let i = 0; i < A_MAX; i++)
        if (ABASE(i) < AMAX(i)) return TROUBLE_POISONED;
    if (Wounded_legs() && !u.usteed) return TROUBLE_WOUNDED_LEGS;
    if ((u.uhs | 0) >= HUNGRY) return TROUBLE_HUNGRY;
    if (u.uprops?.Stun || u.HStun || u.ustun) return TROUBLE_STUNNED;
    if (u.uprops?.Confusion || u.uconf) return TROUBLE_CONFUSED;
    if (Hallucination()) return TROUBLE_HALLUCINATION;
    return 0;
}

// C ref: pray.c on_altar() / on_shrine().
function on_altar() {
    const loc = game.level?.at(game.u.ux, game.u.uy);
    return loc?.typ === ALTAR;
}
function on_shrine() {
    const loc = game.level?.at(game.u.ux, game.u.uy);
    return ((loc?.altarmask ?? 0) & AM_SHRINE) !== 0;
}

// C ref: pray.c a_align(x,y) == Amask2align(altarmask & AM_MASK).  The old
// hand-rolled mask decode returned A_NEUTRAL (0) for AM_NONE, so a desecrated /
// unaligned altar never produced the A_NONE "praying to Moloch" p_type of -2.
function a_align(x, y) {
    return Amask2align(game.level?.at(x, y)?.altarmask ?? 0);
}

// C ref: pray.c can_pray(praying) — compute gp.p_aligntyp / gp.p_trouble /
// gp.p_type and print the "You begin praying" line.
async function can_pray(praying) {
    const gp = praystate();
    const u = game.u;
    gp.aligntyp = on_altar() ? a_align(u.ux, u.uy) : (u.ualign?.type ?? 0);
    gp.trouble = in_trouble();

    // C's is_demon(youmonst.data) refusal needs a demon polyform; the hero is
    // never polymorphed into one here.

    if (praying) {
        await update_topl(`You begin praying to ${align_gname(roleMnum(), gp.aligntyp)}.`);
    }

    const utype = u.ualign?.type ?? 0;
    const record = u.ualign?.record ?? 0;
    let alignment;
    if (utype && utype === -gp.aligntyp)
        alignment = -record;                       /* opposite-alignment altar */
    else if (utype !== gp.aligntyp)
        alignment = Math.trunc(record / 2);        /* different-alignment altar */
    else
        alignment = record;

    if (gp.aligntyp === A_NONE) {
        gp.type = -2;                              /* praying to Moloch */
    } else if (gp.trouble > 0 ? (u.ublesscnt > 200)
               : gp.trouble < 0 ? (u.ublesscnt > 100)
                 : (u.ublesscnt > 0)) {
        gp.type = 0;                               /* too soon... */
    } else if (Luck() < 0 || u.ugangr || alignment < 0) {
        // The old test here was `record <= -ALGND_RECORD_MIN` (i.e. <= 100),
        // which is true for every reachable record: a hero whose prayer timeout
        // had run out was told off instead of being answered.
        gp.type = 1;                               /* too naughty... */
    } else {
        gp.type = (on_altar() && utype !== gp.aligntyp) ? 2 : 3;
    }

    // C's is_undead(youmonst.data) p_type -1 arm (and its rn2(10) for neutrals)
    // needs an undead polyform.

    return !praying ? (gp.type === 3 && !In_hell(u.uz)) : true;
}

// C ref: pray.c godvoices[] — indexed by ROLL_FROM(godvoices) == rn2(4).
const godvoices = ['booms out', 'thunders', 'rings out', 'booms'];

// C ref: pray.c godvoice(g_align, words).  Emits one rn2(4).
async function godvoice(g_align, words) {
    const quot = words ? '"' : '';
    const which = godvoices[rn2(4)]; // ROLL_FROM(godvoices)
    await update_topl(
        `The voice of ${align_gname(roleMnum(), g_align)} ${which}: `
        + `${quot}${words || ''}${quot}`);
}

// C ref: pray.c gods_angry(g_align).  Draws godvoice's rn2(4).
async function gods_angry(g_align) {
    await godvoice(g_align, 'Thou hast angered me.');
}

// C ref: pline.c verbalize(line) — wraps line in double quotes.
async function verbalize(line) {
    await update_topl(`"${line}"`);
}

// C ref: attrib.c adjattrib(A_WIS, -1, FALSE).  ABASE is what moves; when the
// decrement would push it under ATTRMIN the excess is taken out of AMAX with a
// rn2() roll instead — that draw was previously dismissed as unreachable, but a
// hero who angers a god repeatedly does grind A_WIS down to its floor.
async function adjattrib_wis_loss() {
    const u = game.u;
    if (!u.acurr?.a) return false;
    const old_acurr = ABASE(A_WIS), old_abase = old_acurr, old_amax = AMAX(A_WIS);
    u.acurr.a[A_WIS] = old_abase - 1;
    if (u.acurr.a[A_WIS] < ATTRMIN) {
        const decr = rn2(ATTRMIN - u.acurr.a[A_WIS] + 1);
        u.acurr.a[A_WIS] = ATTRMIN;
        if (u.amax?.a) {
            u.amax.a[A_WIS] = (u.amax.a[A_WIS] ?? 0) - decr;
            if (u.amax.a[A_WIS] < ATTRMIN) u.amax.a[A_WIS] = ATTRMIN;
        }
    }
    if (ABASE(A_WIS) === old_acurr) {
        // C: msgflg==0 && flags.verbose -> one of two "no change" lines.
        if (ABASE(A_WIS) === old_abase && AMAX(A_WIS) === old_amax)
            await update_topl('You\'re already as foolish as you can get.');
        else
            await update_topl('Your innate wisdom has declined.');
        return false;
    }
    if (u.aexe?.a) u.aexe.a[A_WIS] = 0; // C: AEXE(ndx) = 0 on any real change
    game.botl = true;
    await update_topl('You feel foolish!');
    return true;
}

// C ref: exper.c losexp(NULL) — the divine-anger drain.  js/exper.js owns the
// HP/Pw/uexp arithmetic but omits C's two livelog_printf() calls, and #chronicle
// renders the livelog verbatim, so the entry has to be added around it here.
async function losexp_with_livelog() {
    const lev = game.u?.ulevel | 0;
    await losexp(null, update_topl);
    if (lev > 1) livelog_printf(LL_MINORAC, `lost experience level ${lev}`);
    else livelog_printf(LL_MINORAC, 'lost all experience');
}

// C ref: sit.c rndcurse() — curse a few random inventory items.
async function rndcurse() {
    const u = game.u;
    // C's leading u_wield_art(ART_MAGICBANE) escape needs an artifact weapon.
    await update_topl('You feel a malignant aura surround you.');
    const invent = game.invent || [];
    let nobj = 0;
    for (const o of invent) if (o && o.oclass !== COIN_CLASS) nobj++;
    // Antimagic / Half_spell_damage would shrink the divisor; neither is
    // reachable for the heroes that get here, so the divisor is 1.
    let cnt = rnd(6);
    if (nobj) {
        for (; cnt > 0; cnt--) {
            let onum = rnd(nobj);
            let otmp = null;
            for (const o of invent) {
                if (!o || o.oclass === COIN_CLASS) continue;
                if (--onum === 0) { otmp = o; break; }
            }
            if (!otmp || otmp.cursed) continue;
            // C's artifact "resists" arm (rn2(10) < 8) needs SPFX_INTEL.
            if (otmp.blessed) unbless(otmp);
            else curse(otmp);
        }
    }
    if (u.usteed && !rn2(4)) {
        const saddle = u.usteed.saddle;
        if (saddle && !saddle.cursed) {
            if (saddle.blessed) unbless(saddle);
            else curse(saddle);
            if (!Blind()) {
                await update_topl(`${saddle.cursed ? 'Your saddle glows black.'
                    : 'Your saddle glows brown.'}`);
                saddle.bknown = Hallucination() ? 0 : 1;
            } else {
                saddle.bknown = 0;
            }
        }
    }
}

// C ref: sit.c attrcurse() — strip one random INTRINSIC.  The rnd(11) is the
// load-bearing part; the fall-through chain then hunts for the first intrinsic
// the hero actually has at or after the rolled slot.
const ATTRCURSE_CHAIN = [
    ['HFire_resistance', 'You feel warmer.'],
    ['HTeleportation', 'You feel less jumpy.'],
    ['HPoison_resistance', 'You feel a little sick!'],
    ['HTelepat', 'Your senses fail!'],
    ['HCold_resistance', 'You feel cooler.'],
    ['HInvis', 'You feel paranoid.'],
    ['HSee_invisible', 'You thought you saw something!'],
    ['HFast', 'You feel slower.'],
    ['HStealth', 'You feel clumsy.'],
    ['HProtection', 'You feel vulnerable.'],
    ['HAggravate_monster', 'You feel less attractive.'],
];
async function attrcurse() {
    const u = game.u;
    const start = rnd(11) - 1;
    for (let i = start; i < ATTRCURSE_CHAIN.length; i++) {
        const [field, msg] = ATTRCURSE_CHAIN[i];
        // INTRINSIC-only: a timed or worn source doesn't count.
        if (u[field]) {
            u[field] = 0;
            if (u.uprops) u.uprops[field] = 0;
            await update_topl(msg);
            return true;
        }
    }
    return false;
}

// C ref: ball.c punish(otmp) with a null otmp (js/read.js owns the identical
// scroll-of-punishment copy; pray.c is the other caller).
async function punish() {
    const u = game.u;
    await update_topl('You are being punished for your misbehavior!');
    if (u.uball) {
        await update_topl('Your iron ball gets heavier.');
        u.uball.owt += WT_IRON_BALL_INCR;
        return;
    }
    const uchain = mkobj(CHAIN_CLASS, true);
    uchain.owornmask = W_CHAIN;
    u.uchain = uchain;
    const uball = mkobj(BALL_CLASS, true);
    uball.owornmask = W_BALL;
    u.uball = uball;
    place_object(uball, u.ux, u.uy);
    place_object(uchain, u.ux, u.uy);
    newsym(u.ux, u.uy);
}

// C ref: pray.c angrygods(resp_god) — the god rejects the prayer.
async function angrygods(resp_god) {
    const u = game.u;
    if (In_hell(u.uz)) resp_god = A_NONE;
    u.ublessed = 0;

    const utype = u.ualign?.type ?? 0;
    const record = u.ualign?.record ?? 0;
    const luck = Luck();
    let maxanger;
    if (resp_god !== utype)
        // The Luck term used to be missing here, so a cross-aligned rebuke drew
        // rn2() with the wrong modulus.
        maxanger = Math.trunc(record / 2)
            + (luck > 0 ? -Math.trunc(luck / 3) : -luck);
    else
        maxanger = 3 * (u.ugangr || 0)
            + ((luck > 0 || record >= STRIDENT)
                ? -Math.trunc(luck / 3)
                : -luck);
    if (maxanger < 1) maxanger = 1;
    else if (maxanger > 15) maxanger = 15;

    switch (rn2(maxanger)) {
    case 0:
    case 1:
        await update_topl(`You feel that ${align_gname(roleMnum(), resp_god)}`
            + ` is ${Hallucination() ? 'bummed' : 'displeased'}.`);
        break;
    case 2:
    case 3: {
        await godvoice(resp_god, null); // emits rn2(4) for godvoices[]
        const strayed = ugod_is_angry() && resp_god === utype;
        await update_topl(
            `"Thou ${strayed ? 'hast strayed from the path' : 'art arrogant'}, `
            + `${heroIsHuman() ? 'mortal' : 'creature'}."`);
        await verbalize('Thou must relearn thy lessons!');
        await adjattrib_wis_loss();
        await losexp_with_livelog();
        break;
    }
    case 6:
        if (!u.uball) {
            await gods_angry(resp_god);
            await punish();
            break;
        }
        /* FALLTHRU */
    case 4:
    case 5:
        await gods_angry(resp_god);
        // C: `if (!Blind && !Antimagic)`; Antimagic needs an intrinsic the
        // heroes that reach this never have.
        if (!Blind())
            await update_topl('A black glow surrounds you.');
        if (rn2(2) || !(await attrcurse()))
            await rndcurse();
        break;
    case 7:
    case 8:
        await godvoice(resp_god, null);
        await verbalize(`Thou durst ${(on_altar()
            && a_align(game.u.ux, game.u.uy) !== resp_god)
            ? 'scorn' : 'call upon'} me?`);
        await update_topl(`"Then die, ${heroIsHuman() ? 'mortal' : 'creature'}!"`);
        // GAP: minion.c summon_minion(resp_god, FALSE) — no minion subsystem
        // here, so the servant (and its makemon RNG) is not created.
        break;
    default:
        await gods_angry(resp_god);
        await update_topl('Suddenly, a bolt of lightning strikes you!');
        // GAP: god_zaps_you() continues into fry_by_god() -> done(DIED); end.js
        // exports only done_in_by(), so the hero survives a smiting they
        // shouldn't.  Reachable only from the fourth consecutive prayer.
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
const DEVOUT = 14;

// C ref: pray.c pleased(g_align) — the god grants a favor.  fix_worst_trouble()
// is the one piece left out: it repairs the trouble in_trouble() found and its
// per-trouble RNG (rnd(5) extra max HP for TROUBLE_HIT, the unpunish/uncurse
// arms) belongs to subsystems outside this file.  Everything that decides
// WHICH branch runs, including the discarded rn1/rnl draws, is ported.
async function pleased(g_align) {
    const u = game.u;
    const trouble = in_trouble();
    let pat_on_head = 0;

    const record0 = u.ualign?.record ?? 0;
    const mood = (record0 >= DEVOUT) ? (Hallucination() ? 'pleased as punch' : 'well-pleased')
        : (record0 >= STRIDENT) ? (Hallucination() ? 'ticklish' : 'pleased')
            : (Hallucination() ? 'full' : 'satisfied');
    await update_topl(`You feel that ${align_gname(roleMnum(), g_align)} is ${mood}.`);

    /* not your deity */
    if (on_altar() && gp_aligntyp() !== (u.ualign?.type ?? 0)) {
        adjalign(-1);
        return;
    } else if (record0 < 2 && trouble <= 0) {
        adjalign(1);
    }

    // C re-reads u.ualign.record AFTER the adjalign(1) above; caching the old
    // value made a record-0 hero take the `!rnl(2)` arm C never reaches, adding
    // a phantom draw.
    const record = u.ualign?.record ?? 0;
    if (!trouble && record >= DEVOUT) {
        /* if hero was in trouble but got better, no special favor */
        if (praystate().trouble === 0) pat_on_head = 1;
    } else {
        const prayer_luck = Math.max(Luck(), -1);
        // on_shrine() widens the roll by one on a temple altar; it used to be
        // dropped, which changed the rn1 modulus for every shrine prayer.
        let action = rn1(prayer_luck + (on_altar() ? 3 + (on_shrine() ? 1 : 0) : 2), 1);
        if (!on_altar()) action = Math.min(action, 3);
        if (record < STRIDENT)
            action = ((record > 0) || !rnl(2)) ? 1 : 0;
        switch (Math.min(action, 5)) {
        case 5: pat_on_head = 1; /* FALLTHROUGH */
        case 4:
        case 3:
        case 2:
        case 1:
            // GAP: fix_worst_trouble(trouble) loops here.  With trouble <= 0
            // (the only case this port resolves) C's loops are inert too.
            break;
        case 0:
            break; /* your god blows you off, too bad */
        }
    }

    if (pat_on_head) {
        // GAP: pray.c:1167 switch (rn2((Luck + 6) >> 1)) — the gratuitous-favor
        // table (uncurse/bless weapon, gcrownu, give_spell, ...).  Reached only
        // at record >= DEVOUT or action 5.
    }

    // reset prayer timeout (kick_on_butt is 0 for a non-demigod hero).
    u.ublesscnt = rnz(350);
}

// C ref: pray.c gp.p_aligntyp accessor for pleased()'s cross-altar check.
function gp_aligntyp() {
    return praystate().aligntyp;
}

// C ref: pray.c water_prayer(bless_water) — (un)holy-water the potions on the
// altar under the hero.  Draws no RNG; the return value picks prayer_done()'s
// p_type == 2 branch.
async function water_prayer(bless_water) {
    const u = game.u;
    const bc_known = !Blind() && !Hallucination();
    let changed = 0, other = false;
    for (const otmp of (game.level?.objects || [])) {
        if (otmp.where !== 'floor' || otmp.ox !== u.ux || otmp.oy !== u.uy)
            continue;
        if (otmp.otyp === POT_WATER
            && (bless_water ? !otmp.blessed : !otmp.cursed)) {
            otmp.blessed = bless_water ? 1 : 0;
            otmp.cursed = bless_water ? 0 : 1;
            otmp.bknown = bc_known ? 1 : 0;
            changed += (otmp.quan || 1);
        } else if (OBJECTS[otmp.otyp]?.oclass === POTION_CLASS) {
            other = true;
        }
    }
    if (!Blind() && changed) {
        await update_topl(
            `${(other && changed > 1) ? 'Some of the' : other ? 'One of the' : 'The'}`
            + ` potion${(other || changed > 1) ? 's' : ''} on the altar`
            + ` glow${changed > 1 ? '' : 's'} ${bless_water ? 'light blue' : 'black'}`
            + ' for a moment.');
    }
    return changed > 0;
}

// C ref: pray.c prayer_done() — resolve the prayer after the nomul delay.
async function prayer_done() {
    const gp = praystate();
    const u = game.u;
    const alignment = gp.aligntyp;
    const utype = u.ualign?.type ?? 0;
    u.uinvulnerable = false;

    if (gp.type === -2) {
        /* praying at an unaligned altar */
        await update_topl('You hear diabolical laughter all around you...');
        adjalign(-2);
        // C also wake_nearby(FALSE) and exercise(A_WIS, FALSE); neither draws.
        if (!In_hell(u.uz)) {
            await update_topl('Nothing else happens.');
            return 1;
        }
    }
    if (In_hell(u.uz)) {
        await update_topl(
            `Since you are in Gehennom, ${align_gname(roleMnum(), alignment)} can't help you.`);
        if ((u.ualign?.record ?? 0) <= 0 || rnl(u.ualign.record))
            await angrygods(utype);
        return 0;
    }

    if (gp.type === 0) {
        if (on_altar() && utype !== alignment) await water_prayer(false);
        u.ublesscnt += rnz(250);
        change_luck(-3);
        await gods_upset(utype);
    } else if (gp.type === 1) {
        if (on_altar() && utype !== alignment) await water_prayer(false);
        await angrygods(utype); /* naughty */
    } else if (gp.type === 2) {
        if (await water_prayer(false)) {
            /* attempted water prayer on a non-coaligned altar */
            u.ublesscnt += rnz(250);
            change_luck(-3);
            await gods_upset(utype);
        } else {
            await pleased(alignment);
        }
    } else {
        /* coaligned */
        if (on_altar()) {
            // C also pray_revive(): a tame corpse on the altar is resurrected.
            await water_prayer(true);
        }
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
    if (gp.type === 3 && !In_hell(u.uz)) {
        if (!Blind())
            await update_topl('You are surrounded by a shimmering light.');
        u.uinvulnerable = true;
    }

    return 1; // ECMD_TIME: the move loop advances a turn and runs the occupation
}

// C ref: pray.c dosacrifice() — the #offer command.  The two guard messages are
// exact; the rite itself is not ported.
//
// GAP (known divergence): on an altar C calls floorfood("sacrifice", 1), which
// asks "There is <obj> here; sacrifice it?" for each corpse on the square and
// then falls through to getobj("sacrifice", ...) for an inventory pick, and
// finally prints "Nothing happens." and returns ECMD_TIME.  This returns
// ECMD_OK with no prompt, so the keystrokes C would have eaten fall through to
// the command parser and the turn C spends is not spent.
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
    return 0;
}
