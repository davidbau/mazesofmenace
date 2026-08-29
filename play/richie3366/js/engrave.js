// engrave.js — Engrave command / floor inscriptions (partial).
// C ref: engrave.c doengrave, engrave occupation, make_engr_at, engr_at,
//        read_engr_at, wipeout_text, wipe_engr_at, u_wipe_engr,
//        random_engraving, rloc_engr, make_grave, can_reach_floor,
//        doengrave_sfx_item / doengrave_sfx_item_WAN, stylus_ok,
//        freehand, cant_reach_floor;
//        hack.c maybe_smudge_engr.
//
// Branch envelope: u_can_engrave floor gate + live getobj("write with",
// stylus_ok, GETOBJ_PROMPT) (hands `-` SUGGEST; canned IA_ENGRAVE_OBJ
// KEY D-1675) + DUST fingertip You/getlin + literate bump + DUST/blood/
// Blind/Confusion/Stunned/Hallu mix-up + set_occupation one-tick finish
// via make_engr_at (Elbereth → exercise(A_WIS,TRUE)); look_here/`:` via
// read_engr_at (DUST/ENGRAVE/BURN/MARK/blood non-Blind); `u_wipe_engr`
// → can_reach_floor(TRUE)+wipe_engr_at (D-1051 apply pole/grapple);
// mklev niche age via wipe_engr_at → wipeout_text (seed==0 RNG path);
// fill graffiti via
// random_engraving → getrumor or get_rnd_text(ENGRAVEFILE);
// mklev graves via make_grave → get_rnd_text(EPITAPHFILE) HEADSTONE;
// domove smudge via maybe_smudge_engr → wipe_engr_at(rnd(5)).
// **doengrave non-hands stylus sfx** (D-1689: wand/weapon/marker/towel/
// gem oc_tough / boots / large/silly); canned KEY was D-1675.
// Named omissions: altar/jello/swallow/lava/pool; yn add-to (same-type
// defaults append); multi-turn dulling / marker ink occupation; livelog;
// allmain DEX timeout D-1372; dokick(2) D-1360;
// uhitm do_attack(3) D-1373; dothrow throw_obj(2) D-1374;
// dig.c still stubbed;
// Blind feel path for engrave/burn; full surface()/ceiling()/is_ice;
// wipeout_text seeded (non-zero) path; invent lookhere / pickup() still
// pass FALSE/TRUE vs C `trap && is_pit` at those callers;
// display.js feel_can_reach_floor clone still omits hugs / ceiling /
// Flying (uses FALSE so check_pit N/A).
// Ported: Levitation (H||E)&&!B D-1070; ustuck AT_HUGS + !sticks
// D-1071 (local mondata.c sticks — avoid engrave←monmove cycle);
// sticks exported for sit.js dosit lap D-1072; ceiling_hider +
// Flying||MZ_HUGE D-1082; Flying reads uprops[FLYING] (D-1085; confer
// writes extrinsic, not EFlying); check_pit teeter/shaft D-1083.
// disturb_grave (D-0985) via kick_nondoor / engraving callers.
// Engraving map glyphs (S_engroom/S_engrcorr) live in display.js newsym.

import { game } from './gstate.js';
import { rn1, rn2, rnd } from './rng.js';
import { pline, newsym } from './display.js';
import { getlin } from './getline.js';
import { getobj } from './invent.js';
import { A_WIS, exercise } from './attrib.js';
import { getrumor, get_rnd_text, xcrypt } from './rumors.js';
import { ENGRAVE_BUF, MD_PAD_ENGRAVE } from './generated/engrave_data.js';
import { EPITAPH_BUF, MD_PAD_EPITAPH } from './generated/epitaph_data.js';
import { ART_FIRE_BRAND } from './generated/artifacts_data.js';
import {
    WEAPON_CLASS, WAND_CLASS, GEM_CLASS, RING_CLASS, TOOL_CLASS,
    ARMOR_CLASS, BALL_CLASS, ROCK_CLASS, FOOD_CLASS, SCROLL_CLASS,
    SPBOOK_CLASS, VENOM_CLASS, ILLOBJ_CLASS, AMULET_CLASS, CHAIN_CLASS,
    POTION_CLASS, COIN_CLASS, RANDOM_CLASS,
    objectNames, is_blade, is_boots,
} from './objects.js';
import {
    DUST, ENGRAVE, BURN, MARK, ENGR_BLOOD, HEADSTONE, ICE,
    ROOM, GRAVE, IS_GRAVE, MM_NOMSG, COLNO, ROWNO,
    ACCESSIBLE, IS_FOUNTAIN, IS_AIR, IS_POOL, IS_LAVA,
    Never_mind, Is_airlevel, Is_waterlevel, P_RIDING, P_BASIC,
    FLYING, GETOBJ_SUGGEST, GETOBJ_DOWNPLAY, GETOBJ_PROMPT,
    ECMD_TIME, WAND_BACKFIRE_CHANCE, FINGERTIP, HAND, DRAWBRIDGE_DOWN,
} from './const.js';
import { nomul } from './hack.js';
import { t_at, uteetering_at_seen_pit, uescaped_shaft } from './trap.js';
import { goodpos } from './teleport.js';
import { makemon } from './makemon.js';
import { monsterNames } from './generated/monsters_data.js';
import {
    mons, is_hider, is_clinger, is_flyer, is_demon, is_vampire, MZ_HUGE,
} from './monsters.js';
import {
    yname, doname, Yname2, Yobjnam2, Tobjnam, otense, The, xname,
    body_part_latebound,
} from './objnam.js';
import { zappable, learnwand, zapnodir } from './zap.js';
import { check_unpaid } from './shk.js';
import { more_experienced } from './exper.js';
import { useup } from './eat.js';
import { is_art } from './artifact.js';
import { welded, bimanual } from './wield.js';
import { dry_a_towel, is_wet_towel, hands_obj } from './weapon.js';
import { wand_explode } from './read.js';

const PM_GHOUL = monsterNames.indexOf('PM_GHOUL');

const TOWEL = objectNames.indexOf('TOWEL');
const MAGIC_MARKER = objectNames.indexOf('MAGIC_MARKER');

/** C: decl.h Something */
const Something = 'Something';

function mungspaces(s) {
    return String(s || '').trim().replace(/\s+/g, ' ');
}

