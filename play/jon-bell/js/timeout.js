// timeout.js — object timers and status timeouts from
// nethack-c-v5/upstream/src/timeout.c.

import { RANGE_GLOBAL, NHF_BONESFILE, TIMER_LEVEL, TIMER_OBJECT, TIMER_NONE,
         TIMER_GLOBAL, TIMER_MONSTER, NUM_TIMER_KINDS, NUM_TIME_FUNCS, HATCH_EGG,
         OBJ_INVENT, OBJ_MIGRATING, OBJ_FLOOR, OBJ_BURIED, OBJ_CONTAINED,
         OBJ_MINVENT, BURN_OBJECT, LS_OBJECT, SHRINK_GLOB, CONTAINED_TOO,
         BURIED_TOO, NO_MINVENT, MM_NOMSG, G_EXTINCT, G_GENOD,
         MV_KNOWS_EGG, FIG_TRANSFORM, ROT_CORPSE, REVIVE_MON, NON_PM } from './const.js';
import { rot_organic, rot_corpse } from './dig.js';
import { game } from './gstate.js';
import { eatfood } from './eat.js';
import { COLNO, ROWNO, CLOUD, MELT_ICE_AWAY, DRAWBRIDGE_DOWN, DB_ICE, DB_UNDER } from './const.js';
import { rn1 } from './rng.js';
import { rn2, d } from './rnd.js';
import { pline, You_hear, You_feel, urgent_pline } from './pline.js';
import { impossible } from './pline.js';
import { buzz, Monnam } from './mcastu.js';
import { is_rider_pm } from './mklev.js';
import { revive_corpse } from './do.js';
import { rider_revival_time, set_corpsenm, dealloc_obj } from './mkobj.js';
import { makemon } from './makemon.js';
import { ing_suffix } from './hacklib.js';
import { hideunder, zombie_form, dealloc_mextra, maybe_unhide_at } from './mon.js';
import { permonstTemplate, container_weight, emits_light } from './makemon.js';
import { name_to_mon } from './mondata.js';
import { enexto_out, rloc, RLOC_NOMSG } from './teleport.js';
import { tamedog } from './dog.js';
import { make_familiar } from './dog.js';
import { cansee } from './vision.js';
import { m_monnam, a_monnam } from './do_name.js';
import { locomotion, big_to_little, little_to_big } from './mondata.js';
import { makeplural, an, xname, the, simpleonames, doname } from './objnam.js';
import { newsym, canseemon, Deaf, impossible_sync } from './display.js';
import { You_see } from './pline.js';
import { obj_extract_self_general, verbalize } from './cmd.js';
import { figurine_location_checks } from './apply.js';
import { useup, useupall } from './invent.js';
import { set_msg_xy } from './pline.js';
import { Yname2 } from './objnam.js';
import { obfree } from './dokick.js';
import { is_ice } from './engrave.js';
import { m_at } from './uhitm.js';
import { setmnotwielded } from './weapon.js';
import { is_pool } from './look.js';
import { s_suffix, dist2 } from './hacklib.js';
import { isok } from './const.js';
import { cry_sound } from './sounds.js';
import { Blind } from './vision.js';
import { Norep } from './pline.js';
import { hcolor } from './mhitm.js';
import { melt_ice_zap } from './zap.js';
import { find_ac } from './do_wear.js';
import { remove_worn_item } from './steal.js';
import { weight } from './weight.js';
import { encumber_msg } from './pickup.js';
import { near_capacity } from './hack.js';
import { Shk_Your } from './shk.js';
import { polymon } from './polyself.js';
import { done, dealloc_killer } from './end.js';
import { PM_GREEN_SLIME } from './pm.generated.js';
import { LS_MONSTER, I_SPECIAL, TIMEOUT, LOW_PM, TURNED_SLIME, GENOCIDED, KILLED_BY,
         NO_KILLER_PREFIX, PLNMSG_OK_DONT_DIE } from './const.js';
import { OC_WEIGHT } from './oc_weight.generated.js';
import { new_light_source, del_light_source, arti_light_radius, candle_light_range } from './light.js';
import { artifact_light } from './artifact.js';
import { monst_to_any } from './hack.js';
import { get_obj_location } from './zap.js';
import { update_inventory } from './mhitm.js';
import { stop_occupation } from './allmain.js';
import { nomul } from './hack.js';
import { rnd } from './rnd.js';
import {
    INVULNERABLE, STONED, SLIMED, STRANGLED, SICK, STUNNED, CONFUSION, HALLUC,
    BLINDED, DEAF, VOMITING, GLIB, WOUNDED_LEGS, SLEEPY, TELEPORT, POLYMORPH,
    LEVITATION, FAST, CLAIRVOYANT, DETECT_MONSTERS, SEE_INVIS, INVIS, ACID_RES,
    STONE_RES, DISPLACED, PASSES_WALLS, MAGICAL_BREATHING, WWALKING, FIRE_RES,
    COLD_RES, SLEEP_RES, DISINT_RES, SHOCK_RES, POISON_RES, DRAIN_RES, SICK_RES,
    ANTIMAGIC, HALLUC_RES, BLND_RES, FUMBLING, HUNGER, TELEPAT, WARNING,
    WARN_OF_MON, WARN_UNDEAD, SEARCHING, INFRAVISION, ADORNED, STEALTH,
    AGGRAVATE_MONSTER, CONFLICT, JUMPING, TELEPORT_CONTROL, FLYING, SWIMMING,
    SLOW_DIGESTION, HALF_SPDAM, HALF_PHDAM, REGENERATION, ENERGY_REGENERATION,
    PROTECTION, PROT_FROM_SHAPE_CHANGERS, POLYMORPH_CONTROL, UNCHANGING,
    REFLECTING, FREE_ACTION, FIXED_ABIL, LIFESAVED,
} from './const.js';

/* C ref: obj.h:315 #define MAX_EGG_HATCH_TIME 200 — longest an egg can remain
 * unhatched.  Load-bearing: it is both bounds of attach_egg_hatch_timeout()'s
 * rnd() loop below, so the exact value fixes the RNG argument sequence. */
const MAX_EGG_HATCH_TIME = 200;
const G_UNIQ = 0x1000;
const S_DRAGON = 30;

/* C timeout.c:670-671 — properties without a switch arm still count down
 * at their position in u.uprops, before later expiry handlers inspect them.
 * allmain's split driver supplies each consecutive group in index order. */
export function nh_timeout_silent_properties(...properties) {
    for (const which of properties) {
        const prop = game.u.uprops[which];
        if ((prop?.intrinsic | 0) & TIMEOUT)
            --prop.intrinsic;
    }
}

/* C timeout.c:665-668 — this precedes the property countdown, even when
 * spell protection has no running timer and even if the steed is gone. */
export async function nh_timeout_gallop() {
    const u = game.u;
    if (u.ugallop && --u.ugallop === 0 && u.usteed)
        await pline(`${Monnam(u.usteed)} stops galloping.`);
}

/* C timeout.c:715-723 — sickness attributed to a proper-named or unique
 * monster uses "killed by [the] X", rather than "killed by an X". */
export function nh_timeout_sickness_killer() {
    const killer = game.svk.killer;
    const { mntmp } = name_to_mon(killer.name, null);
    if (mntmp >= LOW_PM) {
        const ptr = permonstTemplate(mntmp);
        if (ptr.mflags2 & 0x00080000 /* M2_PNAME, monflag.h */) {
            killer.format = KILLED_BY;
        } else if (ptr.geno & G_UNIQ) {
            killer.name = the(killer.name);
            killer.format = KILLED_BY;
        }
    }
}

/* C timeout.c:574 — preserve the fatal condition through end disclosure,
 * then remove the marker if done() returns because the hero was life-saved. */
export async function done_timeout(how, which) {
    const prop = game.u.uprops[which];
    prop.intrinsic |= I_SPECIAL;
    await done(how);
    prop.intrinsic &= ~I_SPECIAL;
    (game.disp ||= {}).botl = true;
}

/* C timeout.c:456-516 — the SLIMED property has already counted down to 0.
 * Polymorph even into a genocided slime before the first death; after a
 * life-save, genocide is a second, separate death. */
export async function slimed_to_death(kptr) {
    const g = game;
    if (g.u.umonnum !== g.u.umonster && g.youmonst.data.pmidx === PM_GREEN_SLIME) {
        dealloc_killer(kptr);
        return;
    }
    const killer = (g.svk ||= {}).killer ||= { id: 0, format: 0, name: '', next: null };
    killer.format = kptr?.name ? kptr.format : NO_KILLER_PREFIX;
    killer.name = kptr?.name || 'turned into green slime';
    dealloc_killer(kptr);
    if (emits_light(g.youmonst.data))
        del_light_source(LS_MONSTER, monst_to_any(g.youmonst));
    const vitals = (g.mvitals ||= [])[PM_GREEN_SLIME] ||= { mvflags: 0 };
    const save_mvflags = vitals.mvflags | 0;
    vitals.mvflags = save_mvflags & ~G_GENOD;
    await polymon(PM_GREEN_SLIME);
    vitals.mvflags = save_mvflags;
    await done_timeout(TURNED_SLIME, SLIMED);
    if (vitals.mvflags & G_GENOD) {
        g.svk.killer.format = KILLED_BY;
        g.svk.killer.name = 'slimicide';
        await urgent_pline(g.iflags?.last_msg === PLNMSG_OK_DONT_DIE
            ? 'Yes, you do.  Green slime has been genocided...'
            : 'Unfortunately, green slime has been genocided...');
        await done(GENOCIDED);
    }
}

