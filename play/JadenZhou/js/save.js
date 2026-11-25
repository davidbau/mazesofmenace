// save.js — saving the game (the S command) and writing level files.
// C ref: save.c dosave(), dosave0(), savegamestate(), savelev(),
// savelev_core(), savelevl(), save_stairs(), save_bc(), saveobj(),
// saveobjchn(), savemon(), savemonchn(), savetrapchn(), savefruitchn(),
// savelevchn(), savecemetery(), savedamage(), save_bubbles(),
// store_plname_in_file(), save_msghistory(), save_gamelog(); plus the
// save halves of dungeon.c save_dungeon(), o_init.c savenames(),
// artifact.c save_artifacts(), rumors.c save_oracles(), timeout.c
// save_timers(), light.c save_light_sources(), engrave.c
// save_engravings(), region.c save_regions(), track.c save_track(),
// mkroom.c save_rooms(), nhlua.c save_luadata() and end.c nh_terminate().
//
// Records go into a JS NHFILE (sfbase.js) with C's field tags; the save
// file itself is kept in the contest storage (files.js).
//
// The JS port keeps some C chains as arrays (floor objects, a monster's
// inventory, container contents, traps) and others as nobj/nmon linked
// lists (invent, fmon); each chain is saved with its shape so restore.js
// rebuilds it the same way.

import { game } from './gstate.js';
import { Sfo } from './sfbase.js';
import { create_savefile, open_savefile, delete_savefile, open_levelfile,
         delete_levelfile, level_info, store_version, HACK_UID } from './files.js';
import { genders, aligns } from './role.js';
import { close_nhfile } from './sfbase.js';
import { ledger_no, maxledgerno, save_mapseen } from './dungeon.js';
import { pline, There, docrt, gbuf_keep } from './display.js';
import { tty_clear_nhwindow, tty_yn_function, tty_display_nhwindow,
         tty_exit_nhwindows, tty_getmsghistory } from './wintty.js';
import { nomul } from './hack.js';
import { save_worm } from './worm.js';
import { vision_recalc } from './vision.js';
import { change_luck } from './attrib.js';
import { monsndx } from './mondata.js';
import { dmonsfree } from './mon.js';
import { objects, NUM_OBJECTS } from './objects.js';
import { getlev } from './restore.js';
import { save_timers as save_timers_to } from './timeout.js';
import { save_light_sources as save_light_sources_to } from './light.js';
import { RANGE_GLOBAL, RANGE_LEVEL } from './const.js';
import { GameMap } from './game.js';
import { setworn } from './worn.js';
import { forget_temple_entry } from './priest.js';
import { done_object_cleanup } from './end.js';
import { save_regions_data, clear_regions } from './region.js';
import { ECMD_OK, WRITING, FREEING, COUNTING, FULL_MOON, VISITED, LFILE_EXISTS,
         REST_GSTATE, W_BALL, W_CHAIN, Has_contents } from './const.js';
import { save_waterlevel } from './mkmaze.js';
import { ledger_no as ledger_no_sv } from './dungeon.js';

/* C ref: hack.h update_file(), release_data() */
export function update_file(nhfp) { return (nhfp.mode & (COUNTING | WRITING)) !== 0; }
export function release_data(nhfp) { return (nhfp.mode & FREEING) !== 0; }

/* thrown by nh_terminate(): the program has exited (runSegment stops) */
export class NhExit extends Error {
    constructor(status) {
        super(`nh_terminate(${status})`);
        this.nhexit = true;
        this.status = status;
    }
}

const EXIT_SUCCESS = 0;

// C ref: save.c dosave() -- the #save command
export async function dosave() {
    const g = game;

    tty_clear_nhwindow(g.WIN_MESSAGE);
    if ((await tty_yn_function("Really save?", "yn", 'n')) === 'n') { /* y_n() */
        tty_clear_nhwindow(g.WIN_MESSAGE);
        if (g.multi > 0)
            nomul(0);
    } else {
        tty_clear_nhwindow(g.WIN_MESSAGE);
        await pline("Saving...");
        /* program_state.done_hup = 0: no hangup handling */
        if (await dosave0()) {
            g.program_state.savefile_completed = (g.program_state.savefile_completed || 0) + 1;
            g.u.uhp = -1; /* universal game's over indicator */
            /* soundprocs.sound_exit_nhsound: no sound library */

            /* make sure they see the Saving message */
            await tty_display_nhwindow(g.WIN_MESSAGE, true);
            tty_exit_nhwindows("Be seeing you...");
            await nh_terminate(EXIT_SUCCESS);
        } else
            await docrt();
    }
    return ECMD_OK;
}

