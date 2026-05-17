// bhit_throw_hero.js — zap.c bhit(THROWN_WEAPON) ray + dothrow.c throwit landing tail (hero).
// C ref: zap.c bhit() (THROWN_WEAPON branch); dothrow.c throwit() after bhit().

import { isok } from './hacklib.js';
import {
    ZAP_POS,
    IS_WATERWALL,
    LAVAWALL,
    IRONBARS,
    SINK,
    IS_SOFT,
    OTYP_HEAVY_IRON_BALL,
    OTYP_BOULDER,
    OTYP_IRON_CHAIN,
    M_AP_OBJECT,
    M_AP_TYPMASK,
    TT_WEB,
    A_STR,
    BOLT_LIM,
    P_CROSSBOW,
    P_BOW,
    P_DART,
    P_SHURIKEN,
    P_SPEAR,
    P_KNIFE,
    Is_airlevel,
    NO_ROOM,
    WT_IRON_BALL_INCR,
    CORR,
    ROOM,
    DOOR,
    D_NODOOR,
    W_NONDIGGABLE,
} from './const.js';
import { isAmmo, ammoAndLauncherLikeC, weaponType, isPickLikeC } from './weapon_kind.js';
import { acurr } from './attrib.js';
import { CORPSE_OTYP } from './mkobj_corpse.js';
import { isSpecialHeroUzLikeC } from './sp_levchn.js';
import { isPoolCellLikeC } from './fillholetyp.js';
import { OBJ_ROCK, dmgval } from './mthrowu.js';
import { rnd, rn2 } from './rng.js';
import { raceptr, stubPermonstForCorpsenm, cantDrown, S_EEL } from './mondata.js';
import { pSkillDisplayName } from './skill_display_name.js';
import { an } from './decor.js';
import { nh5HeroObjectClass } from './water_damage.js';
import { pline, newsym, mapInvisibleCellLikeC, show_glyph_cell } from './display.js';
import { CLR_WHITE } from './terminal.js';
import { cansee } from './vision.js';
import { doname } from './objnam.js';
import {
    NH5_WEAPON_CLASS,
    NH5_GEM_CLASS,
    NH5_ARMOR_CLASS,
    NH5_TOOL_CLASS,
    NH5_ROCK_CLASS,
    NH5_FOOD_CLASS,
    NH5_POTION_CLASS,
    NH5_SPBOOK_CLASS,
    NH5_WAND_CLASS,
    NH5_BALL_CLASS,
    NH5_CHAIN_CLASS,
    NH5_COIN_CLASS,
    NH5_SCROLL_CLASS,
    NH5_RING_CLASS,
    NH5_AMULET_CLASS,
} from './nh5_objclass.js';
import { breaktestLikeC, heroBreaksObjLikeC, BRK_FROM_INV } from './obj_break_dothrow.js';
import { flooreffectsObjAtLikeC } from './flooreffects_hero.js';
import { placeFloorObjectInLevel, stackObjOnFloorInLevel } from './floorobj.js';
import { shipObjectThrownHeroLikeC } from './impact_drop.js';
import { checkShopObjAfterHeroPlaceLikeC, insideShopLevlRoomno, inRoomsShopbaseRoomnos, shkcatchThrownPickHeroLikeC } from './shop.js';
import { isClosedDoorLoc } from './walkable.js';

/** C: objects_nums — venom otyps for breakobj-style landing (dothrow.c throwit). */
const OTYP_BLINDING_VENOM = 478;
const OTYP_ACID_VENOM = 479;
/** C: obj_break_dothrow.js / objects — mirror for uhitm.c shade_aware. */
const OTYP_MIRROR_SHADE = 230;

/** C: dothrow.c throwing_weapon() subset — WEAPON_CLASS until is_missile / is_blade port. */
export function throwingWeaponHeroThrowitLikeC(obj) {
    return (obj?.oclass | 0) === NH5_WEAPON_CLASS;
}

/**
 * C: dothrow.c throwit urange/range before bhit (uball cap, boulder, Mjollnir, aklys, tether omitted).
 * @param {import('./gstate.js').game} g
 */
