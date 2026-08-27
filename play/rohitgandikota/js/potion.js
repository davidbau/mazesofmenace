// potion.js — potion effects.
// C ref: src/potion.c
//
// Only healup() so far, reached by the healing spells' zapyourself route.

import { fruitname, xname } from './objnam.js';
import { trycall } from './do_name.js';
import { newuhs } from './eat.js';
import { game } from './gstate.js';
import { pline } from './display.js';
import { You, You_feel, pline_The } from './pline.js';
import { exercise, adjattrib, A_MAX, ACURR } from './attrib.js';
import { A_STR, A_INT, A_DEX, A_CON, A_CHA,
         BOLT_LIM, KILLED_BY_AN, KILLED_BY, POTHIT_OTHER_THROW,
         HEAD } from './const.js';
import { Your } from './pline.js';
import { nomul, losehp } from './hack.js';
import { surface } from './dungeon.js';
import { A_WIS, ECMD_CANCEL, IS_FOUNTAIN, IS_SINK } from './const.js';
import { Unaware, Hallucination, Halluc_resistance, Blind,
         Poison_resistance, Sleep_resistance } from './youprop.js';
import { rn2, rn1, rnd, d } from './rng.js';
import { ONAMES, MATERIALS } from './objects_data.js';
import { PMNAMES, MFLAGS } from './monst_data.js';
import { OBJ_DESCR } from './objnam.js';
import { makeknown, observe_object } from './o_init.js';
import { more_experienced } from './exper.js';
import { freeinv, getobj, hold_another_object, useup, useupall,
         update_inventory, ECMD_TIME, ECMD_OK, GETOBJ_PROMPT } from './invent.js';
import { is_pool, wake_nearto } from './mon.js';
import { OCLASSES } from './objects_data.js';
import { tty_yn_function } from './tty/topl.js';
import { GETOBJ_NOFLAGS } from './const.js';
import { GETOBJ_SUGGEST, GETOBJ_DOWNPLAY, GETOBJ_EXCLUDE } from './invent.js';
import { GETOBJ_EXCLUDE_INACCESS } from './invent.js';
import { doname, otense, short_oname, simpleonames, thesimpleoname,
         Tobjnam } from './objnam.js';
import { body_part } from './polyself.js';
import { breathless, haseyes, stagger } from './mondata.js';
import { cansee, vision_recalc } from './vision.js';
import { hcolor } from './do_name.js';
import { mkobj, splitobj } from './mkobj.js';
const G_GONE = MFLAGS.G_GENOD | MFLAGS.G_EXTINCT;

function note_unported_potion(what) {
    (game.unported ||= new Set()).add(what);
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
        u.usick_type &= ~type;
        if (u.usick_type) {
            if (talk)
                await You_feel('somewhat better.');
            props.SICK = old * 2;
        } else {
            if (talk)
                await You_feel('cured.  What a relief!');
            props.SICK = 0;
        }
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
        if (u.uprops?.DEAF)
            note_unported_potion('healup:make_deaf');
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
    let cureblind = false;
    const already_in_use = !!obj.in_use;
    obj.in_use = true;

    const wet_towel = game.u.ublindf?.otyp === ONAMES.TOWEL
                       && (game.u.ublindf.spe | 0) > 0;
    if (wet_towel) {
        await pline('Some vapor passes harmlessly around you.');
    } else {
        switch (obj.otyp) {
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
                if (game.u.uprops?.DEAF)
                    note_unported_potion('potionbreathe:make_deaf');
            }
            exercise(A_CON, true);
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

// src/potion.c:369 make_hallucinated(), timed hallucination without an
// equipment-resistance mask. Both fields are kept because display predicates
// read uprops while timeout and status code read the intrinsic counter.
export async function make_hallucinated(xtime, talk, mask = 0) {
    if (Unaware())
        talk = false;
    if (mask) {
        note_unported_potion('make_hallucinated:resistance_mask');
        return false;
    }

    const intr = (game.u.intrinsic ||= {});
    const props = (game.u.uprops ||= {});
    const old = intr.HHallucination | 0;
    const changed = !Halluc_resistance() && (!!old !== !!xtime);
    if (xtime) {
        intr.HHallucination = xtime;
        props.HALLUC = xtime;
    } else {
        delete intr.HHallucination;
        delete props.HALLUC;
    }

    if (changed) {
        (game.disp ||= {}).botl = true;
        const { see_monsters, see_objects, see_traps } =
            await import('./display.js');
        see_monsters();
        see_objects();
        see_traps();
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
    const blindfolded = !!u.ublindf
        && (u.ublindf.otyp === ONAMES.BLINDFOLD
            || u.ublindf.otyp === ONAMES.TOWEL);

    if (Unaware())
        talk = false;

    const new_timeout = Math.max(0, xtime | 0);
    const blind_now = !!new_timeout || blindfolded;

    if (was_blind && !blind_now && talk) {
        if (Hallucination())
            await pline('Far out!  Everything is all cosmic again!');
        else
            await You('can see again.');
    } else if (!was_blind && blind_now && talk) {
        if (Hallucination())
            await pline('Oh, bummer!  Everything is dark!  Help!');
        else
            await pline('A cloud of darkness falls upon you.');
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
