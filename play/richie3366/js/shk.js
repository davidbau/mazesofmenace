// shk.js — Shopkeeper movement + shop enter/leave (partial).
// C ref: shk.c shk_move / after_shk_move / u_entered_shop / u_left_shop;
//        paybill / inherits / set_repo_loc / money2mon; priest.c move_special;
//        addtobill / append_honorific / get_cost / getprice / billable;
//        get_cost_of_shop_item / doname_with_price (D-0460);
//        is_unpaid / unpaid_cost + doname unpaid suffix (D-0461);
//        dopay / pay_billed_items / dopayobj / buy_container / menu_pick_pay_items;
//        sub_one_frombill / subfrombill / alter_cost;
//        mkobj.c bill_dummy_object / costly_alteration (D-0940);
//        add_damage shop repair list (D-0941);
//        fix_shop_damage catchup + repair_damage (D-1178);
//        pay_for_damage / getcad / hot_pursuit (D-0942);
//        shopdig dig-warn / pack-snatch (D-0958);
//        shopdig(1) um_dist snatch polarity + setnotworn (D-1016);
//        sellobj BSS sell_response / robbed precedence (D-1019);
//        check_unpaid / check_unpaid_usage / cost_per_charge (D-1047).
//        find_oid / o_on / gem_learned / bp_to_obj billobjs (D-1691).
//        remote_burglary / rob_shop / call_kops / makekops (D-1717).
//        get_cost glass-gem pseudo-ID (D-1718).
//        getprice arti_cost (D-1719).
//        obfree / delete_contents (D-1727);
//        zap.c poly_obj imports delete_contents (D-1770);
//        mkobj.c dealloc_obj via obfree (D-1743).
//        u_left_shop leave verbalize + choose_stairs (D-1733).
//        shopper_financial_report / shop_debt (D-1740).
// Named omissions: shk_fixes_damage in shk_move; allmain/bones
// fix_shop_damage callers; holetime dig follow; angry
// Displaced pline (shk path); following verbalize;
// m_break_boulder; m_move_aggress; inhistemple callers; mapseen_temple;
// m_canseeu for angry chase; ACH_SHOP mapseen; Hallu shkname;
// Soundeffect robbed mutter; remaining SetVoice pick_pick / kops / pay-bill;
// shk_move Fast + sobj_at pickaxe (u_entered_shop doorway is D-1080);
// mongone full;
// mnearto full (door yank uses enexto/rloc; home_shk still coord set);
// after_shk_move occupancy check_special_room (bill_p==-1000 producer);
// losedogs make_happy_shoppers; paygd; M1_NOHEAD has_head;
// get_obj_location buried (minvent via distant_name); sell-side quotes partial;
// dopay: debit/robbed/angry appease (D-0998);
// multi-shk getpos pay-whom (D-1704); mute/Deaf nod is D-1716;
// container bill_box_content (D-1705);
// traditional itemize ynq (D-1715); FullyUsedUp/PartlyUsedUp (D-1714);
// remaining SetVoice (pick_pick / kops / pay-bill); Izchak candle special_stock polish; safe_qbuf sell prompt;
// money2u invent-full dropy; break_seq simultaneous shop shatter;
// nextoid shop-price
// oid match; stolen_value callers beyond revive/kick/dig/lock/costly_alteration
// / rloc_to minvent (D-1163);
// copy_oextra / free_omid / Is_candle on bill_dummy;
// ghod_hitsu; clear_no_charge shop-rival filter / buriedobjlist;
// mbodypart/body_part lunge text; sleep(1) door-yank pause.

import { game } from './gstate.js';
import { rn2, rn1, rnd } from './rng.js';
import { dist2, highc, online2, upstart, depth } from './hacklib.js';
import { choose_stairs } from './wizard.js';
import { in_rooms, stop_occupation } from './hack.js';
import {
    ESHK, EPRI, IS_ROOM, IS_DOOR, IS_WALL, ZAP_POS, NOTONL, u_at, isok,
    ROOMOFFSET, SHOPBASE, ACH_SHOP, SVALL, ROWNO, COLNO,
    D_CLOSED, D_BROKEN, D_LOCKED, REPAIR_DELAY,
    LANDMINE, BEAR_TRAP, HOLE, PIT, SPIKED_PIT,
    OBJ_MINVENT, OBJ_FLOOR, OBJ_CONTAINED, OBJ_INVENT, OBJ_FREE, OBJ_DELETED,
    OBJ_ONBILL,
    NO_ROOM, TEMPLE, RLOC_MSG, RLOC_NOMSG,
    DISPLACED, LOW_PM, Has_contents, Is_container, has_omid, OMID, MAXULEV, ECMD_OK, ECMD_TIME, ECMD_CANCEL,
    EYE, M_AP_NOTHING, M_AP_MONSTER, M_AP_TYPE,
    COST_CONTENTS, COST_SINGLEOBJ, COST_UNBLSS, COST_UNCURS, TELEPAT,
    MENU_TRADITIONAL, MENU_FULL,
    W_SWAPWEP, W_QUIVER, TT_PIT, MIGR_APPROX_XY, MON_FLOOR,
    SELL_NORMAL, SELL_DELIBERATE, SELL_DONTSELL, CANDLESHOP,
    ARTICLE_THE, G_GONE, LL_ACHIEVE, MM_NOMSG,
} from './const.js';
import { hero_conflict, resist_conflict, m_canseeu } from './mondata.js';
import { mon_nam, x_monnam, y_monnam, Monnam } from './do_name.js';
import {
    COIN_CLASS, FOOD_CLASS, WAND_CLASS, POTION_CLASS, ARMOR_CLASS,
    WEAPON_CLASS, TOOL_CLASS, GEM_CLASS, SCROLL_CLASS, SPBOOK_CLASS,
    BALL_CLASS, CHAIN_CLASS, FIRST_REAL_GEM, LAST_REAL_GEM, objects,
    POT_WATER,
} from './objects.js';
import {
    newsym, pline, Norep, verbalize, You_feel, docrt, flush_screen,
    canspotmon, canseemon, sensemon, impossible, bot,
} from './display.js';
import { cansee, recalc_block_point } from './vision.js';
import { objectNames } from './generated/objects_data.js';
import { mattacku } from './mhitu.js';
import { PM_GRID_BUG, PM_TOURIST, PM_KNIGHT, PM_ROGUE } from './generated/monsters_data.js';
import { Hello } from './roles.js';
import { shtypes, shkname, Shknam, saleable } from './shknam.js';
import {
    splitobj, next_ident, obj_extract_self, objects_at, place_object,
    mksobj, weight, newomid, obj_stop_timers, dealloc_obj,
} from './mkobj.js';
import { add_to_minv, mpickobj, makemon } from './makemon.js';
import { acurr, acurrstr, A_CHA, A_WIS, adjalign, exercise, Fast } from './attrib.js';
import { simpleonames, makeplural, xprname } from './objnam.js';
import {
    xname, doname, paydoname, set_doname_shop_suffix,
    ansimpleoname, thesimpleoname, append_wizweight_suffix,
    the, The, safe_qbuf,
} from './objnam.js';
import {
    is_human, is_demon, is_watch, nolimbs, is_floater, is_flyer, amorphous,
    M1_SLITHY, passes_walls, mons, monsterNames,
} from './monsters.js';
import { nhgetch } from './input.js';
import {
    paint_corner_nhw_menu, count_contents, observe_object, makeknown,
    count_unpaid, currency, o_on, update_inventory,
} from './invent.js';
import { ATR_INVERSE } from './terminal.js';
import { yn_function } from './getline.js';
import { getpos } from './getpos.js';
import { m_at, angry_guards } from './mon.js';
import { Soundeffect, se_alarm, SetVoice } from './sndprocs.js';
import { livelog_printf } from './pline.js';
import { enexto, rloc_to_flag, migrate_to_level } from './teleport.js';
import { ledger_no } from './dungeon.js';
import { Is_candle } from './timeout.js';
import { addinv } from './u_init.js';
import { SchroedingersBox } from './pickup.js';
import { arti_cost } from './artifact.js';
import { o_unleash } from './apply.js';
import { setnotworn } from './do.js';
import { reset_pick } from './lock.js';
import { set_voice } from './sounds.js';

const PICK_AXE = objectNames.indexOf('PICK_AXE');
const DWARVISH_MATTOCK = objectNames.indexOf('DWARVISH_MATTOCK');
const CLOAK_OF_DISPLACEMENT = objectNames.indexOf('CLOAK_OF_DISPLACEMENT');
const CANDELABRUM_OF_INVOCATION = objectNames.indexOf('CANDELABRUM_OF_INVOCATION');
const MIRROR = objectNames.indexOf('MIRROR');
const GEMSTONE = 20; // materials.h
const LEASH = objectNames.indexOf('LEASH');
const MAGIC_LAMP = objectNames.indexOf('MAGIC_LAMP');
const MAGIC_MARKER = objectNames.indexOf('MAGIC_MARKER');
const BAG_OF_TRICKS = objectNames.indexOf('BAG_OF_TRICKS');
const HORN_OF_PLENTY = objectNames.indexOf('HORN_OF_PLENTY');
const CRYSTAL_BALL = objectNames.indexOf('CRYSTAL_BALL');
const OIL_LAMP = objectNames.indexOf('OIL_LAMP');
const BRASS_LANTERN = objectNames.indexOf('BRASS_LANTERN');
const MAGIC_FLUTE = objectNames.indexOf('MAGIC_FLUTE');
const DRUM_OF_EARTHQUAKE = objectNames.indexOf('DRUM_OF_EARTHQUAKE');
const CAN_OF_GREASE = objectNames.indexOf('CAN_OF_GREASE');
const TINNING_KIT = objectNames.indexOf('TINNING_KIT');
const EXPENSIVE_CAMERA = objectNames.indexOf('EXPENSIVE_CAMERA');
const POT_OIL = objectNames.indexOf('POT_OIL');
/** C objects.h STRANGE_OBJECT — otyp 0; gem_learned all-gems sentinel. */
const STRANGE_OBJECT = objectNames.indexOf('STRANGE_OBJECT');
/** C objects.h MARKER FIRST_GLASS_GEM = WORTHLESS_WHITE_GLASS (after JADE). */
const FIRST_GLASS_GEM = LAST_REAL_GEM + 1;
/** C objects.h GEM names used by get_cost glass pseudo-ID. */
const DIAMOND = objectNames.indexOf('DIAMOND');
const OPAL = objectNames.indexOf('OPAL');
const SAPPHIRE = objectNames.indexOf('SAPPHIRE');
const AQUAMARINE = objectNames.indexOf('AQUAMARINE');
const RUBY = objectNames.indexOf('RUBY');
const JASPER = objectNames.indexOf('JASPER');
const AMBER = objectNames.indexOf('AMBER');
const TOPAZ = objectNames.indexOf('TOPAZ');
const JACINTH = objectNames.indexOf('JACINTH');
const AGATE = objectNames.indexOf('AGATE');
const CITRINE = objectNames.indexOf('CITRINE');
const CHRYSOBERYL = objectNames.indexOf('CHRYSOBERYL');
const BLACK_OPAL = objectNames.indexOf('BLACK_OPAL');
const JET = objectNames.indexOf('JET');
const EMERALD = objectNames.indexOf('EMERALD');
const JADE = objectNames.indexOf('JADE');
const AMETHYST = objectNames.indexOf('AMETHYST');
const FLUORITE = objectNames.indexOf('FLUORITE');
const LAND_MINE = objectNames.indexOf('LAND_MINE');
const BEARTRAP = objectNames.indexOf('BEARTRAP');
const BOULDER = objectNames.indexOf('BOULDER');
const ROCK = objectNames.indexOf('ROCK');
/** C monsters.h Keystone Kops — makekops / call_kops G_GONE. */
const PM_KEYSTONE_KOP = monsterNames.indexOf('PM_KEYSTONE_KOP');
const PM_KOP_SERGEANT = monsterNames.indexOf('PM_KOP_SERGEANT');
const PM_KOP_LIEUTENANT = monsterNames.indexOf('PM_KOP_LIEUTENANT');
const PM_KOP_KAPTAIN = monsterNames.indexOf('PM_KOP_KAPTAIN');
/** C monflag.h MS_SILENT / MS_ANIMAL / MS_HUMANOID. */
const MS_SILENT = 0;
const MS_ANIMAL = 17;
const MS_HUMANOID = 25;
/** C monflag.h MS_SELL — shopkeeper when tables omit msound. */
const MS_SELL = 39;

/** C: ANGRY(mon) ≡ !mpeaceful */
function ANGRY(mon) {
    return !mon?.mpeaceful;
}

/** C: NOTANGRY(mon) ≡ mpeaceful */
function NOTANGRY(mon) {
    return !!mon?.mpeaceful;
}

/** C: helpless — msleeping || !mcanmove */
function helpless(mtmp) {
    return !!(mtmp?.msleeping || mtmp?.mcanmove === 0);
}

/** C hacklib.c plur — "s" when n !== 1. */
function plur(n) {
    return (n | 0) === 1 ? '' : 's';
}

/** C you.h noit_mhe/mhim/mhis — gender pronouns (no "it"). */
function noit_mhe(mtmp) {
    return mtmp?.female ? 'she' : 'he';
}
function noit_mhim(mtmp) {
    return mtmp?.female ? 'her' : 'him';
}
function noit_mhis(mtmp) {
    return mtmp?.female ? 'her' : 'his';
}

/**
 * C: muteshk — helpless or msound <= MS_ANIMAL.
 * Generated tables often omit msound; isshk → MS_SELL.
 */
function muteshk(shkp) {
    if (helpless(shkp)) return true;
    let ms = shkp?.data?.msound;
    if (ms == null) ms = shkp?.isshk ? MS_SELL : 0;
    return (ms | 0) <= MS_ANIMAL;
}

/** C ref: hacklib.c s_suffix */
function s_suffix(s) {
    const buf = String(s ?? '');
    const low = buf.toLowerCase();
    if (low === 'it') return `${buf}s`;
    if (low === 'you') return `${buf}r`;
    if (buf.endsWith('s') || buf.endsWith('S')) return `${buf}'`;
    return `${buf}'s`;
}

/** C ref: shk.c pacify_shk — peaceful + optional surcharge undo (bill deferred). */
function pacify_shk(shkp, clear_surcharge) {
    if (!shkp) return;
    shkp.mpeaceful = 1;
    const eshk = ESHK(shkp);
    if (clear_surcharge && eshk?.surcharge) {
        eshk.surcharge = false;
        // bill price undo deferred (no bill_p walk yet)
    }
}

import { record_achievement } from './insight.js';

/**
 * C ref: shk.c shop_keeper — rooms[rmno-ROOMOFFSET].resident with eshk.
 * Angry surcharge rile_shk deferred.
 */
export function shop_keeper(rmno) {
    const code = typeof rmno === 'string' ? rmno.charCodeAt(0) : (rmno | 0);
    if (code < ROOMOFFSET) return null;
    const shkp = game.level?.rooms?.[code - ROOMOFFSET]?.resident || null;
    if (!shkp) return null;
    if (!ESHK(shkp)) return null;
    // ANGRY → rile_shk deferred
    return shkp;
}

/**
 * C ref: shk.c set_residency `:271–277` — rooms[shoproom-ROOMOFFSET].resident
 * when the shopkeeper's shoplevel is the hero's uz. getlev always calls
 * this before place_monster (restore.c `:1182–1183`).
 */
export function set_residency(shkp, zero_out) {
    const eshk = ESHK(shkp);
    if (!eshk) return;
    if (!on_level(eshk.shoplevel, game.u?.uz)) return;
    const rooms = game.level?.rooms;
    const idx = (eshk.shoproom | 0) - ROOMOFFSET;
    if (!rooms || idx < 0 || idx >= rooms.length) return;
    rooms[idx].resident = zero_out ? null : shkp;
}

/**
 * C ref: shk.c u_left_shop `:578–625` — leave/boundary bill prompts.
 * Boundary unpaid: verbalize (or Deaf/mute pline) then return so the
 * pay-before-leaving warning is not skipped. Outright leave: rob_shop
 * then call_kops. remote_burglary is D-1717. Named: heaven
 * teleport.c caller. SetVoice is D-1752.
 */
export async function u_left_shop(leavestring, newlev) {
    const u = game.u;
    if (!u) return;
    const leave = leavestring || '';
    const loc = game.level?.at?.(u.ux, u.uy);
    const loc0 = game.level?.at?.(u.ux0, u.uy0);
    // C: if (!*leavestring && (!edge || edge0)) return;
    if (!leave && (!(loc?.edge) || loc0?.edge)) return;

    const rmCh = leave ? leave.charCodeAt(0) : (u.ushops0 || '').charCodeAt(0);
    const shkp = shop_keeper(rmCh);
    if (!shkp || !inhishop(shkp)) return;

    const eshkp = ESHK(shkp);
    if (!((eshkp?.billct | 0) || (eshkp?.debit | 0))) return;

    if (!leave && !muteshk(shkp)) {
        const not_upset = !eshkp.surcharge;
        const plname = game.plname || '';
        if (!hero_deaf() && !muteshk(shkp)) {
            SetVoice(shkp, 0, 80, 0);
            await verbalize(
                not_upset
                    ? `${plname}!  Please pay before leaving.`
                    : `${plname}!  Don't you leave without paying!`,
            );
        } else {
            await pline(
                `${Shknam(shkp)} ${not_upset ? 'points out' : 'makes it clear'} that you need to pay before leaving${not_upset ? '.' : '!'}`,
            );
        }
        return;
    }

    if (await rob_shop(shkp)) {
        await call_kops(shkp, !newlev && !!loc0?.edge);
    }
}

/**
 * C ref: shk.c makekops `:5112–5135` — spawn Kops at mm via enexto.
 * G_GONE skip per rank; cnt/3 sarge, /6 lieut, /9 kaptain.
 */
function makekops(mm) {
    if (!mm) return;
    const k_mndx = [
        PM_KEYSTONE_KOP, PM_KOP_SERGEANT, PM_KOP_LIEUTENANT, PM_KOP_KAPTAIN,
    ];
    let cnt = Math.abs(depth(game.u?.uz) | 0) + rnd(5);
    const k_cnt = [
        cnt,
        Math.trunc(cnt / 3) + 1,
        Math.trunc(cnt / 6),
        Math.trunc(cnt / 9),
    ];
    for (let k = 0; k < 4; k++) {
        cnt = k_cnt[k];
        if (cnt === 0) break;
        const mndx = k_mndx[k];
        if (((game.mvitals?.[mndx]?.mvflags ?? 0) & G_GONE) !== 0) continue;
        const ptr = mons(mndx);
        while (cnt--) {
            if (enexto(mm, mm.x, mm.y, ptr)) {
                makemon(ptr, mm.x, mm.y, MM_NOMSG);
            }
        }
    }
}

/**
 * C ref: shk.c call_kops `:509–564` — alarm, angry_guards, then makekops.
 * choose_stairs (D-1733) fills the down-stair swarm when !nearshop.
 */
async function call_kops(shkp, nearshop) {
    if (!shkp) return;

    Soundeffect(se_alarm, 80);
    if (!hero_deaf()) await pline('An alarm sounds!');

    const nokops = (
        ((game.mvitals?.[PM_KEYSTONE_KOP]?.mvflags ?? 0) & G_GONE) !== 0
        && ((game.mvitals?.[PM_KOP_SERGEANT]?.mvflags ?? 0) & G_GONE) !== 0
        && ((game.mvitals?.[PM_KOP_LIEUTENANT]?.mvflags ?? 0) & G_GONE) !== 0
        && ((game.mvitals?.[PM_KOP_KAPTAIN]?.mvflags ?? 0) & G_GONE) !== 0
    );

    // C: angry_guards(!!Deaf) always runs (wake watch) then && nokops.
    const ag = await angry_guards(!!hero_deaf());
    if (!ag && nokops) {
        if (game.flags?.verbose !== false && !hero_deaf()) {
            await pline('But no one seems to respond to it.');
        }
        return;
    }
    if (nokops) return;

    const stair = { sx: 0, sy: 0 };
    choose_stairs(stair, true);

    if (nearshop) {
        if (game.flags?.verbose !== false) {
            await pline('The Keystone Kops appear!');
        }
        makekops({ x: game.u?.ux | 0, y: game.u?.uy | 0 });
        return;
    }
    if (game.flags?.verbose !== false) {
        await pline('The Keystone Kops are after you!');
    }
    if (isok(stair.sx, stair.sy)) {
        makekops({ x: stair.sx, y: stair.sy });
    }
    makekops({ x: shkp.mx | 0, y: shkp.my | 0 });
}

/**
 * C ref: shk.c rob_shop `:685–719` — credit cover or steal, then hot_pursuit.
 * setpaid moves the bill into robbed; Rogue skips adjalign.
 */
async function rob_shop(shkp) {
    const eshkp = ESHK(shkp);
    if (!eshkp) return false;
    rouse_shk(shkp, true);
    let total = addupbill(shkp) + (eshkp.debit | 0);
    if ((eshkp.credit | 0) >= total) {
        await pline(
            `Your credit of ${eshkp.credit} ${currency(eshkp.credit)} is used to cover your shopping bill.`,
        );
        total = 0;
    } else {
        await pline('You escaped the shop without paying!');
        total -= eshkp.credit | 0;
    }
    setpaid(shkp);
    if (!total) return false;

    eshkp.robbed = (eshkp.robbed | 0) + total;
    await pline(
        `You stole ${total} ${currency(total)} worth of merchandise.`,
    );
    const shopnm = shtypes[(eshkp.shoptype | 0) - SHOPBASE]?.name || 'shop';
    livelog_printf(
        LL_ACHIEVE,
        'stole %ld %s worth of merchandise from %s %s',
        total,
        currency(total),
        s_suffix(shkname(shkp)),
        shopnm,
    );

    if (!Role_if(PM_ROGUE)) {
        adjalign(-sgn(game.u?.ualign?.type | 0));
    }

    hot_pursuit(shkp);
    return true;
}

/**
 * C ref: shk.c remote_burglary `:664–682` — unpaid pickup from outside
 * the shop (grappling hook / telekinesis). pick_obj is the caller.
 * call_kops nearshop is FALSE.
 */
export async function remote_burglary(x, y) {
    const rooms = in_rooms(x, y, SHOPBASE);
    const shkp = shop_keeper(rooms ? rooms.charCodeAt(0) : 0);
    if (!shkp || !inhishop(shkp)) return;

    const eshkp = ESHK(shkp);
    if (!((eshkp?.billct | 0) || (eshkp?.debit | 0))) return;

    if (await rob_shop(shkp)) {
        await call_kops(shkp, false);
    }
}

/** C shk.c empty_shops[5] — latch so deserted_shop does not re-pline. */
let empty_shops = '';

/** C youprop.h Invis — (HInvis||EInvis)&&!BInvis; sticky u.Invis if H/E unset. */
function hero_invis() {
    const u = game.u || {};
    if (u.Invis && !((u.HInvis | 0) || (u.EInvis | 0))) return true;
    return !!(((u.HInvis | 0) || (u.EInvis | 0)) && !(u.BInvis | 0));
}

/** C youprop.h Blind — (HBlinded||EBlinded)&&!BBlinded. */
function hero_blind() {
    const u = game.u || {};
    return !!(((u.HBlinded | 0) || (u.EBlinded | 0)) && !(u.BBlinded | 0));
}

/** C youprop.h Blind_telepat — HTelepat||ETelepat. */
function hero_blind_telepat() {
    const u = game.u || {};
    return !!((u.HTelepat | 0) || (u.ETelepat | 0) || u.Blind_telepat);
}

/** C youprop.h Detect_monsters — HDetect_monsters||EDetect_monsters. */
function hero_detect_monsters() {
    const u = game.u || {};
    return !!(u.Detect_monsters
        || (u.HDetect_monsters | 0) || (u.EDetect_monsters | 0));
}

/** C mkobj.c sobj_at — first floor object of otyp at (x,y). */
function sobj_at_shk(otyp, x, y) {
    for (let o = objects_at(x, y); o; o = o.nexthere) {
        if ((o.otyp | 0) === otyp) return o;
    }
    return null;
}

/**
 * C ref: shk.c deserted_shop — untended/deserted pline (caller verified).
 * Named omit: mimic-as-object still increments n not m (matches C M_AP).
 */
async function deserted_shop(enterstring) {
    const r = game.level?.rooms?.[(enterstring.charCodeAt(0) | 0) - ROOMOFFSET];
    let m = 0;
    let n = 0;
    if (r) {
        const { m_at } = await import('./mon.js');
        for (let x = r.lx | 0; x <= (r.hx | 0); ++x) {
            for (let y = r.ly | 0; y <= (r.hy | 0); ++y) {
                if (u_at(x, y)) continue;
                const mtmp = m_at(x, y);
                if (!mtmp) continue;
                ++n;
                const ap = M_AP_TYPE(mtmp);
                if (sensemon(mtmp)
                    || ((ap === M_AP_NOTHING || ap === M_AP_MONSTER)
                        && canseemon(mtmp))) {
                    ++m;
                }
            }
        }
    }
    if (hero_blind() && !(hero_blind_telepat() || hero_detect_monsters())) {
        ++n; /* force feedback to be less specific */
    }
    await pline(
        `This shop ${m < n ? 'seems to be' : 'is'} ${!n ? 'deserted' : 'untended'}.`,
    );
}

/**
 * C ref: shk.c u_entered_shop — welcome / deserted / blocking.
 * Covered: tended peaceful Welcome; deserted_shop + empty_shops latch;
 * Invis; angry / surcharge / robbed; pickaxe/mattock/steed/Fast doorway
 * + extra `dochug`. Named omit: Soundeffect robbed mutter;
 * Hallu shkname; C bill_p poison on !inhishop.
 */
