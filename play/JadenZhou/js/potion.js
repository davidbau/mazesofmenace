// potion.js -- quaffing potions, potion vapors, and potions hitting things.
// C ref: potion.c
//
// Ported: the intrinsic timeout setters (set_itimeout(), incr_itimeout(),
// make_confused(), make_stunned(), make_sick(), make_slimed(),
// make_stoned(), make_vomiting(), make_blinded(), make_hallucinated(),
// make_deaf(), make_glib()), self_invis_message(), ghost_from_bottle(),
// drink_ok(), dodrink(), dopotion(), peffects() and every peffect_*()
// (paths that reach unported code throw 'not ported yet'), healup(),
// strange_feeling(), bottlename(), potionhit(), potionbreathe(),
// djinni_from_bottle(), split_mon() (stops), speed_up(); plus the small
// helpers they need from other files (end.c delayed_killer(),
// find_delayed_killer(), dealloc_killer(); do.c trycall(); do_name.c
// docall(), hliquid(); objnam.c fruitname(); apply.c
// unfixable_trouble_count(); exper.c rndexp(); wizard.c aggravate();
// display.c set_mimic_blocking(), see_objects(), see_traps(); eat.c
// eatmupdate()).  Dipping into water (H2Opotion_dip()) is not ported yet.

import { DEADMONSTER } from './mon.js';
import { resists_poison, breathless, is_silent, has_head, is_human, likes_fire,
         resists_acid, eyecount } from './mondata.js';
import { game } from './gstate.js';
import { rn2, rnd, rn1, rnl, d, ROLL_FROM, rn2_on_display_rng } from './rng.js';
import { swallowed, verbalize, see_objects, see_traps } from './display.js';
import { pline, You, Your, You_feel, pline_The, newsym, see_monsters,
         canseemon, canspotmon, map_invisible, flush_screen,
         glyph_at, glyph_is_invisible, unmap_object, tmp_at, DISP_ALWAYS,
         DISP_END } from './display.js';
import { getobj, useup, obfree, hands_obj } from './invent.js';
/* potion_dip() */
import { body_part as body_part_pd } from './insight.js';
import { HAND as HAND_PD } from './const.js';
import { POT_WATER as POT_WATER_PD, POT_POLYMORPH as POT_POLYMORPH_PD,
         POT_ACID as POT_ACID_PD, POT_SICKNESS as POT_SICKNESS_PD,
         POT_HEALING as POT_HEALING_PD, POT_EXTRA_HEALING as POT_EXTRA_HEALING_PD,
         POT_FULL_HEALING as POT_FULL_HEALING_PD, POT_OIL as POT_OIL_PD,
         CORPSE as CORPSE_PD, UNICORN_HORN as UNICORN_HORN_PD,
         AMETHYST as AMETHYST_PD, POTION_CLASS as POTION_CLASS_PD } from './objects.js';
import { PM_LICHEN as PM_LICHEN_PD } from './monsters.js';
import { The as The_pd, cxname as cxname_pd, otense as otense_pd } from './objnam.js';
import { the as the_pd } from './iactions.js';
import { hcolor as hcolor_pd } from './do_name.js';
import { is_poisonable as is_poisonable_pd,
         permapoisoned as permapoisoned_pd } from './mkobj.js';
/* C ref: color.h NH_RED, NH_ORANGE (hcolor() color names) */
const NH_RED_PD = "red", NH_ORANGE_PD = "orange";
import { ART_EYES_OF_THE_OVERWORLD } from './artilist.js';
import { undiscovered_artifact } from './artifact.js';
import { can_reach_floor } from './engrave.js';
import { GETOBJ_SUGGEST, GETOBJ_EXCLUDE, GETOBJ_EXCLUDE_NONINVENT,
         GETOBJ_NOFLAGS, ECMD_OK, ECMD_CANCEL, ECMD_TIME, STRANGLED,
         IS_FOUNTAIN, IS_SINK, GETOBJ_DOWNPLAY, GETOBJ_EXCLUDE_INACCESS,
         GETOBJ_PROMPT, GLIB } from './const.js';
import { inaccessible_equipment } from './do_wear.js';
import { is_pool } from './makemon.js';
import * as O from './objects.js';
import { objects, POTION_CLASS, COIN_CLASS, SPBOOK_CLASS } from './objects.js';
import { TIMEOUT, CONFUSION, STUNNED, VOMITING, BLINDED, DEAF, HALLUC,
         HALLUC_RES, FROMOUTSIDE, FAINTED, INTRINSIC, SICK, SICK_RES, SLIMED,
         STONED, INVIS, SEE_INVIS, FAST, LEVITATION, DETECT_MONSTERS,
         FREE_ACTION, FIXED_ABIL, SLEEP_RES, POISON_RES, ACID_RES, FIRE_RES,
         COLD_RES, UNCHANGING, ANTIMAGIC, WOUNDED_LEGS, SICK_ALL,
         POTHIT_HERO_THROW, POTHIT_OTHER_THROW, KILLED_BY, KILLED_BY_AN,
         NO_KILLER_PREFIX, HEAD, EYE, LEG, FOOT, A_STR, A_INT, A_WIS, A_DEX,
         A_CON, A_MAX, A_CHAOTIC, A_LAWFUL, M_SEEN_SLEEP, MAGICENLIGHTENMENT,
         ENL_GAMEINPROGRESS, MM_NOMSG, W_SADDLE, NOTELL, SHOPBASE, WEAK,
         LARGEST_INT, MAXULEV, G_GONE, NON_PM, COLNO, ROWNO, ARTICLE_THE,
         SUPPRESS_IT, SUPPRESS_SADDLE, STRAT_WAITFORU, STRAT_APPEARMSG,
         LOW_PM, FACE, HAND, PROT_FROM_SHAPE_CHANGERS, Is_airlevel,
         Is_waterlevel } from './const.js';
import { toggle_blindness } from './do_wear.js';
import { haseyes, mon_hates_blessings, is_were, is_vampshifter, dmgtype,
         Resists_Elem } from './mondata.js';
import * as M from './monsters.js';
import { mons, PM_GHOST, PM_DJINNI, PM_PESTILENCE, PM_GREMLIN,
         PM_IRON_GOLEM, PM_HEALER, AD_DISE, AD_PEST, AD_ACID } from './monsters.js';
import { exercise, adjattrib, ACURR, poisontell } from './attrib.js';
import { pluslvl, more_experienced, newuexp } from './exper.js';
import { newuhs } from './eat.js';
import { losehp, Maybe_Half_Phys, heal_legs, sleep_monst } from './trap.js';
import { bcsign, splitobj } from './mkobj.js';
import { remove_worn_item } from './steal.js';
import { objdescr_is, discover_object, makeknown } from './o_init.js';
import { body_part, enlightenment } from './insight.js';
import { nomul, in_rooms } from './hack.js';
import { fall_asleep } from './timeout.js';
import { monstseesu, monstunseesu, stagger } from './uhitm.js';
import { makemon } from './makemon.js';
import { Tobjnam, makeplural, makesingular, vtense, an, xname,
         doname } from './objnam.js';
import { mon_nam, Monnam, x_monnam, rndmonnam } from './do_name.js';
import { s_suffix, dist2, mungspaces, distu } from './hacklib.js';
import { cansee } from './vision.js';
import { healmon, wakeup, wake_nearto, killed, monkilled, mongone } from './mon.js';
import { makewish } from './wizcmds.js';
import { which_armor, mon_set_minvis, mon_adjust_speed } from './worn.js';
import { bhitm, resist, do_enlightenment_effect } from './zap.js';
import { mcureblindness } from './muse.js';
import { paralyze_monst, slept_monst } from './mhitm.js';
import { shop_keeper, subfrombill, stolen_value } from './shk.js';
import { tty_getlin } from './wintty.js';
import { safe_qbuf } from './pickup.js';
import { surface } from './iactions.js';
import { thesimpleoname as thesimpleoname_pt } from './iactions.js';
import { short_oname as short_oname_pt } from './objnam.js';
import { tty_display_nhwindow, tty_yn_function } from './wintty.js';
import { set_bc } from './ball.js';
import { float_vs_flight, polyself } from './polyself.js';
import { POLY_NOFLAGS, POLY_CONTROLLED, POLY_LOW_CTRL } from './const.js';
import { monster_detect, object_detect } from './detect.js';
import { drinkfountain, dipfountain, drinksink, dipsink, floating_above,
         wash_hands } from './fountain.js';
import { water_damage } from './trap.js';
import { waterbody_name } from './pager.js';
import { is_swimmer } from './mondata.js';
import { P_SKILL } from './weapon.js';
import { P_RIDING, P_BASIC } from './const.js';
import {
    Fire_resistance, Cold_resistance, Sleep_resistance, Poison_resistance, Antimagic,
    Acid_resistance, Sick_resistance, Stunned, Confusion, PermaBlind, Blindfolded, Blind, Sick,
    Stoned, Strangled, Vomiting, Glib, Slimed, Halluc_resistance, Hallucination, Deaf,
    Wounded_legs, See_invisible, Detect_monsters, BInvis, Invis, Invisible, Levitation,
    Underwater, Unchanging, Fast, Very_fast, Free_action, Fixed_abil, Unaware, Half_gas_damage
} from './youprop.js';
import { Upolyd, Role_if } from './const.js';
import { uprop } from './youprop.js';
import { yname } from './objnam.js';
import { useupall as useupall_pd, freeinv as freeinv_pd } from './invent.js';
import { simpleonames as simpleonames_pd, thesimpleoname as thesimpleoname_pd } from './iactions.js';
import { near_capacity as near_capacity_pd } from './hack.js';
import { costly_alteration as costly_alteration_pd, mkobj as mkobj_pd, fixup_oil as fixup_oil_pd,
         splitobj as splitobj_pd, obj_extract_self as obj_extract_self_pd } from './mkobj.js';
import { observe_object as observe_object_pd } from './o_init.js';
import { hold_another_object as hold_another_object_pd } from './wizcmds.js';
import { BOLT_LIM as BOLT_LIM_PD, COST_NUTRLZ as COST_NUTRLZ_PD,
         MOD_ENCUMBER as MOD_ENCUMBER_PD } from './const.js';
import { new_were, you_were, you_unwere, set_ulycn } from './were.js';
import { clone_mon as clone_mon_sm } from './makemon.js';
import { a_monnam as a_monnam_dj } from './do_name.js';
import { tamedog as tamedog_dj } from './dog.js';
import { set_malign as set_malign_dj } from './makemon.js';
import { NEUTRAL } from './const.js';
import { BLevitation as BLevitation_po } from './youprop.js';
import { float_up as float_up_po } from './trap.js';
import { I_SPECIAL as I_SPECIAL_PO } from './const.js';
import { stairway_at as stairway_at_po } from './display.js';
import { doup as doup_po } from './do.js';
import { has_ceiling as has_ceiling_po } from './insight.js';
import { ceiling as ceiling_po } from './dungeon.js';
import { In_W_tower } from './dungeon.js';
import { hard_helmet as hard_helmet_po } from './do_wear.js';
import { spoteffects as spoteffects_po } from './hack.js';

/* C ref: mondata.c defended() for &youmonst -- worn Grayswandir and the
   like aren't modeled here: only the polymorphed form's own defenses */
/* C ref: monst.h ismnum() */
function ismnum(x) { return x >= LOW_PM && x < M.NUMMONS; }
/* C ref: monst.h mon_perma_blind(), DEADMONSTER() */
function mon_perma_blind(mon) { return !mon.mcansee && !mon.mblinded; }
/* C ref: hack.h makeknown(), distu() */
/* C ref: decl.c c_common_strings */
const You_can_move_again = "You can move again.";
const vision_clears = "vision quickly clears.";
const something = "something";
const Something = "Something";

// C ref: potion.c itimeout()
/* force `val' to be within valid range for intrinsic timeout value */
export function itimeout(val) {
    if (val >= TIMEOUT)
        val = TIMEOUT;
    else if (val < 1)
        val = 0;
    return val;
}

// C ref: potion.c itimeout_incr()
/* increment `old' by `incr' and force result to be valid intrinsic timeout */
function itimeout_incr(old, incr) {
    return itimeout((old & TIMEOUT) + incr);
}

// C ref: potion.c set_itimeout() -- set the timeout field of intrinsic
// `which' (C passes &u.uprops[p].intrinsic; JS passes the property index)
export function set_itimeout(which, val) {
    const p = uprop(which);
    p.intrinsic &= ~TIMEOUT;
    p.intrinsic |= itimeout(val);
}

// C ref: potion.c incr_itimeout() -- increment the timeout field of
// intrinsic `which' (a property index)
export function incr_itimeout(which, incr) {
    set_itimeout(which, itimeout_incr(uprop(which).intrinsic, incr));
}

// C ref: potion.c make_confused()
export async function make_confused(xtime, talk) {
    const old = uprop(CONFUSION).intrinsic;

    if (Unaware())
        talk = false;

    if (!xtime && old) {
        if (talk)
            await You_feel(`less ${Hallucination() ? "trippy" : "confused"} now.`);
    }
    if ((xtime && !old) || (!xtime && old))
        game.disp_botl = true;

    set_itimeout(CONFUSION, xtime);
}

// C ref: potion.c make_stunned()
export async function make_stunned(xtime, talk) {
    const old = uprop(STUNNED).intrinsic;

    if (Unaware())
        talk = false;

    if (!xtime && old) {
        if (talk)
            await You_feel(`${Hallucination() ? "less wobbly" : "a bit steadier"} now.`);
    }
    if (xtime && !old) {
        if (talk) {
            if (game.u.usteed)
                await You("wobble in the saddle.");
            else
                await You(`${stagger(game.youmonst.data, "stagger")}...`);
        }
    }
    if ((!xtime && old) || (xtime && !old))
        game.disp_botl = true;

    set_itimeout(STUNNED, xtime);
}

