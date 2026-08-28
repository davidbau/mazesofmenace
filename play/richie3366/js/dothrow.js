// dothrow.js — Throw command (minimal path for Tourist darts).
// C ref: dothrow.c dothrow / throw_obj / throwit (subset).
// throwit returning-missile losehp killer_xname (D-1346; C `:1747`).
// throw_obj u_wipe_engr(2) D-1374 (C `:138`).

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import {
    flush_screen, flush_topl_more, pline, docrt, newsym, mark_topline_seen,
    canseemon, canspotmon, nh_delay_output, tmp_at, obj_glyph, verbalize,
} from './display.js';
import { cansee, vision_recalc } from './vision.js';
import { rn2, rnd, rn1 } from './rng.js';
import {
    place_object, splitobj, stackobj, delobj, is_crackable, objects_at,
} from './mkobj.js';
import {
    losehp, maybe_half_phys, nomul, impact_disturbs_zombies, finish_maybe_wail,
    switch_terrain, in_rooms,
} from './hack.js';
import {
    WEAPON_CLASS, TOOL_CLASS, COIN_CLASS, GEM_CLASS, FOOD_CLASS, ARMOR_CLASS,
    POTION_CLASS, SCROLL_CLASS, RING_CLASS, objectNames, objectNameStrs,
} from './objects.js';
import {
    COLNO, ROWNO, IS_SOFT, LOST_THROWN, ZAP_POS, IS_DOOR, D_CLOSED, D_LOCKED,
    D_ISOPEN, IS_OBSTRUCTED, IS_TREE, KILLED_BY, KILLED_BY_AN, OBJ_INVENT, OBJ_FREE,
    TT_WEB, TT_LAVA, TT_INFLOOR, TT_BURIEDBALL,
    IS_ALTAR, IS_FOUNTAIN, IS_ROOM, IS_AIR, IS_WALL, ICE, PIT, SPIKED_PIT, HOLE,
    TRAPDOOR, SDOOR, Is_earthlevel, In_endgame,
    P_NONE, P_SPEAR, P_SLING, P_DAGGER, P_SHURIKEN, P_DART, P_CROSSBOW, P_KNIFE,
    P_BOW, P_BOOMERANG, P_SHORT_SWORD, P_SABER, P_AXE,
    P_SKILLED, P_EXPERT, P_BASIC, P_UNSKILLED,
    ACCFOOD, HMON_THROWN, HMON_KICKED, HMON_APPLIED, engulfing_u, STRAT_WAITMASK,
    M_AP_TYPE, M_AP_MONSTER, M_AP_NOTHING,
    BRK_FROM_INV, BRK_KNOWN2BREAK, BRK_KNOWN2NOTBREAK, BRK_KNOWN_OUTCOME,
    ismnum, isok, u_at, MM_IGNOREWATER, MM_IGNORELAVA,
    HURTLING, FORCEBUNGLE, IRONBARS, Upolyd, FACE, HEAD, ARM, FOOT, STONING,
    TIMEOUT, WT_TO_DMG, POTHIT_HERO_THROW, Has_contents, NON_PM, LOW_PM,
    W_WEP, W_SWAPWEP, W_QUIVER, STR19, LOST_NONE, SLT_ENCUMBER, Is_airlevel,
    BOLT_LIM, AKLYS_LIM, HAND, THROWN_TETHERED_WEAPON,
    xdir, ydir, xytodir, N_DIRS, RIGHT_HANDED, IS_SINK, HI_WOOD, OBJ_MINVENT,
    DISP_FLASH, DISP_CHANGE, DISP_END, DISP_TETHER, BACKTRACK, ECMD_TIME,
    DEAF, SHOPBASE,
} from './const.js';
import { NO_COLOR } from './terminal.js';
import { obj_resists, dogfood } from './dogmove.js';
import {
    ammo_and_launcher, is_ammo, is_missile, doswapweapon, doquiver_core, welded,
    setuwep, setuswapwep, setuqwep, set_twoweap,
} from './wield.js';
import { acurr, acurrstr, A_CON, A_DEX, A_STR, change_luck, exercise, Fumbling } from './attrib.js';
import { calc_capacity, fully_identify_obj, encumber_msg, getobj_take_count, getobj_apply_count, getobj_from_cmdq, getobj_display_pickinv } from './invent.js';
import { add_to_minv, mpickobj } from './makemon.js';
import { finish_quest } from './quest.js';
import { align_gname } from './roles.js';
import { find_mac } from './mhitm.js';
import { digests } from './mhitu.js';
import { hitval, weapon_hit_bonus, should_mulch_missile, dmgval } from './weapon.js';
import { spec_abon, artifact_hit, is_art } from './artifact.js';
import { ART_MJOLLNIR } from './generated/artifacts_data.js';
import {
    PM_CAVE_DWELLER, PM_MONK, PM_RANGER, PM_ROGUE, PM_SAMURAI,
    PM_WIZARD, PM_HEALER, PM_TOURIST, PM_CLERIC, PM_VALKYRIE,
    PM_ELF, PM_ORC, PM_GNOME,
    monsterNames,
} from './generated/monsters_data.js';
import {
    xname, killer_xname, singular, an, the, vtense, doname, thesimpleoname,
    makeplural, otense,
} from './objnam.js';
import { m_at, wakeup, seemimic, wake_nearto, distmin, monnear, m_respond } from './mon.js';
import { mon_nam, Monnam, hliquid, Hallucination } from './do_name.js';
import {
    is_domestic, nohands, M1_NOTAKE, MZ_HUGE, MZ_MEDIUM,
    is_unicorn, is_orc, is_elf, your_race, is_animal, is_whirly,
    touch_petrifies, poly_when_stoned, hates_silver, mon_hates_blessings,
    haseyes, passes_walls, unsolid, mons,
} from './monsters.js';
import { tamedog } from './dog.js';
import { hmon, passive_obj } from './uhitm.js';
import { cutworm } from './worm.js';
import { potionbreathe, potionhit } from './potion.js';
import { body_part, polymon } from './polyself.js';
import { goodpos, rloc_to } from './teleport.js';
import {
    mintrap, t_at, Trap_Killed_Mon, Trap_Caught_Mon, Trap_Moved_Mon,
    minstapetrify,
} from './trap.js';
import { in_out_region, m_in_out_region } from './region.js';
import { u_wipe_engr } from './engrave.js';

const GLASS = 19;
const POT_WATER = objectNames.indexOf('POT_WATER');
const POT_OIL = objectNames.indexOf('POT_OIL');
const EGG = objectNames.indexOf('EGG');
const CREAM_PIE = objectNames.indexOf('CREAM_PIE');
const MELON = objectNames.indexOf('MELON');
const MIRROR = objectNames.indexOf('MIRROR');
const EXPENSIVE_CAMERA = objectNames.indexOf('EXPENSIVE_CAMERA');
const ACID_VENOM = objectNames.indexOf('ACID_VENOM');
const BLINDING_VENOM = objectNames.indexOf('BLINDING_VENOM');
const LENSES = objectNames.indexOf('LENSES');
const CRYSTAL_BALL = objectNames.indexOf('CRYSTAL_BALL');
const BOULDER = objectNames.indexOf('BOULDER');
const STATUE = objectNames.indexOf('STATUE');
const HEAVY_IRON_BALL = objectNames.indexOf('HEAVY_IRON_BALL');
const WAR_HAMMER = objectNames.indexOf('WAR_HAMMER');
const AKLYS = objectNames.indexOf('AKLYS');
const WAN_STRIKING = objectNames.indexOf('WAN_STRIKING');
const BOOMERANG = objectNames.indexOf('BOOMERANG');
const ELVEN_BOW = objectNames.indexOf('ELVEN_BOW');
const YUMI = objectNames.indexOf('YUMI');
const GAUNTLETS_OF_POWER = objectNames.indexOf('GAUNTLETS_OF_POWER');
const GAUNTLETS_OF_FUMBLING = objectNames.indexOf('GAUNTLETS_OF_FUMBLING');
const LEATHER_GLOVES = objectNames.indexOf('LEATHER_GLOVES');
const GAUNTLETS_OF_DEXTERITY = objectNames.indexOf('GAUNTLETS_OF_DEXTERITY');
const FAKE_AMULET_OF_YENDOR = objectNames.indexOf('FAKE_AMULET_OF_YENDOR');
const AMULET_OF_YENDOR = objectNames.indexOf('AMULET_OF_YENDOR');
const CORPSE = objectNames.indexOf('CORPSE');
const SLING = objectNames.indexOf('SLING');
const EUCALYPTUS_LEAF = objectNames.indexOf('EUCALYPTUS_LEAF');
const KELP_FROND = objectNames.indexOf('KELP_FROND');
const SPRIG_OF_WOLFSBANE = objectNames.indexOf('SPRIG_OF_WOLFSBANE');
const FORTUNE_COOKIE = objectNames.indexOf('FORTUNE_COOKIE');
const PANCAKE = objectNames.indexOf('PANCAKE');
const RUBBER_HOSE = objectNames.indexOf('RUBBER_HOSE');
const BAG_OF_TRICKS = objectNames.indexOf('BAG_OF_TRICKS');
const SACK = objectNames.indexOf('SACK');
const OILSKIN_SACK = objectNames.indexOf('OILSKIN_SACK');
const BAG_OF_HOLDING = objectNames.indexOf('BAG_OF_HOLDING');
const MINERAL = 21; // objclass.h
const GEMSTONE = 20;
const CLOTH = 6;
const SILVER = 14;
const IRON = 11;
const MITHRIL = 15;
const PIERCE = 1; // objclass.h weapon oc_dir
const PM_PYROLISK = monsterNames.indexOf('PM_PYROLISK');
const PM_STONE_GOLEM = monsterNames.indexOf('PM_STONE_GOLEM');
const PM_SHADE = monsterNames.indexOf('PM_SHADE');

/** C ref: mondata.h notake — M1_NOTAKE (cannot pick up / throw). */
function notake(ptr) {
    return !!((ptr?.mflags1 ?? 0) & M1_NOTAKE);
}

/**
 * C ref: dothrow.c ok_to_throw — shared gate for #throw / #fire.
 * Named omission: check_capacity((char *)0); command_count → shotlimit
 * (caller still passes shotlimit separately).
 * @returns {Promise<boolean>} false → ECMD_OK (no time)
 */
async function ok_to_throw() {
    const youdata = game.youmonst?.data;
    if (notake(youdata)) {
        await pline('You are physically incapable of throwing or shooting anything.');
        // C: ECMD_OK — no getobj; avoid More eating the next command key
        mark_topline_seen();
        return false;
    }
    if (nohands(youdata)) {
        // C: You_cant("throw or shoot without hands.")
        await pline("You can't throw or shoot without hands.");
        mark_topline_seen();
        return false;
    }
    // check_capacity deferred
    return true;
}

const PM_MONKEY = monsterNames.indexOf('PM_MONKEY');
const PM_APE = monsterNames.indexOf('PM_APE');
const PM_LICHEN = monsterNames.indexOf('PM_LICHEN');
const VEGGY = 3; // objclass.h

/** C ref: cmd.c cmdq_add_ec(CQ_CANNED, …) — shared with rhack via game._cmdq_canned */
function cmdq_add_ec(fn) {
    if (!game._cmdq_canned) game._cmdq_canned = [];
    game._cmdq_canned.push(fn);
}



const DIR_DX = { h: -1, l: 1, j: 0, k: 0, y: -1, u: 1, b: -1, n: 1 };
const DIR_DY = { h: 0, l: 0, j: 1, k: -1, y: -1, u: -1, b: 1, n: 1 };

/**
 * C ref: cmd.c movecmd(sym, MV_ANY) — walk/run/rush bindings all yield a
 * direction. Capital HJKLYUBN (run) and Ctrl-dir (rush) count like h/j/…
 * @returns {{dx:number,dy:number,dz?:number}|null}
 */
function dir_from_key(key, ch) {
    // C cmd.c movecmd — '<' up / '>' down set zdir, dx=dy=0
    if (ch === '<') return { dx: 0, dy: 0, dz: -1 };
    if (ch === '>') return { dx: 0, dy: 0, dz: 1 };
    if (ch in DIR_DX) return { dx: DIR_DX[ch], dy: DIR_DY[ch], dz: 0 };
    const low = typeof ch === 'string' ? ch.toLowerCase() : '';
    if (low in DIR_DX && ch === low.toUpperCase()) {
        return { dx: DIR_DX[low], dy: DIR_DY[low], dz: 0 };
    }
    // rush: C(dir) — keys 1..26 (ICRNL maps CR→LF = C('j'))
    if (typeof key === 'number' && key >= 1 && key <= 26) {
        const rushCh = String.fromCharCode(key + 96);
        if (rushCh in DIR_DX) return { dx: DIR_DX[rushCh], dy: DIR_DY[rushCh], dz: 0 };
    }
    return null;
}

/** C invent getobj ranks used by throw_ok. */
const THROW_SUGGEST = 1;
const THROW_DOWNPLAY = 2;

/**
 * C dothrow.c AutoReturn — uwep aklys / Valkyrie Mjollnir, or any boomerang.
 * wep_mask is captured before freeinv (throw_obj).
 */
function AutoReturn(o, wmsk) {
    if (!o) return false;
    const wep = ((wmsk | 0) & W_WEP) !== 0;
    if (wep && ((o.otyp | 0) === AKLYS
        || (is_art(o, ART_MJOLLNIR) && Role_if(PM_VALKYRIE)))) {
        return true;
    }
    return (o.otyp | 0) === BOOMERANG;
}

/**
 * C weapon.c autoreturn_weapon — AKLYS only (boomerang row commented out).
 * throwit uses arw->tethered && W_WEP (D-1311 DISP_TETHER/BACKTRACK).
 * arw->range is AKLYS_LIM²; throwit min(range, isqrt(arw->range)) D-1323.
 */
function autoreturn_weapon(otmp) {
    if (!otmp || (otmp.otyp | 0) !== AKLYS) return null;
    return { otyp: AKLYS, range: AKLYS_LIM * AKLYS_LIM, tethered: 1 };
}

/** C hacklib.c isqrt — integer square root (odd-subtraction). */
function isqrt(val) {
    let rt = 0;
    let odd = 1;
    let v = val | 0;
    while (v >= odd) {
        v -= odd;
        odd += 2;
        rt++;
    }
    return rt;
}

/** C dothrow.c throwit :1523 — arw->tethered && (wep_mask & W_WEP). */
function throwit_tethered_weapon(obj, wep_mask) {
    const arw = autoreturn_weapon(obj);
    return !!(arw && arw.tethered && ((wep_mask | 0) & W_WEP) !== 0);
}

/**
 * C dothrow.c throwit tmp_at(DISP_END, BACKTRACK|0) when tethered.
 * BACKTRACK returns a Promise (display.c delays inside tmp_at).
 */
async function throwit_tether_end(tethered_weapon, backtrack) {
    if (!tethered_weapon) return;
    await tmp_at(DISP_END, backtrack ? BACKTRACK : 0);
}

