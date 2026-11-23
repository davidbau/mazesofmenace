// restore.js — restoring a saved game at startup and reading level files.
// C ref: restore.c dorecover(), restgamestate(), restlevelstate(),
// restlevelfile(), getlev(), rest_levl(), rest_stairs(), restcemetery(),
// restdamage(), restobj(), restobjchn(), restmon(), restmonchn(),
// restlevchn(), loadfruitchn(), freefruitchn(), find_lev_obj(),
// inven_inuse(), get_plname_from_file(), restore_msghistory(),
// restore_gamelog(); plus the restore halves of dungeon.c
// restore_dungeon(), o_init.c restnames(), artifact.c
// restore_artifacts(), rumors.c restore_oracles(), mkroom.c rest_rooms(),
// nhlua.c restore_luadata() and mon.c restore_cham().
//
// Object and monster links that C keeps as ids (u.ustuck_mid,
// context.victual.o_id, ...) come back from sfbase.js as fixups, which
// resolve_saved_ids() points at the restored objects and monsters, the
// way C re-links them by id.

import { game } from './gstate.js';
import { restshk, set_residency } from './shk.js';
import { restpriest } from './priest.js';
import { Sfi, Sf_eof, rewind_nhfile, close_nhfile } from './sfbase.js';
import { restore_timers as restore_timers_from, run_timers, relink_timers } from './timeout.js';
import { restore_light_sources as restore_light_sources_from, relink_light_sources } from './light.js';
import { RANGE_GLOBAL, RANGE_LEVEL } from './const.js';
import { create_levelfile, delete_savefile, get_freeing_nhfile, validate,
         HACK_UID } from './files.js';
import { savelev, rest_adjust_levelflags, relative_time_to_moves,
         savefruitchn } from './save.js';
import { GameMap, makeLocation } from './game.js';
import { mons, M1_CONCEAL } from './monsters.js';
import { objects, NUM_OBJECTS, PICK_AXE, GRAPPLING_HOOK } from './objects.js';
import { ledger_no, assign_level, load_mapseen } from './dungeon.js';
import { stairway_add } from './mklev.js';
import { stairway_at } from './display.js';
import { place_monster, pm_to_cham, hideunder } from './makemon.js';
import { rest_worm, place_wsegs } from './worm.js';
import { set_ustuck } from './uhitm.js';
import { monsndx } from './mondata.js';
import { rnd } from './rng.js';
import { hide_monst } from './mon.js';
import { mon_catchup_elapsed_time } from './dog.js';
import { rest_regions_data } from './region.js';
import { role_init } from './role.js';
import { set_playmode } from './options.js';
import { set_uasmon } from './polyself.js';
import { setworn } from './worn.js';
import { setuwep } from './wield.js';
import { init_oclass_probs } from './o_init.js';
import { max_rank_sz } from './botl.js';
import { adj_erinys } from './attrib.js';
import { vision_reset } from './vision.js';
import { docrt, pline } from './display.js';
import { tty_clear_nhwindow, tty_display_nhwindow, tty_putmsghistory } from './wintty.js';
import { welcome } from './allmain.js';
import { check_special_room } from './hack.js';
import { l_nhcore_init } from './nhlua.js';
import { NHF_BONESFILE, REST_GSTATE, REST_LEVELS, REST_CURRENT_LEVEL, WRITING,
         FREEING, W_WEP, W_BALL, W_CHAIN, NON_PM,
         PROT_FROM_SHAPE_CHANGERS, ismnum, DEFUNCT_MONSTER, MAGIC_PORTAL,
         TRICKED } from './const.js';
import { next_ident } from './mkobj.js';
import { propagate, peace_minded, set_malign } from './makemon.js';
import { Is_branchlev, on_level } from './dungeon.js';
import { mazexy } from './mkmaze.js';
import { BR_STAIR, BR_NO_END1, BR_NO_END2, BR_PORTAL, STAIRS } from './const.js';
import { deltrap } from './trap.js';
import { killer } from './topten.js';
import { done } from './end.js';
import { fruitadd } from './options.js';
import { SLIME_MOLD, BRASS_LANTERN, OIL_LAMP, CANDELABRUM_OF_INVOCATION,
         TALLOW_CANDLE, WAX_CANDLE, POT_OIL } from './objects.js';
import { S_UNICORN, M2_JEWELS } from './monsters.js';

/* obj.h age_is_relative() */
function age_is_relative(otmp) {
    return (otmp.otyp === BRASS_LANTERN || otmp.otyp === OIL_LAMP
            || otmp.otyp === CANDELABRUM_OF_INVOCATION
            || otmp.otyp === TALLOW_CANDLE || otmp.otyp === WAX_CANDLE
            || otmp.otyp === POT_OIL);
}
/* mondata.h is_unicorn() */
function is_unicorn(ptr) {
    return ptr.mlet === S_UNICORN && (ptr.mflags2 & M2_JEWELS) !== 0;
}

// ---------------------------------------------------------------------
// id links

/* every object and monster now restored, by id */
function saved_id_maps() {
    const g = game;
    const objs = new Map(), mons_ = new Map();
    const addobjs = (chain) => {
        const list = !chain ? [] : Array.isArray(chain) ? chain
                     : (() => { const l = []; for (let o = chain; o; o = o.nobj) l.push(o); return l; })();
        for (const o of list) {
            if (!o) continue;
            objs.set(o.o_id, o);
            if (o.cobj) addobjs(o.cobj);
            if (o.oextra?.omonst) addmon(o.oextra.omonst);
        }
    };
    const addmon = (m) => {
        mons_.set(m.m_id, m);
        if (m.minvent) addobjs(m.minvent);
    };
    const addmons = (head) => { for (let m = head; m; m = m.nmon) addmon(m); };
    addobjs(g.invent);
    addobjs(g.migrating_objs);
    if (g.level) {
        addobjs(g.level.objects);
        addobjs(g.level.buriedobjlist);
    }
    addobjs(g.billobjs);
    addmons(g.fmon);
    addmons(g.migrating_mons);
    addmons(g.mydogs);
    return { objs, mons: mons_ };
}