// C ref: end.c delayed_killer() -- the delayed killer list hangs off
// game.killer.next (svk.killer.next)
function killer_head() {
    if (!game.killer)
        game.killer = { format: 0, name: '', next: null };
    return game.killer;
}
export function delayed_killer(id, format, killername) {
    let k = find_delayed_killer(id);

    if (!k) {
        /* no match, add a new delayed killer to the list */
        const head = killer_head();
        k = { id, format: 0, name: '', next: head.next || null };
        head.next = k;
    }

    k.format = format;
    k.name = (killername || '').slice(0, 256 - 1);
}

// C ref: end.c find_delayed_killer()
export function find_delayed_killer(id) {
    for (let k = game.killer?.next; k; k = k.next) {
        if (k.id === id)
            return k;
    }
    return null;
}

// C ref: end.c dealloc_killer()
export function dealloc_killer(kptr) {
    if (!kptr)
        return;
    let prev = killer_head();
    for (let k = prev.next; k; prev = k, k = k.next) {
        if (k === kptr) {
            prev.next = k.next;
            return;
        }
    }
    /* impossible("dealloc_killer (#%d) not on list", kptr->id) */
}

/* Sick is overloaded with both fatal illness and food poisoning (via
   u.usick_type bit mask), but delayed killer can only support one or
   the other at a time.  They should become separate intrinsics.... */
// C ref: potion.c make_sick()
export async function make_sick(xtime,
                                cause, /* sickness cause */
                                talk,
                                type) {
    const u = game.u;
    const old = Sick();

    if (xtime > 0) {
        if (Sick_resistance())
            return;
        if (!old) {
            /* newly sick */
            await You_feel("deathly sick.");
        } else {
            /* already sick */
            if (talk)
                await You_feel(`${xtime <= Math.trunc(Sick() / 2) ? "much" : "even"} worse.`);
        }
        set_itimeout(SICK, xtime);
        u.usick_type = (u.usick_type || 0) | type;
        game.disp_botl = true;
    } else if (old && (type & u.usick_type)) {
        /* was sick, now not */
        u.usick_type &= ~type;
        if (u.usick_type) { /* only partly cured */
            if (talk)
                await You_feel("somewhat better.");
            set_itimeout(SICK, Sick() * 2); /* approximation */
        } else {
            if (talk)
                await You_feel("cured.  What a relief!");
            uprop(SICK).intrinsic = 0; /* set_itimeout(&Sick, 0L) */
        }
        game.disp_botl = true;
    }

    const kptr = find_delayed_killer(SICK);
    if (Sick()) {
        await exercise(A_CON, false);
        /* setting delayed_killer used to be unconditional, but that's
           not right when make_sick(0) is called to cure food poisoning
           if hero was also fatally ill; this is only approximate */
        if (xtime || !old || !kptr) {
            const kpfx = ((cause && cause === "#wizintrinsic")
                          ? KILLED_BY : KILLED_BY_AN);

            delayed_killer(SICK, kpfx, cause);
        }
    } else
        dealloc_killer(kptr);
}

// C ref: potion.c make_slimed()
export async function make_slimed(xtime, msg) {
    const old = Slimed();

    set_itimeout(SLIMED, xtime);
    if ((xtime !== 0) !== (old !== 0)) {
        game.disp_botl = true;
        if (msg)
            await pline(msg);
    }
    if (!Slimed()) {
        dealloc_killer(find_delayed_killer(SLIMED));
        /* fake appearance is set late in turn-to-slime countdown */
        if (game.youmonst.m_ap_type === 3 /* M_AP_MONSTER */
            && game.youmonst.mappearance === M.PM_GREEN_SLIME) {
            game.youmonst.m_ap_type = 0; /* M_AP_NOTHING */
            game.youmonst.mappearance = 0;
        }
    }
}

// C ref: potion.c make_stoned() -- start or stop petrification
export async function make_stoned(xtime, msg, killedby, killername) {
    const old = Stoned();

    set_itimeout(STONED, xtime);
    if ((xtime !== 0) !== (old !== 0)) {
        game.disp_botl = true;
        if (msg)
            await pline(msg);
    }
    if (!Stoned())
        dealloc_killer(find_delayed_killer(STONED));
    else if (!old)
        delayed_killer(STONED, killedby, killername);
}

// C ref: potion.c make_vomiting()
export async function make_vomiting(xtime, talk) {
    const old = Vomiting();

    if (Unaware())
        talk = false;

    set_itimeout(VOMITING, xtime);
    game.disp_botl = true;
    if (!xtime && old)
        if (talk)
            await You_feel("much less nauseated now.");
}

const vismsg = (a, b) => `vision seems to ${a} for a moment but is ${b} now.`;
const eyemsg = (a, b) => `${a} momentarily ${b}.`;

// C ref: potion.c make_blinded()
export async function make_blinded(xtime, talk) {
    const old = uprop(BLINDED).intrinsic & TIMEOUT; /* BlindedTimeout */
    let eyes;

    /* we probe ahead in case the Eyes of the Overworld
       are or will be overriding blindness */
    const u_could_see = !Blind();
    set_itimeout(BLINDED, xtime ? 1 : 0);
    const can_see_now = !Blind();
    set_itimeout(BLINDED, old);

    if (Unaware())
        talk = false;

    if (can_see_now && !u_could_see) { /* regaining sight */
        if (talk) {
            if (Hallucination())
                await pline("Far out!  Everything is all cosmic again!");
            else
                await You("can see again.");
        }
    } else if (old && !xtime) {
        /* clearing temporary blindness without toggling blindness */
        if (talk) {
            if (!haseyes(game.youmonst.data) || PermaBlind()) {
                await strange_feeling(null, null);
            } else if (Blindfolded()) {
                eyes = body_part(EYE);
                if (eyecount(game.youmonst.data) !== 1)
                    eyes = makeplural(eyes);
                await Your(eyemsg(eyes, vtense(eyes, "itch")));
            } else { /* Eyes of the Overworld */
                await Your(vismsg("brighten", Hallucination() ? "sadder" : "normal"));
            }
        }
    }

    if (u_could_see && !can_see_now) { /* losing sight */
        if (talk) {
            if (Hallucination())
                await pline("Oh, bummer!  Everything is dark!  Help!");
            else
                await pline("A cloud of darkness falls upon you.");
        }
        /* Before the hero goes blind, set the ball&chain variables. */
        if (game.uball) /* Punished */
            set_bc(0);
    } else if (!old && xtime) {
        /* setting temporary blindness without toggling blindness */
        if (talk) {
            if (!haseyes(game.youmonst.data) || PermaBlind()) {
                await strange_feeling(null, null);
            } else if (Blindfolded()) {
                eyes = body_part(EYE);
                if (eyecount(game.youmonst.data) !== 1)
                    eyes = makeplural(eyes);
                await Your(eyemsg(eyes, vtense(eyes, "twitch")));
            } else { /* Eyes of the Overworld */
                await Your(vismsg("dim", Hallucination() ? "happier" : "normal"));
            }
        }
    }

    set_itimeout(BLINDED, xtime);

    if (u_could_see !== can_see_now) { /* one or the other but not both */
        await toggle_blindness();
    }
}

// C ref: eat.c eatmupdate() -- update the "mimicking's over" message
// when hallucination changes while mimicking after eating a mimic
function eatmupdate() {
    if (!game.eatmbuf || game.nomovemsg !== game.eatmbuf)
        return;
    throw new Error('eatmupdate(): mimicking an orange/gold not ported yet');
}

// C ref: potion.c make_hallucinated()
export async function make_hallucinated(
    xtime,   /* nonzero if this is an attempt to turn on hallucination */
    talk,
    mask) {  /* nonzero if resistance status should change by mask */
    const old = uprop(HALLUC).intrinsic;
    let changed = false;

    if (Unaware())
        talk = false;

    const message = (!xtime) ? "Everything %s SO boring now."
                             : "Oh wow!  Everything %s so cosmic!";
    const verb = (!Blind()) ? "looks" : "feels";

    if (mask) {
        if (uprop(HALLUC).intrinsic)
            changed = true;

        if (!xtime)
            uprop(HALLUC_RES).extrinsic |= mask;
        else
            uprop(HALLUC_RES).extrinsic &= ~mask;
    } else {
        if (!uprop(HALLUC_RES).extrinsic && (!!uprop(HALLUC).intrinsic !== !!xtime))
            changed = true;
        set_itimeout(HALLUC, xtime);

        /* clearing temporary hallucination without toggling vision */
        if (!changed && !uprop(HALLUC).intrinsic && old && talk) {
            if (!haseyes(game.youmonst.data)) {
                await strange_feeling(null, null);
            } else if (Blind()) {
                let eyes = body_part(EYE);

                if (eyecount(game.youmonst.data) !== 1)
                    eyes = makeplural(eyes);
                await Your(eyemsg(eyes, vtense(eyes, "itch")));
            } else { /* Grayswandir */
                await Your(vismsg("flatten", "normal"));
            }
        }
    }

    if (changed) {
        /* in case we're mimicking an orange (hallucinatory form
           of mimicking gold) update the mimicking's-over message */
        if (!Hallucination())
            eatmupdate();

        if (game.u.uswallow) {
            await swallowed(0); /* redraw swallow display */
        } else {
            /* The see_* routines should be called *before* the pline. */
            see_monsters();
            see_objects();
            see_traps();
        }

        /* update_inventory(): no perm_invent */

        game.disp_botl = true;
        if (talk)
            await pline(message.replace('%s', verb));
    }
    return changed;
}

// C ref: potion.c make_deaf()
export async function make_deaf(xtime, talk) {
    const old = uprop(DEAF).intrinsic;

    if (Unaware())
        talk = false;

    set_itimeout(DEAF, xtime);
    if ((xtime !== 0) !== (old !== 0)) {
        game.disp_botl = true;
        if (talk)
            await You(old && !Deaf() ? "can hear again."
                                     : "are unable to hear anything.");
    }
}

// C ref: potion.c make_glib() -- set or clear "slippery fingers"
export function make_glib(xtime) {
    if ((!Glib()) !== (!!xtime))
        game.disp_botl = true; /* disp.botl |= (!Glib ^ !!xtime) */
    set_itimeout(GLIB, xtime);
    /* may change "(being worn)" to "(being worn; slippery)" or vice versa;
       if (uarmg) update_inventory(): no perm_invent */
}

// C ref: potion.c self_invis_message()
export async function self_invis_message() {
    await pline(`${Hallucination() ? "Far out, man!  You"
                                   : "Gee!  All of a sudden, you"} ${
                   See_invisible() ? "can see right through yourself"
                                   : "can't see yourself"}.`);
}

// C ref: potion.c ghost_from_bottle()
async function ghost_from_bottle() {
    const u = game.u;
    const mtmp = makemon(mons[PM_GHOST], u.ux, u.uy, MM_NOMSG);

    if (!mtmp) {
        await pline("This bottle turns out to be empty.");
        return;
    }
    if (Blind()) {
        await pline(`As you open the bottle, ${something} emerges.`);
        return;
    }
    await pline(`As you open the bottle, an enormous ${
        Hallucination() ? rndmonnam(null) : "ghost"} emerges!`);
    if (game.flags.verbose)
        await You("are frightened to death, and unable to move.");
    nomul(-3);
    game.multi_reason = "being frightened to death";
    game.nomovemsg = "You regain your composure.";
}

let drink_ok_extra = 0;

// C ref: potion.c drink_ok() -- getobj callback for object to drink from
function drink_ok(obj) {
    /* getobj()'s callback to test whether hands/self is a valid "item" to
       pick is used here to communicate the fact that player has already
       passed up an opportunity to perform the action (drink or dip) on a
       non-inventory dungeon feature */
    if (!obj)
        return drink_ok_extra ? GETOBJ_EXCLUDE_NONINVENT : GETOBJ_EXCLUDE;

    if (obj.oclass === POTION_CLASS)
        return GETOBJ_SUGGEST;

    return GETOBJ_EXCLUDE;
}

/* C ref: hack.h POTION_OCCUPANT_CHANCE() */
function POTION_OCCUPANT_CHANCE(n) { return 13 + 2 * n; }

// C ref: potion.c dodrink() -- the #quaff command
/* "Quaffing is like drinking, except you spill more." - Terry Pratchett */
export async function dodrink() {
    if (Strangled()) {
        await pline("If you can't breathe air, how can you drink liquid?");
        return ECMD_OK;
    }

    drink_ok_extra = 0;
    /* preceding 'q'/#quaff with 'm' skips the possibility of drinking
       from fountains, sinks, and surrounding water plus the prompting
       which those entail */
    if (!game.iflags?.menu_requested) {
        const typ = game.level.at(game.u.ux, game.u.uy).typ;
        /* Is there a fountain to drink from here? */
        if (IS_FOUNTAIN(typ)
            /* not as low as floor level but similar restrictions apply */
            && can_reach_floor(false)) {
            if ((await tty_yn_function("Drink from the fountain?", "yn", 'n')) === 'y') { /* y_n() */
                await drinkfountain();
                return ECMD_TIME;
            }
            ++drink_ok_extra;
        }
        /* Or a kitchen sink? */
        if (IS_SINK(typ)
            /* not as low as floor level but similar restrictions apply */
            && can_reach_floor(false)) {
            if ((await tty_yn_function("Drink from the sink?", "yn", 'n')) === 'y') { /* y_n() */
                await drinksink();
                return ECMD_TIME;
            }
            ++drink_ok_extra;
        }
        /* Or are you surrounded by water? */
        if (Underwater() && !game.u.uswallow) {
            if ((await tty_yn_function("Drink the water around you?", "yn", 'n')) === 'y') { /* y_n() */
                await pline("Do you know what lives in this water?");
                return ECMD_TIME;
            }
            ++drink_ok_extra;
        }
    }

    let otmp = await getobj("drink", drink_ok, GETOBJ_NOFLAGS);
    if (!otmp)
        return ECMD_CANCEL;

    /* 5.0: rely on useup() unless the object is actually worn */
    if (otmp.owornmask) {
        if (otmp.quan > 1) {
            otmp = splitobj(otmp, 1);
            otmp.owornmask = 0; /* rest of original stack is unaffected */
        } else {
            await remove_worn_item(otmp, false);
        }
    }
    otmp.in_use = true; /* you've opened the stopper */

    const mvitals = game.mvitals;
    if (objdescr_is(otmp, "milky")
        && !(mvitals[PM_GHOST].mvflags & G_GONE)
        && !rn2(POTION_OCCUPANT_CHANCE(mvitals[PM_GHOST].born))) {
        await ghost_from_bottle();
        useup(otmp);
        return ECMD_TIME;
    } else if (objdescr_is(otmp, "smoky")
               && !(mvitals[PM_DJINNI].mvflags & G_GONE)
               && !rn2(POTION_OCCUPANT_CHANCE(mvitals[PM_DJINNI].born))) {
        await djinni_from_bottle(otmp);
        useup(otmp);
        return ECMD_TIME;
    }
    return await dopotion(otmp);
}

