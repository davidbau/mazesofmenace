// teleport.js — position finding.
// C ref: src/teleport.c
//
// Only the pieces level generation and pet placement need are here:
// collect_coords() and enexto()/enexto_core().
//
// collect_coords() is a bigger PRNG consumer than it looks. It walks expanding
// square "rings" around a centre and shuffles each ring, drawing rn2(n) once
// per remaining entry — so a full ring of radius 1 costs 7 draws, radius 2
// costs 15, radius 3 costs 23. With CC_NO_FLAGS there is no filtering at all,
// so the counts are pure geometry clamped to the map edges: that is exactly the
// rn2(8) rn2(7) … rn2(2) rn2(16) rn2(15) … run the recordings show when a pet
// is placed.

import { make_stunned } from './potion.js';
import { UTOTYPE_PORTAL } from './const.js';
import { UTOTYPE_ATSTAIRS } from './const.js';
import { TIMEOUT } from './const.js';
import { TT_BURIEDBALL } from './const.js';
import { buried_ball_to_punishment } from './dig.js';
import { RLOC_NONE, u_at } from './const.js';
import { somexyspace } from './mklev.js';
import { search_special } from './mkroom.js';
import { migrate_to_level } from './dog.js';
import { control_teleport } from './mondata.js';
import { ledger_no } from './dungeon.js';
import { onscary } from './monmove.js';
import { MONSYMS } from './monst_data.js';
import { is_home_elemental } from './makemon.js';
import { mon_has_amulet } from './wizard.js';
import { clamp_hole_destination, seetrap, Trap_Effect_Finished, Trap_Moved_Mon } from './trap.js';
import { NO_TRAP, HOLE, TRAPDOOR, MAGIC_PORTAL, MIGR_RANDOM, MIGR_PORTAL, is_xport, Is_stronghold, Is_botlevel } from './const.js';
import { Your, pline_mon } from './pline.js';
import { yelp } from './sounds.js';
import { get_mleash, m_unleash } from './apply.js';
import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { COLNO, ROWNO, In_endgame, In_quest, In_sokoban, GP_CHECKSCARY,
         NO_MM_FLAGS, RLOC_MSG, RLOC_NOMSG, RLOC_ERR,
         BOLT_LIM, VAULT, STRAT_APPEARMSG, OBJ_FREE, OBJ_INVENT,
         SHOPBASE, TEMPLE, A_STR, A_WIS, TELEP_TRAP, LEVEL_TELEP,
         FORCETRAP, I_SPECIAL, NHW_MENU, MENU_BEHAVE_STANDARD, PICK_ONE,
         SLT_ENCUMBER,
         MENU_ITEMFLAGS_NONE, MENU_ITEMFLAGS_SELECTED } from './const.js';
import { rnl } from './rng.js';
import { pline, see_nearby_objects, canspotmon, canseemon,
         sensemon, see_monsters } from './display.js';
import { Blind, Hallucination, Teleport_control, Teleportation }
    from './youprop.js';
import { is_demon, is_lord, is_prince, is_covetous,
         passes_walls, can_teleport } from './mondata.js';
import { You, You_feel, You_cant } from './pline.js';
import { getlin, preparePunishmentMove, finishPunishmentMove } from './cmd.js';
import { get_level, find_hell, depth, print_dungeon,
         dunlevs_in_dungeon } from './dungeon.js';
import { rnd } from './rng.js';
import { Is_knox_level } from './const.js';
import { schedule_goto, UTOTYPE_NONE, unplacebc, placebc } from './do.js';
import { t_at } from './mon.js';
import { unconscious, deltrap, level_tele_trap } from './trap.js';
import { goodpos, remove_monster, place_monster } from './makemon.js';
import { newsym } from './display.js';
import { vision_recalc, couldsee } from './vision.js';
import { check_capacity, in_rooms, invocation_message, spoteffects,
         u_locomotion }
    from './hack.js';
import { morehungry } from './eat.js';
import { getpos } from './getpos.js';
import { Amonnam, Monnam, mon_nam } from './do_name.js';
import { distu, distmin } from './hacklib.js';

import { isok, ECMD_OK, ECMD_TIME, VIBRATING_SQUARE, is_pit, is_hole } from './const.js';
import { ONAMES } from './objects_data.js';
import { learnscroll } from './read.js';
import { ACURR, exercise, near_capacity } from './attrib.js';
import { PMNAMES } from './monst_data.js';
import { known_spell, spe_Fresh, spe_Unknown, spelleffects, tport_spell,
         NOOP_SPELL, HIDE_SPELL, ADD_SPELL }
    from './spell.js';
import { tty_create_nhwindow, tty_start_menu, tty_add_menu, tty_end_menu,
         tty_select_menu, tty_destroy_nhwindow, ATR_NONE }
    from './tty/wintty.js';
import { NO_COLOR } from './terminal.js';

// include/hack.h:1204-1210

function note_unported_teleport(what) {
    (game.unported ||= new Set()).add('teleport:' + what);
}

export const CC_NO_FLAGS = 0x00;
export const CC_INCL_CENTER = 0x01;
export const CC_UNSHUFFLED = 0x02;
export const CC_RING_PAIRS = 0x04;
export const CC_SKIP_MONS = 0x08;
export const CC_SKIP_INACCS = 0x10;

// include/hack.h:1170
export const GP_ALLOW_XY = 0x00200000;

