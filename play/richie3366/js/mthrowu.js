// mthrowu.js — Monster ranged throw/shoot (partial).
// C ref: mthrowu.c thrwmm / thrwmu / monshoot / m_throw / ohitmon / thitu /
//         lined_up / m_lined_up / spitmm / spitmu / breamm / breamu /
//         u_catch_thrown_obj / ucatchgem / drop_throw / return_from_mtoss.

import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';
import {
    distmin, dist2, m_at, m_carrying, seemimic, setmangry, wake_nearto,
} from './mon.js';
import {
    COLNO, ROWNO, BOLT_LIM, MON_POLE_DIST, PET_MISSILE_RANGE2, IS_OBSTRUCTED, IS_DOOR,
    D_CLOSED, D_LOCKED, IRONBARS, IS_SINK,
    NEED_WEAPON, NEED_RANGED_WEAPON, SLT_ENCUMBER, Is_rogue_level, W_WEP,
    POTHIT_MONST_THROW, POTHIT_OTHER_THROW, LAVAWALL, IS_WATERWALL, Upolyd, M_AP_TYPE,
    M_AP_NOTHING, M_AP_MONSTER, u_at, P_NONE,
    DISP_FLASH, DISP_END, DISP_TETHER, BACKTRACK, XKILL_NOMSG,
    ARM, FOOT, HAND, AKLYS_LIM, WT_SPLASH_THRESHOLD,
    M_ATTK_MISS, M_ATTK_HIT, EDOG,
    BZ_OFS_AD, BZ_VALID_ADTYP, BZ_M_BREATH, M_SEEN_REFL,
    BRK_BY_HERO, BRK_MELEE, W_NONDIGGABLE, WT_IRON_BALL_INCR,
    P_BOW, P_CROSSBOW, P_DART, P_SHURIKEN, P_SPEAR, P_KNIFE,
    Has_contents, KILLED_BY, TIMEOUT, STONED, EYE, FACE,
} from './const.js';
import { cansee, couldsee, clear_path } from './vision.js';
import { worm_known } from './worm.js';
import {
    place_object, splitobj, stackobj, obj_extract_self, delobj, objects_at, sobj_at,
    mksobj, weight, is_flammable,
} from './mkobj.js';
import { observe_object, makeknown, hold_another_object } from './invent.js';
import {
    MON_WEP, select_rwep, mon_wield_item, monmulti, dmgval, hitval,
    should_mulch_missile, autoreturn_weapon,
} from './weapon.js';
import { find_mac, mondied, monkilled, shade_miss, AT_WEAP, AT_SPIT } from './mhitm.js';
import { xkilled, can_blnd } from './uhitm.js';
import { mswings_verb } from './mhitu.js';
import { ammo_and_launcher, is_launcher, is_pole, mwelded } from './wield.js';
import { acurr, acurrstr, A_DEX, A_STR, exercise, poisoned } from './attrib.js';
import { calc_capacity, Blind } from './invent.js';
import { losehp, nomul, maybe_half_phys, dissolve_bars, is_pool, is_lava, stop_occupation } from './hack.js';
import { finish_losehp_done } from './end.js';
import {
    pline, pline_The, pline_mon, mon_visible, see_with_infrared, tmp_at, obj_glyph,
    nh_delay_output, newsym, canspotmon, impossible, set_msg_xy,
} from './display.js';
import { Monnam, mon_nam, s_suffix as s_suffix_ucatch, some_mon_nam, hliquid } from './do_name.js';
import {
    nohands, mons, pmnames, throws_rocks, MZ_MEDIUM, MZ_TINY, nonliving,
    is_unicorn, touch_petrifies, bigmonst, is_elf, poly_when_stoned,
    eyecount, resists_acid, resists_ston, mon_hates_silver,
    noncorporeal, amorphous, is_vampshifter, passes_walls, unsolid,
} from './monsters.js';
import { xname, singular, an, vtense, the, makeplural, mshot_xname, killer_xname, obj_is_pname, otense, simpleonames, distant_name } from './objnam.js';
import { stone_missile } from './dothrow.js';
import { spec_abon } from './artifact.js';
import { minstapetrify } from './trap.js';
import { munstone } from './muse.js';
import { Soundeffect } from './sndprocs.js';
import { se_splat_egg } from './generated/seffects_data.js';
import { mbodypart, body_part, polymon } from './polyself.js';
import {
    VENOM_CLASS, POTION_CLASS, WEAPON_CLASS, GEM_CLASS, TOOL_CLASS,
    ARMOR_CLASS, ROCK_CLASS, FOOD_CLASS, SPBOOK_CLASS, WAND_CLASS,
    BALL_CLASS, CHAIN_CLASS, COIN_CLASS, SCROLL_CLASS,
    objectNames, is_poisonable,
} from './objects.js';
import {
    PM_MONK, PM_ROGUE, PM_HUMAN, monsterNames,
} from './generated/monsters_data.js';
import { potionhit, make_stoned } from './potion.js';
import { make_blinded } from './do.js';
import { dobuzz, resists_poison } from './zap.js';
import {
    m_seenres, cvt_adtyp_to_mseenres, get_atkdam_type, mhim,
} from './mondata.js';
import { extract_from_minvent } from './worn.js';
import { freehand } from './engrave.js';

const BOULDER = objectNames.indexOf('BOULDER');
const HEAVY_IRON_BALL = objectNames.indexOf('HEAVY_IRON_BALL');
const WAR_HAMMER = objectNames.indexOf('WAR_HAMMER');
const POT_ACID = objectNames.indexOf('POT_ACID');
const STATUE = objectNames.indexOf('STATUE');
const CORPSE = objectNames.indexOf('CORPSE');
const MEAT_STICK = objectNames.indexOf('MEAT_STICK');
const ENORMOUS_MEATBALL = objectNames.indexOf('ENORMOUS_MEATBALL');
const SKELETON_KEY = objectNames.indexOf('SKELETON_KEY');
const LOCK_PICK = objectNames.indexOf('LOCK_PICK');
const CREDIT_CARD = objectNames.indexOf('CREDIT_CARD');
const TALLOW_CANDLE = objectNames.indexOf('TALLOW_CANDLE');
const WAX_CANDLE = objectNames.indexOf('WAX_CANDLE');
const AKLYS = objectNames.indexOf('AKLYS');
const LENSES = objectNames.indexOf('LENSES');
const TIN_WHISTLE = objectNames.indexOf('TIN_WHISTLE');
const MAGIC_WHISTLE = objectNames.indexOf('MAGIC_WHISTLE');
const SLING = objectNames.indexOf('SLING');
const EUCALYPTUS_LEAF = objectNames.indexOf('EUCALYPTUS_LEAF');
const KELP_FROND = objectNames.indexOf('KELP_FROND');
const SPRIG_OF_WOLFSBANE = objectNames.indexOf('SPRIG_OF_WOLFSBANE');
const FORTUNE_COOKIE = objectNames.indexOf('FORTUNE_COOKIE');
const PANCAKE = objectNames.indexOf('PANCAKE');
const RUBBER_HOSE = objectNames.indexOf('RUBBER_HOSE');
const BAG_OF_TRICKS = objectNames.indexOf('BAG_OF_TRICKS');
const SACK = objectNames.indexOf('SACK');
const OILSKIN_SACK = objectNames.indexOf('OILSKIN_SACK');
const BAG_OF_HOLDING = objectNames.indexOf('BAG_OF_HOLDING');
const WAN_STRIKING = objectNames.indexOf('WAN_STRIKING');
const BLINDING_VENOM = objectNames.indexOf('BLINDING_VENOM');
const ACID_VENOM = objectNames.indexOf('ACID_VENOM');
const EGG = objectNames.indexOf('EGG');
const CREAM_PIE = objectNames.indexOf('CREAM_PIE');
const ELVEN_BOW = objectNames.indexOf('ELVEN_BOW');
const ELVEN_ARROW = objectNames.indexOf('ELVEN_ARROW');
const PM_STONE_GOLEM = monsterNames.indexOf('PM_STONE_GOLEM');
/** C youprop.h BlindedTimeout — HBlinded & TIMEOUT (apply.js idiom). */
function BlindedTimeout() {
    return (game.u?.HBlinded | 0) & TIMEOUT;
}
/** C ref: objects.h FIRST_GLASS_GEM / LAST_GLASS_GEM (mhitm.js idiom). */
const FIRST_GLASS_GEM = objectNames.indexOf('WORTHLESS_WHITE_GLASS');
const LAST_GLASS_GEM = objectNames.indexOf('WORTHLESS_VIOLET_GLASS');
/** C objclass.h arm_gloves + materials.h. */
const ARM_GLOVES = 3;
const LEATHER = 7;
const CLOTH = 6;
const SILVER = 14;
const GOLD = 15;
/** C ref: monattk.h — spit / breath damage types. */
const AD_BLND = 11;
const AD_DRST = 7;
const AD_ACID = 8;
const AD_SLEE = 4;

/** C ref: mthrowu.c breathwep[] — Hallucination rnd_hallublast deferred. */
const BREATHWEP = [
    'fragments', 'fire', 'frost', 'sleep gas', 'a disintegration blast',
    'lightning', 'poison gas', 'acid', 'strange breath #8',
    'strange breath #9',
];

