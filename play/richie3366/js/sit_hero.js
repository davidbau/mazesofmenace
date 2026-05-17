// sit_hero.js — C sit.c dosit + throne_sit_effect + attrcurse + rndcurse subset.
// C refs: sit.c dosit(), throne_sit_effect(), special_throne_effect(), attrcurse(), rndcurse(), take_gold();

import { pline, flush_screen, newsym } from './display.js';
import { nhgetch } from './input.js';
import {
    A_MAX,
    A_CON,
    FIRE_RES,
    TELEPORT,
    POISON_RES,
    TELEPAT,
    INVIS,
    SEE_INVIS,
    FAST,
    STEALTH,
    PROTECTION,
    AGGRAVATE_MONSTER,
    COLD_RES,
    INTRINSIC,
    FROMOUTSIDE,
    IS_THRONE,
    IS_SINK,
    IS_ALTAR,
    IS_GRAVE,
    IS_POOL,
    IS_LAVA,
    LADDER,
    STAIRS,
    DRAWBRIDGE_DOWN,
    ICE,
    ROOM,
    In_V_tower,
    NO_MM_FLAGS,
} from './const.js';
import { rnd, rn1, rn2 } from './rng.js';
import { levlTypAt } from './decor.js';
import { canReachFloor } from './engrave.js';
import { surfaceHereString } from './dighole.js';
import { adjattrib, changeLuck, exercise } from './attrib.js';
import { losehp, maybeHalfPhys } from './mthrowu.js';
import { NH5_COIN_CLASS } from './nh5_objclass.js';
import { makemon } from './makemon.js';
import { stripHProtectionIntrinsicSitCrowHallLikeC } from './divine_protection.js';
import { losexpNullLikeC } from './losexp.js';

/** C: monsters.h — **`PM_VAMPIRE`** / **`PM_VAMPIRE_LEADER`** (NH 5.0 indices). */
const PM_VAMPIRE = 224;
const PM_VAMPIRE_LEADER = 225;

/** C: sit.c **`take_gold`** — remove all **`COIN_CLASS`** from **`g.invent`**; clear hero gold tallies. */
function takeGoldSitLikeC(g) {
    const u = g.u;
    if (!u) return false;
    let lost = false;
    let prev = /** @type {object | null} */ (null);
    let o = g.invent ?? null;
    while (o) {
        const nx = o.nobj ?? null;
        if ((o.oclass | 0) === NH5_COIN_CLASS) {
            lost = true;
            if (prev) prev.nobj = nx;
            else g.invent = nx;
            o.nobj = null;
        } else {
            prev = o;
        }
        o = nx;
    }
    g._goldCount = 0;
    u.umoney = 0;
    if (lost) {
        g.disp = g.disp || {};
        g.disp.botl = true;
    }
    return lost;
}

/**
 * C: sit.c **`rndcurse`** — malignant aura + random curse attempts (**`gi.invent`**).
 * @param {import('./gstate.js').game} g
 */
export async function rndcurseHeroLikeC(g) {
    const u = g.u;
    if (!u) return;
    if ((u.Antimagic | 0) !== 0) {
        /* C: shieldeff — omitted */
    }
    await pline('You feel a malignant aura surround you.');
    let nobj = 0;
    for (let o = g.invent; o; o = o.nobj) {
        if ((o.oclass | 0) === NH5_COIN_CLASS) continue;
        nobj++;
    }
    const denom = ((u.Antimagic | 0) ? 1 : 0) + ((u.Half_spell_damage | 0) ? 1 : 0) + 1;
    let cnt = rnd(Math.trunc(6 / denom)) | 0;
    if (nobj > 0) {
        for (; cnt > 0; cnt--) {
            const onum = rnd(nobj);
            let c = onum;
            /** @type {object | null} */
            let otmp = null;
            for (otmp = g.invent; otmp; otmp = otmp.nobj) {
                if ((otmp.oclass | 0) === NH5_COIN_CLASS) continue;
                if (--c === 0) break;
            }
            if (!otmp || (otmp.cursed | 0)) continue;
            if ((otmp.oartifact | 0) && rn2(10) < 8) {
                await pline(`${otmp.doname ?? 'Something'} resists!`);
                continue;
            }
            if (otmp.blessed | 0) otmp.blessed = 0;
            else otmp.cursed = 1;
        }
    }
    if ((u.usteed | 0) && !rn2(4)) {
        /* C: saddle curse — omitted */
    }
}

/**
 * C: sit.c **`attrcurse`** — **`rnd(11)`** intrinsic strip cascade (**`HProtection`** via **`uprops`**).
 * @returns {Promise<number>} C property id or **0**
 */