/**
 * C ref: dothrow.c throw_ok — SUGGEST coins + weapons (!uslinging);
 * AutoReturn (wielded aklys / Valk Mjollnir / boomerang) before lone-uwep
 * DOWNPLAY (D-1282). Named omit: gem-sling uslinging.
 * @returns {0|1|2} 0 exclude, 1 suggest, 2 downplay
 */
function throw_ok(obj) {
    if (!obj) return 0;
    const u = game.u || {};
    if (obj.bknown && welded(obj)) return THROW_DOWNPLAY;
    if (AutoReturn(obj, obj.owornmask || 0)
        && (!is_art(obj, ART_MJOLLNIR) || acurr(A_STR) >= STR19(25))) {
        return THROW_SUGGEST;
    }
    if ((obj.quan || 1) === 1
        && (obj === u.uwep || (obj === u.uswapwep && u.twoweap))) {
        return THROW_DOWNPLAY;
    }
    if (obj.oclass === COIN_CLASS) return THROW_SUGGEST;
    if (obj.oclass === WEAPON_CLASS) return THROW_SUGGEST;
    return THROW_DOWNPLAY;
}

/** Invent-order SUGGEST letters (C getobj; DOWNPLAY selectable but hidden). */
function throwable_lets() {
    const lets = [];
    for (const o of game.invent || []) {
        if (o?.invlet && throw_ok(o) === THROW_SUGGEST) lets.push(o.invlet);
    }
    return lets.join('');
}

/**
 * C ref: invent.c getobj("throw", throw_ok, GETOBJ_PROMPT|GETOBJ_ALLOWCNT).
 * Count prefix: gold may use a count; other stacks can only throw one
 * (C `:2028–2047`) then split_otmp. `?`/`*` → display_pickinv `&ctmp`
 * (D-1559). Canned CMDQ_INT then KEY (need_more_cq) live; canned skip throw-one.
 */
async function getobj_throw() {
    const cq = getobj_from_cmdq(throw_ok, true);
    if (!cq.skip) return cq.otmp;

    for (;;) {
        await flush_topl_more();
        const lets = throwable_lets();
        const query = lets
            ? `What do you want to throw? [${lets} or ?*]`
            : 'What do you want to throw? [*]';
        const prompt = `${query} `;
        game._pending_message = prompt;
        await flush_screen(1);
        const disp = game.nhDisplay;
        if (disp?.setCursor) disp.setCursor(prompt.length, 0);

        const key = await nhgetch();
        let ch = String.fromCharCode(key);
        const counted = await getobj_take_count(ch, true);
        if (counted.retry) continue;
        ch = counted.ch;
        if (ch.charCodeAt(0) === 27 || ch === ' ' || ch === '\n' || ch === '\r') {
            if (game.flags?.verbose !== false) await pline('Never mind.');
            return null;
        }
        if (ch === '?' || ch === '*') {
            const ilet = await getobj_display_pickinv(ch, lets, true, counted);
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
            if (!throw_ok(picked)) {
                await pline('You cannot throw that!');
                return null;
            }
            const got = await getobj_apply_count(
                picked, 'throw', counted.cntgiven, counted.cnt,
            );
            if (!got) return null;
            if (got.retry) continue;
            game._pending_message = '';
            return got;
        }
        const otmp = (game.invent || []).find(o => o.invlet === ch);
        if (!otmp) {
            // C: You("don't have that object."); continue;
            await pline("You don't have that object.");
            continue;
        }
        if (!throw_ok(otmp)) {
            await pline('You cannot throw that!');
            return null;
        }
        const got = await getobj_apply_count(
            otmp, 'throw', counted.cntgiven, counted.cnt,
        );
        if (!got) return null;
        if (got.retry) continue;
        game._pending_message = '';
        return got;
    }
}

/**
 * C ref: cmd.c getdir — '.' / 's' = self (dx=dy=dz=0, success);
 * ESC/space/CR cancel (quitchars).
 */
async function getdir(prompt) {
    if (prompt) {
        game._pending_message = prompt;
        await flush_screen(1);
        const disp = game.nhDisplay;
        if (disp?.setCursor) disp.setCursor(prompt.length, 0);
    }
    const key = await nhgetch();
    const ch = String.fromCharCode(key);
    // Clear yn prompt before returning to the command loop (next capture).
    game._pending_message = '';
    // C: NHKF_GETDIR_SELF / SELF2 → u.dx=u.dy=u.dz=0, return 1
    if (ch === '.' || ch === 's') return { dx: 0, dy: 0, dz: 0 };
    // C: strchr(quitchars, dirsym) → return 0 without "strange direction"
    if (key === 27 || ch === ' ' || ch === '\n' || ch === '\r')
        return null;
    const dir = dir_from_key(key, ch);
    if (!dir) {
        await pline('Never mind.');
        return null;
    }
    return dir;
}

function freeinv(otmp) {
    const inv = game.invent || [];
    const idx = inv.indexOf(otmp);
    if (idx >= 0) inv.splice(idx, 1);
    if (otmp) {
        otmp.nobj = null;
        otmp.where = OBJ_FREE;
    }
}

/** C ref: mondata.h befriend_with_obj — banana→monkey/ape; domestic+food. */
function befriend_with_obj(ptr, obj) {
    if (!ptr || !obj) return false;
    const mndx = ptr.mndx ?? ptr.pmidx;
    if (mndx === PM_MONKEY || mndx === PM_APE) {
        return objectNames[obj.otyp] === 'BANANA';
    }
    if (!is_domestic(ptr) || obj.oclass !== FOOD_CLASS) return false;
    // C: unicorn/horse class needs VEGGY (or lichen corpse)
    if (ptr.mlet === 'S_UNICORN') {
        const mat = game.objects?.[obj.otyp]?.oc_material ?? 0;
        if (mat === VEGGY) return true;
        const CORPSE = objectNames.indexOf('CORPSE');
        return obj.otyp === CORPSE && (obj.corpsenm | 0) === PM_LICHEN;
    }
    return true;
}

function The(str) {
    const t = the(str);
    return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
}

/**
 * C ref: zap.c miss — "The <missile> misses <mon>."
 * Local copy for tmiss (mthrowu miss is not exported).
 */
async function miss_missile(str, mtmp) {
    const bx = game.bhitpos?.x ?? mtmp.mx;
    const by = game.bhitpos?.y ?? mtmp.my;
    const whom = ((cansee(bx, by) || canspotmon(mtmp))
        && game.flags?.verbose !== false)
        ? mon_nam(mtmp) : 'it';
    await pline(`${The(str)} ${vtense(str, 'miss')} ${whom}.`);
}

/**
 * C ref: dothrow.c tmiss — miss message + maybe_wakeup `!rn2(3)` → wakeup.
 * mshot_xname multi-shot "Nth" prefix deferred → xname.
 */
async function tmiss(obj, mon, maybe_wakeup) {
    const missile = xname(obj); // C: mshot_xname(obj)
    if (!canseemon(mon)
        || (M_AP_TYPE(mon) && M_AP_TYPE(mon) !== M_AP_MONSTER)) {
        await pline(`${The(missile)} ${otense(obj, 'miss')}.`);
    } else {
        await miss_missile(missile, mon);
    }
    if (maybe_wakeup && !rn2(3)) await wakeup(mon, true);
}

/** C ref: you.h Luck — u.uluck + u.moreluck. */
function Luck() {
    const u = game.u || {};
    return (u.uluck || 0) + (u.moreluck || 0);
}

/** C ref: obj.h is_weptool — TOOL with oc_skill != P_NONE. */
function is_weptool(obj) {
    if (!obj || obj.oclass !== TOOL_CLASS) return false;
    const sk = game.objects?.[obj.otyp]?.oc_skill;
    if (sk != null && sk !== P_NONE) return true;
    const n = objectNames[obj.otyp];
    return n === 'PICK_AXE' || n === 'GRAPPLING_HOOK' || n === 'UNICORN_HORN'
        || n === 'AKLYS' || n === 'BULLWHIP';
}

/** C ref: obj.h is_axe. */
function is_axe(obj) {
    if (!obj) return false;
    if (obj.oclass !== WEAPON_CLASS && obj.oclass !== TOOL_CLASS) return false;
    return (game.objects?.[obj.otyp]?.oc_skill | 0) === P_AXE;
}

/** C ref: obj.h is_spear / is_blade / is_sword. */
function is_spear(obj) {
    return !!obj && obj.oclass === WEAPON_CLASS
        && (game.objects?.[obj.otyp]?.oc_skill | 0) === P_SPEAR;
}
function is_blade(obj) {
    if (!obj || obj.oclass !== WEAPON_CLASS) return false;
    const sk = game.objects?.[obj.otyp]?.oc_skill | 0;
    return sk >= P_DAGGER && sk <= P_SABER;
}
function is_sword(obj) {
    if (!obj || obj.oclass !== WEAPON_CLASS) return false;
    const sk = game.objects?.[obj.otyp]?.oc_skill | 0;
    return sk >= P_SHORT_SWORD && sk <= P_SABER;
}

/** C ref: wield.c / hack.h uslinging. */
function uslinging() {
    const uwep = game.u?.uwep;
    return !!(uwep && (game.objects?.[uwep.otyp]?.oc_skill | 0) === P_SLING);
}

/**
 * C ref: dothrow.c throwing_weapon — missile/spear/pierce-blade/hammer/aklys.
 */
function throwing_weapon(obj) {
    if (!obj) return false;
    if (is_missile(obj) || is_spear(obj)) return true;
    if (is_blade(obj) && !is_sword(obj)
        && ((game.objects?.[obj.otyp]?.oc_dir | 0) & PIERCE)) {
        return true;
    }
    return obj.otyp === WAR_HAMMER || obj.otyp === AKLYS;
}

/**
 * C ref: dothrow.c omon_adj — size/sleep/immobile/otyp to-hit; mon_notices
 * `!rn2(10)` unfreeze when mmove (thitmonst passes TRUE).
 */
function omon_adj(mon, obj, mon_notices) {
    let tmp = 0;
    tmp += ((mon.data?.msize ?? MZ_MEDIUM) - MZ_MEDIUM);
    if (mon.msleeping) tmp += 2;
    if (!mon.mcanmove || !(mon.data?.mmove)) {
        tmp += 4;
        if (mon_notices && mon.data?.mmove && !rn2(10)) {
            mon.mcanmove = 1;
            mon.mfrozen = 0;
        }
    }
    if (obj.otyp === HEAVY_IRON_BALL) {
        if (obj !== game.u?.uball) tmp += 2;
    } else if (obj.otyp === BOULDER) {
        tmp += 6;
    } else if (obj.oclass === WEAPON_CLASS || is_weptool(obj)
        || obj.oclass === GEM_CLASS) {
        tmp += hitval(obj, mon);
    }
    return tmp;
}

function helpless_thit(mon) {
    return !!(mon.msleeping || !mon.mcanmove);
}

/**
 * C ref: questpgr.c is_quest_artifact — otmp->oartifact == gu.urole.questarti.
 * C compares raw; guard want!==0 so incomplete JS urole (questarti still 0
 * on some roles) cannot treat every non-artifact as the quest item.
 */
function is_quest_artifact(obj) {
    const want = game.urole?.questarti | 0;
    return want !== 0 && (obj?.oartifact | 0) === want;
}

/**
 * C ref: dothrow.c special_obj_hits_leader — quest artifact / unique /
 * unknown fake Amulet vs quest leader. Catch / finish_quest is D-1312.
 */
export function special_obj_hits_leader(obj, mon) {
    const unique = !!(game.objects?.[obj.otyp]?.oc_unique);
    const fake = obj.otyp === FAKE_AMULET_OF_YENDOR && !obj.known;
    if (!(is_quest_artifact(obj) || unique || fake)) return false;
    const lid = game.quest_status?.leader_m_id | 0;
    return !!lid && (mon.m_id | 0) === lid;
}

/** C youprop.h Deaf — HDeaf || EDeaf || uroleplay.deaf. */
function Deaf_youprop() {
    const u = game.u || {};
    const prop = u.uprops?.[DEAF];
    return !!((prop?.intrinsic | 0) || (prop?.extrinsic | 0)
        || u.uroleplay?.deaf);
}

/**
 * C do_name.c Some_Monnam — highc(some_mon_nam). AUGMENT_IT in x_monnam
 * is still named; visible → Monnam, else Someone/Something.
 */
function Some_Monnam(mtmp) {
    if (canspotmon(mtmp)) return Monnam(mtmp);
    return is_animal(mtmp?.data) ? 'Something' : 'Someone';
}

/**
 * C ref: dothrow.c thitmonst — mon-hit after bhit / use_pole / kick.
 * Ported: tmp (Luck/DEX/distmin/bow-gloves/omon_adj/elf-orc);
 * WEAPON/weptool/GEM hit-vs-miss (kicked/ammo/thrown/applied) → hmon /
 * tmiss; APPLIED miss wakeup; pie/egg/venom DEX; food tamedog;
 * leader catch / finish_quest (D-1312); swallow vanish pline
 * (D-1324; entrails/currents + cockatrice minstapetrify/delobj).
 * Deferred: gem_accept luck/mpickobj; iron ball / boulder hit;
 * potionhit; check_shop_obj on mulch; mshot_xname.
 * @returns {boolean} true if obj was consumed / taken care of
 */
