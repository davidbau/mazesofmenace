// dothrow.js — Throw command (minimal path for Tourist darts).
// C ref: dothrow.c dothrow / throw_obj / throwit (subset).

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import {
    flush_screen, flush_topl_more, pline, docrt, newsym, mark_topline_seen,
    canseemon, canspotmon, nh_delay_output,
} from './display.js';
import { cansee, vision_recalc } from './vision.js';
import { rn2, rnd } from './rng.js';
import {
    place_object, splitobj, stackobj, delobj, is_crackable, objects_at,
} from './mkobj.js';
import { losehp, maybe_half_phys, nomul } from './hack.js';
import {
    WEAPON_CLASS, TOOL_CLASS, COIN_CLASS, GEM_CLASS, FOOD_CLASS, ARMOR_CLASS,
    POTION_CLASS, objectNames, objectNameStrs,
} from './objects.js';
import {
    COLNO, ROWNO, IS_SOFT, LOST_THROWN, ZAP_POS, IS_DOOR, D_CLOSED, D_LOCKED,
    D_ISOPEN, IS_OBSTRUCTED, IS_TREE, KILLED_BY, OBJ_INVENT, OBJ_FREE,
    TT_WEB, TT_LAVA, TT_INFLOOR, TT_BURIEDBALL,
    P_NONE, P_SPEAR, P_SLING, P_DAGGER, P_SHURIKEN, P_DART, P_CROSSBOW, P_KNIFE,
    P_BOW, P_BOOMERANG, P_SHORT_SWORD, P_SABER, P_AXE,
    P_SKILLED, P_EXPERT, P_BASIC, P_UNSKILLED,
    ACCFOOD, HMON_THROWN, HMON_KICKED, HMON_APPLIED, engulfing_u, STRAT_WAITMASK,
    M_AP_TYPE, M_AP_MONSTER, M_AP_NOTHING,
    BRK_FROM_INV, BRK_KNOWN2BREAK, BRK_KNOWN2NOTBREAK, BRK_KNOWN_OUTCOME,
    ismnum, isok, u_at, MM_IGNOREWATER, MM_IGNORELAVA,
    HURTLING, FORCEBUNGLE, IRONBARS, Upolyd,
} from './const.js';
import { NO_COLOR } from './terminal.js';
import { obj_resists, dogfood } from './dogmove.js';
import {
    ammo_and_launcher, is_ammo, is_missile, doswapweapon, doquiver_core, welded,
} from './wield.js';
import { acurr, A_DEX, change_luck, exercise } from './attrib.js';
import { find_mac } from './mhitm.js';
import { hitval, weapon_hit_bonus, should_mulch_missile } from './weapon.js';
import { spec_abon } from './artifact.js';
import {
    PM_CAVE_DWELLER, PM_MONK, PM_RANGER, PM_ROGUE, PM_SAMURAI,
    PM_WIZARD, PM_HEALER, PM_TOURIST, PM_CLERIC,
    PM_ELF, PM_ORC, PM_GNOME,
    monsterNames,
} from './generated/monsters_data.js';
import { xname, singular, an, the, vtense, doname } from './objnam.js';
import { m_at, wakeup, seemimic, wake_nearto, distmin } from './mon.js';
import { mon_nam, Monnam, hliquid } from './do_name.js';
import {
    is_domestic, nohands, M1_NOTAKE, MZ_HUGE, MZ_MEDIUM,
    is_unicorn, is_orc, is_elf, your_race,
} from './monsters.js';
import { tamedog } from './dog.js';
import { hmon, passive_obj } from './uhitm.js';
import { potionbreathe } from './potion.js';
import { goodpos, rloc_to } from './teleport.js';
import {
    mintrap, t_at, Trap_Killed_Mon, Trap_Caught_Mon, Trap_Moved_Mon,
} from './trap.js';
import { in_out_region, m_in_out_region } from './region.js';

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
const BOOMERANG = objectNames.indexOf('BOOMERANG');
const ELVEN_BOW = objectNames.indexOf('ELVEN_BOW');
const YUMI = objectNames.indexOf('YUMI');
const GAUNTLETS_OF_POWER = objectNames.indexOf('GAUNTLETS_OF_POWER');
const GAUNTLETS_OF_FUMBLING = objectNames.indexOf('GAUNTLETS_OF_FUMBLING');
const LEATHER_GLOVES = objectNames.indexOf('LEATHER_GLOVES');
const GAUNTLETS_OF_DEXTERITY = objectNames.indexOf('GAUNTLETS_OF_DEXTERITY');
const FAKE_AMULET_OF_YENDOR = objectNames.indexOf('FAKE_AMULET_OF_YENDOR');
const MINERAL = 21; // objclass.h
const PIERCE = 1; // objclass.h weapon oc_dir
const PM_PYROLISK = monsterNames.indexOf('PM_PYROLISK');

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
 * @returns {{dx:number,dy:number}|null}
 */