export async function attrcurseHeroLikeC(g) {
    const u = g.u;
    if (!u) return 0;
    const has = (prop) => ((u[prop] | 0) & INTRINSIC) !== 0;
    /**
     * @param {string} prop
     * @param {string} msg
     * @param {number} ret
     */
    const clr = async (prop, msg, ret) => {
        if (!has(prop)) return 0;
        u[prop] = (u[prop] | 0) & ~INTRINSIC;
        await pline(msg);
        return ret;
    };

    switch (rnd(11)) {
        case 1:
            if (await clr('HFire_resistance', 'You feel warmer.', FIRE_RES)) return FIRE_RES;
        /* fallthrough */
        case 2:
            if (await clr('HTeleportation', 'You feel less jumpy.', TELEPORT)) return TELEPORT;
        case 3:
            if (await clr('HPoison_resistance', 'You feel a little sick!', POISON_RES)) return POISON_RES;
        case 4:
            if (has('HTelepat')) {
                u.HTelepat = (u.HTelepat | 0) & ~INTRINSIC;
                await pline('Your senses fail!');
                return TELEPAT;
            }
        case 5:
            if (await clr('HCold_resistance', 'You feel cooler.', COLD_RES)) return COLD_RES;
        case 6:
            if (await clr('HInvis', 'You feel paranoid.', INVIS)) return INVIS;
        case 7:
            if (has('HSee_invisible')) {
                u.HSee_invisible = (u.HSee_invisible | 0) & ~INTRINSIC;
                await pline(
                    (u.Hallucination | 0) ? 'You tawt you taw a puttie tat!' : 'You thought you saw something!',
                );
                newsym(u.ux | 0, u.uy | 0);
                return SEE_INVIS;
            }
        case 8:
            if (await clr('HFast', 'You feel slower.', FAST)) return FAST;
        case 9:
            if (await clr('HStealth', 'You feel clumsy.', STEALTH)) return STEALTH;
        case 10:
            if (stripHProtectionIntrinsicSitCrowHallLikeC(g)) {
                await pline('You feel vulnerable.');
                return PROTECTION;
            }
        case 11:
            if (await clr('HAggravate_monster', 'You feel less attractive.', AGGRAVATE_MONSTER))
                return AGGRAVATE_MONSTER;
        default:
            return 0;
    }
}

/** C: mkroom.c **`courtmon`** — leading **`rn2`** draws before **`makemon`** ( **`mkclass`** chain not ported). */
function courtmonConsumeRngLikeC(g) {
    const ld = Math.max(1, g.u?.ulevel | 0);
    rn2(60);
    rn2(3 * ld);
}

/**
 * C: sit.c **`special_throne_effect`** (Vlad's tower).
 * @param {import('./gstate.js').game} g
 * @param {number} effect
 */
async function specialThroneEffectLikeC(g, effect) {
    const u = g.u;
    if (!u || !g.level) return;
    const tx = u.ux | 0;
    const ty = u.uy | 0;
    const loc = g.level.at(tx, ty);
    switch (effect | 0) {
        case 1:
        case 2:
        case 3:
        case 4:
            await pline('The throne disintegrates, having spent its power.');
            if (loc) {
                loc.typ = ROOM;
                loc.flags = 0;
            }
            newsym(tx, ty);
            break;
        case 5:
            await pline('Sitting on the throne was a terrible experience.');
            if (!(u.Drain_resistance | 0)) await losexpNullLikeC(g);
            break;
        case 6:
            await pline('A greasy liquid sprays all over you!');
            for (let o = g.invent; o; o = o.nobj) {
                if ((o.oclass | 0) !== NH5_COIN_CLASS) o.greased = 1;
            }
            rn1(101, 100);
            break;
        case 7:
            await attrcurseHeroLikeC(g);
            await pline('The throne somehow seems to be amused.');
            break;
        case 8:
            if (u.uhave?.amulet | 0) await pline('You feel extremely disoriented for a moment.');
            else await pline('You feel extremely out of place.');
            break;
        case 9:
            await pline('The throne seeems to be calling for help!');
            makemon(null, tx, ty, NO_MM_FLAGS);
            makemon(null, tx, ty, NO_MM_FLAGS);
            makemon(null, tx, ty, NO_MM_FLAGS);
            break;
        case 10:
            await pline('You feel less confused for a moment.');
            break;
        case 11: {
            const mnum = u.umonnum | 0;
            if (mnum === PM_VAMPIRE || mnum === PM_VAMPIRE_LEADER) await pline('You feel unworthy.');
            else {
                await pline('This throne was not meant for those such as you!');
                await pline('You feel a change coming over you.');
            }
            break;
        }
        case 12:
            await pline('The throne is covered in acid!');
            losehp((u.Acid_resistance | 0) ? rnd(16) : rnd(80), 'acidic chair', 0);
            exercise(A_CON, false);
            break;
        case 13:
            await pline('As you sit on the throne, your body and mind start to warp.');
            for (let ability = 0; ability < A_MAX; ability++) {
                adjattrib(ability, rn2(5) - 2, -1);
            }
            break;
        default:
            break;
    }
}

