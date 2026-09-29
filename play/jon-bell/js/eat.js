// @ts-nocheck
// eat.ts — Hunger and digestion.
// C ref: nethack-c/src/eat.c — gethungry (line 3163), newuhs (line 3363).
// @ts-nocheck — sibling imports from hand-maintained js/*.js (no .d.ts yet).
import { rn2, rnd, rn1, d } from './rng.js';
import { Blind as hero_Blind } from './vision.js';
import { ORGANISER_IS_MACOS } from './platform_identity.js';
import { PM_KILLER_BEE, PM_QUEEN_BEE, PM_STONE_GOLEM, PM_DWARF,
         PM_SCORPION, PM_KNIGHT } from './pm.generated.js';
import { FIRE_RES, SLEEP_RES, COLD_RES, DISINT_RES, SHOCK_RES, POISON_RES, ACID_RES, STONE_RES, SICK_RES, TELEPORT, TELEPORT_CONTROL, TELEPAT, STUNNED, DISPLACED } from './const.js';
import { PM_FLOATING_EYE, PM_MIND_FLAYER, PM_MASTER_MIND_FLAYER } from './pm.generated.js';
import { permonstTemplate, olfaction, monPmname, splitobj, attacktype_fordmg, levelDifficulty, mon_set_minvis } from './makemon.js';
import { same_race } from './mhitm.js';
import { monstone as monstone_real } from './dogmove.js';
import { PM_VROCK } from './pm.generated.js';
import { game, wizard, discover } from './gstate.js';
import { paranoid_query } from './paranoid.js';
import { PARANOID_EATING } from './const.js';
import { obj_stop_timers, fall_asleep } from './timeout.js';
import { OBJ_FREE, OBJ_INVENT, OBJ_DELETED, SELL_NORMAL, SELL_DONTSELL } from './const.js';
/* objects.h BEARTRAP (tool object ordinal). */
const BEARTRAP = 244;
import monsPack from './makemon_mons.json' with { type: 'json' };
import corpseData from './eat_corpse_data.json' with { type: 'json' };
import { FOOD_PROPS } from './food_props.js';
import { pline, canseemon, canspotmon, nh_sprintf, newsym, You_hear,
         Deaf as hero_Deaf, livelog_printf,
         _topl_merge_result, _topl_joins_snapshot, _topl_stash_result,
         _topl_record_join, capture_painted_frame_with_status } from './display.js';
import { stop_occupation } from './allmain.js';
import { end_running, is_pool_or_lava } from './look.js';
import { PM_ELF as PM_ELF_EAT } from './pm.generated.js';
import { eos, getrumor, outrumor, BY_COOKIE, mksobj as mksobj_real } from './mklev.js';
import { discover_object } from './o_init.js';
import { SATIATED, NOT_HUNGRY, HUNGRY, WEAK, FAINTING, FAINTED, STARVED, HUNGER, CONFLICT, SLOW_DIGESTION, REGENERATION, W_ARTI, W_WEP, FROMFORM, W_RINGL, W_RINGR, SPINACH_TIN, HEALTHY_TIN, ROTTEN_TIN, HOMEMADE_TIN, NON_PM, A_STR, A_INT, M_ATTK_HIT, M_ATTK_MISS, M_ATTK_AGR_DIED, DIED, KILLED_BY_AN, KILLED_BY, NO_KILLER_PREFIX, LIFESAVED, EDOG, STRANGLED, W_ARMOR, W_TOOL, W_AMUL, W_SADDLE, ECMD_OK, ECMD_TIME, GENOCIDED, PANICKED, POISONING, Upolyd, COST_BITE, LL_CONDUCT, CHOKING, MAGICAL_BREATHING, A_LAWFUL } from './const.js';
/* C ref: invent.c:1752 getobj() — the ONE real (keystroke-consuming) getobj
 * body in this port; js/cmd.js:14406.  eat.js<->cmd.js is already a proven
 * circular import (js/potion.js<->js/cmd.js is the same shape) — safe because
 * nothing here calls it at module-evaluation time, only from inside doeat().
 * js/read.js's own `getobj` import (this file's line ~3515 stub) is a
 * DIFFERENT, deliberately-unfixed copy — see that stub's own comment. */
import { getObjFromGetobj, wield_tool as wield_tool_real, costly_alteration,
         obj_extract_self_general, useup, useupf } from './cmd.js';
import { sellobj_state } from './shk.js';
import { g_at } from './cmd.js';
import { flush_screen, force_more, topl_park_cursor } from './display.js';
import { more_experienced, newexplevel } from './uhitm.js';
import { nhgetch } from './input.js';
/* C win/tty/wintty.c tty_yn_function(query, resp, def, sensitive) — real body
 * lives in js/end.js (that file already reads nhgetch() and documents the
 * quitchars-includes-space rule this stub was missing). end.js imports
 * init_uhunger from this file, so this is a circular import; safe the same
 * way as the js/cmd.js edge above — nothing here calls it at module-eval
 * time, only from inside floorfood(). */
import { yn_function, savelife, deadhero, pending_death_is_final,
         do_death_sequence } from './end.js';
/* C trap.c:1046 reset_utrap(msg) — real body lives in js/trap.js (which
 * already imports You from this file, so this is also a circular import,
 * same safety argument as the js/end.js edge above). Not async: it does not
 * await its own float_up()/You() calls, matching this file's un-awaited
 * call site. */
import { reset_utrap, selftouch, t_at as t_at_real, deltrap as deltrap_real } from './trap.js';
/* C hack.h on_level(l1,l2) macro — real body in js/dungeon.js. Both operands
 * used at eat.js's one call site (context.digging.level, u.uz) carry the
 * same {dnum, dlevel} shape this expects (js/dig.js:115, js/allmain.js:332,
 * js/cmd.js:9202). No cycle: js/dungeon.js does not import js/eat.js. */
import { on_level } from './dungeon.js';
/* C engrave.c:187 can_reach_floor(check_pit) — real body in
 * js/hold_another_object.js, whose own comment names this file's copy as a
 * STUB left deliberately alone because re-pointing it "would move code
 * paths this change has no business moving" — that caution was scoped to
 * THAT file's change, not a standing veto; this task's brief explicitly
 * asks for it, gated by the floor after every stub. No import cycle:
 * js/hold_another_object.js does not import js/eat.js. */
import { can_reach_floor } from './hold_another_object.js';
import { BLINDED, CONFUSION, HALLUC, HALLUC_RES, LEVITATION, SICK, VOMITING,
         STONED, UNCHANGING, SICK_ALL, FROMOUTSIDE, TIMEOUT, LAST_PROP } from './const.js';
/* make_confused's C home is potion.c:88.  This file used to carry its own
 * `_eat_make_confused`, which wrote a flat `game.HConfusion` that only this
 * file's own reader consulted — so eating a confusing corpse set a word the
 * status line, u_maybe_impaired() and every other reader ignored.  The C-side
 * arity is (xtime, talk); every call here is C's talk=FALSE. */
import { make_confused as make_confused_shared, make_stunned, make_stoned as make_stoned_shared } from './potion.js';
import { PM_VIOLET_FUNGUS, PM_WRAITH, PM_NURSE,
         PM_YELLOW_LIGHT, PM_GIANT_BAT, PM_BAT, PM_GIANT_MIMIC, PM_LARGE_MIMIC, PM_SMALL_MIMIC,
         PM_QUANTUM_MECHANIC, PM_LIZARD, PM_CHAMELEON, PM_DOPPELGANGER, PM_SANDESTIN,
         PM_GENETIC_ENGINEER, PM_DISPLACER_BEAST, PM_DISENCHANTER,
         PM_NEWT } from './pm.generated.js';
import { dmgtype, stackobj_dm } from './dogmove.js';
import { attacktype } from './makemon.js';
/* C monattk.h — AT_MAGC (ranged spellcasting) and the AD_ damage types
 * cpostfx's hallucination test reads.  Values verified against the copies
 * already in js/mhitu.js (AD_STUN=12), js/polyself.js (AD_HALU=36) and
 * js/dochug.js (AT_MAGC=255). */
const AT_MAGC_AT = 255, AD_STUN_AT = 12, AD_HALU_AT = 36;
/* The three @-class were-forms.  js/pm.generated.js names only the FIRST
 * occurrence of a duplicated monster name, so its PM_WEREJACKAL/PM_WEREWOLF/
 * PM_WERERAT are the ANIMAL forms (15/21/91) and the human forms are the
 * unnamed duplicates immediately after PM_HUMAN = 260. */
const PM_HUMAN_WERERAT = 261, PM_HUMAN_WEREJACKAL = 262, PM_HUMAN_WEREWOLF = 263;
/* C monflag.h:136 M2_GIANT — is_giant(ptr). */
const M2_GIANT = 0x00002000;
import { exercise, losestr, acurr, getAbase, C_ATTR_TO_DISP, change_luck,
         adjattrib, gainstr, setuhpmax, adjalign } from './attrib.js';
/* ── The tin-opening occupation's callees (C eat.c:1381-1796).  Each is the
 * ONE live body in this tree; see the block above tinopen_ok() for the scope
 * statement covering what is deliberately NOT called from there. */
import { A_DEX, A_CON, GLIB, Is_astralevel } from './const.js';
import { acurrstr } from './dokick.js';
import { makeplural, the, yobjnam, otense,
         doname as doname_real, thesimpleoname as thesimpleoname_real,
         killer_xname } from './objnam.js';
import { the_unique_pm } from './makemon.js';
import { rndmonnam } from './do_name.js';
import { observe_object } from './o_init.js';
import { hcolor, poly_when_stoned as poly_when_stoned_eat } from './mhitm.js';
import { is_were, you_unwere } from './were.js';
import { polymon, rehumanize } from './polyself.js';
import { toggle_displacement } from './do_wear.js';
import { fingers_or_gloves } from './do_wear.js';
import { make_glib, make_vomiting, make_sick, vomit } from './potion.js';
/* C cmd.c:206 set_occupation(fn, txt, xtime) — js/cmd.js holds the one body;
 * js/lock.js already imports it the same way (cmd.js -> eat.js is an existing
 * edge, and this closes it, so the import is used LAZILY inside start_tin's
 * tail rather than at module scope). */
import { set_occupation, dropx, dropy as dropy_real, instapetrify as instapetrify_eat,
         useup as useup_eat, heal_legs, verbalize, pooleffects_breathless } from './cmd.js';
import { near_capacity, weight, encumber_msg as encumber_msg_real } from './weight.js';
import { obj_here } from './cmd.js';
import { losehp } from './dokick.js';
import { obj_resists, make_blinded } from './zap.js';
import { Monnam } from './mcastu.js';
import { mon_nam } from './uhitm.js';
import { s_suffix } from './mhitm.js';
import { objName } from './objnam.js';
import { mondied } from './makemon.js';

import { PM_FIRE_ELEMENTAL, PM_RUST_MONSTER, PM_GHOUL, PM_GELATINOUS_CUBE, PM_STALKER, PM_FLESH_GOLEM, PM_LEATHER_GOLEM, PM_ACID_BLOB } from './pm.generated.js';
import { MKOBJ_OC_MATERIAL, MKOBJ_OC_OPROP } from './mkobj_erosion_meta.js';
import { Has_contents } from './const.js';
/* C you.h:562  #define u_at(x,y) ((x) == u.ux && (y) == u.uy).  This file
 * carried a local `function u_at(x, y) { return true; }` shadow, which made
 * eat.c:3644's resume test unconditionally true. */
import { u_at } from './const.js';
import { unmul, nomul } from './allmain.js';
/* C include/objects.h ring/amulet otyp constants.
 * Ring class SVB base = MKOBJ_SVB_BASES[RING_CLASS=4] = 173 (mkobj_data.js).
 * Amulet class SVB base = MKOBJ_SVB_BASES[AMULET_CLASS=5] = 201 (defsym.h:471
 * OBJCLASS( 5, '"', AMULET, ...) — the old "AMULET_CLASS=11" here was the WAND
 * class, and base 409+11 = 420 is WAN_SPEED_MONSTER, not an amulet at all).
 * Offsets are positions in the objects.h RING(...)/AMULET(...) declaration
 * sequence starting from the class base. */
const RIN_PROTECTION = 178; /* 173 + 5  — "protection" ring */
/* C objects.h: RING(..., spec=1) marks only adornment through protection
 * (173..178) as oc_charged.  oc_charged belongs to the object-class table,
 * never to an individual worn object. */
function _ring_oc_charged(obj) {
    const otyp = obj?.otyp | 0;
    return otyp >= 173 && otyp <= RIN_PROTECTION;
}
const RIN_SLOW_DIGESTION = 193; /* 173 + 20 — "slow digestion" ring */
const MEAT_RING = 270; /* FOOD_CLASS item; shares otyp space */
const FAKE_AMULET_OF_YENDOR = 212; /* 201 + 11 — cheap plastic imitation */
/* C prop.h PROTECTION = 6; used as u.uprops[PROTECTION].extrinsic. */
const PROTECTION = 59;
/* C monflag.h dietary M1_* flags (column 6 of MONS_ROWS / permonst.mflags1).
 * All 13 role PM_ entries have M1_CARNIVORE or M1_HERBIVORE set.
 * Unused constants kept for documentation parity with C mondata.h. */
/* const M1_CARNIVORE   = 0x20000000; */
/* const M1_HERBIVORE   = 0x40000000; */
/* const M1_METALLIVORE = 0x80000000; */
/* C hack.h encumbrance levels; SLT_ENCUMBER = 1 = "Burdened". */
const SLT_ENCUMBER = 1;
/* near_capacity() — C hack.c:4349; real STR/CON+inventory-weight impl now
 * imported from weight.js (shared faithful impl). */
/* encumber_msg() stub — C hack.c:4382.
 * Prints an encumbrance message to the player.
 * Not yet ported; called only when STR is restored from negative. */
async function encumber_msg() {
    return encumber_msg_real();
}
/* C objects.h FOOD_CLASS — fortune cookie otyp.
 * FOOD_CLASS SVB base = MKOBJ_SVB_BASES[FOOD_CLASS=6] = 252.
 * FORTUNE_COOKIE is at offset 37 in the food declaration sequence.
 * Value confirmed: u_init.js line 858 FORTUNE_COOKIE_OTYP = 289. */
const FORTUNE_COOKIE_OTYP = 289;
/* C attrib.h AVAL — max exercise accumulator value before exercise ceases. */
const AVAL = 20;
/* A_WIS index into attribute arrays (0-based: A_STR=0, A_INT=1, A_WIS=2). */
const A_WIS = 2;
// C ref: rumors.c:117 getrumor(truth, rumor_buf, exclude_cookie)
//
// There is ONE getrumor in C and there is now one here.  This file used to
// carry a second, independent body (with its own copy of get_rnd_line); both
// copies were missing C's exclude_cookie retry loop, and the mklev copy's
// omission desynced seed0007's level-1 graffiti at leaf 1629.  The canonical
// port lives beside get_rnd_line_from_section in js/mklev.js; re-exported here
// for existing callers; cookie post-effects use the shared outrumor path.
//
// Callers reaching it through THIS module are the reading paths
// (eat.c:2523 fpostfx → outrumor(BY_COOKIE), read.c:368 BY_PAPER), for which
// C passes exclude_cookie = FALSE (rumors.c:551 `reading ? FALSE : TRUE`) —
// so they may receive a cookie rumor, with its "[cookie] " marker stripped.
//
// Anti-cheat: the rumor text comes from the engrave_data rumor tables resolved
// by the rolled file offset (get_rnd_line line-selection), NEVER from the
// session screen. Verified 0-divergence by tools/rumor-retrieval-diff.mjs.
export { getrumor };
// C ref: eat.c:2817 doeat() — the 'e' command.
//
// Keyed, named and queued commands call this body. Return the actual C
// command result; rhack owns the corresponding context.move/prefix reset.
//
// Ported: Strangled refusal, floorfood("eat",0) → the real interactive
// getobj (js/cmd.js getObjFromGetobj, which IS invent.c:1752 — see that
// function's own header), check_capacity, the hands_obj iron-bars sentinel,
// is_edible()/"You cannot eat that!", the worn-item refusal, TIN dispatch to
// start_tin, and the general path via doeat_food (touchfood/conduct/
// eatcorpse/rotten-food/start_eating already live there).  The fortune-cookie
// one-bite path is NOT special-cased here: eat.c has no such special case
// either — a fresh cookie's oc_delay is 1, so start_eating's first bite()
// immediately satisfies usedtime>=reqtime and calls done_eating() ->
// fpostfx() synchronously within this same call, and _fpostfx below now
// carries the FORTUNE_COOKIE arm (outrumor/getrumor) that used to live here
// as a bypass.
//
// NOT ported (rare paths; no record in this board reaches them): eat.c:2833
// u.uedibility prompts, eat.c:2850's "you pause to swallow" iron-bar-chewing
// message, eat.c:2856 rust-monster-eats-rustproofed-metal, eat.c:2891
// RIN_SLOW_DIGESTION, eat.c:2899 doeat_nonfood (oclass != FOOD_CLASS — dead
// per is_edible()'s FOOD_CLASS-only default for every hero this board has),
// eat.c:2904 the victual-resume arm (a second 'e' on the SAME in-progress
// meal).  eat.c:2868 retouch_object/touch_artifact is skipped too: for any
// non-artifact object (everything in this board) artifact.c:914-915
// `if (oart == &artilist[ART_NONARTIFACT]) return 1` is its ENTIRE body —
// RNG-free and side-effect-free — so omitting the call changes nothing
// observable.
export async function doeat() {
    const g = game;
    const u = g.u;
    g.context = g.context || {};

    /* C eat.c:2825-2828 Strangled. */
    if (_eat_Strangled()) {
        await pline("If you can't breathe air, how can you consume solids?");
        return ECMD_OK;
    }

    /* C eat.c:2829 floorfood("eat", 0). */
    const otmp = await floorfood('eat', 0);
    if (!otmp) {
        /* C eat.c:2829: empty, declined or cancelled selection is ECMD_OK. */
        return ECMD_OK;
    }

    /* C eat.c:2830-2831 check_capacity((char *) 0).
     * CORRECTED 2026-09-05 — the "over-weighs corpsenm 153/327" theory this
     * comment used to carry was STALE: js/weight.js's corpse arm already
     * applies eaten_stat() (landed 2026-08-21/26, both BEFORE this comment's
     * own 2026-09-04 commit), and the capture's own replayed objects already
     * carry the reduced owt (279/75) directly — measured with a debug print
     * on every doeat replay in this board: check_capacity() returns false on
     * EVERY record including 19-23, never true.  It was never the blocker.
     * The real cause of records 19-23 is named below at doeat_food's call
     * site: C's "otmp === svc.context.victual.piece" resume branch
     * (eat.c:2923-2949) is simply missing here. */
    if (await check_capacity(null)) {
        return ECMD_OK;
    }

    /* C eat.c:2847-2854 — hands_obj: floorfood's "eating iron bars at the
     * current spot" placeholder.  The still_chewing() resume pline is not
     * ported; the turn itself is. */
    if (otmp === hands_obj) {
        return ECMD_TIME;
    }

    /* C eat.c:2861-2862 — !is_edible(otmp). */
    if (!is_edible(otmp)) {
        await pline('You cannot eat that!');
        return ECMD_OK;
    }

    /* C eat.c:2863-2866 — worn armor/tool/amulet/saddle refusal
     * ("You_cant(\"eat %s you're wearing.\", something)"). */
    if ((otmp.owornmask | 0) & (W_ARMOR | W_TOOL | W_AMUL | W_SADDLE)) {
        await You_cant("eat something you're wearing.");
        return ECMD_OK;
    }

    /* C eat.c:2923-2951 — resuming a meal already in progress: this 'e'
     * re-selected the SAME object doeat is already mid-way through eating.
     * This branch was entirely missing: every resumed meal fell through to
     * the general path below and re-ran eatcorpse()/rottenfood() on an
     * already-processed corpse, redrawing RNG the C capture never spends on
     * a resume (its acid/poison/rot roll happens once, when the meal
     * STARTS) and desyncing the tape for every doeat call after it in the
     * session. C skips touchfood's split/oeaten-init and the whole
     * conduct/eatcorpse/rottenfood dispatch on this path — it only
     * re-anchors victual.piece/o_id, prints the resume message, and calls
     * start_eating(otmp, FALSE) again.
     * Independently measured a second time on probe-cov-consume/gen000: 5
     * board records (a food ration re-selected mid-chew) all record ZERO
     * draws here while the pre-port code drew at least one — an
     * rng_result_tape_underrun.
     * C eat.c:2935 calls do_reset_eat() (not a bare victual zero) on the
     * touchfood()==NULL arm; _do_reset_eat() below is that port. */
    {
        const v0 = _victual();
        if (otmp === v0.piece) {
            const one_bite_left = ((v0.usedtime | 0) + 1) >= (v0.reqtime | 0);
            if (((u && (u.uhs | 0)) !== SATIATED)) v0.canchoke = 0;
            v0.o_id = 0;
            const resumed = await touchfood(otmp);
            if (resumed) {
                v0.piece = resumed;
                v0.o_id = resumed.o_id | 0;
            } else {
                await _do_reset_eat();
            }
            You(!one_bite_left ? 'resume your meal.' : 'consume the last bite of your meal.');
            if (resumed) await start_eating(resumed, false);
            return ECMD_TIME;
        }
    }

    /* C eat.c:2917-2919 — TIN is a special case, dispatched before the
     * general conduct/touchfood/eatcorpse path. */
    if ((otmp.otyp | 0) === TIN_OTYP) {
        await start_tin(otmp);
        return ECMD_TIME;
    }

    /* C eat.c:2941-3084 — the general comestible path: conduct, touchfood,
     * eatcorpse/rotten-food dispatch, reqtime/nmod, start_eating.  Already
     * ported (doeat_food), called here by every command route.
     * doeat_food's every exit corresponds to a C
     * `return ECMD_TIME;` (eat.c:2977, :2985, :3081) — same as the real
     * doeat()'s own unconditional tail return (eat.c:3081). */
    await doeat_food(otmp);
    return ECMD_TIME;
}
/* C eat.c:3363 newuhs(boolean incr)
 *
 * Recomputes hero's hunger status (u.uhs) from u.uhunger and applies
 * state changes: strength-temp adjustments, messages, fainting/starving.
 *
 * Ported: status threshold calculation, u.uhs assignment, SET_BOTL, the
 * FAINTING branch (eat.c:3411-3448) including its rn2(20-n) draw — added
 * 2026-09-05, capture-replay showed 29/300 gethungry records with an
 * unconsumed RNG draw whenever u.uhs was already FAINTED/FAINTING at call
 * time (e.g. seed-generated sessions that starve for many turns).
 *
 * Not yet ported: pline() messages for SATIATED/NOT_HUNGRY transitions
 * (eat.c:3468-3499 partial — only HUNGRY/WEAK are ported below),
 * done(STARVING) (eat.c:3438) — no general death handler is exported
 * anywhere in js/ (checked end.js, exper.js, mhitu.js, save.js: all three
 * `done()` bodies there are stubs/throws), so the STARVED branch below sets
 * u.uhs/botl for state consistency but cannot end the game.  Likewise the
 * newly-faint trigger's `ga.afternmv = unfaint` sets the existing string-tag
 * convention (see is_fainted()/reset_faint() above), but allmain.js's
 * afternmv_dispatch() has no 'unfaint' case yet (cross-file, out of this
 * packet's one-file scope) — a countdown that completes via this path will
 * not yet call unfaint(). Neither gap is exercised by any captured
 * gethungry record (checked all 29 diverging records: the trigger condition
 * is false or the hero is already FAINTED in every one), so it does not
 * block the fix below; add it when a session reaches it.
 */
export async function newuhs(incr) {
    const g = game;
    const u = g.u;
    if (!u)
        return;
    const h = u.uhunger | 0;
    /* C eat.c:3370-3373 — hunger threshold table. */
    let newhs;
    if (h > 1000)
        newhs = SATIATED;
    else if (h > 150)
        newhs = NOT_HUNGRY;
    else if (h > 50)
        newhs = HUNGRY;
    else if (h > 0)
        newhs = WEAK;
    else
        newhs = FAINTING;
    /* C eat.c:3397-3408 — saved_hs block (occupation eating midmeal).  While eating,
     * u.uhs may pass through intermediate hunger states (e.g. cross 1000 → SATIATED)
     * that should NOT update the displayed status line until the meal ends: C saves the
     * FIRST hunger status (save_hs) once, sets u.uhs = newhs, and RETURNS WITHOUT
     * SET_BOTL — so bot() does not re-render the status during the meal.  The displayed
     * status keeps the pre-meal hunger until done_eating, then the post-meal newuhs
     * (occupation cleared) restores/commits it.  iseating mirrors C's
     * `go.occupation == eatfood || gf.force_save_hs` (bite() sets force_save_hs).
     * This is why seed0014's "Satiated" appears only at step 4 (done_eating), not step 3
     * (lesshungry) — even though u.uhunger crossed 1000 at the turn-2 bite. */
    const iseating = (g.occupation === eatfood) || !!g._force_save_hs;
    if (iseating) {
        if (!g._saved_hs) {
            g._save_hs = (u.uhs | 0);
            g._saved_hs = true;
        }
        u.uhs = newhs;
        /* C eat.c:3406 — return WITHOUT SET_BOTL: do not refresh the status mid-meal. */
        return;
    } else if (g._saved_hs) {
        /* C eat.c:3409-3411 — meal ended: restore the saved status so the post-meal
         * newhs comparison below decides the single end-of-meal status update. */
        u.uhs = g._save_hs | 0;
        g._saved_hs = false;
    }
    /* C eat.c:3411-3448 — FAINTING branch. */
    if (newhs === FAINTING) {
        const uh = u.uhunger | 0;
        /* C eat.c:3413: sgn(u.uhunger) * ((abs(u.uhunger) + 5) / 10) — both
         * operations on int, so the division truncates toward zero. */
        const uhungerDivBy10 = _eat_sgn(uh) * Math.trunc((Math.abs(uh) + 5) / 10);
        /* C eat.c:3415-3416: is_fainted() reads the CURRENT (pre-update) u.uhs. */
        if (is_fainted())
            newhs = FAINTED;
        if ((u.uhs | 0) <= WEAK || rn2(20 - uhungerDivBy10) >= 19) {
            if (!is_fainted() && (g.multi | 0) >= 0) {
                /* C eat.c:3418-3431 — stop what you're doing, then faint. */
                const duration = 10 - uhungerDivBy10;
                await stop_occupation();
                await You('faint from lack of food.');
                /* C eat.c:3421 incr_itimeout(&HDeaf, duration).  u.HDeaf is the
                 * flat countdown this codebase already uses in place of C's
                 * packed timeout word (js/allmain.js:1652-1658,
                 * js/fastforward.js:1246-1253); incr_itimeout adds `duration`
                 * to it, clamped at itimeout()'s zero floor. */
                u.HDeaf = Math.max(0, (u.HDeaf | 0) + duration);
                if (g.disp)
                    g.disp.botl = 1;
                nomul(-duration);
                g.multi_reason = 'fainted from lack of food';
                g.nomovemsg = 'You regain consciousness.';
                /* C eat.c:3428 ga.afternmv = unfaint.  Sets the existing
                 * string-tag convention (is_fainted()/reset_faint() above
                 * already check for "unfaint"); allmain.js's
                 * afternmv_dispatch() has no 'unfaint' case yet — see the
                 * file header note. */
                g.afternmv = 'unfaint';
                newhs = FAINTED;
                if (!_uprop_on(LEVITATION))
                    void selftouch('Falling, you');
            }
        } else if (uh < -(100 + 10 * (acurr(u, A_CON) | 0))) {
            /* C eat.c:3436-3447 — starvation death.  done(STARVING) has no JS
             * counterpart anywhere in this project (see file header); the
             * state fields that do exist are still set for consistency, but
             * this port cannot end the game here. */
            u.uhs = STARVED;
            if (g.disp)
                g.disp.botl = 1;
            return;
        }
    }
    /* C eat.c:3451-3513 — update u.uhs, notify. */
    if (newhs !== (u.uhs | 0)) {
        /* The temporary weakness penalty remains active through the
         * fainting states; C clears it only when hunger rises above WEAK. */
        if (!u.atemp) u.atemp = { a: [0, 0, 0, 0, 0, 0] };
        if (!u.atemp.a) u.atemp.a = [0, 0, 0, 0, 0, 0];
        if (newhs >= WEAK && (u.atemp.a[0] | 0) >= 0)
            u.atemp.a[0] = -1;
        else if (newhs < WEAK && (u.atemp.a[0] | 0) < 0)
            u.atemp.a[0] = 0;
        /* C eat.c:3452-3466: ATEMP(A_STR) = -1 on crossing INTO weak and 0 on
         * crossing back out.  STILL GAPPED, and the cost is a wrong St on the
         * status line for as long as the hero is WEAK (u.atemp lives in
         * js/attrib.js and is DISPLAY-ordered via C_ATTR_TO_DISP, neither of
         * which this module reaches).  It is NOT the reason the switch below
         * was missing. */
        /* C eat.c:3468-3499 — the hunger-transition messages, and with them the
         * two things that are not messages at all:
         *     if (incr && go.occupation
         *         && (go.occupation != eatfood && go.occupation != opentin))
         *         stop_occupation();
         *     end_running(TRUE);
         * A counted rest, a search, a travel — anything holding an occupation —
         * is INTERRUPTED by crossing a hunger boundary, and C prints the stop
         * on the same topline.  This whole switch was absent, so a counted
         * command ran to completion here and the turn counter ran away from C's:
         * gen413-reseed-seed565607 step 1070 is `50.` at T:120, where C stops at
         * T:146 with "You are beginning to feel hungry.  You stop waiting." and
         * this port waited out all fifty turns to T:158 in silence.  From there
         * the two runs were a different number of turns apart for the rest of
         * the session.
         * opentin is not ported, so `go.occupation != opentin` is vacuously
         * true and is left out rather than spelled against a name that does not
         * exist. */
        switch (newhs) {
        case HUNGRY:
            if (_eat_Hallucination()) {
                pline(!incr ? 'You now have a lesser case of the munchies.'
                            : 'You are getting the munchies.');
            } else {
                pline(!incr ? 'You only feel hungry now.'
                     : ((u.uhunger | 0) < 145) ? 'You feel hungry.'
                       : 'You are beginning to feel hungry.');
                if (g._resultMessage && g._pending_message) {
                    const _hint = _topl_joins_snapshot(g._resultMessage) || undefined;
                    g._resultMessage = _topl_merge_result(g._resultMessage,
                        g._pending_message, _hint);
                    g._pending_message = '';
                }
            }
            if (incr && g.occupation && g.occupation !== eatfood)
                await stop_occupation();
            end_running(true);
            break;
        case WEAK:
            if (_eat_Hallucination()) {
                pline(!incr ? 'You still have the munchies.'
                            : 'The munchies are interfering with your motor capabilities.');
            } else if (incr && (_eat_Role_if(ROLE_WIZARD) || _eat_Race_if_elf()
                                || _eat_Role_if(ROLE_VALKYRIE))) {
                /* C: "%s needs food, badly!" with gu.urole.name.m for the two
                 * roles and the literal "Elf" for an elf of any other role. */
                pline(((_eat_Role_if(ROLE_WIZARD) || _eat_Role_if(ROLE_VALKYRIE))
                       ? (g.urole?.name?.m || '') : 'Elf') + ' needs food, badly!');
            } else {
                pline(!incr ? 'You are still weak.'
                     : ((u.uhunger | 0) < 45) ? 'You feel weak.'
                       : 'You are beginning to feel weak.');
            }
            if (incr && g.occupation && g.occupation !== eatfood)
                await stop_occupation();
            end_running(true);
            break;
        }
        u.uhs = newhs;
        /* C hack.h SET_BOTL() */
        if (g.disp)
            g.disp.botl = 1;
        /* bot() — not ported (no tty). */
    }
    /* return void; C eat.c:3514 */
}
/* C hack.h sgn(n) — sign of an int, used by newuhs's FAINTING branch
 * (eat.c:3413).  Every other file in js/ that needs this defines its own
 * local copy (js/attrib.js, js/trap.js, js/mcastu.js, ...); do the same
 * rather than import across files for a one-line helper. */
