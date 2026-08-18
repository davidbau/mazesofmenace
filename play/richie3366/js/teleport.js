// teleport.js — Placement helpers for makemon/makedog.
// C ref: teleport.c — collect_coords, enexto_core (NEW_ENEXTO), goodpos (partial).

import { game } from './gstate.js';
import { rn2, rn1, rnd, rnl } from './rng.js';
import {
    COLNO, ROWNO,
    CC_NO_FLAGS, CC_INCL_CENTER, CC_UNSHUFFLED, CC_RING_PAIRS,
    CC_SKIP_MONS, CC_SKIP_INACCS,
    GP_CHECKSCARY, GP_ALLOW_U, GP_AVOID_MONPOS, GP_ALLOW_XY,
    LR_TELE, LR_UPTELE, LR_DOWNTELE, LR_MONGEN,
    MM_IGNOREWATER, MM_IGNORELAVA,
    ACCESSIBLE, IS_POOL, ZAP_POS, IS_DOOR, IS_WATERWALL, IS_STWALL,
    D_CLOSED, D_LOCKED, W_NONPASSWALL, IS_ALTAR, HEADSTONE,
    MIGR_RANDOM, MIGR_PORTAL, MON_MIGRATING, NO_TRAP,
    is_xport,
    ROOM, CORR, ICE, VAULT, SHOPBASE, ANY_SHOP, TEMPLE,
    A_NONE, A_LAWFUL, A_CHAOTIC, A_NEUTRAL, AM_SHRINE, Amask2align,
    ESHK, EPRI, EMIN, DISPLACED,
    LAVAPOOL, LAVAWALL, IS_FURNITURE, TELEDS_TELEPORT, TELEDS_ALLOW_DRAG,
    M_AP_NOTHING,
    UTOTYPE_NONE, UTOTYPE_ATSTAIRS, UTOTYPE_PORTAL, TIMEOUT,
    OBJ_FREE, SLT_ENCUMBER, TT_BURIEDBALL,
    is_hole, is_pit, Is_stronghold, Is_botlevel, Is_knox_level,
    In_endgame, In_sokoban, In_quest, Is_waterlevel,
    Is_airlevel, Is_firelevel, Is_earthlevel,
    HOLE, TRAPDOOR, TELEP_TRAP, LEVEL_TELEP,
    MAGIC_PORTAL, VIBRATING_SQUARE, RLOC_MSG, RLOC_NOMSG, RLOC_ERR, NO_TRAP_FLAGS,
    BOLT_LIM, STRAT_APPEARMSG, ARTICLE_A, engulfing_u,
    MON_FLOOR, Upolyd,
    FIRE_RES, ANTIMAGIC, LEVITATION, FLYING, WWALKING, SWIMMING,
    MAGICAL_BREATHING, I_SPECIAL,
} from './const.js';
import { objects_at, mksobj, obj_extract_self, place_object } from './mkobj.js';
import { objectNames, SPBOOK_CLASS } from './objects.js';
import {
    amorphous, throws_rocks, is_flyer, is_floater, is_swimmer, likes_lava,
    amphibious, monsterNames, passes_walls, is_dlord, is_dprince,
    is_rider, control_teleport, haseyes, G_UNIQ,
    is_minion, is_vampshifter,
} from './monsters.js';
import {
    newsym, pline, You_feel, see_monsters, canseemon, canspotmon, sensemon,
    shieldeff, docrt, impossible, flush_screen,
} from './display.js';
import { vision_recalc, couldsee } from './vision.js';
import {
    nomul, in_rooms, is_pool, is_lava, check_special_room, switch_terrain,
    invocation_message, notice_mon_off, notice_mon_on, notice_all_mons,
    set_msg_xy,
} from './hack.js';
import { remove_worm, place_worm_tail_randomly } from './worm.js';
import { makeknown, prinv, near_capacity, paint_corner_nhw_menu } from './invent.js';
import { nhgetch } from './input.js';
import { ATR_INVERSE } from './terminal.js';
import { more_experienced } from './exper.js';
import { getlin, yn_function } from './getline.js';
import { get_level, find_hell, In_W_tower, On_W_tower_level, In_tutorial } from './dungeon.js';
import { depth, distmin } from './hacklib.js';
import { addinv } from './u_init.js';
import { mon_nam, Monnam, x_monnam, noit_mon_nam } from './do_name.js';
import { placebc, unplacebc, drag_ball, move_bc } from './ball.js';
import { in_out_region, update_player_regions, update_monster_region } from './region.js';
const AMULET_OF_YENDOR = objectNames.indexOf('AMULET_OF_YENDOR');
const WAN_TELEPORTATION = objectNames.indexOf('WAN_TELEPORTATION');

/** C ref: do_name.c Amonnam — highc(a_monnam). */
function Amonnam(mtmp) {
    const s = x_monnam(mtmp, ARTICLE_A, null, 0, false);
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : 'A monster';
}

/** Squared distance from hero to (x,y). C ref: you.h distu. */
function distu_xy(x, y) {
    const u = game.u || {};
    const dx = (x | 0) - (u.ux | 0);
    const dy = (y | 0) - (u.uy | 0);
    return dx * dx + dy * dy;
}

// trap.h return codes — avoid importing trap.js (cycle with trapeffect_hole)
const Trap_Effect_Finished = 0;
const Trap_Moved_Mon = 4;

const BOULDER = objectNames.indexOf('BOULDER');
const SCR_SCARE_MONSTER = objectNames.indexOf('SCR_SCARE_MONSTER');
const PM_FLOATING_EYE = monsterNames.indexOf('PM_FLOATING_EYE');
const PM_MINOTAUR = monsterNames.indexOf('PM_MINOTAUR');
const PM_ANGEL = monsterNames.indexOf('PM_ANGEL');
const PM_AIR_ELEMENTAL = monsterNames.indexOf('PM_AIR_ELEMENTAL');
const PM_FIRE_ELEMENTAL = monsterNames.indexOf('PM_FIRE_ELEMENTAL');
const PM_EARTH_ELEMENTAL = monsterNames.indexOf('PM_EARTH_ELEMENTAL');
const PM_WATER_ELEMENTAL = monsterNames.indexOf('PM_WATER_ELEMENTAL');

function isok(x, y) {
    return x >= 1 && x < COLNO && y >= 0 && y < ROWNO;
}

function u_at(x, y) {
    return game.u?.ux === x && game.u?.uy === y;
}

function m_at(x, y) {
    // C: level.monsters[][] — include worm body segs (place_worm_seg).
    const seg = game._level_monsters?.get(`${x},${y}`);
    if (seg) return seg;
    const list = game.fmon || [];
    for (const m of list) {
        if (m.mx === x && m.my === y) return m;
    }
    return null;
}

/** C ref: monmove.c closed_door — IS_DOOR && (CLOSED|LOCKED). */
function closed_door(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc || !IS_DOOR(loc.typ)) return false;
    return !!((loc.doormask || 0) & (D_CLOSED | D_LOCKED));
}

/**
 * C ref: monmove.c accessible — ACCESSIBLE(SURFACE_AT) && !closed_door.
 * DRAWBRIDGE_UP under-typ (SURFACE_AT) deferred.
 */
function accessible(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    return ACCESSIBLE(loc.typ) && !closed_door(x, y);
}

function sobj_at(otyp, x, y) {
    for (let o = objects_at(x, y); o; o = o.nexthere) {
        if ((o.otyp | 0) === otyp) return o;
    }
    return null;
}

/** C ref: mondata.h unique_corpstat — G_UNIQ. Local (trap.js cycle). */
function unique_corpstat(ptr) {
    return !!((ptr?.geno | 0) & G_UNIQ);
}

/**
 * C ref: engrave.c engr_at / sengr_at.
 * Local clones — engrave.js imports trap.js/makemon.js which import this file.
 * strict: strcmpi whole actual_text; else case-insensitive substring.
 * HEADSTONE skipped (player named Elbereth). Future engr_time ignored.
 */
function engr_at(x, y) {
    for (let ep = game.head_engr; ep; ep = ep.nxt_engr) {
        if (ep.engr_x === x && ep.engr_y === y) return ep;
    }
    return null;
}

function sengr_at(s, x, y, strict) {
    const ep = engr_at(x, y);
    if (!ep || ep.engr_type === HEADSTONE) return null;
    if ((ep.engr_time | 0) > (game.moves | 0)) return null;
    const txt = String(ep.engr_txt?.actual_text ?? ep.engr_txt ?? '');
    const needle = String(s ?? '');
    const hay = txt.toLowerCase();
    const want = needle.toLowerCase();
    if (strict ? hay !== want : !hay.includes(want)) return null;
    return ep;
}

/**
 * C ref: teleport.c goodpos_onscary — fakemon (m_id==0) scary approx.
 * Altar S_VAMPIRE / SCR_SCARE_MONSTER / strict Elbereth (D-1102).
 * Live m_id != 0 uses onscary (D-1110).
 */
function goodpos_onscary(x, y, mptr) {
    if (!mptr) return false;
    /* C: onscary checks Angels and lawful minions; this oversimplifies */
    if (mptr.mlet === 'S_HUMAN' || mptr.mlet === 'S_ANGEL'
        || is_rider(mptr) || unique_corpstat(mptr)) {
        return false;
    }
    /* C: onscary also checks vampshifted bats/fog/wolves — not here */
    const loc = game.level?.at(x, y);
    if (loc && IS_ALTAR(loc.typ) && mptr.mlet === 'S_VAMPIRE') return true;
    if (sobj_at(SCR_SCARE_MONSTER, x, y)) return true;
    if (Inhell() || In_endgame(game.u?.uz)) return false;
    if ((mptr.mndx ?? -1) === PM_MINOTAUR || !haseyes(mptr)) return false;
    return !!sengr_at('Elbereth', x, y, true);
}

/**
 * C ref: mon.c m_in_air — flyer/floater; cling+ceiling mundetected deferred.
 * Local copy avoids mon.js ↔ teleport cycle.
 */
function m_in_air(mtmp) {
    const ptr = mtmp?.data;
    if (!ptr) return false;
    return !!(is_flyer(ptr) || is_floater(ptr));
}

/** C youprop.h H/E/blocked via flat + uprops[idx] (confer may not mirror E*). */
function _uprop_he(u, flatH, flatE, idx) {
    const prop = u.uprops?.[idx];
    return ((u[flatH] | 0) || (u[flatE] | 0)
        || (prop?.intrinsic | 0) || (prop?.extrinsic | 0));
}

/**
 * C youprop.h Levitation — (HLevitation || ELevitation) && !BLevitation.
 * Sticky u.Levitation is not a C field; B must still block (D-1070).
 */
function Levitation() {
    const u = game.u || {};
    const prop = u.uprops?.[LEVITATION];
    const blocked = (u.BLevitation | 0) || (prop?.blocked | 0);
    return !!(_uprop_he(u, 'HLevitation', 'ELevitation', LEVITATION) && !blocked);
}

/**
 * C youprop.h Flying — (H||E||steed is_flyer) && !BFlying.
 * confer_oc_oprop writes AMULET_OF_FLYING to uprops[].extrinsic, not EFlying
 * (D-1085). Sticky u.Flying is not a C field.
 */
function Flying() {
    const u = game.u || {};
    const prop = u.uprops?.[FLYING];
    const blocked = (u.BFlying | 0) || (prop?.blocked | 0);
    const steedFlyer = !!(u.usteed && is_flyer(u.usteed.data));
    return !!((_uprop_he(u, 'HFlying', 'EFlying', FLYING) || steedFlyer)
        && !blocked);
}

/**
 * C youprop.h Wwalking — (HWwalking || EWwalking) && !Is_waterlevel.
 * confer writes WATER_WALKING_BOOTS to uprops[WWALKING], not EWwalking.
 */
function Wwalking() {
    const u = game.u || {};
    return !!(_uprop_he(u, 'HWwalking', 'EWwalking', WWALKING)
        && !Is_waterlevel(u.uz));
}

/**
 * C youprop.h Swimming — H||E||steed is_swimmer.
 */
function Swimming() {
    const u = game.u || {};
    if (_uprop_he(u, 'HSwimming', 'ESwimming', SWIMMING)) return true;
    return !!(u.usteed && is_swimmer(u.usteed.data));
}

/**
 * C youprop.h Amphibious — magical breathing || amphibious(youmonst.data).
 * confer writes AMULET_OF_MAGICAL_BREATHING to uprops, not EMagical_breathing.
 */
function Amphibious() {
    const u = game.u || {};
    if (_uprop_he(u, 'HMagical_breathing', 'EMagical_breathing', MAGICAL_BREATHING)) {
        return true;
    }
    return amphibious(game.youmonst?.data);
}

/**
 * C youprop.h Fire_resistance — H||E ≡ uprops[FIRE_RES].
 * confer_oc_oprop does not mirror EFire_resistance (sit.js D-1089 shape).
 */
function Fire_resistance() {
    const u = game.u || {};
    const e = u.uprops?.[FIRE_RES];
    return !!((u.HFire_resistance | 0) || (u.EFire_resistance | 0)
        || u.Fire_resistance
        || (e?.intrinsic | 0) || (e?.extrinsic | 0));
}

/**
 * C youprop.h Antimagic — HAntimagic || EAntimagic
 * ≡ uprops[ANTIMAGIC]. confer_oc_oprop writes cloak-of-MR / gray DSM
 * to uprops only (D-1089). Sticky u.Antimagic for eat/poly flats.
 */
function Antimagic() {
    const u = game.u || {};
    const e = u.uprops?.[ANTIMAGIC];
    return !!((u.Antimagic || u.HAntimagic || u.EAntimagic)
        || (e?.intrinsic | 0) || (e?.extrinsic | 0));
}

/* C teleport.c tele_trap static in_tele_trap — block dest-trap recursion. */
let in_tele_trap = false;

/**
 * C ref: hack.c may_passwall — STWALL + W_NONPASSWALL blocks.
 * Local copy avoids mon.js ↔ teleport cycle (D-1100).
 */
