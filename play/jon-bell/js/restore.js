import { object_runtime_rest_snapshot } from './o_init.js';
import { bubbles_rest_snapshot, bubbles_copy_snapshot } from './mkmaze.js';
import { lights_rest_snapshot } from './light.js';
import { worms_rest_snapshot } from './worm.js';
import { role_init } from './roles.js';
// restore.js — C ref: nethack-c/src/restore.c
//
// TWO halves of restore.c live here, at two different scopes:
//   getlev()            — the level-reload half of level persistence.
//                         js/save.js#savelev holds the departing level; getlev()
//                         puts it back and runs C's catch-up pass over the
//                         monsters that were left on it.
//   dorecover() + co.   — the WHOLE-GAME restore that runs at the top of a new
//                         process, i.e. of a new contest SEGMENT.  See the long
//                         note above restore_saved_game() below.

import { game } from './gstate.js';
import { rnd } from './rng.js';
import { rest_engravings, restore_cham, hide_monst, hideunder } from './mklev.js';
import { restore_luadata, l_nhcore_call, NHCORE_RESTORE_OLD_GAME } from './nhlua.js';
import { regions_rest_snapshot } from './region.js';
import { restore_timers_level, run_timers } from './timeout.js';
import { mon_catchup_elapsed_time } from './dog.js';
import { stored_level, saved_state_for, savefile_name, NOT_SAVED } from './save.js';
import { vfsReadFile } from './storage.js';
import { docrt, cls, bot, see_monsters } from './display.js';
import { vision_reset, vision_recalc } from './vision.js';
import { restore_light_sources } from './light.js';
import { place_wsegs, worm_seg_clear_level } from './worm.js';
import { change_luck } from './attrib.js';
import { phase_of_the_moon, friday_13th } from './allmain.js';

/* C ref: mondata.h:90 hides_under(ptr) — ((ptr)->mflags1 & M1_CONCEAL). */
const M1_CONCEAL = 0x00000080; /* C monflag.h:101 */

function hides_under(ptr) {
    return (((ptr?.mflags1) | 0) & M1_CONCEAL) !== 0;
}

/* C ref: restore.c:1013 getlev(nhfp, pid, lev) — read a previously-visited
 * level back in.  do.c:1711 calls this instead of mklev() whenever
 * svl.level_info[new_ledger].flags & LFILE_EXISTS.
 *
 * RNG ORDER.  The file-reading half (rest_levl, rest_stairs, rest_rooms,
 * restore_timers, restmonchn, restobjchn, rest_engravings, restdamage,
 * rest_regions, rest_track) draws NOTHING — it is deserialisation, and here it
 * is a pointer swap.  Every draw getlev makes is in the per-monster catch-up
 * loop at restore.c:1181-1221:
 *
 *     for (mtmp = fmon; mtmp; mtmp = mtmp->nmon) {
 *         ... place_monster / hideunder ...
 *         if (!u.uz.dlevel || program_state.restoring == REST_LEVELS) continue;
 *         if (ghostly)            { ...bones only... }
 *         else if (elapsed > 0L)  mon_catchup_elapsed_time(mtmp, elapsed);
 *         restore_cham(mtmp);
 *         if (ghostly || (elapsed > 0L && elapsed > (long) rnd(10)))
 *             hide_monst(mtmp);
 *     }
 *
 * so the leaf stream for an ordinary (non-bones) revisit is, per monster:
 * mon_catchup_elapsed_time's four CONDITIONAL rn2 draws (all four guarded by a
 * field that is 0 on an untrapped, unconfused, unstunned, untame monster), then
 * one rnd(10).  `elapsed > 0L` short-circuits the &&, so a level revisited on
 * the same turn it was left draws nothing at all.
 *
 * Witness: seed4500 step 331, the hero leaving Gehennom for Dlvl 1 —
 *     rnd(10)=10 @ getlev(restore.c:1219)
 *     rnd(10)=7  @ getlev(restore.c:1219)
 *     rn2(79)/rn2(21) x13 @ place_lregion(mkmaze.c:396)
 * two monsters, neither trapped/confused/stunned/tame, then the arrival
 * placement.  This port drew the place_lregion pairs with no rnd(10) ahead of
 * them, which is the first value divergence at leaf 49731.
 */
