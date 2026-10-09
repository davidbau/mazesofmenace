// @ts-nocheck
// teleport.c — collect_coords, enexto_core (C ref: teleport.c:86-275, 578-713).
// @ts-nocheck — js sibling imports.
import { rn2, rnd, pushRngLogEntry } from './rng.js';
/* C ref: dungeon.c on_level/In_tutorial — domagicportal's landed-from-another-
 * portal check and its tutorial-exit arm. */
import { on_level, In_tutorial } from './dungeon.js';
/* C ref: potion.c:106 make_stunned — domagicportal's dizzy-on-arrival stun. */
import { make_stunned } from './potion.js';
/* C ref: do.c:2076 schedule_goto — domagicportal defers the actual level
 * change to the end of the turn, same as level_tele (js/cmd.js:11421). */
import { schedule_goto } from './cmd.js';
import { yn_function } from './end.js';
import { ROWNO, COLNO, ZAP_POS, ACCESSIBLE, D_CLOSED, D_LOCKED, DOOR, isok, u_at, TELEDS_TELEPORT, RLOC_MSG, TEMPLE, engulfing_u, STRAT_APPEARMSG, NO_TRAP_FLAGS, BOLT_LIM, IS_ALTAR, IS_STWALL, W_NONPASSWALL, MON_FLOOR, POOL, MOAT, WATER, DRAWBRIDGE_UP, DB_UNDER, DB_MOAT, DB_LAVA, LAVAPOOL, LAVAWALL, MM_IGNOREWATER, MM_IGNORELAVA, GP_CHECKSCARY, GP_ALLOW_U, GP_AVOID_MONPOS, LR_MONGEN, LR_TELE, LR_UPTELE, LR_DOWNTELE, FIRE_RES, NO_MM_FLAGS, IS_WATERWALL, In_endgame, Is_astralevel, Is_juiblex_level, MON_DETACH, MON_OBLITERATE, MON_ENDGAME_MIGR } from './const.js';
import { game } from './gstate.js';
import { newsym, see_monsters, shieldeff, docrt } from './display.js';
import { vision_recalc } from './vision.js';
import { nomul } from './allmain.js';
import { pline, canspotmon, sensemon, canseemon, _topl_joins_snapshot, _topl_merge_result } from './display.js';
import { Monnam } from './mcastu.js';
import { Amonnam } from './mhitm.js';
import { You } from './eat.js';
import { set_ustuck, in_rooms, maybe_unhide_at, sobj_at, somexyspace, u_on_newpos, mongone } from './mklev.js';
/* C ref: mkroom.c:764-780 search_special(VAULT) — vault_tele's room lookup. */
import { search_special } from './mkroom.js';
/* C ref: trap.c:1700 deltrap — the once-trap is consumed on use. */
import { deltrap } from './trap.js';
/* C ref: track.c:23 settrack — tele_trap's fixed-destination arm. */
import { settrack } from './track.js';
/* C ref: hack.h MON_AT/m_at — tele_trap's fixed-destination arm. */
import { m_at } from './uhitm.js';
/* C ref: mkroom.h VAULT, youprop.h ANTIMAGIC slot. */
import { VAULT, ANTIMAGIC } from './const.js';
import { m_into_limbo, unstuck, mon_leaving_level, m_unleash } from './dog.js';
import { yelp } from './mhitm.js';
import { impossible } from './steed.js';
/* C mon.c:4056 mnearto -> goodpos(newx, newy, mtmp, 0) — the FULL goodpos
 * (js/trap.js:1131), not this file's goodpos_simple/goodpos_full pair, which
 * enexto_core uses for its candidate filter. */
import { goodpos as goodpos_tp } from './trap.js';
import { mon_nam } from './uhitm.js';
import { noteleport_level, m_in_air, permonstTemplate, Inhell } from './makemon.js';
import { mon_aligntyp, inhistemple as inhistemple_real } from './priest.js';
import { worm_seg_at, remove_worm as remove_worm_real, place_worm_tail_randomly as place_worm_tail_randomly_real } from './worm.js';
import { dotrap, t_at, mintrap, fill_pit, seetrap, clamp_hole_destination,
         buried_ball_to_punishment } from './trap.js';
/* ── imports for mlevel_tele_trap / teleport_pet (below) ── */
import { migrate_to_level } from './dog.js';        /* C dog.c:886 */
import { mon_has_amulet } from './mhitm.js';        /* C mon.c mon_has_amulet */
import { is_home_elemental } from './makemon.js';   /* C mondata.h */
import { is_xport } from './const.js';              /* C trap.h is_xport() */
/* mlevel_tele_trap's is_hole arm (teleport.c:2019-2031). */
import { Is_stronghold, Is_botlevel } from './const.js';
/* C ref: teleport.c:461-528 — teleds()'s ball & chain block.  Every helper it
 * needs was already ported; only the block that calls them was missing. */
import { drag_ball, move_bc, placebc, unplacebc } from './ball.js';
import { near_capacity } from './weight.js';
/* C ref: hack.c:3375 spoteffects -> pickup(1).  cmd.js <-> teleport.js is
 * already a cycle (cmd.js imports teleds from here); `export async function`
 * declarations hoist, so the binding is live by the time teleds runs. */
import { _spoteffects_pickup, check_special_room, random_teleport_level, get_level } from './cmd.js';
import { OBJ_FREE, OBJ_INVENT, SLT_ENCUMBER } from './const.js';
/* C ref: obj.h:332 carried(o) := ((o)->where == OBJ_INVENT).  Same one-liner
 * js/ball.js keeps file-locally; both are the macro, not a stand-in. */
function carried(o) {
    return o != null && (o.where | 0) === OBJ_INVENT;
}
import { couldsee } from './vision.js';
import { set_apparxy, mon_track_clear, dochugw } from './monmove.js';
import { find_objowner, costly_spot, inhishop, onshopbill } from './shk.js';
import { dist2, distmin, depth } from './hacklib.js';
import { within_bounded_area } from './rect.js';
import { in_out_region, update_monster_region as update_monster_region_real } from './region.js';
import { PM_ANGEL, PM_FIRE_ELEMENTAL, PM_SALAMANDER, PM_FLOATING_EYE, PM_MINOTAUR, PM_WIZARD_OF_YENDOR } from './pm.generated.js';
import { TELEPORT_CONTROL, STUNNED, TT_BURIEDBALL, TIMEOUT } from './const.js';
/* C ref: teleport.c:424-434 teleok's trap exceptions (rm.h/trap.h predicates). */
import { VIBRATING_SQUARE, is_pit, is_hole } from './const.js';
/* C ref: getpos.c:771 getpos() — scrolltele's cursor-driven destination pick
 * (teleport.c:892).  Lives in js/cmd.js alongside the rest of the getpos
 * machinery (truncate_to_map, movecmd, the farlook descriptions). */
import { getpos } from './cmd.js';
import { noit_mon_nam } from './mhitm.js';
import { learnscroll } from './read.js';
/* C potion.c:260 make_blinded — canonical transient-blindness transition. */
import { make_blinded } from './zap.js';
import { ENV } from './hostenv.js';
import { newcham as newcham_vr, upstart as upstart_vr } from './mklev.js';
import { expels_gu as expels_gu_vr } from './mhitu.js';
import { x_monnam as x_monnam_vr } from './mhitm.js';
import { nonliving as nonliving_vr } from './makemon.js';
import { Unaware as Unaware_vr } from './display.js';
import { ismnum as ismnum_vr, G_GENOD as G_GENOD_VR, NON_PM as NON_PM_VR, ARTICLE_THE as ARTICLE_THE_VR, ARTICLE_A as ARTICLE_A_VR, SUPPRESS_INVISIBLE as SUPPRESS_INVISIBLE_VR, AUGMENT_IT as AUGMENT_IT_VR, SUPPRESS_NAME as SUPPRESS_NAME_VR, SUPPRESS_IT as SUPPRESS_IT_VR } from './const.js';
/* C ref: include/hack.h flag bits for collect_coords() */
export const CC_NO_FLAGS = 0x00;
export const CC_INCL_CENTER = 0x01;
export const CC_UNSHUFFLED = 0x02;
export const CC_RING_PAIRS = 0x04;
export const CC_SKIP_MONS = 0x08;
export const CC_SKIP_INACCS = 0x10;
/* C ref: teleport.c:578-713 collect_coords —
 * Make a list of coordinates in expanding rings around <cx,cy>.
 * Returns the number of coordinates collected.
 * Each ring is shuffled independently (or in pairs when CC_RING_PAIRS). */
export function collect_coords(cx, cy, maxradius, cc_flags, filter) {
    const include_cxcy = (cc_flags & CC_INCL_CENTER) !== 0;
    const scramble = (cc_flags & CC_UNSHUFFLED) === 0;
    const ring_pairs = scramble && (cc_flags & CC_RING_PAIRS) !== 0;
    const skip_mons = (cc_flags & CC_SKIP_MONS) !== 0;
    const skip_inaccs = (cc_flags & CC_SKIP_INACCS) !== 0;
    const rowrange = (cy < Math.trunc(ROWNO / 2)) ? (ROWNO - 1 - cy) : cy;
    const colrange = (cx < Math.trunc(COLNO / 2)) ? (COLNO - 1 - cx) : cx;
    let kmax = (rowrange > colrange ? rowrange : colrange) | 0;
    if (!maxradius)
        maxradius = kmax;
    else if (maxradius > kmax)
        maxradius = kmax;
    const ccc = [];
    let result = 0;
    let passStart = 0;
    let n = 0;
    for (let radius = include_cxcy ? 0 : 1; radius <= maxradius; ++radius) {
        let newpass, passend;
        if (!ring_pairs) {
            newpass = passend = true;
        }
        else {
            newpass = (radius % 2) !== 0 || radius === 0;
            passend = (radius % 2) === 0 || radius === maxradius;
        }
        if (newpass) {
            passStart = ccc.length;
            n = 0;
        }
        const lox = (cx - radius) | 0;
        const hix = (cx + radius) | 0;
        const loy = (cy - radius) | 0;
        const hiy = (cy + radius) | 0;
        const ystart = loy < 0 ? 0 : loy;
        const xstartBase = lox < 1 ? 1 : lox;
        for (let y = ystart; y <= hiy; ++y) {
            if (y > ROWNO - 1)
                break;
            for (let x = xstartBase; x <= hix; ++x) {
                if (x > COLNO - 1)
                    break;
                if (x !== lox && x !== hix && y !== loy && y !== hiy)
                    continue;
                if (skip_mons && mon_at(x, y))
                    continue;
                if (skip_inaccs) {
                    const loc = game.level?.at(x, y);
                    if (!loc || !ZAP_POS(loc.typ))
                        continue;
                }
                if (filter && !filter(x, y))
                    continue;
                ccc.push({ x, y });
                ++n;
                ++result;
            }
        }
        if (scramble && passend) {
            let si = passStart;
            let nn = n;
            while (nn > 1) {
                const k = rn2(nn);
                if (k) {
                    const tmp = ccc[si];
                    ccc[si] = ccc[si + k];
                    ccc[si + k] = tmp;
                }
                ++si;
                --nn;
            }
        }
    }
    return { count: result, coords: ccc };
}
/* C ref: hack.h MON_AT — returns true if any monster occupies (x,y).
 * Walk the fmon chain. */
function mon_at(x, y) {
    for (let m = game.fmon; m; m = m.nmon) {
        if (m._mapRemoved) continue;
        if ((m.mhp | 0) < 1) continue; /* DEADMONSTER — C m_at/MON_AT reads the grid, which m_detach cleared */
        if (m.mx === x && m.my === y)
            return m;
    }
    /* C's grid also holds long-worm TAIL segments (rm.h:533 place_worm_seg);
     * they are not fmon entries, so look them up separately. */
    return worm_seg_at(x, y);
}
/* C ref: teleport.c:86-185 goodpos (simplified for enexto_core / monster placement).
 * Checks used with NO_MM_FLAGS / GP_CHECKSCARY for new monster placement:
 *   isok, !u_at (allow_u=false, mtmp is not youmonst/ustuck/usteed),
 *   MON_AT(x,y) — another monster occupies this square,
 *   accessible = ACCESSIBLE(typ) && !closed_door,
 *   sobj_at(BOULDER,x,y) — C 174-176, see below.  Lava/water/worm/onscary
 *   omitted — starting pet is a normal ground-dwelling creature.
 *
 * The header used to list "boulder" among the OMITTED checks.  It is not
 * omissible: C's enexto_core never reaches goodpos with a null mdat (it
 * substitutes `&mons[u.umonster]` for one, teleport.c:236-240), so C's
 * boulder line always evaluates, and `throws_rocks()` is false for every
 * creature any bare enexto_core() caller in this port places.  Omitting it
 * let a monster be placed ON a boulder where C walks on to the next
 * candidate of the same bit-identical collect_coords shuffle. */