export async function thitmonst(mon, obj) {
    const u = game.u || {};
    const otyp = obj.otyp | 0;
    const guaranteed_hit = engulfing_u(mon);
    const hmode = (obj === u.uwep) ? HMON_APPLIED
        : (obj === game.kickedobj) ? HMON_KICKED
            : HMON_THROWN;

    // C dothrow.c:2026 — thrown/applied to-hit (not melee find_roll_to_hit)
    let tmp = -1 + Luck() + find_mac(mon) + (u.uhitinc | 0)
        + (Upolyd(u)
            ? (game.youmonst?.data?.mlevel | 0)
            : (u.ulevel | 0));
    const dex = acurr(A_DEX);
    if (dex < 4) tmp -= 3;
    else if (dex < 6) tmp -= 2;
    else if (dex < 8) tmp -= 1;
    else if (dex >= 14) tmp += (dex - 14);

    let disttmp = 3 - distmin(u.ux | 0, u.uy | 0, mon.mx | 0, mon.my | 0);
    if (disttmp < -4) disttmp = -4;
    tmp += disttmp;

    const uwep = u.uwep;
    if (u.uarmg && uwep && (game.objects?.[uwep.otyp]?.oc_skill | 0) === P_BOW) {
        switch (u.uarmg.otyp) {
        case GAUNTLETS_OF_POWER:
            tmp -= 2;
            break;
        case GAUNTLETS_OF_FUMBLING:
            tmp -= 3;
            break;
        case LEATHER_GLOVES:
        case GAUNTLETS_OF_DEXTERITY:
            break;
        default:
            break;
        }
    }

    tmp += omon_adj(mon, obj, true);
    if (is_orc(mon.data)
        && (Upolyd(u) ? is_elf(game.youmonst?.data) : Race_if(PM_ELF))) {
        tmp++;
    }
    if (guaranteed_hit) tmp += 1000;

    // Unicorn gems before dieroll (C: not a weapon attack)
    if (obj.oclass === GEM_CLASS && is_unicorn(mon.data)
        && (game.objects?.[obj.otyp]?.oc_material | 0) !== MINERAL
        && !uslinging()) {
        if (helpless_thit(mon)) {
            await tmiss(obj, mon, false);
            return false;
        } else if (mon.mtame) {
            await pline(`${Monnam(mon)} catches and drops ${the(xname(obj))}.`);
            return false;
        } else {
            await pline(`${Monnam(mon)} catches ${the(xname(obj))}.`);
            // gem_accept luck / mpickobj deferred
            return false;
        }
    }

    // C dothrow.c:2104–2149 — thrown/kicked quest artifact / unique / fake
    // AoY at the leader: catch, then keep or finish_quest+hand back.
    if (hmode !== HMON_APPLIED && special_obj_hits_leader(obj, mon)) {
        mon.msleeping = 0;
        if (mon.mstrategy != null) mon.mstrategy &= ~STRAT_WAITMASK;

        if (mon.mcanmove) {
            await pline(`${Some_Monnam(mon)} catches ${the(xname(obj))}.`);
            const unique = !!(game.objects?.[obj.otyp]?.oc_unique);
            if ((u.uevent?.invoked && unique
                    && (obj.otyp | 0) !== AMULET_OF_YENDOR)
                || !mon.mpeaceful) {
                if (mon.mpeaceful && !Deaf_youprop()) {
                    fully_identify_obj(obj);
                    await verbalize(
                        `${s_suffix_throw_gold(The(xname(obj)))} part in this is finished.`,
                    );
                    const aOrig = u.ualignbase?.original ?? u.ualign?.type ?? 0;
                    await verbalize(
                        `We will guard it in case it is ever needed again, ${align_gname(game.urole, aOrig)} forbid.`,
                    );
                }
                if ((u.ushops && u.ushops[0]) || obj.unpaid) {
                    const { check_shop_obj } = await import('./shk.js');
                    await check_shop_obj(obj, mon.mx | 0, mon.my | 0, false);
                }
                mpickobj(mon, obj);
            } else {
                const next2u = monnear(mon, u.ux | 0, u.uy | 0);
                await finish_quest(obj);
                await pline(`${Some_Monnam(mon)} ${next2u ? 'hands' : 'tosses'} ${the(xname(obj))} back to you.`);
                if (!next2u) await sho_obj_return_to_u(obj);
                const { addinv } = await import('./u_init.js');
                obj = await addinv(obj);
                await encumber_msg();
            }
            return true;
        }
        return false;
    }

    const dieroll = rnd(20);

    if (obj.oclass === WEAPON_CLASS || is_weptool(obj)
        || obj.oclass === GEM_CLASS) {
        if (hmode === HMON_KICKED) {
            tmp -= is_ammo(obj) ? 5 : 3;
        } else if (is_ammo(obj)) {
            if (!ammo_and_launcher(obj, uwep)) {
                tmp -= 4;
            } else {
                const erode = Math.max(uwep.oeroded | 0, uwep.oeroded2 | 0);
                tmp += (uwep.spe | 0) - erode;
                tmp += weapon_hit_bonus(uwep);
                if (uwep.oartifact) tmp += spec_abon(uwep, mon);
                if ((Race_if(PM_ELF) || Role_if(PM_SAMURAI))
                    && (!Upolyd(u) || your_race(game.youmonst?.data))
                    && (game.objects?.[uwep.otyp]?.oc_skill | 0) === P_BOW) {
                    tmp++;
                    if ((Race_if(PM_ELF) && uwep.otyp === ELVEN_BOW)
                        || (Role_if(PM_SAMURAI) && uwep.otyp === YUMI)) {
                        tmp++;
                    }
                }
            }
        } else {
            // thrown non-ammo or applied polearm/grapnel
            if (otyp === BOOMERANG) tmp += 4;
            else if (throwing_weapon(obj)) tmp += 2;
            else if (hmode === HMON_THROWN) tmp -= 2;
            tmp += weapon_hit_bonus(obj);
        }

        if (tmp >= dieroll) {
            const wasthrown = !!game.thrownobj;
            const chopper = is_axe(obj);
            if (hmode === HMON_APPLIED) {
                if (!u.uconduct) u.uconduct = {};
                u.uconduct.weaphit = (u.uconduct.weaphit | 0) + 1;
            }
            if (await hmon(mon, obj, hmode, dieroll)) {
                if (mon.wormno) {
                    const bp = game.bhitpos || {};
                    await cutworm(mon, bp.x | 0, bp.y | 0, chopper);
                }
            }
            exercise(A_DEX, true);
            if (wasthrown && !game.thrownobj) return true;
            if (should_mulch_missile(obj)) {
                obj.quan = 0;
                obj.where = OBJ_FREE;
                return true;
            }
            passive_obj(mon, obj, null);
        } else {
            await tmiss(obj, mon, true);
            if (hmode === HMON_APPLIED) await wakeup(mon, true);
        }
        return false;
    }

    // iron ball / boulder hit-vs-miss deferred (not WEAPON/weptool)

    // C dothrow.c:2256 — pie/egg/venom hit vs DEX (or swallow)
    if ((otyp === EGG || otyp === CREAM_PIE
            || otyp === BLINDING_VENOM || otyp === ACID_VENOM)
        && (guaranteed_hit || acurr(A_DEX) > rnd(25))) {
        await hmon(mon, obj, hmode, dieroll);
        return true; // C: hmon used it up
    }

    // potionhit arm deferred (same DEX rnd(25) gate when reached)

    if (befriend_with_obj(mon.data, obj)
        || (mon.mtame && dogfood(mon, obj) <= ACCFOOD)) {
        if (await tamedog(mon, obj, true)) return true;
        await tmiss(obj, mon, false);
        mon.msleeping = 0;
        if (mon.mstrategy != null) mon.mstrategy &= ~STRAT_WAITMASK;
        return false;
    }

    if (guaranteed_hit) {
        // C dothrow.c:2276–2298 — swallow vanish; md is ustuck->data.
        const md = game.u?.ustuck?.data;
        await wakeup(mon, true);
        if ((obj.otyp | 0) === CORPSE && touch_petrifies(mons(obj.corpsenm))) {
            if (is_animal(md)) {
                await minstapetrify(game.u.ustuck, true);
                // Don't leave a cockatrice corpse available in a statue
                if (!game.u?.uswallow) {
                    delobj(obj);
                    return true;
                }
            }
        }
        const trail = digests(md) ? ' entrails'
            : is_whirly(md) ? ' currents' : '';
        let monname = mon_nam(mon);
        if (trail) monname = s_suffix_throw_gold(monname);
        await pline(`${Tobjnam(obj, 'vanish')} into ${monname}${trail}.`);
        return false;
    }

    await tmiss(obj, mon, true);
    return false;
}

function Role_if(pm) {
    return game.urole?.mnum === pm;
}
function Race_if(pm) {
    return game.urace?.mnum === pm;
}

/** C ref: weapon.c weapon_type — abs(oc_skill). */
function weapon_type(obj) {
    if (!obj) return 0;
    const sk = game.objects?.[obj.otyp]?.oc_skill ?? 0;
    return sk < 0 ? -sk : sk;
}

/** C ref: skills.h P_SKILL — current skill rank (u.weapon_skills). */
function P_SKILL(type) {
    const slot = game.u?.weapon_skills?.[type];
    if (slot == null) return P_UNSKILLED;
    return typeof slot === 'object' ? (slot.skill ?? P_UNSKILLED) : (slot | 0);
}

/**
 * C ref: dothrow.c multishot_class_bonus — role volley extras.
 */
function multishot_class_bonus(pm, ammo, launcher) {
    let multishot = 0;
    const skill = game.objects?.[ammo.otyp]?.oc_skill ?? 0;
    switch (pm) {
    case PM_CAVE_DWELLER:
        if (skill === -P_SLING || skill === P_SPEAR) multishot++;
        break;
    case PM_MONK:
        if (skill === -P_SHURIKEN) multishot++;
        break;
    case PM_RANGER:
        if (skill !== P_DAGGER) multishot++;
        break;
    case PM_ROGUE:
        if (skill === P_DAGGER) multishot++;
        break;
    case PM_SAMURAI:
        if (ammo.otyp != null
            && objectNames[ammo.otyp] === 'YA'
            && launcher && objectNames[launcher.otyp] === 'YUMI') {
            multishot++;
        }
        break;
    default:
        break;
    }
    return multishot;
}

/**
 * C hacklib.c ordin — 1st/2nd/3rd/11th (teen exception).
 */
function ordin(n) {
    const dd = (n | 0) % 10;
    return (dd === 0 || dd > 3 || Math.trunc(((n | 0) % 100) / 10) === 1)
        ? 'th' : (dd === 1) ? 'st' : (dd === 2) ? 'nd' : 'rd';
}

/**
 * C dothrow.c endmultishot — stop remaining volley (boomhit self-hit /
 * hurtle). Verbose pline only when hero is not mon_moving.
 */
async function endmultishot(verbose) {
    const ms = game.m_shot;
    if (!ms || (ms.i | 0) >= (ms.n | 0)) return;
    if (verbose && !game.context?.mon_moving) {
        const i = ms.i | 0;
        await pline(
            `You stop ${ms.s ? 'firing' : 'throwing'} after the ${i}${ordin(i)} ${
                ms.s ? 'shot' : 'toss'
            }.`,
        );
    }
    ms.n = ms.i | 0;
}

/**
 * C hacklib.c s_suffix — it→its, you→your, *s→*', else *'s.
 * throw_gold strcat's " entrails" onto that buffer (dothrow.c:2674–2676).
 */
function s_suffix_throw_gold(s) {
    const buf = String(s ?? '');
    const low = buf.toLowerCase();
    if (low === 'it') return `${buf}s`;
    if (low === 'you') return `${buf}r`;
    if (buf.endsWith('s') || buf.endsWith('S')) return `${buf}'`;
    return `${buf}'s`;
}

/**
 * C dothrow.c throw_gold. Swallow (D-1302): after the self-cancel gate,
 * freeinv then add_to_minv(ustuck) — not swallowit/mpickobj — with
 * pline_The entrails when digests(ustuck->data). Named omit: You()
 * self pline / unsplitobj (D-0720); dz ceiling; bhit; ghitm;
 * ship_object; flooreffects; sellobj; quivered gold via throwit.
 */
export async function throw_gold(obj) {
    const u = game.u || {};
    // C :2661 — self before freeinv. Do not ingest gold thrown at `.`.
    if (!(u.dx || 0) && !(u.dy || 0) && !(u.dz || 0)) {
        // C You("cannot throw gold at yourself.") + unsplitobj named.
        return 0; // C ECMD_CANCEL; JS cmd.js treats truthy as time
    }
    if (u.uswallow) {
        freeinv(obj);
        if (obj?.oclass === COIN_CLASS) {
            game._goldCount = Math.max(
                0, (game._goldCount || 0) - (obj.quan || 0),
            );
            if (!game.flags) game.flags = {};
            game.flags.botl = true;
        }
        let swallower = mon_nam(u.ustuck);
        // C :2674 — digests → s_suffix(mon_nam) + " entrails"
        if (u.ustuck?.data && digests(u.ustuck.data)) {
            swallower = `${s_suffix_throw_gold(swallower)} entrails`;
        }
        await pline(`The gold disappears into ${swallower}.`);
        if (u.ustuck && obj) add_to_minv(u.ustuck, obj);
        return ECMD_TIME;
    }
    // Named omit: rest of throw_gold (dz / bhit / ghitm / ship / floor)
    return 0;
}

/**
 * C ref: dothrow.c throw_obj — multishot + split + throwit.
 * getdir is done by caller (dofire/dothrow) matching JS input boundary;
 * C calls getdir inside throw_obj — same one prompt either way.
 * After self refuse: u_wipe_engr(2) (D-1374; callee D-1051).
 */
