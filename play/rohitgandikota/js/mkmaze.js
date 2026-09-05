// mkmaze.js — special-level entry points that live in src/mkmaze.c.
// C ref: src/mkmaze.c
//
// makemaz() resolves the proto file name and hands off to load_special();
// place_lregion()/put_lregion_here() place branch stairs, portals and the
// hero's arrival spot; fixup_special() is the post-script cleanup. The
// water-level, Medusa, and Mines postprocessing lives below.

import { game } from './gstate.js';
import { rn2, rnd, rn1 } from './rng.js';
import { Is_special, depth, find_level, get_level,
         dunlevs_in_dungeon, Invocation_lev } from './dungeon.js';
import { load_special, sp_lev_wire_create_maze, create_trap } from './sp_lev.js';
import { COLNO, ROWNO, ROOM, CORR, AIR, STONE, HWALL, IS_DOOR,
         ACCESSIBLE, W_NONDIGGABLE, POOL, IRONBARS, TLWALL, TRWALL,
         TUWALL, TDWALL, BLCORNER, BRCORNER, TLCORNER,
         TRCORNER, WATER, CLOUD, LAVAPOOL, MAGIC_PORTAL, MOAT,
         Is_waterlevel, Is_airlevel, Is_firelevel, u_at,
         MON_BUBBLEMOVE, MIGR_RANDOM, MIGR_LEFTOVERS, MIGR_TO_SPECIES,
         OBJ_MIGRATING, has_mgivenname, MKTRAP_MAZEFLAG,
         VIBRATING_SQUARE, NO_MM_FLAGS } from './const.js';
import { isok, distu, sgn } from './hacklib.js';
import { occupied, somex, somey } from './mklev.js';
import { t_at, m_at, mnexto, mnearto, elemental_clog, m_into_limbo }
    from './mon.js';
import { goodpos, rndmonnum, remove_monster, makemon, set_malign,
         mpickobj, MM_NONAME } from './makemon.js';
import { mk_tt_object, mkcorpstat, set_corpsenm, place_object, mksobj,
         mkobj, mkobj_at, mksobj_at, mkgold } from './mkobj.js';
import { poly_when_stoned, is_orc } from './mondata.js';
import { PMNAMES, MFLAGS } from './monst_data.js';
import { OCLASSES, ONAMES } from './objects_data.js';
import { christen_monst, christen_orc, new_oname, rndorcname,
         upstart } from './do_name.js';
import { rnd_otyp_by_namedesc } from './objnam.js';
import { DEADMONSTER } from './monst.js';
/* the endgame-plane machinery below; these modules are already in this
   module's transitive import graph through mon.js, so the static edges add
   no new cycle — but they must stay AFTER the mon.js import above */
import { newsym, pline } from './display.js';
import { block_point, unblock_point, recalc_block_point,
         vision_recalc } from './vision.js';
import { obj_extract_self, stackobj, weight } from './invent.js';
import { cmap_names } from './drawing_data.js';
import { CLR_BRIGHT_BLUE, CLR_CYAN, CLR_GRAY } from './terminal.js';
import { RLOC_ERR, RLOC_NOMSG } from './const.js';
import { LADDER } from './const.js';
import { STAIRS } from './const.js';
import { MAX_TYPE } from './const.js';
import { SDOOR } from './const.js';
import { ICE } from './const.js';
import { MELT_ICE_AWAY } from './const.js';
import { IS_LAVA } from './const.js';
import { IS_FOUNTAIN } from './const.js';
import { IS_SINK } from './const.js';
import { is_ice } from './dbridge.js';
import { obj_ice_effects } from './mkobj.js';
import { spot_stop_timers } from './timeout.js';
import { count_level_features } from './mklev.js';

















function note_unported_mkmaze(what) {
    (game.unported ||= new Set()).add(what);
}

// include/sp_lev.h lev_region types
export const LR_TELE = 0, LR_UPTELE = 1, LR_DOWNTELE = 2, LR_PORTAL = 3,
             LR_BRANCH = 4, LR_UPSTAIR = 5, LR_DOWNSTAIR = 6;

// src/mkmaze.c:1127 makemaz() — build a special (or proto-filled) level.
// Returns true after either a registered level script or the random-maze
// fallback has generated the level.
export async function makemaz(s) {
    const sp = Is_special(game.u.uz);
    let protofile;

    if (s) {
        if (sp && sp.rndlevs)
            protofile = `${s}-${rnd(sp.rndlevs)}`;
        else
            protofile = s;
    } else if (game.dungeons[game.u.uz.dnum].proto) {
        const dgn = game.dungeons[game.u.uz.dnum];
        if (dgn.num_dunlevs > 1) {
            const dunlev = game.u.uz.dlevel;
            if (sp && sp.rndlevs)
                protofile = `${dgn.proto}${dunlev}-${rnd(sp.rndlevs)}`;
            else
                protofile = `${dgn.proto}${dunlev}`;
        } else if (sp && sp.rndlevs) {
            protofile = `${dgn.proto}-${rnd(sp.rndlevs)}`;
        } else
            protofile = dgn.proto;
    } else
        protofile = '';

    /* SPLEVTYPE is a debugging env override; not carried over */

    if (protofile) {
        /* src/mkmaze.c:707 check_ransacked() — "this kludge only works as
           long as orctown is minetn-1": the Orcish Town variant flags the
           whole mines branch as ransacked for stolen_booty() below it */
        game.ransacked = (game.u.uz.dnum === game.mines_dnum
                          && protofile === 'minetn-1');
        if (await load_special(protofile))
            return true;
        note_unported_mkmaze(`makemaz:${protofile}`);
    }

    game.level.flags.is_maze_lev = 1;
    game.level.flags.corrmaze = !rn2(3);

    if (!Invocation_lev(game.u.uz) && rn2(2))
        create_maze(-1, -1, !rn2(5));
    else
        create_maze(1, 1, false);

    if (!game.level.flags.corrmaze)
        mkmaze_mklev_fns?.wallification?.(
            2, 2, game.x_maze_max ?? 78, game.y_maze_max ?? 20);

    const mm = { x: 0, y: 0 };
    mazexy(mm);
    mkmaze_mklev_fns?.mkstairs?.(mm.x, mm.y, 1, null);
    if (!Invocation_lev(game.u.uz)) {
        mazexy(mm);
        mkmaze_mklev_fns?.mkstairs?.(mm.x, mm.y, 0, null);
    } else {
        create_trap({ type: VIBRATING_SQUARE }, null);
    }

    mkmaze_mklev_fns?.place_branch?.(Is_branchlev_here(), 0, 0);
    populate_maze();
    return true;
}

// src/mkmaze.c:311 within_bounded_area()
export const within_bounded_area = (x, y, lx, ly, hx, hy) =>
    (x >= lx && x <= hx && y >= ly && y <= hy);

// src/mkmaze.c:341 bad_location()
function bad_location(x, y, nlx, nly, nhx, nhy) {
    const typ = game.level.at(x, y)?.typ;
    return occupied(x, y)
        || within_bounded_area(x, y, nlx, nly, nhx, nhy)
        || !((typ === CORR && game.level.flags?.is_maze_lev)
             || typ === ROOM
             || typ === AIR);
}