// C ref: save.c dosave0()
/* returns 1 if save successful */
export async function dosave0() {
    const g = game;
    const u = g.u;
    let res = 0;
    let ltmp;

    g.program_state.saving = (g.program_state.saving || 0) + 1; /* inhibit status and perm_invent updates */
    /* notice_mon_off(): monster noticing isn't ported */
    /* we may get here via hangup signal, in which case we want to fix up
       a few of things before saving so that they won't be restored in
       an improper state; these will be no-ops for normal save sequence */
    u.uinvulnerable = 0;
    if (g.iflags.save_uswallow)
        u.uswallow = 1, g.iflags.save_uswallow = 0;
    if (g.iflags.save_uinwater)
        u.uinwater = 1, g.iflags.save_uinwater = 0; /* bypass set_uinwater() */
    if (g.iflags.save_uburied)
        u.uburied = 1, g.iflags.save_uburied = 0;
    /* extra handling for hangup save or panic save; without this,
       a thrown light source might trigger an "obj_is_local" panic;
       if a thrown or kicked object is in transit, put it on the map;
       when punished, make sure ball and chain are placed too */
    await done_object_cleanup(); /* maybe force some items onto map */

    done: {
        if (!g.program_state.something_worth_saving || !g.SAVEF)
            break done;

        /* fq_save = fqname(gs.SAVEF, SAVEPREFIX, 1); signals: n/a */

        if (g.iflags.window_inited !== false) {
            /* nh_uncompress(fq_save); */
            const onhfp = open_savefile();
            if (onhfp) {
                close_nhfile(onhfp);
                tty_clear_nhwindow(g.WIN_MESSAGE);
                await There("seems to be an old save file.");
                if ((await tty_yn_function("Overwrite the old file?", "yn", 'n')) === 'n') {
                    /* nh_sfconvert(fq_save); nh_compress(fq_save); */
                    break done;
                }
            }
        }

        /* mark_synch(): flush any buffered screen output */

        const nhfp = create_savefile();
        if (!nhfp) {
            await pline("Cannot open save file.");
            delete_savefile(); /* ab@unido */
            break done;
        }

        vision_recalc(2); /* shut down vision to prevent problems
                             in the event of an impossible() call */

        /* undo date-dependent luck adjustments made at startup time */
        if (g.flags.moonphase === FULL_MOON) /* ut-sally!fletcher */
            change_luck(-1);                 /* and unido!ab */
        if (g.flags.friday13)
            change_luck(1);
        if (g.iflags.window_inited !== false)
            tty_clear_nhwindow(g.WIN_MESSAGE);

        nhfp.mode = WRITING | FREEING;
        store_version(nhfp);
        store_plname_in_file(nhfp);
        /* savelev() might save uball and uchain, releasing their memory if
           FREEING, so we need to check their status now; if hero is
           swallowed, uball and uchain will persist beyond saving map floor
           and inventory so these copies of their pointers will be valid
           and savegamestate() will know to save them separately (from floor
           and invent); when not swallowed, uchain will be stale by then,
           and uball will be too if ball is on the floor rather than
           carried */
        g.looseball = BALL_IN_MON() ? g.uball : null;
        g.loosechain = CHAIN_IN_MON() ? g.uchain : null;
        savelev(nhfp, ledger_no(u.uz));
        savegamestate(nhfp);

        /* While copying level files around, zero out u.uz to keep
         * parts of the restore code from completely initializing all
         * in-core data structures, since all we're doing is copying.
         * This also avoids at least one nasty core dump.
         * [gu.uz_save is used by save_bubbles() as well as to restore u.uz]
         */
        g.uz_save = { ...u.uz };
        u.uz.dnum = u.uz.dlevel = 0;
        /* these pointers are no longer valid, and at least u.usteed
         * may mislead place_monster() on other levels
         */
        u.ustuck = null; /* set_ustuck((struct monst *) 0); also clears u.uswallow */
        u.uswallow = 0;
        u.usteed = null;

        for (ltmp = 1; ltmp <= maxledgerno(); ltmp++) {
            if (ltmp === ledger_no(g.uz_save))
                continue;
            if (!(level_info(ltmp).flags & LFILE_EXISTS))
                continue;
            const whynot = { v: '' };
            const onhfp = open_levelfile(ltmp, whynot);
            if (!onhfp) {
                await pline(whynot.v);
                close_nhfile(nhfp);
                delete_savefile();
                throw new Error('dosave0(): done(TRICKED) not ported yet');
            }
            await getlev(onhfp, g.hackpid, ltmp);
            close_nhfile(onhfp);
            Sfo(nhfp, ltmp, "gamestate-level_number");
            savelev(nhfp, ltmp); /* actual level*/
            delete_levelfile(ltmp);
        }
        close_nhfile(nhfp);

        u.uz = g.uz_save;
        g.uz_save = { dnum: 0, dlevel: 0 };

        /* get rid of current level --jgm */
        delete_levelfile(ledger_no(u.uz));
        delete_levelfile(0);
        /* nh_sfconvert(fq_save); nh_compress(fq_save); */
        /* this should probably come sooner... */
        g.program_state.something_worth_saving = 0;
        res = 1;
    }

    /* done: */
    /* notice_mon_on() */
    g.program_state.saving--;
    return res;
}

/* C ref: display.h BALL_IN_MON, CHAIN_IN_MON -- punishment isn't ported,
   so there is no ball or chain to be loose */
function BALL_IN_MON() { return !!(game.uball && game.uball.where === 'OBJ_MINVENT'); }
function CHAIN_IN_MON() { return !!(game.uchain && game.uchain.where === 'OBJ_MINVENT'); }