/** C ref: mthrowu.c hallublasts[] — hallucinatory ray types. */
const HALLUBLASTS = [
    'asteroids', 'beads', 'bubbles', 'butterflies', 'champagne', 'chaos',
    'coins', 'cotton candy', 'crumbs', 'dark matter', 'darkness', 'data',
    'dust specks', 'emoticons', 'emotions', 'entropy', 'flowers', 'foam',
    'fog', 'gamma rays', 'gelatin', 'gemstones', 'ghosts', 'glass shards',
    'glitter', 'good vibes', 'gravel', 'gravity', 'gravy', 'grawlixes',
    'holy light', 'hornets', 'hot air', 'hyphens', 'hypnosis', 'infrared',
    'insects', 'jargon', 'laser beams', 'leaves', 'lightening', 'logic gates',
    'magma', 'marbles', 'mathematics', 'megabytes', 'metal shavings',
    'metapatterns', 'meteors', 'mist', 'mud', 'music', 'nanites', 'needles',
    'noise', 'nostalgia', 'oil', 'paint', 'photons', 'pixels', 'plasma',
    'polarity', 'powder', 'powerups', 'prismatic light', 'pure logic',
    'purple', 'radio waves', 'rainbows', 'rock music', 'rocket fuel', 'rope',
    'sadness', 'salt', 'sand', 'scrolls', 'sludge', 'smileys', 'snowflakes',
    'sparkles', 'specularity', 'spores', 'stars', 'steam', 'tetrahedrons',
    'text', 'the past', 'tornadoes', 'toxic waste', 'ultraviolet light',
    'viruses', 'water', 'waveforms', 'wind', 'X-rays', 'zorkmids',
];

/** C ref: mthrowu.c rnd_hallublast — ROLL_FROM(hallublasts): core rn2. */
export function rnd_hallublast() {
    return HALLUBLASTS[rn2(HALLUBLASTS.length)];
}

/**
 * C ref: mthrowu.c m_useup `:1161–1170` + m_useupall `:1153–1158` —
 * quan>1 decrements (+weight); else extract_from_minvent(TRUE, FALSE)
 * + obfree (JS has no manual free; detached object is GC'd, like the
 * muse/zap/mhitm/uhitm locals which inline only the unlink loop and
 * skip the extrinsics update — those predate this export).
 */
export function m_useup(mon, obj) {
    if (!mon || !obj) return;
    if ((obj.quan | 0) > 1) {
        obj.quan = (obj.quan | 0) - 1;
        obj.owt = weight(obj);
    } else {
        extract_from_minvent(mon, obj, true, false);
    }
}

/** C ref: hacklib.c s_suffix — local for cancelled-spit dry rattle. */
function s_suffix(s) {
    if (!s) return "its";
    if (s === 'it' || s === 'It') return `${s}s`;
    if (s === 'you' || s === 'You') return `${s}r`;
    if (s.endsWith('s') || s.endsWith('z') || s.endsWith('x')
        || s.endsWith('ch') || s.endsWith('sh')) {
        return `${s}'`;
    }
    return `${s}'s`;
}

/**
 * C ref: pline.c You_hear — acoustics/Deaf gate; Unaware/Underwater deferred.
 */
async function You_hear(line) {
    const u = game.u || {};
    if (u.Deaf || game.flags?.acoustics === false) return;
    await pline(`You hear ${line}`);
}

/** C objnam.c Tobjnam — The(xname) + otense (return_from_mtoss plines). */
function The_mtoss(str) {
    const t = the(str);
    return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
}
function otense_mtoss(obj, verb) {
    if ((obj?.quan | 0) !== 1) return verb;
    return vtense(null, verb);
}
function Tobjnam(obj, verb) {
    let bp = The_mtoss(xname(obj));
    if (verb) bp += ` ${otense_mtoss(obj, verb)}`;
    return bp;
}

/**
 * C you.h mhis — Hallu rn2(4); canspotmon/neuter → its named.
 */
function mhis_mtoss(mtmp) {
    if (game.u?.Hallucination) {
        return ['his', 'her', 'its', 'their'][rn2(4)];
    }
    if (mtmp?.female) return 'her';
    return 'his';
}

/**
 * C weapon.c autoreturn_weapon — canonical `autoreturn_weapon` imported
 * from `./weapon.js` (AKLYS only; boomerang row commented out in C).
 * m_throw tethered = obj==MON_WEP && arw->tethered (before unwield).
 */

/**
 * C ref: mthrowu.c m_has_launcher_and_ammo — wielded launcher + matching ammo.
 */
export function m_has_launcher_and_ammo(mtmp) {
    const mwep = MON_WEP(mtmp);
    if (!mwep || !is_launcher(mwep)) return false;
    for (let otmp = mtmp.minvent; otmp; otmp = otmp.nobj) {
        if (ammo_and_launcher(otmp, mwep)) return true;
    }
    return false;
}

function sgn(n) {
    return n < 0 ? -1 : n > 0 ? 1 : 0;
}

function isok(x, y) {
    return x >= 1 && x < COLNO && y >= 0 && y < ROWNO;
}

function closed_door(x, y) {
    const loc = game.level?.at?.(x, y);
    if (!loc || !IS_DOOR(loc.typ)) return false;
    return !!((loc.doormask || 0) & (D_CLOSED | D_LOCKED));
}

/** C ref: mthrowu.c blocking_terrain — wall/door/waterwall/lavawall. */
function blocking_terrain(x, y) {
    if (!isok(x, y)) return true;
    const loc = game.level?.at?.(x, y);
    const typ = loc?.typ ?? 0;
    if (IS_OBSTRUCTED(typ) || closed_door(x, y)
        || IS_WATERWALL(typ) || typ === LAVAWALL) {
        return true;
    }
    return false;
}

/**
 * C ref: display.h _canseemon — wormno ? worm_known : cansee||infrared.
 */
function canseemon(mtmp) {
    if (!mtmp) return false;
    const loc_seen = mtmp.wormno
        ? worm_known(mtmp)
        : (cansee(mtmp.mx, mtmp.my) || see_with_infrared(mtmp));
    return loc_seen && mon_visible(mtmp);
}

/** C ref: zap.c exclam — punctuation by damage force. */
function exclam(force) {
    if (force < 0) return '?';
    if (force <= 4) return '.';
    return '!';
}

