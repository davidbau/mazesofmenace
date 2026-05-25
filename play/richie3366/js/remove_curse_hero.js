// remove_curse_hero.js — read.c seffect_remove_curse invent + steed saddle (partial).
// C ref: read.c seffect_remove_curse ~1507–1596; shop **`costly_alteration`**/**`bill_dummy`** for unpaid **`POT_WATER`** before **`uncurse`** (**`shop.js`** **`costlyAlterationUnpaidHeroInventLikeC`**).

import {
    W_ART,
    W_ARTI,
    W_BALL,
    W_SADDLE,
    COST_UNCURS,
    OTYP_LOADSTONE,
} from './const.js';
import { rn2 } from './rng.js';
import { NH5_COIN_CLASS, NH5_GEM_CLASS, NH5_WEAPON_CLASS } from './nh5_objclass.js';
import { learnscrolltypHeroLikeC } from './discover_scroll.js';
import { doname } from './objnam.js';
import { pline } from './display.js';
import { game } from './gstate.js';
import { uslingingHeroLikeC } from './weapon_kind.js';
import { alterCostShopBillObjLikeC, costlyAlterationUnpaidHeroInventLikeC } from './shop.js';

/** C: objects_nums **`POT_WATER`**. */
const OTYP_POT_WATER = 321;
/** C: objects.h — SCR_REMOVE_CURSE. */
const OTYP_SCR_REMOVE_CURSE = 327;
/** C: objects.h LEASH. */
const OTYP_LEASH = 237;
/**
 * C: do_name.c static hcolors[] — same order/count for hcolor() when Hallucination (C uses rn2_on_display_rng; JS uses main rn2).
 */
const HCOLOR_HALLU_CHOICES = [
    'ultraviolet',
    'infrared',
    'bluish-orange',
    'reddish-green',
    'dark white',
    'light black',
    'sky blue-pink',
    'pinkish-cyan',
    'indigo-chartreuse',
    'salty',
    'sweet',
    'sour',
    'bitter',
    'umami',
    'striped',
    'spiral',
    'swirly',
    'plaid',
    'checkered',
    'argyle',
    'paisley',
    'blotchy',
    'guernsey-spotted',
    'polka-dotted',
    'square',
    'round',
    'triangular',
    'cabernet',
    'sangria',
    'fuchsia',
    'wisteria',
    'lemon-lime',
    'strawberry-banana',
    'peppermint',
    'romantic',
    'incandescent',
    'octarine',
    'excitingly dull',
    'mauve',
    'electric',
    'neon',
    'fluorescent',
    'phosphorescent',
    'translucent',
    'opaque',
    'psychedelic',
    'iridescent',
    'rainbow-colored',
    'polychromatic',
    'colorless',
    'colorless green',
    'dancing',
    'singing',
    'loving',
    'loudy',
    'noisy',
    'clattery',
    'silent',
    'apocyan',
    'infra-pink',
    'opalescent',
    'violant',
    'tuneless',
    'viridian',
    'aureolin',
    'cinnabar',
    'purpurin',
    'gamboge',
    'madder',
    'bistre',
    'ecru',
    'fulvous',
    'tekhelet',
    'selective yellow',
];
/**
 * C: objects.h — WEAPON/PROJECTILE with merge bit (mg) through CRYSKNIFE (ARROW…CRYSKNIFE NH5 19–44).
 * Used for uquiver wornmask when !sblessed (read.c objects[otyp].oc_merge).
 */
const OC_MERGE_QUIVER_WEAPON_OTYP = (() => {
    const s = new Set();
    for (let t = 19; t <= 44; t++) s.add(t);
    return s;
})();

/** @param {import('./gstate.js').game} g */
function heroHallucinationRemoveCurseLikeC(g) {
    const u = g?.u;
    if (!u) return false;
    return !!(u.Hallucination | 0) || (u.timed?.hallucination ?? 0) > 0;
}

/** @param {import('./gstate.js').game} g */
function heroBlindRemoveCurseLikeC(g) {
    const u = g?.u;
    if (!u) return false;
    return (
        !!(u.Blind | 0) ||
        !!(u.ublind | 0) ||
        (u.timed?.blind ?? 0) > 0 ||
        (u.timed?.blinded ?? 0) > 0
    );
}

/**
 * C: do_name.c hcolor(colorpref) — display RNG not ported; uses rn2 on HCOLOR_HALLU_CHOICES.
 * @param {import('./gstate.js').game} g
 * @param {string} [colorpref]
 */
function hcolorRemoveCurseHeroLikeC(g, colorpref) {
    if (heroHallucinationRemoveCurseLikeC(g) || !colorpref) {
        return HCOLOR_HALLU_CHOICES[rn2(HCOLOR_HALLU_CHOICES.length)];
    }
    return colorpref;
}

/**
 * C: worn.c which_armor(mon, W_SADDLE) for !youmonst — minvent scan owornmask.
 * @param {{ minvent?: object }} steed
 */
function steedSaddleObjWhichArmorLikeC(steed) {
    if (!steed) return null;
    for (let o = steed.minvent; o; o = o.nobj) {
        if ((o.owornmask | 0) & W_SADDLE) return o;
    }
    return null;
}

/**
 * C: objnam.c Yobjnam2(obj, "glow") subset for steed-worn saddle (approximate possessive + doname).
 * @param {import('./gstate.js').game} g
 * @param {object} saddle
 * @param {object} steed
 */