function may_passwall(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    // C: wall_info aliases flags; OR JS split W_* fields (D-0865).
    const wi = (loc.wall_info | 0) | (loc.flags | 0);
    return !(IS_STWALL(loc.typ) && (wi & W_NONPASSWALL));
}

/** C dungeon.h within_bounded_area. Local copy avoids rect.js coupling. */
function within_bounded_area(x, y, lx, ly, hx, hy) {
    return x >= lx && x <= hx && y >= ly && y <= hy;
}

/**
 * C ref: mkmaze.c is_exclusion_zone.
 * Local copy — mklev.js already imports teleport.js (cycle, D-1101).
 */
export function is_exclusion_zone(type, x, y) {
    for (let ez = game.exclusion_zones; ez; ez = ez.next) {
        if (((type === LR_DOWNTELE
                && (ez.zonetype === LR_DOWNTELE || ez.zonetype === LR_TELE))
            || (type === LR_UPTELE
                && (ez.zonetype === LR_UPTELE || ez.zonetype === LR_TELE))
            || type === ez.zonetype)
            && within_bounded_area(x, y, ez.lx, ez.ly, ez.hx, ez.hy)) {
            return true;
        }
    }
    return false;
}

/** C ref: dungeon.c on_level. Local (priest/shk cycle). */
function on_level(a, b) {
    return !!a && !!b
        && (a.dnum | 0) === (b.dnum | 0)
        && (a.dlevel | 0) === (b.dlevel | 0);
}

/**
 * C ref: priest.c mon_aligntyp — ispriest EPRI / isminion EMIN / data.
 * Local clone avoids priest.js → makemon.js → teleport cycle (D-1110).
 */
function mon_aligntyp(mon) {
    let algn;
    if (mon?.ispriest) algn = EPRI(mon)?.shralign ?? mon?.data?.maligntyp ?? 0;
    else if (mon?.isminion) algn = EMIN(mon)?.min_align ?? mon?.data?.maligntyp ?? 0;
    else algn = mon?.data?.maligntyp ?? 0;
    if (algn === A_NONE) return A_NONE;
    if (algn > 0) return A_LAWFUL;
    if (algn < 0) return A_CHAOTIC;
    return A_NEUTRAL;
}

/** C monst.h is_lminion — is_minion(data) && mon_aligntyp == A_LAWFUL. */
function is_lminion(mon) {
    return is_minion(mon?.data) && mon_aligntyp(mon) === A_LAWFUL;
}

/**
 * C youprop.h Displaced — HDisplaced || EDisplaced (no B).
 * confer may write CLOAK_OF_DISPLACEMENT to uprops[], not EDisplaced.
 */
function Displaced() {
    const u = game.u || {};
    return !!_uprop_he(u, 'HDisplaced', 'EDisplaced', DISPLACED);
}

/**
 * C ref: shk.c inhishop — on_level(shoplevel) + in_rooms SHOPBASE.
 * Local clone — shk.js imports this file.
 */
function inhishop(shkp) {
    const eshk = ESHK(shkp);
    if (!eshk) return false;
    if (!on_level(eshk.shoplevel, game.u?.uz)) return false;
    const shkrooms = in_rooms(shkp.mx, shkp.my, SHOPBASE);
    if (!shkrooms) return false;
    return shkrooms.includes(String.fromCharCode(eshk.shoproom | 0));
}

/**
 * C ref: priest.c histemple_at / has_shrine / inhistemple.
 * Local clones — priest.js → makemon.js → teleport cycle.
 */
function histemple_at(priest, x, y) {
    if (!priest || !priest.ispriest) return false;
    const epri = EPRI(priest);
    if (!epri) return false;
    const rooms = in_rooms(x, y, TEMPLE);
    if (!rooms || (rooms.charCodeAt(0) | 0) !== (epri.shroom | 0)) return false;
    return on_level(epri.shrlevel, game.u?.uz);
}

function has_shrine(pri) {
    if (!pri || !pri.ispriest) return false;
    const epri = EPRI(pri);
    if (!epri?.shrpos) return false;
    const lev = game.level?.at(epri.shrpos.x | 0, epri.shrpos.y | 0);
    if (!lev || !IS_ALTAR(lev.typ) || !((lev.altarmask | 0) & AM_SHRINE)) {
        return false;
    }
    return (epri.shralign | 0)
        === (Amask2align((lev.altarmask | 0) & ~AM_SHRINE) | 0);
}

function inhistemple(priest) {
    if (!priest || !priest.ispriest) return false;
    if (!histemple_at(priest, priest.mx, priest.my)) return false;
    return has_shrine(priest);
}

/**
 * C ref: monmove.c onscary — live-mon scare for goodpos when m_id != 0.
 * Local copy avoids mon.js ↔ teleport cycle (D-1110).
 * mfndpos still uses mon.js's partial (sengr_at object stringify named).
 */
function onscary(x, y, mtmp) {
    const auditory_scare = (x === 0 && y === 0);
    const magical_scare = !auditory_scare;
    const ptr = mtmp?.data;

    /* C: Rodney, lawful minions, Angels, the Riders */
    if (mtmp.iswiz || is_lminion(mtmp) || (ptr?.mndx ?? -1) === PM_ANGEL
        || is_rider(ptr)) {
        return false;
    }
    /* C: humans / uniques resist magical scare (altar, scroll, Elbereth) */
    if (magical_scare && (ptr?.mlet === 'S_HUMAN' || unique_corpstat(ptr))) {
        return false;
    }
    if ((mtmp.isshk && inhishop(mtmp))
        || (mtmp.ispriest && inhistemple(mtmp))) {
        return false;
    }
    if (auditory_scare) return true;

    const loc = game.level?.at(x, y);
    if (loc && IS_ALTAR(loc.typ)
        && (ptr?.mlet === 'S_VAMPIRE' || is_vampshifter(mtmp))) {
        return true;
    }
    if (sobj_at(SCR_SCARE_MONSTER, x, y)) return true;

    const ep = sengr_at('Elbereth', x, y, true);
    return !!(ep
        && (u_at(x, y)
            || (Displaced() && mtmp.mux === x && mtmp.muy === y)
            || (ep.guardobjects && objects_at(x, y)))
        && !(mtmp.isshk || mtmp.isgd || !mtmp.mcansee
            || mtmp.mpeaceful
            || (ptr?.mndx ?? -1) === PM_MINOTAUR
            || Inhell() || In_endgame(game.u?.uz)));
}

/**
 * C ref: teleport.c goodpos() — placement / enexto suitability.
 */
export function goodpos(x, y, mtmp, gpflags = 0) {
    if (!isok(x, y)) return false;
    const allow_u = (gpflags & GP_ALLOW_U) !== 0;
    const avoid_monpos = (gpflags & GP_AVOID_MONPOS) !== 0;
    const ignorewater = (gpflags & MM_IGNOREWATER) !== 0;
    const ignorelava = (gpflags & MM_IGNORELAVA) !== 0;
    const checkscary = (gpflags & GP_CHECKSCARY) !== 0;

    // C: u_at rejected unless mtmp is youmonst / swallowed ustuck / usteed
    // (teleok(self) for wizard ^T getpos — D-0928 #1102).
    if (!allow_u && u_at(x, y)) {
        const u = game.u || {};
        if (mtmp !== game.youmonst
            && (mtmp !== u.ustuck || !u.uswallow)
            && (!u.usteed || mtmp !== u.usteed)) {
            return false;
        }
    }
    if (avoid_monpos && m_at(x, y)) return false;

    const loc = game.level?.at(x, y);
    if (!loc) return false;
    const typ = loc.typ;
    let mdat = mtmp?.data ?? null;

    if (mtmp) {
        const mtmp2 = m_at(x, y);
        // C: occupied by another mon (fakemon mx=0 never equals occupant)
        if (mtmp2 && (mtmp2 !== mtmp || mtmp.wormno)) return false;

        /* C teleport.c goodpos: is_pool()/is_lava() not IS_POOL/IS_LAVA
         * (D-1091). IS_POOL(DRAWBRIDGE_UP) is every raised bridge, so
         * UP+DB_LAVA must take the lava arm, not the swimmer arm. */
        if (is_pool(x, y) && !ignorewater) {
            /* C teleport.c goodpos: youmonst uses youprop.h Swimming /
             * Amphibious / Levitation / Flying / Wwalking, not m_in_air
             * (D-1099). Monster arm stays is_swimmer / m_in_air. */
            if (mtmp === game.youmonst) {
                return !!(Swimming() || Amphibious()
                    || (!Is_waterlevel(game.u?.uz)
                        && !IS_WATERWALL(typ)
                        && (Levitation() || Flying() || Wwalking())));
            }
            return !!(is_swimmer(mdat)
                || (!Is_waterlevel(game.u?.uz)
                    && !IS_WATERWALL(typ)
                    && m_in_air(mtmp)));
        } else if (mdat?.mlet === 'S_EEL' && rn2(13) && !ignorewater) {
            return false;
        } else if (is_lava(x, y) && !ignorelava) {
            // C: PM_FLOATING_EYE avoids lava heat (before youmonst arm)
            if (mdat && (mdat.mndx ?? -1) === PM_FLOATING_EYE) return false;
            if (mtmp === game.youmonst) {
                const u = game.u || {};
                return !!(Levitation() || Flying()
                    || (Fire_resistance() && Wwalking() && u.uarmf
                        && u.uarmf.oerodeproof)
                    || (Upolyd(u) && likes_lava(game.youmonst.data)));
            }
            return !!(m_in_air(mtmp) || likes_lava(mdat));
        }
        /* C teleport.c goodpos: passes_walls(mdat) && may_passwall
         * early-out before amorphous/accessible (D-1100). Form flag,
         * not youprop Passes_walls. */
        if (passes_walls(mdat) && may_passwall(x, y)) return true;
        // C: amorphous may ooze through closed doors before accessible()
        if (amorphous(mdat) && closed_door(x, y)) return true;
        /* C teleport.c goodpos: live m_id uses onscary; fakemon
         * (m_id==0) uses goodpos_onscary (D-1110). */
        if (checkscary && (mtmp.m_id ? onscary(x, y, mtmp)
            : goodpos_onscary(x, y, mdat))) {
            return false;
        }
    }

    // C: accessible() — rejects closed/locked doors (bare ACCESSIBLE is wrong)
    if (!accessible(x, y)) {
        if (!(is_pool(x, y) && ignorewater)
            && !(is_lava(x, y) && ignorelava)) {
            return false;
        }
    }
    if (sobj_at(BOULDER, x, y) && (!mdat || !throws_rocks(mdat))) return false;
    /* C teleport.c goodpos: pretend GP_AVOID_MONPOS == monster creation
     * (D-1101). Wallwalk / pool / lava early-outs skip this. */
    if (avoid_monpos && is_exclusion_zone(LR_MONGEN, x, y)) return false;
    return true;
}

// C ref: teleport.c collect_coords()
export function collect_coords(ccc, cx, cy, maxradius, cc_flags, filter) {
    let n = 0;
    let result = 0;
    let passcc = null;

    const include_cxcy = (cc_flags & CC_INCL_CENTER) !== 0;
    const scramble = (cc_flags & CC_UNSHUFFLED) === 0;
    const ring_pairs = scramble && (cc_flags & CC_RING_PAIRS) !== 0;
    const skip_mons = (cc_flags & CC_SKIP_MONS) !== 0;
    const skip_inaccessible = (cc_flags & CC_SKIP_INACCS) !== 0;

    const rowrange = (cy < ROWNO / 2) ? (ROWNO - 1 - cy) : cy;
    const colrange = (cx < COLNO / 2) ? (COLNO - 1 - cx) : cx;
    let k = Math.max(rowrange, colrange);
    if (!maxradius) maxradius = k;
    else maxradius = Math.min(maxradius, k);

    for (let radius = include_cxcy ? 0 : 1; radius <= maxradius; ++radius) {
        let newpass, passend;
        if (!ring_pairs) {
            newpass = passend = true;
        } else {
            newpass = ((radius % 2) !== 0 || radius === 0);
            passend = ((radius % 2) === 0 || radius === maxradius);
        }
        if (newpass || !passcc) {
            passcc = { base: result, n: 0 }; // track slice start in ccc
            n = 0;
        }
        const lox = cx - radius, hix = cx + radius;
        const loy = cy - radius, hiy = cy + radius;
        for (let y = Math.max(loy, 0); y <= hiy; ++y) {
            if (y > ROWNO - 1) break;
            for (let x = Math.max(lox, 1); x <= hix; ++x) {
                if (x > COLNO - 1) break;
                if (x !== lox && x !== hix && y !== loy && y !== hiy) continue;
                if (skip_mons && m_at(x, y)) continue;
                const loc = game.level?.at(x, y);
                if (skip_inaccessible && loc && !ZAP_POS(loc.typ)) continue;
                if (filter && !filter(x, y)) continue;
                ccc.push({ x, y });
                ++n;
                ++result;
                if (passcc) passcc.n = n;
            }
        }
        if (scramble && passend) {
            // Shuffle entries gathered for current radius (or pair)
            // C: passcc points at start of this pass's entries
            const start = result - n;
            let nn = n;
            let off = start;
            while (nn > 1) {
                const kk = rn2(nn);
                if (kk) {
                    const tmp = ccc[off];
                    ccc[off] = ccc[off + kk];
                    ccc[off + kk] = tmp;
                }
                ++off;
                --nn;
            }
        }
    }
    return result;
}