export async function thrownWeaponRangeHeroLikeC(g, obj) {
    const u = g.u;
    if (!u || !obj) return 1;
    const uwep = u.uwep ?? null;
    const str = (u.acurr?.a?.[A_STR] ?? 10) | 0;
    const crossbowing =
        ammoAndLauncherLikeC(obj, uwep) && weaponType(uwep) === P_CROSSBOW;
    let urange = crossbowing ? 9 : Math.trunc(str / 2);
    let range = urange - Math.trunc((obj.owt | 0) / 40);
    if ((obj.otyp | 0) === OTYP_HEAVY_IRON_BALL) {
        range = urange - Math.trunc((obj.owt | 0) / 100);
    }
    if (range < 1) range = 1;

    if (isAmmo(obj)) {
        if (ammoAndLauncherLikeC(obj, uwep)) {
            if (crossbowing) range = BOLT_LIM;
            else range++;
        } else if ((nh5HeroObjectClass(obj) | 0) !== NH5_GEM_CLASS) {
            range = Math.trunc(range / 2);
            const sk = weaponType(obj);
            await pline(
                `You aren't wielding ${an(pSkillDisplayName(sk, g))}, so you throw ${doname(obj, g)} by hand.`,
            );
        }
    }

    if (Is_airlevel(u.uz) || (u.Levitation | 0)) {
        urange -= range;
        if (urange < 1) urange = 1;
        range -= urange;
        if (range < 1) range = 1;
    }

    if ((u.underwater | 0) !== 0) range = 1;
    return range;
}

function trapAtG(g, x, y) {
    return g.level?.traps?.find((t) => (t.tx | 0) === (x | 0) && (t.ty | 0) === (y | 0)) ?? null;
}

function monAtCellG(g, x, y) {
    return g.level?.monsters?.find((m) => (m.mx | 0) === (x | 0) && (m.my | 0) === (y | 0)) ?? null;
}

/** C: **`display.c`** **`obj_to_glyph`** subset — thrown **`tmp_at`** flash (**`DISP_FLASH`**). */
function thrownObjTmpGlyphHeroLikeC(obj) {
    if (!obj) return { ch: ')', color: CLR_WHITE, dec: false };
    const ot = obj.otyp | 0;
    if (ot === OTYP_BOULDER) return { ch: '`', color: CLR_WHITE, dec: false };
    if (ot === OBJ_ROCK) return { ch: '*', color: CLR_WHITE, dec: false };
    if (ot === OTYP_HEAVY_IRON_BALL || ot === OTYP_IRON_CHAIN) return { ch: '*', color: CLR_WHITE, dec: false };
    const oc = obj.oclass | 0;
    if (oc === NH5_WEAPON_CLASS) return { ch: ')', color: CLR_WHITE, dec: false };
    if (oc === NH5_GEM_CLASS || oc === NH5_ROCK_CLASS) return { ch: '*', color: CLR_WHITE, dec: false };
    if (oc === NH5_COIN_CLASS) return { ch: '$', color: CLR_WHITE, dec: false };
    if (oc === NH5_POTION_CLASS) return { ch: '!', color: CLR_WHITE, dec: false };
    if (oc === NH5_SCROLL_CLASS) return { ch: '?', color: CLR_WHITE, dec: false };
    if (oc === NH5_ARMOR_CLASS) return { ch: '[', color: CLR_WHITE, dec: false };
    if (oc === NH5_TOOL_CLASS) return { ch: '(', color: CLR_WHITE, dec: false };
    if (oc === NH5_FOOD_CLASS) return { ch: '%', color: CLR_WHITE, dec: false };
    if (oc === NH5_WAND_CLASS) return { ch: '/', color: CLR_WHITE, dec: false };
    if (oc === NH5_RING_CLASS) return { ch: '=', color: CLR_WHITE, dec: false };
    if (oc === NH5_AMULET_CLASS) return { ch: '"', color: CLR_WHITE, dec: false };
    if (oc === NH5_SPBOOK_CLASS) return { ch: '+', color: CLR_WHITE, dec: false };
    if (oc === NH5_BALL_CLASS || oc === NH5_CHAIN_CLASS) return { ch: '*', color: CLR_WHITE, dec: false };
    return { ch: ')', color: CLR_WHITE, dec: false };
}

let _thrownTmpFlashCell = /** @type {{ x: number, y: number } | null} */ (null);

