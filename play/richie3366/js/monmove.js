// monmove.js — Monster AI movement (minimal RNG-faithful stubs).
// C ref: monmove.c — distfleeck, dochug, m_move, postmov, set_apparxy, mon_track_add.

import {
    is_wanderer, is_armed, passes_walls, nohands, verysmall,
    monsterNames, M1_SEE_INVIS, M1_AMORPHOUS, M1_NOTAKE, tunnels, needspick,
    can_track, likes_gold, likes_gems, likes_objs, likes_magic,
    throws_rocks, is_swimmer, likes_lava, mindless, is_animal, strongmonst, is_mercenary,
    mon_knows_traps, can_teleport, hides_under, webmaker, PM_GIANT_SPIDER,
    is_vampshifter, is_watch, is_mind_flayer, is_covetous,
    is_floater, is_flyer, amorphous, nolimbs, M1_SLITHY, MZ_SMALL,
} from './monsters.js';
import { gettrack } from './track.js';
import { wipe_engr_at } from './engrave.js';
import { objects_at, obj_extract_self, splitobj } from './mkobj.js';
import { find_defensive, use_defensive, find_misc, use_misc, find_offensive, searches_for_item } from './muse.js';
import { hero_conflict, resist_conflict } from './mondata.js';
import {
    mintrap,
    NO_TRAP_FLAGS,
    Trap_Killed_Mon,
    Trap_Moved_Mon,
    Trap_Caught_Mon,
    t_at,
    maketrap,
    count_traps,
} from './trap.js';
import { mattacku } from './mhitu.js';
import { mattackm } from './mhitm.js';
import { castmu, AD_SPEL, AD_CLRC } from './mcastu.js';
import { cansee, couldsee, vision_recalc, recalc_block_point, m_cansee } from './vision.js';
import {
    isok, ACCESSIBLE, IS_DOOR, IS_STWALL, IS_TREE, IS_OBSTRUCTED,
    D_CLOSED, D_LOCKED, D_ISOPEN, D_NODOOR,
    D_BROKEN, D_TRAPPED, D_WARNED, u_at, DISPLACED, Is_rogue_level, NOTONL,
    ALLOW_U, ALLOW_M, ALLOW_MDISP, ALLOW_ROCK,
    NEED_PICK_AXE, NEED_AXE, NEED_PICK_OR_AXE, NEED_WEAPON, NEED_HTH_WEAPON,
    P_AXE, P_PICK_AXE, W_WEP, SQSRCHRADIUS, COLNO, ROWNO, NATTK,
    MON_POLE_DIST, AKLYS_LIM, engulfing_u, M_AP_TYPE, M_AP_OBJECT,
    M_AP_FURNITURE,
    STRAT_WAITFORU, STRAT_WAITMASK, STRAT_CLOSE,
    Upolyd, OBJ_FLOOR, is_pit, Is_waterlevel,
    STAIRS, LADDER, IRONBARS, WEB,
    M_ATTK_HIT, M_ATTK_DEF_DIED, M_ATTK_AGR_DIED,
    MON_FLOOR, NORMAL_SPEED, G_GENOD, RLOC_MSG,
} from './const.js';
import { is_pool, is_lava, in_town, stop_occupation, noattacks } from './hack.js';
import {
    CLOAK_OF_DISPLACEMENT, COIN_CLASS, WEAPON_CLASS, ARMOR_CLASS,
    GEM_CLASS, FOOD_CLASS, AMULET_CLASS, POTION_CLASS, SCROLL_CLASS,
    WAND_CLASS, RING_CLASS, SPBOOK_CLASS, ROCK_CLASS, BALL_CLASS,
    objectNames,
} from './objects.js';
import { Monnam, y_monnam } from './do_name.js';
import { doname, distant_name, ansimpleoname } from './objnam.js';
import { mpickobj } from './makemon.js';
import { may_dig, mdig_tunnel } from './dig.js';
import { MON_WEP, mon_wield_item, select_rwep } from './weapon.js';
import { lined_up, m_has_launcher_and_ammo } from './mthrowu.js';
import { is_pole } from './wield.js';
import { acurrstr } from './attrib.js';
import { m_canseeu } from './mondata.js';
import { rloc, tele_restrict, noteleport_level } from './teleport.js';
import { quest_talk, quest_stat_check } from './quest.js';
import { stairway_at, u_on_newpos } from './mklev.js';
import { create_gas_cloud, visible_region_at, m_in_out_region } from './region.js';
import { check_gear_next_turn } from './worn.js';
import { picking_lock } from './lock.js';
import { newsym, pline, canseemon as display_canseemon } from './display.js';
import { dog_move, finish_meating } from './dogmove.js';
import { shk_move, gd_move, pri_move } from './shk.js';
import { tactics } from './wizard.js';
import { rn2, rnd, d } from './rng.js';
import { game } from './gstate.js';
import {
    dist2,
    distmin,
    monnear,
    mon_allowflags,
    mfndpos,
    m_at,
    m_avoid_kicked_loc,
    mnexto,
} from './mon.js';

const CREDIT_CARD = objectNames.indexOf('CREDIT_CARD');
const SKELETON_KEY = objectNames.indexOf('SKELETON_KEY');
const LOCK_PICK = objectNames.indexOf('LOCK_PICK');
const GOLD_PIECE = objectNames.indexOf('GOLD_PIECE');
const STRANGE_OBJECT = objectNames.indexOf('STRANGE_OBJECT');
const ROCK = objectNames.indexOf('ROCK');
const BOULDER = objectNames.indexOf('BOULDER');
const CORPSE = objectNames.indexOf('CORPSE');
const AKLYS = objectNames.indexOf('AKLYS');
const PM_STALKER = monsterNames.indexOf('PM_STALKER');
const PM_TENGU = monsterNames.indexOf('PM_TENGU');
const PM_LEPRECHAUN = monsterNames.indexOf('PM_LEPRECHAUN');
const PM_ETTIN = monsterNames.indexOf('PM_ETTIN');
const PM_JABBERWOCK = monsterNames.indexOf('PM_JABBERWOCK');
const PM_FOG_CLOUD = monsterNames.indexOf('PM_FOG_CLOUD');
const PM_HEZROU = monsterNames.indexOf('PM_HEZROU');
const PM_STEAM_VORTEX = monsterNames.indexOf('PM_STEAM_VORTEX');
const GEMSTONE = 20; // objclass.h
const MINERAL = 21; // objclass.h
const MAX_CARR_CAP = 1000;
const MZ_HUMAN = 3;
const WT_HUMAN = 1450;
const MTSZ = 4;
const BOLT_LIM = 8;
const MMOVE_NOTHING = 0;
const MMOVE_MOVED = 1;
const MMOVE_DIED = 2;
const MMOVE_DONE = 3;
const MMOVE_NOMOVES = 4;
const AT_ENGL = 11; // monattk.h
const AT_SPIT = 10;
const AT_BREA = 12;
const AT_GAZE = 15;
const AT_MAGC = 255;

/** C ref: monst.h mon_offmap — mstate != MON_FLOOR */
export function mon_offmap(mon) {
    return ((mon?.mstate | 0) !== MON_FLOOR);
}

/** C ref: monst.h is_obj_mappear */
function is_obj_mappear(mon, otyp) {
    return M_AP_TYPE(mon) === M_AP_OBJECT && mon?.mappearance === otyp;
}

/** C ref: steal.c findgold — first GOLD_PIECE on chain (no container walk). */
function findgold(argchain) {
    let chain = argchain;
    while (chain && chain.otyp !== GOLD_PIECE) chain = chain.nobj;
    return chain || null;
}

/**
 * C ref: monmove.c leppie_avoidance — leprechaun flees if richer than hero.
 */
function leppie_avoidance(mtmp) {
    if ((mtmp.data?.mndx ?? -1) !== PM_LEPRECHAUN) return false;
    const lepgold = findgold(mtmp.minvent);
    if (!lepgold) return false;
    const ygold = findgold(game.invent);
    const yquan = ygold ? (ygold.quan | 0) : 0;
    return (lepgold.quan | 0) > yquan;
}

// C ref: monmove.c practical[] / magical[] for mon_would_take_item
const PRACTICAL_CLASSES = [WEAPON_CLASS, ARMOR_CLASS, GEM_CLASS, FOOD_CLASS];
const MAGICAL_CLASSES = [
    AMULET_CLASS, POTION_CLASS, SCROLL_CLASS, WAND_CLASS, RING_CLASS, SPBOOK_CLASS,
];
const PM_GELATINOUS_CUBE = monsterNames.indexOf('PM_GELATINOUS_CUBE');

/** C ref: mon.c curr_mon_load */
function curr_mon_load(mtmp) {
    let curload = 0;
    for (let obj = mtmp.minvent; obj; obj = obj.nobj) {
        if (obj.otyp !== BOULDER || !throws_rocks(mtmp.data)) {
            curload += obj.owt || 0;
        }
    }
    return curload;
}

/** C ref: mon.c max_mon_load */
function max_mon_load(mtmp) {
    const ptr = mtmp.data;
    const cwt = ptr?.cwt ?? 0;
    const msize = ptr?.msize ?? 2;
    let maxload;
    if (!cwt) {
        maxload = Math.trunc((MAX_CARR_CAP * msize) / MZ_HUMAN);
    } else if (!strongmonst(ptr) || cwt > WT_HUMAN) {
        maxload = Math.trunc((MAX_CARR_CAP * cwt) / WT_HUMAN);
    } else {
        maxload = MAX_CARR_CAP;
    }
    if (!strongmonst(ptr)) maxload = Math.trunc(maxload / 2);
    return Math.max(1, maxload);
}

/**
 * C ref: mon.c can_touch_safely — corpse petrify/rider + silver/artifact
 * deferred as always-safe except rider/petrify corpse stubs.
 */
function can_touch_safely(_mtmp, otmp) {
    if (!otmp) return false;
    // touch_petrifies / is_rider / silver / touch_artifact named omissions
    return true;
}

