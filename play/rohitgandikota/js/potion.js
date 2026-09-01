// potion.js — potion effects.
// C ref: src/potion.c
//
// Only healup() so far, reached by the healing spells' zapyourself route.

import { fruitname, makeplural, xname } from './objnam.js';
import { hliquid, trycall } from './do_name.js';
import { newuhs } from './eat.js';
import { game } from './gstate.js';
import { canseemon, canspotmon, map_invisible, newsym, pline, see_monsters }
    from './display.js';
import { You, You_feel, pline_The } from './pline.js';
import { exercise, adjattrib, A_MAX, ACURR, Fast } from './attrib.js';
import { A_STR, A_INT, A_DEX, A_CON, A_CHA,
         BOLT_LIM, KILLED_BY_AN, KILLED_BY, POTHIT_HERO_THROW,
         POTHIT_OTHER_THROW,
         HEAD, EYE, SICK_ALL, TIMEOUT, A_CHAOTIC, A_LAWFUL, NON_PM,
         Upolyd, ismnum, FAST, MFAST, MSLOW, STRAT_WAITFORU } from './const.js';
import { Your } from './pline.js';
import { nomul, losehp } from './hack.js';
import { surface } from './dungeon.js';
import { A_WIS, ECMD_CANCEL, IS_FOUNTAIN, IS_SINK } from './const.js';
import { Unaware, Hallucination, Halluc_resistance, Blind,
         Deaf, Poison_resistance, Sleep_resistance,
         Underwater, Antimagic } from './youprop.js';
import { rn2, rn1, rnd, d } from './rng.js';
import { ONAMES, MATERIALS } from './objects_data.js';
import { PMNAMES, MFLAGS, ATTKS } from './monst_data.js';
import { OBJ_DESCR } from './objnam.js';
import { makeknown, observe_object } from './o_init.js';
import { more_experienced } from './exper.js';
import { freeinv, getobj, hold_another_object, useup, useupall,
         update_inventory, ECMD_TIME, ECMD_OK, GETOBJ_PROMPT,
         obfree } from './invent.js';
import { is_pool, wake_nearto, wakeup, killed, healmon, unstuck,
         mcureblindness }
    from './mon.js';
import { OCLASSES } from './objects_data.js';
import { tty_yn_function } from './tty/topl.js';
import { GETOBJ_NOFLAGS } from './const.js';
import { GETOBJ_SUGGEST, GETOBJ_DOWNPLAY, GETOBJ_EXCLUDE } from './invent.js';
import { GETOBJ_EXCLUDE_INACCESS } from './invent.js';
import { doname, otense, short_oname, simpleonames, thesimpleoname,
         Tobjnam } from './objnam.js';
import { body_part } from './polyself.js';
import { breathless, dmgtype, eyecount, haseyes, has_head, is_human, is_silent,
         mon_hates_blessings, resists_acid, resists_poison, stagger, sticks }
    from './mondata.js';
import { cansee, vision_recalc } from './vision.js';
import { hcolor } from './do_name.js';
import { Monnam, mon_nam } from './do_name.js';
import { mkobj, splitobj } from './mkobj.js';
import { distu, s_suffix } from './hacklib.js';
const G_GONE = MFLAGS.G_GENOD | MFLAGS.G_EXTINCT;

function note_unported_potion(what) {
    (game.unported ||= new Set()).add(what);
}

// src/mhitm.c:paralyze_monst() and slept_monst(). These small helpers are
// kept here with their only current caller, thrown potion effects.
function paralyze_monst(mon, amount) {
    mon.mcanmove = 0;
    mon.mfrozen = Math.min(amount, 127);
    mon.meating = 0;
    mon.mstrategy = (mon.mstrategy | 0) & ~STRAT_WAITFORU;
}

async function slept_monst(mon) {
    if ((mon.msleeping || !mon.mcanmove) && mon === game.u.ustuck
        && !sticks(game.youmonst.data) && !game.u.uswallow) {
        await pline(`${s_suffix(Monnam(mon))} grip relaxes.`);
        await unstuck(mon);
    }
}

// src/worn.c:mon_set_minvis() and mon_adjust_speed(), narrowed to the two
// potionhit callers which need them.
function mon_set_minvis(mon, cursedPotion) {
    mon.perminvis = cursedPotion ? 0 : 1;
    if (!mon.invis_blkd) {
        mon.minvis = mon.perminvis;
        newsym(mon.mx, mon.my);
    }
}

async function mon_adjust_speed(mon, obj) {
    const oldspeed = mon.mspeed | 0;
    mon.permspeed = (mon.permspeed | 0) === MSLOW ? 0 : MFAST;
    const speedArmor = (mon.minvent || []).some(item =>
        item.owornmask && game.objects[item.otyp]?.oc_oprop === FAST);
    mon.mspeed = speedArmor ? MFAST : mon.permspeed;

    if (mon.mspeed !== oldspeed && mon.data.mmove
        && !mon.mfrozen && !mon.msleeping && canseemon(mon)) {
        const howmuch = mon.mspeed + oldspeed === MFAST + MSLOW
            ? 'much ' : '';
        await pline(`${Monnam(mon)} is suddenly moving ${howmuch}faster.`);
        const { learnwand } = await import('./zap.js');
        learnwand(obj);
    }
}

// src/potion.c:137 make_sick(). Set or clear fatal illness and food
// poisoning. The delayed-killer record is retained in JS state for the
// timeout path; immediate messaging and status state match the C routine.
export async function make_sick(xtime, cause, talk, type) {
    const u = game.u;
    const props = (u.uprops ||= {});
    const old = props.SICK || 0;

    if (xtime > 0) {
        if (props.SICK_RES || u.intrinsic?.HSick_resistance)
            return;
        if (!old) {
            await You_feel('deathly sick.');
        } else if (talk) {
            await You_feel(`${xtime <= old / 2 ? 'much' : 'even'} worse.`);
        }
        props.SICK = xtime;
        u.usick_type = (u.usick_type || 0) | type;
        (game.disp ||= {}).botl = true;
    } else if (old && (type & (u.usick_type || 0))) {
        const old_sick_type = u.usick_type || 0;
        u.usick_type &= ~type;
        const still_sick = !!u.usick_type;
        if (talk) {
            game._deferred_status_sick_type = old_sick_type;
            try {
                await You_feel(still_sick ? 'somewhat better.'
                                          : 'cured.  What a relief!');
            } finally {
                delete game._deferred_status_sick_type;
            }
        }
        props.SICK = still_sick ? old * 2 : 0;
        (game.disp ||= {}).botl = true;
    }

    if (props.SICK) {
        exercise(A_CON, false);
        game.delayed_killer = {
            how: 'sickness',
            format: cause === '#wizintrinsic' ? KILLED_BY : KILLED_BY_AN,
            name: cause,
        };
    } else if (game.delayed_killer?.how === 'sickness') {
        game.delayed_killer = null;
    }
}

// src/potion.c:243 make_vomiting(). The countdown dialogue and per-turn
// effects live in nh_timeout(); this routine only starts or clears the timer.
export async function make_vomiting(xtime, talk) {
    const props = (game.u.uprops ||= {});
    const old = props.VOMITING || 0;

    if (Unaware())
        talk = false;

    props.VOMITING = Math.max(0, xtime | 0);
    (game.disp ||= {}).botl = true;
    if (!xtime && old && talk)
        await You_feel('much less nauseated now.');
}

// src/potion.c:1428 healup()
export async function healup(nhp, nxtra, curesick, cureblind) {
    const u = game.u;

    if (nhp) {
        /* the Upolyd arm reads u.mh; polyself is not ported */
        u.uhp += nhp;
        if (u.uhp > u.uhpmax) {
            u.uhp = (u.uhpmax += nxtra);
            if (u.uhpmax > (u.uhppeak || 0))
                u.uhppeak = u.uhpmax;
        }
    }
    if (cureblind) {
        u.ucreamed = 0;
        await make_blinded(0, true);
        await make_deaf(0, true);
    }
    if (curesick) {
        await make_vomiting(0, true);
        if (u.uprops?.SICK)
            await make_sick(0, null, true, SICK_ALL);
    }
    (game.disp ||= {}).botl = true;
}