export async function throw_obj(obj, shotlimit) {
    const u = game.u || {};
    // C throw_obj :112 — non-quiver coins → throw_gold (swallow D-1302)
    if (obj.oclass === COIN_CLASS) {
        if (obj !== (u.uquiver || null)) return throw_gold(obj);
        return 0; // quivered gold via throwit named omit
    }

    // C ref: dothrow.c throw_obj — after getdir, self (dx=dy=dz=0) refuses
    if (!(u.dx || 0) && !(u.dy || 0) && !(u.dz || 0)) {
        await pline('You cannot throw an object at yourself.');
        return 0; // ECMD_OK — no time
    }
    /* C dothrow.c throw_obj `:138` — after self refuse, before petrify /
       welded / wet-towel / multishot: u_wipe_engr(2). Callee D-1051;
       no extra RNG with no engraving / HEADSTONE / BURN-on-stone /
       Levitation. canletgo / Mjollnir / too-heavy still named (C
       returns before this wipe). D-1374. */
    u_wipe_engr(2);
    // C throw_obj :139–148 bare-hand cockatrice instapetrify + killer_xname
    // named omit (throwit returning-missile :1747 is D-1346).

    // C ref: dothrow.c:158–237 Multishot calculations
    let multishot = 1;
    const skill = game.objects?.[obj.otyp]?.oc_skill ?? 0;
    const uwep = game.u?.uwep || null;
    const quan = obj.quan || 1;
    if (quan > 1
        && (is_ammo(obj) ? ammo_and_launcher(obj, uwep)
            : obj.oclass === WEAPON_CLASS)
        && !(game.u?.Confusion || game.u?.Stunned
            || game.Confusion || game.Stunned)) {
        const weakmultishot = Role_if(PM_WIZARD) || Role_if(PM_CLERIC)
            || (Role_if(PM_HEALER) && skill !== P_KNIFE)
            || (Role_if(PM_TOURIST) && skill !== -P_DART)
            || game.Fumbling || game.u?.Fumbling
            || acurr(A_DEX) <= 6;

        switch (P_SKILL(weapon_type(obj))) {
        case P_EXPERT:
            multishot++;
            // FALLTHROUGH
        case P_SKILLED:
            if (!weakmultishot) multishot++;
            break;
        default:
            break;
        }
        multishot += multishot_class_bonus(game.urole?.mnum, obj, uwep);

        if (!weakmultishot) {
            if (Race_if(PM_ELF)
                && objectNames[obj.otyp] === 'ELVEN_ARROW'
                && uwep && objectNames[uwep.otyp] === 'ELVEN_BOW') {
                multishot++;
            } else if (Race_if(PM_ORC)
                && objectNames[obj.otyp] === 'ORCISH_ARROW'
                && uwep && objectNames[uwep.otyp] === 'ORCISH_BOW') {
                multishot++;
            } else if (Race_if(PM_GNOME) && skill === -P_CROSSBOW) {
                multishot++;
            }
            // quest artifact launcher bonus deferred
        }

        if (multishot > 1 && skill === -P_CROSSBOW
            && ammo_and_launcher(obj, uwep)) {
            // ACURRSTR gate deferred — still roll rnd when multishot>1
            multishot = rnd(multishot);
        }

        multishot = rnd(multishot);
        if (multishot > quan) multishot = quan;
        if (shotlimit > 0 && multishot > shotlimit) multishot = shotlimit;
    } else {
        // C: no volley path — still no rnd when quan==1 / no launcher
        multishot = 1;
    }

    const shot = ammo_and_launcher(obj, uwep);
    if (!game.m_shot) game.m_shot = { i: 0, n: 0, o: 0, s: false };
    // C throw_obj :240 — m_shot.s before volley pline
    game.m_shot.s = !!shot;
    if (multishot > 1 || shotlimit > 0) {
        // C ref: dothrow.c throw_obj — You("%s %d %s.", shoot|throw, n,
        //   (n==1) ? singular(obj, xname) : xname(obj));
        const name = (multishot === 1) ? singular(obj, xname) : xname(obj);
        await pline(`You ${shot ? 'shoot' : 'throw'} ${multishot} ${name}.`);
    }

    // C throw_obj: wep_mask = obj->owornmask before the volley; AutoReturn
    // reads this after freeinv has cleared the slot (D-1282).
    const wep_mask = obj.owornmask || 0;
    let oldslot = null;
    game.m_shot.o = obj.otyp | 0;
    game.m_shot.n = multishot;
    for (game.m_shot.i = 1; game.m_shot.i <= game.m_shot.n; game.m_shot.i++) {
        const twoweap = !!game.u?.twoweap;
        let otmp;
        if ((obj.quan || 1) > 1) {
            otmp = splitobj(obj, 1);
            // C: freeinv(otmp) after split — child may sit on invent nobj chain
            if (otmp) freeinv(otmp);
        } else {
            otmp = obj;
            const inv = game.invent || [];
            const idx = inv.indexOf(otmp);
            oldslot = (idx >= 0 && idx + 1 < inv.length) ? inv[idx + 1] : null;
            if (otmp.owornmask) {
                const { remove_worn_item } = await import('./steal.js');
                await remove_worn_item(otmp, false);
            }
            freeinv(otmp);
            obj = null;
        }
        if (!otmp) break;
        await throwit(otmp, wep_mask, twoweap, oldslot);
        const { encumber_msg } = await import('./invent.js');
        await encumber_msg();
    }
    game.m_shot.n = 0;
    game.m_shot.i = 0;
    game.m_shot.o = 0; // STRANGE_OBJECT
    game.m_shot.s = false;
    return 1;
}
/** C ref: pline.c You_hear — acoustics; Unaware/Underwater deferred. */
function Deaf() {
    const u = game.u || {};
    return !!(u.HDeaf || u.Deaf);
}
async function You_hear(line) {
    if (Deaf()) return;
    await pline(`You hear ${line}`);
}
function Blind() {
    return !!(game.u?.Blind || game.u?.ublind);
}
/** C: distu / next2u — adjacent incl. hero cell. */
function next2u(x, y) {
    const u = game.u || {};
    const dx = Math.abs((x | 0) - (u.ux | 0));
    const dy = Math.abs((y | 0) - (u.uy | 0));
    return dx <= 1 && dy <= 1;
}
/** C ref: objnam.c Doname2 — doname with leading capital. */
function Doname2(obj) {
    const s = doname(obj) || '';
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** C dungeon.c has_ceiling — endgame non-earth has no ceiling. */
function has_ceiling(lev) {
    if (In_endgame(lev) && !Is_earthlevel(lev)) return false;
    return true;
}

/**
 * C dungeon.c ceiling — room/air labels for toss_up plines.
 * Named omit: vault/temple/shop in_rooms; water/fire/quest/Underwater.
 */
function ceiling_at(x, y) {
    const typ = game.level?.at?.(x, y)?.typ ?? 0;
    if (IS_AIR(typ)) return 'sky';
    if (IS_ROOM(typ) || IS_WALL(typ) || IS_DOOR(typ) || typ === SDOOR) {
        return 'ceiling';
    }
    return 'rock cavern';
}

/** C youprop.h BlindedTimeout — HBlinded & TIMEOUT. */
function BlindedTimeout() {
    return (game.u?.HBlinded | 0) & TIMEOUT;
}

/** C youprop.h Hate_silver — lycanthrope or poly form hates_silver. */
function Hate_silver() {
    const u = game.u || {};
    return ((u.ulycn ?? NON_PM) | 0) >= LOW_PM
        || hates_silver(game.youmonst?.data);
}

/** C youprop.h Stone_resistance. */
function Stone_resistance_hero() {
    const u = game.u || {};
    return !!(u.Stone_resistance || u.HStone_resistance || u.EStone_resistance);
}

/** C do_wear.c hard_helmet — metallic or glass helm. */
function hard_helmet(obj) {
    if (!obj) return false;
    const mat = game.objects?.[obj.otyp]?.oc_material ?? 0;
    if (mat >= IRON && mat <= MITHRIL) return true;
    if (mat === GLASS && (obj.oclass === ARMOR_CLASS
        || game.objects?.[obj.otyp]?.oc_class === ARMOR_CLASS)) return true;
    return false;
}

/** C objnam.c helm_simple_name — "hat" polish deferred. */
function helm_simple_name(_obj) {
    return 'helmet';
}

/** C mondata.h passes_rocks. */
function passes_rocks(ptr) {
    return !!(passes_walls(ptr) && !unsolid(ptr));
}

/** C obj.h stone_missile. */
function stone_missile(obj) {
    if (!obj) return false;
    const mat = game.objects?.[obj.otyp | 0]?.oc_material | 0;
    return (mat === GEMSTONE || mat === MINERAL)
        && (obj.oclass | 0) !== RING_CLASS;
}

/**
 * C ref: dothrow.c harmless_missile — soft items that bounce quietly.
 * Canonical here (C dothrow.c); mthrowu.js keeps a local copy for hit_bars.
 */
function harmless_missile(obj) {
    if (!obj) return false;
    const otyp = obj.otyp | 0;
    switch (otyp) {
    case SLING:
    case EUCALYPTUS_LEAF:
    case KELP_FROND:
    case SPRIG_OF_WOLFSBANE:
    case FORTUNE_COOKIE:
    case PANCAKE:
        return true;
    case RUBBER_HOSE:
    case BAG_OF_TRICKS:
        return (obj.spe | 0) < 1;
    case SACK:
    case OILSKIN_SACK:
    case BAG_OF_HOLDING:
        return !Has_contents(obj);
    default:
        if ((obj.oclass | 0) === SCROLL_CLASS) return true;
        if ((game.objects?.[otyp]?.oc_material | 0) === CLOTH) return true;
        break;
    }
    return false;
}

/**
 * C ref: mondata.c can_blnd — toss_up AT_WEAP cream pie / blinding venom
 * vs you. Named omit: Blindfolded/ublindf/visor; other aatyp.
 */
function can_blnd_toss_self(obj) {
    if (!haseyes(game.youmonst?.data)) return false;
    const otyp = obj?.otyp | 0;
    if (otyp !== CREAM_PIE && otyp !== BLINDING_VENOM) return false;
    if (game.u?.uswallow) return false;
    return true;
}

/**
 * C zap.c hit when mtmp == youmonst — always verbose, mon_nam → "you"
 * (x_monnam youmonst still named in do_name.js).
 */
async function hit_youmonst(str, force) {
    await pline(`${The(str)} ${vtense(str, 'hit')} you${force}`);
}

/**
 * C ref: dothrow.c breaktest — obj_resists then glass / potion / egg /
 * cream pie / melon / venom / camera.
 */
export function breaktest(obj) {
    if (!obj) return false;
    const oc = game.objects?.[obj.otyp | 0];
    let nonbreakchance = 1;
    if (obj.oclass === ARMOR_CLASS && (oc?.oc_material | 0) === GLASS) {
        nonbreakchance = 90;
    }
    if (obj_resists(obj, nonbreakchance, 99)) return false;
    if ((oc?.oc_material | 0) === GLASS && !obj.oartifact
        && obj.oclass !== GEM_CLASS) {
        return true;
    }
    const otyp = obj.oclass === POTION_CLASS ? POT_WATER : (obj.otyp | 0);
    switch (otyp) {
    case EXPENSIVE_CAMERA:
    case POT_WATER:
    case EGG:
    case CREAM_PIE:
    case MELON:
    case ACID_VENOM:
    case BLINDING_VENOM:
        return true;
    default:
        return false;
    }
}

/**
 * C ref: dothrow.c breakmsg — shatter / splat / mess / splash.
 * Crackable armor silent (erode_obj owns the message).
 */
async function breakmsg(obj, in_view) {
    if (!obj || is_crackable(obj)) return;
    let to_pieces = '';
    const otyp = obj.oclass === POTION_CLASS ? POT_WATER : (obj.otyp | 0);
    switch (otyp) {
    default:
        // glass/crystal wand (and odd types) — fall through to shatter
        // FALLTHROUGH
    case LENSES:
    case MIRROR:
    case CRYSTAL_BALL:
    case EXPENSIVE_CAMERA:
        to_pieces = ' into a thousand pieces';
        // FALLTHROUGH
    case POT_WATER:
        if (!in_view) await You_hear('something shatter!');
        else {
            const quan = obj.quan | 0;
            await pline(
                `${Doname2(obj)} shatter${quan === 1 ? 's' : ''}${to_pieces}!`,
            );
        }
        break;
    case EGG:
    case MELON:
        await pline('Splat!');
        break;
    case CREAM_PIE:
        if (in_view) await pline('What a mess!');
        break;
    case ACID_VENOM:
    case BLINDING_VENOM:
        await pline('Splash!');
        break;
    }
}

/**
 * C ref: dothrow.c breakobj — side effects then delobj (non-fracture).
 * Named omit: crackable erode_obj; explode_oil; release_camera_demon;
 * pyrolisk explode; break_seq simultaneous make_angry polish.
 * @returns {Promise<number>} 1 if destroyed
 */
/** Exported for flooreffects hot-ground shatter (do.c; D-0992). */
export async function breakobj(obj, x, y, hero_caused, from_invent) {
    if (!obj) return 0;
    if (is_crackable(obj)) {
        // erode_obj ERODE_CRACK deferred — still remove for striking path
        delobj(obj);
        return 1;
    }
    const otyp = obj.oclass === POTION_CLASS ? POT_WATER : (obj.otyp | 0);
    let fracture = false;
    switch (otyp) {
    case MIRROR:
        if (hero_caused) change_luck(-2);
        break;
    case POT_WATER:
        obj.in_use = 1;
        if ((obj.otyp | 0) === POT_OIL && obj.lamplit) {
            // explode_oil deferred
        } else if (next2u(x, y)) {
            await potionbreathe(obj);
        }
        break;
    case EXPENSIVE_CAMERA:
        // release_camera_demon deferred
        break;
    case EGG:
        if (hero_caused && obj.spe && ismnum(obj.corpsenm)) {
            change_luck(-Math.min(obj.quan | 0, 5));
        }
        void PM_PYROLISK; // explosion deferred
        break;
    case BOULDER:
    case STATUE:
        fracture = true;
        break;
    default:
        break;
    }
    // C: hero_caused shop billing (D-0994)
    if (hero_caused) {
        const { check_shop_obj, stolen_value, costly_spot, shop_keeper,
            make_angry_shk } = await import('./shk.js');
        const { in_rooms } = await import('./hack.js');
        const { SHOPBASE, ESHK } = await import('./const.js');
        const ushops = game.u?.ushops || '';
        if (from_invent || obj.unpaid) {
            if (ushops || obj.unpaid) {
                await check_shop_obj(obj, x, y, true);
            }
        } else if (!obj.no_charge && costly_spot(x, y)) {
            const o_shop = in_rooms(x, y, SHOPBASE) || '';
            const shkp = shop_keeper(o_shop.charCodeAt(0) || 0);
            if (shkp) {
                const loss = await stolen_value(
                    obj, x, y, !!shkp.mpeaceful, false,
                );
                if (loss > 0
                    && o_shop.charCodeAt(0) !== (ushops.charCodeAt(0) || 0)) {
                    await make_angry_shk(shkp, x, y);
                }
                void ESHK;
            }
        }
    }
    if (!fracture) delobj(obj);
    return 1;
}

/**
 * C ref: dothrow.c hero_breaks — breaktest/breakmsg/breakobj by hero.
 * @returns {Promise<number>} 0 if intact, 1 if broke
 */
export async function hero_breaks(obj, x, y, breakflags = 0) {
    if (!obj) return 0;
    const from_invent = (breakflags & BRK_FROM_INV) !== 0;
    const in_view = Blind() ? false : (from_invent || cansee(x, y));
    let brk = breakflags & BRK_KNOWN_OUTCOME;
    if (!brk) {
        brk = breaktest(obj) ? BRK_KNOWN2BREAK : BRK_KNOWN2NOTBREAK;
    }
    if (brk === BRK_KNOWN2NOTBREAK) return 0;
    await breakmsg(obj, in_view);
    return breakobj(obj, x, y, true, from_invent);
}

/**
 * C ref: dothrow.c breaks — non-hero breakage path.
 * @returns {Promise<number>} 0 if intact, 1 if broke
 */
export async function breaks(obj, x, y) {
    if (!obj) return 0;
    const in_view = Blind() ? false : cansee(x, y);
    if (!breaktest(obj)) return 0;
    await breakmsg(obj, in_view);
    return breakobj(obj, x, y, false, false);
}

/** C dungeon.c surface — hitfloor verbose wording (soft/altar skipped). */
function hitfloor_surface(x, y) {
    const loc = game.level?.at?.(x, y);
    const typ = loc?.typ ?? 0;
    if (typ === ICE) return 'ice';
    if (IS_FOUNTAIN(typ)) return 'fountain';
    if (IS_ALTAR(typ)) return 'altar';
    if (IS_ROOM(typ) && !Is_earthlevel(game.u?.uz)) return 'floor';
    return 'ground';
}

/**
 * C ref: dothrow.c hitfloor — object hits floor at hero's feet.
 * Soft/water/swallow → dropy; altar doaltarobj then continues;
 * verbosely WAN_STRIKING "strike" else "hit" + tseen trap overlay;
 * hero_breaks BRK_FROM_INV; ship_object; dropz(TRUE) (D-1263).
 * Wired: do.c drop !can_reach_floor; mkobj hornoplenty tip;
 * invent hold_another_object drop_it hitfloor(FALSE) (D-1272);
 * pickup tipcontainer highdrop hitfloor(TRUE) (D-1273);
 * toss_up / throwit u.dz (D-1274).
 * Named omit: ball litter; artifact; finesse_ahriman float_down.
 * throwit boomhit is D-1301 (stamina D-1293; slip D-1292; swallowit D-1283;
 * steed potion D-1297).
 */
export async function hitfloor(obj, verbosely) {
    if (!obj) return;
    const u = game.u || {};
    const ux = u.ux | 0;
    const uy = u.uy | 0;
    const typ = game.level?.at?.(ux, uy)?.typ ?? 0;
    const { dropy, dropz, doaltarobj } = await import('./do.js');
    if (IS_SOFT(typ) || u.uinwater || u.uswallow) {
        await dropy(obj);
        return;
    }
    if (IS_ALTAR(typ)) {
        await doaltarobj(obj);
    } else if (verbosely) {
        const verb = ((obj.otyp | 0) === WAN_STRIKING) ? 'strike' : 'hit';
        let surf = hitfloor_surface(ux, uy);
        const t = t_at(ux, uy);
        if (t && t.tseen) {
            switch (t.ttyp | 0) {
            case TRAPDOOR:
                surf = 'trap door';
                break;
            case HOLE:
                surf = 'edge of the hole';
                break;
            case PIT:
            case SPIKED_PIT:
                surf = 'edge of the pit';
                break;
            default:
                break;
            }
        }
        await pline(`${Doname2(obj)} ${otense(obj, verb)} the ${surf}.`);
    }
    if (await hero_breaks(obj, ux, uy, BRK_FROM_INV)) return;
    const { ship_object } = await import('./dokick.js');
    if (await ship_object(obj, ux, uy, false)) return;
    await dropz(obj, true);
}

/**
 * C ref: dothrow.c toss_up — hero tosses an object upward.
 * Returns false if the object is gone. Caller throwit u.dz<0
 * (D-1274): toss_up(obj, rn2(5) && !Underwater).
 * Ceiling-return for AutoReturn is throwit (D-1282), not toss_up.
 * Named omit: crackable breakobj
 * erode (existing); potionhit youmonst-pointer (JS null=you);
 * ceiling vault/temple/shop/water/fire/quest/Underwater labels;
 * helm "hat" polish; Eyes vision_clears.
 */
export async function toss_up(obj, hitsroof) {
    if (!obj) return false;
    const u = game.u || {};
    const otyp = obj.otyp | 0;
    const corpsePtr = ismnum(obj.corpsenm) ? mons(obj.corpsenm) : null;
    const isPetrifier = ((otyp === EGG || otyp === CORPSE)
        && ismnum(obj.corpsenm)
        && touch_petrifies(corpsePtr));
    const ux = u.ux | 0;
    const uy = u.uy | 0;
    let action;
    if (!has_ceiling(u.uz)) {
        action = 'flies up into';
    } else if (hitsroof) {
        if (breaktest(obj)) {
            await pline(`${Doname2(obj)} hits the ${ceiling_at(ux, uy)}.`);
            await breakmsg(obj, !Blind());
            if (!(await breakobj(obj, ux, uy, true, true))) {
                await hitfloor(obj, false);
                game.thrownobj = null;
                return true;
            }
            return false;
        }
        action = 'hits';
    } else {
        action = 'almost hits';
    }
    await pline(
        `${Doname2(obj)} ${action} the ${ceiling_at(ux, uy)}, then falls back on top of your ${body_part(HEAD)}.`,
    );

    if ((obj.oclass | 0) === POTION_CLASS) {
        // C: potionhit(&gy.youmonst, obj, POTHIT_HERO_THROW)
        // JS potionhit: null = you (youmonst identity still named)
        await potionhit(null, obj, POTHIT_HERO_THROW);
    } else if (breaktest(obj)) {
        const blindinc = ((otyp === CREAM_PIE || otyp === BLINDING_VENOM)
            && can_blnd_toss_self(obj))
            ? rnd(25)
            : 0;
        await breakmsg(obj, !Blind());
        let still = obj;
        if (await breakobj(obj, ux, uy, true, true)) {
            still = null;
        }
        switch (otyp) {
        case EGG:
            if (isPetrifier && !Stone_resistance_hero()
                && !(poly_when_stoned(game.youmonst?.data, game.mvitals)
                    && await polymon(PM_STONE_GOLEM))) {
                if (u.uarmh) {
                    await pline(
                        `Your ${helm_simple_name(u.uarmh)} fails to protect you.`,
                    );
                }
                return await toss_up_petrify(still);
            }
            // FALLTHROUGH
        case CREAM_PIE:
        case BLINDING_VENOM:
            await pline(`You've got it all over your ${body_part(FACE)}!`);
            if (blindinc) {
                if (otyp === BLINDING_VENOM && !Blind()) {
                    await pline('It blinds you!');
                }
                u.ucreamed = (u.ucreamed | 0) + blindinc;
                const { make_blinded } = await import('./do.js');
                await make_blinded(BlindedTimeout() + blindinc, false);
                if (!Blind()) await pline('Your vision clears.');
            }
            break;
        default:
            break;
        }
        if (!still) return false;
        await hitfloor(still, false);
        game.thrownobj = null;
    } else if (harmless_missile(obj)) {
        await pline("It doesn't hurt.");
        await hitfloor(obj, false);
        game.thrownobj = null;
    } else {
        const material = game.objects?.[otyp]?.oc_material | 0;
        const is_silver = material === SILVER;
        let less_damage = !!(hard_helmet(u.uarmh)
            && (!is_silver || !Hate_silver()));
        let harmless = !!(stone_missile(obj)
            && passes_rocks(game.youmonst?.data));
        let artimsg = false;
        let dmg = dmgval(obj, game.youmonst);
        if (obj.oartifact && !harmless) {
            const dmgBox = { dmg };
            artimsg = artifact_hit(null, game.youmonst, obj, dmgBox, rn1(18, 2));
            dmg = dmgBox.dmg | 0;
        }
        if (!dmg) {
            dmg = Math.trunc(((obj.owt | 0) + (WT_TO_DMG - 1)) / WT_TO_DMG);
            dmg = (dmg <= 1) ? 1 : rnd(dmg);
            if (dmg > 6) dmg = 6;
            if ((game.youmonst?.data?.mndx | 0) === PM_SHADE && !is_silver) {
                dmg = 0;
            }
            if (obj.blessed && mon_hates_blessings(game.youmonst)) {
                dmg += rnd(4);
            }
            if (is_silver && Hate_silver()) dmg += rnd(20);
        }
        if (dmg > 1 && less_damage) dmg = 1;
        if (dmg > 0) dmg += u.udaminc | 0;
        if (dmg < 0) dmg = 0;
        dmg = maybe_half_phys(dmg);

        const hp = Upolyd(u) ? (u.mh | 0) : (u.uhp | 0);
        if (u.uarmh) {
            if ((less_damage && dmg < hp) || harmless) {
                if (!artimsg) {
                    if (!harmless) {
                        await pline('Fortunately, you are wearing a hard helmet.');
                    } else {
                        await pline(
                            `Unfortunately, you are wearing ${an(helm_simple_name(u.uarmh))}.`,
                        );
                    }
                }
            } else if (!isPetrifier) {
                if (game.flags?.verbose !== false) {
                    await pline(
                        `Your ${helm_simple_name(u.uarmh)} does not protect you.`,
                    );
                }
            }
            harmless = false;
        } else if (isPetrifier && !Stone_resistance_hero()
            && !(poly_when_stoned(game.youmonst?.data, game.mvitals)
                && await polymon(PM_STONE_GOLEM))) {
            return await toss_up_petrify(obj);
        }
        if (is_silver && Hate_silver()) {
            await pline('The silver sears you!');
        }
        if (harmless) {
            await hit_youmonst(thesimpleoname(obj), " but doesn't hurt.");
        }
        await hitfloor(obj, true);
        game.thrownobj = null;
        if (!harmless) {
            losehp(dmg, 'falling object', KILLED_BY_AN);
            const { finish_losehp_done } = await import('./end.js');
            await finish_losehp_done();
            await finish_maybe_wail();
        }
    }
    return true;
}

/** C toss_up petrify: goto petrify — killer, You turn to stone, dropy, done. */
async function toss_up_petrify(obj) {
    if (!game.killer) game.killer = { name: '', format: 0 };
    game.killer.format = KILLED_BY;
    game.killer.name = 'elementary physics';
    await pline('You turn to stone.');
    if (obj) {
        const { dropy } = await import('./do.js');
        await dropy(obj);
    }
    game.thrownobj = null;
    const { done } = await import('./end.js');
    await done(STONING);
    return !!obj;
}

/**
 * C dothrow.c throwit_return — drop iflags.returning_missile; optionally
 * clear gt.thrownobj. Every throwit exit after AutoReturn must call this.
 */
function throwit_return(clear_thrownobj) {
    if (!game.iflags) game.iflags = {};
    game.iflags.returning_missile = null;
    if (clear_thrownobj) game.thrownobj = null;
}

/** C objnam.c Tobjnam — The(xname) + optional otense verb. */
function Tobjnam(obj, verb) {
    let bp = The(xname(obj));
    if (verb) bp += ` ${otense(obj, verb)}`;
    return bp;
}

/** C youprop.h throwit impaired = Confusion||Stunned||Blind||Hallucination||Fumbling. */
function throw_impaired() {
    const u = game.u || {};
    return !!((u.HConfusion | 0) || u.Confusion
        || (u.HStun | 0) || u.Stunned
        || Blind()
        || Hallucination()
        || Fumbling()
        || game.Confusion || game.Stunned || game.Fumbling);
}

/** C youprop.h Levitation — message "beneath" vs "at" feet. */
function Levitation_throw() {
    const u = game.u || {};
    return !!(u.Levitation || (u.HLevitation | 0) || (u.ELevitation | 0));
}

/**
 * C invent.c addinv_before — nomerge addinv then insert before oldslot
 * (!fixinv). JS invent is an array; letter reorder still happens in addinv.
 */
async function addinv_before_throw(obj, other_obj) {
    if (!obj) return obj;
    obj.how_lost = LOST_NONE;
    obj.nomerge = 1;
    const { addinv } = await import('./u_init.js');
    obj = await addinv(obj);
    if (obj) obj.nomerge = 0;
    if (other_obj && obj) {
        const inv = game.invent || [];
        const i = inv.indexOf(obj);
        const j = inv.indexOf(other_obj);
        if (i >= 0 && j >= 0 && i !== j) {
            inv.splice(i, 1);
            const j2 = inv.indexOf(other_obj);
            if (j2 >= 0) inv.splice(j2, 0, obj);
            else inv.push(obj);
        }
    }
    return obj;
}

/**
 * C dothrow.c return_throw_to_inv — restore a throw-and-return missile.
 * Named omit: objsplit unsplit (unique aklys/Mjollnir are not split).
 */
async function return_throw_to_inv(obj, wep_mask, twoweap, oldslot) {
    obj = await addinv_before_throw(obj, oldslot);
    if (!obj) return obj;
    if (((obj.owornmask || 0) & W_QUIVER) !== 0
        && (((obj.owornmask || 0) | wep_mask) & (W_WEP | W_SWAPWEP)) !== 0) {
        setuqwep(null);
    }
    const u = game.u || {};
    if ((wep_mask & W_WEP) && !u.uwep) setuwep(obj);
    else if ((wep_mask & W_SWAPWEP) && !u.uswapwep) setuswapwep(obj);
    else if ((wep_mask & W_QUIVER) && !u.uquiver) setuqwep(obj);
    if (twoweap && !u.twoweap) set_twoweap(true);
    const { encumber_msg } = await import('./invent.js');
    await encumber_msg();
    return obj;
}

/**
 * C dothrow.c swallowit — ingested by u.ustuck. mpickobj clears
 * thrownobj (steal.c); throwit_return(FALSE). uball: throwit_return(TRUE).
 */
async function swallowit(obj) {
    const u = game.u || {};
    if (obj !== u.uball) {
        const stuck = u.ustuck;
        if (stuck && obj) {
            const { mpickobj } = await import('./makemon.js');
            mpickobj(stuck, obj);
        }
        throwit_return(false);
    } else {
        throwit_return(true);
    }
}

/**
 * C dothrow.c sho_obj_return_to_u — flash the missile back along the
 * throw vector (not boomerangs). Display RNG via obj_to_glyph(...,
 * rn2_on_display_rng). Wielded aklys uses tmp_at(DISP_END, BACKTRACK)
 * (D-1311) instead of this FLASH walk. Leader !next2u is the
 * thitmonst catch caller (D-1312).
 */
export async function sho_obj_return_to_u(obj) {
    const u = game.u || {};
    const bp = game.bhitpos || {};
    const dx = u.dx | 0;
    const dy = u.dy | 0;
    if (!(dx || dy)
        || ((bp.x | 0) === (u.ux | 0) && (bp.y | 0) === (u.uy | 0))) {
        return;
    }
    let x = (bp.x | 0) - dx;
    let y = (bp.y | 0) - dy;
    tmp_at(DISP_FLASH, obj_glyph(obj));
    while (isok(x, y) && (x !== (u.ux | 0) || y !== (u.uy | 0))) {
        tmp_at(x, y);
        await nh_delay_output();
        x -= dx;
        y -= dy;
    }
    tmp_at(DISP_END, 0);
}

/**
 * C dothrow.c throwit returning_missile after bhit (Mjollnir or aklys).
 * Returns true if the object was handled (do not land).
 * Tethered: tmp_at(DISP_END, BACKTRACK) on success, DISP_END 0 on fail
 * (D-1311). Leader catch finish_quest is D-1312.
 * Arm-hit losehp uses killer_xname + KILLED_BY (D-1346; C `:1747–1748`).
 */
async function throwit_returning_missile(
    obj, wep_mask, twoweap, oldslot, x, y, impaired, tethered_weapon,
) {
    if (!game.iflags?.returning_missile) return false;
    // C bhit left gb.bhitpos at the stop cell; JS fly uses locals.
    if (!game.bhitpos) game.bhitpos = { x: 0, y: 0 };
    game.bhitpos.x = x | 0;
    game.bhitpos.y = y | 0;
    if (!rn2(100)) {
        // C :1760–1762 — fail-to-return closes tether without BACKTRACK
        await throwit_tether_end(tethered_weapon, false);
        await pline(`${Tobjnam(obj, 'fail')} to return!`);
        // C :1772 — fail-to-return while swallowed → swallowit, do not land
        if (game.u?.uswallow) {
            await swallowit(obj);
            return true;
        }
        return false;
    }
    // C :1712–1715 — tethered BACKTRACK else sho_obj_return_to_u
    if (tethered_weapon) {
        await throwit_tether_end(true, true);
    } else {
        await sho_obj_return_to_u(obj);
    }
    if (!impaired && rn2(100)) {
        await pline(`${Tobjnam(obj, 'return')} to your hand!`);
        obj = await addinv_before_throw(obj, oldslot);
        const { encumber_msg } = await import('./invent.js');
        await encumber_msg();
        if ((obj.owornmask || 0) & W_QUIVER) setuqwep(null);
        setuwep(obj);
        set_twoweap(!!twoweap);
        if (cansee(x, y)) newsym(x, y);
        throwit_return(true);
        return true;
    }
    let dmg = rn2(2);
    const where = Levitation_throw() ? 'beneath' : 'at';
    const feet = makeplural(body_part(FOOT));
    if (!dmg) {
        if (Blind()) {
            await pline(`Something lands ${where} your ${feet}.`);
        } else {
            await pline(
                `${Tobjnam(obj, 'return')} back to you, landing ${where} your ${feet}.`,
            );
        }
    } else {
        dmg += rnd(3);
        if (Blind()) {
            await pline(`${Tobjnam(obj, 'hit')} your ${body_part(ARM)}!`);
        } else {
            await pline(
                `${Tobjnam(obj, 'fly')} back toward you, hitting your ${body_part(ARM)}!`,
            );
        }
        if (obj.oartifact) {
            const dmgBox = { dmg };
            artifact_hit(null, game.youmonst, obj, dmgBox, 0);
            dmg = dmgBox.dmg | 0;
        }
        // C dothrow.c:1747–1748 killer_xname + KILLED_BY (D-1346; not xname)
        losehp(maybe_half_phys(dmg), killer_xname(obj), KILLED_BY);
        const { finish_losehp_done } = await import('./end.js');
        await finish_losehp_done();
        await finish_maybe_wail();
    }
    // C :1751 — fail-catch while swallowed → swallowit, not dropy
    if (game.u?.uswallow) {
        await swallowit(obj);
        return true;
    }
    {
        const { ship_object } = await import('./dokick.js');
        const { dropy } = await import('./do.js');
        if (!(await ship_object(obj, game.u.ux | 0, game.u.uy | 0, false))) {
            await dropy(obj);
        }
    }
    throwit_return(true);
    return true;
}

/** C hack.h DIR_LEFT / DIR_RIGHT / DIR_CLAMP — 8-dir wrap. */
function DIR_LEFT(dir) { return ((dir | 0) + 7) % N_DIRS; }
function DIR_RIGHT(dir) { return ((dir | 0) + 1) % N_DIRS; }
function DIR_CLAMP(dir) { return ((dir | 0) + N_DIRS) % N_DIRS; }

/** C youprop.h URIGHTY — u.uhandedness == RIGHT_HANDED. */
function URIGHTY() {
    return ((game.u?.uhandedness | 0) === RIGHT_HANDED);
}

/** C youprop.h Deaf — H||E||uroleplay.deaf (Klonk). */
function Deaf_boom() {
    const u = game.u || {};
    return !!((u.HDeaf | 0) || (u.EDeaf | 0) || u.uroleplay?.deaf || u.Deaf);
}

/** C youprop.h Levitation — (H||E) && !B. throwit air/lev hurtle before boomhit. */
function Levitation_boom() {
    const u = game.u || {};
    return !!((u.Levitation || (u.HLevitation | 0) || (u.ELevitation | 0))
        && !(u.BLevitation | 0));
}

/** C defsym.h S_boomleft ')' / S_boomright '(' HI_WOOD. */
const BOOM_LEFT_GLYPH = { ch: ')', color: HI_WOOD, dec: false };
const BOOM_RIGHT_GLYPH = { ch: '(', color: HI_WOOD, dec: false };

function youmonst_ptr() {
    if (!game.youmonst) game.youmonst = { _youmonst: true };
    return game.youmonst;
}

function is_youmonst_ptr(mon) {
    return !!(mon && (mon === game.youmonst || mon._youmonst));
}

/** C hack.c closed_door — IS_DOOR && (CLOSED|LOCKED). */
function closed_door_boom(x, y) {
    const loc = game.level?.at?.(x, y);
    if (!loc || !IS_DOOR(loc.typ)) return false;
    return !!((loc.doormask || 0) & (D_CLOSED | D_LOCKED));
}

/**
 * C dothrow.c throwit_mon_hit — snuff_candle, thitmonst, shk hot_pursuit.
 * Callers: throwit (D-1315), boomhit (D-1301). boomhit m_respond is D-1314.
 * apply.js imports thitmonst — snuff_candle is a dynamic import.
 * dokick really_kick_object snuff is D-1325; throwit land :1818 is
 * D-1333 (not this helper).
 */
export async function throwit_mon_hit(obj, mon) {
    if (!mon) return false;
    if (mon.isshk && (obj.where | 0) === OBJ_MINVENT && obj.ocarry === mon) {
        return true;
    }
    // C apply.c snuff_candle — candles / candelabrum only, not snuff_lit
    const { snuff_candle } = await import('./apply.js');
    await snuff_candle(obj);
    const bp = game.bhitpos || {};
    game.notonhead = ((bp.x | 0) !== (mon.mx | 0) || (bp.y | 0) !== (mon.my | 0));
    const obj_gone = await thitmonst(mon, obj);
    // C: Monster may have been tamed; this frees old mon [obsolete]
    const hitpos = game.bhitpos || bp;
    mon = m_at(hitpos.x | 0, hitpos.y | 0);
    if (mon && mon.isshk) {
        const { hot_pursuit, inside_shop } = await import('./shk.js');
        const u = game.u || {};
        const ushop0 = (u.ushops || '')[0] || '';
        const rooms = in_rooms(mon.mx | 0, mon.my | 0, SHOPBASE) || '';
        // C strchr(in_rooms(...), *u.ushops): NUL matches the terminator
        const strchrHit = ushop0 === '' || rooms.includes(ushop0);
        if (!inside_shop(u.ux | 0, u.uy | 0) || !strchrHit) {
            hot_pursuit(mon);
        }
    }
    if (obj_gone) game.thrownobj = null;
    return false;
}

/**
 * C zap.c boomhit — thrown boomerang 10-step curve (not linear bhit).
 * m_respond D-1314. Soundeffect named.
 */
export async function boomhit(obj, dx, dy) {
    const u = game.u || {};
    let nhits = Math.max(1, (obj.spe | 0) + 1);
    const counterclockwise = URIGHTY();
    if (!game.bhitpos) game.bhitpos = { x: 0, y: 0 };
    game.bhitpos.x = u.ux | 0;
    game.bhitpos.y = u.uy | 0;
    let boom = counterclockwise ? BOOM_LEFT_GLYPH : BOOM_RIGHT_GLYPH;
    let i = xytodir(dx | 0, dy | 0);
    tmp_at(DISP_FLASH, boom);
    for (let ct = 0; ct < 10; ct++) {
        i = DIR_CLAMP(i);
        boom = (boom === BOOM_LEFT_GLYPH) ? BOOM_RIGHT_GLYPH : BOOM_LEFT_GLYPH;
        tmp_at(DISP_CHANGE, boom);
        dx = xdir[i] | 0;
        dy = ydir[i] | 0;
        game.bhitpos.x += dx;
        game.bhitpos.y += dy;
        if (!isok(game.bhitpos.x, game.bhitpos.y)) {
            game.bhitpos.x -= dx;
            game.bhitpos.y -= dy;
            break;
        }
        const mtmp = m_at(game.bhitpos.x, game.bhitpos.y);
        if (mtmp) {
            await m_respond(mtmp);
            const oldHits = nhits;
            nhits = oldHits - 1;
            if (oldHits < 0) {
                tmp_at(DISP_END, 0);
                return mtmp;
            } else if ((await throwit_mon_hit(obj, mtmp)) || !game.thrownobj) {
                break;
            }
        }
        const loc = game.level?.at?.(game.bhitpos.x, game.bhitpos.y);
        const typ = loc?.typ ?? 0;
        if (!ZAP_POS(typ) || closed_door_boom(game.bhitpos.x, game.bhitpos.y)) {
            game.bhitpos.x -= dx;
            game.bhitpos.y -= dy;
            break;
        }
        if (u_at(game.bhitpos.x, game.bhitpos.y)) {
            if (Fumbling() || rn2(20) >= acurr(A_DEX)) {
                const dam = dmgval(obj, youmonst_ptr());
                const { thitu } = await import('./mthrowu.js');
                const box = { obj };
                await thitu(10 + (obj.spe | 0), maybe_half_phys(dam), box, 'boomerang');
                await endmultishot(true);
                break;
            } else {
                tmp_at(DISP_END, 0);
                await pline('You skillfully catch the boomerang.');
                return youmonst_ptr();
            }
        }
        tmp_at(game.bhitpos.x, game.bhitpos.y);
        await nh_delay_output();
        if (IS_SINK(typ)) {
            if (!Deaf_boom()) await pline('Klonk!');
            await wake_nearto(game.bhitpos.x, game.bhitpos.y, 20);
            break;
        }
        if (ct % 5 !== 0) {
            i = counterclockwise ? DIR_LEFT(i) : DIR_RIGHT(i);
        }
    }
    tmp_at(DISP_END, 0);
    return null;
}

/**
 * C ref: zap.c bhit + dothrow.c throwit — fly along dx/dy; stop before
 * !ZAP_POS / closed door (bhit backs up one step), then place / breaktest.
 * Monster hit → throwit_mon_hit (D-1315) → thitmonst (D-0415 food;
 * D-0693 pie/egg DEX; D-1041 weapon/weptool/gem hit-vs-miss). After place, !IS_SOFT
 * container_impact_dmg(obj, u.ux, u.uy) then impact_disturbs TRUE
 * (D-1249 / D-1229). hitfloor dropz(TRUE) is D-1263 (drop/horn);
 * invent hold_another_object hitfloor(FALSE) is D-1272;
 * pickup highdrop hitfloor(TRUE) is D-1273;
 * toss_up / throwit u.dz is D-1274.
 * returning_missile AutoReturn / throwit_return / ceiling + post-flight
 * return-to-hand is D-1282. swallowit / u.uswallow before u.dz is D-1283.
 * cursed/greased horizontal slip/misfire is D-1292.
 * low-HP encumbered stamina drop is D-1293.
 * throwit steed potionhit rn2(6) is D-1297.
 * boomhit curve (D-1301). throw_gold swallow (D-1302).
 * sho_obj_return_to_u (D-1303). tethered DISP_TETHER/BACKTRACK (D-1311).
 * thitmonst leader catch / finish_quest (D-1312).
 * throwit_mon_hit snuff / hot_pursuit (D-1313); throwit caller (D-1315).
 * throwit ACURRSTR urange / post-bhit lev hurtle (D-1316).
 * tethered THROWN_TETHERED_WEAPON bhit + isqrt(arw->range) (D-1323).
 * thitmonst swallow vanish pline (D-1324).
 * throwit returning-missile losehp killer_xname (D-1346; C `:1747`).
 * Named omit: objsplit unsplit; throw_obj `:139–148` petrify killer_xname;
 * canletgo / Mjollnir / too-heavy / welded / wet-towel before-or-after
 * the D-1374 wipe; THROWN_WEAPON still uses the JS fly stand-in
 * (not zap.js bhit).
 */

/**
 * C weapon.c skill_name / P_NAME — ammo category for throwit's hand-throw
 * pline (`an(skill_name(weapon_type(obj)))`).
 */
function throwit_skill_name(skill) {
    const map = {
        [P_CROSSBOW]: 'CROSSBOW',
        [P_DART]: 'DART',
        [P_BOOMERANG]: 'BOOMERANG',
        [P_BOW]: 'BOW',
        [P_SLING]: 'SLING',
        [P_SHURIKEN]: 'SHURIKEN',
    };
    const on = map[skill | 0];
    if (on) {
        const otyp = objectNames.indexOf(on);
        if (otyp >= 0 && objectNameStrs[otyp]) return objectNameStrs[otyp];
        return on.toLowerCase().replace(/_/g, ' ');
    }
    return 'weapon';
}

/**
 * C weapon.c weapon_descr — P_BOW/P_CROSSBOW ammo → arrow/bolt; else
 * P_NAME. throwit hand-throw only (gems skip that pline).
 */
function throwit_weapon_descr(obj) {
    const skill = weapon_type(obj);
    if (skill === P_BOW && is_ammo(obj)) return 'arrow';
    if (skill === P_CROSSBOW && is_ammo(obj)) return 'bolt';
    return throwit_skill_name(skill);
}

/**
 * C dothrow.c throwit :1613–1672 — urange from ACURRSTR (crossbow 18),
 * then range from weight / uball / ammo / air-lev / boulder / Mjollnir
 * / tethered isqrt / underwater. Recoil leftover is `urange` after the
 * air-lev shuffle (`:1681–1682` hurtle). Tethered aklys
 * `min(range, isqrt(arw->range))` is D-1323.
 * @returns {{ range: number, urange: number, hand_throw: boolean }}
 */
export function throwit_calc_range(obj, tethered_weapon = false) {
    const u = game.u || {};
    const uwep = u.uwep || null;
    const owt = obj.owt | 0;
    const crossbowing = ammo_and_launcher(obj, uwep)
        && weapon_type(uwep) === P_CROSSBOW;
    let urange = Math.trunc((crossbowing ? 18 : (acurrstr() | 0)) / 2);
    let range = ((obj.otyp | 0) === HEAVY_IRON_BALL)
        ? urange - Math.trunc(owt / 100)
        : urange - Math.trunc(owt / 40);
    if (obj === u.uball) {
        if (u.ustuck) range = 1;
        else if (range >= 5) range = 5;
    }
    if (range < 1) range = 1;

    let hand_throw = false;
    if (is_ammo(obj)) {
        if (ammo_and_launcher(obj, uwep)) {
            if (crossbowing) range = BOLT_LIM;
            else range++;
        } else if ((obj.oclass | 0) !== GEM_CLASS) {
            range = Math.trunc(range / 2);
            hand_throw = true;
        }
    }

    if (Is_airlevel(u.uz) || Levitation_boom()) {
        urange -= range;
        if (urange < 1) urange = 1;
        range -= urange;
        if (range < 1) range = 1;
    }

    if ((obj.otyp | 0) === BOULDER) {
        range = 20;
    } else if (is_art(obj, ART_MJOLLNIR)) {
        range = Math.trunc((range + 1) / 2);
    } else if (tethered_weapon) {
        // C :1664–1667 — cord length isqrt(arw->range); AKLYS_LIM² → 4
        const arw = autoreturn_weapon(obj);
        range = Math.min(range | 0, isqrt(arw ? (arw.range | 0) : 0));
    } else if (obj === u.uball && u.utrap && (u.utraptype | 0) === TT_INFLOOR) {
        range = 1;
    }

    if (u.uinwater) range = 1;
    return { range, urange, hand_throw };
}

export async function throwit(obj, wep_mask = 0, twoweap = false, oldslot = null) {
    const u = game.u;
    let impaired = throw_impaired();
    // C throwit :1523 — wielded AKLYS cord
    const tethered_weapon = throwit_tethered_weapon(obj, wep_mask);
    // C throwit :1525 — reset stale gn.notonhead before slip / stamina / thrownobj
    game.notonhead = false;
    // C throwit :1526–1547 — cursed/greased && (dx||dy) && !rn2(7)
    if ((obj.cursed || obj.greased) && (u.dx || u.dy) && !rn2(7)) {
        let slipok = true;
        if (ammo_and_launcher(obj, u.uwep)) {
            await pline(`${Tobjnam(obj, 'misfire')}!`);
        } else if (obj.greased || throwing_weapon(obj)) {
            await pline(`${Tobjnam(obj, 'slip')} as you throw it!`);
        } else {
            slipok = false;
        }
        if (slipok) {
            u.dx = rn2(3) - 1;
            u.dy = rn2(3) - 1;
            if (!u.dx && !u.dy) u.dz = 1;
            impaired = true;
        }
    }
    // C throwit :1549–1560 — after slip, before thrownobj
    if ((u.dx || u.dy || (u.dz < 1))
        && calc_capacity(obj.owt | 0) > SLT_ENCUMBER
        && (Upolyd(u) ? ((u.mh | 0) < 5 && (u.mh | 0) !== (u.mhmax | 0))
                      : ((u.uhp | 0) < 10 && (u.uhp | 0) !== (u.uhpmax | 0)))
        && (obj.owt | 0) > ((Upolyd(u) ? (u.mh | 0) : (u.uhp | 0)) * 2)
        && !Is_airlevel(u.uz)) {
        await pline(
            `You have so little stamina, ${the(xname(obj))} drops from your grasp.`,
        );
        exercise(A_CON, false);
        u.dx = 0;
        u.dy = 0;
        u.dz = 1;
    }
    game.thrownobj = obj;
    obj.how_lost = LOST_THROWN;
    if (!game.iflags) game.iflags = {};
    game.iflags.returning_missile = AutoReturn(obj, wep_mask) ? obj : null;
    // NOTE: no early return without throwit_return after this point.

    let x = u.ux | 0;
    let y = u.uy | 0;
    let hitmon = null;

    // C throwit :1569 — swallowed before u.dz / boomhit / bhit
    if (u.uswallow) {
        if (obj === u.uball) {
            const chain = u.uchain;
            const ux = u.ux | 0;
            const uy = u.uy | 0;
            if (u.uball) {
                u.uball.ox = chain ? (chain.ox | 0) : ux;
                u.uball.oy = chain ? (chain.oy | 0) : uy;
            }
            if (chain) {
                chain.ox = ux;
                chain.oy = uy;
            }
        }
        hitmon = u.ustuck || null;
        if (hitmon) {
            x = hitmon.mx | 0;
            y = hitmon.my | 0;
            // C throwit :1575–1576 — bhitpos = engulfer before throwit_mon_hit
            if (!game.bhitpos) game.bhitpos = { x: 0, y: 0 };
            game.bhitpos.x = x;
            game.bhitpos.y = y;
        }
        // C throwit :1577–1578 — swallowed tether starts with no flight steps
        if (tethered_weapon) tmp_at(DISP_TETHER, obj_glyph(obj));
    } else if (u.dz) {
        if ((u.dz | 0) < 0
            && game.iflags.returning_missile
            && !impaired) {
            await pline(
                `${Tobjnam(obj, 'hit')} the ${ceiling_at(u.ux | 0, u.uy | 0)} and returns to your hand!`,
            );
            await return_throw_to_inv(obj, wep_mask, twoweap, oldslot);
        } else if ((u.dz | 0) < 0) {
            await toss_up(obj, !!(rn2(5) && !(u.uinwater)));
        } else if ((u.dz | 0) > 0 && u.usteed
            && (obj.oclass | 0) === POTION_CLASS && rn2(6)) {
            // C throwit :1590–1594 — holy water vs cursed saddle
            await potionhit(u.usteed, obj, POTHIT_HERO_THROW);
        } else {
            await hitfloor(obj, true);
        }
        throwit_return(true);
        return;
    }

    if (!u.uswallow) {
    if ((obj.otyp | 0) === BOOMERANG && !u.uinwater) {
        // C throwit :1601–1611 — boomhit instead of bhit; then clear AutoReturn
        if (Is_airlevel(u.uz) || Levitation_boom()) {
            await hurtle(-(u.dx || 0), -(u.dy || 0), 1, true);
        }
        hitmon = await boomhit(obj, u.dx || 0, u.dy || 0);
        x = game.bhitpos?.x | 0;
        y = game.bhitpos?.y | 0;
        game.iflags.returning_missile = null;
        if (is_youmonst_ptr(hitmon)) {
            exercise(A_DEX, true);
            await return_throw_to_inv(obj, wep_mask, twoweap, oldslot);
            throwit_return(true);
            return;
        }
    } else {
    const dx = u.dx || 0;
    const dy = u.dy || 0;
    // C throwit :1613–1672 — ACURRSTR urange then range (D-1316 / D-1323)
    const calc = throwit_calc_range(obj, tethered_weapon);
    let range = calc.range | 0;
    const urange = calc.urange | 0;
    if (calc.hand_throw) {
        // C :1643–1646 — an(skill_name) + weapon_descr + body_part(HAND)
        await pline(
            `You aren't wielding ${an(throwit_skill_name(weapon_type(obj)))}, so you throw your ${throwit_weapon_descr(obj)} by ${body_part(HAND)}.`,
        );
    }
    if (tethered_weapon) {
        // C :1674–1677 — bhit(THROWN_TETHERED_WEAPON) opens DISP_TETHER
        const pobj = { obj };
        const { bhit } = await import('./zap.js');
        hitmon = await bhit(
            dx, dy, range, THROWN_TETHERED_WEAPON, null, null, pobj,
        );
        obj = pobj.obj;
        game.thrownobj = obj;
        x = game.bhitpos?.x | 0;
        y = game.bhitpos?.y | 0;
    } else {
    let point_blank = true;
    while (range-- > 0) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 1 || nx >= COLNO || ny < 0 || ny >= ROWNO) break;
        const loc = game.level?.at?.(nx, ny);
        if (!loc) break;
        const typ = loc.typ ?? 0;
        const closed = IS_DOOR(typ) && ((loc.doormask || 0) & (D_CLOSED | D_LOCKED));
        // C bhit: IRONBARS via hits_bars before ZAP_POS stop (D-0990)
        if (typ === IRONBARS) {
            const { hits_bars } = await import('./mthrowu.js');
            const pobj = { obj };
            if (await hits_bars(
                pobj, x, y, nx, ny,
                point_blank ? 0 : !rn2(5), 1,
            )) {
                if (!pobj.obj) {
                    throwit_return(false);
                    return; // destroyed at bars
                }
                obj = pobj.obj;
                break; // land at previous cell (x,y)
            }
            // passes through — fall through to advance
        }
        // C bhit: if (!ZAP_POS(typ) || closed_door) { bhitpos -= dir; break; }
        if (!ZAP_POS(typ) || closed) break;
        x = nx;
        y = ny;
        point_blank = false;
        // C bhit THROWN_WEAPON: stop on monster before tmp_at of that cell
        const mon = m_at(x, y);
        if (mon) {
            hitmon = mon;
            break;
        }
    }
    }
    // C throwit :1680–1682 — after bhit so ux,uy are correct
    if (Is_airlevel(u.uz) || Levitation_boom()) {
        await hurtle(-(u.dx || 0), -(u.dy || 0), urange, true);
    }
    // C :1684–1691 — bhit may have destroyed obj; tether still open
    if (tethered_weapon && !obj) {
        await throwit_tether_end(true, false);
        throwit_return(false);
        return;
    }
    } // else bhit
    } // !uswallow: boomhit else bhit
    // C throwit :1695 — swallow / bhit / boomhit all call throwit_mon_hit
    // (mon may be NULL). JS fly uses locals; C bhit already left gb.bhitpos.
    if (!game.bhitpos) game.bhitpos = { x: 0, y: 0 };
    game.bhitpos.x = x | 0;
    game.bhitpos.y = y | 0;
    if (await throwit_mon_hit(obj, hitmon)) {
        throwit_return(true); /* alert shk caught it */
        return;
    }
    if (hitmon) {
        // miss / not consumed — fall through to place at mon cell
        x = hitmon.mx | 0;
        y = hitmon.my | 0;
    }
    if (!game.thrownobj) {
        // C :1700–1703 — missile already handled; tether DISP_END 0
        await throwit_tether_end(tethered_weapon, false);
        throwit_return(false);
        return;
    }
    // C :1704 — swallowed and not AutoReturn → engulfer inventory
    if (u.uswallow && !game.iflags.returning_missile) {
        await swallowit(obj);
        return;
    }
    if (await throwit_returning_missile(
        obj, wep_mask, twoweap, oldslot, x, y, impaired, tethered_weapon,
    )) {
        return;
    }
    // C :1772 — fail-to-return while still swallowed does not land
    if (u.uswallow) {
        await swallowit(obj);
        return;
    }
    const loc = game.level?.at?.(x, y);
    if (loc && !IS_SOFT(loc.typ) && breaktest(obj)) {
        // Broken — darts usually survive via obj_resists
        throwit_return(true);
        return;
    }
    // C: Splash/Plop before flooreffects when landing in pool/lava
    {
        const { is_pool, is_lava } = await import('./hack.js');
        const { weight } = await import('./mkobj.js');
        const { WT_SPLASH_THRESHOLD } = await import('./const.js');
        if (!Deaf() && !game.u?.Underwater
            && (is_pool(x, y)
                || (is_lava(x, y) /* && !is_flammable deferred */))) {
            await pline(
                (weight(obj) > WT_SPLASH_THRESHOLD) ? 'Splash!' : 'Plop!',
            );
        }
    }
    // C: flooreffects then ship_object then place (D-0987)
    {
        const { flooreffects } = await import('./do.js');
        if (await flooreffects(obj, x, y, 'fall')) {
            throwit_return(true);
            return;
        }
    }
    // C dothrow.c throwit :1818 — land snuff after flooreffects (and
    // pick-snatch, named) before ship_object. Candles / candelabrum
    // only, not snuff_lit. throwit_mon_hit snuffs only when mon!=NULL
    // (D-1313); miss-land never hits that helper. mthrowu :942 is D-1334.
    {
        const { snuff_candle } = await import('./apply.js');
        await snuff_candle(obj);
    }
    // C: !mon && ship_object(obj, bhitpos, FALSE) before place
    {
        const { ship_object, container_impact_dmg } = await import('./dokick.js');
        if (await ship_object(obj, x, y, false)) {
            throwit_return(true);
            return;
        }
        game.thrownobj = null;
        place_object(obj, x, y);
        // C dothrow.c:1828–1831 — !IS_SOFT → container at throw origin
        // (u.ux,u.uy, not bhitpos) then impact_disturbs TRUE
        const land = game.level?.at?.(x, y);
        if (land && !IS_SOFT(land.typ)) {
            await container_impact_dmg(obj, u.ux | 0, u.uy | 0);
            impact_disturbs_zombies(obj, true);
        }
    }
    // C: charge / take possession for shop throw land (D-0994)
    {
        const ushops = game.u?.ushops || '';
        if ((ushops || obj.unpaid) && obj !== game.u?.uball) {
            const { check_shop_obj } = await import('./shk.js');
            await check_shop_obj(obj, x, y, false);
        }
    }
    // C: throwit → stackobj after place_object
    stackobj(obj);
    // C dothrow.c throwit: if (cansee(bhitpos)) newsym — land glyph
    if (cansee(x, y)) newsym(x, y);
    throwit_return(false);
}


