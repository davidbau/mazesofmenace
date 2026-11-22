// priest.js -- temple priests.
// C ref: priest.c -- priestini(), p_coaligned(), mon_aligntyp().
//
// Ported so far: what mktemple() needs at level creation, the movement
// of priests and shopkeepers (move_special(), pri_move()), and temple
// entry (findpriest(), intemple()). Donations are not ported yet.

import { game } from './gstate.js';
import { rn2, rn1 } from './rng.js';
import { mons, PM_HIGH_CLERIC, PM_ALIGNED_CLERIC } from './monsters.js';
import { AMULET_OF_YENDOR } from './objects.js';
import {
    A_NONE, A_LAWFUL, A_CHAOTIC, A_NEUTRAL, N_DIRS, ROOMOFFSET, ALL_TRAPS,
    MM_EPRI, RLOC_NOMSG, W_ARMC, Amask2align, MM_ADJACENTOK, MM_EMIN,
} from './const.js';
import { on_level, assign_level, mapseen_temple } from './dungeon.js';
import { makemon, mongets, set_malign, m_at, MON_AT } from './makemon.js';
import { mkobj, curse, uncurse, SPBOOK_no_NOVEL } from './mkobj.js';
import { mpickobj } from './steal.js';
import { which_armor } from './worn.js';
import { rloc_mklev } from './teleport.js';
import { mon_learns_traps } from './mondata.js';
import { pm_good_location } from './sp_lev.js';
import { mfndpos } from './mon.js';
import { mon_allowflags } from './mon.js';
import { place_monster } from './makemon.js';
import { newsym, pline } from './display.js';
import { Your } from './display.js';
import { mon_nam } from './do_name.js';
import { dist2 } from './hacklib.js';
import { in_rooms, check_special_room } from './hack.js';
import { inhishop } from './shk.js';
import { mattacku } from './mhitu.js';
import { m_canseeu } from './monmove.js';
import { monnear } from './mon.js';
import {
    IS_ROOM, IS_ALTAR, AM_SHRINE, TEMPLE, NOTONL, ALLOW_M, ALLOW_ROCK,
    INVIS, DISPLACED, CONFLICT, A_CHA, u_at,
} from './const.js';
import { ACURR } from './attrib.js';
import { rnd, d } from './rng.js';
import { DEAF, HALLUC, SPINE, MM_NOMSG, In_endgame } from './const.js';
import { PM_GHOST, PM_DEATH, PM_FAMINE, PM_PESTILENCE, M2_MINION }
    from './monsters.js';
import { canseemon, You } from './display.js';
import { Monnam } from './do_name.js';
import { body_part } from './insight.js';
import { record_achievement } from './do.js';
import { ACH_TMPL } from './const.js';

// C ref: priest.c ALGN_SINNED, ALGN_DEVOUT
const ALGN_SINNED = (-4); /* worse than strayed (-1..-3) */
const ALGN_DEVOUT = 14;   /* better than fervent (9..13) */

// C ref: hack.c xdir[], ydir[]; DIR_CLAMP()
const xdir = [-1, -1, 0, 1, 1, 1, 0, -1, 0, 0];
const ydir = [0, -1, -1, -1, 0, 1, 1, 1, 0, 0];
function DIR_CLAMP(dir) { return ((dir + N_DIRS) % N_DIRS); }

// C ref: priest.c mon_aligntyp()
/* get a monster's alignment type without caller needing EPRI & EMIN */
export function mon_aligntyp(mon) {
    const algn = mon.ispriest ? mon.epri.shralign
                 : mon.isminion ? mon.emin.min_align
                   : mon.data.maligntyp;

    if (algn === A_NONE)
        return A_NONE; /* negative but differs from chaotic */
    return (algn > 0) ? A_LAWFUL : (algn < 0) ? A_CHAOTIC : A_NEUTRAL;
}

