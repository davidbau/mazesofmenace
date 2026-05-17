// pray_hero.js — C pray.c dopray / can_pray / prayer_done / pleased subset / angrygods for `#pray`.
// C ref: pray.c dopray, can_pray, prayer_done, pleased (subset), angrygods (**`gods_angry`** (**`godvoice`** **`rn2(4)`**) on cases **4–6** + **`read.c`** **`punish`** null **`sobj`** on case **6**; **`minion.c`** **`summon_minion`** on cases **7–8**; **`gods_angry`/`god_zaps_you`** on **`default`** via **`god_zaps_hero.js`**), gods_upset, water_prayer
//
// Extended commands read a tty line after `#` (terminated by `\n` or `\r`); see extcmd.js.
// C dopray uses nomul(-3); JS drains three moveloop-equivalent ticks (moveloop_turn_advance.js)
// before prayer_done so monster RNG interleaving matches the recorder harness.

import { nhgetch } from './input.js';
import { flush_screen, pline, youHearLikeC } from './display.js';
import {
    A_CHAOTIC,
    A_LAWFUL,
    A_NEUTRAL,
    A_NONE,
    A_STR,
    A_WIS,
    AM_MASK,
    AM_SHRINE,
    IS_ALTAR,
    In_hell,
    Amask2align,
} from './const.js';
import { heroLuck } from './water_damage.js';
import { alignGnameLikeC, uGnameHeroLikeC } from './pray_align_gname_like_c.js';
import { rn1, rn2, rnz, rnl } from './rng.js';
import { adjattrib, changeLuck } from './attrib.js';
import { losexpNullLikeC } from './losexp.js';
import { floorObjKey } from './floorobj.js';
import { NH5_POTION_CLASS, NH5_WEAPON_CLASS } from './nh5_objclass.js';
import { adjalignLikeC } from './dig_grave.js';
import { executeHelplessMoveloopTickLikeC } from './moveloop_turn_advance.js';
import {
    clearUblessedAngryGodsLikeC,
    applyPleasedPatOnHeadCase5IntrinsicGiftsLikeC,
} from './divine_protection.js';
import { attrcurseHeroLikeC, rndcurseHeroLikeC } from './sit_hero.js';
import { doname } from './objnam.js';
import { encumberMsg } from './pickup.js';
import { findAc } from './u_init_find_ac.js';
import { updateInventory } from './invent.js';
import { weldedUwepLikeC, isWeptoolObjLikeC } from './hero_hands.js';
import { pluslvlHeroLikeC } from './exper_pluslvl.js';
import { applyPleasedPatOnHeadCases678LikeC } from './pray_pat_spell_gcrown.js';
import { punishHeroFromObjLikeC } from './punish_hero.js';
import { syncHeroInvWeightNetLikeC } from './encumbr.js';
import { summonMinionHeroLikeC } from './minion_summon_hero.js';
import { godsAngryHeroLikeC, godZapsYouHeroLikeC } from './god_zaps_hero.js';

const STRIDENT = 4;
/** C: pray.c `#define DEVOUT 14` */
const DEVOUT = 14;
const OTYP_POT_WATER = 321;
/** C: defsym.h **`MONSYM(..., HUMAN, S_HUMAN, ...)`** — **`gy.youmonst.data->mlet`** in pray.c */
const S_HUMAN_MLET = 53;
/** C: objects.h **`HELM_OF_OPPOSITE_ALIGNMENT`** (NH5 otyp **100**). */
const HELM_OF_OPPOSITE_ALIGNMENT = 100;
/** C: pray.c **`godvoices[]`** — **`ROLL_FROM`** for **`godvoice`**. */
const GODVOICES = ['booms out', 'thunders', 'rings out', 'booms'];

/**
 * C: pray.c **`pleased`** **`pat_on_head`** cases **2** (golden heal / **`pluslvl`**) and fallthrough from **3**.
 * @param {import('./gstate.js').game} g
 */