function goodpos_simple(x, y) {
    if (!isok(x, y))
        return false;
    /* u_at check: mtmp is new monster (not youmonst/ustuck/usteed), allow_u=false */
    if (u_at(x, y))
        return false;
    /* C ref: goodpos (teleport.c:86-185) — MON_AT check.
     * Without this, JS picks a square C rejects, causing
     * pet-placement divergence (W20.5 wire-blocker). */
    if (mon_at(x, y))
        return false;
    if (!accessible_local(x, y))
        return false;
    /* C teleport.c:174-176, "skip boulder locations for most creatures":
     *   if (sobj_at(BOULDER, x, y) && (!mdat || !throws_rocks(mdat)))
     *       return FALSE;
     * mdat here is C's fakemon->data, i.e. the caller's mdat or, when that is
     * null, &mons[u.umonster]; neither the hero's base form nor any pet or
     * ordinary monster placed through a bare enexto_core() in this port is
     * M2_ROCKTHROW, so the second conjunct is true and the square is rejected.
     * goodpos_full() (below) and teleok() (the hero's inlined goodpos) both
     * already carry this line; goodpos_simple was the one copy without it. */
    if (sobj_at(BOULDER, x, y))
        return false;
    return true;
}
export function enexto_core(xx, yy, fakemon, entflags) {
    const ok = fakemon
        ? ((x, y) => goodpos_full(x, y, fakemon, entflags | 0))
        : ((x, y) => goodpos_simple(x, y));
    /* near pass: collect_coords with maxradius=3 */
    const near = collect_coords(xx, yy, 3, CC_NO_FLAGS, null);
    for (let i = 0; i < near.coords.length; i++) {
        const c = near.coords[i];
        if (ok(c.x, c.y))
            return { x: c.x, y: c.y };
    }
    /* full-map pass: skip first nearcandyct slots already rejected */
    const all = collect_coords(xx, yy, 0, CC_NO_FLAGS, null);
    for (let i = near.count; i < all.coords.length; i++) {
        const c = all.coords[i];
        if (ok(c.x, c.y))
            return { x: c.x, y: c.y };
    }
    /* C: allow_xx_yy is false for enexto() callers (GP_ALLOW_XY not set) */
    return null;
}
/* C ref: hack.h MON_AT — any monster (not youmonst) at (x,y)? */
function MON_AT(x, y) {
    for (let m = game.fmon; m; m = m.nmon) {
        if ((m.mhp | 0) < 1) continue; /* DEADMONSTER — C m_at/MON_AT reads the grid, which m_detach cleared */
        if (m.mx === x && m.my === y)
            return m;
    }
    return worm_seg_at(x, y); /* rm.h:533 tail segments live in the grid */
}
export function teleok(x, y, trapok) {
    if (!trapok) {
        /* C teleport.c:424-434: a real trap at the destination is disallowed
         * unless it is the vibrating square (not a real trap), or a pit/hole
         * that the hero would float over. */
        const trap = t_at(x, y);
        if (!trap)
            trapok = true;                                      /* C 428-429 */
        else if ((trap.ttyp | 0) === VIBRATING_SQUARE)
            trapok = true;                                      /* C 430-431 */
        else if ((is_pit(trap.ttyp | 0) || is_hole(trap.ttyp | 0))
                 && (Levitation_hero() || Flying_hero()))
            trapok = true;                                      /* C 432-434 */
        if (!trapok)
            return false;                                       /* C 436-437 */
    }
    /* goodpos(x, y, &gy.youmonst, 0) — inlined for the hero, in C's order. */
    if (!isok(x, y))                                            /* C 98-99 */
        return false;
    if (MON_AT(x, y))                                           /* C 127-129 */
        return false;
    if (is_pool_local(x, y)) {                                  /* C 133-140 */
        if (!(Swimming_hero() || Amphibious_hero()
            || (!Is_waterlevel_local() && !is_waterwall_local(x, y)
                && (Levitation_hero() || Flying_hero() || Wwalking_hero()))))
            return false;
    } else if (is_lava_local(x, y)) {                           /* C 148-157 */
        const uarmf = game.u?.uarmf;
        if (!(Levitation_hero() || Flying_hero()
            || (FireResistance_hero() && Wwalking_hero()
                && uarmf && uarmf.oerodeproof)))
            return false;
    } else {
        /* accessible(x,y): ACCESSIBLE(typ) && !closed_door(x,y) */
        const loc = game.level?.at(x, y);
        if (!loc) return false;
        const typ = loc.typ | 0;
        if (!ACCESSIBLE(typ)
            || (typ === DOOR && (loc.doormask & (D_CLOSED | D_LOCKED)) !== 0))
            return false;
        if (sobj_at(BOULDER, x, y)) return false;
    }
    const u = game.u || {};
    if (!tele_jump_ok(u.ux | 0, u.uy | 0, x, y)) return false;
    return in_out_region(x, y);
}

/* C teleport.c:380-418: restricted regions on special levels cannot be
 * crossed in either direction by teleportation. */
function tele_jump_ok(x1, y1, x2, y2) {
    if (!isok(x2, y2)) return false;
    for (const box of [game.dndest || {}, game.updest || {}]) {
        if ((box.nlx | 0) > 0) {
            const from = within_bounded_area(x1, y1, box.nlx, box.nly,
                                             box.nhx, box.nhy);
            const to = within_bounded_area(x2, y2, box.nlx, box.nly,
                                           box.nhx, box.nhy);
            if (from !== to) return false;
        }
    }
    return true;
}
/* C ref: teleport.c:448-577 teleds — relocate the hero to (nux,nuy).
 * Minimal C-faithful port for the random-teleport common case (no ball&chain,
 * not swallowed, not in a vault): reset utrap, clear ustuck, set u.ux0/uy0,
 * move hero, redraw old+new, recompute vision, nomul(0), and (when teleporting
 * with verbose) print the "You materialize..." message.  Consumes NO RNG.
 * C ref lines: 487-491 reset/ustuck/ux0, 525 u_on_newpos, 536-541 newsym/
 * vision, 545-547 materialize pline. */
export async function teleds(nux, nuy, teleds_flags) {
    const u = game.u;
    const is_teleport = (teleds_flags & TELEDS_TELEPORT) !== 0;
    const uball = u.uball;
    let ball_active = !!(uball && (uball.where | 0) !== OBJ_FREE);
    let ball_still_in_range = false;
    let allow_drag = true;
    if (!ball_active || near_capacity() > SLT_ENCUMBER
        || distmin(u.ux | 0, u.uy | 0, nux | 0, nuy | 0) > 1)
        allow_drag = false;
    /* C ref: teleport.c:481-487 — if the ball has to move, drag it when
     * allow_drag, otherwise this is a teleport, so take it off the map. */
    if (ball_active) {
        if (!carried(uball)
            && distmin(nux | 0, nuy | 0, uball.ox | 0, uball.oy | 0) <= 2)
            ball_still_in_range = true; /* don't have to move the ball */
        else if (!allow_drag)
            unplacebc(); /* have to move the ball */
    }
    /* C 487: reset_utrap(FALSE) */
    u.utrap = 0;
    /* C 488-489: was_swallowed = u.uswallow; set_ustuck(Null) clears uswallow */
    const was_swallowed = !!u.uswallow;
    set_ustuck(null);
    /* C 490-491: u.ux0 = u.ux; u.uy0 = u.uy */
    u.ux0 = u.ux | 0;
    u.uy0 = u.uy | 0;
    /* C 499-504: leaving an engulfer — ball&chain are off map while swallowed */
    if (was_swallowed) {
        if (u.uball) { /* Punished */
            ball_active = true;
            ball_still_in_range = allow_drag = false;
        }
        await docrt();
    }
    /* C ref: teleport.c:504-520 — the in-range / draggable arm.  drag_ball()
     * may itself decide dragging is impossible and teleport the ball on its
     * own, which is why C re-reads ball_active from uball->where afterwards. */
    if (ball_active && (ball_still_in_range || allow_drag)) {
        const bc_control = { value: 0 };
        const ballx = { value: 0 }, bally = { value: 0 };
        const chainx = { value: 0 }, chainy = { value: 0 };
        const cause_delay = { value: false };
        if (await drag_ball(nux | 0, nuy | 0, bc_control, ballx, bally,
                      chainx, chainy, cause_delay, allow_drag)) {
            move_bc(0, bc_control.value, ballx.value, bally.value,
                    chainx.value, chainy.value);
        } else {
            /* C 517-521 — dragging fails if the hero is encumbered beyond
             * 'burdened'; uball may have been cleared via drag_ball ->
             * spoteffects -> dotrap -> magic trap unpunishment. */
            ball_active = !!(u.uball && (u.uball.where | 0) !== OBJ_FREE);
            if (ball_active)
                unplacebc(); /* to match placebc() below */
        }
    }
    /* C 525: u_on_newpos(nux, nuy) — set hero coordinates.  Must come AFTER
     * drag_ball(), which needs the old position when allow_drag is true.
     * This was an INLINE copy of the assignment pair, so it skipped the rest of
     * u_on_newpos — in particular the same-level see_nearby_objects()
     * (dungeon.c:1595-1598), which is how a hero who arrives by teleport gets
     * dknown set on the piles they land next to.  Call the real one. */
    u_on_newpos(nux | 0, nuy | 0);
    /* C 526: fill_pit(u.ux0, u.uy0) */
    await fill_pit(u.ux0 | 0, u.uy0 | 0);
    /* C 527-528: put back the ball & chain if they were taken off the map. */
    if (ball_active && u.uchain && (u.uchain.where | 0) === OBJ_FREE)
        await placebc();
    /* C 536: newsym(u.ux0, u.uy0) — clear hero from old spot */
    newsym(u.ux0, u.uy0);
    see_monsters();
    /* C 538/541: vision_full_recalc then vision_recalc(0) before effects */
    vision_recalc(0);
    /* C 539: nomul(0) */
    nomul(0);
    newsym(u.ux, u.uy);
    /* C 545-547: materialize message (flags.verbose defaults On) */
    if (is_teleport && (game.flags?.verbose !== false)) {
        const same = (nux === u.ux0 && nuy === u.uy0);
        await pline(`You materialize in ${same ? 'the same' : 'a different'} location!`);
    }
    await check_special_room(false);
    /* The command-result publication used to sit immediately after the
     * materialize pline above, i.e. BEFORE spoteffects ran.  That snapshot is
     * what DESTROYED the room-entry message once check_special_room was wired:
     * js/allmain.js:2282's post-rhack wipe hands _pending_message to
     * _resultMessage only when `!g._resultMessage` (a command that already
     * published a result line owns the channel), so an early snapshot holding
     * just "You materialize in a different location!" made rhack discard the
     * accumulated "  You feel like you are being watched." outright — the
     * message WAS generated, and the topline it was joined onto was thrown
     * away.  Publish once, here, with the whole accumulated line, so the
     * update_topl reserve rule in flush_screen sees both plines and raises the
     * --More-- between them exactly where C does (topl.c:264: no join when
     * len(new) + len(committed) + 3 >= CO-8, and 36 + 39 + 3 = 78). */
    if (is_teleport && (game.flags?.verbose !== false)) {
        const _joins = _topl_joins_snapshot(game._pending_message);
        game._resultMessage = game._pending_message;
        game._pending_message = '';
        game._resultMessageJoins = { src: game._resultMessage, joins: (_joins || []).slice() };
        /* dotele() emits morehungry(100) after teleds returns.  Keep a marker so
         * allmain's post-rhack channel handoff appends that later pline to this
         * already-published teleport result instead of dropping it. */
        game._teleportResultPublished = true;
    }
    if (!game.in_steed_dismounting) {
        /* hack.c:3375-3394 — pickup(1) before dotrap unless the trap is a pit
         * (then after); a hero who jumps/teleports onto a trap springs it. */
        const _trap = t_at(u.ux | 0, u.uy | 0);
        const _pit = _trap && is_pit(_trap.ttyp | 0);
        if (!_pit) await _spoteffects_pickup();
        if (_trap) await dotrap(_trap, 0);
        if (_pit) await _spoteffects_pickup();
    }
    if (is_teleport && (game.flags?.verbose !== false)
        && game._resultMessage && game._pending_message) {
        const _rmj = game._resultMessageJoins;
        const _aHint = (_rmj && _rmj.src === game._resultMessage)
            ? _rmj.joins.slice() : undefined;
        game._resultMessage = _topl_merge_result(game._resultMessage,
                                                 game._pending_message, _aHint);
        game._pending_message = '';
        game._resultMessageJoins = {
            src: game._resultMessage,
            joins: (_topl_joins_snapshot(game._resultMessage) || []).slice(),
        };
    }
}
/* C ref: teleport.c:716-770 safe_teleds — try to teleport hero to a safe spot.
 * 40 fully random tries disallowing traps (rnd(COLNO-1)=rnd(79),
 * rn2(ROWNO)=rn2(21)); then a collect_coords ring-search fallback; then a
 * remembered backup trap-spot.  Returns TRUE on success. */
