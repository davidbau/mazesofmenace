// uhitm.js — Hero-vs-monster melee.
// C ref: src/uhitm.c — do_attack(), hitum(), known_hitum(); weapon.c dmgval().
//
// Faithful structural port.  The control flow mirrors uhitm.c do_attack():
//   1. the is_safemon() pet/peaceful "swap or stop" block (consumes rn2(7)
//      unless Punished short-circuits it);
//   2. attack_checks() + the actual hitum() melee for hostile monsters.
// The rn2(7) in (1) (uhitm.c:474) must be emitted at exactly the right point so
// the downstream RNG stays in lockstep.
//
// Still unported, in rough order of RNG weight (see the comment at each site):
//   peacefuls_respond()   setmangry's witness reactions (needs MS_* + grownups[])
//   leprechaun dodge      needs m_move(), file-static in monmove.js
//   hmon_hitmon_jousting  needs a lance + steed; d(2,10) + joust()'s rn2(5)/rnl(50)
//   hmon_hitmon_splitmon  pudding split; needs clone_mon()
//   dmgval silver bonus   rnd(20); needs objects[].oc_material
//   Upolyd / hmonas()     no polymorph in this port at all

import { game } from './gstate.js';
import { shkname, in_rooms, shop_keeper } from './shkroom.js';

// C ref: shk.c tended_shop(sroom) — shop_keeper(room) still inside his shop.
// (inhishop() is file-static in shkroom.js; three lines rather than a new
// cross-file export, since eight ports touch that file.)
function tended_shop(rno) {
    const shkp = shop_keeper(rno);
    if (!shkp) return false;
    const rmno = game.level?.at(shkp.mx, shkp.my)?.roomno ?? 0;
    return rmno !== 0 && rmno === shkp.eshk?.shoproom;
}
import { WEP_SDAM, WEP_LDAM } from './weapondmg_data.js';
import { dmgval, hitval, abon, dbon, weapon_type, is_axe,
         mon_hates_blessings, weapon_hit_bonus_core,
         weapon_dam_bonus_core } from './weapon.js';
import { register_monnam_hooks, rndmonnam, bogon_is_pname } from './do_name.js';
import { rn2, rnd, d } from './rng.js';
import { cansee, couldsee } from './vision.js';
import { m_at, newsym, map_invisible, unmap_object, canseemon_shared } from './display.js';
import { isok, IS_OBSTRUCTED, A_STR, A_DEX, A_CON, A_WIS, A_LAWFUL, ACCESSIBLE,
         TAINT_AGE, CORPSTAT_INIT, CORPSTAT_NONE, W_SADDLE, SUPPRESS_SADDLE,
         SHOPBASE, engulfing_u, STRAT_WAITMASK,
         P_NONE, P_ISRESTRICTED, P_UNSKILLED, P_BASIC, P_SKILLED, P_EXPERT,
         P_LAST_WEAPON, P_BARE_HANDED_COMBAT, P_TWO_WEAPON_COMBAT,
         P_RIDING, ERODE_BURN, ERODE_RUST, ERODE_CORRODE, ER_NOTHING,
         EF_NONE, EF_GREASE } from './const.js';
import { Blind } from './vision.js';
import { exercise, adjalign } from './attrib.js';
import { DEADMONSTER, Protection_from_shape_changers, mmove_of, base_mmove,
         healmon, mvitals_died, sensemon } from './mon.js';
import { MFLAGS1, MFLAGS2, M1_WALLWALK, M2_NASTY, M2_ORC, M2_UNDEAD, M2_DEMON,
         M2_COLLECT, M2_HUMAN, M2_HOSTILE, M2_PNAME, humanoid } from './monflags_data.js';
// C ref: include/monflag.h G_UNIQ (0x1000) — generated only once.
const G_UNIQ_XM = 0x1000;
const mflags1_of = (ptr) => (ptr?.pmidx != null ? (MFLAGS1[ptr.pmidx] ?? 0) : 0);
const mflags2_of = (ptr) => (ptr?.pmidx != null ? (MFLAGS2[ptr.pmidx] ?? 0) : 0);
import { dmgtype, attacktype, AT_ENGL, AT_HUGS, AD_STCK } from './monattk_data.js';
import { mattk_of, AT_NONE, AT_CLAW, AT_BITE, AT_KICK, AT_STNG, AT_BUTT, AT_TUCH,
         AT_WEAP, AT_MAGC, AD_PHYS, AD_MAGM, AD_FIRE, AD_COLD, AD_ELEC, AD_ACID,
         AD_BLND, AD_STUN, AD_PLYS, AD_DRLI, AD_STON, AD_SLIM, AD_RUST, AD_CORR,
         AD_ENCH } from './monattk_data.js';
import { mkcorpstat, mkobj, mksobj, CORPSE, FIGURINE, place_object, WEAPON_CLASS,
         TOOL_CLASS, GEM_CLASS, SPBOOK_CLASS, FOOD_CLASS, objects, COIN_CLASS,
         STRANGE_OBJECT } from './mkobj.js';
import { mon_nocorpse, undead_to_corpse, name_to_pmidx } from './makemon.js';
import { more_experienced, newexplevel } from './exper.js';
import { gethungry } from './allmain.js';
import { is_weptool, objectBaseName, simple_typename, is_plural, otense,
         near_capacity, update_inventory } from './invent.js';
import { livelog_printf, LL_CONDUCT } from './livelog.js';
import { engr_at, wipe_engr_at } from './engrave.js';

// ── small monster-state predicates (C: include/monst.h, mondata.h) ──

// C ref: include/monst.h:251 — helpless(mon) = msleeping || !mcanmove.
function helpless(mtmp) {
    const canmove = (mtmp.mcanmove == null) ? 1 : mtmp.mcanmove;
    return !!(mtmp.msleeping || !canmove);
}

// C ref: include/mondata.h is_longworm(ptr) — PM_BABY_LONG_WORM /
// PM_LONG_WORM / PM_LONG_WORM_TAIL (pmidx per makemon.js MONS_NAMES).
const LONGWORM_PMIDX = new Set([112, 114, 330]);
function is_longworm(mdat) {
    return mdat != null && LONGWORM_PMIDX.has(mdat.pmidx);
}

// C ref: include/mondata.h passes_walls(ptr) = (mflags1 & M1_WALLWALK).
// do_attack()'s pet-swap `foo` reads this: a phasing peaceful/tame monster
// standing where the hero is inside rock is NOT a reason to stop, so getting
// it wrong picks the wrong arm of the flee/"doesn't move"/swap three-way
// (rnd(6) monflee vs rn2(6) vs nothing).
function passes_walls(mdat) {
    return (mflags1_of(mdat) & M1_WALLWALK) !== 0;
}

// C ref: display.c is_safemon() macro (include/display.h:159):
//   flags.safe_dog && mpeaceful && canspotmon && !Confusion
//   && !Hallucination && !Stunned.
// safe_dog defaults ON; the early sessions don't disable it.  The hero isn't
// confused/hallucinating/stunned at the bump moment, so those props (not yet
// modelled) read as their default-false.
export function canspotmon(mtmp) {
    if (!mtmp) return false;
    // Blind/telepathy not modelled in the starter state; a lit-room adjacent
    // pet is simply seen when its square is in view.
    if (game.u?.uswallow) return true;
    // C ref: display.h:129 canspotmon(mon) = canseemon(mon) || sensemon(mon).
    // The sensemon half is what makes a monster the hero only knows about
    // through Detect_monsters nameable ("small mimic", not "it").
    return canseemon_shared(mtmp) || sensemon(mtmp);
}

export function is_safemon(mtmp) {
    if (!mtmp) return false;
    const flags = game.flags || {};
    const safe_dog = (flags.safe_dog !== undefined) ? flags.safe_dog : true;
    const Confusion = !!game.u?.uconf;
    const Hallucination = !!game.u?.uhallu;
    const Stunned = !!game.u?.ustun;
    return !!(safe_dog && mtmp.mpeaceful && canspotmon(mtmp)
              && !Confusion && !Hallucination && !Stunned);
}

// C ref: monmove.c:461 monflee(mtmp, fleetime, first, fleemsg) — the
// bookkeeping half.  Both callers of this copy (do_attack's pet-in-the-way
// scare and muse.c's use_scare_monster) pass fleemsg == FALSE, so the message
// ladder and the vrock gas cloud (which monmove.js's copy has) are not needed;
// everything else must match, in particular:
//   - first == FALSE means the body runs even when the monster is ALREADY
//     fleeing, accumulating onto the existing mfleetim;
//   - a resulting fleetime of exactly 1 is bumped to 2;
//   - mon_track_clear() runs UNCONDITIONALLY at the end.
// The last one is RNG-visible: the breadcrumb ring gates m_move's
// `rn2(4 * (cnt - j))` and dog_move's `rn2(MTSZ * (k - j))` backtrack rolls, so
// failing to clear it sends the fleeing pet to a different square (seed0014's
// dog ended 3 squares from the hero instead of adjacent, which flipped
// dog_goal's appr from 0 to 1 and skipped its whole inventory obj_resists scan).
export function monflee(mtmp, fleetime, first, _fleemsg) {
    if (DEADMONSTER(mtmp)) return;
    // (mtmp == u.ustuck -> release_hero(): neither caller can be the engulfer.)
    if (!first || !mtmp.mflee) {
        if (!fleetime) {
            mtmp.mfleetim = 0;          /* don't lose an untimed scare */
        } else if (!mtmp.mflee || mtmp.mfleetim) {
            fleetime += (mtmp.mfleetim || 0);
            if (fleetime === 1) fleetime++;
            mtmp.mfleetim = Math.min(fleetime, 127);
        }
        mtmp.mflee = 1;
    }
    /* ignore recently-stepped spaces when made to flee */
    mtmp.mtrack = [];
}

// ── do_attack ──
// C ref: uhitm.c do_attack(struct monst *mtmp) — try to attack the monster at
// <u.ux+u.dx, u.uy+u.dy>.  Returns TRUE if hero movement is used up, FALSE if
// the monster evaded (so domove falls through to the swap-places logic).
//
// u.dx / u.dy must already be set by the caller (domove).
export async function do_attack(mtmp) {
    const u = game.u;
    // C ref: hack.h `#define Punished (uball != 0)`.  This is the FIRST term of
    // an || chain, so a Punished hero short-circuits the `!rn2(7)` away: the
    // roll must NOT fire while the ball & chain are attached.
    const Punished = !!u?.uball;
    const forcefight = !!game.context?.forcefight;

    // Protection for peaceful '@' and tame 'd': when safe and not force-
    // fighting, we assume the player isn't trying to attack — usually a
    // place-swap (handled by the caller) instead.  C ref uhitm.c:461-509.
    if (is_safemon(mtmp) && !forcefight) {
        // (Stormbringer override not modelled.)
        const loc = game.level?.at(u.ux, u.uy);
        const obstructed = !!(loc && IS_OBSTRUCTED(loc.typ));
        const foo = (Punished || !rn2(7)
                     || (is_longworm(mtmp.data) && mtmp.wormno)
                     || (obstructed && !passes_walls(mtmp.data)));
        // C ref: uhitm.c:481-487 — only checked when there is no other reason
        // to stop.  A tended shop under the target means the hero must NOT
        // swap places with its occupant, so this steers the whole three-way
        // below (stop / "doesn't seem to move" / swap) and therefore whether
        // rnd(6) or rn2(6) is rolled at all.
        let inshop = false;
        if (!foo) {
            for (const rno of in_rooms(mtmp.mx, mtmp.my, SHOPBASE))
                if (tended_shop(rno)) { inshop = true; break; }
        }

        if (inshop || foo) {
            // C ref: uhitm.c:492-494 — bumping a spotted shopkeeper is a
            // payment attempt, not an attack, and never a place-swap.
            // (invent.js's dopay() is still the reduced "no shopkeeper here"
            // stub; the call site is faithful so completing dopay() fixes
            // this path too.)
            if (!game.context?.travel && !game.context?.run
                && canspotmon(mtmp) && mtmp.isshk) {
                const { dopay } = await import('./invent.js');
                await dopay();
                return true;              // ECMD_TIME | dopay()
            }
            if (mtmp.mtame) { // see 'additional considerations' in C
                // Use the FULL monmove.c monflee(), not the reduced copy below:
                // monflee(mtmp, rnd(6), ...) with rnd(6)==1 hits C's `if
                // (fleetime == 1) fleetime++` clamp, so the pet flees for TWO
                // turns.  The reduced copy stored 1, ending the flee a turn
                // early and dropping the fleeing monster's rn2(40) teleport roll
                // from dochug (seed0002 step 273).
                const { monflee: monflee_full } = await import('./monmove.js');
                await monflee_full(mtmp, rnd(6), false, false);
            }
            // C ref: uhitm.c:495-499 — You("stop.  %s is in the way!", buf) where
            // buf = highc(y_monnam(mtmp)).  This message is ALWAYS emitted here
            // (not only while running); the following end_running(TRUE) is a
            // no-op for the single-step commands the corpus uses.
            const buf = x_monnam(mtmp, /*ARTICLE_YOUR*/ 3, null, 0, false);
            const { pline } = await import('./display.js');
            await pline(`You stop.  ${buf.charAt(0).toUpperCase()}${buf.slice(1)} is in the way!`);
            return true;
        } else if (mtmp.mfrozen || helpless(mtmp)
                   || (movement_rate(mtmp) === 0 && rn2(6))) {
            await plineMon(mtmp, "%s doesn't seem to move!");
            return true;
        } else {
            return false; // monster "evaded" -> caller swaps places
        }
    }

    // Hostile / force-fight melee.  attack_checks() + hitum() are not yet
    // needed by any owned session; emit nothing and fall through so behaviour
    // is conservative.  (Faithful expansion: attack_checks(mtmp, uwep) then
    // hitum(mtmp, youmonst.data->mattk).)
    return await hostile_attack(mtmp);
}

// C ref: include/permonst.h mons[].mmove — species base movement rate.  This
// feeds do_attack()'s `mtmp->data->mmove == 0 && rn2(6)`, and MONS[] carries no
// mmove field, so the old `?? 1` fallback made that rn2(6) unreachable for
// EVERY monster.  The sessile species (molds, blue/spotted jelly, lichen's
// mmove==0 neighbours, shriekers' 1) can be peaceful for a co-aligned hero, so
// walking into one really does roll here.  mon.js owns the audited table.
function movement_rate(mtmp) {
    return base_mmove(mtmp);
}

// ── hostile melee: do_attack tail -> hitum -> known_hitum -> hmon ──
//
// C ref: uhitm.c do_attack() (the post-safemon hostile path).  attack_checks()
// consumes no RNG for an ordinary visible adjacent hostile (no displacement, no
// hidden-monster reveal), so the first roll is exercise(A_STR) (uhitm.c:551),
// then hitum().  Faithful to the verified seed0107/seed0104 RNG traces:
//   exercise(A_STR) rn2(19); hitum: rnd(20) [swing], passive rn2(3) [if mon
//   survives a swing], (on hit) dmgval(weapon) [+ exercise(A_DEX) on the first
//   swing], then the kill aftermath (xkilled rn2(6); corpse_chance rn2(2);
//   make_corpse -> mkcorpstat -> mksobj corpse next_ident/rndmonnum/gender).
// C ref: hack.c check_capacity(str) — an Overtaxed (EXT_ENCUMBER) hero can't
// fight at all.  Returning TRUE aborts do_attack BEFORE overexertion(), so it
// also suppresses that turn's gethungry() rn2(20) and exercise(A_STR) rn2(19).
const HVY_ENCUMBER = 3, EXT_ENCUMBER = 4;
async function check_capacity(str) {
    if (near_capacity() >= EXT_ENCUMBER) {
        const { pline } = await import('./display.js');
        await pline(str || "You can't do that while carrying so much stuff.");
        return true;
    }
    return false;
}

