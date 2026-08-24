import { exercise, near_capacity, adjalign } from './attrib.js';
import { A_CON, SLT_ENCUMBER, W_RINGL, W_RINGR } from './const.js';
// eat.js — nutrition.
// C ref: src/eat.c
//
// Only gethungry()'s once-per-turn draw is ported. 5.0 randomised the trigger:
// it used to be (moves % 20), and is now an explicit rn2(20), which is why a
// port that tracks the turn counter correctly still has to make the call.

import { game } from './gstate.js';
import { Race_if } from './u_init.js';
import { carnivorous, herbivorous, metallivorous, acidic, poisonous,
         flesh_petrifies, vegan, vegetarian, type_is_pname, dmgtype,
         attacktype } from './mondata.js';
import { can_reach_floor } from './pickup.js';
import { is_pool_or_lava } from './dbridge.js';
import { tty_yn_function } from './tty/topl.js';
import { Unaware, Hallucination } from './youprop.js';
import { singular, xname, doname } from './objnam.js';
import { more_experienced, newexplevel } from './exper.js';
import { You, You_cant } from './pline.js';
import { outrumor } from './rumors.js';
import { BY_COOKIE } from './const.js';
import { PMNAMES, MFLAGS as MFLAGS_EAT, ATTKS } from './monst_data.js';
import { done } from './end.js';
import { end_running, nomul } from './hack.js';
import { sgn } from './hacklib.js';
import { ACURR } from './attrib.js';
import { bot } from './display.js';
import { A_STR, STARVING, STARVED, FIRE_RES, SLEEP_RES, COLD_RES,
         DISINT_RES, SHOCK_RES, POISON_RES, ACID_RES, STONE_RES, TELEPORT,
         TELEPORT_CONTROL, TELEPAT, LAST_PROP, FROMOUTSIDE } from './const.js';
import { set_occupation, stop_occupation } from './allmain.js';
import { rn2, rnd, rn1 } from './rng.js';
import { You_feel, Your } from './pline.js';
import { losehp } from './hack.js';
import { SICK_RES, KILLED_BY_AN } from './const.js';
import { NOT_HUNGRY, ECMD_OK, ECMD_TIME, SATIATED, KILLED_BY, CHOKING, WEAK, HUNGRY, FAINTING, FAINTED, A_LAWFUL, W_ARMOR, W_TOOL, W_AMUL, W_SADDLE } from './const.js';
import { ONAMES, OCLASSES } from './objects_data.js';
import { getobj, weight, useup, useupf, GETOBJ_EXCLUDE, GETOBJ_SUGGEST, GETOBJ_EXCLUDE_SELECTABLE, freeinv, update_inventory, reorder_invent, addinv_nomerge } from './invent.js';
import { pline } from './display.js';
/* include/obj.h:332 carried() is a WHERE test, not list membership. */
import { carried } from './obj.js';
import { splitobj, bcsign } from './mkobj.js';

// src/eat.c:3170 gethungry()
export async function gethungry() {
    const u = game.u;

    if (u.uinvulnerable)
        return;                       /* forced to fast while praying */

    /* src/eat.c:3174 — ordinary food consumption. The Unaware term is a real
       short circuit: awake heroes never draw here, but a sleeping hero spends
       one rn2(10) EVERY turn ("slow metabolic rate while asleep") and only
       digests on a 0. seed0016's wand-of-sleep nap is what exposed it. */
    const uptr = game.mons?.[u.umonnum];
    if ((!Unaware() || !rn2(10))
        && (!uptr || carnivorous(uptr) || herbivorous(uptr)
            || metallivorous(uptr))
        && !u.uprops?.SLOW_DIGESTION)
        u.uhunger--;

    /* src/eat.c:3191 — rn2(20) replaces the old (int) (svm.moves % 20L) */
    const accessorytime = rn2(20);

    if (accessorytime % 2) { /* odd */
        /* Regeneration uses up food, unless due to an artifact; the
           FROMFORM/W_ARTI source masks need states that are absent */
        if (u.uprops?.REGENERATION)
            u.uhunger--;
        if (near_capacity() > SLT_ENCUMBER)
            u.uhunger--;
    } else { /* even */
        if (u.uprops?.HUNGER)
            u.uhunger--;
        /* Conflict uses up food too */
        if (u.uprops?.CONFLICT)
            u.uhunger--;
        const uleft = worn_eat(W_RINGL), uright = worn_eat(W_RINGR),
              uamul = worn_eat(W_AMUL);
        switch (accessorytime) { /* note: use even cases among 0..19 only */
        case 0:
            if (u.uprops?.SLOW_DIGESTION
                && (!uright || uright.otyp !== ONAMES.RIN_SLOW_DIGESTION)
                && (!uleft || uleft.otyp !== ONAMES.RIN_SLOW_DIGESTION))
                u.uhunger--;
            break;
        case 4:
            /* the +0 ring of protection "only source of MC" corner needs
               the EProtection source masks; a +0 protection ring here is
               treated as hungerless and recorded */
            if (uleft && uleft.otyp !== ONAMES.MEAT_RING
                && (uleft.spe
                    || !game.objects[uleft.otyp].oc_charged
                    || (uleft.otyp === ONAMES.RIN_PROTECTION
                        && note_unported_eat('gethungry:protection_mc'))))
                u.uhunger--;
            break;
        case 8:
            if (uamul && uamul.otyp !== ONAMES.FAKE_AMULET_OF_YENDOR)
                u.uhunger--;
            break;
        case 12:
            if (uright && uright.otyp !== ONAMES.MEAT_RING
                && (uright.spe
                    || !game.objects[uright.otyp].oc_charged
                    || (uright.otyp === ONAMES.RIN_PROTECTION
                        && note_unported_eat('gethungry:protection_mc'))))
                u.uhunger--;
            break;
        case 16:
            if (u.uhave?.amulet)
                u.uhunger--;
            break;
        default:
            break;
        }
    }
    await newuhs(true);
}

/* the worn-slot lookup, local to avoid importing do_wear (cycle) */
function worn_eat(mask) {
    for (const o of (game.invent || []))
        if ((o.owornmask ?? 0) & mask)
            return o;
    return null;
}


// src/eat.c:3347 is_fainted()
export function is_fainted() {
    return game.u.uhs === FAINTED;
}

// src/eat.c:126 init_uhunger() — the hero starts well fed.
//
// exerper() reads uhunger every tenth move to decide which attribute to
// exercise, and each branch spends a different draw: NOT_HUNGRY exercises
// Constitution with rn2(19), while SATIATED and FAINTING both decrement with
// rn2(2). Leaving uhunger unset made every comparison fall through to FAINTING
// and drew the wrong one.
export function init_uhunger() {
    game.u.uhunger = 900;
    game.u.uhs = NOT_HUNGRY;
}

