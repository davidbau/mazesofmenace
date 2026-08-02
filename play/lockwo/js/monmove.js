// monmove.js — Monster decision + movement logic for the move loop.
// C ref: monmove.c — dochug(), distfleeck(), set_apparxy(), m_move();
//        mon.c mfndpos().
//
// GENERAL (data-driven) port: operates on the real monster records placed on
// game.level.  When a level has materialized monsters this reproduces the
// per-move RNG sequence (distfleeck rn2(5), m_move rn2(4*cnt), ...) seen in
// the recorded sessions.  Kept faithful to the C control flow so it extends
// to richer monster behavior without per-seed special cases.

import { game } from './gstate.js';
import { rn2, rnd, rn1, d } from './rng.js';
import { find_misc, use_misc } from './muse.js';
import {
    COLNO, ROWNO, MTSZ, BOLT_LIM, DOOR, D_CLOSED, D_LOCKED, D_BROKEN,
    D_ISOPEN, D_NODOOR, D_TRAPPED,
    IS_OBSTRUCTED, IS_DOOR, IS_POOL, IS_LAVA, isok, OBJ_AT, is_pit,
    IS_STWALL, IS_WALL, IS_TREE, IS_ROOM, W_NONPASSWALL, ALLOW_DIG,
    ARROW_TRAP, DART_TRAP, ROCKTRAP, SQKY_BOARD, BEAR_TRAP, LANDMINE,
    ROLLING_BOULDER_TRAP, SLP_GAS_TRAP, RUST_TRAP, FIRE_TRAP, PIT,
    SPIKED_PIT, HOLE, TRAPDOOR, MAGIC_TRAP, NO_TRAP_FLAGS, ALL_TRAPS, NO_TRAP,
    A_STR, SQSRCHRADIUS, ALLOW_TRAPS, STATUE_TRAP, VIBRATING_SQUARE, TRAPNUM,
    W_ARMOR, W_AMUL, NOTONL, ALLOW_ROCK, ALLOW_M, ALLOW_U, ALLOW_SANCT,
    ALLOW_SSM, OPENDOOR, UNLOCKDOOR, BUSTDOOR, ALLOW_WALL, ALLOW_BARS,
    NOGARLIC, IS_ALTAR, In_endgame, GEHENNOM, HEADSTONE, u_at,
    STAIRS, LADDER, IRONBARS, WEB,
    STRAT_CLOSE, STRAT_WAITFORU, STRAT_WAITMASK,
} from './const.js';
import { quest_talk } from './questpgr.js';
import { COIN_CLASS, ROCK, ROCK_CLASS, GOLD_PIECE, GEM_CLASS, CORPSE, ARROW, DART,
    GLOB_OF_GREEN_SLIME, SCR_SCARE_MONSTER, AMULET_OF_STRANGULATION, mksobj_at } from './mkobj.js';
import { t_at, t_missile, Can_fall_thru, maketrap } from './trap.js';
import { gettrack } from './track.js';
import { DEADMONSTER, healmon } from './mon.js';
import { regenerates_flag } from './monflags_data.js';
import { dog_move, can_carry, m_cansee } from './dogmove.js';
import { mon_msize, monster_by_pmidx, M2_HUMAN_NAMES, M2_MINION_NAMES } from './makemon.js';
import { newsym, map_invisible, show_glyph_cell, object_glyph, pline, update_topl } from './display.js';
import { mdig_tunnel, may_dig } from './dig.js';
import { place_object, next_ident, BLINDING_VENOM, ACID_VENOM, VENOM_CLASS, objects as OBJECTS,
    weight, base_oc_weight } from './mkobj.js';
import { obj_resists, resists_sleep, sleep_monst } from './zap.js';
import { clear_path, couldsee, cansee, vision_recalc, recalc_block_point, Blind } from './vision.js';
import { mattackm } from './mhitm.js';
import { Monnam, mon_nam, canspotmon, make_corpse, corpse_chance, dmgval } from './uhitm.js';
import { M_ATTK_AGR_DIED, M_ATTK_DEF_DIED } from './const.js';
import { wipe_engr_at, engr_at } from './engrave.js';
import { discover_object } from './o_init.js';

// C ref: include/monsters.h — grid bug's index (makemon.js MONS convention).
// The only NODIAG monster the contest sessions place on dlvl 1.
const PM_GRID_BUG = 116;

// C ref: monmove.c:1871 m_move() — the "flutters randomly" appr=0 gate fires for
// a hostile sighted giant bat (S_BAT), a will-o-wisp/light (S_LIGHT) or the
// (invisible) stalker (PM_STALKER).  monsym.h class indices / makemon.js pmidx.
const S_BAT = 28;       // monsym.h S_BAT (giant bat, bat)
const S_LIGHT = 25;     // monsym.h S_LIGHT (yellow/black light)
const PM_STALKER = 153; // makemon.js MONS index of "stalker"

// C ref: mon.c mon_allowflags() — a monster gets OPENDOOR (and thus may step
// onto a *closed* (but not locked) door, opening it) when
//   can_open = !(nohands(ptr) || verysmall(ptr)).
// makemon.js exposes `data.verysmall` (MZ_TINY) but not the M1_NOHANDS /
// M1_NOLIMBS flags, so this Set lists the pmidx (makemon MONS convention) of
// every species with hands and size >= MZ_SMALL — i.e. those for which
// can_open is TRUE — derived straight from include/monsters.h flag/size data.
// Used only to decide closed-door passability in mfndpos (matching C's cnt).
const CAN_OPEN_DOOR_PMIDX = new Set([
    15, 21, 40, 41, 42, 43, 44, 45, 48, 49, 50, 53, 54, 55, 59, 60, 62, 67, 68,
    69, 70, 71, 72, 73, 74, 75, 76, 77, 91, 120, 122, 123, 125, 130, 131, 132,
    153, 165, 167, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180,
    181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 203,
    210, 211, 213, 220, 221, 222, 223, 224, 225, 226, 228, 229, 230, 231, 232,
    233, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248,
    249, 250, 251, 252, 253, 254, 255, 256, 257, 258, 259, 260, 261, 262, 263,
    264, 265, 266, 267, 270, 271, 272, 273, 274, 277, 278, 279, 280, 281, 282,
    283, 284, 285, 286, 287, 288, 289, 291, 292, 293, 294, 295, 296, 297, 298,
    299, 300, 301, 302, 303, 304, 305, 306, 307, 308, 309, 311, 312, 313, 314,
    328, 329,
]);

// The three starting pets — little dog (16), kitten (34), pony (102) — are all
// M1_NOHANDS animals, so C's `can_open = !(nohands || verysmall)` is FALSE for
// them: a pet CANNOT open a closed door (it must wait for the hero / route
// around).  Earlier this incorrectly granted pets OPENDOOR, which kept a
// closed door in the pet's mfndpos candidate list (an extra square) and threw
// off dog_move's choice-loop rn2 count on the 2nd movemon pass.

// C ref: mon.c mon_allowflags() can_open / can_unlock.  OPENDOOR lets a
// monster treat a *closed* door as passable; UNLOCKDOOR additionally for a
// *locked* door (only key-carriers, the Wizard, and Riders — none of the
// dlvl-1 dungeon monsters), so closed-but-not-locked is the only case we add.
function mon_can_open_door(mon) {
    const pm = mon?.data?.pmidx;
    return CAN_OPEN_DOOR_PMIDX.has(pm);
}

// C ref: mondata.h dist2(x0,y0,x1,y1).
export function dist2(x0, y0, x1, y1) {
    const dx = x0 - x1, dy = y0 - y1;
    return dx * dx + dy * dy;
}

// C ref: mon.c monnear(mon, x, y) — within one (king) step.
//   int distance = dist2(mon->mx, mon->my, x, y);
//   if (distance == 2 && NODIAG(mon->data - mons)) return 0;
//   return (boolean) (distance < 3);
// A NODIAG monster (grid bug) at a diagonal square (dist2 == 2) is NOT
// "near" — it can neither move nor attack diagonally, so dochug sends it
// through m_move rather than mattacku.
function monnear(mon, x, y) {
    const distance = dist2(mon.mx, mon.my, x, y);
    if (distance === 2 && mon.data?.pmidx === PM_GRID_BUG)
        return false;
    return distance < 3;
}

// C ref: mon.c m_at(x, y).
function m_at(x, y) {
    for (const m of game.level?.monsters || [])
        if (!DEADish(m) && m.mx === x && m.my === y) return m;
    return null;
}
function DEADish(m) { return !m || (m.mhp != null && m.mhp <= 0); }

function MON_AT(x, y) {
    const m = m_at(x, y);
    return m && !(game.u?.ux === x && game.u?.uy === y);
}

function terrainTyp(x, y) {
    return game.level?.at(x, y)?.typ;
}
function doormask(x, y) {
    return game.level?.at(x, y)?.doormask || 0;
}
// C ref: mondata.h passes_walls(ptr) = (mflags1 & M1_WALLWALK).  makemon carries
// no mflags1, so the four M1_WALLWALK species are identified by pmidx (the same
// set mon_allows_rock uses): earth elemental(156), xorn(232), ghost(287),
// shade(288).
function passes_walls(data) {
    return !!data && WALLWALK_PMIDX.has(data.pmidx);
}
// C ref: hack.c:939 may_passwall(x,y) — a stone wall is phaseable unless it is
// flagged W_NONPASSWALL (the level border / permanent walls).  Our mklev does
// not set W_NONPASSWALL, so interior room walls (the earth elemental's case)
// are phaseable, matching C.
function may_passwall(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    return !(IS_STWALL(loc.typ) && ((loc.wall_info || 0) & W_NONPASSWALL));
}

// C ref: mondata.h tunnels(ptr) = (mflags1 & M1_TUNNEL).  makemon carries no
// mflags1, so the M1_TUNNEL species are identified by pmidx (makemon MONS
// convention): dwarf(44), dwarf leader(46), dwarf ruler(47) [M1_TUNNEL|
// M1_NEEDPICK]; rock mole(92), woodchuck(93), umber hulk(225) [M1_TUNNEL only];
// and the pick-wielding human role monsters archeologist(330), Lord
// Carnarvon(343), student(368) [M1_TUNNEL|M1_NEEDPICK].
const TUNNELS_PMIDX = new Set([44, 46, 47, 92, 93, 225, 330, 343, 368]);
// C ref: mondata.h needspick(ptr) = (mflags1 & M1_NEEDPICK) — a tunneller that
// requires a pick/axe to dig (dwarves + the human role diggers, NOT the animal
// tunnellers rock mole / woodchuck / umber hulk which gnaw through unaided).
const NEEDPICK_PMIDX = new Set([44, 46, 47, 330, 343, 368]);
function tunnels(ptr) { return !!ptr && TUNNELS_PMIDX.has(ptr.pmidx); }
function needspick(ptr) { return !!ptr && NEEDPICK_PMIDX.has(ptr.pmidx); }

// Object otyps a digger looks for (mkobj.js objects table).
const PICK_AXE_OTYP = 259, DWARVISH_MATTOCK_OTYP = 71,
    AXE_OTYP = 44, BATTLE_AXE_OTYP = 45;
// C ref: obj.h is_pick / is_axe.
function is_pick_otyp(o) {
    return o && (o.otyp === PICK_AXE_OTYP || o.otyp === DWARVISH_MATTOCK_OTYP);
}
function is_axe_otyp(o) {
    return o && (o.otyp === AXE_OTYP || o.otyp === BATTLE_AXE_OTYP);
}
// C ref: mon.c mwelded(otmp) — a wielded (W_WEP) cursed weapon is stuck.  The
// dwarf's pick is not cursed, so this is FALSE for the contest, but keep it
// faithful.
function mwelded(o) {
    const W_WEP = 0x1; // wield slot bit (approx; the dwarf's pick is never welded)
    return !!o && ((o.owornmask || 0) & W_WEP) !== 0 && !!o.cursed;
}
// weapon_check enum (monst.h wpn_chk_flags) — the digging values.
const NO_WEAPON_WANTED = 0, NEED_WEAPON = 1,
    NEED_PICK_AXE = 4, NEED_AXE = 5, NEED_PICK_OR_AXE = 6;

// C ref: weapon.c mon_wield_item(mon) — the digging cases (NEED_PICK_AXE /
// NEED_AXE / NEED_PICK_OR_AXE).  Wields the appropriate carried pick/axe with
// NO RNG and NO message (the digger is inside rock, unseen: canseemon FALSE).
// Returns TRUE if it actually switched weapon (spent the turn), FALSE if it was
// already wielding the right tool.
function mon_wield_dig_tool(mon) {
    if (mon.weapon_check === NO_WEAPON_WANTED) return false;
    let obj = null;
    // which_armor(mon, W_ARMS) — a shield; the mines dwarf may carry one, but
    // for the pick case the mattock fallback is only blocked by a shield.
    const hasShield = !!mon._wearsShield; // not tracked; treated as false
    switch (mon.weapon_check) {
    case NEED_PICK_AXE:
        obj = m_carrying(mon, PICK_AXE_OTYP);
        if (!obj && !hasShield) obj = m_carrying(mon, DWARVISH_MATTOCK_OTYP);
        break;
    case NEED_AXE:
        obj = m_carrying(mon, BATTLE_AXE_OTYP);
        if (!obj || hasShield) obj = m_carrying(mon, AXE_OTYP);
        break;
    case NEED_PICK_OR_AXE:
        obj = m_carrying(mon, DWARVISH_MATTOCK_OTYP);
        if (!obj) obj = m_carrying(mon, BATTLE_AXE_OTYP);
        if (!obj || hasShield) {
            obj = m_carrying(mon, PICK_AXE_OTYP);
            if (!obj) obj = m_carrying(mon, AXE_OTYP);
        }
        break;
    default:
        return false;
    }
    if (obj) {
        const mw_tmp = MON_WEP(mon);
        if (mw_tmp && mw_tmp.otyp === obj.otyp) {
            mon.weapon_check = NEED_WEAPON; // already wielding it
            return false;
        }
        if (mw_tmp && mwelded(mw_tmp)) {
            mon.weapon_check = NO_WEAPON_WANTED;
            return true;
        }
        mon.mw = obj; // wield obj
        mon.weapon_check = NEED_WEAPON;
        return true;
    }
    mon.weapon_check = NEED_WEAPON;
    return false;
}

// C ref: monmove.c m_digweapon_check(mtmp, nix, niy) — before committing a move
// onto a to-be-dug square, have the monster wield a pick/axe if it needs one.
// Returns TRUE if it spent this move wielding (no move, no RNG), FALSE
// otherwise.  RNG-free.
function m_digweapon_check(mtmp, nix, niy) {
    let can_tunnel = false;
    const mw_tmp = MON_WEP(mtmp);
    if (!Is_rogue_level()) can_tunnel = tunnels(mtmp.data);
    if (can_tunnel && needspick(mtmp.data) && !mwelded(mw_tmp)
        && (may_dig(nix, niy) || closed_door_at(nix, niy))) {
        if (closed_door_at(nix, niy)) {
            if (!mw_tmp || !is_pick_otyp(mw_tmp) || !is_axe_otyp(mw_tmp))
                mtmp.weapon_check = NEED_PICK_OR_AXE;
        } else if (IS_TREE(terrainTyp(nix, niy))) {
            if (!mw_tmp || !is_axe_otyp(mw_tmp))
                mtmp.weapon_check = NEED_AXE;
        } else if (IS_STWALL(terrainTyp(nix, niy))) {
            if (!mw_tmp || !is_pick_otyp(mw_tmp))
                mtmp.weapon_check = NEED_PICK_AXE;
        }
        if (mtmp.weapon_check >= NEED_PICK_AXE && mon_wield_dig_tool(mtmp))
            return true;
    }
    return false;
}

// C ref: rm.h closed_door(x, y).
function closed_door_at(x, y) {
    const t = terrainTyp(x, y);
    return IS_DOOR(t) && ((doormask(x, y) & (D_CLOSED | D_LOCKED)) !== 0);
}

// C ref: monmove.c distfleeck(mtmp, &inrange, &nearby, &scared).
// Always rolls rn2(5) (bravegremlin) first; the monflee roll only happens
// when the monster is actually scared (not for the peaceful/level monsters
// our sessions exercise).
function distfleeck(mtmp) {
    rn2(5); // bravegremlin
    const inrange = dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy)
        <= BOLT_LIM * BOLT_LIM;
    const nearby = inrange && monnear(mtmp, mtmp.mux, mtmp.muy);
    let scared = 0;
    // onscary / sanctuary / flees_light all false for ordinary monsters.
    // (When implemented, scared would trigger monflee(rnd(rn2(7)?10:100)).)
    return { inrange, nearby, scared };
}

// C ref: hacklib.c online2 — are two points on a straight (orthogonal or
// diagonal) line?
function online2(x0, y0, x1, y1) {
    const dx = x0 - x1, dy = y0 - y1;
    return (!dy || !dx || dy === dx || dy === -dx);
}

// C ref: hack.h onlineu(xx,yy) = online2(xx, yy, u.ux, u.uy).
function onlineu(x, y) {
    return online2(x, y, game.u?.ux, game.u?.uy);
}

// C ref: shk.c inhishop — is the shopkeeper standing in his own shop room?
// (We only model same-level shops, which is the only case in the sessions.)
function inhishop(shkp) {
    const eshk = shkp.eshk;
    if (!eshk) return false;
    const loc = game.level?.at(shkp.mx, shkp.my);
    if (!loc) return false;
    const rmno = (loc.roomno ?? 0);
    return rmno !== 0 && rmno === eshk.shoproom;
}

// C ref: monmove.c m_can_break_boulder(mtmp) — riders, or a shk/priest/quest
// leader that hasn't used its move_special "special move" yet.  Used by
// mon_allows_rock() (this file) to decide whether a boulder blocks mfndpos.
// C ref: monmove.c m_break_boulder(mtmp, x, y) — the monster fractures the
// boulder blocking its chosen square.  RNG-critical: mspec_used advances by
// rn1(20,10) (a rider is exempt, but riders never reach move_special here).
async function m_break_boulder(mtmp, x, y) {
    const otmp = objectsAt(x, y).find((o) => o.otyp === ROCK_BOULDER);
    if (!otmp) return;
    const Deaf = !!game.u?.Deaf;
    if (!Deaf && dist2(mtmp.mx, mtmp.my, game.u?.ux ?? 0, game.u?.uy ?? 0) < 16) {
        await pline(`${Monnam(mtmp)} mutters ${mtmp.ispriest ? 'a prayer' : 'an incantation'}.`);
    }
    mtmp.mspec_used = (mtmp.mspec_used || 0) + rn1(20, 10);
    if (cansee(x, y)) await pline('The boulder falls apart.');
    // fracture_rock(otmp): keeps the object, changing its otyp from BOULDER to
    // ROCK.  The unpaid/bill_dummy_object edge case (a boulder pushed onto a
    // shop's boundary while unpaid) never arises for a shk's own move, so it
    // is not modeled.
    otmp.otyp = ROCK;
}

// C ref: mkobj.c sobj_at(BOULDER, x, y) list — every floor object at (x,y).
function objectsAt(x, y) {
    const objs = game.level?.objects;
    if (!objs) return [];
    return objs.filter((o) => o.where === 'floor' && o.ox === x && o.oy === y);
}
const ROCK_BOULDER = 474; // mkobj.js BOULDER otyp (matches sobj_at_boulder)

// C ref: priest.c move_special(mtmp, in_his_shop, appr, uondoor, avoid, omx,
// omy, ggx, ggy) — shared "walk toward a fixed goal inside a room" algorithm
// used by shk_move() (shopkeepers) and pri_move() (temple priests).  Returns
// 1 (moved), 0 (didn't move; also the ANGRY-attack outcomes -2/1 that our
// isshk/ispriest callers can't reach: mon_allowflags() only grants ALLOW_M to
// *tame* monsters, so the `ninfo & ALLOW_M` / m_move_aggress branch below is
// structurally dead for a shopkeeper or priest).
async function move_special(mtmp, in_his_shop, appr, uondoor, avoid, omx, omy, ggx, ggy) {
    if (omx === ggx && omy === ggy) return 0;
    if (mtmp.mconf) { avoid = false; appr = 0; }

    let nix = omx, niy = omy, ninfo = 0;
    // allowflags: peaceful shk/priest get no ALLOW_M/ALLOW_U (mfndpos already
    // excludes monster/hero squares by default); ALLOW_ROCK is applied inside
    // mfndpos directly via mon_allows_rock(), not gated through `flag` here.
    const poss = mfndpos(mtmp, 0);
    const cnt = poss.length;

    if (mtmp.isshk && avoid && uondoor) {
        if (!poss.some((p) => !(p.info & NOTONL))) avoid = false;
    }

    let chcnt = 0;
    const following = !!mtmp.eshk?.following;
    for (let i = 0; i < cnt; i++) {
        const { x: nx, y: ny, info } = poss[i];
        if (IS_ROOM(terrainTyp(nx, ny)) || (mtmp.isshk && (!in_his_shop || following))) {
            if (avoid && (info & NOTONL) && !(info & ALLOW_M)) continue;
            if ((!appr && !rn2(++chcnt))
                || (appr && dist2(nx, ny, ggx, ggy) < dist2(nix, niy, ggx, ggy))
                || (info & ALLOW_M)) {
                nix = nx; niy = ny; ninfo = info;
            }
        }
    }

    // C ref: priest.c:93-98 — a priest that stayed put but is lined up with
    // the hero re-runs the scan with avoid cleared.  Unreachable here (this
    // helper is only invoked for isshk), kept for documentation parity.
    if (mtmp.ispriest && avoid && nix === omx && niy === omy && onlineu(omx, omy)) {
        avoid = false;
    }

    if (nix !== omx || niy !== omy) {
        if (ninfo & ALLOW_ROCK) {
            await m_break_boulder(mtmp, nix, niy);
            return 1;
        }
        // (ninfo & ALLOW_M) attack branch: see function comment — dead code
        // for isshk/ispriest.
        if (MON_AT(nix, niy) || (game.u?.ux === nix && game.u?.uy === niy)) return 0;
        mtmp.mx = nix; mtmp.my = niy;
        newsym(omx, omy);
        newsym(nix, niy);
        // check_special_room(FALSE) only fires when the shk *wasn't* already
        // in_his_shop before this move; our only caller (shk_move) requires
        // inhishop(shkp) up front, so in_his_shop is always true here.
        return 1;
    }
    return 0;
}

// C ref: shk.c shk_move(shkp) — shopkeeper movement.  Faithfully reproduces
// the "stay put, no RNG" outcome (a peaceful shopkeeper near home, neither
// lined up with the hero nor on the shop door, no outstanding bill) AND the
// general case (needs to actually walk), which now delegates to the shared
// move_special() algorithm exactly as C's shk_move() does.
async function shk_move(shkp) {
    const eshk = shkp.eshk;
    if (!eshk) return -1;
    const omx = shkp.mx, omy = shkp.my;
    const u = game.u;
    if (!u) return -1;

    // shk_fixes_damage(): rebuilds broken shop walls.  An undamaged shop (the
    // case for every recorded session — the hero hasn't dug/kicked the shop)
    // consumes no RNG; if damage repair is ever needed, bail to m_move.
    if (!inhishop(shkp)) return -1;

    const udist = dist2(omx, omy, u.ux, u.uy);
    // The udist<3 angry/following block: ANGRY(shk) == !mpeaceful.  A peaceful,
    // non-following shopkeeper with the hero >=3 squares away skips it entirely.
    if (udist < 3) return -1; // hero adjacent: let the generic path handle it
    if (!shkp.mpeaceful) return -1; // angry shopkeeper: not modelled here
    if (eshk.following) return -1;  // following the hero: not modelled here

    // Home target = eshk->shk; GDIST = dist2(pos, home).
    let gtx = eshk.shk?.x, gty = eshk.shk?.y;
    if (gtx == null || gty == null) return -1;
    const satdoor = (gtx === omx && gty === omy);

    // C ref: shk.c — `holetime() >= 0` (a hole/trapdoor in progress) diverts the
    // shopkeeper toward the hero.  No holes in the recorded sessions; treat as
    // absent.  The else-branch below then applies.

    // else (not angry): hero not invisible / not riding in the sessions.
    const uondoor = (u.ux === eshk.shd?.x && u.uy === eshk.shd?.y);
    if (uondoor) return -1; // door-blocking logic: defer to generic path
    // avoid = (*u.ushops && distu(home) > 8).  u.ushops empty (hero not inside a
    // shop) => avoid = false; if the hero IS in a shop, defer to be safe.
    const heroInShop = !!(u.ushops && u.ushops.length);
    if (heroInShop) return -1;

    // (((!robbed && !billct && !debit) || avoid) && GDIST(pos,home) < 3)
    const owesNothing = !eshk.robbed && !eshk.billct && !eshk.debit;
    const gdist = dist2(omx, omy, gtx, gty);
    let appr = 1;
    if (owesNothing && gdist < 3) {
        // if (!badinv && !onlineu(omx,omy)) return 0;  (badinv == false here,
        // since heroInShop is false and uondoor is false at this point)
        if (!online2(omx, omy, u.ux, u.uy))
            return 0; // stay put, no RNG — matches C exactly
        if (satdoor) { appr = 0; gtx = 0; gty = 0; }
    }
    // avoid/uondoor are always false by this point: the branches above that
    // would set them (heroInShop, uondoor) already returned -1.
    const z = await move_special(shkp, /* in_his_shop */ true, appr,
                                  /* uondoor */ false, /* avoid */ false,
                                  omx, omy, gtx, gty);
    // after_shk_move(shkp): only re-checks room occupancy when the shk's
    // bill_p sentinel was reset AND it wasn't already in_his_shop — the
    // latter is always true on our inhishop-gated path, so it's a no-op here.
    return z;
}

// C ref: monmove.c set_apparxy(mtmp).  For tame monsters, monsters adjacent
// to the hero, or monsters that can see a non-invisible/non-displaced hero,
// this resolves to the hero's real position with no RNG.  The RNG-consuming
// guessing branch only runs under invisibility/displacement/underwater.
export function set_apparxy(mtmp) {
    const mx = mtmp.mux, my = mtmp.muy;
    if (mtmp.mtame || (game.u?.ux === mx && game.u?.uy === my)) {
        mtmp.mux = game.u.ux; mtmp.muy = game.u.uy; return;
    }
    const notseen = (!mtmp.mcansee);
    // No Invis / Displaced / Underwater modelling here -> displ stays 0.
    if (!notseen) {
        mtmp.mux = game.u.ux; mtmp.muy = game.u.uy; return;
    }
    // notseen branch (blind monster): displ = 1, may roll to guess.
    const displ = 1;
    const gotu = !rn2(3);
    if (gotu) {
        mtmp.mux = game.u.ux; mtmp.muy = game.u.uy; return;
    }
    let try_cnt = 0, nx = mx, ny = my;
    do {
        if (++try_cnt > 200) { nx = game.u.ux; ny = game.u.uy; break; }
        nx = game.u.ux - displ + rn2(2 * displ + 1);
        ny = game.u.uy - displ + rn2(2 * displ + 1);
    } while (!isok(nx, ny));
    mtmp.mux = nx; mtmp.muy = ny;
}

// C ref: mon.c mfndpos(mon, &data, flag).  Returns the list of legal move
// positions around the monster (the count `cnt` drives m_move's rn2(4*cnt)).
// Implements the common-case terrain/door/diagonal/occupancy checks; exotic
// cases (digging, water-walkers, poison gas, garlic, boulders) are omitted
// because no contest session exercises them with materialized monsters.
export function mfndpos(mon, flag) {
    const poss = [];
    const x = mon.mx, y = mon.my;
    const nowtyp = terrainTyp(x, y);
    // C ref: hack.h NODIAG(monnum) == (monnum == PM_GRID_BUG).  Only grid bugs
    // are restricted to orthogonal moves; a grid bug in the open therefore has
    // cnt 4 (not 8), which feeds the m_move/dog_move rn2(4*(cnt-j)) tie-breaks.
    // The grid bug carries makemon's pmidx 116 (matching base_mmove's table).
    const nodiag = (mon.data?.pmidx === PM_GRID_BUG);

    // C ref: mon.c:2176-2195 — ALLOW_DIG setup.  A digger that needs no pick
    // can dig any rock/tree; a pick-needer can dig rock only if it carries a
    // pick/mattock (and a tree only with an axe).  rockok/treeok stay FALSE for
    // every non-digger (flag has no ALLOW_DIG), so their candidate set — and the
    // cnt that feeds m_move's rn2(4*(cnt-j)) — is byte-identical to before.
    let rockok = false, treeok = false;
    if (flag & ALLOW_DIG) {
        const mw_tmp = MON_WEP(mon);
        if (!needspick(mon.data)) {
            rockok = treeok = true;
        } else if (mw_tmp && mw_tmp.cursed
                   && mon.weapon_check === 0 /* NO_WEAPON_WANTED */) {
            rockok = is_pick_otyp(mw_tmp);
            treeok = is_axe_otyp(mw_tmp);
        } else {
            const hasShield = false; // which_armor(mon, W_ARMS) not tracked
            rockok = !!(m_carrying(mon, PICK_AXE_OTYP)
                        || (m_carrying(mon, DWARVISH_MATTOCK_OTYP) && !hasShield));
            treeok = !!(m_carrying(mon, AXE_OTYP)
                        || (m_carrying(mon, BATTLE_AXE_OTYP) && !hasShield));
        }
    }

    const maxx = Math.min(x + 1, COLNO - 1);
    const maxy = Math.min(y + 1, ROWNO - 1);
    for (let nx = Math.max(1, x - 1); nx <= maxx; nx++) {
        for (let ny = Math.max(0, y - 1); ny <= maxy; ny++) {
            if (nx === x && ny === y) continue;
            const ntyp = terrainTyp(nx, ny);
            if (ntyp == null) continue;
            // C ref: mon.c:2212-2214 — an obstructed cell is dropped unless the
            // monster passes walls (ALLOW_WALL && may_passwall).  A wall-walker
            // (earth elemental, xorn, ghost, shade) keeps its adjacent phaseable
            // walls as candidates, so cnt matches C and the m_move rn2(4*cnt)
            // mtrack tie-break aligns (seed4500 earth elemental: cnt 5 -> 7).
            // C ref: mon.c:2212-2214 — a digger additionally keeps an obstructed
            // cell it can dig ((IS_TREE?treeok:rockok) && may_dig).  rockok/treeok
            // are FALSE for non-diggers, so this disjunct is inert for them.
            if (IS_OBSTRUCTED(ntyp)
                && !(passes_walls(mon.data) && may_passwall(nx, ny))
                && !((IS_TREE(ntyp) ? treeok : rockok) && may_dig(nx, ny)))
                continue;
            // closed/locked doors: a monster that can_open (has hands, not
            // tiny) treats a *closed* door as passable (C: OPENDOOR flag in
            // mon_allowflags); a *locked* door still blocks (no dlvl-1 monster
            // has UNLOCKDOOR).  Door-less openers see it blocked, as before.
            if (IS_DOOR(ntyp)) {
                const dm = doormask(nx, ny);
                if (dm & D_LOCKED) continue;
                if ((dm & D_CLOSED) && !mon_can_open_door(mon)) continue;
            }
            // diagonal squeeze rules through doorways
            if (nx !== x && ny !== y) {
                if (nodiag) continue;
                if (IS_DOOR(nowtyp) && (doormask(x, y) & ~D_BROKEN)) continue;
                if (IS_DOOR(ntyp) && (doormask(nx, ny) & ~D_BROKEN)) continue;
            }
            // pools / lava: ordinary land monsters avoid them
            if (IS_POOL(ntyp) || IS_LAVA(ntyp)) continue;

            let info = 0;
            // hero's (apparent) position: only allowed if attacking
            if ((game.u?.ux === nx && game.u?.uy === ny)
                || (nx === mon.mux && ny === mon.muy)) {
                if (game.u?.ux === nx && game.u?.uy === ny) {
                    mon.mux = game.u.ux; mon.muy = game.u.uy;
                }
                if (!(flag & ALLOW_U)) continue;
            } else if (MON_AT(nx, ny)) {
                // another monster occupies the spot.  C ref: mon.c mfndpos
                // (mon.c:2299-2316) — with ALLOW_M the square stays in the
                // candidate list (the caller, e.g. dog_move, decides whether to
                // attack it).  A *tame* occupant is still dropped (a pet has no
                // ALLOW_TM without Conflict, which these sessions never set).
                // Without ALLOW_M the square is dropped (no displace by default).
                if (!(flag & ALLOW_M)) continue;
                if (m_at(nx, ny)?.mtame) continue;
                info |= ALLOW_M;
            }
            // boulder on the destination square.  C ref: mon.c mfndpos
            // (mon.c:2334-2338) — `if (checkobj && sobj_at(BOULDER, nx, ny)) {
            //   if (!(flag & ALLOW_ROCK)) continue; ... }`.  ALLOW_ROCK is set
            // by mon_allowflags() (mon.c:2092-2095) only for monsters that
            // pass walls, throw rocks, or can break boulders; an ordinary
            // monster (goblin, kitten, kobold, ...) therefore cannot step onto
            // a boulder and the square is dropped from the candidate list.
            // Reproducing this is required for the cnt that feeds m_move's
            // rn2(4*(cnt-j)) at monmove.c:1963.
            if (sobj_at_boulder(nx, ny)) {
                if (!mon_allows_rock(mon)) continue;
                info |= ALLOW_ROCK;
            }
            // C ref: mon.c:2339-2342 — a square in direct line with where the
            // monster thinks the hero is gets flagged NOTONL (used by
            // move_special's shopkeeper/priest line-of-sight avoidance);
            // Invis is never modeled true here, so monseeu reduces to mcansee.
            if (mon.mcansee && online2(nx, ny, mon.mux, mon.muy)) info |= NOTONL;
            // C ref: mon.c:2353 — trap handling.  A harmful trap the monster is
            // familiar with is avoided (dropped) UNLESS the caller allows traps
            // (pets pass ALLOW_TRAPS via mon_allowflags); when kept, the square is
            // flagged ALLOW_TRAPS so dog_move()/m_move() can roll the "step on it
            // anyway" chance.  Harmless traps are neither avoided nor flagged.
            const ttmp = t_at(nx, ny);
            if (ttmp && ttmp.ttyp > 0 && ttmp.ttyp < TRAPNUM) {
                // fixed_tele_trap()+hastrack (a hero-used fixed teleport trap) is
                // not reachable at the contest's diverging points; treat as absent.
                if (!m_harmless_trap(mon, ttmp)) {
                    if (!(flag & ALLOW_TRAPS) && mon_knows_traps(mon, ttmp.ttyp))
                        continue;
                    info |= ALLOW_TRAPS;
                }
            }
            poss.push({ x: nx, y: ny, info });
        }
    }
    return poss;
}

