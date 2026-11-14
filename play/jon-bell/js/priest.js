// priest.js — NetHack 3.7 priest behavior
// Ported from nethack-c/src/priest.c

import { game } from './gstate.js';
import { on_level } from './dungeon.js';
import { EPRI, EMIN, TEMPLE, NOTONL, ALLOW_M, ALLOW_ROCK, IS_ROOM, ROOMOFFSET,
         ARTICLE_NONE, ARTICLE_THE, ARTICLE_A, ARTICLE_YOUR,
         A_NONE, A_LAWFUL, A_CHAOTIC, A_NEUTRAL, Is_astralevel,
         INVIS, CONFLICT, DISPLACED,
         N_DIRS, xdir, ydir, MM_EPRI, MM_EMIN, MM_ADJACENTOK, MM_NOMSG,
         W_ARMC, ALL_TRAPS, RLOC_NOMSG,
         AM_SHRINE, AM_MASK, Amask2align, IS_ALTAR, HALLUC, HALLUC_RES,
         } from './const.js';
import { PM_DEATH, PM_FAMINE, PM_PESTILENCE, PM_PRIEST, PM_HIGH_PRIEST } from './pm.generated.js';
import { newmextra } from './makemon.js';
/* newemin's C home is minion.c:17; js/sit.js carries that file's ports. */
import { newemin } from './minion.js';
import { rn1 } from './rng.js';
import { rn2 } from './rnd.js';
import { dist2 } from './hacklib.js';
import { _allow_rock_mv, _can_open_mv, _passes_bars_mv, m_break_boulder_mv, m_move_aggress } from './monmove.js';
import { mon_allowflags } from './mon.js';
import { mkobj, mksobj } from './mkobj.js';
import { makemon } from './makemon.js';
import { mpickobj } from './steal.js';
import { online2 } from './hacklib.js';
import { mfndpos, monnear, mongone, setmangry } from './mon.js';
import { pm_good_location } from './sp_lev.js';
import { set_malign } from './makemon.js';
import { which_armor } from './worn.js';
import { mon_learns_traps } from './mondata.js';
import { rloc } from './teleport.js';
import { mongets } from './makemon.js';
import { newsym } from './display.js';
import { couldsee } from './vision.js';
import { m_at } from './uhitm.js';
import { mon_pmname, rndmonnam,
         bogon_is_pname } from './do_name.js';
import { just_an } from './objnam.js';
import { ALGN_SINNED } from './cmd.js';
import { check_special_room } from './hack.js';
import { halu_gname } from './pray.js';
import { inhishop } from './shk.js';
import { in_rooms } from './hack.js';
import { impossible } from './steed.js';

function _hero_invis_priest(u) {
    if (!u) return false;
    const p = u.uprops?.[INVIS];
    const intrinsic = (p?.intrinsic | 0) || (u.HInvis | 0);
    const extrinsic = p?.extrinsic | 0;
    const blocked = p?.blocked | 0;
    return !!((intrinsic || extrinsic) && !blocked);
}
import { Your } from './do_wear.js';
import { mon_nam } from './uhitm.js';
import { mattacku } from './mhitu.js';
import { AD_ELEC, PM_ALIGNED_CLERIC, PM_HIGH_CLERIC } from './mhitm.js';
import { wakeup } from './mon.js';
import { resist_conflict } from './mondata.js';

/**
 * newepri — allocate and init epri (priest extended data)
 * C source: nethack-c/src/priest.c:15
 */
export function newepri(mtmp) {
    if (!mtmp.mextra)
        mtmp.mextra = newmextra();
    if (!EPRI(mtmp)) {
        mtmp.mextra.epri = { parentmid: mtmp.m_id >>> 0, shralign: 0, shroom: 0,
            shrpos: { x: 0, y: 0 }, shrlevel: { dnum: 0, dlevel: 0 }, cheapskate_count: 0,
            intone_time: 0, enter_time: 0, hostile_time: 0, peaceful_time: 0 };
    }
}

/* C priest.c:27-35: discard shrine data, retaining other mextra fields. */
export function free_epri(mtmp) {
    if (mtmp.mextra && EPRI(mtmp))
        mtmp.mextra.epri = null;
    mtmp.ispriest = 0;
}

/* C priest.c:876-911: anger the temple's priest, then release him from a
 * destroyed or converted shrine.  Keep epri alive until min_align is copied. */
export async function angry_priest() {
    const priest = findpriest(temple_occupied(game.u.urooms));
    if (priest) {
        const eprip = EPRI(priest);
        await wakeup(priest, false);
        await setmangry(priest, false);
        const lev = game.level.at(eprip.shrpos.x, eprip.shrpos.y);
        if (!IS_ALTAR(lev.typ)
            || Amask2align(lev.altarmask & AM_MASK) !== eprip.shralign) {
            if (!EMIN(priest))
                newemin(priest);
            priest.ispriest = 0;
            priest.isminion = 1;
            EMIN(priest).min_align = eprip.shralign;
            EMIN(priest).renegade = false;
            free_epri(priest);
        }
    }
}

/**
 * Remove priests not on the current level (called when restoring bones levels)
 * C source: nethack-c/src/priest.c:918
 */
export async function clearpriests() {
    const u = game.u;
    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        if (mtmp.mhp <= 0)
            continue;
        if (mtmp.ispriest && !on_level(EPRI(mtmp).shrlevel, u.uz))
            await mongone(mtmp);
    }
}

/**
 * Munge priest-specific structure when restoring -dlc
 * C source: nethack-c/src/priest.c:932
 */
export function restpriest(mtmp, ghostly) {
    const u = game.u || (game.u = {});
    if (u.uz && u.uz.dlevel) {
        if (ghostly) {
            // assign_level(&(EPRI(mtmp)->shrlevel), &u.uz);
            const epri = EPRI(mtmp);
            if (epri && epri.shrlevel) {
                epri.shrlevel.dnum = u.uz.dnum;
                epri.shrlevel.dlevel = u.uz.dlevel;
            }
        }
    }
}

/**
 * in_your_sanctuary(mon, x, y) — check if a monster is in its own (priest's) sanctuary
 * C source: nethack-c/src/priest.c:770
 *
 * Returns true if:
 * 1. mon is non-null and not a minion or rider
 * 2. Player's alignment record is better than ALGN_SINNED (-4)
 * 3. mon's position is in a temple room
 * 4. The temple has an occupant priest
 * 5. The priest has a shrine, is coaligned with player, and is peaceful
 */
