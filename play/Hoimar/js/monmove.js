import { game } from './gstate.js';
import { d, rn2, rnd } from './rng.js';
import { dog_move } from './dog.js';
import { enexto_core, monsterPtr, MONSTER_SYMBOLS, newmonhp_state_for } from './mklev.js';
import { OBJECT_CLASS, OBJECT_DIR } from './object_data.js';
import {
    BURN, DUST, ENGR_BLOOD, HEADSTONE,
    D_BROKEN, D_CLOSED, D_ISOPEN, D_LOCKED, D_NODOOR, D_TRAPPED,
    DOOR, IRONBARS, LADDER, ROOM, STAIRS, WEB,
    IS_DOOR, IS_LAVA, IS_OBSTRUCTED, IS_POOL, IS_STWALL, IS_TREE, IS_WALL, IS_WATERWALL,
    I_SPECIAL, M_AP_FURNITURE, M_AP_OBJECT,
    MON_POLE_DIST, NEED_AXE, NEED_HTH_WEAPON, NEED_PICK_AXE, NEED_PICK_OR_AXE,
    NEED_RANGED_WEAPON, NEED_WEAPON, W_ARMS, W_NONDIGGABLE, W_WEP,
    GP_CHECKSCARY, SDOOR, W_NONPASSWALL,
    isok, SPACE_POS,
} from './const.js';
import {
    newsym, queue_more_prompt, pline, flush_screen, clear_pending_message,
    docrt, refresh_swallowed_overlay, serialize_terminal_grid, append_pline,
} from './display.js';
import { nhgetch } from './input.js';
import { clear_path, cansee, couldsee } from './vision.js';
import { m_dowear_basic } from './mon_wear.js';
import { gettrack } from './track.js';
import { randomHallucinatedMonsterName } from './random_text.js';
import { getObjectDescription } from './o_init.js';

const NORMAL_SPEED = 12;
const BOLT_LIM = 8;
const M2_WERE = 0x00000004;
const M2_HUMAN = 0x00000008;
const M2_DWARF = 0x00000020;
const M2_WANDER = 0x00800000;
const M2_ROCKTHROW = 0x08000000;
const M1_FLY = 0x00000001;
const M1_SWIM = 0x00000002;
const M1_WALLWALK = 0x00000008;
const M1_TUNNEL = 0x00000020;
const M1_NEEDPICK = 0x00000040;
const M1_HIDE = 0x00000100;
const M1_NOEYES = 0x00001000;
const M1_NOHANDS = 0x00002000;
const M1_MINDLESS = 0x00010000;
const M1_ANIMAL = 0x00040000;
const M2_STRONG = 0x04000000;
const M2_COLLECT = 0x40000000;
const M2_MAGIC = 0x80000000;
const MTSZ = 4;
const MS_RIDER = 35;
const MS_LEADER = 36;
const MSLOW = 1;
const MFAST = 2;
const MMOVE_NOTHING = 0;
const MMOVE_MOVED = 1;
const MMOVE_DIED = 2;
const MMOVE_DONE = 3;
const MCF_INDIRECT = 0x0001;
const MCF_SIGHT = 0x0002;
const MCF_HOSTILE = 0x0004;
const WEAPON_CLASS = 2;
const ARMOR_CLASS = 3;
const RING_CLASS = 4;
const AMULET_CLASS = 5;
const FOOD_CLASS = 7;
const POTION_CLASS = 8;
const SCROLL_CLASS = 9;
const SPBOOK_CLASS = 10;
const WAND_CLASS = 11;
const GEM_CLASS = 13;
const ROCK = 474;
const BOULDER = 475;
const AXE = 44;
const BATTLE_AXE = 45;
const DWARVISH_MATTOCK = 71;
const PICK_AXE = 259;
const RAY = 3;
const AMULET_OF_LIFE_SAVING = 202;
const AMULET_OF_REFLECTION = 208;
const AMULET_OF_GUARDING = 210;
const POT_CONFUSION = 299;
const POT_BLINDNESS = 300;
const POT_PARALYSIS = 301;
const POT_SPEED = 302;
const POT_INVISIBILITY = 305;
const POT_HEALING = 307;
const POT_EXTRA_HEALING = 308;
const POT_GAIN_LEVEL = 309;
const POT_SLEEPING = 314;
const POT_FULL_HEALING = 315;
const POT_POLYMORPH = 316;
const POT_ACID = 320;
const SCR_CREATE_MONSTER = 329;
const SCR_TELEPORTATION = 333;
const SCR_FIRE = 339;
const SCR_EARTH = 340;
const WAN_CREATE_MONSTER = 413;
const WAN_STRIKING = 417;
const WAN_MAKE_INVISIBLE = 418;
const WAN_SPEED_MONSTER = 420;
const WAN_UNDEAD_TURNING = 421;
const DILITHIUM_CRYSTAL = 439;
const LUCKSTONE = 470;
const FLINT = 473;
const WAN_POLYMORPH = 422;
const WAN_TELEPORTATION = 424;
const WAN_DIGGING = 428;
const PARTISAN = 56;
const RANSEUR = 57;
const SPETUM = 58;
const BEC_DE_CORBIN = 67;
const AKLYS = 80;
const ORCISH_DAGGER = 36;
const BASIC_MELEE_ATTACKS = new Set(['AT_CLAW', 'AT_KICK', 'AT_BITE', 'AT_STNG', 'AT_TUCH', 'AT_BUTT', 'AT_TENT', 'AT_WEAP']);
const DISTANCE_ATTACK_TYPES = new Set(['AT_SPIT', 'AT_BREA', 'AT_MAGC', 'AT_GAZE']);
const MCAST = {
    PSI_BOLT: { level: 0, flags: MCF_HOSTILE | MCF_SIGHT },
    OPEN_WOUNDS: { level: 0, flags: MCF_HOSTILE | MCF_SIGHT },
    CURE_SELF: { level: 1, flags: MCF_INDIRECT },
    HASTE_SELF: { level: 2, flags: MCF_INDIRECT },
    CONFUSE_YOU: { level: 2, flags: MCF_HOSTILE | MCF_SIGHT },
    STUN_YOU: { level: 3, flags: MCF_HOSTILE | MCF_SIGHT },
    DISAPPEAR: { level: 4, flags: MCF_INDIRECT },
    PARALYZE: { level: 4, flags: MCF_HOSTILE | MCF_SIGHT },
    BLIND_YOU: { level: 6, flags: MCF_HOSTILE | MCF_SIGHT },
    WEAKEN_YOU: { level: 6, flags: MCF_HOSTILE | MCF_SIGHT },
    DESTRY_ARMR: { level: 8, flags: MCF_HOSTILE | MCF_SIGHT },
    INSECTS: { level: 8, flags: MCF_HOSTILE | MCF_INDIRECT | MCF_SIGHT },
    CURSE_ITEMS: { level: 10, flags: MCF_HOSTILE | MCF_SIGHT },
    LIGHTNING: { level: 11, flags: MCF_HOSTILE | MCF_SIGHT },
    FIRE_PILLAR: { level: 12, flags: MCF_HOSTILE | MCF_SIGHT },
    GEYSER: { level: 13, flags: MCF_HOSTILE | MCF_SIGHT },
    AGGRAVATION: { level: 13, flags: MCF_INDIRECT | MCF_HOSTILE | MCF_SIGHT },
    SUMMON_MONS: { level: 15, flags: MCF_HOSTILE | MCF_INDIRECT | MCF_SIGHT },
    CLONE_WIZ: { level: 18, flags: MCF_HOSTILE | MCF_INDIRECT | MCF_SIGHT },
    DEATH_TOUCH: { level: 20, flags: MCF_HOSTILE | MCF_SIGHT },
};
const MON_WIZARD_SPELLS = [
    'PSI_BOLT', 'CURE_SELF', 'HASTE_SELF', 'STUN_YOU', 'DISAPPEAR',
    'WEAKEN_YOU', 'DESTRY_ARMR', 'CURSE_ITEMS', 'AGGRAVATION',
    'SUMMON_MONS', 'CLONE_WIZ', 'DEATH_TOUCH',
];
const MON_CLERIC_SPELLS = [
    'OPEN_WOUNDS', 'CURE_SELF', 'CONFUSE_YOU', 'PARALYZE', 'BLIND_YOU',
    'INSECTS', 'CURSE_ITEMS', 'LIGHTNING', 'FIRE_PILLAR', 'GEYSER',
];

export function mcalcmove(mtmp, m_moving) {
    let mmove = mtmp.data.mmove;

    // C ref: mon.c:mcalcmove() speed adjustments.
    if (mtmp.mspeed === MSLOW) {
        if (mmove < NORMAL_SPEED) mmove = Math.trunc((2 * mmove + 1) / 3);
        else mmove = 4 + Math.trunc(mmove / 3);
    } else if (mtmp.mspeed === MFAST) {
        mmove = Math.trunc((4 * mmove + 2) / 3);
    }

    if (m_moving) {
        const mmove_adj = mmove % NORMAL_SPEED;
        mmove -= mmove_adj;
        if (rn2(NORMAL_SPEED) < mmove_adj) {
            mmove += NORMAL_SPEED;
        }
    }
    return mmove;
}

export function distfleeck(mtmp) {
    // C ref: monmove.c:538
    // boolean sawscary = FALSE, bravegremlin = (rn2(5) == 0);
    rn2(5); // bravegremlin check

    const targetX = mtmp.mux ?? game.u?.ux ?? mtmp.mx;
    const targetY = mtmp.muy ?? game.u?.uy ?? mtmp.my;
    const d2 = dist2(mtmp.mx, mtmp.my, targetX, targetY);
    return {
        inrange: d2 <= BOLT_LIM * BOLT_LIM,
        nearby: d2 < 3,
        // Elbereth, sanctuary, and light-fleeing behavior are not modeled yet.
        scared: false,
    };
}

function is_wanderer(mtmp) {
    // C ref: mondata.h:is_wanderer() checks M2_WANDER; explicit pet data
    // still marks startup pet records created before full monster data.
    return !!mtmp.data?.m2_wander || !!(mtmp.data?.mflags2 & M2_WANDER);
}

function no_diagonal_movement(mtmp) {
    // C ref: hack.h:NODIAG().
    return mtmp.data?.name === 'GRID_BUG';
}

function dist2(x0, y0, x1, y1) {
    const dx = x0 - x1;
    const dy = y0 - y1;
    return dx * dx + dy * dy;
}

function monnear_hero(mtmp) {
    // C ref: mon.c:monnear().  dochug() short-circuits before the
    // is_wanderer() RNG gate when the pet is not near its target.
    return dist2(mtmp.mx, mtmp.my, game.u?.ux ?? mtmp.mx, game.u?.uy ?? mtmp.my) < 3;
}

function set_apparxy_basic(mtmp) {
    // C ref: monmove.c:set_apparxy().  In the current visibility model the
    // hero is neither invisible nor displaced, so monsters target the real
    // hero square.  This is especially important for u.ustuck while swallowed.
    mtmp.mux = game.u?.ux ?? mtmp.mx;
    mtmp.muy = game.u?.uy ?? mtmp.my;
}