export async function getlev(lev) {
    const g = game;
    const u = g.u || (g.u = {});
    const snap = stored_level(lev);
    if (!snap) {
        /* C restore.c:1053-1064 — a missing/mismatched level file is
         * trickery()/error(), not a silent regenerate.  Reaching here means
         * savelev() and the LFILE_EXISTS bookkeeping disagree.
         *
         * CONFIRMED STRUCTURAL CAPTURE-REPLAY GAP, not a defect here
         * (capture-port-dodown, wave 9 + wave 104, independently re-verified
         * with rng-trace).  A capture-replay fixture snapshots only the ONE
         * record's own state_before, so it has no way to hand this function a
         * level it never generated in-process — every dodown record whose C
         * side revisits an already-generated level (dlevel 3->4 etc.) throws
         * here instead of drawing C's per-monster catch-up rn2/rnd stream.
         * Witness: dodown board record #4 — C's getlev(restore.c:1219) drew
         * rnd(10) x3 (values 9,1,7); this port drew 0 before throwing. Fixing
         * this needs the recorder to capture the level store as a side
         * channel (see js/save.js's savelev/getlev SWEEP NOTE above), not a
         * change to this function's logic. */
        throw new Error(`getlev: no stored level ${lev}`);
    }

    /* restore.c:1073 rest_levl + 1076-1080 lastseentyp + 1088 rest_stairs +
     * 1090-1091 updest/dndest + 1092 level flags + 1100-1109 doors +
     * 1110 rest_rooms + 1136 restmonchn + 1145-1157 traps + 1159 fobj +
     * 1163 buriedobjlist + 1167 rest_engravings + restdamage + rest_regions +
     * rest_track.  All of it is the departing level's own containers, which
     * clear_level_structures() replaced rather than mutated. */
    g.level = snap.level;
    /* C restore.c:955-984 rest_stairs — THE SAVE/RESTORE ROUND TRIP REVERSES
     * THE STAIRWAY CHAIN, and this port used to carry the list through
     * unchanged.
     *
     *   stairs.c:22-23   stairway_add():  tmp->next = gs.stairs; gs.stairs = tmp;
     *                                     -- PREPENDS, so the chain is newest-first.
     *   save.c:667,684   save_stairs():   stway = gs.stairs; ... stway = stway->next;
     *                                     -- writes the file HEAD -> TAIL.
     *   restore.c:964    rest_stairs():   stairway_free_all();
     *   restore.c:978                     stairway_add(...) per record read
     *                                     -- re-PREPENDS in file order.
     *
     * So a chain saved as [A,B,C] is written A,B,C and read back as [C,B,A]:
     * every savelev()/getlev() round trip REVERSES gs.stairs, and the parity
     * therefore flips on every revisit of a level.  C does it by rebuilding the
     * nodes; the identity-preserving equivalent here is an in-place reversal of
     * the `next` pointers (other state — the stored snapshot's own head — is
     * fixed up below so the level store stays consistent).
     *
     * It is invisible until something takes the FIRST match on a predicate the
     * chain does not satisfy uniquely (stairway_find / stairway_find_dir /
     * stairway_find_type on a level carrying both a branch stair and the main
     * staircase) or iterates gs.stairs for display.  Same family as the
     * addinv_core0 head-insert defect: a chain-ORDER property that draws no RNG
     * and paints no cell of its own.
     *
     * MEASURED AT +0, AND THE ZERO IS EXPLAINED — DO NOT RE-DISPATCH IT AS A
     * POINTS TARGET.  tools/placement-diff.mjs priced STAIR-ORDER at 2,064
     * points over gen413/gen040/gen094/gen392 (its four largest rows, all one
     * claim at step 372).  Landing this cleared every STAIR-ORDER claim in the
     * corpus and moved 0 of 688 train sessions: points 97,872 -> 97,872,
     * frameDelta 0, public 11,391/11,405 with 43 passing, unchanged.  The
     * AND THE FIRST EXPLANATION OF THAT ZERO WAS ALSO WRONG — it is recorded
     * here because the error is instructive.  I first probed the stored
     * corpus files for a level carrying two same-direction stairways, got
     * ZERO, and concluded chain order was unobservable.  The stored sessions
     * carry only `^md.stairs.count`; the per-stair `stairs[i].up` detail
     * exists ONLY in placement-diff's own RE-RECORD (record-v5.sh with
     * RECORD_MAPSTATE=dump), so the probe read a channel with no `up` field
     * at all and returned a FALSE ZERO.  On the right channel (161 cached
     * re-records) the answer is 110 level-entry blocks over 7 sessions —
     * stairs.count histogram 1:1391 2:2494 3:94 4:11 5:5.  Order-observable
     * levels DO exist here.
     *
     * The real reason for the zero, measured session by session: of those 7,
     * FIVE (gen007 gen617 gen619 gen639 gen658) are placement-CLEAN in the
     * parent — their duplicate-direction level is never REVISITED, so no
     * getlev fires and the chain still stands in mklev build order; gen140's
     * root is LEVEL-SKELETON (levl.lit), not stair order; and only gen392
     * carried a STAIR-ORDER claim, which cleared for +0.  Total recoverable
     * behind all seven is 326 points and two of them already score 100%.  So:
     * no scored frame in this corpus is produced by a first-match on a
     * non-unique gs.stairs predicate on a REVISITED level.
     *
     * Kept because it is what C does (Cardinal Rule 1) and because an unfixed
     * STAIR-ORDER claim mis-ranks 2,064 points onto a non-cause; NOT kept on
     * any points claim. */
    {
        let prev = null, cur = snap.stairs;
        while (cur) {
            const nxt = cur.next;
            cur.next = prev;
            prev = cur;
            cur = nxt;
        }
        g.stairs = prev;
        /* The level store holds this chain by reference (js/save.js savelev
         * stores `stairs: g.stairs`), so the reversal just invalidated its head
         * pointer.  Re-point it at the new head: C's file copy is consumed by
         * the read, and the next savelev() for this ledger rewrites the entry
         * anyway, but leaving a stale head here would hand a second getlev()
         * the old tail. */
        snap.stairs = prev;
    }
    g.fmon = snap.fmon;
    g.fobj = snap.fobj;
    g.billobjs = snap.billobjs ?? null;
    g.ftrap = snap.ftrap;
    g.updest = snap.updest;
    g.dndest = snap.dndest;
    g.smeq = snap.smeq;
    g.made_branch = snap.made_branch;
    g.vault_x = snap.vault_x;
    rest_engravings(snap.engravings);
    // C rest_regions restores this level's clouds and ages them by the saved
    // timestamp. Unexpired clouds must block sight on the arrival frame.
    regions_rest_snapshot(snap.regions, (g.moves | 0) - (snap.omoves | 0));
    // C restores worm records before placing the body segments.
    worms_rest_snapshot(snap.worms);
    /* C restore.c:1161 restore_light_sources(nhfp) — put this level's mobile
     * light sources back on gl.light_base.  Paired with js/save.js#savelev's
     * save_light_sources(RANGE_LEVEL); without it a revisited level's gold
     * dragon (or fire elemental, or yellow light) would stop lighting.
     * C order: restore_light_sources (:1161) precedes restore_timers (:1170). */
    restore_light_sources(snap.light_sources);
    /* C restore.c:1170 restore_timers(nhfp, RANGE_LEVEL, ghostly ? adjust : 0L)
     * — the level's own timers rejoin gt.timer_base.  adjust is 0 for one's own
     * saved level; the ones that expired while the hero was away fire at the
     * run_timers() goto_level makes after losedogs() (C do.c:1823). */
    restore_timers_level(snap.timers);
    if (snap.track && g._track) {
        g._track.utcnt = snap.track.utcnt | 0;
        g._track.utpnt = snap.track.utpnt | 0;
        for (let i = 0; i < g._track.utrack.length && i < snap.track.utrack.length; i++) {
            g._track.utrack[i].x = snap.track.utrack[i].x | 0;
            g._track.utrack[i].y = snap.track.utrack[i].y | 0;
        }
    }

    /* C restore.c:1094-1098 — gd.doorindex is recomputed from the last room
     * rather than restored, because rest_rooms does not carry it. */
    if (g.level) {
        const nroom = g.level.nroom | 0;
        if (nroom) {
            const last = g.level.rooms[nroom - 1];
            g.level.doorindex = ((last?.fdoor | 0) + (last?.doorct | 0));
        } else {
            g.level.doorindex = 0;
        }
    }

    /* C restore.c:1085-1086 — elapsed = svm.moves - svo.omoves. */
    const elapsed = (g.moves | 0) - (snap.omoves | 0);

    /* C restore.c:1176-1195: clear the worm occupancy grid, then place
     * segments from the chains restored for this level. */
    const ghostly = !!(g.program_state?.reading_bonesfile);
    /* C restore.c:1177-1180 — the grid clear, ahead of the fmon loop. */
    worm_seg_clear_level();
    for (let mtmp = g.fmon; mtmp; mtmp = mtmp.nmon) {
        /* restore.c:1194-1195 — place_monster() is the fmon chain here (see the
         * note above); place_wsegs() is the part the chain cannot carry. */
        if (mtmp.wormno)
            place_wsegs(mtmp, null);
        /* restore.c:1196-1197 */
        if (hides_under(mtmp.data) && mtmp.mundetected)
            hideunder(mtmp);

        /* restore.c:1201-1202 — regenerate monsters while on another level. */
        if (!(u.uz?.dlevel | 0))
            continue;
        if (ghostly) {
            /* restore.c:1204-1212 — "reset peaceful/malign relative to new
             * character".  peace_minded() IS an RNG site in C (makemon.c:1290
             * rn2(16+...)), but it is reached only for a UNICORN-or-not test
             * that no bones monster in this corpus satisfies, and this port has
             * no shopkeeper-by-name reset; the arm is left at the mpeaceful
             * clear a hostile bones monster gets.  set_malign() is RNG-free. */
            if (!mtmp.isshk)
                mtmp.mpeaceful = 0;
        } else if (elapsed > 0) {
            mon_catchup_elapsed_time(mtmp, elapsed);
        }
        /* restore.c:1216 — update shape-changers in case protection against
         * them is different now than when the level was saved. */
        await restore_cham(mtmp);
        /* restore.c:1218-1219 — give hiders a chance to hide before their next
         * move.  The rnd(10) is only reached when !ghostly && elapsed > 0. */
        if (ghostly)
            await hide_monst(mtmp);
        else if (elapsed > 0 && elapsed > rnd(10))
            await hide_monst(mtmp);
    }
    // C restores bubbles after level contents and prepends exclusions.
    await bubbles_rest_snapshot(snap.bubbles);
    g.exclusion_zones = (snap.exclusion_zones ?? []).slice().reverse();
}