/* C apply.c:2398 — delayed figurine transformation. */
async function fig_transform_timer(arg, timeout) {
    const figurine = arg?.a_obj;
    if (!figurine) {
        await impossible('null figurine in fig_transform()');
        return;
    }
    const S_MIMIC = 13, S_EEL = 57;
    const silent = (timeout | 0) !== (game.moves | 0); /* happened while away */
    const xx = { value: 0 }, yy = { value: 0 };
    let okay_spot = get_obj_location(figurine, xx, yy, 0);
    let cc = { x: xx.value | 0, y: yy.value | 0 };
    if (figurine.where === OBJ_INVENT || figurine.where === OBJ_MINVENT) {
        cc = enexto_out(cc.x, cc.y, permonstTemplate(figurine.corpsenm | 0));
        okay_spot = !!cc;
    }
    if (!okay_spot || !(await figurine_location_checks(figurine, cc, true))) {
        /* reset the timer to try again later */
        start_timer(rnd(5000), TIMER_OBJECT, FIG_TRANSFORM, arg);
        return;
    }
    const cansee_spot = cansee(cc.x, cc.y);
    let redraw = false;
    const mtmp = await make_familiar(figurine, cc.x, cc.y, true);
    if (mtmp) {
        const mshelter = game.level?.levelObjects?.[mtmp.mx]?.[mtmp.my] ?? null;
        let suppress_see = false, and_vanish = '';
        const monnambuf = an(m_monnam(mtmp));
        const seeInv = game.u?.uprops?.[SEE_INVIS];
        const See_invisible = !!seeInv && !!((seeInv.intrinsic | 0) || (seeInv.extrinsic | 0)) && !(seeInv.blocked | 0);
        if ((mtmp.minvis && !See_invisible)
            || ((mtmp.data.mlet | 0) === S_MIMIC && (mtmp.m_ap_type | 0) !== 0))
            suppress_see = true;
        if (mtmp.mundetected) {
            if (((mtmp.data.mflags1 | 0) & 0x00000080 /* M1_CONCEAL: hides_under */) && mshelter)
                and_vanish = ` and ${locomotion(mtmp.data, 'crawl')} under ${await doname(mshelter)}`;
            else if ((mtmp.data.mlet | 0) === S_MIMIC || (mtmp.data.mlet | 0) === S_EEL)
                suppress_see = true;
            else
                and_vanish = ' and vanish';
        }
        switch (figurine.where) {
        case OBJ_INVENT:
            if (Blind() || suppress_see)
                await You_feel(`something ${locomotion(mtmp.data, 'drop')} from your pack!`);
            else
                await You_see(`${monnambuf} ${locomotion(mtmp.data, 'drop')} out of your pack${and_vanish}!`);
            break;
        case OBJ_FLOOR:
            if (cansee_spot && !silent) {
                set_msg_xy(cc.x, cc.y);
                if (suppress_see)
                    await pline(`${an(xname(figurine))} suddenly vanishes!`);
                else
                    await You_see(`a figurine transform into ${monnambuf}${and_vanish}!`);
                redraw = true; /* update figurine's map location */
            }
            break;
        case OBJ_MINVENT:
            if (cansee_spot && !silent && !suppress_see) {
                const mon = figurine.ocarry;
                let carriedby;
                if (canseemon(mon) && (!mon.wormno || cansee(mon.mx, mon.my)))
                    carriedby = `${s_suffix(a_monnam(mon))} pack`;
                else if (is_pool(mon.mx, mon.my))
                    carriedby = 'empty water';
                else
                    carriedby = 'thin air';
                await You_see(`${monnambuf} ${locomotion(mtmp.data, 'drop')} out of ${carriedby}${and_vanish}!`);
            }
            break;
        default:
            await impossible('figurine came to life where? (%d)', figurine.where);
            break;
        }
    }
    /* free figurine now */
    if (figurine.where === OBJ_INVENT) {
        await useup(figurine);
    } else {
        obj_extract_self_general(figurine);
        await obfree(figurine, null);
    }
    if (redraw)
        newsym(cc.x, cc.y);
}

function burn_hallucination() {
    const props = game.u?.uprops;
    return !!props?.[HALLUC]?.intrinsic
        && !(props?.[HALLUC_RES]?.intrinsic || props?.[HALLUC_RES]?.extrinsic);
}

/* C timeout.c:1344 — only called for a visible lamp. */
async function see_lamp_flicker(obj, tailer) {
    switch (obj.where) {
    case OBJ_INVENT:
    case OBJ_MINVENT:
        await pline(`${Yname2(obj)} flickers${tailer}.`);
        break;
    case OBJ_FLOOR:
        await You_see(`${an(xname(obj))} flicker${tailer}.`);
        break;
    }
}

/* C timeout.c:1359 — brass lanterns have their own warning text. */
async function lantern_message(obj) {
    switch (obj.where) {
    case OBJ_INVENT:
        await pline('Your lantern is getting dim.');
        if (burn_hallucination())
            await pline('Batteries have not been invented yet.');
        break;
    case OBJ_FLOOR:
        await You_see('a lantern getting dim.');
        break;
    case OBJ_MINVENT:
        await pline(`${s_suffix(Monnam(obj.ocarry))} lantern is getting dim.`);
        break;
    }
}

/* C timeout.c:1382-1680.  begin_burn subtracts fuel through the next
 * warning checkpoint in advance; age is the fuel LEFT at that checkpoint.
 * run_timers has already detached this timer before calling us. */
async function burn_object(arg, timeout) {
    let obj = arg.a_obj;
    const menorah = obj.otyp === BURN_CANDELABRUM;
    const many = menorah ? obj.spe > 1 : obj.quan > 1;

    if (timeout !== game.moves) {
        const how_long = game.moves - timeout;
        if (how_long >= obj.age) {
            obj.age = 0;
            end_burn(obj, false);
            if (menorah) {
                obj.spe = 0;
                obj.owt = weight(obj);
            } else if (Is_candle(obj) || obj.otyp === BURN_POT_OIL) {
                const mon = obj.where === OBJ_FLOOR ? m_at(obj.ox, obj.oy) : null;
                obj_extract_self_general(obj);
                await obfree(obj, null);
                if (mon) maybe_unhide_at(mon.mx, mon.my);
            }
        } else {
            obj.age -= how_long;
            begin_burn(obj, true);
        }
        return;
    }

    const x = { value: 0 }, y = { value: 0 };
    let canseeit = false, whose = '';
    if (get_obj_location(obj, x, y, 0)) {
        canseeit = !Blind() && cansee(x.value, y.value);
        whose = Shk_Your('', obj);
    }
    const bytouch = obj.where === OBJ_INVENT && obj.otyp !== BURN_BRASS_LANTERN;
    let need_newsym = false, need_invupdate = false;
    switch (obj.otyp) {
    case BURN_POT_OIL:
        if (canseeit) {
            switch (obj.where) {
            case OBJ_INVENT:
                need_invupdate = true;
                // C FALLTHROUGH.
            case OBJ_MINVENT:
                await pline(`${whose}potion of oil has burnt away.`);
                break;
            case OBJ_FLOOR:
                await You_see('a burning potion of oil go out.');
                need_newsym = true;
                break;
            }
        }
        end_burn(obj, false);
        if (burn_carried(obj)) {
            await useupall(obj);
        } else {
            if (obj.where === OBJ_MIGRATING) obj.owornmask = 0;
            obj_extract_self_general(obj);
            await obfree(obj, null);
        }
        obj = null;
        break;

    case BURN_BRASS_LANTERN:
    case BURN_OIL_LAMP:
        switch (obj.age) {
        case 150:
        case 100:
        case 50:
            if (canseeit) {
                if (obj.otyp === BURN_BRASS_LANTERN)
                    await lantern_message(obj);
                else
                    await see_lamp_flicker(obj, obj.age === 50 ? ' considerably' : '');
            }
            break;
        case 25:
            if (canseeit) {
                if (obj.otyp === BURN_BRASS_LANTERN) {
                    await lantern_message(obj);
                } else {
                    switch (obj.where) {
                    case OBJ_INVENT:
                    case OBJ_MINVENT:
                        await pline(`${Yname2(obj)} seems about to go out.`);
                        break;
                    case OBJ_FLOOR:
                        await You_see(`${an(xname(obj))} about to go out.`);
                        break;
                    }
                }
            }
            break;
        case 0:
            if (canseeit || bytouch) {
                switch (obj.where) {
                case OBJ_INVENT:
                    need_invupdate = true;
                    // C FALLTHROUGH.
                case OBJ_MINVENT:
                    await pline(obj.otyp === BURN_BRASS_LANTERN
                        ? `${whose}lantern has run out of power.` : `${Yname2(obj)} has gone out.`);
                    break;
                case OBJ_FLOOR:
                    await You_see(obj.otyp === BURN_BRASS_LANTERN
                        ? 'a lantern run out of power.' : `${an(xname(obj))} go out.`);
                    break;
                }
            }
            end_burn(obj, false);
            break;
        }
        if (obj.age) begin_burn(obj, true);
        break;

    case BURN_CANDELABRUM:
    case BURN_TALLOW_CANDLE:
    case BURN_WAX_CANDLE:
        switch (obj.age) {
        case 75:
            if (canseeit) {
                switch (obj.where) {
                case OBJ_INVENT:
                case OBJ_MINVENT:
                    await pline(`${whose}${menorah ? "candelabrum's " : ''}candle${many ? 's are' : ' is'} getting short.`);
                    break;
                case OBJ_FLOOR:
                    await You_see(`${menorah ? "a candelabrum's " : many ? 'some ' : 'a '}candle${many ? 's' : ''} getting short.`);
                    break;
                }
            }
            break;
        case 15:
            if (canseeit) {
                switch (obj.where) {
                case OBJ_INVENT:
                case OBJ_MINVENT:
                    await pline(`${whose}${menorah ? "candelabrum's " : ''}candle${many ? "s'" : "'s"} flame${many ? 's' : ''} flicker${many ? '' : 's'} low!`);
                    break;
                case OBJ_FLOOR:
                    await You_see(`${menorah ? "a candelabrum's " : many ? 'some ' : 'a '}candle${many ? "s'" : "'s"} flame${many ? 's' : ''} flicker low!`);
                    break;
                }
            }
            break;
        case 0:
            if (canseeit || bytouch) {
                if (menorah) {
                    switch (obj.where) {
                    case OBJ_INVENT:
                        need_invupdate = true;
                        // C FALLTHROUGH.
                    case OBJ_MINVENT:
                        await pline(`${whose}candelabrum's flame${many ? 's die' : ' dies'}.`);
                        break;
                    case OBJ_FLOOR:
                        await You_see(`a candelabrum's flame${many ? 's' : ''} die.`);
                        break;
                    }
                } else {
                    switch (obj.where) {
                    case OBJ_INVENT:
                    case OBJ_MINVENT:
                        await pline(`${Yname2(obj)} ${many ? 'are' : 'is'} consumed!`);
                        break;
                    case OBJ_FLOOR:
                        await You_see(`${many ? 'some ' : ''}${many ? xname(obj) : an(xname(obj))} consumed!`);
                        need_newsym = true;
                        break;
                    }
                    await pline(burn_hallucination() ? (many ? 'They shriek!' : 'It shrieks!')
                        : Blind() ? '' : (many ? 'Their flames die.' : 'Its flame dies.'));
                }
            }
            end_burn(obj, false);
            if (menorah) {
                obj.spe = 0;
                obj.owt = weight(obj);
                if (burn_carried(obj)) need_invupdate = true;
            } else {
                if (burn_carried(obj)) {
                    await useupall(obj);
                } else {
                    const onfloor = obj.where === OBJ_FLOOR;
                    if (obj.where === OBJ_MIGRATING) obj.owornmask = 0;
                    obj_extract_self_general(obj);
                    if (onfloor) maybe_unhide_at(x.value, y.value);
                    await obfree(obj, null);
                }
                obj = null;
            }
            break;
        }
        if (obj && obj.age) begin_burn(obj, true);
        break;
    default:
        await impossible('burn_object: unexpected obj %s', xname(obj));
        break;
    }
    if (need_newsym) newsym(x.value, y.value);
    if (need_invupdate) update_inventory();
}