// src/teleport.c:578 collect_coords()
//
// Returns an array of {x, y}. `maxradius` of 0 means "cover the whole map".
export function collect_coords(cx, cy, maxradius, cc_flags, filter) {
    const out = [];
    const include_cxcy = (cc_flags & CC_INCL_CENTER) !== 0;
    const scramble = (cc_flags & CC_UNSHUFFLED) === 0;
    const ring_pairs = (scramble && (cc_flags & CC_RING_PAIRS) !== 0);
    const skip_mons = (cc_flags & CC_SKIP_MONS) !== 0;
    const skip_inaccessible = (cc_flags & CC_SKIP_INACCS) !== 0;

    const rowrange = (cy < Math.trunc(ROWNO / 2)) ? (ROWNO - 1 - cy) : cy;
    const colrange = (cx < Math.trunc(COLNO / 2)) ? (COLNO - 1 - cx) : cx;
    let k = Math.max(rowrange, colrange);
    maxradius = !maxradius ? k : Math.min(maxradius, k);

    /* index in `out` where the current ring (or ring pair) starts, and how
       many entries it has — C tracks these as passcc and n */
    let passStart = 0, n = 0;
    let havePass = false;

    for (let radius = include_cxcy ? 0 : 1; radius <= maxradius; ++radius) {
        let newpass, passend;
        if (!ring_pairs) {
            newpass = passend = true;
        } else {
            newpass = ((radius % 2) !== 0 || radius === 0);
            passend = ((radius % 2) === 0 || radius === maxradius);
        }
        if (newpass || !havePass) {
            passStart = out.length;
            n = 0;
            havePass = true;
        }

        const lox = cx - radius, hix = cx + radius;
        const loy = cy - radius, hiy = cy + radius;
        for (let y = Math.max(loy, 0); y <= hiy; ++y) {
            if (y > ROWNO - 1)
                break;                       /* done with this radius */
            for (let x = Math.max(lox, 1); x <= hix; ++x) {
                if (x > COLNO - 1)
                    break;                   /* advance to next y */
                if (x !== lox && x !== hix && y !== loy && y !== hiy)
                    continue;                /* not on the ring's edge */
                if ((skip_mons && m_at(x, y))
                    || (skip_inaccessible && !ZAP_POS(x, y)))
                    continue;
                if (filter && !filter(x, y))
                    continue;
                out.push({ x, y });
                ++n;
            }
        }

        if (scramble && passend) {
            /* selection shuffle over the ring's entries: one rn2 per entry
               still in play, counting down */
            let p = passStart;
            while (n > 1) {
                k = rn2(n);                  /* 0..n-1 */
                if (k) {
                    const tmp = out[p];
                    out[p] = out[p + k];
                    out[p + k] = tmp;
                }
                ++p;
                --n;
            }
        }
    }
    return out;
}

function m_at(x, y) {
    return game.level?.monAt?.get(`${x},${y}`) ?? null;
}

// include/rm.h ZAP_POS() — accepts pools and lava, rejects rock and walls.
function ZAP_POS(x, y) {
    const loc = game.level?.at(x, y);
    return !!loc && loc.typ >= 16 /* POOL */;
}

// src/teleport.c:735 enexto_core() — a spot as close to <xx,yy> as feasible.
//
// Two collect_coords() passes: radius 3 first, then the whole map. The second
// pass re-collects and therefore re-shuffles the near rings, so its draw count
// includes them again even though the caller skips those entries.
export function enexto_core(cc, xx, yy, mdat, entflags, goodpos) {
    /* src/teleport.c:234 — a null mdat defaults to the hero's original
       monster type */
    if (!mdat)
        mdat = game.mons[game.u.umonster];
    /* src/teleport.c:118 — C builds a dummy monst and set_mon_data()s the
       permonst into it, because goodpos() takes a monster, not a permonst. */
    const fakemon = { data: mdat, wormno: 0 };
    const allow_xx_yy = (entflags & GP_ALLOW_XY) !== 0;

    const near = collect_coords(xx, yy, 3, CC_NO_FLAGS, null);
    for (const c of near) {
        if (goodpos(c.x, c.y, fakemon, entflags)) {
            cc.x = c.x; cc.y = c.y;
            return true;
        }
    }

    const all = collect_coords(xx, yy, 0, CC_NO_FLAGS, null);
    for (let i = near.length; i < all.length; ++i) {
        if (goodpos(all[i].x, all[i].y, fakemon, entflags)) {
            cc.x = all[i].x; cc.y = all[i].y;
            return true;
        }
    }

    cc.x = xx; cc.y = yy;
    return allow_xx_yy && goodpos(xx, yy, fakemon, entflags);
}

// src/teleport.c:1165 level_tele() — the controlled level teleport.
//
// The whole function is long because most of it handles destinations that
// cannot survive: above the dungeon (heaven, Cloud 9, a fatal plummet), the
// endgame planes, Gehennom before the invocation, and escaping the Quest.
// What the recorded sessions exercise is the wizard-mode path: prompt, read a
// number, convert it, schedule the goto.
//
// Note the loop: C re-prompts up to ten times while the answer is neither a
// number nor a level NAME, and appends a hint to the question from the second
// pass on. That hint changes the prompt text on screen, so the retry count is
// visible, not just internal.
export async function level_tele() {
    let newlev = 0;
    const newlevel = { dnum: 0, dlevel: 0 };
    let force_dest = false;
    let buf = '';
    let random_port = false;    /* C: goto random_levtport */

    if ((game.u.uhave?.amulet || In_endgame(game.u.uz) || In_sokoban(game.u.uz))
        && !game.wizard) {
        await You_feel('very disoriented for a moment.');
        return;
    }

    if ((Teleport_control() && !Stunned()) || game.wizard) {
        let qbuf = 'To what level do you want to teleport?';
        let trycnt = 0;

        do {
            if (++trycnt === 2)
                qbuf += game.wizard ? ' [type a number, name, or ? for a menu]'
                                    : ' [type a number or name]';
            /* EDIT_GETLIN: a previous answer was invalid, so it is NOT
               offered back as the default */
            buf = await getlin(qbuf);

            if (buf === '*') {
                random_port = true;
                break;
            } else if (Confusion() && rnl(5)) {
                await pline('Oops...');
                random_port = true;
                break;
            } else if (buf === '\x1b') {        /* cancelled */
                return;
            }

            if (game.wizard && buf === '?') {
                const dest = { lev: 0, dnum: 0 };

                newlev = await print_dungeon(true, dest);
                if (!newlev)
                    return;

                newlevel.dnum = dest.dnum;
                newlevel.dlevel = dest.lev;
                if (In_endgame(newlevel) && !In_endgame(game.u.uz)) {
                    /* src/teleport.c:1235 — "Endgame prerequisite:" the
                       Amulet is conjured straight into the pack (no
                       hold_another_object, no fumbling) */
                    if (!game.u.uhave?.amulet) {
                        const { mksobj } = await import('./mkobj.js');
                        const { addinv, prinv } = await import('./invent.js');
                        let amu = mksobj(ONAMES.AMULET_OF_YENDOR, true, false);
                        if (amu) {
                            amu = addinv(amu);
                            (game.u.uhave ||= {}).amulet = 1;
                            await prinv('Endgame prerequisite:', amu, 0);
                        }
                    }
                }
                force_dest = true;
            } else {
                newlev = lev_by_name(buf);
                if (newlev === 0)
                    newlev = parseInt(buf, 10) || 0;   /* atoi() */
            }
        } while (!newlev && !isdigit(buf[0])
                 && (buf[0] !== '-' || !isdigit(buf[1])) && trycnt < 10);

        if (!random_port) {
            if (newlev === 0) {
                /* "Go to Nowhere" and the suicide it performs */
                note_unported_tele('level_tele:Nowhere');
                return;
            }

            if (In_quest(game.u.uz) && newlev > 0)
                newlev = newlev + game.dungeons[game.u.uz.dnum].depth_start - 1;
        }
    } else { /* involuntary level tele */
        random_port = true;
    }

    if (random_port) {
        /* teleport.c:1293 random_levtport: */
        newlev = random_teleport_level();
        if (newlev === depth(game.u.uz)) {
            await You('shudder for a moment.');
            return;
        }
    }

    if (!await next_to_u() && !force_dest) {
        await You('shudder for a moment.');
        return;
    }

    if (In_endgame(game.u.uz)) { /* must already be wizard */
        /* src/teleport.c:1308 — planes are addressed as negative numbers
           counting down from the dungeon's top */
        const llimit = dunlevs_in_dungeon(game.u.uz);

        if (newlev >= 0 || newlev <= -llimit) {
            await You_cant('get there from here.');
            return;
        }
        newlevel.dnum = game.u.uz.dnum;
        newlevel.dlevel = llimit + newlev;
        schedule_goto(newlevel, 0 /* UTOTYPE_NONE */, null, null);
        return;
    }

    if (newlev < 0 && !force_dest) {
        /* heaven, Cloud 9, and the plummet; all of them kill or escape */
        note_unported_tele('level_tele:above the dungeon');
        return;
    }

    if (force_dest) {
        /* wizard mode menu; no further validation needed */
    } else if (game.u.uz.dnum === game.medusa_level?.dnum
               && newlev >= game.dungeons[game.u.uz.dnum].depth_start
                            + dunlevs_in_dungeon(game.u.uz)) {
        find_hell(newlevel);
    } else {
        get_level(newlevel, newlev);

        if (newlevel.dnum === game.u.uz.dnum
            && newlevel.dlevel === game.u.uz.dlevel
            && newlev !== depth(game.u.uz)) {
            await You_cant('get there from here.');
            return;
        }
    }

    schedule_goto(newlevel, UTOTYPE_NONE, null,
                  game.flags?.verbose
                      ? 'You materialize on a different level!' : null);
}