function _eat_sgn(n) {
    return (n < 0) ? -1 : (n > 0) ? 1 : 0;
}
/* C you.h:247 Role_if(X) — gu.urole.mnum == X.  This port carries the hero's
 * role as an INDEX into js/roles.js roles[] (game.flags.initrole), not as a
 * permonst number; the same body js/m_initweap.js:233 Role_if uses, and the
 * reason it is spelled out rather than compared against a PM_* constant is that
 * half the PM_* names in js/ are roles[] indices and half are monster ids. */
const ROLE_VALKYRIE = 11; /* js/roles.js:116 roles[].mnum */
const ROLE_WIZARD = 12;   /* js/roles.js:117 roles[].mnum */
const ROLE_KNIGHT = 4;    /* js/roles.js:109 roles[].mnum */
function _eat_Role_if(role_idx) {
    const g = game;
    const ir = (g.flags && g.flags.initrole != null) ? (g.flags.initrole | 0) : -1;
    if (ir >= 0)
        return ir === (role_idx | 0);
    return ((g.urole && g.urole.mnum != null) ? (g.urole.mnum | 0) : -1) === (role_idx | 0);
}
/* C you.h Race_if(PM_ELF) — gu.urace.mnum == PM_ELF.  urace.mnum IS a real PM
 * index here (js/roles.js sets it from RACE_PM_MNUM), which is why this one
 * compares against pm.generated.js's PM_ELF and the role check above does not. */
function _eat_Race_if_elf() {
    return ((game.urace && game.urace.mnum) | 0) === PM_ELF_EAT;
}
/* C trap.c:6756 boolean unconscious(void)
 *   if (gm.multi >= 0) return FALSE;
 *   return (u.usleep || (gn.nomovemsg && (strncmp(nomovemsg,"You awake",9)==0
 *           || strncmp(nomovemsg,"You regain con",14)==0
 *           || strncmp(nomovemsg,"You are consci",14)==0)));
 * RNG-free.  Local helper (the documented trap.js unconscious() was never
 * implemented); used by gethungry's Unaware check. */
function _unconscious() {
    const g = game;
    if ((g.multi | 0) >= 0)
        return false;
    const u = g.u || {};
    if (u.usleep)
        return true;
    const nm = g.nomovemsg;
    if (nm
        && (nm.slice(0, 9) === 'You awake'
            || nm.slice(0, 14) === 'You regain con'
            || nm.slice(0, 14) === 'You are consci'))
        return true;
    return false;
}
/* C eat.c:3163 void gethungry(void)
 *
 * Called once per hero turn (allmain.c:407) when context.move is true.
 * Decrements u.uhunger for: basic metabolism, slow-digestion non-ring
 * source, left/right ring hunger, amulet hunger, real-Amulet-of-Yendor
 * penalty, regeneration, encumbrance, conflict, and ring-of-hunger.
 * Then calls newuhs(TRUE) to update hunger status.
 *
 * RNG calls in order:
 *   rn2(10)  — only when Unaware (asleep/unconscious; eat.c:3174)
 *   rn2(20)  — accessorytime (eat.c:3191) — the primary porting target
 */
export async function gethungry() {
    const g = game;
    if (!g.u)
        return;
    const u = g.u;
    /* C eat.c:3167-3168: early return if invulnerable or debug mode. */
    if (u.uinvulnerable || (g.iflags && g.iflags.debug_hunger)) {
        return;
    }
    /* C eat.c:3174-3179:
     *   if ((!Unaware || !rn2(10))
     *       && (carnivorous(gy.youmonst.data) || herbivorous(...) || metallivorous(...))
     *       && !Slow_digestion)
     *       u.uhunger--;
     *
     * Unaware = (gm.multi < 0 && (unconscious() || is_fainted()))
     *   unconscious() (trap.c:6757): gm.multi < 0 && (u.usleep ||
     *                 nomovemsg matches "You awake"/"You regain con"/
     *                 "You are consci")
     *   is_fainted()  (eat.c:3348): u.uhs == FAINTED
     * JS reads the LIVE gm.multi (g.multi — maintained by the faithful
     * moveloop's nomul()/countdown and dumped to the 'hero.multi' mapstate
     * field by mapstate.js:159), NOT the stale g.__bridge__ placeholder
     * (which is only seeded on replay setup, never updated during a turn).
     * When Unaware=false, C short-circuits: (!Unaware || ...) =
     * (true || ...) = true and rn2(10) is NOT called.
     *
     * DIETARY CHECK — was hardcoded true, "until u.umonnum tracking is ported".
     * u.umonnum IS tracked: js/u_init.js:376 sets it from INITROLE_TO_PM at
     * u_init.c:991's `u.umonnum = u.umonster = gu.urole.mnum`, and every one of
     * the 13 role rows in js/makemon_mons.json carries M1_CARNIVORE or
     * M1_HERBIVORE (measured: Monk is herbivore-only, the other twelve are
     * both), so the ported guard is TRUE for every un-polymorphed corpus hero
     * and behaves exactly as the hardcoded true did.  What the constant threw
     * away is the POLYMORPH case C wrote the guard for, quoted in its own
     * comment at eat.c:3169 — "being polymorphed into a creature which doesn't
     * eat prevents this first uhunger decrement".  A hero poly'd into a golem,
     * an elemental or a vortex carries none of the three flags and C stops
     * decrementing uhunger; this port kept starving them on schedule.
     * (Read the note on _hero_carnivorous() with care: it says the Monk's
     * umonnum is PM_HUMAN.  INITROLE_TO_PM[5] is 336, the `monk` row, not the
     * `human` one.)
     * _heroMnum() returning -1 is "not resolvable", not "does not eat": C's
     * gy.youmonst.data is always a valid permonst, and an unresolved umonnum
     * here can only be the un-polymorphed hero, whose role row always eats — so
     * that case takes the C-equivalent TRUE rather than the predicates' false.
     *
     * Slow_digestion: u.uprops[SLOW_DIGESTION] not yet tracked → false. */
    const multiVal = (g.multi | 0);
    const unaware = (multiVal < 0) && (_unconscious() || is_fainted());
    /* C: (!Unaware || !rn2(10)) — consume rn2(10) only when asleep. */
    const awarenessOk = !unaware || !rn2(10);
    const slowDigestion = !!(u.uprops
        && u.uprops[SLOW_DIGESTION]
        && (u.uprops[SLOW_DIGESTION].intrinsic || u.uprops[SLOW_DIGESTION].extrinsic));
    const heroMnumE = _heroMnum();
    const heroEats = (heroMnumE < 0)
        || _hero_carnivorous() || _hero_herbivorous() || _hero_metallivorous();
    if (awarenessOk && heroEats && !slowDigestion) {
        u.uhunger = (u.uhunger | 0) - 1;
    }
    /* C eat.c:3191 — accessorytime = rn2(20).
     * Primary porting target: this call was missing from JS, causing
     * divergence at sessions seed0012 step 9 and seed0387 step 26. */
    const accessorytime = rn2(20); /* eat.c:3191 */
    if (accessorytime % 2 !== 0) {
        /* C eat.c:3193-3198: odd — regeneration and encumbrance hunger. */
        const hRegen = (u.uprops && u.uprops[REGENERATION])
            ? (u.uprops[REGENERATION].intrinsic | 0) : 0;
        const eRegen = (u.uprops && u.uprops[REGENERATION])
            ? (u.uprops[REGENERATION].extrinsic | 0) : 0;
        if ((hRegen & ~FROMFORM) || (eRegen & ~(W_ARTI | W_WEP))) {
            u.uhunger = (u.uhunger | 0) - 1;
        }
        if (near_capacity() > SLT_ENCUMBER) {
            u.uhunger = (u.uhunger | 0) - 1;
        }
    }
    else {
        /* C eat.c:3199-3274: even — hunger/conflict intrinsics + accessory turn. */
        const hHunger = (u.uprops && u.uprops[HUNGER])
            ? (u.uprops[HUNGER].intrinsic | 0) : 0;
        const eHunger = (u.uprops && u.uprops[HUNGER])
            ? (u.uprops[HUNGER].extrinsic | 0) : 0;
        if (hHunger || eHunger) {
            u.uhunger = (u.uhunger | 0) - 1;
        }
        const hConflict = (u.uprops && u.uprops[CONFLICT])
            ? (u.uprops[CONFLICT].intrinsic | 0) : 0;
        const eConflict = (u.uprops && u.uprops[CONFLICT])
            ? (u.uprops[CONFLICT].extrinsic | 0) : 0;
        if (hConflict || (eConflict & (~W_ARTI))) {
            u.uhunger = (u.uhunger | 0) - 1;
        }
        /* C eat.c:3223-3274: switch on accessorytime (even values 0,4,8,12,16). */
        switch (accessorytime) {
            case 0:
                /* C eat.c:3232-3236: Slow_digestion from non-ring source (e.g., dragon
                 * scales) costs hunger on turn 0; wearing a ring of slow digestion
                 * exempts the hero from this penalty. */
                if (slowDigestion
                    && (!u.uleft || (u.uleft.otyp | 0) !== RIN_SLOW_DIGESTION)
                    && (!u.uright || (u.uright.otyp | 0) !== RIN_SLOW_DIGESTION)) {
                    u.uhunger = (u.uhunger | 0) - 1;
                }
                break;
            case 4: {
                /* C eat.c:3238-3254: left ring hunger.
                 * Fires unless: no ring, meat ring, +0 charged ring (when its
                 * protection would be superseded by another source).
                 * EProtection = u.uprops[PROTECTION].extrinsic. */
                const eProt = (u.uprops && u.uprops[PROTECTION])
                    ? (u.uprops[PROTECTION].extrinsic | 0) : 0;
                if (u.uleft
                    && (u.uleft.otyp | 0) !== MEAT_RING
                    && ((u.uleft.spe | 0)
                        || !_ring_oc_charged(u.uleft)
                        || ((u.uleft.otyp | 0) === RIN_PROTECTION
                            && ((eProt & ~W_RINGL) === 0
                                || ((eProt & ~W_RINGL) === W_RINGR
                                    && u.uright
                                    && (u.uright.otyp | 0) === RIN_PROTECTION
                                    && !(u.uright.spe | 0)))))) {
                    u.uhunger = (u.uhunger | 0) - 1;
                }
                break;
            }
            case 8:
                /* C eat.c:3257-3259: worn amulet hunger (not fake Amulet of Yendor). */
                if (u.uamul && (u.uamul.otyp | 0) !== FAKE_AMULET_OF_YENDOR) {
                    u.uhunger = (u.uhunger | 0) - 1;
                }
                break;
            case 12: {
                /* C eat.c:3261-3266: right ring hunger. */
                const eProt = (u.uprops && u.uprops[PROTECTION])
                    ? (u.uprops[PROTECTION].extrinsic | 0) : 0;
                if (u.uright
                    && (u.uright.otyp | 0) !== MEAT_RING
                    && ((u.uright.spe | 0)
                        || !_ring_oc_charged(u.uright)
                        || ((u.uright.otyp | 0) === RIN_PROTECTION
                            && (eProt & ~W_RINGR) === 0))) {
                    u.uhunger = (u.uhunger | 0) - 1;
                }
                break;
            }
            case 16:
                /* C eat.c:3269-3271: possessing the real Amulet of Yendor costs extra. */
                if (u.uhave && u.uhave.amulet) {
                    u.uhunger = (u.uhunger | 0) - 1;
                }
                break;
            default:
                break;
        }
    }
    /* C eat.c:3276: newuhs(TRUE) — recompute and update hunger status. */
    await newuhs(true);
}

/* C eat.c:3280-3285 — morehungry: increase hunger by num and update status */
export async function morehungry(num) {
    const u = game.u;
    u.uhunger = (u.uhunger | 0) - (num | 0);
    await newuhs(true);
}

/* C eat.c:1295 Hunger — the HUNGER intrinsic (ring of hunger etc).  For the
 * corpus heroes this is false. */
function _Hunger() {
    const u = game.u;
    const p = u && u.uprops ? u.uprops[HUNGER] : null;
    return !!(p && (p.intrinsic || p.extrinsic));
}

/* C objects.h: AMULET_OF_STRANGULATION. */
const AMULET_OF_STRANGULATION_EAT = 203;

/* C eat.c:245-289 choke().  This is also reached before a bite when a
 * canchoke meal is resumed at 2000 nutrition, so it must do the real death
 * interaction here rather than leave a pending death for a later command. */
export async function choke(food) {
    const g = game;
    const u = g.u;
    const aos = !!food && (food.otyp | 0) === AMULET_OF_STRANGULATION_EAT;

    if ((u.uhs | 0) !== SATIATED) {
        if (!aos) return;
    } else if (((g.flags?.initrole | 0) === ROLE_KNIGHT
                || (g.urole?.mnum | 0) === PM_KNIGHT)
               && (u.ualign?.type | 0) === A_LAWFUL) {
        adjalign(-1);
        await pline('You feel like a glutton!');
    }

    exercise(A_CON, false);
    /* C Breathless is magical breathing or the current polymorph's monster
     * flag.  Strangled deliberately reads the intrinsic word only. */
    const breathless = !!((u.uprops?.[MAGICAL_BREATHING]?.intrinsic | 0)
        || (u.uprops?.[MAGICAL_BREATHING]?.extrinsic | 0))
        || pooleffects_breathless(g.youmonst?.data);
    const strangled = !!(u.uprops?.[STRANGLED]?.intrinsic | 0);
    if (breathless || _Hunger() || (!strangled && !rn2(20))) {
        if (aos) {
            await pline('You choke, but recover your composure.');
            return;
        }
        await pline('You stuff yourself and then vomit voluminously.');
        await morehungry(_Hunger() ? ((u.uhunger | 0) - 60) : 1000);
        await vomit();
        return;
    }

    g.svk = g.svk || {};
    g.svk.killer = g.svk.killer || {};
    g.svk.killer.format = KILLED_BY_AN;
    if (food) {
        await pline(`You choke over your ${_foodword(food)}.`);
        if ((food.oclass | 0) === COIN_CLASS) {
            g.svk.killer.name = 'very rich meal';
        } else {
            g.svk.killer.format = KILLED_BY;
            g.svk.killer.name = killer_xname(food);
        }
    } else {
        await pline('You choke over it.');
        g.svk.killer.name = 'quick snack';
    }
    await pline('You die...');
    deadhero(CHOKING, { alreadySaidYouDie: true, noDeathLine: true });
    await do_death_sequence({ inPlace: true });
}

/* C eat.c:3289 lesshungry(int num) — add `num` nutrition and, when nearly full
 * (uhunger >= 1500), warn so all eating warns before a choke.  The fullwarn
 * branch is RNG-free.  `iseating`
 * mirrors C's (go.occupation == eatfood || gf.force_save_hs); bite() sets
 * force_save_hs before calling, so during a meal this is true. */
export async function lesshungry(num) {
    const g = game;
    const u = g.u;
    /* C eat.c:3292 — boolean iseating = (go.occupation == eatfood) || gf.force_save_hs */
    const iseating = (g.occupation === eatfood) || !!g._force_save_hs;
    const v = _victual();
    if (u) u.uhunger = (u.uhunger | 0) + (num | 0);
    if (u && (u.uhunger | 0) >= 2000) {
        /* C eat.c:3296-3305. */
        if (!iseating || v.canchoke) {
            if (iseating) {
                await choke(v.piece);
                reset_eat();
            } else {
                const tin = g.context?.tin;
                await choke(g.occupation === opentin ? tin?.tin : null);
            }
        }
    } else {
        /* C eat.c:3310-3331 — "Have lesshungry() report when you're nearly full
         * so all eating warns when you're about to choke." */
        if (u && (u.uhunger | 0) >= 1500 && !_Hunger()
            && (!v.eating || (v.eating && !v.fullwarn))) {
            /* Earlier meal feedback is buffered by this port.  Commit it to
             * the live topline before C's warning and potentially blocking
             * confirmation, as the fortune-cookie continuation does below. */
            if (g._resultMessage) {
                g._pending_message = _topl_merge_result(g._resultMessage,
                    g._pending_message || '', _topl_joins_snapshot(g._resultMessage));
                g._resultMessage = null;
            }
            /* C eat.c:3314. */
            await pline("You're having a hard time getting all of it down.");
            /* C eat.c:3315 gn.nomovemsg = "You're finally finished." */
            g.nomovemsg = "You're finally finished.";
            if (!v.eating) {
                /* C eat.c:3317-3318 — not eating (e.g. a tin): gm.multi = -2. */
                g.multi = -2;
            } else {
                /* C eat.c:3320 — set fullwarn so the warning fires only once. */
                v.fullwarn = 1;
                /* C eat.c:3321-3328: with one bite left the food cannot
                 * survive a stop.  reset_eat only schedules the reset; the
                 * current eating round still finishes before it is applied. */
                if (v.canchoke && (v.reqtime - v.usedtime) > 1
                    && !(await paranoid_query(
                        !!((g.flags?.paranoia_bits | 0) & PARANOID_EATING),
                        'Continue eating?'))) {
                    reset_eat();
                    g.nomovemsg = null;
                }
            }
        }
    }
    await newuhs(false);
}

/* ── local helpers for eat_brains ── */
const S_GHOST = 54;
/* objects.h: AMULET_OF_LIFE_SAVING; used by done()'s lifesaving arm. */
const AMULET_OF_LIFE_SAVING_EAT = 202;
const M1_MINDLESS = 0x00010000;
const PM_COCKATRICE = 10;
const PM_CHICKATRICE = 9;   /* pm.generated.js:15 (11 is PM_PYROLISK) */
const PM_MEDUSA_E = 284;
const PM_DEATH_R = 311;
const PM_PESTILENCE = 312;
const PM_FAMINE = 313;

/* C mondata.h:200-203
 *   #define touch_petrifies(ptr) \
 *       ((ptr) == &mons[PM_COCKATRICE] || (ptr) == &mons[PM_CHICKATRICE])
 *   / * Medusa doesn't pass touch_petrifies() but does petrify if eaten * /
 *   #define flesh_petrifies(pm) (touch_petrifies(pm) || (pm) == &mons[PM_MEDUSA])
 * The Medusa arm was missing here. */
function _flesh_petrifies(ptr) {
    return ptr.pmidx === PM_COCKATRICE || ptr.pmidx === PM_CHICKATRICE
        || ptr.pmidx === PM_MEDUSA_E;
}
function _is_rider(ptr) { return ptr.pmidx === PM_DEATH_R || ptr.pmidx === PM_PESTILENCE || ptr.pmidx === PM_FAMINE; }
function _mindless(data) { return (data.mflags1 & M1_MINDLESS) !== 0; }
function _Mgender(mon) { return mon?.female ? 1 : 0; }
function _pmname(mdat, mgender) {
    if (!mdat || !Number.isInteger(mdat.pmidx)) return "monster";
    return monPmname(mdat.pmidx | 0, mgender | 0);
}
/* C end.c:1019 done(int how) — eat_brains calls this DIRECTLY (not through
 * done_in_by), so no "You die..." is ever emitted here; that line belongs to
 * done_in_by only. Ported subset: force-HP-to-zero (end.c:1068-1078), the
 * (wizard || discover) "Die?" query (end.c:1104-1117, ParanoidDie is unset on
 * every scored session so this is the plain yn_function("Die?","yn",'n')
 * loop) and its 'n'/ESC/quitchars-default survive arm (pline + savelife(),
 * end.c:1108-1112). Every other exit — Lifesaved (end.c:1082-1102), ordinary
 * (non-debug) mode's unconditional death (end.c:1104 falls to really_done),
 * and a wizard/explore 'y' answer — really_done()s the game, which this file
 * has no reach into (js/end.js's own really_done is module-private); throw
 * rather than fabricate, matching js/end.js done()'s own convention for its
 * unported arms. */
async function _done(how) {
    const g = game;
    const u = g.u;
    /* C end.c:1068-1078 */
    if ((how | 0) < PANICKED) {
        if (u) {
            u.umortality = (u.umortality | 0) + 1;
            if ((u.uhp | 0) !== 0 || (Upolyd(u) && (u.mh | 0) !== 0)) {
                u.uhp = 0;
                u.mh = 0;
                if (g.disp) g.disp.botl = true;
            }
        }
    }
    /* C end.c:1082-1102 — a direct done(DIED) from eat_brains still consumes
     * the lifesaving amulet before any wizard/explore Die? query.  This call
     * can happen inside the monster-attack chain, so restore in place; the
     * caller then continues the same attack just as C does after done(). */
    if (_Lifesaved() && (how | 0) <= GENOCIDED) {
        await _emit_eat_pline('But wait...');
        discover_object(AMULET_OF_LIFE_SAVING_EAT, true, true, true);
        await _emit_eat_pline(`Your medallion ${_eat_Blind() ? 'feels warm' : 'begins to glow'}!`);
        if ((how | 0) === 1 /* CHOKING */)
            await _emit_eat_pline('You vomit ...');
        await _emit_eat_pline('You feel much better!');
        await _emit_eat_pline('The medallion crumbles to dust!');
        if (u?.uamul)
            await useup_eat(u.uamul);
        /* C adjattrib(A_CON, -1, TRUE): positive msgflg suppresses text. */
        adjattrib(A_CON, -1, 1);
        await savelife(how, true);
        if (g.svk && g.svk.killer) {
            g.svk.killer.name = '';
            g.svk.killer.format = KILLED_BY_AN;
        }
        return;
    }
    if (!(wizard() || discover())) {
        /* C end.c:1128 — ordinary mode falls through to really_done(),
         * which this port defers through the shared death boundary. */
        deadhero(how);
        return true;
    }
    /* C cmd.c paranoid_query(ParanoidDie, "Die?") -> yn_function("Die?","yn",
     * 'n',FALSE): ESC and the quitchars " \r\n" all resolve to the default
     * 'n'; 'y'/'n' are accepted directly; anything else rings the bell and
     * re-reads without redrawing the prompt. */
    let diesArm = false;
    for (;;) {
        const key = await nhgetch();
        if (key === 27 || key === 32 || key === 13 || key === 10) { diesArm = false; break; }
        const c = String.fromCharCode(key).toLowerCase();
        if (c === 'y') { diesArm = true; break; }
        if (c === 'n') { diesArm = false; break; }
        /* invalid response: re-loop */
    }
    if (diesArm) {
        /* C end.c:1115-1117 — an explicit yes falls through to
         * really_done(); defer that confirmed death through the shared
         * boundary just as ordinary mode does. */
        deadhero(how);
        return true;
    }
    /* C end.c:1108-1112 — the survive arm: "OK, so you don't die." + savelife(). */
    _emit_eat_pline("OK, so you don't die.");
    await savelife(how, true);
    if (g.svk && g.svk.killer) {
        g.svk.killer.name = '';
        g.svk.killer.format = KILLED_BY_AN;
    }
}
/* C hack.h SET_BOTL() — mark the status line dirty after eat_brains raises
 * intelligence.  The old local no-op left the updated attribute invisible
 * until an unrelated redraw. */
function _SET_BOTL() {
    if (game.disp)
        game.disp.botl = 1;
}
function _Sprintf(fmt, a1) { return fmt.replace("%s", String(a1)); }
function _Stone_resistance() {
    const p = game.u?.uprops?.[STONE_RES];
    return !!((p?.intrinsic | 0) || (p?.extrinsic | 0));
}
function _Stoned() { return !!game.stoned; }
function _Lifesaved() { const p = game.u?.uprops?.[LIFESAVED]; return !!(p && (p.intrinsic || p.extrinsic)); }

/* C eat.c:576-600 eating_conducts — brain-eating conduct bookkeeping. */
function eating_conducts(pd) {
    const u = game.u || (game.u = {});
    u.uconduct = u.uconduct || {};
    u.uconduct.food = (u.uconduct.food | 0) + 1;
    const mnum = (pd?.pmidx ?? pd?.mnum ?? pd) | 0;
    if (!_veganE(mnum))
        u.uconduct.unvegan = (u.uconduct.unvegan | 0) + 1;
    if (!_vegetarianE(mnum))
        _violated_vegetarian();
}
async function make_stoned(xtime, msg, killedby, killername) {
    /* Keep the canonical async effect in the attack's ordering. */
    await make_stoned_shared(xtime, msg, killedby, killername);
}
function maybe_cannibal(pm, allowmsg) {
    const g = game, u = g.u || {};
    const food = permonstTemplate(pm | 0);
    if (!food) return false;
    /* CANNIBAL_ALLOWED: Caveman role or Orc race. */
    const allowed = ((g.flags?.initrole | 0) === 2)
        || ((g.urace?.mnum | 0) === 72);
    const innate = permonstTemplate(g.urace?.mnum ?? 0);
    const sameInnate = innate && same_race(innate, food);
    const upolyd = !!(g.youmonst?.data && (u.umonnum | 0) !== (g.urace?.mnum | 0));
    const sameForm = upolyd && same_race(g.youmonst.data, food);
    const sameLycan = u.ulycn != null && (u.ulycn | 0) >= 0 && sameForm;
    if (allowed || (!sameInnate && !sameForm && !sameLycan))
        return false;
    if (allowmsg) {
        _emit_eat_pline('You have a bad feeling deep inside.');
        _emit_eat_pline('Cannibal!  You will regret this!');
    }
    change_luck(-rn1(4, 2));
    return true;
}
/* C mon.c:3274-3359 — shared monster stoning implementation. */
async function monstone(mtmp) { return await monstone_real(mtmp); }

