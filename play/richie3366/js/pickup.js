// pickup.js — Floor look / autopickup / manual `,` pickup.
// C ref: pickup.c — check_here(), pickup(), pickup_object(), pick_obj(),
//        describe_decor(); hack.c — spoteffects(), dopickup(), pickup_checks().

import { game } from './gstate.js';
import {
    objects_at, obj_extract_self, splitobj, weight, add_to_container,
    place_object, hornoplenty, unbless, mergable, delobj,
} from './mkobj.js';
import {
    look_here, observe_object, dfeature_at, paint_corner_nhw_menu, sortloot,
    let_to_name, DEF_INV_ORDER, prinv, near_capacity, calc_capacity,
    max_capacity,
} from './invent.js';
import { nomul, check_special_room, is_pool, is_lava, in_rooms, dosinkfall, SURFACE_AT, switch_terrain } from './hack.js';
import {
    flush_screen, pline, newsym, docrt, bot, flush_topl_more, canseemon,
    clear_nhwindow_message,
} from './display.js';
import { addinv } from './u_init.js';
import {
    an, doname, xname, cxname, cxname_singular,
    the as theArt, The, body_part_latebound,
} from './objnam.js';
import { can_reach_floor } from './engrave.js';
import {
    ECMD_OK, ECMD_TIME, ECMD_CANCEL, OBJ_FLOOR, OBJ_INVENT, OBJ_MINVENT,
    is_pit, LOST_DROPPED,
    STONE, ICE, MAX_TYPE,
    IS_POOL, IS_LAVA, IS_FURNITURE, IS_WATERWALL, IS_SINK,
    LOOKHERE_PICKED_SOME, LOOKHERE_SKIP_DFEATURE,
    Has_contents, Is_container,
    SORTLOOT_PACK, SORTLOOT_LOOT,
    ALL_TYPES_SELECTED, BUC_BLESSED, BUC_CURSED, BUC_UNCURSED, BUC_UNKNOWN,
    MENU_INVERT_ALL, MENU_SELECT_ALL, MENU_UNSELECT_ALL,
    SHOPBASE,
    SLT_ENCUMBER, MOD_ENCUMBER, HVY_ENCUMBER, EXT_ENCUMBER,
    AUTOUNLOCK_APPLY_KEY,
    nothing_seems_to_happen, engulfing_u,
    HAND,
} from './const.js';
import { t_at, dotrap, NO_TRAP_FLAGS, drown, lava_effects, instapetrify } from './trap.js';
import { nhgetch } from './input.js';
import { m_at } from './mon.js';
import { oclass_to_sym } from './options.js';
import { objectNames, COIN_CLASS } from './objects.js';
import { ATR_INVERSE } from './terminal.js';
import { addtobill, costly_spot, check_unpaid_usage } from './shk.js';
import {
    nohands, M1_NOTAKE, touch_petrifies, poly_when_stoned, is_rider, mons,
    monsterNames,
} from './monsters.js';
import { welded } from './wield.js';
import { yn_function } from './getline.js';
import { cansee } from './vision.js';
import { touch_artifact, youmonst } from './artifact.js';
import { exercise, A_WIS } from './attrib.js';
import { inv_cnt } from './steal.js';
import { trycall, Monnam } from './do_name.js';

/** C ref: mondata.h notake — M1_NOTAKE. */
function notake(ptr) {
    return !!((ptr?.mflags1 ?? 0) & M1_NOTAKE);
}

/* C ref: pickup.c static load-prefix strings for pickup_prinv / lift_object */
const slightloadpfx = 'You have a little trouble';
const moderateloadpfx = 'You have trouble';
const nearloadpfx = 'You have much trouble';
const overloadpfx = 'You have extreme difficulty';

/** C-ish simpleonames — sack family → "bag". */
function simpleonames(obj) {
    const n = objectNames[obj?.otyp];
    if (n === 'SACK' || n === 'OILSKIN_SACK' || n === 'BAG_OF_HOLDING'
        || n === 'BAG_OF_TRICKS') {
        return 'bag';
    }
    return cxname(obj);
}

const BAG_OF_TRICKS = objectNames.indexOf('BAG_OF_TRICKS');
const HORN_OF_PLENTY = objectNames.indexOf('HORN_OF_PLENTY');
const CORPSE = objectNames.indexOf('CORPSE');
const SCR_SCARE_MONSTER = objectNames.indexOf('SCR_SCARE_MONSTER');
const LOADSTONE = objectNames.indexOf('LOADSTONE');
const BOULDER = objectNames.indexOf('BOULDER');
const PM_STONE_GOLEM = monsterNames.indexOf('PM_STONE_GOLEM');
/* C hack.h invlet_basic — a-zA-Z invent slots. */
const INVLET_BASIC = 52;
/* C hack.h stoning_checks — u_safe_from_fatal_corpse tests. */
const st_gloves = 0x1;
const st_corpse = 0x2;
const st_petrifies = 0x4;
const st_resists = 0x8;
const st_all = st_gloves | st_corpse | st_petrifies | st_resists;

/** C ref: objnam.c thesimpleoname — "the" + simpleonames. */
function thesimpleoname(obj) {
    return `the ${simpleonames(obj)}`;
}

/**
 * C ref: objnam.c yname + shk.c shk_your — carried → "your ", else "the ".
 * Named omissions: shk/mon ownership prefixes; artifact pname skip.
 */
function yname(obj) {
    const carried = obj?.where === OBJ_INVENT
        || (game.invent || []).includes(obj);
    return `${carried ? 'your' : 'the'} ${cxname(obj)}`;
}

/**
 * C ref: objnam.c ysimple_name — shk_your + minimal_xname.
 * Named omissions: full minimal_xname / shopkeeper ownership.
 */
function ysimple_name(obj) {
    const carried = obj?.where === OBJ_INVENT
        || (game.invent || []).includes(obj);
    return `${carried ? 'your' : 'the'} ${simpleonames(obj)}`;
}

/** C ref: objnam.c Ysimple_name2 — capitalized ysimple_name. */
function Ysimple_name2(obj) {
    return upstart(ysimple_name(obj));
}

/** C ref: pickup.c reset_justpicked — clear pickup_prev on invent chain. */
export function reset_justpicked(olist) {
    const list = olist || game.invent || [];
    for (const otmp of list) {
        if (otmp) otmp.pickup_prev = 0;
    }
}