const bottlenames = ['bottle', 'phial', 'flagon', 'carafe', 'flask', 'jar',
                     'vial'];
const hallucinated_bottlenames = [
    'jug', 'pitcher', 'barrel', 'tin', 'bag', 'box', 'glass', 'beaker',
    'tumbler', 'vase', 'flowerpot', 'pan', 'thingy', 'mug', 'teacup',
    'teapot', 'keg', 'bucket', 'thermos', 'amphora', 'wineskin', 'parcel',
    'bowl', 'ampoule',
];

// src/potion.c:1490 bottlename().
export function bottlename() {
    const names = Hallucination() ? hallucinated_bottlenames : bottlenames;
    return names[rn2(names.length)];
}

// src/potion.c:1932 potionbreathe(), common offensive-potion vapors.
export async function potionbreathe(obj) {
    let kn = 0;
    let cureblind = false;
    const already_in_use = !!obj.in_use;
    obj.in_use = true;

    const wet_towel = game.u.ublindf?.otyp === ONAMES.TOWEL
                       && (game.u.ublindf.spe | 0) > 0;
    if (wet_towel) {
        await pline('Some vapor passes harmlessly around you.');
    } else {
        switch (obj.otyp) {
        case ONAMES.POT_RESTORE_ABILITY:
        case ONAMES.POT_GAIN_ABILITY:
            if (obj.cursed) {
                if (!breathless(game.youmonst.data))
                    await pline('Ulch!  That potion smells terrible!');
                else if (haseyes(game.youmonst.data)) {
                    const count = eyecount(game.youmonst.data);
                    let eyes = body_part(EYE);
                    if (count !== 1)
                        eyes = makeplural(eyes);
                    await Your(`${eyes} ${count === 1 ? 'stings' : 'sting'}!`);
                }
            } else {
                let i = rn2(A_MAX);
                let isdone = false;
                for (let ii = 0; !isdone && ii < A_MAX; ii++) {
                    if (game.u.acurr.a[i] < game.u.amax.a[i]) {
                        game.u.acurr.a[i]++;
                        isdone = !obj.blessed;
                        (game.disp ||= {}).botl = true;
                    }
                    if (++i >= A_MAX)
                        i = 0;
                }
            }
            break;
        case ONAMES.POT_FULL_HEALING:
            if (game.u.uhp < game.u.uhpmax) {
                game.u.uhp++;
                (game.disp ||= {}).botl = true;
            }
            cureblind = true;
            // Falls through for the extra-healing and healing vapor effects.
        case ONAMES.POT_EXTRA_HEALING:
            if (game.u.uhp < game.u.uhpmax) {
                game.u.uhp++;
                (game.disp ||= {}).botl = true;
            }
            if (!obj.cursed)
                cureblind = true;
            // Falls through for the ordinary healing vapor effect.
        case ONAMES.POT_HEALING:
            if (game.u.uhp < game.u.uhpmax) {
                game.u.uhp++;
                (game.disp ||= {}).botl = true;
            }
            if (obj.blessed)
                cureblind = true;
            if (cureblind) {
                await make_blinded(0, !game.u.ucreamed);
                await make_deaf(0, true);
            }
            exercise(A_CON, true);
            break;
        case ONAMES.POT_SICKNESS:
            if (!Role_if('PM_HEALER')) {
                if (Upolyd(game.u)) {
                    game.u.mh = game.u.mh <= 5 ? 1 : game.u.mh - 5;
                } else {
                    game.u.uhp = game.u.uhp <= 5 ? 1 : game.u.uhp - 5;
                }
                (game.disp ||= {}).botl = true;
                exercise(A_CON, false);
            }
            break;
        case ONAMES.POT_HALLUCINATION:
            await You('have a momentary vision.');
            break;
        case ONAMES.POT_CONFUSION:
        case ONAMES.POT_BOOZE:
            if (!game.u.uprops?.CONFUSION)
                await You_feel('somewhat dizzy.');
            await make_confused(itimeout_incr(game.u.intrinsic?.HConfusion,
                                              rnd(5)), false);
            break;
        case ONAMES.POT_INVISIBILITY:
            if (!game.u.ublind && !game.u.uprops?.INVIS) {
                kn++;
                await pline(`For an instant you ${
                    game.u.uprops?.SEE_INVIS ? 'could see right through yourself'
                                             : "couldn't see yourself"}!`);
            }
            break;
        case ONAMES.POT_PARALYSIS:
            kn++;
            if (!game.u.uprops?.FREE_ACTION
                && !game.u.intrinsic?.HFree_action) {
                await pline('Something seems to be holding you.');
                nomul(-rnd(5));
                game.multi_reason = 'frozen by a potion';
                game.nomovemsg = 'You can move again.';
                exercise(A_DEX, false);
            } else {
                await You('stiffen momentarily.');
            }
            break;
        case ONAMES.POT_SLEEPING:
            kn++;
            if (!game.u.uprops?.FREE_ACTION
                && !game.u.intrinsic?.HFree_action
                && !Sleep_resistance()) {
                await You_feel('rather tired.');
                nomul(-rnd(5));
                game.multi_reason = 'sleeping off a magical draught';
                game.nomovemsg = 'You can move again.';
                exercise(A_DEX, false);
            } else {
                await You('yawn.');
                note_unported_potion('potionbreathe:monstseesu_sleep');
            }
            break;
        case ONAMES.POT_SPEED: {
            if (!Fast())
                await Your('knees seem more flexible now.');
            const intrinsic = game.u.intrinsic ||= {};
            const current = intrinsic.HFast | 0;
            const timeout = Math.min(TIMEOUT,
                (current & TIMEOUT) + rnd(5));
            intrinsic.HFast = (current & ~TIMEOUT) | timeout;
            exercise(A_DEX, true);
            break;
        }
        case ONAMES.POT_WATER:
            if (game.u.umonnum === PMNAMES.PM_GREMLIN) {
                const { split_you } = await import('./mhitu.js');
                await split_you();
            } else if (ismnum(game.u.ulycn)) {
                const { you_unwere, you_were } = await import('./were.js');
                if (obj.blessed && game.u.umonnum === game.u.ulycn)
                    await you_unwere(false);
                else if (obj.cursed && !Upolyd(game.u))
                    await you_were();
            }
            break;
        case ONAMES.POT_BLINDNESS:
            if (!game.u.ublind && !Unaware()) {
                kn++;
                await pline('It suddenly gets dark.');
            }
            await make_blinded(
                itimeout_incr(game.u.intrinsic?.HBlinded, rnd(5)), false);
            if (!game.u.ublind && !Unaware())
                await Your('vision clears.');
            break;
        case ONAMES.POT_ACID:
        case ONAMES.POT_POLYMORPH:
            exercise(A_CON, false);
            break;
        case ONAMES.POT_GAIN_LEVEL:
        case ONAMES.POT_GAIN_ENERGY:
        case ONAMES.POT_LEVITATION:
        case ONAMES.POT_FRUIT_JUICE:
        case ONAMES.POT_MONSTER_DETECTION:
        case ONAMES.POT_OBJECT_DETECTION:
        case ONAMES.POT_OIL:
            break;
        default:
            note_unported_potion(`potionbreathe:otyp=${obj.otyp}`);
            break;
        }
    }

    if (!already_in_use)
        obj.in_use = false;
    if (obj.dknown) {
        if (kn)
            makeknown(obj.otyp);
        else
            await trycall(obj);
    }
}