// C ref: hack.c overexert_hp() — the HP cost of fighting while Strained+.
async function overexert_hp() {
    const u = game.u;
    if ((u.uhp ?? 0) > 1) {
        u.uhp -= 1;
        game.disp = game.disp || {};
        game.disp.botl = true;
    } else {
        const { pline } = await import('./display.js');
        await pline('You pass out from exertion!');
        exercise(A_CON, false);   // attrib.c exercise(dec) rolls rn2(2)
        // fall_asleep(-10, FALSE): nomul(-10) with no "You wake up" message.
        const { nomul } = await import('./hack.js');
        nomul(-10);
    }
}

// C ref: hack.c overexertion() — "combat increases metabolism".  Called by
// do_attack() before the swing.  Always calls the real gethungry() (the same
// per-turn function allmain.js's moveloop calls) — an EXTRA nutrition burn on
// top of the once-per-turn drain, so an attack turn costs 2 hunger instead of
// 1.  The overexert_hp() arm was previously hardcoded away as "never fires for
// the unencumbered starter hero": it fires on 2 turns in 3 for ANY hero at
// Strained or worse, and its exercise(A_CON, FALSE) draws rn2(2).
export async function overexertion() {
    gethungry(); // hack.c:3056 — "consume extra nutrition during combat"
    if (((game.moves || 0) % 3) !== 0 && near_capacity() >= HVY_ENCUMBER)
        await overexert_hp();
    return (game.multi ?? 0) < 0; // might have fainted (forced to sleep)
}

// ── attack_checks: pre-swing special cases (mimic/hidden-monster reveal) ──
// C ref: display.c canseemon(mon) — visible on an in-sight, non-invisible
// square.  Same shape as the copies in dogmove.js/mon.js/muse.js.
function canseemon(mtmp) {
    if (!mtmp) return false;
    // C ref: display.h canseemon() has NO u.uswallow arm — from inside a
    // stomach vision_recalc() blanks viz_array, so cansee() is false even for
    // the engulfer.  The blanket `return true` here made the hit message print
    // exclam(dmg) where C prints the flat "." (uhitm.c:1659).
    if (mtmp.minvis && !game.u?.see_invis) return false;
    // C ref: display.h _mon_visible() — `(!minvis || See_invisible) && !mundetected`.
    if (mtmp.mundetected) return false;
    return !!cansee(mtmp.mx, mtmp.my);
}

// C ref: mondata.h hides_under(ptr) = (mflags1 & M1_CONCEAL).  Same pmidx set
// as monmove.js's hides_under_pm (cave spider, centipede, scorpion, garter
// snake, snake, water moccasin, pit viper, cobra); duplicated locally rather
// than imported to avoid a uhitm.js<->monmove.js import cycle (monmove.js
// already imports several names from this file).
const M1_CONCEAL_PMIDX = new Set([94, 95, 97, 214, 215, 216, 218, 219]);
function hides_under_pm(ptr) {
    return ptr != null && M1_CONCEAL_PMIDX.has(ptr.pmidx);
}
const S_EEL_MCLS = 57;   // monsym.h S_EEL
const S_MIMIC_MCLS = 13; // monsym.h S_MIMIC

// C ref: rm.h glyph_is_invisible(glyph) — a square remembered as holding a
// sensed-but-unseen monster.  display.js tracks this per-square as `invisMon`
// (see game.js's rm-cell shape / map_invisible()).
export function glyph_is_invisible(x, y) {
    return !!game.level?.at(x, y)?.invisMon;
}

// C ref: display.c mon_warning()/glyph_is_warning() — the "Warning" monster-
// detection intrinsic (via class ring or high-level Cleric prayer reward)
// isn't modeled anywhere in this port yet, so no square is ever a warning
// glyph.
function glyph_is_warning() { return false; }

// C ref: makemon.c FURNSYMS[] explanation text for the 6 furniture
// appearances set_mimic_sym() can assign a mimic (up/down staircase, altar,
// grave, throne, sink).  Same table as hack.js's FURNITURE_EXPLANATION
// (duplicated locally: hack.js imports from this file, so the reverse import
// would cycle).
const FURNITURE_EXPLANATION = {
    25: 'staircase up',
    26: 'staircase down',
    33: 'altar',
    34: 'grave',
    35: 'opulent throne',
    36: 'sink',
};

// C ref: mon.c seemimic(mtmp) — a discovered mimic drops its object/furniture
// appearance and is redrawn as its true form.
export function seemimicLocal(mtmp) {
    mtmp.m_ap_type = 0;
    mtmp.mappearance = 0;
    newsym(mtmp.mx, mtmp.my);
}

// C ref: uhitm.c that_is_a_mimic()'s "what" naming: a_monnam(mtmp), except a
// disguised mimic caught while asleep or frozen is named with a "sleeping"
// adjective instead (C's own comment flags this as misclassifying a
// paralyzed mimic as sleeping — reproduced as-is for fidelity).
function mimic_reveal_what(mtmp) {
    if ((mtmp.msleeping || mtmp.mfrozen) && mtmp.data?.mcls === S_MIMIC_MCLS)
        return an('sleeping ' + (mtmp.data?.name || 'monster'));
    return x_monnam(mtmp, /*ARTICLE_A*/ 2, null, 0, false);
}

// C ref: uhitm.c that_is_a_mimic(mtmp, MIM_REVEAL) — the "That <disguise> is
// really/actually a <mimic>!" reveal line.  Reduced to the M_AP_OBJECT/
// M_AP_FURNITURE cases this port's mimics ever carry (set_mimic_sym never
// assigns M_AP_MONSTER); the Blind branch falls back to C's own generic
// "Wait!  That's a monster!" (Blind_telepat is never true — no telepathy is
// modeled, matching sensemon()'s stub above).
// C ref: pager.c object_from_map(glyph, x, y, &obj_p) — reduced to the
// M_AP_OBJECT-mimic case that_is_a_mimic() needs.  If a REAL floor object of
// the disguise's exact type already sits on the mimic's square, C names that
// (no RNG).  Otherwise it builds a throwaway object via mksobj(glyphotyp,
// FALSE, FALSE) purely to name/pluralize the disguise — critically, mksobj
// ALWAYS assigns o_id via next_ident(), which rolls rnd(2), regardless of the
// FALSE init arg.  This roll is NOT optional: skipping it desyncs every RNG
// draw for the rest of the game (the bug a previous, reverted attempt at this
// fix hit).  The temporary object is never placed on the floor or added to
// any list, matching C's dealloc_obj() cleanup (left to the GC here).
function object_from_map_lite(mtmp) {
    const otyp = mtmp.mappearance;
    const real = (game.level?.objects || []).find(
        (o) => o.ox === mtmp.mx && o.oy === mtmp.my && o.otyp === otyp);
    if (real) return real;
    const otmp = mksobj(otyp, false, false);
    // C ref: pager.c object_from_map() — "to force pluralization" for coins.
    if (otmp.oclass === COIN_CLASS) otmp.quan = 2;
    return otmp;
}

function that_is_a_mimic_message(mtmp) {
    if (Blind()) return "Wait!  That's a monster!";

    let fmtbuf;
    if (mtmp.m_ap_type === 'furniture') {
        const furn = FURNITURE_EXPLANATION[mtmp.mappearance] || 'thing';
        fmtbuf = `That ${furn} actually is %s!`;
    } else if (mtmp.m_ap_type === 'obj') {
        const otyp = mtmp.mappearance;
        const otmp = object_from_map_lite(mtmp);
        const otmp_name = (otyp && otyp !== STRANGE_OBJECT) ? simple_typename(otyp) : 'strange object';
        const plural = is_plural(otmp);
        const verb = otense(otmp, 'are');
        fmtbuf = `${plural ? 'Those' : 'That'} ${otmp_name} ${verb} %s!`;
    } else {
        fmtbuf = "Wait!  That's %s!"; // not reached by this port's data model
    }
    return fmtbuf.replace('%s', mimic_reveal_what(mtmp));
}

// C ref: mon.c wakeup(mtmp, via_attack) — reduced to the pieces attack_checks
// needs: the "<Mon> wakes up!"/"." message (gated on canseemon, using the
// PRE-reset msleeping value) and un-mimicking (mimics/hiders always drop
// their disguise on wakeup here; the M_AP_MONSTER "keep disguise" exception
// never applies since this port's mimics never carry that appearance type).
// The via_attack aftermath (growl/setmangry/ghod_hitsu/hot_pursuit) isn't
// modeled — no covered session reaches a hostile-turn/temple/shop reaction
// from this path yet.
export async function wakeupAttack(mtmp, viaAttack) {
    const wasSleeping = !!mtmp.msleeping;
    if (wasSleeping && canseemon(mtmp)) {
        // C's pline() is update_topl(): this line APPENDS to the hit message
        // that precedes it ("You hit it.  The wood nymph wakes up!") instead of
        // replacing it, which is where the turn's --More-- boundaries fall.
        const { update_topl } = await import('./display.js');
        // mon.c:4325-4328 wake_msg() — flesh golem alone gets " It's alive!".
        const alive = mtmp.data?.name === 'flesh golem' ? " It's alive!" : '';
        await update_topl(`${Monnam(mtmp)} wakes up${viaAttack ? '!' : '.'}${alive}`);
    }
    mtmp.msleeping = 0;
    if (mtmp.m_ap_type) seemimicLocal(mtmp);
    // C ref: mon.c wakeup() via_attack tail.  ghod_hitsu() needs a temple
    // priest; hot_pursuit() needs `!*u.ushops`, and u.ushops is set the moment
    // the hero steps onto the shop door, so an in-shop shopkeeper skips it.
    if (viaAttack) {
        // C ref: mon.c:4353 `if (was_sleeping) growl(mtmp);` — growl() itself
        // draws only under Hallucination, but its wake_nearto(mlevel * 18) tail
        // wakes nearby sleepers, and each one C woke skips disturb()'s rn2(50)
        // next turn.  (An earlier attempt dropped growl for costing screens; it
        // was missing the msound verb table and the helpless() guard.)
        if (wasSleeping) {
            const { growl } = await import('./sounds.js');
            await growl(mtmp);
        }
        await setmangry(mtmp, true);
    }
}

// C ref: mon.c setmangry(mtmp, via_attack) — the hero attacked mtmp.  RNG-free
// unless the hero stands on an Elbereth engraving (rnd(5) alignment penalty).
//
// peacefuls_respond() (mon.c:4160) is NOT ported: it draws rn2(5) + a
// ROLL_FROM() + rn2(10)/rn2(50) per witness, and a witness needs a SECOND
// non-mindless peaceful monster that is awake, can see the hero, and is in
// line of sight.  Porting it needs the MS_* msound enum, which this tree does
// not carry symbolically; a guessed table would silently answer FALSE.
export async function setmangry(mtmp, via_attack) {
    const { update_topl: pline } = await import('./display.js');
    const u = game.u;
    if (via_attack && engraving_says_elbereth(u.ux, u.uy)) {
        const { onscary } = await import('./monmove.js');
        if (onscary(u.ux, u.uy, mtmp) || mtmp.mpeaceful) {
            await pline('You feel like a hypocrite.');
            adjalign((u.ualign?.record ?? 0) > 5 ? -5 : -rnd(5));
            if (!Blind()) await pline('The engraving beneath you fades.');
            // del_engr_at(): wipe_engr_at() with a count past the text length
            // is the same erase with no RNG (wipeout_text is skipped once the
            // engraving is gone).
            const { engr_at: ea } = await import('./engrave.js');
            const ep = ea(u.ux, u.uy);
            if (ep) ep.engr_txt = '';
        }
    }
    mtmp.mstrategy = (mtmp.mstrategy || 0) & ~STRAT_WAITMASK;
    if (!mtmp.mpeaceful || mtmp.mtame) return;
    mtmp.mpeaceful = 0;
    // C ref: mon.c:4230 — angering a priest is scored by co-alignment, not by
    // the flat -1 this used to apply unconditionally.  u.ualign.record is the
    // MODULUS of peace_minded()'s rn2(16 + record) for every later monster.
    if (mtmp.ispriest) {
        const { p_coaligned } = await import('./priest.js');
        adjalign(p_coaligned(mtmp) ? -5 : 2);
    } else {
        adjalign(-1); /* attacking peaceful monsters is bad */
    }
    if (humanoid(mtmp.data) || mtmp.isshk || mtmp.isgd) {
        if (couldsee(mtmp.mx, mtmp.my))
            await pline(`${Monnam(mtmp)} gets angry!`);
    }
    // else growl(mtmp): deliberately silent here — sounds.c growl() is RNG-free
    // and its topline lands where C's does not (measured on seed0030).

    // C ref: mon.c:4247 — `if (!svc.context.mon_moving) peacefuls_respond(mtmp)`.
    // STILL UNPORTED, and it is the largest remaining RNG hole in this file: for
    // every awake, non-mindless peaceful witness in line of sight it can draw
    // rn2(5) + ROLL_FROM(Exclam) (another rn2(5)), rn2(10), rn2(50), or in the
    // same-monster-class arm rn2(3)/rn2(4)/rn2(6)/rn2(25).  Porting it needs
    // maybe_gasp()'s MS_* switch (monflags_data.js has the audited MSOUND table
    // but this tree carries no symbolic MS_* enum) and big_little_match(), whose
    // grownups[] walk is file-static in makemon.js.  A guessed MS_* mapping
    // would silently answer "no gasp" and drop the rn2(5) — the exact failure
    // mode the wrong-constant sweep documents — so it is left explicit.
}

// C ref: engrave.c sengr_at("Elbereth", x, y, TRUE) — a legible Elbereth
// under the hero.
function engraving_says_elbereth(x, y) {
    const ep = engr_at(x, y);
    return !!(ep && (ep.engr_time || 0) <= (game.moves || 0)
              && /Elbereth/i.test(String(ep.engr_txt || '')));
}



// C ref: uhitm.c stumble_onto_mimic(mtmp) — the hero has bumped into (or
// force-attacked) a disguised mimic for the first time: reveal it (message +
// seemimic), then silently wake it (via_attack=FALSE: the "wakes up" framing
// belongs to a fresh attack, not this reveal).  This whole call consumes the
// hero's turn with NO swing — do_attack/attack_checks returns TRUE so the
// caller skips hitum() entirely this turn.
async function stumble_onto_mimic(mtmp) {
    const { pline } = await import('./display.js');
    const msg = that_is_a_mimic_message(mtmp);
    // uhitm.c:6269-6275 — pline() FIRST, `if (reveal_it) seemimic(mtmp)` after.
    // seemimic -> newsym repaints the cell immediately here, so revealing
    // before the message shows the true glyph on any --More-- the message
    // raises, where C still shows the disguise.
    await pline(msg);
    seemimicLocal(mtmp);
    // dmgtype(AD_STCK) + set_ustuck (a large/giant mimic "grabs" the hero on
    // reveal): not modeled — no large/giant mimic reaches this path in the
    // covered corpus (their AD_STCK claw attack is otherwise ported in
    // hmon()'s adtyp table for monster-vs-monster fights, not this branch).
    await wakeupAttack(mtmp, false);
    // wakeup() -> if hero is blind, the monster still won't display; keep the
    // invisible-monster marker up for a blind hero (uhitm.c:6294-6296).
    if (!canspotmon(mtmp) && !glyph_is_invisible(mtmp.mx, mtmp.my))
        map_invisible(mtmp.mx, mtmp.my);
}