// C ref: teleport.c enexto_core (NEW_ENEXTO)
export function enexto_core(cc, xx, yy, mdat, entflags) {
    const candy = [];
    const allow_xx_yy = (entflags & GP_ALLOW_XY) !== 0;
    const fakemon = { data: mdat, mx: 0, my: 0, wormno: 0 };

    const nearcandyct = collect_coords(candy, xx, yy, 3, CC_NO_FLAGS, null);
    for (let i = 0; i < nearcandyct; ++i) {
        cc.x = candy[i].x;
        cc.y = candy[i].y;
        if (goodpos(cc.x, cc.y, fakemon, entflags)) return true;
    }

    const allStart = candy.length;
    const allcandyct = collect_coords(candy, xx, yy, 0, CC_NO_FLAGS, null);
    // nearcandyct spots already rejected (different order, same total)
    for (let i = nearcandyct; i < allcandyct; ++i) {
        // allcandyct is count from second collect which appended; indices from allStart
        const spot = candy[allStart + (i - nearcandyct)];
        if (!spot) continue;
        cc.x = spot.x;
        cc.y = spot.y;
        if (goodpos(cc.x, cc.y, fakemon, entflags)) return true;
    }

    cc.x = xx;
    cc.y = yy;
    if (allow_xx_yy && goodpos(cc.x, cc.y, fakemon, entflags)) return true;
    return false;
}

export function enexto(cc, xx, yy, mdat) {
    return enexto_core(cc, xx, yy, mdat, GP_CHECKSCARY)
        || enexto_core(cc, xx, yy, mdat, 0);
}

// C ref: teleport.c enexto_gpflags()
export function enexto_gpflags(cc, xx, yy, mdat, entflags) {
    return enexto_core(cc, xx, yy, mdat, GP_CHECKSCARY | entflags)
        || enexto_core(cc, xx, yy, mdat, entflags);
}

/**
 * C ref: teleport.c rloc_to_core — resident shk leaving shop after dest
 * (1734–1740). Snapshot inhishop at origin (before pickup); after place,
 * !inhishop → make_angry_shk. C ox/oy ARGSUSED. Dynamic import: shk.js
 * already imports rloc_to_flag from this file.
 */
async function rloc_maybe_angry_shk(mtmp, resident_shk, oldx, oldy) {
    if (resident_shk && !inhishop(mtmp)) {
        const { make_angry_shk } = await import('./shk.js');
        await make_angry_shk(mtmp, oldx, oldy);
    }
}

/**
 * C ref: teleport.c rloc_to_core 1742–1758 — minvent shop goods after angry.
 * Dest !costly_spot: clear no_charge; onshopbill → stolen_value(oldxy).
 * Shop-to-shop keeps no_charge and the first shk's bill. Dynamic import:
 * shk.js already imports rloc_to_flag from this file.
 */
async function rloc_maybe_minvent_shop_bill(mtmp, destx, desty, oldx, oldy) {
    if (!mtmp?.minvent) return;
    const { costly_spot, find_objowner, onshopbill, stolen_value } =
        await import('./shk.js');
    if (costly_spot(destx, desty)) return;
    const shkp = find_objowner(mtmp.minvent, oldx, oldy);
    const peaceful = !shkp || !!shkp.mpeaceful;
    for (let otmp = mtmp.minvent; otmp; otmp = otmp.nobj) {
        if (otmp.no_charge) {
            otmp.no_charge = 0;
        } else if (shkp && onshopbill(otmp, shkp, true)) {
            await stolen_value(otmp, oldx, oldy, peaceful, false);
        }
    }
}

/**
 * C ref: teleport.c rloc_to_core 1761–1763 — if hero is busy, maybe
 * stop occupation. After dest (and after appear when rloc_to_flag),
 * after angry+bill, before mintrap. chug FALSE: do not move mtmp;
 * only the newly-spotted threat check (monmove.c dochugw). Dynamic
 * import: monmove.js already imports rloc from this file.
 */
async function rloc_maybe_occupation(mtmp) {
    if (typeof game.occupation === 'function') {
        const { dochugw } = await import('./monmove.js');
        await dochugw(mtmp, false);
    }
}

/**
 * C ref: teleport.c rloc_to_core 1765–1767 — trapped monster teleported
 * away. After dest (and after appear when rloc_to_flag). Worms skip.
 * mintrap at dest: no trap → clear mtrapped ("perhaps teleported?");
 * trap still there → already-trapped escape, not a fresh step-on.
 * Dynamic import: trap.js already imports teleport.js.
 */
async function rloc_maybe_mintrap(mtmp) {
    if (mtmp?.mtrapped && !mtmp.wormno) {
        const { mintrap } = await import('./trap.js');
        await mintrap(mtmp, NO_TRAP_FLAGS);
    }
}

/**
 * C ref: teleport.c rloc_to / rloc_to_core — place monster at (x,y).
 * RLOC_NOMSG path: worm remove_worm else remove+newsym(old); place;
 * update_monster_region (D-1161; after place, before worm tail);
 * place_worm_tail_randomly; ustuck swallow u_on_newpos/check_special_room/
 * docrt else !m_next2u unstuck (D-1123); maybe_unhide_at then newsym(new)
 * (D-1152); set_apparxy after dest newsym (D-1160; C place_monster
 * writes mx/my only); resident shk !inhishop dest → make_angry_shk
 * (D-1162; after dest, after vanish/appear when rloc_to_flag);
 * minvent shop bill after angry (D-1163; dest !costly_spot → clear
 * no_charge else stolen_value for onshopbill); occupation dochugw
 * after bill (D-1170; go.occupation → dochugw(mtmp, FALSE) — no
 * dochug, only stop-if-newly-spotted-threat); trapped !wormno
 * mintrap after occupation (D-1164; dest no trap clears mtrapped).
 * `set_msg_xy` at dest-msg is D-1196 (rloc_to_flag / rloc_post_move_msg).
 * RLOC_MSG vanish+appear live in async `rloc` (D-0885 / D-0886);
 * telemsg "vanishes and reappears" D-1180; ustuck-together You() D-1183;
 * wand `makeknown(WAN_TELEPORTATION)` after a delivered dest msg D-1195.
 * rloc_opts.defer_shk_angry is JS-only so
 * rloc_to_flag can run appear pline before angry (C order).
 */
export async function rloc_to(mtmp, x, y, rloc_opts = null) {
    if (!mtmp) return null;
    const oldx = mtmp.mx | 0;
    const oldy = mtmp.my | 0;
    // C: resident_shk = isshk && inhishop — before same-cell return / pickup
    const resident_shk = !!(mtmp.isshk && inhishop(mtmp));
    // C: if (x == mx && y == my && m_at(x, y) == mtmp) return;
    if (x === oldx && y === oldy && m_at(x, y) === mtmp) return null;

    if (oldx) {
        /* JS m_at scans fmon by mx/my; zero coords before newsym so the
         * head is not still “on” the old cell (C occupancy is the grid). */
        mtmp.mx = 0;
        mtmp.my = 0;
        if (mtmp.wormno) {
            // C: remove_worm — all segs off grid + newsym each
            remove_worm(mtmp);
        } else {
            // C: remove_monster(oldx,oldy); newsym(oldx,oldy);
            newsym(oldx, oldy);
        }
    }
    // C ref: teleport.c rloc_to — mon_track_clear before place
    if (mtmp.mtrack) {
        for (let j = 0; j < mtmp.mtrack.length; j++) {
            mtmp.mtrack[j] = { x: 0, y: 0 };
        }
    }
    // C place_monster (steed.c): mx/my + occupancy; mux/muy stay until
    // set_apparxy after dest newsym (teleport.c:1702, D-1160).
    mtmp.mx = x;
    mtmp.my = y;
    // C: update_monster_region after place, before worm tail
    // (teleport.c:1685 / region.c:598–611, D-1161).
    update_monster_region(mtmp);
    if (mtmp.wormno) {
        // C: place_worm_tail_randomly after update_monster_region
        place_worm_tail_randomly(mtmp, x, y);
    }

    const u = game.u || {};
    if (u.ustuck === mtmp) {
        if (u.uswallow) {
            /* C dungeon.c u_on_newpos: ux/uy, clear hide, steed.
             * see_nearby_objects skipped while swallowed. earth_sense named. */
            u.ux = mtmp.mx | 0;
            u.uy = mtmp.my | 0;
            u.uundetected = 0;
            if (u.usteed) {
                u.usteed.mx = u.ux;
                u.usteed.my = u.uy;
            }
            await check_special_room(false);
            await docrt();
        } else if (distu_xy(mtmp.mx, mtmp.my) > 2) {
            // C: else if (!m_next2u(mtmp)) unstuck(mtmp)
            const { unstuck } = await import('./mhitu.js');
            await unstuck(mtmp);
        }
    }

    // C: maybe_unhide_at; newsym; set_apparxy (teleport.c:1700–1702).
    // Dynamic import: monmove.js already imports rloc from this file.
    const { maybe_unhide_at, set_apparxy } = await import('./monmove.js');
    await maybe_unhide_at(x, y);
    newsym(x, y);
    set_apparxy(mtmp);
    // C: vanish/appear pline then resident_shk && !inhishop make_angry_shk
    // then minvent shop bill then occupation then trapped mintrap
    // (teleport.c:1739, 1748, 1762, 1766). Silent rloc_to (RLOC_NOMSG)
    // skips the pline block; rloc_to_flag defers angry+bill+occupation
    // +mintrap until after rloc_post_move_msg.
    if (!rloc_opts?.defer_shk_angry) {
        await rloc_maybe_angry_shk(mtmp, resident_shk, oldx, oldy);
        await rloc_maybe_minvent_shop_bill(mtmp, x, y, oldx, oldy);
        await rloc_maybe_occupation(mtmp);
        await rloc_maybe_mintrap(mtmp);
    }
    return { resident_shk, oldx, oldy };
}

/**
 * C ref: teleport.c m_blocks_teleporting — demon lord/prince on level.
 */
function m_blocks_teleporting(mtmp) {
    return !!(mtmp?.data && (is_dlord(mtmp.data) || is_dprince(mtmp.data)));
}

/**
 * C ref: mon.c get_iter_mons — first living on-map mon where bfunc is true.
 * Local copy to avoid sounds.js import cycle.
 */
function get_iter_mons_tele(bfunc) {
    for (const mtmp of game.fmon || []) {
        if (!mtmp || mtmp.mx == null || mtmp.my == null) continue;
        if ((mtmp.mhp | 0) < 1) continue;
        if (bfunc(mtmp)) return mtmp;
    }
    return null;
}

/**
 * C ref: teleport.c noteleport_level — hell court + flags + stasis.
 * Covetous monsters bypass level.flags.noteleport (Vlad on tower1).
 */
export function noteleport_level(mon) {
    // demon court in Gehennom prevent others from teleporting
    if (Inhell() && mon?.data
        && !(is_dlord(mon.data) || is_dprince(mon.data))) {
        if (get_iter_mons_tele(m_blocks_teleporting)) return true;
    }
    const M3_COVETOUS = 0x001f;
    const covetous = !!((mon?.data?.mflags3 ?? 0) & M3_COVETOUS);
    if (game.level?.flags?.noteleport && !covetous) return true;
    if ((game.level?.flags?.stasis_until ?? -1) >= (game.moves ?? 0)) return true;
    return false;
}

/**
 * C ref: teleport.c tele_restrict — noteleport_level gate; when blocked and
 * canseemon, pline the mysterious-force message (may --More--).
 */
export async function tele_restrict(mon) {
    if (noteleport_level(mon)) {
        if (canseemon(mon)) {
            await pline(
                `A mysterious force prevents ${mon_nam(mon)} from teleporting!`,
            );
        }
        return true;
    }
    return false;
}

/** C ref: mkroom.c search_special — first room/subroom matching type. */
function search_special(type) {
    const lists = [game.level?.rooms, game.level?.subrooms];
    for (const rooms of lists) {
        if (!rooms) continue;
        for (const croom of rooms) {
            if (!croom || (croom.hx | 0) < 0) break;
            const rt = croom.rtype | 0;
            if ((type === ANY_SHOP && rt >= SHOPBASE) || rt === type) {
                return croom;
            }
        }
    }
    return null;
}

/** Local trap-at check — avoid importing trap.js (cycle). */
function trap_at(x, y) {
    const ftrap = game.ftrap;
    if (Array.isArray(ftrap)) {
        for (const t of ftrap) {
            if (t && (t.tx | 0) === x && (t.ty | 0) === y) return t;
        }
    } else {
        for (let t = ftrap; t; t = t.ntrap) {
            if ((t.tx | 0) === x && (t.ty | 0) === y) return t;
        }
    }
    const traps = game.level?.traps;
    if (Array.isArray(traps)) {
        for (const t of traps) {
            if (t && (t.tx | 0) === x && (t.ty | 0) === y) return t;
        }
    }
    return null;
}

/** C ref: mklev.c occupied — trap/furniture/lava/pool (invocation deferred). */
function occupied(x, y) {
    if (!isok(x, y)) return false;
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    return !!(trap_at(x, y)
        || IS_FURNITURE(loc.typ)
        || loc.typ === LAVAPOOL || loc.typ === LAVAWALL
        || IS_POOL(loc.typ));
}

function somex(croom) {
    return rn1((croom.hx | 0) - (croom.lx | 0) + 1, croom.lx | 0);
}
function somey(croom) {
    return rn1((croom.hy | 0) - (croom.ly | 0) + 1, croom.ly | 0);
}

/**
 * C ref: mkroom.c somexy — vault/ordinary: !irregular && !nsubrooms → one
 * somex+somey. Irregular/subroom reject loops deferred (named omission).
 */
function somexy(croom, c) {
    if (croom.irregular || (croom.nsubrooms | 0)) {
        // Named omission: irregular edge/roomno + subroom inside_room reject
        c.x = somex(croom);
        c.y = somey(croom);
        return true;
    }
    c.x = somex(croom);
    c.y = somey(croom);
    return true;
}

/** C ref: mkroom.c somexyspace */
function somexyspace(croom, c) {
    let trycnt = 0;
    let okay;
    do {
        okay = somexy(croom, c) && isok(c.x, c.y) && !occupied(c.x, c.y);
        if (okay) {
            const loc = game.level?.at(c.x, c.y);
            okay = !!(loc && (loc.typ === ROOM || loc.typ === CORR || loc.typ === ICE));
        }
    } while (trycnt++ < 100 && !okay);
    return okay;
}

/**
 * C ref: teleport.c tele_jump_ok — restricted updest/dndest region gate.
 */