// C ref: potion.c dopotion()
export async function dopotion(otmp) {
    let retval;

    otmp.in_use = true;
    game.potion_nothing = game.potion_unkn = 0;
    if ((retval = await peffects(otmp)) >= 0)
        return retval ? ECMD_TIME : ECMD_OK;

    if (game.potion_nothing) {
        game.potion_unkn++;
        await You(`have a ${Hallucination() ? "normal" : "peculiar"
                  } feeling for a moment, then it passes.`);
    }
    if (otmp.dknown && !objects[otmp.otyp].oc_name_known) {
        if (!game.potion_unkn) {
            makeknown(otmp.otyp);
            more_experienced(0, 10);
        } else
            await trycall(otmp);
    }
    useup(otmp);
    return ECMD_TIME;
}

// C ref: apply.c unfixable_trouble_count()
/* Keep track of unfixable troubles for purposes of messages saying you feel
 * great. */
export function unfixable_trouble_count(is_horn) {
    const u = game.u;
    let unfixable_trbl = 0;

    if (Stoned())
        unfixable_trbl++;
    if (Slimed())
        unfixable_trbl++;
    if (Strangled())
        unfixable_trbl++;
    if (u.atemp.a[A_DEX] < 0 && Wounded_legs())
        unfixable_trbl++;
    if (u.atemp.a[A_STR] < 0 && u.uhs >= WEAK)
        unfixable_trbl++;
    /* lycanthropy is undesirable, but it doesn't actually make you feel bad
       so don't count it as a trouble which can't be fixed */

    if (Sick() && (!is_horn || (Sick() & ~TIMEOUT) !== 0))
        unfixable_trbl++;
    if (Stunned() && (!is_horn || (uprop(STUNNED).intrinsic & ~TIMEOUT) !== 0))
        unfixable_trbl++;
    if (Confusion() && (!is_horn || (uprop(CONFUSION).intrinsic & ~TIMEOUT) !== 0))
        unfixable_trbl++;
    if (Hallucination() && (!is_horn || (uprop(HALLUC).intrinsic & ~TIMEOUT) !== 0))
        unfixable_trbl++;
    if (Vomiting() && (!is_horn || (uprop(VOMITING).intrinsic & ~TIMEOUT) !== 0))
        unfixable_trbl++;
    if (Deaf() && (!is_horn || (uprop(DEAF).intrinsic & ~TIMEOUT) !== 0))
        unfixable_trbl++;

    return unfixable_trbl;
}

// C ref: potion.c peffect_restore_ability()
/* potion or spell of restore ability; for spell, otmp is a temporary
   spellbook object that will be blessed if hero is skilled in healing */
async function peffect_restore_ability(otmp) {
    const u = game.u;
    game.potion_unkn++;
    if (otmp.cursed) {
        await pline("Ulch!  This makes you feel mediocre!");
        return;
    } else {
        let i, ii;

        /* unlike unicorn horn, overrides Fixed_abil;
           does not recover temporary strength loss due to hunger
           or temporary dexterity loss due to wounded legs */
        await pline(`Wow!  This makes you feel ${
            (!otmp.blessed) ? "good"
            : unfixable_trouble_count(false) ? "better"
              : "great"}!`);
        i = rn2(A_MAX); /* start at a random point */
        for (ii = 0; ii < A_MAX; ii++) {
            const lim = u.amax.a[i];

            /* this used to adjust 'lim' for A_STR when u.uhs was
               WEAK or worse, but that's handled via ATEMP(A_STR) now */
            if (u.acurr.a[i] < lim) {
                u.acurr.a[i] = lim;
                /* reset stat abuse (but not exercise) to 0 as well */
                u.aexe.a[i] = Math.max(u.aexe.a[i], 0);

                game.disp_botl = true;
                /* only first found if not blessed */
                if (!otmp.blessed)
                    break;
            }
            if (++i >= A_MAX)
                i = 0;
        }

        /* when using the potion (not the spell) also restore lost levels */
        if (otmp.otyp === O.POT_RESTORE_ABILITY && u.ulevel < u.ulevelmax) {
            do {
                await pluslvl(false);
            } while (u.ulevel < u.ulevelmax && otmp.blessed);
        }
    }
}

// C ref: potion.c peffect_hallucination()
async function peffect_hallucination(otmp) {
    if (Halluc_resistance()) {
        game.potion_nothing++;
        return;
    } else if (Hallucination()) {
        game.potion_nothing++;
    }
    await make_hallucinated(itimeout_incr(uprop(HALLUC).intrinsic,
                                          rn1(200, 600 - 300 * bcsign(otmp))),
                            true, 0);
    if ((otmp.blessed && !rn2(3)) || (!otmp.cursed && !rn2(6))) {
        await You("perceive yourself...");
        await tty_display_nhwindow(game.WIN_MESSAGE, false);
        await enlightenment(MAGICENLIGHTENMENT, ENL_GAMEINPROGRESS);
        await Your("awareness re-normalizes.");
        await exercise(A_WIS, true);
    }
}

// C ref: potion.c peffect_water()
async function peffect_water(otmp) {
    const u = game.u;
    if (!otmp.blessed && !otmp.cursed) {
        await pline(`This tastes like ${hliquid("water")}.`);
        u.uhunger += rnd(10);
        await newuhs(false);
        return;
    }
    game.potion_unkn++;
    if (mon_hates_blessings(game.youmonst) /* undead or demon */
        || u.ualign.type === A_CHAOTIC) {
        if (otmp.blessed) {
            await pline(`This burns like ${hliquid("acid")}!`);
            await exercise(A_CON, false);
            if (ismnum(u.ulycn)) {
                await Your(`affinity to ${
                    makeplural(mons[u.ulycn].pmnames[NEUTRAL])} disappears!`);
                if (game.youmonst.data === mons[u.ulycn])
                    await you_unwere(false);
                set_ulycn(NON_PM); /* cure lycanthropy */
            }
            await losehp(Maybe_Half_Phys(d(2, 6)), "potion of holy water",
                         KILLED_BY_AN);
        } else if (otmp.cursed) {
            await You_feel("quite proud of yourself.");
            await healup(d(2, 6), 0, 0, 0);
            if (ismnum(u.ulycn) && !Upolyd())
                await you_were();
            await exercise(A_CON, true);
        }
    } else {
        if (otmp.blessed) {
            await You_feel("full of awe.");
            await make_sick(0, null, true, SICK_ALL);
            await exercise(A_WIS, true);
            await exercise(A_CON, true);
            if (ismnum(u.ulycn))
                await you_unwere(true); /* "Purified" */
            /* make_confused(0L, TRUE); */
        } else {
            if (u.ualign.type === A_LAWFUL) {
                await pline(`This burns like ${hliquid("acid")}!`);
                await losehp(Maybe_Half_Phys(d(2, 6)), "potion of unholy water",
                             KILLED_BY_AN);
            } else
                await You_feel("full of dread.");
            if (ismnum(u.ulycn) && !Upolyd())
                await you_were();
            await exercise(A_CON, false);
        }
    }
}

// C ref: potion.c peffect_booze()
async function peffect_booze(otmp) {
    const u = game.u;
    game.potion_unkn++;
    await pline(`Ooph!  This tastes like ${otmp.odiluted ? "watered down " : ""}${
        Hallucination() ? "dandelion wine" : "liquid fire"}!`);
    if (!otmp.blessed) {
        /* booze hits harder if drinking on an empty stomach */
        await make_confused(itimeout_incr(uprop(CONFUSION).intrinsic, d(2 + u.uhs, 8)), false);
    }
    /* the whiskey makes us feel better */
    if (!otmp.odiluted)
        await healup(1, 0, false, false);
    u.uhunger += 10 * (2 + bcsign(otmp));
    await newuhs(false);
    await exercise(A_WIS, false);
    if (otmp.cursed) {
        await You("pass out.");
        game.multi = -rnd(15);
        game.nomovemsg = "You awake with a headache.";
    }
}

// C ref: potion.c peffect_enlightenment()
async function peffect_enlightenment(otmp) {
    if (otmp.cursed) {
        game.potion_unkn++;
        await You("have an uneasy feeling...");
        await exercise(A_WIS, false);
    } else {
        if (otmp.blessed) {
            await adjattrib(A_INT, 1, 0);
            await adjattrib(A_WIS, 1, 0);
        }
        await do_enlightenment_effect();
    }
}

// C ref: potion.c peffect_invisibility()
async function peffect_invisibility(otmp) {
    const u = game.u;
    const is_spell = (otmp.oclass === SPBOOK_CLASS);

    /* spell cannot penetrate mummy wrapping */
    if (is_spell && BInvis() && game.uarmc.otyp === O.MUMMY_WRAPPING) {
        await You_feel(`rather itchy under ${yname(game.uarmc)}.`);
        return;
    }
    if (Invis() || Blind() || BInvis()) {
        game.potion_nothing++;
    } else {
        await self_invis_message();
    }
    if (otmp.blessed && !rn2(uprop(INVIS).intrinsic ? 15 : 30))
        uprop(INVIS).intrinsic |= FROMOUTSIDE;
    else
        incr_itimeout(INVIS, d(6 - 3 * bcsign(otmp), 100) + 100);
    newsym(u.ux, u.uy); /* update position */
    if (otmp.cursed) {
        await pline("For some reason, you feel your presence is known.");
        aggravate();

        /* doing this gives temporary invisibility, but removes permanent
           invisibility */
        uprop(INVIS).intrinsic &= ~FROMOUTSIDE;
    }
}

// C ref: potion.c peffect_see_invisible()
async function peffect_see_invisible(otmp) {
    const u = game.u;
    const msg = Invisible() && !Blind();
    const permchance = 10 - (uprop(INVIS).intrinsic ? 3 : 0)
                       - (uprop(SEE_INVIS).intrinsic ? 6 : 0);

    game.potion_unkn++;
    if (otmp.cursed)
        await pline(`Yecch!  This tastes ${Hallucination() ? "overripe" : "rotten"}.`);
    else
        await pline(Hallucination()
                    ? `This tastes like 10% real ${otmp.odiluted ? "reconstituted " : ""}${
                        fruitname(true)} all-natural beverage.`
                    : `This tastes like ${otmp.odiluted ? "reconstituted " : ""}${
                        fruitname(true)}.`);
    if (otmp.otyp === O.POT_FRUIT_JUICE) {
        u.uhunger += (otmp.odiluted ? 5 : 10) * (2 + bcsign(otmp));
        await newuhs(false);
        return;
    }
    if (!otmp.cursed) {
        /* Tell them they can see again immediately, which
         * will help them identify the potion...
         */
        await make_blinded(0, true);
    }
    if (otmp.blessed && !rn2(permchance))
        uprop(SEE_INVIS).intrinsic |= FROMOUTSIDE;
    else
        incr_itimeout(SEE_INVIS, rn1(100, 750));
    set_mimic_blocking(); /* do special mimic handling */
    see_monsters();       /* see invisible monsters */
    newsym(u.ux, u.uy);   /* see yourself! */
    if (msg && !Blind()) {  /* Blind possible if polymorphed */
        await You("can see through yourself, but you are visible!");
        game.potion_unkn--;
    }
}

// C ref: potion.c peffect_paralysis()
async function peffect_paralysis(otmp) {
    const u = game.u;
    if (Free_action()) {
        await You("stiffen momentarily.");
    } else {
        if (Levitation() || Is_airlevel(u.uz) || Is_waterlevel(u.uz))
            await You("are motionlessly suspended.");
        else if (u.usteed)
            await You("are frozen in place!");
        else
            await Your(`${makeplural(body_part(FOOT))} are frozen to the ${
                surface(u.ux, u.uy)}!`);
        nomul(-(rn1(10, 25 - 12 * bcsign(otmp))));
        game.multi_reason = "frozen by a potion";
        game.nomovemsg = You_can_move_again;
        await exercise(A_DEX, false);
    }
}

// C ref: potion.c peffect_sleeping()
async function peffect_sleeping(otmp) {
    if (Sleep_resistance() || Free_action()) {
        monstseesu(M_SEEN_SLEEP);
        await You("yawn.");
    } else {
        await You("suddenly fall asleep!");
        monstunseesu(M_SEEN_SLEEP);
        await fall_asleep(-rn1(10, 25 - 12 * bcsign(otmp)), true);
    }
}

