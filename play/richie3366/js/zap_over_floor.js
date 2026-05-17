// zap_over_floor.js — Floor tile effects from zaps / breath / wand explosions (subset).
// C ref: zap.c zap_over_floor(), zaptype(); monattk.h AD_* → ZT_* in zap.c preamble;
//        zap.c buzz()/bhit() — beam **`range += zap_over_floor(...)`** stepping (subset).
//        detect.c cvt_sdoor_to_door — secret-door reveal before **`closed_door`**;
//        buzz()/bhit() tail — **`if (shopdamage) pay_for_damage(...)`** once per beam.
import {
    PHYS_EXPL_TYPE, BOLT_LIM, isok, DOOR, SDOOR, D_NODOOR, D_BROKEN, D_CLOSED, D_LOCKED,
    WM_MASK, Is_rogue_level,
} from './const.js';
import { cansee, couldsee } from './vision.js';
import { coldZapHitsWaterAt } from './melt_ice.js';
import { pline, newsym } from './display.js';
import { isClosedDoorLoc } from './walkable.js';
import { floorObjKey } from './floorobj.js';
import { burnFloorObjects } from './burn_floor_objects.js';
import { applyZapShopDoorDamage, payForDamage } from './shop.js';

/** C: objects.h — passed as **`exploding_wand_typ`** for oil/splatter fire (zap.c). */
const OTYP_POT_OIL = 320;
/** C: objects.h — exploding scroll fire (zap.c). */
const OTYP_SCR_FIRE = 338;
/** C: objects.h — exploding wand of striking (zap.c **`def_case`**). */
const OTYP_WAN_STRIKING = 415;

export const ZT_MAGIC_MISSILE = 0;
export const ZT_FIRE = 1;
export const ZT_COLD = 2;
export const ZT_SLEEP = 3;
export const ZT_DEATH = 4;
export const ZT_LIGHTNING = 5;
export const ZT_POISON_GAS = 6;
export const ZT_ACID = 7;

/** C: zap.c ZT_WAND(x) */
export function ZT_WAND(x) {
    return x | 0;
}

/** C: zap.c ZT_SPELL(x) */
export function ZT_SPELL(x) {
    return 10 + (x | 0);
}

/** C: zap.c ZT_BREATH(x) */
export function ZT_BREATH(x) {
    return 20 + (x | 0);
}

/**
 * C: zap.c zaptype(int type) — monster wand zaps −39..−30 normalize before abs().
 * @param {number} type
 * @returns {number}
 */
export function zaptype(type) {
    let t = type | 0;
    if (t <= -30 && t >= -39) t += 30;
    return Math.abs(t);
}

/**
 * C: int damgtype = zaptype(type) % 10;
 * @param {number} type
 * @returns {number}
 */
export function zapDamgtype(type) {
    return zaptype(type) % 10;
}

/**
 * C: zap.c buzz() — **`pay_for_damage`** verb from **`damgtype`** (**`zaptype(type) % 10`**).
 * @param {number} damg
 * @returns {string}
 */
function shopDamageVerbForZapDamg(damg) {
    switch (damg | 0) {
    case ZT_FIRE: return 'burn away';
    case ZT_COLD: return 'shatter';
    case ZT_ACID: return 'damage';
    case ZT_DEATH: return 'disintegrate';
    default: return 'destroy';
    }
}

/**
 * C: detect.c cvt_sdoor_to_door(struct rm *lev)
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} loc
 */
function cvtSdoorToDoor(g, loc) {
    let newmask = (loc.doormask | 0) & ~WM_MASK;
    if (Is_rogue_level(g.u?.uz)) {
        newmask = D_NODOOR;
    } else if (!(newmask & D_LOCKED)) {
        newmask |= D_CLOSED;
    }
    loc.typ = DOOR;
    loc.doormask = newmask;
    if ('arboreal_sdoor' in loc) loc.arboreal_sdoor = 0;
}