function yobjnam2GlowSteedSaddleLikeC(g, saddle, steed) {
    const d = doname(saddle, g ?? game);
    const inner = d.startsWith('an ') ? d.slice(3) : d.startsWith('a ') ? d.slice(2) : d;
    const who = (steed?.monnam && String(steed.monnam).trim()) || 'steed';
    const s = `${who}'s ${inner} glows`;
    return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * C: mkobj.c blessorcurse(otmp, chance) with chance == 2 (remove curse confused branch).
 * @param {{ blessed?: number; cursed?: number; oclass?: number }} obj
 */
function blessorcurseObjChance2LikeC(obj) {
    if (!obj) return;
    if ((obj.oclass | 0) === NH5_COIN_CLASS) return;
    if ((obj.blessed | 0) || (obj.cursed | 0)) return;
    /* C: if (!rn2(chance)) */
    if (rn2(2)) return;
    /* C: if (!rn2(2)) curse(otmp); else bless(otmp); */
    if (!rn2(2)) {
        obj.blessed = 0;
        obj.cursed = 1;
    } else {
        obj.cursed = 0;
        obj.blessed = 1;
    }
}

/**
 * C: mkobj.c uncurse(otmp) — clear cursed (lamplit / luck / BoH weight tail TODO).
 * @param {{ cursed?: number }} obj
 */
function uncurseObjHeroLikeC(obj) {
    if (!obj) return;
    obj.cursed = 0;
}

/**
 * C: read.c seffect_remove_curse — gi.invent loop + u.usteed saddle (worn.c which_armor non-you).
 * @param {import('./gstate.js').game} g
 * @param {{ otyp?: number; blessed?: number; cursed?: number; quan?: number }} scroll
 * @param {boolean} confused
 */
export async function removeCurseHeroInventLoopLikeC(g, scroll, confused) {
    const u = g?.u;
    if (!u) return;
    const sblessed = scroll.blessed | 0;
    const scrollOtyp = scroll.otyp | 0;
    const uswap = u.uswapwep ?? null;
    const uquiv = u.uquiver ?? null;
    const twoweap = u.twoweap | 0;

    let obj = g.invent;
    while (obj) {
        const nxto = obj.nobj ?? null;
        if ((obj.oclass | 0) !== NH5_COIN_CLASS && !(obj === scroll && (scroll.quan | 0) <= 1)) {
            let wornmask = (obj.owornmask | 0) & ~(W_BALL | W_ART | W_ARTI);
            if (wornmask && !sblessed) {
                if (obj === uswap && !twoweap) wornmask = 0;
                else if (obj === uquiv) {
                    const ocl = obj.oclass | 0;
                    const ot = obj.otyp | 0;
                    if (ocl === NH5_WEAPON_CLASS) {
                        if (!OC_MERGE_QUIVER_WEAPON_OTYP.has(ot)) wornmask = 0;
                    } else if (ocl === NH5_GEM_CLASS) {
                        if (!uslingingHeroLikeC(g)) wornmask = 0;
                    } else {
                        wornmask = 0;
                    }
                }
            }

            if (
                sblessed ||
                wornmask ||
                (obj.otyp | 0) === OTYP_LOADSTONE ||
                ((obj.otyp | 0) === OTYP_LEASH && (obj.leashmon | 0))
            ) {
                const shopH2o = !!(obj.unpaid | 0) && (obj.otyp | 0) === OTYP_POT_WATER;
                if (confused) {
                    blessorcurseObjChance2LikeC(obj);
                    obj.bknown = 0;
                    /* C: read.c — confused + unpaid water cursed/blessed → shk.c alter_cost(obj, 0) */
                    if (shopH2o && ((obj.cursed | 0) || (obj.blessed | 0))) {
                        alterCostShopBillObjLikeC(g, obj, 0);
                    }
                } else if (obj.cursed | 0) {
                    if (shopH2o) {
                        await costlyAlterationUnpaidHeroInventLikeC(g, obj, COST_UNCURS);
                    }
                    uncurseObjHeroLikeC(obj);
                    if ((obj.bknown | 0) && scrollOtyp === OTYP_SCR_REMOVE_CURSE) {
                        learnscrolltypHeroLikeC(g, OTYP_SCR_REMOVE_CURSE);
                    }
                }
            }
        }
        obj = nxto;
    }

    /* C: read.c ~1579 — if riding, treat steed's saddle as if part of hero's invent */
    const steed = u.usteed ?? null;
    const saddle = steedSaddleObjWhichArmorLikeC(steed);
    if (saddle) {
        if (confused) {
            blessorcurseObjChance2LikeC(saddle);
            saddle.bknown = 0;
        } else if (saddle.cursed | 0) {
            uncurseObjHeroLikeC(saddle);
            if (!heroBlindRemoveCurseLikeC(g)) {
                const y1 = yobjnam2GlowSteedSaddleLikeC(g, saddle, steed);
                const y2 = hcolorRemoveCurseHeroLikeC(g, 'amber');
                await pline(`${y1} ${y2}.`);
                saddle.bknown = heroHallucinationRemoveCurseLikeC(g) ? 0 : 1;
            } else {
                saddle.bknown = 0;
            }
        }
    }
}
