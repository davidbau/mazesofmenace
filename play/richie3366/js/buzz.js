// buzz.js — Hero + monster beam floor effects (`zap.c` **`ubuzz`/`buzz`/`dobuzz`**, **`muse.c`**).
// C ref: zap.c **`ubuzz`**, **`buzz`**, **`dobuzz`**, **`weffects`**;
//        muse.c **`use_offensive`** (**`BZ_M_WAND(BZ_OFS_WAN(otmp->otyp))`**, **`sgn(mux-mx)`**),
//        frost horn **`BZ_M_WAND(BZ_OFS_AD(AD_COLD|AD_FIRE))`**;
//        include/hack.h **`BZ_*`**, **`BZ_OFS_AD`**, **`BZ_OFS_SPE`**;
//        include/monattk.h **`AD_*`**.

import { zapOverFloorAlongRay, ZT_WAND } from './zap_over_floor.js';
import { isok } from './const.js';
import { rn1 } from './rng.js';

/** C: objects.h — wand of digging immediately before magic missile (**`mklev.js`** pins **305**). */
export const WAN_DIGGING = 305;

/** C: objects.h — first RAY wand after **`WAN_DIGGING`** ( **`mklev.js`** pins digging at **305**). */
export const WAN_MAGIC_MISSILE = 306;

/** NH **5.0.0** **`objects_nums`** contiguous **`WAND_CLASS`** — magic missile..lightning (**`weffects`** ray block **428..433**). */
const OTYP_NH5_WAN_MAGIC_MISSILE = 428;
const OTYP_NH5_WAN_LIGHTNING = 433;

/** C: objects.h — **`WAN_FIRE`** after magic missile. */
export const WAN_FIRE = WAN_MAGIC_MISSILE + 1;

/** C: objects.h — ray wands follow **`WAN_MAGIC_MISSILE`** order (**`zap.c`** **`weffects`**). */
export const WAN_COLD = WAN_MAGIC_MISSILE + 2;

/** C: objects.h — **`WAN_SLEEP`** … **`WAN_LIGHTNING`** (**`zap.c`** **`weffects`** ray block). */
export const WAN_SLEEP = WAN_MAGIC_MISSILE + 3;
export const WAN_DEATH = WAN_MAGIC_MISSILE + 4;
export const WAN_LIGHTNING = WAN_MAGIC_MISSILE + 5;

/** C: objects.h / **`spellbook_skill_level_data.js`** — first RAY spell (**`SPELL("magic missile"`**). */
export const SPE_MAGIC_MISSILE = 367;

/** C: monattk.h */
export const AD_MAGM = 1;
export const AD_FIRE = 2;
export const AD_COLD = 3;

/**
 * C: hack.h **`BZ_OFS_WAN(otyp)`**.
 * @param {number} otyp
 */
export function BZ_OFS_WAN(otyp) {
    const t = otyp | 0;
    const base = t >= 409 && t <= OTYP_NH5_WAN_LIGHTNING ? OTYP_NH5_WAN_MAGIC_MISSILE : WAN_MAGIC_MISSILE;
    return Math.abs(t - base) % 10;
}

/**
 * C: hack.h **`BZ_OFS_SPE(otyp)`**.
 * @param {number} otyp
 */
export function BZ_OFS_SPE(otyp) {
    return Math.abs((otyp | 0) - SPE_MAGIC_MISSILE) % 10;
}

/**
 * C: hack.h **`BZ_OFS_AD(adtyp)`**.
 * @param {number} adtyp
 */
export function BZ_OFS_AD(adtyp) {
    return Math.abs((adtyp | 0) - AD_MAGM) % 10;
}

/** C: hack.h **`BZ_M_WAND(bztyp)`** — monster wand / frost-horn-as-wand encoding (**`-39..-30`**). */
export function BZ_M_WAND(bztyp) {
    return -30 - (bztyp | 0);
}

/** C: hack.h **`BZ_M_SPELL(bztyp)`** — monster spell (**`-19..-10`**). */
export function BZ_M_SPELL(bztyp) {
    return -10 - (bztyp | 0);
}

/** C: hack.h **`BZ_M_BREATH(bztyp)`** — monster breath (**`-29..-20`**). */
export function BZ_M_BREATH(bztyp) {
    return -20 - (bztyp | 0);
}

/**
 * C: hack.h **`BZ_U_WAND(bztyp)`** → **`ZT_WAND`** hero wand **`dobuzz`** type.
 * @param {number} otyp — e.g. **`WAN_FIRE`** (**`WAN_MAGIC_MISSILE` + 1**)
 */