// C ref: potion.c peffect_monster_detection()
async function peffect_monster_detection(otmp) {
    if (otmp.blessed) {
        let i;

        if (Detect_monsters())
            game.potion_nothing++;
        game.potion_unkn++;
        /* after a while, repeated uses become less effective */
        if ((uprop(DETECT_MONSTERS).intrinsic & TIMEOUT) >= 300)
            i = 1;
        else if (otmp.oclass === SPBOOK_CLASS)
            i = rn1(40, 21);
        else /* potion */
            i = rn2(100) + 100;
        incr_itimeout(DETECT_MONSTERS, i);
        for (let x = 1; x < COLNO; x++) {
            for (let y = 0; y < ROWNO; y++) {
                if (glyph_is_invisible(game.level.at(x, y).remembered_glyph)) {
                    unmap_object(x, y);
                    newsym(x, y);
                }
                if ((game.level.monsters || []).some(m => m.mx === x && m.my === y
                                                     && !m.dead)) /* MON_AT */
                    game.potion_unkn = 0;
            }
        }
        /* if swallowed or underwater, fall through to uncursed case */
        if (!game.u.uswallow && !Underwater()) {
            see_monsters();
            if (game.potion_unkn)
                await You_feel("lonely.");
            return 0;
        }
    }
    if (await monster_detect(otmp, 0))
        return 1; /* nothing detected */
    await exercise(A_WIS, true);
    return 0;
}

// C ref: potion.c peffect_object_detection()
async function peffect_object_detection(otmp) {
    if (await object_detect(otmp, 0))
        return 1; /* nothing detected */
    await exercise(A_WIS, true);
    return 0;
}

// C ref: potion.c peffect_sickness()
async function peffect_sickness(otmp) {
    await pline("Yecch!  This stuff tastes like poison.");
    if (otmp.blessed) {
        await pline(`(But in fact it was mildly stale ${fruitname(true)}.)`);
        if (!Role_if(PM_HEALER)) {
            /* NB: blessed otmp->fromsink is not possible */
            await losehp(1, "mildly contaminated potion", KILLED_BY_AN);
        }
    } else {
        if (Poison_resistance())
            await pline(`(But in fact it was biologically contaminated ${
                fruitname(true)}.)`);
        if (Role_if(PM_HEALER)) {
            await pline("Fortunately, you have been immunized.");
        } else {
            const typ = rn2(A_MAX);

            const contaminant = `${Poison_resistance() ? "mildly " : ""}${
                otmp.fromsink ? "contaminated tap water" : "contaminated potion"}`;
            if (!Fixed_abil()) {
                await poisontell(typ, false);
                await adjattrib(typ, Poison_resistance() ? -1 : -rn1(4, 3), 1);
            }
            if (!Poison_resistance()) {
                if (otmp.fromsink)
                    await losehp(rnd(10) + 5 * (otmp.cursed ? 1 : 0), contaminant,
                                 KILLED_BY);
                else
                    await losehp(rnd(10) + 5 * (otmp.cursed ? 1 : 0), contaminant,
                                 KILLED_BY_AN);
            } else {
                /* rnd loss is so that unblessed poorer than blessed */
                await losehp(1 + rn2(2), contaminant,
                             otmp.fromsink ? KILLED_BY : KILLED_BY_AN);
            }
            await exercise(A_CON, false);
        }
    }
    if (Hallucination()) {
        await You("are shocked back to your senses!");
        await make_hallucinated(0, false, 0);
    }
}

// C ref: potion.c peffect_confusion()
async function peffect_confusion(otmp) {
    if (!Confusion()) {
        if (Hallucination()) {
            await pline("What a trippy feeling!");
            game.potion_unkn++;
        } else
            await pline("Huh, What?  Where am I?");
    } else
        game.potion_nothing++;
    await make_confused(itimeout_incr(uprop(CONFUSION).intrinsic,
                                      rn1(7, 16 - 8 * bcsign(otmp))),
                        false);
}

// C ref: potion.c peffect_gain_ability()
async function peffect_gain_ability(otmp) {
    if (otmp.cursed) {
        await pline("Ulch!  That potion tasted foul!");
        game.potion_unkn++;
    } else if (Fixed_abil()) {
        game.potion_nothing++;
    } else {      /* If blessed, increase all; if not, try up to */
        let itmp; /* 6 times to find one which can be increased. */
        let ii, i = -1;   /* increment to 0 */
        for (ii = A_MAX; ii > 0; ii--) {
            i = (otmp.blessed ? i + 1 : rn2(A_MAX));
            /* only give "your X is already as high as it can get"
               message on last attempt (except blessed potions) */
            itmp = (otmp.blessed || ii === 1) ? 0 : -1;
            if (await adjattrib(i, 1, itmp) && !otmp.blessed)
                break;
        }
    }
}

// C ref: potion.c peffect_speed()
async function peffect_speed(otmp) {
    const is_speed = (otmp.otyp === O.POT_SPEED);

    /* skip when mounted; heal_legs() would heal steed's legs */
    if (is_speed && Wounded_legs() && !otmp.cursed && !game.u.usteed) {
        await heal_legs(0);
        game.potion_unkn++;
        return;
    }

    await speed_up(rn1(10, 100 + 60 * bcsign(otmp)));

    /* non-cursed potion grants intrinsic speed */
    if (is_speed && !otmp.cursed && !(uprop(FAST).intrinsic & INTRINSIC)) {
        await Your("quickness feels very natural.");
        uprop(FAST).intrinsic |= FROMOUTSIDE;
    }
}

// C ref: potion.c peffect_blindness()
async function peffect_blindness(otmp) {
    const p = uprop(BLINDED);
    if (Blind() || ((p.intrinsic || p.extrinsic) && p.blocked))
        game.potion_nothing++;
    await make_blinded(itimeout_incr(p.intrinsic & TIMEOUT /* BlindedTimeout */,
                                     rn1(200, 250 - 125 * bcsign(otmp))),
                       !Blind());
}

// C ref: potion.c peffect_gain_level()
async function peffect_gain_level(otmp) {
    const u = game.u;
    if (otmp.cursed) {
        /* ledger_no(), Can_rise_up(), goto_level() upward */
        throw new Error('peffect_gain_level(): cursed potion (rising up) not ported yet');
    }
    await pluslvl(false);
    /* blessed potions place you at a random spot in the
       middle of the new level instead of the low point */
    if (otmp.blessed)
        u.uexp = rndexp(true);
}

// C ref: potion.c peffect_healing()
async function peffect_healing(otmp) {
    await You_feel("better.");
    await healup(8 + d(4 + 2 * bcsign(otmp), 4), !otmp.cursed ? 1 : 0,
                 !!otmp.blessed, !otmp.cursed);
    await exercise(A_CON, true);
}

// C ref: potion.c peffect_extra_healing()
async function peffect_extra_healing(otmp) {
    await You_feel("much better.");
    await healup(16 + d(4 + 2 * bcsign(otmp), 8),
                 otmp.blessed ? 5 : !otmp.cursed ? 2 : 0, !otmp.cursed,
                 true);
    await make_hallucinated(0, true, 0);
    await exercise(A_CON, true);
    await exercise(A_STR, true);
    /* blessed potion also heals wounded legs unless riding (where leg
       wounds apply to the steed rather than to the hero) */
    if (Wounded_legs() && (otmp.blessed && !game.u.usteed))
        await heal_legs(0);
}

// C ref: potion.c peffect_full_healing()
async function peffect_full_healing(otmp) {
    const u = game.u;
    await You_feel("completely healed.");
    await healup(400, 4 + 4 * bcsign(otmp), !otmp.cursed, true);
    /* Restore one lost level if blessed */
    if (otmp.blessed && u.ulevel < u.ulevelmax) {
        /* when multiple levels have been lost, drinking
           multiple potions will only get half of them back */
        u.ulevelmax -= 1;
        await pluslvl(false);
    }
    await make_hallucinated(0, true, 0);
    await exercise(A_STR, true);
    await exercise(A_CON, true);
    /* blessed potion heals wounded legs even when riding (so heals steed's
       legs--it's magic); uncursed potion heals hero's legs unless riding */
    if (Wounded_legs() && (otmp.blessed || (!otmp.cursed && !u.usteed)))
        await heal_legs(0);
}

// C ref: potion.c peffect_levitation()
async function peffect_levitation(otmp) {
    const u = game.u;
    const HLev = uprop(LEVITATION);
    /*
     * BLevitation will be set if levitation is blocked due to being
     * inside rock (currently or formerly in phazing xorn form, perhaps)
     * but it doesn't prevent setting or incrementing Levitation timeout
     * (which will take effect after escaping from the rock if it hasn't
     * expired by then).
     */
    if (!Levitation() && !BLevitation_po()) {
        /* kludge to ensure proper operation of float_up() */
        set_itimeout(LEVITATION, 1);
        await float_up_po();
        /* This used to set timeout back to 0, then increment it below
           for blessed and uncursed effects.  But now we leave it so
           that cursed effect yields "you float down" on next turn.
           Blessed and uncursed get one extra turn duration. */
    } else /* already levitating, or can't levitate */
        game.potion_nothing++;

    if (otmp.cursed) {
        let stway;

        /* 'already levitating' used to block the cursed effect(s)
           aside from ~I_SPECIAL; it was not clear whether that was
           intentional; either way, it no longer does (as of 3.6.1) */
        HLev.intrinsic &= ~I_SPECIAL_PO; /* can't descend upon demand */
        if (BLevitation_po()) {
            ; /* rising via levitation is blocked */
        } else if ((stway = stairway_at_po(u.ux, u.uy)) && stway.up) {
            await doup_po();
            /* in case we're already Levitating, which would have
               resulted in incrementing 'nothing' */
            game.potion_nothing = 0; /* not nothing after all */
        } else if (has_ceiling_po(u.uz)) {
            const dmg = rnd(!game.uarmh ? 10 : !hard_helmet_po(game.uarmh) ? 6 : 3);

            await You(`hit your ${body_part(HEAD)} on the ${ceiling_po(u.ux, u.uy)}.`);
            await losehp(Maybe_Half_Phys(dmg), "colliding with the ceiling",
                         KILLED_BY);
            game.potion_nothing = 0; /* not nothing after all */
        }
    } else if (otmp.blessed) {
        /* at this point, timeout is already at least 1 */
        incr_itimeout(LEVITATION, rn1(50, 250));
        /* can descend at will (stop levitating via '>') provided timeout
           is the only factor (ie, not also wearing Lev ring or boots) */
        HLev.intrinsic |= I_SPECIAL_PO;
    } else /* timeout is already at least 1 */
        incr_itimeout(LEVITATION, rn1(140, 10));

    if (Levitation() && IS_SINK(game.level.at(u.ux, u.uy).typ))
        await spoteffects_po(false);
    /* levitating blocks flying */
    float_vs_flight();
}

// C ref: potion.c peffect_gain_energy()
async function peffect_gain_energy(otmp) {
    const u = game.u;
    let num;

    if (otmp.cursed)
        await You_feel("lackluster.");
    else
        await pline("Magical energies course through your body.");

    num = d(otmp.blessed ? 3 : !otmp.cursed ? 2 : 1, 6);
    if (otmp.cursed)
        num = -num; /* subtract instead of add when cursed */
    u.uenmax += num;
    if (u.uenmax > u.uenpeak)
        u.uenpeak = u.uenmax;
    else if (u.uenmax <= 0)
        u.uenmax = 0;
    u.uen += 3 * num;
    if (u.uen > u.uenmax)
        u.uen = u.uenmax;
    else if (u.uen <= 0)
        u.uen = 0;
    game.disp_botl = true;
    await exercise(A_WIS, true);
}

// C ref: potion.c peffect_oil()
async function peffect_oil(otmp) {
    let good_for_you = false;

    if (otmp.lamplit) {
        if (likes_fire(game.youmonst.data)) {
            await pline("Ahh, a refreshing drink.");
            good_for_you = true;
        } else {
            /*
             * Note: if poly'd into green slime, hero ought to take
             * extra damage, but drinking potions in that form isn't
             * possible so there's no need to try to handle that.
             */
            await You(`burn your ${body_part(FACE)}.`);
            /* fire damage */
            const vulnerable = !Fire_resistance() || Cold_resistance();
            await losehp(d(vulnerable ? 4 : 2, 4),
                         "quaffing a burning potion of oil",
                         KILLED_BY);
        }
        /* "the slime that covers you burns away" */
        await burn_away_slime();
    } else if (otmp.cursed) {
        await pline("This tastes like castor oil.");
    } else {
        await pline("That was smooth!");
    }
    await exercise(A_WIS, good_for_you);
}

// C ref: timeout.c burn_away_slime()
export async function burn_away_slime() {
    if (Slimed()) {
        await make_slimed(0, "The slime that covers you is burned away!");
    }
}

// C ref: potion.c peffect_acid()
async function peffect_acid(otmp) {
    if (Acid_resistance()) {
        /* Not necessarily a creature who _likes_ acid */
        await pline(`This tastes ${Hallucination() ? "tangy" : "sour"}.`);
    } else {
        await pline(`This burns${otmp.blessed ? " a little"
                                : otmp.cursed ? " a lot" : " like acid"}!`);
        const dmg = d(otmp.cursed ? 2 : 1, otmp.blessed ? 4 : 8);
        await losehp(Maybe_Half_Phys(dmg), "potion of acid", KILLED_BY_AN);
        await exercise(A_CON, false);
    }
    if (Stoned())
        throw new Error('peffect_acid(): fix_petrification() not ported yet');
    game.potion_unkn++; /* holy/unholy water can burn like acid too */
}

// C ref: potion.c peffect_polymorph()
async function peffect_polymorph(otmp) {
    const u = game.u;
    await You_feel(`a little ${Hallucination() ? "normal" : "strange"}.`);
    if (!Unchanging()) {
        if (!otmp.blessed || (u.umonnum !== u.umonster))
            await polyself(POLY_NOFLAGS);
        else {
            await polyself(POLY_CONTROLLED | POLY_LOW_CTRL);
            if (u.mtimedone && u.umonnum !== u.umonster)
                u.mtimedone = Math.min(u.mtimedone, rn2(15) + 10);
        }
    }
}