export async function safe_teleds(teleds_flags) {
    let nux, nuy;
    /* C 736-743: 40 random tries, traps disallowed */
    for (let tcnt = 0; tcnt < 40; ++tcnt) {
        nux = rnd(COLNO - 1);
        nuy = rn2(ROWNO);
        if (teleok(nux, nuy, false)) {
            await teleds(nux, nuy, teleds_flags);
            return true;
        }
    }
    /* C 745-763: shuffled candidate ring search */
    let cc_flags = CC_RING_PAIRS | CC_SKIP_MONS;
    cc_flags |= CC_SKIP_INACCS;
    const candy = collect_coords(game.u.ux | 0, game.u.uy | 0, 0, cc_flags, null);
    let backupx = 0, backupy = 0;
    for (let tcnt = 0; tcnt < candy.coords.length; ++tcnt) {
        nux = candy.coords[tcnt].x;
        nuy = candy.coords[tcnt].y;
        if (teleok(nux, nuy, false)) {
            await teleds(nux, nuy, teleds_flags);
            return true;
        }
        if (!backupx && t_at(nux, nuy) && teleok(nux, nuy, true)) {
            backupx = nux;
            backupy = nuy;
        }
    }
    /* C 764-768: use remembered trap spot if any */
    if (backupx) {
        await teleds(backupx, backupy, teleds_flags);
        return true;
    }
    return false;
}
/* C ref: dungeon.c:1907-1912 On_W_tower_level(d_level *lev) —
 *     Is_wiz1_level(lev) || Is_wiz2_level(lev) || Is_wiz3_level(lev)
 * where each Is_wizN_level is on_level(lev, &dungeon_topology.d_wizN_level)
 * (dungeon.h).  The three topology slots are filled by the dungeon generator
 * (js/dungeon_rng.js:534-542 game.wiz1_level/wiz2_level/wiz3_level). */
/* C ref: youprop.h Teleport_control := (HTeleport_control || ETeleport_control)
 * and Stunned := (HStun || EStun) — the intrinsic/extrinsic pair of one
 * u.uprops[] slot, the port-wide shape (js/display.js:3090 etc). */
function Teleport_control(u) {
    const p = u && u.uprops && u.uprops[TELEPORT_CONTROL];
    return !!(p && (p.intrinsic || p.extrinsic));
}
function Stunned(u) {
    const p = u && u.uprops && u.uprops[STUNNED];
    return !!(p && p.intrinsic);
}

function On_W_tower_level(uz) {
    if (!uz)
        return false;
    const g = game;
    for (const lv of [g.wiz1_level, g.wiz2_level, g.wiz3_level]) {
        /* C ref: dungeon.c on_level — same dnum AND same dlevel. */
        if (lv && (lv.dnum | 0) === (uz.dnum | 0) && (lv.dlevel | 0) === (uz.dlevel | 0))
            return true;
    }
    return false;
}

/* C ref: trap.c:6756-6767 unconscious() —
 *     if (gm.multi >= 0) return FALSE;
 *     return (u.usleep || (gn.nomovemsg && (..."You awake"/"You regain con"/
 *                                            "You are consci")));
 * gm.multi is game.multi in this port (js/allmain.js nomul/unmul). */
function unconscious() {
    const g = game;
    if ((g.multi | 0) >= 0)
        return false;
    if (g.u && g.u.usleep)
        return true;
    const nmm = g.nomovemsg;
    return !!(nmm && (nmm.startsWith('You awake')
                      || nmm.startsWith('You regain con')
                      || nmm.startsWith('You are consci')));
}

export async function scrolltele(scroll) {
    const g = game, u = g.u;
    const cc = { x: 0, y: 0 };
    /* C ref: the `wizard` global — this port's debug-playmode flag
     * (js/options.js:62-63 OPTIONS=playmode:debug → flags.debug). */
    const wizard = !!(g.flags && g.flags.debug);

    /* C 853-859: disable teleportation in stronghold && Vlad's Tower. */
    if (noteleport_level({ data: permonstTemplate(u.umonnum | 0) }) && !wizard) {
        await pline('A mysterious force prevents you from teleporting!');
        if (scroll)
            learnscroll(scroll); /* this is obviously a teleport scroll */
        return;
    }

    /* C 861-863 `if (!Blinded) make_blinded(0L, FALSE);` — make_blinded is a
     * canonical helper clears transient blindness and the hero is not Blinded on
     * any path that reaches here, so this call is normally a no-op.
     * It consumes no RNG either way. */
    if (!Blind_local())
        make_blinded(0, false);

    /* C 865-871: carrying the Amulet or standing on a Wizard's-Tower level
     * makes the teleport misfire 1-in-3.  RNG-LOAD-BEARING: the rn2(3) is
     * short-circuited away unless the left operand holds. */
    if ((!!(u.uhave && u.uhave.amulet) || On_W_tower_level(u.uz)) && !rn2(3)) {
        /* C ref: pline.c You_feel(x) → pline("You feel %s", x). */
        await pline('You feel disoriented for a moment.');
        /* C 867-870: if (!wizard || y_n("Override?") != 'y') return;
         * y_n(query) is yn_function(query, ynchars, 'n', TRUE) (hack.h). */
        if (!wizard || (await yn_function('Override?', 'yn', 'n', true)) !== 'y')
            return;
    }

    /* C 872-873 */
    if (((Teleport_control(u) || (scroll && scroll.blessed)) && !Stunned(u))
        || wizard) {
        if (unconscious()) {                                    /* C 874-875 */
            await pline('Being unconscious, you cannot control your teleport.');
        } else {
            /* C 878-882 */
            let whobuf = 'you';
            if (u.usteed)
                whobuf += ` and ${mon_nam(u.usteed)}`;
            await pline(`Where do ${whobuf} want to be teleported?`);
            if (scroll)                                         /* C 883-884 */
                learnscroll(scroll);
            cc.x = u.ux | 0;                                    /* C 885-886 */
            cc.y = u.uy | 0;
            /* C 887-891: `if (isok(iflags.travelcc.x, iflags.travelcc.y)) cc =
             * iflags.travelcc;` — "the player showed some interest in
             * traveling here; pre-suggest this coordinate".
             *
             * The note that stood here called this unreachable because
             * "dotravel()'s ... getpos target pick is unported".  It is ported
             * now, so iflags.travelcc really is written, and the two halves of
             * the old claim have to come back together: js/cmd.js dotele() now
             * makes teleport.c:1150's clear, so the ^T path still arrives with
             * travelcc zeroed, but a scroll of teleportation read WITHOUT
             * dotele (read.c -> scrolltele) does not clear it and C's
             * pre-suggest fires there. */
            if (isok(g.iflags?.travelcc?.x | 0, g.iflags?.travelcc?.y | 0)) {
                cc.x = g.iflags.travelcc.x | 0;
                cc.y = g.iflags.travelcc.y | 0;
            }
            if ((await getpos(cc, true, 'the desired position')) < 0)
                return; /* abort */                             /* C 892-893 */
            /* possible extensions: introduce a small error if
               magic power is low; allow transfer to solid rock */
            if (teleok(cc.x, cc.y, false)) {                    /* C 896-903 */
                /* for scroll, discover it regardless of destination */
                await teleds(cc.x, cc.y, TELEDS_TELEPORT);
                /* C 899-900: `if (u_at(iflags.travelcc.x, iflags.travelcc.y))
                 *     iflags.travelcc.x = iflags.travelcc.y = 0;`
                 * — same field as the pre-suggest above, which dotravel() does
                 * write now. */
                if (g.iflags?.travelcc
                    && u_at(g.iflags.travelcc.x | 0, g.iflags.travelcc.y | 0))
                    g.iflags.travelcc.x = g.iflags.travelcc.y = 0;
                return;
            }
            await pline('Sorry...');                            /* C 904 */
        }
    }

    /* we used to suppress discovery if hero teleported to a nearby
       spot which was already within view, but now there is always a
       "materialize" message regardless of how far you teleported so
       discovery of scroll type is unconditional */
    if (scroll)                                                 /* C 912-913 */
        learnscroll(scroll);

    await safe_teleds(TELEDS_TELEPORT);                         /* C 914 */
}
/* C ref: teleport.c:840-845 tele — teleport via a non-scroll method. */
export async function tele() {
    await scrolltele(null);
}
export function next_to_u() {
    /* C: get_iter_mons(mleashed_next2u) — any leashed monster more than one
     * square away (apply.c:905-916) aborts the teleport. */
    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        if (mtmp.mhp <= 0 || (mtmp.mstate | 0))
            continue;
        if (mtmp.mleashed
            && distmin(mtmp.mx | 0, mtmp.my | 0, game.u.ux | 0, game.u.uy | 0) > 1)
            return false;
    }
    /* C 924-926: no pack mules for the Amulet */
    if (game.u.usteed && mon_has_amulet(game.u.usteed))
        return false;
    return true;
}

/* C ref: teleport.c:772-783 vault_tele — the "once" teleport trap's
 * destination is the level's VAULT, not a random square.  mklev's makevtele()
 * plants exactly one such trap on any level that got a vault (mklev.c:821-824
 * makeniche(TELEP_TRAP), whose ttmp->once = 1 is already ported at
 * js/mklev.js:10436), and stepping on it is how the hero gets into the vault
 * without digging.  RNG-LOAD-BEARING: somexyspace() draws somex()/somey()
 * inside the 2x2 vault (rn2(2) twice), where a fall-through to tele() draws
 * safe_teleds' rnd(COLNO-1)/rn2(ROWNO) instead. */
async function vault_tele() {
    const croom = search_special(VAULT);
    const c = { x: 0, y: 0 };

    if (croom && somexyspace(croom, c) && teleok(c.x, c.y, false)) {
        await teleds(c.x, c.y, TELEDS_TELEPORT);
        return;
    }
    await tele();
}

export async function tele_trap(trap) {
    /* C 1493-1499: a fixed-destination teleport trap could theoretically place
     * hero onto a second teleport trap; prevent the recursive call from
     * spoteffects() from triggering the trap at the destination. */
    if (_in_tele_trap)
        return;

    _in_tele_trap = true;
    try {
        const u = game.u;
        /* C ref: youprop.h Antimagic := (HAntimagic || EAntimagic). */
        const antimagic = _u_antimagic();
        if (In_endgame(u.uz) || antimagic
            || noteleport_level({ data: permonstTemplate(u.umonnum | 0) })) {
            if (antimagic)
                shieldeff(u.ux | 0, u.uy | 0);
            await pline('You feel a wrenching sensation.');
        } else if (!next_to_u()) {
            await pline(shudder_for_moment);
        } else if (trap.once) {
            deltrap(trap);
            newsym(u.ux | 0, u.uy | 0); /* get rid of trap symbol */
            await vault_tele();
        } else if (isok((trap.teledest?.x | 0), (trap.teledest?.y | 0))) {
            const cc = { x: 0, y: 0 };
            let mtmp = m_at((trap.teledest.x | 0), (trap.teledest.y | 0));

            settrack();
            if (mtmp) {
                if (!enexto(cc, mtmp.mx | 0, mtmp.my | 0, mtmp.data)) {
                    /* could not find some other place to put mtmp; the level
                     * must be nearly or completely full */
                    await pline(shudder_for_moment);
                } else {
                    await rloc_to(mtmp, cc.x, cc.y);
                    mtmp = null; /* no longer a monster at dest */
                }
            }
            if (!mtmp) {
                await teleds((trap.teledest.x | 0), (trap.teledest.y | 0),
                             TELEDS_TELEPORT);
            }
        } else {
            await tele();
        }
    } finally {
        _in_tele_trap = false;
    }
}
/* C ref: teleport.c:1496 `static boolean in_tele_trap` — file-scope, and the
 * `finally` above is what C's unconditional reset at 1533 buys us. */
