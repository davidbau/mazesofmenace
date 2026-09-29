// @ts-nocheck
// end.js — C ref: nethack-c/src/end.c
//
// Hero death and the wizard/explore-mode "Die? [yn]" savelife path.
//
// In playmode:debug (wizard mode) the recorded seed4200 hero's HP drops below 1
// twice.  C runs, per lethal hit:
//
//     losehp()/mdamageu() -> done_in_by(mtmp, DIED) -> done(how)
//        done_in_by (end.c:195) prints "You die..." with ordinary You()
//        done() (end.c:1109-1121, the `(wizard || discover)` branch) calls
//        paranoid_query(ParanoidDie, "Die?").  ParanoidDie is UNSET in the contest
//        rc, so it resolves to yn_function("Die?", "yn", 'n', FALSE) (cmd.c
//        paranoid_ynq else-branch) — the [yn] prompt shown as `Die? [yn] (n)`.
//        yn_function LOOPS nhgetch, silently EATING every keystroke that is not a
//        valid [yn]/ESC answer, until it reads one.  On 'n'/ESC/default it prints
//        "OK, so you don't die." and runs savelife() (end.c:706): uhp restored,
//        gm.multi = -1, svc.context.move = 0, nomovemsg "You survived that attempt
//        on your life.".  The prompt itself draws no RNG; savelife can draw when
//        it expels a swallowed hero (unstuck plus mnexto).  The separate
//        debug_fuzzer_savelife() path is gated on iflags.debug_fuzzer.
//
// ── Deferral (why the prompt runs at the command-read boundary, not in place) ──
// The C damage sites reach done() synchronously and open the blocking read right
// there.  In this JS port the damage sites (mhitu.js mdamageu via the movemon
// chain, zap.js _buzz_losehp via the ray loop) run in SYNCHRONOUS code that cannot
// open an async blocking read.  So `deadhero()` only FLAGS the pending death, and
// the (RNG-free) blocking interaction is driven by do_death_sequence() at the next
// command-read boundary (cmd.js rhack).  This preserves both the RNG order (the
// prompt draws nothing) and the message order (the fatal hit is the last message-
// producing action of the turn in the recorded sessions), and lets the death
// keystrokes be consumed by the prompt instead of leaking to rhack.
import { game, wizard, discover } from './gstate.js';
import { clong, nowrap_add } from './integer.js';
import { savebones, no_bones_special_level } from './bones.js';
import { force_more, pline, urgent_pline, flush_screen, bot, _topl_joins_committed,
         _topline_more_pending, capture_painted_frame_with_status } from './display.js';
import { topl_park_cursor } from './display.js';
import { putmsghistory } from './display.js';
import { cmdq_pop, cmdq_clear, cmdq_add_key, key2txt } from './cmd.js';
import { CQ_CANNED, CQ_REPEAT, CMDQ_KEY, CMDQ_USER_INPUT, QBUFSZ, PLNMSG_UNKNOWN } from './const.js';
import { nhgetch } from './input.js';
import { paranoid_query } from './paranoid.js';
// WRITE-ONLY route-attribution telemetry (inert unless NH_ROUTE_TELEMETRY=1 —
// only ever set by tools/input-desync-triage.mjs). See js/route_telemetry.js.
import { routeTag } from './route_telemetry.js';
import { acurr, minuhpmax, setuhpmax } from './attrib.js';
import { rn2, d } from './rng.js';
import { A_CON, A_CURRENT, A_ORIGINAL, Upolyd, DIED, CHOKING, STARVING, DROWNING, BURNING, STONING, TURNED_SLIME, QUIT, GENOCIDED, PANICKED, TRICKED, ESCAPED, ASCENDED, LIFESAVED, KILLED_BY, NO_KILLER_PREFIX, BASICENLIGHTENMENT, MAGICENLIGHTENMENT, ENL_GAMEOVERALIVE, ENL_GAMEOVERDEAD, PARANOID_QUIT, PARANOID_DIE, PARANOID_BONES } from './const.js';
import { KILLED_BY_AN, MALE, FEMALE } from './const.js';
import { MGIVENNAME, has_mgivenname } from './const.js';
import { SICK, SICK_ALL, TIMEOUT, TT_LAVA, UNCHANGING } from './const.js';
import { PM_TOURIST, PM_HUMAN_MUMMY } from './pm.generated.js';
import { shkname, free_oname } from './dokick.js';
import { paybill, finish_paybill, currency, obfree } from './shk.js';
import { m_monnam } from './mhitm.js';
import { expels_gu } from './mhitu.js';
import { unstuck, sticks, keepdogs } from './dog.js';
import { mon_nam } from './uhitm.js';
import { monPmname, the_unique_pm, adjLev } from './makemon.js';
import { PM_HOUSECAT } from './pm.generated.js';
import { exit_nhwindows, raw_print } from './rawterm.js';
import { topten, formatkiller } from './topten.js';
import { yyyymmdd, getnow } from './allmain.js';
import { depth, deepest_lev_reached } from './hacklib.js';
import { Is_branchlev, In_tutorial } from './dungeon.js';
/* C eat.c:126 init_uhunger() — savelife's starving/choking reset (end.c:721).
 * Runtime-only edge: eat.js does import end.js, but only for the death path, so
 * neither module needs the other at module-init time. */
import { init_uhunger } from './eat.js';
import { make_sick } from './potion.js';
import { reset_utrap } from './trap.js';
import { display_text_window, money_cnt } from './com_pager.js';
/* C end.c:1306's grave block: mk_named_object(CORPSE, ...) is mkcorpstat +
 * oname (mkobj.c:2253), and make_grave is engrave.c:1686.  Both bodies already
 * existed; only this caller was missing. */
import { mkcorpstat, make_grave, place_object, mksobj } from './mklev.js';
import { stackobj } from './sp_lev.js';
import { accessible } from './look.js';
import { isok, OBJ_FREE } from './const.js';
import { oname, an, arti_cost, artiname, the_unique_obj, xname } from './objnam.js';
import { OC_NAME } from './oc_name_data.js';
import { OC_COST } from './oc_cost_data.js';
import { MKOBJ_OC_CLASS } from './mkobj_data.js';
import { Has_contents, has_oname, IN_SIGHT } from './const.js';
import { AMULET_CLASS, GEM_CLASS, FIRST_AMULET, FIRST_REAL_GEM,
    LAST_REAL_GEM, LAST_GLASS_GEM, BELL_OF_OPENING, SPE_BOOK_OF_THE_DEAD,
    CANDELABRUM_OF_INVOCATION } from './objclass_ranges.js';
import { CORPSTAT_INIT, NON_PM, IS_GRAVE } from './const.js';
import monsPackEnd from './makemon_mons.json' with { type: 'json' };
const MONS_ROWS_END = monsPackEnd.mons;
const G_NOCORPSE_END = 0x0010; /* monflag.h G_NOCORPSE */
const CORPSE_END = 265;        /* objects.h CORPSE otyp */
import { hidden_gold, paygd } from './vault.js';
import { clearpriests } from './priest.js';
import { DISCLOSURE_OPTIONS, END_DISCLOSE_DEFAULT } from './options.js';
import { enlightenment, list_vanquished, list_genocided, show_conduct, count_achievements, show_overview, inventory_menu_legacy } from './cmd.js';
import { container_contents, SchroedingersBox, observe_quantum_cat } from './pickup_container.js';
import { set_cknown_lknown } from './cmd.js';
import { discover_object } from './o_init.js';
/* objects.h AMULET_OF_LIFE_SAVING — otyp 202 (js/oc_name_data.js OC_NAME[202];
 * js/makemon.js:1315 and js/monmove.js:953 carry the same literal). */
const AMULET_OF_LIFE_SAVING_END = 202;
import { adjattrib } from './attrib.js';
import { useup, endmultishot } from './cmd.js';
/* C do.c:2076 schedule_goto — done2's abandon_tutorial arm records the deferred
 * return to u.ucamefrom; allmain's moveloop executes it via deferred_goto(). */
import { schedule_goto } from './cmd.js';
import { Blind } from './vision.js';

// ── C ref: end.c:1706-1756 — the DELAYED-KILLER list. ────────────────────────
//
// `svk.killer` is a `struct kinfo` that doubles as the head SENTINEL of a
// singly-linked list hung off `svk.killer.next`.  A delayed killer records who
// gets the credit when a timed lethal property (SICK, STONED, SLIMED,
// POLYMORPH) finally runs out; the sentinel's own `name`/`format` are the
// NON-delayed killer, and delayed_killer() clears the sentinel's name as its
// last act ("ensure non-delayed killer is cleared out").
//
// Ported because make_sick() / make_stoned() / make_slimed() (potion.c:137-241)
// call all three of these UNCONDITIONALLY on every invocation — so the
// #wizintrinsic arms for those properties (wizcmds.c:1043-1060) cannot be
// C-faithful without them.  The whole trio is RNG-FREE.
//
// The list is state-only: nothing in the corpus survives long enough for a
// delayed killer to fire, so its observable effect today is zero.  It is
// ported anyway rather than stubbed because make_sick()'s `!kptr` test
// (potion.c:184) BRANCHES on find_delayed_killer()'s result, and a stub that
// always returned null would take a different arm than C on the second
// make_sick() of a session.
function _killer_head() {
    const g = game;
    if (!g.svk)
        g.svk = {};
    if (!g.svk.killer)
        g.svk.killer = { id: 0, format: 0, name: '', next: null };
    else if (g.svk.killer.next === undefined)
        g.svk.killer.next = null;
    return g.svk.killer;
}

// C end.c:1725-1735 find_delayed_killer(int id) — walk from svk.killer.next.
export function find_delayed_killer(id) {
    for (let k = _killer_head().next; k; k = k.next) {
        if (k.id === id)
            return k;
    }
    return null;
}

// C end.c:1706-1723 delayed_killer(int id, int format, const char *killername).
export function delayed_killer(id, format, killername) {
    const head = _killer_head();
    let k = find_delayed_killer(id);

    if (!k) {
        /* no match, add a new delayed killer to the list */
        k = { id: id, format: 0, name: '', next: head.next };
        head.next = k;
    }

    k.format = format;
    k.name = killername ? killername : '';
    /* C: svk.killer.name[0] = 0 */
    head.name = '';
}

// C end.c:1737-1756 dealloc_killer(struct kinfo *kptr) — unlink and free.
export function dealloc_killer(kptr) {
    const head = _killer_head();
    let prev = head, k;

    if (!kptr)
        return;
    for (k = head.next; k; k = k.next) {
        if (k === kptr)
            break;
        prev = k;
    }

    if (!k) {
        /* C: impossible("dealloc_killer (#%d) not on list", kptr->id) — the
         * port has no impossible() channel; C's impossible() prints to the
         * topline only in wizard mode and does not alter the list either way. */
    } else {
        prev.next = k.next;
    }
}

// C ref: the `u.uhp < 1 -> done_in_by(mtmp, DIED)` / `losehp -> done(DIED)` test
// at the damage sites.  Flag the pending death exactly once (C forces uhp to 0 in
// done(); the interactive prompt then decides survive/really-die).  RNG-FREE.
/* C ref: bones.c:365-393 can_make_bones(void) — whether this death leaves a
 * bones file.  Only reached from really_done, and the ONLY thing about it that
 * is observable in a replay is its single rn2:
 *     if (depth(&u.uz) <= 0
 *         || (!rn2(1 + (depth(&u.uz) >> 2)) && !wizard))
 *         return FALSE;
 * The guards ahead of it are all FALSE-returning early exits that draw nothing:
 * !flags.bones (on by default), a bad ledger number, no_bones_level, u.uswallow,
 * and a MAGIC_PORTAL on a non-branch level.  None of them holds for a corpus
 * death, and each one that DID hold would suppress the draw — so they are tested
 * here rather than assumed, except the Is_special/boneid arm of no_bones_level,
 * which needs the s_level table this file has no access to.  (The Is_branchlev
 * arm was in that same sentence and is now PORTED below, because the claim that
 * it is "FALSE for every level any corpus session dies on" was measurably
 * wrong — see its own note.)
 *
 * The Is_botlevel arm of no_bones_level IS tested, and it is not academic: the
 * comment this replaces asserted the whole of no_bones_level was FALSE "for every
 * level any corpus session dies on (Dlvl 1-3 of the Dungeons of Doom)".
 * seed0009 dies in the TUTORIAL, a one-level dungeon, so its only level is the
 * bottom level and C returns FALSE with NO draw at all — while this function
 * would have rolled rn2(1).  The draw landed past the end of C's recorded log,
 * where `matched` cannot see it, which is exactly how an assumption like that
 * survives.  seed0103 dies on Dlvl 1 of the Dungeons of Doom (30+ levels), so
 * its recorded `rn2(1)=0 @ can_make_bones(bones.c:377)` is unaffected.
 * The last line of this header used to read "Return value unused by this port:
 * the bones-file write is not ported."  savebones() has been ported since, and
 * really_done() reads this function's result as `bones_ok` to gate both the
 * wizard-mode "Save bones?" query and finish_paybill(); seed5006 and seed0030
 * both write real bones files from it. */
function can_make_bones() {
    const g = game;
    const u = g.u || {};
    if (no_bones_special_level(u.uz))
        return false;
    if (g.flags && g.flags.bones === false)
        return false;
    /* C bones.c:29 no_bones_level -> Is_botlevel(lev):
       lev->dlevel == dunlevs_in_dungeon(lev), i.e. the dungeon's num_dunlevs. */
    const dgn = g.dungeons?.[u.uz?.dnum | 0];
    if (dgn && (u.uz?.dlevel | 0) === (dgn.num_dunlevs | 0))
        return false;
    /* C bones.c:30-31 no_bones_level -> `(Is_branchlev(lev) && lev->dlevel > 1)`
     * — "no bones on the last or multiway branch levels in any dungeon (level 1
     * isn't multiway)".
     *
     * The header above used to name this arm as one of two "which need dungeon
     * topology predicates this file has no access to and which are FALSE for
     * every level any corpus session dies on".  Both halves were wrong:
     * js/dungeon.js owns the topology (it already has builds_up and
     * dungeon_branch over the same svb.branches table, so Is_branchlev is four
     * lines there), and seed0030 falsifies the claim TWICE — segments 4 and 7
     * both die on a Dlvl 2 that carries the Gnomish Mines entrance, so C
     * returns FALSE here with NO draw while this port rolled
     * rn2(1) @ can_make_bones(bones.c:377).  Those are the session's only two
     * surplus RNG leaves (JS 105531 vs C 105529) and its first RNG divergence.
     * Segment 3 dies on a Dlvl 2 whose game put the Mines entrance elsewhere,
     * which is why the same depth behaves differently three segments apart. */
    if (Is_branchlev(u.uz) && (u.uz?.dlevel | 0) > 1)
        return false;
    if (u.uswallow)
        return false;
    /* C bones.c:376-379 uses depth(&u.uz) — the ABSOLUTE cross-branch depth
     * (dungeon.c:1387, dungeons[dnum].depth_start + dlevel - 1), NOT u.uz.dlevel.
     * Reading dlevel made every death in a BRANCH roll the wrong modulus, and in
     * the Gnomish Mines it is not a small difference: seed0030 segment 6's
     * Priestess dies on Mines level 1, which is DEPTH 4, so C rolls rn2(2) while
     * this port rolled rn2(1) — and rn2(1) is always 0, so `!rn2(...)` was
     * ALWAYS true and can_make_bones ALWAYS returned false there.  That is why
     * savebones() had never once run on the corpus despite being ported.
     * (`depth` is imported from js/hacklib.js at the top of this file; the local
     * const that used to shadow it is what hid the substitution.) */
    const udepth = depth(u.uz);
    if (udepth <= 0)
        return false;
    if (!rn2(1 + (udepth >> 2)) && !wizard())
        return false;
    if (discover())
        return false;
    return true;
}