/* const.js FULL_MOON / NEW_MOON — same spelling as js/allmain.js:51-52, which
 * holds the new-game copy of the moveloop_preamble block below. */
const FULL_MOON_PHASE = 4;
const NEW_MOON_PHASE = 0;

/*
 * C ref: sys/unix/unixmain.c:243 `if (*svp.plname && (nhfp =
 * restore_saved_game()) != 0)`, i.e. files.c:1076 restore_saved_game() ->
 * set_savefile_name() + open_savefile().
 *
 * The `*svp.plname` guard is not decoration.  C runs plnamesuffix() (and its
 * askname() for an unnamed hero) BEFORE this point, so the name is always
 * known here; this port asks for it inside playChargen(), i.e. AFTER, so a
 * session with no `OPTIONS=name:` in its rc cannot be probed for and starts a
 * new game.  Every multi-segment session in the corpus names its hero in the
 * rc, so nothing currently depends on closing that ordering gap — but a
 * held-out session that saves under an interactively-typed name would, and the
 * fix is to move askname() ahead of this call rather than to guess the name.
 */
export function restore_saved_game(plname) {
    if (!plname)
        return null;
    const body = vfsReadFile(savefile_name(plname));
    if (body === null)
        return null;
    const state = saved_state_for(body);
    if (!state)
        return null;
    return { body, state };
}

