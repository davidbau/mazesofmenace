// fountain.js — Fountain dryup / dip / drink effects; sink drink / dip.
// C ref: fountain.c dryup, dipfountain, drinkfountain, dofindgem,
//         dogushforth, gush, breaksink, drinksink, dipsink.
//
// Branch envelope (drinkfountain): fate=rnd(30) before Levitation;
// mgkftn restore+adjattrib; fate<10 refresh; switch default/19–30
// message+RNG arms; case 22 dowatersnakes; case 23 dowaterdemon;
// case 26 monster_detect + browse_map; case 27 dofindgem when
// !FOUNTAIN_IS_LOOTED else fallthrough; case 28 dowaternymph;
// case 30 dogushforth(TRUE);
// drinkfountain case 19 MAGICENLIGHTENMENT body (D-1116).
// drinkfountain case 24 buc_changed → update_inventory (D-1126).
// drinkfountain fate<10 uhunger += rnd(10) + newuhs(FALSE) (D-1359).
// gush m_at → minliquid else newsym (D-1117).
// Deferred: set_levltyp side effects beyond typ/flags.
// mongrantswish tmp_at(DISP_ALWAYS, glyph_at) hide (D-1136).
// dowatersnakes Hallucination makeplural(rndmonnam(NULL)) (D-1125).
// dryup wizard y_n after town warn (D-1096).
// dryup angry_guards after real dryup (D-1104).
// watchman_warn_fountain Deaf shake/wave (D-1105).
// dryup cansee cloud-glyph skip (D-1106).
// dipfountain Excalibur LONG_SWORD body (D-1107).
// wash_hands + dipfountain hands/uarmg wire (D-1108).
// dipsink + dodip sink yn + local polymorph_sink (D-1113).
// dodip pool yn wash_hands / water_damage (D-1128).
// dipfountain cases 17–20 uncurse (D-1114).
// dipfountain case 29 mkgold coins (D-1115).
// dipfountain after-switch update_inventory (D-1134).
// dipfountain Excalibur :441 update_inventory (D-1145).
//
// Branch envelope (drinksink): Levitation floating_above; rn2(20)
// switch cases 0–13 + 19/default sip; case 4 faucet → mkobj+dopotion;
// case 5 S_LRING ring; case 6 breaksink; case 8 more_experienced;
// case 9 sewage morehungry+vomit; case 10 Unchanging gate +
// polyself(POLY_NOFLAGS) (D-1118); case 13 create_gas_cloud(1,4)
// (D-1124; size-1: ttl rn1(3,4) only).
// drinksink case 4 !Blind hcolor(OBJ_DESCR) (D-1135).
// make_gas_cloud enveloped You + PLNMSG_ENVELOPED_IN_GAS (D-1137).
// inside_f dam>0 HP + m_poisongas_ok size-1 gate (D-1146 region.js).
// expire_gas_cloud dissipation plines (D-1155 region.js).
// fumaroles clear_heros_fault + Norep whoosh (D-1156 mklev.js).
// allmain moveloop EOT fumaroles (D-1168).
// mfndpos m_poisongas_ok vamp/eel/breath (D-1159 mon.js).
// Deferred: monstseesu
// when Fire_resistance already set; sit/apply/pray/detect/do/wield/read
// identity hcolor stubs (rndcolor is D-1147 in do_name.js / chest_trap).

import { game } from './gstate.js';
import { rn2, rnd, rn1 } from './rng.js';
import {
    pline, newsym, You_feel, flush_topl_more, canspotmon, verbalize,
    glyph_is_invisible, tmp_at,
} from './display.js';
import {
    curse, bless, uncurse, mksobj_at, rnd_class, mkobj, mkobj_at,
    obj_extract_self, objects_at, delobj, mkgold,
} from './mkobj.js';
import {
    water_damage, water_damage_chain, t_at, deltrap, mintrap, NO_TRAP_FLAGS,
} from './trap.js';
import {
    COIN_CLASS, RING_CLASS, POTION_CLASS, POT_WATER,
    objectNames, objectNameStrs, objectDescrs, objects,
} from './objects.js';
import {
    ROOM, FOUNTAIN, IS_FOUNTAIN, IS_SINK, SINK, THRONE, ALTAR, GRAVE,
    IS_DOOR, SDOOR, POOL, u_at, isok,
    ER_NOTHING, ER_GREASED, ER_DESTROYED, GLIB,
    F_LOOTED, F_WARNED, FROMOUTSIDE, S_LRING, T_LOOTED, MM_NOMSG,
    nothing_seems_to_happen,
    A_LAWFUL, AM_NONE, Align2amask, GEHENNOM,
    ONAME_VIA_DIP, ONAME_KNOW_ARTI, LL_ARTIFACT,
    KILLED_BY, G_GONE, M_SEEN_FIRE,
    SQKY_BOARD, BEAR_TRAP, LANDMINE, FIRE_TRAP,
    TELEP_TRAP, LEVEL_TELEP, WEB, MAGIC_TRAP, ANTI_MAGIC,
    is_pit, is_hole, ARTICLE_A, ARM, HEAD, HAND, FINGER,
    MAGICENLIGHTENMENT, ENL_GAMEINPROGRESS,
    POLY_NOFLAGS, UNCHANGING,
    DISP_ALWAYS, DISP_END,
} from './const.js';
import { hands_obj } from './weapon.js';
import { PM_KNIGHT, monsterNames } from './generated/monsters_data.js';
import { A_MAX, A_WIS, A_CON, A_DEX, adjattrib, exercise, acurr } from './attrib.js';
import { morehungry, poison_strdmg, vomit, newuhs } from './eat.js';
import { losehp, in_town } from './hack.js';
import { depth as depth_of_level, distmin } from './hacklib.js';
import { monster_detect } from './detect.js';
import { more_experienced, newexplevel } from './exper.js';
import { makemon } from './makemon.js';
import {
    mons, is_watch, nolimbs,
    breathless, haseyes,
} from './monsters.js';
import { m_at, angry_guards, minliquid } from './mon.js';
import { mon_offmap } from './monmove.js';
import { cansee, couldsee, do_clear_area } from './vision.js';
import { del_engr_at, make_grave } from './engrave.js';
import { monstseesu, monstunseesu } from './mondata.js';
import { observe_object, enlightenment, update_inventory, useup } from './invent.js';
import {
    hliquid, hcolor, x_monnam, Hallucination, rndmonnam, oname,
    trycall,
} from './do_name.js';
import {
    exist_artifact, artiname, discover_artifact, ART_EXCALIBUR,
} from './artifact.js';
import { livelog_printf } from './pline.js';
import { uhim } from './roles.js';
import { mbodypart, body_part, polyself } from './polyself.js';
import { makeplural, the, xname, an } from './objnam.js';
import { somegold } from './steal.js';
import { yn_function } from './getline.js';
import { visible_region_at, create_gas_cloud } from './region.js';