/** C ref: hacklib.c upstart — capitalize first letter. */
function upstart(str) {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/** C ref: pickup.c count_justpicked / find_justpicked. */
function count_justpicked(olist) {
    let cnt = 0;
    for (const otmp of olist || []) {
        if (otmp?.pickup_prev) cnt++;
    }
    return cnt;
}
function find_justpicked(olist) {
    for (const otmp of olist || []) {
        if (otmp?.pickup_prev) return otmp;
    }
    return null;
}

/** C ref: pickup.c count_buc subset — bknown blessed/cursed/uncursed/unknown.
 * Coins: flags.goldX → UNKNOWN else UNCURSED.
 */
function count_buc(olist, buc) {
    let cnt = 0;
    for (const otmp of olist || []) {
        if (!otmp) continue;
        if (otmp.oclass === COIN_CLASS) {
            const coinBuc = game.flags?.goldX ? BUC_UNKNOWN : BUC_UNCURSED;
            if (buc === coinBuc) cnt++;
            continue;
        }
        if (!otmp.bknown) {
            if (buc === BUC_UNKNOWN) cnt++;
        } else if (buc === BUC_BLESSED && otmp.blessed) cnt++;
        else if (buc === BUC_CURSED && otmp.cursed) cnt++;
        else if (buc === BUC_UNCURSED && !otmp.blessed && !otmp.cursed) cnt++;
    }
    return cnt;
}

/**
 * C ref: pickup.c describe_decor — mention_decor feedback for features.
 * Branch envelope: dfeature_at + skip open door/doorway; furniture/typ
 * change gate; verbose "There is %s here." Named omissions: Fumbling
 * deferred_decor, waterbody_name swamp/pool rename, ice Norep,
 * back_on_ground after pool/lava/ice, decor_fumble/levitate overrides.
 */
export async function describe_decor() {
    const u = game.u;
    if (!u) return false;

    if (!game.iflags) game.iflags = {};
    const iflags = game.iflags;
    if (iflags.prev_decor == null) iflags.prev_decor = STONE;

    // C: SURFACE_AT (rm.h) via db_under_typ for DRAWBRIDGE_UP (D-1103)
    const ltyp = SURFACE_AT(u.ux, u.uy);
    let dfeature = dfeature_at(u.ux, u.uy);

    // C: skip ordinary open door / doorway (broken/closed still mentioned)
    const doorhere = !!(dfeature && (dfeature === 'open door'
        || dfeature === 'doorway'));
    const waterhere = !!(dfeature && dfeature === 'pool of water');
    if (doorhere || u.Underwater
        || (ltyp === ICE && IS_POOL(iflags.prev_decor))) {
        dfeature = null;
    }

    let res = true;
    if (ltyp === iflags.prev_decor && !IS_FURNITURE(ltyp)) {
        res = false;
    } else if (dfeature) {
        // waterbody_name deferred — keep "pool of water"
        void waterhere;
        if (dfeature !== 'swamp' && ltyp !== ICE) {
            dfeature = an(dfeature);
        }
        let outbuf;
        if (game.flags?.verbose !== false) {
            outbuf = `There is ${dfeature} here.`;
        } else {
            outbuf = `${upstart(dfeature)}.`;
        }
        // C: ICE + mention_decor → Norep; use pline for all (Norep deferred)
        await pline(outbuf);
    } else if (!u.Underwater) {
        // C: back_on_ground when leaving pool/lava/ice — deferred
    }

    // C: only persist prev_decor when mention_decor is On
    iflags.prev_decor = game.flags?.mention_decor ? ltyp : STONE;
    return res;
}

/**
 * C ref: pickup.c check_here — count floor objects and look_here / engr.
 * Named omissions: none for count (uchain skipped ≡C).
 */
export async function check_here(picked_some) {
    const u = game.u;
    if (!u) return;

    let lhflags = picked_some ? LOOKHERE_PICKED_SOME : 0;
    // C: flags.mention_decor → describe_decor; may set LOOKHERE_SKIP_DFEATURE
    if (game.flags?.mention_decor) {
        if (await describe_decor()) {
            lhflags |= LOOKHERE_SKIP_DFEATURE;
        }
    }

    let ct = 0;
    for (let obj = objects_at(u.ux, u.uy); obj; obj = obj.nexthere) {
        // C: if (obj != uchain) ct++; — attached chain is not "here" for look
        if (obj !== u.uchain) ct++;
    }

    if (ct) {
        if (game.context?.run) nomul(0);
        await flush_screen(1);
        await look_here(ct, lhflags);
    } else {
        // C: read_engr_at(u.ux, u.uy) when no floor objects
        const { read_engr_at } = await import('./engrave.js');
        await read_engr_at(u.ux, u.uy);
    }
}

/**
 * C ref: pickup.c pick_obj — extract from floor/minvent, addinv.
 * Shop robshop: temporary ushops → addtobill → restore; remote_burglary deferred.
 * Named omissions: engulfer minvent path; remote_burglary body.
 */
export async function pick_obj(otmp) {
    if (!otmp) return otmp;
    const u = game.u;
    const ox = otmp.ox | 0;
    const oy = otmp.oy | 0;
    const fromfloor = otmp.where === OBJ_FLOOR;
    let robshop = !!(u && !u.uswallow && otmp !== u.uball && costly_spot(ox, oy));

    obj_extract_self(otmp);
    if (fromfloor) newsym(ox, oy);

    if (robshop) {
        const saveushops = u.ushops || '';
        const fakeshop = in_rooms(ox, oy, SHOPBASE).charAt(0) || '';
        u.ushops = fakeshop;
        await addtobill(otmp, true, false, false);
        u.ushops = saveushops;
        robshop = !!(otmp.unpaid && fakeshop && !saveushops.includes(fakeshop));
    }

    const result = await addinv(otmp);
    if (robshop) {
        // remote_burglary(ox, oy) deferred
    }
    return result;
}

/**
 * C ref: pickup.c pickup_prinv — encumbrance-prefix prinv.
 * Limits load-verb feedback to the first item that changes
 * gp.pickup_encumbrance within one pickup/loot operation.
 * Passes lifted `count` so invent.c prinv can show partial + "(N in total)".
 * lift_object yn Continue? reuses the same pfx strings (D-1050).
 */
async function pickup_prinv(obj, count, verb) {
    // C: nearload = near_capacity(); limit feedback via gp.pickup_encumbrance
    const nearload = near_capacity();
    let prefix = null;
    if (nearload !== (game.pickup_encumbrance | 0)) {
        prefix = nearload >= EXT_ENCUMBER ? overloadpfx
            : nearload >= HVY_ENCUMBER ? nearloadpfx
            : nearload >= MOD_ENCUMBER ? moderateloadpfx
            : nearload >= SLT_ENCUMBER ? slightloadpfx
            : null;
        game.pickup_encumbrance = nearload;
    }
    // C: if (prefix) Sprintf(pbuf, "%s %s", prefix, verb); else pbuf=""
    const pbuf = prefix ? `${prefix} ${verb}` : '';
    await prinv(pbuf, obj, count | 0);
}

/* C pickup.c GOLD_WT / GOLD_CAPACITY — coin weight in carry_count. */
function GOLD_WT(n) {
    return Math.trunc((Number(n) + 50) / 100);
}
function GOLD_CAPACITY(w, n) {
    return (Number(w) * -100) - (Number(n) + 50) - 1;
}

function money_cnt_invent() {
    let n = 0;
    for (const otmp of game.invent || []) {
        if (otmp.oclass === COIN_CLASS) n += otmp.quan || 0;
    }
    return n;
}

function otense_pickup(obj, verb) {
    const singular = (obj?.quan || 1) === 1;
    if (verb === 'are') return singular ? 'is' : 'are';
    if (verb === 'turn') return singular ? 'turns' : 'turn';
    return singular ? `${verb}s` : verb;
}

/**
 * C ref: options.c initoptions_init flags.pickup_burden = MOD_ENCUMBER
 * ("stressed"). JS flags may omit the numeric field.
 */
function flags_pickup_burden() {
    const v = game.flags?.pickup_burden;
    if (typeof v === 'number' && v >= 0) return v | 0;
    return MOD_ENCUMBER;
}

function Stone_resistance_hero() {
    const u = game.u || {};
    return !!(u.Stone_resistance || u.HStone_resistance || u.EStone_resistance);
}

/**
 * C ref: invent.c merge_choice — first mergable invent slot.
 * Named omit: shop no_charge / inhishop unpaid reject.
 */
function merge_choice_invent(obj) {
    if (!obj || (obj.otyp | 0) === SCR_SCARE_MONSTER) return null;
    for (const otmp of game.invent || []) {
        if (mergable(otmp, obj)) return otmp;
    }
    return null;
}

/**
 * C ref: pickup.c u_safe_from_fatal_corpse — any listed test is enough.
 */
function u_safe_from_fatal_corpse(obj, tests) {
    if ((tests & st_gloves) && game.u?.uarmg) return true;
    if ((tests & st_corpse) && (obj?.otyp | 0) !== CORPSE) return true;
    if ((tests & st_petrifies) && !touch_petrifies(mons(obj?.corpsenm))) {
        return true;
    }
    if ((tests & st_resists) && Stone_resistance_hero()) return true;
    return false;
}

/**
 * C ref: pickup.c fatal_corpse_mistake — telekinesis/remotely skips touch.
 */
async function fatal_corpse_mistake(obj, remotely) {
    if (u_safe_from_fatal_corpse(obj, st_all) || remotely) return false;
    if (poly_when_stoned(game.youmonst?.data, game.mvitals)) {
        const { polymon } = await import('./polyself.js');
        if (await polymon(PM_STONE_GOLEM)) {
            await flush_topl_more();
            return false;
        }
    }
    await pline(
        `Touching ${an(cxname_singular(obj))} is a fatal mistake.`,
    );
    await instapetrify(cxname_singular(obj));
    return true;
}

/**
 * C ref: pickup.c rider_corpse_revival — still revives when remotely;
 * message is "attempted acquisition" vs "touch".
 */
async function rider_corpse_revival(obj, remotely) {
    if (!obj || (obj.otyp | 0) !== CORPSE
        || !is_rider(mons(obj.corpsenm))) {
        return false;
    }
    await pline(
        `At your ${remotely ? 'attempted acquisition' : 'touch'}, the corpse suddenly moves...`,
    );
    const where = obj.where | 0;
    const corpsex = obj.ox | 0;
    const corpsey = obj.oy | 0;
    const cname = cxname_singular(obj);
    const { revive } = await import('./zap.js');
    const mtmp = await revive(obj, false);
    if (mtmp && where === OBJ_FLOOR
        && (cansee(corpsex, corpsey) || canseemon(mtmp))) {
        if (canseemon(mtmp)) {
            await pline(`${Monnam(mtmp)} rises from the dead!`);
        } else {
            await pline(`${The(cname)} disappears!`);
        }
    }
    exercise(A_WIS, false);
    return true;
}

/**
 * C ref: pickup.c carry_count — how many of obj can we lift.
 * Floor path only (container/delta_cwt named omit — pickup_object
 * always passes container NULL).
 */
async function carry_count(obj, count, telekinesis, wts) {
    const is_gold = obj.oclass === COIN_CLASS;
    const savequan = obj.quan || 1;
    const saveowt = obj.owt | 0;
    const umoney = money_cnt_invent();
    let iw = max_capacity();
    let wt;

    if (count !== savequan) {
        obj.quan = count;
        obj.owt = weight(obj);
    }
    wt = iw + (obj.owt | 0);
    if (is_gold) {
        wt -= (GOLD_WT(umoney) + GOLD_WT(count) - GOLD_WT(umoney + count));
    }
    if (count !== savequan) {
        obj.quan = savequan;
        obj.owt = saveowt;
    }
    wts.before = iw;
    wts.after = wt;
    if (wt < 0) return count;

    let qq;
    if (is_gold) {
        iw -= GOLD_WT(umoney) | 0;
        qq = GOLD_CAPACITY(iw, umoney);
        if (qq < 0) qq = 0;
        else if (qq > count) qq = count;
        wt = iw + GOLD_WT(umoney + qq);
    } else if (count > 1 || count < (obj.quan || 1)) {
        qq = 1;
        for (; qq <= count; qq++) {
            obj.quan = qq;
            const ow = weight(obj);
            obj.owt = ow;
            if (iw + ow >= 0) break;
            wt = iw + ow;
        }
        qq -= 1;
    } else {
        qq = 0;
    }
    obj.quan = savequan;
    obj.owt = saveowt;

    if (qq < count) {
        const obj_nambuf = doname(obj);
        const where = 'lying here';
        const verb = telekinesis ? 'acquire' : 'lift';
        if (qq > 0) {
            await pline(
                `You can only ${verb} ${qq === 1 ? 'one' : 'some'} of the ${obj_nambuf} ${where}.`,
            );
            wts.after = wt;
            return qq;
        }
        const inventOrGold = (game.invent && game.invent.length) || umoney;
        const prefx1 = inventOrGold ? 'you cannot ' : ((obj.quan || 1) === 1 ? 'it ' : 'even one ');
        const prefx2 = inventOrGold ? '' : 'is too heavy for you to ';
        const suffx = inventOrGold ? ' any more' : '';
        await pline(
            `There ${otense_pickup(obj, 'are')} ${obj_nambuf} here, but ${prefx1}${prefx2}${verb}${suffx}.`,
        );
        return 0;
    }
    return qq;
}

/**
 * C ref: pickup.c lift_object — willing/able to carry. telekinesis
 * skips the ynq Continue? and refuses when encumbrance would rise.
 * Sokoban boulder uses body_part(HAND) (latebound; polyself→do→pickup cycle).
 * Named omit: LOADSTONE/giant-boulder weight override; container path;
 * shop no_charge merge_choice.
 */
async function lift_object(obj, cntRef, telekinesis) {
    // C: #define Sokoban svl.level.flags.sokoban_rules — not In_sokoban.
    const Sokoban = !!(game.level?.flags?.sokoban_rules || game.Sokoban);
    if ((obj.otyp | 0) === BOULDER && Sokoban) {
        await pline(
            `You cannot get your ${body_part_latebound(HAND)} around this ${xname(obj)}.`,
        );
        return -1;
    }
    cntRef.count = await carry_count(obj, cntRef.count, telekinesis, cntRef);
    if (cntRef.count < 1) return -1;
    if (obj.oclass !== COIN_CLASS
        && inv_cnt(false) >= INVLET_BASIC
        && !merge_choice_invent(obj)) {
        await pline('Your knapsack cannot accommodate any more items.');
        return -1;
    }
    let result = 1;
    let prev_encumbr = near_capacity();
    const burden = flags_pickup_burden();
    if (prev_encumbr < burden) prev_encumbr = burden;
    const next_encumbr = calc_capacity(cntRef.after - cntRef.before);
    if (next_encumbr > prev_encumbr) {
        if (telekinesis) {
            result = 0;
        } else {
            const pfx = next_encumbr >= EXT_ENCUMBER ? overloadpfx
                : next_encumbr >= HVY_ENCUMBER ? nearloadpfx
                    : next_encumbr >= MOD_ENCUMBER ? moderateloadpfx
                        : slightloadpfx;
            const savequan = obj.quan;
            obj.quan = cntRef.count;
            const qbuf = `${pfx} lifting ${doname(obj)}.  Continue?`;
            obj.quan = savequan;
            const ans = await yn_function(qbuf, 'ynq', 'q');
            if (ans === 'q') result = -1;
            else if (ans === 'n') result = 0;
            clear_nhwindow_message();
        }
    }
    if ((obj.otyp | 0) === SCR_SCARE_MONSTER && result <= 0) obj.spe = 0;
    return result;
}

/**
 * C ref: pickup.c pickup_object — lift one floor/minvent object into invent.
 * Branch envelope: observe_object; telekinesis through corpse/scare/
 * lift_object (D-1050); gold disp.botl; splitobj; pick_obj + prinv.
 * Named omissions: LOADSTONE no-split already honored; ghostly
 * fix_ghostly_obj; LOADSTONE/giant-boulder weight override;
 * container carry_count; Death/Pestilence revive suffixes.
 */
export async function pickup_object(obj, count, telekinesis) {
    if (!obj) return 0;
    const remotely = !!telekinesis;

    if ((obj.quan || 1) < count) return 0;
    // JS callers pass 0 for "all"; C menu/autopick fill quan
    // (pickup.c query_objlist: -1 / oversize → curr->quan).
    if (!count) count = obj.quan || 1;

    if (!game.u?.Blind) observe_object(obj);

    if (obj === game.u?.uchain) return 0;
    if ((obj.where | 0) === OBJ_MINVENT && (obj.owornmask | 0)
        && engulfing_u(obj.ocarry)) {
        await pline(`You can't pick ${ysimple_name(obj)} up.`);
        return 0;
    }
    if (obj.oartifact && !touch_artifact(obj, youmonst)) return 0;

    if ((obj.otyp | 0) === CORPSE) {
        if (await fatal_corpse_mistake(obj, remotely)
            || await rider_corpse_revival(obj, remotely)) {
            return -1;
        }
    } else if ((obj.otyp | 0) === SCR_SCARE_MONSTER) {
        const scareWts = { before: 0, after: 0 };
        // C scare carry_count always FALSE even on telekinesis pickup.
        count = await carry_count(obj, count, false, scareWts);
        if (count < 1) return -1;
        if (count > 0 && count < (obj.quan || 1)) obj = splitobj(obj, count);
        if (obj.blessed) {
            unbless(obj);
        } else if (!(obj.spe | 0) && !obj.cursed) {
            obj.spe = 1;
        } else {
            const q = obj.quan || 1;
            await pline(
                `The scroll${q === 1 ? '' : 's'} ${otense_pickup(obj, 'turn')} to dust as you ${remotely ? 'raise' : 'pick'} ${q === 1 ? 'it' : 'them'} up.`,
            );
            await trycall(obj);
            delobj(obj);
            return 1;
        }
    }

    const lifted = { count, before: 0, after: 0 };
    const res = await lift_object(obj, lifted, remotely);
    if (res <= 0) return res;
    count = lifted.count;

    if (obj.oclass === COIN_CLASS) {
        if (!game.flags) game.flags = {};
        game.flags.botl = true;
        if (game.disp) game.disp.botl = true;
    }
    if ((obj.quan || 1) !== count && (obj.otyp | 0) !== LOADSTONE) {
        obj = splitobj(obj, count);
    }

    obj = await pick_obj(obj);
    if (game.u?.uwep && game.u.uwep === obj) game.mrg_to_wielded = true;
    await pickup_prinv(obj, count, 'lifting');
    game.mrg_to_wielded = false;
    return 1;
}

/**
 * C ref: pickup.c query_objlist + select_menu(PICK_ANY) — floor pickup menu.
 * Letter toggles selection; Return/Enter confirms; ESC cancels.
 * `@` MENU_INVERT_ALL / `.` SELECT_ALL / `-` UNSELECT_ALL (tty wintty).
 * INVORDER_SORT (sortpack): pack-order class headings via let_to_name;
 * menu letters assigned in that display order (no USE_INVLET on floor).
 * Sort: sortloot(SORTLOOT_LOOT|PACK) + nexthere (D-0405).
 * Named omissions: FEEL_COCKATRICE; count-N; allow-filter;
 * menu_head_objsym; INCLUDE_VENOM; traditional query_classes; engulfer;
 * loot_classify subclass/disco/BUCX; SKIPINVERT; page invert/search.
 */
async function query_objlist_pickup(objList) {
    const flags = game.flags || {};
    const doSort = flags.sortpack !== false;
    // C: sortflags — sortloot 'l'/'f' + !USE_INVLET → SORTLOOT_LOOT;
    // sortpack → SORTLOOT_PACK. Floor pile is a nexthere chain.
    const sortlootOpt = flags.sortloot ?? 'l';
    let sortflags = 0;
    if (sortlootOpt === 'l' || sortlootOpt === 'f') sortflags |= SORTLOOT_LOOT;
    if (doSort) sortflags |= SORTLOOT_PACK;

    const allow = new Set(objList);
    const head = objList[0] || null;
    const ranked = head
        ? sortloot(head, sortflags, true).filter((s) => allow.has(s.obj))
        : [];

    const items = [];
    let nextLet = 'a'.charCodeAt(0);
    let first = true;
    for (const { obj } of ranked) {
        let letch;
        // C: !USE_INVLET → '$' only when the first menu item is a coin
        if (first && obj.oclass === COIN_CLASS) {
            letch = '$';
        } else {
            letch = String.fromCharCode(nextLet++);
            if (nextLet > 'z'.charCodeAt(0)) nextLet = 'A'.charCodeAt(0);
        }
        first = false;
        items.push({ obj, letch, selected: false, oclass: obj.oclass });
    }

    for (;;) {
        const entries = [
            { text: 'Pick up what?', attr: ATR_INVERSE },
            { text: '', attr: 0 },
        ];
        if (doSort) {
            let lastClass = null;
            for (const it of items) {
                if (it.oclass !== lastClass) {
                    entries.push({
                        text: let_to_name(it.oclass, false, false),
                        attr: ATR_INVERSE,
                    });
                    lastClass = it.oclass;
                }
                const mark = it.selected ? '+' : '-';
                entries.push({
                    text: `${it.letch} ${mark} ${doname(it.obj)}`,
                    attr: 0,
                });
            }
        } else {
            for (const it of items) {
                const mark = it.selected ? '+' : '-';
                entries.push({
                    text: `${it.letch} ${mark} ${doname(it.obj)}`,
                    attr: 0,
                });
            }
        }
        await paint_corner_nhw_menu(entries, '(end) ');
        await flush_screen(1);
        const key = await nhgetch();
        game._menu_overlay = false;
        await docrt();
        await flush_screen(1);

        if (key === 27) return [];
        if (key === 13 || key === 10 || key === 32) {
            return items.filter((it) => it.selected).map((it) => it.obj);
        }
        const ch = String.fromCharCode(key);
        // C: wintty.c MENU_INVERT_ALL / SELECT_ALL / UNSELECT_ALL
        if (ch === MENU_INVERT_ALL) {
            for (const it of items) it.selected = !it.selected;
            continue;
        }
        if (ch === MENU_SELECT_ALL) {
            for (const it of items) it.selected = true;
            continue;
        }
        if (ch === MENU_UNSELECT_ALL) {
            for (const it of items) it.selected = false;
            continue;
        }
        const hit = items.find((it) => it.letch === ch);
        if (hit) hit.selected = !hit.selected;
        // invalid → re-prompt
    }
}

/**
 * C ref: pickup.c autopick_testobj — pickup_types symbol filter.
 * JS pickup_types is the display-symbol string; empty ⇒ all classes.
 * Deferred: costly_spot shop reject, pickup_thrown/stolen/nopick_dropped,
 * how_lost, autopickup exceptions.
 */
function autopick_testobj(otmp) {
    const otypes = String(game.flags?.pickup_types || '');
    if (!otypes) return true;
    const sym = oclass_to_sym(otmp.oclass);
    return !!(sym && otypes.includes(sym));
}

/**
 * C ref: pickup.c pickup(what).
 * Ported envelope: autopickup && (nopick / !OBJ_AT / pool / lava) →
 * describe_decor + read_engr_at; **multi/!pickup/notake** share one
 * gate (C pickup.c) so notake still plines under autopickup when
 * `flags.pickup` is off (D-0928 #1127); autopick filter (D-0368) then
 * **always** check_here(n_picked>0) (D-0387); manual `,`
 * AUTOSELECT_SINGLE / multi query_objlist PICK_ANY (D-0365).
 * Deferred: unconscious skip, traditional yn/query_classes, hideunder,
 * newsym_force, full is_pool.
 */
export async function pickup(what) {
    const autopickup = what > 0;
    const count = what < 0 ? -what : 0;
    const u = game.u;
    if (!u) return 0;

    // C: gp.pickup_encumbrance = 0 — used by pickup_object for load feedback
    game.pickup_encumbrance = 0;

    // C: autopickup && (nopick || !OBJ_AT || pool || lava)
    if (autopickup) {
        const loc = game.level?.at(u.ux, u.uy);
        const typ = loc?.typ;
        const poolish = IS_POOL(typ) && !u.Underwater;
        const lavaish = IS_LAVA(typ);
        if (game.context?.nopick || !objects_at(u.ux, u.uy)
            || poolish || lavaish) {
            if (game.flags?.mention_decor) await describe_decor();
            const { read_engr_at } = await import('./engrave.js');
            await read_engr_at(u.ux, u.uy);
            return 0;
        }
    }

    if (!can_reach_floor(true)) {
        // C: describe_decor even when !mention_decor; read_engr arms partial
        await describe_decor();
        return 0;
    }

    // C ref: pickup.c pickup — multi/!pickup/notake share one gate so
    // notake still plines under autopickup when flags.pickup is off
    // (poly brown mold onto loot; D-0928 #1127).
    if (!u.uswallow) {
        const youdata = game.youmonst?.data;
        const nt = notake(youdata);
        if (((game.multi | 0) && !game.context?.run)
            || (autopickup && !game.flags?.pickup)
            || nt) {
            if (objects_at(u.ux, u.uy)
                && game.context?.run && game.context.run !== 8
                && !game.context?.nopick) {
                nomul(0);
            }
            await check_here(false);
            if (nt && objects_at(u.ux, u.uy)
                && (autopickup || game.flags?.pickup)) {
                await pline(
                    'You are physically incapable of picking anything up.',
                );
            }
            return 0;
        }
    }

    // C: OBJ_AT && run && run != 8 && !nopick → nomul(0) before pick
    if (!u.uswallow && objects_at(u.ux, u.uy)
        && game.context?.run && game.context.run !== 8
        && !game.context?.nopick) {
        nomul(0);
    }

    const objList = [];
    for (let obj = objects_at(u.ux, u.uy); obj; obj = obj.nexthere) {
        objList.push(obj);
    }
    // C: autopick → filter by pickup_types before picking
    const eligible = autopickup
        ? objList.filter((o) => autopick_testobj(o))
        : objList;
    const ct = eligible.length;

    if (autopickup) {
        // C: autopick → menu_pickup loop → check_here(n_picked > 0)
        // even when n==0 (ineligible / filtered objects still shown).
        const nTried = eligible.length; // C: n_tried = n before loop
        let nPicked = 0;
        // C: if (n > 0) reset_justpicked(invent) before pickup_object loop
        if (nTried > 0) reset_justpicked(game.invent);
        for (const otmp of eligible) {
            const res = await pickup_object(otmp, 0, false);
            if (res < 0) break;
            nPicked += res;
        }
        if (!u.uswallow) {
            // hideunder / newsym_force deferred
            await check_here(nPicked > 0);
        }
        // C: pickupdone — gp.pickup_encumbrance = 0
        game.pickup_encumbrance = 0;
        return nTried > 0 ? 1 : 0;
    }

    if (ct === 0) {
        game.pickup_encumbrance = 0;
        return 0;
    }

    // C: menu_style != TRADITIONAL → query_objlist + AUTOSELECT_SINGLE
    // One eligible object: auto-select without menu (no extra keys).
    if (ct === 1) {
        const first = eligible[0];
        const lcount = count > 0
            ? Math.min(first.quan || 1, count)
            : 0;
        // C: if (n > 0) reset_justpicked before pickup_object
        reset_justpicked(game.invent);
        const res = await pickup_object(first, lcount, false);
        game.pickup_encumbrance = 0;
        return res > 0 ? 1 : 0;
    }

    // C: query_objlist("Pick up what?", …, PICK_ANY) then pickup_object each
    // Traditional query_classes path deferred (default menu ≠ TRADITIONAL).
    const pickList = await query_objlist_pickup(eligible);
    if (!pickList.length) {
        game.pickup_encumbrance = 0;
        return 0;
    }
    // C: if (n > 0) reset_justpicked(invent)
    reset_justpicked(game.invent);
    let nTried = 0;
    for (const obj of pickList) {
        // Object may already be gone if prior pick extracted a stack sibling
        if (!obj || obj.where !== OBJ_FLOOR) continue;
        const lcount = count > 0
            ? Math.min(obj.quan || 1, count)
            : 0;
        const res = await pickup_object(obj, lcount, false);
        if (res < 0) break;
        nTried += res;
    }
    game.pickup_encumbrance = 0;
    return nTried > 0 ? 1 : 0;
}

/**
 * C ref: hack.c pickup_checks — preflight for #pickup / `,`.
 * Returns >=0 → dopickup done (1=TIME, 0=OK); -1 → normal pickup;
 * -2 engulfer loot deferred as 0.
 * Named omissions: pool/lava dive plines; furniture-specific nothing msgs
 * (generic "nothing here" used); engulfer tongue/loot_mon.
 */
function pickup_checks() {
    const u = game.u;
    if (!u) return 0;

    if (u.uswallow) {
        // loot_mon / tongue paths deferred
        return 0;
    }
    if (!objects_at(u.ux, u.uy)) return 0; // nothing / furniture → ECMD_OK
    if (!can_reach_floor(true)) return 0;
    return -1;
}

/**
 * C ref: hack.c dopickup — `#pickup` / `,` command.
 * Clears multi + command_count; pickup_checks then pickup(-count).
 */
export async function dopickup() {
    const count = (game.context?.command_count | 0);
    if (game.context) game.context.command_count = 0;
    game.multi = 0;

    const ret = pickup_checks();
    if (ret >= 0) {
        if (ret === 0 && !objects_at(game.u?.ux, game.u?.uy)) {
            await pline('There is nothing here to pick up.');
        }
        return ret ? ECMD_TIME : ECMD_OK;
    }
    // ret == -1: normal floor pickup
    const tried = await pickup(-count);
    return tried ? ECMD_TIME : ECMD_OK;
}

/**
 * C ref: hack.c pooleffects(newspot).
 * Branch envelope: enter pool/lava → drown/lava_effects; leave-water /
 * set_uinwater / steed / ceiling_hider / Wwalking arms deferred.
 * @returns {Promise<boolean>} true → skip rest of spoteffects
 */
export async function pooleffects(newspot) {
    const u = game.u;
    if (!u) return false;

    // leaving-water arm deferred

    if (!u.ustuck && !u.Levitation && !u.Flying
        && (is_pool(u.ux, u.uy) || is_lava(u.ux, u.uy))) {
        // steed / ceiling_hider deferred
        if (is_lava(u.ux, u.uy)) {
            if (await lava_effects()) return true;
        } else {
            // C: (!Wwalking || waterwall) && (newspot || !uinwater || !(Swim|…))
            const typ = game.level?.at(u.ux, u.uy)?.typ;
            const waterwall = IS_WATERWALL(typ);
            if (waterwall || newspot || !u.uinwater) {
                if (await drown()) return true;
            }
        }
    }
    return false;
}

/**
 * C ref: hack.c spoteffects(pick).
 * Ported envelope: dest-typ / MAX_TYPE switch_terrain (D-1268) before
 * pooleffects; check_special_room; IS_SINK+Levitation dosinkfall
 * (D-0976); when !in_steed_dismounting — non-pit pickup then dotrap
 * then pit pickup.
 * Deferred: recursion guards, levitation timeout adjust, Warning ice,
 * hidden monster surprise. digactualhole PIT/HOLE is D-1269.
 * **maketrap PIT/HOLE set_levltyp D-1280**.
 * dothrow hurtle / u_on_rndspot / objnam wish still call
 * switch_terrain themselves. set_uinwater is D-1267.
 */
export async function spoteffects(pick) {
    const u = game.u;
    if (u) {
        /* C hack.c:3342–3347 — moving onto different terrain may toggle
         * Lev/Fly. Level change sets <ux0,uy0> to <ux,uy> so dest==origin
         * then, but also sets iflags.terrain_typ = MAX_TYPE. */
        const dest = game.level?.at(u.ux | 0, u.uy | 0);
        const orig = game.level?.at(u.ux0 | 0, u.uy0 | 0);
        if ((dest?.typ | 0) !== (orig?.typ | 0)
            || (game.iflags?.terrain_typ | 0) === MAX_TYPE) {
            await switch_terrain();
        }
    }

    if (await pooleffects(true)) return;

    await check_special_room(false);

    if (u) {
        const typ = game.level?.at(u.ux | 0, u.uy | 0)?.typ;
        if (IS_SINK(typ) && Levitation_pe()) {
            await dosinkfall();
            if (game.program_state?.gameover) return;
        }
    }

    // C: entire pickup/dotrap block gated on !gi.in_steed_dismounting
    if (game.in_steed_dismounting) return;
    if (!u) return;

    const trap = t_at(u.ux, u.uy);
    const pit = !!(trap && is_pit(trap.ttyp));
    if (pick && !pit) await pickup(1);
    if (trap) await dotrap(trap, NO_TRAP_FLAGS);
    if (pick && pit) await pickup(1);
}

/** C youprop.h Levitation — (H||E) && !B. */
function Levitation_pe() {
    const u = game.u || {};
    if (u.Levitation) return true;
    return !!(((u.HLevitation | 0) || (u.ELevitation | 0))
        && !(u.BLevitation | 0));
}

/**
 * C ref: end.c container_contents — NHW_MENU "Contents of %s:" + doname lines
 * via invent.c sortloot(SORTLOOT_LOOT|SORTLOOT_PACK). display_nhwindow(TRUE).
 * Named omissions: identified discover path; unpaid doname (D-0461);
 * nested containers / Schroedinger / empty pline beyond reportempty=false;
 * sortloot subclass/disco/BUCX.
 */
async function container_contents(box) {
    if (!box) return;
    box.cknown = 1;
    const { doname, xname, the: theArt } = await import('./objnam.js');
    const { show_nhw_menu_text } = await import('./pager.js');
    const lines = [`Contents of ${theArt(xname(box))}:`, ''];
    if (box.cobj) {
        // C: flags.sortloot 'l'/'f' → SORTLOOT_LOOT; sortpack → SORTLOOT_PACK
        const flags = game.flags || {};
        const sortlootOpt = flags.sortloot ?? 'l';
        let sortflags = 0;
        if (sortlootOpt === 'l' || sortlootOpt === 'f') sortflags |= SORTLOOT_LOOT;
        if (flags.sortpack !== false) sortflags |= SORTLOOT_PACK;
        const sorted = sortloot(box.cobj, sortflags, false);
        for (const srtc of sorted) {
            lines.push(`  ${doname(srtc.obj)}`);
        }
    }
    await show_nhw_menu_text(lines);
}

/**
 * C ref: pickup.c out_container — remove one object from current_container
 * into invent. Branch envelope: gold / ordinary; lift always ok. Named
 * omissions: container `lift_object`/`delta_cwt` (floor path is D-1050);
 * artifact touch; fatal corpse; split count; icebox; shop bill; pick_pick.
 * @returns {number} -1 stop, 1 removed, 0 not removed
 */
async function out_container(obj) {
    if (!obj || !game._current_container) return -1;
    const is_gold = obj.oclass === COIN_CLASS;
    if (is_gold) obj.owt = weight(obj);

    // lift_object deferred — always allow
    // C: count before addinv merge (gold may grow; prinv total_of needs it)
    const count = obj.quan || 1;
    obj_extract_self(obj);
    game._current_container.owt = weight(game._current_container);

    const otmp = await addinv(obj);
    // C: pickup_prinv(otmp, count, "removing")
    await pickup_prinv(otmp, count, 'removing');
    if (is_gold) {
        // C: bot() — update gold piece count immediately (before later More)
        await bot();
    }
    return 1;
}

/**
 * C ref: pickup.c in_or_out_menu — NHW_MENU PICK_ONE for bag actions.
 * Branch envelope: look/take-out/put-in/both/reversed/stash/done;
 * flags.lootabc → display a/b/c/d/e else o/i/b/r/s; returns :oibrsnq.
 * Named omissions: more_containers 'n' default.
 */
async function in_or_out_menu(prompt, obj, outokay, inokay, alreadyused) {
    // C: lootchars[] = "_:oibrsnq", abc_chars[] = "_:abcdenq"
    // menuselector = flags.lootabc ? abc_chars : lootchars
    const lootabc = !!(game.flags && game.flags.lootabc);
    const accel = lootabc
        ? {
            look: ':', out: 'a', in: 'b', both: 'c', rev: 'd', stash: 'e',
            next: 'n', quit: 'q',
        }
        : {
            look: ':', out: 'o', in: 'i', both: 'b', rev: 'r', stash: 's',
            next: 'n', quit: 'q',
        };
    // C maps menu index → :oibrsnq regardless of displayed selectors.
    const ret = {
        look: ':', out: 'o', in: 'i', both: 'b', rev: 'r', stash: 's',
        next: 'n', quit: 'q',
    };

    // C tty_end_menu: prompt uses tty_menu_promptstyle (= menu_headings,
    // default ATR_INVERSE); blank separator; then add_menu items.
    const entries = [{ text: prompt, attr: ATR_INVERSE }, { text: '', attr: 0 }];
    const simple = thesimpleoname(obj); // "the bag"
    entries.push({
        text: `${accel.look} - Look inside ${simple}`,
        attr: 0, sel: accel.look, ret: ret.look,
    });
    if (outokay) {
        entries.push({
            text: `${accel.out} - take something out`,
            attr: 0, sel: accel.out, ret: ret.out,
        });
    }
    if (inokay) {
        entries.push({
            text: `${accel.in} - put something in`,
            attr: 0, sel: accel.in, ret: ret.in,
        });
    }
    if (outokay) {
        entries.push({
            text: inokay
                ? `${accel.both} - both; take out, then put in`
                : `${accel.both} - take out, then put in`,
            attr: 0, sel: accel.both, ret: ret.both,
        });
    }
    if (inokay) {
        entries.push({
            text: outokay
                ? `${accel.rev} - both reversed; put in, then take out`
                : `${accel.rev} - put in, then take out`,
            attr: 0, sel: accel.rev, ret: ret.rev,
        });
        entries.push({
            text: `${accel.stash} - stash one item into ${simple}`,
            attr: 0, sel: accel.stash, ret: ret.stash,
        });
    }
    entries.push({ text: '', attr: 0 });
    // C: MENU_ITEMFLAGS_SELECTED on default → process_menu_window paints
    // '*' at the '-' slot (wintty.c n==2 && selected).
    entries.push({
        text: `${accel.quit} * ${alreadyused ? 'done' : 'do nothing'}`,
        attr: 0, sel: accel.quit, ret: ret.quit,
    });

    const bySel = new Map();
    for (const e of entries) {
        if (e.sel) bySel.set(e.sel, e.ret || e.sel);
    }

    for (;;) {
        await paint_corner_nhw_menu(
            entries.map((e) => ({ text: e.text, attr: e.attr || 0 })),
            '(end) ',
        );
        await flush_screen(1);
        const key = await nhgetch();
        game._menu_overlay = false;
        await docrt();
        await flush_screen(1);

        if (key === 27) return 'q';
        const ch = String.fromCharCode(key);
        if (bySel.has(ch)) return bySel.get(ch);
    }
}

/**
 * C ref: pickup.c query_category for MENU_FULL menu_loot.
 * Shared put-in / take-out category filter. `@` = MENU_INVERT_ALL
 * (skipInvert rows untouched). Named omissions: unpaid/billed;
 * ParanoidAutoAll; WORN_TYPES; venom.
 */
async function query_loot_category(olist, prompt) {
    const classes = [];
    for (const oc of DEF_INV_ORDER) {
        if (olist.some((o) => o.oclass === oc)) classes.push(oc);
    }
    const showAll = classes.length > 1;

    const doBlessed = count_buc(olist, BUC_BLESSED) > 0;
    const doCursed = count_buc(olist, BUC_CURSED) > 0;
    const doUncursed = count_buc(olist, BUC_UNCURSED) > 0;
    const doUnknown = count_buc(olist, BUC_UNKNOWN) > 0;

    const rows = [];
    rows.push({
        sel: 'A', accel: null, value: 'A', skipInvert: true,
        label: 'Auto-select every relevant item',
    });
    rows.push({ kind: 'hint', label: '    (ignored unless some other choices are also picked)' });
    rows.push({ kind: 'blank' });
    let invlet = 'a'.charCodeAt(0);
    if (showAll) {
        rows.push({
            sel: String.fromCharCode(invlet++), accel: null,
            value: ALL_TYPES_SELECTED, skipInvert: true,
            label: 'All types',
        });
    }
    for (const oc of classes) {
        const sel = String.fromCharCode(invlet++);
        rows.push({
            sel, accel: oclass_to_sym(oc) || null, value: oc, skipInvert: false,
            label: let_to_name(oc, false, false),
        });
    }
    if (doBlessed || doCursed || doUncursed || doUnknown) {
        rows.push({ kind: 'blank' });
    }
    if (doBlessed) {
        rows.push({
            sel: 'B', accel: null, value: 'B', skipInvert: true,
            label: 'Items known to be Blessed',
        });
    }
    if (doCursed) {
        rows.push({
            sel: 'C', accel: null, value: 'C', skipInvert: true,
            label: 'Items known to be Cursed',
        });
    }
    if (doUncursed) {
        rows.push({
            sel: 'U', accel: null, value: 'U', skipInvert: true,
            label: 'Items known to be Uncursed',
        });
    }
    if (doUnknown) {
        rows.push({
            sel: 'X', accel: null, value: 'X', skipInvert: true,
            label: 'Items of unknown Bless/Curse status',
        });
    }

    const selected = new Set();
    for (;;) {
        const entries = [
            { text: prompt, attr: ATR_INVERSE },
            { text: '', attr: 0 },
        ];
        for (const row of rows) {
            if (row.kind === 'blank') {
                entries.push({ text: '', attr: 0 });
                continue;
            }
            if (row.kind === 'hint') {
                entries.push({ text: row.label, attr: 0 });
                continue;
            }
            const mark = selected.has(row.value) ? '+' : '-';
            entries.push({ text: `${row.sel} ${mark} ${row.label}`, attr: 0 });
        }
        await paint_corner_nhw_menu(entries, '(end) ');
        await flush_screen(1);
        const key = await nhgetch();
        game._menu_overlay = false;
        await docrt();
        await flush_screen(1);

        if (key === 27) return null;
        if (key === 13 || key === 10 || key === 32) {
            return selected.size ? selected : null;
        }
        const ch = String.fromCharCode(key);
        if (ch === MENU_INVERT_ALL) {
            for (const row of rows) {
                if (row.value == null || row.skipInvert) continue;
                if (selected.has(row.value)) selected.delete(row.value);
                else selected.add(row.value);
            }
            continue;
        }
        const hit = rows.find((r) => r.sel === ch
            || (r.accel && r.accel === ch));
        if (hit && hit.value != null) {
            if (selected.has(hit.value)) selected.delete(hit.value);
            else selected.add(hit.value);
        }
    }
}

/**
 * C ref: pickup.c menu_loot(0, FALSE) — take out via MENU_FULL category
 * then query_objlist(INVORDER_SORT, !USE_INVLET) PICK_ANY.
 * `@` invert-all; Return → out_container.
 * Named omissions: autopick 'A'; MENU_PARTIAL; traditional_loot;
 * menu_head_objsym; INCLUDE_VENOM; FEEL_COCKATRICE.
 */
async function menu_loot_takeout(container) {
    // C: gp.pickup_encumbrance = 0 — limit out_container load verbosity
    game.pickup_encumbrance = 0;
    if (!container?.cobj) return ECMD_OK;

    const olist = [];
    for (let o = container.cobj; o; o = o.nobj) olist.push(o);

    // C query_category: single category → skip menu, auto-pick that class
    const classes = [];
    for (const oc of DEF_INV_ORDER) {
        if (olist.some((o) => o.oclass === oc)) classes.push(oc);
    }
    let cats;
    if (classes.length === 1) {
        cats = new Set([classes[0]]);
    } else {
        cats = await query_loot_category(olist, 'Take out what type of objects?');
        if (!cats) return ECMD_OK;
    }

    const allTypes = cats.has(ALL_TYPES_SELECTED);
    const allow = new Set(
        olist.filter((o) => allTypes || cats.has(o.oclass)),
    );
    if (!allow.size) return ECMD_OK;

    // C query_objlist: INVORDER_SORT | INCLUDE_VENOM; !USE_INVLET for take-out.
    // sortflags: sortloot 'l'/'f' + !USE_INVLET → SORTLOOT_LOOT; sortpack → PACK.
    const flags = game.flags || {};
    const doSort = flags.sortpack !== false;
    const sortlootOpt = flags.sortloot ?? 'l';
    let sortflags = 0;
    if (sortlootOpt === 'l' || sortlootOpt === 'f') sortflags |= SORTLOOT_LOOT;
    if (doSort) sortflags |= SORTLOOT_PACK;

    const ranked = sortloot(container.cobj, sortflags, false)
        .filter((s) => allow.has(s.obj));

    const items = [];
    let nextLet = 'a'.charCodeAt(0);
    let first = true;
    for (const { obj } of ranked) {
        let letch;
        // C: !USE_INVLET → '$' only when the first menu item is a coin
        if (first && obj.oclass === COIN_CLASS) {
            letch = '$';
        } else {
            letch = String.fromCharCode(nextLet++);
            if (nextLet > 'z'.charCodeAt(0)) nextLet = 'A'.charCodeAt(0);
        }
        first = false;
        items.push({ obj, letch, selected: false, oclass: obj.oclass });
    }
    if (!items.length) return ECMD_OK;

    container.cknown = 1;
    let n_looted = 0;
    for (;;) {
        const entries = [
            { text: 'Take out what?', attr: ATR_INVERSE },
            { text: '', attr: 0 },
        ];
        // C INVORDER_SORT: let_to_name heading once per class in pack order
        if (doSort) {
            let lastClass = null;
            for (const it of items) {
                if (it.obj.where === OBJ_INVENT) continue;
                if (it.oclass !== lastClass) {
                    entries.push({
                        text: let_to_name(it.oclass, false, false),
                        attr: ATR_INVERSE,
                    });
                    lastClass = it.oclass;
                }
                const mark = it.selected ? '+' : '-';
                entries.push({
                    text: `${it.letch} ${mark} ${doname(it.obj)}`,
                    attr: 0,
                });
            }
        } else {
            for (const it of items) {
                if (it.obj.where === OBJ_INVENT) continue;
                const mark = it.selected ? '+' : '-';
                entries.push({
                    text: `${it.letch} ${mark} ${doname(it.obj)}`,
                    attr: 0,
                });
            }
        }
        await paint_corner_nhw_menu(entries, '(end) ');
        await flush_screen(1);
        const key = await nhgetch();
        game._menu_overlay = false;
        await docrt();
        await flush_screen(1);

        if (key === 27) break;
        if (key === 13 || key === 10 || key === 32) {
            const chosen = items.filter((it) => it.selected
                && it.obj.where !== OBJ_INVENT);
            for (const it of chosen) {
                const res = await out_container(it.obj);
                if (res < 0) break;
                n_looted += res;
            }
            break;
        }
        const ch = String.fromCharCode(key);
        if (ch === MENU_INVERT_ALL) {
            for (const it of items) {
                if (it.obj.where === OBJ_INVENT) continue;
                it.selected = !it.selected;
            }
            continue;
        }
        if (ch === MENU_SELECT_ALL) {
            for (const it of items) {
                if (it.obj.where === OBJ_INVENT) continue;
                it.selected = true;
            }
            continue;
        }
        if (ch === MENU_UNSELECT_ALL) {
            for (const it of items) it.selected = false;
            continue;
        }
        const hit = items.find((it) => it.letch === ch
            && it.obj.where !== OBJ_INVENT);
        if (hit) hit.selected = !hit.selected;
    }
    return n_looted ? ECMD_TIME : ECMD_OK;
}

/**
 * C ref: pickup.c in_container — move invent obj into current_container.
 * Envelope: held bag only; gold/ordinary; quest/mbag explosion deferred.
 * @returns {number} 1 stashed, 0 refused, -1 stop
 */
async function in_container(obj) {
    const cont = game._current_container;
    if (!cont || !obj) return 0;
    if (obj === cont) {
        await pline('That would be an interesting topological exercise.');
        return 0;
    }
    if (obj.owornmask) {
        await pline('You cannot stash something you are wearing.');
        return 0;
    }

    const inv = game.invent || [];
    const idx = inv.indexOf(obj);
    if (idx < 0) return 0;
    inv.splice(idx, 1);

    const is_gold = obj.oclass === COIN_CLASS;
    if (is_gold) {
        game._goldCount = Math.max(0, (game._goldCount || 0) - (obj.quan || 0));
        if (game.botl != null) game.botl = 1;
    }

    await pline(`You put ${doname(obj)} into ${thesimpleoname(cont)}.`);
    add_to_container(cont, obj);
    cont.owt = weight(cont);
    return 1;
}

/**
 * C ref: pickup.c query_category for MENU_FULL put-in (menu_loot).
 * Branch envelope: CHOOSE_ALL 'A' + hint; ALL_TYPES 'a'; inv_order classes
 * with def_oc_syms group accel; BUCX B/U/X; JUSTPICKED 'P'; PICK_ANY
 * letter/`$` toggle; Return confirms. Named omissions: unpaid/billed;
 * ParanoidAutoAll confirm; WORN_TYPES; venom.
 * @returns {Set<number|string>|null} selected filters, or null if canceled
 */
async function query_putin_category() {
    const cont = game._current_container;
    // C: walk full invent (includes current container) for categories
    const invent = (game.invent || []).filter((o) => o);
    if (!invent.length) return null;

    // Present oclasses in inv_order (skip empty).
    const classes = [];
    for (const oc of DEF_INV_ORDER) {
        if (invent.some((o) => o.oclass === oc)) classes.push(oc);
    }
    
    const showAll = classes.length > 1;

    const doBlessed = count_buc(invent, BUC_BLESSED) > 0;
    const doCursed = count_buc(invent, BUC_CURSED) > 0;
    const doUncursed = count_buc(invent, BUC_UNCURSED) > 0;
    const doUnknown = count_buc(invent, BUC_UNKNOWN) > 0;
    const nJust = count_justpicked(invent);
    const justObj = nJust === 1 ? find_justpicked(invent) : null;

    // Menu rows: { sel, accel, value, label, skipInvert }
    const rows = [];
    rows.push({
        sel: 'A', accel: null, value: 'A', skipInvert: true,
        label: 'Auto-select every relevant item',
    });
    rows.push({ kind: 'hint', label: '    (ignored unless some other choices are also picked)' });
    rows.push({ kind: 'blank' });
    let invlet = 'a'.charCodeAt(0);
    if (showAll) {
        rows.push({
            sel: String.fromCharCode(invlet++), accel: null,
            value: ALL_TYPES_SELECTED, skipInvert: true,
            label: 'All types',
        });
    }
    for (const oc of classes) {
        const sel = String.fromCharCode(invlet++);
        rows.push({
            sel, accel: oclass_to_sym(oc) || null, value: oc, skipInvert: false,
            label: let_to_name(oc, false, false),
        });
    }
    if (doBlessed || doCursed || doUncursed || doUnknown || nJust) {
        rows.push({ kind: 'blank' });
    }
    if (doBlessed) {
        rows.push({
            sel: 'B', accel: null, value: 'B', skipInvert: true,
            label: 'Items known to be Blessed',
        });
    }
    if (doCursed) {
        rows.push({
            sel: 'C', accel: null, value: 'C', skipInvert: true,
            label: 'Items known to be Cursed',
        });
    }
    if (doUncursed) {
        rows.push({
            sel: 'U', accel: null, value: 'U', skipInvert: true,
            label: 'Items known to be Uncursed',
        });
    }
    if (doUnknown) {
        rows.push({
            sel: 'X', accel: null, value: 'X', skipInvert: true,
            label: 'Items of unknown Bless/Curse status',
        });
    }
    if (nJust) {
        const lab = nJust === 1 && justObj
            ? `Just picked up: ${doname(justObj)}`
            : 'Items you just picked up';
        rows.push({
            sel: 'P', accel: null, value: 'P', skipInvert: true,
            label: lab,
        });
    }

    const selected = new Set();
    for (;;) {
        const entries = [
            { text: 'Put in what type of objects?', attr: ATR_INVERSE },
            { text: '', attr: 0 },
        ];
        for (const row of rows) {
            if (row.kind === 'blank') {
                entries.push({ text: '', attr: 0 });
                continue;
            }
            if (row.kind === 'hint') {
                entries.push({ text: row.label, attr: 0 });
                continue;
            }
            const mark = selected.has(row.value) ? '+' : '-';
            entries.push({ text: `${row.sel} ${mark} ${row.label}`, attr: 0 });
        }
        await paint_corner_nhw_menu(entries, '(end) ');
        await flush_screen(1);
        const key = await nhgetch();
        game._menu_overlay = false;
        await docrt();
        await flush_screen(1);

        if (key === 27) return null;
        if (key === 13 || key === 10 || key === 32) {
            return selected.size ? selected : null;
        }
        const ch = String.fromCharCode(key);
        if (ch === MENU_INVERT_ALL) {
            for (const row of rows) {
                if (row.value == null || row.skipInvert) continue;
                if (selected.has(row.value)) selected.delete(row.value);
                else selected.add(row.value);
            }
            continue;
        }
        const hit = rows.find((r) => r.sel === ch
            || (r.accel && r.accel === ch));
        if (hit && hit.value != null) {
            if (selected.has(hit.value)) selected.delete(hit.value);
            else selected.add(hit.value);
        }
    }
}

/**
 * C ref: pickup.c menu_loot(0, TRUE) — put in via category + PICK_ANY.
 * Branch envelope: MENU_FULL category filters; invent letter toggle; Return
 * → in_container. Named omissions: unpaid/billed; ParanoidAutoAll; autopick
 * 'A' mass put; justpicked shortcut; BUC filter apply; mbag explosion.
 */
async function menu_loot_putin(container) {
    if (!container) return ECMD_OK;
    // C: gp.pickup_encumbrance = 0 (menu_loot; no harm before in_container)
    game.pickup_encumbrance = 0;
    const cats = await query_putin_category();
    if (!cats) return ECMD_OK;

    const allTypes = cats.has(ALL_TYPES_SELECTED);
    const items = [];
    for (const obj of game.invent || []) {
        if (!obj || obj === container) continue;
        if (!allTypes && !cats.has(obj.oclass)) continue;
        let letch = obj.invlet;
        if (obj.oclass === COIN_CLASS) letch = '$';
        if (typeof letch !== 'string' || letch.length !== 1) {
            letch = obj.oclass === COIN_CLASS ? '$' : '?';
        }
        items.push({ obj, letch, selected: false });
    }
    if (!items.length) return ECMD_OK;

    let n_looted = 0;
    for (;;) {
        const entries = [
            { text: 'Put in what?', attr: ATR_INVERSE },
            { text: '', attr: 0 },
        ];
        let coinHdr = false;
        for (const it of items) {
            if (it.obj.oclass === COIN_CLASS && !coinHdr) {
                entries.push({ text: 'Coins', attr: ATR_INVERSE });
                coinHdr = true;
            }
            const mark = it.selected ? '+' : '-';
            entries.push({
                text: `${it.letch} ${mark} ${doname(it.obj)}`,
                attr: 0,
            });
        }
        await paint_corner_nhw_menu(entries, '(end) ');
        await flush_screen(1);
        const key = await nhgetch();
        game._menu_overlay = false;
        await docrt();
        await flush_screen(1);

        if (key === 27) break;
        if (key === 13 || key === 10 || key === 32) {
            const chosen = items.filter((it) => it.selected);
            for (const it of chosen) {
                // re-check still in invent (prior put may have merged)
                if (!(game.invent || []).includes(it.obj)) continue;
                const res = await in_container(it.obj);
                if (res < 0) break;
                n_looted += res;
            }
            break;
        }
        const ch = String.fromCharCode(key);
        if (ch === MENU_INVERT_ALL) {
            for (const it of items) it.selected = !it.selected;
            continue;
        }
        if (ch === MENU_SELECT_ALL) {
            for (const it of items) it.selected = true;
            continue;
        }
        if (ch === MENU_UNSELECT_ALL) {
            for (const it of items) it.selected = false;
            continue;
        }
        const hit = items.find((it) => it.letch === ch);
        if (hit) hit.selected = !hit.selected;
    }
    return n_looted ? ECMD_TIME : ECMD_OK;
}

/**
 * C ref: engrave.c freehand — free hand for loot/tip gates.
 */
function freehand() {
    const u = game.u || {};
    const uwep = u.uwep;
    // C: (!uwep || !welded(uwep) || (!bimanual(uwep) && (!uarms || !uarms->cursed)))
    if (!uwep || !welded(uwep)) return true;
    const bimanual = !!(game.objects?.[uwep.otyp]?.oc_big);
    if (!bimanual && (!u.uarms || !u.uarms.cursed)) return true;
    return false;
}

/**
 * C ref: pickup.c u_handsy — nohands / freehand gate for containers.
 * body_part(HAND) via objnam latebound (polyself→do→pickup cycle).
 * @returns {Promise<boolean>}
 */
async function u_handsy() {
    if (nohands(game.youmonst?.data)) {
        // C: You("have no hands!"); /* not body_part(HAND) */
        await pline('You have no hands!');
        return false;
    }
    if (!freehand()) {
        await pline(`You have no free ${body_part_latebound(HAND)}.`);
        return false;
    }
    return true;
}

/**
 * C ref: pickup.c use_container — held/floor container loot.
 * Branch envelope: u_handsy; unlocked; in_or_out_menu (lootabc a/b/c);
 * ':' look; 'o'/'a' menu_loot take-out; 'i'/'b' put-in; 'q' abort.
 * Named omissions: chest trap; BoT; stash/both/reversed; traditional_loot;
 * autopick 'A'; more_containers 'n'.
 *
 * @param {object} obj container
 * @param {boolean} [held=false] applied from invent
 * @param {boolean} [_more=false] multiple #loot (deferred)
 */
export async function use_container(obj, held = false, _more = false) {
    if (!obj) return ECMD_OK;

    // C: if (!u_handsy()) return ECMD_OK;
    if (!(await u_handsy())) return ECMD_OK;

    if (obj.olocked) {
        // C ref: pickup.c use_container — held locked; floor #loot uses
        // do_loot_cont autounlock instead.
        if (obj.lknown)
            await pline(`${upstart(theArt(xname(obj)))} is locked.`);
        else
            await pline(`Hmmm, ${theArt(xname(obj))} turns out to be locked.`);
        obj.lknown = 1;
        if (held) await pline('You must put it down to unlock.');
        return ECMD_OK;
    }

    game._current_container = obj;
    let used = ECMD_OK;
    const inokay = (game.invent || []).some((o) => o && o !== obj);
    // C: outokay = Has_contents; outmaybe = outokay || !cknown
    const outokay = Has_contents(obj);
    // C: preformat emptymsg when !outokay — Ysimple_name2 + optional "now "
    // (quantum_cat / cursed_mbag "now " deferred).
    let emptymsg = '';
    if (!outokay) {
        emptymsg = `${Ysimple_name2(obj)} is empty.`;
    }
    let c = 'q';
    for (;;) {
        // C: prompt uses outmaybe, not bare outokay (empty+!cknown →
        // "Do what with your bag?" still offers take-out).
        const outmaybe = outokay || !obj.cknown;
        const qbuf = outmaybe
            ? `Do what with ${yname(obj)}?`
            : `${upstart(yname(obj))} is empty.  Do what with it?`;
        c = await in_or_out_menu(
            qbuf, obj, outmaybe, inokay, used !== ECMD_OK,
        );
        if (c === ':') {
            if (!obj.cknown) used = ECMD_TIME;
            await container_contents(obj);
            continue;
        }
        break;
    }

    if (c === 'q' || c === 'n') {
        game._current_container = null;
        return used;
    }

    const loot_out = (c === 'o' || c === 'b');
    if (loot_out) {
        if (!Has_contents(obj)) {
            // C: pline1(emptymsg) — Ysimple_name2 ("The bag is empty.")
            await pline(emptymsg || `${Ysimple_name2(obj)} is empty.`);
            if (!obj.cknown) used = ECMD_TIME;
            obj.cknown = 1;
        } else {
            used |= await menu_loot_takeout(obj);
        }
    }
    // 'i' put-in; 'b' take-out then put-in. 'r' reversed / stash deferred.
    if (c === 'i' || c === 'b') {
        used |= await menu_loot_putin(obj);
    }

    // C: use_container containerdone — if used, mark contents known
    // (put-in alone does not set cknown in menu_loot; this does).
    if (used && obj) obj.cknown = 1;

    game._current_container = null;
    void held;
    return used;
}

/**
 * C ref: pickup.c do_loot_cont — floor container; locked → autounlock.
 * @param {object} cobj
 * @returns {Promise<number>} ECMD_*
 */
async function do_loot_cont(cobj) {
    if (!cobj) return ECMD_OK;
    if (cobj.olocked) {
        let res = ECMD_OK;
        if (cobj.lknown)
            await pline(`${upstart(theArt(xname(cobj)))} is locked.`);
        else
            await pline(`Hmmm, ${theArt(xname(cobj))} turns out to be locked.`);
        cobj.lknown = 1;

        if (!game.flags) game.flags = {};
        const au = game.flags.autounlock ?? AUTOUNLOCK_APPLY_KEY;
        if (au) {
            const ox = cobj.ox | 0;
            const oy = cobj.oy | 0;
            if (game.u) game.u.dz = 0;
            // C: APPLY_KEY | UNTRAP arm; UNTRAP / FORCE deferred
            if ((au & AUTOUNLOCK_APPLY_KEY) !== 0) {
                const { pick_lock, autokey } = await import('./lock.js');
                const unlocktool = autokey(true);
                if (unlocktool) {
                    const pl = await pick_lock(unlocktool, ox, oy, cobj);
                    if (pl) res = ECMD_TIME;
                    return res;
                }
            }
        }
        return res;
    }
    return use_container(cobj);
}

/**
 * C ref: pickup.c doloot / doloot_core — loot container underfoot.
 * Branch envelope: capacity; nohands; single floor container →
 * do_loot_cont (locked autounlock + unlocked use_container).
 * Named omissions: capacity pline path; Confusion reverse_loot;
 * multi-cont menu; directional lootmon beyond underfoot; grave;
 * saddle; cockatrice; AUTOUNLOCK_FORCE.
 */
export async function doloot() {
    const u = game.u;
    if (!u) return ECMD_OK;

    // C: check_capacity(NULL) then nohands → "You have no hands!"
    if (check_capacity(null)) {
        await pline(
            game._check_capacity_msg
            || "You can't do that while carrying so much stuff.",
        );
        game._check_capacity_msg = null;
        return ECMD_OK;
    }
    if (nohands(game.youmonst?.data)) {
        await pline('You have no hands!');
        return ECMD_OK;
    }

    let cobj = null;
    for (let o = objects_at(u.ux, u.uy); o; o = o.nexthere) {
        if (Is_container(o)) {
            cobj = o;
            break;
        }
    }
    if (cobj) {
        return do_loot_cont(cobj);
    }

    // C: doloot_core lootmon — get_adjacent_loc when mon_beside
    if (mon_beside(u.ux, u.uy) || game.flags?.menu_requested) {
        const { getdir_cmdassist } = await import('./dothrow.js');
        const dir = await getdir_cmdassist('Loot in what direction?');
        if (!dir) {
            await pline('Never mind.');
            return ECMD_OK;
        }
        const cc = { x: u.ux + dir.dx, y: u.uy + dir.dy };
        const underfoot = cc.x === u.ux && cc.y === u.uy;
        for (let o = objects_at(cc.x, cc.y); o; o = o.nexthere) {
            if (Is_container(o)) {
                if (underfoot) return do_loot_cont(o);
                await pline('You have to be at a container to loot it.');
                return ECMD_OK;
            }
        }
        await pline(
            `You don't find anything ${underfoot ? 'here' : 'there'} to loot.`,
        );
        return ECMD_OK;
    }

    await pline("You don't find anything here to loot.");
    return ECMD_OK;
}

/** C ref: pickup.c mon_beside */
function mon_beside(x, y) {
    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            if (m_at(x + i, y + j)) return true;
        }
    }
    return false;
}