function Blind() {
    return !!(game.u?.Blind || game.u?.ublind);
}
function Confusion() {
    return !!(game.u?.Confusion);
}
function Stunned() {
    return !!(game.u?.Stunned);
}
function Hallucination() {
    return !!(game.u?.Hallucination);
}

/** C ref: hack.c is_ice — ice terrain check (partial). */
function is_ice(x, y) {
    const typ = game.level?.locations?.[x]?.[y]?.typ;
    return typ === ICE;
}

/**
 * C ref: description.c surface — floor noun under engraving.
 * Branch envelope: room/corridor/door → floor; ice deferred via is_ice.
 */
function surface(_x, _y) {
    return 'floor';
}

/** C ref: engrave.c engr_at */
export function engr_at(x, y) {
    for (let ep = game.head_engr; ep; ep = ep.nxt_engr) {
        if (ep.engr_x === x && ep.engr_y === y) return ep;
    }
    return null;
}

/** C ref: engrave.c del_engr_at — delete any engraving at <x,y>. */
export function del_engr_at(x, y) {
    const ep = engr_at(x, y);
    if (ep) del_engr(ep);
}

/** C ref: engrave.c del_engr — unlink one engraving. */
export function del_engr(ep) {
    if (!ep) return;
    let prev = null;
    for (let cur = game.head_engr; cur; prev = cur, cur = cur.nxt_engr) {
        if (cur === ep) {
            if (prev) prev.nxt_engr = cur.nxt_engr;
            else game.head_engr = cur.nxt_engr;
            return;
        }
    }
}

/**
 * C engrave.c rloc_engr :1666–1681 — randomly relocate one engraving.
 * `goodpos(NULL, 0)` is the live teleport.c export (D-1476 zap_map
 * TELE). `newsym` the destination; C notes the caller handled the
 * old cell (zap_map does not newsym it).
 */
export function rloc_engr(ep) {
    if (!ep) return;
    let tryct = 200;
    let tx;
    let ty;
    do {
        if (--tryct < 0) return;
        tx = rn1(COLNO - 3, 2);
        ty = rn2(ROWNO);
    } while (engr_at(tx, ty) || !goodpos(tx, ty, null, 0));
    ep.engr_x = tx;
    ep.engr_y = ty;
    newsym(tx, ty);
}

/** C hack.h / global.h BUFSZ — wipeout_text modulus + read_engr_at buf. */
const BUFSZ = 256;

/** C ref: engrave.c rubouts[] — partial character substitutes. */
const RUBOUTS = {
    A: '^', B: 'Pb[', C: '(', D: '|)[', E: '|FL[_', F: '|-', G: 'C(', H: '|-',
    I: '|', K: '|<', L: '|_', M: '|', N: '|\\', O: 'C(', P: 'F', Q: 'C(', R: 'PF',
    T: '|', U: 'J', V: '/\\', W: 'V/\\', Z: '/',
    b: '|', d: 'c|', e: 'c', g: 'c', h: 'n', j: 'i', k: '|', l: '|', m: 'nr',
    n: 'r', o: 'c', q: 'c', w: 'v', y: 'v',
    ':': '.', ';': ',:', ',': '.', '=': '-', '+': '-|', '*': '+', '@': '0',
    '0': 'C(', '1': '|', '6': 'o', '7': '/', '8': '3o',
};

/**
 * C ref: engrave.c random_engraving — rumor or ENGRAVEFILE line, then wipe 1/4.
 * Branch envelope: !rn2(4) short-circuits past getrumor into get_rnd_text;
 * empty getrumor also falls through.
 */
export function random_engraving() {
    let pristine = '';
    if (!rn2(4) || !(pristine = getrumor(0, true)) || !pristine) {
        pristine = get_rnd_text(ENGRAVE_BUF, rn2, MD_PAD_ENGRAVE) || '';
    }
    const text = wipeout_text(pristine, Math.trunc(pristine.length / 4), 0);
    return { text, pristine };
}

/**
 * C ref: engrave.c make_grave — place GRAVE + HEADSTONE engraving.
 * Branch envelope: ROOM/GRAVE + !trap; null str → get_rnd_text(EPITAPHFILE);
 * fixed str (e.g. "Saved by the bell!") skips the epitaph draw.
 * Named omission: full set_levltyp side effects beyond typ=GRAVE.
 */
export function make_grave(x, y, str) {
    const loc = game.level?.at(x, y);
    if (!loc) return;
    if ((loc.typ !== ROOM && loc.typ !== GRAVE) || t_at(x, y)) return;
    loc.typ = GRAVE;
    del_engr(engr_at(x, y));
    let text = str;
    if (!text) {
        text = get_rnd_text(EPITAPH_BUF, rn2, MD_PAD_EPITAPH) || '';
    }
    make_engr_at(x, y, text, null, 0, HEADSTONE);
}

/**
 * C ref: engrave.c wipeout_text — degrade characters in-place (returns string).
 * Branch envelope: seed==0 random path (rn2(lth), rn2(4), optional rn2(ln)).
 * Named omission: non-zero seed deterministic path.
 */
export function wipeout_text(engr, cnt, seed = 0) {
    const s = String(engr || '').split('');
    let lth = s.length;
    if (!lth || cnt <= 0) return s.join('');
    let n = cnt;
    let seedu = seed >>> 0;
    while (n--) {
        let nxt;
        let use_rubout;
        if (!seedu) {
            nxt = rn2(lth);
            use_rubout = rn2(4);
        } else {
            nxt = seedu % lth;
            seedu = (seedu * 31) % (BUFSZ - 1);
            use_rubout = seedu & 3;
        }
        if (s[nxt] === ' ') continue;
        if ("?.,'`-|_".includes(s[nxt])) {
            s[nxt] = ' ';
            continue;
        }
        if (!use_rubout) {
            s[nxt] = '?';
            continue;
        }
        const wipeto = RUBOUTS[s[nxt]];
        if (wipeto) {
            let j;
            if (!seedu) {
                j = rn2(wipeto.length);
            } else {
                seedu = (seedu * 31) % (BUFSZ - 1);
                j = seedu % wipeto.length;
            }
            s[nxt] = wipeto[j];
        } else {
            s[nxt] = '?';
        }
    }
    while (lth && s[lth - 1] === ' ') {
        s[--lth] = '';
    }
    return s.slice(0, lth).join('');
}