const LONG_SWORD = objectNames.indexOf('LONG_SWORD');
const POT_POLYMORPH = objectNames.indexOf('POT_POLYMORPH');
const POT_OIL = objectNames.indexOf('POT_OIL');
const POT_ACID = objectNames.indexOf('POT_ACID');
const POT_LEVITATION = objectNames.indexOf('POT_LEVITATION');
const POT_OBJECT_DETECTION = objectNames.indexOf('POT_OBJECT_DETECTION');
const POT_GAIN_LEVEL = objectNames.indexOf('POT_GAIN_LEVEL');
const POT_GAIN_ENERGY = objectNames.indexOf('POT_GAIN_ENERGY');
const POT_MONSTER_DETECTION = objectNames.indexOf('POT_MONSTER_DETECTION');
const POT_FRUIT_JUICE = objectNames.indexOf('POT_FRUIT_JUICE');
const DILITHIUM_CRYSTAL = objectNames.indexOf('DILITHIUM_CRYSTAL');
const LUCKSTONE = objectNames.indexOf('LUCKSTONE');
const BOULDER = objectNames.indexOf('BOULDER');
const PM_SEWER_RAT = monsterNames.indexOf('PM_SEWER_RAT');
const PM_WATER_ELEMENTAL = monsterNames.indexOf('PM_WATER_ELEMENTAL');
const PM_WATER_DEMON = monsterNames.indexOf('PM_WATER_DEMON');
const PM_WATER_MOCCASIN = monsterNames.indexOf('PM_WATER_MOCCASIN');
const PM_WATER_NYMPH = monsterNames.indexOf('PM_WATER_NYMPH');

/** C ref: you.h Role_if — urole.mnum match. */
function Role_if(pm) {
    return (game.urole?.mnum ?? -1) === pm;
}

/** C ref: rm.h FOUNTAIN_IS_WARNED */
function FOUNTAIN_IS_WARNED(x, y) {
    const loc = game.level?.at(x, y);
    return !!((loc?.looted || 0) & F_WARNED);
}

/** C ref: rm.h SET_FOUNTAIN_WARNED */
export function SET_FOUNTAIN_WARNED(x, y) {
    const loc = game.level?.at(x, y);
    if (loc) loc.looted = (loc.looted || 0) | F_WARNED;
}

/** C ref: rm.h FOUNTAIN_IS_LOOTED / SET_FOUNTAIN_LOOTED */
function FOUNTAIN_IS_LOOTED(x, y) {
    const loc = game.level?.at(x, y);
    return !!((loc?.looted || 0) & F_LOOTED);
}

function SET_FOUNTAIN_LOOTED(x, y) {
    const loc = game.level?.at(x, y);
    if (loc) loc.looted = (loc.looted || 0) | F_LOOTED;
}

/** C flag.h `#define wizard flags.debug`. */
function wizard_mode() {
    return !!(game.flags?.debug || game.flags?.wizard);
}

/**
 * C fountain.c:224–226 — glyph_is_cmap(glyph_at) && glyph_to_cmap == S_cloud.
 * JS has no integer glyphs. C gbuf is S_cloud when newsym show_region
 * painted fog/steam (make_gas_cloud damage=0 → 'S_cloud'). Poison clouds
 * are 'S_poisoncloud' and do not skip. A shown monster / remembered I is
 * !glyph_is_cmap (display.c mon_overrides_region; full _mon_visible /
 * distu / M_AP still named).
 */
function glyph_at_cmap_is_s_cloud(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    if (m_at(x, y)) return false;
    if (glyph_is_invisible(loc)) return false;
    const reg = visible_region_at(x, y);
    return !!reg && reg.glyph === 'S_cloud';
}

/** C ref: rm.h CLEAR_FOUNTAIN_LOOTED */
function CLEAR_FOUNTAIN_LOOTED(x, y) {
    const loc = game.level?.at(x, y);
    if (loc) loc.looted = (loc.looted || 0) & ~F_LOOTED;
}

/** C ref: do_name.c Amonnam — highc(a_monnam). */
function Amonnam(mtmp) {
    const s = x_monnam(mtmp, ARTICLE_A, null, 0, false);
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : 'A monster';
}

/**
 * C ref: fountain.c watchman_warn_fountain
 * Deaf → visual shake/wave (D-1105); !Deaf yell + verbalize (D-0894).
 * @returns {Promise<boolean>}
 */
async function watchman_warn_fountain(mtmp) {
    if (is_watch(mtmp.data) && couldsee(mtmp.mx, mtmp.my) && mtmp.mpeaceful) {
        const u = game.u || {};
        // C youprop.h Deaf ≡ HDeaf || EDeaf || u.uroleplay.deaf
        const Deaf = !!((u.HDeaf | 0) || (u.EDeaf | 0)
            || u.uroleplay?.deaf || u.Deaf);
        if (!Deaf) {
            await pline(`${Amonnam(mtmp)} yells:`);
            await verbalize('Hey, stop using that fountain!');
        } else {
            // C fountain.c:187–193 — left-to-right: Amonnam, nolimbs verb,
            // mhis, then HEAD vs makeplural(ARM).
            const who = Amonnam(mtmp);
            const verb = nolimbs(mtmp.data) ? 'shakes' : 'waves';
            const his = mhis(mtmp);
            const part = nolimbs(mtmp.data)
                ? mbodypart(mtmp, HEAD)
                : makeplural(mbodypart(mtmp, ARM));
            await pline(`${who} earnestly ${verb} ${his} ${part}!`);
        }
        return true;
    }
    return false;
}

/**
 * C ref: mon.c get_iter_mons — first living on-map mon where bfunc is true.
 * @param {(mtmp: object) => Promise<boolean>|boolean} bfunc
 */
async function get_iter_mons(bfunc) {
    const list = game.fmon || [];
    for (const mtmp of list) {
        if ((mtmp.mhp | 0) <= 0 || mon_offmap(mtmp)) continue;
        if (await bfunc(mtmp)) return mtmp;
    }
    return null;
}

/** C ref: invent.c money_cnt — sum COIN_CLASS quan (invent is a JS array). */
function money_cnt(invent) {
    let sum = 0;
    for (const o of invent || []) {
        if (o.oclass === COIN_CLASS) sum += o.quan | 0;
    }
    return sum;
}

/**
 * C ref: fountain.c dofindgem — gem in sparkling waters.
 * mksobj_at(..., FALSE, FALSE): next_ident only (no mksobj_init).
 */
async function dofindgem() {
    const u = game.u || {};
    const Blind = !!(u.Blind || u.ublind);
    if (!Blind) {
        await pline('You spot a gem in the sparkling waters!');
    } else {
        await You_feel('a gem here!');
    }
    // C: rnd_class(DILITHIUM_CRYSTAL, LUCKSTONE - 1)
    mksobj_at(
        rnd_class(DILITHIUM_CRYSTAL, LUCKSTONE - 1),
        u.ux, u.uy,
        false, false,
    );
    SET_FOUNTAIN_LOOTED(u.ux, u.uy);
    newsym(u.ux, u.uy);
    exercise(A_WIS, true);
}

/** C ref: fountain.c floating_above — dip/drink while levitating. */
export async function floating_above(what) {
    await pline(`You are floating high above the ${what}.`);
}

/** C ref: pline.c You_hear — acoustics/Deaf; Unaware/Underwater deferred. */
async function You_hear(line) {
    const u = game.u || {};
    if (u.Deaf || u.HDeaf) return;
    await pline(`You hear ${line}`);
}