/* point the links read since fixups[from] at what they name; links read
   from a bones file hold the old game's ids, which getlev() renumbered
   (the id mapping) */
function resolve_saved_ids(nhfp, from = 0) {
    const fixups = nhfp.fixups.splice(from);
    if (!fixups.length) return;
    const ghostly = (nhfp.ftype === NHF_BONESFILE);
    const { objs, mons: monmap } = saved_id_maps();
    for (const f of fixups) {
        let id = f.id;
        if (ghostly) {
            const nid = { v: 0 };
            id = lookup_id_mapping(id, nid) ? nid.v : -1;
        }
        const v = (f.kind === 'O' ? objs.get(id) : monmap.get(id)) || null;
        if (f.holder instanceof Map)
            f.holder.set(f.key, v);
        else
            f.holder[f.key] = v;
    }
}

// ---------------------------------------------------------------------

// C ref: restore.c find_lev_obj()
/* Recalculate svl.level.objects[x][y], since this info was not saved. */
function find_lev_obj() {
    const g = game;
    /* the JS floor chain is also the per-square piles (read top first),
       so reversing the chain and placing each object again leaves it as
       it was; the ball and chain fixup still applies */
    for (const otmp of (g.level.objects || []).slice().reverse()) {
        otmp.where = 'OBJ_FLOOR';
        /* fixup(s) performed when restoring the level that the hero
           is on, rather than just an arbitrary one */
        if (g.u.uz?.dlevel) { /* 0 during full restore until current level */
            /* handle uchain and uball when they're on the floor */
            if (otmp.owornmask & (W_BALL | W_CHAIN))
                setworn(otmp, otmp.owornmask);
        }
    }
}

// C ref: restore.c inven_inuse()
/* Things that were marked "in_use" when the game was saved (ex. via the
 * infamous "HUP" cheat) get used up here.
 */
export async function inven_inuse(quietly) {
    for (let otmp = game.invent; otmp; otmp = otmp.nobj) {
        if (otmp.in_use) {
            void quietly;
            throw new Error('inven_inuse(): useup() of an in-use object not ported yet');
        }
    }
}

// C ref: restore.c restlevchn()
function restlevchn(nhfp) {
    const g = game;
    g.sp_levchn = null;
    let cnt = Sfi(nhfp, "levchn-lev_count");
    let last = null;
    for (; cnt > 0; cnt--) {
        const tmplev = Sfi(nhfp, "levchn-s_level");
        tmplev.next = null;
        if (!g.sp_levchn)
            g.sp_levchn = tmplev;
        else
            last.next = tmplev;
        last = tmplev;
    }
}

// C ref: restore.c restdamage()
function restdamage(nhfp) {
    const ghostly = (nhfp.ftype === NHF_BONESFILE);
    const dl = Sfi(nhfp, "damage");
    if (dl !== null && dl !== undefined) {
        if (ghostly) {
            const list = Array.isArray(dl) ? dl : [];
            if (!Array.isArray(dl))
                for (let d = dl; d; d = d.next) list.push(d);
            for (const tmp_dam of list)
                tmp_dam.when += (game.moves - game.omoves);
        }
        game.level.damagelist = dl;
    }
}

// C ref: restore.c restobj()
/* restore one object */
function restobj(nhfp) {
    const otmp = Sfi(nhfp, "obj");
    otmp.lua_ref_cnt = 0;
    /* next object pointers are invalid; otmp->cobj needs to be left
       as is--being non-null is key to restoring container contents */
    otmp.nobj = null;
    if ('nexthere' in otmp) otmp.nexthere = null;
    /* non-null oextra needs to be reconstructed */
    if (otmp.oextra) {
        otmp.oextra = Sfi(nhfp, "obj-oextra");
        /* omonst - corpse or statue might retain full monster details */
        const buflen = Sfi(nhfp, "obj-omonst_length");
        if (buflen > 0) {
            /* this is actually a monst struct, so we
               can just defer to restmon() here; savemon() wrote its own
               "monst-monst_length" record ahead of the monst (C's binary
               save reads that int as the omonst length) */
            Sfi(nhfp, "monst-monst_length");
            otmp.oextra.omonst = restmon(nhfp);
        }
    } else
        delete otmp.oextra;
    return otmp;
}

/* rebuild a chain in the JS shape it was saved in */
function make_chain(shape, list, link) {
    if (shape === 'array')
        return list;
    for (let i = 0; i < list.length; i++)
        list[i][link] = list[i + 1] || null;
    return list[0] || null;
}

// C ref: restore.c restobjchn()
function restobjchn(nhfp, frozen) {
    const g = game;
    const ctx = g.context;
    const ghostly = (nhfp.ftype === NHF_BONESFILE);
    const shape = Sfi(nhfp, "obj-chain_shape");
    const list = [];

    while (1) {
        const buflen = Sfi(nhfp, "obj-obj_length");
        if (buflen === -1)
            break;

        const otmp = restobj(nhfp);
        list.push(otmp);

        if (ghostly) {
            const nid = next_ident();

            add_id_mapping(otmp.o_id, nid);
            otmp.o_id = nid;
        }
        if (ghostly && otmp.otyp === SLIME_MOLD)
            ghostfruit(otmp);
        /* Ghost levels get object age shifted from old player's clock
         * to new player's clock.  Assumption: new player arrived
         * immediately after old player died.
         */
        if (ghostly && !frozen && !age_is_relative(otmp))
            otmp.age = g.moves - g.omoves + otmp.age;

        /* get contents of a container or statue */
        if (otmp.cobj) { /* Has_contents(otmp) */
            otmp.cobj = restobjchn(nhfp, otmp.otyp === 0 /* Is_IceBox() */ && false);
            /* restore container back pointers */
            const contents = Array.isArray(otmp.cobj) ? otmp.cobj
                : (() => { const l = []; for (let o = otmp.cobj; o; o = o.nobj) l.push(o); return l; })();
            for (const otmp3 of contents)
                otmp3.ocontainer = otmp;
        } else
            otmp.cobj = null;

        if (otmp.bypass)
            otmp.bypass = 0;
        if (!ghostly && ctx) {
            /* fix the pointers */
            if (ctx.victual && otmp.o_id === ctx.victual.o_id)
                ctx.victual.piece = otmp;
            if (ctx.tin && otmp.o_id === ctx.tin.o_id)
                ctx.tin.tin = otmp;
            if (ctx.spbook && otmp.o_id === ctx.spbook.o_id)
                ctx.spbook.book = otmp;
        }
    }
    return make_chain(shape, list, 'nobj');
}