/**
 * C ref: mon.c can_carry — returns max quan the monster may take.
 * quan>1 → return 1 only for M1_NOHANDS non-glompers (dragons gold/gems
 * and AT_ENGL engulfer exceptions). Hands monsters take the full stack
 * when weight allows (D-0186).
 */
function can_carry(mtmp, otmp) {
    if (!mtmp || !otmp) return 0;
    const mdat = mtmp.data;
    if ((mdat?.mflags1 ?? 0) & M1_NOTAKE) return 0;
    if (!can_touch_safely(mtmp, otmp)) return 0;

    // C: huge quan clamp via rn2 deferred; ordinary stacks fit in int
    const iquan = otmp.quan || 1;
    if (iquan > 1) {
        let glomper = false;
        if (mdat?.mlet === 'S_DRAGON'
            && (otmp.oclass === COIN_CLASS || otmp.oclass === GEM_CLASS)) {
            glomper = true;
        } else {
            const mattk = mdat?.mattk || [];
            for (let nattk = 0; nattk < NATTK; nattk++) {
                if (mattk[nattk]?.aatyp === AT_ENGL) {
                    glomper = true;
                    break;
                }
            }
        }
        if (nohands(mdat) && !glomper) return 1;
    }

    if (mtmp === game.u?.usteed) return 0;
    if (mtmp.isshk) return iquan;
    // C: peaceful non-pets refuse loot
    if (mtmp.mpeaceful && !mtmp.mtame) return 0;

    if (throws_rocks(mdat) && otmp.otyp === BOULDER) return iquan;
    if (mdat?.mlet === 'S_NYMPH') {
        return otmp.oclass === ROCK_CLASS ? 0 : iquan;
    }

    const newload = otmp.owt || 0;
    if (curr_mon_load(mtmp) + newload > max_mon_load(mtmp)) return 0;
    return iquan;
}

/**
 * C ref: monmove.c mon_would_take_item
 * Named omissions: uball/uchain; unicorn GEMSTONE material gate partial
 * (mlet check only); FOOD searches_for_item corpse/tin/egg arms.
 */
function mon_would_take_item(mtmp, otmp) {
    const ptr = mtmp.data;
    const pctload = Math.trunc((curr_mon_load(mtmp) * 100) / max_mon_load(mtmp));
    if (mtmp.mtame && otmp.cursed) return false;
    // C: is_unicorn && oc_material != GEMSTONE
    if (ptr?.mlet === 'S_UNICORN') {
        const mat = game.objects?.[otmp.otyp]?.oc_material ?? 0;
        if (mat !== GEMSTONE) return false;
    }
    if (!mindless(ptr) && !is_animal(ptr) && pctload < 75
        && searches_for_item(mtmp, otmp)) {
        return true;
    }
    if (likes_gold(ptr) && otmp.otyp === GOLD_PIECE && pctload < 95) return true;
    const mat = game.objects?.[otmp.otyp]?.oc_material ?? 0;
    if (likes_gems(ptr) && otmp.oclass === GEM_CLASS
        && mat !== MINERAL && pctload < 85) {
        return true;
    }
    if (likes_objs(ptr) && PRACTICAL_CLASSES.includes(otmp.oclass)
        && pctload < 75) {
        return true;
    }
    if (likes_magic(ptr) && MAGICAL_CLASSES.includes(otmp.oclass)
        && pctload < 85) {
        return true;
    }
    if (throws_rocks(ptr) && otmp.otyp === BOULDER && pctload < 50
        && !game.sokoban && !game.level?.flags?.sokoban) {
        return true;
    }
    if ((ptr?.mndx ?? -1) === PM_GELATINOUS_CUBE
        && otmp.oclass !== ROCK_CLASS && otmp.oclass !== BALL_CLASS) {
        return true;
    }
    return false;
}

/** C ref: monmove.c mon_would_consume_item — corpse_eater / pet food deferred. */
function mon_would_consume_item(_mtmp, _otmp) {
    return false;
}

/**
 * C ref: dogmove.c could_reach_item — pool/lava/boulder gates.
 * Flyer-only arms N/A in C (D-0823 / D-0824).
 */
function could_reach_item(mon, nx, ny) {
    const ptr = mon?.data;
    if (is_pool(nx, ny) && !is_swimmer(ptr)) return false;
    if (is_lava(nx, ny) && !likes_lava(ptr)) return false;
    if (BOULDER >= 0) {
        for (let obj = objects_at(nx, ny); obj; obj = obj.nexthere) {
            if ((obj.otyp | 0) === BOULDER && !throws_rocks(ptr)) return false;
        }
    }
    return true;
}

/**
 * C ref: mon.c mpickstuff — pick one wanted floor object underfoot.
 * Named omissions: shopkeeper inhishop; in_rooms shop rn2(25); is_mines_prize/
 * is_soko_prize; nymph/corpse specials.
 */
async function mpickstuff(mtmp) {
    if (mtmp.isshk) return false;
    // shop in_rooms + rn2(25) deferred (no shop rooms on Mines path)
    if (!could_reach_item(mtmp, mtmp.mx, mtmp.my)) return false;

    for (let otmp = objects_at(mtmp.mx, mtmp.my); otmp; otmp = otmp.nexthere) {
        // is_mines_prize / is_soko_prize deferred
        if (!mon_would_take_item(mtmp, otmp)) continue;
        if (otmp.otyp === CORPSE && mtmp.data?.mlet !== 'S_NYMPH') {
            // touch_petrifies / lizard / acidic corpse exceptions deferred
            continue;
        }
        if (!can_touch_safely(mtmp, otmp)) continue;
        const carryamt = can_carry(mtmp, otmp);
        if (carryamt === 0) continue;
        let otmp3 = otmp;
        if (carryamt !== (otmp.quan || 1)) {
            otmp3 = splitobj(otmp, carryamt) || otmp;
        }
        if (cansee(mtmp.mx, mtmp.my)) {
            // C mon.c mpickstuff: distant_name(otmp, doname) before extract —
            // far path suppresses observe so !dknown stays "a potion" (D-0840).
            const otmpname = distant_name(otmp, doname);
            if (game.flags?.verbose !== false) {
                await pline(`${Monnam(mtmp)} picks up ${otmpname}.`);
            }
        }
        obj_extract_self(otmp3);
        mpickobj(mtmp, otmp3);
        // C: mon.c mpickstuff — check_gear_next_turn after pickup
        check_gear_next_turn(mtmp);
        newsym(mtmp.mx, mtmp.my);
        return true;
    }
    return false;
}

/**
 * C ref: monmove.c m_search_items — redirect gg toward interesting floor loot.
 * Returns true → caller postmov(MMOVE_DONE) for underfoot claim (mpickstuff).
 * Named omissions: in_rooms shop rn2(25); hides_under; onscary; costly_spot
 * merchandise; is_mines_prize/is_soko_prize; helpless under-monster skip
 * beyond mcanmove/msleeping/mmove; can_touch_safely in search loop
 * (mpickstuff/can_carry still gates).
 */
function m_search_items(mtmp, gg) {
    let minr = SQSRCHRADIUS;
    const omx = mtmp.mx;
    const omy = mtmp.my;
    const ptr = mtmp.data;

    if (distmin(mtmp.mux, mtmp.muy, omx, omy) < SQSRCHRADIUS
        && !mtmp.mpeaceful) {
        minr--;
    }
    if (!mtmp.mpeaceful && is_mercenary(ptr)) minr = 1;

    // shop in_rooms + rn2(25) deferred (no shop rooms on Mines path)

    const hmx = Math.min(COLNO - 1, omx + minr);
    const hmy = Math.min(ROWNO - 1, omy + minr);
    const lmx = Math.max(1, omx - minr);
    const lmy = Math.max(0, omy - minr);

    for (let xx = lmx; xx <= hmx; xx++) {
        for (let yy = lmy; yy <= hmy; yy++) {
            let otmp = objects_at(xx, yy);
            if (!otmp) continue;
            if (minr < distmin(omx, omy, xx, yy)) continue;
            if (!could_reach_item(mtmp, xx, yy)) continue;
            // hides_under + cansee deferred
            const mtoo = m_at(xx, yy);
            if (mtoo && (
                !mtoo.mcanmove
                || mtoo.msleeping
                || mtoo.mundetected
                || (mtoo.mappearance && !mtoo.iswiz)
                || !(mtoo.data?.mmove)
            )) {
                continue;
            }
            // onscary deferred
            const ttmp = t_at(xx, yy);
            if (ttmp && mon_knows_traps(mtmp, ttmp.ttyp)) {
                if (gg.x === xx && gg.y === yy) {
                    gg.x = mtmp.mux;
                    gg.y = mtmp.muy;
                }
                continue;
            }
            if (!m_cansee(mtmp, xx, yy)) continue;
            // costly_spot merchandise skip deferred

            for (; otmp; otmp = otmp.nexthere) {
                if (otmp.otyp === ROCK) continue;
                // is_mines_prize / is_soko_prize deferred
                if ((mon_would_take_item(mtmp, otmp) && can_carry(mtmp, otmp) > 0)
                    || mon_would_consume_item(mtmp, otmp)) {
                    const ix = otmp.ox ?? xx;
                    const iy = otmp.oy ?? yy;
                    minr = distmin(omx, omy, xx, yy);
                    gg.x = ix;
                    gg.y = iy;
                    // C: underfoot → MMOVE_DONE → postmov → mpickstuff
                    if (ix === omx && iy === omy) return true;
                    break;
                }
            }
        }
    }

    if (minr < SQSRCHRADIUS && gg.appr === -1) {
        if (distmin(omx, omy, mtmp.mux, mtmp.muy) <= 3) {
            gg.x = mtmp.mux;
            gg.y = mtmp.muy;
        } else {
            gg.appr = 1;
        }
    }
    return false;
}