export async function u_entered_shop(enterstring) {
    if (!enterstring) return;
    const u = game.u;
    if (!u) return;

    const enterCh = enterstring.charCodeAt(0);
    const shkp = shop_keeper(enterCh);
    if (!shkp) {
        if (!empty_shops.includes(enterstring.charAt(0))
            && in_rooms(u.ux, u.uy, SHOPBASE)
                !== in_rooms(u.ux0, u.uy0, SHOPBASE)) {
            await deserted_shop(enterstring);
        }
        empty_shops = u.ushops || '';
        u.ushops = '';
        return;
    }

    const eshkp = ESHK(shkp);
    if (!inhishop(shkp)) {
        if (!empty_shops.includes(enterstring.charAt(0))) {
            await deserted_shop(enterstring);
        }
        empty_shops = u.ushops || '';
        u.ushops = '';
        return;
    }

    record_achievement(ACH_SHOP);
    eshkp.bill_p = eshkp.bill || null;

    const plname = game.plname || '';
    const cust = eshkp.customer || '';
    if ((!eshkp.visitct || cust)
        && cust.toLowerCase() !== plname.toLowerCase().slice(0, 32)) {
        eshkp.visitct = 0;
        eshkp.following = 0;
        eshkp.customer = plname.slice(0, 32);
        pacify_shk(shkp, true);
    }

    if (muteshk(shkp) || eshkp.following) return; /* no dialog */

    if (hero_invis()) {
        await pline(`${Shknam(shkp)} senses your presence.`);
        if (!hero_deaf() && !muteshk(shkp)) {
            SetVoice(shkp, 0, 80, 0);
            await verbalize('Invisible customers are not welcome!');
        } else {
            await pline(
                `${Shknam(shkp)} stands firm as if ${noit_mhe(shkp)} knows you are there.`,
            );
        }
        return;
    }

    const rt = game.level?.rooms?.[enterCh - ROOMOFFSET]?.rtype | 0;
    const shopName = shtypes[rt - SHOPBASE]?.name || 'shop';
    const deaf = hero_deaf();

    if (ANGRY(shkp)) {
        if (!deaf && !muteshk(shkp)) {
            SetVoice(shkp, 0, 80, 0);
            await verbalize(
                `So, ${plname}, you dare return to ${s_suffix(shkname(shkp))} ${shopName}?!`,
            );
        } else {
            await pline(
                `${Shknam(shkp)} seems ${ANGRYTEXTS[rn2(ANGRYTEXTS.length)]} over your return to ${noit_mhis(shkp)} ${shopName}!`,
            );
        }
    } else if (eshkp.surcharge) {
        if (!deaf && !muteshk(shkp)) {
            const { mbodypart } = await import('./polyself.js');
            SetVoice(shkp, 0, 80, 0);
            await verbalize(
                `Back again, ${plname}?  I've got my ${mbodypart(shkp, EYE)} on you.`,
            );
        } else {
            await pline(
                `The atmosphere at ${s_suffix(shkname(shkp))} ${shopName} seems unwelcoming.`,
            );
        }
    } else if (eshkp.robbed) {
        if (!deaf) {
            // Soundeffect(se_mutter_imprecations) deferred
            await pline(
                `${Shknam(shkp)} mutters imprecations against shoplifters.`,
            );
        } else {
            await pline(
                `${Shknam(shkp)} is combing through ${noit_mhis(shkp)} inventory list.`,
            );
        }
    } else {
        if (!deaf && !muteshk(shkp)) {
            const again = eshkp.visitct++ ? ' again' : '';
            set_voice(shkp, 0, 80, 0);
            await verbalize(
                `${Hello(shkp)}, ${plname}!  Welcome${again} to ${s_suffix(shkname(shkp))} ${shopName}!`,
            );
        } else {
            const again = eshkp.visitct++ ? ' again' : '';
            await pline(
                `You enter ${s_suffix(shkname(shkp))} ${shopName}${again}!`,
            );
        }
    }

    /* can't do anything about blocking if teleported in */
    if (!inside_shop(u.ux, u.uy)) {
        const not_upset = !eshkp.surcharge;
        let should_block = false;
        const pick = carrying(PICK_AXE);
        const mattock = carrying(DWARVISH_MATTOCK);
        if (pick || mattock) {
            let cnt = 1;
            let tool;
            if (pick && mattock) {
                tool = 'digging tool';
                cnt = 2;
            } else if (pick) {
                tool = 'pick-axe';
                cnt = count_otyp_from(pick, PICK_AXE);
            } else {
                tool = 'mattock';
                cnt = count_otyp_from(mattock, DWARVISH_MATTOCK);
                if (!hero_blind()) makeknown(DWARVISH_MATTOCK);
            }
            if (!deaf && !muteshk(shkp)) {
                SetVoice(shkp, 0, 80, 0);
                await verbalize(
                    not_upset
                        ? `Will you please leave your ${tool}${plur(cnt)} outside?`
                        : `Leave the ${tool}${plur(cnt)} outside.`,
                );
            } else {
                await pline(
                    `${Shknam(shkp)} ${not_upset ? 'is hesitant' : 'refuses'} to let you in with your ${tool}${plur(cnt)}.`,
                );
            }
            should_block = true;
        } else if (u.usteed) {
            const steed = y_monnam(u.usteed);
            if (!deaf && !muteshk(shkp)) {
                SetVoice(shkp, 0, 80, 0);
                await verbalize(
                    not_upset
                        ? `Will you please leave ${steed} outside?`
                        : `Leave ${steed} outside.`,
                );
            } else {
                await pline(
                    `${Shknam(shkp)} ${not_upset ? "doesn't want" : 'refuses'} to let you in while you're riding ${steed}.`,
                );
            }
            should_block = true;
        } else {
            should_block = !!(Fast()
                && (sobj_at_shk(PICK_AXE, u.ux, u.uy)
                    || sobj_at_shk(DWARVISH_MATTOCK, u.ux, u.uy)));
        }
        if (should_block) {
            const { dochug } = await import('./monmove.js');
            await dochug(shkp); /* shk gets extra move */
        }
    }
}

/** C ref: shk.c inhishop — roomno match (full in_rooms / on_level deferred). */
export function inhishop(shkp) {
    const eshk = ESHK(shkp);
    if (!eshk || shkp.mx == null) return false;
    const loc = game.level?.at?.(shkp.mx, shkp.my);
    return !!loc && ((loc.roomno | 0) === (eshk.shoproom | 0));
}

/** C mextra.h BILLSZ */
const BILLSZ = 200;
/** C obj_material_types GLASS */
const GLASS = 19;
const DUNCE_CAP = objectNames.indexOf('DUNCE_CAP');
const HUNGRY = 2; // C you.h SATIATED=0 … HUNGRY=2

/** C: IS_SHOP(x) — rooms[x].rtype >= SHOPBASE. */
function IS_SHOP(roomIdx) {
    return ((game.level?.rooms?.[roomIdx]?.rtype | 0) >= SHOPBASE);
}

/**
 * C ref: shk.c inside_shop — roomno char, or NO_ROOM if not in shop proper.
 * Truthy when in a shop (callers use as boolean or shop_keeper arg).
 */
export function inside_shop(x, y) {
    const loc = game.level?.at?.(x, y);
    if (!loc) return NO_ROOM;
    let rno = loc.roomno | 0;
    if ((rno < ROOMOFFSET) || loc.edge || !IS_SHOP(rno - ROOMOFFSET)) {
        rno = NO_ROOM;
    }
    return rno;
}

/**
 * C ref: zap.c get_obj_location — subset for shop pricing (floor/invent/
 * contained). BURIED_TOO / minvent deferred unless locflags request.
 */
function get_obj_location(obj, locflags = 0) {
    if (!obj) return null;
    switch (obj.where) {
    case OBJ_INVENT:
        return { x: game.u?.ux | 0, y: game.u?.uy | 0 };
    case OBJ_FLOOR:
        return { x: obj.ox | 0, y: obj.oy | 0 };
    case OBJ_CONTAINED:
        if (locflags & 0x1) { // CONTAINED_TOO
            return get_obj_location(obj.ocontainer, locflags);
        }
        return null;
    default:
        return null;
    }
}

/**
 * C ref: shk.c costly_spot — shop goods square (not shk free spot).
 */
export function costly_spot(x, y) {
    if (!game.level?.flags?.has_shop) return false;
    const rooms = in_rooms(x, y, SHOPBASE);
    if (!rooms) return false;
    const shkp = shop_keeper(rooms.charCodeAt(0));
    if (!shkp || !inhishop(shkp)) return false;
    const eshkp = ESHK(shkp);
    return inside_shop(x, y)
        && !((x | 0) === (eshkp.shk?.x | 0) && (y | 0) === (eshkp.shk?.y | 0));
}

function Role_if(pm) {
    return game.urole?.mnum === pm;
}

/** C hack.h sgn */
function sgn(n) {
    return n > 0 ? 1 : n < 0 ? -1 : 0;
}

/** C shk.c oid_price_adjustment — no RNG. */
function oid_price_adjustment(obj, oid) {
    const otyp = obj?.otyp | 0;
    const oc = objects()?.[otyp];
    if ((obj?.dknown && oc?.oc_name_known)
        || ((obj?.oclass | 0) === GEM_CLASS && (oc?.oc_material | 0) === GLASS)) {
        return 0;
    }
    return ((oid | 0) % 4) === 0 ? 1 : 0;
}

/** C shk.c get_pricing_units — quan; globby weight deferred → quan. */
function get_pricing_units(obj) {
    return (obj?.quan | 0) || 1;
}

/**
 * C ref: shk.c is_unpaid — object or any contents on a shop bill.
 */
export function is_unpaid(obj) {
    return !!(obj?.unpaid
        || (Has_contents(obj) && count_unpaid(obj.cobj)));
}

/**
 * C ref: shk.c unpaid_cost — bill price for unpaid invent / contents.
 * Named omissions: impossible() when unpaid but not on bill.
 */
export function unpaid_cost(unp_obj, cost_type) {
    let amt = 0;
    let shkp = null;
    let bp = null;
    const ushops = game.u?.ushops || '';
    for (let i = 0; i < ushops.length; i++) {
        shkp = shop_keeper(ushops.charCodeAt(i));
        if (!shkp) continue;
        bp = onbill(unp_obj, shkp, true);
        if (bp) {
            amt = bp.price | 0;
            if (cost_type !== COST_SINGLEOBJ) {
                amt *= (unp_obj.quan | 0) || 1;
            }
        }
        if (cost_type === COST_CONTENTS && Has_contents(unp_obj)) {
            amt = contained_cost(unp_obj, shkp, amt, false, true);
        }
        if (bp || (!unp_obj.unpaid && amt)) break;
    }
    // C: if (!shkp || (unp_obj->unpaid && !bp)) impossible(...);
    return amt;
}

/**
 * C ref: shk.c sub_one_frombill `:3660–3690` — remove obj from shk bill
 * or (bquan > quan) clone the used-up slice onto billobjs.
 */
export function sub_one_frombill(obj, shkp) {
    if (!obj || !shkp) return;
    const bp = onbill(obj, shkp, false);
    if (bp) {
        obj.unpaid = 0;
        if ((bp.bquan | 0) > (obj.quan | 0)) {
            const otmp = { ...obj };
            otmp.oextra = null;
            otmp.o_id = next_ident();
            bp.bo_id = otmp.o_id;
            otmp.where = OBJ_FREE;
            bp.bquan = (bp.bquan | 0) - (obj.quan | 0);
            otmp.quan = bp.bquan;
            otmp.owt = 0;
            otmp.nobj = null;
            otmp.nexthere = null;
            bp.useup = true;
            add_to_billobjs(otmp);
            return;
        }
        const eshkp = ESHK(shkp);
        const bill = eshkp.bill_p || eshkp.bill;
        if (!bill) return;
        const n = (eshkp.billct | 0) - 1;
        eshkp.billct = n < 0 ? 0 : n;
        let i = 0;
        for (; i <= n; i++) {
            if (bill[i] === bp) break;
        }
        if (i <= n) {
            bill[i] = bill[n];
            bill[n] = undefined;
        }
        return;
    } else if (obj.unpaid) {
        // C: impossible("sub_one_frombill: unpaid object not on bill")
        obj.unpaid = 0;
    }
}

/**
 * C ref: shk.c subfrombill — unpaid obj (+ nested contents deferred depth).
 * Container walk: coins skipped; recursive Has_contents.
 */
export function subfrombill(obj, shkp) {
    if (!obj || !shkp) return;
    sub_one_frombill(obj, shkp);
    if (!Has_contents(obj)) return;
    for (let otmp = obj.cobj; otmp; otmp = otmp.nobj) {
        if ((otmp.oclass | 0) === COIN_CLASS) continue;
        if (Has_contents(otmp)) subfrombill(otmp, shkp);
        else sub_one_frombill(otmp, shkp);
    }
}

/**
 * C ref: shk.c alter_cost — bump/force bill price for obj on any shk bill.
 */
export function alter_cost(obj, amt) {
    if (!obj) return;
    const fmon = game.fmon || [];
    for (const shkp of fmon) {
        if (!shkp?.isshk || ((shkp.mhp | 0) < 1)) continue;
        const bp = onbill(obj, shkp, true);
        if (!bp) continue;
        const newPrice = !amt ? get_cost(obj, shkp) : (amt < 0 ? -amt : amt);
        if (newPrice > (bp.price | 0) || amt < 0) {
            bp.price = newPrice | 0;
        }
        break;
    }
}

/** C mkobj.c alteration_verbs[] — must match COST_xxx. */
const ALTERATION_VERBS = [
    'cancel', 'drain', 'uncharge', 'unbless', 'uncurse', 'disenchant',
    'degrade', 'dilute', 'erase', 'burn', 'neutralize', 'destroy', 'splatter',
    'bite', 'open', 'break the lock on', 'rust', 'rot', 'tarnish', 'crack',
];

/** C invent.c carried — invent[] membership (JS array invent). */
function carried_shop(obj) {
    return !!(obj && (game.invent || []).includes(obj));
}

/**
 * C ref: mkobj.c bill_dummy_object — charge for fully used unpaid item.
 * Dummy lands on billobjs via add_one_tobill (D-1714). Named: nextoid
 * price-matched oid (uses next_ident); copy_oextra / free_omid.
 */
export async function bill_dummy_object(otmp) {
    if (!otmp) return;
    let cost = 0;
    if (otmp.unpaid) {
        cost = unpaid_cost(otmp, COST_SINGLEOBJ) | 0;
        const ushop = (game.u?.ushops || '')[0];
        const shkp = ushop != null && ushop !== ''
            ? shop_keeper(ushop)
            : null;
        if (shkp) subfrombill(otmp, shkp);
    }
    const dummy = { ...otmp };
    dummy.oextra = null;
    dummy.where = OBJ_FREE;
    dummy.o_id = next_ident();
    dummy.timed = 0;
    dummy.lamplit = 0;
    dummy.owornmask = 0;
    dummy.nobj = null;
    dummy.nexthere = null;
    await addtobill(dummy, false, true, true);
    if (cost && dummy.where !== OBJ_DELETED) {
        alter_cost(dummy, -cost);
    }
    otmp.no_charge = (otmp.where === OBJ_FLOOR
        || otmp.where === OBJ_CONTAINED) ? 1 : 0;
    otmp.unpaid = 0;
}

/**
 * C `#define SHOP_WALL_DMG (10L * ACURRSTR)` — damaging a wall.
 * @returns {number}
 */
export function shop_wall_dmg() {
    return 10 * (acurrstr() | 0);
}

/**
 * C ref: shk.c add_damage — schedule shop repair; accumulate cost.
 * Door cells only schedule when they are a real shop entrance (shd).
 * Catchup repair is D-1178 `fix_shop_damage`. Live `shk_fixes_damage`
 * from `shk_move` still named.
 */
export function add_damage(x, y, cost) {
    const lev = game.level?.at(x, y);
    if (!lev) return;

    if (IS_DOOR(lev.typ)) {
        const shops = in_rooms(x, y, SHOPBASE) || '';
        let ok = false;
        for (let i = 0; i < shops.length; i++) {
            const mtmp = shop_keeper(shops.charCodeAt(i));
            if (!mtmp) continue;
            const eshk = ESHK(mtmp);
            if (eshk && (x | 0) === (eshk.shd?.x | 0)
                && (y | 0) === (eshk.shd?.y | 0)) {
                ok = true;
                break;
            }
        }
        if (!ok) return;
    }

    if (!game.level.damagelist) game.level.damagelist = null;
    for (let tmp = game.level.damagelist; tmp; tmp = tmp.next) {
        if ((tmp.place?.x | 0) === (x | 0) && (tmp.place?.y | 0) === (y | 0)) {
            tmp.cost = (tmp.cost | 0) + (cost | 0);
            tmp.when = game.moves | 0;
            return;
        }
    }
    const tmp_dam = {
        when: game.moves | 0,
        place: { x: x | 0, y: y | 0 },
        cost: cost | 0,
        typ: lev.typ | 0,
        flags: (lev.flags | 0) | (lev.doormask | 0) | (lev.wall_info | 0),
        next: game.level.damagelist,
    };
    game.level.damagelist = tmp_dam;
    if (cansee(x, y)) lev.seenv = SVALL;
}

/** C youprop.h Passes_walls. */
function Passes_walls() {
    const u = game.u || {};
    return !!(u.Passes_walls || u.HPasses_walls || u.EPasses_walls);
}

/** C hack.c closed_door — D_CLOSED | D_LOCKED. */
function closed_door_shk(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc || !IS_DOOR(loc.typ)) return false;
    return !!((loc.doormask || 0) & (D_CLOSED | D_LOCKED));
}

/** C: strchr(in_rooms(x,y,SHOPBASE), ESHK(shkp)->shoproom). */
function shop_owns_cell(shkp, x, y) {
    const rooms = in_rooms(x, y, SHOPBASE) || '';
    return rooms.includes(String.fromCharCode(ESHK(shkp)?.shoproom | 0));
}

/**
 * C ref: shk.c shk_impaired — not in shop, helpless, or following.
 */
function shk_impaired(shkp) {
    if (!shkp || !shkp.isshk || !inhishop(shkp)) return true;
    if (helpless(shkp) || ESHK(shkp)?.following) return true;
    return false;
}

/**
 * C ref: shk.c repairable_damage — delay, occupancy, trap occupant, owner.
 */
function repairable_damage(dam, shkp, m_at, t_at) {
    if (!dam || shk_impaired(shkp)) return false;
    const x = dam.place?.x | 0;
    const y = dam.place?.y | 0;
    if (((game.moves | 0) - (dam.when | 0)) < REPAIR_DELAY) return false;
    if (!IS_ROOM(dam.typ | 0)) {
        const mtmp = m_at(x, y);
        if ((u_at(x, y) && !Passes_walls())
            || ((x | 0) === (shkp.mx | 0) && (y | 0) === (shkp.my | 0))
            || (mtmp && !passes_walls(mtmp.data))) {
            return false;
        }
    }
    const ttmp = t_at(x, y);
    if (ttmp) {
        if (u_at(x, y)) return false;
        const mtmp = m_at(x, y);
        if (mtmp && mtmp.mtrapped) return false;
    }
    if (!shop_owns_cell(shkp, x, y)) return false;
    return true;
}

/**
 * C ref: shk.c discard_damage_struct — unlink from damagelist.
 */
function discard_damage_struct(dam) {
    if (!dam || !game.level) return;
    if (dam === game.level.damagelist) {
        game.level.damagelist = dam.next || null;
    } else {
        let prev = game.level.damagelist;
        while (prev && prev.next !== dam) prev = prev.next;
        if (prev) prev.next = dam.next || null;
    }
    dam.next = null;
}

const LITTER_UPDATE = 0x01;
const LITTER_OPEN = 0x02;
const LITTER_INSHOP = 0x04;
function litter_horiz(i) { return (i % 3) - 1; }
function litter_vert(i) { return ((i / 3) | 0) - 1; }

/**
 * C ref: shk.c litter_getpos — adjacent ZAP_POS shop cells for wall gap.
 */
function litter_getpos(litter, x, y, shkp) {
    for (let i = 0; i < 9; i++) litter[i] = 0;
    const loc = game.level?.at(x, y);
    if (!objects_at(x, y) || (loc && IS_ROOM(loc.typ))) return 0;
    let k = 0;
    for (let i = 0; i < 9; i++) {
        const ix = x + litter_horiz(i);
        const iy = y + litter_vert(i);
        const adj = game.level?.at(ix, iy);
        if (i === 4 || !isok(ix, iy) || !adj || !ZAP_POS(adj.typ)) continue;
        litter[i] = LITTER_OPEN;
        if ((inside_shop(ix, iy) | 0) === (ESHK(shkp)?.shoproom | 0)) {
            litter[i] |= LITTER_INSHOP;
            k++;
        }
    }
    return k;
}

/**
 * C ref: shk.c litter_scatter — move floor objects out of a repaired gap.
 */
async function litter_scatter(litter, x, y, shkp) {
    const u = game.u || {};
    const chain = u.uchain;
    const ball = u.uball;
    if (ball && !u.uswallow
        && ((chain && (chain.ox | 0) === x && (chain.oy | 0) === y)
            || ((ball.where | 0) === OBJ_FLOOR
                && (ball.ox | 0) === x && (ball.oy | 0) === y))) {
        if (!hero_deaf() && !muteshk(shkp)) {
            await verbalize('Get your junk out of my wall!');
        }
        const { unplacebc, placebc } = await import('./ball.js');
        unplacebc();
        placebc();
    }
    let otmp;
    while ((otmp = objects_at(x, y))) {
        if ((otmp.otyp | 0) === BOULDER || (otmp.otyp | 0) === ROCK) {
            // C obj_extract_self + obfree — not delobj (no obj_resists rn2).
            obj_extract_self(otmp);
            obfree(otmp, null);
            continue;
        }
        let trylimit = 10;
        let i = rn2(9);
        do {
            i = (i + 1) % 9;
        } while (--trylimit && !(litter[i] & LITTER_INSHOP));
        let ix;
        let iy;
        if ((litter[i] & (LITTER_OPEN | LITTER_INSHOP)) !== 0) {
            ix = x + litter_horiz(i);
            iy = y + litter_vert(i);
        } else {
            ix = shkp.mx | 0;
            iy = shkp.my | 0;
        }
        if (otmp.unpaid) {
            let oshk = shkp;
            if (costly_spot(ix, iy)
                && (onbill(otmp, oshk, true)
                    || ((oshk = find_objowner(otmp, ix, iy))
                        && onbill(otmp, oshk, false)))) {
                subfrombill(otmp, oshk);
            }
        }
        if (otmp.no_charge) {
            if (!costly_spot(ix, iy) && !costly_adjacent(shkp, ix, iy)) {
                otmp.no_charge = 0;
            }
        }
        obj_extract_self(otmp);
        place_object(otmp, ix, iy);
        litter[i] |= LITTER_UPDATE;
    }
}

/** C ref: shk.c litter_newsyms. */
function litter_newsyms(litter, x, y) {
    for (let i = 0; i < 9; i++) {
        if (litter[i] & LITTER_UPDATE) {
            newsym(x + litter_horiz(i), y + litter_vert(i));
        }
    }
}

/**
 * C ref: shk.c repair_damage — 0 postponed, 1 silent, 2 normal, 3 untrap.
 * catchup=TRUE skips messages after terrain restore (goto_level / bones).
 */
async function repair_damage(shkp, tmp_dam, catchup, deps) {
    const { m_at, t_at, deltrap, trapname, picking_at, del_engr_at } = deps;
    if (!repairable_damage(tmp_dam, shkp, m_at, t_at)) return 0;

    const x = tmp_dam.place.x | 0;
    const y = tmp_dam.place.y | 0;
    const seeit = cansee(x, y);
    let disposition = 1;
    let stop_picking = false;
    const loc = game.level?.at(x, y);

    const ttmp = t_at(x, y);
    if (ttmp) {
        const ttyp = ttmp.ttyp | 0;
        switch (ttyp) {
        case LANDMINE:
        case BEAR_TRAP: {
            const otmp = mksobj(
                ttyp === LANDMINE ? LAND_MINE : BEARTRAP, true, false,
            );
            otmp.quan = 1;
            otmp.owt = weight(otmp);
            if (!catchup) {
                if (canseemon(shkp)
                    && dist2(x, y, shkp.mx | 0, shkp.my | 0) <= 2) {
                    await pline(
                        `${Shknam(shkp)} untraps ${ansimpleoname(otmp)}.`,
                    );
                } else if (ttmp.tseen && cansee(ttmp.tx | 0, ttmp.ty | 0)) {
                    await pline(`The ${trapname(ttyp, true)} vanishes.`);
                }
            }
            mpickobj(shkp, otmp);
            break;
        }
        case HOLE:
        case PIT:
        case SPIKED_PIT:
            if (!catchup && ttmp.tseen && cansee(ttmp.tx | 0, ttmp.ty | 0)) {
                await pline(`The ${trapname(ttyp, true)} is filled in.`);
            }
            break;
        default:
            if (!catchup && ttmp.tseen && cansee(ttmp.tx | 0, ttmp.ty | 0)) {
                await pline(`The ${trapname(ttyp, true)} vanishes.`);
            }
            break;
        }
        deltrap(ttmp);
        del_engr_at(x, y);
        if (seeit) newsym(x, y);
        if (!catchup) disposition = 3;
    }
    const savedTyp = tmp_dam.typ | 0;
    const curTyp = loc?.typ | 0;
    const curDoor = loc?.doormask | 0;
    if (IS_ROOM(savedTyp)
        || (savedTyp === curTyp
            && (!IS_DOOR(savedTyp) || curDoor > D_BROKEN))) {
        return disposition;
    }

    if (closed_door_shk(x, y)) stop_picking = picking_at(x, y);

    if (loc) {
        loc.typ = savedTyp;
        if (IS_DOOR(savedTyp)) {
            loc.doormask = D_CLOSED;
        } else {
            loc.flags = tmp_dam.flags | 0;
            loc.wall_info = tmp_dam.flags | 0;
        }
    }

    const litter = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    if (litter_getpos(litter, x, y, shkp)) {
        await litter_scatter(litter, x, y, shkp);
    }
    del_engr_at(x, y);

    if (seeit) newsym(x, y);
    recalc_block_point(x, y);

    if (catchup) return 1;

    if (seeit) {
        if (IS_WALL(savedTyp)) {
            if (loc) loc.seenv = SVALL;
            await pline('Suddenly, a section of the wall closes up!');
        } else if (IS_DOOR(savedTyp)) {
            await pline('Suddenly, the shop door reappears!');
        }
        newsym(x, y);
    } else if (IS_WALL(savedTyp)) {
        if ((inside_shop(game.u?.ux | 0, game.u?.uy | 0) | 0)
            === (ESHK(shkp)?.shoproom | 0)) {
            await You_feel('more claustrophobic than before.');
        } else if (!hero_deaf() && !rn2(10)) {
            await Norep('The dungeon acoustics noticeably change.');
        }
    }

    if (stop_picking) await stop_occupation();
    litter_newsyms(litter, x, y);
    if (disposition < 3) disposition = 2;
    return disposition;
}

