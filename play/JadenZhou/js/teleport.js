// teleport.js — finding spots for monsters near a location.
// C ref: teleport.c — enexto, enexto_gpflags, enexto_core (NEW_ENEXTO),
// collect_coords; mon.c mnexto (via rloc_to_flag).
//
// Not ported yet: teleds, safe_teleds, tele, rloc and the rest of
// teleport.c.

import { game } from './gstate.js';
import { rn2, rnl } from './rng.js';
import { pline } from './display.js';
import { tty_getlin } from './wintty.js';
import { In_endgame, In_quest, In_mines, TELEPORT_CONTROL, STUNNED, CONFUSION } from './const.js';
import { dunlevs_in_dungeon, In_hell, depth, get_level, on_level,
         print_dungeon } from './dungeon.js';
import { schedule_goto, UTOTYPE_NONE } from './do.js';
import {
    COLNO, ROWNO, ZAP_POS, isok, GP_ALLOW_XY, GP_CHECKSCARY, NO_MM_FLAGS,
    CC_NO_FLAGS, CC_INCL_CENTER, CC_UNSHUFFLED, CC_RING_PAIRS, CC_SKIP_MONS,
    CC_SKIP_INACCS, RLOC_NOMSG,
} from './const.js';
import { mons, M2_LORD, M2_PRINCE, M2_DEMON, M3_COVETOUS, PM_DEATH,
         PM_PESTILENCE, PM_FAMINE, S_MIMIC } from './monsters.js';
import { set_mon_data, passes_walls, control_teleport } from './mondata.js';
import { goodpos, m_at, place_monster, is_pool, is_lava, sobj_at } from './makemon.js';
import { rnd, rn1 } from './rng.js';
import { newsym, canseemon, canspotmon, sensemon, see_monsters } from './display.js';
import { couldsee, vision_recalc } from './vision.js';
import { u_on_newpos } from './mklev.js';
import { nomul, spoteffects, switch_terrain } from './hack.js';
import { VIBRATING_SQUARE, deltrap } from './trap.js';
import { PASSES_WALLS, ANTIMAGIC } from './const.js';
import { M1_FLY } from './monsters.js';
import { resists_magm } from './mondata.js';
import { settrack } from './track.js';
import { set_ustuck } from './uhitm.js';
import { Monnam, mon_nam, Amonnam } from './do_name.js';
import { maybe_unhide_at } from './mon.js';
import { set_apparxy, mon_track_clear, dochugw, onscary } from './monmove.js';
import { mintrap, seetrap, t_at, is_hole, is_pit, HOLE, TRAPDOOR, TELEP_TRAP,
         LEVEL_TELEP, MAGIC_PORTAL, NO_TRAP, Trap_Effect_Finished,
         clamp_hole_destination } from './trap.js';
import { within_bounded_area } from './rect.js';
import { obj_extract_self, place_object } from './mkobj.js';
import { flooreffects } from './do.js';
import { dist2 } from './hacklib.js';
import { CORPSE, AMULET_OF_YENDOR, BOULDER } from './objects.js';
import { STRAT_APPEARMSG, RLOC_MSG, RLOC_NONE, NO_TRAP_FLAGS, BLINDED,
         BOLT_LIM } from './const.js';
import { ROOMOFFSET, VAULT, POOL, MOAT, WATER, LAVAPOOL, LAVAWALL,
         TT_BURIEDBALL, LEVITATION, FLYING, TELEDS_TELEPORT } from './const.js';
import { ECMD_OK, ECMD_TIME, TELEPORT, A_STR } from './const.js';
import { You } from './display.js';
import { getpos } from './getpos.js';
import { u_locomotion } from './trap.js';
import { can_teleport } from './mondata.js';
import { known_spell, spe_Fresh, spe_Unknown } from './spell.js';
import { objects, SPE_TELEPORT_AWAY } from './objects.js';
import { PM_WIZARD } from './monsters.js';
import { ACURR } from './attrib.js';
import { check_capacity } from './hack.js';
import { morehungry } from './eat.js';

/* C ref: mondata.h is_rider() */
function is_rider(ptr) {
    return ptr === mons[PM_DEATH] || ptr === mons[PM_FAMINE]
           || ptr === mons[PM_PESTILENCE];
}

// C ref: teleport.c enexto()
/*
 * Attempt to find a good place for the given monster type in the closest
 * position to (xx,yy).  Do so in successive square rings around (xx,yy).
 * If there is more than one valid position in the ring, choose one randomly.
 * Return TRUE and the position chosen when successful, FALSE otherwise.
 */
export function enexto(cc, xx, yy, mdat) {
    return (enexto_core(cc, xx, yy, mdat, GP_CHECKSCARY)
            || enexto_core(cc, xx, yy, mdat, NO_MM_FLAGS));
}

// C ref: teleport.c enexto_gpflags()
export function enexto_gpflags(cc, xx, yy, mdat, entflags) {
    return (enexto_core(cc, xx, yy, mdat, GP_CHECKSCARY | entflags)
            || enexto_core(cc, xx, yy, mdat, entflags));
}

// C ref: teleport.c enexto_core() [NEW_ENEXTO]
export function enexto_core(cc, /* output; <cc.x,cc.y> as close as feasible
                                 * to <xx,yy> */
                            xx, yy, /* input coordinates */
                            mdat,   /* type of monster; affects whether water
                                     * or lava or boulder spots will be
                                     * considered */
                            entflags) /* flags for goodpos() */ {
    const candy = []; /* enough room for every location */
    let i, nearcandyct, allcandyct;
    const allow_xx_yy = ((entflags & GP_ALLOW_XY) !== 0);
    /* note: GP_ALLOW_XY isn't used by goodpos(); old enext_core() used to
       mask it off to hide it from goodpos but that isn't required and we
       want to keep it in case the debugpline4() gets called */

    if (!mdat) {
        /* default to player's original monster type */
        mdat = mons[game.u.umonster];
    }
    const fakemon = { data: null, m_id: 0, wormno: 0 }; /* cg.zeromonst */
    set_mon_data(fakemon, mdat); /* set up for goodpos() */

    /* gather candidate coordinates within 3 steps, those 1 step away in
       random order first, then those 2 steps away in random order, then 3;
       this will usually find a good spot without scanning the whole map */
    nearcandyct = collect_coords(candy, xx, yy, 3, CC_NO_FLAGS, null);
    for (i = 0; i < nearcandyct; ++i) {
        cc.x = candy[i].x, cc.y = candy[i].y;
        if (goodpos(cc.x, cc.y, fakemon, entflags))
            return true;
    }

    /* didn't find a spot; gather coordinates for the whole map except
       for <xx,yy> itself, ordered in expanding distance from <xx,yy>
       (subsets of equal distance grouped together with order randomized) */
    candy.length = 0;
    allcandyct = collect_coords(candy, xx, yy, 0, CC_NO_FLAGS, null);
    /* skip first 'nearcandyct' spots, they have already been rejected;
       they will occur in different random order but same overall total */
    for (i = nearcandyct; i < allcandyct; ++i) {
        cc.x = candy[i].x, cc.y = candy[i].y;
        if (goodpos(cc.x, cc.y, fakemon, entflags))
            return true;
    }

    /* still didn't find a spot; maybe try <xx,yy> itself */
    cc.x = xx, cc.y = yy; /* final value for 'cc' in case we return False */
    if (allow_xx_yy && goodpos(cc.x, cc.y, fakemon, entflags))
        return true;

    /* failed to find any acceptable spot */
    return false;
}