/**
 * C youprop.h Levitation — (HLevitation || ELevitation) && !BLevitation.
 * confer_oc_oprop mirrors E (D-0976); timeout/eat write H. Sticky
 * u.Levitation is not a C field (D-1070).
 */
function Levitation() {
    const u = game.u || {};
    return !!(((u.HLevitation | 0) || (u.ELevitation | 0))
        && !(u.BLevitation | 0));
}

/**
 * C youprop.h Flying — (HFlying || EFlying || steed is_flyer) && !BFlying.
 * H/E/B ≡ uprops[FLYING] (prop.h:71). confer_oc_oprop writes worn
 * AMULET_OF_FLYING to uprops[].extrinsic and never mirrors EFlying
 * (D-1085; same OR as eat.js Flying). Sticky u.Flying is not a C
 * field. Do not skip !blocked for a leftover sticky bit.
 */
function Flying() {
    const u = game.u || {};
    const prop = u.uprops?.[FLYING];
    const blocked = (u.BFlying | 0) || (prop?.blocked | 0);
    const steedFlyer = !!(u.usteed && is_flyer(u.usteed.data));
    return !!(((u.HFlying | 0) || (u.EFlying | 0)
        || (prop?.intrinsic | 0) || (prop?.extrinsic | 0)
        || steedFlyer)
        && !blocked);
}

/**
 * C ref: mondata.h ceiling_hider — hider that clings (not mimic) or
 * flies (lurker above). Trapper is HIDE without CLING/FLY.
 */
function ceiling_hider(ptr) {
    if (!is_hider(ptr)) return false;
    return (is_clinger(ptr) && ptr.mlet !== 'S_MIMIC') || is_flyer(ptr);
}

/** C monattk.h — used by can_reach_floor hugs arm / local sticks. */
const AT_HUGS = 7;
const AT_ENGL = 11;
const AD_STCK = 19;
const AD_WRAP = 28;

/**
 * C ref: mondata.c attacktype — any mattk slot with aatyp.
 * Local copy: monmove.js already imports wipe_engr_at (cycle).
 */
function attacktype(ptr, aatyp) {
    const slots = ptr?.mattk;
    if (!slots) return false;
    for (let i = 0; i < slots.length; i++) {
        if (slots[i]?.aatyp === aatyp) return true;
    }
    return false;
}

/** C ref: mondata.c dmgtype — any mattk slot with adtyp. */
function dmgtype(ptr, adtyp) {
    const slots = ptr?.mattk;
    if (!slots) return false;
    for (let i = 0; i < slots.length; i++) {
        if (slots[i]?.adtyp === adtyp) return true;
    }
    return false;
}

/**
 * C ref: mondata.c sticks — AD_STCK, non-engulf AD_WRAP, or AT_HUGS.
 * Short-circuit matches C: STCK || (WRAP && !ENGL) || HUGS.
 * Exported for sit.js dosit lap (D-1072). Do not import monmove.js
 * sticks (AT_HUGS commented as 6, AT_ENGL as 7).
 */
export function sticks(ptr) {
    return !!(dmgtype(ptr, AD_STCK)
        || (dmgtype(ptr, AD_WRAP) && !attacktype(ptr, AT_ENGL))
        || attacktype(ptr, AT_HUGS));
}

/**
 * C ref: engrave.c can_reach_floor — whether hero can touch ground-level.
 * Branch envelope: swallow / ustuck AT_HUGS+!sticks / Levitation(+!air/water)
 * / unskilled steed / uundetected ceiling_hider FALSE / Flying||MZ_HUGE
 * TRUE (skips check_pit; Flying ORs uprops[FLYING] D-1085) / check_pit && t_at && (uteetering || uescaped)
 * FALSE. invent/pickup caller pit-arg and cant_reach_floor named.
 */
export function can_reach_floor(check_pit) {
    const u = game.u || {};
    const youdata = game.youmonst?.data;
    // C engrave.c: uswallow || (ustuck && !sticks(youmonst.data)
    // && attacktype(ustuck->data, AT_HUGS)) || (Levitation && !air/water)
    if (u.uswallow
        || (u.ustuck && !sticks(youdata)
            && attacktype(u.ustuck.data, AT_HUGS))
        || (Levitation() && !(Is_airlevel(u.uz) || Is_waterlevel(u.uz)))) {
        return false;
    }
    if (u.usteed) {
        const sk = u.weapon_skills?.[P_RIDING];
        const rank = typeof sk === 'object' ? (sk.skill ?? 0) : (sk ?? 0);
        if (rank < P_BASIC) return false;
    }
    // C: u.uundetected && ceiling_hider(youmonst.data) → FALSE
    if (u.uundetected && ceiling_hider(youdata)) {
        return false;
    }
    // C: Flying || msize >= MZ_HUGE → TRUE (before check_pit)
    if (Flying() || (youdata?.msize | 0) >= MZ_HUGE) {
        return true;
    }
    // C: check_pit && t_at && (uteetering_at_seen_pit || uescaped_shaft)
    if (check_pit) {
        const t = t_at(u.ux, u.uy);
        if (t && (uteetering_at_seen_pit(t) || uescaped_shaft(t))) {
            return false;
        }
    }
    return true;
}

/**
 * C engrave.c cant_reach_floor `:217–228`. ceiling()/full surface named.
 */
export async function cant_reach_floor(x, y, up, check_pit, wand_engraving) {
    const where = up
        ? 'ceiling'
        : (check_pit && can_reach_floor(false))
            ? 'bottom of the pit'
            : surface(x, y);
    const who = wand_engraving
        ? 'The wand does nothing more, and the tip of the wand'
        : 'You';
    await pline(`${who} can't reach the ${where}.`);
}

/**
 * C ref: hack.c maybe_smudge_engr — after a successful walk/rush, maybe
 * erode engravings at the old and/or new hero cell via wipe_engr_at(rnd(5)).
 */
export function maybe_smudge_engr(x1, y1, x2, y2) {
    if (!can_reach_floor(true)) return;
    let ep = engr_at(x1, y1);
    if (ep && ep.engr_type !== HEADSTONE) {
        wipe_engr_at(x1, y1, rnd(5), false);
    }
    if ((x2 !== x1 || y2 !== y1)
        && (ep = engr_at(x2, y2)) && ep.engr_type !== HEADSTONE) {
        wipe_engr_at(x2, y2, rnd(5), false);
    }
}

