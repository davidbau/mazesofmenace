import { encumber_msg } from './weight.js';
import { object_runtime_rest_snapshot } from './o_init.js';
import { bubbles_rest_snapshot, bubbles_copy_snapshot } from './mkmaze.js';
import { lights_rest_snapshot } from './light.js';
import { worms_rest_snapshot } from './worm.js';
import { role_init } from './roles.js';
import { peaceMinded, set_malign, olfaction } from './makemon.js';
// restore.js — C ref: nethack-c/src/restore.c
//
// TWO halves of restore.c live here, at two different scopes:
//   getlev()            — the level-reload half of level persistence.
//                         js/save.js#savelev holds the departing level; getlev()
//                         puts it back and runs C's catch-up pass over the
//                         monsters that were left on it.
//   dorecover() + co.   — the WHOLE-GAME restore that runs at the top of a new
//                         note above restore_saved_game() below.

import { game } from './gstate.js';
import { init_rect } from './rect.js';
import { align_str, setuwep } from './cmd.js';
import { rnd } from './rng.js';
import { rest_engravings, restore_cham, hide_monst, hideunder, _gm_migrating, In_hell } from './mklev.js';
import { restore_luadata, l_nhcore_call, NHCORE_RESTORE_OLD_GAME } from './nhlua.js';
import { regions_rest_snapshot } from './region.js';
import { restore_timers_level, run_timers } from './timeout.js';
import { mon_catchup_elapsed_time } from './dog.js';
import { stored_level, saved_state_for, savefile_name, NOT_SAVED } from './save.js';
import { vfsReadFile, vfsDeleteFile } from './storage.js';
import { docrt, cls, bot, see_monsters, pline, _topline_more_pending, flush_screen, clear_glyph_buffer, reglyph_darkroom } from './display.js';
import { vision_reset, vision_recalc } from './vision.js';
import { restore_light_sources } from './light.js';
import { place_wsegs, worm_seg_clear_level } from './worm.js';
import { change_luck } from './attrib.js';
import { HALLUC, HALLUC_RES, COLNO } from './const.js';
import { PM_MONK } from './pm.generated.js';
import { ugenocided, udeadinside, set_uasmon } from './polyself.js';
import { phase_of_the_moon, friday_13th, getnow, time_from_yyyymmddhhmmss } from './allmain.js';

/* C ref: mondata.h:90 hides_under(ptr) — ((ptr)->mflags1 & M1_CONCEAL). */
const M1_CONCEAL = 0x00000080; /* C monflag.h:101 */

function hides_under(ptr) {
    return (((ptr?.mflags1) | 0) & M1_CONCEAL) !== 0;
}

function find_lev_obj_clear_no_charge(level) {
    const objs = level?.levelObjects;
    if (!objs) return;
    for (const col of objs) {
        if (!col) continue;
        for (let y = 0; y < col.length; y++)
            for (let o = col[y]; o; o = o.nexthere)
                if (o.no_charge) o.no_charge = 0;
    }
}

/* C restore.c:167-178 restdamage(): each record read is PREPENDED to
 * svl.level.damagelist while savedamage() wrote the list head -> tail, so
 * every level read reverses the pending shop-repair chain (which damage a
 * shopkeeper repairs first, via find_damage()). */
function restdamage_reverse(level) {
    let prev = null, cur = level?.damagelist || null;
    while (cur) {
        const nxt = cur.next;
        cur.next = prev;
        prev = cur;
        cur = nxt;
    }
    if (level) level.damagelist = prev;
}