/** C ref: hacklib.c upstart — capitalize first letter in place. */
function upstart(str) {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function Role_if(pm) {
    return game.urole?.mnum === pm;
}

/**
 * C ref: mthrowu.c linedup — straight line + couldsee/clear_path, then
 * optional boulder walk with rn2(2+boulderspots) when boulderhandling≠0.
 * Sets game._tbx/_tby like gt.tbx/gt.tby.
 * boulderhandling: 0=block, 1=ignore boulders, 2=conditionally block.
 */
export function linedup(ax, ay, bx, by, boulderhandling = 0) {
    game._tbx = ax - bx;
    game._tby = ay - by;
    if (!game._tbx && !game._tby) return false;
    if ((!game._tbx || !game._tby || Math.abs(game._tbx) === Math.abs(game._tby))
        && distmin(game._tbx, game._tby, 0, 0) < BOLT_LIM) {
        // C: u_at(ax,ay) ? couldsee(bx,by) : clear_path(ax,ay,bx,by)
        if (u_at(ax, ay) ? !!couldsee(bx, by) : !!clear_path(ax, ay, bx, by)) {
            return true;
        }
        if (boulderhandling === 0) return false;
        let cx = bx;
        let cy = by;
        const dx = sgn(ax - bx);
        const dy = sgn(ay - by);
        let boulderspots = 0;
        do {
            cx += dx;
            cy += dy;
            if (blocking_terrain(cx, cy)) return false;
            if (sobj_at(BOULDER, cx, cy)) boulderspots++;
        } while (cx !== ax || cy !== ay);
        if (boulderhandling === 1 || rn2(2 + boulderspots) < 2) return true;
    }
    return false;
}

/**
 * C ref: mthrowu.c linedup_callback `:1294–1327` — walk (bx,by)→(ax,ay)
 * in a straight orthogonal/diagonal line under BOLT_LIM, calling fnc per
 * step. Stops FALSE on blocking_terrain, TRUE when fnc returns TRUE.
 * Sets game._tbx/_tby like gt.tbx/gt.tby (read after a TRUE return).
 */
export function linedup_callback(ax, ay, bx, by, fnc) {
    game._tbx = ax - bx; // C `:1305`
    game._tby = ay - by;
    // C `:1308–1311`: displacement aiming the monster at itself.
    if (!game._tbx && !game._tby) return false;
    // C `:1313–1315`: straight line, orthogonal or diagonal, under BOLT_LIM.
    if ((!game._tbx || !game._tby || Math.abs(game._tbx) === Math.abs(game._tby))
        && distmin(game._tbx, game._tby, 0, 0) < BOLT_LIM) {
        const dx = sgn(ax - bx); // C `:1316`
        const dy = sgn(ay - by);
        do {
            // C `:1317–1319`: <bx,by> converges with <ax,ay>.
            bx += dx;
            by += dy;
            if (blocking_terrain(bx, by)) return false; // C `:1320–1321`
            if (fnc(bx, by)) return true; // C `:1322–1323`
        } while (bx !== ax || by !== ay); // C `:1324`
    }
    return false; // C `:1326`
}

/**
 * C ref: mthrowu.c:1375–1393 m_lined_up — line-of-fire vs mtarg.
 * Hero (`gy.youmonst`): mux/muy as-is (zeromonst 0 until set_apparxy),
 * Upolyd concealment `rn2(25)` short-circuit, boulderhandling 1|2.
 * Mon-mon: mtarg mx/my + boulderhandling 0. Do not fall back to u.ux:
 * C reads `mtmp->mux` even when 0.
 */
export function m_lined_up(mtarg, mtmp) {
    const you = game.youmonst;
    // JS youmonst vs u: callers may pass either; C is only &gy.youmonst.
    const utarget = mtarg === you || mtarg === game.u;
    const u = game.u;
    const tx = utarget ? (mtmp.mux | 0) : (mtarg.mx | 0);
    const ty = utarget ? (mtmp.muy | 0) : (mtarg.my | 0);
    const ignore_boulders = utarget && (throws_rocks(mtmp.data)
        || !!m_carrying(mtmp, WAN_STRIKING));

    /* hero concealment usually trumps monst awareness of being lined up */
    // C: U_AP_TYPE is (youmonst.m_ap_type & M_AP_TYPMASK) — M_AP_TYPE(you).
    if (utarget && Upolyd(u) && rn2(25)
        && (u.uundetected || (M_AP_TYPE(you) !== M_AP_NOTHING
                              && M_AP_TYPE(you) !== M_AP_MONSTER))) {
        return false;
    }

    /* [no callers care about the 1 vs 2 situation any more] */
    return linedup(tx, ty, mtmp.mx, mtmp.my,
        utarget ? (ignore_boulders ? 1 : 2) : 0);
}

/**
 * C ref: mthrowu.c:1396–1401 lined_up — m_lined_up vs hero.
 */
export function lined_up(mtmp) {
    return m_lined_up(game.youmonst || game.u, mtmp) ? true : false;
}

/**
 * C ref: mthrowu.c breathwep_name — Hallucination path deferred.
 */
function breathwep_name(typ) {
    return BREATHWEP[BZ_OFS_AD(typ)] || 'strange breath';
}

/**
 * C ref: mthrowu.c spitmm — monster spits venom at mtarg (hero or mon).
 * mksobj always when lined up (next_ident); then rn2(BOLT_LIM-distmin)
 * decides whether to throw or discard. Named omissions: Soundeffect;
 * isminion pet-hunger skip already gated.
 */
export async function spitmm(mtmp, mattk, mtarg) {
    if (mtmp.mcan) {
        const u = game.u || {};
        const lim2 = BOLT_LIM * BOLT_LIM;
        if (!(u.Deaf || game.flags?.acoustics === false)
            && dist2(mtmp.mx, mtmp.my, u.ux, u.uy) < lim2) {
            if (canspotmon(mtmp)) {
                await pline(
                    `A dry rattle comes from ${s_suffix(mon_nam(mtmp))} throat.`,
                );
            } else {
                await You_hear('a dry rattle nearby.');
            }
        }
        return M_ATTK_MISS;
    }
    if (m_lined_up(mtarg, mtmp)) {
        const you = game.youmonst;
        const utarg = mtarg === you || mtarg === game.u;
        // C: mux/muy, not hero ux — same as m_lined_up (mthrowu.c:1033–1035).
        const tx = utarg ? (mtmp.mux | 0) : (mtarg.mx | 0);
        const ty = utarg ? (mtmp.muy | 0) : (mtarg.my | 0);
        const adtyp = mattk?.adtyp | 0;
        let otmp;
        if (adtyp === AD_BLND || adtyp === AD_DRST) {
            otmp = mksobj(BLINDING_VENOM, true, false);
        } else {
            // C: default + AD_ACID → ACID_VENOM (impossible on bad type)
            otmp = mksobj(ACID_VENOM, true, false);
        }
        if (!rn2(BOLT_LIM - distmin(mtmp.mx, mtmp.my, tx, ty))) {
            if (canseemon(mtmp)) {
                await pline(`${Monnam(mtmp)} spits venom!`);
            }
            if (!utarg) game.mtarget = mtarg;
            try {
                await m_throw(
                    mtmp, mtmp.mx, mtmp.my,
                    Math.sign(game._tbx || 0), Math.sign(game._tby || 0),
                    distmin(mtmp.mx, mtmp.my, tx, ty), otmp,
                );
            } finally {
                game.mtarget = null;
            }
            nomul(0);
            // C: tame !isminion → EDOG hungrytime -= 5
            if (mtmp.mtame && !mtmp.isminion) {
                const dog = EDOG(mtmp);
                if (dog && (dog.hungrytime | 0) > 1) {
                    dog.hungrytime = (dog.hungrytime | 0) - 5;
                }
            }
            return M_ATTK_HIT;
        }
        // C: discard unused venom — obj_extract_self + obfree
        obj_extract_self(otmp);
        otmp.where = 0;
    }
    return M_ATTK_MISS;
}

/**
 * C ref: mthrowu.c spitmu — spitmm vs hero.
 */
export async function spitmu(mtmp, mattk) {
    return spitmm(mtmp, mattk, game.youmonst || game.u);
}

/**
 * C ref: mthrowu.c breamm — monster breath weapon at mtarg.
 * Envelope: m_lined_up; mcan cough; m_seenres/REFL skip; !mspec_used &&
 * rn2(3) → dobuzz(BZ_M_BREATH); mspec_used / pet hunger. Named omissions:
 * Hallucination breathwep_name; Soundeffect cough; AD_SLEE Sleep_res
 * mspec bump uses flat Sleep_resistance; mon-mon mattackm AT_BREA deferred
 * (import cycle — hero path via breamu/mattacku).
 */
export async function breamm(mtmp, mattk, mtarg) {
    const typ = get_atkdam_type(mattk?.adtyp | 0);
    const you = game.youmonst;
    const utarget = mtarg === you || mtarg === game.u;
    const u = game.u || {};

    if (m_lined_up(mtarg, mtmp)) {
        if (mtmp.mcan) {
            if (!(u.Deaf || game.flags?.acoustics === false)) {
                if (canseemon(mtmp)) {
                    await pline(`${Monnam(mtmp)} coughs.`);
                } else {
                    await You_hear('a cough.');
                }
            }
            return M_ATTK_MISS;
        }

        // C: if we've seen the actual resistance, don't bother, or
        // if we're close by and they reflect, just jump the player
        if (utarget && (m_seenres(mtmp, cvt_adtyp_to_mseenres(typ))
            || m_seenres(mtmp, M_SEEN_REFL))) {
            return M_ATTK_HIT;
        }

        if (!mtmp.mspec_used && rn2(3)) {
            if (BZ_VALID_ADTYP(typ)) {
                if (canseemon(mtmp)) {
                    await pline(
                        `${Monnam(mtmp)} breathes ${breathwep_name(typ)}!`,
                    );
                }
                game.buzzer = mtmp;
                try {
                    await dobuzz(
                        BZ_M_BREATH(BZ_OFS_AD(typ)),
                        mattk?.damn | 0,
                        mtmp.mx, mtmp.my,
                        sgn(game._tbx || 0), sgn(game._tby || 0),
                        utarget, utarget, false,
                    );
                } finally {
                    game.buzzer = null;
                }
                nomul(0);
                // C: breath runs out sometimes; don't if target fell asleep
                if (!utarget || !rn2(3)) {
                    mtmp.mspec_used = 8 + rn2(18);
                }
                if (utarget && typ === AD_SLEE) {
                    const Sleep_resistance = !!(u.Sleep_resistance
                        || u.HSleep_resistance || u.ESleep_resistance);
                    if (!Sleep_resistance) {
                        mtmp.mspec_used = (mtmp.mspec_used | 0) + rnd(20);
                    }
                }
                if (mtmp.mtame && !mtmp.isminion) {
                    const dog = EDOG(mtmp);
                    if (dog && (dog.hungrytime | 0) >= 10) {
                        dog.hungrytime = (dog.hungrytime | 0) - 10;
                    }
                }
            }
            // C: else impossible("Breath weapon …") — no RNG
        } else {
            return M_ATTK_MISS;
        }
    }
    return M_ATTK_HIT;
}

/**
 * C ref: mthrowu.c breamu — breamm vs hero.
 */
export async function breamu(mtmp, mattk) {
    return breamm(mtmp, mattk, game.youmonst || game.u);
}

/**
 * C ref: mthrowu.c thitu — hit/miss vs hero AC; onm via an(xname)/mshot.
 * C mthrowu.c:89-90: quan>1 → doname, else mshot_xname (objnam.c:1090-1102).
 * doname stays deferred (singular keeps the old quan>1 wording).
 */
export async function thitu(tlev, dam, objp, name) {
    const obj = objp ? objp.obj : null;
    const u = game.u || {};
    const Blind = !!(u.Blind || u.ublind);
    const verbose = game.flags?.verbose !== false;
    let onmbuf;
    if (!name) {
        if (!obj) throw new Error('thitu: name & obj both null');
        onmbuf = ((obj.quan | 0) > 1 ? singular(obj, xname) : mshot_xname(obj))
            || 'missile';
        name = onmbuf;
    } else {
        onmbuf = name;
    }
    // obj_is_pname → the(name) deferred; quan>1 keeps bare name
    const onm = (obj && (obj.quan | 0) > 1) ? name : an(name);

    const uac = u.uac ?? 10;
    const dieroll = rnd(20);
    if (uac + tlev <= dieroll) {
        game._mesg_given = (game._mesg_given || 0) + 1;
        // C: miss pline before return — await so --More-- keeps caller tmp_at
        if (Blind || !verbose) {
            await pline('It misses.');
        } else if (uac + tlev <= dieroll - 2) {
            const subj = upstart(onm);
            await pline(`${subj} ${vtense(onm, 'miss')} you.`);
        } else {
            await pline(`You are almost hit by ${onm}.`);
        }
        return 0;
    }
    // C: You("are hit…") then losehp — await so --More-- on prior topline
    // still shows m_throw tmp_at flash and pre-damage botl HP.
    if (Blind || !verbose) {
        await pline(`You are hit${exclam(dam)}`);
    } else {
        await pline(`You are hit by ${onm}${exclam(dam)}`);
    }
    // C: losehp → done(DIED) noreturn — skip exercise on fatal
    losehp(dam, onm, /* KILLED_BY */ 1);
    if (game.program_state?.gameover) {
        await finish_losehp_done();
        return 1;
    }
    exercise(A_STR, false);
    return 1;
}

/**
 * C ref: mthrowu.c u_catch_thrown_obj `:532–550` — hero may catch a thrown
 * missile; on success it goes through hold_another_object (held with
 * «You catch the %s!» via prinv, or dropped at the hero's feet with
 * «You catch, but drop, the %s.») and the flight ends. C tests the live
 * form (`!nohands(gy.youmonst.data)`), not the base race. `freehand()`
 * is the canonical C `engrave.c:472–477` (`!uwep || !welded || ...`).
 */
async function u_catch_thrown_obj(otmp) {
    let catch_chance = 100 - acurr(A_DEX);
    if (Role_if(PM_MONK) || Role_if(PM_ROGUE)) catch_chance -= 20;
    const u = game.u || {};
    if (!u.Blind && !u.Confusion && !u.Stunned && !u.Fumbling
        && otmp.oclass !== VENOM_CLASS
        && !nohands(game.youmonst?.data)
        && freehand()
        && calc_capacity(otmp.owt || 0) <= SLT_ENCUMBER
        && !rn2(catch_chance)) {
        // C :544–547 — Snprintf buf + hold_another_object before TRUE
        const onames = simpleonames(otmp);
        await hold_another_object(otmp, 'You catch, but drop, the %s.',
                                  onames, `You catch the ${onames}!`);
        return true;
    }
    return false;
}

/**
 * C ref: mthrowu.c ucatchgem `:505–529` — hero poly'd into a unicorn
 * catches a thrown gem before the generic catch / potionhit arms.
 * Caller has verified gem.oclass === GEM_CLASS. Glass (FIRST..LAST)
 * is caught then dropped (makeknown + dropy); real gems go through
 * hold_another_object. Rock / gray stone (otyp > LAST) never caught.
 * C is sync; JS is async (pline / dropy / hold_another_object await).
 */
export async function ucatchgem(gem, mon) {
    if (((gem?.otyp | 0) <= LAST_GLASS_GEM) && is_unicorn(game.youmonst?.data)) {
        const gem_xname = xname(gem);
        const mon_s_name = s_suffix_ucatch(mon_nam(mon));
        if ((gem.otyp | 0) >= FIRST_GLASS_GEM) {
            await pline(`You catch the ${gem_xname}.`);
            await pline(`You are not interested in ${mon_s_name} junk.`);
            makeknown(gem.otyp | 0);
            const { dropy } = await import('./do.js');
            await dropy(gem);
        } else {
            await pline(`You accept ${mon_s_name} gift in the spirit in which it was intended.`);
            await hold_another_object(gem, 'You catch, but drop, %s.', gem_xname, 'You catch:');
        }
        return true;
    }
    return false;
}

/**
 * C ref: mthrowu.c drop_throw — mulch or ship_object or place+stack.
 * Named omit: flooreffects / passive_obj.
 */
async function drop_throw(obj, ohit, x, y) {
    let broken = false;
    const n = objectNames[obj.otyp];
    if (n === 'CREAM_PIE' || obj.oclass === VENOM_CLASS
        || (ohit && n === 'EGG')) {
        broken = true;
    } else {
        broken = !!(ohit && should_mulch_missile(obj));
    }
    if (broken) {
        delobj(obj);
    } else {
        const { ship_object } = await import('./dokick.js');
        broken = await ship_object(obj, x, y, false);
        if (!broken) {
            // C: flooreffects before place (D-0987); passive_obj deferred
            const { flooreffects } = await import('./do.js');
            if (!(await flooreffects(obj, x, y, 'fall'))) {
                place_object(obj, x, y);
                stackobj(obj);
            }
        }
    }
    game._thrownobj = null;
    return broken;
}

/** C ref: obj.h is_weptool */
function is_weptool(otmp) {
    return otmp?.oclass === TOOL_CLASS
        && ((game.objects?.[otmp.otyp]?.oc_skill | 0) !== P_NONE);
}

/**
 * C ref: dothrow.c omon_adj — size/sleep/immobile/otyp to-hit adjust.
 * Named omissions: mon_notices rn2(10) unfreeze when immobilized.
 */
function omon_adj(mon, obj, mon_notices) {
    let tmp = 0;
    tmp += ((mon.data?.msize ?? MZ_MEDIUM) - MZ_MEDIUM);
    if (mon.msleeping) tmp += 2;
    if (!mon.mcanmove || !(mon.data?.mmove)) {
        tmp += 4;
        // C: mon_notices && mmove && !rn2(10) → unfreeze; deferred
        void mon_notices;
    }
    const n = objectNames[obj.otyp];
    if (obj.otyp === HEAVY_IRON_BALL) {
        if (obj !== game.u?.uball) tmp += 2;
    } else if (n === 'BOULDER' || obj.otyp === BOULDER) {
        tmp += 6;
    } else if (obj.oclass === WEAPON_CLASS || is_weptool(obj)
        || obj.oclass === GEM_CLASS) {
        tmp += hitval(obj, mon);
    }
    return tmp;
}

function The(str) {
    const t = the(str);
    return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
}

/** C ref: zap.c miss `:3570–3576` — missile miss message. */
export async function miss(str, mtmp) {
    const bx = game.bhitpos?.x ?? mtmp.mx;
    const by = game.bhitpos?.y ?? mtmp.my;
    const whom = ((cansee(bx, by) || canspotmon(mtmp))
        && game.flags?.verbose !== false)
        ? mon_nam(mtmp) : 'it';
    await pline(`${The(str)} ${vtense(str, 'miss')} ${whom}.`);
}

/** C ref: zap.c hit — missile hit message. */
async function hit(str, mtmp, force) {
    const bx = game.bhitpos?.x ?? mtmp.mx;
    const by = game.bhitpos?.y ?? mtmp.my;
    const verbosely = game.flags?.verbose !== false
        && (cansee(bx, by) || canspotmon(mtmp));
    const whom = verbosely ? mon_nam(mtmp) : 'it';
    await pline(`${The(str)} ${vtense(str, 'hit')} ${whom}${force}`);
}

/**
 * C ref: mthrowu.c ohitmon `:321–502` — missile hits another monster.
 * Returns true if missile is done (stop flight); false to keep going.
 * C order: notonhead/ismimic/vis/observe `:334–339`; to-hit tmp +marcher
 * level +mon_launcher spec_abon `:341–349`; miss arm `:350–360`
 * (distant_name/mshot_xname; range-0 drop at the mon cell); potion arm
 * `:361–368`; hit arm `:369–502` (material, harmless via stone_missile +
 * mondata.h:208 passes_rocks macro, dmgval, acid-immune 0, splat sfx,
 * egg/hit messages, poison, silver, acid-burn, egg-petrify via
 * munstone/muse.js + minstapetrify, kill → xkilled/mondied, can_blnd
 * venom/pie, setmangry, drop_throw + range==-1 boulder re-extract
 * continue D-0700). `#if 0` orc/elf +1 `:376–378` is compiled out in C.
 * Named omissions: mon_notices unfreeze in omon_adj (same-file local).
 * Caller m_throw shade_miss is D-1382. do.c:210 deliberately inlines its
 * own dmgval path (drop_throw→flooreffects) and never calls ohitmon.
 * Rolling boulder (range==-1): after drop_throw, re-extract and return
 * false so launch_obj keeps rolling (D-0700).
 */
export async function ohitmon(mtmp, otmp, range, verbose) {
    const bx = game.bhitpos?.x ?? mtmp.mx;
    const by = game.bhitpos?.y ?? mtmp.my;
    game.notonhead = (bx !== mtmp.mx || by !== mtmp.my);

    const ismimic = M_AP_TYPE(mtmp) && M_AP_TYPE(mtmp) !== M_AP_MONSTER;
    const vis = cansee(bx, by);
    if (vis) observe_object(otmp);

    // C :341–349 — high-level archer aiming at this target hits more often
    let tmp = 5 + find_mac(mtmp) + omon_adj(mtmp, otmp, false);
    const marcher = game.marcher;
    const mon_launcher = marcher ? MON_WEP(marcher) : null;
    if (marcher && game.mtarget === mtmp) {
        if ((marcher.m_lev | 0) > 5) tmp += (marcher.m_lev | 0) - 5;
        if (mon_launcher && mon_launcher.oartifact) tmp += spec_abon(mon_launcher, mtmp);
    }

    // C :350–360 — miss arm
    if (tmp < rnd(20)) {
        if (!ismimic) {
            if (vis) {
                await miss(distant_name(otmp, mshot_xname), mtmp);
            } else if (verbose && !game.mtarget) {
                await pline('It is missed.');
            }
        }
        if (!range) {
            await drop_throw(otmp, false, mtmp.mx, mtmp.my);
            return true;
        }
        return false;
    }

    if (otmp.oclass === POTION_CLASS) {
        if (ismimic) seemimic(mtmp);
        mtmp.msleeping = 0;
        await potionhit(mtmp, otmp, POTHIT_OTHER_THROW);
        return true;
    }

    // C :370–371 — stone missiles pass harmlessly through rock-phasers
    const material = game.objects?.[otmp.otyp | 0]?.oc_material | 0;
    // C mondata.h:208 passes_rocks macro: passes_walls && !unsolid
    const harmless = !!(stone_missile(otmp)
        && passes_walls(mtmp.data) && !unsolid(mtmp.data));

    // C :372–375 (+ acid-immune 0; :376–378 #if 0 orc/elf arm compiled out)
    let damage = dmgval(otmp, mtmp);
    if ((otmp.otyp | 0) === ACID_VENOM && resists_acid(mtmp)) damage = 0;

    if (ismimic) seemimic(mtmp);
    mtmp.msleeping = 0;
    Soundeffect(se_splat_egg, 35); // C :383

    // C :384–401
    if (vis) {
        if ((otmp.otyp | 0) === EGG) {
            const eggwhat = otmp.known
                ? an(pmnames[otmp.corpsenm | 0]?.[2] ?? 'monster')
                : 'an';
            await pline(`Splat!  ${Monnam(mtmp)} is hit with ${eggwhat} egg!`);
        } else {
            const how = !harmless ? exclam(damage)
                : ` but passes harmlessly through ${mhim(mtmp)}.`;
            await hit(distant_name(otmp, mshot_xname), mtmp, how);
        }
    } else if (verbose && !game.mtarget) {
        await pline(`${(otmp.otyp | 0) === EGG ? 'Splat!  ' : ''}${Monnam(mtmp)} is hit${exclam(damage)}`);
    }

    // C :403–417 — poisoned missile arm
    if (otmp.opoisoned && is_poisonable(otmp)) {
        if (resists_poison(mtmp)) {
            if (vis) await pline_The("poison doesn't seem to affect %s.", mon_nam(mtmp));
        } else if (rn2(30)) {
            damage += rnd(6);
        } else {
            if (vis) await pline_The('poison was deadly...');
            damage = mtmp.mhp | 0;
        }
    }

    // C :418–432 — silver arm (extra silver damage already in dmgval)
    if (material === SILVER && mon_hates_silver(mtmp)) {
        const flesh = !noncorporeal(mtmp.data) && !amorphous(mtmp.data);
        if (vis) {
            const m_name = flesh ? `${s_suffix_ucatch(mon_nam(mtmp))} flesh` : mon_nam(mtmp);
            await pline_The('silver sears %s!', m_name);
        } else if (verbose && !game.mtarget) {
            await pline(`${flesh ? 'Its flesh' : 'It'} is seared!`);
        }
    }

    // C :433–443 — acid-burn arm
    if ((otmp.otyp | 0) === ACID_VENOM && cansee(mtmp.mx, mtmp.my)) {
        if (resists_acid(mtmp)) {
            if (vis || (verbose && !game.mtarget)) {
                await pline('%s is unaffected.', Monnam(mtmp));
            }
        } else if (vis) {
            await pline_The('%s burns %s!', hliquid('acid'), mon_nam(mtmp));
        } else if (verbose && !game.mtarget) {
            await pline('It is burned!');
        }
    }

    // C :444–455 — cockatrice-egg petrify arm
    if ((otmp.otyp | 0) === EGG && touch_petrifies(mons(otmp.corpsenm | 0))) {
        if (!(await munstone(mtmp, false))) await minstapetrify(mtmp, false);
        if (resists_ston(mtmp)) damage = 0;
    }

    // C :457–474 — damage + kill (might already be dead if petrified)
    if (!harmless && (mtmp.mhp | 0) > 0) {
        mtmp.mhp = (mtmp.mhp | 0) - damage;
        if ((mtmp.mhp | 0) < 1) {
            if (vis || (verbose && !game.mtarget)) {
                const verb = (nonliving(mtmp.data) || is_vampshifter(mtmp) || !canspotmon(mtmp))
                    ? 'destroyed' : 'killed';
                await pline(`${Monnam(mtmp)} is ${verb}!`);
            }
            // C :467–471 — don't blame hero for unknown rolling boulder trap
            if (!game.context?.mon_moving
                && ((otmp.otyp | 0) !== BOULDER
                    || (range | 0) >= 0
                    || otmp.otrapped)) {
                await xkilled(mtmp, XKILL_NOMSG);
            } else {
                await mondied(mtmp);
            }
        }
    }

    // C :476–490 — blinding venom and cream pie do 0 damage but still blind
    if ((mtmp.mhp | 0) > 0 && can_blnd(null, mtmp,
        ((otmp.otyp | 0) === BLINDING_VENOM) ? AT_SPIT : AT_WEAP, otmp)) {
        if (vis && mtmp.mcansee) {
            // C :479–486 — shorten the name; the hit() line above said it all
            await pline('%s is blinded by %s.', Monnam(mtmp), the(
                (otmp.oclass | 0) === VENOM_CLASS ? 'venom'
                    : (otmp.otyp | 0) === CREAM_PIE ? 'pie'
                    : xname(otmp)));
        }
        mtmp.mcansee = 0;
        mtmp.mblinded = Math.min(127, (mtmp.mblinded | 0) + rnd(25) + 20);
    }

    // C :492 — if (!DEADMONSTER(mtmp) && !mon_moving) setmangry(mtmp, TRUE)
    if ((mtmp.mhp | 0) > 0 && !game.context?.mon_moving) {
        await setmangry(mtmp, true);
    }
    // C :494–496 — rolling boulder keeps going after a non-consuming hit
    const objgone = await drop_throw(otmp, true, bx, by);
    if (!objgone && (range | 0) === -1) {
        obj_extract_self(otmp);
        return false;
    }
    return true;
}

/**
 * C ref: mthrowu.c return_from_mtoss — static; throw-and-return land.
 * C `:941–961` notcaught: snuff_candle then ship_object then
 * flooreffects("drop") then place+stack. Candles/candelabrum only
 * (not snuff_lit). Catch-into-minvent skips snuff. Soundeffect named.
 * @param {object} magr
 * @param {object|null} otmp
 * @param {boolean} tethered_weapon
 */
export async function return_from_mtoss(magr, otmp, tethered_weapon) {
    const impaired = !!(magr?.mconf || magr?.mstun || magr?.mblinded);
    let notcaught = false;
    let hits_thrower = false;
    let x = game.bhitpos?.x | 0;
    let y = game.bhitpos?.y | 0;
    const made_it_back = rn2(100);
    let dmg = 0;

    if (otmp && made_it_back) {
        if (tethered_weapon) {
            await tmp_at(DISP_END, BACKTRACK);
        } else {
            const dx = sgn(x - magr.mx);
            const dy = sgn(y - magr.my);
            if (x !== magr.mx || y !== magr.my) {
                tmp_at(DISP_FLASH, obj_glyph(otmp));
                while (isok(x, y) && (x !== magr.mx || y !== magr.my)) {
                    tmp_at(x, y);
                    await nh_delay_output();
                    x -= dx;
                    y -= dy;
                }
                tmp_at(DISP_END, 0);
            }
        }
        x = magr.mx | 0;
        y = magr.my | 0;
        if (!impaired && rn2(100)) {
            const lastAnnoy = game._mtoss_do_not_annoy | 0;
            const moves = game.moves | 0;
            if (!lastAnnoy || (moves - lastAnnoy) > 500) {
                await pline(
                    `${Tobjnam(otmp, 'return')} to ${s_suffix(mon_nam(magr))} ${
                        mbodypart(magr, HAND)
                    }!`,
                );
                game._mtoss_do_not_annoy = moves;
            }
            if (otmp) {
                const { add_to_minv } = await import('./makemon.js');
                add_to_minv(magr, otmp);
                if (tethered_weapon) {
                    magr.mw = otmp;
                    otmp.owornmask = (otmp.owornmask || 0) | W_WEP;
                }
            }
            if (cansee(x, y)) newsym(x, y);
        } else {
            const mlevitating = false;
            dmg = rn2(2);
            if (!dmg) {
                if (canseemon(magr)) {
                    await pline(
                        `${Tobjnam(otmp, 'return')} back to ${mon_nam(magr)}, landing ${
                            mlevitating ? 'beneath' : 'at'
                        } ${mhis_mtoss(magr)} ${makeplural(mbodypart(magr, FOOT))}.`,
                    );
                } else if (!game.u?.Deaf) {
                    await You_hear(
                        `Something land near ${mon_nam(magr)}.`,
                    );
                }
            } else {
                dmg += rnd(3);
                if (canseemon(magr)) {
                    await pline(
                        `${Tobjnam(otmp, 'fly')} back toward ${mon_nam(magr)}, hitting ${
                            mhis_mtoss(magr)
                        } ${body_part(ARM)}!`,
                    );
                } else if (!game.u?.Deaf) {
                    await You_hear(
                        `something hit ${mon_nam(magr)} with a thud!`,
                    );
                }
                hits_thrower = true;
            }
            notcaught = true;
        }
    } else {
        if (tethered_weapon) tmp_at(DISP_END, 0);
        await You_hear('a loud snap!');
        notcaught = true;
    }
    if (otmp) {
        if (hits_thrower) {
            if (otmp.oartifact) {
                const { artifact_hit } = await import('./artifact.js');
                const dmgBox = { dmg };
                await artifact_hit(null, magr, otmp, dmgBox, 0);
                dmg = dmgBox.dmg | 0;
            }
            magr.mhp = (magr.mhp | 0) - dmg;
            if ((magr.mhp | 0) < 1) {
                await monkilled(
                    magr, canspotmon(magr) ? '' : null, /* AD_PHYS */ 0,
                );
            }
        }
        if (notcaught) {
            // C mthrowu.c :942 — before ship_object / flooreffects("drop")
            const { snuff_candle } = await import('./apply.js');
            await snuff_candle(otmp);
            const { ship_object } = await import('./dokick.js');
            if (!(await ship_object(otmp, x, y, false))) {
                const { flooreffects } = await import('./do.js');
                if (await flooreffects(otmp, x, y, 'drop')) {
                    if (cansee(x, y)) newsym(x, y);
                    return;
                }
                place_object(otmp, x, y);
                stackobj(otmp);
            }
            if (!game.u?.Deaf && !game.u?.Underwater) {
                if (is_pool(x, y)
                    || (is_lava(x, y) && !is_flammable(otmp))) {
                    await pline(
                        (weight(otmp) > WT_SPLASH_THRESHOLD) ? 'Splash!' : 'Plop!',
                    );
                }
            }
            if (otmp.lamplit) game.vision_full_recalc = 1;
        }
    }
    if (cansee(x, y)) newsym(x, y);
}

/**
 * C ref: mthrowu.c m_throw — flight loop; hero hit / forcehit rn2(5).
 * Tethered AKLYS sets return_flightpath instead of drop_throw, then
 * return_from_mtoss (D-1334). shade_miss caller D-1382 (`:680–686`).
 * MT_FLIGHTCHECK IRONBARS via hits_bars + IS_SINK + sink/misses plines
 * (`:552-569`, `:798-823`). thrwmu polearm still named; always_toss live
 * in thrwmu_body below.
 */
export async function m_throw(mon, x, y, dx, dy, range, obj) {
    // C :584–587 — arw / tethered before setmnotwielded
    const arw = autoreturn_weapon(obj);
    const tethered_weapon = !!(obj === MON_WEP(mon) && arw && arw.tethered);
    let return_flightpath = false;
    // C mthrowu.c:583 — pie/venom blinding lands at flight end (:836-841)
    let blindinc = 0;
    let singleobj;
    if ((obj.quan || 1) === 1) {
        if (MON_WEP(mon) === obj) {
            mon.mw = null;
            obj.owornmask = (obj.owornmask || 0) & ~W_WEP;
        }
        obj_extract_self(obj);
        singleobj = obj;
        obj = null;
    } else {
        singleobj = splitobj(obj, 1);
        obj_extract_self(singleobj);
    }
    game._thrownobj = singleobj;
    singleobj.owornmask = 0;

    // cursed slip rn2(7) deferred unless cursed
    if ((singleobj.cursed || singleobj.greased) && (dx || dy) && !rn2(7)) {
        dx = rn2(3) - 1;
        dy = rn2(3) - 1;
        if (!dx && !dy) {
            await drop_throw(singleobj, false, x, y);
            return;
        }
    }

    // C mthrowu.c:552-569 MT_FLIGHTCHECK(TRUE, 0) — edge/wall/closed-door plus
    // IRONBARS via hits_bars(always_hit 0, whodidit 0); sink arm is
    // (!(pre) && ...) so it never fires pre-flight. hits_bars may destroy
    // singleobj via hit_bars/breaks (box.obj null) — then drop nothing.
    {
        const nx0 = x + dx;
        const ny0 = y + dy;
        const t0 = game.level?.at?.(nx0, ny0)?.typ ?? 0;
        let preBlocked = !isok(nx0, ny0)
            || IS_OBSTRUCTED(t0)
            || closed_door(nx0, ny0);
        const preBox = { obj: singleobj };
        if (!preBlocked && t0 === IRONBARS) {
            preBlocked = await hits_bars(preBox, x, y, nx0, ny0, 0, 0);
            singleobj = preBox.obj;
            game._thrownobj = singleobj;
        }
        if (preBlocked) {
            if (singleobj) await drop_throw(singleobj, false, x, y);
            else game._thrownobj = null;
            return;
        }
    }

    let bx = x;
    let by = y;
    game._mesg_given = 0;
    if (!game.bhitpos) game.bhitpos = {};
    game.bhitpos.x = x;
    game.bhitpos.y = y;
    // C: sym = obj->oclass; tethered DISP_TETHER else DISP_FLASH
    // Hallucination rn2_on_display_rng path deferred — obj_glyph is non-hallu.
    const sym = singleobj.oclass;
    if (sym) {
        if (!tethered_weapon) tmp_at(DISP_FLASH, obj_glyph(singleobj));
        else tmp_at(DISP_TETHER, obj_glyph(singleobj));
    }

    while (range-- > 0) {
        bx += dx;
        by += dy;
        game.bhitpos.x = bx;
        game.bhitpos.y = by;
        singleobj.ox = bx;
        singleobj.oy = by;
        // C: if (cansee(bhitpos)) observe_object(singleobj)
        if (cansee(bx, by)) observe_object(singleobj);

        const mtmp = m_at(bx, by);
        // C mthrowu.c :680–686 — shade_miss(TRUE,TRUE) skips ohitmon
        // and keeps flying; else ohitmon; else hero cell.
        if (mtmp && await shade_miss(mon, mtmp, singleobj, true, true)) {
            /* pass harmlessly through; mtmp cleared in C, keep going */
        } else if (mtmp) {
            if (await ohitmon(mtmp, singleobj, range, true)) {
                break;
            }
            // miss with remaining range — keep flying past the monster
        } else {
            const u = game.u || {};
            if (u.ux === bx && u.uy === by) {
                if (game.multi) nomul(0);
                // C mthrowu.c:692 — hero poly'd into unicorn catches gems
                // before the generic catch; C breaks (not returns).
                if (singleobj.oclass === GEM_CLASS && await ucatchgem(singleobj, mon))
                    break;
                // C :695 — tethered cannot be caught; success breaks the
                // flight (loop tail paints bhitpos + DISP_END, resets
                // mesg_given, runs the blindinc tail, clears thrownobj).
                if (!tethered_weapon && await u_catch_thrown_obj(singleobj)) {
                    break;
                }
                // C: POTION_CLASS → potionhit (before thitu / egg / pie)
                if (singleobj.oclass === POTION_CLASS) {
                    // C: await blocking pline/--More-- while flash still at prior cell
                    await potionhit(null, singleobj, POTHIT_MONST_THROW);
                    break;
                }
                // C mthrowu.c:702 — mortality baseline for the poisoned arm
                const oldumort = (u.umortality | 0);
                const otyp = singleobj.otyp | 0;
                const box = { obj: singleobj };
                let hitu = 0;
                if (otyp === EGG) {
                    // C :705-714 — non-petrifier egg is impossible (hitu = 0);
                    // petrifier FALLTHROUGHs to the pie/venom thitu(8, 0)
                    if (!touch_petrifies(mons(singleobj.corpsenm | 0))) {
                        await impossible(`monster throwing egg type ${singleobj.corpsenm | 0}`);
                    } else {
                        hitu = await thitu(8, 0, box, null);
                        // C: losehp→done noreturn — no drop_throw / mulch after fatal
                        if (game.program_state?.gameover) {
                            if (sym) tmp_at(DISP_END, 0);
                            return;
                        }
                    }
                } else if (otyp === CREAM_PIE || otyp === BLINDING_VENOM) {
                    // C :715-717 — pie/venom thitu(8, 0)
                    hitu = await thitu(8, 0, box, null);
                    // C: losehp→done noreturn — no drop_throw / mulch after fatal
                    if (game.program_state?.gameover) {
                        if (sym) tmp_at(DISP_END, 0);
                        return;
                    }
                } else {
                    let dam = dmgval(singleobj, null);
                    let hitv = 3 - distmin(u.ux, u.uy, mon.mx, mon.my);
                    if (hitv < -4) hitv = -4;
                    // C :727-734 — elves get a shooting bonus with bows
                    if (is_elf(mon.data)
                        && (game.objects?.[otyp]?.oc_skill | 0) === -P_BOW) {
                        hitv++;
                        if (MON_WEP(mon) && (MON_WEP(mon).otyp | 0) === ELVEN_BOW)
                            hitv++;
                        if (otyp === ELVEN_ARROW)
                            dam++;
                    }
                    // C :735-736 — big hero easier to hit
                    if (bigmonst(game.youmonst?.data)) hitv++;
                    hitv += 8 + (singleobj.spe | 0);
                    if (dam < 1) dam = 1;
                    // C :740-741 — acid venom skips the half-phys reduction
                    if (otyp !== ACID_VENOM) dam = maybe_half_phys(dam);
                    hitu = await thitu(hitv, dam, box, null);
                    // C: losehp→done noreturn — no drop_throw / mulch after fatal
                    if (game.program_state?.gameover) {
                        if (sym) tmp_at(DISP_END, 0);
                        return;
                    }
                }
                // C :745-754 — poisoned missile
                if (hitu && singleobj.opoisoned && is_poisonable(singleobj)) {
                    await poisoned(xname(singleobj), A_STR,
                        killer_xname(singleobj),
                        ((u.umortality | 0) > oldumort) ? 0 : 10, true);
                    if (game.program_state?.gameover) {
                        if (sym) tmp_at(DISP_END, 0);
                        return;
                    }
                }
                // C :755-778 — cream pie / blinding venom in the eyes
                if (hitu && can_blnd(null, game.youmonst,
                        otyp === BLINDING_VENOM ? AT_SPIT : AT_WEAP, singleobj)) {
                    blindinc = rnd(25);
                    if (otyp === CREAM_PIE) {
                        if (!Blind())
                            await pline("Yecch!  You've been creamed.");
                        else
                            await pline(`There's something sticky all over your ${body_part(FACE)}.`);
                    } else if (otyp === BLINDING_VENOM) {
                        let eyes = body_part(EYE);
                        if (eyecount(game.youmonst?.data) !== 1)
                            eyes = makeplural(eyes);
                        if (!Blind())
                            await pline('The venom blinds you.');
                        else
                            await pline(`Your ${eyes} ${vtense(eyes, 'sting')}.`);
                    }
                }
                // C :779-785 — thrown petrifying egg
                if (hitu && otyp === EGG) {
                    const Stone_resistance = !!(u.Stone_resistance
                        || u.HStone_resistance || u.EStone_resistance);
                    const stoned = !!((u.Stoned | 0)
                        || (u.uprops?.[STONED]?.intrinsic | 0));
                    if (!stoned && !Stone_resistance
                        && !(poly_when_stoned(game.youmonst?.data, game.mvitals)
                            && await polymon(PM_STONE_GOLEM))) {
                        await make_stoned(5, null, KILLED_BY, '');
                    }
                }
                // C :786 — any missile reaching the hero interrupts occupation
                // ("You stop searching." when counted `s` is running)
                await stop_occupation();
                if (hitu) {
                    if (!tethered_weapon) {
                        await drop_throw(singleobj, true, u.ux, u.uy);
                    } else {
                        return_flightpath = true;
                    }
                    break;
                }
            }
        } // end else !mtmp (hero / empty cell)

        // C mthrowu.c:798-823 — forcehit rn2(5) drawn before the !range
        // short-circuit; MT_FLIGHTCHECK(FALSE, forcehit) is edge/wall/
        // closed-door plus IRONBARS via hits_bars(forcehit, whodidit 0)
        // plus IS_SINK on the CURRENT cell. hits_bars may destroy
        // singleobj (box.obj null) — C guards with if (singleobj).
        const forcehit = !rn2(5);
        let flightBlocked = false;
        if (!range) {
            flightBlocked = true;
        } else {
            const nx = bx + dx;
            const ny = by + dy;
            const ntyp = game.level?.at?.(nx, ny)?.typ ?? 0;
            const curtyp = game.level?.at?.(bx, by)?.typ ?? 0;
            flightBlocked = !isok(nx, ny)
                || IS_OBSTRUCTED(ntyp)
                || closed_door(nx, ny)
                || IS_SINK(curtyp);
            if (!flightBlocked && ntyp === IRONBARS) {
                const flightBox = { obj: singleobj };
                flightBlocked = await hits_bars(flightBox, bx, by, nx, ny, forcehit, 0);
                singleobj = flightBox.obj;
                game._thrownobj = singleobj;
            }
        }
        if (flightBlocked) {
            // C :801 — hits_bars might have destroyed it: drop nothing.
            if (singleobj) {
                // C :804-813 — sink plop/drop else multishot "misses".
                if (range && cansee(bx, by)
                    && IS_SINK(game.level?.at?.(bx, by)?.typ ?? 0)) {
                    await pline(`${The(mshot_xname(singleobj))} ${otense(singleobj, game.u?.Hallucination ? 'plop' : 'drop')} onto the sink.`);
                } else if ((game.m_shot?.n | 0) > 1
                    && (!(game._mesg_given | 0) || bx !== (game.u?.ux | 0) || by !== (game.u?.uy | 0))
                    && (cansee(bx, by) || (game.marcher && canseemon(game.marcher)))) {
                    await pline(`${The(mshot_xname(singleobj))} misses.`);
                }
                if (!tethered_weapon) {
                    await drop_throw(singleobj, false, bx, by);
                } else {
                    return_flightpath = true;
                }
            }
            break;
        }
        // C: tmp_at(bhitpos); nh_delay_output() — only when flight continues
        if (sym) {
            tmp_at(bx, by);
            await nh_delay_output();
        }
    }
    // C :827–833 — final cell then return_from_mtoss or DISP_END
    if (sym) {
        tmp_at(bx, by);
        await nh_delay_output();
    }
    if (arw && return_flightpath) {
        await return_from_mtoss(mon, singleobj, tethered_weapon);
    } else if (sym) {
        tmp_at(DISP_END, 0);
    }
    game._mesg_given = 0;
    // C mthrowu.c:836-841 — pie/venom blinding lands when the flight ends
    if (blindinc) {
        const uu = game.u || {};
        uu.ucreamed = (uu.ucreamed | 0) + blindinc;
        await make_blinded(BlindedTimeout() + blindinc, false);
        if (!Blind()) await pline('Your vision clears.');
    }
    game._thrownobj = null;
}

/**
 * C ref: mthrowu.c:260–314 monshoot — throw/shoot otmp at gm.mtarget or
 * the shooter's mux/muy. Caller has linedup() so gt.tbx/tby are set.
 * Distance is mtarg mx/my when mtarget is set (thrwmm), else mux/muy
 * with no hero-ux fallback (thrwmu). Staticfn in C — same-file only.
 */
async function monshoot(mtmp, otmp, mwep) {
    const mtarg = game.mtarget;
    const dm = distmin(
        mtmp.mx, mtmp.my,
        mtarg ? mtarg.mx : (mtmp.mux | 0),
        mtarg ? mtarg.my : (mtmp.muy | 0),
    );
    const multishot = monmulti(mtmp, otmp, mwep);

    if (!game.m_shot) game.m_shot = { i: 0, n: 0, o: 0, s: false };

    if (canseemon(mtmp)) {
        let onm;
        if (multishot > 1) {
            onm = `${multishot} ${xname(otmp)}`;
        } else {
            onm = singular(otmp, xname);
            onm = obj_is_pname(otmp) ? the(onm) : an(onm);
        }
        game.m_shot.s = !!ammo_and_launcher(otmp, mwep);
        const trgbuf = mtarg ? some_mon_nam(mtarg) : '';
        set_msg_xy(mtmp.mx, mtmp.my);
        await pline(
            `${Monnam(mtmp)} ${game.m_shot.s ? 'shoots' : 'throws'} ${onm}`
            + `${mtarg ? ' at ' : ''}${trgbuf}!`,
        );
        game.m_shot.o = otmp.otyp | 0;
    } else {
        game.m_shot.o = 0; /* STRANGE_OBJECT — no multishot feedback */
    }
    game.m_shot.n = multishot;
    for (game.m_shot.i = 1; game.m_shot.i <= game.m_shot.n; game.m_shot.i++) {
        await m_throw(
            mtmp, mtmp.mx, mtmp.my,
            sgn(game._tbx), sgn(game._tby),
            dm, otmp,
        );
        /* conceptually all N missiles are in flight at once */
        if ((mtmp.mhp | 0) < 1 && game.m_shot.i < game.m_shot.n) break;
    }
    game.m_shot.n = 0;
    game.m_shot.i = 0;
    game.m_shot.o = 0;
    game.m_shot.s = false;
}

/**
 * C ref: mthrowu.c:968–1012 thrwmm — monster throws/shoots at another
 * monster. Polearms are not applied vs monsters. `m_lined_up` then the
 * flee `rn2(chance)` gate, PET_MISSILE_RANGE2 ammo skip, then
 * gm.marcher/gm.mtarget + monshoot.
 */
export async function thrwmm(mtmp, mtarg) {
    if ((mtmp.weapon_check | 0) === NEED_WEAPON || !MON_WEP(mtmp)) {
        mtmp.weapon_check = NEED_RANGED_WEAPON;
        if ((await mon_wield_item(mtmp)) !== 0) return M_ATTK_MISS;
    }

    const otmp = select_rwep(mtmp);
    if (!otmp) return M_ATTK_MISS;
    const ispole = is_pole(otmp);

    const x = mtmp.mx;
    const y = mtmp.my;
    const mwep = MON_WEP(mtmp);

    if (!ispole && m_lined_up(mtarg, mtmp)) {
        const chance = Math.max(
            BOLT_LIM - distmin(x, y, mtarg.mx, mtarg.my), 1,
        );

        if (!mtarg.mflee || !rn2(chance)) {
            if (ammo_and_launcher(otmp, mwep)
                && dist2(mtmp.mx, mtmp.my, mtarg.mx, mtarg.my)
                   > PET_MISSILE_RANGE2) {
                return M_ATTK_MISS; /* Out of range */
            }
            game.mtarget = mtarg;
            game.marcher = mtmp;
            await monshoot(mtmp, otmp, mwep);
            game.marcher = null;
            game.mtarget = null;
            nomul(0);
            return M_ATTK_HIT;
        }
    }
    return M_ATTK_MISS;
}

/**
 * C ref: mthrowu.c thrwmu `:1175–1267` — select missile, polearm thrust,
 * autoreturn toss, line up, monshoot.
 */
export async function thrwmu(mtmp) {
    if (Is_rogue_level(game.u?.uz)) return;

    if (!game.context) game.context = {};
    game.context.mon_moving = true;
    try {
        await thrwmu_body(mtmp);
    } finally {
        game.context.mon_moving = false;
    }
}

async function thrwmu_body(mtmp) {
    // C :1186–1191 — wield a ranged weapon first (mon_wield_item resets
    // weapon_check as appropriate).
    if (mtmp.weapon_check === NEED_WEAPON || !MON_WEP(mtmp)) {
        mtmp.weapon_check = NEED_RANGED_WEAPON;
        if ((await mon_wield_item(mtmp)) !== 0) return;
    }

    // C :1194–1196 — pick a weapon.
    const otmp = select_rwep(mtmp);
    if (!otmp) return;

    // C :1198–1240 — polearm thrust (rang is dist2, squared: adjacent is
    // <= 2, MON_POLE_DIST covers the knight's-move range). The polearm
    // must be wielded; out of range or unseen means no attack at all.
    // C :1183 — always_toss, set by the autoreturn arm below.
    let always_toss = false;
    if (is_pole(otmp)) {
        let dam, hitv;
        if (otmp !== MON_WEP(mtmp)) return;
        const rang = dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy);
        if (rang > MON_POLE_DIST || !couldsee(mtmp.mx, mtmp.my)) return;
        if (canseemon(mtmp)) {
            const onm = xname(otmp);
            await pline_mon(mtmp, '%s %s %s.', Monnam(mtmp),
                mswings_verb(otmp, rang <= 2),
                obj_is_pname(otmp) ? the(onm) : an(onm));
        }
        dam = dmgval(otmp, game.youmonst);
        hitv = 3 - distmin(game.u?.ux, game.u?.uy, mtmp.mx, mtmp.my);
        if (hitv < -4) hitv = -4;
        if (bigmonst(game.youmonst?.data)) hitv++;
        hitv += 8 + (otmp.spe | 0);
        if (dam < 1) dam = 1;
        await thitu(hitv, maybe_half_phys(dam), { obj: otmp }, null);
        await stop_occupation();
        return;
    // C :1241–1247 — throw-and-return always tosses. Short-circuit order
    // matches C: autoreturn_weapon first, then !mwelded; range gate
    // before couldsee.
    } else {
        const arw = autoreturn_weapon(otmp);
        if (arw && !mwelded(otmp)) {
            const rang = dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy);
            if (rang > arw.range || !couldsee(mtmp.mx, mtmp.my)) return;
            always_toss = true;
        }
    }

    // C :1249–1259 — chase unless lined up; a retreating hero is only
    // pelted while closing distance (URETREATING, mthrowu.c:18–19).
    // !always_toss short-circuits before rn2, so a tethered weapon draws
    // no BOLT_LIM retreat roll.
    const x = mtmp.mx;
    const y = mtmp.my;
    const u = game.u || {};
    const uretreating = distmin(u.ux, u.uy, x, y)
        > distmin(u.ux0 ?? u.ux, u.uy0 ?? u.uy, x, y);
    if (!lined_up(mtmp)
        || (uretreating
            && (!always_toss
                && rn2(BOLT_LIM - distmin(x, y, mtmp.mux | 0, mtmp.muy | 0))))) {
        return;
    }

    // C :1261–1263 — multishot shooting or throwing.
    const mwep = MON_WEP(mtmp);
    await monshoot(mtmp, otmp, mwep);
    nomul(0);
}