// C ref: teleport.c collect_coords()
/* make a list of coordinates in expanding distance from <cx,cy>;
   return value is number of coordinates inserted into ccc[]  */
export function collect_coords(
    ccc,       /* array to fill (C: at least size ROWNO*(COLNO-1)) */
    cx, cy,    /* center point, not necessarily <u.ux,u.uy> */
    maxradius, /* how far from center to go collecting spots;
                * 0 means collect entire map */
    cc_flags,  /* incl_center: put <cx,cy> in output list
                * (provided that it passes filter, if any);
                * unshuffled: keep output in collection order;
                * ring_pairs: shuffle pairs of rings together
                * instead of keeping each ring distinct;
                * skip_mons: reject occupied spots;
                * skip_inaccs: reject !ZAP_POS() spots */
    filter)    /* if Null, no filtering */ {
    let x, y, lox, hix, loy, hiy;
    let radius, rowrange, colrange, k, n = 0;
    let cc, passcc = -1; /* index into ccc[] (C: pointer) */
    let newpass, passend;
    const /* is <cx,cy> a candidate? */
          include_cxcy = (cc_flags & CC_INCL_CENTER) !== 0,
          /* flag is negative; turn local variable into positive */
          scramble = (cc_flags & CC_UNSHUFFLED) === 0,
          /* if scrambling, shuffle rings 1+2, 3+4, &c together */
          ring_pairs = (scramble && (cc_flags & CC_RING_PAIRS) !== 0),
          /* exclude locations containing monsters from output */
          skip_mons = (cc_flags & CC_SKIP_MONS) !== 0,
          /* exclude !ZAP_POS() locations from output; allows pools+lava */
          skip_inaccessible = (cc_flags & CC_SKIP_INACCS) !== 0;
    let result = 0;

    rowrange = (cy < Math.trunc(ROWNO / 2)) ? (ROWNO - 1 - cy) : cy;
    colrange = (cx < Math.trunc(COLNO / 2)) ? (COLNO - 1 - cx) : cx;
    k = Math.max(rowrange, colrange);
    /* if no radius limit has been specified, cover the whole map */
    if (!maxradius)
        maxradius = k;
    else
        maxradius = Math.min(maxradius, k);

    for (radius = include_cxcy ? 0 : 1; radius <= maxradius; ++radius) {
        if (!ring_pairs) {
            newpass = passend = true;
        } else {
            /* 0 (if include_cxcy) and maxradius override odd/even */
            newpass = ((radius % 2) !== 0 || radius === 0); /* odd */
            passend = ((radius % 2) === 0 || radius === maxradius); /* even */
        }
        if (newpass || passcc < 0) {
            passcc = ccc.length; /* start of output entries for current
                                  * radius (or first half of radius pair
                                  * depending on flags) */
            n = 0; /* number of entries for passcc; used for shuffling */
        }
        lox = cx - radius, hix = cx + radius;
        loy = cy - radius, hiy = cy + radius;
        for (y = Math.max(loy, 0); y <= hiy; ++y) {
            if (y > ROWNO - 1)
                break; /* done with collection for current radius */
            for (x = Math.max(lox, 1); x <= hix; ++x) { /* column 0 is not
                                                         * used */
                if (x > COLNO - 1)
                    break; /* advance to next 'y' */
                if (x !== lox && x !== hix && y !== loy && y !== hiy)
                    continue; /* not any edge of ring/square */
                if ((skip_mons && m_at(x, y))
                    /* note: !ACCESSIBLE() would reject water and lava;
                       !ZAP_POS() accepts them; caller needs to handle such */
                    || (skip_inaccessible && !ZAP_POS(game.level.at(x, y).typ)))
                    continue; /* quick filters */
                if (filter && !filter(x, y))
                    continue;
                ccc.push({ x, y });
                ++n;
                ++result;
            }
        }
        if (scramble && passend) {
            /* shuffle entries gathered for current radius (or pair) */
            while (n > 1) {
                k = rn2(n); /* 0..n-1 */
                if (k) { /* swap [k] with [0] when k is 1..n-1 */
                    cc = ccc[passcc];
                    ccc[passcc] = ccc[passcc + k];
                    ccc[passcc + k] = cc;
                }
                ++passcc; /* passcc[0] has reached its final place    */
                --n;      /* and become exempt from further shuffling */
            }
        }
    } /* radius loop */
    return result;
}

// C ref: mon.c mnexto()
/* make monster mtmp next to you (if possible);
   might place monst on far side of a wall or boulder */
export async function mnexto(mtmp, rlocflags) {
    const mm = { x: 0, y: 0 };
    const u = game.u;

    if (mtmp === u.usteed) {
        /* Keep your steed in sync with you instead */
        mtmp.mx = u.ux;
        mtmp.my = u.uy;
        return;
    }

    if (!enexto(mm, u.ux, u.uy, mtmp.data) || !isok(mm.x, mm.y)) {
        /* deal_with_overcrowding(mtmp): not ported yet */
        return;
    }
    /* iflags.mon_telecontrol: wizard mode only, not ported */

    await rloc_to_flag(mtmp, mm.x, mm.y, rlocflags);
    return;
}

// C ref: teleport.c rloc_to()
export async function rloc_to(mtmp, x, y) {
    await rloc_to_core(mtmp, x, y, RLOC_NOMSG);
}

// C ref: teleport.c rloc_to_flag()
async function rloc_to_flag(mtmp, x, y, rlocflags) {
    await rloc_to_core(mtmp, x, y, rlocflags);
}

// C ref: teleport.c teleds() -- put the hero at <nux,nuy> on this level
export async function teleds(nux, nuy, teleds_flags) {
    const u = game.u;
    const is_teleport = (teleds_flags & TELEDS_TELEPORT) !== 0;

    /* vault_occupied(u.urooms) ? findgd() : 0 */
    if (u.urooms && in_rooms_vault(u.urooms))
        throw new Error('teleds(): vault guard not ported yet');
    if (u.utraptype === TT_BURIEDBALL || game.uball)
        throw new Error('teleds(): ball and chain not ported yet');
    /* ball_active = (Punished && uball->where != OBJ_FREE): no ball */
    /* reset_utrap(FALSE): set_utrap(0, 0) */
    u.utrap = 0;
    u.utraptype = 0;
    const was_swallowed = u.uswallow; /* set_ustuck(Null) clears uswallow */
    set_ustuck(null);
    u.ux0 = u.ux;
    u.uy0 = u.uy;

    /* !hideunder(&youmonst) && youmonst.data->mlet == S_MIMIC: mimics stop
       being unnoticed */
    if (game.youmonst.data.mlet === S_MIMIC)
        throw new Error('teleds(): hideunder() for a mimic hero not ported yet');

    if (was_swallowed)
        throw new Error('teleds(): leaving an engulfer not ported yet');

    /* must set u.ux, u.uy after drag_ball(), which may need to know
       the old position if allow_drag is true... */
    u_on_newpos(nux, nuy); /* set u.<x,y>, usteed-><mx,my>; cliparound() */
    /* fill_pit(u.ux0, u.uy0): a pit/hole with a boulder at the old spot */
    {
        const t = t_at(u.ux0, u.uy0);
        if (t && (is_pit(t.ttyp) || is_hole(t.ttyp)) && sobj_at(BOULDER, u.ux0, u.uy0))
            throw new Error('teleds(): fill_pit() not ported yet');
    }
    /* update_player_regions(): regions aren't ported yet */
    if (game.regions && game.regions.length)
        throw new Error('teleds(): update_player_regions() not ported yet');
    /*
     *  Make sure the hero disappears from the old location.  This will
     *  not happen if she is teleported within sight of her previous
     *  location.  Force a full vision recalculation because the hero
     *  is now in a new location.
     */
    newsym(u.ux0, u.uy0);
    see_monsters();
    game.vision_full_recalc = 1;
    nomul(0);
    /* notice_mon_off(): a11y mon_notices is off by default */
    vision_recalc(0); /* vision before effects */

    /* this used to take place sooner, but if a --More-- prompt was issued
       then the old map display was shown instead of the new one */
    if (is_teleport && game.flags.verbose !== false)
        await pline(`You materialize in ${(nux === u.ux0 && nuy === u.uy0)
                                          ? "the same" : "a different"} location!`);
    /* if terrain type changes, levitation or flying might become blocked
       or unblocked; might issue message, so do this after map+vision has
       been updated for new location instead of right after u_on_newpos() */
    if (game.level.at(u.ux, u.uy).typ !== game.level.at(u.ux0, u.uy0).typ)
        await switch_terrain();
    /* (vault guard: stopped above) */
    /* possible shop entry message comes after guard's shrill whistle */
    await spoteffects(true);
    /* invocation_message(): only on the vibrating square level */
    if (game.level.flags?.is_invocation_lev)
        throw new Error('teleds(): invocation_message() not ported yet');
    /* notice_mon_on(); notice_all_mons(TRUE): a11y mon_notices is off */
}

