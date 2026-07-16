// eat.js — Eat command (getobj / doeat; fortune cookie + reqtime-1 food +
//           CORPSE eatcorpse / start_eating / eatfood occupation).
// C ref: eat.c doeat / floorfood / touchfood / fprefx / eatcorpse /
//         start_eating / bite / eatfood / done_eating / lesshungry /
//         morehungry / vomit / obj_nutrition / is_edible / gethungry
//         (metabolic uhunger-- + accessorytime Regen/encumb/Hunger/Conflict);
//         invent.c getobj; attrib.c poison_strdmg.
// Named omissions: floorfood metallivore/pool-lava/cockatrice-feel; TIN;
// full cprefx; cpostfx specials (wraith/were/nurse/stalker/…); corpse_intrinsic
// / givit; hallu from AD_STUN/AD_HALU; tainted Sick; slime/stone; make_blinded
// body / Hear_again afternmv / foodword poly; freeinv invent-full drop; ?/* menu;
// multi-turn choke/newuhs messages; gethungry ring/amulet accessorytime + newuhs;
// losestr setuhpmax / terminal-frailty full death path;
// vomit cantvomit/Sick/FAINTING/acid-breath.

import { game } from './gstate.js';
import { rn2, rnd, rn1, d } from './rng.js';
import { flush_topl_more, pline, You_feel } from './display.js';
import { yn_function } from './getline.js';
import { FOOD_CLASS, COIN_CLASS, objectNames } from './objects.js';
import { weight, splitobj, objects_at, delobj } from './mkobj.js';
import { BY_COOKIE, bcsign, outrumor } from './rumors.js';
import { singular, xname, doname } from './objnam.js';
import {
    mons, acidic, poisonous, carnivorous, herbivorous, metallivorous,
    vegan, vegetarian,
    is_rider, PM_LICHEN, PM_ACID_BLOB, PM_MONK, monsterNames, pmnames,
} from './monsters.js';
import { set_occupation, can_reach_floor } from './engrave.js';
import {
    OBJ_FLOOR, OBJ_FREE, OBJ_INVENT,
    SLT_ENCUMBER, FROMFORM, W_ARTI, W_WEP,
    HUNGER, CONFLICT, REGENERATION, SLOW_DIGESTION,
    SATIATED, NOT_HUNGRY, HUNGRY, WEAK, FAINTING,
    TIMEOUT,
} from './const.js';
import { adjattrib, A_STR } from './attrib.js';
import { nomul } from './hack.js';
import { near_capacity } from './invent.js';
import { make_confused } from './potion.js';

/**
 * C ref: gy.youmonst.data via set_uasmon / invent.c basic assign.
 * Full set_uasmon (FROMFORM props) still deferred — diet predicates need
 * role/race form when youmonst is unset (same fallback as wield.js).
 */
function hero_form_data() {
    if (game.youmonst?.data) return game.youmonst.data;
    const mndx = game.u?.umonnum ?? game.urole?.mnum;
    return mons(mndx);
}

const FORTUNE_COOKIE = objectNames.indexOf('FORTUNE_COOKIE');
const APPLE = objectNames.indexOf('APPLE');
const PEAR = objectNames.indexOf('PEAR');
const LEMBAS_WAFER = objectNames.indexOf('LEMBAS_WAFER');
const CRAM_RATION = objectNames.indexOf('CRAM_RATION');
const FOOD_RATION = objectNames.indexOf('FOOD_RATION');
const TRIPE_RATION = objectNames.indexOf('TRIPE_RATION');
const K_RATION = objectNames.indexOf('K_RATION');
const C_RATION = objectNames.indexOf('C_RATION');
const CORPSE = objectNames.indexOf('CORPSE');
const TIN = objectNames.indexOf('TIN');
const PM_LIZARD = monsterNames.indexOf('PM_LIZARD');
const PM_GREEN_SLIME = monsterNames.indexOf('PM_GREEN_SLIME');
const PM_COCKATRICE = monsterNames.indexOf('PM_COCKATRICE');
const PM_CHICKATRICE = monsterNames.indexOf('PM_CHICKATRICE');
const PM_FLOATING_EYE = monsterNames.indexOf('PM_FLOATING_EYE');
const PM_RAVEN = monsterNames.indexOf('PM_RAVEN');
const PM_NEWT = monsterNames.indexOf('PM_NEWT');
// C ref: monattk.h AT_MAGC
const AT_MAGC = 255;

/**
 * C ref: mondata.h attacktype — true if any mattk slot has aatyp.
 * Local copy to avoid makemon export / import cycles.
 */
function attacktype(ptr, aatyp) {
    const slots = ptr?.mattk;
    if (!slots) return false;
    for (let i = 0; i < slots.length; i++) {
        if (slots[i]?.aatyp === aatyp) return true;
    }
    return false;
}

/**
 * C objects.h FOOD nutrition — extractor omits oc_nutrition (named omission).
 * Only otyps exercised by the reqtime-1 / cookie path need entries here.
 */