function tele_jump_ok(x1, y1, x2, y2) {
    if (!isok(x2, y2)) return false;
    const within = (x, y, d) => {
        if (!d || !(d.nlx > 0)) return false;
        return x >= (d.nlx | 0) && x <= (d.nhx | 0)
            && y >= (d.nly | 0) && y <= (d.nhy | 0);
    };
    const dndest = game.dndest || {};
    if ((dndest.nlx | 0) > 0) {
        const in1 = within(x1, y1, dndest);
        const in2 = within(x2, y2, dndest);
        if (in1 !== in2) return false;
    }
    const updest = game.updest || {};
    if ((updest.nlx | 0) > 0) {
        const in1 = within(x1, y1, updest);
        const in2 = within(x2, y2, updest);
        if (in1 !== in2) return false;
    }
    return true;
}

/**
 * C ref: teleport.c rloc_pos_ok — goodpos(GP_CHECKSCARY), then either
 * migrating mx==0 (my holds flags: bit 0 up, bit 1 W-tower) against
 * updest/dndest, or on-map keep resident shk/priest in their room then
 * tele_jump_ok. Dest roomno vs ESHK.shoproom / EPRI.shroom (unsigned
 * char), not in_rooms; rloc may still goodpos-fallback.
 * Writer: migrate_to_level xyflags (D-1198); mon_arrive copies into my
 * before rloc (D-1199).
 */
function rloc_pos_ok(x, y, mtmp) {
    if (!goodpos(x, y, mtmp, GP_CHECKSCARY)) return false;
    const xx = mtmp?.mx | 0;
    const yy = mtmp?.my | 0;
    if (!xx) {
        /* C teleport.c:1592–1615 — no current location (migrating
         * arrival). yy is flags, not a row. */
        const dndest = game.dndest || {};
        const updest = game.updest || {};
        if ((dndest.nlx | 0) && On_W_tower_level(game.u?.uz)) {
            return (((yy & 2) !== 0)
                ^ !within_bounded_area(x, y,
                    dndest.nlx | 0, dndest.nly | 0,
                    dndest.nhx | 0, dndest.nhy | 0)) !== 0;
        }
        if ((updest.lx | 0) && ((yy & 1) !== 0)) {
            return within_bounded_area(x, y,
                    updest.lx | 0, updest.ly | 0,
                    updest.hx | 0, updest.hy | 0)
                && (!(updest.nlx | 0)
                    || !within_bounded_area(x, y,
                        updest.nlx | 0, updest.nly | 0,
                        updest.nhx | 0, updest.nhy | 0));
        }
        if ((dndest.lx | 0) && ((yy & 1) === 0)) {
            return within_bounded_area(x, y,
                    dndest.lx | 0, dndest.ly | 0,
                    dndest.hx | 0, dndest.hy | 0)
                && (!(dndest.nlx | 0)
                    || !within_bounded_area(x, y,
                        dndest.nlx | 0, dndest.nly | 0,
                        dndest.nhx | 0, dndest.nhy | 0));
        }
    } else {
        /* C teleport.c:1620–1626 — try to keep shopkeeper / temple
         * priest in-room (caller may still resort to goodpos). */
        if (mtmp.isshk && inhishop(mtmp)) {
            const destRoom = (game.level?.at(x, y)?.roomno | 0) & 0xff;
            if (destRoom !== ((ESHK(mtmp)?.shoproom | 0) & 0xff)) {
                return false;
            }
        } else if (mtmp.ispriest && inhistemple(mtmp)) {
            const destRoom = (game.level?.at(x, y)?.roomno | 0) & 0xff;
            if (destRoom !== ((EPRI(mtmp)?.shroom | 0) & 0xff)) {
                return false;
            }
        }
        if (!tele_jump_ok(xx, yy, x, y)) return false;
    }
    return true;
}

/**
 * C ref: teleport.c rloc_to_core message envelope — vanish before move,
 * appear after place. Returns msg state for the post-place arm.
 * Telemsg "vanishes and reappears" is D-1180; ustuck-together You() D-1183;
 * wand `makeknown` after a delivered dest msg is D-1195;
 * dest-msg `set_msg_xy` is D-1196.
 */
async function rloc_pre_move_msg(mtmp, x, y, rlocflags) {
    const preventmsg = (rlocflags & RLOC_NOMSG) !== 0;
    const vanishmsg = (rlocflags & RLOC_MSG) !== 0;
    let appearmsg = ((mtmp.mstrategy | 0) & STRAT_APPEARMSG) !== 0;
    const domsg = !game.in_mklev && (vanishmsg || appearmsg) && !preventmsg;
    let telemsg = false;
    const oldx = mtmp.mx | 0;
    const oldy = mtmp.my | 0;
    if (domsg && oldx && canspotmon(mtmp)) {
        if (couldsee(x, y) || sensemon(mtmp)) {
            telemsg = true;
        } else {
            await pline(`${Monnam(mtmp)} vanishes!`);
        }
        // C: avoid "It suddenly appears!" after a spotted teleport-away
        appearmsg = false;
    }
    return { domsg, telemsg, appearmsg, oldx, oldy };
}

/**
 * C ref: teleport.c rloc_to_core post-place appear / reappear pline
 * (1703–1726). Telemsg "vanishes and reappears" + next/close-by/
 * closer/farther (D-1180). Ustuck-together You() first arm (D-1183;
 * C 1710–1711). Wand `makeknown(WAN_TELEPORTATION)` after any
 * delivered dest msg (D-1195; C 1727–1731). Dest-msg `set_msg_xy`
 * before those plines (D-1196; C 1708).
 */
async function rloc_post_move_msg(mtmp, x, y, state) {
    const { domsg, telemsg, oldx, oldy } = state;
    let appearmsg = state.appearmsg;
    if (!domsg) return;
    const u = game.u || {};
    if (!(canspotmon(mtmp) || appearmsg || mtmp === u.ustuck)) return;

    const du = distu_xy(x, y);
    const next = du <= 2 ? ' next to you' : null; /* next2u() */
    const nearu = du <= BOLT_LIM * BOLT_LIM ? ' close by' : null;

    // C teleport.c:1708 set_msg_xy(x, y) before dest plines (D-1196).
    set_msg_xy(x, y);
    // C: mtmp->mstrategy &= ~STRAT_APPEARMSG
    if (mtmp.mstrategy != null) mtmp.mstrategy &= ~STRAT_APPEARMSG;

    // C teleport.c:1710–1711 first arm; else-if telemsg; else appear
    if (mtmp === u.ustuck && !u_at(u.ux0, u.uy0)) {
        await pline(`You and ${mon_nam(mtmp)} teleport together.`);
    } else if (telemsg && (couldsee(x, y) || sensemon(mtmp))) {
        // C: next ? next : nearu ? nearu : (olddu==du)?"" : closer/farther
        let where;
        if (next) {
            where = next;
        } else if (nearu) {
            where = nearu;
        } else {
            const olddu = distu_xy(oldx | 0, oldy | 0);
            where = olddu === du ? ''
                : (du < olddu) ? ' closer to you' : ' farther away';
        }
        await pline(`${Monnam(mtmp)} vanishes and reappears${where}.`);
    } else {
        const near = next || nearu || '';
        // C youprop.h Blind — poly brown mold is blind (D-0928 #1128).
        const Blind = !!(((u.HBlinded | 0) || (u.EBlinded | 0) || u.Blind || u.ublind)
            && !(u.BBlinded | 0));
        const who = appearmsg ? Amonnam(mtmp) : Monnam(mtmp);
        const sud = appearmsg ? 'suddenly ' : '';
        const verb = Blind ? 'arrives' : 'appears';
        await pline(`${who} ${sud}${verb}${near}!`);
    }
    /* C teleport.c:1727–1731 — wand discovery only if a message is
     * delivered (C comment: bug?). Spell / q.mechanic / artifact
     * #invoke leave current_wand Null. */
    if (game.current_wand && game.current_wand.otyp === WAN_TELEPORTATION) {
        makeknown(WAN_TELEPORTATION);
    }
}

/**
 * Place mon at (x,y) with rloc_to_core message order.
 * C ref: teleport.c rloc_to_flag.
 */
export async function rloc_to_flag(mtmp, x, y, rlocflags) {
    if (!mtmp) return;
    // C rloc_to_core: same-cell return before vanish/appear (1658–1659).
    if (x === (mtmp.mx | 0) && y === (mtmp.my | 0) && m_at(x, y) === mtmp) {
        return;
    }
    const state = await rloc_pre_move_msg(mtmp, x, y, rlocflags);
    // Defer shk angry until after appear pline (C rloc_to_core 1703 then 1739).
    const snap = await rloc_to(mtmp, x, y, { defer_shk_angry: true });
    await rloc_post_move_msg(mtmp, x, y, state);
    if (snap) {
        await rloc_maybe_angry_shk(mtmp, snap.resident_shk, snap.oldx, snap.oldy);
        await rloc_maybe_minvent_shop_bill(mtmp, x, y, snap.oldx, snap.oldy);
        await rloc_maybe_occupation(mtmp);
        await rloc_maybe_mintrap(mtmp);
    }
}

/**
 * Place mon at (x,y) with rloc_to_core message order.
 */
async function rloc_to_with_msg(mtmp, x, y, rlocflags) {
    await rloc_to_flag(mtmp, x, y, rlocflags);
}

/**
 * C ref: teleport.c stairway_find_forwiz — first stair/ladder of dir
 * whose dest dungeon matches u.uz.dnum.
 */
function stairway_find_forwiz(isladder, up) {
    const wantLadder = !!isladder;
    const wantUp = !!up;
    const dnum = game.u?.uz?.dnum | 0;
    for (let stway = game.stairs; stway; stway = stway.next) {
        if (!!stway.isladder === wantLadder
            && !!stway.up === wantUp
            && (stway.tolev?.dnum | 0) === dnum) {
            return stway;
        }
    }
    return null;
}

/**
 * C ref: teleport.c control_mon_tele — wizard-mode getpos destination.
 * Gated on flags.debug||flags.wizard and iflags.mon_telecontrol (default
 * Off). Callers: rloc via_rloc TRUE (D-1122); mnexto via_rloc FALSE
 * (D-1173). Named omit: OPTIONS= parse into doset (iflags may be set
 * directly); debug_fuzzer skips force y_n.
 */
export async function control_mon_tele(mon, cc_p, rlocflags, via_rloc) {
    if (!isok(cc_p.x, cc_p.y)) {
        cc_p.x = mon.mx | 0;
        cc_p.y = mon.my | 0;
        if (!isok(cc_p.x, cc_p.y)) {
            cc_p.x = game.u?.ux | 0;
            cc_p.y = game.u?.uy | 0;
        }
    }

    const wizard = !!(game.flags?.debug || game.flags?.wizard);
    if (!wizard || !game.iflags?.mon_telecontrol) return false;

    const nam = noit_mon_nam(mon);
    await pline(`Teleport ${nam} @ <${mon.mx | 0},${mon.my | 0}> where?`);
    const tcbuf = `where to teleport ${nam}`;
    const { getpos } = await import('./getpos.js');
    if ((await getpos(cc_p, false, tcbuf)) >= 0 && !u_at(cc_p.x, cc_p.y)) {
        const ok = via_rloc
            ? rloc_pos_ok(cc_p.x, cc_p.y, mon)
            : goodpos(cc_p.x, cc_p.y, mon, rlocflags);
        if (ok) return true;
        if (!game.iflags?.debug_fuzzer) {
            const forceQ =
                `<${mon.mx | 0},${mon.my | 0}> is not considered viable; force anyway?`;
            if ((await yn_function(forceQ, 'yn', 'n')) === 'y') return true;
        }
    }
    await pline(`${via_rloc ? 'Picking random' : 'Using derived'} destination.`);
    return false;
}

/**
 * C ref: teleport.c rloc — Wizard stair / control_mon_tele then 50× rnd/rn2
 * then unshuffled candy shuffle (D-1122).
 * Steed is hero teleport: tele() then TRUE even if tele() does not
 * move (noteleport) (D-1172; C 1808–1811). Not Wizard stair.
 * Dest-msg `set_msg_xy` is D-1196 (rloc_to_flag).
 * mnexto control_mon_tele is D-1173. RLOC_ERR impossible is D-1181.
 * Ustuck-together You() is D-1183. Wand makeknown is D-1195.
 */
export async function rloc(mtmp, rlocflags = 0) {
    if (!mtmp) return false;
    // C: if (mtmp == u.usteed) { tele(); return TRUE; } — before iswiz.
    if (mtmp === game.u?.usteed) {
        await tele();
        return true;
    }

    let x = 0;
    let y = 0;
    let found = false;

    // C: Wizard already on the map prefers stairs/ladders via goodpos
    // (not rloc_pos_ok — onscary / tele-jump ignored).
    if (mtmp.iswiz && (mtmp.mx | 0)) {
        let stway;
        if (!In_W_tower(game.u?.ux | 0, game.u?.uy | 0, game.u?.uz)) {
            stway = stairway_find_forwiz(false, true);
        } else if (!stairway_find_forwiz(true, false)) {
            stway = stairway_find_forwiz(true, true);
        } else {
            stway = stairway_find_forwiz(true, false);
        }
        x = stway ? (stway.sx | 0) : 0;
        y = stway ? (stway.sy | 0) : 0;
        if (goodpos(x, y, mtmp, 0)) found = true;
    }

    if (!found && game.iflags?.mon_telecontrol && (mtmp.mx | 0)) {
        const cc = { x: mtmp.mx | 0, y: mtmp.my | 0 };
        if (await control_mon_tele(mtmp, cc, rlocflags, true)) {
            x = cc.x | 0;
            y = cc.y | 0;
            found = true;
        }
    }

    if (!found) {
        for (let trycount = 0; trycount < 50; ++trycount) {
            x = rnd(COLNO - 1); // 1..COLNO-1
            y = rn2(ROWNO); // 0..ROWNO-1
            if (rloc_pos_ok(x, y, mtmp)) {
                found = true;
                break;
            }
        }
    }

    if (!found) {
        let cc_flags = CC_INCL_CENTER | CC_UNSHUFFLED | CC_SKIP_MONS;
        if (!passes_walls(mtmp.data)) cc_flags |= CC_SKIP_INACCS;
        const candy = [];
        const candycount = collect_coords(
            candy, (COLNO / 2) | 0, (ROWNO / 2) | 0, 0, cc_flags, null,
        );
        let backupx = 0;
        let backupy = 0;
        for (let i = 0; i < candycount; ++i) {
            const j = rn2(candycount - i);
            if (j > 0) {
                const tmp = candy[i];
                candy[i] = candy[i + j];
                candy[i + j] = tmp;
            }
            x = candy[i].x | 0;
            y = candy[i].y | 0;
            if (rloc_pos_ok(x, y, mtmp)) {
                found = true;
                break;
            }
            if (!backupx && goodpos(x, y, mtmp, 0)) {
                backupx = x;
                backupy = y;
            }
        }
        if (!found) {
            /* C teleport.c:1884–1888 — no rloc_pos_ok and no goodpos
             * backup: RLOC_ERR callers treat failure as a programming
             * error (mkmaze baalz, dismount bones, mplayer insurance). */
            if (!backupx) {
                if ((rlocflags & RLOC_ERR) !== 0) {
                    await impossible("rloc(): couldn't relocate monster");
                }
                return false;
            }
            x = backupx;
            y = backupy;
        }
    }

    await rloc_to_with_msg(mtmp, x, y, rlocflags);
    return true;
}

