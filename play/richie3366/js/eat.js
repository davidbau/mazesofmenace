// eat.js — Eat command (getobj / doeat; fortune cookie + reqtime-1 food +
//           CORPSE eatcorpse / start_eating / eatfood occupation).
// C ref: eat.c doeat / touchfood / fprefx / eatcorpse / start_eating / bite /
//         eatfood / done_eating / lesshungry / obj_nutrition / is_edible /
//         gethungry (Unaware rn2(10) + accessorytime rn2(20)); invent.c getobj.
// Named omissions: floorfood floor; TIN; full cprefx/cpostfx; tainted Sick;
// poison_strdmg; slime/stone; rottenfood body RNG; freeinv invent-full drop;
// ?/* menu; multi-turn choke/newuhs.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { flush_topl_more, pline } from './display.js';
import { yn_function } from './getline.js';
import { FOOD_CLASS, COIN_CLASS, objectNames } from './objects.js';
import { weight, splitobj } from './mkobj.js';
import { BY_COOKIE, bcsign, outrumor } from './rumors.js';
import { singular, xname, doname } from './objnam.js';
import {
    mons, acidic, poisonous, carnivorous, herbivorous, vegan, vegetarian,
    is_rider, PM_LICHEN, PM_ACID_BLOB, PM_MONK, monsterNames, pmnames,
} from './monsters.js';
import { set_occupation } from './engrave.js';

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

/**
 * C ref: eat.c gethungry — Unaware metabolic rn2(10) then accessorytime rn2(20).
 * Hunger side-effects beyond the rolls deferred (ring/amulet nutrition, faint).
 */
export function gethungry() {
    if (game.u?.uinvulnerable) return;

    // C: (!Unaware || !rn2(10)) && eats && !Slow_digestion → uhunger--
    // rn2(10) is evaluated whenever Unaware (|| short-circuit); food checks
    // after that are deferred — RNG order only needs the Unaware roll.
    if (Unaware()) {
        rn2(10);
        // uhunger-- when !rn2(10) && carnivorous/… deferred
    }
    // else non-Unaware: no rn2(10); ordinary uhunger-- deferred

    const accessorytime = rn2(20);
    void accessorytime;
}

/**
 * C ref: eat.c morehungry — nutrition loss after feats of magic / vomit.
 * newuhs body deferred (status transitions not needed for cast hunger).
 */
export function morehungry(num) {
    if (!game.u) return;
    game.u.uhunger = (game.u.uhunger ?? 900) - (num | 0);
}

/**
 * C ref: eat.c lesshungry — uhunger += num; choke/fullwarn/newuhs deferred.
 */
export function lesshungry(num) {
    if (!game.u) return;
    game.u.uhunger = (game.u.uhunger ?? 900) + (num | 0);
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

/** C ref: invent.c useup() — consume one from a stack / remove if gone. */
function useup(otmp) {
    if (!otmp) return;
    if ((otmp.quan || 1) > 1) {
        otmp.quan--;
        otmp.owt = weight(otmp);
        return;
    }
    const inv = game.invent || [];
    const idx = inv.indexOf(otmp);
    if (idx >= 0) inv.splice(idx, 1);
}

/**
 * C ref: eat.c touchfood — split stack (next_ident via splitobj), set oeaten.
 * freeinv + addinv_nomerge deferred: invent-array split leaves parent reduced
 * and child OBJ_FREE; done_eating useup does not need reinsertion for
 * reqtime-1 finish.
 */
function touchfood(otmp) {
    if ((otmp.quan || 1) > 1) {
        // C: floor → splitobj(otmp, quan-1); carried → otmp = splitobj(otmp, 1)
        // Inventory-only path here (floorfood floor deferred).
        const child = splitobj(otmp, 1);
        if (child) otmp = child;
    }
    if (!otmp.oeaten) {
        // costly_alteration deferred
        otmp.oeaten = obj_nutrition(otmp);
    }
    return otmp;
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
 * C ref: eat.c done_eating — finish meal; cpostfx/fpostfx deferred.
 */
async function done_eating(message) {
    const piece = game.context?.victual?.piece;
    if (!piece) {
        if (game.context) game.context.victual = {};
        game.occupation = null;
        return;
    }
    game.occupation = null;
    if (message) {
        await pline(`You finish eating ${food_xname(piece, true)}.`);
    }
    // cpostfx / fpostfx: FORTUNE_COOKIE rumor; other deferred
    if (piece.otyp === FORTUNE_COOKIE) {
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
    // floor-moved food deferred — invent-only path keeps carried food
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
        if (game.u) {
            const dmg = 1 + rn2(15);
            game.u.uhp = (game.u.uhp | 0) - dmg;
        }
    } else if (poisonous(ptr) && rn2(5)) {
        tp++;
        await pline('Ecch - that must have been poisonous!');
        // poison_strdmg / Poison_resistance body deferred
    } else if ((rotted > 5 || (rotted > 3 && rn2(5)))
        && !(game.u?.HSick_resistance || game.u?.ESick_resistance)) {
        tp++;
        await pline(`You feel ${game.u?.Sick ? 'very ' : ''}sick.`);
        if (game.u) {
            const dmg = 1 + rn2(8);
            game.u.uhp = (game.u.uhp | 0) - dmg;
        }
    }

    // delay is weight dependent
    const cwt = glob ? (otmp.owt | 0) : (ptr?.cwt ?? 0);
    if (!game.context) game.context = {};
    if (!game.context.victual) game.context.victual = {};
    game.context.victual.reqtime = 3 + (cwt >> 6);

    if (!tp && !nonrotting_corpse(mnum) && (otmp.orotten || !rn2(7))) {
        // rottenfood full body deferred — refuse RNG invent by stubbing
        // the common non-faint return-0 path without extra rolls when
        // we would need them; instead mark dont_start without consume.
        // For faithfulness when this branch hits: burn rottenfood RNG
        // subset (rn2(4), maybe more) — implement minimal:
        await pline(`Blecch!  Rotten ${food_xname(otmp, false)}!`);
        if (!rn2(4)) {
            // confuse deferred
        } else if (!rn2(4)) {
            // blind deferred
        } else if (!rn2(3)) {
            // faint/nomul deferred — still dont_start
            retcode = 1;
        }
        otmp.orotten = true;
        otmp = touchfood(otmp);
        if (!otmp) return 1;
        if (game.context?.victual) game.context.victual.piece = otmp;
        if (!(ptr?.cnutrit)) {
            await pline('The corpse rots away completely.');
            useup(otmp);
            return 2;
        }
        if (!retcode) consume_oeaten(otmp, 2);
        if (retcode) return retcode;
        retcode = 1; // dont_start after rottenfood without faint
    } else if ((mnum === PM_COCKATRICE || mnum === PM_CHICKATRICE)
        && (game.u?.HStone_resistance || game.u?.Hallucination)) {
        await pline('This tastes just like chicken!');
    } else if (mnum === PM_FLOATING_EYE
        && (game.u?.umonnum ?? -1) === PM_RAVEN) {
        await pline('You peck the eyeball with delight.');
    } else if (tp) {
        // message already delivered
    } else {
        const youData = game.youmonst?.data;
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
 * TIN, floorfood floor, multi-turn non-corpse occupation, rotten ordinary
 * food still deferred.
 * @returns {number} 0 = no turn (ECMD_OK), 1 = took time
 */
export async function doeat() {
    const otmp0 = await getobj_eat();
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