const FOOD_NUTRITION = {
    FORTUNE_COOKIE: 40,
    APPLE: 50,
    PEAR: 50,
    ORANGE: 80,
    MELON: 100,
    BANANA: 80,
    CARROT: 50,
    FOOD_RATION: 800,
    TRIPE_RATION: 200,
    LEMBAS_WAFER: 800,
    CRAM_RATION: 600,
    K_RATION: 400,
    C_RATION: 300,
    EGG: 80,
    CLOVE_OF_GARLIC: 40,
    SPRIG_OF_WOLFSBANE: 40,
    EUCALYPTUS_LEAF: 1,
    CANDY_BAR: 100,
    CREAM_PIE: 100,
    PANCAKE: 200,
    SLIME_MOLD: 250,
    LUMP_OF_ROYAL_JELLY: 200,
};

/**
 * C ref: trap.c unconscious — multi < 0 and (usleep or wake-msg prefixes).
 */
function unconscious() {
    if ((game.multi || 0) >= 0) return false;
    const u = game.u || {};
    if (u.usleep) return true;
    const msg = game.nomovemsg || '';
    return msg.startsWith('You awake')
        || msg.startsWith('You regain con')
        || msg.startsWith('You are consci');
}

/**
 * C ref: youprop.h Unaware — multi < 0 && (unconscious || fainted).
 * Fainted (uhs == FAINTED) deferred as always-false until newuhs ports it.
 */
function Unaware() {
    return (game.multi || 0) < 0 && unconscious();
}

/** C ref: youprop.h Slow_digestion */
function Slow_digestion() {
    const u = game.u || {};
    if (u.HSlow_digestion || u.ESlow_digestion) return true;
    const prop = u.uprops?.[SLOW_DIGESTION];
    return !!(prop?.intrinsic || prop?.extrinsic);
}

/** C ref: youprop.h Hunger */
function Hunger() {
    const u = game.u || {};
    if (u.HHunger || u.EHunger) return true;
    const prop = u.uprops?.[HUNGER];
    return !!(prop?.intrinsic || prop?.extrinsic);
}

/**
 * C ref: eat.c init_uhunger — reset hunger to Not Hungry / 900.
 * ATEMP(A_STR) repair + encumber_msg deferred.
 */
export function init_uhunger() {
    const u = game.u;
    if (!u) return;
    if ((u.uhs ?? NOT_HUNGRY) !== NOT_HUNGRY) {
        if (game.flags) game.flags.botl = true;
    }
    u.uhunger = 900;
    u.uhs = NOT_HUNGRY;
}

/**
 * C ref: eat.c newuhs — recompute u.uhs from uhunger thresholds.
 * Field update only this iteration: occupation force_save_hs, hunger
 * messages, end_running, ATEMP WEAK crossover, faint/starve deferred.
 * @param {boolean} _incr true when called from metabolism (message tone)
 */
export function newuhs(_incr) {
    const u = game.u;
    if (!u) return;
    const h = u.uhunger ?? 900;
    const newhs = (h > 1000)
        ? SATIATED
        : (h > 150) ? NOT_HUNGRY
            : (h > 50) ? HUNGRY : (h > 0) ? WEAK : FAINTING;
    if (newhs !== (u.uhs ?? NOT_HUNGRY)) {
        if (game.flags) game.flags.botl = true;
    }
    u.uhs = newhs;
    void _incr;
}

/**
 * C ref: eat.c gethungry — metabolic uhunger--, accessorytime burns, newuhs.
 * Branch envelope: ordinary diet burn via hero_form_data; odd/even
 * Regen/encumbrance/Hunger/Conflict burns; field-only newuhs(TRUE).
 * Named omissions: ring/amulet accessorytime switch cases; newuhs
 * messages / faint / ATEMP.
 */
export function gethungry() {
    if (game.u?.uinvulnerable) return;
    const u = game.u;

    // C: (!Unaware || !rn2(10)) && eats && !Slow_digestion → uhunger--
    // rn2(10) only when Unaware (|| short-circuit).
    const metabolic_tick = !Unaware() || !rn2(10);
    if (metabolic_tick) {
        const youData = hero_form_data();
        if ((carnivorous(youData) || herbivorous(youData)
                || metallivorous(youData))
            && !Slow_digestion()) {
            u.uhunger = (u.uhunger ?? 900) - 1;
        }
    }

    const accessorytime = rn2(20);
    if (accessorytime % 2) {
        // odd — Regeneration / encumbrance
        const HRegen = (u.HRegeneration | 0)
            || (u.uprops?.[REGENERATION]?.intrinsic | 0);
        const ERegen = (u.ERegeneration | 0)
            || (u.uprops?.[REGENERATION]?.extrinsic | 0);
        if ((HRegen & ~FROMFORM) || (ERegen & ~(W_ARTI | W_WEP))) {
            u.uhunger = (u.uhunger ?? 900) - 1;
        }
        if (near_capacity() > SLT_ENCUMBER) {
            u.uhunger = (u.uhunger ?? 900) - 1;
        }
    } else {
        // even — Hunger / Conflict; ring+amulet switch deferred
        if (Hunger()) {
            u.uhunger = (u.uhunger ?? 900) - 1;
        }
        const HConf = (u.HConflict | 0)
            || (u.uprops?.[CONFLICT]?.intrinsic | 0);
        const EConf = (u.EConflict | 0)
            || (u.uprops?.[CONFLICT]?.extrinsic | 0);
        if (HConf || (EConf & ~W_ARTI)) {
            u.uhunger = (u.uhunger ?? 900) - 1;
        }
        void accessorytime; // ring/amulet cases 0/4/8/12/16 deferred
    }
    newuhs(true);
}