// C ref: uhitm.c attack_checks(mtmp, wep) — pre-swing special cases: engulf,
// forcefight, hidden/invisible-monster reveal, mimic reveal, undetected-hider
// reveal, and (peaceful "Really attack?" confirm — needs an interactive
// prompt the recorded input streams can't drive, not modeled).  Returns TRUE
// when the "attack" is fully resolved here (do_attack must return
// immediately, no swing this turn); FALSE means fall through to hitum().
export async function attack_checks(mtmp) {
    // uhitm.c:216 — clear the monster's "waiting for you" AI flag now that
    // you're adjacent enough to attack it (STRAT_WAITMASK = 0x00ff0000).
    if (mtmp.mstrategy != null) mtmp.mstrategy &= ~0x00ff0000;

    if (engulfing_u(mtmp)) return false;
    if (game.context?.forcefight) return false;

    const gx = game.bhitpos.x, gy = game.bhitpos.y;
    const glyphInvisible = glyph_is_invisible(gx, gy);
    const glyphWarning = glyph_is_warning();

    // uhitm.c:217-234 — the hero can't spot the target at all (not merely
    // disguised — an actually hidden/invisible one) and there's no warning/
    // invisible marker already up: announce it and remember an invisible-
    // monster marker there.
    if (!canspotmon(mtmp) && !glyphWarning && !glyphInvisible
        && !(!Blind() && mtmp.mundetected && hides_under_pm(mtmp.data))) {
        // update_topl(), not pline(): C's pline() routes through update_topl(),
        // which more()s an unacknowledged topline that the new text will not fit
        // beside.  Reaching here right after a monster's message (the bullwhip
        // disarm's "yanks ... to the floor!") swallowed that --More-- boundary.
        const { update_topl } = await import('./display.js');
        await update_topl("Wait!  There's something there you can't see!");
        map_invisible(gx, gy);
        // dmgtype(AD_STCK)+set_ustuck sticky-hold branch: large/giant-mimic
        // only, not modeled (see stumble_onto_mimic's note above).
        await wakeupAttack(mtmp, true);
        return true;
    }

    // uhitm.c:243-251 — a disguised mimic (m_ap_type set).  If an "invisible
    // monster" marker is already up at that square the hero already knew
    // something was there, so the reveal is silent and the swing proceeds
    // this same turn; otherwise the reveal (stumble_onto_mimic) consumes the
    // whole turn and no swing happens.
    if (mtmp.m_ap_type && !Protection_from_shape_changers() && !sensemon(mtmp)
        && !glyphWarning) {
        if (glyphInvisible) {
            seemimicLocal(mtmp);
            return false;
        }
        await stumble_onto_mimic(mtmp);
        return true;
    }

    // uhitm.c:253-277 — an undetected hider (hides-under species or eel) the
    // hero can't otherwise see: reveal it, then (without telepathy/Detect_
    // monsters, neither modeled) announce it and consume the turn.
    if (mtmp.mundetected && !canseemon(mtmp) && !glyphWarning
        && (hides_under_pm(mtmp.data) || mtmp.data?.mcls === S_EEL_MCLS)) {
        mtmp.mundetected = 0;
        mtmp.msleeping = 0;
        newsym(mtmp.mx, mtmp.my);
        if (glyphInvisible) {
            seemimicLocal(mtmp);
            return false;
        }
        const { pline } = await import('./display.js');
        if (Blind()) {
            await pline("Wait!  There's a hidden monster there!");
        } else {
            const objAtSquare = game.level?.at(mtmp.mx, mtmp.my)?.objects;
            const obj = Array.isArray(objAtSquare) ? objAtSquare[0] : objAtSquare;
            if (obj) {
                await pline(`Wait!  There's something hiding under ${objectBaseName(obj)}!`);
            } else {
                await pline("Wait!  There's something there you can't see!");
            }
        }
        return true;
    }

    // uhitm.c:281-285 — a sensed (telepathy) hider/mimic wakes/un-hides even
    // without a physical reveal.  sensemon() is always false here, so this
    // never fires yet (no telepathy modeled).
    if ((mtmp.mundetected || mtmp.m_ap_type) && sensemon(mtmp)) {
        mtmp.mundetected = 0;
        await wakeupAttack(mtmp, true);
    }

    // uhitm.c:308-324 — the flags.confirm "Really attack <mon>?" prompt.  Its
    // gate is `flags.confirm && mpeaceful && !Confusion && !Hallucination
    // && !Stunned` and then `canspotmon(mtmp)`, which is is_safemon()'s gate
    // with flags.safe_dog swapped for flags.confirm — so do_attack's safemon
    // block already consumed every target that could reach it, UNLESS the
    // player has turned safe_dog off (nethackrc `!safe_pet`) while leaving
    // confirm on.  That combination would consume an input here (a y/n query),
    // which is the shape of bug the doenhance() menu turned out to be, so it is
    // called out rather than assumed unreachable.

    return false;
}

async function hostile_attack(mtmp) {
    const u = game.u;

    // attack_checks(mtmp, uwep): for an ordinary adjacent, visible hostile the
    // confirmation prompts (peaceful, displacement, hidden monster) don't fire
    // and no RNG is consumed.  bhitpos is the target square.
    game.context = game.context || {};
    game.bhitpos = { x: u.ux + u.dx, y: u.uy + u.dy };

    if (await attack_checks(mtmp)) return true;

    // C ref: uhitm.c:532-534 — `check_capacity(...) || overexertion()` then
    // `goto atk_done`.  The || short-circuits: an Overtaxed hero prints the
    // refusal and NEITHER gethungry()'s rn2(20) nor exercise(A_STR)'s rn2(19)
    // fires.  overexertion() (hack.c:3051) otherwise always calls gethungry()
    // ("combat increases metabolism"), which rolls a single rn2(20)
    // "accessorytime" (eat.c:3191).  This is the per-attack metabolism roll,
    // distinct from the moveloop's per-turn gethungry; it fires at the START of
    // every melee attack, before exercise(A_STR).  Omitting it dropped one
    // rn2(20) per kill turn and shifted the whole post-attack stream by one
    // (seed0006 step 41 / seed0107).
    if (await check_capacity('You cannot fight while so heavily loaded.')
        || await overexertion())
        return await atk_done(mtmp);

    // C ref: uhitm.c:539-540 — a two-weapon setup that has become illegal
    // (shield worn, offhand welded, ...) is dropped HERE, before the swing.
    // u.twoweap drives hitum()'s second rnd(20) swing and known_hitum()'s whole
    // second pass, so leaving it stale doubles the attack's RNG draws.
    if (u?.twoweap) {
        const { can_twoweapon } = await import('./wield.js');
        if (!(await can_twoweapon())) await untwoweapon();
    }
    // C ref: uhitm.c:539-549 — the one-shot gu.unweapon notice.  No RNG, but it
    // occupies the top line and forces a --More-- before the hit message.
    if (game.unweapon) {
        game.unweapon = false;
        if (game.flags?.verbose !== false) {
            // update_topl (not pline) so the hit message that follows pages
            // this line with --More-- the way C's toplin state machine does.
            const { update_topl } = await import('./display.js');
            const { cxname_singular, makeplural, body_part } = await import('./invent.js');
            if (game.uwep) {
                const base = cxname_singular(game.uwep);
                const nm = ((game.uwep.quan ?? 1) > 1) ? makeplural(base) : base;
                await update_topl(`You begin bashing monsters with your ${nm}.`);
            } else {
                await update_topl(`You begin ${Role_if_MONK() ? 'striking' : 'bashing'} monsters with your ${game.uarmg ? 'gloved' : 'bare'} ${makeplural(body_part(6 /*HAND*/))}.`);
            }
        }
    }

    // C ref: uhitm.c:551 — exercise(A_STR, TRUE) "you're exercising muscles".
    exercise(A_STR, true);
    // C ref: uhitm.c:553 u_wipe_engr(3) — "prevent unlimited pick-axe attacks".
    // Previously skipped as "no RNG when not standing on an engraving": when the
    // hero IS standing on one (Elbereth is the common case) wipe_engr_at() rolls
    // rn2(1 + 50/(cnt+1)) plus wipeout_text()'s per-character rolls.
    u_wipe_engr(3);

    // Leprechaun gold-grab dodge (uhitm.c:556): `mdat->mlet == S_LEPRECHAUN
    // && !mfrozen && !helpless && !mconf && mcansee && !rn2(7) && m_move(...)`.
    // Still unported — m_move() is file-static in monmove.js, and rolling the
    // rn2(7) without it would diverge worse on the 1-in-7 that it passes.

    await hitum(mtmp);
    mtmp.mstrategy = (mtmp.mstrategy || 0) & ~STRAT_WAITMASK;
    return await atk_done(mtmp);
}

// C ref: uhitm.c do_attack() `atk_done:` label — after a force-fight at a
// square whose occupant the hero still can't see, leave an "I" remembered
// there.  Reachable via the 'F' prefix at an invisible/unlit monster.
async function atk_done(mtmp) {
    const u = game.u;
    const x = u.ux + u.dx, y = u.uy + u.dy;
    if (game.context?.forcefight && !DEADMONSTER(mtmp) && !canspotmon(mtmp)
        && !glyph_is_invisible(x, y) && !engulfing_u(mtmp))
        map_invisible(x, y);
    return true;
}

// C ref: wield.c untwoweapon() — end two-weapon combat (message + flag).
async function untwoweapon() {
    if (game.u?.twoweap) {
        const { pline } = await import('./display.js');
        await pline('You can no longer use two weapons at once.');
        game.u.twoweap = false;
        update_inventory();
    }
}

// C ref: engrave.c u_wipe_engr(cnt) — `if (can_reach_floor(TRUE))
// wipe_engr_at(u.ux, u.uy, cnt, FALSE)`.  can_reach_floor() is TRUE for a
// non-levitating, non-swallowed hero (invent.js keeps the same stub).
function u_wipe_engr(cnt) {
    wipe_engr_at(game.u.ux, game.u.uy, cnt, false);
}

// C ref: uhitm.c mon_maybe_unparalyze() — a paralyzed monster gets a 1-in-10
// chance to wake.  A monster that can move (the common case) consumes no RNG.
// makemon() sets mcanmove TRUE; JS leaves it undefined until the monster first
// moves, so treat null/undefined as "can move" (only an explicit 0 paralyzes).
function mon_maybe_unparalyze(mtmp) {
    if (mtmp.mcanmove === 0) {
        if (!rn2(10)) { mtmp.mcanmove = 1; mtmp.mfrozen = 0; }
    }
}

// C ref: attrib.c acurr() helpers used by abon().
function ACURR(i) { return game.u?.acurr?.a?.[i] ?? 0; }

// abon()/dbon() now live in js/weapon.js (weapon.c:950/:993).

// ── role / martial-arts helpers (for the bare-handed monk path) ──
const PM_MONK = 5, PM_SAMURAI = 9, PM_HEALER = 3;  // u_init.c role mnums
function roleMnum() {
    const r = game.urole;
    return (r && r.mnum != null) ? r.mnum : null;
}
function Role_if_MONK() { return roleMnum() === PM_MONK; }
// C ref: include/skills.h martial_bonus() = Role_if(SAMURAI) || Role_if(MONK).
function martial_bonus() {
    const m = roleMnum();
    return m === PM_MONK || m === PM_SAMURAI;
}
// C ref: weapon.c P_SKILL(P_BARE_HANDED_COMBAT).  enhance.js owns the live
// skill array (skill_init baseline + every #enhance
// advance replayed on top), so read P_SKILL from there instead of freezing the
// game-start value: a hero who enhances martial arts changes the to-hit bonus,
// the damage bonus and double_punch()'s rn2(5) gate together.
async function bare_handed_skill() {
    const { p_skill_of } = await import('./enhance.js');
    return p_skill_of(P_BARE_HANDED_COMBAT);
}
// C ref: weapon.c weapon_dam_bonus(NULL) — bare-handed-combat branch:
//   bonus = P_SKILL - 1 (>=0); bonus = ((bonus+1)*(martial?3:1))/2.
async function weapon_dam_bonus_barehand() {
    const { p_skill_of } = await import('./enhance.js');
    const u = game.u;
    return weapon_dam_bonus_core(P_BARE_HANDED_COMBAT,
                                 await bare_handed_skill(), 0, {
        martial: martial_bonus(),
        usteed: !!u?.usteed,
        twoweap: !!u?.twoweap,
        skill_riding: p_skill_of(P_RIDING),
    });
}
// C ref: weapon.c:1644 weapon_dam_bonus(weapon) for a WIELDED weapon.
async function weapon_dam_bonus_wielded(weapon) {
    const { p_skill_of } = await import('./enhance.js');
    const u = game.u;
    const wep_type = weapon_type(weapon);
    const type = (u?.twoweap && (weapon === game.uwep || weapon === game.uswapwep))
        ? P_TWO_WEAPON_COMBAT : wep_type;
    return weapon_dam_bonus_core(type, p_skill_of(type), p_skill_of(wep_type), {
        martial: martial_bonus(),
        usteed: !!u?.usteed,
        twoweap: !!u?.twoweap,
        skill_riding: p_skill_of(P_RIDING),
    });
}
// C ref: objects.h oc_bimanual — a two-handed weapon.
const BIMANUAL_OTYPS = new Set([
    55 /*TWO_HANDED_SWORD*/, 57 /*TSURUGI*/, 45 /*BATTLE_AXE*/,
    71 /*DWARVISH_MATTOCK*/, 79 /*QUARTERSTAFF*/,
    59 /*PARTISAN*/, 60 /*RANSEUR*/, 61 /*SPETUM*/, 62 /*GLAIVE*/,
    63 /*HALBERD*/, 64 /*BARDICHE*/, 65 /*VOULGE*/, 66 /*BEC_DE_CORBIN*/,
    67 /*GUISARME*/, 68 /*BILL_GUISARME*/, 69 /*LUCERN_HAMMER*/,
    70 /*FAUCHARD*/,
]);
function bimanual_wep(otmp) {
    return (otmp?.oclass === WEAPON_CLASS || is_weptool(otmp))
        && BIMANUAL_OTYPS.has(otmp.otyp);
}