// C ref: monmove.c:1296 m_avoid_kicked_loc(mtmp, nx, ny) — a peaceful/tame
// monster that can see (and isn't confused/stunned/conflicted) avoids the
// single square the hero just kicked, as long as that square is adjacent to
// the hero (next2u).  gk.kickedloc is set by dokick() for the kick turn and
// cleared by the next hero action (see cmd.js).  isok({0,0}) is false, so a
// cleared kickedloc disables the avoidance.  Only affects the pet's/peaceful's
// mfndpos candidate scan (dog_move / m_move), where the skipped square never
// reaches the rn2(++chcnt) tie-break — the source of the seed0060 divergence.
export function m_avoid_kicked_loc(mtmp, nx, ny) {
    const Conflict = false; // Conflict not modeled for these sessions
    const kl = game.kickedloc;
    if (!kl) return false;
    return (mtmp.mpeaceful || mtmp.mtame)
        && mtmp.mcansee
        && !mtmp.mconf && !mtmp.mstun
        && !Conflict
        && isok(kl.x, kl.y)
        && nx === kl.x && ny === kl.y
        && dist2(nx, ny, game.u?.ux ?? 0, game.u?.uy ?? 0) <= 2;
}

// C ref: trap.c m_harmless_trap(mtmp, ttmp) — is trap `ttmp` harmless to `mtmp`?
// A floor-trigger trap doesn't fire for an airborne monster; a bear trap can't
// hold a small/amorphous/whirly/unsolid monster; statue/magic/vibrating-square
// traps never harm a moving monster.  Everything else (arrow/dart/rock/pit/
// teleport/&c.) is harmful to the grounded, solid monsters the sessions place.
function m_harmless_trap(mtmp, ttmp) {
    const ttyp = ttmp.ttyp;
    if (FLOOR_TRIGGER.has(ttyp) && mon_check_in_air(mtmp)) return true;
    switch (ttyp) {
    case BEAR_TRAP: {
        // A starting pet's .data record (dog.js makedog_mon) doesn't carry
        // its own msize, so fall back to the mons[] table by pmidx — the
        // same fallback dogmove.js's own bear-trap size check already uses.
        const msize = (mtmp.data?.msize != null)
            ? mtmp.data.msize
            : (mon_msize(mtmp.data?.pmidx) ?? 2);
        // amorphous / is_whirly / unsolid escapes aren't reachable for the
        // grounded quadrupeds placed near bear traps here; only the size test.
        return msize <= 1; /* MZ_SMALL */
    }
    case STATUE_TRAP:
    case MAGIC_TRAP:
    case VIBRATING_SQUARE:
        return true;
    default:
        return false;
    }
}

// C ref: mkobj.c sobj_at(BOULDER, x, y) — is there a boulder lying on the
// floor at (x,y)?  BOULDER otyp is 474 (mkobj.js).
function sobj_at_boulder(x, y) {
    const objs = game.level?.objects;
    if (!objs) return false;
    for (const o of objs)
        if (o.where === 'floor' && o.ox === x && o.oy === y && o.otyp === 474)
            return true;
    return false;
}

// C ref: mon.c mon_allowflags() — a monster receives ALLOW_ROCK when it
//   passes_walls(M1_WALLWALK) || throws_rocks(M2_ROCKTHROW)
//   || m_can_break_boulder(mtmp)   [riders, shopkeepers, priests, leaders].
// makemon.js doesn't carry the M1/M2 flag bitfields, so the wall-walkers and
// rock-throwers are listed by pmidx (makemon MONS convention); the
// break-boulder cases use the monster-record booleans we already track.
const WALLWALK_PMIDX = new Set([156, 232, 287, 288]); // earth elemental, xorn, ghost, shade
const ROCKTHROW_PMIDX = new Set([169, 170, 171, 172, 173, 174, 175, 176, 177, 359]); // giants, ettin, minotaur, titan, Cyclops
function mon_allows_rock(mon) {
    const idx = mon.data?.pmidx;
    if (WALLWALK_PMIDX.has(idx) || ROCKTHROW_PMIDX.has(idx)) return true;
    // m_can_break_boulder (monmove.c:133): riders / shopkeepers / priests /
    // quest leaders (msound MS_LEADER) that haven't used their special move.
    if (!mon.mspec_used && (mon.isshk || mon.ispriest || mon.msound_leader))
        return true;
    return false;
}

// C ref: mondata.h is_giant/is_rider/is_unicorn/is_undead/is_human — makemon.js
// carries no raw mflags2 bitfield, so these are keyed by monster NAME (the
// established convention in this file: see makemon.js's M2_HOSTILE_NAMES /
// M2_HUMAN_NAMES / M2_MINION_NAMES), scanned straight out of
// include/monsters.h's M2_GIANT / is_rider() / M2_JEWELS(+S_UNICORN) /
// M2_UNDEAD entries.
const S_HUMAN_MCLS = 53, S_VAMPIRE_MCLS = 48, S_GHOST_MCLS = 54;
const GIANT_NAMES = new Set(["giant", "stone giant", "hill giant", "fire giant",
    "frost giant", "storm giant", "Cyclops", "Lord Surtur"]);
const RIDER_NAMES = new Set(["Death", "Famine", "Pestilence"]);
const UNICORN_NAMES = new Set(["white unicorn", "gray unicorn", "black unicorn"]);
const UNDEAD_NAMES = new Set(["lich", "demilich", "master lich", "arch-lich",
    "kobold mummy", "gnome mummy", "orc mummy", "dwarf mummy", "elf mummy",
    "human mummy", "ettin mummy", "giant mummy", "vampire", "vampire lord",
    "vampire lady", "vampire leader", "vampire mage", "Vlad the Impaler",
    "barrow wight", "wraith", "Nazgul", "kobold zombie", "gnome zombie",
    "orc zombie", "dwarf zombie", "elf zombie", "human zombie", "ettin zombie",
    "ghoul", "giant zombie", "skeleton", "ghost", "shade"]);
function is_giant(ptr) { return !!ptr && GIANT_NAMES.has(ptr.name); }
function is_rider(ptr) { return !!ptr && RIDER_NAMES.has(ptr.name); }
function is_unicorn(ptr) { return !!ptr && UNICORN_NAMES.has(ptr.name); }
function is_undead(ptr) { return !!ptr && UNDEAD_NAMES.has(ptr.name); }
function is_human(ptr) { return !!ptr && M2_HUMAN_NAMES.has(ptr.name); }
// C ref: mondata.h is_minion(ptr) = mflags2&M2_MINION.  makemon.js's
// M2_MINION_NAMES set (couatl/Aleax/Angel/ki-rin/Archon/high priest(ess)/high
// cleric) is reused here.
function is_minion(ptr) { return !!ptr && M2_MINION_NAMES.has(ptr.name); }
// C ref: monst.h is_lminion(mon) = is_minion(mon->data) && lawful-aligned.
// Minion alignment isn't tracked on our monster record, so this drops the
// "&& lawful" restriction — the only effect is exempting a (very rare,
// never-recorded) non-lawful minion from scaring too, which is conservative
// (never wrongly excludes a candidate square C would have kept).
function is_lminion(mon) { return is_minion(mon.data); }
// C ref: monst.h is_vampshifter(mon) = mon->cham in {vampire, vampire
// leader, Vlad}.  mon.cham is populated by makemon.js's vampire-shift code.
const PM_VAMPIRE = 226, PM_VAMPIRE_LEADER = 227, PM_VLAD_THE_IMPALER = 228;
function is_vampshifter(mon) {
    return mon.cham === PM_VAMPIRE || mon.cham === PM_VAMPIRE_LEADER
        || mon.cham === PM_VLAD_THE_IMPALER;
}
// C ref: mondata.h unique_corpstat(ptr) = ptr->geno & G_UNIQ.
const G_UNIQ = 0x1000;
function unique_corpstat(ptr) { return !!ptr && ((ptr.geno ?? 0) & G_UNIQ) !== 0; }
// C ref: shk.c/priest.c — no in-temple detection is wired (mirrors the
// existing mon_in_shop() stub below); a hostile priest standing in its own
// (unconverted) temple is the only case this affects, and it is not reachable
// in the recorded sessions.
function inhistemple(_mon) { return false; }
// C ref: mondata.h passes_bars(ptr) = passes_walls||amorphous||unsolid||
// is_whirly||verysmall||dmgtype(AD_RUST/AD_CORR)||metallivorous||
// (slithy&&!bigmonst).  Only the two cheapest/most common disjuncts are
// modeled (wall-passers, tiny creatures); IRONBARS terrain (Vlad's Tower)
// never appears in the recorded sessions, so this is untestable in practice.
function passes_bars(ptr) { return passes_walls(ptr) || !!ptr?.verysmall; }
// C ref: mon.c monhaskey(mon, quietly) — does mon carry an unlocking tool?
const SKELETON_KEY_OTYP = 221, LOCK_PICK_OTYP = 222, CREDIT_CARD_OTYP = 223;
function monhaskey(mon) {
    return !!(m_carrying(mon, SKELETON_KEY_OTYP) || m_carrying(mon, LOCK_PICK_OTYP)
        || m_carrying(mon, CREDIT_CARD_OTYP));
}
function Inhell() {
    return (game.u?.uz?.dnum ?? 0) === (game.gehennom_dnum ?? GEHENNOM);
}
// C ref: mkobj.c sobj_at(otyp, x, y) — generic floor-object-type lookup (the
// same pattern as sobj_at_boulder above, parameterized on otyp).
function sobj_at_otyp(x, y, otyp) {
    const objs = game.level?.objects;
    if (!objs) return false;
    for (const o of objs)
        if (o.where === 'floor' && o.ox === x && o.oy === y && o.otyp === otyp)
            return true;
    return false;
}
// C ref: monmove.c:241 onscary(x, y, mtmp) — is (x,y) a scare-monster source
// (Elbereth engraving / scroll of scare monster / vampire-on-altar) for
// mtmp?  Feeds mfndpos's ALLOW_SSM candidate gate.  Two cases are never
// reachable and thus not modeled: `Displaced` (no displacement item is
// tracked) and `ep->guardobjects` (Vlad's Tower guard exemption); the
// Elbereth match also doesn't model gradual engraving decay (any surviving
// "Elbereth" substring counts, matching the common case).
export function onscary(x, y, mtmp) {
    const auditory_scare = (x === 0 && y === 0);
    const magical_scare = !auditory_scare;
    if (mtmp.iswiz || is_lminion(mtmp) || mtmp.data?.name === 'Angel'
        || is_rider(mtmp.data))
        return false;
    if (magical_scare
        && (mtmp.data?.mcls === S_HUMAN_MCLS || unique_corpstat(mtmp.data)))
        return false;
    if ((mtmp.isshk && inhishop(mtmp)) || (mtmp.ispriest && inhistemple(mtmp)))
        return false;
    if (auditory_scare) return true;
    if (IS_ALTAR(terrainTyp(x, y))
        && (mtmp.data?.mcls === S_VAMPIRE_MCLS || is_vampshifter(mtmp)))
        return true;
    if (sobj_at_otyp(x, y, SCR_SCARE_MONSTER)) return true;
    const ep = engr_at(x, y);
    const hasElbereth = !!ep && ep.engr_type !== HEADSTONE
        && (ep.actualText || '').includes('Elbereth');
    return hasElbereth
        && u_at(x, y) /* Displaced not modeled */
        && !(mtmp.isshk || mtmp.isgd || !mtmp.mcansee || mtmp.mpeaceful
             || mtmp.data?.name === 'minotaur' || Inhell() || In_endgame());
}

// ── web spinning (monmove.c:1240-1288) ──────────────────────────────────────
// C ref: monmove.c holds_up_web(x, y) — a square that can anchor a web edge:
// off-map, obstructed terrain, an UP staircase/ladder, or iron bars.
function holds_up_web(x, y) {
    if (!isok(x, y)) return true;
    const typ = terrainTyp(x, y);
    if (typ == null) return true;
    if (IS_OBSTRUCTED(typ)) return true;
    // C ref: `(sway = stairway_at(x, y)) != 0 && sway->up` — only an UP staircase
    // or ladder anchors a web.  Stairways live on game.stairs with .sx/.sy/.up
    // (see dungeon.js On_stairs).
    if (typ === STAIRS || typ === LADDER) {
        // game.stairs is a singly-linked list (mklev.js stairway_add), not an
        // array — iterating it with for..of threw.  Unreachable until a WEB
        // spider was actually placed on the level, which is why it survived.
        for (let s = game.stairs; s; s = s.next)
            if (s.sx === x && s.sy === y && s.up) return true;
    }
    if (typ === IRONBARS) return true;
    return false;
}

// C ref: monmove.c count_webbing_walls(x, y) — the FOUR orthogonal neighbours
// only (no diagonals).
function count_webbing_walls(x, y) {
    return holds_up_web(x, y - 1) + holds_up_web(x + 1, y)
         + holds_up_web(x, y + 1) + holds_up_web(x - 1, y);
}

// C ref: trap.c count_traps(ttyp) — how many traps of a type are on the level.
function count_traps_web() {
    let n = 0;
    for (const t of (game.level?.traps || [])) if (t.ttyp === WEB) n++;
    return n;
}

// C ref: mondata.h webmaker(ptr) == (ptr == &mons[PM_CAVE_SPIDER]
//                                    || ptr == &mons[PM_GIANT_SPIDER]).
// pmidx IS the C monster index (verified by swarm/bin/gen-monflags.mjs), so these
// are the real PM_ values: 94 cave spider, 96 giant spider (95 is centipede).
const PM_CAVE_SPIDER = 94;
const PM_GIANT_SPIDER = 96;

// C ref: monmove.c maybe_spin_web(mtmp), called from postmov for MMOVE_MOVED and
// MMOVE_DONE alike (monmove.c:1690).  Cave spiders and giant spiders roll
// rn2(1000) EVERY move they complete, so omitting it desynced the stream from the
// first spider onward — seed0399 step 117 is a giant spider's roll.  The d(4,4)
// cooldown draw only happens when the web is actually created.
function webmaker(ptr) {
    return ptr?.pmidx === PM_CAVE_SPIDER || ptr?.pmidx === PM_GIANT_SPIDER;
}
async function maybe_spin_web(mtmp) {
    if (!webmaker(mtmp.data) || mon_helpless(mtmp) || mtmp.mspec_used
        || t_at(mtmp.mx, mtmp.my))
        return;
    // C ref: monmove.c soko_allow_web(mon) — unrestricted off Sokoban.  The
    // Sokoban restriction ("web only where the spinner can see the up stairs")
    // is not reachable: no Sokoban level in the corpus holds a web spinner.
    if (game.level?.flags?.sokoban) return;
    const prob = (((mtmp.data?.pmidx === PM_GIANT_SPIDER) ? 15 : 5)
                  * (count_webbing_walls(mtmp.mx, mtmp.my) + 1))
               - (3 * count_traps_web());
    if (rn2(1000) < prob) {
        const trap = await maketrap(mtmp.mx, mtmp.my, WEB);
        if (trap) {
            mtmp.mspec_used = d(4, 4); // 4..16
            if (cansee(mtmp.mx, mtmp.my)) {
                // C: upstart(canspotmon ? y_monnam(mtmp) : something).  y_monnam
                // only differs from mon_nam for a TAME monster ("your" vs "the"),
                // and no corpus session has a tame web spinner, so Monnam's
                // already-capitalised "The <mon>" is the same string here.
                // C: pline() -> update_topl(), so an unacknowledged topline gets
                // its --More-- before this replaces it.
                await update_topl(`${canspotmon(mtmp) ? Monnam(mtmp) : 'Something'} spins a web.`);
                trap.tseen = 1;
            }
        }
    }
}

// C ref: mondata.h hides_under(ptr) = (mflags1 & M1_CONCEAL).  The monster
// data here carries no mflags1, so identify the concealing species by pmidx
// (the 8 M1_CONCEAL entries in include/monsters.h: cave spider, centipede,
// scorpion, garter snake, snake, water moccasin, pit viper, cobra).
const M1_CONCEAL_PMIDX = new Set([94, 95, 97, 214, 215, 216, 218, 219]);
export function hides_under_pm(ptr) {
    return ptr != null && M1_CONCEAL_PMIDX.has(ptr.pmidx);
}

// C ref: monsym.h S_EEL=57.  C ref: monst.h helpless(mon) = msleeping||!mcanmove.
const S_EEL_MCLS = 57;
function mon_helpless(mtmp) {
    return !!mtmp.msleeping || !mtmp.mcanmove;
}

// C ref: mondata.h breathless(ptr) = (mflags1 & M1_BREATHLESS) — golems,
// elementals, vortices, gas spores, etc.  makemon carries no mflags1 and none
// of the shallow-depth species reachable by the modeled sessions (pets,
// dungeon vermin/humanoids) are breathless, so this is always false here.
function breathless(_ptr) { return false; }

// C ref: monmove.c:2121 can_hide_under_obj(obj) — a monster can hide under a
// floor object unless: there's no object, it sits on a non-pit trap, or the
// only thing here is a small (<10) coin stack.  Operates on the topmost object
// at <x,y> (our level.objects has one record per pile here, like C's fobj).
function can_hide_under_obj_at(x, y) {
    const objs = (game.level?.objects || []).filter((o) => o.ox === x && o.oy === y);
    if (objs.length === 0) return false; // !obj || not OBJ_FLOOR
    // can't hide on a non-pit trap site
    const t = t_at(x, y);
    if (t && !is_pit(t.ttyp)) return false;
    // coins: need >= 10 total unless a non-coin object is also present
    const hasNonCoin = objs.some((o) => o.oclass !== COIN_CLASS);
    if (!hasNonCoin) {
        let coinquan = 0;
        for (const o of objs) coinquan += (o.quan || 1);
        if (coinquan < 10) return false;
    }
    return true;
}

// C ref: mondata.c locomotion(ptr, def) — the movement verb for a monster.
// Only the branches reachable for the concealing (M1_CONCEAL) hiders are
// modelled: snakes/nagas (M1_SLITHY) "slither", everything else falls back to
// `def` ("hide").  (Floaters/flyers/amorphous/immobile/nolimbs hiders aren't
// placed in the low-level slice.)  S_SNAKE==45, S_NAGA==40 (defsym.h).
function locomotion(ptr, def) {
    const slithy = ptr && (ptr.mcls === 45 || ptr.mcls === 40);
    return slithy ? 'slither' : def;
}

// C ref: do_name.c y_monnam(mtmp) — mid-sentence monster name.  For a plainly
// visible hostile (non-tame, non-invisible, non-hallucinating) monster this is
// just "the <name>" (e.g. "the cobra").  The tame/peaceful/steed prefixes and
// hallucination aren't exercised by the concealing hiders here.
function y_monnam_local(mtmp) {
    return `the ${mtmp?.data?.name || 'creature'}`;
}

// C ref: objnam.c ansimpleoname(obj) — an(simpleoname(obj)); simpleoname for a
// plain floor object is its base type name (e.g. STATUE -> "statue"), and an()
// prepends the indefinite article ("a statue").
function ansimpleoname_topobj(x, y) {
    const objs = (game.level?.objects || []).filter((o) => o.ox === x && o.oy === y);
    if (!objs.length) return 'something';
    const otyp = objs[0].otyp;
    const name = OBJECTS?.[otyp]?.name || 'object';
    const vowel = /^[aeiou]/i.test(name);
    return `${vowel ? 'an' : 'a'} ${name}`;
}

// C ref: mon.c maybe_unhide_at(x,y) — called right after a monster's position is
// committed (before mintrap/door handling in postmov).  If the monster AT (x,y)
// was mundetected but can no longer stay hidden there (a hides_under species with
// no valid object on the new square, or trapped, or an eel that surfaced onto dry
// land), immediately re-run hideunder() to reset mundetected to FALSE.  This must
// happen BEFORE the later "re-hide?" gate (`mundetected || (!helpless && rn2(5))`)
// so that gate's OR correctly falls through to its rn2(5) term instead of
// short-circuiting on a stale mundetected=TRUE.  hideunder() itself consumes no
// RNG (only its caller's gate rolls); the hero (u_at) branch isn't modeled here,
// matching hideunder()'s own scope in this port.
async function maybe_unhide_at(x, y) {
    const m = m_at(x, y);
    if (!m || !m.mundetected) return;
    const ptr = m.data;
    const noLongerHidden =
        (hides_under_pm(ptr)
         && (!OBJ_AT(x, y) || m.mtrapped || !can_hide_under_obj_at(x, y)))
        || (ptr?.mcls === S_EEL_MCLS && !IS_POOL(terrainTyp(x, y)));
    if (noLongerHidden) await hideunder(m);
}

// C ref: mon.c hideunder(mtmp) — a just-moved concealing monster re-hides under
// the object on its square.  Only the non-eel M1_CONCEAL branch (cobra under a
// statue &c.) is modelled: set mundetected, and if the hero can see the monster
// announce "You see the <mon> <locomotion> under <object>." then newsym() so the
// now-hidden monster disappears from the map.  Consumes NO RNG.
export async function hideunder(mtmp) {
    const ptr = mtmp.data;
    const x = mtmp.mx, y = mtmp.my;
    const seeit = canseemon_mm(mtmp);
    let undetected = false;
    let seenobj = null;
    const t = t_at(x, y);
    if (mtmp === game.u?.ustuck) {
        /* can't hide while holding / held by the hero */
    } else if (mtmp.mtrapped || (t && !is_pit(t.ttyp))) {
        /* can't hide while trapped or on a non-pit trap */
    } else if (ptr?.mcls === S_EEL_MCLS) {
        /* aquatic hiders (eels) not exercised here */
    } else if (hides_under_pm(ptr) && OBJ_AT(x, y)
               && can_hide_under_obj_at(x, y)
               && !(IS_POOL(terrainTyp(x, y)) || IS_LAVA(terrainTyp(x, y)))) {
        if (seeit) seenobj = ansimpleoname_topobj(x, y);
        /* cockatrice-corpse skip loop omitted (no petrifying corpse here) */
        undetected = true;
    }

    const oldundet = !!mtmp.mundetected;
    // C ref: mon.c hideunder() emits You_see() BEFORE its trailing newsym().  In
    // C the screen shown at the message's --More-- still holds the monster glyph
    // because the tty buffer isn't rewritten until newsym() runs; the JS renderer
    // rebuilds each frame from monster state, so we must likewise defer flipping
    // mtmp.mundetected until AFTER the message so the monster is still drawn on
    // the captured --More-- frame, then hide it with newsym().  (No RNG here.)
    if (undetected && seeit && seenobj) {
        const locomo = locomotion(ptr, 'hide');
        const { update_topl } = await import('./display.js');
        await update_topl(`You see ${y_monnam_local(mtmp)} ${locomo} under ${seenobj}.`);
    }
    mtmp.mundetected = undetected ? 1 : 0;
    if (undetected !== oldundet) newsym(x, y);
    return undetected;
}

// C ref: trap.c floor_trigger(ttyp) — traps that only fire on a creature
// landing ON them from the floor (not flyers/floaters).  MAGIC_TRAP and the
// teleport / portal / web / poly / anti-magic traps are NOT floor triggers.
const FLOOR_TRIGGER = new Set([
    ARROW_TRAP, DART_TRAP, ROCKTRAP, SQKY_BOARD, BEAR_TRAP, LANDMINE,
    ROLLING_BOULDER_TRAP, SLP_GAS_TRAP, RUST_TRAP, FIRE_TRAP, PIT,
    SPIKED_PIT, HOLE, TRAPDOOR,
]);

// C ref: mondata.h is_flyer(ptr) = (mflags1 & M1_FLY); is_floater = S_EYE/
// floating eye.  Used by check_in_air() to let airborne monsters skip floor
// triggers.  Identify the M1_FLY species by pmidx (the contest's low-level
// flyers: bat/giant bat 49/50, fog cloud 220, lurker above 98, the gargoyle/
// winged species and the assorted demons/dragons aren't placed this shallow).
const M1_FLY_PMIDX = new Set([49, 50, 98, 220]);
function is_flyer(ptr) { return ptr != null && M1_FLY_PMIDX.has(ptr.pmidx); }
// C ref: mondata.h `#define is_floater(ptr) ((ptr)->mlet == S_EYE || (ptr)->mlet
// == S_LIGHT)`.  defsym.h MONSYM indices: S_EYE is 5 and S_LIGHT is 25 — this
// used to test `mcls === 18` with a comment claiming 18 was S_EYE.  18 is
// S_RODENT, so EVERY rodent (rat/rock mole/woodchuck) counted as airborne and
// therefore skipped EVERY floor trap via check_in_air(), while real floating
// eyes were never treated as floaters at all.  seed0030 seg6: a giant rat walked
// onto a trapdoor at (45,12) and, instead of falling through to Dlvl 4 and
// leaving the level as C's does, it shrugged the trap off and kept moving for
// the rest of the episode.
function is_floater(ptr) { return ptr != null && (ptr.mcls === 5 /* S_EYE */ || ptr.mcls === 25 /* S_LIGHT */); }

// C ref: trap.c check_in_air(mtmp, trflags) — is the monster airborne?  No
// HURTLING / TOOKPLUNGE / VIASITTING flags reach a monster that simply walked
// onto a trap, so this reduces to its species flight/float capability.
function mon_check_in_air(mtmp) {
    return is_floater(mtmp.data) || is_flyer(mtmp.data);
}

// C ref: mondata.c mon_knows_traps(mtmp, ttyp) — has this monster seen this
// trap type before?  mtrapseen is a bitmask, bit (ttyp-1).  Defaults to 0.
function mon_knows_traps(mtmp, ttyp) {
    const seen = mtmp.mtrapseen || 0;
    if (ttyp === ALL_TRAPS) return seen !== 0;
    if (ttyp === NO_TRAP) return seen === 0;
    return (seen & (1 << (ttyp - 1))) !== 0;
}

// C ref: mondata.c mon_learns_traps(mtmp, ttyp) — record knowledge of a trap.
function mon_learns_traps(mtmp, ttyp) {
    if (ttyp === ALL_TRAPS) { mtmp.mtrapseen = ~0; return; }
    if (ttyp === NO_TRAP) { mtmp.mtrapseen = 0; return; }
    mtmp.mtrapseen = (mtmp.mtrapseen || 0) | (1 << (ttyp - 1));
}

// C ref: trap.c mintrap(mtmp, mintrapflags) — a monster walks onto / is caught
// in a trap.  Returns a Trap_* code; we only need the faithful RNG side
// effects.  Only the "not yet trapped" path is exercised by the contest
// monsters (they aren't placed already-trapped); the trap-specific effects are
// dispatched per type, each consuming exactly the RNG the C effect consumes.
// Returns: 0 = Trap_Effect_Finished, 1 = Trap_Caught_Mon, 2 = Trap_Killed_Mon,
// 3 = Trap_Moved_Mon (we never produce the latter two for the modeled types).
export const Trap_Effect_Finished = 0, Trap_Caught_Mon = 1, Trap_Killed_Mon = 2,
             Trap_Moved_Mon = 3;
export async function mon_mintrap(mtmp) {
    const trap = t_at(mtmp.mx, mtmp.my);
    if (!trap) { mtmp.mtrapped = 0; return Trap_Effect_Finished; }

    // Already-trapped path (mtmp->mtrapped): the rn2(40) escape roll.  Our
    // monsters never arrive already-trapped via a normal move, but model it so
    // the structure is complete and faithful if it ever fires.
    if (mtmp.mtrapped) {
        // seetrap (no RNG) omitted; the escape roll:
        if (!rn2(40) || (is_pit(trap.ttyp) /* m_easy_escape_pit: no RNG */)) {
            mtmp.mtrapped = 0;
        }
        return mtmp.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished;
    }

    // Not-yet-trapped path.
    const tt = trap.ttyp;
    const already_seen = mon_knows_traps(mtmp, tt);

    // floor_trigger + airborne -> the trap doesn't fire (no RNG).
    if (FLOOR_TRIGGER.has(tt) && mon_check_in_air(mtmp))
        return Trap_Effect_Finished;
    // A monster that already knows this trap usually steps over it: rn2(4).
    if (already_seen && rn2(4))
        return Trap_Effect_Finished;

    mon_learns_traps(mtmp, tt);
    // mons_see_trap: no RNG.  trap->madeby_u is false for level-gen traps, so
    // the setmangry rnl(5) does not fire here.

    return mon_trapeffect(mtmp, trap);
}