// C ref: save.c save_gamelog()
function save_gamelog(nhfp) {
    const g = game;
    let tmp = g.gamelog || null;

    while (tmp) {
        const tmp2 = tmp.next;
        if (update_file(nhfp)) {
            Sfo(nhfp, tmp.text.length, "gamelog-length");
            Sfo(nhfp, tmp.text, "gamelog-gamelog_text");
            Sfo(nhfp, { flags: tmp.flags, turn: tmp.turn }, "gamelog-gamelog_line");
        }
        tmp = tmp2;
    }
    if (update_file(nhfp))
        Sfo(nhfp, -1, "gamelog-length");
    if (release_data(nhfp))
        g.gamelog = null;
}

/* C ref: restore.c moves_to_relative_time(), relative_time_to_moves() */
export function moves_to_relative_time(ts) { return ts - game.moves; }
export function relative_time_to_moves(ts) { return game.moves + ts; }

// C ref: save.c savegamestate()
function savegamestate(nhfp) {
    const g = game;
    const ctx = g.context;
    let i;

    g.program_state.saving++; /* caller should/did already set this... */
    Sfo(nhfp, HACK_UID, "gamestate-uid"); /* getuid() */
    Sfo(nhfp, g.nhuuid || '', "nhuuid");
    Sfo(nhfp, g.moves, "gamestate-moves");
    if (ctx.seer_turn !== undefined)
        ctx.seer_turn = moves_to_relative_time(ctx.seer_turn);
    if (ctx.digging?.lastdigtime !== undefined)
        ctx.digging.lastdigtime = moves_to_relative_time(ctx.digging.lastdigtime);
    Sfo(nhfp, ctx, "gamestate-context");
    if (ctx.seer_turn !== undefined)
        ctx.seer_turn = relative_time_to_moves(ctx.seer_turn);
    if (ctx.digging?.lastdigtime !== undefined)
        ctx.digging.lastdigtime = relative_time_to_moves(ctx.digging.lastdigtime);

    Sfo(nhfp, g.flags, "gamestate-flags");
    /* urealtime.finish_time = getnow(); urealtime.realtime += ...:
       the fixed game clock doesn't run, so no time passes */
    if (!g.urealtime) g.urealtime = { realtime: 0, start_timing: 0, finish_time: 0 };
    Sfo(nhfp, g.wreserve || 0, "wreserve");
    Sfo(nhfp, g.wtreserved || 0, "wtreserved");
    Sfo(nhfp, g.u, "gamestate-you");
    Sfo(nhfp, g.ubirthday ?? 0, "gamestate-ubirthday");
    Sfo(nhfp, g.urealtime.realtime, "gamestate-realtime");
    Sfo(nhfp, g.urealtime.start_timing, "gamestate-start_timing");
    /* this is the value to use for the next update of urealtime.realtime */
    g.urealtime.start_timing = g.urealtime.finish_time;
    save_killers(nhfp);

    /* must come before gm.migrating_objs and gm.migrating_mons are freed */
    save_timers(nhfp, 'global');
    save_light_sources(nhfp, 'global');

    /* when FREEING, deletes objects in invent and sets invent to Null;
       pointers into invent (uwep, uarmg, uamul, &c) are set to Null too */
    saveobjchn(nhfp, g, 'invent');

    /* save ball and chain if they happen to be in an unusual state */
    save_bc(nhfp);

    saveobjchn(nhfp, g, 'migrating_objs'); /* frees objs and sets to Null */
    savemonchn(nhfp, g, 'migrating_mons');
    if (release_data(nhfp))
        g.migrating_mons = null;
    Sfo(nhfp, g.mvitals, "gamestate-mvitals");
    save_dungeon(nhfp, update_file(nhfp), release_data(nhfp));
    savelevchn(nhfp);
    Sfo(nhfp, g.quest_status, "gamestate-quest_status");
    Sfo(nhfp, g.spl_book, "gamestate-spl_book");
    save_artifacts(nhfp);
    save_oracles(nhfp);
    Sfo(nhfp, g.pl_character, "gamestate-pl_character");
    Sfo(nhfp, g.pl_fruit, "gamestate-pl_fruit");
    savefruitchn(nhfp);
    savenames(nhfp);
    save_msghistory(nhfp);
    save_gamelog(nhfp);
    save_luadata(nhfp);
    g.program_state.saving--;
}

// C ref: decl.c/end.c save_killers()
function save_killers(nhfp) {
    /* svk.killer: a chain of struct kinfo */
    Sfo(nhfp, game.killer ?? null, "killers");
}

/* save_timers(): timeout.js */
function save_timers(nhfp, range) {
    save_timers_to(nhfp, (range === 'global') ? RANGE_GLOBAL : RANGE_LEVEL);
}

/* save_light_sources(): light.js */
function save_light_sources(nhfp, range) {
    save_light_sources_to(nhfp, (range === 'global') ? RANGE_GLOBAL : RANGE_LEVEL);
}