/**
 * C ref: engrave.c wipe_engr_at — age/erode an existing engraving.
 * Branch envelope: non-HEADSTONE, !nowipeout; DUST/blood keep full cnt;
 * non-DUST/blood may rn2-gate cnt to 0/1; BURN needs ice or magical rn2.
 */
export function wipe_engr_at(x, y, cnt, magical = false) {
    const ep = engr_at(x, y);
    if (!ep || ep.engr_type === HEADSTONE || ep.nowipeout) return;
    if (ep.engr_type === BURN && !is_ice(x, y)
        && !(magical && !rn2(2))) {
        return;
    }
    let n = cnt;
    if (ep.engr_type !== DUST && ep.engr_type !== ENGR_BLOOD) {
        n = rn2(1 + Math.trunc(50 / (cnt + 1))) ? 0 : 1;
    }
    let txt = String(ep.engr_txt?.actual_text ?? '');
    txt = wipeout_text(txt, n, 0);
    while (txt.startsWith(' ')) txt = txt.slice(1);
    if (!txt) {
        del_engr(ep);
        return;
    }
    ep.engr_txt.actual_text = txt;
}

/**
 * C ref: engrave.c u_wipe_engr — wipe the hero cell when the floor is
 * reachable. No RNG when there is no engraving (wipe_engr_at returns).
 */
export function u_wipe_engr(cnt) {
    if (can_reach_floor(true)) {
        const u = game.u || {};
        wipe_engr_at(u.ux | 0, u.uy | 0, cnt, false);
    }
}

/**
 * C ref: engrave.c read_engr_at — sense engraving type + You read/feel text.
 * Branch envelope: DUST/ENGRAVE/HEADSTONE/BURN/MARK/ENGR_BLOOD sighted
 * (non-Blind); Blind feel for engrave/burn when can_reach deferred as
 * non-Blind path only for now. Truncation + pristine endpunct rules.
 */
export async function read_engr_at(x, y) {
    const ep = engr_at(x, y);
    if (!ep) return;
    const text = ep.engr_txt?.actual_text || '';
    if (!text) return;

    const blind = Blind();
    const eloc = surface(x, y);
    let sensed = false;

    switch (ep.engr_type) {
    case DUST:
        if (!blind) {
            sensed = true;
            await pline(
                `${Something} is written here in the ${is_ice(x, y) ? 'frost' : 'dust'}.`,
            );
        }
        break;
    case ENGRAVE:
    case HEADSTONE:
        if (!blind) {
            sensed = true;
            await pline(`${Something} is engraved here on the ${eloc}.`);
        }
        break;
    case BURN:
        if (!blind) {
            sensed = true;
            await pline(
                `Some text has been ${is_ice(x, y) ? 'melted' : 'burned'} into the ${eloc} here.`,
            );
        }
        break;
    case MARK:
        if (!blind) {
            sensed = true;
            await pline(`There's some graffiti on the ${eloc} here.`);
        }
        break;
    case ENGR_BLOOD:
        if (!blind) {
            sensed = true;
            await pline('You see a message scrawled in blood here.');
        }
        break;
    default:
        sensed = true;
        await pline(`${Something} is written in a very strange way.`);
        break;
    }

    if (!sensed) return;

    // C: maxelen = sizeof buf[BUFSZ] - sizeof "You feel the words: \"\"."
    // (sizeof string literal includes the terminating NUL).
    const feelLit = 'You feel the words: "".';
    const maxelen = BUFSZ - (feelLit.length + 1);
    let et = text;
    let elen = et.length;
    if (elen > maxelen) {
        et = et.slice(0, maxelen);
        elen = maxelen;
    }
    const pristine = ep.engr_txt?.pristine_text || text;
    let endpunct = '';
    const last = et[elen - 1];
    if (elen < 2
        || !(pristine[elen - 1] === last && '.!?'.includes(last))) {
        endpunct = '.';
    }
    await pline(
        `You ${blind ? 'feel the words' : 'read'}: "${et}"${endpunct}`,
    );
    if (ep.engr_txt) ep.engr_txt.remembered_text = text;
    ep.eread = 1;
    ep.erevealed = 1;
    if ((game.context?.run | 0) > 0) nomul(0);
}

/**
 * C ref: engrave.c make_engr_at — place/replace engraving text.
 * Pristine/guardobjects mklev path partial; Elbereth player exercise wired.
 */
export function make_engr_at(x, y, text, pristine, e_time, e_type) {
    del_engr(engr_at(x, y));
    const s = String(text || '');
    const pristine_s = pristine != null ? String(pristine) : s;
    const ep = {
        nxt_engr: game.head_engr || null,
        engr_x: x,
        engr_y: y,
        engr_txt: { actual_text: s, remembered_text: s, pristine_text: pristine_s },
        engr_time: e_time || 0,
        engr_type: (e_type > 0) ? e_type : rnd(HEADSTONE - 1),
        eread: 0,
        erevealed: 0,
        guardobjects: 0,
    };
    game.head_engr = ep;
    if (s === 'Elbereth') {
        // C: gi.in_mklev → guardobjects; else exercise wisdom
        if (game.in_mklev) ep.guardobjects = 1;
        else exercise(A_WIS, true);
    }
    return ep;
}

/**
 * C engrave.c stylus_ok `:480–499`. Hands SUGGEST; weapon/wand/gem/ring
 * and towel/marker SUGGEST; else DOWNPLAY.
 * @param {object|null} obj
 * @returns {number}
 */
function stylus_ok(obj) {
    if (!obj) return GETOBJ_SUGGEST;
    if (obj.oclass === WEAPON_CLASS || obj.oclass === WAND_CLASS
        || obj.oclass === GEM_CLASS || obj.oclass === RING_CLASS) {
        return GETOBJ_SUGGEST;
    }
    if (obj.oclass === TOOL_CLASS
        && (obj.otyp === TOWEL || obj.otyp === MAGIC_MARKER)) {
        return GETOBJ_SUGGEST;
    }
    return GETOBJ_DOWNPLAY;
}