/** C ref: obj.h is_pick / is_axe — dig-tool skill predicates. */
function is_pick(obj) {
    if (!obj) return false;
    return (game.objects?.[obj.otyp]?.oc_skill ?? 0) === P_PICK_AXE;
}
function is_axe(obj) {
    if (!obj) return false;
    return (game.objects?.[obj.otyp]?.oc_skill ?? 0) === P_AXE;
}

function closed_door_at(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc || !IS_DOOR(loc.typ)) return false;
    return !!((loc.doormask || 0) & (D_CLOSED | D_LOCKED));
}

/** C ref: wield.c mwelded — cursed weapon stuck in hand. */
function mwelded(obj) {
    return !!(obj && obj.cursed && ((obj.owornmask || 0) & W_WEP));
}

/**
 * C ref: monmove.c m_digweapon_check — spend turn wielding dig tool if needed.
 * Returns true when the monster used this move to wield (no place/dig yet).
 */
async function m_digweapon_check(mtmp, nix, niy) {
    let can_tunnel = false;
    if (!Is_rogue_level(game.u?.uz)) can_tunnel = tunnels(mtmp.data);
    const mw_tmp = MON_WEP(mtmp);
    if (!(can_tunnel && needspick(mtmp.data) && !mwelded(mw_tmp)
        && (may_dig(nix, niy) || closed_door_at(nix, niy)))) {
        return false;
    }
    const here = game.level?.at(nix, niy);
    if (closed_door_at(nix, niy)) {
        // C: !mw_tmp || !is_pick || !is_axe (almost always sets for doors)
        if (!mw_tmp || !is_pick(mw_tmp) || !is_axe(mw_tmp)) {
            mtmp.weapon_check = NEED_PICK_OR_AXE;
        }
    } else if (here && IS_TREE(here.typ)) {
        if (!mw_tmp || !is_axe(mw_tmp)) mtmp.weapon_check = NEED_AXE;
    } else if (here && IS_STWALL(here.typ)) {
        if (!mw_tmp || !is_pick(mw_tmp)) mtmp.weapon_check = NEED_PICK_AXE;
    }
    if ((mtmp.weapon_check | 0) >= NEED_PICK_AXE
        && (await mon_wield_item(mtmp))) {
        return true;
    }
    return false;
}

// C monsters.h indices (not exported from monsters_data)
const PM_DISPLACER_BEAST = monsterNames.indexOf('PM_DISPLACER_BEAST');
const PM_XORN = monsterNames.indexOf('PM_XORN');

// C ref: monmove.c mon_track_add()
export function mon_track_add(mtmp, x, y) {
    if (!mtmp.mtrack) {
        mtmp.mtrack = [
            { x: 0, y: 0 },
            { x: 0, y: 0 },
            { x: 0, y: 0 },
            { x: 0, y: 0 },
        ];
    }
    for (let j = MTSZ - 1; j > 0; j--) {
        mtmp.mtrack[j] = { ...mtmp.mtrack[j - 1] };
    }
    mtmp.mtrack[0] = { x, y };
}

/** C ref: monmove.c mon_track_clear — zero mtrack (flee / rloc / whistle). */
export function mon_track_clear(mtmp) {
    if (!mtmp) return;
    if (!mtmp.mtrack) {
        mtmp.mtrack = [
            { x: 0, y: 0 },
            { x: 0, y: 0 },
            { x: 0, y: 0 },
            { x: 0, y: 0 },
        ];
        return;
    }
    for (let j = 0; j < MTSZ; j++) {
        mtmp.mtrack[j] = { x: 0, y: 0 };
    }
}

/** C ref: invent.c money_cnt — sum COIN_CLASS quan. */
function money_cnt(invent) {
    let sum = 0;
    for (const o of invent || []) {
        if (o.oclass === COIN_CLASS) sum += o.quan || 0;
    }
    return sum;
}

/** C ref: mondata.h perceives — M1_SEE_INVIS. */
function perceives(ptr) {
    return !!((ptr?.mflags1 ?? 0) & M1_SEE_INVIS);
}

/**
 * C ref: youprop.h Displaced — HDisplaced || EDisplaced.
 * Extrinsic from cloak: oc_oprop wiring deferred; match worn
 * CLOAK_OF_DISPLACEMENT (Ranger kit / displacement cloak).
 */
function Displaced() {
    const u = game.u || {};
    if (u.HDisplaced || u.uprops?.[DISPLACED]?.intrinsic) return true;
    if (u.uprops?.[DISPLACED]?.extrinsic) return true;
    const cloak = u.uarmc;
    return !!(cloak && cloak.otyp === CLOAK_OF_DISPLACEMENT);
}

/** C ref: youprop.h Stealth — (HStealth || EStealth) && !BStealth. */
function Stealth() {
    const u = game.u || {};
    return !!(((u.HStealth | 0) || (u.EStealth | 0)) && !(u.BStealth | 0));
}

/** C ref: youprop.h Aggravate_monster — HAggravate_monster || EAggravate_monster. */
function Aggravate_monster() {
    const u = game.u || {};
    return !!((u.HAggravate_monster | 0) || (u.EAggravate_monster | 0));
}

/** C ref: monmove.c / muse.c mdistu — squared distance to hero. */
function mdistu(mtmp) {
    const u = game.u;
    if (!u || mtmp.mx == null) return 0;
    return dist2(mtmp.mx, mtmp.my, u.ux, u.uy);
}

/**
 * C ref: monmove.c disturb — possibly awaken a sleeping monster.
 * Named omissions: wake_msg (canseemon sleep pline); Hallucination newsym
 * already gated at dochug caller.
 */
function disturb(mtmp) {
    const mdat = mtmp.data;
    const mndx = mdat?.mndx ?? -1;
    const mlet = mdat?.mlet;
    // Short-circuit order matches C: couldsee → mdistu → Stealth/ettin
    // → nymph|jabber|lep → Aggravate|dog|human|rn2(7)+mimic gate.
    if (couldsee(mtmp.mx, mtmp.my) && mdistu(mtmp) <= 100
        && (!Stealth() || (mndx === PM_ETTIN && rn2(10)))
        && (!(mlet === 'S_NYMPH'
            || mndx === PM_JABBERWOCK
            || mlet === 'S_LEPRECHAUN') || !rn2(50))
        && (Aggravate_monster()
            || (mlet === 'S_DOG' || mlet === 'S_HUMAN')
            || (!rn2(7) && M_AP_TYPE(mtmp) !== M_AP_FURNITURE
                && M_AP_TYPE(mtmp) !== M_AP_OBJECT))) {
        // wake_msg deferred
        mtmp.msleeping = 0;
        return 1;
    }
    return 0;
}

/** C ref: monmove.c closed_door / mthrowu closed_door. */
function closed_door(x, y) {
    const loc = game.level?.at?.(x, y);
    if (!loc || !IS_DOOR(loc.typ)) return false;
    return !!((loc.doormask || 0) & (D_CLOSED | D_LOCKED));
}

/**
 * C ref: monmove.c accessible — ACCESSIBLE(SURFACE_AT) && !closed_door.
 * DRAWBRIDGE_UP under-typ deferred (named omission).
 */
function accessible(x, y) {
    const loc = game.level?.at?.(x, y);
    if (!loc) return false;
    return ACCESSIBLE(loc.typ) && !closed_door(x, y);
}

/**
 * C ref: monmove.c can_ooze — amorphous && !stuff_prevents_passage.
 * stuff_prevents_passage body deferred → treat as empty invent (ok).
 */
function can_ooze(mtmp) {
    return !!((mtmp?.data?.mflags1 ?? 0) & M1_AMORPHOUS);
}

/** C ref: youprop.h Protection_from_shape_changers */
function Protection_from_shape_changers() {
    const u = game.u || {};
    return !!(u.HProtection_from_shape_changers
        || u.EProtection_from_shape_changers
        || u.Protection_from_shape_changers);
}

/**
 * C ref: monmove.c can_fog — vampshifter may become fog under a door.
 * Named omission: stuff_prevents_passage invent scan (empty invent ⇒ ok,
 * same deferral as can_ooze).
 */
function can_fog(mtmp) {
    const fogGone = !!((game.mvitals?.[PM_FOG_CLOUD]?.mvflags ?? 0) & G_GENOD);
    if (fogGone || !is_vampshifter(mtmp) || Protection_from_shape_changers()) {
        return false;
    }
    // stuff_prevents_passage deferred — treat as no blocking invent
    return true;
}

/**
 * C ref: monmove.c set_apparxy — decide where monster thinks hero stands.
 * Covers Displaced / Invis / Underwater / already-know early exits.
 * Also rloc_to_core after dest newsym (teleport.c:1702, D-1160).
 */
export function set_apparxy(mtmp) {
    const u = game.u || {};
    let mx = mtmp.mux;
    let my = mtmp.muy;
    const umoney = money_cnt(game.invent);

    // pet / grabber / still believes hero at current mux,muy
    if (mtmp.mtame || mtmp === u.ustuck || u_at(mx, my)) {
        mtmp.mux = u.ux;
        mtmp.muy = u.uy;
        return;
    }

    const Invis = !!(u.Invis);
    const Underwater = !!(u.Underwater);
    const notseen = (!mtmp.mcansee || (Invis && !perceives(mtmp.data)));
    const notthere = (
        Displaced() && mtmp.data?.mndx !== PM_DISPLACER_BEAST
    );

    let displ;
    if (Underwater) {
        displ = 1;
    } else if (notseen) {
        displ = (mtmp.data?.mndx === PM_XORN && umoney) ? 0 : 1;
    } else if (notthere) {
        displ = couldsee(mx, my) ? 2 : 1;
    } else {
        displ = 0;
    }
    if (!displ) {
        mtmp.mux = u.ux;
        mtmp.muy = u.uy;
        return;
    }

    // gotu = notseen ? !rn2(3) : notthere ? !rn2(4) : FALSE
    const gotu = notseen ? !rn2(3) : notthere ? !rn2(4) : false;

    if (!gotu) {
        let try_cnt = 0;
        for (;;) {
            if (++try_cnt > 200) {
                mx = u.ux;
                my = u.uy;
                break;
            }
            mx = u.ux - displ + rn2(2 * displ + 1);
            my = u.uy - displ + rn2(2 * displ + 1);
            if (!isok(mx, my)) continue;
            if (displ !== 2 && mx === mtmp.mx && my === mtmp.my) continue;
            if (
                (mx !== u.ux || my !== u.uy)
                && !passes_walls(mtmp.data)
                && !(
                    accessible(mx, my)
                    || (closed_door(mx, my) && (can_ooze(mtmp) || can_fog(mtmp)))
                )
            ) {
                continue;
            }
            if (!couldsee(mx, my)) continue;
            break;
        }
    } else {
        mx = u.ux;
        my = u.uy;
    }

    mtmp.mux = mx;
    mtmp.muy = my;
}