/* C mkobj.c:1501-1647 shrink_glob(). */
async function shrink_glob_timer(arg, timeout) {
    const obj = arg?.a_obj;
    if (!obj)
        return;
    if (!obj.globby) {
        /* C mkobj.c:1516 */
        await impossible('shrink_glob for non-glob [%d: %s]?', obj.otyp, simpleonames(obj));
        return;
    }

    let outer = obj;
    while ((outer.where | 0) === OBJ_CONTAINED && outer.ocontainer)
        outer = outer.ocontainer;
    let globloc = 0;
    const ox = outer.ox | 0, oy = outer.oy | 0;
    if ((outer.where | 0) === OBJ_FLOOR && is_ice(ox, oy)) globloc = 1;
    else if ((outer.where | 0) === OBJ_BURIED && is_ice(ox, oy)) globloc = 2;

    if ((timeout | 0) < (game.moves | 0) && globloc !== 2) {
        let delta = Math.floor(((game.moves | 0) - (timeout | 0) + 24) / 25);
        const moddelta = 25 - (delta % 25);
        if (globloc === 1)
            delta = Math.floor((delta + 2) / 3);
        if (delta >= (obj.owt | 0)) {
            obj.owt = 0;
            await shrinking_glob_gone(obj);
        } else {
            obj.owt = (obj.owt | 0) - delta;
            if ((obj.where | 0) === OBJ_CONTAINED && obj.ocontainer)
                container_weight(obj.ocontainer);
            start_timer(moddelta, TIMER_OBJECT, SHRINK_GLOB, arg);
        }
        return;
    }

    const beingEaten = game.occupation === eatfood
        && game.context?.victual?.piece === obj;
    if (beingEaten || globloc === 2
        || (globloc === 1 && ((game.moves | 0) % 3) === 1)) {
        start_timer(23 + rn2(5), TIMER_OBJECT, SHRINK_GLOB, arg);
        return;
    }

    game.iflags ??= {};
    const oldPartlyEatenHack = !!game.iflags.partly_eaten_hack;
    let globname;
    game.iflags.partly_eaten_hack = true;
    try {
        globname = Yname2(obj);
    } finally {
        game.iflags.partly_eaten_hack = oldPartlyEatenHack;
    }

    const ininv = (obj.where | 0) === OBJ_INVENT || burn_carried(obj);
    const contnr = (obj.where | 0) === OBJ_CONTAINED ? obj.ocontainer : null;
    let topcontnr = contnr;
    while (topcontnr && (topcontnr.where | 0) === OBJ_CONTAINED)
        topcontnr = topcontnr.ocontainer;
    const oldTopWeight = topcontnr ? (topcontnr.owt | 0) : 0;
    const basewt = OC_WEIGHT[obj.otyp | 0] | 0;
    const msgwt = Math.floor((Math.max(basewt, 1) + 1) / 2);
    let shrink = false, updinv = false;
    if ((obj.owt | 0) > 0) {
        shrink = ((obj.owt | 0) % msgwt) === 0;
        obj.owt = (obj.owt | 0) - 1;
        if ((obj.oeaten | 0) > 1)
            obj.oeaten = (obj.oeaten | 0) - 1;
    }
    const gone = !(obj.owt | 0);

    if (ininv) {
        if (shrink || gone)
            await pline(`${globname} ${gone ? 'dissolves completely' : 'shrinks'}.`);
        updinv = true;
    } else if (contnr) {
        container_weight(contnr);
        if (topcontnr && (topcontnr.where | 0) === OBJ_INVENT) {
            const changed = (topcontnr.owt | 0) !== oldTopWeight;
            if (gone || (shrink && changed)
                || near_capacity() !== (game.u?._oldcap | 0)) {
                await pline(`${Yname2(topcontnr)} ${changed ? 'becomes' : 'seems'}${gone ? '' : ' slightly'} lighter.`);
            }
            updinv = true;
        }
    }

    if (gone) {
        const floor = (obj.where | 0) === OBJ_FLOOR;
        const x = obj.ox | 0, y = obj.oy | 0;
        const seeit = floor && cansee(x, y);
        await shrinking_glob_gone(obj);
        if (seeit) {
            newsym(x, y);
            let fadeName = globname;
            if ((x !== (game.u?.ux | 0) || y !== (game.u?.uy | 0))
                && fadeName.startsWith('The '))
                fadeName = `A ${fadeName.slice(4)}`;
            await pline(`${fadeName} fades away.`);
        }
    } else {
        start_timer(23 + rn2(5), TIMER_OBJECT, SHRINK_GLOB, arg);
    }
    if (updinv) {
        update_inventory();
        await encumber_msg();
    }
}

/* C mondata.h:62 is_silent(ptr) — msound == MS_SILENT. */
const MS_SILENT = 0;
const is_silent = (ptr) => (ptr?.msound | 0) === MS_SILENT;

/* C timeout.c:1017-1220 hatch_egg().  This is async because makemon() and
 * the display message path are async in the JS port. */
async function hatch_egg(arg, timeout) {
    const egg = arg?.a_obj;
    if (!egg || (egg.corpsenm | 0) === NON_PM)
        return;

    const mnum = big_to_little(egg.corpsenm | 0);
    const mdat = permonstTemplate(mnum);
    const carried = (egg.where | 0) === OBJ_INVENT;
    const yours = !!egg.spe || (!game.flags?.female && carried && !rn2(2));
    const silent = (timeout | 0) !== (game.moves | 0);
    const xp = { value: 0 }, yp = { value: 0 };
    let mon = null, mon2 = null, hatchcount = 0;

    /* C get_obj_location(...,0): contained and buried eggs cannot hatch. */
    if (!get_obj_location(egg, xp, yp, 0))
        return;
    const x = xp.value | 0, y = yp.value | 0;
    hatchcount = rnd(egg.quan | 0);
    const canseeHatchspot = cansee(x, y) && !silent;
    const vitals = game.mvitals?.[mnum];
    const gone = (mdat.geno & G_UNIQ)
        || (vitals && ((vitals.mvflags | 0) & (G_GENOD | G_EXTINCT)));
    if (!gone) {
        let i;
        for (i = hatchcount; i > 0; i--) {
            const cc = enexto_out(x, y, mdat);
            if (!cc)
                break;
            mon = await makemon(mdat, cc.x, cc.y, NO_MINVENT | MM_NOMSG);
            if (!mon)
                break;
            if ((yours && !silent)
                || (carried && (mon.data.mlet | 0) === S_DRAGON)) {
                if (await tamedog(mon, null, false) && carried
                    && (mon.data.mlet | 0) !== S_DRAGON)
                    mon.mtame = 20;
            }
            if (game.mvitals?.[mnum]
                && ((game.mvitals[mnum].mvflags | 0) & G_EXTINCT))
                break;
            mon2 = mon;
        }
        if (!mon) mon = mon2;
        hatchcount -= i;
        egg.quan -= hatchcount;
    }
    if (!mon)
        return;
    const siblings = hatchcount > 1;
    let name = '', knowsEgg = false, redraw = false;
    if (canseeHatchspot)
        name = siblings ? 'some ' + makeplural(m_monnam(mon)) : an(m_monnam(mon));
    switch (egg.where) {
    case OBJ_INVENT:
        knowsEgg = true;
        if (!canseeHatchspot)
            await You_feel(`something ${locomotion(mon.data, 'drop')} from your pack!`);
        else
            await You_see(`${name} ${locomotion(mon.data, 'drop')} out of your pack!`);
        if (yours) {
            await pline(`${siblings ? 'Their' : 'Its'} ${ing_suffix(cry_sound(mon))} ${
                is_silent(mon.data) || Deaf() ? 'seems' : 'sounds'} like "${
                game.flags?.female ? 'mommy' : 'daddy'}${egg.spe ? '.' : '?'}"`);
        } else if (mon.data.mlet === S_DRAGON && !Deaf()) {
            await verbalize('Gleep!');
        }
        break;
    case OBJ_FLOOR:
        if (canseeHatchspot) {
            knowsEgg = true;
            await You_see(`${name} hatch.`);
            redraw = true;
        }
        break;
    case OBJ_MINVENT:
        if (canseeHatchspot) {
            const carrier = egg.ocarry;
            let carriedBy;
            if (canseemon(carrier) && (!carrier.wormno || cansee(carrier.mx, carrier.my))) {
                carriedBy = `${s_suffix(a_monnam(carrier))} pack`;
                knowsEgg = true;
            } else {
                carriedBy = is_pool(mon.mx, mon.my) ? 'empty water' : 'thin air';
            }
            await You_see(`${name} ${locomotion(mon.data, 'drop')} out of ${carriedBy}!`);
        }
        break;
    default:
        await impossible('egg hatched where? (%d)', egg.where);
        break;
    }
    if (canseeHatchspot && knowsEgg)
        learn_egg_type(mnum);
    if (egg.quan > 0) {
        attach_egg_hatch_timeout(egg, rnd(12));
        container_weight(egg);
    } else if (carried) {
        await useup(egg);
    } else {
        obj_extract_self_general(egg);
        await obfree(egg, null);
        mon = m_at(x, y);
        if (mon && !hideunder(mon) && cansee(x, y)) redraw = true;
    }
    if (redraw) newsym(x, y);
}

// C timeout.c:1196 learn_egg_type: hatchlings identify the adult species' egg.
export function learn_egg_type(mnum) {
    const adult = little_to_big(mnum);
    game.mvitals ||= [];
    const vital = game.mvitals[adult] ||= { mvflags: 0 };
    vital.mvflags |= MV_KNOWS_EGG;
    update_inventory();
}

export function attach_egg_hatch_timeout(egg, when) {
    let i;

    /* C timeout.c:986 — stop previous timer, if any. */
    stop_timer(HATCH_EGG, obj_to_any(egg));

    /* C timeout.c:994-1001 — decide if and when to hatch. */
    if (!when) {
        for (i = (MAX_EGG_HATCH_TIME - 50) + 1; i <= MAX_EGG_HATCH_TIME; i++) {
            if (rnd(i) > 150) {
                /* egg will hatch */
                when = i;
                break;
            }
        }
    }
    /* C timeout.c:1002-1004 */
    if (when) {
        /* start_timer owns both queue insertion and the TIMER_OBJECT timed
         * count; incrementing the flag alone loses the deadline, so a later
         * set_corpsenm() cannot preserve it through stop_timer(). */
        start_timer(when, TIMER_OBJECT, HATCH_EGG, obj_to_any(egg));
    }
}

/* C ref: timeout.c:950 void fall_asleep(int how_long, boolean wakeup_msg)
 *   stop_occupation();
 *   nomul(how_long);
 *   gm.multi_reason = "sleeping";
 *   (the #if 0 deafness block, timeout.c:957-970, is dead code — not ported)
 *   u.usleep = svm.moves;
 *   gn.nomovemsg = wakeup_msg ? "You wake up." : You_can_move_again;
 *
 * RNG-free.  The occupation stop is awaited because a completed meal can
 * cross the async fpostfx/useup boundary before sleep is armed.
 *
 * The load-bearing line is `u.usleep = svm.moves` (timeout.c:972): it is the
 * flag unconscious() (trap.c:6756) reads, so it is what makes Unaware
 * (youprop.h:399) true on the slept turns and therefore what makes
 * gethungry() draw its rn2(10) at eat.c:3174 while the hero is asleep.
 * nomul() itself clears u.usleep (hack.c:4075), so the assignment MUST follow
 * the nomul() calls, exactly as C orders them. */
export async function fall_asleep(how_long, wakeup_msg) {
    const g = game;
    await stop_occupation();
    nomul(how_long);
    g.multi_reason = 'sleeping';
    if (!g.u)
        g.u = {};
    g.u.usleep = g.moves | 0; /* C timeout.c:972 — u.usleep = svm.moves */
    g.nomovemsg = wakeup_msg ? 'You wake up.' : 'You can move again.';
}