/**
 * C ref: eat.c morehungry — nutrition loss after feats of magic / vomit.
 * newuhs field update; hunger messages / faint deferred.
 */
export function morehungry(num) {
    if (!game.u) return;
    game.u.uhunger = (game.u.uhunger ?? 900) - (num | 0);
    newuhs(true);
}

/**
 * C ref: eat.c vomit — side effects of vomiting (fountain foul water, etc.).
 * Branch envelope: nomul(-2) when multi >= -2 + You_can_move_again.
 * Named omissions: cantvomit jaw-gape; Sick SICK_VOMITABLE cure; FAINTING
 * dry-heave message; yellow-dragon AT_BREA AD_ACID spew (RNG when poly).
 */
export function vomit() {
    // cantvomit / Sick / uhs FAINTING / acid-breath deferred
    if ((game.multi || 0) >= -2) {
        nomul(-2);
        game.multi_reason = 'vomiting';
        game.nomovemsg = 'You can move again.';
    }
}

/**
 * C ref: eat.c lesshungry — uhunger += num; choke/fullwarn deferred;
 * field-only newuhs(FALSE).
 */
export function lesshungry(num) {
    if (!game.u) return;
    game.u.uhunger = (game.u.uhunger ?? 900) + (num | 0);
    newuhs(false);
}

/**
 * C ref: eat.c obj_nutrition — CORPSE uses mons[].cnutrit; FOOD oc_nutrition.
 */
function obj_nutrition(otmp) {
    if (!otmp) return 0;
    if (otmp.otyp === CORPSE) {
        return mons(otmp.corpsenm)?.cnutrit ?? 0;
    }
    if (otmp.globby) return otmp.owt | 0;
    const oc = game.objects?.[otmp.otyp];
    if (oc?.oc_nutrition != null) return oc.oc_nutrition | 0;
    const name = objectNames[otmp.otyp];
    return FOOD_NUTRITION[name] ?? 0;
}

/** C ref: eat.c nonrotting_food */
function nonrotting_food(otyp) {
    return otyp === LEMBAS_WAFER || otyp === CRAM_RATION;
}

/** C ref: eat.c nonrotting_corpse macro */
function nonrotting_corpse(mnum) {
    if (mnum === PM_LIZARD || mnum === PM_LICHEN || mnum === PM_ACID_BLOB) {
        return true;
    }
    return is_rider(mons(mnum));
}

/** C hack.c rounddiv — same as weapon.js */
function rounddiv(x, y) {
    if (!y) return 0;
    let divsgn = 1;
    let yy = y | 0;
    let xx = x | 0;
    if (yy < 0) { divsgn = -divsgn; yy = -yy; }
    if (xx < 0) { divsgn = -divsgn; xx = -xx; }
    let r = Math.trunc(xx / yy);
    const m = xx % yy;
    if (2 * m >= yy) r++;
    return divsgn * r;
}

/** C ref: mkobj.c peek_at_iced_corpse_age — non-ice returns otmp.age */
function peek_at_iced_corpse_age(otmp) {
    // on_ice ROT_ICE_ADJUSTMENT deferred
    return otmp?.age ?? 0;
}

/**
 * C ref: eat.c food_xname — CORPSE → "[the ]newt corpse".
 */
function food_xname(food, the_pfx) {
    if (!food) return 'food';
    if (food.otyp === CORPSE) {
        const neut = pmnames[food.corpsenm]?.[2] || 'creature';
        const base = `${neut} corpse`;
        return the_pfx ? `the ${base}` : base;
    }
    const base = singular(food, xname);
    return the_pfx ? `the ${base}` : base;
}

/** C ref: eat.c violated_vegetarian — Monk feels guilty + adjalign(-1). */
function violated_vegetarian() {
    if (!game.u.uconduct) game.u.uconduct = {};
    game.u.uconduct.unvegetarian = (game.u.uconduct.unvegetarian | 0) + 1;
    if ((game.urole?.mnum ?? -1) === PM_MONK) {
        // pline deferred to call site when async; sync bump for align
        if (!game.u.ualign) game.u.ualign = { type: 0, record: 0 };
        game.u.ualign.record = (game.u.ualign.record | 0) - 1;
        return true;
    }
    return false;
}

/** C ref: eat.c consume_oeaten — amt>0 → >>= amt; amt<0 → += amt (floor 1). */
function consume_oeaten(obj, amt) {
    if (!obj) return;
    if (!obj_nutrition(obj)) {
        obj.oeaten = 0;
        return;
    }
    if (amt > 0) {
        obj.oeaten = (obj.oeaten | 0) >> amt;
    } else if ((obj.oeaten | 0) > -amt) {
        obj.oeaten = (obj.oeaten | 0) + amt;
    } else {
        obj.oeaten = 0;
    }
    if ((obj.oeaten | 0) === 0) obj.oeaten = 1;
}

function is_edible(obj) {
    if (!obj) return false;
    // C: objects[obj->otyp].oc_unique → false; human → FOOD_CLASS only
    const oc = game.objects?.[obj.otyp];
    if (oc?.oc_unique) return false;
    return obj.oclass === FOOD_CLASS;
}

