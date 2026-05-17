// hold_another_hero.js — invent.c hold_another_object + ball.c litter + mthrowu.c catch + ball.c drag_down.
// C ref: invent.c hold_another_object(); ball.c litter() / drag_down(); mthrowu.c ucatchgem / u_catch_thrown_obj;
//        → dothrow.c hitfloor(obj, FALSE).
//
// Omits **`observe_object`**, **`touch_artifact`** / crysknife / **`Upolyd`** revert, corpse **`wishedfor`** /
// **`u_safe_from_fatal_corpse`**, **`autoquiver`**, **`splitobj`** merge undo, **`prinv`/`xprname`**,
// full **`canletgo`** (welded uwep, bimanual), **`setnotworn`** side effects beyond **`remove_worn_item`** subset,
// **`cls()`**, **`Soundeffect`**, **`welded(uball)`**, **`ballrelease`**, full **`is_unicorn`/`likes_gems`**, **`makeknown`**,

import { pline } from './display.js';
import { doname } from './objnam.js';
import { nh5HeroObjectClass, removeObjFromHeroInvent } from './water_damage.js';
import { dropxHeroAfterFreeinvLikeC, dropyHeroAtFeetLikeC, hitfloorHeroLikeC } from './hitfloor_hero.js';
import { canReachFloor } from './engrave.js';
import { updateInventory } from './invent.js';
import { encumberMsg } from './pickup.js';
import { rnd, rn2 } from './rng.js';
import {
    calcCapacityXtraWtLikeC,
    nearCapacity,
    syncHeroInvWeightNetLikeC,
} from './encumbr.js';
import {
    MOD_ENCUMBER,
    SLT_ENCUMBER,
    W_ACCESSORY,
    W_ARMOR,
    W_SADDLE,
    A_DEX,
    A_STR,
} from './const.js';
import { NH5_COIN_CLASS, NH5_GEM_CLASS } from './nh5_objclass.js';
import { removeWornItemHeroShipObjectLikeC } from './remove_worn_item_hero.js';
import { raceptr } from './mondata.js';
import { exercise } from './attrib.js';
import { freehandHeroLikeC, nohandsPermonstLikeC } from './hero_hands.js';

/** C: hack.h **`invlet_basic`** (52). */
const INVLET_BASIC = 52;

/** C: objects.h **`LOADSTONE`**. */
const OTYP_LOADSTONE = 471;
/** C: objects.h **`LEASH`**. */
const OTYP_LEASH = 237;

/** C: objects.h worthless glass gem range (**`FIRST_GLASS_GEM`…`LAST_GLASS_GEM`**). */
const OTYP_FIRST_GLASS_GEM = 461;
const OTYP_LAST_GLASS_GEM = 469;

/** C: obj.h **`LIQUID`** — venom-ish missiles (**`VENOM_CLASS`** subset). */
const OC_MATERIAL_LIQUID_VENOM = 1;

/**
 * C: hack.c **`inv_cnt(boolean incl_gold)`** — JS uses **`oclass`** coin vs C **`invlet != GOLD_SYM`**.
 * @param {import('./gstate.js').game} g
 * @param {boolean} inclGold
 */
export function invCntHeroLikeC(g, inclGold) {
    let ct = 0;
    for (let o = g.invent; o; o = o.nobj) {
        if (inclGold || (o.oclass | 0) !== NH5_COIN_CLASS) ct++;
    }
    return ct;
}

/** C: **`flag.h`** **`pickup_burden`** default stressed (**`MOD_ENCUMBER`**). */
function pickupBurdenHeroLikeC(g) {
    const p = g.iflags?.pickup_burden;
    return p != null && p !== undefined ? p | 0 : MOD_ENCUMBER;
}

function prependHeroInventLikeC(g, obj) {
    obj.nobj = g.invent ?? null;
    g.invent = obj;
}

/**
 * C: **`do.c`** **`canletgo(struct obj *obj, const char *word)`** — subset (**`word`** non-empty
 * plines mostly omitted until **`Norep`** / body parts ported).
 * @param {import('./gstate.js').game} g
 * @param {*} obj
 * @param {string} word
 */
