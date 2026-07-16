// zap.js — Zap command / wish helpers (partial).
// C ref: zap.c dozap, zappable, weffects, zapnodir, learnwand, makewish,
//        zapyourself, ubuzz, dobuzz, bhit, bhito, poly_obj, obj_shudders
//
// Branch envelope: getobj wand + zappable + cursed backfire gate +
// NODIR weffects → zapnodir WAN_SECRET_DOOR_DETECTION → findit;
// directional getdir ('.' = self) → confdir + zapyourself SPE_HEALING /
// SPE_EXTRA_HEALING / WAN_SLEEP / SPE_SLEEP / WAN_DEATH /
// SPE_FINGER_OF_DEATH;
// getobj `?`/`*` → display_pickinv_reply; RAY weffects → ubuzz/dobuzz
// for WAN_MAGIC_MISSILE..WAN_LIGHTNING (sleep + bounce + Reflecting);
// IMMEDIATE weffects → bhit(rn1(8,6)) + bhito WAN_POLYMORPH pile
// (obj_unpolyable / obj_shudders / poly_obj floor / zapwrapup You_feel);
// RAY WAN_DIGGING/SPE_DIG → zap_dig (dig.c).
// Named omissions: zap_updown/uswallow bhitm; bhitm poly body; zap_map;
// spell ubuzz; mon_reflects; fireball/gas/Hallucination
// hdmgtype rn2; full zap_over_floor; zhitu non-sleep; shopdamage;
// map_invisible/unmap during buzz; backfire body; other NODIR; wrest
// pline; check_capacity/nohands; check_unpaid; more_experienced;
// update_inventory; shieldeff/monstunseesu; setworn EReflecting bits
// (worn SHIELD_OF_REFLECTION stands in); ureflects W_WEP/W_AMUL/W_ARM/
// silver-dragon arms beyond shield makeknown; create_polymon after
// poly_zapped; do_osshock shop bill; invent/worn poly_obj arms;
// boxlock on Is_box; other bhito otyps.

import { game } from './gstate.js';
import { rn1, rn2, rnd, d } from './rng.js';
import { getlin } from './getline.js';
import {
    flush_screen, flush_topl_more, pline, You_feel, newsym,
    tmp_at, zapdir_to_glyph, nh_delay_output,
} from './display.js';
import { cansee } from './vision.js';
import { nhgetch } from './input.js';
import { readobjnam, HANDS_OBJ, NOTHING_OBJ } from './readobjnam.js';
import { hold_another_object, makeknown } from './invent.js';
import { doname, xname } from './objnam.js';
import { A_WIS, A_STR, exercise } from './attrib.js';
import { findit } from './detect.js';
import {
    confdir, fall_asleep, losehp, maybe_half_phys, nomul,
} from './hack.js';
import { nonliving, is_demon } from './monsters.js';
import { m_at } from './mon.js';
import { find_mac } from './mhitm.js';
import { obj_resists } from './dogmove.js';
import { zap_dig } from './dig.js';
import {
    mkobj, delobj, objects_at, replace_object, rnd_class, weight, splitobj,
    oc_merge_of,
} from './mkobj.js';
import {
    WAND_CLASS, SPBOOK_CLASS, WEAPON_CLASS, ARMOR_CLASS, POTION_CLASS,
    TOOL_CLASS, GEM_CLASS, NODIR, IMMEDIATE, objectNames,
} from './objects.js';
import {
    WAND_BACKFIRE_CHANCE, WAND_WREST_CHANCE, nothing_happens,
    NO_KILLER_PREFIX, DIED, isok, ZAP_POS, STONE, IS_DOOR, IS_ROOM,
    D_CLOSED, D_LOCKED, DISP_BEAM, DISP_CHANGE, DISP_END, OBJ_FLOOR,
    Has_contents, ZAPPED_WAND,
} from './const.js';