/* Resolve a map cell the same way every other module's local copy of this
 * helper does (js/cmd.js:23916 _levlAt, js/vision.js, ...) — there is no
 * shared export for it yet. */
function _levlAt(x, y) {
    const g = game;
    if (g.level && g.level.locations) return g.level.locations[x]?.[y] ?? null;
    if (g.map) return g.map[x]?.[y] ?? null;
    return null;
}

// C ref: hack.h:1476,1486 BZ_OFS_AD(adtyp) = abs(adtyp - AD_MAGM) % 10;
// BZ_M_SPELL(bztyp) = -10 - bztyp (monster spells are NEGATIVE types, so
// buzz() treats the ray as monster-fired and `type < 0` returns early when swallowed).
const AD_MAGM = 1; /* monattk.h */
function _BZ_OFS_AD(adtyp) { return Math.abs(adtyp - AD_MAGM) % 10; }
function _BZ_M_SPELL(ofs) { return -10 - ofs; }
const AD_ELEC = 6; /* monattk.h */

/* C timeout.h incr_itimeout(&HDeaf, incr) — add to the TIMEOUT bits of the
 * intrinsic without disturbing the FROMOUTSIDE-style flag bits.  HDeaf is the
 * plain u.HDeaf counter in this port, same convention as js/trap.js:5311
 * _incr_HDeaf and js/eat.js's rottenfood/choke arms. */
function _incr_HDeaf(incr) {
    const u = game.u;
    if (!u)
        return;
    const prop = u.uprops?.[DEAF];
    const old = (u.HDeaf | 0) || (prop?.intrinsic | 0);
    // C potion.c:55-85: clamp the timeout and preserve its origin flags.
    u.HDeaf = (old & ~TIMEOUT)
        | Math.min(TIMEOUT, Math.max(0, (old & TIMEOUT) + (incr | 0)));
    // C has one HDeaf: the property countdown must retain thunder's extension.
    if (prop) prop.intrinsic = u.HDeaf;
}

export async function do_storms() {
    const g = game;
    if (!g.level?.flags?.stormy || rn2(8))
        return;

    for (let nstrike = rnd(64); nstrike <= 64; nstrike *= 2) {
        let count = 0;
        let x, y;
        do {
            x = rnd(COLNO - 1);
            y = rn2(ROWNO);
        } while (++count < 100 && _levlAt(x, y)?.typ !== CLOUD);

        if (count < 100) {
            const dirx = rn2(3) - 1;
            const diry = rn2(3) - 1;
            if (dirx !== 0 || diry !== 0) {
                (g.gb ||= {}).buzzer = 0;
                await buzz(_BZ_M_SPELL(_BZ_OFS_AD(AD_ELEC)), 8, x, y, dirx, diry);
            }
        }
    }

    const u = g.u;
    if (_levlAt(u?.ux | 0, u?.uy | 0)?.typ === CLOUD) {
        /* Inside a cloud during a thunderstorm is deafening.  Even if
         * already deaf, we sense the thunder's vibrations.
         * C timeout.c:1880 Soundeffect(se_kaboom_boom_boom, 80) — audio
         * only, no RNG; omitted, same convention as js/dig.js/js/lock.js. */
        await pline('Kaboom!!!  Boom!!  Boom!!');
        _incr_HDeaf(rn1(20, 30));
        g.disp = g.disp || {};
        g.disp.botl = 1;
        if (!u?.uinvulnerable) {
            await stop_occupation();
            nomul(-3);
            g.multi_reason = 'hiding from thunderstorm';
            g.nomovemsg = 0;
        }
    } else {
        await You_hear('a rumbling noise.');
    }
}

// ── the timer chain (timeout.c) ─────────────────────────────────────────────
// C ref: decl.h — `struct timer_global gt` (gt.timer_base, the head of the
// ordered timer queue) and `struct s_timer svt` (svt.timer_id, the id counter).
//
// Both used to be MODULE-PRIVATE `let` objects here, on the stated grounds that
// "insert_timer/start_timer are not ported, so nothing ever links a
// timer_element onto this chain and it stays empty".  That was true and is the
// defect this port closes: with no queue, ROT_CORPSE never fired, so a corpse
// (40,5) is corpse > sack > oil lamp > 10 darts in this port and
// sack > oil lamp > 10 darts in C, so the square rendered "%" where C renders
//
// They now hang off the shared `game` object, because `game` is rebound per
// segment (js/gstate.js resetGame) and a module-private chain would leak every
// timer of segment 0 into segment 1.
function gtimer() {
    if (!game.gt)
        game.gt = {};
    if (game.gt.timer_base === undefined)
        game.gt.timer_base = null;
    return game.gt;
}
function stimer() {
    if (!game.svt)
        game.svt = {};
    if (game.svt.timer_id === undefined)
        game.svt.timer_id = 1; // C decl.c:976: init_svt.timer_id starts at 1UL.
    return game.svt;
}
/* C svm.moves.  js/allmain.js keeps the turn counter on game.moves; game.svm
 * is the shape a handful of files reach for first, so both spellings are read
 * here rather than picking one and being silently zero on the other path. */
function curmoves() {
    return (game.moves ?? 0) | 0;
}

// alloc(size) (alloc.c) — struct allocator; JS has no sizeof/malloc model, so
// a fresh field-less object stands in for the C allocation, same pattern as
// js/region.js's local alloc(_size) stub.
function alloc_timeout(_size) { return {}; }

// Sfi_ulong/Sfi_int/Sfi_fe (savefile.h) — libc-level save-file field readers;
// no JS save-file byte model exists, so these are faithful no-op stubs
// (calls_macro_or_libc), same pattern as js/region.js's Sfi_long/Sfi_int etc.
function Sfi_ulong(nhfp, val, name) { return val; }
function Sfi_int(nhfp, val, name) { return val; }
function Sfi_fe(nhfp, curr, name) { return curr; }



const timeout_funcs = [
    { f: (arg, timeout) => rot_organic(arg, timeout), cleanup: 0, name: 'rot_organic' },
    { f: (arg, timeout) => rot_corpse(arg, timeout), cleanup: 0, name: 'rot_corpse' },
    { f: async (arg) => await revive_mon(arg), cleanup: 0, name: 'revive_mon' },
    { f: async (arg, timeout) => await zombify_mon(arg, timeout), cleanup: 0, name: 'zombify_mon' },
    { f: (arg, timeout) => burn_object(arg, timeout),
      cleanup: (arg, expire_time) => cleanup_burn(arg, expire_time), name: 'burn_object' },
    { f: (arg, timeout) => hatch_egg(arg, timeout), cleanup: 0, name: 'hatch_egg' },
    { f: (arg, timeout) => fig_transform_timer(arg, timeout), cleanup: 0, name: 'fig_transform' },
    { f: (arg, timeout) => shrink_glob_timer(arg, timeout), cleanup: 0, name: 'shrink_glob' },
    { f: async (arg) => {
        // C zap.c:5123-5131: natural melting must not credit/blame the hero.
        const save_mon_moving = game.context.mon_moving;
        game.context.mon_moving = true;
        const where = Number(arg?.a_long ?? 0);
        const x = (where >> 16) & 0xffff;
        const y = where & 0xffff;
        try {
            await melt_ice_zap(x, y, 'Some ice melts away.');
        } finally {
            game.context.mon_moving = save_mon_moving;
        }
    }, cleanup: 0, name: 'melt_ice_away' },
];

/* C ref: timeout.c:2467-2481 insert_timer(timer_element *gnu) — link into the
 * global queue, kept sorted by ascending `timeout`.  New timers go AFTER any
 * existing timer with an equal timeout (the loop breaks on `>=`, inserting
 * before the first strictly-later element), which is what makes the fire order
 * of same-turn timers deterministic. */
export function insert_timer(gnu) {
    const gt = gtimer();
    let curr, prev;

    for (prev = null, curr = gt.timer_base; curr; prev = curr, curr = curr.next)
        if (curr.timeout >= gnu.timeout)
            break;

    gnu.next = curr;
    if (prev)
        prev.next = gnu;
    else
        gt.timer_base = gnu;
}

/* C ref: timeout.c:2487-2506 remove_timer(timer_element **base, short
 * func_index, anything *arg) — unlink and return the matching element. */
function remove_timer(func_index, arg) {
    const gt = gtimer();
    let prev, curr;

    for (prev = null, curr = gt.timer_base; curr; prev = curr, curr = curr.next)
        if (curr.func_index === func_index && curr.arg.a_obj === arg.a_obj
            && curr.arg.a_long === arg.a_long)
            break;

    if (curr) {
        if (prev)
            prev.next = curr.next;
        else
            gt.timer_base = curr.next;
    }
    return curr;
}

/* C ref: timeout.c:2222-2242 run_timers(void) — pick off queue elements whose
 * timeout has arrived and call their functions.  Elements may be added or
 * deleted by a handler, so the head is re-read every iteration. */
export async function run_timers() {
    const gt = gtimer();
    let curr;

    while (gt.timer_base && gt.timer_base.timeout <= curmoves()) {
        curr = gt.timer_base;
        gt.timer_base = curr.next;

        if (curr.kind === TIMER_OBJECT)
            curr.arg.a_obj.timed = (curr.arg.a_obj.timed | 0) - 1;
        await timeout_funcs[curr.func_index].f(curr.arg, curr.timeout);
        /* C memsets and frees curr here; JS drops the reference instead */
    }
}

/* C ref: timeout.c:2128-2211 timer_sanity_check(void) — wizard-mode sanity
 * check of the timer queue.  The TIMER_OBJECT arm's location checks need
 * get_obj_location(); only its untimed-object check is ported here. */
export async function timer_sanity_check() {
    for (let curr = gtimer().timer_base; curr; curr = curr.next) {
        const t_id = curr.tid;
        switch (curr.kind) {
        case TIMER_OBJECT: {
            const obj = curr.arg.a_obj;
            if (!obj.timed)
                await impossible('timer sanity: untimed obj %s, timer %lu',
                                 'obj', t_id);
            break;
        }
        case TIMER_MONSTER:
            await impossible('timer sanity: unexpected monster timer %lu', t_id);
            break;
        case TIMER_LEVEL: {
            const lwhere = curr.arg.a_long;
            const x = (lwhere >> 16) & 0xFFFF;
            const y = lwhere & 0xFFFF;
            if (isok(x, y)) {
                const loc = game.level.at(x, y);
                if (curr.func_index === MELT_ICE_AWAY && !is_ice(x, y)
                    && !(loc.typ === DRAWBRIDGE_DOWN
                         && ((loc.drawbridgemask | 0) & DB_UNDER) === DB_ICE))
                    await impossible(
                        'timer sanity: melt timer %lu on non-ice %d <%d,%d>',
                        t_id, loc.typ, x, y);
            } else {
                await impossible('timer sanity: spot timer %lu at <%d,%d>',
                                 t_id, x, y);
            }
            break;
        }
        case TIMER_GLOBAL:
            await impossible('timer sanity: unexpected global timer %lu', t_id);
            break;
        default:
            await impossible('timer sanity: unknown timer %lu, type: %d',
                             t_id, curr.kind);
            break;
        }
    }
}

/* C timeout.c:1995-2014: names used in timer panic diagnostics. */
function kind_name(kind) {
    if (kind === TIMER_NONE) impossible_sync('no timer type');
    return ['none', 'level', 'global', 'object', 'monster'][kind] ?? 'unknown';
}