export function in_your_sanctuary(mon, x, y) {
    const u = game.u;
    if (!u) return false;

    // If mon is provided, extract its position and check if it's minion/rider
    if (mon) {
        // is_minion(mon->data) || is_rider(mon->data)
        const data = mon.data;
        if (!data) return false;

        // C priest.c:779: is_minion(mon->data)
        if (is_minion(data)) {
            return false;
        }

        // Check is_rider: data == mons[PM_DEATH] || mons[PM_FAMINE] || mons[PM_PESTILENCE]
        // C priest.c:779: is_rider(mon->data) tests the current species.
        const mndx = data.pmidx | 0;
        if (mndx === PM_DEATH || mndx === PM_FAMINE || mndx === PM_PESTILENCE) {
            return false;
        }

        // Override x, y with mon's position
        x = mon.mx;
        y = mon.my;
    }

    // C priest.c:783: u.ualign.record <= ALGN_SINNED
    if (!u.ualign || (u.ualign.record | 0) <= ALGN_SINNED) {
        return false;
    }

    // Check temple_occupied(u.urooms) and in_rooms(x, y, TEMPLE) match
    const roomno = temple_occupied(u.urooms);
    if (roomno === 0) {
        return false;
    }

    const rooms_at_pos = in_rooms(x, y, TEMPLE);
    if (rooms_at_pos.length === 0 || rooms_at_pos[0] !== roomno) {
        return false;
    }

    // Find the priest in that room
    const priest = findpriest(roomno);
    if (!priest) {
        return false;
    }

    // Check: has_shrine(priest) && p_coaligned(priest) && priest->mpeaceful
    const hasShrine = has_shrine(priest);
    const isCoaligned = p_coaligned(priest);
    const isPeaceful = priest.mpeaceful !== 0;

    return !!(hasShrine && isCoaligned && isPeaceful);
}

/* C ref: priest.c:160-171 inhistemple(struct monst *priest) —
 *     if (!priest || !priest->ispriest) return FALSE;
 *     if (!histemple_at(priest, priest->mx, priest->my)) return FALSE;
 *     return has_shrine(priest);
 * Both conjuncts are real bodies in this file now (histemple_at:499 lost its
 * in_rooms/on_level gap, has_shrine:200 its throwing stub), so C's whole test
 * ports directly.  Its callers outside this file — onscary()'s priest arm
 * (js/makemon.js) and mon_arrive/level_tele's scare tests (js/teleport.js) —
 * each carried their own throwing local stub for it. */
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

// Stub implementations for unported helper functions
export function temple_occupied(urooms) {
    for (let i = 0; i < urooms.length; i++) {
        const c = urooms.charCodeAt(i);
        if (game.level.rooms[c - ROOMOFFSET].rtype === TEMPLE)
            return c;
    }
    return 0;
}

/* C ref: priest.c:388-402 findpriest(char roomno) —
 *     for (mtmp = fmon; mtmp; mtmp = mtmp->nmon) {
 *         if (DEADMONSTER(mtmp)) continue;
 *         if (mtmp->ispriest && (EPRI(mtmp)->shroom == roomno)
 *             && histemple_at(mtmp, mtmp->mx, mtmp->my))
 *             return mtmp;
 *     }
 *     return (struct monst *) 0;
 * Was a throwing stub, which is why intemple() (js/cmd.js) could not be wired:
 * it cannot tell a tended temple from an untended one without this, and those
 * two branches draw completely different RNG. */
export function findpriest(roomno) {
    const rn = (roomno | 0);
    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        if ((mtmp.mhp | 0) < 1)          /* C: DEADMONSTER(mtmp) */
            continue;
        if (!mtmp.ispriest)
            continue;
        const epri = EPRI(mtmp);
        if (!epri || (epri.shroom | 0) !== rn)
            continue;
        if (histemple_at(mtmp, mtmp.mx, mtmp.my))
            return mtmp;
    }
    return null;
}

/* C ref: priest.c:371-381 has_shrine(struct monst *pri) —
 *     if (!pri || !pri->ispriest) return FALSE;
 *     lev = &levl[EPRI(pri)->shrpos.x][EPRI(pri)->shrpos.y];
 *     if (!IS_ALTAR(lev->typ) || !(lev->altarmask & AM_SHRINE)) return FALSE;
 *     return (EPRI(pri)->shralign == Amask2align(lev->altarmask & ~AM_SHRINE));
 * Also a throwing stub; intemple()'s tended branch reads it (`shrined`) to
 * choose between "a sacred place" and "a desecrated place". */
export function has_shrine(pri) {
    if (!pri || !pri.ispriest)
        return false;
    const epri = EPRI(pri);
    if (!epri || !epri.shrpos)
        return false;
    const lev = game.level?.at?.(epri.shrpos.x | 0, epri.shrpos.y | 0);
    if (!lev)
        return false;
    if (!IS_ALTAR(lev.typ | 0) || !((lev.altarmask | 0) & AM_SHRINE))
        return false;
    return (epri.shralign | 0)
        === Amask2align((lev.altarmask | 0) & ~AM_SHRINE);
}

/* C ref: priest.c:543-554 forget_temple_entry(priest) —
 *     reset the move counters used to limit temple entry feedback;
 *     leaving the level and then returning yields a fresh start.
 * C calls it from savemonchn (save.c:894) for every priest of a level being
 * saved and from save_mtraits (mkobj.c:2160).  Without it a returning hero
 * never hears "intones" / "Pilgrim, you enter" again (the d(10,500),
 * d(10,100), d(10,20) draws at priest.c:443/471/491 are skipped). */
export function forget_temple_entry(priest) {
    const epri_p = priest.ispriest ? EPRI(priest) : null;
    if (!epri_p) {
        impossible("attempting to manipulate shrine data for non-priest?");
        return;
    }
    epri_p.intone_time = epri_p.enter_time = epri_p.peaceful_time =
        epri_p.hostile_time = 0;
}

/* C ref: priest.c:207-212 p_coaligned(priest) —
 *   return (boolean) (u.ualign.type == mon_aligntyp(priest));   (5.0, priest.c:370-373;
 *   the 3.7 form re-ran Amask2align over shralign, which is already an aligntyp,
 *   turning a neutral priest's 0 into A_NONE)
 * Exported: js/mklev.js's setmangry (mon.c:4299) reads it for an angered
 * priest and had NO binding for it in scope. */
export function p_coaligned(priest) {
    return game.u.ualign.type === mon_aligntyp(priest);
}

/* C ref: priest.c:220-276 priestini(lvl, sroom, sx, sy, sanctum) — create the
 * temple priest for a shrine altar just placed at (sx,sy) in room `sroom`.
 *
 * RNG, in order: rn2(N_DIRS) for the starting direction of the placement scan,
 * then makemon() (which draws its own), then rn1(3, 2) spellbooks each of which
 * calls mkobj(SPBOOK_no_NOVEL, FALSE), then rn2(2) for the cloak's BUC.  The
 * placement scan itself and pm_good_location() are RNG-free.
 *
 * NOTE the C reads `EPRI(priest)->shralign = Amask2align(levl[sx][sy].altarmask)`
 * BEFORE create_altar ORs in AM_SHRINE (sp_lev.c:2480-2481 does priestini first),
 * so shralign is the bare alignment, not the shrine-flagged mask. */