/** C engrave.c freehand `:472–477`. C home; other files keep local clones. */
export function freehand() {
    const u = game.u || {};
    const uwep = u.uwep;
    if (!uwep || !welded(uwep)) return true;
    if (!bimanual(uwep) && (!u.uarms || !u.uarms.cursed)) return true;
    return false;
}

/** C decl.c hands_obj — weapon.js sentinel (`_hands` / otyp -1). */
function is_hands_stylus(otmp) {
    return otmp === hands_obj
        || !!(otmp && (otmp._hands || otmp._hands_obj || otmp.otyp === -1));
}

/** C engrave.c doengrave_ctx_init `:544–579`. jello named (swallow gated). */
function doengrave_ctx_init() {
    const u = game.u || {};
    const de = {
        dengr: false, doblind: false, doknown: false, eow: false,
        ptext: true, teleengr: false, zapwand: false, disprefresh: false,
        adding: false, ret: 0, type: DUST, oetype: 0, otmp: null,
        oep: engr_at(u.ux, u.uy), buf: '', ebuf: '', post_engr_text: '',
        writer: '', everb: 'write in', eloc: 'floor', jello: false,
        frosted: is_ice(u.ux, u.uy),
    };
    if (de.oep) de.oetype = de.oep.engr_type | 0;
    const youdata = game.youmonst?.data;
    if (youdata && (is_demon(youdata) || is_vampire(youdata))) {
        de.type = ENGR_BLOOD;
    }
    return de;
}

/** C engrave.c blind_writing[] / blengr `:1743–1768`. */
const BLIND_WRITING = [
    [0x44, 0x66, 0x6d, 0x69, 0x62, 0x65, 0x22, 0x45, 0x7b, 0x71, 0x65, 0x6d, 0x72],
    [0x51, 0x67, 0x60, 0x7a, 0x7f, 0x21, 0x40, 0x71, 0x6b, 0x71, 0x6f, 0x67, 0x63],
    [0x49, 0x6d, 0x73, 0x69, 0x62, 0x65, 0x22, 0x4c, 0x61, 0x7c, 0x6d, 0x67, 0x24, 0x42, 0x7f, 0x69, 0x6c, 0x77, 0x67, 0x7e],
    [0x4b, 0x6d, 0x6c, 0x66, 0x30, 0x4c, 0x6b, 0x68, 0x7c, 0x7f, 0x6f],
    [0x51, 0x67, 0x70, 0x7a, 0x7f, 0x6f, 0x67, 0x68, 0x64, 0x71, 0x21, 0x4f, 0x6b, 0x6d, 0x7e, 0x72],
    [0x4c, 0x63, 0x76, 0x61, 0x71, 0x21, 0x48, 0x6b, 0x7b, 0x75, 0x67, 0x63, 0x24, 0x45, 0x65, 0x6b, 0x6b, 0x65],
    [0x4c, 0x67, 0x68, 0x6b, 0x78, 0x68, 0x6d, 0x76, 0x7a, 0x75, 0x21, 0x4f, 0x71, 0x7a, 0x75, 0x6f, 0x77],
    [0x44, 0x66, 0x6d, 0x7c, 0x78, 0x21, 0x50, 0x65, 0x66, 0x65, 0x6c],
    [0x44, 0x66, 0x73, 0x69, 0x62, 0x65, 0x22, 0x56, 0x7d, 0x63, 0x69, 0x76, 0x6b, 0x66],
];
function blengr() {
    return String.fromCharCode(...BLIND_WRITING[rn2(BLIND_WRITING.length)]);
}

async function wand_learn(de, kind) {
    if (!game.objects?.[de.otmp.otyp]?.oc_name_known) {
        if (game.flags?.verbose !== false) {
            await pline(`This ${xname(de.otmp)} is a wand of ${kind}!`);
        }
        de.doknown = true;
    }
}

/** C engrave.c doengrave_sfx_item_WAN `:582–738`. */
async function doengrave_sfx_item_WAN(de) {
    const u = game.u || {};
    const loc = game.level?.at(u.ux, u.uy);
    const nam = objectNames[de.otmp.otyp | 0];
    const deaf = !!(game.u?.Deaf);
    const bugs = (v) => `The bugs on the ${surface(u.ux, u.uy)} ${v}!`;
    switch (nam) {
    default:
        break;
    case 'WAN_LIGHT':
    case 'WAN_SECRET_DOOR_DETECTION':
    case 'WAN_STASIS':
    case 'WAN_CREATE_MONSTER':
    case 'WAN_WISHING':
    case 'WAN_ENLIGHTENMENT':
        await zapnodir(de.otmp);
        break;
    case 'WAN_STRIKING':
        de.post_engr_text =
            'The wand unsuccessfully fights your attempt to write!';
        break;
    case 'WAN_SLOW_MONSTER':
        if (!Blind()) de.post_engr_text = bugs('slow down');
        break;
    case 'WAN_SPEED_MONSTER':
        if (!Blind()) de.post_engr_text = bugs('speed up');
        break;
    case 'WAN_POLYMORPH':
        if (de.oep) {
            if (!Blind()) {
                de.type = 0;
                const rndeng = random_engraving();
                de.buf = rndeng.text;
                de.ebuf = rndeng.pristine;
            } else {
                if (de.oetype) de.type = de.oetype;
                de.buf = xcrypt(blengr());
            }
            de.dengr = true;
        }
        break;
    case 'WAN_NOTHING':
    case 'WAN_UNDEAD_TURNING':
    case 'WAN_OPENING':
    case 'WAN_LOCKING':
    case 'WAN_PROBING':
        break;
    case 'WAN_MAGIC_MISSILE':
        de.ptext = true;
        if (!Blind()) {
            de.post_engr_text =
                `The ${surface(u.ux, u.uy)} is riddled by bullet holes!`;
        }
        break;
    case 'WAN_SLEEP':
    case 'WAN_DEATH':
        if (!Blind()) de.post_engr_text = bugs('stop moving');
        break;
    case 'WAN_COLD':
        if (!Blind()) de.post_engr_text = 'A few ice cubes drop from the wand.';
        if (!de.oep || de.oep.engr_type !== BURN) break;
        /* FALLTHROUGH */
    case 'WAN_CANCELLATION':
    case 'WAN_MAKE_INVISIBLE':
        if (de.oep && de.oep.engr_type !== HEADSTONE) {
            if (!Blind()) {
                await pline(`The engraving on the ${surface(u.ux, u.uy)} vanishes!`);
            }
            de.dengr = true;
        }
        break;
    case 'WAN_TELEPORTATION':
        if (de.oep && de.oep.engr_type !== HEADSTONE) {
            if (!Blind()) {
                await pline(`The engraving on the ${surface(u.ux, u.uy)} vanishes!`);
            }
            de.teleengr = true;
        }
        break;
    case 'WAN_DIGGING':
        de.ptext = true;
        de.type = ENGRAVE;
        await wand_learn(de, 'digging');
        de.post_engr_text = (Blind() && !deaf)
            ? 'You hear drilling!'
            : Blind()
                ? 'You feel tremors.'
                : IS_GRAVE(loc?.typ)
                    ? 'Chips fly out from the headstone.'
                    : de.frosted
                        ? 'Ice chips fly up from the ice surface!'
                        : (loc?.typ === DRAWBRIDGE_DOWN)
                            ? 'Splinters fly up from the bridge.'
                            : 'Gravel flies up from the floor.';
        break;
    case 'WAN_FIRE':
        de.ptext = true;
        de.type = BURN;
        await wand_learn(de, 'fire');
        de.post_engr_text = Blind()
            ? 'You feel the wand heat up.' : 'Flames fly from the wand.';
        break;
    case 'WAN_LIGHTNING':
        de.ptext = true;
        de.type = BURN;
        await wand_learn(de, 'lightning');
        if (!Blind()) {
            de.post_engr_text = 'Lightning arcs from the wand.';
            de.doblind = true;
        } else {
            de.post_engr_text = !deaf
                ? 'You hear crackling!' : 'Your hair stands up!';
        }
        break;
    }
}

