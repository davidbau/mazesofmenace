import { game } from './gstate.js';
import { d, rn2, rnd } from './rng.js';
import { dog_move } from './dog.js';
import { enexto_core } from './mklev.js';
import { OBJECT_CLASS, OBJECT_DIR } from './object_data.js';
import {
    D_BROKEN, D_CLOSED, D_ISOPEN, D_LOCKED, D_NODOOR, D_TRAPPED,
    IS_DOOR, IS_LAVA, IS_OBSTRUCTED, IS_POOL, IS_STWALL, IS_WATERWALL,
    I_SPECIAL, M_AP_FURNITURE, M_AP_OBJECT,
    NEED_HTH_WEAPON, NEED_RANGED_WEAPON, NEED_WEAPON, W_WEP,
    GP_CHECKSCARY, W_NONPASSWALL,
    isok, SPACE_POS,
} from './const.js';
import { newsym, queue_more_prompt } from './display.js';
import { clear_path } from './vision.js';
import { m_dowear_basic } from './mon_wear.js';

const NORMAL_SPEED = 12;
const BOLT_LIM = 8;
const M2_WERE = 0x00000004;
const M2_HUMAN = 0x00000008;
const M2_WANDER = 0x00800000;
const M1_FLY = 0x00000001;
const M1_SWIM = 0x00000002;
const M1_WALLWALK = 0x00000008;
const M1_HIDE = 0x00000100;
const M1_NOHANDS = 0x00002000;
const M1_MINDLESS = 0x00010000;
const M1_ANIMAL = 0x00040000;
const M2_STRONG = 0x04000000;
const M2_COLLECT = 0x40000000;
const M2_MAGIC = 0x80000000;
const MTSZ = 4;
const MSLOW = 1;
const MFAST = 2;
const MMOVE_NOTHING = 0;
const MMOVE_MOVED = 1;
const MMOVE_DIED = 2;
const MMOVE_DONE = 3;
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
const WAN_POLYMORPH = 422;
const WAN_TELEPORTATION = 424;
const WAN_DIGGING = 428;
const BASIC_MELEE_ATTACKS = new Set(['AT_CLAW', 'AT_KICK', 'AT_BITE', 'AT_STNG', 'AT_TUCH', 'AT_BUTT', 'AT_TENT']);

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
    if (x === game.u?.ux && y === game.u?.uy) return false;
    if (mon_at(x, y, mtmp)) return false;
    return mfndpos_terrain_ok(mtmp, x, y);
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