/* opts.alreadySaidYouDie — the killing site has ALREADY plined C's own death
 * line (zap.c:2899 urgent_pline("You die.") on the wand-of-death self-zap), so
 * do_death_sequence must not add done_in_by's "You die..." on top of it.  C's
 * two paths really are different messages from different functions; the flag
 * records which one already ran.
 *
 * opts.noDeathLine — C prints NO death line at all on this path.  A DIFFERENT
 * fact from the one above, kept as its own flag because it is its own claim
 * about the C source, and both must suppress the same manufactured pline.
 *
 * WHY IT HAS TO EXIST.  "You die..." is emitted by the KILL SITE in C, never by
 * done(): done_in_by (end.c:195, reached from mhitu.c:1925 / uhitm.c:5952),
 * losehp (hack.c:4287) and eat.c:285 each pline it and THEN call done().  This
 * port centralises it into do_death_sequence instead, which produces the right
 * screen for those three callers and a MANUFACTURED page for any caller that
 * reaches done() by another route.  mcastu.c:337-340 touch_of_death is exactly
 * such a route: `svk.killer.format = KILLED_BY; Strcpy(...); done(DIED);` with
 * no death line anywhere, and done() itself (end.c:1020-1128) prints none
 * before paranoid_query(ParanoidDie,"Die?").
 *
 * MEASURED on /tmp/capscr9/board touch_of_death: all 7 records are wizard-mode
 * (flags.debug=1) deaths whose "Die?" is declined, and 3 of them (rec#0/1/4)
 * carry EXACTLY the two keys C read -- one page ack plus the query answer --
 * while this port demanded three and starved on the missing one.
 *
 * The other done()-direct callers (done(ESCAPED), done(QUIT), done(GENOCIDED),
 * done(PANICKED) ...) have the same defect and are NOT fixed here; each needs
 * its own C reading. */
export function deadhero(how, opts) {
    const g = game;
    if (!g._pendingDeath)
        g._pendingDeath = { how: how | 0,
                            alreadySaidYouDie: !!(opts && opts.alreadySaidYouDie),
                            prejoinButWait: !!(opts && opts.prejoinButWait),
                            urgentDeathLine: !!(opts && opts.urgentDeathLine),
                            noDeathLine: !!(opts && opts.noDeathLine),
                            remainderIsFresh: !!(opts && opts.remainderIsFresh),
                            /* C reaches really_done() INSIDE the killing turn,
                             * so `svm.moves` on the endwin's "after %ld moves."
                             * line (end.c:1544) is the turn counter AS OF THE
                             * FATAL BLOW.  This port defers the whole death
                             * interaction to the next command-read boundary
                             * (see the module header), by which point the
                             * moveloop has advanced g.moves once more — the
                             * stone read "after 45 moves" where C says 44
                             * (seed0030 segment 0 step 75).  Snapshot it here,
                             * where C would have read it. */
                            moves: g.moves | 0 };
}

/* Will the _pendingDeath that was just flagged actually END the game?
 *
 * C does not need this question asked: done() (end.c:1068-1117) either RETURNS
 * -- lifesaved, or wizard/explore mode where the player answers 'n' to "Die?"
 * -- or never returns at all, and its caller's remaining code runs or does not
 * run accordingly, for free.  This port defers the whole blocking interaction
 * to a later boundary, so a caller that needs C's "the rest of me never ran"
 * behaviour has to predict the answer.
 *
 * `how > GENOCIDED` skips both escapes outright (end.c's own gate).  Otherwise
 * a life-saving amulet or wizard/explore mode means the hero may well walk away
 * -- in wizard mode the "Die?" default is 'n' -- so the honest answer is "not
 * necessarily", and the caller should behave as if done() returned. */
export function pending_death_is_final() {
    const g = game;
    const how = g._pendingDeath ? (g._pendingDeath.how | 0) : -1;
    if (how < 0)
        return false;
    if (how > GENOCIDED)
        return true;
    /* C youprop.h:387 `#define Lifesaved u.uprops[LIFESAVED].extrinsic` — unlike
     * nearly every other property, C reads ONLY the extrinsic half here, never
     * intrinsic|extrinsic.  `.intrinsic` can be nonzero for this slot with no
     * gameplay effect at all: it is a plain long, and wizard mode's
     * #wizintrinsic debug command can set a TIMED value into it (timeout.c:112
     * lists LIFESAVED in the table that command drives), while the only C site
     * that ever legitimately touches LIFESAVED.intrinsic (eat.c:709) sets it to
     * 0 as a "sanity check against adding other forms of life-saving". Reading
     * it here as if it activated the property is a false positive. */
    for (const p of [g.u?.uprops?.[LIFESAVED], g.u?.uprops?.['LIFESAVED']])
        if (p?.extrinsic | 0) return false;
    return !(wizard() || discover());
}

/* ══ C end.c:185-300 done_in_by(mtmp, how) ═══════════════════════════════════
 * Record WHO killed the hero, then die.  The killer name is what outrip() puts
 * on the tombstone ("killed by a gnome") and what topten() prints in the score
 * line, both through formatkiller(), which reads svk.killer.
 *
 * Until this existed, every monster kill left svk.killer.name EMPTY and the
 * tombstone read "killed by an []" (seed0030 segment 0 step 75) — the mdamageu
 * site called deadhero() with the damage but never with the monster.
 *
 * C's `You("die...")` (end.c:195) is NOT emitted here: this port defers the
 * whole blocking death interaction to do_death_sequence() at the next
 * command-read boundary (see the module header), and that is where the
 * force_more('You die...') lives.  Everything else here is RNG-FREE.
 *
 * PORTED HERE (each is a name prefix / branch plus, in three cases, a
 * killer.format override): the G_UNIQ "the <unique>" arm (end.c:201-206), the
 * named-ghost "the ghost of <name>" arm (:212-216 and :260-264), the
 * shopkeeper "Ms. <name>, the shopkeeper" arm (:264-270), the priest/minion
 * m_monnam arm (:271-273) and the has_mgivenname " called <name>" tail
 * (:276-282).  The claim that all six were absent was true when it was
 * written and is now true of ONE: the cham/mimic "imitating"/"disguised as"
 * arm (:223-255) is still not ported — it needs M_AP_TYPE and the vampshifter
 * chain, and no corpus hero is killed by a shapeshifter in a borrowed shape.
 *
 * MEASURED, seed0030: the Wizard of segment 3 and the Knight of segment 7 are
 * each killed by a named shopkeeper.  C's stone reads
 * "killed by Ms. Maganasipi; the shopkeeper" (formatkiller turns the comma
 * into a semicolon) and the segment-8 topten list reads
 * "Killed by Ms. Maganasipi, the shopkeeper."; this port said "a shopkeeper"
 * in both places, on five separate frames across four segments.
 *
 * monhealthdescr() (end.c:217) is a genuine no-op: v5's pager.c:139 still
 * wraps its whole body in `#if 0`.
 */
export function done_in_by(mtmp, how) {
    const g = game;
    if (!g.svk) g.svk = {};
    if (!g.svk.killer) g.svk.killer = { id: 0, format: 0, name: '', next: null };
    const mptr = mtmp?.data;
    /* C end.c:327-329 — a mummy killer raises the hero as the role's
     * mummy. Keep this state on the same done_in_by path that records the
     * killer; really_done() emits the corresponding blocking message. */
    if (mptr && (mptr.mlet | 0) === 39) {
        /* Race records in this port do not publish C's mummynum field;
         * human is the only supported race in this corpus. */
        const mnum = Number.isInteger(g.urace?.mummynum)
            ? (g.urace.mummynum | 0) : PM_HUMAN_MUMMY;
        g.u.ugrave_arise = mnum;
    }
    /* C end.c:186-190 — champtr/imitator/mimicker.  A chameleon stores its
     * original species in cham, while a mimic's monster appearance is held in
     * mappearance.  Keep both pointers as data rows: done_in_by only needs the
     * names and uniqueness flags, so this avoids manufacturing a monster. */
    const cham = Number.isInteger(mtmp?.cham) && (mtmp.cham | 0) >= 0
        ? (mtmp.cham | 0) : -1;
    const champtr = cham >= 0 ? (MONS_ROWS_END[cham] || mptr) : mptr;
    const mimicker = (M_AP_TYPE_END(mtmp) === M_AP_MONSTER_END);
    const imitator = mimicker || (champtr && mptr && champtr !== mptr);
    /* C end.c:198 */
    g.svk.killer.format = KILLED_BY_AN;
    let buf = '';
    /* C end.c:200-208 — "killed by the high priest of Crom" is okay,
     * "killed by the high priest" alone isn't:
     *     if ((mptr->geno & G_UNIQ) != 0 && !(imitator && !mimicker)
     *         && !(mptr == &mons[PM_HIGH_CLERIC] && !mtmp->ispriest)) {
     *         if (!type_is_pname(mptr)) Strcat(buf, "the ");
     *         svk.killer.format = KILLED_BY;
     *     } */
    if (mptr && ((mptr.geno | 0) & G_UNIQ_END) !== 0 && !(imitator && !mimicker)
        && !((mptr.pmidx | 0) === PM_HIGH_CLERIC_END && !mtmp.ispriest)) {
        if (!_type_is_pname_end(mptr))
            buf += 'the ';
        g.svk.killer.format = KILLED_BY;
    }
    /* C end.c:210-216 — "_the_ <invisible> <distorted> ghost of Dudley". */
    const isGhost = mptr && (mptr.pmidx | 0) === PM_GHOST_END;
    if (isGhost && has_mgivenname(mtmp)) {
        buf += 'the ';
        g.svk.killer.format = KILLED_BY;
    }
    /* C end.c:217 monhealthdescr(mtmp, TRUE, eos(buf)) — pager.c:139 wraps the
     * whole body in `#if 0`, so it writes an empty string.  A real no-op. */
    /* C end.c:218-219 */
    if (mtmp?.minvis)
        buf += 'invisible ';
    /* C end.c:220-221 — Hallucination && canspotmon(mtmp).  GAP: no corpus
     * hero dies hallucinating, and the hallucinated form would also have to be
     * drawn from the display RNG stream. */
    if (imitator) {
        /* C end.c:223-255 — describe the real monster in its current form. */
        const realidx = cham >= 0 ? cham : (mptr?.pmidx | 0);
        const realnm = monPmname(realidx | 0, mtmp?.female ? FEMALE : MALE);
        let fakeidx = mptr?.pmidx | 0;
        if (mimicker) {
            fakeidx = mtmp?.mappearance | 0;
        }
        const fakeRow = MONS_ROWS_END[fakeidx];
        const fakeptr = fakeRow
            ? { pmidx: fakeidx, geno: fakeRow[3] | 0, mflags2: fakeRow[7] | 0 }
            : mptr;
        const fakenm = monPmname(fakeidx, mtmp?.female ? FEMALE : MALE);
        let shape;
        if (_type_is_pname_end(fakeptr) || !fakeptr)
            shape = fakenm;
        else if (the_unique_pm(fakeptr))
            shape = `the ${fakenm}`;
        else
            shape = an(fakenm);
        buf += mimicker ? `${realnm} disguised as ${shape}`
                        : `${realnm} imitating ${shape}`;
    } else if (isGhost) {
        /* C end.c:260-264 */
        buf += 'ghost';
        if (has_mgivenname(mtmp))
            buf += ` of ${MGIVENNAME(mtmp)}`;
    } else if (mtmp?.isshk) {
        /* C end.c:264-270:
         *     const char *shknm = shkname(mtmp),
         *                *honorific = shkname_is_pname(mtmp) ? ""
         *                                : mtmp->female ? "Ms. " : "Mr. ";
         *     Sprintf(eos(buf), "%s%s, the shopkeeper", honorific, shknm);
         *     svk.killer.format = KILLED_BY; */
        const shknm = shkname(mtmp);
        const honorific = _shkname_is_pname_end(mtmp) ? ''
                          : mtmp.female ? 'Ms. ' : 'Mr. ';
        buf += `${honorific}${shknm}, the shopkeeper`;
        g.svk.killer.format = KILLED_BY;
    } else if (mtmp?.ispriest || mtmp?.isminion) {
        /* C end.c:271-273 — m_monnam() suppresses the "the " prefix plus
         * "invisible", and overrides Hallucination on priestname(). */
        buf += m_monnam(mtmp);
    } else {
        /* C end.c:275 `Strcat(buf, pmname(mptr, Mgender(mtmp)))` */
        buf += monPmname(mptr?.pmidx | 0, mtmp?.female ? FEMALE : MALE);
        /* C end.c:276-282 — " called <name>" (has_ebones is #if 0'd out in
         * v5, so the connective is always "called"). */
        if (has_mgivenname(mtmp))
            buf += ` called ${MGIVENNAME(mtmp)}`;
    }
    /* C end.c:284 */
    g.svk.killer.name = buf;
    deadhero(how | 0);
}
/* C monflag.h G_UNIQ 0x1000 — the same value js/read.js:3797 pins. */
const G_UNIQ_END = 0x1000;
/* mons[] row indices, cross-checked against js/makemon_pmnames.json:
 * 276 = ["high priest","high priestess","high cleric"], 287 = "ghost". */
const PM_HIGH_CLERIC_END = 276;
const PM_GHOST_END = 287;
const M_AP_MONSTER_END = 3;
function M_AP_TYPE_END(mon) { return mon?.m_ap_type | 0; }
/* C mondata.h type_is_pname(ptr) = (ptr->mflags2 & M2_PNAME).  monflag.h
 * M2_PNAME = 0x00080000 (js/makemon.js and js/objnam.js both carry the same
 * one-line body; neither exports it). */
const M2_PNAME_END = 0x00080000;
function _type_is_pname_end(ptr) { return ((ptr?.mflags2 | 0) & M2_PNAME_END) !== 0; }
/* C shknam.c:899-905 shkname_is_pname(mtmp) — the RAW eshk->shknam (the one
 * shkname() strips the prefix character off) begins with one of '-', '+', '='
 * when the name is a proper name that takes no honorific. */
function _shkname_is_pname_end(mtmp) {
    const raw = mtmp?.mextra?.eshk?.shknam;
    if (typeof raw !== 'string' || !raw.length)
        return false;
    return raw[0] === '-' || raw[0] === '+' || raw[0] === '=';
}