/** C: **`zap.c`** **`bhit`** **`tmp_at(DISP_END,0)`**-style cleanup for one **`tmp_at(x,y)`** flash cell. */
async function clearThrownMissileTmpAtFlashG(g) {
    void g;
    if (_thrownTmpFlashCell) {
        newsym(_thrownTmpFlashCell.x, _thrownTmpFlashCell.y);
        _thrownTmpFlashCell = null;
    }
}

/**
 * C: **`zap.c`** **`bhit`** — **`tmp_at(x,y)`** + **`nh_delay_output`** ( **`show_glyph_cell`** + **`animationFrame`** ).
 * @param {import('./gstate.js').game} g
 */
async function stepThrownMissileTmpAtHeroLikeC(g, x, y, obj) {
    await clearThrownMissileTmpAtFlashG(g);
    const gl = thrownObjTmpGlyphHeroLikeC(obj);
    show_glyph_cell(x, y, gl.ch, gl.color, gl.dec);
    _thrownTmpFlashCell = { x: x | 0, y: y | 0 };
    if (typeof g.animationFrame === 'function') await g.animationFrame();
}

/** C: you.h m_next2u — distu(mon) <= 2 (**`dist2`** vs hero). */
function distuSqHeroToMonLikeC(g, mx, my) {
    const u = g.u;
    if (!u) return 999;
    const dx = (mx | 0) - (u.ux | 0);
    const dy = (my | 0) - (u.uy | 0);
    return dx * dx + dy * dy;
}

/** C: mon.c canspotmon subset — steed / invis / cansee. */
function canspotMonThrownBhitLikeC(g, mtmp) {
    const u = g.u;
    if (!mtmp || !u) return false;
    if ((u.usteed | 0) && u.usteed === mtmp) return true;
    if ((mtmp.minvis | 0) && !(u.See_invisible | 0)) return false;
    return cansee(mtmp.mx | 0, mtmp.my | 0);
}

function senseMonThrownBhitStub(_mtmp) {
    return false;
}

/** C: uhitm.c shade_aware (subset: no CLOVE_OF_GARLIC otyp until wired). */
function shadeAwareThrownLikeC(obj) {
    if (!obj) return false;
    const t = obj.otyp | 0;
    if (t === OTYP_BOULDER || t === OTYP_HEAVY_IRON_BALL || t === OTYP_IRON_CHAIN) return true;
    if (t === OTYP_MIRROR_SHADE) return true;
    if ((obj.oc_material | 0) === OC_MAT_SILVER) return true;
    return false;
}

function glyphIsInvisibleAtThrownLikeC(g, x, y) {
    const loc = g.level?.at(x | 0, y | 0);
    return loc?.disp_ch === 'I';
}

/** Until mapglyph draws monsters, false (warning / telepathy monster glyph TODO). */
function glyphIsMonsterAtThrownLikeC(_g, _x, _y) {
    return false;
}

function glyphIsWarningAtThrownLikeC(mtmp) {
    return !!(mtmp?.warn_of_mon || mtmp?.data?.warn_of_mon);
}

/**
 * C: uhitm.c shade_miss — hero vs monster, thrown branch.
 * @returns {Promise<boolean>} true = missile passes through (clear **`mtmp`** in **`bhit`**)
 */
async function shadeMissThrownHeroLikeC(g, mdef, obj, thrown, verbose) {
    const ptr = raceptr(mdef);
    if (ptr?.mname !== 'shade' || (obj && dmgval(obj, mdef))) return false;

    const u = g.u;
    const mx = mdef.mx | 0;
    const my = mdef.my | 0;
    const canVerb =
        verbose
        && (cansee(mx, my) || senseMonThrownBhitStub(mdef)
            || (u && distuSqHeroToMonLikeC(g, mx, my) <= 2));

    if (canVerb) {
        const harmlesslyThru = ' harmlessly through ';
        const target = mdef.monnam || mdef.data?.mname || 'monster';
        if (thrown) {
            if (!obj || shadeAwareThrownLikeC(obj)) {
                await pline(`The attack passes${harmlesslyThru}the ${target}.`);
            } else {
                const base = doname(obj, g).replace(/^(a |an |the )/i, '');
                const plural = (obj.quan | 0) > 1;
                const v = plural ? 'pass' : 'passes';
                await pline(`The ${base} ${v}${harmlesslyThru}the ${target}.`);
            }
        }
        if (!canspotMonThrownBhitLikeC(g, mdef)) mapInvisibleCellLikeC(mx, my);
    }
    mdef.msleeping = 0;
    return true;
}

