import { encumber_msg } from './pickup.js';
import { msgtype_type } from './options.js';
import { object_runtime_rest_snapshot } from './o_init.js';
import { bubbles_rest_snapshot, bubbles_copy_snapshot } from './mkmaze.js';
import { lights_rest_snapshot } from './light.js';
import { worms_rest_snapshot } from './worm.js';
import { role_init } from './role.js';
import { peaceMinded, set_malign, permonstTemplate } from './makemon.js';
import { olfaction } from './mondata.js';
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
import { align_str } from './insight.js';
import { setuwep } from './wield.js';
import { rnd } from './rnd.js';
import { obj_no_longer_held } from './do.js';
import { _gm_migrating } from './mklev.js';
import { rest_engravings } from './engrave.js';
import { In_hell, Is_branchlev, on_level, assign_level, ledger_no } from './dungeon.js';
import { deltrap } from './trap.js';
import { restore_cham, hide_monst, hideunder, set_ustuck } from './mon.js';
import { restore_luadata, l_nhcore_call, NHCORE_RESTORE_OLD_GAME } from './nhlua.js';
import { regions_rest_snapshot } from './region.js';
import { restore_timer_order, restore_timers_level, run_timers } from './timeout.js';
import { mon_catchup_elapsed_time } from './dog.js';
import { stored_level, saved_state_for, savefile_name, NOT_SAVED } from './save.js';
import { vfsReadFile, vfsDeleteFile } from './storage.js';
import { docrt, cls, clear_glyph_buffer, see_monsters, _topline_more_pending, flush_screen, reglyph_darkroom, reset_glyphmap } from './display.js';
import { max_rank_sz } from './botl.js';
import { assign_graphics } from './symbols.js';
import { pline, You } from './pline.js';
import { vision_reset, vision_recalc } from './vision.js';
import { restore_light_sources } from './light.js';
import { place_wsegs, worm_seg_clear_level, worm_seg_at, worm_seg_clear_at } from './worm.js';
import { change_luck } from './attrib.js';
import { HALLUC, HALLUC_RES, OBJ_FREE, W_BALL, W_CHAIN, MAXNROFROOMS, MAGIC_PORTAL, BR_STAIR, BR_NO_END1, BR_NO_END2, BR_PORTAL, Is_rogue_level, REST_GSTATE, REST_LEVELS, REST_CURRENT_LEVEL } from './const.js';
import { set_residency, restshk } from './shk.js';
import { setworn } from './worn.js';
import { PM_MONK } from './pm.generated.js';
import { ugenocided, udeadinside, set_uasmon } from './polyself.js';
import { phase_of_the_moon, friday_13th, getnow, time_from_yyyymmddhhmmss } from './calendar.js';
import { impossible } from './pline.js';
import { minimal_monnam } from './do_name.js';
import { describe_level_buf } from './dungeon.js';
import { TRICKED } from './const.js'; // relocate-fns

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

function restobjchn_clear_bypass(ochain, shift = 0) {
    for (let otmp = ochain; otmp; otmp = otmp.nobj) {
        otmp.lua_ref_cnt = 0; // C restore.c:190: Lua handles belong to the old read.
        // C restore.c:207-212 reads stored corpse/statue traits through
        // restmon(), including its edog time conversion and apport clamp.
        rest_edog(otmp.oextra?.omonst, shift);
        if (otmp.bypass)
            otmp.bypass = 0;
        if (otmp.cobj)
            restobjchn_clear_bypass(otmp.cobj, shift);
    }
}

/* C restore.c:281-282 for one level's whole read: getlev() reads fobj
 * (:1166), level.buriedobjlist (:1172) and gb.billobjs (:1173) through
 * restobjchn, and restmonchn's restmon() reads each monster's minvent (:421)
 * through it as well. */
function restobjchn_clear_level_bypass(fmon, fobj, buried, billobjs, shift = 0) {
    restobjchn_clear_bypass(fobj, shift);
    restobjchn_clear_bypass(buried, shift);
    restobjchn_clear_bypass(billobjs, shift);
    for (let mtmp = fmon; mtmp; mtmp = mtmp.nmon)
        restobjchn_clear_bypass(mtmp.minvent, shift);
}

/* C restore.c:167-178 restdamage(): each record read is PREPENDED to
 * svl.level.damagelist while savedamage() wrote the list head -> tail, so
 * every level read reverses the pending shop-repair chain (which damage a
 * shopkeeper repairs first, via find_damage()). */
/* C restore.c:1149-1160 — getlev() rebuilds gf.ftrap by PREPENDING each trap
 * as savetrapchn (save.c:918) wrote it head -> tail, so every save/restore
 * round trip reverses the chain (same as rest_stairs, below).  t_at() reads
 * game.level.traps, so only ftrap walkers (display_trap_map's sense_trap
 * order, see_traps, ...) can tell. */
function rest_trapchn_reverse(head) {
    let prev = null, cur = head;
    while (cur) {
        const nxt = cur.ntrap ?? null;
        cur.ntrap = prev;
        prev = cur;
        cur = nxt;
    }
    return prev;
}