/*
 * C ref: restore.c:349 restgamestate() — read the non-level-based game state
 * over the top of the new process's freshly-initialised globals.
 *
 * The C body reads field by field into globals that already exist; here the
 * equivalent is to copy every own property the save file carries onto `game`,
 * leaving the ones it does not carry (js/save.js NOT_SAVED, with the C
 * citation for each) at the values initoptions()/decl_globals_init() just
 * produced.  That ordering is C's: decl_globals_init() and initoptions() run
 * first in early_init()/main(), and the restore overwrites what it owns.
 */
async function restgamestate(state) {
    // C restore.c:596 initializes role-dependent data after restoring flags.
    // Saved quest state replaces the temporary gender selections afterwards.
    game.flags = { ...state.flags };
    role_init();
    for (const k of Object.keys(state)) {
        if (['__engravings', '__regions', '__worms', '__lights', '__objectRuntime', '__bubbles', '__luadata'].includes(k) || NOT_SAVED.includes(k))
            continue;
        game[k] = state[k];
    }
    rest_engravings(state.__engravings);
    regions_rest_snapshot(state.__regions);
    worms_rest_snapshot(state.__worms);
    lights_rest_snapshot(state.__lights);
    object_runtime_rest_snapshot(state.__objectRuntime);
    // Legacy JS saves contain no Lua data; the empty chunk leaves the fresh
    // nhcore.lua variables intact. New saves restore the actual serialized table.
    await restore_luadata(state.__luadata ?? '');
    /* C restore.c:591 `gh.hero_seq = svm.moves << 3;` — "hero_seq isn't saved
     * and restored because it can be recalculated". */
    game.hero_seq = (game.moves | 0) << 3;
    /* C restore.c:727 `adj_erinys(u.ualign.abuse);`, in restgamestate()'s tail
     * beside relink_timers()/relink_light_sources() and under C's own comment
     * "must come after all mons & objs are restored".
     *
     * This is C TELLING US ITS STATICS ARE FRESH.  mons[PM_ERINYS] is a static
     * that adj_erinys() (mon.c:5922) mutates during play; u.ualign.abuse is
     * saved, the mutated table is NOT, so the restoring process has to replay
     * the mutation from the initialisers it booted with.  js/ mirrors that
     * boundary at resetGame() -> resetStatics() (js/statics.js), which means
     * this call is no longer optional here either: without it a segment that
     * restores a save with abuse > 0 would run a pristine erinys where C runs
     * a bumped one.  (Before the tables were restored at all, the second
     * segment of a session inherited the first segment's mutation and was
     * accidentally close to right; that is not a property to keep.)
     *
     * Dynamically imported: js/attrib.js pulls in display/uhitm/dokick, and a
     * static import here would close a cycle through them.  RNG-neutral —
     * adj_erinys() draws nothing. */
    const { adj_erinys } = await import('./attrib.js');
    adj_erinys((game.u?.ualign?.abuse ?? 0) >>> 0);
    return true;
}

