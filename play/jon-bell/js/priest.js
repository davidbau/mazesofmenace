// priest.js — NetHack 3.7 priest behavior
// Ported from nethack-c/src/priest.c

import { game } from './gstate.js';
import { EPRI, EMIN, TEMPLE, NOTONL, ALLOW_M, ALLOW_ROCK, IS_ROOM, ROOMOFFSET,
         ARTICLE_NONE, ARTICLE_THE, ARTICLE_A, ARTICLE_YOUR,
         A_NONE, A_LAWFUL, A_CHAOTIC, A_NEUTRAL, Is_astralevel,
         INVIS, CONFLICT, DISPLACED,
         N_DIRS, xdir, ydir, MM_EPRI, MM_EMIN, MM_ADJACENTOK, MM_NOMSG,
         W_ARMC, ALL_TRAPS, RLOC_NOMSG,
         AM_SHRINE, Amask2align, IS_ALTAR, HALLUC, HALLUC_RES,
         } from './const.js';
import { PM_DEATH, PM_FAMINE, PM_PESTILENCE, PM_PRIEST, PM_HIGH_PRIEST } from './pm.generated.js';
import { newmextra } from './makemon.js';
/* newemin's C home is minion.c:17; js/sit.js carries that file's ports. */
import { newemin } from './sit.js';
import { rn2, rn1 } from './rng.js';
import { dist2 } from './hacklib.js';
import { _allow_rock_mv, _can_open_mv, _passes_bars_mv, m_break_boulder_mv, m_move_aggress } from './monmove.js';
import { online2, mfndpos, monnear, makemon, mpickobj, mkobj, mksobj, mongone } from './mklev.js';
import { pm_good_location } from './sp_lev.js';
import { set_malign, which_armor } from './makemon.js';
import { mon_learns_traps } from './trap.js';
import { rloc } from './teleport.js';
import { mongets } from './m_initweap.js';
import { newsym } from './display.js';
import { m_at } from './uhitm.js';
import { mon_pmname, rndmonnam_ex as dn_rndmonnam_ex,
         bogon_is_pname as dn_bogon_is_pname } from './do_name.js';
import { just_an } from './objnam.js';
import { halu_gname } from './cmd.js';
import { in_rooms } from './shk.js';

function _hero_invis_priest(u) {
    if (!u) return false;
    const p = u.uprops?.[INVIS];
    const intrinsic = (p?.intrinsic | 0) || (u.HInvis | 0);
    const extrinsic = p?.extrinsic | 0;
    const blocked = p?.blocked | 0;
    return !!((intrinsic || extrinsic) && !blocked);
}
/* Your — C pline.c:380-388.  js/vault.js:481 is a throw-stub; the real body
 * (pline with a "Your " prefix and C-shaped printf formatting) is
 * js/do_wear.js.  pri_move():422 was a guaranteed session kill on reach.
 * Found by: node tools/js-binding-audit.mjs --stub-resolve */
import { Your } from './do_wear.js';
import { mon_nam } from './uhitm.js';
import { mattacku } from './mhitu.js';
import { resist_conflict } from './mhitm.js';

/**
 * newepri — allocate and init epri (priest extended data)
 * C source: nethack-c/src/priest.c:15
 */
export function newepri(mtmp) {
    if (!mtmp.mextra)
        mtmp.mextra = newmextra();
    if (!EPRI(mtmp)) {
        mtmp.mextra.epri = {};
        mtmp.mextra.epri.parentmid = mtmp.m_id;
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

        // Check is_minion: (data->mflags2 & M2_MINION) != 0
        const M2_MINION = 0x00001000;
        if ((data.mflags2 & M2_MINION) !== 0) {
            return false;
        }

        // Check is_rider: data == mons[PM_DEATH] || mons[PM_FAMINE] || mons[PM_PESTILENCE]
        const mndx = mon.data_mndx | 0;
        if (mndx === PM_DEATH || mndx === PM_FAMINE || mndx === PM_PESTILENCE) {
            return false;
        }

        // Override x, y with mon's position
        x = mon.mx;
        y = mon.my;
    }

    // Check alignment record: u.ualign.record <= ALGN_SINNED (-4)
    const ALGN_SINNED = -4;
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

/* C ref: priest.c:207-212 p_coaligned(priest) —
 *   return (u.ualign.type == (Amask2align(EPRI(priest)->shralign & ~AM_SHRINE)))
 * Exported: js/mklev.js's setmangry (mon.c:4299) reads it for an angered
 * priest and had NO binding for it in scope. */
export function p_coaligned(priest) {
    return game.u.ualign.type
        === Amask2align((EPRI(priest).shralign | 0) & ~AM_SHRINE);
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
                uncurse(otmp);
            else
                curse(otmp);
        }
    }
}