// C ref: teleport.c teleok()
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
                 && (tp_Levitation() || tp_Flying()))
            trapok = true;

        if (!trapok)
            return false;
    }
    if (!goodpos(x, y, game.youmonst, 0))
        return false;
    if (!tele_jump_ok(game.u.ux, game.u.uy, x, y))
        return false;
    /* in_out_region(x, y): regions aren't ported */
    if (game.regions && game.regions.length)
        throw new Error('teleok(): in_out_region() not ported yet');
    return true;
}

/* C ref: youprop.h Levitation, Flying, Teleport_control, Antimagic,
   Stunned, Blinded */
function tp_prop(p) {
    return game.u.uprops?.[p] || { intrinsic: 0, extrinsic: 0, blocked: 0 };
}
function tp_Levitation() {
    const p = tp_prop(LEVITATION);
    return !!((p.intrinsic || p.extrinsic) && !p.blocked);
}
function tp_Flying() {
    const p = tp_prop(FLYING);
    return !!((p.intrinsic || p.extrinsic
               || (game.u.usteed && (game.u.usteed.data.mflags1 & M1_FLY)))
              && !p.blocked);
}

// C ref: teleport.c safe_teleds()
/* [try to] teleport hero to a safe spot */
export async function safe_teleds(teleds_flags) {
    let nux, nuy;
    let cc_flags;
    const candy = [];
    const backupspot = { x: 0, y: 0 };
    let tcnt, candycount;

    /*
     * Now it tries completely randomly only 40 times, all disallowing
     * traps, then resorts to checking the entire map, near hero's spot
     * first then expanding out from there.  If no non-trap spot is found,
     * first trap spot is used.
     */
    for (tcnt = 0; tcnt < 40; ++tcnt) {
        nux = rnd(COLNO - 1);
        nuy = rn2(ROWNO);
        if (teleok(nux, nuy, false)) {
            await teleds(nux, nuy, teleds_flags);
            return true;
        }
    }

    /* get a shuffled list of candidate locations, starting with spots
       1 or 2 steps from hero, then 3 or 4 steps, then 5 or 6, on up */
    cc_flags = CC_RING_PAIRS | CC_SKIP_MONS;
    if (!tp_Passes_walls())
        cc_flags |= CC_SKIP_INACCS;
    candycount = collect_coords(candy, game.u.ux, game.u.uy, 0, cc_flags, null);
    backupspot.x = backupspot.y = 0;
    /* skip trap locations via teleok(,,FALSE) but remember first
       encountered trap spot that is acceptable to teleok(,,TRUE) */
    for (tcnt = 0; tcnt < candycount; ++tcnt) {
        nux = candy[tcnt].x, nuy = candy[tcnt].y;
        if (teleok(nux, nuy, false)) {
            await teleds(nux, nuy, teleds_flags);
            return true;
        }
        if (!backupspot.x && t_at(nux, nuy) && teleok(nux, nuy, true))
            backupspot.x = nux, backupspot.y = nuy;
    }
    /* no non-trap spot found; if we skipped a viable trap spot, use it */
    if (backupspot.x) {
        await teleds(backupspot.x, backupspot.y, teleds_flags);
        return true;
    }
    return false;
}
function tp_Passes_walls() {
    const p = tp_prop(PASSES_WALLS);
    return !!(p.intrinsic || p.extrinsic);
}

// C ref: teleport.c vault_tele()
async function vault_tele() {
    const croom = search_special_vault();
    const c = { x: 0, y: 0 };

    if (croom)
        throw new Error('vault_tele(): somexyspace() into a vault not ported yet');
    void c;
    await tele();
}

/* C ref: mkroom.c search_special(VAULT) -- the main rooms[] list; JS
   doesn't keep subrooms in a global list */
function search_special_vault() {
    const rooms = game.level.rooms || [];
    for (let i = 0; rooms[i] && rooms[i].hx >= 0; i++)
        if (rooms[i].rtype === VAULT)
            return rooms[i];
    return null;
}

// C ref: teleport.c tele()
/* teleport the hero via some method other than scroll of teleport */
export async function tele() {
    await scrolltele(null);
}

// C ref: teleport.c scrolltele()
/* teleport the hero; usually discover scroll of teleportation if via
   scroll */
export async function scrolltele(scroll) {
    const u = game.u;

    /* Disable teleportation in stronghold && Vlad's Tower */
    if (noteleport_level(game.youmonst) && !game.flags?.debug) {
        await pline("A mysterious force prevents you from teleporting!");
        if (scroll)
            throw new Error('scrolltele(): learnscroll() not ported yet');
        return;
    }

    /* don't show trap if "Sorry..." */
    /* if (!Blinded) make_blinded(0L, FALSE): with Blinded already 0 this
       changes nothing (no timeout to clear, no blindness toggle) */
    if (tp_prop(BLINDED).intrinsic)
        throw new Error('scrolltele(): make_blinded() not ported yet');

    if ((u.uhave?.amulet || On_W_tower_level(u.uz)) && !rn2(3))
        throw new Error('scrolltele(): "You feel disoriented for a moment." not ported yet');
    if (((tp_prop(TELEPORT_CONTROL).intrinsic || tp_prop(TELEPORT_CONTROL).extrinsic
          || (scroll && scroll.blessed)) && !tp_prop(STUNNED).intrinsic
         && !tp_prop(STUNNED).extrinsic)
        || game.flags?.debug) {
        if (unconscious()) {
            await pline("Being unconscious, you cannot control your teleport.");
        } else {
            let whobuf = "you";
            if (u.usteed)
                whobuf += ` and ${mon_nam(u.usteed)}`;
            await pline(`Where do ${whobuf} want to be teleported?`);
            if (scroll)
                throw new Error('scrolltele(): learnscroll() not ported yet');
            let cc = { x: u.ux, y: u.uy };
            const iflags = game.iflags;
            if (!iflags.travelcc)
                iflags.travelcc = { x: 0, y: 0 };
            if (isok(iflags.travelcc.x, iflags.travelcc.y)) {
                /* The player showed some interest in traveling here;
                 * pre-suggest this coordinate. */
                cc = { x: iflags.travelcc.x, y: iflags.travelcc.y };
            }
            if ((await getpos(cc, true, "the desired position")) < 0)
                return; /* abort */
            /* possible extensions: introduce a small error if
               magic power is low; allow transfer to solid rock */
            if (teleok(cc.x, cc.y, false)) {
                /* for scroll, discover it regardless of destination */
                await teleds(cc.x, cc.y, TELEDS_TELEPORT);
                if (u.ux === iflags.travelcc.x && u.uy === iflags.travelcc.y)
                    iflags.travelcc.x = iflags.travelcc.y = 0;
                return;
            }
            await pline("Sorry...");
        }
    }

    /* we used to suppress discovery if hero teleported to a nearby
       spot which was already within view, but now there is always a
       "materialize" message regardless of how far you teleported so
       discovery of scroll type is unconditional */
    if (scroll)
        throw new Error('scrolltele(): learnscroll() not ported yet');

    await safe_teleds(TELEDS_TELEPORT);
}