// C ref: potion.c peffects()
export async function peffects(otmp) {
    switch (otmp.otyp) {
    case O.POT_RESTORE_ABILITY:
    case O.SPE_RESTORE_ABILITY:
        await peffect_restore_ability(otmp);
        break;
    case O.POT_HALLUCINATION:
        await peffect_hallucination(otmp);
        break;
    case O.POT_WATER:
        await peffect_water(otmp);
        break;
    case O.POT_BOOZE:
        await peffect_booze(otmp);
        break;
    case O.POT_ENLIGHTENMENT:
        await peffect_enlightenment(otmp);
        break;
    case O.SPE_INVISIBILITY:
    case O.POT_INVISIBILITY:
        await peffect_invisibility(otmp);
        break;
    case O.POT_SEE_INVISIBLE: /* tastes like fruit juice in Rogue */
    case O.POT_FRUIT_JUICE:
        await peffect_see_invisible(otmp);
        break;
    case O.POT_PARALYSIS:
        await peffect_paralysis(otmp);
        break;
    case O.POT_SLEEPING:
        await peffect_sleeping(otmp);
        break;
    case O.POT_MONSTER_DETECTION:
    case O.SPE_DETECT_MONSTERS:
        if (await peffect_monster_detection(otmp))
            return 1;
        break;
    case O.POT_OBJECT_DETECTION:
    case O.SPE_DETECT_TREASURE:
        if (await peffect_object_detection(otmp))
            return 1;
        break;
    case O.POT_SICKNESS:
        await peffect_sickness(otmp);
        break;
    case O.POT_CONFUSION:
        await peffect_confusion(otmp);
        break;
    case O.POT_GAIN_ABILITY:
        await peffect_gain_ability(otmp);
        break;
    case O.POT_SPEED:
    case O.SPE_HASTE_SELF:
        await peffect_speed(otmp);
        break;
    case O.POT_BLINDNESS:
        await peffect_blindness(otmp);
        break;
    case O.POT_GAIN_LEVEL:
        await peffect_gain_level(otmp);
        break;
    case O.POT_HEALING:
        await peffect_healing(otmp);
        break;
    case O.POT_EXTRA_HEALING:
        await peffect_extra_healing(otmp);
        break;
    case O.POT_FULL_HEALING:
        await peffect_full_healing(otmp);
        break;
    case O.POT_LEVITATION:
    case O.SPE_LEVITATION:
        await peffect_levitation(otmp);
        break;
    case O.POT_GAIN_ENERGY: /* M. Stephenson */
        await peffect_gain_energy(otmp);
        break;
    case O.POT_OIL: /* P. Winner */
        await peffect_oil(otmp);
        break;
    case O.POT_ACID:
        await peffect_acid(otmp);
        break;
    case O.POT_POLYMORPH:
        await peffect_polymorph(otmp);
        break;
    default:
        /* impossible("What a funny potion! (%u)", otmp->otyp) */
        return 0;
    }
    return -1;
}

// C ref: potion.c healup() -- the hit point part, which is all that
// healup(n, x, FALSE, FALSE) does besides setting disp.botl; the synchronous
// C caller healmon() uses it through healup_nocure()
function healup_hp(nhp, nxtra) {
    const u = game.u;
    if (nhp) {
        if (Upolyd()) {
            u.mh += nhp;
            if (u.mh > u.mhmax)
                u.mh = (u.mhmax += nxtra);
        } else {
            u.uhp += nhp;
            if (u.uhp > u.uhpmax) {
                u.uhp = (u.uhpmax += nxtra);
                if (u.uhpmax > u.uhppeak)
                    u.uhppeak = u.uhpmax;
            }
        }
    }
}
// C ref: potion.c healup(nhp, nxtra, FALSE, FALSE) -- nothing to await
export function healup_nocure(nhp, nxtra) {
    healup_hp(nhp, nxtra);
    game.disp_botl = true;
}

// C ref: potion.c healup()
export async function healup(nhp, nxtra, curesick, cureblind) {
    healup_hp(nhp, nxtra);
    if (cureblind) {
        /* 3.6.1: it's debatable whether healing magic should clean off
           mundane 'dirt', but if it doesn't, blindness isn't cured */
        game.u.ucreamed = 0;
        await make_blinded(0, true);
        /* heal deafness too */
        await make_deaf(0, true);
    }
    if (curesick) {
        await make_vomiting(0, true);
        await make_sick(0, null, true, SICK_ALL);
    }
    game.disp_botl = true;
}

// C ref: potion.c strange_feeling()
export async function strange_feeling(obj, txt) {
    if (game.flags.beginner || !txt)
        await You(`have a ${Hallucination() ? "normal" : "strange"
                  } feeling for a moment, then it passes.`);
    else
        await pline(txt);

    if (!obj) /* e.g., crystal ball finds no traps */
        return;

    if (obj.dknown)
        await trycall(obj);

    useup(obj);
}

const bottlenames = [ "bottle", "phial", "flagon", "carafe", "flask", "jar",
                      "vial" ];
const hbottlenames = [
    "jug", "pitcher", "barrel", "tin", "bag", "box", "glass", "beaker",
    "tumbler", "vase", "flowerpot", "pan", "thingy", "mug", "teacup",
    "teapot", "keg", "bucket", "thermos", "amphora", "wineskin", "parcel",
    "bowl", "ampoule"
];

// C ref: potion.c bottlename()
export function bottlename() {
    if (Hallucination())
        return ROLL_FROM(hbottlenames);
    else
        return ROLL_FROM(bottlenames);
}

// C ref: potion.c potionhit()
/* potion obj hits monster mon, which might be youmonst; obj always used up */
export async function potionhit(mon, obj, how) {
    const u = game.u;
    const botlnam = bottlename();
    const isyou = (mon === game.youmonst);
    let distance, tx, ty;
    let saddle = null;
    let hit_saddle = false;
    const your_fault = (how <= POTHIT_HERO_THROW);

    if (isyou) {
        tx = u.ux, ty = u.uy;
        distance = 0;
        await pline_The(`${botlnam} crashes on your ${body_part(HEAD)
                        } and breaks into shards.`);
        await losehp(Maybe_Half_Phys(rnd(2)),
                     (how === POTHIT_OTHER_THROW) ? "propelled potion" /* scatter */
                                                  : "thrown potion",
                     KILLED_BY_AN);
    } else {
        tx = mon.mx, ty = mon.my;
        /* sometimes it hits the saddle */
        if (((mon.misc_worn_check & W_SADDLE)
             && (saddle = which_armor(mon, W_SADDLE)))
            && (!rn2(10)
                || (obj.otyp === O.POT_WATER
                    && ((rnl(10) > 7 && obj.cursed)
                        || (rnl(10) < 4 && obj.blessed) || !rn2(3)))))
            hit_saddle = true;
        distance = distu(tx, ty);
        if (!cansee(tx, ty)) {
            /* Soundeffect(se_potion_crash_and_break, 60) */
            await pline("Crash!");
        } else {
            const mnam = mon_nam(mon);
            let buf;

            if (hit_saddle && saddle) {
                buf = `${s_suffix(x_monnam(mon, ARTICLE_THE, null,
                                           (SUPPRESS_IT | SUPPRESS_SADDLE),
                                           false))} saddle`;
            } else if (has_head(mon.data)) {
                buf = `${s_suffix(mnam)} ${game.notonhead ? "body" : "head"}`;
            } else {
                buf = mnam;
            }
            /* Soundeffect(se_potion_crash_and_break, 60) */
            await pline_The(`${botlnam} crashes on ${buf} and breaks into shards.`);
        }
        if (rn2(5) && mon.mhp > 1 && !hit_saddle)
            mon.mhp--;
    }

    /* oil doesn't instantly evaporate; Neither does a saddle hit */
    if (obj.otyp !== O.POT_OIL && !hit_saddle && cansee(tx, ty))
        await pline(`${Tobjnam(obj, "evaporate")}.`);

    if (isyou) {
        switch (obj.otyp) {
        case O.POT_OIL:
            if (obj.lamplit)
                throw new Error('potionhit(): explode_oil() not ported yet');
            break;
        case O.POT_POLYMORPH:
            await You_feel(`a little ${Hallucination() ? "normal" : "strange"}.`);
            if (!Unchanging() && !Antimagic())
                await polyself(POLY_NOFLAGS);
            break;
        case O.POT_ACID:
            if (!Acid_resistance()) {
                await pline(`This burns${obj.blessed ? " a little"
                                         : obj.cursed ? " a lot" : ""}!`);
                const dmg = d(obj.cursed ? 2 : 1, obj.blessed ? 4 : 8);
                await losehp(Maybe_Half_Phys(dmg), "potion of acid", KILLED_BY_AN);
            }
            break;
        }
    } else if (hit_saddle && saddle) {
        /* H2Opotion_dip() on the saddle, "<Mon>'s saddle gets wet." */
        throw new Error('potionhit(): a potion hitting a saddle not ported yet');
    } else {
        let angermon = your_fault, cureblind = false;

        switch (obj.otyp) {
        case O.POT_FULL_HEALING:
        case O.POT_EXTRA_HEALING:
        case O.POT_HEALING:
        case O.POT_RESTORE_ABILITY:
        case O.POT_GAIN_ABILITY: {
            let do_illness = false;
            /* the FALLTHROUGH chain of the C switch */
            if (obj.otyp === O.POT_FULL_HEALING)
                cureblind = true;
            if (obj.otyp === O.POT_FULL_HEALING || obj.otyp === O.POT_EXTRA_HEALING) {
                if (!obj.cursed)
                    cureblind = true;
            }
            if (obj.otyp === O.POT_FULL_HEALING || obj.otyp === O.POT_EXTRA_HEALING
                || obj.otyp === O.POT_HEALING) {
                if (obj.blessed)
                    cureblind = true;
                if (mon.data === mons[PM_PESTILENCE])
                    do_illness = true;
            }
            if (do_illness) {
                await potionhit_illness(mon);
                break;
            }
            angermon = false;
            await potionhit_healing(mon, cureblind);
            break;
        }
        case O.POT_SICKNESS:
            if (mon.data === mons[PM_PESTILENCE]) {
                angermon = false;
                await potionhit_healing(mon, cureblind);
                break;
            }
            if (dmgtype(mon.data, AD_DISE)
                /* won't happen, see prior goto */
                || dmgtype(mon.data, AD_PEST)
                /* most common case */
                || resists_poison(mon)) {
                if (canseemon(mon))
                    await pline(`${Monnam(mon)} looks unharmed.`);
                break;
            }
            await potionhit_illness(mon);
            break;
        case O.POT_CONFUSION:
        case O.POT_BOOZE:
            if (!resist(mon, POTION_CLASS, 0, NOTELL))
                mon.mconf = 1;
            break;
        case O.POT_INVISIBILITY: {
            const sawit = canspotmon(mon),
                cursed_potion = obj.cursed ? true : false;

            angermon = mon.minvis && cursed_potion;
            mon_set_minvis(mon, cursed_potion);
            if (sawit && !canspotmon(mon)) {
                if (cansee(mon.mx, mon.my))
                    map_invisible(mon.mx, mon.my);
            } else if (sawit && cursed_potion) {
                await pline(`${Monnam(mon)} briefly seems to be transparent.`);
                /* see use_misc(muse.c) for comment about map_invisible() */
            } else if (!sawit && canspotmon(mon)) {
                /* if an invisible mon glyph was present, mon_set_minvis()'s
                   newsym() has gotten rid of it */
                await pline(`${Monnam(mon)} appears!`);
            }
            break;
        }
        case O.POT_SLEEPING:
            /* wakeup() doesn't rouse victims of temporary sleep */
            if (await sleep_monst(mon, rnd(12), POTION_CLASS)) {
                await pline(`${Monnam(mon)} falls asleep.`);
                await slept_monst(mon);
            }
            break;
        case O.POT_PARALYSIS:
            if (mon.mcanmove) {
                /* really should be rnd(5) for consistency with players
                 * breathing potions, but...
                 */
                paralyze_monst(mon, rnd(25));
            }
            break;
        case O.POT_SPEED:
            angermon = false;
            await mon_adjust_speed(mon, 1, obj);
            break;
        case O.POT_BLINDNESS:
            if (haseyes(mon.data) && !mon_perma_blind(mon)) {
                let btmp = 64 + rn2(32);
                btmp += rn2(32) * (!resist(mon, POTION_CLASS, 0, NOTELL) ? 1 : 0);

                btmp += mon.mblinded || 0;
                mon.mblinded = Math.min(btmp, 127);
                mon.mcansee = 0;
            }
            break;
        case O.POT_WATER:
            if (mon_hates_blessings(mon) /* undead or demon */
                || is_were(mon.data) || is_vampshifter(mon)) {
                if (obj.blessed) {
                    await pline(`${Monnam(mon)} ${is_silent(mon.data) ? "writhes"
                                                                      : "shrieks"} in pain!`);
                    if (!is_silent(mon.data))
                        await wake_nearto(tx, ty, mon.data.mlevel * 10);
                    mon.mhp -= d(2, 6);
                    /* should only be by you */
                    if (DEADMONSTER(mon))
                        await killed(mon);
                    else if (is_were(mon.data) && !is_human(mon.data))
                        await new_were(mon);
                } else if (obj.cursed) {
                    angermon = false;
                    if (canseemon(mon))
                        await pline(`${Monnam(mon)} looks healthier.`);
                    healmon(mon, d(2, 6), 0);
                    if (is_were(mon.data) && is_human(mon.data)
                        && !(uprop(PROT_FROM_SHAPE_CHANGERS).intrinsic
                             || uprop(PROT_FROM_SHAPE_CHANGERS).extrinsic))
                        await new_were(mon);
                }
            } else if (mon.data === mons[PM_GREMLIN]) {
                angermon = false;
                await split_mon(mon, null);
            } else if (mon.data === mons[PM_IRON_GOLEM]) {
                if (canseemon(mon))
                    await pline(`${Monnam(mon)} rusts.`);
                mon.mhp -= d(1, 6);
                /* should only be by you */
                if (DEADMONSTER(mon))
                    await killed(mon);
            }
            break;
        case O.POT_OIL:
            if (obj.lamplit)
                throw new Error('potionhit(): explode_oil() not ported yet');
            break;
        case O.POT_ACID:
            if (!resists_acid(mon) && !resist(mon, POTION_CLASS, 0, NOTELL)) {
                await pline(`${Monnam(mon)} ${is_silent(mon.data) ? "writhes"
                                                                  : "shrieks"} in pain!`);
                if (!is_silent(mon.data))
                    await wake_nearto(tx, ty, mon.data.mlevel * 10);
                mon.mhp -= d(obj.cursed ? 2 : 1, obj.blessed ? 4 : 8);
                if (DEADMONSTER(mon)) {
                    if (your_fault)
                        await killed(mon);
                    else
                        await monkilled(mon, "", AD_ACID);
                }
            }
            break;
        case O.POT_POLYMORPH:
            await bhitm(mon, obj);
            break;
        /*
        case POT_GAIN_LEVEL:
        case POT_LEVITATION:
        case POT_FRUIT_JUICE:
        case POT_MONSTER_DETECTION:
        case POT_OBJECT_DETECTION:
            break;
        */
        }
        /* target might have been killed */
        if (!DEADMONSTER(mon)) {
            if (angermon)
                await wakeup(mon, true);
            else
                mon.msleeping = 0;
        }
    }

    /* Note: potionbreathe() does its own docall() */
    if ((distance === 0
         || (distance < 3 && !rn2(Math.trunc((1 + ACURR(A_DEX)) / 2))))
        && (!breathless(game.youmonst.data) || haseyes(game.youmonst.data)))
        await potionbreathe(obj);
    else if (obj.dknown && cansee(tx, ty))
        await trycall(obj);

    if (u.ushops && u.ushops.charCodeAt(0) && obj.unpaid) {
        const shkp = shop_keeper(in_rooms(u.ux, u.uy, SHOPBASE).charCodeAt(0) || 0);

        /* neither of the first two cases should be able to happen;
           only the hero should ever have an unpaid item, and only
           when inside a tended shop */
        if (!shkp) /* if shkp was killed, unpaid ought to cleared already */
            obj.unpaid = 0;
        else if (game.context.mon_moving) /* obj thrown by monster */
            subfrombill(obj, shkp);
        else /* obj thrown by hero */
            await stolen_value(obj, u.ux, u.uy, !!shkp.mpeaceful, false);
    }
    obfree(obj, null);
}