// src/dungeon.c lev_by_name() — a level's name ("medusa", "castle") to its
// depth. The name table needs the dungeon overview data; nothing that reaches
// here today passes a name.
function lev_by_name(nam) {
    if (nam && !/^[-0-9]/.test(nam))
        note_unported_tele('level_tele:lev_by_name');
    return 0;
}

// src/apply.c next_to_u(), loaded lazily to avoid the apply/monster cycle.
async function next_to_u() {
    const apply = await import('./apply.js');
    return await apply.next_to_u();
}

const isdigit = (c) => c >= '0' && c <= '9';
const Stunned = () => !!game.u?.uprops?.STUNNED;
const Confusion = () => !!game.u?.uprops?.CONFUSION;

function note_unported_tele(what) {
    (game.unported ||= new Set()).add(what);
}

// src/teleport.c:2190 random_teleport_level()
export function random_teleport_level() {
    const uz = game.u.uz;
    let nlev, max_depth, min_depth;
    const cur_depth = depth(uz);

    /* single_level_branch() is Is_knox() in C (dungeon.c:1967) */
    if (!rn2(5) || Is_knox_level(uz) || In_endgame(uz))
        return cur_depth;

    if (In_quest(uz)) {
        let bottom = dunlevs_in_dungeon(uz);
        const qlocate_depth = game.qlocate_level?.dlevel ?? 0;
        /* if hero hasn't reached the middle locate level yet,
           no one can randomly teleport past it */
        if ((game.dungeons[uz.dnum].dunlev_ureached ?? 0) < qlocate_depth)
            bottom = qlocate_depth;
        min_depth = game.dungeons[uz.dnum].depth_start;
        max_depth = bottom + (game.dungeons[uz.dnum].depth_start - 1);
    } else {
        min_depth = 1;
        max_depth = dunlevs_in_dungeon(uz)
                    + (game.dungeons[uz.dnum].depth_start - 1);
        /* can't reach Sanctum if the invocation hasn't been performed */
        if (game.dungeons[uz.dnum].flags?.hellish && !game.u.uevent?.invoked)
            max_depth -= 1;
    }

    /* Get a random value relative to the current dungeon.
       Range is 1 to current+3, current not counting */
    nlev = rn2(cur_depth + 3 - min_depth) + min_depth;
    if (nlev >= cur_depth)
        nlev++;

    if (nlev > max_depth) {
        nlev = max_depth;
        /* teleport up if already on bottom */
        if (Is_botlevel_tele(uz))
            nlev -= rnd(3);
    }
    if (nlev < min_depth) {
        nlev = min_depth;
        if (nlev === cur_depth) {
            nlev += rnd(3);
            if (nlev > max_depth)
                nlev = max_depth;
        }
    }
    return nlev;
}

// src/dungeon.c Is_botlevel() — bottom of its dungeon
function Is_botlevel_tele(lev) {
    return lev.dlevel === dunlevs_in_dungeon(lev);
}

// src/teleport.c u_on_newpos() — move the hero to <x,y>.
//
// js/mklev.js has a private copy of this from level generation; C keeps the
// one definition here. They should be consolidated.
export function u_on_newpos(x, y) {
    game.u.ux = x;
    game.u.uy = y;
    game.u.uundetected = 0;
    if (game.youmonst)
        game.youmonst.mundetected = 0;
    /* src/dungeon.c:1584 — ridden steed always shares hero's location;
       cliparound() is a no-op on an 80x21 map */
    if (game.u.usteed) {
        game.u.usteed.mx = game.u.ux;
        game.u.usteed.my = game.u.uy;
    }
    /* src/dungeon.c:1594 — still on same level; might have come close
       enough to generic object(s) to redisplay them as specific objects
       (level changes take the map_location() arm instead) */
    if (!game.u.ublind && !Hallucination() && !game.u.uswallow)
        see_nearby_objects();
}