let _in_tele_trap = false;
/* C ref: teleport.c:1301 etc — the shared "You shudder for a moment." string
 * (You1(shudder_for_moment), hack.h). */
const shudder_for_moment = 'You shudder for a moment.';
export async function domagicportal(ttmp) {
    const u = game.u;

    /* C 1450-1451: struck a buried ball while off-balance from the portal. */
    if (u.utrap && (u.utraptype | 0) === TT_BURIEDBALL)
        await _buried_ball_to_punishment_dmp();

    /* C 1453-1456 */
    if (!next_to_u()) {
        await pline(shudder_for_moment); /* C: You1(shudder_for_moment) */
        return;
    }

    /* C 1458-1461: if landed from another portal, do nothing.
     * ("problem: level teleport landing escapes the check" — C's own note.) */
    if (!on_level(u.uz, u.uz0))
        return;

    /* C 1463 */
    await pline('You activated a magic portal!'); /* C: You("activated a magic portal!") */

    /* C 1465-1472: amulet-in-endgame safety valve. */
    if (In_endgame(u.uz) && !(u.uhave && u.uhave.amulet)) {
        await pline('You feel dizzy for a moment, but nothing happens...');
        return;
    }

    /* C 1474: target_level = ttmp->dst (struct copy, not an alias). */
    const target_level = { dnum: ttmp.dst?.dnum | 0, dlevel: ttmp.dst?.dlevel | 0 };

    let totype, stunmsg;
    /* C 1476-1486 */
    if (In_tutorial(u.uz) && !In_tutorial(target_level)) {
        totype = _UTOTYPE_ATSTAIRS_DMP;
        stunmsg = 'Resuming regular play.';
    } else {
        totype = _UTOTYPE_PORTAL_DMP;
        /* C 1483-1484: Stunned is #define Stunned HStun (youprop.h:80-81) —
         * INTRINSIC ONLY; there is no EStun in 5.0.  The file-local Stunned()
         * helper above ORs in .extrinsic, which is the wrong predicate here. */
        stunmsg = !_HStun_dmp(u) ? 'You feel slightly dizzy.' : 'You feel dizzier.';
        make_stunned((_HStun_dmp(u) & TIMEOUT) + 3, false);
    }

    /* C 1488 */
    schedule_goto(target_level, totype, stunmsg, null);
}
/* C do.h UTOTYPE_ATSTAIRS/UTOTYPE_PORTAL — the canonical values are the
 * unexported consts at js/cmd.js:10376,10378; duplicated here (same numbers)
 * because that file does not export them. */
const _UTOTYPE_ATSTAIRS_DMP = 0x01;
const _UTOTYPE_PORTAL_DMP = 0x04;
/* C youprop.h:107 HStun = u.uprops[STUNNED].intrinsic — domagicportal's own
 * read of the raw timeout value (Stunned() above only exposes the boolean). */
function _HStun_dmp(u) {
    const p = u && u.uprops && u.uprops[STUNNED];
    return (p && p.intrinsic) | 0;
}
/* C dig.c buried_ball_to_punishment — not ported anywhere in this port (its
 * only existing stub, js/cmd.js:39516, is file-private and unconditionally
 * throws).  Mirrors that stub's faithful-absence convention rather than
 * silently no-opping: TT_BURIEDBALL is a real, if rare, u.utraptype value and
 * a silent no-op here would hide the gap instead of surfacing it. */
async function _buried_ball_to_punishment_dmp() {
    return await buried_ball_to_punishment();
}
/* C ref: youprop.h:57 Antimagic = (HAntimagic || EAntimagic) — the
 * intrinsic/extrinsic pair of the one ANTIMAGIC uprops slot, read the same way
 * Teleport_control()/Stunned() above read theirs. */
function _u_antimagic() {
    const p = game.u && game.u.uprops && game.u.uprops[ANTIMAGIC];
    return !!(p && (p.intrinsic || p.extrinsic));
}

export const RLOC_NOMSG = 0x04;
const RLOC_ERR = 0x01;

/* ══ C mon.c:3955-4084 — enexto / mnexto / mnearto ═══════════════════════════
 * These three live HERE, next to enexto_core and rloc_to_flag, because they are
 * the only thing between the two and both of their callers (js/dochug.js's
 * covetous tactics() and js/shk.js's shopkeeper relocation) already import this
 * module.  js/shk.js:2582 used to export an EMPTY mnexto whose comment said the
 * blocker was enexto/collect_coords -- both of which are ported in this file
 * (:78 and :237) -- and js/shk.js:2587 kept a module-local mnearto that
 * returned 0 from both the move_other and the !goodpos arms for the same stated
 * reason.  One body each, exported, rather than a third copy per caller. */

/* C teleport.c:196 enexto(cc, xx, yy, mdat) —
 *     enexto_core(cc, xx, yy, mdat, GP_CHECKSCARY)
 *     || enexto_core(cc, xx, yy, mdat, NO_MM_FLAGS)
 * Named enexto_out here because this file also keeps C's out-param spelling
 * `enexto(cc, x, y, mdat)` (:1282) for the two call sites that use it.
 * enexto_core takes an already-built `fakemon` (C's fakemon after
 * set_mon_data); built here the same way js/mklev.js:4517 builds it for
 * makemon's byyou relocation.  Returns {x,y} or null.  CONSUMES RNG:
 * collect_coords shuffles rings 1..3 (7 + 15 + 23 draws). */
export function enexto_out(xx, yy, mdat) {
    const mndx = (mdat && (mdat.pmidx ?? mdat.mnum)) | 0;
    const fakemon = mdat == null ? null
        : { data: permonstTemplate(mndx), mnum: mndx, m_id: 0, wormno: 0,
            mx: 0, my: 0, minvent: null };
    return enexto_core(xx, yy, fakemon, GP_CHECKSCARY)
        || enexto_core(xx, yy, fakemon, NO_MM_FLAGS);
}
/* C mon.c:3878-3948 elemental_clog().  End-game levels cannot simply discard
 * an overcrowded monster: C first removes an eligible occupant (foreign
 * elementals, then home elementals, then the weakest non-tame monster, then
 * another non-tame monster, then a pet), and finally migrates the incoming
 * monster to the preceding plane.  This is deliberately stateful and keeps
 * the one C RNG draw used to throttle the "besieged" message. */
export async function elemental_clog(mon) {
    const u = game.u || {};
    if (!In_endgame(u.uz))
        return;
    const last = game._elementalClogMessageMove | 0;
    if (!last || ((game.moves | 0) - last) > 200) {
        if (!last || rn2(2))
            pline('You feel besieged.');
        game._elementalClogMessageMove = game.moves | 0;
    }

    let foreign = null, home = null, weakest = null, other = null, pet = null;
    let weakestLevel = 0;
    for (let cur = game.fmon; cur; cur = cur.nmon) {
        if (cur === mon || (cur.mhp | 0) <= 0 || ((cur.mx | 0) === 0 && (cur.my | 0) === 0))
            continue;
        if (mon_has_amulet(cur) || !ok_to_obliterate_tp(cur))
            continue;
        if ((cur.data?.mlet | 0) === S_ELEMENTAL_MTT) {
            if (!is_home_elemental(cur.data)) {
                if (!foreign) foreign = cur;
            } else if (!home) home = cur;
        } else if (!cur.mtame) {
            const level = (cur.m_lev ?? cur.mlevel ?? cur.mlvl ?? 0) | 0;
            if (!weakestLevel || level < weakestLevel) {
                weakestLevel = level;
                weakest = cur;
            } else if (!other) {
                other = cur;
            }
        } else if (!pet) {
            pet = cur;
            break; // C stops after finding the first pet.
        }
    }
    const victim = foreign || home || weakest || other || pet;
    if (victim) {
        const x = victim.mx | 0, y = victim.my | 0;
        victim.mstate = ((victim.mstate | 0) | MON_OBLITERATE) >>> 0;
        await mongone(victim);
        await rloc_to(mon, x, y);
    } else if (!Is_astralevel(u.uz)) {
        const dest = { dnum: u.uz?.dnum | 0, dlevel: ((u.uz?.dlevel | 0) - 1) | 0 };
        mon.mstate = ((mon.mstate | 0) | MON_ENDGAME_MIGR) >>> 0;
        await migrate_to_level(mon, ledger_no_tp(dest), MIGR_RANDOM_MTT, null);
    }
}

function ok_to_obliterate_tp(mon) {
    /* C mon.c:3858-3867: preserve uniquely important or attached monsters. */
    const pm = mon.data;
    const n = pm?.pmidx ?? pm?.mnum;
    return (n | 0) !== PM_WIZARD_OF_YENDOR
        && !is_rider(pm)
        && !mon.mextra?.emin && !mon.mextra?.epri && !mon.mextra?.eshk
        && mon !== game.u?.ustuck && mon !== game.u?.usteed;
}

/* C mon.c:3985 deal_with_overcrowding(mtmp). */
export async function deal_with_overcrowding(mtmp) {
    if (In_endgame(game.u?.uz))
        await elemental_clog(mtmp);
    else
        await m_into_limbo(mtmp);
}
/* C mon.c:3955 mnexto(mtmp, rlocflags) — "make monster mtmp next to you (if
 * possible); might place monst on far side of a wall or boulder". */
export async function mnexto(mtmp, rlocflags) {
    const u = game.u;
    if (mtmp === u.usteed) {
        /* Keep your steed in sync with you instead */
        mtmp.mx = u.ux | 0;
        mtmp.my = u.uy | 0;
        return;
    }
    const mm = enexto_out(u.ux | 0, u.uy | 0, mtmp.data);
    if (!mm || !isok(mm.x, mm.y)) {
        await deal_with_overcrowding(mtmp);
        return;
    }
    /* C mon.c:3971-3979: wizard-mode 'montelecontrol' option; enexto()'s
     * value for mm is the default, savemm keeps the player from choosing the
     * hero's location and then overriding the invalid-spot prompt. */
    if ((game.iflags?.mon_telecontrol || game.iflags?.montelecontrol)) {
        const savemm = { x: mm.x, y: mm.y };
        if (!(await control_mon_tele(mtmp, mm, rlocflags, false))) {
            mm.x = savemm.x;
            mm.y = savemm.y;
        }
    }
    await rloc_to_flag(mtmp, mm.x, mm.y, rlocflags);
}
/* C mon.c:3997-4017 maybe_mnexto(mtmp) — "like mnexto() but requires
 * destination to be directly accessible".  Unlike mnexto it never falls back
 * to deal_with_overcrowding: a failed enexto() or 20 exhausted tries simply
 * leaves the monster where it was, which is exactly how kick_monster's caller
 * detects "it did not dodge" (it re-reads mtmp->mx/my after the call).
 *
 * RNG-BEARING, and the loop is the reason: enexto_out() runs collect_coords,
 * which shuffles rings 1..3, so EACH of the up-to-20 tries draws.  A candidate
 * that is not couldsee() (or is a diagonal for a grid bug) is rejected and the
 * whole enexto is re-run — the draws are not deduplicated. */
export async function maybe_mnexto(mtmp) {
    const u = game.u;
    const ptr = mtmp.data;
    const diagok = !NODIAG_TP((ptr && (ptr.pmidx ?? ptr.mnum)) | 0);
    let tryct = 20;

    do {
        const mm = enexto_out(u.ux | 0, u.uy | 0, ptr);
        if (!mm)
            return;
        if (couldsee(mm.x, mm.y)
            /* don't move grid bugs diagonally */
            && (diagok || mm.x === (mtmp.mx | 0) || mm.y === (mtmp.my | 0))) {
            /* [this doesn't honor the 'montelecontrol' option] */
            await rloc_to(mtmp, mm.x, mm.y);
            return;
        }
    } while (--tryct > 0);
}
/* C hack.h:1414 NODIAG(monnum) = ((monnum) == PM_GRID_BUG) */
function NODIAG_TP(monnum) { return (monnum | 0) === PM_GRID_BUG_TP; }
const PM_GRID_BUG_TP = 116; /* js/pm.generated.js PM_GRID_BUG */
/* C mon.c:4031 mnearto(mtmp, x, y, move_other, rlocflags) — 2 if another
 * monster was displaced, 1 on success, 0 on failure. */