export async function priestini(lvl, sroom, sx, sy, sanctum) {
    let px = 0, py = 0, i;
    const si = rn2(N_DIRS);
    const prim = sanctum ? PM_HIGH_PRIEST : PM_PRIEST;

    for (i = 0; i < N_DIRS; i++) {
        px = sx + xdir[DIR_CLAMP(i + si)];
        py = sy + ydir[DIR_CLAMP(i + si)];
        if (pm_good_location(px, py, prim))
            break;
    }
    if (i === N_DIRS) {
        px = sx;
        py = sy;
    }

    if (m_at(px, py))
        await rloc(m_at(px, py), RLOC_NOMSG); /* insurance */

    const priest = await makemon(prim, px, py, MM_EPRI);
    if (priest) {
        const epri = EPRI(priest);
        /* C: (sroom - svr.rooms) + ROOMOFFSET — the room's INDEX, which
         * js/mklev.js's add_room stores on the room as roomnoidx. */
        epri.shroom = (sroom.roomnoidx ?? game.level.rooms.indexOf(sroom))
                      + ROOMOFFSET;
        epri.shralign = Amask2align(game.level.at(sx, sy).altarmask);
        epri.shrpos = { x: sx, y: sy };
        /* C: assign_level(&EPRI(priest)->shrlevel, lvl) — copy, not alias. */
        epri.shrlevel = { dnum: lvl.dnum, dlevel: lvl.dlevel };
        mon_learns_traps(priest, ALL_TRAPS); /* traps are known */
        priest.mpeaceful = 1;
        priest.ispriest = 1;
        priest.isminion = 0;
        priest.msleeping = 0;
        set_malign(priest); /* mpeaceful may have changed */

        /* now his/her goodies... */
        if (sanctum && epri.shralign === A_NONE
            && on_level(game.sanctum_level, game.u.uz)) {
            /* C priest.c:262 (void) mongets(priest, AMULET_OF_YENDOR).
             * The mksobjFn argument was MISSING here — this project's mongets
             * takes mksobj as a third parameter (js/m_initweap.js:356) because
             * mksobj is module-local to js/mklev.js.  The arm is guarded by
             * sanctum && shralign == A_NONE && on_level(sanctum_level), so it
             * was unreachable until the sanctum level was admitted, and then
             * it threw "mksobjFn is not a function" out of the middle of
             * lspo_altar -> create_altar -> priestini, killing the whole
             * level load. */
            await mongets(priest, AMULET_OF_YENDOR, mksobj);
        }
        /* 2 to 4 spellbooks */
        for (let cnt = rn1(3, 2); cnt > 0; --cnt) {
            await mpickobj(priest, (await mkobj(SPBOOK_no_NOVEL, false)));
        }
        /* robe [via makemon()] */
        let otmp;
        if (rn2(2) && (otmp = which_armor(priest, W_ARMC)) != null) {
            if (p_coaligned(priest))
                await uncurse(otmp);
            else
                await curse(otmp);
        }
    }
}

/* C ref: mkobj.c:1822-1836 uncurse / 1783-1815 curse, reduced to the fields
 * this call site can reach: the priest's cloak is never a coin, never lamplit,
 * never carried by the hero, and never a bag of holding, so every conditional
 * tail (arti_light_radius / set_moreluck / weight / uwep weld) is unreachable. */
import { uncurse, curse } from './mkobj.js';
import { exercise } from './attrib.js'; // relocate-fns
import { A_WIS, IS_DOOR, BZ_OFS_AD } from './const.js'; // relocate-fns
import { s_suffix } from './hacklib.js'; // relocate-fns
import { buzz, BZ_M_SPELL, is_minion } from './mcastu.js'; // relocate-fns
import { linedup } from './mthrowu.js'; // relocate-fns
import { pline } from './pline.js'; // relocate-fns
import { a_gname_at } from './pray.js'; // relocate-fns
import { nomul } from './hack.js'; // relocate-fns
import { SetVoice, _Is_sanctum, _You_feel, _goto_level_You, _helpless_mon, _hero_Deaf, _uprop_active } from './cmd.js';
import { record_achievement } from './insight.js'; // relocate-fns
import { ACH_TMPL, In_endgame } from './const.js'; // relocate-fns
import { canseemon, canspotmon } from './display.js'; // relocate-fns
import { You } from './do_wear.js'; // relocate-fns
import { permonstTemplate } from './makemon.js'; // relocate-fns
import { Monnam } from './mcastu.js'; // relocate-fns
import { makemon as mklev_makemon } from './makemon.js'; // relocate-fns
import { verbalize } from './pline.js'; // relocate-fns
import { PM_GHOST } from './pm.generated.js'; // relocate-fns
import { body_part } from './polyself.js'; // relocate-fns
import { d } from './rnd.js'; // relocate-fns
import { mapseen_temple } from './dungeon.js'; // relocate-fns
import { adjalign } from './attrib.js'; // relocate-fns
import { _um_mhis, incr_itimeout_prop } from './cmd.js';
import { inv_cnt } from './hack.js';
import { currency, merge_choice } from './invent.js'; // relocate-fns
import { CLAIRVOYANT, FROMOUTSIDE, INTRINSIC, LL_CONDUCT, PROTECTION } from './const.js'; // relocate-fns
import { dropy } from './do.js'; // relocate-fns
import { obj_extract_self } from './dokick.js'; // relocate-fns
import { money_cnt } from './hack.js'; // relocate-fns
import { addinv } from './invent.js'; // relocate-fns
import { splitobj } from './makemon.js';
import { findgold } from './steal.js'; // relocate-fns
import { livelog_printf } from './pline.js'; // relocate-fns
import { _money2mon } from './sounds.js'; // relocate-fns
import { getlin } from './windows.js'; // relocate-fns

/* C ref: hack.c:3497-3559 in_rooms(x, y, typewanted).  The file-local throwing
 * stub that used to sit here SHADOWED a real port: js/shk.js already carries the
 * full body (its own callers, and js/monmove.js, have consumed it for a while),
 * returning the same room numbers in C's order as an array.  in_your_sanctuary()
 * above was already written against that array form (`rooms_at_pos[0]`), so the
 * stub was the only thing standing between it and a working lookup. */