/* C ref: timeout.c:2246-2292 start_timer(long when, short kind, short
 * func_index, anything *arg).  Returns TRUE on success.  C panics on a bad
 * kind/func_index and impossible()s (returning FALSE, timer not started) on a
 * duplicate <kind, func_index, arg> — both reproduced. */
export function start_timer(when, kind, func_index, arg) {
    let gnu, dup;

    if (kind <= TIMER_NONE || kind >= NUM_TIMER_KINDS
        || func_index < 0 || func_index >= NUM_TIME_FUNCS)
        throw new Error(`start_timer (${kind_name(kind)}: ${func_index})`);

    /* fail if <arg> already has a <func_index> timer running */
    for (dup = gtimer().timer_base; dup; dup = dup.next)
        if (dup.kind === kind && dup.func_index === func_index
            && dup.arg.a_obj === arg.a_obj && dup.arg.a_long === arg.a_long)
            break;
    if (dup) {
        /* C impossible("Attempted to start duplicate %s, aborted.") — a warning
         * that returns FALSE and leaves the existing timer alone. */
        impossible_sync('Attempted to start duplicate %s timer, aborted.', timeout_funcs[func_index].name);
        return false;
    }

    const svt = stimer();
    gnu = alloc_timeout(/* sizeof(timer_element) */);
    gnu.next = null;
    gnu.tid = svt.timer_id++;
    gnu.timeout = curmoves() + (when | 0);
    gnu.kind = kind;
    gnu.needs_fixup = 0;
    gnu.func_index = func_index;
    gnu.arg = { ...arg }; // C copies the anything union by value.
    insert_timer(gnu);

    if (kind === TIMER_OBJECT) /* increment object's timed count */
        arg.a_obj.timed = (arg.a_obj.timed | 0) + 1;

    return true;
}

/* C ref: timeout.c:2298-2317 stop_timer(short func_index, anything *arg) —
 * remove the timer and return the time remaining, or 0 if there was none. */
export function stop_timer(func_index, arg) {
    let cleanup_func;
    const doomed = remove_timer(func_index, arg);

    if (doomed) {
        const timeout = doomed.timeout;
        if (doomed.kind === TIMER_OBJECT)
            arg.a_obj.timed = (arg.a_obj.timed | 0) - 1;
        if ((cleanup_func = timeout_funcs[doomed.func_index].cleanup) !== 0)
            cleanup_func(arg, timeout);
        return timeout - curmoves();
    }
    return 0;
}

/* C ref: timeout.c:2323-2334 peek_timer(short type, anything *arg). */
export function peek_timer(type, arg) {
    for (let curr = gtimer().timer_base; curr; curr = curr.next) {
        if (curr.func_index === type && curr.arg.a_obj === arg.a_obj
            && curr.arg.a_long === arg.a_long)
            return curr.timeout;
    }
    return 0;
}

/* C ref: timeout.c:2338-2354 obj_move_timers(struct obj *src, struct obj *dest)
 * — move all object timers from src to dest, leaving src untimed. */
export function obj_move_timers(src, dest) {
    let count = 0;

    for (let curr = gtimer().timer_base; curr; curr = curr.next)
        if (curr.kind === TIMER_OBJECT && curr.arg.a_obj === src) {
            curr.arg.a_obj = dest;
            dest.timed = (dest.timed | 0) + 1;
            count++;
        }
    if (count !== (src.timed | 0))
        throw new Error('obj_move_timers');
    src.timed = 0;
}

/* C ref: timeout.c:2358-2371 obj_split_timers(struct obj *src,
 * struct obj *dest) — duplicate src's object timers onto dest. */
export function obj_split_timers(src, dest) {
    let curr, next_timer = null;

    for (curr = gtimer().timer_base; curr; curr = next_timer) {
        next_timer = curr.next; /* things may be inserted */
        if (curr.kind === TIMER_OBJECT && curr.arg.a_obj === src) {
            start_timer(curr.timeout - curmoves(), TIMER_OBJECT,
                        curr.func_index, obj_to_any(dest));
        }
    }
}

/* C ref: timeout.c:2376-2399 obj_stop_timers(struct obj *obj) — stop every
 * timer attached to this object. */
export function obj_stop_timers(obj) {
    let cleanup_func;
    let curr, prev, next_timer = null;
    const gt = gtimer();

    for (prev = null, curr = gt.timer_base; curr; curr = next_timer) {
        next_timer = curr.next;
        if (curr.kind === TIMER_OBJECT && curr.arg.a_obj === obj) {
            if (prev)
                prev.next = curr.next;
            else
                gt.timer_base = curr.next;
            if ((cleanup_func = timeout_funcs[curr.func_index].cleanup) !== 0)
                cleanup_func(curr.arg, curr.timeout);
            /* C timeout.c:2391-2392: memset + free; clear fields for GC parity */
            curr.next = null;
            curr.arg = null;
        } else {
            prev = curr;
        }
    }
    obj.timed = 0;
}

/* C ref: timeout.c:2404-2411 obj_has_timer(struct obj *, short timer_type). */
export function obj_has_timer(object, timer_type) {
    return peek_timer(timer_type, obj_to_any(object)) !== 0;
}

// C ref: timeout.c:2406-2429 spot_stop_timers(coordxy x, coordxy y, short func_index)
// Stop all TIMER_LEVEL timers of type func_index that are anchored at (x,y).
export function spot_stop_timers(x, y, func_index) {
    let cleanup_func;
    let curr, prev, next_timer = null;
    const where = ((x << 16) | y);
    const gt = gtimer();

    for (prev = null, curr = gt.timer_base; curr; curr = next_timer) {
        next_timer = curr.next;
        if (curr.kind === TIMER_LEVEL && curr.func_index === func_index
            && curr.arg.a_long === where) {
            if (prev)
                prev.next = curr.next;
            else
                gt.timer_base = curr.next;
            if ((cleanup_func = timeout_funcs[curr.func_index].cleanup) !== 0)
                cleanup_func(curr.arg, curr.timeout);
            /* C memsets and frees curr here; JS drops the reference instead */
        } else {
            prev = curr;
        }
    }
}

/* C ref: timeout.c:2564-2578 mon_is_local(struct monst *mon) — a monster that
 * is migrating or accompanying the hero does NOT stay behind with the level. */
function mon_is_local(mon) {
    for (let curr = game.migrating_mons; curr; curr = curr.nmon)
        if (curr === mon)
            return false;
    /* `gm.mydogs' is used during level changes, never saved and restored */
    for (let curr = game.mydogs; curr; curr = curr.nmon)
        if (curr === mon)
            return false;
    return true;
}

/* C ref: timeout.c:2582-2601 obj_is_local(struct obj *obj). */
export function obj_is_local(obj) {
    switch (obj.where | 0) {
    case OBJ_INVENT:
    case OBJ_MIGRATING:
        return false;
    case OBJ_FLOOR:
    case OBJ_BURIED:
        return true;
    case OBJ_CONTAINED:
        return obj_is_local(obj.ocontainer);
    case OBJ_MINVENT:
        return mon_is_local(obj.ocarry);
    }
    throw new Error('obj_is_local');
}

/* C ref: timeout.c:2603-2617 timer_is_local(timer_element *). */
function timer_is_local(timer) {
    switch (timer.kind) {
    case TIMER_LEVEL:
        return true;
    case TIMER_GLOBAL:
        return false;
    case TIMER_OBJECT:
        return obj_is_local(timer.arg.a_obj);
    case TIMER_MONSTER:
        return mon_is_local(timer.arg.a_monst);
    }
    throw new Error('timer_is_local');
}

export function save_timers_level() {
    const gt = gtimer();
    const saved = [];
    let curr, prev, next_timer = null;

    for (prev = null, curr = gt.timer_base; curr; curr = next_timer) {
        next_timer = curr.next;
        if (timer_is_local(curr)) {
            if (prev)
                prev.next = curr.next;
            else
                gt.timer_base = curr.next;
            curr.next = null;
            saved.push(curr);
            /* prev stays the same */
        } else {
            prev = curr;
        }
    }
    return saved;
}

/* C ref: timeout.c:2698-2714 restore_timers(nhfp, RANGE_LEVEL, adjust), the
 * insert half.  `adjust` is 0 for one's own saved level (restore.c:1170 passes
 * it only when ghostly, i.e. a bones file), so the timeouts come back ABSOLUTE
 * and the ones that expired while away fire on the next run_timers(). */
export function restore_timers_level(saved, adjust = 0) {
    if (!saved)
        return;
    for (const curr of saved) {
        curr.next = null;
        if (adjust)
            curr.timeout += adjust;
        insert_timer(curr);
    }
}

/* C ref: restore.c:811,898 getlev -> restore_timers(RANGE_LEVEL) and
 * restore.c:813 restgamestate -> restore_timers(RANGE_GLOBAL).  Each saved
 * timer (written in chain order by maybe_write_timer, timeout.c:2632) is read
 * back through insert_timer(), whose `>=` puts it BEFORE an equal timeout, so
 * same-turn timers come back reversed.  The current level's locals are freed
 * by restlevelfile() (:831) and re-read last (:898), after the globals.
 * `saved` given: an inactive level's array (getlev :876 + savelev rewrite). */
export function restore_timer_order(saved) {
    const gt = gtimer();
    const glob = [], loc = [];
    if (saved) {
        const keep = gt.timer_base;
        gt.timer_base = null;
        restore_timers_level(saved);
        saved.length = 0;
        for (let c = gt.timer_base; c; c = c.next)
            saved.push(c);
        for (const c of saved) c.next = null;
        gt.timer_base = keep;
        return;
    }
    for (let c = gt.timer_base; c; c = c.next)
        (timer_is_local(c) ? loc : glob).push(c);
    gt.timer_base = null;
    restore_timers_level(glob);
    restore_timers_level(loc);
}

/* C ref: timeout.c:2437-2450 spot_time_expires(coordxy, coordxy, short). */
export function spot_time_expires(x, y, func_index) {
    const where = ((x << 16) | y);

    for (let curr = gtimer().timer_base; curr; curr = curr.next) {
        if (curr.kind === TIMER_LEVEL && curr.func_index === func_index
            && curr.arg.a_long === where)
            return curr.timeout;
    }
    return 0;
}

/* C ref: timeout.c:2452-2458 spot_time_left(coordxy, coordxy, short). */
export function spot_time_left(x, y, func_index) {
    const expires = spot_time_expires(x, y, func_index);
    return (expires > 0) ? expires - curmoves() : 0;
}

/* C hack.c:97-103: use the shared pointer-union conversion.
 * `a_long` is spelled out so the chain-walk comparisons above can test both
 * arms of the union without an undefined-vs-undefined false match between an
 * object timer and a level timer. */