/** C: zap.c bhit — skip monster hit when shade_miss or mimic-as-object glyph guards. */
async function clearMtmpThrownBhitShadeMimicLikeC(g, mtmp, bx, by, obj) {
    if (!mtmp) return null;
    const ap = (mtmp.m_ap_type ?? 0) & M_AP_TYPMASK;
    const xyglyph = {
        monster: glyphIsMonsterAtThrownLikeC(g, bx, by),
        warning: glyphIsWarningAtThrownLikeC(mtmp),
        invisible: glyphIsInvisibleAtThrownLikeC(g, bx, by),
    };
    const mimicPass =
        ap === M_AP_OBJECT
        && !xyglyph.monster
        && !xyglyph.warning
        && !xyglyph.invisible;
    if ((await shadeMissThrownHeroLikeC(g, mtmp, obj, true, true)) || mimicPass) return null;
    return mtmp;
}

/** C: zap.c skiprange() — thrown ROCK skip band (rnd order matches C). */
function skiprangeThrownRockLikeC(range) {
    const r = range | 0;
    const tr = Math.trunc(r / 4);
    const tmp = r - (tr > 0 ? rnd(tr) : 0);
    let skipend = tmp - Math.trunc((tmp / 4) * rnd(3));
    if (skipend >= tmp) skipend = tmp - 1;
    return { skipstart: tmp, skipend };
}

function heroBlindThrow(g) {
    const u = g.u;
    return !!(u?.ublind || (u?.timed?.blind ?? 0) > 0);
}

/** C: zap.c bhit-local M_IN_WATER(ptr) — eel or cant_drown. */
function monInWaterZapThrownRockLikeC(ptr) {
    if (!ptr) return false;
    return (ptr.mlet | 0) === S_EEL || cantDrown(ptr);
}

function canspotMonThrownRockSkipLikeC(g, mtmp) {
    const u = g.u;
    if (!mtmp || !u) return false;
    if ((u.usteed | 0) && u.usteed === mtmp) return true;
    if ((mtmp.minvis | 0) && !(u.See_invisible | 0)) return false;
    return cansee(mtmp.mx | 0, mtmp.my | 0);
}

/** C: monmove.c dissolve_bars + mthrowu.c hit_bars POT_ACID branch (subset: no switch_terrain). */
async function dissolveBarsCellThrownHeroLikeC(g, bx, by) {
    const loc = g.level?.at(bx | 0, by | 0);
    if (!loc) return;
    const inAnyRoom = inRoomsShopbaseRoomnos(g, bx | 0, by | 0).length > 0;
    const spec = isSpecialHeroUzLikeC(g);
    loc.typ = (loc.edge | 0) === 1 ? DOOR : spec || inAnyRoom ? ROOM : CORR;
    if ((loc.typ | 0) === DOOR) loc.doormask = D_NODOOR;
    loc.flags = 0;
    await newsym(bx | 0, by | 0);
}

const OTYP_STATUE_BARS = 472;
const OTYP_WAR_HAMMER_BARS = 77;
const OTYP_POT_ACID_BARS = 319;
const OTYP_RUBBER_HOSE_BARS = 79;
const MZ_TINY_C = 0;

const TOOL_OTYP_PASSES_IRON_BARS = new Set([
    222, 223, 224, 225, 226, 232, 246, 247,
]);

const OC_MAT_CLOTH = 6;
const OC_MAT_LEATHER = 7;
const OC_MAT_SILVER = 14;
const OC_MAT_GOLD = 15;

const BAR_SOUND = ['', 'Whang', 'Whap', 'Flapp', 'Clink', 'Clonk'];

function heroDeafThrownBars(g) {
    return (g.u?.timed?.deaf ?? 0) > 0;
}

/** C: dothrow.c harmless_missile() subset for mthrowu.c hit_bars sound index. */
function harmlessMissileHitBarsLikeC(obj) {
    if (!obj) return false;
    if ((obj.oclass | 0) === NH5_SCROLL_CLASS) return true;
    const mat = obj.oc_material | 0;
    if (mat === OC_MAT_CLOTH) return true;
    return false;
}

