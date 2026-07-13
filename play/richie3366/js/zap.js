// zap.js — Zap command / wish helpers (partial).
// C ref: zap.c dozap, zappable, weffects, zapnodir, learnwand, makewish,
//        zapyourself
//
// Branch envelope: getobj wand + zappable + cursed backfire gate +
// NODIR weffects → zapnodir WAN_SECRET_DOOR_DETECTION → findit;
// directional getdir ('.' = self) → zapyourself SPE_HEALING /
// SPE_EXTRA_HEALING / WAN_SLEEP / SPE_SLEEP.
// Named omissions: IMMEDIATE/RAY weffects (bhit/ubuzz/zap_dig);
// other zapyourself otyps; backfire body; other NODIR
// (light/create/wish/enlighten/stasis); wrest pline;
// check_capacity/nohands poly; check_unpaid; more_experienced;
// update_inventory; Blind glow The(xname) article edge cases;
// shieldeff/monstunseesu display.

import { game } from './gstate.js';
import { rn1, rn2, rnd, d } from './rng.js';
import { getlin } from './getline.js';
import { flush_screen, pline, You_feel } from './display.js';
import { nhgetch } from './input.js';
import { readobjnam, HANDS_OBJ, NOTHING_OBJ } from './readobjnam.js';
import { hold_another_object, discover_object } from './invent.js';
import { doname, xname } from './objnam.js';
import { A_WIS, A_STR, exercise } from './attrib.js';
import { findit } from './detect.js';
import { fall_asleep, losehp, maybe_half_phys } from './hack.js';
import {
    WAND_CLASS, SPBOOK_CLASS, NODIR, objectNames,
} from './objects.js';
import {
    WAND_BACKFIRE_CHANCE, WAND_WREST_CHANCE, nothing_happens,
    NO_KILLER_PREFIX,
} from './const.js';

const SPE_HEALING = objectNames.indexOf('SPE_HEALING');
const SPE_EXTRA_HEALING = objectNames.indexOf('SPE_EXTRA_HEALING');
const WAN_SLEEP = objectNames.indexOf('WAN_SLEEP');
const SPE_SLEEP = objectNames.indexOf('SPE_SLEEP');

const DIR_DX = { h: -1, l: 1, j: 0, k: 0, y: -1, u: 1, b: -1, n: 1 };
const DIR_DY = { h: 0, l: 0, j: 1, k: -1, y: -1, u: -1, b: 1, n: 1 };

/** C ref: youprop.h Sleep_resistance */
function Sleep_resistance() {
    const u = game.u || {};
    return !!(u.HSleep_resistance || u.ESleep_resistance);
}

function Blind() {
    return !!(game.u?.Blind || game.u?.ublind);
}

/** C ref: objnam.c The — capitalize the(str) for glow cancel pline. */
function The_name(str) {
    if (!str) return str;
    // Most wand xnames are "wand of …" → "The wand of …"
    if (/^[A-Z]/.test(str)) return str;
    return `The ${str}`;
}

/**
 * C ref: potion.c healup — add HP; optional sick/blind cure.
 * Kept here for zapyourself without potion.js → weapon.js cycle via spell.
 */
function healup(nhp, nxtra, curesick, cureblind) {
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
        u.ucreamed = 0;
        u.Blinded = 0;
    }
    if (curesick) u.Sick = 0;
}

const MAXWISHTRY = 5;
const WAN_SECRET_DOOR_DETECTION =
    objectNames.indexOf('WAN_SECRET_DOOR_DETECTION');

/** Invent letters of zappable wands (C zap_ok → GETOBJ_SUGGEST). */
function zap_lets() {
    const inv = game.invent || [];
    const lets = [];
    for (const o of inv) {
        if (o.oclass === WAND_CLASS && o.invlet) lets.push(o.invlet);
    }
    lets.sort();
    return lets.join('');
}

/**
 * C ref: cmd.c getdir for zap — '.' is self (dx=dy=dz=0, success).
 * Esc/space/return cancel. lock.js getdir still treats '.' as cancel.
 */