export async function move_special(mtmp, in_his_shop, appr, uondoor, avoid,
                             omx, omy, ggx, ggy) {
    /* C priest.c:56-57 */
    if (omx === ggx && omy === ggy)
        return 0;
    /* C priest.c:58-61 */
    if (mtmp.mconf | 0) {
        avoid = false;
        appr = 0;
    }

    let nix = omx;
    let niy = omy;
    /* C priest.c:65-66: allowflags = mon_allowflags(mtmp); cnt = mfndpos(...). */
    const allowflags = mon_allowflags(mtmp); /* C priest.c:65 */
    const mfp = { cnt: 0, poss: [], info: [] };
    const real_cnt = mfndpos(mtmp, mfp, allowflags);
    const poss = [];
    for (let i = 0; i < real_cnt; i++)
        poss.push({ x: mfp.poss[i].x, y: mfp.poss[i].y, info: mfp.info[i] | 0 });
    const cnt = poss.length;

    const u = game.u;
    const info = mfp.info; // C priest.c:66: mfndpos supplies NOTONL.

    if ((mtmp.isshk | 0) && avoid && uondoor) {
        let any = false;
        for (let i = 0; i < cnt; i++) {
            if (!(info[i] & NOTONL)) { any = true; break; }
        }
        if (!any) avoid = false;
    }

    /* C priest.c:75-101 — pick_move (with the ispriest avoid-retry goto). */
    let ninfo = 0;
    const level = game.level;
    const GDIST = (x, y) => dist2(x, y, ggx, ggy);
    const following = !!(mtmp.mextra?.eshk?.following);
    // eslint-disable-next-line no-constant-condition
    for (;;) {
        let chcnt = 0;
        nix = omx;
        niy = omy;
        ninfo = 0;
        for (let i = 0; i < cnt; i++) {
            const nx = poss[i].x;
            const ny = poss[i].y;
            const loc = game.level?.at(nx, ny);
            const typ = loc ? (loc.typ | 0) : 0;
            /* C priest.c:81-82: IS_ROOM(typ) || (isshk && (!in_his_shop ||
             * ESHK(mtmp)->following)) */
            if (IS_ROOM(typ)
                || ((mtmp.isshk | 0) && (!in_his_shop || following))) {
                /* C priest.c:83-84 */
                if (avoid && (info[i] & NOTONL) && !(info[i] & ALLOW_M))
                    continue;
                /* C priest.c:85-91 */
                if ((!appr && !rn2(++chcnt))
                    || (appr && GDIST(nx, ny) < GDIST(nix, niy))
                    || (info[i] & ALLOW_M)) {
                    nix = nx;
                    niy = ny;
                    ninfo = info[i];
                }
            }
        }
        /* C priest.c:95-101: ispriest avoid-retry — re-run pick_move once with
         * avoid cleared if we'd stay put but stay lined up.  Shopkeepers are not
         * ispriest, so this never fires on the shk path. */
        if ((mtmp.ispriest | 0) && avoid && nix === omx && niy === omy
            && onlineu_special(omx, omy)) {
            avoid = false;
            continue;
        }
        break;
    }

    /* C priest.c:103-137 — commit the move. */
    if (nix !== omx || niy !== omy) {
        if (ninfo & ALLOW_ROCK) {
            /* C priest.c:105-107: m_break_boulder(mtmp,nix,niy); return 1. */
            await m_break_boulder_mv(mtmp, nix, niy);
            return 1;
        } else if (ninfo & ALLOW_M) {
            /* C priest.c:108-118: m_move_aggress(mtmp,nix,niy); any other
             * status falls through to the MON_AT test below. */
            switch (await m_move_aggress(mtmp, nix, niy)) {
            case 2:
                return -2; /* died making the attack */
            case 3:
                return 1; /* attacked and spent this move */
            }
        }

        /* C priest.c:120-121: if (MON_AT(nix,niy) || u_at(nix,niy)) return 0; */
        if (m_at(nix, niy) || (u && (u.ux | 0) === nix && (u.uy | 0) === niy))
            return 0;
        /* C priest.c:122-124: remove_monster(omx,omy); place_monster(mtmp,nix,
         * niy); newsym(nix,niy).  JS idiom (matches dog_move/m_move): update
         * mx/my, then redraw only the new cell, as C does. */
        mtmp.mx = nix;
        mtmp.my = niy;
        newsym(nix, niy);
        if (mtmp.isshk && !in_his_shop && inhishop(mtmp))
            await check_special_room(false);
        /* C priest.c:125-126 (above): isshk && !in_his_shop && inhishop(mtmp)
         * → check_special_room(FALSE), once the shopkeeper has moved. */
        return 1;
    }
    return 0;
}

/* C hack.h onlineu(x,y) = online2(x,y,u.ux,u.uy).  Local helper for the
 * ispriest avoid-retry (priest.c:96). */
function onlineu_special(x, y) {
    const u = game.u;
    return online2(x, y, (u?.ux ?? 0) | 0, (u?.uy ?? 0) | 0);
}

/* histemple_at — is priest at its temple?
 * C source: nethack-c/src/priest.c:153-158:
 *   return (priest && priest->ispriest
 *           && (EPRI(priest)->shroom == *in_rooms(x, y, TEMPLE))
 *           && on_level(&(EPRI(priest)->shrlevel), &u.uz));
 *
 * KNOWN GAP — the two trailing conjuncts are NOT ported: in_rooms() and
 * on_level() are still throwing stubs in this file (priest.js:161/496), so this
 * body answers TRUE for every ispriest monster regardless of where it stands.
 * No RNG is drawn on either side of the gap (in_rooms/on_level are pure map
 * lookups), but the gap is RNG-visible through its ONLY caller: pri_move()
 * returns -1 immediately — consuming NO RNG — when histemple_at() is false,
 * and otherwise falls through to two rn1(3,-1) draws (C priest.c:194-195).
 * A stub that never says "false" therefore over-draws for any priest standing
 * outside his temple.  THIS MUST BE PORTED BEFORE pri_move() IS WIRED INTO
 * js/monmove.js — see the pri_move() header below. */
function histemple_at(priest, x, y) {
    /* GAP CLOSED — in_rooms() (above) and on_level() (below) are both real
     * bodies now, so this is C priest.c:153-158 in full.  The header's warning
     * stands satisfied: pri_move() may now be wired, because this can return
     * FALSE for a priest standing outside his temple and C's no-RNG `return -1`
     * arm is reachable again. */
    if (!priest || !priest.ispriest)
        return false;
    const epri = EPRI(priest);
    if (!epri)
        return false;
    /* C: EPRI(priest)->shroom == *in_rooms(x, y, TEMPLE) — the FIRST entry,
     * or NUL (0) when the list is empty. */
    const here = in_rooms(x, y, TEMPLE);
    if ((epri.shroom | 0) !== ((here.length ? here[0] : 0) | 0))
        return false;
    return on_level(epri.shrlevel, game.u?.uz);
}

/* m_canseeu — can the monster see the hero?
 * C vision.h:50-53: (!Invis || perceives(m->data)) && !Underwater
 *                   && couldsee(m->mx, m->my).
 * (Line of sight from the hero to the monster's square, NOT a straight-line
 * test: this used online2() and so refused to chase a hero who was in view
 * but off the priest's row/column/diagonal.)  The caller tests mcansee. */