export function canletgoHeroLikeC(g, obj, word) {
    void word;
    const wm = obj.owornmask | 0;
    if (wm & (W_ARMOR | W_ACCESSORY)) return false;
    /* C: **`uwep` + `welded`** — not ported; no extra block */
    if ((obj.otyp | 0) === OTYP_LOADSTONE && (obj.cursed | 0)) return false;
    if ((obj.otyp | 0) === OTYP_LEASH && (obj.leashmon | 0)) return false;
    if (wm & W_SADDLE) return false;
    return true;
}

function formatDropFmtLikeC(fmt, arg) {
    if (!fmt) return '';
    if (arg != null && arg !== '' && fmt.includes('%s')) return fmt.replace('%s', String(arg));
    return String(fmt);
}

/**
 * C: **`invent.c`** **`hold_another_object`** **`drop_it`** (**`dropx`** vs **`freeinv`+`hitfloor`**).
 * @param {import('./gstate.js').game} g
 * @param {*} obj — must **not** already be in **`g.invent`** (caller **`obj_extract_self`**’s first).
 * @param {string|null|undefined} dropFmt
 * @param {string|null|undefined} dropArg
 */
async function dropItHoldAnotherLikeC(g, obj, dropFmt, dropArg) {
    if (dropFmt) await pline(formatDropFmtLikeC(dropFmt, dropArg));
    obj.nomerge = 0;
    const u = g.u;
    const swallow = (u?.uswallow | 0) !== 0;
    if (canReachFloor(false) || swallow) {
        removeObjFromHeroInvent(g, obj);
        syncHeroInvWeightNetLikeC(g);
        await dropxHeroAfterFreeinvLikeC(g, obj);
    } else {
        removeObjFromHeroInvent(g, obj);
        syncHeroInvWeightNetLikeC(g);
        await hitfloorHeroLikeC(g, obj, false);
    }
}

/**
 * C: **`invent.c`** **`hold_another_object()`** — fumble / slot / encumbrance vs **`pickup_burden`**;
 * **`drop_it`** → **`dropx`** or **`hitfloor(FALSE)`**.
 * @param {import('./gstate.js').game} g
 * @param {*} obj — not yet in hero invent
 * @param {string|null|undefined} dropFmt
 * @param {string|null|undefined} dropArg
 * @param {string|null|undefined} holdMsg
 * @returns {Promise<*>} **`obj`** if held, **`null`** if dropped (**`drop_it`**)
 */
export async function holdAnotherObjectHeroLikeC(g, obj, dropFmt, dropArg, holdMsg) {
    if (!g?.u || !obj) return null;

    let dropArgUse = dropArg;
    if (dropArgUse) dropArgUse = String(dropArgUse);

    if ((g.u.Fumbling | 0) !== 0) {
        obj.nomerge = 1;
        prependHeroInventLikeC(g, obj);
        syncHeroInvWeightNetLikeC(g);
        await dropItHoldAnotherLikeC(g, obj, dropFmt, dropArgUse);
        return null;
    }

    const wc = g.u.weight_cap | 0;
    if (wc > 1) syncHeroInvWeightNetLikeC(g);
    const prevEnc = Math.max(
        wc > 1 ? calcCapacityXtraWtLikeC(g, 0) : nearCapacity(g),
        pickupBurdenHeroLikeC(g),
    );

    prependHeroInventLikeC(g, obj);
    syncHeroInvWeightNetLikeC(g);

    const tooMany = invCntHeroLikeC(g, false) > INVLET_BASIC;
    const loadstoneCursed = (obj.otyp | 0) === OTYP_LOADSTONE && (obj.cursed | 0) !== 0;
    const encWorse =
        !loadstoneCursed
        && wc > 1
        && calcCapacityXtraWtLikeC(g, 0) > prevEnc;

    if (tooMany || encWorse) {
        await dropItHoldAnotherLikeC(g, obj, dropFmt, dropArgUse);
        return null;
    }

    obj.nomerge = 0;
    if (holdMsg || dropFmt) {
        const p = holdMsg ? (String(holdMsg).endsWith(':') ? `${holdMsg} ` : `${holdMsg} `) : '';
        await pline(`${p}${doname(obj, g)}`);
    }
    updateInventory();
    syncHeroInvWeightNetLikeC(g);
    await encumberMsg();
    return obj;
}

/**
 * C: **`ball.c`** **`litter()`** — iron ball drag: random inventory loss → **`hitfloor(obj, FALSE)`**.
 * Call only when **`drag_down`**-style context already decided (**`rnd(capacity) <= owt`**, **`canletgo`**).
 * @param {import('./gstate.js').game} g
 */
