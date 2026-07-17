// muse.js — Monster item use.
// C ref: muse.c find_offensive / use_offensive (MUSE_POT_* throw +
// MUSE_WAN_STRIKING mbhit); find_defensive / find_misc / use_misc.

import { game } from './gstate.js';
import { rn2, rn1, rnd, d } from './rng.js';
import { cansee, couldsee } from './vision.js';
import { pline, mon_visible, see_with_infrared } from './display.js';
import { Monnam } from './do_name.js';
import { doname, singular, an, xname } from './objnam.js';
import { dist2, distmin, m_at } from './mon.js';
import { lined_up, m_throw } from './mthrowu.js';
import { is_animal, mindless, nohands, is_floater, needspick, nonliving, is_vampshifter, monsterNames } from './monsters.js';
import {
    objectNames, POTION_CLASS, WAND_CLASS, SPEED_BOOTS,
    SCROLL_CLASS, AMULET_CLASS, TOOL_CLASS, FOOD_CLASS,
} from './objects.js';
import { observe_object, makeknown } from './invent.js';
import { losehp, nomul } from './hack.js';
import { finish_losehp_done } from './end.js';
import { m_seenres, monstseesu, monstunseesu } from './mondata.js';
import {
    BOLT_LIM, MSLOW, MFAST, isok, u_at, ZAP_POS, IS_DOOR,
    D_LOCKED, D_CLOSED, KILLED_BY_AN, ANTIMAGIC, M_SEEN_MAGR,
    OBJ_FLOOR,
} from './const.js';

const POT_PARALYSIS = objectNames.indexOf('POT_PARALYSIS');
const POT_BLINDNESS = objectNames.indexOf('POT_BLINDNESS');
const POT_CONFUSION = objectNames.indexOf('POT_CONFUSION');
const POT_SLEEPING = objectNames.indexOf('POT_SLEEPING');
const POT_ACID = objectNames.indexOf('POT_ACID');
const POT_SPEED = objectNames.indexOf('POT_SPEED');
const POT_HEALING = objectNames.indexOf('POT_HEALING');
const POT_EXTRA_HEALING = objectNames.indexOf('POT_EXTRA_HEALING');
const POT_FULL_HEALING = objectNames.indexOf('POT_FULL_HEALING');
const POT_POLYMORPH = objectNames.indexOf('POT_POLYMORPH');
const POT_GAIN_LEVEL = objectNames.indexOf('POT_GAIN_LEVEL');
const POT_INVISIBILITY = objectNames.indexOf('POT_INVISIBILITY');
const WAN_SPEED_MONSTER = objectNames.indexOf('WAN_SPEED_MONSTER');
const WAN_STRIKING = objectNames.indexOf('WAN_STRIKING');
const WAN_MAKE_INVISIBLE = objectNames.indexOf('WAN_MAKE_INVISIBLE');
const WAN_DIGGING = objectNames.indexOf('WAN_DIGGING');
const WAN_POLYMORPH = objectNames.indexOf('WAN_POLYMORPH');
const WAN_UNDEAD_TURNING = objectNames.indexOf('WAN_UNDEAD_TURNING');
const WAN_TELEPORTATION = objectNames.indexOf('WAN_TELEPORTATION');
const WAN_CREATE_MONSTER = objectNames.indexOf('WAN_CREATE_MONSTER');
const SCR_TELEPORTATION = objectNames.indexOf('SCR_TELEPORTATION');
const SCR_CREATE_MONSTER = objectNames.indexOf('SCR_CREATE_MONSTER');
const SCR_EARTH = objectNames.indexOf('SCR_EARTH');
const SCR_FIRE = objectNames.indexOf('SCR_FIRE');
const AMULET_OF_LIFE_SAVING = objectNames.indexOf('AMULET_OF_LIFE_SAVING');
const AMULET_OF_REFLECTION = objectNames.indexOf('AMULET_OF_REFLECTION');
const AMULET_OF_GUARDING = objectNames.indexOf('AMULET_OF_GUARDING');
const PICK_AXE = objectNames.indexOf('PICK_AXE');
const UNICORN_HORN = objectNames.indexOf('UNICORN_HORN');
const FROST_HORN = objectNames.indexOf('FROST_HORN');
const FIRE_HORN = objectNames.indexOf('FIRE_HORN');
const EXPENSIVE_CAMERA = objectNames.indexOf('EXPENSIVE_CAMERA');
const CLOAK_OF_MAGIC_RESISTANCE = objectNames.indexOf('CLOAK_OF_MAGIC_RESISTANCE');
const GRAY_DRAGON_SCALE_MAIL = objectNames.indexOf('GRAY_DRAGON_SCALE_MAIL');
const GRAY_DRAGON_SCALES = objectNames.indexOf('GRAY_DRAGON_SCALES');
const PM_GHOST = monsterNames.indexOf('PM_GHOST');
const PM_KI_RIN = monsterNames.indexOf('PM_KI_RIN');
const AT_GAZE = 15;
const RAY = 3; // objclass.h oc_dir