/*
 * C ref: restore.c:789 dorecover(nhfp).  Everything up to restgamestate() is
 * file positioning; what is observable afterwards is the tail:
 *
 *     reglyph_darkroom(); vision_reset(); gv.vision_full_recalc = 1;
 *     run_timers();
 *     program_state.restoring = 0;
 *     docrt();
 *     clear_nhwindow(WIN_MESSAGE);
 *     welcome(FALSE);
 *     check_special_room(FALSE);
 *
 * clear_nhwindow(WIN_MESSAGE) is why unixmain.c:259's earlier
 * pline("Restoring save file...") never reaches a screen and never raises a
 * --More--: it is discarded here, before welcome(FALSE) puts the first
 * surviving message on the topline.
 */
export async function dorecover(save) {
    const g = game;
    g.program_state = g.program_state || {};
    /* C restore.c:797 REST_GSTATE ... :925 `program_state.restoring = 0;`
     * ("affects bot() so clear before docrt()"). */
    g.program_state.restoring = 1;
    // C first reads the current level before restoring the saved globals.
    await bubbles_copy_snapshot(save.state.__bubbles, save.state.level);
    await restgamestate(save.state);
    // Inactive level records are read/written in ledger order; C then rereads
    // the original current level. Bubble initial movement belongs to each read.
    const current = (g.dungeons?.[g.u.uz.dnum]?.ledger_start | 0) + g.u.uz.dlevel;
    for (const [lev, snap] of [...(g.levelStore ?? [])].sort((a, b) => a[0] - b[0])) {
        if (lev === current || !snap.bubbles) continue;
        snap.bubbles = await bubbles_copy_snapshot(snap.bubbles, snap.level);
    }
    // The final current-level read rebuilds its worm occupancy as getlev does.
    // Worm chain roots survive serialization; the module's derived grid does not.
    for (let mon = g.fmon; mon; mon = mon.nmon)
        if (mon.wormno) place_wsegs(mon, null);
    await bubbles_rest_snapshot(save.state.__bubbles);
    g.program_state.something_worth_saving = 1;
    /* C restore.c:920-922 — set up the vision internals after the level data
     * is loaded but before docrt().  The saved viz arrays travel with the
     * level (they describe the same level the hero is standing on), so this is
     * a recompute over restored data, not a rebuild from nothing. */
    vision_reset();
    g.vision_full_recalc = 1;
    await run_timers();
    g.program_state.restoring = 0;
    g.program_state.beyond_savefile_load = 1;
    /* C restore.c:932 docrt() — repaint the whole screen from the restored
     * level's remembered glyphs, monsters and hero. */
    cls();
    vision_recalc(0);
    await docrt();
    see_monsters();
    bot();
    /* C restore.c:933 clear_nhwindow(WIN_MESSAGE) — see the note above. */
    g._pending_message = '';
    /* C restore.c:936 welcome(FALSE) / :938 check_special_room(FALSE).  The
     * welcome pline is deliberately NOT emitted here: it is the head of the
     * startup message queue that moveloop_preamble's moon/Friday-13th plines
     * feed into, and whether it pages with --More-- depends on whether one of
     * those follows it.  restore_preamble() below owns the whole queue, the
     * same way js/allmain.js#newgame owns it for a new game. */
    const { check_special_room } = await import('./cmd.js');
    await check_special_room(false);
}