/**
 * C ref: shk.c fix_shop_damage — catch up shop repairs on a revisited
 * level (goto_level !new; also allmain restore / bones, unwired here).
 */
export async function fix_shop_damage() {
    if (!game.level?.damagelist) return;
    const { m_at } = await import('./mon.js');
    const { t_at, deltrap, trapname } = await import('./trap.js');
    const { picking_at } = await import('./lock.js');
    const { del_engr_at } = await import('./engrave.js');
    const deps = { m_at, t_at, deltrap, trapname, picking_at, del_engr_at };
    for (let walk = next_shkp(0, false); walk.shkp;
        walk = next_shkp(walk.nextIdx, false)) {
        const shkp = walk.shkp;
        if (shk_impaired(shkp)) continue;
        let damg = game.level.damagelist;
        while (damg) {
            const nextdamg = damg.next;
            if (await repair_damage(shkp, damg, true, deps)) {
                discard_damage_struct(damg);
            }
            damg = nextdamg;
        }
    }
}

/** C shk.c angrytexts — Deaf pline ROLL_FROM. */
const ANGRYTEXTS = ['quite upset', 'ticked off', 'furious'];

/** C: Deaf — intrinsic / extrinsic / roleplay / flag. */
function hero_deaf() {
    const u = game.u || {};
    return !!(u.Deaf || (u.HDeaf | 0) || (u.EDeaf | 0) || u.uroleplay?.deaf);
}

/** C apply.c um_dist — true if Chebyshev distance to hero > n. */
function um_dist(x, y, n) {
    const u = game.u || {};
    return Math.abs((u.ux | 0) - (x | 0)) > n
        || Math.abs((u.uy | 0) - (y | 0)) > n;
}

/** C: distu / mdistu — squared Euclidean to hero. */
function distu_xy(x, y) {
    const u = game.u || {};
    return dist2(u.ux | 0, u.uy | 0, x | 0, y | 0);
}
function mdistu_mon(mtmp) {
    if (!mtmp) return (ROWNO * ROWNO) + (COLNO * COLNO);
    return distu_xy(mtmp.mx | 0, mtmp.my | 0);
}

/** C polyself.c poly_gender — 0 male / 1 female / 2 none (neuter omit). */
function poly_gender_shk() {
    return game.flags?.female ? 1 : 0;
}

/**
 * C ref: shk.c clear_no_charge_obj — clear no_charge (+ contents).
 * When shkp is null, clear all; else clear when not in a rival shop.
 * Named omission: get_obj_location buried / contained coord polish.
 */
function clear_no_charge_obj(shkp, otmp) {
    if (!otmp) return;
    if (Has_contents(otmp)) clear_no_charge(shkp, otmp.cobj);
    if (!otmp.no_charge) return;
    if (!shkp) {
        otmp.no_charge = 0;
        return;
    }
    const where = otmp.where | 0;
    if (where !== OBJ_FLOOR && where !== OBJ_CONTAINED) {
        otmp.no_charge = 0;
        return;
    }
    let x = otmp.ox | 0;
    let y = otmp.oy | 0;
    if (where === OBJ_CONTAINED) {
        let cont = otmp.ocontainer;
        while (cont && (cont.where | 0) === OBJ_CONTAINED) cont = cont.ocontainer;
        if (cont && (cont.where | 0) === OBJ_FLOOR) {
            x = cont.ox | 0;
            y = cont.oy | 0;
        } else {
            otmp.no_charge = 0;
            return;
        }
    }
    if (!isok(x, y)) {
        otmp.no_charge = 0;
        return;
    }
    const loc = game.level?.at?.(x, y);
    const rno = loc?.roomno | 0;
    if (rno < ROOMOFFSET || !IS_SHOP(rno - ROOMOFFSET)) {
        otmp.no_charge = 0;
        return;
    }
    const rm_shkp = game.level?.rooms?.[rno - ROOMOFFSET]?.resident || null;
    if (!rm_shkp || rm_shkp === shkp) otmp.no_charge = 0;
}

/** C ref: shk.c clear_no_charge — walk nobj chain. */
function clear_no_charge(shkp, list) {
    for (let otmp = list; otmp; otmp = otmp.nobj) {
        clear_no_charge_obj(shkp, otmp);
    }
}

/** C ref: shk.c clear_no_charge_pets. */
function clear_no_charge_pets(shkp) {
    for (const mtmp of game.fmon || []) {
        if (mtmp?.mtame && mtmp.minvent) clear_no_charge(shkp, mtmp.minvent);
    }
}

/**
 * C ref: shk.c cad — insult noun; altusage → "\"Cad!  ".
 * Named omission: impossible unknown gender; mon_nam buffer reuse.
 */
function cad(altusage) {
    let res = 'cad';
    const youData = game.youmonst?.data;
    if (is_demon(youData)) {
        res = 'fiend';
    } else {
        switch (poly_gender_shk()) {
        case 0: res = 'cad'; break;
        case 1: res = 'minx'; break;
        case 2: res = 'beast'; break;
        default: res = 'thing'; break;
        }
    }
    if (!altusage) return res;
    const capped = res.charAt(0).toUpperCase() + res.slice(1);
    return `"${capped}!  `;
}

/**
 * C ref: shk.c hot_pursuit — rile + customer + following; clear floor
 * no_charge networking.
 */
export function hot_pursuit(shkp) {
    if (!shkp?.isshk) return;
    rile_shk(shkp);
    const eshk = ESHK(shkp);
    if (eshk) {
        eshk.customer = String(game.plname || '').slice(0, 32);
        eshk.following = 1;
    }
    clear_no_charge(null, game.fobj);
    clear_no_charge_pets(shkp);
}

/**
 * C ref: shk.c make_angry_shk — fold bill into robbed, then hot_pursuit.
 */
export async function make_angry_shk(shkp, _ox, _oy) {
    if (!shkp?.isshk) return;
    const eshkp = ESHK(shkp);
    if (eshkp && ((eshkp.billct | 0) || (eshkp.debit | 0)
        || (eshkp.loan | 0) || (eshkp.credit | 0))) {
        eshkp.robbed = (eshkp.robbed | 0)
            + addupbill(shkp) + (eshkp.debit | 0) + (eshkp.loan | 0);
        eshkp.robbed -= eshkp.credit | 0;
        if (eshkp.robbed < 0) eshkp.robbed = 0;
        setpaid(shkp);
    }
    await pline(
        `${Shknam(shkp)} ${!ANGRY(shkp) ? 'gets angry' : 'is furious'}!`,
    );
    hot_pursuit(shkp);
}

/**
 * C ref: shk.c angry_shk_exists — any live isshk still ANGRY.
 * Walks next_shkp(withbill=FALSE); rile side-effect matches C.
 */
function angry_shk_exists() {
    let startIdx = 0;
    for (;;) {
        const { shkp, nextIdx } = next_shkp(startIdx, false);
        if (!shkp) return false;
        if (ANGRY(shkp)) return true;
        startIdx = nextIdx;
    }
}

/**
 * C ref: shk.c kops_gone — mongone every live S_KOP; pline unless silent.
 * Snapshot then mongone: JS fmon is an array (C saves nmon).
 */
async function kops_gone(silent) {
    let cnt = 0;
    const kops = (game.fmon || []).filter((mtmp) => (
        mtmp && (mtmp.mhp | 0) >= 1 && mtmp.data?.mlet === 'S_KOP'
    ));
    if (kops.length) {
        const { mongone } = await import('./mon.js');
        for (const mtmp of kops) {
            if (canspotmon(mtmp)) cnt++;
            await mongone(mtmp);
        }
    }
    if (cnt && !silent) {
        await pline(
            `The Kop${plur(cnt)} (disappointed) vanish${cnt === 1 ? 'es' : ''} into thin air.`,
        );
    }
}

/**
 * C ref: mon.c pacify_guards / pacify_guard — is_watch → mpeaceful.
 * Clone (mon.js→trap/monmove→shk cycle). iter_mons skips dead/offmap.
 */
function pacify_guards() {
    for (const mtmp of game.fmon || []) {
        if (!mtmp || (mtmp.mhp | 0) < 1) continue;
        if ((mtmp.mstate | 0) !== MON_FLOOR) continue;
        if (is_watch(mtmp.data)) mtmp.mpeaceful = 1;
    }
}

/**
 * C ref: shk.c make_happy_shoppers — kops+guards iff no angry shk remains.
 * Caller losedogs still named.
 */
export async function make_happy_shoppers(silentkops) {
    if (!angry_shk_exists()) {
        await kops_gone(!!silentkops);
        pacify_guards();
    }
}

/**
 * C ref: shk.c make_happy_shk — pacify, adjalign (non-Rogue), home or
 * migrate+dismiss_kops, then make_happy_shoppers. D-1540.
 * Named omit: full mnearto yank in home_shk.
 */
export async function make_happy_shk(shkp, silentkops) {
    if (!shkp?.isshk) return;
    const wasmad = ANGRY(shkp);
    const eshkp = ESHK(shkp);
    pacify_shk(shkp, false);
    if (eshkp) {
        eshkp.following = 0;
        eshkp.robbed = 0;
    }
    if (!Role_if(PM_ROGUE)) adjalign(sgn(game.u?.ualign?.type | 0));
    if (!inhishop(shkp)) {
        const shk_nam = shkname(shkp);
        let vanished = canseemon(shkp);
        if (on_level(eshkp?.shoplevel, game.u?.uz)) {
            await home_shk(shkp, false);
            if (canspotmon(shkp)) {
                await pline(
                    `${Shknam(shkp)} returns to ${noit_mhis(shkp)} shop.`,
                );
                vanished = false;
            }
        } else {
            if (sensemon(shkp)) vanished = true;
            const { mdrop_special_objs } = await import('./mon.js');
            mdrop_special_objs(shkp);
            migrate_to_level(
                shkp, ledger_no(eshkp?.shoplevel), MIGR_APPROX_XY, eshkp?.shd,
            );
            if (eshkp) eshkp.dismiss_kops = true;
        }
        if (vanished) {
            await pline(`Satisfied, ${shk_nam} suddenly disappears!`);
        }
    } else if (wasmad) {
        await pline(`${Shknam(shkp)} calms down.`);
    }
    await make_happy_shoppers(silentkops);
}

/**
 * C ref: shk.c getcad — shk verbalizes / plines about shop damage, then
 * hot_pursuit. SetVoice deferred.
 */
async function getcad(shkp, dmgstr, x, y, uinshp, animal, pursue) {
    const dugwall = dmgstr === 'dig into' || dmgstr === 'damage';
    const shopOrDoor = dugwall ? 'shop' : 'door';
    const his = 'his'; // noit_mhis deferred → male default for shk path
    if (muteshk(shkp)) {
        if (animal && !helpless(shkp)) {
            const { yelp } = await import('./sounds.js');
            await yelp(shkp);
        }
    } else if (pursue || uinshp || !um_dist(x, y, 1)) {
        if (!hero_deaf()) {
            await verbalize(`How dare you ${dmgstr} my ${shopOrDoor}?`);
        } else {
            const angry = ANGRYTEXTS[rn2(ANGRYTEXTS.length)];
            await pline(
                `${Shknam(shkp)} is ${angry} that you decided to ${dmgstr} ${his} ${shopOrDoor}!`,
            );
        }
    } else if (!hero_deaf()) {
        await pline(`${Shknam(shkp)} shouts:`);
        await verbalize(`Who dared ${dmgstr} my ${shopOrDoor}?`);
    } else {
        const angry = ANGRYTEXTS[rn2(ANGRYTEXTS.length)];
        await pline(
            `${Shknam(shkp)} is ${angry} that someone decided to ${dmgstr} ${his} ${shopOrDoor}!`,
        );
    }
    hot_pursuit(shkp);
}

/**
 * Thin door-appear: place shk at/near (x,y). Full mnearto + yank deferred.
 */
async function mnearto_shk_door(shkp, x, y) {
    const { m_at } = await import('./mon.js');
    if (m_at(x, y) && m_at(x, y) !== shkp) {
        const mm = { x: 0, y: 0 };
        if (enexto(mm, x, y, shkp.data)) {
            await rloc_to_flag(shkp, mm.x, mm.y, RLOC_MSG);
            return;
        }
    }
    await rloc_to_flag(shkp, x, y, RLOC_MSG);
}

/**
 * C ref: shk.c pay_for_damage — bill/mollify/pursue after shop damage this
 * turn (damagelist.when == moves && cost).
 * Named omissions: SetVoice; sleep(1); full mnearto yank; mbodypart lunge;
 * noit_mhis;
 */
export async function pay_for_damage(dmgstr, cant_mollify) {
    const u = game.u || {};
    const uinshp = !!(u.ushops && String(u.ushops).length > 0);
    let shkp = null;
    let appear_here = null;
    let cost_of_damage = 0;
    let nearest_shk = (ROWNO * ROWNO) + (COLNO * COLNO);
    let nearest_damage = nearest_shk;
    let picks = 0;

    for (let tmp_dam = game.level?.damagelist; tmp_dam; tmp_dam = tmp_dam.next) {
        if ((tmp_dam.when | 0) !== (game.moves | 0) || !(tmp_dam.cost | 0)) {
            continue;
        }
        cost_of_damage += tmp_dam.cost | 0;
        const shops_affected = in_rooms(
            tmp_dam.place.x | 0, tmp_dam.place.y | 0, SHOPBASE,
        ) || '';
        for (let i = 0; i < shops_affected.length; i++) {
            const tmp_shk = shop_keeper(shops_affected.charCodeAt(i));
            if (!tmp_shk) continue;
            if (tmp_shk === shkp) {
                const damage_distance = distu_xy(
                    tmp_dam.place.x | 0, tmp_dam.place.y | 0,
                );
                if (damage_distance < nearest_damage) {
                    nearest_damage = damage_distance;
                    appear_here = tmp_dam;
                }
                continue;
            }
            if (!inhishop(tmp_shk)) continue;
            const shk_distance = mdistu_mon(tmp_shk);
            if (shk_distance > nearest_shk) continue;
            if (shk_distance === nearest_shk && picks) {
                if (rn2(++picks)) continue;
            } else {
                picks = 1;
            }
            shkp = tmp_shk;
            nearest_shk = shk_distance;
            appear_here = tmp_dam;
            nearest_damage = distu_xy(
                tmp_dam.place.x | 0, tmp_dam.place.y | 0,
            );
        }
    }

    if (!cost_of_damage || !shkp || !appear_here) return;

    let ms = shkp.data?.msound;
    if (ms == null) ms = shkp.isshk ? MS_SELL : 0;
    const animal = (ms | 0) <= MS_ANIMAL;
    let pursue = false;
    const x = appear_here.place.x | 0;
    const y = appear_here.place.y | 0;

    const eshk = ESHK(shkp);
    if (eshk) eshk.customer = String(game.plname || '').slice(0, 32);

    if (ANGRY(shkp) || eshk?.following) {
        hot_pursuit(shkp);
        return;
    }

    const shkRooms = in_rooms(shkp.mx | 0, shkp.my | 0, SHOPBASE) || '';
    if (!shkRooms.length) {
        if (!cansee(shkp.mx | 0, shkp.my | 0)) return;
        pursue = true;
        await getcad(shkp, dmgstr, x, y, uinshp, animal, pursue);
        return;
    }

    if (uinshp) {
        if (um_dist(shkp.mx | 0, shkp.my | 0, 1)
            && !um_dist(shkp.mx | 0, shkp.my | 0, 3)) {
            await pline(`${Shknam(shkp)} leaps towards you!`);
            const { mnexto } = await import('./mon.js');
            await mnexto(shkp, RLOC_NOMSG);
        }
        pursue = um_dist(shkp.mx | 0, shkp.my | 0, 1);
        if (pursue) {
            await getcad(shkp, dmgstr, x, y, uinshp, animal, pursue);
            return;
        }
    } else {
        const { m_at } = await import('./mon.js');
        if (m_at(x, y) && m_at(x, y) !== shkp) {
            if (!animal) {
                if (!hero_deaf() && !muteshk(shkp)) {
                    await pline('You hear an angry voice:');
                    await verbalize('Out of my way, scum!');
                }
            } else {
                const { growl } = await import('./sounds.js');
                await growl(shkp);
            }
        }
        await mnearto_shk_door(shkp, x, y);
    }

    const credit = eshk?.credit | 0;
    if ((um_dist(x, y, 1) && !uinshp) || cant_mollify
        || (money_cnt(game.invent) + credit) < cost_of_damage
        || !rn2(50)) {
        await getcad(shkp, dmgstr, x, y, uinshp, animal, pursue);
        return;
    }

    const Invis = !!(u.Invis || u.HInvis || u.EInvis);
    if (Invis) {
        await pline(`Your invisibility does not fool ${shkname(shkp)}!`);
    }
    const cadPrefix = !animal ? cad(true) : '';
    const qbuf = `${cadPrefix}You did ${cost_of_damage} ${currency(cost_of_damage)} worth of damage!${!animal ? '"' : ''}  Pay?`;
    if ((await yn_function(qbuf, 'yn', 'n')) !== 'n') {
        const was_seen = canseemon(shkp);
        const was_outside = !inhishop(shkp);
        const sx = shkp.mx | 0;
        const sy = shkp.my | 0;
        let owed = check_credit(cost_of_damage, shkp);
        if (owed > 0) {
            money2mon(shkp, owed);
            if (game.flags) game.flags.botl = true;
        }
        await pline(`Mollified, ${shkname(shkp)} accepts your restitution.`);
        await home_shk(shkp, false);
        pacify_shk(shkp, false);
        if ((shkp.mx | 0) !== sx || (shkp.my | 0) !== sy) {
            if (was_outside && canseemon(shkp)) {
                await pline(`${Shknam(shkp)} returns to ${'his'} shop.`);
            } else {
                const is_seen = canseemon(shkp);
                if (is_seen || was_seen) {
                    const verb = !was_seen ? 'appears'
                        : is_seen ? 'shifts location' : 'disappears';
                    await pline(`${Shknam(shkp)} ${verb}.`);
                }
            }
        }
    } else {
        if (!animal) {
            if (!hero_deaf() && !muteshk(shkp)) {
                await verbalize("Oh, yes!  You'll pay!");
            } else {
                await pline(
                    `${Shknam(shkp)} lunges ${'his'} ${'hand'} toward your ${'neck'}!`,
                );
            }
        } else {
            const { growl } = await import('./sounds.js');
            await growl(shkp);
        }
        hot_pursuit(shkp);
        const atyp = u.ualign?.type | 0;
        adjalign(-(atyp > 0 ? 1 : atyp < 0 ? -1 : 0));
    }
}

/**
 * C ref: shk.c shopdig — warn (fall=0) or snatch pack (fall=1) when
 * digging a hole in a shop.
 * Envelope (D-0958): inhishop verbalize / knight adjalign; fall path
 * mnexto + invent snatch via setnotworn/freeinv/subfrombill/add_to_minv.
 * D-1016: snatch iff !um_dist (close, Chebyshev ≤5) like C shk.c:5061;
 * worn clear via do.js setnotworn (extrinsics), not pointer-only stub.
 * Named omit: SetVoice; nolimbs #if0 curse/rile early-return.
 * @param {number} fall 0 = start dig warn; 1 = fall-through snatch
 */
export async function shopdig(fall) {
    const u = game.u || {};
    const flags = game.flags || {};
    const ushop = (u.ushops || '')[0];
    if (!ushop) return;
    const shkp = shop_keeper(ushop.charCodeAt(0));
    if (!shkp) return;
    if (!inhishop(shkp)) {
        if (Role_if(PM_KNIGHT)) {
            await pline('You feel like a common thief.');
            const atyp = u.ualign?.type | 0;
            adjalign(-(atyp > 0 ? 1 : atyp < 0 ? -1 : 0));
        }
        return;
    }

    // 0 == can't speak, 1 == animal noises, 2 == speaks
    let lang = 0;
    if (helpless(shkp) || is_silent_shk(shkp)) {
        // lang stays 0
    } else {
        let ms = shkp?.data?.msound;
        if (ms == null) ms = shkp?.isshk ? MS_SELL : 0;
        ms |= 0;
        if (ms <= MS_ANIMAL) lang = 1;
        else if (ms >= MS_HUMANOID) lang = 2;
    }

    if (!fall) {
        if (lang === 2) {
            if (!hero_deaf() && !muteshk(shkp)) {
                // SetVoice deferred
                if ((u.utraptype | 0) === TT_PIT) {
                    await verbalize(
                        `Be careful, ${flags.female ? 'madam' : 'sir'}, `
                        + 'or you might fall through the floor.',
                    );
                } else {
                    await verbalize(
                        `${flags.female ? 'Madam' : 'Sir'}, do not damage `
                        + 'the floor here!',
                    );
                }
            }
        }
        if (Role_if(PM_KNIGHT)) {
            await pline('You feel like a common thief.');
            const atyp = u.ualign?.type | 0;
            adjalign(-(atyp > 0 ? 1 : atyp < 0 ? -1 : 0));
        }
        return;
    }

    // fall === 1 — C else if (!um_dist(shk,5) && !helpless && bill).
    // um_dist is true when far (Chebyshev > 5); snatch when close.
    const eshk = ESHK(shkp);
    if (um_dist(shkp.mx | 0, shkp.my | 0, 5)
        || helpless(shkp)
        || !((eshk?.billct | 0) || (eshk?.debit | 0))) {
        return;
    }

    let grabs = 'grabs';
    if (nolimbs(shkp.data)) {
        grabs = 'knocks off';
        // C #if0 curse/rile early-return deferred
    }

    if (!m_next2u(shkp)) {
        const { mnexto } = await import('./mon.js');
        await mnexto(shkp, RLOC_MSG);
        if (!m_next2u(shkp)) {
            if (lang === 2) {
                await pline(
                    `${Shknam(shkp)} curses you in anger and frustration!`,
                );
            } else if (lang === 1) {
                const { growl } = await import('./sounds.js');
                await growl(shkp);
            }
            rile_shk(shkp);
            return;
        }
        await pline(
            `${Shknam(shkp)} ${makeplural(locomotion_shk(shkp.data, 'leap'))}`
            + `, and ${grabs} your backpack!`,
        );
    } else {
        await pline(`${Shknam(shkp)} ${grabs} your backpack!`);
    }

    const { setnotworn } = await import('./do.js');
    const invent = game.invent || [];
    for (const obj of [...invent]) {
        if (!obj) continue;
        if (((obj.owornmask | 0) & ~(W_SWAPWEP | W_QUIVER)) !== 0
            || (obj === u.uswapwep && u.twoweap)
            || (LEASH >= 0 && (obj.otyp | 0) === LEASH && (obj.leashmon | 0))) {
            continue;
        }
        if (obj === game.current_wand) continue;
        setnotworn(obj);
        freeinv_shopdig(obj);
        subfrombill(obj, shkp);
        add_to_minv(shkp, obj); // may free obj in C; JS keeps reference
    }
}

/** C mondata.h is_silent — msound == MS_SILENT. */
function is_silent_shk(mtmp) {
    let ms = mtmp?.data?.msound;
    if (ms == null) ms = mtmp?.isshk ? MS_SELL : MS_SILENT;
    return (ms | 0) === MS_SILENT;
}

/**
 * C mondata.c locomotion — verb for how a monster moves (shopdig leap).
 * Capitals when def starts uppercase.
 */
function locomotion_shk(ptr, def) {
    const d = String(def ?? '');
    const cap = !!(d[0] && d[0] === d[0].toUpperCase()
        && d[0] !== d[0].toLowerCase());
    const pick = (lo, hi) => (cap ? hi : lo);
    if (is_floater(ptr)) return pick('float', 'Float');
    if (is_flyer(ptr)) return pick('fly', 'Fly');
    if (((ptr?.mflags1 ?? 0) & M1_SLITHY) !== 0) {
        return pick('slither', 'Slither');
    }
    if (amorphous(ptr)) return pick('ooze', 'Ooze');
    if (!(ptr?.mmove | 0)) return pick('wiggle', 'Wiggle');
    if (nolimbs(ptr)) return pick('crawl', 'Crawl');
    return d;
}

/** C invent.c freeinv — splice from invent[]; refresh gold botl cache. */
function freeinv_shopdig(obj) {
    if (!obj) return;
    const inv = game.invent || [];
    const idx = inv.indexOf(obj);
    if (idx >= 0) inv.splice(idx, 1);
    obj.nobj = null;
    obj.where = OBJ_FREE;
    if ((obj.oclass | 0) === COIN_CLASS) {
        game._goldCount = Math.max(
            0, (game._goldCount || 0) - ((obj.quan | 0) || 0),
        );
        if (game.flags) game.flags.botl = true;
    }
}

