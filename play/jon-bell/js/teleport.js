// @ts-nocheck
// teleport.c — collect_coords, enexto_core (C ref: teleport.c:86-275, 578-713).
// @ts-nocheck — js sibling imports.
import { BOULDER } from './const.js';
import { pushRngLogEntry } from './rng.js';
import { rn2, rnd } from './rnd.js';
import { discover_object } from './o_init.js';
import { onscary } from './monmove.js';
import { db_under_typ } from './dbridge.js';
/* C ref: dungeon.c on_level/In_tutorial — domagicportal's landed-from-another-
 * portal check and its tutorial-exit arm. */
import { on_level, In_tutorial, assign_level } from './dungeon.js';
import { ledger_no } from './dungeon.js';
/* C ref: potion.c:106 make_stunned — domagicportal's dizzy-on-arrival stun. */
import { make_stunned } from './potion.js';
/* C ref: do.c:2076 schedule_goto — domagicportal defers the actual level
 * change to the end of the turn, same as level_tele (js/cmd.js:11421). */
import { invocation_message, may_passwall, notice_all_mons } from './hack.js';
import { number_leashed } from './apply.js';
import { schedule_goto } from './do.js';
import { update_inventory } from './invent.js';
import { LEASH } from './apply.js';
import { yn_function } from './cmd.js';
import { ROWNO, COLNO, ZAP_POS, ACCESSIBLE, D_CLOSED, D_LOCKED, DOOR, isok, u_at, TELEDS_TELEPORT, RLOC_MSG, TEMPLE, engulfing_u, STRAT_APPEARMSG, NO_TRAP_FLAGS, BOLT_LIM, IS_ALTAR, IS_STWALL, W_NONPASSWALL, MON_FLOOR, POOL, MOAT, WATER, DRAWBRIDGE_UP, DB_UNDER, DB_MOAT, DB_LAVA, LAVAPOOL, LAVAWALL, MM_IGNOREWATER, MM_IGNORELAVA, GP_CHECKSCARY, GP_ALLOW_U, GP_AVOID_MONPOS, LR_MONGEN, LR_TELE, LR_UPTELE, LR_DOWNTELE, FIRE_RES, NO_MM_FLAGS, IS_WATERWALL, In_endgame, Is_astralevel, Is_juiblex_level, MON_DETACH, MON_OBLITERATE, MON_ENDGAME_MIGR } from './const.js';
import { game } from './gstate.js';
import { You_feel, pline_mon } from './pline.js';
import { newsym, see_monsters, shieldeff, docrt, force_more_from_cls, force_more_pages, debugpline } from './display.js';
import { vision_recalc } from './vision.js';
import { nomul } from './hack.js';
import { Warning, canspotmon, sensemon, canseemon, _topl_joins_snapshot, _topl_merge_result } from './display.js';
import { pline } from './pline.js';
import { Monnam } from './do_name.js';
import { Amonnam, m_monnam } from './do_name.js';
import { You } from './pline.js';
import { spot_time_left } from './timeout.js';
import { is_ice, sengr_at } from './engrave.js';
import { engr_at } from './engrave.js';
import { in_rooms } from './hack.js';
import { sobj_at } from './invent.js';
import { u_on_newpos } from './dungeon.js';
import { somexyspace } from './mkroom.js';
import { set_ustuck, maybe_unhide_at, mongone } from './mon.js';
/* C ref: mkroom.c:764-780 search_special(VAULT) — vault_tele's room lookup. */
import { search_special } from './mkroom.js';
import { vault_occupied, findgd, uleftvault } from './vault.js';
/* C ref: trap.c:1700 deltrap — the once-trap is consumed on use. */
import { deltrap, unconscious } from './trap.js';
/* C ref: track.c:23 settrack — tele_trap's fixed-destination arm. */
import { settrack } from './track.js';
/* C ref: hack.h MON_AT/m_at — tele_trap's fixed-destination arm. */
import { m_at } from './uhitm.js';
/* C ref: mkroom.h VAULT, youprop.h ANTIMAGIC slot. */
import { VAULT, ANTIMAGIC, MELT_ICE_AWAY, MAX_TYPE } from './const.js';
import { m_into_limbo, unstuck, mon_leaving_level } from './mon.js';
import { m_unleash } from './apply.js';
import { mdrop_special_objs } from './steal.js';
import { yelp } from './sounds.js';
import { impossible, place_monster } from './steed.js';
import { impossible as rloc_impossible } from './pline.js';
import { set_mon_data } from './mondata.js';
import { GP_ALLOW_XY, IS_SINK } from './const.js';
import { dosinkfall } from './hack.js';
import { PASSES_WALLS } from './const.js';
import { is_youmonst } from './mhitm.js';
import { hideunder } from './mon.js';
import { reset_utrap } from './trap.js';
import { switch_terrain } from './hack.js';
/* C mon.c:4056 mnearto -> goodpos(newx, newy, mtmp, 0) — the FULL goodpos
 * (js/trap.js goodpos), not this file's goodpos_full, which enexto_core
 * uses for its candidate filter. */
import { mon_nam } from './uhitm.js';
import { permonstTemplate, Inhell } from './makemon.js';
import { m_in_air } from './mon.js';
import { mon_aligntyp, inhistemple as inhistemple_real } from './priest.js';
import { worm_seg_at, remove_worm as remove_worm_real, place_worm_tail_randomly as place_worm_tail_randomly_real } from './worm.js';
import { dotrap, t_at, mintrap, fill_pit, seetrap, clamp_hole_destination } from './trap.js';
import { buried_ball_to_punishment } from './dig.js';
/* ── imports for mlevel_tele_trap / teleport_pet (below) ── */
import { migrate_to_level } from './dog.js';        /* C dog.c:886 */
import { mon_has_amulet } from './wizard.js';        /* C mon.c mon_has_amulet */
import { is_home_elemental } from './makemon.js';   /* C mondata.h */
import { is_xport } from './const.js';              /* C trap.h is_xport() */
/* mlevel_tele_trap's is_hole arm (teleport.c:2019-2031). */
import { Is_stronghold, Is_botlevel } from './const.js';
/* C ref: teleport.c:461-528 — teleds()'s ball & chain block.  Every helper it
 * needs was already ported; only the block that calls them was missing. */
import { drag_ball, move_bc, placebc, unplacebc } from './ball.js';
import { near_capacity, spoteffects_mon_underfoot } from './hack.js';
/* C ref: hack.c:3375 spoteffects -> pickup(1).  cmd.js <-> teleport.js is
 * already a cycle (cmd.js imports teleds from here); `export async function`
 * declarations hoist, so the binding is live by the time teleds runs. */
import { _spoteffects_pickup } from './cmd.js';
import { check_special_room, pooleffects } from './hack.js';
import { get_level } from './dungeon.js';
import { OBJ_FREE, OBJ_INVENT, SLT_ENCUMBER } from './const.js';
/* C ref: obj.h:332 carried(o) := ((o)->where == OBJ_INVENT).  Same one-liner
 * js/ball.js keeps file-locally; both are the macro, not a stand-in. */
function carried(o) {
    return o != null && (o.where | 0) === OBJ_INVENT;
}
import { couldsee } from './vision.js';
import { set_apparxy, mon_track_clear, dochugw } from './monmove.js';
import { find_objowner, costly_spot, inhishop, onshopbill, make_angry_shk, stolen_value } from './shk.js';
import { dist2, distmin } from './hacklib.js';
import { depth } from './dungeon.js';
import { within_bounded_area } from './rect.js';
import { in_out_region, update_player_regions, update_monster_region } from './region.js';
import { PM_ANGEL, PM_FIRE_ELEMENTAL, PM_SALAMANDER, PM_FLOATING_EYE, PM_MINOTAUR, PM_WIZARD_OF_YENDOR } from './pm.generated.js';
import { TELEPORT_CONTROL, STUNNED, TT_BURIEDBALL, TIMEOUT } from './const.js';
/* C ref: teleport.c:424-434 teleok's trap exceptions (rm.h/trap.h predicates). */
import { VIBRATING_SQUARE, is_pit, is_hole } from './const.js';
/* C ref: getpos.c:771 getpos() — scrolltele's cursor-driven destination pick
 * (teleport.c:892).  Lives in js/cmd.js alongside the rest of the getpos
 * machinery (truncate_to_map, movecmd, the farlook descriptions). */