// src/potion.c:1618 potionhit(). The bottle name and impact damage are drawn
// before the potion effect, anger, and possible adjacent vapor exposure.
export async function potionhit(mon, obj, how) {
    const botlnam = bottlename();
    const isyou = mon === game.youmonst;
    let tx, ty, distance;

    if (isyou) {
        tx = game.u.ux;
        ty = game.u.uy;
        distance = 0;
        await pline_The(`${botlnam} crashes on your ${body_part(HEAD)} and breaks into shards.`);
        let impact = rnd(2);
        if (game.u.uprops?.HALF_PHDAM)
            impact = Math.trunc((impact + 1) / 2);
        await losehp(impact,
                     how === POTHIT_OTHER_THROW ? 'propelled potion'
                                                : 'thrown potion',
                     KILLED_BY_AN);
    } else {
        tx = mon.mx;
        ty = mon.my;
        distance = distu(tx, ty);
        if (cansee(tx, ty)) {
            const target = has_head(mon.data)
                ? `${s_suffix(mon_nam(mon))} ${game.notonhead ? 'body'
                                                             : 'head'}`
                : mon_nam(mon);
            await pline_The(`${botlnam} crashes on ${target} and breaks into shards.`);
        } else {
            await pline('Crash!');
        }
        if (rn2(5) && (mon.mhp | 0) > 1)
            mon.mhp--;
    }

    if (obj.otyp !== ONAMES.POT_OIL && cansee(tx, ty))
        await pline(`${Tobjnam(obj, 'evaporate')}.`);

    if (isyou) {
        if (obj.otyp === ONAMES.POT_OIL && obj.lamplit) {
            const { explode_oil } = await import('./explode.js');
            await explode_oil(obj, game.u.ux, game.u.uy);
        } else if (obj.otyp === ONAMES.POT_POLYMORPH) {
            await You_feel(`a little ${Hallucination() ? 'normal' : 'strange'}.`);
            const unchanging = !!(game.u.intrinsic?.HUnchanging
                                  || game.u.uprops?.UNCHANGING);
            if (!unchanging && !Antimagic()) {
                const { polyself } = await import('./polyself.js');
                await polyself();
            }
        } else if (obj.otyp === ONAMES.POT_ACID
                   && !game.u.uprops?.ACID_RES) {
            await pline(`This burns${obj.blessed ? ' a little'
                                  : obj.cursed ? ' a lot' : ''}!`);
            let damage = d(obj.cursed ? 2 : 1, obj.blessed ? 4 : 8);
            if (game.u.uprops?.HALF_PHDAM)
                damage = Math.trunc((damage + 1) / 2);
            await losehp(damage, 'potion of acid', KILLED_BY_AN);
        }
    } else {
        let angermon = how <= POTHIT_HERO_THROW;
        switch (obj.otyp) {
        case ONAMES.POT_FULL_HEALING:
        case ONAMES.POT_EXTRA_HEALING:
        case ONAMES.POT_HEALING:
        case ONAMES.POT_RESTORE_ABILITY:
        case ONAMES.POT_GAIN_ABILITY: {
            const cureblind = obj.otyp === ONAMES.POT_FULL_HEALING
                || (obj.otyp === ONAMES.POT_EXTRA_HEALING && !obj.cursed)
                || (obj.otyp === ONAMES.POT_HEALING && obj.blessed);
            const healingPotion = obj.otyp === ONAMES.POT_FULL_HEALING
                || obj.otyp === ONAMES.POT_EXTRA_HEALING
                || obj.otyp === ONAMES.POT_HEALING;

            if (healingPotion
                && mon.data === game.mons[PMNAMES.PM_PESTILENCE]) {
                if ((mon.mhp | 0) > 2) {
                    mon.mhp = Math.trunc(mon.mhp / 2);
                    if (canseemon(mon))
                        await pline(`${Monnam(mon)} looks rather ill.`);
                }
            } else {
                angermon = false;
                if ((mon.mhp | 0) < (mon.mhpmax | 0)) {
                    healmon(mon, mon.mhpmax, 0);
                    if (canseemon(mon))
                        await pline(`${Monnam(mon)} looks sound and hale again.`);
                }
                if (cureblind)
                    await mcureblindness(mon, canseemon(mon));
            }
            break;
        }
        case ONAMES.POT_CONFUSION:
        case ONAMES.POT_BOOZE: {
            const { resist } = await import('./zap.js');
            if (!resist(mon, OCLASSES.POTION_CLASS, 0, false))
                mon.mconf = 1;
            break;
        }
        case ONAMES.POT_INVISIBILITY: {
            const sawit = canspotmon(mon);
            const cursedPotion = !!obj.cursed;
            angermon = !!mon.minvis && cursedPotion;
            mon_set_minvis(mon, cursedPotion);
            if (sawit && !canspotmon(mon)) {
                if (cansee(mon.mx, mon.my))
                    map_invisible(mon.mx, mon.my);
            } else if (sawit && cursedPotion) {
                await pline(`${Monnam(mon)} briefly seems to be transparent.`);
            } else if (!sawit && canspotmon(mon)) {
                await pline(`${Monnam(mon)} appears!`);
            }
            break;
        }
        case ONAMES.POT_SLEEPING: {
            const { sleep_monst } = await import('./zap.js');
            if (sleep_monst(mon, rnd(12), OCLASSES.POTION_CLASS)) {
                await pline(`${Monnam(mon)} falls asleep.`);
                await slept_monst(mon);
            }
            break;
        }
        case ONAMES.POT_PARALYSIS:
            if (mon.mcanmove)
                paralyze_monst(mon, rnd(25));
            break;
        case ONAMES.POT_SPEED:
            angermon = false;
            await mon_adjust_speed(mon, obj);
            break;
        case ONAMES.POT_BLINDNESS:
            if (haseyes(mon.data) && (mon.mcansee || mon.mblinded)) {
                const first = rn2(32);
                const second = rn2(32);
                const { resist } = await import('./zap.js');
                const resisted = resist(mon, OCLASSES.POTION_CLASS, 0, false);
                const duration = 64 + first + second * !resisted
                               + (mon.mblinded | 0);
                mon.mblinded = Math.min(duration, 127);
                mon.mcansee = 0;
            }
            break;
        case ONAMES.POT_SICKNESS:
            if (mon.data === game.mons[PMNAMES.PM_PESTILENCE]) {
                angermon = false;
                if ((mon.mhp | 0) < (mon.mhpmax | 0)) {
                    healmon(mon, mon.mhpmax, 0);
                    if (canseemon(mon))
                        await pline(`${Monnam(mon)} looks sound and hale again.`);
                }
            } else if (dmgtype(mon.data, ATTKS.AD_DISE)
                       || dmgtype(mon.data, ATTKS.AD_PEST)
                       || resists_poison(mon)) {
                if (canseemon(mon))
                    await pline(`${Monnam(mon)} looks unharmed.`);
            } else if ((mon.mhp | 0) > 2) {
                mon.mhp = Math.trunc(mon.mhp / 2);
                if (canseemon(mon))
                    await pline(`${Monnam(mon)} looks rather ill.`);
            }
            break;
        case ONAMES.POT_WATER: {
            const { is_were, new_were } = await import('./were.js');
            const { is_vampshifter } = await import('./monst.js');
            const were = is_were(mon.data);
            if (mon_hates_blessings(mon) || were || is_vampshifter(mon)) {
                if (obj.blessed) {
                    await pline(`${Monnam(mon)} ${
                        is_silent(mon.data) ? 'writhes' : 'shrieks'} in pain!`);
                    if (!is_silent(mon.data))
                        wake_nearto(tx, ty, (mon.data.mlevel | 0) * 10);
                    mon.mhp -= d(2, 6);
                    if ((mon.mhp | 0) <= 0)
                        await killed(mon);
                    else if (were && !is_human(mon.data))
                        await new_were(mon);
                } else if (obj.cursed) {
                    angermon = false;
                    if (canseemon(mon))
                        await pline(`${Monnam(mon)} looks healthier.`);
                    healmon(mon, d(2, 6), 0);
                    const { Protection_from_shape_changers }
                        = await import('./youprop.js');
                    if (were && is_human(mon.data)
                        && !Protection_from_shape_changers())
                        await new_were(mon);
                }
            } else if (mon.data === game.mons[PMNAMES.PM_GREMLIN]) {
                angermon = false;
                if ((mon.mhp | 0) > (mon.mhpmax | 0))
                    mon.mhp = mon.mhpmax;
                const { clone_mon } = await import('./makemon.js');
                const clone = (mon.mhp | 0) > 1 ? clone_mon(mon, 0, 0) : null;
                if (clone) {
                    clone.mhpmax = Math.trunc((mon.mhpmax | 0) / 2);
                    mon.mhpmax -= clone.mhpmax;
                    if (canspotmon(mon))
                        await pline(`${Monnam(mon)} multiplies!`);
                }
            } else if (mon.data === game.mons[PMNAMES.PM_IRON_GOLEM]) {
                if (canseemon(mon))
                    await pline(`${Monnam(mon)} rusts.`);
                mon.mhp -= d(1, 6);
                if ((mon.mhp | 0) <= 0)
                    await killed(mon);
            }
            break;
        }
        case ONAMES.POT_OIL:
            if (obj.lamplit) {
                const { explode_oil } = await import('./explode.js');
                await explode_oil(obj, tx, ty);
            }
            break;
        case ONAMES.POT_POLYMORPH: {
            const { bhitm } = await import('./zap.js');
            await bhitm(mon, obj);
            break;
        }
        case ONAMES.POT_ACID: {
            const { resist } = await import('./zap.js');
            if (!resists_acid(mon)
                && !resist(mon, OCLASSES.POTION_CLASS, 0, false)) {
                await pline(`${Monnam(mon)} ${
                    is_silent(mon.data) ? 'writhes' : 'shrieks'} in pain!`);
                if (!is_silent(mon.data))
                    wake_nearto(tx, ty, (mon.data.mlevel | 0) * 10);
                mon.mhp -= d(obj.cursed ? 2 : 1, obj.blessed ? 4 : 8);
                if ((mon.mhp | 0) <= 0)
                    await killed(mon);
            }
            break;
        }
        default:
            note_unported_potion(`potionhit:monster:otyp=${obj.otyp}`);
            break;
        }
        if ((mon.mhp | 0) > 0) {
            if (angermon)
                await wakeup(mon, true);
            else
                mon.msleeping = 0;
        }
    }

    const vaporRange = Math.trunc((1 + ACURR(A_DEX)) / 2);
    if ((distance === 0 || (distance < 3 && !rn2(vaporRange)))
        && (!breathless(game.youmonst.data) || haseyes(game.youmonst.data))) {
        await potionbreathe(obj);
    } else if (obj.dknown && cansee(tx, ty)) {
        await trycall(obj);
    }
    obfree(obj);
}