/* include/mondata.h:140 is_dlord/is_dprince, include/dungeon.h In_hell */
const is_dlord = (ptr) => is_demon(ptr) && is_lord(ptr);
const is_dprince = (ptr) => is_demon(ptr) && is_prince(ptr);
const In_hell = (lev) => {
    const where = lev ?? game.u?.uz;
    return game.dungeons?.[where?.dnum]?.flags?.hellish === true;
};

// src/teleport.c:21 m_blocks_teleporting() — a demon lord or prince in
// residence blocks others' teleports in Gehennom.
function m_blocks_teleporting(mtmp) {
    return is_dlord(mtmp.data) || is_dprince(mtmp.data);
}

// src/teleport.c:30 noteleport_level() — teleporting is prevented on this
// level for this monster?
export function noteleport_level(mon) {
    /* demon court in Gehennom prevent others from teleporting */
    if (In_hell(game.u.uz) && !(is_dlord(mon.data) || is_dprince(mon.data)))
        if ((game.level?.monsters || []).some(
                m => m.mhp > 0 && m_blocks_teleporting(m)))
            return true;

    /* natural no-teleport level; covetous monsters can bypass these */
    if (game.level?.flags?.noteleport && !is_covetous(mon.data))
        return true;

    /* wand of stasis prevents teleportation while the effect is active
       (even for covetous monsters) */
    if ((game.level?.flags?.stasis_until ?? 0) >= game.moves)
        return true;

    return false;
}

function within_bounded_area(x, y, lx, ly, hx, hy) {
    return x >= lx && x <= hx && y >= ly && y <= hy;
}

// src/teleport.c:386 tele_jump_ok(). Restricted special-level regions are
// barriers: a teleport cannot cross into or out of either exclusion box.
function tele_jump_ok(x1, y1, x2, y2) {
    if (!isok(x2, y2))
        return false;
    for (const region of [game.dndest || {}, game.updest || {}]) {
        if ((region.nlx | 0) > 0) {
            const fromInside = within_bounded_area(
                x1, y1, region.nlx, region.nly, region.nhx, region.nhy);
            const toInside = within_bounded_area(
                x2, y2, region.nlx, region.nly, region.nhx, region.nhy);
            if (fromInside !== toInside)
                return false;
        }
    }
    return true;
}

// src/teleport.c:1575 rloc_pos_ok(). Migrating arrivals are restricted to the
// appropriate special-level destination region, excluding its forbidden box.
function rloc_pos_ok(x, y, mtmp) {
    if (!goodpos(x, y, mtmp, GP_CHECKSCARY))
        return false;
    if (!mtmp.mx) {
        const movingUp = ((mtmp.my || 0) & 1) !== 0;
        const region = movingUp ? (game.updest || {}) : (game.dndest || {});
        if (region.lx) {
            return within_bounded_area(x, y, region.lx, region.ly,
                                       region.hx, region.hy)
                && (!region.nlx
                    || !within_bounded_area(x, y, region.nlx, region.nly,
                                            region.nhx, region.nhy));
        }
        return true;
    }
    const target = game.level.at(x, y);
    if (mtmp.isshk && mtmp.eshk) {
        const room = mtmp.eshk.shoproom;
        const resident = in_rooms(mtmp.mx, mtmp.my, SHOPBASE)
            .includes(String.fromCharCode(room));
        if (resident && target?.roomno !== room)
            return false;
    } else if (mtmp.ispriest) {
        const epri = mtmp.epri ?? mtmp.mextra?.epri;
        const room = epri?.shroom;
        const resident = room !== undefined
            && in_rooms(mtmp.mx, mtmp.my, TEMPLE)
                .includes(String.fromCharCode(room));
        if (resident && target?.roomno !== room)
            return false;
    }
    return tele_jump_ok(mtmp.mx, mtmp.my, x, y);
}

// src/teleport.c:1648 rloc_to_core(), ordinary non-worm relocation path.
export async function rloc_to_core(mtmp, x, y, rlocflags) {
    const oldx = mtmp.mx, oldy = mtmp.my;
    const preventmsg = (rlocflags & RLOC_NOMSG) !== 0;
    const vanishmsg = (rlocflags & RLOC_MSG) !== 0;
    let appearmsg = ((mtmp.mstrategy | 0) & STRAT_APPEARMSG) !== 0;
    const domsg = !game.in_mklev && (vanishmsg || appearmsg) && !preventmsg;
    let telemsg = false;

    if (x === oldx && y === oldy && m_at(x, y) === mtmp)
        return;

    if (oldx) {
        if (domsg && canspotmon(mtmp)) {
            if (couldsee(x, y) || sensemon(mtmp)) {
                telemsg = true;
            } else {
                await pline(`${Monnam(mtmp)} vanishes!`);
            }
            appearmsg = false;
        }
        if (mtmp.wormno) {
            note_unported_teleport('rloc:worm');
        } else {
            remove_monster(oldx, oldy);
            newsym(oldx, oldy);
        }
    }

    const { mon_track_clear, set_apparxy } = await import('./monmove.js');
    mon_track_clear(mtmp);
    place_monster(mtmp, x, y);
    newsym(x, y);
    set_apparxy(mtmp);

    if (domsg && (canspotmon(mtmp) || appearmsg
                  || mtmp === game.u.ustuck)) {
        const du = distu(x, y);
        const suffix = du <= 2 ? ' next to you'
            : du <= BOLT_LIM * BOLT_LIM ? ' close by'
            : telemsg && distu(oldx, oldy) !== du
                ? (du < distu(oldx, oldy)
                    ? ' closer to you' : ' farther away')
                : '';
        mtmp.mstrategy = (mtmp.mstrategy | 0) & ~STRAT_APPEARMSG;
        if (telemsg && (couldsee(x, y) || sensemon(mtmp)))
            await pline(`${Monnam(mtmp)} vanishes and reappears${suffix}.`);
        else
            await pline(`${appearmsg ? Amonnam(mtmp) : Monnam(mtmp)} ${
                appearmsg ? 'suddenly ' : ''}${Blind() ? 'arrives' : 'appears'
            }${suffix}!`);
    }
}

// src/teleport.c:1777 rloc_to_flag().
export async function rloc_to_flag(mtmp, x, y, rlocflags) {
    await rloc_to_core(mtmp, x, y, rlocflags);
}