/**
 * C ref: mkobj.c costly_alteration — shop bill for modified unpaid goods.
 * Branch envelope: invent/free unpaid verbalize+bill_dummy; floor same-
 * shop verbalize+bill_dummy; floor remote stolen_value (D-0983).
 * Named omission: SetVoice.
 */
export async function costly_alteration(obj, alter_type) {
    if (!obj) return;
    let at = alter_type | 0;
    if (at < 0 || at >= ALTERATION_VERBS.length) at = 0;

    let ox = 0;
    let oy = 0;
    let objroom = '\0';
    const holder = { shkp: null };

    if (carried_shop(obj) || obj.where === OBJ_INVENT || obj.where === OBJ_FREE) {
        if (!obj.unpaid) return;
    } else {
        const loc = get_obj_location(obj, 0x1);
        if (loc) {
            ox = loc.x | 0;
            oy = loc.y | 0;
        } else {
            ox = game.u?.ux | 0;
            oy = game.u?.uy | 0;
        }
        if (!costly_spot(ox, oy)) return;
        const rooms = in_rooms(ox, oy, SHOPBASE) || '';
        objroom = rooms[0] || '\0';
        if (!billable(holder, obj, objroom, false)) return;
    }

    const those = (obj.quan | 0) === 1 ? 'that' : 'those';
    const them = (obj.quan | 0) === 1 ? 'it' : 'them';
    const learnBknown = at === COST_UNCURS || at === COST_UNBLSS;
    const verb = ALTERATION_VERBS[at];

    if (obj.where === OBJ_FREE || obj.where === OBJ_INVENT
        || carried_shop(obj)) {
        if (learnBknown) obj.bknown = 1;
        await verbalize(
            `You ${verb} ${those} ${simpleonames(obj)}, you pay for ${them}!`,
        );
        await bill_dummy_object(obj);
    } else if (obj.where === OBJ_FLOOR) {
        if (learnBknown) obj.bknown = 1;
        const ushop = (game.u?.ushops || '')[0] || '\0';
        if (costly_spot(game.u?.ux | 0, game.u?.uy | 0) && objroom === ushop) {
            await verbalize(
                `You ${verb} ${those}, you pay for ${them}!`,
            );
            await bill_dummy_object(obj);
        } else {
            await stolen_value(obj, ox, oy, false, false);
        }
    }
}

/**
 * C ref: shk.c onshopbill — whether obj is on shk's bill.
 */
export function onshopbill(obj, shkp, silent) {
    return !!onbill(obj, shkp, silent);
}

/**
 * C ref: shk.c find_objowner — owning shk for obj at <x,y> (or on bill).
 * Named omit: next_shkp surcharge rile during scan is via next_shkp helper.
 */
export function find_objowner(obj, x, y) {
    if (!obj) return null;
    let deflt_shkp = null;
    if (obj.where === OBJ_ONBILL) {
        let walk = next_shkp(0, true);
        while (walk.shkp) {
            if (onshopbill(obj, walk.shkp, true)) return walk.shkp;
            walk = next_shkp(walk.nextIdx, true);
        }
        return null;
    }
    const where = in_rooms(x, y, SHOPBASE) || '';
    for (let i = 0; i < where.length; i++) {
        const shkp = shop_keeper(where.charCodeAt(i));
        if (!shkp) continue;
        if (onshopbill(obj, shkp, true)) return shkp;
        if (!deflt_shkp) deflt_shkp = shkp;
    }
    return deflt_shkp;
}

/**
 * C ref: shk.c contained_gold — sum COIN_CLASS quan (+ nested when known).
 */
export function contained_gold(obj, even_if_unknown) {
    let value = 0;
    for (let otmp = obj?.cobj; otmp; otmp = otmp.nobj) {
        if ((otmp.oclass | 0) === COIN_CLASS) {
            value += otmp.quan | 0;
        } else if (Has_contents(otmp) && (otmp.cknown || even_if_unknown)) {
            value += contained_gold(otmp, even_if_unknown);
        }
    }
    return value;
}

/**
 * C ref: shk.c costly_gold — gold taken from a costly spot adjusts
 * credit/debit/loan (pickup addtobill coin; kick gold out of shop).
 */
export async function costly_gold(x, y, amount, silent) {
    const amt = amount | 0;
    if (!costly_spot(x, y) || amt <= 0) return;
    const rooms = in_rooms(x, y, SHOPBASE) || '';
    const shkp = shop_keeper(rooms.charCodeAt(0) || 0);
    if (!shkp) return;
    const eshkp = ESHK(shkp);
    if (!eshkp) return;

    if ((eshkp.credit | 0) >= amt) {
        if (!silent) {
            if ((eshkp.credit | 0) > amt) {
                await pline(
                    `Your credit is reduced by ${amt} ${currency(amt)}.`,
                );
            } else {
                await pline('Your credit is erased.');
            }
        }
        eshkp.credit = (eshkp.credit | 0) - amt;
    } else {
        const delta = amt - (eshkp.credit | 0);
        if (!silent) {
            if (eshkp.credit | 0) await pline('Your credit is erased.');
            if (eshkp.debit | 0) {
                await pline(
                    `Your debt increases by ${delta} ${currency(delta)}.`,
                );
            } else {
                await pline(
                    `You owe ${shkname(shkp)} ${delta} ${currency(delta)}.`,
                );
            }
        }
        eshkp.debit = (eshkp.debit | 0) + delta;
        eshkp.loan = (eshkp.loan | 0) + delta;
        eshkp.credit = 0;
    }
}

/**
 * C ref: shk.c donate_gold — opposite of costly_gold; gold dropped/kicked
 * into shop pays debit or builds credit.
 * @param {boolean} selling T: dropped in shop; F: kicked and landed in shop
 */
export async function donate_gold(gltmp, shkp, selling) {
    const amount = gltmp | 0;
    if (!shkp || amount <= 0) return;
    const eshkp = ESHK(shkp);
    if (!eshkp) return;

    if ((eshkp.debit | 0) >= amount) {
        if (eshkp.loan | 0) {
            if ((eshkp.loan | 0) > amount) eshkp.loan = (eshkp.loan | 0) - amount;
            else eshkp.loan = 0;
        }
        eshkp.debit = (eshkp.debit | 0) - amount;
        await pline(
            `Your debt is ${eshkp.debit ? 'partially ' : ''}paid off.`,
        );
    } else {
        const delta = amount - (eshkp.debit | 0);
        eshkp.credit = (eshkp.credit | 0) + delta;
        if (eshkp.debit | 0) {
            eshkp.debit = 0;
            eshkp.loan = 0;
            await pline('Your debt is paid off.');
        }
        if ((eshkp.credit | 0) === delta) {
            await pline(
                `You have ${!selling ? 're-' : ''}established ${delta} ${
                    currency(delta)
                } credit.`,
            );
        } else {
            await pline(
                `${delta} ${currency(delta)} added${!selling ? ' back' : ''} to your credit; total is now ${
                    eshkp.credit
                } ${currency(eshkp.credit)}.`,
            );
        }
    }
}

/**
 * C gs.sell_response / gs.sell_how / ga.auto_credit — BSS zero-init.
 * sell_response '\0' is falsy (query); JS uses null. Do not default 'a'
 * (that is only sellobj_state(SELL_NORMAL) after an accidental drop).
 */
function ensure_sell_state() {
    if (game.sell_response === undefined) game.sell_response = null;
    if (game.sell_how === undefined) game.sell_how = SELL_NORMAL;
    if (game.auto_credit === undefined) game.auto_credit = false;
}

/**
 * C ref: shk.c sellobj_state — deliberate drop vs auto-accept accidental.
 */
export function sellobj_state(deliberate) {
    ensure_sell_state();
    // C: '\0' when deliberate; 'a' when SELL_NORMAL (auto-accept)
    game.sell_response = deliberate !== SELL_NORMAL ? null : 'a';
    game.sell_how = deliberate;
    game.auto_credit = false;
}

/** C invent.c money_cnt over minvent nobj chain. */
function money_cnt_chain(head) {
    let sum = 0;
    for (let o = head; o; o = o.nobj) {
        if ((o.oclass | 0) === COIN_CLASS) sum += o.quan | 0;
    }
    return sum;
}

/** C steal.c findgold on mon minvent chain. */
function findgold_minvent(mon) {
    const goldOtyp = objectNames.indexOf('GOLD_PIECE');
    for (let o = mon?.minvent; o; o = o.nobj) {
        if ((o.oclass | 0) === COIN_CLASS || (o.otyp | 0) === goldOtyp) return o;
    }
    return null;
}

/**
 * C ref: shk.c money2u — transfer gold from mon minvent to hero invent.
 * Named omit: invent-full dropy (gold always merges via addinv).
 */
async function money2u(mon, amount) {
    const amt = amount | 0;
    if (amt <= 0 || !mon) return;
    let mongold = findgold_minvent(mon);
    if (!mongold || (mongold.quan | 0) < amt) return;
    if ((mongold.quan | 0) > amt) mongold = splitobj(mongold, amt);
    obj_extract_self(mongold);
    await addinv(mongold);
    if (game.flags) game.flags.botl = true;
}

/**
 * C ref: shk.c set_cost — what shk pays for [all of] an object.
 * Named omit: glass-gem pseudo-ID table polish.
 */
function set_cost(obj, shkp) {
    let unit_price = getprice(obj, true);
    let multiplier = 1;
    let divisor = 1;
    let tmp = get_pricing_units(obj) * unit_price;

    const u = game.u;
    if (u?.uarmh && (u.uarmh.otyp | 0) === DUNCE_CAP) {
        divisor *= 3;
    } else if ((Role_if(PM_TOURIST) && (u?.ulevel | 0) < Math.trunc(MAXULEV / 2))
        || (u?.uarmu && !u.uarm && !u.uarmc)) {
        divisor *= 3;
    } else {
        divisor *= 2;
    }

    const oc = objects()?.[obj?.otyp | 0];
    if (!obj?.dknown || !oc?.oc_name_known) {
        if ((obj?.oclass | 0) === GEM_CLASS) {
            const mat = oc?.oc_material | 0;
            if (mat === GEMSTONE || mat === GLASS) {
                const mid = (shkp?.m_id | 0) % 3;
                tmp = ((obj.otyp | 0) - (FIRST_REAL_GEM | 0)) % (6 - mid);
                tmp = (tmp + 3) * ((obj.quan | 0) || 1);
                divisor = 1;
            }
        } else if (tmp > 1 && !((shkp?.m_id | 0) % 4)) {
            multiplier *= 3;
            divisor *= 4;
        }
    }

    if (tmp >= 1) {
        tmp *= multiplier;
        if (divisor > 1) {
            tmp *= 10;
            tmp = Math.trunc(tmp / divisor);
            tmp += 5;
            tmp = Math.trunc(tmp / 10);
        }
        if (tmp < 1) tmp = 1;
    }
    return tmp;
}

/**
 * C ref: shk.c contained_cost — price of nested contents (usell / buy).
 */
function contained_cost(obj, shkp, price, usell, unpaid_only) {
    let p = price | 0;
    if (!obj) return p;
    let top = obj;
    while ((top.where | 0) === OBJ_CONTAINED && top.ocontainer) {
        top = top.ocontainer;
    }
    const on_floor = (top.where | 0) === OBJ_FLOOR || (top.where | 0) === OBJ_FREE;
    let x = game.u?.ux | 0;
    let y = game.u?.uy | 0;
    if ((top.where | 0) === OBJ_FLOOR && top.ox != null) {
        x = top.ox | 0;
        y = top.oy | 0;
    }
    const eshk = ESHK(shkp);
    const freespot = on_floor
        && x === (eshk?.shk?.x | 0) && y === (eshk?.shk?.y | 0);

    for (let otmp = obj.cobj; otmp; otmp = otmp.nobj) {
        if ((otmp.oclass | 0) === COIN_CLASS) continue;
        if (usell) {
            if (saleable(shkp, otmp) && !otmp.unpaid
                && (otmp.oclass | 0) !== BALL_CLASS
                && !((otmp.oclass | 0) === FOOD_CLASS && otmp.oeaten)
                && !(Is_candle(otmp)
                    && (otmp.age | 0) < 20 * (objects()?.[otmp.otyp | 0]?.oc_cost | 0))) {
                p += set_cost(otmp, shkp);
            }
        } else {
            const charge = on_floor
                ? (!otmp.no_charge && !freespot)
                : (otmp.unpaid || !unpaid_only);
            if (charge) {
                p += get_cost(otmp, shkp) * get_pricing_units(otmp);
            }
        }
        if (Has_contents(otmp)) {
            p = contained_cost(otmp, shkp, p, usell, unpaid_only);
        }
    }
    return p;
}

/**
 * C ref: shk.c dropped_container — mark nested non-sale contents no_charge.
 */
function dropped_container(obj, shkp, sale) {
    for (let otmp = obj?.cobj; otmp; otmp = otmp.nobj) {
        if ((otmp.oclass | 0) === COIN_CLASS) continue;
        if (!otmp.unpaid && !(sale && saleable(shkp, otmp))) {
            otmp.no_charge = 1;
        }
        if (Has_contents(otmp)) dropped_container(otmp, shkp, sale);
    }
}

/**
 * C ref: shk.c special_stock — candelabrum in candle shop refuse.
 * Named omit: Izchak invoked-path candle count; SetVoice; mbodypart.
 */
async function special_stock(obj, shkp, quietly) {
    if ((ESHK(shkp)?.shoptype | 0) !== CANDLESHOP) return false;
    if ((obj?.otyp | 0) !== CANDELABRUM_OF_INVOCATION) return false;
    if (!quietly) {
        if (!hero_deaf() && !muteshk(shkp)) {
            await verbalize("I won't stock that.  Take it out of here!");
        } else {
            await pline(`${Shknam(shkp)} shakes in refusal.`);
        }
    }
    return true;
}

/**
 * C ref: shk.c shk_names_obj `:3412–3445` — sold/bought announce.
 * observe_object, then makeknown when !oc_magic && saleable &&
 * (WEAPON/ARMOR/SCROLL/SPBOOK or MIRROR) — blank/mail and ordinary
 * gear in the shk's stock. was_unknown is !dknown at entry, or
 * !oc_name_known when that makeknown arm runs. Unknown: highc name
 * + "you "+fmt with it/them; else You(fmt). FIRST_OBJECT skip stays
 * on observe_object (Open invent.c row).
 */
async function shk_names_obj(shkp, obj, fmt, amt, arg) {
    let was_unknown = !obj.dknown;
    observe_object(obj);
    const oc = objects()?.[obj.otyp];
    if (oc && !oc.oc_magic && saleable(shkp, obj)
        && ((obj.oclass | 0) === WEAPON_CLASS
            || (obj.oclass | 0) === ARMOR_CLASS
            || (obj.oclass | 0) === SCROLL_CLASS
            || (obj.oclass | 0) === SPBOOK_CLASS
            || (obj.otyp | 0) === MIRROR)) {
        was_unknown = was_unknown || !oc.oc_name_known;
        makeknown(obj.otyp);
    }
    let obj_name = paydoname(obj);
    const argStr = arg ?? '';
    const fill = (nameOrThem) => {
        let si = 0;
        const sSlots = [nameOrThem, plur(amt), argStr];
        return fmt.replace(/%s|%ld/g, (tok) => {
            if (tok === '%ld') return String(amt);
            return sSlots[si++] ?? '';
        });
    };
    if (was_unknown) {
        obj_name = highc(obj_name) + obj_name.slice(1);
        const them = obj.quan > 1 ? 'them' : 'it';
        await pline(`${obj_name}; you ${fill(them)}`);
    } else {
        await pline(`You ${fill(obj_name)}`);
    }
}

/**
 * C ref: shk.c sellobj — drop/throw land sale into shop.
 * Branch envelope: unpaid sub_one; angry scum; gold donate; credit /
 * cash offer query; no-interest / special_stock / robbed restock.
 * D-1019: BSS sell_response is '\0' (query), not 'a'; robbed uses C
 * `-= (offer < 0)` then clear remaining; nyaq result is not stored.
 * Named omit: SetVoice; safe_qbuf fancy container prompt wording.
 */
export async function sellobj(obj, x, y) {
    if (!obj) return;
    ensure_sell_state();
    const ushops = game.u?.ushops || '';
    if (!ushops) return;
    const rooms = in_rooms(x, y, SHOPBASE) || '';
    const shkp = shop_keeper(rooms.charCodeAt(0) || 0);
    if (!shkp || !inhishop(shkp)) return;
    if (!costly_spot(x, y)) return;

    const container = Has_contents(obj);
    const isgold = (obj.oclass | 0) === COIN_CLASS;
    let ltmp = 0;
    let cltmp = 0;
    let gltmp = 0;
    let cgold = false;

    if (obj.unpaid && !container && !isgold) {
        sub_one_frombill(obj, shkp);
        return;
    }
    if (container) {
        cltmp = contained_cost(obj, shkp, cltmp, true, false);
        gltmp += contained_gold(obj, true);
        cgold = gltmp > 0;
    }

    const saleitem = saleable(shkp, obj);
    if (!isgold && !obj.unpaid && saleitem) ltmp = set_cost(obj, shkp);
    let offer = ltmp + cltmp;

    rouse_shk(shkp, true);
    const eshkp = ESHK(shkp);
    if (!eshkp) return;

    if (ANGRY(shkp)) {
        if (!hero_deaf() && !muteshk(shkp)) {
            await verbalize('Thank you, scum!');
        } else {
            await pline(`${Shknam(shkp)} smirks with satisfaction.`);
        }
        subfrombill(obj, shkp);
        return;
    }

    if (!(isgold || cgold)
        && ((offer + gltmp) === 0 || game.sell_how === SELL_DONTSELL)) {
        const unpaid = is_unpaid(obj);
        if (container) {
            dropped_container(obj, shkp, false);
            if (!obj.unpaid) obj.no_charge = 1;
            if (unpaid) subfrombill(obj, shkp);
        } else {
            obj.no_charge = 1;
        }
        if (!unpaid && game.sell_how !== SELL_DONTSELL
            && !(await special_stock(obj, shkp, false))) {
            await pline(`${Shknam(shkp)} seems uninterested.`);
        }
        return;
    }

    if (eshkp.robbed) {
        if (isgold) offer = obj.quan | 0;
        else if (cgold) offer += cgold; // C boolean 0/1, not gltmp
        // C: if ((eshkp->robbed -= offer < 0L)) eshkp->robbed = 0L;
        // `<` binds tighter than `-=`: subtract (offer<0), then zero
        // remaining robbed. Offer is not deducted (D-1019).
        eshkp.robbed = (eshkp.robbed | 0) - (((offer | 0) < 0) | 0);
        if (eshkp.robbed) eshkp.robbed = 0;
        if (offer && !hero_deaf() && !muteshk(shkp)) {
            await verbalize(
                'Thank you for your contribution to restock this recently plundered shop.',
            );
        }
        subfrombill(obj, shkp);
        return;
    }

    if (isgold || cgold) {
        if (!cgold) gltmp = obj.quan | 0;
        await donate_gold(gltmp, shkp, true);
        if (!offer || game.sell_how === SELL_DONTSELL) {
            if (!isgold) {
                if (container) dropped_container(obj, shkp, false);
                if (!obj.unpaid) obj.no_charge = 1;
                subfrombill(obj, shkp);
            }
            return;
        }
    }

    if ((!saleitem && !(container && cltmp > 0))
        || (eshkp.billct | 0) === BILLSZ
        || (obj.oclass | 0) === BALL_CLASS
        || (obj.oclass | 0) === CHAIN_CLASS
        || offer === 0
        || ((obj.oclass | 0) === FOOD_CLASS && obj.oeaten)
        || (Is_candle(obj)
            && (obj.age | 0) < 20 * (objects()?.[obj.otyp | 0]?.oc_cost | 0))) {
        await pline(
            `${Shknam(shkp)} seems uninterested${cgold ? ' in the rest' : ''}.`,
        );
        if (container) dropped_container(obj, shkp, false);
        obj.no_charge = 1;
        return;
    }

    const shkmoney = money_cnt_chain(shkp.minvent);
    if (!shkmoney) {
        let c;
        const tmpcr = Math.trunc((offer * 9) / 10) + (offer <= 1 ? 1 : 0);
        if (game.sell_how === SELL_NORMAL || game.auto_credit) {
            c = game.sell_response = 'y';
        } else if (game.sell_response !== 'n') {
            await pline(`${Shknam(shkp)} cannot pay you at present.`);
            const qbuf = `Will you accept ${tmpcr} ${currency(tmpcr)} in credit for ${
                (obj.quan | 0) === 1 ? 'that' : 'those'
            }?`;
            record_price_quote(obj.otyp, Math.trunc(tmpcr / ((obj.quan | 0) || 1)), false);
            // C: ynaq → yn_function(..., ynaqchars, 'y')
            c = await yn_function(qbuf, 'ynaq', 'y');
            if (c === 'a') {
                c = 'y';
                game.auto_credit = true;
            }
        } else {
            c = 'n';
        }
        if (c === 'y') {
            await shk_names_obj(
                shkp, obj,
                game.sell_how !== SELL_NORMAL
                    ? 'traded %s for %ld zorkmid%s in %scredit.'
                    : 'relinquish %s and acquire %ld zorkmid%s in %scredit.',
                tmpcr,
                (eshkp.credit | 0) > 0 ? 'additional ' : '',
            );
            eshkp.credit = (eshkp.credit | 0) + tmpcr;
            if (container) dropped_container(obj, shkp, true);
            subfrombill(obj, shkp);
        } else {
            if (c === 'q') game.sell_response = 'n';
            if (container) dropped_container(obj, shkp, false);
            if (!obj.unpaid) obj.no_charge = 1;
            subfrombill(obj, shkp);
        }
    } else {
        let short_funds = offer > shkmoney;
        if (short_funds) offer = shkmoney;
        let only_partially_your_contents = false;
        let yourc = 0;
        let qbuf = '';
        if (!game.sell_response) {
            if (container) {
                const shksc = count_contents(obj, true, true, false, true);
                yourc = count_contents(obj, true, true, true, true) - shksc;
                only_partially_your_contents = !!(shksc && yourc);
            }
            const one = !ltmp ? (yourc === 1) : ((obj.quan | 0) === 1 && !cltmp);
            const contentsBit = (cltmp && ltmp)
                ? (only_partially_your_contents
                    ? ((yourc === 1) ? ' and item inside' : ' and items inside')
                    : ' and its contents')
                : '';
            const inPrefix = (cltmp && !ltmp)
                ? ((yourc === 1) ? 'your item in ' : 'your items in ')
                : '';
            qbuf = `${Shknam(shkp)} offers${short_funds ? ' only' : ''} ${offer} gold piece${
                offer === 1 ? '' : 's'
            } for ${inPrefix}${obj.unpaid ? 'the' : 'your'} ${
                xname(obj)
            }${contentsBit}.  Sell ${one ? 'it' : 'them'}?`;
            record_price_quote(
                obj.otyp, Math.trunc(offer / ((obj.quan | 0) || 1)), false,
            );
        }
        // C: switch (gs.sell_response ? gs.sell_response : nyaq(qbuf))
        // nyaq default 'n'; do not store y/n into sell_response (only
        // case 'a'→'y' and 'q'→'n' persist).
        const sell_c = game.sell_response
            ? game.sell_response
            : await yn_function(qbuf, 'ynaq', 'n');
        switch (sell_c) {
        case 'q':
            game.sell_response = 'n';
            // fallthrough
        case 'n':
            if (container) dropped_container(obj, shkp, false);
            if (!obj.unpaid) obj.no_charge = 1;
            subfrombill(obj, shkp);
            break;
        case 'a':
            game.sell_response = 'y';
            // fallthrough
        case 'y':
            if (container) dropped_container(obj, shkp, true);
            if (!obj.unpaid && !saleitem) obj.no_charge = 1;
            subfrombill(obj, shkp);
            await pay(-offer, shkp);
            await shk_names_obj(
                shkp, obj,
                game.sell_how !== SELL_NORMAL
                    ? ((!ltmp && cltmp && only_partially_your_contents)
                        ? 'sold some items inside %s for %ld gold piece%s.%s'
                        : 'sold %s for %ld gold piece%s.%s')
                    : 'relinquish %s and receive %ld gold piece%s in compensation.%s',
                offer, '',
            );
            break;
        default:
            break;
        }
    }
}

/**
 * C ref: dothrow.c check_shop_obj — thrown out/into shop bill.
 */
export async function check_shop_obj(obj, x, y, broken) {
    if (!obj) return;
    const ushops = game.u?.ushops || '';
    const shkp = shop_keeper(ushops.charCodeAt(0) || 0);
    if (!shkp) return;

    const costly_xy = costly_spot(x, y);
    const oshops = in_rooms(x, y, SHOPBASE) || '';
    if (broken || !costly_xy
        || (oshops.charCodeAt(0) || 0) !== (ushops.charCodeAt(0) || 0)) {
        if (is_unpaid(obj)) {
            await stolen_value(obj, game.u?.ux | 0, game.u?.uy | 0,
                !!shkp.mpeaceful, false);
        }
        if (broken) obj.no_charge = 1;
    } else if (costly_xy) {
        const ushops0 = game.u?.ushops0 || '';
        const oCh = oshops.charCodeAt(0) || 0;
        if (oCh === (ushops.charCodeAt(0) || 0)
            || oCh === (ushops0.charCodeAt(0) || 0)) {
            if (is_unpaid(obj)) {
                const gtg = Has_contents(obj) ? contained_gold(obj, true) : 0;
                subfrombill(obj, shkp);
                if (gtg > 0) await donate_gold(gtg, shkp, true);
            } else if (x !== (shkp.mx | 0) || y !== (shkp.my | 0)) {
                await sellobj(obj, x, y);
            }
        }
    }
}