/**
 * C ref: monmove.c monflee — set mflee; optional fleetime / fleemsg.
 * Named omissions: release_hero on ustuck; flees_light rn2(10)/verbalize /
 * light-source pline; Vrock gas cloud; Adjmonnam immobile flinch wording.
 */
export async function monflee(mtmp, fleetime, first, fleemsg) {
    if (!mtmp || (mtmp.mhp | 0) <= 0) return;
    // C: if (mtmp == u.ustuck) release_hero(mtmp) — deferred
    if (!first || !mtmp.mflee) {
        if (!fleetime) {
            mtmp.mfleetim = 0;
        } else if (!mtmp.mflee || mtmp.mfleetim) {
            fleetime += mtmp.mfleetim | 0;
            if (fleetime === 1) fleetime++;
            mtmp.mfleetim = Math.min(fleetime, 127);
        }
        if (!mtmp.mflee && fleemsg
            && canseemon(mtmp)
            && M_AP_TYPE(mtmp) !== M_AP_FURNITURE
            && M_AP_TYPE(mtmp) !== M_AP_OBJECT) {
            if (!mtmp.mcanmove || !(mtmp.data?.mmove | 0)) {
                await pline(`${Monnam(mtmp)} seems to flinch.`);
            } else {
                // flees_light arm deferred (no extra rn2(10))
                await pline(`${Monnam(mtmp)} turns to flee.`);
            }
        }
        // Vrock gas cloud deferred (create_gas_cloud + mspec_used)
        mtmp.mflee = 1;
    }
    // C: ignore recently-stepped spaces when made to flee (always)
    mon_track_clear(mtmp);
}

// C ref: monmove.c distfleeck()
export function distfleeck(mtmp) {
    // bravegremlin roll always happens even if unused
    const bravegremlin = rn2(5) === 0;
    void bravegremlin;

    const inrange = dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy)
        <= (BOLT_LIM * BOLT_LIM);
    const nearby = inrange && monnear(mtmp, mtmp.mux, mtmp.muy);
    // onscary / flees_light / sanctuary not hit for seed8000 starter path
    const scared = 0;
    return { inrange: inrange ? 1 : 0, nearby: nearby ? 1 : 0, scared };
}

/**
 * C ref: monmove.c watch_on_duty — peaceful watch that can see hero in town
 * may notice lockpicking / digging (!rn2(3) gate).
 * Named omissions: mon_yells polish (plain pline); pickaxe dig occupation
 * via dig.js is_digging() (D-0951).
 */
async function watch_on_duty(mtmp) {
    const u = game.u || {};
    if (!(mtmp.mpeaceful
        && in_town((u.ux | 0) + (u.dx | 0), (u.uy | 0) + (u.dy | 0))
        && mtmp.mcansee && m_canseeu(mtmp) && !rn2(3))) {
        return;
    }
    const pos = { x: 0, y: 0 };
    if (picking_lock(pos)) {
        const loc = game.level?.at(pos.x, pos.y);
        if (loc && IS_DOOR(loc.typ)
            && ((loc.doormask || loc.flags || 0) & D_LOCKED)) {
            if (couldsee(mtmp.mx, mtmp.my)) {
                if ((loc.looted | 0) & D_WARNED) {
                    // mon_yells deferred — arrest pline + angry_guards
                    await pline('Halt, thief!  You\'re under arrest!');
                    const Deaf = !!((u.HDeaf | 0) || (u.EDeaf | 0)
                        || u.uroleplay?.deaf || u.Deaf);
                    const { angry_guards } = await import('./mon.js');
                    await angry_guards(!!Deaf);
                } else {
                    // mon_yells deferred
                    await pline('Hey, stop picking that lock!');
                    loc.looted = (loc.looted | 0) | D_WARNED;
                }
                await stop_occupation();
            }
        }
    } else {
        const { is_digging, watch_dig } = await import('./dig.js');
        if (is_digging()) {
            const dig = game.context?.digging;
            await watch_dig(
                mtmp,
                dig?.pos?.x | 0,
                dig?.pos?.y | 0,
                false,
            );
        }
    }
}

/**
 * C ref: monmove.c monhaskey — locking/unlocking tool in minvent.
 */
function monhaskey(mon, for_unlocking) {
    for (let otmp = mon?.minvent; otmp; otmp = otmp.nobj) {
        if (for_unlocking && otmp.otyp === CREDIT_CARD) return true;
        if (otmp.otyp === SKELETON_KEY || otmp.otyp === LOCK_PICK) return true;
    }
    return false;
}

/**
 * C ref: monmove.c mb_trapped — door trap explosion after open/smash.
 * Named omission: wake_nearto; mon_learns_traps(TRAPPED_DOOR); full
 * mondead/lifesave (HP≤0 clears mx and returns died).
 */
async function mb_trapped(mtmp, canseeit) {
    if (game.flags?.verbose !== false) {
        if (canseeit && !game.u?.Unaware) {
            await pline('KABOOM!!  You see a door explode.');
        } else if (!game.u?.Deaf) {
            const far = dist2(mtmp.mx, mtmp.my, game.u.ux, game.u.uy) > 7 * 7;
            await pline(`You hear a ${far ? 'distant' : 'nearby'} explosion.`);
        }
    }
    mtmp.mstun = 1;
    mtmp.mhp -= rnd(15);
    if ((mtmp.mhp | 0) < 1) {
        mtmp.mhp = 0;
        mtmp.mx = 0;
        mtmp.my = 0;
        return true;
    }
    return false;
}

/**
 * C: UnblockDoor macro — set doormask, newsym, recalc vision, refresh cansee.
 */
function unblock_door(here, mtmp, what, didseeit) {
    here.doormask = what;
    if (here.flags !== undefined) here.flags = what;
    newsym(mtmp.mx, mtmp.my);
    recalc_block_point(mtmp.mx, mtmp.my);
    vision_recalc(0);
    return didseeit || cansee(mtmp.mx, mtmp.my);
}

/**
 * C ref: display.h canseemon / canspotmon stubs for door feedback.
 * infrared/invis/worm deferred — lit cansee + !minvis stand-in.
 */
function canseemon(mtmp) {
    if (!mtmp?.mx) return false;
    if (!cansee(mtmp.mx, mtmp.my)) return false;
    return !mtmp.minvis;
}

function canspotmon(mtmp) {
    return canseemon(mtmp);
}

/** C ref: monst.h helpless — msleeping || !mcanmove */
function helpless_mon(mtmp) {
    return !!(mtmp?.msleeping || !mtmp?.mcanmove);
}

/**
 * C ref: monmove.c can_hide_under_obj — floor obj; non-pit trap blocks;
 * <10 coins alone cannot hide under. NO_HIDING_UNDER_STATUES off in C.
 */
function can_hide_under_obj(obj) {
    if (!obj || obj.where !== OBJ_FLOOR) return false;
    const t = t_at(obj.ox, obj.oy);
    if (t && !is_pit(t.ttyp)) return false;
    if (obj.oclass === COIN_CLASS) {
        let coinquan = 0;
        let o = obj;
        do {
            coinquan += o.quan | 0;
            if (coinquan >= 10) break;
            o = o.nexthere;
            if (!o) return false;
        } while (o.oclass === COIN_CLASS);
    }
    return true;
}

/**
 * C ref: mondata.c locomotion — verb for how a monster moves.
 * Used by hideunder You_see ("slither" for snakes).
 */
function locomotion(ptr, def) {
    const cap = !!(def && def[0] === def[0].toUpperCase()
        && def[0] !== def[0].toLowerCase());
    const pick = (lo, hi) => (cap ? hi : lo);
    if (is_floater(ptr)) return pick('float', 'Float');
    if (is_flyer(ptr) && (ptr.msize ?? 2) <= MZ_SMALL) {
        return pick('fly', 'Fly');
    }
    if (is_flyer(ptr)) return pick('fly', 'Fly');
    if (((ptr?.mflags1 ?? 0) & M1_SLITHY) !== 0) {
        return pick('slither', 'Slither');
    }
    if (amorphous(ptr)) return pick('ooze', 'Ooze');
    if (!(ptr?.mmove | 0)) return pick('wiggle', 'Wiggle');
    if (nolimbs(ptr)) return pick('crawl', 'Crawl');
    return def;
}

/**
 * C ref: mon.c hideunder — set mundetected under object / pool for eels.
 * You_see "%s %s under %s" when canseemon before hide (forces --More--
 * when prior topline cannot append). Named omissions: pet
 * cursed_object_at; cockatrice corpse skip; youmonst path;
 * set_msg_xy / PLNMSG_HIDE_UNDER / last_hider.
 */