/** Build getobj allow-string of edible inventory letters (e.g. "b-g"). */
function edible_lets() {
    const inv = game.invent || [];
    const lets = [];
    for (const o of inv) {
        if (is_edible(o) && o.invlet) lets.push(o.invlet);
    }
    lets.sort();
    if (!lets.length) return '';
    // Compact consecutive runs: b,c,d,e,f,g → b-g
    // C invent.c compactify uses dashes for runs of 3+; short runs stay literal.
    // seed1800 C shows "bcdef" (no dash) — emit uncompacted for ≤5 letters.
    if (lets.length <= 5) return lets.join('');
    let out = lets[0];
    let runStart = lets[0];
    let prev = lets[0];
    for (let i = 1; i < lets.length; i++) {
        const ch = lets[i];
        if (ch.charCodeAt(0) === prev.charCodeAt(0) + 1) {
            prev = ch;
            continue;
        }
        if (prev !== runStart) {
            out += prev === String.fromCharCode(runStart.charCodeAt(0) + 1)
                ? prev
                : `-${prev}`;
        }
        out += ch;
        runStart = prev = ch;
    }
    if (prev !== runStart) {
        out += prev === String.fromCharCode(runStart.charCodeAt(0) + 1)
            ? prev
            : `-${prev}`;
    }
    return out;
}

/**
 * C ref: invent.c getobj("eat", is_edible) — yn_function free-letter loop;
 * missing letter → You("don't have that object.") + continue (next
 * yn_function flushes NEED_MORE → --More--). Empty SUGGEST → early
 * "don't have anything to eat."
 */
async function getobj_eat() {
    for (;;) {
        await flush_topl_more();
        const lets = edible_lets();
        if (!lets) {
            await pline("You don't have anything to eat.");
            return null;
        }
        // C: yn_function(qbuf, NULL, '\0') — any char; leave prompt on line
        const query = `What do you want to eat? [${lets} or ?*]`;
        const ch = await yn_function(query, null, '\0');

        // quitchars: space, Esc, etc.
        if (ch === '\x1b' || ch === ' ' || ch === '\n' || ch === '\r') {
            if (game.flags?.verbose !== false) await pline('Never mind.');
            return null;
        }
        if (ch === '?' || ch === '*') {
            // Menu path deferred
            await pline('Never mind.');
            return null;
        }

        const otmp = (game.invent || []).find(o => o.invlet === ch);
        if (!otmp) {
            // C: You("don't have that object."); continue;
            await pline("You don't have that object.");
            continue;
        }
        return otmp;
    }
}

/**
 * C ref: eat.c floorfood("eat", 0) — yn floor edibles, else invent getobj.
 * Branch envelope: can_reach_floor / !usteed / !menu_requested skip to
 * invent; edible floor FOOD (non-coin) ynq; invent getobj_eat.
 * Named omissions: metallivore beartrap/bars/gold; pool/lava reach gate;
 * will_feel_cockatrice; safe_qbuf ansimpleoname fallback; getobj_else
 * "else" wording; sacrifice/tin corpsecheck arms.
 */
async function floorfood_eat() {
    const u = game.u || {};
    // C: iflags.menu_requested || !can_reach_floor || usteed → skipfloor
    // pool/lava + Wwalking/clinger/Flying deferred (named omission)
    if (!game.flags?.menu_requested && can_reach_floor(true) && !u.usteed) {
        const ux = u.ux | 0;
        const uy = u.uy | 0;
        for (let otmp = objects_at(ux, uy); otmp; otmp = otmp.nexthere) {
            if (otmp.oclass === COIN_CLASS || !is_edible(otmp)) continue;
            // will_feel_cockatrice deferred
            const one = (otmp.quan || 1) === 1;
            // C: "There is <doname> here; eat it?" (otense + safe_qbuf)
            const qbuf = `There ${one ? 'is' : 'are'} ${doname(otmp)} here; eat ${one ? 'it' : 'one'}?`;
            const c = await yn_function(qbuf, 'ynq', 'n');
            if (c === 'y') return otmp;
            if (c === 'q') return null;
            // 'n' → try next floor edible / fall through to invent
        }
    }
    return getobj_eat();
}

/**
 * C ref: invent.c useup / useupf — consume one; invent or floor.
 * Floor path matches useupf(obj,1): maybe splitobj then delobj →
 * obj_resists(0,0) always rolls rn2(100). Invent useup never rolls.
 *
 * Detect floor via where===OBJ_FLOOR or presence on the floor pile —
 * invent-split children may copy where or be OBJ_FREE without addinv
 * (touchfood freeinv/addinv_nomerge still deferred).
 */
function useup(otmp) {
    if (!otmp) return;
    const inInvent = otmp.where === OBJ_INVENT
        || (game.invent || []).includes(otmp);
    let onFloor = otmp.where === OBJ_FLOOR;
    if (!onFloor && !inInvent && otmp.ox != null && otmp.oy != null) {
        for (let o = objects_at(otmp.ox, otmp.oy); o; o = o.nexthere) {
            if (o === otmp) { onFloor = true; break; }
        }
    }
    if (!onFloor) {
        // Invent / free invent-child: invent.c useup — no obj_resists
        if ((otmp.quan || 1) > 1) {
            otmp.quan--;
            otmp.owt = weight(otmp);
            return;
        }
        const inv = game.invent || [];
        const idx = inv.indexOf(otmp);
        if (idx >= 0) inv.splice(idx, 1);
        otmp.quan = 0;
        otmp.where = OBJ_FREE;
        return;
    }
    // Floor: invent.c useupf(otmp, 1L)
    let victim = otmp;
    if ((otmp.quan || 1) > 1) {
        victim = splitobj(otmp, 1) || otmp;
    }
    delobj(victim);
}