/* the pet's struct edog, wherever the JS monster keeps it */
function edog_of(mtmp) { return mtmp.mextra?.edog || mtmp.edog || null; }

// C ref: restore.c restmon()
/* restore one monster */
function restmon(nhfp) {
    const mtmp = Sfi(nhfp, "monst");

    /* next monster pointer is invalid */
    mtmp.nmon = null;
    /* edog - pet: save or bones held a relative time */
    const edog = edog_of(mtmp);
    if (edog) {
        edog.droptime = relative_time_to_moves(edog.droptime);
        edog.hungrytime = relative_time_to_moves(edog.hungrytime);
        /* sanity check to prevent rn2(0) */
        if (edog.apport <= 0)
            edog.apport = 1;
    }
    return mtmp;
}

// C ref: restore.c restmonchn()
function restmonchn(nhfp) {
    const g = game;
    const ghostly = (nhfp.ftype === NHF_BONESFILE);
    const shape = Sfi(nhfp, "monst-chain_shape");
    const list = [];

    while (1) {
        const buflen = Sfi(nhfp, "monst-monst_length");
        if (buflen === -1)
            break;

        const mtmp = restmon(nhfp);
        list.push(mtmp);

        if (ghostly) {
            const nid = next_ident();

            add_id_mapping(mtmp.m_id, nid);
            mtmp.m_id = nid;
        }
        const offset = mtmp.mnum;
        mtmp.data = mons[offset];
        if (ghostly) {
            const mndx = (mtmp.cham === NON_PM) ? monsndx(mtmp.data)
                                                : mtmp.cham;

            if (!propagate(mndx, true, ghostly)) {
                /* cookie to trigger purge in getbones() */
                mtmp.mhpmax = DEFUNCT_MONSTER;
            }
        }

        if (mtmp.minvent) {
            mtmp.minvent = restobjchn(nhfp, false);
            /* restore monster back pointer */
            const inv = Array.isArray(mtmp.minvent) ? mtmp.minvent
                : (() => { const l = []; for (let o = mtmp.minvent; o; o = o.nobj) l.push(o); return l; })();
            for (const obj of inv)
                obj.ocarry = mtmp;
        } else
            mtmp.minvent = (mtmp.minvent === undefined) ? undefined : null;

        if (mtmp.mw !== null && mtmp.mw !== undefined || nhfp.fixups.some(f => f.holder === mtmp && f.key === 'mw')) {
            /* mw was written as a link; find the wielded weapon */
            const fi = nhfp.fixups.findIndex(f => f.holder === mtmp && f.key === 'mw');
            if (fi >= 0) nhfp.fixups.splice(fi, 1);
            const inv = Array.isArray(mtmp.minvent) ? mtmp.minvent
                : (() => { const l = []; for (let o = mtmp.minvent; o; o = o.nobj) l.push(o); return l; })();
            let obj = null;
            for (const o of inv)
                if (o.owornmask & W_WEP) { obj = o; break; }
            if (obj)
                mtmp.mw = obj;
            else {
                mtmp.mw = null; /* MON_NOWEP(mtmp) */
                mtmp.weapon_check = 0; /* NEED_WEAPON */
                console.error('impossible: bad monster weapon restore');
            }
        }

        if (mtmp.isshk)
            restshk(mtmp, ghostly);
        if (mtmp.ispriest)
            restpriest(mtmp, ghostly);

        if (!ghostly) {
            const pa = g.context?.polearm;
            if (pa && mtmp.m_id === pa.m_id)
                pa.hitmon = mtmp;
        }
    }
    return make_chain(shape, list, 'nmon');
}

// C ref: restore.c loadfruitchn()
function loadfruitchn(nhfp) {
    let flist = null, last = null;
    for (;;) {
        const fnext = Sfi(nhfp, "fruit");
        if (!fnext.fname)
            break;
        fnext.nextf = null;
        /* C prepends: fnext->nextf = flist; flist = fnext; */
        fnext.nextf = flist;
        flist = fnext;
        void last;
    }
    return flist;
}

// C ref: restore.c freefruitchn()
function freefruitchn(flist) { void flist; /* garbage collected */ }