/** C engrave.c doengrave_sfx_item `:741–892`. FALSE → early exit. */
async function doengrave_sfx_item(de) {
    const u = game.u || {};
    switch (de.otmp.oclass) {
    default:
    case AMULET_CLASS:
    case CHAIN_CLASS:
    case POTION_CLASS:
    case COIN_CLASS:
        break;
    case RING_CLASS:
    case GEM_CLASS:
        if (game.objects?.[de.otmp.otyp]?.oc_tough) {
            de.type = ENGRAVE;
        }
        break;
    case ARMOR_CLASS:
        if (is_boots(de.otmp)) {
            de.type = DUST;
            break;
        }
        /* FALLTHROUGH */
    case BALL_CLASS:
    case ROCK_CLASS:
        await pline("You can't engrave with such a large object!");
        de.ptext = false;
        break;
    case FOOD_CLASS:
    case SCROLL_CLASS:
    case SPBOOK_CLASS:
        await pline(`${Yname2(de.otmp)} would get ${de.frosted ? 'all frosty' : 'too dirty'}.`);
        de.ptext = false;
        break;
    case RANDOM_CLASS:
        break;
    case WAND_CLASS:
        if (zappable(de.otmp)) {
            await check_unpaid(de.otmp);
            if (de.otmp.cursed && !rn2(WAND_BACKFIRE_CHANCE)) {
                await wand_explode(de.otmp, 0);
                de.ret = ECMD_TIME;
                return false;
            }
            de.zapwand = true;
            if (!can_reach_floor(true)) de.ptext = false;
            await doengrave_sfx_item_WAN(de);
        } else {
            de.ptext = false;
            if (can_reach_floor(true)) {
                if ((de.otmp.spe | 0) < 0) de.zapwand = true;
                else await pline('The wand is too worn out to engrave.');
            }
        }
        break;
    case WEAPON_CLASS:
        if (is_art(de.otmp, ART_FIRE_BRAND)) {
            de.type = BURN;
        } else if (is_blade(de.otmp)) {
            if (welded(de.otmp)) {
                await pline(`${Yname2(de.otmp)} can only scratch the ${surface(u.ux, u.uy)}.`);
            } else if ((de.otmp.spe | 0) <= -3) {
                await pline(`${Yobjnam2(de.otmp, 'are')} too dull for engraving.`);
            } else {
                de.type = ENGRAVE;
            }
        }
        break;
    case TOOL_CLASS:
        if (de.otmp === u.ublindf) {
            await pline('That is a bit difficult to engrave with, don\'t you think?');
            de.ret = 0;
            return false;
        }
        switch (de.otmp.otyp) {
        case MAGIC_MARKER:
            if ((de.otmp.spe | 0) <= 0) {
                await pline('Your marker has dried out.');
            } else {
                de.type = MARK;
            }
            break;
        case TOWEL:
            de.ptext = false;
            if (de.oep) {
                const ot = de.oep.engr_type;
                if (ot === DUST || ot === ENGR_BLOOD || ot === MARK) {
                    if (is_wet_towel(de.otmp)) {
                        await dry_a_towel(de.otmp, -1, true);
                    }
                    if (!Blind()) await pline('You wipe out the message here.');
                    else {
                        await pline(`${Yobjnam2(de.otmp, 'get')} ${de.frosted ? 'frosty' : 'dusty'}.`);
                    }
                    de.dengr = true;
                } else {
                    await pline(`${Yname2(de.otmp)} can't wipe out this engraving.`);
                }
            } else {
                await pline(`${Yobjnam2(de.otmp, 'get')} ${de.frosted ? 'frosty' : 'dusty'}.`);
            }
            break;
        default:
            break;
        }
        break;
    case VENOM_CLASS:
        await pline('Writing a poison pen letter?');
        break;
    case ILLOBJ_CLASS:
        await pline("You're engraving with an illegal object!");
        break;
    }
    return true;
}

/** C engrave.c doengrave_ctx_verb `:895–925`. */
function doengrave_ctx_verb(de) {
    switch (de.type) {
    default:
        de.everb = de.adding ? 'add to the weird writing on' : 'write strangely on';
        break;
    case DUST:
        de.everb = de.adding ? 'add to the writing in' : 'write in';
        de.eloc = de.frosted ? 'frost' : 'dust';
        break;
    case HEADSTONE:
        de.everb = de.adding ? 'add to the epitaph on' : 'engrave on';
        break;
    case ENGRAVE:
        de.everb = de.adding ? 'add to the engraving in' : 'engrave in';
        break;
    case BURN:
        de.everb = de.adding
            ? (de.frosted ? 'add to the text melted into' : 'add to the text burned into')
            : (de.frosted ? 'melt into' : 'burn into');
        break;
    case MARK:
        de.everb = de.adding ? 'add to the graffiti on' : 'scribble on';
        break;
    case ENGR_BLOOD:
        de.everb = de.adding ? 'add to the scrawl on' : 'scrawl on';
        break;
    }
}

