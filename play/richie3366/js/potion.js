// potion.js — Quaff / #dip commands (dodrink / dodip subset).
// C ref: potion.c dodrink, dopotion, peffects, peffect_oil,
//         peffect_confusion, peffect_booze, peffect_healing,
//         peffect_extra_healing, peffect_speed (D-1408), peffect_water,
//         make_confused, dodip, speed_up, djinni_from_bottle (D-1144);
//         invent.c getobj; fountain.c drinkfountain / dipfountain / dipsink.
// Branch envelope: POT_WATER peffect + potionbreathe lycan vapor (D-1004).
// dodip pool yn wash_hands / water_damage (D-1128).
// djinni_from_bottle chance remap + mongrantswish (D-1144).
// throwit steed potionhit crash/saddle/H2Opotion_dip/POT_WATER (D-1297).
// SPE_HASTE_SELF / POT_SPEED peffect_speed + speed_up (D-1408).

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import {
    flush_screen, flush_topl_more, pline, You_feel, verbalize, canspotmon,
    canseemon,
} from './display.js';
import { POTION_CLASS, COIN_CLASS, objectNames } from './objects.js';
import {
    weight, obj_extract_self, bless, curse, unbless, uncurse,
} from './mkobj.js';
import {
    A_WIS, A_DEX, A_CON, A_STR, A_MAX, adjattrib, exercise, acurr,
    Fast, Very_fast,
} from './attrib.js';
import { makeknown, compactify_invlets } from './invent.js';
import { yn_function } from './getline.js';
import {
    doname, xname, short_oname, thesimpleoname, makeplural,
    The, vtense, an, cxname,
} from './objnam.js';
import {
    dipfountain, drinkfountain, drinksink, dipsink,
    wash_hands, floating_above, mongrantswish,
} from './fountain.js';
import {
    IS_FOUNTAIN, IS_SINK,
    ECMD_TIME, ECMD_CANCEL,
    POTHIT_HERO_THROW, POTHIT_OTHER_THROW, KILLED_BY_AN, KILLED_BY,
    TIMEOUT, HALLUC_RES, GLIB, FAST, FROMOUTSIDE, INTRINSIC, LEG,
    QBUFSZ, STONED, SLIMED, SICK, SICK_ALL,
    A_CHAOTIC, A_LAWFUL, Upolyd, ismnum, NON_PM, NEUTRAL,
    P_RIDING, P_BASIC, ER_DESTROYED, ER_NOTHING, MM_NOMSG,
    OBJ_INVENT, ARTICLE_THE, SUPPRESS_IT, SUPPRESS_SADDLE, W_SADDLE,
} from './const.js';
import { hands_obj, P_SKILL } from './weapon.js';
import { rn2, rnd, d, rn1, rnl } from './rng.js';
import { losehp, nomul, maybe_half_phys, is_pool, waterbody_name } from './hack.js';
import { cansee } from './vision.js';
import {
    mons, mon_hates_blessings, pmnames, is_swimmer, monsterNames,
    has_head, is_were, is_vampshifter, is_human, breathless, haseyes,
} from './monsters.js';
import { rider_cant_reach } from './steed.js';
import { PM_HUMAN, PM_HEALER } from './generated/monsters_data.js';
import { makemon, set_malign } from './makemon.js';
import { mongone, wakeup, healmon, wake_nearto, dist2 } from './mon.js';
import { tamedog } from './dog.js';
import { can_reach_floor } from './engrave.js';
import { bcsign } from './rumors.js';
import { more_experienced } from './exper.js';
import {
    trycall, hliquid, a_monnam, Monnam, hcolor, x_monnam, mon_nam,
    Hallucination,
} from './do_name.js';
import { newuhs } from './eat.js';
import { heal_legs, water_damage } from './trap.js';
import {
    delayed_killer, find_delayed_killer, dealloc_killer,
} from './end.js';
import { you_were, you_unwere, set_ulycn, new_were } from './were.js';
import { which_armor } from './worn.js';

const POT_OIL = objectNames.indexOf('POT_OIL');
const POT_ACID = objectNames.indexOf('POT_ACID');
const POT_SLEEPING = objectNames.indexOf('POT_SLEEPING');
const POT_PARALYSIS = objectNames.indexOf('POT_PARALYSIS');
const POT_CONFUSION = objectNames.indexOf('POT_CONFUSION');
const POT_BLINDNESS = objectNames.indexOf('POT_BLINDNESS');
const POT_BOOZE = objectNames.indexOf('POT_BOOZE');
const POT_FRUIT_JUICE = objectNames.indexOf('POT_FRUIT_JUICE');
const POT_SEE_INVISIBLE = objectNames.indexOf('POT_SEE_INVISIBLE');
const POT_INVISIBILITY = objectNames.indexOf('POT_INVISIBILITY');
const POT_HEALING = objectNames.indexOf('POT_HEALING');
const POT_EXTRA_HEALING = objectNames.indexOf('POT_EXTRA_HEALING');
const POT_SPEED = objectNames.indexOf('POT_SPEED');
const SPE_HASTE_SELF = objectNames.indexOf('SPE_HASTE_SELF');
const POT_SICKNESS = objectNames.indexOf('POT_SICKNESS');
const POT_WATER = objectNames.indexOf('POT_WATER');
const POT_POLYMORPH = objectNames.indexOf('POT_POLYMORPH');
const PM_DJINNI = monsterNames.indexOf('PM_DJINNI');
const PM_GREMLIN = monsterNames.indexOf('PM_GREMLIN');
const PM_IRON_GOLEM = monsterNames.indexOf('PM_IRON_GOLEM');
const MS_SILENT = 0;
const NH_AMBER = 'amber';
const NH_LIGHT_BLUE = 'light blue';
const NH_BLACK = 'black';

/** C: gp.potion_nothing / gp.potion_unkn for dopotion trycall gate. */
let potion_nothing = 0;
let potion_unkn = 0;

const BOTTLENAMES = [
    'bottle', 'phial', 'flagon', 'carafe', 'flask', 'jar', 'vial',
];
const HBOTTLENAMES = [
    'jug', 'pitcher', 'barrel', 'tin', 'bag', 'box', 'glass', 'beaker',
    'tumbler', 'vase', 'flowerpot', 'pan', 'thingy', 'mug', 'teacup',
    'teapot', 'keg', 'bucket', 'thermos', 'amphora', 'wineskin', 'parcel',
    'bowl', 'ampoule',
];

/**
 * Invent letters of drinkable potions (C drink_ok → GETOBJ_SUGGEST).
 * Returns non-compacted string for `?` menus (C `lets[]`).
 * Prompt uses compactify when suggested > 5 (C `buf` / D-0455).
 */
function drinkable_lets() {
    const inv = game.invent || [];
    const lets = [];
    for (const o of inv) {
        if (o.oclass === POTION_CLASS && o.invlet) lets.push(o.invlet);
    }
    // C getobj sortloot SORTLOOT_INVLET
    lets.sort((a, b) => a.charCodeAt(0) - b.charCodeAt(0));
    return lets.join('');
}

/** C invent.c getobj: if (suggested > 5) compactify(bp) for prompt only. */
function drink_prompt_lets(raw) {
    if (!raw || raw.length <= 5) return raw;
    return compactify_invlets(raw);
}