/** C: obj.h OBJ_AT — floor object chain at **`(x,y)`**. */
function objAtFloor(g, x, y) {
    const heads = g.level?.floorObjHeads;
    if (!heads) return false;
    return !!(heads.get(floorObjKey(x, y)));
}

function heroBlindForZap(g) {
    const u = g.u;
    return !!(u?.ublind | 0) || (u?.timed?.blind ?? 0) > 0;
}

/** C: mondata.h canseemon(mtmp) — subset for **`zap_over_floor`** (steed / invis / cansee). */
function canseemonZap(g, mtmp) {
    const u = g.u;
    if (!mtmp || !u) return false;
    if (u.usteed === mtmp) return true;
    if ((mtmp.minvis | 0) && !(u.See_invisible | 0)) return false;
    return cansee(mtmp.mx | 0, mtmp.my | 0);
}

function heroDeafForZap(g) {
    return (g.u?.timed?.deaf ?? 0) > 0;
}

/** C: mon.c Monnam — stub until **`x_monnam`** port (matches **`trap.js`** **`monNam`**). */
function monNamZap(mtmp) {
    const n = mtmp?.data?.mname || mtmp?.monnam;
    if (n) return `the ${n}`;
    return 'the monster';
}

function monNamSentenceZap(mtmp) {
    const s = monNamZap(mtmp);
    return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * C: mon.c wake_msg(mtmp, interesting)
 * @param {boolean} interesting — C **`via_attack`** ( **`!`interesting** → sleepy “.” )
 */
async function wakeMsgZap(g, mtmp, interesting) {
    if (!mtmp) return;
    if ((mtmp.msleeping | 0) && canseemonZap(g, mtmp)) {
        const punct = interesting ? '!' : '.';
        await pline(`${monNamSentenceZap(mtmp)} wakes up${punct}`);
    }
}

/** C: sounds.c growl(mtmp) — minimal ( **`canseemon` || !Deaf`** ); no **`wake_nearto`** / hallucination. */
async function growlAfterSleepZap(g, mtmp) {
    if (!mtmp) return;
    if (!canseemonZap(g, mtmp) && heroDeafForZap(g)) return;
    if (canseemonZap(g, mtmp) || !heroDeafForZap(g)) await pline(`${monNamSentenceZap(mtmp)} growls.`);
}

/**
 * C: mon.c wakeup(mtmp, via_attack) — subset for **`zap_over_floor`** (no mimic / **`finish_meating`** /
 * temple / shop pursuit / **`peacefuls_respond`**).
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 * @param {boolean} viaAttack — C **`type >= 0`** (hero-sourced zap)
 */
async function wakeupMonFromZap(g, mtmp, viaAttack) {
    if (!mtmp) return;
    if (mtmp.mhp != null && (mtmp.mhp | 0) <= 0) return;
    const wasSleeping = mtmp.msleeping | 0;
    const wasPeaceful = mtmp.mpeaceful | 0;
    await wakeMsgZap(g, mtmp, viaAttack);
    mtmp.msleeping = 0;
    if (!viaAttack) return;
    if (wasSleeping) await growlAfterSleepZap(g, mtmp);
    /* C: setmangry(mtmp, TRUE) — peaceful clear; shk/priest/guard “gets angry” when **`canseemon`** */
    if (wasPeaceful) {
        mtmp.mpeaceful = 0;
        if (canseemonZap(g, mtmp) && (mtmp.isshk || mtmp.ispriest || mtmp.isgd)) {
            await pline(`${monNamSentenceZap(mtmp)} gets angry!`);
        }
    }
}

/**
 * C: zap.c zap_over_floor(x, y, type, shopdamage, ignoremon, exploding_wand_typ) — JS subset.
 * **`ZT_COLD`** → **`coldZapHitsWaterAt`**; **`SDOOR`** / **`closed_door`** tail (**`rangemod = -1000`**).
 *
 * @param {import('./gstate.js').game} g
 * @param {number} x
 * @param {number} y
 * @param {number} type
 * @param {{ value?: boolean }|null} [_shopdamage] — C **`*shopdamage`** (shop doors via **`applyZapShopDoorDamage`**)
 * @param {boolean} [_ignoremon] — C **`ignoremon`**; false → **`wakeup`** on **`m_at`**
 * @param {number} [_explodingWandTyp]
 * @returns {Promise<number>} rangemod (negative reduces beam range in **C**)
 */
export async function zapOverFloor(g, x, y, type, _shopdamage = null, _ignoremon = true, _explodingWandTyp = 0) {
    if ((type | 0) === PHYS_EXPL_TYPE) return -1000;
    if (!isok(x, y)) return 0;

    const damg = zapDamgtype(type);
    const seeIt = cansee(x, y);

    let rangemod = 0;
    switch (damg) {
    case ZT_COLD:
        rangemod = await coldZapHitsWaterAt(g, x, y, seeIt);
        break;
    default:
        break;
    }

    /* C: zap_over_floor — zapverb / yourzap for SDOOR + door absorb plines */
    let doorExploding = _explodingWandTyp | 0;
    let zapverb = 'blast';
    const yourZap = (type | 0) >= 0 && !(_explodingWandTyp | 0);
    if (!doorExploding) {
        const ztype = zaptype(type);
        if (ztype < ZT_SPELL(0)) zapverb = 'bolt';
        else if (ztype < ZT_BREATH(0)) zapverb = 'spell';
    } else if (doorExploding === OTYP_POT_OIL || doorExploding === OTYP_SCR_FIRE) {
        /* C: POT_OIL / SCR_FIRE — not a real "exploding wand" for door absorb wording (zap.c). */
        doorExploding = 0;
    }

    const loc = g.level?.at(x, y);
    if (!loc) return rangemod;

    /* C: SDOOR → DOOR + newsym + pline / rogue draft */
    if (loc.typ === SDOOR) {
        cvtSdoorToDoor(g, loc);
        g.vision_full_recalc = 1;
        newsym(x, y);
        if (seeIt) {
            const who = yourZap ? 'Your' : 'The';
            await pline(`${who} ${zapverb} reveals a secret door.`);
        } else if (Is_rogue_level(g.u?.uz)) {
            await pline('You feel a draft.');
        }
    }

    /* C: closed_door — overwrites rangemod */
    if (isClosedDoorLoc(loc)) {
        rangemod = -1000;
        let newDoormask = -1;
        let seeTxt = '';
        let senseTxt = '';
        let hearTxt = '';

        switch (damg) {
        case ZT_FIRE:
            newDoormask = D_NODOOR;
            seeTxt = 'The door is consumed in flames!';
            senseTxt = 'You smell smoke.';
            break;
        case ZT_COLD:
            newDoormask = D_NODOOR;
            seeTxt = 'The door freezes and shatters!';
            hearTxt = 'a deep cracking sound.';
            break;
        case ZT_DEATH:
            if (Math.abs(type | 0) !== ZT_BREATH(ZT_DEATH)) {
                if (doorExploding === OTYP_WAN_STRIKING) {
                    newDoormask = D_BROKEN;
                    seeTxt = 'The door crashes open!';
                    senseTxt = 'You feel a burst of cool air.';
                    break;
                }
                /* default absorb (C **`def_case`**) */
                if (doorExploding > 0 && seeIt) {
                    await pline('The door remains intact.');
                } else if (seeIt) {
                    const subj = yourZap ? 'your' : 'the';
                    await pline(`The door absorbs ${subj} ${zapverb}!`);
                } else {
                    await pline('You feel vibrations.');
                }
                break;
            }
            newDoormask = D_NODOOR;
            seeTxt = 'The door disintegrates!';
            hearTxt = 'crashing wood.';
            break;
        case ZT_LIGHTNING:
            newDoormask = D_BROKEN;
            seeTxt = 'The door splinters!';
            hearTxt = 'crackling.';
            break;
        default:
            if (doorExploding === OTYP_WAN_STRIKING) {
                newDoormask = D_BROKEN;
                seeTxt = 'The door crashes open!';
                senseTxt = 'You feel a burst of cool air.';
                break;
            }
            if (doorExploding > 0 && seeIt) {
                await pline('The door remains intact.');
            } else if (seeIt) {
                const subj = yourZap ? 'your' : 'the';
                await pline(`The door absorbs ${subj} ${zapverb}!`);
            } else {
                await pline('You feel vibrations.');
            }
            break;
        }

        if (newDoormask >= 0) {
            applyZapShopDoorDamage(g, x, y, type, _shopdamage);
            loc.doormask = newDoormask;
            g.vision_full_recalc = 1;
            if (seeIt && seeTxt) await pline(seeTxt);
            else if (!seeIt && senseTxt) await pline(senseTxt);
            else if (!seeIt && hearTxt) await pline(`You hear ${hearTxt}`);
            newsym(x, y);
        }
    }

    /* C: OBJ_AT && ZT_FIRE → burn_floor_objects; smoke if **`couldsee`** */
    if (damg === ZT_FIRE && objAtFloor(g, x, y)) {
        const cnt = await burnFloorObjects(g, x, y, false, (type | 0) > 0);
        if (cnt > 0 && couldsee(x, y)) {
            newsym(x, y);
            await pline(heroBlindForZap(g) ? 'You smell a whiff of smoke.' : 'You see a puff of smoke.');
        }
    }

    /* C: !ignoremon → wakeup(m_at, type >= 0) */
    if (!_ignoremon) {
        const mtmp = g.level?.monsters?.find((m) => (m.mx | 0) === x && (m.my | 0) === y) ?? null;
        await wakeupMonFromZap(g, mtmp, (type | 0) >= 0);
    }

    return rangemod;
}

/**
 * C: zap.c buzz()/bhit() — walk **`(dx,dy)`** from **`(x0,y0)`**, each step **`range += zap_over_floor(...)`**.
 * When **`dx`=`dy`=0`**, a single **`zapOverFloor`** at **`(x0,y0)`** (hero self-zap / harness).
 *
 * @param {import('./gstate.js').game} g
 * @param {number} x0
 * @param {number} y0
 * @param {number} dx — −1, 0, or 1
 * @param {number} dy — −1, 0, or 1
 * @param {number} type — e.g. **`ZT_SPELL(ZT_COLD)`**
 * @param {number} [maxRange] — C beam range cap; default **`BOLT_LIM`**
 * @param {{ value?: boolean }|null} [shopdamageRef] — C **`&shopdamage`**; fresh ref used when omitted
 */
export async function zapOverFloorAlongRay(g, x0, y0, dx, dy, type, maxRange = BOLT_LIM, shopdamageRef = null) {
    const sd = shopdamageRef ?? { value: false };
    const sx = x0 | 0;
    const sy = y0 | 0;
    const ddx = dx | 0;
    const ddy = dy | 0;
    if (ddx === 0 && ddy === 0) {
        await zapOverFloor(g, sx, sy, type, sd);
        if (sd.value) {
            await payForDamage(g, shopDamageVerbForZapDamg(zapDamgtype(type)), false);
            sd.value = false;
        }
        return;
    }
    let remaining = maxRange | 0;
    if (remaining <= 0) return;
    const cap = maxRange | 0;
    for (let i = 1; i <= cap; i++) {
        const x = sx + ddx * i;
        const y = sy + ddy * i;
        if (!isok(x, y)) break;
        const mod = await zapOverFloor(g, x, y, type, sd);
        remaining += mod;
        if (mod <= -1000) break;
        if (remaining <= 0) break;
    }
    if (sd.value) {
        await payForDamage(g, shopDamageVerbForZapDamg(zapDamgtype(type)), false);
        sd.value = false;
    }
}