// C ref: dungeon.c save_dungeon()
function save_dungeon(nhfp, perform_write, free_data) {
    const g = game;
    if (perform_write) {
        Sfo(nhfp, g.n_dgns, "dungeon_count");
        Sfo(nhfp, g.dungeons, "dungeon");
        Sfo(nhfp, g.dungeon_topology, "svd.dungeon_topology");
        Sfo(nhfp, g.tune, "tune");
        Sfo(nhfp, g.branches, "branch");
        Sfo(nhfp, maxledgerno(), "level_info_count");
        Sfo(nhfp, g.level_info ?? null, "svl.level_info");
        Sfo(nhfp, g.inv_pos ?? null, "svi.inv_pos");
        let count, curr_ms;
        for (count = 0, curr_ms = g.mapseenchn ?? null; curr_ms;
             curr_ms = curr_ms.next)
            count++;
        Sfo(nhfp, count, "mapseen_count");
        for (curr_ms = g.mapseenchn ?? null; curr_ms; curr_ms = curr_ms.next)
            save_mapseen(nhfp, curr_ms);
    }
    if (free_data) {
        g.branches = null;
        g.mapseenchn = null;
    }
}

// C ref: artifact.c save_artifacts()
function save_artifacts(nhfp) {
    Sfo(nhfp, game.artiexist, "artifact-artiexist");
    Sfo(nhfp, game.artidisco, "artifact-artidisco");
}

// C ref: rumors.c save_oracles()
function save_oracles(nhfp) {
    const g = game;
    if (update_file(nhfp)) {
        Sfo(nhfp, g.oracle_cnt || 0, "oracle-oracle_cnt");
        if (g.oracle_cnt)
            Sfo(nhfp, g.oracle_loc, "oracle-oracle_loc");
    }
    if (release_data(nhfp)) {
        if (g.oracle_cnt) {
            g.oracle_loc = null;
            g.oracle_cnt = 0;
            g.oracle_flg = 0;
        }
    }
}

// C ref: o_init.c savenames()
function savenames(nhfp) {
    const g = game;
    if (update_file(nhfp)) {
        Sfo(nhfp, g.bases, "names-bases");
        Sfo(nhfp, g.disco, "names-disco");
        for (let i = 0; i < NUM_OBJECTS; ++i) {
            /* struct objclass, without oc_uname (saved below) */
            const oc = {};
            for (const k of Object.keys(objects[i]))
                if (k !== 'oc_uname')
                    oc[k] = objects[i][k];
            Sfo(nhfp, oc, "names-objclass");
        }
    }
    /* as long as we use only one version of Hack we
       need not save oc_name and oc_descr, but we must save
       oc_uname for all objects */
    for (let i = 0; i < NUM_OBJECTS; i++)
        if (objects[i].oc_uname) {
            if (update_file(nhfp)) {
                Sfo(nhfp, i, "names-len");
                Sfo(nhfp, objects[i].oc_uname, "names-oc_uname");
            }
            if (release_data(nhfp))
                objects[i].oc_uname = null;
        }
    if (update_file(nhfp))
        Sfo(nhfp, -1, "names-len");
}

// C ref: nhlua.c save_luadata() -- get_nh_lua_variables() is the
// stringified nh_lua_variables table; JS saves the table itself
function save_luadata(nhfp) {
    const L = game.luacore;
    const lua_data = L?.globals?.nh_lua_variables ?? null;
    Sfo(nhfp, lua_data, "luadata");
}

// C ref: save.c savelev()
export function savelev(nhfp, lev) {
    const g = game;
    const set_uz_save = (!g.uz_save || (g.uz_save.dnum === 0 && g.uz_save.dlevel === 0));

    /* caller might have already set up gu.uz_save and zeroed u.uz;
       if not, we need to set it for save_bubbles(); caveat: if the
       player quits during character selection, u.uz won't be set yet
       but we'll be called during run-down */
    if (set_uz_save && (nhfp.mode & (COUNTING | WRITING))) {
        if (g.u.uz.dnum === 0 && g.u.uz.dlevel === 0) {
            g.program_state.something_worth_saving = 0;
            throw new Error('savelev: where are we?'); /* panic() */
        }
        g.uz_save = { ...g.u.uz };
    }

    savelev_core(nhfp, lev);

    if (set_uz_save)
        g.uz_save = { dnum: 0, dlevel: 0 }; /* unset */
}

/* JS GameMap fields saved by their own C steps in savelev_core(); the
   level's other fields are saved together ("lev-js") */
const LEVEL_SAVED_FIELDS = new Set([
    'locations', 'lastseentyp', 'flags', 'doors', 'doorindex', 'rooms',
    'nroom', 'subrooms', 'nsubroom', 'monsters', 'traps', 'objects',
    'buriedobjlist', 'head_engr', 'damagelist', 'regions', 'bonesinfo',
    'timer_base', 'light_base',
    'wsegs', /* worm tail cells of level.monsters[][]: rebuilt by getlev() */
]);