// C ref: include/mondata.h passes_rocks(ptr) = passes_walls(ptr) && !unsolid.
// passes_walls tests M1_WALLWALK, which none of the mines-shallow species carry
// (gnome/dwarf/kobold etc.), so this is FALSE here.  makemon.js does not expose
// M1_WALLWALK; the only WALLWALK species (xorn/earth-elemental) aren't placed at
// this depth, so treat every modeled monster as non-wall-passing.
function passes_rocks(_ptr) { return false; }

// C ref: include/obj.h stone_missile(o) — a GEMSTONE/MINERAL missile that isn't
// a ring.  A trap-dropped ROCK (material MINERAL) qualifies.
function stone_missile(obj) {
    const mat = OBJECTS[obj.otyp]?.material;
    return (mat === 20 /* GEMSTONE */ || mat === 21 /* MINERAL */)
        && obj.oclass !== 4 /* RING_CLASS (objclass.h); 1 is ILLOBJ_CLASS */;
}

// C ref: worn.c find_mac(mdef) — base armour class of a monster with no worn
// armour (the mines-shallow / pet species here carry none).  makemon.js stores
// the LVL() base AC on mon.data.ac; C reads mdef->data->ac when nothing is worn.
function find_mac_mon(mon) {
    return mon?.data?.ac ?? 10;
}

// C ref: mondata.h nonliving(ptr) = is_undead || PM_MANES || weirdnonliving
// (golem / S_VORTEX).  These are "destroyed" rather than "killed" by monkilled().
// Elementals are LIVING in C, so they are "killed".  The pets/quadrupeds that
// die on traps here are living, so this returns false for them.
function nonliving_mm(mtmp) {
    const name = mtmp?.data?.name || '';
    return /\bzombie\b|\bmummy\b|\bskeleton\b|\bwraith\b|\bghoul\b|\bghost\b|\blich\b|\bvampire\b|golem\b|\bvortex\b|\bshade\b|\bmanes\b/.test(name);
}

// C ref: trap.c thitm(tlev, mon, obj, d_override, nocorpse) — a trap missile
// (or falling rock) strikes a monster.  When d_override is non-zero (the
// rock-trap / rolling-boulder path) the accuracy roll (rnd(20)) is skipped and
// the hit is forced for exactly that much damage; otherwise the strike is
// resolved by `find_mac(mon) + tlev + obj->spe <= rnd(20)` (the arrow/dart-trap
// path).  Returns TRUE if the monster is killed.  RNG-faithful: the d_override
// branch draws NO rnd(20); the missile path draws exactly one rnd(20) for the
// accuracy roll and, only on a hit, dmgval(obj,mon)'s dice; a kill draws
// corpse_chance()'s rn2 + make_corpse()'s object rolls (via mon_kill_leaving).
async function mon_thitm(tlev, mon, obj, d_override, nocorpse) {
    let strike;
    if (d_override) strike = 1;
    else if (obj) strike = (find_mac_mon(mon) + tlev + (obj.spe || 0) <= rnd(20)) ? 1 : 0;
    else strike = (find_mac_mon(mon) + tlev <= rnd(20)) ? 1 : 0;
    let trapkilled = false;
    // C: doname(obj) names the missile ("a dart", "a rock", "an arrow", ...).
    const missile = obj ? await mon_missile_name(obj) : '';
    if (!strike) {
        // Near-miss: obj && cansee -> "<Mon> is almost hit by <obj>!" (display).
        if (obj && cansee(mon.mx, mon.my))
            await pline_mon(mon, `${Monnam(mon)} is almost hit by ${missile}!`);
    } else {
        let dam = 1;
        const harmless = !!(obj && stone_missile(obj) && passes_rocks(mon.data));
        if (obj && cansee(mon.mx, mon.my))
            await pline_mon(mon, `${Monnam(mon)} is hit by ${missile}${harmless ? ' but is not harmed.' : '!'}`);
        if (d_override) dam = d_override;
        else if (obj) { dam = dmgval(obj, mon); if (dam < 1) dam = 1; }
        if (!harmless) {
            mon.mhp -= dam;
            if (mon.mhp <= 0) {
                const xx = mon.mx, yy = mon.my;
                // C: thitm() calls monkilled(mon, "", AD_PHYS/-AD_RBRE), which
                // prints "<Mon> is killed!" ("destroyed" for nonliving) when the
                // death is visible — fltxt="" is non-NULL, so the message always
                // shows on a seen kill.  Routed through update_topl so it appends
                // to a still-pending topline (e.g. a pet's "<pet> falls into a
                // pit!  <pet> is killed!").
                if (cansee(mon.mx, mon.my))
                    await pline_mon(mon, `${Monnam(mon)} is ${nonliving_mm(mon) ? 'destroyed' : 'killed'}!`);
                mon_kill_leaving(mon, nocorpse);           // mondied -> mondead
                if (DEADMONSTER(mon)) { newsym(xx, yy); trapkilled = true; }
            }
        } else {
            strike = 0; // harmless; don't use up the missile
        }
    }
    if (obj && (!strike || d_override)) {
        // C ref: thitm() -> place_object(obj) + stackobj(obj).  The missile
        // settles on the monster's square; C's stackobj then merges it INTO an
        // existing mergable floor stack at that cell (mkobj.c stackobj ->
        // merged(&existing, &new): the existing pile object survives with the
        // combined quantity and the fresh missile is consumed).  The net effect
        // is that the top-of-pile glyph reverts to whatever the missile landed on
        // (e.g. a trap-victim's corpse) instead of the freshly-fired missile.
        // The repo's global stackobj() indexes level.objects as a 2-D grid, but
        // this port keeps level.objects as a flat array (place_object/vobj_at),
        // so mirror C's merge inline (as uhitm.js relobj() already does for pet
        // drops) rather than route through the stale helper.
        obj.where = 'floor'; obj.ox = mon.mx; obj.oy = mon.my;
        const { mergable } = await import('./invent.js');
        const objs = game.level ? (game.level.objects || (game.level.objects = [])) : [];
        let dest = null;
        for (const f of objs) {
            if (f !== obj && f.where === 'floor' && f.ox === mon.mx && f.oy === mon.my
                && mergable(f, obj)) { dest = f; break; }
        }
        if (dest) {
            // merged(&dest, &obj): dest keeps its pile slot, absorbs obj's quan.
            dest.quan = (dest.quan || 1) + (obj.quan || 1);
            dest.owt = weight(dest);
            obj.where = 'free'; // obj_extract_self: the consumed missile leaves the floor
        } else {
            place_object(obj, mon.mx, mon.my);
        }
    }
    return trapkilled;
}

// C ref: trap.c thitm() names the missile with doname(obj); doname_invent is our
// full doname (enchantment / BUC when known, quantity otherwise).  A fresh
// trap-launched missile is quan==1, unidentified, spe 0 -> "a dart" / "a rock".
async function mon_missile_name(obj) {
    const { doname_invent } = await import('./invent.js');
    return doname_invent(obj);
}

// C ref: mon.c monkilled(mdef,"",AD_PHYS) -> mondied() -> mondead() [detach] +
// (corpse_chance() && accessible) make_corpse().  The falling-rock kill is a
// plain physical death (not disintegrated), so it may leave a cadaver.  mondead
// draws no RNG for the mines-shallow species (no S_KOP/steam-vortex/vampshifter);
// corpse_chance()'s rn2 and make_corpse()'s next_ident + rndmonnum + corpse
// timeout are the only draws, matching C's trace.
function mon_kill_leaving(mon, nocorpse) {
    mon.mhp = 0;
    // mondead(): detach the monster so the renderer stops drawing it.  Coords
    // are left intact for make_corpse() to place the cadaver.
    const mx = mon.mx, my = mon.my;
    const list = game.level?.monsters;
    if (list) {
        const idx = list.indexOf(mon);
        if (idx >= 0) list.splice(idx, 1);
    }
    // mondied(): corpse_chance() rolls its rn2; on success (and accessible
    // terrain) make_corpse() builds the cadaver.  nocorpse (disintegration)
    // suppresses the cadaver entirely with no corpse_chance roll.
    if (nocorpse) return;
    const dropCorpse = corpse_chance(mon);                 // mon.c:3248 rn2(tmp)
    if (dropCorpse && mx > 0 && my >= 0 && mon_accessible(mx, my))
        make_corpse(mon, mx, my);
}

// C ref: monmove.c accessible(x,y) — ACCESSIBLE(typ) == typ >= DOOR (open) for
// corpse placement; pools also hold corpses but a rock trap is on dry floor.
function mon_accessible(x, y) {
    const typ = game.level?.at(x, y)?.typ;
    return typ != null && typ >= DOOR;
}

// C ref: pline_mon(mon,...) -> vpline -> update_topl (topl.c).  A monster-
// attributed message pages a still-unacknowledged top line with --More-- (and
// appends after it when both fit) exactly as C's topl buffer does, so it must
// route through update_topl, NOT the raw pline that merely overwrites the line.
// This is what lets a trap's "<pet> is almost hit by a dart!" page the pet's
// still-pending "<pet> steps reluctantly onto <obj>." line with --More--, as C
// records.  _toplin is reset per command (cmd.js rhack), so the paging is
// confined to the current turn — cross-turn messages start a fresh line.
async function pline_mon(_mon, msg) {
    const { update_topl } = await import('./display.js');
    await update_topl(msg);
}

// C ref: trap.c trapeffect_selector() for a non-youmonst monster.  Dispatch on
// trap type; each branch reproduces exactly the RNG the monster path consumes.
// Implemented incrementally as the sessions exercise each trap type.
async function mon_trapeffect(mtmp, trap) {
    switch (trap.ttyp) {
    case ROCKTRAP: {
        // C ref: trapeffect_rocktrap() else-branch (monster), trap.c:1379.
        // A previously-triggered+seen trap has a 1-in-15 "nothing falls out"
        // dud; a freshly-triggered trap (trap.once == 0) short-circuits without
        // the rn2(15).  Then a ROCK missile is created (t_missile -> mksobj
        // next_ident + mksobj_init), and thitm(0, mon, rock, d(2,6), FALSE)
        // resolves the falling-rock hit (forced by the d(2,6) override).
        if (trap.once && trap.tseen && !rn2(15)) {
            deltrap_local(trap);
            newsym(mtmp.mx, mtmp.my);
            return Trap_Effect_Finished;
        }
        trap.once = 1;
        const otmp = t_missile(ROCK, trap);
        // if (in_sight) seetrap(trap): reveal the trap to a watching hero (no RNG).
        if (cansee(mtmp.mx, mtmp.my)) {
            const { seetrap } = await import('./trap.js');
            seetrap(trap);
        }
        const dam = d(2, 6);                               // trap.c:1393
        const trapkilled = await mon_thitm(0, mtmp, otmp, dam, false);
        return trapkilled ? Trap_Killed_Mon
            : (mtmp.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished);
    }
    case BEAR_TRAP: {
        // C ref: trapeffect_bear_trap() else-branch (monster), trap.c:1525.  A
        // solid, grounded monster larger than MZ_SMALL is caught: the "<Mon> is
        // caught in a bear trap!" topline (routed through update_topl so it pages
        // a still-pending message with --More--), seetrap, then a forced d(2,4)
        // hit via thitm.  (amorphous / whirly / unsolid escapes aren't reachable
        // for the quadruped pets/steeds that step onto bear traps here.)
        const mptr = mtmp.data;
        // Fall back to the mons[] table by pmidx for pets, whose .data record
        // (dog.js makedog_mon) doesn't carry its own msize.
        const msize = (mptr?.msize != null) ? mptr.msize : (mon_msize(mptr?.pmidx) ?? 2 /* MZ_MEDIUM */);
        const in_sight = canseemon_mm(mtmp) || mtmp === game.u?.usteed;
        if (msize > 1 /* MZ_SMALL */ && !mon_check_in_air(mtmp)) {
            mtmp.mtrapped = 1;
            if (in_sight) {
                const { update_topl } = await import('./display.js');
                const a_your = trap.madeby_u ? 'your' : 'a';
                await update_topl(`${Monnam(mtmp)} is caught in ${a_your} bear trap!`);
                const { seetrap } = await import('./trap.js');
                seetrap(trap);
            }
        }
        // C ref: trap.c:1553 — mtmp->mtrapped && !wearing_iron_shoes -> thitm the
        // d(2,4) bite.  The pets/steeds here wear no iron shoes.
        if (mtmp.mtrapped) {
            const dam = d(2, 4);                           // trap.c:1554
            const trapkilled = await mon_thitm(0, mtmp, null, dam, false);
            return trapkilled ? Trap_Killed_Mon
                : (mtmp.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished);
        }
        return Trap_Effect_Finished;
    }
    case SQKY_BOARD: {
        // C ref: trapeffect_sqky_board() else-branch (monster), trap.c:1438.  A
        // monster steps on a squeaky board and it announces itself.  No RNG:
        // Soundeffect is an audio no-op and trapnote()/pline()/You_hear()/
        // wake_nearto() all draw nothing here (no buried zombies at this depth,
        // svc.context.mon_moving is set so wake_nearto_core's pet branch is
        // skipped) — it is purely a hero-facing sound message.
        const in_sight = canseemon_mm(mtmp) || mtmp === game.u?.usteed;
        const Deaf = !!game.u?.Deaf;
        const { trapnote, seetrap } = await import('./trap.js');
        if (in_sight) {
            if (!Deaf) {
                await pline_mon(mtmp,
                    `A board beneath ${mon_nam(mtmp)} squeaks ${trapnote(trap, false)} loudly.`);
                seetrap(trap);
            }
            // The Deaf + in_sight sub-branch ("<Mon> stops momentarily and
            // appears to cringe.") needs mindless(mtmp->data); the pmidx
            // monster data here carries no mflags1 and Deaf never holds in the
            // modeled sessions, so it can't fire — left unmodeled.
        } else {
            // same near/far threshold as mzapmsg(): couldsee -> BOLT_LIM+1 else
            // BOLT_LIM-3, compared against mdistu (dist from hero) squared.
            const range = couldsee(mtmp.mx, mtmp.my) ? (BOLT_LIM + 1) : (BOLT_LIM - 3);
            const near = dist2(mtmp.mx, mtmp.my, game.u.ux, game.u.uy) <= range * range;
            if (!Deaf)
                await emitU(`You hear ${trapnote(trap, false)} squeak ${near ? 'nearby' : 'in the distance'}.`);
        }
        return Trap_Effect_Finished;
    }
    case MAGIC_TRAP:
        // C ref: trapeffect_magic_trap() else-branch — monsters are usually
        // immune; rn2(21)==0 redirects to the fire-trap effect.  The contest
        // roll is non-zero (leocrotta @ seed4500 step 222), so nothing further
        // happens.  If it ever rolls 0, fall through to the fire trap.
        if (!rn2(21)) {
            // trapeffect_fire_trap(mtmp,...) — not reached in the contest
            // sessions; leave unmodeled rather than guess its RNG.
        }
        return Trap_Effect_Finished;
    case ARROW_TRAP:
    case DART_TRAP: {
        // C ref: trapeffect_arrow_trap / trapeffect_dart_trap monster branch
        // (trap.c:1190 / :1245).  A monster steps onto a shooting trap: a
        // freshly-triggered trap (trap.once == 0) fires immediately; an already-
        // triggered+seen trap has a 1-in-15 dud ("triggers a trap but nothing
        // happens").  The missile is created (t_missile -> mksobj), the dart-only
        // 1-in-6 poison roll fires, seetrap reveals the trap to a watcher, then
        // thitm(tlev, mon, missile, 0, FALSE) resolves the accuracy roll: tlev is
        // 8 for an arrow, 7 for a dart.  On a miss "<Mon> is almost hit by <obj>!"
        // and the missile lands on the floor (where a pet can later apport it).
        const in_sight = canseemon_mm(mtmp) || mtmp === game.u?.usteed;
        const see_it = cansee(mtmp.mx, mtmp.my);
        if (trap.once && trap.tseen && !rn2(15)) {
            if (in_sight && see_it)
                await pline_mon(mtmp, `${Monnam(mtmp)} triggers a trap but nothing happens.`);
            deltrap_local(trap);       // C: deltrap(trap)
            newsym(mtmp.mx, mtmp.my);
            // C returns Trap_Is_Gone; the trap is deleted and the monster is
            // neither killed nor caught, which for our caller is identical to
            // Trap_Effect_Finished (only Killed/Caught are acted on).
            return Trap_Effect_Finished;
        }
        trap.once = 1;
        const isdart = trap.ttyp === DART_TRAP;
        const otmp = t_missile(isdart ? DART : ARROW, trap);
        // C: dart trap rolls a 1-in-6 poison chance; the arrow trap does not.
        if (isdart && !rn2(6)) otmp.opoisoned = 1;             // trap.c:1273
        if (in_sight) {
            const { seetrap } = await import('./trap.js');
            seetrap(trap);
        }
        const trapkilled = await mon_thitm(isdart ? 7 : 8, mtmp, otmp, 0, false);
        return trapkilled ? Trap_Killed_Mon
            : (mtmp.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished);
    }
    case PIT:
    case SPIKED_PIT: {
        // C ref: trapeffect_pit() monster branch (trap.c:1965).  A grounded,
        // solid monster that walks onto a pit falls in: "<Mon> falls into a
        // pit!" (a_your keyed on trap->madeby_u, routed through update_topl so
        // it appends to a still-pending topline), seetrap, then a forced
        // thitm(0, mon, NULL, rnd(spiked ? 10 : 6), FALSE) resolves the fall
        // damage — a low-HP victim (e.g. a little dog) is killed outright,
        // yielding "<Mon> is killed!" appended on the same line and a corpse.
        // Flyers/floaters were already filtered by the check_in_air gate in
        // mon_mintrap, so the !grounded escape branch and the Sokoban/FORCETRAP
        // inescapable variants can't fire for the grounded quadrupeds that step
        // onto pits in these sessions.
        const mptr = mtmp.data;
        let relevant_spikes = trap.ttyp === SPIKED_PIT;
        const in_sight = canseemon_mm(mtmp) || mtmp === game.u?.usteed;
        // grounded(ptr) = !is_flyer && !is_floater && !is_clinger (clingers are
        // not placed this shallow, so treated as grounded).  Airborne monsters
        // were already returned by mon_mintrap's check_in_air gate.
        const grounded = !is_flyer(mptr) && !is_floater(mptr);
        if (!grounded)
            return Trap_Effect_Finished; /* avoids trap (non-Sokoban, no FORCETRAP) */
        if (!passes_walls(mptr))
            mtmp.mtrapped = 1;
        if (in_sight) {
            const a_your = trap.madeby_u ? 'your' : 'a';
            await pline_mon(mtmp, `${Monnam(mtmp)} falls into ${a_your} pit!`);
            const { seetrap } = await import('./trap.js');
            seetrap(trap);
        }
        // mselftouch (petrification while falling) requires a wielded/worn
        // cockatrice corpse — none for the pets/quadrupeds here, so no RNG.
        // wearing_iron_shoes (would clear relevant_spikes) is likewise never
        // true for these victims.
        let trapkilled = false;
        if (DEADMONSTER(mtmp)
            || await mon_thitm(0, mtmp, null, rnd(relevant_spikes ? 10 : 6), false))
            trapkilled = true;
        return trapkilled ? Trap_Killed_Mon
            : (mtmp.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished);
    }
    case HOLE:
    case TRAPDOOR: {
        // C ref: trap.c trapeffect_hole() monster branch (trap.c:2012-2064) ->
        // trapeffect_level_telep() -> teleport.c mlevel_tele_trap().  A grounded
        // monster that steps on a trapdoor/hole LEAVES THE LEVEL: mlevel_tele_trap
        // takes trap->dst (set by hole_destination() when the trap was made) and
        // migrate_to_level()s the monster away, returning Trap_Moved_Mon.
        //
        // This consumes NO RNG for a hostile: teleport_pet() returns TRUE
        // immediately for a non-tame monster (it only prompts about pets), and
        // clamp_hole_destination() is arithmetic.  What matters for parity is that
        // the monster STOPS BEING PROCESSED — it drops out of fmon, so every later
        // movemon pass makes one fewer mcalcmove/distfleeck draw.  Leaving it on
        // the level (the old `default:` fall-through) silently kept an extra
        // monster alive for the rest of the episode.
        if (!Can_fall_thru(game.u?.uz))
            return Trap_Effect_Finished;
        // C: `if (!grounded(mptr) || (wormno && count_wsegs > 5) || msize >= MZ_HUGE)`
        // -> without FORCETRAP/Sokoban the monster simply doesn't fall.  grounded()
        // is !is_flyer && !is_floater && !is_clinger; no clinger (piercer) reaches
        // a floor trigger, so the flyer/floater tests carry it.
        const MZ_HUGE = 4; // monflag.h MZ_HUGE (7 is MZ_GIGANTIC)
        const hptr = mtmp.data;
        const msz = (hptr?.msize != null) ? hptr.msize : (mon_msize(hptr?.pmidx) ?? 2);
        if (is_flyer(hptr) || is_floater(hptr) || msz >= MZ_HUGE)
            return Trap_Effect_Finished;
        // migrate_to_level(): detach from this level's monster chain.  Our port
        // does not simulate other levels' monsters, so dropping it here IS the
        // faithful observable outcome.
        const list = game.level?.monsters;
        if (list) {
            const ix = list.indexOf(mtmp);
            if (ix >= 0) list.splice(ix, 1);
        }
        newsym(mtmp.mx, mtmp.my);
        return Trap_Moved_Mon;
    }
    case SLP_GAS_TRAP: {
        // C ref: trapeffect_slp_gas_trap() monster branch (trap.c:1579-1589).
        // Guarded by resists_sleep/breathless/helpless (no RNG); on a pass,
        // sleep_monst(mtmp, rnd(25), -1) rolls the nap duration — the ONE RNG
        // draw this path consumes — and, if it actually put the monster to
        // sleep (resists_sleep/AD_SLEE-defended targets already got filtered
        // above, so sleep_monst's own checks always pass here) and the hero
        // can see it, announces "<Mon> suddenly falls asleep!" + seetrap.
        const in_sight = canseemon_mm(mtmp) || mtmp === game.u?.usteed;
        if (!resists_sleep(mtmp) && !breathless(mtmp.data) && !mon_helpless(mtmp)) {
            const amt = rnd(25);                                // trap.c:1584
            if (await sleep_monst(mtmp, amt, -1) && in_sight) {
                await pline_mon(mtmp, `${Monnam(mtmp)} suddenly falls asleep!`);
                const { seetrap } = await import('./trap.js');
                seetrap(trap);
            }
        }
        return Trap_Effect_Finished;
    }
    default:
        // Trap type not yet modeled for monsters.  Consume no RNG and let the
        // monster pass; add the faithful effect here when a session needs it.
        return Trap_Effect_Finished;
    }
}

// C ref: trap.c deltrap(trap) — remove a trap from the level trap list.  Local
// helper (trap.js's deltrap is not exported); mirrors its splice + no RNG.
function deltrap_local(trap) {
    const traps = game.level?.traps;
    if (traps) {
        const idx = traps.indexOf(trap);
        if (idx >= 0) traps.splice(idx, 1);
    }
}

// C ref: monmove.c postmov() — the door-opening block run after a monster
// steps onto a door square (the sequencing quirk: the monster is moved onto
// the door first, then the door is dealt with).  Opens a closed door,
// unlocks+opens a locked one (key-carriers / Wizard / Riders), or smashes it
// down (doorbusters), announcing the result to a hero who can see it
// ("<mon> opens a door.") or, failing that, hear it ("You hear a door
// open.").  UnblockDoor sets the doormask, redraws the square, retires the
// square's LOS blockage (recalc_block_point) and re-runs vision_recalc(0).
// The amorphous flow-under case and the D_TRAPPED explosion (mb_trapped)
// don't occur at the depths these sessions reach, so they're left as
// documented no-ops.
//
// The recalc_block_point() step is load-bearing and easy to miss: while the
// door was CLOSED it blocked light, and NetHack's vision algorithm always
// grants IN_SIGHT to a blocking square that bounds a lit region the hero can
// see (that is how you see a lit room's walls from inside).  The instant it
// opens it becomes a transparent square, so it is only seen when there is a
// genuine clear LOS to it — which, for a door in a room's wall, there usually
// ISN'T from anywhere but straight on.  Skipping the recalc leaves the door
// "wall-visible", which both mis-renders the monster standing in the doorway
// and flips the canseeit/canspotmon feedback from "You see a door open." to
// "<Mon> opens a door.".
async function m_move_door(mtmp, ptr, can_open, can_unlock, can_tunnel) {
    const here = game.level?.at(mtmp.mx, mtmp.my);
    // C: IS_DOOR(...) && !passes_walls(ptr) && !can_tunnel  (tunnellers dig
    // through below instead of opening).
    if (!here || !IS_DOOR(here.typ) || passes_walls(ptr) || can_tunnel) return;
    const btrapped = (here.doormask & D_TRAPPED) !== 0;
    const verbose = game.flags?.verbose !== false;
    const Deaf = !!game.u?.Deaf;
    // canseeit: is the door square visible to the hero?  didseeit caches the
    // pre-open value; UnblockDoor refreshes canseeit after vision_recalc().
    const didseeit = cansee(mtmp.mx, mtmp.my);
    let canseeit = didseeit;
    // C ref: monmove.c:1528 UnblockDoor(where,who,what) — doormask, newsym,
    // recalc_block_point, vision_recalc(0), then refresh canseeit.  The
    // recalc_block_point() step is what actually makes the opened door
    // transparent in viz_clear; without it vision_recalc() still treats the
    // square as opaque, so everything beyond the doorway stays out of the
    // hero's line of sight (no infravision glyph, and the pet's own
    // sight-driven move choices diverge from C's).
    const UnblockDoor = (what) => {
        here.doormask = what;
        newsym(mtmp.mx, mtmp.my);
        recalc_block_point(mtmp.mx, mtmp.my);
        vision_recalc(0);
        canseeit = didseeit || cansee(mtmp.mx, mtmp.my);
    };
    // amorphous monsters (fog cloud / oozes) flow under a shut door without
    // opening it; none appear at these depths.
    const amorphous = false;
    if ((here.doormask & (D_LOCKED | D_CLOSED)) !== 0 && amorphous) {
        /* flows/oozes under the door — message only; unreached here */
    } else if ((here.doormask & D_LOCKED) !== 0 && can_unlock) {
        UnblockDoor(!btrapped ? D_ISOPEN : D_NODOOR);
        if (!btrapped && verbose) {
            if (canseeit && canspotmon(mtmp)) await emitU(`${Monnam(mtmp)} unlocks and opens a door.`);
            else if (canseeit) await emitU('You see a door unlock and open.');
            else if (!Deaf) await emitU('You hear a door unlock and open.');
        }
    } else if (here.doormask === D_CLOSED && can_open) {
        UnblockDoor(!btrapped ? D_ISOPEN : D_NODOOR);
        if (!btrapped && verbose) {
            if (canseeit && canspotmon(mtmp)) await emitU(`${Monnam(mtmp)} opens a door.`);
            else if (canseeit) await emitU('You see a door open.');
            else if (!Deaf) await emitU('You hear a door open.');
        }
    } else if ((here.doormask & (D_LOCKED | D_CLOSED)) !== 0) {
        // doorbuster (is_giant): the resulting state is D_NODOOR when trapped
        // or (locked and rn2(2)), else D_BROKEN.
        const mask = (btrapped || (((here.doormask & D_LOCKED) !== 0) && !rn2(2))) ? D_NODOOR : D_BROKEN;
        UnblockDoor(mask);
        if (!btrapped && verbose) {
            if (canseeit && canspotmon(mtmp)) await emitU(`${Monnam(mtmp)} smashes down a door.`);
            else if (canseeit) await emitU('You see a door crash open.');
            else if (!Deaf) await emitU('You hear a door crash open.');
        }
    }
}

// C ref: mon.c:2064 mon_allowflags(mtmp) — the base candidate-list flag
// bitmask for a monster's OWN generic move (m_move's non-dog/non-shk/
// non-priest path; dog_move/shk_move/pri_move compute their own flags
// directly, matching C).  can_tunnel is recomputed HERE independently of
// m_move's own local can_tunnel (mon.c duplicates the "don't tunnel if
// hostile and adjacent" suppression rather than sharing monmove.c's copy —
// see mon.c:2071-2078 vs monmove.c:1911).
function mon_allowflags(mtmp) {
    let allowflags = 0;
    const ptr = mtmp.data;
    const can_open = mon_can_open_door(mtmp);
    const can_unlock = (can_open && monhaskey(mtmp)) || !!mtmp.iswiz || is_rider(ptr);
    const doorbuster = is_giant(ptr);
    let can_tunnel = tunnels(ptr) && !Is_rogue_level();
    const Conflict = false; // not modeled
    if (can_tunnel && needspick(ptr)
        && ((!mtmp.mpeaceful || Conflict)
            && dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy) <= 8))
        can_tunnel = false;

    if (mtmp.mtame) allowflags |= ALLOW_M | ALLOW_TRAPS | ALLOW_SANCT | ALLOW_SSM;
    else if (mtmp.mpeaceful) allowflags |= ALLOW_SANCT | ALLOW_SSM;
    else allowflags |= ALLOW_U; // (Conflict-driven ALLOW_U for a hostile-to-all mon: not modeled)
    if (mtmp.isshk) allowflags |= ALLOW_SSM;
    if (mtmp.ispriest) allowflags |= ALLOW_SSM | ALLOW_SANCT;
    if (passes_walls(ptr)) allowflags |= ALLOW_WALL;
    if (mon_allows_rock(mtmp)) allowflags |= ALLOW_ROCK;
    if (can_tunnel) allowflags |= ALLOW_DIG;
    if (doorbuster) allowflags |= BUSTDOOR;
    if (can_open) allowflags |= OPENDOOR;
    if (can_unlock) allowflags |= UNLOCKDOOR;
    if (passes_bars(ptr)) allowflags |= ALLOW_BARS;
    if (is_minion(ptr) || is_rider(ptr)) allowflags |= ALLOW_SANCT;
    if (is_unicorn(ptr) && !noteleport_level()) allowflags |= NOTONL;
    if (is_human(ptr) || ptr?.name === 'minotaur') allowflags |= ALLOW_SSM;
    if ((is_undead(ptr) && ptr?.mcls !== S_GHOST_MCLS) || is_vampshifter(mtmp))
        allowflags |= NOGARLIC;
    return allowflags;
}

// C ref: monmove.c m_move(mtmp, after).  Returns one of the MMOVE_* codes;
// we only need the RNG side-effects (the mtrack-avoidance rn2(4*(cnt-j))
// rolls at monmove.c:1963) and the resulting move, so we implement the
// approach-the-hero path used by ordinary monsters.
const MMOVE_NOTHING = 0, MMOVE_NOMOVES = 1, MMOVE_MOVED = 2, MMOVE_DIED = 3;