// C ref: priest.c priestini()
/* exclusively for mktemple() */
// Also called by sp_lev.c create_altar() for temple shrines, from the
// synchronous level-script code, so this port is synchronous; see
// rloc_mklev() for the "insurance" rloc().
export function priestini(
    lvl,
    sroom,
    sx, sy,
    sanctum) /* is it the seat of the high priest? */
{
    let priest;
    let otmp;
    let cnt;
    let px = 0, py = 0, i;
    const si = rn2(N_DIRS);
    const prim = mons[sanctum ? PM_HIGH_CLERIC : PM_ALIGNED_CLERIC];

    for (i = 0; i < N_DIRS; i++) {
        px = sx + xdir[DIR_CLAMP(i + si)];
        py = sy + ydir[DIR_CLAMP(i + si)];
        if (pm_good_location(px, py, prim))
            break;
    }
    if (i === N_DIRS)
        px = sx, py = sy;

    if (MON_AT(px, py))
        rloc_mklev(m_at(px, py), RLOC_NOMSG); /* rloc(): insurance */

    priest = makemon(prim, px, py, MM_EPRI);
    if (priest) {
        const epri = priest.epri;
        epri.shroom = sroom.roomnoidx + ROOMOFFSET;
        epri.shralign = Amask2align(game.level.at(sx, sy).altarmask);
        epri.shrpos = { x: sx, y: sy };
        epri.shrlevel = { dnum: 0, dlevel: 0 };
        assign_level(epri.shrlevel, lvl);
        mon_learns_traps(priest, ALL_TRAPS); /* traps are known */
        priest.mpeaceful = 1;
        priest.ispriest = 1;
        priest.isminion = 0;
        priest.msleeping = 0;
        set_malign(priest); /* mpeaceful may have changed */

        /* now his/her goodies... */
        if (sanctum && epri.shralign === A_NONE
            && on_level(game.dungeon_topology.d_sanctum_level, game.u.uz)) {
            mongets(priest, AMULET_OF_YENDOR);
        }
        /* 2 to 4 spellbooks */
        for (cnt = rn1(3, 2); cnt > 0; --cnt) {
            mpickobj(priest, mkobj(SPBOOK_no_NOVEL, false));
        }
        /* robe [via makemon()] */
        if (rn2(2) && (otmp = which_armor(priest, W_ARMC)) !== null
            && otmp !== undefined) {
            if (p_coaligned(priest))
                uncurse(otmp);
            else
                curse(otmp);
        }
    }
}

// C ref: priest.c forget_temple_entry()
/* reset the move counters used to limit temple entry feedback;
   leaving the level and then returning yields a fresh start */
export function forget_temple_entry(priest) {
    const epri_p = priest.ispriest ? priest.epri : null;

    if (!epri_p) {
        console.error('impossible: attempting to manipulate shrine data for non-priest?');
        return;
    }
    epri_p.intone_time = epri_p.enter_time = epri_p.peaceful_time
        = epri_p.hostile_time = 0;
}

// C ref: priest.c p_coaligned()
export function p_coaligned(priest) {
    return (game.u.ualign.type === mon_aligntyp(priest));
}

/* C ref: youprop.h Invis, Displaced, Conflict */
function Invis() {
    const p = game.u.uprops[INVIS];
    return !!(p && (p.intrinsic || p.extrinsic) && !p.blocked);
}
function Displaced() {
    const p = game.u.uprops[DISPLACED];
    return !!(p && (p.intrinsic || p.extrinsic));
}
function Conflict() {
    const p = game.u.uprops[CONFLICT];
    return !!(p && (p.intrinsic || p.extrinsic));
}
/* C ref: mondata.c resist_conflict() */
function resist_conflict(mtmp) {
    /* always a small chance at 19 */
    const resist_chance = Math.min(19, (ACURR(A_CHA) - mtmp.m_lev
                                        + game.u.ulevel));

    return (rnd(20) > resist_chance);
}
/* C ref: hacklib.c online2(); hack.h onlineu() */
function onlineu(xx, yy) {
    const dx = xx - game.u.ux, dy = yy - game.u.uy;
    return (!dy || !dx || dy === dx || dy === -dx);
}

// C ref: priest.c move_special()
/*
 * Move for priests and shopkeepers.  Called from shk_move() and pri_move().
 * Valid returns are  1: moved  0: didn't  -1: let m_move do it  -2: died.
 */