// ── weapon data (include/objects.h WEAPON sdam/ldam/hitbon + skill type) ──
// oc_wsdam / oc_wldam (small/large monster damage dice), oc_hitbon (to-hit), and
// the skill discipline.  Keyed by otyp; only the starter-inventory weapons that
// the melee sessions wield need to be present (others fall back to 1-pt damage).
const P_DAGGER = 1, P_KNIFE = 2, P_AXE = 3, P_PICK_AXE = 4,
      P_SHORT_SWORD = 5, P_BROAD_SWORD = 6, P_LONG_SWORD = 7,
      P_TWO_HANDED_SWORD = 8, P_SCIMITAR = 9, P_SABER = 9, P_CLUB = 10,
      P_MACE = 11, P_MORNING_STAR = 12, P_FLAIL = 13, P_HAMMER = 14,
      P_QUARTERSTAFF = 15, P_POLEARMS = 16, P_SPEAR = 17, P_TRIDENT = 18,
      P_LANCE = 19, P_BOW = 20, P_DART = 23;

// otyp -> { ws, wl, hb, sk }.  otyp values match mkobj.js objects[] indices.
// C ref: weapon.c objects[otyp].oc_wldam — large-monster damage die; used by
// lock.c forcelock() to derive the lock-forcing chance (oc_wldam * 2).
// WEAP below is a 20-entry hand-written subset; the generated table is complete
// (war hammer 76 is absent from WEAP, so doforce()'s chance was 0 -> never succeeds).
export function oc_wldam(otyp) { return WEP_LDAM[otyp] ?? WEAP[otyp]?.wl ?? 0; }

const WEAP = {
    24: { ws: 3,  wl: 2,  hb: 0, sk: P_DART },         // DART (objects.h: sdam 3 ldam 2)
    27: { ws: 6,  wl: 8,  hb: 0, sk: P_SPEAR },        // SPEAR
    30: { ws: 8,  wl: 8,  hb: 0, sk: P_SPEAR },        // DWARVISH_SPEAR
    34: { ws: 4,  wl: 3,  hb: 2, sk: P_DAGGER },       // DAGGER
    35: { ws: 5,  wl: 3,  hb: 2, sk: P_DAGGER },       // ELVEN_DAGGER (objects.h: sdam 5 ldam 3 hb 2)
    36: { ws: 3,  wl: 3,  hb: 2, sk: P_DAGGER },       // ORCISH_DAGGER (sdam 3 ldam 3 hb 2)
    37: { ws: 4,  wl: 3,  hb: 2, sk: P_DAGGER },       // SILVER_DAGGER (sdam 4 ldam 3 hb 2)
    39: { ws: 3,  wl: 3,  hb: 2, sk: P_KNIFE },        // SCALPEL (healer start)
    40: { ws: 3,  wl: 2,  hb: 0, sk: P_KNIFE },        // KNIFE
    44: { ws: 6,  wl: 4,  hb: 0, sk: P_AXE },          // AXE
    46: { ws: 6,  wl: 8,  hb: 0, sk: P_SHORT_SWORD },  // SHORT_SWORD
    47: { ws: 8,  wl: 8,  hb: 0, sk: P_SHORT_SWORD },  // ELVEN_SHORT_SWORD (sdam 8 ldam 8)
    48: { ws: 5,  wl: 8,  hb: 0, sk: P_SHORT_SWORD },  // ORCISH_SHORT_SWORD (sdam 5 ldam 8)
    49: { ws: 7,  wl: 8,  hb: 0, sk: P_SHORT_SWORD },  // DWARVISH_SHORT_SWORD (sdam 7 ldam 8)
    50: { ws: 8,  wl: 8,  hb: 0, sk: P_SCIMITAR },     // SCIMITAR
    54: { ws: 8,  wl: 12, hb: 0, sk: P_LONG_SWORD },   // LONG_SWORD
    56: { ws: 10, wl: 12, hb: 1, sk: P_LONG_SWORD },   // KATANA
    72: { ws: 6,  wl: 8,  hb: 0, sk: P_LANCE },        // LANCE (mkobj.js otyp 72)
    73: { ws: 6,  wl: 6,  hb: 0, sk: P_MACE },         // MACE  (mkobj.js otyp 73; +1 small)
    79: { ws: 6,  wl: 6,  hb: 0, sk: P_QUARTERSTAFF }, // QUARTERSTAFF (wizard start)
};


// C ref: weapon.c weapon_hit_bonus(weapon) — skill-based to-hit modifier.  The
// per-branch tables were previously collapsed to the constants a Basic-skilled
// starter wielder produces (0 / -9 / -1), which silently answered "Basic" for
// every skill level: an Unskilled discipline is -4, a Skilled one +2, Expert
// +3, and the riding penalty is -2 for an Unskilled rider plus another -2 while
// two-weaponing.  P_SKILL now comes from enhance.js's live array.
async function weapon_hit_bonus(weapon) {
    const u = game.u;
    const { p_skill_of } = await import('./enhance.js');
    const wep_type = weapon_type(weapon);
    const type = (u?.twoweap && (weapon === game.uwep || weapon === game.uswapwep))
        ? P_TWO_WEAPON_COMBAT : wep_type;
    // js/weapon.js owns the arms (weapon.c:1545); this site supplies the live
    // P_SKILL readings.
    return weapon_hit_bonus_core(type, p_skill_of(type), p_skill_of(wep_type), {
        martial: martial_bonus(),
        usteed: !!u?.usteed,
        twoweap: !!u?.twoweap,
        skill_riding: p_skill_of(P_RIDING),
    });
}

// hitval() now lives in js/weapon.js (weapon.c:149) — complete, including
// the kebabable/trident/pick arms and the FULL oc_hitbon table (uhitm's local
// WEAP subset silently read 0 for every weapon outside its 21 entries).

// C ref: worn.c find_mac(mtmp) — mons[].ac reduced by every worn armour piece's
// ARM_BONUS, then clamped to +-AC_MAX.  The minvent loop is a genuine no-op in
// this port: makemon's m_initinv gives no monster body armour, and mkobj.js's
// objects[] carries no a_ac to compute ARM_BONUS from.  The clamp is ported so
// a data-model change there can't silently exceed C's range.
const AC_MAX = 127;
function find_mac(mtmp) {
    let base = mtmp?.data?.ac;
    base = (base != null) ? base : 10;
    if (Math.abs(base) > AC_MAX) base = Math.sign(base) * AC_MAX;
    return base;
}

// C ref: uhitm.c find_roll_to_hit(mtmp, aatyp, weapon, ...) — the "to hit"
// number; the swing connects when this exceeds the d20 dieroll.  Models the
// AT_WEAP path components present in the starter sessions (base, abon, AC,
// low-level/ vs-state adjustments, weapon hitval + skill bonus).  uhitinc and
// the Luck/encumbrance/utrap/polyd/orc terms are 0 for these heroes.
// C ref: mondata.h is_orc(ptr) / is_undead(ptr).
function is_orc(mdat) { return (mflags2_of(mdat) & M2_ORC) !== 0; }
function is_undead(mdat) { return (mflags2_of(mdat) & M2_UNDEAD) !== 0; }
// C ref: role.c Race_if(PM_ELF) — gu.urace is race index 1 in role.js races[].
function Race_if_ELF() {
    return game.initrace === 1 || game.urace?.adj === 'elven';
}
const PM_KNIGHT = 4;
function Role_if_KNIGHT() { return roleMnum() === PM_KNIGHT; }
function Role_if_SAMURAI() { return roleMnum() === PM_SAMURAI; }

// C ref: uhitm.c check_caitiff(mtmp) — a lawful Knight who strikes a helpless
// or fleeing foe, or a Samurai who strikes a peaceful one, loses an alignment
// point.  Called from find_roll_to_hit on the FIRST swing only.  Was entirely
// unported: adjalign() moves u.ualign.record, which is the MODULUS of
// peace_minded()'s rn2(16 + u.ualign.record) for every monster generated
// afterwards (the same mechanism killed() documents below).
export async function check_caitiff(mtmp) {
    const u = game.u;
    if ((u.ualign?.record ?? 0) <= -10) return;
    // C's pline() is update_topl(): the caitiff line OPENS the swing's topline
    // and the hit message appends to it ("You caitiff!  You hit it.").
    const { update_topl } = await import('./display.js');
    if (Role_if_KNIGHT() && (u.ualign?.type ?? 0) === A_LAWFUL
        && !is_undead(mtmp.data)
        && (helpless(mtmp) || (mtmp.mflee && !mtmp.mavenge))) {
        await update_topl('You caitiff!');
        adjalign(-1);
    } else if (Role_if_SAMURAI() && mtmp.mpeaceful) {
        await update_topl('You dishonorably attack the innocent!');
        adjalign(-1);
    }
}

async function find_roll_to_hit(mtmp, weapon, first_swing) {
    const u = game.u;
    // C: 1 + abon() + find_mac(mtmp) + u.uhitinc + Luck-term
    //    + maybe_polyd(youmonst.data->mlevel, u.ulevel).  A non-polymorphed hero
    //    contributes maybe_polyd == u.ulevel; the starter heroes are never polyd
    //    here.  The Luck adjustment sgn(Luck)*((|Luck|+2)/3) is 0 at Luck 0.
    const luck = u.uluck || 0;
    const luckTerm = Math.sign(luck) * Math.trunc((Math.abs(luck) + 2) / 3);
    let tmp = 1 + abon() + find_mac(mtmp) + (u.uhitinc || 0)
              + luckTerm + (u.ulevel || 1);

    // C ref: uhitm.c:379 — `if (!(*attk_count)++) check_caitiff(mtmp)`, i.e.
    // once per do_attack, on the first swing only.
    if (first_swing) await check_caitiff(mtmp);

    // vs. monster state.  C tests !mtmp->mcanmove, which is FALSE for a freshly
    // generated (awake, mobile) monster — makemon sets mcanmove TRUE.  JS leaves
    // it undefined until a monster first acts, so only an explicit 0 (paralyzed/
    // sleeping) should add the +4; undefined means "can move" (no bonus).
    if (mtmp.mstun) tmp += 2;
    if (mtmp.mflee) tmp += 2;
    if (mtmp.msleeping) tmp += 2;
    if (mtmp.mcanmove === 0) tmp += 4;
    // C ref: uhitm.c:396-401 — Monk role/race adjustments.  The armour penalty
    // arm (uarm -> -urole.spelarmr, 20 for the Monk) was omitted as "the starter
    // monk has no body armour"; a Monk who puts a suit on takes it, and the
    // bare-handed bonus additionally requires an empty SHIELD hand.
    if (Role_if_MONK()) {
        if (game.uarm) tmp -= MONK_SPELARMR;
        else if (!weapon && !game.uarms)
            tmp += Math.trunc((u.ulevel || 1) / 3) + 2;
    }
    // C ref: uhitm.c:402-404 — elves hit orcs more easily.  Elf heroes and orc
    // monsters are both common; the term was simply missing.
    if (is_orc(mtmp.data) && Race_if_ELF()) tmp++;

    // C ref: uhitm.c:406-410 — "with a lot of luggage, your agility diminishes"
    // and being stuck in a trap costs 3.  Both were omitted as unencumbered/
    // untrapped starter state.
    const wtcap = near_capacity();
    if (wtcap !== 0) tmp -= (wtcap * 2) - 1;
    if (u.utrap) tmp -= 3;

    // C ref: uhitm.c:417-421 — AT_WEAP/AT_CLAW: hitval only when a weapon is
    // actually wielded, but weapon_hit_bonus() always (it maps NULL to the
    // bare-handed/martial-arts discipline itself).
    if (weapon) tmp += hitval(weapon, mtmp);
    tmp += await weapon_hit_bonus(weapon);
    return tmp;
}
// C ref: role.c roles[PM_MONK].spelarmr — the Monk's body-armour spell/hit
// penalty.
const MONK_SPELARMR = 20;

// C ref: uhitm.c hitum(mon, uattk) — deliver a melee swing (and, when two-
// weaponing, a second swing with uswapwep).  Returns whether mon still lives.
async function hitum(mon) {
    const u = game.u;
    const x = u.ux + u.dx, y = u.uy + u.dy;
    const secondwep = u.twoweap ? game.uswapwep : null;
    // C ref: uhitm.c:775 — `gt.twohits = (uwep ? u.twoweap : double_punch())`.
    // The bare-handed arm was hardcoded FALSE; double_punch() rolls rn2(5) for
    // any hero whose bare-handed/martial-arts skill is above Basic, and on
    // success delivers a whole second swing (rnd(20) + hmon + passive).
    const twohits = (game.uwep ? !!u.twoweap : await double_punch());

    // ── first swing (uwep) ──
    let tmp = await find_roll_to_hit(mon, game.uwep, true);
    mon_maybe_unparalyze(mon);
    let dieroll = rnd(20);                     // uhitm.c:780
    let mhit = (tmp > dieroll);
    if (mhit) exercise(A_DEX, true);           // uhitm.c:783 (on hit only)
    let kh = await known_hitum(mon, game.uwep, mhit, dieroll);
    let malive = kh.malive;
    mhit = kh.mhit;
    // passive(mon, uwep, mhit, malive, AT_WEAP): the defender's passive counter
    // fires after every swing (even a miss) while the monster is alive.
    await passive(mon, game.uwep, mhit, malive, AT_WEAP);

    // ── second swing (uswapwep) for two-weapon combat ──
    if (twohits && malive && m_at(x, y) === mon) {
        tmp = await find_roll_to_hit(mon, game.uswapwep, false);
        mon_maybe_unparalyze(mon);
        dieroll = rnd(20);                     // uhitm.c:804
        mhit = (tmp > dieroll);
        // note: the second swing does NOT roll exercise(A_DEX) (uhitm.c).
        kh = await known_hitum(mon, secondwep, mhit, dieroll);
        malive = kh.malive;
        mhit = kh.mhit;
        // second passive counter-attack only occurs if the second swing hit.
        if (mhit) await passive(mon, secondwep, mhit, malive, AT_WEAP);
    }
    return malive;
}

// C ref: uhitm.c double_punch() — chance of a second bare-handed/martial-arts
// blow: 20% per skill level above Basic.  `skl_lvl > P_BASIC` short-circuits
// the rn2(5) away for every hero who has not enhanced the discipline, which is
// why the starter corpus never showed the roll.
async function double_punch() {
    const skl_lvl = await bare_handed_skill();
    if (!game.uwep && !game.uarms && skl_lvl > P_BASIC)
        return (skl_lvl - P_BASIC) > rn2(5);
    return false;
}