// src/eat.c floorfood() — offer each edible thing at the hero's feet with a
// y/n prompt, then fall through to getobj() for something carried.
//
// Each floor prompt reads ONE key, so the total depends on what is underfoot:
// a bear trap, iron bars, gold and a food item each add one. That makes the
// count data-dependent, and our floor contents are known to differ from C's on
// some levels, so guessing it would misalign a session rather than fix it.
// Only the clean case is ported — nothing edible underfoot, straight to
// getobj — and anything else is recorded.
export async function floorfood(verb, corpsecheck) {
    const feeding = (verb === 'eat');           /* corpsecheck == 0 */

    /* if we can't touch floor objects then use inventory food only */
    if (!can_reach_floor(true)
        || (is_pool_or_lava(game.u.ux, game.u.uy)))
        return await getobj(verb, eat_ok, 0);   /* goto skipfloor */

    /* src/eat.c — the metallivore arms (bear trap, iron bars, gold) come
       first and each spends a prompt; no ported hero is metallivorous. */
    if (feeding && metallivorous(game.youmonst.data))
        note_unported_eat('floorfood:metallivorous');

    /* C walks level.objects[x][y] via nexthere, which is the pile in
       top-first order; our list is newest-first for the same reason. */
    for (const otmp of (game.level?.objects || [])) {
        if (otmp.ox !== game.u.ux || otmp.oy !== game.u.uy)
            continue;
        const wanted = corpsecheck
            ? (otmp.otyp === ONAMES.CORPSE && corpsecheck === 1)
            : feeding ? (otmp.oclass !== OCLASSES.COIN_CLASS
                         && is_edible(otmp))
                      : otmp.oclass === OCLASSES.FOOD_CLASS;
        if (!wanted)
            continue;

        const one = (otmp.quan === 1);
        /* "There is <an object> here; <verb> it?" */
        const qbuf = `There ${one ? 'is' : 'are'} ${doname(otmp)}`
                     + ` here; ${verb} ${one ? 'it' : 'one'}?`;
        const c = await tty_yn_function(qbuf, 'ynq', 'n');
        if (c === 'y')
            return otmp;
        else if (c === 'q')
            return null;
    }

 /* skipfloor: */
    return await getobj(verb, eat_ok, 0);
}

// src/eat.c doeat() — the 'e' command.
//
// The eating itself needs the nutrition, corpse and tin code. What is ported is
// the object prompt, because a session that eats and does not have its
// inventory letter consumed runs that letter as a command instead.
// src/eat.c:91 is_edible() — can the HERO eat this?
//
// The fire-elemental and metallivore arms need a polymorphed youmonst,
// which this tree does not track; ghoul and gelatinous cube read the real
// u.umonnum. For every un-polymorphed hero this reduces to the C's tail:
// not a unique object, and FOOD_CLASS.
export function is_edible(obj) {
    /* protect invocation tools but not Rider corpses (handled elsewhere) */
    if (game.objects[obj.otyp].oc_unique)
        return false;

    if (game.u.umonnum === PMNAMES.PM_GHOUL) {
        /* vegan() is not ported; a hero polymorphed into a ghoul cannot
           arise on this tree (polyself absent), so record if reached */
        note_unported_eat('is_edible:ghoul_vegan');
        return obj.otyp === ONAMES.CORPSE || obj.otyp === ONAMES.EGG;
    }

    return obj.oclass === OCLASSES.FOOD_CLASS;
}

// src/eat.c:3517 eat_ok() — getobj callback; effectively wraps is_edible().
//
// C's getobj_else tracks "floor food declined" to word the refusal as
// "anything ELSE to eat"; the floor-food prompt machinery is upstream of
// getobj and recorded there.
export function eat_ok(obj) {
    if (!obj)
        return GETOBJ_EXCLUDE;

    if (is_edible(obj))
        return GETOBJ_SUGGEST;

    /* exclude, not downplay, gold: "You cannot eat gold" comes from getobj */
    if (obj.oclass === OCLASSES.COIN_CLASS)
        return GETOBJ_EXCLUDE;

    return GETOBJ_EXCLUDE_SELECTABLE;
}

// src/eat.c:325 obj_nutrition()
export function obj_nutrition(otmp) {
    return (otmp.otyp === ONAMES.CORPSE) ? game.mons[otmp.corpsenm].cnutrit
           : otmp.globby ? otmp.owt
             : game.objects[otmp.otyp].oc_nutrition;
}

/* src/eat.c:137 tintxts[] — tin types
   [SPINACH_TIN = -1, overrides corpsenm, nut==600] */
const tintxts = [
    { txt: 'rotten', nut: -50, fodder: 0, greasy: 0 },  /* ROTTEN_TIN = 0 */
    { txt: 'homemade', nut: 50, fodder: 1, greasy: 0 }, /* HOMEMADE_TIN = 1 */
    { txt: 'soup made from', nut: 20, fodder: 1, greasy: 0 },
    { txt: 'french fried', nut: 40, fodder: 0, greasy: 1 },
    { txt: 'pickled', nut: 40, fodder: 1, greasy: 0 },
    { txt: 'boiled', nut: 50, fodder: 1, greasy: 0 },
    { txt: 'smoked', nut: 50, fodder: 1, greasy: 0 },
    { txt: 'dried', nut: 55, fodder: 1, greasy: 0 },
    { txt: 'deep fried', nut: 60, fodder: 0, greasy: 1 },
    { txt: 'szechuan', nut: 70, fodder: 1, greasy: 0 },
    { txt: 'broiled', nut: 80, fodder: 0, greasy: 0 },
    { txt: 'stir fried', nut: 80, fodder: 0, greasy: 1 },
    { txt: 'sauteed', nut: 95, fodder: 0, greasy: 0 },
    { txt: 'candied', nut: 100, fodder: 1, greasy: 0 },
    { txt: 'pureed', nut: 500, fodder: 1, greasy: 0 },
    { txt: '', nut: 0, fodder: 0, greasy: 0 },
];
const TTSZ = tintxts.length;

// src/eat.c:1405 tin_variety_txt() — does 's' begin with a tin variety
// word ("pickled ", "boiled ", ...)? Returns the number of characters to
// skip past it (0 for no match); tinvariety is a {v} out-box.
export function tin_variety_txt(s, tinvariety) {
    if (s && tinvariety) {
        tinvariety.v = -1;
        for (let k = 0; k < TTSZ - 1; ++k) {
            const l = tintxts[k].txt.length;
            if (s.toLowerCase().startsWith(tintxts[k].txt.toLowerCase())
                && s.length > l && s[l] === ' ') {
                tinvariety.v = k;
                return l + 1;
            }
        }
    }
    return 0;
}

// src/eat.c:360 touchfood() — split one item off a stack before eating it and
// give it its own inventory slot; also latch its full nutrition into oeaten.
//
// The split is where the meal's rnd(2) comes from: splitobj -> nextoid ->
// next_ident. costly_alteration (shop billing) and the 52-slot overflow drop
// are recorded. The re-slot mirrors C's freeinv + addinv_nomerge using
// assigninvlet's rule: first unused letter, a-z then A-Z.
function touchfood(otmp) {
    if (otmp.quan > 1) {
        if (!(game.invent || []).includes(otmp))
            splitobj(otmp, otmp.quan - 1);
        else
            otmp = splitobj(otmp, 1);
    }

    if (!otmp.oeaten) {
        note_unported_eat('touchfood:costly_alteration');
        otmp.oeaten = obj_nutrition(otmp);
    }

    if ((game.invent || []).includes(otmp)) {
        freeinv(otmp);
        if ((game.invent || []).length >= 52) {
            note_unported_eat('touchfood:overflow_drop');
        } else {
            /* addinv_nomerge: own slot, no merging back into the stack */
            addinv_nomerge(otmp);
            update_inventory();
        }
    }
    return otmp;
}

// include/eat.c:58 nonrotting_corpse() — the species whose corpses never rot.
const nonrotting_corpse = (mnum) =>
    mnum === PMNAMES.PM_LIZARD || mnum === PMNAMES.PM_LICHEN
    || mnum === PMNAMES.PM_ACID_BLOB;   /* is_rider() is recorded below */

