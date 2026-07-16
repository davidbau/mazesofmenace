// zap.js — Zap command / wish helpers (partial).
// C ref: zap.c dozap, zappable, weffects, zapnodir, learnwand, makewish,
//        zapyourself, ubuzz, dobuzz
//
// Branch envelope: getobj wand + zappable + cursed backfire gate +
// NODIR weffects → zapnodir WAN_SECRET_DOOR_DETECTION → findit;
// directional getdir ('.' = self) → zapyourself SPE_HEALING /
// SPE_EXTRA_HEALING / WAN_SLEEP / SPE_SLEEP;
// getobj `?`/`*` → display_pickinv_reply; RAY weffects → ubuzz/dobuzz
// for WAN_MAGIC_MISSILE..WAN_LIGHTNING (sleep + bounce + Reflecting).
// Named omissions: IMMEDIATE/bhit/zap_dig; spell ubuzz; mon_reflects;
// fireball/gas/Hallucination hdmgtype; full zap_over_floor; zhitu
// non-sleep; shopdamage; beam glyphs/tmp_at; backfire body; other NODIR;
// wrest pline; check_capacity/nohands; check_unpaid; more_experienced;
// update_inventory; shieldeff/monstunseesu; setworn EReflecting bits
// (worn SHIELD_OF_REFLECTION stands in).

import { game } from './gstate.js';
import { rn1, rn2, rnd, d } from './rng.js';
import { getlin } from './getline.js';
import { flush_screen, flush_topl_more, pline, You_feel } from './display.js';
import { cansee } from './vision.js';
import { nhgetch } from './input.js';
import { readobjnam, HANDS_OBJ, NOTHING_OBJ } from './readobjnam.js';
import { hold_another_object, discover_object } from './invent.js';
import { doname, xname } from './objnam.js';
import { A_WIS, A_STR, exercise } from './attrib.js';
import { findit } from './detect.js';
import { fall_asleep, losehp, maybe_half_phys, nomul } from './hack.js';
import { m_at } from './mon.js';
import { find_mac } from './mhitm.js';
import {
    WAND_CLASS, SPBOOK_CLASS, NODIR, IMMEDIATE, objectNames,
} from './objects.js';
import {
    WAND_BACKFIRE_CHANCE, WAND_WREST_CHANCE, nothing_happens,
    NO_KILLER_PREFIX, isok, ZAP_POS, STONE, IS_DOOR, IS_ROOM, D_CLOSED, D_LOCKED,
} from './const.js';

const SPE_HEALING = objectNames.indexOf('SPE_HEALING');
const SPE_EXTRA_HEALING = objectNames.indexOf('SPE_EXTRA_HEALING');
const WAN_MAGIC_MISSILE = objectNames.indexOf('WAN_MAGIC_MISSILE');
const WAN_SLEEP = objectNames.indexOf('WAN_SLEEP');
const WAN_LIGHTNING = objectNames.indexOf('WAN_LIGHTNING');
const SPE_SLEEP = objectNames.indexOf('SPE_SLEEP');
const SHIELD_OF_REFLECTION = objectNames.indexOf('SHIELD_OF_REFLECTION');

const ZT_SLEEP = 3; // AD_SLEE - 1

const DIR_DX = { h: -1, l: 1, j: 0, k: 0, y: -1, u: 1, b: -1, n: 1 };
const DIR_DY = { h: 0, l: 0, j: 1, k: -1, y: -1, u: -1, b: 1, n: 1 };

/** C ref: youprop.h Sleep_resistance */
function Sleep_resistance() {
    const u = game.u || {};
    return !!(u.HSleep_resistance || u.ESleep_resistance);
}

/**
 * C ref: youprop.h Reflecting — setworn EReflecting deferred; worn
 * SHIELD_OF_REFLECTION matches Healer starter kit (D-0450).
 */
function Reflecting() {
    const u = game.u || {};
    if (u.HReflecting || u.EReflecting) return true;
    return u.uarms?.otyp === SHIELD_OF_REFLECTION;
}

function Blind() {
    return !!(game.u?.Blind || game.u?.ublind);
}

function closed_door(x, y) {
    const loc = game.level?.at?.(x, y);
    if (!loc || !IS_DOOR(loc.typ)) return false;
    return !!((loc.doormask || 0) & (D_CLOSED | D_LOCKED));
}

function u_at(x, y) {
    return game.u?.ux === x && game.u?.uy === y;
}

/** C ref: zap.c zaptype — abs with monster-wand fixup. */
function zaptype(type) {
    let t = type | 0;
    if (t <= -30 && t >= -39) t += 30;
    return Math.abs(t);
}