// C ref: save.c savelev_core()
function savelev_core(nhfp, lev) {
    const g = game;
    const L = g.level;

    g.program_state.saving++; /* even if current mode is FREEING */

    if (!nhfp)
        throw new Error('Save on bad file!'); /* impossible */
    /*
     *  Level file contents:
     *    version info (handled by caller);
     *    save file info (compression type; also by caller);
     *    process ID;
     *    internal level number (ledger number);
     *    bones info;
     *    actual level data.
     */
    if (nhfp.mode !== FREEING) {
        /* WRITING (probably ORed with FREEING), or COUNTING */

        /* purge any dead monsters (necessary if we're starting
           a panic save rather than a normal one, or sometimes
           when changing levels without taking time -- e.g.
           create statue trap then immediately level teleport) */
        if (g.purge_monsters) /* iflags.purge_monsters */
            dmonsfree();
        /* clear objs_deleted list too: dobjsfree() -- no deferred object
           deletion in the JS port */

        if (lev >= 0 && lev <= maxledgerno())
            level_info(lev).flags |= VISITED;
        Sfo(nhfp, g.hackpid || 0, "gamestate-hackpid");
        Sfo(nhfp, lev, "gamestate-dlvl");
    }

    /* bones info comes before level data */
    savecemetery(nhfp, L, 'bonesinfo');
    if (nhfp.mode !== FREEING) {
        savelevl(nhfp);
        Sfo(nhfp, L.lastseentyp ?? null, "lastseentyp");
        /* svm.moves will actually be read back into svo.omoves on restore */
        Sfo(nhfp, g.moves, "lev-timestmp");
        save_stairs(nhfp);
        Sfo(nhfp, g.updest ?? null, "lev-updest");
        Sfo(nhfp, g.dndest ?? null, "lev-dndest");
        save_adjust_levelflags();
        Sfo(nhfp, L.flags, "lev-level_flags");
        rest_adjust_levelflags();

        Sfo(nhfp, L.doors ?? [], "lev-doors");
        Sfo(nhfp, L.doorindex ?? 0, "lev-doorindex");
        save_rooms(nhfp); /* no dynamic memory to reclaim */
        /* the JS level's own fields that C keeps in other globals */
        const extra = {};
        for (const k of Object.keys(L))
            if (!LEVEL_SAVED_FIELDS.has(k))
                extra[k] = L[k];
        Sfo(nhfp, extra, "lev-js");
    }

    /* from here on out, saving also involves allocated memory cleanup */
    /* skip_lots: */
    /* timers and lights must be saved before monsters and objects */
    save_timers(nhfp, 'level');
    save_light_sources(nhfp, 'level');

    savemonchn(nhfp, g, 'fmon');
    save_worm(nhfp); /* save worm information */
    savetrapchn(nhfp, L, 'traps');
    saveobjchn(nhfp, L, 'objects');
    saveobjchn(nhfp, L, 'buriedobjlist');
    saveobjchn(nhfp, g, 'billobjs');
    save_engravings(nhfp);
    savedamage(nhfp); /* pending shop wall and/or floor repair */
    save_regions(nhfp);
    save_bubbles(nhfp, lev); /* for water and air */
    save_exclusions(nhfp);
    save_track(nhfp);

    g.program_state.saving--;
    if (release_data(nhfp)) {
        /* clear_level_structures(); gf.ftrap = 0; gb.billobjs = 0;
           memset(svr.rooms, 0, ...) */
        const oldlev = g.level;
        g.fmon = null;
        g.level = new GameMap();
        gbuf_keep(oldlev); /* gg.gbuf isn't part of the level */
        g.stairs = null;
        g.billobjs = null;
    }
}

// C ref: save.c save_adjust_levelflags()
function save_adjust_levelflags() {
    const lf = game.level.flags;
    /* adjust any timestamps */
    if (lf.stasis_until !== undefined)
        lf.stasis_until = moves_to_relative_time(lf.stasis_until);
}

// C ref: restore.c rest_adjust_levelflags()
export function rest_adjust_levelflags() {
    const lf = game.level.flags;
    /* adjust timestamps */
    if (lf.stasis_until !== undefined)
        lf.stasis_until = relative_time_to_moves(lf.stasis_until);
}

/* struct rm fields that are the tty's screen buffer, not level data */
const RM_DISPLAY_FIELDS = new Set(['disp_ch', 'disp_color', 'disp_decgfx',
                                   'disp_attr', 'disp_objpile', 'gnew',
                                   'glyph_symidx']);

// C ref: save.c savelevl()
function savelevl(nhfp) {
    const L = game.level;
    const rows = [];
    for (let x = 0; x < L.locations.length; x++) {
        const col = [];
        for (let y = 0; y < L.locations[x].length; y++) {
            const loc = L.locations[x][y];
            const rm = {};
            for (const k of Object.keys(loc)) {
                const d = Object.getOwnPropertyDescriptor(loc, k);
                if (d.get || RM_DISPLAY_FIELDS.has(k)) continue;
                rm[k] = d.value;
            }
            col.push(rm);
        }
        rows.push(col);
    }
    Sfo(nhfp, rows, "location-rm");
}

// C ref: save.c savecemetery()
/* used when saving a level and also when saving dungeon overview data */
export function savecemetery(nhfp, holder, key) {
    if (update_file(nhfp))
        Sfo(nhfp, holder[key] ?? null, "cemetery-bonesinfo");
    if (release_data(nhfp))
        holder[key] = null;
}

// C ref: save.c savedamage()
function savedamage(nhfp) {
    const L = game.level;
    if (update_file(nhfp))
        Sfo(nhfp, L.damagelist ?? null, "damage");
    if (release_data(nhfp))
        L.damagelist = null;
}