/**
 * C ref: teleport.c mvault_tele — place mon into VAULT via somexyspace.
 */
async function mvault_tele(mtmp) {
    const croom = search_special(VAULT);
    const c = { x: 0, y: 0 };
    if (croom && somexyspace(croom, c) && goodpos(c.x, c.y, mtmp, 0)) {
        await rloc_to(mtmp, c.x, c.y);
        return;
    }
    rloc(mtmp, 0);
}

/**
 * C ref: teleport.c mtele_trap — monster TELEP_TRAP.
 * Envelope: noteleport_level; teleport_pet; once → mvault_tele; else
 * teledest rloc_to if free; else rloc. Caller handles in_sight pline/seetrap.
 * Named omission: RLOC_MSG vanish text inside rloc_to_core.
 */
export async function mtele_trap(mtmp, trap) {
    if (!mtmp || !trap) return false;
    if (noteleport_level(mtmp)) return false;
    if (!(await teleport_pet(mtmp, false))) return false;

    if (trap.once) {
        await mvault_tele(mtmp);
    } else if (isok(trap.teledest?.x, trap.teledest?.y)) {
        const dx = trap.teledest.x | 0;
        const dy = trap.teledest.y | 0;
        if (!(m_at(dx, dy) || u_at(dx, dy))) {
            await rloc_to(mtmp, dx, dy);
        }
    } else {
        rloc(mtmp, 0);
    }
    return true;
}

/**
 * C ref: teleport.c teleok — trapok; VIBRATING_SQUARE always ok;
 * pit/hole ok iff Levitation||Flying (D-1111); then goodpos,
 * tele_jump_ok, in_out_region (D-1119). in_out_region awaits
 * pline1(enter_msg/leave_msg) when set (D-1143).
 * Named omit: force-field enter/leave callbacks. hack.c walk is
 * D-1157; dothrow.c hurtle_step is D-1165; do.c goto_level is
 * D-1166.
 */
export async function teleok(x, y, trapok) {
    if (!trapok) {
        /* C: allow vibrating square (not a real trap); pits and holes
         * if levitating or flying. Local trapok is by-value. */
        const trap = trap_at(x, y);
        if (!trap) {
            trapok = true;
        } else if ((trap.ttyp | 0) === VIBRATING_SQUARE) {
            trapok = true;
        } else if ((is_pit(trap.ttyp) || is_hole(trap.ttyp))
            && (Levitation() || Flying())) {
            trapok = true;
        }
        if (!trapok) return false;
    }
    const you = game.youmonst || null;
    if (!goodpos(x, y, you, 0)) return false;
    const u = game.u || {};
    if (!tele_jump_ok(u.ux, u.uy, x, y)) return false;
    if (!(await in_out_region(x, y))) return false;
    return true;
}

/**
 * C ref: teleport.c teleds — hero placement (vault_tele / ^T / scroll).
 * Envelope: TT_BURIEDBALL buried_ball_to_punishment before ball_active
 * (D-1132); Punished unplacebc/placebc (or drag_ball when in range);
 * set_ustuck(Null)+swallow docrt (D-1139); hideunder(&youmonst)+mimic
 * m_ap_type (D-1131); place + fill_pit(ux0,uy0) + update_player_regions
 * (D-1130) + vision; TELEDS_TELEPORT+verbose materialize;
 * dest-typ≠origin → switch_terrain (D-1129); vault_guard save/restore
 * + uleftvault (D-1140); spoteffects(TRUE); invocation_message (D-1141);
 * notice_mon_off around vision_recalc, notice_mon_on +
 * notice_all_mons(TRUE) after invocation (D-1142).
 * Named omissions: fill_pit still uses thin
 * extract+deltrap+delobj (C flooreffects("settle") named);
 * shop-enter plines beyond spoteffects subset;
 * hostile gd_move rloc/gd_letknow/wallify_vault (uleftvault calls
 * gd_move after mpeaceful=0; JS gd_move still early-returns hostile);
 * walk invocation_message is D-1150; mkmaze.c inv_pos is D-1154;
 * vision.c vision_recalc / goto_level / newgame / seffect_magic_mapping
 * / wizcmds / save / postmov notice_mon callers; spot_monsters option.
 *
 * Do NOT set u.urooms before spoteffects — C only temporarily fakes
 * urooms for vault_guard exit, then restores so move_update can detect
 * newly entered TEMPLE/shop rooms (D-0639 / D-1140).
 */
export async function teleds(nux, nuy, teleds_flags) {
    const u = game.u;
    if (!u) return;
    const is_teleport = ((teleds_flags | 0) & TELEDS_TELEPORT) !== 0;
    let allow_drag = ((teleds_flags | 0) & TELEDS_ALLOW_DRAG) !== 0;
    const ox = u.ux | 0;
    const oy = u.uy | 0;
    /* C: vault_guard = vault_occupied(u.urooms) ? findgd() : 0
     * captured at origin before buried-ball / move. Dynamic import:
     * vault.js → trap.js → teleport.js cycle. */
    const { vault_occupied, findgd, uleftvault } = await import('./vault.js');
    const vault_guard = vault_occupied(u.urooms) ? findgd() : null;
    /* C: if (u.utraptype == TT_BURIEDBALL) buried_ball_to_punishment()
     * before ball_active — unearth then Punished drag/unplace. */
    if ((u.utraptype | 0) === TT_BURIEDBALL) {
        const { buried_ball_to_punishment } = await import('./dig.js');
        await buried_ball_to_punishment();
    }
    // C: Punished ≡ (uball != 0); ball_active if ball not OBJ_FREE
    let ball_active = !!(u.uball && (u.uball.where | 0) !== OBJ_FREE);
    let ball_still_in_range = false;
    if (!ball_active
        || near_capacity() > SLT_ENCUMBER
        || distmin(ox, oy, nux | 0, nuy | 0) > 1) {
        allow_drag = false;
    }

    // C: if ball must move and !allow_drag → unplacebc; else maybe drag
    if (ball_active) {
        const uball = u.uball;
        const invent = game.invent || [];
        const ball_carried = invent.includes(uball);
        if (!ball_carried
            && distmin(nux | 0, nuy | 0, uball.ox | 0, uball.oy | 0) <= 2) {
            ball_still_in_range = true;
        } else if (!allow_drag) {
            unplacebc();
        }
    }

    // u.utrap clear (C reset_utrap(FALSE) — messages deferred)
    u.utrap = 0;
    u.utraptype = 0;
    /* C: was_swallowed = u.uswallow; set_ustuck(Null) clears uswallow.
     * Always release grab/swallow (not unstuck — that would u_on_newpos
     * to the engulfer and placebc early). Then ux0/uy0, hideunder. */
    const was_swallowed = !!(u.uswallow | 0);
    {
        const { set_ustuck } = await import('./mhitu.js');
        set_ustuck(null);
    }
    u.ux0 = ox;
    u.uy0 = oy;
    /* C: hideunder(&youmonst) after reset_utrap/set_ustuck, before
     * drag_ball. Mimics that fail to hide drop m_ap_type (not seemimic). */
    {
        const { hideunder } = await import('./mon.js');
        const you = game.youmonst;
        if (!hideunder(you) && you?.data?.mlet === 'S_MIMIC') {
            you.m_ap_type = M_AP_NOTHING;
        }
    }

    if (was_swallowed) {
        /* C: ball&chain are off map while swallowed — force placebc later,
         * skip drag. docrt after set_ustuck so uswallow is already 0
         * (dungeon map, not gulp). */
        if (u.uball) {
            ball_active = true;
            ball_still_in_range = false;
            allow_drag = false;
        }
        await docrt();
    }

    if (ball_active && (ball_still_in_range || allow_drag)) {
        const drag = await drag_ball(nux | 0, nuy | 0, allow_drag);
        if (drag.ok) {
            move_bc(0, drag.bc_control, drag.ballx, drag.bally,
                drag.chainx, drag.chainy);
        } else {
            // C: drag fail may clear Punished; re-check then unplacebc
            ball_active = !!(u.uball && (u.uball.where | 0) !== OBJ_FREE);
            if (ball_active) unplacebc();
        }
    }

    // C: u_on_newpos after drag_ball (needs old ux,uy when allow_drag)
    u.ux = nux | 0;
    u.uy = nuy | 0;
    if (u.usteed) {
        u.usteed.mx = u.ux;
        u.usteed.my = u.uy;
    }
    // C: fill_pit(u.ux0, u.uy0) after u_on_newpos (trap.c).
    // Dynamic import: dig.js → trap.js → teleport.js cycle.
    {
        const { fill_pit } = await import('./dig.js');
        fill_pit(u.ux0 | 0, u.uy0 | 0);
    }
    // C: placebc when chain was taken off map (OBJ_FREE)
    if (ball_active && u.uchain && (u.uchain.where | 0) === OBJ_FREE) {
        placebc();
    }
    /* C: update_player_regions after placebc, before newsym.
     * Absolute REG_HERO_INSIDE from dest — not in_out_region
     * (teleok already probed enter/leave; discarded teleok(TRUE)
     * trap backups can leave a stale bit). */
    update_player_regions();

    newsym(ox, oy);
    newsym(u.ux, u.uy);
    // C: see_monsters() before vision — refresh warns at new distu
    see_monsters();
    // C: vision_recalc(0) before materialize so --More-- shows new map
    game.vision_full_recalc = 1;
    nomul(0);
    /* C: notice_mon_off() before vision_recalc so vision.c's
     * notice_all_mons(TRUE) does not fire until after materialize /
     * switch_terrain / vault / spoteffects / invocation_message. */
    notice_mon_off();
    vision_recalc(0);
    if (!game.flags) game.flags = {};
    game.flags.botl = true;
    /* C: after vision so --More-- paints the destination map */
    if (is_teleport && game.flags.verbose !== false) {
        const same = (nux === u.ux0 && nuy === u.uy0);
        await pline(`You materialize in ${same ? 'the same' : 'a different'} location!`);
    }
    /* C: if terrain type changes, levitation or flying might become
       blocked or unblocked; after map+vision (and materialize) so any
       message paints the new location (hack.c switch_terrain). */
    {
        const destTyp = game.level?.at(u.ux | 0, u.uy | 0)?.typ;
        const origTyp = game.level?.at(u.ux0 | 0, u.uy0 | 0)?.typ;
        if ((destTyp | 0) !== (origTyp | 0)) {
            await switch_terrain();
        }
    }
    /* C: vault_guard alarm before room-entry; fake dest VAULT occupancy
     * then restore so spoteffects→move_update still sees origin urooms. */
    if (vault_guard) {
        const save_urooms = u.urooms || '';
        u.urooms = in_rooms(u.ux, u.uy, VAULT);
        if (!vault_occupied(u.urooms)) {
            await uleftvault(vault_guard);
        }
        u.urooms = save_urooms;
    }
    // C: spoteffects(TRUE) → move_update detects temple/shop entry
    const { spoteffects } = await import('./pickup.js');
    await spoteffects(true);
    /* C: invocation_message() after spoteffects (hack.c). Walk
     * caller is D-1150 (hack.c:2973 / cmd.js domove). */
    await invocation_message();
    /* C: notice_mon_on(); notice_all_mons(TRUE); catch-up after the
     * wrap. vision_recalc / mapping / wizcmds / save still named.
     * goto_level wrap D-1194; newgame wrap D-1200. */
    notice_mon_on();
    await notice_all_mons(true);
}

/**
 * C ref: teleport.c tele_to_rnd_pet — cursed magic whistle hero-near-pet.
 * Reservoir-sample a live on-map pet; if not adjacent, teleds to a
 * teleok cell in the 3×3 around it (TELEDS_TELEPORT).
 * Named omit: impossible() on no-teleport attempt.
 */
export async function tele_to_rnd_pet() {
    if (noteleport_level(game.youmonst)) return;
    let pet = null;
    let cnt = 0;
    for (const mtmp of game.fmon || []) {
        if (!mtmp || (mtmp.mhp | 0) <= 0) continue;
        if ((mtmp.mstate | 0) !== MON_FLOOR) continue; // mon_offmap
        if (!mtmp.mtame) continue;
        cnt++;
        if (!rn2(cnt)) pet = mtmp;
    }
    if (!pet) return;
    const u = game.u || {};
    const dx = (pet.mx | 0) - (u.ux | 0);
    const dy = (pet.my | 0) - (u.uy | 0);
    if (dx * dx + dy * dy <= 2) return; // m_next2u
    const tx = (pet.mx | 0) + rn2(3) - 1;
    const ty = (pet.my | 0) + rn2(3) - 1;
    if (isok(tx, ty) && await teleok(tx, ty, false)) {
        await teleds(tx, ty, TELEDS_TELEPORT);
    }
}

