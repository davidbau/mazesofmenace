// god_zaps_hero.js — C pray.c `gods_angry` / `god_zaps_you` / `fry_by_god` subset for `angrygods` default.
// C ref: pray.c gods_angry (~1428), godvoice (~1414), god_zaps_you (~610), fry_by_god (~693); muse.c ureflects (~2835).

import {
    DISINT_RES,
    Is_astralevel,
    Is_sanctum,
    KILLED_BY,
    M_SEEN_DISINT,
    M_SEEN_ELEC,
    M_SEEN_REFL,
    REFLECTING,
    W_ARMC,
    W_ARM,
    W_ARMS,
    XKILL_NOCORPSE,
    XKILL_NOCONDUCT,
    XKILL_NOMSG,
    isok,
} from './const.js';
import { alignGnameLikeC, uhimHeroLikeC } from './pray_align_gname_like_c.js';
import { newsym, pline, shieldeffLikeC } from './display.js';
import { monstseesuLikeC, monstunseesuLikeC } from './mon_seen_res.js';
import { losehp } from './mthrowu.js';
import { monNamUstuckLikeC, monNamMonnamUstuckLikeC } from './pray_pat_spell_gcrown.js';
import { summonMinionHeroLikeC } from './minion_summon_hero.js';
import { rn2 } from './rng.js';
import { AD_DISN } from './destroy_items.js';
import { defendsAdtypOnObjHeroSubsetLikeC, resistsDisintMonLikeC, resistsElecMonLikeC } from './mondata.js';
import { disintegrateArmHeroAtObjGodZapsLikeC } from './disintegrate_arm_hero.js';

/** C: pray.c **`godvoices[]`** + **`ROLL_FROM`**. */
const GODVOICES = ['booms out', 'thunders', 'rings out', 'booms'];

/** C: pline.c **`verbalize`** — quoted **`vpline`** (**`PLINE_VERBALIZE`** flag omitted in JS). */
async function verbalizeHeroLikeC(msg) {
    await pline(`"${msg}"`);
}

/**
 * C: pray.c **`godvoice`** + **`gods_angry`** — **`pline_The("voice of %s %s: \"%s\"")`** with **`rn2(4)`** verb.
 * @param {import('./gstate.js').game} g
 * @param {number} respGod
 */
export async function godsAngryHeroLikeC(g, respGod) {
    const verb = GODVOICES[rn2(4)];
    const name = alignGnameLikeC(g, respGod);
    await pline(`The voice of ${name} ${verb}: "Thou hast angered me."`);
}

function heroBlindGodZapsLikeC(u) {
    return !!(u?.Blind | 0) || !!(u?.ublind | 0) || (u?.timed?.blind ?? 0) > 0;
}

/** C: prop.h **`Reflecting`** / muse.c **`ureflects`** — contest subset (**`u.Reflecting`** intrinsic-style only until **`EReflecting`** is ported). */
function heroReflectingGodZapsLikeC(u) {
    return !!(u?.Reflecting | 0);
}

function heroShockResGodZapsLikeC(u) {
    return !!(u?.Shock_resistance | 0);
}

function heroDisintResGodZapsLikeC(u) {
    return !!(u?.Disint_resistance | 0);
}

/**
 * C: pray.c **`god_zaps_you`** — **`!(EReflecting & W_*)`** and **`!(EDisint_resistance & W_*)`** before **`disintegrate_arm`** on **`uarms`/`uarmc`/`uarm`** (not **`uarmu`**).
 * Uses **`u.uprops[prop].extrinsic`** when set; else **`oc_oprop`** and **`artifact.c`** **`defends(AD_DISN, …)`** on the worn piece.
 * @param {import('./gstate.js').game} g
 * @param {object|null|undefined} obj
 * @param {number} wbit `W_ARMS` / `W_ARMC` / `W_ARM`
 */
function skipDisintegrateArmSlotGodZapsLikeC(g, obj, wbit) {
    const u = g?.u;
    if (!u || !obj) return true;
    const wb = wbit | 0;
    if (((u.uprops?.[REFLECTING]?.extrinsic | 0) & wb) !== 0) return true;
    if (((u.uprops?.[DISINT_RES]?.extrinsic | 0) & wb) !== 0) return true;
    if ((obj.oc_oprop | 0) === REFLECTING) return true;
    if ((obj.oc_oprop | 0) === DISINT_RES) return true;
    return defendsAdtypOnObjHeroSubsetLikeC(g, AD_DISN, obj);
}