/* C ref: mkobj.c:1822-1836 uncurse / 1783-1815 curse, reduced to the fields
 * this call site can reach: the priest's cloak is never a coin, never lamplit,
 * never carried by the hero, and never a bag of holding, so every conditional
 * tail (arti_light_radius / set_moreluck / weight / uwep weld) is unreachable. */
function uncurse(otmp) { otmp.cursed = 0; }
function curse(otmp) { otmp.blessed = 0; otmp.cursed = 1; }

/* C ref: hack.c:3497-3559 in_rooms(x, y, typewanted).  The file-local throwing
 * stub that used to sit here SHADOWED a real port: js/shk.js already carries the
 * full body (its own callers, and js/monmove.js, have consumed it for a while),
 * returning the same room numbers in C's order as an array.  in_your_sanctuary()
 * above was already written against that array form (`rooms_at_pos[0]`), so the
 * stub was the only thing standing between it and a working lookup. */

/*
 * move_special — movement for priests and shopkeepers.  Called from shk_move()
 * (shk.js) and pri_move().  C source: nethack-c/src/priest.c:41-139.
 * Valid returns: 1 moved, 0 didn't, -1 let m_move do it, -2 died.
 *
 * RNG: the pick_move loop fires rn2(++chcnt) for each candidate square that
 * passes the IS_ROOM/isshk guard (and the avoid+NOTONL skip) when appr==0 (the
 * shopkeeper-wandering / satdoor path).  This is the seed0116 first-divergence
 * at leaf 6303 (turn 18): the shopkeeper at home in his shop, satdoor → appr=0,
 * mfndpos cnt=4 of which 3 are IS_ROOM squares (the 4th is non-room and the shk
 * is in_his_shop so the isshk-OR clause is false) → rn2(1),rn2(2),rn2(3).
 *
 * mfndpos: C calls mfndpos(mtmp, &mfp, mon_allowflags(mtmp)).  For a peaceful
 * shopkeeper mon_allowflags = ALLOW_SANCT|ALLOW_SSM|ALLOW_ROCK(+OPENDOOR/
 * UNLOCKDOOR) — NOT ALLOW_U.  The shared mfndpos_nontame() (monmove.js) already
 * folds in OPENDOOR/UNLOCKDOOR and the mconf ALLOW_ALL handling, so we pass just
 * the ALLOW_ROCK bit (shopkeepers can break boulders → m_can_break_boulder).
 *
 * NOTONL: mfndpos_nontame() does NOT mark the NOTONL bit (mon.c:2327-2330: a
 * candidate that the monster sees AND that is online2 with the perceived hero
 * gets info|=NOTONL).  We recompute it here from monseeu && online2(nx,ny,
 * mux,muy) so the avoid-skip at C priest.c:83 fires identically.
 */
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
    /* C priest.c:65-66: allowflags = mon_allowflags(mtmp); cnt = mfndpos(...).
     * The peaceful-shk flags that influence the candidate set reduce to
     * ALLOW_ROCK (boulder squares) here; ALLOW_SANCT/ALLOW_SSM gate sanctuary/
     * sees-self-magic squares which the real mfndpos's in_rooms() stub
     * conservatively does not reject in the common dungeon case (same
     * simplification m_move/dog_move use). WIRING: real mfndpos (js/mklev.js)
     * replaces mfndpos_nontame (movemon integration spec §priest-site);
     * _can_open_mv/_passes_bars_mv added for the same reason site-2
     * validation required them (mon_allowflags's OPENDOOR/ALLOW_BARS bits
     * are computed unconditionally in C, not just for the tame/hostile
     * branches this packet's allowflags literal covers). */
    const allowflags = _allow_rock_mv(mtmp) | _can_open_mv(mtmp) | _passes_bars_mv(mtmp);
    const mfp = { cnt: 0, poss: [], info: [] };
    const real_cnt = mfndpos(mtmp, mfp, allowflags);
    const poss = [];
    for (let i = 0; i < real_cnt; i++)
        poss.push({ x: mfp.poss[i].x, y: mfp.poss[i].y, info: mfp.info[i] | 0 });
    const cnt = poss.length;

    /* C priest.c:249-250 monseeu = mcansee && (!Invis || perceives(mdat)).
     * Invis: hero invisible to this mon; perceives requires M1_SEE_INVIS.  The
     * shk corpus path has mcansee=1 and a visible hero → monseeu true. */
    const u = game.u;
    const Invis = _hero_invis_priest(u);
    const perceives_data = !!((mtmp.data.mflags1 || 0) & 0x01000000 /* M1_SEE_INVIS */);
    const monseeu = !!(mtmp.mcansee | 0) && (!Invis || perceives_data);
    const mux = (mtmp.mux !== undefined ? mtmp.mux : (u?.ux ?? 0)) | 0;
    const muy = (mtmp.muy !== undefined ? mtmp.muy : (u?.uy ?? 0)) | 0;
    /* per-candidate NOTONL bit (mon.c:2327-2330), folded into a local info[]. */
    const info = new Array(cnt);
    for (let i = 0; i < cnt; i++) {
        let inf = poss[i].info | 0;
        if (monseeu && online2(poss[i].x, poss[i].y, mux, muy))
            inf |= NOTONL;
        info[i] = inf;
    }

    /* C priest.c:68-73: isshk && avoid && uondoor — if no candidate avoids the
     * hero's line we cannot avoid him, so drop avoid.  (uondoor is false on the
     * seed0116 path so this whole block is skipped.) */
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
            /* C priest.c:108-118: m_move_aggress(mtmp,nix,niy). */
            const status = await m_move_aggress(mtmp, nix, niy);
            return status === -2 ? -2 : 1;
        }

        /* C priest.c:120-121: if (MON_AT(nix,niy) || u_at(nix,niy)) return 0; */
        if (m_at(nix, niy) || (u && (u.ux | 0) === nix && (u.uy | 0) === niy))
            return 0;
        /* C priest.c:122-124: remove_monster(omx,omy); place_monster(mtmp,nix,
         * niy); newsym(nix,niy).  JS idiom (matches dog_move/m_move): update
         * mx/my + newsym old & new cell. */
        mtmp.mx = nix;
        mtmp.my = niy;
        newsym(omx, omy);
        newsym(nix, niy);
        /* C priest.c:125-126: isshk && !in_his_shop && inhishop(mtmp) →
         * check_special_room(FALSE).  inhishop re-check + room re-entry effect
         * not ported; no corpus shk re-enters its shop mid-move.  TODO. */
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
 * C: mon.c (m_canseeu).  Inlined from the pattern in move_special. */