// C ref: restore.c restgamestate()
async function restgamestate(nhfp) {
    const g = game;
    let defer_perm_invent, restoring_special;
    let otmp;

    const uid = Sfi(nhfp, "gamestate-uid");
    g.nhuuid = Sfi(nhfp, "nhuuid");
    g.moves = Sfi(nhfp, "gamestate-moves");
    /* SYSOPT_CHECK_SAVE_UID: the saving program wrote the same uid */
    if (uid !== HACK_UID) {
        await pline("Saved game was not yours.");
        if (!g.flags.debug)
            return false;
    }
    const newgamecontext = g.context; /* copy statically init'd context */
    g.context = Sfi(nhfp, "gamestate-context");
    const ctx = g.context;
    if (ctx.seer_turn !== undefined)
        ctx.seer_turn = relative_time_to_moves(ctx.seer_turn);
    if (ctx.digging?.lastdigtime !== undefined)
        ctx.digging.lastdigtime = relative_time_to_moves(ctx.digging.lastdigtime);
    if (ctx.warntype)
        ctx.warntype.species = (ismnum(ctx.warntype.speciesidx))
                               ? mons[ctx.warntype.speciesidx] : null;
    /* context.victual.piece, .tin.tin, .spellbook.book, and .polearm.hitmon
       are pointers which get set to Null during save and will be recovered
       via corresponding o_id or m_id while objs or mons are being restored */

    /* we want to be able to revert to command line/environment/config
       file option values instead of keeping old save file option values
       if partial restore fails and we resort to starting a new game */
    const newgameflags = g.flags;
    g.flags = Sfi(nhfp, "gamestate-flags");

    /* avoid keeping permanent inventory window up to date during restore */
    defer_perm_invent = g.iflags.perm_invent;
    g.iflags.perm_invent = false;
    /* wizard and discover are actually flags.debug and flags.explore;
       player might be overriding the save file values for them;
       in the discover case, we don't want to set that for a normal
       game until after the save file has been removed */
    g.iflags.deferred_X = (newgameflags.explore && !g.flags.explore);
    restoring_special = (g.flags.debug || g.flags.explore);
    if (newgameflags.debug) {
        /* authorized by startup code; wizard mode exists and is allowed */
        g.flags.debug = true, g.flags.explore = g.iflags.deferred_X = false;
    } else if (restoring_special) {
        /* specified by save file; check authorization now. */
        set_playmode();
    }
    await role_init(); /* Reset the initial role, race, gender, and alignment */
    g.wreserve = Sfi(nhfp, "wreserve");
    g.wtreserved = Sfi(nhfp, "wtreserved");
    g.u = Sfi(nhfp, "gamestate-you");
    const u = g.u;
    g.youmonst.cham = u.mcham;

    g.ubirthday = Sfi(nhfp, "gamestate-ubirthday");
    if (!g.urealtime) g.urealtime = { realtime: 0, start_timing: 0, finish_time: 0 };
    g.urealtime.realtime = Sfi(nhfp, "gamestate-realtime");
    g.urealtime.start_timing = Sfi(nhfp, "gamestate-start_timing");
    /* current time is the time to use for next urealtime.realtime update:
       urealtime.start_timing = getnow() -- the fixed clock doesn't run */

    set_uasmon();
    if (u.uhp <= 0 && (!(u.umonnum !== u.umonster) || u.mh <= 0)) {
        u.ux = u.uy = 0; /* affects pline() [hence You()] */
        await pline("You were not healthy enough to survive restoration.");
        /* revert to pre-restore option settings */
        g.iflags.deferred_X = false;
        g.iflags.perm_invent = defer_perm_invent;
        g.flags = newgameflags;
        g.context = newgamecontext;
        throw new Error('restgamestate(): starting over after a failed restore not ported yet');
    }
    /* in case hangup save occurred in midst of level change */
    assign_level(u.uz0, u.uz);

    /* this stuff comes after potential aborted restore attempts */
    g.killer = Sfi(nhfp, "killers");
    restore_timers(nhfp, 'global');
    restore_light_sources(nhfp, 'global');

    g.invent = restobjchn(nhfp, false);

    /* restore dangling (not on floor or in inventory) ball and/or chain */
    let bc_obj = restobjchn(nhfp, false);
    for (const o of (Array.isArray(bc_obj) ? bc_obj : (() => { const l = []; for (let p = bc_obj; p; p = p.nobj) l.push(p); return l; })())) {
        o.nobj = null;
        if (o.owornmask)
            setworn(o, o.owornmask);
    }
    bc_obj = null;
    g.migrating_objs = restobjchn(nhfp, false);
    g.migrating_mons = restmonchn(nhfp);

    g.mvitals = Sfi(nhfp, "gamestate-mvitals");

    /*
     * There are some things after this that can have unintended display
     * side-effects too early in the game.
     * Disable see_monsters() here, re-enable it at the top of moveloop()
     */
    g.defer_see_monsters = true;

    /* this comes after inventory has been loaded */
    for (otmp = g.invent; otmp; otmp = otmp.nobj)
        if (otmp.owornmask)
            setworn(otmp, otmp.owornmask);

    /* reset weapon so that player will get a reminder about "bashing"
       during next fight when bare-handed or wielding an unconventional
       item; for pick-axe, we aren't able to distinguish between having
       applied or wielded it, so be conservative and assume the former */
    otmp = g.uwep;  /* `uwep' usually init'd by setworn() in loop above */
    g.uwep = null;  /* clear it and have setuwep() reinit */
    setuwep(otmp);  /* (don't need any null check here) */
    if (!g.uwep || g.uwep.otyp === PICK_AXE || g.uwep.otyp === GRAPPLING_HOOK)
        g.unweapon = true;

    restore_dungeon(nhfp);
    restlevchn(nhfp);
    /* hero_seq isn't saved and restored because it can be recalculated */
    g.hero_seq = g.moves * 8; /* normally handled in moveloop() */
    g.quest_status = Sfi(nhfp, "gamestate-quest_status");
    g.spl_book = Sfi(nhfp, "gamestate-spl_book");
    restore_artifacts(nhfp);
    restore_oracles(nhfp);
    g.pl_character = Sfi(nhfp, "gamestate-pl_character");
    g.pl_fruit = Sfi(nhfp, "gamestate-pl_fruit");
    freefruitchn(g.ffruit); /* clean up fruit(s) made by initoptions() */
    g.ffruit = loadfruitchn(nhfp);

    restnames(nhfp);
    restore_msghistory(nhfp);
    restore_gamelog(nhfp);
    restore_luadata(nhfp);
    /* must come after all mons & objs are restored: relink_timers(FALSE)
       and relink_light_sources(FALSE) run in dorecover(), after the id
       links are resolved */
    adj_erinys(u.ualign.abuse);
    /* inventory display is now viable */
    g.iflags.perm_invent = defer_perm_invent;
    return true;
}

/* restore_timers(): timeout.js */
function restore_timers(nhfp, range, adjust = 0) {
    restore_timers_from(nhfp, (range === 'global') ? RANGE_GLOBAL : RANGE_LEVEL,
                        adjust);
}

/* restore_light_sources(): light.js */
function restore_light_sources(nhfp, range) {
    restore_light_sources_from(nhfp);
}