// src/teleport.c:1802 rloc(). Try 50 random coordinates first, then use the
// same shuffled exhaustive fallback as C.
export async function rloc(mtmp, rlocflags = 0) {
    for (let trycount = 0; trycount < 50; ++trycount) {
        const x = rnd(COLNO - 1);
        const y = rn2(ROWNO);
        if (rloc_pos_ok(x, y, mtmp)) {
            await rloc_to_core(mtmp, x, y, rlocflags);
            return true;
        }
    }

    let ccFlags = CC_INCL_CENTER | CC_UNSHUFFLED | CC_SKIP_MONS;
    if (!passes_walls(mtmp.data))
        ccFlags |= CC_SKIP_INACCS;
    const candy = collect_coords(Math.trunc(COLNO / 2),
                                 Math.trunc(ROWNO / 2), 0, ccFlags, null);
    let backup = null;
    for (let i = 0; i < candy.length; ++i) {
        const j = rn2(candy.length - i);
        if (j > 0) {
            const tmp = candy[i];
            candy[i] = candy[i + j];
            candy[i + j] = tmp;
        }
        const { x, y } = candy[i];
        if (rloc_pos_ok(x, y, mtmp)) {
            await rloc_to_core(mtmp, x, y, rlocflags);
            return true;
        }
        if (!backup && goodpos(x, y, mtmp, NO_MM_FLAGS))
            backup = { x, y };
    }
    if (backup) {
        await rloc_to_core(mtmp, backup.x, backup.y, rlocflags);
        return true;
    }
    if (rlocflags & RLOC_ERR)
        note_unported_teleport('rloc:no_destination');
    return false;
}

// src/teleport.c:1950 tele_restrict().
export async function tele_restrict(mon) {
    if (!noteleport_level(mon))
        return false;
    if (canseemon(mon))
        await pline(`A mysterious force prevents ${mon_nam(mon)} from teleporting!`);
    return true;
}

// src/teleport.c teleok() — may the hero teleport onto <x,y>?
function teleok(x, y, trapok) {
    if (!trapok) {
        /* allow teleportation onto vibrating square, it's not a real trap;
           also allow pits and holes if levitating or flying */
        const trap = t_at(x, y);

        if (!trap)
            trapok = true;
        else if (trap.ttyp === VIBRATING_SQUARE)
            trapok = true;
        else if ((is_pit(trap.ttyp) || is_hole(trap.ttyp))
                 && game.u.uprops?.LEVITATION)
            trapok = true;

        if (!trapok)
            return false;
    }
    if (!goodpos(x, y, game.youmonst, 0))
        return false;
    /* the caller's remaining tests (in_mklev, sokoban, vault guard) need
       state no reachable teleport has yet */
    return true;
}

// src/teleport.c teleds() — put the hero at <nux,nuy>.
//
// A distant teleport unplaces the punishment pieces and puts them back below
// the hero at the destination. A nearby relocation can leave the ball in
// place while moving the chain, or drag both pieces for an allowed short move.
export async function teleds(nux, nuy, teleds_flags) {
    const is_teleport = !!(teleds_flags & TELEDS_TELEPORT);
    const ball = game.u.uball;
    const ballActive = !!(ball && game.u.uchain && ball.where !== OBJ_FREE);
    let allowDrag = !!(teleds_flags & TELEDS_ALLOW_DRAG);
    let ballUnplaced = false;
    let punishmentMove = null;
    let vaultFns = null, vaultGuard = null;

    if (!ballActive
        || near_capacity() > SLT_ENCUMBER
        || distmin(game.u.ux, game.u.uy, nux, nuy) > 1)
        allowDrag = false;

    if (game.u.urooms) {
        vaultFns = await import('./vault.js');
        if (vaultFns.vault_occupied(game.u.urooms))
            vaultGuard = vaultFns.findgd();
    }

    if (game.u.uswallow || game.u.utrap)
        note_unported_teleport('teleds:ball_or_swallow');

    if (ballActive) {
        const ballStillInRange = ball.where !== OBJ_INVENT
            && distmin(nux, nuy, ball.ox, ball.oy) <= 2;
        if (ballStillInRange || allowDrag) {
            punishmentMove = await preparePunishmentMove(nux, nuy, allowDrag);
            if (!punishmentMove && game.u.uball
                && game.u.uball.where !== OBJ_FREE) {
                unplacebc();
                ballUnplaced = true;
            }
        } else {
            unplacebc();
            ballUnplaced = true;
        }
    }

    const ux0 = game.u.ux, uy0 = game.u.uy;
    game.u.ux0 = ux0;
    game.u.uy0 = uy0;
    u_on_newpos(nux, nuy);

    if (punishmentMove)
        finishPunishmentMove(punishmentMove);
    else if (ballUnplaced)
        await placebc();

    newsym(ux0, uy0);           /* clear the old position */
    see_monsters();             /* clear or redraw old sensing glyphs */
    vision_recalc(0);           /* vision before effects */

    if (is_teleport && game.flags?.verbose)
        await You(`materialize in ${
            (nux === ux0 && nuy === uy0) ? 'the same'
                                         : 'a different'} location!`);

    if (vaultGuard) {
        const savedRooms = game.u.urooms;
        game.u.urooms = in_rooms(game.u.ux, game.u.uy, VAULT);
        if (!vaultFns.vault_occupied(game.u.urooms))
            await vaultFns.uleftvault(vaultGuard);
        game.u.urooms = savedRooms;
    }

    await spoteffects(true);
    await invocation_message();
}

/* src/teleport.h TELEDS_* */
export const TELEDS_NO_FLAGS = 0, TELEDS_ALLOW_DRAG = 1, TELEDS_TELEPORT = 2;