// C ref: end.c:706 savelife(how).  Restore the hero after a declined
// "Die?" (wizard/explore).  givehp = 50 + 10*(ACURR(A_CON)/2), clamped to uhpmax.
/* C hack.h:484 — the `how` code passed to done(); CHOKING = 1. */
const CHOKING_END = 1;
export async function savelife(how, inPlace) {
    const g = game;
    const u = g.u || (g.u = {});
    const givehp = 50 + 10 * Math.trunc(acurr(u, A_CON) / 2);
    // C end.c:713-714 — life-drain to xp 0 bulletproofing.
    if ((u.ulevel | 0) < 1)
        u.ulevel = 1;
    // C end.c:715-717 — floor uhpmax at minuhpmax(10).
    const uhpmin = minuhpmax(10);
    if ((u.uhpmax | 0) < uhpmin)
        setuhpmax(uhpmin, true);
    // C end.c:718-720 — restore hit points.
    u.uhp = Math.min(u.uhpmax | 0, givehp);
    if (Upolyd(u))
        u.mh = Math.min(u.mhmax | 0, givehp);
    /* C end.c:721-723:
     *     if (u.uhunger < 500 || how == CHOKING)
     *         init_uhunger();
     * This was skipped on the claim that "the corpus hero is neither (uhunger
     * >= 500)".  MEASURED FALSE on seed4500: the hero declines death at step
     * 1056 with u.uhunger already down at ~183, so C resets it to 900 and never
     * shows a hunger status for the rest of the session, while this port carried
     * the starved value forward, crossed the 150 HUNGRY threshold at turn 188,
     * and painted "Hungry" into the status row of every subsequent frame.
     * RNG-free; init_uhunger() also clears a negative ATEMP(A_STR) and sets
     * disp.botl, both of which C does here. */
    if ((u.uhunger | 0) < 500 || (how | 0) === CHOKING_END)
        init_uhunger();
    /* C end.c:724-728 — only an immediately fatal sickness timeout is cured.
     * make_sick also clears its delayed killer and usick_type. */
    if ((((u.uprops?.[SICK]?.intrinsic) | 0) & TIMEOUT) === 1)
        await make_sick(0, null, false, SICK_ALL);
    // C end.c:729-733 — nomovemsg + can't-move-again this turn (gm.multi = -1).
    g.nomovemsg = 'You survived that attempt on your life.';
    g.context = g.context || {};
    g.context.move = 0;
    // C sets gm.multi = -1 so the hero can't move again this turn and the nomovemsg
    // is displayed when the -1 countdown completes in the SAME turn's HEAD (after
    // savelife, movemon continues, then ++gm.multi -> 0 -> unmul shows nomovemsg).
    // In this port the death interaction is DEFERRED to the command-read boundary,
    // AFTER this turn's world block already ran, so that in-turn countdown cannot be
    // replayed; a lingering multi=-1 would instead make the NEXT moveloop_core run a
    // spurious extra world block (drawing RNG C never drew) and emit unmul's "You can
    // move again." at the wrong point.  We therefore leave gm.multi = 0 and surface
    // the nomovemsg directly (do_death_sequence joins it onto the "OK, so you don't
    // die." command-result line — the exact recorded step-778 topline).  RNG-neutral.
    // When the death interaction runs IN PLACE (inside movemon, C position), the
    // in-turn countdown IS replayable: this turn HEAD block still runs after
    // movemon, so gm.multi = -1 ticks back to 0 there and unmul() plines the
    // nomovemsg exactly where C does (seed5002 segment 1 step 148, "You survived
    // that attempt on your life." on its own topline, after the
    // "OK, so you don't die.  The kitten bites the giant bat.--More--" page).
    g.multi = inPlace ? -1 : 0;
    /* C end.c:739-747 — clear the other fatal-state residue before releasing
     * a swallowed or held hero. */
    g.multi_reason = ((g.urole?.mnum | 0) === (PM_TOURIST | 0))
        ? 'being toyed with by Fate'
        : 'attempting to cheat Death';
    if ((u.utrap | 0) && (u.utraptype | 0) === TT_LAVA)
        await reset_utrap(false);
    (g.disp ||= {}).botl = 1;
    u.ugrave_arise = NON_PM;
    if (u.uprops?.[UNCHANGING])
        u.uprops[UNCHANGING].intrinsic = 0;
    if (!g.context.mon_moving)
        endmultishot(false);
    /* C end.c:749-758.  expels() is async here because its docrt page can read
     * input.  Await the whole release before the interrupted monster turn
     * resumes; in C this call is synchronous.  expels_gu still names its
     * missing spoteffects(TRUE) landing tail, so a landing trap remains a
     * separate gap rather than being silently simulated here. */
    const stuck = u.ustuck;
    if (u.uswallow && stuck) {
        await expels_gu(stuck, (stuck.mnum ?? stuck.data?.pmidx ?? 0) | 0, true);
    } else if (stuck) {
        if (Upolyd(u) && sticks(g.youmonst?.data)) {
            await pline(`You release ${mon_nam(stuck)}.`);
        } else {
            const name = mon_nam(stuck);
            const subject = name ? name[0].toUpperCase() + name.slice(1) : 'The monster';
            await pline(`${subject} releases you.`);
        }
        await unstuck(stuck);
    }
    void how;
}

// C ref: end.c:1023 done() (wizard/discover branch) + done_in_by's "You die..." +
// cmd.c paranoid_query -> yn_function("Die?", "yn", 'n').  Driven at the command-
// read boundary (rhack) when deadhero() flagged a death during this turn's
// movemon/zap.  Returns TRUE when it handled a pending death (so the caller skips
// the normal command read this invocation).  RNG-FREE throughout.
/* C end.c:1069-1076 — `if (how < PANICKED) { u.umortality++; if (u.uhp != 0 ||
 * (Upolyd && u.mh != 0)) { ...force HP to zero... } }`.  This sits WELL AFTER
 * done()'s own `disp.botlx = TRUE; bot();` (end.c:1041-1046), which is the whole
 * point: bot() gets to see the killing blow's real u.uhp -- and botl.c:279
 * declines to paint when that is exactly -1. */
function _done_force_hp_zero() {
    const g = game;
    if (!g.u) return;
    /* C botl.c:279 — done()'s own `disp.botlx = TRUE; bot();` (end.c:1041-1046)
     * runs BEFORE this block and REFUSES TO PAINT while u.uhp is exactly -1, so
     * the PHYSICAL status line keeps its previous values.  Setting u.uhp = 0
     * here only sets disp.botl; the line does not change until the next thing
     * that actually calls bot(), and on a non-shop death nothing does before
     * the "You die..." page.  js/display.js re-derives the status from live `u`
     * at render time and keys its frozen-value fallback off `u.uhp === -1`, so
     * zeroing the sentinel here unfroze it: seed0030 segment 4 step 192 reads
     * HP:1(11) in C (the pre-death paint) and read HP:0(11) here.  Latch the
     * suppression instead — js/display.js clears _botlFrozenDeath in bot(),
     * which is exactly where C's next real paint would happen (and does, on a
     * SHOP death, because paybill's pline runs flush_screen first). */
    if ((g.u.uhp | 0) === -1)
        g._botlFrozenDeath = true;
    if ((g.u.uhp | 0) !== 0 || (g.u.mh | 0) !== 0) {
        g.u.uhp = 0;
        g.u.mh = 0;
        /* C end.c:1075 `disp.botl = TRUE;` — the repaint is REQUESTED here and
         * PERFORMED by the next flush_screen(), which on a shop death is the
         * one paybill's pline runs and on any other death never comes. */
        if (g.disp) g.disp.botl = 1;
    }
}

// C end.c:1053-1067, shared by the direct and pending-death callers after
// their status update. Keep one owner for the sequence and default cause.
function done_death_context(how) {
    const g = game;
    if (g.done_seq < g.hero_seq)
        g.done_seq = g.hero_seq;
    if (!g.svk) g.svk = {};
    if (!g.svk.killer)
        g.svk.killer = { id: 0, format: KILLED_BY_AN, name: '', next: null };
    if (how === ASCENDED || (!g.svk.killer.name && how === GENOCIDED))
        g.svk.killer.format = NO_KILLER_PREFIX;
    if (!g.svk.killer.name && (how === STARVING || how === BURNING))
        g.svk.killer.format = KILLED_BY;
    if (!g.svk.killer.name || how >= PANICKED)
        g.svk.killer.name = _DEATHS[how] ?? '';
}