import { obj_to_any } from './hack.js';
import { exercise } from './attrib.js'; // relocate-fns
import { A_DEX, DEAF as DEAF_PROP, FAST as FAST_PROP, KILLED_BY_AN, M_AP_MONSTER, SLIMED as SLIMED_PROP, WOUNDED_LEGS as WOUNDED_LEGS_PROP } from './const.js'; // relocate-fns
import { heal_legs } from './do.js'; // relocate-fns
import { rndmonnam } from './do_name.js'; // relocate-fns
import { PM_GREEN_SLIME_E, Popeye, _eat_Blind, _eat_Hallucination, _uprop_on, make_stoned } from './eat.js'; // relocate-fns
import { an as an_eat } from './objnam.js'; // relocate-fns
import { make_slimed, make_vomiting } from './potion.js'; // relocate-fns
import { shrinking_glob_gone } from './mkobj.js'; // relocate-fns
import { ECMD_OK } from './const.js'; // relocate-fns
import { displayLookWindow } from './look-window.js'; // relocate-fns
import { any_visible_region, region_stats_snapshot } from './region.js'; // relocate-fns
import { _fumble_hallucinating } from './allmain.js'; // relocate-fns
import { acurr } from './attrib.js'; // relocate-fns
import { body_part, confdir, instapetrify } from './cmd.js'; // relocate-fns
import { ACCESSIBLE, ARTICLE_THE, DISMOUNT_FELL, FROMOUTSIDE, Is_waterlevel, PLNMSG_ONE_ITEM_HERE, SUPPRESS_SADDLE, W_SADDLE } from './const.js'; // relocate-fns
import * as PROPS from './const.js'; // relocate-fns
import { is_pool_or_lava } from './dbridge.js'; // relocate-fns
import { dismount_steed } from './dog.js'; // relocate-fns
import { hurtle } from './dothrow.js'; // relocate-fns
import { surface } from './dungeon.js'; // relocate-fns
import { upstart } from './hacklib.js'; // relocate-fns
import { monPmname } from './makemon.js'; // relocate-fns
import { x_monnam } from './do_name.js'; // relocate-fns
import { PM_CHICKATRICE, PM_COCKATRICE, PM_GRID_BUG } from './pm.generated.js'; // relocate-fns
import { which_armor } from './worn.js'; // relocate-fns
import { revive_mon, zombify_mon } from './do.js'; // relocate-fns
export { burn_carried }; // relocate-fns

// C ref: timeout.c:2698-2714 restore_timers(NHFILE *nhfp, int range, long adjust)
export function restore_timers(nhfp, range, adjust) {
    let count = 0;
    let curr;
    const ghostly = (nhfp.ftype === NHF_BONESFILE);

    if (range === RANGE_GLOBAL) {
        const svt = stimer();
        svt.timer_id = Sfi_ulong(nhfp, svt.timer_id, "timer-timer_id");
    }

    /* restore elements */
    count = Sfi_int(nhfp, count, "timer-timer_count");
    while (count-- > 0) {
        curr = alloc_timeout(/* sizeof(timer_element) */);
        curr = Sfi_fe(nhfp, curr, "timer");
        if (ghostly)
            curr.timeout += adjust;
        insert_timer(curr);
    }
}


/* C ref: timeout.c:27-114
 *     static const struct propname { int prop_num; const char *prop_name; }
 *     propertynames[] = { ... , { 0, 0 } };
 * "used by wizard mode #timeout and #wizintrinsic; order by 'interest' for
 *  timeout countdown, where most won't occur in normal play" — this ORDER is
 * what indexes the #wizintrinsic menu, so it is load-bearing, not cosmetic.
 * The trailing { 0, 0 } terminator is kept because both callers loop on
 * `(propname = property_by_index(i, &p)) != 0`. */
const propertynames = [
    [INVULNERABLE, "invulnerable"],
    [STONED, "petrifying"],
    [SLIMED, "becoming slime"],
    [STRANGLED, "strangling"],
    [SICK, "fatally sick"],
    [STUNNED, "stunned"],
    [CONFUSION, "confused"],
    [HALLUC, "hallucinating"],
    [BLINDED, "blinded"],
    [DEAF, "deafness"],
    [VOMITING, "vomiting"],
    [GLIB, "slippery fingers"],
    [WOUNDED_LEGS, "wounded legs"],
    [SLEEPY, "sleepy"],
    [TELEPORT, "teleporting"],
    [POLYMORPH, "polymorphing"],
    [LEVITATION, "levitating"],
    [FAST, "very fast"],
    [CLAIRVOYANT, "clairvoyant"],
    [DETECT_MONSTERS, "monster detection"],
    [SEE_INVIS, "see invisible"],
    [INVIS, "invisible"],
    [ACID_RES, "acid resistance"],
    [STONE_RES, "stoning resistance"],
    [DISPLACED, "displaced"],
    [PASSES_WALLS, "pass thru walls"],
    [MAGICAL_BREATHING, "magical breathing"],
    [WWALKING, "water walking"],
    [FIRE_RES, "fire resistance"],
    [COLD_RES, "cold resistance"],
    [SLEEP_RES, "sleep resistance"],
    [DISINT_RES, "disintegration resistance"],
    [SHOCK_RES, "shock resistance"],
    [POISON_RES, "poison resistance"],
    [DRAIN_RES, "drain resistance"],
    [SICK_RES, "sickness resistance"],
    [ANTIMAGIC, "magic resistance"],
    [HALLUC_RES, "hallucination resistance"],
    [BLND_RES, "light-induced blindness resistance"],
    [FUMBLING, "fumbling"],
    [HUNGER, "voracious hunger"],
    [TELEPAT, "telepathic"],
    [WARNING, "warning"],
    [WARN_OF_MON, "warn: monster type or class"],
    [WARN_UNDEAD, "warn: undead"],
    [SEARCHING, "searching"],
    [INFRAVISION, "infravision"],
    [ADORNED, "adorned (+/- Cha)"],
    [STEALTH, "stealthy"],
    [AGGRAVATE_MONSTER, "monster aggravation"],
    [CONFLICT, "conflict"],
    [JUMPING, "jumping"],
    [TELEPORT_CONTROL, "teleport control"],
    [FLYING, "flying"],
    [SWIMMING, "swimming"],
    [SLOW_DIGESTION, "slow digestion"],
    [HALF_SPDAM, "half spell damage"],
    [HALF_PHDAM, "half physical damage"],
    [REGENERATION, "HP regeneration"],
    [ENERGY_REGENERATION, "energy regeneration"],
    [PROTECTION, "extra protection"],
    [PROT_FROM_SHAPE_CHANGERS, "protection from shape changers"],
    [POLYMORPH_CONTROL, "polymorph control"],
    [UNCHANGING, "unchanging"],
    [REFLECTING, "reflecting"],
    [FREE_ACTION, "free action"],
    [FIXED_ABIL, "fixed abilities"],
    [LIFESAVED, "life will be saved"],
    [0, null], /* C: { 0, 0 } terminator */
];

/* C ref: timeout.c:116-125
 *     const char *property_by_index(int idx, int *propertynum) {
 *         if (!IndexOkT(idx, propertynames)) idx = SIZE(propertynames) - 1;
 *         if (propertynum) *propertynum = propertynames[idx].prop_num;
 *         return propertynames[idx].prop_name;
 *     }
 * An out-of-range index is clamped to the terminator, so the name comes back
 * NULL and the caller's loop ends.  Returns [prop_num, prop_name] — the JS
 * stand-in for C's return-value + out-parameter pair. */
export function property_by_index(idx, propertynum = null) {
    let i = idx | 0;
    if (i < 0 || i >= propertynames.length)
        i = propertynames.length - 1;
    if (propertynum && typeof propertynum === 'object')
        propertynum.value = propertynames[i][0];
    return propertynames[i];
}


/* C obj.h:427 `#define Is_candle(otmp) ((otmp)->otyp == TALLOW_CANDLE \
 *                                       || (otmp)->otyp == WAX_CANDLE)`
 * otyps from js/oc_name_data.js OC_NAME (index == otyp): 224 "tallow candle",
 * 225 "wax candle", 226 "brass lantern", 227 "oil lamp", 228 "magic lamp",
 * 262 "Candelabrum of Invocation", 321 "oil" (POT_OIL). */
const BURN_TALLOW_CANDLE = 224, BURN_WAX_CANDLE = 225;
const BURN_BRASS_LANTERN = 226, BURN_OIL_LAMP = 227, BURN_MAGIC_LAMP = 228, MAGIC_LAMP = 228;
const BURN_CANDELABRUM = 262, BURN_POT_OIL = 321;

export function Is_candle(otmp) {
    const t = otmp.otyp | 0;
    return t === BURN_TALLOW_CANDLE || t === BURN_WAX_CANDLE;
}

/* C ref: obj.h:424-426
 *   #define age_is_relative(otmp) ((otmp)->otyp == BRASS_LANTERN \
 *                                  || (otmp)->otyp == OIL_LAMP \
 *                                  || (otmp)->otyp == CANDELABRUM_OF_INVOCATION \
 *                                  || Is_candle(otmp) || (otmp)->otyp == POT_OIL)
 * Kept here beside its one begin_burn-adjacent user; js/cmd.js:35261 carries
 * the same macro as a catch_lit-local `_cl_age_is_relative`. */
export function age_is_relative(otmp) {
    const t = otmp.otyp | 0;
    return t === BURN_BRASS_LANTERN || t === BURN_OIL_LAMP
        || t === BURN_CANDELABRUM || Is_candle(otmp) || t === BURN_POT_OIL;
}

function burn_carried(obj) {
    if ((obj.where | 0) === OBJ_INVENT)
        return true;
    for (let o = game.invent; o; o = o.nobj)
        if (o === obj)
            return true;
    return false;
}

/*
 * C ref: timeout.c:1670-1799.  Start a burn timeout on the given object.  If
 * not "already lit" then create a light source for the vision system.  There
 * had better not be a burn already running on the object.
 *
 * Magic lamps stay lit as long as there's a genie inside, so don't start a
 * timer.
 *
 * Burn rules:
 *      potions of oil, lamps & candles: age = # of turns of fuel left
 *      magic lamps: spe = 0 not lightable, 1 lightable forever
 *      candelabrum: age = turns of fuel left, spe = # of candles
 *
 * This is a "silent" routine - it should not print anything out.
 */