// src/teleport.c:850 scrolltele() — the controlled-teleport prompt.
//
// The controlled arm is ported: Teleport_control or wizard mode, hero
// conscious.  Amulet disorientation and wizard override are included; the
// W-tower variant, uncontrolled random destination and level-teleport arms
// are recorded.
export async function scrolltele(scroll) {
    const cc = { x: 0, y: 0 };

    if ((game.u.uhave?.amulet) && !rn2(3)) {
        await You_feel('disoriented for a moment.');
        if (!game.wizard) return;
        const { tty_yn_function } = await import('./tty/topl.js');
        if ((await tty_yn_function('Override?', 'yn', 'n')) !== 'y')
            return;
    }
    /* src/teleport.c:872 — Teleport_control (or a blessed scroll, or
       wizard mode) picks the spot via getpos; everyone else falls through
       to the random destination below */
    const controlled = ((Teleport_control() || (scroll && scroll.blessed))
                        && !Stunned()) || game.wizard;
    if (controlled) {
        if (unconscious()) {
            await pline('Being unconscious, you cannot control your teleport.');
        } else {
            /* "you and <steed>" when riding */
            const whobuf = 'you';
            await pline(`Where do ${whobuf} want to be teleported?`);
            if (scroll)
                learnscroll(scroll);
            cc.x = game.u.ux;
            cc.y = game.u.uy;
            if (isok(game.iflags?.travelcc?.x, game.iflags?.travelcc?.y)) {
                /* The player showed some interest in traveling here;
                   pre-suggest this coordinate. */
                cc.x = game.iflags.travelcc.x;
                cc.y = game.iflags.travelcc.y;
            }
            if ((await getpos(cc, true, 'the desired position')) < 0)
                return;             /* abort */
            /* possible extensions: introduce a small error if magic power
               is low; allow transfer to solid rock */
            if (teleok(cc.x, cc.y, false)) {
                await teleds(cc.x, cc.y, TELEDS_TELEPORT);
                if (game.iflags?.travelcc
                    && game.u.ux === game.iflags.travelcc.x
                    && game.u.uy === game.iflags.travelcc.y) {
                    game.iflags.travelcc.x = game.iflags.travelcc.y = 0;
                }
                return;
            }
            await pline('Sorry...');
        }
    }

    /* src/teleport.c:912 — discovery is unconditional now that there is
       always a materialize message */
    if (scroll)
        learnscroll(scroll);

    await safe_teleds(TELEDS_TELEPORT);
}

// src/teleport.c:713 safe_teleds() — 40 fully random tries (rnd(COLNO-1),
// rn2(ROWNO)), then the shuffled ring-pair candidate list near the hero.
export async function safe_teleds(teleds_flags) {
    let nux, nuy;

    for (let tcnt = 0; tcnt < 40; ++tcnt) {
        nux = rnd(COLNO - 1);
        nuy = rn2(ROWNO);
        if (teleok(nux, nuy, false)) {
            await teleds(nux, nuy, teleds_flags);
            return true;
        }
    }

    /* get a shuffled list of candidate locations, starting with spots
       1 or 2 steps from hero, then 3 or 4, on up */
    let cc_flags = CC_RING_PAIRS | CC_SKIP_MONS;
    if (!game.u.uprops?.PASSES_WALLS)
        cc_flags |= CC_SKIP_INACCS;
    const candy = collect_coords(game.u.ux, game.u.uy, 0, cc_flags, null);
    let backupspot = null;
    /* skip trap locations but remember the first acceptable trap spot */
    for (let tcnt = 0; tcnt < candy.length; ++tcnt) {
        nux = candy[tcnt].x; nuy = candy[tcnt].y;
        if (teleok(nux, nuy, false)) {
            await teleds(nux, nuy, teleds_flags);
            return true;
        }
        if (!backupspot && teleok(nux, nuy, true))
            backupspot = { x: nux, y: nuy };
    }
    if (backupspot) {
        await teleds(backupspot.x, backupspot.y, teleds_flags);
        return true;
    }
    return false;
}

// src/teleport.c:768 vault_tele() -- a one-shot teleport trap sends the hero
// into the level's vault when that room has a valid free square.
export async function vault_tele() {
    const { search_special } = await import('./mkroom.js');
    const { somexyspace } = await import('./mklev.js');
    const croom = search_special(VAULT);
    const c = { x: 0, y: 0 };

    if (croom && somexyspace(croom, c) && teleok(c.x, c.y, false)) {
        await teleds(c.x, c.y, TELEDS_TELEPORT);
        return;
    }
    await tele();
}

// src/teleport.c:842 tele()
export async function tele() {
    await scrolltele(null);
}

// src/teleport.c:1035 dotele() — `break_the_rules` is wizard-mode ^T.
export async function dotele(break_the_rules) {
    let trap = t_at(game.u.ux, game.u.uy);
    let trap_once = false;

    if (trap && !trap.tseen)
        trap = null;

    if (trap) {
        if (trap.ttyp === LEVEL_TELEP) {
            const { tty_yn_function } = await import('./tty/topl.js');
            if ((await tty_yn_function(
                    'There is a level teleporter here. Trigger it?',
                    'yn', 'n')) === 'y') {
                await level_tele_trap(trap, FORCETRAP);
                return 1;
            }
            trap = null;
        } else if (trap.ttyp === TELEP_TRAP) {
            trap_once = !!trap.once;
            if (trap.once) {
                await pline('This is a vault teleport, usable once only.');
                const { tty_yn_function } = await import('./tty/topl.js');
                if ((await tty_yn_function('Jump in?', 'yn', 'n')) === 'n') {
                    trap = null;
                } else {
                    deltrap(trap);
                    newsym(game.u.ux, game.u.uy);
                }
            }
            if (trap)
                await You(`${u_locomotion('jump')} onto the teleportation trap.`);
        } else {
            trap = null;
        }
    }
    if (!trap && !break_the_rules) {
        let castit = false;
        const role = game.urole?.mnum;
        const threshold = (role === PMNAMES.PM_WIZARD
                           || role === 'PM_WIZARD') ? 8 : 12;
        if (!Teleportation()
            || ((game.u.ulevel || 0) < threshold
                && !can_teleport(game.youmonst.data))) {
            const knownsp = known_spell(ONAMES.SPE_TELEPORT_AWAY);
            castit = knownsp >= spe_Fresh && !Confusion();
            if (!castit) {
                const reason = !Teleportation()
                    ? (knownsp !== spe_Unknown ? "can't cast that spell"
                                               : "don't know that spell")
                    : 'are not able to teleport at will';
                await You(`${reason}.`);
                return 0;
            }
        }

        const energy = 5 * game.objects[ONAMES.SPE_TELEPORT_AWAY].oc_level;
        let reason = null;
        if ((game.u.uhunger || 0) <= 10)
            reason = 'are too weak from hunger';
        else if (ACURR(A_STR) < 4)
            reason = 'lack the strength';
        else if (energy > (game.u.uen || 0))
            reason = 'lack the energy';
        if (reason) {
            await You(`${reason} ${castit ? 'for a teleport spell'
                                         : 'to teleport'}.`);
            return 0;
        }
        if (await check_capacity(
                'Your concentration falters from carrying so much.'))
            return 1;

        if (castit) {
            exercise(A_WIS, true);
            if ((await spelleffects(
                    ONAMES.SPE_TELEPORT_AWAY, true, false)) & ECMD_TIME)
                return 1;
            return 0;
        }

        game.u.uen -= energy;
        (game.disp ||= {}).botl = true;
    }

    if (!await next_to_u()) {
        await You('shudder for a moment.');
        return 0;
    }

    if (trap && trap_once) {
        await vault_tele();
    } else if (trap && isok(trap.teledest?.x ?? 0,
                            trap.teledest?.y ?? 0)) {
        await teleds(trap.teledest.x, trap.teledest.y, TELEDS_TELEPORT);
    } else {
        if (game.iflags?.travelcc)
            game.iflags.travelcc.x = game.iflags.travelcc.y = 0;
        await tele();
    }
    await next_to_u();

    if (!trap)
        await morehungry(100);
    return 1;
}