/**
 * C: sit.c **`throne_sit_effect`** normal branch (**`!In_V_tower`**).
 * @param {import('./gstate.js').game} g
 */
async function normalThroneSitEffectLikeC(g, effect) {
    const u = g.u;
    if (!u) return;
    const tx = u.ux | 0;
    const ty = u.uy | 0;
    const female = !!(g.flags?.female | 0);
    const sire = female ? 'Dame' : 'Sire';
    switch (effect | 0) {
        case 1:
            adjattrib(rn2(A_MAX), -rn1(4, 3), false);
            losehp(rnd(10), 'cursed throne', 0);
            break;
        case 2:
            adjattrib(rn2(A_MAX), 1, false);
            break;
        case 3: {
            const shock = (u.Shock_resistance | 0) !== 0;
            await pline(`A${shock ? 'n' : ' massive'} electric shock shoots through your body!`);
            losehp(shock ? rnd(6) : rnd(30), 'electric chair', 0);
            exercise(A_CON, false);
            break;
        }
        case 4:
            await pline('You feel much, much better!');
            if ((u.Upolyd | 0) && u.mh != null && u.mhmax != null) {
                if ((u.mh | 0) >= ((u.mhmax | 0) - 5)) u.mhmax = (u.mhmax | 0) + 4;
                u.mh = u.mhmax | 0;
            }
            if ((u.uhp | 0) >= ((u.uhpmax | 0) - 5)) {
                u.uhpmax = (u.uhpmax | 0) + 4;
                if ((u.uhpmax | 0) > (u.uhppeak | 0)) u.uhppeak = u.uhpmax | 0;
            }
            u.uhp = u.uhpmax | 0;
            u.ucreamed = 0;
            u.ublind = 0;
            u.usick = 0;
            g.disp = g.disp || {};
            g.disp.botl = true;
            break;
        case 5: {
            const lost = takeGoldSitLikeC(g);
            if (!lost) await pline('You feel a strange sensation.');
            else await pline('You notice you have no gold!');
            break;
        }
        case 6:
            if ((u.uluck | 0) + rn2(5) < 0) {
                await pline('You feel your luck is changing.');
                changeLuck(1);
            } else {
                await pline('You may wish for an object.');
                for (;;) {
                    const c = await nhgetch();
                    if (c === 10 || c === 13) break;
                    if (c === 27) break;
                }
            }
            break;
        case 7: {
            const cnt = rnd(10);
            await pline('A voice echoes:');
            await pline(`"Thine audience hath been summoned, ${sire}!"`);
            for (let i = 0; i < cnt; i++) {
                courtmonConsumeRngLikeC(g);
                makemon(null, tx, ty, NO_MM_FLAGS);
            }
            break;
        }
        case 8:
            await pline('A voice echoes:');
            await pline(`"By thine Imperious order, ${sire}!"`);
            break;
        case 9:
            await pline('A voice echoes:');
            await pline('"A curse upon thee for sitting upon this most holy throne!"');
            {
                const luck0 = u.uluck | 0;
                if (luck0 > 0) {
                    u.timed = u.timed || {};
                    u.timed.blind = (u.timed.blind ?? 0) + rn1(100, 250);
                    changeLuck(luck0 > 1 ? -rnd(2) : -1);
                } else {
                    await rndcurseHeroLikeC(g);
                }
            }
            break;
        case 10:
            if ((u.uluck | 0) < 0 || ((u.HSee_invisible | 0) & INTRINSIC) !== 0) {
                await pline('An image forms in your mind.');
            } else {
                if (!(u.Blind | 0)) await pline('Your vision becomes clear.');
                else await pline('Your eyes tingle...');
                u.HSee_invisible = (u.HSee_invisible | 0) | FROMOUTSIDE;
                newsym(tx, ty);
            }
            break;
        case 11:
            if ((u.uluck | 0) < 0) await pline('You feel threatened.');
            else await pline('You feel a wrenching sensation.');
            break;
        case 12:
            await pline('You are granted an insight!');
            if (g.invent) rn2(5);
            break;
        case 13:
            await pline('Your mind turns into a pretzel!');
            u.Confusion = (u.Confusion | 0) + rn1(7, 16);
            break;
        default:
            break;
    }
}