// src/potion.c:89 make_confused() — set or clear the confusion timeout.
// HConfusion lives in game.u.intrinsic as a plain counter; uprops.CONFUSION
// mirrors it so the many existing Confusion() readers keep working.
export async function make_confused(xtime, talk) {
    const old = game.u.intrinsic?.HConfusion || 0;

    if (Unaware())
        talk = false;

    if (!xtime && old) {
        if (talk)
            await You_feel(`less ${Hallucination() ? 'trippy'
                                                   : 'confused'} now.`);
    }
    if ((xtime && !old) || (!xtime && old))
        (game.disp ||= {}).botl = true;

    (game.u.intrinsic ||= {}).HConfusion = xtime;
    if (xtime)
        (game.u.uprops ||= {}).CONFUSION = 1;
    else if (game.u.uprops)
        delete game.u.uprops.CONFUSION;
}

// src/potion.c:107 make_stunned(), set or clear the stun timeout.
export async function make_stunned(xtime, talk) {
    const old = game.u.intrinsic?.HStun || 0;

    if (Unaware())
        talk = false;

    if (!xtime && old && talk) {
        await You_feel(`${Hallucination() ? 'less wobbly'
                                         : 'a bit steadier'} now.`);
    }
    if (xtime && !old && talk) {
        if (game.u.usteed)
            await You('wobble in the saddle.');
        else
            await You(`${stagger(game.youmonst.data, 'stagger')}...`);
    }
    if ((!xtime && old) || (xtime && !old))
        (game.disp ||= {}).botl = true;

    (game.u.intrinsic ||= {}).HStun = xtime;
    if (xtime)
        (game.u.uprops ||= {}).STUNNED = 1;
    else if (game.u.uprops)
        delete game.u.uprops.STUNNED;
}

// src/potion.c:443 make_deaf(), set or clear the timed half of HDeaf.
export async function make_deaf(xtime, talk) {
    const intr = (game.u.intrinsic ||= {});
    const old = intr.HDeaf | 0;
    const timeout = Math.min(TIMEOUT, Math.max(0, xtime | 0));

    if (Unaware())
        talk = false;

    intr.HDeaf = (old & ~TIMEOUT) | timeout;
    if (!intr.HDeaf)
        delete intr.HDeaf;

    if (!!timeout !== !!old) {
        (game.disp ||= {}).botl = true;
        if (talk)
            await You(old && !Deaf() ? 'can hear again.'
                                     : 'are unable to hear anything.');
    }
}

// src/potion.c:461 make_glib(), set or clear slippery fingers.
export function make_glib(xtime) {
    const u = game.u;
    const intr = (u.intrinsic ||= {});
    const old = !!(intr.HGlib || u.uprops?.GLIB);
    const timeout = Math.min(TIMEOUT, Math.max(0, xtime | 0));

    intr.HGlib = ((intr.HGlib | 0) & ~TIMEOUT) | timeout;
    if (!intr.HGlib)
        delete intr.HGlib;

    const now = !!(intr.HGlib || u.uprops?.GLIB);
    if (old !== now)
        (game.disp ||= {}).botl = true;
    if (u.uarmg)
        update_inventory();
}

// src/potion.c:369 make_hallucinated(). Both fields are kept because display
// predicates read uprops while timeout and status code read the intrinsic
// counter. A nonzero mask changes worn hallucination resistance without
// clearing the underlying timeout.
export async function make_hallucinated(xtime, talk, mask = 0) {
    if (Unaware())
        talk = false;

    const intr = (game.u.intrinsic ||= {});
    const props = (game.u.uprops ||= {});
    const old = intr.HHallucination | 0;
    let changed;

    if (mask) {
        changed = !!old;
        if (!xtime) {
            props.HALLUC_RES = (props.HALLUC_RES | 0) | mask;
        } else {
            const left = (props.HALLUC_RES | 0) & ~mask;
            if (left)
                props.HALLUC_RES = left;
            else
                delete props.HALLUC_RES;
        }
    } else {
        changed = !Halluc_resistance() && (!!old !== !!xtime);
        if (xtime) {
            intr.HHallucination = xtime;
            props.HALLUC = xtime;
        } else {
            delete intr.HHallucination;
            delete props.HALLUC;
        }
    }

    if (changed) {
        (game.disp ||= {}).botl = true;
        const { see_monsters, see_objects, see_traps, swallowed } =
            await import('./display.js');
        if (game.u.uswallow) {
            await swallowed(0);
        } else {
            see_monsters();
            see_objects();
            see_traps();
        }
        update_inventory();
        if (talk) {
            await pline(!xtime
                ? `Everything ${Blind() ? 'feels' : 'looks'} SO boring now.`
                : `Oh wow!  Everything ${Blind() ? 'feels' : 'looks'} so cosmic!`);
        }
    }
    return changed;
}