/** C: obj.h is_flimsy (oc_material <= LEATHER || rubber hose). */
function isFlimsyHitBarsLikeC(obj) {
    if (!obj) return false;
    const mat = obj.oc_material | 0;
    if (mat > 0 && mat <= OC_MAT_LEATHER) return true;
    return (obj.otyp | 0) === OTYP_RUBBER_HOSE_BARS;
}

/**
 * C: mthrowu.c hits_bars (whodidit −1 check omitted; hero throw uses hit_bars).
 * @param {number} alwaysHit — C int: 0 use class switch, non-zero force hit
 */
function hitsBarsThrownMissileLikeC(obj, alwaysHit) {
    if (!obj) return false;
    if (alwaysHit) return true;
    const oc = obj.oclass | 0;
    const ot = obj.otyp | 0;
    const sk = weaponType(obj);
    switch (oc) {
        case NH5_WEAPON_CLASS:
            return (
                sk !== -P_BOW
                && sk !== -P_CROSSBOW
                && sk !== -P_DART
                && sk !== -P_SHURIKEN
                && sk !== P_SPEAR
                && sk !== P_KNIFE
            );
        case NH5_ARMOR_CLASS:
            return true;
        case NH5_TOOL_CLASS:
            return !TOOL_OTYP_PASSES_IRON_BARS.has(ot);
        case NH5_ROCK_CLASS:
            if (ot !== OTYP_STATUE_BARS) return true;
            return (stubPermonstForCorpsenm(obj.corpsenm | 0).msize | 0) > MZ_TINY_C;
        case NH5_FOOD_CLASS:
            if (ot === CORPSE_OTYP) {
                return (stubPermonstForCorpsenm(obj.corpsenm | 0).msize | 0) > MZ_TINY_C;
            }
            return false;
        case NH5_SPBOOK_CLASS:
        case NH5_WAND_CLASS:
        case NH5_BALL_CLASS:
        case NH5_CHAIN_CLASS:
            return true;
        default:
            return false;
    }
}

/**
 * C: mthrowu.c hit_bars (hero **`BRK_BY_HERO`** → **`hero_breaks`** without **`BRK_FROM_INV`**).
 * @returns {Promise<{ consumed: boolean }>}
 */
async function hitBarsThrownHeroLikeC(g, obj, objx, objy, barsx, barsy) {
    if (!obj) return { consumed: false };
    const objType = obj.otyp | 0;
    const barsLoc = g.level?.at(barsx | 0, barsy | 0);
    const nodissolve = ((barsLoc?.wall_info | 0) & W_NONDIGGABLE) !== 0;

    if (await heroBreaksObjLikeC(g, obj, objx | 0, objy | 0, 0)) {
        if (objType === OTYP_POT_ACID_BARS) {
            if (cansee(barsx | 0, barsy | 0) && !nodissolve) {
                await pline('The iron bars are dissolved!');
            } else {
                await pline('You hear a hissing noise.');
            }
            if (!nodissolve) await dissolveBarsCellThrownHeroLikeC(g, barsx, barsy);
        }
        return { consumed: true };
    }

    if (!heroDeafThrownBars(g)) {
        let bsindx =
            objType === OTYP_BOULDER || objType === OTYP_HEAVY_IRON_BALL
                ? 1
                : harmlessMissileHitBarsLikeC(obj)
                  ? 2
                  : isFlimsyHitBarsLikeC(obj)
                    ? 3
                    : (obj.oclass | 0) === NH5_COIN_CLASS
                        || (obj.oc_material | 0) === OC_MAT_GOLD
                        || (obj.oc_material | 0) === OC_MAT_SILVER
                      ? 4
                      : BAR_SOUND.length - 1;
        const snd = BAR_SOUND[bsindx] || 'Clonk';
        await pline(`${snd}!`);
    }

    let noise = 0;
    if (!(harmlessMissileHitBarsLikeC(obj) || isFlimsyHitBarsLikeC(obj))) noise = 4 * 4;

    if ((obj.otyp | 0) === OTYP_WAR_HAMMER_BARS || (obj.otyp | 0) === OTYP_HEAVY_IRON_BALL) {
        const spe =
            (obj.otyp | 0) === OTYP_HEAVY_IRON_BALL
                ? Math.trunc((obj.owt | 0) / WT_IRON_BALL_INCR)
                : obj.spe | 0;
        const chance = 60 - acurr(A_STR) - spe;
        if (!rn2(Math.max(2, chance))) {
            await pline('You break the bars apart!');
            await dissolveBarsCellThrownHeroLikeC(g, barsx, barsy);
            noise *= 2;
        }
    }

    void noise;
    return { consumed: false };
}