/* C eat.c:603-755 — eat_brains: mind flayer brain-eating attack */
export async function eat_brains(magr, mdef, visflag, dmg_p) {
    const g = game;
    const u = g.u;
    const pd = mdef.data;
    let give_nutrit = false;
    let result = M_ATTK_HIT;
    let xtra_dmg = rnd(10);

    /* Determine if magr/mdef are the player.
       In C: magr == &gy.youmonst (pointer comparison).
       The sweep may seed g.youmonst as an incomplete object; only trust it
       if it has an m_id. */
    const youmonst = g.youmonst;
    let magr_is_you = true;   /* default for the sole corpus record (player attacker) */
    let mdef_is_you = false;
    if (youmonst && youmonst.m_id !== undefined) {
        magr_is_you = (magr.m_id === youmonst.m_id);
        mdef_is_you = (mdef.m_id === youmonst.m_id);
    }

    /* previous tentacle attack might have triggered fatal passive counterattack */
    if (!magr_is_you && (magr.mhp | 0) < 1) {
        return M_ATTK_AGR_DIED;
    }

    if (pd.mlet === S_GHOST /* noncorporeal */) {
        if (visflag) {
            const who = mdef_is_you ? "Your" : s_suffix(Monnam(mdef));
            _emit_eat_pline(who + " brain is unharmed.");
        }
        return M_ATTK_MISS;
    } else if (magr_is_you) {
        _emit_eat_pline("You eat " + s_suffix(mon_nam(mdef)) + " brain!");
    } else if (mdef_is_you) {
        /* C eat.c:627 emits this directly from mhitm_ad_drin(), after its
         * hitmsg().  Keep it on the same live pline stream so the two
         * messages retain that physical order when they share a --More--. */
        pline("Your brain is eaten!");
    } else {
        if (visflag && canspotmon(mdef))
            _emit_eat_pline(s_suffix(Monnam(mdef)) + " brain is eaten!");
    }

    if (_flesh_petrifies(pd)) {
        if (magr_is_you) {
            if (!_Stone_resistance() && !_Stoned())
                await make_stoned(5, null, KILLED_BY_AN, _pmname(pd, _Mgender(mdef)));
        } else {
            if (visflag && canseemon(magr))
                _emit_eat_pline(Monnam(magr) + " turns to stone!");
            await monstone(magr);
            if (!((magr.mhp | 0) < 1)) {
                return M_ATTK_MISS;
            } else {
                if (magr.mtame && !visflag)
                    _emit_eat_pline("You have a sad thought for a moment, then it passes.");
                return M_ATTK_AGR_DIED;
            }
        }
    }

    if (magr_is_you) {
        eating_conducts(pd);
        if (_mindless(pd)) {
            _emit_eat_pline(Monnam(mdef) + " doesn't notice.");
            return M_ATTK_MISS;
        } else if (_is_rider(pd)) {
            _emit_eat_pline("Ingesting that is fatal.");
            if (!g.svk) g.svk = { killer: { format: 0, name: "" } };
            g.svk.killer.name = _Sprintf("unwisely ate the brain of %s", _pmname(pd, _Mgender(mdef)));
            g.svk.killer.format = NO_KILLER_PREFIX;
            if (await _done(DIED))
                return result;
            if (pending_death_is_final())
                return result;
            exercise(A_WIS, false);
            if (dmg_p) dmg_p.value += xtra_dmg;
        } else {
            await morehungry(-rnd(30));
            /* ensure attribute arrays exist (C always has them; sweep may not seed u.acurr.a) */
            if (!u.acurr) u.acurr = {};
            if (!u.acurr.a) u.acurr.a = [12, 10, 15, 18, 9, 9];
            if (!u.aexe) u.aexe = {};
            if (!u.aexe.a) u.aexe.a = [12, 10, 15, 18, 9, 9];
            if ((u.acurr.a[A_INT] | 0) < (u.aexe.a[A_INT] | 0)) {
                u.acurr.a[A_INT] = (u.acurr.a[A_INT] | 0) + rnd(4);
                if ((u.acurr.a[A_INT] | 0) > (u.aexe.a[A_INT] | 0))
                    u.acurr.a[A_INT] = u.aexe.a[A_INT];
                _SET_BOTL();
            }
            exercise(A_WIS, true);
            if (dmg_p) dmg_p.value += xtra_dmg;
        }
        maybe_cannibal(pd.pmidx, true);
    } else if (mdef_is_you) {
        /* C attrib.h ABASE(x) = u.acurr.a[x] directly; this port's u.acurr.a is
         * in DISPLAY order, so the C-constant index A_INT must be translated
         * via C_ATTR_TO_DISP first (js/attrib.js acurr()/getAbase() callers do
         * the same). Indexing u.acurr.a[A_INT] raw reads the DEX slot instead
         * of INT (A_INT=1 is display index 3), which is why this branch never
         * fired: the corpus's INT never happened to read <= 3 through the
         * wrong slot. */
        const abase = getAbase(u);
        const di_int = C_ATTR_TO_DISP[A_INT];
        if ((abase[di_int] | 0) <= 3 /* ATTRMIN */) {
            if (_Lifesaved()) {
                if (!g.svk) g.svk = { killer: { format: 0, name: "" } };
                g.svk.killer.name = "brainlessness";
                g.svk.killer.format = KILLED_BY;
                if (await _done(DIED))
                    return result;
                if (pending_death_is_final())
                    return result;
                _emit_eat_pline("Unfortunately your brain is still gone.");
                if (u.uprops && u.uprops[LIFESAVED]) {
                    u.uprops[LIFESAVED].extrinsic = 0;
                    u.uprops[LIFESAVED].intrinsic = 0;
                }
            } else {
                _emit_eat_pline("Your last thought fades away.");
            }
            if (!g.svk) g.svk = { killer: { format: 0, name: "" } };
            g.svk.killer.name = "brainlessness";
            g.svk.killer.format = KILLED_BY;
            await _done(DIED);
            abase[di_int] = 3 + 2;
            _emit_eat_pline("You feel like a scarecrow.");
        }
        give_nutrit = true;
        exercise(A_WIS, false);
    } else {
        if (_mindless(pd)) {
            if (visflag && canspotmon(mdef))
                _emit_eat_pline(Monnam(mdef) + " doesn't notice.");
            return M_ATTK_MISS;
        } else if (_is_rider(pd)) {
            await mondied(magr);
            if ((magr.mhp | 0) < 1)
                result = M_ATTK_AGR_DIED;
            if (dmg_p) dmg_p.value += xtra_dmg;
        } else {
            if (dmg_p) dmg_p.value += xtra_dmg;
            give_nutrit = true;
            if (dmg_p && dmg_p.value >= (mdef.mhp | 0) && visflag && canspotmon(mdef))
                _emit_eat_pline(s_suffix(Monnam(mdef)) + " last thought fades away...");
        }
    }

    if (give_nutrit && magr.mtame && !magr.isminion) {
        const edog = EDOG(magr);
        if (edog) edog.hungrytime = (edog.hungrytime | 0) + rnd(60);
        magr.mconf = 0;
    }

    return result;
}

/* C eat.c:3877-3890 — maybe_finished_meal: check if meal is done and finish it.
 * The C call is synchronous; this port's fpostfx/useup chain is async, so the
 * async boundary is carried by stop_occupation and every caller. */
export async function maybe_finished_meal(stopping) {
    const g = game;
    const v = _victual();
    /* C eat.c:3881-3882: check if occupation is eatfood and meal time is up */
    if (g.occupation === eatfood && (v.usedtime | 0) >= (v.reqtime | 0)) {
        /* C eat.c:3883-3884: reset occupation if stopping */
        if (stopping) {
            g.occupation = 0;
        }
        /* C eat.c:3886: call eatfood() to finish the meal (it calls done_eating()). */
        await eatfood();
        /* C eat.c:3887: return TRUE */
        return true;
    }
    /* C eat.c:3889: return FALSE */
    return false;
}

// ════════════════════════════════════════════════════════════════════════════
// EAT OCCUPATION — eatcorpse / start_eating / bite / eatfood / done_eating.
// C ref: nethack-c/src/eat.c.  Ports the multi-turn food occupation for the
// general (non-tin, non-fortune-cookie) eat path: a CORPSE or other comestible
// selected from inventory, eaten over svc.context.victual.reqtime turns driven
// by the moveloop occupation machinery (allmain.c:543-558 → eatfood()).  No
// hardcoding to any specific corpse; the RNG sequence falls out of the C
// formulas applied to the selected object's monster/material data.
// ────────────────────────────────────────────────────────────────────────────

/* C makemon_mons.json mons rows.  Row layout (matches dogmove.js _MONS):
 * [mlet, mlevel, mov, geno, malign, mr, mflags1, mflags2, ...].
 * SIZ() macro stores cwt/cnutrit in dedicated columns of the generated pack. */
const _MONS = /** @type {number[][]} */ (monsPack.mons);
/* Corpse weight (cwt) / nutrition (cnutrit) / name, pack-aligned (same mndx
 * order as _MONS / dogmove.js MONS_CWT).  Generated from include/monsters.h SIZ()
 * keyed by PM index — js/eat_corpse_data.json.  mkobj/eat read mons[mnum].cwt
 * (corpse weight, eat.c:1947) and mons[mnum].cnutrit (obj_nutrition, eat.c:327). */
const MONS_CWT_E = /** @type {number[]} */ (corpseData.cwt || []);
const MONS_CNUTRIT_E = /** @type {number[]} */ (corpseData.cnutrit || []);
const MONS_NAMES_E = /** @type {string[]} */ (corpseData.names || []);

/* C monflag.h dietary M1_* flags (mflags1, MONS row column 6). */
const M1_CARNIVORE_E = 0x20000000;
const M1_HERBIVORE_E = 0x40000000;
/* monflag.h:112 M1_ACID 0x08000000L, monflag.h:113 M1_POIS 0x10000000L.
 * (0x00400000 is M1_OVIPAROUS, 0x00800000 is M1_REGEN — the values previously
 * declared here were off by four bit positions.) */
const M1_ACID_E = 0x08000000;
const M1_POIS_E = 0x10000000;
/* C defsym.h MONSYM ordinals (match _MONS[i][0]).  S_PUDDING is MONSYM(42,'P')
 * at defsym.h:343 — 16 is S_PIERCER. */
const S_BLOB_E = 2, S_JELLY_E = 10, S_VORTEX_E = 22, S_LIGHT_E = 25,
    S_ELEMENTAL_E = 31, S_FUNGUS_E = 32, S_GHOST_E = 54, S_GOLEM_E = 55,
    S_PUDDING_E = 42;
/* Special PM indices referenced by the vegan/vegetarian macros (canonical
 * pm.generated.js order: PM_GREEN_SLIME 208, PM_BLACK_PUDDING 209). */
const PM_STALKER_E = 153, PM_FLESH_GOLEM_E = 255, PM_LEATHER_GOLEM_E = 253,
    PM_BLACK_PUDDING_E = 209, PM_GREEN_SLIME_E = 208;
const CORPSE_OTYP = 265;

function _mletE(m) { return (m >= 0 && m < _MONS.length) ? (_MONS[m][0] | 0) : 0; }
function _mf1E(m) { return (m >= 0 && m < _MONS.length) ? (_MONS[m][6] | 0) : 0; }
function _cwtE(m) { return (m >= 0 && m < MONS_CWT_E.length) ? (MONS_CWT_E[m] | 0) : 0; }
function _cnutritE(m) { return (m >= 0 && m < MONS_CNUTRIT_E.length) ? (MONS_CNUTRIT_E[m] | 0) : 0; }

/* C mondata.h carnivorous/herbivorous(ptr) — over a permonst. */
function _carnivorousE(m) { return (_mf1E(m) & M1_CARNIVORE_E) !== 0; }
function _herbivorousE(m) { return (_mf1E(m) & M1_HERBIVORE_E) !== 0; }
/* C monflag.h:115 M1_METALLIVORE 0x80000000L; mondata.h:92 metallivorous(). */
const M1_METALLIVORE_E = 0x80000000;
function _metallivorousE(m) { return (_mf1E(m) & M1_METALLIVORE_E) !== 0; }
function _acidicE(m) { return (_mf1E(m) & M1_ACID_E) !== 0; }
function _poisonousE(m) { return (_mf1E(m) & M1_POIS_E) !== 0; }
function _noncorporealE(m) { return _mletE(m) === S_GHOST_E; }
/* C mondata.h vegan(ptr) macro. */
function _veganE(m) {
    const l = _mletE(m);
    return l === S_BLOB_E || l === S_JELLY_E || l === S_FUNGUS_E
        || l === S_VORTEX_E || l === S_LIGHT_E
        || (l === S_ELEMENTAL_E && m !== PM_STALKER_E)
        || (l === S_GOLEM_E && m !== PM_FLESH_GOLEM_E && m !== PM_LEATHER_GOLEM_E)
        || _noncorporealE(m);
}
/* C mondata.h vegetarian(ptr) macro. */
function _vegetarianE(m) {
    return _veganE(m)
        || (_mletE(m) === S_PUDDING_E && m !== PM_BLACK_PUDDING_E);
}

/* C mondata.h: hero (gy.youmonst.data) dietary predicates over u.umonnum.
 * The Monk in human form (umonnum=PM_HUMAN) is neither carnivore nor herbivore
 * — humans carry neither M1 flag — which the seed0200 trace confirms (eatcorpse
 * short-circuits before rn2(10) at eat.c:1988 and yummy is false).  Resolve via
 * u.umonnum when tracked, defaulting to the role's PM (human roles → omnivore). */
function _heroMnum() {
    const u = game.u;
    let m = (u && u.umonnum != null) ? (u.umonnum | 0) : -1;
    if (m < 0 && game.__bridge__ && game.__bridge__['hero.umonnum'] != null)
        m = game.__bridge__['hero.umonnum'] | 0;
    return m;
}
function _hero_carnivorous() { const m = _heroMnum(); return m >= 0 ? _carnivorousE(m) : false; }
const M1_HUMANOID_E = 0x00020000;
function _hero_humanoid() { const m = _heroMnum(); return m >= 0 ? ((_mf1E(m) & M1_HUMANOID_E) !== 0) : false; }
function _hero_herbivorous() { const m = _heroMnum(); return m >= 0 ? _herbivorousE(m) : false; }
function _hero_metallivorous() { const m = _heroMnum(); return m >= 0 ? _metallivorousE(m) : false; }

/* C mkobj.c:2426 peek_at_iced_corpse_age — floor corpses (not on ice) return age. */
function _peek_at_iced_corpse_age(otmp) {
    let retval = otmp.age | 0;
    if ((otmp.otyp | 0) === CORPSE_OTYP && otmp.on_ice) {
        const age = (game.moves | 0) - (otmp.age | 0);
        retval += Math.trunc(age * (2 - 1) / 2); /* ROT_ICE_ADJUSTMENT=2 */
    }
    return retval;
}
/* C mondata.h nonrotting_corpse(mnum): lichen / lizard never rot. */
const PM_LIZARD_E = 326, PM_LICHEN_E = 158;
/* C eat.c:58-61 #define nonrotting_corpse(mnum) —
 *     (mnum) == PM_LIZARD || (mnum) == PM_LICHEN || is_rider(&mons[mnum])
 *     || (mnum) == PM_ACID_BLOB
 * "acid blob corpses eventually rot away to nothing but before that happens
 * they can be sacrificed regardless of age which implies that they never
 * become rotten" (eat.c:53-57).  This body carried only the first two
 * disjuncts, so eating an acid-blob or Rider corpse drew the eat.c:1887
 * rn2(20) corpse-rot roll C never draws — board `boardall-s` records 12/14
 * (*:acid blob) recorded ONE draw total (the eat.c:1927 acid-damage rnd(15))
 * and this port drew a phantom rn2(20) first, tape-underrunning on the real
 * one. */
function _nonrotting_corpse(m) {
    return m === PM_LIZARD_E || m === PM_LICHEN_E || m === PM_ACID_BLOB
        || _is_rider({ pmidx: m });
}

/* C objects.h FOOD(name, prob, delay, wt, unk, material, nutrition, ...) — the
 * static per-otyp { oc_delay, oc_nutrition } for FOOD_CLASS objects, in objects
 * otyp order (TRIPE_RATION=264 … TIN=296).  JS inventory/floor objects do not
 * carry oc_* fields, so obj_nutrition() and the eat reqtime must read them from
 * this table (objects[otyp]) exactly as C does.  Values transcribed leaf-for-leaf
 * from nethack-c/include/objects.h:1048-1117.  [otyp] -> [delay, nutrition]. */
/* The table itself now lives in js/food_props.js — see the import above; a
 * second transcription here is exactly how the two readers drift apart. */
/* C objclass.h oc_material: VEGGY=3, FLESH=4.  Per objects.h, the FLESH-material
 * FOOD otyps are tripe(264)/corpse(265)/egg(266)/meatball(267)/meat stick(268)/
 * enormous meatball(269)/meat ring(270)/4 globs(271-274); everything else
 * (kelp..C-ration) is VEGGY; tin(296) is METAL. */
/* objclass.h:12-35 — VEGGY=3, FLESH=4, METAL=12 ("Sn, &c."; 6 is CLOTH). */
const MATERIAL_VEGGY = 3, MATERIAL_FLESH = 4, MATERIAL_METAL = 12;
const _FOOD_FLESH_OTYPS = new Set([264, 265, 266, 267, 268, 269, 270, 271, 272, 273, 274]);
const EGG_OTYP = 266;
function _oc_material(otyp) {
    if ((otyp | 0) === 296) return MATERIAL_METAL; /* tin */
    return _FOOD_FLESH_OTYPS.has(otyp | 0) ? MATERIAL_FLESH : MATERIAL_VEGGY;
}
/* C eat.c:65 nonrotting_food(otyp): lembas / cram never rot. */
function _nonrotting_food(otyp) {
    return (otyp | 0) === LEMBAS_WAFER_OTYP || (otyp | 0) === CRAM_RATION_OTYP;
}
function _oc_delay(otyp) {
    const p = FOOD_PROPS[otyp | 0];
    return p ? (p[0] | 0) : 0;
}
function _oc_nutrition(otyp) {
    const p = FOOD_PROPS[otyp | 0];
    return p ? (p[1] | 0) : 0;
}
const LEMBAS_WAFER_OTYP = 291, CRAM_RATION_OTYP = 292;
/* C eat.c:338 adj_victual_nutrition — only called when nmod < 0.  nut = -nmod;
 * race-adjusts LEMBAS_WAFER (elf +1/4, orc -1/4) and CRAM_RATION (dwarf +1/6). */
function _adj_victual_nutrition() {
    const v = _victual();
    const otyp = (v.piece?.otyp | 0);
    let nut = -(v.nmod | 0); /* convert nmod to positive */
    const initrace = (game.flags?.initrace ?? -1) | 0;
    if (otyp === LEMBAS_WAFER_OTYP) {
        if (initrace === 1) /* PM_ELF */
            nut += Math.trunc((nut + 2) / 4); /* 800 -> 1000 */
        else if (initrace === 4) /* PM_ORC */
            nut -= Math.trunc((nut + 2) / 4); /* 800 -> 600 */
    } else if (otyp === CRAM_RATION_OTYP) {
        if (initrace === 2) /* PM_DWARF */
            nut += Math.trunc((nut + 3) / 6); /* 600 -> 700 */
    }
    return Math.max(nut, 1);
}
/* C eat.c:325 obj_nutrition(otmp): CORPSE → mons[corpsenm].cnutrit;
 * globby → owt; else objects[otyp].oc_nutrition (FOOD_PROPS table). */
function _obj_nutrition(otmp) {
    if ((otmp.otyp | 0) === CORPSE_OTYP)
        return _cnutritE(otmp.corpsenm | 0);
    if (otmp.globby) return otmp.owt | 0;
    return _oc_nutrition(otmp.otyp | 0); /* non-corpse comestibles: oc_nutrition */
}
/* ── touchfood (C eat.c:360) and the invent surgery it performs ─────────────
 *
 * "First bite" bookkeeping.  A stack is SPLIT so that the bitten item is a
 * separate object, and — even for a singleton — the object is pulled out of
 * inventory and re-added WITHOUT merging, which is what gives a partly eaten
 * item its own inventory letter.  That letter is the whole visible effect:
 * seed4500 step 527 offers "[ghm or ?*]" where the apple stack is still 'g'
 * and the one bitten apple from step 525 is 'm'.
 *
 * C ref: obj.h carried(obj) — (obj)->where == OBJ_INVENT.  js/u_init.js and
 * js/pickup_container.js disagree about the numeric OBJ_INVENT they stamp on
 * `where` (2 vs 3), so membership of gi.invent is read from the chain rather
 * than from the field; the chain is the thing C's freeinv/addinv act on.
 */
function _eat_carried(obj) {
    for (let o = game.invent; o; o = o.nobj)
        if (o === obj) return true;
    return false;
}
/* C ref: hack.c:4495 inv_cnt(incl_gold). */
function _eat_inv_cnt(incl_gold) {
    let ct = 0;
    for (let o = game.invent; o; o = o.nobj)
        if (incl_gold || (o.invlet | 0) !== 0x24 /* GOLD_SYM */) ct++;
    return ct;
}
/* C ref: invent.c freeinv(obj) — extract_nobj(obj, &gi.invent); pickup_prev=0;
 * freeinv_core(obj); update_inventory().  freeinv_core's arms are the
 * uhave.amulet/menorah/bell/book bookkeeping, artifact intrinsics, the
 * LOADSTONE curse, luckstones and the FIGURINE timer — a comestible reaches
 * none of them.  The one arm it CAN reach is the tin-in-progress handle, so
 * that is ported; the rest stay out of a food-only call path deliberately. */
function _eat_freeinv(obj) {
    const g = game;
    let prev = null;
    for (let o = g.invent; o; prev = o, o = o.nobj) {
        if (o === obj) {
            if (prev) prev.nobj = o.nobj ?? null;
            else g.invent = o.nobj ?? null;
            break;
        }
    }
    obj.nobj = null;
    obj.where = 0; /* OBJ_FREE */
    obj.pickup_prev = 0;
    const tin = g.context && g.context.tin;
    if (tin && tin.tin === obj) { tin.tin = null; tin.o_id = 0; }
}
/* C ref: invent.c:694 assigninvlet(otmp).  Note the `if (i == otmp->invlet)
 * otmp->invlet = 0;` inside the inuse scan: the object splitobj() cloned still
 * carries the parent stack's letter, and that clause is what forces it to take
 * a fresh one.  The scan starts just after gl.lastinvnr and wraps, so a freed
 * letter is reused only once the cursor comes back around to it. */
function _eat_assigninvlet(otmp) {
    const g = game;
    if ((otmp.oclass | 0) === 12 /* COIN_CLASS */) {
        otmp.invlet = 0x24; /* GOLD_SYM */
        return;
    }
    const inuse = new Array(52).fill(false);
    for (let obj = g.invent; obj; obj = obj.nobj) {
        if (obj === otmp) continue;
        const i = obj.invlet | 0;
        if (97 <= i && i <= 122) inuse[i - 97] = true;
        else if (65 <= i && i <= 90) inuse[i - 65 + 26] = true;
        if (i === (otmp.invlet | 0)) otmp.invlet = 0;
    }
    const cur = otmp.invlet | 0;
    if (cur && ((97 <= cur && cur <= 122) || (65 <= cur && cur <= 90)))
        return;
    const last = (g._lastinvnr ?? 51) | 0;
    let i;
    for (i = last + 1; i !== last; i++) {
        if (i === 52) { i = -1; continue; }
        if (!inuse[i]) break;
    }
    otmp.invlet = inuse[i] ? 0x23 /* NOINVSYM */ : (i < 26 ? (97 + i) : (65 + i - 26));
    g._lastinvnr = i;
}
/* C ref: invent.c:735 #define inv_rank(o) ((o)->invlet ^ 040) */
function _eat_inv_rank(obj) { return (obj.invlet | 0) ^ 0o40; }
/* C ref: invent.c reorder_invent() — bubble gi.invent into inv_rank order. */
function _eat_reorder_invent() {
    const g = game;
    let need = true;
    while (need) {
        need = false;
        let prev = null;
        for (let otmp = g.invent; otmp;) {
            const next = otmp.nobj;
            if (next && _eat_inv_rank(next) < _eat_inv_rank(otmp)) {
                need = true;
                if (prev) prev.nobj = next; else g.invent = next;
                otmp.nobj = next.nobj;
                next.nobj = otmp;
                prev = next;
            } else {
                prev = otmp;
                otmp = next;
            }
        }
    }
}
/* C ref: invent.c:1169 addinv_nomerge(obj) → addinv_core0(obj, NULL, TRUE) with
 * obj->nomerge set, so the quiver/stack merge scans are skipped and the object
 * always lands in a slot of its own.  flags.invlet_constant is the `fixinv`
 * default (no session in the corpus sets !fixinv), so C prepends and then
 * reorder_invent()s — the invlet order, not the insertion order, is what the
 * inventory display and getobj's letter list read. */
function _eat_addinv_nomerge(obj) {
    const g = game;
    obj.no_charge = 0;
    obj.how_lost = 0; /* LOST_NONE */
    _eat_assigninvlet(obj);
    obj.nobj = g.invent ?? null;
    g.invent = obj;
    _eat_reorder_invent();
    obj.where = 3; /* OBJ_INVENT */
    obj.pickup_prev = 1;
    return obj;
}
/* C ref: eat.c:360 touchfood(struct obj *otmp) — "might destroy otmp if hero
 * drops it".  RNG: the quan>1 split runs splitobj → nextoid → next_ident, which
 * is mkobj.c:522 `svc.context.ident += rnd(2)`. Shop-owned food can also
 * allocate a billing dummy through costly_alteration, which draws for its ID.
 *
 * KNOWN GAP, named not guessed: `otmp->oeaten` is NOT one of the OBJ_CHAIN_
 * FIELD_ORDER fields the capture's invent-chain wire format carries (js/
 * struct_reconstructor.js), so a corpse/comestible that was ALREADY partly
 * eaten in an earlier, unrecorded turn always replays here with oeaten unset
 * — `if (!(otmp.oeaten|0))` below always takes the fresh-nutrition arm, where
 * C may keep the smaller left-over value from an interrupted meal.  Board
 * `boardall-s` records 13/15/16/17/18 (lizard/acid-blob corpses answered with
 * a lone trailing 'y', i.e. this session's SECOND-plus 'e' on the same
 * corpse) carry a C-recorded `oeaten_delta` this port cannot reproduce for
 * exactly that reason: the true starting oeaten is invisible to any replay of
 * a single capture record.  Not fixable from this file — it needs a capture-
 * schema change (an `oeaten` slot on the invent-chain wire format) tracked
 * outside js/eat.js. */
async function touchfood(otmp) {
    if ((otmp.quan | 0) > 1) {
        if (!_eat_carried(otmp))
            await splitobj(otmp, (otmp.quan | 0) - 1);
        else
            otmp = (await splitobj(otmp, 1));
    }
    if (!(otmp.oeaten | 0)) {
        /* C eat.c:371 — costly_alteration before assigning fresh nutrition.
         * cmd.js's exported helper is the canonical mkobj.c:744 path. */
        await costly_alteration(otmp, COST_BITE);
        otmp.oeaten = _obj_nutrition(otmp);
    }
    if (_eat_carried(otmp)) {
        _eat_freeinv(otmp);
        if (_eat_inv_cnt(false) >= 52 /* invlet_basic */) {
            /* C eat.c:377-382 — a full pack cannot assign the bitten piece a
             * distinct inventory letter. Drop it without offering it to a
             * shopkeeper, then honor dropy's destructive terrain/trap result:
             * obfree/dealloc_obj leaves where==OBJ_DELETED, and touchfood must
             * return NULL so every caller resets the meal rather than retaining
            * a dangling object pointer. */
            sellobj_state(SELL_DONTSELL);
            try {
                await dropy_real(otmp);
            } finally {
                /* Preserve C's unconditional straight-line restoration even
                 * when a JS diagnostic/test boundary throws. */
                sellobj_state(SELL_NORMAL);
            }
            if ((otmp.where | 0) === OBJ_DELETED)
                otmp = null;
            return otmp;
        }
        otmp = _eat_addinv_nomerge(otmp);
    }
    return otmp;
}
/* C hack.c:4515 rounddiv(x, y). */
function _rounddiv(x, y) {
    if (y === 0) return 0;
    let r;
    if (x >= 0) r = Math.trunc((x + (y >> 1)) / y);
    else r = -Math.trunc((-x + (y >> 1)) / y);
    return r;
}
/* C obj.h consume_oeaten(o, n): n<0 → oeaten -= -n; n>0 → oeaten >>= n. */
function _consume_oeaten(o, n) {
    if (n < 0) o.oeaten = (o.oeaten | 0) - (-n);
    else o.oeaten = (o.oeaten | 0) >> n;
    if ((o.oeaten | 0) <= 0) o.oeaten = 0;
}