/** C ref: obj.h is_flimsy — material ≤ LEATHER or rubber hose. */
function is_flimsy(otmp) {
    const mat = game.objects?.[otmp?.otyp]?.oc_material ?? 99;
    return mat <= LEATHER || (otmp?.otyp | 0) === RUBBER_HOSE;
}

/**
 * C ref: dothrow.c harmless_missile — soft items that bounce quietly.
 * Named omission: none for the otyp list; kept local to avoid dothrow↔trap
 * import cycles when wired from hit_bars.
 */
function harmless_missile(obj) {
    if (!obj) return false;
    const otyp = obj.otyp | 0;
    switch (otyp) {
    case SLING:
    case EUCALYPTUS_LEAF:
    case KELP_FROND:
    case SPRIG_OF_WOLFSBANE:
    case FORTUNE_COOKIE:
    case PANCAKE:
        return true;
    case RUBBER_HOSE:
    case BAG_OF_TRICKS:
        return (obj.spe | 0) < 1;
    case SACK:
    case OILSKIN_SACK:
    case BAG_OF_HOLDING:
        return !Has_contents(obj);
    default:
        if ((obj.oclass | 0) === SCROLL_CLASS) return true;
        if ((game.objects?.[otyp]?.oc_material | 0) === CLOTH) return true;
        break;
    }
    return false;
}