function can_track_basic(ptr) {
    // C ref: mondata.c:can_track() normally delegates to haseyes().
    // Excalibur awareness is future hero-equipment work.
    return !((ptr?.mflags1 ?? 0) & M1_NOEYES);
}

function m_canseeu_basic(mtmp) {
    // C ref: vision.h:m_canseeu(). Invisibility, perceives(), underwater,
    // and buried state are not modeled yet for current movement evidence.
    return couldsee(mtmp.mx, mtmp.my);
}

function monster_should_see_target(mtmp, omx, omy, ggx, ggy) {
    // C ref: monmove.c:m_move() should_see predicate before gettrack().
    const originLoc = game.level?.at(omx, omy);
    const targetLoc = game.level?.at(ggx, ggy);
    return couldsee(omx, omy)
        && (!!targetLoc?.lit || !originLoc?.lit)
        && dist2(omx, omy, ggx, ggy) <= 36;
}

function is_hider(mtmp) {
    return !!(mtmp.data?.mflags1 & M1_HIDE);
}

function non_tame_movement_opportunity(mtmp, state) {
    // C ref: monmove.c:dochug() movement-opportunity predicate before
    // m_move().  Only the front-door predicates represented in JS state are
    // modeled here; far-away monsters take the no-RNG short-circuit.
    if (!state.nearby || mtmp.mflee || state.scared || mtmp.mconf || mtmp.mstun) return true;
    if (mtmp.minvis && !rn2(3)) return true;
    if (is_wanderer(mtmp) && !rn2(4)) return true;
    if (mtmp.mcansee === 0 && !rn2(4)) return true;
    if (mtmp.mpeaceful) return true;
    return false;
}

function can_tunnel_basic(mtmp) {
    const flags1 = mtmp.data?.mflags1 ?? 0;
    if (!(flags1 & M1_TUNNEL)) return false;
    const targetX = mtmp.mux ?? game.u?.ux ?? mtmp.mx;
    const targetY = mtmp.muy ?? game.u?.uy ?? mtmp.my;
    // C ref: mon.c:mon_allowflags().  Hostile pick-using tunnellers near
    // their target prefer a weapon instead of digging.
    if ((flags1 & M1_NEEDPICK)
        && !mtmp.mpeaceful && dist2(mtmp.mx, mtmp.my, targetX, targetY) <= 8) return false;
    return true;
}

function mon_has_dig_tool_basic(mtmp, predicate) {
    const mw = mtmp.mw || null;
    if (mw && predicate(mw)) return true;
    return (mtmp.inventory || []).some((obj) => predicate(obj));
}

function can_tunnel_at_basic(mtmp, x, y) {
    if (!can_tunnel_basic(mtmp)) return false;
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    const flags1 = mtmp.data?.mflags1 ?? 0;
    const needsPick = !!(flags1 & M1_NEEDPICK);
    const rockok = !needsPick || mon_has_dig_tool_basic(mtmp, (obj) => is_pick_weapon_for_mon_basic(mtmp, obj));
    const treeok = !needsPick || mon_has_dig_tool_basic(mtmp, is_axe_weapon_basic);
    if (IS_STWALL(loc.typ)) return rockok && may_dig_basic(x, y);
    if (loc.typ === SDOOR) return rockok;
    if (IS_TREE(loc.typ)) return treeok && may_dig_basic(x, y);
    if (loc.typ === DOOR && (loc.doormask & (D_CLOSED | D_LOCKED))) {
        if (loc.doormask & D_LOCKED) return rockok || treeok;
        return mon_can_open_doors(mtmp) || rockok || treeok;
    }
    return false;
}

function is_pick_weapon_basic(obj) {
    return obj?.otyp === PICK_AXE || obj?.otyp === DWARVISH_MATTOCK;
}

function is_pick_weapon_for_mon_basic(mtmp, obj) {
    return obj?.otyp === PICK_AXE
        || (obj?.otyp === DWARVISH_MATTOCK && !(mtmp.misc_worn_check & W_ARMS));
}

function is_axe_weapon_basic(obj) {
    return obj?.otyp === AXE || obj?.otyp === BATTLE_AXE;
}

function m_digweapon_check_basic(mtmp, x, y) {
    // C ref: monmove.c:m_digweapon_check().  Pick-using tunnellers spend a
    // move wielding the needed tool before entering rock/tree/door terrain.
    if (!((mtmp.data?.mflags1 ?? 0) & M1_NEEDPICK)) return false;
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    const closedDoor = loc.typ === DOOR && !!(loc.doormask & (D_CLOSED | D_LOCKED));
    const diggableWall = IS_STWALL(loc.typ) && !(loc.wall_info & W_NONDIGGABLE);
    if (!closedDoor && !diggableWall) return false;
    const mw = mtmp.mw || null;
    if (closedDoor) {
        if (!mw || (!is_pick_weapon_for_mon_basic(mtmp, mw) && !is_axe_weapon_basic(mw))) {
            mtmp.weapon_check = NEED_PICK_OR_AXE;
        }
    } else if (!mw || !is_pick_weapon_for_mon_basic(mtmp, mw)) {
        mtmp.weapon_check = NEED_PICK_AXE;
    }
    return mtmp.weapon_check >= NEED_PICK_AXE && mon_wield_item_basic(mtmp);
}

function mon_at(x, y, self) {
    return (game.level?.monsters || []).find((mon) => mon !== self && mon.mx === x && mon.my === y);
}

function mon_in_air(mtmp) {
    return !!((mtmp.data?.mflags1 ?? 0) & M1_FLY);
}

function mon_swims(mtmp) {
    return !!((mtmp.data?.mflags1 ?? 0) & M1_SWIM) || !!mtmp.data?.swimmer;
}

function mon_passes_walls(mtmp) {
    return !!((mtmp.data?.mflags1 ?? 0) & M1_WALLWALK);
}

function mon_can_open_doors(mtmp) {
    return !((mtmp.data?.mflags1 ?? 0) & M1_NOHANDS);
}

function mon_likes_lava(mtmp) {
    return !!mtmp.data?.likes_lava;
}

function may_passwall(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    // C ref: hack.c:may_passwall() only blocks special wall types that
    // explicitly carry W_NONPASSWALL.
    return !(IS_STWALL(loc.typ) && (loc.wall_info & W_NONPASSWALL));
}

function may_dig_basic(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    // C ref: hack.c:may_dig().  This helper is intentionally permissive:
    // it returns true for non-rock terrain, so monmove.c:postmov() can enter
    // mdig_tunnel() and let that routine decide that there is no digging.
    return !((IS_STWALL(loc.typ) || IS_TREE(loc.typ))
        && (loc.wall_info & W_NONDIGGABLE));
}

function engr_at_basic(x, y) {
    return (game.level?.engravings || []).find((ep) => ep.x === x && ep.y === y) || null;
}

function wipe_engr_at_basic(x, y, cnt, magical = false) {
    const ep = engr_at_basic(x, y);
    if (!ep || ep.type === HEADSTONE || ep.nowipeout) return;
    if (ep.type === BURN && !magical) return;
    if (ep.type !== DUST && ep.type !== ENGR_BLOOD) {
        cnt = rn2(1 + Math.trunc(50 / (cnt + 1))) ? 0 : 1;
    }
    if (cnt <= 0) return;
    ep.text = String(ep.text || '').slice(cnt);
    if (!ep.text) {
        const list = game.level?.engravings || [];
        const idx = list.indexOf(ep);
        if (idx >= 0) list.splice(idx, 1);
    }
}

function mfndpos_terrain_ok(mtmp, x, y) {
    if (!isok(x, y)) return false;
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    const typ = loc.typ;
    const passwallOk = IS_OBSTRUCTED(typ) && mon_passes_walls(mtmp) && may_passwall(x, y);

    // C ref: mon.c:mfndpos().  Obstructed rock/walls are blocked unless
    // the monster has ALLOW_WALL-style phasing. Digging remains future work.
    if (IS_OBSTRUCTED(typ) && !passwallOk) return false;
    if (IS_WATERWALL(typ) && !mon_swims(mtmp)) return false;
    if (IS_DOOR(typ)) {
        if (loc.doormask & D_LOCKED) return false;
        if (loc.doormask & D_CLOSED) return mon_can_open_doors(mtmp);
        return true;
    }

    const wantpool = mtmp.data?.mlet === 'S_EEL';
    const poolok = mon_in_air(mtmp) || (mon_swims(mtmp) && !wantpool);
    const lavaok = mon_in_air(mtmp) || mon_likes_lava(mtmp);
    if (!poolok && (IS_POOL(typ) !== wantpool)) return false;
    if (!lavaok && IS_LAVA(typ)) return false;
    return passwallOk || SPACE_POS(typ) || IS_POOL(typ) || IS_LAVA(typ);
}

function can_mon_step(mtmp, x, y) {
    if (x === game.u?.ux && y === game.u?.uy) return !mtmp.mpeaceful && !mtmp.mtame;
    if (mon_at(x, y, mtmp)) return false;
    // C ref: mon.c:mfndpos()/mon_allowflags(). Boulder squares are not
    // ordinary movement candidates unless the monster has ALLOW_ROCK.
    if (boulder_at(x, y) && !mon_allows_boulder_square(mtmp)) return false;
    return mfndpos_terrain_ok(mtmp, x, y);
}

function mon_allows_boulder_square(mtmp) {
    const flags2 = mtmp.data?.mflags2 ?? 0;
    return !!(flags2 & M2_ROCKTHROW) || m_can_break_boulder_basic(mtmp);
}

function m_can_break_boulder_basic(mtmp) {
    return mtmp.data?.msound === MS_RIDER
        || (!mtmp.mspec_used
            && (mtmp.isshk || mtmp.ispriest || mtmp.data?.msound === MS_LEADER));
}

function door_blocks_diagonal(x, y) {
    const loc = game.level?.at(x, y);
    return loc && IS_DOOR(loc.typ) && (loc.doormask & ~D_BROKEN);
}

function distmin(x0, y0, x1, y1) {
    return Math.max(Math.abs(x0 - x1), Math.abs(y0 - y1));
}

function lined_up_basic(mtmp) {
    const tx = mtmp.mux ?? game.u?.ux ?? mtmp.mx;
    const ty = mtmp.muy ?? game.u?.uy ?? mtmp.my;
    const dx = Math.abs(tx - mtmp.mx);
    const dy = Math.abs(ty - mtmp.my);
    if ((dx && dy && dx !== dy) || Math.max(dx, dy) >= BOLT_LIM) return false;
    return clear_path(tx, ty, mtmp.mx, mtmp.my);
}

function hero_throw_range_basic() {
    const str = game.u?.ustr ?? game.u?.strength ?? 12;
    return Math.trunc(str / 2) + 1;
}

function object_class(obj) {
    return obj?.oclass ?? OBJECT_CLASS[obj?.otyp] ?? 0;
}