// src/potion.c:261 make_blinded(), common temporary-blindness path.
// u.ublind is this port's aggregate Blind flag; HBlinded retains the timer
// so nh_timeout() can restore sight on the right turn.
export async function make_blinded(xtime, talk) {
    const u = game.u;
    const intr = (u.intrinsic ||= {});
    const was_blind = !!u.ublind;
    const old_timeout = (intr.HBlinded | 0) & TIMEOUT;
    const blindfolded = !!u.ublindf
        && (u.ublindf.otyp === ONAMES.BLINDFOLD
            || u.ublindf.otyp === ONAMES.TOWEL);
    const blocked = !!u.blocked?.BLINDED;

    if (Unaware())
        talk = false;

    const new_timeout = Math.max(0, xtime | 0);
    const blind_now = !blocked && (!!new_timeout || blindfolded);

    if (was_blind && !blind_now && talk) {
        if (Hallucination())
            await pline('Far out!  Everything is all cosmic again!');
        else
            await You('can see again.');
    } else if (old_timeout && !new_timeout && talk && blocked) {
        await Your(`vision seems to brighten for a moment but is ${
            Hallucination() ? 'sadder' : 'normal'} now.`);
    }

    if (!was_blind && blind_now && talk) {
        if (Hallucination())
            await pline('Oh, bummer!  Everything is dark!  Help!');
        else
            await pline('A cloud of darkness falls upon you.');
    } else if (!old_timeout && new_timeout && talk && blocked) {
        await Your(`vision seems to dim for a moment but is ${
            Hallucination() ? 'happier' : 'normal'} now.`);
    }

    /* src/potion.c:308: capture the glyphs under an attached ball and chain
       before the blindness flag changes. */
    if (!was_blind && blind_now && u.uball && u.uchain) {
        const { set_bc } = await import('./cmd.js');
        set_bc(false);
    }

    /* C does not change HBlinded until after the transition message. If that
       message first blocks on an older --More-- prompt, the old Blind status
       remains visible throughout the wait. */
    intr.HBlinded = new_timeout;
    u.ublind = blind_now ? 1 : 0;

    if (was_blind !== blind_now) {
        (game.disp ||= {}).botl = true;
        game.vision_full_recalc = 1;
        vision_recalc(0);
        if (was_blind && !blind_now) {
            /* src/invent.c learn_unseen_invent(): carried objects picked up
               while blind become visibly encountered as soon as sight
               returns. */
            const role = game.urole?.mnum;
            const cleric = role === 'PM_CLERIC'
                || role === PMNAMES.PM_CLERIC;
            const archeologist = role === 'PM_ARCHEOLOGIST'
                || role === PMNAMES.PM_ARCHEOLOGIST;
            for (const obj of game.invent || []) {
                if (obj.dknown && (obj.bknown || !cleric)
                    && (obj.oclass !== OCLASSES.SCROLL_CLASS
                        || !archeologist))
                    continue;
                xname(obj);
            }
        }
    }
}

// include/hack.h itimeout_incr() — add to a timeout, clamping at TIMEOUT.
const itimeout_incr = (old, incr) => Math.max(0, (old || 0) + incr);

// include/obj.h bcsign()
const bcsign = (o) => (o.blessed ? 1 : 0) - (o.cursed ? 1 : 0);

// src/potion.c:1014 peffect_confusion()
async function peffect_confusion(otmp) {
    if (!game.u.uprops?.CONFUSION) {
        if (Hallucination()) {
            await pline('What a trippy feeling!');
            game.potion_unkn++;
        } else
            await pline('Huh, What?  Where am I?');
    } else
        game.potion_nothing++;
    await make_confused(itimeout_incr(game.u.intrinsic?.HConfusion,
                                      rn1(7, 16 - 8 * bcsign(otmp))),
                        false);
}

// src/potion.c:1073 peffect_blindness()
async function peffect_blindness(otmp) {
    const was_blind = Blind();
    if (was_blind)
        game.potion_nothing++;
    await make_blinded(
        itimeout_incr(game.u.intrinsic?.HBlinded,
                      rn1(200, 250 - 125 * bcsign(otmp))),
        !was_blind);
}

// src/attrib.c:294 poisontell()
async function poisontell(typ) {
    switch (typ) {
    case A_STR:
        await You_feel(`${ACURR(A_STR) === 125 ? 'innately ' : ''}weaker.`);
        break;
    case A_INT:
        await Your('brain is on fire.');
        break;
    case A_WIS:
        await Your('judgement is impaired.');
        break;
    case A_DEX:
        await Your("muscles won't obey you.");
        break;
    case A_CON:
        await You_feel(`${ACURR(A_CON) === 25 ? 'sick inside' : 'very sick'}.`);
        break;
    case A_CHA:
        await You('break out in hives.');
        break;
    }
}

// include/you.h:247 Role_if()
function Role_if(pm) {
    const m = game.urole?.mnum;
    return m === pm || m === PMNAMES[pm];
}

// src/potion.c:963 peffect_sickness()
async function peffect_sickness(otmp) {
    await pline('Yecch!  This stuff tastes like poison.');
    if (otmp.blessed) {
        await pline(`(But in fact it was mildly stale ${fruitname(true)}.)`);
        if (!Role_if('PM_HEALER'))
            await losehp(1, 'mildly contaminated potion', KILLED_BY_AN);
    } else {
        const poison_resistant = Poison_resistance();

        if (poison_resistant) {
            await pline(`(But in fact it was biologically contaminated ${
                fruitname(true)}.)`);
        }
        if (Role_if('PM_HEALER')) {
            await pline('Fortunately, you have been immunized.');
        } else {
            const typ = rn2(A_MAX);
            const contaminant = `${poison_resistant ? 'mildly ' : ''}${
                otmp.fromsink ? 'contaminated tap water'
                              : 'contaminated potion'}`;

            if (!game.u.uprops?.FIXED_ABIL) {
                await poisontell(typ);
                await adjattrib(typ, poison_resistant ? -1 : -rn1(4, 3), 1);
            }
            const damage = poison_resistant ? 1 + rn2(2)
                                            : rnd(10) + 5 * !!otmp.cursed;
            await losehp(damage, contaminant,
                         otmp.fromsink ? KILLED_BY : KILLED_BY_AN);
            exercise(A_CON, false);
        }
    }
    if (Hallucination()) {
        await You('are shocked back to your senses!');
        if (game.u.uprops)
            delete game.u.uprops.HALLUC;
        if (game.u.intrinsic)
            delete game.u.intrinsic.HHallucination;
        (game.disp ||= {}).botl = true;
        /* make_hallucinated() also redraws monsters, objects, and traps. */
        note_unported_potion('peffect_sickness:hallucination_redraw');
    }
}

// src/potion.c:1260 peffect_oil() — the one potion arm the sessions reach.
async function peffect_oil(otmp) {
    const good_for_you = false;

    if (otmp.lamplit) {
        /* burning oil: face burn + losehp d(x,4) + burn_away_slime */
        note_unported_potion('peffect_oil:lamplit');
    } else if (otmp.cursed) {
        await pline('This tastes like castor oil.');
    } else {
        await pline('That was smooth!');
    }
    exercise(A_WIS, good_for_you);
}

// src/potion.c:772 peffect_booze()
async function peffect_booze(otmp) {
    game.potion_unkn++;
    await pline(`Ooph!  This tastes like ${otmp.odiluted ? 'watered down ' : ''}`
                + `${Hallucination() ? 'dandelion wine' : 'liquid fire'}!`);
    if (!otmp.blessed) {
        await make_confused(
            itimeout_incr(game.u.intrinsic?.HConfusion,
                          d(2 + game.u.uhs, 8)),
            false);
    }
    if (!otmp.odiluted)
        await healup(1, 0, false, false);
    game.u.uhunger += 10 * (2 + bcsign(otmp));
    await newuhs(false);
    exercise(A_WIS, false);
    if (otmp.cursed) {
        await You('pass out.');
        game.multi = -rnd(15);
        game.nomovemsg = 'You awake with a headache.';
    }
}

// src/potion.c:1119 peffect_healing()
async function peffect_healing(otmp) {
    await You_feel('better.');
    await healup(8 + d(4 + 2 * bcsign(otmp), 4),
                 otmp.cursed ? 0 : 1,
                 !!otmp.blessed,
                 !otmp.cursed);
    exercise(A_CON, true);
}