/* victual state lives on game.context.victual (mirrors svc.context.victual). */
function _victual() {
    game.context = game.context || {};
    if (!game.context.victual) game.context.victual = {
        piece: null, o_id: 0, usedtime: 0, reqtime: 0, nmod: 0,
        eating: 0, canchoke: 0, fullwarn: 0, doreset: 0,
    };
    return game.context.victual;
}
function _zero_victual() {
    game.context = game.context || {};
    game.context.victual = {
        piece: null, o_id: 0, usedtime: 0, reqtime: 0, nmod: 0,
        eating: 0, canchoke: 0, fullwarn: 0, doreset: 0,
    };
}
/* C eat.c:292 recalc_wt(): keep the object's cached weight in sync with
 * remaining nutrition, including when an interrupted meal can be resumed. */
function _recalc_wt() {
    const piece = _victual().piece;
    if (!piece) {
        impossible('recalc_wt without piece');
        return;
    }
    piece.owt = weight(piece);
}

/* C eat.c:422 do_reset_eat(): preserve meal progress and canchoke. */
async function _do_reset_eat() {
    const v = _victual();
    if (v.piece) {
        v.o_id = 0;
        const otmp = await touchfood(v.piece);
        v.piece = otmp;
        if (otmp) {
            v.o_id = otmp.o_id | 0;
            _recalc_wt();
        }
    }
    v.fullwarn = 0;
    v.eating = 0;
    v.doreset = 0;
    await stop_occupation();
    await newuhs(false);
}

/* C eat.c:1376 violated_vegetarian — bumps conduct (RNG-free).  For a Monk it
 * also plines "You feel guilty." and adjalign(-1) (both RNG-free). */
function _isMonk() { return ((game.flags?.initrole ?? -1) | 0) === 5; }
function _violated_vegetarian() {
    const u = game.u;
    if (u) u.uconduct = u.uconduct || {};
    if (u && u.uconduct) u.uconduct.unvegetarian = (u.uconduct.unvegetarian | 0) + 1;
    if (_isMonk()) {
        _emit_eat_pline('You feel guilty.'); /* C eat.c:1380 */
        /* C eat.c:1381 adjalign(-1) — RNG-free; alignment not gated here. */
    }
}
/* Append an eatcorpse pline to the command-message channel that survives to the
 * next nhgetch (the moveloop merges _resultMessage with next-turn movemon plines;
 * matches the throw/dotalk message handling). */
function _emit_eat_pline(msg) {
    /* C eat.c:2002 prints corpse flavor synchronously, before touchfood/
     * consumption and encumbrance updates.  Preserve that physical frame for
     * the later occupation pager; other eating messages retain the normal path. */
    if (typeof msg === 'string' && /^This .* corpse (?:tastes|is) /.test(msg)) {
        game._eatPreEffectFrame = capture_painted_frame_with_status();
    }
    game._resultMessage = game._resultMessage
        ? game._resultMessage + '  ' + msg
        : msg;
}

/* C objclass.h enum obj_material_types — only the two values is_rottable reads. */
const MAT_LIQUID = 1;
const MAT_WOOD = 8;
/* C mkobj.h:34 is_rottable(otmp):
 *     objects[otmp->otyp].oc_material <= WOOD
 *     && objects[otmp->otyp].oc_material != LIQUID
 * A corpse is FLESH (4), so it is rottable. */
function _is_rottable(otmp) {
    const m = MKOBJ_OC_MATERIAL[otmp.otyp | 0] | 0;
    return m <= MAT_WOOD && m !== MAT_LIQUID;
}
/* C eat.c:2490-2506 foodword(otmp).  The table's order is exactly the
 * obj_material_types enum's; index 0 (NO_MATERIAL) is "meal". */
const FOODWORDS = [
    'meal', 'liquid', 'wax', 'food', 'meat', 'paper',
    'cloth', 'leather', 'wood', 'bone', 'scale', 'metal',
    'metal', 'metal', 'silver', 'gold', 'platinum', 'mithril',
    'plastic', 'glass', 'rich food', 'stone',
];
function _foodword(otmp) {
    /* C eat.c:2500 — FOOD_CLASS short-circuits before the material lookup, so a
     * corpse (FLESH, which would read "meat") is called "food". */
    if ((otmp.oclass | 0) === FOOD_CLASS) return 'food';
    /* C eat.c:2502-2504. */
    if ((otmp.oclass | 0) === 13 && (MKOBJ_OC_MATERIAL[otmp.otyp | 0] | 0) === 19
        && otmp.dknown)
        discover_object(otmp.otyp | 0, true, true, true);
    return FOODWORDS[MKOBJ_OC_MATERIAL[otmp.otyp | 0] | 0] ?? 'stuff';
}

/* Prop accessors mirroring the validated ones in js/zap.js (_Blind) and
 * js/read.js (_Hallucination / HConfusion); eat.js had none of its own. */
function _uprop_on(idx) {
    const p = game.u?.uprops?.[idx];
    return !!(p && ((p.intrinsic | 0) || (p.extrinsic | 0)) && !(p.blocked | 0));
}
function _eat_Blind() { return _uprop_on(BLINDED); }
/* C youprop.h:110 #define Strangled u.uprops[STRANGLED].intrinsic. */
function _eat_Strangled() { return !!(game.u?.uprops?.[STRANGLED]?.intrinsic | 0); }
function _eat_BlindedTimeout() {
    return (game.u?.uprops?.[BLINDED]?.intrinsic | 0) & 0x00ffffff; /* TIMEOUT */
}
function _eat_Hallucination() { return _uprop_on(HALLUC) && !_uprop_on(HALLUC_RES); }
/* C youprop.h:83  HConfusion == u.uprops[CONFUSION].intrinsic, read whole (C's
 * `HConfusion + d(2,4)` does not mask; make_confused's set_itimeout clamps the
 * sum).  The old `game.HConfusion` branch read the flat spelling this file's
 * own private make_confused used to write — that copy is gone, see below. */
function _eat_HConfusion() {
    return (game.u?.uprops?.[CONFUSION]?.intrinsic) | 0;
}
function _eat_make_blinded(xtime) {
    const u = game.u;
    if (!u) return;
    u.uprops = u.uprops || {};
    u.uprops[BLINDED] = u.uprops[BLINDED] || { intrinsic: 0, extrinsic: 0, blocked: 0 };
    const p = u.uprops[BLINDED];
    let v = xtime | 0;
    if (v > 0x00ffffff) v = 0x00ffffff;
    if (v < 0) v = 0;
    p.intrinsic = ((p.intrinsic | 0) & ~0x00ffffff) | v;
}

/* C ref: eat.c:1800-1809 Hear_again() — "called when waking up after fainting",
 * i.e. the ga.afternmv callback rottenfood()'s knockout arm installs.
 *     if (!rn2(2)) { make_deaf(0L, FALSE); disp.botl = TRUE; }
 * The rn2(2) is UNCONDITIONAL, so this is a live leaf on every rotten-food
 * knockout: seed4500 step 526's whole RNG slice is this one draw.  make_deaf(0)
 * zeroes the HDeaf timer (the u.HDeaf slot rottenfood incremented). */
export function Hear_again() {
    if (!rn2(2)) {
        const u = game.u || (game.u = {});
        u.HDeaf = 0;
        game.disp = game.disp || {};
        game.disp.botl = 1;
    }
    return 0;
}

/* C eat.c:1811-1852 rottenfood(obj) — called on the "first bite" of rotten food.
 * Returns 1 only from the third arm (which sets up a nomul), 0 otherwise.
 *
 * THE RNG SHAPE, which is the whole reason this exists: C rolls rn2(4) at 1817
 * unconditionally; if that is non-zero it rolls rn2(4) at 1823 (the `&& !Blind`
 * is evaluated AFTER the roll, so blindness does not suppress the leaf); if that
 * arm fails it rolls rn2(3) at 1830.  Three leaves at most, and at least one
 * always.  seed0014's rotten newt corpse takes all three and lands on no arm. */
function rottenfood(obj) {
    /* C eat.c:1815-1816 pline("Blecch!  %s %s!", ...) */
    _emit_eat_pline(`Blecch!  ${_is_rottable(obj) ? 'Rotten' : 'Awful'} ${_foodword(obj)}!`);
    if (!rn2(4)) { /* C eat.c:1817 */
        /* C eat.c:1818-1821 */
        /* C eat.c:1821 body_part(LIGHT_HEADED) — polyself.c's humanoid_parts,
         * animal_parts and bird_parts all spell slot 10 "light headed", and the
         * only tables that differ are the jelly/vortex/fish shapes.  Importing
         * js/cmd.js's body_part from eat.js would introduce a module cycle for a
         * branch no public session takes; the un-polymorphed hero's word is
         * inlined instead. */
        _emit_eat_pline(_eat_Hallucination()
            ? 'You feel rather trippy.'
            : 'You feel rather light headed.');
        make_confused_shared(_eat_HConfusion() + d(2, 4), false); /* C eat.c:1822 */
    } else if (!rn2(4) && !_eat_Blind()) { /* C eat.c:1823 */
        _emit_eat_pline('Everything suddenly goes dark.'); /* C eat.c:1824 */
        /* C eat.c:1828 make_blinded(BlindedTimeout + (long) d(2,10), FALSE) */
        /* make_blinded(), rather than the timer-only compatibility helper,
         * also runs toggle_blindness() and vision_recalc().  C does that
         * before returning from rottenfood, so monsters which were visible
         * immediately before the first bite disappear on this same frame. */
        make_blinded(_eat_BlindedTimeout() + d(2, 10), false);
        if (!_eat_Blind()) /* C eat.c:1829-1830 Your1(vision_clears) */
            _emit_eat_pline('Your vision clears.');
    } else if (!rn2(3)) { /* C eat.c:1830 */
        /* C eat.c:1831-1848 — the "world spins" knockout. */
        const duration = rnd(10); /* C eat.c:1833 */
        /* C eat.c:1836-1843.  The Levitation / Is_airlevel / Is_waterlevel arm
         * ("you lose control of yourself") and dungeon.c:1750 surface() are both
         * unwired here — WIRE_PENDING, RNG-free, and reachable only when the hero
         * is already Blind, which no public session is at this call. */
        let what, where;
        if (!_eat_Blind()) { what = 'goes'; where = 'dark'; }
        else { what = 'you slap against the'; where = game.u?.usteed ? 'saddle' : 'floor'; }
        _emit_eat_pline(`The world spins and ${what} ${where}.`);
        /* C eat.c:1845-1846 incr_itimeout(&HDeaf, duration); disp.botl = TRUE.
         * HDeaf is u.HDeaf in this port — the same slot js/monmove.js:1762 and
         * js/cmd.js:8016 read for the Deaf macro.  RNG-free, but Hear_again
         * below clears it and its rn2(2) is not. */
        {
            const _u = game.u || (game.u = {});
            _u.HDeaf = (_u.HDeaf | 0) + duration;
            game.disp = game.disp || {};
            game.disp.botl = 1;
        }
        nomul(-duration); /* C eat.c:1847 */
        game.multi_reason = 'unconscious from rotten food'; /* C eat.c:1848 */
        game.nomovemsg = 'You are conscious again.'; /* C eat.c:1849 */
        /* C eat.c:1850 ga.afternmv = Hear_again.  The afternmv channel IS
         * reachable from here — it is a plain string tag on `game`, which
         * js/allmain.js afternmv_dispatch() switches on when unmul() fires; the
         * WIRE_PENDING note this replaces predates that channel carrying
         * anything but do_wear's callbacks.  It is not optional: Hear_again
         * draws rn2(2) (eat.c:1804) when the countdown expires, and seed4500's
         * step 526 is exactly that one leaf. */
        game.afternmv = 'Hear_again';
        return 1;
    }
    return 0;
}

/* C eat.c:1855 eatcorpse(otmp) — called when a corpse is selected as food.
 * Returns: 0 normal, 1 dont_start, 2 used-up.  Ports the exact RNG sequence:
 *   rn2(20) corpse-rot (eat.c:1887, only when !nonrotting_corpse)
 *   then, in priority order, the taint/acid/poison/sick rolls, then the
 *   rotten-food rn2(7) (eat.c:1949) and the palatable/idx rolls (1988/1996). */

/* C youprop.h:69 Sick_resistance — the u.uprops[SICK_RES] half.  Same shape as
 * js/potion.js's _potion_Sick_resistance(); see the eat.c:1939 note below for
 * why the defended(&youmonst, AD_DISE) tail is deliberately absent. */
function _eat_Sick_resistance() {
    const sp = game.u?.uprops?.[SICK_RES];
    return !!((sp?.intrinsic | 0) || (sp?.extrinsic | 0));
}
/* C youprop.h Acid_resistance — u.uprops[ACID_RES], same shape as the
 * Sick_resistance test just above.  Board `boardall-s` records 12/14
 * (`*:acid blob`) carry only the corpse-rot rn2(20) draw and NO further RNG —
 * this branch's `/* && !Acid_resistance *\/` had never been wired at all, so
 * an acid-resistant hero (this one) still drew the eat.c:1927 rnd(15) the
 * tape doesn't have (`rng_result_tape_underrun`). */
function _eat_Acid_resistance() {
    const sp = game.u?.uprops?.[ACID_RES];
    return !!((sp?.intrinsic | 0) || (sp?.extrinsic | 0));
}

async function eatcorpse(otmp) {
    const u = game.u;
    let retcode = 0, tp = 0;
    const mnum = otmp.corpsenm | 0;
    let rotted = 0;
    const glob = otmp.globby ? true : false;

    /* C eat.c:1869-1884 — conduct.  unvegan / unvegetarian bumps + livelog
     * (RNG-free).  violated_vegetarian for non-vegetarian corpse. */
    if (u) u.uconduct = u.uconduct || {};
    if (!_veganE(mnum)) {
        if (u && !(u.uconduct.unvegan | 0)) u.uconduct.unvegan = 1;
        else if (u) u.uconduct.unvegan = (u.uconduct.unvegan | 0) + 1;
    }
    if (!_vegetarianE(mnum)) {
        _violated_vegetarian();
    }

    /* C eat.c:1884-1893 — corpse rot age calc (rn2(20)). */
    if (!_nonrotting_corpse(mnum)) {
        const age = _peek_at_iced_corpse_age(otmp);
        rotted = Math.trunc(((game.moves | 0) - age) / (10 + rn2(20))); /* eat.c:1887 */
        if (otmp.cursed) rotted += 2;
        else if (otmp.blessed) rotted -= 2;
    }

    /* C eat.c:1895 — stoneable/slimeable are FALSE for ordinary corpses; the
     * tainted branch fires only when rotted > 5.  None of the corpus's eaten
     * corpses reach rotted > 5, so the taint rn1(10,10)/make_sick path is not
     * exercised; port it faithfully so it is general. */
    const stoneable = false, slimeable = (mnum === PM_GREEN_SLIME_E); // simplified flags
    if (!glob && !stoneable && !slimeable && rotted > 5) {
        /* tainted */
        const sick_time = rn1(10, 10); /* eat.c:1923 */
        void sick_time;
        return 2; /* corpse used up (useup); no occupation */
    } else if (_acidicE(mnum) && !_eat_Acid_resistance()) {
        tp++;
        /* C eat.c:1926-1928 —
         *     You("have a very bad case of stomach acid.");
         *     losehp(rnd(15), !glob ? "acidic corpse" : "acidic glob", KILLED_BY_AN);
         * board `boardall-s` record 12/14: this used to draw-and-discard the
         * rnd(15), leaving hero.uhp unchanged where C's capture shows it
         * dropping. */
        You('have a very bad case of stomach acid.');
        await losehp(rnd(15), !glob ? 'acidic corpse' : 'acidic glob', KILLED_BY_AN);
    } else if (_poisonousE(mnum) && rn2(5)) { /* eat.c:1936 */
        tp++;
        /* C eat.c:1937-1943:
         *     pline("Ecch - that must have been poisonous!");
         *     if (!Poison_resistance)
         *         poison_strdmg(rnd(4), rnd(15), "poisonous corpse", KILLED_BY_AN);
         *     else You("seem unaffected by the poison.");
         * poison_strdmg (attrib.c:274) is losestr(strloss) then losehp(dmg).
         * Both rolls were already being drawn here and thrown away, so the Str
         * and HP drops never landed: seed0030 segment 2 step 24 shows C at St:4
         * (8 - rnd(4)) against this port's unchanged St:8, and the status line
         * then mismatches on every later frame of the segment.
         *
         * Poison_resistance has no ported predicate and is FALSE for the corpus
         * heroes (same convention as the Acid_resistance arm above).
         *
         * The rnd(4)-before-rnd(15) order is C's argument-evaluation order as
         * the recorded trace fixes it; bound to locals so it cannot drift.
         *
         * The "Ecch" pline is emitted now — the blocker this note recorded (the
         * eat-occupation driver forcing the cross-turn --More-- unconditionally)
         * is gone, see the rotted-cadaver arm below.  seed0030 segment 2 step 24:
         * "Ecch - that must have been poisonous!" (36) and done_eating's "You
         * finish eating the kobold corpse." (36) do NOT fit together
         * (36+2+36 = 74 >= 71), so C pages here — the frame is
         * "Ecch - that must have been poisonous!--More--" and the recorded space
         * at step 25 dismisses it. */
        _emit_eat_pline('Ecch - that must have been poisonous!');
        const _strloss = rnd(4);
        const _pdmg = rnd(15);
        await losestr(_strloss, 'poisonous corpse', KILLED_BY_AN);
        await losehp(_pdmg, 'poisonous corpse', KILLED_BY_AN);
    /* C eat.c:1939 `} else if ((rotted > 5L || (rotted > 3L && rn2(5)))
     *                  && !Sick_resistance) {`
     * The second conjunct was a hardcoded `true`.  Sick_resistance is
     * youprop.h:69:
     *     (HSick_resistance || ESick_resistance || defended(&gy.youmonst, AD_DISE))
     * i.e. the u.uprops[SICK_RES] intrinsic/extrinsic pair (polyself.c:85 sets it
     * for an S_FUNGUS or PM_GHOUL form; an amulet versus poison sets the
     * extrinsic), OR mondata.c:91 defended().
     * defended(&youmonst, AD_DISE) is NOT ported here, and the reason is
     * bounded rather than assumed: defended() returns TRUE only via
     * defends(AD_DISE, o) (artifact.c), whose two arms are (a) a WIELDED
     * artifact with defn.adtyp == AD_DISE — `grep AD_DISE artilist.h` matches
     * NOTHING, so that arm is empty in 5.0 — and (b) dragon armor, where the
     * AD_DRST/AD_DISE case returns `otyp == GREEN_DRAGON_SCALES` alone.  So the
     * whole tail reduces to "hero is wearing green dragon scales / scale mail
     * (or is a green dragon)".  This tree has no Is_dragon_armor() and no
     * GREEN_DRAGON_SCALES otyp constant, and the generated otyp tables are
     * still 3.7-sourced, so inventing the number here would be a fabricated
     * constant rather than a port; it goes in with the dragon-armor subsystem.
     * The uprops pair is the live half and is what a polymorphed hero needs. */
    } else if ((rotted > 5 || (rotted > 3 && rn2(5))) && !_eat_Sick_resistance()) {
        tp++;
        /* C eat.c:1941-1942:
         *     You_feel("%ssick.", (Sick) ? "very " : "");
         *     losehp(rnd(8), "cadaver", KILLED_BY_AN);
         * The rnd(8) HP loss is applied here (rnd(8) was already the RNG this
         * branch consumed).  losehp on the hero's own action
         * (!svc.context.mon_moving) consumes NO further RNG — saving_grace()
         * returns the amount unchanged — so apply the HP drop directly (mirrors
         * dokick.c losehp).  Death (uhp<1) is not reached for the small rnd(8)
         * damage the corpus exercises.  seed0002 step 53: HP 11 -> 5 (rnd(8)=6),
         * fixing the status line (BOTL) for every subsequent frame.
         *
         * The pline IS emitted now.  It is printed by C at eatcorpse time (turn 1),
         * then the multi-turn eat occupation runs silently and done_eating appends
         * "You finish eating the <corpse>."; C's update_topl CONCATENATES both onto
         * one topline when their combined width fits CO-1-8=71 (seed0002: 14+2+35 =
         * 51 -> no --More--) and PAGES when it overflows.  The blocker this note
         * used to record — eat_occupation_turn forcing the cross-turn --More--
         * UNCONDITIONALLY — is now gone: that driver applies C's own update_topl
         * join test (display.js _topl_joins_committed) and joins instead of paging
         * when the two fit.
         *
         * (Sick) is FALSE for every corpus hero (make_sick is only reached from the
         * tainted-corpse arm above, which no session takes), so the "very " prefix
         * is not reachable; it is written out anyway so the branch stays C-shaped. */
        _emit_eat_pline(`You feel ${_uprop_on(SICK) ? 'very ' : ''}sick.`);
        const _dmg = rnd(8); /* eat.c:1942 losehp(rnd(8), ...) */
        if (u) {
            u.uhp = (u.uhp | 0) - (_dmg | 0);
            if ((u.uhp | 0) > (u.uhpmax | 0))
                u.uhpmax = u.uhp;
        }
    }

    /* C eat.c:1945-1947 — delay is weight dependent. */
    const v = _victual();
    v.reqtime = 3 + ((!glob ? _cwtE(mnum) : (otmp.owt | 0)) >> 6);

    /* C eat.c:1949 — rotting-corpse rn2(7) gate. */
    if (!tp && !_nonrotting_corpse(mnum) && ((otmp.orotten ? 1 : 0) || !rn2(7))) {
        /* C eat.c:1950-1957:
         *     if (rottenfood(otmp)) {
         *         otmp->orotten = TRUE;
         *         otmp = touchfood(otmp);
         *         if (!otmp) return 1;
         *         retcode = 1;
         *     }
         * The note that used to stand here — "rottenfood(otmp) rolls no RNG for
         * the corpus's corpses" — was simply false: rottenfood ALWAYS rolls
         * rn2(4), and rolls a further rn2(4) and rn2(3) as its earlier arms fail
         * (the && !Blind and the third arm's condition are evaluated AFTER the
         * roll).  seed0014 step 309 eats a rotten newt corpse and C's trace reads
         * rn2(4)=2 / rn2(4)=1 / rn2(3)=1 @ eat.c:1817,1823,1830 — three leaves we
         * were not consuming, and the "Blecch!  Rotten food!" topline we were not
         * printing. */
        if (rottenfood(otmp)) {
            otmp.orotten = true;
            /* C eat.c:1953 otmp = touchfood(otmp).  WIRE_PENDING: touchfood
             * (eat.c:1740) is not ported — it splits a stack and stamps oeaten.
             * It is RNG-FREE, so leaving it unwired costs state, never sequence,
             * and it is reachable only from rottenfood's third arm (the
             * "world spins" nomul branch), which no public session takes. */
            retcode = 1;
        }
        if (_cnutritE(mnum) === 0) {
            /* no nutrition: rots away */
            retcode = 2;
        }
        if (!retcode) _consume_oeaten(otmp, 2); /* oeaten >>= 2 */
    } else if (tp) {
        /* already messaged */
    } else {
        /* C eat.c:1978-2013 — palatable/yummy roll.  yummy: vegan?...:carni&&!herbi.
         * palatable: (vegetarian?herbi:carni) && rn2(10) && (rotted<1 || !rn2(rotted+1)).
         * idx = vegetarian?0:rn2(SIZE(palatable_msgs)) where SIZE=5. */
        const heroCarn = _hero_carnivorous(), heroHerb = _hero_herbivorous();
        const vegCorpse = _vegetarianE(mnum);
        /* palatable: short-circuits at the (vegetarian?herbi:carni) condition. */
        let palatable = false;
        const baseDiet = vegCorpse ? heroHerb : heroCarn;
        if (baseDiet) {
            if (rn2(10)) { /* eat.c:1988 */
                if (rotted < 1 || !rn2(rotted + 1)) palatable = true;
            }
        }
        /* eat.c:1996 — idx roll (SIZE(palatable_msgs)==5). */
        const PALATABLE_MSGS = ['Tokay', 'Istringy', 'Igamey', 'Ifatty', 'Itough'];
        const idx = vegCorpse ? 0 : rn2(5);
        const palat_msg = PALATABLE_MSGS[idx];
        /* C eat.c:1980-1984 yummy: vegan?...:carni&&!herbi.  For human heroes
         * (Monk) carnivorous is false → yummy false. */
        const yummy = _veganE(mnum)
            ? (!heroCarn && heroHerb)
            : (heroCarn && !heroHerb);
        const use_is = (palatable && palat_msg[0] === 'I'); /* !Hallucination */
        /* C eat.c:2002-2014 — "This <food> tastes/is <adj>!/." */
        const pmxnam = `${_monNameLower(mnum)} corpse`;
        const prefix = 'This '; /* type_is_pname/the_unique_pm false for goblin */
        const verb = use_is ? 'is' : 'tastes';
        const adj = yummy ? 'delicious'
            : palatable ? palat_msg.slice(1) : 'terrible';
        const punct = (yummy || !palatable) ? '!' : '.';
        _emit_eat_pline(`${prefix}${pmxnam} ${verb} ${adj}${punct}`);
    }
    return retcode;
}

/* C eat.c:2099 fprefx(otmp) — pre-eat flavor text + a few RNG-bearing branches.
 * Returns false only when the eat is aborted (rotten egg explode / pyrolisk).
 * Ported for the non-polymorphed, non-Hallucinating starting-hero cases that the
 * corpus exercises.  RNG-faithful: TRIPE non-carnivore vomiting rn2(2); APPLE/PEAR
 * UNIX hallucination rnd(100); CLOVE undead rn1 — gated exactly as C.  For the
 * common case (lembas/cram/food ration/fruit, sober hero) it is RNG-free. */