function restdamage_reverse(level, shift = 0) {
    let prev = null, cur = level?.damagelist || null;
    while (cur) {
        /* C restore.c:172-173 — ghostly: when += (moves - omoves). */
        if (shift)
            cur.when = (cur.when | 0) + shift;
        const nxt = cur.next;
        cur.next = prev;
        prev = cur;
        cur = nxt;
    }
    if (level) level.damagelist = prev;
}

/* C save.c:864-869 / restore.c:354-356 — a level file stores each pet's
 * edog droptime and hungrytime RELATIVE to the turn it was written
 * (moves_to_relative_time) and restmon() makes them absolute again against the
 * turn it is read (relative_time_to_moves).  The level store here keeps the
 * monsters in memory, so the round trip is the shift by (read - write) turns:
 * a pet left behind does not grow hungry while the hero is away. */
function rest_edog_times(fmon, shift) {
    for (let mtmp = fmon; mtmp; mtmp = mtmp.nmon)
        rest_edog(mtmp, shift);
}

// C restore.c:354-359 applies to every restmon(), not just restmonchn().
function rest_edog(mon, shift) {
    const edog = mon?.mextra?.edog;
    if (!edog) return;
    edog.droptime = (edog.droptime | 0) + shift;
    edog.hungrytime = (edog.hungrytime | 0) + shift;
    if (edog.apport <= 0) edog.apport = 1;
}

// C restore.c:358-359,405-406: pointers in a save belong to the old
// process. Rebuild data from this process's mons[] and validate pet apport.
function restmonchn_data(fmon) {
    for (let mon = fmon; mon; mon = mon.nmon) {
        mon.data = permonstTemplate(mon.mnum);
        const edog = mon.mextra?.edog;
        if (edog && edog.apport <= 0) edog.apport = 1;
    }
}

// C restore.c:113-125: consume objects interrupted by a hangup save.
export async function inven_inuse(quietly) {
    const { xname } = await import('./objnam.js');
    const { useup } = await import('./invent.js');
    for (let obj = game.invent, next; obj; obj = next) {
        next = obj.nobj;
        if (obj.in_use) {
            if (!quietly) await pline('Finishing off %s...', xname(obj));
            await useup(obj);
        }
    }
}

// C restore.c:468-483: savefruitchn writes head to tail; loading prepends.
function loadfruitchn(head) {
    let restored = null;
    while (head) {
        const next = head.nextf;
        head.nextf = restored;
        restored = head;
        head = next;
    }
    return restored;
}

/* C restore.c:1131-1138 and mkroom.c:875-907: every getlev() reads
 * fresh room records, reconstructs the subroom preorder and recomputes the
 * door count from the last top-level room.  dorecover() reads the current
 * level twice and each inactive level once; graph copies need the same pass.
 * In particular, doors added after that last room (for example a niche door)
 * remain in doors[] but fall outside doorindex after a read, just as in C. */
function rest_rooms(level) {
    // C mkroom.c:851-918 save_room/rest_room: subrooms are written by
    // parent-room traversal, then assigned consecutive slots on restore.
    // levl[].roomno is NOT renumbered, even when that changes its room type.
    const records = [];
    const saveRoom = (room) => {
        records.push({ ...room, sbrooms: [...(room.sbrooms || [])] });
        for (let i = 0; i < (room.nsubrooms | 0); i++) saveRoom(room.sbrooms[i]);
    };
    for (let i = 0; i < (level.nroom | 0); i++) saveRoom(level.rooms[i]);
    const subrooms = [];
    let record = 0, nsubroom = 0;
    const readRoom = (room) => {
        Object.assign(room, records[record++]);
        for (let i = 0; i < (room.nsubrooms | 0); i++) {
            const child = subrooms[nsubroom] ||= {};
            room.sbrooms[i] = child;
            readRoom(child);
            (subrooms[nsubroom++] ||= {}).resident = null;
        }
    };
    for (let i = 0; i < (level.nroom | 0); i++) {
        readRoom(level.rooms[i]);
        level.rooms[i].resident = null;
    }
    level._nsubroom = nsubroom;
    subrooms[nsubroom] = { hx: -1 };
    level._subrooms = subrooms;
    level.rooms.length = MAXNROFROOMS + 1;
    for (let i = 0; i < subrooms.length; i++) {
        subrooms[i].roomnoidx = MAXNROFROOMS + 1 + i;
        level.rooms[MAXNROFROOMS + 1 + i] = subrooms[i];
    }
    /* C restore.c:1132-1139 — gd.doorindex is recomputed from the last room
     * rather than restored, because rest_rooms does not carry it. */
    if (level) {
        const nroom = level.nroom | 0;
        if (nroom) {
            const last = level.rooms[nroom - 1];
            level.doorindex = ((last?.fdoor | 0) + (last?.doorct | 0));
        } else {
            level.doorindex = 0;
        }
    }
}