/**
 * C ref: mthrowu.c hit_bars — break/whang against IRONBARS; may null *objp.
 * Named omissions: Soundeffect enums; Blind feel polish.
 * @param {{ obj: object|null }} objp
 */
export async function hit_bars(objp, objx, objy, barsx, barsy, breakflags) {
    let otmp = objp?.obj;
    if (!otmp) return;
    const obj_type = otmp.otyp | 0;
    const loc = game.level?.at?.(barsx, barsy);
    const nodissolve = !!((loc?.wall_info | 0) & W_NONDIGGABLE);
    const your_fault = (breakflags & BRK_BY_HERO) !== 0;
    const melee_attk = (breakflags & BRK_MELEE) !== 0;
    let noise = 0;

    // Dynamic import avoids mthrowu → dothrow → trap → mthrowu cycle.
    const { hero_breaks, breaks } = await import('./dothrow.js');
    const broke = your_fault
        ? await hero_breaks(otmp, objx, objy, breakflags)
        : await breaks(otmp, objx, objy);
    if (broke) {
        objp.obj = null;
        if (obj_type === POT_ACID) {
            if (cansee(barsx, barsy) && !nodissolve) {
                await pline('The iron bars are dissolved!');
            } else {
                await You_hear(
                    game.u?.Hallucination ? 'angry snakes!' : 'a hissing noise.',
                );
            }
            if (!nodissolve) await dissolve_bars(barsx, barsy);
        }
        return;
    }

    if (!(game.u?.Deaf || game.flags?.acoustics === false)) {
        const barsounds = ['', 'Whang', 'Whap', 'Flapp', 'Clink', 'Clonk'];
        let bsindx;
        if (obj_type === BOULDER || obj_type === HEAVY_IRON_BALL) {
            bsindx = 1;
        } else if (harmless_missile(otmp)) {
            bsindx = 2;
        } else if (is_flimsy(otmp)) {
            bsindx = 3;
        } else if ((otmp.oclass | 0) === COIN_CLASS
            || (game.objects?.[obj_type]?.oc_material | 0) === GOLD
            || (game.objects?.[obj_type]?.oc_material | 0) === SILVER) {
            bsindx = 4;
        } else {
            bsindx = barsounds.length - 1;
        }
        await pline(`${barsounds[bsindx]}!`);
    }
    if (!(harmless_missile(otmp) || is_flimsy(otmp))) noise = 4 * 4;

    if (your_fault && (obj_type === WAR_HAMMER
        || obj_type === HEAVY_IRON_BALL)) {
        const spe = (obj_type === HEAVY_IRON_BALL)
            ? Math.trunc((otmp.owt | 0) / WT_IRON_BALL_INCR)
            : (otmp.spe | 0);
        const chance = (melee_attk ? 40 : 60) - acurrstr() - spe;
        if (!rn2(Math.max(2, chance))) {
            await pline('You break the bars apart!');
            await dissolve_bars(barsx, barsy);
            noise = noise * 2;
        }
    }

    if (noise) await wake_nearto(barsx, barsy, noise);
}