/**
 * C: muse.c **`ureflects`** first matching slot (**`EReflecting & W_*`**) — JS uses **`Reflecting`** only; message matches **`pray.c`** **`ureflects("%s reflects from your %s.", "It")`** shield branch wording when reflection is active.
 */
async function ureflectsGodZapsHeroLikeC() {
    await pline('It reflects from your shield.');
}

/**
 * C: pray.c **`fry_by_god`** — **`You`/`done(DIED)`**; contest **`losehp`** until **`uhp`** **0** (**`end.c`** **`really_done`** not ported).
 * @param {import('./gstate.js').game} g
 * @param {number} respGod
 * @param {boolean} viaDisint
 */
async function fryByGodHeroLikeC(g, respGod, viaDisint) {
    await pline(viaDisint ? 'You disintegrate into a pile of dust!' : 'You fry to a crisp!');
    const kn = `the wrath of ${alignGnameLikeC(g, respGod)}`;
    const u = g?.u;
    if (!u) return;
    const n = Math.max(1, (u.uhp | 0) + 1);
    losehp(n, kn, KILLED_BY);
}

/**
 * C: mon.c **`xkilled(mtmp, xkill_flags)`** — **`pray.c`** **`god_zaps_you`** when **`u.ustuck`** dies from lightning or disintegration while **`u.uswallow`**.
 * Sets **`mhp`**, clears **`u.uswallow`** and **`u.ustuck`** when **`mtmp === ustuck`**, removes **`mtmp`** from **`g.level.monsters`**, **`newsym`**.
 * Omits **`mondead`** / **`m_detach`**, **`experience`** / **`more_experienced`** / **`newexplevel`**, **`spoteffects`** expulsion, corpse (**`wasinside`**), **`rn2(6)`** treasure, luck / **`You("murderer!")`**, conduct livelog.
 * @param {import('./gstate.js').game} g
 * @param {object|null|undefined} mtmp
 * @param {number} xkillFlags C **`XKILL_*`** (documented; corpse path not implemented for swallowed kills)
 */
function xkilledUstuckSwallowGodZapsSubsetLikeC(g, mtmp, _xkillFlags) {
    if (!mtmp) return;
    const u = g?.u;
    const mx = mtmp.mx | 0;
    const my = mtmp.my | 0;
    mtmp.mhp = 0;
    if (u && u.ustuck === mtmp) {
        u.uswallow = 0;
        u.ustuck = null;
    }
    const arr = g?.level?.monsters;
    if (arr) {
        const i = arr.indexOf(mtmp);
        if (i >= 0) arr.splice(i, 1);
    }
    if (isok(mx, my)) newsym(mx, my);
}

/**
 * C: pray.c **`god_zaps_you(aligntyp resp_god)`** — swallow / reflect / shock / fry / disintegration / astral triple **`summon_minion`**.
 * Swallow kills: **`xkilledUstuckSwallowGodZapsSubsetLikeC`** after fry or disint plines (**`XKILL_NOMSG|XKILL_NOCONDUCT`** lightning; **`XKILL_NOCORPSE`** on disint). Omits full **`mondead`** and **`experience`** and **`done(DIED)`** beyond **`losehp`** in **`fryByGodHeroLikeC`**. Swallow resist checks — C **`Resists_Elem`** innate **`mon_resistancebits`** only (**`mondata.js`**; no monst **`mextrinsics`** or inventory **`defends`** yet). Non-swallow **`disintegrate_arm`** — **`disintegrate_arm_hero.js`** (**`obj_resists(...,0,90)`**); slot skips match C **`!(EReflecting & W_*)`** / **`!(EDisint_resistance & W_*)`** via **`uprops`** + **`oc_oprop`** + **`defends(AD_DISN)`** (**`uarmu`** unchanged: C has no **`W_ARMU`** gate).
 * @param {import('./gstate.js').game} g
 * @param {number} respGod
 */