// src/potion.c:1127 peffect_extra_healing().
async function peffect_extra_healing(otmp) {
    await You_feel('much better.');
    await healup(16 + d(4 + 2 * bcsign(otmp), 8),
                 otmp.blessed ? 5 : otmp.cursed ? 0 : 2,
                 !otmp.cursed,
                 true);
    if (Hallucination())
        note_unported_potion('peffect_extra_healing:make_hallucinated');
    exercise(A_CON, true);
    exercise(A_STR, true);
}

// src/potion.c:1224 peffect_gain_energy(). The BUC state changes the die
// count and sign; current power changes by three times the maximum increase.
async function peffect_gain_energy(otmp) {
    if (otmp.cursed)
        await You_feel('lackluster.');
    else
        await pline('Magical energies course through your body.');

    let amount = d(otmp.blessed ? 3 : otmp.cursed ? 1 : 2, 6);
    if (otmp.cursed)
        amount = -amount;
    game.u.uenmax += amount;
    if (game.u.uenmax > (game.u.uenpeak ?? 0))
        game.u.uenpeak = game.u.uenmax;
    else if (game.u.uenmax <= 0)
        game.u.uenmax = 0;
    game.u.uen += 3 * amount;
    if (game.u.uen > game.u.uenmax)
        game.u.uen = game.u.uenmax;
    else if (game.u.uen <= 0)
        game.u.uen = 0;
    (game.disp ||= {}).botl = true;
    exercise(A_WIS, true);
}

// src/potion.c:912 peffect_monster_detection(). Blessed monster detection
// persists long enough to reveal every live monster for the debug selector;
// ordinary and cursed doses use detect.c's one-shot map browser.
async function peffect_monster_detection(otmp) {
    if (otmp.blessed) {
        const props = (game.u.uprops ||= {});
        if (props.DETECT_MONSTERS)
            game.potion_nothing++;
        game.potion_unkn++;

        const current = Number(props.DETECT_MONSTERS) || 0;
        const duration = current >= 300 ? 1 : rn2(100) + 100;
        props.DETECT_MONSTERS = itimeout_incr(current, duration);

        const monsters = (game.level?.monsters || [])
            .filter(mon => mon.mhp > 0 && !(mon.isgd && !mon.mx));
        if (monsters.length)
            game.potion_unkn = 0;

        if (!game.u.uswallow && !Underwater()) {
            see_monsters();
            if (game.potion_unkn)
                await You_feel('lonely.');
            return 0;
        }
    }

    const { monster_detect } = await import('./detect.js');
    if (await monster_detect(otmp, 0))
        return 1;
    exercise(A_WIS, true);
    return 0;
}

// src/potion.c:717 peffect_water(). Blessed and cursed water operate on the
// hero's alignment, creature form, and lycanthropy; ordinary water only
// relieves a small amount of hunger.
async function peffect_water(otmp) {
    const u = game.u;
    if (!otmp.blessed && !otmp.cursed) {
        await pline(`This tastes like ${hliquid('water')}.`);
        u.uhunger += rnd(10);
        await newuhs(false);
        return;
    }

    game.potion_unkn++;
    const hatesBlessings = mon_hates_blessings(game.youmonst)
        || u.ualign?.type === A_CHAOTIC;
    const halfPhysical = (amount) => (u.uprops?.HALF_PHYS
                                      || u.intrinsic?.HHalf_physical_damage)
        ? Math.trunc((amount + 1) / 2) : amount;
    const { set_ulycn, you_unwere, you_were } = await import('./were.js');

    if (hatesBlessings) {
        if (otmp.blessed) {
            await pline(`This burns like ${hliquid('acid')}!`);
            exercise(A_CON, false);
            if (ismnum(u.ulycn)) {
                const name = game.mons[u.ulycn].pmnames[2]
                    || game.mons[u.ulycn].pmnames[0];
                await Your(`affinity to ${makeplural(name)} disappears!`);
                if (u.umonnum === u.ulycn)
                    await you_unwere(false);
                set_ulycn(NON_PM);
            }
            await losehp(halfPhysical(d(2, 6)), 'potion of holy water',
                         KILLED_BY_AN);
        } else {
            await You_feel('quite proud of yourself.');
            await healup(d(2, 6), 0, false, false);
            if (ismnum(u.ulycn) && !Upolyd(u))
                await you_were();
            exercise(A_CON, true);
        }
        return;
    }

    if (otmp.blessed) {
        await You_feel('full of awe.');
        await make_sick(0, null, true, SICK_ALL);
        exercise(A_WIS, true);
        exercise(A_CON, true);
        if (ismnum(u.ulycn))
            await you_unwere(true);
    } else {
        if (u.ualign?.type === A_LAWFUL) {
            await pline(`This burns like ${hliquid('acid')}!`);
            await losehp(halfPhysical(d(2, 6)), 'potion of unholy water',
                         KILLED_BY_AN);
        } else {
            await You_feel('full of dread.');
        }
        if (ismnum(u.ulycn) && !Upolyd(u))
            await you_were();
        exercise(A_CON, false);
    }
}

// src/potion.c:1333 peffects() — dispatch one quaffed potion.
// Returns -1 to let dopotion() finish (identify + useup), matching C.
async function peffects(otmp) {
    switch (otmp.otyp) {
    case ONAMES.POT_BOOZE:
        await peffect_booze(otmp);
        break;
    case ONAMES.POT_HEALING:
        await peffect_healing(otmp);
        break;
    case ONAMES.POT_EXTRA_HEALING:
        await peffect_extra_healing(otmp);
        break;
    case ONAMES.POT_GAIN_ENERGY:
        await peffect_gain_energy(otmp);
        break;
    case ONAMES.POT_CONFUSION:
        await peffect_confusion(otmp);
        break;
    case ONAMES.POT_SICKNESS:
        await peffect_sickness(otmp);
        break;
    case ONAMES.POT_BLINDNESS:
        await peffect_blindness(otmp);
        break;
    case ONAMES.POT_PARALYSIS:
        await peffect_paralysis(otmp);
        break;
    case ONAMES.POT_MONSTER_DETECTION:
        if (await peffect_monster_detection(otmp))
            return 1;
        break;
    case ONAMES.POT_FRUIT_JUICE:
    case ONAMES.POT_SEE_INVISIBLE:
        await peffect_see_invisible(otmp);
        break;
    case ONAMES.POT_OIL:
        await peffect_oil(otmp);
        break;
    case ONAMES.POT_WATER:
        await peffect_water(otmp);
        break;
    default:
        /* every other arm draws through its own subsystem */
        note_unported_potion(`peffects:otyp=${otmp.otyp}`);
        break;
    }
    return -1;
}

// src/potion.c:618 dopotion()
export async function dopotion(otmp) {
    otmp.in_use = true;
    game.potion_nothing = game.potion_unkn = 0;
    const retval = await peffects(otmp);
    if (retval >= 0)
        return retval ? ECMD_TIME : ECMD_OK;

    if (game.potion_nothing) {
        game.potion_unkn++;
        await You('have a peculiar feeling for a moment, then it passes.');
    }
    if (otmp.dknown && !game.objects[otmp.otyp].oc_name_known) {
        if (!game.potion_unkn) {
            makeknown(otmp.otyp);
            more_experienced(0, 10);
        } else {
            /* src/potion.c:1473 — offer to name the type we still cannot
               identify. */
            const { trycall } = await import('./do_name.js');
            await trycall(otmp);
        }
    }
    useup(otmp);
    return ECMD_TIME;
}

