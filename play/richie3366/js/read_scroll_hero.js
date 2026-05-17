// read_scroll_hero.js — Hero **`r`** read scroll subset until full **`read.c`** **`doread`** / **`seffects`**.
// C ref: read.c **`doread`** (**`gk.known=FALSE`**, blind+**`dknown`**, **`scroll->in_use`**, non-blank **`nodisappear`** plines (**`SCR_FIRE`**, cursed **`SCR_REMOVE_CURSE`**),
//        **`!seffects(scroll)`** tail: **`learnscroll`** vs **`trycall`** when **`!oc_name_known`** (**`gk.known`** gate), **`useup`**
//        unless **`SCR_BLANK_PAPER`**),
//        **`seffects`** (**`exercise`** when **`oc_magic`**, **`switch(otyp)`** — blank, punishment (**`seffect_punishment`**: guilty vs **`punish_hero.js`** **`punishHeroFromObjLikeC`**; no **`placebc`**), stinking cloud (**`stinking_cloud_hero.js`** **`doStinkingCloudHeroReadScrollLikeC`** + **`createGasCloudRndBurnHeroLikeC`**; **`getpos`**/**`tmp_at`** TODO),
//        remove curse (**`You_feel`** + cursed **`pline_The`**; no **`gk`**; **`Punished`** && !confused → **`unpunish`**;
//        **`TT_BURIEDBALL`**: **`floorobj.js`** **`buriedBallToFreedomLikeC`** + **`switch_terrain.js`** **`resetUtrapMsgAfterClearHeroLikeC`** (**C **`trap.c`** **`reset_utrap(TRUE)`** **`float_up`/`You can fly.`**) after **`floatVsFlightLikeC`**; clasp **`mbodypartHeroLegLikeC`**; invent + steed saddle **`remove_curse_hero.js`** (**`uslinging`**, shop water confused **`alter_cost`**; unpaid cursed water **`costly_alteration`/`bill_dummy`** before **`uncurse`**),
//        default: C **`seffects`** **`impossible`** on unknown **`otyp`** — JS leaves **`gk.known`** false so **`doread`** tail runs **`trycall`** when **`!scrollDiscovery`** (**`SCR_FIRE`** etc. still need real **`seffect_*`** / inner **`useup`** like C).
//        **`learnscroll`** / **`learnscrolltyp`**.

import { game } from './gstate.js';
import { pline, flush_screen } from './display.js';
import { A_WIS, TT_BURIEDBALL } from './const.js';
import { exercise } from './attrib.js';
import { SCROLL_CLASS_MKOBJ_OC_PROB_ROWS } from './mkobj_scroll_class_rng_like_c.js';
import { NH5_SCROLL_CLASS } from './nh5_objclass.js';
import { removeObjFromHeroInvent } from './water_damage.js';
import { observeObjectHeroMinimalLikeC } from './objnam.js';
import { learnscrollHeroLikeC, trycallHeroLikeC } from './discover_scroll.js';
import { heroPunishedLikeC, punishHeroFromObjLikeC, unpunishHeroLikeC } from './punish_hero.js';
import { syncHeroInvWeightNetLikeC } from './encumbr.js';
import { removeCurseHeroInventLoopLikeC } from './remove_curse_hero.js';
import { buriedBallToFreedomLikeC } from './floorobj.js';
import {
    floatVsFlightLikeC,
    flyingEffectiveLikeC,
    levitationEffectiveLikeC,
    resetUtrapMsgAfterClearHeroLikeC,
} from './switch_terrain.js';
import { mbodypartHeroLegLikeC } from './body_part_hero.js';
import { doStinkingCloudHeroReadScrollLikeC } from './stinking_cloud_hero.js';

/** C: **`objects_nums`** **`SCR_BLANK_PAPER`** — **`SCROLL(..., mgc, ...)`** with **`mgc`** **0** (**`objects.h`**). */
const OTYP_SCR_BLANK_PAPER = 364;
/** C: **`objects_nums`** / **`SCROLL_CLASS_MKOBJ_OC_PROB_ROWS`** — **`SCR_REMOVE_CURSE`**. */
const OTYP_SCR_REMOVE_CURSE = 327;
/** C: **`SCR_FIRE`**. */
const OTYP_SCR_FIRE = 339;
/** C: **`SCR_PUNISHMENT`** — **`read.c`** **`seffect_punishment`**. */
const OTYP_SCR_PUNISHMENT = 341;
/** C: **`SCR_STINKING_CLOUD`** — **`read.c`** **`seffect_stinking_cloud`**. */
const OTYP_SCR_STINKING_CLOUD = 343;

/**
 * C: **`objects[otyp].oc_magic`** — **`SCROLL`** macro **`mgc`**; false for blank paper (and otyps outside scroll table).
 * @param {number} otyp
 */