/**
 * C ref: cmd.c show_direction_keys — hjkl/yubn grid for help_dir.
 * @param {boolean} nodiag grid-bug form (orthogonal only)
 */
function show_direction_keys_lines(nodiag) {
    if (nodiag) {
        return [
            '             k   ',
            '             |   ',
            '          h- . -l',
            '             |   ',
            '             j   ',
        ];
    }
    return [
        '          y  k  u',
        '           \\ | / ',
        '          h- . -l',
        '           / | \\ ',
        '          b  j  n',
    ];
}

/**
 * C ref: cmd.c help_dir — NHW_TEXT cmdassist for invalid getdir / '?'.
 * C tty: display_nhwindow TEXT is blocking; dmore → xwaitforspace(quitchars)
 * so only space/CR/LF/ESC dismiss — other keys bell and keep waiting.
 * Returns true if shown.
 * Prefix-key / ^letter Guidebook branches deferred.
 */
async function help_dir(msg) {
    const disp = game.nhDisplay;
    if (!disp) return false;

    const lines = [];
    if (msg) {
        lines.push(`cmdassist: ${msg}`);
        lines.push('');
    }
    lines.push('Valid direction keys are:');
    lines.push(...show_direction_keys_lines(false));
    lines.push('');
    lines.push('          <  up');
    lines.push('          >  down');
    lines.push('          .  direct at yourself');
    if (msg) {
        lines.push('');
        lines.push('(Suppress this message with !cmdassist in config file.)');
    }
    while (lines.length < 24) lines.push('');
    lines[23] = '--More--';

    // C: process_text_window fullscreen (offx==0) — clear map/status
    disp.clearScreen();
    game._menu_overlay = true;
    game._pending_message = '';
    for (let r = 0; r < 24; r++) {
        const text = lines[r] || '';
        for (let i = 0; i < text.length && i < disp.cols; i++)
            disp.setCell(i, r, text[i], NO_COLOR, 0);
    }
    disp.setCursor(8, 23);
    await flush_screen(1);
    // C: xwaitforspace(quitchars) — space/CR/LF/ESC only; else bell+retry
    for (;;) {
        const k = await nhgetch();
        if (k === 27 || k === 32 || k === 13 || k === 10) break;
        // tty_nhbell — no-op in this port
    }
    game._menu_overlay = false;
    await docrt();
    return true;
}