async function applyPleasedPatOnHeadGoldenGlowHealLikeC(g) {
    const u = g.u;
    if (!u) return;
    const blind = !!(u.Blind | 0) || !!(u.ublind | 0) || (u.timed?.blind ?? 0) > 0;
    if (!blind) await pline('You are surrounded by a golden glow.');

    if ((u.ulevel | 0) < (u.ulevelmax | 0)) {
        u.ulevelmax = (u.ulevelmax | 0) - 1;
        await pluslvlHeroLikeC(g, false);
    } else {
        u.uhpmax = (u.uhpmax | 0) + 5;
        if ((u.uhpmax | 0) > (u.uhppeak | 0)) u.uhppeak = u.uhpmax | 0;
        if (u.Upolyd | 0) u.mhmax = (u.mhmax | 0) + 5;
    }
    u.uhp = u.uhpmax | 0;
    if (u.Upolyd | 0) u.mh = u.mhmax | 0;

    const ac = u.acurr?.a;
    const am = u.amax?.a;
    if (ac && am && (ac[A_STR] ?? 0) < (am[A_STR] ?? 0)) {
        ac[A_STR] = am[A_STR] ?? ac[A_STR];
        g.disp = g.disp || {};
        g.disp.botl = true;
        findAc(g);
        await encumberMsg();
    }
    if ((u.uhunger | 0) < 900) u.uhunger = 900;
    if ((u.uluck | 0) < 0) u.uluck = 0;
    u.ucreamed = 0;
    u.ublind = 0;
    if (u.timed) u.timed.blind = 0;
    g.disp = g.disp || {};
    g.disp.botl = true;
}

/**
 * C: pray.c **`pleased`** **`pat_on_head`** switch (**`rn2((Luck+6)>>1)`**).
 * @param {import('./gstate.js').game} g
 * @param {number} g_align
 * @param {number} patSw
 */
async function applyPleasedPatOnHeadSwitchLikeC(g, g_align, patSw) {
    const u = g.u;
    if (!u) return;

    switch (patSw) {
        case 0:
            break;
        case 1: {
            const uwep = u.uwep;
            const wpn =
                uwep
                && (weldedUwepLikeC(g, uwep)
                    || (uwep.oclass | 0) === NH5_WEAPON_CLASS
                    || isWeptoolObjLikeC(uwep));
            if (!wpn) break;

            let repairBuf = '';
            if ((uwep.oeroded | 0) || (uwep.oeroded2 | 0)) {
                repairBuf = ` and ${(uwep.quan | 0) > 1 ? 'are' : 'is'} now as good as new`;
            }

            const blind = !!(u.Blind | 0) || !!(u.ublind | 0) || (u.timed?.blind ?? 0) > 0;
            if (uwep.cursed | 0) {
                if (!blind) {
                    await pline(`${doname(uwep, g)} softly glows amber${repairBuf}.`);
                } else {
                    await pline(`You feel the power of ${uGnameHeroLikeC(g)} over ${doname(uwep, g)}.`);
                }
                uwep.cursed = 0;
                uwep.bknown = 1;
                repairBuf = '';
            } else if (!(uwep.blessed | 0)) {
                if (!blind) {
                    await pline(`${doname(uwep, g)} softly glows with a light blue aura${repairBuf}.`);
                } else {
                    await pline(`You feel the blessing of ${uGnameHeroLikeC(g)} over ${doname(uwep, g)}.`);
                }
                uwep.blessed = 1;
                uwep.cursed = 0;
                uwep.bknown = 1;
                repairBuf = '';
            }

            if ((uwep.oeroded | 0) || (uwep.oeroded2 | 0)) {
                uwep.oeroded = 0;
                uwep.oeroded2 = 0;
                if (repairBuf) await pline(`${doname(uwep, g)} ${blind ? 'feel' : 'look'} as good as new!`);
            }
            if (g.iflags?.perm_invent) updateInventory();
            break;
        }
        case 3: {
            u.uevent = u.uevent || {};
            const ev = u.uevent;
            const noBridge = !(ev.uopened_dbridge | 0);
            const noGeh = !(ev.gehennom_entered | 0);
            if (noBridge && noGeh) {
                if ((ev.uheard_tune | 0) < 1) {
                    const gv = GODVOICES[rn2(GODVOICES.length)];
                    await pline(`The voice of ${alignGnameLikeC(g, g_align)} ${gv}:`);
                    const mortalOrCreature =
                        (u.youmonst?.data?.mlet | 0) === S_HUMAN_MLET ? 'mortal' : 'creature';
                    await pline(`"Hark, ${mortalOrCreature}!"`);
                    await pline('"To enter the castle, thou must play the right tune!"');
                    ev.uheard_tune = (ev.uheard_tune | 0) + 1;
                    break;
                }
                if ((ev.uheard_tune | 0) < 2) {
                    await youHearLikeC('You hear a divine music...');
                    const tune = g._castleTuneStr ?? '?????';
                    await pline(`It sounds like:  "${tune}".`);
                    ev.uheard_tune = (ev.uheard_tune | 0) + 1;
                    break;
                }
            }
        }
        /* FALLTHRU */
        case 2:
            await applyPleasedPatOnHeadGoldenGlowHealLikeC(g);
            break;
        case 4: {
            let any = 0;
            const blind = !!(u.Blind | 0) || !!(u.ublind | 0) || (u.timed?.blind ?? 0) > 0;
            if (blind) await pline(`You feel the power of ${uGnameHeroLikeC(g)}.`);
            else await pline('You are surrounded by a light blue aura.');
            for (let o = g.invent; o; o = o.nobj) {
                if (!(o.cursed | 0)) continue;
                if (o === u.uarmh && (o.otyp | 0) === HELM_OF_OPPOSITE_ALIGNMENT) continue;
                if (!blind) {
                    await pline(`${doname(o, g)} softly glows amber.`);
                    o.bknown = 1;
                    any += 1;
                }
                o.cursed = 0;
            }
            if (any && g.iflags?.perm_invent) updateInventory();
            break;
        }
        case 5:
            await applyPleasedPatOnHeadCase5IntrinsicGiftsLikeC(g);
            break;
        case 6:
        case 7:
        case 8:
            await applyPleasedPatOnHeadCases678LikeC(g, GODVOICES);
            break;
        default:
            break;
    }
}