/** C ref: hack.h BZ_OFS_WAN / BZ_U_WAND */
function BZ_OFS_WAN(otyp) {
    return Math.abs((otyp | 0) - WAN_MAGIC_MISSILE) % 10;
}
function BZ_U_WAND(bztyp) {
    return 0 + (bztyp | 0);
}

/** C ref: zap.c flash_types subset for wand 0..5 */
function flash_str(fltyp) {
    const names = [
        'magic missile', 'bolt of fire', 'bolt of cold', 'sleep ray',
        'death ray', 'bolt of lightning',
    ];
    return names[zaptype(fltyp) % 10] || 'ray';
}

/** C ref: muse.c ureflects — shield slot only. */
async function ureflects(fmt, str) {
    if (game.u?.uarms?.otyp === SHIELD_OF_REFLECTION) {
        // C: pline(fmt, str, "shield") with fmt "But %s reflects from your %s!"
        await pline(`But ${str} reflects from your shield!`);
        return true;
    }
    return false;
}

/**
 * C ref: zap.c zap_hit — rn2(20) vs AC_VALUE(ac).
 * spell_hit_bonus deferred (type always 0 for wand rays here).
 */
function zap_hit(ac, _type) {
    const chance = rn2(20);
    if (!chance) return rnd(10) < (ac | 0);
    // C: AC_VALUE — positive as-is; negative → -rnd(-ac)
    let a = ac | 0;
    if (a < 0) a = -rnd(-a);
    return 3 - chance < a;
}

/** C ref: zap.c bounce_dir */
function bounce_dir(sx, sy, ddx, ddy, bounceback) {
    let dx = ddx;
    let dy = ddy;
    if (!dx || !dy || (bounceback > 0 && !rn2(bounceback))) {
        return { dx: -dx, dy: -dy };
    }
    let bounce = 0;
    const lsy = sy - dy;
    const lsx = sx - dx;
    const typAt = (x, y) => game.level?.at?.(x, y)?.typ;
    const rmn1 = typAt(sx, lsy);
    if (isok(sx, lsy) && ZAP_POS(rmn1)
        && !closed_door(sx, lsy)
        && (IS_ROOM(rmn1) || (isok(sx + dx, lsy) && ZAP_POS(typAt(sx + dx, lsy))))) {
        bounce = 1;
    }
    const rmn2 = typAt(lsx, sy);
    if (isok(lsx, sy) && ZAP_POS(rmn2)
        && !closed_door(lsx, sy)
        && (IS_ROOM(rmn2) || (isok(lsx, sy + dy) && ZAP_POS(typAt(lsx, sy + dy))))) {
        if (!bounce || rn2(2)) bounce = 2;
    }
    switch (bounce) {
    case 0:
        dx = -dx;
        dy = -dy;
        break;
    case 1:
        dy = -dy;
        break;
    case 2:
        dx = -dx;
        break;
    }
    return { dx, dy };
}

/**
 * C ref: mhitm.c sleep_monst subset — resists_sleep deferred to false
 * for unknown; mfrozen path only.
 */
function sleep_monst_zap(mon, amt) {
    if (!mon) return 0;
    if (mon.mcanmove) {
        mon.meating = 0;
        amt = (amt | 0) + (mon.mfrozen | 0);
        if (amt > 0) {
            mon.mcanmove = 0;
            mon.mfrozen = Math.min(amt, 127);
        } else {
            mon.msleeping = 1;
        }
        return 1;
    }
    return 0;
}

/**
 * C ref: zap.c zhitm ZT_SLEEP only.
 * @returns {number} damage (0 for sleep)
 */
function zhitm_sleep(mon, type, nd) {
    sleep_monst_zap(
        mon,
        d(nd, 25),
    );
    // type unused beyond wand-class how= — mimic/resist deferred
    void type;
    return 0;
}

/**
 * C ref: zap.c zhitu ZT_SLEEP only.
 */
async function zhitu_sleep(nd) {
    if (Sleep_resistance()) {
        await pline("You don't feel sleepy.");
    } else {
        fall_asleep(-d(nd, 25), true);
    }
}

/**
 * C ref: zap.c dobuzz — hero wand ray subset (sleep).
 * Hallucination hdmgtype, fireball/gas, mon_reflects, shopdamage,
 * tmp_at glyphs deferred.
 */