async function m_move(mtmp) {
    const ptr = mtmp.data;
    let omx = mtmp.mx, omy = mtmp.my;

    // C ref: monmove.c:1733 — a trapped monster (e.g. a pet just caught in a
    // bear trap) first tries to break loose via mintrap (rn2(40) escape roll for
    // a bear trap).  Still caught -> it forfeits its move this turn (no further
    // RNG); this runs BEFORE the meating gate and the tame-pet dog_move dispatch.
    if (mtmp.mtrapped) {
        const i = await mon_mintrap(mtmp);
        if (i === Trap_Killed_Mon) { newsym(mtmp.mx, mtmp.my); return MMOVE_DIED; }
        if (i === Trap_Caught_Mon) return MMOVE_NOTHING;
    }

    // C ref: monmove.c:1764 — door-handling capability flags, consumed by
    // postmov() when the monster ends its move on a door square.
    //   can_open   = !(nohands(ptr) || verysmall(ptr))       [OPENDOOR]
    //   can_unlock = (can_open && monhaskey) || iswiz || is_rider
    //   can_tunnel = !Is_rogue_level && tunnels(ptr)
    // mon_can_open_door() already encodes C's can_open (CAN_OPEN_DOOR_PMIDX =
    // hands-bearing, not-tiny monsters).  No dlvl monster in the recorded runs
    // carries a key / is the Wizard / is a Rider, and monster tunnelling
    // (mdig_tunnel) is a separate unported subsystem, so can_unlock reduces to
    // iswiz and can_tunnel is FALSE here — matching every monster these
    // sessions drive through m_move.
    const can_open = mon_can_open_door(mtmp);
    const can_unlock = !!mtmp.iswiz;
    // C ref: monmove.c:1763 — can_tunnel = tunnels(ptr) when !Is_rogue_level.
    // A pick-wielding dwarf (or a rock mole) tunnels through rock/walls.  The
    // close-combat gate below (monmove.c:1911) then suppresses tunnelling when
    // the digger is hostile and adjacent enough to prefer swinging its weapon.
    let can_tunnel = !Is_rogue_level() && tunnels(ptr);

    // C ref: monmove.c:1745 — a monster busy eating (meating > 0, e.g. a pet that
    // just ate a corpse via dog_eat) decrements its digesting counter and forgoes
    // its move this turn.  This gate runs BEFORE the tame-pet dog_move delegation,
    // so an occupied pet does not scan/move (consumes no RNG).
    if (mtmp.meating) {
        mtmp.meating--;
        // finish_meating() side-effects (mfrozen clear, etc.) consume no RNG and
        // aren't observable for the contest pets; the counter reaching 0 simply
        // lets the pet move again next turn.
        return MMOVE_DONE; /* still eating */
    }

    // C ref: monmove.c:1773 — tame monsters delegate to dog_move() (dogmove.c).
    if (mtmp.mtame)
        return await dog_move(mtmp, 0);

    // C ref: monmove.c:1806 — a shopkeeper (isshk) / guard / priest delegates to
    // shk_move() / gd_move() / pri_move() BEFORE the generic getitems rn2(10)
    // probe below.  We model the shopkeeper.  shk_move returns 0 (stay put, no
    // RNG) for a peaceful shopkeeper sitting in his shop while the hero is not
    // lined up with him — the common case in the recorded sessions.  Other
    // returns (-1 "leave to m_move", or a moving result) fall through to the
    // generic path so the existing behaviour is preserved.
    if (mtmp.isshk) {
        const xm = await shk_move(mtmp);
        // C ref: monmove.c:1806-1823 — case -2: died; case 0/1: postmov with
        // MMOVE_NOTHING/MMOVE_MOVED respectively; case -1: `break` out to the
        // generic path below (mirrored by simply not returning here).
        if (xm === -2) return MMOVE_DIED;
        if (xm === 0) return MMOVE_NOTHING;
        if (xm === 1) {
            // C ref: monmove.c postmov() — mintrap() fires on the shk's new
            // square once move_special has actually moved it.
            const trapret = await mon_mintrap(mtmp);
            if (trapret === Trap_Killed_Mon) {
                if (mtmp.mx) newsym(mtmp.mx, mtmp.my);
                return MMOVE_DIED;
            }
            return MMOVE_MOVED;
        }
    }

    // C ref: monmove.c:1751 — hides-under early return.  A concealing monster
    // (M1_CONCEAL: spiders/snakes/scorpion/centipede) sitting on a hideable
    // floor object rolls rn2(10) and usually stays put (MMOVE_NOTHING) rather
    // than leave its hiding place.  This roll fires BEFORE set_apparxy and the
    // getitems probe.  (meating early return omitted: these mons aren't eating.)
    if (hides_under_pm(ptr) && OBJ_AT(omx, omy)
        && can_hide_under_obj_at(omx, omy) && rn2(10)) {
        return MMOVE_NOTHING; /* do not leave hiding place */
    }

    // goal = the hero's apparent position
    let ggx = mtmp.mux ?? game.u.ux;
    let ggy = mtmp.muy ?? game.u.uy;

    // appr: +1 approach, -1 flee, 0 wander.  C ref monmove.c:1858.
    // preferredrange_min/max are set by m_balks_at_approaching when appr==-2
    // (a throw-and-return weapon user holding a preferred range).
    let appr = mtmp.mflee ? -1 : 1;
    let preferredrange_min = 0, preferredrange_max = 0;
    if (mtmp.mconf) {
        appr = 0;
    } else {
        // C ref: monmove.c:1860 — should_see gates both the (b) Invis term of the
        // appr=0 disjunction and the `!should_see && can_track` gettrack redirect.
        //   should_see = couldsee(omx,omy)
        //             && (levl[ggx][ggy].lit || !levl[omx][omy].lit)
        //             && dist2(omx,omy,ggx,ggy) <= 36
        const should_see = couldsee(omx, omy)
            && (levl_lit(ggx, ggy) || !levl_lit(omx, omy))
            && (dist2(omx, omy, ggx, ggy) <= 36);

        // C ref: monmove.c:1862-1872 — the appr=0 disjunction, evaluated with C
        // short-circuit semantics.  Of its terms only two consume RNG:
        //   (b) should_see && Invis && !perceives(ptr) && rn2(11)
        //   (g) (PM_STALKER || S_BAT || S_LIGHT) && !rn2(3)
        // and term (b) is gated on the hero being invisible (Invis), which never
        // happens in these slices, so it draws nothing.  Term (g) DOES fire for a
        // hostile, sighted giant bat/stalker/light: it rolls rn2(3) (the bat
        // "flutters randomly" 1/3 of the time -> appr=0).  Reproduce the
        // short-circuit order: terms (a) !mcansee and (f) mpeaceful both force
        // appr=0 WITHOUT reaching (g), so the rn2(3) is only drawn when the
        // monster can see and is hostile.
        const ptrMcls = ptr?.mcls;
        const isStalkerBatLight =
            (ptr?.pmidx === PM_STALKER)   // monsndx(ptr) == PM_STALKER
            || (ptrMcls === S_BAT)        // ptr->mlet == S_BAT
            || (ptrMcls === S_LIGHT);     // ptr->mlet == S_LIGHT
        if (!mtmp.mcansee || mtmp.mpeaceful) {
            appr = 0;
        } else if (should_see && Invis() && !perceives(ptr) && rn2(11)) {
            appr = 0;
        } else if (isStalkerBatLight && !rn2(3)) {
            appr = 0;
        }

        // C ref: monmove.c:1873 — a leprechaun hoarding more gold than the hero
        // switches from approach to flee (no monster here is a leprechaun).
        if (appr === 1 && leppie_avoidance(mtmp))
            appr = -1;

        // C ref: monmove.c:1878 — hostiles with a ranged weapon/attack try to
        // keep their distance.  Draws ZERO rng.  This is THE missing call: for a
        // spitting cobra (AT_SPIT, mspec_used=0) it returns -1 so the monster
        // picks the farthest reachable square instead of closing in.
        ({ appr, prmin: preferredrange_min, prmax: preferredrange_max } =
            (() => {
                const r = m_balks_at_approaching(appr, mtmp);
                return { appr: r.appr, prmin: r.prmin, prmax: r.prmax };
            })());

        // C ref: monmove.c:1882 — if the monster can't actually see the hero
        // (should_see false: out of sight / >36 away / darkness) but can follow a
        // scent/track (can_track = haseyes || wields Excalibur), steer toward the
        // hero's last footprint square (gettrack) instead of the stale apparent
        // position.  A newt in a corridor 18 squares from a stationary hero
        // therefore follows the hero's trail (seed0002 step 86: the newt takes
        // the trail cell the hero last walked, not the geometrically-nearest
        // corridor cell).  This is a no-op when the monster can see the hero.
        // Correctness depends on the footprint ring (utrack) being per-level, the
        // same as C's save_track()/rest_track(): see goto_level(), which now
        // stashes+clears utrack on every level change so gettrack() never returns
        // a stale square from a previously-visited level.
        if (!should_see && can_track(ptr)) {
            const cp = gettrack(omx, omy);
            if (cp) { ggx = cp.x; ggy = cp.y; }
        }
    }

    // C ref monmove.c:1894 — getitems probe.  `!mpeaceful || !rn2(10)`: for
    // hostile monsters the first disjunct short-circuits (no roll); a peaceful
    // monster rolls rn2(10) (short-circuit: !mpeaceful is FALSE so !rn2(10) is
    // evaluated).  When the probe passes, C sets `getitems` unless the monster
    // is approaching (appr==1) AND lined up in throwing range.
    let getitems = false;
    if ((!mtmp.mpeaceful || !rn2(10)) && !Is_rogue_level()) {
        const mux = mtmp.mux ?? game.u.ux, muy = mtmp.muy ?? game.u.uy;
        // C ref: monmove.c:1896 in_line = lined_up(mtmp) && distmin <= (rocks?20:Str/2+1)
        const in_line = m_lined_up(mtmp)
            && (distmin(mtmp.mx, mtmp.my, mux, muy)
                <= (throws_rocks_pm(ptr) ? 20 : ((acurrstr() >> 1) + 1)));
        if (appr !== 1 || !in_line) getitems = true;
    }

    // C ref: monmove.c:1906 — if (getitems && m_search_items(...)) return postmov(...).
    // m_search_items scans nearby objects and, crucially, in finish_search it
    // flips a balking/fleeing monster (appr==-1) back to approach (appr=1) when
    // the hero is close (search radius was cut) but not adjacent — this is why a
    // ranged cobra keeps closing in rather than backing off at edist<25.
    if (getitems) {
        const g = { x: ggx, y: ggy }, ap = { appr };
        const done = m_search_items(mtmp, g, ap);
        ggx = g.x; ggy = g.y; appr = ap.appr;
        if (done) {
            // C ref: monmove.c:1906 — m_search_items set *mmoved = MMOVE_DONE and
            // returned TRUE because a grabbable object sits on the monster's own
            // square.  m_move then `return postmov(...)` with mmoved==MMOVE_DONE,
            // and postmov() (monmove.c:1660-1681) picks that object up via
            // mpickstuff() so it leaves the floor.  Without this, the monster
            // would sit on the item forever (m_search_items keeps returning done
            // every turn), never reaching the candidate loop — the seed0030
            // step-49 divergence (a gnome standing on a worthless glass gem).
            // C ref: monmove.c postmov():1660-1681 — meatmetal/meatobj run
            // BEFORE mpickstuff whenever OBJ_AT && mcanmove, for MMOVE_DONE
            // just as for MMOVE_MOVED (see the other call site below).
            if (OBJ_AT(mtmp.mx, mtmp.my) && mtmp.mcanmove) {
                if (metallivorous(ptr)) {
                    if (await meatmetal(mtmp) === 2) return MMOVE_DIED;
                }
                if (is_gelatinous_cube(ptr)) {
                    await meatobj(mtmp);
                }
            }
            mpickstuff(mtmp);
            // C ref: monmove.c postmov():1690 — maybe_spin_web runs for
            // MMOVE_DONE too, not just MMOVE_MOVED.
            await maybe_spin_web(mtmp);
            return MMOVE_DONE; // C: postmov returns mmoved (MMOVE_DONE); no attack
        }
    }

    // C ref: monmove.c:1911 — don't tunnel if hostile and close enough to
    // prefer a weapon.  (Conflict is not modeled for these sessions.)
    const Conflict = false;
    if (can_tunnel && needspick(ptr)
        && ((!mtmp.mpeaceful || Conflict)
            && dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy) <= 8))
        can_tunnel = false;

    // C ref: monmove.c:1918 flag = mon_allowflags(mtmp) — the FULL flag set
    // (ALLOW_U/SANCT/SSM by peaceful-vs-hostile, ALLOW_ROCK/WALL for
    // wall-passers, OPENDOOR/UNLOCKDOOR/BUSTDOOR, ALLOW_DIG (mon_allowflags
    // recomputes can_tunnel itself — a real duplicate calc in C too, see
    // mon.c:2071-2078, mirrored above at monmove.c:1911), ALLOW_BARS, NOTONL
    // for a noteleport-bound unicorn, NOGARLIC for undead/vampshifters).
    const flag = mon_allowflags(mtmp);
    const poss = mfndpos(mtmp, flag);
    const cnt = poss.length;
    if (cnt === 0) return MMOVE_NOMOVES;

    let nix = omx, niy = omy;
    let nidist = dist2(nix, niy, ggx, ggy);
    let chcnt = 0, chi = -1, mmoved = MMOVE_NOTHING;
    const jcnt = Math.min(MTSZ, cnt - 1);
    const mtrack = mtmp.mtrack || [];

    for (let i = 0; i < cnt; i++) {
        const nx = poss[i].x, ny = poss[i].y;

        // C ref: monmove.c:1953 — a peaceful/tame monster avoids the square the
        // hero just kicked (checked before the mtrack backtrack roll).  Inert for
        // hostiles (m_avoid_kicked_loc requires mpeaceful||mtame).
        if (m_avoid_kicked_loc(mtmp, nx, ny)) continue;

        if (appr !== 0) {
            // mtrack avoidance — the rn2(4*(cnt-j)) rolls (monmove.c:1963)
            let skip = false;
            for (let j = 0; j < jcnt; j++) {
                const trk = mtrack[j];
                if (trk && nx === trk.x && ny === trk.y) {
                    if (rn2(4 * (cnt - j))) { skip = true; break; }
                }
            }
            if (skip) continue;
        }

        const ndist = dist2(nx, ny, ggx, ggy);
        const nearer = ndist < nidist;
        // C ref: monmove.c:1971 — the square-selection disjunction.  appr==-2
        // (throw-and-return weapon) prefers to sit inside [prmin, prmax]:
        // step toward the hero while beyond prmax, away while inside prmin.
        if ((appr === 1 && nearer) || (appr === -1 && !nearer)
            || (!appr && !rn2(++chcnt))
            || (appr === -2
                && ((ndist <= preferredrange_min && !nearer)
                    || (ndist >= preferredrange_max && nearer)))
            || (mmoved === MMOVE_NOTHING)) {
            nix = nx; niy = ny; nidist = ndist; chi = i; mmoved = MMOVE_MOVED;
        }
    }

    if (mmoved === MMOVE_MOVED && (nix !== omx || niy !== omy)) {
        // C ref: monmove.c:1990 — before committing, a tunneller wields its
        // pick/axe if it needs one to dig the destination.  On the wield turn it
        // ends its move with NO move and NO RNG (invisible inside rock).
        if (m_digweapon_check(mtmp, nix, niy))
            return MMOVE_DONE;
        // record track history (most-recent first, length MTSZ)
        mtmp.mtrack = [{ x: omx, y: omy }, ...mtrack].slice(0, MTSZ);
        mtmp.mx = nix; mtmp.my = niy;
        // C ref: monmove.c:1655 maybe_unhide_at(mtmp->mx, mtmp->my) — runs right
        // after the position commit, before mintrap/door handling, so a stale
        // mundetected from the monster's OLD (hiding) square is cleared before
        // postmov's re-hide gate below re-evaluates it on the NEW square.
        await maybe_unhide_at(mtmp.mx, mtmp.my);
        // Redraw vacated + occupied squares (C: remove/place_monster + newsym).
        newsym(omx, omy);
        // C ref: monmove.c postmov() — after a monster moves, mintrap() fires
        // the trap (if any) at its new square.  This must run BEFORE the new
        // position is finalized for display so the trap's RNG lands in the
        // right place in the stream.
        const trapret = await mon_mintrap(mtmp);
        // C ref: monmove.c:1510 — `if (trapret == Trap_Killed_Mon || trapret ==
        // Trap_Moved_Mon) { ...; return MMOVE_DIED; }`.  BOTH outcomes end the
        // monster's postmov: a monster that fell through a trapdoor is no longer
        // on this level, so the door-opening / digging / meatmetal / re-hide
        // (rn2(5)) tail must NOT run for it.  Only checking Trap_Killed_Mon left
        // a migrated monster drawing one extra hideunder rn2(5) per departure.
        if (trapret === Trap_Killed_Mon || trapret === Trap_Moved_Mon) {
            newsym(nix, niy);
            return MMOVE_DIED;
        }
        // C ref: monmove.c postmov() — "open a door, or crash through it, if
        // 'mtmp' can".  The monster has already been stepped onto (nix,niy);
        // if that square is a door it can open/unlock/smash, do so now and
        // announce it (pline when spotted, "You see"/"You hear" otherwise).
        await m_move_door(mtmp, ptr, can_open, can_unlock, can_tunnel);
        // C ref: monmove.c:1644 — possibly dig.  The tunneller has already been
        // stepped onto its (rock) destination; carve it now.  mdig_tunnel draws
        // rnd(12) (+rn2(5) for a wall) and may drop a boulder/rock; propagate a
        // rare trapped-door death as MMOVE_DIED.
        if (can_tunnel && may_dig(mtmp.mx, mtmp.my)) {
            const died = await mdig_tunnel(mtmp);
            if (died) { newsym(mtmp.mx, mtmp.my); return MMOVE_DIED; }
        }
        // C ref: monmove.c:1656 — draw the monster at its new square BEFORE the
        // hideunder block, so a concealing monster that then hides is still shown
        // on the frame captured by hideunder()'s "You see ... slither under ..."
        // --More-- (its own newsym runs afterwards and removes it).
        newsym(nix, niy);
        // C ref: monmove.c postmov():1660-1681 — after the move (mmoved==MOVED),
        // if a grabbable object lies on the new square the monster picks it up
        // via mpickstuff().  This is THE turn a gnome/dwarf loots the gem it
        // stepped onto (goal was redirected there by m_search_items); without it
        // the item lingers and the monster re-detects it underfoot every future
        // turn, sitting still forever instead of moving on (seed0030 step-49).
        // mpickstuff draws no rng here, and it must run BEFORE the hideunder
        // rn2(5) below to preserve C's postmov ordering.  meatmetal/meatobj
        // (mon.c:1462/1533) run first, exactly as in C's postmov(): a
        // metallivorous hostile (rock mole/rust monster/xorn) or gelatinous
        // cube that just stepped onto an object pile eats/engulfs from it
        // here, before the mpickstuff loot check.  This is the RNG-relevant
        // piece — the obj_resists(zap.c:1469) rn2(100) cluster per pile item
        // (seed0002 step-232: ~20 draws per pass) was previously never
        // emitted, shifting every subsequent monster-move roll this turn.
        if (OBJ_AT(mtmp.mx, mtmp.my) && mtmp.mcanmove) {
            if (metallivorous(ptr)) {
                if (await meatmetal(mtmp) === 2) { newsym(mtmp.mx, mtmp.my); return MMOVE_DIED; }
            }
            if (is_gelatinous_cube(ptr)) {
                await meatobj(mtmp);
            }
        }
        if (OBJ_AT(mtmp.mx, mtmp.my) && mtmp.mcanmove)
            mpickstuff(mtmp);
        // C ref: monmove.c postmov():1690 — maybe_spin_web sits between the
        // pickup block and the re-hide block, for MMOVE_MOVED and MMOVE_DONE
        // alike.  Its rn2(1000) fires on every completed spider move.
        await maybe_spin_web(mtmp);
        // C ref: monmove.c postmov():1696 — a concealing (M1_CONCEAL) monster or
        // an eel that just moved re-hides: `if (mtmp->mundetected || (!helpless
        // && rn2(5))) hideunder(mtmp);`.  The rn2(5) fires whenever the monster
        // is revealed and not helpless (sleeping/frozen/can't-move).  Reproduce
        // the roll so the stream stays aligned (the seed4500 step-250 cobras).
        if (hides_under_pm(ptr) || ptr?.mcls === S_EEL_MCLS) {
            // C ref: monmove.c:1696 — `if (mtmp->mundetected || (!helpless(mtmp)
            // && rn2(5))) hideunder(mtmp);`.  rn2(5) is rolled only when the
            // monster isn't already hidden and isn't helpless (short-circuit).
            let doHide = false;
            if (mtmp.mundetected) doHide = true;
            else if (!mon_helpless(mtmp) && rn2(5)) doHide = true;
            if (doHide) await hideunder(mtmp);
            newsym(nix, niy); // C ref: monmove.c:1698
        }
        return MMOVE_MOVED;
    }
    return MMOVE_NOTHING;
}

// C ref: makemon.c makemon() — every freshly-placed monster gets
// mcansee=mcanmove=TRUE and mpeaceful=peace_minded().  The JS makemon doesn't
// persist these move-loop fields, so initialize the C defaults lazily the
// first time a monster is driven through the move loop.  Consumes NO RNG:
// peace_minded() only rolls for co-aligned non-special monsters, and for the
// dungeon monsters our sessions place (all M2_HOSTILE or cross-aligned) it
// returns FALSE via an early return, so the result is deterministic here.
export function initMonMoveState(mtmp) {
    if (mtmp._moveInit) return;
    mtmp._moveInit = true;
    if (mtmp.mcanmove == null) mtmp.mcanmove = 1;
    if (mtmp.mcansee == null) mtmp.mcansee = 1;
    if (mtmp.mpeaceful == null) mtmp.mpeaceful = peace_minded_nonrng(mtmp.data) ? 1 : 0;
    if (mtmp.mflee == null) mtmp.mflee = 0;
    if (mtmp.mtame == null) mtmp.mtame = 0;
    if (mtmp.mconf == null) mtmp.mconf = 0;
    if (mtmp.mstun == null) mtmp.mstun = 0;
    if (mtmp.msleeping == null) mtmp.msleeping = 0;
    if (mtmp.mtrack == null) mtmp.mtrack = [];
    // mux/muy default to the monster's own square (C leaves them 0 until the
    // first set_apparxy, which dochug always runs before they're read).
    if (mtmp.mux == null) mtmp.mux = mtmp.mx;
    if (mtmp.muy == null) mtmp.muy = mtmp.my;
}

// C ref: makemon.c peace_minded() — the deterministic (no-RNG) portion.
// always_hostile (M2_HOSTILE) monsters and monsters whose alignment sign
// differs from the hero's are hostile without any random roll.  The random
// co-aligned roll (rn2(16+..) && rn2(2+..)) is NOT reproduced here because it
// belongs to monster-creation time, not the move loop; for the monsters our
// sessions exercise that branch is never reached (they early-return hostile).
function peace_minded_nonrng(ptr) {
    if (!ptr) return false;
    const M2_PEACEFUL = 0x00000020, M2_HOSTILE = 0x00000010;
    const mflags2 = ptr.mflags2 ?? ptr.mflags2_derived ?? hostileFlag(ptr);
    if (mflags2 & M2_PEACEFUL) return true;
    if (mflags2 & M2_HOSTILE) return false;
    const mal = ptr.maligntyp ?? 0;
    const ual = game.u?.ualign?.type ?? 0;
    if (Math.sign(mal) !== Math.sign(ual)) return false;
    // Co-aligned: C would roll here.  None of our sessions reach this with a
    // move-loop monster; treat as hostile so we never silently consume RNG.
    return false;
}

// Conservative M2_HOSTILE membership for the low-level dungeon monsters the
// RNDMONST table places (jackal, fox, kobold, sewer rat, grid bug, lichen,
// newt are flagged M2_HOSTILE in monsters.h).  Returns the M2_HOSTILE bit.
function hostileFlag(ptr) {
    const M2_HOSTILE = 0x00000010;
    const HOSTILE_PMIDX = new Set([12, 13, 59, 88, 116, 158, 322]);
    return HOSTILE_PMIDX.has(ptr.pmidx) ? M2_HOSTILE : 0;
}

// C ref: monmove.c:307 mon_regen(mon, digest_meal) — a monster's once-per-turn
// hit-point regeneration, called from mon.c m_calcdistress() for every live
// monster.  Consumes NO RNG, but it is NOT cosmetic: every monster on the level
// heals 1 hp on each 20th move (and M1_REGEN species heal every move), so
// omitting it leaves every wounded monster permanently one or more hp below C.
// That silently changes how many blows are needed to kill it, which pet, hero
// and hostile all diverge from as soon as a fight lasts past move 20.
//
// `digest_meal` is FALSE at the only C call site (m_calcdistress); the meating
// countdown is ported anyway so the function matches the C, and finish_meating
// is inlined because its only other effect (dropping a mimic's appearance) is
// display bookkeeping already handled where m_ap_type is cleared.
export function mon_regen(mon, digest_meal) {
    if (!mon) return;
    if ((game.moves || 0) % 20 === 0 || regenerates_flag(mon.data))
        healmon(mon, 1, 0);
    if (mon.mspec_used) mon.mspec_used--;
    if (digest_meal) {
        if (mon.meating) {
            mon.meating--;
            if (mon.meating <= 0) {
                // C ref: dogmove.c finish_meating(mtmp)
                mon.meating = 0;
                if (mon.m_ap_type && mon.data?.mcls !== S_MIMIC_MCLS) {
                    mon.m_ap_type = 0;
                    mon.mappearance = 0;
                    newsym(mon.mx, mon.my);
                }
            }
        }
    }
}

// C ref: monsym.h S_MIMIC — used only by mon_regen's finish_meating tail.
const S_MIMIC_MCLS = 13;

// C ref: monmove.c dochug(mtmp).  Faithful control flow: PHASE ONE pre-move
// adjustments, PHASE TWO set_apparxy + distfleeck, PHASE THREE m_move (guarded
// by the same "opportunity to move" predicate as C, which decides whether the
// recalculating second distfleeck runs), PHASE FOUR attacks.
// C ref: mondata.h can_teleport(ptr) = (mflags1 & M1_TPORT).  The monster data
// carries no mflags1 here, so identify the M1_TPORT species by name (tengu,
// leprechaun, the teleporting nymphs, succubus/incubus, the Wizard).
const M1_TPORT_NAMES = new Set([
    'tengu', 'leprechaun', 'wood nymph', 'water nymph', 'mountain nymph',
    'succubus', 'incubus', 'Wizard of Yendor',
]);
function can_teleport(mdat) { return !!mdat && M1_TPORT_NAMES.has(mdat.name); }

// C ref: teleport.c noteleport_level() — TRUE on levels that forbid teleport
// (e.g. some special levels).  The contest fleeing monsters are on ordinary
// early dungeon levels, so this is FALSE.
function noteleport_level() { return false; }

export async function dochug(mtmp) {
    const mdat = mtmp.data;
    if (DEADMONSTER(mtmp)) return 1;

    // PHASE ONE — frozen / sleeping / pre-move timers.
    // C ref: monmove.c:704-708 STRAT_ARRIVE/m_arrival is not modeled — no
    // migrating monster reaches dochug in the covered sessions.
    // C ref: monmove.c:710-712 — a monster waiting for the hero to notice it
    // (STRAT_WAITFORU: quest nemeses and a few uniques) stops waiting once it
    // can see the hero or has taken damage.
    if ((mtmp.mstrategy & STRAT_WAITFORU) && (m_canseeu(mtmp) || mtmp.mhp < mtmp.mhpmax))
        mtmp.mstrategy &= ~STRAT_WAITFORU;
    // C ref: monmove.c:715 quest_stat_check(mtmp) is not modeled — it only
    // updates Qstat(in_battle) for the MS_NEMESIS species, which nemesis_speaks()
    // (not ported — see questpgr.js quest_talk) is the only reader of.

    // C ref: monmove.c:717-723 — a monster frozen by STRAT_WAITMASK (the one
    // named quest leader per role, via STRAT_CLOSE; or "prisoner") never
    // moves or attacks on its own.  While hero-adjacent and awake it gets one
    // chance per turn to speak instead (quest_talk).  The Hallucination
    // newsym() repaint is not modeled: Hallucination is never active in the
    // covered sessions.
    if (!mtmp.mcanmove || (mtmp.mstrategy & STRAT_WAITMASK)) {
        if (mtmp.mcanmove && (mtmp.mstrategy & STRAT_CLOSE)
            && !mtmp.msleeping && monnear(mtmp, game.u?.ux, game.u?.uy))
            await quest_talk(mtmp);
        return 0;
    }

    if (mtmp.msleeping) {
        // disturb() may wake it; for our (already-noticed) hostile monsters
        // disturb consumes no RNG and the monster stays asleep -> returns 0.
        if (!disturb(mtmp)) return 0;
    }

    // C ref: monmove.c:733-734 — "not frozen or sleeping: wipe out texts
    // written in the dust".  Every monster that reaches this point erodes any
    // engraving at its current square by one character before it moves; a
    // no-op (no RNG) unless an engraving actually sits there.
    wipe_engr_at(mtmp.mx, mtmp.my, 1, false);

    // confused monsters get unconfused with small probability
    if (mtmp.mconf && !rn2(50)) mtmp.mconf = 0;
    // stunned monsters get un-stunned with larger probability
    if (mtmp.mstun && !rn2(10)) mtmp.mstun = 0;

    // C ref: monmove.c:745 — "Some monsters teleport."  The condition is
    // `mtmp->mflee && !rn2(40) && can_teleport(mdat) && ...`, and because && is
    // left-to-right the rn2(40) roll fires for EVERY fleeing monster (the
    // can_teleport / iswiz / noteleport_level gates are only consulted when the
    // roll yields 0).  Reproduce that roll so the PRNG advances exactly as C
    // does whenever a monster is fleeing (the seed0367 step-61 divergence).
    if (mtmp.mflee && !rn2(40) && can_teleport(mdat)
        && !mtmp.iswiz && !noteleport_level()) {
        // The teleport itself (rloc) is reached only when the roll is 0 AND the
        // species can teleport; the contest sessions' fleeing monsters either
        // roll non-zero or aren't teleporters, so the rloc path isn't exercised.
        // If it ever fires, fall through (no relocation modeled) rather than
        // silently consuming a different RNG amount than C.
    }

    // fleeing monsters might regain courage
    if (mtmp.mflee && !mtmp.mfleetim && mtmp.mhp === mtmp.mhpmax && !rn2(25))
        mtmp.mflee = 0;

    // PHASE TWO — set_apparxy (sets mux/muy) then distance/scariness check.
    set_apparxy(mtmp);
    const { inrange, nearby, scared } = distfleeck(mtmp);

    // C ref: monmove.c:793-800 — "search for and potentially use defensive or
    // miscellaneous items", immediately after distfleeck and before Demonic
    // Blackmail / PHASE THREE.  A monster that uses an item spends its whole turn
    // on it and does NOT move; getting this wrong made every item-user take a
    // step C's stood still for.  find_defensive/use_defensive are not ported (see
    // js/muse.js), so C's `if (find_defensive(...)) {...} else if (find_misc())`
    // reduces to the else branch here.
    if (find_misc(mtmp)) {
        if (await use_misc(mtmp) !== 0) return 1;
    }

    // C ref: monmove.c:836-849 — "If monster is nearby you, and has to wield a
    // weapon, do so."  A hostile within dist2<=8 of its believed hero position
    // that attacks with AT_WEAP and still needs its melee weapon (weapon_check
    // == NEED_WEAPON) wields it THIS turn instead of reaching PHASE THREE.
    // Missing this let an armed hostile fall through to the movement branch a
    // turn early, costing an extra m_move + recalc-distfleeck roll it never
    // took in C (seed0002 step-232: goblin fmndpos/distfleeck one turn early).
    {
        const Conflict = false; // not modeled
        if ((!mtmp.mpeaceful || Conflict) && inrange
            && dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy) <= 8
            && attacktype_weap(mdat)) {
            const mw_tmp = MON_WEP(mtmp);
            if (!(scared && mw_tmp && is_pick_otyp(mw_tmp))
                && mtmp.weapon_check === NEED_WEAPON_MM
                && !(mtmp.mtrapped && !nearby && select_rwep(mtmp))) {
                mtmp.weapon_check = NEED_HTH_WEAPON_MM;
                if (await mon_wield_item(mtmp) !== 0) return 0;
            }
        }
    }

    // PHASE THREE — movement opportunity.  C ref monmove.c:882: a short-circuit
    // OR.  The rn2() terms must only roll when control actually reaches them,
    // so they are evaluated lazily here (mirroring C's || left-to-right order).
    let status = MMOVE_NOTHING;
    const S_LEPRECHAUN = 12; // defsym.h MONSYM index (27 is S_ANGEL)
    const may_move =
           !nearby
        || mtmp.mflee
        || scared
        || mtmp.mconf
        || mtmp.mstun
        || (mtmp.minvis && !rn2(3))
        || (mdat?.mlet === S_LEPRECHAUN && !findgold_invent()
            && (findgold_minvent(mtmp) || rn2(2)))
        || (is_wanderer(mdat) && !rn2(4))
        || (!mtmp.mcansee && !rn2(4))
        || mtmp.mpeaceful;

    if (may_move) {
        // (undirected-spell casting omitted — our monsters have no AT_MAGC)
        status = await m_move(mtmp);
        if (status === MMOVE_DIED) return 1;
        const r = distfleeck(mtmp); /* recalc */

        // C ref monmove.c switch(status): MMOVE_MOVED returns 0 directly
        // (without reaching PHASE FOUR / mattacku) UNLESS the monster moved
        // while NOT nearby AND it has a ranged / weapon / offensive option —
        // then it "break"s out to PHASE FOUR and may still attack.  For the
        // NOMOVES/NOTHING/DONE cases control always falls through to PHASE FOUR.
        if (status === MMOVE_MOVED) {
            const canShootAfterMove =
                !r.nearby && (ranged_attk_available(mtmp)
                              || attacktype_weap(mdat)
                              || find_offensive(mtmp));
            // (engulfing_u path not modeled — our monsters never swallow)
            if (!canShootAfterMove)
                return 0;
        }
        return await phase_four(mtmp, mdat, status, r.inrange, r.nearby, r.scared);
    }

    // Did not enter the move block -> attack with the pre-move flags.
    return await phase_four(mtmp, mdat, status, inrange, nearby, scared);
}