// C ref: uhitm.c known_hitum() — apply a swing's outcome.  Miss -> missum();
// hit -> hmon() (damage + possible kill).  C takes `int *mhit` and can turn a
// hit back into a miss, so this returns { malive, mhit } rather than a bare
// boolean.
async function known_hitum(mon, weapon, mhit, dieroll) {
    if (!mhit) {
        await missum(mon);
        return { malive: true, mhit };
    }
    // C ref: uhitm.c known_hitum():613-616 — KMH conduct: count a weapon-class
    // (or weapon-skilled tool) hit before the damage is applied.
    const u0 = game.u;
    if (!u0.uconduct) u0.uconduct = {};
    const oldweaphit = u0.uconduct.weaphit || 0;
    if (weapon && (weapon.oclass === WEAPON_CLASS || is_weptool(weapon)))
        u0.uconduct.weaphit = oldweaphit + 1;
    const oldhp = mon.mhp;
    const malive = await hmon(mon, weapon, dieroll);
    // C ref: uhitm.c known_hitum():624 — a monster that SURVIVES the hit has a
    // 1/25 chance to flee if reduced below half HP.  The rn2(25) gate fires for
    // every surviving hit; only on a 0 (and mhp < mhpmax/2) does monflee roll
    // its own rn2(3) duration (seed5002 step-242: rn2(25) after hitting the
    // small mimic).  The inline `mon.mflee = 1` this replaces skipped monflee's
    // mfleetim bookkeeping AND its unconditional mon_track_clear(), and the
    // breadcrumb ring gates m_move's rn2(4*(cnt-j)) backtrack roll — the same
    // mechanism documented on the local monflee() copy above.  fleemsg is TRUE
    // here, so the message ladder needs monmove.js's full copy.
    if (malive) {
        if (!rn2(25) && (mon.mhp < Math.trunc((mon.mhpmax ?? 0) / 2))
            && !engulfing_u(mon)) {
            const { monflee: monflee_full } = await import('./monmove.js');
            await monflee_full(mon, !rn2(3) ? rnd(100) : 0, false, true);
            // set_ustuck(0) needs sticks(youmonst.data)/u.ustuck == mon, which
            // no hero form in this port reaches.
        }
        // C ref: uhitm.c:634-639 — a hit that did NO damage (shade, worm tail,
        // Vorpal decapitation miss) is retroactively demoted to a miss, which
        // un-counts the weaphit conduct and suppresses the second swing's
        // passive() call in hitum().
        if (mon.mhp === oldhp) {
            mhit = false;
            game.u.uconduct.weaphit = oldweaphit;
        }
    }
    return { malive, mhit };
}

// C ref: uhitm.c missum() — the "You miss the <mon>." top-line message.
async function missum(mon) {
    const { update_topl } = await import('./display.js');
    if (canspotmon(mon))
        await update_topl(`You miss ${mon_nam(mon)}.`);
    else
        await update_topl('You miss it.');
    // C ref: uhitm.c:5212 missum() — `if (!helpless(mdef)) wakeup(mdef, TRUE);`,
    // and helpless(mon) is (msleeping || !mcanmove).  The via_attack half
    // (setmangry) was omitted, so a missed swing at a peaceful monster never
    // angered it.  The unconditional `msleeping = 0` that used to follow undid
    // the guard: a MISS does not wake a sleeper, which is why the bones ghost
    // is still "asleep" when the farlook that follows names it.
    if (!mon.msleeping && mon.mcanmove) await wakeupAttack(mon, true);
}

// C ref: uhitm.c hmon(mon, obj, thrown, dieroll) — the thin wrapper around
// hmon_hitmon().  Was collapsed into hmon_hitmon, which dropped an RNG call:
// hitting a priest rolls rn2(2) whether or not the ghod_hitsu() aftermath does
// anything.  (ghod_hitsu() itself needs in_rooms(TEMPLE), globally stubbed
// empty in this port, so it returns immediately; angry_guards() is RNG-free.)
async function hmon(mon, weapon, dieroll) {
    const result = await hmon_hitmon(mon, weapon, dieroll);
    if (mon.ispriest && !rn2(2)) {
        /* ghod_hitsu(mon): no-op without a TEMPLE room number */
    }
    return result;
}

// C ref: uhitm.c hmon_hitmon() — the weapon-melee damage path (the only
// branch the starter sessions reach: a wielded WEAPON_CLASS blade vs an
// ordinary monster).  Rolls dmgval(weapon, mon), applies STR/skill bonuses,
// subtracts from mon->mhp, and on a kill runs the xkilled() aftermath.
async function hmon_hitmon(mon, weapon, dieroll) {
    const unarmed = !weapon;
    let dmg;
    // C ref: uhitm.c:1768 `hmd.use_weapon_skill = FALSE;` — set TRUE by the
    // ordinary-weapon and bare-handed arms only.
    let use_weapon_skill = false;
    if (unarmed) {
        // hmon_hitmon_barehands (uhitm.c:847): dmg = rnd(martial ? 4 : 2).
        dmg = rnd(martial_bonus() ? 4 : 2);
    } else if (weapon.oclass === WEAPON_CLASS || is_weptool(weapon)) {
        // hmon_hitmon_weapon_melee: dmg = dmgval(weapon, mon).
        dmg = dmgval(weapon, mon);
        use_weapon_skill = true;               // C ref: uhitm.c:943
        // C ref: uhitm.c:947-951 — a Healer's anatomy knowledge: a knife-skill
        // WEAPON_CLASS item in hand adds min(3, mvitals[species].died / 6).
        // The Healer starts with a scalpel, so this fires as soon as the same
        // species has been killed six times.
        if (roleMnum() === PM_HEALER && weapon.oclass === WEAPON_CLASS
            && (objects[weapon.otyp]?.oc_skill ?? 0) === P_KNIFE) {
            const died = game.mvitals?.[mon?.data?.pmidx]?.died ?? 0;
            dmg += Math.min(3, Math.trunc(died / 6));
        }
    } else {
        // C ref: uhitm.c hmon_hitmon_misc_obj() `default:` — wielding an
        // ordinary object still hurts, by its weight.  dmgval() returns 0 for
        // a non-weapon, so this path used to deal NO damage at all (a wielded
        // stethoscope could never kill anything).  The per-otyp special cases
        // (boulder, iron ball, potions, cream pie, corpses, ...) are not
        // reached by the covered sessions and are left to the default arm.
        dmg = hmon_misc_obj_dmg(weapon);
    }
    const train_weapon_skill = dmg > 1;   // uhitm.c:849 / :946

    // C ref: uhitm.c:1015 hmon_hitmon_do_hit() — `if (obj->oartifact
    // && artifact_hit(&youmonst, mon, obj, &hmd->dmg, hmd->dieroll))`.  Runs
    // AFTER the train_weapon_skill snapshot and BEFORE dmg_recalc's STR/skill
    // bonuses.  js/artifact.js was imported by nothing, so spec_dbon() never
    // ran: a PHYS(n,0) artifact (Grayswandir, Dragonbane, …) doubles the blow
    // and every artifact hit was landing for half of C's damage.
    if (weapon?.oartifact) {
        const { artifact_hit } = await import('./artifact.js');
        const mdmg = { d: dmg };
        const prevmsg = game._pending_message;
        const special = await artifact_hit(game.youmonst || game.u, mon,
                                           weapon, mdmg, dieroll);
        dmg = mdmg.d;
        if (game._pending_message && game._pending_message !== prevmsg) {
            const { update_topl } = await import('./display.js');
            const line = game._pending_message;
            game._pending_message = prevmsg;
            await update_topl(line);
        }
        if (special) {
            /* C: artifact killed the monster / beheading missed a headless one */
            if (DEADMONSTER(mon)) return false;
            if (dmg === 0) return true;
        }
    }


    // hmon_hitmon_dmg_recalc: strength + skill bonuses (get_dmg_bonus).  For a
    // two-weapon swing the STR bonus is scaled to 3/4; udaminc is 0 for the
    // starter hero.  weapon_dam_bonus is 0 at P_BASIC for a wielded weapon, and
    // the martial barehand branch for an unarmed monk/samurai.
    if (dmg > 0) {
        let strbonus = dbon();
        const absb = Math.abs(strbonus);
        if (game.u?.twoweap) {
            strbonus = Math.trunc((3 * absb + 2) / 4) * Math.sign(strbonus || 1);
            if (strbonus === 0 && dbon() !== 0) strbonus = 0;
        } else if (game.uwep && bimanual_wep(game.uwep)) {
            // C ref: uhitm.c:1467 — a melee hit with a TWO-HANDED weapon uses a
            // 3/2 strength bonus (to approximate a two-weapon double hit).
            // This arm was missing, so every two-handed-sword / battle-axe /
            // mattock wielder hit for less than C.
            strbonus = Math.trunc((3 * absb + 1) / 2) * Math.sign(strbonus || 1);
        }
        dmg += strbonus;
        // C ref: uhitm.c:1484-1489 — `if (use_weapon_skill) dmgbonus +=
        // weapon_dam_bonus(skillwep)`.  Only the bare-handed arm used to be
        // applied here, so a WIELDED weapon got no skill modifier at all: a
        // hero swinging something outside their role's skill table should take
        // -2, and a Skilled/Expert one +1/+2.
        if (unarmed) {
            dmg += await weapon_dam_bonus_barehand();
        } else if (use_weapon_skill) {
            dmg += await weapon_dam_bonus_wielded(weapon);
        }
        if (dmg < 1) dmg = 1;
    }

    // C ref: uhitm.c:1494 — a hit for more than minimal damage (measured BEFORE
    // the STR/skill bonuses above) trains the wielded weapon's skill; that
    // counter is what the wizard-mode #enhance menu prints.  train_weapon_skill
    // is set from the raw dmgval()/rnd() roll (uhitm.c:849, :946).
    if (train_weapon_skill) {
        const { use_skill, uwep_skill_type } = await import('./enhance.js');
        use_skill(uwep_skill_type(), 1);
    }

    // C ref uhitm.c:1825-1831 — the stagger/knockback gate, an if/else-if:
    //   unarmed && dmg>1 && !thrown && !obj && !Upolyd      -> hmon_hitmon_stagger
    //   !unarmed && dmg>1 && !thrown && !Upolyd && !twoweap && uwep -> maybe_knockback
    // (jousting omitted — no lance/steed here).  This is evaluated BEFORE the
    // mhp subtraction; stagger rolls rnd(100) immediately, knockback is deferred
    // until after a surviving hit (below).
    let maybe_knockback = false;
    if (unarmed && dmg > 1) {
        rnd(100);                              // hmon_hitmon_stagger (uhitm.c:1576)
    } else if (!unarmed && dmg > 1 && !game.u?.twoweap && game.uwep) {
        maybe_knockback = true;                // uhitm.c:1831
    }

    // C ref: uhitm.c:1841-1844 first_weapon_hit() — logged BEFORE the mhp
    // subtraction so a same-turn kill's "killed for the first time" gamelog
    // line always follows this one, never precedes it.  minimal_xname()-style
    // bare name (cursed prefix only; no BUC/erosion/enchant/call-name) mirrors
    // first_weapon_hit()'s own avoidance of xname()'s player-supplied name.
    // C ref: uhitm.c:1835-1843 — the conduct line only fires for a real weapon
    // or weptool (the same test that gates the weaphit++ in known_hitum); a
    // wielded stethoscope/tool must not log it.
    if (!unarmed && (weapon.oclass === WEAPON_CLASS || is_weptool(weapon))
        && dmg > 0 && (game.u?.uconduct?.weaphit ?? 0) <= 1) {
        const buf = (weapon.cursed && weapon.bknown ? 'cursed ' : '')
            + objectBaseName(weapon);
        livelog_printf(LL_CONDUCT,
            `hit with a wielded weapon (${buf}) for the first time`);
    }

    mon.mhp = (mon.mhp || 0) - dmg;
    if (mon.mhpmax != null && mon.mhp > mon.mhpmax) mon.mhp = mon.mhpmax;
    const destroyed = (mon.mhp <= 0 || DEADMONSTER(mon));

    // C ref: uhitm.c:1866 hmon_hitmon_pet() — runs BEFORE killed(), so abusing
    // a pet counts even on the blow that kills it.  Both halves draw: abuse_dog
    // rolls rn2(mtame) to pick yelp vs growl, and a surviving pet's monflee
    // rolls rnd(dmg).  (hmon_hitmon_splitmon() next needs clone_mon() for the
    // black/brown pudding iron-weapon split; still unported.)
    await hmon_hitmon_pet(mon, dmg, destroyed);

    if (destroyed) {
        // hmon_hitmon_msg_hit is suppressed once destroyed; killed() gives the
        // "You kill the <mon>!" message and runs the corpse/treasure aftermath.
        await killed(mon);
        return false;
    }

    // C ref: uhitm.c:1644 hmon_hitmon_msg_hit() — the surviving hand-to-hand
    // hit message.  When flags.verbose is OFF the terse "You hit it." is used
    // UNCONDITIONALLY (regardless of whether the monster is spotted); only in
    // verbose mode does it name the monster.  (seed4500 sets `!verbose` in its
    // nethackrc, so an adjacent, fully-visible earth elemental still prints
    // "You hit it.")
    const { update_topl } = await import('./display.js');
    const verbose = game.flags?.verbose !== false;
    const exclamU = (f) => (f < 0 ? '?' : (f <= 4 ? '.' : '!'));
    if (!verbose)
        await update_topl('You hit it.');
    else if (canspotmon(mon))
        await update_topl(`You hit ${mon_nam(mon)}${canseemon(mon) ? exclamU(dmg) : '.'}`);
    else
        await update_topl('You hit it.');
    // C ref: uhitm.c:1925 — `wakeup(mon, TRUE)` for a surviving, on-map hit.
    // This was reduced to a bare `msleeping = 0`, which dropped the via_attack
    // half: landing a HIT on a peaceful monster never angered it (only a miss
    // did, through missum()), so it kept its mpeaceful AI and its peaceful
    // dochug branch for the rest of the fight.
    await wakeupAttack(mon, true);

    // C ref uhitm.c:1922-1931 — wakeup(mon) then, for a surviving armed hit,
    // mhitm_knockback(&youmonst, mon, ...).  Its leading rolls always fire:
    //   knockdistance = rn2(3)        (uhitm.c:5258)
    //   if (rn2(chance)) return FALSE  (uhitm.c:5269, chance==6, no ogresmasher)
    // The contest hits all take the 5/6 "no knockback" branch, so the later
    // size/solidity gates draw nothing.  (seed5002 step-242: hero hits the
    // small mimic — the rn2(6) chance roll must follow the rn2(3) knockdistance.)
    if (maybe_knockback) {
        rn2(3);                                // knockdistance (uhitm.c:5258)
        rn2(6);                                // chance         (uhitm.c:5269)
    }
    return true;
}

// C ref: uhitm.c hmon_hitmon_pet() — the hero struck a pet.
async function hmon_hitmon_pet(mon, dmg, destroyed) {
    if (!mon.mtame || dmg <= 0) return;
    await abuse_dog(mon);
    if (mon.mtame && !destroyed) {
        const { monflee: monflee_full } = await import('./monmove.js');
        await monflee_full(mon, 10 * rnd(dmg), false, false);
    }
}

// C ref: dog.c abuse_dog(mtmp) — reduce tameness.  The yelp/growl choice draws
// rn2(mtame) (short-circuited away once mtame reaches 0); both sounds are
// RNG-free, and growl() is deliberately silent in this port (see wakeupAttack).
export async function abuse_dog(mtmp) {
    if (!mtmp.mtame) return;
    // Aggravate_monster/Conflict (the mtame/=2 arm) aren't modelled here.
    mtmp.mtame--;
    if (mtmp.mtame && !mtmp.isminion && mtmp.edog)
        mtmp.edog.abuse = (mtmp.edog.abuse || 0) + 1;
    // m_unleash() needs a leash, which this port never creates.
    if (mtmp.mx !== 0) {
        // Both sounds DRAW while hallucinating (ROLL_FROM(h_sounds) == rn2(35)),
        // and both wake_nearto(), which suppresses the woken sleepers' disturb()
        // rolls next turn — so neither can be stubbed out.
        const { yelp, growl } = await import('./sounds.js');
        if (mtmp.mtame && rn2(mtmp.mtame)) await yelp(mtmp);
        else await growl(mtmp);
        if (!mtmp.mtame) newsym(mtmp.mx, mtmp.my);
    }
}