/**
 * C ref: eat.c touchfood — split stack (next_ident via splitobj), set oeaten.
 * freeinv + addinv_nomerge deferred for invent child path.
 */
function touchfood(otmp) {
    if ((otmp.quan || 1) > 1) {
        // C: floor → splitobj(otmp, quan-1); carried → otmp = splitobj(otmp, 1)
        const carried = otmp.where === OBJ_INVENT
            || (game.invent || []).includes(otmp);
        if (!carried) {
            splitobj(otmp, (otmp.quan | 0) - 1);
        } else {
            const child = splitobj(otmp, 1);
            if (child) otmp = child;
        }
    }
    if (!otmp.oeaten) {
        // costly_alteration deferred
        otmp.oeaten = obj_nutrition(otmp);
    }
    return otmp;
}

/**
 * C ref: attrib.c poison_strdmg → losestr + losehp.
 * losestr rn1(4,3) only when ABASE-strloss would go below ATTRMIN.
 */
export async function poison_strdmg(strloss, dmg) {
    const u = game.u || (game.u = {});
    if (!u.acurr) u.acurr = { a: [10, 10, 10, 10, 10, 10] };
    const amin = game.urace?.attrmin?.[A_STR] ?? 3;
    let n = strloss | 0;
    let ustr = (u.acurr.a[A_STR] | 0) - n;
    let frailty = 0;
    while (ustr < amin) {
        ustr++;
        n--;
        frailty += rn1(4, 3);
    }
    if (frailty) {
        u.uhp = (u.uhp | 0) - frailty;
    }
    if (n > 0) await adjattrib(A_STR, -n, 1);
    u.uhp = (u.uhp | 0) - (dmg | 0);
    if ((u.uhp | 0) < 1) {
        u.uhp = 0;
        if (game.program_state) game.program_state.gameover = true;
    }
    if (!game.flags) game.flags = {};
    game.flags.botl = true;
}

/**
 * C ref: eat.c fprefx — first-bite messages for non-rotten non-tin food.
 * Contest recorder is MACOS → APPLE "Macintosh!"; UNIX Core dumped deferred.
 * Returns false if eating should abort (egg explode etc. deferred → true).
 */
async function fprefx(otmp) {
    if (otmp.otyp === FOOD_RATION) {
        const hung = game.u?.uhunger ?? 900;
        if (hung <= 200) {
            await pline('This food really hits the spot!');
        } else if (hung < 700) {
            await pline('This satiates your stomach!');
        }
        return true;
    }
    if (otmp.otyp === TRIPE_RATION) {
        await pline('Yak - dog food!');
        return true;
    }
    // Contest C build defines MACOS (recorder on macOS).
    if (otmp.otyp === APPLE && !otmp.cursed) {
        await pline('Delicious!  Must be a Macintosh!');
        return true;
    }
    if (otmp.otyp === PEAR && !otmp.cursed) {
        await pline('Core dumped.');
        return true;
    }
    // default give_feedback
    const cursed = !!otmp.cursed;
    const bland = otmp.otyp === CRAM_RATION
        || otmp.otyp === K_RATION
        || otmp.otyp === C_RATION;
    const adj = cursed ? 'terrible!' : bland ? 'bland.' : 'delicious!';
    await pline(`This ${singular(otmp, xname)} is ${adj}`);
    return true;
}

/**
 * C ref: eat.c bite — nutrition per turn; choke deferred (canchoke always 0).
 * @returns {number} 1 if choked (abort), else 0
 */
function bite() {
    const v = game.context?.victual;
    if (!v?.piece) return 0;
    if (v.doreset) {
        game.context.victual = {};
        return 0;
    }
    if ((v.nmod | 0) < 0) {
        let nut = -(v.nmod | 0);
        if (nut < 1) nut = 1;
        lesshungry(nut);
        consume_oeaten(v.piece, v.nmod | 0);
    } else if ((v.nmod | 0) > 0 && ((v.usedtime | 0) % (v.nmod | 0))) {
        lesshungry(1);
        consume_oeaten(v.piece, -1);
    }
    return 0;
}

/**
 * C ref: eat.c eye_of_newt_buzz — small Pw boost from newt / AT_MAGC corpse.
 */
async function eye_of_newt_buzz() {
    const u = game.u || (game.u = {});
    // C: if (rn2(3) || 3 * u.uen <= 2 * u.uenmax)
    if (rn2(3) || 3 * (u.uen | 0) <= 2 * (u.uenmax | 0)) {
        const old_uen = u.uen | 0;
        u.uen = (u.uen | 0) + rnd(3);
        if ((u.uen | 0) > (u.uenmax | 0)) {
            if (!rn2(3)) {
                u.uenmax = (u.uenmax | 0) + 1;
                if ((u.uenmax | 0) > (u.uenpeak | 0)) u.uenpeak = u.uenmax;
            }
            u.uen = u.uenmax;
        }
        if (old_uen !== (u.uen | 0)) {
            await You_feel('a mild buzz.');
            if (game.disp) game.disp.botl = true;
            if (game.flags) game.flags.botl = true;
        }
    }
}