// C ref: hack.c unconscious()
function unconscious() {
    const g = game;
    if (g.multi >= 0)
        return false;

    return !!(g.u.usleep
              || (g.nomovemsg
                  && (g.nomovemsg.startsWith("You awake")
                      || g.nomovemsg.startsWith("You regain con")
                      || g.nomovemsg.startsWith("You are consci"))));
}

// C ref: teleport.c dotelecmd() -- the #teleport command; 'm ^T' ==
// choose among several teleport modes
export async function dotelecmd() {
    const u = game.u;
    let ignore_restrictions = false;

    /* normal mode; ignore 'm' prefix if it was given */
    if (!game.flags?.debug)
        return (await dotele(false)) ? ECMD_TIME : ECMD_OK;

    const tele = tp_prop(TELEPORT);
    const save_HTele = tele.intrinsic, save_ETele = tele.extrinsic;
    if (!game.iflags.menu_requested) {
        ignore_restrictions = true;
    } else {
        /* the 'm ^T' teleport-mode menu and tport_spell() aren't ported */
        throw new Error('dotelecmd(): the m ^T teleport mode menu not ported yet');
    }

    /* if dotele() can be fatal, final disclosure might lie about
       intrinsic teleportation; we should be able to live with that
       since the menu finagling is only applicable in wizard mode */
    const res = await dotele(ignore_restrictions);

    if (u.uprops[TELEPORT]) {
        u.uprops[TELEPORT].intrinsic = save_HTele;
        u.uprops[TELEPORT].extrinsic = save_ETele;
    }
    /* added != NOOP_SPELL || hidden != NOOP_SPELL: only via the menu */

    return res ? ECMD_TIME : ECMD_OK;
}

// C ref: teleport.c dotele()
async function dotele(break_the_rules) { /* True: wizard mode ^T */
    const u = game.u;
    let trap;
    let trap_once = false;

    trap = t_at(u.ux, u.uy);
    if (trap && !trap.tseen)
        trap = null;

    if (trap) {
        if (trap.ttyp === LEVEL_TELEP && trap.tseen) {
            throw new Error('dotele(): triggering a level teleporter not ported yet');
        } else if (trap.ttyp === TELEP_TRAP) {
            trap_once = !!trap.once; /* trap may get deleted, save this */
            if (trap.once)
                throw new Error('dotele(): vault teleporter not ported yet');
            if (trap)
                await You(`${u_locomotion("jump")} onto the teleportation trap.`);
        } else
            trap = null;
    }
    if (!trap && !break_the_rules) {
        let castit = false;
        let energy = 0;
        let cantdoit = null;
        const p = tp_prop(TELEPORT);
        const Teleportation = !!(p.intrinsic || p.extrinsic);

        if (!Teleportation || (u.ulevel < (game.urole.mnum === PM_WIZARD ? 8 : 12)
                               && !can_teleport(game.youmonst.data))) {
            /* Try to use teleport away spell. */
            const knownsp = known_spell(SPE_TELEPORT_AWAY);

            /* casting isn't inhibited by being Stunned (...it ought to be) */
            castit = (knownsp >= spe_Fresh
                      && !(tp_prop(CONFUSION).intrinsic || tp_prop(CONFUSION).extrinsic));
            if (!castit && !break_the_rules) {
                await You(`${(!Teleportation ? ((knownsp !== spe_Unknown)
                                                ? "can't cast that spell"
                                                : "don't know that spell")
                              : "are not able to teleport at will")}.`);
                return 0;
            }
        }

        /* 3.6.2: the magic numbers for hunger, strength, and energy
           have been changed to match the ones used in spelleffects(). */
        energy = 5 * objects[SPE_TELEPORT_AWAY].oc_level; /* spellev() */
        if (u.uhunger <= 10) {
            cantdoit = "are too weak from hunger";
        } else if (ACURR(A_STR) < 4) {
            cantdoit = "lack the strength";
        } else if (energy > u.uen) {
            cantdoit = "lack the energy";
        }
        if (cantdoit) {
            await You(`${cantdoit} ${castit ? "for a teleport spell" : "to teleport"}.`);
            return 0;
        } else if (await check_capacity(
                       "Your concentration falters from carrying so much.")) {
            return 1; /* this failure in spelleffects() also uses the move */
        }

        if (castit) {
            throw new Error('dotele(): casting teleport away (spelleffects()) not ported yet');
        } else {
            /* bypassing spelleffects(); apply energy cost directly */
            u.uen -= energy;
            game.disp_botl = true;
        }
    }

    if (await next_to_u()) {
        if (trap && trap_once) {
            await vault_tele();
        } else if (trap && isok(trap.launch?.x, trap.launch?.y)) { /* teledest */
            await teleds(trap.launch.x, trap.launch.y, TELEDS_TELEPORT);
        } else {
            if (!game.iflags.travelcc)
                game.iflags.travelcc = { x: 0, y: 0 };
            game.iflags.travelcc.x = game.iflags.travelcc.y = 0;
            await tele();
        }
        await next_to_u();
    } else {
        await You(shudder_for_moment);
        return 0;
    }
    if (!trap)
        await morehungry(100);
    return 1;
}

/* C ref: dungeon.h On_W_tower_level() -- Vlad's Tower isn't reachable
   in the JS port yet */
function On_W_tower_level(lev) {
    void lev;
    return false;
}

/* C ref: decl.c You_feel/You1 message strings */
const shudder_for_moment = "shudder for a moment.";

// C ref: apply.c next_to_u()
/* is hero able to teleport/level-change with all leashed pets? */
export async function next_to_u() {
    /* get_iter_mons(mleashed_next2u) */
    for (const mtmp of game.level.monsters || []) {
        if (mtmp.dead || mtmp.mhp <= 0)
            continue;
        if (mtmp.mleashed)
            throw new Error('next_to_u(): mleashed_next2u() for a leashed pet not ported yet');
    }

    /* no pack mules for the Amulet */
    if (game.u.usteed && (game.u.usteed.minvent || []).some(
            o => o.otyp === AMULET_OF_YENDOR)) /* mon_has_amulet() */
        return false;
    return true;
}