export function scrollOtypHasOcMagicLikeC(otyp) {
    const t = otyp | 0;
    if (t === OTYP_SCR_BLANK_PAPER) return false;
    for (let i = 0; i < SCROLL_CLASS_MKOBJ_OC_PROB_ROWS.length; i++) {
        if ((SCROLL_CLASS_MKOBJ_OC_PROB_ROWS[i][0] | 0) === t) return true;
    }
    return false;
}

/**
 * C: read.c **`seffects`** — return **1** if scroll was **`useup`**'d inside (**`sobj`** null), else **0**.
 * Each **`seffect_*`** sets **`gk.known`** when appropriate; **`doread`** tail (**`learnscroll`** vs **`trycall`**) keys off **`gk.known`** when **`!oc_name_known`** (JS: **`scrollDiscovery`**).
 * @param {import('./gstate.js').game} g
 * @param {{ otyp?: number, oclass?: number, dknown?: number }} scroll
 * @param {boolean} blind
 * @returns {Promise<number>}
 */
export async function seffectsHeroReadScrollLikeC(g, scroll, blind) {
    const otyp = scroll.otyp | 0;
    if (scrollOtypHasOcMagicLikeC(otyp)) exercise(A_WIS, true);

    switch (otyp) {
        case OTYP_SCR_BLANK_PAPER: {
            /* C: **`seffect_blank_paper`** — plines; **`gk.known = TRUE`** */
            if (blind) await pline("You don't remember there being any magic words on this scroll.");
            else await pline('This scroll seems to be blank.');
            g._readScrollGkKnown = true;
            return 0;
        }
        case OTYP_SCR_PUNISHMENT: {
            /* C: **`seffect_punishment`** — **`gk.known = TRUE`**; confused/blessed → **`You_feel("guilty.")`**; else **`punish(sobj)`** */
            g._readScrollGkKnown = true;
            if (heroConfusedForReadLikeC(g) || (scroll.blessed | 0)) {
                await pline('You feel guilty.');
            } else {
                await punishHeroFromObjLikeC(g, scroll);
                syncHeroInvWeightNetLikeC(g);
            }
            return 0;
        }
        case OTYP_SCR_STINKING_CLOUD: {
            /* C: **`seffect_stinking_cloud`** — discovery; **`gk.known`**; **`do_stinking_cloud`** */
            const alreadyKnown = g.scrollDiscovery instanceof Set && g.scrollDiscovery.has(otyp);
            if (!alreadyKnown) await pline('You have found a scroll of stinking cloud!');
            g._readScrollGkKnown = true;
            await doStinkingCloudHeroReadScrollLikeC(g, scroll, alreadyKnown);
            return 0;
        }
        case OTYP_SCR_REMOVE_CURSE: {
            /* C: **`seffect_remove_curse`** — opening **`You_feel`**; cursed → **`pline_The("scroll disintegrates.")`**; no **`gk.known`** here */
            const hallu = heroHallucinationForReadLikeC(g);
            const confused = heroConfusedForReadLikeC(g);
            const feel = !hallu
                ? confused
                    ? 'like you need some help.'
                    : 'like someone is helping you.'
                : confused
                  ? 'the power of the Force against you!'
                  : 'in touch with the Universal Oneness.';
            await pline(`You feel ${feel}`);
            if (scroll.cursed | 0) {
                await pline('The scroll disintegrates.');
            } else {
                await removeCurseHeroInventLoopLikeC(g, scroll, confused);
            }
            /* C: after if/else — **`if (Punished && !confused) unpunish()`**; **`if (utrap && TT_BURIEDBALL)`** **`buried_ball_to_freedom`** + pline */
            if (heroPunishedLikeC(g) && !confused) unpunishHeroLikeC(g);
            await heroBuriedBallClaspVanishesAfterRemoveCurseLikeC(g);
            syncHeroInvWeightNetLikeC(g);
            return 0;
        }
        default: {
            /* C: **`switch`** ends in **`impossible`** for unknown **`otyp`** — no **`gk.known`** unless a **`seffect_*`** runs */
            g._readScrollGkKnown = false;
            return 0;
        }
    }
}

/** C: read.c **`seffect_remove_curse`** — **`buried_ball_to_freedom`**, **`reset_utrap(TRUE)`** msg (**`float_up`/`You can fly.`**), **`pline_The`…**`body_part(LEG)`**. */
async function heroBuriedBallClaspVanishesAfterRemoveCurseLikeC(g) {
    const u = g?.u;
    if (!u || !(u.utrap | 0) || (u.utraptype | 0) !== TT_BURIEDBALL) return;
    const wasLev = levitationEffectiveLikeC(g);
    const wasFly = flyingEffectiveLikeC(g);
    const freed = buriedBallToFreedomLikeC(g);
    if (freed) {
        floatVsFlightLikeC(g);
        await resetUtrapMsgAfterClearHeroLikeC(g, true, wasLev, wasFly);
    }
    const leg = mbodypartHeroLegLikeC(g);
    await pline(`The clasp on your ${leg} vanishes.`);
}