/** C muse.c offense codes (subset). */
const MUSE_WAN_STRIKING = 7;
const MUSE_POT_PARALYSIS = 9;
const MUSE_POT_BLINDNESS = 10;
const MUSE_POT_CONFUSION = 11;
const MUSE_POT_ACID = 14;
const MUSE_POT_SLEEPING = 16;

/** C muse.c misc codes used here. */
const MUSE_WAN_SPEED_MONSTER = 7;
const MUSE_POT_SPEED = 8;

/** C hack.h WAND_BACKFIRE_CHANCE */
const WAND_BACKFIRE_CHANCE = 100;

function sgn(n) {
    return n < 0 ? -1 : n > 0 ? 1 : 0;
}

function canseemon(mtmp) {
    if (!mtmp) return false;
    if (!(cansee(mtmp.mx, mtmp.my) || see_with_infrared(mtmp))) return false;
    return mon_visible(mtmp);
}

function attacktype(ptr, aatyp) {
    const mattk = ptr?.mattk || [];
    for (let i = 0; i < mattk.length; i++) {
        if (mattk[i]?.aatyp === aatyp) return true;
    }
    return false;
}

/**
 * C ref: muse.c searches_for_item — intelligent non-animals seek useful loot.
 * Named omissions: onscary underfoot floor gate; FOOD_CLASS corpse/tin/egg
 * bodies; Is_container/Is_mbag/can_blow polish; touch_petrifies paths.
 */
export function searches_for_item(mon, obj) {
    if (!mon || !obj) return false;
    const typ = obj.otyp;
    const ptr = mon.data;

    // C: protected floor item onscary — deferred (onscary stub elsewhere)
    if (obj.where === OBJ_FLOOR
        && obj.ox === mon.mx && obj.oy === mon.my) {
        // onscary(obj.ox, obj.oy, mon) deferred → treat as not scary
    }

    if (is_animal(ptr) || mindless(ptr)
        || (ptr?.mndx ?? -1) === PM_GHOST) {
        return false;
    }

    if (typ === WAN_MAKE_INVISIBLE || typ === POT_INVISIBILITY) {
        return !mon.minvis && !mon.invis_blkd && !attacktype(ptr, AT_GAZE);
    }
    if (typ === WAN_SPEED_MONSTER || typ === POT_SPEED) {
        return (mon.mspeed | 0) !== MFAST;
    }

    switch (obj.oclass) {
    case WAND_CLASS: {
        if ((obj.spe | 0) <= 0) return false;
        if (typ === WAN_DIGGING) return !is_floater(ptr);
        if (typ === WAN_POLYMORPH) {
            return (ptr?.difficulty | 0) < 6;
        }
        const oc = game.objects?.[typ];
        if ((oc?.oc_dir | 0) === RAY
            || typ === WAN_STRIKING
            || typ === WAN_UNDEAD_TURNING
            || typ === WAN_TELEPORTATION
            || typ === WAN_CREATE_MONSTER) {
            return true;
        }
        break;
    }
    case POTION_CLASS:
        if (typ === POT_HEALING || typ === POT_EXTRA_HEALING
            || typ === POT_FULL_HEALING || typ === POT_POLYMORPH
            || typ === POT_GAIN_LEVEL || typ === POT_PARALYSIS
            || typ === POT_SLEEPING || typ === POT_ACID || typ === POT_CONFUSION) {
            return true;
        }
        if (typ === POT_BLINDNESS && !attacktype(ptr, AT_GAZE)) return true;
        break;
    case SCROLL_CLASS:
        if (typ === SCR_TELEPORTATION || typ === SCR_CREATE_MONSTER
            || typ === SCR_EARTH || typ === SCR_FIRE) {
            return true;
        }
        break;
    case AMULET_CLASS:
        if (typ === AMULET_OF_LIFE_SAVING) {
            return !(nonliving(ptr) || is_vampshifter(mon));
        }
        if (typ === AMULET_OF_REFLECTION || typ === AMULET_OF_GUARDING) {
            return true;
        }
        break;
    case TOOL_CLASS:
        if (typ === PICK_AXE) return needspick(ptr);
        if (typ === UNICORN_HORN) {
            return !obj.cursed && ptr?.mlet !== 'S_UNICORN'
                && (ptr?.mndx ?? -1) !== PM_KI_RIN;
        }
        if (typ === FROST_HORN || typ === FIRE_HORN) {
            // can_blow deferred → allow when charged
            return (obj.spe | 0) > 0;
        }
        // Is_container / camera deferred
        if (typ === EXPENSIVE_CAMERA) return (obj.spe | 0) > 0;
        break;
    case FOOD_CLASS:
        // corpse/tin/egg arms deferred
        break;
    default:
        break;
    }
    return false;
}