/* C ref: teleport.c tele_trap() 'static boolean in_tele_trap' */
let in_tele_trap = false;

// C ref: teleport.c tele_trap()
export async function tele_trap(trap) {
    const u = game.u;

    /* a fixed-destination teleport trap could theoretically place hero onto
     * a second teleport trap; prevent the recursive call from spoteffects()
     * from triggering the trap at the destination */
    if (in_tele_trap)
        return;

    in_tele_trap = true;
    try {
        const Antimagic = !!(tp_prop(ANTIMAGIC).intrinsic || tp_prop(ANTIMAGIC).extrinsic
                             || (game.u.umonnum !== game.u.umonster
                                 && resists_magm(game.youmonst)));
        if (In_endgame(u.uz) || Antimagic || noteleport_level(game.youmonst)) {
            if (Antimagic)
                throw new Error('tele_trap(): shieldeff() not ported yet');
            await pline("You feel a wrenching sensation."); /* You_feel() */
        } else if (!await next_to_u()) {
            await pline(`You ${shudder_for_moment}`); /* You1() */
        } else if (trap.once) {
            deltrap(trap);
            newsym(u.ux, u.uy); /* get rid of trap symbol */
            await vault_tele();
        } else if (isok(trap.launch?.x, trap.launch?.y)) { /* teledest */
            const cc = { x: 0, y: 0 };
            let mtmp = m_at(trap.launch.x, trap.launch.y);

            settrack();
            if (mtmp) {
                if (!enexto(cc, mtmp.mx, mtmp.my, mtmp.data)) {
                    /* could not find some other place to put mtmp; the level
                     * must be nearly or completely full */
                    await pline(`You ${shudder_for_moment}`); /* You1() */
                } else {
                    await rloc_to(mtmp, cc.x, cc.y);
                    mtmp = null; /* no longer a monster at dest */
                }
            }
            if (!mtmp)
                await teleds(trap.launch.x, trap.launch.y, TELEDS_TELEPORT);
        } else
            await tele();
    } finally {
        in_tele_trap = false;
    }
}

function in_rooms_vault(urooms) {
    /* C ref: vault.c vault_occupied() */
    for (const r of urooms) {
        const rno = (typeof r === 'number') ? r : r.charCodeAt(0);
        const room = game.level.rooms?.[rno - ROOMOFFSET];
        if (room && room.rtype === VAULT)
            return true;
    }
    return false;
}

function is_pool_or_lava_at(x, y) {
    const typ = game.level.at(x, y).typ;
    return typ === POOL || typ === MOAT || typ === WATER || typ === LAVAPOOL
           || typ === LAVAWALL;
}

// C ref: teleport.c level_tele() -- the prompt for the destination and
// the wizard-mode level menu; random_levtport and lev_by_name() are not
// ported yet
export async function level_tele() {
    const g = game;
    const u = g.u;
    const wizard = !!g.flags?.debug;
    let newlev = 0;
    let buf = '';
    const newlevel = { dnum: 0, dlevel: 0 };
    let force_dest = false;

    if ((u.uhave?.amulet || In_endgame(u.uz) /* || In_sokoban(&u.uz) */)
        && !wizard) {
        await pline("You feel very disoriented for a moment."); /* You_feel() */
        return;
    }
    const Teleport_control = !!(u.uprops[TELEPORT_CONTROL]?.intrinsic
                                || u.uprops[TELEPORT_CONTROL]?.extrinsic);
    const Stunned = !!(u.uprops[STUNNED]?.intrinsic || u.uprops[STUNNED]?.extrinsic);
    const Confusion = !!(u.uprops[CONFUSION]?.intrinsic || u.uprops[CONFUSION]?.extrinsic);
    if ((Teleport_control && !Stunned) || wizard) {
        let qbuf = "To what level do you want to teleport?";
        let trycnt = 0;
        const digit = (c) => c >= '0' && c <= '9';

        do {
            /* iflags.menu_requested ('m ^V') is not ported yet */
            if (++trycnt === 2) {
                if (wizard)
                    qbuf += " [type a number, name, or ? for a menu]";
                else
                    qbuf += " [type a number or name]";
            }
            buf = await tty_getlin(qbuf);
            if (buf === "*") {
                return; /* goto random_levtport -- not ported yet */
            } else if (Confusion && rnl(5)) {
                await pline("Oops...");
                return; /* goto random_levtport -- not ported yet */
            } else if (buf === "\x1b") { /* cancelled */
                return;
            }
            if (wizard && buf === "?") {
                /* levTport_menu: */
                const r = await print_dungeon(true);
                newlev = r.lev;
                if (!newlev)
                    return;

                newlevel.dnum = r.rdgn;
                newlevel.dlevel = r.rlev;
                if (In_endgame(newlevel) && !In_endgame(u.uz))
                    throw new Error('level_tele(): "Endgame prerequisite" amulet not ported yet');
                force_dest = true;
            } else {
                if (!/^-?\d+$/.test(buf))
                    return; /* lev_by_name() -- not ported yet */
                newlev = parseInt(buf, 10); /* atoi() */
            }
        } while (!newlev && !digit(buf[0])
                 && (buf[0] !== '-' || !digit(buf[1])) && trycnt < 10);

        /* no dungeon escape via this route */
        if (newlev === 0)
            throw new Error('level_tele(): "Go to Nowhere" not ported yet');

        /* if in Knox and the requested level > 0, stay put.
         * we let negative values requests fall into the "heaven" loop.
         */
        /* single_level_branch(): Is_knox() */
        if (g.dungeon_topology.d_knox_level
            && on_level(u.uz, g.dungeon_topology.d_knox_level) && newlev > 0
            && !force_dest)
            throw new Error('level_tele(): single_level_branch() not ported yet');
        /* if in Quest, the player sees "Home 1", etc., on the status
         * line, instead of the logical depth of the level.  controlled
         * level teleport request is likely to be relativized to the
         * status line, and consequently it should be incremented to
         * the value of the logical depth of the target level.
         *
         * we let negative values requests fall into the "heaven" handling.
         */
        if (In_quest(u.uz) && newlev > 0)
            newlev = newlev + g.dungeons[u.uz.dnum].depth_start - 1;
    } else { /* involuntary level tele */
        /* random_levtport: random_teleport_level() -- not ported yet */
        throw new Error('level_tele(): random_levtport not ported yet');
    }

    /* u.utrap && u.utraptype == TT_BURIEDBALL: punishment not ported */

    /* if (!next_to_u() && !force_dest): leashed pets aren't ported yet;
       next_to_u() is TRUE without them */
    if (In_endgame(u.uz)) /* must already be wizard */
        throw new Error('level_tele(): level teleport in the endgame not ported yet');

    /* svk.killer.name[0] = 0: still alive, so far... */

    if (newlev < 0 && !force_dest)
        throw new Error('level_tele(): teleporting above the dungeon not ported yet');

    /* escape_by_flying: not reached */
    const topo = g.dungeon_topology;
    if (force_dest) {
        /* wizard mode menu; no further validation needed */
        ;
    } else if (u.uz.dnum === topo.d_medusa_level.dnum
        && newlev >= g.dungeons[u.uz.dnum].depth_start
                     + dunlevs_in_dungeon(u.uz)) {
        throw new Error('level_tele(): find_hell() not ported yet');
    } else {
        /* FIXME: we should avoid using hard-coded knowledge of
           which branches don't connect to anything deeper;
           mainly used to distinguish "can't get there from here"
           vs "from anywhere" rather than to control destination */
        const qbranch = In_quest(u.uz) ? topo.d_qstart_level
                        : In_mines(u.uz) ? topo.d_mineend_level
                          : topo.d_sanctum_level;
        let deepest = g.dungeons[qbranch.dnum].depth_start
                      + dunlevs_in_dungeon(qbranch) - 1;

        /* if invocation did not yet occur, teleporting into
         * the last level of Gehennom is forbidden.
         */
        if (!wizard && In_hell(u.uz) && !u.uevent?.invoked
            && newlev >= deepest) {
            newlev = deepest - 1;
            await pline("Sorry...");
        }
        /* no teleporting out of quest dungeon */
        if (In_quest(u.uz) && newlev < depth(topo.d_qstart_level))
            newlev = depth(topo.d_qstart_level);
        /* the player thinks of levels purely in logical terms, so
         * we must translate newlev to a number relative to the
         * current dungeon.
         */
        get_level(newlevel, newlev);

        if (on_level(newlevel, u.uz) && newlev !== depth(u.uz)) {
            /* You_cant(get_there_from, ...) */
            await pline(`You can't get there from ${(newlev > deepest)
                                                    ? "anywhere" : "here"}.`);
            return;
        }
    }

    schedule_goto(newlevel, UTOTYPE_NONE, null,
                  g.flags.verbose ? "You materialize on a different level!"
                                  : null);
}