// src/mkmaze.c:413 put_lregion_here() — one attempt at placing the region
// object (or the hero) at x,y.
async function put_lregion_here(x, y, nlx, nly, nhx, nhy, rtype, oneshot, lev) {
    /* is_exclusion_zone(): no exclusion regions exist in this port */
    if (bad_location(x, y, nlx, nly, nhx, nhy)) {
        if (!oneshot) {
            return false; /* caller should try again */
        } else {
            const t = t_at(x, y);
            if (t) {
                const mtmp = m_at(x, y);
                if (mtmp && mtmp.mtrapped)
                    mtmp.mtrapped = 0;
                note_unported_mkmaze('put_lregion_here:deltrap');
            }
            if (bad_location(x, y, nlx, nly, nhx, nhy))
                return false;
        }
    }
    switch (rtype) {
    case LR_TELE:
    case LR_UPTELE:
    case LR_DOWNTELE: {
        /* "something" means the player in this case */
        const mtmp = m_at(x, y);
        if (mtmp) {
            /* move the monster if no choice, or just try again */
            if (oneshot) {
                const { rloc } = await import('./teleport.js');
                if (!(await rloc(mtmp, RLOC_NOMSG)))
                    await m_into_limbo(mtmp);
            } else {
                return false;
            }
        }
        game.u.ux = x;
        game.u.uy = y; /* u_on_newpos */
        break;
    }
    case LR_PORTAL:
        if (lev)
            mkportal(x, y, lev.dnum, lev.dlevel);
        else
            note_unported_mkmaze('put_lregion_here:mkportal');
        break;
    case LR_DOWNSTAIR:
    case LR_UPSTAIR:
        mkmaze_mklev_fns?.mkstairs?.(x, y, rtype === LR_UPSTAIR ? 1 : 0, null);
        break;
    case LR_BRANCH:
        mkmaze_mklev_fns?.place_branch?.(Is_branchlev_here(), x, y);
        break;
    }
    return true;
}

// src/mkmaze.c:356 place_lregion() — 200 probabilistic tries (two rn1 draws
// each), then an exhaustive scan.
export async function place_lregion(lx, ly, hx, hy, nlx, nly, nhx, nhy, rtype, lev) {
    if (!lx) { /* default to whole level */
        if (rtype === LR_BRANCH && game.level.nroom) {
            /* let place_branch choose, avoiding corridors */
            mkmaze_mklev_fns?.place_branch?.(Is_branchlev_here(), 0, 0);
            return;
        }
        lx = 1;
        hx = COLNO - 1;
        ly = 0;
        hy = ROWNO - 1;
    }

    /* clamp the area to the map */
    if (lx < 1) lx = 1;
    if (hx > COLNO - 1) hx = COLNO - 1;
    if (ly < 0) ly = 0;
    if (hy > ROWNO - 1) hy = ROWNO - 1;

    /* first a probabilistic approach */
    const oneshot = (lx === hx && ly === hy);
    for (let trycnt = 0; trycnt < 200; trycnt++) {
        const x = rn1((hx - lx) + 1, lx);
        const y = rn1((hy - ly) + 1, ly);
        if (await put_lregion_here(x, y, nlx, nly, nhx, nhy,
                                   rtype, oneshot, lev))
            return;
    }

    /* then a deterministic one */
    for (let x = lx; x <= hx; x++)
        for (let y = ly; y <= hy; y++)
            if (await put_lregion_here(x, y, nlx, nly, nhx, nhy,
                                       rtype, true, lev))
                return;

    note_unported_mkmaze('place_lregion:failed');
}

/* mkstairs/place_branch live in js/mklev.js, which imports this file;
   wired to keep the import one-way.
   var, not let: wired from mklev.js's top level, which can run before this
   body evaluates (see the add_room_fn note in js/sp_lev.js). */
var mkmaze_mklev_fns;
export function mkmaze_wire_mklev(fns) { mkmaze_mklev_fns = fns; }

const ORC_LEADER = 1;
const orcfruit = ['paddle cactus', 'dwarven root'];

// src/options.c:8170 fruitadd(), for the non-user fruit names attached to
// Orcish Town loot. These short fixed names need only the normal lookup and
// insertion path.
function add_orc_fruit(name) {
    let highest = 0;
    for (let fruit = game.ffruit; fruit; fruit = fruit.nextf) {
        highest = Math.max(highest, fruit.fid | 0);
        if (fruit.fname === name)
            return fruit.fid;
    }
    if (highest >= 127)
        return rnd(127);
    const fruit = { fname: name, fid: highest + 1,
                    nextf: game.ffruit || null };
    game.ffruit = fruit;
    if (game.flags)
        game.flags.made_fruit = true;
    return fruit.fid;
}

// src/mkobj.c:253 mksobj_migr_to_species(). The destination species mask is
// kept until an eligible monster receives the stolen item on a later level.
function migr_booty_item(otyp, gang) {
    const otmp = mksobj(otyp, true, false);
    otmp.where = OBJ_MIGRATING;
    otmp.owornmask = MIGR_TO_SPECIES;
    otmp.migr_species = MFLAGS.M2_ORC;
    otmp.omigr_from_dnum = game.u.uz.dnum;
    otmp.omigr_from_dlevel = game.u.uz.dlevel;
    (game.migrating_objs ||= []).unshift(otmp);

    if (gang != null) {
        new_oname(otmp, gang.length + 1);
        otmp.oname = gang;
        if (game.objects[otyp].oc_class === OCLASSES.FOOD_CLASS) {
            if (otyp === ONAMES.SLIME_MOLD)
                otmp.spe = add_orc_fruit(orcfruit[rn2(orcfruit.length)]);
            otmp.quan += rn2(3);
            otmp.owt = weight(otmp);
        }
    }
    return otmp;
}

// src/mkmaze.c:753 shiny_orc_stuff().
function shiny_orc_stuff(mtmp) {
    const isCaptain = mtmp.mnum === PMNAMES.PM_ORC_CAPTAIN;
    const goldprob = isCaptain ? 600 : 300;
    const gemprob = Math.trunc(goldprob / 4);

    if (rn2(1000) < goldprob) {
        const otmp = mksobj(ONAMES.GOLD_PIECE, true, false);
        otmp.quan = 1 + rnd(goldprob);
        otmp.owt = weight(otmp);
        mpickobj(mtmp, otmp);
    }
    if (rn2(1000) < gemprob) {
        const otmp = mkobj(OCLASSES.GEM_CLASS, false);
        if (otmp.otyp !== ONAMES.ROCK)
            mpickobj(mtmp, otmp);
    }
    if (isCaptain || !rn2(8)) {
        const otyp = rnd_otyp_by_namedesc('shiny', OCLASSES.RING_CLASS, 0);
        if (otyp !== ONAMES.STRANGE_OBJECT)
            mpickobj(mtmp, mksobj(otyp, true, false));
    }
}

// src/mkmaze.c:716 migrate_orc().
function migrate_orc(mtmp, mflags, migrate_monster) {
    const curDepth = depth(game.u.uz);
    const dgn = game.dungeons[game.u.uz.dnum];
    const maxDepth = dunlevs_in_dungeon(game.u.uz) + dgn.depth_start - 1;
    let nlev;

    if (mflags === ORC_LEADER) {
        nlev = maxDepth;
        if (!rn2(40))
            nlev--;
        mtmp.migflags = (mtmp.migflags || 0) | MIGR_LEFTOVERS;
    } else {
        nlev = rn2((maxDepth - curDepth) + 1) + curDepth;
        if (nlev === curDepth)
            nlev++;
        if (nlev > maxDepth)
            nlev = maxDepth;
        mtmp.migflags = (mtmp.migflags || 0) & ~MIGR_LEFTOVERS;
    }

    const dest = {};
    get_level(dest, nlev);
    migrate_monster(mtmp, dest, MIGR_RANDOM);
}