// C ref: save.c save_stairs()
function save_stairs(nhfp) {
    const g = game;
    let stway = g.stairs;
    const list = [];

    while (stway) {
        if (update_file(nhfp)) {
            const use_relative = (g.program_state.restoring !== REST_GSTATE
                                  && stway.tolev.dnum === g.u.uz.dnum);
            const s = { ...stway, tolev: { ...stway.tolev } };
            delete s.next;
            if (use_relative) {
                /* make dlevel relative to current level */
                s.tolev.dlevel -= g.u.uz.dlevel;
            }
            list.push(s);
        }
        stway = stway.next;
    }
    if (update_file(nhfp))
        Sfo(nhfp, list, "stairs-stairway");
}

// C ref: mkroom.c save_rooms()
function save_rooms(nhfp) {
    const L = game.level;
    /* First, write the number of rooms */
    Sfo(nhfp, L.nroom, "room-nroom");
    Sfo(nhfp, { rooms: L.rooms, subrooms: L.subrooms ?? [], nsubroom: L.nsubroom ?? 0 },
        "room-mkroom");
}


// C ref: engrave.c save_engravings()
function save_engravings(nhfp) {
    const L = game.level;
    if (update_file(nhfp))
        Sfo(nhfp, L.head_engr ?? null, "engravings");
    if (release_data(nhfp))
        L.head_engr = null;
}

// C ref: region.c save_regions()
function save_regions(nhfp) {
    if (update_file(nhfp))
        /* timestamp, then the regions (region-tmstamp, region-region_count,
           region-*) */
        Sfo(nhfp, save_regions_data(), "regions");
    if (release_data(nhfp))
        clear_regions();
}

// C ref: save.c save_bubbles() -- Plane of Water's air bubbles and Plane
// of Air's clouds
function save_bubbles(nhfp, lev) {
    let bbubbly;
    const topo = game.dungeon_topology;

    /* air bubbles and clouds; the caller passes the ledger number because
       u.uz and ledger_no() aren't available to it yet */
    bbubbly = 0;
    if (lev === ledger_no_sv(topo.d_water_level) || lev === ledger_no_sv(topo.d_air_level))
        bbubbly = lev; /* non-zero */
    if (update_file(nhfp))
        Sfo(nhfp, bbubbly, "bubbles-bbubbly");

    if (bbubbly)
        save_waterlevel(nhfp); /* save air bubbles or clouds */
}

// C ref: decl.c/mklev.c save_exclusions()
function save_exclusions(nhfp) {
    const g = game;
    if (update_file(nhfp))
        Sfo(nhfp, g.exclusion_zones ?? null, "exclusion_zones");
    if (release_data(nhfp))
        g.exclusion_zones = null;
}

// C ref: track.c save_track()
function save_track(nhfp) {
    const g = game;
    if (update_file(nhfp))
        Sfo(nhfp, g._track ?? null, "track");
    if (release_data(nhfp))
        g._track = { utcnt: 0, utpnt: 0, utrack: g._track?.utrack?.map(() => ({ x: 0, y: 0 })) ?? [] };
}

// C ref: save.c save_bc()
/* if ball and/or chain are loose, make an object chain for it/them and
   save that separately from other objects */
function save_bc(nhfp) {
    const g = game;
    const bc = { bc_objs: [] };

    if (g.loosechain) {
        bc.bc_objs.unshift(g.loosechain); /* uchain */
        if (nhfp.mode & FREEING) {
            setworn(null, W_CHAIN); /* sets 'uchain' to Null */
            g.loosechain = null;
        }
    }
    if (g.looseball) {
        bc.bc_objs.unshift(g.looseball);
        if (nhfp.mode & FREEING) {
            setworn(null, W_BALL); /* sets 'uball' to Null */
            g.looseball = null;
        }
    }
    saveobjchn(nhfp, bc, 'bc_objs'); /* frees objs in list, sets bc_objs to Null */
}

/* fields of struct obj that are links C rebuilds on restore */
const OBJ_LINK_FIELDS = new Set(['nobj', 'nexthere', 'cobj', 'ocontainer',
                                 'ocarry', 'oextra']);

// C ref: save.c saveobj()
/* save one object;
   caveat: this is only for update_file(); caller handles release_data() */
function saveobj(nhfp, otmp) {
    Sfo(nhfp, 1, "obj-obj_length"); /* buflen */
    const o = {};
    for (const k of Object.keys(otmp))
        if (!OBJ_LINK_FIELDS.has(k))
            o[k] = otmp[k];
    /* being non-null is key to restoring container contents */
    o.cobj = Has_contents(otmp) ? true : null;
    o.oextra = otmp.oextra ? true : null;
    Sfo(nhfp, o, "obj", true);
    if (otmp.oextra) {
        /* oname, omailcmd, omid (and anything else the JS oextra holds) */
        const ox = {};
        for (const k of Object.keys(otmp.oextra))
            if (k !== 'omonst')
                ox[k] = otmp.oextra[k];
        Sfo(nhfp, ox, "obj-oextra");
        /* defer to savemon() for this one */
        if (otmp.oextra.omonst) {
            Sfo(nhfp, 1, "obj-omonst_length");
            savemon(nhfp, otmp.oextra.omonst);
        } else {
            Sfo(nhfp, 0, "obj-omonst_length");
        }
    }
}