/** Compact consecutive invent letters (C invent.c compactify). */
function compact_lets(lets) {
    if (!lets.length) return '';
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

/** C ref: potion.c dip_ok — suggest non-coin invent. */
function dippable_lets() {
    const inv = game.invent || [];
    const lets = [];
    for (const o of inv) {
        if (o.oclass === COIN_CLASS) continue;
        if (o.invlet) lets.push(o.invlet);
    }
    lets.sort();
    return compact_lets(lets);
}

/**
 * C ref: invent.c getobj("drink", drink_ok, GETOBJ_NOFLAGS)
 * Called after fountain/sink prompts (or when menu_requested).
 * `?`/`*` → display_pickinv_reply (D-0430); missing letter → continue.
 * Empty suggest + !GETOBJ_PROMPT → no key read (C invent.c suggested==0).
 */
async function getobj_drink() {
    const { display_pickinv_reply } = await import('./invent.js');
    // C: suggested == 0 && !forceprompt && !allownone → You don't have…
    // (drink_ok_extra / EXCLUDE_INACCESS "else " deferred)
    if (!drinkable_lets()) {
        await pline("You don't have anything to drink.");
        return null;
    }
    for (;;) {
        const rawLets = drinkable_lets();
        const lets = drink_prompt_lets(rawLets);
        const query = `What do you want to drink? [${lets} or ?*]`;
        const prompt = `${query} `;

        game._pending_message = prompt;
        const disp = game.nhDisplay;
        await flush_screen(1);
        if (disp?.setCursor) disp.setCursor(prompt.length, 0);

        const key = await nhgetch();
        const ch = String.fromCharCode(key);

        if (key === 27 || ch === ' ' || ch === '\n' || ch === '\r') {
            if (game.flags?.verbose !== false) await pline('Never mind.');
            return null;
        }
        if (ch === '?' || ch === '*') {
            // C: display_pickinv(lets, ...) uses non-compacted lets[]
            const picked = await display_pickinv_reply(ch === '*' ? '*' : rawLets);
            if (picked === '\x1b') {
                if (game.flags?.verbose !== false) await pline('Never mind.');
                return null;
            }
            if (!picked) continue;
            const otmp = (game.invent || []).find(o => o.invlet === picked);
            if (!otmp) {
                await pline("You don't have that object.");
                continue;
            }
            if (otmp.oclass !== POTION_CLASS) {
                await pline('That is a silly thing to drink.');
                return null;
            }
            game._pending_message = '';
            return otmp;
        }

        const otmp = (game.invent || []).find(o => o.invlet === ch);
        if (!otmp) {
            await pline("You don't have that object.");
            continue;
        }
        if (otmp.oclass !== POTION_CLASS) {
            await pline('That is a silly thing to drink.');
            return null;
        }
        game._pending_message = '';
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
 * C ref: potion.c peffect_oil()
 * Lit/fire-resist and burn_away_slime paths deferred.
 */
async function peffect_oil(otmp) {
    let good_for_you = false;
    if (otmp.lamplit) {
        // C: likes_fire → refreshing; else burn face + losehp + burn_away_slime
        // Lit-oil body deferred (starting kit oil is unlit)
        await pline('That was smooth!');
    } else if (otmp.cursed) {
        await pline('This tastes like castor oil.');
    } else {
        await pline('That was smooth!');
    }
    exercise(A_WIS, good_for_you);
}

/**
 * C ref: objnam.c fruitname — pl_fruit (+ " juice" when juice).
 */
function fruitname(juice) {
    const raw = String(game.pl_fruit || game.flags?.fruit || 'slime mold');
    const of = raw.toLowerCase().indexOf(' of ');
    const fruitNam = of >= 0 ? raw.slice(of + 4) : raw;
    // makesingular deferred — default fruit has no trailing s
    return juice ? `${fruitNam} juice` : fruitNam;
}

/**
 * C ref: potion.c peffect_see_invisible — also POT_FRUIT_JUICE.
 * See-invisible: make_blinded / set_mimic_blocking / see_monsters /
 * newsym / Invisible self-msg deferred; timeout via rn1 when unblessed.
 */
async function peffect_see_invisible(otmp) {
    potion_unkn++;
    const u = game.u || {};
    if (otmp.cursed) {
        await pline(`Yecch!  This tastes ${u.Hallucination ? 'overripe' : 'rotten'}.`);
    } else if (u.Hallucination) {
        await pline(
            `This tastes like 10% real ${otmp.odiluted ? 'reconstituted ' : ''}`
            + `${fruitname(true)} all-natural beverage.`,
        );
    } else {
        await pline(
            `This tastes like ${otmp.odiluted ? 'reconstituted ' : ''}${fruitname(true)}.`,
        );
    }
    if (otmp.otyp === POT_FRUIT_JUICE) {
        u.uhunger = (u.uhunger || 0)
            + (otmp.odiluted ? 5 : 10) * (2 + bcsign(otmp));
        newuhs(false);
        return;
    }
    // POT_SEE_INVISIBLE — make_blinded(0) deferred
    if (!otmp.cursed) {
        // make_blinded(0L, TRUE) deferred
    }
    const HInvis = !!(u.HInvis || u.Invis);
    const HSee = !!(u.HSee_invisible || u.See_invisible);
    const permchance = 10 - (HInvis ? 3 : 0) - (HSee ? 6 : 0);
    if (otmp.blessed && !rn2(permchance)) {
        u.HSee_invisible = (u.HSee_invisible || 0) | 0x01; // FROMOUTSIDE bit stub
        u.See_invisible = true;
    } else {
        // incr_itimeout(&HSee_invisible, rn1(100, 750))
        const add = rn1(100, 750);
        u.HSee_invisible = (u.HSee_invisible || 0) + add;
        u.See_invisible = true;
    }
    // set_mimic_blocking / see_monsters / newsym deferred
}

/**
 * C ref: youprop.h Poison_resistance — H || E || flag.
 * Named omission: intrinsic race/role props beyond uprops bits.
 */
function Poison_resistance() {
    const u = game.u || {};
    return !!((u.HPoison_resistance | 0) || (u.EPoison_resistance | 0)
        || u.Poison_resistance);
}

/** C ref: role.h Role_if(PM_HEALER) */
function Role_if_healer() {
    return (game.urole?.mnum | 0) === PM_HEALER;
}

/**
 * C ref: potion.c peffect_sickness
 * Blessed: stale-fruit pline + losehp(1) (non-healer). Uncursed/cursed:
 * attr drain + HP. Does not set potion_unkn → dopotion makeknown may
 * exercise(A_WIS) via discover_object. Named omissions: poisontell
 * wording / Fixed_abil gate; full make_hallucinated body (flag clear only).
 */
async function peffect_sickness(otmp) {
    await pline('Yecch!  This stuff tastes like poison.');
    if (otmp.blessed) {
        await pline(`(But in fact it was mildly stale ${fruitname(true)}.)`);
        if (!Role_if_healer()) {
            // C: losehp(1, "mildly contaminated potion", KILLED_BY_AN)
            losehp(1, 'mildly contaminated potion', KILLED_BY_AN);
        }
    } else {
        if (Poison_resistance()) {
            await pline(
                `(But in fact it was biologically contaminated ${fruitname(true)}.)`,
            );
        }
        if (Role_if_healer()) {
            await pline('Fortunately, you have been immunized.');
        } else {
            const typ = rn2(A_MAX);
            const contaminant =
                (Poison_resistance() ? 'mildly ' : '')
                + (otmp.fromsink ? 'contaminated tap water' : 'contaminated potion');
            // Fixed_abil deferred — always adjattrib like !Fixed_abil
            // poisontell(typ, FALSE) wording deferred
            await adjattrib(
                typ,
                Poison_resistance() ? -1 : -rn1(4, 3),
                1,
            );
            if (!Poison_resistance()) {
                const dmg = rnd(10) + 5 * (otmp.cursed ? 1 : 0);
                losehp(
                    dmg,
                    contaminant,
                    otmp.fromsink ? KILLED_BY : KILLED_BY_AN,
                );
            } else {
                losehp(
                    1 + rn2(2),
                    contaminant,
                    otmp.fromsink ? KILLED_BY : KILLED_BY_AN,
                );
            }
            exercise(A_CON, false);
        }
    }
    const u = game.u || {};
    if (u.Hallucination || (u.HHallucination | 0)) {
        await pline('You are shocked back to your senses!');
        // make_hallucinated(0L, FALSE, 0L) body deferred — clear flags
        u.Hallucination = false;
        u.HHallucination = 0;
    }
}

/**
 * C ref: potion.c peffect_paralysis
 * Free_action resist; else freeze msg + nomul(-(rn1(10, 25-12*bcsign))).
 * Levitation/air/water/steed messages deferred → floor feet msg.
 * surface() → "floor".
 */
async function peffect_paralysis(otmp) {
    const u = game.u || {};
    const Free_action = !!(u.Free_action || u.HFree_action || u.EFree_action);
    if (Free_action) {
        await pline('You stiffen momentarily.');
        return;
    }
    // Levitation / Is_airlevel / Is_waterlevel / usteed branches deferred
    // C: makeplural(body_part(FOOT)) → "feet"; surface() → "floor" deferred
    await pline('Your feet are frozen to the floor!');
    nomul(-(rn1(10, 25 - 12 * bcsign(otmp))));
    game.multi_reason = 'frozen by a potion';
    game.nomovemsg = 'You can move again.';
    exercise(A_DEX, false);
}

/** C ref: potion.c itimeout — clamp to TIMEOUT field. */
function itimeout(val) {
    val = val | 0;
    if (val >= TIMEOUT) val = TIMEOUT;
    else if (val < 1) val = 0;
    return val;
}

/** C ref: potion.c itimeout_incr */
function itimeout_incr(old, incr) {
    return itimeout((old & TIMEOUT) + (incr | 0));
}

/** Sync flat HFast with uprops[FAST].intrinsic (HFast ≡ that slot). */
function set_HFast(val) {
    const u = game.u || (game.u = {});
    u.HFast = val | 0;
    if (!u.uprops) u.uprops = {};
    const prop = u.uprops[FAST] || (u.uprops[FAST] = {
        intrinsic: 0, extrinsic: 0, blocked: 0,
    });
    prop.intrinsic = u.HFast;
}

/**
 * C ref: potion.c incr_itimeout(&HFast, duration) — TIMEOUT bits only.
 */
function incr_itimeout_HFast(incr) {
    const u = game.u || (game.u = {});
    const cur = (u.HFast | 0) | (u.uprops?.[FAST]?.intrinsic | 0);
    set_HFast((cur & ~TIMEOUT) | itimeout_incr(cur, incr));
}

/**
 * C ref: potion.c speed_up
 * !Very_fast → "suddenly moving %sfaster" (Fast ? "" : "much ");
 * else body_part(LEG) plural "get new energy."; exercise DEX;
 * incr_itimeout(&HFast, duration). zap.c zapyourself WAN_SPEED_MONSTER
 * still named (queue).
 */
export async function speed_up(duration) {
    if (!Very_fast()) {
        await pline(`You are suddenly moving ${Fast() ? '' : 'much '}faster.`);
    } else {
        const { body_part } = await import('./polyself.js');
        await pline(`Your ${makeplural(body_part(LEG))} get new energy.`);
    }
    exercise(A_DEX, true);
    incr_itimeout_HFast(duration);
}

/**
 * C ref: potion.c make_vomiting(xtime, talk)
 * Sync Vomiting TIMEOUT; clear-talk message only.
 * Named omission: nh_timeout Vomiting body beyond allmain exercise flag.
 */
export async function make_vomiting(xtime, talk) {
    const u = game.u || (game.u = {});
    const old = u.Vomiting | 0;
    if (u.Unaware) talk = false;
    u.Vomiting = ((u.Vomiting | 0) & ~TIMEOUT) | itimeout(xtime);
    if (game.disp) game.disp.botl = true;
    if (game.flags) game.flags.botl = true;
    if (!xtime && old && talk) {
        await You_feel('much less nauseated now.');
    }
}

/**
 * C youprop.h: `#define Glib u.uprops[GLIB].intrinsic` (malady; no
 * EGlib in C). Remaining timeout is `(HGlib|EGlib)&TIMEOUT` with
 * HGlib ≡ intrinsic and EGlib ≡ extrinsic (0 unless a leftover
 * JS extrinsic exists). Leftover flat `u.Glib`/`u.HGlib` only
 * when the uprops slot has never been created.
 */
export function Glib() {
    const u = game.u || {};
    const p = u.uprops?.[GLIB];
    if (p) {
        const HGlib = p.intrinsic | 0;
        const EGlib = p.extrinsic | 0;
        return HGlib | EGlib;
    }
    return (u.HGlib | 0) | (u.EGlib | 0) | (u.Glib | 0);
}

function glib_uprop(u) {
    if (!u.uprops) u.uprops = {};
    if (!u.uprops[GLIB]) {
        // leftover flats → C Glib intrinsic on first write
        u.uprops[GLIB] = {
            intrinsic: (u.HGlib | 0) || (u.Glib | 0),
            extrinsic: u.EGlib | 0,
            blocked: 0,
        };
    }
    return u.uprops[GLIB];
}

/**
 * C ref: potion.c make_glib(xtime)
 * set_itimeout(&Glib, xtime); inventory polish deferred.
 */
export function make_glib(xtime) {
    const u = game.u || (game.u = {});
    const p = glib_uprop(u);
    // C: disp.botl |= (!Glib ^ !!xtime)
    const was = !!(p.intrinsic | 0);
    const now = !!(xtime | 0);
    if (was !== now) {
        if (game.disp) game.disp.botl = true;
        if (game.flags) game.flags.botl = true;
    }
    // C: set_itimeout(&Glib, xtime) — Glib ≡ uprops[GLIB].intrinsic
    p.intrinsic = ((p.intrinsic | 0) & ~TIMEOUT) | itimeout(xtime);
    u.HGlib = p.intrinsic;
    u.Glib = p.intrinsic | (p.extrinsic | 0);
    // C: if (uarmg) update_inventory() — deferred
}

/**
 * C ref: potion.c make_deaf(xtime, talk) — HDeaf TIMEOUT set/clear.
 * Named omit: Unaware talk suppress polish when sticky Deaf extrinsic.
 * @param {number} xtime
 * @param {boolean} talk
 */
export async function make_deaf(xtime, talk) {
    const u = game.u || (game.u = {});
    const old = u.HDeaf | 0;
    if (u.Unaware) talk = false;
    u.HDeaf = ((u.HDeaf | 0) & ~TIMEOUT) | itimeout(xtime);
    const now = u.HDeaf | 0;
    if (!!xtime !== !!old) {
        if (game.disp) game.disp.botl = true;
        if (game.flags) game.flags.botl = true;
        if (talk) {
            const Deaf = !!(now || (u.EDeaf | 0) || u.uroleplay?.deaf || u.Deaf);
            if (old && !Deaf) await pline('You can hear again.');
            else await pline('You are unable to hear anything.');
        }
    }
}

/**
 * C ref: potion.c make_confused(xtime, talk)
 * Sync HConfusion TIMEOUT bits; mirror onto u.Confusion for JS gates
 * (C: Confusion ≡ HConfusion).
 */
export async function make_confused(xtime, talk) {
    const u = game.u || (game.u = {});
    const old = u.HConfusion | 0;
    if (u.Unaware) talk = false;
    // C: if (!xtime && old) You_feel("less …") when talk
    if (!xtime && old && talk) {
        const hallu = !!(u.Hallucination || u.HHallucination);
        await You_feel(`less ${hallu ? 'trippy' : 'confused'} now.`);
    }
    if ((xtime && !old) || (!xtime && old)) {
        if (game.flags) game.flags.botl = true;
    }
    u.HConfusion = ((u.HConfusion | 0) & ~TIMEOUT) | itimeout(xtime);
    u.Confusion = u.HConfusion;
}

/**
 * C ref: potion.c make_stunned(xtime, talk)
 * Sync HStun TIMEOUT; mirror onto u.Stunned for JS gates (C: Stun ≡ HStun).
 * Named omissions: usteed saddle wobble; stagger(youmonst.data, …) poly verb.
 */
export async function make_stunned(xtime, talk) {
    const u = game.u || (game.u = {});
    const old = u.HStun | 0;
    if (u.Unaware) talk = false;
    if (!xtime && old && talk) {
        const hallu = !!(u.Hallucination || u.HHallucination);
        await You_feel(`${hallu ? 'less wobbly' : 'a bit steadier'} now.`);
    }
    if (xtime && !old && talk) {
        if (u.usteed) {
            await pline('You wobble in the saddle.');
        } else {
            // C: You("%s...", stagger(youmonst.data, "stagger"))
            await pline('You stagger...');
        }
    }
    if ((!xtime && old) || (xtime && !old)) {
        if (game.flags) game.flags.botl = true;
        if (game.disp) game.disp.botl = true;
    }
    u.HStun = ((u.HStun | 0) & ~TIMEOUT) | itimeout(xtime);
    u.Stunned = u.HStun;
}

/**
 * C ref: potion.c make_slimed — Slimed TIMEOUT; clear delayed SLIMED killer.
 * Named omissions: U_AP_TYPE green-slime fake appearance clear.
 */
export async function make_slimed(xtime, msg) {
    const u = game.u || (game.u = {});
    const old = u.Slimed | 0;
    u.Slimed = ((u.Slimed | 0) & ~TIMEOUT) | itimeout(xtime);
    if ((!!xtime) !== (!!old)) {
        if (game.flags) game.flags.botl = true;
        if (game.disp) game.disp.botl = true;
        if (msg) await pline(msg);
    }
    if (!(u.Slimed & TIMEOUT)) {
        dealloc_killer(find_delayed_killer(SLIMED));
        // U_AP_TYPE green-slime appearance clear deferred
    }
}

/**
 * C ref: potion.c make_stoned — Stoned TIMEOUT; delayed STONED killer on start.
 */
export async function make_stoned(xtime, msg, killedby, killername) {
    const u = game.u || (game.u = {});
    const old = u.Stoned | 0;
    u.Stoned = ((u.Stoned | 0) & ~TIMEOUT) | itimeout(xtime);
    if ((!!xtime) !== (!!old)) {
        if (game.flags) game.flags.botl = true;
        if (game.disp) game.disp.botl = true;
        if (msg) await pline(msg);
    }
    if (!(u.Stoned & TIMEOUT)) {
        dealloc_killer(find_delayed_killer(STONED));
    } else if (!old) {
        delayed_killer(STONED, killedby | 0, killername || '');
    }
}

/**
 * C ref: potion.c make_sick — fatal illness / food poisoning TIMEOUT.
 * Branch envelope: onset (Sick_resistance gate + talk msgs); cure by
 * usick_type mask (partial vs full); delayed SICK killer.
 * Named omissions: Unaware talk suppress; #wizintrinsic KILLED_BY vs
 * KILLED_BY_AN cause polish.
 */
export async function make_sick(xtime, cause, talk, type) {
    const u = game.u || (game.u = {});
    const old = u.Sick | 0;
    if (xtime > 0) {
        const Sick_resistance = !!(u.Sick_resistance || u.HSick_resistance
            || u.ESick_resistance);
        if (Sick_resistance) return;
        if (!old) {
            await You_feel('deathly sick.');
        } else if (talk) {
            await You_feel(
                `${xtime <= ((old & TIMEOUT) / 2) ? 'much' : 'even'} worse.`,
            );
        }
        u.Sick = ((u.Sick | 0) & ~TIMEOUT) | itimeout(xtime);
        u.usick_type = (u.usick_type | 0) | (type | 0);
        if (game.flags) game.flags.botl = true;
        if (game.disp) game.disp.botl = true;
    } else if (old && ((type | 0) & ((u.usick_type | 0) || SICK_ALL))) {
        // was sick, now not (or partly)
        u.usick_type = (u.usick_type | 0) & ~(type | 0);
        if (u.usick_type) {
            if (talk) await You_feel('somewhat better.');
            u.Sick = ((u.Sick | 0) & ~TIMEOUT)
                | itimeout((old & TIMEOUT) * 2);
        } else {
            if (talk) await You_feel('cured.  What a relief!');
            u.Sick = 0;
        }
        if (game.flags) game.flags.botl = true;
        if (game.disp) game.disp.botl = true;
    }

    const kptr = find_delayed_killer(SICK);
    if (u.Sick) {
        exercise(A_CON, false);
        if (xtime || !old || !kptr) {
            delayed_killer(SICK, KILLED_BY_AN, cause || '');
        }
    } else {
        dealloc_killer(kptr);
    }
}

/**
 * C ref: potion.c make_hallucinated(xtime, talk, mask)
 * Envelope: timed HHallucination set/clear + cosmic/boring pline.
 * Named omissions: EHalluc_resistance mask polish beyond |= / &=~;
 * Unaware talk suppress; eatmupdate; update_inventory;
 * itch/flatten clear msgs.
 */
export async function make_hallucinated(xtime, talk, mask = 0) {
    const u = game.u || (game.u = {});
    const old = u.HHallucination | 0;
    let changed = false;
    if (u.Unaware) talk = false;

    const message = !xtime
        ? 'Everything %s SO boring now.'
        : 'Oh wow!  Everything %s so cosmic!';
    const verb = (u.Blind || (u.HBlinded | 0)) ? 'feels' : 'looks';

    if (mask) {
        if (old) changed = true;
        if (!u.EHalluc_resistance) u.EHalluc_resistance = 0;
        if (!xtime) u.EHalluc_resistance |= mask;
        else u.EHalluc_resistance &= ~mask;
    } else {
        const resist = !!(
            (u.Halluc_resistance | 0)
            || (u.HHalluc_resistance | 0)
            || (u.EHalluc_resistance | 0)
            || (u.uprops?.[HALLUC_RES]?.intrinsic | 0)
            || (u.uprops?.[HALLUC_RES]?.extrinsic | 0)
        );
        if (!resist && (!!old !== !!xtime)) changed = true;
        u.HHallucination = ((u.HHallucination | 0) & ~TIMEOUT) | itimeout(xtime);
        // Mirror boolean gate used across the port
        u.Hallucination = !!(u.HHallucination & TIMEOUT) && !resist;
    }

    if (changed) {
        if (game.flags) game.flags.botl = true;
        // C: if uswallow → swallowed(0); else see_* *before* cosmic pline
        const {
            see_monsters, see_objects, see_traps, swallowed,
        } = await import('./display.js');
        if (u.uswallow) {
            swallowed(0);
        } else {
            see_monsters();
            see_objects();
            see_traps();
        }
        if (talk) {
            await pline(message.replace('%s', verb));
        }
    }
    return changed;
}

/**
 * C ref: potion.c peffect_confusion
 * First-quaff msg or potion_nothing; then make_confused(itimeout_incr(
 * HConfusion, rn1(7, 16-8*bcsign)), FALSE).
 */
async function peffect_confusion(otmp) {
    const u = game.u || {};
    // C: Confusion ≡ HConfusion
    if (!(u.HConfusion || u.Confusion)) {
        if (u.Hallucination || u.HHallucination) {
            await pline('What a trippy feeling!');
            potion_unkn++;
        } else {
            await pline('Huh, What?  Where am I?');
        }
    } else {
        potion_nothing++;
    }
    await make_confused(
        itimeout_incr(u.HConfusion | 0, rn1(7, 16 - 8 * bcsign(otmp))),
        false,
    );
}

/**
 * C ref: potion.c peffect_healing
 * You_feel better; healup(8+d(4+2*bcsign,4), !cursed?1:0, !!blessed, !cursed);
 * exercise CON. peffect_full_healing deferred.
 */
async function peffect_healing(otmp) {
    await You_feel('better.');
    await healup(
        8 + d(4 + 2 * bcsign(otmp), 4),
        !otmp.cursed ? 1 : 0,
        !!otmp.blessed,
        !otmp.cursed,
    );
    exercise(A_CON, true);
}

/**
 * C ref: potion.c peffect_extra_healing
 * You_feel much better; healup(16+d(4+2*bcsign,8), blessed?5:!cursed?2:0,
 * !cursed, TRUE); clear hallu; exercise CON+STR; blessed+!steed → heal_legs.
 */
async function peffect_extra_healing(otmp) {
    await You_feel('much better.');
    await healup(
        16 + d(4 + 2 * bcsign(otmp), 8),
        otmp.blessed ? 5 : !otmp.cursed ? 2 : 0,
        !otmp.cursed,
        true,
    );
    await make_hallucinated(0, true, 0);
    exercise(A_CON, true);
    exercise(A_STR, true);
    // C: Wounded_legs ≡ HWounded_legs || EWounded_legs
    const u = game.u || {};
    const wounded = !!(
        u.Wounded_legs
        || ((u.HWounded_legs | 0) & TIMEOUT)
        || (u.EWounded_legs | 0)
    );
    if (wounded && otmp.blessed && !u.usteed) {
        await heal_legs(0);
    }
}

/**
 * C ref: potion.c peffect_speed
 * is_speed ≡ POT_SPEED (not SPE_HASTE_SELF). Wounded + !cursed + !usteed
 * → heal_legs(0) + potion_unkn (no speed_up). Else
 * speed_up(rn1(10, 100+60*bcsign)). Non-cursed potion without INTRINSIC
 * Fast → "quickness feels very natural" + HFast |= FROMOUTSIDE.
 */
async function peffect_speed(otmp) {
    const is_speed = (otmp.otyp | 0) === POT_SPEED;
    const u = game.u || (game.u = {});
    const wounded = !!(
        u.Wounded_legs
        || ((u.HWounded_legs | 0) & TIMEOUT)
        || (u.EWounded_legs | 0)
    );
    if (is_speed && wounded && !otmp.cursed && !u.usteed) {
        await heal_legs(0);
        potion_unkn++;
        return;
    }
    await speed_up(rn1(10, 100 + 60 * bcsign(otmp)));
    const hfast = (u.HFast | 0) | (u.uprops?.[FAST]?.intrinsic | 0);
    if (is_speed && !otmp.cursed && !(hfast & INTRINSIC)) {
        await pline('Your quickness feels very natural.');
        set_HFast(hfast | FROMOUTSIDE);
    }
}

/**
 * C ref: potion.c peffect_booze
 * potion_unkn + taste pline; !blessed → make_confused(d(2+uhs,8));
 * !odiluted → healup(1); hunger + newuhs; exercise WIS; cursed pass-out.
 * newuhs hunger messages / faint deferred (field update only).
 */
async function peffect_booze(otmp) {
    potion_unkn++;
    const u = game.u || (game.u = {});
    const watered = otmp.odiluted ? 'watered down ' : '';
    const drink = (u.Hallucination || u.HHallucination)
        ? 'dandelion wine' : 'liquid fire';
    await pline(`Ooph!  This tastes like ${watered}${drink}!`);
    if (!otmp.blessed) {
        // booze hits harder if drinking on an empty stomach
        await make_confused(
            itimeout_incr(u.HConfusion | 0, d(2 + (u.uhs | 0), 8)),
            false,
        );
    }
    if (!otmp.odiluted) await healup(1, 0, false, false);
    u.uhunger = (u.uhunger ?? 900) + 10 * (2 + bcsign(otmp));
    newuhs(false);
    exercise(A_WIS, false);
    if (otmp.cursed) {
        await pline('You pass out.');
        // C: gm.multi = -rnd(15); (not nomul — match direct assign)
        game.multi = -rnd(15);
        game.nomovemsg = 'You awake with a headache.';
    }
}

/**
 * C ref: potion.c peffect_water — plain / holy / unholy water.
 * Lycanthropy cure / force-change arms (D-1004). make_sick body deferred
 * (TIMEOUT clear only). mon_hates_blessings via is_undead|is_demon|vamp.
 */
async function peffect_water(otmp) {
    const u = game.u || (game.u = {});
    if (!otmp.blessed && !otmp.cursed) {
        await pline(`This tastes like ${hliquid('water')}.`);
        u.uhunger = (u.uhunger | 0) + rnd(10);
        newuhs(false);
        return;
    }
    potion_unkn++;
    const hates = mon_hates_blessings(game.youmonst)
        || (u.ualign?.type | 0) === A_CHAOTIC;
    if (hates) {
        if (otmp.blessed) {
            await pline(`This burns like ${hliquid('acid')}!`);
            exercise(A_CON, false);
            if (ismnum(u.ulycn)) {
                const nm = pmnames[u.ulycn | 0]?.[NEUTRAL]
                    || pmnames[u.ulycn | 0]?.[2]
                    || 'beast';
                await pline(`Your affinity to ${makeplural(nm)} disappears!`);
                if ((u.umonnum | 0) === (u.ulycn | 0)) {
                    await you_unwere(false);
                }
                set_ulycn(NON_PM);
            }
            losehp(
                maybe_half_phys(d(2, 6)),
                'potion of holy water',
                KILLED_BY_AN,
            );
        } else if (otmp.cursed) {
            await You_feel('quite proud of yourself.');
            await healup(d(2, 6), 0, false, false);
            if (ismnum(u.ulycn) && !Upolyd(u)) await you_were();
            exercise(A_CON, true);
        }
    } else if (otmp.blessed) {
        await You_feel('full of awe.');
        // C: make_sick(0L, NULL, TRUE, SICK_ALL) — clear Sick TIMEOUT
        u.Sick = 0;
        exercise(A_WIS, true);
        exercise(A_CON, true);
        if (ismnum(u.ulycn)) await you_unwere(true); // "Purified"
    } else {
        if ((u.ualign?.type | 0) === A_LAWFUL) {
            await pline(`This burns like ${hliquid('acid')}!`);
            losehp(
                maybe_half_phys(d(2, 6)),
                'potion of unholy water',
                KILLED_BY_AN,
            );
        } else {
            await You_feel('full of dread.');
        }
        if (ismnum(u.ulycn) && !Upolyd(u)) await you_were();
        exercise(A_CON, false);
    }
}

/**
 * C ref: potion.c peffects() — POT_OIL + fruit juice / see invisible /
 * paralysis / confusion / booze / healing / extra healing / sickness /
 * water; POT_SPEED / SPE_HASTE_SELF (D-1408); other otyps in map.
 */
export async function peffects(otmp) {
    switch (otmp.otyp) {
    case POT_OIL:
        await peffect_oil(otmp);
        return -1;
    case POT_SEE_INVISIBLE:
    case POT_FRUIT_JUICE:
        await peffect_see_invisible(otmp);
        return -1;
    case POT_PARALYSIS:
        await peffect_paralysis(otmp);
        return -1;
    case POT_CONFUSION:
        await peffect_confusion(otmp);
        return -1;
    case POT_BOOZE:
        await peffect_booze(otmp);
        return -1;
    case POT_HEALING:
        await peffect_healing(otmp);
        return -1;
    case POT_EXTRA_HEALING:
        await peffect_extra_healing(otmp);
        return -1;
    case POT_SPEED:
    case SPE_HASTE_SELF:
        await peffect_speed(otmp);
        return -1;
    case POT_SICKNESS:
        await peffect_sickness(otmp);
        return -1;
    case POT_WATER:
        await peffect_water(otmp);
        return -1;
    default:
        // Other peffect_* deferred — do not useup
        await pline('That potion is not implemented yet.');
        return 0;
    }
}

/**
 * C ref: potion.c dopotion()
 * Ghost/djinni bottle RNG deferred. Hallucination peculiar-feeling when
 * potion_nothing. trycall when potion_unkn && dknown && !oc_name_known.
 * Exported for fountain.js drinksink case 4 (dynamic import).
 */
export async function dopotion(otmp) {
    otmp.in_use = true;
    potion_nothing = 0;
    potion_unkn = 0;
    const retval = await peffects(otmp);
    if (retval >= 0) return retval ? 1 : 0;

    if (potion_nothing) {
        potion_unkn++;
        const peculiar = game.u?.Hallucination ? 'normal' : 'peculiar';
        await pline(`You have a ${peculiar} feeling for a moment, then it passes.`);
    }
    const oc = game.objects?.[otmp.otyp];
    if (otmp.dknown && oc && !oc.oc_name_known) {
        if (!potion_unkn) {
            makeknown(otmp.otyp);
            // C: potion.c dopotion — score for discovering the type
            more_experienced(0, 10);
        } else {
            await trycall(otmp);
        }
    }
    useup(otmp);
    return 1;
}

/** C youprop.h Blind ≡ (HBlinded || EBlinded) && !BBlinded (D-0716: no sticky). */
function Blind() {
    const u = game.u || {};
    if (u.uroleplay?.blind) return true;
    return !!(((u.HBlinded | 0) || (u.EBlinded | 0)) && !(u.BBlinded | 0));
}

/**
 * C ref: potion.c djinni_from_bottle — makemon djinni, BUC chance remap,
 * then wish / tame / peaceful / vanish / hostile.
 * Caller this peel: apply.c dorub MAGIC_LAMP after OIL_LAMP transform
 * (D-1144). dodrink smoky POTION_OCCUPANT_CHANCE still named.
 * SetVoice soundlib named omit. Vanish uses shared mongone specials
 * drop (D-1149); mongrantswish still its own mongone subset (D-0472).
 * @param {object} obj bottle or transformed lamp (BUC flags)
 */
export async function djinni_from_bottle(obj) {
    const u = game.u || {};
    const mtmp = makemon(mons(PM_DJINNI), u.ux, u.uy, MM_NOMSG);
    if (!mtmp) {
        await pline('It turns out to be empty.');
        return;
    }

    if (!Blind()) {
        await pline(`In a cloud of smoke, ${a_monnam(mtmp)} emerges!`);
        await pline(`${Monnam(mtmp)} speaks.`);
    } else {
        await pline('You smell acrid fumes.');
        await pline('Something speaks.');
    }

    let chance = rn2(5);
    if (obj?.blessed) {
        chance = (chance === 4) ? rnd(4) : 0;
    } else if (obj?.cursed) {
        chance = (chance === 0) ? rn2(4) : 4;
    }
    // 0,1,2,3,4: b=80%,5,5,5,5; nc=20% each; c=5%,5,5,5,80
    // C SetVoice(mtmp, 0, 80, 0) named omit

    switch (chance) {
    case 0:
        await verbalize('I am in your debt.  I will grant one wish!');
        await mongrantswish(mtmp);
        break;
    case 1:
        await verbalize('Thank you for freeing me!');
        await tamedog(mtmp, null, false);
        break;
    case 2:
        await verbalize('You freed me!');
        mtmp.mpeaceful = 1;
        set_malign(mtmp);
        break;
    case 3:
        await verbalize('It is about time!');
        if (canspotmon(mtmp)) {
            await pline(`${Monnam(mtmp)} vanishes.`);
        }
        await mongone(mtmp);
        break;
    default:
        await verbalize('You disturbed me, fool!');
        mtmp.mpeaceful = 0;
        set_malign(mtmp);
        break;
    }
}

/**
 * C ref: potion.c healup — add HP; optional sick/blind cure.
 * cureblind → make_blinded(0,TRUE) (learn_unseen_invent via toggle)
 * then make_deaf(0,TRUE) (D-1399; SPE_CURE_BLINDNESS).
 * curesick → make_vomiting(0,TRUE) + make_sick(0,NULL,TRUE,SICK_ALL)
 * (D-1398; SPE_CURE_SICKNESS). zap.js keeps a local copy for SPE_HEALING
 * zapyourself (avoids import cycle).
 */
export async function healup(nhp, nxtra, curesick, cureblind) {
    const u = game.u;
    if (!u) return;
    if (nhp) {
        if (u.Upolyd) {
            u.mh = (u.mh ?? 0) + nhp;
            if (u.mh > (u.mhmax ?? 0)) {
                u.mhmax = (u.mhmax ?? 0) + nxtra;
                u.mh = u.mhmax;
            }
        } else {
            u.uhp = (u.uhp ?? 0) + nhp;
            if (u.uhp > (u.uhpmax ?? 0)) {
                u.uhpmax = (u.uhpmax ?? 0) + nxtra;
                u.uhp = u.uhpmax;
                if ((u.uhppeak ?? 0) < u.uhpmax) u.uhppeak = u.uhpmax;
            }
        }
    }
    if (cureblind) {
        /* C potion.c :1444–1450 — cream then make_blinded then make_deaf. */
        u.ucreamed = 0;
        const { make_blinded } = await import('./do.js');
        await make_blinded(0, true);
        await make_deaf(0, true);
    }
    if (curesick) {
        /* C potion.c :1452–1455 */
        await make_vomiting(0, true);
        await make_sick(0, null, true, SICK_ALL);
    }
    // C: disp.botl = TRUE
    if (game.flags) game.flags.botl = true;
}

/**
 * C ref: potion.c dodrink() / #quaff
 * Fountain-at-feet yn → drinkfountain; sink yn → drinksink.
 * Underwater / Strangled / milky-ghost / smoky occupant chance deferred
 * (`djinni_from_bottle` itself is D-1144; MAGIC_LAMP `#rub` is the caller).
 * Worn-stack split deferred (starting oils are unworn).
 * @returns {number} ECMD_* — CANCEL on getobj abort; TIME after quaff
 */
export async function dodrink() {
    // C: Strangled → message, ECMD_OK (no turn) — deferred unless needed
    const u = game.u || {};
    const loc = game.level?.at(u.ux, u.uy);
    const here = loc?.typ ?? 0;

    // C: !menu_requested → fountain / sink / underwater prompts first
    if (!game.iflags?.menu_requested) {
        if (IS_FOUNTAIN(here) && can_reach_floor(false)) {
            if ((await yn_function('Drink from the fountain?', 'yn', 'n')) === 'y') {
                await drinkfountain();
                return ECMD_TIME;
            }
            // drink_ok_extra++ deferred (affects getobj empty-suggest only)
        }
        // C: kitchen sink yn → drinksink
        if (IS_SINK(here) && can_reach_floor(false)) {
            if ((await yn_function('Drink from the sink?', 'yn', 'n')) === 'y') {
                await drinksink();
                return ECMD_TIME;
            }
            // drink_ok_extra++ deferred
        }
        // underwater prompts deferred
    }

    const otmp = await getobj_drink();
    if (!otmp) return ECMD_CANCEL;

    otmp.in_use = true;
    // milky/smoky occupant paths deferred (no RNG when descr unmatched)
    return dopotion(otmp);
}

/**
 * C ref: invent.c getobj("dip", dip_ok / dip_hands_ok, GETOBJ_PROMPT)
 * Hands `-` only when Glib (dip_hands_ok); otherwise invent letters.
 * Loop on missing letter.
 */
async function getobj_dip(at_here) {
    void at_here; // Glib hands suggest deferred
    for (;;) {
        await flush_topl_more();
        const lets = dippable_lets();
        const query = lets
            ? `What do you want to dip? [${lets} or ?*]`
            : 'What do you want to dip? [*]';
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
        if (ch === '-') {
            // hands only meaningful with Glib; still accept letter
            game._pending_message = '';
            return hands_obj;
        }
        if (ch === '?' || ch === '*') {
            await pline('Never mind.');
            return null;
        }
        const otmp = (game.invent || []).find((o) => o.invlet === ch);
        if (!otmp) {
            await pline("You don't have that object.");
            continue;
        }
        if (otmp.oclass === COIN_CLASS) {
            await pline('You cannot dip that!');
            return null;
        }
        game._pending_message = '';
        return otmp;
    }
}

/**
 * C youprop.h Levitation — (HLevitation || ELevitation) && !BLevitation.
 * Sticky u.Levitation is not a C field (D-1070).
 */
function Levitation() {
    const u = game.u || {};
    return !!(((u.HLevitation | 0) || (u.ELevitation | 0))
        && !(u.BLevitation | 0));
}

/**
 * C ref: potion.c dodip — #dip
 * Branch envelope: fountain-at-feet yn → dipfountain; sink-at-feet yn →
 * dipsink (D-1113); pool yn → wash_hands / water_damage (D-1128).
 * Deferred: potion_dip alchemy, m-prefix skip floor,
 * inaccessible_equipment, drink_ok_extra potion getobj after 'n',
 * pot_acid_damage boom+delobj (ER_DESTROYED without delete).
 * @returns {number} ECMD_*
 */
export async function dodip() {
    const u = game.u || {};
    const loc = game.level?.at(u.ux, u.uy);
    const here = loc?.typ ?? 0;
    const at_fountain = IS_FOUNTAIN(here);
    const at_sink = IS_SINK(here);
    // C: is_pool(u.ux,u.uy) not IS_POOL(here) — raised lava bridges
    // are not pools (D-1090 / D-1128).
    const at_pool = is_pool(u.ux, u.uy);
    const at_here = !game.iflags?.menu_requested
        && (at_pool || at_fountain || at_sink);

    const obj = await getobj_dip(at_here);
    if (!obj) return ECMD_CANCEL;
    // inaccessible_equipment deferred

    const is_hands = obj === hands_obj;
    // C: is_hands || is_plural || pair_of → "them" (pair_of deferred)
    const shortestname = (is_hands || (obj.quan | 0) !== 1) ? 'them' : 'it';
    // C: short_oname(doname, thesimpleoname, QBUFSZ - sizeof getobj dip prompt)
    // so fountain yn reuses the getobj-budgeted name (D-0881).
    const DIP_GETOBJ_SUFFIX =
        'What do you want to dip into? [abdeghjkmnpqstvwyzBCEFHIKLNOQRTUWXZ#-# or ?*] ';
    const obuf = is_hands
        ? 'your hands'
        : short_oname(
            obj,
            doname,
            thesimpleoname,
            QBUFSZ - (DIP_GETOBJ_SUFFIX.length + 1),
        );

    if (!game.iflags?.menu_requested) {
        // C: !can_reach_floor(FALSE) skips fountain/sink/pool yn
        if (!can_reach_floor(false)) {
            // cannot dip into floor water
        } else if (at_fountain) {
            const q = `Dip ${game.flags?.verbose !== false ? obuf : shortestname} into the fountain?`;
            if ((await yn_function(q, 'yn', 'n')) === 'y') {
                if (!is_hands) obj.pickup_prev = 0;
                await dipfountain(obj);
                return ECMD_TIME;
            }
            // drink_ok_extra++ then potion getobj — deferred cancel
            return ECMD_CANCEL;
        } else if (at_sink) {
            const q = `Dip ${game.flags?.verbose !== false ? obuf : shortestname} into the sink?`;
            if ((await yn_function(q, 'yn', 'n')) === 'y') {
                if (!is_hands) obj.pickup_prev = 0;
                await dipsink(obj);
                return ECMD_TIME;
            }
            // drink_ok_extra++ then potion getobj — deferred cancel
            return ECMD_CANCEL;
        } else if (at_pool) {
            const pooltype = waterbody_name(u.ux, u.uy);
            const q = `Dip ${game.flags?.verbose !== false ? obuf : shortestname} into the ${pooltype}?`;
            if ((await yn_function(q, 'yn', 'n')) === 'y') {
                if (Levitation()) {
                    await floating_above(pooltype);
                } else if (u.usteed && !is_swimmer(u.usteed.data)
                    && P_SKILL(P_RIDING) < P_BASIC) {
                    await rider_cant_reach();
                } else if (is_hands || obj === u.uarmg) {
                    if (!is_hands) obj.pickup_prev = 0;
                    await wash_hands();
                } else {
                    obj.pickup_prev = 0;
                    if (obj.otyp === POT_ACID) obj.in_use = 1;
                    if ((await water_damage(obj, null, true)) !== ER_DESTROYED
                        && obj.in_use) {
                        useup(obj);
                    }
                }
                return ECMD_TIME;
            }
            // drink_ok_extra++ then potion getobj — deferred cancel
            return ECMD_CANCEL;
        }
    }

    // potion_dip getobj deferred
    await pline('Never mind.');
    return ECMD_CANCEL;
}

/** C ref: potion.c bottlename — ROLL_FROM bottlenames / hbottlenames. */
function bottlename() {
    const u = game.u || {};
    const hallu = !!(u.Hallucination || u.HHallucination);
    const names = hallu ? HBOTTLENAMES : BOTTLENAMES;
    return names[rn2(names.length)];
}

/**
 * C ref: potion.c potionbreathe — vapor on hero (thrown/destroy distance 0).
 * Envelope: invis flash / paralysis / sleeping / confusion / blindness /
 * acid exercise + POT_WATER lycan vapor (D-1004). Other otyps and towel /
 * Free_action resist msgs partial.
 */
export async function potionbreathe(obj) {
    const u = game.u || {};
    const Free_action = !!(u.Free_action || u.HFree_action || u.EFree_action);
    const Sleep_resistance = !!(u.HSleep_resistance || u.ESleep_resistance);
    const Blind = !!(u.Blind || u.ublind
        || (((u.HBlinded | 0) || (u.EBlinded | 0)) && !(u.BBlinded | 0)));
    const Invis = !!(u.Invis || (u.HInvis | 0) || (u.EInvis | 0));
    const See_invisible = !!(u.See_invisible || (u.HSee_invisible | 0)
        || (u.ESee_invisible | 0));
    let kn = 0;

    switch (obj.otyp) {
    case POT_CONFUSION:
    case POT_BOOZE:
        await pline('You feel somewhat dizzy.');
        // make_confused body deferred — set Confusion timeout stub
        u.Confusion = (u.Confusion | 0) + rnd(5);
        break;
    case POT_INVISIBILITY:
        // C: if (!Blind && !Invis) pline For an instant...
        if (!Blind && !Invis) {
            kn++;
            await pline(`For an instant you ${
                See_invisible
                    ? 'could see right through yourself'
                    : "couldn't see yourself"
            }!`);
        }
        break;
    case POT_PARALYSIS:
        kn++;
        if (!Free_action) {
            await pline('Something seems to be holding you.');
            nomul(-rnd(5));
            game.multi_reason = 'frozen by a potion';
            game.nomovemsg = 'You can move again.';
            exercise(A_DEX, false);
        } else {
            await pline('You stiffen momentarily.');
        }
        break;
    case POT_SLEEPING:
        kn++;
        if (!Free_action && !Sleep_resistance) {
            await pline('You feel rather tired.');
            nomul(-rnd(5));
            game.multi_reason = 'sleeping off a magical draught';
            game.nomovemsg = 'You can move again.';
            exercise(A_DEX, false);
        } else {
            await pline('You yawn.');
            // monstseesu(M_SEEN_SLEEP) deferred
        }
        break;
    case POT_BLINDNESS:
        kn++;
        // make_blinded deferred — brief Blind stub
        if (!(u.Blind || u.ublind)) await pline('It suddenly gets dark.');
        u.Blinded = (u.Blinded | 0) + rnd(5);
        break;
    case POT_WATER:
        // C: vapor triggers lycanthrope change but does not cure
        if (ismnum(u.ulycn)) {
            if (obj.blessed && (u.umonnum | 0) === (u.ulycn | 0)) {
                await you_unwere(false);
            } else if (obj.cursed && !Upolyd(u)) {
                await you_were();
            }
        }
        break;
    case POT_ACID:
        exercise(A_CON, false);
        break;
    default:
        break;
    }

    // C: if (obj->dknown) { kn ? makeknown : trycall }
    if (obj.dknown) {
        if (kn) makeknown(obj.otyp);
        // trycall deferred when !kn
    }
}

/** C objnam.c otense — plural verb if quan ≠ 1. */
function otense_pot(obj, verb) {
    if ((obj?.quan | 0) !== 1) return verb;
    return vtense(null, verb);
}

/** C objnam.c Tobjnam — The(xname) + optional otense. */
function Tobjnam_pot(obj, verb) {
    let bp = The(xname(obj));
    if (verb) bp += ` ${otense_pot(obj, verb)}`;
    return bp;
}

/** C objnam.c aobjnam — quan prefix + cxname + optional otense. */
function aobjnam_pot(otmp, verb) {
    let bp = cxname(otmp) || '';
    if ((otmp?.quan | 0) !== 1) bp = `${otmp.quan | 0} ${bp}`;
    if (verb) bp += ` ${otense_pot(otmp, verb)}`;
    return bp;
}

/** C hacklib.c s_suffix — it→its, you→your, *s→*', else *'s. */
function s_suffix_pot(s) {
    const buf = String(s ?? '');
    const low = buf.toLowerCase();
    if (low === 'it') return `${buf}s`;
    if (low === 'you') return `${buf}r`;
    if (buf.endsWith('s') || buf.endsWith('S')) return `${buf}'`;
    return `${buf}'s`;
}

/** C hacklib.c upstart — capitalize first letter. */
function upstart_pot(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/** C youprop.h Blind — H||E blinded unless blocked. */
function Blind_pot() {
    const u = game.u || {};
    return !!(u.Blind || u.ublind
        || (((u.HBlinded | 0) || (u.EBlinded | 0)) && !(u.BBlinded | 0)));
}

/** C youprop.h Protection_from_shape_changers. */
function Protection_from_shape_changers_pot() {
    const u = game.u || {};
    return !!(u.HProtection_from_shape_changers
        || u.EProtection_from_shape_changers
        || u.Protection_from_shape_changers);
}

/** C obj.h carried — invent chain; JS invent[] or where. */
function carried_pot(obj) {
    if (!obj) return false;
    if ((obj.where | 0) === OBJ_INVENT) return true;
    return (game.invent || []).includes(obj);
}

/** C mondata.h is_silent — msound == MS_SILENT. */
function is_silent_pot(ptr) {
    return (ptr?.msound | 0) === MS_SILENT;
}

/**
 * C potion.c H2Opotion_dip — holy/unholy water BUC change on targobj
 * (steed saddle splash / #dip water). Unpaid POT_WATER alter_cost /
 * costly_alteration named; mentioned_water makeknown named.
 * @returns {Promise<boolean>}
 */
async function H2Opotion_dip(potion, targobj, useeit, objphrase) {
    if (!potion || (potion.otyp | 0) !== POT_WATER) return false;
    let func = null;
    let glowcolor = null;
    let altfmt = false;
    let res = false;

    if (potion.blessed) {
        if (targobj.cursed) {
            func = uncurse;
            glowcolor = NH_AMBER;
        } else if (!targobj.blessed) {
            func = bless;
            glowcolor = NH_LIGHT_BLUE;
            altfmt = true;
        }
    } else if (potion.cursed) {
        if (targobj.blessed) {
            func = unbless;
            glowcolor = 'brown';
        } else if (!targobj.cursed) {
            func = curse;
            glowcolor = NH_BLACK;
            altfmt = true;
        }
    } else if (carried_pot(targobj)) {
        // gm.mentioned_water / makeknown(POT_WATER) named
        if ((await water_damage(targobj, 0, true)) !== ER_NOTHING) res = true;
    }
    if (func) {
        if (useeit) {
            glowcolor = hcolor(glowcolor);
            if (altfmt) {
                await pline(`${objphrase} with ${an(glowcolor)} aura.`);
            } else {
                await pline(`${objphrase} ${glowcolor}.`);
            }
            targobj.bknown = !Hallucination();
        } else if (!potion.bknown || !potion.dknown) {
            targobj.bknown = 0;
        }
        // unpaid POT_WATER alter_cost / costly_alteration named
        func(targobj);
        res = true;
    }
    return res;
}

/**
 * C potion.c potionhit monster body POT_WATER — undead/were/vamp,
 * gremlin split, iron golem rust. Healing / sickness / confusion /
 * invis / sleep / paralysis / speed / blindness / oil explode / acid /
 * polymorph otyps named.
 */
async function potionhit_mon_water(mon, obj, tx, ty, your_fault) {
    let angermon = your_fault;
    if (mon_hates_blessings(mon) || is_were(mon.data) || is_vampshifter(mon)) {
        if (obj.blessed) {
            await pline(`${Monnam(mon)} ${is_silent_pot(mon.data) ? 'writhes' : 'shrieks'} in pain!`);
            if (!is_silent_pot(mon.data)) {
                await wake_nearto(tx, ty, (mon.data?.mlevel | 0) * 10);
            }
            mon.mhp = (mon.mhp | 0) - d(2, 6);
            if ((mon.mhp | 0) < 1) {
                const { killed } = await import('./uhitm.js');
                await killed(mon);
            } else if (is_were(mon.data) && !is_human(mon.data)) {
                new_were(mon);
            }
        } else if (obj.cursed) {
            angermon = false;
            if (canseemon(mon)) {
                await pline(`${Monnam(mon)} looks healthier.`);
            }
            healmon(mon, d(2, 6), 0);
            if (is_were(mon.data) && is_human(mon.data)
                && !Protection_from_shape_changers_pot()) {
                new_were(mon);
            }
        }
    } else if ((mon.data?.mndx ?? mon.mnum) === PM_GREMLIN) {
        angermon = false;
        const { split_mon } = await import('./sit.js');
        await split_mon(mon, null);
    } else if ((mon.data?.mndx ?? mon.mnum) === PM_IRON_GOLEM) {
        if (canseemon(mon)) await pline(`${Monnam(mon)} rusts.`);
        mon.mhp = (mon.mhp | 0) - d(1, 6);
        if ((mon.mhp | 0) < 1) {
            const { killed } = await import('./uhitm.js');
            await killed(mon);
        }
    }
    return angermon;
}

/**
 * C ref: potion.c potionhit — hero (mon == null → youmonst) plus
 * monster-target crash / saddle / POT_WATER (throwit steed D-1297).
 * Named omit: remaining monster otyp switch (healing, sickness,
 * confusion, invis, sleep, paralysis, speed, blindness, oil explode,
 * acid, polymorph); shop unpaid stolen_value; explode_oil.
 * @param {object|null} mon null = hero
 * @param {object} obj potion missile (consumed)
 * @param {number} how POTHIT_*
 */
export async function potionhit(mon, obj, how) {
    const botlnam = bottlename();
    const isyou = mon == null;
    const u = game.u || {};
    const your_fault = (how | 0) <= POTHIT_HERO_THROW;
    let distance;
    let tx;
    let ty;
    let saddle = null;
    let hit_saddle = false;

    if (isyou) {
        tx = u.ux | 0;
        ty = u.uy | 0;
        distance = 0;
        // C: pline blocks through --More-- while m_throw tmp_at flash still shows
        await pline(`The ${botlnam} crashes on your head and breaks into shards.`);
        const killer = (how === POTHIT_OTHER_THROW)
            ? 'propelled potion'
            : 'thrown potion';
        losehp(maybe_half_phys(rnd(2)), killer, KILLED_BY_AN);
    } else {
        tx = mon.mx | 0;
        ty = mon.my | 0;
        // C potionhit :1645–1651 — sometimes it hits the saddle
        if (((mon.misc_worn_check | 0) & W_SADDLE)
            && (saddle = which_armor(mon, W_SADDLE))
            && (!rn2(10)
                || ((obj.otyp | 0) === POT_WATER
                    && ((rnl(10) > 7 && obj.cursed)
                        || (rnl(10) < 4 && obj.blessed) || !rn2(3))))) {
            hit_saddle = true;
        }
        distance = dist2(u.ux | 0, u.uy | 0, tx, ty);
        if (!cansee(tx, ty)) {
            await pline('Crash!');
        } else {
            const mnam = mon_nam(mon);
            let buf;
            if (hit_saddle && saddle) {
                buf = `${s_suffix_pot(x_monnam(mon, ARTICLE_THE, null,
                    SUPPRESS_IT | SUPPRESS_SADDLE, false))} saddle`;
            } else if (has_head(mon.data)) {
                buf = `${s_suffix_pot(mnam)} ${game.notonhead ? 'body' : 'head'}`;
            } else {
                buf = mnam;
            }
            await pline(`The ${botlnam} crashes on ${buf} and breaks into shards.`);
        }
        if (rn2(5) && (mon.mhp | 0) > 1 && !hit_saddle) mon.mhp--;
    }

    // oil doesn't instantly evaporate; Neither does a saddle hit
    if ((obj.otyp | 0) !== POT_OIL && !hit_saddle && cansee(tx, ty)) {
        if (isyou) {
            await pline(`The ${xname(obj)} evaporates.`);
        } else {
            await pline(`${Tobjnam_pot(obj, 'evaporate')}.`);
        }
    }

    if (isyou) {
        if (obj.otyp === POT_ACID) {
            const Acid_resistance = !!(u.HAcid_resistance || u.EAcid_resistance);
            if (!Acid_resistance) {
                const burn = obj.blessed ? ' a little' : obj.cursed ? ' a lot' : '';
                await pline(`This burns${burn}!`);
                const dmg = d(obj.cursed ? 2 : 1, obj.blessed ? 4 : 8);
                losehp(maybe_half_phys(dmg), 'potion of acid', KILLED_BY_AN);
            }
        }
        // POT_OIL explode / POLYMORPH deferred
    } else if (hit_saddle && saddle) {
        const useeit = !Blind_pot() && canseemon(mon) && cansee(tx, ty);
        const mnam = x_monnam(mon, ARTICLE_THE, null,
            SUPPRESS_IT | SUPPRESS_SADDLE, false);
        const buf = upstart_pot(s_suffix_pot(mnam));
        let affected = false;
        if ((obj.otyp | 0) === POT_WATER) {
            const saddle_glows = `${buf} ${aobjnam_pot(saddle, 'glow')}`;
            affected = await H2Opotion_dip(obj, saddle, useeit, saddle_glows);
        }
        // POT_POLYMORPH saddle named (C empty break)
        if (useeit && !affected) {
            await pline(`${buf} ${aobjnam_pot(saddle, 'get')} wet.`);
        }
    } else {
        let angermon = your_fault;
        if ((obj.otyp | 0) === POT_WATER) {
            angermon = await potionhit_mon_water(mon, obj, tx, ty, your_fault);
        }
        // remaining monster otyp switch named
        if ((mon.mhp | 0) >= 1) {
            if (angermon) await wakeup(mon, true);
            else mon.msleeping = 0;
        }
    }

    const yd = game.youmonst?.data || mons(PM_HUMAN);
    if ((distance === 0 || (distance < 3 && !rn2(Math.trunc((1 + acurr(A_DEX)) / 2))))
        && (!breathless(yd) || haseyes(yd))) {
        await potionbreathe(obj);
    } else if (obj.dknown && cansee(tx, ty)) {
        await trycall(obj);
    }
    // shop unpaid stolen_value / subfrombill named

    // C: obfree — no obj_resists (delobj would burn rn2(100))
    game._thrownobj = null;
    obj_extract_self(obj);
    obj.quan = 0;
    obj.where = 0; // OBJ_FREE
}