export async function litterHeroBallChainDragDownLikeC(g) {
    const u = g?.u;
    if (!u) return;
    const uball = g.uball;
    const cap = Math.max(1, u.weight_cap | 0);
    /** @type {unknown[]} */
    const objs = [];
    for (let o = g.invent; o; o = o.nobj) objs.push(o);
    for (const otmp of objs) {
        if (!otmp || otmp === uball) continue;
        if (rnd(cap) > (otmp.owt | 0)) continue;
        if (!canletgoHeroLikeC(g, otmp, '')) continue;
        const q = otmp.quan | 0;
        const subj = q === 1 ? 'it' : 'they';
        const v = q === 1 ? 'falls' : 'fall';
        await pline(`You drop ${doname(otmp, g)} and ${subj} ${v} down the stairs with you.`);
        removeWornItemHeroShipObjectLikeC(g, otmp, false);
        removeObjFromHeroInvent(g, otmp);
        syncHeroInvWeightNetLikeC(g);
        await hitfloorHeroLikeC(g, otmp, false);
    }
}

function heroCarriedObjInInventLikeC(g, obj) {
    if (!obj) return false;
    for (let o = g.invent; o; o = o.nobj) {
        if (o === obj) return true;
    }
    return false;
}

function heroBlindLikeC(g) {
    const u = g.u;
    return !!(u?.ublind || (u?.timed?.blind ?? 0) > 0);
}

/** C: **`xname`** / **`simpleonames`** stand-in for catch plines. */
function simpleonamesHeroLikeC(obj, g) {
    const d = doname(obj, g);
    return d
        .replace(/^a /i, '')
        .replace(/^an /i, '')
        .replace(/^the /i, '')
        .replace(/^A /, '')
        .replace(/^An /, '')
        .replace(/^The /, '');
}

function monNamHeroLikeC(mon) {
    return mon?.monnam || mon?.data?.mname || 'monster';
}

/** C: **`obj.h`** **`s_suffix`** for **`mon_nam`** possessive. */
function monPossessiveNamHeroLikeC(mon) {
    const n = monNamHeroLikeC(mon);
    return n.endsWith('s') ? `${n}'` : `${n}'s`;
}

/**
 * C: **`mondata.h`** **`is_unicorn`** (**`mlet == S_UNICORN` && `likes_gems`**) — **`likes_gems`** stubbed as poly with unicorn in **`mname`**.
 * @param {import('./gstate.js').game} g
 */
export function isHeroUnicornPolyLikeC(g) {
    if (!(g.u?.Upolyd | 0)) return false;
    const nm = (raceptr(g.youmonst)?.mname || '').toLowerCase();
    return nm.includes('unicorn');
}

/**
 * C: **`mthrowu.c`** **`ucatchgem()`** — unicorn poly + **`GEM_CLASS`**; worthless glass → **`dropy`**;
 * else **`hold_another_object`**.
 * @param {import('./gstate.js').game} g
 * @param {*} gem
 * @param {*} mon
 */
export async function ucatchgemHeroLikeC(g, gem, mon) {
    if (!g?.u || !gem || !mon) return false;
    if ((nh5HeroObjectClass(gem) | 0) !== NH5_GEM_CLASS) return false;
    if (!isHeroUnicornPolyLikeC(g)) return false;
    const t = gem.otyp | 0;
    if (t > OTYP_LAST_GLASS_GEM) return false;

    const gemXname = simpleonamesHeroLikeC(gem, g);
    const monPoss = monPossessiveNamHeroLikeC(mon);

    if (t >= OTYP_FIRST_GLASS_GEM) {
        await pline(`You catch the ${gemXname}.`);
        await pline(`You are not interested in ${monPoss} junk.`);
        gem.known = 1;
        await dropyHeroAtFeetLikeC(g, gem);
    } else {
        await pline(`You accept ${monPoss} gift in the spirit in which it was intended.`);
        await holdAnotherObjectHeroLikeC(g, gem, 'You catch, but drop, %s.', gemXname, 'You catch:');
    }
    return true;
}

/**
 * C: **`mthrowu.c`** **`u_catch_thrown_obj()`** — dex / monk+rogue / blind / conf / stun / fumble / venom /
 * hands / **`freehand`** / **`calc_capacity(owt)`** / **`rn2(catch_chance)`**.
 * @param {import('./gstate.js').game} g
 * @param {*} otmp
 */