/* C ref: mondata.h is_dlord(), is_dprince(), is_covetous() */
function is_dlord(ptr) { return is_lord(ptr) && is_demon(ptr); }
function is_dprince(ptr) { return is_prince(ptr) && is_demon(ptr); }
function is_lord(ptr) { return (ptr.mflags2 & M2_LORD) !== 0; }
function is_prince(ptr) { return (ptr.mflags2 & M2_PRINCE) !== 0; }
function is_demon(ptr) { return (ptr.mflags2 & M2_DEMON) !== 0; }
function is_covetous(ptr) { return (ptr.mflags3 & M3_COVETOUS) !== 0; }

// C ref: teleport.c m_blocks_teleporting()
/* does monster block others from teleporting? */
function m_blocks_teleporting(mtmp) {
    if (is_dlord(mtmp.data) || is_dprince(mtmp.data))
        return true;
    return false;
}

// C ref: teleport.c noteleport_level()
/* teleporting is prevented on this level for this monster? */
export function noteleport_level(mon) {
    /* demon court in Gehennom prevent others from teleporting */
    if (In_hell(game.u.uz) && !(is_dlord(mon.data) || is_dprince(mon.data)))
        /* get_iter_mons(m_blocks_teleporting) */
        for (const m of game.level.monsters || [])
            if (m.mhp > 0 && m_blocks_teleporting(m))
                return true;

    /* natural no-teleport level; covetous monsters can bypass these */
    if (game.level.flags.noteleport && !is_covetous(mon.data))
        return true;

    /* wand of stasis prevents teleportation while the effect is active
       (even for covetous monsters) */
    if ((game.level.flags.stasis_until ?? -1) >= game.moves)
        return true;

    return false;
}

// C ref: teleport.c tele_jump_ok()
/* hero or monster is trying to teleport from <x1,y1> to <x2,y2> */
function tele_jump_ok(x1, y1, x2, y2) {
    const dndest = game.dndest, updest = game.updest;

    if (!isok(x2, y2))
        return false;
    if (dndest?.nlx > 0) {
        /* if inside a restricted region, can't teleport outside */
        if (within_bounded_area(x1, y1, dndest.nlx, dndest.nly,
                                dndest.nhx, dndest.nhy)
            && !within_bounded_area(x2, y2, dndest.nlx, dndest.nly,
                                    dndest.nhx, dndest.nhy))
            return false;
        /* and if outside, can't teleport inside */
        if (!within_bounded_area(x1, y1, dndest.nlx, dndest.nly,
                                 dndest.nhx, dndest.nhy)
            && within_bounded_area(x2, y2, dndest.nlx, dndest.nly,
                                   dndest.nhx, dndest.nhy))
            return false;
    }
    if (updest?.nlx > 0) { /* ditto */
        if (within_bounded_area(x1, y1, updest.nlx, updest.nly,
                                updest.nhx, updest.nhy)
            && !within_bounded_area(x2, y2, updest.nlx, updest.nly,
                                    updest.nhx, updest.nhy))
            return false;
        if (!within_bounded_area(x1, y1, updest.nlx, updest.nly,
                                 updest.nhx, updest.nhy)
            && within_bounded_area(x2, y2, updest.nlx, updest.nly,
                                   updest.nhx, updest.nhy))
            return false;
    }
    return true;
}

// C ref: teleport.c rloc_pos_ok()
function rloc_pos_ok(x, y, /* coordinates of candidate location */
                     mtmp) {
    if (!goodpos(x, y, mtmp, GP_CHECKSCARY))
        return false;
    /*
     * Check for restricted areas present in some special levels.
     *
     * `xx' is current column; if 0, then `yy' will contain flag bits
     * rather than row:  bit #0 set => moving upwards; bit #1 set =>
     * inside the Wizard's tower.
     */
    const xx = mtmp.mx, yy = mtmp.my;
    if (!xx) {
        /* no current location (migrating monster arrival) */
        throw new Error('rloc_pos_ok(): migrating monster arrival not ported yet');
    } else {
        /* [try to] prevent a shopkeeper or temple priest from being
           sent out of his room (caller might resort to goodpos() if
           we report failure here, so this isn't full prevention) */
        if (mtmp.isshk || mtmp.ispriest)
            throw new Error('rloc_pos_ok(): shopkeeper/priest rooms not ported yet');
        /* current location is <xx,yy> */
        if (!tele_jump_ok(xx, yy, x, y))
            return false;
    }
    /* <x,y> is ok */
    return true;
}

// C ref: teleport.c rloc_to_core()
/*
 * Pulls a monster from its current position and places a monster at
 * a new x and y.  If oldx is 0, then the monster was not in the
 * levels.monsters array.  However, if oldx is 0, oldy may still have
 * a value because mtmp is a migrating_mon.  Worm tails are always
 * placed randomly around the head of the worm.
 */
