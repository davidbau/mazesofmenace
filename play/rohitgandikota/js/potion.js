// potion.js — potion effects.
// C ref: src/potion.c
//
// Only healup() so far, reached by the healing spells' zapyourself route.

import { fruitname } from './objnam.js';
import { trycall } from './do_name.js';
import { newuhs } from './eat.js';
import { game } from './gstate.js';
import { pline } from './display.js';
import { You, You_feel, pline_The } from './pline.js';
import { exercise, adjattrib, A_MAX, ACURR } from './attrib.js';
import { A_STR, A_INT, A_DEX, A_CON, A_CHA,
         KILLED_BY_AN, KILLED_BY, POTHIT_OTHER_THROW, HEAD } from './const.js';
import { Your } from './pline.js';
import { nomul, losehp } from './hack.js';
import { surface } from './dungeon.js';
import { A_WIS, ECMD_CANCEL, IS_FOUNTAIN, IS_SINK } from './const.js';
import { Unaware, Hallucination, Poison_resistance,
         Sleep_resistance } from './youprop.js';
import { rn2, rn1, rnd, d } from './rng.js';
import { ONAMES, MATERIALS } from './objects_data.js';
import { PMNAMES, MFLAGS } from './monst_data.js';
import { OBJ_DESCR } from './objnam.js';
import { makeknown } from './o_init.js';
import { more_experienced } from './exper.js';
import { getobj, useup, ECMD_TIME, ECMD_OK,
         GETOBJ_PROMPT } from './invent.js';
import { is_pool } from './mon.js';
import { OCLASSES } from './objects_data.js';
import { tty_yn_function } from './tty/topl.js';
import { GETOBJ_NOFLAGS } from './const.js';
import { GETOBJ_SUGGEST, GETOBJ_DOWNPLAY, GETOBJ_EXCLUDE } from './invent.js';
import { doname, short_oname, thesimpleoname, Tobjnam } from './objnam.js';
import { body_part } from './polyself.js';
import { breathless, haseyes } from './mondata.js';
import { cansee } from './vision.js';
const G_GONE = MFLAGS.G_GENOD | MFLAGS.G_EXTINCT;

function note_unported_potion(what) {
    (game.unported ||= new Set()).add(what);
}

// src/potion.c:1428 healup()
export function healup(nhp, nxtra, curesick, cureblind) {
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
        /* make_blinded(0)/make_deaf(0) cure; visible only while afflicted */
        if (u.ucreamed || u.ublind || u.uprops?.DEAF)
            note_unported_potion('healup:cureblind');
        u.ucreamed = 0;
    }
    if (curesick) {
        if (u.uprops?.VOMITING || u.uprops?.SICK)
            note_unported_potion('healup:curesick');
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
    const already_in_use = !!obj.in_use;
    obj.in_use = true;

    const wet_towel = game.u.ublindf?.otyp === ONAMES.TOWEL
                       && (game.u.ublindf.spe | 0) > 0;
    if (wet_towel) {
        await pline('Some vapor passes harmlessly around you.');
    } else {
        switch (obj.otyp) {
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
        case ONAMES.POT_BLINDNESS:
            if (!game.u.ublind && !Unaware()) {
                kn++;
                await pline('It suddenly gets dark.');
            }
            game.u.ublind = Math.max(game.u.ublind | 0, rnd(5));
            break;
        case ONAMES.POT_ACID:
        case ONAMES.POT_POLYMORPH:
            exercise(A_CON, false);
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

// src/potion.c:1618 potionhit(), hero arm. The bottle name and impact damage
// are drawn before the evaporation and vapor effects.
export async function potionhit(mon, obj, how) {
    const botlnam = bottlename();
    const isyou = mon === game.youmonst;

    if (!isyou) {
        note_unported_potion('potionhit:monster');
        return;
    }

    const tx = game.u.ux, ty = game.u.uy;
    await pline_The(`${botlnam} crashes on your ${body_part(HEAD)} and breaks into shards.`);
    let impact = rnd(2);
    if (game.u.uprops?.HALF_PHDAM)
        impact = Math.trunc((impact + 1) / 2);
    await losehp(impact,
                 how === POTHIT_OTHER_THROW ? 'propelled potion'
                                            : 'thrown potion',
                 KILLED_BY_AN);

    if (obj.otyp !== ONAMES.POT_OIL && cansee(tx, ty))
        await pline(`${Tobjnam(obj, 'evaporate')}.`);

    if (obj.otyp === ONAMES.POT_ACID && !game.u.uprops?.ACID_RES) {
        await pline(`This burns${obj.blessed ? ' a little'
                              : obj.cursed ? ' a lot' : ''}!`);
        let damage = d(obj.cursed ? 2 : 1, obj.blessed ? 4 : 8);
        if (game.u.uprops?.HALF_PHDAM)
            damage = Math.trunc((damage + 1) / 2);
        await losehp(damage, 'potion of acid', KILLED_BY_AN);
    }

    if (!breathless(game.youmonst.data) || haseyes(game.youmonst.data))
        await potionbreathe(obj);
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
        healup(1, 0, false, false);
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
    healup(8 + d(4 + 2 * bcsign(otmp), 4),
           otmp.cursed ? 0 : 1,
           !!otmp.blessed,
           !otmp.cursed);
    exercise(A_CON, true);
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
    case ONAMES.POT_CONFUSION:
        await peffect_confusion(otmp);
        break;
    case ONAMES.POT_SICKNESS:
        await peffect_sickness(otmp);
        break;
    case ONAMES.POT_PARALYSIS:
        await peffect_paralysis(otmp);
        break;
    case ONAMES.POT_FRUIT_JUICE:
    case ONAMES.POT_SEE_INVISIBLE:
        await peffect_see_invisible(otmp);
        break;
    case ONAMES.POT_OIL:
        await peffect_oil(otmp);
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
// Free_action, Levitation and riding change only the message; none is
// reachable yet, so those arms are recorded.
async function peffect_paralysis(otmp) {
    if (game.u.uprops?.FREE_ACTION?.intrinsic) {
        note_unported_potion('peffect_paralysis:free_action');
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

// src/potion.c:2254 dip_ok() — candidates for dipping: everything except
// gold (and the hands pseudo-object, which the port does not offer yet).
function dip_ok(obj) {
    /* the numeric returns were swapped against invent.js's constants:
       1 is DOWNPLAY there (kept out of the prompt's letter range), so
       every candidate vanished from "What do you want to dip? [...]" */
    if (!obj)
        return GETOBJ_DOWNPLAY;
    /* dipping gold isn't currently implemented */
    if (obj.oclass === OCLASSES.COIN_CLASS)
        return GETOBJ_EXCLUDE;
    return GETOBJ_SUGGEST;
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

    if (at_fountain || at_pool || at_sink) {
        /* can_reach_floor is true for an unimpaired hero */
        if (at_fountain) {
            /* src/potion.c:2301: reserve room for the longest possible
               second-stage dip prompt, then shorten the object name by the
               same sequence C uses. */
            const obuf = short_oname(obj, doname, thesimpleoname, 49);
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
    note_unported_potion('dodip:interdip');
    return ECMD_OK;
}