function m_canseeu(mtmp) {
    const u = game.u;
    const Invis = _hero_invis_priest(u);
    const perceives = !!((mtmp.data.mflags1 || 0) & 0x01000000 /* M1_SEE_INVIS */);
    return (!Invis || perceives) && !(u && u.uinwater)
           && !!couldsee(mtmp.mx | 0, mtmp.my | 0);
}

export async function pri_move(priest) {
    let ggx, ggy, omx, omy;
    let temple;
    let avoid = true;

    omx = priest.mx;
    omy = priest.my;

    if (!histemple_at(priest, omx, omy))
        return -1;

    temple = EPRI(priest).shroom;

    ggx = EPRI(priest).shrpos.x;
    ggy = EPRI(priest).shrpos.y;

    ggx += rn1(3, -1); /* mill around the altar */
    ggy += rn1(3, -1);

    const u = game.u;
    /* C youprop.h:198/204/218 —
     *   Invis     ((HInvis || EInvis) && !BInvis)
     *   Displaced (HDisplaced || EDisplaced)
     *   Conflict  (HConflict || EConflict)
     * Those C names are macros over u.uprops[]; the ONLY spelling ever WRITTEN
     * in this tree is the numeric u.uprops[<PROP>] table.  `u.HConflict`,
     * `u.HDisplaced`, `u.HInvis`, `u.EInvis` and `u.BInvis` have no writer
     * anywhere in js/ (js/trap.js:2654 assigns u.uprops[INVIS].intrinsic FROM
     * u.HInvis, which is itself never written), so all three predicates were
     * permanently false and the `Your("displaced image doesn't fool %s!")`
     * branch at priest.c:200 could never fire.  This is the same repair
     * js/monmove.js:2055 already carries for set_apparxy.
     *
     * Only DISPLACED is live today: nothing writes uprops[CONFLICT] and the one
     * uprops[INVIS] writer reads a dead field, so Conflict/Invis keep their
     * current value and this is a no-op for them.  DISPLACED is written from
     * the hero's worn cloak of displacement (js/u_init.js _ini_inv_use_obj,
     * js/do_wear.js setworn_armor). */
    const _prop = (p) => u?.uprops?.[p] ?? null;
    const _pConflict = _prop(CONFLICT);
    const Conflict = !!(_pConflict && ((_pConflict.intrinsic | 0) || (_pConflict.extrinsic | 0)));
    const _pDisp = _prop(DISPLACED);
    const Displaced = !!(_pDisp && ((_pDisp.intrinsic | 0) || (_pDisp.extrinsic | 0)));
    const _pInvis = _prop(INVIS);
    const Invis = !!(_pInvis && ((_pInvis.intrinsic | 0) || (_pInvis.extrinsic | 0))
                     && !(_pInvis.blocked | 0));

    if (!priest.mpeaceful
        || (Conflict && !resist_conflict(priest))) {
        if (monnear(priest, u.ux, u.uy)) {
            if (Displaced)
                Your("displaced image doesn't fool %s!", mon_nam(priest));
            /* C priest.c:201 — mattacku() must be awaited: it is async, and an
             * unawaited call interleaves its draws with the rest of the turn. */
            await mattacku(priest);
            return 0;
        } else if (u.urooms && u.urooms.indexOf(String.fromCharCode(temple)) !== -1) {
            /* chase player if inside temple & can see him */
            if (priest.mcansee && m_canseeu(priest)) {
                ggx = u.ux;
                ggy = u.uy;
            }
            avoid = false;
        }
    } else if (Invis)
        avoid = false;

    return await move_special(priest, false, true, false, avoid, omx, omy, ggx, ggy);
}

/*
 * mk_roamer — C ref: nethack-c-v5/upstream/src/priest.c:722-751.
 * Make a wandering minion (an aligned cleric or an angel) with an EXPLICIT
 * alignment, rather than the random one makemon rolls.  Its one level-loading
 * caller is create_monster's `m->sp_amask != AM_SPLEV_RANDOM` arm
 * (sp_lev.c:1983-1984), i.e. any des.monster whose table carries an `align`
 * field — sanctum.lua:115-123 places Moloch's nine `align="noalign"` aligned
 * clerics that way, and that throw was the last blocker on the sanctum level.
 * The other C callers are minion.c:491/525 (summoned angels).
 *
 * RNG: mk_roamer itself draws NOTHING.  Everything it consumes comes from
 * rloc() (only when the square is occupied) and makemon().  The MM_EMIN in the
 * flag word is load-bearing for RNG parity, not just for the emin allocation:
 * makemon's angel/cleric block (makemon.c:1413-1428) is skipped entirely when
 * MM_EMIN is set, so an aligned cleric made through mk_roamer does NOT draw the
 * rn2(3) min_align / rn2(3) renegade pair that a plain makemon(PM_ALIGNED_CLERIC)
 * does — mk_roamer assigns both fields itself instead.
 */
export async function mk_roamer(ptr, alignment, x, y, peaceful) {
    const coaligned = ((game.u?.ualign?.type ?? 0) | 0) === alignment;

    /* C: if (MON_AT(x, y)) (void) rloc(m_at(x, y), RLOC_NOMSG);  / * insurance * / */
    const occupant = m_at(x, y);
    if (occupant)
        await rloc(occupant, RLOC_NOMSG);

    const roamer = await makemon(ptr, x, y, MM_ADJACENTOK | MM_EMIN | MM_NOMSG);
    if (!roamer)
        return null;

    /* C: EMIN(roamer)->min_align / ->renegade.  makemon's MM_EMIN arm
     * (makemon.c:1243-1244) has already run newemin, so EMIN() is non-null;
     * allocate defensively anyway, the way newepri's callers here do. */
    if (!EMIN(roamer))
        newemin(roamer);
    const emin = EMIN(roamer);
    emin.min_align = alignment;
    emin.renegade = (coaligned && !peaceful) ? 1 : 0;

    roamer.ispriest = 0;
    roamer.isminion = 1;
    mon_learns_traps(roamer, ALL_TRAPS); /* traps are known */
    roamer.mpeaceful = peaceful ? 1 : 0;
    roamer.msleeping = 0;
    set_malign(roamer); /* peaceful may have changed */

    /* C: "MORE TO COME" — nothing further in 5.0 either. */
    return roamer;
}

/*
 * mon_aligntyp — get a monster's alignment type without caller needing EPRI
 * & EMIN.  C source: nethack-c/src/priest.c:279-289.  A leaf helper of
 * priestname (and p_coaligned); its whole body is three struct reads plus a
 * sign reduction, so it is ported inline here rather than left as a throwing
 * stub that priestname's unconditional " of <god>" tail would always trip.
 */
export function mon_aligntyp(mon) {
    const algn = mon.ispriest ? EPRI(mon).shralign
               : mon.isminion ? EMIN(mon).min_align
                              : mon.data.maligntyp;
    if (algn === A_NONE)
        return A_NONE; /* negative but differs from chaotic */
    return (algn > 0) ? A_LAWFUL : (algn < 0) ? A_CHAOTIC : A_NEUTRAL;
}