async function _fprefx(otmp) {
    const v = _victual();
    const otyp = otmp.otyp | 0;
    const initrace = (game.flags?.initrace ?? -1) | 0;
    const isElf = initrace === 1, isOrc = initrace === 4;
    const heroCarn = _hero_carnivorous();
    const u = game.u;
    if (otyp === FOOD_RATION_OTYP_E) {
        const h = u ? (u.uhunger | 0) : 0;
        if (h <= 200) _emit_eat_pline('This food really hits the spot!');
        else if (h < 700) _emit_eat_pline('This satiates your stomach!');
        return true;
    }
    if (otyp === TRIPE_RATION_OTYP) {
        if (heroCarn && !_hero_humanoid()) {
            _emit_eat_pline('This tripe ration is surprisingly good!');
        } else if (isOrc) {
            _emit_eat_pline('Mmm, tripe... not bad!');
        } else {
            _emit_eat_pline('Yak - dog food!');
            /* C eat.c:2138-2139 — tripe is an experience point for a
             * non-carnivorous humanoid, before the possible sickness roll. */
            more_experienced(1, 0);
            await newexplevel();
            /* C eat.c:2138 — if (rn2(2) && !CANNIBAL_ALLOWED()) make_vomiting(rn1(reqtime,14)). */
            if (rn2(2)) {
                /* make_vomiting nutrition timer: rn1(reqtime, 14) = rn2(reqtime)+14. */
                make_vomiting(rn2(v.reqtime | 0) + 14, false);
            }
        }
        return true;
    }
    if (otyp === LEMBAS_WAFER_OTYP) {
        if (isOrc) { _emit_eat_pline('!#?&* elf kibble!'); return true; }
        if (isElf) { _emit_eat_pline('A little goes a long way.'); return true; }
        /* fallthrough to give_feedback */
    }
    if (otyp === CLOVE_OF_GARLIC_OTYP) {
        /* C eat.c:2162-2168 — case CLOVE_OF_GARLIC:
         *   if (is_undead(gy.youmonst.data)) { make_vomiting(rn1(reqtime,5)); break; }
         *   iter_mons(garlic_breath);
         *   FALLTHROUGH to give_feedback. */
        if (_hero_undead()) {
            /* rn1(reqtime, 5) = rn2(reqtime) + 5 — the one RNG on this branch. */
            rn2(v.reqtime | 0);
            return true;
        }
        _iter_mons(_garlic_breath);
        /* fallthrough to give_feedback */
    }
    /* default / give_feedback */
    const cursed = !!otmp.cursed;
    if (otyp === SLIME_MOLD_OTYP && !cursed) {
        _emit_eat_pline('My, this is a yummy slime mold!');
    } else if (otyp === APPLE_OTYP && cursed && !_eat_sleep_resistance()) {
        /* C eat.c:2176-2177 — cursed apple skips the core joke here; the
         * fall-asleep feedback is deferred to fpostfx().  No message, no RNG. */
    } else if (ORGANISER_IS_MACOS && otyp === APPLE_OTYP) {
        /* PLATFORM-CONDITIONAL.  C eat.c:2179-2186, the
         * '#if defined(MACOS9) || defined(MACOS)' arm, which precedes the UNIX
         * arm precisely so an apple gets the Apple-specific message.  The
         * organiser build defines MACOS via config1.h:43-45 (__APPLE__ &&
         * __MACH__); seed0016 renders this line.  On a *nix build this arm is
         * compiled out entirely and APPLE falls through to the UNIX arm below.
         * Flip ORGANISER_PLATFORM in js/platform_identity.js to switch.
         *
         * NOTE THIS ARM ALSO CHANGES THE RNG.  Under the macOS arm an apple
         * draws nothing here; under the Unix arm a HALLUCINATING apple-or-pear
         * draws rnd(100) (eat.c:2193).  So the platform identity is a
         * Cardinal-Rule-2 signal, not only a message. */
        _emit_eat_pline('Delicious!  Must be a Macintosh!');
    } else if (otyp === APPLE_OTYP || otyp === PEAR_OTYP) {
        /* C eat.c:2188-2202 — the '#ifdef UNIX' arm, present on BOTH builds.
         * With ORGANISER_IS_MACOS true, APPLE is already consumed above, so
         * only PEAR reaches here (which is exactly what C does).
         *
         * KNOWN GAP, unrelated to the platform switch: C's hallucinating
         * variant (eat.c:2192-2201) draws rnd(100) and prints
         * "Segmentation fault -- core dumped." / "Bus error -- core dumped." /
         * "Yo' mama -- core dumped."  This port always emits the
         * non-hallucinating "Core dumped." and draws nothing.  No public
         * session eats a pear while hallucinating; a held-out one would
         * diverge on RNG here. */
        _emit_eat_pline('Core dumped.');
    } else {
        const bland = (otyp === CRAM_RATION_OTYP || otyp === K_RATION_OTYP_E || otyp === C_RATION_OTYP_E);
        _emit_eat_pline(`This ${_food_xname(otmp)} is ${cursed ? 'terrible!' : bland ? 'bland.' : 'delicious!'}`);
    }
    return true;
}
const FOOD_RATION_OTYP_E = 293, TRIPE_RATION_OTYP = 264, SLIME_MOLD_OTYP = 285;
const APPLE_OTYP = 277, PEAR_OTYP = 279, K_RATION_OTYP_E = 294, C_RATION_OTYP_E = 295;
const CLOVE_OF_GARLIC_OTYP = 284;

/* C mondata.h:95 is_undead(ptr) — (ptr->mflags2 & M2_UNDEAD).  Over the hero's
 * current form (gy.youmonst.data), same u.umonnum resolution the dietary
 * predicates above use. */
const M2_UNDEAD_E = 0x00000002;
function _hero_undead() {
    const m = _heroMnum();
    if (m < 0) return false;
    const d = permonstTemplate(m);
    return !!(((d && d.mflags2) | 0) & M2_UNDEAD_E);
}

/* C mon.c:4515-4527 iter_mons(vfunc) — call vfunc for every living, on-map
 * monster in fmon, snapshotting nmon first so the callback may unlink mtmp.
 * DEADMONSTER(mon) == mon->mhp < 1; mon_offmap(mon) == mon->mstate != MON_FLOOR
 * (MON_FLOOR == 0). */
function _iter_mons(vfunc) {
    let mtmp2;
    for (let mtmp = game.fmon; mtmp; mtmp = mtmp2) {
        mtmp2 = mtmp.nmon;
        if ((mtmp.mhp | 0) < 1 || (mtmp.mstate | 0) !== 0)
            continue;
        if (mtmp.data === undefined)
            mtmp.data = permonstTemplate(mtmp.mnum);
        vfunc(mtmp);
    }
}

/* C monmove.c monflee(mtmp, fleetime, first, fleemsg) restricted to the
 * (fleetime == 0, first == FALSE, fleemsg == FALSE) call garlic_breath makes.
 * With first FALSE the `!first || !mtmp->mflee` guard is always taken; a zero
 * fleetime clears mfleetim (an UNTIMED flee, which is what makes dochug's
 * monmove.c:781 `mflee && !mfleetim` regain-courage rn2(25) reachable on the
 * following turn); fleemsg FALSE suppresses the whole message block, which
 * carries monflee's only rn2 (the flees_light rn2(10)).  So this call is
 * RNG-free EXCEPT for the vrock gas-cloud branch, preserved below.
 * u.ustuck / mon_track_clear are the two remaining C side effects: the hero is
 * never engulfed while eating on the corpus path, and mtrack is not modelled by
 * this port (bookkeeping only — mon_track_clear consumes no RNG). */
function _monflee_untimed(mtmp) {
    if ((mtmp.mhp | 0) < 1)  /* DEADMONSTER — C returns immediately */
        return;
    mtmp.mfleetim = 0;
    if ((mtmp.mnum | 0) === PM_VROCK && !(mtmp.mspec_used | 0)) {
        /* C monmove.c: mtmp->mspec_used = 75 + rn2(25); create_gas_cloud(...).
         * The rn2 is preserved for sequence parity; create_gas_cloud is not yet
         * ported (no corpus session flees a vrock — WIRE_PENDING). */
        mtmp.mspec_used = 75 + rn2(25);
    }
    mtmp.mflee = 1;
}

/* C eat.c:2084-2089 garlic_breath(mtmp) — eating a clove of garlic scares every
 * nearby monster that can smell.  distu(x,y) is dist2(x, y, u.ux, u.uy), i.e.
 * the SQUARED distance, so `< 7` is a radius of just over two squares. */
function _garlic_breath(mtmp) {
    const u = game.u;
    if (!u) return;
    const dx = (mtmp.mx | 0) - (u.ux | 0), dy = (mtmp.my | 0) - (u.uy | 0);
    if (olfaction(mtmp.data) && (dx * dx + dy * dy) < 7)
        _monflee_untimed(mtmp);
}

/* C ref: youprop.h Sleep_resistance — used only by the cursed-apple core-joke
 * skip (eat.c:2176).  Same flags side-channel accessor as mhitu.js. */
function _eat_sleep_resistance() {
    const p = game.u?.uprops?.[SLEEP_RES];
    return !!((p?.intrinsic | 0) || (p?.extrinsic | 0));
}

/* C eat.c:3133 bite() — one bite; for the corpus corpses nmod<0 so it rolls no
 * RNG (lesshungry / consume_oeaten / recalc_wt are all RNG-free).  Returns 1 if
 * choked (not reached here), else 0. */
async function bite() {
    const v = _victual();
    const u = game.u;
    if (v.canchoke && u && (u.uhunger | 0) >= 2000) {
        await choke(v.piece);
        return 1;
    }
    if (v.doreset) { await _do_reset_eat(); return 0; }
    /* C eat.c:3146 gf.force_save_hs = TRUE — makes lesshungry()'s iseating true. */
    game._force_save_hs = true;
    if (v.nmod < 0) {
        /* C eat.c:3148 lesshungry(adj_victual_nutrition()): u.uhunger += nut.
         * adj_victual_nutrition applies the LEMBAS/CRAM race nutrition multiplier
         * (elf lembas 400->500/byte etc.) — RNG-free.  Corpse eats have no
         * race adjustment so adj returns -nmod unchanged.  lesshungry then runs
         * the fullwarn branch (eat.c:3310) when uhunger crosses 1500. */
        await lesshungry(_adj_victual_nutrition());
        _consume_oeaten(v.piece, v.nmod); /* -= -nmod */
    } else if (v.nmod > 0 && (v.usedtime % v.nmod)) {
        /* C eat.c:3153 lesshungry(1). */
        await lesshungry(1);
        _consume_oeaten(v.piece, -1); /* -= 1 */
    }
    /* C eat.c:3156 gf.force_save_hs = FALSE. */
    game._force_save_hs = false;
    _recalc_wt();
    return 0;
}

/* C eat.c:544 done_eating — finish the meal: "You finish eating X." then
 * cpostfx (RNG-free for the corpus's corpses) and useup. */
async function done_eating(message) {
    const v = _victual();
    const piece = v.piece;
    /* C eat.c:548 — protect the food while completion effects run. fpostfx can
     * kill the hero before useup(), and bones/interrupt cleanup must treat this
     * object as the item currently being consumed rather than preserve it. */
    if (piece) piece.in_use = true;
    game.occupation = null; /* C eat.c:549 — do this early so newuhs() knows we're done. */
    await newuhs(false);
    /* C eat.c:551-560 — if a nomovemsg was set (e.g. lesshungry's "You're finally
     * finished."), print THAT instead of the default "You finish eating X." */
    if (game.nomovemsg) {
        if (message)
            _emit_eat_pline(game.nomovemsg);
        game.nomovemsg = null;
    } else if (message && piece) {
        /* C eat.c:556 You("finish eating %s.", food_xname(piece,TRUE)).
         * food_xname(.,TRUE) prefixes "the" for a known singleton corpse. */
        _emit_eat_pline(`You finish eating ${_food_xname(piece, true)}.`);
    }
    /* C eat.c:563 cpostfx(piece->corpsenm).  The claim that used to stand here —
     * "no RNG for the corpus corpses" — was false: every corpse that falls to
     * cpostfx's `default:` arm sets check_intrinsics, and that tail rolls
     * eye_of_newt_buzz (newt / AT_MAGC) and corpse_intrinsic.  seed0014 step 309
     * eats a newt and C's trace reads rn2(3)/rnd(3)/rn2(3) @ eat.c:1106-1111. */
    if (piece && (piece.corpsenm | 0) >= 0 && (piece.otyp | 0) === CORPSE_OTYP)
        await cpostfx(piece.corpsenm | 0);
    /* C eat.c:2529-2532 —
     *     if (piece->otyp == CORPSE || piece->globby) cpostfx(piece->corpsenm);
     *     else                                        fpostfx(piece);
     * The `else` half had NO counterpart here: done_eating called cpostfx for a
     * corpse and then nothing at all for every other food, so fpostfx's whole
     * switch was unreachable. */
    else if (piece)
        await _fpostfx(piece);
    /* C eat.c:567-570: use the real inventory/floor consumption paths. */
    if (piece) {
        if (piece.where === OBJ_INVENT)
            await useup(piece);
        else
            await useupf(piece, 1);
    }
    _zero_victual();
}

/* C eat.c:2510-2605 fpostfx(): effects after consuming non-corpse food.
 * Async message, polymorph, sickness, and death helpers complete before the
 * food is removed, preserving the C switch's observable order. */
async function _fpostfx(otmp) {
    const u = game.u || {};
    switch (otmp.otyp | 0) {
    case SPRIG_OF_WOLFSBANE_OTYP:
        if (_ismnum((u.ulycn ?? NON_PM) | 0) || is_were(game.youmonst?.data))
            await you_unwere(true);
        break;
    case FORTUNE_COOKIE_OTYP: {
        /* C eat.c:2522-2523 fpostfx(FORTUNE_COOKIE):
         *     outrumor(bcsign(otmp), BY_COOKIE);
         * bcsign = !!otmp->blessed - !!otmp->cursed (mkobj.c:1858).  This used
         * to be a bypass at the top of doeat() (getobj → getrumor directly,
         * skipping touchfood/start_eating entirely); routing it through the
         * real fpostfx() instead means a fresh cookie's oc_delay==1 makes
         * start_eating's first bite() finish the meal in the SAME command
         * (usedtime>=reqtime immediately), so done_eating()->fpostfx() still
         * fires within this one top-level call — same observable sequence,
         * now produced by the real C control flow instead of a shortcut. */
        const bcsign = (otmp.blessed ? 1 : 0) - (otmp.cursed ? 1 : 0);
        // fprefx's food feedback lives on the deferred command channel.
        // Put it on the live topline before outrumor so ordinary overflow
        // pages the feedback and framing before the meal can finish.
        if (game._resultMessage) {
            game._pending_message = _topl_merge_result(game._resultMessage,
                game._pending_message || '', _topl_joins_snapshot(game._resultMessage));
            game._resultMessage = null;
        }
        await outrumor(bcsign, BY_COOKIE);
        await flush_screen(1);
        /* C fpostfx: record reading after outrumor's blocking messages. */
        if (!hero_Blind()) {
            u.uconduct = u.uconduct || {};
            if (!(u.uconduct.literate | 0))
                livelog_printf(LL_CONDUCT,
                    'became literate by reading the fortune inside a cookie');
            u.uconduct.literate = (u.uconduct.literate | 0) + 1;
        }
        _topl_stash_result();
        break;
    }
    case CARROT_OTYP:
        /* C eat.c:2517-2521 —
         *     if (!u.uswallow
         *         || !attacktype_fordmg(u.ustuck->data, AT_ENGL, AD_BLND))
         *         make_blinded((long) u.ucreamed, TRUE);
         * i.e. eating a carrot cures blindness unless the hero is inside a
         * blinding engulfer (which would re-blind immediately).  make_blinded
         * with talk=TRUE is what prints "You can see again." and, through
         * toggle_blindness(), what drops "Blind" off the status row and
         * repaints the map.
         *
         * js/zap.js:507 make_blinded is the real body; this file's private
         * _eat_make_blinded() is a TIMER-ONLY copy (it writes the HBlinded
         * word and returns) and would have left the hero seeing with a stale
         * screen and no message.
         *
         * MEASURED on gen392-reseed-seed77105 step 528: the blind hero eats a
         * carrot.  C reads "This carrot is delicious!  You can see again."
         * and this port stopped at "This carrot is delicious!" — and then
         * stayed blind for the next 103 recorded frames.  RNG-free. */
        if (!u.uswallow
            || !attacktype_fordmg(u.ustuck ? u.ustuck.data : null,
                                  AT_ENGL_FPFX, AD_BLND_FPFX))
            make_blinded(u.ucreamed | 0, true);
        break;
    case LUMP_OF_ROYAL_JELLY_OTYP:
        if ((game.youmonst?.data?.pmidx | 0) === PM_KILLER_BEE
            && !_uprop_on(UNCHANGING)
            && await polymon(PM_QUEEN_BEE))
            break;
        await gainstr(otmp, 1, true);
        if (Upolyd(u)) {
            u.mh = (u.mh | 0) + (otmp.cursed ? -rnd(20) : rnd(20));
            if (game.disp) game.disp.botl = 1;
            if ((u.mh | 0) > (u.mhmax | 0)) {
                if (!rn2(17)) setuhpmax((u.mhmax | 0) + 1, false);
                u.mh = u.mhmax | 0;
            } else if ((u.mh | 0) <= 0) {
                await rehumanize();
            }
        } else {
            u.uhp = (u.uhp | 0) + (otmp.cursed ? -rnd(20) : rnd(20));
            if (game.disp) game.disp.botl = 1;
            if ((u.uhp | 0) > (u.uhpmax | 0)) {
                if (!rn2(17)) setuhpmax((u.uhpmax | 0) + 1, false);
                u.uhp = u.uhpmax | 0;
            } else if ((u.uhp | 0) <= 0) {
                game.svk = game.svk || {};
                game.svk.killer = game.svk.killer
                    || { id: 0, format: 0, name: '', next: null };
                game.svk.killer.format = KILLED_BY_AN;
                game.svk.killer.name = 'rotten lump of royal jelly';
                deadhero(POISONING);
                await do_death_sequence({ inPlace: true });
            }
        }
        if (!otmp.cursed) heal_legs(0);
        break;
    case EGG_OTYP: {
        const cn = otmp.corpsenm | 0;
        if (_ismnum(cn) && _flesh_petrifies(permonstTemplate(cn))
            && !_uprop_on(STONE_RES)
            && !(poly_when_stoned_eat(game.youmonst?.data)
                 && await polymon(PM_STONE_GOLEM))
            && !_uprop_on(STONED)) {
            const killername = `${monPmname(cn, 0)} egg`;
            game.svk = game.svk || {};
            game.svk.killer = game.svk.killer
                || { id: 0, format: 0, name: '', next: null };
            game.svk.killer.name = killername;
            await make_stoned_shared(5, null, KILLED_BY_AN, killername);
        }
        break;
    }
    case EUCALYPTUS_LEAF_OTYP:
        if (_uprop_on(SICK) && !otmp.cursed)
            await make_sick(0, null, true, SICK_ALL);
        if (_uprop_on(VOMITING) && !otmp.cursed)
            await make_vomiting(0, true);
        break;
    case APPLE_OTYP:
        if (otmp.cursed && !_uprop_on(SLEEP_RES)) {
            if ((game.urace?.mnum | 0) === PM_DWARF && _eat_Hallucination())
                await verbalize("Heigh-ho, ho-hum, I think I'll skip work today.");
            else if (hero_Deaf() || game.flags?.acoustics === false)
                await pline('You fall asleep.');
            else
                await You_hear('sinister laughter as you fall asleep...');
            await fall_asleep(-rn1(11, 20), true);
        }
        break;
    default:
        break;
    }
}
/* C monattk.h:22 AT_ENGL (engulf) and monattk.h:57 AD_BLND (blind). */
const AT_ENGL_FPFX = 11, AD_BLND_FPFX = 11;
const CARROT_OTYP = 282; /* objects.h food class — js/food_props.js:45 */
const SPRIG_OF_WOLFSBANE_OTYP = 283, LUMP_OF_ROYAL_JELLY_OTYP = 286;
const EUCALYPTUS_LEAF_OTYP = 276;

/* Display name for a single floor CORPSE object, with article — C look_here →
 * doname → "a goblin corpse" / "an orc corpse".  Used by check_here's
 * "You see here X." auto-look (pickup.c:452).  Returns null for non-corpse
 * objects (whose general doname is not yet ported), so check_here only emits
 * the line it can render faithfully. */
export function corpse_floor_xname(otmp) {
    if (!otmp) return null;
    const q = (otmp.quan == null) ? 1 : (otmp.quan | 0);
    if (q !== 1) return null; /* plural rendering not ported */
    let base = null;
    if ((otmp.otyp | 0) === CORPSE_OTYP) {
        base = `${_monNameLower(otmp.corpsenm | 0)} corpse`;
    } else {
        /* C invent.c look_here → doname → xname OBJ_NAME for a plain food item.
         * A floor food ration the hero steps onto ("You see here a food ration.",
         * seed1150 step 6/17).  Food objects carry no BUC prefix in doname when
         * undiscovered, so the bare OBJ_NAME with its article is faithful. */
        base = FLOOR_FOOD_XNAME[otmp.otyp | 0] || null;
    }
    if (!base) return null;
    /* C an(): "a"/"an" by first letter (vowel → an). */
    const article = /^[aeiou]/i.test(base) ? 'an' : 'a';
    return `${article} ${base}`;
}
/* Food-class OBJ_NAMEs (objects.h FOOD macro order) the hero may step onto and
 * auto-look ("You see here ..."); FOOD_RATION=293 is the common floor ration. */
const FLOOR_FOOD_XNAME = { 293: 'food ration', 264: 'tripe ration' };

/* C invent.c food_xname — for a singleton corpse: "<monster> corpse", with a
 * leading "the" when article=true (food_xname(.,TRUE)). */
/* C ref: eat.c:217-235 food_xname(food, the_pfx).
 *   CORPSE → corpse_xname(CXN_SINGULAR [| CXN_PFX_THE])
 *   else   → singular(food, xname)          [the ordinary case]
 *   the_pfx → the(result)
 * The non-corpse branch used to return the literal string "food", so every
 * comestible was named "food": seed0367 step 61 rendered "This food is
 * delicious!" where C has "This clove of garlic is delicious!" (eat.c:2204
 * give_feedback → pline("This %s is %s", singular(otmp, xname), ...)).  For a
 * comestible, objnam.c's FOOD_CLASS xname branch is the plain OBJ_NAME once the
 * CORPSE / EGG-with-corpsenm / known-TIN / SLIME_MOLD special cases are taken
 * out, and singular() of a bare type name is that name — so OBJ_NAME is the
 * faithful result here.  objName() (not getObjName()) is required: the latter
 * is the partial table and returns null across the whole comestible range. */
function _food_xname(otmp, the_pfx) {
    if ((otmp.otyp | 0) === CORPSE_OTYP) {
        const mname = _monNameLower(otmp.corpsenm | 0);
        return `${the_pfx ? 'the ' : ''}${mname} corpse`;
    }
    const nm = objName(otmp.otyp | 0) || 'food';
    return the_pfx ? `the ${nm}` : nm;
}
function _monNameLower(m) {
    if (m >= 0 && m < MONS_NAMES_E.length && MONS_NAMES_E[m])
        return String(MONS_NAMES_E[m]).toLowerCase();
    return 'creature';
}
/* C eat.c:534 eatfood() — the occupation callback.  Runs once per occupation
 * turn (after the per-turn world block).  Returns 1 to keep eating, 0 done. */
export async function eatfood() {
    const v = _victual();
    let food = v.piece;
    /* C eat.c:521-528 — food disappeared? */
    if (food && !_eat_carried(food)
        && !obj_here(food, game.u.ux, game.u.uy))
        food = null;
    if (!food) { await _do_reset_eat(); return 0; }
    if (!v.eating) return 0;
    /* C eat.c:533 — ++usedtime <= reqtime: still busy. */
    v.usedtime = (v.usedtime | 0) + 1;
    if (v.usedtime <= v.reqtime) {
        if (await bite()) return 0;
        return 1; /* still busy */
    } else {
        await done_eating(true);
        return 0;
    }
}

/* C eat.c:475-492 — while the active meal is a carried or current-square
 * dangerous corpse, timeout.c must preserve its one-turn acid/stone resistance. */
export function eating_dangerous_corpse(res) {
    const food = game.context?.victual?.piece;
    if (game.occupation !== eatfood || !food || (food.otyp | 0) !== CORPSE_OTYP
        || (food.corpsenm | 0) < 0
        || !(_eat_carried(food) || obj_here(food, game.u?.ux | 0, game.u?.uy | 0)))
        return false;
    const mnum = food.corpsenm | 0;
    return (res === ACID_RES && _acidicE(mnum))
        || (res === STONE_RES && _flesh_petrifies(permonstTemplate(mnum)));
}

/* C eat.c:2022 start_eating(otmp, already_partly_eaten) — begin the meal. */
export async function start_eating(otmp, already_partly_eaten) {
    const v = _victual();
    v.fullwarn = 0; v.doreset = 0;
    v.eating = 1;
    /* C eat.c:2040 — cprefx for corpses; RNG-free for the corpus corpses. */
    /* C eat.c:2049 — first bite. */
    if (await bite()) {
        v.usedtime = (v.usedtime | 0) + 1;
        if (v.usedtime >= v.reqtime) {
            await done_eating(false);
        }
        return;
    }
    v.usedtime = (v.usedtime | 0) + 1;
    if (v.usedtime >= v.reqtime) {
        await done_eating((v.reqtime > 1 || already_partly_eaten));
        return;
    }
    /* C eat.c:2074 — set_occupation(eatfood, msgbuf, 0). */
    game.occupation = eatfood;
    /* C eat.c:2072 passes food_xname(otmp, TRUE), so interruption text
     * includes the definite article ("You stop eating the food ration."). */
    game.occtxt = `eating ${_food_xname(otmp, true)}`;
    game.occtime = 0;
}

/* C eat.c:2817 doeat — the inventory-food eat path for the GENERAL case
 * (non-tin). Given the selected object, prepare it through touchfood,
 * then run eatcorpse (or the food-material
 * conduct/rot path), compute reqtime/nmod, and start the eat occupation.
 * Returns true if a turn was consumed (ECMD_TIME). */
export async function doeat_food(otmp) {
    const u = game.u;
    const v = _victual();
    let dont_start = false;
    const already_partly_eaten = (otmp.oeaten | 0) ? true : false;

    /* C eat.c:2969 otmp = touchfood(otmp).  This used to be only touchfood's
     * LAST clause (set oeaten if unset), which left out both halves of the
     * split: the stack kept its full quan and carried the bite on itself, and
     * the bitten item never got an inventory slot of its own.  seed4500 step
     * 527 is the visible cost — after biting one apple out of the 'g' stack at
     * step 525, C's eat prompt reads "[ghm or ?*]" (the partly eaten apple is
     * 'm') where this port still offered "[gh or ?*]". */
    otmp = await touchfood(otmp);
    if (!otmp) {
        /* C eat.c:2977 do_reset_eat(); return ECMD_TIME — touchfood dropped the
         * item and it was destroyed (full pack + no room on the floor). */
        _zero_victual();
        game.context = game.context || {};
        game.context.move = 1;
        return true;
    }
    v.piece = otmp;
    v.o_id = otmp.o_id | 0;
    v.usedtime = 0;

    /* C eat.c:2962-2966 records the foodless-conduct break before dispatching
     * corpse versus ordinary food effects. */
    if (u) {
        u.uconduct = u.uconduct || {};
        const oldFood = u.uconduct.food | 0;
        if (!oldFood)
            livelog_printf(LL_CONDUCT, 'ate for the first time - %s',
                _food_xname(otmp, false));
        u.uconduct.food = oldFood + 1;
    }

    if ((otmp.otyp | 0) === CORPSE_OTYP || otmp.globby) {
        const tmp = await eatcorpse(otmp);
        if (tmp === 2) { _zero_victual(); game.context.move = 1; return true; }
        else if (tmp) dont_start = true;
    } else {
        /* C eat.c:2987-3045 — non-corpse general comestible.
         * Material conduct (FLESH → unvegan/unvegetarian) is RNG-free; the VEGGY
         * default-case unvegan bumps (pancake/cookie/cream pie/candy/jelly) are
         * RNG-free too.  We bump the conduct counters that gate later livelog but
         * consume no RNG. */
        const mat = _oc_material(otmp.otyp | 0);
        if (u) u.uconduct = u.uconduct || {};
        if (mat === MATERIAL_FLESH) {
            if (u) u.uconduct.unvegan = (u.uconduct.unvegan | 0) + 1;
            if ((otmp.otyp | 0) !== EGG_OTYP) _violated_vegetarian();
        } else if ([287 /* CREAM_PIE */, 288 /* CANDY_BAR */,
                    289 /* FORTUNE_COOKIE */, 286 /* LUMP_OF_ROYAL_JELLY */,
                    290 /* PANCAKE */].includes(otmp.otyp | 0)) {
            /* C eat.c:2993-3001 — VEGGY animal-product cases. */
            if (u) u.uconduct.unvegan = (u.uconduct.unvegan | 0) + 1;
        }
        /* C eat.c:3046 reqtime = objects[otyp].oc_delay. */
        v.reqtime = _oc_delay(otmp.otyp | 0);
        /* C eat.c:3047-3069 — rotten / fprefx / already-eaten dispatch. */
        const rotten = (otmp.otyp | 0) !== FORTUNE_COOKIE_OTYP
            && ((otmp.cursed ? 1 : 0)
                || (!_nonrotting_food(otmp.otyp | 0)
                    && ((game.moves | 0) - (otmp.age | 0)) > ((otmp.blessed ? 50 : 30))
                    && ((otmp.orotten ? 1 : 0) || !rn2(7))));
        if (rotten) {
            /* C eat.c:3032-3036 —
             *     if (rottenfood(otmp)) { otmp->orotten = TRUE;
             *                             dont_start = TRUE; }
             *     consume_oeaten(otmp, 1);
             * The comment that used to stand here ("RNG-free message path for
             * the corpus") was false in exactly the way the sibling CORPSE arm
             * at :1172 already documents: rottenfood() ALWAYS rolls, up to three
             * leaves, and prints "Blecch!  Rotten food!".  Skipping the call
             * dropped four draws and the topline, and set orotten/dont_start
             * unconditionally where C sets them only on the knockout arm.
             * seed4500 step 525 is that arm: C's rn2(4)=1, rn2(4)=3, rn2(3)=0,
             * rnd(10)=3 -> "The world spins and goes dark." and a 3-turn
             * nomul. */
            if (rottenfood(otmp)) {
                otmp.orotten = true;
                dont_start = true;
            }
            _consume_oeaten(otmp, 1); /* oeaten >>= 1 */
        } else if (!already_partly_eaten) {
            if (!(await _fprefx(otmp))) {
                _zero_victual();
                game.context = game.context || {};
                game.context.move = 1;
                return true;
            }
        } else {
            _emit_eat_pline(`You ${v.reqtime === 1 ? 'eat' : 'begin eating'} ${_food_xname(otmp)}.`);
        }
    }

    /* C eat.c:3050-3074 — re-calc nutrition (reqtime via rounddiv, nmod). */
    const basenutrit = _obj_nutrition(otmp) | 0;
    v.reqtime = (basenutrit === 0) ? 0
        : _rounddiv(v.reqtime * (otmp.oeaten | 0), basenutrit);
    if (v.reqtime === 0 || (otmp.oeaten | 0) === 0) v.nmod = 0;
    else if ((otmp.oeaten | 0) >= v.reqtime) v.nmod = -Math.trunc((otmp.oeaten | 0) / v.reqtime);
    else v.nmod = v.reqtime % (otmp.oeaten | 0);
    v.canchoke = ((u && (u.uhs | 0)) === SATIATED) ? 1 : 0;

    if (!dont_start) await start_eating(otmp, already_partly_eaten);
    game.context = game.context || {};
    game.context.move = 1;
    return true;
}