/** @param {import('./gstate.js').game} g */
function alignGnameRespGodLikeC(g, respGod) {
    return alignGnameLikeC(g, respGod);
}

/** C: pray.c in_trouble — worst problem; stub 0 (no serious trouble). */
function inTroublePrayStubLikeC() {
    return 0;
}

/**
 * C: pray.c can_pray — sets g._prayGp { p_aligntyp, p_trouble, p_type }.
 * @param {import('./gstate.js').game} g
 * @param {boolean} praying
 */
async function canPraySetupLikeC(g, praying) {
    const u = g.u;
    if (!u || !g.level) return false;
    u.ublesscnt = u.ublesscnt ?? 0;
    u.ugangr = u.ugangr ?? 0;
    u.uluck = u.uluck ?? 0;
    u.ualign = u.ualign || { type: A_NEUTRAL, record: 0 };

    const ux = u.ux | 0;
    const uy = u.uy | 0;
    const levl = g.level?.levl;
    const typ = levl?.[ux]?.[uy]?.typ | 0;
    const onAltar = IS_ALTAR(typ);
    const pAligntyp = onAltar
        ? Amask2align((levl[ux][uy].altarmask | 0) & AM_MASK)
        : (u.ualign.type | 0);

    const pTrouble = inTroublePrayStubLikeC();

    g._prayGp = { p_aligntyp: pAligntyp, p_trouble: pTrouble, p_type: 0 };

    if (praying) {
        await pline(`You begin praying to ${alignGnameLikeC(g, pAligntyp)}.`);
    }

    let alignment;
    if (u.ualign.type && u.ualign.type === -pAligntyp) alignment = -(u.ualign.record | 0);
    else if ((u.ualign.type | 0) !== (pAligntyp | 0)) alignment = Math.trunc((u.ualign.record | 0) / 2);
    else alignment = u.ualign.record | 0;

    const Luck = heroLuck(g);
    if ((pAligntyp | 0) === A_NONE) {
        g._prayGp.p_type = -2;
    } else if (
        (pTrouble > 0 ? u.ublesscnt > 200 : pTrouble < 0 ? u.ublesscnt > 100 : u.ublesscnt > 0)
    ) {
        g._prayGp.p_type = 0;
    } else if (Luck < 0 || (u.ugangr | 0) || alignment < 0) {
        g._prayGp.p_type = 1;
    } else if (onAltar && (u.ualign.type | 0) !== (pAligntyp | 0)) {
        g._prayGp.p_type = 2;
    } else {
        g._prayGp.p_type = 3;
    }

    return true;
}