export async function mnearto(mtmp, x, y, move_other, rlocflags) {
    let othermon = null;
    let res = 1;

    if ((mtmp.mx | 0) === x && (mtmp.my | 0) === y && m_at(x, y) === mtmp)
        return res;

    if (move_other && (othermon = m_at(x, y)) != null) {
        /* take othermon off the map; it might end up immediately returning
           but for the moment it is leaving */
        await mon_leaving_level(othermon);
        othermon.mx = 0; othermon.my = 0; /* 'othermon' is not on the map */
        othermon.mstate = ((othermon.mstate | 0) | MON_OFFMAP_TP) >>> 0;
    }

    let newx = x, newy = y;
    if (!goodpos_tp(newx, newy, mtmp, 0)) {
        /* "Actually we have real problems if enexto ever fails." */
        const mm = enexto_out(newx, newy, mtmp.data);
        if (!mm || !isok(mm.x, mm.y)) {
            if (othermon)
                await deal_with_overcrowding(othermon);
            return 0;
        }
        newx = mm.x; newy = mm.y;
    }
    /* [this doesn't honor the 'montelecontrol' option] */
    await rloc_to_flag(mtmp, newx, newy, rlocflags);

    if (move_other && othermon) {
        res = 2; /* moving another monster out of the way */
        /* 'move_other'==FALSE this time; fail rather than recurse */
        if (!await mnearto(othermon, x, y, false, rlocflags))
            await deal_with_overcrowding(othermon);
    }
    return res;
}
/* C monst.h:59 MON_OFFMAP. */
const MON_OFFMAP_TP = 0x01;

export async function rloc_to(mtmp, x, y) {
    await rloc_to_core(mtmp, x, y, RLOC_NOMSG);
}

export async function rloc_to_flag(mtmp, x, y, rlocflags) {
    await rloc_to_core(mtmp, x, y, rlocflags);
}

/* C ref: teleport.c:1644-1768 rloc_to_core — shared engine behind
 * rloc_to()/rloc_to_flag(): pick mtmp up from its old spot, drop it at
 * <x,y>, and run the follow-on effects (worm tail, hero-swallow handling,
 * unhiding, vision refresh, orientation via set_apparxy, teleport
 * messaging, shop-goods blame, occupation interrupt, trap re-check).
 * Synchronous, like C.  It used to be `async` purely because pline() carries
 * an (unused) async signature — pline's body is entirely synchronous, it only
 * appends to the topline buffer.  The async form made every caller that did
 * not `await` silently reorder rloc's tail behind its own continuation AND
 * swallow any throw as an unhandled rejection, which is how a missing
 * relocation message can look like a taken branch that produced nothing. */
async function rloc_to_core(mtmp, x, y, rlocflags) {
    const u = game.u;
    const oldx = mtmp.mx | 0, oldy = mtmp.my | 0;
    /* C 1651: resident_shk = mtmp->isshk && inhishop(mtmp) */
    const resident_shk = !!(mtmp.isshk && inhishop(mtmp));
    /* C 1652-1656 */
    const preventmsg = (rlocflags & RLOC_NOMSG) !== 0;
    const vanishmsg = (rlocflags & RLOC_MSG) !== 0;
    let appearmsg = ((mtmp.mstrategy | 0) & STRAT_APPEARMSG) !== 0;
    const domsg = !game.in_mklev && (vanishmsg || appearmsg) && !preventmsg;
    let telemsg = false;

    /* C 1658-1659 */
    if (x === (mtmp.mx | 0) && y === (mtmp.my | 0) && MON_AT(x, y) === mtmp)
        return; /* that was easy */

    if (oldx) { /* "pick up" monster */
        if (domsg && canspotmon(mtmp)) {
            if (couldsee(x, y) || sensemon(mtmp)) {
                telemsg = true;
            } else {
                pline(`${Monnam(mtmp)} vanishes!`);
            }
            /* avoid "It suddenly appears!" for a STRAT_APPEARMSG monster
               that has just teleported away if we won't see it after this
               vanishing (the regular appears message will be given if we
               do see it) */
            appearmsg = false;
        }

        if (mtmp.wormno) {
            remove_worm_local(mtmp);
        } else {
            remove_monster_local(oldx, oldy);
            newsym(oldx, oldy); /* update old location */
        }
    }

    mon_track_clear(mtmp);
    place_monster_local(mtmp, x, y); /* put monster down */
    update_monster_region_local(mtmp);

    if (mtmp.wormno) /* now put down tail */
        place_worm_tail_randomly_local(mtmp, x, y);

    if (u.ustuck === mtmp) {
        if (u.uswallow) {
            u.ux = mtmp.mx | 0;
            u.uy = mtmp.my | 0;
        } else if (dist2(mtmp.mx | 0, mtmp.my | 0, u.ux | 0, u.uy | 0) <= 2) {
            /* C teleport.c:1695 `!m_next2u(mtmp)`; you.h:553
               m_next2u(m) = distu(m->mx, m->my) <= 2, and hack.h:1536
               distu(x,y) = dist2(x, y, u.ux, u.uy) — so the threshold is 2,
               not 4. Adjacency means |dx|,|dy| <= 1, whose largest dist2 is
               1*1 + 1*1 = 2; 4 would also admit the orthogonal
               two-squares-away cell. No-op branch: monster stays put. */
        } else {
            await unstuck(mtmp);
        }
    }

    maybe_unhide_at(x, y);
    newsym(x, y);      /* update new location */
    set_apparxy(mtmp); /* orient monster */

    if (domsg && (canspotmon(mtmp) || appearmsg || mtmp === u.ustuck)) {
        const du = dist2(x, y, u.ux | 0, u.uy | 0);
        const next = (du <= 2) ? " next to you" : null; /* C teleport.c:1705 `(du <= 2)`, next2u() */
        const nearu = (du <= BOLT_LIM * BOLT_LIM) ? " close by" : null;

        set_msg_xy_local(x, y);
        mtmp.mstrategy = ((mtmp.mstrategy | 0) & ~STRAT_APPEARMSG) >>> 0; /* one chance only */
        if (mtmp === u.ustuck && !(u.ux0 === u.ux && u.uy0 === u.uy)) {
            You(`and ${mon_nam(mtmp)} teleport together.`);
        } else if (telemsg && (couldsee(x, y) || sensemon(mtmp))) {
            const olddu = dist2(oldx, oldy, u.ux | 0, u.uy | 0);
            const suffix = next ? next
                : nearu ? nearu
                : (olddu === du) ? ""
                : (du < olddu) ? " closer to you" : " farther away";
            pline(`${Monnam(mtmp)} vanishes and reappears${suffix}.`);
        } else {
            const nm = appearmsg ? Amonnam(mtmp) : Monnam(mtmp);
            const sudden = appearmsg ? "suddenly " : "";
            const verb = !Blind_local() ? "appears" : "arrives";
            const tail = next ? next : (nearu ? nearu : "");
            pline(`${nm} ${sudden}${verb}${tail}!`);
        }
    }

    /* shopkeepers will only teleport if you zap them with a wand of
       teleportation or if they've been transformed into a jumpy monster */
    if (resident_shk && !inhishop(mtmp))
        make_angry_shk_local(mtmp, oldx, oldy);

    /* if a monster carrying shop goods teleports out of the shop, blame
       it on the hero */
    if (mtmp.minvent && !costly_spot(x, y)) {
        const shkp = await find_objowner(mtmp.minvent, oldx, oldy);
        const peaceful = !shkp || shkp.mpeaceful;

        for (let otmp = mtmp.minvent; otmp; otmp = otmp.nobj) {
            if (otmp.no_charge)
                otmp.no_charge = 0;
            else if (shkp && (await onshopbill_local(otmp, shkp, true)))
                stolen_value_local(otmp, oldx, oldy, peaceful, false);
        }
    }

    /* if hero is busy, maybe stop occupation */
    if (game.occupation)
        /* dochugw is async now (dochug -> mattacku -> breamu -> dobuzz); with
         * chug === false no await is reached, so the body still runs to
         * completion synchronously here. */
        await dochugw(mtmp, false);

    /* trapped monster teleported away */
    if (mtmp.mtrapped && !mtmp.wormno)
        await mintrap(mtmp, NO_TRAP_FLAGS);
}


function remove_worm_local(mdef) { return remove_worm_real(mdef); }

function remove_monster_local(x, y) {
    const mtmp = MON_AT(x, y);
    if (!mtmp)
        return;
    mtmp.mstate = (mtmp.mstate | 0) | MON_DETACH;
    mtmp.mx = 0;
    mtmp.my = 0;
}

/* C ref: region.c:597-610 update_monster_region — adds/removes the monster
 * from every region it now does/doesn't occupy.  The complete implementation
 * already lives in region.js; this caller used to discard it behind a local
 * no-op, which made the teleport path wrong as soon as a region is active. */
function update_monster_region_local(mtmp) {
    return update_monster_region_real(mtmp);
}

function place_worm_tail_randomly_local(mdef, fx, fy) { return place_worm_tail_randomly_real(mdef, fx, fy); }

/* C ref: pline.c:93-97 set_msg_xy — record the map coordinate that owns the
 * next message.  The terminal renderer does not currently consume this
 * channel, but retaining it matters: rloc_to_core() calls set_msg_xy() before
 * its arrival message, and accessibility/message-color consumers read the
 * same a11y state in the C runtime.  Keep the field available even in replay
 * states which predate the a11y box. */
function set_msg_xy_local(x, y) {
    game.a11y = game.a11y || {};
    game.a11y.msg_loc = { x: x | 0, y: y | 0 };
}

/* C ref: youprop.h Blind macro (HBlind|EBlind, not blocked). Local copy —
 * this file has no existing hero-blindness reader to import safely. */
function Blind_local() {
    const p = game.u?.uprops?.[BLINDED_TP];
    if (p && (((p.intrinsic | 0) || (p.extrinsic | 0))
              && !(p.blocked | 0)))
        return true;
    /* C youprop.h: Blind also includes !haseyes(youmonst.data).  The old
     * property-only spelling made an eyeless polymorph announce that a
     * teleported monster "appears" rather than "arrives". */
    const data = game.youmonst?.data;
    return !!data && (((data.mflags1 | 0) & M1_NOEYES) !== 0);
}
/* js/const.js:2327 BLINDED — the numeric prop index. */
const BLINDED_TP = 15;

async function onshopbill_local(obj, shkp, silent) { return await onshopbill(obj, shkp, silent); }
function stolen_value_local(_obj, _x, _y, _peaceful, _silent) {
    void _obj; void _x; void _y; void _peaceful; void _silent;
    return 0;
}
function make_angry_shk_local(_mtmp, _oldx, _oldy) { /* not yet ported: make_angry_shk (unreached: isshk always 0 in scope) */ }

/* C ref: mondata.h DEADMONSTER(mon) macro — ((mon)->mhp <= 0). */
function DEADMONSTER(mon) {
    return (mon.mhp | 0) <= 0;
}

function place_monster_local(mon, x, y) {
    if (!isok(x, y) && (x !== 0 || y !== 0 || !mon.isgd)) {
        /* impossible(...) no-op (describe_level's buf feeds only that
         * message); x=y=0 fallback kept for state fidelity. */
        x = 0; y = 0;
    }
    if ((mon === game.u.usteed && !game.in_steed_dismounting)
        || (DEADMONSTER(mon) && !(mon.isgd && x === 0 && y === 0))) {
        /* impossible(...) no-op; C returns WITHOUT setting mon->mx/my —
         * port the bug: a dead/steed monster silently fails to move. */
        return;
    }
    /* othermon-occupied case: impossible() no-op only, no control-flow
       effect — falls through to the placement below either way. */
    mon.mx = x;
    mon.my = y;
    delete mon._mapRemoved;
    mon.mstate = MON_FLOOR;
}

/* local copy: control_teleport (from js/eat.js, not exported) */
const M1_TPORT_CNTRL = 0x04000000;
function control_teleport(ptr) {
    return ((ptr.mflags1 & M1_TPORT_CNTRL) !== 0) ? 1 : 0;
}

/* local copy: is_rider (from js/mklev.js, not exported) */
function is_rider(ptr) {
    const n = ptr?.pmidx ?? ptr?.mnum ?? ptr?.mndx;
    return (n | 0) === 311 || (n | 0) === 312 || (n | 0) === 313;
}

function enexto(cc, ux, uy, data) {
    const mm = enexto_out(ux, uy, data);
    if (!mm)
        return false;
    cc.x = mm.x; cc.y = mm.y;
    return true;
}