function objects_at(x, y) {
    return (game.level?.objects || []).filter((obj) => obj.ox === x && obj.oy === y);
}

function boulder_at(x, y) {
    return objects_at(x, y).some((obj) => obj.otyp === BOULDER);
}

function could_reach_item(mtmp, x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    if (IS_POOL(loc.typ) && !mon_swims(mtmp) && !mon_in_air(mtmp)) return false;
    if (IS_LAVA(loc.typ) && !mon_likes_lava(mtmp) && !mon_in_air(mtmp)) return false;
    return true;
}

function mon_can_see_square(mtmp, x, y) {
    return clear_path(mtmp.mx, mtmp.my, x, y);
}

function mon_is_mindless(mtmp) {
    return !!((mtmp.data?.mflags1 ?? 0) & M1_MINDLESS);
}

function mon_is_animal(mtmp) {
    return !!((mtmp.data?.mflags1 ?? 0) & M1_ANIMAL);
}

function mon_is_ghost(mtmp) {
    return mtmp.data?.name === 'GHOST';
}

function mon_has_attack_type(mtmp, atyp) {
    return (mtmp.data?.mattk || []).some((attack) => attack?.[0] === atyp);
}

function ranged_attk_available_basic(mtmp) {
    // C ref: mhitu.c:ranged_attk_available().  m_seenres() learning is
    // future work, so the current front door treats unseen resistance as no
    // blocker and only checks distance-capable attack rows.
    return (mtmp.data?.mattk || []).some((attack) => DISTANCE_ATTACK_TYPES.has(attack?.[0]));
}

function is_pole_basic(obj) {
    // C ref: obj.h:is_pole().  Full oc_skill data is not generated yet; this
    // covers the contiguous polearm object range used by current monster
    // init, plus lance-like evidence can be added when object skills land.
    return obj?.oclass === WEAPON_CLASS && obj.otyp >= PARTISAN && obj.otyp <= BEC_DE_CORBIN;
}

function autoreturn_range_basic(obj) {
    // C ref: weapon.c:autoreturn_weapon().  NetHack 5.0's only enabled
    // tethered return weapon is the aklys with (BOLT_LIM / 2)^2 range.
    return obj?.otyp === AKLYS ? 16 : 0;
}

function m_balks_at_approaching_basic(oldappr, mtmp) {
    // C ref: monmove.c:m_balks_at_approaching().
    const edist = dist2(mtmp.mx, mtmp.my, mtmp.mux ?? game.u?.ux ?? mtmp.mx, mtmp.muy ?? game.u?.uy ?? mtmp.my);
    if (mtmp.mpeaceful || edist >= 25 || !m_canseeu_basic(mtmp)) {
        return { appr: oldappr, preferredMin: 0, preferredMax: 0 };
    }
    const mwep = mtmp.mw;
    if (mwep && is_pole_basic(mwep) && edist <= MON_POLE_DIST) {
        return { appr: -1, preferredMin: 0, preferredMax: 0 };
    }
    const returnRange = autoreturn_range_basic(mwep);
    if (returnRange) return { appr: -2, preferredMin: 4, preferredMax: returnRange };
    if (ranged_attk_available_basic(mtmp)
        && ((mtmp.mhp ?? 1) < Math.trunc(((mtmp.mhpmax ?? mtmp.mhp ?? 1) + 1) / 3)
            || !mtmp.mspec_used)) {
        return { appr: -1, preferredMin: 0, preferredMax: 0 };
    }
    return { appr: oldappr, preferredMin: 0, preferredMax: 0 };
}

function hth_weapon_candidate(mtmp) {
    return (mtmp.inventory || []).find((obj) => object_class(obj) === WEAPON_CLASS);
}

function pick_weapon_candidate(mtmp) {
    return (mtmp.inventory || []).find((obj) => obj?.otyp === PICK_AXE)
        || (!(mtmp.misc_worn_check & W_ARMS)
            ? (mtmp.inventory || []).find((obj) => obj?.otyp === DWARVISH_MATTOCK)
            : null);
}

function axe_weapon_candidate(mtmp) {
    return (mtmp.inventory || []).find((obj) => obj?.otyp === BATTLE_AXE)
        || (mtmp.inventory || []).find((obj) => obj?.otyp === AXE);
}

function pick_or_axe_weapon_candidate(mtmp) {
    return (!(mtmp.misc_worn_check & W_ARMS)
        ? ((mtmp.inventory || []).find((obj) => obj?.otyp === DWARVISH_MATTOCK)
            || (mtmp.inventory || []).find((obj) => obj?.otyp === BATTLE_AXE))
        : null)
        || (mtmp.inventory || []).find((obj) => obj?.otyp === PICK_AXE)
        || (mtmp.inventory || []).find((obj) => obj?.otyp === AXE);
}

function mon_wield_item_basic(mtmp) {
    let obj = null;
    if (mtmp.weapon_check === NEED_HTH_WEAPON) {
        obj = hth_weapon_candidate(mtmp);
    } else if (mtmp.weapon_check === NEED_RANGED_WEAPON) {
        // C ref: weapon.c:mon_wield_item() with NEED_RANGED_WEAPON uses
        // select_rwep()'s launcher result. Ranged selection is not modeled
        // yet, so failed selection only resets weapon_check below.
        obj = null;
    } else if (mtmp.weapon_check === NEED_PICK_AXE) {
        obj = pick_weapon_candidate(mtmp);
    } else if (mtmp.weapon_check === NEED_AXE) {
        obj = axe_weapon_candidate(mtmp);
    } else if (mtmp.weapon_check === NEED_PICK_OR_AXE) {
        obj = pick_or_axe_weapon_candidate(mtmp);
    }
    if (!obj) {
        mtmp.weapon_check = NEED_WEAPON;
        return false;
    }
    if (mtmp.mw && mtmp.mw.otyp === obj.otyp) {
        mtmp.weapon_check = NEED_WEAPON;
        return false;
    }
    if (mtmp.mw) mtmp.mw.owornmask = (mtmp.mw.owornmask || 0) & ~W_WEP;
    mtmp.mw = obj;
    obj.owornmask = (obj.owornmask || 0) | W_WEP;
    mtmp.weapon_check = NEED_WEAPON;
    return true;
}

function can_attack_after_move_basic(mtmp, state) {
    // C ref: monmove.c:dochug() lets monsters that moved still reach
    // mattacku() when they are in range for a weapon/ranged attack.
    if (!state?.inrange || state.nearby) return false;
    return mon_has_attack_type(mtmp, 'AT_WEAP');
}

function maybe_wield_hth_before_move(mtmp, state) {
    // C ref: monmove.c:dochug() phase two lets close hostile weapon users
    // spend their move switching to a hand-to-hand weapon before m_move().
    if (mtmp.mpeaceful || mtmp.mtame || !state?.inrange || state.scared) return false;
    const targetX = mtmp.mux ?? game.u?.ux ?? mtmp.mx;
    const targetY = mtmp.muy ?? game.u?.uy ?? mtmp.my;
    if (dist2(mtmp.mx, mtmp.my, targetX, targetY) > 8) return false;
    if (!mon_has_attack_type(mtmp, 'AT_WEAP')) return false;
    if (mtmp.weapon_check !== NEED_WEAPON) return false;
    mtmp.weapon_check = NEED_HTH_WEAPON;
    return mon_wield_item_basic(mtmp);
}

function mon_is_floater(mtmp) {
    return mtmp.data?.mlet === 'S_EYE' || mtmp.data?.mlet === 'S_LIGHT';
}

function current_mon_load(mtmp) {
    return (mtmp.inventory || []).reduce((sum, obj) => sum + (obj.owt || 1), 0);
}

function max_mon_load(mtmp) {
    return ((mtmp.data?.mflags2 ?? 0) & M2_STRONG) ? 1000 : 500;
}

function can_carry(mtmp, obj) {
    if (obj?.cursed && mtmp.mtame) return 0;
    if (current_mon_load(mtmp) + (obj?.owt || 1) > max_mon_load(mtmp)) return 0;
    return Math.max(1, obj?.quan || 1);
}

function searches_for_item_basic(mtmp, obj) {
    if (mon_is_animal(mtmp) || mon_is_mindless(mtmp) || mon_is_ghost(mtmp)) return false;

    const cls = object_class(obj);
    const typ = obj?.otyp;
    // C ref: muse.c:searches_for_item().  Ordinary collectors only chase
    // specific usable magic; broad M2_MAGIC collection is handled separately.
    if (typ === WAN_MAKE_INVISIBLE || typ === POT_INVISIBILITY) {
        return !mtmp.minvis && !mtmp.invis_blkd && !mon_has_attack_type(mtmp, 'AT_GAZE');
    }
    if (typ === WAN_SPEED_MONSTER || typ === POT_SPEED) return mtmp.mspeed !== MFAST;

    if (cls === WAND_CLASS) {
        if ((obj.spe ?? 1) <= 0) return false;
        if (typ === WAN_DIGGING) return !mon_is_floater(mtmp);
        if (typ === WAN_POLYMORPH) return (mtmp.data?.difficulty ?? mtmp.data?.mlevel ?? 0) < 6;
        return OBJECT_DIR[typ] === RAY
            || typ === WAN_STRIKING
            || typ === WAN_UNDEAD_TURNING
            || typ === WAN_TELEPORTATION
            || typ === WAN_CREATE_MONSTER;
    }
    if (cls === POTION_CLASS) {
        return typ === POT_HEALING
            || typ === POT_EXTRA_HEALING
            || typ === POT_FULL_HEALING
            || typ === POT_POLYMORPH
            || typ === POT_GAIN_LEVEL
            || typ === POT_PARALYSIS
            || typ === POT_SLEEPING
            || typ === POT_ACID
            || typ === POT_CONFUSION
            || (typ === POT_BLINDNESS && !mon_has_attack_type(mtmp, 'AT_GAZE'));
    }
    if (cls === SCROLL_CLASS) {
        return typ === SCR_TELEPORTATION
            || typ === SCR_CREATE_MONSTER
            || typ === SCR_EARTH
            || typ === SCR_FIRE;
    }
    if (cls === AMULET_CLASS) {
        if (typ === AMULET_OF_LIFE_SAVING) return true;
        return typ === AMULET_OF_REFLECTION || typ === AMULET_OF_GUARDING;
    }
    return false;
}

function mon_would_take_item(mtmp, obj) {
    if (!obj || typeof obj.otyp !== 'number') return false;
    if (obj.otyp === ROCK) return false;
    const cls = object_class(obj);
    const flags2 = mtmp.data?.mflags2 ?? 0;
    const pctload = Math.trunc((current_mon_load(mtmp) * 100) / Math.max(1, max_mon_load(mtmp)));
    if (!mon_is_mindless(mtmp) && !mon_is_animal(mtmp) && pctload < 75
        && searches_for_item_basic(mtmp, obj)) return true;
    if ((flags2 & M2_COLLECT) && [WEAPON_CLASS, ARMOR_CLASS, GEM_CLASS, FOOD_CLASS].includes(cls)
        && pctload < 75) return true;
    if ((flags2 & M2_MAGIC) && [AMULET_CLASS, POTION_CLASS, SCROLL_CLASS, WAND_CLASS, RING_CLASS, SPBOOK_CLASS].includes(cls)
        && pctload < 85) return true;
    return false;
}