// src/mkmaze.c:799 stolen_booty(). Orcish Town creates stolen goods and
// sends the raiding gang deeper into the Mines after the level script runs.
async function stolen_booty() {
    const { migrate_monster } = await import('./trap.js');
    const gang = rndorcname();
    let cnt, otyp, mtmp;

    cnt = rnd(4);
    for (let i = 0; i < cnt; i++)
        migr_booty_item(rn2(4) ? ONAMES.TALLOW_CANDLE
                               : ONAMES.WAX_CANDLE, gang);
    cnt = rnd(3);
    for (let i = 0; i < cnt; i++)
        migr_booty_item(ONAMES.SKELETON_KEY, gang);
    otyp = rn1((ONAMES.GAUNTLETS_OF_DEXTERITY - ONAMES.LEATHER_GLOVES) + 1,
               ONAMES.LEATHER_GLOVES);
    migr_booty_item(otyp, gang);

    cnt = rnd(10);
    for (let i = 0; i < cnt; i++) {
        otyp = rn1(ONAMES.TIN - ONAMES.TRIPE_RATION + 1,
                   ONAMES.TRIPE_RATION);
        if (otyp !== ONAMES.LEMBAS_WAFER
            && (game.objects[otyp].oc_prob !== 0
                || otyp === ONAMES.C_RATION || otyp === ONAMES.K_RATION)
            && otyp !== ONAMES.CORPSE && otyp !== ONAMES.EGG
            && otyp !== ONAMES.TIN)
            migr_booty_item(otyp, gang);
    }
    migr_booty_item(rn2(2) ? ONAMES.LONG_SWORD
                            : ONAMES.SILVER_SABER, gang);

    mtmp = await makemon(game.mons[PMNAMES.PM_ORC_CAPTAIN], 0, 0, MM_NONAME);
    if (mtmp) {
        christen_monst(mtmp, upstart(gang));
        mtmp.mpeaceful = false;
        set_malign(mtmp);
        shiny_orc_stuff(mtmp);
        migrate_orc(mtmp, ORC_LEADER, migrate_monster);
    }

    for (const mon of (game.level.monsters || [])) {
        if (DEADMONSTER(mon))
            continue;
        if (is_orc(mon.data) && !has_mgivenname(mon) && rn2(10)
            && mon.mnum !== PMNAMES.PM_ORC_CAPTAIN)
            christen_orc(mon, upstart(gang), '');
    }

    cnt = rn2(10) + 5;
    for (let i = 0; i < cnt; i++) {
        const mtyp = rn2((PMNAMES.PM_ORC_SHAMAN - PMNAMES.PM_ORC) + 1)
                     + PMNAMES.PM_ORC;
        mtmp = await makemon(game.mons[mtyp], 0, 0, MM_NONAME);
        if (mtmp) {
            shiny_orc_stuff(mtmp);
            migrate_orc(mtmp, 0, migrate_monster);
        }
    }
    game.ransacked = false;
}

// src/mkmaze.c:570 fixup_special() — post-script placement of lregions and
// the per-level oddities. The medusa statues, cleric graveyard, stronghold,
// baalzebub and ransacked-mines arms are below; the endgame water/air arm
// builds the bubbles/clouds before any lregion is placed.
export async function fixup_special() {
    const lregions = game.lregions || [];
    let added_branch = false;

    if (Is_waterlevel(game.u.uz) || Is_airlevel(game.u.uz)) {
        game.level.flags.hero_memory = 0;
        /* water level is an odd beast - it has to be set up
           before calling place_lregions etc. */
        await setup_waterlevel();
    }

    for (const r of lregions) {
        let lev = null;
        switch (r.rtype) {
        case LR_BRANCH:
            added_branch = true;
            /* FALLTHRU to place */
        case LR_PORTAL:
        case LR_UPSTAIR:
        case LR_DOWNSTAIR:
            if (r.rtype === LR_PORTAL) {
                /* src/mkmaze.c:591 — a leading digit means "chutes and
                   ladders" (same-dungeon dlevel); otherwise the name
                   resolves through find_level() */
                if (r.rname && r.rname[0] >= '0' && r.rname[0] <= '9') {
                    lev = { dnum: game.u.uz.dnum,
                            dlevel: parseInt(r.rname, 10) };
                } else {
                    const sp = r.rname ? find_level(r.rname) : null;
                    if (sp)
                        lev = { dnum: sp.dlevel.dnum,
                                dlevel: sp.dlevel.dlevel };
                    else
                        note_unported_mkmaze('fixup_special:portal_dest');
                }
            }
            await place_lregion(r.inarea.x1, r.inarea.y1,
                                r.inarea.x2, r.inarea.y2,
                                r.delarea.x1, r.delarea.y1,
                                r.delarea.x2, r.delarea.y2, r.rtype, lev);
            break;
        default:
            /* save the region outlines for goto_level() */
            if (r.rtype === LR_TELE || r.rtype === LR_UPTELE)
                game.updest = { lx: r.inarea.x1, ly: r.inarea.y1,
                                hx: r.inarea.x2, hy: r.inarea.y2,
                                nlx: r.delarea.x1, nly: r.delarea.y1,
                                nhx: r.delarea.x2, nhy: r.delarea.y2 };
            if (r.rtype === LR_TELE || r.rtype === LR_DOWNTELE)
                game.dndest = { lx: r.inarea.x1, ly: r.inarea.y1,
                                hx: r.inarea.x2, hy: r.inarea.y2,
                                nlx: r.delarea.x1, nly: r.delarea.y1,
                                nhx: r.delarea.x2, nhy: r.delarea.y2 };
            break;
        }
    }

    /* place dungeon branch if not placed above */
    if (!added_branch && Is_branchlev_here())
        await place_lregion(0, 0, 0, 0, 0, 0, 0, 0, LR_BRANCH, null);

    /* src/mkmaze.c:649 — still need to add some stuff to level file */
    const on_lev = (key) => {
        const sl = game.special_levels?.[key];
        return sl && game.u.uz.dnum === sl.dnum
               && game.u.uz.dlevel === sl.dlevel;
    };
    if (on_lev('medusa_level')) {
        /* the first room defined on the medusa level gets 1..4 petrified
           adventurers from the scoreboard, plus one more that skips the
           goodpos test; each re-rolls while the species resists stoning */
        let otmp;
        const croom = game.level.rooms[0];

        for (let tryct = rnd(4); tryct; tryct--) {
            const x = somex(croom);
            const y = somey(croom);
            if (goodpos(x, y, null, 0)) {
                let tryct2 = 0;

                otmp = mk_tt_object(ONAMES.STATUE, x, y);
                while (++tryct2 < 100 && otmp
                       && (poly_when_stoned(game.mons[otmp.corpsenm])
                           || ((game.mons[otmp.corpsenm].mresists ?? 0)
                               & MFLAGS.MR_STONE))) {
                    /* set_corpsenm() handles weight too */
                    set_corpsenm(otmp, rndmonnum());
                }
            }
        }

        if (rn2(2))
            otmp = mk_tt_object(ONAMES.STATUE, somex(croom), somey(croom));
        else /* Medusa statues don't contain books */
            otmp = mkcorpstat(ONAMES.STATUE, null, null,
                              somex(croom), somey(croom), 0 /* NONE */);
        if (otmp) {
            let tryct = 0;
            while (++tryct < 100
                   && (((game.mons[otmp.corpsenm].mresists ?? 0)
                        & MFLAGS.MR_STONE)
                       || poly_when_stoned(game.mons[otmp.corpsenm]))) {
                /* set_corpsenm() handles weight too */
                set_corpsenm(otmp, rndmonnum());
            }
        }
    } else if (game.urole?.mnum === PMNAMES.PM_CLERIC
               && game.u.uz.dnum === game.quest_dnum) {
        /* less chance for undead corpses (lured from lower morgues) */
        game.level.flags.graveyard = 1;
    } else if (on_lev('stronghold_level')) {
        game.level.flags.graveyard = 1;
    } else if (on_lev('baalzebub_level')) {
        /* custom wallify the "beetle" portion of the level */
        await baalz_fixup();
    } else if (game.u.uz.dnum === game.mines_dnum && game.ransacked) {
        await stolen_booty();
    }

    if (Is_special(game.u.uz)?.flags?.town)
        game.level.flags.has_town = 1;

    game.lregions = [];
}