// C ref: dungeon.c restore_dungeon()
function restore_dungeon(nhfp) {
    const g = game;
    g.n_dgns = Sfi(nhfp, "dungeon_count");
    g.dungeons = Sfi(nhfp, "dungeon");
    g.dungeon_topology = Sfi(nhfp, "svd.dungeon_topology");
    g.tune = Sfi(nhfp, "tune");
    g.branches = Sfi(nhfp, "branch");
    Sfi(nhfp, "level_info_count");
    const li = Sfi(nhfp, "svl.level_info");
    if (li) g.level_info = li; else delete g.level_info;
    const ip = Sfi(nhfp, "svi.inv_pos");
    if (ip) g.inv_pos = ip;
    const count = Sfi(nhfp, "mapseen_count");
    let curr_ms, last_ms = null;
    g.mapseenchn = null;
    for (let i = 0; i < count; i++) {
        curr_ms = load_mapseen(nhfp);
        curr_ms.next = null;
        if (last_ms)
            last_ms.next = curr_ms;
        else
            g.mapseenchn = curr_ms;
        last_ms = curr_ms;
    }
}

// C ref: artifact.c restore_artifacts()
function restore_artifacts(nhfp) {
    const g = game;
    g.artiexist = Sfi(nhfp, "artifact-artiexist");
    g.artidisco = Sfi(nhfp, "artifact-artidisco");
}

// C ref: rumors.c restore_oracles()
function restore_oracles(nhfp) {
    const g = game;
    g.oracle_cnt = Sfi(nhfp, "oracle-oracle_cnt");
    if (g.oracle_cnt) {
        g.oracle_loc = Sfi(nhfp, "oracle-oracle_loc");
        g.oracle_flg = 1; /* no need to call init_oracles() */
    }
}

// C ref: o_init.c restnames()
function restnames(nhfp) {
    const g = game;
    g.bases = Sfi(nhfp, "names-bases");
    g.disco = Sfi(nhfp, "names-disco");
    for (let i = 0; i < NUM_OBJECTS; ++i) {
        const oc = Sfi(nhfp, "names-objclass");
        Object.assign(objects[i], oc);
        objects[i].oc_uname = null;
    }
    for (;;) {
        const i = Sfi(nhfp, "names-len");
        if (i === -1)
            break;
        objects[i].oc_uname = Sfi(nhfp, "names-oc_uname");
    }
    /* TILES_IN_GLYPHMAP shuffle_tiles(): no tiles */
}

// C ref: nhlua.c restore_luadata()
/* restore nh_lua_variables table from file */
function restore_luadata(nhfp) {
    const g = game;
    const lua_data = Sfi(nhfp, "luadata");
    if (!g.luacore)
        l_nhcore_init();
    /* luaL_loadstring(gl.luacore, lua_data); nhl_pcall_handle(...):
       running "nh_lua_variables={...};" sets the table */
    if (g.luacore && lua_data)
        g.luacore.globals.nh_lua_variables = lua_data;
}

// C ref: restore.c restlevelstate()
/* update game state pointers to those valid for the current level (so we
   don't dereference a wild u.ustuck when saving game state, for instance) */
function restlevelstate() {
    /*
     * Note: restoring steed and engulfer/holder/holdee is now handled
     * in getlev() and there's nothing left for restlevelstate() to do.
     */
}

// C ref: restore.c restlevelfile()
/* after getlev(), put current level into a level/lock file;
   essential when splitting a save file into individual level files */
function restlevelfile(ltmp) {
    const whynot = { v: '' };
    const nhfp = create_levelfile(ltmp, whynot);
    if (!nhfp) {
        /* failed to create a new file; don't attempt to make a panic save */
        game.program_state.something_worth_saving = 0;
        throw new Error(`restlevelfile: ${whynot.v}`); /* panic() */
    }
    /* bufon(nhfp->fd); */
    nhfp.mode = WRITING | FREEING;
    savelev(nhfp, ltmp);
    close_nhfile(nhfp);
    return 2;
}