function m_search_items_basic(mtmp, ggx, ggy, appr) {
    let minr = 5;
    const omx = mtmp.mx;
    const omy = mtmp.my;
    if (distmin(mtmp.mux ?? ggx, mtmp.muy ?? ggy, omx, omy) < 5 && !mtmp.mpeaceful) minr--;
    let target = null;
    const hmx = Math.min(79, omx + minr);
    const hmy = Math.min(20, omy + minr);
    const lmx = Math.max(1, omx - minr);
    const lmy = Math.max(0, omy - minr);
    for (let xx = lmx; xx <= hmx; xx++) {
        for (let yy = lmy; yy <= hmy; yy++) {
            if (minr < distmin(omx, omy, xx, yy)) continue;
            if (!could_reach_item(mtmp, xx, yy)) continue;
            if (!mon_can_see_square(mtmp, xx, yy)) continue;
            const pile = objects_at(xx, yy);
            if (!pile.length) continue;
            for (const obj of pile) {
                if (mon_would_take_item(mtmp, obj) && can_carry(mtmp, obj) > 0) {
                    minr = distmin(omx, omy, xx, yy);
                    target = { x: xx, y: yy };
                    break;
                }
            }
        }
    }
    if (target && minr < 5 && appr === -1) {
        if (distmin(omx, omy, mtmp.mux ?? ggx, mtmp.muy ?? ggy) <= 3) return null;
    }
    return target;
}

async function mpickstuff_basic(mtmp) {
    const pile = objects_at(mtmp.mx, mtmp.my);
    for (const obj of pile) {
        if (!mon_would_take_item(mtmp, obj) || can_carry(mtmp, obj) <= 0) continue;
        if (cansee(mtmp.mx, mtmp.my)) {
            await append_monster_topline(`The ${monster_name(mtmp)} picks up ${floor_object_name(obj)}.`);
        }
        const idx = game.level.objects.indexOf(obj);
        if (idx >= 0) game.level.objects.splice(idx, 1);
        mtmp.inventory = mtmp.inventory || [];
        mtmp.inventory.unshift(obj);
        mtmp.misc_worn_check = (mtmp.misc_worn_check || 0) | I_SPECIAL;
        newsym(mtmp.mx, mtmp.my);
        return true;
    }
    return false;
}

function set_door_mask_basic(loc, mask) {
    loc.flags = mask;
    loc.doormask = mask;
}

function remove_dead_monster(mtmp) {
    const monsters = game.level?.monsters || [];
    const idx = monsters.indexOf(mtmp);
    if (idx >= 0) monsters.splice(idx, 1);
    newsym(mtmp.mx, mtmp.my);
}

function monster_name(mtmp) {
    if (hallucinating()) return randomHallucinatedMonsterName();
    return String(mtmp?.data?.name || 'monster').toLowerCase().replace(/_/g, ' ');
}

function floor_object_name(obj) {
    if (obj?.oclass === POTION_CLASS) return 'a potion';
    if (obj?.oclass === GEM_CLASS) {
        if (obj.otyp === ROCK) return 'a rock';
        const noun = obj.otyp >= DILITHIUM_CRYSTAL && obj.otyp <= FLINT
            ? (obj.otyp >= LUCKSTONE ? 'stone' : 'gem')
            : 'gem';
        const appearance = obj.dknown ? getObjectDescription(obj.otyp) : '';
        return appearance ? `a ${appearance} ${noun}` : `a ${noun}`;
    }
    return 'an object';
}

function monster_weapon_name(obj) {
    if (obj?.otyp === ORCISH_DAGGER) return 'crude dagger';
    return floor_object_name(obj).replace(/^(?:an?|the) /, '');
}

function monster_possessive(mtmp) {
    if (mtmp?.female) return 'her';
    if (mtmp?.male) return 'his';
    return 'its';
}

function occupation_message_boundary_active() {
    return (game._occupation_turns_remaining || 0) > 0 || !!game._occupation_finish_message;
}

function hallucinating() {
    return !!(game.u?.uhallucination || game.u?.uprops?.hallucination);
}

function is_more_dismiss_key(ch) {
    if (typeof ch === 'number') ch = String.fromCharCode(ch);
    return ch === ' ' || ch === '\r' || ch === '\n' || ch === '\x1b';
}

async function flush_pending_more_before_monster_message() {
    if (!game._more || !game._pending_message) return;
    if (game._pet_combat_more_latched && !hallucinating()) return;
    // C ref: tty topline `--More--` is often serviced when the next pline()
    // wants to print. This lets intervening map updates become visible before
    // the prior message is dismissed, without applying the next message's
    // side effects behind the old topline.
    await flush_screen(1);
    await nhgetch();
    clear_pending_message();
    game._hallucination_warning_rng_active = false;
    if (game._after_more_message) {
        const msg = game._after_more_message;
        const needsPrompt = !!game._after_more_needs_prompt;
        const strictPromptKeys = !!game._after_more_strict_keys;
        game._after_more_message = '';
        game._after_more_needs_prompt = false;
        game._after_more_strict_keys = false;
        await pline(msg);
        if (needsPrompt) {
            queue_more_prompt();
            let ch;
            do {
                await flush_screen(1);
                ch = await nhgetch();
            } while (strictPromptKeys && !is_more_dismiss_key(ch));
            clear_pending_message();
        }
    }
    if (game._swallowed_display_pending) {
        // C ref: mhitu.c:gulpmu() calls vision_recalc(2)/swallowed(1) after
        // the initial engulf message is serviced, so later swallowed damage
        // screens show the blank engulfed map rather than the old room.
        game._swallowed_display_pending = false;
        game._swallowed_map_active = true;
        game._swallowed_overlay = null;
        refresh_swallowed_overlay();
        refresh_swallowed_overlay();
    }
}

async function show_blocking_monster_message(line) {
    if (!line) return;
    if (game._pending_message?.startsWith('You hear nothing special.') && !game._more
        && `${game._pending_message}  ${line}`.length < 80) {
        game._pending_message = `${game._pending_message}  ${line}`;
        return;
    }
    if (/^You (miss|hit) /.test(game._pending_message || '') && !game._more
        && `${game._pending_message}  ${line}`.length < 80) {
        game._pending_message = `${game._pending_message}  ${line}`;
        return;
    }
    if (game._pending_message && !game._more && `${game._pending_message}  ${line}`.length < 80) {
        if (/^You hear the (?:studio audience applaud|rumble of distant thunder\.\.\.)!$/.test(game._pending_message)) {
            game._pending_message = `${game._pending_message}  ${line}`;
            queue_more_prompt();
            game._monster_attack_more_latched = true;
            if (game._pending_monster_attack_side_effect) {
                game._after_more_message = game._pending_monster_attack_side_effect;
                game._pending_monster_attack_side_effect = '';
            }
            return;
        }
        if (game._pending_message === "You're covered in frost!") {
            game._pending_message = `${game._pending_message}  ${line}`;
            queue_more_prompt();
            game._monster_attack_more_latched = true;
            return;
        }
        if (/^The .+ is killed!$/.test(game._pending_message)) {
            game._pending_message = `${game._pending_message}  ${line}`;
            return;
        }
        if (/^The .+ (?:misses|hits|bites|stings|kicks|butts) the .+\.$/.test(game._pending_message)) {
            game._pending_message = `${game._pending_message}  ${line}`;
            queue_more_prompt();
            game._packed_monster_more_candidate = true;
            return;
        }
        queue_more_prompt();
        game._monster_more_accepts_any_key = true;
        if (!game._monster_death_pending) {
            game._after_more_message = line;
            game._after_more_needs_prompt = true;
        }
        return;
    }
    if (game._more && game._pending_message && game._pet_combat_more_latched && !hallucinating()) {
        game._after_more_message = game._after_more_message
            ? `${game._after_more_message}  ${line}`
            : line;
        game._after_more_needs_prompt = true;
        return;
    }
    await pline(line);
    if (game._monster_death_pending || game._fatal_monster_attack_paused) queue_more_prompt();
}

async function flush_visible_monster_attack_side_effect() {
    if (!game._pending_monster_attack_side_effect || game._more) return;
    const msg = game._pending_monster_attack_side_effect;
    game._pending_monster_attack_side_effect = '';
    await append_pline(msg);
}

async function append_swallowed_damage_message(line) {
    if (!line) return;
    // C ref: mhitu.c:gulpmu() damage plines go through the normal tty
    // topline. Repeated swallowed attacks can pack before the later pline
    // that forces `--More--`, so don't make every damage message block.
    if (game._pending_message && !game._more) {
        game._pending_message = `${game._pending_message}  ${line}`;
        return true;
    } else {
        await pline(line);
        return false;
    }
}

async function append_monster_topline(line) {
    if (game._pending_message) {
        game._pending_message = `${game._pending_message}  ${line}`;
        queue_more_prompt();
        // C ref: mon.c:mpickstuff() visible pickup plines use tty topline
        // packing, but the delayed occupation should pause after the current
        // monster turn finishes. Pet combat keeps its earlier immediate
        // boundary because mhitm.c death side effects are still pending there.
    } else {
        await pline(line);
    }
}

function mb_trapped_basic(mtmp) {
    // C ref: monmove.c:mb_trapped(). Messages, wakeup, and trap memory have
    // no RNG in the current evidence; the required ownership is rnd(15).
    mtmp.mstun = 1;
    if (typeof mtmp.mhp === 'number') {
        mtmp.mhp -= rnd(15);
        if (mtmp.mhp <= 0) {
            remove_dead_monster(mtmp);
            return true;
        }
    } else {
        rnd(15);
    }
    return false;
}

function postmove_door_basic(mtmp) {
    const loc = game.level?.at(mtmp.mx, mtmp.my);
    if (!loc || !IS_DOOR(loc.typ) || mon_passes_walls(mtmp)) return MMOVE_MOVED;
    const trapped = !!(loc.doormask & D_TRAPPED);
    if ((loc.doormask & D_LOCKED) && trapped) {
        set_door_mask_basic(loc, D_NODOOR);
        newsym(mtmp.mx, mtmp.my);
        game.vision_full_recalc = 1;
        return mb_trapped_basic(mtmp) ? MMOVE_DIED : MMOVE_MOVED;
    }
    if (loc.doormask === D_CLOSED && mon_can_open_doors(mtmp)) {
        set_door_mask_basic(loc, D_ISOPEN);
        newsym(mtmp.mx, mtmp.my);
        game.vision_full_recalc = 1;
    } else if ((loc.doormask & D_CLOSED) && trapped) {
        set_door_mask_basic(loc, D_NODOOR);
        newsym(mtmp.mx, mtmp.my);
        game.vision_full_recalc = 1;
        return mb_trapped_basic(mtmp) ? MMOVE_DIED : MMOVE_MOVED;
    }
    return MMOVE_MOVED;
}