// src/mkmaze.c:475 baalz_fixup() — fix up Baalzebub's lair, which depicts a
// level-sized beetle; its legs are walls within solid rock that regular
// wallification would classify as superfluous. The two POOL squares mark
// spots needing the post-wallify corner fixes, and the iron-bar "eyes" get
// diggable columns in front of them. Draws only if a monster stands on a
// pool spot (rloc).
async function baalz_fixup() {
    const g = game;
    let x, y, lastx, lasty;

    const bughack = { inarea: { x1: 0, y1: 0, x2: 0, y2: 0 },
                      delarea: { x1: COLNO, y1: ROWNO,
                                 x2: COLNO, y2: ROWNO } };

    /* find low and high x for to-be-wallified portion of level */
    y = (ROWNO / 2) | 0;
    lastx = 0;
    for (x = 0; x < COLNO; ++x)
        if (((g.level.at(x, y)?.wall_info ?? 0) & W_NONDIGGABLE) !== 0) {
            if (!lastx)
                bughack.inarea.x1 = x + 1;
            lastx = x;
        }
    bughack.inarea.x2 = ((lastx > bughack.inarea.x1) ? lastx : x) - 1;
    /* find low and high y for to-be-wallified portion of level */
    x = bughack.inarea.x1;
    lasty = 0;
    for (y = 0; y < ROWNO; ++y)
        if (((g.level.at(x, y)?.wall_info ?? 0) & W_NONDIGGABLE) !== 0) {
            if (!lasty)
                bughack.inarea.y1 = y + 1;
            lasty = y;
        }
    bughack.inarea.y2 = ((lasty > bughack.inarea.y1) ? lasty : y) - 1;
    /* two pools mark where special post-wallify fix-ups are needed */
    for (x = bughack.inarea.x1; x <= bughack.inarea.x2; ++x)
        for (y = bughack.inarea.y1; y <= bughack.inarea.y2; ++y) {
            const loc = g.level.at(x, y);
            if (loc.typ === POOL) {
                loc.typ = HWALL;
                if (bughack.delarea.x1 === COLNO) {
                    bughack.delarea.x1 = x; bughack.delarea.y1 = y;
                } else {
                    bughack.delarea.x2 = x; bughack.delarea.y2 = y;
                }
            } else if (loc.typ === IRONBARS) {
                /* novelty effect; allowing digging in front of 'eyes' */
                if (isok(x - 1, y)
                    && ((g.level.at(x - 1, y).wall_info ?? 0)
                        & W_NONDIGGABLE) !== 0) {
                    g.level.at(x - 1, y).wall_info &= ~W_NONDIGGABLE;
                    if (isok(x - 2, y))
                        g.level.at(x - 2, y).wall_info &= ~W_NONDIGGABLE;
                } else if (isok(x + 1, y)
                           && ((g.level.at(x + 1, y).wall_info ?? 0)
                               & W_NONDIGGABLE) !== 0) {
                    g.level.at(x + 1, y).wall_info &= ~W_NONDIGGABLE;
                    if (isok(x + 2, y))
                        g.level.at(x + 2, y).wall_info &= ~W_NONDIGGABLE;
                }
            }
        }

    /* the wallify pass sees the bughack region via game.bughack, which
       fix_wall_spines consults (mkmaze.c:212) */
    g.bughack = bughack;
    mkmaze_mklev_fns?.wallification?.(
        Math.max(bughack.inarea.x1 - 2, 1),
        Math.max(bughack.inarea.y1 - 2, 0),
        Math.min(bughack.inarea.x2 + 2, COLNO - 1),
        Math.min(bughack.inarea.y2 + 2, ROWNO - 1));

    /* bughack hack for rear-most legs on baalz level; first joint on both
       top and bottom gets a bogus extra connection to room area, producing
       unwanted rectangles; change back to separated legs */
    x = bughack.delarea.x1; y = bughack.delarea.y1;
    if (isok(x, y)
        && (g.level.at(x, y).typ === TLWALL
            || g.level.at(x, y).typ === TRWALL)
        && isok(x, y + 1) && g.level.at(x, y + 1).typ === TUWALL) {
        g.level.at(x, y).typ = (g.level.at(x, y).typ === TLWALL)
                               ? BRCORNER : BLCORNER;
        g.level.at(x, y + 1).typ = HWALL;
        const mtmp = m_at(x, y);
        if (mtmp) { /* something at temporary pool... */
            const { rloc } = await import('./teleport.js');
            await rloc(mtmp, RLOC_ERR | RLOC_NOMSG);
        }
    }

    x = bughack.delarea.x2; y = bughack.delarea.y2;
    if (isok(x, y)
        && (g.level.at(x, y).typ === TLWALL
            || g.level.at(x, y).typ === TRWALL)
        && isok(x, y - 1) && g.level.at(x, y - 1).typ === TDWALL) {
        g.level.at(x, y).typ = (g.level.at(x, y).typ === TLWALL)
                               ? TRCORNER : TLCORNER;
        g.level.at(x, y - 1).typ = HWALL;
        const mtmp = m_at(x, y);
        if (mtmp) { /* something at temporary pool... */
            const { rloc } = await import('./teleport.js');
            await rloc(mtmp, RLOC_ERR | RLOC_NOMSG);
        }
    }

    /* reset bughack region; set low end to <COLNO,ROWNO> so that
       within_bounded_area() in fix_wall_spines() will fail */
    g.bughack = { inarea: { x1: COLNO, y1: ROWNO, x2: COLNO, y2: ROWNO },
                  delarea: { x1: COLNO, y1: ROWNO, x2: COLNO, y2: ROWNO } };
}

/* src/dungeon.c Is_branchlev() — a branch has an end on this level. */
function Is_branchlev_here() {
    for (const br of (game.branches || [])) {
        if ((br.end1.dnum === game.u.uz.dnum
             && br.end1.dlevel === game.u.uz.dlevel)
            || (br.end2.dnum === game.u.uz.dnum
                && br.end2.dlevel === game.u.uz.dlevel))
            return br;
    }
    return null;
}

// src/mkmaze.c:32 mz_move()
function mz_move(c, dir) {
    switch (dir) {
    case 0: --c.y; break;
    case 1: c.x++; break;
    case 2: c.y++; break;
    case 3: --c.x; break;
    }
}

// src/mkmaze.c:297 okay() — can the maze walk step two cells this way?
//
// The bounds are gx.x_maze_max/gy.y_maze_max, normally (COLNO-1)&~1 = 78
// and (ROWNO-1)&~1 = 20 (decl.c:827) but TEMPORARILY REDUCED by
// create_maze() while it carves the small pre-scale maze.
function okay(x, y, dir) {
    const c = { x, y };
    mz_move(c, dir);
    mz_move(c, dir);
    if (c.x < 3 || c.y < 3 || c.x > (game.x_maze_max ?? 78)
        || c.y > (game.y_maze_max ?? 20)
        || game.level.at(c.x, c.y)?.typ !== STONE)
        return false;
    return true;
}

// src/mkmaze.c:309 maze0xy() — a random odd cell inside the maze bounds.
// Two draws, x then y, against the CURRENT (possibly reduced) bounds.
function maze0xy(cc) {
    cc.x = 3 + 2 * rn2(((game.x_maze_max ?? 78) >> 1) - 1);
    cc.y = 3 + 2 * rn2(((game.y_maze_max ?? 20) >> 1) - 1);
}

// src/mkmaze.c:1318 mazexy(); find a random corridor square.
export function mazexy(cc) {
    const allowedtyp = game.level.flags?.corrmaze ? CORR : ROOM;
    let cpt = 0;

    do {
        const x = rnd(game.x_maze_max ?? 78);
        const y = rnd(game.y_maze_max ?? 20);
        if (game.level.at(x, y)?.typ === allowedtyp) {
            cc.x = x;
            cc.y = y;
            return;
        }
    } while (++cpt < 100);

    for (let x = 1; x <= (game.x_maze_max ?? 78); x++)
        for (let y = 1; y <= (game.y_maze_max ?? 20); y++)
            if (game.level.at(x, y)?.typ === allowedtyp) {
                cc.x = x;
                cc.y = y;
                return;
            }

    throw new Error("mazexy: can't find a place");
}