/** C ref: do_name.c a_monnam — ARTICLE_A (hallu deferred). */
function a_monnam(mtmp) {
    if (!mtmp) return 'a monster';
    if (mtmp.mextra?.mgivenname) return mtmp.mextra.mgivenname;
    const raw = mtmp?.data?.name || 'monster';
    const plain = String(raw).replace(/^PM_/, '').replace(/_/g, ' ').toLowerCase();
    const art = /^[aeiou]/i.test(plain) ? 'an' : 'a';
    return `${art} ${plain}`;
}

/** Potion appearance string for faucet liquid (OBJ_DESCR). */
function potion_descr(otyp) {
    const oc = game.objects?.[otyp];
    if (!oc) return 'odd';
    const idx = oc.oc_descr_idx ?? otyp;
    return objectDescrs[idx] || 'odd';
}

function Fire_resistance() {
    const u = game.u || {};
    return !!(u.Fire_resistance || u.HFire_resistance || u.EFire_resistance);
}

/** C ref: youprop.h Unchanging — H || E via flat + uprops. */
function Unchanging(u = game.u || {}) {
    const e = u.uprops?.[UNCHANGING];
    return !!((u.Unchanging || u.HUnchanging || u.EUnchanging)
        || (e?.intrinsic | 0) || (e?.extrinsic | 0));
}

/**
 * C ref: fountain.c breaksink — sink → looted fountain; update nsinks/nfountains.
 */
export async function breaksink(x, y) {
    const u = game.u || {};
    if (cansee(x, y) || (u.ux === x && u.uy === y)) {
        await pline('The pipes break!  Water spurts out!');
    }
    const loc = game.level?.at(x, y);
    if (loc) {
        loc.typ = FOUNTAIN;
        loc.looted = 0;
        loc.blessedftn = 0;
        SET_FOUNTAIN_LOOTED(x, y);
    }
    if (game.level?.flags) {
        if ((game.level.flags.nsinks | 0) > 0) game.level.flags.nsinks--;
        game.level.flags.nfountains = (game.level.flags.nfountains | 0) + 1;
    }
    newsym(x, y);
}

/**
 * C ref: fountain.c sink_backs_up — kick/drink mud + once-per-sink ring.
 * Branch envelope: Blind/Deaf msg; Flupp prefix when !Deaf; S_LRING gate
 * → You_see ring + mkobj_at RING_CLASS + exercise DEX/WIS.
 * Named omit: body_part(FACE) poly forms (humanoid "face").
 */
export async function sink_backs_up(x, y) {
    const u = game.u || {};
    const Blind = !!(u.Blind || u.ublind);
    const Deaf = !!(u.Deaf || u.HDeaf || u.EDeaf || u.uroleplay?.deaf);
    let buf;
    if (!Blind) buf = 'Muddy waste pops up from the drain';
    else if (!Deaf) buf = 'You hear a sloshing sound';
    else buf = 'Something splashes you in the face';
    await pline(`${!Deaf ? 'Flupp!  ' : ''}${buf}.`);

    const loc = game.level?.at(x, y);
    if (loc && !((loc.looted | 0) & S_LRING)) {
        if (!Blind) await pline('You see a ring shining in its midst.');
        mkobj_at(RING_CLASS, x, y, true);
        newsym(x, y);
        exercise(A_DEX, true);
        exercise(A_WIS, true);
        loc.looted = (loc.looted | 0) | S_LRING;
    }
}

/**
 * C ref: fountain.c drinksink — quaff while standing on a sink.
 */
export async function drinksink() {
    const u = game.u || {};
    if (u.Levitation) {
        await floating_above('sink');
        return;
    }

    switch (rn2(20)) {
    case 0:
        await pline(`You take a sip of very cold ${hliquid('water')}.`);
        break;
    case 1:
        await pline(`You take a sip of very warm ${hliquid('water')}.`);
        break;
    case 2:
        await pline(`You take a sip of scalding hot ${hliquid('water')}.`);
        if (Fire_resistance()) {
            await pline('It seems quite tasty.');
            monstseesu(M_SEEN_FIRE);
        } else {
            losehp(rnd(6), 'sipping boiling water', KILLED_BY);
            monstunseesu(M_SEEN_FIRE);
        }
        break;
    case 3: {
        const gone = ((game.mvitals?.[PM_SEWER_RAT]?.mvflags ?? 0) & G_GONE) !== 0;
        if (gone) {
            await pline('The sink seems quite dirty.');
        } else {
            const mtmp = makemon(mons(PM_SEWER_RAT), u.ux, u.uy, MM_NOMSG);
            if (mtmp) {
                const Blind = !!(u.Blind || u.ublind);
                const what = (Blind || !canspotmon(mtmp))
                    ? 'something squirmy'
                    : a_monnam(mtmp);
                await pline(`Eek!  There's ${what} in the sink!`);
            }
        }
        break;
    }
    case 4: {
        // Faucet potion — reject POT_WATER and retry (mkobj RNG each try)
        let otmp;
        for (;;) {
            otmp = mkobj(POTION_CLASS, false);
            if (otmp && otmp.otyp !== POT_WATER) break;
            if (otmp) {
                obj_extract_self(otmp);
                otmp.quan = 0;
            }
        }
        otmp.cursed = 0;
        otmp.blessed = 0;
        const Blind = !!(u.Blind || u.ublind);
        const liquid = Blind ? 'odd' : hcolor(potion_descr(otmp.otyp));
        await pline(`Some ${liquid} liquid flows from the faucet.`);
        if (!(Blind || u.Hallucination)) observe_object(otmp);
        otmp.quan = (otmp.quan | 0) + 1; // Avoid panic upon useup()
        otmp.fromsink = 1;
        // Dynamic import avoids potion↔fountain cycle; peffect_* partial
        const { dopotion } = await import('./potion.js');
        await dopotion(otmp);
        obj_extract_self(otmp);
        otmp.quan = 0;
        break;
    }
    case 5: {
        const loc = game.level?.at(u.ux, u.uy);
        if (!((loc?.looted || 0) & S_LRING)) {
            await pline('You find a ring in the sink!');
            mkobj_at(RING_CLASS, u.ux, u.uy, true);
            if (loc) loc.looted = (loc.looted || 0) | S_LRING;
            exercise(A_WIS, true);
            newsym(u.ux, u.uy);
        } else {
            await pline(`Some dirty ${hliquid('water')} backs up in the drain.`);
        }
        break;
    }
    case 6:
        await breaksink(u.ux, u.uy);
        break;
    case 7: {
        await pline(`The ${hliquid('water')} moves as though of its own will!`);
        const gone = ((game.mvitals?.[PM_WATER_ELEMENTAL]?.mvflags ?? 0) & G_GONE) !== 0;
        if (gone || !makemon(mons(PM_WATER_ELEMENTAL), u.ux, u.uy, MM_NOMSG)) {
            await pline('But it quiets down.');
        }
        break;
    }
    case 8:
        await pline(`Yuk, this ${hliquid('water')} tastes awful.`);
        more_experienced(1, 0);
        await newexplevel();
        break;
    case 9:
        await pline('Gaggg... this tastes like sewage!  You vomit.');
        // C: morehungry(rn1(30 - ACURR(A_CON), 11))
            await morehungry(rn1(30 - acurr(A_CON), 11));
            await vomit();
        break;
    case 10:
        // C fountain.c:680–686 — toxic wastes; !Unchanging →
        // metamorphosis + polyself(POLY_NOFLAGS). Unchanging skips
        // both the You() and the call (no "fail to transform").
        await pline(`This ${hliquid('water')} contains toxic wastes!`);
        if (!Unchanging(u)) {
            await pline('You undergo a freakish metamorphosis!');
            await polyself(POLY_NOFLAGS);
        }
        break;
    case 11:
        await You_hear('clanking from the pipes...');
        break;
    case 12:
        await You_hear('snatches of song from among the sewers...');
        break;
    case 13:
        // C fountain.c:696–698 — stench then create_gas_cloud(ux,uy,1,4).
        // Size-1 skips BFS expand (no shuffle rn2); ttl = rn1(3,4).
        // Enveloped You after add_region (D-1137); inside_f HP D-1146.
        await pline('Ew, what a stench!');
        await create_gas_cloud(u.ux, u.uy, 1, 4);
        break;
    case 19:
        if (u.Hallucination) {
            await pline('From the murky drain, a hand reaches up... --oops--');
            break;
        }
        /* FALLTHROUGH */
    default: {
        // C: rn2(3) ? (rn2(2) ? "cold" : "warm") : "hot"
        const temp = rn2(3) ? (rn2(2) ? 'cold' : 'warm') : 'hot';
        await pline(`You take a sip of ${temp} ${hliquid('water')}.`);
        break;
    }
    }
}