async function rloc_to_core(mtmp, x, y, rlocflags) {
    const u = game.u;
    const oldx = mtmp.mx, oldy = mtmp.my;
    const preventmsg = (rlocflags & RLOC_NOMSG) !== 0;
    const vanishmsg = (rlocflags & RLOC_MSG) !== 0;
    let appearmsg = (mtmp.mstrategy & STRAT_APPEARMSG) !== 0;
    const domsg = !game.in_mklev && (vanishmsg || appearmsg) && !preventmsg;
    let telemsg = false;

    if (x === mtmp.mx && y === mtmp.my && m_at(x, y) === mtmp)
        return; /* that was easy */

    if (mtmp.isshk)
        throw new Error('rloc_to_core(): resident shopkeeper not ported yet');

    if (oldx) { /* "pick up" monster */
        if (domsg && canspotmon(mtmp)) {
            if (couldsee(x, y) || sensemon(mtmp)) {
                telemsg = true;
            } else {
                await pline(`${Monnam(mtmp)} vanishes!`);
            }
            /* avoid "It suddenly appears!" for a STRAT_APPEARMSG monster
               that has just teleported away if we won't see it after this
               vanishing (the regular appears message will be given if we
               do see it) */
            appearmsg = false;
        }

        if (mtmp.wormno) {
            throw new Error('rloc_to_core(): remove_worm() not ported yet');
        } else {
            /* remove_monster(oldx, oldy): game.level.monsters is keyed by
               mx/my, so moving the monster below is enough */
            mtmp.mx = 0, mtmp.my = 0;
            newsym(oldx, oldy); /* update old location */
        }
    }

    mon_track_clear(mtmp);
    place_monster(mtmp, x, y); /* put monster down */
    /* update_monster_region(mtmp): no regions are created yet */

    if (u.ustuck === mtmp)
        throw new Error('rloc_to_core(): u.ustuck teleporting not ported yet');

    maybe_unhide_at(x, y);
    newsym(x, y);      /* update new location */
    set_apparxy(mtmp); /* orient monster */
    if (domsg && (canspotmon(mtmp) || appearmsg || mtmp === u.ustuck)) {
        const du = dist2(x, y, u.ux, u.uy);
        let olddu;
        const next = (du <= 2) ? " next to you" : null, /* next2u() */
              nearu = (du <= BOLT_LIM * BOLT_LIM) ? " close by" : null;

        /* set_msg_xy(x, y) */
        mtmp.mstrategy &= ~STRAT_APPEARMSG; /* one chance only */
        if (telemsg && (couldsee(x, y) || sensemon(mtmp))) {
            await pline(`${Monnam(mtmp)} vanishes and reappears${
                next ? next
                : nearu ? nearu
                  : ((olddu = dist2(oldx, oldy, u.ux, u.uy)) === du) ? ""
                    : (du < olddu) ? " closer to you"
                      : " farther away"}.`);
        } else {
            const Blind = !!(u.uprops[BLINDED]?.intrinsic
                             || u.uprops[BLINDED]?.extrinsic);
            await pline(`${appearmsg ? Amonnam(mtmp) : Monnam(mtmp)} ${
                appearmsg ? "suddenly " : ""}${
                !Blind ? "appears" : "arrives"}${
                next ? next : nearu ? nearu : ""}!`);
        }
        /* wand discovery (gc.current_wand): zapping isn't ported yet */
    }

    /* shopkeeper anger and shop goods leaving the shop (costly_spot()):
       shops aren't stocked by this port yet; clear no_charge as C does
       when the destination isn't a costly spot */
    for (const otmp of mtmp.minvent || [])
        if (otmp.no_charge)
            otmp.no_charge = 0;

    /* if hero is busy, maybe stop occupation */
    if (game.occupation)
        await dochugw(mtmp, false);

    /* trapped monster teleported away */
    if (mtmp.mtrapped && !mtmp.wormno)
        await mintrap(mtmp, NO_TRAP_FLAGS);
}

// C ref: teleport.c rloc()
/* place a monster at a random location, typically due to teleport;
   return TRUE if successful, FALSE if not; rlocflags is RLOC_foo flags */
export async function rloc(mtmp, /* mtmp->mx==0 implies migrating monster arrival */
                           rlocflags) {
    const u = game.u;
    let cc, x, y, trycount, i, j, candycount;
    const backupcc = { x: 0, y: 0 };

    if (mtmp === u.usteed)
        throw new Error('rloc(): tele() for the steed not ported yet');

    if (mtmp.iswiz && mtmp.mx)
        throw new Error('rloc(): Wizard of Yendor stairway_find_forwiz() not ported yet');

    /* wizard-mode player can choose destination by setting 'montelecontrol'
       option (iflags.mon_telecontrol): not ported, off by default */

    /* this used to try randomly 1000 times, then fallback to left-to-right
       top-to-bottom exhaustive check; now that the exhaustive check uses
       randomized order, reduce the number of random attempts to 50;
       on levels with lots of available space, random can find a spot more
       quickly but might fail to find one no matter how many tries it makes */
    for (trycount = 0; trycount < 50; ++trycount) {
        x = rnd(COLNO - 1); /* 1..COLNO-1 */
        y = rn2(ROWNO); /* 0..ROWNO-1 */
        if (rloc_pos_ok(x, y, mtmp)) { /* rejects 'onscary' */
            await rloc_to_core(mtmp, x, y, rlocflags); /* found_xy */
            return true;
        }
    }

    /* try harder to find a good place; gather a list of all candidate
       locations (every accessible unoccupied spot except for hero's;
       goodpos() will reject that), then shuffle them ourselves instead
       of having collect_coords() do it (which would be in rings centered
       around arbitrary <COLNO/2,ROWNO/2>) */
    let cc_flags = CC_INCL_CENTER | CC_UNSHUFFLED | CC_SKIP_MONS;
    if (!passes_walls(mtmp.data))
        cc_flags |= CC_SKIP_INACCS;
    const candy = [];
    candycount = collect_coords(candy, Math.trunc(COLNO / 2),
                                Math.trunc(ROWNO / 2), 0, cc_flags, null);
    for (i = 0; i < candycount; ++i) {
        if ((j = rn2(candycount - i)) > 0) {
            cc = candy[i];
            candy[i] = candy[i + j];
            candy[i + j] = cc;
        }
        x = candy[i].x, y = candy[i].y;
        if (rloc_pos_ok(x, y, mtmp)) {
            await rloc_to_core(mtmp, x, y, rlocflags); /* found_xy */
            return true;
        }
        if (!backupcc.x && goodpos(x, y, mtmp, NO_MM_FLAGS))
            backupcc.x = x, backupcc.y = y;
    }

    /* we didn't find any spot acceptable to rloc_pos_ok() which avoids
       'onscary' and honors teleport regions, but if we did find a spot
       that was acceptable to goodpos() (which ignores 'onscary' and
       teleport regions) we'll use that; otherwise give up */
    if (!backupcc.x) {
        /* level either full of monsters or somehow faulty */
        /* if ((rlocflags & RLOC_ERR) != 0) impossible(...) */
        return false;
    }
    x = backupcc.x, y = backupcc.y;
    /* found_xy: */
    await rloc_to_core(mtmp, x, y, rlocflags);
    return true;
}

// C ref: teleport.c tele_restrict()
export async function tele_restrict(mon) {
    if (noteleport_level(mon)) {
        if (canseemon(mon))
            await pline(`A mysterious force prevents ${mon_nam(mon)} from teleporting!`);
        return true;
    }
    return false;
}

// C ref: teleport.c teleport_pet()
function teleport_pet(mtmp, force_it) {
    if (mtmp === game.u.usteed)
        return false;

    if (mtmp.mleashed)
        throw new Error('teleport_pet(): leashed pets not ported yet');
    return true;
}

// C ref: teleport.c mvault_tele()
async function mvault_tele(mtmp) {
    throw new Error('mvault_tele(): search_special(VAULT) not ported yet');
}