/**
 * C ref: cmd.c getdir via yn_function + help_dir.
 * Esc / '.' / space / return cancel. '?' shows help and retries.
 * Other invalid keys: cmdassist NHW_TEXT then return cancel (no retry).
 * Returns {dx,dy,dz} or null. '<' / '>' set dz (C movecmd).
 */
export async function getdir_cmdassist(prompt) {
    // C ref: cmd.c yn_function — flush pending topline --More-- before prompt
    await flush_topl_more();
    // C: tty_yn_function — Sprintf(prompt, "%s ", query)
    const base = prompt || 'In what direction?';
    const msg = base.endsWith(' ') ? base : `${base} `;
    for (;;) {
        game._pending_message = msg;
        await flush_screen(1);
        const disp = game.nhDisplay;
        if (disp?.setCursor) disp.setCursor(msg.length, 0);
        const key = await nhgetch();
        const ch = String.fromCharCode(key);
        game._pending_message = '';
        // C: NHKF_GETDIR_SELF / SELF2 → dx=dy=dz=0, success (not cancel)
        if (ch === '.' || ch === 's') return { dx: 0, dy: 0, dz: 0 };
        // C: strchr(quitchars, dirsym) → return 0 without help_dir
        if (key === 27 || ch === ' ' || ch === '\n' || ch === '\r')
            return null;
        // C: movecmd(dirsym, MV_ANY) — walk/run/rush all ok
        const dir = dir_from_key(key, ch);
        if (dir) return dir;
        // C: NHKF_GETDIR_HELP '?' → help_dir then retry
        if (ch === '?') {
            await help_dir(null);
            continue;
        }
        // C: iflags.cmdassist → help_dir("Invalid direction key!") then return 0
        if (game.flags?.cmdassist !== false) {
            await help_dir('Invalid direction key!');
        } else {
            await pline('What a strange direction!');
        }
        return null;
    }
}