// C ref: invent.c findgold — hero/monster never carries gold in our sessions.
function findgold_invent() { return false; }
function findgold_minvent(_mtmp) { return false; }

// C ref: monmove.c dochug PHASE FOUR — the attack step.  mattacku() lives in
// mhitu.c; its steed-redirect roll (mhitu.c:534 rn2(is_orc?2:4)) and the
// hand-to-hand / weapon to-hit rolls are reproduced here in mattacku() below.
// The trailing cuss() roll belongs to monmove.c and is reproduced as well.
const MMOVE_DONE = 4; /* C: bypass m_move (we never set it, but match the gate) */
async function phase_four(mtmp, mdat, status, inrange, nearby, scared) {
    const u = game.u;
    // C ref monmove.c:967 — Standard Attacks.  status != MMOVE_DONE (we never
    // reach that for the modeled monsters) and the monster is hostile.
    const conflictAttack = false; /* Conflict not modeled for our sessions */
    if (status !== MMOVE_DONE && (!mtmp.mpeaceful || conflictAttack)) {
        // panicattk (NOMOVES while scared) is not modeled; our gate uses the
        // common "(inrange && !scared)" disjunct only.
        const uhp = u?.uhp ?? 1;
        if ((inrange && !scared) && !noattacks(mdat) && uhp > 0) {
            if (await mattacku(mtmp, mdat)) return 1; /* monster died (rare) */
        }
        // (wormhitu omitted — no long worms in these sessions)
    }

    const MS_CUSS = 35;
    if (inrange && mdat?.msound === MS_CUSS && !mtmp.mpeaceful
        && !mtmp.minvis) {
        rn2(5);
    }
    return (status === MMOVE_DIED) ? 1 : 0;
}

// C ref: include/you.h m_next2u(m) — distu(mx,my) <= 2 (the monster's REAL
// position is orthogonally/diagonally adjacent to the hero).
export function m_next2u(mtmp) {
    const u = game.u;
    const dx = mtmp.mx - u.ux, dy = mtmp.my - u.uy;
    return (dx * dx + dy * dy) <= 2;
}

// C ref: mondata.c is_orc(ptr) — (mflags2 & M2_ORC).  The data records carry
// the monster class (mcls); every S_ORC monster has M2_ORC, and the only other
// M2_ORC species are orc-mummy / orc-zombie (matched by name).
const S_ORC = 15;
const S_KOBOLD = 11;  // monsym.h S_KOBOLD
function is_orc(mdat) {
    if (!mdat) return false;
    if (mdat.mcls === S_ORC) return true;
    const n = mdat.name || '';
    return n === 'orc mummy' || n === 'orc zombie';
}

// C ref: mondata.c is_demon(ptr) — (mlet == S_DEMON), defsym.h S_DEMON == 56.
const S_DEMON = 56;
function is_demon(mdat) {
    return !!mdat && mdat.mcls === S_DEMON;
}

// C ref: mondata.c noattacks(ptr) — TRUE when the monster has no attacks.
// Every monster our sessions drive into mattacku has at least one attack, so
// this is FALSE; kept as a guard mirroring the C control flow.
function noattacks(mdat) {
    const atks = mon_attacks(mdat);
    return atks.length === 0;
}

// C ref: monattk.h AT_WEAP / mondata.c attacktype(ptr, AT_WEAP).
const AT_WEAP = 254;
function attacktype_weap(mdat) {
    return mon_attacks(mdat).some((a) => a.aatyp === AT_WEAP);
}

// C ref: mhitu.c ranged_attk_available(mtmp) — TRUE only for AT_SPIT / AT_BREA
// / AT_GAZE attackers (DISTANCE_ATTK_TYPE).  None of the monsters in the steed
// combat sessions have such attacks, so this is FALSE (no RNG).
const AT_SPIT = 10, AT_BREA = 12, AT_GAZE = 15;
function ranged_attk_available(mtmp) {
    return mon_attacks(mtmp.data).some(
        (a) => a.aatyp === AT_SPIT || a.aatyp === AT_BREA || a.aatyp === AT_GAZE);
}

// C ref: muse.c find_offensive(mtmp) — scans a hostile monster's minvent for an
// offensive item to fling at the hero.  Ported for the throwable-POTION path a
// lined-up gnome/dwarf/orc exercises (seed0030 step 50: a gnome hurls a potion
// of sleeping).  The wand / horn / scroll-of-earth branches are not reached by
// the contest's low-level dungeon monsters, so this detects only the offensive
// potions (leaving those other classes undetected, exactly as the prior stub
// did — no regression).  RNG-neutral: none of the potion cases roll.
//
// muse.c #defines: MUSE_POT_PARALYSIS 9, MUSE_POT_BLINDNESS 10,
// MUSE_POT_CONFUSION 11, MUSE_POT_ACID 14, MUSE_POT_SLEEPING 16.
const MUSE_POT_PARALYSIS = 9, MUSE_POT_BLINDNESS = 10, MUSE_POT_CONFUSION = 11,
      MUSE_POT_ACID = 14, MUSE_POT_SLEEPING = 16;
const POT_CONFUSION_OTYP = 299, POT_BLINDNESS_OTYP = 300, POT_PARALYSIS_OTYP = 301,
      POT_SLEEPING_OTYP = 314, POT_ACID_OTYP = 320;
let m_offensive = null;   // gm.m.offensive — the chosen item
let m_has_offense = 0;    // gm.m.has_offense — the MUSE_* code

function find_offensive(mtmp) {
    m_offensive = null;
    m_has_offense = 0;
    const data = mtmp?.data;
    if (!data) return 0;
    // C: mpeaceful || is_animal || mindless || nohands -> no offense.  The
    // monster data here carries no mflags, so gate on "can wield / can open a
    // door" as a hands+mind proxy: every offensive-item thrower in the sessions
    // (gnome/dwarf/orc/kobold) satisfies this, while animals / mindless /
    // handless monsters (which never get lined up carrying an offensive potion
    // here) do not.
    if (mtmp.mpeaceful) return 0;
    if (!(attacktype_weap(data) || mon_can_open_door(mtmp))) return 0;
    if (game.u?.uswallow) return 0;
    // in_your_sanctuary(): the exercised levels have no co-aligned temple the
    // hero stands on, so FALSE (no protection).  AD_HEAL nurse guard: none of
    // these throwers heal-attack, so it doesn't apply.
    if (!m_lined_up(mtmp)) return 0;
    // "picks the last viable item rather than prioritizing" (muse.c) — iterate
    // minvent in order and let the last matching offensive potion win.
    for (const obj of (mtmp.minvent || [])) {
        const t = obj.otyp;
        if (t === POT_PARALYSIS_OTYP && (game.multi ?? 0) >= 0) {
            m_offensive = obj; m_has_offense = MUSE_POT_PARALYSIS;
        } else if (t === POT_BLINDNESS_OTYP && !attacktype(data, AT_GAZE)) {
            m_offensive = obj; m_has_offense = MUSE_POT_BLINDNESS;
        } else if (t === POT_CONFUSION_OTYP) {
            m_offensive = obj; m_has_offense = MUSE_POT_CONFUSION;
        } else if (t === POT_SLEEPING_OTYP) {
            // C also guards on !m_seenres(SLEEP); the hero hasn't been seen to
            // resist sleep in these sessions, so the guard is TRUE.
            m_offensive = obj; m_has_offense = MUSE_POT_SLEEPING;
        } else if (t === POT_ACID_OTYP) {
            m_offensive = obj; m_has_offense = MUSE_POT_ACID;
        }
    }
    return m_has_offense;
}

// C ref: mondata.c attacktype(ptr, atyp) — does the monster have that attack?
function attacktype(data, atyp) {
    return mon_attacks(data).some((a) => a.aatyp === atyp);
}

// C ref: muse.c use_offensive(mtmp) — carry out the offensive action chosen by
// find_offensive().  Only the thrown-POTION cases are reached here; C throws the
// potion via m_throw (it is NOT drunk).  Returns 2 (monster acted, survived) so
// mattacku consumes its turn on the throw rather than also swinging.
async function use_offensive(mtmp) {
    const otmp = m_offensive;
    if (!otmp) return 0;
    const u = game.u;
    switch (m_has_offense) {
    case MUSE_POT_PARALYSIS:
    case MUSE_POT_BLINDNESS:
    case MUSE_POT_CONFUSION:
    case MUSE_POT_SLEEPING:
    case MUSE_POT_ACID: {
        const mux = mtmp.mux ?? u.ux, muy = mtmp.muy ?? u.uy;
        // C ref: muse.c use_offensive() — if cansee(mtmp) then observe_object(otmp)
        // (sets obj->dknown, marks the type encountered; no RNG) and prints
        // "<Mon> hurls <potion>!".  The exact appearance string is owned by the
        // object-shuffle lane, so emit a generic hurl line here (screen fidelity
        // for this event is gated on that lane anyway).  We record the seen-ness
        // on a private marker so potionbreathe()'s tail can discover the type
        // (makeknown -> exercise(A_WIS)) exactly as C does — without reaching
        // into the object-shuffle lane's obj->dknown.
        if (cansee(mtmp.mx, mtmp.my)) {
            otmp._seen_thrown = true; // C: observe_object(otmp) sets obj->dknown
            if (canspotmon(mtmp)) {
                const { update_topl } = await import('./display.js');
                await update_topl(`${Monnam(mtmp)} hurls a potion!`);
            }
        }
        const range = distmin(mtmp.mx, mtmp.my, mux, muy);
        await m_throw_potion(mtmp, mtmp.mx, mtmp.my,
                             sgn(mux - mtmp.mx), sgn(muy - mtmp.my), range, otmp);
        return 2;
    }
    default:
        return 0;
    }
}

// C ref: mthrowu.c m_throw() for a POTION_CLASS missile aimed at the hero.  The
// flight loop mirrors m_throw_at_hero (one rn2(5) forcehit per non-hero square),
// but the hero-square resolution is the potion path: u_catch_thrown_obj (rn2 to
// catch), else potionhit(&youmonst, obj, POTHIT_MONST_THROW) which shatters the
// vessel (bottlename rn2(7), losehp rnd(2), then potionbreathe).  POTHIT_MONST_
// THROW == 2 (potion.h).
//
// Display: same tmp_at(DISP_FLASH)/tmp_at(x,y)/tmp_at(DISP_END) dance as
// m_throw_at_hero (mthrowu.c:648-824) — draw the missile's map glyph at each
// crossed square, restoring the previous one, and only erase the LAST flashed
// square once potionhit_hero() (and any --More-- pauses inside it) fully
// resolve.  C's own post-break tmp_at(bhitpos)/tmp_at(DISP_END,0) cleanup
// (mthrowu.c:826-833) draws-then-immediately-erases the hero's own square with
// no message in between, so it never appears in a captured screen; we skip
// modelling that no-op pair and go straight from "message resolved" to erase.
async function m_throw_potion(mon, sx, sy, dx, dy, range, otmp) {
    const u = game.u;
    const singleobj = m_throw_single(mon, otmp); // quan split (rnd(2)) if stacked
    // C ref: mthrowu.c m_throw():619 — if the thrower isn't visible the missile
    // starts dknown-clear; the flight loop below re-marks it as each crossed
    // square comes into sight (observe_object).  use_offensive() may already
    // have marked it seen (thrower visible); mirror the clear otherwise.
    if (!canspotmon(mon) && otmp._seen_thrown == null) singleobj._seen_thrown = false;
    // C ref: mthrowu.c:649 — tmp_at(DISP_FLASH, obj_to_glyph(singleobj)).  sym
    // (obj->oclass) is always truthy for a potion; potions are never tethered.
    const fglyph = (singleobj.oclass ? object_glyph(singleobj) : null);
    let fx = -1, fy = -1; // last flashed cell (-1 = none drawn yet)
    const flash_at = (x, y) => {
        if (!fglyph) return;
        if (fx >= 0) { newsym(fx, fy); fx = fy = -1; } // restore previous square
        if (!cansee(x, y)) return;                     // unseen: no flash drawn
        show_glyph_cell(x, y, fglyph.ch, fglyph.color, fglyph.dec);
        fx = x; fy = y;
    };
    const flash_end = () => { if (fx >= 0) { newsym(fx, fy); fx = fy = -1; } };
    let bx = sx, by = sy;
    while (range-- > 0) {
        bx += dx; by += dy;
        // C ref: mthrowu.c m_throw():676 — at the top of each step, once the
        // missile occupies bhitpos, observe_object(singleobj) fires when that
        // square is in sight (cansee), setting obj->dknown.  The hero's own
        // square is always in sight (unless Blind), so a potion that reaches an
        // unblinded hero is always seen -> dknown -> potionbreathe discovers it.
        if (!Blind() && cansee(bx, by)) singleobj._seen_thrown = true;
        if (bx === u.ux && by === u.uy) {
            // hero square: catch attempt (rn2(100-Dex)); a non-catch shatters.
            if (u_catch_thrown_obj(singleobj)) {
                flash_end();
                m_useup_thrown(mon, otmp, singleobj);
                return;
            }
            const { potionhit_hero } = await import('./potion.js');
            await potionhit_hero(singleobj, 2 /*POTHIT_MONST_THROW*/);
            flash_end();
            m_useup_thrown(mon, otmp, singleobj);
            return;
        }
        // forcehit roll on every non-hero square crossed (mthrowu.c:798).
        rn2(5);
        // (no intervening monster / blocked terrain in the exercised path)
        // C ref: mthrowu.c:824 — tmp_at(bhitpos) only fires on a non-terminal
        // iteration (the loop breaks before it once `!range`).
        if (range > 0) flash_at(bx, by);
    }
    // reached end of range without crossing the hero's square: the potion
    // shatters where it lands (potionhit on empty ground — no hero RNG).  Not
    // exercised for a lined-up throw, but drop it so it leaves the monster.
    flash_end();
    m_useup_thrown(mon, otmp, singleobj);
}

// Remove the thrown potion from the monster's inventory (C: obfree/useup after
// m_throw).  RNG-neutral.  When the stack was split, only the peeled-off single
// is gone; the parent stack was already decremented by m_throw_single.
function m_useup_thrown(mon, parent, singleobj) {
    if (singleobj === parent) {
        const inv = mon?.minvent;
        if (inv) {
            const i = inv.indexOf(parent);
            if (i >= 0) inv.splice(i, 1);
        }
    }
    // (split-off single was never in minvent)
}

// ── weapon-class predicates used by m_balks_at_approaching ──────────────────
// C ref: include/objects.h WEAPON()/BOW() enum order.  FIRST_OBJECT (ARROW) ==
// LAST_GENERIC+1 == 18, so the weapon otyps run: arrow 18 .. crossbow bolt 23,
// dart 24, shuriken 25, boomerang 26, spear 27 .. trident 33, dagger 34 ..
// crysknife 43, axe 44, battle-axe 45, short sword 46 .. runesword 58,
// partisan 59 .. bec de corbin 70 (P_POLEARMS), dwarvish mattock 71,
// lance 72 (P_LANCE), mace 73 .. bullwhip 82, bow 83 .. crossbow 88 (launchers).

// C ref: include/obj.h is_pole(otmp) — a polearm/lance (oc_skill P_POLEARMS or
// P_LANCE; ART_SNICKERSNEE is the only exception and no monster wields it here).
// WEAPON_CLASS or TOOL_CLASS; every polearm/lance is WEAPON_CLASS.
const POLEARM_OTYP_LO = 59, POLEARM_OTYP_HI = 70; // partisan..bec de corbin
const LANCE_OTYP = 72;
function is_pole(otmp) {
    if (!otmp) return false;
    const t = otmp.otyp;
    return (t >= POLEARM_OTYP_LO && t <= POLEARM_OTYP_HI) || t === LANCE_OTYP;
}

// C ref: include/obj.h is_launcher(otmp) — WEAPON_CLASS with oc_skill in
// [P_BOW, P_CROSSBOW]: bow 83, elven bow 84, orcish bow 85, yumi 86, sling 87,
// crossbow 88.
const LAUNCHER_OTYP_LO = 83, LAUNCHER_OTYP_HI = 88;
function is_launcher(otmp) {
    if (!otmp) return false;
    const t = otmp.otyp;
    return t >= LAUNCHER_OTYP_LO && t <= LAUNCHER_OTYP_HI;
}

// C ref: include/obj.h is_ammo / matching_launcher / ammo_and_launcher — ammo
// otyps are the projectiles (arrow 18 .. crossbow bolt 23, oc_skill -P_BOW..
// -P_CROSSBOW) and gems for slings.  matching_launcher pairs -oc_skill.  Bows
// (P_BOW) fire arrows 18-22, crossbows (P_CROSSBOW) fire bolt 23, slings fire
// gems.  Reproduce the skill pairing without a full objects[] table.
const P_BOW_AMMO = new Set([18, 19, 20, 21, 22]); // arrow..ya (-P_BOW)
const CROSSBOW_BOLT_OTYP = 23;                    // (-P_CROSSBOW)
function ammo_and_launcher(a, l) {
    if (!a || !l) return false;
    // matching_launcher: ammo -oc_skill == launcher oc_skill.
    if (l.otyp >= 83 && l.otyp <= 86) return P_BOW_AMMO.has(a.otyp);  // bows/yumi
    if (l.otyp === 87) return a.oclass === GEM_CLASS_MM;              // sling->gems
    if (l.otyp === 88) return a.otyp === CROSSBOW_BOLT_OTYP;          // crossbow
    return false;
}
const GEM_CLASS_MM = 9; // objects.h GEM_CLASS

// C ref: mthrowu.c:58 m_has_launcher_and_ammo(mtmp) — TRUE when the monster
// wields a launcher and carries matching ammo.  No RNG.
function m_has_launcher_and_ammo(mtmp) {
    const mwep = MON_WEP(mtmp);
    if (mwep && is_launcher(mwep)) {
        for (const otmp of (mtmp.minvent || []))
            if (ammo_and_launcher(otmp, mwep)) return true;
    }
    return false;
}

// C ref: weapon.c:520 autoreturn_weapon(otmp) — the throw-and-return weapon
// table arwep[] (boomerang commented out): only AKLYS (otyp 80), range 1.
// Returns the {range} record (or null).  No RNG.
const AKLYS_OTYP = 80, AKLYS_LIM = 8;
function autoreturn_weapon(otmp) {
    if (otmp && otmp.otyp === AKLYS_OTYP) return { range: AKLYS_LIM * AKLYS_LIM };
    return null;
}

// C ref: monmove.c:1139 leppie_avoidance(mtmp) — a leprechaun carrying more
// gold than the hero backs off.  No monster in these sessions is a leprechaun
// (or, if one were, gold accounting is deterministic), so FALSE.  No RNG.
function leppie_avoidance(_mtmp) { return false; }

// C ref: include/vision.h:45 m_canseeu(m) —
//   (!Invis || perceives(m->data)) && !Underwater && couldsee(m->mx, m->my)
// The hero is never invisible or underwater in these slices, so this reduces
// to couldsee(m->mx, m->my); the full expression is written for faithfulness.
// No RNG.
function m_canseeu(m) {
    const notInvis = !Invis() || perceives(m.data);
    return notInvis && !Underwater() && couldsee(m.mx, m.my);
}
// C ref: player invisibility / underwater / telepathy predicates.  None hold in
// the recorded slices (hero is visible, on dry land; monsters lack ESP), so
// these are constant here; kept as named helpers matching the C macros.
function Invis() { return !!game.u?.uinvis; }
function Underwater() { return !!game.u?.uunderwater; }
function perceives(_data) { return false; } // M2_MIND / telepathy — none here

// C ref: monmove.c:1181 m_balks_at_approaching(oldappr, mtmp, &prmin, &prmax) —
// does the monster want to avoid the hero?  Returns {appr, prmin, prmax}:
//   oldappr : keep approaching/fleeing as-is (peaceful, far, or can't see)
//   -1      : back off (launcher+ammo, in-range polearm, or a ready ranged attk)
//   -2      : hold a preferred range [prmin,prmax] (throw-and-return weapon)
// Body order EXACTLY as C.  Draws ZERO rng.
function m_balks_at_approaching(oldappr, mtmp) {
    const mwep = MON_WEP(mtmp);
    const ux = mtmp.mux ?? game.u.ux, uy = mtmp.muy ?? game.u.uy;
    const edist = dist2(mtmp.mx, mtmp.my, ux, uy);
    let prmin = 0, prmax = 0;

    // peaceful, far away (>= 5*5), or can't see you
    if (mtmp.mpeaceful || edist >= 25 || !m_canseeu(mtmp))
        return { appr: oldappr, prmin, prmax };

    // has ammo + launcher
    if (m_has_launcher_and_ammo(mtmp))
        return { appr: -1, prmin, prmax };

    // is using a polearm and in range
    if (mwep && is_pole(mwep) && edist <= MON_POLE_DIST)
        return { appr: -1, prmin, prmax };

    // is using a throw-and-return weapon; provide min and max preferred range
    let arw;
    if (mwep && (arw = autoreturn_weapon(mwep))) {
        prmin = 2 * 2;
        prmax = arw.range;
        return { appr: -2, prmin, prmax };
    }

    // can attack from a distance, and hp loss or attack not yet used
    if (ranged_attk_available(mtmp)
        && ((mtmp.mhp < (((mtmp.mhpmax + 1) / 3) | 0)) || !mtmp.mspec_used))
        return { appr: -1, prmin, prmax };

    return { appr: oldappr, prmin, prmax }; // leaves appr unchanged
}
const MON_POLE_DIST = 5; // include/hack.h MON_POLE_DIST

// C ref: mondata.h throws_rocks() — M2_ROCKTHROW species (giants/ettin/etc.).
function throws_rocks_pm(ptr) { return !!ptr && ROCKTHROW_PMIDX.has(ptr.pmidx); }

// C ref: attrib.h ACURRSTR — hero's current strength as a 3..25 scalar.
function acurrstr() {
    const str = game.u?.acurr?.a?.[A_STR] ?? 0;
    if (str <= 18) return Math.max(str, 3);
    if (str <= 121) return 19 + Math.trunc(str / 50);
    return Math.min(str, 125) - 100;
}

// C ref: monmove.c:1330 m_search_items(mtmp, &ggx, &ggy, &mmoved, &appr).
// Scans a (2*SQSRCHRADIUS+1)^2 rectangle around the monster for an object it
// would grab, redirecting its goal toward the loot.  Returns TRUE only when the
// object is on the monster's own square (caller then bails to postmov).
//
// SCOPED PORT: the object-grab pile scan draws NO rng (the only rng in the whole
// function is the in-shop `rn2(25)` skip), and none of the monsters the recorded
// sessions drive through here both stand near a floor object AND would pick it
// up (snakes/elementals are M1_NOTAKE; the pile scan finds nothing for them).
// So the pile scan is omitted as an rng-neutral no-op; the two behaviours that
// DO fire — the in-shop rn2(25) and the finish_search appr/goal override — are
// reproduced faithfully.  (If monster item-grabbing parity is ever needed, port
// the OBJ_AT pile loop here; it changes ggx/ggy, not the rng stream.)
// C ref: mondata.h metallivorous(ptr) == (mflags1 & M1_METALLIVORE).  Only
// three species carry the flag (include/monsters.h): rock mole, rust monster,
// xorn.  Name-keyed for stability, mirroring dogmove.js's identical table for
// the (unreachable, since none is ever a pet) DOGFOOD-vs-MANFOOD split.
const M1_METALLIVORE_NAMES = new Set(["rock mole", "rust monster", "xorn"]);
function metallivorous(ptr) { return M1_METALLIVORE_NAMES.has(ptr?.name); }
const PM_RUST_MONSTER_NAME = "rust monster";
const PM_GELATINOUS_CUBE_NAME = "gelatinous cube";
function is_gelatinous_cube(ptr) { return ptr?.name === PM_GELATINOUS_CUBE_NAME; }

// C ref: objclass.h obj_material_types — the material band tests meatmetal/
// meatobj consult.  IRON..MITHRIL is_metallic; NO_MATERIAL..WOOD is_organic.
const MAT_WOOD = 8, MAT_IRON = 11, MAT_MITHRIL = 17;
function is_metallic(otmp) {
    const mat = OBJECTS[otmp.otyp]?.material;
    return mat != null && mat >= MAT_IRON && mat <= MAT_MITHRIL;
}
function is_organic(otmp) {
    const mat = OBJECTS[otmp.otyp]?.material;
    return mat != null && mat <= MAT_WOOD;
}
function is_rustprone(otmp) { return OBJECTS[otmp.otyp]?.material === MAT_IRON; }

// C ref: monst.h resists_poison(mon)/resists_ston(mon) via mons[].mresists
// (MR_POISON/MR_STONE), and mondata.h slimeproof(ptr).  Of the species that
// ever reach meatmetal/meatobj, only the gelatinous cube itself carries
// MR_POISON|MR_STONE (include/monsters.h); the metallivorous trio (rock mole/
// rust monster/xorn) have neither.  slimeproof is true only for green slime
// itself, flaming monsters, or noncorporeal ones — never the cube — so a
// slime glob always forces meatobj's engulf branch for a cube eater.
function resists_poison_mon(mtmp) { return is_gelatinous_cube(mtmp.data); }
function resists_ston_mon(mtmp) { return is_gelatinous_cube(mtmp.data); }
function slimeproof_mon(_mtmp) { return false; }

// C ref: mondata.h touch_petrifies(ptr) = cockatrice/chickatrice;
// flesh_petrifies(pm) = touch_petrifies(pm) || Medusa.  Name-keyed (rare —
// none of these corpses occur in the dungeon-1 sessions this subsystem
// targets, but the guard is kept faithful for any level that does place one).
function corpse_touch_petrifies(corpsenm) {
    const nm = monster_by_pmidx(corpsenm)?.name;
    return nm === "cockatrice" || nm === "chickatrice";
}
function corpse_flesh_petrifies(corpsenm) {
    return corpse_touch_petrifies(corpsenm) || monster_by_pmidx(corpsenm)?.name === "Medusa";
}
// C ref: mon.c:1384 #define mstoning(obj) (ofood(obj) && ismnum(obj->corpsenm)
// && flesh_petrifies(&mons[obj->corpsenm])).  ofood: CORPSE/EGG/TIN.
const EGG_OTYP = 266, TIN_OTYP = 296; // mkobj.js OBJECT_DATA rows (not individually exported)
function mstoning_obj(otmp) {
    if (otmp.otyp !== CORPSE && otmp.otyp !== EGG_OTYP && otmp.otyp !== TIN_OTYP) return false;
    return otmp.corpsenm != null && otmp.corpsenm >= 0 && corpse_flesh_petrifies(otmp.corpsenm);
}
// C ref: obj.h AMULET_OF_STRANGULATION / RIN_SLOW_DIGESTION otyps (mkobj.js
// OBJECT_DATA rows 203 / 193 — the latter has no individually exported const).
const RIN_SLOW_DIGESTION_OTYP = 193;
const CARROT_OTYP = 282;

// All floor objects on mtmp's own square, in level.objects order.  Matches the
// per-tile traversal mpickstuff/m_search_items already use below (their
// comments note this order already lines up with C's per-tile `nexthere`
// chain at the tiles the recorded sessions exercise).
function objPileAt(mx, my) {
    return (game.level?.objects || []).filter((o) => o.ox === mx && o.oy === my);
}
// obj_extract_self(otmp) + free: the object leaves the floor for good (eaten).
function delobj_local(otmp) {
    const arr = game.level?.objects;
    if (Array.isArray(arr)) {
        const ix = arr.indexOf(otmp);
        if (ix >= 0) arr.splice(ix, 1);
    }
    otmp.where = 'free';
}
// obj_extract_self(otmp) + mpickobj: the object leaves the floor and joins
// mtmp's minvent (engulfed by a gelatinous cube), matching mpickstuff's own
// `where`/minvent convention below.
function mon_engulf_obj(mtmp, otmp) {
    const arr = game.level?.objects;
    if (Array.isArray(arr)) {
        const ix = arr.indexOf(otmp);
        if (ix >= 0) arr.splice(ix, 1);
    }
    otmp.where = 3; // OBJ_MINVENT
    mtmp.minvent = mtmp.minvent || [];
    mtmp.minvent.push(otmp);
}