async function hideunder(mtmp) {
    if (!mtmp?.mx) return false;
    const u = game.u || {};
    const x = mtmp.mx;
    const y = mtmp.my;
    let undetected = false;
    let seenobj = null;
    let locomo = null;
    // C: seeit before mundetected mutation (canseemon fails once hidden)
    const seeit = game.in_mklev ? 0 : (display_canseemon(mtmp) ? 1 : 0);

    if (mtmp === u.ustuck) {
        // holding / held — cannot hide
    } else if (mtmp.mtrapped) {
        // trapped — cannot hide
    } else {
        const t = t_at(x, y);
        if (t && !is_pit(t.ttyp)) {
            // non-pit trap site — cannot hide
        } else if (mtmp.data?.mlet === 'S_EEL') {
            undetected = !!(is_pool(x, y) && !Is_waterlevel(u.uz)
                && (!(u.Underwater) || !couldsee(x, y)));
            if (seeit) {
                seenobj = 'the water';
                locomo = 'dive';
            }
        } else if (hides_under(mtmp.data)) {
            const otmp = objects_at(x, y);
            if (otmp && can_hide_under_obj(otmp)
                && !is_pool(x, y) && !is_lava(x, y)
                /* pet cursed_object_at deferred */) {
                if (seeit) seenobj = ansimpleoname(otmp);
                // cockatrice corpse skip deferred — any hideable obj counts
                undetected = true;
            }
        }
    }

    let seenmon = null;
    if (seeit) seenmon = y_monnam(mtmp);
    const oldundetctd = !!mtmp.mundetected;
    mtmp.mundetected = undetected ? 1 : 0;
    // C: if (undetected && seenmon && seenobj) You_see("%s %s under %s."…)
    if (undetected && seenmon && seenobj) {
        if (!locomo) locomo = locomotion(mtmp.data, 'hide');
        await pline(`You see ${seenmon} ${locomo} under ${seenobj}.`);
    }
    if (undetected !== oldundetctd) newsym(x, y);
    return undetected;
}

/**
 * C ref: mon.c maybe_unhide_at — reveal hider when floor obj gone / eel
 * left water. Callers: m_move after place (monmove.c:2060);
 * rloc_to_core after ustuck, before newsym (teleport.c:1700, D-1152).
 * Named omission: hero (youmonst / uundetected) path.
 */
export async function maybe_unhide_at(x, y) {
    const mtmp = m_at(x, y);
    if (!mtmp) return;
    if (!mtmp.mundetected) return;
    const trapped = !!mtmp.mtrapped;
    const floorObj = objects_at(x, y);
    if ((hides_under(mtmp.data)
            && (!floorObj || trapped || !can_hide_under_obj(floorObj)))
        || (mtmp.data?.mlet === 'S_EEL' && !is_pool(x, y))) {
        await hideunder(mtmp);
    }
}

/**
 * C ref: monmove.c holds_up_web — obstructed / up-stairs / iron bars hold a web.
 */
function holds_up_web(x, y) {
    if (!isok(x, y)) return true;
    const loc = game.level?.at(x, y);
    if (!loc) return true;
    if (IS_OBSTRUCTED(loc.typ)) return true;
    if ((loc.typ === STAIRS || loc.typ === LADDER)
        && stairway_at(x, y)?.up) {
        return true;
    }
    if (loc.typ === IRONBARS) return true;
    return false;
}

/** C ref: monmove.c count_webbing_walls — cardinal neighbors that hold a web. */
function count_webbing_walls(x, y) {
    return (holds_up_web(x, y - 1) ? 1 : 0)
        + (holds_up_web(x + 1, y) ? 1 : 0)
        + (holds_up_web(x, y + 1) ? 1 : 0)
        + (holds_up_web(x - 1, y) ? 1 : 0);
}

/**
 * C ref: monmove.c soko_allow_web — non-Sokoban always; else spinner must
 * see upstairs. Named omission: chamber-of-stairs-up (C uses see only).
 */
function soko_allow_web(mon) {
    const Sokoban = !!(game.level?.flags?.sokoban_rules || game.Sokoban);
    if (!Sokoban) return true;
    let stway = null;
    for (let s = game.stairs; s; s = s.next) {
        if (s.up) {
            stway = s;
            break;
        }
    }
    if (stway && m_cansee(mon, stway.sx, stway.sy)) return true;
    return false;
}

/**
 * C ref: monmove.c maybe_spin_web — webmaker postmov chance rn2(1000)<prob.
 * Named omissions: shop add_damage; y_monnam/something pline polish.
 */
async function maybe_spin_web(mtmp) {
    if (!webmaker(mtmp?.data)
        || helpless_mon(mtmp)
        || mtmp.mspec_used
        || t_at(mtmp.mx, mtmp.my)
        || !soko_allow_web(mtmp)) {
        return;
    }
    const base = (mtmp.data?.mndx === PM_GIANT_SPIDER) ? 15 : 5;
    const prob = (base * (count_webbing_walls(mtmp.mx, mtmp.my) + 1))
        - (3 * count_traps(WEB));
    if (rn2(1000) < prob) {
        const trap = maketrap(mtmp.mx, mtmp.my, WEB);
        if (trap) {
            mtmp.mspec_used = d(4, 4); // 4..16
            if (cansee(mtmp.mx, mtmp.my)) {
                if (canspotmon(mtmp)) {
                    await pline(`${Monnam(mtmp)} spins a web.`);
                } else {
                    await pline('Something spins a web.');
                }
                trap.tseen = 1;
            }
            // shop add_damage deferred
        }
    }
}

/**
 * C ref: monmove.c m_everyturn_effect — fog leaves size-1 vapor each visit.
 * Named omission: polyed-hero path (is_u).
 */
export function m_everyturn_effect(mtmp) {
    if (!mtmp) return;
    const mnum = mtmp.mnum ?? mtmp.data?.mndx ?? -1;
    if (mnum !== PM_FOG_CLOUD) return;
    const x = mtmp.mx | 0;
    const y = mtmp.my | 0;
    if (!closed_door(x, y) && !visible_region_at(x, y)) {
        create_gas_cloud(x, y, 1, 0);
    }
}

/**
 * C ref: monmove.c m_postmove_effect — Hezrou stench / Steam vortex vapor
 * at pre-move cell. Called before place_monster in C.
 */
export function m_postmove_effect(mtmp) {
    if (!mtmp) return;
    const mnum = mtmp.mnum ?? mtmp.data?.mndx ?? -1;
    const x = mtmp.mx | 0;
    const y = mtmp.my | 0;
    if (mnum === PM_HEZROU) {
        create_gas_cloud(x, y, 1, 8);
    } else if (mnum === PM_STEAM_VORTEX && !mtmp.mcan) {
        create_gas_cloud(x, y, 1, 0);
    }
}

/**
 * C ref: monmove.c postmov — after a successful step: traps then doors,
 * then shared OBJ_AT / mpickstuff for MOVED|DONE.
 * Branch envelope: D_CLOSED open / D_LOCKED unlock / smash doorbuster;
 * amorphous squeeze message; mb_trapped; mpickstuff one-object pickup;
 * hides_under / S_EEL rn2(5) → hideunder (D-0496); maybe_spin_web (D-0595).
 * Named omissions: vampshift fog; iron bars; shop add_damage;
 * has_magic_key disarm; metallivorous/cube/corpse_eater meat*;
 * hideunder You_see (ported); check_gear_next_turn; swallowed() display polish.
 * (shk/gd/priest via shk.js D-0205)
 */
async function postmov(mtmp, omx, omy, mmoved, can_tunnel, can_unlock, can_open) {
    if (mmoved !== MMOVE_MOVED && mmoved !== MMOVE_DONE) return mmoved;

    const ptr = mtmp.data;

    if (mmoved === MMOVE_MOVED) {
    // notice_mon deferred
    let canseeit = cansee(mtmp.mx, mtmp.my);
    const didseeit = canseeit;

    newsym(omx, omy); // update the old position
    const trapret = await mintrap(mtmp, NO_TRAP_FLAGS);
    if (trapret === Trap_Killed_Mon || trapret === Trap_Moved_Mon) {
        if (mtmp.mx) newsym(mtmp.mx, mtmp.my);
        return MMOVE_DIED;
    } else if (mon_offmap(mtmp)) {
        // C ref: monmove.c postmov — migrated/off-map after mintrap
        return MMOVE_DONE;
    }

    // open a door, or crash through it, if mtmp can
    const loc = game.level?.at(mtmp.mx, mtmp.my);
    if (loc && IS_DOOR(loc.typ)
        && !passes_walls(ptr)
        && !can_tunnel) {
        const here = loc;
        let btrapped = !!(here.doormask & D_TRAPPED);
        // has_magic_key disarm deferred
        const verbose = game.flags?.verbose !== false;
        const dm = here.doormask || 0;

        if ((dm & (D_LOCKED | D_CLOSED)) !== 0
            && ((ptr?.mflags1 ?? 0) & M1_AMORPHOUS)) {
            if (verbose && canseemon(mtmp)) {
                const flows = (ptr?.mlet === 'S_LIGHT');
                await pline(
                    `${Monnam(mtmp)} ${flows ? 'flows' : 'oozes'} under the door.`,
                );
            }
        } else if ((dm & D_LOCKED) !== 0 && can_unlock) {
            canseeit = unblock_door(
                here, mtmp, !btrapped ? D_ISOPEN : D_NODOOR, didseeit,
            );
            if (btrapped) {
                if (await mb_trapped(mtmp, canseeit)) return MMOVE_DIED;
            } else if (verbose) {
                if (canseeit && canspotmon(mtmp)) {
                    await pline(`${Monnam(mtmp)} unlocks and opens a door.`);
                } else if (canseeit) {
                    await pline('You see a door unlock and open.');
                } else if (!game.u?.Deaf) {
                    await pline('You hear a door unlock and open.');
                }
            }
        } else if (dm === D_CLOSED && can_open) {
            canseeit = unblock_door(
                here, mtmp, !btrapped ? D_ISOPEN : D_NODOOR, didseeit,
            );
            if (btrapped) {
                if (await mb_trapped(mtmp, canseeit)) return MMOVE_DIED;
            } else if (verbose) {
                if (canseeit && canspotmon(mtmp)) {
                    await pline(`${Monnam(mtmp)} opens a door.`);
                } else if (canseeit) {
                    await pline('You see a door open.');
                } else if (!game.u?.Deaf) {
                    await pline('You hear a door open.');
                }
            }
        } else if ((dm & (D_LOCKED | D_CLOSED)) !== 0) {
            // mfndpos guarantees doorbuster
            const mask = (btrapped
                || ((dm & D_LOCKED) !== 0 && !rn2(2)))
                ? D_NODOOR
                : D_BROKEN;
            canseeit = unblock_door(here, mtmp, mask, didseeit);
            if (btrapped) {
                if (await mb_trapped(mtmp, canseeit)) return MMOVE_DIED;
            } else if (verbose) {
                if (canseeit && canspotmon(mtmp)) {
                    await pline(`${Monnam(mtmp)} smashes down a door.`);
                } else if (canseeit) {
                    await pline('You see a door crash open.');
                } else if (!game.u?.Deaf) {
                    await pline('You hear a door crash open.');
                }
            }
            // shop add_damage deferred
        }
    }

    // C: possibly dig — can_tunnel && may_dig → mdig_tunnel (burns rnd(12)
    // even on open floor).
    if (can_tunnel && may_dig(mtmp.mx, mtmp.my)
        && await mdig_tunnel(mtmp)) {
        return MMOVE_DIED;
    }

    // C ref: monmove.c postmov — engulfer relocates hero while digesting
    // (also in hack.c domove). swallowed(0) display polish deferred.
    if (engulfing_u(mtmp) && (mtmp.mx !== omx || mtmp.my !== omy)) {
        const u = game.u || (game.u = {});
        u.ux0 = u.ux;
        u.uy0 = u.uy;
        u_on_newpos(mtmp.mx, mtmp.my);
        // C: u_on_newpos skips see_nearby_objects while uswallow
    } else if (mtmp.mx) {
        newsym(mtmp.mx, mtmp.my);
    }
    // IRONBARS deferred
    } // end MMOVE_MOVED

    // C: shared MOVED|DONE floor pickup
    if (objects_at(mtmp.mx, mtmp.my) && mtmp.mcanmove) {
        // metallivorous / gelatinous cube / corpse_eater meat* deferred
        if (await mpickstuff(mtmp)) {
            mmoved = MMOVE_DONE;
        }
        // minvis newsym deferred
    }

    // C: maybe_spin_web (monmove.c) before hides_under
    await maybe_spin_web(mtmp);

    // C: postmov hides_under / S_EEL — outside OBJ_AT (monmove.c ≈1692)
    if (hides_under(ptr) || ptr?.mlet === 'S_EEL') {
        if (mtmp.mundetected || (!helpless_mon(mtmp) && rn2(5))) {
            await hideunder(mtmp);
        }
        newsym(mtmp.mx, mtmp.my);
    }
    // after_shk_move deferred

    return mmoved;
}