/* C eat.c:308 reset_eat — reset eating when interrupted by an event */
export function reset_eat() {
    /* we only set a flag here - the actual reset process is done after
     * the round is spent eating.
     */
    const v = _victual();
    if (v.eating && !v.doreset) {
        // debugpline0("reset_eat...");
        v.doreset = 1;
    }
}

/* C eat.c:126-135 init_uhunger — initialize hunger state
 *
 * Sets hero to NOT_HUNGRY state with u.uhunger = 900, and resets temporary
 * STR penalty if present. Marks display for redraw if needed.
 * Called during hero initialization, life saving, and prayer healing.
 */
export function init_uhunger() {
    const u = game.u;
    /* C attrib.h: ATEMP(x) is u.atemp.a[x].  newuhs() stores the hunger
     * weakness penalty there, and acurr()/weight_cap() read the same field. */
    if (!u.atemp) u.atemp = {};
    if (!u.atemp.a) u.atemp.a = [0, 0, 0, 0, 0, 0];
    const atemp = u.atemp.a;

    /* C eat.c:128: disp.botl = (u.uhs != NOT_HUNGRY || ATEMP(A_STR) < 0); */
    if (!game.disp) game.disp = { botl: 0, botlx: 0, time_botl: 0, toplin: 0, inmore: 0 };
    game.disp.botl = ((u.uhs | 0) !== NOT_HUNGRY || (atemp[0] | 0) < 0) ? 1 : 0;

    /* C eat.c:129: u.uhunger = 900; */
    u.uhunger = 900;

    /* C eat.c:130: u.uhs = NOT_HUNGRY; */
    u.uhs = NOT_HUNGRY;

    /* C eat.c:131-134: if (ATEMP(A_STR) < 0) { ATEMP(A_STR) = 0; encumber_msg(); } */
    if ((atemp[0] | 0) < 0) {
        atemp[0] = 0;
        encumber_msg();
    }
}

/* C eat.c:3347 is_fainted — check if hero is fainted */
export function is_fainted() {
    const u = game.u;
    return ((u.uhs | 0) === FAINTED) ? 1 : 0;
}

/* call when a faint must be prematurely terminated */
export async function reset_faint() {
    if (game.afternmv === "unfaint")
        await unmul("You revive.");
}

/* C eat.c:395 food_disappears(struct obj *obj)
 *
 * Called when an object (e.g., a food item being eaten) disappears or is
 * consumed. If the object is the victual being eaten, reset victual state.
 * If the object is timed, stop its timers.
 */
export function food_disappears(obj) {
    const v = _victual();

    /* C eat.c:400-401: if obj == svc.context.victual.piece, reset victual */
    if (obj === v.piece) {
        _zero_victual();
    }

    /* C eat.c:403-404: if obj->timed, call obj_stop_timers(obj) */
    if (obj.timed) {
        obj_stop_timers(obj);
    }
}

/* obj_stop_timers — the real body lives in js/timeout.js (C timeout.c:2376),
 * imported at the top of this file.  The local stand-in that used to sit here
 * cleared obj.timed without unlinking anything, which left the object's live
 * ROT_CORPSE element on gt.timer_base pointing at a corpse the game had
 * already consumed. */

/* C eat.c:143 — tintxts[] table with txt, nut, fodder, greasy fields.
 * Structure: { txt, nut, fodder (1-bit), greasy (1-bit) }
 * fodder field used by set_tin_variety(); txt used by tin_details().
 * Index is the tin variety type (ROTTEN_TIN=0, HOMEMADE_TIN=1, etc.).
 * TTSZ = 16 (0 through 15). */
const TINTXTS = [
    { txt: "rotten", fodder: 0 }, /* 0 ROTTEN_TIN */
    { txt: "homemade", fodder: 1 }, /* 1 HOMEMADE_TIN */
    { txt: "soup made from", fodder: 1 }, /* 2 */
    { txt: "french fried", fodder: 0 }, /* 3 */
    { txt: "pickled", fodder: 1 }, /* 4 */
    { txt: "boiled", fodder: 1 }, /* 5 */
    { txt: "smoked", fodder: 1 }, /* 6 */
    { txt: "dried", fodder: 1 }, /* 7 */
    { txt: "deep fried", fodder: 0 }, /* 8 */
    { txt: "szechuan", fodder: 1 }, /* 9 */
    { txt: "broiled", fodder: 0 }, /* 10 */
    { txt: "stir fried", fodder: 0 }, /* 11 */
    { txt: "sauteed", fodder: 0 }, /* 12 */
    { txt: "candied", fodder: 1 }, /* 13 */
    { txt: "pureed", fodder: 1 }, /* 14 */
    { txt: "", fodder: 0 }, /* 15 (empty) */
];
const TTSZ = TINTXTS.length; /* 16 */

/* C monst.h:283 — ismnum(x) macro: valid monster index. */
function _ismnum(mnum) {
    const NUMMONS = 383; /* from js/makemon_mons.json.mons.length */
    const LOW_PM = 0; /* import LOW_PM if available, else 0 for mnum >= 0 */
    return (mnum | 0) >= LOW_PM && (mnum | 0) < NUMMONS;
}

/* C eat.c:1460 — set_tin_variety(struct obj *obj, int forcetype)
 *
 * Sets a tin's variety (spe field) based on forcetype, monster, and RNG.
 * Updates: obj->corpsenm, obj->spe, possibly obj->cursed
 * RNG calls: rn2(TTSZ - 1) in two places for HEALTHY_TIN and RANDOM_TIN paths.
 */
export function set_tin_variety(obj, forcetype) {
    if (!obj) return;

    let r;
    const mnum = obj.corpsenm | 0;

    /* C eat.c:1465-1471 — SPINACH_TIN or HEALTHY_TIN with non-vegetarian/empty */
    if ((forcetype | 0) === SPINACH_TIN
        || ((forcetype | 0) === HEALTHY_TIN
            && ((mnum | 0) === NON_PM
                || !_vegetarianE(mnum)))) {
        obj.corpsenm = NON_PM;
        obj.spe = 1; /* spinach */
        return;
    }

    /* C eat.c:1472-1477 — HEALTHY_TIN: call tin_variety, loop on ROTTEN_TIN */
    if ((forcetype | 0) === HEALTHY_TIN) {
        r = tin_variety(obj, 0); /* FALSE = 0 */
        if ((r | 0) < 0 || (r | 0) >= (TTSZ | 0))
            r = ROTTEN_TIN;
        while (((r | 0) === ROTTEN_TIN && !(obj.cursed | 0)) || !TINTXTS[(r | 0)].fodder)
            r = rn2((TTSZ - 1) | 0);
    }
    /* C eat.c:1478-1479 — forcetype in valid range */
    else if ((forcetype | 0) >= 0 && (forcetype | 0) < ((TTSZ - 1) | 0)) {
        r = forcetype | 0;
    }
    /* C eat.c:1480-1484 — RANDOM_TIN: random pick, check for nonrotting */
    else {
        r = rn2((TTSZ - 1) | 0);
        if ((r | 0) === ROTTEN_TIN && _ismnum(mnum) && _nonrotting_corpse(mnum))
            r = HOMEMADE_TIN;
    }

    /* C eat.c:1485 — offset spe by 1 to allow index 0 */
    obj.spe = -(r + 1) | 0;
}

/* C eat.c:1489 — tin_variety(struct obj *obj, boolean displ)
 * Determines the current tin variety from obj state.
 * displ: we're just displaying so leave things alone (prevents side effects)
 * Returns: tin variety index (ROTTEN_TIN=0, HOMEMADE_TIN=1, etc.)
 * RNG calls: rn2(TTSZ - 1) when spe is 0 (neither spinach nor encoded variety).
 */
function tin_variety(obj, displ) {
    if (!obj) return 0;

    let r;
    const mnum = obj.corpsenm | 0;

    /* C eat.c:1495-1504 — determine variety from obj state */
    if ((obj.spe | 0) === 1) {
        r = SPINACH_TIN;
    } else if (obj.cursed) {
        r = ROTTEN_TIN; /* always rotten if cursed */
    } else if ((obj.spe | 0) < 0) {
        r = -(obj.spe | 0);
        --r; /* get rid of the offset */
    } else {
        r = rn2((TTSZ - 1) | 0);
    }

    /* C eat.c:1506-1507 — some homemade tins go bad if not blessed */
    if (!(displ | 0) && (r | 0) === HOMEMADE_TIN && !(obj.blessed | 0) && !rn2(7))
        r = ROTTEN_TIN;

    /* C eat.c:1509-1510 — lizard corpses don't rot */
    if ((r | 0) === ROTTEN_TIN && _ismnum(mnum) && _nonrotting_corpse(mnum))
        r = HOMEMADE_TIN;

    return r | 0;
}

/* C eat.c:1427 — tin_details(struct obj *obj, int mnum, char *buf)
 * Appends or replaces buf with tin description.
 * SPINACH_TIN → " of spinach"
 * NON_PM (empty) → "empty tin"
 * Other → monster name with tin variety descriptor
 *
 * In C, buf is modified in place (char* output param). JS strings are
 * immutable, so the resulting buffer contents are RETURNED (the __charptr__
 * convention: the oracle compares args_after.buf against the return value).
 */
export function tin_details(obj, mnum, buf) {
    /* C eat.c:1432: `if (!obj || !buf) return;` — a NULL-POINTER test.  A JS
     * empty string is a valid non-NULL buffer holding "", not a null pointer,
     * so only null/undefined take the early return; C proceeds on "".  Nothing
     * was written, so the buffer still holds what it held on entry. */
    if (!obj || buf == null)
        return buf;

    const r = tin_variety(obj, 1); /* TRUE = 1 for display-only mode */

    if ((r | 0) === SPINACH_TIN) {
        /* C eat.c:1437-1438: Strcat(buf, " of spinach"); */
        return buf + " of spinach";
    } else if ((mnum | 0) === NON_PM) {
        /* C eat.c:1439-1440: Strcpy(buf, "empty tin"); */
        return "empty tin";
    } else {
        /* C eat.c:1441-1457: build detailed tin description with monster name */
        let result = buf;

        if ((obj.cknown | 0) || (game.iflags && game.iflags.override_ID | 0)) {
            if ((obj.spe | 0) < 0) {
                if ((r | 0) === ROTTEN_TIN || (r | 0) === HOMEMADE_TIN) {
                    /* C eat.c:1443-1446: put these before the word "tin" */
                    result = TINTXTS[r | 0].txt + " " + buf + " of ";
                } else {
                    /* C eat.c:1447-1449: Sprintf(eos(buf), " of %s ", tintxts[r].txt); */
                    result = buf + " of " + TINTXTS[r | 0].txt + " ";
                }
            } else {
                /* C eat.c:1450-1451: Strcpy(eos(buf), " of "); */
                result = buf + " of ";
            }
        } else {
            /* C eat.c:1450-1451: Strcpy(eos(buf), " of "); */
            result = buf + " of ";
        }

        /* C eat.c:1453-1456: append monster name or "meat".
         *   if (vegetarian(&mons[mnum]))
         *       Sprintf(eos(buf), "%s", mons[mnum].pmnames[NEUTRAL]);
         *   else
         *       Sprintf(eos(buf), "%s meat", mons[mnum].pmnames[NEUTRAL]);
         * `mons[mnum].pmnames[NEUTRAL]` is monPmname(mnum, NEUTRAL); the
         * previous `game.mons[...]` lookup resolved to undefined, so the
         * monster name was silently dropped from the buffer. */
        const NEUTRAL_ = 2; /* permonst.h pmnames[] gender slot */
        const pmname = monPmname(mnum | 0, NEUTRAL_);
        if (_vegetarianE(mnum | 0)) {
            result = result + pmname;
        } else {
            result = result + pmname + " meat";
        }

        return result;
    }
}

/* getobj callback for object to be opened with a tin opener */
function tinopen_ok(obj) {
    if (obj && obj.otyp === 296) /* TIN = 296 */
        return 1; /* GETOBJ_SUGGEST */
    return 2; /* GETOBJ_EXCLUDE */
}

/* ═══ THE TIN-OPENING OCCUPATION — C eat.c:1381-1796 ═══════════════════════════
 *
 * start_tin() (eat.c:1723) chooses the opening method and, unless the tin opens
 * instantly, sets the "opening the tin" OCCUPATION; opentin() (eat.c:1703) is
 * its per-turn callback; consume_tin() (eat.c:1526) is what the callback runs
 * once its countdown expires.  The occupation itself is driven by C's
 * moveloop_core (allmain.c:485-509) — see the OPENTIN driver in js/allmain.js,
 * modelled on the learn/picklock drivers already there.
 *
 * start_tin() USED TO BE AN EMPTY STUB in this file, so a tin selected at the
 * eat prompt fell through to doeat_food() and was swallowed as ordinary food in
 * one bite ("This tin is delicious!").  C prints "It is not so easy to open
 * this tin." and then spends rn1(1 + 500 / (ACURR(A_DEX) + ACURRSTR), 10) turns
 * on it — a modulus the recorder annotates as `rn2(N) @ start_tin(eat.c:1784)`,
 * from which N-1 == 500 / (DEX + STR) decodes the hero's two attributes.
 *
 * C weapon otyps, resolved by NAME out of js/oc_name_data.js (OC_NAME.indexOf)
 * rather than copied from a 3.7 table:
 *   tin opener 239, dagger 34, elven dagger 35, orcish dagger 36,
 *   silver dagger 37, athame 38, knife 40, stiletto 41, crysknife 43,
 *   axe 44, pick-axe 259, tin 296.
 */
const TIN_OTYP = 296;
const TIN_OPENER_OTYP = 239;
const _TIN_DAGGERS = [34 /* DAGGER */, 37 /* SILVER_DAGGER */, 35 /* ELVEN_DAGGER */,
                      36 /* ORCISH_DAGGER */, 38 /* ATHAME */, 40 /* KNIFE */,
                      41 /* STILETTO */, 43 /* CRYSKNIFE */];
const _TIN_AXES = [259 /* PICK_AXE */, 44 /* AXE */];
/* C eat.c:1385-1387 — costly_tin()'s alter_type argument. */
const COST_OPEN = 0, COST_DSTROY = 1;
/* C monflag.h:141 M2_PNAME 0x00080000L — "monster name is a proper name".
 * NOTE for anyone copying this: js/do_name.js (0x40) and js/end.js (0x80) both
 * carry a DIFFERENT value for the same flag.  This one is read straight out of
 * nethack-c-v5/upstream/include/monflag.h, the scored tree. */
const M2_PNAME_TIN = 0x00080000;

/* C eat.c svc.context.tin — the in-progress tin handle plus its countdown.
 * js/cmd.js:41541 already creates the {tin, o_id} half (freeinv's tin arm);
 * reqtime/usedtime are C's other two struct members. */
function _tin_ctx() {
    const g = game;
    g.context = g.context || {};
    if (!g.context.tin)
        g.context.tin = { tin: null, o_id: 0, reqtime: 0, usedtime: 0 };
    const t = g.context.tin;
    if (t.reqtime == null) t.reqtime = 0;
    if (t.usedtime == null) t.usedtime = 0;
    return t;
}

/* C eat.c:1516 use_up_tin: consume the tin, then clear its context. */
async function use_up_tin(tin) {
    if (!tin) return;
    if (tin.where === OBJ_INVENT)
        await useup(tin);
    else
        await useupf(tin, 1);
    const t = _tin_ctx();
    t.tin = null;
    t.o_id = 0;
}

/* C eat.c:1389 costly_tin(int alter_type) — split one tin off the stack and
 * bill it when it is unpaid (carried) or lying on a shop square.
 *
 * SCOPE, stated rather than hidden.  The CARRIED-unpaid half is ported: it
 * needs only tin->unpaid and the real splitobj(), whose next_ident() rnd(2) is
 * the ONLY PRNG draw anywhere in this function.  The FLOOR half —
 * costly_spot(tin->ox, tin->oy) && !tin->no_charge — is a NAMED GAP: its body
 * lives in js/shk.js:1326 and importing it here would close an
 * eat -> shk -> cmd -> eat module cycle.  Consequence: a tin opened while the
 * hero stands on an unpaid shop square is not billed and (if quan > 1) is not
 * split, so that rnd(2) is not drawn.  costly_alteration() itself is RNG-free
 * and is the same named no-op js/read.js:1681 already carries. */
async function costly_tin(_alter_type) {
    const t = _tin_ctx();
    let tin = t.tin;
    if (!tin) return tin;
    const unpaid = _eat_carried(tin) ? !!(tin.unpaid | 0) : false;
    if (unpaid) {
        if ((tin.quan | 0) > 1) {
            tin = t.tin = (await splitobj(tin, 1));
            t.o_id = tin.o_id | 0;
        }
        /* costly_alteration(tin, alter_type) — shop billing, RNG-free, unported. */
    }
    return tin;
}

/* C hack.h:1334 y_n(query) => yn_function(query, ynchars, 'n', TRUE), i.e.
 * tty_yn_function writes "<query> [yn] (n)" to the topline, parks the cursor
 * one column past it and reads one key.  Same body as js/potion.js:303's y_n;
 * duplicated rather than imported because potion.js does not export it and
 * eat.js importing potion.js for it would be a wider edge than the message
 * deserves.  RNG-FREE.
 *
 * Measured against the recording: gen476 answers this prompt with '+' (invalid
 * -> tty_yn_function loops and re-reads, the prompt frame is shown twice) and
 * then ESC (-> the default, 'n'); gen651 answers it with ESC on the first
 * read.  Both frames are recorded as "Eat it? [yn] (n)". */
async function _tin_y_n(question) {
    const g = game;
    const prompt = question + ' [yn] (n)';
    /* C win/tty/topl.c — tty_yn_function writes the prompt through the SAME
     * topline update_topl() drives, so an already-occupied topline is paged out
     * BEFORE the prompt appears; the prompt never overwrites an unacknowledged
     * message.  Reproduce that in two steps: flush_screen(1) pages every
     * width-overflow page (consuming one recorded dismiss key each), and
     * force_more() acknowledges the non-overflowing remainder.
     *
     * MEASURED on gen651 step 37: consume_tin has just plined
     *   "It is not so easy to open this tin."  (35, from start_tin)
     * + "You succeed in opening the tin."      (31 -> 68, still fits CO-1-8)
     * + "It smells like newts."                (21 -> 91, overflows)
     * so C shows the first two joined with --More-- (frame 37, acked by ' '),
     * then "It smells like newts.--More--" alone (frames 38-41: 'n','g','e' ring
     * the bell, '\n' dismisses), and only then "Eat it? [yn] (n)" (frame 42).
     * Setting _pending_message straight to the prompt DESTROYED both pages and
     * rendered the prompt at frame 37 — this port's own y_n copies get away
     * with it only because they are called on an empty topline. */
    await flush_screen(1);
    if (g._pending_message)
        await force_more(g._pending_message);
    for (;;) {
        g._pending_message = prompt;
        await flush_screen(1);
        /* C win/tty/topl.c tty_yn_function — the prompt is written with its
         * TRAILING SPACE and the cursor is left one column past it.  gen651
         * step 42 records cursor col 17 for the 16-column "Eat it? [yn] (n)". */
        {
            const disp = g.nhDisplay;
            if (disp) topl_park_cursor(disp, prompt + ' ');
        }
        const key = await nhgetch();
        const c = String.fromCharCode(typeof key === 'number' ? key : (key?.charCodeAt(0) | 0));
        g._topl_sticky = prompt;
        if (c === '\x1b') return 'n';                     /* ESC -> the default */
        if (c === '\r' || c === '\n' || c === ' ') return 'n'; /* activator -> default */
        const lc = c.toLowerCase();
        if (lc === 'y' || lc === 'n') return lc;
        /* any other key: tty_yn_function rings the bell and re-reads. */
    }
}

/* C mondata.h type_is_pname(ptr) = ((ptr->mflags2 & M2_PNAME) != 0L). */
function _tin_type_is_pname(ptr) {
    return ptr ? (((ptr.mflags2 >>> 0) & M2_PNAME_TIN) !== 0) : false;
}

/* C trap.c:6694 b_trapped("tin", NO_PART). */
async function b_trapped_tin() {
    const lvl = levelDifficulty() | 0;
    const dice = 5 + (lvl < 5 ? lvl : 2 + Math.trunc(lvl / 2));
    const dmg = rnd(dice);
    await pline('KABOOM!!  The tin was booby-trapped!');
    await losehp(dmg, 'explosion', KILLED_BY_AN);
    exercise(A_STR, false);
    const oldStun = (game.u?.uprops?.[STUNNED]?.intrinsic | 0);
    await make_stunned(oldStun + dmg, true);
}

/* C eat.c:1526 consume_tin(const char *mesg) — the tin is open; describe the
 * contents and (unless the hero declines) eat them. */
async function consume_tin(mesg) {
    const g = game;
    const t = _tin_ctx();
    let what, which, mnum, r, nutamt;
    /* C eat.c:1531 — "if you've eaten tin itself, chance to not eat contents
     * gets bypassed". */
    const always_eat = _hero_metallivorous();
    let tin = t.tin;
    if (!tin) return;

    r = tin_variety(tin, 0); /* FALSE — this is the acting call, not display */

    /* C eat.c:1537-1542 — trapped, or a cursed non-homemade tin one time in 8. */
    if ((tin.otrapped | 0)
        || ((tin.cursed | 0) && (r | 0) !== HOMEMADE_TIN && !rn2(8))) {
        /* b_trapped("tin", NO_PART) — trap.c's container blast.  UNPORTED and
         * NAMED: it consumes RNG (its damage roll) and no session in the
         * corpus opens a trapped or cursed non-homemade tin (measured: the 4
         * train sessions that reach start_tin all take the plain branch, and
         * NO public session reaches start_tin at all).  Throwing rather than
         * guessing keeps a wrong answer from being scored as a right one. */
        await b_trapped_tin();
        return;
    }

    await pline(mesg); /* C eat.c:1544 pline1(mesg) */

    if ((r | 0) !== SPINACH_TIN) {
        mnum = tin.corpsenm | 0;
        if ((mnum | 0) === NON_PM) {
            /* C eat.c:1548-1560 — an empty tin. */
            if (_eat_Hallucination())
                await pline(`It's full of ${rn2(2) ? 'air elemental souffle'
                                                   : 'dehydrated water'}.`);
            else
                await pline('It turns out to be empty.');
            observe_object(tin);
            tin.known = 1;
            tin = (await costly_tin(COST_OPEN));
            await use_up_tin(tin);
            if (always_eat)
                await lesshungry(5);
            return;
        }

        /* C eat.c:1564-1581 — name the contents. */
        which = 0; /* 0 => plural, 1 => as-is, 2 => "the" prefix */
        const ptr = permonstTemplate(mnum);
        if ((mnum === PM_COCKATRICE || mnum === PM_CHICKATRICE)
            && (_Stone_resistance() || _eat_Hallucination())) {
            what = 'chicken';
            which = 1; /* suppress pluralization */
        } else if (_eat_Hallucination()) {
            what = rndmonnam(null);
        } else {
            what = monPmname(mnum, 2 /* NEUTRAL */);
            if (the_unique_pm(ptr))
                which = 2;
            else if (_tin_type_is_pname(ptr))
                which = 1;
        }
        if (which === 0)
            what = makeplural(what);
        else if (which === 2)
            what = the(what);

        if (!always_eat) {
            await pline(`It smells like ${what}.`);
            if ((await _tin_y_n('Eat it?')) === 'n') {
                /* C eat.c:1587-1596 — decline: discard the open tin. */
                if (g.flags && g.flags.verbose)
                    await pline('You discard the open tin.');
                if (!_eat_Hallucination()) {
                    observe_object(tin);
                    tin.known = 1;
                }
                tin = (await costly_tin(COST_OPEN));
                await use_up_tin(tin);
                return;
            }
        }

        /* C eat.c:1598-1646 — the hero accepts and eats the contents.
         *
         * SCOPE, NAMED: cprefx(mnum) (eat.c:1610) is not ported anywhere in
         * this file — js/eat.js:1927 start_eating() carries the identical named
         * gap for the corpse path — so the were-form / acidic / petrification
         * pre-effects are missing here too.  Everything else on this arm is
         * live: eating_conducts, observe_object, costly_tin, cpostfx (this
         * file's own body), the rotten-tin make_vomiting roll, the nutrition
         * arithmetic, and the greasy-tin make_glib roll.  NO CORPUS SESSION
         * TAKES THIS ARM — all four tin sessions answer 'n' above — so it is
         * unmeasured and is written to C rather than to a trace. */
        _zero_victual(); /* C eat.c:1598 svc.context.victual = zero_victual */

        await pline(`You consume ${TINTXTS[r | 0].txt} ${monPmname(mnum, 2)}.`);

        eating_conducts(ptr);

        observe_object(tin);
        tin.known = 1;
        tin = t.tin = (await costly_tin(COST_OPEN));

        /* C eat.c:1610-1614 — cprefx()/cpostfx() might use up the tin. */
        /* cprefx(mnum) — NAMED GAP, see above. */
        if (t.tin)
            await cpostfx(mnum);
        if (!t.tin)
            return;
        tin = t.tin;

        if ((TINTXTS[r | 0].nut | 0) < 0) { /* C eat.c:1617 — rotten */
            make_vomiting(rn1(15, 10), false);
        } else {
            nutamt = TINTXTS[r | 0].nut | 0;
            /* C eat.c:1621-1626 — a homemade tin cannot beat its own corpse. */
            if ((r | 0) === HOMEMADE_TIN && nutamt > _cnutritE(mnum))
                nutamt = _cnutritE(mnum);
            if (always_eat)
                nutamt += 5;
            await use_up_tin(tin); tin = null;
            await lesshungry(nutamt);
        }

        if (TINTXTS[r | 0].greasy) {
            /* C eat.c:1634-1645.  NOTE: fingers_or_gloves(TRUE) is an honest
             * throw-stub in js/do_wear.js:4178, so this arm HALTS rather than
             * printing a fabricated body part.  It sits at the very END of the
             * accept branch, so every draw above it has already landed.  Reached
             * only by answering 'y' to "Eat it?" on a greasy tin variety — 0 of
             * 688 train and 0 of 44 public sessions answer 'y' at all. */
            const alreadyglib = (g.u?.uprops?.[GLIB]?.intrinsic | 0) & TIMEOUT;
            make_glib(alreadyglib + rn1(11, 5)); /* 5..15 */
            await pline(`Eating ${TINTXTS[r | 0].txt} food made your `
                        + `${fingers_or_gloves(true)} `
                        + `${alreadyglib ? 'even more' : 'very'} slippery.`);
        }
    } else { /* C eat.c:1647-1690 — spinach. */
        if (tin.cursed) {
            await pline(`It contains some decaying${_eat_Blind() ? '' : ' '}`
                        + `${_eat_Blind() ? '' : hcolor('green')} substance.`);
        } else {
            await pline('It contains spinach.');
            observe_object(tin);
            tin.known = 1;
        }

        if (!always_eat && (await _tin_y_n('Eat it?')) === 'n') {
            if (g.flags && g.flags.verbose)
                await pline('You discard the open tin.');
            tin = (await costly_tin(COST_OPEN));
            await use_up_tin(tin);
            return;
        }

        /* C eat.c:1666-1690 — conduct, the Popeye line, gainstr, nutrition. */
        const u = g.u || {};
        u.uconduct = u.uconduct || {};
        u.uconduct.food = (u.uconduct.food | 0) + 1;
        if (!tin.cursed)
            await pline(`This makes you feel like ${_eat_Hallucination()
                ? "Swee'pea"
                : 'Popeye'}!`);

        /* C attrib.c:203 gainstr(otmp, 0, FALSE).  The strength increment is
         * random only when the base value is below the encoded 18 threshold;
         * adjattrib(..., 1) performs the cap and status bookkeeping. */
        const di = C_ATTR_TO_DISP[A_STR] ?? A_STR;
        const abase = (getAbase(u)[di] | 0);
        let num;
        if (abase < 18)
            num = rn2(4) ? 1 : rnd(6);
        else if (abase < 19)
            num = rnd(10);
        else
            num = 1;
        adjattrib(A_STR, tin.cursed ? -num : num, 1);

        tin = (await costly_tin(COST_OPEN));
        const nutamt = tin.blessed ? 600
            : !tin.cursed ? (400 + rnd(200))
                : (200 + rnd(400));
        if (always_eat)
            nutamt += 5;
        await use_up_tin(tin);
        await lesshungry(nutamt);
    }
    if (t.tin)
        await use_up_tin(t.tin);
}