import { getpos } from './getpos.js';
import { noit_mon_nam } from './do_name.js';
import { learnscroll } from './read.js';
/* C potion.c:260 make_blinded — canonical transient-blindness transition. */
import { make_blinded } from './zap.js';
import { ENV } from './hostenv.js';
import { closed_door as closed_door_vr } from './monmove.js';
import { cansee as cansee_vr, recalc_block_point as recalc_block_point_vr } from './vision.js';
import { You_hear as You_hear_vr, You_see as You_see_vr } from './pline.js';
import { mb_trapped as mb_trapped_vr } from './monmove.js';
import { D_TRAPPED as D_TRAPPED_VR, D_NODOOR as D_NODOOR_VR } from './const.js';
import { upstart as upstart_vr } from './hacklib.js';
import { newcham } from './mon.js';
import { expels_gu as expels_gu_vr } from './mhitu.js';
import { set_msg_xy as set_msg_xy_vr } from './pline.js';
import { uunstick as uunstick_vr } from './polyself.js';
import { x_monnam as x_monnam_vr } from './do_name.js';
import { nonliving as nonliving_vr } from './makemon.js';
import { Unaware as Unaware_vr } from './display.js';
import { ismnum as ismnum_vr, G_GENOD as G_GENOD_VR, NON_PM as NON_PM_VR, ARTICLE_THE as ARTICLE_THE_VR, ARTICLE_A as ARTICLE_A_VR, SUPPRESS_INVISIBLE as SUPPRESS_INVISIBLE_VR, AUGMENT_IT as AUGMENT_IT_VR, SUPPRESS_NAME as SUPPRESS_NAME_VR, SUPPRESS_IT as SUPPRESS_IT_VR } from './const.js';
import { M2_LORD, is_demon, is_dprince } from './makemon.js'; // relocate-fns
import { get_iter_mons } from './mon.js'; // relocate-fns
import { On_W_tower_level } from './dungeon.js'; // relocate-fns
import { SHOPBASE } from './const.js'; // relocate-fns
import { flooreffects } from './do.js'; // relocate-fns
import { obj_extract_self } from './dokick.js'; // relocate-fns
import { revive_corpse } from './do.js';
import { place_object } from './mkobj.js'; // relocate-fns
import { PM_DEATH, PM_FAMINE, PM_PESTILENCE } from './pm.generated.js'; // relocate-fns
import { rn1 } from './rng.js'; // relocate-fns
import { costly_adjacent, addtobill as shk_addtobill, subfrombill } from './shk.js'; // relocate-fns
import './trap.js'; // relocate-fns
import { next_to_u } from './apply.js'; // relocate-fns
import { next_to_u as next_to_u_real } from './apply.js'; // relocate-fns
import { acurr, exercise } from './attrib.js'; // relocate-fns
import { Confusion_hero, Role_if, SetVoice, UTOTYPE_NONE, _ADDINV_AMULET_OF_YENDOR, _Flying, _Levitation, _You_feel, _invlet_constant, _pd_chr_u_on_lvl, _pd_depth, _pd_unreachable_level, check_capacity_sync as check_capacity, set_cursor } from './cmd.js';
import { u_locomotion } from './hack.js';
import { addinv_core1, addinv_core2, prinv, reorder_invent } from './invent.js'; // relocate-fns
import { menucolor_text } from './coloratt.js'; // relocate-fns
import { build_window_screen, menu_search_case, menu_search_docorner, tty_window_offx } from './com_pager.js'; // relocate-fns
import { A_STR, A_WIS, DIED, ECMD_OK, ECMD_TIME, FORCETRAP, I_SPECIAL, In_mines, In_quest, In_sokoban, Is_knox_level, LEVEL_TELEP, NO_KILLER_PREFIX, PICK_ONE, TELEPORT, TELEP_TRAP } from './const.js'; // relocate-fns
import { DEFAULT_MENU_CMDS, flush_screen, force_more, status_r1_menu_docrt } from './display.js'; // relocate-fns
import { dunlevs_in_dungeon, lev_by_name, print_branch, single_level_branch, surface } from './dungeon.js'; // relocate-fns
import { morehungry } from './eat.js'; // relocate-fns
import { done } from './end.js'; // relocate-fns
import { wizard } from './gstate.js'; // relocate-fns
import { nhgetch } from './input.js'; // relocate-fns
import { mksobj } from './mkobj.js'; // relocate-fns
import { SPBOOK_META } from './o_init_data.js'; // relocate-fns
import { You_cant, Your, impossible as real_impossible, verbalize } from './pline.js'; // relocate-fns
import { PM_WIZARD as _FL_PM_WIZARD } from './pm.generated.js'; // relocate-fns
import { rnl } from './rnd.js'; // relocate-fns
import { u_left_shop } from './shk.js'; // relocate-fns
import { MAXSPELL, known_spell, num_spells, spelleffects } from './spell.js'; // relocate-fns
import { level_tele_trap_u } from './trap.js'; // relocate-fns
import { TtyMenu, menu_heading_text } from './tty_menu.js'; // relocate-fns
import { getlin } from './windows.js'; // relocate-fns
export { next_to_u } from './apply.js'; // relocate-fns
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
export function enexto_core(xx, yy, mdat, entflags) {
    let fakemon;
    if (mdat && mdat.data) {
        fakemon = mdat;
    } else {
        fakemon = { m_id: 0, wormno: 0, mx: 0, my: 0, minvent: null };
        set_mon_data(fakemon, mdat || permonstTemplate(game.u.umonster));
    }
    const ok = (x, y) => goodpos_full(x, y, fakemon, entflags | 0);
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
    if ((entflags & GP_ALLOW_XY) && ok(xx, yy)) return { x: xx, y: yy };
    return null;
}
/* C ref: hack.h MON_AT — any monster (not youmonst) at (x,y)? */
function MON_AT(x, y) {
    for (let m = game.fmon; m; m = m.nmon) {
        /* C rm.h:515-534 m_at reads the grid cleared by remove_monster(),
         * even while mon_leaving_level() preserves fmon and mx/my. */
        if (m._mapRemoved) continue;
        /* DEADMONSTER — C m_at/MON_AT reads the grid, which m_detach cleared…
         * EXCEPT during the death sequence itself (mondead's mhp=0 → m_detach):
         * C's svl.level.monsters still holds the dying monster there, so
         * goodpos()/makemon() placement must reject its square (kop_revival).
         * `_dyingInGrid` (js/mklev.js mondead) marks exactly that window. */
        if ((m.mhp | 0) < 1 && !m._dyingInGrid) continue;
        if (m === game.u?.usteed) continue; /* mount_steed remove_monster()s the steed: not in the grid */
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
    const mdat = permonstTemplate(game.u.umonnum | 0);
    if (is_pool_local(x, y)) {                                  /* C 133-140 */
        if (!(Swimming_hero() || Amphibious_hero()
            || (!Is_waterlevel_local() && !is_waterwall_local(x, y)
                && (Levitation_hero() || Flying_hero() || Wwalking_hero()))))
            return false;
    } else if ((mdat?.mlet | 0) === S_EEL && rn2(13)) {         /* C 148-149 */
        return false; /* hero polyd into an eel: goodpos draws rn2(13) */
    } else if (is_lava_local(x, y)) {                           /* C 150-160 */
        if ((mdat?.pmidx | 0) === PM_FLOATING_EYE)
            return false;
        const uarmf = game.u?.uarmf;
        if (!(Levitation_hero() || Flying_hero()
            || (FireResistance_hero() && Wwalking_hero()
                && uarmf && uarmf.oerodeproof)
            || (Upolyd_hero() && game.youmonst?.data
                && likes_lava_local(game.youmonst.data))))   /* C 153-154 */
            return false;
    } else if (!(passes_walls(mdat) && may_passwall(x, y))
               && !(amorphous(mdat) && closed_door_local(x, y))) {
        /* C monmove.c:2188-2193 accessible() uses SURFACE_AT for drawbridges. */
        if (!accessible_local(x, y))
            return false;
        if (sobj_at(BOULDER, x, y) && !throws_rocks(mdat)) return false;
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
    const vault_guard = vault_occupied(u.urooms) ? findgd() : null;
    if (u.utraptype === TT_BURIEDBALL)
        await buried_ball_to_punishment();
    const uball = u.uball;
    let ball_active = !!(uball && (uball.where | 0) !== OBJ_FREE);
    let ball_still_in_range = false;
    let allow_drag = (teleds_flags & 1) !== 0; /* TELEDS_ALLOW_DRAG, teleport.c:449 */
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
    await reset_utrap(false);
    /* C 488-489: was_swallowed = u.uswallow; set_ustuck(Null) clears uswallow */
    const was_swallowed = !!u.uswallow;
    set_ustuck(null);
    /* C 490-491: u.ux0 = u.ux; u.uy0 = u.uy */
    u.ux0 = u.ux | 0;
    u.uy0 = u.uy | 0;
    if (!hideunder(game.youmonst) && game.youmonst.data.mlet === 13 /* S_MIMIC */)
        game.youmonst.m_ap_type = 0; /* M_AP_NOTHING; C teleport.c:493-496 */
    /* C 499-504: leaving an engulfer — ball&chain are off map while swallowed */
    if (was_swallowed) {
        if (u.uball) { /* Punished */
            ball_active = true;
            ball_still_in_range = allow_drag = false;
        }
        await docrt(true); /* cls() pages the pending topline (display.c:2196) */
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
    await u_on_newpos(nux | 0, nuy | 0);
    /* C 526: fill_pit(u.ux0, u.uy0) */
    await fill_pit(u.ux0 | 0, u.uy0 | 0);
    /* C 527-528: put back the ball & chain if they were taken off the map. */
    if (ball_active && u.uchain && (u.uchain.where | 0) === OBJ_FREE)
        await placebc();
    /* C teleport.c:529: refresh cloud membership after moving the hero. */
    update_player_regions();
    /* C 536: newsym(u.ux0, u.uy0) — clear hero from old spot */
    newsym(u.ux0, u.uy0);
    see_monsters();
    /* C 538/541: vision_full_recalc then vision_recalc(0) before effects;
     * notice_mon_off() (teleport.c:539) keeps vision_recalc's notice_all_mons
     * quiet until the final notice_mon_on()/notice_all_mons(TRUE). */
    game.a11y ??= {};
    game.a11y.mon_notices_blocked = (game.a11y.mon_notices_blocked || 0) + 1;
    vision_recalc(0);
    nomul(0);
    /* C 545-547: materialize message (flags.verbose defaults On) */
    if (is_teleport && (game.flags?.verbose !== false)) {
        const same = (nux === u.ux0 && nuy === u.uy0);
        await pline(`You materialize in ${same ? 'the same' : 'a different'} location!`);
    }
    if (game.level.at(u.ux, u.uy).typ !== game.level.at(u.ux0, u.uy0).typ)
        await switch_terrain();
    /* C teleport.c:551-566 — guard alarm precedes room-entry messages. */
    if (vault_guard) {
        const save_urooms = u.urooms;
        u.urooms = String.fromCharCode(...in_rooms(u.ux, u.uy, VAULT));
        if (!vault_occupied(u.urooms))
            await uleftvault(vault_guard);
        u.urooms = save_urooms;
    }
    /* hack.c:3339 pooleffects(TRUE) — narrow wiring for the leaving-water arm
     * (hack.c:3237-3268): a hero teleported out of water by a survived drowning
     * (trap.c:5199 safe_teleds) still has u.uinwater set, so C prints
     * back_on_ground(FALSE) and docrt()s here, before check_special_room. */
    /* hack.c:3339-3340 `if (pooleffects(TRUE)) goto spotdone;` — also the
     * entering arm: a hero who jumps/teleports onto lava or water falls in
     * (drown()/lava_effects()); true means she changed location, so the rest
     * of spoteffects is skipped. */
    if (!game.in_steed_dismounting && !game.iflags?.in_lava_effects) {
        /* hack.c:3327-3340 — spoteffects()'s inspoteffects recursion guard and
         * statics (shared with js/landing-effects.js): a hero poly'd to an iron
         * golem teleported into water is rehumanized by drown()'s losehp(), and
         * polyman()'s nested spoteffects(TRUE) must return at once. */
        const st = game._spoteffectsState ||= {
            depth: 0, x: 0, y: 0, terrain: 0, trap: null, trapType: 0,
        };
        const typ = game.level?.locations?.[u.ux]?.[u.uy]?.typ ?? 0;
        if (st.depth && u.ux === st.x && u.uy === st.y && st.terrain === typ)
            return;
        ++st.depth;
        st.terrain = typ;
        st.x = u.ux;
        st.y = u.uy;
        /* hack.c:3344-3346 — spoteffects()'s own switch_terrain() trigger:
         * terrain differs from the square just left, or terrain_typ was
         * invalidated (u_on_newpos; it stays MAX_TYPE while !terrainstatus). */
        if (typ !== (game.level?.locations?.[u.ux0]?.[u.uy0]?.typ ?? 0)
            || game.iflags?.terrain_typ === MAX_TYPE)
            await switch_terrain();
        let relocated;
        try {
            relocated = await pooleffects(true);
        } finally {
            --st.depth;
        }
        if (relocated)
            return;
    }
    /* hack.c:3335-3336 — spoteffects() is a no-op under in_lava_effects, so
     * the room-entry message waits for lava_effects()'s own spoteffects(). */
    if (!game.iflags?.in_lava_effects)
        await check_special_room(false);
    /* hack.c:3353-3354 */
    if (!game.iflags?.in_lava_effects && IS_SINK(game.level?.locations?.[u.ux]?.[u.uy]?.typ ?? 0)
        && Levitation_hero())
        await dosinkfall();
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
    /* Under a live WIN_STOP (ESC'd --More-- while fainting) the materialize
     * pline was suppressed (topl.c:257 skip), so _pending_message is empty and
     * the topline C still shows is the already-published result; do not
     * clobber it with the empty pending line. */
    if (is_teleport && (game.flags?.verbose !== false || game._pending_message)
        && (game._pending_message || !game._resultMessage)) {
        const _joins = _topl_joins_snapshot(game._pending_message);
        game._resultMessage = game._pending_message;
        game._pending_message = '';
        game._resultMessageJoins = { src: game._resultMessage, joins: (_joins || []).slice() };
        /* dotele() emits morehungry(100) after teleds returns.  Keep a marker so
         * allmain's post-rhack channel handoff appends that later pline to this
         * already-published teleport result instead of dropping it. */
        game._teleportResultPublished = true;
    }
    /* hack.c:3335-3336 — spoteffects() is a no-op while lava_effects() is
     * mid-rescue (iflags.in_lava_effects); lava_effects() re-runs it itself
     * after "You find yourself ..." (trap.c:6959). */
    if (!game.in_steed_dismounting && !game.iflags?.in_lava_effects) {
        /* hack.c:3375-3394 — pickup(1) before dotrap unless the trap is a pit
         * (then after); a hero who jumps/teleports onto a trap springs it. */
        const _trap = t_at(u.ux | 0, u.uy | 0);
        const _pit = _trap && is_pit(_trap.ttyp | 0);
        if (!_pit) await _spoteffects_pickup();
        const st = game._spoteffectsState;
        if (_trap && (!st.trap || st.trapType !== _trap.ttyp)) {
            st.trap = _trap;
            st.trapType = _trap.ttyp;
            try {
                await dotrap(_trap, 0);
            } finally {
                st.trap = null;
                st.trapType = 0;
            }
        }
        if (_pit) await _spoteffects_pickup();
        /* hack.c:3402-3414 — Warning alerts you to ice danger */
        if (Warning() && is_ice(u.ux, u.uy)) {
            const _left = spot_time_left(u.ux, u.uy, MELT_ICE_AWAY);
            if (_left && _left < 15)
                await pline(['The ice seems very soft and slushy.',
                    'You feel the ice shift beneath you!',
                    'The ice, is gonna BREAK!'][_left < 5 ? 2 : _left < 10 ? 1 : 0]);
        }
    }
    /* hack.c:3416-3454 — OUTSIDE the in_steed_dismounting guard: a knocked
     * dismount (steed.c:687-699) can enexto the steed onto the very square
     * teleds puts the hero on, and C's spoteffects then mnexto()s it ("jumps
     * near you from the ceiling"). */
    if (!game.iflags?.in_lava_effects)
        await spoteffects_mon_underfoot();
    // C teleport.c:569: the invocation clue follows arrival spoteffects.
    await invocation_message();
    game.a11y.mon_notices_blocked--; /* C teleport.c:569 notice_mon_on() */
    notice_all_mons(true); /* C teleport.c:570 */
    if (is_teleport && game._resultMessage && game._pending_message) {
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
    /* C teleport.c:748 — if (!Passes_walls) cc_flags |= CC_SKIP_INACCS;
     * (youprop.h:286 Passes_walls = HPasses_walls || EPasses_walls) */
    const pw = game.u?.uprops?.[PASSES_WALLS];
    if (!(pw && ((pw.intrinsic | 0) || (pw.extrinsic | 0))))
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
        if (!wizard)
            return;
        if ((await yn_function('Override?', 'yn', 'n', true)) !== 'y') {
            /* C win/tty/topl.c:545 — tty_yn_function never erases the answered
             * prompt; it stays on the terminal until a later pline overwrites it.
             * Under query_menu the menu arm's clear_nhwindow(WIN_MESSAGE)
             * (cmd.c:5459) empties the topline instead — no residue. */
            if (!game.iflags?.query_menu)
                game._topl_sticky = 'Override? [yn] (n)';
            return;
        }
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

/* C ref: teleport.c:772-783 vault_tele — the "once" teleport trap's
 * destination is the level's VAULT, not a random square.  mklev's makevtele()
 * plants exactly one such trap on any level that got a vault (mklev.c:821-824
 * makeniche(TELEP_TRAP), whose ttmp->once = 1 is already ported at
 * js/mklev.js:10436), and stepping on it is how the hero gets into the vault
 * without digging.  RNG-LOAD-BEARING: somexyspace() draws somex()/somey()
 * inside the 2x2 vault (rn2(2) twice), where a fall-through to tele() draws
 * safe_teleds' rnd(COLNO-1)/rn2(ROWNO) instead. */
export async function vault_tele() {
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
        } else if (!(await next_to_u())) {
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
    if (!(await next_to_u())) {
        await pline(shudder_for_moment); /* C: You1(shudder_for_moment) */
        return;
    }

    /* C 1458-1461: if landed from another portal, do nothing.
     * ("problem: level teleport landing escapes the check" — C's own note.) */
    if (!on_level(u.uz, u.uz0))
        return;

    /* C 1463 */
    /* pline.c:273-277: this pline's flush_screen() freezes the terminal at the
     * instant a prior unacknowledged line overflows (more()), i.e. BEFORE
     * make_stunned below; pin the page frame as a movemon window does. */
    const _wasMB = game._inMovemonBlock;
    game._inMovemonBlock = true;
    try { await pline('You activated a magic portal!'); } /* C: You("activated a magic portal!") */
    finally { game._inMovemonBlock = _wasMB; }

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
         * helper above checks intrinsic only, matching C. */
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
/* C mon.c:3880 `static long msgmv`: process-lifetime, NOT saved with the game. */
import { msgmv, set_msgmv } from './mon.js';
import { MAGICAL_BREATHING, SWIMMING, WWALKING } from './const.js'; // relocate-fns
import { is_lava } from './dbridge.js'; // relocate-fns
import { accessible as accessible_mv, closed_door as closed_door_mv } from './monmove.js'; // relocate-fns
import { _GP_M1_AMORPHOUS, _GP_M1_AMPHIBIOUS, _GP_M1_SWIM, _GP_M2_ROCKTHROW, _gp_Fire_resistance, _gp_Flying, _gp_Is_waterlevel, _gp_Levitation, _gp_Upolyd, _gp_is_pool, _gp_is_waterwall, _gp_is_youmonst, _gp_m_at, _gp_m_in_air, _gp_passes_walls, _gp_uprop_he } from './trap.js'; // relocate-fns
export { mnexto } from './mon.js'; // relocate-fns
export { MIGR_RANDOM_MTT, S_ELEMENTAL_MTT, amorphous, is_rider_tp, ledger_no_tp }; // relocate-fns



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
    update_monster_region(mtmp);

    if (mtmp.wormno) /* now put down tail */
        place_worm_tail_randomly_local(mtmp, x, y);

    if (u.ustuck === mtmp) {
        if (u.uswallow) {
            /* C teleport.c:1692-1694: moving the engulfer carries the hero
             * and redraws the stomach before the teleport message. */
            await u_on_newpos(mtmp.mx | 0, mtmp.my | 0);
            await check_special_room(false);
            /* docrt() -> swallowed(1) -> cls() (display.c:2064) first pages the
               standing topline via display_nhwindow(WIN_MESSAGE); this port's
               cls() discards it, so page it here as unstuck() does (mhitu.js). */
            {
                const _line = _topl_merge_result(game._resultMessage || '',
                    game._pending_message || '',
                    _topl_joins_snapshot(game._resultMessage || ''));
                if (_line) {
                    game._resultMessage = '';
                    const _vfr = game.vision_full_recalc;
                    game.vision_full_recalc = 0;
                    /* more() does not run bot(): the status row is the last one painted
                       (moves++ at allmain.c:244 precedes movebubbles at :375). */
                    /* C display.c:2196: cls() pages before bot()/timebot(); more()
                       keeps the last-painted status row (moves++ at allmain.c:244
                       precedes movebubbles at :375). */
                    const _heldBotl = game._botlPaintHeld;
                    game._botlPaintHeld = true;
                    // C display.c:2196: cls() pages before bot()/timebot().
                    try { await force_more_from_cls(_line); } finally { game._botlPaintHeld = _heldBotl; }
                    game.vision_full_recalc = _vfr;
                    if (game._topl_win_stop_armed) {
                        game._topl_win_stop_armed = false;
                        game._topl_win_stop = true;
                    }
                }
            }
            await docrt();
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
            await You(`and ${mon_nam(mtmp)} teleport together.`);
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
        /* wand discovery only happens if a message is delivered (C teleport.c:
         * 1728-1731, "bug?"); current_wand is null for spell/attack/#invoke. */
        const WAN_TELEPORTATION = 424;
        if (game.gc_current_wand && (game.gc_current_wand.otyp | 0) === WAN_TELEPORTATION)
            discover_object(WAN_TELEPORTATION, true, true, true); /* makeknown */
    }

    /* shopkeepers will only teleport if you zap them with a wand of
       teleportation or if they've been transformed into a jumpy monster */
    if (resident_shk && !inhishop(mtmp))
        await make_angry_shk(mtmp, oldx, oldy);

    /* if a monster carrying shop goods teleports out of the shop, blame
       it on the hero */
    if (mtmp.minvent && !costly_spot(x, y)) {
        const shkp = await find_objowner(mtmp.minvent, oldx, oldy);
        const peaceful = !shkp || shkp.mpeaceful;

        for (let otmp = mtmp.minvent; otmp; otmp = otmp.nobj) {
            if (otmp.no_charge)
                otmp.no_charge = 0;
            else if (shkp && (await onshopbill_local(otmp, shkp, true)))
                await stolen_value(otmp, oldx, oldy, peaceful, false);
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
    mtmp._mapRemoved = true;
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

/* C ref: shk.c onshopbill/stolen_value — shop goods carried by a relocated
 * monster are checked against the owner's bill. */
async function onshopbill_local(obj, shkp, silent) { return await onshopbill(obj, shkp, silent); }

/* C ref: mondata.h DEADMONSTER(mon) macro — ((mon)->mhp <= 0). */
function DEADMONSTER(mon) {
    return (mon.mhp | 0) <= 0;
}

function place_monster_local(mon, x, y) {
    return place_monster(mon, x, y);
}

/* local copy: control_teleport (from js/eat.js, not exported) */
const M1_TPORT_CNTRL = 0x04000000;
function control_teleport(ptr) {
    return ((ptr.mflags1 & M1_TPORT_CNTRL) !== 0) ? 1 : 0;
}

/* local copy: is_rider (from js/mklev.js, not exported) */
function is_rider_tp(ptr) {
    const n = ptr?.pmidx ?? ptr?.mnum ?? ptr?.mndx;
    return (n | 0) === 311 || (n | 0) === 312 || (n | 0) === 313;
}

function enexto(cc, xx, yy, mdat) {
    const mm = enexto_out(xx, yy, mdat);
    if (!mm)
        return false;
    cc.x = mm.x; cc.y = mm.y;
    return true;
}


const S_EEL = 57;
const S_HUMAN = 53;
const S_VAMPIRE = 48;
const S_ANGEL = 27;
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
/* C youprop.h:240-275: only Levitation and Flying test blocked; the
 * Flying and Swimming macros also include the steed's abilities. */
function uprop_on(idx, checkblocked = false) {
    const p = game.u?.uprops?.[idx];
    if (!p) return false;
    return !!(((p.intrinsic | 0) || (p.extrinsic | 0))
              && (!checkblocked || !(p.blocked | 0)));
}
const LEVITATION_IDX = 48, FLYING_IDX = 49, WWALKING_IDX = 50, SWIMMING_IDX = 51,
      MAGICAL_BREATHING_IDX = 52;
function Levitation_hero() { return uprop_on(LEVITATION_IDX, true); }
function Flying_hero() {
    const steed = game.u?.usteed;
    return !!((uprop_on(FLYING_IDX) || (steed && ((steed.data.mflags1 | 0) & 1 /* M1_FLY */)))
              && !(game.u?.uprops?.[FLYING_IDX]?.blocked | 0));
}
function Wwalking_hero() { return uprop_on(WWALKING_IDX) && !Is_waterlevel_local(); }
function Swimming_hero() {
    return !!(uprop_on(SWIMMING_IDX)
              || (game.u?.usteed && is_swimmer(game.u.usteed.data)));
}
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

function inhistemple_local(mtmp) { return inhistemple_real(mtmp); }

/* C ref: mondata.h:46 haseyes(ptr) = (ptr->mflags1 & M1_NOEYES) == 0 */
function haseyes(mdat) { return ((mdat.mflags1 | 0) & M1_NOEYES) === 0; }

/* C ref: teleport.c:50-76 goodpos_onscary(x, y, mptr) — the permonst-only
 * approximation of onscary(), used by goodpos() for the m_id == 0 case
 * (fake monster structs from makemon/mplayer, i.e. "is this square scary
 * to *this monster type*" with no individual monster to consult).
 *
 * `mptr == &mons[PM_MINOTAUR]` is a permonst POINTER identity test in C;
 * ported as a pmidx comparison, the same convention this file already uses
 * for likes_lava_local() — mons[] rows arrive here as reconstructed
 * permonst templates, so JS reference equality would never fire.
 *
 * C's own teleport.c:57 remark about simplifying onscary() describes C's
 * goodpos_onscary itself, not a port gap; this body matches C 52-76 line for line.
 * sengr_at("Elbereth", x, y, TRUE) is the js/engrave.js port (HEADSTONE named
 * there), called directly. */
/* C teleport.c:52-76 goodpos_onscary(x, y, mptr) — faithful port */
export function goodpos_onscary(x, y, mptr) {
    /* C teleport.c:57 (C's own remark, ported verbatim below): unlike
       onscary(), this permonst-only test has no Angel/lawful-minion arm. */
    const mlet = mptr.mlet | 0;
    if (mlet === S_HUMAN || mlet === S_ANGEL
        || is_rider_tp(mptr) || unique_corpstat_local(mptr))
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
    /* C teleport.c:75 sengr_at("Elbereth", x, y, TRUE) */
    return !!sengr_at("Elbereth", x, y, true);
}

/* C ref: teleport.c:85-185 goodpos(x,y,mtmp,gpflags) — full port, used by
 * enexto_core()/rloc_pos_ok()/rloc().  teleok() above inlines the
 * goodpos(x, y, &gy.youmonst, 0) case for the hero. */
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
        if (u_at(x, y) && !is_youmonst(mtmp)
            && (mtmp !== u.ustuck || !u.uswallow)
            && (!u.usteed || mtmp !== u.usteed))
            return false;
    }

    if (MON_AT(x, y) && avoid_monpos) return false;

    if (mtmp) {
        const mtmp2 = MON_AT(x, y);
        if (mtmp2 && (mtmp2 !== mtmp || mtmp.wormno)) return false;

        mdat = mtmp.data;
        const is_hero = is_youmonst(mtmp);
        if (is_pool_local(x, y) && !ignorewater) {
            if (is_hero) {
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
            } else if (is_hero) {
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
            const scary = mtmp.m_id ? onscary(x, y, mtmp) : goodpos_onscary(x, y, mdat);
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
    const surface = lev.typ === DRAWBRIDGE_UP ? db_under_typ(lev.drawbridgemask | 0) : lev.typ;
    return !!(ACCESSIBLE(surface) && !closed_door_local(x, y));
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

    if (game._levelgenPaintFreeze && !game._status_blanked && game._levtele_menu) {
        game._status_blanked = true;
        game._status_blanked_by_mtc = true;  /* released by goto_level after losedogs */
    }
    /* (set before the pline: its flush must not repaint the arrival Dlvl) mid-goto_level the status row still holds the last bot() paint (Dlvl of the
     * level being left): do.c:1840 docrt()/bot() has not run yet */
    if (game._levelgenPaintFreeze && !game._status_blanked) {
        /* mklev's own freeze frame (baalz_fixup -> rloc) carries no dlevel; the
         * physical status row is then the last bot() paint */
        const fz = game._levelgenPaintFreeze.dlevel != null ? game._levelgenPaintFreeze
                 : game._lastPaintedBotl;
        if (fz && fz.dlevel != null)
            game._botlUzFrozen = { dnum: fz.dnum, dlevel: fz.dlevel };
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
            const ans = await yn_function(q, 'yn', 'n', true);
            /* hack.h y_n(): the answered prompt stays on the topline (end.js y_n) */
            /* hack.h:1329 y_n(): the answered prompt stays on the topline */
            if (!game.gi?.in_doagain) {
                game._topl_sticky = `${q} [yn] (n)`;  /* topl.c:544 leaves toplin NON_EMPTY: parse() erases it */
            }
            if (ans === 'y')
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
export async function teleport_pet(mtmp, force_it) {
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
            /* C impossible() prints via urgent_pline, then release_it. */
            await rloc_impossible('%s is leashed, without a leash.', Monnam(mtmp));
            m_unleash(mtmp, false);
            return true;
        }
        if (leash.cursed && !force_it) {
            yelp(mtmp);
            return false;
        }
        await pline('Your leash goes slack.');
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
    if (await teleport_pet(mtmp, force_it)) {
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
                    tolevel = {};
                    assign_level(tolevel, valley);
                } else {
                    /* A malformed/incomplete dungeon has no legal C target;
                     * preserve the trap's finished result without migrating. */
                    return TRAP_EFFECT_FINISHED_MTT;
                }
            } else if (Is_botlevel(u?.uz)) {
                if (in_sight && trap.tseen)
                    await pline_mon(mtmp, `${Monnam(mtmp)} avoids the ${(tt === HOLE_MTT) ? 'hole' : 'trap'}.`);
                return TRAP_EFFECT_FINISHED_MTT;
            } else {
                tolevel = {};
                assign_level(tolevel, trap.dst);
                clamp_hole_destination(tolevel);
            }
        } else if (tt === MAGIC_PORTAL_MTT) {
            if (In_endgame(u.uz)
                && (mon_has_amulet(mtmp) || is_home_elemental(mtmp.data)
                    || rn2(7))) {
                if (in_sight && (mtmp.data?.mlet | 0) !== S_ELEMENTAL_MTT) {
                    await pline_mon(mtmp, `${Monnam(mtmp)} seems to shimmer for a moment.`);
                    seetrap(trap);
                }
                return TRAP_EFFECT_FINISHED_MTT;
            } else {
                tolevel = {};
                assign_level(tolevel, trap.dst);
                migrate_typ = MIGR_PORTAL_MTT;
            }
        } else if (tt === LEVEL_TELEP_MTT || tt === NO_TRAP_MTT) {
            /* C teleport.c:2048-2082.  NO_TRAP is used by forced monster
             * displacement; its onscary(0,0,mtmp) guard prevents the Wizard,
             * Riders, lawful minions, angels, and occupants of their own
             * special rooms from being migrated. */
            if (mon_has_amulet(mtmp) || In_endgame(u.uz)
                || (tt === NO_TRAP_MTT && onscary(0, 0, mtmp))) {
                if (in_sight)
                    await pline_mon(mtmp, `${Monnam(mtmp)} seems very disoriented for a moment.`);
                return TRAP_EFFECT_FINISHED_MTT;
            }
            if (tt === NO_TRAP_MTT) {
                /* Forced displacement returns the monster to this level on
                 * re-entry, at a random location rather than its old square. */
                tolevel = {};
                assign_level(tolevel, u.uz);
            } else {
                const nlev = random_teleport_level();
                if (nlev === (depth(u.uz) | 0)) {
                    if (in_sight)
                        await pline_mon(mtmp, `${Monnam(mtmp)} shudders for a moment.`);
                    return TRAP_EFFECT_FINISHED_MTT;
                }
                tolevel = get_level(nlev);
            }
        } else {
            await rloc_impossible("mlevel_tele_trap: unexpected trap type (%d)", tt);
            return TRAP_EFFECT_FINISHED_MTT;
        }

        if (in_sight) {
            await pline_mon(mtmp, `Suddenly, ${mon_nam(mtmp)} ${(tt === HOLE_MTT) ? 'falls into a hole'
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
const S_ELEMENTAL_MTT = 31; /* defsym.h MONSYM(31, 'E', ELEMENTAL, S_ELEMENTAL) */
/* C dungeon.c:1376 ledger_no(lev), including its xint16 result. */
function ledger_no_tp(lev) {
    return ledger_no(lev);
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

    if (await teleport_pet(mtmp, false)) {
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
        if (On_W_tower_level(game.u?.uz) && !game.dndest?.nlx) await rloc_impossible("No boundary for Wizard's Tower?");
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

    /* C 1856-1878: gather candidates unshuffled (CC_UNSHUFFLED)
       and shuffle them in rloc() itself (teleport.c:1856-1860), then
       walk looking for a rloc_pos_ok() spot, remembering backup. */
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
        if (rlocflags & RLOC_ERR)
            await rloc_impossible("rloc(): couldn't relocate monster");
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
            await You(`are no longer inside ${mon_nam(mtmp)}!`);
        await unstuck(mtmp);
        if (!await rloc(mtmp, RLOC_MSG))
            await m_into_limbo(mtmp);
    } else if ((is_rider_tp(mtmp.data) || control_teleport(mtmp.data))
               && rn2(13) && enexto(cc, game.u.ux, game.u.uy, mtmp.data)) {
        await rloc_to(mtmp, cc.x, cc.y);
    } else {
        if (!await rloc(mtmp, RLOC_MSG))
            return false;
    }
    return true;
}



const M3_COVETOUS = 0x001f;

/** C mondata.h is_lord — lord to its kind */
function is_lord(ptr) { return (ptr.mflags2 & M2_LORD) !== 0; }

/** C mondata.h is_dlord — demon lord: is_demon && is_lord */
function is_dlord(ptr) { return is_demon(ptr) && is_lord(ptr); }

/** C mondata.h is_covetous — wants something (M3_COVETOUS mask) */
function is_covetous(ptr) { return (ptr.mflags3 & M3_COVETOUS) !== 0; }

/** C teleport.c m_blocks_teleporting — does this monster block others' teleport? */
function m_blocks_teleporting(mtmp) {
    if (is_dlord(mtmp.data) || is_dprince(mtmp.data))
        return true;
    return false;
}

/** C mon.c:4534 get_iter_mons — canonical port imported from js/mon.js */

/** C teleport.c noteleport_level — is teleporting prevented on this level for this monster? */
export function noteleport_level(mon) {
    /* demon court in Gehennom prevent others from teleporting */
    if (Inhell() && !(is_dlord(mon.data) || is_dprince(mon.data))) {
        if (get_iter_mons(m_blocks_teleporting))
            return true;
    }

    /* natural no-teleport level; covetous monsters can bypass these */
    if (game.level.flags.noteleport && !is_covetous(mon.data))
        return true;

    /* wand of stasis prevents teleportation while the effect is active
       (even for covetous monsters) */
    if (game.level.flags.stasis_until >= game.moves)
        return true;

    return false;
}

/* C teleport.c:814-838.  Reservoir selection consumes one rn2(count) for
 * each live on-map tame monster, before the adjacent placement rolls. */
export async function tele_to_rnd_pet() {
    const u = game.u || {};
    if (noteleport_level(game.youmonst)) return;
    let pet = null, count = 0;
    for (let mon = game.fmon; mon; mon = mon.nmon) {
        if ((mon.mhp | 0) <= 0 || !mon.mtame || (mon.mstate | 0) !== MON_FLOOR)
            continue;
        ++count;
        if (rn2(count) === 0) pet = mon;
    }
    if (!pet || dist2(pet.mx | 0, pet.my | 0, u.ux | 0, u.uy | 0) <= 2)
        return;
    const x = (pet.mx | 0) + rn2(3) - 1;
    const y = (pet.my | 0) + rn2(3) - 1;
    if (isok(x, y) && teleok(x, y, false))
        await teleds(x, y, TELEDS_TELEPORT);
}

function _rloco_on_W_tower_level(lev) {
    if (!lev)
        return false;
    const g = game;
    const same = (a) => !!(a && (a.dnum | 0) === (lev.dnum | 0)
                            && (a.dlevel | 0) === (lev.dlevel | 0));
    return same(g.wiz1_level) || same(g.wiz2_level) || same(g.wiz3_level);
}

/* C ref: shk.c:5368-5381 — canonical helper also handles stored shk_x/shk_y. */
function _rloco_costly_adjacent(shkp, x, y) {
    return costly_adjacent(shkp, x, y);
}

/* First entry of in_rooms(x, y, typewanted), or 0 if the list is empty --
 * mirrors C's `*in_rooms(...)` (in_rooms returns a room-number string; the
 * leading char is the "primary" room, 0 == none). */
function _rloco_room0(x, y, typewanted) {
    const rooms = in_rooms(x, y, typewanted);
    return rooms && rooms.length ? (rooms[0] | 0) : 0;
}

/* True iff nonzero room `roomno` appears anywhere in in_rooms(x, y,
 * typewanted)'s list -- mirrors C's `strchr(in_rooms(...), roomno)` (a room
 * number of 0 never matches, same as every call site's own `h &&`/`oo &&`
 * guard ahead of it). */
function _rloco_room_has(x, y, typewanted, roomno) {
    if (!roomno)
        return false;
    const rooms = in_rooms(x, y, typewanted);
    return !!(rooms && rooms.includes(roomno));
}

/* C ref: mondata.h is_rider(ptr), used by teleport.c:2107. */
function _rloco_is_rider(obj) {
    const n = obj?.corpsenm | 0;
    return n === PM_DEATH || n === PM_FAMINE || n === PM_PESTILENCE;
}

const RLOCO_CORPSE = 265; /* objects[].otyp CORPSE -- same literal js/dig.js,
                              js/dog.js and js/hold_another_object.js each use
                              locally for this otyp. */

/* C ref: teleport.c:2101-2181 rloco(obj) — false if the object is gone.
 * Await billing and its messages before placing the object, as C does. */
export async function rloco(obj) {
    /* teleport.c:2107-2110 -- a Rider corpse revives instead of relocating;
     * C returns FALSE when revival consumes the object. */
    if ((obj.otyp | 0) === RLOCO_CORPSE && _rloco_is_rider(obj)) {
        if (await revive_corpse(obj))
            return false;
    }

    obj_extract_self(obj);
    const otx = obj.ox | 0;
    const oty = obj.oy | 0;
    const dndest = game.dndest || {};
    const restrictedFall = (otx === 0 && dndest.lx);

    let tx, ty;
    let tryLimit = 4000;
    for (;;) {
        tx = rn1(COLNO - 3, 2);
        ty = rn2(ROWNO);
        if (!--tryLimit)
            break;
        if (!goodpos(tx, ty, null, 0))
            continue;
        if (restrictedFall) {
            const inDn = within_bounded_area(tx, ty, dndest.lx, dndest.ly, dndest.hx, dndest.hy);
            const inNear = dndest.nlx
                ? within_bounded_area(tx, ty, dndest.nlx, dndest.nly, dndest.nhx, dndest.nhy)
                : false;
            if (!inDn || inNear)
                continue;
        }
        if (dndest.nlx && _rloco_on_W_tower_level(game.u?.uz)) {
            const nowIn = within_bounded_area(tx, ty, dndest.nlx, dndest.nly, dndest.nhx, dndest.nhy);
            const wasIn = within_bounded_area(otx, oty, dndest.nlx, dndest.nly, dndest.nhx, dndest.nhy);
            if (nowIn !== wasIn)
                continue;
        }
        break;
    }

    if (await flooreffects(obj, tx, ty, 'fall')) {
        if (!(otx === 0 && oty === 0))
            newsym(otx, oty);
        return false;
    } else if (otx === 0 && oty === 0) {
        /* fell through a trap door; no update of old loc needed */
    } else {
        const shkp = await find_objowner(obj, otx, oty);
        const objinshop = !!(shkp && costly_spot(otx, oty));
        const onboundary = !!(shkp && _rloco_costly_adjacent(shkp, otx, oty));

        if (objinshop || (obj.unpaid && onboundary)) {
            const u = game.u || {};
            const h = _rloco_room0(u.ux | 0, u.uy | 0, SHOPBASE);
            const oo = _rloco_room0(otx, oty, 0);
            const hinshop = !!(h && _rloco_room_has(shkp.mx | 0, shkp.my | 0, 0, h));

            if (hinshop && costly_spot(tx, ty) && oo && _rloco_room_has(tx, ty, 0, oo)) {
                if (obj.unpaid)
                    await subfrombill(obj, shkp);
            } else if (hinshop && _rloco_costly_adjacent(shkp, tx, ty)
                       && oo && _rloco_room_has(tx, ty, 0, oo)) {
                if (!obj.unpaid) {
                    // C teleport.c:2174: finish billing before place_object().
                    await shk_addtobill(obj, false, false, false);
                }
            } else {
                await stolen_value(obj, otx, oty, false, false);
            }
        }

        newsym(otx, oty);
    }

    place_object(obj, tx, ty);
    newsym(tx, ty);
    return true;
}

// C ref: dungeon.c:3286 dooverview() — the '^O' (C('o')) overview command.
//   dooverview → show_overview(0, 0) (dungeon.c:3296) builds an NHW_MENU listing
//   each visited dungeon level (traverse_mapseenchn → print_mapseen,
//   dungeon.c:3508).  The menu is PICK_NONE for a normal #overview (why==0), so
//   nothing is selectable and ESC/space dismisses it.  No turn, no RNG.
//
//   with no interesting features discovered yet, so the menu is exactly:
//     "The Dungeons of Doom:"        ← dungeon header (printdun, dunlev_ureached
//                                       == entry_lev so plain "%s:", dungeon.c:3534)
//     "Level 1: <- You are here."    ← level entry (final==0 → no TAB; on_level
//                                       → " <- You are here.", dungeon.c:3554/3566)
//     "(end)"
//   The level entry is a non-accelerator menu item, so the tty menu indents it
//   by the 3-char accelerator field; the header and "(end)" are flush at the
//   window's left column (WIN_COL=41, matching the recorded reference).
// C ref: dungeon.c:3530-3545 dungeon header; dungeon.c:3548-3576 level line.
// C ref: teleport.c:917-1029 dotelecmd() — C('t') / ^T "teleport around the
// level"; 'm ^T' chooses among several teleport modes.
//
//   if (!wizard)
//       return dotele(FALSE) ? ECMD_TIME : ECMD_OK;
//   ...
//   if (!iflags.menu_requested) {
//       ignore_restrictions = TRUE;
//   } else { ...the four-way tport-mode menu... }
//   res = dotele(ignore_restrictions);
//   HTeleportation = save_HTele; ETeleportation = save_ETele;
//   ...
//   return res ? ECMD_TIME : ECMD_OK;
//
// `wizard` global (js/options.js:62-63 → flags.debug).  With no 'm' prefix,
// iflags.menu_requested is FALSE, so the menu is skipped and ignore_restrictions
// is TRUE — dotele(TRUE) — which is what makes scrolltele's teleport-control
// branch (teleport.c:872 `|| wizard`) fire and prompt for a destination.
//
// The saved/restored HTeleportation/ETeleportation are untouched on this path
// (only the 'm'-prefix menu arms write them), and `added`/`hidden` stay
// NOOP_SPELL, so the whole restore tail is a no-op here.
//
// dotele(break_the_rules=FALSE) (teleport.c:1033):
//   trap = t_at(u.ux,u.uy); if (trap && !trap->tseen) trap = 0;
//   ...trap handling (no trap at the hero tile here)...
//   if (!trap && !break_the_rules) {
//     if (!Teleportation || (u.ulevel < (Role_if(PM_WIZARD)?8:12)
//                            && !can_teleport(youmonst.data))) {
//       knownsp = known_spell(SPE_TELEPORT_AWAY);
//       castit  = (knownsp >= spe_Fresh && !Confusion);
//       if (!castit && !break_the_rules) {
//         You("%s.", (!Teleportation ? ((knownsp != spe_Unknown)
//                       ? "can't cast that spell" : "don't know that spell")
//                     : "are not able to teleport at will"));
//         return 0;  // ECMD_OK — no turn, no RNG
//       }
//     }
//   }
// = [Force Bolt, Sleep] with no Teleport Away), this is RNG-free and prints
// "You don't know that spell." then returns ECMD_OK.
const SPE_TELEPORT_AWAY = 400;

export async function dotelecmd() {
    const g = game;
    const tprop = g.u.uprops[TELEPORT], savedTele = { intrinsic: tprop.intrinsic, extrinsic: tprop.extrinsic };
    let hiddenSpell = null, savedSpell;
    // C ref: teleport.c:930-932 — `if (!wizard) return dotele(FALSE) ? ...`.
    // iflags.menu_requested is FALSE without the 'm' prefix, so the wizard arm
    // reduces to ignore_restrictions = TRUE; dotele(TRUE).
    const wizard = !!(g.flags && g.flags.debug);
    let ignore_restrictions = wizard;
    if (wizard && g.iflags && g.iflags.menu_requested) {
        // C ref: teleport.c:937-995 — 'm ^T' picks among the teleport modes.
        const tports = [
            ['n', 'normal ^T on demand; no spell, obey restrictions'],
            ['s', 'via spellcast; no intrinsic teleport'],
            ['t', 'try ^T without having it; no spell'],
            ['w', 'debug mode; ignore restrictions'],
        ];
        const menu = new TtyMenu({
            overlay: !(g.iflags.menu_overlay === false || g.iflags.menu_overlay === 0) /* wintty.c:1927 */ });
        for (const [let_, desc] of tports)
            menu.add_menu(let_.charCodeAt(0), let_, 0, desc, false, let_ === 'w');
        menu.end_menu('Which way do you want to teleport?');
        const { count, picks } = await menu.select_menu(PICK_ONE);
        let tmode;
        if (count > 0) {
            tmode = String.fromCharCode(picks[0]);
            if (count > 1 && tmode === 'w')
                tmode = String.fromCharCode(picks[1]);
        } else if (count === 0) {
            tmode = 'w'; /* preselected one explicitly chosen and toggled off */
        } else { /* ESC */
            return ECMD_OK;
        }
        // C teleport.c:997-998; spell.c:1749-1753 hides at NO_SPELL.
        if (tmode === 's' || tmode === 't') tprop.intrinsic = tprop.extrinsic = 0;
        if (tmode === 'n' || tmode === 't') {
            if (tmode === 'n') tprop.intrinsic |= I_SPECIAL;
            hiddenSpell = (g.spl_book || []).slice(0, num_spells()).find(sb => sb.sp_id === SPE_TELEPORT_AWAY);
            if (hiddenSpell) { savedSpell = { ...hiddenSpell }; hiddenSpell.sp_id = 0; }
        }
        // C spell.c:1735-1740: temporarily add a fresh spell, preserving the sentinel.
        if (tmode === 's' && known_spell(SPE_TELEPORT_AWAY) === 0) {
            const spl = g.spl_book || (g.spl_book = []), i = num_spells();
            if (i === MAXSPELL) await real_impossible('tport_spell: spellbook full');
            else {
                hiddenSpell = spl[i] || (spl[i] = { sp_id: 0, sp_lev: 0, sp_know: 0 }); savedSpell = { ...hiddenSpell };
                Object.assign(hiddenSpell, { sp_id: SPE_TELEPORT_AWAY, sp_lev: 6, sp_know: 20000 });
            }
        }
        ignore_restrictions = (tmode === 'w');
    }
    const res = await dotele(ignore_restrictions);
    if (wizard) Object.assign(tprop, savedTele); // C teleport.c:1019-1023 restores properties and spell.
    if (hiddenSpell) Object.assign(hiddenSpell, savedSpell);
    // C ref: teleport.c:1024 `return res ? ECMD_TIME : ECMD_OK`.
    //
    // This used to be `if (!res) g.context.move = 0;`, justified by "context.move
    // is 1 coming in (allmain.c:540), so ECMD_TIME is the no-op".  That holds on
    // the C('t') KEY chain and is FALSE on the '#'-name chain: doextcmd() sets
    // g.context.move = 0 before its dispatch ladder, so a one-sided write left
    // ECMD_TIME reading as ECMD_OK there and '#teleport' would have consumed no
    // turn.  Write both arms; on the key chain `= 1` is the same no-op the old
    // comment claimed for its own branch.
    g.context.move = res ? 1 : 0;
    return res ? ECMD_TIME : ECMD_OK;
}

// C ref: teleport.c:1032-1157 dotele(boolean break_the_rules) — the ^T body.
// Returns C's int: 1 = a turn was used (ECMD_TIME), 0 = none (ECMD_OK).
export async function dotele(break_the_rules) {
    const g = game;
    const u = g.u || {};
    // C ref: teleport.c:1040-1042 — an unseen trap does not count.
    let trap = t_at(u.ux, u.uy);
    if (trap && !trap.tseen)
        trap = null;
    // teleport "Jump in?" y_n, and the "you jump onto the teleportation trap"
    // message.
    let trap_once = false;
    if (trap) {
        if (trap.ttyp === LEVEL_TELEP && trap.tseen) {
            if ((await yn_function('There is a level teleporter here. Trigger it?', 'yn', 'n')) === 'y') {
                await level_tele_trap_u(trap, FORCETRAP);
                return 1;
            }
            trap = null;
        } else if (trap.ttyp === TELEP_TRAP) {
            trap_once = !!trap.once; /* trap may get deleted, save this */
            if (trap.once) {
                await pline('This is a vault teleport, usable once only.');
                if ((await yn_function('Jump in?', 'yn', 'n')) === 'n') {
                    trap = null;
                } else {
                    deltrap(trap);
                    newsym(u.ux, u.uy);
                }
            }
            if (trap)
                await You(`${u_locomotion('jump')} onto the teleportation trap.`);
        } else {
            trap = null;
        }
    }
    if (!trap && !break_the_rules) {
        // C ref: teleport.c:1069-1139 — the restriction checks (intrinsic /
        // teleport-away spell / hunger / strength / energy / carry capacity).
        // null means the intrinsic checks passed; an integer is a final result.
        const restricted = await _dotele_restricted();
        if (restricted !== null) return restricted;
    }
    // C ref: teleport.c:1145-1156.  next_to_u_real() (apply.c:918-928) is
    //   `!get_iter_mons(mleashed_next2u) && !(u.usteed && mon_has_amulet(u.usteed))`
    // the Amulet), so the shudder_for_moment arm is unreachable.
    // C ref: teleport.c:1143-1153 — vault_tele / fixed teledest / plain tele().
    // C ref: teleport.c:1150-1151 `iflags.travelcc.x = iflags.travelcc.y = 0;
    // tele();`.  The note that stood here called the clear "a no-op in this
    // port ... the only writer of iflags.travelcc in C is dotravel()'s accepted
    // destination (cmd.c:6019), whose getpos target pick is unported".  That was
    // true when written and is not now: dotravel() below is a full port and DOES
    // write iflags.travelcc from its accepted pick.  With the clear still
    // missing, a travel destination survived every later teleport and the NEXT
    // '_' opened its cursor on the stale cache instead of on the hero.
    // <33,9> with ',' (travelcc := <33,9>), step 676 teleports with ^T, and at
    // step 714 C opens the travel cursor on the hero at <22,6> while this port
    // opened it at <32,10>, the stale staircase.
    if (!(await next_to_u_real())) {
        await You('shudder for a moment.');
        return 0;
    }
    if (trap && trap_once) {
        await vault_tele();
    } else if (trap && isok(trap.teledest?.x, trap.teledest?.y)) {
        await teleds(trap.teledest.x, trap.teledest.y, TELEDS_TELEPORT);
    } else {
        g.iflags = g.iflags || {};
        if (!g.iflags.travelcc)
            g.iflags.travelcc = { x: 0, y: 0 };
        g.iflags.travelcc.x = g.iflags.travelcc.y = 0;
        await tele();
    }
    await next_to_u_real();
    /* dotele() applies its hunger penalty after tele() returns.  Mark this
     * command so allmain preserves that later pline across the post-rhack
     * channel handoff even when tele() left an earlier message channel live. */
    game._teleportResultPublished = true;
    // C ref: teleport.c:1155 `if (!trap) morehungry(100);`
    if (!trap)
        await morehungry(100);
    return 1;
}

// C ref: teleport.c:1069-1141 — intrinsic and spell teleport restrictions.
// Split out of dotele() so the wizard path
// above reads as C's single `if (!trap && !break_the_rules)` skip; null continues.
async function _dotele_restricted() {
    const g = game;
    const u = g.u || {};
    {
        // !Teleportation intrinsic/extrinsic (level-1 Wizard has none).
        const TELEPORT = 46; // prop.h TELEPORT
        const tprop = u.uprops && u.uprops[TELEPORT];
        const Teleportation = !!(tprop && (tprop.intrinsic || tprop.extrinsic));
        // C teleport.c:1072-1073,1104-1141: intrinsic teleport at will.
        const atwill = u.ulevel >= (Role_if(_FL_PM_WIZARD) ? 8 : 12)
            || !!(permonstTemplate(u.umonnum)?.mflags1 & 0x02000000 /* M1_TPORT */);
        // C ref: teleport.c:1080 spe_Fresh; spell.h: spe_Fresh = 1
        const spe_Fresh = 1;
        // C ref: teleport.c:1097-1098 energy = 5 * spellev(SPE_TELEPORT_AWAY);
        const FIRST_SPELL = 366; // objects.h: first shuffled spellbook in SPBOOK_META.
        const energy = 5 * SPBOOK_META[SPE_TELEPORT_AWAY - FIRST_SPELL].level;
        const knownsp = known_spell(SPE_TELEPORT_AWAY);
        const castit = !(Teleportation && atwill) && knownsp >= spe_Fresh && !Confusion_hero();
        if ((Teleportation && atwill) || castit) {
            const cantdoit = u.uhunger <= 10 ? 'are too weak from hunger'
                : acurr(u, A_STR) < 4 ? 'lack the strength' : u.uen < energy ? 'lack the energy' : null;
            if (cantdoit) { await You(`${cantdoit} ${castit ? 'for a teleport spell' : 'to teleport'}.`); return 0; }
            if (check_capacity('Your concentration falters from carrying so much.')) return 1;
            if (castit) { exercise(A_WIS, true); return ((await spelleffects(SPE_TELEPORT_AWAY, true, false)) & ECMD_TIME) ? 1 : 0; }
            u.uen -= energy;
            return null; // Restrictions passed; continue dotele() at next_to_u().
        }
        // u.ulevel < 8 for a Wizard and !can_teleport(youmonst) → enter spell branch.
        if (!Teleportation || !atwill) {
            // known_spell(SPE_TELEPORT_AWAY): scan spl_book for the spell otyp.
            // spe_Unknown unless found.  spl_book entries store sp_id (otyp).
            const known = knownsp !== 0;
            // castit = (knownsp >= spe_Fresh && !Confusion).  Not known → castit FALSE.
            // !castit && !break_the_rules → print the failure message, return ECMD_OK.
            const msg = !Teleportation
                ? (known ? "can't cast that spell" : "don't know that spell")
                : 'are not able to teleport at will';
            await pline(`You ${msg}.`);
            return 0; // C ref: teleport.c:1085 `return 0` — ECMD_OK, no turn
        }
    }
    return 0;
}

// C ref: dungeon.c:2169 unplaced_floater(dptr) — TRUE only for an unplaced Fort
// Ludios (knox) whose branch end1 floats off the top of the dungeon tree
// (end1.dnum == n_dgns).
function _pd_unplaced_floater(dnum, branches) {
    const g = game;
    const knoxDnum = g.knox_level ? g.knox_level.dnum : -1;
    if (dnum !== knoxDnum) return false;
    const n_dgns = g._n_dgns | 0;
    for (const br of (branches || []))
        if (br.end1.dnum === n_dgns && br.end2.dnum === dnum) return true;
    return false;
}

/* C invent.c:1104 addinv(obj) -> addinv_core0(obj, NULL, TRUE), scoped to the
 * one caller this port has for it: level_tele()'s endgame-prerequisite Amulet
 * (teleport.c:1243).  That object is fresh out of mksobj(), so every arm
 * addinv_core0 runs BEFORE the insert is a no-op on it — it is not in a shop
 * (no_charge already 0), has no contents, was not thrown (how_lost LOST_NONE),
 * and merges with nothing (the Amulet of Yendor is unique, and merged() would
 * need a same-otyp stack).  What is left is assigninvlet() + the insert +
 * addinv_core1/2, and those are what is ported here.
 * The insert: under flags.invlet_constant (fixinv, C default On) C puts the
 * object at the HEAD and then reorder_invent() sorts the chain by invlet, so a
 * chain that was already in letter order comes back in letter order with the
 * new object in its letter's place.  That is what the sorted insert below
 * produces, without needing reorder_invent's full comparator. */
/* The invlet-ordered insert shared by both of _levtele_addinv's arms — C's
 * `obj->nobj = gi.invent; gi.invent = obj;` head-insert followed by
 * reorder_invent() (invent.c:1117-1121), collapsed to a sorted insert because
 * a chain that is already in letter order comes back in letter order. */
function _levtele_invent_insert(obj) {
    const g = game;
    /* Was a hand-rolled sorted insert whose comparator sent '$' and '#' to the
     * TAIL; C's inv_rank (invent.c:731, `invlet ^ 040`) sends them to the HEAD
     * ('#'=0x03, '$'=0x04, then 'a'..'z'=0x41..0x5A, then 'A'..'Z').  Do what C
     * does instead of approximating it.
     * C invent.c:1117-1124 — the head insert + reorder is only the
     * `flags.invlet_constant || !prev` arm; under !fixinv a non-empty chain
     * gets the object appended at its END, which is where obj_to_let()'s
     * reassign() then letters it (a full pack: NOINVSYM '#'). */
    if (_invlet_constant() || !g.invent) {
        obj.nobj = g.invent ?? null;
        g.invent = obj;
        if (_invlet_constant())
            reorder_invent();
    } else {
        let prev = g.invent;
        while (prev.nobj) prev = prev.nobj;
        prev.nobj = obj;
        obj.nobj = null;
    }
}

function _levtele_addinv(obj) {
    const g = game;
    /* C invent.c:694 assigninvlet(obj) — the a-zA-Z scan starting just AFTER
     * gl.lastinvnr and wrapping, NOT from 'a'.  Same walk as
     * js/pickup_container.js _addinv and js/u_init.js _assigninvlet_ini; a
     * freed letter is only reused once the cursor wraps back onto it. */
    const inuse = new Array(52).fill(false);
    for (let o = g.invent; o; o = o.nobj) {
        if (o === obj || o.invlet == null) continue;
        const i = o.invlet | 0;
        if (97 <= i && i <= 122) inuse[i - 97] = true;
        else if (65 <= i && i <= 90) inuse[i - 65 + 26] = true;
        /* C invent.c:715-716 — `if (i == otmp->invlet) otmp->invlet = 0;`
         * another object already holds this letter, so it is not ours to keep. */
        if (i === (obj.invlet | 0)) obj.invlet = 0;
    }
    const _keep = obj.invlet | 0;
    if (_keep && ((97 <= _keep && _keep <= 122) || (65 <= _keep && _keep <= 90))) {
        addinv_core1(obj);
        obj.where = 3; /* obj.h OBJ_INVENT */
        _levtele_invent_insert(obj);
        /* C invent.c:1142 — addinv_core0's common added: tail. */
        obj.pickup_prev = 1;
        addinv_core2(obj);
        return obj;
    }
    const last = (g._lastinvnr ?? 51) | 0;
    let i;
    for (i = last + 1; i !== last; i++) {
        if (i === 52) { i = -1; continue; }
        if (!inuse[i]) break;
    }
    obj.invlet = inuse[i] ? 0x23 /* NOINVSYM '#' */ : (i < 26 ? (97 + i) : (65 + i - 26));
    g._lastinvnr = i;
    /* C invent.c:959 addinv_core1(obj) — carrying side effects; for the Amulet
     * this is `u.uhave.amulet = 1` + record_achievement(ACH_AMUL), and C runs it
     * BEFORE the chain insert. */
    addinv_core1(obj);
    obj.where = 3; /* obj.h OBJ_INVENT */
    _levtele_invent_insert(obj);
    /* C invent.c:1142 — addinv_core0's common added: tail. */
    obj.pickup_prev = 1;
    /* C invent.c:1024 addinv_core2(obj) — the luckstone/Archeologist-label arm;
     * neither fires for the Amulet, but C runs it and so does this. */
    addinv_core2(obj);
    return obj;
}

// Render print_dungeon's menu, run the PICK_ONE paging loop, and return the
// selection.  Returns { newlev, dnum, dlevel } on a pick (newlev = depth), or
// null on ESC / no selection.  Consumes NO RNG (pure menu).
async function print_dungeon_menu() {
    const g = game;
    /* C ref: wintty.c tty_display_nhwindow(NHW_MENU) — a pending topline
     * message is paged with --More-- before the menu overlays it
     * (level_tele_trap's "You step onto a level teleport trap!" then the
     * levTport_menu, dungeon.c:2369-2370). */
    if (g._pending_message) {
        await flush_screen(1);
        if (g._pending_message) await force_more(g._pending_message);
    }
    const dungeonsFull = g._dungeons_full || [];
    const n_dgns = g._n_dgns | 0;
    // C ref: fixup_level_locations() (dungeon.c:1142-1156) floats the knox branch
    // entrance (end1.dnum := n_dgns).  We apply this on a LOCAL copy so the shared
    // game._dungeon_branches (used by mklev) is untouched; print_branch then skips
    // the knox branch in its parent dungeon and unplaced_floater() recognizes it.
    const branches = (g._dungeon_branches || []).map(br => ({ ...br,
        end1: { ...br.end1 }, end2: { ...br.end2 } }));
    // ...but ONLY while it is still floating.  fixup_level_locations floats the
    // knox entrance at level-generation time and mk_knox_portal() rebinds it to a
    // real level as soon as the portal is placed (js/mklev.js:10616 clears the
    // flag), after which C's print_branch prints it in its parent dungeon like
    // any other branch.  Forcing the float unconditionally moved that line into
    // "Floating branches" -- the same defect print_dungeon_text()'s end1_dnum()
    // below already documents, in reverse.
    // reads "h -   Portal to Fort Ludios: 20" between "rogue: 16" and
    // "medusa: 24", and this port omitted the row -- which re-lettered every
    for (const br of branches)
        if (br.end1_floating)
            br.end1.dnum = n_dgns;
    // sp_levchn sorted by dnum then ascending dlevel (C add_level keeps the chain
    // ordered; print_dungeon filters per-dnum and relies on ascending dlevel).
    const spLevchn = (g._sp_levchn || []).slice().sort((a, b) =>
        (a.dlevel.dnum - b.dlevel.dnum) || (a.dlevel.dlevel - b.dlevel.dlevel));

    // lchoices bookkeeping (dungeon.c struct lchoice): per selectable/skipped
    // entry, the destination (dlevel,dnum,playerlev) and the assigned menuletter.
    const lchoices = { lev: [], dgn: [], playerlev: [], idx: 0, menuletter: 'a' };
    const lines = [];          // rendered menu line strings (each w/ left margin)
    const accel = new Map();   // menuletter char → lchoices index (selectable only)
    /* C ref: wintty.c:1416-1425 — `rp = resp` is RESET on every page display and
     * the selector scan only walks page_start..page_end, so a menu's accept set
     * is PER PAGE.  Keep line-index → selector so the key loop can rebuild it. */
    const lineAccel = [];      // lines[] index → menuletter char (selectable only)
    const deadAccel = [];      // same, for cannotreach rows (letter consumed, no identifier)
    /* C ref: wintty.c:2591-2605 tty_add_menu — a selectable entry's STORED str,
     * which is what MENU_SEARCH's pmatchi() matches (wintty.c:1714), is
     * "%c - %s" built from the ch tport_menu passes (dungeon.c:2226, the
     * lchoices menuletter) and the entry text.  The window's own one-column
     * left margin is a rendering detail and is NOT part of it. */
    const mlist = [];          // { str, idx } in add_menu call order

    const nextLetter = () => {
        const cur = lchoices.menuletter;
        lchoices.menuletter = (cur === 'z') ? 'A' : String.fromCharCode(cur.charCodeAt(0) + 1);
        return cur;
    };
    // C ref: tport_menu (dungeon.c:2198) — append a level entry to the menu.
    const tport_menu = (entry, lvl_p, cannotreach) => {
        lchoices.lev[lchoices.idx] = lvl_p.dlevel;
        lchoices.dgn[lchoices.idx] = lvl_p.dnum;
        lchoices.playerlev[lchoices.idx] = _pd_depth(lvl_p, dungeonsFull);
        const letter = nextLetter();
        if (cannotreach) {
            // not selectable but still consumes a menuletter; the tty renders a
            // non-accelerator line by positioning the cursor past the leading
            // blanks (margin + 4-space pad + entry's own leading blanks) with a
            // CSI cursor-forward, then the visible text — matching the recorded
            // "\x1b[NCknox: 18" form (a literal-space line would mismatch byte-
            /* C wintty.c:2614 tty_add_menu stores item->selector = ch even for
             * this identifier-less row, so its letter is in resp. */
            deadAccel[lines.length] = letter;
            const full = ' ' + '    ' + entry;
            const lead = full.length - full.replace(/^ +/, '').length;
            const text = menucolor_text(full.slice(lead), full); /* windows.c:1803 add_menu */
            lines.push(lead > 0 ? `\x1b[${lead}C${text}` : text);
        } else {
            accel.set(letter, lchoices.idx);
            lineAccel[lines.length] = letter;
            lines.push(` ${letter} - ${menucolor_text(entry)}`); /* windows.c:1803 add_menu */
            mlist.push({ str: `${letter} - ${entry}`, idx: lchoices.idx });
        }
        lchoices.idx++;
    };
    // Title line (start_menu).
    lines.push(` ${menu_heading_text('Level teleport to where:')}`);
    lines.push('');

    for (let i = 0; i < n_dgns; i++) {
        const dptr = dungeonsFull[i];
        if (!dptr) continue;
        // C dungeon.c:2309 — `if (bymenu && In_endgame(&u.uz) && i != astral_level.dnum)
        // continue;`: from an elemental plane the menu lists ONLY the Planes.
        if (In_endgame(g.u?.uz) && i !== g.astral_level?.dnum) continue;
        const unplaced = _pd_unplaced_floater(i, branches);
        const descr = unplaced ? 'depth' : 'level';
        const nlev = dptr.num_dunlevs | 0;
        let buf;
        if (nlev > 1)
            buf = `${dptr.dname}: ${descr}s ${dptr.depth_start} to ${dptr.depth_start + nlev - 1}`;
        else
            buf = `${dptr.dname}: ${descr} ${dptr.depth_start}`;
        // Most entrances are uninteresting (entry_lev == 1).
        if (dptr.entry_lev !== 1) {
            if (dptr.entry_lev === nlev)
                buf += ', entrance from below';
            else
                buf += `, entrance on ${dptr.depth_start + dptr.entry_lev - 1}`;
        }
        // add_menu_heading — left margin + reverse video.
        lines.push(` ${menu_heading_text(buf)}` /* wintty.c:2688 */);

        let last_level = 0;
        for (const slev of spLevchn) {
            if (slev.dlevel.dnum !== i) continue;
            print_branch(0, i, last_level, slev.dlevel.dlevel, true, tport_menu, branches, dungeonsFull, null);
            let lbuf = `${_pd_chr_u_on_lvl(slev.dlevel)} ${slev.proto}: ${_pd_depth(slev.dlevel, dungeonsFull)}`;
            if (Is_stronghold(slev.dlevel))
                lbuf += ` (tune ${g._tune || ''})`;
            tport_menu(lbuf, slev.dlevel, _pd_unreachable_level(slev.dlevel, unplaced));
            last_level = slev.dlevel.dlevel;
        }
        // branches after the last special level (MAXLEVEL upper bound).
        print_branch(0, i, last_level, 127 /* MAXLEVEL */, true, tport_menu, branches, dungeonsFull, null);
    }

    // ── tty PICK_ONE paging loop (end_menu/select_menu) ──
    // Footer " (P of N)" on screen row 23; pages hold up to 23 content rows.
    const SCREEN_ROWS = 24;
    const PER_PAGE = SCREEN_ROWS - 1; /* 23 content rows; indicator on row 23 */
    const pages = [];
    for (let i = 0; i < lines.length; i += PER_PAGE)
        pages.push(lines.slice(i, i + PER_PAGE));
    const npages = pages.length;
    const pageHasLetter = (pageIdx, ch) => {
        const start = pageIdx * PER_PAGE;
        const end = Math.min(start + PER_PAGE, lines.length);
        for (let i = start; i < end; i++)
            if (lineAccel[i] === ch) return true;
        return false;
    };

    const _dismissMenu = async () => {
        /* tty_destroy_nhwindow() clears WIN_MESSAGE before the dungeon is
         * redrawn; that also makes gp.prevmsg no longer the prior wait line,
         * so the next Norep() may print it again. */
        game._prevmsg = null;
        /* wintty.c:981-982 erase_menu_or_text(): an overlay window (offx > 0)
         * is erased by docorner(), which neither docrt()s nor sets botlx, so
         * the status line keeps whatever it last painted (a travel's frozen
         * T:) until the next real bot(). */
        if (overlayLines) return;
        /* windows.c:1856-1864: select_menu() holds gb.bot_disabled across the
         * dismissing docrt() too, so a pline raised inside it (see_monsters ->
         * newsym impossible) flushes with bot() declining. */
        const _docrtBotDisabled = g._bot_disabled;
        g._bot_disabled = true;
        try { await docrt(); } finally { g._bot_disabled = _docrtBotDisabled; }
        status_r1_menu_docrt();
        /* docrt_flags cls() sets botlx, so the first bot() rewrites every status
         * field AFTER the map's seen-stone row-20 blanks were printed. */
        game._r1botAfterMap = game.level;
        game._r1textOver = game.level;
        /* C windows.c:1856-1864 select_menu() runs the window port with
         * gb.bot_disabled set, and tty_select_menu dismisses the window itself
         * (wintty.c tty_select_menu -> tty_dismiss_nhwindow ->
         * erase_menu_or_text: docrt(); flush_screen(1)).  That flush prints the
         * map, map row 20 included, while bot() returns early (botl.c:255)
         * leaving botlx set; the next bot() then rewrites status row 1 in full
         * over map row 20 (display.js _status_row1_map_overlay).  A level
         * change in between repaints via goto_level's docrt, which clears it. */
        game._r1textOver = true;
        /* C wintty.c:978-979: publish the redrawn map before returning
         * from menu dismissal. windows.c:1859-1863 still disables bot(). */
        const savedBotDisabled = g._bot_disabled;
        g._bot_disabled = true;
        try {
            await flush_screen(1);
        } finally {
            g._bot_disabled = savedBotDisabled;
        }
    };

    let pageIdx = 0;
    let row0Erased = false;
    /* C ref: wintty.c:1908-1927 tty_display_nhwindow + tty_end_menu — a menu
     * whose longest line is narrow is NOT full-width: the window is placed at
     * offx = cols - maxcol - 1 (maxcol = longest str + 2) as an overlay, every
     * row painted from offx+1, and a single page ends with "(end) " (wintty.c:
     * 2749), never "(N of M)".  Only the one-page case is modelled here (the
     * multi-page full-width frames below are verified against recordings).
     * Non-selectable rows are stored here as ESC[nC + text; the overlay
     * compositor wants those leading blanks as spaces, and the one-space left
     * margin every row carries is the column offx itself. */
    let overlayLines = null, overlayCol = 0;
    if (npages === 1) {
        const stripped = lines.map((ln) => {
            const m = /^\x1b\[(\d+)C/.exec(ln);
            const t = m ? ' '.repeat(Math.max(0, +m[1])) + ln.slice(m[0].length) : ln;
            return t.replace(/^ /, '');
        });
        const wl = [...stripped, '(end)'];
        const col = tty_window_offx(wl, 'end');
        if (col > 1) { overlayLines = wl; overlayCol = col; }
    }
    const overlayRows = () => {
        const rows = build_window_screen(
            row0Erased ? ['', ...overlayLines.slice(1)] : overlayLines,
            overlayCol, g.u?.uac ?? 0).split('\n');
        return row0Erased ? menu_search_docorner(rows) : rows;
    };
    const pageRows = () => {
        if (overlayLines) {
            const rows = overlayRows();
            return { rows, indicator: '(end)', indicatorRow: overlayLines.length - 1 };
        }
        const pageLines = pages[pageIdx] || [''];
        const indicator = ` (${pageIdx + 1} of ${npages})`;
        const rows = [];
        for (let r = 0; r < pageLines.length; r++) rows.push(pageLines[r]);
        const indicatorRow = (pageIdx === npages - 1) ? pageLines.length : (SCREEN_ROWS - 1);
        while (rows.length < indicatorRow) rows.push('');
        rows.push(indicator);
        if (row0Erased && rows.length) { rows[0] = ''; menu_search_docorner(rows); }
        return { rows, indicator, indicatorRow };
    };
    const _pick = async (idx) => {
        await _dismissMenu();
        return {
            newlev: lchoices.playerlev[idx],
            dnum: lchoices.dgn[idx],
            dlevel: lchoices.lev[idx],
            overlay: !!overlayLines,
        };
    };
    // C wintty.c:1395-1399,1570-1613: ESC cancels an active count first.
    let count = 0n, counting = false, resetCount = true;
    while (true) {
        if (resetCount) { count = 0n; counting = false; }
        else resetCount = true;
        const { rows, indicator, indicatorRow } = pageRows();
        g._screen_output = rows.join('\n');
        if (overlayLines) set_cursor(overlayCol + '(end)'.length + 1, indicatorRow);
        else set_cursor(indicator.length, indicatorRow);
        g._pending_message = '';

        const key = await nhgetch();
        const ch = (key >= 32 && key < 127) ? String.fromCharCode(key) : '';
        if (key >= 48 && key <= 57) {
            count = count * 10n + BigInt(key - 48);
            if (count > 9223372036854775807n) continue; // AppendLongDigit overflow
            if (count !== 0n) { counting = true; resetCount = false; }
            continue;
        }
        if (key === 27 && counting) continue;
        if (key === 27 /* ESC */) { await _dismissMenu(); return null; } // MENU_CANCEL
        /* C ref: wintty.c:1616-1620 —
         *     case '\0': case '\n': case '\r': finished = TRUE; break;
         * CR/LF COMMIT the menu wherever it is; they are not page keys.  With
         * nothing selected in a PICK_ONE menu that is select_menu returning 0,
         * i.e. no pick.  This site folded them in with space, so an Enter on a
         * non-final page turned the page instead of ending the menu. */
        if (key === 10 || key === 13) {
            await _dismissMenu();
            return null;
        }
        if (key === 32 /* ' ' */ || ch === '>') {
            if (npages > 0 && pageIdx !== npages - 1) { pageIdx++; row0Erased = false; continue; }
            if (key === 32) { await _dismissMenu(); return null; }
            continue;   /* '>' on the last page: consumed, page unchanged */
        }
        if (ch === '<') {   /* MENU_PREVIOUS_PAGE */
            if (npages > 0 && pageIdx !== 0) { pageIdx--; row0Erased = false; }
            continue;
        }
        if (ch === '^') {   /* MENU_FIRST_PAGE */
            if (npages > 0 && pageIdx !== 0) { pageIdx = 0; row0Erased = false; }
            continue;
        }
        if (ch === '|') {   /* MENU_LAST_PAGE */
            if (npages > 0 && pageIdx !== npages - 1) { pageIdx = npages - 1; row0Erased = false; }
            continue;
        }
        /* C wintty.c:1424,1755 + dungeon.c:2372-2374: a cannotreach row's letter is
         * still in resp; PICK_ONE finishes with an a_int == 0 item, so
         * idx = -1 and lchoices.playerlev[-1] (the stack byte before the array)
         * is read; the recording shows it as 0, i.e. no teleport. */
        if (ch && !pageHasLetter(pageIdx, ch)) {
            const s0 = pageIdx * PER_PAGE, e0 = Math.min(s0 + PER_PAGE, lines.length);
            for (let i = s0; i < e0; i++)
                if (deadAccel[i] === ch) { await _dismissMenu(); return null; }
        }
        if (ch && pageHasLetter(pageIdx, ch)) {
            const idx = accel.get(ch);
            return await _pick(idx);
        }
        if (key === 0x3a /* ':' MENU_SEARCH */) {
            let picked = -1;
            const finished = await menu_search_case(
                'ONE', mlist,
                () => pageRows().rows,
                (curr) => { picked = curr.idx; });
            row0Erased = true;
            if (finished && picked >= 0) return await _pick(picked);
            continue;
        }
        // C getline.c:250-254: rejected keys stay inside xwaitforspace(),
        // preserving the count until a key in resp reaches the menu switch.
        if (!(DEFAULT_MENU_CMDS + ' 0123456789\x1b\n\r').includes(String.fromCharCode(key)))
            resetCount = false;
        // any other key: re-render the same page (tty rings the bell).
    }
}

export function random_teleport_level() {
    const g = game;
    const u = g.u || {};
    const _dgn = (g.dungeons || [])[u.uz?.dnum ?? 0] || { depth_start: 1, num_dunlevs: 30 };
    const dunlevs_in_dungeon = (_dgn.num_dunlevs | 0);
    const depth_start = _dgn.depth_start;
    const cur_depth = depth(u.uz) | 0;

    /* C teleport.c:2196 — [the endgame case can only occur in wizard mode].
     * single_level_branch(lev) is Is_knox(lev) (dungeon.c). */
    if (!rn2(5) || Is_knox_level(u.uz) || In_endgame(u.uz))
        return cur_depth;

    let min_depth, max_depth;
    if (In_quest(u.uz)) {
        /* C teleport.c:2223-2231 */
        let bottom = dunlevs_in_dungeon;
        const qlocate_depth = g.qlocate_level.dlevel;
        if (_dgn.dunlev_ureached < qlocate_depth)
            bottom = qlocate_depth;
        min_depth = depth_start;
        max_depth = bottom + (depth_start - 1);
    } else {
        /* C teleport.c:2233-2237 */
        min_depth = 1;
        max_depth = dunlevs_in_dungeon + (depth_start - 1);
        /* can't reach Sanctum if the invocation hasn't been performed */
        if (Inhell() && !(g.u?.uevent?.invoked))
            max_depth -= 1;
    }

    /* C teleport.c:2239-2241 — range is 1 to current+3, current not counting. */
    let nlev = rn2(cur_depth + 3 - min_depth) + min_depth;
    if (nlev >= cur_depth)
        nlev++;

    if (nlev > max_depth) {
        nlev = max_depth;
        /* C teleport.c:2245 — teleport up if already on bottom. */
        if (Is_botlevel(u.uz))
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

// C ref: teleport.c:1165 level_tele() — the level-teleport body.
// Ported scope: wizard-mode path (wizard=TRUE → Teleport_control||wizard branch)
// with a number, a special-level name, or the '?' menu (print_dungeon).
// The non-wizard involuntary path, confusion, and "*" random paths are stubbed
// The wizard branch is: getlin prompt → parse → get_level → schedule_goto, or
// for "?": print_dungeon → schedule_goto(newlevel) with force_dest.
// Returns ECMD_OK (no turn consumed by the command itself; turn is consumed by
// the level transition happening via deferred_goto after rhack returns).
export async function level_tele() {
    const g = game;
    const u = g.u || (g.u = {});
    // The overview-menu flag is per levelport: a stale one from an earlier '?'
    // levelport whose monster-teleport prompt never ran blanked the status rows
    // under a later typed-name levelport.
    g._levtele_menu = false;
    // C teleport.c:1176-1186 — the debug fuzzer picks a random connected
    // dungeon/level and schedules the goto without prompting.
    if (g.iflags?.debug_fuzzer) {
        const newlevel = { dnum: 0, dlevel: 0 };
        do {
            newlevel.dnum = rn2(g._n_dgns);
        } while (newlevel.dnum === g.astral_level.dnum
                 || g.dungeons[newlevel.dnum].flags?.unconnected
                 || !g.dungeons[newlevel.dnum].num_dunlevs);
        newlevel.dlevel = 1 + rn2(dunlevs_in_dungeon(newlevel));
        u.ucamefrom = { dnum: u.uz.dnum, dlevel: u.uz.dlevel };
        schedule_goto(newlevel, 0 /* UTOTYPE_NONE */, null, null);
        return;
    }
    // C teleport.c:1185-1189 — carrying the Amulet, in the endgame or in
    // Sokoban, a non-wizard hero cannot levelport at all.
    if ((u.uhave?.amulet || In_endgame(u.uz) || In_sokoban(u.uz)) && !wizard()) {
        await _You_feel('very disoriented for a moment.');
        return;
    }
    // C teleport.c:1190 — if (Teleport_control && !Stunned) || wizard)
    // In wizard mode we always take this branch; skip the else/random path.
    {
        // C teleport.c:1194 — Strcpy(qbuf, "To what level do you want to teleport?")
        const qbuf = 'To what level do you want to teleport?';
        let trycnt = 0;
        let newlev = 0;
        let buf = '';
        // C teleport.c:1172 — boolean force_dest = FALSE; set TRUE on the '?' menu
        // path so post-loop validation is skipped and the menu's (dnum,dlevel) is
        // used directly (no get_level relativization).
        let force_dest = false;
        let menuNewlevel = null;
        // C's `goto random_levtport` (teleport.c:1214/1217/1256/1324) jumps out of
        // the controlled-teleport branch into the involuntary one at :1293.  A
        // goto out of a loop has no JS spelling, so it is a flag read after the
        // do/while and again at the newlev==0 arm.
        let goto_random = false;
        // C teleport.c:1190 — the prompt branch needs (Teleport_control &&
        // !Stunned) || wizard; #exploremode clears wizard, so such a hero
        // falls through to the involuntary random_levtport arm.
        {
            const upr = u.uprops || [];
            const tc = upr[TELEPORT_CONTROL];
            const hasTc = !!(tc && ((tc.intrinsic | 0) || (tc.extrinsic | 0)));
            const stun = (upr[STUNNED]?.intrinsic | 0) !== 0;
            if (!((hasTc && !stun) || wizard()))
                goto_random = true;
        }
        if (!goto_random) do {
            // C teleport.c:1203 — if (++trycnt == 2) Strcat(qbuf, " [type a number, name, or ? for a menu]")
            // C teleport.c:1195-1201 — wizard mode 'm ^V' skips the getlin on the
            // first pass and goes straight to levTport_menu.
            let viaMenu = false;
            if (g.iflags.menu_requested) {
                g.iflags.menu_requested = false;
                viaMenu = wizard();
            }
            trycnt++;
            // C teleport.c:1212 — getlin(qbuf, buf)
            const prompt = (trycnt >= 2)
                ? (qbuf + (wizard() ? ' [type a number, name, or ? for a menu]' : ' [type a number or name]'))
                : qbuf;
            if (viaMenu) buf = '?';
            else buf = await getlin(prompt);
            // C teleport.c:1213 — if (!strcmp(buf, "*")) goto random_levtport
            if (buf === '*') { goto_random = true; break; }
            // C teleport.c:1215-1217:
            //     } else if (Confusion && rnl(5)) {
            //         pline("Oops...");
            //         goto random_levtport;
            //     }
            // This arm used to be skipped outright under the comment "wizard
            // counterexample: the Tourist quaffs a cursed potion of confusion at
            // step 157 and level-teleports at step 164, so C draws rnl(5)=3 here
            // (the segment's first RNG divergence once the regen fix landed) and
            // — the roll being non-zero — throws the requested "2" away and takes
            // the RANDOM destination, landing on Dlvl 3.  This port typed "2",
            // got Dlvl 2, and so never generated the level the rest of the
            // rnl() is luck-adjusted; Luck is 0 here so it consumes one leaf.
            if (!viaMenu && Confusion_hero() && rnl(5)) {
                await pline('Oops...');
                goto_random = true;
                break;
            }
            // C teleport.c:1218 — else if (!strcmp(buf, "\033")) return  (ESC cancel)
            /* An empty Return is an invalid destination and loops back to the
             * getlin prompt in C; only ESC cancels level teleport. */
            if (buf === '\x1b') {
                /* C level_tele() is void; the ^V handler's ECMD_OK maps to move=0 in rhack */
                return;
            }
            // C teleport.c:1221 — if (wizard && !strcmp(buf, "?")) → levTport_menu.
            // print_dungeon(TRUE, &destlev, &destdnum); if !newlev return.
            // Else newlevel = {destdnum, destlev}; force_dest = TRUE; fall through.
            if (wizard() && buf === '?') {
                const sel = await print_dungeon_menu();
                /* the full-screen overview menu left rows 22-23 blank (tty menu
                 * overdraw); a typed number leaves the status painted */
                /* wintty.c:981-982: an overlay menu (offx > 0) is erased by
                 * docorner(), which leaves the status rows painted. */
                g._levtele_menu = !sel?.overlay;
                if (!sel || !sel.newlev) {
                    // C: if (!newlev) return;  (ESC / no selection cancels)
                    return;
                }
                menuNewlevel = { dnum: sel.dnum, dlevel: sel.dlevel };
                newlev = sel.newlev;
                // C teleport.c:1234-1246 — the ENDGAME PREREQUISITE.  A wizard
                // who picks an Elemental Plane off this menu without already
                // holding the Amulet is handed one, because the endgame arrival
                // code assumes it.  C's own comment: "ordinarily we'd use
                // hold_another_object() for something like this, but we don't
                // want fumbling or already full pack to interfere".
                //     if (In_endgame(&newlevel) && !In_endgame(&u.uz)) {
                //         if (!u.uhave.amulet
                //             && (amu = mksobj(AMULET_OF_YENDOR, TRUE, FALSE)) != 0) {
                //             amu = addinv(amu);
                //             prinv("Endgame prerequisite:", amu, 0L);
                //         }
                //     }
                // This block was absent, and it is NOT display-only: mksobj()
                // draws three leaves (next_ident rnd(2), mksobj_init rn2(10),
                // 30061..30063, at its step 99 'L' pick of `fire: -3`.
                if (In_endgame(menuNewlevel) && !In_endgame(g.u?.uz)) {
                    const uh = (g.u.uhave || (g.u.uhave = {}));
                    if (!uh.amulet) {
                        const amu = await mksobj(_ADDINV_AMULET_OF_YENDOR, true, false);
                        if (amu) {
                            _levtele_addinv(amu);
                            await prinv('Endgame prerequisite:', amu, 0);
                            /* pline.c: prinv's pline runs flush_screen(1) -> bot(),
                             * repainting the status rows the menu dismissal blanked */
                            g._levtele_menu = false;
                        }
                    }
                }
                force_dest = true;
                break;
            }
            // C teleport.c:1248 — (newlev = lev_by_name(buf)) == 0 → newlev = atoi(buf)
            // lev_by_name returns 0 for a numeric string.
            // atoi() is (int)strtol(): strtol saturates at LONG_MAX/LONG_MIN
            // (64-bit), then the int cast keeps the low 32 bits (so an
            // over-long digit string becomes -1 and falls into the
            // "high above the clouds" arm).
            const _atoi = (str) => {
                const m = /^\s*([+-]?\d+)/.exec(str);
                if (!m) return 0;
                let v = BigInt(m[1]);
                const lmax = (1n << 63n) - 1n, lmin = -(1n << 63n);
                if (v > lmax) v = lmax; else if (v < lmin) v = lmin;
                return Number(BigInt.asIntN(32, v));
            };
            newlev = lev_by_name(buf) || _atoi(buf);
        } while (!newlev && !(buf.length > 0 && (buf[0] === '-' ? (buf.length > 1 && buf[1] >= '0' && buf[1] <= '9') : (buf[0] >= '0' && buf[0] <= '9'))) && trycnt < 10);
        // C teleport.c:1254 — if (newlev == 0) { if trycnt>=10 goto random; ynq "Go to Nowhere" ... }
        if (newlev === 0 && trycnt >= 10)
            goto_random = true;
        /* C teleport.c:1258-1281 — "no dungeon escape via this route" */
        if (newlev === 0 && !goto_random) {
            if ((await yn_function('Go to Nowhere.  Are you sure?', 'ynq', 'q', true)) !== 'y') {
                /* tty_yn_function leaves the prompt painted (TOPLINE_NON_EMPTY) */
                g._topl_sticky = 'Go to Nowhere.  Are you sure? [ynq] (q)';
                return;
            }
            await You(`${((g.youmonst?.data?.msound | 0) === 0 && !!g.youmonst?.data) ? 'writhe' : 'scream'} in agony as your body begins to warp...`);
            if (g._pending_message)
                await force_more(g._pending_message);
            await You('cease to exist.');
            if (g.invent)
                await Your(`possessions land on the ${surface(u.ux, u.uy)} with a thud.`);
            const gk = g.svk || (g.svk = {});
            gk.killer = gk.killer || {};
            gk.killer.format = NO_KILLER_PREFIX;
            gk.killer.name = 'committed suicide';
            await done(DIED);
            await pline('An energized cloud of dust begins to coalesce.');
            await Your(`body rematerializes${g.invent ? ', and you gather up all your possessions' : ''}.`);
            return;
        }
        // C teleport.c:1277-1281 — if in Knox and the requested level > 0, stay put.
        if (single_level_branch(g.u.uz) && newlev > 0 && !force_dest) {
            await You('shudder for a moment.');
            return;
        }
        // C teleport.c:1380 — else if (force_dest) { /* wizard mode menu; no
        // further validation needed */ ; }  The menu already produced a concrete
        // (dnum,dlevel); use it directly and skip get_level relativization.
        // C teleport.c:1379-1423 — the destination cascade.  This used to be
        // `newlevel = get_level(newlev)` with only the force_dest arm in front
        // of it, which silently dropped C's find_hell() arm: a wizard-mode
        // request for a depth at or past the bottom of the Dungeons of Doom
        // teleports to the VALLEY OF THE DEAD, not to the deepest Dungeons of
        // with num_dunlevs 26: C goes 1 + 26 <= 30 → find_hell → Gehennom
        // dlevel 1 (Dlvl 27, "You arrive at the Valley of the Dead..."), while
        // get_level's own beyond-the-end clamp (dungeon.c:1810-1813) returned
        // dlevel = num_dunlevs = 26.
        const _dgn_of = (uz) => (g.dungeons || [])[uz?.dnum ?? 0]
                                || { depth_start: 1, num_dunlevs: 30 };
        // C dungeon.h:143 — dunlevs_in_dungeon(lev) is dungeons[dnum].num_dunlevs.
        const dunlevs_in_dungeon = (uz) => (_dgn_of(uz).num_dunlevs | 0);
        if (!goto_random && In_quest(u.uz) && newlev > 0)
            newlev = newlev + (_dgn_of(u.uz).depth_start | 0) - 1;
        // C teleport.c:1293-1298, the involuntary branch / `random_levtport:`
        // label.  Reached here only via one of C's gotos out of the controlled
        // branch above (Confusion, "*", or ten failed prompts); the whole
        // controlled-only block C skips over — the newlev==0 "Go to Nowhere"
        // arm, single_level_branch, and the In_quest relativization — is
        // correctly not run for it.
        if (goto_random) {
            newlev = random_teleport_level();
            if (newlev === depth(u.uz)) {
                // C teleport.c:1296 You1(shudder_for_moment).
                await You('shudder for a moment.');
                return;
            }
        }
        /* C teleport.c:1300-1306 — buried ball, then a leashed pet that
         * cannot be pulled adjacent holds the hero back (unless force_dest);
         * next_to_u() itself prints "You feel the leash go slack." */
        if (u.utrap && (u.utraptype | 0) === TT_BURIEDBALL)
            await buried_ball_to_punishment();
        if (!(await next_to_u_real()) && !force_dest) {
            await You('shudder for a moment.');
            return;
        }
        if (In_endgame(u.uz)) {
            const llimit = dunlevs_in_dungeon(u.uz);
            if (newlev >= 0 || newlev <= -llimit) {
                await You_cant('get there from here.');
                return;
            }
            schedule_goto({ dnum: (u.uz?.dnum ?? 0), dlevel: llimit + newlev },
                          UTOTYPE_NONE, null, null);
            return;
        }
        /* C teleport.c:1293-1377 — a negative controlled destination from
         * an ordinary dungeon means escape above the clouds, rather than a
         * same-level get_level() refusal.  In wizard/debug mode the
         * non-flying arm still asks the normal death question; declining it
         * returns the hero to the surface and schedules dlevel 0. */
        let newlevel;
        let escape_by_flying = null;
        let death_survived = false;
        const gk = g.svk || (g.svk = {});
        const killer = gk.killer || (gk.killer = {});
        killer.name = ''; // C teleport.c:1320: still alive, so far.
        if (newlev < 0 && !force_dest) {
            // C teleport.c:1326-1332: settle shop bills before leaving.
            if (u.ushops0) {
                g.in_mklev = true;
                await u_left_shop(u.ushops0, true);
                u.ushops0 = u.ushops = '';
                g.in_mklev = false;
            }
            if (newlev <= -10) {
                await You('arrive in heaven.');
                SetVoice(null, 0, 80, 0 /* voice_deity */);
                await verbalize("Thou art early, but we'll admit thee.");
                killer.format = NO_KILLER_PREFIX;
                killer.name = 'went to heaven prematurely';
            } else if (newlev === -9) {
                await _You_feel('deliriously happy.');
                await pline('(In fact, you\'re on Cloud 9!)');
            } else {
                await You('are now high above the clouds...');
            }
            if (killer.name) {
                // C teleport.c:1350: arrival in heaven is pending.
            } else if (_Levitation())
                escape_by_flying = 'float gently down to earth';
            else if (_Flying())
                escape_by_flying = 'fly down to the ground';
            else {
                /* C's death path acknowledges the preceding topline before
                 * adding the fall warning, leaving the cloud message on its
                 * own --More-- frame. */
                if (g._pending_message)
                    await force_more(g._pending_message);
                await pline("Unfortunately, you don't know how to fly.");
                if (g._pending_message)
                    await force_more(g._pending_message);
                await You('plummet a few thousand feet to your death.');
                killer.name = `teleported out of the dungeon and fell to ${g.flags.female ? 'her' : 'his'} death`;
                killer.format = NO_KILLER_PREFIX;
            }
            if (killer.name) {
                /* C teleport.c:1370-1374 sets the death location to heaven
                 * or the surface before done(DIED), then restores u.uz. */
                const saved_uz = { dnum: u.uz?.dnum | 0, dlevel: u.uz?.dlevel | 0 };
                u.uz = { dnum: 0, dlevel: newlev <= -10 ? -10 : 0 };
                await done(DIED);
                u.uz = saved_uz;
                death_survived = true;
                escape_by_flying = 'find yourself back on the surface';
            }
            if (escape_by_flying) {
                if (death_survived) {
                    /* done() stores its wizard-mode acknowledgement as a
                     * result line; C's single topline joins that line to the
                     * surface message before the next page. */
                    g._resultMessage = null;
                    g._pending_message = `OK, so you don't die.  You ${escape_by_flying}.`;
                    await force_more(g._pending_message);
                    g._pending_message = '';
                } else {
                    await You(`${escape_by_flying}.`);
                }
            }
            newlevel = { dnum: 0, dlevel: 0 };
        }
        let deepest = 0;
        if (newlevel) {
            /* escape path above already selected the surface destination */
        } else if (force_dest && menuNewlevel) {
            // C teleport.c:1385-1387 — wizard mode menu; no further validation.
            newlevel = menuNewlevel;
        } else if ((u.uz?.dnum ?? 0) === (g.medusa_level?.dnum ?? -1)
                   && newlev >= (_dgn_of(u.uz).depth_start | 0)
                                + dunlevs_in_dungeon(u.uz)) {
            // C teleport.c:1388-1390 — find_hell(&newlevel), dungeon.c:1949-1953:
            //   lev->dnum = valley_level.dnum; lev->dlevel = 1;
            newlevel = { dnum: g.valley_level?.dnum ?? (u.uz?.dnum ?? 0),
                         dlevel: 1 };
        } else {
            // C teleport.c:1392-1423.
            const qbranch = In_quest(u.uz) ? g.qstart_level
                          : In_mines(u.uz) ? g.mineend_level
                            : g.sanctum_level;
            deepest = qbranch
                ? ((_dgn_of(qbranch).depth_start | 0)
                   + dunlevs_in_dungeon(qbranch) - 1)
                : 0;
            if (!wizard() && Inhell() && !(u.uevent?.invoked)
                && newlev >= deepest) {
                newlev = deepest - 1;
                await pline('Sorry...');
            }
            // C teleport.c:1411-1412 — no teleporting out of the quest dungeon.
            if (In_quest(u.uz) && newlev < depth(g.qstart_level))
                newlev = depth(g.qstart_level);
            // C teleport.c:1417 — get_level(&newlevel, newlev)
            newlevel = get_level(newlev);
            // C teleport.c:1419-1423 — the request resolved to the level the
            // hero is already on, and it was not a request for that depth.
            // C dungeon.c on_level(a, b) — same dnum AND same dlevel; inlined
            // (this file carries no on_level import).
            if (newlevel.dnum === (u.uz?.dnum ?? 0)
                && newlevel.dlevel === (u.uz?.dlevel ?? 0)
                && newlev !== depth(u.uz)) {
                await You_cant(`get there from ${(newlev > deepest) ? 'anywhere' : 'here'}.`);
                return;
            }
        }
        // C teleport.c:1426-1428 — schedule_goto(newlevel, UTOTYPE_NONE, NULL, verbose ? msg : NULL)
        const post_msg = (g.flags?.verbose !== false && !death_survived)
            ? 'You materialize on a different level!' : null;
        schedule_goto(newlevel, UTOTYPE_NONE, null, post_msg);
    }
    // ECMD_OK — level_tele itself does NOT consume a game turn (schedule_goto defers it).
    // The turn is consumed by the level transition in deferred_goto (goto_level → mklev).
    // However, the C rhack context for wiz_level_tele is ECMD_OK (returns 0), so
    // context.move stays 0 here (the turn counter and movemon fire in goto_level's
    // level entry, not from this command's context.move).
}

function _gp_same_mon(a, b) {
    if (!a || !b) return false;
    if (a === b) return true;
    if (typeof a !== 'object' || typeof b !== 'object') return false;
    return a.m_id != null && b.m_id != null && (a.m_id | 0) === (b.m_id | 0);
}

/* C ref: hack.c:914-919 may_passwall(x,y). */
function _gp_may_passwall(x, y) {
    return may_passwall(x, y);
}

const _GP_S_EEL = 57; /* defsym.h:362 MONSYM(57, ';', EEL, S_EEL, ...) */

function _gp_is_swimmer(mdat) { return ((mdat?.mflags1 | 0) & _GP_M1_SWIM) !== 0; }

function _gp_amorphous(mdat) { return ((mdat?.mflags1 | 0) & _GP_M1_AMORPHOUS) !== 0; }

function _gp_throws_rocks(mdat) { return ((mdat?.mflags2 | 0) & _GP_M2_ROCKTHROW) !== 0; }

/* C ref: mondata.h likes_lava(ptr) — pointer identity against
 * mons[PM_FIRE_ELEMENTAL] / mons[PM_SALAMANDER], ported on the form index. */
function _gp_likes_lava(mdat) {
    const pm = mdat?.pmidx | 0;
    return pm === PM_FIRE_ELEMENTAL || pm === PM_SALAMANDER;
}

function _gp_goodpos_onscary(x, y, mptr) {
    return goodpos_onscary(x, y, mptr);
}

/* C ref: mkmaze.c:317-331 is_exclusion_zone(type, x, y), reached from goodpos()
 * under GP_AVOID_MONPOS with type == LR_MONGEN.  js/sp_lev.js's des.exclusion
 * pushes onto game.exclusion_zones; this is the same walk js/mklev.js
 * lregion_is_exclusion_zone() and js/sp_lev.js both carry, kept local for the
 * same reason they are (neither copy is exported). */
function _gp_is_exclusion_zone(type, x, y) {
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

/* ---------------------------------------------------------------------------
 * goodpos — is (x,y) a good position for mtmp?  (mtmp == NULL: for an object.)
 * C ref: nethack-c/src/teleport.c:85-185
 *   boolean goodpos(coordxy x, coordxy y, struct monst *mtmp, mmflags_nht gpflags)
 * RNG: one rn2(13), and only on the S_EEL branch.
 *
 * NOTE (duplication, flagged): js/teleport.js carries a second port of this
 * same C function as the module-private goodpos_full().  The three differences
 * once listed here are reconciled there: accessible_local() reads
 * SURFACE_AT (db_under_typ), is_pool_local() has is_moat()'s DRAWBRIDGE_UP/
 * DB_MOAT arm, and goodpos_onscary is the faithful teleport.c:52-76 port.
 * closed_door()/accessible() are spelled closed_door_mv/accessible_mv here.
 * ---------------------------------------------------------------------------
 */
export function goodpos(x, y, mtmp, gpflags) {
    let mdat = null;
    const ignorewater = ((gpflags & MM_IGNOREWATER) !== 0),
          ignorelava = ((gpflags & MM_IGNORELAVA) !== 0),
          checkscary = ((gpflags & GP_CHECKSCARY) !== 0),
          allow_u = ((gpflags & GP_ALLOW_U) !== 0),
          avoid_monpos = ((gpflags & GP_AVOID_MONPOS) !== 0);

    if (!isok(x, y))
        return false;

    /* in many cases, we're trying to create a new monster, which
     * can't go on top of the player or any existing monster. */
    if (!allow_u) {
        const u = game.u || {};
        if (u_at(x, y) && !_gp_is_youmonst(mtmp)
            && (!_gp_same_mon(mtmp, u.ustuck) || !u.uswallow)
            && (!u.usteed || !_gp_same_mon(mtmp, u.usteed)))
            return false;
    }

    if (_gp_m_at(x, y) && avoid_monpos)
        return false;

    if (mtmp) {
        const mtmp2 = _gp_m_at(x, y);

        /* Be careful with long worms: a worm can't be placed in its own
         * location, period (C overdoes the check a little bit). */
        if (mtmp2 && (!_gp_same_mon(mtmp2, mtmp) || mtmp.wormno))
            return false;

        mdat = mtmp.data;
        if (_gp_is_pool(x, y) && !ignorewater) {
            /* [what about Breathless?] */
            if (_gp_is_youmonst(mtmp))
                return !!(_gp_Swimming() || _gp_Amphibious()
                          || (!_gp_Is_waterlevel()
                              && !_gp_is_waterwall(x, y)
                              /* water on the Plane of Water has no surface
                                 so there's no way to be on or above that */
                              && (_gp_Levitation() || _gp_Flying()
                                  || _gp_Wwalking())));
            else
                return !!(_gp_is_swimmer(mdat)
                          || (!_gp_Is_waterlevel()
                              && !_gp_is_waterwall(x, y)
                              && _gp_m_in_air(mtmp)));
        } else if ((mdat?.mlet | 0) === _GP_S_EEL && rn2(13) && !ignorewater) {
            return false;
        } else if (is_lava(x, y) && !ignorelava) {
            /* 3.6.3: floating eye can levitate over lava but it avoids
               that due the effect of the heat causing it to dry out */
            if ((mdat?.pmidx | 0) === PM_FLOATING_EYE)
                return false;
            else if (_gp_is_youmonst(mtmp)) {
                const uarmf = game.u?.uarmf;
                return !!(_gp_Levitation() || _gp_Flying()
                          || (_gp_Fire_resistance() && _gp_Wwalking()
                              && uarmf && uarmf.oerodeproof)
                          || (_gp_Upolyd() && _gp_likes_lava(game.youmonst?.data)));
            } else
                return !!(_gp_m_in_air(mtmp) || _gp_likes_lava(mdat));
        }
        if (_gp_passes_walls(mdat) && _gp_may_passwall(x, y))
            return true;
        if (_gp_amorphous(mdat) && closed_door_mv(x, y))
            return true;
        /* avoid onscary() if caller has specified that restriction */
        if (checkscary && (mtmp.m_id ? onscary(x, y, mtmp)
                                     : _gp_goodpos_onscary(x, y, mdat)))
            return false;
    }
    if (!accessible_mv(x, y)) {
        if (!(_gp_is_pool(x, y) && ignorewater)
            && !(is_lava(x, y) && ignorelava))
            return false;
    }
    /* skip boulder locations for most creatures */
    if (sobj_at(BOULDER, x, y) && (!mdat || !_gp_throws_rocks(mdat)))
        return false;
    /* pretend GP_AVOID_MONPOS == monster creation */
    if (avoid_monpos && _gp_is_exclusion_zone(LR_MONGEN, x, y))
        return false;

    return true;
}

function _gp_Wwalking() {
    return _gp_uprop_he(WWALKING) && !_gp_Is_waterlevel();
}

function _gp_Swimming() {
    const usteed = game.u?.usteed;
    return !!(_gp_uprop_he(SWIMMING)
              || (usteed && _gp_is_swimmer(usteed.data || {})));
}

function _gp_Amphibious() {
    if (_gp_uprop_he(MAGICAL_BREATHING)) return true;
    const pm = game.youmonst?.data;
    return !!pm && ((pm.mflags1 | 0) & _GP_M1_AMPHIBIOUS) !== 0;
}