/**
 * C ref: dothrow.c dofire — quivered ammo; fireassist swap; getdir.
 * Autoquiver / doquiver_core / polearm / find_launcher canned wield deferred.
 * @returns {number} 0 no turn (OK/cancel), 1 took time
 */
export async function dofire() {
    // C ref: dothrow.c dofire — ok_to_throw before quiver / fireassist
    if (!(await ok_to_throw())) return 0;

    let obj = game.u?.uquiver || null;

    // C: iflags.fireassist default On — swap launcher from uswapwep then retry
    if (obj && is_ammo(obj) && game.flags?.fireassist !== false) {
        const uwep = game.u?.uwep || null;
        const uswap = game.u?.uswapwep || null;
        if (ammo_and_launcher(obj, uwep)) {
            // ready to fire
        } else if (ammo_and_launcher(obj, uswap)) {
            cmdq_add_ec(doswapweapon);
            cmdq_add_ec(dofire);
            return 0; // ECMD_OK — canned swap+fire; no time yet
        }
        // find_launcher / polearm fireassist deferred
    }

    if (!obj) {
        // C: !autoquiver → You("have no ammunition readied.") then
        // doquiver_core("fire"); autoquiver/polearm/bullwhip/swap deferred.
        if (!game.flags?.autoquiver) {
            await pline('You have no ammunition readied.');
            // C getobj uses yn_function which more()s on NEED_MORE. Session
            // keystream has invent letter immediately after `f` (no dismiss).
            // mark_topline_seen ≡ tty_nhgetch NEED_MORE→NON_EMPTY so getobj
            // can read the letter (D-0484).
            mark_topline_seen();
        }
        const res = await doquiver_core('fire');
        // C: ECMD_OK / ECMD_TIME continue; other → return. JS uses 0/1.
        if (res !== 0 && res !== 1) return res;
        obj = game.u?.uquiver || null;
        if (!obj) return res | 0;
        // C: ready pline may leave NEED_MORE; tty_nhgetch/getdir yn_function
        // does not More-eat the next direction/cancel keys when the prompt
        // replaces the message. Without this, flush_topl_more eats `=/\r`
        // and capital `H` is misread as getdir (D-0485 / D-0484 pattern).
        mark_topline_seen();
    }
    // C: post-quiver fireassist launcher swap deferred for non-ammo
    const dir = await getdir_cmdassist('In what direction?');
    if (!dir) return 0;
    game.u.dx = dir.dx | 0;
    game.u.dy = dir.dy | 0;
    game.u.dz = dir.dz | 0;
    return await throw_obj(obj, 0);
}