export async function godZapsYouHeroLikeC(g, respGod) {
    const u = g?.u;
    if (!u) return;
    const rg = respGod | 0;
    const ux = u.ux | 0;
    const uy = u.uy | 0;

    if (u.uswallow | 0) {
        const stuck = u.ustuck;
        await pline('Suddenly a bolt of lightning comes down at you from the heavens!');
        await pline(`It strikes ${monNamUstuckLikeC(stuck)}!`);
        if (!resistsElecMonLikeC(stuck)) {
            await pline(`${monNamMonnamUstuckLikeC(stuck)} fries to a crisp!`);
            xkilledUstuckSwallowGodZapsSubsetLikeC(g, stuck, XKILL_NOMSG | XKILL_NOCONDUCT);
        } else {
            await pline(`${monNamMonnamUstuckLikeC(stuck)} seems unaffected.`);
        }
    } else {
        await pline('Suddenly, a bolt of lightning strikes you!');
        if (heroReflectingGodZapsLikeC(u)) {
            await shieldeffLikeC(g, ux, uy);
            if (heroBlindGodZapsLikeC(u)) await pline("For some reason you're unaffected.");
            else await ureflectsGodZapsHeroLikeC();
            monstseesuLikeC(M_SEEN_REFL);
        } else if (heroShockResGodZapsLikeC(u)) {
            await shieldeffLikeC(g, ux, uy);
            await pline('It seems not to affect you.');
            monstseesuLikeC(M_SEEN_ELEC);
            monstunseesuLikeC(M_SEEN_REFL);
        } else {
            await fryByGodHeroLikeC(g, rg, false);
            monstunseesuLikeC(M_SEEN_REFL | M_SEEN_ELEC);
        }
    }

    if ((u.uhp | 0) <= 0) return;

    await pline(`${alignGnameLikeC(g, rg)} is not deterred...`);

    if (u.uswallow | 0) {
        const stuck = u.ustuck;
        await pline(`A wide-angle disintegration beam aimed at you hits ${monNamUstuckLikeC(stuck)}!`);
        if (!resistsDisintMonLikeC(stuck)) {
            await pline(`${monNamMonnamUstuckLikeC(stuck)} disintegrates into a pile of dust!`);
            xkilledUstuckSwallowGodZapsSubsetLikeC(
                g,
                stuck,
                XKILL_NOMSG | XKILL_NOCORPSE | XKILL_NOCONDUCT,
            );
        } else {
            await pline(`${monNamMonnamUstuckLikeC(stuck)} seems unaffected.`);
        }
    } else {
        await pline('A wide-angle disintegration beam hits you!');
        if (u.uarms && !skipDisintegrateArmSlotGodZapsLikeC(g, u.uarms, W_ARMS)) {
            await disintegrateArmHeroAtObjGodZapsLikeC(g, u.uarms, 'arms');
        }
        if (u.uarmc && !skipDisintegrateArmSlotGodZapsLikeC(g, u.uarmc, W_ARMC)) {
            await disintegrateArmHeroAtObjGodZapsLikeC(g, u.uarmc, 'armc');
        }
        if (u.uarm && !u.uarmc && !skipDisintegrateArmSlotGodZapsLikeC(g, u.uarm, W_ARM)) {
            await disintegrateArmHeroAtObjGodZapsLikeC(g, u.uarm, 'arm');
        }
        if (u.uarmu && !u.uarm && !u.uarmc) await disintegrateArmHeroAtObjGodZapsLikeC(g, u.uarmu, 'armu');

        if (!heroDisintResGodZapsLikeC(u)) {
            await fryByGodHeroLikeC(g, rg, true);
            monstunseesuLikeC(M_SEEN_DISINT);
        } else {
            await pline('You bask in its black glow for a minute...');
            const verb = GODVOICES[rn2(4)];
            const name = alignGnameLikeC(g, rg);
            await pline(`The voice of ${name} ${verb}: "I believe it not!"`);
            monstseesuLikeC(M_SEEN_DISINT);
        }
        if ((u.uhp | 0) <= 0) return;

        const uz = u.uz;
        if (Is_astralevel(uz) || Is_sanctum(uz)) {
            await verbalizeHeroLikeC('Thou cannot escape my wrath, mortal!');
            summonMinionHeroLikeC(g, rg, false);
            summonMinionHeroLikeC(g, rg, false);
            summonMinionHeroLikeC(g, rg, false);
            await verbalizeHeroLikeC(`Destroy ${uhimHeroLikeC(g)}, my servants!`);
        }
    }
}