// src/eat.c:217 food_xname() — the name a meal is announced under. For a
// corpse that is corpse_xname()'s singular form; for anything else the
// ordinary singular xname.
function food_xname(food, the_pfx) {
    let result;

    if (food.otyp === ONAMES.CORPSE) {
        /* corpse_xname(food, NULL, CXN_SINGULAR); pmname() prefers the
           NEUTRAL spelling and falls back to MALE — pmnames is
           [male, female, neutral] and species like the jackal only fill
           the neutral slot */
        const pmn = game.mons[food.corpsenm]?.pmnames || [];
        const mnam = pmn[2] ?? pmn[0] ?? pmn[1] ?? 'monster';
        result = `${mnam} corpse`;
        if (type_is_pname(game.mons[food.corpsenm]))
            the_pfx = false;
    } else {
        result = singular(food, xname);
    }
    if (the_pfx)
        result = `the ${result}`;
    return result;
}

// src/eat.c:1855 eatcorpse() — a corpse was chosen as food.
//
// Draw order is the whole point of this function: the rot age rn2(20) comes
// first and is skipped entirely for a non-rotting species, then the tainted,
// acidic, poisonous and mildly-ill arms each draw only on their own branch,
// then the rn2(7) rotten gate, and finally the palatability pair. Returns 2
// when the corpse is used up, 1 when a message already landed, 0 otherwise.
// src/eat.c:1375 violated_vegetarian() — a monk feels guilty and loses
// alignment; everyone's conduct counter ticks.
async function violated_vegetarian() {
    (game.u.uconduct ||= {}).unvegetarian =
        (game.u.uconduct.unvegetarian | 0) + 1;
    if (game.urole?.name?.m === 'Monk') {
        await You_feel('guilty.');
        adjalign(-1);
    }
}

async function eatcorpse(otmp) {
    let retcode = 0, tp = 0;
    const mnum = otmp.corpsenm;
    let rotted = 0;
    const glob = !!otmp.globby;
    const mdat = game.mons[mnum];

    if (flesh_petrifies(mdat) || mnum === PMNAMES.PM_GREEN_SLIME)
        note_unported_eat('eatcorpse:stoneable_or_slimeable');

    /* src/eat.c:1869 — KMH, conduct; the monk's guilt message rides on
       violated_vegetarian() */
    if (!vegan(mdat))
        (game.u.uconduct ||= {}).unvegan = (game.u.uconduct.unvegan | 0) + 1;
    if (!vegetarian(mdat))
        await violated_vegetarian();

    if (!nonrotting_corpse(mnum)) {
        /* peek_at_iced_corpse_age(otmp) — plain age unless the corpse is on
           ice, which nothing ported creates */
        const age = otmp.age || 0;

        rotted = Math.trunc((game.moves - age) / (10 + rn2(20)));
        if (otmp.cursed)
            rotted += 2;
        else if (otmp.blessed)
            rotted -= 2;
    }

    if (!glob && rotted > 5) {
        note_unported_eat('eatcorpse:tainted');
        return 2;
    } else if (acidic(mdat)) {
        tp++;
        note_unported_eat('eatcorpse:acidic');
    } else if (poisonous(mdat) && rn2(5)) {
        tp++;
        note_unported_eat('eatcorpse:poisonous');
    /* now any corpse left too long will make you mildly ill */
    } else if ((rotted > 5 || (rotted > 3 && rn2(5)))
               && !game.u.uprops?.[SICK_RES]?.intrinsic) {
        tp++;
        await You_feel(`${game.u.usick ? 'very ' : ''}sick.`);
        await losehp(rnd(8), !glob ? 'cadaver' : 'rotted glob', KILLED_BY_AN);
    }

    /* delay is weight dependent */
    game.context.victual = game.context.victual || {};
    game.context.victual.reqtime =
        3 + ((!glob ? mdat.cwt : otmp.owt) >> 6);

    if (!tp && !nonrotting_corpse(mnum) && (otmp.orotten || !rn2(7))) {
        note_unported_eat('eatcorpse:rottenfood');
        otmp.orotten = true;
        retcode = 1;

        if (!mdat.cnutrit) {
            note_unported_eat('eatcorpse:rots_away');
            retcode = 2;
        }
        if (!retcode)
            consume_oeaten(otmp, 2);    /* oeaten >>= 2 */
    } else if (tp) {
        ; /* a message already landed; don't add "it tastes okay" */
    } else {
        /* yummy is always false for omnivores, palatable always true */
        const you = game.youmonst.data;
        const yummy = (vegan(mdat)
                       ? (!carnivorous(you) && herbivorous(you))
                       : (carnivorous(you) && !herbivorous(you)));
        const palatable = ((vegetarian(mdat) ? herbivorous(you)
                                             : carnivorous(you))
                           && rn2(10)
                           && (rotted < 1 || !rn2(rotted + 1)));
        /* first char: T = tastes ... , I = is ... ; veggies are just "okay" */
        const palatable_msgs = ['Tokay', 'Istringy', 'Igamey', 'Ifatty',
                                'Itough'];
        const idx = vegetarian(mdat) ? 0 : rn2(palatable_msgs.length);
        const palat_msg = palatable_msgs[idx];
        const use_is = (palatable && palat_msg[0] === 'I');
        let pmxnam = food_xname(otmp);

        if (pmxnam.slice(0, 4).toLowerCase() === 'the ')
            pmxnam = pmxnam.slice(4);
        await pline(`${type_is_pname(mdat) ? '' : 'This '}${pmxnam} ${
            use_is ? 'is' : 'tastes'} ${
            yummy ? 'delicious'
                  : palatable ? palat_msg.slice(1) : 'terrible'}${
            (yummy || !palatable) ? '!' : '.'}`);
    }

    return retcode;
}

export async function doeat() {
    let otmp = await floorfood('eat', 0);

    if (!otmp)
        return ECMD_OK;

    /* src/eat.c:2864 — "We have to make non-foods take 1 move to eat,
       unless..." — an explicitly chosen non-food is rejected without
       spending the turn. */
    if (!is_edible(otmp)) {
        await You('cannot eat that!');
        return ECMD_OK;
    } else if ((otmp.owornmask & (W_ARMOR | W_TOOL | W_AMUL | W_SADDLE)) !== 0) {
        /* let them eat rings */
        await You_cant(`eat something you're wearing.`);
        return ECMD_OK;
    }

    /* src/eat.c doeat() tail — the tin, corpse and conduct arms above this
       need their own subsystems; what is ported is the ordinary-food path,
       which is the one that reaches choke(). */
    if (otmp.otyp === ONAMES.TIN) {
        note_unported_eat('doeat:tin');
        return ECMD_TIME;
    }

    let dont_start = false;
    if (otmp.otyp === ONAMES.CORPSE || otmp.globby) {
        /* src/eat.c:2946 — eatcorpse() sets up victual.reqtime itself unless
           the corpse was used up (2) or a message already landed (1). */
        const tmp = await eatcorpse(otmp);

        if (tmp === 2) {
            game.context.victual = game.context.victual || {};
            game.context.victual.piece = null;
            game.context.victual.o_id = 0;
            return ECMD_TIME;
        } else if (tmp) {
            dont_start = true;
        }
        const v0 = (game.context.victual ||= {});
        v0.piece = otmp;
        v0.o_id = otmp.o_id;
        v0.usedtime = 0;
        v0.canchoke = (game.u.uhs === SATIATED);
        if (!otmp.oeaten)
            otmp.oeaten = game.mons[otmp.corpsenm]?.cnutrit ?? 0;
        if (v0.reqtime === 0 || !otmp.oeaten)
            v0.nmod = 0;
        else if (otmp.oeaten >= v0.reqtime)
            v0.nmod = -Math.trunc(otmp.oeaten / v0.reqtime);
        else
            v0.nmod = v0.reqtime % otmp.oeaten;
        if (!dont_start)
            await start_eating(otmp, false);
        return ECMD_TIME;
    }

    /* src/eat.c:2966 — latched BEFORE touchfood(), which sets oeaten. */
    const already_partly_eaten = otmp.oeaten ? true : false;

    /* src/eat.c:2968 — touchfood() BEFORE the victual is set up; it may
       replace otmp with the split-off single. */
    otmp = touchfood(otmp);

    const v = (game.context.victual ||= {});
    v.piece = otmp;
    v.o_id = otmp.o_id;
    v.usedtime = 0;
    v.reqtime = game.objects[otmp.otyp].oc_delay;

    /* src/eat.c:3027 — cursed or old food behaves rotten. The age arm's
       rn2(7) only draws once the food is over 30 (blessed: 50) turns old,
       which is why fresh starting food never spends it. nonrotting_food()
       is lembas or cram (eat.c:65). */
    if (otmp.otyp !== ONAMES.FORTUNE_COOKIE
        && (otmp.cursed
            || (!(otmp.otyp === ONAMES.LEMBAS_WAFER
                  || otmp.otyp === ONAMES.CRAM_RATION)
                && (game.moves - (otmp.age || 0)) > (otmp.blessed ? 50 : 30)
                && (otmp.orotten || !rn2(7))))) {
        /* rottenfood()'s messages and blindness/stun arms draw rn2(4); the
           dont_start bracket depends on them. */
        note_unported_eat('doeat:rottenfood');
        otmp.orotten = true;
        consume_oeaten(otmp, 1);        /* oeaten >>= 1 */
    } else if (!already_partly_eaten) {
        if (!(await fprefx(otmp))) {
            do_reset_eat();
            return ECMD_TIME;
        }
    } else {
        await You(`${v.reqtime === 1 ? "eat" : "begin eating"} ${doname(otmp)}.`);
    }

    /* nutrition units per round eating */
    if (v.reqtime === 0 || !otmp.oeaten)
        v.nmod = 0;
    else if (otmp.oeaten >= v.reqtime)
        v.nmod = -Math.trunc(otmp.oeaten / v.reqtime);
    else
        v.nmod = v.reqtime % otmp.oeaten;

    /* THE death condition: latched ONCE here from the hunger state at the
       moment the meal starts, not re-tested per bite. */
    v.canchoke = (game.u.uhs === SATIATED);

    await start_eating(otmp, false);
    return ECMD_TIME;
}