/**
 * C ref: weapon.c autoreturn_weapon — AKLYS only (boomerang row commented out in C).
 */
function autoreturn_weapon(otmp) {
    if (!otmp || otmp.otyp !== AKLYS) return null;
    return { otyp: AKLYS, range: AKLYS_LIM * AKLYS_LIM, tethered: 1 };
}

/**
 * C ref: mhitu.c ranged_attk_available — DISTANCE_ATTK_TYPE with m_seenres gate
 * deferred (treat distance AD as available).
 */
function ranged_attk_available(mtmp) {
    const mattk = mtmp.data?.mattk;
    if (!mattk) return false;
    for (let i = 0; i < NATTK && i < mattk.length; i++) {
        const aatyp = mattk[i]?.aatyp | 0;
        if (aatyp === AT_SPIT || aatyp === AT_BREA || aatyp === AT_MAGC
            || aatyp === AT_GAZE) {
            return true;
        }
    }
    return false;
}

/**
 * C ref: monmove.c m_balks_at_approaching — ranged hostiles keep distance.
 * Returns oldappr, -1 (flee), or -2 (preferred range band).
 */
function m_balks_at_approaching(oldappr, mtmp, pdist) {
    const mwep = MON_WEP(mtmp);
    const x = mtmp.mx;
    const y = mtmp.my;
    const ux = mtmp.mux;
    const uy = mtmp.muy;
    const edist = dist2(x, y, ux, uy);
    if (pdist) {
        pdist.min = 0;
        pdist.max = 0;
    }
    if (mtmp.mpeaceful || edist >= 5 * 5 || !m_canseeu(mtmp)) {
        return oldappr;
    }
    if (m_has_launcher_and_ammo(mtmp)) return -1;
    if (mwep && is_pole(mwep) && edist <= MON_POLE_DIST) return -1;
    const arw = mwep ? autoreturn_weapon(mwep) : null;
    if (arw) {
        if (pdist) {
            pdist.min = 2 * 2;
            pdist.max = arw.range;
        }
        return -2;
    }
    if (ranged_attk_available(mtmp)
        && ((mtmp.mhp < Math.trunc((mtmp.mhpmax + 1) / 3))
            || !mtmp.mspec_used)) {
        return -1;
    }
    return oldappr;
}

/**
 * C ref: mondata.c sticks — AD_STCK, non-engulf AD_WRAP, or AT_HUGS.
 */
export function sticks(ptr) {
    const atks = ptr?.mattk || [];
    let hasWrap = false;
    let hasEngl = false;
    for (const a of atks) {
        const ad = a?.adtyp | 0;
        const aa = a?.aatyp | 0;
        if (ad === 19 /* AD_STCK */) return true;
        if (aa === 6 /* AT_HUGS */) return true;
        if (ad === 28 /* AD_WRAP */) hasWrap = true;
        if (aa === 7 /* AT_ENGL */) hasEngl = true;
    }
    return hasWrap && !hasEngl;
}

/**
 * C ref: monmove.c itsstuck — stuck grabber cannot walk away.
 */
async function itsstuck(mtmp) {
    const u = game.u;
    if (sticks(game.youmonst?.data) && mtmp === u?.ustuck && !u?.uswallow) {
        await pline(`${Monnam(mtmp)} cannot escape from you!`);
        return true;
    }
    return false;
}

/**
 * C ref: monmove.c m_move_aggress — mon-vs-mon at (x,y); empty mux image → DONE.
 * Named omissions: bhitpos/notonhead polish.
 */
async function m_move_aggress(mtmp, x, y) {
    let mstatus = 0; // M_ATTK_MISS
    const mtmp2 = m_at(x, y);
    if (mtmp2) {
        mstatus = await mattackm(mtmp, mtmp2);
    }
    if ((mstatus & M_ATTK_AGR_DIED) || (mtmp.mhp | 0) < 1) return MMOVE_DIED;
    if ((mstatus & (M_ATTK_HIT | M_ATTK_DEF_DIED)) === M_ATTK_HIT
        && rn2(4) && mtmp2 && (mtmp2.movement | 0) > rn2(NORMAL_SPEED)) {
        if ((mtmp2.movement | 0) > NORMAL_SPEED) mtmp2.movement -= NORMAL_SPEED;
        else mtmp2.movement = 0;
        mstatus = await mattackm(mtmp2, mtmp);
        if (mstatus & M_ATTK_DEF_DIED) return MMOVE_DIED;
    }
    return MMOVE_DONE;
}