/* include/dungeon.h on_level() */
const on_level = (a, b) => !!a && !!b && a.dnum === b.dnum && a.dlevel === b.dlevel;
/* include/dungeon.h In_tutorial() */
const In_tutorial = (uz) => uz?.dnum === game.tutorial_dnum;
// src/teleport.c:1444 domagicportal()
export async function domagicportal(ttmp) {
    let target_level;
    let totype;
    let stunmsg = null;

    if (game.u.utrap && game.u.utraptype === TT_BURIEDBALL)
        await buried_ball_to_punishment();

    if (!(await next_to_u())) {
        await You('shudder for a moment.');
        return;
    }

    /* if landed from another portal, do nothing */
    /* problem: level teleport landing escapes the check */
    if (!on_level(game.u.uz, game.u.uz0))
        return;

    await You('activated a magic portal!');

    /* prevent the poor shnook, whose amulet was stolen while in
     * the endgame, from accidently triggering the portal to the
     * next level, and thus losing the game
     */
    if (In_endgame(game.u.uz) && !game.u.uhave?.amulet) {
        await You_feel('dizzy for a moment, but nothing happens...');
        return;
    }

    target_level = ttmp.dst;

    /* coming back from tutorial doesn't trigger stunning */
    if (In_tutorial(game.u.uz) && !In_tutorial(target_level)) {
        /* returning to normal play => arrive on level 1 stairs */
        totype = UTOTYPE_ATSTAIRS;
        stunmsg = 'Resuming regular play.';
    } else {
        totype = UTOTYPE_PORTAL;
        stunmsg = !Stunned() ? 'You feel slightly dizzy.'
                             : 'You feel dizzier.';
        await make_stunned(((game.u.intrinsic?.HStun | 0) & TIMEOUT) + 3, false);
    }

    schedule_goto(target_level, totype, stunmsg, null);
}

// src/teleport.c:919 dotelecmd() — the ^T command.
export async function dotelecmd() {
    /* normal mode; ignore 'm' prefix if it was given */
    if (!game.wizard)
        return (await dotele(false)) ? ECMD_TIME : ECMD_OK;

    if (!game.iflags?.menu_requested)
        return (await dotele(true)) ? ECMD_TIME : ECMD_OK;

    const tports = [
        ['n', 'normal ^T on demand; no spell, obey restrictions'],
        ['s', 'via spellcast; no intrinsic teleport'],
        ['t', 'try ^T without having it; no spell'],
        ['w', 'debug mode; ignore restrictions'],
    ];
    const win = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(win, MENU_BEHAVE_STANDARD);
    for (const [key, description] of tports) {
        tty_add_menu(win, null, key, key, 0, ATR_NONE, NO_COLOR,
                     description, key === 'w' ? MENU_ITEMFLAGS_SELECTED
                                              : MENU_ITEMFLAGS_NONE);
    }
    tty_end_menu(win, 'Which way do you want to teleport?');
    const picks = await tty_select_menu(win, PICK_ONE);
    tty_destroy_nhwindow(win);
    if (picks.cancelled)
        return ECMD_OK;

    /* Choosing another mode leaves preselected 'w' in the selection list.
       Choosing 'w' toggles it off and yields no picks, which C also treats as
       the traditional unrestricted wizard command. */
    const tmode = picks.find((pick) => pick !== 'w') || 'w';
    const intrinsic = (game.u.intrinsic ||= {});
    const uprops = (game.u.uprops ||= {});
    const hadHTele = Object.hasOwn(intrinsic, 'HTeleportation');
    const hadETele = Object.hasOwn(uprops, 'TELEPORT');
    const saveHTele = intrinsic.HTeleportation;
    const saveETele = uprops.TELEPORT;
    let undoSpell = NOOP_SPELL;
    let ignoreRestrictions = false;

    switch (tmode) {
    case 'n':
        intrinsic.HTeleportation = (intrinsic.HTeleportation | 0) | I_SPECIAL;
        undoSpell = tport_spell(HIDE_SPELL);
        break;
    case 's':
        intrinsic.HTeleportation = 0;
        uprops.TELEPORT = 0;
        undoSpell = tport_spell(ADD_SPELL);
        break;
    case 't':
        intrinsic.HTeleportation = 0;
        uprops.TELEPORT = 0;
        undoSpell = tport_spell(HIDE_SPELL);
        break;
    case 'w':
        ignoreRestrictions = true;
        break;
    }

    let res;
    try {
        res = await dotele(ignoreRestrictions);
    } finally {
        if (hadHTele)
            intrinsic.HTeleportation = saveHTele;
        else
            delete intrinsic.HTeleportation;
        if (hadETele)
            uprops.TELEPORT = saveETele;
        else
            delete uprops.TELEPORT;
        if (undoSpell !== NOOP_SPELL)
            tport_spell(undoSpell);
    }
    return res ? ECMD_TIME : ECMD_OK;
}

// src/teleport.c:196 enexto() — scary-aware first, then unrestricted.
export function enexto(cc, xx, yy, mdat) {
    return (enexto_core(cc, xx, yy, mdat, GP_CHECKSCARY, goodpos)
            || enexto_core(cc, xx, yy, mdat, NO_MM_FLAGS, goodpos));
}