// src/eat.c:2099 fprefx() — the "start to eat" feedback for ordinary food.
// Returns false when the meal is aborted (a pyrolisk egg explodes).
//
// The recording pins the build flags: seed0016's apple prints "Delicious!
// Must be a Macintosh!", which is the #if MACOS arm, so the reference build
// defines MACOS (and, being macOS, UNIX — the PEAR fallthrough).
async function fprefx(otmp) {
    const give_feedback = async () => {
        await pline(`This ${singular(otmp, xname)} is ${
            otmp.cursed
                ? (Hallucination() ? "grody!" : "terrible!")
                : (otmp.otyp === ONAMES.CRAM_RATION
                   || otmp.otyp === ONAMES.K_RATION
                   || otmp.otyp === ONAMES.C_RATION)
                    ? "bland."
                    : Hallucination() ? "gnarly!" : "delicious!"}`);
    };
    /* include/hack.h:51 CANNIBAL_ALLOWED() */
    const cannibal_allowed = () =>
        game.urole?.mnum === 'PM_CAVE_DWELLER'
        || game.urole?.mnum === PMNAMES.PM_CAVE_DWELLER
        || Race_if(PMNAMES.PM_ORC);

    switch (otmp.otyp) {
    case ONAMES.EGG:
        if (otmp.corpsenm === PMNAMES.PM_PYROLISK) {
            /* useup + explode(u.ux, u.uy, -11, d(3,6), 0, EXPL_FIERY) */
            note_unported_eat('fprefx:pyrolisk_egg');
            return false;
        }
        /* stale_egg() reads iced-corpse age bookkeeping; a stale egg makes
           vomiting with d(10,4). Fresh eggs take the plain feedback. */
        note_unported_eat('fprefx:stale_egg_check');
        await give_feedback();
        break;
    case ONAMES.FOOD_RATION: /* nutrition 800 */
        /* 200+800 remains below 1000+1, the satiation threshold */
        if (game.u.uhunger <= 200)
            await pline(Hallucination()
                ? "Oh wow, like, superior, man!"
                : "This food really hits the spot!");
        /* 700-1+800 remains below 1500, the choking threshold */
        else if (game.u.uhunger < 700)
            /* body_part(STOMACH) — un-polymorphed heroes all say this */
            await pline("This satiates your stomach!");
        break;
    case ONAMES.TRIPE_RATION:
        /* the carnivorous non-humanoid arm needs a polymorphed hero */
        if (Race_if(PMNAMES.PM_ORC)) {
            await pline(Hallucination() ? "Tastes great!  Less filling!"
                                        : "Mmm, tripe... not bad!");
        } else {
            await pline("Yak - dog food!");
            more_experienced(1, 0);
            await newexplevel();
            /* not cannibalism, but we use similar criteria
               for deciding whether to be sickened by this meal */
            if (rn2(2) && !cannibal_allowed()) {
                rn1(game.context.victual.reqtime, 14);
                note_unported_eat('fprefx:make_vomiting');
            }
        }
        break;
    case ONAMES.LEMBAS_WAFER:
        if (Race_if(PMNAMES.PM_ORC)) {
            await pline("!#?&* elf kibble!");
            break;
        } else if (Race_if(PMNAMES.PM_ELF)) {
            await pline("A little goes a long way.");
            break;
        }
        await give_feedback();
        break;
    case ONAMES.MEATBALL:
    case ONAMES.MEAT_STICK:
    case ONAMES.ENORMOUS_MEATBALL:
    case ONAMES.MEAT_RING:
        await give_feedback();
        break;
    case ONAMES.CLOVE_OF_GARLIC:
        /* the is_undead vomit arm needs a polymorphed hero;
           iter_mons(garlic_breath) scares nearby vampiric pets */
        note_unported_eat('fprefx:garlic_breath');
        /*FALLTHRU*/
    default:
        if (otmp.otyp === ONAMES.SLIME_MOLD && !otmp.cursed
            && otmp.spe === (game.context.current_fruit ?? 1)) {
            await pline(`My, this is a ${
                Hallucination() ? "primo" : "yummy"} ${
                singular(otmp, xname)}!`);
        } else if (otmp.otyp === ONAMES.APPLE && otmp.cursed
                   && !game.u.uprops?.SLEEP_RES) {
            ; /* skip core joke; feedback deferred til fpostfx() */
        } else if (otmp.otyp === ONAMES.APPLE) {
            await pline("Delicious!  Must be a Macintosh!");
        } else if (otmp.otyp === ONAMES.PEAR) {
            /* the #ifdef UNIX arm; MACOS grabbed APPLE above */
            if (!Hallucination()) {
                await pline("Core dumped.");
            } else {
                /* based on an old Usenet joke, a fake a.out manual page */
                const x = rnd(100);
                await pline(`${(x <= 75) ? "Segmentation fault"
                              : (x <= 99) ? "Bus error"
                                : "Yo' mama"} -- core dumped.`);
            }
        } else {
            await give_feedback();
        }
        break; /* default */
    } /* switch */
    return true;
}