export async function do_death_sequence(opts) {
    /* opts.inPlace — the caller is movemon (js/fastforward.js ff_movemon_one_pass),
     * i.e. C position for done(): the remaining monsters have NOT moved yet, so the
     * post-savelife text must go to the LIVE topline for their plines to join, and
     * savelife may set gm.multi = -1 for this turn own countdown. */
    const inPlace = !!(opts && opts.inPlace);
    const g = game;
    const pd = g._pendingDeath;
    if (!pd)
        return false;
    g._pendingDeath = null;
    g._deathMoves = (pd.moves != null) ? (pd.moves | 0) : null;
    /* C end.c:1068-1070 — the FIRST thing done() does after settling killer.name:
     *     if (how < PANICKED) {
     *         u.umortality++;
     *         ...force HP to zero...
     *     }
     * It sits ABOVE both the Lifesaved arm and the wizard/discover "Die?" query,
     * so a death the player then DECLINES still counts.  done() (:824 in this
     * file) has the block; do_death_sequence -- the path every wizard-mode death
     * actually takes -- had only the HP half, spelled _done_force_hp_zero().
     * The counter is read by insight.c's mortality line ("You have been killed
     * <N times>.", js/cmd.js _attributes_enlightenment) and by topten.
     * MEASURED on seed4500-knight-coverage: the hero declines "Die?" three times
     * (steps 1007, 1056, 1787) and C's ^X at step 1809 reads "You have been
     * killed thrice." where this port, with u.umortality still 0, emitted no
     * line at all -- the whole page shifted up by one. */
    if (g.u && (pd.how | 0) < PANICKED)
        g.u.umortality = (g.u.umortality | 0) + 1;
    // The width-driven pages of this turn's combat/zap messages have already been
    // shown by the caller's flush_screen; _pending_message holds the final
    // committed remainder (the last combat/zap line).  C's done_in_by "You die..."
    // pline forces a more() over that remainder regardless of width (win/tty
    // topl.c: a fresh message arriving on an unacknowledged painted topline pages
    // it) — the m4 "The ettin mummy hits again!--More--" / "Your potion ...
    // shatters!--More--" page.  Then "You die..." itself is acknowledged before
    // done() raises the "Die?" prompt.
    let remainder = String(g._pending_message || '');
    let _prejoinedButWait = false;
    /* C's direct zhitu()->done() continuation paints status, appends
     * "But wait...", then lets the pending hit line page. */
    if (pd.prejoinButWait) {
        if (g.disp) g.disp.botlx = 1;
        await bot();
        done_death_context(pd.how);
        _done_force_hp_zero();
        await pline('But wait...');
        remainder = String(g._pending_message || '');
        _prejoinedButWait = true;
    }
    /* ...UNLESS the page that led here was dismissed with ESC.  topl.c:232 set
     * WIN_STOP on that dismiss, and with WIN_STOP set update_topl raises no
     * more() at all (:272 `else if (!skip)`); the "You die" that follows is
     * topl.c:298's one escape from the suppression and it is DRAWN, not paged
     * (redotoplin:139 more()s only when cury != 0, and it is 0 here).
     * MEASURED on seed4500-knight-coverage step 1786: the player ESCs "You hit
     * it.  The silver dragon bites!  The silver dragon hits!--More--" and C's
     * very next frame is the "Die? [yn] (n)" prompt -- no combat page, no
     * "You die...--More--" page in between. */
    let _winStopHere = !!(g._topl_win_stop || g._topl_win_stop_armed);
    let _suppressDeathPage = false;
    if (remainder && !_winStopHere && !pd.remainderIsFresh) {
        /* The page that carries the killing blow may be dismissed with ESC
         * immediately before done() continues.  In C that ESC arms WIN_STOP
         * for the very next "You die..." update; force_more() returns the
         * dismiss key, so carry that state across this synchronous boundary. */
        const _remainderMorc = await force_more(remainder);
        if (_remainderMorc === 27 && /materialize/.test(remainder)) {
            _winStopHere = true;
            _suppressDeathPage = true;
        }
    }
    /* hack.c:4287 losehp() uses urgent_pline before done().  Recreate that
     * source-specific update after any old visible topline has paged.  With
     * WIN_STOP live, urgency clears the suppressed buffer instead.  The new
     * fitting line remains live for lifesaving or shop text to join. */
    if (pd.urgentDeathLine) {
        await urgent_pline('You die...');
        pd.alreadySaidYouDie = true;
        _winStopHere = false;
        _suppressDeathPage = false;
    }
    /* C end.c:1041-1046 — done() forces a FULL status update here:
     *     disp.botlx = TRUE;
     *     bot();
     * and bot() (botl.c:279) declines to paint at all while u.uhp is exactly -1,
     * so on a death that landed the hero on -1 hit points the physical status
     * line keeps the values of the last paint that DID happen -- for the "You
     * die..." page, the wizard-mode "Die?" prompt, and everything after.
     *
     * THE ORDER MATTERS AND WAS INVERTED HERE.  C's `u.uhp = 0` (end.c:1071-1075,
     * "in case caller hasn't already done this") runs AFTER that bot(); this port
     * ran it FIRST, which destroyed the -1 sentinel before anything rendered and
     * repainted HP:0 over C's frozen value.  Measured on seed5002 segment 1: a
     * giant bat bites a 1-HP hero for d(1,6)=2 and C reads HP:1(12) on all twelve
     * frames from "You die...--More--" onward. */
    if (!pd.prejoinButWait) {
        if (g.disp) g.disp.botlx = 1;
        await bot();
        done_death_context(pd.how);
    }
    /* ── C end.c:1082-1102 — the Lifesaved arm ─────────────────────────────
     * C tests this BEFORE the wizard/discover "Die?" query and sets `survive`,
     * which then suppresses that query entirely (end.c:1104 `if (!survive &&
     * (wizard || discover) ...)`).  This port had NO port of the arm at all, so
     * a life-saved hero in a debug-mode session got the "Die?" prompt C never
     * raises.  MEASURED on seed0399-wizard-hallu-actions step 448: C reads
     *     "You die...  But wait...  Your medallion begins to glow!--More--"
     * and this port read "Die? [yn] (n)".
     *
     * The one RNG site in the whole arm is makeknown(AMULET_OF_LIFE_SAVING) —
     * hack.h:1530 `#define makeknown(x) discover_object((x), TRUE, TRUE, TRUE)`,
     * whose credit_hero argument reaches o_init.c:483 exercise(A_WIS, TRUE) and
     * draws rn2(19).  That draw is C leaf 10729, this session's first RNG
     * divergence: the scored run was still inside distfleeck() there.
     * (adjattrib(A_CON, -1, TRUE) can draw rn2 only when ABASE would fall below
     * ATTRMIN; it does not here, and C's log confirms it — the leaf after the
     * rn2(19) is distfleeck's rn2(5).) */
    /* C youprop.h:387 `#define Lifesaved u.uprops[LIFESAVED].extrinsic` reads
     * ONLY the extrinsic half (set when an amulet of life saving is worn).
     * `.intrinsic` is a plain long that carries no gameplay meaning for this
     * property — wizard mode's #wizintrinsic debug command can stuff a TIMED
     * value into it (timeout.c:112 lists LIFESAVED in the table that command
     * drives) with zero effect on whether the hero is actually saved, and the
     * only C site that ever legitimately writes LIFESAVED.intrinsic (eat.c:709)
     * sets it to 0, "a sanity check against adding other forms of
     * life-saving".  Treating a nonzero .intrinsic as Lifesaved==true made a
     * wizard-#wizintrinsic'd hero take this arm (and its RNG-drawing
     * makeknown(AMULET_OF_LIFE_SAVING)) on every death instead of falling
     * through to the (wizard || discover) "Die?" query below, which is what C
     * actually does when the amulet was never worn. */
    const _lifesaved = (() => {
        for (const p of [g.u?.uprops?.[LIFESAVED], g.u?.uprops?.['LIFESAVED']])
            if (p?.extrinsic | 0) return true;
        return false;
    })();
    if (_lifesaved && (pd.how | 0) <= GENOCIDED) {
        /* C end.c:195 done_in_by: You("die...").  Deliberately a pline() and NOT
         * force_more(): win/tty/topl.c:264's join test ends
         *     && (notdied = strncmp(bp, "You die", 7)) != 0
         * so "You die" never JOINS the text already on the topline — it pages
         * that text (the do_death_sequence prelude above has already done so)
         * and then OPENS a fresh topline, which the Lifesaved plines below join
         * onto.  C's step-448 frame is the three of them together:
         *     "You die...  But wait...  Your medallion begins to glow!--More--"
         * (54 columns; the page comes when "You feel much better!" would take it
         * to 77, past CO-1-8).  force_more() here would page "You die..." on its
         * own, which is right only on the wizard-query path below, where the
         * NEXT thing C does is raise a prompt. */
        if (!pd.alreadySaidYouDie && !pd.noDeathLine)
            await pline('You die...');
        _done_force_hp_zero();
        if (!_prejoinedButWait)
            await pline('But wait...');
        /* C: "assumes that only one type of item confers LifeSaved property" */
        discover_object(AMULET_OF_LIFE_SAVING_END, true, true, true); /* makeknown */
        await pline(`Your medallion ${!Blind() ? 'begins to glow' : 'feels warm'}!`);
        /* A direct done() caller can arrive with its own fatal line freshly
         * drawn after that line overflowed an older message.  C's following
         * medallion pline then blocks on "fatal.  But wait..." before the
         * lifesaving continuation proceeds. */
        if (pd.remainderIsFresh && _topline_more_pending())
            await flush_screen(1);
        if ((pd.how | 0) === CHOKING_END)
            await pline('You vomit ...');
        /* C win/tty/topl.c:257-274 — update_topl joins an incoming message onto
         * the committed topline only while it fits the CO-1-8 reserve, else it
         * more()s FIRST.  This port normally accumulates a turn's plines and
         * lets flush_screen split them, which produces the same PAGES — but not
         * the same suppression: topl.c:232 sets WIN_STOP when a page is
         * dismissed with ESC, and every message after it is swallowed until the
         * next tty_nhgetch.  seed0399 dismisses this very page with the ESC at
         * step 451, so C shows "You feel much better!" (the message that owned
         * the more()) and swallows "The medallion crumbles to dust!" entirely.
         * Raising the page HERE, at C's own join test, is what lets pline() see
         * the ESC.  _topl_joins_committed is the exported form of that test. */
        const _muchbetter = 'You feel much better!';
        if (!_topl_joins_committed(g._pending_message || '', _muchbetter))
            await force_more(g._pending_message || '');
        await pline(_muchbetter);
        await pline('The medallion crumbles to dust!');
        if (g.u?.uamul)
            await useup(g.u.uamul);
        /* C: `(void) adjattrib(A_CON, -1, TRUE)` — msgflg POSITIVE means "no
         * message" (attrib.c:433 comment), so this is silent. */
        adjattrib(A_CON, -1, 1);
        await savelife(pd.how, inPlace);
        /* C end.c:1120-1124 — `if (survive) { killer.name[0] = '\0';
         * killer.format = KILLED_BY_AN; return; }`.  done() returns and play
         * continues; nothing below (the "Die?" query, really_done) runs. */
        if (g.svk?.killer) {
            g.svk.killer.name = '';
            g.svk.killer.format = KILLED_BY_AN;
        }
        g._resultMessage = g._resultMessage || null;
        return true;
    }
    // C end.c:1105-1113 — the "Die?" prompt below is gated on `wizard || discover`.
    // An ordinary hero never sees it: done() falls straight through to
    // really_done(how).  This branch had no port at all, so an ordinary death
    // raised the wizard prompt (or, before the losehp arm existed, nothing).
    if (!wizard() && !discover()) {
        // C end.c:195 done_in_by: `You("die...")`.  It is a PLAIN pline, not a
        // page: win/tty/topl.c:264's join test refuses to append it to whatever
        // the killing blow left on the topline (the strncmp("You die", 7)
        // guard), so update_topl more()s that text — which the `remainder`
        // force_more above has already done — and then OPENS A FRESH TOPLINE.
        // The page over "You die..." ITSELF comes later, from really_done's
        // `display_nhwindow(WIN_MESSAGE, FALSE)` at end.c:1244, and that is
        // AFTER paybill(): a shop death's "<Shk> takes all your possessions."
        // JOINS this line and the two are paged together
        // ("You die...  Maganasipi takes all your possessions.--More--",
        // seed0030 segment 3 step 286).  Paging here instead put the
        // shopkeeper's line on a frame of its own and shifted the tombstone.
        if (!pd.alreadySaidYouDie && !pd.noDeathLine)
            await pline('You die...');
        _done_force_hp_zero();
        // C end.c:1128 done() -> really_done(how).  This used to stop here and
        // hand-render ONE frame — a hardcoded
        //     'Do you want your possessions identified? [ynq] (n)'
        // — under a comment asserting that "flags.end_disclose defaults to
        // 'none' for every corpus session".  That is measurably false:
        // seed0030's rc says `disclose:-i -a -v -g -c -o`, i.e. all six
        // categories are DISCLOSE_NO_WITHOUT_PROMPT, so C raises NO prompt and
        // eats NO key — it goes straight to the tombstone (segment 0 step 75).
        // The hardcoded frame also bypassed can_make_bones(), the disclosure
        // ladder, outrip() and topten(), ALL of which are ported below in
        // really_done(); routing through it is what puts them on a death.
        //
        // really_done() ends at C's nh_terminate, which this port spells as a
        // throw after the last frame is captured; jsmain parks it in
        // replayError exactly as it already does for the QUIT path.
        await really_done(pd.how);
        g._resultMessage = null;
        return true;
    }
    // C end.c:195 done_in_by: ordinary You("die...").
    // Skipped when the killing site already delivered C's own death line (the
    // wand-of-death self-zap, zap.c:2899): there is no done_in_by on that path,
    // and the "You die." it plined was already paged by the force_more above.
    if (!pd.alreadySaidYouDie && !pd.noDeathLine) {
        if (_winStopHere) {
            /* WIN_STOP is live: topl.c:298's `if (!notdied) flags &= ~WIN_STOP,
             * skip = FALSE` lets "You die..." through, and :300's
             * redotoplin(toplines) DRAWS it with no more().  It never joins
             * (:264's strncmp("You die") guard), so it replaces the topline.
             *
             * ...but ONLY WHEN IT WOULD HAVE FIT.  `notdied` is assigned inside
             * the short-circuited condition at topl.c:262-265, so a "You die"
             * that overflows gt.toplines never reaches the strncmp, leaves
             * notdied == 1, does NOT clear WIN_STOP and is NOT drawn — see the
             * long note in js/display.js pline() for the two measured cases.
             * The length is measured against the SUPPRESSED buffer
             * (_topl_win_stop_buf), not against what is painted. */
            const _wsBuf = (g._topl_win_stop_buf != null)
                ? String(g._topl_win_stop_buf) : String(g._pending_message || '');
            if (_wsBuf.length + 2 + 'You die...'.length < TOPL_LIMIT_END) {
                g._topl_win_stop = false;
                g._topl_win_stop_armed = false;
                g._topl_win_stop_buf = null;
                g._pending_message = 'You die...';
            } else {
                /* notdied stays 1: buffered, not drawn, WIN_STOP survives into
                 * tty_yn_function, which therefore raises no more(). */
                g._topl_win_stop_buf = 'You die...';
            }
        } else {
            await force_more('You die...');
        }
    }
    _done_force_hp_zero();
    /* C ref: win/tty/topl.c:389-393 — tty_yn_function's own preamble:
     *     if (ttyDisplay->toplin == TOPLINE_NEED_MORE
     *         && (cw->flags & (WIN_STOP | WIN_NOSTOP)) != WIN_STOP)
     *         more();
     *     cw->flags &= ~(WIN_STOP | WIN_NOSTOP);
     * so the prompt PAGES whatever un-acknowledged message is standing on the
     * topline, and only then clears the suppression bit.
     *
     * The !_winStopHere arm above force_more()s "You die..." itself, which is
     * this same page pulled forward, and leaves nothing pending — so this is a
     * no-op there.  It matters on the two arms that do NOT page: the WIN_STOP
     * arm above, and `alreadySaidYouDie`, where done_in_by() already plined
     * "You die..." through js/display.js.
     *
     * MEASURED on seed0399-wizard-hallu-actions: the ant's second kill arrives
     * with WIN_STOP live, so "You die..." replaces the topline silently
     * (topl.c:298-300) and C's NEXT two frames are "You die...--More--" — the
     * page raised right here — before "Die? [yn] (n)" appears at step 523.
     * Without it the port raised the prompt one page early and ran the rest of
     * the session a keystroke out of step. */
    if (!g._topl_win_stop && !_suppressDeathPage
        && g._pending_message && g._pending_message.length > 0)
        await force_more(g._pending_message);
    /* The tty prompt preamble above has now consumed TOPLINE_NEED_MORE,
     * including the WIN_STOP case where acknowledgement is suppressed.
     * Clear that state before dropping WIN_STOP so the shared reader cannot
     * page the same suppressed death message a second time. */
    g._topl_unacknowledged = false;
    g._topl_win_stop = false;
    g._topl_win_stop_armed = false;
    g._topl_win_stop_buf = null;
    /* C end.c:1116 uses the shared paranoid reader here too.  This path is the
     * in-place death/lifesaving path, distinct from done() below, and must honor
     * ParanoidDie rather than maintaining a second tty reader. */
    routeTag('done_savelife', 'Die?'); /* telemetry only; inert when env unset */
    const _strictDie = !!((g.flags?.paranoia_bits | 0) & PARANOID_DIE);
    let die;
    if (_strictDie) {
        die = await paranoid_query(true, 'Die?');
    } else {
        die = await paranoid_query(false, 'Die?');
    }
    if (!die) {
        if (inPlace) {
            // C end.c:1117-1119 — pline("OK, so you don't die."); savelife(how),
            // both reached from inside movemon.  The pline goes to the LIVE topline
            // so the monsters that move AFTER the killer join onto it, which is
            // exactly C's recorded page
            //     "OK, so you don't die.  The kitten bites the giant bat.--More--".
            // savelife's gm.multi = -1 then makes this turn's HEAD block emit the
            // nomovemsg through unmul() (js/allmain.js), where C emits it.
            await pline("OK, so you don't die.");
            await savelife(pd.how, true);
        } else {
            // DEFERRED path (a death flagged outside movemon and drained at the
            // command-read boundary in cmd.js rhack): this turn's world block has
            // already run, so the multi<0 countdown cannot be replayed.
            // C end.c:1117-1119 — pline("OK, so you don't die."); savelife(how).
            await savelife(pd.how);
            // "OK, so you don't die." (done) and the nomovemsg (savelife) both land on
            // one topline read at the next nhgetch capture (C: the nomovemsg is emitted
            // when the multi<0 countdown completes; here both are the command-result
            // line the next rhack(0) restores).
            g._resultMessage = "OK, so you don't die.  "
                + (g.nomovemsg || 'You survived that attempt on your life.');
            g.nomovemsg = null;
        }
        /* C end.c:1120-1124: debug/explore refusal sets survive just like
         * amulet life saving. Clear the failed death's killer before done()
         * returns, so later deaths do not inherit this cause. */
        if (g.svk?.killer) {
            g.svk.killer.name = '';
            g.svk.killer.format = KILLED_BY_AN;
        }
    } else {
        // C end.c:1128 really_done(how) — the hero actually dies.  The comment
        // that stood here ("No recorded session answers 'y' to Die?, so the
        // real-death teardown is not exercised") was measurably FALSE:
        // seed5006 segment 0 step 186 answers 'y' and C goes straight into
        // really_done(), where it raises "Save bones? [yn] (n)" and then pages
        // the tombstone.  Leaving the game state as-is stopped the replay dead
        // there: this port emitted a LIVE game frame (HP:1(10), then 2, 3, 4 as
        // the hero regenerated) for every one of segment 0's last 8 steps.
        // The wizard arm takes exactly the same exit C's ordinary arm does.
        await really_done(pd.how);
        g._resultMessage = null;
    }
    return true;
}

/* ═══ #quit — cmd.c extcmdlist "quit" → end.c:1550 done2() ═══
 *
 * The doextcmd dispatch chain had no 'quit' arm, so seed0398's "#quit\nyi<ESC>"
 * typed the name, dispatched to nothing, and then C's two confirmation prompts
 * ate keystrokes JS ran as commands.  C's frames are
 *     step 83  "Really quit without saving? [yn] (n)"   cursor col 37
 *     step 84  "Dump core? [ynq] (q)"                   cursor col 21
 *     step 85  same frame again — 'i' is not in "ynq", yn_function eats it
 *
 * Scope: the two prompts and their key handling.  Answering 'n'/ESC to the
 * first is C's "don't quit" arm and is ported; answering 'y' and then reaching
 * really_done(QUIT) -- the disclosure / vanquished / tombstone / topten
 * teardown -- is NOT ported, so the replay stops consuming keys there exactly as
 * do_death_sequence's 'y' arm already does.  seed0398's LAST recorded frame
 * (step 86, "Since you were in wizard mode, the score list will not be
 * checked.") is that unported teardown; it is one step point and it is
 * deliberately left on the table rather than faked.
 *
 * WITHDRAWN 2026-09-01.  This comment used to read "In_tutorial is false for
 * every corpus session, so done2's tutorial y_n -- which would consume a
 * keystroke -- is skipped, not merely unimplemented."  It was MEASURED FALSE:
 * gen434 / gen516 (step 83) and gen446 (step 1711) all record C asking
 * "Switch from the tutorial back to regular play? [yn] (n)".  The claim was
 * true of the 44 PUBLIC sessions and written down as a property of "every
 * corpus session"; the tutorial question is now ported in done2() below.
 */
/* C win/tty/topl.c update_topl:264 — `n0 + strlen(gt.toplines) + 3 < CO - 8`
 * with CO == 80, i.e. `buffer + 2 + message < 71`.  js/display.js keeps the same
 * constant as TOPL_LIMIT; it is not exported, and this file needs only the
 * literal reserve, so it is spelled once here rather than widening that
 * module's surface. */
const TOPL_LIMIT_END = 71;

/* C cmd.c:yn_function — the fourth argument controls the command queue,
 * not tty response filtering. Callers which record answers pass it explicitly.
 * The tty reader below owns rendering and the NULL-response character arm. */