/**
 * C ref: fountain.c level_difficulty via depth(u.uz) (endgame/amulet deferred).
 */
function level_difficulty() {
    return depth_of_level(game.u?.uz) || 1;
}

/* C you.h mhe / mhis — re-exported from the single mondata.c
   pronoun_gender port; fountain.c call sites keep importing them here. */
export { mhe, mhis } from './mondata.js';

/**
 * C ref: potion.c mongrantswish — mongone then makewish.
 * Capture gbuf glyph_at before removal, then tmp_at(DISP_ALWAYS)
 * so the map still shows the monster during the wish prompt
 * (D-1136). Not a recomputed mon_to_glyph (no extra Hallu rng).
 * Full C mongone (mdrop_special_objs / discard_minvent / m_detach)
 * still named. djinni_from_bottle calls this (D-1144); dodrink smoky
 * occupant chance still named.
 */
export async function mongrantswish(mtmp) {
    if (!mtmp) return;
    const mx = mtmp.mx | 0;
    const my = mtmp.my | 0;
    // C display.c glyph_at — gbuf, not levl[].glyph. OOB → S_room.
    const loc = game.level?.at?.(mx, my);
    const glyph = loc
        ? {
            ch: loc.disp_ch,
            color: loc.disp_color,
            dec: !!loc.disp_decgfx,
        }
        : { ch: '.', color: 0, dec: false };

    // C mongone subset (D-0472): off fmon + newsym. C keeps stale
    // mx/my; JS zeros like the prior peel so later m_at misses.
    const list = game.fmon || [];
    const i = list.indexOf(mtmp);
    if (i >= 0) list.splice(i, 1);
    mtmp.mx = 0;
    mtmp.my = 0;
    if (mx || my) newsym(mx, my);

    // C: hide that removal from player — map is visible during wish.
    tmp_at(DISP_ALWAYS, glyph);
    tmp_at(mx, my);
    const { makewish } = await import('./zap.js');
    await makewish();
    tmp_at(DISP_END, 0);
}

/**
 * C ref: fountain.c dowatersnakes — rn1(5,2) then makemon water moccasins.
 * !Blind pline: Hallucination ? makeplural(rndmonnam(NULL)) : "snakes"
 * (D-1125). Display-rng only on the Hallucination arm (C ternary).
 */
async function dowatersnakes() {
    const u = game.u || {};
    // C: num = rn1(5, 2) before G_GONE gate
    let num = rn1(5, 2);
    const gone = ((game.mvitals?.[PM_WATER_MOCCASIN]?.mvflags ?? 0) & G_GONE) !== 0;
    if (!gone) {
        const Blind = !!(u.Blind || u.ublind);
        if (!Blind) {
            // C fountain.c:45–46 — ternary is the pline %s; rndmonnam
            // is display-rng and is not evaluated when !Hallucination.
            const what = Hallucination()
                ? makeplural(rndmonnam(null))
                : 'snakes';
            await pline(`An endless stream of ${what} pours forth!`);
        } else {
            await You_hear('something hissing!');
        }
        while (num-- > 0) {
            const mtmp = makemon(mons(PM_WATER_MOCCASIN), u.ux, u.uy, MM_NOMSG);
            if (mtmp && t_at(mtmp.mx, mtmp.my)) {
                await mintrap(mtmp, NO_TRAP_FLAGS);
            }
        }
    } else {
        await pline(
            'The fountain bubbles furiously for a moment, then calms.',
        );
    }
}

/**
 * C ref: fountain.c dowaterdemon — makemon water demon; maybe wish / mintrap.
 */
async function dowaterdemon() {
    const u = game.u || {};
    const gone = ((game.mvitals?.[PM_WATER_DEMON]?.mvflags ?? 0) & G_GONE) !== 0;
    if (!gone) {
        const mtmp = makemon(mons(PM_WATER_DEMON), u.ux, u.uy, MM_NOMSG);
        if (mtmp) {
            const Blind = !!(u.Blind || u.ublind);
            if (!Blind) {
                await pline(`You unleash ${a_monnam(mtmp)}!`);
            } else {
                await You_feel('the presence of evil.');
            }
            // C: rnd(100) > (80 + level_difficulty()) → wish
            if (rnd(100) > (80 + level_difficulty())) {
                await pline(
                    `Grateful for ${mhis(mtmp)} release, ${mhe(mtmp)}`
                    + ' grants you a wish!',
                );
                await mongrantswish(mtmp);
            } else if (t_at(mtmp.mx, mtmp.my)) {
                await mintrap(mtmp, NO_TRAP_FLAGS);
            }
        }
    } else {
        await pline(
            'The fountain bubbles furiously for a moment, then calms.',
        );
    }
}

/**
 * C ref: fountain.c dowaternymph — makemon water nymph; wake + maybe mintrap.
 */
async function dowaternymph() {
    const u = game.u || {};
    const Blind = !!(u.Blind || u.ublind);
    const gone = ((game.mvitals?.[PM_WATER_NYMPH]?.mvflags ?? 0) & G_GONE) !== 0;
    let mtmp = null;
    if (!gone) {
        mtmp = makemon(mons(PM_WATER_NYMPH), u.ux, u.uy, MM_NOMSG);
    }
    // C: if (!(G_GONE) && (mtmp = makemon(...)) != 0)
    if (!gone && mtmp) {
        if (!Blind) {
            await pline(`You attract ${a_monnam(mtmp)}!`);
        } else {
            await You_hear('a seductive voice.');
        }
        mtmp.msleeping = 0;
        if (t_at(mtmp.mx, mtmp.my)) {
            await mintrap(mtmp, NO_TRAP_FLAGS);
        }
    } else if (!Blind) {
        await pline('A large bubble rises to the surface and pops.');
    } else {
        await You_hear('a loud pop.');
    }
}

/**
 * C ref: mkroom.c nexttodoor — TRUE if adjacent to door/SDOOR.
 */