/* potionhit()'s do_healing: label */
async function potionhit_healing(mon, cureblind) {
    if (mon.mhp < mon.mhpmax) {
        healmon(mon, mon.mhpmax, 0);
        if (canseemon(mon))
            await pline(`${Monnam(mon)} looks sound and hale again.`);
    }
    if (cureblind)
        await mcureblindness(mon, canseemon(mon));
}

/* potionhit()'s do_illness: label */
async function potionhit_illness(mon) {
    if (mon.mhp > 2) {
        mon.mhp = Math.trunc(mon.mhp / 2);
        if (canseemon(mon))
            await pline(`${Monnam(mon)} looks rather ill.`);
    }
}

// C ref: potion.c potionbreathe() -- vapors are inhaled or get in your eyes
export async function potionbreathe(obj) {
    const u = game.u;
    let i, ii, isdone, kn = 0;
    let cureblind = false;
    const already_in_use = obj.in_use;

    /* potion of unholy water might be wielded; prevent
       you_were() -> drop_weapon() from dropping it so that it
       remains in inventory where our caller expects it to be */
    obj.in_use = 1;

    /* wearing a wet towel protects both eyes and breathing, even when
       the breath effect might be beneficial; we still pass down to the
       naming opportunity in case potion was thrown at hero by a monster */
    const which = Half_gas_damage() ? O.TOWEL : obj.otyp;
    switch (which) {
    case O.TOWEL:
        await pline("Some vapor passes harmlessly around you.");
        break;
    case O.POT_RESTORE_ABILITY:
    case O.POT_GAIN_ABILITY:
        if (obj.cursed) {
            if (!breathless(game.youmonst.data)) {
                await pline("Ulch!  That potion smells terrible!");
            } else if (haseyes(game.youmonst.data)) {
                let eyes = body_part(EYE);

                if (eyecount(game.youmonst.data) !== 1)
                    eyes = makeplural(eyes);
                await Your(`${eyes} ${vtense(eyes, "sting")}!`);
            }
            break;
        } else {
            i = rn2(A_MAX); /* start at a random point */
            for (isdone = ii = 0; !isdone && ii < A_MAX; ii++) {
                if (u.acurr.a[i] < u.amax.a[i]) {
                    u.acurr.a[i]++;
                    /* only first found if not blessed */
                    isdone = !(obj.blessed);
                    game.disp_botl = true;
                }
                if (++i >= A_MAX)
                    i = 0;
            }
        }
        break;
    case O.POT_FULL_HEALING:
    case O.POT_EXTRA_HEALING:
    case O.POT_HEALING:
        /* the FALLTHROUGH chain of the C switch */
        if (which === O.POT_FULL_HEALING) {
            if (Upolyd() && u.mh < u.mhmax)
                u.mh++, game.disp_botl = true;
            if (u.uhp < u.uhpmax)
                u.uhp++, game.disp_botl = true;
            cureblind = true;
        }
        if (which === O.POT_FULL_HEALING || which === O.POT_EXTRA_HEALING) {
            if (Upolyd() && u.mh < u.mhmax)
                u.mh++, game.disp_botl = true;
            if (u.uhp < u.uhpmax)
                u.uhp++, game.disp_botl = true;
            if (!obj.cursed)
                cureblind = true;
        }
        if (Upolyd() && u.mh < u.mhmax)
            u.mh++, game.disp_botl = true;
        if (u.uhp < u.uhpmax)
            u.uhp++, game.disp_botl = true;
        if (obj.blessed)
            cureblind = true;
        if (cureblind) {
            await make_blinded(0, !u.ucreamed);
            await make_deaf(0, true);
        }
        await exercise(A_CON, true);
        break;
    case O.POT_SICKNESS:
        if (!Role_if(PM_HEALER)) {
            if (Upolyd()) {
                if (u.mh <= 5)
                    u.mh = 1;
                else
                    u.mh -= 5;
            } else {
                if (u.uhp <= 5)
                    u.uhp = 1;
                else
                    u.uhp -= 5;
            }
            game.disp_botl = true;
            await exercise(A_CON, false);
        }
        break;
    case O.POT_HALLUCINATION:
        await You("have a momentary vision.");
        break;
    case O.POT_CONFUSION:
    case O.POT_BOOZE:
        if (!Confusion())
            await You_feel("somewhat dizzy.");
        await make_confused(itimeout_incr(uprop(CONFUSION).intrinsic, rnd(5)), false);
        break;
    case O.POT_INVISIBILITY:
        if (!Blind() && !Invis()) {
            kn++;
            await pline(`For an instant you ${
                See_invisible() ? "could see right through yourself"
                                : "couldn't see yourself"}!`);
        }
        break;
    case O.POT_PARALYSIS:
        kn++;
        if (!Free_action()) {
            await pline(`${Something} seems to be holding you.`);
            nomul(-rnd(5));
            game.multi_reason = "frozen by a potion";
            game.nomovemsg = You_can_move_again;
            await exercise(A_DEX, false);
        } else
            await You("stiffen momentarily.");
        break;
    case O.POT_SLEEPING:
        kn++;
        if (!Free_action() && !Sleep_resistance()) {
            await You_feel("rather tired.");
            nomul(-rnd(5));
            game.multi_reason = "sleeping off a magical draught";
            game.nomovemsg = You_can_move_again;
            await exercise(A_DEX, false);
        } else {
            await You("yawn.");
            monstseesu(M_SEEN_SLEEP);
        }
        break;
    case O.POT_SPEED:
        if (!Fast())
            await Your("knees seem more flexible now.");
        incr_itimeout(FAST, rnd(5));
        await exercise(A_DEX, true);
        break;
    case O.POT_BLINDNESS:
        if (!Blind() && !Unaware()) {
            kn++;
            await pline("It suddenly gets dark.");
        }
        await make_blinded(itimeout_incr(uprop(BLINDED).intrinsic & TIMEOUT, rnd(5)), false);
        if (!Blind() && !Unaware())
            await Your(vision_clears);
        break;
    case O.POT_WATER:
        if (u.umonnum === PM_GREMLIN) {
            await split_mon(game.youmonst, null);
        } else if (ismnum(u.ulycn)) {
            /* vapor from [un]holy water will trigger
               transformation but won't cure lycanthropy */
            if (obj.blessed && game.youmonst.data === mons[u.ulycn])
                await you_unwere(false);
            else if (obj.cursed && !Upolyd())
                await you_were();
        }
        break;
    case O.POT_ACID:
    case O.POT_POLYMORPH:
        await exercise(A_CON, false);
        break;
    /*
    case POT_GAIN_LEVEL:
    case POT_GAIN_ENERGY:
    case POT_LEVITATION:
    case POT_FRUIT_JUICE:
    case POT_MONSTER_DETECTION:
    case POT_OBJECT_DETECTION:
    case POT_OIL:
        break;
     */
    }

    if (!already_in_use)
        obj.in_use = 0;
    /* note: no obfree() -- that's our caller's responsibility */
    if (obj.dknown) {
        if (kn)
            makeknown(obj.otyp);
        else
            await trycall(obj);
    }
}

// C ref: potion.c mongrantswish() -- *monp grants a wish and then leaves
// the game (monp is { mon }; mon is set to null)
export async function mongrantswish(monp) {
    const mon = monp.mon;
    const mx = mon.mx, my = mon.my, glyph = glyph_at(mx, my);

    /* remove the monster first in case wish proves to be fatal
       (blasted by artifact), to keep it out of resulting bones file */
    mongone(mon);
    monp.mon = null; /* inform caller that monster is gone */
    /* hide that removal from player--map is visible during wish prompt */
    await tmp_at(DISP_ALWAYS, glyph);
    await tmp_at(mx, my);
    /* grant the wish */
    await makewish();
    /* clean up */
    await tmp_at(DISP_END, 0);
}

// C ref: potion.c djinni_from_bottle()
export async function djinni_from_bottle(obj) {
    const u = game.u;
    let mtmp;
    let chance;

    if (!(mtmp = makemon(mons[PM_DJINNI], u.ux, u.uy, MM_NOMSG))) {
        await pline("It turns out to be empty.");
        return;
    }

    if (!Blind()) {
        await pline(`In a cloud of smoke, ${a_monnam_dj(mtmp)} emerges!`);
        await pline(`${Monnam(mtmp)} speaks.`);
    } else {
        await You("smell acrid fumes.");
        await pline(`${Something} speaks.`);
    }

    chance = rn2(5);
    if (obj.blessed)
        chance = (chance === 4) ? rnd(4) : 0;
    else if (obj.cursed)
        chance = (chance === 0) ? rn2(4) : 4;
    /* 0,1,2,3,4:  b=80%,5,5,5,5; nc=20%,20,20,20,20; c=5%,5,5,5,80 */

    /* SetVoice(mtmp, 0, 80, 0): no voice interface */
    switch (chance) {
    case 0: {
        await verbalize("I am in your debt.  I will grant one wish!");
        /* give a wish and discard the monster (mtmp set to null) */
        const monp = { mon: mtmp };
        await mongrantswish(monp);
        mtmp = monp.mon;
        break;
    }
    case 1:
        await verbalize("Thank you for freeing me!");
        await tamedog_dj(mtmp, null, false);
        break;
    case 2:
        await verbalize("You freed me!");
        mtmp.mpeaceful = 1;
        set_malign_dj(mtmp);
        break;
    case 3:
        await verbalize("It is about time!");
        if (canspotmon(mtmp))
            await pline(`${Monnam(mtmp)} vanishes.`);
        mongone(mtmp);
        break;
    default:
        await verbalize("You disturbed me, fool!");
        mtmp.mpeaceful = 0;
        set_malign_dj(mtmp);
        break;
    }
}

// C ref: potion.c split_mon() -- clone a gremlin or mold
export async function split_mon(
    mon,    /* monster being split */
    mtmp) { /* optional attacker whose heat triggered it */
    let mtmp2;
    let reason = '';

    if (mtmp)
        reason = ` from ${(mtmp === game.youmonst) ? "your" /* the_your[1] */
                                                   : s_suffix(mon_nam(mtmp))} heat`;

    if (mon === game.youmonst) {
        throw new Error('split_mon(): cloneu() not ported yet');
    } else {
        if (mon.mhp > mon.mhpmax) /* sanity precaution */
            mon.mhp = mon.mhpmax;
        mtmp2 = (mon.mhp > 1) ? await clone_mon_sm(mon, 0, 0) : null;
        if (mtmp2) {
            /* mtmp2 has been created with mhpmax = mon->mhpmax,
               mhp = mon->mhp / 2, and mon->mh -= mtmp2->mhp;
               dividing max by 2 can't result in it exceeding current */
            mtmp2.mhpmax = Math.trunc(mon.mhpmax / 2);
            mon.mhpmax -= mtmp2.mhpmax;
            if (canspotmon(mon))
                await pline(`${Monnam(mon)} multiplies${reason}!`);
        }
    }
    return mtmp2;
}

// C ref: potion.c speed_up() -- Character becomes very fast temporarily.
export async function speed_up(duration) {
    if (!Very_fast())
        await You(`are suddenly moving ${Fast() ? "" : "much "}faster.`);
    else
        await Your(`${makeplural(body_part(LEG))} get new energy.`);

    await exercise(A_DEX, true);
    incr_itimeout(FAST, duration);
}