// C ref: monmove.c m_move() — pets → postmov(dog_move); else approach / track path
export async function m_move(mtmp, after) {
    // ptr / can_* set after mintrap (C: mintrap can change mtmp->data;
    // can_tunnel after hide-under early return — same predicates).
    let ptr;
    let can_tunnel;
    let can_open;
    let can_unlock;
    // is_rider deferred
    const omx = mtmp.mx;
    const omy = mtmp.my;

    // C: mtrapped → mintrap before meating / dog_move (pets included)
    if (mtmp.mtrapped) {
        const i = await mintrap(mtmp, NO_TRAP_FLAGS);
        if (i === Trap_Killed_Mon) {
            if (mtmp.mx) newsym(mtmp.mx, mtmp.my);
            return MMOVE_DIED;
        }
        if (i === Trap_Caught_Mon) {
            return MMOVE_NOTHING;
        }
    }
    // C: ptr = mtmp->data after mintrap (may polymorph)
    ptr = mtmp.data;
    can_tunnel = tunnels(ptr) && !Is_rogue_level(game.u?.uz);
    can_open = !(nohands(ptr) || verysmall(ptr));
    can_unlock = (can_open && monhaskey(mtmp, true)) || !!mtmp.iswiz;

    // C: meating countdown — still eating skips dog_move / approach
    if (mtmp.meating) {
        mtmp.meating--;
        if ((mtmp.meating | 0) <= 0) finish_meating(mtmp);
        return MMOVE_DONE;
    }

    // C ref: monmove.c m_move — hides_under stay-put before set_apparxy
    // (D-0589): OBJ_AT + can_hide_under_obj + rn2(10) → MMOVE_NOTHING
    {
        const floorObj = objects_at(mtmp.mx, mtmp.my);
        if (hides_under(ptr) && floorObj
            && can_hide_under_obj(floorObj)
            && rn2(10)) {
            return MMOVE_NOTHING;
        }
    }

    // C: set_apparxy before mtame / covetous / shk|gd|priest specials
    set_apparxy(mtmp);

    // C: if (mtmp->mtame) return postmov(..., dog_move(...), ...)
    if (mtmp.mtame) {
        const mmoved = await dog_move(mtmp, after);
        return postmov(mtmp, omx, omy, mmoved, can_tunnel, can_unlock, can_open);
    }

    // C ref: monmove.c m_move — shopkeeper / guard / priest special
    if (mtmp.isshk || mtmp.isgd || mtmp.ispriest) {
        let xm;
        if (mtmp.isshk) xm = await shk_move(mtmp);
        else if (mtmp.isgd) xm = await gd_move(mtmp);
        else xm = await pri_move(mtmp);

        if (xm === -2) return MMOVE_DIED;
        if (xm !== -1) {
            return postmov(
                mtmp, omx, omy,
                (xm !== 1) ? MMOVE_NOTHING : MMOVE_MOVED,
                can_tunnel, can_unlock, can_open,
            );
        }
        // xm === -1: fall through to normal AI (follow outside shop)
    }

    // C ref: monmove.c m_move — Tengu nature teleport before not_special.
    // !rn2(5) is evaluated for every Tengu (short-circuit after mndx).
    // tele_restrict may pline+More when noteleport_level (D-0816).
    if ((ptr?.mndx ?? -1) === PM_TENGU && !rn2(5) && !mtmp.mcan
        && !(await tele_restrict(mtmp))) {
        // C: mhp < 7 || peaceful || rn2(2) → rloc; else mnexto
        if ((mtmp.mhp | 0) < 7 || mtmp.mpeaceful || rn2(2)) {
            await rloc(mtmp, RLOC_MSG);
        } else {
            await mnexto(mtmp, RLOC_MSG);
        }
        return postmov(mtmp, omx, omy, MMOVE_MOVED, can_tunnel, can_unlock, can_open);
    }

    // C: not_special — other monsters keep moving while hero is swallowed
    if (game.u?.uswallow && !mtmp.mflee && game.u?.ustuck !== mtmp) {
        return MMOVE_MOVED;
    }

    let ggx = mtmp.mux;
    let ggy = mtmp.muy;
    let appr = mtmp.mflee ? -1 : 1;
    const preferredrange = { min: 0, max: 0 };
    // C ref: monmove.c m_move not_special — appr / should_see / Invis rn2(11)
    if (mtmp.mconf || engulfing_u(mtmp)) {
        appr = 0;
    } else {
        const u = game.u;
        const goalLoc = game.level?.at(ggx, ggy);
        const monLoc = game.level?.at(omx, omy);
        const should_see = !!(
            couldsee(omx, omy)
            && (!!goalLoc?.lit || !monLoc?.lit)
            && dist2(omx, omy, ggx, ggy) <= 36
        );
        const Invis = !!(u?.Invis);
        const youmonst = game.youmonst;
        // Short-circuit OR matches C: Invis rn2(11) before peaceful / stalker.
        if (!mtmp.mcansee
            || (should_see && Invis && !perceives(ptr) && rn2(11))
            || is_obj_mappear(youmonst, STRANGE_OBJECT) || u?.uundetected
            || (is_obj_mappear(youmonst, GOLD_PIECE) && !likes_gold(ptr))
            || (mtmp.mpeaceful && !mtmp.isshk)
            || (((ptr?.mndx ?? -1) === PM_STALKER || ptr?.mlet === 'S_BAT'
                || ptr?.mlet === 'S_LIGHT') && !rn2(3))) {
            appr = 0;
        }
        if (appr === 1 && leppie_avoidance(mtmp)) appr = -1;
        appr = m_balks_at_approaching(appr, mtmp, preferredrange);
        if (!should_see && can_track(ptr)) {
            const cp = gettrack(omx, omy);
            if (cp) {
                ggx = cp.x;
                ggy = cp.y;
            }
        }
    }

    // C ref: monmove.c m_move getitems + m_search_items
    let getitems = false;
    if ((!mtmp.mpeaceful || !rn2(10)) && !Is_rogue_level(game.u?.uz)) {
        const youData = game.youmonst?.data;
        const in_line = !!(lined_up(mtmp)
            && distmin(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy)
                <= (throws_rocks(youData) ? 20 : (Math.trunc(acurrstr() / 2) + 1)));
        if (appr !== 1 || !in_line) getitems = true;
    }
    if (getitems) {
        const gg = { x: ggx, y: ggy, appr };
        if (m_search_items(mtmp, gg)) {
            return postmov(mtmp, omx, omy, MMOVE_DONE, can_tunnel, can_unlock, can_open);
        }
        ggx = gg.x;
        ggy = gg.y;
        appr = gg.appr;
    }

    // C: don't tunnel if hostile and close enough to prefer a weapon
    // Conflict = youprop.h HConflict||EConflict (hero_conflict for worn ring)
    if (can_tunnel && needspick(ptr)
        && ((!mtmp.mpeaceful || hero_conflict())
            && dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy) <= 8)) {
        can_tunnel = false;
    }

    const flag = mon_allowflags(mtmp);
    const mfp = { cnt: 0, poss: [], info: [] };
    const cnt = mfndpos(mtmp, mfp, flag);
    // C ref: monmove.c m_move — cnt==0 tryescape defensive use (not unicorns)
    if (cnt === 0 && !(ptr?.mlet === 'S_UNICORN' && likes_gems(ptr))) {
        if (find_defensive(mtmp, true) && (await use_defensive(mtmp))) {
            return MMOVE_DONE;
        }
        return MMOVE_NOMOVES;
    }
    if (cnt === 0) return MMOVE_NOMOVES;

    let nix = omx;
    let niy = omy;
    let chcnt = 0;
    const jcnt = Math.min(MTSZ, cnt - 1);
    let nidist = dist2(nix, niy, ggx, ggy);
    // C: shortsighted hostiles stop approaching at long range
    if (!mtmp.mpeaceful && game.level?.flags?.shortsighted
        && nidist > (couldsee(nix, niy) ? 144 : 36) && appr === 1) {
        appr = 0;
    }
    // C: unicorn noteleport — avoid NOTONL squares when any alt exists
    let avoid = false;
    if (ptr?.mlet === 'S_UNICORN' && likes_gems(ptr)
        && noteleport_level(mtmp)) {
        for (let i = 0; i < cnt; i++) {
            if (!(mfp.info[i] & NOTONL)) { avoid = true; break; }
        }
    }
    let mmoved = MMOVE_NOTHING;
    let chi = -1;
    // C: should_displace — MDISP last-resort; omitted → never prefer displace
    const better_with_displacing = false;

    for (let i = 0; i < cnt; i++) {
        const nx = mfp.poss[i].x;
        const ny = mfp.poss[i].y;
        let skip = false;

        // C ref: monmove.c m_move — unicorn NOTONL avoid before kicked
        if (avoid && (mfp.info[i] & NOTONL)) continue;

        // C ref: monmove.c m_move — skip kicked loc before chcnt rn2
        if (m_avoid_kicked_loc(mtmp, nx, ny)) continue;

        // C: skip MDISP-only squares unless should_displace prefers them
        if (m_at(nx, ny) && (mfp.info[i] & ALLOW_MDISP)
            && !(mfp.info[i] & ALLOW_M) && !better_with_displacing) {
            continue;
        }

        if (appr !== 0) {
            for (let j = 0; j < jcnt; j++) {
                const mtrk = mtmp.mtrack[j];
                if (mtrk && nx === mtrk.x && ny === mtrk.y) {
                    // C ref: monmove.c:1963
                    if (rn2(4 * (cnt - j))) {
                        skip = true;
                        break;
                    }
                }
            }
            if (skip) continue;
        }

        const ndist = dist2(nx, ny, ggx, ggy);
        const nearer = ndist < nidist;
        // Match C left-to-right short-circuit: only peaceful path bumps chcnt/rn2
        if (
            (appr === 1 && nearer)
            || (appr === -1 && !nearer)
            || (!appr && !rn2(++chcnt))
            || (appr === -2
                && ((ndist <= preferredrange.min && !nearer)
                    || (ndist >= preferredrange.max && nearer)))
            || mmoved === MMOVE_NOTHING
        ) {
            nix = nx;
            niy = ny;
            nidist = ndist;
            chi = i;
            mmoved = MMOVE_MOVED;
        }
    }

    if (mmoved === MMOVE_NOTHING) {
        // C ref: monmove.c m_move — unicorn failed-move teleport then postmov
        if (ptr?.mlet === 'S_UNICORN' && likes_gems(ptr)
            && rn2(2) && !(await tele_restrict(mtmp))) {
            if (rloc(mtmp, 0)) return MMOVE_MOVED;
        }
        return postmov(mtmp, omx, omy, MMOVE_NOTHING, can_tunnel, can_unlock, can_open);
    }

    // C ref: monmove.c m_move post-select — early returns before place
    if (mmoved === MMOVE_MOVED && !u_at(nix, niy) && (await itsstuck(mtmp))) {
        return MMOVE_DONE;
    }

    // C: m_digweapon_check before place — may spend turn wielding dig tool
    if (await m_digweapon_check(mtmp, nix, niy)) {
        return MMOVE_DONE;
    }

    const chiInfo = (chi >= 0 ? mfp.info[chi] : 0) | 0;

    // C: ALLOW_U → prefer mux/muy (confused attack / found you)
    if (chiInfo & ALLOW_U) {
        nix = mtmp.mux;
        niy = mtmp.muy;
    }
    if (u_at(nix, niy)) {
        mtmp.mux = game.u.ux;
        mtmp.muy = game.u.uy;
        return MMOVE_NOTHING;
    }

    // C: ALLOW_M or stepping onto apparent hero image → mon-vs-mon (or DONE)
    if ((chiInfo & ALLOW_M) !== 0
        || (nix === mtmp.mux && niy === mtmp.muy)) {
        return m_move_aggress(mtmp, nix, niy);
    }

    // C: ALLOW_MDISP → mdisplacem; body deferred → treat as failed displace
    if ((chiInfo & ALLOW_MDISP) !== 0) {
        // Named: mdisplacem body still deferred
        return MMOVE_DONE;
    }

    if (!m_in_out_region(mtmp, nix, niy)) {
        return MMOVE_DONE;
    }

    // C: ALLOW_ROCK + m_can_break_boulder → break without place (deferred)
    if ((chiInfo & ALLOW_ROCK) !== 0) {
        // Named: m_can_break_boulder / m_break_boulder deferred
    }

    // C: m_postmove_effect before place (Hezrou/Steam at old cell)
    m_postmove_effect(mtmp);

    // C: place_monster + maybe_unhide_at + mon_track_add then postmov
    mtmp.mx = nix;
    mtmp.my = niy;
    // C ref: monmove.c m_move — maybe_unhide_at before mon_track_add/postmov
    // so postmov hide rn2(5) sees cleared mundetected when dest has no cover.
    await maybe_unhide_at(mtmp.mx, mtmp.my);
    mon_track_add(mtmp, omx, omy);
    return postmov(mtmp, omx, omy, MMOVE_MOVED, can_tunnel, can_unlock, can_open);
}