// C ref: uhitm.c passive(mon, weapon, mhit, malive, aatyp, wep_was_destroyed) —
// the defender's passive counter-attack.  Walks mattk[] to the AT_NONE slot,
// then rolls its damage dice UNCONDITIONALLY (before either switch, and even if
// the monster just died).
//
// The old body only kept the trailing `rn2(3)` on the grounds that the starter
// victims' passive slot is damn==damd==0.  Every acid blob (1d8), jelly, mold
// and floating eye (d(m_lev+1, damd)) has a real one, and those are among the
// first monsters any hero meets: each swing at a blue jelly draws five rolls
// here that this port was not making.
export async function passive(mon, weapon, mhit, malive, aatyp) {
    const ptr = mon.data;
    const attacks = mattk_of(ptr);
    const NATTK = 6;
    // C: mattk[] is a zero-filled fixed array, so a species whose table is
    // shorter than NATTK has {AT_NONE, AD_PHYS, 0, 0} in the missing slots.
    let slot = null;
    for (let i = 0; i < NATTK; i++) {
        const a = attacks[i];
        if (!a) { slot = { aatyp: AT_NONE, adtyp: AD_PHYS, damn: 0, damd: 0 }; break; }
        if (a.aatyp === AT_NONE) { slot = a; break; }
    }
    if (!slot) return;                         // no passive attacks

    let tmp;
    if (slot.damn) tmp = d(slot.damn, slot.damd);
    else if (slot.damd) tmp = d((mon.m_lev ?? ptr?.mlevel ?? 0) + 1, slot.damd);
    else tmp = 0;

    // ── these affect you even if the monster just died (uhitm.c:5900) ──
    const obj_attack = (aatyp === AT_WEAP || aatyp === AT_CLAW
                        || aatyp === AT_MAGC || aatyp === AT_TUCH);
    switch (slot.adtyp) {
    case AD_FIRE:
        if (mhit && !mon.mcan && weapon && obj_attack)
            await passive_obj(mon, weapon, slot);
        break;
    case AD_ACID:
        if (mhit && rn2(2)) {
            const { pline } = await import('./display.js');
            if (Blind() || game.flags?.verbose === false)
                await pline('You are splashed!');
            else
                await pline(`You are splashed by ${s_suffix(mon_nam(mon))} acid!`);
            if (!Acid_resistance()) await mdamageu(mon, tmp);
            if (!rn2(30)) await erode_armor(ERODE_CORRODE);
        }
        if (mhit && weapon && obj_attack) await passive_obj(mon, weapon, slot);
        exercise(A_STR, false);                // rolls rn2(2)
        break;
    case AD_RUST:
    case AD_CORR:
        if (mhit && !mon.mcan && weapon && obj_attack)
            await passive_obj(mon, weapon, slot);
        break;
    case AD_MAGM:
        // "wrath of gods for attacking Oracle"; no Antimagic hero here.
        {
            const { pline } = await import('./display.js');
            await pline('You are hit by magic missiles appearing from thin air!');
            await mdamageu(mon, tmp);
        }
        break;
    case AD_ENCH:
        if (mhit) {
            // C skips object-less attack types; AT_WEAP/AT_CLAW/AT_TUCH/AT_MAGC
            // all fall through to passive_obj.
            if (aatyp === AT_KICK && !weapon) break;
            if (aatyp === AT_BITE || aatyp === AT_BUTT
                || (aatyp >= AT_STNG && aatyp < AT_WEAP)) break;
            await passive_obj(mon, weapon, slot);
        }
        break;
    default:
        break;
    }

    // ── these only affect you if the monster still lives (uhitm.c:6019) ──
    if (malive && !mon.mcan && rn2(3)) {
        switch (slot.adtyp) {
        case AD_COLD:                          // brown mold or blue jelly
            if (monnear(mon, game.u.ux, game.u.uy)) {
                const { pline } = await import('./display.js');
                if (Cold_resistance()) {
                    await pline('You feel a mild chill.');
                    break;
                }
                await pline('You are suddenly very cold!');
                await mdamageu(mon, tmp);
                /* monster gets stronger with your heat! */
                healmon(mon, Math.trunc((tmp + rn2(2)) / 2), Math.trunc((tmp + 1) / 2));
                // split_mon() past 8*(m_lev+1) max HP is not modelled.
            }
            break;
        case AD_STUN:                          // specifically yellow mold
            // C ref: uhitm.c:6085 `if (!Stunned) make_stunned((long) tmp, TRUE)`.
            // The timer IS materialised — u.uprops.Stun is timeout.js's STUNNED
            // entry, and cmd.js b_trapped() already writes it the same way.
            // Draws no RNG itself, but it makes u_maybe_impaired() true, so
            // every later move runs impaired_movement()'s confdir() rn2(8)
            // redirect (elf-wiz step 282) and the botl gains " Stun".
            {
                const u = game.u;
                if (u && !((u.uprops?.Stun || 0) > 0)) {
                    u.uprops = u.uprops || {};
                    u.uprops.Stun = tmp;
                    // update_topl, not pline: C's You() lands on the SAME
                    // topline as the "You miss the yellow mold." that the same
                    // command already printed ("... mold.  You stagger...").
                    const { update_topl } = await import('./display.js');
                    await update_topl('You stagger...');
                    game.botl = true;
                }
            }
            break;
        case AD_FIRE:
            if (monnear(mon, game.u.ux, game.u.uy)) {
                const { pline } = await import('./display.js');
                await pline('You are suddenly very hot!');
                await mdamageu(mon, tmp);
            }
            break;
        case AD_ELEC:
            {
                const { pline } = await import('./display.js');
                await pline('You are jolted with electricity!');
                await mdamageu(mon, tmp);
            }
            break;
        case AD_PLYS: {
            // C ref: uhitm.c:6023-6098.  ureflects()/Hallucination/Free_action
            // are all FALSE for the heroes this port models, so the floating
            // eye takes the "frozen by its gaze" arm — including the
            // short-circuiting `(ACURR(A_WIS) > 12 || rn2(4))`, which only
            // draws when Wisdom is 12 or less.
            const { pline } = await import('./display.js');
            const { nomul } = await import('./hack.js');
            if (ptr?.pmidx === PM_FLOATING_EYE) {
                if (!canseemon(mon)) break;
                if (mon.mcansee !== 0) {
                    await pline(`You are frozen by ${s_suffix(mon_nam(mon))} gaze!`);
                    nomul((ACURR(A_WIS) > 12 || rn2(4)) ? -tmp : -127);
                    game.nomovemsg = 0;
                } else {
                    await pline(`The blind ${mon.data?.name || 'monster'} cannot defend itself.`);
                    if (!rn2(500)) change_luck(-1);
                }
            } else {                            /* gelatinous cube */
                await pline(`You are frozen by ${mon_nam(mon)}!`);
                game.nomovemsg = 'You can move again.';
                nomul(-tmp);
                exercise(A_DEX, false);         // rolls rn2(2)
            }
            break;
        }
        default:
            break;
        }
    }
}

// C ref: uhitm.c passive_obj(mon, obj, mattk) — the passive attack's effect on
// the striking object.
async function passive_obj(mon, obj, mattk) {
    if (!obj) return;
    switch (mattk.adtyp) {
    case AD_FIRE:
        if (!rn2(6) && !mon.mcan) await erode_obj_local(obj, ERODE_BURN);
        break;
    case AD_ACID:
        if (!rn2(6)) await erode_obj_local(obj, ERODE_CORRODE);
        break;
    case AD_RUST:
        if (!mon.mcan) await erode_obj_local(obj, ERODE_RUST);
        break;
    case AD_CORR:
        if (!mon.mcan) await erode_obj_local(obj, ERODE_CORRODE);
        break;
    default:
        break;
    }
}

async function erode_obj_local(obj, type) {
    const { erode_obj } = await import('./trap.js');
    return await erode_obj(obj, null, type, EF_NONE);
}

// C ref: uhitm.c erode_armor(&youmonst, hurt) — pick a random armour slot to
// erode, RETRYING (another rn2(5)) whenever the chosen slot is empty or
// un-erodable.  Only case 1 (cloak/suit/shirt) always terminates the loop, so
// an unarmoured hero burns a variable number of rn2(5) draws here.
async function erode_armor(hurt) {
    for (let guard = 0; guard < 1000; guard++) {
        const roll = rn2(5);
        if (roll === 1) {
            const target = game.uarmc || game.uarm || game.uarmu;
            if (target) await erode_obj_local2(target, hurt);
            return;
        }
        const target = roll === 0 ? game.uarmh
            : roll === 2 ? game.uarms
            : roll === 3 ? game.uarmg
            : game.uarmf;
        if (!target) continue;
        const { erode_obj } = await import('./trap.js');
        const res = await erode_obj(target, null, hurt, EF_GREASE);
        if (res === 0 /* ER_NOTHING */) continue;
        return;
    }
}
async function erode_obj_local2(obj, hurt) {
    const { erode_obj } = await import('./trap.js');
    return await erode_obj(obj, null, hurt, EF_GREASE);
}

// C ref: potion.c Acid_resistance / Cold_resistance intrinsic tests.
function Acid_resistance() { return (game.u?.uprops?.AcidResistance || 0) > 0; }
function Cold_resistance() { return (game.u?.uprops?.ColdResistance || 0) > 0; }

// C ref: makemon.js MONS_NAMES index of the floating eye.
const PM_FLOATING_EYE = 28;

// C ref: rnd.c change_luck(n) — clamped to [LUCKMIN, LUCKMAX].  pray.js keeps
// a file-static copy; Luck feeds find_roll_to_hit's sgn(Luck) term above.
function change_luck(n) {
    const u = game.u;
    u.uluck = (u.uluck || 0) + n;
    if (u.uluck < -10) u.uluck = -10;
    if (u.uluck > 10) u.uluck = 10;
}

// C ref: mon.c monnear(mon, x, y) — dist2 < 3 (orthogonally/diagonally next to).
function monnear(mon, x, y) {
    const dx = mon.mx - x, dy = mon.my - y;
    return (dx * dx + dy * dy) < 3;
}

// C ref: objnam.c s_suffix(s).
function s_suffix(s) { return /s$/.test(s) ? `${s}'` : `${s}'s`; }

// C ref: mhitu.c mdamageu(mtmp, n) — subtract n HP from the hero (monmove.js
// keeps the same body for the monster-hits-hero path; it is file-static there).
async function mdamageu(mtmp, n) {
    const u = game.u;
    if (n < 0) n = 0;
    u.uhp -= n;
    if (u.uhp > u.uhpmax) u.uhp = u.uhpmax;
    game.disp = game.disp || {};
    game.disp.botl = true;
    if (u.uhp < 1) {
        const { done_in_by } = await import('./end.js');
        await done_in_by(mtmp, 0 /* DIED */);
    }
}

// C ref: mon.c:3438 unstuck(mtmp) — the monster is no longer holding the hero.
// The rnd(2) fires only for a species that can hold (AD_STCK / AT_ENGL /
// AT_HUGS) and only if mspec_used is still 0.
function unstuck_mon(mtmp) {
    const u = game.u;
    if (u.ustuck !== mtmp) return;
    u.ustuck = null;
    u.uswallow = 0;
    // The swallowed branch (repositioning the hero + docrt) needs an engulfer.
    unstuck_mspec_used(mtmp);
}
// C ref: mon.c:3462-3466 — the tail of unstuck(); split out so mhitu.c's
// expels() (which does its own set_ustuck/docrt) can draw the same rnd(2).
export function unstuck_mspec_used(mtmp) {
    if (!mtmp.mspec_used
        && (dmgtype(mtmp.data, AD_STCK) || attacktype(mtmp.data, AT_ENGL)
            || attacktype(mtmp.data, AT_HUGS)))
        mtmp.mspec_used = rnd(2);                            // mon.c:3465
}