/**
 * C ref: hack.c check_capacity — near_capacity >= EXT_ENCUMBER blocks.
 * @param {string|null} [str]
 * @returns {boolean} true when overloaded (C returns 1)
 */
function check_capacity(str) {
    if (near_capacity() >= EXT_ENCUMBER) {
        // caller may await pline; sync path uses fire-and-forget via game
        game._check_capacity_msg = str
            || "You can't do that while carrying so much stuff.";
        return true;
    }
    return false;
}

/**
 * C ref: pickup.c able_to_loot — tip/loot reachability gates.
 * Named omissions: usteed rider_cant_reach; Underwater tip carve-out;
 * hliquid wording.
 * @param {number} x
 * @param {number} y
 * @param {boolean} looting true=loot, false=tip
 */
async function able_to_loot(x, y, looting) {
    const verb = looting ? 'loot' : 'tip';
    const t = t_at(x, y);
    if (!can_reach_floor(!!(t && is_pit(t.ttyp)))) {
        await pline(`You can't reach the floor.`);
        return false;
    }
    if ((is_pool(x, y) && looting) || is_lava(x, y)) {
        await pline(
            `You cannot ${verb} things that are deep in the ${
                is_lava(x, y) ? 'lava' : 'water'
            }.`,
        );
        return false;
    }
    try {
        const md = await import('./mondata.js');
        if (md.nolimbs?.(game.youmonst?.data)) {
            await pline(`Without limbs, you cannot ${verb} anything.`);
            return false;
        }
    } catch {
        /* mondata optional */
    }
    if (looting && !freehand()) {
        await pline(
            `Without a free ${body_part_latebound(HAND)}, you cannot loot anything.`,
        );
        return false;
    }
    return true;
}