export function priestname(mon, article, reveal_high_priest, pname) {
    const hp = game.u?.uprops || {};
    const do_hallu = !!(((hp[HALLUC]?.intrinsic | 0) || (hp[HALLUC]?.extrinsic | 0))
              && !((hp[HALLUC_RES]?.intrinsic | 0) || (hp[HALLUC_RES]?.extrinsic | 0)));
    const mndx = (typeof mon.data?.pmidx === 'number') ? (mon.data.pmidx | 0) : (mon.data_mndx | 0);
    const aligned_priest = mndx === PM_ALIGNED_CLERIC;
    const high_priest = mndx === PM_HIGH_CLERIC;
    /* C priest.c:311-312 — `char whatcode = '\0';` is an OUT-parameter here:
     *   const char *what = do_hallu ? rndmonnam(&whatcode) : mon_pmname(mon);
     * and :323 reads it back through bogon_is_pname(whatcode).  It used to be
     * passed as the comment `/* &whatcode *\/`, so whatcode stayed '\0' and the
     * bogon_is_pname test below could never fire. */
    const whatcodeRef = { code: '\0' };
    let what = do_hallu ? rndmonnam(whatcodeRef) : mon_pmname(mon);
    const whatcode = whatcodeRef.code;

    if (!mon.ispriest && !mon.isminion) /* should never happen...  */
        return what;                    /* caller must be confused */

    /* for high priest(ess), "high" (or "grand" for poohbah) will be inserted
       [this was done near the end but we want 'what' to be updated sooner] */
    if (mon.ispriest || aligned_priest || high_priest)
        what = do_hallu ? "poohbah" : mon.female ? "priestess" : "priest";

    let out = '';
    if (article !== ARTICLE_NONE && (!do_hallu || !bogon_is_pname(whatcode))) {
        if (article === ARTICLE_YOUR || (article === ARTICLE_A && high_priest))
            article = ARTICLE_THE;
        if (article === ARTICLE_THE) {
            out = "the ";
        } else if (what === "Angel") {
            /* bypass just_an(); it would yield "" due to treating capital A
               as indicating a personal name */
            out = "an ";
        } else {
            out = just_an('', what);
        }
    }
    /* out contains "" or {"a ","an ","the "} */
    if (mon.minvis) {
        /* avoid "a invisible priest" */
        if (out === "a ")
            out = "an ";
        out += "invisible ";
    }
    if (mon.isminion && EMIN(mon).renegade) {
        /* avoid "an renegade Angel" */
        if (out === "an " && !mon.minvis)
            out = "a ";
        out += "renegade ";
    }

    if (mon.ispriest || aligned_priest) {
        if (high_priest)
            out += do_hallu ? "grand " : "high ";
    } else {
        if (mon.mtame && what.toLowerCase() === "angel")
            out += "guardian ";
    }

    out += what;
    /* same as distant_monnam(), more or less... */
    if (do_hallu || !high_priest || reveal_high_priest
        || !Is_astralevel(game.u.uz)
        || m_next2u(mon) || game.program_state.gameover) {
        out += " of ";
        out += halu_gname(mon_aligntyp(mon));
    }
    return out;
}

/* C hack.h m_next2u(mon) = (distu(mon->mx, mon->my) <= 2).  Local helper for
 * priestname's astral high-priest reveal test (priest.c:362). */
function m_next2u(mon) {
    const u = game.u;
    return dist2(mon.mx, mon.my, (u?.ux ?? 0) | 0, (u?.uy ?? 0) | 0) <= 2;
}

/* Unported helpers — stubs */
/* C ref: include/hack.h:662 DIR_CLAMP(dir) — (((dir) + N_DIRS) % N_DIRS). */
function DIR_CLAMP(dir) { return ((dir + N_DIRS) % N_DIRS); }
/* C: objects.h SPBOOK_no_NOVEL == (0 - (int) SPBOOK_CLASS); AMULET_OF_YENDOR
 * otyp.  Module-local by this project's convention (js/mklev.js:195/289 carry
 * the same two literals). */
const SPBOOK_no_NOVEL = -10;
const AMULET_OF_YENDOR = 213;

/* C ref: dungeon.c:1050-1054 on_level(a, b) — same dungeon AND same depth. */
export { on_level };
export { mongone } from './mklev.js';

/* C priest.c:796 — the shrine's retaliation when its priest is attacked. */
export async function ghod_hitsu(priest) {
    const u = game.u;
    const roomno = temple_occupied(u?.urooms || '');
    if (!roomno || !has_shrine(priest)) return;
    const shrine = priest?.mextra?.epri?.shrpos;
    const troom = game.level?.rooms?.[(roomno | 0) - ROOMOFFSET];
    if (!shrine || !troom) return;
    const ax = shrine.x | 0, ay = shrine.y | 0;
    let x = ax, y = ay;
    if ((x === (u.ux | 0) && y === (u.uy | 0))
        || !linedup(u.ux | 0, u.uy | 0, x, y, 1)) {
        const here = game.level?.at?.(u.ux | 0, u.uy | 0);
        if (here && IS_DOOR(here.typ | 0)) {
            if ((u.ux | 0) === ((troom.lx | 0) - 1)) { x = troom.hx; y = u.uy; }
            else if ((u.ux | 0) === ((troom.hx | 0) + 1)) { x = troom.lx; y = u.uy; }
            else if ((u.uy | 0) === ((troom.ly | 0) - 1)) { x = u.ux; y = troom.hy; }
            else if ((u.uy | 0) === ((troom.hy | 0) + 1)) { x = u.ux; y = troom.ly; }
        } else {
            switch (rn2(4)) {
            case 0: x = u.ux; y = troom.ly; break;
            case 1: x = u.ux; y = troom.hy; break;
            case 2: x = troom.lx; y = u.uy; break;
            default: x = troom.hx; y = u.uy; break;
            }
        }
        if (!linedup(u.ux | 0, u.uy | 0, x, y, 1)) return;
    }
    const god = a_gname_at(ax, ay);
    switch (rn2(3)) {
    case 0: await pline(`${god} roars in anger:  "Thou shalt suffer!"`); break;
    case 1: await pline(`${s_suffix(god)} voice booms:  "How darest thou harm my servant!"`); break;
    default: await pline(`${god} roars:  "Thou dost profane my shrine!"`); break;
    }
    const oldWand = game.gc_current_wand;
    const oldBuzzer = game.gb?.buzzer;
    game.gc_current_wand = 0;
    if (game.gb) game.gb.buzzer = 0;
    await buzz(BZ_M_SPELL(BZ_OFS_AD(AD_ELEC)), 6, x, y, Math.sign(game.gt?.tbx || 0), Math.sign(game.gt?.tby || 0));
    if (game.gb) game.gb.buzzer = oldBuzzer;
    game.gc_current_wand = oldWand;
    exercise(A_WIS, false);
}