export async function move_special(mtmp, in_his_shop, appr, uondoor, avoid,
                                   omx, omy, ggx, ggy) {
    let nx, ny, nix, niy;
    let i;
    let chcnt, cnt;
    const mfp = {};
    let ninfo = 0;
    let allowflags;

    if (omx === ggx && omy === ggy)
        return 0;
    if (mtmp.mconf) {
        avoid = false;
        appr = 0;
    }

    nix = omx;
    niy = omy;
    allowflags = mon_allowflags(mtmp);
    cnt = mfndpos(mtmp, mfp, allowflags);

    let skip_check = false;
    if (mtmp.isshk && avoid && uondoor) { /* perhaps we cannot avoid him */
        for (i = 0; i < cnt; i++)
            if (!(mfp.info[i] & NOTONL)) {
                skip_check = true; /* goto pick_move */
                break;
            }
        if (!skip_check)
            avoid = false;
    }

    const GDIST = (x, y) => dist2(x, y, ggx, ggy);
    for (;;) {
        /* pick_move: */
        chcnt = 0;
        for (i = 0; i < cnt; i++) {
            nx = mfp.poss[i].x;
            ny = mfp.poss[i].y;
            if (IS_ROOM(game.level.at(nx, ny).typ)
                || (mtmp.isshk && (!in_his_shop || mtmp.mextra.eshk.following))) {
                if (avoid && (mfp.info[i] & NOTONL) && !(mfp.info[i] & ALLOW_M))
                    continue;
                if ((!appr && !rn2(++chcnt))
                    || (appr && GDIST(nx, ny) < GDIST(nix, niy))
                    || (mfp.info[i] & ALLOW_M)) {
                    nix = nx;
                    niy = ny;
                    ninfo = mfp.info[i];
                }
            }
        }
        if (mtmp.ispriest && avoid && nix === omx && niy === omy
            && onlineu(omx, omy)) {
            /* might as well move closer as long it's going to stay
             * lined up */
            avoid = false;
            continue; /* goto pick_move */
        }
        break;
    }

    if (nix !== omx || niy !== omy) {

        if (ninfo & ALLOW_ROCK) {
            throw new Error('move_special(): m_break_boulder() not ported yet');
        } else if (ninfo & ALLOW_M) {
            /* mtmp is deciding it would like to attack this turn.
             * Returns from m_move_aggress don't correspond to the same things
             * as this function should return, so we need to translate. */
            throw new Error('move_special(): m_move_aggress() not ported yet');
        }

        if (m_at(nix, niy) || u_at(nix, niy))
            return 0;
        /* remove_monster(omx, omy): place_monster() moves it */
        place_monster(mtmp, nix, niy);
        newsym(nix, niy);
        if (mtmp.isshk && !in_his_shop && inhishop(mtmp))
            await check_special_room(false);
        return 1;
    }
    return 0;
}

// C ref: priest.c temple_occupied()
export function temple_occupied(array) {
    for (const c of array)
        if (game.level.rooms[c.charCodeAt(0) - ROOMOFFSET].rtype === TEMPLE)
            return c;
    return '';
}

// C ref: priest.c histemple_at()
function histemple_at(priest, x, y) {
    return !!(priest && priest.ispriest
              && (String.fromCharCode(priest.epri.shroom)
                  === (in_rooms(x, y, TEMPLE)[0] || '\0'))
              && on_level(priest.epri.shrlevel, game.u.uz));
}

// C ref: priest.c inhistemple()
export function inhistemple(priest) {
    /* make sure we have a priest */
    if (!priest || !priest.ispriest)
        return false;
    /* priest must be on right level and in right room */
    if (!histemple_at(priest, priest.mx, priest.my))
        return false;
    /* temple room must still contain properly aligned altar */
    return has_shrine(priest);
}

// C ref: priest.c pri_move()
/*
 * pri_move: return 1: moved  0: didn't  -1: let m_move do it  -2: died
 */
export async function pri_move(priest) {
    let ggx, ggy;
    let avoid = true;

    const omx = priest.mx;
    const omy = priest.my;

    if (!histemple_at(priest, omx, omy))
        return -1;

    const temple = priest.epri.shroom;

    ggx = priest.epri.shrpos.x;
    ggy = priest.epri.shrpos.y;

    ggx += rn1(3, -1); /* mill around the altar */
    ggy += rn1(3, -1);

    if (!priest.mpeaceful
        || (Conflict() && !resist_conflict(priest))) {
        if (monnear(priest, game.u.ux, game.u.uy)) {
            if (Displaced())
                await Your(`displaced image doesn't fool ${mon_nam(priest)}!`);
            await mattacku(priest);
            return 0;
        } else if ((game.u.urooms || '').includes(String.fromCharCode(temple))) {
            /* chase player if inside temple & can see him */
            if (priest.mcansee && m_canseeu(priest)) {
                ggx = game.u.ux;
                ggy = game.u.uy;
            }
            avoid = false;
        }
    } else if (Invis())
        avoid = false;

    return await move_special(priest, false, true, false, avoid, omx, omy,
                              ggx, ggy);
}