const S_EEL = 57;
const S_HUMAN = 53;
const S_VAMPIRE = 48;
const S_ANGEL = 27;
const BOULDER = 475;
/* otyp of the scare monster scroll. objects.h enumerates the scrolls in
 * source order starting at SCR_ENCHANT_ARMOR: enchant armor 323, destroy
 * armor 324, confuse monster 325, scare monster 326, remove curse 327,
 * enchant weapon 328 — which is why the neighbouring SCR_ENCHANT_ARMOR=323
 * and SCR_ENCHANT_WEAPON=328 in js/mkobj.js and js/mklev.js bracket it at
 * 326. This file previously declared 344, disagreeing with both siblings. */
const SCR_SCARE_MONSTER = 326;
const M1_SWIM = 0x00000002;
const M1_AMORPHOUS = 0x00000004;
const M1_WALLWALK = 0x00000008;
const M1_AMPHIBIOUS = 0x00000200;
const M1_NOEYES = 0x00001000;
const M2_ROCKTHROW = 0x08000000;
const M2_MINION = 0x00001000;
const G_UNIQ = 0x1000;
const A_LAWFUL = 1;

function is_swimmer(mdat) { return ((mdat.mflags1 | 0) & M1_SWIM) !== 0; }
function amorphous(mdat) { return ((mdat.mflags1 | 0) & M1_AMORPHOUS) !== 0; }
function passes_walls(mdat) { return ((mdat.mflags1 | 0) & M1_WALLWALK) !== 0; }
function throws_rocks(mdat) { return ((mdat.mflags2 | 0) & M2_ROCKTHROW) !== 0; }
function unique_corpstat_local(mdat) { return ((mdat.geno | 0) & G_UNIQ) !== 0; }
function is_minion_local(mdat) { return ((mdat.mflags2 | 0) & M2_MINION) !== 0; }
/* C ref: monst.h:279-280 is_lminion(mon) = is_minion(mon->data) &&
 * mon_aligntyp(mon) == A_LAWFUL. mon_aligntyp is js/priest.js's real,
 * already-ported implementation, imported at the top of this file. */
function is_lminion_local(mtmp) {
    return is_minion_local(mtmp.data) && mon_aligntyp(mtmp) === A_LAWFUL;
}

/* C ref: dbridge.c:45-75 is_pool/is_lava. */
function is_pool_local(x, y) {
    if (!isok(x, y)) return false;
    const lev = game.level?.at(x, y);
    if (!lev) return false;
    if (lev.typ === POOL || lev.typ === MOAT || lev.typ === WATER) return true;
    return lev.typ === DRAWBRIDGE_UP
        && !Is_juiblex_level(game.u?.uz)
        && ((lev.drawbridgemask | 0) & DB_UNDER) === DB_MOAT;
}
function is_lava_local(x, y) {
    if (!isok(x, y)) return false;
    const lev = game.level?.at(x, y);
    if (!lev) return false;
    if (lev.typ === LAVAPOOL || lev.typ === LAVAWALL) return true;
    return lev.typ === DRAWBRIDGE_UP
        && ((lev.drawbridgemask | 0) & DB_UNDER) === DB_LAVA;
}
/* C ref: hack.c:914-919 may_passwall(x,y). */
function may_passwall(x, y) {
    const lev = game.level?.at(x, y);
    if (!lev) return false;
    return !(IS_STWALL(lev.typ) && ((lev.wall_info | 0) & W_NONPASSWALL) !== 0);
}
/* C ref: mondata.h likes_lava(ptr) = ptr==&mons[PM_FIRE_ELEMENTAL] ||
 * ptr==&mons[PM_SALAMANDER]; pointer identity ported as pmidx equality
 * (this file's args are reconstructed structs, not C pointers — the same
 * convention replay-core.mjs documents for m_id==1==&gy.youmonst). */
function likes_lava_local(mdat) {
    const pm = mdat.pmidx | 0;
    return pm === PM_FIRE_ELEMENTAL || pm === PM_SALAMANDER;
}
/* Hero intrinsic reads for the goodpos()/is_pool//is_lava `mtmp==&gy.youmonst`
 * branch. Structurally unreachable via rloc()/rloc_pos_ok() in this task's
 * scope (mtmp there is always the args-reconstructed monster struct, never
 * game.youmonst by reference — see replay-core.mjs's m_id==1 convention,
 * used below instead of `===`), but ported for C-fidelity rather than
 * skipped, using the same u.uprops[idx] mechanism this codebase already
 * uses for hero intrinsics (js/display.js sensemon). */
function uprop_on(idx) {
    const p = game.u?.uprops?.[idx];
    if (!p) return false;
    return !!(((p.intrinsic | 0) || (p.extrinsic | 0)) && !(p.blocked | 0));
}
const LEVITATION_IDX = 48, FLYING_IDX = 49, WWALKING_IDX = 50, SWIMMING_IDX = 51,
      MAGICAL_BREATHING_IDX = 52;
function Levitation_hero() { return uprop_on(LEVITATION_IDX); }
function Flying_hero() { return uprop_on(FLYING_IDX); }
function Wwalking_hero() { return uprop_on(WWALKING_IDX) && !Is_waterlevel_local(); }
function Swimming_hero() { return uprop_on(SWIMMING_IDX); }
function Amphibious_hero() {
    return uprop_on(MAGICAL_BREATHING_IDX)
        || (!!game.youmonst?.data && ((game.youmonst.data.mflags1 | 0) & M1_AMPHIBIOUS) !== 0);
}
function FireResistance_hero() { return uprop_on(FIRE_RES); }
function Upolyd_hero() { return !!(game.u && game.u.umonnum !== game.u.umonster); }
function Is_waterlevel_local() {
    const uz = game.u?.uz, wl = game.water_level;
    return !!uz && !!wl && uz.dnum === wl.dnum && uz.dlevel === wl.dlevel;
}

function onscary_local(x, y, mtmp) {
    const auditory_scare = (x === 0 && y === 0);
    const magical_scare = !auditory_scare;
    const mdat = mtmp.data;

    if (mtmp.iswiz || is_lminion_local(mtmp) || (mdat.pmidx | 0) === PM_ANGEL
        || is_rider(mdat))
        return false;

    if (magical_scare && ((mdat.mlet | 0) === S_HUMAN || unique_corpstat_local(mdat)))
        return false;

    if ((mtmp.isshk && inhishop(mtmp)) || (mtmp.ispriest && inhistemple_local(mtmp)))
        return false;

    if (auditory_scare) return true;

    const lev = game.level?.at(x, y);
    if (lev && IS_ALTAR(lev.typ) && ((mdat.mlet | 0) === S_VAMPIRE))
        return true;

    if (sobj_at(SCR_SCARE_MONSTER, x, y)) return true;

    return false;
}
function inhistemple_local(mtmp) { return inhistemple_real(mtmp); }

/* C ref: mondata.h:46 haseyes(ptr) = (ptr->mflags1 & M1_NOEYES) == 0 */
function haseyes(mdat) { return ((mdat.mflags1 | 0) & M1_NOEYES) === 0; }

function goodpos_onscary(x, y, mptr) {
    /* onscary() checks Angels and lawful minions; this oversimplifies */
    const mlet = mptr.mlet | 0;
    if (mlet === S_HUMAN || mlet === S_ANGEL
        || is_rider(mptr) || unique_corpstat_local(mptr))
        return false;
    /* onscary() checks for vampshifted vampire bats/fog clouds/wolves too */
    const lev = game.level?.at(x, y);
    if (lev && IS_ALTAR(lev.typ) && mlet === S_VAMPIRE)
        return true;
    /* scare monster scroll doesn't have any of the below restrictions,
       being its own source of power */
    if (sobj_at(SCR_SCARE_MONSTER, x, y))
        return true;
    /* engraved Elbereth doesn't work in Gehennom or the end-game */
    if (Inhell() || In_endgame(game.u?.uz))
        return false;
    /* creatures who don't (or can't) fear a written Elbereth and weren't
       caught by the minions check */
    if ((mptr.pmidx | 0) === PM_MINOTAUR || !haseyes(mptr))
        return false;
    return false; /* sengr_at("Elbereth", x, y, TRUE) — see header comment */
}

/* C ref: teleport.c:85-185 goodpos(x,y,mtmp,gpflags) — full port (the
 * existing goodpos_simple()/teleok() above are pre-existing, narrower
 * helpers for enexto_core()/the hero-teleport-destination case and are
 * left untouched; this is the general form rloc_pos_ok()/rloc() need). */
function goodpos_full(x, y, mtmp, gpflags) {
    let mdat = null;
    const ignorewater = (gpflags & MM_IGNOREWATER) !== 0;
    const ignorelava = (gpflags & MM_IGNORELAVA) !== 0;
    const checkscary = (gpflags & GP_CHECKSCARY) !== 0;
    const allow_u = (gpflags & GP_ALLOW_U) !== 0;
    const avoid_monpos = (gpflags & GP_AVOID_MONPOS) !== 0;

    if (!isok(x, y)) return false;

    if (!allow_u) {
        const u = game.u;
        const is_youmonst = (mtmp?.m_id | 0) === 1;
        if (u_at(x, y) && !is_youmonst
            && (mtmp !== u.ustuck || !u.uswallow)
            && (!u.usteed || mtmp !== u.usteed))
            return false;
    }

    if (MON_AT(x, y) && avoid_monpos) return false;

    if (mtmp) {
        const mtmp2 = MON_AT(x, y);
        if (mtmp2 && (mtmp2 !== mtmp || mtmp.wormno)) return false;

        mdat = mtmp.data;
        const is_youmonst = (mtmp.m_id | 0) === 1;
        if (is_pool_local(x, y) && !ignorewater) {
            if (is_youmonst) {
                return !!(Swimming_hero() || Amphibious_hero()
                    || (!Is_waterlevel_local() && !is_waterwall_local(x, y)
                        && (Levitation_hero() || Flying_hero() || Wwalking_hero())));
            } else {
                return !!(is_swimmer(mdat)
                    || (!Is_waterlevel_local() && !is_waterwall_local(x, y)
                        && m_in_air(mtmp)));
            }
        } else if ((mdat.mlet | 0) === S_EEL && rn2(13) && !ignorewater) {
            return false;
        } else if (is_lava_local(x, y) && !ignorelava) {
            if ((mdat.pmidx | 0) === PM_FLOATING_EYE) {
                return false;
            } else if (is_youmonst) {
                const uarmf = game.u?.uarmf;
                return !!(Levitation_hero() || Flying_hero()
                    || (FireResistance_hero() && Wwalking_hero() && uarmf && uarmf.oerodeproof)
                    || (Upolyd_hero() && likes_lava_local(game.youmonst?.data || {})));
            } else {
                return !!(m_in_air(mtmp) || likes_lava_local(mdat));
            }
        }
        if (passes_walls(mdat) && may_passwall(x, y)) return true;
        if (amorphous(mdat) && closed_door_local(x, y)) return true;
        if (checkscary) {
            const scary = mtmp.m_id ? onscary_local(x, y, mtmp) : goodpos_onscary(x, y, mdat);
            if (scary) return false;
        }
    }
    if (!accessible_local(x, y)) {
        if (!(is_pool_local(x, y) && ignorewater) && !(is_lava_local(x, y) && ignorelava))
            return false;
    }
    if (sobj_at(BOULDER, x, y) && (!mdat || !throws_rocks(mdat))) return false;
    if (avoid_monpos && is_exclusion_zone_local(LR_MONGEN, x, y)) return false;

    return true;
}

/* C ref: rm.h is_waterwall(x,y) = isok(x,y) && IS_WATERWALL(levl[x][y].typ).
 * Local copy (js/dokick.js:1185 exists but importing it risks pulling in
 * that module's own load-time surface; this file already keeps several
 * such local copies). */
function is_waterwall_local(x, y) {
    if (!isok(x, y)) return false;
    const lev = game.level?.at(x, y);
    return !!lev && IS_WATERWALL(lev.typ);
}
/* C ref: monmove.c:2204-2219 closed_door/accessible — local copies so
 * goodpos_full() doesn't depend on js/look.js's module-load surface. */