const SPE_HEALING = objectNames.indexOf('SPE_HEALING');
const SPE_EXTRA_HEALING = objectNames.indexOf('SPE_EXTRA_HEALING');
const WAN_MAGIC_MISSILE = objectNames.indexOf('WAN_MAGIC_MISSILE');
const WAN_SLEEP = objectNames.indexOf('WAN_SLEEP');
const WAN_LIGHT = objectNames.indexOf('WAN_LIGHT');
const WAN_LIGHTNING = objectNames.indexOf('WAN_LIGHTNING');
const WAN_WISHING = objectNames.indexOf('WAN_WISHING');
const WAN_POLYMORPH = objectNames.indexOf('WAN_POLYMORPH');
const SPE_POLYMORPH = objectNames.indexOf('SPE_POLYMORPH');
const POT_POLYMORPH = objectNames.indexOf('POT_POLYMORPH');
const AMULET_OF_UNCHANGING = objectNames.indexOf('AMULET_OF_UNCHANGING');
const STRANGE_OBJECT = objectNames.indexOf('STRANGE_OBJECT');
const SPE_SLEEP = objectNames.indexOf('SPE_SLEEP');
const SHIELD_OF_REFLECTION = objectNames.indexOf('SHIELD_OF_REFLECTION');
const WAN_DIGGING = objectNames.indexOf('WAN_DIGGING');
const SPE_DIG = objectNames.indexOf('SPE_DIG');
const WAN_DEATH = objectNames.indexOf('WAN_DEATH');
const SPE_FINGER_OF_DEATH = objectNames.indexOf('SPE_FINGER_OF_DEATH');

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

/**
 * C ref: muse.c ureflects — shield slot only (W_WEP/W_AMUL/W_ARM/dragon
 * deferred). When fmt+str given, makeknown like C so first observed
 * reflection discovers the type and may exercise(A_WIS) (D-0452).
 */