// C ref: teleport.c mtele_trap()
export async function mtele_trap(mtmp, trap, in_sight) {
    let monname;

    /* don't print feedback here: a monster stepping on a trap and not
       teleporting from it isn't visible */
    if (noteleport_level(mtmp))
        return;

    if (teleport_pet(mtmp, false)) {
        /* save name with pre-movement visibility */
        monname = Monnam(mtmp);

        /* Note: don't remove the trap if a vault.  Other-
         * wise the monster will be stuck there, since
         * the guard isn't going to come for it...
         */
        if (trap.once)
            await mvault_tele(mtmp);
        else if (isok(trap.launch.x, trap.launch.y)) { /* teledest */
            /* monster teleporting onto hero's or another monster's spot does
             * not work the same as hero teleporting onto monster's spot where
             * the incoming monster displaces the resident to the nearest
             * possible space - instead it just doesn't work. */
            if (!(m_at(trap.launch.x, trap.launch.y)
                  || (game.u.ux === trap.launch.x
                      && game.u.uy === trap.launch.y))) {
                await rloc_to_core(mtmp, trap.launch.x, trap.launch.y,
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

// C ref: teleport.c random_teleport_level()
/* Returns an absolute depth */
export function random_teleport_level() {
    const u = game.u;
    let nlev, max_depth, min_depth;
    const cur_depth = depth(u.uz);

    /* [the endgame case can only occur in wizard mode] */
    if (!rn2(5) || single_level_branch(u.uz) || In_endgame(u.uz))
        return cur_depth;

    if (In_quest(u.uz)) {
        throw new Error('random_teleport_level(): quest dungeon not ported yet');
    } else {
        min_depth = 1;
        max_depth = dunlevs_in_dungeon(u.uz)
                    + (game.dungeons[u.uz.dnum].depth_start - 1);
        /* can't reach Sanctum if the invocation hasn't been performed */
        if (In_hell(u.uz) && !u.uevent?.invoked)
            max_depth -= 1;
    }

    /* Get a random value relative to the current dungeon */
    /* Range is 1 to current+3, current not counting */
    nlev = rn2(cur_depth + 3 - min_depth) + min_depth;
    if (nlev >= cur_depth)
        nlev++;

    if (nlev > max_depth) {
        nlev = max_depth;
        /* teleport up if already on bottom */
        if (u.uz.dlevel === game.dungeons[u.uz.dnum].num_dunlevs) /* Is_botlevel() */
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

/* C ref: dungeon.c single_level_branch() -- only Fort Ludios */
function single_level_branch(lev) {
    const knox = game.dungeon_topology?.d_knox_level;
    return !!(knox && (knox.dnum || knox.dlevel) && on_level(lev, knox));
}

// C ref: teleport.c mlevel_tele_trap()
/* return Trap_Effect_Finished if still on level, Trap_Moved_Mon if not */
export async function mlevel_tele_trap(mtmp, trap, force_it, in_sight) {
    const u = game.u;
    const tt = (trap ? trap.ttyp : NO_TRAP);

    if (mtmp === u.ustuck) /* probably a vortex */
        return Trap_Effect_Finished; /* temporary? kludge */
    if (teleport_pet(mtmp, force_it)) {
        const tolevel = { dnum: 0, dlevel: 0 };

        if (is_hole(tt)) {
            const topo = game.dungeon_topology;
            if (topo.d_stronghold_level
                && on_level(u.uz, topo.d_stronghold_level)) {
                tolevel.dnum = topo.d_valley_level.dnum;
                tolevel.dlevel = topo.d_valley_level.dlevel;
            } else if (u.uz.dlevel === game.dungeons[u.uz.dnum].num_dunlevs) {
                /* Is_botlevel() */
                if (in_sight && trap.tseen)
                    await pline(`${Monnam(mtmp)} avoids the ${
                        (tt === HOLE) ? "hole" : "trap"}.`);
                return Trap_Effect_Finished;
            } else {
                tolevel.dnum = trap.dst.dnum;
                tolevel.dlevel = trap.dst.dlevel;
                clamp_hole_destination(tolevel);
            }
        } else if (tt === MAGIC_PORTAL) {
            throw new Error('mlevel_tele_trap(): magic portal not ported yet');
        } else if (tt === LEVEL_TELEP || tt === NO_TRAP) {
            let nlev;

            if (mtmp.iswiz || In_endgame(u.uz) /* mon_has_amulet() */
                || (mtmp.minvent || []).some(o => o.otyp === AMULET_OF_YENDOR)
                /* NO_TRAP is used when forcing a monster off the level;
                   onscary(0,0,) is true for the Wizard, Riders, lawful
                   minions, Angels of any alignment, shopkeeper or priest
                   currently inside his or her own special room */
                || (tt === NO_TRAP && onscary(0, 0, mtmp))) {
                if (in_sight)
                    await pline(`${Monnam(mtmp)} seems very disoriented for a moment.`);
                return Trap_Effect_Finished;
            }
            if (tt === NO_TRAP) {
                /* creature is being forced off the level to make room;
                   it will try to return to this level (at a random spot
                   rather than its current one) if the level is left by
                   the hero and then revisited */
                tolevel.dnum = u.uz.dnum, tolevel.dlevel = u.uz.dlevel;
            } else {
                nlev = random_teleport_level();
                if (nlev === depth(u.uz)) {
                    if (in_sight)
                        await pline(`${Monnam(mtmp)} shudders for a moment.`);
                    return Trap_Effect_Finished;
                }
                get_level(tolevel, nlev);
            }
        } else {
            /* impossible("mlevel_tele_trap: unexpected trap type (%d)") */
            return Trap_Effect_Finished;
        }

        if (in_sight) {
            await pline(`Suddenly, ${mon_nam(mtmp)} ${
                (tt === HOLE) ? "falls into a hole"
                : (tt === TRAPDOOR) ? "falls through a trap door"
                  : "disappears out of sight"}.`);
            if (trap)
                seetrap(trap);
        }
        /* is_xport(tt) */
        if ((tt === TELEP_TRAP || tt === LEVEL_TELEP)
            && !control_teleport(mtmp.data))
            mtmp.mconf = 1;
        throw new Error('mlevel_tele_trap(): migrate_to_level() not ported yet');
    }
    return Trap_Effect_Finished;
}

// C ref: teleport.c rloco()
/* place object randomly, returns False if it's gone (eg broken) */
export async function rloco(obj) {
    let tx, ty;
    let try_limit = 4000;
    const dndest = game.dndest;

    if (obj.otyp === CORPSE && is_rider(mons[obj.corpsenm]))
        throw new Error('rloco(): revive_corpse() not ported yet');

    obj_extract_self(obj);
    const otx = obj.ox;
    const oty = obj.oy;
    const restricted_fall = (otx === 0 && dndest?.lx);
    do {
        tx = rn1(COLNO - 3, 2);
        ty = rn2(ROWNO);
        if (!--try_limit)
            break;
    } while (!goodpos(tx, ty, null, 0)
             || (restricted_fall
                 && (!within_bounded_area(tx, ty,
                                          dndest.lx, dndest.ly,
                                          dndest.hx, dndest.hy)
                     || (dndest.nlx
                         && within_bounded_area(tx, ty,
                                                dndest.nlx, dndest.nly,
                                                dndest.nhx, dndest.nhy)))));
    /* On_W_tower_level(): the Wizard's tower isn't generated yet */

    if (await flooreffects(obj, tx, ty, "fall")) {
        /* update old location (if any) since flooreffects() couldn't;
           unblock_point() for boulder handled by obj_extract_self() */
        if (!(otx === 0 && oty === 0))
            newsym(otx, oty);
        return false;
    } else if (otx === 0 && oty === 0) {
        ; /* fell through a trap door; no update of old loc needed */
    } else {
        /* shop billing (find_objowner()/costly_spot()): shops aren't
           stocked by this port yet */
        newsym(otx, oty); /* update old location */
    }
    place_object(obj, tx, ty);
    /* note: block_point() for boulder handled by place_object() */
    newsym(tx, ty);
    return true;
}