function m_canseeu(mtmp) {
    const u = game.u;
    const Invis = _hero_invis_priest(u);
    const perceives = !!((mtmp.data.mflags1 || 0) & 0x01000000 /* M1_SEE_INVIS */);
    return !!(mtmp.mcansee | 0) && (!Invis || perceives)
           && online2(mtmp.mx, mtmp.my, (u?.ux ?? 0) | 0, (u?.uy ?? 0) | 0);
}

/*
 * pri_move — priest monster movement AI.
 * C source: nethack-c/src/priest.c:176-217.  Called from C monmove.c:1833
 * (dochug's shk/gd/priest dispatch); the JS mirror at js/monmove.js:1041 still
 * returns MMOVE_NOTHING for `mtmp.ispriest` instead of calling this body.
 *
 * DO NOT WIRE THAT CALL SITE YET (measured 2026-08-09, dead-port-census row
 * "pri_move UNWIRED/HIGH, 2 sessions / 82 C calls").  Two independent reasons:
 *
 *  1. It would be INERT.  Nothing in js/ ever assigns `ispriest = 1`.  C's only
 *     producers of priests are priestini() (mkroom.c:617 via mktemple(), and
 *     sp_lev.c create_altar()'s shrine/sanctum path); mktemple() is a documented
 *     KNOWN GAP in js/mklev.js do_mkroom(), and the sp_lev path is
 *     js/sp_lev.js:3867 `throw new Error('UNPORTED-CALLEE: create_altar
 *     shrine/sanctum path (priestini)')` — and zero corpus sessions throw, which
 *     proves it is never reached.  The only other epri producer, newepri() at
 *     js/mklev.js:1997, is inside copy_mextra() and needs a source priest.
 *
 *  2. It would be UNSAFE the moment reason 1 stops holding: histemple_at()
 *     above is a stub that answers TRUE for every priest, so pri_move() would
 *     draw rn1(3,-1) twice (priest.c:194-195) on turns where C returns -1 with
 *     no RNG at all.  Port histemple_at()'s in_rooms()/on_level() conjuncts
 *     first, then wire.
 *
 * The corpus ground truth is that C really does run this: 82 attributed calls
 * across seed0363-caveman-quest-actions and seed0800-wiz-grand-tour, all of the
 * shape `rn2(3)=N @ pri_move(priest.c:194)` / `(priest.c:195)`.  The blocker is
 * mktemple()/priestini(), not this wire.
 */
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
            /* mattacku() is async since the AT_BREA port, and pri_move sits
             * inside the SYNCHRONOUS m_move chain.  Safe: the only awaited
             * arm in mattacku is `case AT_BREA`, and no priest form has an
             * AT_BREA row in mattk[] — so the body runs to completion
             * synchronously here and the returned promise is already settled.
             * If a breathing monster ever reaches this call, m_move (and its
             * dogmove/monmove callers) must become async first. */
            void mattacku(priest);
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