// src/teleport.c:786 teleport_pet(), may this pet be teleported away, or
// does its leash hold it (a cursed leash refuses unless forced)?
export async function teleport_pet(mtmp, force_it) {
    let otmp;

    if (mtmp === game.u.usteed)
        return false;

    if (mtmp.mleashed) {
        otmp = get_mleash(mtmp);
        if (!otmp) {
            /* impossible("%s is leashed, without a leash.", Monnam(mtmp)); */
            await m_unleash(mtmp, false); /* release_it: */
            return true;
        }
        if (otmp.cursed && !force_it) {
            await yelp(mtmp);
            return false;
        } else {
            await Your('leash goes slack.');
            await m_unleash(mtmp, false);
            return true;
        }
    }
    return true;
}

// src/teleport.c:2006 mlevel_tele_trap(), a monster on a level teleporter,
// hole, trap door, or magic portal (or forced off the level: NO_TRAP).
export async function mlevel_tele_trap(mtmp, trap, force_it, in_sight) {
    const tt = (trap ? trap.ttyp : NO_TRAP);

    if (mtmp === game.u.ustuck) /* probably a vortex */
        return Trap_Effect_Finished; /* temporary? kludge */
    if (await teleport_pet(mtmp, force_it)) {
        let tolevel = { dnum: 0, dlevel: 0 };
        let migrate_typ = MIGR_RANDOM;

        if (is_hole(tt)) {
            if (Is_stronghold(game.u.uz)) {
                tolevel = { ...game.valley_level };
            } else if (Is_botlevel(game.u.uz)) {
                if (in_sight && trap.tseen)
                    await pline_mon(mtmp, `${Monnam(mtmp)} avoids the ${
                                   (tt === HOLE) ? 'hole' : 'trap'}.`);
                return Trap_Effect_Finished;
            } else {
                tolevel = { ...trap.dst };
                clamp_hole_destination(tolevel);
            }
        } else if (tt === MAGIC_PORTAL) {
            if (In_endgame(game.u.uz) && (mon_has_amulet(mtmp)
                                          || is_home_elemental(mtmp.data)
                                          || rn2(7))) {
                if (in_sight && mtmp.data.mlet !== MONSYMS.S_ELEMENTAL) {
                    await pline_mon(mtmp,
                                    `${Monnam(mtmp)} seems to shimmer for a moment.`);
                    seetrap(trap);
                }
                return Trap_Effect_Finished;
            } else {
                tolevel = { ...trap.dst };
                migrate_typ = MIGR_PORTAL;
            }
        } else if (tt === LEVEL_TELEP || tt === NO_TRAP) {
            let nlev;

            if (mon_has_amulet(mtmp) || In_endgame(game.u.uz)
                /* NO_TRAP is used when forcing a monster off the level;
                   onscary(0,0,) is true for the Wizard, Riders, lawful
                   minions, Angels of any alignment, shopkeeper or priest
                   currently inside his or her own special room */
                || (tt === NO_TRAP && onscary(0, 0, mtmp))) {
                if (in_sight)
                    await pline_mon(mtmp,
                                    `${Monnam(mtmp)} seems very disoriented for a moment.`);
                return Trap_Effect_Finished;
            }
            if (tt === NO_TRAP) {
                /* creature is being forced off the level to make room;
                   it will try to return to this level (at a random spot
                   rather than its current one) if the level is left by
                   the hero and then revisited */
                tolevel = { ...game.u.uz };
            } else {
                nlev = random_teleport_level();
                if (nlev === depth(game.u.uz)) {
                    if (in_sight)
                        await pline_mon(mtmp, `${Monnam(mtmp)} shudders for a moment.`);
                    return Trap_Effect_Finished;
                }
                get_level(tolevel, nlev);
            }
        } else {
            /* impossible("mlevel_tele_trap: unexpected trap type (%d)", tt); */
            return Trap_Effect_Finished;
        }

        if (in_sight) {
            await pline_mon(mtmp, `Suddenly, ${mon_nam(mtmp)} ${
                            (tt === HOLE) ? 'falls into a hole'
                            : (tt === TRAPDOOR) ? 'falls through a trap door'
                              : 'disappears out of sight'}.`);
            if (trap)
                seetrap(trap);
        }
        if (is_xport(tt) && !control_teleport(mtmp.data))
            mtmp.mconf = 1;
        await migrate_to_level(mtmp, ledger_no(tolevel), migrate_typ, null);
        return Trap_Moved_Mon; /* no longer on this level */
    }
    return Trap_Effect_Finished;
}

// src/teleport.c:1771 rloc_to(), place a monster at <x,y> without a message.
export async function rloc_to(mtmp, x, y) {
    await rloc_to_core(mtmp, x, y, RLOC_NOMSG);
}

// src/teleport.c:1937 mvault_tele(), a monster on the vault's one-shot
// teleporter goes into the vault (or anywhere, if that fails).
export async function mvault_tele(mtmp) {
    const croom = search_special(VAULT);
    const c = { x: 0, y: 0 };

    if (croom && somexyspace(croom, c) && goodpos(c.x, c.y, mtmp, 0)) {
        await rloc_to(mtmp, c.x, c.y);
        return;
    }
    await rloc(mtmp, RLOC_NONE);
}

// src/teleport.c:1962 mtele_trap(), a monster steps on a teleport trap.
export async function mtele_trap(mtmp, trap, in_sight) {
    let monname;

    /* [note: this method doesn't consider a monster which is on a spot
       which is not visible to the hero but which the hero can see that
       teleporting from it isn't visible] */
    if (noteleport_level(mtmp))
        return;

    if (await teleport_pet(mtmp, false)) {
        /* Note: don't remove the trap here as the monster might be
           holding some other object */
        monname = Monnam(mtmp);
        if (trap.once)
            await mvault_tele(mtmp);
        else if (isok(trap.teledest?.x ?? 0, trap.teledest?.y ?? 0)) {
            if (!(m_at(trap.teledest.x, trap.teledest.y)
                  || u_at(trap.teledest.x, trap.teledest.y))) {
                await rloc_to_core(mtmp, trap.teledest.x, trap.teledest.y,
                                   RLOC_MSG);
            }
        } else
            await rloc(mtmp, RLOC_NONE);
        if (in_sight) {
            if (canseemon(mtmp))
                await pline(`${monname} seems disoriented.`);
            else
                await pline(`${monname} suddenly disappears!`);
            seetrap(trap);
        }
    }
}