function mdistu(mtmp) {
    const u = game.u;
    if (!u || mtmp.mx == null) return 0;
    return dist2(mtmp.mx, mtmp.my, u.ux, u.uy);
}

/**
 * C ref: youprop.h Antimagic — HAntimagic || EAntimagic.
 * oc_oprop via setworn deferred; match worn MR cloak / gray dragon armor
 * like Displaced cloak special-case.
 */
function Antimagic() {
    const u = game.u || {};
    if (u.Antimagic || u.HAntimagic || u.EAntimagic) return true;
    if (u.uprops?.[ANTIMAGIC]?.intrinsic || u.uprops?.[ANTIMAGIC]?.extrinsic) {
        return true;
    }
    const cloak = u.uarmc;
    if (cloak && cloak.otyp === CLOAK_OF_MAGIC_RESISTANCE) return true;
    const body = u.uarm;
    if (body && (body.otyp === GRAY_DRAGON_SCALE_MAIL
        || body.otyp === GRAY_DRAGON_SCALES)) return true;
    return false;
}

function museState() {
    if (!game._muse) {
        game._muse = {
            offensive: null, has_offense: 0,
            defensive: null, has_defense: 0,
            misc: null, has_misc: 0,
        };
    }
    return game._muse;
}

/**
 * C ref: muse.c find_offensive — potion throw + WAN_STRIKING subset.
 * Other wand/horn/scroll/camera offense deferred (C-JS-MAP).
 *
 * C `#define nomore(x) if (has_offense == x) continue` — once a type is
 * selected, later invent objects hit that nomore and skip the rest of their
 * checks. Plain overwrite (JS old) let a later POT_* beat an earlier
 * WAN_STRIKING; C keeps the wand (D-0258).
 */
export function find_offensive(mtmp) {
    const m = museState();
    m.offensive = null;
    m.has_offense = 0;

    if (!mtmp || mtmp.mpeaceful) return false;
    const data = mtmp.data;
    if (!data || is_animal(data) || mindless(data) || nohands(data)) {
        return false;
    }
    const u = game.u || {};
    if (u.uswallow) return false;
    // in_your_sanctuary / AD_HEAL naked-heal deferred → treat as open
    if (!lined_up(mtmp)) return false;

    for (let obj = mtmp.minvent; obj; obj = obj.nobj) {
        // reflection_skip ray wands deferred (WAN_DEATH…MISSILE nomores)
        // C: nomore(MUSE_WAN_STRIKING) before striking / teleport / potions
        if (m.has_offense === MUSE_WAN_STRIKING) continue;
        if (obj.otyp === WAN_STRIKING && (obj.spe | 0) > 0
            && !m_seenres(mtmp, M_SEEN_MAGR)) {
            m.offensive = obj;
            m.has_offense = MUSE_WAN_STRIKING;
        }
        // WAN_TELEPORTATION / undead-turning deferred (their nomores too)
        if (m.has_offense === MUSE_POT_PARALYSIS) continue;
        if (obj.otyp === POT_PARALYSIS && (game.multi | 0) >= 0) {
            m.offensive = obj;
            m.has_offense = MUSE_POT_PARALYSIS;
        }
        if (m.has_offense === MUSE_POT_BLINDNESS) continue;
        if (obj.otyp === POT_BLINDNESS) {
            // AT_GAZE deferral: still allow (gnome has no gaze)
            m.offensive = obj;
            m.has_offense = MUSE_POT_BLINDNESS;
        }
        if (m.has_offense === MUSE_POT_CONFUSION) continue;
        if (obj.otyp === POT_CONFUSION) {
            m.offensive = obj;
            m.has_offense = MUSE_POT_CONFUSION;
        }
        if (m.has_offense === MUSE_POT_SLEEPING) continue;
        if (obj.otyp === POT_SLEEPING) {
            // m_seenres(M_SEEN_SLEEP) deferred → always eligible
            m.offensive = obj;
            m.has_offense = MUSE_POT_SLEEPING;
        }
        if (m.has_offense === MUSE_POT_ACID) continue;
        if (obj.otyp === POT_ACID) {
            m.offensive = obj;
            m.has_offense = MUSE_POT_ACID;
        }
    }
    return m.has_offense !== 0;
}