export function begin_burn(obj, already_lit) {
    let radius = 3;
    let turns = 0;
    let do_timer = true;

    /* C:1717-1718 */
    if (obj.age === 0 && (obj.otyp | 0) !== BURN_MAGIC_LAMP
        && !artifact_light(obj))
        return;

    switch (obj.otyp | 0) {
    case BURN_MAGIC_LAMP:
        /* C:1721-1724 */
        obj.lamplit = 1;
        do_timer = false;
        break;

    case BURN_POT_OIL:
        /* C:1726-1732 */
        turns = obj.age;
        if (obj.odiluted)
            turns = Math.trunc((3 * turns + 2) / 4);
        radius = 1; /* very dim light */
        break;

    case BURN_BRASS_LANTERN:
    case BURN_OIL_LAMP:
        /* C:1734-1748 — magic times are 150, 100, 50, 25, and 0 */
        if (obj.age > 150)
            turns = obj.age - 150;
        else if (obj.age > 100)
            turns = obj.age - 100;
        else if (obj.age > 50)
            turns = obj.age - 50;
        else if (obj.age > 25)
            turns = obj.age - 25;
        else
            turns = obj.age;
        break;

    case BURN_CANDELABRUM:
    case BURN_TALLOW_CANDLE:
    case BURN_WAX_CANDLE:
        /* C:1750-1760 — magic times are 75, 15, and 0 */
        if (obj.age > 75)
            turns = obj.age - 75;
        else if (obj.age > 15)
            turns = obj.age - 15;
        else
            turns = obj.age;
        radius = candle_light_range(obj);
        break;

    default:
        /* C:1762-1772 — [ALI] Support artifact light sources */
        if (artifact_light(obj)) {
            obj.lamplit = 1;
            do_timer = false;
            radius = arti_light_radius(obj);
        } else {
            impossible_sync('begin burn: unexpected %s', xname(obj));
            turns = obj.age;
        }
        break;
    }

    /* C:1775-1786 */
    if (do_timer) {
        if (start_timer(turns, TIMER_OBJECT, BURN_OBJECT, obj_to_any(obj))) {
            obj.lamplit = 1;
            obj.age -= turns;
            if (burn_carried(obj) && !already_lit)
                update_inventory();
        } else {
            obj.lamplit = 0;
        }
    } else {
        if (burn_carried(obj) && !already_lit)
            update_inventory();
    }

    /* C:1788-1798 */
    if (obj.lamplit && !already_lit) {
        const x = { value: 0 }, y = { value: 0 };

        if (get_obj_location(obj, x, y, CONTAINED_TOO | BURIED_TOO))
            new_light_source(x.value, y.value, radius, LS_OBJECT,
                             obj_to_any(obj));
        else
            impossible_sync("begin_burn: can't get obj position");
    }
}

function cleanup_burn(arg, expire_time) {
    const obj = arg.a_obj;

    /* C:1832-1835 — impossible("cleanup_burn: obj %s not lit"); return. */
    if (!obj.lamplit) {
        impossible_sync('cleanup_burn: obj %s not lit', xname(obj));
        return;
    }

    del_light_source(LS_OBJECT, obj_to_any(obj));
    /* C:1838-1839 — restore unused time */
    obj.age = (obj.age | 0) + ((expire_time | 0) - curmoves());
    obj.lamplit = 0;

    /* C:1842-1843.  burn_carried() is this file's OBJ_INVENT test (js/timeout.js:1660):
     * it keeps C's `obj->where == OBJ_INVENT` and ADDS a gi.invent walk, because
     * this port does not stamp obj.where on every inventory path — the same
     * reason js/cmd.js:345 Shk_Your walks the chain. */
    if (burn_carried(obj))
        update_inventory();
}

/*
 * C ref: timeout.c:1801-1823.  Stop a burn timeout on the given object if a
 * timer is attached.  Darken light source.
 */
export function end_burn(obj, timer_attached) {
    /* C:1806-1809 — impossible("end_burn: obj %s not lit"); return. */
    if (!obj.lamplit) {
        impossible_sync('end_burn: obj %s not lit', xname(obj));
        return;
    }

    /* C:1811-1812 */
    if ((obj.otyp | 0) === MAGIC_LAMP || artifact_light(obj))
        timer_attached = false;

    if (!timer_attached) {
        /* C:1814-1820 — [DS] Cleanup explicitly, since timer cleanup won't
         * happen. */
        del_light_source(LS_OBJECT, obj_to_any(obj));
        obj.lamplit = 0;
        if (burn_carried(obj))
            update_inventory();
    } else if (!stop_timer(BURN_OBJECT, obj_to_any(obj))) {
        impossible_sync('end_burn: obj %s not timed!', xname(obj));
    }
}

// C timeout.c:653-664, before the timed-property countdown loop.
export async function nh_timeout_spell_protection() {
    const u = game.u;
    if (u.usptime && --u.usptime === 0 && u.uspellprot) {
        u.usptime = u.uspmtime;
        u.uspellprot--;
        find_ac();
        if (!Blind())
            await Norep(`The ${hcolor('golden')} haze around you ${u.uspellprot ? 'becomes less dense' : 'disappears'}.`);
    }
}

const M1_NOLIMBS = 0x6000; /* C mondata.h:73 M1_NOLIMBS */
const nolimbs = (ptr) => (((ptr?.mflags1 | 0) & M1_NOLIMBS) === M1_NOLIMBS);

const _STONED_TEXTS = ['You are slowing down.', 'Your limbs are stiffening.',
    'Your limbs have turned to stone.', 'You have turned to stone.',
    'You are a statue.'];

/* C timeout.c:137 stoned_dialogue(), called from nh_timeout (timeout.c:624)
 * before the generic property countdown.  Ends with exercise(A_DEX, FALSE). */
export async function stoned_dialogue() {
    const u = game.u;
    const i = (u.uprops?.[STONED]?.intrinsic | 0) & TIMEOUT;
    /* C timeout.c:141-148: if (i > 0L && i <= SIZE(stoned_texts)) */
    if (i > 0 && i <= _STONED_TEXTS.length) {
        let buf = _STONED_TEXTS[_STONED_TEXTS.length - i];
        if (nolimbs(game.youmonst?.data) && buf.includes('limbs'))
            buf = buf.replace('limbs', 'extremities'); /* C timeout.c:146 strsubst */
        await urgent_pline(buf);
        /* nh_timeout runs AFTER the HEAD svm.moves++ (allmain.c:257, timeout.c:624),
         * so a --More-- this pline raises freezes T: at the CURRENT svm.moves, not
         * the movemon-turn tag (moves-1) left by an earlier turn's pending line. */
        if (game._pending_message) game._movemonMsgTurn = game.moves | 0;
    }
    switch (i) {
    case 5:
        u.uprops[FAST_PROP].intrinsic = 0; /* HFast = 0L */
        if ((game.multi | 0) > 0) nomul(0);
        break;
    case 4:
        if (!Popeye(STONED)) await stop_occupation();
        if ((game.multi | 0) > 0) nomul(0);
        break;
    case 3:
        await stop_occupation();
        nomul(-3);
        game.multi_reason = 'getting stoned';
        game.nomovemsg = 'You can move again.';
        if (_uprop_on(WOUNDED_LEGS_PROP) && !u.usteed) heal_legs(2);
        break;
    case 2: {
        const hd = u.uprops?.[DEAF_PROP];
        const t = ((hd?.intrinsic | 0) | (u.HDeaf | 0)) & TIMEOUT;
        if (t > 0 && t < 5) { // C timeout.c:173-174: set the live HDeaf timer too.
            if (hd) hd.intrinsic = ((hd.intrinsic | 0) & ~TIMEOUT) | 5;
            u.HDeaf = ((u.HDeaf | 0) & ~TIMEOUT) | 5;
        }
        if (_uprop_on(VOMITING)) await make_vomiting(0, false);
        if (_uprop_on(SLIMED_PROP)) await make_slimed(0, null);
        break;
    }
    default:
        break;
    }
    exercise(A_DEX, false);
}

const _SLIME_TEXTS = ['You are turning a little %s.', 'Your limbs are getting oozy.',
    'Your skin begins to peel away.', 'You are turning into %s.',
    'You have become %s.'];

/* C timeout.c:389 slime_dialogue(), called from nh_timeout (timeout.c:626)
 * after stoned_dialogue.  Ends with exercise(A_DEX, FALSE). */
export async function slime_dialogue() {
    const u = game.u;
    const t = (u.uprops?.[SLIMED_PROP]?.intrinsic | 0) & TIMEOUT;
    const i = Math.trunc(t / 2);
    if (t === 1) {
        game.youmonst.m_ap_type = M_AP_MONSTER;
        game.youmonst.mappearance = PM_GREEN_SLIME_E;
        newsym(u.ux, u.uy);
    }
    /* C timeout.c:406-411 */
    if ((t % 2) !== 0 && i >= 0 && i < _SLIME_TEXTS.length) {
        let buf = _SLIME_TEXTS[_SLIME_TEXTS.length - i - 1];
        if (nolimbs(game.youmonst?.data) && buf.includes('limbs'))
            buf = buf.replace('limbs', 'extremities'); /* C timeout.c:409 strsubst */
        if (buf.includes('%s')) {
            if (i === 4) { /* "you are turning green" */
                if (!_eat_Blind()) await urgent_pline(buf.replace('%s', hcolor('green')));
            } else {
                await urgent_pline(buf.replace('%s',
                    an_eat(_eat_Hallucination() ? rndmonnam(null) : 'green slime')));
            }
        } else {
            await urgent_pline(buf);
        }
    }
    switch (i) {
    case 3:
        u.uprops[FAST_PROP].intrinsic = 0; /* HFast = 0L */
        if (!Popeye(SLIMED_PROP)) await stop_occupation();
        if ((game.multi | 0) > 0) nomul(0);
        break;
    case 2: {
        const hd = u.uprops?.[DEAF_PROP];
        const dt = ((hd?.intrinsic | 0) | (u.HDeaf | 0)) & TIMEOUT;
        if (dt > 0 && dt < 5) { // C timeout.c:433-434: avoid hearing again too soon.
            if (hd) hd.intrinsic = ((hd.intrinsic | 0) & ~TIMEOUT) | 5;
            u.HDeaf = ((u.HDeaf | 0) & ~TIMEOUT) | 5;
        }
        break;
    }
    case 1:
        if (_uprop_on(STONED)) await make_stoned(0, null, KILLED_BY_AN, null);
        break;
    }
    exercise(A_DEX, false);
}

export async function burn_away_slime() {
    const p = game.u?.uprops?.[SLIMED];
    if (p?.intrinsic | 0)
        await make_slimed(0, 'The slime that covers you is burned away!');
}

/* C timeout.c:1204-1220 attach_fig_transform_timeout(). */
export function attach_fig_transform_timeout(obj) {
    stop_timer(FIG_TRANSFORM, obj_to_any(obj));
    start_timer(rnd(9000) + 200, TIMER_OBJECT, FIG_TRANSFORM, obj_to_any(obj));
}

/* C ref: timeout.c:2011-2030 print_queue() — lines for one timer chain.
 * fmt_ptr() prints a host address no replay can reproduce; stand-in used. */
const _TIMER_KINDS = ['none', 'level', 'global', 'object', 'monster'];

const _TIMER_FUNC_NAMES = ['rot_organic', 'rot_corpse', 'revive_mon', 'zombify_mon',
    'burn_object', 'hatch_egg', 'fig_transform', 'shrink_glob', 'melt_ice_away'];

function _print_queue_lines(base) {
    if (!base) return [' <empty>'];
    const lines = ['timeout  id   kind   call'];
    for (let curr = base; curr; curr = curr.next) {
        const o = curr.arg?.a_obj;
        // C timeout.c:2028 reads the anything union as a_void even when
        // zap.c:5107-5109 stored packed coordinates in a_long.  fmt_ptr's
        // %p (alloc.c:102) prints those bits without leading zero padding.
        const ptr = curr.arg?.a_long != null
            ? '0x' + BigInt.asUintN(64, BigInt(curr.arg.a_long)).toString(16)
            : '<ptr>';
        lines.push(' ' + String(curr.timeout).padStart(4) + '   ' + String(curr.tid).padStart(4)
                   + '  ' + (_TIMER_KINDS[curr.kind] ?? 'unknown').padEnd(6) + ' '
                   + _TIMER_FUNC_NAMES[curr.func_index] + '(' + ptr + ')');
    }
    return lines;
}