// C ref: monmove.c dochug()
export async function dochug(mtmp) {
    // C: STRAT_ARRIVE m_arrival deferred
    // C: clear WAITFORU when hero seen or wounded
    if ((mtmp.mstrategy & STRAT_WAITFORU)
        && (m_canseeu(mtmp) || (mtmp.mhp | 0) < (mtmp.mhpmax | 0))) {
        mtmp.mstrategy &= ~STRAT_WAITFORU;
    }
    // C: quest_stat_check before waitmask early-out
    quest_stat_check(mtmp);
    // C: frozen or still waiting — no distfleeck / movement RNG
    if (!mtmp.mcanmove || (mtmp.mstrategy & STRAT_WAITMASK)) {
        if (game.u?.Hallucination) newsym(mtmp.mx, mtmp.my);
        // C: STRAT_CLOSE + monnear → quest_talk (leader speaks)
        if (mtmp.mcanmove && (mtmp.mstrategy & STRAT_CLOSE)
            && !mtmp.msleeping
            && monnear(mtmp, game.u?.ux, game.u?.uy)) {
            await quest_talk(mtmp);
        }
        return 0;
    }

    // C: there is a chance we will wake it
    if (mtmp.msleeping && !disturb(mtmp)) {
        if (game.u?.Hallucination) newsym(mtmp.mx, mtmp.my);
        return 0;
    }

    // C: not frozen or sleeping — wipe dust engravings under the mon
    // before set_apparxy / distfleeck (monmove.c dochug).
    wipe_engr_at(mtmp.mx, mtmp.my, 1, false);

    // C: confused / stunned recovery rolls before flee-teleport
    if (mtmp.mconf && !rn2(50)) mtmp.mconf = 0;
    if (mtmp.mstun && !rn2(10)) mtmp.mstun = 0;

    // C: mflee && !rn2(40) && can_teleport && !iswiz && !noteleport_level
    // — teleport costs a turn. rn2(40) always runs when mflee is set.
    // C: rloc(mtmp, RLOC_MSG) — appear pline may --More-- pending topline
    // (D-0886). Must await; flags 0 dropped the post-place message.
    if (mtmp.mflee && !rn2(40) && can_teleport(mtmp.data)
        && !mtmp.iswiz
        && !noteleport_level(mtmp)) {
        if (await rloc(mtmp, RLOC_MSG)) {
            // leppie_stash deferred
            return 0;
        }
    }

    // C: m_respond deferred (gaze / nymph / etc.)
    // C: courage — mflee && !mfleetim && full HP && !rn2(25)
    if (mtmp.mflee && !(mtmp.mfleetim | 0)
        && (mtmp.mhp | 0) === (mtmp.mhpmax | 0) && !rn2(25)) {
        mtmp.mflee = 0;
    }

    set_apparxy(mtmp);
    // C: covetous tactics before distfleeck (may mnexto / spend turn via
    // mstate). Named: target_on pursuit / STRAT_HEAL stairs body in wizard.js.
    if (is_covetous(mtmp.data)) {
        await tactics(mtmp);
        // C: if (mtmp->mstate) return 0 — MON_FLOOR is 0
        if (mtmp.mstate) return 0;
        set_apparxy(mtmp);
    }
    let { inrange, nearby, scared } = distfleeck(mtmp);

    // C: find_defensive / find_misc before movement phase
    if (find_defensive(mtmp, false)) {
        if ((await use_defensive(mtmp)) !== 0) return 1;
    } else if (find_misc(mtmp)) {
        if ((await use_misc(mtmp)) !== 0) return 1;
    }

    const mdat = mtmp.data;
    // C: youprop.h Conflict (HConflict||EConflict) — worn RIN_CONFLICT via
    // hero_conflict until setworn oc_oprop is ported (D-0406/D-0413).
    const Conflict = hero_conflict();

    // C: MS_BRIBE demon_talk deferred (between muse and watch)
    // C ref: monmove.c dochug — watch_on_duty / mind_blast before wield
    if (is_watch(mdat)) {
        await watch_on_duty(mtmp);
    } else if (is_mind_flayer(mdat) && !rn2(20)) {
        // mind_blast deferred — still burn rn2(20) gate only when watch N/A
        // Named omission: mind_blast body + set_apparxy/distfleeck refresh
    }

    // C ref: monmove.c dochug — nearby AT_WEAP may spend the turn wielding
    if ((!mtmp.mpeaceful || Conflict) && inrange
        && dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy) <= 8
        && is_armed(mdat)) {
        const mw_tmp = MON_WEP(mtmp);
        if (!(scared && mw_tmp && is_pick(mw_tmp))
            && (mtmp.weapon_check | 0) === NEED_WEAPON
            && !(mtmp.mtrapped && !nearby && select_rwep(mtmp))) {
            mtmp.weapon_check = NEED_HTH_WEAPON;
            if ((await mon_wield_item(mtmp)) !== 0) return 0;
        }
    }

    // C: short-circuit OR — wanderer rn2(4) is evaluated before mpeaceful
    // Named omission: S_LEPRECHAUN findgold arm (between minvis and wanderer).
    const want_move = (
        !nearby
        || mtmp.mflee
        || scared
        || mtmp.mconf
        || mtmp.mstun
        || (mtmp.minvis && !rn2(3))
        || (is_wanderer(mdat) && !rn2(4))
        || (Conflict && !mtmp.iswiz)
        || (!mtmp.mcansee && !rn2(4))
        || mtmp.mpeaceful
    );

    let status = MMOVE_NOTHING;
    let panicattk = false;
    // PHASE THREE: move if not adjacent-hostile (attack path)
    if (want_move) {
        // C ref: monmove.c dochug — undirected castmu before m_move
        const uxy = game.u || {};
        if (!mtmp.mspec_used
            && dist2(mtmp.mx, mtmp.my, uxy.ux, uxy.uy) <= 49) {
            const slots = mdat?.mattk || [];
            for (let i = 0; i < NATTK && i < slots.length; i++) {
                const a = slots[i];
                if ((a?.aatyp | 0) === AT_MAGC
                    && ((a.adtyp | 0) === AD_SPEL
                        || (a.adtyp | 0) === AD_CLRC)) {
                    if (((await castmu(mtmp, a, false, false)) & M_ATTK_HIT) !== 0) {
                        status = MMOVE_DONE;
                        break;
                    }
                }
            }
        }
        if (status === MMOVE_NOTHING) {
            status = await m_move(mtmp, 0);
        }
        // C ref: monmove.c dochug — off-map after m_move skips 2nd distfleeck
        if (mon_offmap(mtmp)) return 1;
        if (status !== MMOVE_DIED) {
            ({ inrange, nearby, scared } = distfleeck(mtmp));
        }
        if (status === MMOVE_NOMOVES && scared) panicattk = true;
        // C: monmove.c dochug switch — Hallu newsym after 2nd distfleeck
        // for NOMOVES/NOTHING/DONE (appearance still changes when idle).
        if (status === MMOVE_NOMOVES || status === MMOVE_NOTHING
            || status === MMOVE_DONE) {
            // C: vault guard vanished → behave as died (isgd deferred)
            if (game.u?.Hallucination && mtmp.mx) {
                newsym(mtmp.mx, mtmp.my);
            }
        }
        if (status === MMOVE_MOVED) {
            /* Monsters can move and then shoot on same turn;
               C: ranged_attk_available || AT_WEAP || find_offensive */
            if (nearby
                || !(ranged_attk_available(mtmp)
                    || is_armed(mdat)
                    || find_offensive(mtmp))) {
                // C: digesting engulfer can move and still attack same turn
                if (engulfing_u(mtmp)) {
                    return (await mattacku(mtmp)) ? 1 : 0;
                }
                return 0;
            }
            // else fall through to PHASE FOUR
        }
        // NOTHING/DONE/NOMOVES also fall through to attacks
    }

    // PHASE FOUR: C monmove.c — peaceful under Conflict still rolls
    // resist_conflict; then ((inrange && !scared) || panicattk) && !noattacks
    const u = game.u || {};
    const uhp = Upolyd(u) ? (u.mh | 0) : (u.uhp | 0);
    if (
        status !== MMOVE_DONE
        && (!mtmp.mpeaceful || (Conflict && !resist_conflict(mtmp)))
    ) {
        if (((inrange && !scared) || panicattk)
            && !noattacks(mdat)
            && uhp > 0) {
            if (await mattacku(mtmp)) return 1;
        }
    }
    return 0;
}

/**
 * C ref: monmove.c dochugw — move mon; stop occupation if newly spotted threat.
 * onscary stubbed false (Elbereth / sanctuary deferred).
 */
export async function dochugw(mtmp, chug) {
    const x = mtmp.mx;
    const y = mtmp.my;
    // C: skip canspotmon if occupation is Null
    const already_saw_mon = (chug && game.occupation) ? canspotmon(mtmp) : false;
    const rd = chug ? await dochug(mtmp) : 0;

    if (
        game.occupation && !rd
        && (game.u?.Hallucination || (!mtmp.mpeaceful && !noattacks(mtmp.data)))
        && mdistu(mtmp) <= (BOLT_LIM + 1) * (BOLT_LIM + 1)
        && (!already_saw_mon || !couldsee(x, y)
            || dist2(x, y, game.u.ux, game.u.uy) > (BOLT_LIM + 1) * (BOLT_LIM + 1))
        && canspotmon(mtmp) && couldsee(mtmp.mx, mtmp.my)
        && mtmp.mcanmove
        // onscary(u.ux, u.uy, mtmp) deferred → treat as not scary
    ) {
        await stop_occupation();
    }
    return rd;
}