// C ref: priest.c has_shrine()
function has_shrine(pri) {
    if (!pri || !pri.ispriest)
        return false;
    const epri_p = pri.epri;
    const lev = game.level.at(epri_p.shrpos.x, epri_p.shrpos.y);
    if (!IS_ALTAR(lev.typ) || !(lev.altarmask & AM_SHRINE))
        return false;
    return (epri_p.shralign === Amask2align(lev.altarmask & ~AM_SHRINE));
}

// C ref: priest.c findpriest()
export function findpriest(roomno) {
    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        if (mtmp.mhp <= 0) /* DEADMONSTER(mtmp) */
            continue;
        if (mtmp.ispriest && (String.fromCharCode(mtmp.epri.shroom) === roomno)
            && histemple_at(mtmp, mtmp.mx, mtmp.my))
            return mtmp;
    }
    return null;
}

/* C ref: youprop.h Deaf, Hallucination; monst.h helpless() */
function Deaf() {
    const p = game.u.uprops[DEAF];
    return !!(p && (p.intrinsic || p.extrinsic) || game.u.uroleplay?.deaf);
}
function Hallucination() {
    const p = game.u.uprops[HALLUC];
    return !!(p && (p.intrinsic || p.extrinsic) && !p.blocked);
}
function helpless(mon) { return !!(mon.msleeping || !mon.mcanmove); }

// C ref: priest.c intemple()
/* called from check_special_room() when the player enters the temple room */
export async function intemple(roomno) {
    const u = game.u;
    let priest, mtmp;
    let msg1, msg2;

    /* don't do anything if hero is already in the room */
    if (temple_occupied(u.urooms0 || ''))
        return;

    if ((priest = findpriest(String.fromCharCode(roomno))) !== null) {
        /* tended */
        record_achievement(ACH_TMPL);

        const epri_p = priest.epri;
        const shrined = has_shrine(priest);
        const topo = game.dungeon_topology;
        const Is_sanctum = on_level(u.uz, topo.d_sanctum_level);
        const sanctum = (priest.data === mons[PM_HIGH_CLERIC]
                         && (Is_sanctum || In_endgame(u.uz)));
        const can_speak = !helpless(priest);
        if (can_speak && !Deaf() && game.moves >= (epri_p.intone_time || 0)) {
            const save_priest = priest.ispriest;

            /* don't reveal the altar's owner upon temple entry in
               the endgame; for the Sanctum, the next message names
               Moloch so suppress the "of Moloch" for him here too */
            if (sanctum && !Hallucination())
                priest.ispriest = 0;
            await pline(`${canseemon(priest) ? Monnam(priest)
                                             : "A nearby voice"} intones:`);
            priest.ispriest = save_priest;
            epri_p.intone_time = game.moves + d(10, 500); /* ~2505 */
            /* make sure that we don't suppress entry message when
               we've just given its "priest intones" introduction */
            epri_p.enter_time = 0;
        }
        msg1 = msg2 = null;
        if (sanctum && Is_sanctum) {
            if (priest.mpeaceful) {
                /* first time inside */
                msg1 = "Infidel, you have entered Moloch's Sanctum!";
                msg2 = "Be gone!";
                priest.mpeaceful = 0;
                /* became angry voluntarily; no penalty for attacking him */
                set_malign(priest);
            } else {
                /* repeat visit, or attacked priest before entering */
                msg1 = "You desecrate this place by your presence!";
            }
        } else if (game.moves >= (epri_p.enter_time || 0)) {
            msg1 = `Pilgrim, you enter a ${!shrined ? "desecrated"
                                                    : "sacred"} place!`;
        }
        if (msg1 && can_speak && !Deaf()) {
            /* SetVoice(priest, 0, 80, 0): voice hooks only */
            await pline(`"${msg1}"`); /* verbalize1() */
            if (msg2)
                await pline(`"${msg2}"`); /* verbalize1() */
            epri_p.enter_time = game.moves + d(10, 100); /* ~505 */
        }
        if (!sanctum) {
            let this_time, other_time;

            if (!shrined || !p_coaligned(priest)
                || u.ualign.record <= ALGN_SINNED) {
                msg1 = (m2) => `have a${m2} forbidding feeling...`;
                msg2 = (!shrined || !p_coaligned(priest)) ? "" : " strange";
                this_time = 'hostile_time';
                other_time = 'peaceful_time';
            } else {
                msg1 = (m2) => `experience ${m2} sense of peace.`;
                msg2 = (u.ualign.record >= ALGN_DEVOUT) ? "a" : "an unusual";
                this_time = 'peaceful_time';
                other_time = 'hostile_time';
            }
            /* give message if we haven't seen it recently or
               if alignment update has caused it to switch from
               forbidding to sense-of-peace or vice versa */
            if (game.moves >= (epri_p[this_time] || 0)
                || (epri_p[other_time] || 0) >= (epri_p[this_time] || 0)) {
                await You(msg1(msg2));
                epri_p[this_time] = game.moves + d(10, 20); /* ~55 */
                /* avoid being tricked by the RNG:  switch might have just
                   happened and previous random threshold could be larger */
                if (epri_p[this_time] <= (epri_p[other_time] || 0))
                    epri_p[other_time] = epri_p[this_time] - 1;
            }
        }
        /* recognize the Valley of the Dead and Moloch's Sanctum
           once hero has encountered the temple priest on those levels */
        mapseen_temple(priest);
    } else {
        /* untended */

        switch (rn2(4)) {
        case 0:
            await You("have an eerie feeling...");
            break;
        case 1:
            await pline("You feel like you are being watched."); /* You_feel() */
            break;
        case 2:
            await pline(`A shiver runs down your ${body_part(SPINE)}.`);
            break;
        default:
            break; /* no message; unfortunately there's no
                      EPRI(priest)->eerie_time available to
                      make sure we give one the first time */
        }
        if (!rn2(5)
            && (mtmp = await makemon(mons[PM_GHOST], u.ux, u.uy, MM_NOMSG))
                   !== null) {
            /* the ghost's appearance message, set_malign(), and the
               nomul(-3) "being terrified of a ghost" paralysis */
            throw new Error('intemple(): the temple ghost not ported yet');
        }
    }
}