async function doengrave_empty_text(de, u) {
    if (de.zapwand) {
        if (!Blind() && de.otmp) {
            await pline(
                `${Tobjnam(de.otmp, 'glow')}, then ${otense(de.otmp, 'fade')}.`,
            );
        }
        if (de.disprefresh) newsym(u.ux, u.uy);
        return ECMD_TIME;
    }
    await pline(Never_mind);
    if (de.disprefresh) newsym(u.ux, u.uy);
    return 0;
}

/** C ref: engrave.c u_can_engrave — floor/reach subset. */
function u_can_engrave() {
    const u = game.u || {};
    const loc = game.level?.at(u.ux, u.uy);
    const typ = loc?.typ ?? 0;
    if (u.uswallow) return false;
    if (IS_LAVA(typ) || IS_POOL(typ) || IS_FOUNTAIN(typ) || IS_AIR(typ)) {
        return false;
    }
    if (!ACCESSIBLE(typ)) return false;
    // cantwield / check_capacity deferred — humanoid start always ok
    return true;
}

/** C ref: cmd.c timed_occupation — wrap fn; count down multi each tick. */
let timed_occ_fn = null;
async function timed_occupation() {
    const fn = timed_occ_fn;
    if (typeof fn === 'function') await fn();
    if ((game.multi || 0) > 0) game.multi--;
    return (game.multi || 0) > 0;
}

/**
 * C ref: cmd.c set_occupation — if xtime, occupation is timed_occupation.
 * @param {Function} fn
 * @param {string} txt occtxt for stop_occupation ("searching", …)
 * @param {number} [xtime=0] non-zero → timed wrapper (C counted Ns)
 */
export function set_occupation(fn, txt, xtime = 0) {
    if (xtime) {
        timed_occ_fn = fn;
        game.occupation = timed_occupation;
    } else {
        game.occupation = fn;
    }
    game.occtxt = txt;
    game.occtime = 0;
}

/** C engrave.c engrave() occupation. Named: carving rate / marker ink / dull. */
function engrave_occupation() {
    const eng = game.context?.engraving;
    if (!eng) return 0;
    const u = game.u || {};
    if (eng.pos?.x !== u.ux || eng.pos?.y !== u.uy) {
        // pline deferred for rare teleport mid-engrave
        return 0;
    }
    // C: stylus == &hands_obj → NULL; else invent walk; gone → stop
    if (eng.stylus && !is_hands_stylus(eng.stylus)) {
        if (!(game.invent || []).includes(eng.stylus)) return 0;
    }

    const firsttime = (eng.actionct || 0) === 0;
    const neweng = firsttime;
    eng.actionct = (eng.actionct || 0) + 1;

    let rate = 10;
    // carving/marker rate deferred — finger DUST keeps 10
    const nextc = eng.nextc || '';
    let i = rate;
    let end = 0;
    for (; end < nextc.length && i > 0; end++) {
        if (nextc[end] !== ' ') i--;
    }
    const chunk = nextc.slice(0, end);
    const rest = nextc.slice(end);

    const oep = engr_at(u.ux, u.uy);
    const prev = oep?.engr_txt?.actual_text || '';
    const buf = prev + chunk;
    const ep = make_engr_at(
        u.ux, u.uy, buf, null,
        (game.moves || 0) - (game.multi || 0),
        eng.type || DUST,
    );
    if (ep) {
        ep.eread = 1;
        ep.erevealed = 1;
    }

    if (rest) {
        eng.nextc = rest;
        if (neweng) newsym(eng.pos.x, eng.pos.y);
        return 1;
    }

    // finished — multi-action "You finish …" deferred (firsttime path silent)
    if (game.context) {
        game.context.engraving = {
            text: '',
            nextc: '',
            stylus: null,
            type: 0,
            pos: { x: 0, y: 0 },
            actionct: 0,
        };
    }
    if (neweng) newsym(u.ux, u.uy);
    return 0;
}