function mon_track_add(mtmp, x, y) {
    if (!mtmp.mtrack) mtmp.mtrack = [];
    mtmp.mtrack.unshift({ x, y });
    if (mtmp.mtrack.length > MTSZ) mtmp.mtrack.length = MTSZ;
}

function monster_level(mtmp) {
    return mtmp?.m_lev ?? mtmp?.data?.mlevel ?? 0;
}

function is_undirected_spell_basic(spellName) {
    return !!(MCAST[spellName]?.flags & MCF_INDIRECT);
}

function spell_would_be_useless_basic(mtmp, spellName) {
    const spell = MCAST[spellName];
    if (!spell) return false;
    if ((spell.flags & MCF_HOSTILE) && mtmp.mpeaceful) return true;
    if ((spell.flags & MCF_SIGHT) && !couldsee(mtmp.mx, mtmp.my)) return true;
    switch (spellName) {
    case 'HASTE_SELF':
        return mtmp.permspeed === MFAST;
    case 'DISAPPEAR':
        return !!(mtmp.minvis || mtmp.invis_blkd);
    case 'CURE_SELF':
        return (mtmp.mhp ?? 1) >= (mtmp.mhpmax ?? mtmp.mhp ?? 1);
    case 'CLONE_WIZ':
        return !mtmp.iswiz || (game.context?.no_of_wizards ?? 0) > 1;
    case 'GEYSER':
        return !rn2(5);
    case 'DEATH_TOUCH':
        if (hallucinating() && !rn2(2)) return true;
        return false;
    default:
        return false;
    }
}

function choose_monster_spell_basic(mtmp, adtyp) {
    const list = adtyp === 'AD_CLRC' ? MON_CLERIC_SPELLS : MON_WIZARD_SPELLS;
    const maxlev = MCAST[list[list.length - 1]].level;
    let spellval = rn2(Math.max(1, monster_level(mtmp)));
    if (spellval > maxlev && rn2(maxlev)) spellval = rn2(maxlev);
    for (let i = list.length - 1; i >= 0; i--) {
        const spellName = list[i];
        if (MCAST[spellName].level <= spellval
            && !spell_would_be_useless_basic(mtmp, spellName)) {
            return spellName;
        }
    }
    return list[0];
}

function magic_spell_attack_basic(mtmp) {
    return (mtmp.data?.mattk || []).find((attack) =>
        attack?.[0] === 'AT_MAGC' && (attack?.[1] === 'AD_SPEL' || attack?.[1] === 'AD_CLRC'));
}

function apply_undirected_spell_basic(mtmp, spellName) {
    switch (spellName) {
    case 'HASTE_SELF':
        mtmp.mspeed = MFAST;
        mtmp.permspeed = MFAST;
        return true;
    case 'DISAPPEAR':
        mtmp.minvis = 1;
        return true;
    case 'CURE_SELF':
        if ((mtmp.mhp ?? 0) < (mtmp.mhpmax ?? 0)) {
            mtmp.mhp = Math.min(mtmp.mhpmax, (mtmp.mhp ?? 0) + Math.max(1, monster_level(mtmp)));
        }
        return true;
    default:
        return true;
    }
}

function maybe_cast_undirected_spell_before_move(mtmp) {
    // C ref: monmove.c:dochug()/mcastu.c:castmu().  Non-attacking casters
    // still choose one spell before m_move(); directed picks usually miss and
    // leave the monster to move normally.
    if (mtmp.mspec_used || dist2(mtmp.mx, mtmp.my, game.u?.ux ?? mtmp.mx, game.u?.uy ?? mtmp.my) > 49) {
        return false;
    }
    const attack = magic_spell_attack_basic(mtmp);
    if (!attack) return false;
    const spellName = choose_monster_spell_basic(mtmp, attack[1]);
    if (!is_undirected_spell_basic(spellName) || spell_would_be_useless_basic(mtmp, spellName)) {
        return false;
    }
    const ml = monster_level(mtmp);
    if (mtmp.mcan || mtmp.mspec_used || !ml) return false;
    mtmp.mspec_used = ml < 8 ? 10 - ml : 2;
    if (rn2(ml * 10) < (mtmp.mconf ? 100 : 20)) return false;
    return apply_undirected_spell_basic(mtmp, spellName);
}

function attack_is_basic_physical(attack) {
    if (!attack) return true;
    const [aatyp, adtyp, damn, damd] = attack;
    return BASIC_MELEE_ATTACKS.has(aatyp)
        && ['AD_PHYS', 'AD_ELEC', 'AD_COLD', 'AD_FIRE', 'AD_ACID'].includes(adtyp)
        && damn > 0
        && damd > 0;
}

function basic_physical_attacks(mtmp, includeWeapon = true) {
    const attacks = mtmp.data?.mattk || [];
    if (!attacks.filter(Boolean).length) return null;
    if (!includeWeapon && attacks.some((attack) => attack?.[0] === 'AT_WEAP')) return null;
    if (!attacks.every(attack_is_basic_physical)) return null;
    return attacks;
}

function basic_engulf_attack(mtmp) {
    const attacks = mtmp.data?.mattk || [];
    const realAttacks = attacks.filter(Boolean);
    if (realAttacks.length !== 1) return null;
    const attack = realAttacks[0];
    const [aatyp, adtyp, damn, damd] = attack;
    if (aatyp !== 'AT_ENGL' || damn <= 0 || damd <= 0) return null;
    if (!['AD_COLD', 'AD_FIRE', 'AD_ELEC', 'AD_PHYS', 'AD_ACID'].includes(adtyp)) return null;
    return attack;
}

function cooldown_replacement_attack(mtmp) {
    if (!mtmp.mspec_used) return null;
    const attack = basic_engulf_attack(mtmp);
    if (!attack) return null;
    const [, adtyp] = attack;
    if (['AD_COLD', 'AD_FIRE', 'AD_ELEC', 'AD_ACID'].includes(adtyp)) {
        return ['AT_TUCH', adtyp, 1, 6];
    }
    return ['AT_CLAW', 'AD_PHYS', 1, 6];
}

function hero_ac_value() {
    const uac = game.u?.uac ?? 10;
    return uac >= 0 ? uac : -rnd(-uac);
}

function reduce_damage_by_negative_ac(damage) {
    const uac = game.u?.uac ?? 10;
    if (damage > 0 && uac < 0) {
        damage -= rnd(-uac);
        if (damage < 1) damage = 1;
    }
    return damage;
}

function hero_magic_negation() {
    // Full armor `a_can` state is not modeled yet.  Keep the C call shape
    // centralized so worn-armor cancellation can be plugged in here.
    return game.u?.magic_negation ?? 0;
}

function mhitm_mgc_atk_negated_basic(mtmp) {
    if (mtmp.mcan) return true;
    const armpro = hero_magic_negation();
    return !(rn2(10) >= 3 * armpro);
}

function destroy_items_shape(_adtyp, damage) {
    const scale = 5; // C ref: zap.c DMG_DESTROY_SCALE
    let limit = Math.trunc(damage / scale);
    if ((damage % scale) > rn2(scale)) limit++;
    if (limit < 1) return 0;
    // Inventory destruction and eligible-stack reservoir selection are not
    // modeled yet.  Current evidence only needs the damage-limit front door.
    return 0;
}

function elemental_hit_side_effects(mtmp, adtyp, damage) {
    if (!['AD_COLD', 'AD_FIRE', 'AD_ELEC'].includes(adtyp)) return damage;
    const negated = mhitm_mgc_atk_negated_basic(mtmp);
    if (negated) return 0;
    // C ref: mhitm_ad_cold/fire/elec() gates inventory destruction on
    // attacker level after a non-negated elemental hit.
    if (monster_level(mtmp) > rn2(20)) destroy_items_shape(adtyp, damage);
    return damage;
}

function mhitm_knockback_frontdoor() {
    // C ref: uhitm.c:mhitm_knockback() computes these two rolls before
    // most qualification checks, including attack-type eligibility.
    rn2(3);
    rn2(6);
}

function mattacku_to_hit(mtmp) {
    let toHit = hero_ac_value() + 10 + monster_level(mtmp);
    if ((game._occupation_turns_remaining || 0) > 0) toHit += 4;
    if (mtmp.mcansee === 0) toHit -= 2;
    if (mtmp.mtrapped) toHit -= 2;
    if (toHit <= 0) toHit = 1;
    return toHit;
}

function apply_hero_damage(damage) {
    if (damage > 0) game.u.uhp = Math.max(0, (game.u.uhp ?? 0) - damage);
}

async function unstuck_swallowed_hero(mtmp) {
    if (!game.u?.uswallow || game.u.ustuck !== mtmp) return;
    game.u.uswallow = false;
    game.u.ustuck = null;
    game.u.uswldtim = 0;
    game._swallowed_display_pending = false;
    game._swallowed_map_active = false;
    game._swallowed_overlay = null;
    game.u.ux = mtmp.mx;
    game.u.uy = mtmp.my;
    if (!mtmp.mspec_used && basic_engulf_attack(mtmp)) {
        mtmp.mspec_used = rnd(2);
    }
    const spot = enexto_core(game.u.ux, game.u.uy, mtmp.data, GP_CHECKSCARY)
        || enexto_core(game.u.ux, game.u.uy, mtmp.data, 0);
    if (spot) {
        const omx = mtmp.mx;
        const omy = mtmp.my;
        mtmp.mx = spot.x;
        mtmp.my = spot.y;
        newsym(omx, omy);
        newsym(mtmp.mx, mtmp.my);
    }
    game.vision_full_recalc = 1;
    await docrt();
}

export async function finish_pending_swallowed_expulsion() {
    if (!game._pending_swallowed_display_clear) return false;
    game._pending_swallowed_display_clear = false;
    const mtmp = game._pending_swallowed_expulsion_mon || null;
    game._pending_swallowed_expulsion_mon = null;
    game._swallowed_latched_overlay = null;
    if (mtmp && game.u?.uswallow && game.u.ustuck === mtmp) {
        await unstuck_swallowed_hero(mtmp);
        game._latched_status_uhp = null;
        return true;
    }
    if (game.u) {
        game.u.uswallow = false;
        game.u.ustuck = null;
        game.u.uswldtim = 0;
    }
    game._swallowed_display_pending = false;
    game._swallowed_map_active = false;
    game._swallowed_latched_overlay = null;
    game._swallowed_overlay = null;
    game._latched_status_uhp = null;
    game.vision_full_recalc = 1;
    await docrt();
    return true;
}

