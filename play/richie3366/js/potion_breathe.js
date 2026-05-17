// potion_breathe.js — potion.c potionbreathe() for floor breakage / obj_delivery vapors.
// C ref: potion.c potionbreathe(); do.c trycall() (docall deferred).

import { pline } from './display.js';
import { rnd, rn2 } from './rng.js';
import { exercise } from './attrib.js';
import {
    A_CON,
    A_DEX,
    A_MAX,
    ismnum,
    PM_GREMLIN,
} from './const.js';
import { raceptr, breathless, halfGasDamageHeroLikeC } from './mondata.js';
import { nomul } from './timeout.js';
import { splitGremlinHeroPoly } from './split_mon.js';
import {
    upolydHeroLikeC,
    youWerePotionbreatheSubsetLikeC,
    youUnwerePotionbreatheSubsetLikeC,
} from './were_hero.js';

/** C: objects.h / objclass.h — contiguous potion `objects_nums` block (NH 5.0). */
const POT_GAIN_ABILITY = 296;
const POT_RESTORE_ABILITY = 297;
const POT_CONFUSION = 298;
const POT_BLINDNESS = 299;
const POT_PARALYSIS = 300;
const POT_SPEED = 301;
const POT_HALLUCINATION = 303;
const POT_INVISIBILITY = 304;
const POT_HEALING = 306;
const POT_EXTRA_HEALING = 307;
const POT_SLEEPING = 313;
const POT_FULL_HEALING = 314;
const POT_POLYMORPH = 315;
const POT_BOOZE = 316;
const POT_SICKNESS = 317;
const POT_ACID = 319;
const POT_WATER = 321;

/** C: objects.h towel `otyp` — **`Half_gas_damage`** branch in **`potionbreathe`**. */
const OTYP_TOWEL = 235;

/**
 * C: invent.c `makeknown` / discoveries for potions (**subset**: `g.potionDiscovery` Set).
 * @param {import('./gstate.js').game} g
 * @param {number} otyp
 */
export function discoverPotionOtyp(g, otyp) {
    if (!g) return;
    if (!(g.potionDiscovery instanceof Set)) g.potionDiscovery = new Set();
    g.potionDiscovery.add(otyp | 0);
}

/**
 * C: do.c `trycall` — `docall` when type unnamed (**deferred**: no `objects[]` tables yet).
 */
function trycallPotionStub(_g, _obj) {
    void _g;
    void _obj;
}

function heroBlindLikeC(g) {
    const u = g.u;
    return !!(u?.ublind || (u?.timed?.blind ?? 0) > 0);
}

function heroUnawareLikeC(g) {
    return !!((g.u?.Unaware | 0));
}

function confusedLikeC(g) {
    const u = g.u;
    return !!((u?.Confusion | 0) || (u?.timed?.confusion ?? 0) > 0);
}

function fastLikeC(g) {
    return !!((g.u?.Fast | 0) || (g.u?.timed?.fast ?? 0) > 0);
}

function invisLikeC(g) {
    const u = g.u;
    return !!((u?.HInvis | 0) || (u?.EInvis | 0) || (u?.BInvis | 0));
}

function seeInvisibleLikeC(g) {
    return !!((g.u?.See_invisible | 0));
}

function freeActionLikeC(g) {
    return !!((g.u?.Free_action | 0));
}

function sleepResistanceLikeC(g) {
    return !!((g.u?.Sleep_resistance | 0));
}

/** One step of C `potionbreathe` healing fallthrough (`mh`/`uhp` ++ when below max). */
function bumpPotionHealOnceLikeC(g, u) {
    const mhmax = ((u.mhmax ?? u.uhpmax) | 0);
    let botl = false;
    if ((u.Upolyd | 0) && (u.mh | 0) < mhmax) {
        u.mh = (u.mh | 0) + 1;
        botl = true;
    }
    if ((u.uhp | 0) < (u.uhpmax | 0)) {
        u.uhp = (u.uhp | 0) + 1;
        botl = true;
    }
    if (botl) {
        g.disp = g.disp || {};
        g.disp.botl = true;
    }
}

/**
 * C: potion.c `potionbreathe(obj)` — vapors after nearby potion shatters (**no `obfree`**; caller destroys).
 * @param {import('./gstate.js').game} g
 * @param {{ otyp?: number, blessed?: number, cursed?: number, in_use?: number, dknown?: number }} obj
 */