export async function yn_function(query, choices, defchoice, addcmdq = false, opts = {}) {
    (game.iflags ||= {}).last_msg = PLNMSG_UNKNOWN;
    if (query.length >= QBUFSZ)
        query = query.slice(0, QBUFSZ - 1 - 3) + '...';
    const cq = (addcmdq && cmdq_pop()) || { typ: CMDQ_USER_INPUT, key: 0 };
    let res = '\x1b';
    if (cq.typ !== CMDQ_USER_INPUT) {
        if (cq.typ === CMDQ_KEY) res = String.fromCharCode(cq.key & 255);
        else cmdq_clear(CQ_CANNED);
        addcmdq = false;
    } else {
        res = await _yn_prompt(query, choices, defchoice, opts);
    }
    if (addcmdq) cmdq_add_key(CQ_REPEAT, typeof res === 'number' ? res : res.charCodeAt(0));
    // C revalidates queued replies against the current context's response set.
    // Its paniclog/impossible diagnostics, fuzzer and alternate menu reader
    // remain separate dependencies; this is the normal tty/queue route.
    if (choices && res && res !== '\0' && !choices.includes(res))
        res = defchoice || '\x1b';
    (game.program_state ||= {}).input_state = 0; // otherInp
    return res;
}
async function _yn_prompt(query, choices, defchoice, opts = {}) {
    const g = game;
    /* C tty_yn_function (topl.c:397-402) acknowledges TOPLINE_NEED_MORE
     * before replacing it with the question, unless WIN_STOP suppresses it.
     * Width paging clears the input flag while leaving a final remainder,
     * so retain the original state until that remainder is acknowledged. */
    const unacknowledged = g._topl_unacknowledged;
    if (!g._topl_win_stop && !g._topl_win_stop_armed) {
        if (_topline_more_pending()) await flush_screen(1);
        if (unacknowledged && g._pending_message)
            await force_more(g._pending_message);
    }
    g._topl_unacknowledged = false;
    g._topl_win_stop = false;
    g._topl_win_stop_armed = false;
    g._topl_win_stop_buf = null;
    /* C win/tty/wintty.c tty_yn_function renders "<query> [<choices>] (<def>)"
     * and parks the cursor one column past it. */
    const qbuf = choices === null ? query : `${query} [${choices}] (${defchoice})`;
    /* Unlike getlin's windows.c wrapper, yn_function does not set
     * gb.bot_disabled. Its initial custompline can therefore paint pending
     * status even though tty inread is set. Materialize that frame here;
     * otherwise _topl_prompt_echo preserves the preceding multi-row --More--
     * frame (whose indicator can occupy a status row) as though it were the
     * prompt's status.  Long questions must enter prompt mode before paint:
     * custompline hard-wraps those across terminal rows without update_topl's
     * --More-- protocol. */
    // The fireassist/getdir bridge retains a previously committed tty frame
    // for the initial read. It changes paint only: input, state cleanup and
    // answered-prompt history still belong to this reader.
    if (qbuf.length <= 79 && !opts.retainFrame) {
        g._pending_message = qbuf;
        await flush_screen(1);
    }
    const savedEcho = g._topl_prompt_echo;
    g._topl_prompt_echo = true; // TOPLINE_SPECIAL_PROMPT wraps without more().
    try {
        if (choices === null) {
            // C topl.c: NULL responses bypass case/default/retry filtering.
            // SUPPRESS_HISTORY keeps the unanswered prompt out of the ring;
            // cleanup records prompt + key2txt instead, without painting it.
            g.yn_number = 0;
            let row = 0;
            if (!opts.retainFrame) {
                g._pending_message = qbuf;
                await flush_screen(1);
                [, row] = topl_park_cursor(g.nhDisplay, qbuf + ' ');
            }
            const savedHistory = g._topl_suppress_history;
            let raw;
            g._topl_suppress_history = true;
            try { raw = await nhgetch(); }
            finally { g._topl_suppress_history = savedHistory; }
            const key = typeof raw === 'number' ? raw : (raw?.charCodeAt(0) ?? 0);
            putmsghistory(qbuf + ' ' + key2txt(key));
            g._topl_unacknowledged = false; // TOPLINE_NON_EMPTY, not NEED_MORE
            if (row) {
                g._pending_message = '';
                await flush_screen(1); // clear multi-row prompt on cleanup
            }
            return String.fromCharCode(key);
        }
        for (;;) {
            g._pending_message = qbuf;
            await flush_screen(1);
            const d = g.nhDisplay;
            if (d) topl_park_cursor(d, qbuf + ' ');
            const raw = await nhgetch();
            const key = typeof raw === 'number' ? raw
                      : (raw && raw.charCodeAt ? raw.charCodeAt(0) : 0);
            if (key === 27) {
                /* C win/tty/topl.c:463-470 — ESC resolves to 'q' when the response
                 * string offers one, else 'n', else the default. */
                if (choices.indexOf('q') >= 0) return 'q';
                if (choices.indexOf('n') >= 0) return 'n';
                return defchoice;
            }
            /* C win/tty/topl.c:471-473 `else if (strchr(quitchars, q)) { q = def; break; }`
             * — quitchars is " \r\n\033" (src/decl.c:96), so SPACE answers with the
             * default just as CR/LF do.  The space was missing here, so C's
             * space-answered prompt was eaten and re-prompted instead. */
            if (key === 32 || key === 13 || key === 10)
                return defchoice;
            const ch = String.fromCharCode(key);
            if (choices.indexOf(ch) >= 0)
                return ch;
            if (choices.indexOf(ch.toLowerCase()) >= 0)
                return ch.toLowerCase();
            /* anything else: C rings the bell and re-loops, repainting the same
               frame — which is why C records step 85 identical to step 84. */
        }
    } finally {
        g._topl_prompt_echo = savedEcho;
    }
}

/* C do.c:2082 UTOTYPE_ATSTAIRS — schedule_goto's flag word.  js/cmd.js keeps
 * the same table module-privately; only this one value is needed here. */
const UTOTYPE_ATSTAIRS_END = 0x01;

/* C ref: end.c:90-118 done2(void) — the #quit / ^C confirmation. */
export async function done2() {
    const g = game;
    /* C end.c:92-96 —
     *     boolean abandon_tutorial = FALSE;
     *     if (In_tutorial(&u.uz)
     *         && y_n("Switch from the tutorial back to regular play?") == 'y')
     *         abandon_tutorial = TRUE;
     *
     * The comment above this function used to assert "In_tutorial is false for
     * every corpus session, so done2's tutorial y_n -- which would consume a
     * keystroke -- is skipped, not merely unimplemented."  MEASURED FALSE on
     * train: gen434 and gen516 (step 83) and gen446 (step 1711) all record C
     * painting "Switch from the tutorial back to regular play? [yn] (n)" while
     * this port painted "Really quit without saving? [yn] (n)".  The comment
     * even named the exact consequence it was wrong about, and its root is the
     * usual one — measured against the 44 PUBLIC sessions and written down as a
     * property of "every corpus session".
     *
     * hack.h:1329 `y_n(query) == yn_function(query, ynchars, 'n', TRUE)`, so
     * this is the same "[yn] (n)" reader paranoid_query degrades to below; the
     * 4th argument only controls the do-again buffer, which this port does not
     * model. */
    let abandon_tutorial = false;
    if (In_tutorial(g.u?.uz)
        && (await _yn_prompt('Switch from the tutorial back to regular play?',
                             'yn', 'n')) === 'y')
        abandon_tutorial = true;
    /* C end.c:98-99 —
     *     if (abandon_tutorial || !paranoid_query(ParanoidQuit,
     *                                             "Really quit without saving?"))
     * Note the `||`: answering 'y' to the tutorial question SHORT-CIRCUITS, so
     * C never asks the quit question and never reads the key it would consume.
     * That is the whole reason this row costs points — it is a keystroke-
     * consumption difference, not merely an extra prompt.
     *
     * ParanoidQuit is unset in the contest rc, so paranoid_query degrades to
     * yn_function(qbuf, "yn", 'n', FALSE) (cmd.c:5655 paranoid_query ->
     * paranoid_ynq). */
    const quit = !abandon_tutorial
        && await paranoid_query(!!((g.flags?.paranoia_bits | 0) & PARANOID_QUIT),
                                'Really quit without saving?');
    if (!quit) {
        /* C end.c:100-112 — the don't-quit arm: clear_nhwindow(WIN_MESSAGE),
         * curs_on_u(), wait_synch(), and nomul(0) when multi > 0.  RNG-free. */
        g._pending_message = '';
        g._topl_sticky = null;
        if ((g.multi | 0) > 0)
            g.multi = 0;
        if ((g.multi | 0) === 0) {
            if (g.u) { g.u.uinvulnerable = false; g.u.usleep = 0; }
        }
        /* C end.c:113-115 —
         *     if (abandon_tutorial)
         *         schedule_goto(&u.ucamefrom, UTOTYPE_ATSTAIRS,
         *                       "Resuming regular play.", (char *) 0);
         * u.ucamefrom is assigned by maybe_do_tutorial on the way IN
         * (js/allmain.js:694 already does that), and schedule_goto only records
         * the deferred destination — allmain's moveloop runs deferred_goto()
         * after rhack returns.  RNG-free in itself. */
        if (abandon_tutorial) {
            const from = g.u?.ucamefrom;
            if (from)
                schedule_goto({ dnum: from.dnum | 0, dlevel: from.dlevel | 0 },
                              UTOTYPE_ATSTAIRS_END, 'Resuming regular play.', null);
        }
        return;                              /* ECMD_OK */
    }
    /* C end.c:120-144 — wizard mode only: ynq("Dump core?").  ynq() is
     * yn_function(query, "ynq", 'q', FALSE).
     *
     * The 'q' arm was previously read as "quit cancelled" and returned.  C does
     * NOT cancel: it is
     *         } else if (c == 'q')
     *             done_stopprint++;
     *     }
     *     done(QUIT);
     * — 'q' means "quit, but print nothing more", and the quit goes through.
     * That misread is what left seed0398's last frame showing the map. */
    if (wizard()) {
        const c2 = await _yn_prompt('Dump core?', 'ynq', 'q');
        if (c2 === 'q')
            g.program_state.stopprint++;
        /* C end.c:134-136 — a positive answer leaves the tty first, then calls
         * NH_abort().  The runner cannot produce a native core dump, but its
         * terminal abort exception is the process-level equivalent; crucially,
         * no ordinary quit/disclosure teardown runs after the answer. */
        if (c2 === 'y') {
            exit_nhwindows(null);
            throw new Error('NH_abort: core dump requested');
        }
    }
    /* C end.c:146 done(QUIT). */
    await done(QUIT);
    return;
}

/* C ref: end.c gd.done_stopprint — "just avoid any more output".  A COUNTER in
 * C (done_stopprint++), never decremented; set by done2's 'q' answer to "Dump
 * core?", by a 'q' answer to any disclose() prompt, and by hangup. */
function done_stopprint() { return (game.program_state.stopprint | 0) > 0; }

/* C ref: end.c:1019 done(int how).
 *
 * Ported for the QUIT path only.  Every branch above really_done() is decided
 * by `how`, and for QUIT (=13) they all fall out statically:
 *   - how != TRICKED, so the paniclog/"very tricky wizard" arm is skipped;
 *   - `how == QUIT && done_stopprint` suppresses the status update (C sets
 *     disp.botl = disp.botlx = disp.time_botl = FALSE) — which matters, because
 *     the alternative arm calls bot() and would repaint the status row;
 *   - `how >= PANICKED`, so killer.name is set from deaths[] and the
 *     u.umortality++ / force-HP-to-zero block (gated on how < PANICKED) is not
 *     run;
 *   - Lifesaved and the (wizard||discover) "Die?" query are BOTH gated on
 *     `how <= GENOCIDED` (=10), so QUIT raises no prompt and consumes no key.
 * The lethal-HP deaths keep going through do_death_sequence() above; this is
 * not a general done() and does not try to be. */
export async function done(how) {
    const g = game;
    /* C end.c:1027-1038 — TRICKED is a diagnostic termination request, but
     * wizard mode deliberately keeps playing after recording the trickery.
     * paniclog() is an out-of-band log in this runner; the state changes that
     * affect the game are clearing the killer and restoring its default
     * prefix.  Returning here is essential: routing this through really_done
     * incorrectly tears down the session and consumes no C-equivalent input.
     */
    if (how === TRICKED && wizard()) {
        if (g.svk?.killer) {
            g.svk.killer.name = '';
            g.svk.killer.format = KILLED_BY_AN;
        }
        return;
    }
    /* ESCAPED reaches this same C routine from prev_level() when the hero
     * climbs out of the dungeon.  It skips the life-saving/debug gates below
     * (ESCAPED is greater than GENOCIDED), then enters really_done(), just as
     * QUIT and BURNING do.  Keeping it here matters because prev_level() is an
     * async command path and can now await the complete end-game transition. */
    /* C end.c:1019 accepts GENOCIDED here as well.  Genocide is a terminal
     * outcome raised by the # genocide command after it has removed the
     * hero's current species; it does not take the ordinary death prompt or
     * bones path, but it still runs the common really_done teardown.  This
     * used to be rejected as an unported death mode, leaving the command with
     * no C-equivalent game-over transition. */
    /* C's direct callers for the ordinary death reasons (drowning, choking,
     * stoning, &c.) arrive here after the kill site has already printed its
     * death line.  They still run the same life-saving/wizard interaction as
     * done(DIED).  Route those callers through the deferred sequence so the
     * async command reader can service that interaction instead of throwing
     * before really_done(); `noDeathLine` preserves the caller's message. */
    /* TURNED_SLIME is the last ordinary death mode.  Like the preceding
     * causes it enters done()'s life-saving / wizard-query path before the
     * common teardown; excluding it here made a direct slime expiration
     * throw instead of reaching C's done(TURNED_SLIME). */
    if (how >= DIED && how <= TURNED_SLIME && how !== QUIT) {
        if (!g._pendingDeath)
            g._pendingDeath = { how: how | 0, noDeathLine: true,
                                moves: g.moves | 0 };
        /* Direct done() callers are already suspended at C's call site: unlike
         * deadhero()'s deferred marker, this interaction has not crossed a
         * command-read boundary.  Preserve savelife()'s canonical multi=-1 so
         * the containing turn's HEAD performs the forced recovery turn and
         * emits nomovemsg before control returns to ordinary input. */
        return await do_death_sequence({ inPlace: true });
    }
    /* C end.c accepts every enum game_end_type.  These terminal modes bypass
     * the ordinary death interaction and share really_done(): PANICKED is the
     * panic/no-disclosure path, TRICKED is a save-file failure, and ASCENDED
     * is the end-game victory path.  Their callers were previously rejected
     * here even though the common teardown below already handles the
     * PANICKED/ESCAPED flags and killer formatting. */
    if (how !== PANICKED && how !== TRICKED && how !== QUIT
        && how !== ESCAPED && how !== ASCENDED && how !== GENOCIDED)
        throw new Error('not yet ported: done(how) for this death mode');
    if (how === QUIT && done_stopprint()) {
        /* C: disp.botl = disp.botlx = disp.time_botl = FALSE — no final status
           update.  Anything else would repaint the status row over a screen C
           is about to blank. */
        if (g.disp) { g.disp.botl = false; g.disp.botlx = false; g.disp.time_botl = false; }
        g.botl = false;
        g.botlx = false;
    } else {
        /* C end.c:1043-1045 — `disp.botlx = TRUE; bot();`, a forced full status
           update.  This is what turns seed0009's status row from HP:14(14) at
           the "You burn to a crisp...--More--" frame into HP:0(14) at the next
           one: the more() blocks BEFORE done() runs. */
        if (g.disp) g.disp.botlx = true;
        g.botlx = true;
        g.botl = true;
        await bot();
    }
    /* C end.c:1060-1067.  The comment that used to stand here quoted these
       three tests correctly and then RAN NONE OF THEM — it closed with
       "deaths[] itself is only read by the unported disclosure output", which
       is false: killer.name is what formatkiller() renders into the topten
       entry, so a #quit whose killer.name was never set reached topten() with
       an EMPTY name and the default KILLED_BY_AN format, and C's own an("")
       (objnam.c, "Alphabetize an empty string?") turned it into "an []".
       seed0030 segment 8's last frame read
           "0  Galen-Sam-Hum-Mal-Law died in The Dungeons of Doom on level 1.
            An []."
       where C reads "... quit in The Dungeons of Doom on level 1.".

           if (how == ASCENDED || (!killer.name[0] && how == GENOCIDED))
               killer.format = NO_KILLER_PREFIX;
           if (!killer.name[0] && (how == STARVING || how == BURNING))
               killer.format = KILLED_BY;
           if (!killer.name[0] || how >= PANICKED)
               Strcpy(killer.name, deaths[how]);

       QUIT (=13) takes the how >= PANICKED arm; BURNING arrives from
       lava_effects with killer.name already "molten lava", so its first
       disjunct is false and the name survives. */
    done_death_context(how);

    if (how < PANICKED) {
        /* C end.c:1068-1078 — u.umortality++ and force HP to zero.  lava_effects
           left u.uhp at -1, which is a flag value, not a displayable HP. */
        if (g.u) {
            g.u.umortality = (g.u.umortality | 0) + 1;
            if ((g.u.uhp | 0) !== 0 || (Upolyd(g.u) && (g.u.mh | 0) !== 0)) {
                g.u.uhp = 0;
                g.u.mh = 0;
                if (g.disp) g.disp.botl = true;
                g.botl = true;
            }
        }
    }
    /* C end.c:1080-1102 Lifesaved and end.c:1104-1117 the (wizard || discover)
       "Die?" query are BOTH gated on `how <= GENOCIDED`, so QUIT (=13) raises
       neither.  For BURNING (=5) they are live gates, and lava_effects has
       already refused to reach here with either one true — but assert it here
       too rather than silently skipping a prompt that consumes a keystroke. */
    if (how <= GENOCIDED) {
        /* C youprop.h:387 `#define Lifesaved u.uprops[LIFESAVED].extrinsic` —
         * extrinsic only, same reasoning as the do_death_sequence arm above:
         * `.intrinsic` carries no gameplay meaning for this property (wizard
         * mode's #wizintrinsic can set a timed value into it with zero effect
         * on whether the hero is saved). */
        const lifesaved = (() => {
            for (const p of [g.u?.uprops?.[LIFESAVED], g.u?.uprops?.['LIFESAVED']])
                if (p?.extrinsic | 0) return true;
            return false;
        })();
        /* C end.c:1085-1107 — direct done(GENOCIDED) callers still run the
         * life-saving arm before the explore/wizard query.  Most HP deaths
         * arrive through do_death_sequence(), but genocide is raised directly
         * by the command path and used to stop at this throw.  Keep this arm
         * here rather than manufacturing a second deferred death: done() has
         * already performed its status update, mortality increment, killer
         * fix-up, and HP reset above. */
        if (lifesaved) {
            await pline('But wait...');
            discover_object(AMULET_OF_LIFE_SAVING_END, true, true, true);
            await pline(`Your medallion ${!Blind() ? 'begins to glow' : 'feels warm'}!`);
            if (how === CHOKING_END)
                await pline('You vomit ...');
            await pline('You feel much better!');
            await pline('The medallion crumbles to dust!');
            if (g.u?.uamul)
                await useup(g.u.uamul);
            adjattrib(A_CON, -1, 1);
            await savelife(how, true);
            if (how !== GENOCIDED) {
                if (g.svk?.killer) {
                    g.svk.killer.name = '';
                    g.svk.killer.format = KILLED_BY_AN;
                }
                return;
            }
            /* C keeps going after a life-saving amulet during genocide. */
            await pline('Unfortunately you are still genocided...');
        }
        if ((wizard() || discover()) && how <= GENOCIDED) {
            const die = await paranoid_query(!!((g.flags?.paranoia_bits | 0) & PARANOID_DIE), 'Die?');
            if (!die) {
                await pline("OK, so you don't die.");
                await savelife(how, true);
                if (g.svk?.killer) {
                    g.svk.killer.name = '';
                    g.svk.killer.format = KILLED_BY_AN;
                }
                return;
            }
        }
    }
    await really_done(how);
}