// C ref: mon.c:1392 m_consume_obj(mtmp, otmp) — a monster eats/absorbs a
// floor object.  SCOPED: healmon (deterministic, no RNG) and the CARROT
// blindness cure are ported; meatbox() container-spill draws no RNG in C
// either (mon.c:1354) so a filled container eaten here is scoped out (no
// recorded hostile eats a filled container on dungeon level 1); poly/slimer
// (newcham — chameleon-class corpse or a slime glob) and grow (wraith-corpse
// level-up via grow_up) are rare corpse-species specials that never reach
// this path here (a slime glob is always engulfed, never devoured, per
// slimeproof_mon above) and are omitted rather than porting those subsystems
// for an unreachable branch.  mstone is likewise structurally a no-op here:
// mstoning_obj()&&!resists_ston_mon() is exactly the condition meatobj's own
// engulf gate already tests below, so any object reaching m_consume_obj via
// devour has either mstoning_obj()==false or resists_ston_mon()==true, both
// of which make C's own `!resists_ston(mtmp)` guard on the mstone branch a
// no-op.  Consumes NO further RNG (matching C: only obj_resists/touch_artifact,
// already rolled by the caller, precede delobj here).
async function m_consume_obj(mtmp, otmp) {
    const ispet = !!mtmp.mtame;
    if (!ispet && (mtmp.mhp ?? 0) < (mtmp.mhpmax ?? 0)) {
        const amt = base_oc_weight(otmp);
        mtmp.mhp = Math.min(mtmp.mhpmax, mtmp.mhp + amt);
    }
    if (otmp.otyp === CARROT_OTYP && mtmp.mblinded) {
        mtmp.mblinded = 0;
        mtmp.mcansee = 1;
    }
    delobj_local(otmp);
}

// C ref: mon.c:1462 meatmetal(mtmp) — a metallivorous hostile (rock mole /
// rust monster / xorn) eats the topmost metal object on its own square.
// Pets eat via dog.c (dogmove.js), never here.  Returns 0 (nothing happened),
// 1 (ate something), 2 (monster died mid-digestion — structurally unreached
// by the scoped m_consume_obj above, kept for signature fidelity).
async function meatmetal(mtmp) {
    if (mtmp.mtame) return 0;
    const isRustMon = mtmp.data?.name === PM_RUST_MONSTER_NAME;
    const verbose = game.flags?.verbose !== false;
    for (const otmp of objPileAt(mtmp.mx, mtmp.my)) {
        if ((isRustMon && !is_rustprone(otmp))
            || otmp.otyp === AMULET_OF_STRANGULATION
            || otmp.otyp === RIN_SLOW_DIGESTION_OTYP
            || (otmp.opoisoned && !resists_poison_mon(mtmp)))
            continue;
        const { touch_artifact } = await import('./invent.js');
        if (is_metallic(otmp) && !obj_resists(otmp, 5, 95)
            && touch_artifact(otmp, mtmp)) {
            const vis = canspotmon(mtmp); // canseemon approximation (see uhitm.js)
            if (isRustMon && otmp.oerodeproof) {
                if (vis && verbose) {
                    const { floor_object_name } = await import('./invent.js');
                    await pline(`${Monnam(mtmp)} eats ${floor_object_name(otmp)}!`);
                }
                otmp.oerodeproof = 0;
                mtmp.mstun = 1;
                if (vis && verbose) {
                    const { floor_object_name } = await import('./invent.js');
                    await pline(`${Monnam(mtmp)} spits ${floor_object_name(otmp)} out in disgust!`);
                }
            } else {
                if (cansee(mtmp.mx, mtmp.my)) {
                    if (verbose) {
                        const { floor_object_name } = await import('./invent.js');
                        await pline(`${Monnam(mtmp)} eats ${floor_object_name(otmp)}!`);
                    }
                } else if (verbose) {
                    await pline('You hear a crunching sound.');
                }
                mtmp.meating = Math.trunc((otmp.owt ?? weight(otmp)) / 2) + 1;
                await m_consume_obj(mtmp, otmp);
                if (DEADMONSTER(mtmp)) return 2;
                if (rnd(25) < 3) mksobj_at(ROCK, mtmp.mx, mtmp.my, true, false);
                newsym(mtmp.mx, mtmp.my);
                return 1;
            }
        }
    }
    return 0;
}

// C ref: mon.c:1533 meatobj(mtmp) — a gelatinous cube eats or engulfs every
// object on its own square in one pass.  Pets eat via dog.c, never here.
// Returns 0 (nothing), 1 (ate/engulfed something).  (C's 2/3 death/forced-off-
// level codes are structurally unreached: they come from newcham/rider-revival,
// both scoped out below — see m_consume_obj's comment.)
async function meatobj(mtmp) {
    if (mtmp.mtame) return 0;
    const verbose = game.flags?.verbose !== false;
    let count = 0, ecount = 0;
    const { touch_artifact, floor_object_name } = await import('./invent.js');
    for (const otmp of objPileAt(mtmp.mx, mtmp.my)) {
        // avoid special items (mines'/sokoban prize) — never populated here.
        if (is_mines_prize(otmp) || is_soko_prize(otmp)) continue;

        // touch-sensitive / untouchable / inaccessible: neither eaten nor
        // engulfed.  (Rider corpses and the ball&chain never occur on these
        // dungeon-1 sessions; SCR_SCARE_MONSTER is a real, if rare, guard.)
        if (otmp.otyp === CORPSE && corpse_touch_petrifies(otmp.corpsenm)
                && !resists_ston_mon(mtmp)) {
            continue;
        } else if (otmp.oclass === ROCK_CLASS || otmp.otyp === SCR_SCARE_MONSTER) {
            continue;
        } else if (!is_organic(otmp) || obj_resists(otmp, 5, 95)
                   || !touch_artifact(otmp, mtmp)
                   || otmp.otyp === AMULET_OF_STRANGULATION
                   || otmp.otyp === RIN_SLOW_DIGESTION_OTYP
                   || (otmp.opoisoned && !resists_poison_mon(mtmp))
                   || (mstoning_obj(otmp) && !resists_ston_mon(mtmp))
                   || (otmp.otyp === GLOB_OF_GREEN_SLIME && !slimeproof_mon(mtmp))) {
            // engulf
            ecount++;
            mon_engulf_obj(mtmp, otmp);
        } else {
            // devour
            count++;
            if (cansee(mtmp.mx, mtmp.my)) {
                if (verbose)
                    await pline(`${Monnam(mtmp)} eats ${floor_object_name(otmp)}!`);
            } else if (verbose) {
                await pline('You hear a slurping sound.');
            }
            await m_consume_obj(mtmp, otmp);
        }
    }
    if (ecount > 0 && verbose) {
        if (cansee(mtmp.mx, mtmp.my))
            await pline(`${Monnam(mtmp)} engulfs ${ecount === 1 ? 'an object' : 'several objects'}.`);
        else
            await pline(`You hear ${ecount === 1 ? 'a' : 'several'} slurping sound${ecount === 1 ? '' : 's'}.`);
    }
    return (count > 0 || ecount > 0) ? 1 : 0;
}

// C ref: monmove.c:1054 mon_would_take_item(mtmp, otmp).  Reproduced for the
// gold/gem-loving species the mines exercise: dwarves & gnomes are
// M2_GREEDY|M2_JEWELS; leprechauns/soldiers/watchmen are M2_GREEDY.  The pctload
// gates (<95 gold, <85 gems) are subsumed by the caller's can_carry() weight
// test; ROCK is filtered by the caller.  Keyed on the species name (data.name).
function mon_would_take_item(mtmp, otmp) {
    const nm = mtmp.data?.name || '';
    const greedy = /dwarf|dwarvish|gnome|gnomish|leprechaun|soldier|watch/i.test(nm);
    const jewels = /dwarf|dwarvish|gnome|gnomish/i.test(nm);
    if (greedy && otmp.otyp === GOLD_PIECE) return true;
    if (jewels && otmp.oclass === GEM_CLASS && otmp.otyp !== ROCK) return true;
    return false;
}

// C ref: mon.c:1847 mpickstuff(mtmp) — the monster picks up one item stack from
// the floor square it stands on (called by postmov when mmoved==MMOVE_DONE, i.e.
// m_search_items found a grabbable object underfoot).  Draws NO rng for the
// non-shop case (the in-shop rn2(25) skip mirrors mpickstuff's; no recorded
// looter stands in a shop).  This removes the object from the floor and adds it
// to the monster's minvent, so on the next turn the square is clear and the
// monster resumes normal movement (reaching the candidate loop) instead of
// forever re-detecting the item underfoot.
// C ref: mon.c curr_mon_load(mtmp) — the summed owt of a monster's inventory
// (boulders carried by a rock-thrower are weightless to it; no such monster
// reaches this pickup path).
function curr_mon_load(mtmp) {
    let curload = 0;
    for (const o of (mtmp.minvent || [])) curload += (o.owt ?? (o.quan || 1));
    return curload;
}

// C ref: mon.c max_mon_load(mtmp).  Base = human carry cap, halved when the
// monster is not strong, scaled by the monster's corpse weight (cwt) vs a human
// (or by relative size for corpseless monsters).  MZ_HUMAN==2, WT_HUMAN==1500,
// MAX_CARR_CAP==1000.  No would_take looter in these sessions is strongmonst
// (dwarves/gnomes/leprechauns/soldiers are all M2_STRONG-less), so the strong
// branches stay conservative; a giant (msize>=MZ_HUGE) would read as strong.
function max_mon_load(mtmp) {
    const d = mtmp.data || {};
    const MAX_CARR_CAP = 1000, WT_HUMAN = 1500, MZ_HUMAN = 2, MZ_HUGE = 4; // monflag.h (7 is MZ_GIGANTIC)
    const strong = (d.msize | 0) >= MZ_HUGE; // M2_STRONG proxy (none of the looters qualify)
    let maxload;
    if (!d.cwt)
        maxload = (MAX_CARR_CAP * (d.msize | 0)) / MZ_HUMAN;
    else if (!strong || (strong && d.cwt > WT_HUMAN))
        maxload = (MAX_CARR_CAP * d.cwt) / WT_HUMAN;
    else
        maxload = MAX_CARR_CAP;
    if (!strong) maxload = maxload / 2;
    if (maxload < 1) maxload = 1;
    return Math.floor(maxload);
}

// C ref: mon.c can_carry(mtmp, otmp) — how many of otmp the monster can carry
// (0 = none).  Scoped to the mpickstuff caller, where mon_would_take_item has
// already restricted otmp to gold/gems taken by a greedy humanoid.  The key
// fidelity point vs the pet-scoped dogmove.can_carry: a monster WITH hands does
// NOT collapse a stack to 1 (only M1_NOHANDS non-glompers do, mon.c:2026) — it
// takes the whole stack subject to its load cap.  Hands are detected via
// CAN_OPEN_DOOR_PMIDX (has-hands & size>=MZ_SMALL); every would_take looter is
// listed there, so gnomes/dwarves grab both gems of a pair without splitting.
function mon_can_carry(mtmp, otmp) {
    const iquan = otmp.quan || 1;
    const hasHands = CAN_OPEN_DOOR_PMIDX.has(mtmp.data?.pmidx);
    // mon.c:2013 — NOHANDS non-glomper monsters can carry only one of a stack.
    if (iquan > 1 && !hasHands) return 1;
    // mon.c:2035 — a peaceful (non-tame) monster won't pick up (avoid alignment
    // obligations); the mines looters are hostile, so this is a faithful guard.
    if (mtmp.mpeaceful && !mtmp.mtame) return 0;
    // mon.c:2049 — load cap.
    const newload = otmp.owt ?? iquan;
    if (curr_mon_load(mtmp) + newload > max_mon_load(mtmp)) return 0;
    return iquan;
}

function mpickstuff(mtmp) {
    // prevent shopkeepers from leaving the door of their shop
    if (mtmp.isshk) return false;
    // non-tame monsters normally don't go shopping (rn2(25) in a shop)
    if (!mtmp.mtame && mon_in_shop(mtmp.mx, mtmp.my) && rn2(25)) return false;
    // (could_reach_item: land monster on ordinary floor always reaches -> true)
    const arr = game.level?.objects;
    if (!Array.isArray(arr)) return false;
    // Iterate the pile on the monster's square (C: svl.level.objects[mx][my]
    // nexthere chain).  Our flat store keys objects by (ox,oy).
    const pile = arr.filter(o => o.ox === mtmp.mx && o.oy === mtmp.my);
    for (const otmp of pile) {
        // avoid special items (mines/soko prize); once the hero grabs them they
        // stop being special.  Not tracked here -> never special on the ordinary
        // mines levels these sessions visit.
        if (is_mines_prize(otmp) || is_soko_prize(otmp)) continue;
        if (mon_would_take_item(mtmp, otmp)) {
            // most monsters don't pick up corpses (nymphs excepted); a gnome/dwarf
            // never would_take a corpse anyway, so this guard is a faithful no-op.
            if (otmp.otyp === CORPSE) continue;
            // can_touch_safely (gloves/immunity vs. silver/acid) — the grabbed
            // gems/gold here are always safe to touch.
            const carryamt = mon_can_carry(mtmp, otmp);
            if (carryamt === 0) continue;
            let otmp3;
            if (carryamt !== (otmp.quan || 1)) {
                // partial stack: split off carryamt into a fresh object.  C's
                // splitobj() assigns the fragment a new o_id via next_ident()
                // (rnd(2)); reproduce that roll so the PRNG advances as C does.
                otmp3 = { ...otmp, quan: carryamt, o_id: next_ident() };
                otmp.quan = (otmp.quan || 1) - carryamt;
            } else {
                // whole stack leaves the floor
                otmp3 = otmp;
                const ix = arr.indexOf(otmp);
                if (ix >= 0) arr.splice(ix, 1);
            }
            otmp3.where = 3; // OBJ_MINVENT
            mtmp.minvent = mtmp.minvent || [];
            mtmp.minvent.push(otmp3);
            return true; // pick only one object
        }
    }
    return false;
}

// C ref: obj.h is_mines_prize/is_soko_prize — the luckstone/amulet reserved as
// the Mines'-End / Sokoban prize.  Tracked via achieveo.*_prize_oid, which our
// port does not populate on the ordinary early dungeon levels these sessions
// visit, so both are conservatively FALSE (matching C on those levels).
function is_mines_prize(_otmp) { return false; }
function is_soko_prize(_otmp) { return false; }

function m_search_items(mtmp, goal, ap) {
    const SQ = SQSRCHRADIUS; // 5
    let minr = SQ;
    const omx = mtmp.mx, omy = mtmp.my;
    const mux = mtmp.mux ?? game.u.ux, muy = mtmp.muy ?? game.u.uy;

    // C ref:1345 — cut the search radius when the hero is believed close.
    if (distmin(mux, muy, omx, omy) < SQ && !mtmp.mpeaceful) minr--;
    // (is_mercenary -> minr = 1 omitted: minr stays < SQ either way, and no
    //  recorded flee/balk monster is a mercenary; the finish_search branch is
    //  taken whenever the radius was cut, independent of the exact minr value.)

    // C ref:1354 — in a shop, usually skip the scan (rolls rn2(25)).  No hostile
    // flee/balk monster stands in a shop in the recorded sessions, so this is a
    // no-op here; kept faithful so the roll lands if a shop monster ever reaches
    // it.  mon_in_shop() is conservatively FALSE (no shop detection wired), which
    // matches the prior behaviour of not drawing this roll.
    if (mon_in_shop(omx, omy) && (rn2(25) || mtmp.isshk)) {
        /* goto finish_search */
    } else {
        // C ref: monmove.c:1413-1490 — scan a rect of radius minr for the NEAREST
        // object the monster would grab; redirect its goal (ggx/ggy) toward it.
        // Draws no rng (rng only in the shop rn2(25) above).
        const ptr = mtmp.data;
        const hmx = Math.min(COLNO - 1, omx + minr), hmy = Math.min(ROWNO - 1, omy + minr);
        const lmx = Math.max(1, omx - minr), lmy = Math.max(0, omy - minr);
        const objs = game.level?.objects || [];
        for (let xx = lmx; xx <= hmx; xx++) {
            for (let yy = lmy; yy <= hmy; yy++) {
                if (!OBJ_AT(xx, yy)) continue;
                if (minr < distmin(omx, omy, xx, yy)) continue;
                // could_reach_item: land monster in open cave/room reaches it (water/lava rare here).
                if (hides_under_pm(ptr) && cansee(xx, yy)) continue;
                // m_at immobile/hidden guard + onscary(Elbereth) omitted (not present here).
                const ttmp = t_at(xx, yy);
                if (ttmp && mon_knows_traps(mtmp, ttmp.ttyp)) {
                    if (goal.x === xx && goal.y === yy) { goal.x = mux; goal.y = muy; }
                    continue;
                }
                if (!m_cansee(mtmp, xx, yy)) continue;
                // costly_spot (shop) omitted -> false.
                for (const otmp of objs) {
                    if (otmp.ox !== xx || otmp.oy !== yy) continue;
                    if (otmp.otyp === ROCK) continue;
                    // is_mines_prize/is_soko_prize (luckstone/amulet) omitted — rare.
                    if (mon_would_take_item(mtmp, otmp) && can_carry(mtmp, otmp) > 0) {
                        minr = distmin(omx, omy, xx, yy);
                        goal.x = otmp.ox; goal.y = otmp.oy;
                        if (goal.x === omx && goal.y === omy) return true;
                        break;
                    }
                }
            }
        }
    }

    // C ref:1497 finish_search — a fleeing/balking monster whose search radius
    // was cut re-approaches unless it's already right next to the hero.
    if (minr < SQ && ap.appr === -1) {
        if (distmin(omx, omy, mux, muy) <= 3) {
            goal.x = mux; goal.y = muy;
        } else {
            ap.appr = 1;
        }
    }
    return false;
}

// C ref: shk.c *in_rooms(x,y,SHOPBASE) — is the square inside a shop?  No shop
// detection is wired into the move loop yet; the recorded flee/balk monsters are
// never in a shop, so a conservative FALSE preserves the (correct-here) rng
// stream.  Replace with real in_rooms(SHOPBASE) lookup when shop-monster parity
// is needed.
function mon_in_shop(_x, _y) { return false; }

// C ref: levl[x][y].lit — is the map square lit?  Mirrors dogmove.js isLit().
function levl_lit(x, y) { return !!game.level?.at(x, y)?.lit; }

// C ref: monflag.h M1_NOEYES — species with no eyes (blobs, jellies, molds,
// fungi, oozes/puddings, mimics, piercers, lurker/trapper, vortices, lights,
// elementals).  Indexed by makemon.js pmidx (mapped by name from
// include/monsters.h).  haseyes(ptr) == !M1_NOEYES.
const NOEYES_PMIDX = new Set([
    6, 7, 8, 56, 57, 58, 64, 65, 66, 78, 79, 80, 98, 99, 106, 107, 108, 109,
    110, 111, 118, 119, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164,
    206, 207, 208, 209,
]);
// C ref: mondata.c:623 can_track(ptr) — u_wield_art(EXCALIBUR) || haseyes(ptr).
// The hero never wields Excalibur in the recorded sessions, so this reduces to
// haseyes(ptr): an eyeless monster (M1_NOEYES) cannot follow the hero's scent
// trail and never takes the gettrack() redirect in m_move().
function can_track(ptr) { return !NOEYES_PMIDX.has(ptr?.pmidx); }

// Attack-type metadata (aatyp only — the to-hit gate and the MMOVE_MOVED
// "can shoot after move" decision only need attack TYPES, not damage).  Keyed
// by monster class (mcls / S_* index) for the orc class (all AT_WEAP), with a
// physical-melee default for the ordinary low-level dungeon monsters.  Ported
// from include/monsters.h mattk[] lists.
const AT_CLAW = 1, AT_BITE = 2, AT_KICK = 3;
// C ref: monattk.h — additional attack types used by the S_SNAKE family.
const AT_TUCH = 5, AT_HUGS = 7;
// C ref: monattk.h damage-type indices used by mhitm_adtyping().
const AD_PHYS = 0, AD_ELEC = 6;
// C ref: monattk.h AD_DRST (drains str / poison), AD_BLND (blinds), AD_WRAP.
const AD_DRST = 7, AD_BLND = 11, AD_WRAP = 28;

// Per-monster attack records (aatyp, adtyp, damn, damd) for the hostile
// monsters our move loop drives into mattacku().  Ported verbatim from
// include/monsters.h MON(...,ATTK(...)) lists, keyed by species name.  Each
// record carries the damage dice so hitmu() can roll d(damn,damd) faithfully.
// (uhitm.js keeps a parallel table for the hero-attack XP path; this one is
// for the monster-attacks-hero direction, where the dice must be rolled.)
function MA(aatyp, adtyp, damn, damd) { return { aatyp, adtyp, damn, damd }; }
const AD_STCK = 19; // monattk.h AD_STCK (sticky/holding) — large mimic claw; was 12
const MON_HITU_ATTACKS = {
    // grid bug — single AT_BITE / AD_ELEC, 1d1 (include/monsters.h grid bug).
    'grid bug': [MA(AT_BITE, AD_ELEC, 1, 1)],
    // S_BAT family (include/monsters.h): a bite whose dice differ per species.
    'bat': [MA(AT_BITE, AD_PHYS, 1, 4)],
    'giant bat': [MA(AT_BITE, AD_PHYS, 1, 6)],
    'vampire bat': [MA(AT_BITE, AD_PHYS, 1, 6)],
    // S_MIMIC family — a single claw; small=3d4 phys, large/giant=3d4/3d6 sticky.
    'small mimic': [MA(AT_CLAW, AD_PHYS, 3, 4)],
    'large mimic': [MA(AT_CLAW, AD_STCK, 3, 4)],
    'giant mimic': [MA(AT_CLAW, AD_STCK, 3, 6)],
    // S_RODENT rats — single AT_BITE / AD_PHYS, 1d3 (NOT the generic 1d4).
    'sewer rat': [MA(AT_BITE, AD_PHYS, 1, 3)],
    'giant rat': [MA(AT_BITE, AD_PHYS, 1, 3)],
    // S_LIZARD family (include/monsters.h): a single AT_BITE / AD_PHYS whose
    // dice differ from the generic 1d4 — the newt bites for 1d2 and the gecko
    // for 1d3, so a wrong die changes the rolled value even at aligned RNG
    // (RND(x) modulo differs) — seed0002 newt = 1d2.
    'newt': [MA(AT_BITE, AD_PHYS, 1, 2)],
    'gecko': [MA(AT_BITE, AD_PHYS, 1, 3)],
    // S_DOG family (include/monsters.h): a single AT_BITE whose dice vary per
    // species — the generic fallback below is 1d4, but the jackal (1d2), fox
    // (1d3), little dog/dog (1d6) and large dog (2d4) differ, so name them here.
    // The bite damage d(damn,damd) is rolled in hitmu; a wrong die changes the
    // value even at aligned RNG (RND(x) modulo differs) — seed0007 fox = 1d3.
    'jackal': [MA(AT_BITE, AD_PHYS, 1, 2)],
    'fox': [MA(AT_BITE, AD_PHYS, 1, 3)],
    'coyote': [MA(AT_BITE, AD_PHYS, 1, 4)],
    'little dog': [MA(AT_BITE, AD_PHYS, 1, 6)],
    'dog': [MA(AT_BITE, AD_PHYS, 1, 6)],
    'large dog': [MA(AT_BITE, AD_PHYS, 2, 4)],
    // S_FELINE family (include/monsters.h): AT_BITE (cats) — kitten/housecat
    // 1d6, large cat 2d4 (the bigger cats above are AT_CLAW, not placed here).
    'kitten': [MA(AT_BITE, AD_PHYS, 1, 6)],
    'housecat': [MA(AT_BITE, AD_PHYS, 1, 6)],
    'large cat': [MA(AT_BITE, AD_PHYS, 2, 4)],
    // S_ORC family (include/monsters.h): a single AT_WEAP attack whose dice
    // vary per species — the generic S_ORC fallback below is 1d6, but the
    // goblin (1d4), orc (1d8) and Uruk-hai (1d8) differ, so name them here.
    // The base damage d(damn,damd) is rolled in hitmu BEFORE the wielded
    // weapon's dmgval is added, so the dice must be exact (seed0360 goblin).
    'goblin': [MA(AT_WEAP, AD_PHYS, 1, 4)],
    'hobgoblin': [MA(AT_WEAP, AD_PHYS, 1, 6)],
    'orc': [MA(AT_WEAP, AD_PHYS, 1, 8)],
    'hill orc': [MA(AT_WEAP, AD_PHYS, 1, 6)],
    'Mordor orc': [MA(AT_WEAP, AD_PHYS, 1, 6)],
    'Uruk-hai': [MA(AT_WEAP, AD_PHYS, 1, 8)],
    // S_GNOME family (include/monsters.h): the Mines' weapon-wielding gnomes.
    // A plain gnome has a single AT_WEAP/AD_PHYS attack — it "hits" (not the
    // generic "bites"); the lord/king dice differ (seed0030 step-47 gnome,
    // d(1,6) base before any wielded-weapon dmgval).  gnomish wizard is AT_MAGC
    // (spellcaster, handled elsewhere) so it is intentionally not listed here.
    'gnome': [MA(AT_WEAP, AD_PHYS, 1, 6)],
    'gnome lord': [MA(AT_WEAP, AD_PHYS, 1, 8)],
    'gnome king': [MA(AT_WEAP, AD_PHYS, 2, 6)],
    // S_SNAKE family (include/monsters.h).  The cobra's AT_SPIT (AD_BLND) is the
    // distance attack that makes ranged_attk_available() TRUE, so a hostile cobra
    // that can see the hero balks (m_balks_at_approaching -> appr=-1) and keeps
    // its range instead of closing in.  The two blue 'S' species (pit viper /
    // cobra) MUST be distinguished by name: only the cobra spits.
    'garter snake': [MA(AT_BITE, AD_PHYS, 1, 2)],
    'snake': [MA(AT_BITE, AD_DRST, 1, 6)],
    'water moccasin': [MA(AT_BITE, AD_DRST, 1, 6)],
    'python': [MA(AT_BITE, AD_PHYS, 1, 4), MA(AT_TUCH, AD_PHYS, 0, 0),
        MA(AT_HUGS, AD_WRAP, 1, 4), MA(AT_HUGS, AD_PHYS, 2, 4)],
    'pit viper': [MA(AT_BITE, AD_DRST, 1, 4), MA(AT_BITE, AD_DRST, 1, 4)],
    'cobra': [MA(AT_BITE, AD_DRST, 2, 4), MA(AT_SPIT, AD_BLND, 0, 0)],
    // S_ELEMENTAL earth elemental (include/monsters.h): a single AT_CLAW /
    // AD_PHYS 4d6 attack — it "hits", not "bites" (seed4500 step-268).
    'earth elemental': [MA(AT_CLAW, AD_PHYS, 4, 6)],
    // (major) demon "water demon" (include/monsters.h): AT_WEAP/AT_CLAW/AT_BITE,
    // all AD_PHYS 1d3 — it is_armed (m_initweap_full may give it a weapon, e.g.
    // a dagger stack via the S_DEMON default-bias case4), so the AT_WEAP slot
    // must be listed first to match C's attack order (wield-then-claw within
    // the same turn when AT_WEAP only wields, seed0006 step-103).
    'water demon': [MA(AT_WEAP, AD_PHYS, 1, 3), MA(AT_CLAW, AD_PHYS, 1, 3),
        MA(AT_BITE, AD_PHYS, 1, 3)],
};
function mon_attacks(mdat) {
    if (!mdat) return [];
    const named = MON_HITU_ATTACKS[mdat.name];
    if (named) return named;
    // Orc class (goblin/hobgoblin/orc/hill orc/...) — single AT_WEAP attack.
    if (mdat.mcls === S_ORC) return [MA(AT_WEAP, AD_PHYS, 1, 6)];
    // Kobold class — single AT_WEAP attack (include/monsters.h: kobold 1d4,
    // large kobold 1d6, kobold leader 2d4).  Carries darts via m_initthrow, so
    // at range it throws (thrwmu) rather than melees.  The base 1d4 covers the
    // common kobold; larger variants aren't placed by the low-level slice.
    if (mdat.mcls === S_KOBOLD) return [MA(AT_WEAP, AD_PHYS, 1, 4)];
    // The remaining monsters our move loop drives use simple physical melee
    // (AT_BITE / AT_CLAW / AT_KICK) with no AT_WEAP / ranged component, so the
    // weapon / ranged gates are FALSE for them.  We return a generic single
    // melee attack: enough to make noattacks() FALSE without claiming AT_WEAP.
    return [MA(AT_BITE, AD_PHYS, 1, 4)];
}