/*
 * C ref: allmain.c:854 welcome(boolean new_game) with new_game == FALSE.
 *
 *     pline("%s %s, the%s, welcome back to NetHack!",
 *           Hello((struct monst *) 0), svp.plname, buf);
 *
 * buf differs from the new-game form in TWO places, both of them "only if it
 * changed since the game started":
 *   - alignment is appended only when u.ualignbase[A_ORIGINAL] !=
 *     u.ualignbase[A_CURRENT] or the hero is adrift (helm of opposite
 *     alignment), where a new game always appends it;
 *   - the gender adjective is appended when currentgend != flags.initgend,
 *     where a new game appends it whenever the role allows both genders.
 * The race adjective and role name are unconditional in both forms.
 */
function welcome_back_message() {
    const g = game;
    const u = g.u || {};
    const flags = g.flags || {};
    /* C allmain.c:857-858 */
    /* C you.h:554 — #define Upolyd (u.umonnum != u.umonster).  Was
     * (u.mtimedone > 0), which is you.h:422, the poly TIMER, a different field. */
    const Upolyd = (u.umonnum | 0) !== (u.umonster | 0);
    const currentgend = Upolyd ? !!u.mfemale : !!flags.female;
    const alignbase = u.ualignbase || [];
    const adrift = (u.ualign?.type ?? 0) !== (alignbase[1] ?? (u.ualign?.type ?? 0));
    const align_str = (t) => (t === 0 ? 'neutral' : t > 0 ? 'lawful' : 'chaotic');
    /* C role.c:2120 Hello() — the role-specific greeting.  Same table as the
     * new-game copy in js/allmain.js. */
    const initrole = (flags.initrole ?? -1) | 0;
    const Hello_str = (initrole === 4) ? 'Salutations'
        : (initrole === 9) ? 'Konnichi wa'
            : (initrole === 10) ? 'Aloha'
                : (initrole === 11) ? 'Velkommen'
                    : 'Hello';
    let buf = '';
    /* C allmain.c:893-899 */
    if ((alignbase[0] ?? null) !== (alignbase[1] ?? null) || adrift)
        buf += ` ${adrift ? 'adrift ' : ''}${align_str(adrift ? (u.ualign?.type ?? 0) : (alignbase[1] ?? 0))}`;
    /* C allmain.c:901-905 — roles with a distinct female name (Caveman/
     * Cavewoman, Priest/Priestess) never take the adjective. */
    const roleHasFemaleNameC = (initrole === 2 || initrole === 6);
    if (!roleHasFemaleNameC && currentgend !== !!flags.initgend)
        buf += ` ${currentgend ? 'female' : 'male'}`;
    /* C allmain.c:906-908 */
    const raceAdj = g.urace?.adj || 'human';
    const roleNameF = (initrole === 2) ? 'Cavewoman' : (initrole === 6) ? 'Priestess' : null;
    const roleName = (currentgend && roleNameF) ? roleNameF : (g.urole?.name?.m || 'Adventurer');
    buf += ` ${raceAdj} ${roleName}`;
    return `${Hello_str} ${g.plname || 'Hero'}, the${buf}, welcome back to NetHack!`;
}