/**
 * C ref: read.c learnscrolltyp / learnscroll — makeknown + XP when new.
 * Local copy so teleport.js does not import read.js (cycle).
 */
function learnscroll(sobj) {
    if (!sobj || sobj.oclass === SPBOOK_CLASS) return;
    const otyp = sobj.otyp | 0;
    const oc = game.objects?.[otyp];
    if (!oc || oc.oc_name_known) return;
    makeknown(otyp);
    more_experienced(0, 10);
}

/**
 * C ref: teleport.c safe_teleds — random teleok spots then collect_coords.
 * Envelope: 40× rnd(COLNO-1)/rn2(ROWNO) + candy teleok(FALSE) with first
 * trap backup via teleok(TRUE).
 * @returns {Promise<boolean>}
 */
export async function safe_teleds(teleds_flags) {
    let nux; let nuy;
    for (let tcnt = 0; tcnt < 40; ++tcnt) {
        nux = rnd(COLNO - 1);
        nuy = rn2(ROWNO);
        if (await teleok(nux, nuy, false)) {
            await teleds(nux, nuy, teleds_flags);
            return true;
        }
    }

    let cc_flags = CC_RING_PAIRS | CC_SKIP_MONS;
    const Passes_walls = !!(game.u?.Passes_walls || game.u?.HPasses_walls
        || game.u?.EPasses_walls);
    if (!Passes_walls) cc_flags |= CC_SKIP_INACCS;
    const candy = [];
    const candycount = collect_coords(
        candy, game.u.ux | 0, game.u.uy | 0, 0, cc_flags, null,
    );
    const backupspot = { x: 0, y: 0 };
    for (let tcnt = 0; tcnt < candycount; ++tcnt) {
        nux = candy[tcnt].x;
        nuy = candy[tcnt].y;
        if (await teleok(nux, nuy, false)) {
            await teleds(nux, nuy, teleds_flags);
            return true;
        }
        if (!backupspot.x && trap_at(nux, nuy) && await teleok(nux, nuy, true)) {
            backupspot.x = nux;
            backupspot.y = nuy;
        }
    }
    if (backupspot.x) {
        await teleds(backupspot.x, backupspot.y, teleds_flags);
        return true;
    }
    return false;
}

/** C youprop.h Blinded — HBlinded && !BBlinded (not EBlinded/Blindfolded). */
function Blinded() {
    const u = game.u || {};
    return !!(u.HBlinded | 0) && !(u.BBlinded | 0);
}

/**
 * C ref: trap.c unconscious — multi < 0 and (usleep or wake-msg prefixes).
 * Local clone: trap.js imports this file (cycle). eat.js has the same body.
 */
function unconscious() {
    if ((game.multi || 0) >= 0) return false;
    const u = game.u || {};
    if (u.usleep) return true;
    const msg = game.nomovemsg || '';
    return msg.startsWith('You awake')
        || msg.startsWith('You regain con')
        || msg.startsWith('You are consci');
}

/**
 * C ref: teleport.c scrolltele — scroll/intrinsic teleport placement.
 * Envelope: noteleport pline; !Blinded make_blinded(0,FALSE);
 * amulet||On_W_tower_level !rn2(3) You_feel + wizard y_n Override;
 * unconscious() fail pline then fall through; wizard/Teleport_control
 * getpos path; steed whobuf "you" + optional " and " + mon_nam(usteed);
 * uncontrolled → learnscroll + safe_teleds.
 * Named omissions: dotele LEVEL_TELEP yn;
 * non-wizard energy/spellcast. dotele trap-at-feet teledest D-1208.
 * dotelecmd m-prefix D-1209. dotele clears travelcc before tele when
 * not trap-once/teledest (D-0789); scrolltele clears when controlled
 * dest equals travelcc.
 */
export async function scrolltele(scroll) {
    const flags = game.flags || {};
    const wizard = !!(flags.debug || flags.wizard);
    if (noteleport_level(game.youmonst) && !wizard) {
        await pline('A mysterious force prevents you from teleporting!');
        if (scroll) learnscroll(scroll);
        return;
    }
    /* C teleport.c:861–863 — don't show trap if "Sorry..."; skip when
     * Blinded so timeout/FROMFORM blindness is not cured. Dynamic import:
     * do.js → enexto cycle. */
    if (!Blinded()) {
        const { make_blinded } = await import('./do.js');
        await make_blinded(0, false);
    }
    const u = game.u || {};
    /* C teleport.c:865–870 — amulet or Wizard's Tower, then 1/3.
     * y_n ≡ yn_function(query, ynchars, 'n', TRUE); JS 3-arg yn.
     * !wizard short-circuits so Override is wizard-only. */
    if ((u.uhave?.amulet || u.uhave_amulet || On_W_tower_level(u.uz))
        && !rn2(3)) {
        await You_feel('disoriented for a moment.');
        /* don't discover the scroll [not yet for wizard override] */
        if (!wizard
            || (await yn_function('Override?', 'yn', 'n')) !== 'y') {
            return;
        }
    }
    const Teleport_control = !!(u.HTeleport_control || u.ETeleport_control
        || u.Teleport_control);
    const Stunned = !!(u.Stunned || u.HStun || u.EStun);
    if (((Teleport_control || (scroll && scroll.blessed)) && !Stunned)
        || wizard) {
        /* C teleport.c:874–876 — trap.c unconscious; skip getpos, then
         * fall through to learnscroll + safe_teleds. */
        if (unconscious()) {
            await pline('Being unconscious, you cannot control your teleport.');
        } else {
            /* C teleport.c:877–882 — whobuf "you" then eos " and %s"
             * mon_nam(usteed). Not y_monnam ("your pony"). */
            let whobuf = 'you';
            if (u.usteed) {
                whobuf += ` and ${mon_nam(u.usteed)}`;
            }
            await pline(`Where do ${whobuf} want to be teleported?`);
            if (scroll) learnscroll(scroll);
            const cc = { x: u.ux | 0, y: u.uy | 0 };
            const travel = game.iflags?.travelcc;
            if (travel && isok(travel.x, travel.y)) {
                cc.x = travel.x | 0;
                cc.y = travel.y | 0;
            }
            const { getpos } = await import('./getpos.js');
            if ((await getpos(cc, true, 'the desired position')) < 0) return;
            if (await teleok(cc.x, cc.y, false)) {
                await teleds(cc.x, cc.y, TELEDS_TELEPORT);
                // C: if (u_at(travelcc)) clear travelcc
                const tcc = game.iflags?.travelcc;
                if (tcc && (u.ux | 0) === (tcc.x | 0) && (u.uy | 0) === (tcc.y | 0)) {
                    tcc.x = 0;
                    tcc.y = 0;
                }
                return;
            }
            await pline('Sorry...');
        }
    }

    if (scroll) learnscroll(scroll);
    await safe_teleds(TELEDS_TELEPORT);
}

/**
 * C ref: teleport.c tele — non-scroll teleport via scrolltele(NULL).
 */
export async function tele() {
    await scrolltele(null);
}

/**
 * C ref: teleport.c u_teleport_mon — hero teleports a monster.
 * Envelope: stasis; temple priest resist; rloc / rider-control enexto.
 * Named omit: engulfing_u unstuck + limbo; shop bill polish.
 * @returns {Promise<boolean>} true if relocated
 */
export async function u_teleport_mon(mtmp, give_feedback) {
    if (!mtmp) return false;
    const moves = game.moves | 0;
    if ((game.level?.flags?.stasis_until | 0) >= moves) {
        if (give_feedback) {
            await pline(
                `A mysterious force prevents you teleporting ${mon_nam(mtmp)}!`,
            );
        }
        return false;
    }
    if (mtmp.ispriest && in_rooms(mtmp.mx | 0, mtmp.my | 0, TEMPLE)) {
        if (give_feedback) {
            await pline(`${Monnam(mtmp)} resists your magic!`);
        }
        return false;
    }
    // engulfing_u + noteleport limbo deferred
    void engulfing_u;
    if ((is_rider(mtmp.data) || control_teleport(mtmp.data))
        && rn2(13)) {
        const cc = { x: 0, y: 0 };
        const u = game.u || {};
        if (enexto(cc, u.ux | 0, u.uy | 0, mtmp.data)) {
            await rloc_to(mtmp, cc.x, cc.y);
            return true;
        }
    }
    return !!(await rloc(mtmp, RLOC_MSG));
}

/**
 * C ref: teleport.c rloco — relocate a floor object.
 * Envelope: extract + goodpos pick + place_object. Named omit:
 * Rider corpse revive; flooreffects; shop bill/stolen_value; W-tower
 * /dndest restricted_fall.
 * @returns {boolean} true if placed elsewhere
 */
export function rloco(obj) {
    if (!obj) return false;
    const otx = obj.ox | 0;
    const oty = obj.oy | 0;
    obj_extract_self(obj);
    let tx = 0;
    let ty = 0;
    let try_limit = 4000;
    do {
        tx = rn1(COLNO - 3, 2);
        ty = rn2(ROWNO);
        if (!--try_limit) break;
    } while (!goodpos(tx, ty, null, 0));
    // flooreffects / shop bill deferred
    place_object(obj, tx, ty);
    if (otx || oty) newsym(otx, oty);
    newsym(tx, ty);
    return true;
}

/**
 * C ref: hack.c u_locomotion — Levitation/Flying verbs.
 * Named omit: poly locomotion(youmonst.data, def).
 */
function u_locomotion(defWord) {
    if (Levitation()) return 'float';
    if (Flying()) return 'fly';
    return defWord;
}

/**
 * C ref: teleport.c dotele — #teleport / ^T body.
 * Envelope: t_at + !tseen ignore; TELEP_TRAP jump pline; trap_once
 * vault yn/deltrap then vault_tele(); isok(teledest) teleds (no
 * displace/settrack — unlike tele_trap D-1133); else travelcc=0 +
 * tele(); next_to_u leash; !trap morehungry(100) (D-1208).
 * Named omissions: LEVEL_TELEP yn + level_tele_trap FORCETRAP;
 * energy/spellcast (hunger/STR/uen/capacity/spelleffects) — keep
 * Teleportation fail-closed when !trap && !break_the_rules;
 * poly locomotion(). dotelecmd m-prefix D-1209.
 */
export async function dotele(break_the_rules) {
    const u = game.u || {};
    const { t_at, deltrap } = await import('./trap.js');
    let trap = t_at(u.ux | 0, u.uy | 0);
    if (trap && !trap.tseen) trap = null;
    let trap_once = false;

    if (trap) {
        const ttyp = trap.ttyp | 0;
        if (ttyp === LEVEL_TELEP && trap.tseen) {
            /* C: y_n("There is a level teleporter here. Trigger it?")
             * then level_tele_trap(FORCETRAP) or trap=0. Deferred —
             * treat as declined so we do not teleds a LEVEL_TELEP. */
            trap = null;
        } else if (ttyp === TELEP_TRAP) {
            trap_once = !!trap.once;
            if (trap.once) {
                await pline('This is a vault teleport, usable once only.');
                if ((await yn_function('Jump in?', 'yn', 'n')) === 'n') {
                    trap = null;
                } else {
                    deltrap(trap);
                    newsym(u.ux | 0, u.uy | 0);
                    /* C keeps the (now-deleted) trap pointer as truthy. */
                }
            }
            if (trap) {
                await pline(
                    `You ${u_locomotion('jump')} onto the teleportation trap.`,
                );
            }
        } else {
            trap = null;
        }
    }

    if (!trap && !break_the_rules) {
        /* energy / spellcast gate deferred — Teleportation fail-closed */
        const Teleportation = !!(u.HTeleportation || u.ETeleportation
            || u.Teleportation);
        if (!Teleportation) {
            await pline('You are not able to teleport at will.');
            return false;
        }
    }
    /* C: next_to_u leash gate before vault_tele / teleds / tele (D-1005) */
    {
        const { next_to_u } = await import('./apply.js');
        if (!(await next_to_u())) {
            await pline('You shudder for a moment.');
            return false;
        }
    }
    if (trap && trap_once) {
        await vault_tele();
    } else if (trap && isok(trap.teledest?.x, trap.teledest?.y)) {
        /* C: teleds only — no tele_trap settrack/displace. */
        await teleds(trap.teledest.x | 0, trap.teledest.y | 0, TELEDS_TELEPORT);
    } else {
        /* C: iflags.travelcc.x = iflags.travelcc.y = 0 before tele()
         * so scrolltele getpos starts at hero, not a stale '_' dest.
         * Not cleared on trap_once / teledest arms. */
        if (!game.iflags) game.iflags = {};
        if (!game.iflags.travelcc) game.iflags.travelcc = { x: 0, y: 0 };
        game.iflags.travelcc.x = 0;
        game.iflags.travelcc.y = 0;
        await tele();
    }
    {
        const { next_to_u } = await import('./apply.js');
        await next_to_u(); // C: (void) next_to_u() after
    }
    if (!trap) {
        const { morehungry } = await import('./eat.js');
        morehungry(100);
    }
    return true;
}

/**
 * C ref: teleport.c dotelecmd PICK_ONE tports[] — n/s/t/w, w preselected.
 * tty selected paints '*' at the '-' slot. space/return with preselected
 * still on (or toggled off) → 'w'; ESC → null; letter → that mode.
 * @returns {Promise<string|null>}
 */