// C ref: mhitu.c:489 mattacku(mtmp) — a monster attacks the hero.  Returns 1
// if the monster dies (rare; e.g. yellow light), 0 otherwise.
//
// SCOPE: faithfully reproduces the RNG-bearing control flow exercised by the
// contest's mon-vs-hero/steed combat: the swallowed/hidden/mimic early-outs
// don't apply (no such state in the sessions), so we go straight to the
// u.usteed steed-redirect (mhitu.c:534 rn2(is_orc?2:4)) and then the standard
// attack loop.  For an attack that is range2 (the monster's apparent target is
// not adjacent) the hand-to-hand cases roll nothing; AT_WEAP at range calls
// thrwmu(), which is a no-op (no thrown weapon) for these monsters.  When the
// monster IS adjacent and found the hero, the to-hit rnd(20+i) is rolled and
// hitmu/missmu resolve it — hitmu damage isn't modeled yet, so a *successful*
// adjacent hit declines further RNG (clean divergence, never a silent desync).
async function mattacku(mtmp, mdat) {
    const u = game.u;

    // calc_mattacku_vars: range2/foundyou from the APPARENT position (mux/muy).
    const mux = mtmp.mux ?? mtmp.mx, muy = mtmp.muy ?? mtmp.my;
    const range2 = !((Math.abs(mtmp.mx - mux) <= 1) && (Math.abs(mtmp.my - muy) <= 1));
    const foundyou = (mux === u.ux && muy === u.uy);

    // u.uswallow path not modeled (never swallowed in these sessions).

    // ── steed redirect (mhitu.c:524) ────────────────────────────────────────
    if (u.usteed) {
        if (mtmp === u.usteed) return 0; /* your steed won't attack you */
        // Orcs like to steal and eat horses and the like.  The rn2() is
        // evaluated first (C &&, left-to-right) so it ALWAYS rolls here.
        if (!rn2(is_orc(mdat) ? 2 : 4) && m_next2u(mtmp)) {
            const i = await mattackm(mtmp, u.usteed);
            if (i & M_ATTK_AGR_DIED) return 1;
            if ((i & M_ATTK_DEF_DIED) || !u.usteed || !m_next2u(mtmp))
                return 0;
            // Let your steed retaliate.
            return ((await mattackm(u.usteed, mtmp)) & M_ATTK_DEF_DIED) ? 1 : 0;
        }
    }

    // ── standard attack loop (mhitu.c:765) ──────────────────────────────────
    // AC differential (mhitu.c:707): tmp = AC_VALUE(u.uac) + 10.
    // C ref hack.h: AC_VALUE(AC) = (AC >= 0) ? AC : -rnd(-AC) — a NEGATIVE hero
    // AC rolls rnd(-uac) here (always, before any attack roll).
    const uac = u.uac ?? 10;
    const acval = (uac >= 0) ? uac : -rnd(-uac);
    let tmp = acval + 10;
    tmp += (mtmp.m_lev ?? mdat?.mlevel ?? 0);
    if ((u.multi ?? 0) < 0) tmp += 4;
    if (!mtmp.mcansee) tmp -= 2;
    if (mtmp.mtrapped) tmp -= 2;
    if (tmp <= 0) tmp = 1;

    // C ref mhitu.c:718 — a non-cancelled, non-shapechanged demon rolls its
    // "summon more demons" gate EVERY combat turn (summonmu -> is_demon), even
    // when the roll doesn't fire; this always consumes an rn2 before the
    // attack loop, shifting every later roll in the turn if skipped (seed0006
    // water demon step-103 bite dice).  mtmp.cham is never populated by this
    // port (no chameleon-shapechanger monster reaches combat here), so treat
    // it as always NON_PM (-1, "not currently shapechanged").
    const cham = mtmp.cham ?? -1;
    if (cham === -1 && !mtmp.mcan && !range2 && is_demon(mdat)) {
        // summonmu(mtmp): the two demon species exempted from summoning
        // (Balrog / incubus-succubus "amorous demon") aren't in the melee
        // sessions this port drives, so only the roll itself is needed here.
        const inhell = (u.uz?.dnum ?? 0) === (game.gehennom_dnum ?? 5);
        if (!rn2(inhell ? 10 : 16)) {
            // msummon(mtmp): rare demon-summon consequence, not modeled —
            // an honest divergence rather than a silent RNG desync.
        }
        // is_were(mdat) branch not modeled: no were-creature reaches
        // mattacku in this port yet, so it would be dead code.
    }

    // C ref mhitu.c:758 — unlike defensive items, a monster won't both use an
    // offensive item AND melee: if it finds one, it uses it and its turn ends.
    if (find_offensive(mtmp)) {
        const offended = await use_offensive(mtmp);
        if (offended !== 0) return (offended === 1) ? 1 : 0;
    }

    const atks = mon_attacks(mdat);
    let skipnonmagc = false;
    const AT_MAGC = 255; // monattk.h AT_MAGC (was 8; cf. AT_WEAP 254 above)
    for (let i = 0; i < atks.length; i++) {
        const mattk = atks[i];
        // C ref mhitu.c:786 — after a wildmiss, skip later non-spell attacks.
        if (skipnonmagc && mattk.aatyp !== AT_MAGC) continue;
        switch (mattk.aatyp) {
        case AT_CLAW:
        case AT_KICK:
        case AT_BITE: {
            if (!range2) {
                if (foundyou) {
                    const j = rnd(20 + i);          // mhitu.c:806
                    if (tmp > j) {
                        // mhitu.c:812 — sum[i] = hitmu(mtmp, mattk).
                        if (await hitmu(mtmp, mdat, mattk)) return 1;
                    } else {
                        // mhitu.c:814 — missmu(mtmp, tmp==j, mattk).
                        await missmu(mtmp, tmp === j);
                    }
                } else {
                    // wildmiss(): no RNG; skip remaining non-magic attacks.
                    skipnonmagc = true;
                }
            }
            break;
        }
        case AT_WEAP: {
            if (range2) {
                // C ref mhitu.c:884 — thrwmu(mtmp) for a range2 weapon attacker.
                // A goblin (S_ORC) that carries an orcish ("crude") dagger and
                // is lined up with the hero throws it; select_rwep / lined_up /
                // monmulti consume no RNG for a single non-ammo weapon, so the
                // whole RNG cost is m_throw's per-square forcehit rolls plus the
                // hero-hit resolution (u_catch_thrown_obj / dmgval / thitu).
                if (!Is_rogue_level()) await thrwmu(mtmp, mdat);
            } else if (foundyou) {
                // C ref mhitu.c:894 — wield a melee weapon first if the monster
                // needs one (weapon_check NEED_WEAPON, or no MON_WEP yet).  The
                // wield consumes no RNG; for the goblin it's usually a no-op (it
                // already wielded its crude dagger when fighting the pet).  When
                // mon_wield_item actually wields (returns 1) the attack breaks
                // (this turn was spent wielding) — matching C's `break`.
                if (mtmp.weapon_check === NEED_WEAPON_MM || !MON_WEP(mtmp)) {
                    mtmp.weapon_check = NEED_HTH_WEAPON_MM;
                    if (await mon_wield_item(mtmp)) break;
                }
                // C ref mhitu.c:907 — hittmp = hitval(mon_currwep); tmp += hittmp;
                // mswings(...).  hitval is the weapon's to-hit bonus (deterministic,
                // no RNG); the orcish dagger oc_hitbon is 2.
                let hittmp = 0;
                const mwep = MON_WEP(mtmp);
                if (mwep) {
                    hittmp = thrown_hitbon(mwep.otyp); // hitval == oc_hitbon here
                    tmp += hittmp;
                    // mhitu.c:903 — bash: a polearm used at too-close range
                    // (no ART_SNICKERSNEE reachable here).
                    const bash = is_pole(mwep) && m_next2u(mtmp);
                    await mswings_mm(mtmp, mwep, bash);
                }
                const j = rnd(20 + i);          // mhitu.c:912
                if (tmp > j) {
                    if (await hitmu(mtmp, mdat, mattk)) return 1;
                } else {
                    await missmu(mtmp, tmp === j);
                }
                tmp -= hittmp; // KMH: don't accumulate to-hit bonuses
            } else {
                // wildmiss(): no RNG.
                skipnonmagc = true;
            }
            break;
        }
        case AT_SPIT:
            // C ref: mhitu.c:878 — a ranged spitting attacker (cobra AT_SPIT
            // AD_BLND) spits at the hero when range2 (not adjacent to the
            // hero's believed square).  spitmu -> spitmm.
            if (range2) {
                if (await spitmu(mtmp, mattk)) return 1;
            }
            break;
        default:
            break;
        }
    }
    return 0;
}

// C ref: mthrowu.c:1268 spitmu(mtmp, mattk) -> spitmm(mtmp, mattk, &youmonst).
async function spitmu(mtmp, mattk) {
    return await spitmm(mtmp, mattk);
}

const AD_ACID_MM = 6; // monattk.h AD_ACID (cobra/snake spit is AD_BLND, not acid)

// C ref: mthrowu.c:1041 spitmm(mtmp, mattk, mtarg=&youmonst) — the venom-spit.
// A non-cancelled attacker that is m_lined_up with the hero mints a venom
// object (mksobj rolls next_ident rnd(2)); then a `!rn2(BOLT_LIM - distmin)`
// gate decides whether the spit actually flies (m_throw) or fizzles (the venom
// is discarded with no throw).  seed4500 step-272: gate rolls non-zero -> the
// cobra's spit fizzles (2 RNG calls, no message); step-274: gate 0 -> it spits.
async function spitmm(mtmp, mattk) {
    const u = game.u;
    // mcan dry-rattle branch: the contest's cobra is never cancelled, so the
    // "dry rattle" message path (no venom object) isn't modeled here.
    if (mtmp.mcan) return 0;
    if (!m_lined_up(mtmp)) return 0;

    const tx = mtmp.mux ?? u.ux, ty = mtmp.muy ?? u.uy;
    // mksobj(BLINDING_VENOM/ACID_VENOM, TRUE, FALSE): the only RNG a venom
    // object's creation draws is its o_id via next_ident() [rnd(2)].
    const otyp = (mattk.adtyp === AD_ACID_MM) ? ACID_VENOM : BLINDING_VENOM;
    next_ident();
    const otmp = { otyp, oclass: VENOM_CLASS, quan: 1, spe: 0 };

    const dm = distmin(mtmp.mx, mtmp.my, tx, ty);
    if (!rn2(BOLT_LIM - dm)) {                        // mthrowu.c:1074
        if (canseemon_mm(mtmp)) {
            const { update_topl } = await import('./display.js');
            await update_topl(`${Monnam(mtmp)} spits venom!`);
        }
        await m_throw_venom(mtmp, mtmp.mx, mtmp.my, sgn(tx - mtmp.mx),
                            sgn(ty - mtmp.my), dm, otmp);
        // nomul(0): no RNG.
        return 1;
    }
    // gate non-zero -> obj_extract_self + obfree: the venom is discarded, no
    // throw, no further RNG (seed4500 step-272 fizzle).
    return 0;
}

// C ref: mthrowu.c:571 m_throw() for a VENOM_CLASS missile aimed at the hero.
// Scoped to the venom path: fly one square at a time; at the hero's square the
// blinding/acid venom resolves via thitu(8, 0) (BLINDING_VENOM: tlev 8, dam 0);
// every non-hit square rolls the forcehit `!rn2(5)` (mthrowu.c:798).  A venom
// always breaks on landing (drop_throw delobj — no RNG).  (No mid-flight
// monster in the venom's path in the seed4500 spit, so ohitmon isn't modeled.)
async function m_throw_venom(mtmp, sx, sy, dx, dy, range, otmp) {
    const u = game.u;
    let bx = sx, by = sy;
    while (range-- > 0) {
        bx += dx; by += dy;
        if (bx === u.ux && by === u.uy) {
            // BLINDING_VENOM: thitu(8, 0, &venom) — to-hit only, no damage.
            const tlev = 8;
            const hitu = await thitu(tlev, 0, otmp);
            if (hitu) {
                // can_blnd / make_blinded not modeled (the recorded spit misses).
                // drop_throw(venom, hitu, ...) delobj — no RNG.
                return;
            }
            // miss: the venom flies on (C does NOT break on a hero miss).
        }
        // forcehit roll (mthrowu.c:798) fires on every non-hit square crossed.
        rn2(5);
    }
    // reached end of range: the venom lands and breaks.  C rolls a single
    // obj_resists() rn2(100) here as the venom is disposed of (seed4500 step-274
    // fires exactly one rn2(100) after the last forcehit).
    rn2(100);
}

// ── monster ranged throw at hero (mthrowu.c thrwmu / m_throw / thitu) ───────
// C ref: mthrowu.c:1174 thrwmu(mtmp).  Scoped to the path the contest sessions
// exercise: a hostile S_ORC (goblin) that carries an orcish ("crude") dagger
// in minvent and is lined up with the hero throws it.  RNG cost (verified
// against the seed0108 step-30 trace):
//   m_throw   : one rn2(5) "forcehit" roll per EMPTY square the missile crosses
//   u_catch_thrown_obj : rn2(100 - ACURR(A_DEX))  (catch attempt at hero square)
//   dmgval    : rnd(oc_wsdam)                       (base missile damage)
//   thitu     : rnd(20)                             (the to-hit dieroll)
// The losehp() + exercise(A_STR, FALSE) [rn2(2)] that follow a HIT are emitted
// after the "You are hit ..." message has paged via --More-- (so the exercise
// roll lands in the next recorded step, exactly as C records it).
//
// Object metadata for the thrown weapons the sessions use (objects.h WEAPON()):
//   dagger: oc_wsdam 4, oc_hitbon 2.  orcish dagger / "crude dagger": oc_wsdam
//   3, oc_hitbon 2, oclass WEAPON.
const DAGGER_OTYP = 34;
const ORCISH_DAGGER_OTYP = 36;
const DART_OTYP = 24; // include/objects.h WEAPON("dart"): otyp 24, oc_skill -P_DART
const WEAPON_CLASS_MM = 2; // mkobj.js WEAPON_CLASS (dart/dagger oclass)
function thrown_wsdam(otyp) {
    // C ref: objects.h WEAPON() oc_wsdam (small-monster damage die).  Plain
    // dagger sdam 4; orcish dagger sdam 3; dart sdam 3.  A launcher wielded as
    // a club (bow/elven bow/orcish bow/yumi/sling/crossbow) has oc_wsdam 2 —
    // the gnome that hurled its potion then bashes the hero with its bow
    // (dmgval rnd(2)).  (Other otyps fall back to a clean default of 1.)
    if (otyp === DAGGER_OTYP) return 4;
    if (otyp === ORCISH_DAGGER_OTYP) return 3;
    if (otyp === DART_OTYP) return 3;
    if (otyp >= 83 && otyp <= 88) return 2; // BOW..CROSSBOW launchers
    return 1;
}
function thrown_hitbon(otyp) {
    if (otyp === DAGGER_OTYP || otyp === ORCISH_DAGGER_OTYP) return 2;
    if (otyp === DART_OTYP) return 0; // dart oc_hitbon 0
    return 0;
}
// C ref: mondata.h is_missile(obj) — TRUE for dart/shuriken/boomerang (the
// thrown-missile skill classes).  Only such missiles run should_mulch_missile()
// on impact (an extra rn2 roll); a plain dagger never mulches.
function is_missile_otyp(otyp) {
    return otyp === DART_OTYP; // (shuriken/boomerang not thrown by the owned mons)
}

// C ref: weapon.c:215 dmgval(otmp, &youmonst) for a small (non-big) hero hit by
// a thrown weapon: tmp = rnd(oc_wsdam); tmp += spe (>=0 here).  The blessed/
// silver/axe-vs-wood bonuses don't apply (human hero, plain iron dagger).
function dmgval_thrown(otmp, mon) {
    let tmp = 0;
    const wsdam = thrown_wsdam(otmp.otyp);
    if (wsdam) tmp = rnd(wsdam);
    if (otmp.oclass === WEAPON_CLASS_MM) {
        tmp += (otmp.spe | 0);
        if (tmp < 0) tmp = 0;
    }
    return tmp;
}

// ── monster weapon wielding (C ref: weapon.c select_hwep / mon_wield_item) ──
// A monster with an AT_WEAP attack wields the best hand-to-hand weapon it
// carries before fighting.  The wield itself consumes NO RNG (select_hwep walks
// a fixed priority list and m_carrying is a deterministic inventory scan); it
// only prints "<Mon> wields <weapon>!" and sets MON_WEP.  Implemented so the
// goblin's crude dagger shows up (seed0360 step-136 message + step-140 dmgval).

// C ref: include/onames.h — hand-to-hand weapon priority list (weapon.c hwep[]),
// restricted to the otyps the contest's armed monsters actually carry.  Only the
// orcish dagger (36) is reachable for the low-level orc/kobold slice; the rest
// are listed for faithful priority order should a richer monster appear.
const HWEP_PRIORITY = [55 /*TWO_HANDED_SWORD*/, 45 /*BATTLE_AXE*/,
    54 /*LONG_SWORD*/, 52 /*BROADSWORD*/, 50 /*SCIMITAR*/, 46 /*SHORT_SWORD*/,
    48 /*ORCISH_SHORT_SWORD*/, 73 /*MACE*/, 44 /*AXE*/, 27 /*SPEAR*/,
    30 /*DWARVISH_SPEAR*/, 28 /*ELVEN_SPEAR*/, 77 /*CLUB*/, 34 /*DAGGER*/,
    35 /*ELVEN_DAGGER*/, 36 /*ORCISH_DAGGER*/, 40 /*KNIFE*/];

// C ref: weapon.c m_carrying(mon, otyp) — the monster's first minvent obj of
// that type, else null.
function m_carrying(mon, otyp) {
    for (const o of (mon?.minvent || [])) if (o.otyp === otyp) return o;
    return null;
}

// C ref: weapon.c select_hwep(mtmp) — choose the best wieldable melee weapon.
// No RNG.  The contest monsters carry no artifacts/silver/bimanual conflicts,
// so the priority scan reduces to "first carried weapon in hwep[] order".
function select_hwep(mtmp) {
    for (const otyp of HWEP_PRIORITY) {
        const o = m_carrying(mtmp, otyp);
        if (o) return o;
    }
    return null;
}

// C ref: include/mondata.h MON_WEP(mon) — the monster's wielded weapon (mw).
export function MON_WEP(mon) { return mon?.mw || null; }

// C ref: weapon.c mon_wield_item(mon) — wield the best weapon per weapon_check.
// Returns 1 if the monster took time (actually wielded a different weapon), 0
// otherwise.  No RNG.  Faithful to the NEED_HTH_WEAPON path used by the armed
// orc/kobold combat (the only weapon_check the contest reaches).
export async function mon_wield_item(mon) {
    if (mon.weapon_check === NO_WEAPON_WANTED_MM) return 0;
    let obj;
    if (mon.weapon_check === NEED_RANGED_WEAPON_MM) {
        // C ref: weapon.c:813 — select_rwep sets gp.propellor (the launcher to
        // wield); a &hands_obj propellor (thrown dagger/dart) means no launcher
        // is needed, so nothing is wielded and thrwmu falls through to throw.
        select_rwep(mon);
        obj = (_propellor === HANDS_OBJ) ? null : _propellor;
    } else {
        obj = select_hwep(mon);       // NEED_HTH_WEAPON / NEED_WEAPON
    }
    if (obj && obj !== HANDS_OBJ) {
        const mw_tmp = MON_WEP(mon);
        if (mw_tmp && mw_tmp.otyp === obj.otyp) {
            mon.weapon_check = NEED_WEAPON_MM; // already wielding it
            return 0;
        }
        mon.mw = obj;                 // wield obj (setmnotwielded old is implicit)
        mon.weapon_check = NEED_WEAPON_MM;
        if (canseemon_mm(mon)) {
            // C ref: weapon.c:892 pline_mon(mon, "%s wields %s%c", Monnam(mon),
            // doname(obj), exclaim?'!':'.').  doname() is quantity-aware (a
            // multi-object stack like a demon's carried daggers reads "5
            // daggers", not "a dagger"), so use the real invent.js naming
            // rather than the single-item mshot_xname/an_name pair.
            const { update_topl } = await import('./display.js');
            const { floor_object_name } = await import('./invent.js');
            await update_topl(`${Monnam(mon)} wields ${floor_object_name(obj)}!`);
        }
        return 1;
    }
    // C ref: weapon.c:932 — the no-object fallthrough (no HTH weapon carried, or
    // a ranged check that needs no launcher) resets weapon_check to NEED_WEAPON
    // unconditionally, so a later dochug/mattackm re-check finds it eligible
    // again instead of stuck at whatever check value was in effect this call.
    mon.weapon_check = NEED_WEAPON_MM;
    return 0;
}
// weapon_check enum values (C ref: monst.h wpn_chk_flags).
const NO_WEAPON_WANTED_MM = 0, NEED_WEAPON_MM = 1, NEED_RANGED_WEAPON_MM = 2, NEED_HTH_WEAPON_MM = 3;
const HANDS_OBJ = null; // C's &hands_obj sentinel — never selected here.

// C ref: objects.h WEAPON()/PROJECTILE()/BOW() oc_dir strike-type bits
// (P=PIERCE=1, S=SLASH=2, B=WHACK=4; "weapon strike mode overloads the oc_dir
// field") for every WEAPON_CLASS otyp (18 arrow .. 88 crossbow) a monster can
// wield/throw.  Launchers (bow..crossbow, 83-88) get 0 (the BOW() macro always
// passes a literal 0 for this field, regardless of sub-type) — that's why a
// gnome bashing with its bow "swings" rather than "thrusts".
const WEAPON_ODIR = {
    18: 1, 19: 1, 20: 1, 21: 1, 22: 1, 23: 1,           // arrows/ya/bolt: P
    24: 1, 25: 1, 26: 0,                                 // dart/shuriken: P; boomerang: 0
    27: 1, 28: 1, 29: 1, 30: 1, 31: 1, 32: 1, 33: 1,     // spears + trident: P
    34: 1, 35: 1, 36: 1, 37: 1,                          // daggers: P
    38: 2, 39: 2,                                        // athame/scalpel: S
    40: 1 | 2, 41: 1 | 2,                                 // knife/stiletto: P|S
    42: 0, 43: 1,                                         // worm tooth: 0; crysknife: P
    44: 2, 45: 2,                                         // axe/battle-axe: S
    46: 1, 47: 1, 48: 1, 49: 1,                          // short swords: P
    50: 2, 51: 2, 52: 2, 53: 2, 54: 2, 55: 2, 56: 2, 57: 2, 58: 2, // sabers/broad/long/2h/katana/tsurugi/runesword: S
    59: 1, 60: 1, 61: 1,                                 // partisan/ranseur/spetum: P
    62: 2,                                                // glaive: S
    63: 1 | 2,                                            // halberd: P|S
    64: 2, 65: 2,                                         // bardiche/voulge: S
    66: 1 | 2,                                            // fauchard: P|S
    67: 2,                                                // guisarme: S
    68: 1 | 2,                                            // bill-guisarme: P|S
    69: 4 | 1, 70: 4 | 1,                                 // lucern hammer/bec de corbin: B|P
    71: 4,                                                 // dwarvish mattock: B
    72: 1,                                                 // lance: P
    73: 4, 74: 4, 75: 4, 76: 4, 77: 4,                    // mace/silver mace/morning star/war hammer/club: B
    78: 4,                                                 // rubber hose: B (but P_WHIP -> lash, see below)
    79: 4, 80: 4, 81: 4,                                  // quarterstaff/aklys/flail: B
    82: 0,                                                 // bullwhip: 0 (P_WHIP -> lash)
    83: 0, 84: 0, 85: 0, 86: 0, 87: 0, 88: 0,             // bow..crossbow launchers: 0
};
// oc_skill P_WHIP otyps (objects.h): rubber hose 78, bullwhip 82.
const WHIP_OTYP = new Set([78, 82]);

// C ref: mhitu.c mswings_verb(mwep, bash) — strike-type verb selection.
// lash = oc_skill==P_WHIP (is_wet_towel() not modeled: no towels reachable
// here).  thrust = (dir has PIERCE) && (dir has ONLY pierce, or rn2(2) picks
// thrust over the mixed slash/bash alternative) — the rn2(2) only fires for
// weapons with PIERCE plus another bit set (knife/stiletto/halberd/fauchard/
// bill-guisarme/lucern hammer/bec de corbin), matching C's short-circuit.
function mswings_verb(otemp, bash) {
    const dir = WEAPON_ODIR[otemp?.otyp] ?? 0;
    const lash = WHIP_OTYP.has(otemp?.otyp);
    const thrust = (dir & 1) !== 0 && ((dir & ~1) === 0 || !rn2(2));
    return bash ? 'bashes with' : lash ? 'lashes' : thrust ? 'thrusts' : 'swings';
}

// C ref: mhitu.c mswings(mtmp, otemp, bash) — "<Mon> <verb> [one of] <his>
// <weapon>." when the attacker (and weapon) is visible.  A multi-item stack
// (e.g. a demon's 5 carried daggers) reads "one of his daggers" — xname()'s
// bare pluralized name, with no leading count digit (that belongs to
// doname() alone), so this uses cxname_singular()+makeplural rather than the
// digit-prefixing invent.js xname().  Display-only.
async function mswings_mm(mtmp, otemp, bash) {
    if (!canseemon_mm(mtmp)) return;
    const verb = mswings_verb(otemp, bash);
    const hisher = mtmp.female ? 'her' : 'his';
    const { update_topl } = await import('./display.js');
    const { cxname_singular, makeplural } = await import('./invent.js');
    const quan = otemp?.quan ?? 1;
    const oneOf = quan > 1 ? 'one of ' : '';
    const base = cxname_singular(otemp);
    const name = quan > 1 ? makeplural(base) : base;
    await update_topl(`${Monnam(mtmp)} ${verb} ${oneOf}${hisher} ${name}.`);
}

// C ref: include/attrib.h ACURR(A_DEX) — the hero's current Dexterity.  Stored
// as game.u.acurr.a[A_DEX] (A_DEX == 3), matching attrib.js / uhitm.js.
const A_DEX_IDX = 3;
function ACURR_DEX() {
    return game.u?.acurr?.a?.[A_DEX_IDX] ?? 0;
}

// C ref: mthrowu.c:532 u_catch_thrown_obj(otmp).  The recorded heroes aren't
// blind/confused/stunned/fumbling, have hands and a free hand, and the missile
// is light, so the only gate that matters is the rn2(100 - Dex) catch roll
// (monks/rogues get -20 but the wizard here is neither).  A non-zero roll means
// "didn't catch" -> returns FALSE and the missile proceeds to thitu().
function u_catch_thrown_obj(otmp) {
    const dex = ACURR_DEX();
    let catch_chance = 100 - dex;
    if (catch_chance < 1) catch_chance = 1; // guard rn2(0)
    if (!rn2(catch_chance)) {
        // Catch succeeds — not exercised by the owned sessions (Dex 18 -> 1/82),
        // but model it faithfully: the missile is added to inventory.
        return true;
    }
    return false;
}

// C ref: mthrowu.c:78 thitu(tlev, dam, objp, name) — resolve a thrown missile
// landing on the hero.  Rolls dieroll = rnd(20); hits when u.uac + tlev >
// dieroll.  On a hit: "You are hit by <a crude dagger>!"; then losehp(dam) +
// exercise(A_STR, FALSE).  Returns 1 on a hit (the missile stops), 0 on a miss.
async function thitu(tlev, dam, otmp) {
    const { update_topl } = await import('./display.js');
    const { exercise } = await import('./attrib.js');
    const u = game.u;
    const uac = u?.uac ?? 10;
    const dieroll = rnd(20);                         // mthrowu.c:106
    const onm = mshot_xname(otmp);                   // "crude dagger"
    // C ref: mthrowu.c thitu() — Blind or !flags.verbose collapses the feedback
    // to the terse "It misses." / "You are hit!" forms (seed4500 has !verbose).
    const verbose = game.flags?.verbose !== false;
    const terse = Blind() || !verbose;
    if (uac + tlev <= dieroll) {
        if (terse) await update_topl('It misses.');
        // C ref: mthrowu.c thitu() miss branch — for a single (quan==1) thrown
        // object, onm = an(name) -> "a dart"; the message is
        // pline("%s %s you.", upstart(onmbuf), vtense(onmbuf, "miss")) ->
        // "A dart misses you." (not "The dart ...").
        else if (uac + tlev <= dieroll - 2) await update_topl(`${upstart_mm(an_name(onm))} misses you.`);
        else await update_topl(`You are almost hit by ${an_name(onm)}.`);
        return 0;
    }
    // Hit.  C: You("are hit by %s%s", onm, exclam(dam)) (verbose) or
    // You("are hit%s", exclam(dam)) (terse).
    if (terse) await update_topl(`You are hit${exclam(dam)}`);
    else await update_topl(`You are hit by ${an_name(onm)}${exclam(dam)}`);
    // losehp(dam) [no RNG] then exercise(A_STR, FALSE) [rn2(2)].
    await mdamageu(null, dam);
    exercise(0 /*A_STR*/, false);
    return 1;
}

// C ref: hacklib.c exclam(force) — "!" for damage > 5, "." otherwise (the
// punctuation after the hit message).  Here daggers do <= 5 so it's "!".
function exclam(force) { return force > 5 ? '!' : '.'; }

// C ref: objnam.c mshot_xname() — the singular display name of a thrown weapon
// (its appearance when unidentified).  The orcish dagger appears as "crude
// dagger".
function mshot_xname(otmp) {
    if (otmp?.otyp === ORCISH_DAGGER_OTYP) return 'crude dagger';
    if (otmp?.otyp === DART_OTYP) return 'dart'; // dart has no unidentified appearance
    return otmp?.oname || 'missile';
}
// C ref: objnam.c an() — prefix the appropriate indefinite article.
function an_name(s) {
    return /^[aeiou]/i.test(s) ? `an ${s}` : `a ${s}`;
}
// C ref: hacklib.c upstart() — capitalize the first letter of a string.
function upstart_mm(s) {
    return s ? s[0].toUpperCase() + s.slice(1) : s;
}

// C ref: mthrowu.c m_throw() — fly the single missile from (x,y) toward the
// hero along (dx,dy) up to `range` squares.  Faithful loop (mthrowu.c:673-808):
// each iteration advances one square; on the hero square the catch attempt and
// thitu() resolve — a HIT drops the missile and STOPS (break before the
// forcehit roll), a MISS lets the dart fly ON.  Every non-hit iteration then
// rolls the forcehit `!rn2(5)` (mthrowu.c:798) and, when the range is exhausted,
// drops the missile where it lands.  (No intervening monster / blocked terrain
// in the owned sessions, so ohitmon / MT_FLIGHTCHECK aren't modelled.)
//
// Display: when the missile has a class symbol (sym) and isn't a tethered
// weapon, C runs tmp_at(DISP_FLASH, obj_to_glyph(singleobj)) then, at the end of
// each non-terminal square, tmp_at(bhitpos.x, bhitpos.y) — drawing the in-flight
// glyph at the current square while restoring (newsym) the previously flashed
// one.  So when thitu() shows the "You are hit by ..."  --More-- pause for an
// adjacent thrower, the most recent flash sits on the square just before the
// hero (the prior loop square), exactly as the recorded C screen shows.  A final
// tmp_at(DISP_END) restores that cell afterwards (so the next frame is clean).
async function m_throw_at_hero(mon, mdat, sx, sy, dx, dy, range, otmp) {
    const u = game.u;
    // C ref: mthrowu.c m_throw() head — peel one missile off the stack.  quan==1
    // just extracts the object (no RNG); quan>1 calls splitobj(), whose
    // nextoid()/next_ident() advances svc.context.ident by rnd(2).
    const singleobj = m_throw_single(mon, otmp);
    // C ref: mthrowu.c:649-651 — `if (sym) tmp_at(DISP_FLASH, obj_to_glyph(...))`.
    // sym = obj->oclass (always truthy for a thrown weapon/ammo); the contest
    // throwers (dagger/dart) are never autoreturn/tethered.  The flash glyph is
    // the object's map appearance (obj_to_glyph): ')' for a dagger/dart.
    const fglyph = (singleobj.oclass ? object_glyph(singleobj) : null);
    let fx = -1, fy = -1; // last flashed cell (-1 = none drawn yet)
    // C tmp_at(x,y) for a DISP_FLASH style (display.c:1278-1292): first restore
    // (newsym) the previously flashed cell, then — only if the new square is
    // cansee()-visible — draw the flight glyph there.  A missile crossing a dark
    // corridor / unseen square (e.g. a kobold lobbing darts from the dark) draws
    // NO flash, so the recorded screen shows the bare cell.  This mirrors the
    // `if (!cansee(x, y) && style != DISP_ALWAYS) break;` guard exactly.
    const flash_at = (x, y) => {
        if (!fglyph) return;
        if (fx >= 0) { newsym(fx, fy); fx = fy = -1; } // restore previous square
        if (!cansee(x, y)) return;                     // unseen: no flash drawn
        show_glyph_cell(x, y, fglyph.ch, fglyph.color, fglyph.dec);
        fx = x; fy = y;
    };
    // C tmp_at(DISP_END, 0): restore the last flashed cell after the throw.
    const flash_end = () => { if (fx >= 0) { newsym(fx, fy); fx = fy = -1; } };
    let bx = sx, by = sy;
    while (range-- > 0) {
        bx += dx; by += dy;
        // C ref: mthrowu.c m_throw():676-677 — as soon as the missile occupies
        // a visible square, observe_object(singleobj) fires (dknown + the type
        // marked "encountered", feeding the '\' discoveries list) regardless of
        // whether it goes on to hit, miss, or land.  No RNG.
        if (!Blind() && cansee(bx, by)) {
            singleobj.dknown = 1;
            discover_object(singleobj.otyp, false, true);
        }
        if (bx === u.ux && by === u.uy) {
            // hero square: catch attempt, then the hit resolution.
            if (u_catch_thrown_obj(singleobj)) { flash_end(); return; } // caught
            const dam0 = dmgval_thrown(singleobj, u);    // rnd(wsdam) (+spe)
            let hitv = 3 - distmin(u.ux, u.uy, mon.mx, mon.my);
            if (hitv < -4) hitv = -4;
            // orc/elf shooting bonuses don't apply to a thrown dagger/dart.
            hitv += 8 + (singleobj.spe | 0);
            const dam = dam0 < 1 ? 1 : dam0;
            // thitu() pages the hit/miss message (--More--); the prior flash on
            // the square just before the hero stays drawn through that pause.
            const hitu = await thitu(hitv, dam, singleobj);
            if (hitu) {
                // C drop_throw(singleobj, 1, u.ux, u.uy): the hit missile settles
                // on the hero's own square (hidden under '@') or mulches.  The
                // missile stops here (break before the mthrowu.c:798 forcehit).
                flash_end();
                drop_thrown_missile(mon, singleobj, u.ux, u.uy, 1);
                return;
            }
            // MISS: the dart flies past the hero — fall through to the forcehit
            // roll and keep going (mthrowu.c does NOT break on a miss).
        }
        // forcehit roll (mthrowu.c:798) — fires on every non-hit square the
        // missile crosses, including a hero-miss square.
        rn2(5);
        // C: at end of range the loop breaks before tmp_at(bhitpos); otherwise it
        // draws the flight glyph at the just-crossed square (mthrowu.c:824).
        if (range > 0) flash_at(bx, by);
    }
    // Reached end of range without connecting; the missile drops where it
    // stopped (drop_throw with ohit==0 -> no mulch roll).
    flash_end();
    drop_thrown_missile(mon, singleobj, bx, by, 0);
}