/**
 * C ref: shk.c picked_container — clear no_charge on nested non-gold.
 */
export function picked_container(obj) {
    for (let otmp = obj?.cobj; otmp; otmp = otmp.nobj) {
        if ((otmp.oclass | 0) === COIN_CLASS) continue;
        if (otmp.no_charge) otmp.no_charge = 0;
        if (Has_contents(otmp)) picked_container(otmp);
    }
}

/**
 * C ref: shk.c stolen_container — price of nested unpaid/bill contents.
 */
function stolen_container(obj, shkp, price, ininv) {
    let p = price | 0;
    for (let otmp = obj?.cobj; otmp; otmp = otmp.nobj) {
        if ((otmp.oclass | 0) === COIN_CLASS) continue;
        let billamt = 0;
        const holder = { shkp };
        if (!billable(holder, otmp, ESHK(shkp)?.shoproom, true)) {
            const bp = onbill(otmp, holder.shkp || shkp, false);
            if (!bp) continue;
            billamt = (bp.bquan | 0) * (bp.price | 0);
            sub_one_frombill(otmp, holder.shkp || shkp);
        }
        if (billamt) {
            p += billamt;
        } else if (ininv ? otmp.unpaid : !otmp.no_charge) {
            p += get_pricing_units(otmp) * get_cost(otmp, shkp);
        }
        if (Has_contents(otmp)) {
            p = stolen_container(otmp, shkp, p, ininv);
        }
    }
    return p;
}

/**
 * C ref: shk.c stolen_value — charge debit/robbed for removed shop goods.
 * Branch envelope: find_objowner/billable/onbill; container + gold; peaceful
 * credit+owe / angry thief + hot_pursuit + angry_guards.
 * Named omissions: check_credit pline_The reused via local msg path only;
 * SetVoice; Hallu currency.
 * @returns {Promise<number>} charged value
 */
export async function stolen_value(obj, x, y, peaceful, silent) {
    if (!obj) return 0;
    let value = 0;
    let gvalue = 0;
    let billamt = 0;
    let roomno = 0;
    let bp = null;
    let shkp = find_objowner(obj, x, y);
    if (shkp) {
        roomno = ESHK(shkp)?.shoproom | 0;
    } else {
        const rooms = in_rooms(x, y, SHOPBASE) || '';
        roomno = rooms ? rooms.charCodeAt(0) : 0;
    }

    const was_unpaid = !!obj.unpaid;
    let c_count = 0;
    let u_count = 0;
    if (Has_contents(obj)) {
        c_count = count_contents(obj, true, false, true, false);
        u_count = count_contents(obj, true, false, false, false);
    }

    shkp = null;
    const holder = { shkp: null };
    if (!billable(holder, obj, roomno, true)) {
        shkp = holder.shkp;
        bp = onbill(obj, shkp, false);
        if (bp) {
            billamt = (bp.bquan | 0) * (bp.price | 0);
            sub_one_frombill(obj, shkp);
        }
        if (!bp && !u_count) return 0;
    } else {
        shkp = holder.shkp;
    }
    if (!shkp) return 0;

    if ((obj.oclass | 0) === COIN_CLASS) {
        gvalue += obj.quan | 0;
    } else {
        if (billamt) value += billamt;
        else if (!obj.no_charge) {
            value += get_pricing_units(obj) * get_cost(obj, shkp);
        }
        if (Has_contents(obj)) {
            const ininv = obj.where === OBJ_INVENT || obj.where === OBJ_FREE;
            value += stolen_container(obj, shkp, 0, ininv);
            if (!ininv) gvalue += contained_gold(obj, true);
        }
    }

    if (gvalue + value === 0) return 0;
    value += gvalue;

    const eshkp = ESHK(shkp);
    if (!eshkp) return 0;

    if (peaceful) {
        const credit_use = !!(eshkp.credit | 0);
        // C check_credit with pline_The (pay path keeps silent check_credit)
        {
            let credit = eshkp.credit | 0;
            if (credit) {
                if (credit >= value) {
                    await pline('The price is deducted from your credit.');
                    eshkp.credit = credit - value;
                    value = 0;
                } else {
                    await pline('The price is partially covered by your credit.');
                    eshkp.credit = 0;
                    value -= credit;
                }
            }
        }
        if (ANGRY(shkp)) eshkp.robbed = (eshkp.robbed | 0) + value;
        else eshkp.debit = (eshkp.debit | 0) + value;

        if (!silent) {
            let still = '';
            if (credit_use) {
                if (eshkp.credit | 0) {
                    await pline(
                        `You have ${eshkp.credit} ${currency(eshkp.credit)} credit remaining.`,
                    );
                    return value;
                }
                if (!value) {
                    await pline('You have no credit remaining.');
                    return 0;
                }
                still = 'still ';
            }
            let buf = `${still}owe ${shkname(shkp)} ${value} ${currency(value)}`;
            if (u_count) {
                buf += ` for ${was_unpaid ? 'it and ' : ''}${
                    c_count > u_count ? 'some of ' : ''
                }its contents`;
            } else if ((obj.oclass | 0) !== COIN_CLASS) {
                buf += ` for ${(obj.quan | 0) > 1 ? 'them' : 'it'}`;
            }
            await pline(`You ${buf}!`);
        }
    } else {
        eshkp.robbed = (eshkp.robbed | 0) + value;
        if (!silent) {
            const pln = String(game.plname || '');
            if (canseemon(shkp)) {
                await Norep(
                    `${Shknam(shkp)} booms: "${pln}, you are a thief!"`,
                );
            } else if (!hero_deaf()) {
                await Norep('You hear a scream, "Thief!"');
            }
        }
        hot_pursuit(shkp);
        const { angry_guards } = await import('./mon.js');
        await angry_guards(false);
    }
    return value;
}

/**
 * C ref: shk.c record_price_quote — remember buy/sell quote range for otyp.
 */
export function record_price_quote(otyp, price, buyprice) {
    const oc = objects()?.[otyp | 0];
    if (!oc) return;
    const p = price >>> 0; // unsigned long
    if (buyprice) {
        if (p > (oc.oc_buy_maxseen >>> 0)) oc.oc_buy_maxseen = p;
        if (p < (oc.oc_buy_minseen >>> 0)) oc.oc_buy_minseen = p;
    } else {
        if (p > (oc.oc_sell_maxseen >>> 0)) oc.oc_sell_maxseen = p;
        if (p < (oc.oc_sell_minseen >>> 0)) oc.oc_sell_minseen = p;
    }
}

/**
 * C ref: shk.c append_price_quote — " {buy N}" / " {sell N}" on discoveries.
 * Returns buf (possibly extended). BUFSZ truncate deferred (JS strings).
 */
export function append_price_quote(buf, otyp) {
    const oc = objects()?.[otyp | 0];
    if (!oc) return buf;
    const buyMin = oc.oc_buy_minseen >>> 0;
    const buyMax = oc.oc_buy_maxseen >>> 0;
    const sellMin = oc.oc_sell_minseen >>> 0;
    const sellMax = oc.oc_sell_maxseen >>> 0;
    // C: no quotes recorded yet when minseen > maxseen for both
    if (sellMin > sellMax && buyMin > buyMax) return buf;

    let inner = '{';
    let sep = '';
    if (buyMin < buyMax) {
        inner += `buy ${buyMin}-${buyMax}`;
        sep = ' ';
    } else if (buyMin === buyMax) {
        inner += `buy ${buyMin}`;
        sep = ' ';
    }
    if (sellMin < sellMax) {
        inner += `${sep}sell ${sellMin}-${sellMax}`;
    } else if (sellMin === sellMax) {
        inner += `${sep}sell ${sellMin}`;
    }
    inner += '}';
    return `${buf} ${inner}`;
}

/**
 * C ref: objnam.c doname_base unpaid arm (is_unpaid → unpaid_cost).
 * Wired into plain doname via set_doname_shop_suffix(…, with_price ignored).
 * Named omissions: contained_cost contents label path
 * still uses unpaid_cost amt without nested walk.
 */
function append_doname_unpaid_suffix(obj, bp, _with_price) {
    if (game.iflags?.suppress_price || game.program_state?.restoring) {
        return bp;
    }
    if (!is_unpaid(obj)) return bp;
    const quotedprice = unpaid_cost(obj, COST_CONTENTS);
    const pricebuf = `${quotedprice} ${currency(quotedprice)}`;
    const label = obj.unpaid ? 'unpaid' : 'contents';
    // C: record_price_quote(otyp, quotedprice / quan, TRUE)
    const quan = (obj.quan | 0) || 1;
    record_price_quote(obj.otyp, Math.trunc(quotedprice / quan), true);
    return `${bp} (${label}, ${pricebuf})`;
}

/**
 * C ref: shk.c get_cost_of_shop_item — price of floor/shop goods for doname.
 * Named omissions: contained_cost for Has_contents; globby weight units.
 * @returns {{ cost: number, nochrg: number }}
 *   nochrg: 1 no charge, 0 shop-owned, -1 not in shop
 */
export function get_cost_of_shop_item(obj) {
    let nochrg = -1;
    let cost = 0;
    const u = game.u;
    const ushops = u?.ushops || '';
    if (!ushops || !obj
        || (obj.oclass | 0) === COIN_CLASS
        || obj === u?.uball || obj === u?.uchain) {
        return { cost, nochrg };
    }
    const loc = get_obj_location(obj, 0x1); // CONTAINED_TOO
    if (!loc) return { cost, nochrg };
    const { x, y } = loc;
    const rooms = in_rooms(x, y, SHOPBASE);
    if (!rooms || rooms.charCodeAt(0) !== ushops.charCodeAt(0)) {
        return { cost, nochrg };
    }
    const shkp = shop_keeper(inside_shop(x, y));
    if (!shkp || !inhishop(shkp)) return { cost, nochrg };

    let top = obj;
    while (top?.where === OBJ_CONTAINED) top = top.ocontainer;
    const eshkp = ESHK(shkp);
    const freespot = top?.where === OBJ_FLOOR
        && (x | 0) === (eshkp?.shk?.x | 0)
        && (y | 0) === (eshkp?.shk?.y | 0);
    // no_charge only for floor items; freespot implicitly no charge
    nochrg = (top?.where === OBJ_FLOOR && (obj.no_charge || freespot)) ? 1 : 0;

    const carriedTop = top?.where === OBJ_INVENT;
    if (carriedTop ? !!obj.unpaid : !nochrg) {
        cost = get_pricing_units(obj) * get_cost(obj, shkp);
    }
    // Has_contents && !freespot → contained_cost deferred
    return { cost, nochrg };
}

/**
 * C ref: objnam.c doname_with_price → doname_base(DONAME_WITH_PRICE).
 * Plain doname already applies unpaid (C first else-if); this only adds
 * for-sale / no-charge when !is_unpaid.
 * Named omissions: contained_cost.
 * C wizweight after shop suffix uses with_price to rewrite a trailing
 * ')' (`:1697–1702`). JS splits unpaid (doname) vs for-sale (here);
 * suppress aum during doname then append with with_price.
 */
export function doname_with_price(obj) {
    if (!game.iflags) game.iflags = {};
    const save_wizweight = game.iflags.wizweight;
    game.iflags.wizweight = false;
    let bp = doname(obj);
    game.iflags.wizweight = save_wizweight;
    if (game.iflags.suppress_price || game.program_state?.restoring) {
        return append_wizweight_suffix(obj, bp, true);
    }
    // C: else if (is_unpaid) already handled inside doname; wizweight
    // still runs with with_price so unpaid `(…)` becomes `, N aum)`.
    if (is_unpaid(obj)) return append_wizweight_suffix(obj, bp, true);
    const { cost: price, nochrg } = get_cost_of_shop_item(obj);
    if (price > 0) {
        const pricebuf = `${price} ${currency(price)}`;
        bp += ` (${nochrg ? 'contents' : 'for sale'}, ${pricebuf})`;
        // C: record_price_quote(otyp, price / quan, TRUE)
        const quan = (obj.quan | 0) || 1;
        record_price_quote(obj.otyp, Math.trunc(price / quan), true);
    } else if (nochrg > 0) {
        bp += ' (no charge)';
    } else if (game.iflags?.pricequotes
        && !game.objects?.[obj.otyp | 0]?.oc_name_known) {
        // C: append_price_quote when pricequotes && !oc_name_known
        bp = append_price_quote(bp, obj.otyp);
    }
    return append_wizweight_suffix(obj, bp, true);
}

// Wire C doname_base unpaid arm into objnam.doname.
set_doname_shop_suffix(append_doname_unpaid_suffix);

/**
 * C ref: shk.c getprice — base oc_cost + class tweaks.
 * Named omissions: corpsenm_price_adj; full candle Is_candle.
 */
function getprice(obj, shk_buying) {
    const oc = objects()?.[obj?.otyp | 0];
    let tmp = (oc?.oc_cost | 0);
    if (obj?.oartifact) {
        tmp = arti_cost(obj);
        if (shk_buying) tmp = Math.trunc(tmp / 4);
    }
    switch (obj?.oclass | 0) {
    case FOOD_CLASS: {
        const u = game.u;
        if ((u?.uhs | 0) >= HUNGRY && !shk_buying) tmp *= (u.uhs | 0);
        if (obj.oeaten) tmp = 0;
        break;
    }
    case WAND_CLASS:
        if ((obj.spe | 0) === -1) tmp = 0;
        break;
    case POTION_CLASS:
        if ((obj.otyp | 0) === (POT_WATER | 0) && !obj.blessed && !obj.cursed) {
            tmp = 0;
        }
        break;
    case ARMOR_CLASS:
    case WEAPON_CLASS:
        if ((obj.spe | 0) > 0) tmp += 10 * (obj.spe | 0);
        break;
    case TOOL_CLASS:
        // Is_candle age < 20*oc_cost → /2 deferred (needs candle predicate)
        break;
    default:
        break;
    }
    return tmp;
}

/**
 * C ref: shk.c get_cost — charge for one unit.
 * Named omissions: bill-price reuse FIXME.
 */
function get_cost(obj, shkp) {
    let tmp = getprice(obj, false);
    let multiplier = 1;
    let divisor = 1;
    if (!tmp) tmp = 5;

    const oc = objects()?.[obj?.otyp | 0];
    if (!obj?.dknown || !oc?.oc_name_known) {
        if ((obj?.oclass | 0) === GEM_CLASS && (oc?.oc_material | 0) === GLASS) {
            /* C shk.c get_cost :2897–2941 — ubirthday-stable color table */
            const otyp = obj.otyp | 0;
            const pseudorand =
                ((game.ubirthday | 0) % otyp) >= Math.trunc(otyp / 2);
            let i;
            switch (otyp - FIRST_GLASS_GEM) {
            case 0: /* white */
                i = pseudorand ? DIAMOND : OPAL;
                break;
            case 1: /* blue */
                i = pseudorand ? SAPPHIRE : AQUAMARINE;
                break;
            case 2: /* red */
                i = pseudorand ? RUBY : JASPER;
                break;
            case 3: /* yellowish brown */
                i = pseudorand ? AMBER : TOPAZ;
                break;
            case 4: /* orange */
                i = pseudorand ? JACINTH : AGATE;
                break;
            case 5: /* yellow */
                i = pseudorand ? CITRINE : CHRYSOBERYL;
                break;
            case 6: /* black */
                i = pseudorand ? BLACK_OPAL : JET;
                break;
            case 7: /* green */
                i = pseudorand ? EMERALD : JADE;
                break;
            case 8: /* violet */
                i = pseudorand ? AMETHYST : FLUORITE;
                break;
            default:
                impossible(`bad glass gem ${otyp}?`);
                i = STRANGE_OBJECT;
                break;
            }
            tmp = objects()?.[i]?.oc_cost | 0;
        } else if (oid_price_adjustment(obj, obj?.o_id | 0) > 0) {
            multiplier *= 4;
            divisor *= 3;
        }
    }

    const u = game.u;
    if (u?.uarmh && (u.uarmh.otyp | 0) === DUNCE_CAP) {
        multiplier *= 4;
        divisor *= 3;
    } else if ((Role_if(PM_TOURIST) && (u?.ulevel | 0) < Math.trunc(MAXULEV / 2))
        || (u?.uarmu && !u.uarm && !u.uarmc)) {
        multiplier *= 4;
        divisor *= 3;
    }

    const cha = acurr(A_CHA);
    if (cha > 18) divisor *= 2;
    else if (cha === 18) {
        multiplier *= 2;
        divisor *= 3;
    } else if (cha >= 16) {
        multiplier *= 3;
        divisor *= 4;
    } else if (cha <= 5) multiplier *= 2;
    else if (cha <= 7) {
        multiplier *= 3;
        divisor *= 2;
    } else if (cha <= 10) {
        multiplier *= 4;
        divisor *= 3;
    }

    tmp *= multiplier;
    if (divisor > 1) {
        tmp *= 10;
        tmp = Math.trunc(tmp / divisor);
        tmp += 5;
        tmp = Math.trunc(tmp / 10);
    }
    if (tmp <= 0) tmp = 1;
    if (obj?.oartifact) tmp *= 4;
    if (shkp && ESHK(shkp)?.surcharge) {
        tmp += Math.trunc((tmp + 2) / 3);
    }
    return tmp;
}

/**
 * C ref: shk.c cost_per_charge — exhaustive unpaid use costs more than
 * buying outright. MAGIC_LAMP light uses OIL_LAMP oc_cost; djinni
 * altusage +1/3. Named omit: none for the billed otyps C lists.
 */
function cost_per_charge(shkp, otmp, altusage) {
    if (!shkp || !inhishop(shkp) || !otmp) return 0;
    let tmp = get_cost(otmp, shkp) | 0;
    const otyp = otmp.otyp | 0;
    if (otyp === MAGIC_LAMP) {
        if (!altusage) tmp = objects()?.[OIL_LAMP]?.oc_cost | 0;
        else tmp += Math.trunc(tmp / 3);
    } else if (otyp === MAGIC_MARKER) {
        tmp = Math.trunc(tmp / 2);
    } else if (otyp === BAG_OF_TRICKS || otyp === HORN_OF_PLENTY) {
        if (!altusage) tmp = Math.trunc(tmp / 5);
    } else if (otyp === CRYSTAL_BALL
        || otyp === OIL_LAMP
        || otyp === BRASS_LANTERN
        || (otyp >= MAGIC_FLUTE && otyp <= DRUM_OF_EARTHQUAKE)
        || (otmp.oclass | 0) === WAND_CLASS) {
        if ((otmp.spe | 0) > 1) tmp = Math.trunc(tmp / 4);
    } else if ((otmp.oclass | 0) === SPBOOK_CLASS) {
        tmp -= Math.trunc(tmp / 5);
    } else if (otyp === CAN_OF_GREASE || otyp === TINNING_KIT
        || otyp === EXPENSIVE_CAMERA) {
        tmp = Math.trunc(tmp / 10);
    } else if (otyp === POT_OIL) {
        tmp = Math.trunc(tmp / 5);
    }
    return tmp;
}

/**
 * C ref: shk.c check_unpaid_usage — partial-use shop debit + verbalize.
 * bill_dummy_object is for fully used items. SetVoice deferred.
 * @param {object} otmp
 * @param {boolean} altusage
 */
export async function check_unpaid_usage(otmp, altusage) {
    if (!otmp) return;
    const ushops = game.u?.ushops || '';
    const oc = objects()?.[otmp.otyp | 0];
    const charged = !!(oc?.oc_charged);
    if (!otmp.unpaid || !ushops.charCodeAt(0)
        || ((otmp.spe | 0) <= 0 && charged)) {
        return;
    }
    const shkp = shop_keeper(ushops);
    if (!shkp || !inhishop(shkp)) return;
    const tmp = cost_per_charge(shkp, otmp, altusage) | 0;
    if (!tmp) return;

    let arg1 = '';
    let arg2 = '';
    let msg;
    if ((otmp.oclass | 0) === SPBOOK_CLASS) {
        const buf = `This is no free library, ${cad(false)}!  `;
        arg1 = rn2(2) ? buf : '';
        arg2 = (ESHK(shkp)?.debit | 0) > 0 ? ' an additional' : '';
        msg = `${arg1}You owe${arg2} ${tmp} ${currency(tmp)}.`;
    } else if ((otmp.otyp | 0) === POT_OIL) {
        msg = `That will cost you ${tmp} ${currency(tmp)} (Yendorian Fuel Tax).`;
    } else if (altusage && ((otmp.otyp | 0) === BAG_OF_TRICKS
        || (otmp.otyp | 0) === HORN_OF_PLENTY)) {
        if (!rn2(3)) arg1 = 'Whoa!  ';
        if (!rn2(3)) arg1 = 'Watch it!  ';
        msg = `${arg1}Emptying that will cost you ${tmp} ${currency(tmp)}.`;
    } else {
        if (!rn2(3)) arg1 = 'Hey!  ';
        if (!rn2(3)) arg2 = 'Ahem.  ';
        msg = `${arg1}${arg2}Usage fee, ${tmp} ${currency(tmp)}.`;
    }

    if (!hero_deaf() && !muteshk(shkp)) {
        // C SetVoice(shkp, 0, 80, 0) deferred
        await verbalize(msg);
        exercise(A_WIS, true);
    }
    const eshk = ESHK(shkp);
    if (eshk) eshk.debit = (eshk.debit | 0) + tmp;
}

/** C ref: shk.c check_unpaid — normal-use wrapper (altusage FALSE). */
export async function check_unpaid(otmp) {
    await check_unpaid_usage(otmp, false);
}

/** C shk.c onbill — find bill entry by o_id. */
function onbill(obj, shkp, _silent) {
    const eshkp = ESHK(shkp);
    if (!eshkp || !obj) return null;
    const bill = eshkp.bill_p || eshkp.bill;
    if (!bill) return null;
    const id = obj.o_id | 0;
    const n = eshkp.billct | 0;
    for (let i = 0; i < n; i++) {
        if ((bill[i]?.bo_id | 0) === id) return bill[i];
    }
    return null;
}

/**
 * C ref: shk.c clear_unpaid_obj `:308–315` — recurse contents; unpaid=0
 * when on this shk's bill. silent TRUE (no impossible).
 */
function clear_unpaid_obj(shkp, otmp) {
    if (!otmp) return;
    if (Has_contents(otmp)) clear_unpaid(shkp, otmp.cobj);
    if (onbill(otmp, shkp, true)) otmp.unpaid = 0;
}

/**
 * C ref: shk.c clear_unpaid `:318–325` — walk nobj (or invent Array).
 */
function clear_unpaid(shkp, list) {
    if (!list) return;
    if (Array.isArray(list)) {
        for (const head of list) clear_unpaid(shkp, head);
        return;
    }
    let otmp = list;
    while (otmp) {
        clear_unpaid_obj(shkp, otmp);
        otmp = otmp.nobj;
    }
}

/**
 * C ref: shk.c billable — shk thinks item is hers.
 */
export function billable(shkHolder, obj, roomno, reset_nocharge) {
    let shkp = shkHolder.shkp;
    if (!shkp) {
        if (!roomno) return false;
        shkp = shop_keeper(roomno);
        if (!shkp || !inhishop(shkp)) return false;
        shkHolder.shkp = shkp;
    }
    if (onbill(obj, shkp, false)
        || ((obj?.oclass | 0) === FOOD_CLASS && obj?.oeaten)) {
        return false;
    }
    if (obj?.no_charge) {
        if (!Has_contents(obj)
            || (contained_gold(obj, true) === 0
                && contained_cost(obj, shkp, 0, false, !reset_nocharge) === 0)) {
            shkp = null;
        }
        if (reset_nocharge && !shkp && (obj.oclass | 0) !== COIN_CLASS) {
            obj.no_charge = 0;
            if (Has_contents(obj)) picked_container(obj);
        }
    }
    return !!shkp;
}

/**
 * C ref: shk.c add_to_billobjs `:3365–3383` — prepend gb.billobjs,
 * OBJ_ONBILL. Dummy used-up items live here so bp_to_obj(useup) finds them.
 */
function add_to_billobjs(obj) {
    if (!obj) return;
    if ((obj.where | 0) !== OBJ_FREE) {
        throw new Error('add_to_billobjs: obj not free');
    }
    if (obj.timed) obj_stop_timers(obj);
    obj.nobj = game.billobjs || null;
    game.billobjs = obj;
    obj.where = OBJ_ONBILL;
    obj.in_use = 0;
    obj.bypass = 0;
}

/**
 * C ref: eat.c food_disappears `:395–403` — clear victual if this food
 * was being eaten, then stop timers. First JS body lives here as an
 * obfree callee (eat.js export still named).
 */
function food_disappears(obj) {
    const vic = game.context?.victual;
    if (vic && obj === vic.piece) {
        game.context.victual = {};
    }
    if (obj.timed) obj_stop_timers(obj);
}

/**
 * C ref: spell.c book_disappears `:644–652` — drop spbook.book / o_id
 * when the studied book is destroyed. First JS body lives here as an
 * obfree callee (spell.js export still named).
 */
function book_disappears(obj) {
    const sp = game.context?.spbook;
    if (sp && obj === sp.book) {
        sp.book = null;
        sp.o_id = 0;
    }
}

/**
 * C ref: lock.c maybe_reset_pick `:268–285` — clear xlock when this
 * container is gx.xlock.box, or when container is Null and the box is
 * not carried (level change). Callee reset_pick is live in lock.js.
 */
function maybe_reset_pick(container) {
    const box = game.xlock?.box || null;
    if (container ? container === box
        : (!box || !(game.invent || []).includes(box))) {
        reset_pick();
    }
}