async function engulf_attack(mtmp, attack, toHit) {
    await flush_pending_more_before_monster_message();
    const [, adtyp, damn, damd] = attack;
    const alreadySwallowed = game.u?.uswallow && game.u?.ustuck === mtmp;
    if (!alreadySwallowed && !(toHit > rnd(20))) return true;
    let damage = d(damn, damd);
    if (!alreadySwallowed) {
        game.u.ustuck = mtmp;
        mtmp.mx = game.u.ux;
        mtmp.my = game.u.uy;
        newsym(mtmp.mx, mtmp.my);
        game._pet_combat_more_latched = false;
        await show_blocking_monster_message(`The ${monster_name(mtmp)} engulfs you!`);
        if (!game._more) queue_more_prompt();
        game.u.uswallow = true;
        game.u.uswldtim = Math.max(2, rnd(monster_level(mtmp) + 5));
        game._swallowed_display_pending = true;
    }
    if ((game.u.uswldtim || 0) > 0) {
        game.u.uswldtim--;
    }

    let swallowedDamagePackedWithHeroHit = false;
    switch (adtyp) {
    case 'AD_COLD':
    case 'AD_FIRE':
    case 'AD_ELEC':
        await flush_pending_more_before_monster_message();
        if (mtmp.mcan || !rn2(2)) {
            damage = 0;
        } else if (adtyp === 'AD_COLD') {
            swallowedDamagePackedWithHeroHit = await append_swallowed_damage_message('You are freezing to death!')
                && /^You hit /.test(game._pending_message || '');
        } else if (adtyp === 'AD_FIRE') {
            swallowedDamagePackedWithHeroHit = await append_swallowed_damage_message('You are burning to a crisp!')
                && /^You hit /.test(game._pending_message || '');
        } else if (adtyp === 'AD_ELEC') {
            swallowedDamagePackedWithHeroHit = await append_swallowed_damage_message('The air around you crackles with electricity.')
                && /^You hit /.test(game._pending_message || '');
        }
        break;
    case 'AD_PHYS':
        damage = reduce_damage_by_negative_ac(damage);
        break;
    case 'AD_ACID':
        break;
    default:
        damage = 0;
        break;
    }
    apply_hero_damage(damage);
    if (damage > 0) game._occupation_turns_remaining = 0;
    if (game.u?.uswallow && (game.u.uswldtim || 0) <= 0) {
        await append_swallowed_damage_message('You get expelled!');
        queue_more_prompt();
        game._latched_status_uhp = game.u?.uhp ?? null;
        game._swallowed_latched_overlay = game._swallowed_overlay;
        game._pending_swallowed_expulsion_mon = mtmp;
        game._pending_swallowed_display_clear = true;
        swallowedDamagePackedWithHeroHit = false;
    }
    if (swallowedDamagePackedWithHeroHit && !game._more
        && (game._pending_message?.length || 0) >= 54) {
        queue_more_prompt();
        game._swallowed_damage_more_latched = true;
    }
    return true;
}

async function latch_monster_attack_more_frame(line) {
    if (!line || game._more || game._latched_more_screen) return false;
    const oldPending = game._pending_message;
    game._pending_message = line;
    queue_more_prompt();
    await flush_screen(1);
    game._latched_more_screen = serialize_terminal_grid(game.nhDisplay);
    game._latched_more_cursor = [
        game.nhDisplay?.cursorCol ?? Math.min(`${line}--More--`.length, 79),
        game.nhDisplay?.cursorRow ?? 0,
    ];
    game._pending_message = oldPending;
    return true;
}

async function physical_melee_attacks(mtmp, attacks, toHit) {
    const hitMessages = [];
    const attackVerbCounts = new Map();
    let latchedTailStart = null;
    for (let i = 0; i < attacks.length; i++) {
        const attack = attacks[i];
        if (!attack) continue;
        const [, adtyp, damn, damd] = attack;
        const roll = rnd(20 + i);
        if (toHit > roll) {
            const verb = monster_attack_verb(attack, attackVerbCounts);
            const extra = adtyp === 'AD_ELEC' ? '  You get zapped!' : '';
            const target = verb === 'touches' ? ' you' : '';
            const line = verb === 'weapon'
                ? `The ${monster_name(mtmp)} thrusts ${monster_possessive(mtmp)} ${monster_weapon_name(mtmp.mw)}.  The ${monster_name(mtmp)} hits!`
                : `The ${monster_name(mtmp)} ${verb}${target}!${extra}`;
            if (hitMessages.length
                && `${hitMessages.join('  ')}  ${line}`.length >= (game.nhDisplay?.cols || 80)) {
                if (await latch_monster_attack_more_frame(hitMessages.join('  ')))
                    latchedTailStart = hitMessages.length;
            }
            hitMessages.push(line);
            let damage = d(damn, damd);
            if (verb === 'weapon') damage += monster_weapon_damage(mtmp.mw);
            damage = elemental_hit_side_effects(mtmp, adtyp, damage);
            mhitm_knockback_frontdoor();
            damage = reduce_damage_by_negative_ac(damage);
            if (adtyp === 'AD_COLD' && damage > 0)
                game._pending_monster_attack_side_effect = "You're covered in frost!";
            const preDamageHp = game.u?.uhp ?? 0;
            apply_hero_damage(damage);
            if (damage > 0 && /^You hear the studio audience applaud!$/.test(game._pending_message || '')) {
                game._latched_status_uhp = preDamageHp;
                game._clear_latched_status_after_more = true;
            }
            if ((game.u?.uhp ?? 0) <= 0) {
                if (!game._pet_combat_resume_active)
                    game._latched_status_uhp = preDamageHp <= 1 ? Math.max(0, preDamageHp) : 0;
                game._monster_death_pending = true;
                if (!game._pet_combat_resume_active) {
                    game._fatal_monster_attack_paused = true;
                    game._monster_turn_paused_for_more = true;
                }
                break;
            }
        } else {
            const miss = toHit === roll ? 'just misses' : 'misses';
            const line = attack?.[0] === 'AT_WEAP'
                ? `The ${monster_name(mtmp)} thrusts ${monster_possessive(mtmp)} ${monster_weapon_name(mtmp.mw)}.  The ${monster_name(mtmp)} ${miss}!`
                : `The ${monster_name(mtmp)} ${miss}!`;
            if (hitMessages.length
                && `${hitMessages.join('  ')}  ${line}`.length >= (game.nhDisplay?.cols || 80)) {
                if (await latch_monster_attack_more_frame(hitMessages.join('  ')))
                    latchedTailStart = hitMessages.length;
            }
            hitMessages.push(line);
        }
    }
    if (latchedTailStart != null && !game._after_more_message) {
        game._after_more_message = hitMessages.slice(latchedTailStart).join('  ');
        game._after_more_needs_prompt = true;
        game._after_more_strict_keys = true;
    }
    return hitMessages;
}

function monster_attack_verb(attack, counts) {
    const [aatyp] = attack || [];
    let verb = 'hits';
    if (aatyp === 'AT_WEAP') verb = 'weapon';
    else if (aatyp === 'AT_BITE') verb = 'bites';
    else if (aatyp === 'AT_STNG') verb = 'stings';
    else if (aatyp === 'AT_KICK') verb = 'kicks';
    else if (aatyp === 'AT_BUTT') verb = 'butts';
    else if (aatyp === 'AT_TUCH') verb = 'touches';
    else if (aatyp === 'AT_CLAW') verb = 'hits';

    const seen = counts.get(verb) || 0;
    counts.set(verb, seen + 1);
    return seen > 0 && verb === 'hits' ? 'hits again' : verb;
}

function monster_weapon_damage(obj) {
    if (obj?.otyp === ORCISH_DAGGER) return rnd(3);
    return 0;
}

async function mattacku_basic(mtmp, state) {
    if (game.u?.uswallow && game.u?.ustuck !== mtmp) return false;
    const rangeWeapon = state?.inrange && !state.nearby && mon_has_attack_type(mtmp, 'AT_WEAP');
    if ((!state?.nearby && !rangeWeapon) || state.scared || mtmp.mpeaceful || mtmp.mtame) return false;
    if ((game._occupation_turns_remaining || 0) > 1 || game._occupation_finish_uac != null) return false;
    if ((game.u?.uhp ?? 1) <= 0) return false;

    const cooldownAttack = cooldown_replacement_attack(mtmp);
    if (cooldownAttack) {
        if (game._hero_melee_message_pending && game._pending_message) queue_more_prompt();
        await flush_pending_more_before_monster_message();
        const messages = await physical_melee_attacks(mtmp, [cooldownAttack], mattacku_to_hit(mtmp));
        if (messages.length) await show_blocking_monster_message(messages.join('  '));
        await flush_visible_monster_attack_side_effect();
        return true;
    }
    const engulf = basic_engulf_attack(mtmp);
    const physical = engulf ? null : basic_physical_attacks(mtmp, !rangeWeapon);
    if (!engulf && !physical && !rangeWeapon) return false;
    const toHit = mattacku_to_hit(mtmp);
    if (game._hero_melee_message_pending && game._pending_message) queue_more_prompt();
    // C ref: mhitu.c:mattacku() computes AC_VALUE() before AT_WEAP range
    // dispatch. The actual thrwmu()/select_rwep path is still future work.
    if (rangeWeapon && !physical) {
        if (mtmp.weapon_check === NEED_WEAPON || !mtmp.mw) {
            mtmp.weapon_check = NEED_RANGED_WEAPON;
            mon_wield_item_basic(mtmp);
        }
        return false;
    }
    if (engulf) return engulf_attack(mtmp, engulf, toHit);
    await flush_pending_more_before_monster_message();
    const messages = await physical_melee_attacks(mtmp, physical, toHit);
    if (messages.length) mtmp.mlstmv = game.moves || 0;
    if (messages.length) await show_blocking_monster_message(messages.join('  '));
    await flush_visible_monster_attack_side_effect();
    return true;
}