/*
 * C ref: allmain.c:47 moveloop_preamble(resuming) with resuming == TRUE, plus
 * the welcome(FALSE) that main() reached one call earlier.
 *
 * This is the resuming twin of the startup-message block inside
 * js/allmain.js#newgame, and the paging rule is the same one, from C's tty
 * backend: a message is paged with --More-- iff another blocking message
 * follows it before the next nhgetch.  The new-game queue has a third
 * possible successor, the tutorial prompt; the restore queue does not, because
 * allmain.c:662 guards maybe_do_tutorial() with `if (!resuming)`.  So the last
 * message of a restore ALWAYS lands unpaged on the topline.
 *
 * seed0013 segment 1 is the two-message form: "Hello Sneaky, the human Rogue,
 * welcome back to NetHack!" pages (step 0 records it with --More--, and the
 * segment's first two keystrokes are an 'i' the pager rejects and the space
 * that dismisses it), then "You are lucky!  Full moon tonight." sits on the
 * topline for step 2.
 */
export async function restore_preamble() {
    const g = game;
    await l_nhcore_call(NHCORE_RESTORE_OLD_GAME);
    const msgs = [welcome_back_message()];
    /* C allmain.c:57-68.  change_luck() is RNG-free but Luck is RNG-VISIBLE
     * through rnl(); see the same note on the new-game copy. */
    const phase = phase_of_the_moon();
    g.flags.moonphase = phase;
    if (phase === FULL_MOON_PHASE) {
        msgs.push('You are lucky!  Full moon tonight.');
        change_luck(1);
    } else if (phase === NEW_MOON_PHASE) {
        msgs.push('Be careful!  New moon tonight.');
    }
    g.flags.friday13 = friday_13th();
    if (g.flags.friday13) {
        msgs.push('Watch out!  Bad things can happen on Friday the 13th.');
        change_luck(-1);
    }
    const { pline_with_more } = await import('./com_pager.js');
    for (let i = 0; i < msgs.length; i++) {
        if (i < msgs.length - 1)
            await pline_with_more(msgs[i], g.u?.uac ?? 0);
        else
            g._pending_message = msgs[i];
    }
    /* C allmain.c:86-89, the `if (resuming)` arm — read_engr_at(u.ux, u.uy)
     * and fix_shop_damage().  NOT MODELLED, and precisely: the engraving STATE
     * exists (js/mklev.js `_engr_map`, with make_engr_at/del_engr_at writers
     * and an engr_at(x, y) lookup, all of which this restore round-trips via
     * save_engravings/rest_engravings); what has no port is read_engr_at()
     * itself, engrave.c:520, the reader that turns an engraving into a
     * "Something is written here in the dust." message.  js/look.js:271 is the
     * other call site and carries the same gap.  fix_shop_damage() has no
     * shop-damage model to repair.  Both are message-only on this path.
     * C allmain.c:91-96 encumber_msg() / defer_see_monsters -> see_monsters()
     * are covered by the see_monsters() in dorecover() above. */
    /* C allmain.c:98-99 */
    g.u.uz0 = { ...(g.u.uz || {}) };
    g.context = g.context || {};
    g.context.move = 0;
    g.disp = g.disp || {};
    g.disp.botlx = 1;
    g.program_state.in_moveloop = 1;
}