export function nexttodoor(sx, sy) {
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (!isok(sx + dx, sy + dy)) continue;
            const lev = game.level?.at(sx + dx, sy + dy);
            if (!lev) continue;
            if (IS_DOOR(lev.typ) || lev.typ === SDOOR) return true;
        }
    }
    return false;
}

/** C ref: mkobj.c sobj_at */
function sobj_at(otyp, x, y) {
    for (let o = objects_at(x, y); o; o = o.nexthere) {
        if ((o.otyp | 0) === (otyp | 0)) return o;
    }
    return null;
}

/**
 * C ref: trap.c delfloortrap — destroy floor-emanating trap.
 * Named omission: hero reset_utrap (gush skips u_at cells).
 */
function delfloortrap(ttmp) {
    if (!ttmp) return false;
    const ttyp = ttmp.ttyp | 0;
    if (ttyp === SQKY_BOARD || ttyp === BEAR_TRAP || ttyp === LANDMINE
        || ttyp === FIRE_TRAP || is_pit(ttyp) || is_hole(ttyp)
        || ttyp === TELEP_TRAP || ttyp === LEVEL_TELEP
        || ttyp === WEB || ttyp === MAGIC_TRAP || ttyp === ANTI_MAGIC) {
        if (!u_at(ttmp.tx, ttmp.ty)) {
            const mtmp = m_at(ttmp.tx, ttmp.ty);
            if (mtmp) mtmp.mtrapped = 0;
        }
        deltrap(ttmp);
        return true;
    }
    return false;
}

/**
 * C ref: fountain.c gush — pool along LOS from overflowing fountain.
 * D-1117: m_at → minliquid; else newsym (C 157–160).
 * D-1148: occupied minliquid survivor failed rloc → deal_with_overcrowding.
 * Named omissions: full set_levltyp side effects (typ/flags only).
 */
async function gush(x, y, poolcnt) {
    const u = game.u || {};
    if (((x + y) % 2) || u_at(x, y)
        || rn2(1 + distmin(u.ux, u.uy, x, y))
        || (game.level?.at(x, y)?.typ !== ROOM)
        || sobj_at(BOULDER, x, y) || nexttodoor(x, y)) {
        return;
    }

    const ttmp = t_at(x, y);
    if (ttmp && !delfloortrap(ttmp)) return;

    if (!(poolcnt.n++)) {
        await pline('Water gushes forth from the overflowing fountain!');
    }

    const loc = game.level?.at(x, y);
    if (loc) {
        loc.typ = POOL;
        loc.flags = 0;
    }
    del_engr_at(x, y);
    await water_damage_chain(objects_at(x, y), true);

    // C fountain.c:157–160 — minliquid when occupied; newsym only if empty.
    const mtmp = m_at(x, y);
    if (mtmp) await minliquid(mtmp);
    else newsym(x, y);
}

/**
 * C ref: fountain.c dogushforth — gush along LOS from (u.ux,u.uy).
 * Collect couldsee cells first (gush does not vision_recalc), then
 * await each gush so pline/water_damage RNG stay in C order.
 * Exported for dig.c furniture_handled (D-0954).
 */
export async function dogushforth(drinking) {
    const u = game.u || {};
    const poolcnt = { n: 0 };
    const cells = [];
    await do_clear_area(u.ux, u.uy, 7, (x, y) => { cells.push([x, y]); }, null);
    for (const [x, y] of cells) {
        await gush(x, y, poolcnt);
    }
    if (!poolcnt.n) {
        if (drinking) await pline('Your thirst is quenched.');
        else await pline('Water sprays all over you.');
    }
}

/**
 * C ref: fountain.c dryup
 * Town first-use warn via watchman_warn_fountain (D-0894; Deaf D-1105).
 * Wizard y_n after that return (D-1096).
 * angry_guards(FALSE) after real dryup when isyou && in_town (D-1104).
 * cansee cloud-glyph skip of dryup pline (D-1106).
 */
export async function dryup(x, y, isyou) {
    const loc = game.level?.at(x, y);
    if (!loc || !IS_FOUNTAIN(loc.typ)) return;
    if (!(!rn2(3) || FOUNTAIN_IS_WARNED(x, y))) return;

    // C: first town use warns and returns without drying.
    if (isyou && in_town(x, y) && !FOUNTAIN_IS_WARNED(x, y)) {
        SET_FOUNTAIN_WARNED(x, y);
        const mtmp = await get_iter_mons(watchman_warn_fountain);
        if (!mtmp) {
            await pline('The flow reduces to a trickle.');
        }
        return;
    }
    // C fountain.c:216–219 — wizard y_n after town warn (D-1096).
    // wizard ≡ flags.debug (flag.h). No debug_fuzzer gate (unlike sit getlin).
    if (isyou && wizard_mode()) {
        if ((await yn_function('Dry up fountain?', 'yn', 'n')) === 'n') {
            return;
        }
    }
    // C fountain.c:223–227 — skip pline when gbuf cmap is S_cloud.
    if (cansee(x, y) && !glyph_at_cmap_is_s_cloud(x, y)) {
        await pline('The fountain dries up!');
    }
    loc.typ = ROOM;
    loc.flags = 0;
    loc.blessedftn = 0;
    if (game.level?.flags && (game.level.flags.nfountains | 0) > 0) {
        game.level.flags.nfountains--;
    }
    newsym(x, y);
    // C fountain.c:236–237 — after ROOM/newsym, not on the town-warn return.
    if (isyou && in_town(x, y)) {
        await angry_guards(false);
    }
}

/**
 * C ref: fountain.c drinkfountain — quaff while standing on a fountain.
 */