// src/eat.c:2510 fpostfx() — the food's after-effects. The reachable arms:
// the fortune cookie's rumor and the apple/pear "core dumped" deferral. The
// stat-gain foods (royal jelly, giant corpses via cpostfx) and the wolfsbane
// and carrot cures are gated on state no current hero has.
async function fpostfx(otmp) {
    switch (otmp.otyp) {
    case ONAMES.SPRIG_OF_WOLFSBANE:
        /* you_unwere needs lycanthropy */
        break;
    case ONAMES.CARROT:
        if (game.u.ucreamed)
            note_unported_eat('fpostfx:make_blinded');
        break;
    case ONAMES.FORTUNE_COOKIE:
        await outrumor(bcsign(otmp), BY_COOKIE);
        if (!game.u.ublind)
            game.u.uconduct = game.u.uconduct || {},
            game.u.uconduct.literate = (game.u.uconduct.literate || 0) + 1;
        break;
    case ONAMES.LUMP_OF_ROYAL_JELLY:
        note_unported_eat('fpostfx:royal_jelly');
        break;
    case ONAMES.EGG:
        if (otmp.corpsenm >= 0)
            note_unported_eat('fpostfx:egg_petrify');
        break;
    case ONAMES.EUCALYPTUS_LEAF:
        if (game.u.uprops?.SICK || game.u.uprops?.VOMITING)
            note_unported_eat('fpostfx:eucalyptus');
        break;
    case ONAMES.APPLE:
        if (otmp.cursed && !game.u.uprops?.SLEEP_RES) {
            /* the Snow White core joke: sleeping poison */
            note_unported_eat('fpostfx:cursed_apple_sleep');
        }
        break;
    default:
        break;
    }
}

// src/eat.c start_eating() — begin (or resume) a meal.
//
// bite() is called BEFORE usedtime is incremented, so a one-turn meal eaten
// while Satiated chokes on the very first call rather than after finishing.
export async function start_eating(otmp, already_partly_eaten) {
    const v = game.context.victual;

    v.fullwarn = 0;
    v.doreset = 0;
    v.eating = 1;

    if (await bite()) {
        /* survived choking, finish off food that's nearly done;
           need this to handle cockatrice eggs, fortune cookies, etc */
        if (++v.usedtime >= v.reqtime) {
            /* C brackets this call with a save/restore of gn.nomovemsg so
               that done_eating() does not issue one when the reason we got
               here is a vomit() from bite(). */
            const save = game.nomovemsg;
            game.nomovemsg = null;
            await done_eating(false);
            game.nomovemsg = save;
        }
        return;
    }

    if (++v.usedtime >= v.reqtime) {
        /* print "finish eating" message if they just resumed -dlc */
        await done_eating((v.reqtime > 1 || already_partly_eaten) ? true : false);
        return;
    }

    set_occupation(eatfood, `eating ${otmp.oname ?? ''}`, 0);
}

function note_unported_eat(what) {
    (game.unported ||= new Set()).add(what);
}

// src/eat.c:245 choke() — the hero eats past Satiated and dies.
//
// This is seed0030's first death and the blocker for seven sessions. The
// guard is the SATIATED state, not the food: eating an ordinary meal chokes
// only when u.uhs is already SATIATED, and anything else returns immediately
// unless it is an amulet of strangulation.
//
// The rn2(20) is the only draw, and it is short-circuited by Breathless or
// Hunger, so a hero with either spends nothing here.
export async function choke(food) {
    /* only happens if you were satiated */
    if (game.u.uhs !== SATIATED) {
        if (!food || food.otyp !== ONAMES.AMULET_OF_STRANGULATION)
            return;
    } else {
        /* Role_if(PM_KNIGHT) && u.ualign.type == A_LAWFUL -> adjalign(-1),
           "gluttony is unchivalrous". Needs the hero's role and alignment
           record; it changes no draw. */
        note_unported_eat('choke:knight_adjalign');
    }

    exercise(A_CON, false);   /* src/eat.c:256 */

    /* Breathless and Hunger are intrinsics this port does not track, so the
       rn2(20) is always the deciding test here. */
    if (!rn2(20)) {
        if (food && food.otyp === ONAMES.AMULET_OF_STRANGULATION)
            return;                     /* "choke, but recover your composure" */
    }

    game.killer = { format: KILLED_BY, name: 'quick snack' };
    await pline('You choke over it.');
    await pline('You die...');
    await done(CHOKING);
}

// src/eat.c:3132 bite() — one turn of eating. Returns 1 if the hero choked and
// survived, 0 otherwise.
//
// The choke gate is the whole reason this function matters here:
//
//     if (victual.canchoke && u.uhunger >= 2000) { choke(piece); return 1; }
//
// so the death is a consequence of ACCUMULATED nutrition, not of the meal.
export async function bite() {
    const v = game.context?.victual;
    if (!v)
        return 0;

    if (v.canchoke && game.u.uhunger >= 2000) {
        await choke(v.piece);
        return 1;
    }
    if (v.doreset) {
        do_reset_eat();     /* src/eat.c:3142 -- ported at eat.js:307 */
        return 0;
    }
    /* src/eat.c bite() tail — force_save_hs makes lesshungry() treat this as
       eating even though the occupation check would not; see lesshungry. */
    game.force_save_hs = true;
    if (v.nmod < 0) {
        await lesshungry(adj_victual_nutrition());
        consume_oeaten(v.piece, v.nmod);        /* -= -nmod */
    } else if (v.nmod > 0 && (v.usedtime % v.nmod)) {
        await lesshungry(1);
        consume_oeaten(v.piece, -1);            /* -= 1 */
    }
    game.force_save_hs = false;
    recalc_wt();
    return 0;
}

// src/eat.c eatfood() — the occupation callback. Returns 1 while still busy,
// 0 when the meal is over (or was interrupted).
//
// usedtime is incremented BEFORE bite(), and the test is <= reqtime rather
// than < , so the last turn of a meal still takes a bite. Writing it as < , or
// biting before incrementing, drops that final bite -- and for a Satiated hero
// that final bite is the one that chokes.
/* src/eat.c:1571 opentin() — the tin-opening occupation. Not ported yet;
   newhungry() compares occupation pointers against it, so the symbol must
   exist for that test even while nothing can ever set it. */
function opentin() {
    (game.unported ||= new Set()).add('eat:opentin');
    return 0;
}

export async function eatfood() {
    const v = game.context.victual;
    let food = v?.piece;

    if (food && !carried(food) && !obj_here(food, game.u.ux, game.u.uy))
        food = null;
    if (!food) {
        /* maybe it was stolen? */
        do_reset_eat();
        return 0;
    }
    if (!v.eating)
        return 0;

    if (++v.usedtime <= v.reqtime) {
        if (await bite())
            return 0;
        return 1;                       /* still busy */
    }
    await done_eating(true);
    return 0;
}


// src/invent.c obj_here() — is this object on that square?
const obj_here = (o, x, y) => o.ox === x && o.oy === y;

// src/eat.c done_eating() — the meal finished normally.
//
// Order matters: go.occupation is cleared BEFORE newuhs(), with the C's own
// comment "do this early, so newuhs() knows we're done". newuhs recomputes the
// hunger state, and it reads whether an occupation is running.
export async function done_eating(message) {
    const v = game.context.victual;
    const piece = v.piece;

    if (piece)
        piece.in_use = true;
    game.occupation = null;             /* early, so newuhs knows we're done */
    await newuhs(false);

    if (game.nomovemsg) {
        if (message)
            await pline(game.nomovemsg);
        game.nomovemsg = null;
    } else if (message) {
        /* You("finish eating %s.", food_xname(piece, TRUE)) */
        await You(`finish eating ${food_xname(piece, true)}.`);
    }

    if (piece && (piece.otyp === ONAMES.CORPSE || piece.globby))
        await cpostfx(piece.corpsenm);
    else if (piece)
        await fpostfx(piece);

    /* the object leaves by one of two doors: useup() when carried, useupf()
       when it is lying on the floor (src/eat.c:568, :570). Both are ported;
       useupf's shop-billing arm records inside useupf itself. */
    if (piece) {
        if (carried(piece))
            useup(piece);
        else
            useupf(piece, 1);
    }

    game.context.victual = {};          /* zero_victual */
}