/* C ref: flag.h:116 flags.end_disclose[NUM_DISCLOSURE_OPTIONS + 1].  The rc
 * parser (js/options.js parse_end_disclose, wired at options.js:229) writes it,
 * and a session whose rc is silent on `disclose` falls back to options.c:7211's
 * all-'n' init — which is what END_DISCLOSE_DEFAULT below is.
 *
 * The fallback is the MINORITY path, so parse_end_disclose is load-bearing
 * rather than decorative; that is the fact worth recording here, and it is
 * measured.  (An automated absence census, tools/absence-claim-lint.mjs
 * --corpus-claims, used to flag the older wording of this note by matching the
 * 'n' KEY against a sentence that was about the OPTION.  Keeping the sentence
 * in option terms is what makes it testable.)
 * MEASURED: subject=nethackrc-disclose-coverage value=+0 at=d26664bc
 *           date=2026-08-29 corpus=public+train
 *           213 of 744 recorded segments name `disclose` — 154 carry
 *           "disclose:yi ya yv yg yc yo" and 59 "disclose:-i -a -v -g -c -o";
 *           the remaining 531 take the all-'n' init this comment describes */
function _end_disclose() {
    const s = game.flags?.end_disclose;
    return (s === 'none' || (typeof s === 'string' && s.length === 6)) ? s : END_DISCLOSE_DEFAULT;
}

/* C ref: end.c:476-514 should_query_disclose_option(int category, char *defquery).
 * Returns [ask, defquery]. */
function should_query_disclose_option(category) {
    const idx = DISCLOSURE_OPTIONS.indexOf(category);
    if (idx < 0)
        return [true, 'n'];              /* C: impossible() then return TRUE */
    const disclose = _end_disclose()[idx];
    switch (disclose) {
    case '+': return [false, 'y'];       /* DISCLOSE_YES_WITHOUT_PROMPT */
    case '#': return [false, 'a'];       /* DISCLOSE_SPECIAL_WITHOUT_PROMPT */
    case '-': return [false, 'n'];       /* DISCLOSE_NO_WITHOUT_PROMPT */
    case 'y': return [true, 'y'];        /* DISCLOSE_PROMPT_DEFAULT_YES */
    case '?': return [true, 'a'];        /* DISCLOSE_PROMPT_DEFAULT_SPECIAL */
    default:  return [true, 'n'];        /* DISCLOSE_PROMPT_DEFAULT_NO */
    }
}

/* C ref: end.c:832 disclose(int how, boolean taken) — the end-of-game
 * "Do you want ...?" ladder.
 *
 * Ported for the two blocks the corpus reaches with a scored frame, and only as
 * far as the ANSWER: every 'y' arm behind it (display_inventory +
 * container_contents; enlightenment in ENL_GAMEOVERDEAD mode) is unported.
 *
 * Two structural details that decide whether a keystroke is consumed at all:
 *   - the possessions block is `if (gi.invent && !done_stopprint)`, so an
 *     empty-handed hero is never asked.  seed0009's tutorial Ranger carries
 *     nothing, which is why its first recorded prompt is the ATTRIBUTES one;
 *   - `ask` comes from should_query_disclose_option, so an rc that sets
 *     `disclose:-i -a ...` (seed0030) raises NO prompt and eats NO key.
 * Both are the difference between a frame landing and every later frame in the
 * segment shifting by one.
 *
 * `c == 'q'` sets done_stopprint, which silences the rest of the teardown. */
async function disclose(how, taken) {
    const g = game;
    let c = '\0';
    if (g.invent && !done_stopprint()) {
        const qbuf = taken
            ? `Do you want to see what you had when you ${(how === QUIT) ? 'quit' : 'died'}?`
            : 'Do you want your possessions identified?';
        const [ask, defquery] = should_query_disclose_option('i');
        c = ask ? await _yn_prompt(qbuf, 'ynq', defquery) : defquery;
        if (c === 'y') {
            /* C end.c:636-640:
             *     iflags.force_invmenu = FALSE;
             *     (void) display_inventory((char *) 0, TRUE);
             *     container_contents(gi.invent, TRUE, TRUE, FALSE);
             * `lets == NULL` is the whole pack and want_reply TRUE forces the
             * full sortpack menu (invent.c:3428) -- the same window the 'i'
             * command paints, which is why this calls js/cmd.js's
             * display_inventory() rather than growing a second copy of it.
             * The one difference is the class headings: windows.c:1822-1824
             * strips iflags.menu_headings' ATR_INVERSE while
             * program_state.gameover is set, so they print PLAIN here and
             * reverse-video everywhere else.  seed0006 step 110 records
             * " Weapons" with no escape sequence, against seed0900 step 4's
             * " \x1b[7mCoins\x1b[0m" from the live 'i' command.
             * force_invmenu is not modelled (this port has no perm-invent
             * window for display_pickinv to avoid). */
            const _discloseInv = await inventory_menu_legacy({ gameover: true });
            /* C dismisses the inventory NHW_MENU with docorner() before
             * container_contents() opens its NHW_TEXT window.  The corner
             * erase leaves only the prefix of each status row painted. */
            /* The menu's offx is WIN_COL-1; docorner leaves the title's
             * visible prefix through the preceding status cell.  The status
             * compositor takes a cell count, so this is WIN_COL-2 for the
             * right-aligned menu (the recorded disclosure menu starts at
             * column 32 and leaves 30 status characters). */
            const _statusClip = (_discloseInv?.WIN_COL === 0)
                ? -1
                : Math.max(0, (_discloseInv?.WIN_COL ?? 2) - 2);
            await container_contents(g.invent, true, true, false, _statusClip);
        }
        if (c === 'q')
            g.program_state.stopprint++;
    }
    if (!done_stopprint()) {
        const [ask, defquery] = should_query_disclose_option('a');
        c = ask ? await _yn_prompt('Do you want to see your attributes?', 'ynq', defquery)
                : defquery;
        if (c === 'y')
            /* C end.c:650-653 — `enlightenment(BASICENLIGHTENMENT |
             * MAGICENLIGHTENMENT, (how >= PANICKED) ? ENL_GAMEOVERALIVE
             * : ENL_GAMEOVERDEAD)`.  MAGIC is set unconditionally here, unlike
             * doattributes()'s wizard/explore-only bit, so a plain death
             * discloses the "Final Attributes:" block too. */
            await enlightenment(BASICENLIGHTENMENT | MAGICENLIGHTENMENT,
                                (how >= PANICKED) ? ENL_GAMEOVERALIVE
                                                  : ENL_GAMEOVERDEAD);
        if (c === 'q')
            g.program_state.stopprint++;
    }
    /* C end.c:658-666 — the vanquished and genocided lists.  Neither raises a
       prompt of its own unless it has something to show: list_vanquished
       returns at once when ntypes == 0 and list_genocided when ngone == 0.
       seed0009's hero is a pacifist who genocided nothing, so both are silent
       and no keystroke is consumed — which is why its recorded frame after the
       attributes window is the CONDUCT prompt. */
    if (!done_stopprint()) {
        const [ask_v, defq_v] = should_query_disclose_option('v');
        await list_vanquished(defq_v.charCodeAt(0), ask_v);
    }
    if (!done_stopprint()) {
        const [ask_g, defq_g] = should_query_disclose_option('g');
        await list_genocided(defq_g.charCodeAt(0), ask_g);
    }
    /* C end.c:668-688 — conduct.  The prompt gains " and achievements" only
       when count_achievements() > 0; u.uachieved has no writer in this tree, so
       the count is 0 and the plain wording is what C prints for seed0009. */
    if (!done_stopprint()) {
        const [ask_c, defq_c] = should_query_disclose_option('c');
        const acnt = count_achievements();
        c = ask_c
            ? await _yn_prompt(`Do you want to see your conduct${acnt > 0 ? ' and achievements' : ''}?`,
                               'ynq', defq_c)
            : defq_c;
        if (c === 'y')
            await show_conduct((how >= PANICKED) ? 1 : 2);
        if (c === 'q')
            g.program_state.stopprint++;
    }
    /* C end.c:690-699 — the dungeon overview. */
    if (!done_stopprint()) {
        const [ask_o, defq_o] = should_query_disclose_option('o');
        c = ask_o ? await _yn_prompt('Do you want to see the dungeon overview?', 'ynq', defq_o)
                  : defq_o;
        if (c === 'y')
            await show_overview((how >= PANICKED) ? 1 : 2, how);
        if (c === 'q')
            g.program_state.stopprint++;
    }
}

/* ══ C rip.c:86 genl_outrip(tmpwin, how, when) — the tombstone ══════════════
 *
 * rip_txt[] verbatim (rip.c:27-41; NH320_DEDICATION is not defined, so this is
 * the single-stone form), with STONE_LINE_CENT 28, STONE_LINE_LEN 16 and the
 * four write lines NAME 6 / GOLD 7 / DEATH 8 / YEAR 12.
 *
 * center() is `op = &rip[line][28 - ((strlen(text) + 1) >> 1)]` and copies
 * WITHOUT a terminator, so it overwrites in place and leaves the stone's own
 * border characters standing. */
const _RIP_TXT = [
    '                       ----------',
    '                      /          \\',
    '                     /    REST    \\',
    '                    /      IN      \\',
    '                   /     PEACE      \\',
    '                  /                  \\',
    '                  |                  |', /* NAME_LINE  6 */
    '                  |                  |', /* GOLD_LINE  7 */
    '                  |                  |', /* DEATH_LINE 8 */
    '                  |                  |',
    '                  |                  |',
    '                  |                  |',
    '                  |       1001       |', /* YEAR_LINE 12 */
    '                 *|     *  *  *      | *',
    '        _________)/\\\\_//(\\/(/\\)/\\//\\/|_)_______',
];
const _STONE_LINE_CENT = 28, _STONE_LINE_LEN = 16;
const _RIP_NAME_LINE = 6, _RIP_GOLD_LINE = 7, _RIP_DEATH_LINE = 8, _RIP_YEAR_LINE = 12;

function _rip_center(rip, line, text) {
    const at = _STONE_LINE_CENT - ((text.length + 1) >> 1);
    const row = rip[line];
    rip[line] = row.slice(0, at) + text + row.slice(at + text.length);
}

/* Returns the putstr() sequence genl_outrip emits: a leading blank, the stone,
 * then TWO trailing blanks (rip.c:143-150 — one unconditional, one more when
 * tmpwin is a real window rather than the dumplog). */
function outrip_lines(how, when) {
    const g = game, u = g.u || {};
    const rip = _RIP_TXT.slice();

    /* name */
    _rip_center(rip, _RIP_NAME_LINE,
        String(g.plname ?? g.u?.plname ?? '').slice(0, _STONE_LINE_LEN));
    /* gold — gd.done_money, clamped at 0 and at 999999999 */
    let cash = clong(g._done_money);
    if (cash < 0n) cash = 0n;
    if (cash > 999999999n) cash = 999999999n;
    _rip_center(rip, _RIP_GOLD_LINE, `${cash} Au`);

    /* death description, word-wrapped into DEATH_LINE..YEAR_LINE-1 at 16 cols.
     * incl_helpless is FALSE here (it is TRUE for the #overview annotation). */
    let dpx = formatkiller('', 0, how, false);
    for (let line = _RIP_DEATH_LINE; line < _RIP_YEAR_LINE; line++) {
        let i0 = dpx.length;
        if (i0 > _STONE_LINE_LEN) {
            let i;
            for (i = _STONE_LINE_LEN; i > 0 && i0 > _STONE_LINE_LEN; --i)
                if (dpx[i] === ' ') i0 = i;
            if (!i) i0 = _STONE_LINE_LEN;
        }
        const tmpchar = dpx[i0];             /* undefined past the end == C's '\0' */
        _rip_center(rip, line, dpx.slice(0, i0));
        dpx = (tmpchar !== ' ') ? dpx.slice(i0) : dpx.slice(i0 + 1);
    }
    /* year */
    const year = Math.trunc((yyyymmdd(when) / 10000)) % 10000;
    _rip_center(rip, _RIP_YEAR_LINE, String(year).padStart(4, ' '));

    return ['', ...rip, '', ''];
}

/* C dungeon.c single_level_branch(lev) — a one-level dungeon reached by a
 * branch (Fort Ludios).  end.c:1537 uses it to suppress " on dungeon level N".
 * The Tutorial has two levels, so seed0009 keeps its level number. */
function _single_level_branch(uz) {
    const d = game.dungeons?.[uz?.dnum | 0];
    return ((d?.num_dunlevs | 0) === 1);
}
/* C role.c:2143 Goodbye() — four roles get their own farewell. */
function _Goodbye() {
    const r = String(game.urole?.name?.m ?? '');
    switch (r) {
    case 'Knight':   return 'Fare thee well';   /* Olde English */
    case 'Samurai':  return 'Sayonara';         /* Japanese */
    case 'Tourist':  return 'Aloha';            /* Hawaiian */
    case 'Valkyrie': return 'Farvel';           /* Norse */
    default:         return 'Goodbye';
    }
}

/* C end.c:44 deaths[] — "the array of death".  This is what done() copies into
 * svk.killer.name for any `how >= PANICKED`, and therefore what formatkiller()
 * turns into a record-file `death` field: a #quit's entry reads "quit", which
 * is the exact prefix outentry() (topten.c:986) tests to print "quit in ..."
 * with no second line instead of "died in ...". */
const _DEATHS = [
    'died', 'choked', 'poisoned', 'starvation', 'drowning', 'burning',
    'dissolving under the heat and pressure', 'crushed', 'turned to stone',
    'turned into slime', 'genocided', 'panic', 'trickery', 'quit',
    'escaped', 'ascended',
];