export function wandUbuzzTypeFromOtyp(otyp) {
    return ZT_WAND(BZ_OFS_WAN(otyp));
}

/** C: muse.c offensive wand — **`BZ_M_WAND(BZ_OFS_WAN(otyp))`**. */
export function wandMbuzzTypeFromOtyp(otyp) {
    return BZ_M_WAND(BZ_OFS_WAN(otyp));
}

/** C: muse.c monster spell ray — **`BZ_M_SPELL(BZ_OFS_SPE(otyp))`**. */
export function spellMbuzzTypeFromOtyp(otyp) {
    return BZ_M_SPELL(BZ_OFS_SPE(otyp));
}

/** C: muse.c frost horn — **`BZ_M_WAND(BZ_OFS_AD(AD_COLD|AD_FIRE))`**. */
export function hornMbuzzTypeFromAd(adtyp) {
    return BZ_M_WAND(BZ_OFS_AD(adtyp));
}

/** C: muse.c **`sgn(mtmp->mux - mtmp->mx)`** style. */
export function sgn(n) {
    const v = n | 0;
    if (v > 0) return 1;
    if (v < 0) return -1;
    return 0;
}

/**
 * C: zap.c **`ubuzz(type, nd)`** → **`dobuzz(type, nd, u.ux, u.uy, u.dx, u.dy, …)`**.
 * Floor/shop slice only — **`nd`** reserved for future **`zhitm`** parity.
 *
 * @param {import('./gstate.js').game} g
 * @param {number} type — **`ZT_WAND`/`ZT_SPELL`/`ZT_BREATH`** encoding
 * @param {number} [_nd]
 * @param {number} [maxRange]
 * @param {{ value?: boolean }|null} [shopdamageRef]
 */
export async function ubuzzOverFloor(g, type, _nd = 0, maxRange, shopdamageRef = null) {
    const u = g.u;
    if (!u) return;
    await zapOverFloorAlongRay(
        g,
        u.ux | 0,
        u.uy | 0,
        u.dx | 0,
        u.dy | 0,
        type | 0,
        maxRange === undefined ? undefined : maxRange,
        shopdamageRef,
    );
}

/**
 * C: zap.c **`buzz(type, nd, sx, sy, dx, dy)`** → **`dobuzz`** — arbitrary start + direction.
 * @param {import('./gstate.js').game} g
 * @param {number} type — hero (**`≥0`**) or monster (**`BZ_M_*`** negative) **`dobuzz`** type
 * @param {number} [_nd]
 * @param {number} sx
 * @param {number} sy
 * @param {number} dx
 * @param {number} dy
 * @param {number} [maxRange]
 * @param {{ value?: boolean }|null} [shopdamageRef]
 */
export async function mbuzzOverFloor(g, type, _nd, sx, sy, dx, dy, maxRange, shopdamageRef = null) {
    await zapOverFloorAlongRay(
        g,
        sx | 0,
        sy | 0,
        dx | 0,
        dy | 0,
        type | 0,
        maxRange === undefined ? undefined : maxRange,
        shopdamageRef,
    );
}

/**
 * C: **`muse.c`** **`use_offensive`** + **`zap.c`** **`buzz`** — ray from **`(mx,my)`** toward **`(mux,muy)`**;
 * first floor tile is **`(mx+dx,my+dy)`** (**`zapOverFloorAlongRay`** loop **`i >= 1`**).
 *
 * **`mux`/`muy`** default to hero (**`g.u`**) when absent, like a monster targeting **`u`**.
 *
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>|null|undefined} mtmp
 * @param {number} buzzType — **`BZ_M_*`** or hero **`ZT_*`**
 * @param {number} _nd — C **`dobuzz`** nd; reserved for **`zhitm`**
 * @param {number} [maxRange]
 * @param {{ value?: boolean }|null} [shopdamageRef]
 * @returns {Promise<boolean>} false if no **`mtmp`**, aim **(0,0)**, or **`!isok(mx,my)`**
 */