// ── kill aftermath: killed -> xkilled -> mondead + make_corpse ──
// C ref: mon.c killed()/xkilled().  Emits "You kill the <mon>!", rolls the
// treasure-drop gate rn2(6), removes the monster, and (corpse_chance rn2(2))
// drops a corpse via make_corpse() -> mkcorpstat() -> mksobj() (which rolls the
// corpse's next_ident, rndmonnum reservoir scan, and gender rn2(2)).
// `opts` mirrors C's xkill_flags: { nomsg } suppresses the "You kill/destroy"
// line, { nocorpse } skips the WHOLE treasure-drop+corpse_chance block (C:
// xkilled() goto's straight to cleanup on XKILL_NOCORPSE, before the rn2(6)
// treasure roll).  Both default off, matching every existing melee call site.
export async function killed(mon, opts) {
    const nomsg = !!opts?.nomsg;
    const skipCorpseBlock = !!opts?.nocorpse;
    const { update_topl } = await import('./display.js');
    const x = mon.mx, y = mon.my;
    mon.mhp = 0;

    // C ref: mon.c xkilled() — "if (!u.uconduct.killer++) livelog_printf(...)".
    // No RNG.
    {
        const u = game.u;
        if (!u.uconduct) u.uconduct = {};
        if (!u.uconduct.killer)
            livelog_printf(LL_CONDUCT, 'killed for the first time');
        u.uconduct.killer = (u.uconduct.killer || 0) + 1;
    }
    if (!nomsg) {
        // C ref: mon.c xkilled():3506 — a TAME victim is named through
        // x_monnam(..., "poor", ...) ("You kill the poor kitten!"), and a pet
        // with a given name drops the article instead.  Hallucination hides the
        // given name, so namedpet is gated on it.  The extra five characters
        // are load-bearing: they push the topline over 80 columns and move the
        // --More-- boundary (seed0383 step 178).
        const namedpet = !!(mon?.mgivenname || mon?.mextra?.mgivenname)
            && !game.u?.uhallu;
        const wasinside = !!(game.u?.uswallow && game.u?.ustuck === mon);
        const who = !(wasinside || canspotmon(mon)) ? 'it'
            : !mon.mtame ? mon_nam(mon)
              : x_monnam(mon, namedpet ? 0 /*ARTICLE_NONE*/ : 1 /*ARTICLE_THE*/,
                         'poor', namedpet ? SUPPRESS_SADDLE : 0, false);
        await update_topl(`You ${nonliving(mon) ? 'destroy' : 'kill'} ${who}!`);
    }

    // C ref: mon.c:3438 unstuck(mtmp), reached via mondead -> m_detach ->
    // mon_leaving_level (mon.c:2703).  A holder the hero kills gets
    // mspec_used = rnd(2) so it can't immediately re-grab; that rnd(2) is a
    // real draw in the kill turn.
    unstuck_mon(mon);

    // C ref: mon.c:3170 mondead() — `if (glyph_is_invisible(levl[mx][my].glyph))
    // unmap_object(mx, my)` runs just before m_detach.  Killing a monster the
    // hero can only sense (blind / invisible) must drop the remembered 'I';
    // m_detach -> mon_leaving_level's newsym() then repaints the real square.
    if (game.level?.at(x, y)?.invisMon) unmap_object(x, y);

    // mondead(): detach the monster from the level BEFORE the once-per-turn
    // mcalcmove realloc (allmain.js) so that loop iterates the post-kill set,
    // matching C (fmon has the dead monster purged by the next round).
    mvitals_died(mon);                 // mon.c:3135
    const list = game.level?.monsters;
    if (list) {
        const idx = list.indexOf(mon);
        if (idx >= 0) list.splice(idx, 1);
    }

    // C ref: mon.c m_detach() -> relobj(mtmp, 1, FALSE) — when a monster dies it
    // drops everything in mtmp->minvent onto the map at mx,my (consumes no RNG).
    // A killed kobold/orc/gnome leaves its starting darts/weapon on the floor,
    // which then renders as a ')' object glyph at the kill location.
    relobj(mon, x, y);

    if (!skipCorpseBlock) {
        // illogical-but-traditional treasure drop gate (mon.c:3587).  C also
        // gates on !(mvitals[mndx].mvflags & G_NOCORPSE): a G_NOCORPSE species
        // (grid bug, gas spore, …) never drops the extra item.  The rn2(6)
        // still rolls first.
        const mndx0 = mon.data?.pmidx;
        const gNoCorpse = (mndx0 != null) ? mon_nocorpse(mndx0) : false;
        let dropTreasure = false;
        if (!rn2(6) && !gNoCorpse && (x !== game.u.ux || y !== game.u.uy)) {
            dropTreasure = true;          // mdat->mlet S_KOP / mcloned excluded
        }

        // corpse_chance(mon): mon.c:3248 rn2(2 + (G_FREQ<2) + verysmall).
        // C ref: mon.c:3583 `if (accessible(x, y) || is_pool(x, y))` — a kill
        // over WATER still leaves a corpse (it floats); only the pool half was
        // missing, so a monster killed on the Medusa level's water dropped
        // nothing and skipped make_corpse's mkobj/next_ident draws.
        const { is_pool } = await import('./dbridge.js');
        const accessible = (() => {
            const t = game.level?.at(x, y)?.typ;
            return (t != null && ACCESSIBLE(t)) || is_pool(x, y);
        })();
        if (dropTreasure) {
            // mkobj(RANDOM_CLASS, TRUE): the item's own rolls (class, type,
            // enchant, erosion, …) always fire before its fate is decided.
            const otmp = mkobj(0 /*RANDOM_CLASS*/, true);
            const otyp = otmp.otyp;
            // C ref: mon.c:3600 xkilled() — "don't create large objects from
            // small monsters": mdat->msize < MZ_HUMAN && otyp != FIGURINE &&
            // (owt>30 || oc_big) routes to delobj() instead of placing it.
            // (The objects[] table here doesn't carry oc_big, so only the
            // weight leg of that OR is checked — every otyp big enough to
            // matter is also over the 30-unit threshold.)  delobj_core()
            // always rolls obj_resists(obj,0,0)'s rn2(100) (the Amulet/
            // invocation-tool guard) even though an ordinary item never
            // resists — skipping that roll (as a bare place always would)
            // desyncs every RNG draw after it, including corpse_chance() below.
            // C ref: mon.c:3597 — the FOOD_CLASS arm comes FIRST: newly created
            // permafood is destroyed unless the killed monster collects food
            // (M2_COLLECT).  Omitting it left the food on the floor AND skipped
            // delobj()'s obj_resists() rn2(100), desyncing everything after.
            const isFoodDrop = otmp.oclass === FOOD_CLASS
                && !(mflags2_of(mon.data) & M2_COLLECT) && !otmp.oartifact;
            if (isFoodDrop) {
                const { delobj } = await import('./invent.js');
                delobj(otmp);
            } else if ((mon.data?.msize ?? 2 /* MZ_HUMAN */) < 2 && otyp !== FIGURINE
                && (otmp.owt || 0) > 30) {
                const { delobj } = await import('./invent.js');
                delobj(otmp);
            } else {
                place_object(otmp, x, y);
            }
        }
        // C ref: mon.c:3199-3236 corpse_chance() — the AT_BOOM arm comes BEFORE
        // the ordinary rn2: a gas spore rolls its blast damage d(damn,damd),
        // detonates (mon_explodes -> explode(), another d() plus the per-target
        // destroy_items/resist draws) and leaves no corpse.  It sits in this
        // caller rather than corpse_chance() itself because mon_explodes is
        // async and corpse_chance's other callers are not.
        let leaves_corpse;
        {
            const { mattk_list } = await import('./mhitm.js');
            const { AT_BOOM } = await import('./monattk_data.js');
            const boom = mattk_list(mon).find((a) => a[0] === AT_BOOM);
            if (boom) {
                // C ref: mon.c:3203 — corpse_chance() rolls the blast damage
                // into a local `tmp` that only the swallowed-exploder arm uses,
                // and mon_explodes() then rolls its OWN d(damn,damd).  Two
                // separate draws off the same dice; dropping either desyncs.
                if (boom[2]) d(boom[2], boom[3]);
                else if (boom[3]) d((mon.data?.mlevel | 0) + 1, boom[3]);
                const { mon_explodes } = await import('./explode.js');
                await mon_explodes(mon, boom);
                leaves_corpse = false;
            } else {
                leaves_corpse = corpse_chance(mon);
            }
        }
        if (leaves_corpse && accessible) {
            make_corpse(mon, x, y);
        }
    }

    // C ref: mon.c:3638 xkilled() "Punish bad behavior", between the corpse
    // block and the experience award.  The `(mpeaceful && !rn2(2)) || mtame`
    // luck penalty DRAWS whenever the victim was peaceful — a pet is peaceful
    // too, so killing your own dog rolls it (seed0383 step 178).
    {
        const mdat0 = mon.data;
        const alignType = game.u?.ualign?.type ?? 0;
        const A_CHAOTIC = -1;
        // mondata.h is_human(ptr) == (mflags2 & M2_HUMAN);
        // always_hostile(ptr) == (mflags2 & M2_HOSTILE).
        const f2_0 = mflags2_of(mdat0);
        if ((f2_0 & M2_HUMAN) && !(f2_0 & M2_HOSTILE) && (mon.malign | 0) <= 0
            && alignType !== A_CHAOTIC) {
            change_luck(-2);
            await update_topl('You murderer!');
        }
        if ((mon.mpeaceful && !rn2(2)) || mon.mtame)      // mon.c:3664
            change_luck(-1);
        const sgn = (v) => (v > 0 ? 1 : v < 0 ? -1 : 0);
        const S_UNICORN = 21;   // monsym.h (mons[].mcls for the unicorn class)
        if (mdat0?.mcls === S_UNICORN
            && sgn(alignType) === sgn(mdat0?.maligntyp | 0))
            change_luck(-5);
    }

    // C ref: mon.c xkilled() — give experience points (no RNG).  experience()
    // bumps u.uexp via more_experienced(); newexplevel() may level the hero up.
    // Without this the status line's Xp:lvl/exp field stayed at the pre-kill
    // value, so every post-kill screen mismatched on that one stat cell.
    more_experienced(experience(mon), 0);
    await newexplevel();

    // C ref: mon.c xkilled() "adjust alignment points" — runs right after the
    // experience award, consumes no RNG.  The quest-leader / MS_NEMESIS /
    // MS_GUARDIAN arms need a quest monster and aren't reachable from a melee
    // kill in this corpus; the peaceful/tame/priest ones and the unconditional
    // adjalign(mtmp->malign) are.  Skipping this left u.ualign.record frozen at
    // gu.urole.initrecord, which chooses the wrong MODULUS in peace_minded()'s
    // rn2(16 + u.ualign.record) for every monster generated afterwards.
    {
        const { adjalign, ALIGNLIM } = await import('./attrib.js');
        const { p_coaligned } = await import('./priest.js');
        if (mon.ispriest) {
            const co = p_coaligned(mon);
            adjalign(co ? -2 : 2);
            if (co) game.u.ublessed = 0;
            if ((mon.data?.maligntyp ?? 0) === -128 /* A_NONE */)
                adjalign(Math.trunc(ALIGNLIM() / 4));
        } else if (mon.mtame) {
            adjalign(-15);
            // C ref: mon.c xkilled():3705 — "your god is mighty displeased".
            // Killing a pet always sounds off, and the hallucinatory variant is
            // the longer of the two, which is what pushes the topline past 80
            // columns and forces the --More-- (seed0383 step 178).
            await update_topl(game.u?.uhallu
                ? 'You hear the studio audience applaud!'
                : 'You hear the rumble of distant thunder...');
        } else if (mon.mpeaceful) {
            adjalign(-5);
        }
        adjalign(mon.malign | 0);
    }

    if (x > 0 && y > 0) newsym(x, y);
}

// C ref: steal.c relobj(mtmp, 1, FALSE) via mdrop_obj() — drop every object in
// the dead monster's minvent onto the map at (x,y).  No RNG.  flooreffects()
// (water/trap interactions) is not reachable for the modelled corridor/room
// kills, so each object is simply placed and stacked with any matching floor
// stack at the same cell (NetHack merges same-type drops via stackobj()).
export function relobj(mon, x, y) {
    const inv = mon?.minvent;
    // C ref: steal.c relobj() tail — `if (show && cansee(omx, omy)) newsym(omx, omy);`
    // fires even for an EMPTY minvent (m_detach always passes show=1), which is
    // what erases the dead monster's glyph.  Returning early on an empty
    // inventory left a killed gas spore (no corpse, no gear) drawn on the map.
    const repaint = () => { if (x > 0 && y >= 0) newsym(x, y); };
    if (!inv || !inv.length) { repaint(); return; }
    const objs = (game.level && (game.level.objects || (game.level.objects = []))) || null;
    if (!objs) { repaint(); return; }
    // C ref: steal.c relobj() walks mon->minvent front-to-back but each
    // mdrop_obj() pushes onto the head of the floor pile, so the resulting
    // nexthere order is REVERSED relative to minvent.
    for (const otmp of [...inv].reverse()) {
        // mdrop_obj -> place_object + stackobj.  Merge into an existing floor
        // stack of the same otyp/spe so quantities combine like C stackobj().
        let merged = false;
        for (const f of objs) {
            if (f.where === 'floor' && f.ox === x && f.oy === y
                && f.otyp === otmp.otyp && (f.spe || 0) === (otmp.spe || 0)
                && f.otyp !== CORPSE) {
                f.quan = (f.quan || 1) + (otmp.quan || 1);
                merged = true;
                break;
            }
        }
        if (!merged) place_object(otmp, x, y);
    }
    mon.minvent = [];
    repaint();
}

// C ref: monsters.h LVL() mmove, keyed by pmidx.  mon.js owns the audited copy
// (MMOVE_BY_PMIDX); re-exported there rather than duplicated here.
function species_mmove(data) { return mmove_of(data); }

// C ref: exper.c experience(mtmp, nk) — the XP value of a slain monster.  No
// RNG.  Iterates the monster's actual mattk[] list for the special attack-type
// and damage-type experience bonuses.
function experience(mtmp) {
    const NORMAL_SPEED_C = 12;
    const data = mtmp.data || {};
    const m_lev = mtmp.m_lev ?? data.mlevel ?? 0;
    let tmp = 1 + m_lev * m_lev;

    // higher-AC bonus: tmp += (7 - ac) * (ac<0 ? 2 : 1) when ac < 3.
    const i = find_mac(mtmp);
    if (i < 3) tmp += (7 - i) * ((i < 0) ? 2 : 1);

    // ptr->mmove — the SPECIES speed, not the monster's adjusted movement.
    // MONS[] carries no mmove field, so `data.mmove ?? 0` silently dropped this
    // bonus for every fast monster (a fox is 1 XP instead of 4).
    const mmove = species_mmove(data);
    if (mmove > NORMAL_SPEED_C)
        tmp += (mmove > (3 * NORMAL_SPEED_C / 2)) ? 5 : 3;

    const attacks = mattk_of(data);

    // special attack-type bonus (exper.c:101).  AT_WEAP -> +5; AT_MAGC -> +10;
    // other types > AT_BUTT -> +3.  Ordinary AT_BITE/AT_CLAW add nothing.
    for (const a of attacks) {
        const t = a.aatyp;
        if (t > AT_BUTT) {
            if (t === AT_WEAP) tmp += 5;
            else if (t === AT_MAGC) tmp += 10;
            else tmp += 3;
        }
    }

    // special damage-type bonus (exper.c:113).
    for (const a of attacks) {
        const t2 = a.adtyp;
        if (t2 > AD_PHYS && t2 < AD_BLND) tmp += 2 * m_lev;
        else if (t2 === AD_DRLI || t2 === AD_STON || t2 === AD_SLIM) tmp += 50;
        else if (t2 !== AD_PHYS) tmp += m_lev;
        if (a.damd * a.damn > 23) tmp += m_lev; // extra heavy-damage bonus
        // AD_WRAP/S_EEL term not reachable for these monsters.
    }

    // extra_nasty(ptr) == (mflags2 & M2_NASTY) (mondata.h:120) — was missing
    // entirely, so every M2_NASTY kill was short 7*m_lev XP.
    if ((mflags2_of(data) & M2_NASTY) !== 0) tmp += 7 * m_lev;

    if (m_lev > 8) tmp += 50;
    // mrevived/mcloned halving and the PM_MAIL_DAEMON tmp=1 override are below
    // this in C; neither state is reachable for a hero kill in these sessions.
    return tmp;
}

// C ref: mon.c corpse_chance(mon).  bigmonst/lizard (uncloned), golem, mplayer,
// rider, shk all GUARANTEE a corpse and return TRUE with NO rn2 roll (mon.c:
// 3246); only the ordinary case rolls rn2(2 + (G_FREQ<2) + verysmall).  Missing
// the guaranteed-corpse short-circuit made JS roll an extra rn2 when killing a
// big monster (seed4500 step-269: the MZ_HUGE earth elemental).  (The lich/Vlad
// crumble, gas-spore AT_BOOM explosion, and LEVEL_SPECIFIC_NOCORPSE special
// cases that precede this in C are not exercised by the corpse_chance kills in
// the sessions and are intentionally not modeled here.)
export function corpse_chance(mon) {
    const mdat = mon.data || {};
    const bigOrLizard = (largemonst(mdat) || mdat.name === 'lizard') && !mon.mcloned;
    const golem = /\bgolem$/.test(mdat.name || '');
    if (bigOrLizard || golem || mon.isshk) return true; // guaranteed, no roll
    const geno = mdat.geno || 0;
    const G_FREQ = geno & 7;
    const verysmall = mdat.verysmall ? 1 : 0;
    const tmp = 2 + (G_FREQ < 2 ? 1 : 0) + verysmall;
    return !rn2(tmp);                          // mon.c:3248
}