// src/eat.c do_reset_eat() — the meal was interrupted.
//
// canchoke is deliberately NOT cleared: the C comment says so outright, because
// resuming the same food has to remember whether the hero was Satiated when
// they STARTED it. Clearing it here would let a hero resume a meal that should
// still kill them.
export function do_reset_eat() {
    const v = game.context.victual;

    if (v?.piece) {
        v.o_id = 0;
        note_unported_eat('do_reset_eat:touchfood');
    }
    if (v) {
        v.fullwarn = 0;
        v.eating = 0;
        v.doreset = 0;
        /* canchoke intentionally left alone */
    }
}

// src/eat.c newuhs() — recompute the hunger status from u.uhunger.
//
// The state table is the part the choke death depends on:
//
//     h > 1000 -> SATIATED, > 150 -> NOT_HUNGRY, > 50 -> HUNGRY,
//     > 0 -> WEAK, else FAINTING
//
// Note SATIATED starts at 1001 but choke() needs u.uhunger >= 2000 as well,
// so there is a wide band where the hero is Satiated and eating is safe.
//
// save_hs/saved_hs exist so that passing WEAK -> HUNGRY -> NOT_HUNGRY during a
// single meal produces one message about the whole meal rather than one per
// bite; the C's comment block says the occupation test alone is not enough
// because start_eating calls bite() before setting the occupation.
let save_hs = 0, saved_hs = false;

export async function newuhs(incr) {
    const h = game.u.uhunger;
    const newhs = (h > 1000) ? SATIATED
                : (h > 150)  ? NOT_HUNGRY
                : (h > 50)   ? HUNGRY
                : (h > 0)    ? WEAK
                             : FAINTING;

    /* mid-meal: remember the status we started at and report once at the end */
    if (game.occupation === eatfood || game.context?.victual?.eating) {
        if (!saved_hs) {
            save_hs = game.u.uhs;
            saved_hs = true;
        }
        game.u.uhs = newhs;
        return;
    }
    if (saved_hs) {
        /* the whole-meal comparison: restore the status the meal started
           at, so the message switch below sees start -> end */
        game.u.uhs = save_hs;
        saved_hs = false;
    }

    let newhs2 = newhs;
    if (newhs2 === FAINTING) {
        /* u.uhunger is likely to be negative at this point */
        const uhunger_div_by_10 = sgn(game.u.uhunger)
            * Math.trunc((Math.abs(game.u.uhunger) + 5) / 10);

        if (is_fainted())
            newhs2 = FAINTED;
        if (game.u.uhs <= WEAK
            || rn2(20 - uhunger_div_by_10) >= 19) {
            if (!is_fainted() && (game.multi ?? 0) >= 0) {
                const duration = 10 - uhunger_div_by_10;

                /* stop what you're doing, then faint */
                await stop_occupation();
                await You('faint from lack of food.');
                /* incr_itimeout(&HDeaf, duration) and afternmv=unfaint need
                   the deafness timer and the faint callback */
                note_unported_eat('newuhs:faint_machinery');
                (game.disp ||= {}).botl = true;
                nomul(-duration);
                game.multi_reason = 'fainted from lack of food';
                game.nomovemsg = 'You regain consciousness.';
                newhs2 = FAINTED;
            }
        } else if (game.u.uhunger
                   < -(100 + 10 * Number(ACURR(A_CON)))) {
            game.u.uhs = STARVED;
            (game.disp ||= {}).botl = true;
            await bot();
            await You('die from starvation.');
            game.killer = { format: KILLED_BY, name: 'starvation' };
            await done(STARVING);
            /* if we return, we lifesaved, and that calls newuhs */
            return;
        }
    }

    if (newhs2 !== game.u.uhs) {
        if (newhs2 >= WEAK && game.u.uhs < WEAK) {
            /* temporary Str loss overrides Fixed_abil */
            game.u.atemp.a[A_STR] = -1;
        } else if (newhs2 < WEAK && game.u.uhs >= WEAK) {
            game.u.atemp.a[A_STR] = 0;
        }

        switch (newhs2) {
        case HUNGRY:
            if (Hallucination()) {
                await You(!incr ? 'now have a lesser case of the munchies.'
                                : 'are getting the munchies.');
            } else
                await You(`${!incr ? 'only feel hungry now'
                           : (game.u.uhunger < 145) ? 'feel hungry'
                             : 'are beginning to feel hungry'}.`);
            if (incr && game.occupation
                && (game.occupation !== eatfood
                    && game.occupation !== opentin))
                await stop_occupation();
            end_running(true);
            break;
        case WEAK:
            if (Hallucination())
                await pline(!incr ? 'You still have the munchies.'
                    : 'The munchies are interfering with your motor '
                      + 'capabilities.');
            else if (incr && (game.urole?.name?.m === 'Wizard'
                              || Race_if(PMNAMES.PM_ELF)
                              || game.urole?.name?.m === 'Valkyrie'))
                await pline(`${(game.urole?.name?.m === 'Wizard'
                                || game.urole?.name?.m === 'Valkyrie')
                               ? game.urole.name.m : 'Elf'}`
                            + ' needs food, badly!');
            else
                await You(`${!incr ? 'are still'
                           : (game.u.uhunger < 45) ? 'feel'
                             : 'are beginning to feel'} weak.`);
            if (incr && game.occupation
                && (game.occupation !== eatfood
                    && game.occupation !== opentin))
                await stop_occupation();
            end_running(true);
            break;
        }
        game.u.uhs = newhs2;
        (game.disp ||= {}).botl = true;
        await bot();
        if (game.u.uhp < 1) {
            await You('die from hunger and exhaustion.');
            game.killer = { format: KILLED_BY, name: 'exhaustion' };
            await done(STARVING);
            return;
        }
    }
}

// src/eat.c maybe_finished_meal() — finish a meal that consume_oeaten has
// already exhausted, rather than reporting it as interrupted.
//
// stop_occupation calls this FIRST and only prints "You stop <occtxt>." when it
// returns FALSE, so omitting it both leaves the food half-eaten and prints a
// message C does not.
//
// `stopping` clears the occupation BEFORE eatfood() runs, which the C notes is
// "for do_reset_eat" -- eatfood checks the occupation, so leaving it set makes
// the meal look still-in-progress to its own callback.
export async function maybe_finished_meal(stopping) {
    const v = game.context?.victual;

    if (game.occupation === eatfood && v && v.usedtime >= v.reqtime) {
        if (stopping)
            game.occupation = null;     /* for do_reset_eat */
        await eatfood();                /* calls done_eating to use the food up */
        return true;
    }
    return false;
}

// src/eat.c morehungry() — spend nutrition and re-evaluate the hunger state.
// newuhs() can draw through its fainting arm, so this is not bookkeeping.
export async function morehungry(num) {
    game.u.uhunger -= num;
    await newuhs(true);
}

// src/eat.c recalc_wt() — the piece being eaten gets lighter.
//
// Three lines of substance: owt is recomputed from weight() as the meal is
// consumed. C's impossible() on a missing piece is a programming-error
// report, not a game event, so it is recorded rather than made to throw.
export function recalc_wt() {
    const piece = game.context.victual?.piece;

    if (!piece) {
        note_unported_eat('recalc_wt:impossible');
        return;
    }
    piece.owt = weight(piece);
}