export async function getlev(lev, restoreFloor = null) {
    const g = game;
    const u = g.u || (g.u = {});
    const snap = stored_level(lev);
    if (!snap) {
        throw new Error(`getlev: no stored level ${lev}`);
    }
    // C restore.c:1064,1305: suppress vision and map updates throughout the read.
    (g.program_state ||= {}).in_getlev = 1;

    /* restore.c:1073 rest_levl + 1076-1080 lastseentyp + 1088 rest_stairs +
     * 1090-1091 updest/dndest + 1092 level flags + 1100-1109 doors +
     * 1110 rest_rooms + 1136 restmonchn + 1145-1157 traps + 1159 fobj +
     * 1163 buriedobjlist + 1167 rest_engravings + restdamage + rest_regions +
     * rest_track.  All of it is the departing level's own containers, which
     * clear_level_structures() replaced rather than mutated. */
    g.level = snap.level;
    // C save.c:673-684,924-934 stores local stairs/traps relative to the
    // old u.uz; restore.c:973-976,1153-1156 makes them absolute at the new
    // u.uz. Bones of a randomized special level can move to another depth.
    if (g.program_state.reading_bonesfile && snap.saved_uz) {
        const origin = snap.saved_uz;
        const restoreDestination = (dest) => {
            if (dest.dnum === origin.dnum) dest.dlevel -= origin.dlevel;
            if (dest.dnum === u.uz.dnum) dest.dlevel += u.uz.dlevel;
        };
        for (let stway = snap.stairs; stway; stway = stway.next)
            restoreDestination(stway.tolev);
        for (let trap = snap.ftrap; trap; trap = trap.ntrap)
            restoreDestination(trap.dst);
        snap.saved_uz = { ...u.uz };
    }
    /* C restore.c:1117,1314-1318 rest_adjust_levelflags(): restore stasis_until
     * from its relative offset stored by save_adjust_levelflags(). */
    if (g.level?.flags)
        g.level.flags.stasis_until = (g.level.flags.stasis_until | 0) + (g.moves | 0);
    rest_rooms(g.level);
    restdamage_reverse(g.level, g.program_state?.reading_bonesfile
        ? (g.moves | 0) - (snap.omoves | 0) : 0);
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
    restmonchn_data(g.fmon);
    for (let mon = g.fmon; mon; mon = mon.nmon)
        if (mon.isshk) restshk(mon, !!g.program_state.reading_bonesfile);
    /* C restore.c:1136 restmonchn -> restmon:354-356 */
    rest_edog_times(g.fmon, (g.moves | 0) - (snap.omoves | 0));
    g.fobj = snap.fobj;
    // C has already installed this level's map when find_lev_obj runs.
    if (restoreFloor)
        await restoreFloor();
    else if (!g.program_state?.reading_bonesfile)
        await find_lev_obj_no_longer_held(g.fobj);
    g.billobjs = snap.billobjs ?? null;
    /* C restore.c:281-282 — every chain this read brings back (fobj :1166,
     * buriedobjlist :1172, billobjs :1173, each monster's minvent :421) has
     * its objects' bypass bit cleared by restobjchn(). */
    restobjchn_clear_level_bypass(g.fmon, g.fobj, g.level?.buriedobjlist,
                                  g.billobjs, (g.moves | 0) - (snap.omoves | 0));
    g.ftrap = snap.ftrap = rest_trapchn_reverse(snap.ftrap);
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

    /* C restore.c:1085-1086 — elapsed = svm.moves - svo.omoves. */
    const elapsed = (g.moves | 0) - (snap.omoves | 0);

    /* C restore.c:1176-1195: clear the worm occupancy grid, then place
     * segments from the chains restored for this level. */
    const ghostly = !!(g.program_state?.reading_bonesfile);
    /* C restore.c:1177-1180 — the grid clear, ahead of the fmon loop. */
    worm_seg_clear_level();
    const grid = new Map();
    for (let mon = g.fmon; mon; mon = mon.nmon)
        mon._mapRemoved = true;
    for (let mtmp = g.fmon; mtmp; mtmp = mtmp.nmon) {
        if (mtmp.isshk) set_residency(mtmp, false); // C restore.c:1183
        if (mtmp.m_id === u.usteed_mid) {
            // C restore.c:1184-1187: a recovered steed remains off the map.
            u.usteed = mtmp;
            u.usteed_mid = 0;
        } else {
            if (mtmp.m_id === u.ustuck_mid) {
                set_ustuck(mtmp);
                u.ustuck_mid = 0;
            }
            // C restore.c:1194: rebuild occupancy in fmon order, including
            // monsters displaced from their saved slot before departure.
            const key = (mtmp.mx | 0) * 256 + (mtmp.my | 0);
            const othermon = worm_seg_at(mtmp.mx, mtmp.my) || grid.get(key);
            if (othermon) {
                await impossible('placing %s over %s at <%d,%d>, mstates:%lx %lx on %s?',
                                 minimal_monnam(mtmp, false), minimal_monnam(othermon, true),
                                 mtmp.mx, mtmp.my, othermon.mstate, mtmp.mstate, describe_level_buf(0));
                if (othermon.mx === mtmp.mx && othermon.my === mtmp.my)
                    othermon._mapRemoved = true;
                if (_topline_more_pending()) await flush_screen(1, false);
            }
            worm_seg_clear_at(mtmp.mx, mtmp.my); // place_monster overwrites a tail cell too
            delete mtmp._mapRemoved;
            grid.set(key, mtmp);
            if (mtmp.wormno)
                await place_wsegs(mtmp, null);
            if (hides_under(mtmp.data) && mtmp.mundetected)
                hideunder(mtmp);
        }

        /* restore.c:1201-1202 — regenerate monsters while on another level. */
        if (!(u.uz?.dlevel | 0) || g.program_state.restoring === REST_LEVELS)
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

    /* C restore.c:1230-1291 — a bones level's stairs and portals are the dead
     * hero's; re-aim them at this game's dungeon. */
    if (ghostly) {
        // C restore.c:1231-1254 scans for a missing down stair, but its
        // repair is dead: the only bones caller passes lev=0 (bones.c:707),
        // which cannot exceed medusa's positive ledger number (:1243).
        // Our lev argument indexes the snapshot and is not that native lev.
        let stway;
        const br = Is_branchlev(u.uz);
        if (br && u.uz.dlevel === 1) {
            const ltmp = on_level(u.uz, br.end1) ? { ...br.end2 } : { ...br.end1 };
            switch (br.type) {
            case BR_STAIR:
            case BR_NO_END1:
            case BR_NO_END2:
                stway = g.stairs;
                while (stway) {
                    if (stway.tolev.dnum !== u.uz.dnum)
                        break;
                    stway = stway.next;
                }
                if (stway)
                    assign_level(stway.tolev, ltmp);
                break;
            case BR_PORTAL: { /* max of 1 portal per level */
                let trap;
                for (trap = g.ftrap; trap; trap = trap.ntrap)
                    if (trap.ttyp === MAGIC_PORTAL)
                        break;
                if (!trap)
                    throw new Error('getlev: need portal but none found');
                trap.dst = trap.dst || {};
                assign_level(trap.dst, ltmp);
                break;
            }
            }
        } else if (!br) {
            /* Remove any dangling portals. */
            let ttmp;
            for (let trap = g.ftrap; trap; trap = ttmp) {
                ttmp = trap.ntrap;
                if (trap.ttyp === MAGIC_PORTAL)
                    deltrap(trap);
            }
        }
    }
    g.program_state.in_getlev = 0;
}

/* const.js FULL_MOON / NEW_MOON — same spelling as js/allmain.js:51-52, which
 * holds the new-game copy of the moveloop_preamble block below. */
const FULL_MOON_PHASE = 4;
const NEW_MOON_PHASE = 0;


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
    const startupFlags = game.flags;
    const startupContext = game.context;
    // C restore.c:570,589-591: startup debug mode overrides saved playmode.
    const startupDebug = !!game.flags?.debug;
    const startupExplore = !!game.flags?.explore;
    // C restore.c:596 initializes role-dependent data after restoring flags.
    // Saved quest state replaces the temporary gender selections afterwards.
    game.flags = { ...state.flags };
    // C restore.c:587: a normal-mode save restored with playmode:explore is
    // handled as restore followed by 'X' (allmain.c:53 moveloop_preamble).
    (game.iflags ||= {}).deferred_X = startupExplore && !game.flags.explore;
    if (startupDebug) {
        game.flags.debug = true;
        game.flags.explore = false;
        (game.iflags ||= {}).deferred_X = false;
    }
    role_init();
    // C restore.c:631-647: reject a hangup save made with a dead hero.
    // Stage this before restoring inventory and the rest of the saved graph,
    // which C has not read yet when it takes this return.
    const savedU = state.u;
    if (savedU.uhp <= 0
        && (savedU.umonnum === savedU.umonster || savedU.mh <= 0)) {
        game.u = savedU;
        savedU.ux = savedU.uy = 0;
        await You('were not healthy enough to survive restoration.');
        if (game.wiz1_level) game.wiz1_level.dlevel = 0;
        savedU.uz = { dnum: 0, dlevel: 1 };
        game.iflags.deferred_X = false;
        game.flags = startupFlags;
        game.context = startupContext;
        game.youmonst = {};
        return false;
    }
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
    // decl.c:177 already_found_flag is process-local (save.c omits it).
    game.ga.already_found_flag = 0;
    /* decl.c:808 gw.wailmsg is process-local (save.c omits it): hack.c:4217's
     * once-per-50-moves wail throttle starts at 0 in the restoring process. */
    game.wailmsg = 0;
    /* decl.c:547 gn.nomovemsg is process-local (save.c omits it): a stale
     * "You're finally finished." (eat.c:3315) must not survive into the
     * restoring process, where done_eating (eat.c:551) would print it. */
    game.nomovemsg = null;
    game.gb ||= {};
    game.gb.bhitpos = { x: 0, y: 0 };
    game.bhitpos = game.gb.bhitpos;
    /* C save.c:265-333 does not save youmonst.  The restoring process starts
     * with decl.c's zeroed struct; restore.c:604,629 rebuild cham and data.
     * Clear in place so restored light-source references retain its identity. */
    game.youmonst ||= {};
    for (const k of Object.keys(game.youmonst))
        delete game.youmonst[k];
    game.youmonst.cham = game.u.mcham;
    /* C restore.c:615-617: the saved birthday is local date text (save.c:288)
     * and mktime() re-reads it with the recording moment's tm_isdst (patch 001
     * calendar.c:160), so a birthday outside that DST state moves one hour. */
    // C restore.c:615-617: parsing the saved local date can change the epoch.
    if (state.__ubirthday !== undefined)
        game.u.ubirthday = time_from_yyyymmddhhmmss(state.__ubirthday);
    // C restore.c:625 — time while the game was saved is not playing time.
    (game.urealtime ||= { realtime: 0, finish_time: 0 }).start_timing = getnow();
    /* C restore.c:627 runs set_uasmon() before restobjchn()/setworn() (686-689):
     * no slot is worn yet, so resists_drli()'s defended() sees no dragon armor.
     * Our state copy already carries the slots; hide them for the call. */
    {
        const slots = ['uarm', 'uarmc', 'uarmh', 'uarms', 'uarmg', 'uarmf', 'uarmu',
                       'uleft', 'uright', 'uwep', 'uswapwep', 'uquiver', 'uamul', 'ublindf'];
        const saved = slots.map((k) => game.u[k]);
        for (const k of slots) game.u[k] = null;
        set_uasmon();
        slots.forEach((k, i) => { game.u[k] = saved[i]; });
    }
    // C restore.c:649: a hangup can save in the middle of changing levels.
    assign_level(game.u.uz0 ||= {}, game.u.uz);
    // C restore.c:671 restores one migrating chain; rebind both JS spellings.
    _gm_migrating();
    restmonchn_data(game.migrating_mons);
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
    game.ffruit = loadfruitchn(game.ffruit);
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
 * pline("Restoring save file...") never reaches a screen unless a restore
 * pline pages it: it is discarded here, before welcome(FALSE) puts the first
 * surviving message on the topline.
 */
/* C restore.c:811 — the FIRST getlev() runs before restgamestate(), with
 * u.usteed_mid == 0, so its fmon loop (:1181-1194) place_monster()s the steed
 * too and steed.c:922-928 reports any monster already on that grid slot.
 * u.uz is still the fresh process's (describe_level). */
async function first_getlev_place_monsters(chain, worms) {
    const grid = new Map();
    for (let mtmp = chain; mtmp; mtmp = mtmp.nmon) {
        const key = (mtmp.mx | 0) * 256 + (mtmp.my | 0);
        const othermon = grid.get(key);
        if (othermon) {
            // minimal_monnam's worm-tail test must consult this detached
            // read's grid, rather than the still-active game's fmon chain.
            const otherHead = (othermon.mx | 0) * 256 + (othermon.my | 0);
            await impossible('placing %s over %s at <%d,%d>, mstates:%lx %lx on %s?',
                             minimal_monnam(mtmp, false),
                             minimal_monnam(othermon, grid.get(otherHead) !== othermon),
                             mtmp.mx, mtmp.my, othermon.mstate, mtmp.mstate, describe_level_buf(0));
            // A copying save read uses the live tty rather than the recovery
            // base window. Drain the plines before processing the next monster.
            if (!game._base_topline && _topline_more_pending())
                await flush_screen(1, false);
        }
        grid.set(key, mtmp);
        // C restore.c:1195 -> worm.c:615-634 places this worm's segments
        // before reading the next monster's head. These detached reads must
        // not borrow the active level's module-scoped worm arrays.
        if (mtmp.wormno) {
            const num = mtmp.wormno | 0;
            const head = worms?.wheads?.[num];
            let seg = worms?.wtails?.[num];
            while (seg && seg !== head) {
                const segkey = (seg.wx | 0) * 256 + (seg.wy | 0);
                if (grid.has(segkey)) {
                    await impossible('placing worm seg <%d,%d> over another mon',
                                     seg.wx, seg.wy);
                    if (!game._base_topline && _topline_more_pending())
                        await flush_screen(1, false);
                }
                grid.set(segkey, mtmp);
                seg = seg.nseg;
            }
            if (seg) {
                seg.wx = mtmp.mx;
                seg.wy = mtmp.my;
            }
        }
    }
}

// The same head-placement diagnostics run when save.c:210 copies an inactive
// level, and when dorecover's REST_LEVELS pass reads it (restore.c:873).
export { first_getlev_place_monsters as restmonchn_place_diagnostics };

export async function find_lev_obj_no_longer_held(fobj, restoreWorn = true) {
    const chain = [];
    for (let o = fobj; o; o = o.nobj) chain.push(o);
    for (let i = chain.length - 1; i >= 0; i--) {
        const obj = chain[i], where = obj.where;
        // C restore.c:88: each object is free while place_object processes it.
        obj.where = OBJ_FREE;
        try { await obj_no_longer_held(obj); }
        finally { obj.where = where; }
        // while reading the hero's current level.
        if (restoreWorn && game.u.uz?.dlevel && (obj.owornmask & (W_BALL | W_CHAIN)))
            await setworn(obj, obj.owornmask);
    }
}

export async function dorecover(save) {
    const g = game;
    // C restore.c:797 writes the process-global struct initialized by
    // decl_globals_init(); resetGame() likewise already initialized it.
    /* C restore.c:797 REST_GSTATE ... :925 `program_state.restoring = 0;`
     * ("affects bot() so clear before docrt()"). */
    g.program_state.restoring = REST_GSTATE;
    // C first reads the current level before restoring the saved globals.
    // restore.c:811 allocates a first copy; :893-898 rewinds and reads the
    // original save again. Effects of that first read (for example a fixed
    // crysknife reverting in find_lev_obj) must not alter the final read.
    const firstLevel = saved_state_for(save.body);
    g.program_state.in_getlev = 1;
    rest_rooms(firstLevel.level);
    restmonchn_data(firstLevel.fmon);
    await find_lev_obj_no_longer_held(firstLevel.fobj);
    // draws must precede any monster-placement diagnostic's input wait.
    await first_getlev_place_monsters(firstLevel.fmon, firstLevel.__worms);
    const baseTopline = g._base_topline; /* restgamestate copies saved keys over game */
    delete g._base_topline;
    await bubbles_copy_snapshot(firstLevel.__bubbles, firstLevel.level);
    g.program_state.in_getlev = 0;
    if (!await restgamestate(save.state)) {
        // C restore.c:813-822: discard this save and let main start a new game.
        await baseTopline?.flush();
        vfsDeleteFile(savefile_name(g.plname));
        g.u.usteed_mid = g.u.ustuck_mid = 0;
        g.program_state.restoring = 0;
        return 0;
    }
    /* C restore.c:281-282 on dorecover's reads: restgamestate() brings back
     * invent (:657), the loose ball & chain (:660) and migrating_objs (:671)
     * through restobjchn, and the current level's chains come back through
     * its getlev()s (:811, :898) — every one clears the bypass bit. */
    restobjchn_clear_bypass(g.invent);
    restobjchn_clear_bypass(g.migrating_objs);
    restobjchn_clear_bypass(g.u?.uball);
    restobjchn_clear_bypass(g.u?.uchain);
    restobjchn_clear_level_bypass(g.fmon, g.fobj, g.level?.buriedobjlist,
                                  g.billobjs);
    /* C restore.c:672 — restgamestate()'s migrating_mons restmonchn() reads
     * each migrating monster's minvent through restobjchn (:421) as well. */
    for (let mtmp = g.migrating_mons; mtmp; mtmp = mtmp.nmon)
        restobjchn_clear_bypass(mtmp.minvent);
    for (let mon = g.migrating_mons; mon; mon = mon.nmon)
        if (mon.isshk) restshk(mon, false);
    restore_timer_order(); /* C restore.c:811,813,898 insert_timer order */
    /* restore_msghistory -> topl.c:701-702: a standing TOPLINE_NEED_MORE becomes
     * NON_EMPTY, so docrt's cls() does not page it; it is only remembered. */
    baseTopline?.finish();
    /* The tty base window (copyright banner) stays up until docrt()'s cls(), so
     * the second getlev()'s impossible() pages over it too. */
    if (baseTopline) g._base_topline = baseTopline;
    g._screen_output = '';
    // C restore.c:831 restlevelfile() -> savelev() (save.c:561) clears
    // level structures, including init_rect() (mklev.c:916). The final
    // getlev() reloads the map but leaves this fresh allocator in place.
    init_rect();
    g.program_state.in_getlev = 1;
    rest_rooms(g.level);
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
    // Same for the trap chain (restore.c:1159-1160).
    g.ftrap = rest_trapchn_reverse(g.ftrap);
    // Inactive level records are read/written in ledger order; C then rereads
    // the original current level. Bubble initial movement belongs to each read.
    const current = (g.dungeons?.[g.u.uz.dnum]?.ledger_start | 0) + g.u.uz.dlevel;
    g.program_state.restoring = REST_LEVELS; // C restore.c:835
    for (const [lev, snap] of [...(g.levelStore ?? [])].sort((a, b) => a[0] - b[0])) {
        if (lev === current) continue;
        /* C restore.c:873-875 — each inactive level goes through getlev()
         * (REST_LEVELS: monster catch-up skipped, :1201) and straight back out
         * through restlevelfile() -> savelev(), which stamps it with the
         * restored svm.moves (save.c:516).  rest_regions (region.c:813) ages
         * its regions by the old stamp during that read.  So a revisit after
         * restore measures elapsed from the SAVE, not from when it was left. */
        rest_rooms(snap.level);
        const aged = (g.moves | 0) - (snap.omoves | 0);
        for (let i = 0; i < (snap.regions?.n_regions | 0); i++) {
            const reg = snap.regions.regions[i];
            if (reg.ttl >= 0) reg.ttl = Math.max(0, reg.ttl - aged);
        }
        /* that getlev()'s restobjchn reads (restore.c:281-282) clear this
         * snapshot's bypass bits before restlevelfile() writes it back */
        restobjchn_clear_level_bypass(snap.fmon, snap.fobj,
                                      snap.level?.buriedobjlist, snap.billobjs, aged);
        /* the same read's restmon() re-bases each pet's edog times */
        rest_edog_times(snap.fmon, aged);
        restmonchn_data(snap.fmon);
        for (let mon = snap.fmon; mon; mon = mon.nmon)
            if (mon.isshk) restshk(mon, false);
        snap.omoves = g.moves | 0;
        /* that getlev() also re-prepends the stairway and trap chains
         * (restore.c:978, 1159-1160) before restlevelfile() writes them back */
        {
            let prev = null, cur = snap.stairs;
            while (cur) {
                const next = cur.next;
                cur.next = prev;
                prev = cur;
                cur = next;
            }
            snap.stairs = prev;
        }
        snap.ftrap = rest_trapchn_reverse(snap.ftrap);
        if (snap.timers) restore_timer_order(snap.timers);
        restdamage_reverse(snap.level);
        find_lev_obj_clear_no_charge(snap.level);
        await find_lev_obj_no_longer_held(snap.fobj, false); /* C restore.c:873 -> 1168 -> 93-97 */
        // REST_LEVELS skips catch-up and shape changes at :1201, after the
        // placement loop. Overlaps on an inactive level still report here.
        await first_getlev_place_monsters(snap.fmon, snap.worms);
        if (!snap.bubbles) continue;
        snap.bubbles = await bubbles_copy_snapshot(snap.bubbles, snap.level);
    }
    g.program_state.restoring = REST_CURRENT_LEVEL; // C restore.c:896
    await find_lev_obj_no_longer_held(g.fobj);
    // The final current-level read rebuilds its worm occupancy as getlev does.
    // Worm chain roots survive serialization; the module's derived grid does not.
    // C restore.c:1196-1217 — that read (REST_CURRENT_LEVEL, so the
    // `restoring == REST_LEVELS` skip at :1201 does not apply) also re-hides
    // hiders and runs restore_cham(); elapsed is 0 because savelev stamped the
    // level with the saved svm.moves, so no catch-up or hide_monst rnd(10).
    // C restore.c:1177-1194 — that read also clears svl.level.monsters and
    // place_monster()s every fmon entry except the steed ("kept on fmon list
    // but off the map").  This port's grid is fmon minus _mapRemoved, so a
    // monster displaced from its slot before the save (steed.c:930 overwrite)
    // is back on the map after it; a later one on the same square wins.
    const grid = new Map();
    restmonchn_data(g.fmon);
    worm_seg_clear_level();
    for (let mon = g.fmon; mon; mon = mon.nmon)
        mon._mapRemoved = true;
    for (let mon = g.fmon; mon; mon = mon.nmon) {
        if (mon.isshk) {
            restshk(mon, false);
            // C restore.c:1182-1183: rest_rooms cleared the resident slot.
            set_residency(mon, false);
        }
        if (mon !== g.u?.usteed) {
            const key = (mon.mx | 0) * 256 + (mon.my | 0);
            const othermon = worm_seg_at(mon.mx, mon.my) || grid.get(key);
            if (othermon) {
                await impossible('placing %s over %s at <%d,%d>, mstates:%lx %lx on %s?',
                                 minimal_monnam(mon, false), minimal_monnam(othermon, true),
                                 mon.mx, mon.my, othermon.mstate, mon.mstate, describe_level_buf(0));
                if (othermon.mx === mon.mx && othermon.my === mon.my)
                    othermon._mapRemoved = true;
            }
            worm_seg_clear_at(mon.mx, mon.my); // C steed.c:930 replaces this grid cell
            delete mon._mapRemoved;
            grid.set(key, mon);
            if (mon.wormno) await place_wsegs(mon, null);
            if (hides_under(mon.data) && mon.mundetected)
                hideunder(mon);
        }
        // C restore.c:1181-1217 finishes this monster before placing the next;
        // a steed skips placement/hiding but still needs shape restoration.
        await restore_cham(mon);
    }
    await bubbles_rest_snapshot(save.state.__bubbles);
    g.program_state.in_getlev = 0;
    g.program_state.something_worth_saving = 1;
    // C restore.c:905-908: initialize this process's graphics and rank width.
    if (Is_rogue_level(g.u.uz)) assign_graphics(1 /* ROGUESET */);
    reset_glyphmap(2 /* gm_levelchange */);
    max_rank_sz();
    /* C restore.c:920-922 — set up the vision internals after the level data
     * is loaded but before docrt().  The saved viz arrays travel with the
     * level (they describe the same level the hero is standing on), so this is
     * a recompute over restored data, not a rebuild from nothing. */
    /* C restore.c:910-915 — a lone ball or chain is dropped after complaining. */
    if ((g.u.uball && !g.u.uchain) || (g.u.uchain && !g.u.uball)) {
        await impossible('restgamestate: lost ball & chain');
        await setworn(null, W_CHAIN);
        await setworn(null, W_BALL);
    }
    await inven_inuse(false); // C restore.c:922: billing and current level are ready.
    // C restore.c:926: normalize remembered dark-room glyphs before repainting.
    reglyph_darkroom();
    vision_reset();
    g.vision_full_recalc = 1;
    await run_timers();
    g.program_state.restoring = 0;
    // C restore.c:933-939: preserve startup diagnostics until the player
    // acknowledges the pending raw output, before docrt clears the screen.
    if (g.early_raw_messages && !g.program_state.beyond_savefile_load) {
        g.early_raw_messages = 0;
        await baseTopline?.waitSynch();
    }
    g.u.usteed_mid = g.u.ustuck_mid = 0; // C restore.c:941
    g.program_state.beyond_savefile_load = 1;
    /* C restore.c:932 docrt() — repaint the whole screen from the restored
     * level's remembered glyphs, monsters and hero. */
    if (baseTopline) {
        await baseTopline.flush();
        delete g._base_topline;
    }
    /* A restored game is a fresh process: the tty status window has never
     * been rendered, so a lone timebot() has no field positions to paint at. */
    g._statusEverPainted = false;
    /* A restored game is a fresh process: gg.gbuf starts zeroed (display.c
     * init_display), so docrt's vision_recalc(2) notice flushes (vision.c:856)
     * paint only what newsym() has put into gbuf since, not the saved level's
     * previous display state. */
    /* A fresh process has a zeroed gbuf (display.c gg.gbuf); the saved level
     * object must not carry the previous life's glyph buffer into docrt()'s
     * first flush (vision.c:856 notice -> pline.c:273). */
    clear_glyph_buffer();
    await docrt();
    /* C restore.c:932-933: finish docrt's notice pages before clearing them. */
    if (_topline_more_pending())
        await flush_screen(1, false);
    /* C restore.c:933 clear_nhwindow(WIN_MESSAGE) — see the note above. */
    g._pending_message = '';
    /* C restore.c:948 welcome(FALSE) / :949 check_special_room(FALSE).  The
     * welcome pline is deliberately NOT emitted here: it is the head of the
     * startup message queue that moveloop_preamble's moon/Friday-13th plines
     * feed into, and whether it pages with --More-- depends on whether one of
     * those follows it.  restore_preamble() below owns the whole queue, the
     * same way js/allmain.js#newgame owns it for a new game. */
    /* Both calls run in restore_preamble(), in C's order. */
    return 1;
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
            // C do.c:2005-2010 uses separate plines. Each message must pass
            // MSGTYPE filtering before update_topl decides whether to join it.
            msgs.push(`It is ${temperature > 0 ? 'hot' : 'cold'} here.`);
            if (temperature > 0 && In_hell(g.u.uz))
                msgs.push(`You ${olfaction(g.youmonst.data) ? 'smell' : 'sense'} smoke...`);
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
    if (g.iflags?.deferred_X) {
        const { pline_with_more } = await import('./com_pager.js');
        while (msgs.length)
            await pline_with_more(msgs.shift(), g.u?.uac ?? 0);
        const { enter_explore_mode_cmd } = await import('./cmd.js');
        await enter_explore_mode_cmd();
        if (g._pending_message) {
            msgs.push(g._pending_message);
            g._pending_message = '';
        }
    }
    const phase = phase_of_the_moon();
    g.flags.moonphase = phase;
    if (phase === FULL_MOON_PHASE) {
        // C allmain.c:57-68 uses pline; suppress before the tty join/page
        // calculation, while retaining the independent luck change.
        const msg = 'You are lucky!  Full moon tonight.';
        if (msgtype_type(msg) !== 'hide') msgs.push(msg);
        change_luck(1);
    } else if (phase === NEW_MOON_PHASE) {
        const msg = 'Be careful!  New moon tonight.';
        if (msgtype_type(msg) !== 'hide') msgs.push(msg);
    }
    g.flags.friday13 = friday_13th();
    if (g.flags.friday13) {
        const msg = 'Watch out!  Bad things can happen on Friday the 13th.';
        if (msgtype_type(msg) !== 'hide') msgs.push(msg);
        change_luck(-1);
    }
    // C allmain.c:57-68 emits ordinary plines. In particular MSGTYPE=stop
    // pages even the last message; update_topl owns joining and ESC suppression.
    for (const msg of msgs)
        await pline(msg);
    if (_topline_more_pending())
        await flush_screen(1, false);
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

/* C restore.c:1035 trickery(reason) */
export async function trickery(reason) {
    await pline('Strange, this map is not as I remember it.');
    await pline('Somebody is trying some trickery here...');
    await pline('This game is void.');
    if (!game.svk) game.svk = {};
    if (!game.svk.killer) game.svk.killer = {};
    game.svk.killer.name = reason || '';
    const { done } = await import('./end.js');
    await done(TRICKED);
}

// C ref: restore.c:1484-1507 lookup_id_mapping(unsigned int gid, unsigned int *nidp)
export function lookup_id_mapping(gid, nidp) {
    const idmap = game && game._id_map;
    if (idmap && typeof idmap.has === 'function' && idmap.has(gid)) {
        const nid = idmap.get(gid) >>> 0;
        if (nidp && typeof nidp === 'object')
            nidp.value = nid;
        return true;
    }
    return false;
}