/**
 * C: sit.c **`throne_sit_effect`**
 * @param {import('./gstate.js').game} g
 */
async function throneSitEffectLikeC(g) {
    const u = g.u;
    if (!u || !g.level) return;
    const tx = u.ux | 0;
    const ty = u.uy | 0;
    const special = In_V_tower(u.uz);
    if (rnd(6) > 4) {
        const effect = rnd(13);
        if (special) {
            await specialThroneEffectLikeC(g, effect);
            return;
        }
        await normalThroneSitEffectLikeC(g, effect);
    } else {
        const prince = !!(u.uevent?.uhand_of_elbereth | 0);
        if (prince) await pline('You feel very comfortable here.');
        else await pline('You feel somehow out of place...');
    }
    if (
        !special
        && !rn2(3)
        && (!(g.flags?.wizard | 0) || (await promptAnalyzeThroneLikeC(g)))
    ) {
        const loc = g.level.at(tx, ty);
        if (loc) {
            loc.typ = ROOM;
            loc.flags = 0;
        }
        await pline('The throne vanishes in a puff of logic.');
        newsym(tx, ty);
    }
}

async function promptAnalyzeThroneLikeC(g) {
    await pline('Analyze throne? [yn]');
    g._retainMessageAfterCommand = true;
    await flush_screen(1);
    const a = await nhgetch();
    return a === 121 || a === 89;
}

/**
 * C: sit.c **`dosit`** subset — throne + default floor (**`surface`**).
 * @param {import('./gstate.js').game} g
 */
export async function runDositExtcmdFlowLikeC(g) {
    const u = g.u;
    if (!u || !g.level) {
        await pline('Nothing happens.');
        g._retainMessageAfterCommand = true;
        await flush_screen(1);
        return;
    }
    if (u.usteed) {
        await pline(`You are already sitting on ${u.usteed.monnam || 'your steed'}.`);
        g._retainMessageAfterCommand = true;
        await flush_screen(1);
        return;
    }
    if (!canReachFloor(false)) {
        if (u.uswallow | 0) await pline('There are no seats in here!');
        else if (u.Levitation | 0) await pline('You tumble in place.');
        else await pline('You are sitting on air.');
        g._retainMessageAfterCommand = true;
        await flush_screen(1);
        return;
    }

    g.context = g.context || {};
    const typ = levlTypAt(u.ux | 0, u.uy | 0) | 0;
    const surf = surfaceHereString(g, u.ux | 0, u.uy | 0);

    if (IS_THRONE(typ)) {
        await pline(`You sit on the ${surf}.`);
        await throneSitEffectLikeC(g);
        g.context.move = 1;
    } else if (IS_SINK(typ)) {
        await pline(`You sit on the ${surf}.`);
        await pline('Your rump gets wet.');
        g.context.move = 1;
    } else if (IS_ALTAR(typ)) {
        await pline(`You sit on the ${surf}.`);
        g.context.move = 1;
    } else if (IS_GRAVE(typ)) {
        await pline(`You sit on the ${surf}.`);
        g.context.move = 1;
    } else if (typ === STAIRS) {
        await pline('You sit on the stairs.');
        g.context.move = 1;
    } else if (typ === LADDER) {
        await pline('You sit on the ladder.');
        g.context.move = 1;
    } else if (typ === DRAWBRIDGE_DOWN) {
        await pline('You sit on the drawbridge.');
        g.context.move = 1;
    } else if (IS_POOL(typ)) {
        await pline('You sit in the water.');
        g.context.move = 1;
    } else if (IS_LAVA(typ)) {
        await pline(`You sit on the ${surf}.`);
        burnAwaySlimeStub(g);
        if (likesLavaHeroLikeC(u)) await pline('The lava feels warm.');
        else {
            await pline('The lava burns you!');
            losehp(maybeHalfPhys(rnd(10)), 'sitting on lava', 0);
        }
        g.context.move = 1;
    } else if (typ === ICE) {
        await pline(`You sit on the ${surf}.`);
        if (!(u.Cold_resistance | 0)) await pline('The ice feels cold.');
        g.context.move = 1;
    } else {
        await pline(`Having fun sitting on the ${surf}?`);
        g.context.move = 1;
    }
    g._retainMessageAfterCommand = true;
    await flush_screen(1);
}

/** @param {object} u */
function likesLavaHeroLikeC(u) {
    return !!(u?.Fire_resistance | 0);
}

/** @param {import('./gstate.js').game} g */
function burnAwaySlimeStub(g) {
    if (g.u?.Slimed | 0) g.u.Slimed = 0;
}