/**
 * C: zap.c bhit — THROWN_WEAPON, fhitm/fhito null (subset: shade_miss + mimic M_AP_OBJECT; **`tmp_at`** and **`nh_delay_output`** via **`show_glyph_cell`** + **`game.animationFrame`**; still omits **`DISP_FLASH`** init glyph, **`glyph_is_invisible`** unmap, tether **`DISP_TETHER`**).
 * @returns {Promise<{ x: number, y: number, mon: object|null, stuckWeb: boolean, shkCaught?: boolean, objConsumed?: boolean }>}
 */
export async function walkThrownWeaponBhitRayHeroLikeC(g, dx, dy, range0, obj) {
    const u = g.u;
    if (!u || !g.level) return { x: u?.ux | 0, y: u?.uy | 0, mon: null, stuckWeb: false };

    const ddx = dx | 0;
    const ddy = dy | 0;
    let bx = u.ux | 0;
    let by = u.uy | 0;
    let range = range0 | 0;
    let stuckWeb = false;
    let hitMon = null;

    let skiprangeStart = 0;
    let skiprangeEnd = 0;
    let skipCount = 0;
    let allowSkip = false;
    let inSkip = false;
    if (obj && (obj.otyp | 0) === OBJ_ROCK) {
        const sr = skiprangeThrownRockLikeC(range);
        skiprangeStart = sr.skipstart;
        skiprangeEnd = sr.skipend;
        allowSkip = !rn2(3);
    }

    let pointBlank = true;

    while (range > 0) {
        range--;
        bx += ddx;
        by += ddy;
        if (!isok(bx, by)) {
            bx -= ddx;
            by -= ddy;
            await clearThrownMissileTmpAtFlashG(g);
            break;
        }
        const loc = g.level.at(bx, by);
        if (!loc) {
            bx -= ddx;
            by -= ddy;
            await clearThrownMissileTmpAtFlashG(g);
            break;
        }
        if (obj && isPickLikeC(obj) && insideShopLevlRoomno(g, bx, by) !== NO_ROOM) {
            const caught = await shkcatchThrownPickHeroLikeC(g, obj, bx, by);
            if (caught) {
                await clearThrownMissileTmpAtFlashG(g);
                return { x: bx, y: by, mon: null, stuckWeb: false, shkCaught: true };
            }
        }
        const typ = loc.typ | 0;

        if (IS_WATERWALL(typ) || typ === LAVAWALL) {
            await clearThrownMissileTmpAtFlashG(g);
            break;
        }
        if (typ === IRONBARS && obj) {
            const prevX = bx - ddx;
            const prevY = by - ddy;
            const alwaysHit = pointBlank ? 0 : !rn2(5) ? 1 : 0;
            if (hitsBarsThrownMissileLikeC(obj, alwaysHit)) {
                const hb = await hitBarsThrownHeroLikeC(g, obj, prevX, prevY, bx, by);
                bx = prevX;
                by = prevY;
                if (hb.consumed) {
                    await clearThrownMissileTmpAtFlashG(g);
                    return {
                        x: bx,
                        y: by,
                        mon: null,
                        stuckWeb: false,
                        objConsumed: true,
                    };
                }
                await clearThrownMissileTmpAtFlashG(g);
                break;
            }
        }

        let mtmp = monAtCellG(g, bx, by);

        const ttmp = trapAtG(g, bx, by);
        if (!mtmp && ttmp && (ttmp.ttyp | 0) === TT_WEB && !rn2(3)) {
            stuckWeb = true;
            if (!ttmp.tseen) ttmp.tseen = 1;
            if (cansee(bx, by)) {
                const raw = doname(obj, g);
                const cap = raw.charAt(0).toUpperCase() + raw.slice(1);
                await pline(`${cap} gets stuck in a web!`);
            }
            await newsym(bx, by);
            await clearThrownMissileTmpAtFlashG(g);
            break;
        }

        if (skiprangeStart && range === skiprangeStart && allowSkip) {
            if (isPoolCellLikeC(g, bx, by) && !mtmp) {
                inSkip = true;
                const blind = heroBlindThrow(g);
                if (!blind) {
                    const raw = doname(obj, g);
                    const cap = raw.charAt(0).toUpperCase() + raw.slice(1);
                    await pline(`${cap} skips${skipCount ? ' again' : ''}.`);
                } else {
                    await pline('You hear something skip.');
                }
                skipCount++;
            } else if (skiprangeStart > skiprangeEnd + 1) {
                skiprangeStart--;
            }
        }
        if (inSkip) {
            if (range <= skiprangeEnd) {
                inSkip = false;
                if (range > 3) {
                    const sr2 = skiprangeThrownRockLikeC(range);
                    skiprangeStart = sr2.skipstart;
                    skiprangeEnd = sr2.skipend;
                }
            } else if (mtmp && monInWaterZapThrownRockLikeC(raceptr(mtmp))) {
                if (!heroBlindThrow(g) && canspotMonThrownRockSkipLikeC(g, mtmp)) {
                    const on = mtmp.monnam || mtmp.data?.mname || 'it';
                    const raw = doname(obj, g);
                    const cap = raw.charAt(0).toUpperCase() + raw.slice(1);
                    await pline(`${cap} passes over ${on}.`);
                }
                mtmp = null;
            }
        }

        if (mtmp) {
            mtmp = await clearMtmpThrownBhitShadeMimicLikeC(g, mtmp, bx, by, obj);
            if (mtmp) {
                await clearThrownMissileTmpAtFlashG(g);
                hitMon = mtmp;
                break;
            }
        }

        if (!ZAP_POS(typ) || isClosedDoorLoc(loc)) {
            bx -= ddx;
            by -= ddy;
            await clearThrownMissileTmpAtFlashG(g);
            break;
        }
        if (typ === SINK) {
            await stepThrownMissileTmpAtHeroLikeC(g, bx, by, obj);
            await clearThrownMissileTmpAtFlashG(g);
            break;
        }
        await stepThrownMissileTmpAtHeroLikeC(g, bx, by, obj);
        pointBlank = false;
    }

    await clearThrownMissileTmpAtFlashG(g);
    return { x: bx, y: by, mon: hitMon, stuckWeb };
}