async function dotelecmd_mode_menu() {
    const tports = [
        { menulet: 'n', menudesc: 'normal ^T on demand; no spell, obey restrictions' },
        { menulet: 's', menudesc: 'via spellcast; no intrinsic teleport' },
        { menulet: 't', menudesc: 'try ^T without having it; no spell' },
        { menulet: 'w', menudesc: 'debug mode; ignore restrictions' },
    ];
    const body = tports.map((it) => {
        const mark = it.menulet === 'w' ? '*' : '-';
        return { text: `${it.menulet} ${mark} ${it.menudesc}`, attr: 0 };
    });
    const entries = [
        { text: 'Which way do you want to teleport?', attr: ATR_INVERSE },
        { text: '', attr: 0 },
        ...body,
    ];
    for (;;) {
        await paint_corner_nhw_menu(entries, '(end) ');
        const key = await nhgetch();
        game._menu_overlay = false;
        await docrt();
        await flush_screen(1);
        if (key === 27) return null;
        const ch = String.fromCharCode(key);
        if (ch === ' ' || key === 13 || key === 10) return 'w';
        if (ch === 'n' || ch === 's' || ch === 't' || ch === 'w') return ch;
    }
}

/**
 * C ref: teleport.c dotelecmd — ^T / #teleport command.
 * Envelope: non-wizard dotele(FALSE) (ignore m-prefix); wizard save H/E
 * Teleportation; !menu_requested → ignore_restrictions; else PICK_ONE
 * n/s/t/w then tport_spell hide/add; dotele; restore H/E and reverse
 * tport_spell (D-1209). Snapshot-then-clear menu_requested (JS split
 * rhack has no next-entry reset).
 * Named omissions: dotele LEVEL_TELEP yn; energy/spellcast (s-mode
 * still fail-closed in dotele); #teleport doextcmd wire.
 */
export async function dotelecmd() {
    const flags = game.flags || {};
    const wizard = !!(flags.debug || flags.wizard);
    const menu_requested = !!(game.iflags?.menu_requested);
    if (game.iflags) game.iflags.menu_requested = false;

    if (!wizard) {
        return (await dotele(false)) ? 1 : 0; // ECMD_TIME : ECMD_OK
    }

    /* also defined in spell.c tport_spell */
    const NOOP_SPELL = 0;
    const HIDE_SPELL = 1;
    const ADD_SPELL = 2;
    let added = NOOP_SPELL;
    let hidden = NOOP_SPELL;
    const u = game.u || (game.u = {});
    const save_HTele = u.HTeleportation | 0;
    const save_ETele = u.ETeleportation | 0;
    let ignore_restrictions = false;
    let tport_spell = null;

    if (!menu_requested) {
        ignore_restrictions = true;
    } else {
        const tmode = await dotelecmd_mode_menu();
        if (tmode == null) return 0; // ESC → ECMD_OK
        tport_spell = (await import('./spell.js')).tport_spell;
        switch (tmode) {
        case 'n':
            u.HTeleportation = (u.HTeleportation | 0) | I_SPECIAL;
            hidden = await tport_spell(HIDE_SPELL);
            break;
        case 's':
            u.HTeleportation = 0;
            u.ETeleportation = 0;
            added = await tport_spell(ADD_SPELL);
            break;
        case 't':
            u.HTeleportation = 0;
            u.ETeleportation = 0;
            hidden = await tport_spell(HIDE_SPELL);
            break;
        case 'w':
            ignore_restrictions = true;
            break;
        }
    }

    const res = await dotele(ignore_restrictions);
    u.HTeleportation = save_HTele;
    u.ETeleportation = save_ETele;
    if (tport_spell && (added !== NOOP_SPELL || hidden !== NOOP_SPELL)) {
        await tport_spell(added + hidden - NOOP_SPELL);
    }
    return res ? 1 : 0;
}

/** C ref: dungeon.c single_level_branch — Is_knox only (Ludios). */
function single_level_branch(lev) {
    return Is_knox_level(lev);
}

/** C ref: dungeon.c dunlevs_in_dungeon. */
function dunlevs_in_dungeon(lev) {
    return game.dungeons?.[lev?.dnum]?.num_dunlevs ?? 1;
}

/** C ref: dungeon.h Inhell — hellish dungeon flag. */
function Inhell() {
    return !!(game.dungeons?.[game.u?.uz?.dnum]?.flags?.hellish);
}

/**
 * C ref: teleport.c random_teleport_level — absolute depth for random
 * levelport. Ported: rn2(5)/single_level/endgame stay; quest locate
 * clamp; Gehennom !invoked max-1; rn2 range + botlevel/min rnd polish.
 */
export function random_teleport_level() {
    const u = game.u || {};
    const uz = u.uz || { dnum: 0, dlevel: 1 };
    const cur_depth = depth(uz) | 0;

    // C: !rn2(5) || single_level_branch || In_endgame → stay
    if (!rn2(5) || single_level_branch(uz) || In_endgame(uz)) {
        return cur_depth;
    }

    let min_depth;
    let max_depth;
    if (In_quest(uz)) {
        let bottom = dunlevs_in_dungeon(uz);
        const qlocate_depth = game.qlocate_level?.dlevel;
        const reached = game.dungeons?.[uz.dnum]?.dunlev_ureached ?? 0;
        if (qlocate_depth != null && reached < qlocate_depth) {
            bottom = qlocate_depth;
        }
        min_depth = (game.dungeons?.[uz.dnum]?.depth_start | 0) || 1;
        max_depth = bottom + (((game.dungeons?.[uz.dnum]?.depth_start | 0) || 1) - 1);
    } else {
        min_depth = 1;
        max_depth = dunlevs_in_dungeon(uz)
            + (((game.dungeons?.[uz.dnum]?.depth_start | 0) || 1) - 1);
        if (Inhell() && !u.uevent?.invoked) max_depth -= 1;
    }

    // Range is 1 to current+3, current not counting
    let nlev = rn2(cur_depth + 3 - min_depth) + min_depth;
    if (nlev >= cur_depth) nlev++;

    if (nlev > max_depth) {
        nlev = max_depth;
        if (Is_botlevel(uz)) nlev -= rnd(3);
    }
    if (nlev < min_depth) {
        nlev = min_depth;
        if (nlev === cur_depth) {
            nlev += rnd(3);
            if (nlev > max_depth) nlev = max_depth;
        }
    }
    return nlev;
}

/**
 * C ref: teleport.c level_tele — controlled/wizard dungeon-level port.
 *
 * Ported: wizard/Teleport_control getlin numeric path → get_level →
 * schedule_goto (deferred_goto after rhack); wizard `?` /
 * menu_requested → print_dungeon(TRUE) force_dest; endgame dest
 * AMULET_OF_YENDOR grant via mksobj+addinv (D-0549); In_endgame
 * wizard negative dest → dlevel = dunlevs + newlev (D-0560);
 * Confusion/`*` / involuntary → random_teleport_level (D-0575);
 * past-main-dungeon → find_hell (D-0904). Named omissions:
 * lev_by_name; bymenu=FALSE print_dungeon; heaven/escape outside
 * endgame; Quest/mines/sanctum deepest clamp + invoked gate;
 * Nowhere suicide yn; buried ball; debug_fuzzer.
 */
export async function level_tele() {
    const u = game.u || {};
    const flags = game.flags || {};
    const wizard = !!(flags.debug || flags.wizard);
    const Teleport_control = !!(u.HTeleport_control || u.ETeleport_control
        || u.Teleport_control);
    const Stunned = !!(u.Stunned || u.HStun || u.EStun);

    if (((u.uhave?.amulet || u.uhave_amulet) || In_endgame(u.uz) || In_sokoban(u.uz))
        && !wizard) {
        await You_feel('very disoriented for a moment.');
        return;
    }

    let newlev = 0;
    const newlevel = { dnum: 0, dlevel: 0 };
    let force_dest = false;
    let use_random = false;

    if ((Teleport_control && !Stunned) || wizard) {
        let qbuf = 'To what level do you want to teleport?';
        let trycnt = 0;
        let buf = '';
        let menuNow = false;
        do {
            if (game.iflags?.menu_requested) {
                game.iflags.menu_requested = false;
                if (wizard) menuNow = true;
            }
            if (menuNow || (wizard && buf === '?')) {
                // C levTport_menu: print_dungeon(TRUE) → force_dest
                const { print_dungeon } = await import('./dungeon.js');
                const dest = { lev: 0, dgn: 0 };
                newlev = await print_dungeon(true, dest);
                if (!newlev) return;
                newlevel.dnum = dest.dgn | 0;
                newlevel.dlevel = dest.lev | 0;
                // C: In_endgame(&newlevel) && !In_endgame(&u.uz) →
                // mksobj(AMULET_OF_YENDOR) + addinv + prinv
                if (In_endgame(newlevel) && !In_endgame(u.uz)) {
                    if (!(u.uhave?.amulet || u.uhave_amulet)) {
                        const amu = mksobj(AMULET_OF_YENDOR, true, false);
                        if (amu) {
                            const held = await addinv(amu);
                            if (!u.uhave) u.uhave = {};
                            u.uhave.amulet = 1;
                            u.uhave_amulet = 1;
                            await prinv('Endgame prerequisite:', held, 0);
                        }
                    }
                }
                force_dest = true;
                break;
            }
            if (++trycnt === 2) {
                qbuf += wizard
                    ? ' [type a number, name, or ? for a menu]'
                    : ' [type a number or name]';
            }
            buf = await getlin(qbuf);
            if (buf == null) buf = '';
            if (buf === '*') {
                // C: goto random_levtport
                use_random = true;
                break;
            }
            // C: Confusion && rnl(5) → Oops → random_levtport
            if ((u.HConfusion || u.Confusion) && rnl(5)) {
                await pline('Oops...');
                use_random = true;
                break;
            }
            if (buf === '\x1b') return;
            if (wizard && buf === '?') {
                // loop → print_dungeon on next iteration
                continue;
            }
            // lev_by_name deferred → atoi only
            const trimmed = String(buf).trim();
            if (/^-?\d+$/.test(trimmed)) {
                newlev = parseInt(trimmed, 10) | 0;
            } else {
                newlev = 0;
            }
        } while (
            !use_random
            && !newlev
            && !(buf.length && buf[0] >= '0' && buf[0] <= '9')
            && !(buf[0] === '-' && buf.length > 1 && buf[1] >= '0' && buf[1] <= '9')
            && trycnt < 10
        );

        if (!use_random && !force_dest) {
            if (newlev === 0) {
                if (trycnt >= 10) {
                    // C: goto random_levtport
                    use_random = true;
                } else {
                    // Nowhere suicide yn deferred — cancel
                    return;
                }
            } else if (single_level_branch(u.uz) && newlev > 0) {
                await pline('You shudder for a moment.');
                return;
            } else if (In_quest(u.uz) && newlev > 0) {
                // Quest Home-N status → logical depth
                const dun = game.dungeons?.[u.uz.dnum | 0];
                newlev = newlev + ((dun?.depth_start | 0) || 1) - 1;
            }
        }
    } else {
        // involuntary level tele
        use_random = true;
    }

    // C random_levtport:
    if (use_random) {
        newlev = random_teleport_level();
        if (newlev === depth(u.uz)) {
            await pline('You shudder for a moment.');
            return;
        }
        force_dest = false;
    }

    // C: next_to_u leash gate (D-1005)
    {
        const { next_to_u } = await import('./apply.js');
        if (!(await next_to_u()) && !force_dest) {
            await pline('You shudder for a moment.');
            return;
        }
    }

    // C: In_endgame — wizard relative planes: dlevel = llimit + newlev
    // (newlev in (-llimit, 0)); no materialize post_msg.
    if (In_endgame(u.uz)) {
        const llimit = (game.dungeons?.[u.uz.dnum | 0]?.num_dunlevs | 0) || 1;
        if (newlev >= 0 || newlev <= -llimit) {
            await pline("You can't get there from here.");
            return;
        }
        newlevel.dnum = u.uz.dnum | 0;
        newlevel.dlevel = llimit + newlev;
        const { schedule_goto } = await import('./do.js');
        schedule_goto(newlevel, UTOTYPE_NONE, null, null);
        return;
    }

    if (newlev < 0 && !force_dest) {
        // heaven / escape deferred
        await pline('You shudder for a moment.');
        return;
    }

    if (!force_dest) {
        // C: medusa's dungeon (main) && newlev past last main depth
        // → find_hell (valley); else get_level (+ deepest clamps deferred)
        const medusa = game.medusa_level;
        const dun = game.dungeons?.[u.uz?.dnum | 0];
        const pastMain = medusa
            && (u.uz?.dnum | 0) === (medusa.dnum | 0)
            && newlev >= ((dun?.depth_start | 0) + dunlevs_in_dungeon(u.uz));
        if (pastMain) {
            find_hell(newlevel);
        } else {
            get_level(newlevel, newlev);
            if ((newlevel.dnum | 0) === (u.uz?.dnum | 0)
                && (newlevel.dlevel | 0) === (u.uz?.dlevel | 0)
                && newlev !== depth(u.uz)) {
                await pline("You can't get there from here.");
                return;
            }
        }
    }

    // Dynamic import avoids do.js ↔ teleport.js cycle (do imports enexto).
    const { schedule_goto } = await import('./do.js');
    schedule_goto(
        newlevel,
        UTOTYPE_NONE,
        null,
        flags.verbose ? 'You materialize on a different level!' : null,
    );
}

/**
 * C ref: teleport.c domagicportal — hero MAGIC_PORTAL.
 * Envelope: buried-ball punish; !next_to_u shudder; same-turn
 * landing (uz!=uz0) no-op; "You activated a magic portal!";
 * endgame without amulet dizzy-return; tutorial leave
 * UTOTYPE_ATSTAIRS + "Resuming regular play."; else PORTAL +
 * stunmsg + make_stunned((HStun&TIMEOUT)+3, FALSE).
 * Named omissions: level_tele_trap; UTOTYPE_RMPORTAL deltrap.
 */