/* the members of an object or monster chain, and its JS shape */
function chain_list(head, link) {
    if (!head) return { shape: 'list', list: [] };
    if (Array.isArray(head)) return { shape: 'array', list: head.slice() };
    const list = [];
    for (let p = head; p; p = p[link]) list.push(p);
    return { shape: 'list', list };
}

// C ref: save.c saveobjchn()
/* save an object chain; sets head of list to Null when done;
   handles release_data() for each object in the list */
export function saveobjchn(nhfp, holder, key) {
    const g = game;
    const ctx = g.context;
    const { shape, list } = chain_list(holder[key], 'nobj');
    const is_invent = (holder === g && key === 'invent');

    if (update_file(nhfp))
        Sfo(nhfp, shape, "obj-chain_shape");
    for (const otmp of list) {
        if (update_file(nhfp))
            saveobj(nhfp, otmp);
        if (Has_contents(otmp))
            saveobjchn(nhfp, otmp, 'cobj');
        if (release_data(nhfp)) {
            /*
             * If these are on the floor, the discarding could be
             * due to game save, or we could just be changing levels.
             * Always invalidate the pointer, but ensure that we have
             * the o_id in order to restore the pointer on reload.
             */
            if (ctx.victual && otmp === ctx.victual.piece) {
                ctx.victual.o_id = otmp.o_id;
                ctx.victual.piece = null;
            }
            if (ctx.tin && otmp === ctx.tin.tin) {
                ctx.tin.o_id = otmp.o_id;
                ctx.tin.tin = null;
            }
            if (ctx.spbook && otmp === ctx.spbook.book) {
                ctx.spbook.o_id = otmp.o_id;
                ctx.spbook.book = null;
            }
            otmp.where = 'OBJ_FREE'; /* set to free so dealloc will work */
            otmp.nobj = null;        /* nobj saved into otmp2 */
            otmp.cobj = null;        /* contents handled above */
            otmp.timed = 0;          /* not timed any more */
            otmp.lamplit = 0;        /* caller handled lights */
            otmp.leashmon = 0;       /* mon->mleashed could still be set */
            /* clear 'uball' and 'uchain' pointers if resetting their mask;
               could also do same for other worn items but don't need to */
            if ((otmp.owornmask & (W_BALL | W_CHAIN)) !== 0)
                setworn(null, otmp.owornmask & (W_BALL | W_CHAIN));
            otmp.owornmask = 0;      /* no longer care */
            /* dealloc_obj(otmp): garbage collected */
        }
    }
    if (update_file(nhfp))
        Sfo(nhfp, -1, "obj-obj_length");
    if (release_data(nhfp)) {
        if (is_invent)
            allunworn(); /* clear uwep, uarm, uball, &c pointers */
        holder[key] = null;
    }
}

// C ref: worn.c allunworn()
function allunworn() {
    const g = game;
    g.u.twoweap = 0; /* uwep and uswapwep are going away */
    /* remove stale pointers; called after the objects have been freed
       (without first being unworn) while saving invent during game save */
    for (const w of ['uarm', 'uarmc', 'uarmh', 'uarms', 'uarmg', 'uarmf',
                     'uarmu', 'uleft', 'uright', 'uwep', 'uswapwep',
                     'uquiver', 'uamul', 'ublindf', 'uball', 'uchain'])
        g[w] = null;
}

/* fields of struct monst that are links C rebuilds on restore */
const MON_LINK_FIELDS = new Set(['nmon', 'minvent', 'data']);

/* the pet's struct edog, wherever the JS monster keeps it */
export function edog_of(mtmp) { return mtmp.mextra?.edog || mtmp.edog || null; }

// C ref: save.c savemon()
function savemon(nhfp, mtmp) {
    mtmp.mtemplit = 0; /* normally clear; if set here then a panic save
                        * is being written while bhit() was executing */
    Sfo(nhfp, 1, "monst-monst_length"); /* buflen */
    const edog = edog_of(mtmp);
    if (edog) {
        /* we only store relative times in save and bones */
        edog.droptime = moves_to_relative_time(edog.droptime);
        edog.hungrytime = moves_to_relative_time(edog.hungrytime);
    }
    const m = {};
    for (const k of Object.keys(mtmp))
        if (!MON_LINK_FIELDS.has(k))
            m[k] = mtmp[k];
    m.minvent = mtmp.minvent ? true : null;
    Sfo(nhfp, m, "monst", true);
    if (edog) {
        edog.droptime = relative_time_to_moves(edog.droptime);
        edog.hungrytime = relative_time_to_moves(edog.hungrytime);
    }
}