export async function drinkfountain() {
    const u = game.u || {};
    const loc = game.level?.at(u.ux, u.uy);
    const mgkftn = (loc?.blessedftn | 0) === 1;
    // C: fate = rnd(30) before Levitation check
    const fate = rnd(30);

    if (u.Levitation) {
        await floating_above('fountain');
        return;
    }

    if (mgkftn && (u.uluck | 0) >= 0 && fate >= 10) {
        const littleluck = (u.uluck | 0) < 4;
        await pline('Wow!  This makes you feel great!');
        // blessed restore ability
        for (let ii = 0; ii < A_MAX; ii++) {
            const base = u.acurr?.a?.[ii] | 0;
            const mx = u.amax?.a?.[ii] | 0;
            if (base < mx) {
                u.acurr.a[ii] = mx;
                if (!game.flags) game.flags = {};
                game.flags.botl = true;
            }
        }
        // gain ability; blessed if natural luck high
        let i = rn2(A_MAX);
        for (let ii = 0; ii < A_MAX; ii++) {
            if (await adjattrib(i, 1, littleluck ? -1 : 0) && littleluck) break;
            if (++i >= A_MAX) i = 0;
        }
        await flush_topl_more(); // display_nhwindow(WIN_MESSAGE, FALSE)
        await pline('A wisp of vapor escapes the fountain...');
        exercise(A_WIS, true);
        if (loc) loc.blessedftn = 0;
        return;
    }

    if (fate < 10) {
        await pline('The cool draught refreshes you.');
        // C fountain.c:281–282 — raw add, not lesshungry; don't choke on water
        u.uhunger = (u.uhunger ?? 900) + rnd(10);
        await newuhs(false);
        if (mgkftn) return;
    } else {
        switch (fate) {
        case 19: // Self-knowledge — C fountain.c:287–293
            await You_feel('self-knowledgeable...');
            await flush_topl_more(); // display_nhwindow(WIN_MESSAGE, FALSE)
            // MAGIC only — not doattributes BASIC ^X (insight.c:290 / :2009)
            await enlightenment(MAGICENLIGHTENMENT, ENL_GAMEINPROGRESS);
            exercise(A_WIS, true);
            await pline('The feeling subsides.');
            break;
        case 20: // Foul water
            await pline('The water is foul!  You gag and vomit.');
            await morehungry(rn1(20, 11));
            // C: eat.c vomit() — nomul(-2); cantvomit/Sick/acid poly (D-1127)
            await vomit();
            break;
        case 21: { // Poisonous
            await pline('The water is contaminated!');
            const poisRes = !!(u.HPoison_resistance || u.EPoison_resistance
                || u.Poison_resistance);
            if (poisRes) {
                await pline(
                    'Perhaps it is runoff from the nearby fruit farm.',
                );
                losehp(rnd(4), 'unrefrigerated sip of juice', KILLED_BY_AN);
                break;
            }
            // clang LTR: poison_strdmg(rn1(4,3), rnd(10), ...)
            const strloss = rn1(4, 3);
            const dmg = rnd(10);
            await poison_strdmg(strloss, dmg);
            exercise(A_CON, false);
            break;
        }
        case 22: // Fountain of snakes
            await dowatersnakes();
            break;
        case 23: // Water demon
            await dowaterdemon();
            break;
        case 24: { // Maybe curse some items — C fountain.c:317–334
            await pline("This water's no good!");
            await morehungry(rn1(20, 11));
            exercise(A_CON, false);
            // more severe than rndcurse(); coins skipped
            let buc_changed = 0;
            for (const obj of [...(game.invent || [])]) {
                if (obj.oclass !== COIN_CLASS && !obj.cursed && !rn2(5)) {
                    curse(obj);
                    buc_changed++;
                }
            }
            if (buc_changed) update_inventory();
            break;
        }
        case 25: // See invisible
            if (u.Blind || u.ublind) {
                if (u.HInvis || u.EInvis || u.Invis) {
                    await pline('You feel transparent.');
                } else {
                    await pline('You feel very self-conscious.');
                    await pline('Then it passes.');
                }
            } else {
                await pline('You see an image of someone stalking you.');
                await pline('But it disappears.');
            }
            u.HSee_invisible = (u.HSee_invisible || 0) | FROMOUTSIDE;
            newsym(u.ux, u.uy);
            exercise(A_WIS, true);
            break;
        case 26: { // See Monsters — detect.c monster_detect
            if (await monster_detect(null, 0)) {
                await pline(`The ${hliquid('water')} tastes like nothing.`);
            }
            exercise(A_WIS, true);
            break;
        }
        case 27: // Find a gem in the sparkling waters
            if (!FOUNTAIN_IS_LOOTED(u.ux, u.uy)) {
                await dofindgem();
                break;
            }
            // FALLTHROUGH — dowaternymph when already looted
            /* falls through */
        case 28: // Water Nymph
            await dowaternymph();
            break;
        case 29: { // Scare
            await pline(`This ${hliquid('water')} gives you bad breath!`);
            for (const mtmp of game.fmon || []) {
                if (mtmp.mhp <= 0) continue;
                // C: monflee(mtmp, 0, FALSE, FALSE) — fleetime 0 + mon_track_clear
                mtmp.mflee = 1;
                mtmp.mfleetim = 0;
                if (mtmp.mtrack) {
                    for (let j = 0; j < mtmp.mtrack.length; j++) {
                        mtmp.mtrack[j] = { x: 0, y: 0 };
                    }
                }
            }
            break;
        }
        case 30: // Gushing forth — dogushforth(TRUE)
            await dogushforth(true);
            break;
        default:
            await pline(`This tepid ${hliquid('water')} is tasteless.`);
            break;
        }
    }
    await dryup(u.ux, u.uy, true);
}

/**
 * C youprop.h Glib — uprops[GLIB].intrinsic only (no EGlib).
 * Leftover flats when the slot was never created.
 */
function wash_Glib() {
    const u = game.u || {};
    const p = u.uprops?.[GLIB];
    if (p) return p.intrinsic | 0;
    return (u.HGlib | 0) || (u.Glib | 0);
}

/**
 * C ref: objnam.c gloves_simple_name — "gauntlets" iff dknown and
 * (oc_name_known ? OBJ_NAME : OBJ_DESCR) contains "gauntlets".
 */
function gloves_simple_name(gloves) {
    if (gloves && gloves.dknown) {
        const otyp = gloves.otyp | 0;
        const ocl = objects()?.[otyp];
        const actualn = objectNameStrs[otyp] || '';
        const descrpn = objectDescrs[otyp] || '';
        const s = ocl?.oc_name_known ? actualn : descrpn;
        if (String(s).toLowerCase().includes('gauntlets')) return 'gauntlets';
    }
    return 'gloves';
}

/**
 * C ref: do_wear.c fingers_or_gloves — gloves vs makeplural(FINGER).
 */
function fingers_or_gloves(check_gloves) {
    const u = game.u || {};
    if (check_gloves && u.uarmg) return gloves_simple_name(u.uarmg);
    return makeplural(body_part(FINGER));
}

/**
 * C ref: fountain.c wash_hands — dip '-' or worn gloves in fountain.
 * Always You-wash pline; clear Glib + slippery pline; water_damage(uarmg);
 * was_glib && ER_NOTHING → ER_GREASED so dipfountain's er!=NOTHING / !rn2(2)
 * skip can fire (C comment: not what ER_GREASED is for).
 * dipsink and potion.c pool dip call this (D-1113 / D-1128).
 * @returns {Promise<number>} ER_*
 */
export async function wash_hands() {
    const u = game.u || {};
    const hands = makeplural(body_part(HAND));
    let res = ER_NOTHING;
    const was_glib = !!wash_Glib();

    await pline(
        `You wash your ${u.uarmg ? 'gloved ' : ''}${hands}`
        + ` in the ${hliquid('water')}.`,
    );
    if (wash_Glib()) {
        const { make_glib } = await import('./potion.js');
        make_glib(0);
        await pline(
            `Your ${fingers_or_gloves(true)} are no longer slippery.`,
        );
    }
    if (u.uarmg) {
        res = await water_damage(u.uarmg, null, true);
    }
    if (was_glib && res === ER_NOTHING) res = ER_GREASED;
    return res;
}

/** C youprop.h Blind — (HBlinded || EBlinded) && !BBlinded. */
function Blind() {
    const u = game.u || {};
    if (u.uroleplay?.blind) return true;
    return !!(((u.HBlinded | 0) || (u.EBlinded | 0)) && !(u.BBlinded | 0));
}

/** C youprop.h Deaf — HDeaf || EDeaf || uroleplay.deaf. */
function Deaf() {
    const u = game.u || {};
    return !!((u.HDeaf | 0) || (u.EDeaf | 0) || u.uroleplay?.deaf || u.Deaf);
}