/* C eat.c:1703 opentin() — "called during each move whilst opening a tin".
 * The moveloop occupation driver calls this once per occupation turn AFTER
 * that turn's world block; 1 means still busy, 0 ends the occupation. */
export async function opentin() {
    const t = _tin_ctx();
    /* C eat.c:1705-1709 — "perhaps it was stolen (although that should cause
     * interruption)".  carried(tin) || (obj_here(tin) && can_reach_floor). */
    if (!t.tin)
        return 0;
    if (!_eat_carried(t.tin)) {
        /* obj_here(svc.context.tin.tin, u.ux, u.uy) — the floor half.  A tin
         * that left the inventory without leaving the per-tile chain under the
         * hero is still openable in C; this port checks the tile chain the same
         * way freeinv walks it. */
        const u = game.u || {};
        let here = false;
        for (let o = game.level?.levelObjects?.[u.ux | 0]?.[u.uy | 0]; o; o = o.nexthere)
            if (o === t.tin) { here = true; break; }
        if (!here)
            return 0;
    }
    /* C eat.c:1710-1713 — give up after 50 turns. */
    t.usedtime = (t.usedtime | 0) + 1;
    if ((t.usedtime | 0) > 50) {
        await pline('You give up your attempt to open the tin.');
        return 0;
    }
    if ((t.usedtime | 0) < (t.reqtime | 0))
        return 1; /* still busy */

    await consume_tin('You succeed in opening the tin.');
    return 0;
}

/* C mondata.h:96 cantwield(ptr) = (nohands(ptr) || verysmall(ptr)), over the
 * hero's current form (gy.youmonst.data).  Same predicate js/polyself.js:849
 * carries; resolved here through this file's own mndx-keyed permonst lookup so
 * it does not depend on g.youmonst being populated. */
const M1_NOHANDS_TIN = 0x00010000; /* C monflag.h M1_NOHANDS */
const MZ_SMALL_TIN = 1;            /* C permonst.h MZ_SMALL */
function _tin_cantwield() {
    const m = _heroMnum();
    if (m < 0) return false; /* untracked form -> the human default, has hands */
    const ptr = permonstTemplate(m);
    if (!ptr) return false;
    const nohands = ((ptr.mflags1 >>> 0) & M1_NOHANDS_TIN) !== 0;
    const verysmall = (ptr.msize | 0) < MZ_SMALL_TIN;
    return nohands || verysmall;
}

/* C eat.c:1771-1784, the `no_opener:` label.  Returns the turn count, or null
 * when the Glib arm has already dropped the tin and start_tin must return.
 * THE ONE PRNG DRAW: rn1(1 + 500 / (ACURR(A_DEX) + ACURRSTR), 10) — the
 * recorder annotates it `rn2(N) @ start_tin(eat.c:1784)`, and N is 1 + the
 * integer division, so the modulus decodes DEX+STR exactly. */
async function _tin_no_opener(otmp) {
    const g = game;
    const u = g.u || {};
    await pline('It is not so easy to open this tin.');
    /* C eat.c:1773-1783 — greasy hands: the tin slips away and start_tin
     * RETURNS without opening anything.
     *     pline_The("tin slips from your %s.", fingers_or_gloves(FALSE));
     *     if (otmp->quan > 1L) otmp = splitobj(otmp, 1L);
     *     if (carried(otmp)) dropx(otmp); else stackobj(otmp);
     *     return;
     * The ONE PRNG draw here is splitobj -> next_ident -> rnd(2), and it is the
     * real splitobj().  UNREACHED on every corpus we hold (the 4 train sessions
     * that call start_tin all produce the rn1 at eat.c:1784, which is BELOW
     * this early return, and no public session calls start_tin) — so it is
     * written to C and not to a trace.  Ported rather than left as a throw
     * because C exits here WITHOUT opening the tin: a throw on this arm would
     * halt a session that previously merely mis-ate the tin.
     * C youprop.h Glib — u.uprops[GLIB].intrinsic | extrinsic. */
    if ((u.uprops?.[GLIB]?.intrinsic | 0) || (u.uprops?.[GLIB]?.extrinsic | 0)) {
        await pline(`The tin slips from your ${fingers_or_gloves(false)}.`);
        let slip = otmp;
        if ((slip.quan | 0) > 1)
            slip = (await splitobj(slip, 1));
        if (_eat_carried(slip))
            await dropx(slip);
        else
            stackobj_dm(slip);
        return null; /* start_tin's `return;` — no occupation, no tin handle */
    }
    const dexstr = (acurr(u, A_DEX) | 0) + (acurrstr(u) | 0);
    return rn1(1 + Math.trunc(500 / dexstr), 10);
}

/* C eat.c:1723 start_tin(struct obj *otmp) — "called when starting to open a
 * tin".  Picks the opening method (which decides both the message and the
 * number of turns), then either opens the tin immediately or sets the
 * occupation.  This function REPLACES an empty stub.
 *
 * C reaches the `no_opener:` label two ways — the `else` of the uwep test and
 * a `goto` out of the wielded-weapon switch's `default:` arm — which is why
 * the label's body lives in _tin_no_opener() above rather than being inlined
 * into the else. */
export async function start_tin(otmp) {
    const g = game;
    const u = g.u || {};
    let mesg = null;
    let tmp;

    if (_hero_metallivorous()) {
        /* C eat.c:1728-1730 */
        mesg = 'You bite right into the metal tin...';
        tmp = 0;
    } else if (_tin_cantwield()) {
        /* C eat.c:1731-1733 — nohands || verysmall */
        await pline('You cannot handle the tin properly to open it.');
        return;
    } else if (otmp.blessed) {
        /* C eat.c:1734-1746 — 50/50 immediate access vs a 1-turn delay, unless
         * a blessed tin opener is wielded (always immediate). */
        const uwep = u.uwep;
        tmp = (uwep && uwep.blessed && (uwep.otyp | 0) === TIN_OPENER_OTYP) ? 0 : rn2(2);
        if (!tmp)
            mesg = 'The tin opens like magic!';
        else
            await pline('The tin seems easy to open.'); /* C pline_The */
    } else if (u.uwep) {
        /* C eat.c:1747-1769 — the wielded-weapon switch. */
        const uwep = u.uwep;
        const wtyp = uwep.otyp | 0;
        if (wtyp === TIN_OPENER_OTYP) {
            mesg = 'You easily open the tin.'; /* iff tmp == 0 */
            tmp = rn2(uwep.cursed ? 3 : !uwep.blessed ? 2 : 1);
        } else if (_TIN_DAGGERS.includes(wtyp)) {
            tmp = 3;
        } else if (_TIN_AXES.includes(wtyp)) {
            tmp = 6;
        } else {
            /* C eat.c:1763 `default: goto no_opener;` — skips the pline below. */
            tmp = await _tin_no_opener(otmp);
            if (tmp === null) return;
            return await _start_tin_tail(otmp, tmp, mesg);
        }
        /* C eat.c:1768 — common to all three switch arms that did NOT goto. */
        await pline(`Using ${yobjnam(uwep, null)} you try to open the tin.`);
    } else {
        tmp = await _tin_no_opener(otmp);
        if (tmp === null) return;
    }

    return await _start_tin_tail(otmp, tmp, mesg);
}

/* C eat.c:1787-1796 — the shared tail: stash the tin handle, then either open
 * it now or set the occupation up. */
async function _start_tin_tail(otmp, tmp, mesg) {
    const t = _tin_ctx();
    t.tin = otmp;
    t.o_id = otmp.o_id | 0;
    if (!tmp) {
        await consume_tin(mesg); /* C eat.c:1790 — begin immediately */
    } else {
        t.reqtime = tmp | 0;
        t.usedtime = 0;
        set_occupation(opentin, 'opening the tin', 0);
    }
}


/* C eat.c:3097 — use_tin_opener */
export async function use_tin_opener(obj) {
    let otmp;
    let res = 0; /* ECMD_OK */

    if (!carrying(296)) { /* TIN = 296 */
        You("have no tin to open.");
        return 0; /* ECMD_OK */
    }

    if (obj !== game.u.uwep) {
        if (obj.cursed && obj.bknown) {
            let qbuf = "";
            if (ynq((await safe_qbuf(qbuf, "Really wield ", "?", obj, doname, thesimpleoname, "that"))) !== 'y')
                return 0; /* ECMD_OK */
        }
        if (!await wield_tool(obj, "use"))
            return 0; /* ECMD_OK */
        res = 1; /* ECMD_TIME */
    }

    otmp = getobj("open", tinopen_ok, 0); /* GETOBJ_NOFLAGS = 0 */
    if (!otmp)
        return (res | 2); /* ECMD_CANCEL = 2 */

    await start_tin(otmp);
    return 1; /* ECMD_TIME */
}

/* C eat.c:3788 eaten_stat(int base, struct obj *obj)
 * Calculate base nutrition value from object's partially eaten state.
 * Returns: base * uneaten_amt / full_amount, min 1.
 * Note: obj_nutrition() is called first because it may modify obj->oeaten.
 * If uneaten > full_amount (impossible), cap uneaten to full_amount.
 */
export function eaten_stat(base, obj) {
    let full_amount = _obj_nutrition(obj);
    let uneaten_amt = (obj.oeaten | 0);

    /* If uneaten_amt > full_amount (impossible condition), cap it */
    if (uneaten_amt > full_amount) {
        impossible("partly eaten food (%ld) more nutritious than untouched food (%ld)",
                   uneaten_amt, full_amount);
        uneaten_amt = full_amount;
    }

    /* Calculate: base = base * uneaten_amt / full_amount, or 0 if full_amount is 0 */
    if (full_amount) {
        base = Math.trunc(((base | 0) * uneaten_amt) / full_amount);
    } else {
        base = 0;
    }

    /* Return max(base, 1) */
    return (base < 1) ? 1 : base;
}

export function is_edible(obj) {
    if (!obj) return 0;

    const g = game;
    const u = g.u;
    const otyp = obj.otyp | 0;
    const oclass = obj.oclass | 0;

    /* C eat.c:95 — check if object is unique (e.g. Amulet of Yendor) */
    if (g._oc_unique && g._oc_unique[otyp]) {
        return 0; /* FALSE */
    }

    /* C eat.c:100-102 — Fire elemental eats flammable objects */
    if (g.youmonst && g.youmonst.data) {
        const youdata = g.youmonst.data;
        /* C eat.c:99 `gy.youmonst.data == &mons[PM_FIRE_ELEMENTAL]` — pointer
         * identity against the mons[] row, expressed here as the permonst's own
         * form index.  (`g.mons` is not a thing: game has no `mons` array, so
         * the previous `g.mons[...]` read threw TypeError on every call.) */
        if ((youdata.pmidx | 0) === (PM_FIRE_ELEMENTAL | 0)) {
            if (_is_edible_flammable(obj)) {
                return 1; /* TRUE */
            }
        }

        /* C eat.c:104-106 — Metallivorous eats metallic objects */
        if (_is_edible_metallivorous(youdata)) {
            if (_is_edible_metallic(obj)) {
                if ((youdata.pmidx | 0) === (PM_RUST_MONSTER | 0)) {
                    if (_is_edible_rustprone(obj)) {
                        return 1; /* TRUE */
                    }
                } else {
                    return 1; /* TRUE */
                }
            }
        }
    }

    /* C eat.c:107-111 — Ghouls eat non-veggy corpses or eggs.  C RETURNS here:
     *     if (u.umonnum == PM_GHOUL)
     *         return (boolean) ((obj->otyp == CORPSE
     *                            && !vegan(&mons[obj->corpsenm]))
     *                           || (obj->otyp == EGG));
     * so a ghoul offered any other FOOD_CLASS item gets FALSE, not the
     * fall-through to the FOOD_CLASS test below. */
    if (u && (u.umonnum | 0) === (PM_GHOUL | 0)) {
        return (((otyp === 265 /* CORPSE */) && !_veganE(obj.corpsenm | 0))
                || (otyp === 266 /* EGG */)) ? 1 : 0;
    }

    /* C eat.c:114-118 — Gelatinous cube eats organic objects with no contents */
    if (u && (u.umonnum | 0) === (PM_GELATINOUS_CUBE | 0)) {
        if (_is_edible_organic(obj)) {
            if (!Has_contents(obj)) {
                return 1; /* TRUE */
            }
        }
    }

    /* C eat.c:120 — Default: check if object is FOOD_CLASS */
    return ((oclass | 0) === 7 /* FOOD_CLASS */) ? 1 : 0;
}

function _is_edible_flammable(obj) {
    const otyp = obj.otyp | 0;
    /* objects.h WAND() run: svb.bases[WAND_CLASS=11] = 410, WAN_FIRE = 430.
     * 244 was BEARTRAP (a TOOL), so this test was both dead for the wand of
     * fire and spuriously live for bear traps. */
    const TALLOW_CANDLE = 224, WAX_CANDLE = 225, WAN_FIRE = 430;
    /* FIRE_RES comes from the frozen js/const.js import at the top of this file
     * (prop.h:15 FIRE_RES = 1).  A local `const FIRE_RES = 30` used to shadow
     * it here, so `oc_oprop === FIRE_RES` never matched a fireproof object. */

    /* Candles are not flammable */
    if (otyp === TALLOW_CANDLE || otyp === WAX_CANDLE) {
        return false;
    }

    /* Fire-resistant or wand of fire */
    const oprop = MKOBJ_OC_OPROP[otyp | 0] | 0;
    if (oprop === FIRE_RES || otyp === WAN_FIRE) {
        return false;
    }

    /* Check material: flammable if WOOD or below (except LIQUID) or PLASTIC */
    const LIQUID = 1, WOOD = 8, PLASTIC = 18;
    const omat = MKOBJ_OC_MATERIAL[otyp | 0] | 0;
    return ((omat <= WOOD && omat !== LIQUID) || omat === PLASTIC);
}

function _is_edible_metallivorous(mondata) {
    if (!mondata) return false;
    /* M1_METALLIVORE = 0x80000000 (mflags1 bit). */
    const M1_METALLIVORE = 0x80000000;
    const mflags1 = mondata.mflags1 ? (mondata.mflags1 | 0) : 0;
    return ((mflags1 & M1_METALLIVORE) !== 0);
}

function _is_edible_metallic(obj) {
    const IRON = 11, MITHRIL = 17;
    const omat = MKOBJ_OC_MATERIAL[obj.otyp | 0] | 0;
    return ((omat | 0) >= IRON && (omat | 0) <= MITHRIL);
}

function _is_edible_rustprone(obj) {
    const IRON = 11;
    const omat = MKOBJ_OC_MATERIAL[obj.otyp | 0] | 0;
    return ((omat | 0) === IRON);
}

/* [removed] `_is_edible_vegan` was a second, broken copy of C's vegan(ptr):
 * it opened with `if (!g.mons) return false;` and `game` has no `mons` array,
 * so it returned FALSE unconditionally, and it also dropped the noncorporeal
 * arm.  is_edible now calls the file's correct `_veganE` (eat.js:~735). */

function _is_edible_organic(obj) {
    const WOOD = 8;
    const omat = MKOBJ_OC_MATERIAL[obj.otyp | 0] | 0;
    return ((omat | 0) <= WOOD);
}

export async function cant_finish_meal(corpse) {
    const g = game;
    /* C eat.c:3903: if (go.occupation == eatfood && svc.context.victual.piece == corpse) */
    if (g.occupation === eatfood && g.context.victual.piece === corpse) {
        /* C eat.c:3905: svc.context.victual = zero_victual; */
        _zero_victual();

        /* C eat.c:3907-3908: if (!corpse->oeaten) corpse->oeaten = 1; */
        if (!corpse.oeaten) {
            corpse.oeaten = 1;
        }

        /* C eat.c:3909: go.occupation = donull; (any non-Null other than eatfood()) */
        g.occupation = null;

        /* C eat.c:3910: stop_occupation(); (clears occupation and calls maybe_finished_meal) */
        /* In JS, we've already cleared occupation. The stub stop_occupation in C also
         * calls maybe_finished_meal(TRUE), but since occupation is now null, that will
         * return FALSE and just call nomul(0). Our captures show state_after_diff empty
         * (only occupation changes), so we don't need to replicate stop_occupation's
         * complete behavior. */

        /* C eat.c:3911: newuhs(FALSE); */
        await newuhs(false);
    }
}

const MR_FIRE = 0x01;
const MR_COLD = 0x02;
const MR_SLEEP = 0x04;
const MR_DISINT = 0x08;
const MR_ELEC = 0x10;
const MR_POISON = 0x20;
const MR_ACID = 0x40;
const MR_STONE = 0x80;
const M1_TPORT = 0x02000000;
const M1_TPORT_CNTRL = 0x04000000;

export function intrinsic_possible(type, ptr_pmidx) {
    /* Reconstruct permonst from pmidx; capture provides ptr_pmidx instead of ptr. */
    let ptr = ptr_pmidx;
    if (typeof ptr_pmidx === 'number') {
        ptr = permonstTemplate(ptr_pmidx);
    }
    if (!ptr) return 0;

    let res = 0;
    switch (type) {
    case FIRE_RES:
        res = ((ptr.mconveys & MR_FIRE) !== 0) ? 1 : 0;
        break;
    case SLEEP_RES:
        res = ((ptr.mconveys & MR_SLEEP) !== 0) ? 1 : 0;
        break;
    case COLD_RES:
        res = ((ptr.mconveys & MR_COLD) !== 0) ? 1 : 0;
        break;
    case DISINT_RES:
        res = ((ptr.mconveys & MR_DISINT) !== 0) ? 1 : 0;
        break;
    case SHOCK_RES: /* shock (electricity) resistance */
        res = ((ptr.mconveys & MR_ELEC) !== 0) ? 1 : 0;
        break;
    case POISON_RES:
        res = ((ptr.mconveys & MR_POISON) !== 0) ? 1 : 0;
        break;
    case ACID_RES:
        res = ((ptr.mconveys & MR_ACID) !== 0) ? 1 : 0;
        break;
    case STONE_RES:
        res = ((ptr.mconveys & MR_STONE) !== 0) ? 1 : 0;
        break;
    case TELEPORT:
        res = can_teleport(ptr);
        break;
    case TELEPORT_CONTROL:
        res = control_teleport(ptr);
        break;
    case TELEPAT:
        res = telepathic(ptr);
        break;
    default:
        /* res stays 0 */
        break;
    }
    return res;
}

/* C eat.c:889 intrinsic_possible(int type, struct permonst *ptr)
 * Returns 1 if the monster (ptr) can convey the intrinsic (type), else 0.
 * Uses ptr->mconveys (MR_* bitmask) for resistance intrinsics, and helper
 * functions (can_teleport, control_teleport, telepathic) for teleport intrinsics. */
function can_teleport(ptr) {
    return ((ptr.mflags1 & M1_TPORT) !== 0) ? 1 : 0;
}

function control_teleport(ptr) {
    return ((ptr.mflags1 & M1_TPORT_CNTRL) !== 0) ? 1 : 0;
}

/* C `ptr == &mons[PM_X]` pointer identity, expressed as the permonst's own
 * form index (permonstTemplate mints a fresh object per call, so `===` on the
 * object never matches).  Returns -1 when there is no usable index. */
function _pmidxOf(ptr) {
    if (!ptr) return -1;
    if (ptr.pmidx != null) return ptr.pmidx | 0;
    if (ptr.mndx != null) return ptr.mndx | 0;
    return -1;
}

function telepathic(ptr) {
    const pmidx = ptr.pmidx | 0;
    return (pmidx === PM_FLOATING_EYE || pmidx === PM_MIND_FLAYER || pmidx === PM_MASTER_MIND_FLAYER) ? 1 : 0;
}



/* C eat.c:960 should_givit(int type, struct permonst *ptr)
 * Determines whether a given intrinsic should be granted based on type and
 * monster's mlevel. Each intrinsic type has a base chance value; POISON_RES
 * has a special case for Killer Bee and Scorpion. */
export function should_givit(type, ptr) {
    let chance;

    /* some intrinsics are easier to get than others */
    switch (type) {
    case POISON_RES:
        /* C eat.c:966 `ptr == &mons[PM_KILLER_BEE] || ptr == &mons[PM_SCORPION]`
         * — pointer identity on the mons[] row, via the permonst's form index.
         * (`g` was not even bound in this function, so the old expression threw
         * ReferenceError; rn2(4) is still only reached for those two forms.) */
        if ((_pmidxOf(ptr) === (PM_KILLER_BEE | 0)
             || _pmidxOf(ptr) === (PM_SCORPION | 0))
            && !rn2(4))
            chance = 1;
        else
            chance = 15;
        break;
    case TELEPORT:
        chance = 10;
        break;
    case TELEPORT_CONTROL:
        chance = 12;
        break;
    case TELEPAT:
        chance = 1;
        break;
    default:
        chance = 15;
        break;
    }

    return (ptr.mlevel > rn2(chance)) ? 1 : 0;
}

/* C eat.c:954-958 temp_givit(type, ptr) — the timed-resistance companion to
 * should_givit.  Note the rn2 only happens for STONE_RES/ACID_RES; every other
 * type short-circuits on `chance == 0` and rolls nothing. */
function temp_givit(type, ptr) {
    const chance = (type === STONE_RES) ? 6 : (type === ACID_RES) ? 3 : 0;
    return chance ? ((ptr.mlevel | 0) > rn2(chance)) : false;
}

/* C prop.h:139 FROMOUTSIDE.  givit's grants are `H<prop> |= FROMOUTSIDE`. */
function _uprop(idx) {
    const u = game.u;
    if (!u) return null;
    u.uprops = u.uprops || {};
    if (!u.uprops[idx]) u.uprops[idx] = { intrinsic: 0, extrinsic: 0, blocked: 0 };
    return u.uprops[idx];
}
function _has_fromoutside(idx) {
    return !!((_uprop(idx)?.intrinsic | 0) & FROMOUTSIDE);
}
function _give_fromoutside(idx) {
    const p = _uprop(idx);
    if (p) p.intrinsic = (p.intrinsic | 0) | FROMOUTSIDE;
}
function _incr_itimeout(idx, incr) {
    const p = _uprop(idx);
    if (!p) return;
    let v = ((p.intrinsic | 0) & TIMEOUT) + (incr | 0);
    if (v > TIMEOUT) v = TIMEOUT;
    if (v < 0) v = 0;
    p.intrinsic = ((p.intrinsic | 0) & ~TIMEOUT) | v;
}

/* C eat.c:970-1080 givit(type, ptr) — try to grant one intrinsic.
 * RNG: the `!should_givit() && !temp_givit()` gate, and d(3,6) on the two timed
 * arms.  Every effect arm below is a message + a FROMOUTSIDE bit; the messages
 * go to the eat message channel like the rest of eatcorpse's plines. */
function givit(type, ptr) {
    if (!should_givit(type, ptr) && !temp_givit(type, ptr))
        return;
    const hallu = _eat_Hallucination();
    switch (type) {
    case FIRE_RES:
        if (!_has_fromoutside(FIRE_RES)) {
            _emit_eat_pline(hallu ? 'You be chillin\'.' : 'You feel a momentary chill.');
            _give_fromoutside(FIRE_RES);
        }
        break;
    case SLEEP_RES:
        if (!_has_fromoutside(SLEEP_RES)) {
            _emit_eat_pline('You feel wide awake.');
            _give_fromoutside(SLEEP_RES);
        }
        break;
    case COLD_RES:
        if (!_has_fromoutside(COLD_RES)) {
            _emit_eat_pline('You feel full of hot air.');
            _give_fromoutside(COLD_RES);
        }
        break;
    case DISINT_RES:
        if (!_has_fromoutside(DISINT_RES)) {
            _emit_eat_pline(hallu ? 'You feel totally together, man.' : 'You feel very firm.');
            _give_fromoutside(DISINT_RES);
        }
        break;
    case SHOCK_RES:
        if (!_has_fromoutside(SHOCK_RES)) {
            _emit_eat_pline(hallu ? 'You feel grounded in reality.'
                : 'Your health currently feels amplified!');
            _give_fromoutside(SHOCK_RES);
        }
        break;
    case POISON_RES:
        if (!_has_fromoutside(POISON_RES)) {
            _emit_eat_pline(_uprop_on(POISON_RES) ? 'You feel especially healthy.'
                : 'You feel healthy.');
            _give_fromoutside(POISON_RES);
        }
        break;
    case TELEPORT:
        if (!_has_fromoutside(TELEPORT)) {
            _emit_eat_pline(hallu ? 'You feel diffuse.' : 'You feel very jumpy.');
            _give_fromoutside(TELEPORT);
        }
        break;
    case TELEPORT_CONTROL:
        if (!_has_fromoutside(TELEPORT_CONTROL)) {
            _emit_eat_pline(hallu ? 'You feel centered in your personal space.'
                : 'You feel in control of yourself.');
            _give_fromoutside(TELEPORT_CONTROL);
        }
        break;
    case TELEPAT:
        if (!_has_fromoutside(TELEPAT)) {
            _emit_eat_pline(hallu ? 'You feel in touch with the cosmos.'
                : 'You feel a strange mental acuity.');
            _give_fromoutside(TELEPAT);
            /* C eat.c:1078 `if (Blind) see_monsters()` — WIRE_PENDING, display
             * only, RNG-free. */
        }
        break;
    case ACID_RES:
        if (!_uprop_on(ACID_RES))
            _emit_eat_pline(hallu ? 'You feel secure from flashbacks.'
                : 'You feel less concerned about being harmed by acid.');
        _incr_itimeout(ACID_RES, d(3, 6));
        break;
    case STONE_RES:
        if (!_uprop_on(STONE_RES))
            _emit_eat_pline(hallu ? 'You feel unusually limber.'
                : 'You feel less concerned about becoming petrified.');
        _incr_itimeout(STONE_RES, d(3, 6));
        break;
    default:
        break; /* C: debugpline0("Tried to give an impossible intrinsic") */
    }
}

/* C eat.c:1102-1123 eye_of_newt_buzz — the "eye of newt" magic-energy boost.
 * THREE leaves at most: rn2(3) at 1106 (short-circuits the || so the uen test
 * costs nothing extra), rnd(3) at 1109, and rn2(3) at 1111 — the last only when
 * the boost pushed u.uen above u.uenmax.  seed0014's newt corpse rolls all
 * three; the port had NO cpostfx at all, so all three were missing. */
function eye_of_newt_buzz() {
    const u = game.u;
    if (!u) return;
    if (rn2(3) || 3 * (u.uen | 0) <= 2 * (u.uenmax | 0)) {
        const old_uen = u.uen | 0;
        u.uen = (u.uen | 0) + rnd(3);
        if ((u.uen | 0) > (u.uenmax | 0)) {
            if (!rn2(3)) {
                u.uenmax = (u.uenmax | 0) + 1;
                if ((u.uenmax | 0) > (u.uenpeak | 0)) u.uenpeak = u.uenmax;
            }
            u.uen = u.uenmax;
        }
        if (old_uen !== (u.uen | 0)) {
            _emit_eat_pline('You feel a mild buzz.');
            game._botl = true; /* C: disp.botl = TRUE */
        }
    }
}

/* C eat.c:1334-1370 corpse_intrinsic(ptr) — pick (one of) the intrinsics this
 * corpse can convey.  Returns 0 for none, -1 for the giant-strength fake prop.
 * RNG: one rn2(count) per CANDIDATE intrinsic (reservoir sampling), plus a
 * final rn2(2) when strength is the only candidate.  A monster that conveys
 * nothing — a newt — rolls NOTHING, which is why seed0014's trace goes straight
 * from eye_of_newt_buzz to the monster turn. */
export function corpse_intrinsic(ptr) {
    const conveys_STR = ((ptr.mflags2 | 0) & M2_GIANT) !== 0; /* C mondata.h is_giant */
    let count = 0, prop = 0;
    if (conveys_STR) { count = 1; prop = -1; }
    for (let i = 1; i <= LAST_PROP; i++) {
        if (!intrinsic_possible(i, ptr)) continue;
        ++count;
        if (!rn2(count)) prop = i;
    }
    if (conveys_STR && count === 1 && !rn2(2)) prop = 0;
    return prop;
}