/**
 * C ref: pickup.c tipcontainer — empty box onto floor (no target bag).
 * highdrop = !can_reach_floor(TRUE); swallowed clears it; then
 * how_lost LOST_DROPPED + hitfloor(TRUE) (D-1273).
 * Named omissions: tipcontainer_gettarget menu; bag-of-holding explode;
 * ice-box thaw; shop billing; altarizing doaltarobj; cursed mbag
 * item-gone; otrapped chest_trap; invent getobj tip; dropy terse
 * comma-list; toss_up; subfrombill after floor shop BoT/horn.
 * @param {object} box
 */
export async function tipcontainer(box) {
    if (!box) return;
    const ox = (box.ox | 0) || (game.u?.ux | 0);
    const oy = (box.oy | 0) || (game.u?.uy | 0);
    // C tipcontainer_checks: discover lock, refuse locked/empty
    if (!box.lknown) box.lknown = 1;
    if (box.olocked) {
        await pline(`${upstart(thesimpleoname(box))} is locked.`);
        return;
    }
    // C tipcontainer_checks: BAG_OF_TRICKS / HORN_OF_PLENTY empty via apply
    if ((BAG_OF_TRICKS >= 0 && box.otyp === BAG_OF_TRICKS)
        || (HORN_OF_PLENTY >= 0 && box.otyp === HORN_OF_PLENTY)) {
        const bag = box.otyp === BAG_OF_TRICKS;
        const oldSpe = box.spe | 0;
        const maybeshopgoods = box.where !== OBJ_INVENT
            && costly_spot(box.ox | 0, box.oy | 0);
        const u = game.u || {};
        let bx = u.ux | 0;
        let by = u.uy | 0;
        if (box.where === OBJ_FLOOR) {
            bx = box.ox | 0;
            by = box.oy | 0;
        }
        box.ox = bx;
        box.oy = by;
        if (maybeshopgoods && !box.no_charge) {
            await addtobill(box, false, false, true);
        }
        let seen = 0;
        let totseen = 0;
        do {
            if (bag) {
                const seencount = { n: seen };
                const { bagotricks } = await import('./apply.js');
                const n = await bagotricks(box, true, seencount);
                seen = seencount.n | 0;
                if (!n) break;
            } else if (!(await hornoplenty(box, true, null))) {
                break;
            }
            totseen += seen;
        } while ((box.spe | 0) > 0);
        if ((box.spe | 0) < oldSpe) {
            if (bag && !totseen) await pline(nothing_seems_to_happen);
            // C pickup.c: check_unpaid wants a non-zero charge count
            box.spe = oldSpe;
            await check_unpaid_usage(box, true);
            box.spe = 0;
            box.cknown = 1;
        }
        return; // C TIPCHECK_CANNOT — already emptied
    }
    if (!Has_contents(box)) {
        box.cknown = 1;
        await pline(`${upstart(thesimpleoname(box))} is empty.`);
        return;
    }
    box.cknown = 1;
    const u = game.u || {};
    // C pickup.c:3732–3741 — highdrop = !can_reach_floor(TRUE);
    // swallowed clears highdrop (and altarizing, still named).
    let highdrop = !can_reach_floor(true);
    if (u.uswallow) highdrop = false;
    const multi = !!(box.cobj?.nobj);
    // C: terse = !(highdrop || altarizing || costly_spot). Altar/shop
    // named, so highdrop is the live terse-breaker. Non-highdrop keeps
    // fortress colon + per-item doname (C comma-list still named).
    await pline(
        `${multi ? 'Objects spill' : 'An object spills'} out${
            highdrop ? '.' : ':'
        }`,
    );
    let next = box.cobj;
    while (next) {
        const otmp = next;
        next = otmp.nobj;
        obj_extract_self(otmp);
        if (highdrop) {
            // C pickup.c:3807–3810 — might break or fall down stairs;
            // hitfloor handles altars itself.
            otmp.ox = (box.ox | 0) || (u.ux | 0);
            otmp.oy = (box.oy | 0) || (u.uy | 0);
            otmp.how_lost = LOST_DROPPED;
            const { hitfloor } = await import('./dothrow.js');
            await hitfloor(otmp, true);
        } else {
            place_object(otmp, ox, oy);
            await pline(`${doname(otmp)}.`);
        }
    }
    box.cobj = null;
    if (typeof box.owt === 'number') box.owt = weight(box);
    newsym(ox, oy);
}