/**
 * C ref: eat.c cpostfx — post-corpse effects.
 * Branch envelope (D-0492): default check_intrinsics → eye_of_newt_buzz
 * for AT_MAGC || PM_NEWT. Special switch cases, AD_STUN/AD_HALU hallu,
 * corpse_intrinsic / givit deferred.
 */
async function cpostfx(pm) {
    // Ordinary corpses (incl. newt) take C's default check_intrinsics path.
    // Named deferred specials (wraith, were*, nurse body, stalker/bat/mimic,
    // quantum, lizard body, chameleon/doppel/genetic, displacer,
    // disenchanter, riders, mind flayer INT) are no-ops until ported —
    // they must not set check_intrinsics when their bodies land.
    const ptr = mons(pm);
    // C: dmgtype AD_STUN/AD_HALU / violet fungus → make_hallucinated deferred
    if (attacktype(ptr, AT_MAGC) || pm === PM_NEWT) {
        await eye_of_newt_buzz();
    }
    // C: corpse_intrinsic → givit / gainstr deferred (newt conveys none)
}

/**
 * C ref: eat.c done_eating — finish meal; cpostfx for CORPSE; fpostfx cookie.
 */
async function done_eating(message) {
    const piece = game.context?.victual?.piece;
    if (!piece) {
        if (game.context) game.context.victual = {};
        game.occupation = null;
        return;
    }
    // C: occupation = 0 early so newuhs knows we're done
    game.occupation = null;
    newuhs(false);
    if (message) {
        await pline(`You finish eating ${food_xname(piece, true)}.`);
    }
    if (piece.otyp === CORPSE || piece.globby) {
        await cpostfx(piece.corpsenm | 0);
    } else if (piece.otyp === FORTUNE_COOKIE) {
        // C: fpostfx — cookie rumor only (other fpostfx deferred)
        await outrumor(bcsign(piece), BY_COOKIE);
    }
    useup(piece);
    if (game.context) game.context.victual = {};
}

/**
 * C ref: eat.c eatfood — occupation each move while eating.
 * Returns 1 to continue, 0 when done.
 */
async function eatfood() {
    const food = game.context?.victual?.piece;
    if (!food || !game.context?.victual?.eating) {
        if (game.context) game.context.victual = {};
        return 0;
    }
    // floor-moved food: C checks ox/oy still under hero; deferred beyond
    // leaving the square (occupation cancels). Same-cell floor OK.
    game.context.victual.usedtime = (game.context.victual.usedtime | 0) + 1;
    if ((game.context.victual.usedtime | 0)
        <= (game.context.victual.reqtime | 0)) {
        if (bite()) return 0;
        return 1;
    }
    await done_eating(true);
    return 0;
}

/**
 * C ref: eat.c start_eating — first bite; occupation if reqtime remains.
 */
async function start_eating(otmp, already_partly_eaten) {
    if (!game.context?.victual) return;
    game.context.victual.fullwarn = 0;
    game.context.victual.doreset = 0;
    game.context.victual.eating = 1;

    // cprefx body deferred (maybe_cannibal no-op for newt; stone/slime omitted)
    if (otmp.otyp === CORPSE || otmp.globby) {
        // maybe_cannibal(pm, TRUE) returns false for non-race corpses — no RNG
        void otmp.corpsenm;
    }

    if (bite()) {
        game.context.victual.usedtime = (game.context.victual.usedtime | 0) + 1;
        if ((game.context.victual.usedtime | 0)
            >= (game.context.victual.reqtime | 0)) {
            await done_eating(false);
        }
        return;
    }

    game.context.victual.usedtime = (game.context.victual.usedtime | 0) + 1;
    if ((game.context.victual.usedtime | 0)
        >= (game.context.victual.reqtime | 0)) {
        await done_eating(
            (game.context.victual.reqtime | 0) > 1 || already_partly_eaten,
        );
        return;
    }

    set_occupation(eatfood, `eating ${food_xname(otmp, true)}`);
}

/**
 * C ref: eat.c rottenfood — first bite of rotten food.
 * @returns {number} 1 if fainted (dont_start), else 0
 */
async function rottenfood(obj) {
    // C: "Blecch!  Rotten/Awful foodword!" — foodword poly deferred
    await pline('Blecch!  Rotten food!');
    if (!rn2(4)) {
        const u = game.u || {};
        if (u.Hallucination || u.HHallucination) {
            await pline('You feel rather trippy.');
        } else {
            await pline('You feel rather light headed.');
        }
        // C: make_confused(HConfusion + d(2, 4), FALSE)
        await make_confused((u.HConfusion | 0) + d(2, 4), false);
    } else if (!rn2(4) && !(game.u?.Blind || ((game.u?.HBlinded | 0) & TIMEOUT))) {
        await pline('Everything suddenly goes dark.');
        // C: make_blinded(BlindedTimeout + d(2, 10), FALSE) — body deferred
        d(2, 10);
    } else if (!rn2(3)) {
        const duration = rnd(10);
        await pline('The world spins and goes dark.');
        // C: incr_itimeout(&HDeaf, duration); nomul(-duration); afternmv=Hear_again
        const u = game.u || (game.u = {});
        u.HDeaf = ((u.HDeaf | 0) & ~TIMEOUT) | (((u.HDeaf | 0) & TIMEOUT) + duration);
        nomul(-duration);
        game.multi_reason = 'unconscious from rotten food';
        game.nomovemsg = 'You are conscious again.';
        // Hear_again afternmv deferred
        return 1;
    }
    return 0;
}