async function getdir_zap(prompt) {
    const msg = prompt || 'In what direction?';
    game._pending_message = `${msg} `;
    await flush_screen(1);
    const disp = game.nhDisplay;
    if (disp?.setCursor) disp.setCursor(game._pending_message.length, 0);
    const key = await nhgetch();
    const ch = String.fromCharCode(key);
    game._pending_message = '';
    if (!game.u) game.u = {};
    if (ch === '.') {
        game.u.dx = game.u.dy = game.u.dz = 0;
        return true;
    }
    if (key === 27 || ch === ' ' || ch === '\n' || ch === '\r') {
        game.u.dx = game.u.dy = game.u.dz = 0;
        return false;
    }
    if (!(ch in DIR_DX)) {
        game.u.dx = game.u.dy = game.u.dz = 0;
        return false;
    }
    game.u.dx = DIR_DX[ch];
    game.u.dy = DIR_DY[ch];
    game.u.dz = 0;
    return true;
}

/**
 * C ref: invent.c getobj("zap", zap_ok, GETOBJ_NOFLAGS)
 */
async function getobj_zap() {
    const lets = zap_lets();
    const query = lets
        ? `What do you want to zap? [${lets} or ?*]`
        : 'What do you want to zap? [*]';
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
        await pline('Never mind.');
        return null;
    }

    const otmp = (game.invent || []).find(o => o.invlet === ch);
    if (!otmp) {
        await pline("You don't have that object.");
        return null;
    }
    if (otmp.oclass !== WAND_CLASS) {
        await pline('You can\'t zap that!');
        return null;
    }
    return otmp;
}

/**
 * C ref: zap.c zappable — consume a charge; wrest path when spe==0.
 * @returns {number} 1 if zap available
 */
export function zappable(wand) {
    if (wand.spe < 0 || (wand.spe === 0 && rn2(WAND_WREST_CHANCE)))
        return 0;
    if (wand.spe === 0) {
        // You wrest one last charge… — message deferred until needed
    }
    wand.spe--;
    return 1;
}

/**
 * C ref: zap.c learnwand — discover type when effect observed + dknown.
 */
export function learnwand(obj) {
    if (!obj || obj.oclass === SPBOOK_CLASS) return;
    const oc = game.objects?.[obj.otyp];
    if (!oc) return;
    if (oc.oc_name_known) {
        if (!game.u?.Blind) obj.dknown = true;
    } else {
        if (!game.u?.Blind) obj.dknown = true;
        if (obj.dknown) discover_object(obj.otyp, true, true);
    }
    // update_inventory deferred
}

/**
 * C ref: zap.c zapnodir — NODIR wand effects.
 * Branch envelope: WAN_SECRET_DOOR_DETECTION → findit only.
 */
async function zapnodir(obj) {
    let known = false;

    switch (obj.otyp) {
    case WAN_SECRET_DOOR_DETECTION:
        known = !!obj.dknown;
        await findit();
        break;
    default:
        // light / create / wish / enlighten / stasis deferred
        break;
    }

    if (known) {
        const oc = game.objects?.[obj.otyp];
        if (oc && !oc.oc_name_known) {
            // more_experienced(0, 10) deferred
        }
        learnwand(obj);
    }
}

/**
 * C ref: zap.c zapyourself — self-directed wand/spell effects.
 * Branch envelope: SPE_HEALING / SPE_EXTRA_HEALING / WAN_SLEEP /
 * SPE_SLEEP; other otyps named in C-JS-MAP.
 * @param {boolean} ordinary wand zap (TRUE) vs broken/spell (FALSE)
 * @returns {number} damage (0 for healing/sleep)
 */
export async function zapyourself(obj, ordinary) {
    if (!obj) return 0;
    let learn_it = false;
    let damage = 0;

    switch (obj.otyp) {
    case SPE_HEALING:
    case SPE_EXTRA_HEALING:
        learn_it = true;
        healup(
            d(6, obj.otyp === SPE_EXTRA_HEALING ? 8 : 4),
            0,
            false,
            !!(obj.blessed || obj.otyp === SPE_EXTRA_HEALING),
        );
        await You_feel(`${obj.otyp === SPE_EXTRA_HEALING ? 'much ' : ''}better.`);
        break;

    case WAN_SLEEP:
    case SPE_SLEEP:
        learn_it = true;
        if (Sleep_resistance()) {
            // shieldeff / monstseesu deferred (no RNG)
            await pline("You don't feel sleepy!");
        } else {
            if (ordinary) await pline('The sleep ray hits you!');
            else await pline('You fall asleep!');
            // monstunseesu deferred
            fall_asleep(-rnd(50), true);
        }
        break;

    default:
        // Other zapyourself cases deferred
        break;
    }

    if (learn_it) learnwand(obj);
    return damage;
}