// src/mkmaze.c:1092 populate_maze(); stock a generated random maze.
function populate_maze() {
    const mm = { x: 0, y: 0 };
    let i;

    for (i = rn1(8, 11); i; i--) {
        mazexy(mm);
        mkobj_at(rn2(2) ? OCLASSES.GEM_CLASS : OCLASSES.RANDOM_CLASS,
                 mm.x, mm.y, true);
    }
    for (i = rn1(10, 2); i; i--) {
        mazexy(mm);
        mksobj_at(ONAMES.BOULDER, mm.x, mm.y, true, false);
    }
    for (i = rn2(3); i; i--) {
        mazexy(mm);
        makemon(game.mons[PMNAMES.PM_MINOTAUR], mm.x, mm.y, NO_MM_FLAGS);
    }
    for (i = rn1(5, 7); i; i--) {
        mazexy(mm);
        makemon(null, mm.x, mm.y, NO_MM_FLAGS);
    }
    for (i = rn1(6, 7); i; i--) {
        mazexy(mm);
        mkgold(0, mm.x, mm.y);
    }
    for (i = rn1(6, 7); i; i--)
        mkmaze_mklev_fns?.mktrap?.(0, MKTRAP_MAZEFLAG, null, null);
}

// src/mkmaze.c:892 maze_inbounds()
function maze_inbounds(x, y) {
    return (x >= 2 && y >= 2
            && x < (game.x_maze_max ?? 78) && y < (game.y_maze_max ?? 20)
            && isok(x, y));
}

// src/mkmaze.c:904 maze_remove_deadends() — knock one wall out of each
// dead-end cell. DRAWS one rn2(idx) per qualifying cell, x-outer scan, and
// cells opened earlier in the scan change what later cells see.
function maze_remove_deadends(typ) {
    const dirok = [0, 0, 0, 0];
    let idx, idx2;

    for (let x = 2; x < (game.x_maze_max ?? 78); x++)
        for (let y = 2; y < (game.y_maze_max ?? 20); y++)
            if (ACCESSIBLE(game.level.at(x, y).typ) && (x % 2) && (y % 2)) {
                idx = idx2 = 0;
                for (let dir = 0; dir < 4; dir++) {
                    /* note: mz_move() is a macro which modifies
                       one of its first two parameters */
                    const c = { x, y };
                    const c2 = { x, y };
                    mz_move(c, dir);
                    if (!maze_inbounds(c.x, c.y)) {
                        idx2++;
                        continue;
                    }
                    mz_move(c2, dir);
                    mz_move(c2, dir);
                    if (!maze_inbounds(c2.x, c2.y)) {
                        idx2++;
                        continue;
                    }
                    if (!ACCESSIBLE(game.level.at(c.x, c.y).typ)
                        && ACCESSIBLE(game.level.at(c2.x, c2.y).typ)) {
                        dirok[idx++] = dir;
                        idx2++;
                    }
                }
                if (idx2 >= 3 && idx > 0) {
                    const c = { x, y };
                    mz_move(c, dirok[rn2(idx)]);
                    game.level.at(c.x, c.y).typ = typ;
                }
            }
}

// src/mkmaze.c:950 create_maze() — a maze with the given corridor width and
// wall thickness: fill a grid, shrink the maze bounds, walk a unit maze,
// optionally remove dead ends, restore the bounds and scale the result up.
//
// Draws: rnd(4) for each of corrwid/wallthick when passed as -1, then
// maze0xy's pair, walkfrom's rn2 chain, and maze_remove_deadends when asked.
export function create_maze(corrwid, wallthick, rmdeadends) {
    const mm = { x: 0, y: 0 };
    const tmp_xmax = game.x_maze_max;
    const tmp_ymax = game.y_maze_max;

    if (corrwid === -1)
        corrwid = rnd(4);

    if (wallthick === -1)
        wallthick = rnd(4) - corrwid;

    if (wallthick < 1)
        wallthick = 1;
    else if (wallthick > 5)
        wallthick = 5;

    if (corrwid < 1)
        corrwid = 1;
    else if (corrwid > 5)
        corrwid = 5;

    const scale = corrwid + wallthick;
    const rdx = (((tmp_xmax ?? 78) / scale) | 0);
    const rdy = (((tmp_ymax ?? 20) / scale) | 0);

    if (game.level.flags?.corrmaze) {
        for (let x = 2; x < (rdx * 2); x++)
            for (let y = 2; y < (rdy * 2); y++)
                game.level.at(x, y).typ = STONE;
    } else {
        for (let x = 2; x <= (rdx * 2); x++)
            for (let y = 2; y <= (rdy * 2); y++)
                game.level.at(x, y).typ = ((x % 2) && (y % 2)) ? STONE : HWALL;
    }

    /* set upper bounds for maze0xy and walkfrom */
    game.x_maze_max = (rdx * 2);
    game.y_maze_max = (rdy * 2);

    /* create maze */
    maze0xy(mm);
    walkfrom(mm.x, mm.y, 0);

    if (rmdeadends)
        maze_remove_deadends(game.level.flags?.corrmaze ? CORR : ROOM);

    /* restore bounds */
    game.x_maze_max = tmp_xmax;
    game.y_maze_max = tmp_ymax;

    /* scale maze up if needed */
    if (scale > 2) {
        const x_maze_max = game.x_maze_max ?? 78;
        const y_maze_max = game.y_maze_max ?? 20;
        const tmpmap = [];

        /* back up the existing smaller maze */
        for (let x = 1; x < x_maze_max; x++) {
            tmpmap[x] = [];
            for (let y = 1; y < y_maze_max; y++)
                tmpmap[x][y] = game.level.at(x, y).typ;
        }

        /* do the scaling */
        let x = 2, rx = 2;
        while (rx < x_maze_max) {
            const mx = (x % 2) ? corrwid
                       : (x === 2 || x === rdx * 2) ? 1
                         : wallthick;
            let y = 2, ry = 2;
            while (ry < y_maze_max) {
                const my = (y % 2) ? corrwid
                           : (y === 2 || y === rdy * 2) ? 1
                             : wallthick;
                for (let dx = 0; dx < mx; dx++)
                    for (let dy = 0; dy < my; dy++) {
                        if (rx + dx >= x_maze_max || ry + dy >= y_maze_max)
                            break;      /* C: breaks the dy loop only */
                        game.level.at(rx + dx, ry + dy).typ = tmpmap[x][y];
                    }
                ry += my;
                y++;
            }
            rx += mx;
            x++;
        }
    }
}
sp_lev_wire_create_maze(create_maze);

// src/mkmaze.c:1279 walkfrom() — the recursive maze carver (the non-MICRO
// build); the draw order of its rn2(q) picks depends on this exact shape.
export function walkfrom(x, y, typ) {
    if (!typ)
        typ = game.level.flags?.corrmaze ? CORR : ROOM;

    const loc0 = game.level.at(x, y);
    if (loc0 && !IS_DOOR(loc0.typ)) {
        loc0.typ = typ;
        loc0.flags = 0;
    }

    for (;;) {
        const dirs = [];
        for (let a = 0; a < 4; a++)
            if (okay(x, y, a))
                dirs.push(a);
        if (!dirs.length)
            return;
        const dir = dirs[rn2(dirs.length)];
        const c = { x, y };
        mz_move(c, dir);
        const mid = game.level.at(c.x, c.y);
        if (mid) { mid.typ = typ; }
        mz_move(c, dir);
        walkfrom(c.x, c.y, typ);
        /* C's mz_move MACRO mutates the local x,y, so after the recursive
           call the while(1) continues from the MOVED position, not the
           frame's original one. The draw order depends on this. */
        x = c.x; y = c.y;
    }
}

/* ==== the endgame planes (src/mkmaze.c:1464-2103) ==== */

// src/mkmaze.c:1464 mkportal() — a portal "trap" must be matched by a portal
// in the destination dungeon/dlevel. maketrap comes through the mklev wire.
export function mkportal(x, y, todnum, todlevel) {
    const ttmp = mkmaze_mklev_fns?.maketrap?.(x, y, MAGIC_PORTAL);

    if (!ttmp) {
        /* impossible("portal on top of portal?") */
        note_unported_mkmaze('mkportal:refused');
        return;
    }
    ttmp.dst = { dnum: todnum, dlevel: todlevel };
}