// src/eat.c adj_victual_nutrition() — race-adjusted nutrition for the two
// foods that care.
//
// Called ONLY when nmod is negative, which is why the first thing it does is
// negate it; C says so in a comment and asserts nut > 0.
//
// Elves get a quarter more from a lembas wafer and orcs a quarter less
// (800 -> 1000 or 600); dwarves get a sixth more from a cram ration
// (600 -> 700). The roundings differ -- (nut+2)/4 twice, (nut+3)/6 once --
// and are C's, not a uniform formula.
//
// maybe_polyd checks the POLYFORM first and the race second, so a
// polymorphed hero is judged by what it currently is. That is recorded;
// polyform is not modelled, so the race test alone decides here.
export function adj_victual_nutrition() {
    const otyp = game.context.victual.piece.otyp;
    /* only called when nmod is negative; convert to positive */
    let nut = -game.context.victual.nmod;

    if (otyp === ONAMES.LEMBAS_WAFER) {
        note_unported_eat('adj_victual_nutrition:maybe_polyd');
        if (Race_if(PMNAMES.PM_ELF))
            nut += Math.trunc((nut + 2) / 4);       /* 800 -> 1000 */
        else if (Race_if(PMNAMES.PM_ORC))
            nut -= Math.trunc((nut + 2) / 4);       /* 800 -> 600 */
    } else if (otyp === ONAMES.CRAM_RATION) {
        note_unported_eat('adj_victual_nutrition:maybe_polyd');
        if (Race_if(PMNAMES.PM_DWARF))
            nut += Math.trunc((nut + 3) / 6);       /* 600 -> 700 */
    }
    return Math.max(nut, 1);
}

// src/eat.c lesshungry() — add nutrition, then react to the new total.
//
// The two thresholds are 2000 (choke) and 1500 (the "hard time getting all
// of it down" warning), and the 1500 arm exists so that EVERY eating path
// warns before the 2000 one kills you -- C says so in a comment.
//
// iseating is (occupation == eatfood) || force_save_hs, and it decides which
// choke() argument is used and whether reset_eat() follows. The force_save_hs
// half is why recalc_wt's caller sets it around the nutrition update.
//
// newuhs(FALSE) runs unconditionally at the end: the hunger STATE is
// recomputed whether or not anything was said.
//
// reset_eat and paranoid_query are not ported and are recorded; the messages
// need nomovemsg/multi plumbing and are recorded too.
export async function lesshungry(num) {
    /* see comments in newuhs() for discussion on force_save_hs */
    const iseating = (game.occupation === eatfood) || game.force_save_hs;

    game.u.uhunger += num;
    if (game.u.uhunger >= 2000) {
        if (!iseating || game.context.victual?.canchoke) {
            if (iseating) {
                choke(game.context.victual.piece);
                note_unported_eat('lesshungry:reset_eat');
            } else {
                choke(null);        /* opentin's tin is not modelled */
                /* no reset_eat() */
            }
        }
    } else {
        /* report when nearly full so all eating warns before choking */
        if (game.u.uhunger >= 1500 && !game.u.uprops?.HUNGER
            && (!game.context.victual?.eating
                || !game.context.victual?.fullwarn)) {
            note_unported_eat('lesshungry:hard_time_msg');
            if (!game.context.victual?.eating) {
                note_unported_eat('lesshungry:multi');
            } else {
                if (game.context.victual.canchoke
                    && (game.context.victual.reqtime
                        - game.context.victual.usedtime) > 1)
                    note_unported_eat('lesshungry:paranoid_query');
            }
        }
    }
    await newuhs(false);
}

// src/eat.c consume_oeaten() — reduce a partly-eaten object's remaining food.
//
// A POSITIVE amt is a BIT SHIFT, not a subtraction: oeaten >>= amt halves the
// remainder amt times. A negative amt is the plain decrement, and because the
// value is already negative it is ADDED. Reading the sign as "how much to
// remove" and subtracting in both cases is wrong in the common case.
//
// THE CLAMP AT THE END IS THE POINT, and C spends fourteen lines explaining
// it: oeaten must never reach 0, because the object is not removed from
// inventory until the "you finish eating" message on the NEXT turn, and a
// zero oeaten reads as UNTOUCHED. That produced unexpected encumbrance
// messages at the end of a meal and full nutrition from an interrupted one.
// C also notes oeaten is unsigned there, so an over-subtraction wraps to a
// huge positive -- the reported cause of massively heavy food and unlimited
// satiation. Setting reqtime = usedtime is what actually ends the meal.
export function consume_oeaten(obj, amt) {
    if (amt > 0) {
        /* bit shift to divide the remaining amount of food */
        obj.oeaten >>= amt;
    } else {
        /* simple decrement; value is negative so we actually add it */
        if (obj.oeaten > -amt)
            obj.oeaten += amt;
        else
            obj.oeaten = 0;
    }

    /* mustn't let partly-eaten drop all the way to 0 or the item would be
       restored to untouched; set to no bites left */
    if (obj.oeaten === 0) {
        if (obj === game.context.victual?.piece)  /* true unless wishing */
            game.context.victual.reqtime = game.context.victual.usedtime;
        obj.oeaten = 1;         /* smallest possible positive value */
    }
}

/* ---- corpse after-effects: src/eat.c:881-1330 ---- */

/* include/monflag.h:62 MR_* conveyance bits */
const MR_FIRE = 0x01, MR_COLD = 0x02, MR_SLEEP = 0x04, MR_DISINT = 0x08,
      MR_ELEC = 0x10, MR_POISON = 0x20, MR_ACID = 0x40, MR_STONE = 0x80;

// src/eat.c:890 intrinsic_possible() — can this species convey `type`?
export function intrinsic_possible(type, ptr) {
    switch (type) {
    case FIRE_RES:   return (ptr.mconveys & MR_FIRE) !== 0;
    case SLEEP_RES:  return (ptr.mconveys & MR_SLEEP) !== 0;
    case COLD_RES:   return (ptr.mconveys & MR_COLD) !== 0;
    case DISINT_RES: return (ptr.mconveys & MR_DISINT) !== 0;
    case SHOCK_RES:  return (ptr.mconveys & MR_ELEC) !== 0;
    case POISON_RES: return (ptr.mconveys & MR_POISON) !== 0;
    case ACID_RES:   return (ptr.mconveys & MR_ACID) !== 0;
    case STONE_RES:  return (ptr.mconveys & MR_STONE) !== 0;
    case TELEPORT:   return (ptr.mflags1 & MFLAGS_EAT.M1_TPORT) !== 0;
    case TELEPORT_CONTROL:
        return (ptr.mflags1 & MFLAGS_EAT.M1_TPORT_CNTRL) !== 0;
    case TELEPAT:
        /* include/mondata.h:84 telepathic(): three specific species */
        return ptr === game.mons[PMNAMES.PM_FLOATING_EYE]
               || ptr === game.mons[PMNAMES.PM_MIND_FLAYER]
               || ptr === game.mons[PMNAMES.PM_MASTER_MIND_FLAYER];
    default:         return false;
    }
}

// src/eat.c:960 should_givit() — level check against per-type chance.
function should_givit(type, ptr) {
    let chance;
    switch (type) {
    case POISON_RES:
        if ((ptr === game.mons[PMNAMES.PM_KILLER_BEE]
             || ptr === game.mons[PMNAMES.PM_SCORPION]) && !rn2(4))
            chance = 1;
        else
            chance = 15;
        break;
    case TELEPORT:         chance = 10; break;
    case TELEPORT_CONTROL: chance = 12; break;
    case TELEPAT:          chance = 1;  break;
    default:               chance = 15; break;
    }
    return ptr.mlevel > rn2(chance);
}

// src/eat.c:996 temp_givit() — stoning/acid resistance is only temporary.
function temp_givit(type, ptr) {
    const chance = (type === STONE_RES) ? 6 : (type === ACID_RES) ? 3 : 0;
    return chance ? (ptr.mlevel > rn2(chance)) : false;
}