function closed_door_local(x, y) {
    const lev = game.level?.at(x, y);
    if (!lev) return false;
    return lev.typ === DOOR && ((lev.doormask | 0) & (D_LOCKED | D_CLOSED)) !== 0;
}
function accessible_local(x, y) {
    const lev = game.level?.at(x, y);
    if (!lev) return false;
    return !!(ACCESSIBLE(lev.typ) && !closed_door_local(x, y));
}
function is_exclusion_zone_local(type, x, y) {
    for (const ez of (game.exclusion_zones || [])) {
        const typeMatches =
            (type === LR_DOWNTELE && (ez.zonetype === LR_DOWNTELE || ez.zonetype === LR_TELE))
            || (type === LR_UPTELE && (ez.zonetype === LR_UPTELE || ez.zonetype === LR_TELE))
            || type === ez.zonetype;
        if (typeMatches && x >= ez.lx && x <= ez.hx && y >= ez.ly && y <= ez.hy)
            return true;
    }
    return false;
}

/* C teleport.c:1898-1943 control_mon_tele — let wizard-mode player choose a
 * teleporting monster's destination. */
export async function control_mon_tele(mon, cc_p, rlocflags, via_rloc) {
    if (!isok(cc_p.x, cc_p.y)) {
        cc_p.x = mon.mx, cc_p.y = mon.my;
        if (!isok(cc_p.x, cc_p.y))
            cc_p.x = game.u.ux, cc_p.y = game.u.uy;
    }
    if (!(game.flags && game.flags.debug) || !(game.iflags?.mon_telecontrol || game.iflags?.montelecontrol))
        return false;

    if (game._levelgenPaintFreeze && !game._status_blanked) {
        game._status_blanked = true;
        game._status_blanked_by_mtc = true;  /* released by goto_level after losedogs */
    }
    await pline(`Teleport ${noit_mon_nam(mon)} @ <${mon.mx},${mon.my}> where?`);
    const tcbuf = 'where to teleport ' + noit_mon_nam(mon);
    const gp = await getpos(cc_p, false, tcbuf);
    if (gp >= 0 && !u_at(cc_p.x, cc_p.y)) {
        if (via_rloc ? rloc_pos_ok(cc_p.x, cc_p.y, mon)
                     : goodpos_full(cc_p.x, cc_p.y, mon, rlocflags))
            return true;
        if (!game.iflags?.debug_fuzzer) {
            const q = `<${mon.mx},${mon.my}> is not considered viable; force anyway?`;
            if ((await yn_function(q, 'yn', 'n', true)) === 'y')
                return true;
        }
    }
    await pline(`${via_rloc ? 'Picking random' : 'Using derived'} destination.`);
    return false;
}

function rloc_pos_ok(x, y, mtmp) {
    if (!goodpos_full(x, y, mtmp, GP_CHECKSCARY)) return false;
    const xx = mtmp.mx | 0;
    if (!xx) {
        const d = game.dndest || {};
        const up = game.updest || {};
        const flags = mtmp.my | 0;
        if (d.nlx && On_W_tower_level(game.u?.uz)) {
            const inside = within_bounded_area(x, y, d.nlx, d.nly, d.nhx, d.nhy);
            return (((flags & 2) !== 0) !== !inside);
        }
        if (up.lx && (flags & 1)) {
            return within_bounded_area(x, y, up.lx, up.ly, up.hx, up.hy)
                && (!up.nlx || !within_bounded_area(x, y, up.nlx, up.nly, up.nhx, up.nhy));
        }
        if (d.lx && !(flags & 1)) {
            return within_bounded_area(x, y, d.lx, d.ly, d.hx, d.hy)
                && (!d.nlx || !within_bounded_area(x, y, d.nlx, d.nly, d.nhx, d.nhy));
        }
    } else {
        /* C teleport.c:1622-1633: keep a shopkeeper/priest in his room, then
           respect the restricted dndest/updest regions between the monster's
           CURRENT square <xx,yy> and <x,y> (the hero-only 'u' squares used by
           teleok are not involved here). */
        const roomno = game.level?.locations?.[x]?.[y]?.roomno | 0;
        if (mtmp.isshk && inhishop(mtmp)) {
            if (roomno !== ((mtmp.mextra?.eshk?.shoproom ?? mtmp.eshk?.shoproom) | 0))
                return false;
        } else if (mtmp.ispriest && inhistemple_local(mtmp)) {
            if (roomno !== ((mtmp.mextra?.epri?.shroom ?? mtmp.epri?.shroom) | 0))
                return false;
        }
        if (!tele_jump_ok(xx, mtmp.my | 0, x, y)) return false;
    }
    return true;
}

/* C ref: teleport.c:1748-1772 teleport_pet(mtmp, force_it).
 *
 *   the steed never teleports; a leashed pet only goes if the leash is not
 *   cursed or the caller forces it, and going slips the leash.
 *
 * RNG-free.  The leash object is found in the hero inventory by its leashmon
 * link, matching get_mleash()'s list walk in dog.c. */
export function teleport_pet(mtmp, force_it) {
    if (mtmp === game.u?.usteed)
        return false;

    if (mtmp.mleashed) {
        /* C: get_mleash() searches the inventory leash chain by leashmon. */
        let leash = null;
        for (let otmp = game.invent; otmp; otmp = otmp.nobj) {
            if ((otmp.otyp | 0) === 236 /* LEASH */
                && (otmp.leashmon | 0) === (mtmp.m_id | 0)) {
                leash = otmp;
                break;
            }
        }
        if (!leash) {
            /* C's impossible() is diagnostic only; the pet is still released. */
            impossible('%s is leashed, without a leash.', Monnam(mtmp));
            m_unleash(mtmp, false);
            return true;
        }
        if (leash.cursed && !force_it) {
            yelp(mtmp);
            return false;
        }
        pline('Your leash goes slack.');
        m_unleash(mtmp, false);
        return true;
    }
    return true;
}

export async function mlevel_tele_trap(mtmp, trap, force_it, in_sight) {
    const u = game.u;
    const tt = trap ? (trap.ttyp | 0) : NO_TRAP_MTT;

    if (mtmp === u?.ustuck) /* probably a vortex */
        return TRAP_EFFECT_FINISHED_MTT; /* temporary? kludge */
    if (teleport_pet(mtmp, force_it)) {
        let tolevel = null;
        let migrate_typ = MIGR_RANDOM_MTT;

        if (is_hole(tt)) {
            if (Is_stronghold(u?.uz)) {
                /* C teleport.c:2020-2021: monsters falling through a hole
                 * from the castle are sent to the Valley, rather than to the
                 * trap's ordinary destination.  Dungeon generation publishes
                 * the same level in game.valley_level (dungeon.c's
                 * valley_level global), so copy it just as assign_level()
                 * does.  Keep the object shape independent of the global. */
                const valley = game.valley_level;
                if (valley) {
                    tolevel = { dnum: valley.dnum | 0, dlevel: valley.dlevel | 0 };
                } else {
                    /* A malformed/incomplete dungeon has no legal C target;
                     * preserve the trap's finished result without migrating. */
                    return TRAP_EFFECT_FINISHED_MTT;
                }
            } else if (Is_botlevel(u?.uz)) {
                if (in_sight && trap.tseen)
                    pline(`${Monnam(mtmp)} avoids the ${(tt === HOLE_MTT) ? 'hole' : 'trap'}.`);
                return TRAP_EFFECT_FINISHED_MTT;
            } else {
                tolevel = { dnum: trap.dst?.dnum | 0, dlevel: trap.dst?.dlevel | 0 };
                clamp_hole_destination(tolevel);
            }
        } else if (tt === MAGIC_PORTAL_MTT) {
            if (In_endgame(u.uz)
                && (mon_has_amulet(mtmp) || is_home_elemental(mtmp.data)
                    || rn2(7))) {
                if (in_sight && (mtmp.data?.mlet | 0) !== S_ELEMENTAL_MTT) {
                    pline(`${Monnam(mtmp)} seems to shimmer for a moment.`);
                    seetrap(trap);
                }
                return TRAP_EFFECT_FINISHED_MTT;
            } else {
                tolevel = { dnum: trap.dst?.dnum | 0, dlevel: trap.dst?.dlevel | 0 };
                migrate_typ = MIGR_PORTAL_MTT;
            }
        } else if (tt === LEVEL_TELEP_MTT || tt === NO_TRAP_MTT) {
            /* C teleport.c:1830-1855.  NO_TRAP is used by forced monster
             * displacement; its onscary(0,0,mtmp) guard prevents the Wizard,
             * Riders, lawful minions, angels, and occupants of their own
             * special rooms from being migrated. */
            if (mon_has_amulet(mtmp) || In_endgame(u.uz)
                || (tt === NO_TRAP_MTT && onscary_local(0, 0, mtmp))) {
                if (in_sight)
                    pline(`${Monnam(mtmp)} seems very disoriented for a moment.`);
                return TRAP_EFFECT_FINISHED_MTT;
            }
            if (tt === NO_TRAP_MTT) {
                /* Forced displacement returns the monster to this level on
                 * re-entry, at a random location rather than its old square. */
                tolevel = { dnum: u.uz?.dnum | 0, dlevel: u.uz?.dlevel | 0 };
            } else {
                const nlev = random_teleport_level();
                if (nlev === (depth(u.uz) | 0)) {
                    if (in_sight)
                        pline(`${Monnam(mtmp)} shudders for a moment.`);
                    return TRAP_EFFECT_FINISHED_MTT;
                }
                tolevel = get_level(nlev);
            }
        } else {
            /* C: impossible("mlevel_tele_trap: unexpected trap type (%d)") */
            return TRAP_EFFECT_FINISHED_MTT;
        }

        if (in_sight) {
            pline(`Suddenly, ${mon_nam(mtmp)} ${(tt === HOLE_MTT) ? 'falls into a hole'
                : (tt === TRAPDOOR_MTT) ? 'falls through a trap door'
                : 'disappears out of sight'}.`);
            if (trap)
                seetrap(trap);
        }
        if (is_xport(tt) && !control_teleport(mtmp.data))
            mtmp.mconf = 1;
        await migrate_to_level(mtmp, ledger_no_tp(tolevel), migrate_typ, null);
        return TRAP_MOVED_MON_MTT; /* no longer on this level */
    }
    return TRAP_EFFECT_FINISHED_MTT;
}
/* trap.h trap_result enum + the trap ids / MIGR codes mlevel_tele_trap reads.
 * js/trap.js keeps the same trap_result triple file-locally (trap.js:70-73);
 * these are that C enum, not a stand-in. */
const TRAP_EFFECT_FINISHED_MTT = 0, TRAP_MOVED_MON_MTT = 3;
const NO_TRAP_MTT = 0, HOLE_MTT = 13, TRAPDOOR_MTT = 14;
const LEVEL_TELEP_MTT = 16, MAGIC_PORTAL_MTT = 17;
const MIGR_RANDOM_MTT = 0, MIGR_PORTAL_MTT = 8; /* dungeon.h */
const S_ELEMENTAL_MTT = 46; /* defsym.h MONSYM(46, 'E', ELEMENTAL, S_ELEMENTAL) */
/* C dungeon.c:1376 ledger_no(lev).  js/dog.js, js/mklev.js:2485 and
 * js/cmd.js:5626 each keep this same one-liner file-locally. */
function ledger_no_tp(lev) {
    return ((lev?.dlevel | 0) + (game.dungeons?.[lev?.dnum | 0]?.ledger_start | 0));
}

/* C ref: teleport.c:1936-1947 mvault_tele(mtmp) — the monster half of
 * vault_tele(): the "once" teleport trap (mklev's makevtele, ttmp->once = 1)
 * sends its victim into the level's VAULT, not to a random square.
 *
 *     struct mkroom *croom = search_special(VAULT);
 *     coord c;
 *     if (croom && somexyspace(croom, &c) && goodpos(c.x, c.y, mtmp, 0)) {
 *         rloc_to(mtmp, c.x, c.y);
 *         return;
 *     }
 *     (void) rloc(mtmp, RLOC_NONE);
 *
 * RNG-LOAD-BEARING, and in the same way vault_tele() is: somexyspace() draws
 * somex()/somey() inside the 2x2 vault (rn2(2) twice), where the fall-through
 * draws rloc's rnd(COLNO-1)/rn2(ROWNO) pairs instead.  So the two arms are not
 * interchangeable even when the monster ends up somewhere plausible. */
export async function mvault_tele(mtmp) {
    const croom = search_special(VAULT);
    const c = { x: 0, y: 0 };

    if (croom && somexyspace(croom, c) && goodpos_full(c.x, c.y, mtmp, 0)) {
        await rloc_to(mtmp, c.x, c.y);
        return;
    }
    await rloc(mtmp, RLOC_NONE_TP);
}
/* C hack.h:1391 RLOC_NONE — the zero flag word.  Imported by value here rather
 * than from const.js only because this module already spells its RLOC_NOMSG
 * locally (see the note at :930). */