// C ref: restore.c dorecover()
export async function dorecover(nhfp) {
    const g = game;
    let ltmp = 0;
    let rtmp;

    /* suppress map display if some part of the code tries to update that */
    g.program_state.restoring = REST_GSTATE;

    get_plname_from_file(nhfp, true);
    /*
     * The position in the save file is now here:
     * --> current level (including pets)
     *     (non-level-based) game state
     *     other levels
     */
    await getlev(nhfp, 0, 0);
    const gamestate_fixups = nhfp.fixups.length; /* level links resolved */
    if (!(await restgamestate(nhfp))) {
        const tnhfp = get_freeing_nhfile();

        await tty_display_nhwindow(g.WIN_MESSAGE, true);
        savelev(tnhfp, 0); /* discard current level */
        close_nhfile(tnhfp);
        close_nhfile(nhfp);
        delete_savefile();
        g.u.usteed_mid = g.u.ustuck_mid = 0;
        g.program_state.restoring = 0;
        return 0;
    }
    void gamestate_fixups;
    /* the game state's links to objects and monsters (u.ustuck,
       context.victual.piece, ...) are resolved once the current level
       has been read for the last time, below */
    const pending = nhfp.fixups.splice(0);

    /* after restgamestate() -> restnames() so that 'bases[]' is populated */
    init_oclass_probs(); /* recompute go.oclass_prob_totals[] */

    restlevelstate();
    /* INSURANCE savestateinlock(): the level 0 lock file isn't modelled */
    rtmp = restlevelfile(ledger_no(g.u.uz));
    if (rtmp < 2)
        return rtmp; /* dorecover called recursively */

    g.program_state.restoring = REST_LEVELS;

    /* these pointers won't be valid while we're processing the
     * other levels, but they'll be reset again by restlevelstate()
     * afterwards, and in the meantime at least u.usteed may mislead
     * place_monster() on other levels
     */
    g.u.ustuck = null;
    g.u.usteed = null;

    /* restoreinfo.mread_flags = 1; return despite error */
    while (1) {
        if (Sf_eof(nhfp))
            break;
        ltmp = Sfi(nhfp, "gamestate-level_number");
        await getlev(nhfp, 0, ltmp);
        rtmp = restlevelfile(ltmp);
        if (rtmp < 2)
            return rtmp; /* dorecover called recursively */
    }
    /* restoreinfo.mread_flags = 0; */

    rewind_nhfile(nhfp); /* return to beginning of file */
    validate(nhfp);
    get_plname_from_file(nhfp, true);

    /* not 0 nor REST_GSTATE nor REST_LEVELS */
    g.program_state.restoring = REST_CURRENT_LEVEL;

    nhfp.fixups.push(...pending);
    const lev_from = nhfp.fixups.length;
    await getlev(nhfp, 0, 0, lev_from);
    /* now link the game state to the restored level */
    resolve_saved_ids(nhfp, 0);
    relink_timers(false);
    relink_light_sources(false);
    close_nhfile(nhfp);
    restlevelstate();
    g.program_state.something_worth_saving = 1; /* useful data now exists */

    if (!g.flags.debug && !g.flags.explore)
        delete_savefile();
    /* Is_rogue_level(&u.uz): assign_graphics(ROGUESET) -- the Rogue
       level tribute isn't ported */
    /* reset_glyphmap(gm_levelchange): the glyph map isn't modelled */
    max_rank_sz(); /* to recompute gm.mrank_sz (botl.c) */

    if ((g.uball && !g.uchain) || (g.uchain && !g.uball)) {
        console.error('impossible: restgamestate: lost ball & chain');
        /* poor man's unpunish() */
        setworn(null, W_CHAIN);
        setworn(null, W_BALL);
    }

    /* in_use processing must be after:
     *    + The inventory has been read so that freeinv() works.
     *    + The current level has been restored so billing information
     *      is available.
     */
    await inven_inuse(false);

    /* Set up the vision internals, after levl[] data is loaded
       but before docrt(). */
    reglyph_darkroom();
    vision_reset();
    g.vision_full_recalc = 1; /* recompute vision (not saved) */

    await run_timers(); /* expire all timers that have gone off while away */
    g.program_state.restoring = 0; /* affects bot() so clear before docrt() */

    /* ge.early_raw_messages: no early raw messages */
    g.u.usteed_mid = g.u.ustuck_mid = 0;
    g.program_state.beyond_savefile_load = 1;

    await docrt();
    tty_clear_nhwindow(g.WIN_MESSAGE);

    /* Success! */
    await welcome(false);
    await check_special_room(false);
    return 1;
}

// C ref: display.c reglyph_darkroom() -- remembered dark-room spots
// change glyph when the dark_room option differs from when they were
// remembered; the JS port remembers dark room spots as the dark-room
// symbol only while flags.dark_room is set, which it leaves unchanged
function reglyph_darkroom() {
    /* nothing to convert: flags.dark_room comes from the save file */
}


// C ref: restore.c rest_stairs()
function rest_stairs(nhfp) {
    const g = game;
    /* stairway_free_all() */
    g.stairs = null;
    const list = Sfi(nhfp, "stairs-stairway");
    for (const stway of list) {
        if (g.program_state.restoring !== REST_GSTATE
            && stway.tolev.dnum === g.u.uz.dnum) {
            /* stairway dlevel is relative, make it absolute */
            stway.tolev.dlevel += g.u.uz.dlevel;
        }
        stairway_add(stway.sx, stway.sy, stway.up, stway.isladder, stway.tolev);
        const newst = stairway_at(stway.sx, stway.sy);
        if (newst)
            newst.u_traversed = stway.u_traversed;
    }
}

// C ref: restore.c restcemetery()
export function restcemetery(nhfp, holder, key) {
    const b = Sfi(nhfp, "cemetery-bonesinfo");
    if (b !== null && b !== undefined)
        holder[key] = b;
    else
        delete holder[key];
}

// C ref: restore.c rest_levl()
function rest_levl(nhfp) {
    const L = game.level;
    const cols = Sfi(nhfp, "location-rm");
    for (let c = 0; c < cols.length; ++c) {
        for (let r = 0; r < cols[c].length; ++r) {
            const loc = makeLocation();
            Object.assign(loc, cols[c][r]);
            L.locations[c][r] = loc;
        }
    }
}

// C ref: mkroom.c rest_rooms()
function rest_rooms(nhfp) {
    const L = game.level;
    L.nroom = Sfi(nhfp, "room-nroom");
    const r = Sfi(nhfp, "room-mkroom");
    L.rooms = r.rooms;
    L.subrooms = r.subrooms;
    L.nsubroom = r.nsubroom;
    for (const rm of L.rooms)
        if (rm) rm.resident = null;
    for (const rm of L.subrooms)
        if (rm) rm.resident = null;
}