export async function mbuzzFromMonsterTowardMux(g, mtmp, buzzType, _nd, maxRange, shopdamageRef = null) {
    if (!mtmp) return false;
    const mx = mtmp.mx | 0;
    const my = mtmp.my | 0;
    if (!isok(mx, my)) return false;
    const u = g.u;
    const hasMux = mtmp.mux !== undefined && mtmp.mux !== null;
    const hasMuy = mtmp.muy !== undefined && mtmp.muy !== null;
    const mux = hasMux ? mtmp.mux | 0 : (u ? u.ux | 0 : mx);
    const muy = hasMuy ? mtmp.muy | 0 : (u ? u.uy | 0 : my);
    const dx = sgn(mux - mx);
    const dy = sgn(muy - my);
    if (dx === 0 && dy === 0) return false;
    await mbuzzOverFloor(g, buzzType, _nd, mx, my, dx, dy, maxRange, shopdamageRef);
    return true;
}

/** C: **`muse.c`** **`use_offensive`** — ray wand **`nd`** (**`WAN_MAGIC_MISSILE`** → **2**, else **6**). */
export function museOffensiveRayWandNdLikeC(otyp) {
    const t = otyp | 0;
    return t === WAN_MAGIC_MISSILE || t === OTYP_NH5_WAN_MAGIC_MISSILE ? 2 : 6;
}

/**
 * C: **`muse.c`** **`use_offensive`** — **`MUSE_WAN_DEATH`** … **`MUSE_WAN_MAGIC_MISSILE`**:
 * **`buzz(BZ_M_WAND(BZ_OFS_WAN(otyp)), nd, mx, my, sgn(mux-mx), sgn(muy-my))`** (floor slice).
 * Sets **`mtmp.mwandexp`** when a beam is emitted (**`C`** trains monster after zapping).
 * Omits **`precheck`** / **`mzapwand`** / **`buzz`** vs **`buzz_force_miss`** (**`zhitm`** / charges).
 *
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 * @param {number} otyp — wand **`otyp`**
 * @param {{ value?: boolean }|null} [shopdamageRef]
 */
export async function mbuzzOffensiveWandFromMonsterTowardMux(g, mtmp, otyp, shopdamageRef = null) {
    const type = wandMbuzzTypeFromOtyp(otyp);
    const nd = museOffensiveRayWandNdLikeC(otyp);
    const ok = await mbuzzFromMonsterTowardMux(g, mtmp, type, nd, undefined, shopdamageRef);
    if (ok && mtmp && typeof mtmp === 'object') mtmp.mwandexp = 1;
    return ok;
}

/**
 * C: **`muse.c`** **`use_offensive`** — **`MUSE_FIRE_HORN`** / **`MUSE_FROST_HORN`**:
 * **`buzz(BZ_M_WAND(BZ_OFS_AD(AD_FIRE|AD_COLD)), rn1(6,6), mx, my, …)`** (floor slice; **`nd`** reserved).
 *
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 * @param {boolean} frost — **`FROST_HORN`** vs **`FIRE_HORN`**
 * @param {{ value?: boolean }|null} [shopdamageRef]
 */
export async function mbuzzOffensiveMagicHornFromMonsterTowardMux(g, mtmp, frost, shopdamageRef = null) {
    const nd = rn1(6, 6);
    const ad = frost ? AD_COLD : AD_FIRE;
    const type = hornMbuzzTypeFromAd(ad);
    const ok = await mbuzzFromMonsterTowardMux(g, mtmp, type, nd, undefined, shopdamageRef);
    if (ok && mtmp && typeof mtmp === 'object') mtmp.mwandexp = 1;
    return ok;
}

/**
 * Wizard harness: virtual monster on **`(u.ux+u.dx, u.uy+u.dy)`** zaps toward the hero
 * (**`muse.c`** aim **`sgn(u.ux-mx)`**, **`sgn(u.uy-my)`** — same as **`mbuzzFromMonsterTowardMux`**).
 * @returns {Promise<boolean>} false if **`u.dx`=`u.dy`=0`**, bad neighbor, or aim **(0,0)**
 */
export async function mbuzzTowardHeroFromFacingNeighbor(g, type, nd = 6, maxRange, shopdamageRef = null) {
    const u = g.u;
    if (!u) return false;
    const dx0 = u.dx | 0;
    const dy0 = u.dy | 0;
    if (dx0 === 0 && dy0 === 0) return false;
    const sx = (u.ux + dx0) | 0;
    const sy = (u.uy + dy0) | 0;
    if (!isok(sx, sy)) return false;
    const mtmp = { mx: sx, my: sy, mux: u.ux | 0, muy: u.uy | 0 };
    return mbuzzFromMonsterTowardMux(g, mtmp, type, nd, maxRange, shopdamageRef);
}