// src/mkmaze.c:1484 fumaroles() — lava emits poison gas at random. Up to
// rn2(3)+2 probe points on a hot fire level; each that lands on lava grows
// a gas cloud (create_gas_cloud draws size/damage/shape).
export async function fumaroles() {
    let nmax = rn2(3);
    let sizemin = 5;
    let snd = false, loud = false;

    if (Is_firelevel(game.u.uz)) {
        nmax++;
        sizemin += 5;
    }
    if ((game.level.flags.temperature | 0) > 0) {
        nmax++;
        sizemin += 5;
    }

    for (let n = nmax; n; n--) {
        const x = rn1(COLNO - 4, 3);
        const y = rn1(ROWNO - 4, 3);

        if (game.level.at(x, y)?.typ === LAVAPOOL) {
            const { create_gas_cloud } = await import('./region.js');
            const r = create_gas_cloud(x, y, rn1(10, sizemin), rn1(10, 5));

            /* include/region.h:22 clear_heros_fault(): not the hero's doing */
            if (r)
                r.player_flags = (r.player_flags | 0) | 2; /* REG_NOT_HEROS */
            snd = true;
            if (distu(x, y) < 15)
                loud = true;
        }
    }
    if (snd) {
        const { Deaf } = await import('./youprop.js');
        if (!Deaf()) {
            const { Norep } = await import('./pline.js');
            await Norep(`You hear a ${loud ? 'loud ' : ''}whoosh!`);
        }
    }
}

/*
 * Special waterlevel stuff in endgame (TH) — src/mkmaze.c:1520.
 *
 * C keeps the bubble list on svb.bbubbles/ge.ebubbles, the bounds in
 * svx/svy fields and hero_bubble/up in file-scope statics; one session is
 * one game process, so module state has the same lifetime. The list is
 * written to (and read back from) the in-memory saved level by
 * save_waterlevel()/restore_waterlevel(), where C uses the level file.
 */

/* bubble movement boundaries — src/mkmaze.c:1523 gbxmin..gbymax over the
   svx.xmin/svy.ymin/svx.xmax/svy.ymax statics */
let wlev_xmin = 0, wlev_ymin = 0, wlev_xmax = 0, wlev_ymax = 0;
const gbxmin = () => wlev_xmin + 1;
const gbymin = () => wlev_ymin + 1;
const gbxmax = () => wlev_xmax - 1;
const gbymax = () => wlev_ymax - 1;

/* svb.bbubbles / ge.ebubbles; static struct bubble *hero_bubble */
let bbubbles = null, ebubbles = null;
let hero_bubble = null;

/* include/hack.h:162 enum bubble_contains_types */
const CONS_OBJ = 0, CONS_MON = 1, CONS_HERO = 2, CONS_TRAP = 3;

/* the whole-rm backdrop stamps movebubbles/setup_waterlevel write into the
   hero's map memory: C's water_pos/air_pos (mkmaze.c:1541) and
   setup_waterlevel's cmap_to_glyph. Values mirror display.js
   terrain_glyph() rows for WATER/AIR/CLOUD. */
const WATER_GLYPH = () => ({ ch: '`', color: CLR_BRIGHT_BLUE, decgfx: true,
                             glyph: { kind: 'cmap',
                                      cmap: cmap_names.S_water } });
const AIR_GLYPH = () => ({ ch: ' ', color: CLR_CYAN, decgfx: false,
                           glyph: { kind: 'cmap', cmap: cmap_names.S_air } });
const CLOUD_GLYPH = () => ({ ch: '#', color: CLR_GRAY, decgfx: false,
                             glyph: { kind: 'cmap',
                                      cmap: cmap_names.S_cloud } });

/* struct rm assignment — levl[x][y] = water_pos/air_pos resets every field
   of the square, not just typ and lit */
function set_whole_rm(loc, typ, lit, memglyph) {
    loc.typ = typ;
    loc.lit = !!lit;
    loc.waslit = false;
    loc.seenv = 0;
    loc.flags = 0;
    loc.doormask = 0;
    loc.horizontal = false;
    loc.roomno = 0;
    loc.edge = false;
    loc.wall_info = 0;
    loc.remembered_glyph = memglyph;
}

// src/mkmaze.c:1538 movebubbles() — augment the Planes of Water (bubbles)
// and Air (clouds); called from goto_level() when arriving and
// moveloop_core() when on the level.
let movebubbles_up = false;         /* static boolean up = FALSE */

export async function movebubbles() {
    const g = game;

    /* set up the portal the first time bubbles are moved */
    if (!g.wportal)
        set_wportal();

    vision_recalc(2);

    hero_bubble = null;

    if (Is_waterlevel(g.u.uz)) {
        /* keep attached ball&chain separate from bubble objects */
        if (g.uball)
            note_unported_mkmaze('movebubbles:unplacebc');

        /*
         * Pick up everything inside of a bubble then fill all bubble
         * locations.
         */
        for (let b = movebubbles_up ? bbubbles : ebubbles; b;
             b = movebubbles_up ? b.next : b.prev) {
            if (b.cons.length)
                throw new Error('movebubbles: cons != null');
            for (let i = 0, x = b.x; i < b.bm[0]; i++, x++)
                for (let j = 0, y = b.y; j < b.bm[1]; j++, y++)
                    if (b.bm[j + 2] & (1 << i)) {
                        if (!isok(x, y))
                            continue;   /* impossible("bad pos") */

                        /* pick up objects, monsters, hero, and traps */
                        const olist = (g.level.objects || [])
                            .filter(o => o.ox === x && o.oy === y);
                        if (olist.length) {
                            for (const otmp of olist) {
                                obj_extract_self(otmp);  /* remove_object */
                                otmp.ox = otmp.oy = 0;
                            }
                            /* C reverses the pile into cons->list and
                               reverses it again on the way back down; the
                               head-first array with reversed placement
                               reproduces that */
                            b.cons.unshift({ x, y, what: CONS_OBJ,
                                             list: olist });
                        }
                        const mon = m_at(x, y);
                        if (mon) {
                            b.cons.unshift({ x, y, what: CONS_MON,
                                             list: mon });
                            /* mon->wormno remove_worm: no worms swim the
                               Plane of Water's bubbles in any session */
                            remove_monster(x, y);
                            await newsym(x, y); /* clean up old position */
                            mon.mx = mon.my = 0;
                            mon.mstate = (mon.mstate | 0) | MON_BUBBLEMOVE;
                        }
                        if (!g.u.uswallow && u_at(x, y)) {
                            b.cons.unshift({ x, y, what: CONS_HERO,
                                             list: null });
                            hero_bubble = b;
                        }
                        const btrap = t_at(x, y);
                        if (btrap) {
                            b.cons.unshift({ x, y, what: CONS_TRAP,
                                             list: btrap });
                        }

                        set_whole_rm(g.level.at(x, y), WATER, 0,
                                     WATER_GLYPH());
                        block_point(x, y);
                    }
        }
    } else if (Is_airlevel(g.u.uz)) {
        for (let x = 1; x <= COLNO - 1; x++)
            for (let y = 0; y <= ROWNO - 1; y++) {
                /* air_pos: the remembered glyph is the CLOUD one even
                   though the terrain reverts to AIR (mkmaze.c:1543) */
                set_whole_rm(game.level.at(x, y), AIR, 1, CLOUD_GLYPH());
                recalc_block_point(x, y);
                /* all air or all cloud around the perimeter of the Air
                   level tends to look strange; break up the pattern */
                const xedge = (x < gbxmin() || x > gbxmax());
                const yedge = (y < gbymin() || y > gbymax());
                if (xedge || yedge) {
                    if (!rn2(xedge ? 3 : 5)) {
                        game.level.at(x, y).typ = CLOUD;
                        block_point(x, y);
                    }
                }
            }
    }

    /*
     * Every second time traverse down.  This is because otherwise
     * all the junk that changes owners when bubbles overlap
     * would eventually end up in the last bubble in the chain.
     */
    movebubbles_up = !movebubbles_up;
    for (let b = movebubbles_up ? bbubbles : ebubbles; b;
         b = movebubbles_up ? b.next : b.prev) {
        const rx = rn2(3), ry = rn2(3);

        await mv_bubble(b, b.dx + 1 - (!b.dx ? rx : (rx ? 1 : 0)),
                        b.dy + 1 - (!b.dy ? ry : (ry ? 1 : 0)), false);
    }

    /* put attached ball&chain back */
    if (Is_waterlevel(g.u.uz) && g.uball)
        note_unported_mkmaze('movebubbles:placebc');
    g.vision_full_recalc = 1;
}