/**
 * C ref: muse.c mbhitm — WAN_STRIKING hits-you / mon subset.
 * Teleport/undead-turning/cancel arms deferred; mon-target resist/hit
 * plines beyond dice burn deferred.
 */
async function mbhitm(mtmp, otmp, hits_you) {
    if (!hits_you && otmp.otyp === WAN_STRIKING) {
        mtmp.msleeping = 0;
        // seemimic deferred
    }
    if (otmp.otyp !== WAN_STRIKING) return 0;

    let learnit = false;
    if (hits_you) {
        const u = game.u || {};
        if (Antimagic()) {
            // C: monstseesu(M_SEEN_MAGR); shieldeff deferred
            monstseesu(M_SEEN_MAGR);
            await pline('Boing!');
            learnit = true;
        } else if (
            rnd(20) < 10 + (u.uac ?? 10)
            && !(game._buzzer && !game._buzzer.mwandexp)
        ) {
            monstunseesu(M_SEEN_MAGR);
            // C: pline then losehp — await hit --More-- before damage/death
            await pline('The wand hits you!');
            let tmp = d(2, 12);
            if (u.HHalf_spell_damage || u.EHalf_spell_damage || u.Half_spell_damage) {
                tmp = Math.trunc((tmp + 1) / 2);
            }
            // C losehp → done(DIED) noreturn — finish death before return
            losehp(tmp, 'wand', KILLED_BY_AN);
            if (game.program_state?.gameover) {
                await finish_losehp_done();
                return 0;
            }
            learnit = true;
        } else {
            await pline('The wand misses you.');
        }
        // stop_occupation deferred
        nomul(0);
        if (learnit && game._zap_oseen) makeknown(WAN_STRIKING);
    } else {
        // mon-target: resists_magm / find_mac / resist deferred → burn hit check
        if (rnd(20) < 10 + 10) {
            d(2, 12);
            learnit = true;
        }
        if (learnit && game._zap_oseen && cansee(mtmp.mx, mtmp.my)) {
            makeknown(WAN_STRIKING);
        }
    }
    return 0;
}

/**
 * C ref: muse.c mbhit — mon wand beam toward mux/muy.
 * Named omissions: fhito_loc / drawbridge / doorlock; map_invisible.
 */
async function mbhit(mon, range, obj) {
    const bhitpos = game._bhitpos || (game._bhitpos = { x: 0, y: 0 });
    bhitpos.x = mon.mx;
    bhitpos.y = mon.my;
    const ddx = sgn((mon.mux ?? game.u?.ux) - mon.mx);
    const ddy = sgn((mon.muy ?? game.u?.uy) - mon.my);
    let r = range;

    while (r-- > 0) {
        bhitpos.x += ddx;
        bhitpos.y += ddy;
        const x = bhitpos.x;
        const y = bhitpos.y;
        if (!isok(x, y)) {
            bhitpos.x -= ddx;
            bhitpos.y -= ddy;
            break;
        }
        if (u_at(x, y)) {
            await mbhitm(null, obj, true);
            // C: fatal losehp never returns — stop beam after hero death
            if (game.program_state?.gameover) return;
            r -= 3;
        } else {
            const mtmp = m_at(x, y);
            if (mtmp) {
                await mbhitm(mtmp, obj, false);
                r -= 3;
            }
        }
        // fhito_loc / destroy_drawbridge / doorlock deferred
        const loc = game.level?.at?.(x, y);
        const ltyp = loc?.typ;
        if (!ZAP_POS(ltyp)
            || (IS_DOOR(ltyp) && loc
                && ((loc.doormask || 0) & (D_LOCKED | D_CLOSED)))) {
            bhitpos.x -= ddx;
            bhitpos.y -= ddy;
            break;
        }
    }
}