// C ref: restore.c getlev()
export async function getlev(nhfp, pid, lev, fixups_from) {
    const g = game;
    const u = g.u;
    const ghostly = (nhfp.ftype === NHF_BONESFILE);
    const from = (fixups_from !== undefined) ? fixups_from : nhfp.fixups.length;

    g.program_state.in_getlev = true;

    if (ghostly)
        clear_id_mapping();

    /* Load the old fruit info.  We have to do it first, so the
     * information is available when restoring the objects.
     */
    if (ghostly)
        g.oldfruit = loadfruitchn(nhfp);

    /* First some sanity checks */
    const hpid = Sfi(nhfp, "gamestate-hackpid");
    /* CHECK:  This may prevent restoration */
    const dlvl = Sfi(nhfp, "gamestate-dlvl");
    if ((pid && pid !== hpid) || (lev && dlvl !== lev)) {
        let trickbuf;
        if (pid && pid !== hpid)
            trickbuf = `PID (${hpid}) doesn't match saved PID (${pid})!`;
        else
            trickbuf = `This is level ${dlvl}, not ${lev}!`;
        if (g.flags.debug)
            await pline(trickbuf);
        await trickery(trickbuf);
    }
    /* svl.level is overwritten from the file */
    g.level = new GameMap();
    const L = g.level;
    restcemetery(nhfp, L, 'bonesinfo');
    rest_levl(nhfp);

    const lst = Sfi(nhfp, "lastseentyp");
    if (lst !== null && lst !== undefined) L.lastseentyp = lst;
    g.omoves = Sfi(nhfp, "lev-timestmp");
    const elapsed = (g.moves - g.omoves);

    rest_stairs(nhfp);
    g.updest = Sfi(nhfp, "lev-updest");
    g.dndest = Sfi(nhfp, "lev-dndest");
    L.flags = Sfi(nhfp, "lev-level_flags");
    rest_adjust_levelflags();
    L.doors = Sfi(nhfp, "lev-doors");
    L.doorindex = Sfi(nhfp, "lev-doorindex");
    rest_rooms(nhfp); /* No joke :-) */
    if (L.nroom && L.rooms[L.nroom - 1]?.fdoor !== undefined) {
        L.doorindex = L.rooms[L.nroom - 1].fdoor
                      + L.rooms[L.nroom - 1].doorct;
    } else if (!L.nroom) {
        L.doorindex = 0;
    }
    /* the JS level's own fields that C keeps in other globals */
    Object.assign(L, Sfi(nhfp, "lev-js"));

    restore_timers(nhfp, 'level', elapsed);
    restore_light_sources(nhfp, 'level');
    g.fmon = restmonchn(nhfp);
    rest_worm(nhfp); /* restore worm information */

    L.traps = [];
    for (;;) {
        const trap = Sfi(nhfp, "trap");
        if (trap.tx !== 0) {
            if (g.program_state.restoring !== REST_GSTATE
                && trap.dst && trap.dst.dnum === u.uz.dnum) {
                /* convert relative destination to absolute */
                trap.dst.dlevel += u.uz.dlevel;
            }
            /* trap->ntrap = gf.ftrap; gf.ftrap = trap; */
            L.traps.unshift(trap);
        } else
            break;
    }

    L.objects = restobjchn(nhfp, false) || [];
    find_lev_obj();
    /* restobjchn()'s `frozen' argument probably ought to be a callback
       routine so that we can check for objects being buried under ice */
    const buried = restobjchn(nhfp, false);
    if (buried !== null) L.buriedobjlist = buried;
    g.billobjs = restobjchn(nhfp, false);
    rest_engravings(nhfp);

    /* reset level.monsters for new level */
    L.monsters = [];
    L.wsegs = new Map(); /* worm tail cells, placed by place_wsegs() */
    for (let mtmp = g.fmon; mtmp; mtmp = mtmp.nmon) {
        if (mtmp.isshk)
            set_residency(mtmp, false);
        if (u.usteed_mid && mtmp.m_id === u.usteed_mid) {
            /* steed is kept on fmon list but off the map */
            u.usteed = mtmp;
            u.usteed_mid = 0;
        } else {
            if (u.ustuck_mid && mtmp.m_id === u.ustuck_mid) {
                set_ustuck(mtmp);
                u.ustuck_mid = 0;
            }
            place_monster(mtmp, mtmp.mx, mtmp.my);
            if (mtmp.wormno)
                place_wsegs(mtmp, null);
            if ((mtmp.data.mflags1 & M1_CONCEAL) && mtmp.mundetected) /* hides_under() */
                hideunder(mtmp);
        }

        /* regenerate monsters while on another level */
        if (!u.uz?.dlevel || g.program_state.restoring === REST_LEVELS)
            continue;
        if (ghostly) {
            /* reset peaceful/malign relative to new character;
               shopkeepers will reset based on name */
            if (!mtmp.isshk)
                mtmp.mpeaceful = (is_unicorn(mtmp.data)
                                  && (Math.sign(u.ualign.type)
                                      === Math.sign(mtmp.data.maligntyp))) ? 1
                                 : (peace_minded(mtmp.data) ? 1 : 0);
            set_malign(mtmp);
        } else if (elapsed > 0) {
            mon_catchup_elapsed_time(mtmp, elapsed);
        }
        /* update shape-changers in case protection against
           them is different now than when the level was saved */
        restore_cham(mtmp);
        /* give hiders a chance to hide before their next move */
        if (ghostly || (elapsed > 0 && elapsed > rnd(10)))
            hide_monst(mtmp);
    }

    restdamage(nhfp);
    rest_regions(nhfp);
    rest_bubbles(nhfp); /* for water and air; empty marker on other levels */
    load_exclusions(nhfp);
    rest_track(nhfp);

    if (ghostly) {
        let stway = g.stairs;
        while (stway) {
            if (!stway.isladder && !stway.up
                && stway.tolev.dnum === u.uz.dnum)
                break;
            stway = stway.next;
        }

        /* Now get rid of all the temp fruits... */
        freefruitchn(g.oldfruit), g.oldfruit = null;

        if (lev > ledger_no(g.dungeon_topology.d_medusa_level)
            && lev < ledger_no(g.dungeon_topology.d_stronghold_level) && !stway) {
            const cc = { x: 0, y: 0 };
            const dest = { dnum: u.uz.dnum, dlevel: u.uz.dlevel + 1 };

            mazexy(cc);
            stairway_add(cc.x, cc.y, false, false, dest);
            L.at(cc.x, cc.y).typ = STAIRS;
        }

        const br = Is_branchlev(u.uz);
        if (br && u.uz.dlevel === 1) {
            const ltmp = { dnum: 0, dlevel: 0 };

            if (on_level(u.uz, br.end1))
                assign_level(ltmp, br.end2);
            else
                assign_level(ltmp, br.end1);

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
                const trap = (L.traps || []).find(t => t.ttyp === MAGIC_PORTAL);
                if (!trap)
                    throw new Error('getlev: need portal but none found'); /* panic() */
                if (!trap.dst)
                    trap.dst = { dnum: 0, dlevel: 0 };
                assign_level(trap.dst, ltmp);
                break;
            }
            }
        } else if (!br) {
            /* Remove any dangling portals. */
            for (const trap of (L.traps || []).slice())
                if (trap.ttyp === MAGIC_PORTAL)
                    deltrap(trap);
        }
    }
    /* must come after all mons & objs are restored:
       relink_timers(ghostly), relink_light_sources(ghostly), once the
       id links are resolved */
    resolve_saved_ids(nhfp, from);
    relink_timers(ghostly);
    relink_light_sources(ghostly);
    reset_oattached_mids(ghostly);

    if (ghostly)
        clear_id_mapping();
    g.program_state.in_getlev = false;
}