export async function uCatchThrownObjHeroLikeC(g, otmp) {
    const u = g?.u;
    if (!u || !otmp) return false;
    if (heroBlindLikeC(g)) return false;
    if ((u.Confusion | 0) !== 0) return false;
    if ((u.Stunned | 0) !== 0) return false;
    if ((u.Fumbling | 0) !== 0) return false;
    if ((otmp.oc_material | 0) === OC_MATERIAL_LIQUID_VENOM) return false;
    const ptr = raceptr(g.youmonst);
    if (nohandsPermonstLikeC(ptr) || !freehandHeroLikeC(g)) return false;

    let catchChance = 100 - ((u.acurr?.a?.[A_DEX] ?? 10) | 0);
    const abbr = g.urole?.abbr;
    if (abbr === 'Mon' || abbr === 'Rog') catchChance -= 20;

    if (calcCapacityXtraWtLikeC(g, otmp.owt | 0) > SLT_ENCUMBER) return false;
    if (rn2(Math.max(1, catchChance))) return false;

    const buf = `You catch the ${simpleonamesHeroLikeC(otmp, g)}!`;
    await holdAnotherObjectHeroLikeC(g, otmp, 'You catch, but drop, the %s.', simpleonamesHeroLikeC(otmp, g), buf);
    return true;
}

/**
 * C: **`mthrowu.c`** hero-at-**`u_at`** branch — **`ucatchgem`** then **`u_catch_thrown_obj`** (**`!tethered_weapon`**).
 * @param {import('./gstate.js').game} g
 * @param {*} mon
 * @param {*} otmp
 * @param {boolean} tetheredWeapon
 */
export async function tryHeroCatchMonsterThrownObjLikeC(g, mon, otmp, tetheredWeapon) {
    if (!g?.u || !otmp || tetheredWeapon) return false;
    if (mon && (await ucatchgemHeroLikeC(g, otmp, mon))) return true;
    if (await uCatchThrownObjHeroLikeC(g, otmp)) return true;
    return false;
}

function dragLosehpHeroLikeC(g, n) {
    const u = g.u;
    if (!u) return;
    let k = Math.max(0, n | 0);
    if (u.Half_physical_damage | 0) k = Math.trunc((k + 1) / 2);
    u.uhp = Math.max(0, (u.uhp | 0) - k);
    g.disp = g.disp || {};
    g.disp.botl = true;
}

/**
 * C: **`ball.c`** **`drag_down()`** — iron ball on stairs tumble (**`forward`**, **`rn2`**, **`losehp`**, **`litter`**).
 * Call from **`do.c`** **`goto_level`** stairs-down tumble when **`Punished`**, or **`goto_level_hero.js`** **`applyHeroDescendStairsOneLevelLikeC`** (**caller** gates **`cls`/`u.dz`**).
 * Omits **`cls`**, **`Soundeffect`**, **`welded`** grip skip, **`ballrelease`**.
 * @param {import('./gstate.js').game} g
 */
export async function dragDownHeroStairsLikeC(g) {
    const u = g?.u;
    const uball = g?.uball;
    if (!u || !uball) return;
    if (!heroCarriedObjInInventLikeC(g, uball)) return;

    const weldedBall = false; /* C: **`welded(uball)`** — not ported */
    if (!weldedBall) await pline('You lose your grip on the iron ball.');

    const uwep = u.uwep ?? null;
    const forward = uwep === uball || !uwep || !rn2(3);

    if (forward) {
        if (rn2(6)) {
            await pline('The iron ball drags you downstairs!');
            dragLosehpHeroLikeC(g, rnd(6));
            await litterHeroBallChainDragDownLikeC(g);
        }
    } else {
        let dragchance = 3;
        if (rn2(2)) {
            await pline('The iron ball smacks into you!');
            dragLosehpHeroLikeC(g, rnd(20));
            exercise(A_STR, false);
            dragchance -= 2;
        }
        if (dragchance >= rnd(6)) {
            await pline('The iron ball drags you downstairs!');
            dragLosehpHeroLikeC(g, rnd(3));
            exercise(A_STR, false);
            await litterHeroBallChainDragDownLikeC(g);
        }
    }
}