/**
 * C ref: muse.c use_offensive — potion hurls + WAN_STRIKING mbhit
 * (return 2 = spent turn). Other wand/horn/scroll cases deferred.
 */
export async function use_offensive(mtmp) {
    const m = museState();
    const otmp = m.offensive;
    if (!otmp) return 0;

    if (otmp.oclass !== POTION_CLASS) {
        const i = precheck(mtmp, otmp);
        if (i !== 0) return i;
    }

    const oseen = canseemon(mtmp);
    switch (m.has_offense) {
    case MUSE_WAN_STRIKING: {
        game._zap_oseen = oseen;
        // Await zap/hit plines — unawaited more() races and steals keys (D-0261)
        await mzapwand(mtmp, otmp, false);
        game._buzzer = mtmp;
        await mbhit(mtmp, rn1(8, 6), otmp);
        game._buzzer = null;
        // C: mbhitm fatal losehp never returns to use_offensive
        if (game.program_state?.gameover) return 1;
        mtmp.mwandexp = true;
        return (mtmp.mhp | 0) < 1 ? 1 : 2;
    }
    case MUSE_POT_PARALYSIS:
    case MUSE_POT_BLINDNESS:
    case MUSE_POT_CONFUSION:
    case MUSE_POT_SLEEPING:
    case MUSE_POT_ACID:
        if (cansee(mtmp.mx, mtmp.my)) {
            observe_object(otmp);
            await pline(`${Monnam(mtmp)} hurls ${singular(otmp, doname)}!`);
        }
        await m_throw(
            mtmp, mtmp.mx, mtmp.my,
            sgn((mtmp.mux ?? game.u?.ux) - mtmp.mx),
            sgn((mtmp.muy ?? game.u?.uy) - mtmp.my),
            distmin(mtmp.mx, mtmp.my, mtmp.mux ?? game.u?.ux, mtmp.muy ?? game.u?.uy),
            otmp,
        );
        return (mtmp.mhp | 0) < 1 ? 1 : 2;
    default:
        return 0;
    }
}

/**
 * C ref: muse.c find_defensive — early gates only.
 * Healing / unicorn horn / flee stairs / tryescape arms deferred.
 */
export function find_defensive(mtmp, tryescape) {
    const m = museState();
    m.defensive = null;
    m.has_defense = 0;

    if (!mtmp?.data) return false;
    if (is_animal(mtmp.data) || mindless(mtmp.data)) return false;
    if (!tryescape
        && dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy) > 25) {
        return false;
    }
    if (game.u?.uswallow && mtmp === game.u?.ustuck) return false;
    // Named omission: mconf/mstun horn/lizard; blindness healing;
    // undead-turning; wounded peaceful m_use_healing; flee stairs/traps.
    return false;
}

/**
 * C ref: muse.c find_misc — speed self-buff subset.
 * Named omission: poly trap, gain-level, invis, poly wand/potion,
 * bullwhip rn2(5), bag rn2(5)/loot.
 */
export function find_misc(mtmp) {
    const m = museState();
    m.misc = null;
    m.has_misc = 0;

    if (!mtmp?.data) return false;
    if (is_animal(mtmp.data) || mindless(mtmp.data)) return false;
    if (game.u?.uswallow && mtmp === game.u?.ustuck) return false;
    if (dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy) > 36) return false;
    if (nohands(mtmp.data)) return false;

    for (let obj = mtmp.minvent; obj; obj = obj.nobj) {
        if (obj.otyp === WAN_SPEED_MONSTER && (obj.spe | 0) > 0
            && mtmp.mspeed !== MFAST && !mtmp.isgd) {
            m.misc = obj;
            m.has_misc = MUSE_WAN_SPEED_MONSTER;
        }
        if (obj.otyp === POT_SPEED
            && mtmp.mspeed !== MFAST && !mtmp.isgd) {
            m.misc = obj;
            m.has_misc = MUSE_POT_SPEED;
        }
    }
    return m.has_misc !== 0;
}