const RLOC_NONE_TP = 0x00;

export async function mtele_trap(mtmp, trap, in_sight) {
    if (typeof process !== 'undefined' && ENV?.FF_TRAP_TRACE === '1') {
        pushRngLogEntry(`^mtele_trace[id=${mtmp?.m_id | 0} mndx=${mtmp?.mndx ?? mtmp?.data?.pmidx ?? -1}`
            + ` xy=${mtmp?.mx | 0},${mtmp?.my | 0} txy=${trap?.tx | 0},${trap?.ty | 0}`
            + ` once=${trap?.once ? 1 : 0} tame=${mtmp?.mtame | 0}]`);
    }
    /* don't print feedback here: a monster stepping on a trap and not
       teleporting from it isn't visible */
    if (noteleport_level(mtmp))
        return;

    if (teleport_pet(mtmp, false)) {
        /* save name with pre-movement visibility */
        const monname = Monnam(mtmp);
        const tdx = (trap?.teledest?.x | 0), tdy = (trap?.teledest?.y | 0);

        /* Note: don't remove the trap if a vault.  Otherwise the monster will
           be stuck there, since the guard isn't going to come for it... */
        if (trap.once) {
            await mvault_tele(mtmp);
        } else if (isok(tdx, tdy)) {
            /* a monster teleporting onto the hero's or another monster's spot
               does not displace the resident the way the hero's teleport does
               — it just doesn't work. */
            if (!(m_at(tdx, tdy)
                  || u_at(tdx, tdy))) {
                await rloc_to_core(mtmp, tdx, tdy, RLOC_MSG_MT);
            }
        } else {
            await rloc(mtmp, RLOC_NONE_MT);
        }

        if (in_sight) {
            if (canseemon(mtmp))
                pline(`${monname} seems disoriented.`);
            else
                pline(`${monname} suddenly disappears!`);
            seetrap(trap);
        }
    }
}
/* C hack.h:1393 RLOC_MSG / :1391 RLOC_NONE. */
const RLOC_MSG_MT = 0x02;
const RLOC_NONE_MT = 0x00;

export function tele_restrict(mon) {
    if (noteleport_level(mon)) {
        if (canseemon(mon))
            pline("A mysterious force prevents %s from teleporting!",
                  mon_nam(mon));
        return true;
    }
    return false;
}
export async function rloc(mtmp, rlocflags) {
    if (typeof process !== 'undefined' && ENV?.FF_TELE_TRACE === '1')
        pushRngLogEntry(`^tele_trace[fn=rloc moves=${game.moves | 0} id=${mtmp?.m_id | 0}`
            + ` mndx=${mtmp?.mndx ?? mtmp?.mnum ?? mtmp?.data?.pmidx ?? -1}`
            + ` xy=${mtmp?.mx | 0},${mtmp?.my | 0} flags=${rlocflags | 0}]`);
    if (mtmp === game.u.usteed) {
        /* C teleport.c:1810-1812: the steed is not relocated as a monster;
         * tele() moves the rider and steed together, and rloc reports success.
         * `rloc` is intentionally synchronous because monster movement calls it
         * from synchronous combat code.  `tele()` is the async public hero
         * teleport entry point, so start it here and preserve C's immediate
         * boolean result.  The teleport routine performs its state updates
         * before yielding at any input/display boundary. */
        await tele();
        return true;
    }
    if (mtmp.iswiz && mtmp.mx) {
        /* C teleport.c:1814-1840.  The Wizard first tries a staircase chosen
           for fleeing, using goodpos (which deliberately ignores scary-square
           restrictions).  stairway_find_forwiz only considers stairways whose
           destination remains in the current dungeon. */
        const sameDungeon = (s) => (s?.tolev?.dnum | 0) === (game.u?.uz?.dnum | 0);
        const findForWiz = (isladder, up) => {
            for (let s = game.stairs; s; s = s.next)
                if (sameDungeon(s) && !!s.isladder === !!isladder && !!s.up === !!up)
                    return s;
            return null;
        };
        const inWizTower = (() => {
            const lev = game.u?.uz;
            const same = (a, b) => !!a && !!b
                && (a.dnum | 0) === (b.dnum | 0)
                && (a.dlevel | 0) === (b.dlevel | 0);
            if (!(same(lev, game.wiz1_level) || same(lev, game.wiz2_level)
                  || same(lev, game.wiz3_level))) return false;
            const d = game.dndest;
            return !!d && !!(d.nlx | 0)
                && (game.u.ux | 0) >= (d.nlx | 0) && (game.u.ux | 0) <= (d.nhx | 0)
                && (game.u.uy | 0) >= (d.nly | 0) && (game.u.uy | 0) <= (d.nhy | 0);
        })();
        let stway;
        if (!inWizTower) {
            stway = findForWiz(false, true);
        } else if (!findForWiz(true, false)) {
            stway = findForWiz(true, true);
        } else {
            stway = findForWiz(true, false);
        }
        const sx = stway?.sx | 0, sy = stway?.sy | 0;
        if (stway && goodpos_full(sx, sy, mtmp, NO_MM_FLAGS)) {
            await rloc_to_core(mtmp, sx, sy, rlocflags);
            return true;
        }
    }
    if ((game.iflags?.mon_telecontrol || game.iflags?.montelecontrol) && mtmp.mx) {
        /* C teleport.c:1836-1841 */
        const cc = { x: mtmp.mx | 0, y: mtmp.my | 0 };
        if (await control_mon_tele(mtmp, cc, rlocflags, true)) {
            await rloc_to_core(mtmp, cc.x, cc.y, rlocflags);
            return true;
        }
    }

    let x, y;
    /* C 1849-1854: 50 fully random tries. */
    for (let trycount = 0; trycount < 50; ++trycount) {
        x = rnd(COLNO - 1); /* 1..COLNO-1 */
        y = rn2(ROWNO);     /* 0..ROWNO-1 */
        if (rloc_pos_ok(x, y, mtmp)) {
            await rloc_to_core(mtmp, x, y, rlocflags);
            return true;
        }
    }

    /* C 1856-1878: gather every candidate location (shuffled by
       collect_coords itself), then walk it looking for a rloc_pos_ok()
       spot, remembering the first plain-goodpos() spot as a backup. */
    let cc_flags = CC_INCL_CENTER | CC_UNSHUFFLED | CC_SKIP_MONS;
    if (!passes_walls(mtmp.data))
        cc_flags |= CC_SKIP_INACCS;
    const candy = collect_coords(Math.trunc(COLNO / 2), Math.trunc(ROWNO / 2), 0, cc_flags, null);
    let backupx = 0, backupy = 0;
    for (let i = 0; i < candy.coords.length; ++i) {
        /* C 1868-1872: candy[] here is CC_UNSHUFFLED, so rloc() does its
           own Fisher-Yates-ish shuffle-as-it-goes (partial shuffle,
           swapping [i] with a later [i+j]) rather than relying on
           collect_coords' internal per-ring shuffle. */
        const j = rn2(candy.coords.length - i);
        if (j > 0) {
            const tmp = candy.coords[i];
            candy.coords[i] = candy.coords[i + j];
            candy.coords[i + j] = tmp;
        }
        x = candy.coords[i].x;
        y = candy.coords[i].y;
        if (rloc_pos_ok(x, y, mtmp)) {
            await rloc_to_core(mtmp, x, y, rlocflags);
            return true;
        }
        if (!backupx && goodpos_full(x, y, mtmp, NO_MM_FLAGS)) {
            backupx = x; backupy = y;
        }
    }

    if (!backupx) {
        void RLOC_ERR;
        return false;
    }
    await rloc_to_core(mtmp, backupx, backupy, rlocflags);
    return true;
}

/* C ref: teleport.c:2261-2292 */
export async function u_teleport_mon(mtmp, give_feedback) {
    if (typeof process !== 'undefined' && ENV?.FF_TELE_TRACE === '1')
        pushRngLogEntry(`^tele_trace[fn=u_teleport_mon moves=${game.moves | 0} id=${mtmp?.m_id | 0}`
            + ` mndx=${mtmp?.mndx ?? mtmp?.mnum ?? mtmp?.data?.pmidx ?? -1}`
            + ` xy=${mtmp?.mx | 0},${mtmp?.my | 0} feedback=${give_feedback ? 1 : 0}]`);
    let cc = { x: 0, y: 0 };

    if (game.level.flags.stasis_until >= game.moves) {
        if (give_feedback)
            await pline(`A mysterious force prevents you teleporting ${mon_nam(mtmp)}!`);
        return false;
    } else if (mtmp.ispriest && in_rooms(mtmp.mx, mtmp.my, TEMPLE)[0]) {
        if (give_feedback)
            await pline(`${Monnam(mtmp)} resists your magic!`);
        return false;
    } else if (engulfing_u(mtmp) && noteleport_level(mtmp)) {
        if (give_feedback)
            You(`are no longer inside ${mon_nam(mtmp)}!`);
        await unstuck(mtmp);
        if (!await rloc(mtmp, RLOC_MSG))
            await m_into_limbo(mtmp);
    } else if ((is_rider(mtmp.data) || control_teleport(mtmp.data))
               && rn2(13) && enexto(cc, game.u.ux, game.u.uy, mtmp.data)) {
        await rloc_to(mtmp, cc.x, cc.y);
    } else {
        if (!await rloc(mtmp, RLOC_MSG))
            return false;
    }
    return true;
}

/* C mon.c:2890-2985 vamprises() — a vampire in bat/fog/wolf form that "dies"
 * reverts to vampire instead.  If it was engulfing the hero, expels() (the
 * mnexto ring shuffle + spoteffects) runs first, then newcham back to the
 * vampire.  Returns TRUE when the monster rose (mondead() then returns early).
 * NOT modelled: the closed_door arm (mon.c:2949-2975, door smash / booby trap). */
export async function vamprises(mtmp) {
    const mndx = mtmp.cham | 0;
    if (!ismnum_vr(mndx) || mndx === ((mtmp.data?.pmidx ?? mtmp.mnum) | 0)
        || ((game.mvitals?.[mndx]?.mvflags | 0) & G_GENOD_VR))
        return false;
    const u = game.u;
    const ptr = mtmp.data;
    const noncorp = (ptr.mlet | 0) === 54 /* S_GHOST */;
    const amorph = !!((ptr.mflags1 | 0) & 0x00000004);
    const specMon = nonliving_vr(ptr) || noncorp || amorph;
    const specDeath = !!game.gd?.disintegested || noncorp || amorph;
    const unaware = Unaware_vr();
    const action = (unaware ? 'you dream that ' : '')
        + x_monnam_vr(mtmp, ARTICLE_THE_VR, specMon ? null : 'seemingly dead',
                      SUPPRESS_INVISIBLE_VR | AUGMENT_IT_VR, false)
        + ' ' + (unaware ? '' : 'suddenly ')
        + (specDeath ? 'reconstitutes' : 'transforms') + ' and rises as';
    mtmp.mcanmove = 1;
    mtmp.mfrozen = 0;
    /* set_mon_min_mhpmax(mtmp, 10) */
    if ((mtmp.mhpmax | 0) < (mtmp.m_lev | 0) + 1) mtmp.mhpmax = (mtmp.m_lev | 0) + 1;
    if ((mtmp.mhpmax | 0) < 10) mtmp.mhpmax = 10;
    mtmp.mhp = mtmp.mhpmax;
    if (u.ustuck === mtmp) {
        if (u.uswallow)
            await expels_gu_vr(mtmp, (ptr.pmidx ?? mtmp.mnum) | 0, false);
        else {
            set_ustuck(null);
            await pline(`${Monnam(mtmp)} is no longer in your clutches.`);
        }
    }
    if (!await newcham_vr(mtmp, mndx, 0 /* NO_NC_FLAGS */))
        return (mtmp.mhp | 0) > 0;
    mtmp.cham = ((mtmp.data?.pmidx ?? mtmp.mnum) | 0) === mndx ? NON_PM_VR : mndx;
    if (canspotmon(mtmp)) {
        await pline(upstart_vr(action) + ' '
            + x_monnam_vr(mtmp, ARTICLE_A_VR, null,
                          SUPPRESS_NAME_VR | SUPPRESS_IT_VR | SUPPRESS_INVISIBLE_VR, false) + '!');
        game.vamp_rise_msg = true;
    }
    newsym(mtmp.mx | 0, mtmp.my | 0);
    return true;
}