async function m_move_basic(mtmp) {
    // C ref: monmove.c:m_move().  This is a narrow ordinary-monster
    // movement skeleton: adjacent candidates, mtrack backtracking rolls, and
    // deterministic approach/flee selection.  Tunneling, most traps, full
    // attacks, and special monsters remain future subsystem work.
    const omx = mtmp.mx;
    const omy = mtmp.my;
    let ggx = mtmp.mux ?? game.u?.ux ?? omx;
    let ggy = mtmp.muy ?? game.u?.uy ?? omy;
    let appr = mtmp.mflee ? -1 : 1;
    let preferredrange_min = 0;
    let preferredrange_max = 0;
    // C ref: monmove.c:m_move().  While swallowed, bystander monsters
    // spend their movement opportunity without ordinary path selection.
    if (game.u?.uswallow && !mtmp.mflee && game.u?.ustuck !== mtmp) return 1;
    if (mtmp.isshk || mtmp.isgd) return MMOVE_NOTHING;
    if (mtmp.ispriest) {
        // C ref: priest.c:pri_move().  A priest in their temple mills around
        // the shrine before move_special(); the current front door preserves
        // the altar-offset RNG without falling into ordinary peaceful m_move().
        rn2(3);
        rn2(3);
        return MMOVE_NOTHING;
    }
    if (mtmp.mconf) {
        appr = 0;
    } else {
        const shouldSee = monster_should_see_target(mtmp, omx, omy, ggx, ggy);
        if (mtmp.mcansee === 0 || (mtmp.mpeaceful && !mtmp.isshk)
            || ((mtmp.data?.name === 'STALKER' || mtmp.data?.mlet === 'S_BAT' || mtmp.data?.mlet === 'S_LIGHT')
                && !rn2(3))) {
            appr = 0;
        }
        if (appr === 1) {
            const balk = m_balks_at_approaching_basic(appr, mtmp);
            appr = balk.appr;
            preferredrange_min = balk.preferredMin;
            preferredrange_max = balk.preferredMax;
        }
        if (!shouldSee && can_track_basic(mtmp.data)) {
            const track = gettrack(omx, omy);
            if (track) {
                ggx = track.x;
                ggy = track.y;
            }
        }
    }
    let getitems = false;
    if (!mtmp.mpeaceful || !rn2(10)) {
        // C ref: monmove.c:m_move().  Monsters already lined up for a
        // weapon/ranged attack do not detour into m_search_items().
        const inLine = lined_up_basic(mtmp)
            && distmin(mtmp.mx, mtmp.my, mtmp.mux ?? ggx, mtmp.muy ?? ggy) <= hero_throw_range_basic();
        if (appr !== 1 || !inLine) getitems = true;
    }
    if (getitems) {
        const itemGoal = m_search_items_basic(mtmp, ggx, ggy, appr);
        if (itemGoal) {
            ggx = itemGoal.x;
            ggy = itemGoal.y;
            if (ggx === omx && ggy === omy) {
                return await mpickstuff_basic(mtmp) ? MMOVE_DONE : MMOVE_NOTHING;
            }
            if (appr === -1) appr = 1;
        }
    }
    const canTunnel = can_tunnel_basic(mtmp);
    const candidates = [];
    const maxx = Math.min(omx + 1, 79);
    const maxy = Math.min(omy + 1, 20);
    for (let nx = Math.max(1, omx - 1); nx <= maxx; nx++) {
        for (let ny = Math.max(0, omy - 1); ny <= maxy; ny++) {
            if (nx === omx && ny === omy) continue;
            if (no_diagonal_movement(mtmp) && nx !== omx && ny !== omy) continue;
            // C ref: mon.c:mfndpos() rejects diagonal movement from or into
            // any door state except no-door/broken-door.
            if (nx !== omx && ny !== omy
                && (door_blocks_diagonal(omx, omy) || door_blocks_diagonal(nx, ny))) {
                continue;
            }
            const tunnel = can_tunnel_at_basic(mtmp, nx, ny);
            if (!tunnel && !can_mon_step(mtmp, nx, ny)) continue;
            candidates.push({ x: nx, y: ny, tunnel });
        }
    }
    if (!candidates.length) return MMOVE_NOTHING;

    let nix = omx;
    let niy = omy;
    let digTunnel = false;
    let nidist = dist2(nix, niy, ggx, ggy);
    let chcnt = 0;
    let moved = false;
    const jcnt = Math.min(MTSZ, candidates.length - 1, mtmp.mtrack?.length || 0);

    candidateLoop:
    for (const cand of candidates) {
        if (appr !== 0) {
            for (let j = 0; j < jcnt; j++) {
                const trk = mtmp.mtrack[j];
                if (cand.x === trk.x && cand.y === trk.y) {
                    const denom = 4 * (candidates.length - j);
                    if (rn2(denom)) {
                        continue candidateLoop;
                    }
                }
            }
        }

        const ndist = dist2(cand.x, cand.y, ggx, ggy);
        const nearer = ndist < nidist;
        if ((appr === 1 && nearer)
            || (appr === -1 && !nearer)
            || (appr === 0 && !rn2(++chcnt))
            || (appr === -2
                && ((ndist <= preferredrange_min && !nearer)
                    || (ndist >= preferredrange_max && nearer)))
            || !moved) {
            nix = cand.x;
            niy = cand.y;
            digTunnel = !!cand.tunnel;
            nidist = ndist;
            moved = true;
        }
    }

    if (!moved || (nix === omx && niy === omy)) return MMOVE_NOTHING;
    if (nix === game.u?.ux && niy === game.u?.uy) {
        mtmp.mux = game.u.ux;
        mtmp.muy = game.u.uy;
        return MMOVE_NOTHING;
    }
    if (digTunnel && m_digweapon_check_basic(mtmp, nix, niy)) return MMOVE_DONE;
    const engulfingHero = game.u?.uswallow && game.u?.ustuck === mtmp;
    mtmp.mx = nix;
    mtmp.my = niy;
    if (canTunnel && may_dig_basic(nix, niy)) {
        rnd(12); // C ref: dig.c:mdig_tunnel() pile amount.
        const loc = game.level?.at(nix, niy);
        if (digTunnel && loc && !SPACE_POS(loc.typ)) loc.typ = ROOM;
    }
    if (engulfingHero) {
        game.u.ux0 = game.u.ux;
        game.u.uy0 = game.u.uy;
        game.u.ux = nix;
        game.u.uy = niy;
        game.vision_full_recalc = 1;
    }
    mon_track_add(mtmp, omx, omy);
    const previousWarningRng = game._monster_move_warning_rng_active;
    game._monster_move_warning_rng_active = true;
    let doorStatus;
    try {
        newsym(omx, omy);
        doorStatus = postmove_door_basic(mtmp);
        if (doorStatus !== MMOVE_DIED) {
            if (game._swallowed_expulsion_paused_for_more) {
                game._swallowed_expulsion_paused_for_more = false;
            } else {
                // C ref: monmove.c:postmov() redraws the moved monster's
                // current square after trap/door handling, before pickup.
                newsym(mtmp.mx, mtmp.my);
            }
        }
    } finally {
        game._monster_move_warning_rng_active = previousWarningRng;
    }
    if (doorStatus === MMOVE_DIED) return MMOVE_DIED;
    if (await mpickstuff_basic(mtmp)) {
        maybe_spin_web_basic(mtmp);
        return MMOVE_DONE;
    }
    maybe_spin_web_basic(mtmp);
    return doorStatus;
}

function m_everyturn_effect(mtmp) {
    if (mtmp.data?.name === 'FOG_CLOUD') {
        if (visible_gas_region_at(mtmp.mx, mtmp.my)) return;
        const ttl = 4 + rn2(3); // create_gas_cloud(..., 1, 0) TTL via rn1(3, 4)
        game.level.gasClouds = game.level.gasClouds || [];
        game.level.gasClouds.push({ x: mtmp.mx, y: mtmp.my, ttl });
    }
}

function visible_gas_region_at(x, y) {
    return (game.level?.gasClouds || []).some((region) =>
        region.ttl >= 0 && region.x === x && region.y === y);
}

function age_gas_clouds() {
    const clouds = game.level?.gasClouds;
    if (!clouds?.length) return;
    const fogs = (game.level?.monsters || []).filter((mon) => mon.data?.name === 'FOG_CLOUD');
    const survivors = [];
    for (const cloud of clouds) {
        if (cloud.ttl === 0) continue;
        if (cloud.ttl > 0) cloud.ttl--;
        if (cloud.ttl >= 0 && cloud.ttl < 20
            && fogs.some((mon) => mon.mx === cloud.x && mon.my === cloud.y)) {
            cloud.ttl += 5;
        }
        survivors.push(cloud);
    }
    game.level.gasClouds = survivors;
}

function were_change(mtmp) {
    const flags = mtmp.data?.mflags2 ?? 0;
    if (!(flags & M2_WERE)) return;
    const fullMoon = game.flags?.moonphase === 4; // FULL_MOON
    const atNight = !!game.iflags?.at_night;
    if (flags & M2_HUMAN) {
        const denom = atNight ? (fullMoon ? 3 : 30) : (fullMoon ? 10 : 50);
        if (!rn2(denom)) {
            // new_were() state transformation is still future work; this
            // preserves the turn-boundary RNG ownership for unchanged rolls.
        }
    } else if (!rn2(30)) {
        // See note above.
    }
}

function vampire_shifter_base(ptr) {
    return ptr?.name === 'VAMPIRE'
        || ptr?.name === 'VAMPIRE_LORD'
        || ptr?.name === 'VLAD_THE_IMPALER';
}

function shapeshift_pool_or_lava(mon) {
    const typ = game.level?.at(mon.mx, mon.my)?.typ;
    return typ != null && (IS_POOL(typ) || IS_LAVA(typ));
}

function pick_vampire_shape(mon) {
    const cham = mon?.cham;
    let ptr = cham;
    let wolfchance = 10;
    if (cham?.name === 'VLAD_THE_IMPALER') wolfchance = 3;
    if ((cham?.name === 'VLAD_THE_IMPALER' || cham?.name === 'VAMPIRE_LORD')
        && !rn2(wolfchance) && !shapeshift_pool_or_lava(mon)) {
        ptr = monsterPtr('WOLF');
    } else if (vampire_shifter_base(cham)) {
        ptr = !rn2(4) ? monsterPtr('FOG_CLOUD') : monsterPtr('VAMPIRE_BAT');
    }
    if (ptr && mon.data?.name !== cham?.name && !rn2(4)) return cham;
    return ptr;
}

function apply_newcham_basic(mon, ptr) {
    if (!mon || !ptr || mon.data?.name === ptr.name) return false;
    if (!ptr.male && !ptr.female && !ptr.neuter) rn2(10);
    const monState = newmonhp_state_for(ptr);
    mon.data = { ...ptr, mmove: ptr.mmove ?? 12 };
    mon.ch = MONSTER_SYMBOLS[ptr.mlet] ?? mon.ch ?? 'm';
    mon.color = ptr.color ?? mon.color ?? 15;
    mon.m_lev = monState.level;
    mon.mhp = monState.hp;
    mon.mhpmax = monState.hp;
    return true;
}

function decide_to_shapeshift_basic(mon) {
    if (!vampire_shifter_base(mon?.cham)) return;
    if (mon.data?.mlet !== 'S_VAMPIRE') {
        let ptr = null;
        let change = false;
        if (mon.mhp <= Math.trunc(((mon.mhpmax ?? 0) + 5) / 6) && rn2(4)) {
            ptr = mon.cham;
            change = true;
        } else if (mon.data?.name === 'FOG_CLOUD'
                   && mon.mhp === mon.mhpmax
                   && !rn2(4)
                   && (!cansee(mon.mx, mon.my) || dist2(mon.mx, mon.my, game.u?.ux ?? 0, game.u?.uy ?? 0) > BOLT_LIM * BOLT_LIM)) {
            ptr = pick_vampire_shape(mon);
            change = !!ptr && ptr.name !== mon.data?.name;
        }
        if (change) apply_newcham_basic(mon, ptr);
    } else if (mon.mhp >= Math.trunc(9 * (mon.mhpmax ?? 0) / 10)
               && !rn2(6)
               && (!cansee(mon.mx, mon.my) || dist2(mon.mx, mon.my, game.u?.ux ?? 0, game.u?.uy ?? 0) > BOLT_LIM * BOLT_LIM)) {
        const ptr = pick_vampire_shape(mon);
        if (ptr) apply_newcham_basic(mon, ptr);
    }
}