/**
 * C ref: shk.c delete_contents `:1174–1183` — extract + obfree each
 * cobj (recursive via obfree Has_contents). No obj_resists.
 */
export function delete_contents(obj) {
    if (!obj) return;
    while (obj.cobj) {
        const curr = obj.cobj;
        obj_extract_self(curr);
        obfree(curr, null);
    }
}

/**
 * C ref: shk.c obfree `:1186–1275` — release an already-extracted
 * object. Leash / food / book / contents / pick / boulder; unpaid bill
 * useup→billobjs or merge bquan; else oid_price_adjustment may donate
 * o_id to merge; worn sanity; mkobj.c dealloc_obj (D-1743).
 * Callers include invent.c delobj_core (D-1756) and zap.c
 * poly_obj (D-1770). Named: trap.js delete_contents_chest,
 * mklev.js create_object_delete_contents.
 */
export function obfree(obj, merge) {
    if (!obj) return;

    if ((obj.otyp | 0) === LEASH && (obj.leashmon | 0)) {
        o_unleash(obj);
    }
    if ((obj.oclass | 0) === FOOD_CLASS) food_disappears(obj);
    if ((obj.oclass | 0) === SPBOOK_CLASS) book_disappears(obj);
    if (Has_contents(obj)) delete_contents(obj);
    if (Is_container(obj)) maybe_reset_pick(obj);
    if ((obj.otyp | 0) === BOULDER) obj.next_boulder = 0;

    let shkp = null;
    if (obj.unpaid) {
        let idx = 0;
        for (;;) {
            const nxt = next_shkp(idx, true);
            if (!nxt.shkp) break;
            if (onbill(obj, nxt.shkp, true)) {
                shkp = nxt.shkp;
                break;
            }
            idx = nxt.nextIdx;
        }
    }
    if (!shkp) shkp = shop_keeper(game.u?.ushops);

    const bp = onbill(obj, shkp, false);
    if (bp) {
        if (!merge) {
            bp.useup = true;
            obj.unpaid = 0;
            if (obj.globby && !obj.owt && has_omid(obj)) {
                obj.owt = OMID(obj);
            }
            add_to_billobjs(obj);
            return;
        }
        const bpm = onbill(merge, shkp, false);
        if (!bpm) {
            impossible(
                'obfree: not on bill, otyp,where,quan,unpaid = (%d,%d,%d,%d) (%d,%d,%d,%d)?',
                obj.otyp | 0, obj.where | 0, obj.quan | 0, obj.unpaid ? 1 : 0,
                merge.otyp | 0, merge.where | 0, merge.quan | 0,
                merge.unpaid ? 1 : 0,
            );
            return;
        }
        const eshkp = ESHK(shkp);
        bpm.bquan = (bpm.bquan | 0) + (bp.bquan | 0);
        eshkp.billct = (eshkp.billct | 0) - 1;
        const bill = eshkp.bill_p || eshkp.bill;
        if (bill) {
            const i = bill.indexOf(bp);
            if (i >= 0) bill[i] = bill[eshkp.billct | 0];
        }
    } else if (merge
        && oid_price_adjustment(obj, obj.o_id)
            > oid_price_adjustment(merge, merge.o_id)) {
        merge.o_id = obj.o_id | 0;
    }

    if (obj.owornmask) {
        impossible(
            'obfree: deleting worn obj (%d: %d)',
            obj.otyp | 0, obj.owornmask | 0,
        );
        setnotworn(obj);
    }
    dealloc_obj(obj);
}

/**
 * C ref: shk.c add_one_tobill `:3308–3363`.
 * dummy TRUE → useup + add_to_billobjs (FullyUsedUp). Bill-full You();
 * OBJ_FREE dealloc_obj; globby newomid/OMID.
 */
async function add_one_tobill(obj, dummy, shkp) {
    const eshkp = ESHK(shkp);
    if (!eshkp || !obj) return;
    if (!eshkp.bill) eshkp.bill = [];
    if (!eshkp.bill_p) eshkp.bill_p = eshkp.bill;

    let unbilled = false;
    const holder = { shkp };
    const roomCh = (game.u?.ushops || '')[0] || '\0';
    if (!billable(holder, obj, roomCh, true)) {
        unbilled = true;
    } else if ((eshkp.billct | 0) === BILLSZ) {
        await pline('You got that for free!');
        unbilled = true;
    }
    if (unbilled) {
        if ((obj.where | 0) === OBJ_FREE) dealloc_obj(obj);
        return;
    }

    const bct = eshkp.billct | 0;
    const bp = {
        bo_id: obj.o_id | 0,
        bquan: obj.quan | 0,
        useup: false,
        price: 0,
    };
    if (dummy) {
        bp.useup = true;
        add_to_billobjs(obj);
    }
    bp.price = get_cost(obj, shkp);
    if (obj.globby) {
        bp.price *= get_pricing_units(obj);
        newomid(obj);
        if (obj.oextra) obj.oextra.omid = obj.owt | 0;
    }
    eshkp.bill_p[bct] = bp;
    eshkp.billct = bct + 1;
    obj.unpaid = 1;
    record_price_quote(obj.otyp, bp.price, true);
}

/**
 * C ref: shk.c bill_box_content `:3386–3407` — bill nested contents.
 * Top box is addtobill; skip coins and SchroedingersBox. Recurse
 * even when the child itself was no_charge.
 */
async function bill_box_content(obj, ininv, dummy, shkp) {
    if (SchroedingersBox(obj)) return;
    for (let otmp = obj?.cobj; otmp; otmp = otmp.nobj) {
        if ((otmp.oclass | 0) === COIN_CLASS) continue;
        if (!otmp.no_charge) await add_one_tobill(otmp, dummy, shkp);
        if (Has_contents(otmp)) await bill_box_content(otmp, ininv, dummy, shkp);
    }
}

/**
 * C ref: shk.c append_honorific — rn2(SIZE(honored)-1) + udemigod.
 * Vampire/elf race suffixes: human path via is_human; others → creature.
 */
function append_honorific(bufRef) {
    const honored = [
        'good', 'honored', 'most gracious', 'esteemed',
        'most renowned and sacred',
    ];
    const udemi = game.u?.uevent?.udemigod ? 1 : 0;
    bufRef.s += honored[rn2(honored.length - 1) + udemi];
    const ptr = game.youmonst?.data;
    // is_vampire / maybe_polyd elf deferred
    if (!is_human(ptr)) bufRef.s += ' creature';
    else if (game.flags?.female) bufRef.s += ' lady';
    else bufRef.s += ' sir';
}

/**
 * C ref: shk.c addtobill — unpaid pickup quote path.
 * Covered: non-container ininv `"For you,"` + append_honorific;
 * COIN_CLASS / container contained_gold → costly_gold (D-0991);
 * container contained_cost + bill_box_content (D-1705);
 * add_one_tobill dummy→billobjs (D-1714).
 * Named: remote silent. set_voice is D-1752.
 */
export async function addtobill(obj, ininv, dummy, silent) {
    const holder = { shkp: null };
    const roomCh = (game.u?.ushops || '')[0] || '\0';
    if (!billable(holder, obj, roomCh, true)) return;
    const shkp = holder.shkp;

    if ((obj?.oclass | 0) === COIN_CLASS) {
        await costly_gold(obj.ox | 0, obj.oy | 0, obj.quan | 0, silent);
        return;
    }
    if ((ESHK(shkp)?.billct | 0) === BILLSZ) {
        if (!silent) await pline('You got that for free!');
        return;
    }

    let ltmp = 0;
    let cltmp = 0;
    let gltmp = 0;
    const container = Has_contents(obj);
    if (!obj.no_charge) {
        ltmp = get_cost(obj, shkp);
        if (obj.globby) ltmp *= get_pricing_units(obj);
    }
    if (obj.no_charge && !container) {
        obj.no_charge = 0;
        return;
    }

    let contentscount = 0;
    if (container) {
        cltmp = contained_cost(obj, shkp, cltmp, false, false);
        gltmp = contained_gold(obj, true);
        if (ltmp) await add_one_tobill(obj, dummy, shkp);
        if (cltmp) await bill_box_content(obj, ininv, dummy, shkp);
        picked_container(obj);
        ltmp += cltmp;

        if (gltmp) {
            await costly_gold(obj.ox | 0, obj.oy | 0, gltmp, silent);
            if (!ltmp) return;
        }

        if (obj.no_charge) obj.no_charge = 0;
        contentscount = count_unpaid(obj.cobj);
    } else {
        await add_one_tobill(obj, dummy, shkp);
    }

    if (!hero_deaf() && !muteshk(shkp) && !silent) {
        if (!ltmp) {
            await pline(
                `${Shknam(shkp)} has no interest in ${the(xname(obj))}.`,
            );
            return;
        }
        if (!ininv) {
            await pline(
                `${The(xname(obj))} will cost you ${ltmp} ${currency(ltmp)}${(obj.quan | 0) > 1 ? ' each' : ''}.`,
            );
        } else {
            const buf = { s: '"For you,' };
            if (ANGRY(shkp)) {
                buf.s += ' scum;';
            } else if (!ESHK(shkp)?.surcharge) {
                buf.s += ' ';
                append_honorific(buf);
                buf.s += '; only';
            }
            const saveQuan = obj.quan;
            obj.quan = 1;
            set_voice(shkp, 0, 80, 0);
            const forWhat = (saveQuan > 1)
                ? 'per'
                : (contentscount && !obj.unpaid)
                    ? 'for the contents of this'
                    : 'for this';
            const contents = (contentscount && obj.unpaid)
                ? ' and its contents' : '';
            await pline(
                `${buf.s} ${ltmp} ${currency(ltmp)} ${forWhat} ${xname(obj)}${contents}."`,
            );
            obj.quan = saveQuan;
        }
    } else if (!silent) {
        if (ltmp) {
            const contentsonly = contentscount && !obj.unpaid
                ? 'the contents of ' : '';
            const andContents = contentscount && obj.unpaid
                ? ' and its contents' : '';
            set_voice(shkp, 0, 80, 0);
            await pline(
                `The list price of ${contentsonly}${the(xname(obj))}${andContents} is ${ltmp} ${currency(ltmp)}${(obj.quan | 0) > 1 ? ' each' : ''}.`,
            );
        } else {
            await pline(`${Shknam(shkp)} does not notice.`);
        }
    }
}

/** C ref: invent.c carrying — first matching otyp in hero invent. */
function carrying(otyp) {
    if (otyp < 0) return null;
    for (const otmp of game.invent || []) {
        if ((otmp?.otyp | 0) === otyp) return otmp;
    }
    return null;
}

/**
 * C: after carrying(), walk nobj counting further otyp (not quan).
 * JS invent is an array (C nobj); count slots after `first`.
 */
function count_otyp_from(first, otyp) {
    let cnt = 1;
    const inv = game.invent || [];
    const start = inv.indexOf(first);
    for (let i = start + 1; i < inv.length; i++) {
        if ((inv[i]?.otyp | 0) === otyp) cnt++;
    }
    return cnt;
}

/** C ref: dig.c holetime — dig occupation in shop (D-0951). */
function holetime() {
    // Mirror dig.js holetime without static dig import (cycle risk via pay).
    // dig occupation sets occtxt to "digging"/"chopping" via set_occupation.
    if (typeof game.occupation !== 'function') return -1;
    const txt = game.occtxt || '';
    if (txt !== 'digging' && txt !== 'chopping') return -1;
    if (!(game.u?.ushops)) return -1;
    return ((250 - ((game.context?.digging?.effort) | 0)) / 20) | 0;
}

/** C: onlineu(xx,yy) → online2(xx,yy,u.ux,u.uy) */
function onlineu(xx, yy) {
    const u = game.u;
    if (!u) return false;
    return online2(xx, yy, u.ux, u.uy);
}

/**
 * C ref: priest.c move_special — shared shk/priest step picker.
 * Returns 1 moved, 0 didn't, -2 died. (m_move_aggress / boulder deferred.)
 * Lazy-imports mon.js helpers to avoid mon→monmove→shk→mon cycle.
 */
export async function move_special(mtmp, in_his_shop, appr, uondoor, avoid,
    omx, omy, ggx, ggy) {
    if (omx === ggx && omy === ggy) return 0;
    if (mtmp.mconf) {
        avoid = false;
        appr = 0;
    }

    const { mon_allowflags, mfndpos, m_at, ALLOW_M } = await import('./mon.js');

    let nix = omx;
    let niy = omy;
    let ninfo = 0;
    const allowflags = mon_allowflags(mtmp);
    const mfp = { cnt: 0, poss: [], info: [] };
    const cnt = mfndpos(mtmp, mfp, allowflags);

    if (mtmp.isshk && avoid && uondoor) {
        let canAvoid = false;
        for (let i = 0; i < cnt; i++) {
            if (!(mfp.info[i] & NOTONL)) {
                canAvoid = true;
                break;
            }
        }
        if (!canAvoid) avoid = false;
    }

    const GDIST = (x, y) => dist2(x, y, ggx, ggy);

    function pick_move() {
        let chcnt = 0;
        nix = omx;
        niy = omy;
        ninfo = 0;
        for (let i = 0; i < cnt; i++) {
            const nx = mfp.poss[i].x;
            const ny = mfp.poss[i].y;
            const loc = game.level?.at?.(nx, ny);
            if (IS_ROOM(loc?.typ)
                || (mtmp.isshk && (!in_his_shop || ESHK(mtmp)?.following))) {
                if (avoid && (mfp.info[i] & NOTONL) && !(mfp.info[i] & ALLOW_M)) {
                    continue;
                }
                if ((!appr && !rn2(++chcnt))
                    || (appr && GDIST(nx, ny) < GDIST(nix, niy))
                    || (mfp.info[i] & ALLOW_M)) {
                    nix = nx;
                    niy = ny;
                    ninfo = mfp.info[i];
                }
            }
        }
    }

    pick_move();

    if (mtmp.ispriest && avoid && nix === omx && niy === omy
        && onlineu(omx, omy)) {
        avoid = false;
        pick_move();
    }

    if (nix !== omx || niy !== omy) {
        if (m_at(nix, niy) || u_at(nix, niy)) return 0;
        if (!isok(nix, niy)) return 0;
        mtmp.mx = nix;
        mtmp.my = niy;
        newsym(nix, niy);
        void ninfo;
        return 1;
    }
    return 0;
}

/**
 * C ref: shk.c shk_move — returns 1 moved, 0 didn't, -1 let m_move,
 * -2 died.
 */
export async function shk_move(shkp) {
    const eshkp = ESHK(shkp);
    if (!eshkp) return 0;

    const omx = shkp.mx;
    const omy = shkp.my;
    const u = game.u;

    // C: inhishop → shk_fixes_damage (live repair; catchup is D-1178
    // goto_level fix_shop_damage). Named omit here.

    const udist = dist2(omx, omy, u.ux, u.uy);
    // C: udist < 3 && (data != GRID_BUG || same row/col)
    if (udist < 3 && (shkp.mnum !== PM_GRID_BUG || omx === u.ux || omy === u.uy)) {
        // resist_conflict stubbed false → Conflict always engages when set
        if (ANGRY(shkp) || game.Conflict) {
            await mattacku(shkp);
            return 0;
        }
        if (eshkp.following) {
            // customer / followmsg verbalize / rile_shk deferred
            if (udist < 2) return 0;
        }
    }

    let appr = 1;
    let gtx = eshkp.shk?.x | 0;
    let gty = eshkp.shk?.y | 0;
    const satdoor = (gtx === omx && gty === omy);
    let uondoor = false;
    let avoid = false;
    let badinv = false;

    const zHole = holetime();
    if (eshkp.following || (zHole >= 0 && zHole * zHole <= udist)) {
        if (udist > 4 && eshkp.following && !eshkp.billct) {
            return -1; // leave it to m_move
        }
        gtx = u.ux;
        gty = u.uy;
    } else if (ANGRY(shkp)) {
        if (shkp.mcansee) {
            gtx = u.ux;
            gty = u.uy;
        }
        avoid = false;
    } else {
        if (u.Invis || u.usteed) {
            avoid = false;
        } else {
            uondoor = u_at(eshkp.shd?.x | 0, eshkp.shd?.y | 0);
            if (uondoor) {
                badinv = !!(carrying(PICK_AXE) || carrying(DWARVISH_MATTOCK));
                // Fast + sobj_at pickaxe deferred
                if (satdoor && badinv) return 0;
                avoid = !badinv;
            } else {
                const ushops = u.ushops || '';
                avoid = !!(ushops && dist2(u.ux, u.uy, gtx, gty) > 8);
                badinv = false;
            }

            const GDIST = (x, y) => dist2(x, y, gtx, gty);
            if (((!eshkp.robbed && !eshkp.billct && !eshkp.debit) || avoid)
                && GDIST(omx, omy) < 3) {
                if (!badinv && !onlineu(omx, omy)) return 0;
                if (satdoor) {
                    appr = 0;
                    gtx = 0;
                    gty = 0;
                }
            }
        }
    }

    const z = await move_special(
        shkp, inhishop(shkp), appr, uondoor, avoid, omx, omy, gtx, gty,
    );
    // after_shk_move bill_p reset deferred
    return z;
}

import { gd_move as vault_gd_move, hidden_gold } from './vault.js';

/**
 * C ref: vault.c gd_move — re-export peaceful escort subset from vault.js.
 */
export async function gd_move(grd) {
    return vault_gd_move(grd);
}

/** C ref: youprop.h Displaced — HDisplaced || EDisplaced (cloak extrinsic). */
function Displaced() {
    const u = game.u || {};
    if (u.HDisplaced || u.uprops?.[DISPLACED]?.intrinsic) return true;
    if (u.uprops?.[DISPLACED]?.extrinsic) return true;
    const cloak = u.uarmc;
    return !!(cloak && cloak.otyp === CLOAK_OF_DISPLACEMENT);
}

/**
 * C ref: priest.c histemple_at — priest on shrine level inside temple room.
 */
function histemple_at(priest, x, y) {
    if (!priest || !priest.ispriest) return false;
    const epri = EPRI(priest);
    if (!epri) return false;
    const rooms = in_rooms(x, y, TEMPLE);
    if (!rooms || (rooms.charCodeAt(0) | 0) !== (epri.shroom | 0)) return false;
    return on_level(epri.shrlevel, game.u?.uz);
}

/**
 * C ref: priest.c pri_move — return 1 moved, 0 didn't, -1 let m_move, -2 died.
 * Named omissions: inhistemple callers beyond pri_move; mapseen_temple.
 */
export async function pri_move(priest) {
    let avoid = true;
    const omx = priest.mx | 0;
    const omy = priest.my | 0;

    if (!histemple_at(priest, omx, omy)) return -1;

    const epri = EPRI(priest);
    const temple = epri.shroom | 0;
    let ggx = epri.shrpos?.x | 0;
    let ggy = epri.shrpos?.y | 0;

    ggx += rn1(3, -1); /* mill around the altar */
    ggy += rn1(3, -1);

    const Conflict = hero_conflict();
    if (!priest.mpeaceful || (Conflict && !resist_conflict(priest))) {
        const { monnear } = await import('./mon.js');
        const u = game.u;
        if (monnear(priest, u.ux, u.uy)) {
            if (Displaced()) {
                await pline(
                    `Your displaced image doesn't fool ${mon_nam(priest)}!`,
                );
            }
            await mattacku(priest);
            return 0;
        } else if ((u.urooms || '').includes(String.fromCharCode(temple))) {
            /* chase player if inside temple & can see him */
            if (priest.mcansee && m_canseeu(priest)) {
                ggx = u.ux;
                ggy = u.uy;
            }
            avoid = false;
        }
    } else if (game.u?.Invis) {
        avoid = false;
    }

    return move_special(
        priest, false, true, false, avoid, omx, omy, ggx, ggy,
    );
}

/** C: has_head — !(mflags1 & M1_NOHEAD); M1_NOHEAD not in JS tables. */
function has_head(_ptr) {
    return true;
}

/** C ref: you.h m_next2u — squared dist ≤ 2. */
function m_next2u(mtmp) {
    const u = game.u || {};
    const dx = (mtmp.mx | 0) - (u.ux | 0);
    const dy = (mtmp.my | 0) - (u.uy | 0);
    return dx * dx + dy * dy <= 2;
}

/** C ref: dungeon.c on_level */
function on_level(a, b) {
    return !!a && !!b
        && (a.dnum | 0) === (b.dnum | 0)
        && (a.dlevel | 0) === (b.dlevel | 0);
}

/** C: strchr(u.ushops, shoproom) */
function uin_shoproom(shoproom) {
    const ushops = game.u?.ushops || '';
    return ushops.includes(String.fromCharCode(shoproom | 0));
}

/** C ref: invent.c money_cnt — invent is a JS array. */
function money_cnt(invent) {
    let sum = 0;
    for (const o of invent || []) {
        if (o.oclass === COIN_CLASS) sum += o.quan | 0;
    }
    return sum;
}

/** C ref: steal.c findgold — first GOLD_PIECE / COIN on invent array. */
function findgold_invent() {
    const goldOtyp = objectNames.indexOf('GOLD_PIECE');
    for (const o of game.invent || []) {
        if (o.oclass === COIN_CLASS || o.otyp === goldOtyp) return o;
    }
    return null;
}

/**
 * C ref: shk.c money2mon — move hero gold into mon minvent.
 * C freeinv → freeinv_core sets disp.botl; botl uses money_cnt(invent).
 * JS botl `$:` caches game._goldCount (addinv/drop maintain it) — decrement
 * here so pay paints the post-payment wallet.
 * Named omissions: remove_worn_item quiver; impossible arms.
 */
export function money2mon(mon, amount) {
    if (amount <= 0 || !mon) return 0;
    let ygold = findgold_invent();
    if (!ygold || (ygold.quan | 0) < amount) return 0;
    if ((ygold.quan | 0) > amount) {
        ygold = splitobj(ygold, amount);
        // splitobj leaves parent in invent with reduced quan; child not
        // listed in invent[] — freeinv of child is a no-op (C removes
        // the split child from the invent chain).
    } else {
        const inv = game.invent || [];
        const idx = inv.indexOf(ygold);
        if (idx >= 0) inv.splice(idx, 1);
    }
    if (!ygold) return 0;
    ygold.where = OBJ_MINVENT;
    add_to_minv(mon, ygold);
    // Mirror C freeinv_core COIN botl refresh via cached wallet.
    game._goldCount = Math.max(0, (game._goldCount || 0) - amount);
    if (game.flags) game.flags.botl = true;
    return amount;
}

/**
 * C ref: shk.c setpaid `:399–434` — clear unpaid on invent/fobj/minvent
 * / buried / thrown / kicked / migrating, shop no_charge, then free
 * billobjs and zero billct/credit/debit/loan.
 */
function setpaid(shkp) {
    clear_unpaid(shkp, game.invent);
    clear_unpaid(shkp, game.fobj);
    if (game.level?.buriedobjlist) {
        clear_unpaid(shkp, game.level.buriedobjlist);
    }
    if (game.thrownobj) clear_unpaid_obj(shkp, game.thrownobj);
    if (game.kickedobj) clear_unpaid_obj(shkp, game.kickedobj);
    for (const mtmp of game.fmon || []) {
        if (mtmp?.minvent) clear_unpaid(shkp, mtmp.minvent);
    }
    const migrating = game.migrating_mons;
    if (Array.isArray(migrating)) {
        for (const mtmp of migrating) {
            if (mtmp?.minvent) clear_unpaid(shkp, mtmp.minvent);
        }
    } else {
        for (let mtmp = migrating; mtmp; mtmp = mtmp.nmon) {
            if (mtmp.minvent) clear_unpaid(shkp, mtmp.minvent);
        }
    }
    clear_no_charge(shkp, game.fobj);
    clear_no_charge(shkp, game.level?.buriedobjlist);
    let obj;
    while ((obj = game.billobjs) != null) {
        obj_extract_self(obj);
        dealloc_obj(obj);
    }
    if (shkp) {
        const eshk = ESHK(shkp);
        if (!eshk) return;
        eshk.billct = 0;
        eshk.credit = 0;
        eshk.debit = 0;
        eshk.loan = 0;
    }
}

/** C ref: shk.c rile_shk — angry + surcharge on bill (bill walk deferred). */
function rile_shk(shkp) {
    if (!shkp) return;
    shkp.mpeaceful = 0;
    const eshk = ESHK(shkp);
    if (eshk && !eshk.surcharge) {
        eshk.surcharge = true;
        // bill_p price bump deferred when billct==0 (common for angry combat)
    }
}

/**
 * C ref: shk.c next_shkp — next live isshk; optional withbill filter.
 */
function next_shkp(startIdx, withbill) {
    const fmon = game.fmon || [];
    for (let i = startIdx; i < fmon.length; i++) {
        const shkp = fmon[i];
        if (!shkp || ((shkp.mhp | 0) < 1)) continue;
        if (!shkp.isshk) continue;
        const eshk = ESHK(shkp);
        if (!eshk) continue;
        if ((eshk.billct | 0) || !withbill) {
            if (ANGRY(shkp) && !eshk.surcharge) rile_shk(shkp);
            return { shkp, nextIdx: i + 1 };
        }
    }
    return { shkp: null, nextIdx: fmon.length };
}

/** C ref: shk.c addupbill `:495–507` — sum bill_p[i].price * bquan. */
function addupbill(shkp) {
    const eshkp = ESHK(shkp);
    if (!eshkp) return 0;
    const bp = eshkp.bill_p || eshkp.bill;
    let total = 0;
    let ct = eshkp.billct | 0;
    for (let i = 0; ct--; i++) {
        const e = bp?.[i];
        if (!e) continue;
        total += (e.price | 0) * (e.bquan | 0);
    }
    return total;
}