/* C ref: region.c:673-710 visible_region_summary() — lines instead of putstr. */
function _visible_region_summary_lines() {
    const lines = [];
    const fldsep = game.iflags?.menu_tab_sep ? '\t' : '  ';
    for (const reg of region_stats_snapshot().regions) {
        if (!reg.visible || reg.ttl === -2) continue;
        if (!lines.length) lines.push('', 'Visible regions');
        const damg = reg.arg?.a_int | 0;
        const typbuf = damg ? `poison gas (${damg})` : 'vapor';
        const bb = reg.bounding_box;
        lines.push(String(reg.ttl + 1).padStart(5) + fldsep + typbuf.padEnd(16)
                   + fldsep + `@[${bb.lx},${bb.ly}..${bb.hx},${bb.hy}]`);
    }
    return lines;
}

/* C ref: timeout.c:2040-2150 wiz_timeout_queue() — the #timeout command: a
 * corner text window; no turn, no RNG. */
export async function wiz_timeout_queue() {
    const g = game;
    const u = g.u;
    const TIMEOUT = 0x00FFFFFF;
    const COLD_RES_ID = COLD_RES;
    const lines = [`Current time = ${g.moves | 0}.`, '', 'Active timeout queue:', ''];
    lines.push(..._print_queue_lines(g.gt?.timer_base ?? null));
    let count = 0, longestlen = 0, specindx = 0;
    for (let i = 0; ; ++i) {
        const [p, propname] = property_by_index(i);
        if (!propname) break;
        const intrinsic = u.uprops[p].intrinsic | 0;
        if (intrinsic & TIMEOUT) {
            ++count;
            if (propname.length > longestlen) longestlen = propname.length;
        }
        if (specindx === 0 && p === COLD_RES_ID) specindx = i;
    }
    lines.push('');
    if (!count) {
        lines.push('No timed properties.');
    } else {
        lines.push('Timed properties:', '');
        for (let i = 0; ; ++i) {
            const [p, propname] = property_by_index(i);
            if (!propname) break;
            const intrinsic = u.uprops[p].intrinsic | 0;
            if (intrinsic & TIMEOUT) {
                if (specindx > 0 && i >= specindx) {
                    lines.push(' -- settable via #wizintrinsic only --');
                    specindx = 0;
                }
                lines.push(' ' + propname.padEnd(longestlen) + ' ' + String(intrinsic & TIMEOUT).padStart(4));
            }
        }
    }
    if (u.uswldtim) {
        lines.push('', `Swallow countdown is ${u.uswldtim >>> 0}.`);
    }
    if (u.uinvault) {
        lines.push('', `Vault counter is ${u.uinvault | 0}.`);
    }
    if (any_visible_region())
        lines.push(..._visible_region_summary_lines());
    const stasis = g.level?.flags?.stasis_until | 0;
    if (stasis >= (g.moves | 0)) {
        const left = stasis - (g.moves | 0);
        lines.push('', `Level is no-teleport for ${left + 1} ${left > 0 ? 'turns' : 'more turn'}.`);
    }
    await displayLookWindow(lines); /* NHW_MENU corner window (timeout.c:2049) */
    return ECMD_OK;
}

/* C timeout.c:1009-1016 — prevent an egg from hatching by cancelling its
 * object timer.  The timer API owns the timed-count bookkeeping. */
export function kill_egg(obj) {
    if (obj)
        stop_timer(HATCH_EGG, obj_to_any(obj));
}

/* C timeout.c:354 SIZE(levi_texts) */
const SIZE_LEVI_TEXTS = 2;

/* C timeout.c:347-378 — the last two warnings before timed descent. */
export async function levitation_dialogue() {
    const u = game.u;
    const p = u.uprops[LEVITATION];
    const timeout = (p.intrinsic | 0) & TIMEOUT;
    if (p.extrinsic)
        return;
    const poolOrLava = is_pool_or_lava(u.ux, u.uy);
    if (!ACCESSIBLE(game.level?.at(u.ux, u.uy)?.typ ?? 0) && !poolOrLava)
        return;
    const i = Math.trunc((timeout - 1) / 2);
    if ((timeout % 2) && i > 0 && i <= SIZE_LEVI_TEXTS) {
        if (i === 2) {
            await pline('You float slightly lower.');
        } else {
            const danger = poolOrLava && !Is_waterlevel(u.uz);
            await urgent_pline(`You wobble unsteadily ${danger ? 'over' : 'in'} the ${danger ? surface(u.ux, u.uy) : 'air'}.`);
        }
        await stop_occupation();
    }
}

/* C mbodypart() part index (hack.h BP_* enum): FOOT.  js/cmd.js body_part()
 * takes the same index; 5 is the value its own local FOOT const carries. */
const FOOT_AM = 5;

/* objects[] index of "corpse", from js/oc_name_data.js's OC_NAME table —
 * objects.h is an X-macro file with no `#define CORPSE` text to grep. */
const CORPSE_AM = 265;

/* objects.h ROCK */
const ROCK = 474;

export async function slip_or_trip() {
    const g = game;
    const u = g.u;
    /* C hack.c vobj_at(x,y) — the head of the tile's nexthere chain. */
    let otmp = (g.level?.levelObjects?.[u.ux | 0]?.[u.uy | 0]) ?? null;
    const on_foot = !u.usteed;
    if (otmp && on_foot && !u.uinwater && is_pool(u.ux | 0, u.uy | 0))
        otmp = null;
    if (otmp && on_foot) {
        /* C timeout.c:1232-1247 — trip over something in particular. The PLNMSG_ONE_ITEM_HERE pronoun arm reads g.iflags.last_msg, matching C timeout.c:1240. */
        const oneItem = (g.iflags?.last_msg | 0) === PLNMSG_ONE_ITEM_HERE;
        let what;
        if (oneItem) {
            what = (otmp.quan | 0) === 1
                ? 'it' : (_fumble_hallucinating() ? 'they' : 'them');
        } else if ((otmp.dknown | 0) || !Blind()) {
            what = (await doname(otmp));
        } else {
            /* C timeout.c:1238-1246 — when the top object is unseen,
             * identify a visible rock if present, otherwise say “something”. */
            let rock = null;
            for (let o = otmp; o; o = o.nexthere) {
                if ((o.otyp | 0) === ROCK) {
                    rock = o;
                    break;
                }
            }
            what = rock ? ((rock.quan | 0) === 1 ? 'a rock' : 'some rocks')
                        : 'something';
        }
        if (_fumble_hallucinating()) {
            const cap = upstart(what);
            await pline(`Egads!  ${cap} bite${(!otmp || (otmp.quan | 0) === 1) ? 's' : ''} your ${body_part(FOOT_AM)}!`);
        } else {
            await pline(`You trip over ${what}.`);
        }
        /* C timeout.c:1256-1261 — a bare-footed hero who trips over a
         * cockatrice/chickatrice corpse petrifies immediately. */
        if (!u.uarmf && (otmp.otyp | 0) === CORPSE_AM
            && ((otmp.corpsenm | 0) === PM_COCKATRICE
                || (otmp.corpsenm | 0) === PM_CHICKATRICE)
            && !((u.uprops?.[STONE_RES]?.intrinsic | 0)
                 || (u.uprops?.[STONE_RES]?.extrinsic | 0))) {
            // C sets the name even when instapetrify turns a golem to stone.
            const killer = (g.svk ||= {}).killer ||= { id: 0, format: 0, name: '', next: null };
            killer.name = `tripping over ${an(monPmname(otmp.corpsenm, PROPS.NEUTRAL))} corpse`;
            await instapetrify(killer.name);
        }
        return;
    }
    const HFumbling = (u.uprops?.[FUMBLING]?.intrinsic | 0);
    if ((HFumbling & FROMOUTSIDE) || (is_ice(u.ux | 0, u.uy | 0) && !rn2(3))) {
        /* C timeout.c:1262-1298 — the ice branch. */
        const slipslide = rn2(2) ? 'slip' : 'slide';
        const currentlyIce = is_ice(u.ux | 0, u.uy | 0);
        /* C timeout.c:1271-1284 — the message names the steed when mounted,
         * then a non-cursed saddle may throw the rider. */
        if (on_foot) {
            await pline(`You ${slipslide}${currentlyIce ? ' on' : ' off'} the ice.`);
        } else {
            /* C uses upstart(x_monnam(steed, ARTICLE_THE, ...,
             * SUPPRESS_SADDLE, FALSE)); retain its naming and hallucination
             * behavior rather than reading the raw mname field. */
            const rawSteedName = x_monnam(u.usteed, ARTICLE_THE, null,
                                         SUPPRESS_SADDLE, false);
            const steedName = upstart(rawSteedName);
            await pline(`${steedName} ${slipslide}${currentlyIce ? 's on' : 's off'} the ice.`);
            const saddle = which_armor(u.usteed, W_SADDLE);
            const extrinsicFumbling = u.uprops?.[FUMBLING]?.extrinsic | 0;
            const iceOnly = !(extrinsicFumbling || (HFumbling & ~FROMOUTSIDE));
            if ((!saddle || !saddle.cursed)
                && (!iceOnly || !rn2(3))) {
                await pline('You lose your balance.');
                await dismount_steed(DISMOUNT_FELL);
                return;
            }
            /* If a cursed saddle holds the rider, C continues to the ordinary
             * slip-risk test below. */
        }
        if (!rn2(10 + (acurr(u, A_DEX) | 0))) {
            /* C timeout.c:1294-1298 — force a confused direction, then hurtle
             * unless that direction would simply return to the square occupied
             * before this move.  confdir() owns the canonical direction RNG. */
            const ux0 = u.ux0 | 0;
            const uy0 = u.uy0 | 0;
            if ((u.umonnum | 0) !== PM_GRID_BUG)
                confdir(true);
            if ((u.ux | 0) + (u.dx | 0) !== ux0
                || (u.uy | 0) + (u.dy | 0) !== uy0)
                await hurtle(u.dx | 0, u.dy | 0, 1, false);
        }
        return;
    }
    if (!on_foot) {
        /* C timeout.c:1321-1340 — a mounted hero fumbles in the saddle.
         * A cursed saddle keeps the rider mounted and consumes no message
         * RNG beyond the switch; otherwise the fall dismounts afterward. */
        const saddle = which_armor(u.usteed, W_SADDLE);
        if (!saddle || !saddle.cursed) {
            switch (rn2(4)) {
            case 1:
                await pline(`Your ${makeplural(body_part(FOOT_AM))} slip out of the stirrups.`);
                break;
            case 2:
                await pline('You let go of the reins.');
                break;
            case 3:
                await pline('You bang into the saddle-horn.');
                break;
            default:
                await pline('You slide to one side of the saddle.');
                break;
            }
            await dismount_steed(DISMOUNT_FELL);
        }
        return;
    }
    /* C timeout.c:1300-1317 — `switch (rn2(4)`. */
    const halluc = _fumble_hallucinating();
    switch (rn2(4)) {
    case 1:
        await pline(`You trip over your own ${halluc ? 'elbow' : makeplural(body_part(FOOT_AM))}.`);
        break;
    case 2:
        await pline(`You slip ${halluc ? 'on a banana peel' : 'and nearly fall'}.`);
        break;
    case 3:
        await pline('You flounder.');
        break;
    default:
        await pline('You stumble.');
        break;
    }
}