export async function dothrow() {
    // C ref: dothrow.c dothrow — ok_to_throw before getobj
    if (!(await ok_to_throw())) return 0;

    const obj = await getobj_throw();
    if (!obj) return 0;

    // C: getdir — cmdassist on invalid keys (same as dofire)
    const dir = await getdir_cmdassist('In what direction?');
    if (!dir) return 0;
    game.u.dx = dir.dx | 0;
    game.u.dy = dir.dy | 0;
    game.u.dz = dir.dz | 0;

    return await throw_obj(obj, 0);
}

/**
 * C ref: dothrow.c walk_path — Bresenham walk from src to dest; call
 * check_proc for each cell except the start. On FALSE, dest becomes the
 * previous cell and return false.
 * @param {{x:number,y:number}} src
 * @param {{x:number,y:number}} dest  mutated on early exit
 * @param {(arg:*, x:number, y:number) => boolean} check_proc
 * @param {*} arg
 */
export function walk_path(src, dest, check_proc, arg) {
    let dx = (dest.x | 0) - (src.x | 0);
    let dy = (dest.y | 0) - (src.y | 0);
    let prev_x = src.x | 0;
    let prev_y = src.y | 0;
    let x = prev_x;
    let y = prev_y;
    let x_change = 1;
    let y_change = 1;
    if (dx < 0) {
        x_change = -1;
        dx = -dx;
    }
    if (dy < 0) {
        y_change = -1;
        dy = -dy;
    }
    let err = 0;
    let i = 0;
    let keep_going = true;
    if (dx < dy) {
        while (i++ < dy) {
            prev_x = x;
            prev_y = y;
            y += y_change;
            err += dx << 1;
            if (err > dy) {
                x += x_change;
                err -= dy << 1;
            }
            keep_going = !!check_proc(arg, x, y);
            if (!keep_going) break;
        }
    } else {
        while (i++ < dx) {
            prev_x = x;
            prev_y = y;
            x += x_change;
            err += dy << 1;
            if (err > dx) {
                y += y_change;
                err -= dx << 1;
            }
            keep_going = !!check_proc(arg, x, y);
            if (!keep_going) break;
        }
    }
    if (keep_going) return true;
    dest.x = prev_x;
    dest.y = prev_y;
    return false;
}

function sgn_hurtle(n) {
    return n < 0 ? -1 : n > 0 ? 1 : 0;
}

function closed_door_hurtle(x, y) {
    const loc = game.level?.at?.(x, y);
    if (!loc || !IS_DOOR(loc.typ)) return false;
    return !!((loc.doormask || 0) & (D_CLOSED | D_LOCKED));
}

function sobj_at_hurtle(otyp, x, y) {
    for (let o = objects_at(x, y); o; o = o.nexthere) {
        if ((o.otyp | 0) === otyp) return o;
    }
    return null;
}

/**
 * C ref: dothrow.c hurtle_step — one cell of hero hurtle.
 * in_out_region after isok, before *range==0 (D-1165; C 787–790).
 * dest-typ ≠ origin after flush_screen → switch_terrain (D-1277;
 * C :916–917). Named omit: Passes_walls/may_passwall; bad_rock
 * squeeze; Sokoban diagonal halt; drag_ball; check_special_room;
 * drown/waterwall; jumping I_SPECIAL; petrify bump; setmangry; trap
 * pass-over dotrap; nh_delay_output.
 */
export async function hurtle_step(rangeArg, x, y) {
    const u = game.u || {};
    if (!isok(x, y)) {
        await pline('You feel the spirits holding you back.');
        return false;
    } else if (!(await in_out_region(x, y))) {
        return false;
    } else if ((rangeArg.n | 0) === 0) {
        return false; /* previous step wants to stop now */
    }

    const loc = game.level?.at?.(x, y);
    const ltyp = loc?.typ | 0;
    const diagonal = ((u.ux | 0) - x) !== 0 && ((u.uy | 0) - y) !== 0;
    const open_door = IS_DOOR(ltyp) && ((loc?.doormask || 0) & D_ISOPEN) !== 0;
    const odoor_diag = open_door && diagonal;

    let why = null;
    if (IS_OBSTRUCTED(ltyp) || closed_door_hurtle(x, y) || odoor_diag) {
        why = IS_TREE(ltyp) ? 'bumping into a tree'
            : IS_OBSTRUCTED(ltyp) ? 'bumping into a wall'
                : odoor_diag ? 'bumping into a door frame'
                    : 'bumping into a closed door';
        if (odoor_diag) await pline('You hit the door frame!');
        await pline('Ouch!');
    } else if (ltyp === IRONBARS) {
        why = 'crashing into iron bars';
        await pline('You crash into some iron bars.  Ouch!');
    } else {
        const obj = sobj_at_hurtle(BOULDER, x, y);
        if (obj) {
            why = 'bumping into a boulder';
            await pline(`You bump into a ${xname(obj)}.  Ouch!`);
        }
    }
    if (why) {
        const dmg = rnd(2 + (rangeArg.n | 0));
        losehp(maybe_half_phys(dmg), why, KILLED_BY);
        await wake_nearto(x, y, 10);
        return false;
    }

    const mon = m_at(x, y);
    if (mon) {
        mon.mundetected = 0;
        await pline(`You bump into ${mon_nam(mon)}.`);
        await wakeup(mon, false);
        await wake_nearto(x, y, 10);
        return false;
    }

    const ox = u.ux | 0;
    const oy = u.uy | 0;
    /* C dothrow.c:907–917 — u_on_newpos then newsym/vision/flush, then
     * switch_terrain iff dest typ differs from the origin cell. */
    const originTyp = game.level?.at?.(ox, oy)?.typ | 0;
    u.ux = x;
    u.uy = y;
    if (u.usteed) {
        u.usteed.mx = x;
        u.usteed.my = y;
    }
    newsym(ox, oy);
    vision_recalc(1);
    flush_screen(1);
    if (ltyp !== originTyp) await switch_terrain();

    rangeArg.n = (rangeArg.n | 0) - 1;
    if (rangeArg.n < 0) rangeArg.n = 0;
    return true;
}

/**
 * C ref: dothrow.c hurtle — knock hero through air for range steps.
 * endmultishot after verbose (C :1119). Named omit: Punished
 * diagonal-chain slack beyond !carried(uball); surface() vs "floor"
 * for TT_INFLOOR.
 */
export async function hurtle(dx, dy, range, verbose) {
    const u = game.u || {};
    if (u.Punished && u.uball && u.uball.where !== OBJ_INVENT) {
        await pline('You feel a tug from the iron ball.');
        nomul(0);
        return;
    }
    if (u.utrap) {
        const t = u.utraptype | 0;
        const what = t === TT_WEB ? 'web'
            : t === TT_LAVA ? hliquid('lava')
                : t === TT_INFLOOR ? 'floor'
                    : t === TT_BURIEDBALL ? 'buried ball'
                        : 'trap';
        await pline(`You are anchored by the ${what}.`);
        nomul(0);
        return;
    }

    dx = sgn_hurtle(dx);
    dy = sgn_hurtle(dy);
    if (!(range | 0) || (!dx && !dy) || u.ustuck) return;

    nomul(-range);
    game.multi_reason = 'moving through the air';
    game.nomovemsg = '';
    if (verbose) {
        await pline(
            `You ${range > 1 ? 'hurtle' : 'float'} in the opposite direction.`,
        );
    }
    await endmultishot(true);

    const rangeArg = { n: range | 0 };
    let curx = u.ux | 0;
    let cury = u.uy | 0;
    const steps = rangeArg.n;
    for (let i = 0; i < steps; i++) {
        const nx = curx + dx;
        const ny = cury + dy;
        const ok = await hurtle_step(rangeArg, nx, ny);
        if (!ok) break;
        curx = (game.u?.ux | 0);
        cury = (game.u?.uy | 0);
        if (curx !== nx || cury !== ny) break;
    }
}

/**
 * C ref: dothrow.c will_hurtle — size/stuck/trap + goodpos gate.
 */
function will_hurtle(mon, x, y) {
    if (!isok(x, y)) return false;
    if ((mon.data?.msize | 0) >= MZ_HUGE
        || mon === game.u?.ustuck || (mon.mtrapped | 0)) {
        return false;
    }
    return goodpos(x, y, mon, MM_IGNOREWATER | MM_IGNORELAVA);
}

/**
 * C ref: dothrow.c mhurtle_step — move along hurtle path (thin).
 * will_hurtle && m_in_out_region before place (D-1176; C :1000).
 * Named omit: steed u_on_newpos; set_apparxy; waterwall stop; bump
 * petrify / hero touch; place_monster vs rloc_to.
 */
async function mhurtle_step(mon, x, y) {
    if (!isok(x, y)) return false;
    if (will_hurtle(mon, x, y) && m_in_out_region(mon, x, y)) {
        if (mon !== game.u?.usteed) {
            await rloc_to(mon, x, y);
        } else {
            // steed hurtle → move hero; thin: rloc steed only named omit
            await rloc_to(mon, x, y);
        }
        flush_screen(1);
        await nh_delay_output();
        const res = await mintrap(mon, HURTLING);
        if (res === Trap_Killed_Mon || res === Trap_Caught_Mon
            || res === Trap_Moved_Mon) {
            return false;
        }
        return true;
    }
    const mtmp = m_at(x, y);
    if (mtmp && mtmp !== mon) {
        if (canseemon(mon) || canseemon(mtmp)) {
            await pline(`${Monnam(mon)} bumps into ${mon_nam(mtmp)}.`);
        }
        await wakeup(mtmp, !game.context?.mon_moving);
        // touch_petrifies arms deferred
    } else if (u_at(x, y)) {
        await pline(`${Monnam(mon)} bumps into you.`);
        // hero petrify / poly touch deferred
    }
    return false;
}

/**
 * C ref: dothrow.c mhurtle — knock monster through air for range steps.
 * mhurtle_step region gate is D-1176. Named omit: NODIAG grid-bug;
 * minliquid after path; full mhurtle_step petrify/steed vision.
 */
export async function mhurtle(mon, dx, dy, range) {
    if (!mon) return;
    await wakeup(mon, !game.context?.mon_moving);
    mon.movement = 0;
    mon.mstun = 1;

    if ((mon.data?.msize | 0) >= MZ_HUGE
        || mon === game.u?.ustuck || (mon.mtrapped | 0)) {
        if (canseemon(mon)) {
            await pline(`${Monnam(mon)} doesn't budge!`);
        }
        return;
    }

    dx = sgn_hurtle(dx);
    dy = sgn_hurtle(dy);
    if (!(range | 0) || (!dx && !dy)) return;

    if (mon.mundetected) {
        mon.mundetected = 0;
        newsym(mon.mx | 0, mon.my | 0);
    }
    if (M_AP_TYPE(mon) !== M_AP_NOTHING) seemimic(mon);

    const mc = { x: mon.mx | 0, y: mon.my | 0 };
    const cc = {
        x: (mon.mx | 0) + dx * (range | 0),
        y: (mon.my | 0) + dy * (range | 0),
    };
    // walk_path expects sync check_proc — drive steps manually for async
    let curx = mc.x;
    let cury = mc.y;
    const destx = cc.x;
    const desty = cc.y;
    let steps = Math.max(Math.abs(destx - curx), Math.abs(desty - cury));
    for (let i = 0; i < steps; i++) {
        const nx = curx + dx;
        const ny = cury + dy;
        const ok = await mhurtle_step(mon, nx, ny);
        if (!ok || (mon.mhp | 0) < 1) break;
        curx = mon.mx | 0;
        cury = mon.my | 0;
        if (curx !== nx || cury !== ny) break;
    }
    if ((mon.mhp | 0) > 0) {
        if (t_at(mon.mx | 0, mon.my | 0)) {
            await mintrap(mon, FORCEBUNGLE);
        }
        // minliquid deferred
    }
}
