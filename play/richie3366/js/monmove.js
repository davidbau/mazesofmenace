// monmove.js — Monster AI movement (minimal RNG-faithful stubs).
// C ref: monmove.c — distfleeck, dochug, m_move, postmov, set_apparxy, mon_track_add.

import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';
import { dog_move, finish_meating } from './dogmove.js';
import { shk_move, gd_move, pri_move } from './shk.js';
import { newsym, pline } from './display.js';
import {
    dist2,
    distmin,
    monnear,
    mon_allowflags,
    mfndpos,
    m_at,
} from './mon.js';
import {
    is_wanderer, is_armed, passes_walls, nohands, verysmall,
    monsterNames, M1_SEE_INVIS, M1_AMORPHOUS, M1_NOTAKE, tunnels, needspick,
    can_track, likes_gold, likes_gems, likes_objs, likes_magic,
    throws_rocks, mindless, is_animal, strongmonst, is_mercenary,
    mon_knows_traps,
} from './monsters.js';
import { gettrack } from './track.js';
import { objects_at, obj_extract_self, splitobj } from './mkobj.js';
import {
    mintrap,
    NO_TRAP_FLAGS,
    Trap_Killed_Mon,
    Trap_Moved_Mon,
    Trap_Caught_Mon,
    t_at,
} from './trap.js';
import { mattacku } from './mhitu.js';
import { cansee, couldsee, vision_recalc, recalc_block_point, m_cansee } from './vision.js';
import {
    isok, ACCESSIBLE, IS_DOOR, IS_STWALL, IS_TREE,
    D_CLOSED, D_LOCKED, D_ISOPEN, D_NODOOR,
    D_BROKEN, D_TRAPPED, u_at, DISPLACED, Is_rogue_level,
    NEED_PICK_AXE, NEED_AXE, NEED_PICK_OR_AXE,
    P_AXE, P_PICK_AXE, W_WEP, SQSRCHRADIUS, COLNO, ROWNO, NATTK,
} from './const.js';
import {
    CLOAK_OF_DISPLACEMENT, COIN_CLASS, WEAPON_CLASS, ARMOR_CLASS,
    GEM_CLASS, FOOD_CLASS, AMULET_CLASS, POTION_CLASS, SCROLL_CLASS,
    WAND_CLASS, RING_CLASS, SPBOOK_CLASS, ROCK_CLASS, BALL_CLASS,
    objectNames,
} from './objects.js';
import { Monnam } from './do_name.js';
import { doname } from './objnam.js';
import { mpickobj } from './makemon.js';
import { may_dig, mdig_tunnel } from './dig.js';
import { MON_WEP, mon_wield_item } from './weapon.js';
import { lined_up } from './mthrowu.js';
import { acurrstr } from './attrib.js';

const CREDIT_CARD = objectNames.indexOf('CREDIT_CARD');
const SKELETON_KEY = objectNames.indexOf('SKELETON_KEY');
const LOCK_PICK = objectNames.indexOf('LOCK_PICK');
const GOLD_PIECE = objectNames.indexOf('GOLD_PIECE');
const ROCK = objectNames.indexOf('ROCK');
const BOULDER = objectNames.indexOf('BOULDER');
const CORPSE = objectNames.indexOf('CORPSE');
const MINERAL = 21; // obj.h
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
 * Named omission: searches_for_item; unicorn GEMSTONE; uball/uchain.
 */