function dir_from_key(key, ch) {
    if (ch in DIR_DX) return { dx: DIR_DX[ch], dy: DIR_DY[ch] };
    const low = typeof ch === 'string' ? ch.toLowerCase() : '';
    if (low in DIR_DX && ch === low.toUpperCase()) {
        return { dx: DIR_DX[low], dy: DIR_DY[low] };
    }
    // rush: C(dir) — keys 1..26 (ICRNL maps CR→LF = C('j'))
    if (typeof key === 'number' && key >= 1 && key <= 26) {
        const rushCh = String.fromCharCode(key + 96);
        if (rushCh in DIR_DX) return { dx: DIR_DX[rushCh], dy: DIR_DY[rushCh] };
    }
    return null;
}

/** C invent getobj ranks used by throw_ok. */
const THROW_SUGGEST = 1;
const THROW_DOWNPLAY = 2;

/**
 * C ref: dothrow.c throw_ok — SUGGEST coins + weapons (!uslinging);
 * DOWNPLAY lone uwep / known-welded. AutoReturn / gem-sling deferred.
 * @returns {0|1|2} 0 exclude, 1 suggest, 2 downplay
 */
function throw_ok(obj) {
    if (!obj) return 0;
    const u = game.u || {};
    if (obj.bknown && welded(obj)) return THROW_DOWNPLAY;
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
 * C ref: invent.c getobj("throw", throw_ok) — loop on missing letter;
 * re-prompt after more() when prior topline still needs acknowledgment.
 * `?`/`*` → display_pickinv_reply (DOWNPLAY food selectable via `*`).
 * CMDQ_KEY from itemactions / fireassist consumed before interactive prompt.
 */
async function getobj_throw() {
    // C getobj: cmdq_pop CMDQ_KEY before interactive prompt
    const q = game._cmdq_canned;
    if (q?.length) {
        const head = q[0];
        if (head && typeof head === 'object' && head.typ === 'key') {
            q.shift();
            const ch = String.fromCharCode(head.key);
            for (const o of game.invent || []) {
                if (o.invlet === ch && throw_ok(o)) return o;
            }
            game._cmdq_canned = [];
            return null;
        }
    }

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
        const ch = String.fromCharCode(key);
        if (key === 27 || ch === ' ' || ch === '\n' || ch === '\r') {
            if (game.flags?.verbose !== false) await pline('Never mind.');
            return null;
        }
        if (ch === '?' || ch === '*') {
            const { display_pickinv_reply } = await import('./invent.js');
            const ilet = await display_pickinv_reply(ch === '*' ? '*' : lets);
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
            game._pending_message = '';
            return picked;
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
        game._pending_message = '';
        return otmp;
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
    if (ch === '.' || ch === 's') return { dx: 0, dy: 0 };
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
    // Also handle when otmp was split from a stack still in invent
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

/** C ref: objnam.c otense — plural verb if xname(obj) would be plural. */
function otense(obj, verb) {
    if ((obj?.quan | 0) !== 1) return verb; // quan≠1 → plural form (C is_plural)
    return vtense(null, verb);
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
 * unknown fake Amulet vs quest leader. Body (catch / finish_quest) deferred.
 */
export function special_obj_hits_leader(obj, mon) {
    const unique = !!(game.objects?.[obj.otyp]?.oc_unique);
    const fake = obj.otyp === FAKE_AMULET_OF_YENDOR && !obj.known;
    if (!(is_quest_artifact(obj) || unique || fake)) return false;
    const lid = game.quest_status?.leader_m_id | 0;
    return !!lid && (mon.m_id | 0) === lid;
}

/**
 * C ref: dothrow.c thitmonst — mon-hit after bhit / use_pole / kick.
 * Ported: tmp (Luck/DEX/distmin/bow-gloves/omon_adj/elf-orc);
 * WEAPON/weptool/GEM hit-vs-miss (kicked/ammo/thrown/applied) → hmon /
 * tmiss; APPLIED miss wakeup; pie/egg/venom DEX; food tamedog.
 * Deferred: gem_accept luck/mpickobj; leader catch/return; iron ball /
 * boulder hit; potionhit; swallow vanish body; cutworm; check_shop_obj
 * on mulch; mshot_xname.
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

    if (hmode !== HMON_APPLIED && special_obj_hits_leader(obj, mon)) {
        mon.msleeping = 0;
        if (mon.mstrategy != null) mon.mstrategy &= ~STRAT_WAITMASK;
        // catch / finish_quest / addinv deferred
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
                // cutworm(mon, bhitpos, chopper) deferred
                void chopper;
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
        // C swallow vanish arm deferred — still wake like C before body
        await wakeup(mon, true);
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
 * C ref: dothrow.c throw_obj — multishot + split + throwit.
 * getdir is done by caller (dofire/dothrow) matching JS input boundary;
 * C calls getdir inside throw_obj — same one prompt either way.
 */
async function throw_obj(obj, shotlimit) {
    // C: coin class → throw_gold (body deferred; `$` still in getobj suggest list)
    if (obj.oclass === COIN_CLASS) return 0;

    // C ref: dothrow.c throw_obj — after getdir, self (dx=dy=dz=0) refuses
    const u = game.u || {};
    if (!(u.dx || 0) && !(u.dy || 0) && !(u.dz || 0)) {
        await pline('You cannot throw an object at yourself.');
        return 0; // ECMD_OK — no time
    }

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
    if (multishot > 1 || shotlimit > 0) {
        // C ref: dothrow.c throw_obj — You("%s %d %s.", shoot|throw, n,
        //   (n==1) ? singular(obj, xname) : xname(obj));
        const name = (multishot === 1) ? singular(obj, xname) : xname(obj);
        await pline(`You ${shot ? 'shoot' : 'throw'} ${multishot} ${name}.`);
    }

    for (let i = 1; i <= multishot; i++) {
        let otmp;
        if ((obj.quan || 1) > 1) {
            otmp = splitobj(obj, 1);
            // C: freeinv(otmp) after split — child may sit on invent nobj chain
            if (otmp) freeinv(otmp);
        } else {
            otmp = obj;
            freeinv(otmp);
            obj = null;
        }
        if (!otmp) break;
        await throwit(otmp);
    }
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

/**
 * C ref: zap.c bhit + dothrow.c throwit — fly along dx/dy; stop before
 * !ZAP_POS / closed door (bhit backs up one step), then place / breaktest.
 * Monster hit → thitmonst (D-0415 food; D-0693 pie/egg DEX;
 * D-1041 weapon/weptool/gem hit-vs-miss).
 */
async function throwit(obj) {
    const u = game.u;
    const dx = u.dx || 0;
    const dy = u.dy || 0;
    // C: urange = ACURRSTR/2, then range capped; adjacent wall needs ≥1
    let range = 5;
    // C: ammo without matching launcher → half range + hand-throw pline
    if (is_ammo(obj) && !ammo_and_launcher(obj, u.uwep)
        && obj.oclass !== GEM_CLASS) {
        range = Math.max(1, Math.trunc(range / 2));
        // C: an(skill_name(weapon_type)) + weapon_descr (P_BOW ammo → "arrow")
        const skill = Math.abs(game.objects?.[obj.otyp]?.oc_skill ?? 0);
        let skillName = 'bow';
        let descr = 'arrow';
        if (skill === P_CROSSBOW) {
            skillName = 'crossbow';
            descr = 'bolt';
        } else if (skill === P_DART) {
            skillName = 'dart';
            descr = 'dart';
        } else if (skill === P_BOOMERANG) {
            skillName = 'boomerang';
            descr = 'boomerang';
        } else if (skill === P_BOW) {
            skillName = 'bow';
            descr = 'arrow';
        } else {
            const otyp = objectNames.indexOf('BOW');
            if (otyp >= 0 && objectNameStrs[otyp]) skillName = objectNameStrs[otyp];
            descr = skillName;
        }
        await pline(
            `You aren't wielding ${an(skillName)}, so you throw your ${descr} by hand.`,
        );
    }
    obj.how_lost = LOST_THROWN;
    let x = u.ux;
    let y = u.uy;
    let hitmon = null;
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
                if (!pobj.obj) return; // destroyed at bars
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
        // C bhit THROWN_WEAPON: stop on monster
        const mon = m_at(x, y);
        if (mon) {
            hitmon = mon;
            break;
        }
    }
    if (hitmon) {
        if (await thitmonst(hitmon, obj)) return;
        // miss / not consumed — fall through to place at mon cell
        x = hitmon.mx;
        y = hitmon.my;
    }
    const loc = game.level?.at?.(x, y);
    if (loc && !IS_SOFT(loc.typ) && breaktest(obj)) {
        // Broken — darts usually survive via obj_resists
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
        if (await flooreffects(obj, x, y, 'fall')) return;
    }
    // C: !mon && ship_object(obj, bhitpos, FALSE) before place
    {
        const { ship_object } = await import('./dokick.js');
        if (await ship_object(obj, x, y, false)) return;
    }
    place_object(obj, x, y);
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
 * Returns {dx,dy} or null.
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
        if (ch === '.' || ch === 's') return { dx: 0, dy: 0 };
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
    game.u.dx = dir.dx;
    game.u.dy = dir.dy;
    game.u.dz = 0;
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
    game.u.dx = dir.dx;
    game.u.dy = dir.dy;
    game.u.dz = 0;

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
 * Named omit: Passes_walls/may_passwall; bad_rock squeeze;
 * Sokoban diagonal halt; drag_ball; switch_terrain; check_special_room;
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
    u.ux = x;
    u.uy = y;
    if (u.usteed) {
        u.usteed.mx = x;
        u.usteed.my = y;
    }
    newsym(ox, oy);
    vision_recalc(1);
    flush_screen(1);

    rangeArg.n = (rangeArg.n | 0) - 1;
    if (rangeArg.n < 0) rangeArg.n = 0;
    return true;
}

/**
 * C ref: dothrow.c hurtle — knock hero through air for range steps.
 * Named omit: endmultishot; Punished diagonal-chain slack beyond
 * !carried(uball); surface() vs "floor" for TT_INFLOOR.
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