/**
 * C ref: pickup.c dotip — #tip empty container onto floor.
 * Ported: single floor-container ynq (def q) → tipcontainer / ECMD_OK.
 * Named omissions: multi-box choose_tip_container_menu; m-prefix invent
 * skip; getobj invent tip; candle/oil/grease/food/venom spill; tiphat;
 * tipcontainer_gettarget destination menu.
 * @returns {Promise<number>} ECMD_*
 */
export async function dotip() {
    const u = game.u;
    if (!u) return ECMD_OK;

    const ccx = u.ux | 0;
    const ccy = u.uy | 0;
    let boxes = 0;
    for (let o = objects_at(ccx, ccy); o; o = o.nexthere) {
        if (Is_container(o)) boxes++;
    }

    // C: floor first unless menu_requested (m-prefix) skips to invent
    if (boxes > 0 && !game.iflags?.menu_requested) {
        const overloaded = check_capacity(
            `You can't tip ${boxes > 1 ? 'one' : 'it'} while carrying so much.`,
        );
        if (overloaded) {
            await pline(game._check_capacity_msg);
            game._check_capacity_msg = null;
        } else if (await able_to_loot(ccx, ccy, false)) {
            if (boxes > 1) {
                // choose_tip_container_menu deferred → invent getobj path
            } else {
                for (let cobj = objects_at(ccx, ccy); cobj; cobj = cobj.nexthere) {
                    if (!Is_container(cobj)) continue;
                    const { yn_function } = await import('./getline.js');
                    const c = await yn_function(
                        `There is ${doname(cobj)} here, tip it?`,
                        'ynq',
                        'q',
                    );
                    if (c === 'q') return ECMD_OK;
                    if (c === 'n') continue;
                    await tipcontainer(cobj);
                    return ECMD_TIME;
                }
            }
        }
    }

    // getobj("tip") invent path deferred
    await pline('Tip what?');
    return ECMD_CANCEL;
}