/**
 * C ref: muse.c precheck — cursed wand backfire gate (potion milky/smoky deferred).
 * Non-fatal backfire clears muse selection and returns 0 like C; death/m_useup
 * body named omission (still burns d(spe+2,6)).
 */
function precheck(mon, obj) {
    if (!obj) return 0;
    if (obj.oclass === WAND_CLASS && obj.cursed
        && !rn2(WAND_BACKFIRE_CHANCE)) {
        d((obj.spe | 0) + 2, 6);
        const m = museState();
        m.has_defense = 0;
        m.has_offense = 0;
        m.has_misc = 0;
        return 0;
    }
    return 0;
}

/**
 * C ref: muse.c mzapwand — message + charge--; unseen charge forget deferred.
 */
async function mzapwand(mtmp, otmp, self) {
    if ((otmp.spe | 0) < 1) return;
    if (!canseemon(mtmp)) {
        const range = couldsee(mtmp.mx, mtmp.my)
            ? (BOLT_LIM + 1) : (BOLT_LIM - 3);
        const near = mdistu(mtmp) <= range * range;
        await pline(`You hear a ${near ? 'nearby' : 'distant'} zap.`);
        // unknow_object deferred
    } else if (self) {
        // monverbself("zap") simplified
        await pline(`${Monnam(mtmp)} zaps ${doname(otmp)}!`);
    } else {
        // C: pline_mon("%s zaps %s!", Monnam, an(xname(otmp)))
        // C xname_flags observe_object sets dknown before WAND descr arm.
        // Full observe (discover_object) deferred — dknown alone for appearance.
        if (!game.u?.Blind) otmp.dknown = 1;
        await pline(`${Monnam(mtmp)} zaps ${an(xname(otmp))}!`);
        // stop_occupation deferred
    }
    otmp.spe = (otmp.spe | 0) - 1;
}

/**
 * C ref: worn.c mon_adjust_speed — adjust/permspeed/mspeed + boots FAST.
 * learnwand / pline discovery deferred (give_msg path still sets speed).
 */
export function mon_adjust_speed(mon, adjust, _obj) {
    if (!mon) return;
    switch (adjust) {
    case 2:
        mon.permspeed = MFAST;
        break;
    case 1:
        if (mon.permspeed === MSLOW) mon.permspeed = 0;
        else mon.permspeed = MFAST;
        break;
    case 0:
        break;
    case -1:
        if (mon.permspeed === MFAST) mon.permspeed = 0;
        else mon.permspeed = MSLOW;
        break;
    case -2:
        mon.permspeed = MSLOW;
        break;
    case -3:
    case -4:
        if (mon.permspeed === MFAST) mon.permspeed = 0;
        break;
    default:
        break;
    }

    let boots = null;
    for (let otmp = mon.minvent; otmp; otmp = otmp.nobj) {
        // oc_oprop FAST not extracted; SPEED_BOOTS is the only FAST armor
        if (otmp.owornmask && otmp.otyp === SPEED_BOOTS) {
            boots = otmp;
            break;
        }
    }
    mon.mspeed = boots ? MFAST : (mon.permspeed | 0);
}

/**
 * C ref: muse.c use_misc — WAN/POT_SPEED only (return 2 = spent turn).
 */
export async function use_misc(mtmp) {
    const m = museState();
    const otmp = m.misc;
    const i = precheck(mtmp, otmp);
    if (i !== 0) return i;
    if (!m.has_misc || !m.misc) return 0;

    switch (m.has_misc) {
    case MUSE_WAN_SPEED_MONSTER:
        await mzapwand(mtmp, m.misc, true);
        mon_adjust_speed(mtmp, 1, m.misc);
        return 2;
    case MUSE_POT_SPEED:
        mon_adjust_speed(mtmp, 1, m.misc);
        {
            const pot = m.misc;
            if ((pot.quan | 0) > 1) pot.quan -= 1;
            else if (mtmp.minvent === pot) mtmp.minvent = pot.nobj;
            else {
                for (let p = mtmp.minvent; p; p = p.nobj) {
                    if (p.nobj === pot) {
                        p.nobj = pot.nobj;
                        break;
                    }
                }
            }
        }
        return 2;
    default:
        return 0;
    }
}