export async function domagicportal(ttmp) {
    const u = game.u;
    if (!u) return;

    if (u.utrap && (u.utraptype | 0) === TT_BURIEDBALL) {
        const { buried_ball_to_punishment } = await import('./dig.js');
        await buried_ball_to_punishment();
    }

    const { next_to_u } = await import('./apply.js');
    if (!(await next_to_u())) {
        await pline('You shudder for a moment.');
        return;
    }

    /* if landed from another portal, do nothing */
    /* problem: level teleport landing escapes the check */
    if (!on_level(u.uz, u.uz0)) return;

    await pline('You activated a magic portal!');

    /* prevent the poor shnook, whose amulet was stolen while in
     * the endgame, from accidently triggering the portal to the
     * next level, and thus losing the game
     */
    if (In_endgame(u.uz) && !(u.uhave?.amulet || u.uhave_amulet)) {
        await You_feel('dizzy for a moment, but nothing happens...');
        return;
    }

    const target_level = {
        dnum: ttmp?.dst?.dnum | 0,
        dlevel: ttmp?.dst?.dlevel | 0,
    };

    let totype;
    let stunmsg;
    /* coming back from tutorial doesn't trigger stunning */
    if (In_tutorial(u.uz) && !In_tutorial(target_level)) {
        /* returning to normal play => arrive on level 1 stairs */
        totype = UTOTYPE_ATSTAIRS;
        stunmsg = 'Resuming regular play.';
    } else {
        totype = UTOTYPE_PORTAL;
        // C: Stunned ≡ HStun (youprop.h)
        stunmsg = !(u.HStun | 0)
            ? 'You feel slightly dizzy.'
            : 'You feel dizzier.';
        const { make_stunned } = await import('./potion.js');
        await make_stunned(((u.HStun | 0) & TIMEOUT) + 3, false);
    }

    const { schedule_goto } = await import('./do.js');
    schedule_goto(target_level, totype, stunmsg, null);
}

/**
 * C ref: teleport.c vault_tele — somexyspace into VAULT then teleds;
 * else tele() (D-1153). dotele trap_once calls this (D-1208).
 */
export async function vault_tele() {
    const croom = search_special(VAULT);
    const c = { x: 0, y: 0 };
    if (croom && somexyspace(croom, c) && await teleok(c.x, c.y, false)) {
        await teleds(c.x, c.y, TELEDS_TELEPORT);
        return;
    }
    await tele();
}

/**
 * C ref: teleport.c tele_trap — hero TELEP_TRAP.
 * Envelope: In_endgame / Antimagic / noteleport_level wrenching +
 * Antimagic shieldeff (D-1120); !next_to_u sibling shudder (D-1005);
 * once → deltrap + vault_tele; isok(teledest) settrack + displace via
 * enexto/rloc_to then teleds, else tele() (D-1133).
 * vault_tele no-vault/space → tele() (D-1153).
 * dotele trap-at-feet teledest is teleds without displace (D-1208).
 */
export async function tele_trap(trap) {
    /* a fixed-destination teleport trap could theoretically place hero onto a
     * second teleport trap; prevent the recursive call from spoteffects() from
     * triggering the trap at the destination */
    if (in_tele_trap) return;
    in_tele_trap = true;
    try {
        const u = game.u;
        if (!u) return;
        if (In_endgame(u.uz) || Antimagic() || noteleport_level(game.youmonst)) {
            if (Antimagic()) await shieldeff(u.ux, u.uy);
            await You_feel('a wrenching sensation.');
        } else {
            const { next_to_u } = await import('./apply.js');
            if (!(await next_to_u())) {
                await pline('You shudder for a moment.');
            } else if (trap?.once) {
                const { deltrap } = await import('./trap.js');
                deltrap(trap);
                newsym(u.ux, u.uy); /* get rid of trap symbol */
                await vault_tele();
            } else if (isok(trap?.teledest?.x, trap?.teledest?.y)) {
                const dx = trap.teledest.x | 0;
                const dy = trap.teledest.y | 0;
                let mtmp = m_at(dx, dy);
                const { settrack } = await import('./track.js');
                settrack();
                if (mtmp) {
                    const cc = { x: 0, y: 0 };
                    if (!enexto(cc, mtmp.mx | 0, mtmp.my | 0, mtmp.data)) {
                        /* could not find some other place to put mtmp; the level must
                         * be nearly or completely full */
                        await pline('You shudder for a moment.');
                    } else {
                        await rloc_to(mtmp, cc.x, cc.y);
                        mtmp = null; /* no longer a monster at dest */
                    }
                }
                if (!mtmp) {
                    await teleds(dx, dy, TELEDS_TELEPORT);
                }
            } else {
                await tele();
            }
        }
    } finally {
        in_tele_trap = false;
    }
}

/**
 * C ref: teleport.c teleport_pet — steed/cursed-leash gate before migrate.
 */
export async function teleport_pet(mtmp, force_it) {
    if (!mtmp) return false;
    if (mtmp === game.u?.usteed) return false;
    if (mtmp.mleashed) {
        const { get_mleash, m_unleash } = await import('./apply.js');
        const otmp = get_mleash(mtmp);
        if (!otmp) {
            // C: impossible — treat as free
            mtmp.mleashed = 0;
            return true;
        }
        if (otmp.cursed && !force_it) {
            const { yelp } = await import('./sounds.js');
            await yelp(mtmp);
            return false;
        }
        await m_unleash(mtmp, false);
    }
    return true;
}

function ledger_no(lev) {
    const dnum = lev?.dnum | 0;
    const dlevel = lev?.dlevel | 0;
    const dun = game.dungeons?.[dnum];
    return ((dun?.ledger_start | 0) + dlevel) | 0;
}

function ledger_to_dnum(tolev) {
    const duns = game.dungeons || [];
    for (let i = 0; i < duns.length; i++) {
        const d = duns[i];
        if (!d) continue;
        const start = d.ledger_start | 0;
        const n = d.num_dunlevs | 0;
        if (tolev >= start && tolev < start + n) return i;
    }
    return 0;
}

function ledger_to_dlev(tolev) {
    const dnum = ledger_to_dnum(tolev);
    const start = game.dungeons?.[dnum]?.ledger_start | 0;
    return (tolev - start) | 0;
}

/**
 * C ref: dog.c migrate_to_level — take mon off map onto migrating_mons.
 * Envelope: remove from fmon, encode destination, mx=my=0.
 * D-1198: xyflags bit 2 when In_W_tower(mx,my,&u.uz) using pre-relmon
 * coords (C dog.c:913–915). Arrival copies flags into my (D-1199).
 * Named omissions: mon_leave worm/isshk residency; leash; light sources.
 */
export function migrate_to_level(mtmp, tolev, xyloc, cc) {
    if (!mtmp) return;
    const mx = mtmp.mx | 0;
    const my = mtmp.my | 0;

    const list = game.fmon || [];
    const idx = list.indexOf(mtmp);
    if (idx >= 0) list.splice(idx, 1);

    if (!game.migrating_mons) game.migrating_mons = [];
    mtmp.nmon = game.migrating_mons[0] || null;
    game.migrating_mons.unshift(mtmp);
    mtmp.mstate = (mtmp.mstate | 0) | MON_MIGRATING;

    const new_lev = {
        dnum: ledger_to_dnum(tolev),
        dlevel: ledger_to_dlev(tolev),
    };
    // Destination encoding (mtrack / mux/muy overload) — matches C fields
    let xyflags = 0;
    const u = game.u;
    if (u?.uz) {
        const depthNew = (game.dungeons?.[new_lev.dnum]?.depth_start | 0)
            + new_lev.dlevel - 1;
        const depthOld = (game.dungeons?.[u.uz.dnum]?.depth_start | 0)
            + (u.uz.dlevel | 0) - 1;
        if (depthNew < depthOld) xyflags = 1;
        /* C dog.c:914–915 — bit 1 (value 2) = left from inside the
         * Wizard's Tower. In_W_tower tests current u.uz, not dest.
         * Arrival rloc_pos_ok reads this as my&2 after mon_arrive. */
        if (In_W_tower(mx, my, u.uz))
            xyflags |= 2;
    }
    if (!mtmp.mtrack) {
        mtmp.mtrack = [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }];
    }
    mtmp.mtrack[2] = { x: u?.uz?.dnum | 0, y: u?.uz?.dlevel | 0 };
    mtmp.mtrack[1] = { x: cc ? cc.x : mx, y: cc ? cc.y : my };
    mtmp.mtrack[0] = { x: xyloc | 0, y: xyflags };
    mtmp.mux = new_lev.dnum;
    mtmp.muy = new_lev.dlevel;
    mtmp.mlstmv = game.moves | 0;
    mtmp.mx = 0;
    mtmp.my = 0;
}

/**
 * C ref: trap.c seetrap — mark tseen + newsym.
 * Local copy avoids trap.js ↔ teleport cycle.
 */
function seetrap(trap) {
    if (trap && !trap.tseen) {
        trap.tseen = true;
        newsym(trap.tx, trap.ty);
    }
}

/**
 * C ref: wizard.c mon_has_amulet — minvent holds AMULET_OF_YENDOR.
 * Local copy avoids apply.js ↔ teleport cycle.
 */
function mon_has_amulet(mtmp) {
    if (!mtmp || AMULET_OF_YENDOR < 0) return 0;
    for (let otmp = mtmp.minvent; otmp; otmp = otmp.nobj) {
        if ((otmp.otyp | 0) === AMULET_OF_YENDOR) return 1;
    }
    return 0;
}

/**
 * C ref: makemon.c is_home_elemental — S_ELEMENTAL on matching plane.
 * Local copy avoids makemon.js ↔ teleport cycle.
 */
function is_home_elemental(ptr) {
    if (ptr?.mlet !== 'S_ELEMENTAL') return false;
    switch (ptr.mndx ?? -1) {
    case PM_AIR_ELEMENTAL:
        return Is_airlevel(game.u?.uz);
    case PM_FIRE_ELEMENTAL:
        return Is_firelevel(game.u?.uz);
    case PM_EARTH_ELEMENTAL:
        return Is_earthlevel(game.u?.uz);
    case PM_WATER_ELEMENTAL:
        return Is_waterlevel(game.u?.uz);
    default:
        return false;
    }
}

/**
 * C ref: teleport.c mlevel_tele_trap — monster hole/trapdoor/portal/levelport.
 * Envelope: HOLE/TRAPDOOR dest (D-0250); MAGIC_PORTAL dst+MIGR_PORTAL
 * (D-0782) with endgame amulet/home-elemental/rn2(7) stay; LEVEL_TELEP
 * random_teleport_level+get_level; NO_TRAP same-level migrate unless
 * amulet/endgame/onscary(0,0). Named omissions: valley_level stronghold
 * dest; botlevel hole avoid pline; hero level_tele_trap.
 */
export async function mlevel_tele_trap(mtmp, trap, force_it, in_sight) {
    const tt = trap ? (trap.ttyp | 0) : NO_TRAP;
    if (mtmp === game.u?.ustuck) return Trap_Effect_Finished;
    if (!(await teleport_pet(mtmp, force_it))) return Trap_Effect_Finished;

    const tolevel = { dnum: 0, dlevel: 1 };
    let migrate_typ = MIGR_RANDOM;

    if (is_hole(tt)) {
        if (Is_stronghold(game.u?.uz)) {
            // valley_level — named omission; treat as bot avoid if unset
            const v = game.valley_level;
            if (v) {
                tolevel.dnum = v.dnum | 0;
                tolevel.dlevel = v.dlevel | 0;
            } else {
                return Trap_Effect_Finished;
            }
        } else if (Is_botlevel(game.u?.uz)) {
            return Trap_Effect_Finished;
        } else {
            const dst = trap.dst || {};
            tolevel.dnum = dst.dnum | 0;
            tolevel.dlevel = dst.dlevel | 0;
            // clamp_hole_destination: min(dlevel, dng_bottom)
            const dun = game.dungeons?.[tolevel.dnum];
            let bottom = dun?.num_dunlevs | 0;
            if (bottom > 0 && tolevel.dlevel > bottom) tolevel.dlevel = bottom;
        }
    } else if (tt === MAGIC_PORTAL) {
        // C: In_endgame && (amulet || home-elemental || rn2(7)) stay
        if (In_endgame(game.u?.uz)
            && (mon_has_amulet(mtmp)
                || is_home_elemental(mtmp.data)
                || rn2(7))) {
            if (in_sight && mtmp.data?.mlet !== 'S_ELEMENTAL') {
                await pline(`${Monnam(mtmp)} seems to shimmer for a moment.`);
                seetrap(trap);
            }
            return Trap_Effect_Finished;
        }
        const dst = trap.dst || {};
        tolevel.dnum = dst.dnum | 0;
        tolevel.dlevel = dst.dlevel | 0;
        migrate_typ = MIGR_PORTAL;
    } else if (tt === LEVEL_TELEP || tt === NO_TRAP) {
        if (mon_has_amulet(mtmp) || In_endgame(game.u?.uz)
            || (tt === NO_TRAP && onscary(0, 0, mtmp))) {
            if (in_sight) {
                await pline(
                    `${Monnam(mtmp)} seems very disoriented for a moment.`,
                );
            }
            return Trap_Effect_Finished;
        }
        if (tt === NO_TRAP) {
            const uz = game.u?.uz || { dnum: 0, dlevel: 1 };
            tolevel.dnum = uz.dnum | 0;
            tolevel.dlevel = uz.dlevel | 0;
        } else {
            const nlev = random_teleport_level();
            if (nlev === (depth(game.u?.uz) | 0)) {
                if (in_sight) {
                    await pline(`${Monnam(mtmp)} shudders for a moment.`);
                }
                return Trap_Effect_Finished;
            }
            get_level(tolevel, nlev);
        }
    } else {
        // C: impossible("mlevel_tele_trap: unexpected trap type")
        return Trap_Effect_Finished;
    }

    if (in_sight) {
        const how = (tt === HOLE) ? 'falls into a hole'
            : (tt === TRAPDOOR) ? 'falls through a trap door'
            : 'disappears out of sight';
        await pline(`Suddenly, ${mon_nam(mtmp)} ${how}.`);
        if (trap) seetrap(trap);
    }
    if (is_xport(tt) && !control_teleport(mtmp.data)) {
        mtmp.mconf = 1;
    }
    migrate_to_level(mtmp, ledger_no(tolevel), migrate_typ, null);
    return Trap_Moved_Mon;
}