/**
 * C: pray.c water_prayer — bless/curse water on altar (floorObjHeads only).
 * @param {import('./gstate.js').game} g
 * @param {boolean} blessWater
 */
async function waterPrayerLikeC(g, blessWater) {
    const u = g.u;
    const lvl = g.level;
    if (!u || !lvl?.floorObjHeads) return false;
    const k = floorObjKey(u.ux | 0, u.uy | 0);
    let changed = 0;
    let other = false;
    for (let o = lvl.floorObjHeads.get(k); o; o = o.nexthere) {
        if (
            (o.otyp | 0) === OTYP_POT_WATER
            && (blessWater ? !(o.blessed | 0) : !(o.cursed | 0))
        ) {
            o.blessed = blessWater ? 1 : 0;
            o.cursed = blessWater ? 0 : 1;
            changed += o.quan | 0 || 1;
        } else if ((o.oclass | 0) === NH5_POTION_CLASS) {
            other = true;
        }
    }
    if (changed && !(u.Blind | 0)) {
        const col = blessWater ? 'light blue' : 'black';
        await pline(
            `${other && changed > 1 ? 'Some of the' : other ? 'One of the' : 'The'} potion${
                other || changed > 1 ? 's' : ''
            } on the altar glow${changed > 1 ? '' : 's'} ${col} for a moment.`,
        );
    }
    return changed > 0;
}

/**
 * C: pray.c **`pleased(aligntyp g_align)`** — **`You_feel`**, **`adjalign`**, trouble/action **`rn1`/`rnl`/`switch`**,
 * pat_on_head (rn2((Luck+6)>>1) cases 0–8; 6–8 give_spell / gcrownu), ublesscnt tail (rnz(350), kick, moves throttle).
 * @param {import('./gstate.js').game} g
 * @param {number} g_align
 */
async function pleasedHeroLikeC(g, g_align) {
    const u = g.u;
    const gp = g._prayGp;
    if (!u || !gp) return;

    let trouble = inTroublePrayStubLikeC();
    const Luck = heroLuck(g);
    const record = u.ualign?.record | 0;
    const hallu = !!(u.Hallucination | 0);

    const ux = u.ux | 0;
    const uy = u.uy | 0;
    const levl = g.level?.levl;
    const typ = levl?.[ux]?.[uy]?.typ | 0;
    const onAltar = IS_ALTAR(typ);

    let recPhrase;
    if (record >= DEVOUT) recPhrase = hallu ? 'pleased as punch' : 'well-pleased';
    else if (record >= STRIDENT) recPhrase = hallu ? 'ticklish' : 'pleased';
    else recPhrase = hallu ? 'full' : 'satisfied';

    await pline(`You feel that ${alignGnameLikeC(g, g_align)} is ${recPhrase}.`);

    if (onAltar && (gp.p_aligntyp | 0) !== (u.ualign?.type | 0)) {
        adjalignLikeC(g, -1);
        return;
    }
    if (record < 2 && trouble <= 0) adjalignLikeC(g, 1);

    let pat_on_head = 0;
    if (!trouble && record >= DEVOUT) {
        if ((gp.p_trouble | 0) === 0) pat_on_head = 1;
    } else {
        const prayer_luck = Math.max(Luck, -1);
        const shrine =
            onAltar && levl?.[ux]?.[uy]
                ? (((levl[ux][uy].altarmask | 0) & AM_SHRINE) !== 0 ? 1 : 0)
                : 0;
        let action = rn1(prayer_luck + (onAltar ? 3 + shrine : 2), 1);
        if (!onAltar) action = Math.min(action, 3);
        if (record < STRIDENT) {
            action = record > 0 || !rnl(2) ? 1 : 0;
        }
        const ac = Math.min(action, 5);
        let tryct = 0;
        switch (ac) {
            case 5:
                pat_on_head = 1;
            /* falls through */
            case 4:
                do {
                    void 0; /* C: fix_worst_trouble(trouble) */
                } while ((trouble = inTroublePrayStubLikeC()) !== 0);
                break;
            case 3:
                /* C: fix_worst_trouble(trouble) */
            /* falls through */
            case 2:
                while ((trouble = inTroublePrayStubLikeC()) > 0 && ++tryct < 10) {
                    void 0; /* C: fix_worst_trouble(trouble) */
                }
                break;
            case 1:
                if (trouble > 0) {
                    void 0; /* C: fix_worst_trouble(trouble) */
                }
                break;
            case 0:
            default:
                break;
        }
    }

    if (pat_on_head) {
        const patSw = rn2((Luck + 6) >> 1);
        await applyPleasedPatOnHeadSwitchLikeC(g, g_align, patSw);
    }

    u.ublesscnt = (u.ublesscnt | 0) + rnz(350);
    let kick_on_butt = u.uevent?.udemigod ? 1 : 0;
    if (u.uevent?.uhand_of_elbereth | 0) kick_on_butt += 1;
    if (kick_on_butt) u.ublesscnt += kick_on_butt * rnz(1000);

    const moves = g.moves | 0;
    if (moves > 100000) {
        let incr = Math.trunc((moves - 100000) / 100);
        const cap = 2147483647 - (u.ublesscnt | 0);
        if (incr > cap) incr = cap;
        if (incr > 0) u.ublesscnt = (u.ublesscnt | 0) + incr;
    }
}