// C ref: mon.c make_corpse() default path -> mkcorpstat(CORPSE, KEEPTRAITS?mon
// :0, mdat, x, y, CORPSTAT_INIT).  mksobj() builds the corpse object: rolls the
// next_ident o_id, the rndmonnum() reservoir scan (overwritten with mdat after),
// the gender rn2(2), and start_corpse_timeout().  Reuses mkobj.js verbatim.
export function make_corpse(mon, x, y) {
    const mndx = mon.data?.pmidx;
    if (mndx == null) return;
    // C ref: mon.c make_corpse() — zombies, mummies and vampires are handled by
    // their own switch cases BEFORE the default G_NOCORPSE guard: they always
    // leave a corpse of their base living species (undead_to_corpse), and it is
    // an *old* corpse (age -= TAINT_AGE+1).  Their undead form carries G_NOCORPSE
    // (that flag only blocks *random* corpse generation), so without this branch
    // the corpse — and its next_ident/rndmonnum/gender/timeout RNG — was skipped.
    const base = undead_to_corpse(mndx);
    if (base !== mndx) {
        const obj = mkcorpstat(CORPSE, mon, base, x, y, CORPSTAT_INIT | CORPSTAT_NONE);
        if (obj != null)
            obj.age = (obj.age ?? Math.max(game.moves ?? 1, 1)) - (TAINT_AGE + 1);
        return obj;
    }
    // C ref: mon.c:893 make_corpse default path — a G_NOCORPSE species (grid
    // bug, gas spore, …) returns NULL with NO mksobj rolls.  corpse_chance()
    // still rolled its rn2 in the caller; only the corpse object is suppressed.
    if (mon_nocorpse(mndx)) return;
    // mkcorpstat(CORPSE, KEEPTRAITS(mon)?mon:0, mdat, x, y, CORPSTAT_INIT):
    // mksobj() rolls next_ident, the rndmonnum() reservoir scan, gender rn2(2),
    // and start_corpse_timeout().  pm (mndx) overrides the rolled corpsenm after.
    mkcorpstat(CORPSE, mon, mndx, x, y, CORPSTAT_INIT | CORPSTAT_NONE);
}

// ── dmgval ──
// C ref: weapon.c dmgval(struct obj *otmp, struct monst *mon) — base weapon
// damage roll (oc_wsdam / oc_wldam dice) plus the per-weapon "extra" additions
// for weapons whose damage isn't an even die, plus enchantment.  The
// strength/skill bonuses are applied separately by hmon_hitmon_dmg_recalc().
// C: weapon.c dmgval() bonus-group otyps (our numbering; see mkobj.js).
const W = {
    CROSSBOW_BOLT: 23, TRIDENT: 33, BATTLE_AXE: 45, BROADSWORD: 52,
    ELVEN_BROADSWORD: 53, TWO_HANDED_SWORD: 55, TSURUGI: 57, RUNESWORD: 58,
    PARTISAN: 59, RANSEUR: 60, SPETUM: 61, HALBERD: 63, BARDICHE: 64,
    VOULGE: 65, GUISARME: 67, BILL_GUISARME: 68, LUCERN_HAMMER: 69,
    DWARVISH_MATTOCK: 71, MACE: 73, SILVER_MACE: 74, MORNING_STAR: 75,
    WAR_HAMMER: 76, FLAIL: 81, IRON_CHAIN: 478,
    ACID_VENOM: 480,   // mkobj.js ACID_VENOM
};

// C ref: uhitm.c hmon_hitmon_misc_obj() `default:` arm — VEGGY/PAPER objects
// (except spellbooks) are too floppy to hurt; everything else does weight-based
// damage capped at 6, plus the wet-towel wetness bonus.
const MAT_VEGGY = 3, MAT_PAPER = 5;
function hmon_misc_obj_dmg(obj) {
    const mat = objects[obj.otyp]?.material;
    if ((mat === MAT_VEGGY || mat === MAT_PAPER) && obj.oclass !== SPBOOK_CLASS)
        return 0;
    let dmg = Math.trunc(((obj.owt || 0) + 99) / 100);
    dmg = (dmg <= 1) ? 1 : rnd(dmg);
    if (dmg > 6) dmg = 6;
    // is_wet_towel(obj): a towel with wetness left adds obj->spe, then rerolls.
    if (obj.otyp === 234 /*TOWEL*/ && (obj.spe | 0) > 0) {
        dmg += (obj.spe | 0);
        dmg = rnd(dmg);
    }
    return dmg;
}

// dmgval() now lives in js/weapon.js (weapon.c:216).  The copy that used to
// sit here dropped the large-monster IRON_CHAIN case, the thick-skinned /
// PM_SHADE zeroing, the HEAVY_IRON_BALL weight bonus and the silver rnd(20),
// and gated the vs-monster bonus block on COIN_CLASS where C tests
// GEM/BALL/CHAIN.
export { dmgval } from './weapon.js';

// C ref: include/mondata.h bigmonst() / mons[].msize >= MZ_LARGE.
function largemonst(mdat) {
    return !!(mdat && mdat.msize != null && mdat.msize >= 3 /* MZ_LARGE (monflag.h); 4 is MZ_HUGE */);
}

// ── messaging helpers ──
// Lazy import of pline to avoid a static import cycle (display <- uhitm).
async function plineMon(mtmp, fmt) {
    const { pline } = await import('./display.js');
    await pline(fmt.replace('%s', Monnam(mtmp)));
}

// C ref: do_name.c mon_nam(mtmp) — "the <mon>" (lower case article).
export function mon_nam(mtmp) {
    return x_monnam(mtmp, /*ARTICLE_THE*/ 1, null, 0, false);
}

// C ref: mondata.h nonliving(ptr) = is_undead || PM_MANES || weirdnonliving
// (golem or S_VORTEX).  These are "destroyed" rather than "killed".  NOTE:
// elementals are LIVING in C (S_ELEMENTAL is not golem/vortex/undead), so an
// earth elemental is "killed", not "destroyed" (seed4500 step-269).
const S_VORTEX_U = 22, S_GOLEM_U = 55;   // defsym.h
function nonliving(mtmp) {
    // Derived from the generated M2_UNDEAD flag + monster class, NOT a species
    // name regex: a regex answers FALSE for every undead whose name it forgot
    // and TRUE for lookalikes (a "vampire bat" is not M2_UNDEAD).
    const p = mtmp?.data;
    if (!p) return false;
    if (mflags2_of(p) & M2_UNDEAD) return true;
    if (p.name === 'manes') return true;
    return p.mcls === S_GOLEM_U || p.mcls === S_VORTEX_U;
}

// C ref: do_name.c Monnam()/x_monnam() — capitalized monster name.  Minimal
// port sufficient for the starter monsters (no shopkeepers/priests/hallu).
export function Monnam(mtmp) {
    const s = x_monnam(mtmp, /*ARTICLE_THE*/ 1, null, 0, false);
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// C ref: do_name.c x_monnam().  Reduced to the cases the starter sessions
// need: a tame monster with (ARTICLE_YOUR) and an optional given name.
//   article: 0 NONE, 1 THE, 2 A, 3 YOUR.
// C ref: mondata.c pmname(pm, mgender), monst.h Mgender(mon) = female ? FEMALE
// : MALE.  A NAMS() species carries three names and C NEVER shows the neutral
// one for a live monster, so `mons[].name` alone renders "dwarf leader" where C
// prints "dwarf lord".
const _PMNAMES_GENDERED = new Map([
    ['dwarf leader', ['dwarf lord', 'dwarf lady']],
    ['dwarf ruler', ['dwarf king', 'dwarf queen']],
    ['kobold leader', ['kobold lord', 'kobold lady']],
    ['gnome leader', ['gnome lord', 'gnome lady']],
    ['gnome ruler', ['gnome king', 'gnome queen']],
    ['ogre leader', ['ogre lord', 'ogre lady']],
    ['ogre tyrant', ['ogre king', 'ogre queen']],
    ['vampire leader', ['vampire lord', 'vampire lady']],
    ['elf-noble', ['elf-lord', 'elf-lady']],
    ['elven monarch', ['Elvenking', 'Elvenqueen']],
    ['aligned cleric', ['priest', 'priestess']],
    ['high cleric', ['high priest', 'high priestess']],
    ['amorous demon', ['incubus', 'succubus']],
    ['cave dweller', ['caveman', 'cavewoman']],
    ['cleric', ['priest', 'priestess']],
]);
export function mon_pmname(mtmp) {
    const n = mtmp?.data?.name;
    const pair = n != null ? _PMNAMES_GENDERED.get(n) : null;
    if (!pair) return n || 'monster';
    return pair[mtmp.female ? 1 : 0] || n;
}
// C ref: monsym.h PM_GHOST — resolved once off mons[] rather than transcribed,
// so the mons[] table can grow without silently re-pointing this test.
let _pm_ghost = -1;
function PM_GHOST() {
    if (_pm_ghost < 0) _pm_ghost = name_to_pmidx('ghost') ?? -2;
    return _pm_ghost;
}
export function x_monnam(mtmp, article, _adjective, _suppress, _called) {
    const base = mon_pmname(mtmp);
    const given = mtmp?.mgivenname || mtmp?.mextra?.mgivenname;

    // C ref: do_name.c:919 — a shopkeeper IS his personal name ("Maganasipi"),
    // with " the <species>" appended only when he isn't a plain shopkeeper or is
    // invisible.  No article, ever.
    if (mtmp?.isshk && !game.u?.uhallu && mtmp.m_ap_type !== 'mon') {
        let buf = shkname(mtmp);
        if (base !== 'shopkeeper' || mtmp.minvis)
            buf += ' the ' + (mtmp.minvis ? 'invisible ' : '') + base;
        return buf;
    }

    // C ref: do_name.c x_monnam do_it — any monster the hero cannot spot is
    // just "it".  Blindness is only ONE way to fail canspotmon(): a monster in
    // an unlit square a few steps away is equally unseen, and C prints "It
    // hits!" / "You kick it." for it.  AUGMENT_IT upgrades that to
    // "someone"/"something" (and rolls rn2(2) while hallucinating).
    const do_it = !canspotmon(mtmp) && article !== 3
        && !game.program_state?.gameover && mtmp && mtmp !== game.u?.usteed
        && !(game.u?.uswallow && game.u?.ustuck === mtmp)
        && !(_suppress & SUPPRESS_IT);
    if (do_it) {
        if (!(_suppress & AUGMENT_IT)) return 'it';
        // C: !is_animal excludes all Y; !mindless excludes Z, M, '
        const md = mtmp.data;
        const s_one = humanoid(md) && !is_animal_xm(md) && !mindless_xm(md);
        const hallu = !!game.u?.uhallu && !(_suppress & SUPPRESS_HALLUCINATION);
        return ((!hallu ? s_one : !rn2(2)) ? 'someone' : 'something');
    }

    // ARTICLE_YOUR only applies to tame monsters; otherwise downgrade to THE.
    if (article === 3 && !mtmp.mtame) article = 1;

    // C ref: do_name.c x_monnam "Put the adjectives in the buffer" — the
    // caller-supplied adjective ("peaceful") comes first, then "saddled "
    // (unless SUPPRESS_SADDLE, Blind, or Hallucinating).  Both sit between the
    // article and the name ("the peaceful gnome", "your saddled pony").
    let adj = '';
    if (_adjective) adj += _adjective + ' ';
    if (!(_suppress & SUPPRESS_SADDLE) && (mtmp?.misc_worn_check & W_SADDLE)
        && !Blind() && !game.u?.uhallu)
        adj += 'saddled ';
    const has_adjectives = adj !== '';

    if (given) {
        // A personal name is name_at_start: C drops the article for
        // ARTICLE_YOUR or when there are no adjectives, but keeps it otherwise
        // ("the peaceful Slasher").
        if (article === 3 || !has_adjectives) article = 0;
        // C ref: do_name.c:1006 — a named GHOST is "<name>'s ghost", never the
        // bare name: christen_monst() puts the dead hero's name on the bones
        // ghost, so "You miss Elara." must read "You miss Elara's ghost."
        // (hacklib.c s_suffix: a name already ending in 's' takes a bare "'").
        const gnamed = (mtmp?.data?.pmidx === PM_GHOST())
            ? adj + (/s$/i.test(given) ? `${given}'` : `${given}'s`) + ' ghost'
            : adj + given;
        return article === 1 ? 'the ' + gnamed
             : article === 2 ? an(gnamed)
             : gnamed;
    }

    // C ref: do_name.c:127 — `if (do_hallu) { rname = rndmonnam(&code); ... }`.
    // A hallucinating hero sees a RANDOM species (or a bogusmon line) in place
    // of every monster name, and both picks come off the DISPLAY rng, so
    // skipping them left that stream at the wrong offset for the next draw.
    // SUPPRESS_HALLUCINATION (0x04) is how disclosure asks for the true name.
    const do_hallu = !!game.u?.uhallu && !(_suppress & SUPPRESS_HALLUCINATION);
    if (do_hallu) {
        const { rndmonnam, bogon_is_pname } = halluc_naming();
        const r = rndmonnam();
        let art = article;
        if (bogon_is_pname(r.code) && (art === 3 || !has_adjectives))
            art = 0;
        const hnamed = adj + r.name;
        return art === 3 ? 'your ' + hnamed
             : art === 1 ? 'the ' + hnamed
             : art === 2 ? an(hnamed) : hnamed;
    }

    const named = adj + base;

    // C ref: do_name.c:1000 — name_at_start is type_is_pname(mdat) for a plain
    // species name.  A proper-noun species ("Medusa", a quest leader) drops its
    // article entirely; the Wizard of Yendor takes "the" instead.  Any G_UNIQ
    // monster asked for with ARTICLE_A is upgraded to "the" as well.
    let art = article;
    const mdat = mtmp?.data;
    if ((mflags2_of(mdat) & M2_PNAME) && (art === 3 || !has_adjectives))
        art = (mdat?.name === 'Wizard of Yendor') ? 1 : 0;
    else if (((mdat?.geno ?? 0) & G_UNIQ_XM) !== 0 && art === 2)
        art = 1;

    switch (art) {
    case 3: return 'your ' + named; // ARTICLE_YOUR
    case 1: return 'the ' + named;  // ARTICLE_THE
    case 2: return an(named);       // ARTICLE_A
    default: return named;          // ARTICLE_NONE
    }
}

// do_name.js is registered from this file's tail, so it is always evaluated by
// the time x_monnam() can run; the indirection keeps the import one-directional.
const SUPPRESS_HALLUCINATION = 0x04;   // C ref: do_name.h
const SUPPRESS_IT = 0x01, AUGMENT_IT = 0x40;  // C ref: do_name.h
// C ref: mondata.h is_animal(ptr) / mindless(ptr) — x_monnam's "someone" test.
const M1_MINDLESS_XM = 0x10000, M1_ANIMAL_XM = 0x40000;  // monflag.h
const is_animal_xm = (ptr) => (mflags1_of(ptr) & M1_ANIMAL_XM) !== 0;
const mindless_xm = (ptr) => (mflags1_of(ptr) & M1_MINDLESS_XM) !== 0;
let _halluc_naming = null;
function halluc_naming() {
    return _halluc_naming || { rndmonnam: () => ({ name: 'bogon', code: '' }),
                               bogon_is_pname: () => false };
}
export function register_halluc_naming(m) { _halluc_naming = m; }

// C ref: hacklib.c an() — prepend "a"/"an".
function an(s) {
    return (/^[aeiou]/i.test(s) ? 'an ' : 'a ') + s;
}

// do_name.c's wrapper family (js/do_name.js) drives x_monnam(); register the
// implementation here rather than importing uhitm.js from there, so do_name.js
// stays below uhitm.js in the module graph.
register_monnam_hooks({ x_monnam, mon_pmname });
register_halluc_naming({ rndmonnam, bogon_is_pname });