// src/mkmaze.c:1688 water_friction() — when moving in water, possibly
// (1 in 3) alter the intended destination.
export async function water_friction() {
    const g = game;
    let eff = false;

    /* Swimming — no session hero has intrinsic swimming yet */
    if (g.u.uprops?.SWIMMING && rn2(4))
        return; /* natural swimmers have advantage */

    if (g.u.dx && !rn2(!g.u.dy ? 3 : 6)) { /* 1/3 chance or half that */
        /* cancel delta x and choose an arbitrary delta y value */
        const x = g.u.ux;
        let dy, y;
        do {
            dy = rn2(3) - 1; /* -1, 0, 1 */
            y = g.u.uy + dy;
        } while (dy && (!isok(x, y) || !mklev_is_pool(x, y)));
        g.u.dx = 0;
        g.u.dy = dy;
        eff = true;
    } else if (g.u.dy && !rn2(!g.u.dx ? 3 : 5)) { /* 1/3 or 1/5*(5/6) */
        /* cancel delta y and choose an arbitrary delta x value */
        const y = g.u.uy;
        let dx, x;
        do {
            dx = rn2(3) - 1; /* -1 .. 1 */
            x = g.u.ux + dx;
        } while (dx && (!isok(x, y) || !mklev_is_pool(x, y)));
        g.u.dy = 0;
        g.u.dx = dx;
        eff = true;
    }
    if (eff)
        await pline('Water turbulence affects your movements.');
}

/* is_pool() lives in js/mon.js's wire set; reach it through the same
   mon_fns-style seam sp_lev.js uses, but locally: dynamic would be per
   call, so resolve through the sp_lev wire helper below. */
function mklev_is_pool(x, y) {
    const typ = game.level.at(x, y)?.typ;
    /* include/rm.h is_pool(): POOL, MOAT, WATER */
    return typ === POOL || typ === MOAT || typ === WATER;
}

// src/mkmaze.c:1724 save_waterlevel() — the bubble list is written with the
// level (here: parked on the in-memory saved level) and then freed.
export function save_waterlevel() {
    if (!bbubbles)
        return;

    const blist = [];
    for (let b = bbubbles; b; b = b.next)
        blist.push({ x: b.x, y: b.y, dx: b.dx, dy: b.dy,
                     bm: b.bm.slice() });
    game.level._waterlevel = { bubbles: blist, xmin: wlev_xmin,
                               ymin: wlev_ymin, xmax: wlev_xmax,
                               ymax: wlev_ymax };
    unsetup_waterlevel();       /* release_data() arm */
}

// src/mkmaze.c:1751 restore_waterlevel() — restoring air bubbles on the
// Plane of Water or clouds on the Plane of Air: rebuild the list and
// mv_bubble(b, 0, 0, TRUE) each one (on the Air level that DRAWS the
// rn2(6) cloud-speed gate per bubble, exactly as C's restore does).
export async function restore_waterlevel() {
    const saved = game.level._waterlevel;
    if (!saved)
        return;

    wlev_xmin = saved.xmin;
    wlev_ymin = saved.ymin;
    wlev_xmax = saved.xmax;
    wlev_ymax = saved.ymax;
    let b = null;
    for (const sb of saved.bubbles) {
        const btmp = b;
        b = { x: sb.x, y: sb.y, dx: sb.dx, dy: sb.dy, bm: sb.bm.slice(),
              cons: [], prev: null, next: null };
        if (btmp) {
            btmp.next = b;
            b.prev = btmp;
        } else {
            bbubbles = b;
            b.prev = null;
        }
        await mv_bubble(b, 0, 0, true);
    }
    ebubbles = b;
    if (b)
        b.next = null;
    delete game.level._waterlevel;
}

// src/mkmaze.c:1802 set_wportal() — there better be only one magic portal
// on the water level...
function set_wportal() {
    for (const t of (game.level.traps || []))
        if (t.ttyp === MAGIC_PORTAL) {
            game.wportal = t;
            return;
        }
    game.wportal = null;
    /* impossible("set_wportal(): no portal!") */
}

// src/mkmaze.c:1812 setup_waterlevel() — flood the level's memory with the
// water/air backdrop, then sow the bubble grid: xskip/yskip each draw once,
// and every mk_bubble draws rn2(7) for its size plus its direction pair.
async function setup_waterlevel() {
    const water = Is_waterlevel(game.u.uz);

    if (!water && !Is_airlevel(game.u.uz))
        throw new Error("setup_waterlevel(): neither 'Water' nor 'Air'");

    /* ouch, hardcoded... */
    wlev_xmin = 3;
    wlev_ymin = 1;
    wlev_xmax = Math.min(78, COLNO - 1 - 1);
    wlev_ymax = Math.min(20, ROWNO - 1);

    /* entire level is remembered as one glyph and any unspecified portion
       should default to level's base element rather than to usual stone */
    const typ = water ? WATER : AIR;

    /* set unspecified terrain (stone) and hero's memory to water or air */
    for (let x = 1; x <= COLNO - 1; x++)
        for (let y = 0; y <= ROWNO - 1; y++) {
            const loc = game.level.at(x, y);
            loc.remembered_glyph = water ? WATER_GLYPH() : AIR_GLYPH();
            if (loc.typ === STONE)
                loc.typ = typ;
        }

    /* make bubbles */
    let xskip, yskip;
    if (water) {
        xskip = 10 + rn2(10);
        yskip = 4 + rn2(4);
    } else {
        xskip = 6 + rn2(4);
        yskip = 3 + rn2(3);
    }

    for (let x = gbxmin(); x <= gbxmax(); x += xskip)
        for (let y = gbymin(); y <= gbymax(); y += yskip)
            await mk_bubble(x, y, rn2(7));
}

// src/mkmaze.c:1859 unsetup_waterlevel() — free the bubbles.
function unsetup_waterlevel() {
    bbubbles = ebubbles = null;
}

/* src/mkmaze.c:1872 mk_bubble() — the static bubble bitmasks. "These bit
   masks make visually pleasing bubbles on a normal aspect 25x80 terminal,
   which naturally results in them being mathematically anything but
   symmetric." First two entries are the bounding box. */
const bmask = [
    [2, 1, 0x3],
    [3, 2, 0x7, 0x7],
    [4, 3, 0x6, 0xf, 0x6],
    [5, 3, 0xe, 0x1f, 0xe],
    [6, 4, 0x1e, 0x3f, 0x3f, 0x1e],
    [7, 4, 0x3e, 0x7f, 0x7f, 0x3e],
    [8, 4, 0x7e, 0xff, 0xff, 0x7e],
];