/**
 * C ref: shk.c shop_debt `:989–999` (static). debit plus billed
 * price*bquan. Caller: shopper_financial_report only (rob_shop still
 * uses addupbill+debit like C).
 */
function shop_debt(eshkp) {
    let debt = eshkp.debit | 0;
    const bp = eshkp.bill_p || eshkp.bill;
    let ct = eshkp.billct | 0;
    for (let i = 0; ct > 0; i++, ct--) {
        const e = bp?.[i];
        if (!e) continue;
        debt += (e.price | 0) * (e.bquan | 0);
    }
    return debt;
}

/**
 * C ref: shk.c shopper_financial_report `:1002–1035`.
 * Caller: invent.c doprgold after wallet/stash (D-1731).
 * pass 0: shop we are in; pass 1: other shops on this level.
 * `(shkp != this_shkp) ^ pass` skips the other pass's shops.
 * Empty current shop: "no credit or debt" then this_shkp=0 so pass 1
 * still walks everyone but the else-arms stay silent.
 * Named: costly_gold; dokick hidden_gold_kick.
 */
export async function shopper_financial_report() {
    const u = game.u || {};
    let this_shkp = shop_keeper(inside_shop(u.ux, u.uy));
    let eshkp = this_shkp ? ESHK(this_shkp) : null;
    if (eshkp && !(eshkp.credit || shop_debt(eshkp))) {
        await pline('You have no credit or debt in here.');
        this_shkp = null; /* skip first pass */
    }

    /* pass 0: report for the shop we're currently in, if any;
       pass 1: report for all other shops on this level. */
    for (let pass = this_shkp ? 0 : 1; pass <= 1; pass++) {
        for (let walk = next_shkp(0, false); walk.shkp;
             walk = next_shkp(walk.nextIdx, false)) {
            const shkp = walk.shkp;
            if ((shkp !== this_shkp) ^ pass) continue;
            eshkp = ESHK(shkp);
            let amt = eshkp.credit | 0;
            if (amt !== 0) {
                const shopnm = shtypes[(eshkp.shoptype | 0) - SHOPBASE]?.name;
                await pline(
                    `You have ${amt} ${currency(amt)} credit at ${s_suffix(shkname(shkp))} ${shopnm}.`,
                );
            } else if (shkp === this_shkp) {
                await pline('You have no credit in here.');
            }
            amt = shop_debt(eshkp);
            if (amt !== 0) {
                await pline(
                    `You owe ${shkname(shkp)} ${amt} ${currency(amt)}.`,
                );
            } else if (shkp === this_shkp) {
                await pline("You don't owe any gold here.");
            }
        }
    }
}

/**
 * C ref: shk.c rouse_shk — wake/unfreeze; verbosely pline deferred here
 * (inherits passes FALSE).
 */
function rouse_shk(shkp, _verbosely) {
    if (!helpless(shkp)) return;
    shkp.msleeping = 0;
    shkp.mfrozen = 0;
    shkp.mcanmove = 1;
}

/**
 * C ref: shk.c after_shk_move — bill_p==-1000 re-entry reset.
 * Occupancy check_special_room named omit (sentinel producer still unnamed).
 */
function after_shk_move(shkp) {
    const eshkp = ESHK(shkp);
    if (eshkp?.bill_p === -1000 && inhishop(shkp)) {
        eshkp.bill_p = eshkp.bill || [];
    }
}

/**
 * C ref: shk.c home_shk — return to shk.x,shk.y then maybe kops.
 * Named omit: full mnearto(RLOC_NOMSG) yank (coord set like prior door path).
 */
async function home_shk(shkp, killkops) {
    const eshk = ESHK(shkp);
    if (eshk?.shk) {
        const x = eshk.shk.x | 0;
        const y = eshk.shk.y | 0;
        const ox = shkp.mx;
        const oy = shkp.my;
        if (ox !== x || oy !== y) {
            shkp.mx = x;
            shkp.my = y;
            if (ox != null && oy != null) newsym(ox, oy);
            newsym(x, y);
        }
    }
    if (game.level?.flags) game.level.flags.has_shop = 1;
    if (killkops) {
        await kops_gone(true);
        pacify_guards();
    }
    after_shk_move(shkp);
}

/** C ref: shk.c costly_adjacent — edge or free spot. */
export function costly_adjacent(shkp, x, y) {
    if (!shkp || !inhishop(shkp) || !isok(x, y)) return false;
    const eshk = ESHK(shkp);
    const loc = game.level?.at?.(x, y);
    return !!(loc?.edge || (x === (eshk.shk?.x | 0) && y === (eshk.shk?.y | 0)));
}

/**
 * C ref: shk.c set_repo_loc — where finish_paybill drops invent.
 */
function set_repo_loc(shkp) {
    if (!game.repo) game.repo = { location: { x: 0, y: 0 }, shopkeeper: null };
    if (game.repo.shopkeeper) return;
    const eshk = ESHK(shkp);
    const u = game.u || {};
    let ox = u.ux ? u.ux : (u.ux0 | 0);
    let oy = u.ux ? u.uy : (u.uy0 | 0);
    if (!uin_shoproom(eshk.shoproom) || costly_adjacent(shkp, ox, oy)) {
        ox = eshk.shk?.x | 0;
        oy = eshk.shk?.y | 0;
        const sgn = (n) => (n > 0 ? 1 : n < 0 ? -1 : 0);
        ox += sgn(ox - (eshk.shd?.x | 0));
        oy += sgn(oy - (eshk.shd?.y | 0));
    }
    game.repo.location = { x: ox, y: oy };
    game.repo.shopkeeper = shkp;
}

/** Remove nonlocal shk from fmon (full mongone deferred). */
function mongone_nonlocal(mtmp) {
    const fmon = game.fmon || [];
    const i = fmon.indexOf(mtmp);
    if (i >= 0) fmon.splice(i, 1);
    const eshk = ESHK(mtmp);
    if (eshk) {
        const room = game.level?.rooms?.[((eshk.shoproom | 0) - ROOMOFFSET)];
        if (room?.resident === mtmp) room.resident = null;
    }
}

/**
 * C ref: shk.c inherits — first shk may take invent; pline possessions.
 * Covered: numsk==1 angry/following/owed → "takes all your possessions";
 * peaceful in-shop inherit; numsk>1 corpse glance (+ optional rn2).
 * Deferred: partial gold owed arm currency pline; mbodypart/noit_mhis text.
 */
async function inherits(shkp, numsk, croaked, silently) {
    const eshkp = ESHK(shkp);
    if (!eshkp) return false;
    let loss = 0;
    let take = false;
    let taken = false;
    const uinshop = uin_shoproom(eshkp.shoproom);
    let takes = '';

    shkp.minvis = 0;
    shkp.perminvis = 0;

    if (numsk > 1) {
        if (cansee(shkp.mx, shkp.my) && croaked && !silently) {
            takes = '';
            if (has_head(shkp.data) && !rn2(2)) {
                takes = `, shakes ${shkp.female ? 'her' : 'his'} head,`;
            }
            await pline(
                `${Shknam(shkp)} ${helpless(shkp) ? 'wakes up, ' : ''}looks at your corpse${takes} and ${!inhishop(shkp) ? 'disappears' : 'sighs'}.`,
            );
        }
        taken = uinshop;
        // skip → rouse/home below
        rouse_shk(shkp, false);
        if (!inhishop(shkp)) await home_shk(shkp, false);
        setpaid(shkp);
        if (taken) set_repo_loc(shkp);
        return taken;
    }

    // peaceful shop death, nothing owed
    if (uinshop && inhishop(shkp) && !(eshkp.billct | 0)
        && !(eshkp.robbed | 0) && !(eshkp.debit | 0) && !ANGRY(shkp)
        && !eshkp.following
        && ((game.u?.ugrave_arise ?? LOW_PM - 1) < LOW_PM)) {
        taken = !!(game.invent && game.invent.length);
        if (taken && !silently) {
            await pline(
                `${Shknam(shkp)} gratefully inherits all your possessions.`,
            );
        }
        setpaid(shkp);
        if (taken) set_repo_loc(shkp);
        return taken;
    }

    if ((eshkp.billct | 0) || (eshkp.debit | 0) || (eshkp.robbed | 0)) {
        if (uinshop && inhishop(shkp)) {
            loss = addupbill(shkp) + (eshkp.debit | 0);
        }
        if (loss < (eshkp.robbed | 0)) loss = eshkp.robbed | 0;
        take = true;
    }

    if (eshkp.following || ANGRY(shkp) || take) {
        if (!(game.invent && game.invent.length)) {
            rouse_shk(shkp, false);
            if (!inhishop(shkp)) await home_shk(shkp, false);
            setpaid(shkp);
            return false;
        }
        const umoney = money_cnt(game.invent);
        takes = '';
        if (helpless(shkp)) takes += 'wakes up and ';
        if (!m_next2u(shkp)) takes += 'comes and ';
        takes += 'takes';

        if (loss > umoney || !loss || uinshop) {
            eshkp.robbed = (eshkp.robbed | 0) - umoney;
            if (eshkp.robbed < 0) eshkp.robbed = 0;
            if (umoney > 0) money2mon(shkp, umoney);
            if (!silently) {
                await pline(
                    `${Shknam(shkp)} ${takes} all your possessions.`,
                );
            }
            taken = true;
        } else {
            money2mon(shkp, loss);
            if (!silently) {
                // currency / customer / noit_mhim deferred — rare partial path
                await pline(
                    `${Shknam(shkp)} ${takes} the ${loss} gold pieces owed ${shkp.female ? 'her' : 'him'}.`,
                );
            }
            pacify_shk(shkp, false);
            eshkp.following = 0;
            eshkp.robbed = 0;
        }
        rouse_shk(shkp, false);
        if (!inhishop(shkp)) await home_shk(shkp, false);
    }
    setpaid(shkp);
    if (taken) set_repo_loc(shkp);
    return taken;
}

/**
 * C ref: shk.c paybill — prioritize shk; inherits may pline before message flush.
 * croaked: -1 escaped, 0 quit, 1 died.
 */
export async function paybill(croaked, silently) {
    if (croaked < 0) return false;

    if (!game.repo) game.repo = { location: { x: 0, y: 0 }, shopkeeper: null };
    game.repo.location = { x: 0, y: 0 };
    game.repo.shopkeeper = null;

    let resident = null;
    let creditor = null;
    let hostile = null;
    let localshk = null;

    let { shkp: mtmp, nextIdx } = next_shkp(0, false);
    while (mtmp) {
        const eshkp = ESHK(mtmp);
        const local = on_level(eshkp?.shoplevel, game.u?.uz);
        if (local && uin_shoproom(eshkp.shoproom)) {
            if (!resident || (eshkp.billct | 0) || (eshkp.debit | 0)
                || (eshkp.robbed | 0)) {
                resident = mtmp;
            }
        } else if ((eshkp.billct | 0) || (eshkp.debit | 0) || (eshkp.robbed | 0)) {
            if (!creditor) creditor = mtmp;
        } else if (eshkp.following || ANGRY(mtmp)) {
            if (!hostile) hostile = mtmp;
        } else if (local) {
            if (!localshk) localshk = mtmp;
        }
        ({ shkp: mtmp, nextIdx } = next_shkp(nextIdx, false));
    }

    const firstshk = resident || creditor || hostile || localshk;
    let numsk = 0;
    let taken = false;
    if (firstshk) {
        numsk++;
        taken = await inherits(firstshk, numsk, croaked, silently);
    }

    // Re-scan: other shks + mongone nonlocal (snapshot — mongone mutates fmon)
    const shks = [];
    ({ shkp: mtmp, nextIdx } = next_shkp(0, false));
    while (mtmp) {
        shks.push(mtmp);
        ({ shkp: mtmp, nextIdx } = next_shkp(nextIdx, false));
    }
    for (const m of shks) {
        const eshkp = ESHK(m);
        const local = on_level(eshkp?.shoplevel, game.u?.uz);
        if (m !== firstshk) {
            numsk++;
            taken = (await inherits(m, numsk, croaked, silently)) || taken;
        }
        if (!local) mongone_nonlocal(m);
    }
    return taken;
}

/** C shk.c enum billitem_status — used-up first in sortbill_cmp. */
const FullyUsedUp = 1;
const PartlyUsedUp = 2;
const PartlyIntact = 3;
const FullyIntact = 4;
const KnownContainer = 5;
const UndisclosedContainer = 6;
/** C shk.c PAY_* dopayobj results. */
const PAY_BUY = 1;
const PAY_CANT = 0;
const PAY_SKIP = -1;
const PAY_BROKE = -2;

/**
 * C shk.c find_oid `:2776–2804` — o_id on invent/fobj/buried/migrating
 * then fmon/migrating_mons/mydogs minvent. Not billobjs (bp_to_obj
 * useup walks that). Invent is a JS array; other chains are nobj.
 * @param {number} id
 * @returns {object|null}
 */
export function find_oid(id) {
    const want = id | 0;
    let obj = o_on(want, game.gi?.invent ?? game.invent);
    if (obj) return obj;
    obj = o_on(want, game.fobj);
    if (obj) return obj;
    obj = o_on(want, game.level?.buriedobjlist);
    if (obj) return obj;
    obj = o_on(want, game.migrating_objs);
    if (obj) return obj;

    const mmtmp = [game.fmon, game.migrating_mons, game.mydogs];
    for (let i = 0; i < 3; i++) {
        const list = mmtmp[i];
        if (!list) continue;
        if (Array.isArray(list)) {
            for (const mon of list) {
                if (!mon) continue;
                obj = o_on(want, mon.minvent);
                if (obj) return obj;
            }
        } else {
            for (let mon = list; mon; mon = mon.nmon) {
                obj = o_on(want, mon.minvent);
                if (obj) return obj;
            }
        }
    }
    return null;
}

/**
 * C shk.c gem_learned `:3196–3231` — unpaid gem bill prices after
 * ID / un-ID. next_shkp(fmon, TRUE) then find_oid + get_cost.
 * STRANGE_OBJECT → every GEM_CLASS stack on any shk bill.
 * @param {number} oindx
 */
export function gem_learned(oindx) {
    let { shkp, nextIdx } = next_shkp(0, true);
    while (shkp) {
        const eshk = ESHK(shkp);
        let ct = eshk?.billct | 0;
        const bill = eshk?.bill_p || eshk?.bill || [];
        let bpIdx = 0;
        while (--ct >= 0) {
            const bp = bill[bpIdx];
            const obj = find_oid(bp?.bo_id | 0);
            if (obj) {
                if (oindx !== STRANGE_OBJECT
                    ? (obj.otyp | 0) === (oindx | 0)
                    : (obj.oclass | 0) === GEM_CLASS) {
                    bp.price = get_cost(obj, shkp);
                }
            }
            bpIdx++;
        }
        ({ shkp, nextIdx } = next_shkp(nextIdx, true));
    }
}

/**
 * C shk.c bp_to_obj `:2758–2769` — useup → o_on(billobjs); else find_oid.
 */
function bp_to_obj(bp) {
    const id = bp?.bo_id | 0;
    if (!id) return null;
    if (bp.useup) return o_on(id, game.billobjs);
    return find_oid(id);
}

/**
 * C shk.c doinvbill `:4196–4271`. mode 0: count used-up bill rows (+
 * debit) so dotypeinv Traditional can offer 'x'. mode 1: NHW_MENU of
 * used-up articles. bp_to_obj is C find_oid / billobjs o_on (D-1691).
 * @param {number} mode
 * @returns {Promise<number>}
 */
export async function doinvbill(mode) {
    const ushops = game.u?.ushops || '';
    const shkp = shop_keeper(ushops.charCodeAt(0));
    if (!shkp || !inhishop(shkp)) {
        if (mode !== 0) await impossible('doinvbill: no shopkeeper?');
        return 0;
    }
    const eshkp = ESHK(shkp);
    const bill = eshkp?.bill_p || eshkp?.bill || [];
    const billct = eshkp?.billct | 0;

    if (mode === 0) {
        let cnt = eshkp?.debit ? 1 : 0;
        for (let i = 0; i < billct; i++) {
            const bp = bill[i];
            if (!bp) continue;
            if (bp.useup) {
                cnt++;
                continue;
            }
            const obj = bp_to_obj(bp);
            if (obj && (obj.quan | 0) < (bp.bquan | 0)) cnt++;
        }
        return cnt;
    }

    const lines = ['Unpaid articles already used up:', ''];
    let totused = 0;
    let ok = true;
    for (let i = 0; i < billct && ok; i++) {
        const bp = bill[i];
        if (!bp) continue;
        const obj = bp_to_obj(bp);
        if (!obj) {
            await impossible('Bad shopkeeper administration.');
            ok = false;
            break;
        }
        if (bp.useup || (bp.bquan | 0) > (obj.quan | 0)) {
            const oquan = obj.quan | 0;
            const uquan = bp.useup ? (bp.bquan | 0) : ((bp.bquan | 0) - oquan);
            const thisused = (bp.price | 0) * uquan;
            totused += thisused;
            if (!game.iflags) game.iflags = {};
            game.iflags.suppress_price = (game.iflags.suppress_price | 0) + 1;
            lines.push(xprname(obj, 'x', false, uquan, null, thisused));
            game.iflags.suppress_price = (game.iflags.suppress_price | 0) - 1;
        }
    }
    if (ok && eshkp?.debit) {
        if (totused) lines.push('');
        totused += eshkp.debit | 0;
        lines.push(xprname(
            null, '$', false, 0,
            'usage charges and/or other fees', eshkp.debit | 0,
        ));
    }
    if (ok) {
        lines.push('');
        lines.push(xprname(null, '*', false, 0, 'Total:', totused));
        const { show_nhw_menu_text } = await import('./pager.js');
        await show_nhw_menu_text(lines);
    }
    return 0;
}

/**
 * C ref: shk.c check_credit — apply shop credit toward tmp.
 * Named omissions: pline_The credit messages (silent when credit==0).
 */
function check_credit(tmp, shkp) {
    const eshkp = ESHK(shkp);
    let credit = eshkp?.credit | 0;
    if (!credit) return tmp;
    if (credit >= tmp) {
        eshkp.credit = credit - tmp;
        return 0;
    }
    eshkp.credit = 0;
    return tmp - credit;
}

/**
 * C ref: shk.c pay — money2mon after credit; money2u when tmp < 0 (sell).
 * Named omit: invent-full dropy on money2u (gold merges).
 */
async function pay(tmp, shkp) {
    const eshkp = ESHK(shkp);
    const robbed = eshkp?.robbed | 0;
    const balance = tmp <= 0 ? tmp : check_credit(tmp, shkp);
    if (balance > 0) money2mon(shkp, balance);
    else if (balance < 0) await money2u(shkp, -balance);
    if (game.flags) game.flags.botl = true;
    if (robbed && eshkp) {
        eshkp.robbed = Math.max(0, robbed - tmp);
    }
}

/**
 * C ref: shk.c sortbill_cmp `:1497–1518` — used-up before unpaid, then
 * higher cost, then lower bidx. JS Array.sort is stable; C qsort is not,
 * but bidx breaks ties.
 */
function sortbill_cmp(sbi1, sbi2) {
    const cost1 = sbi1.cost | 0;
    const cost2 = sbi2.cost | 0;
    const bidx1 = sbi1.bidx | 0;
    const bidx2 = sbi2.bidx | 0;
    const used1 = (sbi1.usedup | 0) <= PartlyUsedUp ? 1 : 0;
    const used2 = (sbi2.usedup | 0) <= PartlyUsedUp ? 1 : 0;
    if (used1 !== used2) return used2 - used1;
    if (cost1 !== cost2) return cost2 - cost1;
    return bidx1 - bidx2;
}

/**
 * C ref: shk.c make_itemized_bill `:1543–1663`.
 * FullyUsedUp (OBJ_ONBILL / quan==0) + PartlyUsedUp split when
 * quan < bquan, then container coalesce / PartlyIntact / FullyIntact.
 */
async function make_itemized_bill(shkp) {
    const eshkp = ESHK(shkp);
    const bill = eshkp?.bill_p || eshkp?.bill || [];
    const ibill = [];
    const ebillct = eshkp?.billct | 0;
    for (let i = 0; i < ebillct; i++) {
        const bp = bill[i];
        let otmp = bp_to_obj(bp);
        if (!otmp) {
            await impossible("Can't find shop bill entry for #%d", bp?.bo_id | 0);
            continue;
        }
        let bidx = i;
        if ((otmp.quan | 0) === 0 || (otmp.where | 0) === OBJ_ONBILL) {
            otmp.quan = bp.bquan | 0;
            bp.useup = true;
        } else if ((otmp.quan | 0) < (bp.bquan | 0)) {
            const uquan = (bp.bquan | 0) - (otmp.quan | 0);
            ibill.push({
                obj: otmp,
                quan: uquan,
                cost: (bp.price | 0) * uquan,
                bidx,
                usedup: PartlyUsedUp,
                queuedpay: false,
            });
        }

        let quan;
        let cost;
        let used;
        if ((otmp.where | 0) === OBJ_ONBILL) {
            quan = bp.bquan | 0;
            cost = (bp.price | 0) * quan;
            used = FullyUsedUp;
        } else if ((otmp.where | 0) === OBJ_CONTAINED || Has_contents(otmp)) {
            const item = otmp;
            let cknown = true;
            while ((otmp.where | 0) === OBJ_CONTAINED) {
                otmp = otmp.ocontainer;
                if (!otmp) break;
                if (!otmp.cknown) cknown = false;
            }
            if (!otmp) continue;
            let j = 0;
            for (; j < ibill.length; j++) {
                if (otmp === ibill[j].obj) break;
            }
            if (j < ibill.length) {
                if (ibill[j].usedup === FullyIntact) {
                    ibill[j].usedup = cknown ? KnownContainer
                        : UndisclosedContainer;
                }
                continue;
            }
            quan = 1;
            cost = unpaid_cost(otmp, COST_CONTENTS);
            if (!otmp.unpaid) bidx = -1;
            used = (otmp === item) ? FullyIntact
                : cknown ? KnownContainer : UndisclosedContainer;
        } else {
            quan = otmp.quan | 0;
            cost = (bp.price | 0) * quan;
            used = (quan < (bp.bquan | 0)) ? PartlyIntact : FullyIntact;
        }
        ibill.push({
            obj: otmp,
            quan,
            cost,
            bidx,
            usedup: used,
            queuedpay: false,
        });
    }
    if (ibill.length > 1) ibill.sort(sortbill_cmp);
    return ibill;
}

/**
 * C ref: shk.c menu_pick_pay_items `:1666–1739` — PICK_ANY
 * "Pay for which items?". Used-up / unpaid headings; quan for paydoname.
 * Letter toggle; Return confirms; ESC cancels. SELECT_ALL `.` deferred
 * (session uses item letter `a`).
 */
async function menu_pick_pay_items(ibill) {
    if (!ibill.length) return 0;
    const ibillct = ibill.length;
    let largest = 0;
    for (const e of ibill) {
        if ((e.cost | 0) > largest) largest = e.cost | 0;
    }
    const amtWidth = String(largest).length;
    const items = ibill.map((e, i) => ({
        ibillIdx: i,
        letch: String.fromCharCode('a'.charCodeAt(0) + i),
        selected: false,
        cost: e.cost | 0,
        obj: e.obj,
    }));

    for (;;) {
        const entries = [
            { text: 'Pay for which items?', attr: ATR_INVERSE },
            { text: '', attr: 0 },
        ];
        if ((ibill[0].usedup | 0) <= PartlyUsedUp) {
            const plural = (ibillct > 1
                && (ibill[1].usedup | 0) <= PartlyUsedUp) ? 's' : '';
            entries.push({ text: `Used up item${plural}:`, attr: 0 });
        }
        for (const it of items) {
            const i = it.ibillIdx;
            if (i > 0 && (ibill[i - 1].usedup | 0) <= PartlyUsedUp
                && (ibill[i].usedup | 0) >= PartlyIntact) {
                const plural = (i < ibillct - 1) ? 's' : '';
                entries.push({ text: `Unpaid item${plural}:`, attr: 0 });
            }
            const otmp = it.obj;
            const saveQuan = otmp?.quan;
            if (otmp) otmp.quan = ibill[i].quan;
            const nm = paydoname(otmp);
            if (otmp) otmp.quan = saveQuan;
            const mark = it.selected ? '+' : '-';
            const amt = String(it.cost).padStart(amtWidth, ' ');
            entries.push({
                text: `${it.letch} ${mark} ${amt} Zm, ${nm}`,
                attr: 0,
            });
        }
        await paint_corner_nhw_menu(entries, '(end) ');
        await flush_screen(1);
        const key = await nhgetch();
        game._menu_overlay = false;
        await docrt();
        await flush_screen(1);

        if (key === 27) return 0;
        if (key === 13 || key === 10 || key === 32) {
            let n = 0;
            for (const it of items) {
                if (!it.selected) continue;
                ibill[it.ibillIdx].queuedpay = true;
                n++;
            }
            return n;
        }
        const ch = String.fromCharCode(key);
        const hit = items.find((it) => it.letch === ch);
        if (hit) hit.selected = !hit.selected;
        // invalid (incl. stray `p`/`y`/`W`) → re-prompt like C select_menu
    }
}

/**
 * C ref: shk.c update_bill `:2169–2211` — PartlyUsedUp shrinks bquan;
 * else clear unpaid, OBJ_ONBILL extract+dealloc, swap-remove bill_p
 * slot, remap ibill[].bidx.
 */