/**
 * C ref: eat.c eatcorpse — rotting / acid / poison / taste; sets reqtime.
 * @returns {number} 0 ok, 1 dont_start, 2 used up
 */
async function eatcorpse(otmp) {
    let retcode = 0;
    let tp = 0;
    const mnum = otmp.corpsenm | 0;
    let rotted = 0;
    const ptr = mons(mnum);
    const glob = !!otmp.globby;
    // flesh_petrifies / slimeable deferred — stoneable/slimeable stay false
    // unless green slime without resistances (named omission beyond flag)
    const slimeable = mnum === PM_GREEN_SLIME; // Unchanging/Slimed deferred
    const stoneable = false;

    if (!vegan(ptr)) {
        if (!game.u.uconduct) game.u.uconduct = {};
        game.u.uconduct.unvegan = (game.u.uconduct.unvegan | 0) + 1;
    }
    if (!vegetarian(ptr)) {
        if (violated_vegetarian()) {
            await pline('You feel guilty.');
        }
    }

    if (!nonrotting_corpse(mnum)) {
        const age = peek_at_iced_corpse_age(otmp);
        const moves = game.moves ?? 0;
        rotted = Math.trunc((moves - age) / (10 + rn2(20)));
        if (otmp.cursed) rotted += 2;
        else if (otmp.blessed) rotted -= 2;
    }

    if (!glob && !stoneable && !slimeable && rotted > 5) {
        // tainted path — Sick_resistance / make_sick deferred; use up
        await pline(
            `Ulch - that ${
                ptr?.mlet === 'S_FUNGUS' ? 'fungoid vegetation'
                    : vegetarian(ptr) ? 'protoplasm' : 'meat'
            } was tainted!`,
        );
        useup(otmp);
        return 2;
    } else if (acidic(ptr) && !(game.u?.HAcid_resistance || game.u?.EAcid_resistance
        || game.u?.Acid_resistance)) {
        tp++;
        await pline('You have a very bad case of stomach acid.');
        // C: losehp(rnd(15), ...) — inline to avoid eat↔hack import cycle
        // Must call rnd() (logs rnd(N)=…) not 1+rn2 (logs rn2(N)=…).
        if (game.u) {
            const dmg = rnd(15);
            game.u.uhp = (game.u.uhp | 0) - dmg;
        }
    } else if (poisonous(ptr) && rn2(5)) {
        tp++;
        await pline('Ecch - that must have been poisonous!');
        const poisRes = !!(game.u?.HPoison_resistance || game.u?.EPoison_resistance
            || game.u?.Poison_resistance);
        if (!poisRes) {
            // C: poison_strdmg(rnd(4), rnd(15), ...) — clang LTR arg eval
            const strloss = rnd(4);
            const dmg = rnd(15);
            await poison_strdmg(strloss, dmg);
        } else {
            await pline('You seem unaffected by the poison.');
        }
    } else if ((rotted > 5 || (rotted > 3 && rn2(5)))
        && !(game.u?.HSick_resistance || game.u?.ESick_resistance)) {
        tp++;
        await pline(`You feel ${game.u?.Sick ? 'very ' : ''}sick.`);
        // C: losehp(rnd(8), !glob ? "cadaver" : "rotted glob", KILLED_BY_AN)
        if (game.u) {
            const dmg = rnd(8);
            game.u.uhp = (game.u.uhp | 0) - dmg;
        }
    }

    // delay is weight dependent
    const cwt = glob ? (otmp.owt | 0) : (ptr?.cwt ?? 0);
    if (!game.context) game.context = {};
    if (!game.context.victual) game.context.victual = {};
    game.context.victual.reqtime = 3 + (cwt >> 6);

    if (!tp && !nonrotting_corpse(mnum) && (otmp.orotten || !rn2(7))) {
        // C: if (rottenfood(otmp)) { orotten; touchfood; retcode=1; }
        // Non-faint still eats — only faint sets dont_start (D-0443).
        if (await rottenfood(otmp)) {
            otmp.orotten = true;
            otmp = touchfood(otmp);
            if (!otmp) return 1;
            if (game.context?.victual) game.context.victual.piece = otmp;
            retcode = 1;
        }

        const cm = mons(otmp.corpsenm);
        if (!(cm?.cnutrit)) {
            if (!retcode) await pline('The corpse rots away completely.');
            useup(otmp);
            return 2;
        }
        if (!retcode) consume_oeaten(otmp, 2); /* oeaten >>= 2 */
    } else if ((mnum === PM_COCKATRICE || mnum === PM_CHICKATRICE)
        && (game.u?.HStone_resistance || game.u?.Hallucination)) {
        await pline('This tastes just like chicken!');
    } else if (mnum === PM_FLOATING_EYE
        && (game.u?.umonnum ?? -1) === PM_RAVEN) {
        await pline('You peck the eyeball with delight.');
    } else if (tp) {
        // message already delivered
    } else {
        // C: gy.youmonst.data — herbivorous must be true for omnivores so
        // palatable's rn2(10) is not short-circuited away (D-0409).
        const youData = hero_form_data();
        const yummy = vegan(ptr)
            ? (!carnivorous(youData) && herbivorous(youData))
            : (carnivorous(youData) && !herbivorous(youData));
        const palatable = (vegetarian(ptr)
            ? herbivorous(youData)
            : carnivorous(youData))
            && rn2(10)
            && (rotted < 1 || !rn2((rotted | 0) + 1));
        const palatable_msgs = [
            'Tokay', 'Istringy', 'Igamey', 'Ifatty', 'Itough',
        ];
        const idx = vegetarian(ptr) ? 0 : rn2(palatable_msgs.length);
        const palat_msg = palatable_msgs[idx];
        const use_is = !!(game.u?.Hallucination)
            || (!!palatable && palat_msg[0] === 'I');
        const pmxnam = food_xname(otmp, false);
        const taste = game.u?.Hallucination
            ? (yummy ? 'gnarly' : palatable ? 'copacetic' : 'grody')
            : (yummy ? 'delicious' : palatable
                ? palat_msg.slice(1) : 'terrible');
        const bang = (yummy || !palatable) ? '!' : '.';
        await pline(
            `This ${pmxnam} ${use_is ? 'is' : 'tastes'} ${taste}${bang}`,
        );
    }

    return retcode;
}