export async function getlev(lev) {
    const g = game;
    const u = g.u || (g.u = {});
    const snap = stored_level(lev);
    if (!snap) {
        throw new Error(`getlev: no stored level ${lev}`);
    }

    /* restore.c:1073 rest_levl + 1076-1080 lastseentyp + 1088 rest_stairs +
     * 1090-1091 updest/dndest + 1092 level flags + 1100-1109 doors +
     * 1110 rest_rooms + 1136 restmonchn + 1145-1157 traps + 1159 fobj +
     * 1163 buriedobjlist + 1167 rest_engravings + restdamage + rest_regions +
     * rest_track.  All of it is the departing level's own containers, which
     * clear_level_structures() replaced rather than mutated. */
    g.level = snap.level;
    restdamage_reverse(g.level);
    find_lev_obj_clear_no_charge(g.level);
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
    // C restore.c:1111,1144 and timeout.c:2723-2724: bones timers retain
    // their remaining delay across the old and new heroes' turn counters.
    restore_timers_level(snap.timers, g.program_state?.reading_bonesfile
        ? (g.moves | 0) - (snap.omoves | 0) : 0);
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
            /* restore.c:1204-1212 — reset peaceful/malign relative to the new
             * character; shopkeepers reset based on name.  peace_minded() draws
             * (makemon.c:2306-2307) for every non-shk, non-matching-unicorn. */
            if (!mtmp.isshk) {
                const md = mtmp.data;
                const sgn = (x) => (x > 0 ? 1 : x < 0 ? -1 : 0);
                const uni = !!md && (md.mlet | 0) === 21
                    && ((md.mflags2 >>> 0) & 0x20000000) !== 0
                    && sgn((u.ualign?.type ?? 0) | 0) === sgn((md.maligntyp ?? md.alignment ?? 0) | 0);
                mtmp.mpeaceful = uni ? 1 : (peaceMinded(md.pmidx ?? md.mndx) ? 1 : 0);
            }
            set_malign(mtmp);
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
    // C restore.c:570,589-591: startup debug mode overrides saved playmode.
    const startupDebug = !!game.flags?.debug;
    // C restore.c:596 initializes role-dependent data after restoring flags.
    // Saved quest state replaces the temporary gender selections afterwards.
    game.flags = { ...state.flags };
    if (startupDebug) {
        game.flags.debug = true;
        game.flags.explore = false;
        (game.iflags ||= {}).deferred_X = false;
    }
    role_init();
    for (const k of Object.keys(state)) {
        if (['flags', '__engravings', '__regions', '__worms', '__lights', '__objectRuntime', '__bubbles', '__luadata', '__ubirthday'].includes(k) || NOT_SAVED.includes(k))
            continue;
        game[k] = state[k];
    }
    // C save.c:265-333 omits cmd.c's process-local command queues/binding;
    // decl.c:239,250 initializes them empty in the restoring process.
    game.gc.command_queue = [null, null];
    game.gc.cmd_bind = null;
    // C save.c:265-333 omits gc.coder (decl.c:283). A new process
    // must initialize its builder, including the level temperature, afresh
    // on the next des call (sp_lev.c:6345-6373).
    game.gc.coder = null;
    // C decl.c:193-194 initializes these per process; save.c:265-333 omits
    // query_category's hint counters, so restoring offers each hint afresh.
    game.ga ||= {};
    game.ga.A_first_hint = 0;
    game.ga.A_second_hint = 0;
    /* C save.c:265-333 does not save youmonst.  The restoring process starts
     * with decl.c's zeroed struct; restore.c:604,629 rebuild cham and data.
     * Clear in place so restored light-source references retain its identity. */
    game.youmonst ||= {};
    for (const k of Object.keys(game.youmonst))
        delete game.youmonst[k];
    game.youmonst.cham = game.u.mcham;
    // C restore.c:615-617: parsing the saved local date can change the epoch.
    if (state.__ubirthday !== undefined)
        game.u.ubirthday = time_from_yyyymmddhhmmss(state.__ubirthday);
    // C restore.c:625 — time while the game was saved is not playing time.
    (game.urealtime ||= { realtime: 0, finish_time: 0 }).start_timing = getnow();
    set_uasmon(); // C restore.c:629
    // C restore.c:671 restores one migrating chain; rebind both JS spellings.
    _gm_migrating();
    /* C decl.h:536 marks `int lastinvnr` "(never saved&restored)": the restoring
     * process keeps decl.c:458's initial 51 (u_init.c:1375 re-sets it only for a
     * NEW game), so assigninvlet() (invent.c:721) scans from 'a' again instead of
     * continuing after the old process's last letter. */
    game._lastinvnr = 51;
    /* C decl.c:347 gf.followmsg is a process-local global (shk.c:4914 nag
     * timer) that save.c does not write; the restoring process starts at 0. */
    game.followmsg = 0;
    /* C restore.c:684: disable see_monsters() before re-wielding, so
     * setuwep()'s artifact-intrinsic see_monsters() (Sting_effects) waits for
     * moveloop_preamble (allmain.c:92-95). */
    /* C restore.c:684: defer before restoring worn-item effects, including
     * setuwep()'s artifact warning refresh. Moveloop re-enables the refresh. */
    game.defer_see_monsters = 1;
    // C restore.c:686-689 rebuilds worn gear through setworn(); worn.c:138
    // recomputes this process-local flag. Our saved slots already restore
    // the gear pointers and properties, but iflags itself is not saved.
    game.iflags.tux_penalty = !!(game.u.uarm && game.urole.mnum === PM_MONK
                                && game.urole.spelarmr);
    /* C restore.c:691-699: reclassify the restored weapon even if the saved
     * unweapon was cleared by an earlier fight.  Clear the slot first to
     * bypass setuwep()'s same-object return, just as C does. */
    {
        const w = game.u.uwep || null;
        game.u.uwep = null;
        await setuwep(w);
        if (!w || (w.otyp | 0) === 259 /* PICK_AXE */ || (w.otyp | 0) === 260 /* GRAPPLING_HOOK */)
            game.unweapon = true;
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
    /* C unixmain.c:259 pline("Restoring save file...") is remembered (topl.c remember_topl)
     * even though clear_nhwindow(WIN_MESSAGE) discards it from the screen: ^P still lists it. */
    (g._msg_history ||= []).push('Restoring save file...');
    /* C's new process has an empty gbuf; saved levl glyphs are memory only. */
    clear_glyph_buffer();
    // C restore.c:831 restlevelfile() -> savelev() (save.c:561) clears
    // level structures, including init_rect() (mklev.c:916). The final
    // getlev() reloads the map but leaves this fresh allocator in place.
    init_rect();
    restdamage_reverse(g.level);
    find_lev_obj_clear_no_charge(g.level);
    // C restore.c:811,898 reads the original saved current level twice;
    // each rest_stairs (:955-984) prepends records in save_stairs order.
    // The final chain is therefore the reverse of the saved chain.
    {
        let prev = null, cur = g.stairs;
        while (cur) {
            const next = cur.next;
            cur.next = prev;
            prev = cur;
            cur = next;
        }
        g.stairs = prev;
    }
    // Inactive level records are read/written in ledger order; C then rereads
    // the original current level. Bubble initial movement belongs to each read.
    const current = (g.dungeons?.[g.u.uz.dnum]?.ledger_start | 0) + g.u.uz.dlevel;
    for (const [lev, snap] of [...(g.levelStore ?? [])].sort((a, b) => a[0] - b[0])) {
        if (lev === current) continue;
        /* C restore.c:873-875 — each inactive level goes through getlev()
         * (REST_LEVELS: monster catch-up skipped, :1201) and straight back out
         * through restlevelfile() -> savelev(), which stamps it with the
         * restored svm.moves (save.c:516).  rest_regions (region.c:813) ages
         * its regions by the old stamp during that read.  So a revisit after
         * restore measures elapsed from the SAVE, not from when it was left. */
        const aged = (g.moves | 0) - (snap.omoves | 0);
        for (let i = 0; i < (snap.regions?.n_regions | 0); i++) {
            const reg = snap.regions.regions[i];
            if (reg.ttl >= 0) reg.ttl = Math.max(0, reg.ttl - aged);
        }
        snap.omoves = g.moves | 0;
        restdamage_reverse(snap.level);
        find_lev_obj_clear_no_charge(snap.level);
        if (!snap.bubbles) continue;
        snap.bubbles = await bubbles_copy_snapshot(snap.bubbles, snap.level);
    }
    // The final current-level read rebuilds its worm occupancy as getlev does.
    // Worm chain roots survive serialization; the module's derived grid does not.
    // C restore.c:1196-1217 — that read (REST_CURRENT_LEVEL, so the
    // `restoring == REST_LEVELS` skip at :1201 does not apply) also re-hides
    // hiders and runs restore_cham(); elapsed is 0 because savelev stamped the
    // level with the saved svm.moves, so no catch-up or hide_monst rnd(10).
    for (let mon = g.fmon; mon; mon = mon.nmon) {
        if (mon.wormno) place_wsegs(mon, null);
        if (hides_under(mon.data) && mon.mundetected)
            hideunder(mon);
        await restore_cham(mon);
    }
    await bubbles_rest_snapshot(save.state.__bubbles);
    g.program_state.something_worth_saving = 1;
    /* C restore.c:920-922 — set up the vision internals after the level data
     * is loaded but before docrt().  The saved viz arrays travel with the
     * level (they describe the same level the hero is standing on), so this is
     * a recompute over restored data, not a rebuild from nothing. */
    // C restore.c:926: normalize remembered dark-room glyphs before repainting.
    reglyph_darkroom();
    vision_reset();
    g.vision_full_recalc = 1;
    await run_timers();
    g.program_state.restoring = 0;
    g.program_state.beyond_savefile_load = 1;
    /* C restore.c:932 docrt() — repaint the whole screen from the restored
     * level's remembered glyphs, monsters and hero. */
    await docrt();
    /* C restore.c:932-933: finish docrt's notice pages before clearing them. */
    if (_topline_more_pending())
        await flush_screen(1, false);
    bot();
    /* C restore.c:933 clear_nhwindow(WIN_MESSAGE) — see the note above. */
    g._pending_message = '';
    /* C restore.c:948 welcome(FALSE) / :949 check_special_room(FALSE).  The
     * welcome pline is deliberately NOT emitted here: it is the head of the
     * startup message queue that moveloop_preamble's moon/Friday-13th plines
     * feed into, and whether it pages with --More-- depends on whether one of
     * those follows it.  restore_preamble() below owns the whole queue, the
     * same way js/allmain.js#newgame owns it for a new game. */
    /* Both calls run in restore_preamble(), in C's order. */
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
    const adrift = (u.ualign?.type ?? 0) !== (alignbase[0] ?? (u.ualign?.type ?? 0));  /* A_CURRENT == 0 (you.h:458) */
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
        buf += ` ${adrift ? 'adrift ' : ''}${align_str(adrift ? (u.ualign?.type ?? 0) : (alignbase[0] ?? 0))}`;
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

export async function restore_preamble() {
    const g = game;
    await l_nhcore_call(NHCORE_RESTORE_OLD_GAME);
    const msgs = [];
    /* C allmain.c:863-866 welcome(FALSE): a polymorphed hero whose role or race
     * was self-genocided skips the welcome-back line, the Hallucination line
     * and the level annotation (early return). */
    const doomed = ((g.u?.umonnum | 0) !== (g.u?.umonster | 0)) && ugenocided();
    if (doomed)
        msgs.push(`You're back, but you still feel ${udeadinside()} inside.`);
    /* C allmain.c:869-870 welcome(): the Hallucination line precedes the
     * welcome-back line.  Hallucination = HHallucination && !Halluc_resistance
     * (youprop.h:120). */
    if (!doomed) {
        const up = g.u?.uprops;
        const res = ((up?.[HALLUC_RES]?.intrinsic | 0) !== 0) || ((up?.[HALLUC_RES]?.extrinsic | 0) !== 0);
        if (((up?.[HALLUC]?.intrinsic | 0) !== 0) && !res)
            msgs.push('NetHack is filmed in front of an undead studio audience.');
    }
    if (!doomed)
        msgs.push(welcome_back_message());
    /* C allmain.c:925 -> do.c:2003-2011: welcome(FALSE) also reports
     * temperature and smoke before the annotation and keep-save prompt. */
    if (!doomed) {
        const temperature = g.level?.flags?.temperature | 0;
        if (temperature) {
            const append = (msg) => {
                const last = msgs.length - 1;
                /* C topl.c:265: leave room for --More-- when joining. */
                if (last >= 0 && msgs[last].length + msg.length + 3 < COLNO - 8)
                    msgs[last] += `  ${msg}`;
                else
                    msgs.push(msg);
            };
            append(`It is ${temperature > 0 ? 'hot' : 'cold'} here.`);
            if (temperature > 0 && In_hell(g.u.uz))
                append(`You ${olfaction(g.youmonst.data) ? 'smell' : 'sense'} smoke...`);
        }
    }
    /* C allmain.c:927 welcome(FALSE): print_level_annotation() (dungeon.c:2489)
     * follows the welcome-back line, before unixmain.c's keep-save prompt. */
    if (!doomed) {
        const uz = g.u?.uz || { dnum: 0, dlevel: 1 };
        const annotation = g._level_custom?.[`${uz.dnum | 0}:${uz.dlevel | 0}`];
        if (annotation)
            msgs.push(`You remember this level as ${annotation}.`);
    }
    /* C restore.c:948-949: room-entry/boundary messages follow welcome(),
     * before unixmain.c's keep-save question.  Publish the welcome first so
     * the room check cannot have its pending message overwritten by it. */
    while (msgs.length)
        await pline(msgs.shift());
    const { check_special_room } = await import('./cmd.js');
    await check_special_room(false);
    const { _topline_more_pending, flush_screen } = await import('./display.js');
    if (_topline_more_pending())
        await flush_screen(1, false);
    /* C topl.c:257,268,300: ESC at a page's more() set WIN_STOP, so the plines
     * after it (hellish_smoke_mesg, allmain.c:925) updated gt.toplines but never
     * reached the screen; nothing stays pending to be re-paged. */
    if (g._pending_message && !g._topl_win_stop)
        msgs.push(g._pending_message);
    g._pending_message = '';
    let keptPrompt = '';
    /* C unixmain.c:264-274 — after a successful dorecover(), wizard and
     * explore-mode restores ask whether to keep the save file; this precedes
     * moveloop_preamble()'s moon/Friday-13th messages. */
    if (g.flags?.debug || g.flags?.explore) {
        /* welcome(FALSE) is dorecover's own tail (restore.c:936), so it is on
         * the topline, paged by the prompt that follows. */
        const { pline_with_more } = await import('./com_pager.js');
        while (msgs.length)
            await pline_with_more(msgs.shift(), g.u?.uac ?? 0);
        if (!g.flags.debug && g.flags.explore)
            await pline('You are in non-scoring explore/discovery mode.');
        const { yn_function } = await import('./end.js');
        if (await yn_function('Do you want to keep the save file?', 'yn', 'n', true) === 'n')
            vfsDeleteFile(savefile_name(g.plname));
        /* C topl.c:538-546 tty_yn_function clean_up leaves the answered prompt
         * on the topline (TOPLINE_NON_EMPTY); the first moveloop frame still
         * shows it until rhack's clear_nhwindow(WIN_MESSAGE). */
        keptPrompt = 'Do you want to keep the save file? [yn] (n)';
    }
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
    const { topl_more_page } = await import('./com_pager.js');
    const { pline_flush_point } = await import('./display.js');
    let dismissedEsc = false;
    for (let i = 0; i < msgs.length; i++) {
        if (i < msgs.length - 1) {
            pline_flush_point();
            dismissedEsc = await topl_more_page(msgs[i], g.u?.uac ?? 0) === 27;
        } else
            g._pending_message = msgs[i];
    }
    /* C topl.c:232-235: ESC at the more() paging the previous message leaves
     * WIN_STOP set, so the read_engr_at plines below (allmain.c:87) are
     * suppressed by update_topl's skip test (topl.c:257). */
    if (dismissedEsc && msgs.length) {
        g._topl_win_stop = true;
        g._topl_win_stop_buf = msgs[msgs.length - 1];
    }
    /* C topl.c:544 leaves an answered question TOPLINE_NON_EMPTY, so
     * update_topl():262-275 replaces it without joining or calling more().
     * Keep only its physical text; it is not an unacknowledged pline. */
    if (keptPrompt && !msgs.length)
        g._topl_sticky = keptPrompt;
    /* C allmain.c:85: request BL_RESET before read_engr_at(), whose plines
     * flush the status before paging the engraving (pline.c:273-276). */
    g.disp = g.disp || {};
    g.disp.botlx = 1;
    g._status1WholeNext = true;
    /* C allmain.c:86-89 calls read_engr_at directly.  Its ordinary plines
     * share the pending topline: update_topl (topl.c:260-275) joins messages
     * that fit and pages only when the next message needs a new line. */
    {
        const { read_engr_at } = await import('./look.js');
        await read_engr_at(g.u.ux, g.u.uy);
    }
    /* C allmain.c:88: repair old shop damage silently before monster moves. */
    const { fix_shop_damage } = await import('./shk.js');
    await fix_shop_damage();
    /* C allmain.c:91-96 encumber_msg(); then the deferred see_monsters() runs
     * AFTER the welcome and moon/Friday-13th plines and their --More-- frames. */
    /* C allmain.c:91: encumber_msg() "in case they auto-picked up something".
     * go.oldcap is a global (not in the savefile), so it starts at 0. */
    g.u._oldcap = 0;
    /* C allmain.c:85 `disp.botlx = TRUE` precedes encumber_msg() (:91), so the
     * encumber pline's flush paints status row 1 whole under the standing --More--. */
    g.disp = g.disp || {};
    g.disp.botlx = 1;
    g._status1WholeNext = true;
    await encumber_msg();
    if (g.defer_see_monsters) {
        g.defer_see_monsters = 0;
        see_monsters();
    }
    /* C allmain.c:98-99 */
    g.u.uz0 = { ...(g.u.uz || {}) };
    g.context = g.context || {};
    g.context.move = 0;
    g.program_state.in_moveloop = 1;
}