export async function potionbreatheObjBreakLikeC(g, obj) {
    if (!obj) return;
    let kn = 0;
    const alreadyInUse = obj.in_use | 0;
    obj.in_use = 1;

    const u = g.u;
    if (!u) {
        if (!alreadyInUse) obj.in_use = 0;
        return;
    }

    u.timed = u.timed || {};
    const ptr = raceptr(g.youmonst);
    const halfGas = halfGasDamageHeroLikeC(g);
    const switchTyp = halfGas ? OTYP_TOWEL : obj.otyp | 0;

    switch (switchTyp) {
        case OTYP_TOWEL:
            await pline('Some vapor passes harmlessly around you.');
            break;
        case POT_RESTORE_ABILITY:
        case POT_GAIN_ABILITY: {
            if (obj.cursed) {
                if (!breathless(ptr)) {
                    await pline('Ulch!  That potion smells terrible!');
                } else {
                    await pline('Your eyes sting!');
                }
                break;
            }
            let i = rn2(A_MAX);
            let isdone = 0;
            const ac = u.acurr?.a;
            const am = u.amax?.a;
            if (ac && am && ac.length >= A_MAX && am.length >= A_MAX) {
                for (let ii = 0; !isdone && ii < A_MAX; ii++) {
                    if ((ac[i] | 0) < (am[i] | 0)) {
                        ac[i] = (ac[i] | 0) + 1;
                        isdone = !(obj.blessed | 0);
                        g.disp = g.disp || {};
                        g.disp.botl = true;
                    }
                    if (++i >= A_MAX) i = 0;
                }
            }
            break;
        }
        case POT_FULL_HEALING:
        case POT_EXTRA_HEALING:
        case POT_HEALING: {
            let cureblind = false;
            const typ = switchTyp;
            if (typ === POT_FULL_HEALING) {
                bumpPotionHealOnceLikeC(g, u);
                cureblind = true;
            }
            if (typ === POT_FULL_HEALING || typ === POT_EXTRA_HEALING) {
                bumpPotionHealOnceLikeC(g, u);
                if (!(obj.cursed | 0)) cureblind = true;
            }
            bumpPotionHealOnceLikeC(g, u);
            if (obj.blessed) cureblind = true;
            if (cureblind) {
                u.timed.blind = 0;
                u.ublind = 0;
                u.timed.deaf = 0;
            }
            exercise(A_CON, true);
            break;
        }
        case POT_SICKNESS:
            if (g.urole?.abbr !== 'Hea') {
                if (u.Upolyd | 0) {
                    if ((u.mh | 0) <= 5) u.mh = 1;
                    else u.mh = (u.mh | 0) - 5;
                } else {
                    if ((u.uhp | 0) <= 5) u.uhp = 1;
                    else u.uhp = (u.uhp | 0) - 5;
                }
                g.disp = g.disp || {};
                g.disp.botl = true;
                exercise(A_CON, false);
            }
            break;
        case POT_HALLUCINATION:
            await pline('You have a momentary vision.');
            break;
        case POT_CONFUSION:
        case POT_BOOZE:
            if (!confusedLikeC(g)) await pline('You feel somewhat dizzy.');
            u.timed.confusion = (u.timed.confusion ?? 0) + rnd(5);
            u.Confusion = 1;
            break;
        case POT_INVISIBILITY:
            if (!heroBlindLikeC(g) && !invisLikeC(g)) {
                kn++;
                await pline(
                    `For an instant you ${seeInvisibleLikeC(g) ? 'could see right through yourself'
                        : 'couldn\'t see yourself'}!`,
                );
            }
            break;
        case POT_PARALYSIS:
            kn++;
            if (!freeActionLikeC(g)) {
                await pline('Something seems to be holding you.');
                nomul(-rnd(5));
                g.multi_reason = 'frozen by a potion';
                exercise(A_DEX, false);
            } else {
                await pline('You stiffen momentarily.');
            }
            break;
        case POT_SLEEPING:
            kn++;
            if (!freeActionLikeC(g) && !sleepResistanceLikeC(g)) {
                await pline('You feel rather tired.');
                nomul(-rnd(5));
                g.multi_reason = 'sleeping off a magical draught';
                exercise(A_DEX, false);
            } else {
                await pline('You yawn.');
            }
            break;
        case POT_SPEED:
            if (!fastLikeC(g)) await pline('Your knees seem more flexible now.');
            u.timed.fast = (u.timed.fast ?? 0) + rnd(5);
            u.Fast = 1;
            exercise(A_DEX, true);
            break;
        case POT_BLINDNESS:
            if (!heroBlindLikeC(g) && !heroUnawareLikeC(g)) {
                kn++;
                await pline('It suddenly gets dark.');
            }
            u.timed.blind = (u.timed.blind ?? 0) + rnd(5);
            break;
        case POT_WATER:
            if ((u.umonnum | 0) === PM_GREMLIN) {
                await splitGremlinHeroPoly(g);
            } else if (ismnum(u.ulycn | 0)) {
                /* C: potionbreathe — blessed were-beast → you_unwere(FALSE); cursed human → you_were(). */
                const lycn = u.ulycn | 0;
                if ((obj.blessed | 0) && upolydHeroLikeC(u) && (u.umonnum | 0) === lycn) {
                    await youUnwerePotionbreatheSubsetLikeC(g, false);
                } else if ((obj.cursed | 0) && !upolydHeroLikeC(u)) {
                    await youWerePotionbreatheSubsetLikeC(g);
                }
            }
            break;
        case POT_ACID:
        case POT_POLYMORPH:
            exercise(A_CON, false);
            break;
        default:
            break;
    }

    if (!alreadyInUse) obj.in_use = 0;

    if (obj.dknown | 0) {
        if (kn) discoverPotionOtyp(g, obj.otyp | 0);
        else trycallPotionStub(g, obj);
    }
}