// src/potion.c:526 dodrink() — the 'q' command.
export async function dodrink(drink_ok) {
    /* Strangled needs the amulet of strangulation */

    /* src/potion.c:540 — the fountain/sink prompts come before getobj;
       'm'-prefixed quaff skips them. can_reach_floor(FALSE) is true for
       an ordinary walking hero. */
    const typ = game.level?.at(game.u.ux, game.u.uy)?.typ;
    if (!game.iflags?.menu_requested) {
        if (IS_FOUNTAIN(typ)) {
            const { tty_yn_function } = await import('./tty/topl.js');
            if ((await tty_yn_function('Drink from the fountain?', 'yn', 'n'))
                === 'y') {
                const { drinkfountain } = await import('./fountain.js');
                await drinkfountain();
                return ECMD_TIME;
            }
        }
        if (IS_SINK(typ)) {
            const { tty_yn_function } = await import('./tty/topl.js');
            if ((await tty_yn_function('Drink from the sink?', 'yn', 'n'))
                === 'y') {
                const { drinksink } = await import('./fountain.js');
                await drinksink();
                return ECMD_TIME;
            }
        }
    }

    const otmp = await getobj('drink', drink_ok, GETOBJ_NOFLAGS);
    if (!otmp)
        return ECMD_CANCEL;

    if (otmp.owornmask)
        note_unported_potion('dodrink:worn_potion');
    otmp.in_use = true;                 /* you've opened the stopper */

    /* src/potion.c:601 — milky/smoky bottles may hold an occupant; the
       rn2 fires only when the shuffled appearance matches */
    const descr = OBJ_DESCR(game.objects[otmp.otyp]);
    if (descr === 'milky'
        && !((game.mvitals?.[PMNAMES.PM_GHOST]?.mvflags ?? 0) & G_GONE)
        && !rn2(13 + 2 * (game.mvitals?.[PMNAMES.PM_GHOST]?.born ?? 0))) {
        note_unported_potion('dodrink:ghost_from_bottle');
        useup(otmp);
        return ECMD_TIME;
    } else if (descr === 'smoky'
        && !((game.mvitals?.[PMNAMES.PM_DJINNI]?.mvflags ?? 0) & G_GONE)
        && !rn2(13 + 2 * (game.mvitals?.[PMNAMES.PM_DJINNI]?.born ?? 0))) {
        note_unported_potion('dodrink:djinni_from_bottle');
        useup(otmp);
        return ECMD_TIME;
    }
    return dopotion(otmp);
}

// src/potion.c:840 peffect_see_invisible() — also the fruit-juice arm, which
// returns early after its hunger bump. The see-invisible effects proper are
// recorded.
async function peffect_see_invisible(otmp) {
    game.potion_unkn++;
    if (otmp.cursed)
        await pline('Yecch!  This tastes rotten.');
    else
        await pline(`This tastes like ${otmp.odiluted ? 'reconstituted ' : ''}${
            fruitname(true)}.`);
    if (otmp.otyp === ONAMES.POT_FRUIT_JUICE) {
        game.u.uhunger += (otmp.odiluted ? 5 : 10) * (2 + bcsign(otmp));
        await newuhs(false);
        return;
    }
    note_unported_potion('peffect_see_invisible:see_invisible');
}

// src/potion.c peffect_paralysis() — the hero freezes for rn1(10, 25) turns,
// longer when the potion is cursed and shorter when blessed.
//
// Free action avoids the timeout and its RNG draw. Levitation and riding
// change only the message and remain recorded until their surface variants
// are covered.
async function peffect_paralysis(otmp) {
    if (game.u.uprops?.FREE_ACTION) {
        await You('stiffen momentarily.');
        return;
    }
    if (game.u.uprops?.LEVITATION || game.u.usteed) {
        note_unported_potion('peffect_paralysis:suspended_or_steed');
    } else {
        await Your(`feet are frozen to the ${surface(game.u.ux, game.u.uy)}!`);
    }
    nomul(-(rn1(10, 25 - 12 * bcsign(otmp))));
    game.multi_reason = 'frozen by a potion';
    game.nomovemsg = 'You can move again.';
    exercise(A_DEX, false);
}

// src/potion.c strange_feeling() — the "nothing obvious happened" path shared
// by scrolls and potions whose effect could not apply.
//
// C's `!txt` arm also covers flags.beginner. The dknown test gates trycall(),
// which is what lets the hero name an object that just failed to do anything.
export async function strange_feeling(obj, txt) {
    if (game.flags?.beginner || !txt)
        await You(`have a ${game.u?.intrinsic?.HHallucination
                            || game.u?.uprops?.HALLUC ? 'normal' : 'strange'}`
                  + ' feeling for a moment, then it passes.');
    else
        await pline(txt);

    if (!obj)                   /* e.g., crystal ball finds no traps */
        return;

    if (obj.dknown)
        await trycall(obj);

    useup(obj);
}

// src/do_wear.c:3342 inaccessible_equipment(), selection-only arm. Dipping
// cannot reach a suit under a cloak, a shirt under outer armor, or a ring
// under gloves.
function inaccessible_equipment(obj) {
    if (!obj?.owornmask)
        return false;
    if (obj === game.u.uarm && game.u.uarmc)
        return true;
    if (obj === game.u.uarmu && (game.u.uarm || game.u.uarmc))
        return true;
    if ((obj === game.u.uleft || obj === game.u.uright) && game.u.uarmg)
        return true;
    return false;
}

// src/potion.c:2214 dip_ok(), candidates for dipping: everything except
// gold, inaccessible worn equipment, and the hands pseudo-object.
function dip_ok(obj) {
    /* the numeric returns were swapped against invent.js's constants:
       1 is DOWNPLAY there (kept out of the prompt's letter range), so
       every candidate vanished from "What do you want to dip? [...]" */
    if (!obj)
        return GETOBJ_DOWNPLAY;
    /* dipping gold isn't currently implemented */
    if (obj.oclass === OCLASSES.COIN_CLASS)
        return GETOBJ_EXCLUDE;
    if (inaccessible_equipment(obj))
        return GETOBJ_EXCLUDE_INACCESS;
    return GETOBJ_SUGGEST;
}

// src/potion.c:2120 mixtype() -- deterministic alchemy recipes plus the two
// recipe-specific random choices.
function mixtype(o1, o2) {
    let o1typ = o1.otyp, o2typ = o2.otyp;
    if (o1.oclass === OCLASSES.POTION_CLASS
        && [ONAMES.POT_GAIN_LEVEL, ONAMES.POT_GAIN_ENERGY,
            ONAMES.POT_HEALING, ONAMES.POT_EXTRA_HEALING,
            ONAMES.POT_FULL_HEALING, ONAMES.POT_ENLIGHTENMENT,
            ONAMES.POT_FRUIT_JUICE].includes(o2typ)) {
        [o1typ, o2typ] = [o2typ, o1typ];
    }

    switch (o1typ) {
    case ONAMES.POT_HEALING:
        if (o2typ === ONAMES.POT_SPEED)
            return ONAMES.POT_EXTRA_HEALING;
        // Falls through to the gain-level and gain-energy recipes.
    case ONAMES.POT_EXTRA_HEALING:
    case ONAMES.POT_FULL_HEALING:
        if (o2typ === ONAMES.POT_GAIN_LEVEL
            || o2typ === ONAMES.POT_GAIN_ENERGY) {
            return o1typ === ONAMES.POT_HEALING
                ? ONAMES.POT_EXTRA_HEALING
                : o1typ === ONAMES.POT_EXTRA_HEALING
                  ? ONAMES.POT_FULL_HEALING : ONAMES.POT_GAIN_ABILITY;
        }
        // Falls through to the unicorn-horn recipes.
    case ONAMES.UNICORN_HORN:
        if (o2typ === ONAMES.POT_SICKNESS)
            return ONAMES.POT_FRUIT_JUICE;
        if ([ONAMES.POT_HALLUCINATION, ONAMES.POT_BLINDNESS,
             ONAMES.POT_CONFUSION].includes(o2typ))
            return ONAMES.POT_WATER;
        break;
    case ONAMES.AMETHYST:
        if (o2typ === ONAMES.POT_BOOZE)
            return ONAMES.POT_FRUIT_JUICE;
        break;
    case ONAMES.POT_GAIN_LEVEL:
    case ONAMES.POT_GAIN_ENERGY:
        switch (o2typ) {
        case ONAMES.POT_CONFUSION:
            return rn2(3) ? ONAMES.POT_BOOZE : ONAMES.POT_ENLIGHTENMENT;
        case ONAMES.POT_HEALING:       return ONAMES.POT_EXTRA_HEALING;
        case ONAMES.POT_EXTRA_HEALING: return ONAMES.POT_FULL_HEALING;
        case ONAMES.POT_FULL_HEALING:  return ONAMES.POT_GAIN_ABILITY;
        case ONAMES.POT_FRUIT_JUICE:   return ONAMES.POT_SEE_INVISIBLE;
        case ONAMES.POT_BOOZE:         return ONAMES.POT_HALLUCINATION;
        }
        break;
    case ONAMES.POT_FRUIT_JUICE:
        switch (o2typ) {
        case ONAMES.POT_SICKNESS:      return ONAMES.POT_SICKNESS;
        case ONAMES.POT_ENLIGHTENMENT:
        case ONAMES.POT_SPEED:         return ONAMES.POT_BOOZE;
        case ONAMES.POT_GAIN_LEVEL:
        case ONAMES.POT_GAIN_ENERGY:   return ONAMES.POT_SEE_INVISIBLE;
        }
        break;
    case ONAMES.POT_ENLIGHTENMENT:
        if (o2typ === ONAMES.POT_LEVITATION && rn2(3))
            return ONAMES.POT_GAIN_LEVEL;
        if (o2typ === ONAMES.POT_FRUIT_JUICE)
            return ONAMES.POT_BOOZE;
        if (o2typ === ONAMES.POT_BOOZE)
            return ONAMES.POT_CONFUSION;
        break;
    }
    return ONAMES.STRANGE_OBJECT;
}