/** C engrave.c doengrave `:955–1263`. D-1689 non-hands sfx; yn add-to named. */
export async function doengrave() {
    const u = game.u || {};
    if (!u_can_engrave()) {
        await pline('You can\'t write here.');
        return 0;
    }

    const de = doengrave_ctx_init();
    game.multi = 0;
    game.nomovemsg = null;

    de.otmp = await getobj('write with', stylus_ok, GETOBJ_PROMPT);
    if (!de.otmp) return 0;

    if (is_hands_stylus(de.otmp)) {
        de.writer = `your ${body_part_latebound(FINGERTIP)}`;
    } else {
        de.writer = yname(de.otmp);
    }

    if (!freehand() && de.otmp !== u.uwep && !de.otmp.owornmask) {
        await pline(
            `You have no free ${body_part_latebound(HAND)} to write with!`,
        );
        if (de.disprefresh) newsym(u.ux, u.uy);
        return de.ret;
    }

    if (!can_reach_floor(true)) {
        if (is_hands_stylus(de.otmp) || de.otmp.oclass !== WAND_CLASS) {
            await cant_reach_floor(u.ux, u.uy, false, true, false);
            if (de.disprefresh) newsym(u.ux, u.uy);
            return de.ret;
        }
        await pline(
            `You gesture, with your wand, towards the ${surface(u.ux, u.uy)} below you.`,
        );
    }

    if (!await doengrave_sfx_item(de)) {
        if (de.disprefresh) newsym(u.ux, u.uy);
        return de.ret;
    }

    if (de.doknown) {
        learnwand(de.otmp);
        if (game.objects?.[de.otmp.otyp]?.oc_name_known) {
            more_experienced(0, 10);
        }
    }
    if (de.teleengr) {
        rloc_engr(de.oep);
        if (de.oep) {
            de.oep.eread = 0;
            de.oep.erevealed = 0;
        }
        de.disprefresh = true;
        de.oep = null;
    }
    if (de.dengr) {
        del_engr(de.oep);
        de.oep = null;
        de.disprefresh = true;
    }
    if (de.buf) {
        make_engr_at(u.ux, u.uy, de.buf, de.ebuf, game.moves, de.type);
        const tmp_ep = engr_at(u.ux, u.uy);
        if (!Blind() && tmp_ep) {
            await pline(`The engraving now reads: "${de.buf}".`);
            tmp_ep.eread = 1;
            tmp_ep.erevealed = 1;
            de.disprefresh = true;
        }
        de.ptext = false;
    }
    if (de.zapwand && de.otmp && (de.otmp.spe | 0) < 0) {
        const glow = Blind() ? '' : 'glows violently, then ';
        await pline(`${The(xname(de.otmp))} ${glow}turns to dust.`);
        const loc = game.level?.at(u.ux, u.uy);
        if (!IS_GRAVE(loc?.typ)) {
            await pline(`You are not going to get anywhere trying to write in the ${de.frosted ? 'frost' : 'dust'} with your dust.`);
        }
        useup(de.otmp);
        de.otmp = null;
        de.ptext = false;
    }
    if (!de.ptext) {
        if (de.otmp && de.otmp.oclass === WAND_CLASS && !can_reach_floor(true)) {
            await cant_reach_floor(u.ux, u.uy, false, true, true);
        }
        if (de.disprefresh) newsym(u.ux, u.uy);
        de.ret = ECMD_TIME;
        return de.ret;
    }

    if (de.oep) {
        let c = 'n';
        if (de.type === de.oep.engr_type
            && (!Blind() || de.oep.engr_type === BURN
                || de.oep.engr_type === ENGRAVE)) {
            // yn_function add-to named omit; C default 'y'
            c = 'y';
        }
        if (c === 'n' || Blind()) {
            const ot = de.oep.engr_type;
            if (ot === DUST || ot === ENGR_BLOOD || ot === MARK) {
                if (!Blind()) {
                    const how = ot === DUST
                        ? (de.frosted ? 'written in the frost' : 'written in the dust')
                        : ot === ENGR_BLOOD ? 'scrawled in blood' : 'written';
                    await pline(`You wipe out the message that was ${how} here.`);
                    del_engr(de.oep);
                    de.oep = null;
                    de.disprefresh = true;
                } else {
                    de.eow = true;
                }
            } else if (de.type === DUST || de.type === MARK
                || de.type === ENGR_BLOOD) {
                const into = (ot === BURN)
                    ? (de.frosted ? 'melted into' : 'burned into')
                    : 'engraved in';
                await pline(`You cannot wipe out the message that is ${into} the ${surface(u.ux, u.uy)} here.`);
                if (de.disprefresh) newsym(u.ux, u.uy);
                return ECMD_TIME;
            } else if (de.type !== ot || c === 'n') {
                if (!Blind() || can_reach_floor(true)) {
                    await pline('You will overwrite the current message.');
                }
                de.eow = true;
            }
        }
    }

    de.eloc = surface(u.ux, u.uy);
    de.adding = !!(de.oep && !de.eow);
    doengrave_ctx_verb(de);

    if (!is_hands_stylus(de.otmp)) {
        const oneOf = (de.type === ENGRAVE && (de.otmp.quan | 0) > 1) ? '1 of ' : '';
        await pline(`You ${de.everb} the ${de.eloc} with ${oneOf}${doname(de.otmp)}.`);
    } else {
        await pline(`You ${de.everb} the ${de.eloc} with your ${body_part_latebound(FINGERTIP)}.`);
    }

    const qbuf = `What do you want to ${de.everb} the ${de.eloc} here?`;
    let ebuf = await getlin(qbuf);
    ebuf = mungspaces(ebuf);
    let len = ebuf.length;
    for (const ch of ebuf) {
        if (ch === ' ') len -= 1;
    }
    if (len === 0 || ebuf.includes('\x1b')) {
        return await doengrave_empty_text(de, u);
    }

    if (len !== 1 || (!ebuf.includes('x') && !ebuf.includes('X'))) {
        if (!u.uconduct) u.uconduct = {};
        u.uconduct.literate = (u.uconduct.literate | 0) + 1;
    }

    const chars = ebuf.split('');
    for (let i = 0; i < chars.length; i++) {
        if (chars[i] === ' ') continue;
        if (((de.type === DUST || de.type === ENGR_BLOOD) && !rn2(25))
            || (Blind() && !rn2(11))
            || (Confusion() && !rn2(7))
            || (Stunned() && !rn2(4))
            || (Hallucination() && !rn2(2))) {
            chars[i] = String.fromCharCode(32 + rnd(96 - 2));
        }
    }
    ebuf = chars.join('');

    if (de.eow) {
        del_engr(de.oep);
        de.oep = null;
        de.disprefresh = true;
    }

    if (!game.context) game.context = {};
    game.context.engraving = {
        text: ebuf,
        nextc: ebuf,
        stylus: de.otmp,
        type: de.type,
        pos: { x: u.ux, y: u.uy },
        actionct: 0,
    };
    set_occupation(engrave_occupation, 'engraving');

    if (de.post_engr_text) await pline(de.post_engr_text);
    if (de.doblind && !(Blind() || u.Unaware)) {
        await pline('You are blinded by the flash!');
        // do.js already imports engrave; load make_blinded lazily (TDZ).
        const { make_blinded } = await import('./do.js');
        await make_blinded(rnd(50), false);
        if (!Blind()) await pline('Your vision clears.');
    }

    if (de.disprefresh) newsym(u.ux, u.uy);
    return de.ret;
}

/**
 * C ref: engrave.c disturb_grave — kick/engrave on undisturbed headstone.
 * Branch envelope: You disturb; set horizontal(disturbed); makemon
 * PM_GHOUL; exercise WIS false. Named omit: impossible() diagnostics.
 */
export async function disturb_grave(x, y) {
    const lev = game.level?.at(x, y);
    if (!lev || !IS_GRAVE(lev.typ)) return;
    if (lev.horizontal) return; // already disturbed
    await pline('You disturb the undead!');
    lev.horizontal = 1;
    if (PM_GHOUL >= 0) makemon(mons(PM_GHOUL), x, y, MM_NOMSG);
    exercise(A_WIS, false);
}