// C ref: save.c savemonchn()
function savemonchn(nhfp, holder, key) {
    const g = game;
    const { shape, list } = chain_list(holder[key], 'nmon');

    if (update_file(nhfp))
        Sfo(nhfp, shape, "monst-chain_shape");
    for (const mtmp of list) {
        if (update_file(nhfp)) {
            mtmp.mnum = monsndx(mtmp.data);
            if (mtmp.ispriest)
                forget_temple_entry(mtmp); /* EPRI() */
            savemon(nhfp, mtmp);
        }
        if (mtmp.minvent)
            saveobjchn(nhfp, mtmp, 'minvent');
        if (release_data(nhfp)) {
            const pa = g.context.polearm;
            if (pa && mtmp === pa.hitmon) {
                pa.m_id = mtmp.m_id;
                pa.hitmon = null;
            }
            if (mtmp === g.u.ustuck)
                g.u.ustuck_mid = g.u.ustuck.m_id;
            if (mtmp === g.u.usteed)
                g.u.usteed_mid = g.u.usteed.m_id;
            mtmp.nmon = null; /* nmon saved into mtmp2 */
            /* dealloc_monst(mtmp): garbage collected */
        }
    }
    if (update_file(nhfp))
        Sfo(nhfp, -1, "monst-monst_length");
}

// C ref: save.c savetrapchn()
/* save traps; gf.ftrap is the only trap chain so 2nd arg is superfluous */
function savetrapchn(nhfp, holder, key) {
    const g = game;
    const traps = holder[key] || [];

    for (const trap of traps) {
        const use_relative = (g.program_state.restoring !== REST_GSTATE
                              && trap.dst && trap.dst.dnum === g.u.uz.dnum);
        const t = { ...trap };
        delete t.ntrap;
        if (use_relative)
            t.dst = { ...trap.dst, dlevel: trap.dst.dlevel - g.u.uz.dlevel }; /* make it relative */
        if (update_file(nhfp))
            Sfo(nhfp, t, "trap");
    }
    if (update_file(nhfp))
        Sfo(nhfp, { tx: 0 }, "trap"); /* zerotrap */
    if (release_data(nhfp))
        holder[key] = [];
}

// C ref: save.c savefruitchn()
/* save all the fruit names and ID's; this is used only in saving whole games
 * (not levels) and in saving bones levels.
 */
export function savefruitchn(nhfp) {
    const g = game;
    let f1 = g.ffruit;
    while (f1) {
        const f2 = f1.nextf;
        if (f1.fid >= 0 && update_file(nhfp))
            Sfo(nhfp, { fname: f1.fname, fid: f1.fid }, "fruit");
        f1 = f2;
    }
    if (update_file(nhfp))
        Sfo(nhfp, { fname: '', fid: 0 }, "fruit"); /* zerofruit */
    if (release_data(nhfp))
        g.ffruit = null;
}

// C ref: save.c savelevchn()
function savelevchn(nhfp) {
    const g = game;
    const list = [];
    for (let tmplev = g.sp_levchn; tmplev; tmplev = tmplev.next) {
        const s = { ...tmplev };
        delete s.next;
        list.push(s);
    }
    if (update_file(nhfp)) {
        Sfo(nhfp, list.length, "levchn-lev_count");
        for (const s of list)
            Sfo(nhfp, s, "levchn-s_level");
    }
    if (release_data(nhfp))
        g.sp_levchn = null;
}

// C ref: save.c store_plname_in_file()
/* write "name-role-race-gend-algn" into save file for menu-based restore;
   the first dash is actually stored as '\0' instead of '-' */
function store_plname_in_file(nhfp) {
    const g = game;
    /* augment svp.plname[]; the gender and alignment values reflect those
       in effect at time of saving rather than at start of game */
    let hero = `${g.plname}-${g.urole.filecode.slice(0, 3)}`
               + `-${g.urace.filecode.slice(0, 3)}`
               + `-${genders[g.flags.female ? 1 : 0].filecode.slice(0, 3)}`
               + `-${aligns[1 - g.u.ualign.type].filecode.slice(0, 3)}`;
    /* replace "-role-race..." with "\0role-race..." so that we can include
       or exclude the role-&c suffix easily */
    hero = hero.slice(0, g.plname.length) + '\0' + hero.slice(g.plname.length + 1);
    /* insert playmode into final slot of hero[] */
    const playmode = g.flags.debug ? 'D' : g.flags.explore ? 'X' : '-';
    Sfo(nhfp, { hero, playmode }, "plname");
}

// C ref: save.c save_msghistory()
function save_msghistory(nhfp) {
    let msg;
    let init = true;
    const msgs = [];

    if (update_file(nhfp)) {
        /* ask window port for each message in sequence */
        while ((msg = tty_getmsghistory(init)) !== null) {
            init = false;
            if (msg.length < 1)
                continue;
            msgs.push(msg);
        }
        Sfo(nhfp, msgs, "msghistory-msg");
    }
    /* note: we don't attempt to handle release_data() here */
}

// C ref: end.c nh_terminate()
export async function nh_terminate(status) {
    const g = game;
    g.program_state.in_moveloop = 0; /* won't be returning to normal play */

    /* NOMUX_CAPTURE: the recorder captures the final screen once, at
       this point, since after death/quit/save there's no further nhgetch
       (nomux_capture_write_input_boundary()) */
    if (g._preNhgetchHook)
        await g._preNhgetchHook();

    /* l_nhcore_call(NHCORE_GAME_EXIT): nhcore.lua registers no exit
       callback; freedynamicdata(), dlb_cleanup(), l_nhcore_done():
       nothing to release in JS */
    g.program_state.exiting = 1;
    throw new NhExit(status); /* nethack_exit(status) */
}