// C ref: exper.c rndexp()
export function rndexp(gaining) { /* gaining XP via potion vs setting XP for polyself */
    const u = game.u;
    let diff, factor, result;

    const minexp = (u.ulevel === 1) ? 0 : newuexp(u.ulevel - 1);
    const maxexp = newuexp(u.ulevel);
    diff = maxexp - minexp, factor = 1;
    /* make sure that `diff' is an argument which rn2() can handle */
    while (diff >= LARGEST_INT)
        diff = Math.trunc(diff / 2), factor *= 2;
    result = minexp + factor * rn2(diff);
    /* 3.4.1:  if already at level 30, add to current experience
       points rather than to threshold needed to reach the current level */
    if (u.ulevel === MAXULEV && gaining) {
        result += (u.uexp - minexp);
        /* avoid wrapping (over 400 blessed potions needed for that...) */
        if (result < u.uexp)
            result = u.uexp;
    }
    return result;
}

// C ref: wizard.c aggravate()
export function aggravate() {
    const in_w_tower = In_W_tower(game.u.ux, game.u.uy, game.u.uz);

    for (const mtmp of (game.level.monsters || []).slice()) {
        if (DEADMONSTER(mtmp) || mtmp.dead)
            continue;
        if (in_w_tower !== In_W_tower(mtmp.mx, mtmp.my, game.u.uz))
            continue;
        mtmp.mstrategy &= ~(STRAT_WAITFORU | STRAT_APPEARMSG);
        mtmp.msleeping = 0;
        if (!mtmp.mcanmove && !rn2(5)) {
            mtmp.mfrozen = 0;
            mtmp.mcanmove = 1;
        }
    }
}

// C ref: display.c set_mimic_blocking()
/* Block/unblock light depending on what a mimic is mimicking and if it's
 * invisible or not.  Should be called only when the state of See_invisible
 * changes. */
export function set_mimic_blocking() {
    for (const mtmp of (game.level.monsters || []))
        if (!mtmp.dead && mtmp.minvis && mtmp.m_ap_type
            && mtmp.m_ap_type !== 0 /* is_lightblocker_mappear() */)
            throw new Error('set_mimic_blocking(): invisible mimic light blocking not ported yet');
}

// C ref: objnam.c fruitname() -- convert player specified fruit name into
// corresponding fruit juice name
export function fruitname(juice) { /* whether or not to append " juice" to the name */
    const pl_fruit = game.pl_fruit;
    const at = pl_fruit.toLowerCase().indexOf(" of "); /* strstri() */
    const fruit_nam = (at >= 0) ? pl_fruit.slice(at + 4) /* skip past " of " */
                                : pl_fruit; /* use it as is */

    return `${makesingular(fruit_nam)}${juice ? " juice" : ""}`;
}

const hliquids = [
    "yoghurt", "oobleck", "clotted blood", "diluted water", "purified water",
    "instant coffee", "tea", "herbal infusion", "liquid rainbow",
    "creamy foam", "mulled wine", "bouillon", "nectar", "grog", "flubber",
    "ketchup", "slow light", "oil", "vinaigrette", "liquid crystal", "honey",
    "caramel sauce", "ink", "aqueous humour", "milk substitute",
    "fruit juice", "glowing lava", "gastric acid", "mineral water",
    "cough syrup", "quicksilver", "sweet vitriol", "grey goo", "pink slime",
    "cosmic latte", "bone oil", "custard", "lard", "vinegar", "creosote",
];

// C ref: do_name.c hliquid() -- if hallucinating, return a random liquid
// instead of 'liquidpref'
export function hliquid(liquidpref) { /* use as-is when not hallucintg (unless empty) */
    const hallucinate = Hallucination() && !game.program_state?.gameover;

    if (hallucinate || !liquidpref) {
        let count = hliquids.length;

        /* if we have a non-hallucinatory default value, include it
           among the choices */
        if (liquidpref)
            ++count;
        const indx = rn2_on_display_rng(count);
        if (indx >= 0 && indx < hliquids.length)
            return hliquids[indx];
    }
    return liquidpref;
}

// C ref: do.c trycall()
/* If obj is neither formally identified nor informally called something
 * already, prompt the player to call its object type. */
export async function trycall(obj) {
    if (!objects[obj.otyp].oc_name_known && !objects[obj.otyp].oc_uname)
        await docall(obj);
}

// C ref: do_name.c docall_xname() -- for use by safe_qbuf()
function docall_xname(obj) {
    const otemp = { ...obj };
    otemp.oextra = null;
    otemp.quan = 1;
    /* in case water is already known, convert "[un]holy water" to "water" */
    otemp.blessed = otemp.cursed = 0;
    /* remove attributes that are doname() caliber but get formatted
       by xname() */
    if (otemp.oclass === O.WEAPON_CLASS)
        otemp.otrapped /* opoisoned */ = 0; /* not poisoned */
    else if (otemp.oclass === POTION_CLASS)
        otemp.odiluted = 0; /* not diluted */
    else if (otemp.otyp === O.TOWEL || otemp.otyp === O.STATUE)
        otemp.spe = 0; /* not wet or historic */
    else if (otemp.otyp === O.TIN)
        otemp.known = 0; /* suppress tin type (homemade, &c) and mon type */
    else if (otemp.otyp === O.FIGURINE)
        otemp.corpsenm = NON_PM; /* suppress mon type */
    else if (otemp.otyp === O.HEAVY_IRON_BALL)
        otemp.owt = objects[O.HEAVY_IRON_BALL].oc_weight; /* not "very heavy" */
    else if (otemp.oclass === O.FOOD_CLASS && otemp.globby)
        otemp.owt = 120; /* 6*20, neither a small glob nor a large one */

    return an(xname(otemp));
}

// C ref: do_name.c docall() -- prompt to call an object type
export async function docall(obj) {
    let qbuf;

    if (!obj.dknown)
        return; /* probably blind; Blind || Hallucination for 'fromsink' */
    await flush_screen(1); /* buffered updates might matter to player's response */

    if (obj.oclass === POTION_CLASS && obj.fromsink)
        /* fromsink: kludge, meaning it's sink water */
        qbuf = `Call a stream of ${objects[obj.otyp].oc_descr} fluid:`;
    else
        qbuf = safe_qbuf("Call ", ":", obj, docall_xname, "thing");
    /* pointer to old name */
    const oc = objects[obj.otyp];
    /* use getlin() to get a name string from the player
       (name_from_player()) */
    let buf = await tty_getlin(qbuf);
    if (!buf || buf[0] === '\x1b')
        return;
    /* strip leading and trailing spaces, condense internal sequences */
    buf = mungspaces(buf);
    if (buf.length >= 63 /* PL_PSIZ */)
        buf = buf.slice(0, 63 - 1);

    /* clear old name */
    let had_name = false;
    if (oc.oc_uname) {
        had_name = true;
        oc.oc_uname = null; /* clear oc_uname */
    }

    /* strip leading and trailing spaces; uncalls item if all spaces */
    buf = mungspaces(buf);
    if (!buf) {
        if (had_name) /* possibly remove from disco[]; old *uname_p is gone */
            throw new Error('docall(): undiscover_object() not ported yet');
    } else {
        oc.oc_uname = buf;
        discover_object(obj.otyp, false, true, true); /* possibly add to disco[] */
    }
    /* if (obj->where == OBJ_INVENT || carrying(obj->otyp))
           update_inventory(): no perm_invent */
}

// C ref: potion.c dip_ok() -- getobj callback for object to be dipped
function dip_ok(obj) {
    if (!obj)
        return GETOBJ_DOWNPLAY;

    /* dipping gold isn't currently implemented */
    if (obj.oclass === COIN_CLASS)
        return GETOBJ_EXCLUDE;

    if (inaccessible_equipment(obj, null, false))
        return GETOBJ_EXCLUDE_INACCESS;

    return GETOBJ_SUGGEST;
}

// C ref: potion.c dip_hands_ok() -- getobj callback for object to be
// dipped when hero has slippery hands
function dip_hands_ok(obj) {
    const glib = game.u.uprops[GLIB] || {};
    if (!obj && ((glib.intrinsic || glib.extrinsic) && can_reach_floor(false))) /* Glib */
        return GETOBJ_SUGGEST;

    return dip_ok(obj);
}

// C ref: potion.c dodip() -- #dip command (M-d): get item to dip, then get
// potion to dip it into; precede with 'm' to bypass fountain, pool, or
// sink at hero's spot; only the first prompt is ported
export async function dodip() {
    const u = game.u;
    const here = game.level.at(u.ux, u.uy).typ;
    const at_pool = is_pool(u.ux, u.uy), at_fountain = IS_FOUNTAIN(here),
        at_sink = IS_SINK(here),
        at_here = (!game.iflags.menu_requested
                   && (at_pool || at_fountain || at_sink));

    const obj = await getobj("dip", at_here ? dip_hands_ok : dip_ok, GETOBJ_PROMPT);
    if (!obj)
        return ECMD_CANCEL;
    if (inaccessible_equipment(obj, "dip", false))
        return ECMD_OK;

    const is_hands = (obj === hands_obj);
    const shortestname = (is_hands || dip_is_plural(obj) || dip_pair_of(obj))
                         ? "them" : "it";
    drink_ok_extra = 0;
    /*
     * Bypass safe_qbuf() since it doesn't handle varying suffix without
     * an awful lot of support work.  Format the object once.
     * getobj: "What do you want to dip <the object> into? [xyz or ?*] "
     */
    let obuf;
    if (is_hands) {
        obuf = `your ${makeplural(body_part(HAND))}`;
    } else {
        obuf = short_oname_pt(obj, doname, thesimpleoname_pt,
                              /* 128 - (24 + 54 + 1) leaves 49 for
                                 <object> */
                              128 /* QBUFSZ */ - 78 /* sizeof "What do you want to dip\
 into? [abdeghjkmnpqstvwyzBCEFHIKLNOQRTUWXZ#-# or ?*] " */);
    }
    const verbose = game.flags.verbose;

    /* preceding #dip with 'm' skips the possibility of dipping into pools,
       fountains, and sinks plus the extra prompting which those entail */
    if (!game.iflags.menu_requested) {
        /* Is there a fountain to dip into here? */
        if (!can_reach_floor(false)) {
            ; /* can't dip something into fountain or pool if can't reach */
        } else if (at_fountain) {
            /* "Dip <the object> into the fountain?" */
            if ((await tty_yn_function(`Dip ${verbose ? obuf : shortestname
                                       } into the fountain?`, "yn", 'n')) === 'y') { /* y_n() */
                if (!is_hands)
                    obj.pickup_prev = 0;
                await dipfountain(obj);
                return ECMD_TIME;
            }
            ++drink_ok_extra;
        } else if (at_sink) {
            if ((await tty_yn_function(`Dip ${verbose ? obuf : shortestname
                                       } into the sink?`, "yn", 'n')) === 'y') { /* y_n() */
                if (!is_hands)
                    obj.pickup_prev = 0;
                await dipsink(obj);
                return ECMD_TIME;
            }
            ++drink_ok_extra;
        } else if (at_pool) {
            const pooltype = waterbody_name(u.ux, u.uy);

            /* "Dip <the object> into the {pool, moat, &c}?" */
            if ((await tty_yn_function(`Dip ${verbose ? obuf : shortestname
                                       } into the ${pooltype}?`, "yn", 'n')) === 'y') { /* y_n() */
                if (Levitation()) {
                    await floating_above(pooltype);
                } else if (u.usteed && !is_swimmer(u.usteed.data)
                           && P_SKILL(P_RIDING) < P_BASIC) {
                    throw new Error('dodip(): rider_cant_reach() not ported yet');
                } else if (is_hands || obj === game.uarmg) {
                    if (!is_hands)
                        obj.pickup_prev = 0;
                    await wash_hands();
                } else {
                    obj.pickup_prev = 0;
                    if (obj.otyp === O.POT_ACID)
                        obj.in_use = 1;
                    if ((await water_damage(obj, null, true)) !== 3 /* ER_DESTROYED */
                        && obj.in_use)
                        useup(obj);
                }
                return ECMD_TIME;
            }
            ++drink_ok_extra;
        }
    }

    /* "What do you want to dip <the object> into? [xyz or ?*] " */
    const potion = await getobj(`dip ${verbose ? obuf : shortestname} into`,
                                drink_ok, GETOBJ_NOFLAGS);
    if (!potion)
        return ECMD_CANCEL;
    return await potion_dip(obj, potion);
}

// C ref: potion.c poof()
async function poof(potion) {
    if (potion.dknown)
        await trycall(potion);
    useup(potion);
}