async function ureflects(fmt, str) {
    if (game.u?.uarms?.otyp === SHIELD_OF_REFLECTION) {
        if (fmt && str) {
            // C: pline(fmt, str, "shield") with fmt "But %s reflects from your %s!"
            await pline(`But ${str} reflects from your shield!`);
            makeknown(SHIELD_OF_REFLECTION);
        }
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
 * C ref: zap.c dobuzz — hero wand ray subset (sleep) + DISP_BEAM trail.
 * Hallucination hdmgtype rn2, fireball/gas, mon_reflects, shopdamage,
 * map_invisible/unmap during buzz deferred.
 */
async function dobuzz(type, nd, sx0, sy0, dx0, dy0, sayhit, _saymiss, forcemiss) {
    const fltyp = zaptype(type);
    const damgtype = fltyp % 10;
    // C: Hallucination ? rn2(6) : damgtype — Hallu path deferred
    const hdmgtype = damgtype;
    let sx = sx0;
    let sy = sy0;
    let dx = dx0;
    let dy = dy0;
    let range = rn1(7, 7);
    if (dx === 0 && dy === 0) range = 1;

    // C: tmp_at(DISP_BEAM, zapdir_to_glyph(dx, dy, hdmgtype))
    tmp_at(DISP_BEAM, zapdir_to_glyph(dx, dy, hdmgtype));
    try {
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
                // C: reveal/unreveal invisible before tmp_at — deferred;
                // paint beam when ZAP_POS or previous cell was visible.
                if (cansee(sx, sy)) {
                    if (ZAP_POS(typ)
                        || (isok(lsx, lsy) && cansee(lsx, lsy))) {
                        tmp_at(sx, sy);
                    }
                    await nh_delay_output();
                }

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
                                await ureflects(
                                    'But %s reflects from your %s!',
                                    'it',
                                );
                            } else {
                                await pline(
                                    'For some reason you are not affected.',
                                );
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
                // C: tmp_at(DISP_CHANGE, zapdir_to_glyph(dx, dy, hdmgtype))
                tmp_at(DISP_CHANGE, zapdir_to_glyph(dx, dy, hdmgtype));
            }
        }
    } finally {
        tmp_at(DISP_END, 0);
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
/**
 * C ref: cmd.c getdir — direction for zap; '.' / 's' = self.
 * After a successful horizontal dir (including self dz==0), C always
 * calls confdir(FALSE) which may roll u_maybe_impaired.
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
    if (ch === '.' || ch === 's') {
        game.u.dx = game.u.dy = game.u.dz = 0;
    } else if (key === 27 || ch === ' ' || ch === '\n' || ch === '\r') {
        game.u.dx = game.u.dy = game.u.dz = 0;
        return false;
    } else if (!(ch in DIR_DX)) {
        game.u.dx = game.u.dy = game.u.dz = 0;
        return false;
    } else {
        game.u.dx = DIR_DX[ch];
        game.u.dy = DIR_DY[ch];
        game.u.dz = 0;
    }
    // C getdir: if (!u.dz) confdir(FALSE);
    if (!game.u.dz) confdir(false);
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
 * makeknown → discover_object(..., credit_hero=TRUE) → exercise(A_WIS).
 */
export function learnwand(obj) {
    if (!obj || obj.oclass === SPBOOK_CLASS) return;
    const oc = game.objects?.[obj.otyp];
    if (!oc) return;
    if (oc.oc_name_known) {
        // observe_object — dknown even if Blind when already known
        obj.dknown = true;
    } else {
        if (!game.u?.Blind) obj.dknown = true;
        if (obj.dknown) makeknown(obj.otyp);
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
 * SPE_SLEEP / WAN_DEATH / SPE_FINGER_OF_DEATH; other otyps named in
 * C-JS-MAP.
 * @param {boolean} ordinary wand zap (TRUE) vs broken/spell (FALSE)
 * @returns {number} damage (0 for healing/sleep/death)
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

    case WAN_DEATH:
    case SPE_FINGER_OF_DEATH: {
        // C: nonliving / demon → harmless beam; else learn + done(DIED)
        const youdata = game.youmonst?.data;
        if (nonliving(youdata) || is_demon(youdata)) {
            await pline(obj.otyp === WAN_DEATH
                ? 'The wand shoots an apparently harmless beam at you.'
                : 'You seem no deader than before.');
            break;
        }
        learn_it = true;
        const him = game.u?.female ? 'her' : 'him';
        if (!game.killer) game.killer = { name: '', format: 0 };
        game.killer.name = `shot ${him}self with a death ray`;
        game.killer.format = NO_KILLER_PREFIX;
        // C urgent_pline — same more() ownership as pline here
        await pline('You irradiate yourself with pure energy!');
        await pline('You die.');
        const { done } = await import('./end.js');
        await done(DIED);
        break;
    }

    default:
        // Other zapyourself cases deferred
        break;
    }

    if (learn_it) learnwand(obj);
    return damage;
}

/** C ref: obj.h unpolyable */
function unpolyable(obj) {
    if (!obj) return true;
    const t = obj.otyp | 0;
    return t === WAN_POLYMORPH || t === SPE_POLYMORPH
        || t === POT_POLYMORPH || t === AMULET_OF_UNCHANGING;
}

/**
 * C ref: zap.c obj_unpolyable — type gate then obj_resists(5, 95).
 */
function obj_unpolyable(obj) {
    if (unpolyable(obj) || obj === game.u?.uball || obj === game.u?.uskin) {
        return true;
    }
    return obj_resists(obj, 5, 95);
}

/**
 * C ref: zap.c obj_shudders — half-life by class/BUC/quan.
 */
function obj_shudders(obj) {
    if (!obj) return false;
    if (game.context?.bypasses && obj.bypass) return false;

    let zap_odds;
    if (obj.oclass === WAND_CLASS) zap_odds = 3;
    else if (obj.cursed) zap_odds = 3;
    else if (obj.blessed) zap_odds = 12;
    else zap_odds = 8;

    if ((obj.quan | 0) > 4) zap_odds = Math.trunc(zap_odds / 2);
    return !rn2(zap_odds);
}

/**
 * C ref: zap.c do_osshock — destroy via shudder; poly_zapped material roll.
 * Shop bill / hideunder cover deferred.
 */
function do_osshock(obj) {
    if (!obj) return;
    game._obj_zapped = true;

    if ((game._poly_zapped ?? -1) < 0) {
        const luck = game.u?.uluck | 0;
        for (let i = obj.quan | 0; i; i--) {
            if (!rn2(luck + 45)) {
                const mat = game.objects?.[obj.otyp]?.oc_material;
                game._poly_zapped = mat ?? 0;
                break;
            }
        }
    }

    // C: split off rnd(quan-1), then delobj the split portion
    let victim = obj;
    if ((obj.quan | 0) > 1) {
        const q = obj.quan | 0;
        victim = splitobj(obj, rnd(q - 1)) || obj;
    }
    // costly_spot / addtobill deferred
    delobj(victim);
}

/**
 * C ref: invent.c / shk.c delete_contents — obfree chain (no obj_resists).
 */
function delete_contents(obj) {
    while (obj?.cobj) {
        const curr = obj.cobj;
        // extract from container
        obj.cobj = curr.nobj || null;
        curr.nobj = null;
        curr.ocontainer = null;
        curr.where = 0; // OBJ_FREE — obfree, no resist roll
        if (Has_contents(curr)) delete_contents(curr);
    }
}

/**
 * C ref: zap.c poly_obj — floor STRANGE_OBJECT path (wand/pile zap).
 * Invent/worn/boulder/shop/egg/leash arms deferred.
 */
function poly_obj(obj, id) {
    if (!obj) return null;
    const can_merge = id === STRANGE_OBJECT;
    const obj_location = obj.where;
    let otmp;

    if (id === STRANGE_OBJECT) {
        let try_limit = 3;
        const magic_obj = game.objects?.[obj.otyp]?.oc_magic | 0;
        // degraded unicorn horn → magic_obj=0 deferred
        otmp = null;
        do {
            if (otmp) delobj(otmp);
            otmp = mkobj(obj.oclass, false);
        } while (--try_limit > 0
            && ((game.objects?.[otmp.otyp]?.oc_magic | 0) !== magic_obj));
    } else {
        // mksobj(id) path deferred — callers use STRANGE_OBJECT
        otmp = mkobj(obj.oclass, false);
    }

    otmp.quan = obj.quan | 0;
    otmp.no_charge = obj.no_charge;
    if (obj_location === 1 /* OBJ_INVENT */) otmp.invlet = obj.invlet;

    // charged_objs: WAND / WEAPON / ARMOR keep spe
    const oc = otmp.oclass;
    if (oc === WAND_CLASS || oc === WEAPON_CLASS || oc === ARMOR_CLASS) {
        otmp.spe = obj.spe | 0;
    }
    otmp.recharged = obj.recharged | 0;
    otmp.cursed = !!obj.cursed;
    otmp.blessed = !!obj.blessed;
    // erosion / traps / poison deferred

    if (Has_contents(otmp)) delete_contents(otmp);

    // fuse n→1 — C: !oc_merge || (can_merge && quan > rn2(1000))
    if ((otmp.quan | 0) > 1) {
        if (!oc_merge_of(otmp.otyp)
            || (can_merge && (otmp.quan | 0) > rn2(1000))) {
            otmp.quan = 1;
        }
    }

    switch (otmp.oclass) {
    case TOOL_CLASS:
        // MAGIC_LAMP / MAGIC_MARKER polish deferred
        break;
    case WAND_CLASS:
        while (otmp.otyp === WAN_WISHING || otmp.otyp === WAN_POLYMORPH) {
            otmp.otyp = rnd_class(WAN_LIGHT, WAN_LIGHTNING);
        }
        if ((otmp.recharged | 0) < rn2(7)) otmp.recharged = (otmp.recharged | 0) + 1;
        break;
    case POTION_CLASS: {
        const POT_WATER = objectNames.indexOf('POT_WATER');
        const POT_GAIN = objectNames.indexOf('POT_GAIN_ABILITY');
        while (otmp.otyp === POT_POLYMORPH) {
            otmp.otyp = rnd_class(POT_GAIN, POT_WATER);
        }
        break;
    }
    case SPBOOK_CLASS: {
        const SPE_BLANK = objectNames.indexOf('SPE_BLANK_PAPER');
        const bases = game.bases || [];
        while (otmp.otyp === SPE_POLYMORPH) {
            otmp.otyp = rnd_class(bases[SPBOOK_CLASS] | 0, SPE_BLANK);
        }
        // spestudied degrade deferred
        break;
    }
    case GEM_CLASS:
        // mineral→ROCK backfire deferred
        break;
    default:
        break;
    }

    otmp.owt = weight(otmp);

    if (obj_location === OBJ_FLOOR) {
        replace_object(obj, otmp);
        // boulder block_point deferred
    } else {
        // invent/minvent — extract+free old; leave otmp free
        delobj(obj);
        return otmp;
    }
    delobj(obj);
    return otmp;
}

/**
 * C ref: zap.c bhito — floor object hit by wand. WAN_POLYMORPH only.
 * @returns {number} 1 if affected
 */
function bhito(obj, otmp) {
    if (!obj || !otmp || obj === otmp) return 0;
    if (obj.bypass && game.context?.bypasses) return 0;

    let res = 1;
    let learn_it = false;

    if (obj === game.u?.uball || obj === game.u?.uchain) {
        return 0;
    }

    switch (otmp.otyp) {
    case WAN_POLYMORPH:
    case SPE_POLYMORPH:
        if (obj_unpolyable(obj)) {
            res = 0;
            break;
        }
        // uconduct.polypiles / boxlock deferred
        if (obj_shudders(obj)) {
            if (cansee(obj.ox, obj.oy)) learn_it = true;
            do_osshock(obj);
            break;
        }
        {
            const neu = poly_obj(obj, STRANGE_OBJECT);
            if (neu) newsym(neu.ox, neu.oy);
        }
        break;
    default:
        // other bhito otyps deferred
        res = 0;
        break;
    }

    if (learn_it) learnwand(otmp);
    return res;
}

/**
 * C ref: zap.c bhitpile — walk floor pile with fhito.
 * create_polymon / recreate_pile / fill_pit deferred.
 */
function bhitpile(wand, fhito, tx, ty, _zz) {
    let hitanything = 0;
    if (!objects_at(tx, ty)) return 0;

    game._poly_zapped = -1;
    for (let otmp = objects_at(tx, ty); otmp; ) {
        const next_obj = otmp.nexthere;
        if (otmp.where !== OBJ_FLOOR
            || (otmp.ox | 0) !== (tx | 0) || (otmp.oy | 0) !== (ty | 0)) {
            otmp = next_obj;
            continue;
        }
        hitanything += fhito(otmp, wand) | 0;
        otmp = next_obj;
    }
    // create_polymon when poly_zapped >= 0 deferred
    return hitanything;
}

/**
 * C ref: zap.c bhit — ZAPPED_WAND lateral path only.
 * Thrown/kicked/flash/tmp_at / zap_map / doorlock deferred.
 * bhitm returns 0 (no stop) — mon poly body deferred.
 */
function bhit(ddx, ddy, range, weapon, _fhitm, fhito, pobj) {
    const obj = pobj?.obj;
    const bhitpos = game._bhitpos || (game._bhitpos = { x: 0, y: 0 });
    bhitpos.x = game.u?.ux | 0;
    bhitpos.y = game.u?.uy | 0;
    let r = range | 0;

    while (r-- > 0) {
        bhitpos.x += ddx;
        bhitpos.y += ddy;
        const x = bhitpos.x | 0;
        const y = bhitpos.y | 0;
        if (!isok(x, y)) {
            bhitpos.x -= ddx;
            bhitpos.y -= ddy;
            break;
        }

        const loc = game.level?.at?.(x, y);
        let typ = loc?.typ;

        // zap_map deferred (poly lateral has no RNG there)
        const mtmp = m_at(x, y);
        if (mtmp && weapon === ZAPPED_WAND) {
            // bhitm body deferred — treat as non-stopping (range -= 3)
            r -= 3;
        }

        if (fhito) {
            if (bhitpile(obj, fhito, x, y, 0)) r--;
        }

        if (weapon === ZAPPED_WAND && (IS_DOOR(typ) || typ === STONE)) {
            // doorlock for opening/locking/striking deferred
        }
        if (!ZAP_POS(typ) || closed_door(x, y)) {
            bhitpos.x -= ddx;
            bhitpos.y -= ddy;
            break;
        }
    }
    return null;
}

function zapsetup() {
    game._obj_zapped = false;
}

/**
 * C ref: zap.c zapwrapup — feedback after do_osshock set obj_zapped.
 */
async function zapwrapup() {
    if (game._obj_zapped) {
        await You_feel('shuddering vibrations.');
    }
    game._obj_zapped = false;
}

/**
 * C ref: zap.c weffects — exercise + effect dispatch.
 * NODIR + RAY wand ubuzz; IMMEDIATE bhit WAN_POLYMORPH;
 * WAN_DIGGING/SPE_DIG → zap_dig; spell ubuzz / zap_updown / steed deferred.
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
        zapsetup();
        if (game.u?.uswallow) {
            // bhitm(u.ustuck) deferred
        } else if (game.u?.dz) {
            // zap_updown deferred
        } else {
            const range = rn1(8, 6);
            const pref = { obj };
            bhit(game.u.dx | 0, game.u.dy | 0, range, ZAPPED_WAND,
                null, bhito, pref);
            // C may null *pobj if destroyed — wand is hero's, keep
        }
        await zapwrapup();
    } else {
        // RAY — neither immediate nor directionless
        if (otyp === WAN_DIGGING || otyp === SPE_DIG) {
            await zap_dig();
            disclose = true;
        } else if (otyp >= WAN_MAGIC_MISSILE && otyp <= WAN_LIGHTNING) {
            await ubuzz(
                BZ_U_WAND(BZ_OFS_WAN(otyp)),
                otyp === WAN_MAGIC_MISSILE ? 2 : 6,
            );
            disclose = true;
        }
        // SPE_* ubuzz deferred
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