/** C dungeon.h Inhell — In_hell(&u.uz). */
function Inhell() {
    return (game.u?.uz?.dnum | 0) === GEHENNOM;
}

/** C dungeon.c dunlev / dunlevs_in_dungeon — dipfountain case 29 gold. */
function dunlev(lev) {
    return lev?.dlevel ?? 1;
}
function dunlevs_in_dungeon(lev) {
    return game.dungeons?.[lev?.dnum]?.num_dunlevs ?? 1;
}

/**
 * Incremental analog of mkmaze.c set_levltyp fountain/sink counts.
 * Named omit: ice timers, CAN_OVERWRITE, full count_level_features scan.
 */
function dipsink_set_levltyp(x, y, newtyp) {
    const loc = game.level?.at(x, y);
    if (!loc) return;
    const oldtyp = loc.typ | 0;
    loc.typ = newtyp;
    const lf = game.level?.flags;
    if (!lf) return;
    if (IS_FOUNTAIN(oldtyp) !== IS_FOUNTAIN(newtyp)
        || IS_SINK(oldtyp) !== IS_SINK(newtyp)) {
        if (IS_FOUNTAIN(oldtyp) && !IS_FOUNTAIN(newtyp)
            && (lf.nfountains | 0) > 0) {
            lf.nfountains--;
        }
        if (!IS_FOUNTAIN(oldtyp) && IS_FOUNTAIN(newtyp)) {
            lf.nfountains = (lf.nfountains | 0) + 1;
        }
        if (IS_SINK(oldtyp) && !IS_SINK(newtyp) && (lf.nsinks | 0) > 0) {
            lf.nsinks--;
        }
        if (!IS_SINK(oldtyp) && IS_SINK(newtyp)) {
            lf.nsinks = (lf.nsinks | 0) + 1;
        }
    }
}

/**
 * C ref: do.c polymorph_sink — tight dipsink POT_POLYMORPH callee.
 * Sink → fountain / throne / altar / grave-or-vanish via rn2(4).
 * defsyms explanations are the PCHAR strings (not PCHAR2 extra).
 */
async function polymorph_sink() {
    const u = game.u || {};
    const loc = game.level?.at(u.ux, u.uy);
    if (!loc || loc.typ !== SINK) return;

    const sinklooted = (loc.looted | 0) !== 0;
    loc.flags = 0;
    loc.looted = 0;
    let expl = 'fountain';
    switch (rn2(4)) {
    default:
    case 0:
        expl = 'fountain';
        dipsink_set_levltyp(u.ux, u.uy, FOUNTAIN);
        loc.blessedftn = 0;
        if (sinklooted) SET_FOUNTAIN_LOOTED(u.ux, u.uy);
        break;
    case 1:
        expl = 'throne';
        dipsink_set_levltyp(u.ux, u.uy, THRONE);
        if (sinklooted) loc.looted = T_LOOTED;
        break;
    case 2: {
        expl = 'altar';
        dipsink_set_levltyp(u.ux, u.uy, ALTAR);
        const algn = rn2(3) - 1;
        loc.altarmask = (Inhell() && rn2(3)) ? AM_NONE : Align2amask(algn);
        break;
    }
    case 3:
        expl = 'floor of a room';
        dipsink_set_levltyp(u.ux, u.uy, ROOM);
        make_grave(u.ux, u.uy, null);
        if (loc.typ === GRAVE) expl = 'grave';
        break;
    }
    if (loc.typ !== ROOM) {
        await pline(`The sink transforms into ${an(expl)}!`);
    } else {
        await pline('The sink vanishes.');
    }
    newsym(u.ux, u.uy);
}

/**
 * C ref: fountain.c dipsink — #dip while standing on a sink (potion.c dodip).
 * Lottery !rn2(25/15) → breaksink (+ Glib hands still-slippery); hands/uarmg
 * → wash_hands; non-potion → tap + water_damage; potion pour + otyp switch
 * then trycall/useup. potion.c pool dip yn is D-1128.
 */
export async function dipsink(obj) {
    const u = game.u || {};
    const loc = game.level?.at(u.ux, u.uy);
    const not_looted_yet = !((loc?.looted | 0) & S_LRING);
    const is_hands = obj === hands_obj || (u.uarmg && obj === u.uarmg);

    if (!rn2(not_looted_yet ? 25 : 15)) {
        await breaksink(u.ux, u.uy);
        if (wash_Glib() && is_hands) {
            await pline(
                `Your ${fingers_or_gloves(true)} are still slippery.`,
            );
        }
        return;
    }
    if (is_hands) {
        await wash_hands();
        return;
    }
    if (obj.oclass !== POTION_CLASS) {
        await pline(`You hold ${the(xname(obj))} under the tap.`);
        if ((await water_damage(obj, null, true)) === ER_NOTHING) {
            await pline(nothing_seems_to_happen);
        }
        return;
    }

    await pline(
        `You pour ${(obj.quan | 0) > 1 ? 'one of ' : ''}`
        + `${the(xname(obj))} down the drain.`,
    );
    let try_call = false;
    switch (obj.otyp) {
    case POT_POLYMORPH:
        await polymorph_sink();
        try_call = true;
        break;
    case POT_OIL:
        if (!Blind()) {
            await pline('It leaves an oily film on the basin.');
            try_call = true;
        } else {
            await pline(nothing_seems_to_happen);
        }
        break;
    case POT_ACID:
        try_call = true;
        if (!Blind()) {
            await pline('The drain seems less clogged.');
        } else if (!Deaf()) {
            await pline('You hear a sucking sound.');
        } else {
            await pline(nothing_seems_to_happen);
            try_call = false;
        }
        break;
    case POT_LEVITATION:
        await sink_backs_up(u.ux, u.uy);
        try_call = true;
        break;
    case POT_OBJECT_DETECTION:
        if (!((loc?.looted | 0) & S_LRING)) {
            await pline('You sense a ring lost down the drain.');
            try_call = true;
            break;
        }
        // FALLTHROUGH — C potions with no potionbreathe effects + water
    case POT_GAIN_LEVEL:
    case POT_GAIN_ENERGY:
    case POT_MONSTER_DETECTION:
    case POT_FRUIT_JUICE:
    case POT_WATER:
        await pline(nothing_seems_to_happen);
        break;
    default: {
        await pline('A wisp of vapor rises up...');
        const youdata = game.youmonst?.data;
        if (!breathless(youdata) || haseyes(youdata)) {
            const { potionbreathe } = await import('./potion.js');
            await potionbreathe(obj);
        }
        break;
    }
    }
    if (try_call && obj.dknown) await trycall(obj);
    useup(obj);
}

/**
 * C ref: fountain.c dipfountain
 * @param {object} obj invent object or hands_obj
 */