function update_bill(indx, ibillct, ibill, eshkp, bp, paiditem) {
    const bill = eshkp.bill_p || eshkp.bill;
    if (indx >= 0 && ibill[indx]?.usedup === PartlyUsedUp) {
        bp.bquan = paiditem.quan | 0;
        for (let j = 0; j < ibillct; j++) {
            if (ibill[j].obj === paiditem && ibill[j].usedup === PartlyIntact) {
                ibill[j].usedup = FullyIntact;
                break;
            }
        }
        return;
    }
    paiditem.unpaid = 0;
    if ((paiditem.where | 0) === OBJ_ONBILL) {
        obj_extract_self(paiditem);
        dealloc_obj(paiditem);
    }
    const newebillct = (eshkp.billct | 0) - 1;
    const bpIdx = bill.indexOf(bp);
    if (bpIdx >= 0 && newebillct >= 0) {
        // C *bp = eshkp->bill_p[newebillct]; leftover slot kept
        bill[bpIdx] = bill[newebillct];
        for (let j = 0; j < ibillct; j++) {
            if (ibill[j].bidx === newebillct) ibill[j].bidx = bpIdx;
        }
    }
    eshkp.billct = Math.max(0, newebillct);
}

/**
 * C ref: shk.c insufficient_funds `:2454–2481` — cost 0 = no gold;
 * cost >0 = not enough for that amount. Messages differ.
 */
async function insufficient_funds(shkp, item, cost) {
    const umoney = money_cnt(game.invent);
    const ecredit = ESHK(shkp)?.credit | 0;
    if (!cost && umoney + ecredit === 0) {
        const stashed_gold = hidden_gold(true);
        await pline(
            `You ${stashed_gold > 0 ? 'seem to ' : ''}have no gold or credit left.`,
        );
        return true;
    }
    if (cost && umoney + ecredit < cost) {
        const stashed_gold = hidden_gold(true);
        await pline(
            `You don't${stashed_gold > 0 ? ' seem to' : ''} have gold${
                ecredit > 0 ? ' or credit' : ''
            } enough to pay for ${paydoname(item)}.`,
        );
        return true;
    }
    return false;
}

/**
 * C ref: shk.c reject_purchase `:2417–2451` — shk won't sell the intact
 * remainder until the used-up portion is paid. Named omit: SetVoice.
 */
async function reject_purchase(shkp, obj, billed_quan) {
    const intact_quan = obj.quan | 0;
    obj.quan = (billed_quan | 0) - intact_quan;
    if (!hero_deaf() && !muteshk(shkp)) {
        let which;
        if ((obj.where | 0) === OBJ_CONTAINED) {
            which = `the one${plur(intact_quan)} in ${thesimpleoname(obj.ocontainer)}`;
        } else {
            which = intact_quan > 1 ? 'these' : 'this one';
        }
        await verbalize(
            `${ANGRY(shkp) ? 'Pay' : 'Please pay'} for the other ${simpleonames(obj)} before buying ${which}.`,
        );
    } else {
        await pline(
            `${Shknam(shkp)} ${ANGRY(shkp) ? 'angrily ' : ''}${
                nolimbs(shkp.data) ? 'motions to' : 'points out'
            } your bill for the other ${simpleonames(obj)} first.`,
        );
    }
    obj.quan = intact_quan;
}

/**
 * C ref: shk.c dopayobj `:2219–2302` — which 0 used-up / 1 unpaid.
 * itemize → y_n Pay? (`:2259–2275`; C y_n ≡ yn_function ynchars 'n').
 * Doname2 is upstart(doname) — do not add clone #4. Named omit: SetVoice.
 */
async function dopayobj(shkp, bp, obj, which, itemize, unseen) {
    if (!obj?.unpaid && !bp?.useup
        && !(Has_contents(obj) && unpaid_cost(obj, COST_CONTENTS))) {
        await impossible('Paid object on bill??');
        return PAY_BUY;
    }
    if (itemize && await insufficient_funds(shkp, obj, 0)) {
        return PAY_BROKE;
    }
    const consumed = (which | 0) === 0;
    const save_quan = obj.quan | 0;
    let quan;
    if (consumed) {
        quan = bp.bquan | 0;
        if (quan > (obj.quan | 0)) quan -= obj.quan | 0;
    } else {
        quan = obj.quan | 0;
    }
    const ltmp = (bp.price | 0) * quan;
    obj.quan = quan;
    if (!game.iflags) game.iflags = {};
    game.iflags.suppress_price = (game.iflags.suppress_price | 0) + 1;
    let buy = PAY_BUY;
    if (itemize) {
        // C `:2268–2274` — qsfx + safe_qbuf(Doname2/doname, ansimpleoname)
        const qsfx = ` for ${ltmp} ${currency(ltmp)}.  Pay?`;
        const qbuf = safe_qbuf(
            null, null, qsfx, obj,
            (quan === 1) ? (o) => upstart(doname(o)) : doname,
            ansimpleoname,
            (quan === 1) ? 'that' : 'those',
        );
        if ((await yn_function(qbuf, 'yn', 'n', true)) === 'n') {
            buy = PAY_SKIP;
        }
    }
    if (quan < (bp.bquan | 0) && !consumed) {
        await reject_purchase(shkp, obj, bp.bquan | 0);
        buy = PAY_SKIP;
    }
    if (buy === PAY_BUY && await insufficient_funds(shkp, obj, ltmp)) {
        buy = itemize ? PAY_SKIP : PAY_CANT;
    }
    if (buy === PAY_BUY) {
        await pay(ltmp, shkp);
        if (!unseen) {
            await shk_names_obj(
                shkp, obj,
                consumed
                    ? 'paid for %s at a cost of %ld gold piece%s.%s'
                    : 'bought %s for %ld gold piece%s.%s',
                ltmp, '',
            );
        }
    }
    obj.quan = save_quan;
    game.iflags.suppress_price = (game.iflags.suppress_price | 0) - 1;
    return buy;
}

/**
 * C ref: shk.c buy_container `:2307–2411` — pay unpaid contents (then
 * the box if unpaid) without itemizing. 0=ok, 1=rejected with message,
 * 2=rejected, caller explains.
 */
async function buy_container(shkp, indx, ibillct, ibill) {
    const boids = [];
    let buycount = 0;
    const eshkp = ESHK(shkp);
    const ebillct = eshkp.billct | 0;
    const bill = eshkp.bill_p || eshkp.bill || [];
    const container = ibill[indx].obj;
    const unpaidcontainer = container.unpaid | 0;
    const totalcost = ibill[indx].cost | 0;
    const sightunseen = ibill[indx].usedup === UndisclosedContainer
        || ibill[indx].usedup === KnownContainer;

    if (await insufficient_funds(shkp, container, 0)
        || await insufficient_funds(shkp, container, totalcost)) {
        return 1;
    }

    for (let i = 0; i < ebillct; i++) {
        const bp = bill[i];
        const otmp = bp_to_obj(bp);
        if (!otmp) {
            await impossible(
                "Can't find contained item on shop bill (#%d).",
                bp?.bo_id | 0,
            );
            return 2;
        }
        if ((otmp.where | 0) !== OBJ_CONTAINED && !Has_contents(otmp)) {
            continue;
        }
        let otop = otmp;
        while ((otop.where | 0) === OBJ_CONTAINED) {
            otop = otop.ocontainer;
            if (!otop) break;
        }
        if (otop !== container) continue;
        if ((otmp.quan | 0) < (bp.bquan | 0)) {
            await reject_purchase(shkp, otmp, bp.bquan | 0);
            return 1;
        }
        if ((bp.bo_id | 0) !== (container.o_id | 0)) {
            boids.push(bp.bo_id | 0);
        }
    }
    if (unpaidcontainer) boids.push(container.o_id | 0);

    for (let j = 0; j < boids.length; j++) {
        const boid = boids[j];
        let i = 0;
        let bp = null;
        for (; i < ebillct; i++) {
            if ((bill[i]?.bo_id | 0) === boid) {
                bp = bill[i];
                break;
            }
        }
        if (i === ebillct || !bp) {
            await impossible(
                'Buying %s contents: item #%d disappeared from bill.',
                simpleonames(container), boid,
            );
            return 2;
        }
        const otmp = bp_to_obj(bp);
        const buy = await dopayobj(shkp, bp, otmp, 1, false, sightunseen);
        if (buy !== PAY_BUY) {
            await impossible(
                'Buying %s contents failed unexpectedly (#%d %d).',
                simpleonames(container), otmp?.o_id | 0, buy,
            );
            continue;
        }
        ibill[indx].cost -= (bp.price | 0) * (bp.bquan | 0);
        update_bill(
            (boid === (container.o_id | 0)) ? indx : -1,
            ibillct, ibill, eshkp, bp, otmp,
        );
        buycount++;
    }
    if (buycount && sightunseen) {
        if (unpaidcontainer) {
            container.unpaid = 1;
            container.no_charge = 1;
        }
        await shk_names_obj(
            shkp, container,
            'bought %s for %ld gold piece%s.%s',
            totalcost, '',
        );
        container.unpaid = 0;
        container.no_charge = 0;
    }
    return buycount ? 0 : 2;
}

/**
 * C ref: shk.c cheapest_item `:1521–1539` — min ibill[].cost.
 * 5.0 walks the itemized bill (partly-used already split) rather than
 * bill_p[]. Empty ibill matches C zerosbi terminator (cost 0).
 */
function cheapest_item(ibillct, ibill) {
    let gmin = ibill[0]?.cost | 0;
    for (let i = 1; i < ibillct; ++i) {
        if ((ibill[i].cost | 0) < gmin) gmin = ibill[i].cost | 0;
    }
    return gmin;
}

/**
 * C ref: shk.c pay_billed_items `:2042–2167` — no-gold / cheapest_item
 * early return (`:2060–2080`) then via_menu (`:2082–2109`).
 * `via_menu = (menu_style != TRADITIONAL)` then `menu_requested` toggle;
 * Traditional `yn_function("Itemized billing?", "ynq m", 'q', TRUE)`
 * (`'m'` loops into the menu; `!more_than_one` auto `'y'`).
 * Menu letters `a`… not `obj.invlet`. C never cmdq_pop here; leftover
 * IA_BUY_OBJ KEY is the next rhack (cmd.c `:3642–3651`).
 */
async function pay_billed_items(shkp, ibillct, ibill, stashed_gold, paidRef) {
    const eshkp = ESHK(shkp);
    const umoney = money_cnt(game.invent);
    if (!umoney && !(eshkp?.credit | 0)) {
        // C You("%shave no gold or credit%s.", seem-to, paid? " left")
        await pline(
            `You ${stashed_gold ? 'seem to ' : ''}have no gold or credit${
                paidRef.paid ? ' left' : ''
            }.`,
        );
        return true;
    }
    const bp0 = (eshkp.bill_p || eshkp.bill || [])[0];
    const otmp0 = bp_to_obj(bp0);
    const ebillct = eshkp.billct | 0;
    const more_than_one = (ebillct > 1
        || ((otmp0?.quan | 0) < (bp0?.bquan | 0))
        || ibill[0]?.usedup === UndisclosedContainer);
    if ((umoney + (eshkp.credit | 0)) < cheapest_item(ibillct, ibill)) {
        await pline(
            `You don't have enough gold to buy${more_than_one ? ' any of' : ''} the item${plur(more_than_one ? 2 : 1)} ${
                ebillct > 1 ? "you've picked" : 'on your bill'
            }.`,
        );
        if (stashed_gold) {
            await pline('Maybe you have some gold stashed away?');
        }
        return true;
    }

    // C `:2082–2109` — Traditional ynq; other styles + `m p` toggle menu.
    // Unset JS menu_style matches options.c `:7258` MENU_FULL, not 0.
    let via_menu = ((game.flags?.menu_style ?? MENU_FULL) !== MENU_TRADITIONAL);
    if (game.iflags?.menu_requested) via_menu = !via_menu;
    let queuedpay = false;
    let itemize = false;
    do {
        if (via_menu) {
            if (!await menu_pick_pay_items(ibill)) {
                return true;
            }
            queuedpay = true;
            itemize = false;
            via_menu = false;
        } else {
            const iprompt = !more_than_one
                ? 'y'
                : await yn_function('Itemized billing?', 'ynq m', 'q', true);
            if (iprompt === 'q') return true;
            itemize = (iprompt === 'y');
            via_menu = (iprompt === 'm');
        }
    } while (via_menu);

    for (let indx = 0; indx < ibillct; indx++) {
        if (queuedpay && !ibill[indx].queuedpay) continue;
        const otmp = ibill[indx].obj;
        let buy;
        if ((ibill[indx].usedup | 0) >= KnownContainer) {
            const boxbag_result = await buy_container(
                shkp, indx, ibillct, ibill,
            );
            if (boxbag_result === 0) {
                buy = PAY_BUY;
            } else {
                if (boxbag_result === 2) {
                    await verbalize(
                        `You need to remove any unpaid items from that ${simpleonames(otmp)} and buy them separately.`,
                    );
                }
                buy = PAY_CANT;
            }
        } else {
            const bidx = ibill[indx].bidx | 0;
            const bp = (eshkp.bill_p || eshkp.bill)[bidx];
            if (!bp || !otmp) continue;
            const pass = ((ibill[indx].usedup | 0) <= PartlyUsedUp) ? 0 : 1;
            buy = await dopayobj(shkp, bp, otmp, pass, itemize, false);
            if (buy === PAY_BUY) {
                update_bill(indx, ibillct, ibill, eshkp, bp, otmp);
            }
        }
        switch (buy) {
        case PAY_CANT:
            return false;
        case PAY_BROKE:
            paidRef.paid = true;
            return true;
        case PAY_SKIP:
            continue;
        case PAY_BUY:
            paidRef.paid = true;
            if (itemize || queuedpay) {
                update_inventory();
                await bot();
            }
            break;
        }
    }
    return true;
}

/** C youprop.h Blind — (H||E) && !B; no sticky u.Blind (D-0716). */
function Blind() {
    const u = game.u || {};
    if (u.uroleplay?.blind) return true;
    return !!(((u.HBlinded | 0) || (u.EBlinded | 0)) && !(u.BBlinded | 0));
}

/** C youprop.h Blind_telepat — HTelepat || ETelepat. */
function Blind_telepat() {
    const u = game.u || {};
    const e = u.uprops?.[TELEPAT];
    return !!((u.HTelepat | 0) || (u.ETelepat | 0)
        || (e?.intrinsic | 0) || (e?.extrinsic | 0));
}

/**
 * C ref: shk.c dopay — #pay / `p`.
 * Covered: nexttosk; Blind/`canspotmon` seensk + You_cant("see...");
 * single resident / single-seen nearness; rouse when owing;
 * peaceful non-resident robbed settle; !bill&&!debit robbed/angry appease;
 * debit pay (credit/money2mon); bill menu → money2mon/splitobj;
 * via_menu `menu_pick_pay_items` (D-1684; leftover IA_BUY_OBJ KEY is
 * next rhack); cheapest_item early return (D-1688); buy_container
 * (D-1702); multi-shk getpos pay-whom (D-1704); thank-you verbalize;
 * ECMD_TIME when paid; FullyUsedUp/PartlyUsedUp (D-1714);
 * Traditional itemize ynq (D-1715).
 * mute/Deaf thank-you nod (D-1716). SetVoice is D-1752.
 */
export async function dopay() {
    game.multi = 0;
    let sk = 0;
    let seensk = 0;
    let nexttosk = 0;
    let nxtm = null;
    let resident = null;
    const stashed_gold = hidden_gold(true) > 0;

    let walk = next_shkp(0, false);
    while (walk.shkp) {
        const m = walk.shkp;
        sk++;
        if (m_next2u(m)) {
            // C: if (nxtm && ANGRY(nxtm)) continue — keep irate priority
            if (!(nxtm && ANGRY(nxtm))) {
                nexttosk++;
                nxtm = m;
            }
        }
        if (canspotmon(m)) seensk++;
        const eshk = ESHK(m);
        const ushops0 = (game.u?.ushops || '').charCodeAt(0) || 0;
        if (inhishop(m) && ushops0 === (eshk?.shoproom | 0)) {
            resident = m;
        }
        walk = next_shkp(walk.nextIdx, false);
    }

    let shkp = null;
    if (nxtm && nexttosk === 1) {
        shkp = nxtm;
    } else if ((!sk && (!Blind() || Blind_telepat())) || (!Blind() && !seensk)) {
        // C: There("appears to be no shopkeeper here...")
        await pline('There appears to be no shopkeeper here to receive your payment.');
        return ECMD_OK;
    } else if (!seensk) {
        // C: You_cant("see...") — Blind and no canspotmon shk
        await pline("You can't see...");
        return ECMD_OK;
    } else if (sk === 1 && resident) {
        shkp = resident;
    } else if (seensk === 1) {
        walk = next_shkp(0, false);
        while (walk.shkp) {
            if (canspotmon(walk.shkp)) {
                shkp = walk.shkp;
                break;
            }
            walk = next_shkp(walk.nextIdx, false);
        }
        if (shkp && shkp !== resident && !m_next2u(shkp)) {
            await pline(`${Shknam(shkp)} is not near enough to receive your payment.`);
            return ECMD_OK;
        }
    } else {
        // C: seensk > 1 — getpos "the creature you want to pay" (`:1814–1856`)
        await pline('Pay whom?');
        const u = game.u || {};
        const cc = { x: u.ux | 0, y: u.uy | 0 };
        if ((await getpos(cc, true, 'the creature you want to pay')) < 0) {
            return ECMD_CANCEL;
        }
        const cx = cc.x | 0;
        const cy = cc.y | 0;
        if (cx < 0) {
            await pline('Try again...');
            return ECMD_OK;
        }
        if (u_at(cx, cy)) {
            await pline('You are generous to yourself.');
            return ECMD_OK;
        }
        const mtmp = m_at(cx, cy);
        if (!cansee(cx, cy) && (!mtmp || !canspotmon(mtmp))) {
            await pline(`You can't ${!Blind() ? 'see' : 'sense'} anyone there.`);
            return ECMD_OK;
        }
        if (!mtmp) {
            await pline('There is no one there to receive your payment.');
            return ECMD_OK;
        }
        if (!mtmp.isshk) {
            await pline(`${Monnam(mtmp)} is not interested in your payment.`);
            return ECMD_OK;
        }
        if (mtmp !== resident && !m_next2u(mtmp)) {
            await pline(`${Shknam(mtmp)} is too far to receive your payment.`);
            return ECMD_OK;
        }
        shkp = mtmp;
    }

    // C: if (!shkp) debugpline0; return ECMD_OK — then proceed
    if (!shkp) return ECMD_OK;

    const eshkp = ESHK(shkp);
    if (!eshkp) return ECMD_OK;

    // C proceed: wake sleeping shk when someone who owes money offers payment
    let ltmp = eshkp.robbed | 0;
    if (ltmp || (eshkp.billct | 0) || (eshkp.debit | 0)) {
        rouse_shk(shkp, true);
    }

    if (helpless(shkp)) {
        await pline(`${Shknam(shkp)} ${rn2(2) ? 'seems to be napping' : "doesn't respond"}.`);
        return ECMD_OK;
    }

    // C: peaceful non-resident — settle robbed gold only (not shop bill)
    if (shkp !== resident && NOTANGRY(shkp)) {
        const umoney = money_cnt(game.invent);
        if (!ltmp) {
            await pline(`You do not owe ${shkname(shkp)} anything.`);
        } else if (!umoney) {
            await pline(`You ${stashed_gold ? 'seem to ' : ''}have no gold.`);
            if (stashed_gold) {
                await pline('But you have some gold stashed away.');
            }
        } else {
            if (umoney > ltmp) {
                await pline(
                    `You give ${shkname(shkp)} the ${ltmp} gold piece${plur(ltmp)} ${noit_mhe(shkp)} asked for.`,
                );
                await pay(ltmp, shkp);
            } else {
                await pline(
                    `You give ${shkname(shkp)} all your${stashed_gold ? ' openly kept' : ''} gold.`,
                );
                await pay(umoney, shkp);
                if (stashed_gold) await pline('But you have hidden gold!');
            }
            if ((umoney < ((ltmp / 2) | 0)) || (umoney < ltmp && stashed_gold)) {
                await pline(`Unfortunately, ${noit_mhe(shkp)} doesn't look satisfied.`);
            } else {
                await make_happy_shk(shkp, false);
            }
        }
        return ECMD_TIME;
    }

    // C: ltmp still eshkp->robbed — no bill/debit → owe-nothing / appease
    if (!(eshkp.billct | 0) && !(eshkp.debit | 0)) {
        const umoney = money_cnt(game.invent);
        if (!ltmp && NOTANGRY(shkp)) {
            await pline(`You do not owe ${shkname(shkp)} anything.`);
            if (!umoney) {
                await pline(
                    `Moreover, you${stashed_gold ? ' seem to' : ''} have no gold.`,
                );
            }
        } else if (ltmp) {
            await pline(`${shkname(shkp)} is after blood, not gold!`);
            if (umoney < ((ltmp / 2) | 0) || (umoney < ltmp && stashed_gold)) {
                if (!umoney) {
                    await pline(
                        `Moreover, you${stashed_gold ? ' seem to' : ''} have no gold.`,
                    );
                } else {
                    await pline(
                        `Besides, you don't have enough to interest ${noit_mhim(shkp)}.`,
                    );
                }
                return ECMD_TIME;
            }
            await pline(
                `But since ${noit_mhis(shkp)} shop has been robbed recently,`,
            );
            await pline(
                `you ${umoney < ltmp ? 'partially ' : ''}compensate ${shkname(shkp)} for ${noit_mhis(shkp)} losses.`,
            );
            await pay(umoney < ltmp ? umoney : ltmp, shkp);
            await make_happy_shk(shkp, false);
        } else {
            // angry, not robbed — door/attack appease
            await pline(`${Shknam(shkp)} is after your hide, not your gold!`);
            if (umoney < 1000) {
                if (!umoney) {
                    await pline(
                        `Moreover, you${stashed_gold ? ' seem to' : ''} have no gold.`,
                    );
                } else {
                    await pline(
                        `Besides, you don't have enough to interest ${noit_mhim(shkp)}.`,
                    );
                }
                return ECMD_TIME;
            }
            const angryNam = canspotmon(shkp)
                ? x_monnam(shkp, ARTICLE_THE, 'angry', 0, false)
                : shkname(shkp);
            await pline(
                `You try to appease ${angryNam} by giving ${noit_mhim(shkp)} 1000 gold pieces.`,
            );
            await pay(1000, shkp);
            const cust = String(eshkp.customer || '');
            const pln = String(game.plname || '').slice(0, 32);
            // C: strncmp(customer, plname, PL_NSIZ) || rn2(3)
            if (cust.toLowerCase() !== pln.toLowerCase() || rn2(3)) {
                await make_happy_shk(shkp, false);
            } else {
                await pline(`But ${shkname(shkp)} is as angry as ever.`);
            }
        }
        return ECMD_TIME;
    }

    if (shkp !== resident) {
        // C: impossible("dopay: not to shopkeeper?"); setpaid(resident)
        if (resident) setpaid(resident);
        return ECMD_OK;
    }

    let paid = false;
    // C: pay debt, if any, first
    if (eshkp.debit | 0) {
        let dtmp = eshkp.debit | 0;
        const loan = eshkp.loan | 0;
        const umoney = money_cnt(game.invent);
        let sbuf = `You owe ${shkname(shkp)} ${dtmp} ${currency(dtmp)} `;
        if (loan) {
            if (loan === dtmp) {
                sbuf += 'you picked up in the store.';
            } else {
                sbuf += 'for gold picked up and the use of merchandise.';
            }
        } else {
            sbuf += 'for the use of merchandise.';
        }
        await pline(sbuf);
        if (umoney + (eshkp.credit | 0) < dtmp) {
            await pline(
                `But you don't${stashed_gold ? ' seem to' : ''} have enough gold${
                    eshkp.credit ? ' or credit' : ''
                }.`,
            );
            return ECMD_TIME;
        }
        if ((eshkp.credit | 0) >= dtmp) {
            eshkp.credit = (eshkp.credit | 0) - dtmp;
            eshkp.debit = 0;
            eshkp.loan = 0;
            await pline('Your debt is covered by your credit.');
        } else if (!(eshkp.credit | 0)) {
            money2mon(shkp, dtmp);
            eshkp.debit = 0;
            eshkp.loan = 0;
            await pline('You pay that debt.');
            if (game.flags) game.flags.botl = true;
        } else {
            dtmp -= eshkp.credit | 0;
            eshkp.credit = 0;
            money2mon(shkp, dtmp);
            eshkp.debit = 0;
            eshkp.loan = 0;
            await pline('That debt is partially offset by your credit.');
            await pline('You pay the remainder.');
            if (game.flags) game.flags.botl = true;
        }
        paid = true;
    }

    let pay_done = true;
    if (eshkp.billct | 0) {
        const ibill = await make_itemized_bill(shkp);
        const paidRef = { paid };
        if (!await pay_billed_items(
            shkp, ibill.length, ibill, stashed_gold, paidRef,
        )) {
            pay_done = false;
        }
        paid = paid || paidRef.paid;
    }

    // C: {mute shk,deaf hero}-aware thank you (`:2011–2025`)
    if (pay_done && !ANGRY(shkp) && paid) {
        const st = shtypes[(eshkp.shoptype | 0) - SHOPBASE];
        const shopNm = st?.name || 'shop';
        const bang = eshkp.surcharge ? '.' : '!';
        if (!hero_deaf() && !muteshk(shkp)) {
            SetVoice(shkp, 0, 80, 0);
            await verbalize(
                `Thank you for shopping in ${s_suffix(shkname(shkp))} ${shopNm}${bang}`,
            );
        } else {
            const nods = eshkp.surcharge ? '' : ' appreciatively';
            await pline(
                `${Shknam(shkp)} nods${nods} at you for shopping in ${noit_mhis(shkp)} ${shopNm}${bang}`,
            );
        }
    }

    if (paid) update_inventory();
    if (game.iflags) game.iflags.menu_requested = false;
    return paid ? ECMD_TIME : ECMD_OK;
}