function webmaker_basic(mtmp) {
    return mtmp.data?.name === 'CAVE_SPIDER' || mtmp.data?.name === 'GIANT_SPIDER';
}

function trap_at_basic(x, y) {
    return (game.level?.traps || []).find((trap) => trap.tx === x && trap.ty === y) || null;
}

function count_traps_basic(ttyp) {
    return (game.level?.traps || []).filter((trap) => trap.ttyp === ttyp).length;
}

function holds_up_web_basic(x, y) {
    if (!isok(x, y)) return true;
    const loc = game.level?.at(x, y);
    if (!loc) return true;
    if (IS_OBSTRUCTED(loc.typ) || loc.typ === IRONBARS) return true;
    if (loc.typ === STAIRS || loc.typ === LADDER) {
        const stair = (game.level?.stairs || []).find((st) => st.sx === x && st.sy === y);
        if (stair?.up) return true;
    }
    return false;
}

function count_webbing_walls_basic(x, y) {
    return (holds_up_web_basic(x, y - 1) ? 1 : 0)
        + (holds_up_web_basic(x + 1, y) ? 1 : 0)
        + (holds_up_web_basic(x, y + 1) ? 1 : 0)
        + (holds_up_web_basic(x - 1, y) ? 1 : 0);
}

function is_sokoban_level_basic() {
    const dnum = game.u?.uz?.dnum;
    return !!game.level?.flags?.sokoban_rules || game.dungeons?.[dnum]?.dname === 'Sokoban';
}

function soko_allow_web_basic(mtmp) {
    if (!is_sokoban_level_basic()) return true;
    const up = (game.level?.stairs || []).find((st) => st.up);
    return !!up && clear_path(mtmp.mx, mtmp.my, up.sx, up.sy);
}

function maybe_spin_web_basic(mtmp) {
    // C ref: monmove.c:maybe_spin_web().  The roll is made after the
    // monster movement/attack phase and only for active webmakers on
    // trap-free squares.
    if (!webmaker_basic(mtmp) || mtmp.mcanmove === 0 || mtmp.msleeping
        || mtmp.mfrozen || mtmp.mspec_used || trap_at_basic(mtmp.mx, mtmp.my)
        || !soko_allow_web_basic(mtmp)) {
        return;
    }
    const prob = (((mtmp.data?.name === 'GIANT_SPIDER' ? 15 : 5)
        * (count_webbing_walls_basic(mtmp.mx, mtmp.my) + 1))
        - (3 * count_traps_basic(WEB)));
    if (rn2(1000) < prob) {
        const trap = { ttyp: WEB, tx: mtmp.mx, ty: mtmp.my, tseen: false, once: false, launch: { x: 0, y: 0 } };
        if (!game.level.traps) game.level.traps = [];
        game.level.traps.push(trap);
        mtmp.mspec_used = d(4, 4);
        if (cansee(mtmp.mx, mtmp.my)) trap.tseen = true;
    }
}

export function mcalcdistress() {
    for (const mtmp of game.level?.monsters || []) {
        if (mtmp.mspec_used) mtmp.mspec_used--;
        if (mtmp.cham) decide_to_shapeshift_basic(mtmp);
        were_change(mtmp);
        if (mtmp.mfrozen && --mtmp.mfrozen <= 0) {
            mtmp.mfrozen = 0;
            mtmp.mcanmove = 1;
        }
    }
}

export async function movemon() {
    const g = game;
    let somebody_can_move = !!g._resume_somebody_can_move;
    g._resume_somebody_can_move = false;

    if (g._resume_tame_post_distfleeck) {
        distfleeck(g._resume_tame_post_distfleeck);
        g._resume_tame_post_distfleeck = null;
    }
    const resumeAfter = g._resume_movemon_after_mon || null;
    let skippingResumedPrefix = !!resumeAfter;
    g._resume_movemon_after_mon = null;

    // C ref: mon.c:iter_mons_safe() snapshots fmon before the movement
    // pass so removals or insertions during combat do not shift ownership
    // of later monsters' turns.
    const monsters = [...(g.level.monsters || [])];
    for (const mtmp of monsters) {
        if (skippingResumedPrefix) {
            if (mtmp === resumeAfter) skippingResumedPrefix = false;
            continue;
        }
        if (!g.level.monsters?.includes(mtmp)) continue;
        // C ref: mon.c:movemon_singlemon() runs this before the movement
        // budget check, so zero-budget fog clouds still leave vapor.
        m_everyturn_effect(mtmp);
        if (mtmp.movement < NORMAL_SPEED) continue;

        mtmp.movement -= NORMAL_SPEED;
        if (mtmp.movement >= NORMAL_SPEED) somebody_can_move = true;

        if (mtmp.misc_worn_check & I_SPECIAL) {
            const targetX = mtmp.mux ?? game.u?.ux ?? mtmp.mx;
            const targetY = mtmp.muy ?? game.u?.uy ?? mtmp.my;
            if (mtmp.mpeaceful || mtmp.mtame || dist2(mtmp.mx, mtmp.my, targetX, targetY) > 9) {
                mtmp.misc_worn_check &= ~I_SPECIAL;
                const oldworn = mtmp.misc_worn_check;
                m_dowear_basic(mtmp, false);
                if (mtmp.misc_worn_check !== oldworn || mtmp.mcanmove === 0) continue;
            }
        }

        // C ref: monmove.c:dochug() returns before distfleeck() for frozen,
        // waiting, or still-sleeping monsters. Disturb/wake-up RNG is not
        // modeled yet, so sleeping monsters spend movement without movement
        // AI until that front door is ported.
        if (mtmp.mcanmove === 0 || mtmp.msleeping) continue;
        if (is_hider(mtmp)
            && (mtmp.m_ap_type === M_AP_FURNITURE
                || mtmp.m_ap_type === M_AP_OBJECT
                || mtmp.mundetected)) {
            continue;
        }

        // C ref: monmove.c:dochug().  Awake movable monsters scuff any
        // engraving underfoot before status recovery and movement AI.
        wipe_engr_at_basic(mtmp.mx, mtmp.my, 1, false);

        // C ref: monmove.c:dochug().  Confusion and stun recovery happen
        // before targeting, fleeing, or ordinary movement.
        if (mtmp.mconf && !rn2(50)) mtmp.mconf = 0;
        if (mtmp.mstun && !rn2(10)) mtmp.mstun = 0;

        // dochugw -> dochug
        set_apparxy_basic(mtmp);
        const fleeState = distfleeck(mtmp); // consuming rn2(5)
        if (!mtmp.mtame && maybe_wield_hth_before_move(mtmp, fleeState)) continue;

        // C ref: monmove.c:dochug() delegates tame monsters to
        // dogmove.c:dog_move() after the shared distfleeck() phase.
        if (mtmp.mtame) {
            if (is_wanderer(mtmp) && monnear_hero(mtmp)) rn2(4);
            await dog_move(mtmp, false);
            if (g._more && g._pet_combat_more_latched && !g._savelife_resume_active && !hallucinating()) {
                if ((!g._after_more_message || !g._after_more_message.includes('  '))
                    && !/ engulfs you!$/.test(g._after_more_message || ''))
                    g._after_more_needs_prompt = false;
                g._resume_tame_post_distfleeck = mtmp;
                g._resume_movemon_after_mon = mtmp;
                g._resume_somebody_can_move = mtmp.movement >= NORMAL_SPEED;
                g._pet_combat_resume_active = true;
                g._monster_turn_paused_for_more = true;
                return false;
            }
            distfleeck(mtmp);
        } else {
            let postMoveState = fleeState;
            let moveStatus = 0;
            if (non_tame_movement_opportunity(mtmp, fleeState)) {
                moveStatus = maybe_cast_undirected_spell_before_move(mtmp) ? MMOVE_DONE : await m_move_basic(mtmp);
                if (moveStatus === MMOVE_DIED) continue;
                // C calls distfleeck() again after m_move() returns for ordinary
                // movement, even when the monster is off-screen.
                postMoveState = distfleeck(mtmp);
            }
            if ((moveStatus !== MMOVE_MOVED && moveStatus !== MMOVE_DONE)
                || (moveStatus === MMOVE_MOVED && can_attack_after_move_basic(mtmp, postMoveState))) {
                await mattacku_basic(mtmp, postMoveState);
                if (g._swallowed_damage_more_latched && g._more) {
                    g._swallowed_damage_more_latched = false;
                    g._resume_movemon_after_mon = mtmp;
                    g._resume_somebody_can_move = mtmp.movement >= NORMAL_SPEED;
                    g._monster_turn_paused_for_more = true;
                    g._swallowed_damage_more_waiting = true;
                    return false;
                }
                if (g._pending_swallowed_display_clear && g._more) {
                    g._resume_movemon_after_mon = mtmp;
                    g._resume_somebody_can_move = mtmp.movement >= NORMAL_SPEED;
                    g._monster_turn_paused_for_more = true;
                    g._swallowed_expulsion_paused_for_more = true;
                    return false;
                }
                if (g._monster_attack_more_latched && g._more) {
                    // C ref: topl.c:more()/pline_mon(). A queued monster-hit
                    // More only interrupts immediately when dismissing it must
                    // expose a delayed side-effect pline. Otherwise it remains
                    // on the topline while later map updates in the same monster
                    // pass can happen; the next pline or input-boundary flush
                    // services the More.
                    g._monster_attack_more_latched = false;
                    if (g._after_more_message) {
                        g._resume_movemon_after_mon = mtmp;
                        g._resume_somebody_can_move = mtmp.movement >= NORMAL_SPEED;
                        g._monster_turn_paused_for_more = true;
                        g._monster_attack_more_waiting = true;
                        return false;
                    }
                    g._hallucination_warning_rng_active = true;
                }
                if (g._fatal_monster_attack_paused && g._monster_turn_paused_for_more
                    && g._more && !hallucinating()) {
                    g._resume_turn_tail_after_more = true;
                    return false;
                }
                if (g._pet_combat_resume_active && g._more && !hallucinating()) {
                    g._pet_combat_resume_active = false;
                    g._resume_movemon_after_mon = mtmp;
                    g._resume_somebody_can_move = mtmp.movement >= NORMAL_SPEED;
                    g._monster_turn_paused_for_more = true;
                    return false;
                }
            }
        }
    }

    // C ref: allmain.c:run_regions() ages regions after the monster
    // movement loop for the turn, not before m_everyturn_effect() can see
    // regions created on previous passes.
    if (!somebody_can_move && g._gas_clouds_aged_turn !== g.moves) {
        age_gas_clouds();
        g._gas_clouds_aged_turn = g.moves;
    }

    const packedDeathAndHit = /^The .+ is killed!  The .+ .+!$/.test(g._pending_message || '');
    if ((!somebody_can_move || packedDeathAndHit) && g._packed_monster_more_candidate
        && g._more && !g._pet_combat_more_latched && !hallucinating()) {
        g._more = false;
        g._more_dismissals_remaining = 0;
    }
    g._packed_monster_more_candidate = false;

    return somebody_can_move;
}