/**
 * C: pray.c angrygods — switch (rn2(maxanger)); tail rnz(300) for u.ublesscnt.
 * @param {import('./gstate.js').game} g
 * @param {number} respGod
 */
async function angrygodsLikeC(g, respGod) {
    const u = g.u;
    if (!u) return;
    let rg = respGod | 0;
    if (In_hell(u.uz)) rg = A_NONE;

    clearUblessedAngryGodsLikeC(g);

    const Luck = heroLuck(g);
    const rec = u.ualign?.record | 0;
    const ug = u.ugangr | 0;
    let maxanger;
    if (rg !== (u.ualign?.type | 0)) {
        maxanger = Math.trunc(rec / 2) + (Luck > 0 ? -Math.trunc(Luck / 3) : -Luck);
    } else {
        maxanger =
            3 * ug +
            (Luck > 0 || rec >= STRIDENT ? -Math.trunc(Luck / 3) : -Luck);
    }
    if (maxanger < 1) maxanger = 1;
    else if (maxanger > 15) maxanger = 15;

    const sw = rn2(maxanger);
    const hallu = !!(u.Hallucination | 0);
    const ugodAngry = (u.ualign?.record | 0) < 0;

    switch (sw) {
        case 0:
        case 1:
            await pline(
                `You feel that ${alignGnameRespGodLikeC(g, rg)} is ${hallu ? 'bummed' : 'displeased'}.`,
            );
            break;
        case 2:
        case 3: {
            const mortalOrCreature =
                (u.youmonst?.data?.mlet | 0) === S_HUMAN_MLET ? 'mortal' : 'creature';
            await pline(
                `The voice of ${alignGnameRespGodLikeC(g, rg)} thunders: "Thou ${
                    ugodAngry && rg === (u.ualign?.type | 0) ? 'hast strayed from the path' : 'art arrogant'
                }, ${mortalOrCreature}."`,
            );
            await pline('Thou must relearn thy lessons!');
            adjattrib(A_WIS, -1, false);
            await losexpNullLikeC(g);
            break;
        }
        case 6:
            if (!(u.Punished | 0)) {
                /* C: **`gods_angry`** + **`read.c`** **`punish((struct obj *) 0)`** */
                await godsAngryHeroLikeC(g, rg);
                await punishHeroFromObjLikeC(g, null);
                syncHeroInvWeightNetLikeC(g);
                break;
            }
            /* FALLTHRU */
        case 4:
        case 5: {
            await godsAngryHeroLikeC(g, rg);
            const blind = !!(u.Blind | 0);
            const antimagic = !!(u.Antimagic | 0);
            if (!blind && !antimagic) await pline('A black glow surrounds you.');
            if (rn2(2)) await rndcurseHeroLikeC(g);
            else {
                const stripped = await attrcurseHeroLikeC(g);
                if (!stripped) await rndcurseHeroLikeC(g);
            }
            break;
        }
        case 7:
        case 8: {
            const mortalOrCreature =
                (u.youmonst?.data?.mlet | 0) === S_HUMAN_MLET ? 'mortal' : 'creature';
            const onAltar = IS_ALTAR(g.level?.levl?.[u.ux | 0]?.[u.uy | 0]?.typ | 0);
            const aa = onAltar
                ? Amask2align((g.level.levl[u.ux | 0][u.uy | 0].altarmask | 0) & AM_MASK)
                : (u.ualign?.type | 0);
            await pline(
                `The voice of ${alignGnameRespGodLikeC(g, rg)} thunders: "Thou durst ${
                    onAltar && aa !== rg ? 'scorn' : 'call upon'
                } me?"`,
            );
            await pline(`"Then die, ${mortalOrCreature}!"`);
            summonMinionHeroLikeC(g, rg, false);
            break;
        }
        default: {
            /* C: **`gods_angry`** + **`god_zaps_you`** */
            await godsAngryHeroLikeC(g, rg);
            await godZapsYouHeroLikeC(g, rg);
            break;
        }
    }

    const newUblesscnt = rnz(300);
    if (newUblesscnt > (u.ublesscnt | 0)) u.ublesscnt = newUblesscnt;
}