/**
 * C ref: mthrowu.c hits_bars — TRUE if missile stops at bars; may destroy.
 * whodidit: 1 hero, 0 other, -1 check-only (no hit_bars side effects).
 * @param {{ obj: object|null }} obj_p
 * @returns {Promise<boolean>}
 */
export async function hits_bars(obj_p, x, y, barsx, barsy, always_hit, whodidit) {
    const otmp = obj_p?.obj;
    if (!otmp) return false;
    const obj_type = otmp.otyp | 0;
    let hits = !!always_hit;

    if (!hits) {
        switch (otmp.oclass | 0) {
        case WEAPON_CLASS: {
            const oskill = game.objects?.[obj_type]?.oc_skill ?? 0;
            hits = (oskill !== -P_BOW && oskill !== -P_CROSSBOW
                && oskill !== -P_DART && oskill !== -P_SHURIKEN
                && oskill !== P_SPEAR
                && oskill !== P_KNIFE);
            break;
        }
        case ARMOR_CLASS:
            hits = (game.objects?.[obj_type]?.oc_armcat ?? -1) !== ARM_GLOVES;
            break;
        case TOOL_CLASS:
            hits = (obj_type !== SKELETON_KEY && obj_type !== LOCK_PICK
                && obj_type !== CREDIT_CARD && obj_type !== TALLOW_CANDLE
                && obj_type !== WAX_CANDLE && obj_type !== LENSES
                && obj_type !== TIN_WHISTLE && obj_type !== MAGIC_WHISTLE);
            break;
        case ROCK_CLASS:
            if (obj_type !== STATUE
                || (mons(otmp.corpsenm)?.msize ?? 0) > MZ_TINY) {
                hits = true;
            }
            break;
        case FOOD_CLASS:
            if (obj_type === CORPSE
                && (mons(otmp.corpsenm)?.msize ?? 0) > MZ_TINY) {
                hits = true;
            } else {
                hits = (obj_type === MEAT_STICK
                    || obj_type === ENORMOUS_MEATBALL);
            }
            break;
        case SPBOOK_CLASS:
        case WAND_CLASS:
        case BALL_CLASS:
        case CHAIN_CLASS:
            hits = true;
            break;
        default:
            break;
        }
    }

    if (hits && whodidit !== -1) {
        await hit_bars(
            obj_p, x, y, barsx, barsy,
            (whodidit === 1) ? BRK_BY_HERO : 0,
        );
    }
    return hits;
}