// C ref: mthrowu.c m_throw() lines 593-616 — produce the single in-flight
// missile.  For a stack (quan > 1) C calls splitobj(obj, 1) which mints a new
// o_id via next_ident() [rnd(2)]; for a singleton it just extracts the object.
// We mirror the RNG (the new o_id is otherwise unobserved by the contest's
// screen capture) and return an object the caller can settle/destroy.
function m_throw_single(mon, otmp) {
    if ((otmp.quan | 0) <= 1) return otmp;
    next_ident();           // splitobj -> nextoid -> next_ident: rnd(2)
    otmp.quan = (otmp.quan | 0) - 1;
    // The split-off missile shares the parent's type/enchantment/erosion.
    return {
        otyp: otmp.otyp, oclass: otmp.oclass, spe: otmp.spe | 0,
        quan: 1, blessed: otmp.blessed, cursed: otmp.cursed,
        oeroded: otmp.oeroded, oeroded2: otmp.oeroded2, owornmask: 0,
        _split_from: otmp,
    };
}

// C ref: mthrowu.c m_throw -> drop_throw(singleobj, ohit, x, y).  When the
// missile HIT (ohit), drop_throw rolls should_mulch_missile() to see if it
// shatters: only ammo/missiles (e.g. a dart) mulch — a thrown dagger never
// does, so no roll there.  On a non-hit drop (ohit==0) there is no mulch roll.
// A shattered missile is destroyed via delobj() -> delobj_core(), which rolls
// obj_resists(obj, 0, 0) [rn2(100)] to spare indestructible artifacts (always
// FALSE for a dart) before freeing it — that roll must fire to stay in sync
// with C's stream (it is the obj_resists the kobold-dart sessions show right
// after a connecting throw).
// `singleobj` may be the parent stack (quan==1 throw) still in minvent, or the
// peeled-off single missile (quan>1 throw) that was never in minvent.
function drop_thrown_missile(mon, otmp, x, y, ohit) {
    let broken = false;
    if (ohit && is_missile_otyp(otmp.otyp)) {
        broken = should_mulch_missile(otmp); // rn2(3) for a fresh dart
    }
    if (mon?.minvent) {
        const i = mon.minvent.indexOf(otmp);
        if (i >= 0) mon.minvent.splice(i, 1);
    }
    if (broken) {
        rn2(100); // delobj_core -> obj_resists(obj, 0, 0): rn2(100), then free
        return;   // shattered missile: no object settles on the floor
    }
    otmp.owornmask = 0;
    try { place_object(otmp, x, y); newsym(x, y); } catch (e) { /* ignore */ }
}

// C ref: dothrow.c:1976 should_mulch_missile(obj) — a thrown missile (dart) may
// shatter on impact.  For a fresh, un-enchanted, un-eroded dart: chance =
// 3 + 0 - 0 = 3 -> broken = rn2(3) (truthy ~2/3 of the time).  The blessed /
// gem-tough refinements don't apply to a plain dart.
function should_mulch_missile(obj) {
    if (!obj || !is_missile_otyp(obj.otyp)) return false;
    const erosion = Math.max(obj.oeroded | 0, obj.oeroded2 | 0);
    const chance = 3 + erosion - (obj.spe | 0);
    let broken = chance > 1 ? (rn2(chance) !== 0) : (rn2(4) === 0);
    // C: blessed missiles survive on a !rnl(4) / !rn2(3) roll — the contest
    // darts aren't blessed, so this refinement is unreached, but kept faithful.
    if (obj.blessed && (game.context?.mon_moving ? rn2(3) === 0 : false)) broken = false;
    return broken;
}

// C ref: mthrowu.c select_rwep(mtmp) — pick the monster's preferred ranged
// weapon.  Scoped: return the first throwable weapon (orcish dagger thrown by a
// goblin via m_initweap, or the dart stack a kobold gets via m_initthrow) in
// minvent, else null.  No RNG.
// C ref: weapon.c select_rwep(mtmp) — pick a ranged weapon/ammo to loose, and
// set gp.propellor (mirrored here as _propellor) to the launcher that fires it
// (&hands_obj == HANDS_OBJ when the missile needs no launcher, e.g. a thrown
// dagger/dart).  Scoped to the contest throwers: a simple thrown weapon
// (orcish dagger / dart), or ammo fired from a carried launcher — arrows (oc
// skill -P_BOW) fired from a bow (rwep[]/propellor path, weapon.c:630).  The
// launcher is what mon_wield_item(NEED_RANGED_WEAPON) then wields.
let _propellor = null; // C: gp.propellor
function select_rwep(mtmp) {
    _propellor = HANDS_OBJ;
    const inv = mtmp.minvent || [];
    // C rwep[] earlier entries (daggers/darts) — thrown directly, no launcher.
    for (const o of inv) {
        if (o.otyp === ORCISH_DAGGER_OTYP || o.otyp === DART_OTYP) {
            _propellor = HANDS_OBJ;
            return o;
        }
    }
    // C rwep[] ammo entries: an arrow needs a matching bow launcher wielded
    // (weapon.c:633 P_BOW -> oselect(BOW)); a crossbow bolt needs a crossbow.
    for (const o of inv) {
        if (P_BOW_AMMO.has(o.otyp)) {
            const bow = inv.find(l => is_launcher(l) && ammo_and_launcher(o, l));
            if (bow) { _propellor = bow; return o; }
        }
        if (o.otyp === CROSSBOW_BOLT_OTYP) {
            const cb = inv.find(l => l.otyp === 88 /*CROSSBOW*/);
            if (cb) { _propellor = cb; return o; }
        }
    }
    _propellor = HANDS_OBJ;
    return null;
}

const WAN_STRIKING_OTYP = 416; // objects[].oc_name index for wand of striking

// C ref: mthrowu.c m_lined_up()/linedup() — is the hero on a straight row,
// column, or diagonal from the monster (within BOLT_LIM), with a usable line?
// Beyond the geometric alignment, C requires line of sight from the monster to
// the hero's *believed* position: clear_path() (or couldsee() when the believed
// spot is the hero's real square).  When that LOS is blocked ONLY by boulders,
// linedup still lets the shot through with probability rn2(2 + boulderspots).
// C ref: mthrowu.c m_lined_up(&youmonst, mtmp) -> linedup(mux, muy, mx, my,
// boulderhandling).  The hero is the target; boulderhandling is 2 ("conditionally
// block") unless the monster throws rocks or carries a wand of striking, in which
// case boulders are ignored (1).  (The Upolyd concealment rn2(25) guard has no
// effect for a non-polymorphed hero and is omitted.)
function m_lined_up(mtmp) {
    const u = game.u;
    const tx = mtmp.mux ?? u.ux, ty = mtmp.muy ?? u.uy;
    const ignore_boulders = throws_rocks_pm(mtmp.data)
        || !!m_carrying(mtmp, WAN_STRIKING_OTYP);
    return linedup(tx, ty, mtmp.mx, mtmp.my, ignore_boulders ? 1 : 2);
}

// C ref: mthrowu.c linedup(ax,ay, bx,by, boulderhandling).  (ax,ay)=target,
// (bx,by)=shooter.  Requires a straight orthogonal/diagonal line within BOLT_LIM.
// With a clear line of sight it returns TRUE and rolls nothing.  Otherwise, when
// boulderhandling != 0, it walks the line from the shooter toward the target:
// blocking terrain fails outright, while a line obstructed only by boulders is
// accepted with probability governed by rn2(2 + boulderspots) — the roll the C
// recorder emits once a pushed boulder ends up between a monster and the hero
// (boulderhandling 1 = always accept, e.g. rock-throwers).
function linedup(ax, ay, bx, by, boulderhandling) {
    const u = game.u;
    const tbx = ax - bx, tby = ay - by;
    if (tbx === 0 && tby === 0) return false; // displacement puts target on shooter
    if (!((tbx === 0 || tby === 0 || Math.abs(tbx) === Math.abs(tby))
          && distmin(tbx, tby, 0, 0) < BOLT_LIM))
        return false;
    const clear = (ax === u.ux && ay === u.uy)
        ? couldsee(bx, by)
        : clear_path(ax, ay, bx, by);
    if (clear) return true;
    if (boulderhandling === 0) return false;
    const dx = sgn(ax - bx), dy = sgn(ay - by);
    let boulderspots = 0, cx = bx, cy = by;
    do {
        cx += dx; cy += dy; // guaranteed to converge on (ax,ay)
        if (blocking_terrain(cx, cy)) return false;
        if (sobj_at_boulder(cx, cy)) boulderspots++;
    } while (cx !== ax || cy !== ay);
    if (boulderhandling === 1 || rn2(2 + boulderspots) < 2) return true;
    return false;
}

// C ref: mthrowu.c blocking_terrain(x,y) — a square that stops a thrown/zapped
// line: off-map, obstructed (rock/wall/tree/...), or a closed/locked door.  (The
// water-wall / lava-wall cases exist only on the water & plane special levels,
// which the scored dungeon never reaches, so those two typ checks are omitted.)
function blocking_terrain(x, y) {
    if (!isok(x, y)) return true;
    if (IS_OBSTRUCTED(terrainTyp(x, y))) return true;
    if (closed_door_at(x, y)) return true;
    return false;
}

// C ref: mthrowu.c URETREATING(x,y) — the hero moved away from (x,y) this turn.
function URETREATING(x, y) {
    const u = game.u;
    const ux0 = u.ux0 ?? u.ux, uy0 = u.uy0 ?? u.uy;
    return distmin(u.ux, u.uy, x, y) > distmin(ux0, uy0, x, y);
}

// C ref: hack.h distmin() — Chebyshev (king-move) distance.
function distmin(x0, y0, x1, y1) {
    return Math.max(Math.abs(x0 - x1), Math.abs(y0 - y1));
}
function sgn(n) { return n > 0 ? 1 : n < 0 ? -1 : 0; }

// C ref: mthrowu.c:201 monmulti(mtmp, otmp, mwep) — how many missiles a monster
// looses in one volley.  The contest throwers (goblin dagger, kobold darts) are
// neither lords/princes/mplayers nor wielding a launcher and never confused, so
// the only RNG is `multishot = rnd((int) multishot)` — and only when otmp is a
// stack (quan > 1) of a stackable non-ammo weapon.  A single dagger (quan == 1)
// short-circuits the whole block and consumes no RNG (multishot stays 1).
function monmulti(mtmp, otmp) {
    let multishot = 1;
    if (otmp.quan > 1
        && otmp.oclass === WEAPON_CLASS_MM   // dart/dagger: stackable, not ammo
        && !mtmp.mconf) {
        // No is_prince/is_lord/is_mplayer/elven/launcher bonuses for these mons.
        multishot = rnd(multishot);          // rnd(1) == 1
        // multishot_class_bonus(kobold/goblin, ...) == 0; no racial bonus.
    }
    if (otmp.quan < multishot) multishot = otmp.quan | 0;
    if (multishot < 1) multishot = 1;
    return multishot;
}

async function thrwmu(mtmp, mdat) {
    const u = game.u;
    // C ref: mthrowu.c:1184 — before picking a missile, wield the ranged weapon
    // if needed.  For a thrown dagger/dart the propellor is &hands_obj so
    // mon_wield_item wields nothing and returns 0 (goblins/kobolds throw from
    // minvent, no RNG).  For a bow+arrows monster it wields the bow (mw=bow,
    // no RNG) and, having actually changed weapon, returns 1 -> this turn is
    // spent wielding (matching C's early return); the melee dmgval later reads
    // MON_WEP == the bow.
    if (mtmp.weapon_check === NEED_WEAPON_MM || !MON_WEP(mtmp)) {
        mtmp.weapon_check = NEED_RANGED_WEAPON_MM;
        if (await mon_wield_item(mtmp)) return;
    }
    const otmp = select_rwep(mtmp);
    if (!otmp) return;
    // Not a polearm and not an autoreturn weapon (a plain dagger / dart).
    if (!m_lined_up(mtmp)) return;
    const x = mtmp.mx, y = mtmp.my;
    if (URETREATING(x, y)) {
        // C: && rn2(BOLT_LIM - distmin(...)) -> the roll fires only when
        // retreating.  Not exercised (hero approaches), so faithfully roll then
        // bail when non-zero.  (Kept for correctness if a session retreats.)
        const r = BOLT_LIM - distmin(x, y, mtmp.mux ?? u.ux, mtmp.muy ?? u.uy);
        if (r > 0 && rn2(r)) return;
    }
    // monshoot(): roll the volley size first (monmulti — rnd(1) for a dart
    // stack, no RNG for a single dagger), then the canseemon announcement.
    const multishot = monmulti(mtmp, otmp);
    if (canseemon_mm(mtmp)) {
        const { update_topl } = await import('./display.js');
        const onm = multishot > 1
            ? `${multishot} ${mshot_xname(otmp)}s`
            : an_name(mshot_xname(otmp));
        await update_topl(`${Monnam(mtmp)} throws ${onm}!`);
    }
    const dm = distmin(mtmp.mx, mtmp.my, mtmp.mux ?? u.ux, mtmp.muy ?? u.uy);
    const tbx = (mtmp.mux ?? u.ux) - mtmp.mx, tby = (mtmp.muy ?? u.uy) - mtmp.my;
    for (let i = 1; i <= multishot; i++) {
        await m_throw_at_hero(mtmp, mdat, mtmp.mx, mtmp.my, sgn(tbx), sgn(tby), dm, otmp);
        if (DEADMONSTER(mtmp)) break;
    }
}

// C ref: display.c canseemon(mon) — the hero can see the monster: its square is
// in view (cansee) and it isn't invisible (or the hero sees invisible).  A
// goblin throwing in a lit room is visible (-> "The goblin throws a dagger!");
// a kobold loosing darts from down a dark corridor is NOT (-> no announcement,
// just the "You are hit by a dart." landing message).
function canseemon_mm(mtmp) {
    if (!mtmp) return false;
    if (game.u?.uswallow) return true;
    if (mtmp.minvis && !game.u?.see_invis) return false;
    return !!cansee(mtmp.mx, mtmp.my);
}

// ── monster-hits-hero damage path (mhitu.c hitmu / mdamageu) ───────────────
// C ref: mhitu.c:1144 hitmu(mtmp, mattk) — a monster lands a melee hit on the
// hero.  Rolls the base damage d(damn,damd), dispatches the damage-type effect
// (mhitm_adtyping), the knockback check, then subtracts HP (mdamageu).  Returns
// 1 if the attacker died (it never does here), else 0.
//
// Faithful to the verified seed0002 step-31 RNG trace (grid bug, AT_BITE/
// AD_ELEC, 1d1):
//   d(1,1) [base dmg]; mhitm_ad_elec -> rn2(10) [mgc-negation] + rn2(20)
//   [m_lev > rn2(20)? destroy_items]; mhitm_knockback -> rn2(3) + rn2(6).
async function hitmu(mtmp, mdat, mattk) {
    const mhm = { damage: 0, done: false };

    // C ref: mhitu.c:1155 — if the hero cannot spot the attacker, remember its
    // square with the 'I' glyph.  Restricted to the blinded hero (the recorded
    // blindfold case) to avoid disturbing coincidental matches in early-diverged
    // sessions where a monster is merely out of line-of-sight.
    if ((game.u?.ublindf || (game.u?.blinded || 0) > 0 || game.ublindf)
        && !canspotmon(mtmp)) map_invisible(mtmp.mx, mtmp.my);
    // mtmp->mundetected hides_under/S_EEL reveal: not reachable for these mons.

    // mhitu.c:1187 — base damage roll.
    mhm.damage = d(mattk.damn | 0, mattk.damd | 0);
    // is_undead/vampshifter midnight extra-dmg: none of these monsters qualify.

    await mhitm_adtyping(mtmp, mattk, mhm);

    // mhitu.c:1193 — knockback (AD_PHYS claw/kick/butt/weap only; the rn2(3) and
    // rn2(chance=6) gate rolls always fire first).
    mhitm_knockback(mtmp, mattk);

    if (mhm.done) return 0;

    // already-dead short-circuit (uhp<1) not reachable: damage is applied below.

    // Negative-AC damage reduction (mhitu.c:1208): the starter heroes here have
    // uac >= 0, so no rnd(-uac) roll.  Guarded to stay faithful if uac<0.
    const u = game.u;
    if (mhm.damage && (u.uac ?? 10) < 0) {
        mhm.damage -= rnd(-(u.uac));
        if (mhm.damage < 1) mhm.damage = 1;
    }

    if (mhm.damage > 0) {
        // Half_physical_damage / Mitre-of-Holiness not modelled (off here).
        // permdmg (Death) not reachable.
        await mdamageu(mtmp, mhm.damage);
    }

    // passiveum(): the grid bug (and the other modelled victims) have no passive
    // attack, so no RNG and no message.
    return 0;
}

// C ref: uhitm.c:4782 mhitm_adtyping() — dispatch on the damage type.  Only the
// types the contest's monster-hits-hero path reaches are implemented; an
// unmodelled type would surface as an honest divergence rather than a silent
// desync.
async function mhitm_adtyping(mtmp, mattk, mhm) {
    switch (mattk.adtyp) {
    case AD_ELEC: await mhitm_ad_elec(mtmp, mattk, mhm); break;
    case AD_PHYS: await mhitm_ad_phys(mtmp, mattk, mhm); break;
    case AD_DRST: // drain strength (poison); AD_DRDX/AD_DRCO share this handler
        await mhitm_ad_drst(mtmp, mattk, mhm); break;
    default:
        // Unmodelled adtyp: leave damage as the base roll, emit the hit verb.
        await hitmsg(mtmp, mattk);
        break;
    }
}

// C ref: uhitm.c:2706 mhitm_ad_elec() — mdef == &youmonst branch.
async function mhitm_ad_elec(mtmp, mattk, mhm) {
    const orig_dmg = mhm.damage;
    await hitmsg(mtmp, mattk);                       // "The grid bug bites!"
    if (!await mhitm_mgc_atk_negated(mtmp, true)) {  // uhitm.c:2709 verbosely=TRUE
        await emitU('You get zapped!');
        // Shock_resistance not present for the starter heroes here.
        // monstunseesu(M_SEEN_ELEC): no RNG.
        const mlev = mtmp.m_lev ?? mtmp.data?.mlevel ?? 0;
        if (mlev > rn2(20)) {
            // destroy_items(&youmonst, AD_ELEC, orig_dmg) — not reached for the
            // m_lev==0 grid bug (0 > rn2(20) is always false).  The rn2(20) is
            // the RHS of the comparison and always fires (handled above).
            void orig_dmg;
        }
    } else {
        mhm.damage = 0;
    }
}

// C ref: uhitm.c mhitm_ad_phys() — mdef == &youmonst branch.  For an AT_WEAP
// attack with a wielded weapon, the weapon's dmgval is added to the base roll
// (uhitm.c:4061 `mhm->damage += dmgval(otmp, mdef)`); for the hero defender (a
// small humanoid) dmgval rolls rnd(oc_wsdam) + spe — the orcish dagger is
// wsdam 3, spe 0, so rnd(3).  Then the hit message (hitmsg).  No gauntlets of
// power / silver / poison apply to these monsters.
async function mhitm_ad_phys(mtmp, mattk, mhm) {
    const AT_WEAP_LOCAL = 254;
    const otmp = (mattk.aatyp === AT_WEAP_LOCAL) ? MON_WEP(mtmp) : null;
    if (otmp) {
        // dmgval(otmp, hero): small defender -> rnd(oc_wsdam) + spe.
        let dmg = 0;
        const wsdam = thrown_wsdam(otmp.otyp);
        if (wsdam) dmg = rnd(wsdam);
        if (otmp.oclass === WEAPON_CLASS_MM) {
            dmg += (otmp.spe | 0);
            if (dmg < 0) dmg = 0;
        }
        mhm.damage += dmg;
        if (mhm.damage <= 0) mhm.damage = 1;
    }
    await hitmsg(mtmp, mattk);
}

// C ref: uhitm.c:3122 mhitm_ad_drst() — mdef == &youmonst branch (drain STR/
// DEX/CON via poison).  The cobra/snake bite (AD_DRST) reaches here.  RNG order
// (verified against the seed4500 step-266 cobra-bite trace):
//   mhitm_mgc_atk_negated -> rn2(10)   [magical cancellation; always rolls]
//   hitmsg (no RNG)                     ["The cobra bites!"]
//   if (!negated) rn2(8)               [1/8 chance the bite is poisoned]
// When the 1/8 poison DOES fire (never in the contest sessions — all recorded
// AD_DRST bites roll rn2(8)!=0), poisoned() would run; that path is scoped out
// here (it would surface as an honest divergence, never a silent desync).
async function mhitm_ad_drst(mtmp, mattk, mhm) {
    const negated = await mhitm_mgc_atk_negated(mtmp, false); // rn2(10), no msg (uhitm.c:3126)
    await hitmsg(mtmp, mattk);                    // "The cobra bites!"
    if (!negated && !rn2(8)) {                    // uhitm.c:3155
        // poisoned(buf, ptmp=A_STR, pmname, 30, FALSE) — NOT reached by any
        // recorded contest bite (every AD_DRST rn2(8) is nonzero).  Porting
        // poisoned() (adjattrib/losehp/setuhpmax) is unnecessary for the
        // sessions; if a future bite triggers it, the divergence is explicit.
    }
}

// C ref: mhitu.c:1088 magic_negation(mon) — "armor that sufficiently covers the
// body might be able to block magic".  Ported for the hero defender (the only
// caller here): the max a_can (objects[].oc_can) over the hero's worn armor,
// then bumped by extrinsic Protection (EProtection; +2 for the amulet of
// guarding) or, absent that, floored to 1 by intrinsic Protection
// (HProtection && u.ublessed>0, or the protection-spell u.uspellprot).  The
// Protection accounting reads the game-state fields when present; none of the
// starter heroes carry them, so the result is driven purely by worn armor.
function magic_negation(_hero) {
    const u = game.u || {};
    const EProtection = u.EProtection ?? game.EProtection ?? 0;
    let via_amul = false;
    const gotprot = (EProtection !== 0);                     // is_you branch
    let mc = 0;
    for (const o of (game.invent || [])) {
        const worn = o.owornmask || 0;
        if (worn & W_ARMOR) {                                // a_can only for worn armor
            const armpro = OBJECTS[o.otyp]?.oc_can || 0;
            if (armpro > mc) mc = armpro;
        } else if (worn & W_AMUL) {
            via_amul = (o.otyp === AMULET_OF_GUARDING_OTYP);
        }
        // is_you -> the protects() weapon/artifact scan is skipped (continue).
    }
    if (gotprot) {
        mc += via_amul ? 2 : 1;                              // multiple sources don't stack
        if (mc > 3) mc = 3;
    } else if (mc < 1) {
        // intrinsic Protection confers a minimum mc of 1 (weaker than extrinsic)
        const HProtection = u.HProtection ?? 0;
        const uspellprot = u.uspellprot ?? 0;
        const ublessed = u.ublessed ?? 0;
        if ((HProtection && ublessed > 0) || uspellprot)
            mc = 1;
    }
    return mc;
}
const AMULET_OF_GUARDING_OTYP = 210;                         // onames.h AMULET_OF_GUARDING

// C ref: uhitm.c:75 mhitm_mgc_atk_negated(magr, mdef, verbosely) — magical
// cancellation check.  mcan is false for these monsters, so the rn2(10) always
// rolls; negated = !(rn2(10) >= 3*armpro) with armpro = magic_negation(hero).
// When negated and verbosely (the AD_ELEC/most mhitu paths pass TRUE), the hero
// sees "You avoid harm." on the top line.  Returns TRUE when thwarted.
async function mhitm_mgc_atk_negated(mtmp, verbosely = false) {
    if (mtmp.mcan) return true;                      // no message, no roll
    const armpro = magic_negation();                 // uhitm.c:86
    const negated = !(rn2(10) >= 3 * armpro);        // uhitm.c:87
    if (negated && verbosely) await emitU('You avoid harm.'); // uhitm.c:92 (mdef==hero)
    return negated;
}

// C ref: uhitm.c:5247 mhitm_knockback() — hero is the defender.  The
// knockdistance rn2(3) and the rn2(chance) gate roll fire before any adtyp /
// engulf checks, so they always advance the stream; knockback only proceeds for
// AD_PHYS claw/kick/butt/weap.  Returns false (no actual hurtle modelled).
function mhitm_knockback(mtmp, mattk) {
    const knockdistance = rn2(3) ? 1 : 2;            // uhitm.c:5258
    void knockdistance;
    const chance = 6;                                // no Ogresmasher here
    if (rn2(chance)) return false;                   // uhitm.c:5269
    // AD_PHYS + (AT_CLAW|AT_KICK|AT_BUTT|AT_WEAP) required; AD_ELEC bite fails.
    if (!(mattk.adtyp === AD_PHYS
          && (mattk.aatyp === AT_CLAW || mattk.aatyp === AT_KICK
              || mattk.aatyp === AT_WEAP /* AT_BUTT shares this gate */))) {
        return false;
    }
    // The actual hurtle (test_move / hurtle) is not modelled — it would move the
    // hero; not reached by the contest's monster-hits-hero scenarios.
    return false;
}

// C ref: mhitu.c:1902 mdamageu(mtmp, n) — subtract n HP from the hero.  Sets
// disp.botl (status redraw) and triggers done_in_by() if uhp drops below 1.
async function mdamageu(mtmp, n) {
    const u = game.u;
    if (n < 0) n = 0;
    u.uhp -= n;
    if (u.uhp > u.uhpmax) u.uhp = u.uhpmax;
    // C ref mhitu.c:1925 — `if (u.uhp < 1) done_in_by(mtmp, DIED)`.  A hostile
    // bite that drops the hero to 0 HP triggers the death sequence (in wizard
    // mode: "You die..." -> "Die?" -> decline -> savelife "You survived...").
    if (u.uhp < 1) {
        const { done_in_by } = await import('./end.js');
        await done_in_by(mtmp, DIED_HOW);
    }
}
const DIED_HOW = 0; // end.h DIED

// C ref: mhitu.c:29 hitmsg(mtmp, mattk) — "<The monster> <verb>!".  Appends to
// the top line so it concatenates with the hero's prior message this turn.
const HITMSG_VERB = {
    [AT_CLAW]: 'hits', [AT_BITE]: 'bites', [AT_KICK]: 'kicks', [AT_WEAP]: 'hits',
};
async function hitmsg(mtmp, mattk) {
    const verb = HITMSG_VERB[mattk.aatyp] || 'hits';
    await emitU(`${Monnam(mtmp)} ${verb}!`);
}

// C ref: mhitu.c:85 missmu(mtmp, nearmiss, mattk) — "<The monster> misses!".
// No RNG.
async function missmu(mtmp, nearmiss) {
    const verbose = game.flags?.verbose !== false;
    const just = (nearmiss && verbose) ? 'just ' : '';
    await emitU(`${Monnam(mtmp)} ${just}misses!`);
}

// Append a hero-facing message to the top line (C pline -> update_topl).
async function emitU(msg) {
    const { update_topl } = await import('./display.js');
    await update_topl(msg);
}

// C ref: monmove.c disturb(mtmp) — wake-up check for sleeping monsters.
// For ordinary hostile monsters that the hero has already encountered this
// consumes no RNG; default to "stays asleep" so we don't fabricate rolls.
function disturb(_mtmp) {
    return false;
}

// C ref: mondata.h is_wanderer(ptr) — M2_WANDER flag.  The RNDMONST data
// objects don't carry mflags2, so recognize the M2_WANDER monsters our
// sessions actually place by pmidx (kitten and pony starting pets; bats and
// felines wander too).  Hostile RNDMONST monsters (newt, kobold, jackal, …)
// are NOT wanderers, so the rn2(4) at monmove.c:886 never fires for them.
const M2_WANDER_PMIDX = new Set([
    34,  // kitten
    35,  // housecat
    36,  // large cat (jaguar/etc. share S_FELINE wander)
    102, // pony
    103, // white unicorn
    104, // gray unicorn
    105, // black unicorn
    // C ref: include/monsters.h — every S_BAT (bat/giant bat/raven/vampire bat)
    // carries M2_WANDER, and so do the S_LIGHT lights and the (S_ELEMENTAL)
    // stalker (M2_WANDER | M2_STALK).  A giant bat is fast (speed 22) so it acts
    // twice per turn; getting is_wanderer right makes its second dochug enter
    // the move block (the rn2(4) at monmove.c:886 + the flutter rn2(3) at
    // monmove.c:1871) instead of attacking — the seed5002 step-190 divergence.
    126, // bat
    127, // giant bat
    128, // raven
    129, // vampire bat
    118, // yellow light
    119, // black light
    153, // stalker
]);
function is_wanderer(ptr) {
    const M2_WANDER = 0x00800000; // monflag.h M2_WANDER

    if (ptr?.mflags2 != null) return !!(ptr.mflags2 & M2_WANDER);
    return M2_WANDER_PMIDX.has(ptr?.pmidx);
}

// C ref: dungeon.h Is_rogue_level(uz) — the special Rogue-emulation level.
// Our gameplay sessions stay on the upper Dungeons of Doom (dlvl 1), never the
// Rogue level, so this is always false; defined for faithful m_move gating.
function Is_rogue_level() {
    const uz = game.u?.uz;
    const rl = game.rogue_level;
    return !!uz && !!rl && uz.dnum === rl.dnum && uz.dlevel === rl.dlevel;
}

// C ref: monmove.c dochugw(mtmp, inrange) — wrapper around dochug used by
// movemon_singlemon.  The extra warning bookkeeping consumes no RNG.
export async function dochugw(mtmp) {
    return await dochug(mtmp);
}