async function dobuzz(type, nd, sx0, sy0, dx0, dy0, sayhit, _saymiss, forcemiss) {
    const fltyp = zaptype(type);
    const damgtype = fltyp % 10;
    let sx = sx0;
    let sy = sy0;
    let dx = dx0;
    let dy = dy0;
    let range = rn1(7, 7);
    if (dx === 0 && dy === 0) range = 1;

    while (range-- > 0) {
        const lsx = sx;
        const lsy = sy;
        sx += dx;
        sy += dy;
        const loc = game.level?.at?.(sx, sy);
        const typ = loc?.typ;
        let do_bounce = false;

        if (!isok(sx, sy) || typ === STONE) {
            do_bounce = true;
        } else {
            // zap_over_floor sleep: closed door absorbs (rangemod -1000)
            if (closed_door(sx, sy)) {
                await pline('The door absorbs your bolt!');
                range += -1000;
            }

            const mon = m_at(sx, sy);
            if (mon) {
                if (!forcemiss && zap_hit(find_mac(mon), 0)) {
                    // mon_reflects deferred
                    if (damgtype === ZT_SLEEP) {
                        zhitm_sleep(mon, type, nd);
                        if (sayhit) {
                            await pline(`The ${flash_str(fltyp)} hits it.`);
                        }
                    }
                    range -= 2;
                }
            } else if (u_at(sx, sy) && range >= 0) {
                nomul(0);
                if (!forcemiss && zap_hit(game.u?.uac ?? 10, 0)) {
                    range -= 2;
                    await pline(`The ${flash_str(fltyp)} hits you!`);
                    if (Reflecting()) {
                        if (!Blind()) {
                            await ureflects('But %s reflects from your %s!', 'it');
                        } else {
                            await pline('For some reason you are not affected.');
                        }
                        dx = -dx;
                        dy = -dy;
                    } else if (damgtype === ZT_SLEEP) {
                        await zhitu_sleep(nd);
                    }
                } else if (!Blind()) {
                    await pline(`The ${flash_str(fltyp)} whizzes by you!`);
                }
                nomul(0);
            }

            if (!ZAP_POS(typ) || (closed_door(sx, sy) && range >= 0)) {
                do_bounce = true;
            }
        }

        if (do_bounce) {
            // C: bounce_dir always runs once in make_bounce; pline only when
            // (--range > 0 && cansee previous). Cardinal bounce uses no rn2.
            const bchance = (!isok(sx, sy) || typ === STONE) ? 10 : 75;
            if ((--range > 0 && isok(lsx, lsy) && cansee(lsx, lsy))) {
                await pline(`The ${flash_str(fltyp)} bounces!`);
            }
            const bd = bounce_dir(sx, sy, dx, dy, bchance);
            dx = bd.dx;
            dy = bd.dy;
        }
    }
}

/** C ref: zap.c ubuzz */
async function ubuzz(type, nd) {
    const u = game.u;
    await dobuzz(type, nd, u.ux, u.uy, u.dx, u.dy, true, false, false);
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
 * `?`/`*` → display_pickinv_reply (D-0450).
 */
async function getobj_zap() {
    const { display_pickinv_reply } = await import('./invent.js');
    for (;;) {
        await flush_topl_more();
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
            const picked = await display_pickinv_reply(ch === '*' ? '*' : lets);
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
            if (otmp.oclass !== WAND_CLASS) {
                await pline("You can't zap that!");
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
        if (otmp.oclass !== WAND_CLASS) {
            await pline("You can't zap that!");
            return null;
        }
        game._pending_message = '';
        return otmp;
    }
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
 * NODIR + RAY wand ubuzz; IMMEDIATE/dig/spell ubuzz deferred.
 */
async function weffects(obj) {
    const otyp = obj.otyp;
    const oc = game.objects?.[otyp];
    let disclose = false;
    const was_unkn = !oc?.oc_name_known;

    exercise(A_WIS, true);

    // steed down-zap deferred
    if (oc?.oc_dir === NODIR) {
        await zapnodir(obj);
    } else if (oc?.oc_dir === IMMEDIATE) {
        // bhit / zap_updown deferred
    } else {
        // RAY — neither immediate nor directionless
        if (otyp >= WAN_MAGIC_MISSILE && otyp <= WAN_LIGHTNING) {
            await ubuzz(
                BZ_U_WAND(BZ_OFS_WAN(otyp)),
                otyp === WAN_MAGIC_MISSILE ? 2 : 6,
            );
            disclose = true;
        }
        // SPE_* ubuzz / zap_dig deferred
    }
    if (disclose) {
        learnwand(obj);
        if (was_unkn) {
            // more_experienced(0, 10) deferred
        }
    }
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