// src/mkmaze.c:1866 mk_bubble()
async function mk_bubble(x, y, n) {
    if (x >= gbxmax() || y >= gbymax())
        return;
    if (n >= bmask.length)
        n = bmask.length - 1;       /* impossible("n too large") */

    if ((x + bmask[n][0] - 1) > gbxmax())
        x = gbxmax() - bmask[n][0] + 1;
    if ((y + bmask[n][1] - 1) > gbymax())
        y = gbymax() - bmask[n][1] + 1;
    const b = {
        x, y,
        dx: 1 - rn2(3),
        dy: 1 - rn2(3),
        /* y dimension is the length of bitmap data - see bmask above */
        bm: bmask[n].slice(),
        cons: [],
        prev: null, next: null,
    };
    if (!bbubbles)
        bbubbles = b;
    if (ebubbles) {
        ebubbles.next = b;
        b.prev = ebubbles;
    } else
        b.prev = null;
    b.next = null;
    ebubbles = b;
    await mv_bubble(b, 0, 0, true);
}

// src/mkmaze.c:1929 maybe_adjust_hero_bubble() — maybe change the movement
// direction of the bubble the hero is in: one rn2(2) after every actual
// hero move on the Plane of Water.
export function maybe_adjust_hero_bubble() {
    if (!Is_waterlevel(game.u.uz))
        return;

    if (!game.u.dx && !game.u.dy)
        return;

    if (hero_bubble && !rn2(2)) {
        hero_bubble.dx = game.u.dx;
        hero_bubble.dy = game.u.dy;
    }
}

/*
 * src/mkmaze.c:1955 mv_bubble() — the player, the portal and all other
 * objects and monsters float along with their associated bubbles.  Bubbles
 * may overlap freely, and the contents may get associated with other
 * bubbles in the process.
 */
async function mv_bubble(b, dx, dy, ini) {
    let colli = 0;

    /* clouds move slowly */
    if (!Is_airlevel(game.u.uz) || !rn2(6)) {
        /* move bubble */
        if (dx < -1 || dx > 1 || dy < -1 || dy > 1) {
            dx = sgn(dx);
            dy = sgn(dy);
        }

        /*
         * collision with level borders?
         *      1 = horizontal border, 2 = vertical, 3 = corner
         */
        if (b.x <= gbxmin())
            colli |= 2;
        if (b.y <= gbymin())
            colli |= 1;
        if ((b.x + b.bm[0] - 1) >= gbxmax())
            colli |= 2;
        if ((b.y + b.bm[1] - 1) >= gbymax())
            colli |= 1;

        if (b.x < gbxmin()) {
            await pline(`bubble xmin: x = ${b.x}, xmin = ${gbxmin()}`);
            b.x = gbxmin();
        }
        if (b.y < gbymin()) {
            await pline(`bubble ymin: y = ${b.y}, ymin = ${gbymin()}`);
            b.y = gbymin();
        }
        if ((b.x + b.bm[0] - 1) > gbxmax()) {
            await pline(`bubble xmax: x = ${b.x + b.bm[0] - 1}, xmax = ${
                        gbxmax()}`);
            b.x = gbxmax() - b.bm[0] + 1;
        }
        if ((b.y + b.bm[1] - 1) > gbymax()) {
            await pline(`bubble ymax: y = ${b.y + b.bm[1] - 1}, ymax = ${
                        gbymax()}`);
            b.y = gbymax() - b.bm[1] + 1;
        }

        /* bounce if we're trying to move off the border */
        if (b.x === gbxmin() && dx < 0)
            dx = -dx;
        if (b.x + b.bm[0] - 1 === gbxmax() && dx > 0)
            dx = -dx;
        if (b.y === gbymin() && dy < 0)
            dy = -dy;
        if (b.y + b.bm[1] - 1 === gbymax() && dy > 0)
            dy = -dy;

        b.x += dx;
        b.y += dy;
    }

    /* draw the bubbles */
    for (let i = 0, x = b.x; i < b.bm[0]; i++, x++)
        for (let j = 0, y = b.y; j < b.bm[1]; j++, y++)
            if (b.bm[j + 2] & (1 << i)) {
                if (Is_waterlevel(game.u.uz)) {
                    const loc = game.level.at(x, y);
                    loc.typ = AIR;
                    loc.lit = true;
                    unblock_point(x, y);
                } else if (Is_airlevel(game.u.uz)) {
                    const loc = game.level.at(x, y);
                    loc.typ = CLOUD;
                    loc.lit = true;
                    block_point(x, y);
                }
            }

    if (Is_waterlevel(game.u.uz)) {
        /* replace contents of bubble */
        for (const cons of b.cons) {
            cons.x += dx;
            cons.y += dy;

            switch (cons.what) {
            case CONS_OBJ: {
                /* C walks its reversed chain, prepending each; iterating
                   the head-first array in reverse restores pile order */
                for (let k = cons.list.length - 1; k >= 0; k--) {
                    place_object(cons.list[k], cons.x, cons.y);
                    stackobj(cons.list[k]);
                }
                break;
            }
            case CONS_MON: {
                const mon = cons.list;

                /* mnearto() might fail. We can jump right to
                   elemental_clog from here rather than
                   deal_with_overcrowding() */
                if (!await mnearto(mon, cons.x, cons.y, true, RLOC_NOMSG))
                    await elemental_clog(mon);
                break;
            }
            case CONS_HERO: {
                const mtmp = m_at(cons.x, cons.y);
                const ux0 = game.u.ux, uy0 = game.u.uy;

                game.u.ux = cons.x;     /* u_on_newpos() */
                game.u.uy = cons.y;
                await newsym(ux0, uy0); /* clean up old position */

                if (mtmp) {
                    await mnexto(mtmp, RLOC_NOMSG);
                }
                break;
            }
            case CONS_TRAP: {
                const btrap = cons.list;

                btrap.tx = cons.x;
                btrap.ty = cons.y;
                break;
            }
            default:
                throw new Error('mv_bubble: unknown bubble contents');
            }
        }
        b.cons = [];
    }

    /* boing? */
    switch (colli) {
    case 1:
        b.dy = -b.dy;
        break;
    case 3:
        b.dy = -b.dy;
        /* FALLTHRU */
    case 2:
        b.dx = -b.dx;
        break;
    default:
        /* sometimes alter direction for fun anyway
           (higher probability for stationary bubbles) */
        if (!ini && ((b.dx || b.dy) ? !rn2(20) : !rn2(5))) {
            b.dx = 1 - rn2(3);
            b.dy = 1 - rn2(3);
        }
    }
}

/* include/rm.h:320 CAN_OVERWRITE_TERRAIN() */
const CAN_OVERWRITE_TERRAIN = (ttyp) =>
    (!!game.iflags?.debug_overwrite_stairs || !((ttyp) === LADDER || (ttyp) === STAIRS));

// src/mkmaze.c:77 set_levltyp(); set map terrain type
export function set_levltyp(x, y, newtyp) {
    if (isok(x, y) && newtyp >= STONE && newtyp < MAX_TYPE) {
        const oldtyp = game.level.at(x, y).typ;

        /* hack for secret doors in garden theme rooms */
        if (oldtyp === SDOOR && newtyp === AIR) {
            /* levl[][].typ stays SDOOR rather than change to AIR */
            game.level.at(x, y).arboreal_sdoor = 1;
            return true;
        }

        if (CAN_OVERWRITE_TERRAIN(oldtyp)) {
            /* typ==ICE || (typ==DRAWBRIDGE_UP && drawbridgemask==DB_ICE) */
            const was_ice = is_ice(x, y);

            game.level.at(x, y).typ = newtyp;
            /* TODO?
             *  if oldtyp used flags or horizontal differently from
             *  the way newtyp will use them, clear them.
             */

            if (IS_LAVA(newtyp)) /* [what about IS_LAVA(oldtyp)=>.lit = 0?] */
                game.level.at(x, y).lit = 1;
            if (was_ice && newtyp !== ICE) {
                /* frozen corpses resume rotting, no more ice to melt away */
                obj_ice_effects(x, y, true);
                spot_stop_timers(x, y, MELT_ICE_AWAY);
            }
            if ((IS_FOUNTAIN(oldtyp) !== IS_FOUNTAIN(newtyp))
                || (IS_SINK(oldtyp) !== IS_SINK(newtyp)))
                count_level_features(); /* level.flags.nfountains,nsinks */

            return true;
        }
    }
    return false;
}