/**
 * C ref: eat.c doeat() — food-class path for reqtime==1 and CORPSE.
 * TIN, multi-turn non-corpse occupation, rotten ordinary food still deferred.
 * @returns {number} 0 = no turn (ECMD_OK), 1 = took time
 */
export async function doeat() {
    // C: floorfood("eat", 0) — floor yn then invent getobj
    const otmp0 = await floorfood_eat();
    if (!otmp0) return 0;

    if (otmp0.oclass === COIN_CLASS && !is_edible(otmp0)) {
        await pline('You cannot eat gold.');
        return 0;
    }
    if (!is_edible(otmp0)) {
        await pline('You cannot eat that!');
        return 0;
    }

    if (otmp0.oclass !== FOOD_CLASS) {
        // doeat_nonfood deferred
        await pline('That food is not implemented yet.');
        return 0;
    }

    if (otmp0.otyp === TIN) {
        await pline('That food is not implemented yet.');
        return 0;
    }

    // KMH, conduct
    if (!game.u.uconduct) game.u.uconduct = {};
    game.u.uconduct.food = (game.u.uconduct.food | 0) + 1;

    const already_partly_eaten = !!otmp0.oeaten;
    let otmp = touchfood(otmp0);
    if (!otmp) return 1;

    if (!game.context) game.context = {};
    game.context.victual = {
        piece: otmp,
        o_id: otmp.o_id,
        usedtime: 0,
        eating: 0,
        canchoke: 0,
        fullwarn: 0,
        doreset: 0,
        reqtime: 0,
        nmod: 0,
    };

    let dont_start = false;

    if (otmp.otyp === CORPSE || otmp.globby) {
        const tmp = await eatcorpse(otmp);
        if (tmp === 2) {
            game.context.victual = {};
            return 1;
        }
        if (tmp) dont_start = true;
        // eatcorpse set reqtime / may have modified oeaten
    } else {
        const oc = game.objects?.[otmp.otyp];
        game.context.victual.reqtime = oc?.oc_delay ?? 1;

        // C: rotten check — FORTUNE_COOKIE skipped; nonrotting_food skips age gate
        const moves = game.moves ?? 0;
        const age = otmp.age ?? moves;
        if (otmp.otyp !== FORTUNE_COOKIE
            && (otmp.cursed
                || (!nonrotting_food(otmp.otyp)
                    && (moves - age) > (otmp.blessed ? 50 : 30)
                    && (otmp.orotten || !rn2(7))))) {
            await pline('That food is not implemented yet.');
            game.context.victual = {};
            return 0;
        }
        if (!already_partly_eaten) {
            if (!(await fprefx(otmp))) {
                game.context.victual = {};
                return 1;
            }
        } else {
            const req = game.context.victual.reqtime;
            await pline(
                `You ${req === 1 ? 'eat' : 'begin eating'} ${doname(otmp)}.`,
            );
        }
    }

    const basenutrit = obj_nutrition(otmp) | 0;
    const oeaten = otmp.oeaten | 0;
    if (basenutrit === 0) {
        game.context.victual.reqtime = 0;
    } else {
        game.context.victual.reqtime = rounddiv(
            (game.context.victual.reqtime | 0) * oeaten,
            basenutrit,
        );
    }
    const reqtime = game.context.victual.reqtime | 0;
    if (reqtime === 0 || oeaten === 0) {
        game.context.victual.nmod = 0;
    } else if (oeaten >= reqtime) {
        game.context.victual.nmod = -Math.trunc(oeaten / reqtime);
    } else {
        game.context.victual.nmod = reqtime % oeaten;
    }
    game.context.victual.canchoke = 0; // u.uhs == SATIATED deferred

    if (dont_start) {
        otmp.owt = weight(otmp);
        return 1;
    }

    // Non-corpse multi-turn still deferred (cookie/apple are reqtime 1)
    if (otmp.otyp !== CORPSE && !otmp.globby && reqtime > 1) {
        await pline('That food is not implemented yet.');
        game.context.victual = {};
        return 0;
    }

    await start_eating(otmp, already_partly_eaten);
    return 1;
}