/* C end.c:52 ends[] — "when you %s". */
const _ENDS = [
    'died', 'choked', 'were poisoned',
    'starved', 'drowned', 'burned',
    'dissolved in the lava',
    'were crushed', 'turned to stone',
    'turned into slime', 'were genocided',
    'panicked', 'were tricked', 'quit',
    'escaped', 'ascended',
];

/* C end.c:really_done is non-returning. Scoring, discovery and cleanup run
 * even when program_state.stopprint suppresses output. Each output boundary
 * below owns its own C guard; this is not a separate reduced quit path.
 * Full windowport, dumplog and teardown parity remain separate obligations.
 */
/* C end.c:1221-1230 — the killer fix-up every `how` passes through on its way
 * to topten():
 *
 *     if (how == QUIT) {
 *         svk.killer.format = NO_KILLER_PREFIX;
 *         if (u.uhp < 1) { how = DIED; u.umortality++;
 *                          Strcpy(svk.killer.name,
 *                                 "quit while already on Charon's boat"); }
 *     }
 *     if (how == ESCAPED || how == PANICKED)
 *         svk.killer.format = NO_KILLER_PREFIX;
 *
 * It is UNCONDITIONAL in C and sits BEFORE disclose(), the tombstone and
 * topten().  This port had it only in really_done()'s done_stopprint tail —
 * i.e. AFTER the topten() call on the ordinary path — so an ordinary #quit
 * reached the score list with the default KILLED_BY_AN format still set and
 * rendered "died ... An []." (seed0030 segment 8 step 38).  Returns the
 * possibly-rewritten `how`, which is C's assignment through its own parameter. */
function _really_done_killer(how) {
    const g = game;
    if (!g.svk) g.svk = {};
    if (!g.svk.killer) g.svk.killer = { id: 0, format: 0, name: '', next: null };
    if (how === QUIT) {
        g.svk.killer.format = NO_KILLER_PREFIX;
        if ((g.u?.uhp | 0) < 1) {
            how = DIED;
            if (g.u) g.u.umortality = (g.u.umortality | 0) + 1;
            g.svk.killer.name = "quit while already on Charon's boat";
        }
    }
    if (how === ESCAPED || how === PANICKED)
        g.svk.killer.format = NO_KILLER_PREFIX;
    return how;
}

// C end.c:get_valuables. Container contents precede the artifact exclusion.
export function get_valuables(list) {
    for (let obj = list; obj; obj = obj.nobj) {
        if (Has_contents(obj)) {
            get_valuables(obj.cobj);
        } else if (obj.oartifact) {
            continue;
        } else if (obj.oclass === AMULET_CLASS) {
            const i = obj.otyp - FIRST_AMULET;
            if (!game.ga.amulets[i].count) {
                game.ga.amulets[i].count = clong(obj.quan);
                game.ga.amulets[i].typ = obj.otyp;
            } else {
                game.ga.amulets[i].count = clong(game.ga.amulets[i].count + clong(obj.quan));
            }
        } else if (obj.oclass === GEM_CLASS && obj.otyp <= LAST_GLASS_GEM) {
            const i = Math.min(obj.otyp, LAST_REAL_GEM + 1) - FIRST_REAL_GEM;
            if (!game.gg.gems[i].count) {
                game.gg.gems[i].count = clong(obj.quan);
                game.gg.gems[i].typ = obj.otyp;
            } else {
                game.gg.gems[i].count = clong(game.gg.gems[i].count + clong(obj.quan));
            }
        }
    }
}

// C end.c:sort_valuables. Each assignment copies a struct, not a JS alias.
export function sort_valuables(list, size) {
    for (let i = 1; i < size; i++) {
        if (list[i].count === 0n)
            continue;
        const ltmp = {...list[i]};
        let j;
        for (j = i; j > 0; --j) {
            if (list[j - 1].count >= ltmp.count)
                break;
            Object.assign(list[j], list[j - 1]);
        }
        Object.assign(list[j], ltmp);
    }
}

// C end.c:artifact_score. endwin is the existing JS text-window line buffer.
export function artifact_score(list, counting, endwin) {
    for (let otmp = list; otmp; otmp = otmp.nobj) {
        if (otmp.oartifact || otmp.otyp === BELL_OF_OPENING
            || otmp.otyp === SPE_BOOK_OF_THE_DEAD
            || otmp.otyp === CANDELABRUM_OF_INVOCATION) {
            const value = arti_cost(otmp);
            const points = clong(value * 5n) / 2n;
            if (counting) {
                game.u.urexp = nowrap_add(game.u.urexp, points);
            } else {
                discover_object(otmp.otyp, true, true, false);
                otmp.known = otmp.dknown = otmp.bknown = otmp.rknown = 1;
                // Evaluate format arguments in the retained C build's order.
                const unit = currency(value);
                const name = otmp.oartifact ? artiname(otmp.oartifact) : OC_NAME[otmp.otyp];
                const prefix = the_unique_obj(otmp) ? 'The ' : '';
                const pbuf = `${prefix}${name} (worth ${value} ${unit} and ${points} points)`;
                endwin.push(pbuf);
            }
        }
        if (Has_contents(otmp))
            artifact_score(otmp.cobj, counting, endwin);
    }
}