const SPINE = 12;

const ALGN_DEVOUT = 14;   /* better than fervent (9..13) */


export async function intemple(roomno) {
    const g = game;
    const u = g.u || (g.u = {});
    let priest, mtmp;
    let epri_p;
    let shrined, sanctum, can_speak;
    let this_time, other_time;   /* which epri_p field to write */
    let msg1, msg2;

    /* don't do anything if hero is already in the room */
    if (temple_occupied(u.urooms0 || ''))
        return;

    if ((priest = findpriest(roomno)) != null) {
        /* tended */
        record_achievement(ACH_TMPL);

        epri_p = EPRI(priest);
        shrined = has_shrine(priest);
        sanctum = (((priest.mndx ?? priest.mnum) | 0) === PM_HIGH_PRIEST
                   && (_Is_sanctum(u.uz) || In_endgame(u.uz)));
        can_speak = !_helpless_mon(priest);
        const Deaf = _hero_Deaf();
        const moves = (g.moves ?? 0) | 0;
        if (can_speak && !Deaf && moves >= ((epri_p.intone_time | 0))) {
            const save_priest = priest.ispriest;

            /* don't reveal the altar's owner upon temple entry in
               the endgame; for the Sanctum, the next message names
               Moloch so suppress the "of Moloch" for him here too */
            if (sanctum && !_uprop_active('HALLUC'))
                priest.ispriest = 0;
            await pline('%s intones:',
                        canseemon(priest) ? Monnam(priest) : 'A nearby voice');
            priest.ispriest = save_priest;
            epri_p.intone_time = moves + d(10, 500); /* ~2505 */
            /* make sure that we don't suppress entry message when
               we've just given its "priest intones" introduction */
            epri_p.enter_time = 0;
        }
        msg1 = msg2 = null;
        if (sanctum && _Is_sanctum(u.uz)) {
            if (priest.mpeaceful) {
                /* first time inside */
                msg1 = 'Infidel, you have entered Moloch\'s Sanctum!';
                msg2 = 'Be gone!';
                priest.mpeaceful = 0;
                /* became angry voluntarily; no penalty for attacking him */
                set_malign(priest);
            } else {
                /* repeat visit, or attacked priest before entering */
                msg1 = 'You desecrate this place by your presence!';
            }
        } else if (moves >= ((epri_p.enter_time | 0))) {
            msg1 = `Pilgrim, you enter a ${!shrined ? 'desecrated' : 'sacred'} place!`;
        }
        if (msg1 && can_speak && !_hero_Deaf()) {
            SetVoice(priest, 0, 80, 0);
            await verbalize(msg1);
            if (msg2)
                await verbalize(msg2);
            epri_p.enter_time = moves + d(10, 100); /* ~505 */
        }
        if (!sanctum) {
            const record = (u.ualign?.record | 0);
            if (!shrined || !p_coaligned(priest) || record <= ALGN_SINNED) {
                msg1 = 'have a%s forbidding feeling...';
                msg2 = (!shrined || !p_coaligned(priest)) ? '' : ' strange';
                this_time = 'hostile_time';
                other_time = 'peaceful_time';
            } else {
                msg1 = 'experience %s sense of peace.';
                msg2 = (record >= ALGN_DEVOUT) ? 'a' : 'an unusual';
                this_time = 'peaceful_time';
                other_time = 'hostile_time';
            }
            /* give message if we haven't seen it recently or
               if alignment update has caused it to switch from
               forbidding to sense-of-peace or vice versa */
            if (moves >= (epri_p[this_time] | 0)
                || (epri_p[other_time] | 0) >= (epri_p[this_time] | 0)) {
                await _goto_level_You(msg1, msg2);
                epri_p[this_time] = moves + d(10, 20); /* ~55 */
                /* avoid being tricked by the RNG:  switch might have just
                   happened and previous random threshold could be larger */
                if ((epri_p[this_time] | 0) <= (epri_p[other_time] | 0))
                    epri_p[other_time] = (epri_p[this_time] | 0) - 1;
            }
        }
        /* recognize the Valley of the Dead and Moloch's Sanctum
           once hero has encountered the temple priest on those levels */
        mapseen_temple(priest);
    } else {
        /* untended */

        switch (rn2(4)) {
        case 0:
            await You('have an eerie feeling...');
            break;
        case 1:
            await _You_feel('like you are being watched.');
            break;
        case 2:
            await pline('A shiver runs down your %s.', body_part(SPINE));
            break;
        default:
            break; /* no message; unfortunately there's no
                      EPRI(priest)->eerie_time available to
                      make sure we give one the first time */
        }
        if (!rn2(5)
            && (mtmp = await mklev_makemon(permonstTemplate(PM_GHOST), u.ux, u.uy,
                                           MM_NOMSG)) != null) {
            const ngen = (g.mvitals?.[PM_GHOST]?.born | 0);
            if (canspotmon(mtmp))
                await pline('A%s ghost appears next to you%s',
                            ngen < 5 ? 'n enormous' : '',
                            ngen < 10 ? '!' : '.');
            else
                await _goto_level_You('sense a presence close by!');
            mtmp.mpeaceful = 0;
            set_malign(mtmp);
            if (g.flags?.verbose)
                await _goto_level_You('are frightened to death, and unable to move.');
            nomul(-3);
            g.multi_reason = 'being terrified of a ghost';
            g.nomovemsg = 'You regain your composure.';
        }
    }
}

/* C ref: minion.c bribe(mtmp, prompt) — getlin the amount, sscanf "%ld",
 * then hand the gold over with money2mon().  Returns the amount paid. */
async function _bribe(mtmp, prompt) {
    const umoney = money_cnt(game.invent);
    const buf = await getlin(prompt);
    const m = /^\s*([+-]?\d+)/.exec(buf || '');
    let offer = m ? parseInt(m[1], 10) : 0;
    if (offer < 0) {
        await pline(`You try to shortchange ${mon_nam(mtmp)}, but fumble.`);
        return 0;
    } else if (offer === 0) {
        await pline('You refuse.');
        return 0;
    } else if (offer >= umoney) {
        await pline(`You give ${mon_nam(mtmp)} all your gold.`);
        offer = umoney;
    } else {
        await pline(`You give ${mon_nam(mtmp)} ${offer} ${currency(offer)}.`);
    }
    await _money2mon(mtmp, offer);
    if (game.disp) game.disp.botl = true;
    return offer;
}

/* C ref: shk.c money2u(mon, amount) — monster's gold to the hero (shk.js's copy
 * is module-private).  invlet_basic is 52. */