// C ref: potion.c mixtype()
/* returns the potion type when o1 is dipped in o2 */
function mixtype(o1, o2) {
    let o1typ = o1.otyp, o2typ = o2.otyp;

    /* cut down on the number of cases below */
    if (o1.oclass === POTION_CLASS_PD
        && (o2typ === O.POT_GAIN_LEVEL || o2typ === O.POT_GAIN_ENERGY
            || o2typ === O.POT_HEALING || o2typ === O.POT_EXTRA_HEALING
            || o2typ === O.POT_FULL_HEALING || o2typ === O.POT_ENLIGHTENMENT
            || o2typ === O.POT_FRUIT_JUICE)) {
        /* swap o1 and o2 */
        o1typ = o2.otyp;
        o2typ = o1.otyp;
    }

    switch (o1typ) {
    case O.POT_HEALING:
        if (o2typ === O.POT_SPEED)
            return O.POT_EXTRA_HEALING;
        /*FALLTHRU*/
    case O.POT_EXTRA_HEALING:
    case O.POT_FULL_HEALING:
        if (o2typ === O.POT_GAIN_LEVEL || o2typ === O.POT_GAIN_ENERGY)
            return (o1typ === O.POT_HEALING) ? O.POT_EXTRA_HEALING
                   : (o1typ === O.POT_EXTRA_HEALING) ? O.POT_FULL_HEALING
                     : O.POT_GAIN_ABILITY;
        /*FALLTHRU*/
    case O.UNICORN_HORN:
        switch (o2typ) {
        case O.POT_SICKNESS:
            return O.POT_FRUIT_JUICE;
        case O.POT_HALLUCINATION:
        case O.POT_BLINDNESS:
        case O.POT_CONFUSION:
            return O.POT_WATER;
        }
        break;
    case O.AMETHYST: /* "a-methyst" == "not intoxicated" */
        if (o2typ === O.POT_BOOZE)
            return O.POT_FRUIT_JUICE;
        break;
    case O.POT_GAIN_LEVEL:
    case O.POT_GAIN_ENERGY:
        switch (o2typ) {
        case O.POT_CONFUSION:
            return (rn2(3) ? O.POT_BOOZE : O.POT_ENLIGHTENMENT);
        case O.POT_HEALING:
            return O.POT_EXTRA_HEALING;
        case O.POT_EXTRA_HEALING:
            return O.POT_FULL_HEALING;
        case O.POT_FULL_HEALING:
            return O.POT_GAIN_ABILITY;
        case O.POT_FRUIT_JUICE:
            return O.POT_SEE_INVISIBLE;
        case O.POT_BOOZE:
            return O.POT_HALLUCINATION;
        }
        break;
    case O.POT_FRUIT_JUICE:
        switch (o2typ) {
        case O.POT_SICKNESS:
            return O.POT_SICKNESS;
        case O.POT_ENLIGHTENMENT:
        case O.POT_SPEED:
            return O.POT_BOOZE;
        case O.POT_GAIN_LEVEL:
        case O.POT_GAIN_ENERGY:
            return O.POT_SEE_INVISIBLE;
        }
        break;
    case O.POT_ENLIGHTENMENT:
        switch (o2typ) {
        case O.POT_LEVITATION:
            if (rn2(3))
                return O.POT_GAIN_LEVEL;
            break;
        case O.POT_FRUIT_JUICE:
            return O.POT_BOOZE;
        case O.POT_BOOZE:
            return O.POT_CONFUSION;
        }
        break;
    }

    return O.STRANGE_OBJECT;
}

// C ref: potion.c hold_potion()
async function hold_potion(
    potobj,
    drop_fmt, drop_arg,
    hold_msg)
{
    const g = game;
    const cap = near_capacity_pd(),
          save_pickup_burden = g.flags.pickup_burden;

    /* prevent a drop due to current setting of the 'pickup_burden' option */
    if ((g.flags.pickup_burden ?? MOD_ENCUMBER_PD) < cap)
        g.flags.pickup_burden = cap;
    /* remove from inventory after calculating near_capacity() */
    obj_extract_self_pd(potobj);
    /* re-insert into inventory, possibly merging with compatible stack */
    potobj = await hold_another_object_pd(potobj, drop_fmt, drop_arg, hold_msg);
    /* nhUse(potobj) */
    g.flags.pickup_burden = save_pickup_burden;
    /* update_inventory(): no perm_invent */
    return;
}

// C ref: potion.c dip_potion_explosion()
async function dip_potion_explosion(obj, dmg) {
    const u = game.u;

    if (obj.cursed || obj.otyp === POT_ACID_PD
        || (obj.otyp === POT_OIL_PD && obj.lamplit)
        || !rn2((game.uarmc && game.uarmc.otyp === O.ALCHEMY_SMOCK) ? 30 : 10)) {
        /* it would be better to use up the whole stack in advance
           of the message, but we can't because we need to keep it
           around for potionbreathe() [and we can't set obj->in_use
           to 'amt' because that's not implemented] */
        obj.in_use = 1;
        await pline(`${!Deaf() ? "BOOM!  " : ""}They explode!`);
        await wake_nearto(u.ux, u.uy, (BOLT_LIM_PD + 1) * (BOLT_LIM_PD + 1));
        await exercise(A_STR, false);
        if (!breathless(game.youmonst.data) || haseyes(game.youmonst.data))
            await potionbreathe(obj);
        useupall_pd(obj);
        await losehp(dmg, /* not physical damage */
                     "alchemic blast", KILLED_BY_AN);
        return true;
    }
    return false;
}

// C ref: potion.c potion_dip() -- dip obj into potion; the branches that
// need H2Opotion_dip(), poly_obj() or oil stop explicitly
async function potion_dip(obj, potion) {
    let singlepotion;
    let mixture;

    if (potion === obj && potion.quan === 1) {
        await pline("That is a potion bottle, not a Klein bottle!");
        return ECMD_OK;
    }
    if (obj === hands_obj) {
        await You(`can't fit your ${body_part_pd(HAND_PD)} into the mouth of the bottle!`);
        return ECMD_OK;
    }

    obj.pickup_prev = 0; /* no longer 'recently picked up' */
    potion.in_use = true; /* assume it will be used up */
    if (potion.otyp === POT_WATER_PD) {
        throw new Error('potion_dip(): H2Opotion_dip() not ported yet');
    } else if (obj.otyp === POT_POLYMORPH_PD || potion.otyp === POT_POLYMORPH_PD) {
        throw new Error('potion_dip(): dipping with polymorph (poly_obj()) not ported yet');
    } else if (obj.oclass === POTION_CLASS_PD && obj.otyp !== potion.otyp) {
        let amt = obj.quan;
        let qbuf;

        mixture = mixtype(obj, potion);

        const magic = (mixture !== O.STRANGE_OBJECT) ? objects[mixture].oc_magic
            : (objects[obj.otyp].oc_magic || objects[potion.otyp].oc_magic);
        qbuf = "The"; /* assume full stack */
        if (amt > (obj.odiluted ? 2 : magic ? 3 : 7)) {
            /* Trying to dip multiple potions will usually affect only a
               subset; pick an amount between 3 and 8, inclusive, for magic
               potion result, between 7 and N for non-magic. If diluted
               potions are being dipped, only two are affected; this is a
               balance fix to prevent cheap mass alchemy of the (very
               common) potion of healing into the (very valuable) potion of
               full healing, whilst permitting both healing->extra healing
               and extra healing->full healing. */
            if (obj.odiluted)
                amt = 2;
            else if (magic)
                amt = rnd(Math.min(amt, 8) - (3 - 1)) + (3 - 1); /* 1..6 + 2 */
            else
                amt = rnd(amt - (7 - 1)) + (7 - 1); /* 1..(N-6) + 6 */

            if (amt < obj.quan) {
                obj = splitobj_pd(obj, amt);
                qbuf = `${obj.quan} of the`;
            }
        }
        /* [N of] the {obj(s)} mix(es) with [one of] {the potion}... */
        await pline(`${qbuf} ${simpleonames_pd(obj)} ${otense_pd(obj, "mix")} with ${
            (potion.quan > 1) ? "one of " : ""}${thesimpleoname_pd(potion)}...`);
        /* get rid of 'dippee' before potential perm_invent updates */
        useup(potion); /* now gone */
        /* Mixing potions is dangerous...
           KMH, balance patch -- acid is particularly unstable */
        if (await dip_potion_explosion(obj, amt + rnd(9)))
            return ECMD_TIME;

        obj.blessed = obj.cursed = obj.bknown = 0;
        if (Blind() || Hallucination())
            obj.dknown = 0;

        if (mixture !== O.STRANGE_OBJECT) {
            obj.otyp = mixture;
        } else {
            let otmp;

            switch (obj.odiluted ? 1 : rnd(8)) {
            case 1:
                obj.otyp = POT_WATER_PD;
                break;
            case 2:
            case 3:
                obj.otyp = POT_SICKNESS_PD;
                break;
            case 4:
                otmp = mkobj_pd(POTION_CLASS_PD, false);
                obj.otyp = otmp.otyp;
                /* oil uses obj->age field differently from other potions */
                if (obj.otyp === POT_OIL_PD || otmp.otyp === POT_OIL_PD)
                    fixup_oil_pd(obj, otmp);
                obfree(otmp, null);
                break;
            default:
                useupall_pd(obj);
                await pline_The(`mixture ${!Blind() ? "glows brightly and " : ""}evaporates.`);
                return ECMD_TIME;
            }
        }
        obj.odiluted = (obj.otyp !== POT_WATER_PD) ? 1 : 0;

        if (obj.otyp === POT_WATER_PD && !Hallucination()) {
            await pline_The(`mixture bubbles${Blind() ? "" : ", then clears"}.`);
        } else if (!Blind()) {
            await pline_The(`mixture looks ${
                hcolor_pd(O.OBJ_DESCR(objects[obj.otyp]))}.`);
        }

        /* this is required when 'obj' was split off from a bigger stack,
           so that 'obj' will now be assigned its own inventory slot;
           it has a side-effect of merging 'obj' into another compatible
           stack if there is one, so we do it even when no split has
           been made in order to get the merge result for both cases;
           as a consequence, mixing while Fumbling drops the mixture */
        freeinv_pd(obj);
        await hold_potion(obj, "You drop %s!", doname(obj), null);
        return ECMD_TIME;
    }
    if (potion.otyp === POT_ACID_PD && obj.otyp === CORPSE_PD
        && obj.corpsenm === PM_LICHEN_PD) {
        await pline(`${The_pd(cxname_pd(obj))} ${otense_pd(obj, "turn")} ${
            Blind() ? "wrinkled"
                    : potion.odiluted ? hcolor_pd(NH_ORANGE_PD)
                                      : hcolor_pd(NH_RED_PD)} around the edges.`);
        potion.in_use = false; /* didn't go poof */
        if (potion.dknown)
            await trycall(potion);
        return ECMD_TIME;
    }
    /* (potion->otyp == POT_WATER && obj->otyp == TOWEL) follows a FALSE
       H2Opotion_dip(), which stops above */
    if (is_poisonable_pd(obj)) {
        if (potion.otyp === POT_SICKNESS_PD && !obj.opoisoned) {
            let buf;
            if (potion.quan > 1)
                buf = `One of ${the_pd(xname(potion))}`;
            else
                buf = The_pd(xname(potion));
            await pline(`${buf} forms a coating on ${the_pd(xname(obj))}.`);
            obj.opoisoned = 1;
            await poof(potion);
            return ECMD_TIME;
        } else if (obj.opoisoned && !permapoisoned_pd(obj)
                   && (potion.otyp === POT_HEALING_PD
                       || potion.otyp === POT_EXTRA_HEALING_PD
                       || potion.otyp === POT_FULL_HEALING_PD)) {
            await pline(`A coating wears off ${the_pd(xname(obj))}.`);
            obj.opoisoned = 0;
            await poof(potion);
            return ECMD_TIME;
        }
    }
    if (potion.otyp === POT_ACID_PD)
        throw new Error('potion_dip(): dipping into acid (erode_obj()) not ported yet');
    if (potion.otyp === POT_OIL_PD)
        throw new Error('potion_dip(): dipping into oil not ported yet');
    /* more_dips: lamp filling needs POT_OIL, which stops above */
    potion.in_use = false; /* didn't go poof */
    if ((obj.otyp === UNICORN_HORN_PD || obj.otyp === AMETHYST_PD)
        && (mixture = mixtype(obj, potion)) !== O.STRANGE_OBJECT) {
        let oldbuf, newbuf;
        const old_otyp = potion.otyp;
        let old_dknown = false;
        const more_than_one = potion.quan > 1;

        oldbuf = '';
        if (potion.dknown) {
            old_dknown = true;
            oldbuf = `${hcolor_pd(O.OBJ_DESCR(objects[potion.otyp]))} `;
        }
        /* with multiple merged potions, split off one and
           just clear it */
        if (potion.quan > 1) {
            singlepotion = splitobj_pd(potion, 1);
        } else
            singlepotion = potion;

        costly_alteration_pd(singlepotion, COST_NUTRLZ_PD);
        singlepotion.otyp = mixture;
        singlepotion.blessed = 0;
        if (mixture === POT_WATER_PD)
            singlepotion.cursed = singlepotion.odiluted = 0;
        else
            singlepotion.cursed = obj.cursed; /* odiluted left as-is */
        singlepotion.bknown = 0;
        singlepotion.dknown = 0; /* provisionally */
        if (!Blind()) {
            if (!Hallucination())
                observe_object_pd(singlepotion, Hallucination());
            newbuf = '';
            if (mixture === POT_WATER_PD && singlepotion.dknown)
                newbuf = "clears";
            else if (!Blind())
                newbuf = `turns ${hcolor_pd(O.OBJ_DESCR(objects[mixture]))}`;
            if (newbuf)
                await pline_The(`${oldbuf}potion${
                    more_than_one ? " that you dipped into" : ""} ${newbuf}.`);
            else
                await pline("Something happens.");

            if (old_dknown
                && !objects[old_otyp].oc_name_known
                && !objects[old_otyp].oc_uname) {
                /* fakeobj = cg.zeroobj */
                const fakeobj = { otyp: old_otyp, oclass: POTION_CLASS_PD,
                                  quan: 0, dknown: 1 }; /* no need to observe_object */
                await docall(fakeobj);
            }
        }
        /* remove potion from inventory and re-insert it, possibly stacking
           with compatible ones; override 'pickup_burden' while doing so */
        await hold_potion(singlepotion, "You juggle and drop %s!",
                          doname(singlepotion), null);
        return ECMD_TIME;
    }

    await pline("Interesting...");
    return ECMD_TIME;
}


/* C ref: obj.h is_plural(), objnam.c pair_of() */
function dip_is_plural(o) {
    if (o.quan !== 1)
        return true;
    /* "the Eyes of the Overworld" are plural, but
       "a pair of lenses named the Eyes of the Overworld" is not */
    return (o.oartifact === ART_EYES_OF_THE_OVERWORLD
            && !undiscovered_artifact(ART_EYES_OF_THE_OVERWORLD));
}
function dip_pair_of(o) {
    return (o.otyp === O.LENSES
            || (o.oclass === O.ARMOR_CLASS
                && (objects[o.otyp].oc_armcat === O.ARM_GLOVES
                    || objects[o.otyp].oc_armcat === O.ARM_BOOTS)));
}