export async function dipfountain(obj) {
    const u = game.u || {};
    if (u.Levitation) {
        await floating_above('fountain');
        return;
    }

    const is_hands = obj === hands_obj;

    // C fountain.c:404–447 — Excalibur LONG_SWORD body (D-1107).
    // && order: otyp, ulevel, rn2(Role_if(PM_KNIGHT)?6:30), quan==1,
    // !oartifact, !exist_artifact(LONG_SWORD, artiname(ART_EXCALIBUR)).
    // Not dryup: no rn2(3), no town-warn, no wizard yn. Fountain → ROOM
    // via set_levltyp analog + flags=0, then in_town angry_guards.
    if (obj && obj.otyp === LONG_SWORD && (u.ulevel | 0) >= 5
        && !rn2(Role_if(PM_KNIGHT) ? 6 : 30)
        && (obj.quan | 0) === 1 && !obj.oartifact
        && !exist_artifact(LONG_SWORD, artiname(ART_EXCALIBUR))) {
        const lady = 'Lady of the Lake';
        if ((u.ualign?.type | 0) !== A_LAWFUL) {
            await pline(
                `A freezing mist rises from the ${hliquid('water')}`
                + ' and envelopes the sword.',
            );
            await pline('The fountain disappears!');
            curse(obj);
            if ((obj.spe | 0) > -6 && !rn2(3)) {
                obj.spe = (obj.spe | 0) - 1;
            }
            obj.oerodeproof = false;
            exercise(A_WIS, false);
            livelog_printf(
                LL_ARTIFACT,
                'was denied %s!  The %s has deemed %s unworthy',
                artiname(ART_EXCALIBUR), lady, uhim(),
            );
        } else {
            await pline(
                'From the murky depths, a hand reaches up to bless the sword.',
            );
            await pline('As the hand retreats, the fountain disappears!');
            obj = oname(
                obj, artiname(ART_EXCALIBUR),
                ONAME_VIA_DIP | ONAME_KNOW_ARTI,
            );
            discover_artifact(ART_EXCALIBUR);
            bless(obj);
            obj.oeroded = 0;
            obj.oeroded2 = 0;
            obj.oerodeproof = true;
            exercise(A_WIS, true);
            livelog_printf(
                LL_ARTIFACT, 'was given %s by the %s',
                artiname(ART_EXCALIBUR), lady,
            );
        }
        // C fountain.c:441 — update_inventory() after gift or deny,
        // before set_levltyp ROOM. Both arms share this call (C).
        // Default perm_invent Off: tty without TTY_PERM_INVENT no-ops
        // (D-1126). Not artidisco save/rest.
        update_inventory();
        const loc = game.level?.at(u.ux, u.uy);
        if (loc) {
            // C set_levltyp(u.ux,u.uy,ROOM) + levl[].flags=0.
            // Full set_levltyp (ice/lava/count_level_features) still named.
            loc.typ = ROOM;
            loc.flags = 0;
            loc.looted = 0;
            if (game.level?.flags && (game.level.flags.nfountains | 0) > 0) {
                game.level.flags.nfountains--;
            }
        }
        newsym(u.ux, u.uy);
        if (in_town(u.ux, u.uy)) {
            await angry_guards(false);
        }
        return;
    }

    let er = ER_NOTHING;
    if (is_hands || obj === u.uarmg) {
        er = await wash_hands();
    } else {
        er = await water_damage(obj, null, true);
    }

    if (er === ER_DESTROYED || (er !== ER_NOTHING && !rn2(2))) {
        return;
    }

    switch (rnd(30)) {
    case 16: // Curse the item
        if (!is_hands && obj.oclass !== COIN_CLASS && !obj.cursed) {
            curse(obj);
        }
        break;
    case 17:
    case 18:
    case 19:
    case 20: // Uncurse the item
        // C fountain.c:464–475 — !hands && cursed → glow (unless Blind)
        // then uncurse; else "feeling of loss" (blessed/uncursed/hands).
        // Coins are not skipped (unlike case 16). Luck/lamplit uncurse
        // side effects stay on mkobj.js uncurse.
        if (!is_hands && obj.cursed) {
            if (!Blind()) {
                await pline(`The ${hliquid('water')} glows for a moment.`);
            }
            uncurse(obj);
        } else {
            await pline('A feeling of loss comes over you.');
        }
        break;
    case 21: // Water Demon
        await dowaterdemon();
        break;
    case 22: // Water Nymph
        await dowaternymph();
        break;
    case 23: // Endless stream of snakes
        await dowatersnakes();
        break;
    case 24: // Find a gem
        if (!FOUNTAIN_IS_LOOTED(u.ux, u.uy)) {
            await dofindgem();
            break;
        }
        // FALLTHROUGH — dogushforth when already looted
        /* falls through */
    case 25: // Water gushes forth
        await dogushforth(false);
        break;
    case 26: // Strange feeling
        // C: body_part(ARM) — humanoid default "arm" (poly forms deferred)
        await pline('A strange tingling runs up your arm.');
        break;
    case 27: // Strange feeling
        await You_feel('a sudden chill.');
        break;
    case 28: { // Urge to bathe — may lose gold + exercise(A_WIS,FALSE)
        // C ref: fountain.c dipfountain case 28
        await pline('An urge to take a bath overwhelms you.');
        let money = money_cnt(game.invent);
        if (money > 10) {
            // Amount to lose (fountains don't pay change)
            money = Math.floor(somegold(money) / 10);
            const invent = game.invent || [];
            // Snapshot: invent may shrink via delobj/splice
            for (let i = 0; i < invent.length && money > 0; ) {
                const otmp = invent[i];
                if (otmp.oclass === COIN_CLASS) {
                    const denomination = objects()?.[otmp.otyp]?.oc_cost || 1;
                    let coin_loss = Math.floor(
                        (money + denomination - 1) / denomination,
                    );
                    coin_loss = Math.min(coin_loss, otmp.quan | 0);
                    otmp.quan = (otmp.quan | 0) - coin_loss;
                    money -= coin_loss * denomination;
                    if (!otmp.quan) {
                        // C delobj: obj_resists rn2(100) then extract.
                        // JS obj_extract_self omits invent — splice + delobj.
                        invent.splice(i, 1);
                        delobj(otmp);
                        continue;
                    }
                }
                i++;
            }
            await pline('You lost some of your gold in the fountain!');
            CLEAR_FOUNTAIN_LOOTED(u.ux, u.uy);
            exercise(A_WIS, false);
        }
        break;
    }
    case 29:
        // C fountain.c:530–546 — You see coins. More gold nearer
        // the surface: rnd((num_dunlevs - dlevel + 1)*2) + 5.
        // Already-looted fountains skip mkgold/pline/exercise/newsym
        // (dryup still runs after the switch). Blind skips the
        // glistening pline but still places gold.
        if (FOUNTAIN_IS_LOOTED(u.ux, u.uy)) break;
        SET_FOUNTAIN_LOOTED(u.ux, u.uy);
        mkgold(
            rnd((dunlevs_in_dungeon(u.uz) - dunlev(u.uz) + 1) * 2) + 5,
            u.ux, u.uy,
        );
        if (!Blind()) {
            await pline(
                `Far below you, you see coins glistening in the ${hliquid('water')}.`,
            );
        }
        exercise(A_WIS, true);
        newsym(u.ux, u.uy);
        break;
    default:
        if (er === ER_NOTHING) {
            await pline(nothing_seems_to_happen);
        }
        break;
    }
    // C fountain.c:552 — update_inventory() after switch, before dryup.
    // Unconditional (unlike drinkfountain case 24 buc_changed).
    // Default perm_invent Off: tty without TTY_PERM_INVENT no-ops (D-1126).
    // Excalibur LONG_SWORD path returns after :441 and skips this site (C).
    update_inventory();
    await dryup(u.ux, u.uy, true);
}