async function _money2u_priest(mon, amount) {
    let mongold = findgold(mon.minvent);
    if (amount <= 0 || !mongold || (mongold.quan | 0) < amount)
        return;
    if ((mongold.quan | 0) > amount)
        mongold = await splitobj(mongold, amount);
    obj_extract_self(mongold);
    if (!(await merge_choice(game.invent, mongold)) && inv_cnt(false) >= 52) {
        await pline('You have no room for the gold!');
        await dropy(mongold);
    } else {
        await addinv(mongold);
        if (game.disp) game.disp.botl = true;
    }
}

/* C ref: priest.c:561-745 priest_talk(priest) — domonnoise()'s MS_PRIEST arm.
 * Not exported from priest.js (which has no body for it), so it lives here. */
export async function priest_talk(priest) {
    const g = game;
    const u = g.u;
    const coaligned = p_coaligned(priest);
    const strayed = (u.ualign.record | 0) < 0;
    const epri = EPRI(priest);

    /* KMH, conduct */
    u.uconduct = u.uconduct || {};
    const prevGnostic = u.uconduct.gnostic | 0;
    u.uconduct.gnostic = prevGnostic + 1;
    if (!prevGnostic)
        livelog_printf(LL_CONDUCT, 'rejected atheism by consulting with %s', mon_nam(priest));

    if (priest.mflee || (!priest.ispriest && coaligned && strayed)) {
        await pline(`${Monnam(priest)} doesn't want anything to do with you!`);
        priest.mpeaceful = 0;
        return;
    }

    /* priests don't chat unless peaceful and in their own temple */
    if (!inhistemple(priest) || !priest.mpeaceful || _helpless_mon(priest)) {
        const cranky_msg = [
            'Thou wouldst have words, eh?  I\'ll give thee a word or two!',
            'Talk?  Here is what I have to say!',
            'Pilgrim, I would speak no longer with thee.'
        ];
        if (_helpless_mon(priest)) {
            await pline(`${Monnam(priest)} breaks out of ${_um_mhis(priest)} reverie!`);
            priest.mfrozen = priest.msleeping = 0;
            priest.mcanmove = 1;
        }
        priest.mpeaceful = 0;
        SetVoice(priest, 0, 80, 0);
        await verbalize(cranky_msg[rn2(3)]);
        return;
    }

    /* you desecrated the temple and now you want to chat? */
    const troom = in_rooms(priest.mx | 0, priest.my | 0, TEMPLE);
    if (priest.mpeaceful && troom && troom.length && !has_shrine(priest)) {
        SetVoice(priest, 0, 80, 0);
        await verbalize('Begone!  Thou desecratest this holy place with thy presence.');
        priest.mpeaceful = 0;
        return;
    }
    if (!money_cnt(g.invent)) {
        if (coaligned && !strayed) {
            const pmoney = money_cnt(priest.minvent);
            if (pmoney > 0) {
                const bits = _uprop_active('HALLUC') ? currency(pmoney)
                           : (pmoney === 1) ? 'bit' : 'bits';
                await pline(`${Monnam(priest)} gives you ${pmoney === 1 ? 'one ' : 'two '}${bits} for an ale.`);
                await _money2u_priest(priest, pmoney > 1 ? 2 : 1);
            } else
                await pline(`${Monnam(priest)} preaches the virtues of poverty.`);
            exercise(A_WIS, true);
        } else
            await pline(`${Monnam(priest)} is not interested.`);
        return;
    } else {
        /* randomized donation base; more gold on hand raises it */
        const cheapskate = (epri ? (epri.cheapskate_count | 0) : 0);
        const suggested = ((u.ulevelpeak | 0) ? (u.ulevelpeak | 0) : 1)
                          * rn1(101, 150 + cheapskate * 40);
        let quan = Math.trunc(money_cnt(g.invent) / (suggested * 3));
        if (quan < 1)
            quan = 1;
        const buf = `How much will you offer (suggested: ${suggested * quan} or ${suggested * quan * 2})?`;
        if (g.flags && g.flags.debug)
            await pline(`${Monnam(priest)} asks you for a contribution for the temple (base ${suggested}).`);
        else
            await pline(`${Monnam(priest)} asks you for a contribution for the temple.`);
        let offer = await _bribe(priest, buf);
        if (offer === 0) {
            SetVoice(priest, 0, 80, 0);
            await verbalize('Thou shalt regret thine action!');
            if (coaligned)
                adjalign(-1);
            if (epri) epri.cheapskate_count = (epri.cheapskate_count | 0) + 1;
        } else if (offer < suggested * quan) {
            if (money_cnt(g.invent) > offer * 2) {
                SetVoice(priest, 0, 80, 0);
                await verbalize('Cheapskate.');
                if (epri) epri.cheapskate_count = (epri.cheapskate_count | 0) + 1;
            } else {
                SetVoice(priest, 0, 80, 0);
                await verbalize('I thank thee for thy contribution.');
                /* give player some token */
                exercise(A_WIS, true);
            }
        } else if (offer < suggested * quan * 2) {
            SetVoice(priest, 0, 80, 0);
            await verbalize('Thou art indeed a pious individual.');
            if (money_cnt(g.invent) < offer * 2) {
                if (coaligned && (u.ualign.record | 0) <= ALGN_SINNED)
                    adjalign(1);
            }
            await verbalize('I bestow upon thee a blessing.');
            const amt = Math.trunc(500 * offer / suggested);
            incr_itimeout_prop(u.uprops[CLAIRVOYANT], rn1(amt, amt));
        } else if (offer < suggested * quan * 3) {
            let orig_ublessed = u.ublessed | 0;
            const prot = u.uprops[PROTECTION];
            /* u.ublessed is only active when Protection is enabled via
               something other than worn gear */
            if (!((prot.intrinsic | 0) & INTRINSIC)) {
                prot.intrinsic = (prot.intrinsic | 0) | FROMOUTSIDE;
                orig_ublessed = -1; /* force "rewarded" message */
            }
            for (; offer >= (2 * suggested); offer -= (2 * suggested)) {
                if (!(u.ublessed | 0))
                    u.ublessed = rn1(3, 2);
                else if ((u.ublessed | 0) < 20
                         && ((u.ublessed | 0) < 9 || !rn2(u.ublessed | 0)))
                    u.ublessed = (u.ublessed | 0) + 1;
            }
            SetVoice(priest, 0, 80, 0);
            if ((u.ublessed | 0) > orig_ublessed)
                await verbalize('Thou hast been rewarded for thy devotion.');
            else
                await verbalize('Thy selfless generosity is deeply appreciated.');
        } else {
            SetVoice(priest, 0, 80, 0);
            await verbalize('Thy selfless generosity is deeply appreciated.');
            if (money_cnt(g.invent) < offer * 2 && coaligned) {
                if (strayed && ((g.moves | 0) - (u.ucleansed | 0)) > 5000) {
                    u.ualign.record = 0; /* cleanse thee */
                    u.ucleansed = g.moves | 0;
                } else {
                    adjalign(2);
                }
            }
        }
    }
}