/** C: pray.c gods_upset */
async function godsUpsetLikeC(g, gAlign) {
    const u = g.u;
    if (!u) return;
    const t = u.ualign?.type | 0;
    if ((gAlign | 0) === t) u.ugangr = (u.ugangr | 0) + 1;
    else if (u.ugangr | 0) u.ugangr = (u.ugangr | 0) - 1;
    await angrygodsLikeC(g, gAlign);
}

/**
 * C: pray.c prayer_done
 * @param {import('./gstate.js').game} g
 */
async function prayerDoneLikeC(g) {
    const u = g.u;
    const gp = g._prayGp;
    if (!u || !gp) return;
    const alignment = gp.p_aligntyp | 0;

    if (In_hell(u.uz)) {
        await pline(`Since you are in Gehennom, ${alignGnameLikeC(g, alignment)} can't help you.`);
        if ((u.ualign?.record | 0) <= 0 || rnl(u.ualign.record | 0)) {
            await angrygodsLikeC(g, u.ualign.type | 0);
        }
        return;
    }

    if (gp.p_type === -2) {
        await pline('You hear diabolical laughter all around you...');
        return;
    }
    if (gp.p_type === -1) {
        await pline('You feel like you are falling apart.');
        return;
    }

    const onAltar = IS_ALTAR(g.level?.levl?.[u.ux | 0]?.[u.uy | 0]?.typ | 0);

    if (gp.p_type === 0) {
        if (onAltar && (u.ualign.type | 0) !== alignment) await waterPrayerLikeC(g, false);
        u.ublesscnt = (u.ublesscnt | 0) + rnz(250);
        changeLuck(-3);
        await godsUpsetLikeC(g, u.ualign.type | 0);
    } else if (gp.p_type === 1) {
        if (onAltar && (u.ualign.type | 0) !== alignment) await waterPrayerLikeC(g, false);
        await angrygodsLikeC(g, u.ualign.type | 0);
    } else if (gp.p_type === 2) {
        if (await waterPrayerLikeC(g, false)) {
            u.ublesscnt = (u.ublesscnt | 0) + rnz(250);
            changeLuck(-3);
            await godsUpsetLikeC(g, u.ualign.type | 0);
        } else {
            await pleasedHeroLikeC(g, alignment);
        }
    } else {
        if (onAltar) {
            await waterPrayerLikeC(g, true);
        }
        await pleasedHeroLikeC(g, alignment);
    }
}

/**
 * C: pray.c dopray + prayer_done timing (ParanoidPray confirm, can_pray, nomul(-3) as three ticks).
 * @param {import('./gstate.js').game} g
 */
export async function runDoprayExtcmdFlowLikeC(g) {
    await pline('Are you sure you want to pray? [yn] (n)');
    g._retainMessageAfterCommand = true;
    await flush_screen(1);
    const ans = await nhgetch();
    if (ans !== 121 && ans !== 89) {
        return;
    }

    await canPraySetupLikeC(g, true);

    for (let i = 0; i < 3; i++) {
        await executeHelplessMoveloopTickLikeC(g);
    }

    await prayerDoneLikeC(g);
    await pline('You finish your prayer.');
    g._retainMessageAfterCommand = true;
    await flush_screen(1);
}