// src/eat.c:1005 givit() — try to give an intrinsic.
async function givit(type, ptr) {
    if (!should_givit(type, ptr) && !temp_givit(type, ptr))
        return;

    const intr = (game.u.intrinsic ||= {});
    switch (type) {
    case FIRE_RES:
        if (!((intr.HFire_resistance | 0) & FROMOUTSIDE)) {
            await You(Hallucination() ? 'be chillin\'.'
                                      : 'feel a momentary chill.');
            intr.HFire_resistance = (intr.HFire_resistance | 0) | FROMOUTSIDE;
        }
        break;
    case SLEEP_RES:
        if (!((intr.HSleep_resistance | 0) & FROMOUTSIDE)) {
            await You_feel('wide awake.');
            intr.HSleep_resistance = (intr.HSleep_resistance | 0) | FROMOUTSIDE;
        }
        break;
    case COLD_RES:
        if (!((intr.HCold_resistance | 0) & FROMOUTSIDE)) {
            await You_feel('full of hot air.');
            intr.HCold_resistance = (intr.HCold_resistance | 0) | FROMOUTSIDE;
        }
        break;
    case DISINT_RES:
        if (!((intr.HDisint_resistance | 0) & FROMOUTSIDE)) {
            await You_feel(Hallucination() ? 'totally together, man.'
                                           : 'very firm.');
            intr.HDisint_resistance = (intr.HDisint_resistance | 0) | FROMOUTSIDE;
        }
        break;
    case SHOCK_RES:
        if (!((intr.HShock_resistance | 0) & FROMOUTSIDE)) {
            if (Hallucination())
                await You_feel('grounded in reality.');
            else
                await Your('health currently feels amplified!');
            intr.HShock_resistance = (intr.HShock_resistance | 0) | FROMOUTSIDE;
        }
        break;
    case POISON_RES:
        if (!((intr.HPoison_resistance | 0) & FROMOUTSIDE)) {
            await You_feel(game.u.uprops?.POISON_RES
                           ? 'especially healthy.' : 'healthy.');
            intr.HPoison_resistance = (intr.HPoison_resistance | 0) | FROMOUTSIDE;
        }
        break;
    case TELEPORT:
        if (!((intr.HTeleportation | 0) & FROMOUTSIDE)) {
            await You_feel(Hallucination() ? 'diffuse.' : 'very jumpy.');
            intr.HTeleportation = (intr.HTeleportation | 0) | FROMOUTSIDE;
        }
        break;
    case TELEPORT_CONTROL:
        if (!((intr.HTeleport_control | 0) & FROMOUTSIDE)) {
            await You_feel(Hallucination() ? 'centered in your personal space.'
                                           : 'in control of yourself.');
            intr.HTeleport_control = (intr.HTeleport_control | 0) | FROMOUTSIDE;
        }
        break;
    case TELEPAT:
        if (!((intr.HTelepat | 0) & FROMOUTSIDE)) {
            await You_feel(Hallucination()
                           ? 'in touch with the cosmos.'
                           : 'a strange mental acuity.');
            intr.HTelepat = (intr.HTelepat | 0) | FROMOUTSIDE;
            /* update screen to reflect new status */
            note_unported_eat('givit:telepat_see_monsters');
        }
        break;
    case STONE_RES:
        if (!game.u.uprops?.STONE_RES) {
            await You_feel(Hallucination() ? 'unusually limber'
                           : 'less concerned about becoming petrified');
            note_unported_eat('givit:timed_stone_res');
        }
        break;
    default:
        break;
    }
}

// src/eat.c:1103 eye_of_newt_buzz() — small magical energy boost.
async function eye_of_newt_buzz() {
    const u = game.u;
    if (rn2(3) || 3 * u.uen <= 2 * u.uenmax) {
        const old_uen = u.uen;
        u.uen += rnd(3);
        if (u.uen > u.uenmax) {
            if (!rn2(3)) {
                u.uenmax++;
                if (u.uenmax > (u.uenpeak | 0))
                    u.uenpeak = u.uenmax;
            }
            u.uen = u.uenmax;
        }
        if (old_uen !== u.uen) {
            await You_feel('a mild buzz.');
            (game.disp ||= {}).botl = true;
        }
    }
}

// src/eat.c:1339 corpse_intrinsic() — reservoir-pick one conveyable
// intrinsic; -1 is the fake index for giant strength.
function corpse_intrinsic(ptr) {
    const conveys_STR = (ptr.mflags2 & MFLAGS_EAT.M2_GIANT) !== 0;
    let count = 0;
    let prop = 0;

    if (conveys_STR) {
        count = 1;
        prop = -1; /* use -1 as fake prop index for STR */
    }
    for (let i = 1; i <= LAST_PROP; i++) {
        if (!intrinsic_possible(i, ptr))
            continue;
        ++count;
        if (!rn2(count))
            prop = i;
    }
    /* if strength is the only candidate, give it 50% chance */
    if (conveys_STR && count === 1 && !rn2(2))
        prop = 0;

    return prop;
}

// src/eat.c:1129 cpostfx() — called after completely consuming a corpse.
async function cpostfx(pm) {
    let check_intrinsics = false;
    const ptr = game.mons[pm];
    if (!ptr)
        return;

    switch (pm) {
    case PMNAMES.PM_WRAITH:
    case PMNAMES.PM_HUMAN_WERERAT:
    case PMNAMES.PM_HUMAN_WEREJACKAL:
    case PMNAMES.PM_HUMAN_WEREWOLF:
    case PMNAMES.PM_NURSE:
    case PMNAMES.PM_STALKER:
    case PMNAMES.PM_YELLOW_LIGHT:
    case PMNAMES.PM_GIANT_BAT:
    case PMNAMES.PM_BAT:
    case PMNAMES.PM_GIANT_MIMIC:
    case PMNAMES.PM_LARGE_MIMIC:
    case PMNAMES.PM_SMALL_MIMIC:
    case PMNAMES.PM_QUANTUM_MECHANIC:
    case PMNAMES.PM_LIZARD:
    case PMNAMES.PM_CHAMELEON:
    case PMNAMES.PM_DOPPELGANGER:
    case PMNAMES.PM_GENETIC_ENGINEER:
    case PMNAMES.PM_DISPLACER_BEAST:
    case PMNAMES.PM_DISENCHANTER:
    case PMNAMES.PM_MIND_FLAYER:
    case PMNAMES.PM_MASTER_MIND_FLAYER:
        /* the named special arms carry their own machinery (pluslvl,
           lycanthropy, polyself, stun timers); each records until its
           subsystem lands */
        note_unported_eat(`cpostfx:pm=${pm}`);
        return;
    case PMNAMES.PM_DEATH:
    case PMNAMES.PM_PESTILENCE:
    case PMNAMES.PM_FAMINE:
        /* life-saved; don't attempt to confer any intrinsics */
        return;
    default:
        check_intrinsics = true;
        break;
    }

    /* possibly convey an intrinsic */
    if (check_intrinsics) {
        if (dmgtype(ptr, ATTKS.AD_STUN) || dmgtype(ptr, ATTKS.AD_HALU)
            || pm === PMNAMES.PM_VIOLET_FUNGUS) {
            await pline('Oh wow!  Great stuff!');
            /* make_hallucinated((HHallucination & TIMEOUT) + 200) */
            note_unported_eat('cpostfx:hallu_timer');
        }

        /* Eating magical monsters can give you some magical energy. */
        if (attacktype(ptr, ATTKS.AT_MAGC) || pm === PMNAMES.PM_NEWT)
            await eye_of_newt_buzz();

        const tmp = corpse_intrinsic(ptr);

        if (tmp === -1) {
            /* gainstr(NULL, 0, TRUE): giant strength */
            note_unported_eat('cpostfx:gainstr');
        } else if (tmp > 0) {
            await givit(tmp, ptr);
        }
    }
}