/*
 * priestname — build the display name for a priest/minion into caller buffer
 * pname and return it.  C source: nethack-c/src/priest.c:301-367.  The C
 * function writes into a caller-supplied char buffer and returns that pointer;
 * the JS port accumulates the same string and returns it (the sweep records
 * the return as an opaque pointer identity, so parity rests on not diverging
 * state, which this fn never mutates).
 */
export function priestname(mon, article, reveal_high_priest, pname) {
    const hp = game.u?.uprops || {};
    const do_hallu = !!(((hp[HALLUC]?.intrinsic | 0) || (hp[HALLUC]?.extrinsic | 0))
              && !((hp[HALLUC_RES]?.intrinsic | 0) || (hp[HALLUC_RES]?.extrinsic | 0)));
    const aligned_priest = (mon.data_mndx | 0) === PM_PRIEST;      /* PM_ALIGNED_CLERIC */
    const high_priest = (mon.data_mndx | 0) === PM_HIGH_PRIEST;    /* PM_HIGH_CLERIC */
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

/* C do_name.c:1389 rndmonnam(char *code) / :1415 bogon_is_pname(char code) —
 * both now live in js/do_name.js, C's own home for them, on the DISPLAY rng.
 * These were `throw new Error('not yet ported: ...')`, and rndmonnam HALTED
 * seed0399-wizard-hallu-actions at frame 426/532 through mon_nam -> x_monnam.
 *
 * `code` is C's out-parameter (`char *`); js/mhitm.js:468 already established
 * the convention of passing a scratch object and reading `.code` off it, so
 * these wrappers fill that object and return the name. */
export function rndmonnam(code) {
    const r = dn_rndmonnam_ex();
    if (code && typeof code === 'object')
        code.code = r.code;
    return r.name;
}
export function bogon_is_pname(code) { return dn_bogon_is_pname(code); }
/* C ref: dungeon.c:1050-1054 on_level(a, b) — same dungeon AND same depth. */
export function on_level(a, b) {
    return !!(a && b && a.dnum === b.dnum && a.dlevel === b.dlevel);
}
/* mongone's real body is js/mklev.js (C home mon.c:3253), beside makemon and
 * newcham, the other mon.c functions this port hosts there.  This file carried
 * a `throw new Error('not yet ported')` stub of the same name, which SHADOWED
 * it for clearpriests() above and which tools/equiv-test/auto-replay-sweep
 * resolves to (CRITICAL, resolved_is_stub, 131 records).  Re-exported so there
 * is one implementation.  js/shk.js:2401 and js/vault.js:537 still declare the
 * same stub name for their own callers; collapsing those two needs their own
 * measurement. */
export { mongone } from './mklev.js';