/**
 * C ref: zap.c weffects — exercise + effect dispatch.
 * NODIR only; IMMEDIATE/RAY deferred after exercise.
 */
async function weffects(obj) {
    const otyp = obj.otyp;
    const oc = game.objects?.[otyp];
    exercise(A_WIS, true);

    // steed down-zap deferred
    if (oc?.oc_dir === NODIR) {
        await zapnodir(obj);
    }
    // IMMEDIATE / RAY / dig / buzz deferred
}

/**
 * C ref: zap.c dozap / #zap ('z')
 * @returns {Promise<number>} 0 = cancel/no turn, 1 = took time
 */
export async function dozap() {
    // nohands / check_capacity deferred (humanoid start always ok)
    const obj = await getobj_zap();
    if (!obj) return 0;

    // check_unpaid deferred
    const oc = game.objects?.[obj.otyp];
    const need_dir = oc && oc.oc_dir !== NODIR;

    if (!zappable(obj)) {
        await pline(nothing_happens);
    } else if (obj.cursed && !rn2(WAND_BACKFIRE_CHANCE)) {
        // backfire body deferred — still exercise like C then stop
        exercise(A_STR, false);
        return 1;
    } else if (need_dir && !(await getdir_zap(null))) {
        // cancel direction — still paid a charge via zappable
        if (!Blind()) {
            await pline(`${The_name(xname(obj))} glows and fades.`);
        }
    } else if (need_dir && !(game.u.dx || game.u.dy || game.u.dz)) {
        const damage = await zapyourself(obj, true);
        if (damage) {
            // killer_xname deferred — xname sufficient for early kits
            const buf = `zapped ${game.u?.female ? 'her' : 'him'}self with ${xname(obj)}`;
            losehp(maybe_half_phys(damage), buf, NO_KILLER_PREFIX);
        }
    } else {
        game.current_wand = obj;
        await weffects(obj);
        game.current_wand = null;
    }

    if (obj && obj.spe < 0) {
        // turn to dust / useupall deferred
    }
    // update_inventory deferred
    return 1;
}

/**
 * C ref: zap.c makewish — prompt + readobjnam + hold_another_object.
 * Help / history / livelog / terrain-wish paths deferred.
 */
export async function makewish() {
    const nothing = NOTHING_OBJ;
    let tries = 0;
    let buf = '';

    if (game.flags?.verbose) {
        await pline('You may wish for an object.');
    }

    for (;;) {
        let prompt = 'For what do you wish';
        if (game.flags?.cmdassist && tries > 0) {
            prompt += " (enter 'help' for assistance)";
        }
        prompt += '?';
        buf = await getlin(prompt);
        if (!buf || buf === '\x1b') {
            buf = '';
            break;
        }
        buf = String(buf).trim().replace(/\s+/g, ' ');
        if (/^help$/i.test(buf)) {
            // wishcmdassist deferred
            buf = '';
            continue;
        }
        break;
    }

    let otmp = readobjnam(buf, nothing);
    if (!otmp) {
        await pline('Nothing fitting that description exists in the game.');
        if (++tries < MAXWISHTRY) {
            // retry omitted for single-shot session wishes; fall through
        }
        // C: after MAXWISHTRY, random readobjnam(NULL) — deferred
        return;
    }
    if (otmp === nothing) return;
    if (otmp === HANDS_OBJ) return;

    if (!game.u) game.u = {};
    if (!game.u.uconduct) game.u.uconduct = {};
    game.u.uconduct.wishes = (game.u.uconduct.wishes | 0) + 1;

    // C: hold_another_object(otmp, oops_msg, The(aobjnam(...)), NULL)
    // Simplified message path: prinv via hold when successful.
    const verb = 'drop';
    const oops = `Oops!  %s to the floor!`;
    await hold_another_object(otmp, oops, `The ${doname(otmp)} ${verb}s`, null);

    game.u.ublesscnt = (game.u.ublesscnt | 0) + rn1(100, 50);
}
