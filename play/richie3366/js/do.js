// do.js — miscellaneous hero actions from do.c.
// C ref: do.c — donull, dodown, doup, goto_level (ordinary stairs subset;
//         Punished unplacebc/placebc D-0915),
//         cmd_safety_prevention, dodrop/drop/dropx/dropy/dropz,
//         canletgo; flooreffects / boulder_hits_pool (D-0987);
//         doaltarobj / fire_damage / hot-ground potion (D-0992);
//         revive_corpse (D-1081 invent/floor rider; D-1212 MINVENT/CONTAINED;
//         D-1220 BURIED !is_zomb FALLTHROUGH impossible;
//         D-1222 Soundeffect se_scratching; D-1234 unique/pname
//         corpse_xname adjective).

import { game } from './gstate.js';
import { rn2, rnd, rn1, d } from './rng.js';
import { depth } from './hacklib.js';
import {
    STAIRS, LADDER, ECMD_OK, ECMD_TIME, ECMD_FAIL, ECMD_CANCEL,
    W_ARM, W_ARMC, W_ARMH, W_ARMS, W_ARMG, W_ARMF, W_ARMU, W_ARMOR,
    W_WEP, W_SWAPWEP, W_QUIVER, W_RINGL, W_RINGR, W_AMUL, W_TOOL,
    W_ACCESSORY, W_SADDLE, W_BALL, W_CHAIN, INVIS, CLAIRVOYANT, LOST_DROPPED,
    UTOTYPE_NONE, UTOTYPE_ATSTAIRS, UTOTYPE_FALLING, UTOTYPE_PORTAL,
    UTOTYPE_RMPORTAL, UTOTYPE_DEFERRED,
    VISITED, LFILE_EXISTS, RANGE_LEVEL,
    UNENCUMBERED, KILLED_BY, DISMOUNT_FELL, NO_KILLER_PREFIX,
    MAGIC_PORTAL, TIMEOUT, BLINDED, RLOC_NOMSG,
    ACH_HELL, ACH_MINE, ACH_SOKO,
    OBJ_FREE, OBJ_FLOOR, OBJ_INVENT, OBJ_MINVENT, OBJ_CONTAINED, OBJ_BURIED,
    CXN_SINGULAR,
    CONTAINED_TOO, BURIED_TOO, ER_DESTROYED, WT_SPLASH_THRESHOLD,
    TT_PIT, FIRE_RES, PIT,
    ROOM, CORR, DRAWBRIDGE_UP, TRAPDOOR, HOLE,
    IS_WATERWALL, IS_ALTAR, is_pit, is_hole, u_at, Has_contents,
    Is_container, Is_waterlevel, Is_airlevel,
    In_quest, In_endgame, In_mines, In_sokoban, Is_rogue_level,
    Is_astralevel,
    PRIMARYSET, ROGUESET,
    ERODE_BURN, EF_DESTROY,
    NHCORE_GETPOS_TIP, NHCORE_ENTER_TUTORIAL, NHCORE_LEAVE_TUTORIAL,
    NUM_NHCORE_CALLS,
    GETOBJ_EXCLUDE, GETOBJ_SUGGEST,
} from './const.js';
import {
    seetrap, t_at, delfloortrap, reset_utrap, water_damage, erode_obj,
    selftouch, uteetering_at_seen_pit, uescaped_shaft, maketrap,
} from './trap.js';
import {
    COIN_CLASS, SCROLL_CLASS, SPBOOK_CLASS, POTION_CLASS, objectNames,
} from './objects.js';
import {
    pline, Norep, docrt, flush_screen, flush_topl_more, newsym,
    mark_topline_prompt, assign_graphics, check_gold_symbol,
    You_feel, canseemon, canspotmon, impossible,
} from './display.js';
import { yn_function } from './getline.js';
import { vision_recalc, vision_reset, recalc_block_point, cansee, couldsee } from './vision.js';
import { clear_light_sources, relight_monsters } from './light.js';
import { clear_regions, in_out_region } from './region.js';
import {
    stairway_at,
    stairway_find_from,
    u_on_upstairs,
    u_on_dnstairs,
    u_on_sstairs,
    u_on_newpos,
    u_on_rndspot,
    mklev,
    fumaroles,
    movebubbles,
} from './mklev.js';
import {
    In_tutorial, at_dgn_entrance, print_level_annotation,
    recalc_mapseen, recbranch_mapseen,
} from './dungeon.js';
import { record_achievement } from './insight.js';
import { com_pager } from './questpgr.js';
import { keepdogs, losedogs, mon_catchup_elapsed_time } from './dog.js';
import { save_track, rest_track } from './track.js';
import { m_at, mnexto, hide_monst, wake_nearto, dist2, kill_genocided_monsters } from './mon.js';
import { enexto } from './teleport.js';
import {
    monster_nearby, losehp, finish_maybe_wail, maybe_half_phys,
    check_special_room, is_pool, is_lava, waterbody_name,
    notice_mon_off, notice_mon_on, notice_all_mons,
    impact_disturbs_zombies, set_uinwater,
} from './hack.js';
import { place_object, stackobj, weight, delobj, obj_extract_self,
    obj_nexto_xy, obj_meld, pudding_merge_message,
    save_timers, restore_timers, run_timers,
} from './mkobj.js';
import { ship_object, obj_delivery, container_impact_dmg } from './dokick.js';
import { doname, xname, the, The, vtense, an, yname, corpse_xname, is_plural, otense } from './objnam.js';
import { Monnam, Amonnam, Adjmonnam, mon_nam } from './do_name.js';
import { revive } from './zap.js';
import {
    compactify_invlets, near_capacity, learn_unseen_invent, encumber_msg,
    freeinv_core, getobj_take_count, getobj_apply_count, getobj_from_cmdq,
    getobj_display_pickinv,
} from './invent.js';
import { can_reach_floor, set_occupation } from './engrave.js';
import { pickup } from './pickup.js';
import { Fumbling } from './attrib.js';
import {
    welded, setuwep, setuswapwep, setuqwep, set_twoweap,
} from './wield.js';
import { setworn, confer_oc_oprop, recalc_telepat_range } from './do_wear.js';
import { addinv_nomerge } from './u_init.js';
import {
    is_art, set_artifact_intrinsic,
} from './artifact.js';
import { ART_EYES_OF_THE_OVERWORLD } from './generated/artifacts_data.js';
import { more_experienced, newexplevel } from './exper.js';
import {
    PM_TOURIST, PM_ROGUE, PM_WIZARD, monsterNames,
} from './generated/monsters_data.js';
import { dismount_steed } from './steed.js';
import { onquest, ok_to_quest } from './quest.js';
import { resurrect } from './wizard.js';
import { create_mplayers } from './mplayer.js';
import { bones_include_name } from './bones.js';
import {
    olfaction, passes_walls, throws_rocks, is_flyer, is_floater,
    amorphous, nolimbs, M1_SLITHY, MZ_SMALL, mons, is_rider,
} from './monsters.js';
import { placebc, unplacebc, drag_down, ballrelease } from './ball.js';
import { obj_resists } from './dogmove.js';
import { Soundeffect, se_scratching } from './sndprocs.js';

const PM_DEATH = monsterNames.indexOf('PM_DEATH');
const PM_PESTILENCE = monsterNames.indexOf('PM_PESTILENCE');
const PM_FAMINE = monsterNames.indexOf('PM_FAMINE');
const BOULDER = objectNames.indexOf('BOULDER');
const SPE_BOOK_OF_THE_DEAD = objectNames.indexOf('SPE_BOOK_OF_THE_DEAD');
const WAN_FIRE = objectNames.indexOf('WAN_FIRE');
const FIRE_HORN = objectNames.indexOf('FIRE_HORN');
const POT_OIL = objectNames.indexOf('POT_OIL');
const SCR_FIRE = objectNames.indexOf('SCR_FIRE');
const SPE_FIREBALL = objectNames.indexOf('SPE_FIREBALL');
const ICE_BOX = objectNames.indexOf('ICE_BOX');
const CHEST = objectNames.indexOf('CHEST');
const LARGE_BOX = objectNames.indexOf('LARGE_BOX');
const STATUE = objectNames.indexOf('STATUE');
const MUMMY_WRAPPING = objectNames.indexOf('MUMMY_WRAPPING');
const CORNUTHAUM = objectNames.indexOf('CORNUTHAUM');
/** C worn.c worn[] — hero slot pointer + mask (setnotworn). */
const WORN_SLOTS = [
    ['uarm', W_ARM],
    ['uarmc', W_ARMC],
    ['uarmh', W_ARMH],
    ['uarms', W_ARMS],
    ['uarmg', W_ARMG],
    ['uarmf', W_ARMF],
    ['uarmu', W_ARMU],
    ['uleft', W_RINGL],
    ['uright', W_RINGR],
    ['uwep', W_WEP],
    ['uswapwep', W_SWAPWEP],
    ['uquiver', W_QUIVER],
    ['uamul', W_AMUL],
    ['ublindf', W_TOOL],
    ['uball', W_BALL],
    ['uchain', W_CHAIN],
];
/**
 * C gi worn/ball pointers live outside struct you (decl.h). nhl_gamestate
 * memcpy of `u` must not clobber slots that setworn just restored.
 */
const YOU_GI_PTRS = new Set([
    ...WORN_SLOTS.map(([slot]) => slot),
    'uskin',
]);

/** C memcpy identity for obj/monst pointers inside struct you. */
function is_obj_ptr(v) {
    return !!(v && typeof v === 'object'
        && v.otyp != null
        && (v.where != null || v.o_id != null));
}
function is_mon_ptr(v) {
    return !!(v && typeof v === 'object'
        && (v.m_id != null || (v.mx != null && v.data != null)));
}
function clone_you_value(v, seen) {
    if (v === null || v === undefined) return v;
    if (typeof v !== 'object') return v;
    if (seen.has(v)) return seen.get(v);
    if (is_obj_ptr(v) || is_mon_ptr(v)) return v;
    if (Array.isArray(v)) {
        const a = new Array(v.length);
        seen.set(v, a);
        for (let i = 0; i < v.length; i++) {
            if (i in v) a[i] = clone_you_value(v[i], seen);
        }
        return a;
    }
    const o = {};
    seen.set(v, o);
    for (const k of Object.keys(v)) {
        o[k] = clone_you_value(v[k], seen);
    }
    return o;
}
function snapshot_you(u) {
    if (!u) return {};
    const bak = {};
    for (const k of Object.keys(u)) {
        if (YOU_GI_PTRS.has(k)) continue;
        bak[k] = clone_you_value(u[k], new WeakMap());
    }
    return bak;
}
function restore_you(u, bak) {
    if (!u || !bak) return;
    const cur_uz = u.uz;
    const cur_uz0 = u.uz0;
    for (const k of Object.keys(u)) {
        if (YOU_GI_PTRS.has(k)) continue;
        if (!(k in bak)) delete u[k];
    }
    for (const k of Object.keys(bak)) {
        if (YOU_GI_PTRS.has(k)) continue;
        u[k] = clone_you_value(bak[k], new WeakMap());
    }
    // C: some restored state would confuse the level change in progress
    u.uz = cur_uz;
    u.uz0 = cur_uz0;
}
function snapshot_disco() {
    return (game.disco || []).slice();
}
function restore_disco(bak) {
    if (!bak) return;
    if (!game.disco) {
        game.disco = bak.slice();
        return;
    }
    game.disco.length = bak.length;
    for (let i = 0; i < bak.length; i++) game.disco[i] = bak[i];
}
function snapshot_mvitals() {
    const mv = game.mvitals || [];
    const out = new Array(mv.length);
    for (let i = 0; i < mv.length; i++) {
        const s = mv[i];
        out[i] = s ? {
            born: s.born | 0,
            died: s.died | 0,
            mvflags: s.mvflags | 0,
            seen_close: s.seen_close | 0,
            photographed: s.photographed | 0,
        } : s;
    }
    return out;
}
function restore_mvitals(bak) {
    if (!bak) {
        game.mvitals = [];
        return;
    }
    const out = new Array(bak.length);
    for (let i = 0; i < bak.length; i++) {
        const s = bak[i];
        out[i] = s ? { ...s } : s;
    }
    game.mvitals = out;
}
function snapshot_spl_book() {
    const book = game.spl_book || [];
    return book.map((s) => (s ? {
        sp_id: s.sp_id | 0,
        sp_know: s.sp_know | 0,
        sp_lev: s.sp_lev | 0,
    } : s));
}
function restore_spl_book(bak) {
    if (!bak) return;
    if (!game.spl_book) {
        game.spl_book = bak.map((s) => (s ? { ...s } : s));
        return;
    }
    const book = game.spl_book;
    const n = Math.max(book.length, bak.length);
    for (let i = 0; i < n; i++) {
        const s = bak[i];
        if (!s) {
            if (book[i]) {
                book[i].sp_id = 0;
                book[i].sp_know = 0;
                book[i].sp_lev = 0;
            }
            continue;
        }
        if (!book[i]) book[i] = { sp_id: 0, sp_know: 0, sp_lev: 0 };
        book[i].sp_id = s.sp_id | 0;
        book[i].sp_know = s.sp_know | 0;
        book[i].sp_lev = s.sp_lev | 0;
    }
    book.length = bak.length;
}
/** C memset(svs.spl_book, 0, sizeof spl_book) after backup. */
function memset_spl_book() {
    const book = game.spl_book;
    if (!book) return;
    for (const s of book) {
        if (!s) continue;
        s.sp_id = 0;
        s.sp_know = 0;
        s.sp_lev = 0;
    }
}
function clear_oc_uname() {
    const objs = game.objects || [];
    for (let otyp = 0; otyp < objs.length; otyp++) {
        if (objs[otyp]?.oc_uname) objs[otyp].oc_uname = null;
    }
}
/**
 * C nhlua.c free_tutorial — leftover gmst_invent obfree + free backups.
 * Full obfree contents/timers deferred (do not delobj: that consumes rn2).
 */