function hth_weapon_candidate(mtmp) {
    return (mtmp.inventory || []).find((obj) => object_class(obj) === WEAPON_CLASS);
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

function mpickstuff_basic(mtmp) {
    const pile = objects_at(mtmp.mx, mtmp.my);
    for (const obj of pile) {
        if (!mon_would_take_item(mtmp, obj) || can_carry(mtmp, obj) <= 0) continue;
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

function attack_is_basic_physical(attack) {
    if (!attack) return true;
    const [aatyp, adtyp, damn, damd] = attack;
    return BASIC_MELEE_ATTACKS.has(aatyp)
        && adtyp === 'AD_PHYS'
        && damn > 0
        && damd > 0;
}

function basic_physical_attacks(mtmp) {
    const attacks = mtmp.data?.mattk || [];
    if (!attacks.filter(Boolean).length) return null;
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

function unstuck_swallowed_hero(mtmp) {
    if (!game.u?.uswallow || game.u.ustuck !== mtmp) return;
    game.u.uswallow = false;
    game.u.ustuck = null;
    game.u.uswldtim = 0;
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
}

function engulf_attack(mtmp, attack, toHit) {
    const [, adtyp, damn, damd] = attack;
    const alreadySwallowed = game.u?.uswallow && game.u?.ustuck === mtmp;
    if (!alreadySwallowed && !(toHit > rnd(20))) return true;
    let damage = d(damn, damd);
    if (!alreadySwallowed) {
        game.u.uswallow = true;
        game.u.ustuck = mtmp;
        mtmp.mx = game.u.ux;
        mtmp.my = game.u.uy;
        game.u.uswldtim = Math.max(2, rnd(monster_level(mtmp) + 5));
    }
    if ((game.u.uswldtim || 0) > 0) {
        game.u.uswldtim--;
    }

    switch (adtyp) {
    case 'AD_COLD':
    case 'AD_FIRE':
    case 'AD_ELEC':
        if (mtmp.mcan || !rn2(2)) damage = 0;
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
        unstuck_swallowed_hero(mtmp);
    }
    return true;
}

function physical_melee_attacks(mtmp, attacks, toHit) {
    for (let i = 0; i < attacks.length; i++) {
        const attack = attacks[i];
        if (!attack) continue;
        const [, adtyp, damn, damd] = attack;
        if (toHit > rnd(20 + i)) {
            let damage = d(damn, damd);
            damage = elemental_hit_side_effects(mtmp, adtyp, damage);
            mhitm_knockback_frontdoor();
            damage = reduce_damage_by_negative_ac(damage);
            apply_hero_damage(damage);
            if ((game.u?.uhp ?? 0) <= 0) break;
        }
    }
    return true;
}

function mattacku_basic(mtmp, state) {
    if (game.u?.uswallow && game.u?.ustuck !== mtmp) return false;
    const rangeWeapon = state?.inrange && !state.nearby && mon_has_attack_type(mtmp, 'AT_WEAP');
    if ((!state?.nearby && !rangeWeapon) || state.scared || mtmp.mpeaceful || mtmp.mtame) return false;
    if ((game._occupation_turns_remaining || 0) > 1 || game._occupation_finish_uac != null) return false;
    if ((game.u?.uhp ?? 1) <= 0) return false;

    const cooldownAttack = cooldown_replacement_attack(mtmp);
    if (cooldownAttack) {
        if (game._hero_melee_message_pending && game._pending_message) queue_more_prompt();
        return physical_melee_attacks(mtmp, [cooldownAttack], mattacku_to_hit(mtmp));
    }
    const engulf = basic_engulf_attack(mtmp);
    const physical = engulf ? null : basic_physical_attacks(mtmp);
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
    return engulf ? engulf_attack(mtmp, engulf, toHit) : physical_melee_attacks(mtmp, physical, toHit);
}

function m_move_basic(mtmp) {
    // C ref: monmove.c:m_move().  This is a narrow ordinary-monster
    // movement skeleton: adjacent candidates, mtrack backtracking rolls, and
    // deterministic approach/flee selection.  Tunneling, most traps, full
    // attacks, and special monsters remain future subsystem work.
    const omx = mtmp.mx;
    const omy = mtmp.my;
    let ggx = mtmp.mux ?? game.u?.ux ?? omx;
    let ggy = mtmp.muy ?? game.u?.uy ?? omy;
    let appr = mtmp.mflee ? -1 : 1;
    // C ref: monmove.c:m_move().  While swallowed, bystander monsters
    // spend their movement opportunity without ordinary path selection.
    if (game.u?.uswallow && !mtmp.mflee && game.u?.ustuck !== mtmp) return 1;
    if (mtmp.mconf || (mtmp.mpeaceful && !mtmp.isshk)) appr = 0;
    if (appr === 1
        && (mtmp.data?.name === 'STALKER' || mtmp.data?.mlet === 'S_BAT' || mtmp.data?.mlet === 'S_LIGHT')
        && !rn2(3)) {
        appr = 0;
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
                return mpickstuff_basic(mtmp) ? MMOVE_DONE : MMOVE_NOTHING;
            }
            if (appr === -1) appr = 1;
        }
    }
    const candidates = [];
    const maxx = Math.min(omx + 1, 79);
    const maxy = Math.min(omy + 1, 20);
    for (let nx = Math.max(1, omx - 1); nx <= maxx; nx++) {
        for (let ny = Math.max(0, omy - 1); ny <= maxy; ny++) {
            if (nx === omx && ny === omy) continue;
            // C ref: mon.c:mfndpos() rejects diagonal movement from or into
            // any door state except no-door/broken-door.
            if (nx !== omx && ny !== omy
                && (door_blocks_diagonal(omx, omy) || door_blocks_diagonal(nx, ny))) {
                continue;
            }
            if (!can_mon_step(mtmp, nx, ny)) continue;
            candidates.push({ x: nx, y: ny });
        }
    }
    if (!candidates.length) return MMOVE_NOTHING;

    let nix = omx;
    let niy = omy;
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
            || !moved) {
            nix = cand.x;
            niy = cand.y;
            nidist = ndist;
            moved = true;
        }
    }

    if (!moved || (nix === omx && niy === omy)) return MMOVE_NOTHING;
    const engulfingHero = game.u?.uswallow && game.u?.ustuck === mtmp;
    mtmp.mx = nix;
    mtmp.my = niy;
    if (engulfingHero) {
        game.u.ux0 = game.u.ux;
        game.u.uy0 = game.u.uy;
        game.u.ux = nix;
        game.u.uy = niy;
        game.vision_full_recalc = 1;
    }
    mon_track_add(mtmp, omx, omy);
    newsym(omx, omy);
    newsym(nix, niy);
    const doorStatus = postmove_door_basic(mtmp);
    if (doorStatus === MMOVE_DIED) return MMOVE_DIED;
    if (mpickstuff_basic(mtmp)) return MMOVE_DONE;
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

export function mcalcdistress() {
    for (const mtmp of game.level?.monsters || []) {
        if (mtmp.mspec_used) mtmp.mspec_used--;
        were_change(mtmp);
        if (mtmp.mfrozen && --mtmp.mfrozen <= 0) {
            mtmp.mfrozen = 0;
            mtmp.mcanmove = 1;
        }
    }
}

export async function movemon() {
    const g = game;
    let somebody_can_move = false;

    // C ref: mon.c:iter_mons_safe() snapshots fmon before the movement
    // pass so removals or insertions during combat do not shift ownership
    // of later monsters' turns.
    const monsters = [...(g.level.monsters || [])];
    for (const mtmp of monsters) {
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

        // C ref: monmove.c:dochug().  Awake movable monsters roll confusion
        // and stun recovery before targeting, fleeing, or ordinary movement.
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
            dog_move(mtmp, false);
            distfleeck(mtmp);
        } else {
            let postMoveState = fleeState;
            let moveStatus = 0;
            if (non_tame_movement_opportunity(mtmp, fleeState)) {
                moveStatus = m_move_basic(mtmp);
                if (moveStatus === MMOVE_DIED) continue;
                // C calls distfleeck() again after m_move() returns for ordinary
                // movement, even when the monster is off-screen.
                postMoveState = distfleeck(mtmp);
            }
            if ((moveStatus !== MMOVE_MOVED && moveStatus !== MMOVE_DONE)
                || (moveStatus === MMOVE_MOVED && can_attack_after_move_basic(mtmp, postMoveState))) {
                mattacku_basic(mtmp, postMoveState);
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

    return somebody_can_move;
}