function mon_would_take_item(mtmp, otmp) {
    const ptr = mtmp.data;
    const pctload = Math.trunc((curr_mon_load(mtmp) * 100) / max_mon_load(mtmp));
    if (mtmp.mtame && otmp.cursed) return false;
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

/** C ref: dogmove.c could_reach_item — flyer/swimmer/boulder omitted. */
function could_reach_item(_mtmp, _x, _y) {
    return true;
}

/**
 * C ref: mon.c mpickstuff — pick one wanted floor object underfoot.
 * Named omissions: shopkeeper inhishop; in_rooms shop rn2(25); is_mines_prize/
 * is_soko_prize; nymph/corpse specials; check_gear_next_turn; distant_name
 * side-effects (doname stand-in).
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
            const otmpname = doname(otmp3);
            if (game.flags?.verbose !== false) {
                await pline(`${Monnam(mtmp)} picks up ${otmpname}.`);
            }
        }
        obj_extract_self(otmp3);
        mpickobj(mtmp, otmp3);
        // check_gear_next_turn deferred
        newsym(mtmp.mx, mtmp.my);
        return true;
    }
    return false;
}

/**
 * C ref: monmove.c m_search_items — redirect gg toward interesting floor loot.
 * Named omissions: in_rooms shop rn2(25); hides_under; onscary; costly_spot
 * merchandise; is_mines_prize/is_soko_prize; helpless under-monster skip
 * beyond mcanmove/msleeping/mmove; searches_for_item via mon_would_take;
 * underfoot MMOVE_DONE short-circuit (kept deferred — D-0183; postmov now
 * has mpickstuff for MOVED/DONE).
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
                    // Underfoot interesting loot: C returns TRUE → postmov →
                    // mpickstuff (MMOVE_DONE). JS postmov still omits that
                    // pickup path; returning TRUE skipped mfndpos/mtrack while
                    // C kept approaching. Skip underfoot claim until DONE
                    // pickup is wired; distant redirects still set gg.
                    if (ix === omx && iy === omy) continue;
                    minr = distmin(omx, omy, xx, yy);
                    gg.x = ix;
                    gg.y = iy;
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
function m_digweapon_check(mtmp, nix, niy) {
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
    if ((mtmp.weapon_check | 0) >= NEED_PICK_AXE && mon_wield_item(mtmp)) {
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

/**
 * C ref: monmove.c can_fog — vampshifter fog form.
 * Named omission: full vampshifter / Protection_from_shape_changers.
 */
function can_fog(_mtmp) {
    return false;
}

/**
 * C ref: monmove.c set_apparxy — decide where monster thinks hero stands.
 * Covers Displaced / Invis / Underwater / already-know early exits.
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

/**
 * C ref: monmove.c postmov — after a successful step: traps then doors,
 * then shared OBJ_AT / mpickstuff for MOVED|DONE.
 * Branch envelope: D_CLOSED open / D_LOCKED unlock / smash doorbuster;
 * amorphous squeeze message; mb_trapped; mpickstuff one-object pickup.
 * Named omissions: vampshift fog; iron bars; engulfing_u; shop add_damage;
 * has_magic_key disarm; metallivorous/cube/corpse_eater meat*; maybe_spin_web;
 * hides_under; check_gear_next_turn. (shk/gd/priest via shk.js D-0205)
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
    // IRONBARS / engulfing_u deferred

    // C: possibly dig — can_tunnel && may_dig → mdig_tunnel (burns rnd(12)
    // even on open floor).
    if (can_tunnel && may_dig(mtmp.mx, mtmp.my)
        && await mdig_tunnel(mtmp)) {
        return MMOVE_DIED;
    }

    if (mtmp.mx) newsym(mtmp.mx, mtmp.my);
    } // end MMOVE_MOVED

    // C: shared MOVED|DONE floor pickup
    if (objects_at(mtmp.mx, mtmp.my) && mtmp.mcanmove) {
        // metallivorous / gelatinous cube / corpse_eater meat* deferred
        if (await mpickstuff(mtmp)) {
            mmoved = MMOVE_DONE;
        }
        // minvis newsym / maybe_spin_web / hides_under / shk deferred
    }

    return mmoved;
}

// C ref: monmove.c m_move() — pets → postmov(dog_move); else approach / track path
export async function m_move(mtmp, after) {
    const ptr = mtmp.data;
    // C: can_tunnel = tunnels(ptr) off Rogue level
    let can_tunnel = tunnels(ptr) && !Is_rogue_level(game.u?.uz);
    const can_open = !(nohands(ptr) || verysmall(ptr));
    // C: can_unlock = (can_open && monhaskey) || iswiz || is_rider
    const can_unlock = (can_open && monhaskey(mtmp, true))
        || !!mtmp.iswiz;
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

    // C: meating countdown — still eating skips dog_move / approach
    if (mtmp.meating) {
        mtmp.meating--;
        if ((mtmp.meating | 0) <= 0) finish_meating(mtmp);
        return MMOVE_DONE;
    }

    // C: if (mtmp->mtame) return postmov(..., dog_move(...), ...)
    if (mtmp.mtame) {
        const mmoved = await dog_move(mtmp, after);
        return postmov(mtmp, omx, omy, mmoved, can_tunnel, can_unlock, can_open);
    }

    // C ref: monmove.c m_move — shopkeeper / guard / priest special
    if (mtmp.isshk || mtmp.isgd || mtmp.ispriest) {
        let xm;
        if (mtmp.isshk) xm = await shk_move(mtmp);
        else if (mtmp.isgd) xm = gd_move(mtmp);
        else xm = pri_move(mtmp);

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

    // C: m_move starts with mtrapped → mintrap; still-caught → no move
    // (already handled above for all monsters)

    set_apparxy(mtmp);

    let ggx = mtmp.mux;
    let ggy = mtmp.muy;
    let appr = mtmp.mflee ? -1 : 1;
    if (mtmp.mconf) {
        appr = 0;
    } else if (mtmp.mpeaceful && !mtmp.isshk) {
        // C: peaceful (non-shk) → appr = 0
        appr = 0;
    } else {
        // C ref: monmove.c m_move should_see + gettrack
        const goalLoc = game.level?.at(ggx, ggy);
        const monLoc = game.level?.at(omx, omy);
        const should_see = !!(
            couldsee(omx, omy)
            && (!!goalLoc?.lit || !monLoc?.lit)
            && dist2(omx, omy, ggx, ggy) <= 36
        );
        // Named omission: Invis rn2(11); stalker/bat rn2(3); balks;
        // shortsighted.
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
    if (can_tunnel && needspick(ptr)
        && ((!mtmp.mpeaceful || game.Conflict || game.flags?.Conflict)
            && dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy) <= 8)) {
        can_tunnel = false;
    }

    const flag = mon_allowflags(mtmp);
    const mfp = { cnt: 0, poss: [], info: [] };
    const cnt = mfndpos(mtmp, mfp, flag);
    if (cnt === 0) {
        return MMOVE_NOMOVES;
    }

    let nix = omx;
    let niy = omy;
    let chcnt = 0;
    const jcnt = Math.min(MTSZ, cnt - 1);
    let nidist = dist2(nix, niy, ggx, ggy);
    let mmoved = MMOVE_NOTHING;


    for (let i = 0; i < cnt; i++) {
        const nx = mfp.poss[i].x;
        const ny = mfp.poss[i].y;
        let skip = false;

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
            || mmoved === MMOVE_NOTHING
        ) {
            nix = nx;
            niy = ny;
            nidist = ndist;
            mmoved = MMOVE_MOVED;
        }
    }

    if (mmoved === MMOVE_NOTHING) return MMOVE_NOTHING;

    // C: m_digweapon_check before place — may spend turn wielding dig tool
    if (m_digweapon_check(mtmp, nix, niy)) {
        return MMOVE_DONE;
    }

    // Attack-you square: C returns MMOVE_NOTHING (dochug falls through).
    if (nix === game.u.ux && niy === game.u.uy) {
        return MMOVE_NOTHING;
    }

    // C: place_monster + mon_track_add then postmov (mintrap on new cell)
    mtmp.mx = nix;
    mtmp.my = niy;
    mon_track_add(mtmp, omx, omy);
    return postmov(mtmp, omx, omy, MMOVE_MOVED, can_tunnel, can_unlock, can_open);
}

// C ref: monmove.c dochug()
export async function dochug(mtmp) {
    if (!mtmp.mcanmove) return 0;
    if (mtmp.msleeping) return 0; // disturb not needed: fill mons start awake


    set_apparxy(mtmp);
    let { inrange, nearby, scared } = distfleeck(mtmp);

    const mdat = mtmp.data;
    // C: short-circuit OR — wanderer rn2(4) is evaluated before mpeaceful
    const want_move = (
        !nearby
        || mtmp.mflee
        || scared
        || mtmp.mconf
        || mtmp.mstun
        || (mtmp.minvis && !rn2(3))
        || (is_wanderer(mdat) && !rn2(4))
        || (!mtmp.mcansee && !rn2(4))
        || mtmp.mpeaceful
    );


    let status = MMOVE_NOTHING;
    // PHASE THREE: move if not adjacent-hostile (attack path)
    if (want_move) {
        status = await m_move(mtmp, 0);
        if (status !== MMOVE_DIED) {
            ({ inrange, nearby, scared } = distfleeck(mtmp));
        }
        if (status === MMOVE_MOVED) {
            // C: monsters can move then shoot — fall through when !nearby
            // and AT_WEAP / ranged available (is_armed stand-in).
            if (nearby || !is_armed(mdat)) {
                return 0;
            }
            // else fall through to PHASE FOUR
        }
        // NOTHING/DONE/NOMOVES also fall through to attacks
    }

    // PHASE FOUR: attack hero if hostile + in range
    // C: ((inrange && !scared) || panicattk) && !noattacks — no nearby gate
    if (
        status !== MMOVE_DONE
        && !mtmp.mpeaceful
        && inrange
        && !scared
    ) {
        if (await mattacku(mtmp)) return 1;
    }
    return 0;
}

// C ref: monmove.c dochugw()
export async function dochugw(mtmp, chug) {
    if (chug) await dochug(mtmp);
    return 0;
}