/** @param {import('./gstate.js').game} g */
function heroBlindForReadLikeC(g) {
    const u = g?.u;
    if (!u) return false;
    return (
        !!(u.Blind | 0) ||
        !!(u.ublind | 0) ||
        (u.timed?.blind ?? 0) > 0 ||
        (u.timed?.blinded ?? 0) > 0
    );
}

/** @param {import('./gstate.js').game} g */
function heroConfusedForReadLikeC(g) {
    const u = g?.u;
    if (!u) return false;
    return !!(u.Confusion | 0) || (u.timed?.confusion ?? 0) > 0;
}

/** @param {import('./gstate.js').game} g */
function heroHallucinationForReadLikeC(g) {
    const u = g?.u;
    if (!u) return false;
    return !!(u.Hallucination | 0) || (u.timed?.hallucination ?? 0) > 0;
}

/**
 * C: **`getobj`** not ported — first carried **`SCROLL_CLASS`** object (**`invent`** chain order).
 * @param {import('./gstate.js').game} g
 */
export function firstCarriedScrollForReadLikeC(g) {
    for (let o = g.invent; o; o = o.nobj) {
        if ((o.oclass | 0) === NH5_SCROLL_CLASS) return o;
    }
    return null;
}

/**
 * C: read.c **`doread`** — first invent scroll; **`seffects`** **`switch(otyp)`** (blank + stub default).
 * @param {import('./gstate.js').game} [g]
 */
export async function doReadHeroScrollCmdLikeC(g = game) {
    g.context.move = 0;
    const scroll = firstCarriedScrollForReadLikeC(g);
    if (!scroll) {
        await pline('You have nothing to read.');
        g._retainMessageAfterCommand = true;
        await flush_screen(1);
        return;
    }

    const blind = heroBlindForReadLikeC(g);
    if (blind && !(scroll.dknown | 0)) {
        await pline('Being blind, you cannot read the formula on the scroll.');
        g._retainMessageAfterCommand = true;
        await flush_screen(1);
        return;
    }

    const otyp = scroll.otyp | 0;
    const confused = heroConfusedForReadLikeC(g);

    observeObjectHeroMinimalLikeC(g, scroll);

    /* C: read.c **`scroll->in_use = TRUE`** — scroll (not spellbook) now being read */
    scroll.in_use = 1;

    /* C: **`gk.known = FALSE`** at **`doread`** entry — carried on **`g`** for tail */
    g._readScrollGkKnown = false;

    /* C: read.c **`doread`** — **`if (otyp != SCR_BLANK_PAPER)`** disappear + confused plines before **`seffects`** */
    if (otyp !== OTYP_SCR_BLANK_PAPER) {
        const silently = false; /* C: **`can_chant`** — not ported */
        /* C: **`nodisappear`** — **`SCR_FIRE`** or cursed **`SCR_REMOVE_CURSE`** (avoid “disappears” wording) */
        const nodisappear =
            otyp === OTYP_SCR_FIRE || (otyp === OTYP_SCR_REMOVE_CURSE && (scroll.cursed | 0));
        if (blind) {
            if (nodisappear) {
                await pline('You %s the formula on the scroll.', silently ? 'cogitate' : 'pronounce');
            } else {
                await pline(
                    'As you %s the formula on it, the scroll disappears.',
                    silently ? 'cogitate' : 'pronounce',
                );
            }
        } else if (nodisappear) {
            await pline('You read the scroll.');
        } else {
            await pline('As you read the scroll, it disappears.');
        }
        if (confused) {
            const u = g.u;
            if ((u?.Hallucination | 0) || (u?.timed?.hallucination ?? 0) > 0) {
                await pline('Being so trippy, you screw up...');
            } else {
                await pline('Being confused, you %s the magic words...', silently ? 'misunderstand' : 'mispronounce');
            }
        }
    }

    /* C: **`seffects`** returns **1** if **`useup`** already ran inside (**`sobj`** null) */
    const scrollUseupInside = await seffectsHeroReadScrollLikeC(g, scroll, blind);

    /* C: **`if (!seffects(scroll))`** */
    if (!scrollUseupInside) {
        const t = scroll.otyp | 0;
        const alreadyKnown = g.scrollDiscovery instanceof Set && g.scrollDiscovery.has(t);
        if (!alreadyKnown) {
            if (g._readScrollGkKnown) {
                learnscrollHeroLikeC(g, scroll);
            } else {
                trycallHeroLikeC(g, scroll);
            }
        }
        /* C: **`scroll->in_use = FALSE`** before **`useup`** */
        scroll.in_use = 0;
        if (t !== OTYP_SCR_BLANK_PAPER) {
            const q = scroll.quan | 0;
            if (q > 1) {
                scroll.quan = q - 1;
                if (scroll.owt != null) {
                    const per = Math.max(1, Math.trunc((scroll.owt | 0) / q));
                    scroll.owt = per * (scroll.quan | 0);
                }
            } else {
                removeObjFromHeroInvent(g, scroll);
            }
        }
    }

    g.context.move = 1;
    g._retainMessageAfterCommand = true;
    await flush_screen(1);
}