/* C ref: mondata.h is_minion(), is_rider() */
function is_minion(ptr) { return (ptr.mflags2 & M2_MINION) !== 0; }
function is_rider(ptr) {
    return ptr === mons[PM_DEATH] || ptr === mons[PM_FAMINE]
           || ptr === mons[PM_PESTILENCE];
}

// C ref: priest.c mk_roamer()
/* synchronous, as sp_lev.c create_monster() calls it while making a level;
   uses rloc_mklev() for the "insurance" rloc() */
export function mk_roamer(ptr, alignment, x, y, peaceful) {
    let roamer;
    const coaligned = (game.u.ualign.type === alignment);

    if (MON_AT(x, y))
        rloc_mklev(m_at(x, y), RLOC_NOMSG); /* insurance */

    if (!(roamer = makemon(ptr, x, y, MM_ADJACENTOK | MM_EMIN | MM_NOMSG)))
        return null;

    roamer.emin.min_align = alignment;
    roamer.emin.renegade = (coaligned && !peaceful) ? 1 : 0;
    roamer.ispriest = 0;
    roamer.isminion = 1;
    mon_learns_traps(roamer, ALL_TRAPS); /* traps are known */
    roamer.mpeaceful = peaceful ? 1 : 0;
    roamer.msleeping = 0;
    set_malign(roamer); /* peaceful may have changed */

    /* MORE TO COME */
    return roamer;
}

// C ref: priest.c in_your_sanctuary()
export function in_your_sanctuary(
    mon, /* if non-null, <mx,my> overrides <x,y> */
    x, y)
{
    let roomno;
    let priest;

    if (mon) {
        if (is_minion(mon.data) || is_rider(mon.data))
            return false;
        x = mon.mx, y = mon.my;
    }
    if (game.u.ualign.record <= ALGN_SINNED) /* sinned or worse */
        return false;
    if (!(roomno = temple_occupied(game.u.urooms || ''))
        || roomno !== (in_rooms(x, y, TEMPLE)[0] || '\0'))
        return false;
    if ((priest = findpriest(roomno)) === null)
        return false;
    return !!(has_shrine(priest) && p_coaligned(priest)
              && priest.mpeaceful);
}

// C ref: priest.c restpriest()
/* called in restoring a level */
export function restpriest(mtmp, ghostly) {
    if (game.u.uz.dlevel) {
        if (ghostly)
            assign_level(mtmp.mextra.epri.shrlevel, game.u.uz);
    }
}