function free_tutorial() {
    const stash = game.gmst_invent || [];
    while (stash.length) {
        const otmp = stash.shift();
        if (otmp) otmp.owornmask = 0;
    }
    game.gmst_invent = [];
    game.gmst_ubak = null;
    game.gmst_disco = null;
    game.gmst_mvitals = null;
}
/** C objclass.h DRAGON_HIDE — materials below are soft enough to burn in lava. */
const DRAGON_HIDE = 10;
/** C zap.c destroy_strings fire rows used by trap.c fire_damage. */
const FIRE_DESTROY_STRINGS = [
    null,
    ['boils and explodes', 'boil and explode'],
    ['ignites and explodes', 'ignite and explode'],
    ['catches fire and burns', 'catch fire and burn'],
    ['catches fire and burns', 'catch fire and burn'],
];

function Blind() {
    const u = game.u || {};
    // C youprop.h Blind ≡ (HBlinded || EBlinded) && !BBlinded
    // Do not trust sticky u.Blind — wipe/make_blinded must derive from props (D-0716).
    if (u.uroleplay?.blind) return true;
    return !!(((u.HBlinded | 0) || (u.EBlinded | 0)) && !(u.BBlinded | 0));
}
function Hallucination() {
    const u = game.u || {};
    if (u.Hallucination) return true;
    return !!((u.HHallucination | 0) && !(u.Halluc_resistance | 0));
}
/** C ref: youprop.h Levitation — (H||E) && !B. */
function Levitation() {
    const u = game.u || {};
    if (u.Levitation) return true;
    return !!(((u.HLevitation | 0) || (u.ELevitation | 0))
        && !(u.BLevitation | 0));
}
/** C ref: youprop.h Flying — (H||E) && !B; steed-flyer arm deferred. */
function Flying() {
    const u = game.u || {};
    if (u.Flying) return true;
    return !!(((u.HFlying | 0) || (u.EFlying | 0))
        && !(u.BFlying | 0));
}
/** C youprop.h Deaf — H/E Deaf or roleplay deaf. */
function Deaf() {
    const u = game.u || {};
    return !!((u.HDeaf | 0) || (u.EDeaf | 0) || u.uroleplay?.deaf || u.Deaf);
}
/** C youprop.h Passes_walls. */
function Passes_walls() {
    const u = game.u || {};
    return !!(u.Passes_walls || u.HPasses_walls || u.EPasses_walls);
}
/** C you.h Luck — u.uluck + u.moreluck. */
function Luck() {
    const u = game.u || {};
    return (u.uluck | 0) + (u.moreluck | 0);
}
/** C potion.c hcolor — Hallucination synonym deferred. */
function hcolor(colorword) {
    return colorword;
}
/** C objnam.c Tobjnam — The(xname) + optional otense verb. */
function Tobjnam(obj, verb) {
    let bp = The(xname(obj));
    if (verb) bp += ` ${otense(obj, verb)}`;
    return bp;
}
/** C objnam.c Yname2 — capitalized yname; floor ≈ The(xname). */
function Yname2(obj) {
    const s = the(xname(obj));
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
/** C objnam.c Doname2 — capitalized doname. */
function Doname2(obj) {
    const s = doname(obj);
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
async function There(line) {
    await pline(`There ${line}`);
}
/**
 * C worn.c w_blocks — mummy wrapping / cornuthaum / Eyes of the Overworld.
 */
function w_blocks_hero(o, m) {
    if (!o) return 0;
    if ((o.otyp | 0) === MUMMY_WRAPPING && (m & W_ARMC) !== 0) return INVIS;
    if ((o.otyp | 0) === CORNUTHAUM && (m & W_ARMH) !== 0
        && game.urole?.mnum !== PM_WIZARD) {
        return CLAIRVOYANT;
    }
    if (is_art(o, ART_EYES_OF_THE_OVERWORLD) && (m & W_TOOL) !== 0) {
        return BLINDED;
    }
    return 0;
}

/**
 * C worn.c setnotworn — pointer-walk worn[]; does not call setworn.
 * Clears oc_oprop extrinsic only for slots that currently point at obj.
 * Leaves owornmask bits when obj is not in the slot (tutorial restore flag).
 * Named omit: cancel_doff; monstunseesu_prop; update_inventory.
 * Exported for shopdig snatch (D-1016); tutorial stash/restore (D-1015/D-1020).
 */
export function setnotworn(obj) {
    if (!obj) return;
    const u = game.u || (game.u = {});
    if (u.twoweap && (obj === u.uwep || obj === u.uswapwep)) {
        set_twoweap(false);
    }
    let unworn = 0;
    for (const [slot, mask] of WORN_SLOTS) {
        if (u[slot] !== obj) continue;
        u[slot] = null;
        unworn |= mask;
        confer_oc_oprop(obj, mask, false);
        obj.owornmask = (obj.owornmask || 0) & ~mask;
        if (obj.oartifact) set_artifact_intrinsic(obj, false, mask);
        const blocked = w_blocks_hero(obj, mask);
        if (blocked) {
            if (!u.uprops) u.uprops = {};
            if (!u.uprops[blocked]) {
                u.uprops[blocked] = { intrinsic: 0, extrinsic: 0, blocked: 0 };
            }
            u.uprops[blocked].blocked =
                (u.uprops[blocked].blocked | 0) & ~mask;
        }
    }
    if (!u.uarm && game.iflags) game.iflags.tux_penalty = false;
    if ((game.flags?.weaponstatus && (unworn & W_WEP) !== 0)
        || (game.flags?.armorstatus && (unworn & W_ARMOR) !== 0)) {
        if (game.disp) game.disp.botl = true;
    }
    recalc_telepat_range();
}
/** C hack.h distu — squared distance from hero. */
function distu(x, y) {
    const u = game.u || {};
    return dist2(u.ux | 0, u.uy | 0, x | 0, y | 0);
}
/** C mondata.h m_in_air subset — flyer/floater. */
function m_in_air(mtmp) {
    return is_flyer(mtmp?.data) || is_floater(mtmp?.data);
}
async function You_hear(line) {
    if (Deaf()) return;
    await pline(`You hear ${line}`);
}
/**
 * C ref: hack.c u_locomotion — Lev/Fly verbs; poly locomotion() deferred.
 * @param {string} defWord
 */
function u_locomotion(defWord) {
    if (Levitation()) return 'float';
    if (Flying()) return 'fly';
    return defWord;
}

/**
 * C ref: trap.c fire_damage — burn containers/scrolls/books/potions;
 * else erode_obj ERODE_BURN|EF_DESTROY.
 * Branch envelope: catch_lit; statue/ice_box immune; chest/box/bag burn +
 * dump contents via flooreffects; luck gate when !force; scroll/spbook/
 * potion destroy_strings; erode burn.
 * Named omit: remove_worn_item polish beyond setnotworn; unpaid bill.
 * @returns {Promise<boolean>} true if object destroyed
 */
export async function fire_damage(obj, force, x, y) {
    if (!obj) return false;
    try {
        const { catch_lit } = await import('./apply.js');
        if (await catch_lit(obj)) return false;
    } catch { /* catch_lit optional */ }

    const in_sight = !Blind() && couldsee(x, y);
    const otyp = obj.otyp | 0;
    const Luck_v = Luck();

    if (Is_container(obj) || otyp === STATUE) {
        let chance;
        switch (otyp) {
        case STATUE:
        case ICE_BOX:
            return false;
        case CHEST:
            chance = 40;
            break;
        case LARGE_BOX:
            chance = 30;
            break;
        default:
            chance = 20;
            break;
        }
        if (!force && (Luck_v + 5) > rn2(chance)) return false;
        if (in_sight) await pline(`${Yname2(obj)} catches fire and burns.`);
        if (Has_contents(obj)) {
            if (in_sight) await pline('Its contents fall out.');
            let otmp = obj.cobj;
            while (otmp) {
                const ncobj = otmp.nobj;
                obj_extract_self(otmp);
                if (!(await flooreffects(otmp, x, y, ''))) {
                    place_object(otmp, x, y);
                }
                otmp = ncobj;
            }
        }
        setnotworn(obj);
        delobj(obj);
        return true;
    }
    if (!force && (Luck_v + 5) > rn2(20)) return false;

    if ((obj.oclass | 0) === SCROLL_CLASS || (obj.oclass | 0) === SPBOOK_CLASS) {
        if (otyp === SCR_FIRE || otyp === SPE_FIREBALL) return false;
        if (otyp === SPE_BOOK_OF_THE_DEAD) {
            if (in_sight) {
                await pline(`Smoke rises from ${the(xname(obj))}.`);
            }
            return false;
        }
        const dindx = (obj.oclass | 0) === SCROLL_CLASS ? 3 : 4;
        if (in_sight) {
            const plural = (obj.quan | 0) > 1;
            await pline(
                `${Yname2(obj)} ${FIRE_DESTROY_STRINGS[dindx][plural ? 1 : 0]}.`,
            );
        }
        setnotworn(obj);
        delobj(obj);
        return true;
    }
    if ((obj.oclass | 0) === POTION_CLASS) {
        const dindx = otyp !== POT_OIL ? 1 : 2;
        if (in_sight) {
            const plural = (obj.quan | 0) > 1;
            await pline(
                `${Yname2(obj)} ${FIRE_DESTROY_STRINGS[dindx][plural ? 1 : 0]}.`,
            );
        }
        setnotworn(obj);
        delobj(obj);
        return true;
    }
    if ((await erode_obj(obj, null, ERODE_BURN, EF_DESTROY)) === ER_DESTROYED) {
        return true;
    }
    return false;
}

/**
 * C ref: trap.c lava_damage — soft materials burn up; hard → fire_damage.
 * Named omit: carried useupall / remove_worn_item.
 * @returns {Promise<boolean>} true if object destroyed
 */
async function lava_damage(obj, x, y) {
    if (!obj) return false;
    const otyp = obj.otyp | 0;
    const ocls = obj.oclass | 0;
    if (obj_resists(obj, 0, 0) && otyp !== SPE_BOOK_OF_THE_DEAD) return false;
    const oc = game.objects?.[otyp];
    const mat = oc?.oc_material | 0;
    if (mat < DRAGON_HIDE
        && ocls !== SCROLL_CLASS && ocls !== SPBOOK_CLASS
        && (oc?.oc_oprop | 0) !== FIRE_RES
        && otyp !== WAN_FIRE && otyp !== FIRE_HORN
        && !obj.oerodeproof
        && !Has_contents(obj)) {
        if (cansee(x, y)) {
            const kicked = obj === game.kickedobj;
            const thrown = obj === game.thrownobj || obj === game._thrownobj;
            if (thrown || kicked) {
                await pline(`${is_plural(obj) ? 'They' : 'It'} ${otense(obj, 'burn')} up!`);
            } else {
                await pline(`You see ${doname(obj)} hit lava and burn up!`);
            }
        }
        delobj(obj);
        return true;
    }
    return fire_damage(obj, true, x, y);
}

/**
 * C ref: do.c doaltarobj — drop/land feedback + bknown on altar.
 * Named omit: livelog_printf conduct.
 */
export async function doaltarobj(obj) {
    if (!obj || Blind()) return;
    if ((obj.oclass | 0) !== COIN_CLASS) {
        if (!game.context?.mon_moving) {
            const uc = game.u?.uconduct;
            if (uc && !(uc.gnostic | 0)) uc.gnostic = (uc.gnostic | 0) + 1;
        }
    } else {
        obj.blessed = obj.cursed = 0;
    }
    if (obj.blessed || obj.cursed) {
        await There(
            `is ${an(hcolor(obj.blessed ? 'amber' : 'black'))} flash as ${
                doname(obj)
            } ${otense(obj, 'hit')} the altar.`,
        );
        if (!Hallucination()) obj.bknown = 1;
    } else {
        await pline(
            `${Doname2(obj)} ${otense(obj, 'land')} on the altar.`,
        );
        if ((obj.oclass | 0) !== COIN_CLASS) obj.bknown = 1;
    }
}

/**
 * C ref: do.c flooreffects — special landings for free objects.
 * Branch envelope: boulder_hits_pool; boulder plugs pit/hole; lava_damage;
 * pool water_damage + splash; uteetering pit tumble; uescaped shaft ship_object;
 * globby pudding_merge/obj_meld (D-0993); mon_moving doaltarobj;
 * hot-ground potion shatter (D-0992).
 * Named omit: boulder+pit hmon/mondied; Soundeffect; shrink ice polish.
 * @returns {Promise<boolean>} true if object is gone (caller must not place)
 */
export async function flooreffects(obj, x, y, verb) {
    if (!obj) return false;
    if ((obj.where | 0) !== OBJ_FREE && obj.where != null) {
        // C panic — tolerate and treat as free for port resilience
        obj.where = OBJ_FREE;
    }
    obj.nobj = obj.nexthere = null;

    const save = game._bhitpos ? { ...game._bhitpos } : null;
    game._bhitpos = { x: x | 0, y: y | 0 };

    let res = false;
    const t0 = t_at(x, y);
    const lev = game.level?.at?.(x, y);
    const ltyp = lev?.typ;

    if ((obj.otyp | 0) === BOULDER
        && await boulder_hits_pool(obj, x, y, false)) {
        res = true;
    } else if ((obj.otyp | 0) === BOULDER && t0
        && (is_pit(t0.ttyp) || is_hole(t0.ttyp))) {
        const ttyp = t0.ttyp;
        const tseen = !!t0.tseen;
        const mtmp = m_at(x, y);
        if ((mtmp && mtmp.mtrapped) || (game.u?.utrap && u_at(x, y))) {
            if (verb && (cansee(x, y) || distu(x, y) === 0)) {
                await pline(
                    `${Blind() ? 'A' : 'The'} boulder ${vtense(null, verb)} into the pit${
                        mtmp ? '' : ' with you'
                    }.`,
                );
            }
            if (mtmp) {
                mtmp.mtrapped = 0;
                // hmon / mondied deferred
            } else if (!Passes_walls()
                && !throws_rocks(game.youmonst?.data)) {
                await losehp(
                    maybe_half_phys(rnd(15)),
                    'squished under a boulder',
                    NO_KILLER_PREFIX,
                );
            } else {
                reset_utrap(true);
            }
        }
        if (verb) {
            if (Blind() && u_at(x, y)) {
                await You_hear('a CRASH! beneath you.');
            } else if (!Blind() && cansee(x, y)) {
                await pline(
                    `The boulder ${
                        (ttyp === TRAPDOOR && !tseen) ? 'triggers and ' : ''
                    }${
                        ttyp === TRAPDOOR ? 'plugs a trap door'
                            : ttyp === HOLE ? 'plugs a hole'
                                : 'fills a pit'
                    }.`,
                );
            } else {
                await You_hear(`a boulder ${verb}.`);
            }
        }
        const t = t_at(x, y);
        if (t) {
            delfloortrap(t);
            if (game.u?.utrap && u_at(x, y)) reset_utrap(false);
        }
        // useupf → delobj (obj already free; still burns resists rn2)
        delobj(obj);
        try {
            const { bury_objs } = await import('./dig.js');
            await bury_objs(x, y);
        } catch { /* optional */ }
        newsym(x, y);
        res = true;
    } else if (is_lava(x, y)) {
        res = await lava_damage(obj, x, y);
    } else if (is_pool(x, y)) {
        if ((Blind() || Levitation() || Flying()) && !Deaf() && u_at(x, y)) {
            if (!game.u?.Underwater) {
                if (weight(obj) > WT_SPLASH_THRESHOLD) {
                    await pline('Splash!');
                } else if (Levitation() || Flying()) {
                    await pline('Plop!');
                }
            }
            // map_background deferred
            newsym(x, y);
        }
        res = (await water_damage(obj, null, false)) === ER_DESTROYED;
    } else if (u_at(x, y) && t0
        && (uteetering_at_seen_pit(t0) || uescaped_shaft(t0))) {
        if (is_pit(t0.ttyp)) {
            const the_your = t0.madeby_u ? 'your' : 'the';
            if (Blind() && !Deaf()) {
                await You_hear(`${the(xname(obj))} tumble downwards.`);
            } else {
                await pline(
                    `${The(xname(obj))} ${otense(obj, 'tumble')} into ${the_your} pit.`,
                );
            }
            // object still places into pit (C does not destroy here)
        } else if (await ship_object(obj, x, y, false)) {
            res = true;
        }
    } else if (obj.globby) {
        // C: while obj_nexto_xy → pudding_merge_message + obj_meld
        let globbyobj = obj;
        while (globbyobj) {
            const otmp = obj_nexto_xy(globbyobj, x, y, true);
            if (!otmp) break;
            await pudding_merge_message(globbyobj, otmp);
            const r1 = { obj: globbyobj };
            const r2 = { obj: otmp };
            obj_meld(r1, r2);
            globbyobj = r1.obj;
        }
        res = !globbyobj;
    } else if (game.context?.mon_moving && IS_ALTAR(ltyp) && cansee(x, y)) {
        await doaltarobj(obj);
    } else if ((obj.oclass | 0) === POTION_CLASS
        && (game.level?.flags?.temperature | 0) > 0
        && (ltyp === ROOM || ltyp === CORR)) {
        // C: heat-up message always when visible, then survival chance
        if (cansee(x, y)) {
            await pline(
                `${Tobjnam(obj, 'heat')} up as ${
                    is_plural(obj) ? 'they hit' : 'it hits'
                } the hot ground.`,
            );
        }
        let survival_chance = obj.blessed ? 70 : 50;
        if (obj.invlet) survival_chance += Luck() * 2;
        if ((obj.otyp | 0) === POT_OIL) survival_chance = 100;
        if (!obj_resists(obj, survival_chance, 100)) {
            if (cansee(x, y)) {
                await pline(
                    `${is_plural(obj) ? 'They shatter' : 'It shatters'} from the heat!`,
                );
            } else {
                await You_hear('a shattering noise.');
            }
            const { breakobj } = await import('./dothrow.js');
            await breakobj(obj, x, y, false, false);
            res = true;
        }
    }

    if (save) game._bhitpos = save;
    else delete game._bhitpos;
    return res;
}

/**
 * C ref: do.c boulder_hits_pool — boulder fills/sinks in pool or lava.
 * Branch envelope: fills_up chance; ROOM morph / bury_objs; splash msgs;
 * wake_nearto; adjacent lava dmg; obfree (!pushing).
 * Named omit: DRAWBRIDGE_UP mask polish; pushing useupf; steed whobuf;
 * Fire_resistance lava dmg; burn_away_slime. Dry-land set_uinwater is
 * D-1267.
 * @returns {Promise<boolean>}
 */
export async function boulder_hits_pool(otmp, rx, ry, pushing) {
    if (!otmp || (otmp.otyp | 0) !== BOULDER) return false;
    if (!(is_pool(rx, ry) || is_lava(rx, ry))) return false;

    const lava = is_lava(rx, ry);
    const what = waterbody_name(rx, ry);
    const lev = game.level?.at?.(rx, ry);
    const ltyp = lev?.typ;
    const chance = rn2(10);
    let fills_up = false;
    if (Is_waterlevel(game.u?.uz)) {
        fills_up = false;
    } else if (IS_WATERWALL(ltyp)) {
        fills_up = chance < 5;
    } else if (lava) {
        fills_up = chance === 0;
    } else {
        fills_up = chance !== 0;
    }

    const u = game.u || {};
    if (fills_up && lev) {
        if (ltyp === DRAWBRIDGE_UP) {
            // drawbridgemask floor morph deferred — treat as ROOM
            lev.typ = ROOM;
            lev.flags = 0;
        } else {
            lev.typ = ROOM;
            lev.flags = 0;
            recalc_block_point(rx, ry);
        }
        const mtmp = m_at(rx, ry);
        if (mtmp && !(mtmp.mhp <= 0) && !m_in_air(mtmp)) {
            // mondied deferred — clear trapped only for thin fortress
            mtmp.mtrapped = 0;
        }
        const ttmp = t_at(rx, ry);
        if (ttmp) delfloortrap(ttmp);
        try {
            const { bury_objs } = await import('./dig.js');
            await bury_objs(rx, ry);
        } catch {
            /* bury_objs optional */
        }
        newsym(rx, ry);
        if (pushing) {
            await pline(`You push ${the(xname(otmp))} into the ${what}.`);
            if (game.flags?.verbose && !Blind()) {
                await pline('Now you can cross it!');
            }
        }
    }
    if (!fills_up || !pushing) {
        if (!u.uinwater) {
            if (pushing ? !Blind() : cansee(rx, ry)) {
                await pline(
                    `There is a large splash as ${the(xname(otmp))} ${
                        fills_up ? 'fills' : 'falls into'
                    } the ${what}.`,
                );
            } else if (!Deaf()) {
                await You_hear(`a${lava ? ' sizzling' : ''} splash.`);
            }
            await wake_nearto(rx, ry, 40);
        }
        if (fills_up && u.uinwater && distu(rx, ry) === 0) {
            await set_uinwater(0); /* C do.c:128 — leave the water */
            docrt();
            game.vision_full_recalc = 1;
            await pline('You find yourself on dry land again!');
        } else if (lava && distu(rx, ry) <= 2) {
            // next2u approx: Chebyshev ≤1 → dist2 ≤ 2
            const Fire_resistance = !!(u.Fire_resistance
                || u.HFire_resistance || u.EFire_resistance);
            await pline(`You are hit by molten lava${Fire_resistance ? '.' : '!'}`);
            let dmg = 0;
            const ndice = Fire_resistance ? 1 : 3;
            for (let i = 0; i < ndice; i++) dmg += 1 + rn2(6);
            await losehp(maybe_half_phys(dmg), 'molten lava', KILLED_BY);
        } else if (!fills_up && game.flags?.verbose
            && (pushing ? !Blind() : cansee(rx, ry))) {
            await pline('It sinks without a trace!');
        }
    }
    // boulder gone — !pushing uses obfree (no obj_resists)
    otmp.quan = 0;
    otmp.where = OBJ_FREE;
    otmp.nobj = otmp.nexthere = null;
    return true;
}

/**
 * C ref: do.c familiar_level_msg — rn2(4) deja-vu / hallu variants.
 */
async function familiar_level_msg() {
    const fam_msgs = [
        'You have a sense of deja vu.',
        "You feel like you've been here before.",
        'This place %s familiar...',
        null,
    ];
    const halu_fam_msgs = [
        'Whoa!  Everything %s different.',
        'You are surrounded by twisty little passages, all alike.',
        'Gee, this %s like uncle Conan\'s place...',
        null,
    ];
    const which = rn2(4);
    let mesg = Hallucination() ? halu_fam_msgs[which] : fam_msgs[which];
    if (mesg && mesg.includes('%')) {
        mesg = mesg.replace('%s', Blind() ? 'seems' : 'looks');
    }
    if (mesg) await pline(mesg);
}

/**
 * C invent.c useupall subset for nhl_gamestate restore — setnotworn+freeinv.
 * obfree contents / obj_resists deferred (do not delobj: that consumes rn2).
 */
function useupall_gamestate(obj) {
    if (!obj) return;
    setnotworn(obj);
    const inv = game.invent || [];
    const idx = inv.indexOf(obj);
    if (idx >= 0) inv.splice(idx, 1);
    obj.where = OBJ_FREE;
}

/**
 * C worn.c setworn(otmp, wornmask) for nhl_gamestate restore.
 * JS setworn is armor/accessory/ball/chain; weapons go through setu*.
 */
function setworn_restore(otmp, wornmask) {
    if (!otmp || !wornmask) return;
    if (wornmask & W_WEP) setuwep(otmp);
    if (wornmask & W_SWAPWEP) setuswapwep(otmp);
    if (wornmask & W_QUIVER) setuqwep(otmp);
    const rest = wornmask & ~(W_WEP | W_SWAPWEP | W_QUIVER);
    if (rest) setworn(otmp, rest);
}

/**
 * C ref: nhlua.c nhl_gamestate(false) via tutorial_enter / tutorial(TRUE).
 * Stash invent (preserve owornmask as restore flag) via setnotworn+freeinv
 * so extrinsics clear and find_ac → base 10. Backup u/disco/mvitals/spl_book
 * then memset spells. Named omit: leftover `obfree` contents/timers.
 */
function tutorial_enter_gamestate() {
    if (game.gmst_stored) return;
    game.gmst_moves = game.moves | 0;
    const stash = [];
    const inv = game.invent || [];
    while (inv.length) {
        const otmp = inv[0];
        const wornmask = otmp.owornmask || 0;
        // C nhl_gamestate: setnotworn(otmp); freeinv(otmp);
        // otmp->owornmask = wornmask (restore flag, not currently worn)
        setnotworn(otmp);
        inv.shift();
        otmp.owornmask = wornmask;
        stash.unshift(otmp); // C prepends gmst_invent
    }
    game.invent = [];
    game.gmst_invent = stash;
    game._lastinvnr = 51; // C gl.lastinvnr — next letter 'a'
    game.gmst_ubak = snapshot_you(game.u);
    game.gmst_disco = snapshot_disco();
    game.gmst_mvitals = snapshot_mvitals();
    game.gmst_spl_book = snapshot_spl_book();
    memset_spl_book();
    game.gmst_stored = true;
}

/**
 * C ref: nhlua.c nhl_gamestate(true) via tutorial_leave / tutorial(FALSE).
 * useupall tutorial invent; addinv_nomerge stash + setworn from flag;
 * memcpy u (keep uz/uz0) / disco / mvitals; clear oc_uname; init_uhunger;
 * free_tutorial; memcpy spl_book. Named omit: leftover obfree contents;
 * update_inventory redraw. `nhcore_call_available` disable is tutorial().
 */
async function tutorial_leave_gamestate() {
    if (!game.gmst_stored) return;

    game.moves = game.gmst_moves | 0;
    await pline(`Resetting time to move #${game.moves}.`);
    game.gmst_moves = 0;

    game._lastinvnr = 51;
    const inv = game.invent || (game.invent = []);
    while (inv.length) useupall_gamestate(inv[0]);

    const stash = game.gmst_invent || [];
    while (stash.length) {
        const otmp = stash.shift();
        const wornmask = otmp.owornmask || 0;
        otmp.owornmask = 0;
        await addinv_nomerge(otmp);
        if (wornmask) setworn_restore(otmp, wornmask);
    }
    restore_you(game.u, game.gmst_ubak);
    restore_disco(game.gmst_disco);
    restore_mvitals(game.gmst_mvitals);
    clear_oc_uname();
    const { init_uhunger } = await import('./eat.js');
    await init_uhunger();
    const splBak = game.gmst_spl_book;
    free_tutorial();
    game.gmst_stored = false;
    restore_spl_book(splBak);
    game.gmst_spl_book = null;
}

/** C nhlua.c nhl_gamestate — Lua nh.gamestate([restore]). */
export async function nhl_gamestate(reststate = false) {
    if (reststate) await tutorial_leave_gamestate();
    else tutorial_enter_gamestate();
}

/**
 * C ref: dat/nhlib.lua tutorial_enter via nhcore.lua enter_tutorial.
 * Named omit: nh.callback("cmd_before", "tutorial_cmd_before") and
 * nh.callback("end_turn", "tutorial_turn") (Lua NHCB; no VM).
 */
async function tutorial_enter() {
    await nhl_gamestate(false);
}

/**
 * C ref: dat/nhlib.lua tutorial_leave via nhcore.lua leave_tutorial.
 * Named omit: nh.callback(..., true) rm of cmd_before / end_turn.
 */
async function tutorial_leave() {
    await nhl_gamestate(true);
}

/**
 * C ref: nhlua.c nhcore_call_available — all TRUE after l_nhcore_init
 * loads nhcore.lua. Stored on `game` so resetGame matches a new process.
 */
function ensure_nhcore_available() {
    if (!game.nhcore_call_available
        || game.nhcore_call_available.length !== NUM_NHCORE_CALLS) {
        game.nhcore_call_available = new Array(NUM_NHCORE_CALLS).fill(true);
    }
    return game.nhcore_call_available;
}

/**
 * C ref: nhlua.c l_nhcore_call — skip if !available; if nhcore.<name> is
 * a Lua function, pcall it, else mark unavailable.
 * JS: ENTER/LEAVE → tutorial_enter/leave. GETPOS_TIP is a Lua function
 * (wired in getpos.js, not here). start/restore/moveloop/exit are
 * commented out in nhcore.lua so the first call disables them.
 */
export async function l_nhcore_call(callidx) {
    if (callidx < 0 || callidx >= NUM_NHCORE_CALLS) return;
    const avail = ensure_nhcore_available();
    if (!avail[callidx]) return;
    if (callidx === NHCORE_ENTER_TUTORIAL) {
        await tutorial_enter();
        return;
    }
    if (callidx === NHCORE_LEAVE_TUTORIAL) {
        await tutorial_leave();
        return;
    }
    // C: lua_type != LUA_TFUNCTION → available[callidx] = FALSE
    if (callidx !== NHCORE_GETPOS_TIP) avail[callidx] = false;
}

/**
 * C ref: nhlua.c tutorial — l_nhcore_call ENTER/LEAVE then, after
 * leaving, disable both so the hero cannot re-enter the tutorial.
 */
export async function tutorial(entering) {
    await l_nhcore_call(
        entering ? NHCORE_ENTER_TUTORIAL : NHCORE_LEAVE_TUTORIAL,
    );
    if (!entering) {
        const avail = ensure_nhcore_available();
        avail[NHCORE_ENTER_TUTORIAL] = false;
        avail[NHCORE_LEAVE_TUTORIAL] = false;
    }
}

/**
 * C ref: do.c danger_uprops — Stoned/Slimed/Strangled/Sick.
 * Props not fully wired; return false until those states exist.
 */
function danger_uprops() {
    const u = game.u || {};
    return !!(u.Stoned || u.Slimed || u.Strangled || u.Sick);
}

/**
 * C ref: do.c cmd_safety_prevention — block wait/search beside hostiles.
 * safe_wait default On; menu_requested (`m` prefix) and multi skip the gate.
 * Named omissions: full danger_uprops bodies; visctrl/cmd_from_func beyond 'm'.
 *
 * @param {string} ucverb
 * @param {string} cmddesc
 * @param {string} act
 * @param {string} flagKey — game._safety_flags[flagKey] counter
 * @returns {Promise<boolean>} True → cancel command (ECMD_OK / no time)
 */
export async function cmd_safety_prevention(ucverb, cmddesc, act, flagKey) {
    if (!game._safety_flags) game._safety_flags = {};
    const flags = game.flags || {};
    const iflags = game.iflags || {};
    // C: flags.safe_wait default On
    if (flags.safe_wait !== false
        && !iflags.menu_requested
        && !(game.multi | 0)) {
        let assist = '';
        // C: iflags.cmdassist || !(*flagcounter)++
        // C optlist.h cmdassist → &iflags.cmdassist, default On.
        // (Was wrongly reading flags.cmdassist; Options `O` toggles iflags.)
        const cmdassist = iflags.cmdassist !== undefined
            ? !!iflags.cmdassist
            : true;
        if (cmdassist) {
            assist = `  Use 'm' prefix to force ${cmddesc}.`;
        } else {
            const prev = game._safety_flags[flagKey] | 0;
            game._safety_flags[flagKey] = prev + 1;
            if (!prev) assist = `  Use 'm' prefix to force ${cmddesc}.`;
        }

        if (monster_nearby()) {
            await Norep(`${act}${assist}`);
            return true;
        }
        if (danger_uprops()) {
            await Norep(`${ucverb} doesn't feel like a good idea right now.`);
            return true;
        }
    }
    game._safety_flags[flagKey] = 0;
    return false;
}

/**
 * C ref: do.c donull — '.' command: do nothing for one move.
 * Returns true if the command consumes time (ECMD_TIME).
 */
export async function donull() {
    if (await cmd_safety_prevention(
        'Waiting', 'a no-op (to rest)',
        'Are you waiting to get hit?',
        'did_nothing_flag',
    )) {
        return false; // ECMD_OK
    }
    return true; // ECMD_TIME
}

function ledger_no(lev) {
    const dnum = lev?.dnum | 0;
    const dlevel = lev?.dlevel | 0;
    const dun = game.dungeons?.[dnum];
    return ((dun?.ledger_start | 0) + dlevel) | 0;
}

function on_level(a, b) {
    return (a?.dnum | 0) === (b?.dnum | 0) && (a?.dlevel | 0) === (b?.dlevel | 0);
}

/** C ref: dungeon.h In_hell — dungeon hellish flag. */
function In_hell(lev) {
    return !!(game.dungeons?.[lev?.dnum | 0]?.flags?.hellish);
}

/** C ref: dungeon.h Is_valley — Lcheck(&valley_level). */
function Is_valley(lev) {
    return on_level(lev, game.valley_level);
}

function assign_level(dest, src) {
    dest.dnum = src.dnum | 0;
    dest.dlevel = src.dlevel | 0;
}

function depth_of(lev) {
    const dun = game.dungeons?.[lev?.dnum | 0];
    if (!dun) return lev?.dlevel | 0;
    return ((dun.depth_start | 0) || 1) + (lev.dlevel | 0) - 1;
}

function stairway_free_all() {
    game.stairs = null;
}

/**
 * C ref: dungeon.c next_level — ordinary downstairs / hole follow-on.
 */
export async function next_level(at_stairs) {
    const u = game.u;
    const stway = stairway_at(u.ux, u.uy);
    if (at_stairs && stway) stway.u_traversed = true;

    const newlevel = { dnum: 0, dlevel: 1 };
    if (at_stairs && stway) {
        newlevel.dnum = stway.tolev.dnum | 0;
        newlevel.dlevel = stway.tolev.dlevel | 0;
    } else {
        newlevel.dnum = u.uz?.dnum | 0;
        newlevel.dlevel = (u.uz?.dlevel | 0) + 1;
    }
    await goto_level(newlevel, at_stairs, !at_stairs, false);
}

/**
 * C ref: dungeon.c prev_level — ordinary upstairs / rise-through-ceiling.
 */
export async function prev_level(at_stairs) {
    const u = game.u;
    const stway = stairway_at(u.ux, u.uy);
    if (at_stairs && stway) stway.u_traversed = true;

    const newlevel = { dnum: 0, dlevel: 1 };
    if (at_stairs && stway && (stway.tolev.dnum | 0) !== (u.uz?.dnum | 0)) {
        // Up dungeon branch — amulet/escape arms deferred
        newlevel.dnum = stway.tolev.dnum | 0;
        newlevel.dlevel = stway.tolev.dlevel | 0;
    } else {
        newlevel.dnum = u.uz?.dnum | 0;
        newlevel.dlevel = (u.uz?.dlevel | 0) - 1;
    }
    await goto_level(newlevel, at_stairs, false, false);
}

/** Rebuild floor object index after in-memory getlev restore. */
function rebuildObjectsAt(fobj) {
    game._objects_at = new Map();
    const stack = [];
    for (let o = fobj; o; o = o.nobj) stack.push(o);
    for (let i = stack.length - 1; i >= 0; i--) {
        const otmp = stack[i];
        otmp.nexthere = null;
        const key = `${otmp.ox},${otmp.oy}`;
        const cur = game._objects_at.get(key) || null;
        otmp.nexthere = cur;
        game._objects_at.set(key, otmp);
    }
}

/**
 * C ref: restore.c getlev — non-bones monster catchup + hide_monst rnd(10).
 * In-memory stash path (no NHFILE). Named omissions: ghostly peace remap,
 * restore_cham, worm/timer/region restore, steed/ustuck mid remap.
 */
function getlev_catchup_monsters(elapsed) {
    const u = game.u;
    const list = game.fmon || [];
    for (const mtmp of list) {
        // C: if (!u.uz.dlevel || restoring==REST_LEVELS) continue
        if (!(u?.uz?.dlevel | 0)) continue;
        if (elapsed > 0) mon_catchup_elapsed_time(mtmp, elapsed);
        // restore_cham deferred
        if (elapsed > 0 && elapsed > rnd(10)) hide_monst(mtmp);
    }
}

/**
 * C ref: do.c goto_level — ordinary stairs + in-memory savelev/getlev.
 *
 * Ported: keepdogs → stash (VISITED|LFILE_EXISTS + omoves + track) →
 * assign uz → mklev or restore stash + getlev catchup + rest_track →
 * stairway_find_from → climb/descend pline (Flying / encumber|Punished|
 * Fumbling fall `rnd(3)` losehp / ordinary) → losedogs →
 * kill_genocided_monsters (D-1190) → run_timers (D-1191) →
 * vision/docrt → pickup(1).
 * Ported: `set_uinwater(0)` on leave and after getlev/mklev (D-1267).
 * Ported: portal MAGIC_PORTAL find / missing → u_on_rndspot (D-0594).
 * Ported: quest entrance `com_pager(quest_portal*)` (D-0650).
 * Ported: quest-home gate — on qstart && !newdungeon && !ok_to_quest()
 * → "mysterious force prevents you from descending" (D-0798).
 * Deferred: binary NHFILE, Gehennom amulet mysteryforce, quest gate seal
 * RMPORTAL, endgame `final_level` reset_hostility / gain_guardian_angel /
 * ACH_ENDG/ASTR (create_mplayers live D-1596), migrating-Wizard resurrect arm,
 * Punished `ballfall` on trap-door falling, W-tower `u_on_rndspot` bit 2
 * (rndspot itself awaits switch_terrain D-1278; stairs u_on_sstairs
 * fallback is D-1287; cmd.c makemap_prepost amulet|wiztower is D-1288),
 * Lua NHCB_LVL_LEAVE, MICRO display_nhwindow after Valley odor;
 * ACH_BGRM; poly `locomotion()` climb verb / steed-flyer Flying;
 * u_collide_m full limbo. Ported: Punished climb
 * `great_effort` + Flying ladder "along" (D-0928 #1159);
 * Punished `drag_down`/`ballrelease` on stair fall (D-0918);
 * `fix_shop_damage` catchup on !new after in_out_region (D-1178);
 * trap-door `do_fall_dmg` `d(max(dist,1),6)` after shop repair (D-1179);
 * `kill_genocided_monsters` after losedogs (D-1190);
 * `run_timers` after kill_genocided before u_collide_m (D-1191;
 * C `do.c:1818–1823`; destination + delivered-object timers that
 * expired while away);
 * `notice_mon_off` before docrt + `notice_mon_on` /
 * `notice_all_mons(TRUE)` after uz0 reset (D-1194; C `do.c:1839`,
 * `:1971–1972`; `reset_glyphmap` / vision_recalc caller still named);
 * In_quest `onquest`;
 * In_endgame `newdungeon`+amulet `resurrect` new-Wizard makemon + appear
 * Norep; `familiar_level_msg` via `bones_include_name` (D-0577);
 * Gehennom Valley arrival plines + `gehennom_entered` (D-0801);
 * ACH_HELL/MINE/SOKO `record_achievement` (D-0928 #1181);
 * hellish_smoke smell/sense smoke + heat/smoke gone (D-0801);
 * temperature_change_msg hot/cold (D-0559).
 */
export async function goto_level(newlevel, at_stairs, falling, portal) {
    const u = game.u;
    if (!u?.uz) return;

    // C: prev_temperature before mklev mutates level.flags.temperature
    const prev_temperature = (game.level?.flags?.temperature | 0);

    let up = depth_of(newlevel) < depth_of(u.uz);
    // C: dist = depth(newlevel) - depth(&u.uz) before uz reassignment.
    const dist = depth_of(newlevel) - depth_of(u.uz);
    let do_fall_dmg = false;
    const newdungeon = (u.uz.dnum | 0) !== (newlevel.dnum | 0);
    const new_ledger = ledger_no(newlevel);
    if (new_ledger <= 0) return; // C: done(ESCAPED)

    // C: do.c — tutorial(TRUE/FALSE) via nhcore when crossing tutorial branch.
    if (newdungeon) {
        if (In_tutorial(newlevel)) {
            game.flags = game.flags || {};
            game.flags.in_tutorial_branch = true;
            await tutorial(true);
        } else if (In_tutorial(u.uz)) {
            game.flags && (game.flags.in_tutorial_branch = false);
            await tutorial(false);
            up = false; // C: re-enter level 1 as if starting new game
        }
    }

    // C: prevent leaving quest Home deeper in-branch until ok_to_quest
    // (leader assigned / thanks / killed_leader). Same-dungeon only.
    // Named omission: Gehennom amulet mysteryforce arm above this gate.
    if (on_level(u.uz, game.qstart_level) && !newdungeon && !ok_to_quest()) {
        await pline('A mysterious force prevents you from descending.');
        return;
    }

    if (on_level(newlevel, u.uz)) return;

    // C: maybe_reset_pick(NULL); reset_trapset() before leaving
    try {
        const { reset_trapset } = await import('./apply.js');
        reset_trapset();
    } catch { /* apply optional */ }

    // C: if (!iflags.nofollowers) keepdogs(FALSE)
    if (!game.iflags?.nofollowers) keepdogs(false);
    // C: check_special_room(TRUE) on leave — move_update clears urooms so
    // arrival re-enters temple/shop messages (intemple).
    await check_special_room(true);
    // C: recalc_mapseen() before leaving — persist feat/msrooms on mapseen
    recalc_mapseen();
    // C: do.c goto_level — Punished unplacebc before savelev so ball&chain
    // are not left on the departing floor (D-0915).
    // C: Punished ≡ (uball != 0)
    if (u.uball || u.Punished) unplacebc();
    // C: reset_utrap / fill_pit / set_ustuck / u.uundetected still named.
    // set_uinwater(0) (D-1267; C do.c:1621). Same-value is a no-op.
    await set_uinwater(0);
    // Snapshot sight before vision_recalc(2) clears viz — getbones yn
    // needs prior IN_SIGHT to mon→memory newsym the leave-level gbuf.
    if (game.viz_array) {
        game._leave_viz_snapshot = {
            array: game.viz_array.map((row) => Uint8Array.from(row)),
            rmin: game._viz_rmin ? Array.from(game._viz_rmin) : null,
            rmax: game._viz_rmax ? Array.from(game._viz_rmax) : null,
        };
    } else {
        game._leave_viz_snapshot = null;
    }
    // C vision_recalc(2) burns Hallu display_warning on prior sight while
    // !cansee before level tear-down (D-0852). JS skips that loop inside
    // vision_recalc(2) (D-0583). Hallu-only: non-Hallu !cansee newsym
    // memory/waslit incompleteness regresses PASS cohort (#992).
    {
        const u = game.u || {};
        if (u.Hallucination
            || ((u.HHallucination | 0) && !(u.Halluc_resistance | 0))) {
            const { vision_off_newsym_gbuf } = await import('./vision.js');
            vision_off_newsym_gbuf({ useLiveViz: true });
            game._leave_viz_burned = true;
        }
    }
    vision_recalc(2);

    // C: do.c goto_level — discard level-local travel destination cache
    if (!game.iflags) game.iflags = {};
    if (!game.iflags.travelcc) game.iflags.travelcc = { x: 0, y: 0 };
    game.iflags.travelcc.x = 0;
    game.iflags.travelcc.y = 0;

    // C: savelev — in-memory stash + VISITED|LFILE_EXISTS + omoves timestamp
    // C: save_track before release/initrack (track.c) — per-level utrack.
    if (!game.level_info) game.level_info = [];
    const old_ledger = ledger_no(u.uz);
    const trackSnap = save_track(); // clears live ring (C release_data arm)
    if (old_ledger > 0) {
        const prev = game.level_info[old_ledger] || { flags: 0 };
        // C save.c savelev — Sfo_dest_area updest/dndest with the level.
        const snapDest = (d) => ({
            lx: d?.lx | 0, ly: d?.ly | 0, hx: d?.hx | 0, hy: d?.hy | 0,
            nlx: d?.nlx | 0, nly: d?.nly | 0, nhx: d?.nhx | 0, nhy: d?.nhy | 0,
        });
        // C save.c savelev — Sfo_schar lastseentyp[COLNO][ROWNO] with the
        // level (after savelevl). Without this, getlev left the prior
        // level's lastseentyp live and leave-time recalc_mapseen polluted
        // mapseen.feat (extra overview fountains).
        const snapLastseen = (lst) => {
            if (!lst) return null;
            return lst.map((row) => (row ? Array.from(row) : null));
        };
        game.level_info[old_ledger] = {
            flags: (prev.flags | 0) | VISITED | LFILE_EXISTS,
            omoves: game.moves | 0,
            level: game.level,
            fmon: game.fmon,
            fobj: game.fobj,
            ftrap: game.ftrap,
            stairs: game.stairs,
            head_engr: game.head_engr,
            track: trackSnap,
            // C savelev → save_regions; rest_regions on getlev
            regions: game.regions || [],
            updest: snapDest(game.updest),
            dndest: snapDest(game.dndest),
            lastseentyp: snapLastseen(game.lastseentyp),
            // C save.c savelev → save_timers(RANGE_LEVEL); release peels
            // local object/spot timers off gt.timer_base so they do not
            // fire while the hero is on another level (D-1037).
            timers: save_timers(RANGE_LEVEL),
        };
    }

    // C: do.c goto_level — Rogue↔Primary showsyms before u.uz reassignment
    if (Is_rogue_level(newlevel) || Is_rogue_level(u.uz)) {
        assign_graphics(Is_rogue_level(newlevel) ? ROGUESET : PRIMARYSET);
    }
    check_gold_symbol();

    // C: record seen branch for stairs/fall/portal (not level-teleport)
    if ((at_stairs || falling || portal)
        && ((u.uz.dnum | 0) !== (newlevel.dnum | 0))) {
        recbranch_mapseen(u.uz, newlevel);
    }

    assign_level(u.uz0 || (u.uz0 = { dnum: 0, dlevel: 0 }), u.uz);
    assign_level(u.uz, newlevel);
    if (!u.utolev) u.utolev = { dnum: 0, dlevel: 0 };
    assign_level(u.utolev, newlevel);
    u.utotype = 0;
    // C: depth change → status refresh on next flush (getbones yn sees new Dlvl)
    if (!game.flags) game.flags = {};
    game.flags.botl = true;

    // C: dunlev_reached for non-builds_up
    const dun = game.dungeons?.[u.uz.dnum | 0];
    if (dun) {
        const dl = u.uz.dlevel | 0;
        if ((dun.dunlev_ureached | 0) < dl) dun.dunlev_ureached = dl;
    }

    stairway_free_all();
    // Detach live map pointers; mklev/getlev restores them.
    // C gbuf survives teardown; remember leave-level for getbones yn flush.
    game._leave_gbuf_level = game.level;
    game.fmon = null;
    game.fobj = null;
    game._objects_at = new Map();
    game.ftrap = null;
    game.head_engr = null;
    game.level = null;
    // Regions are per-level (C save_regions/clear_regions/rest_regions).
    // Detach now; mklev clear_level_structures also clear_regions; getlev
    // restores the stashed array.
    clear_regions();
    clear_light_sources();
    // C: memset updest/dndest before getlev/mklev; fixup_special re-fills.
    game.updest = { lx: 0, ly: 0, hx: 0, hy: 0, nlx: 0, nly: 0, nhx: 0, nhy: 0 };
    game.dndest = { lx: 0, ly: 0, hx: 0, hy: 0, nlx: 0, nly: 0, nhx: 0, nhy: 0 };

    const info = game.level_info[new_ledger];
    const exists = !!(info && ((info.flags | 0) & LFILE_EXISTS));
    const madeNew = !exists;
    let familiar = false;
    if (!exists) {
        await mklev();
        if (!game.level_info[new_ledger]) game.level_info[new_ledger] = { flags: 0 };
        // C: LFILE_EXISTS is set on savelev leave, not on first mklev.
        // Track ring: leave-path save_track already cleared; getbones
        // (inside mklev) rest_track's dead-hero utrack — do NOT initrack
        // here (C goto_level has no initrack after mklev; wiping would
        // drop bones gettrack for hostiles — D-0578).
        // C: familiar = bones_include_name(plname) after first-time mklev
        familiar = bones_include_name(game.plname || '');
    } else {
        // C: getlev — restore in-memory stash + catchup/hide_monst + rest_track
        // C restore.c Sfi_dest_area updest/dndest after rest_stairs.
        game.level = info.level;
        game.fmon = info.fmon || [];
        game.fobj = info.fobj || null;
        game.ftrap = info.ftrap || null;
        game.stairs = info.stairs || null;
        game.head_engr = info.head_engr || null;
        // C rest_regions — pre-stash levels omit regions → empty
        game.regions = info.regions || [];
        if (info.updest) game.updest = { ...info.updest };
        if (info.dndest) game.dndest = { ...info.dndest };
        // C restore.c getlev — Sfi_schar lastseentyp after rest_levl
        if (info.lastseentyp) {
            game.lastseentyp = info.lastseentyp.map(
                (row) => (row ? Array.from(row) : null),
            );
        } else {
            game.lastseentyp = null;
        }
        rebuildObjectsAt(game.fobj);
        restore_timers(info.timers);
        relight_monsters();
        rest_track(info.track);
        // C: Sokoban ≡ level.flags.sokoban_rules — sync JS alias after getlev
        // (clear_level_structures only runs on mklev, not stash restore).
        game.Sokoban = !!(game.level?.flags?.sokoban_rules
            || game.level?.flags?.sokoban);
        const elapsed = (game.moves | 0) - (info.omoves | 0);
        getlev_catchup_monsters(elapsed);
    }

    await set_uinwater(0); /* C do.c:1716 — after getlev/mklev, before vision_reset */
    vision_reset();
    game.vision_full_recalc = 0;
    // C: flush_screen(-1) postpone map/botl until after arrival plines + docrt
    await flush_screen(-1);

    // C: do.c goto_level — portal arm before stairs / rndspot
    if (portal && !In_endgame(u.uz)) {
        let ttrap = null;
        const traps = game.level?.traps;
        if (Array.isArray(traps)) {
            for (const t of traps) {
                if (t && (t.ttyp | 0) === MAGIC_PORTAL) {
                    ttrap = t;
                    break;
                }
            }
        }
        if (!ttrap) {
            for (let t = game.ftrap; t; t = t.ntrap) {
                if ((t.ttyp | 0) === MAGIC_PORTAL) {
                    ttrap = t;
                    break;
                }
            }
        }
        if (!ttrap) {
            // C: qexpelled quest return / missing portal → u_on_rndspot(0)
            await u_on_rndspot(0);
        } else {
            seetrap(ttrap);
            u_on_newpos(ttrap.tx, ttrap.ty);
        }
    } else if (at_stairs && !In_endgame(u.uz)) {
        const atLadder = !!game.at_ladder;
        if (up) {
            // C: stairway_find_from(&u.uz0, at_ladder) else sstairs/dnstairs
            const stway = stairway_find_from(u.uz0, atLadder);
            if (stway) {
                u_on_newpos(stway.sx, stway.sy);
                stway.u_traversed = true;
            } else if (newdungeon) {
                // C: u_on_sstairs(1) — dest upstairs implies moving down
                await u_on_sstairs(1);
            } else {
                await u_on_dnstairs();
            }
            // C: do.c goto_level — great_effort = Punished && !Levitation;
            // pline when flags.verbose || great_effort; u_locomotion +
            // Flying ladder " along".
            {
                const great_effort = !!(u.uball) && !Levitation();
                if (game.flags?.verbose !== false || great_effort) {
                    const along = (Flying() && atLadder) ? ' along' : '';
                    const what = atLadder ? 'ladder' : 'stairs';
                    await pline(
                        `${great_effort ? 'With great effort, you' : 'You'}`
                        + ` ${u_locomotion('climb')} up${along} the ${what}.`,
                    );
                }
            }
        } else {
            // C ordinary descent: find_from(uz0) else sstairs/upstairs
            const stway = stairway_find_from(u.uz0, atLadder);
            if (stway) {
                u_on_newpos(stway.sx, stway.sy);
                stway.u_traversed = true;
            } else if (newdungeon) {
                // C: u_on_sstairs(0) — dest dnstairs implies moving up
                await u_on_sstairs(0);
            } else {
                await u_on_upstairs();
            }
            // C: do.c goto_level descend — Flying / encumber|Punished|Fumbling
            // fall (rnd(3) losehp) / ordinary verbose climb-down.
            if (!(u.dz | 0)) {
                ; // stayed on same level? (no transit effects)
            } else if (u.Flying) {
                if (game.flags?.verbose !== false) {
                    await pline(atLadder
                        ? 'You fly down along the ladder.'
                        : 'You fly down the stairs.');
                }
            } else if (
                near_capacity() > UNENCUMBERED
                // C: youprop.h Punished ≡ (uball != 0) — not sticky u.Punished
                || u.uball
                // C: youprop.h Fumbling ≡ HFumbling || EFumbling (not sticky bool)
                || Fumbling()
            ) {
                await pline(atLadder
                    ? 'You fall down the ladder.'
                    : 'You fall down the stairs.');
                if (u.uball) {
                    // C: drag_down(); if (!welded(uball)) ballrelease(FALSE);
                    await drag_down();
                    if (!welded(u.uball)) await ballrelease(false);
                }
                if (u.usteed) {
                    await dismount_steed(DISMOUNT_FELL);
                } else {
                    // C: losehp(Maybe_Half_Phys(rnd(3)), …, KILLED_BY)
                    // → maybe_wail (You_hear --More--)
                    losehp(
                        maybe_half_phys(rnd(3)),
                        atLadder
                            ? 'falling off a ladder'
                            : 'tumbling down a flight of stairs',
                        KILLED_BY,
                    );
                    await finish_maybe_wail();
                }
                // C: selftouch("Falling, you") — cockatrice corpse petrify
                await selftouch('Falling, you');
            } else if (game.flags?.verbose !== false) {
                await pline(atLadder
                    ? 'You climb down the ladder.'
                    : 'You descend the stairs.');
            }
        }
    } else if (!at_stairs) {
        // C: trap door / level_tele / In_endgame → u_on_rndspot
        // Named omit: was_in_W_tower bit 2 (D-1179).
        await u_on_rndspot(up ? 1 : 0);
        if (falling) {
            // C do.c:1805–1809 — Punished && !welded(uball) ballfall still
            // named (ball.js). selftouch then do_fall_dmg (D-1179).
            await selftouch('Falling, you');
            do_fall_dmg = true;
        }
    }

    game.at_ladder = false;
    u.dz = 0;

    // C: do.c goto_level — Punished placebc after hero arrival, before
    // losedogs (D-0915). Without this, uchain.where stays non-FREE and
    // placebc is a no-op → ball stranded → false drag_ball cause_delay.
    if (u.uball || u.Punished) placebc();
    // C do.c:1815 — obj_delivery(FALSE) after placebc, before losedogs.
    // XOR delivers MIGR_WITH_HERO (trap-door objs landing at the hero).
    await obj_delivery(false);

    await losedogs();
    // C do.c:1817 — after losedogs, before run_timers / u_collide_m.
    // Migrating mons (and eggs) genocided while in limbo die here so
    // possessions land on this level.
    kill_genocided_monsters();
    // C do.c:1818–1823 — after losedogs + obj_delivery, before
    // u_collide_m. Expire timers that went off while away (restored
    // RANGE_LEVEL list + invent/migrating timers that save_timers
    // left on gt.timer_base because obj_is_local is false). Do not
    // peel invent/migrating here (D-1037).
    await run_timers();

    // C: u_collide_m if still co-located — rn2(2)+enexto path
    let mtmp = m_at(u.ux, u.uy);
    if (mtmp && mtmp !== u.usteed) {
        await u_collide_m(mtmp);
    }

    // C: do.c goto_level — movebubbles / fumaroles before vision_recalc
    // (allmain moveloop EOT twin D-1168).
    if (Is_waterlevel(u.uz) || Is_airlevel(u.uz)) {
        movebubbles();
    } else if (game.level?.flags?.fumaroles) {
        await fumaroles();
    }

    vision_reset();
    // C do.c:1839 — notice_mon_off after vision_reset / reset_glyphmap
    // (glyphmap still named), before docrt. Blocks vision.c
    // notice_all_mons(TRUE) until after arrival plines + uz0 reset
    // (D-1194). JS vision_recalc still omits that caller.
    notice_mon_off();
    // C: docrt → cls flushes NEED_MORE (--More-- on stale Dlvl:N map) then redraws
    await docrt();
    await flush_screen(-1); // un-postpone + flush new map/botl
    // Leave-level gbuf / viz snapshot only needed through getbones yn
    game._leave_gbuf_level = null;
    game._leave_viz_snapshot = null;
    game._leave_viz_burned = false;
    // C: vision_recalc is inside docrt only — do not call again here
    // (extra pass can re-newsym when seenv grows; Hallu display-RNG).

    // C: do.c goto_level — maybe_lvltport_feedback before onquest.
    // Short pline sets NEED_MORE without awaiting; qt_pager flushes it.
    if (game.dfr_post_msg) {
        const msg = game.dfr_post_msg;
        game.dfr_post_msg = null;
        await pline(msg);
    }
    // C: deliver_splev_message() before endgame/quest arrival arms
    await deliver_splev_message();
    // C: do.c goto_level — first entry into hellish dungeon
    // (!In_hell(uz0) && Inhell). Valley gets three arrival plines that
    // force --More-- after dfr_post_msg materialize (D-0801).
    {
        const inHellNow = In_hell(u.uz);
        const wasInHell = In_hell(u.uz0);
        if (!wasInHell && inHellNow) {
            if (Is_valley(u.uz)) {
                await pline('You arrive at the Valley of the Dead...');
                await pline('The odor of burnt flesh and decay pervades the air.');
                // C: Soundeffect then You_hear; Deaf/Underwater deferred
                if (!(u.Deaf || u.HDeaf || u.EDeaf)) {
                    await pline('You hear groans and moans everywhere.');
                }
            }
            // C: record_achievement(ACH_HELL) even for non-Valley entry
            record_achievement(ACH_HELL);
        }
        // C: bypass Valley stair → mark gehennom_entered
        if (inHellNow && !Is_valley(u.uz)) {
            if (!u.uevent) u.uevent = {};
            u.uevent.gehennom_entered = 1;
        }
    }
    // C: familiar after Valley / before endgame/quest arms
    if (familiar) await familiar_level_msg();
    // C: if (In_endgame) { … else if (newdungeon && amulet) resurrect(); }
    //     else if (In_quest) onquest();
    //     else if (Is_knox) … else if (In_mines) … else if (In_sokoban) …;
    //     else { rogue/bigroom ACH; quest_portal com_pager }
    if (In_endgame(u.uz)) {
        // ACH_ENDG named omit
        if (madeNew && Is_astralevel(u.uz)) {
            // C do.c final_level: iter_mons(reset_hostility) named omit
            create_mplayers(rn1(4, 3), true);
            // C: gain_guardian_angel(); ACH_ASTR named omit
        } else if (newdungeon && (u.uhave?.amulet || u.uhave_amulet)) {
            await resurrect();
        }
    } else if (In_quest(u.uz)) {
        await onquest();
    } else if (In_mines(u.uz)) {
        if (newdungeon) record_achievement(ACH_MINE);
    } else if (In_sokoban(u.uz)) {
        if (newdungeon) record_achievement(ACH_SOKO);
    } else {
        // C: new && Is_rogue_level → primitive-world pline (forces --More--
        // after dfr_post_msg materialize). Is_knox alarm / Is_bigroom ACH
        // deferred.
        if (madeNew && Is_rogue_level(u.uz)) {
            await pline('You enter what seems to be an older, more primitive world.');
        }
        // C: main dungeon quest-entrance telepathy from leader
        if (!In_quest(u.uz0) && at_dgn_entrance('The Quest')
            && !(u.uevent?.qcompleted || u.uevent?.qexpelled
                || game.quest_status?.leader_is_dead)) {
            if (!u.uevent) u.uevent = {};
            if (!u.uevent.qcalled) {
                u.uevent.qcalled = 1;
                await com_pager('quest_portal');
            } else {
                await com_pager(
                    game.urole?.mnum === PM_ROGUE
                        ? 'quest_portal_demand'
                        : 'quest_portal_again',
                );
            }
        }
    }

    // C: temperature_change_msg(prev_temperature) after special arrival
    await temperature_change_msg(prev_temperature);

    // C: goto_level `if (new)` Tourist more_experienced(level_difficulty())
    // level_difficulty ≈ depth(&u.uz) outside endgame/amulet/builds_up.
    if (madeNew && game.urole?.mnum === PM_TOURIST) {
        more_experienced(depth(u.uz) | 0, 0);
        await newexplevel();
    }

    // C: assign_level(&u.uz0, &u.uz); /* reset u.uz0 */
    // so later same-level portal steps are not treated as landing.
    assign_level(u.uz0 || (u.uz0 = { dnum: 0, dlevel: 0 }), u.uz);

    // C do.c:1971–1972 — after uz0 reset (INSURANCE save_currentstate
    // named), before print_level_annotation. Catch-up after the
    // docrt wrap (D-1194). Default mon_notices Off (optlist
    // spot_monsters). newgame wrap is D-1200; mapping / wizcmds /
    // save still named.
    notice_mon_on();
    await notice_all_mons(true);

    // C: print_level_annotation() before check_special_room / pickup
    // (dungeon.c — #annotate custom → "You remember this level as …")
    await print_level_annotation();

    // C: goto_level — room entrance messages before pickup
    await check_special_room(false);

    // C do.c:1978 — obj_delivery(TRUE) after check_special_room.
    // XOR delivers non-WITH_HERO (stairs/ladder/sstairs/random).
    await obj_delivery(true);

    // C do.c:1980–1981 — after obj_delivery(TRUE), before !new
    // fix_shop_damage. (void): do not abort the level change (D-1166).
    await in_out_region(u.ux, u.uy);

    // C do.c:1985–1986 — shop repair catchup on revisited levels (!new)
    // before do_fall_dmg / pickup so bones map includes it (D-1178).
    if (!madeNew) {
        const { fix_shop_damage } = await import('./shk.js');
        await fix_shop_damage();
    }

    // C do.c:1988–1994 — trap-door/hole fall after shop repair, before
    // pickup. losehp is noreturn on death so skip pickup (D-1179).
    if (do_fall_dmg) {
        let dmg = d(Math.max(dist | 0, 1), 6);
        dmg = maybe_half_phys(dmg);
        losehp(dmg, 'falling down a mine shaft', KILLED_BY);
        await finish_maybe_wail();
        if (game._losehp_needs_done) {
            const { finish_losehp_done } = await import('./end.js');
            await finish_losehp_done();
            return;
        }
    }

    // C: goto_level ends with pickup(1) — autopick or check_here/engr
    await pickup(1);
}

/**
 * C ref: questpgr.c deliver_splev_message — pline lev_message lines then free.
 * Also cmd.c makemap_prepost post (D-1288).
 */
export async function deliver_splev_message() {
    const msg = game.lev_message;
    if (!msg) return;
    game.lev_message = null;
    for (const line of String(msg).split('\n')) {
        if (line) await pline(line);
    }
}

/**
 * C ref: do.c hellish_smoke_mesg — temperature hot/cold pline (+ Gehennom smoke).
 */
async function hellish_smoke_mesg() {
    const temp = game.level?.flags?.temperature | 0;
    if (temp) {
        await pline(`It is ${temp > 0 ? 'hot' : 'cold'} here.`);
    }
    // C: In_hell && temperature > 0 → You smell/sense smoke...
    if (In_hell(game.u?.uz) && temp > 0) {
        const data = game.youmonst?.data;
        const verb = olfaction(data) ? 'smell' : 'sense';
        await pline(`You ${verb} smoke...`);
    }
}

/**
 * C ref: do.c temperature_change_msg — pline when level temperature changes.
 */
async function temperature_change_msg(prev_temperature) {
    const temp = game.level?.flags?.temperature | 0;
    if ((prev_temperature | 0) === temp) return;
    if (temp) {
        await hellish_smoke_mesg();
    } else if (prev_temperature > 0) {
        // C: In_hell(&u.uz0) ? "and smoke are" : "is"
        const smoke = In_hell(game.u?.uz0);
        await pline(`The heat ${smoke ? 'and smoke are' : 'is'} gone.`);
    } else if (prev_temperature < 0) {
        await pline('You are out of the cold.');
    }
}

/**
 * C ref: do.c schedule_goto — defer level change + optional pre/post msgs.
 */
export function schedule_goto(tolev, utotype_flags, pre_msg, post_msg) {
    const u = game.u;
    if (!u) return;
    u.utotype = (utotype_flags | 0) | UTOTYPE_DEFERRED;
    if (!u.utolev) u.utolev = { dnum: 0, dlevel: 0 };
    assign_level(u.utolev, tolev);
    game.dfr_pre_msg = pre_msg ? String(pre_msg) : null;
    game.dfr_post_msg = post_msg ? String(post_msg) : null;
}

/**
 * C ref: do.c deferred_goto — pline pre_msg, goto_level, optional post_msg.
 * Portal-remove and full typmask arms beyond ATSTAIRS/FALLING/PORTAL deferred.
 */
export async function deferred_goto() {
    const u = game.u;
    if (!u?.uz || !u.utolev) {
        u && (u.utotype = UTOTYPE_NONE);
        game.dfr_pre_msg = null;
        game.dfr_post_msg = null;
        return;
    }
    if (!on_level(u.uz, u.utolev)) {
        const dest = { dnum: u.utolev.dnum | 0, dlevel: u.utolev.dlevel | 0 };
        const oldlev = { dnum: u.uz.dnum | 0, dlevel: u.uz.dlevel | 0 };
        const typmask = u.utotype | 0;
        if (game.dfr_pre_msg) await pline(game.dfr_pre_msg);
        await goto_level(
            dest,
            !!(typmask & UTOTYPE_ATSTAIRS),
            !!(typmask & UTOTYPE_FALLING),
            !!(typmask & UTOTYPE_PORTAL),
        );
        // UTOTYPE_RMPORTAL deltrap deferred
        // C: dfr_post_msg delivered inside goto_level (maybe_lvltport_feedback)
        // before onquest; only leftover non-materialize msgs land here.
        if (game.dfr_post_msg && !on_level(u.uz, oldlev)) {
            await pline(game.dfr_post_msg);
        }
    }
    u.utotype = UTOTYPE_NONE;
    game.dfr_pre_msg = null;
    game.dfr_post_msg = null;
}

/**
 * C ref: do.c u_collide_m — move hero or monster when sharing a spot.
 * Callers: goto_level; cmd.c makemap_prepost post (D-1288).
 */
export async function u_collide_m(mtmp) {
    const u = game.u;
    if (!mtmp || mtmp === u.usteed || m_at(u.ux, u.uy) !== mtmp) return;

    const cc = { x: 0, y: 0 };
    if (!rn2(2) && enexto(cc, u.ux, u.uy, game.youmonst?.data || mtmp.data)
        && Math.max(Math.abs(cc.x - u.ux), Math.abs(cc.y - u.uy)) <= 1) {
        u.ux = cc.x;
        u.uy = cc.y;
    } else {
        // C: mnexto(mtmp, RLOC_NOMSG) on level-entry collide
        await mnexto(mtmp, RLOC_NOMSG);
    }
    mtmp = m_at(u.ux, u.uy);
    if (mtmp) await mnexto(mtmp, RLOC_NOMSG);
}

/**
 * C ref: do.c canletgo — shared drop/throw worn/weld/loadstone gates.
 * Named omissions: loadstone corpsenm count kludge detail; full weldmsg
 * only when word non-empty (drop path uses canletgo before setuwep).
 */
export async function canletgo(obj, word) {
    if (!obj) return false;
    const mask = obj.owornmask || 0;
    if (mask & (W_ARMOR | W_ACCESSORY)) {
        if (word) {
            await Norep(`You cannot ${word} something you are wearing.`);
        }
        return false;
    }
    const u = game.u || {};
    if (obj === u.uwep && welded(u.uwep)) {
        if (word) {
            await Norep(`You cannot ${word} something welded to your hand.`);
        }
        return false;
    }
    // LOADSTONE cursed / LEASH / W_SADDLE — minimal gates
    const LOADSTONE = objectNames.indexOf('LOADSTONE');
    if (LOADSTONE >= 0 && (obj.otyp | 0) === LOADSTONE && obj.cursed) {
        if (word) {
            await pline(`For some reason, you cannot ${word} the stone!`);
        }
        obj.bknown = 1;
        return false;
    }
    if (mask & W_SADDLE) {
        if (word) {
            await pline(`You cannot ${word} something you are sitting on.`);
        }
        return false;
    }
    return true;
}

/**
 * C ref: invent.c freeinv + freeinv_core — remove from invent; gold sets
 * disp.botl. JS botl `$:` reads game._goldCount (addinv / container put-in
 * maintain it); decrement here so drop paints $:0 like C money_cnt.
 */
function freeinv_drop(obj) {
    const inv = game.invent || [];
    const idx = inv.indexOf(obj);
    if (idx >= 0) inv.splice(idx, 1);
    obj.owornmask = 0;
    obj.nobj = null;
    freeinv_core(obj);
    // where left for place_object to set OBJ_FLOOR
    // C invent.c freeinv_core — COIN_CLASS → disp.botl = TRUE; return
    if (obj.oclass === COIN_CLASS) {
        game._goldCount = Math.max(0, (game._goldCount || 0) - (obj.quan || 0));
        if (!game.flags) game.flags = {};
        game.flags.botl = true;
    }
}

/**
 * C ref: do.c dropz — place at hero feet; always encumber_msg (polyself
 * break_armor armor-drop More packs load before gloves).
 * Named omissions: engulf digest; shop sell wired (D-0994); altar; ball;
 * Blind+Levitation map_object. hitfloor dropz(TRUE) is D-1263.
 */
export async function dropz(obj, with_impact) {
    if (!obj) return;
    const u = game.u || {};
    if (obj === u.uwep) setuwep(null);
    if (obj === u.uquiver) setuqwep(null);
    if (obj === u.uswapwep) setuswapwep(null);

    if (u.uswallow) {
        // engulfer inventory deferred — leave free
        return;
    }
    // C: flooreffects before place (D-0987)
    if (await flooreffects(obj, u.ux | 0, u.uy | 0, 'drop')) {
        await encumber_msg();
        return;
    }
    place_object(obj, u.ux, u.uy);
    // C do.c:831 — with_impact → container_impact_dmg(obj, u.ux, u.uy)
    if (with_impact) {
        await container_impact_dmg(obj, u.ux | 0, u.uy | 0);
    }
    impact_disturbs_zombies(obj, !!with_impact);
    // C: sellobj when has_shop (after place, before stack)
    if (game.level?.flags?.has_shop) {
        const { sellobj } = await import('./shk.js');
        await sellobj(obj, u.ux | 0, u.uy | 0);
    }
    stackobj(obj);
    newsym(u.ux, u.uy);
    // C dropz → encumber_msg() after place (capacity may cross on poly form)
    await encumber_msg();
}

/** C ref: do.c dropy */
export async function dropy(obj) {
    await dropz(obj, false);
}

/**
 * C ref: do.c dropx — freeinv then ship_object / doaltarobj / dropy.
 */
export async function dropx(obj) {
    if (!obj) return;
    freeinv_drop(obj);
    const u = game.u || {};
    if (!u.uswallow) {
        if (await ship_object(obj, u.ux | 0, u.uy | 0, false)) return;
        const lev = game.level?.at?.(u.ux | 0, u.uy | 0);
        if (IS_ALTAR(lev?.typ)) await doaltarobj(obj);
    }
    await dropy(obj);
}

/**
 * C ref: do.c drop — canletgo, unwield, verbose pline, dropx.
 * Named omissions: corpse better_not_try; sink rings; Heart of
 * Ahriman finesse_ahriman/float_down; swallowed digests path.
 */
export async function drop(obj) {
    if (!obj) return ECMD_FAIL;
    if (!(await canletgo(obj, 'drop'))) return ECMD_FAIL;

    const u = game.u || {};
    if (obj === u.uwep) {
        // canletgo already rejected welded uwep
        setuwep(null);
    }
    if (obj === u.uquiver) setuqwep(null);
    if (obj === u.uswapwep) setuswapwep(null);

    if (u.uswallow) {
        if (game.flags?.verbose !== false) {
            await pline(`You drop ${doname(obj)} into something.`);
        }
    } else {
        if (!can_reach_floor(true)) {
            // C do.c:758–772 — freeinv + hitfloor(TRUE); how_lost not
            // set on this arm. finesse_ahriman / float_down named.
            if (game.flags?.verbose !== false) {
                await pline(`You drop ${doname(obj)}.`);
            }
            freeinv_drop(obj);
            const { hitfloor } = await import('./dothrow.js');
            await hitfloor(obj, true);
            return ECMD_TIME;
        }
        // C: skip verbose "You drop" when standing on altar (doaltarobj speaks)
        const here = game.level?.at?.(u.ux | 0, u.uy | 0);
        if (!IS_ALTAR(here?.typ) && game.flags?.verbose !== false) {
            await pline(`You drop ${doname(obj)}.`);
        }
    }
    obj.how_lost = LOST_DROPPED;
    await dropx(obj);
    return ECMD_TIME;
}

/**
 * C invent getobj any_obj_ok — every invent letter is SUGGEST;
 * suggested > 5 → compactify (invent.c).
 */
function drop_raw_lets() {
    const lets = [];
    for (const o of game.invent || []) {
        if (o?.invlet) lets.push(o.invlet);
    }
    lets.sort((a, b) => a.charCodeAt(0) - b.charCodeAt(0));
    return lets.join('');
}

function drop_suggest_lets() {
    const s = drop_raw_lets();
    if (s.length > 5) return compactify_invlets(s);
    return s;
}

/**
 * C invent.c any_obj_ok `:1709–1715`.
 */
function drop_obj_ok(obj) {
    return obj ? GETOBJ_SUGGEST : GETOBJ_EXCLUDE;
}

/**
 * C ref: invent.c getobj("drop", any_obj_ok, GETOBJ_PROMPT|GETOBJ_ALLOWCNT)
 * via yn_function(qbuf, NULL, '\0'). Count prefix + split_otmp live.
 * Canned CMDQ_INT/KEY live. `?`/`*` → display_pickinv `&ctmp` (D-1559).
 */
async function getobj_drop() {
    const cq = getobj_from_cmdq(drop_obj_ok, true);
    if (!cq.skip) return cq.otmp;
    for (;;) {
        await flush_topl_more();
        const lets = drop_suggest_lets();
        const query = lets
            ? `What do you want to drop? [${lets} or ?*]`
            : 'What do you want to drop? [*]';
        // C invent.c getobj → yn_function(qbuf, (char *)0, '\0', FALSE)
        let ch = await yn_function(query, null, '\0');
        const counted = await getobj_take_count(ch, true);
        if (counted.retry) continue;
        ch = counted.ch;
        if (ch === '\x1b' || ch === ' ' || ch === '\n' || ch === '\r') {
            if (game.flags?.verbose !== false) await pline('Never mind.');
            return null;
        }
        if (ch === '?' || ch === '*') {
            const ilet = await getobj_display_pickinv(
                ch, drop_raw_lets(), true, counted,
            );
            if (ilet === '\x1b') {
                if (game.flags?.verbose !== false) await pline('Never mind.');
                return null;
            }
            if (!ilet) continue;
            const picked = (game.invent || []).find((o) => o.invlet === ilet);
            if (!picked) {
                await pline("You don't have that object.");
                continue;
            }
            const got = await getobj_apply_count(
                picked, 'drop', counted.cntgiven, counted.cnt,
            );
            if (!got) return null;
            if (got.retry) continue;
            mark_topline_prompt(game._pending_message);
            return got;
        }
        const otmp = (game.invent || []).find((o) => o.invlet === ch);
        if (!otmp) {
            await pline("You don't have that object.");
            continue;
        }
        const got = await getobj_apply_count(
            otmp, 'drop', counted.cntgiven, counted.cnt,
        );
        if (!got) return null;
        if (got.retry) continue;
        // C: leave gt.toplines; !verbose drop stays silent until parse clear.
        mark_topline_prompt(game._pending_message);
        return got;
    }
}

/**
 * C ref: do.c dodrop — getobj then drop; shop sellobj_state around drop.
 * reset_occupations deferred.
 *
 * Branch envelope: ordinary floor drop of invent item including uwep;
 * cancel / missing letter / worn armor reject. Deferred: #droptype,
 * sinks, containers. Count prefix is getobj ALLOWCNT.
 */
export async function dodrop() {
    const u = game.u || {};
    const inshop = !!(u.ushops && u.ushops.length);
    if (inshop) {
        const { sellobj_state } = await import('./shk.js');
        const { SELL_DELIBERATE, SELL_NORMAL } = await import('./const.js');
        sellobj_state(SELL_DELIBERATE);
        const obj = await getobj_drop();
        if (!obj) {
            sellobj_state(SELL_NORMAL);
            return ECMD_CANCEL;
        }
        const result = await drop(obj);
        sellobj_state(SELL_NORMAL);
        return result;
    }
    const obj = await getobj_drop();
    if (!obj) return ECMD_CANCEL;
    return drop(obj);
}

/**
 * C ref: do.c dodown — '#' / '>' go down staircase (ordinary stairs path).
 *
 * Omits: levitation end, poly ceiling-hider, autodig, Gehennom gate yn,
 * hole/trapdoor plunge, stronghold hell, rooted/stuck/steed.
 */
export async function dodown() {
    const u = game.u;
    if (!u) return ECMD_OK;

    u.dz = 1;
    u.dx = 0;
    u.dy = 0;

    const stway = stairway_at(u.ux, u.uy);
    let stairs_down = false;
    let ladder_down = false;
    if (stway && !stway.up) {
        stairs_down = !stway.isladder;
        ladder_down = !stairs_down;
    }

    // Also accept typ STAIRS/LADDER with down ladder flag when stairway
    // node missing (partial generate_stairs).
    if (!stairs_down && !ladder_down) {
        const loc = game.level?.at(u.ux, u.uy);
        if (loc && (loc.typ === STAIRS || loc.typ === LADDER)
            && loc.ladder === 2) {
            stairs_down = loc.typ === STAIRS;
            ladder_down = loc.typ === LADDER;
        }
    }

    if (!stairs_down && !ladder_down) {
        await pline("You can't go down here.");
        return ECMD_OK;
    }

    // C: next_to_u — leashed pet may hold hero back (D-1005)
    {
        const { next_to_u } = await import('./apply.js');
        if (!(await next_to_u())) {
            await pline('You are held back by your pet!');
            return ECMD_OK;
        }
    }

    game.at_ladder = !!(game.level?.at(u.ux, u.uy)?.typ === LADDER)
        || !!(stway && stway.isladder);

    await next_level(true);
    game.at_ladder = false;
    return ECMD_TIME;
}

/**
 * C ref: do.c doup — '<' go up staircase (ordinary stairs path).
 *
 * Omits: rooted, pit climb_pit, stucksteed, u_stuck_cannot_go, encumbrance
 * load gate, ledger 1 escape yn.
 */
export async function doup() {
    const u = game.u;
    if (!u) return ECMD_OK;

    u.dz = -1;
    u.dx = 0;
    u.dy = 0;

    const stway = stairway_at(u.ux, u.uy);
    if (!stway || !stway.up) {
        await pline("You can't go up here.");
        return ECMD_OK;
    }

    // C: ledger_no(&u.uz) == 1 → escape yn — not taken when climbing to Dlvl1
    // from below; surface escape deferred.
    if (ledger_no(u.uz) === 1) {
        await pline("You can't go up here.");
        return ECMD_OK;
    }

    // C: next_to_u — leashed pet may hold hero back (D-1005)
    {
        const { next_to_u } = await import('./apply.js');
        if (!(await next_to_u())) {
            await pline('You are held back by your pet!');
            return ECMD_OK;
        }
    }

    game.at_ladder = !!(game.level?.at(u.ux, u.uy)?.typ === LADDER)
        || !!(stway && stway.isladder);

    await prev_level(true);
    game.at_ladder = false;
    return ECMD_TIME;
}

/** C youprop.h BlindedTimeout. */
function BlindedTimeout() {
    return (game.u?.HBlinded | 0) & TIMEOUT;
}

/** C potion.c set_itimeout / incr_itimeout — TIMEOUT field only.
 * Sync uprops[BLINDED] with HBlinded (C: same storage via macro). */
function set_itimeout_HBlinded(val) {
    const u = game.u || (game.u = {});
    const next = ((u.HBlinded | 0) & ~TIMEOUT) | ((val | 0) & TIMEOUT);
    u.HBlinded = next;
    if (!u.uprops) u.uprops = {};
    if (!u.uprops[BLINDED]) {
        u.uprops[BLINDED] = { intrinsic: 0, extrinsic: 0, blocked: 0 };
    }
    u.uprops[BLINDED].intrinsic =
        ((u.uprops[BLINDED].intrinsic | 0) & ~TIMEOUT) | (next & TIMEOUT);
}
function incr_itimeout_HBlinded(incr) {
    set_itimeout_HBlinded(BlindedTimeout() + (incr | 0));
}

/**
 * C ref: potion.c make_blinded — talk + toggle_blindness subset for wipeoff.
 * Named omissions: Eyes override probe detail; Punished set_bc; Hallucination
 * talk variants; Blindfolded itch/twitch; Sting_effects.
 * learn_unseen_invent on regain-sight (D-0928 #1098).
 * Exported for timeout.c nh_timeout BLINDED expiry.
 */
export async function make_blinded(xtime, talk) {
    const u = game.u || (game.u = {});
    const old = BlindedTimeout();
    // C probes Blind via props (H/E/BBlinded), not a sticky mirror.
    const u_could_see = !Blind();
    set_itimeout_HBlinded(xtime ? 1 : 0);
    const can_see_now = !Blind();
    set_itimeout_HBlinded(old);

    if (can_see_now && !u_could_see && talk) {
        await pline('You can see again.');
    } else if (u_could_see && !can_see_now && talk) {
        await pline('A cloud of darkness falls upon you.');
    }

    set_itimeout_HBlinded(xtime);
    // Sync sticky mirror used by display/status Blind checks.
    u.Blind = Blind();
    u.ublind = false;
    if (u_could_see !== can_see_now) {
        // C: toggle_blindness — botl + vision_recalc(0)
        if (game.flags) game.flags.botl = true;
        game.vision_full_recalc = 1;
        vision_recalc(0);
        // C: if (!Blind) learn_unseen_invent()
        if (!Blind()) learn_unseen_invent();
    }
}

/** C mhitu.c gulp_blnd_check — swallowed AD_BLND re-apply deferred. */
function gulp_blnd_check() {
    return false;
}

/**
 * C ref: do.c wipeoff — occupation tick; clear up to 4 cream/blind.
 * @returns {number} 1 = still busy, 0 = done
 */
async function wipeoff() {
    const u = game.u || (game.u = {});
    let udelta = u.ucreamed | 0;
    let ldelta = BlindedTimeout();
    if (udelta > 4) udelta = 4;
    u.ucreamed = (u.ucreamed | 0) - udelta;
    if (ldelta > 4) ldelta = 4;
    incr_itimeout_HBlinded(-ldelta);

    if (!(u.HBlinded | 0)) {
        await pline("You've got the glop off.");
        u.ucreamed = 0;
        if (!gulp_blnd_check()) {
            set_itimeout_HBlinded(1);
            await make_blinded(0, true);
        }
        return 0;
    }
    if (!(u.ucreamed | 0)) {
        await pline('Your face feels clean now.');
        return 0;
    }
    return 1;
}

/**
 * C ref: do.c dowipe — #wipe face cream / BlindedTimeout.
 * Named omissions: body_part poly face noun; gulp_blnd_check swallow arm.
 * @returns {number} ECMD_TIME
 */
export async function dowipe() {
    const u = game.u || {};
    if (u.ucreamed | 0) {
        set_occupation(wipeoff, 'wiping off your face', 0);
        return ECMD_TIME;
    }
    await pline('Your face is already clean.');
    return ECMD_TIME;
}

/**
 * C ref: zap.c get_obj_location — invent/floor/minvent + contained/buried
 * when locflags request. Local copy: timeout.js import would cycle do.js.
 * @returns {{ x: number, y: number }|null}
 */
function get_obj_location_revive(obj, locflags = 0) {
    if (!obj) return null;
    switch (obj.where | 0) {
    case OBJ_INVENT:
        return { x: game.u?.ux | 0, y: game.u?.uy | 0 };
    case OBJ_FLOOR:
        return { x: obj.ox | 0, y: obj.oy | 0 };
    case OBJ_MINVENT:
        if (obj.ocarry && (obj.ocarry.mx | 0)) {
            return { x: obj.ocarry.mx | 0, y: obj.ocarry.my | 0 };
        }
        break;
    case OBJ_BURIED:
        if (locflags & BURIED_TOO) {
            return { x: obj.ox | 0, y: obj.oy | 0 };
        }
        break;
    case OBJ_CONTAINED:
        if (locflags & CONTAINED_TOO) {
            return get_obj_location_revive(obj.ocontainer, locflags);
        }
        break;
    default:
        break;
    }
    return null;
}

/**
 * C ref: zap.c get_container_location — outermost container where + carrier.
 * @returns {{ carrier: object|null, loc: number }}
 */
function get_container_location_revive(obj) {
    let cur = obj;
    while (cur && (cur.where | 0) === OBJ_CONTAINED) {
        cur = cur.ocontainer;
    }
    if (!cur) return { carrier: null, loc: 0 };
    const loc = cur.where | 0;
    const carrier = loc === OBJ_MINVENT ? (cur.ocarry || null) : null;
    return { carrier, loc };
}

/**
 * C ref: mondata.c locomotion — verb for how a monster moves.
 * Local copy: monmove.js import would cycle do.js via mhitu.
 */
function locomotion_revive(ptr, def) {
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
 * C ref: do.c revive_corpse — zap.revive then location messages.
 * Branch envelope: OBJ_INVENT uwep/backpack; OBJ_FLOOR cansee/canseemon
 * plus Death/Pestilence/Famine visual suffixes (eat.c cprefx rider);
 * OBJ_MINVENT drop/appear (D-1212); OBJ_CONTAINED pack/floor/minvent
 * sack plines (D-1212); OBJ_BURIED zombie/reviver pit + claw pline /
 * nearby Soundeffect(se_scratching, 50) then You_hear + fill_pit
 * (D-1202 zombify; D-1222 se_scratching); Adjmonnam bite-covered
 * when oeaten (FLOOR + MINVENT); BURIED !is_zomb FALLTHROUGH
 * impossible (D-1220); unique/pname corpse_xname adjective
 * placement (D-1234); glob / doname CXN_ARTICLE|CXN_NOCORPSE (D-1255).
 * Named omit: doname MEAT_RING / candle partly used.
 * @returns {Promise<boolean>}
 */
export async function revive_corpse(corpse) {
    if (!corpse) return false;
    const inInvent = corpse.where === OBJ_INVENT
        || (game.invent || []).includes(corpse);
    const where = inInvent ? OBJ_INVENT : (corpse.where | 0);
    const montype = corpse.corpsenm | 0;
    const mptr = mons(montype);
    const is_zomb = !!(mptr && (mptr.mlet === 'S_ZOMBIE'
        || (where === OBJ_BURIED
            && (is_rider(mptr) || mptr.mlet === 'S_TROLL'))));
    const is_uwep = corpse === game.u?.uwep;
    const chewed = (corpse.oeaten | 0) !== 0;
    // C: do.c:2131–2133 corpse_xname(chewed ? "bite-covered" : 0, CXN_SINGULAR)
    const cname = corpse_xname(
        corpse,
        chewed ? 'bite-covered' : null,
        CXN_SINGULAR,
    );
    let mcarry = where === OBJ_MINVENT ? (corpse.ocarry || null) : null;
    let container = null;
    let container_where = 0;
    const loc = get_obj_location_revive(corpse, CONTAINED_TOO | BURIED_TOO);
    const corpsex = loc ? loc.x : (corpse.ox | 0);
    const corpsey = loc ? loc.y : (corpse.oy | 0);
    if (where === OBJ_CONTAINED) {
        container = corpse.ocontainer || null;
        const info = get_container_location_revive(container);
        container_where = info.loc | 0;
        if (container_where === OBJ_MINVENT && info.carrier) {
            mcarry = info.carrier;
        }
    }
    const mtmp = await revive(corpse, false);
    if (!mtmp) return false;
    switch (where) {
    case OBJ_INVENT:
        if (is_uwep) {
            await pline(`The ${cname} writhes out of your grasp!`);
        } else {
            await You_feel('squirming in your backpack!');
        }
        break;
    case OBJ_FLOOR:
        if (cansee(corpsex, corpsey) || canseemon(mtmp)) {
            // C: mtmp->data == &mons[PM_*]; JS mons() allocates per call
            const mndx = mtmp.data?.mndx ?? (mtmp.mnum | 0);
            let effect = '';
            if (mndx === PM_DEATH) {
                effect = ' in a whirl of spectral skulls';
            } else if (mndx === PM_PESTILENCE) {
                effect = ' in a churning pillar of flies';
            } else if (mndx === PM_FAMINE) {
                effect = ' in a ring of withered crops';
            }
            if (canseemon(mtmp)) {
                const who = chewed ? Adjmonnam(mtmp, 'bite-covered') : Monnam(mtmp);
                await pline(`${who} rises from the dead${effect}!`);
            } else {
                await pline(`${The(cname)} disappears${effect}!`);
            }
        }
        break;
    case OBJ_MINVENT:
        if (cansee(mtmp.mx | 0, mtmp.my | 0)) {
            if (mcarry && canseemon(mcarry)) {
                const how = canspotmon(mtmp) ? 'revives' : 'disappears';
                await pline(
                    `Startled, ${mon_nam(mcarry)} drops ${an(cname)} as it ${how}!`,
                );
            } else if (canspotmon(mtmp)) {
                const who = chewed ? Adjmonnam(mtmp, 'bite-covered') : Monnam(mtmp);
                await pline(`${who} suddenly appears!`);
            }
        }
        break;
    case OBJ_CONTAINED: {
        const mnam = canspotmon(mtmp) ? Amonnam(mtmp) : 'Something';
        if (!container) {
            await impossible('reviving corpse from non-existent container');
        } else if (mcarry && canseemon(mcarry)) {
            await pline(`${mnam} writhes out of ${yname(container)}!`);
        } else if (container_where === OBJ_INVENT) {
            const sackname = an(xname(container));
            const loco = locomotion_revive(mtmp.data, 'writhes');
            await pline(`${mnam} ${loco} out of ${sackname} in your pack!`);
        } else if (container_where === OBJ_FLOOR
            && cansee(corpsex, corpsey)) {
            const sackname = an(xname(container));
            await pline(`${mnam} escapes from ${sackname}!`);
        }
        break;
    }
    case OBJ_BURIED:
        if (is_zomb) {
            const mx = mtmp.mx | 0;
            const my = mtmp.my | 0;
            maketrap(mx, my, PIT);
            if (cansee(mx, my)) {
                const ttmp = t_at(mx, my);
                if (ttmp) ttmp.tseen = true;
                const mnam = canspotmon(mtmp) ? Amonnam(mtmp) : 'Something';
                await pline(`${mnam} claws itself out of the ground!`);
                newsym(mx, my);
            } else if (dist2(mx, my, game.u?.ux | 0, game.u?.uy | 0) < 25) {
                // C: do.c:2230 Soundeffect then You_hear
                Soundeffect(se_scratching, 50);
                await You_hear('scratching noises.');
            }
            const { fill_pit } = await import('./dig.js');
            fill_pit(mx, my);
            break;
        }
        // FALLTHROUGH — C do.c:2236–2240 !is_zomb → impossible
    default:
        /* we should be able to handle the other cases... */
        await impossible('revive_corpse: lost corpse @ %d', where);
        break;
    }
    return true;
}