// C ref: restore.c clear_id_mapping()
/* Clear all structures for object and monster ID mapping. */
function clear_id_mapping() {
    game.id_map = new Map();
}

// C ref: restore.c add_id_mapping()
/* Add a mapping to the ID map. */
function add_id_mapping(gid, nid) {
    if (!game.id_map)
        game.id_map = new Map();
    /* C searches the newest bucket first; keep the first mapping added
       for an id only if it isn't replaced, same lookup result */
    game.id_map.set(gid, nid);
}

// C ref: restore.c lookup_id_mapping()
/*
 * Global routine to look up a mapping.  If found, return TRUE and fill
 * in the new ID value.  Otherwise, return false and return -1 in the new
 * ID.
 */
export function lookup_id_mapping(gid, nidp) {
    const m = game.id_map;
    if (m && m.has(gid)) {
        nidp.v = m.get(gid);
        return true;
    }
    return false;
}

// C ref: restore.c reset_oattached_mids()
function reset_oattached_mids(ghostly) {
    const nid = { v: 0 };

    for (const otmp of (game.level.objects || [])) {
        if (ghostly && otmp.oextra?.omonst) { /* has_omonst() */
            const mtmp = otmp.oextra.omonst;

            mtmp.m_id = 0;
            mtmp.mpeaceful = mtmp.mtame = 0; /* pet's owner died! */
        }
        if (ghostly && otmp.oextra?.omid) { /* has_omid() */
            const oldid = otmp.oextra.omid;
            if (lookup_id_mapping(oldid, nid))
                otmp.oextra.omid = nid.v;
            else
                delete otmp.oextra.omid; /* free_omid() */
        }
    }
}

// C ref: restore.c ghostfruit()
function ghostfruit(otmp) {
    let oldf;

    for (oldf = game.oldfruit; oldf; oldf = oldf.nextf)
        if (oldf.fid === otmp.spe)
            break;

    if (!oldf)
        console.error('impossible: no old fruit?');
    else
        otmp.spe = fruitadd(oldf.fname, null);
}

// C ref: restore.c trickery()
export async function trickery(reason) {
    await pline("Strange, this map is not as I remember it.");
    await pline("Somebody is trying some trickery here...");
    await pline("This game is void.");
    killer().name = reason ? reason : "";
    await done(TRICKED);
}

// C ref: mon.c restore_cham()
export function restore_cham(mon) {
    const u = game.u;
    const Protection_from_shape_changers =
        u.uprops?.[PROT_FROM_SHAPE_CHANGERS]?.intrinsic
        || u.uprops?.[PROT_FROM_SHAPE_CHANGERS]?.extrinsic;
    if (Protection_from_shape_changers || mon.mcan) {
        /* force chameleon or mimic to revert to its natural shape */
        throw new Error('restore_cham(): normal_shape() not ported yet');
    } else if (mon.cham === NON_PM) {
        /* chameleon doesn't change shape here, just gets allowed to do so */
        mon.cham = pm_to_cham(monsndx(mon.data));
    }
}

// C ref: engrave.c rest_engravings()
function rest_engravings(nhfp) {
    const e = Sfi(nhfp, "engravings");
    if (e !== null && e !== undefined) game.level.head_engr = e;
}

// C ref: region.c rest_regions()
function rest_regions(nhfp) {
    const ghostly = (nhfp.ftype === NHF_BONESFILE);
    rest_regions_data(Sfi(nhfp, "regions"), ghostly);
}

// C ref: restore.c rest_bubbles()
function rest_bubbles(nhfp) {
    const bbubbly = Sfi(nhfp, "bubbles-bbubbly");
    if (bbubbly)
        throw new Error('rest_bubbles(): restore_waterlevel() not ported yet');
}

// C ref: mklev.c load_exclusions()
function load_exclusions(nhfp) {
    const ez = Sfi(nhfp, "exclusion_zones");
    if (ez !== null && ez !== undefined) game.exclusion_zones = ez;
}

// C ref: track.c rest_track()
function rest_track(nhfp) {
    const t = Sfi(nhfp, "track");
    if (t !== null && t !== undefined) game._track = t;
}

// C ref: restore.c get_plname_from_file()
/* "name-role-race-gend-algn" occurs very early in a save file; sometimes we
   want the whole thing, other times just "name" (for svp.plname[]) */
export function get_plname_from_file(nhfp, name_only) {
    const { hero } = Sfi(nhfp, "plname");
    /* "-race-role-gend-algn" is already present except that it has been
       hidden by replacing the initial dash with NUL */
    const out = name_only ? hero.slice(0, hero.indexOf('\0')) : hero.replace('\0', '-');
    if (name_only)
        game.plname = out;
    return out;
}

// C ref: restore.c restore_gamelog()
function restore_gamelog(nhfp) {
    const g = game;
    for (;;) {
        const slen = Sfi(nhfp, "gamelog-length");
        if (slen === -1)
            break;
        const msg = Sfi(nhfp, "gamelog-gamelog_text");
        const tmp = Sfi(nhfp, "gamelog-gamelog_line");
        /* gamelog_add(tmp.flags, tmp.turn, msg) */
        const entry = { text: msg, flags: tmp.flags, turn: tmp.turn, next: null };
        if (!g.gamelog)
            g.gamelog = entry;
        else {
            let p = g.gamelog;
            while (p.next) p = p.next;
            p.next = entry;
        }
    }
}

// C ref: restore.c restore_msghistory()
function restore_msghistory(nhfp) {
    let msgcount = 0;
    const msgs = Sfi(nhfp, "msghistory-msg");
    for (const msg of msgs) {
        tty_putmsghistory(msg, true);
        ++msgcount;
    }
    if (msgcount)
        tty_putmsghistory(null, true);
}

void FREEING; void REST_GSTATE; void makeLocation;