// src/potion.c:2417 dip_potion_explosion().
async function dip_potion_explosion(obj, damage) {
    const smock = game.u.uarmc?.otyp === ONAMES.ALCHEMY_SMOCK;
    if (!(obj.cursed || obj.otyp === ONAMES.POT_ACID
          || (obj.otyp === ONAMES.POT_OIL && obj.lamplit)
          || !rn2(smock ? 30 : 10)))
        return false;

    obj.in_use = true;
    await pline(`${game.u.uprops?.DEAF ? '' : 'BOOM!  '}They explode!`);
    wake_nearto(game.u.ux, game.u.uy, (BOLT_LIM + 1) * (BOLT_LIM + 1));
    exercise(A_STR, false);
    if (!breathless(game.youmonst.data) || haseyes(game.youmonst.data))
        await potionbreathe(obj);
    useupall(obj);
    await losehp(damage, 'alchemic blast', KILLED_BY_AN);
    return true;
}

// src/potion.c:2442 potion_dip(), potion-into-potion alchemy. Other dipping
// targets remain with their existing specialized paths.
async function potion_dip(obj, potion) {
    if (potion === obj && potion.quan === 1) {
        await pline('That is a potion bottle, not a Klein bottle!');
        return ECMD_OK;
    }

    obj.pickup_prev = 0;
    potion.in_use = true;
    if (obj.oclass !== OCLASSES.POTION_CLASS || obj.otyp === potion.otyp) {
        potion.in_use = false;
        note_unported_potion('potion_dip:non_alchemy');
        return ECMD_TIME;
    }

    let amount = obj.quan;
    const mixture = mixtype(obj, potion);
    const magic = mixture !== ONAMES.STRANGE_OBJECT
        ? !!game.objects[mixture].oc_magic
        : !!(game.objects[obj.otyp].oc_magic
             || game.objects[potion.otyp].oc_magic);
    let subject = 'The';

    if (amount > (obj.odiluted ? 2 : magic ? 3 : 7)) {
        if (obj.odiluted) {
            amount = 2;
        } else if (magic) {
            amount = rnd(Math.min(amount, 8) - 2) + 2;
        } else {
            amount = rnd(amount - 6) + 6;
        }
        if (amount < obj.quan) {
            const remainder = obj;
            obj = splitobj(remainder, amount);
            const at = (game.invent || []).indexOf(remainder);
            if (at >= 0)
                game.invent.splice(at + 1, 0, obj);
            subject = `${obj.quan} of the`;
        }
    }

    await pline(`${subject} ${simpleonames(obj)} ${otense(obj, 'mix')} with ${
        potion.quan > 1 ? 'one of ' : ''}${thesimpleoname(potion)}...`);
    useup(potion);
    if (await dip_potion_explosion(obj, amount + rnd(9)))
        return ECMD_TIME;

    obj.blessed = obj.cursed = obj.bknown = 0;
    if (game.u.ublind || Hallucination())
        obj.dknown = 0;

    if (mixture !== ONAMES.STRANGE_OBJECT) {
        obj.otyp = mixture;
    } else {
        switch (obj.odiluted ? 1 : rnd(8)) {
        case 1:
            obj.otyp = ONAMES.POT_WATER;
            break;
        case 2:
        case 3:
            obj.otyp = ONAMES.POT_SICKNESS;
            break;
        case 4: {
            const random = mkobj(OCLASSES.POTION_CLASS, false);
            obj.otyp = random.otyp;
            break;
        }
        default:
            useupall(obj);
            await pline_The(`mixture ${game.u.ublind
                ? '' : 'glows brightly and '}evaporates.`);
            return ECMD_TIME;
        }
    }
    obj.odiluted = obj.otyp !== ONAMES.POT_WATER;

    if (obj.otyp === ONAMES.POT_WATER && !Hallucination()) {
        await pline_The(`mixture bubbles${game.u.ublind
            ? '' : ', then clears'}.`);
    } else if (!game.u.ublind) {
        await pline_The(`mixture looks ${hcolor(OBJ_DESCR(
            game.objects[obj.otyp]))}.`);
    }

    const drop_arg = doname(obj);
    freeinv(obj);
    await hold_another_object(obj, 'You drop %s!', drop_arg, null);
    return ECMD_TIME;
}

// src/potion.c:2267 dodip() — the #dip command. The fountain/sink arms
// prompt first; potion-into-potion mixing needs the interdip machinery and
// records.
export async function dodip() {
    const here = game.level.at(game.u.ux, game.u.uy).typ;
    const at_pool = is_pool(game.u.ux, game.u.uy);
    const at_fountain = IS_FOUNTAIN(here);
    const at_sink = IS_SINK(here);

    const obj = await getobj('dip', dip_ok, GETOBJ_PROMPT);
    if (!obj)
        return ECMD_CANCEL;

    /* inaccessible_equipment — cursed worn gear check, records via getobj */

    const shortestname = (obj.quan > 1) ? 'them' : 'it';
    const obuf = short_oname(obj, doname, thesimpleoname, 49);

    if (at_fountain || at_pool || at_sink) {
        /* can_reach_floor is true for an unimpaired hero */
        if (at_fountain) {
            /* src/potion.c:2301: reserve room for the longest possible
               second-stage dip prompt, then shorten the object name by the
               same sequence C uses. */
            const q = `Dip ${game.flags?.verbose === false ? shortestname
                             : obuf} into the fountain?`;
            const ans = await tty_yn_function(q, 'yn', 'n');
            if (ans === 'y') {
                obj.pickup_prev = 0;
                const { dipfountain } = await import('./fountain.js');
                await dipfountain(obj);
                return ECMD_TIME;
            }
        } else if (at_sink) {
            note_unported_potion('dodip:sink');
        } else if (at_pool) {
            note_unported_potion('dodip:pool');
        }
    }

    /* "What do you want to dip <obj> into?" — the potion-mixing arm */
    const potion = await getobj(
        `dip ${game.flags?.verbose === false ? shortestname : obuf} into`,
        candidate => candidate?.oclass === OCLASSES.POTION_CLASS
            ? GETOBJ_SUGGEST : GETOBJ_EXCLUDE,
        GETOBJ_NOFLAGS);
    if (!potion)
        return ECMD_CANCEL;
    return await potion_dip(obj, potion);
}