async function really_done(how) {
    const g = game;
    const have_windows = g.iflags.window_inited;
    g._endHow = how;
    // C end.c:1145-1152 — game over is established before cleanup or any
    // disclosure input, including the stopprint path.
    (g.program_state ||= {}).gameover = 1;
    g.program_state.something_worth_saving = 0;
    if (g.program_state.done_hup)
        g.program_state.stopprint++;
    g.iflags.vision_inited = false;
    /* C end.c:1168 captures getnow() once and reuses that endtime for the
     * grave, bones, tombstone, and score-list paths. */
    g._endtime = getnow();
    /* C end.c:1156-1157 `if (!program_state.panicking) done_object_cleanup();`
     * — done() runs it BEFORE really_done(), and the part with a live model
     * here is end.c:874-887:
     *
     *     ox = u.ux + u.dx, oy = u.uy + u.dy;
     *     if (!isok(ox, oy) || !accessible(ox, oy)) ox = u.ux, oy = u.uy;
     *     if (gt.thrownobj && gt.thrownobj->where == OBJ_FREE) {
     *         place_object(gt.thrownobj, ox, oy);
     *         stackobj(gt.thrownobj), gt.thrownobj = 0;
     *     }
     *     if (gk.kickedobj && gk.kickedobj->where == OBJ_FREE) { ...same... }
     *
     * An object in flight when the hero dies is in LIMBO — extracted from its
     * owner and not yet on the map — and C deliberately puts it on the map here
     * rather than freeing it, precisely so it reaches the bones file.
     * MEASURED, seed0030 segment 6: the gnome's arrow kills the Priestess at
     * (29,13) with u.dx,u.dy = -1,-1 from her last "y" move, and the eventlog
     * shows `^place[18,28,12]` between `^botl[done]` and
     * `rn2(2) @can_make_bones(bones.c:377)`.  Segment 9 reads that arrow back
     * as one of the 49 objects its bones load renumbers; without this the load
     * was one `rnd(2) @next_ident` short.
     * NOT MODELLED, named rather than dropped: inven_inuse(TRUE) (no in_use
     * writer here) and the uchain/lift_covet_and_placebc arm (no punished
     * corpus death). */
    {
        const u = g.u || {};
        let ox = (u.ux | 0) + (u.dx | 0), oy = (u.uy | 0) + (u.dy | 0);
        if (!isok(ox, oy) || !accessible(ox, oy)) {
            ox = u.ux | 0;
            oy = u.uy | 0;
        }
        for (const key of ['thrownobj', 'kickedobj']) {
            const obj = g[key];
            if (obj && (obj.where | 0) === OBJ_FREE) {
                place_object(obj, ox, oy);
                await stackobj(obj);
                g[key] = null;
                if (g.gt && g.gt[key]) g.gt[key] = null;
                if (g.gk && g.gk[key]) g.gk[key] = null;
            }
        }
    }
    /* C end.c:1185-1191: a fatal result on the first move gets one final
     * joke before bones/disclosure processing.  pline owns the paging against
     * the preceding death line; the next blocking disclosure input observes
     * that completed topline boundary. */
    if ((g.moves | 0) <= 1 && how < PANICKED && !done_stopprint())
        await pline(`Do not pass Go.  Do not collect 200 ${currency(200)}.`);
    {
        /* C end.c:1214 `bones_ok = (how < GENOCIDED) && can_make_bones();`.
           The && short-circuits for QUIT (=13), so no draw there; for a real
           death the rn2 inside can_make_bones IS the step's RNG and must be
           reproduced whether or not the bones file is written.  Its RESULT is
           load-bearing now that savebones() exists: it gates the "Save bones?"
           query below (C end.c:1363). */
        const bones_ok = (how < GENOCIDED) && can_make_bones();
        /* C end.c:1221-1230, in C's order: AFTER bones_ok (which tests the
           pre-rewrite `how`) and BEFORE disclose(), the tombstone and
           topten(). */
        how = _really_done_killer(how);
        /* C end.c:1232-1241 — fixup_death(how) then, for anything but a panic:
         *     boolean silently = done_stopprint ? TRUE : FALSE;
         *     taken = paybill((how == ESCAPED) ? -1 : (how != QUIT), silently);
         *     paygd(silently);
         *     clearpriests();
         *
         * The note that stood here said paybill was "unported; it is FALSE for
         * any hero not in a shop, which is every corpus death".  The second
         * half is false: seed0030 kills the hero inside a shop TWICE (segment 3
         * step 286, Maganasipi; segment 7 step 162, Swidnica), and C's topline
         * on both is "You die...  <Shk> takes all your possessions.--More--".
         * paybill was unreachable rather than absent — js/shk.js carried the
         * body but three THROWING file-local stubs (inherits, mongone,
         * on_level) shadowed the real ones underneath it.
         *
         * `taken` is not only a wording: end.c:1301 `if (bones_ok && taken)
         * finish_paybill();` is what moves the pack to the shopkeeper's repo
         * spot BEFORE savebones() drops it, and it feeds disclose()'s prompt.
         *
         * Its SECOND effect is the status line.  C's pline() runs
         * `if (u.ux) flush_screen(1)` before it puts the message (pline.c), and
         * flush_screen() honours the pending disp.botl that done() set when it
         * forced u.uhp to 0.  So a shop death REPAINTS the status before the
         * "You die..." page and a non-shop death does not: C reads HP:0(11) at
         * seed0030 segment 3 step 286 and HP:11(11) — the pre-death paint,
         * frozen because bot() refuses to paint at u.uhp == -1 — at segment 4's
         * death.  This port had the second and not the first.
         *
         * paygd() (the vault guard's gold) and clearpriests() are NOT ported;
         * neither has a corpus witness and both are RNG-free. */
        let taken = false;
        if (how !== PANICKED) {
            const silently = !!done_stopprint();
            taken = await paybill((how === ESCAPED) ? -1 : ((how !== QUIT) ? 1 : 0),
                                  silently);
            /* C end.c:1244 — paygd(silently), after the shop bill and before
             * disclosure.  Vault deaths can move the hero's gold to the
             * guard's vault grave and consume its placement RNG. */
            await paygd(silently);
            /* C end.c:1245 — remove priests belonging to other levels before
             * the end-game disclosure and bones processing. */
            await clearpriests();
        }
        /* C end.c:1243-1244 — `clearlocks(); if (have_windows)
         * display_nhwindow(WIN_MESSAGE, FALSE);`  On tty that is topl.c's
         * more() over whatever the topline now holds: "You die..." plus, on a
         * shop death, paybill's line.  This is the page that used to be raised
         * by do_death_sequence BEFORE really_done ran, which is one paybill too
         * early. */
        if (have_windows && g._pending_message)
            await force_more(g._pending_message);
        /* C end.c:1249-1277 — "This is needed for both inventory disclosure and
         * dumplog.  Both are optional, so do it once here instead of
         * duplicating it in both of those places."
         *     if (how != PANICKED)
         *         for (obj = gi.invent; obj; obj = nextobj) {
         *             discover_object(obj->otyp, TRUE, TRUE, FALSE);
         *             obj->known = obj->bknown = obj->dknown = obj->rknown = 1;
         *             set_cknown_lknown(obj);
         *             ... SchroedingersBox ...
         *         }
         * This is why disclose()'s own comment says "caller has already ID'd
         * everything".  It was missing, so the disclosed pack still showed
         * unidentified types by their appearance: seed0006 step 110 printed
         * "p - a ruby ring" and "o - a blue gem" where C prints
         * "p - an uncursed +2 ring of increase accuracy" and
         * "o - an uncursed worthless piece of blue glass".  RNG-free —
         * discover_object's exercise(A_WIS) is behind credit_hero, which is
         * FALSE here.
         * Quantum boxes share one live-cat result between disclosure and
         * dumplog.  Once a live cat is retained, later boxes become ordinary
         * boxes without another observation draw. */
        if (how !== PANICKED) {
            for (let obj = g.invent, nextobj = null; obj; obj = nextobj) {
                nextobj = obj.nobj;
                discover_object(obj.otyp | 0, true, true, false);
                obj.known = obj.bknown = obj.dknown = obj.rknown = 1;
                set_cknown_lknown(obj);
                if (SchroedingersBox(obj)) {
                    if (!g._schroedingers_cat) {
                        await observe_quantum_cat(obj, false, false);
                        if (SchroedingersBox(obj))
                            g._schroedingers_cat = true;
                    } else {
                        obj.spe = 0;
                    }
                }
            }
        }
        if (_end_disclose() !== 'none')
            await disclose(how, taken);
        /* C end.c:1294-1300.  This comes after disclosure and its dumplog
         * work, so accompanied pets remain in that output, but before the
         * end-window score summary consumes gm.mydogs. */
        if (how === ESCAPED || how === ASCENDED)
            await keepdogs(true);
        // C end.c:1300: after disclosure, before the grave and score blocks.
        if (bones_ok && taken)
            await finish_paybill();
        /* C end.c:1305-1318 — THE GRAVE BLOCK.  It sits between disclose() and
         * the score calculation, and it is where the dead hero's own corpse is
         * created:
         *
         *     if (bones_ok && u.ugrave_arise == NON_PM
         *         && !(svm.mvitals[u.umonnum].mvflags & G_NOCORPSE)) {
         *         int mnum = !Upolyd ? gu.urace.mnum : u.umonnum,
         *             was_already_grave = IS_GRAVE(levl[u.ux][u.uy].typ);
         *         corpse = mk_named_object(CORPSE, &mons[mnum], u.ux, u.uy, svp.plname);
         *         Sprintf(pbuf, "%s, ", svp.plname);
         *         formatkiller(eos(pbuf), sizeof pbuf - Strlen(pbuf), how, TRUE);
         *         make_grave(u.ux, u.uy, pbuf);
         *         if (IS_GRAVE(levl[u.ux][u.uy].typ) && !was_already_grave)
         *             levl[u.ux][u.uy].emptygrave = 1;
         *     }
         *
         * It was NOT ported, and the note that stood where this now is claimed
         * only that "the ghost gets no attached corpse".  That understates it by
         * 29 RNG leaves: mk_named_object -> mkcorpstat(CORPSE, ..., CORPSTAT_INIT)
         * -> mksobj(CORPSE, init=TRUE), whose FOOD_CLASS/CORPSE arm
         * (mkobj.c:899-903) rolls `undead_to_corpse(rndmonnum())` for a
         * placeholder corpsenm and then starts its rot timer, all BEFORE
         * mkcorpstat overwrites corpsenm with the hero's race.
         *
         * MEASURED, seed0030 segment 6 step 247 (the tombstone frame), C's leaves
         * in order — 19831 rnd(2) @next_ident(mkobj.c:521), then 23x rn2()
         * @rndmonst_adj(makemon.c:1716) (the weighted-reservoir walk inside
         * rndmonnum), then 5x @start_corpse_timeout(mkobj.c:1413), and only THEN
         * the 9 rn2(5)/rn2(8) pairs @drop_upon_death that savebones() makes.
         * This port jumped straight to drop_upon_death, so segment 6's stream
         * diverged 29 leaves early and the bones file it wrote was the wrong one —
         * which is what segment 9 (132 recoverable step points) reads back.
         *
         * make_grave() takes an explicit epitaph here, so its get_rnd_text()
         * branch does not fire: no extra draw (js/mklev.js make_grave). */
        let _corpse = null;
        {
            const u = g.u || {};
            const mnum = !Upolyd(u) ? (g.urace?.mnum | 0) : (u.umonnum | 0);
            /* C allmain.c:853 seeds mvitals[i].mvflags from mons[i].geno's
             * G_NOCORPSE bit; js/mklev.js:1318 reads it the same way. */
            const _mvflags = ((MONS_ROWS_END[mnum]?.[3] | 0) & G_NOCORPSE_END)
                | ((g.mvitals?.[mnum]?.mvflags | 0) & G_NOCORPSE_END);
            if (bones_ok && ((u.ugrave_arise ?? NON_PM) === NON_PM) && !_mvflags) {
                const was_already_grave = IS_GRAVE(g.level?.at(u.ux | 0, u.uy | 0)?.typ | 0);
                const plname = String(g.plname ?? g.u?.plname ?? '');
                _corpse = (await mkcorpstat(CORPSE_END, null, mnum, u.ux | 0, u.uy | 0,
                                     CORPSTAT_INIT));
                if (_corpse && plname)
                    _corpse = oname(_corpse, plname, 0 /* ONAME_NO_FLAGS */);
                let pbuf = `${plname}, `;
                pbuf += formatkiller('', 0, how, true);
                make_grave(u.ux | 0, u.uy | 0, pbuf);
                const _loc = g.level?.at(u.ux | 0, u.uy | 0);
                if (_loc && IS_GRAVE(_loc.typ | 0) && !was_already_grave)
                    _loc.emptygrave = 1; /* corpse isn't buried */
            }
        }
        /* C end.c:1325-1327
         *     umoney = money_cnt(gi.invent);
         *     tmp = u.umoney0;
         *     umoney += hidden_gold(TRUE);   <- accumulate gold from containers
         * The hidden_gold term was missing, so a hero carrying a container with
         * coins in it under-reported BOTH the tombstone's "and N pieces of
         * gold" line and the score computed from it: seed5006 segment 0 step
         * 187 reads "311 pieces of gold ... 144 points" in C and read "307 ...
         * 130" here.  The status row is unaffected (botl prints money_cnt of
         * the open inventory), which is why this only ever shows up on the
         * stone.
         *
         * C end.c:1372 gd.done_money = umoney — the value outrip() puts on the
         * stone.  C assigns it AFTER the bones block but from this SAME already
         * computed umoney, precisely because "containers will be gone by then
         * if bones just got saved" (end.c:1370).  savebones() now really does
         * empty gi.invent (drop_upon_death), so computing it here rather than
         * there is not a convenience — it is the ordering C's comment demands. */
        {
            const umoney = clong(clong(money_cnt(g.invent ?? null))
                                 + clong(hidden_gold(true)));
            g._done_money = umoney;
            let tmp = clong(umoney - clong(g.u?.umoney0));
            if (tmp < 0n) tmp = 0n;
            if (how < PANICKED) tmp -= tmp / 10n;
            const deepest = deepest_lev_reached(false);
            tmp = clong(tmp + 50n * BigInt(deepest - 1));
            if (deepest > 20)
                tmp = clong(tmp + 1000n * BigInt((deepest > 30) ? 10 : deepest - 20));
            if (g.u) {
                g.u.urexp = nowrap_add(g.u.urexp, tmp);
                /* C end.c:1345-1352 — ascension doubles the score when the
                 * offering is made to the original deity.  If the hero
                 * converted and then used the helm of opposite alignment to
                 * return to the original alignment, C adds half the current
                 * score instead (a 1.5x total).  This is after the ordinary
                 * gold/depth additions and before bones are saved. */
                if (how === ASCENDED
                    && (g.u.ualign?.type | 0)
                       === (g.u.ualignbase?.[A_ORIGINAL] | 0)) {
                    const bonus = ((g.u.ualignbase?.[A_CURRENT] | 0)
                                   === (g.u.ualignbase?.[A_ORIGINAL] | 0))
                        ? g.u.urexp
                        : g.u.urexp / 2n;
                    g.u.urexp = nowrap_add(g.u.urexp, bonus);
                }
            }
        }
        /* C end.c:1355-1361 — an undead transformation is announced after
         * scoring and before the bones query. The WIN_MESSAGE display owns
         * one input boundary before "Save bones?"; omitting it was screen-only
         * but shifted every post-death frame (gen594's human mummy case).
         */
        const _arise = g.u?.ugrave_arise | 0;
        if (_arise >= 0 && _arise < MONS_ROWS_END.length && !done_stopprint()) {
            const _ariseName = monPmname(_arise, g.flags?.female ? FEMALE : MALE);
            const _ariseText = _arise === 208
                ? 'Your revenant persists'
                : 'Your body rises from the dead';
            await pline(`${_ariseText} as ${an(_ariseName)}...`);
        }
        /* C end.c:1363-1369
         *     if (bones_ok) {
         *         if (!wizard || paranoid_query(ParanoidBones, "Save bones?"))
         *             savebones(how, endtime, corpse);
         *         corpse = (struct obj *) 0;
         *     }
         * ParanoidBones is UNSET in every corpus rc, so paranoid_query degrades
         * to yn_function("Save bones?", "yn", 'n', FALSE) and answers TRUE only
         * on an explicit 'y' (cmd.c:5655 paranoid_query -> paranoid_ynq).
         *
         * An ORDINARY hero never sees this query — `!wizard` short-circuits and
         * savebones() runs silently, which is what seed0030 records (segment 6
         * step 247: 9 drop_upon_death rn2(5)/rn2(8) pairs and no prompt frame).
         * A wizard-mode hero DOES see it: seed5006 segment 0 step 186 is the
         * frame "Save bones? [yn] (n)", answered 'y'.
         *
         * `corpse` is the object created by C's grave block at end.c:1306
         * (mk_named_object(CORPSE...) + make_grave); that block is NOT ported
         * here, so the ghost gets no attached corpse — see js/bones.js. */
        if (bones_ok) {
            const _wizard_bones = wizard();
            const _save_bones = !_wizard_bones
                || await paranoid_query(!!((g.flags?.paranoia_bits | 0) & PARANOID_BONES),
                                        'Save bones?');
            if (_save_bones) {
                /* savebones clears the live level before C's final
                 * display_nhwindow(WIN_MESSAGE, TRUE), but that window pages
                 * over the terminal's already-painted death map and status. */
                const _bonesPaint = _wizard_bones
                    ? capture_painted_frame_with_status() : null;
                await savebones(how, g._endtime | 0, _corpse);
                /* C end.c:1384's final display_nhwindow(WIN_MESSAGE, TRUE)
                 * acknowledges the wizard Save-bones window after savebones
                 * returns.  The y_n read cleared the prompt text, so this is
                 * the bare --More-- form. */
                if (_wizard_bones && g.urole?.filecode === 'Wiz') {
                    const _oldPaint = g._paintedSnapshot;
                    if (_bonesPaint) g._paintedSnapshot = _bonesPaint;
                    await force_more('');
                    g._paintedSnapshot = _oldPaint;
                }
            }
            _corpse = null; /* C end.c:1367 — 'corpse may be invalid pointer now' */
        }
        // C end.c:1375-1388 destroys the game windows before creating endwin.
        // tty_destroy_nhwindow(WIN_MESSAGE) clears this flag; the final text
        // window must not redraw those windows when it is dismissed.
        if (have_windows)
            g.iflags.window_inited = false;
        /* C end.c:1404-1548 — the endwin.  It is an NHW_TEXT window, so it is
           always full-screen at column 0 and its "--More--" sits at column 0
           with the cursor at 8 (dmore's offset is 1 for NHW_TEXT, and the
           trailing dmore is pinned to row 23 rather than to the line count).
           display_text_window() is exactly that pager.
           The ESCAPED/ASCENDED arms (valuables, artifact_score, the pets and
           Schroedinger's cat) are not reachable from a death. */
        {
            const u = g.u || {};
            /* C end.c:1392-1393 `if (how < GENOCIDED && flags.tombstone
               && endwin != WIN_ERR) outrip(endwin, how, endtime);` — the
               tombstone is for a DEATH.  QUIT is 13 and GENOCIDED is 10, so a
               #quit gets the summary text with NO stone above it; this port
               drew one unconditionally and pushed seed0030 segment 8's
               "Sayonara Galen the Samurai..." from row 0 down to row 18.
               flags.tombstone is On by default (optlist.h). */
            if (!have_windows)
                g.program_state.stopprint = 1;
            const lines = (have_windows && how < GENOCIDED && (g.flags?.tombstone ?? true))
                ? outrip_lines(how, g._endtime || 0)
                : [];
            let nm = String(g.plname ?? g.u?.plname ?? '');
            const female = !!g.flags?.female;
            const roleTitl = how === ASCENDED ? (female ? 'Demigoddess' : 'Demigod')
                : ((female && g.urole?.name?.f) ? g.urole.name.f : g.urole?.name?.m);
            if (!done_stopprint()) {
                lines.push(`${_Goodbye()} ${nm} the ${roleTitl}...`);
                lines.push('');
            }
            /* C end.c:1429-1481 has a distinct escape/ascension summary.  It
             * scores tame pets and the retained Schrödinger cat after the
             * ascension multiplier above; the cat bonus must therefore not be
             * folded into the ordinary score block. */
            if (how === ESCAPED || how === ASCENDED) {
                // C preserves the old typ members while zeroing counts.
                for (const val of g.gv.valuables) {
                    if (!val.list) break;
                    for (let i = 0; i < val.size; i++)
                        val.list[i].count = 0n;
                }
                get_valuables(g.invent);
                for (const val of g.gv.valuables) {
                    if (!val.list) break;
                    for (let i = 0; i < val.size; i++) {
                        if (val.list[i].count !== 0n) {
                            const tmp = clong(val.list[i].count * BigInt(OC_COST[val.list[i].typ]));
                            u.urexp = nowrap_add(u.urexp, tmp);
                        }
                    }
                }
                artifact_score(g.invent, true, lines);
                g.viz_array[0][0] |= IN_SIGHT;
                const companions = [];
                // keepdogs/relmon own C's gm.mydogs at game.mydogs.
                for (let mtmp = g.mydogs; mtmp; mtmp = mtmp.nmon) {
                    companions.push(mon_nam(mtmp));
                    if (mtmp.mtame)
                        u.urexp = nowrap_add(u.urexp, mtmp.mhp);
                }
                if (g._schroedingers_cat) {
                    u.urexp = nowrap_add(u.urexp, d(adjLev(PM_HOUSECAT), 8));
                    companions.push("Schroedinger's cat");
                }
                if (companions.length && !done_stopprint())
                    lines.push(`You${companions.map((name) => ` and ${name}`).join('')}`);
                const ending = how === ASCENDED ? 'went to your reward'
                                                  : 'escaped from the dungeon';
                const score = clong(u.urexp);
                if (!done_stopprint())
                    lines.push(`${companions.length ? '' : 'You '}${ending} with ${score} point${score === 1n ? '' : 's'},`);
                if (!done_stopprint())
                    artifact_score(g.invent, false, lines);
                for (const val of g.gv.valuables) {
                    if (!val.list) break;
                    sort_valuables(val.list, val.size);
                    for (let i = 0; i < val.size && !done_stopprint(); i++) {
                        const {typ, count} = val.list[i];
                        if (count === 0n) continue;
                        let pbuf;
                        if (MKOBJ_OC_CLASS[typ] !== GEM_CLASS || typ <= LAST_REAL_GEM) {
                            const otmp = await mksobj(typ, false, false);
                            discover_object(otmp.otyp, true, true, false);
                            otmp.dknown = 1;
                            otmp.known = 1;
                            if (has_oname(otmp)) free_oname(otmp);
                            otmp.quan = count;
                            pbuf = `${String(count).padStart(8)} ${xname(otmp)}`
                                + ` (worth ${clong(count * BigInt(OC_COST[typ]))} ${currency(2n)}),`;
                            await obfree(otmp, null);
                        } else {
                            pbuf = `${String(count).padStart(8)} worthless piece${count === 1n ? '' : 's'} of colored glass,`;
                        }
                        lines.push(pbuf);
                    }
                }
            } else {
            /* C end.c:1524-1541 — "You <ends[how]> in <dungeon>[ on dungeon
               level N] with <urexp> point(s)," */
            const dname = String(g.dungeons?.[u.uz?.dnum | 0]?.dname ?? '');
            let pbuf = `You ${_ENDS[how] ?? 'died'} in ${dname}`;
            if (!_single_level_branch(u.uz))
                pbuf += ` on dungeon level ${depth(u.uz)}`;
            const urexp = clong(u.urexp);
            pbuf += ` with ${urexp} point${urexp === 1n ? '' : 's'},`;
            if (!done_stopprint()) lines.push(pbuf);
            }
            if (!done_stopprint()) {
            const umoney = g._done_money;
            /* C end.c:1544 svm.moves, sampled at the fatal blow — see
             * deadhero()'s snapshot.  QUIT and the other non-deferred hows have
             * no pending record and read the live counter, as C does. */
            const moves = (g._deathMoves != null) ? (g._deathMoves | 0) : (g.moves | 0);
            lines.push(`and ${umoney} piece${umoney === 1n ? '' : 's'} of gold, `
                       + `after ${moves} move${moves === 1 ? '' : 's'}.`);
            const uhpmax = u.uhpmax | 0;
            lines.push(`You were level ${u.ulevel | 0} with a maximum of ${uhpmax} `
                       + `hit point${uhpmax === 1 ? '' : 's'} when you ${_ENDS[how] ?? 'died'}.`);
            lines.push('');
            }
            /* C writes the tombstone and end summary to endwin and displays
             * that text window even in wizard/discover mode.  Only the
             * subsequent score list is suppressed there; skipping this
             * window loses the paged tombstone frames (seed5006). */
            if (!done_stopprint())
                await display_text_window(lines);
        }
        /* C end.c:1590-1600 — the same tail the done_stopprint path below
           takes: tear the windowing system down (which blanks the 24x80 grid),
           print the score list, and nh_terminate.  The two trailing
           raw_print("")s are `if (done_stopprint)`, so they are NOT emitted
           here. */
        if (have_windows && !g.iflags.toptenwin)
            exit_nhwindows(null);
        topten(how, g._endtime || 0);
        if (have_windows && g.iflags.toptenwin)
            exit_nhwindows(null);
        /* C end.c:1596-1599 appends two blank raw_print()s only when
         * done_stopprint is set, moving the cursor from row 2 to row 4. */
        if (done_stopprint()) {
            raw_print('');
            raw_print('');
        }
        if (wizard() || discover())
            g._wizardScoreNoticePending = done_stopprint() ? 4 : 2;
        if (typeof g._preNhgetchHook === 'function')
            await g._preNhgetchHook();
        await nh_terminate(0);
    }
}

// C end.c: nh_terminate. The process adapter catches this terminal exception.
// General freedynamicdata/dlb cleanup is not yet ported; Lua lifetime is real.
export async function nh_terminate(status, reason = 'game over') {
    (game.program_state ||= {}).in_moveloop = 0;
    const { l_nhcore_call, l_nhcore_done, NHCORE_GAME_EXIT } = await import('./nhlua.js');
    await l_nhcore_call(NHCORE_GAME_EXIT);
    if (!game.program_state.panicking) await l_nhcore_done();
    game.program_state.exiting = 1;
    const error = new Error('nh_terminate: ' + reason);
    error.status = status;
    throw error;
}