/**
 * C: dothrow.c throwit tail — breakobj, flooreffects, ship_object, place_object, stackobj, newsym (subset: splash sound, container_impact, drop_ball omitted).
 * @returns {Promise<boolean>} true if obj consumed
 */
export async function throwitPlaceAfterBhitHeroLikeC(g, obj, tx, ty) {
    const xi = tx | 0;
    const yi = ty | 0;
    const gb = g.gb || (g.gb = {});
    const saveGb = gb.bhitpos;
    const ctx0 = g.context || (g.context = {});
    const saveCtx = ctx0.bhitpos;
    gb.bhitpos = { x: xi, y: yi };
    ctx0.bhitpos = { x: xi, y: yi };
    try {
        const loc = g.level?.at(xi, yi);
        const ltyp = loc?.typ | 0;
        const soft = IS_SOFT(ltyp);
        const otyp = obj?.otyp | 0;
        const venom = otyp === OTYP_BLINDING_VENOM || otyp === OTYP_ACID_VENOM;
        if ((!soft && breaktestLikeC(g, obj)) || venom) {
            if (await heroBreaksObjLikeC(g, obj, xi, yi, BRK_FROM_INV)) return true;
        }
        if (await flooreffectsObjAtLikeC(g, obj, xi, yi, 'fall')) return true;
        if (await shipObjectThrownHeroLikeC(g, obj, xi, yi, false)) return true;
        placeFloorObjectInLevel(g, obj, xi, yi);
        await checkShopObjAfterHeroPlaceLikeC(g, obj, xi, yi);
        stackObjOnFloorInLevel(g, obj);
        await newsym(xi, yi);
        return false;
    } finally {
        gb.bhitpos = saveGb;
        ctx0.bhitpos = saveCtx;
    }
}