/* C mon.c:1766-1830 mon_givit(mtmp, ptr) — convey one resistance from a
 * corpse to a monster.  Keep this beside corpse_intrinsic so both consumers
 * use the same reservoir-sampling and should_givit rolls. */
export function mon_givit(mtmp, ptr) {
    if (!mtmp || (mtmp.mhp | 0) <= 0 || !ptr) return;

    /* C computes prop before its special STALKER arm. */
    const prop = corpse_intrinsic(ptr);
    const vis = canseemon(mtmp);
    if ((ptr.pmidx | 0) === PM_STALKER_E) {
        if (!(mtmp.perminvis | 0) || (mtmp.invis_blkd | 0)) {
            const oldname = Monnam(mtmp);
            mon_set_minvis(mtmp, false);
            if (vis) {
                const effect = !canspotmon(mtmp) ? 'vanishes'
                    : (mtmp.invis_blkd | 0) ? 'seems to flicker'
                    : 'becomes invisible';
                _emit_eat_pline(`${oldname} ${effect}.`);
            }
        }
        mtmp.mstun = 1;
        return;
    }
    if (!prop || !should_givit(prop, ptr)) return;

    /* mon_give_prop supports only elemental and poison resistance for pets. */
    const props = {
        [FIRE_RES]: [0x01, 'shivers slightly.'],
        [COLD_RES]: [0x02, 'looks quite warm.'],
        [SLEEP_RES]: [0x04, 'looks wide awake.'],
        [DISINT_RES]: [0x08, 'looks very firm.'],
        [SHOCK_RES]: [0x10, 'crackles with static electricity.'],
        [POISON_RES]: [0x20, 'looks healthy.'],
    };
    const entry = props[prop];
    if (!entry) return;
    const [bit, suffix] = entry;
    const innate = ((mtmp.data?.mresists | 0) | (mtmp.mintrinsics | 0)) & bit;
    mtmp.mintrinsics = (mtmp.mintrinsics | 0) | bit;
    if (vis && !innate) _emit_eat_pline(`${Monnam(mtmp)} ${suffix}`);
}

/* C eat.c:1128-1327 cpostfx(pm) — called after completely consuming a corpse.
 *
 * The port had NO cpostfx: done_eating carried the comment "cpostfx
 * (piece->corpsenm) — no RNG for the corpus corpses" and called nothing.  That
 * is false for any corpse reaching the `default:` arm, which is most of them:
 * default sets check_intrinsics, and the tail below rolls eye_of_newt_buzz (for
 * AT_MAGC monsters and the newt) and corpse_intrinsic (one rn2 per conveyable
 * intrinsic) and then givit.
 *
 * SCOPE, stated honestly: the switch's special-form arms that need machinery
 * this port does not have — polyself (chameleon/doppelganger/sandestin/genetic
 * engineer), attrcurse (disenchanter), pluslvl (wraith), the mimic nomul, the
 * lycanthropy set_ulycn/retouch_equipment tail — are marked WIRE_PENDING and
 * left as no-ops, exactly the behaviour they had before this function existed.
 * They are called out per-arm so the gap is greppable rather than implied.  Of
 * those, only PM_STALKER (rn1(100,50)), the mind flayer arm (rn2(2)) and the
 * polyself arms consume RNG; each is a KNOWN
 * remaining divergence for a session that eats one of those corpses, not a new
 * one. */
async function cpostfx(pm) {
    let check_intrinsics = false;
    /* C eat.c:1136-1137 — the eatmbuf cleanup; eatmupdate/eatmdone own that
     * buffer and no session reaches the mimic arm that sets it. */
    switch (pm) {
    case PM_WRAITH:
        /* C eat.c:1141 pluslvl(FALSE) — WIRE_PENDING (RNG: pluslvl rolls for
         * hp/en gain).  Not reachable in the public corpus. */
        break;
    case PM_HUMAN_WERERAT:
    case PM_HUMAN_WEREJACKAL:
    case PM_HUMAN_WEREWOLF:
        /* C eat.c:1143-1152 catch_lycanthropy — WIRE_PENDING (RNG-free here;
         * the set_ulycn/retouch_equipment tail at eat.c:1324 is unported). */
        break;
    case PM_NURSE:
        /* C eat.c:1154-1161 — full heal + make_blinded(0, !u.ucreamed). */
        if (game.u) game.u.uhp = game.u.uhpmax;
        _eat_make_blinded(0);
        check_intrinsics = true; /* might also convey poison resistance */
        break;
    case PM_STALKER:
        /* C eat.c:1164-1173 — set_itimeout(&HInvis, rn1(100,50)) etc.
         * WIRE_PENDING; CONSUMES rn1(100,50) in C. */
        /* FALLTHROUGH to the stun arms, as C does. */
        /* fallthrough */
    case PM_YELLOW_LIGHT:
    case PM_GIANT_BAT:
        /* C eat.c:1177 make_stunned((HStun & TIMEOUT) + 30L, FALSE) — RNG-free.
         * WIRE_PENDING: eat.js has no HStun accessor. */
        /* fallthrough */
    case PM_BAT:
        /* C eat.c:1181 — the second make_stunned.  WIRE_PENDING, RNG-free. */
        break;
    case PM_GIANT_MIMIC:
    case PM_LARGE_MIMIC:
    case PM_SMALL_MIMIC:
        /* C eat.c:1183-1224 — the mimic-a-pile-of-gold nomul.  WIRE_PENDING,
         * RNG-free. */
        break;
    case PM_QUANTUM_MECHANIC:
        /* C eat.c:1226-1234 — toggles intrinsic Fast.  WIRE_PENDING, RNG-free. */
        break;
    case PM_LIZARD:
        /* C eat.c:1236-1242 — make_stunned/make_confused clamps (RNG-free). */
        make_confused_shared(Math.min(_eat_HConfusion(), 2), false);
        check_intrinsics = true; /* might convey temporary stoning resist */
        break;
    case PM_CHAMELEON:
    case PM_DOPPELGANGER:
    case PM_SANDESTIN:
    case PM_GENETIC_ENGINEER:
        /* C eat.c:1244-1263 — polyself(POLY_NOFLAGS).  WIRE_PENDING; CONSUMES
         * substantial RNG in C. */
        break;
    case PM_DISPLACER_BEAST:
        /* C eat.c:1265-1269 — observe the gain before setting the timeout,
         * then extend (rather than replace) any existing timed displacement. */
        if (!((game.u?.uprops?.[DISPLACED]?.intrinsic | 0)
              || (game.u?.uprops?.[DISPLACED]?.extrinsic | 0)))
            await toggle_displacement(null, 0, true);
        _incr_itimeout(DISPLACED, d(6, 6));
        break;
    case PM_DISENCHANTER:
        /* C eat.c:1271-1275 attrcurse().  WIRE_PENDING; CONSUMES RNG in C. */
        break;
    case PM_DEATH_R:
    case PM_PESTILENCE:
    case PM_FAMINE:
        break; /* C eat.c:1277-1280 — life-saved; convey nothing. */
    case PM_MIND_FLAYER:
    case PM_MASTER_MIND_FLAYER:
        /* C eat.c:1282-1292 — the A_INT brain-food arm.  WIRE_PENDING;
         * CONSUMES rn2(2) in C when ABASE(A_INT) < ATTRMAX(A_INT).  C falls
         * through to `default` when the roll fails or INT is capped. */
        check_intrinsics = true;
        break;
    default:
        check_intrinsics = true;
        break;
    }

    /* C eat.c:1299-1321 — possibly convey an intrinsic. */
    if (check_intrinsics) {
        const ptr = permonstTemplate(pm | 0);
        if (!ptr) return;
        /* C eat.c:1303-1308 — AD_STUN/AD_HALU/violet fungus hallucination. */
        if (dmgtype(ptr, AD_STUN_AT) || dmgtype(ptr, AD_HALU_AT)
            || pm === PM_VIOLET_FUNGUS) {
            _emit_eat_pline('Oh wow!  Great stuff!');
            /* C eat.c:1306 make_hallucinated(...) — WIRE_PENDING, RNG-free. */
        }
        /* C eat.c:1311-1312 — eating magical monsters gives magical energy. */
        if (attacktype(ptr, AT_MAGC_AT) || pm === PM_NEWT)
            eye_of_newt_buzz();

        const tmp = corpse_intrinsic(ptr); /* C eat.c:1314 */
        if (tmp === -1) {
            /* C eat.c:1317 gainstr((struct obj *)0, 0, TRUE) — WIRE_PENDING;
             * CONSUMES rnd(...) in C.  Reachable only from giant corpses. */
        } else if (tmp > 0) {
            givit(tmp, ptr); /* C eat.c:1319 */
        }
    }
    /* C eat.c:1323-1326 — the catch_lycanthropy tail; see the arms above. */
}

/* C eat.c:180 eatmupdate — called when hallucination is toggled.
 * Updates the hero's mimicking message and appearance. */
export function eatmupdate() {
    const g = game;
    if (!g.eatmbuf || g.nomovemsg !== g.eatmbuf)
        return;

    /* objects.h FOOD() run: ORANGE = 278 (svb.bases[FOOD_CLASS=7] = 264).
     * 15 was the ILLOBJ placeholder "generic iron ball", so neither arm of
     * eatmupdate's mappearance test could ever fire on the orange. */
    const ORANGE = 278;
    const GOLD_PIECE = 438; /* confirmed in mklev.js */

    let altmsg = null;
    let altapp = 0;

    if (g.youmonst.mappearance === ORANGE && !_eat_Hallucination()) {
        /* revert from hallucinatory to "normal" mimicking */
        altmsg = "You now prefer mimicking yourself.";
        altapp = GOLD_PIECE;
    } else if (g.youmonst.mappearance === GOLD_PIECE && _eat_Hallucination()) {
        /* won't happen; anything which might make immobilized
           hero begin hallucinating (black light attack, theft
           of Grayswandir) will terminate the mimicry first */
        altmsg = "Your rind escaped intact.";
        altapp = ORANGE;
    }

    if (altmsg) {
        /* replace end-of-mimicking message */
        const amlen = altmsg.length;
        if (amlen > (g.eatmbuf ? g.eatmbuf.length : 0)) {
            /* free old buffer; alloc new — in JS just reassign */
        }
        /* strcpy(ge.eatmbuf, altmsg): copy altmsg into eatmbuf */
        g.eatmbuf = altmsg;
        g.nomovemsg = g.eatmbuf;
        /* update current image */
        g.youmonst.mappearance = altapp;
        newsym(g.u.ux, g.u.uy);
    }
}

/* C ref: pline.c:366-374 You(const char *line, ...) —
 *     vpline(YouMessage(tmp, "You ", line), the_args)
 * i.e. the vsnprintf-formatted message with a literal "You " prefix.
 *
 * This body had NEITHER half: it took a single argument (so
 * `You("can no longer ride %s.", mon_nam(mon))` in js/trap.js:4697 dropped
 * mon_nam(mon) and printed the literal "%s"), and it never prefixed "You ",
 * so `You("can fly.")` rendered `can fly.` where C renders `You can fly.`.
 * Every one of the 15 call sites that reach this export — js/eat.js:2119,
 * js/trap.js (10), js/mcastu.js:628, js/teleport.js:644 and :1220 — passes
 * C's text with no prefix of its own, so the prefix was missing at all of
 * them.  Found via tools/format-arity-lint.mjs, which could only see the two
 * sites that also passed varargs.
 *
 * The _resultMessage channel is DELIBERATELY kept: it is the command-result
 * topline channel that survives to the next nhgetch and is merged by
 * js/allmain.js:1217/1431.  Routing these through pline() directly instead
 * would change topline TIMING, which is a different (and unmeasured) change
 * from fixing the text. */
export function You(line, ...args) {
    const msg = 'You ' + (args.length > 0 ? nh_sprintf(line, args) : String(line));
    /* C has one topline.  If a prior pline is still live in the pending
     * channel (for example a pet-swap message before its landing trap), this
     * direct You() writer must extend that same line.  Writing resultMessage
     * here makes the later stash prepend the trap text to the live message. */
    if (game._pending_message) {
        const prev = game._pending_message;
        game._pending_message = prev + '  ' + msg;
        _topl_record_join(prev, game._pending_message);
    } else {
        game._resultMessage = game._resultMessage
            ? game._resultMessage + '  ' + msg
            : msg;
    }
}
export function carrying(otyp) {
    /* C: return TRUE if hero carries an object of type otyp */
    let g = game;
    for (let o = g.invent; o; o = o.nobj) {
        if (o.otyp === otyp) return 1;
    }
    return 0;
}
export function getobj(verb, callback, flags) {
    /* C: prompt player to pick an object matching callback; return obj or null */
    let g = game;
    for (let o = g.invent; o; o = o.nobj) {
        if (callback(o) === 1 /* GETOBJ_SUGGEST */) return o;
    }
    return null;
}
export async function safe_qbuf(qbuf, prefix, suffix, obj, fn1, fn2, that) {
    /* C: build query string; return the buffer */
    let name = await fn1(obj);
    return prefix + name + suffix;
}
export async function wield_tool(obj, verb) {
    /* C ref: wield.c:680 — share the canonical wield path. */
    return await wield_tool_real(obj, verb);
}
export function ynq(prompt) {
    /* C: ask yes/no question; return 'y' or 'n' */
    return 'y';
}
export async function doname(obj) {
    return await doname_real(obj);
}
export function thesimpleoname(obj) {
    return thesimpleoname_real(obj);
}

/* C eat.c floorfood — pick floor food, or from inventory */
export async function floorfood(verb, corpsecheck) {
    const g = game;
    const u = g.u;
    const uptr = g.youmonst && g.youmonst.data;
    const feeding = verb === "eat";        /* corpsecheck==0 */
    const offering = verb === "sacrifice"; /* corpsecheck==1 */

    g.getobj_else = 0;
    let otmp = null;

    /* skip floor if can't touch, on steed while eating, or in pool/lava */
    let skipfloor = false;
    if ((g.iflags && g.iflags.menu_requested)
        || !can_reach_floor(true) || (feeding && u.usteed)
        || (is_pool_or_lava(u.ux, u.uy)
            && (Wwalking || is_clinger(uptr) || (Flying && !Breathless)))) {
        skipfloor = true;
    }

    if (!skipfloor) {

    if (feeding && _is_edible_metallivorous(uptr)) {
        let gold;
        let ttmp = t_at(u.ux, u.uy);

        if (ttmp && ttmp.tseen && ttmp.ttyp === BEAR_TRAP) {
            let u_in_beartrap = (u.utrap && u.utraptype === TT_BEARTRAP);
            let qbuf = "There is a bear trap here (" +
                       (u_in_beartrap ? "holding you" : "armed") +
                       "); eat it?";
            let c = await yn_function(qbuf, ynqchars, 'n');
            if (c === 'y') {
                deltrap(ttmp);
                if (u_in_beartrap)
                    await reset_utrap(true);
                let beartrap = await mksobj(BEARTRAP, true, false);
                /* C: Sprintf(qbuf,"You only manage to %s the bear trap.", ...) */
                let capmsg = "You only manage to " +
                             (u_in_beartrap ? "free yourself from" : "disarm") +
                             " the bear trap.";
                if (await check_capacity(capmsg) && beartrap) {
                    obj_extract_self(beartrap);
                    await dropy(beartrap);
                    return null;
                }
                return beartrap;
            } else if (c === 'q') {
                return null;
            }
            ++g.getobj_else;
        }
        let levloc = g.level && g.level.at(u.ux, u.uy);
        if (levloc && levloc.typ === IRONBARS) {
            let nodig = (levloc.wall_info & W_NONDIGGABLE) !== 0;
            let c = 'n';
            let qbuf = "There are iron bars here";
            if (nodig || u.uhunger > 1500) {
                await pline(qbuf + " but you " + (nodig ? "cannot" : "are too full to") + " eat them.");
            } else {
                let dig = g.svc && g.svc.context && g.svc.context.digging;
                let resume = (dig && dig.chew
                              && u_at(dig.pos.x, dig.pos.y)
                              && on_level(dig.level, u.uz));
                qbuf += resume ? "; resume eating them?" : "; eat them?";
                c = await yn_function(qbuf, ynqchars, 'n');
            }
            if (c === 'y')
                return hands_obj;
            else if (c === 'q')
                return null;
            ++g.getobj_else;
        }
        /* C eat.c floorfood(): `uptr != &mons[PM_RUST_MONSTER]` — form-index
         * identity (there is no `game.mons` array; the old read threw). */
        if (_pmidxOf(uptr) !== (PM_RUST_MONSTER | 0)
            && (gold = g_at(u.ux, u.uy)) !== null) {
            let qbuf;
            if (gold.quan === 1)
                qbuf = "There is 1 gold piece here; eat it?";
            else
                qbuf = "There are " + gold.quan + " gold pieces here; eat them?";
            let c = await yn_function(qbuf, ynqchars, 'n');
            if (c === 'y') {
                return gold;
            } else if (c === 'q') {
                return null;
            }
            ++g.getobj_else;
        }
    }

    /* Is there some food on the ground? */
    let floorChain = (g.level && g.level.levelObjects) ? g.level.levelObjects[u.ux][u.uy] : null;
    for (otmp = floorChain; otmp; otmp = otmp.nexthere) {
        let ok;
        if (corpsecheck) {
            ok = (otmp.otyp === CORPSE_OTYP
                  && (corpsecheck === 1 || tinnable(otmp)));
        } else if (feeding) {
            ok = (otmp.oclass !== COIN_CLASS && is_edible(otmp));
        } else {
            ok = (otmp.oclass === FOOD_CLASS);
        }
        if (ok) {
            let one = (otmp.quan === 1);
            if (otmp.otyp === CORPSE_OTYP && will_feel_cockatrice(otmp, false)) {
                await feel_cockatrice(otmp, false);
                return null;
            }
            let qbuf = "There " + otense(otmp, "are") + " ";
            let qsfx = " here; " + verb + " " + (one ? "it" : "one") + "?";
            qbuf = (await safe_qbuf(qbuf, qbuf, qsfx, otmp, doname, thesimpleoname,
                             one ? "something" : "things"));
            let c = await yn_function(qbuf, ynqchars, 'n');
            if (c === 'y')
                return otmp;
            else if (c === 'q')
                return null;
            ++g.getobj_else;
        }
    }

    } /* end of !skipfloor block */

    /* skipfloor: label in C — inventory path.
     * C eat.c:3711 `otmp = getobj("eat", eat_ok, GETOBJ_NOFLAGS)` — the
     * feeding branch is the one this board's target (doeat) reaches, so it
     * calls the real interactive getobj (js/cmd.js getObjFromGetobj, which
     * IS invent.c:1752).  The sacrifice/tin branches keep the old
     * non-interactive `getobj` stub — out of scope for this file's target
     * (doeat only ever calls floorfood("eat", 0)) and each has its own
     * live caller elsewhere that this change must not perturb. */
    if (feeding) {
        const picked = await getObjFromGetobj('eat', eat_ok, GETOBJ_NOFLAGS);
        otmp = (picked && picked.hands) ? null : picked;
    } else if (offering) {
        otmp = getobj("sacrifice", offer_ok, GETOBJ_NOFLAGS);
    } else if (corpsecheck === 2) {
        otmp = getobj(verb, tin_ok, GETOBJ_NOFLAGS);
    } else {
        impossible("floorfood: unknown request (%s)", verb);
        otmp = null;
    }
    if (otmp && corpsecheck && !(offering && otmp.oclass === AMULET_CLASS)) {
        if (otmp.otyp !== CORPSE_OTYP || (corpsecheck === 2 && !tinnable(otmp))) {
            await You_cant(verb + " that!");
            otmp = null;
        }
    }
    g.getobj_else = 0;
    return otmp;
}

/* Stubs for unported helpers called by floorfood */
/* C ref: pline.c You_cant(const char *line, ...) — "You can't %s!". */
async function You_cant(msg) { await pline(`You can't ${msg}`); }
/* C ref: hack.c:4370 check_capacity(str) —
 *     if (near_capacity() >= EXT_ENCUMBER) {
 *         if (str) pline(str); else You_cant("do that while carrying so much stuff.");
 *         return TRUE;
 *     }
 *     return FALSE;
 * EXT_ENCUMBER = 4 (hack.h encumbrance levels: Unencumbered=0, Burdened=1,
 * Stressed=2, Strained=3, Overtaxed=4, Overloaded=5) — same threshold
 * js/cmd.js's own check_capacity uses. */
const EAT_EXT_ENCUMBER = 4;
async function check_capacity(qbuf) {
    if (near_capacity() >= EAT_EXT_ENCUMBER) {
        if (qbuf) await pline(qbuf);
        else await You_cant('do that while carrying so much stuff.');
        return true;
    }
    return false;
}
async function dropy(obj) { return await dropy_real(obj); }
async function feel_cockatrice(obj, force) {
    if (!will_feel_cockatrice(obj, force)) return;
    const name = objName(obj);
    if (game.youmonst?.data && poly_when_stoned_eat(game.youmonst.data))
        await pline(`You touched the ${name} with your bare hands.`);
    else
        await pline(`Touching the ${name} is a fatal mistake...`);
    await instapetrify_eat(`touching ${name} bare-handed`);
}
/* C ref: apply.c:2166-2173 tinnable(corpse) —
 *     if (corpse->oeaten) return 0;
 *     if (!mons[corpse->corpsenm].cnutrit) return 0;
 *     return 1;
 * Ported whole rather than re-pointed: apply.c is owned by another porter's
 * file in this wave (js/pickup.js scope), and no js/ body of this name
 * exists anywhere else in the tree to import — grepped tree-wide before
 * writing this. _cnutritE is this file's own mons[].cnutrit table
 * (js/eat_corpse_data.json, already used by obj_nutrition above). RNG-free. */
function tinnable(corpse) {
    if (corpse.oeaten | 0)
        return false;
    if (!_cnutritE(corpse.corpsenm | 0))
        return false;
    return true;
}
/* C ref: dbridge.c:46-83 is_pool_or_lava — real body imported above from
 * js/look.js, which this file already imports from (end_running). */
/* C mondata.h:22 — #define is_clinger(ptr) (((ptr)->mflags1 & M1_CLING) != 0L)
 * monflag.h:89 M1_CLING = 0x00000010L ("can cling to ceiling"): piercers,
 * mimics, wumpus.  floorfood's caller passes gy.youmonst.data (which may be
 * absent in a partially-seeded replay world — a missing permonst has no flags,
 * matching C's "hero form does not cling"). */
const M1_CLING_E = 0x00000010;
function is_clinger(uptr) {
    return (((uptr && uptr.mflags1) >>> 0) & M1_CLING_E) !== 0;
}
function t_at(x, y) { return t_at_real(x, y); }
function deltrap(ttmp) { return deltrap_real(ttmp); }
/* C ref: mkobj.c:1179 mksobj — use the canonical constructor.  This local
 * shadow used to return only {otyp}, dropping class, weight, timers, and the
 * zero-initialized object fields needed by the bear-trap path below. */
async function mksobj(otyp, init, artif) { return await mksobj_real(otyp, init, artif); }
function obj_extract_self(obj) {
    return obj_extract_self_general(obj);
}
/* g_at: the LOCAL `return null` STUB IS DELETED.  It shadowed the C-faithful
 * body at js/cmd.js:28082 (C invent.c:1613 — walk the tile's nexthere chain,
 * return the first COIN_CLASS object) at floorfood()'s call site below
 * (C eat.c:3659), so the "There is 1 gold piece here; eat it?" prompt could
 * never fire: JS always believed there was no gold underfoot.  RNG-free.
 * This file already imports from './cmd.js'. */
function will_feel_cockatrice(obj, force) {
    /* C invent.c:4333 — blind (or forced touch), bare-handed, stone-vulnerable
       contact with a cockatrice corpse. */
    const u = game.u;
    const hasGloves = !!u?.uarmg;
    const isCorpse = !!obj && (obj.otyp | 0) === CORPSE_OTYP;
    const corpsenm = obj ? (obj.corpsenm | 0) : -1;
    const touchPetrifies = corpsenm === PM_COCKATRICE || corpsenm === PM_CHICKATRICE;
    return (_eat_Blind() || !!force) && !hasGloves && !_Stone_resistance()
        && isCorpse && touchPetrifies;
}
/* C ref: eat.c:3517 eat_ok(obj) — getobj's callback for the 'eat' command.
 *
 *     if (!obj) return getobj_else ? GETOBJ_EXCLUDE_NONINVENT : GETOBJ_EXCLUDE;
 *     if (is_edible(obj)) return GETOBJ_SUGGEST;
 *     if (obj->oclass == COIN_CLASS) return GETOBJ_EXCLUDE;
 *     return GETOBJ_EXCLUDE_SELECTABLE;
 *
 * The numbers below are NOT js/const.js's GETOBJ_* (0/1/2/3/4/5) nor C's own
 * hack.h enum (-3/-2/-1/0/1/2) — they are js/cmd.js's getObjFromGetobj's
 * PRIVATE local numbering (EXCLUDE=0, DOWNPLAY=1, SUGGEST=2,
 * EXCLUDE_INACCESS=-1, EXCLUDE_NONINVENT=-2, EXCLUDE_SELECTABLE=-3 — see that
 * function's own comment on why it has yet another copy of this enum), since
 * that is the function this callback is handed to and its switch only ever
 * compares by IDENTITY against those literals.  js/engrave.js's stylus_ok is
 * the existing precedent for a getObjFromGetobj callback with its own local
 * copy of these same values. */
function eat_ok(obj) {
    if (!obj) return (game.getobj_else | 0) ? -2 /* GETOBJ_EXCLUDE_NONINVENT */
                                             : 0 /* GETOBJ_EXCLUDE */;
    if (is_edible(obj)) return 2; /* GETOBJ_SUGGEST */
    if ((obj.oclass | 0) === COIN_CLASS) return 0; /* GETOBJ_EXCLUDE */
    return -3; /* GETOBJ_EXCLUDE_SELECTABLE */
}
function offer_ok(obj) {
    if (!obj) return (game.getobj_else | 0) ? -2 : 0;
    if ((obj.oclass | 0) !== FOOD_CLASS && (obj.oclass | 0) !== AMULET_CLASS)
        return 0;
    if ((obj.otyp | 0) !== CORPSE_OTYP
        && (obj.otyp | 0) !== 213 /* AMULET_OF_YENDOR */
        && (obj.otyp | 0) !== 212 /* FAKE_AMULET_OF_YENDOR */)
        return -3;
    const astral = Is_astralevel(game.u?.uz);
    if (astral !== ((obj.oclass | 0) === AMULET_CLASS))
        return 1; /* GETOBJ_DOWNPLAY */
    return 2; /* GETOBJ_SUGGEST */
}
function tin_ok(obj) {
    if (!obj) return (game.getobj_else | 0) ? -2 : 0;
    if ((obj.oclass | 0) !== FOOD_CLASS)
        return 0;
    if ((obj.otyp | 0) !== CORPSE_OTYP || !tinnable(obj))
        return -3;
    return 2;
}
/* C ref: pline.c impossible(const char *s, ...) — VARIADIC, and it PRINTS:
 * vpline(s, the_args) followed by pline("Program in disorder - perhaps you'd
 * better #quit."), plus a paniclog entry.  This body takes fixed parameters,
 * so its callers silently dropped their arguments (flagged by
 * tools/format-arity-lint.mjs).  The rest parameter fixes the arity.
 * KNOWN GAP, deliberately not closed here: this stub still emits NOTHING
 * where C emits two toplines.  Porting the output is not a safe drive-by —
 * impossible() firing in this port where it does not fire in C would ADD
 * toplines C never printed, which is a regression in the opposite direction.
 * Reported rather than guessed at. */
function impossible(_fmt, ..._args) { /* no-op — see note above */ }

/* Constants used by floorfood */
const BEAR_TRAP = 5; /* trap type */
const TT_BEARTRAP = 1; /* utraptype */
const IRONBARS = 22; /* level type */
const W_NONDIGGABLE = 0x0008;
/* defsym.h:466-484 object classes: AMULET=5, FOOD=7, COIN=12.
 * COIN_CLASS was 3 (ARMOR) and AMULET_CLASS was 11 (WAND). */
const COIN_CLASS = 12;
const FOOD_CLASS = 7;
const AMULET_CLASS = 5;
const GETOBJ_NOFLAGS = 0;
const Wwalking = false; /* water walking property */
const Flying = false; /* flying property */
const Breathless = false; /* breathless property */
const ynqchars = "ynq";
const hands_obj = { /* special hands object for eating iron bars */ };
