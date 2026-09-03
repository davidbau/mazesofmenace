// read.js — the 'r' command.
// C ref: src/read.c
//
// The spellbook route is live (doread -> study_book); scroll effects need
// seffects and stay recorded after their prompt keys are consumed.

import { unique_corpstat } from './mondata.js';
import { has_omonst } from './const.js';
import { monster_census } from './minion.js';
import { monsndx, NO_MINVENT, MM_NOMSG } from './makemon.js';
import { pmname } from './do_name.js';
import { done, delayed_killer } from './end.js';
import { type_is_pname } from './mondata.js';
import { Role_if, adjalign } from './attrib.js';
import { quest_info } from './questpgr.js';
import { urgent_pline } from './display.js';
import { Unchanging } from './youprop.js';
import { polyself, rehumanize, udeadinside } from './polyself.js';
import { uhis } from './mhitu.js';
import { mongone, kill_genocided_monsters } from './mon.js';
import { list_genocided, num_genocides } from './insight.js';
import { livelog_printf, verbalize } from './pline.js';
import { mungspaces } from './hacklib.js';
import { LOW_PM, NEUTRAL, G_GENOD, G_EXTINCT, LL_GENOCIDE, LL_CONDUCT, KILLED_BY, GENOCIDED, POLYMORPH, POLY_REVERT, Upolyd, plur, thats_enough_tries, MALE, FEMALE } from './const.js';
import { NUMMONS, MSOUND } from './monst_data.js';
import { vampshifted } from './monst.js';
import { name_to_mon, is_human, is_demon } from './mondata.js';
import { readmail } from './mail.js';
import { trap_detect, gold_detect, food_detect } from './detect.js';
import { actualoname } from './objnam.js';
import { TIMEOUT } from './const.js';
import { make_stunned } from './potion.js';
import { disintegrate_arm, any_worn_armor_ok, destroy_arm } from './do_wear.js';
import { set_bc } from './cmd.js';
import { dropy, placebc } from './do.js';
import { is_whirly } from './mondata.js';
import { WT_IRON_BALL_INCR } from './const.js';
import { game } from './gstate.js';
import { getobj, GETOBJ_PROMPT, ECMD_TIME, ECMD_OK } from './invent.js';
import { ECMD_CANCEL, SPE_LIM, CORR, Is_rogue_level, W_ARMOR, W_ARM, NODIR,
         A_STR, A_CON, W_BALL, W_CHAIN, W_ART, W_ARTI, TT_BURIEDBALL,
         BY_COOKIE, G_UNIQ, M_AP_TYPE, M_AP_MONSTER, M_AP_OBJECT,
         M_AP_FURNITURE, MM_FEMALE, MM_MALE, NON_PM, W_SADDLE,
         OBJ_AT, COLNO, ROWNO, BOLT_LIM, HAND, HEAD, NH_RED,
         NH_PURPLE } from './const.js';
import { sgn, distu, isok } from './hacklib.js';
import { valid_cloud_pos } from './region.js';
import { cansee } from './vision.js';
import { bcsign, blessorcurse, mkobj, mksobj, place_object,
         uncurse } from './mkobj.js';
import { chwepon } from './wield.js';
import { erosion_matters } from './mkobj.js';
import { OCLASSES, ONAMES } from './objects_data.js';
import { newsym, pline, sensemon, canspotmon } from './display.js';
import { rn1, rn2, rnd } from './rng.js';
import { getlin } from './cmd.js';
import { has_head, hides_under, is_hider, is_silent,
         name_to_monplus } from './mondata.js';
import { is_female, is_male, makemon, mkclass, rndmonst,
         set_malign } from './makemon.js';
import { canseemon } from './display.js';
import { Amonnam, hcolor, trycall, upstart } from './do_name.js';
import { an, makeplural, makesingular, simpleonames, vtense } from './objnam.js';
import { def_monsyms, defsyms, monexplain } from './drawing_data.js';
import { MM_MINVIS, MM_NOEXCLAM } from './const.js';
import { study_book } from './spell.js';
import { do_mapping } from './detect.js';
import { do_clear_area, vision_recalc } from './vision.js';
import { makeknown } from './o_init.js';
import { more_experienced } from './exper.js';
import { Norep, pline_The, set_msg_xy, You, Your, You_feel,
         You_hear } from './pline.js';
import { DEADMONSTER } from './monst.js';
import { NOTELL } from './const.js';
import { monflee } from './monmove.js';
import { resist } from './zap.js';
import { create_critters } from './makemon.js';
import { some_armor, adj_abon } from './do_wear.js';
import { remove_worn_item } from './steal.js';
import { alter_cost, costly_alteration } from './shk.js';
import { arti_light_radius } from './light.js';
import { maybe_adjust_light, curse, bless } from './mkobj.js';
import { artifact_light } from './artifact.js';
import { is_elven_armor } from './worn.js';
import { Is_dragon_scales } from './mondata.js';
import { is_shield } from './obj.js';
import { Yobjnam2, Yname2, otense } from './objnam.js';
import { strange_feeling } from './potion.js';
import { NH_BLACK, NH_GOLDEN, NH_SILVER, COST_DEGRD, COST_DECHNT } from './const.js';
import { losespells } from './spell.js';
import { drain_weapon_skill, dmgval } from './weapon.js';
import { ALL_SPELLS, W_ARMH, STOMACH, KILLED_BY_AN, IS_OBSTRUCTED, IS_AIR, engulfing_u, In_endgame, Is_earthlevel } from './const.js';
import { weight, stackobj, obfree } from './invent.js';
import { worn, hard_helmet } from './do_wear.js';
import { wake_nearto, wakeup, killed, mondied } from './mon.js';
import { flooreffects } from './do.js';
import { losehp } from './hack.js';
import { amorphous, passes_walls, noncorporeal, unsolid, mhim } from './mondata.js';
import { Passes_walls, Deaf } from './youprop.js';
import { map_invisible } from './display.js';
import { mbodypart } from './polyself.js';
import { doname, xname } from './objnam.js';
import { s_suffix } from './hacklib.js';
import { mon_nam, Monnam } from './do_name.js';
import { closed_door } from './cmd.js';
import { has_ceiling, ceiling, avoid_ceiling } from './dungeon.js';
import { sokoban_guilt } from './trap.js';
import { d } from './rng.js';
import { end_burn } from './timeout.js';
import { Tobjnam } from './objnam.js';
import { is_weptool } from './mkobj.js';
import { GETOBJ_ALLOWCNT } from './invent.js';
import { GETOBJ_SUGGEST, GETOBJ_DOWNPLAY, GETOBJ_EXCLUDE, GETOBJ_EXCLUDE_SELECTABLE, LEFT_RING, RIGHT_RING, COST_UNCHRG, NH_BLUE, NH_WHITE, NH_AMBER, NH_LIGHT_BLUE, nothing_happens } from './const.js';
import { Ring_on, Ring_off, Ring_gone } from './do_wear.js';
import { useup, identify_pack, update_inventory } from './invent.js';
import { exercise } from './attrib.js';
import { A_WIS } from './const.js';
import { outrumor } from './rumors.js';
import { setworn, which_armor } from './worn.js';
import { LIMITS, MFLAGS, MONSYMS, PMNAMES, mons_name } from './monst_data.js';
import { delobj, is_pool, m_at, setmangry } from './mon.js';
import { roles } from './role_data.js';
import { body_part } from './polyself.js';
import { Blind, Hallucination, Invisible } from './youprop.js';
import { make_confused } from './potion.js';

function note_unported_read(what) {
    (game.unported ||= new Set()).add('read:' + what);
}

// src/mondata.c:580 can_chant().
function can_chant(mtmp) {
    const data = mtmp?.data;
    const strangled = mtmp === game.youmonst
        && !!(game.u.intrinsic?.HStrangled || game.u.uprops?.STRANGLED);

    return !!data && !strangled && !is_silent(data) && has_head(data)
        && data.msound !== MFLAGS.MS_BUZZ
        && data.msound !== MFLAGS.MS_BURBLE;
}

// src/read.c:315 read_ok() — getobj filter for 'r'; lives in js/cmd.js
// beside the other command filters and is passed in by the caller.

// src/read.c:330 doread()
export async function doread(read_ok) {
    const { check_capacity } = await import('./hack.js');
    if (await check_capacity(null))
        return ECMD_OK;

    const scroll = await getobj('read', read_ok, GETOBJ_PROMPT);
    if (!scroll)
        return ECMD_CANCEL;
    const otyp = scroll.otyp;
    scroll.pickup_prev = 0;

    if (otyp === ONAMES.FORTUNE_COOKIE) {
        if (game.flags.verbose)
            await You('break up the cookie and throw away the pieces.');
        await outrumor(bcsign(scroll), BY_COOKIE);
        if (!game.u.ublind) {
            game.u.uconduct = game.u.uconduct || {};
            game.u.uconduct.literate = (game.u.uconduct.literate || 0) + 1;
        }
        useup(scroll);
        return ECMD_TIME;
    }

    /* shirts / candy wrapper arms */
    if (otyp === ONAMES.T_SHIRT || otyp === ONAMES.ALCHEMY_SMOCK
        || otyp === ONAMES.HAWAIIAN_SHIRT
        || otyp === ONAMES.APRON || otyp === ONAMES.CANDY_BAR) {
        note_unported_read('doread:novelty_text');
        return ECMD_TIME;
    }
    if (scroll.oclass !== OCLASSES.SCROLL_CLASS
        && scroll.oclass !== OCLASSES.SPBOOK_CLASS) {
        await pline("That is a silly thing to read.");
        return ECMD_OK;
    }
    if (game.u.ublind && otyp !== ONAMES.SPE_BOOK_OF_THE_DEAD) {
        let what = null;
        if (otyp === ONAMES.SPE_NOVEL)
            what = 'words';
        else if (scroll.oclass === OCLASSES.SPBOOK_CLASS)
            what = 'mystic runes';
        else if (!scroll.dknown)
            what = 'formula on the scroll';
        if (what) {
            await pline(`Being blind, you cannot read the ${what}.`);
            return ECMD_OK;
        }
    }

    /* Blank paper and the two special books do not break illiterate conduct. */
    if (otyp !== ONAMES.SCR_BLANK_PAPER
        && otyp !== ONAMES.SPE_BLANK_PAPER
        && otyp !== ONAMES.SPE_BOOK_OF_THE_DEAD
        && otyp !== ONAMES.SPE_NOVEL) {
        game.u.uconduct = game.u.uconduct || {};
        game.u.uconduct.literate = (game.u.uconduct.literate || 0) + 1;
    }

    if (scroll.oclass === OCLASSES.SPBOOK_CLASS)
        return (await study_book(scroll)) ? ECMD_TIME : ECMD_OK;

    /* src/read.c:617 — the scroll path. Blind and confused readings need
       state no session reaches yet. */
    game.known = false;
    if (otyp !== ONAMES.SCR_BLANK_PAPER) {
        const nodisappear = (otyp === ONAMES.SCR_FIRE
                             || (otyp === ONAMES.SCR_REMOVE_CURSE
                                 && scroll.cursed));
        const silently = !can_chant(game.youmonst);
        if (Blind()) {
            await pline(nodisappear
                ? `You ${silently ? 'cogitate' : 'pronounce'} the formula on the scroll.`
                : `As you ${silently ? 'cogitate' : 'pronounce'} the formula on it, the scroll disappears.`);
        } else {
            await pline(nodisappear ? 'You read the scroll.'
                                    : 'As you read the scroll, it disappears.');
        }
        if (game.u.uprops?.CONFUSION || game.u.intrinsic?.HConfusion) {
            if (Hallucination())
                await pline('Being so trippy, you screw up...');
            else
                await pline(`Being confused, you ${silently
                    ? 'misunderstand' : 'mispronounce'} the magic words...`);
        }
    }

    if (!await seffects(scroll)) {
        if (!game.objects[otyp].oc_name_known) {
            if (game.known)
                learnscroll(scroll);
            else
                await trycall(scroll);
        }
        if (otyp !== ONAMES.SCR_BLANK_PAPER)
            useup(scroll);
    }
    return ECMD_TIME;
}

// src/read.c:308 learnscroll() — reading identifies the scroll type.
// Also called from teleport.js for the scroll of teleportation.
export function learnscroll(sobj) {
    /* it's implied that sobj->dknown is set;
       we couldn't be reading this scroll otherwise */
    if (sobj.oclass !== OCLASSES.SPBOOK_CLASS)
        learnscrolltyp(sobj.otyp);
}

// src/read.c:2263 seffects() — scroll effects, one arm per type. Only
// magic mapping is live; every other scroll records with its otyp so the
// gap is visible per type. Returns true when the scroll was already used
// up by its own arm.
// src/read.c:652 stripspe() — a cursed recharge drains the charges.
async function stripspe(obj) {
    if (obj.blessed || obj.spe <= 0) {
        await pline(nothing_happens);
    } else {
        /* order matters: message, shop handling, actual transformation */
        await pline(`${Yobjnam2(obj, 'vibrate')} briefly.`);
        await costly_alteration(obj, COST_UNCHRG);
        obj.spe = 0;
        if (obj.otyp === ONAMES.OIL_LAMP || obj.otyp === ONAMES.BRASS_LANTERN)
            obj.age = 0;
    }
}

// src/read.c:667 p_glow1()
async function p_glow1(otmp) {
    await pline(`${Yobjnam2(otmp, Blind() ? 'vibrate' : 'glow')} briefly.`);
}

// src/read.c:673 p_glow2()
async function p_glow2(otmp, color) {
    await pline(`${Yobjnam2(otmp, Blind() ? 'vibrate' : 'glow')}${
        Blind() ? '' : ' '}${Blind() ? '' : hcolor(color)} for a moment.`);
}

// src/read.c:680 p_glow3()
async function p_glow3(otmp, color) {
    await pline(`${Yobjnam2(otmp, Blind() ? 'vibrate' : 'glow')} feebly${
        Blind() ? '' : ' '}${Blind() ? '' : hcolor(color)} for a moment.`);
}

// src/read.c:689 charge_ok() — getobj callback for charging.
function charge_ok(obj) {
    if (!obj)
        return GETOBJ_EXCLUDE;

    if (obj.oclass === OCLASSES.WAND_CLASS)
        return GETOBJ_SUGGEST;
    /* known charged rings */
    if (obj.oclass === OCLASSES.RING_CLASS && game.objects[obj.otyp].oc_charged
        && obj.dknown && game.objects[obj.otyp].oc_name_known)
        return GETOBJ_SUGGEST;

    if (is_weptool(obj, game.objects)) /* specific check before general tools */
        return GETOBJ_EXCLUDE;
    if (obj.oclass === OCLASSES.TOOL_CLASS) {
        /* suggest tools that aren't oc_charged but can be recharged */
        if (obj.otyp === ONAMES.BRASS_LANTERN
            || (obj.otyp === ONAMES.OIL_LAMP)
            || (obj.otyp === ONAMES.MAGIC_LAMP
                && !game.objects[ONAMES.MAGIC_LAMP].oc_name_known)) {
            return GETOBJ_SUGGEST;
        }
        /* suggest known charged tools; downplay unknown ones so that a
           player can't use the charging prompt to glean information
           (e.g. revealing if an unidentified 'flute' is magic or not) */
        if (game.objects[obj.otyp].oc_charged) {
            return (obj.dknown && game.objects[obj.otyp].oc_name_known)
                     ? GETOBJ_SUGGEST : GETOBJ_DOWNPLAY;
        }
        return GETOBJ_EXCLUDE;
    }
    /* why are weapons/armor considered charged anyway?
       make them selectable even so for "feeling of loss" message */
    return GETOBJ_EXCLUDE_SELECTABLE;
}

// src/read.c:2414 wand_explode() — a wand blows up in the hero's hands.
async function wand_explode(obj, chg /* recharging */) {
    const expl = !chg ? 'suddenly' : 'vibrates violently and';
    let dmg, n, k;

    /* number of damage dice */
    if (!chg)
        chg = 2; /* zap/engrave adjustment */
    n = obj.spe + chg;
    if (n < 2)
        n = 2; /* arbitrary minimum */
    /* size of damage dice */
    switch (obj.otyp) {
    case ONAMES.WAN_WISHING:
        k = 12;
        break;
    case ONAMES.WAN_CANCELLATION:
    case ONAMES.WAN_DEATH:
    case ONAMES.WAN_POLYMORPH:
    case ONAMES.WAN_UNDEAD_TURNING:
        k = 10;
        break;
    case ONAMES.WAN_COLD:
    case ONAMES.WAN_FIRE:
    case ONAMES.WAN_LIGHTNING:
    case ONAMES.WAN_MAGIC_MISSILE:
        k = 8;
        break;
    case ONAMES.WAN_NOTHING:
        k = 4;
        break;
    default:
        k = 6;
        break;
    }
    /* inflict damage and destroy the wand */
    dmg = d(n, k);
    obj.in_use = true; /* in case losehp() is fatal (or --More--^C) */
    await pline(`${Yname2(obj)} ${expl} explodes!`);
    if (game.u.uprops?.HALF_PHDAM)
        dmg = Math.trunc((dmg + 1) / 2);   /* Maybe_Half_Phys */
    await losehp(dmg, 'exploding wand', KILLED_BY_AN);
    useup(obj);
    /* obscure side-effect */
    exercise(A_STR, false);
}

// src/read.c:729 recharge() — apply a scroll of charging to obj.
export async function recharge(obj, curse_bless) {
    const u = game.u;
    let n;
    const is_cursed = curse_bless < 0;
    const is_blessed = curse_bless > 0;

    if (obj.oclass === OCLASSES.WAND_CLASS) {
        const lim = (obj.otyp === ONAMES.WAN_WISHING)
                      ? 1
                      : (game.objects[obj.otyp].oc_dir !== NODIR) ? 8 : 15;

        /* undo any prior cancellation, even when is_cursed */
        if (obj.spe === -1)
            obj.spe = 0;

        /*
         * Recharging might cause wands to explode.
         *      v = number of previous recharges
         *            v = percentage chance to explode on this attempt
         *                    v = cumulative odds for exploding
         *      0 :   0       0
         *      1 :   0.29    0.29
         *      2 :   2.33    2.62
         *      3 :   7.87   10.28
         *      4 :  18.66   27.02
         *      5 :  36.44   53.62
         *      6 :  62.97   82.83
         *      7 : 100     100
         */
        n = obj.recharged | 0;
        if (n > 0 && (obj.otyp === ONAMES.WAN_WISHING
                      || (n * n * n > rn2(7 * 7 * 7)))) { /* recharge_limit */
            await wand_explode(obj, rnd(lim));
            return;
        }
        /* didn't explode, so increment the recharge count */
        obj.recharged = n + 1;

        /* now handle the actual recharging */
        if (is_cursed) {
            await stripspe(obj);
        } else {
            n = (lim === 1) ? 1 : rn1(5, lim + 1 - 5);
            if (!is_blessed)
                n = rnd(n);

            if (obj.spe < n)
                obj.spe = n;
            else
                obj.spe++;
            if (obj.otyp === ONAMES.WAN_WISHING && obj.spe > 3) {
                /* wand of wishing exploding with too many charges is
                   currently unreachable but left in case the rules for
                   wands of wishing change in future */
                await wand_explode(obj, 1);
                return;
            }
            if (lim === 1)
                await p_glow3(obj, NH_BLUE);
            else if (obj.spe >= lim)
                await p_glow2(obj, NH_BLUE);
            else
                await p_glow1(obj);
            /* [shop price doesn't vary by charge count] */
        }

    } else if (obj.oclass === OCLASSES.RING_CLASS
               && game.objects[obj.otyp].oc_charged) {
        /* charging does not affect ring's curse/bless status */
        let s = is_blessed ? rnd(3) : is_cursed ? -rnd(2) : 1;
        const is_on = (obj === u.uleft || obj === u.uright);

        /* destruction depends on current state, not adjustment */
        if (obj.spe > rn2(7) || obj.spe <= -5) {
            await pline(`${Yobjnam2(obj, 'pulsate')} momentarily, then ${
                otense(obj, 'explode')}!`);
            if (is_on)
                await Ring_gone(obj);
            s = rnd(3 * Math.abs(obj.spe)); /* amount of damage */
            useup(obj), obj = null;
            if (u.uprops?.HALF_PHDAM)
                s = Math.trunc((s + 1) / 2);   /* Maybe_Half_Phys */
            await losehp(s, 'exploding ring', KILLED_BY_AN);
        } else {
            const mask = is_on ? (obj === u.uleft ? LEFT_RING : RIGHT_RING) : 0;

            await pline(`${Yname2(obj)} spins ${s < 0 ? 'counter' : ''}clockwise for a moment.`);
            if (s < 0)
                await costly_alteration(obj, COST_DECHNT);
            /* cause attributes and/or properties to be updated */
            if (is_on)
                await Ring_off(obj);
            obj.spe += s; /* update the ring while it's off */
            if (is_on)
                setworn(obj, mask), await Ring_on(obj);
            /* oartifact: if a touch-sensitive artifact ring is
               ever created the above will need to be revised  */
            if (s > 0 && obj.unpaid)
                alter_cost(obj, 0);
        }

    } else if (obj.oclass === OCLASSES.TOOL_CLASS) {
        const rechrg = obj.recharged | 0;

        if (game.objects[obj.otyp].oc_charged) {
            /* tools don't have a limit, but the counter used does */
            if (rechrg < 7) /* recharge_limit */
                obj.recharged++;
        }
        let not_chargable = false;
        switch (obj.otyp) {
        case ONAMES.BELL_OF_OPENING:
            if (is_cursed)
                await stripspe(obj);
            else if (is_blessed)
                obj.spe += rnd(3);
            else
                obj.spe += 1;
            if (obj.spe > 5)
                obj.spe = 5;
            break;
        case ONAMES.MAGIC_MARKER:
        case ONAMES.TINNING_KIT:
        case ONAMES.EXPENSIVE_CAMERA:
            if (is_cursed) {
                await stripspe(obj);
            } else if (rechrg && obj.otyp === ONAMES.MAGIC_MARKER) {
                /* previously recharged */
                obj.recharged = 1; /* override increment done above */
                if (obj.spe < 3)
                    await Your('marker seems permanently dried out.');
                else
                    await pline(nothing_happens);
            } else if (is_blessed) {
                n = rn1(16, 15); /* 15..30 */
                if (obj.spe + n <= 50)
                    obj.spe = 50;
                else if (obj.spe + n <= 75)
                    obj.spe = 75;
                else {
                    const chrg = obj.spe;
                    if ((chrg + n) > 127)
                        obj.spe = 127;
                    else
                        obj.spe += n;
                }
                await p_glow2(obj, NH_BLUE);
            } else {
                n = rn1(11, 10); /* 10..20 */
                if (obj.spe + n <= 50)
                    obj.spe = 50;
                else {
                    const chrg = obj.spe;
                    if (chrg + n > SPE_LIM)
                        obj.spe = SPE_LIM;
                    else
                        obj.spe += n;
                }
                await p_glow2(obj, NH_WHITE);
            }
            break;
        case ONAMES.OIL_LAMP:
        case ONAMES.BRASS_LANTERN:
            if (is_cursed) {
                await stripspe(obj);
                if (obj.lamplit) {
                    if (!Blind())
                        await pline(`${Tobjnam(obj, 'go')} out!`);
                    await end_burn(obj, true);
                }
            } else if (is_blessed) {
                obj.spe = 1;
                obj.age = 1500;
                await p_glow2(obj, NH_BLUE);
            } else {
                obj.spe = 1;
                obj.age += 750;
                if (obj.age > 1500)
                    obj.age = 1500;
                await p_glow1(obj);
            }
            break;
        case ONAMES.CRYSTAL_BALL:
            if (obj.spe === -1) /* like wands, first uncancel */
                obj.spe = 0;
            if (is_cursed) {
                if (!obj.cursed) {
                    await p_glow2(obj, NH_BLACK);
                    curse(obj);
                } else {
                    await pline(`${Yobjnam2(obj, 'vibrate')} briefly.`);
                }
                if (obj.spe > 0)
                    await costly_alteration(obj, COST_UNCHRG);
                obj.spe = 0;
            } else if (is_blessed) {
                obj.spe = 7;
                await p_glow2(obj, !obj.blessed ? NH_LIGHT_BLUE : NH_BLUE);
                if (!obj.blessed)
                    bless(obj);
            } else {
                if (obj.spe < 7 || obj.cursed) {
                    n = rnd(2);
                    obj.spe = Math.min(obj.spe + n, 7);
                    if (!obj.cursed) {
                        await p_glow1(obj);
                    } else {
                        await p_glow2(obj, NH_AMBER);
                        uncurse(obj);
                    }
                } else {
                    await pline(nothing_happens);
                }
            }
            break;
        case ONAMES.HORN_OF_PLENTY:
        case ONAMES.BAG_OF_TRICKS:
        case ONAMES.CAN_OF_GREASE:
            if (is_cursed) {
                await stripspe(obj);
            } else if (is_blessed) {
                if (obj.spe <= 10)
                    obj.spe += rn1(10, 6);
                else
                    obj.spe += rn1(5, 6);
                if (obj.spe > 50)
                    obj.spe = 50;
                await p_glow2(obj, NH_BLUE);
            } else {
                obj.spe += rn1(5, 2);
                if (obj.spe > 50)
                    obj.spe = 50;
                await p_glow1(obj);
            }
            break;
        case ONAMES.MAGIC_FLUTE:
        case ONAMES.MAGIC_HARP:
        case ONAMES.FROST_HORN:
        case ONAMES.FIRE_HORN:
        case ONAMES.DRUM_OF_EARTHQUAKE:
            if (is_cursed) {
                await stripspe(obj);
            } else if (is_blessed) {
                obj.spe += d(2, 4);
                if (obj.spe > 20)
                    obj.spe = 20;
                await p_glow2(obj, NH_BLUE);
            } else {
                obj.spe += rnd(4);
                if (obj.spe > 20)
                    obj.spe = 20;
                await p_glow1(obj);
            }
            break;
        default:
            not_chargable = true;   /* goto not_chargable */
            break;
        } /* switch */
        if (not_chargable)
            await You('have a feeling of loss.');

    } else {
        await You('have a feeling of loss.');
    }
    if (obj)
        cap_spe(obj);
}

// src/read.c:1788 seffect_charging()
async function seffect_charging(sobj) {
    const u = game.u;
    const otyp = sobj.otyp;
    const sblessed = !!sobj.blessed;
    const scursed = !!sobj.cursed;
    const confused = !!u.uprops?.CONFUSION;
    const already_known = (sobj.oclass === OCLASSES.SPBOOK_CLASS /* spell */
                           || !!game.objects[otyp].oc_name_known);

    if (confused) {
        if (scursed) {
            await You_feel('discharged.');
            u.uen = 0;
        } else {
            await You_feel('charged up!');
            u.uen += d(sblessed ? 6 : 4, 4);
            if (u.uen > u.uenmax) /* if current energy is already at   */
                u.uenmax = u.uen; /* or near maximum, increase maximum */
            else
                u.uen = u.uenmax; /* otherwise restore current to max  */
        }
        (game.disp ||= {}).botl = true;
        return false;
    }
    /* known = TRUE; -- handled inline here */
    if (!already_known) {
        await pline('This is a charging scroll.');
        learnscroll(sobj);
    }
    /* use it up now to prevent it from showing in the
       getobj picklist because the "disappears" message
       was already delivered */
    useup(sobj);
    /* *sobjp = 0; -- it's gone */
    const otmp = await getobj('charge', charge_ok, GETOBJ_PROMPT | GETOBJ_ALLOWCNT);
    if (otmp)
        await recharge(otmp, scursed ? -1 : sblessed ? 1 : 0);
    return true;
}

// src/read.c:1020 forget() — amnesia: lose spells, weapon skills and every
// monster's remembered appearance.
async function forget(howmuch) {
    const u = game.u;

    if (u.uball)   /* Punished */
        u.bc_felt = 0; /* forget felt ball&chain */

    /*
     * Forgetting spells is done in a separate section, so that the
     * player can be told which spells are forgotten.
     */
    if (howmuch & ALL_SPELLS)
        losespells();

    /* Forget some skills. */
    await drain_weapon_skill(rnd(howmuch ? 5 : 3));

    /*
     * Forgetting the map is done in a separate section since it
     * is redone each level, and the player can see the results.
     */
    /* forget that any monster has ever been seen */
    for (const mtmp of game.level?.monsters || [])
        if (mtmp !== u.usteed && mtmp !== u.ustuck)
            mtmp.meverseen = 0;
    for (const mtmp of game.migrating_mons || [])
        mtmp.meverseen = 0;
}

// src/read.c:1830 seffect_amnesia()
async function seffect_amnesia(sobj) {
    const sblessed = !!sobj.blessed;

    game.known = true;
    await forget((!sblessed ? ALL_SPELLS : 0));
    if (Hallucination()) /* Ommmmmm! */
        await Your('mind releases itself from mundane concerns.');
    else if (String(game.plname || '').slice(0, 4).toLowerCase() === 'maud')
        await pline('As your mind turns inward on itself, you forget everything else.');
    else if (rn2(2))
        await pline('Who was that Maud person anyway?');
    else
        await pline('Thinking of Maud you forget everything else.');
    exercise(A_WIS, false);
}

// src/read.c:2294 drop_boulder_on_player() — a scroll of earth drops a
// boulder (rocks when confused) on the hero.
export async function drop_boulder_on_player(confused, helmet_protects, byu,
                                      skip_uswallow) {
    const u = game.u;
    let dmg;

    /* hit monster if swallowed */
    if (u.uswallow && !skip_uswallow) {
        await drop_boulder_on_monster(u.ux, u.uy, confused, byu);
        return;
    }

    const otmp2 = mksobj(confused ? ONAMES.ROCK : ONAMES.BOULDER, false, false);
    if (!otmp2)
        return;
    otmp2.quan = confused ? rn1(5, 2) : 1;
    otmp2.owt = weight(otmp2);
    if (!amorphous(game.youmonst.data) && !Passes_walls()
        && !noncorporeal(game.youmonst.data) && !unsolid(game.youmonst.data)) {
        await You(`are hit by ${doname(otmp2)}!`);
        dmg = Math.trunc(dmgval(otmp2, game.youmonst) * otmp2.quan);
        const uarmh = worn(W_ARMH);
        if (uarmh && helmet_protects) {
            if (hard_helmet(uarmh)) {
                await pline('Fortunately, you are wearing a hard helmet.');
                if (dmg > 2)
                    dmg = 2;
            } else if (game.flags.verbose) {
                await pline(`${Yname2(uarmh)} does not protect you.`);
            }
        }
    } else
        dmg = 0;
    /* Must be before the losehp(), for bones files */
    await wake_nearto(u.ux, u.uy, 4 * 4);
    if (!(await flooreffects(otmp2, u.ux, u.uy, 'fall'))) {
        place_object(otmp2, u.ux, u.uy);
        stackobj(otmp2);
        newsym(u.ux, u.uy);
    }
    if (dmg) {
        if (u.uprops?.HALF_PHDAM)
            dmg = Math.trunc((dmg + 1) / 2);   /* Maybe_Half_Phys */
        await losehp(dmg, 'scroll of earth', KILLED_BY_AN);
    }
}

// src/read.c:2341 drop_boulder_on_monster()
export async function drop_boulder_on_monster(x, y, confused, byu) {
    const otmp2 = mksobj(confused ? ONAMES.ROCK : ONAMES.BOULDER, false, false);
    if (!otmp2)
        return false; /* Shouldn't happen */
    otmp2.quan = confused ? rn1(5, 2) : 1;
    otmp2.owt = weight(otmp2);

    /* Find the monster here (won't be player) */
    const mtmp = m_at(x, y);
    if (mtmp && !amorphous(mtmp.data) && !passes_walls(mtmp.data)
        && !noncorporeal(mtmp.data) && !unsolid(mtmp.data)) {
        const helmet = which_armor(mtmp, W_ARMH);
        let mdmg;

        if (cansee(mtmp.mx, mtmp.my)) {
            await pline(`${Monnam(mtmp)} is hit by ${doname(otmp2)}!`);
            if (mtmp.minvis && !canspotmon(mtmp))
                map_invisible(mtmp.mx, mtmp.my);
        } else if (engulfing_u(mtmp))
            await You_hear(`something hit ${s_suffix(mon_nam(mtmp))} ${
                mbodypart(mtmp, STOMACH)} over your ${body_part(HEAD)}!`);
        mdmg = dmgval(otmp2, mtmp) * otmp2.quan;
        if (helmet) {
            if (hard_helmet(helmet)) {
                if (canspotmon(mtmp))
                    await pline(`Fortunately, ${mon_nam(mtmp)} is wearing a hard helmet.`);
                else if (!Deaf())
                    await You_hear('a clanging sound.');
                if (mdmg > 2)
                    mdmg = 2;
            } else {
                if (canspotmon(mtmp))
                    await pline(`${Monnam(mtmp)}'s ${xname(helmet)} does not protect ${mhim(mtmp)}.`);
            }
        }
        mtmp.mhp -= mdmg;
        if (DEADMONSTER(mtmp)) {
            if (byu) {
                await killed(mtmp);
            } else {
                await pline(`${Monnam(mtmp)} is killed.`);
                await mondied(mtmp);
            }
        } else {
            await wakeup(mtmp, byu);
        }
        await wake_nearto(x, y, 4 * 4);
    } else if (engulfing_u(mtmp)) {
        obfree(otmp2);
        /* fall through to player */
        await drop_boulder_on_player(confused, true, false, true);
        return 1;
    }
    /* Drop the rock/boulder to the floor */
    if (!(await flooreffects(otmp2, x, y, 'fall'))) {
        place_object(otmp2, x, y);
        stackobj(otmp2);
        newsym(x, y); /* map the rock */
    }
    return true;
}

// src/read.c:1919 seffect_earth()
async function seffect_earth(sobj) {
    const u = game.u;
    const sblessed = !!sobj.blessed;
    const scursed = !!sobj.cursed;
    const confused = !!u.uprops?.CONFUSION;

    /* TODO: handle steeds */
    if (!Is_rogue_level(u.uz) && has_ceiling(u.uz)
        && (!In_endgame(u.uz) || Is_earthlevel(u.uz))) {
        let x, y;
        let nboulders = 0;

        /* Identify the scroll */
        if (u.uswallow) {
            await You_hear('rumbling.');
        } else {
            if (!avoid_ceiling(u.uz)) {
                await pline_The(`${ceiling(u.ux, u.uy)} rumbles ${
                    sblessed ? 'around' : 'above'} you!`);
            } else {
                const avalanche = 'avalanche';
                const matbuf = sblessed ? makeplural(avalanche) : an(avalanche);
                await pline(`${upstart(matbuf)} of boulders ${
                    vtense(matbuf, 'materialize')} ${
                    sblessed ? 'around' : 'above'} you!`);
            }
        }
        game.known = true;
        sokoban_guilt();

        /* Loop through the surrounding squares */
        if (!scursed)
            for (x = u.ux - 1; x <= u.ux + 1; x++) {
                for (y = u.uy - 1; y <= u.uy + 1; y++) {
                    /* Is this a suitable spot? */
                    if (isok(x, y) && !closed_door(x, y)
                        && !IS_OBSTRUCTED(game.level.at(x, y).typ)
                        && !IS_AIR(game.level.at(x, y).typ)
                        && (x !== u.ux || y !== u.uy)) {
                        nboulders +=
                            (await drop_boulder_on_monster(x, y, confused, true)) ? 1 : 0;
                    }
                }
            }
        /* Attack the player */
        if (!sblessed) {
            await drop_boulder_on_player(confused, !scursed, true, false);
        } else if (!nboulders)
            await pline('But nothing else happens.');
    }
}

export async function seffects(sobj) {
    const otyp = sobj.otyp;

    /* src/read.c:2199 — "just for trying": any magical scroll exercises
       wisdom before its effect, the same dispatcher prologue weffects has */
    if (game.objects[otyp].oc_magic)
        exercise(A_WIS, true);

    switch (otyp) {
    case ONAMES.SCR_MAGIC_MAPPING:
    case ONAMES.SPE_MAGIC_MAPPING:
        await seffect_magic_mapping(sobj);
        break;
    case ONAMES.SCR_TELEPORTATION:
    case ONAMES.SPE_TELEPORT_AWAY:
        await seffect_teleportation(sobj);
        break;
    case ONAMES.SCR_IDENTIFY:
    case ONAMES.SPE_IDENTIFY:
        return await seffect_identify(sobj);
    case ONAMES.SCR_BLANK_PAPER:
        if (game.u.ublind)
            await You("don't remember there being any magic words on this scroll.");
        else
            await pline('This scroll seems to be blank.');
        game.known = true;
        break;
    case ONAMES.SCR_ENCHANT_WEAPON:
        return await seffect_enchant_weapon(sobj);
    case ONAMES.SCR_TAMING:
    case ONAMES.SPE_CHARM_MONSTER:
        await seffect_taming(sobj);
        break;
    case ONAMES.SCR_LIGHT:
        return await seffect_light(sobj);
    case ONAMES.SCR_ENCHANT_ARMOR:
        await seffect_enchant_armor(sobj);
        break;
    case ONAMES.SCR_DESTROY_ARMOR:
        return await seffect_destroy_armor(sobj);
    case ONAMES.SCR_CONFUSE_MONSTER:
    case ONAMES.SPE_CONFUSE_MONSTER:
        await seffect_confuse_monster(sobj);
        break;
    case ONAMES.SCR_SCARE_MONSTER:
    case ONAMES.SPE_CAUSE_FEAR:
        await seffect_scare_monster(sobj);
        break;
    case ONAMES.SCR_REMOVE_CURSE:
    case ONAMES.SPE_REMOVE_CURSE:
        await seffect_remove_curse(sobj);
        break;
    case ONAMES.SCR_CREATE_MONSTER:
    case ONAMES.SPE_CREATE_MONSTER:
        await seffect_create_monster(sobj);
        break;
    case ONAMES.SCR_STINKING_CLOUD:
        await seffect_stinking_cloud(sobj);
        break;
    case ONAMES.SCR_CHARGING:
        return await seffect_charging(sobj);
    case ONAMES.SCR_AMNESIA:
        await seffect_amnesia(sobj);
        break;
    case ONAMES.SCR_EARTH:
        await seffect_earth(sobj);
        break;
    case ONAMES.SCR_PUNISHMENT:
        await seffect_punishment(sobj);
        break;
    case ONAMES.SCR_GENOCIDE:
        await seffect_genocide(sobj);
        break;
    case ONAMES.SCR_GOLD_DETECTION:
    case ONAMES.SPE_DETECT_TREASURE:
        return await seffect_gold_detection(sobj);
    case ONAMES.SCR_FOOD_DETECTION:
    case ONAMES.SPE_DETECT_FOOD:
        return await seffect_food_detection(sobj);
    case ONAMES.SCR_MAIL:
        await seffect_mail(sobj);
        break;
    default:
        note_unported_read(`seffects:otyp=${otyp}`);
        break;
    }
    return false;
}

// src/read.c:1044 maybe_tame(), apply one taming effect to one monster.
// src/read.c:1454 seffect_scare_monster() — also the spell of cause fear.
async function seffect_scare_monster(sobj) {
    const otyp = sobj.otyp;
    const scursed = !!sobj.cursed;
    const confused = !!game.u.uprops?.CONFUSION;
    let ct = 0;

    for (const mtmp of game.level?.monsters || []) {
        if (DEADMONSTER(mtmp))
            continue;
        if (cansee(mtmp.mx, mtmp.my)) {
            if (confused || scursed) {
                mtmp.mflee = mtmp.mfrozen = mtmp.msleeping = 0;
                mtmp.mcanmove = 1;
            } else if (!await resist(mtmp, sobj.oclass, 0, NOTELL))
                await monflee(mtmp, 0, false, false);
            if (!mtmp.mtame)
                ct++; /* pets don't laugh at you */
        }
    }
    if (otyp === ONAMES.SCR_SCARE_MONSTER || !ct) {
        /* Soundeffect(se_sad_wailing / se_maniacal_laughter, 50) */
        await You_hear(`${(confused || scursed) ? 'sad wailing'
                                                : 'maniacal laughter'} ${
                       !ct ? 'in the distance' : 'close by'}.`);
    }
}

// src/read.c:1608 seffect_create_monster() — also the spell of create
// monster.
async function seffect_create_monster(sobj) {
    const sblessed = !!sobj.blessed;
    const scursed = !!sobj.cursed;
    const confused = !!game.u.uprops?.CONFUSION;

    if (await create_critters(1 + ((confused || scursed) ? 12 : 0)
                              + ((sblessed || rn2(73)) ? 0 : rnd(4)),
                              confused ? game.mons[PMNAMES.PM_ACID_BLOB]
                                       : null,
                              false))
        game.known = true;
}

async function maybe_tame(mtmp, sobj) {
    const was_tame = mtmp.mtame | 0;
    const was_peaceful = !!mtmp.mpeaceful;

    if (sobj.cursed) {
        await setmangry(mtmp, false);
        return was_peaceful && !mtmp.mpeaceful ? -1 : 0;
    }

    const { resist } = await import('./zap.js');
    if (!await resist(mtmp, sobj.oclass, 0, false) || mtmp.isshk) {
        const { tamedog } = await import('./dog.js');
        await tamedog(mtmp, sobj, false);
    }
    return ((!was_peaceful && mtmp.mpeaceful)
            || was_tame !== (mtmp.mtame | 0)) ? 1 : 0;
}

// src/read.c:1679 seffect_taming(), affect every monster in the nearby square
// for a normal reading, or the wider 11 by 11 area when confused.
async function seffect_taming(sobj) {
    let candidates = 0, results = 0, vis_results = 0;

    if (game.u.uswallow) {
        candidates = 1;
        results = vis_results = await maybe_tame(game.u.ustuck, sobj);
    } else {
        const bd = (game.u.intrinsic?.HConfusion
                    || game.u.uprops?.CONFUSION) ? 5 : 1;
        for (let i = -bd; i <= bd; ++i) {
            for (let j = -bd; j <= bd; ++j) {
                const x = game.u.ux + i, y = game.u.uy + j;
                if (!isok(x, y))
                    continue;
                const mtmp = m_at(x, y)
                    || (!i && !j ? game.u.usteed : null);
                if (!mtmp)
                    continue;
                ++candidates;
                const res = await maybe_tame(mtmp, sobj);
                results += res;
                if (canspotmon(mtmp))
                    vis_results += res;
            }
        }
    }

    if (!results) {
        await pline(`Nothing interesting ${
            candidates ? 'seems to happen' : 'happens'}.`);
    } else {
        await pline_The(`neighborhood ${vis_results ? 'is' : 'seems'} ${
            results < 0 ? 'un' : ''}friendlier.`);
        if (vis_results > 0)
            game.known = true;
    }
}

// src/read.c:1400 seffect_confuse_monster().
async function seffect_confuse_monster(sobj) {
    const sblessed = !!sobj.blessed;
    const scursed = !!sobj.cursed;
    const confused = !!(game.u.intrinsic?.HConfusion
                         || game.u.uprops?.CONFUSION);
    const altfeedback = Blind() || Invisible();
    const hands = makeplural(body_part(HAND));

    if (game.youmonst.data.mlet !== MONSYMS.S_HUMAN || scursed) {
        if (!game.u.intrinsic?.HConfusion)
            await You_feel('confused.');
        await make_confused((game.u.intrinsic?.HConfusion || 0) + rnd(100),
                            false);
    } else if (confused) {
        if (!sblessed) {
            await Your(`${hands} begin to ${altfeedback ? 'tingle'
                : `glow ${hcolor(NH_PURPLE)}`}.`);
            await make_confused((game.u.intrinsic?.HConfusion || 0)
                                + rnd(100), false);
        } else {
            await pline(`A ${altfeedback ? 'faint buzz'
                : `${hcolor(NH_RED)} glow`} surrounds your ${body_part(HEAD)}.`);
            await make_confused(0, true);
        }
    } else {
        let incr = sobj.oclass === OCLASSES.SCROLL_CLASS ? 3 : 0;

        if (!sblessed) {
            if (altfeedback)
                await Your(`${hands} tingle${game.u.umconf ? ' even more' : ''}.`);
            else if (!game.u.umconf)
                await Your(`${hands} begin to glow ${hcolor(NH_RED)}.`);
            else
                await pline_The(`${hcolor(NH_RED)} glow of your ${hands} intensifies.`);
            incr += rnd(2);
        } else {
            if (altfeedback)
                await Your(`${hands} tingle ${game.u.umconf
                    ? 'even more' : 'very'} sharply.`);
            else
                await Your(`${hands} glow ${game.u.umconf
                    ? 'an even more' : 'a'} brilliant ${hcolor(NH_RED)}.`);
            incr += rn1(8, 2);
        }
        if ((game.u.umconf || 0) >= 40)
            incr = 1;
        game.u.umconf = (game.u.umconf || 0) + incr;
    }
}

// src/read.c:1722 seffect_genocide()
async function seffect_genocide(sobj) {
    const otyp = sobj.otyp;
    const sblessed = sobj.blessed;
    const scursed = sobj.cursed;
    const already_known = (sobj.oclass === OCLASSES.SPBOOK_CLASS /* spell */
                           || game.objects[otyp].oc_name_known);
    const Confusion = !!(game.u.uprops?.CONFUSION || game.u.intrinsic?.HConfusion);

    if (!already_known)
        await You('have found a scroll of genocide!');
    game.known = true;
    if (sblessed)
        await do_class_genocide();
    else
        await do_genocide(((!scursed) ? 1 : 0) | (2 * (Confusion ? 1 : 0)));
}

/* src/read.c:8 Your_Own_Role(), :9 Your_Own_Race() */
const Your_Own_Role = (mndx) => (mndx === game.urole.mnum);
const Your_Own_Race = (mndx) => (mndx === game.urace.mnum);
/* include/you.h:555 Ugender */
const Ugender = () => ((Upolyd(game.u) ? game.u.mfemale
                                       : game.flags.female) ? 1 : 0);
const strcmpi = (a, b) => a.toLowerCase() === b.toLowerCase() ? 0 : 1;

// src/read.c:2638 do_class_genocide(); blessed scroll of genocide
async function do_class_genocide() {
    const u = game.u;
    const youmonst = game.youmonst;
    const mons = game.mons;
    let i, j, immunecnt, gonecnt, goodcnt, klass, feel_dead = 0;
    let ll_done = 0;
    let buf = '', promptbuf;
    let gameover = false; /* true iff killed self */

    for (j = 0; ; j++) {
        if (j >= 5) {
            await pline(thats_enough_tries);
            return;
        }
        promptbuf = 'What class of monsters do you want to genocide?';
        if (j > 0)
            promptbuf += ` [enter ${
                game.iflags?.cmdassist !== false
                  ? "the symbol or name representing a class, or '?'"
                  : "'?' to see previous genocides"}]`;
        buf = mungspaces(await getlin(promptbuf));
        if (!buf) {
            await pline(`${(j + 1 < 5)
                         ? 'Type letter (or punctuation)'
                           + " or name used for a class of monsters or 'none'"
                         /* the loop will end after this iteration
                            so don't suggest typing anything this time */
                         : 'No class of monsters specified'}.`);
            continue; /* try again */
        }
        if (buf[0] === '\x1b' || !strcmpi(buf, 'none')
            || !strcmpi(buf, "'none'") || !strcmpi(buf, 'nothing')) {
            livelog_printf(LL_GENOCIDE, 'declined to perform class genocide');
            return;
        }
        /* "?" shows previous genocides, if any, and prompts again;
           accept "'?'" too because the prompt's hint shows it that way */
        if (buf === '?' || buf === "'?'") {
            await list_genocided('g', false);
            --j; /* don't count this iteration as one of the tries */
            continue;
        }
        klass = name_to_monclass(buf).monclass;
        if (klass === 0 && (i = name_to_mon(buf, null)) !== NON_PM)
            klass = mons[i].mlet;
        immunecnt = gonecnt = goodcnt = 0;
        for (i = LOW_PM; i < NUMMONS; i++) {
            if (mons[i].mlet === klass) {
                if (!(mons[i].geno & MFLAGS.G_GENO))
                    immunecnt++;
                else if (game.mvitals[i].mvflags & G_GENOD)
                    gonecnt++;
                else
                    goodcnt++;
            }
        }
        if (!goodcnt && klass !== mons[game.urole.mnum].mlet
            && klass !== mons[game.urace.mnum].mlet) {
            if (gonecnt)
                await pline('All such monsters are already nonexistent.');
            else if (immunecnt || klass === MONSYMS.S_invisible)
                await You("aren't permitted to genocide such monsters.");
            else if (game.wizard && buf[0] === '*') {
                gonecnt = 0;
                for (const mtmp of [...(game.level.monsters || [])]) {
                    if (DEADMONSTER(mtmp))
                        continue;
                    mongone(mtmp);
                    gonecnt++;
                }
                await pline(`Eliminated ${gonecnt} monster${plur(gonecnt)}.`);
                return;
            } else
                await pline(`That ${buf.length === 1 ? 'symbol' : 'response'
                            } does not represent any monster.`);
            continue;
        }

        for (i = LOW_PM; i < NUMMONS; i++) {
            if (mons[i].mlet === klass) {
                const nam = makeplural(mons[i].pmnames[NEUTRAL]);

                /* Although "genus" is Latin for race, the hero benefits
                 * from both race and role; thus genocide affects either.
                 */
                if (Your_Own_Role(i) || Your_Own_Race(i)
                    || ((mons[i].geno & MFLAGS.G_GENO)
                        && !(game.mvitals[i].mvflags & G_GENOD))) {
                    /* This check must be first since player monsters might
                     * have G_GENOD or !G_GENO.
                     */
                    if (!ll_done++) {
                        if (!num_genocides())
                            livelog_printf(LL_CONDUCT | LL_GENOCIDE,
                                `performed ${uhis()} first genocide (class ${def_monsyms[klass]})`);
                        else
                            livelog_printf(LL_GENOCIDE,
                                `genocided class ${def_monsyms[klass]}`);
                    }
                    game.mvitals[i].mvflags |= (G_GENOD | MFLAGS.G_NOCORPSE);
                    await kill_genocided_monsters();
                    update_inventory(); /* eggs & tins */
                    await pline(`Wiped out all ${nam}.`);
                    if (Upolyd(u) && vampshifted(youmonst)
                        && (i === u.umonnum || i === youmonst.cham))
                        await polyself(POLY_REVERT); /* vampshifter to vampire */
                    if (Upolyd(u) && i === u.umonnum) {
                        u.mh = -1;
                        if (Unchanging()) {
                            if (!feel_dead++)
                                await urgent_pline('You die.');
                            /* finish genociding this class of
                               monsters before ultimately dying */
                            gameover = true;
                        } else
                            await rehumanize();
                    }
                    /* Self-genocide if it matches either your race
                       or role.  Assumption:  male and female forms
                       share same monster class. */
                    if (i === game.urole.mnum || i === game.urace.mnum) {
                        u.uhp = -1;
                        if (Upolyd(u)) {
                            if (!feel_dead++)
                                await You_feel(`${udeadinside()} inside.`);
                        } else {
                            if (!feel_dead++)
                                await urgent_pline('You die.');
                            gameover = true;
                        }
                    }
                } else if (game.mvitals[i].mvflags & G_GENOD) {
                    if (!gameover)
                        await pline(`${upstart(nam)} are already nonexistent.`);
                } else if (!gameover) {
                    /* suppress feedback about quest beings except
                       for those applicable to our own role */
                    if ((mons[i].msound !== MSOUND.MS_LEADER
                         || quest_info(MSOUND.MS_LEADER) === i)
                        && (mons[i].msound !== MSOUND.MS_NEMESIS
                            || quest_info(MSOUND.MS_NEMESIS) === i)
                        && (mons[i].msound !== MSOUND.MS_GUARDIAN
                            || quest_info(MSOUND.MS_GUARDIAN) === i)
                        /* non-leader/nemesis/guardian role-specific monst */
                        && (i !== PMNAMES.PM_NINJA /* nuisance */
                            || Role_if(PMNAMES.PM_SAMURAI))) {
                        let named, uniq;

                        named = type_is_pname(mons[i]) ? true : false;
                        uniq = (mons[i].geno & G_UNIQ) ? true : false;
                        /* one special case */
                        if (i === PMNAMES.PM_HIGH_CLERIC)
                            uniq = false;

                        await You(`aren't permitted to genocide ${
                            (uniq && !named) ? 'the ' : ''}${
                            (uniq || named) ? mons[i].pmnames[NEUTRAL] : nam}.`);
                    }
                }
            }
        }
        if (gameover || u.uhp === -1) {
            game.killer.format = KILLED_BY_AN;
            game.killer.name = 'scroll of genocide';
            if (gameover)
                await done(GENOCIDED);
        }
        return;
    }
}

const REALLY = 1;
const PLAYER = 2;
const ONTHRONE = 4;

// src/read.c:2826 do_genocide(); how: 0 = no genocide; create monsters
// (cursed scroll), 1 = normal genocide, 3 = forced genocide of player
// monster, 5 (4 | 1) = normal genocide from throne
export async function do_genocide(how) {
    const u = game.u;
    const youmonst = game.youmonst;
    const mons = game.mons;
    let buf = '', realbuf, promptbuf;
    let i, killplayer = 0;
    let mndx;
    let ptr;
    let which;

    if (how & PLAYER) {
        mndx = u.umonster; /* non-polymorphed mon num */
        ptr = mons[mndx];
        buf = pmname(ptr, Ugender());
        killplayer++;
    } else {
        for (i = 0; ; i++) {
            if (i >= 5) {
                /* cursed effect => no free pass (unless rndmonst() fails) */
                if (!(how & REALLY) && (ptr = rndmonst()) != null)
                    break;

                await pline(thats_enough_tries);
                return;
            }
            promptbuf = 'What type of monster do you want to genocide?';
            if (i > 0)
                promptbuf += ` [enter ${
                    game.iflags?.cmdassist !== false
                      ? "the name of a type of monster, or '?'"
                      : "'?' to see previous genocides"}]`;
            buf = mungspaces(await getlin(promptbuf));
            if (!buf) {
                await pline(`${(i + 1 < 5)
                             ? "Type the name of a type of monster or 'none'"
                             /* the loop will end after this iteration
                                so don't suggest typing anything this time */
                             : 'No type of monster specified'}.`);
                continue; /* try again */
            }
            /* choosing "none" preserves genocideless conduct */
            if (buf[0] === '\x1b' || !strcmpi(buf, 'none')
                || !strcmpi(buf, "'none'") || !strcmpi(buf, 'nothing')) {
                /* ... but no free pass if cursed */
                if (!(how & REALLY) && (ptr = rndmonst()) != null)
                    break; /* remaining checks don't apply */

                livelog_printf(LL_GENOCIDE, 'declined to perform genocide');
                return;
            }
            if (buf === '?' || buf === "'?'") {
                await list_genocided('g', false);
                --i; /* don't count this iteration as one of the tries */
                continue;
            }

            mndx = name_to_mon(buf, null);
            if (mndx === NON_PM || (game.mvitals[mndx].mvflags & G_GENOD)) {
                await pline(`Such creatures ${
                    (mndx === NON_PM) ? 'do not' : 'no longer'} exist in this world.`);
                continue;
            }
            ptr = mons[mndx];
            /* Although "genus" is Latin for race, the hero benefits
             * from both race and role; thus genocide affects either.
             */
            if (Upolyd(u) && vampshifted(youmonst)
                && (mndx === u.umonnum || mndx === youmonst.cham))
                await polyself(POLY_REVERT); /* vampshifter (bat, &c) to vampire */
            if (Your_Own_Role(mndx) || Your_Own_Race(mndx)) {
                killplayer++;
                break;
            }
            if (is_human(ptr))
                adjalign(-sgn(u.ualign.type));
            if (is_demon(ptr))
                adjalign(sgn(u.ualign.type));

            if (!(ptr.geno & MFLAGS.G_GENO)) {
                if (!Deaf()) {
                    /* fixme: unconditional "caverns" will be silly in some
                     * circumstances.  Who's speaking?  Divine pronouncements
                     * aren't supposed to be hampered by deafness....
                     */
                    if (game.flags.verbose)
                        await pline('A thunderous voice booms'
                                    + ' through the caverns:');
                    /* SetVoice((struct monst *) 0, 0, 80, voice_deity) */
                    await verbalize('No, mortal!  That will not be done.');
                }
                continue;
            }
            /* KMH -- Unchanging prevents rehumanization */
            if (Unchanging() && ptr === youmonst.data)
                killplayer++;
            break;
        }
        mndx = monsndx(ptr); /* needed for the 'no free pass' cases */
    }

    which = 'all ';
    realbuf = ptr.pmnames[NEUTRAL]; /* standard singular */
    if (Hallucination()) {
        if (Upolyd(u)) {
            buf = pmname(youmonst.data, game.flags.female ? FEMALE : MALE);
        } else {
            buf = (game.flags.female && game.urole.name.f) ? game.urole.name.f
                                                           : game.urole.name.m;
            buf = buf[0].toLowerCase() + buf.slice(1); /* lowc(buf[0]) */
        }
    } else {
        buf = realbuf;
        if ((ptr.geno & G_UNIQ) && ptr !== mons[PMNAMES.PM_HIGH_CLERIC])
            which = !type_is_pname(ptr) ? 'the ' : '';
    }
    if (how & REALLY) {
        if (!num_genocides())
            livelog_printf(LL_CONDUCT | LL_GENOCIDE,
                           `performed ${uhis()} first genocide (${makeplural(realbuf)})`);
        else
            livelog_printf(LL_GENOCIDE, `genocided ${makeplural(realbuf)}`);
        /* setting no-corpse affects wishing and random tin generation */
        game.mvitals[mndx].mvflags |= (G_GENOD | MFLAGS.G_NOCORPSE);
        await pline(`Wiped out ${which}${
            (which[0] !== 'a') ? buf : makeplural(buf)}.`);

        if (killplayer) {
            u.uhp = -1;
            if (how & PLAYER) {
                game.killer.format = KILLED_BY;
                game.killer.name = 'genocidal confusion';
            } else if (how & ONTHRONE) {
                /* player selected while on a throne */
                game.killer.format = KILLED_BY_AN;
                game.killer.name = 'imperious order';
            } else { /* selected player deliberately, not confused */
                game.killer.format = KILLED_BY_AN;
                game.killer.name = 'scroll of genocide';
            }

            /* Polymorphed characters will die as soon as they return to
               normal form (unless Unchanging).
               KMH -- Unchanging prevents rehumanization. */
            if (Upolyd(u) && ptr !== youmonst.data) {
                delayed_killer(POLYMORPH, game.killer.format, game.killer.name);
                await You_feel(`${udeadinside()} inside.`);
            } else {
                await done(GENOCIDED);
            }
        } else if (ptr === youmonst.data) {
            await rehumanize();
        }
        await kill_genocided_monsters();
        update_inventory(); /* in case identified eggs were affected */
    } else {
        let cnt = 0;
        const census = monster_census(false);

        if (!(mons[mndx].geno & G_UNIQ)
            && !(game.mvitals[mndx].mvflags & (G_GENOD | G_EXTINCT)))
            for (i = rn1(3, 4); i > 0; i--) {
                if (!makemon(ptr, u.ux, u.uy, NO_MINVENT | MM_NOMSG))
                    break; /* couldn't make one */
                ++cnt;
                if (game.mvitals[mndx].mvflags & G_EXTINCT)
                    break; /* just made last one */
            }
        if (cnt) {
            /* accumulated 'cnt' doesn't take groups into account;
               assume bringing in new mon(s) didn't remove any old ones */
            cnt = monster_census(false) - census;
            await pline(`Sent in ${(cnt > 1) ? 'some ' : ''}${
                (cnt > 1) ? makeplural(buf) : an(buf)}.`);
        } else
            await pline(nothing_happens);
    }
}

// src/read.c:1976 seffect_punishment() and :3019 punish().
async function seffect_punishment(sobj) {
    game.known = true;
    const confused = !!(game.u.intrinsic?.HConfusion
                         || game.u.uprops?.CONFUSION);
    if (confused || sobj.blessed) {
        await You('feel guilty.');
        return;
    }

    await You('are being punished for your misbehavior!');
    if (game.u.uball) {
        await Your('iron ball gets heavier.');
        game.u.uball.owt = (game.u.uball.owt || 0)
            + 160 * (1 + (sobj.cursed ? 1 : 0));
        return;
    }

    const chain = mkobj(OCLASSES.CHAIN_CLASS, true);
    setworn(chain, W_CHAIN);
    const ball = mkobj(OCLASSES.BALL_CLASS, true);
    setworn(ball, W_BALL);

    game.uchain = game.u.uchain;
    game.uball = game.u.uball;
    (game.u.uprops ||= {}).PUNISHED = true;
    place_object(ball, game.u.ux, game.u.uy);
    place_object(chain, game.u.ux, game.u.uy);
    newsym(game.u.ux, game.u.uy);
}

// src/read.c:3066 unpunish() -- destroy the attached chain while leaving the
// detached heavy iron ball as an ordinary object on the floor.
export function unpunish() {
    const chain = game.u.uchain;

    setworn(null, W_CHAIN);
    delobj(chain);
    setworn(null, W_BALL);

    game.uchain = game.u.uchain;
    game.uball = game.u.uball;
    if (game.u.uprops)
        delete game.u.uprops.PUNISHED;
}

// src/read.c:1490 seffect_remove_curse(). A cursed scroll only reports and
// disintegrates. An uncursed one processes eligible carried objects in list
// order, which also preserves blessorcurse() draw order when confused.
async function seffect_remove_curse(sobj) {
    const otyp = sobj.otyp;
    const sblessed = !!sobj.blessed;
    const scursed = !!sobj.cursed;
    const confused = !!(game.u.intrinsic?.HConfusion
                         || game.u.uprops?.CONFUSION);
    const hallucinating = !!game.u.uprops?.HALLUC
                          && !game.u.uprops?.HALLUC_RES;

    await You(`feel ${!hallucinating
        ? (!confused ? 'like someone is helping you.'
                     : 'like you need some help.')
        : (!confused ? 'in touch with the Universal Oneness.'
                     : 'the power of the Force against you!')}`);

    if (scursed) {
        await pline('The scroll disintegrates.');
    } else {
        for (const obj of [...(game.invent || [])]) {
            if (obj.oclass === OCLASSES.COIN_CLASS)
                continue;
            if (obj === sobj && obj.quan === 1)
                continue;

            let wornmask = (obj.owornmask | 0) & ~(W_BALL | W_ART | W_ARTI);
            if (wornmask && !sblessed) {
                if (obj === game.u.uswapwep && !game.u.twoweap) {
                    wornmask = 0;
                } else if (obj === game.u.uquiver) {
                    if (obj.oclass === OCLASSES.WEAPON_CLASS) {
                        if (!game.objects[obj.otyp].oc_merge)
                            wornmask = 0;
                    } else if (obj.oclass === OCLASSES.GEM_CLASS) {
                        if (game.u.uwep?.otyp !== ONAMES.SLING)
                            wornmask = 0;
                    } else {
                        wornmask = 0;
                    }
                }
            }

            if (sblessed || wornmask || obj.otyp === ONAMES.LOADSTONE
                || (obj.otyp === ONAMES.LEASH && obj.leashmon)) {
                if (confused) {
                    blessorcurse(obj, 2);
                    obj.bknown = 0;
                } else if (obj.cursed) {
                    const knew_curse = !!obj.bknown;
                    uncurse(obj);
                    if (knew_curse && otyp === ONAMES.SCR_REMOVE_CURSE)
                        learnscrolltyp(ONAMES.SCR_REMOVE_CURSE);
                }
            }
        }
        if (game.u.usteed)
            note_unported_read('seffect_remove_curse:saddle');
    }

    if (game.uball && !confused)
        unpunish();
    if (game.u.utraptype === TT_BURIEDBALL)
        note_unported_read('seffect_remove_curse:buried_ball');
    update_inventory();
}

// src/read.c:1324 seffect_destroy_armor()
//
// The confused (erodeproofing) arm, the cursed arms and the blessed
// choose-your-armor arm need Confusion/curse state no ported path sets on
// a read scroll yet; they record. The plain arm runs destroy_arm() with
// its rn2(4)+1 hit rolls, or gives the "Your skin itches." strange
// feeling with no armor.
// src/read.c:1080 can_center_cloud()
function can_center_cloud(x, y) {
    if (!valid_cloud_pos(x, y))
        return false;
    return cansee(x, y) && distu(x, y) < 32;
}

// src/read.c:3081 do_stinking_cloud() — prompt for the center, then grow
// the cloud; the size and damage scale with the scroll's beatitude.
async function do_stinking_cloud(sobj, mention_stinking) {
    const cc = { x: game.u.ux, y: game.u.uy };

    await pline(`Where do you want to center the ${
        mention_stinking ? 'stinking ' : ''}cloud?`);
    /* getpos_sethilite(display_stinking_cloud_positions, can_center_cloud):
       the highlight pass draws nothing */
    const { getpos } = await import('./getpos.js');
    if (await getpos(cc, true, 'the desired position') < 0) {
        await pline('Never mind.');
        return;
    } else if (!can_center_cloud(cc.x, cc.y)) {
        if (game.u.uprops?.HALLUC && !game.u.uprops?.HALLUC_RES)
            await pline('Ugh... someone cut the cheese.');
        else
            await pline(`${sobj.oclass === OCLASSES.SCROLL_CLASS
                ? 'The scroll crumbles with' : 'You smell'
                } a whiff of rotten eggs.`);
        return;
    }
    const { create_gas_cloud } = await import('./region.js');
    create_gas_cloud(cc.x, cc.y, 15 + 10 * bcsign(sobj),
                     8 + 4 * bcsign(sobj));
}

// src/read.c:1991 seffect_stinking_cloud()
async function seffect_stinking_cloud(sobj) {
    const otyp = sobj.otyp;
    const already_known = (sobj.oclass === OCLASSES.SPBOOK_CLASS
                           || game.objects[otyp].oc_name_known);

    if (!already_known)
        await You('have found a scroll of stinking cloud!');
    game.known = true;
    await do_stinking_cloud(sobj, already_known);
}

// src/read.c:1115 seffect_enchant_armor()
async function seffect_enchant_armor(sobj) {
    let s;
    let special_armor;
    let same_color;
    const otmp = some_armor(game.youmonst);
    const sblessed = !!sobj.blessed;
    const scursed = !!sobj.cursed;
    const confused = !!game.u.uprops?.CONFUSION;
    let old_erodeproof, new_erodeproof;

    if (!otmp) {
        await strange_feeling(sobj, !Blind()
                              ? 'Your skin glows then fades.'
                              : 'Your skin feels warm for a moment.');
        exercise(A_CON, !scursed);
        exercise(A_STR, !scursed);
        return;
    }
    if (confused) {
        old_erodeproof = (otmp.oerodeproof != 0);
        new_erodeproof = !scursed;
        otmp.oerodeproof = 0; /* for messages */
        if (Blind()) {
            otmp.rknown = false;
            await pline(`${Yobjnam2(otmp, 'feel')} warm for a moment.`);
        } else {
            otmp.rknown = true;
            await pline(`${Yobjnam2(otmp, 'are')} covered by a ${
                scursed ? 'mottled' : 'shimmering'} ${
                hcolor(scursed ? NH_BLACK : NH_GOLDEN)} ${
                scursed ? 'glow' : (is_shield(otmp) ? 'layer' : 'shield')}!`);
        }
        if (new_erodeproof && (otmp.oeroded || otmp.oeroded2)) {
            otmp.oeroded = otmp.oeroded2 = 0;
            await pline(`${Yobjnam2(otmp, Blind() ? 'feel' : 'look')} as good as new!`);
        }
        if (old_erodeproof && !new_erodeproof) {
            /* restore erodeproof before shop charges */
            otmp.oerodeproof = 1;
            await costly_alteration(otmp, COST_DEGRD);
        }
        otmp.oerodeproof = new_erodeproof ? 1 : 0;
        return;
    }
    /* elven armor vibrates warningly when enchanted beyond a limit */
    special_armor = is_elven_armor(otmp)
        || (game.urole?.mnum === PMNAMES.PM_WIZARD && otmp.otyp === ONAMES.CORNUTHAUM);
    if (scursed)
        same_color = (otmp.otyp === ONAMES.BLACK_DRAGON_SCALE_MAIL
                      || otmp.otyp === ONAMES.BLACK_DRAGON_SCALES);
    else
        same_color = (otmp.otyp === ONAMES.SILVER_DRAGON_SCALE_MAIL
                      || otmp.otyp === ONAMES.SILVER_DRAGON_SCALES
                      || otmp.otyp === ONAMES.SHIELD_OF_REFLECTION);
    if (Blind())
        same_color = false;

    /* KMH -- catch underflow */
    s = scursed ? -otmp.spe : otmp.spe;
    if (s > (special_armor ? 5 : 3) && rn2(s)) {
        otmp.in_use = true;
        await pline(`${Yname2(otmp)} violently ${
            otense(otmp, Blind() ? 'vibrate' : 'glow')}${
            (!Blind() && !same_color) ? ' ' : ''}${
            (Blind() || same_color) ? '' : hcolor(scursed ? NH_BLACK : NH_SILVER)
            } for a while, then ${otense(otmp, 'evaporate')}.`);
        await remove_worn_item(otmp, false);
        useup(otmp);
        return;
    }

    if (s < -100)
        s = -100; /* avoid integer overflow with very negative armor */
    /* set s to how many points the armor will be enchanted by:
       3 for -3 or worse armor;
       2 for -1 to +0 armor;
       1 for +1 to +2 armor;
       0 for +3 to +4 armor, etc.
       When disenchanting, everything is done with reversed signs. */
    s = Math.trunc((4 - s) / 2);
    /* special armor, non-magical armor with low/no enchantment, and
       blessed scrolls are more effective. */
    if (special_armor)
        ++s;
    if (!game.objects[otmp.otyp].oc_magic)
        ++s;
    if (sblessed)
        ++s;
    if (s <= 0) {
        s = 0;
        if (otmp.spe > 0 && !rn2(otmp.spe))
            s = 1;
    } else {
        s = rnd(s);
    }
    if (s > 11)
        s = 11;    /* unlikely but possible: avoids an overflow later */
    if (scursed)
        s = -s;

    if (s >= 0 && Is_dragon_scales(otmp)) {
        const was_lit = otmp.lamplit;
        const old_light = artifact_light(otmp) ? arti_light_radius(otmp) : 0;

        /* dragon scales get turned into dragon scale mail */
        await pline(`${Yname2(otmp)} merges and hardens!`);
        setworn(null, W_ARM);
        /* assumes same order */
        otmp.otyp += ONAMES.GRAY_DRAGON_SCALE_MAIL - ONAMES.GRAY_DRAGON_SCALES;
        otmp.lamplit = 0; /* don't want bless() or uncurse() to adjust
                           * light source's radius; this is a real hack */
        if (sblessed) {
            otmp.spe++;
            cap_spe(otmp);
            if (!otmp.blessed)
                bless(otmp);
        } else if (otmp.cursed)
            uncurse(otmp);
        otmp.known = 1;
        setworn(otmp, W_ARM);
        if (otmp.unpaid)
            alter_cost(otmp, 0); /* shop bill */
        otmp.lamplit = was_lit;
        if (old_light)
            await maybe_adjust_light(otmp, old_light);
        return;
    }

    await pline(`${Yname2(otmp)} ${(s === 0) ? 'violently ' : ''}${
        otense(otmp, Blind() ? 'vibrate' : 'glow')}${
        (!Blind() && !same_color) ? ' ' : ''}${
        (Blind() || same_color) ? '' : hcolor(scursed ? NH_BLACK : NH_SILVER)
        } for a ${(s * s > 1) ? 'while' : 'moment'}.`);
    /* [this cost handling will need updating if shop pricing is
       ever changed to care about curse/bless status of armor] */
    if (s < 0)
        await costly_alteration(otmp, COST_DECHNT);
    if (scursed && !otmp.cursed)
        curse(otmp);
    else if (sblessed && !otmp.blessed)
        bless(otmp);
    else if (!scursed && otmp.cursed)
        uncurse(otmp);
    if (s) {
        const oldspe = otmp.spe;

        /* not necessary to use adj_abon() or cap_spe() when adjusting
           here because it has been capped at 99 and s is quite small;
           however, might need to change s if it takes spe past 99 */
        otmp.spe += s;
        cap_spe(otmp); /* make sure that it doesn't exceed SPE_LIM */
        s = otmp.spe - oldspe; /* cap_spe() might have throttled 's' */
        if (s) /* skip if it got changed to 0 */
            adj_abon(otmp, s); /* adjust armor bonus for Dex or Int+Wis */
        game.known = !!otmp.known;
        if (s > 0 && otmp.unpaid)
            alter_cost(otmp, 0);
    }

    if ((otmp.spe > (special_armor ? 5 : 3))
        && (special_armor || !rn2(7)))
        await pline(`${Yobjnam2(otmp, 'suddenly vibrate')} ${
            Blind() ? 'again' : 'unexpectedly'}.`);
}

// src/read.c:1294 disintegrate_cursed_armor(), a blessed scroll picks one
// cursed piece of worn armor to destroy.
async function disintegrate_cursed_armor() {
    const armors = [];
    const u = game.u;

    if (u.uarm && u.uarm.cursed)
        armors.push(u.uarm);
    if (u.uarmc && u.uarmc.cursed)
        armors.push(u.uarmc);
    if (u.uarmh && u.uarmh.cursed)
        armors.push(u.uarmh);
    if (u.uarms && u.uarms.cursed)
        armors.push(u.uarms);
    if (u.uarmg && u.uarmg.cursed)
        armors.push(u.uarmg);
    if (u.uarmf && u.uarmf.cursed)
        armors.push(u.uarmf);
    if (u.uarmu && u.uarmu.cursed)
        armors.push(u.uarmu);
    if (!armors.length)
        return false;
    if (await disintegrate_arm(armors[rn2(armors.length)]))
        return true;
    return false;
}

// src/read.c:1324 seffect_destroy_armor(); returns true when the scroll
// was already used up by strange_feeling().
async function seffect_destroy_armor(sobj) {
    let otmp = some_armor(game.youmonst);
    const scursed = !!sobj.cursed;
    const confused = !!(game.u.intrinsic?.HConfusion
                        || game.u.uprops?.CONFUSION);
    let old_erodeproof, new_erodeproof;

    if (confused) {
        if (!otmp) {
            await strange_feeling(sobj, 'Your bones itch.');
            exercise(A_STR, false);
            exercise(A_CON, false);
            return true;        /* useup() done by strange_feeling() */
        }
        old_erodeproof = (otmp.oerodeproof != 0);
        new_erodeproof = scursed;
        otmp.oerodeproof = 0; /* for messages */
        await p_glow2(otmp, NH_PURPLE);
        if (old_erodeproof && !new_erodeproof) {
            /* restore old_erodeproof before shop charges */
            otmp.oerodeproof = 1;
            await costly_alteration(otmp, COST_DEGRD);
        }
        otmp.oerodeproof = new_erodeproof ? 1 : 0;
        return false;
    }
    if (scursed) {
        if (otmp && otmp.cursed) {
            await pline(`${Yobjnam2(otmp, 'vibrate')}.`);
            if (otmp.spe >= -6) {
                otmp.spe += -1;
                adj_abon(otmp, -1);
            }
            await make_stunned(((game.u.intrinsic?.HStun || 0) & TIMEOUT)
                               + rn1(10, 10), true);
        } else if (await disintegrate_arm(otmp)) {
            game.known = true;
            return false;
        }
    } else {
        const gets_choice = (otmp && sobj && sobj.blessed
                             && count_worn_armor() > 1);

        if (gets_choice) {
            let atmp;

            if (!game.objects[sobj.otyp].oc_name_known)
                await pline(`This is ${an(actualoname(sobj))}!`);
            game.known = true;
            atmp = await getobj('destroy', any_worn_armor_ok, GETOBJ_PROMPT);
            if (any_worn_armor_ok(atmp) === GETOBJ_SUGGEST)
                otmp = atmp;
            if (await disintegrate_arm(otmp)) {
                game.known = true;
                return false;
            }
        } else if (sobj.blessed && await disintegrate_cursed_armor()) {
            game.known = true;
            return false;
        } else if (!(await destroy_arm())) {
            await strange_feeling(sobj, 'Your skin itches.');
            exercise(A_STR, false);
            exercise(A_CON, false);
            return true;        /* useup() done by strange_feeling() */
        } else
            game.known = true;
    }
    return false;
}

/* src/do_wear.c count_worn_armor() */
function count_worn_armor() {
    return (game.invent || [])
        .filter(o => ((o.owornmask ?? 0) & W_ARMOR) !== 0).length;
}

// src/read.c:58 learnscrolltyp() — learning a scroll type is worth 10 score.
function learnscrolltyp(scrolltyp) {
    if (!game.objects[scrolltyp].oc_name_known) {
        makeknown(scrolltyp);
        more_experienced(0, 10);
        return true;
    }
    return false;
}

// src/read.c seffect_light() — the scroll of light.
//
// The confused arm makes yellow/black lights, which needs makemon with
// MM_EDOG plus initedog; recorded. The ordinary arm is live.
async function seffect_light(sobj) {
    const scursed = sobj.cursed;
    const confused = !!(game.u?.intrinsic?.HConfusion
                        || game.u?.uprops?.CONFUSION);

    if (!confused) {
        if (!game.u.ublind)
            game.known = true;
        await litroom(!scursed, sobj);
        if (!scursed) {
            /* lightdamage(sobj, TRUE, 5): the gremlin arm is the only one
               with draws or effect, and the hero is never a gremlin here */
            if (5)
                game.known = true;
        }
    } else {
        note_unported_read('seffect_light:confused_lights');
    }
    return false;
}

// src/read.c set_lit() — do_clear_area()'s callback.
//
// The gremlin collection list is recorded: it only matters when a gremlin is
// standing in the lit area, and light_hits_gremlin's rnd(5) would be a draw.
function set_lit(x, y, val) {
    const loc = game.level?.at(x, y);
    if (!loc) return;
    if (val) {
        loc.lit = 1;
        const mtmp = (game.level?.monsters || [])
            .find(m => m.mx === x && m.my === y && m.mhp > 0);
        if (mtmp && mtmp.data?.mname === 'gremlin')
            note_unported_read('set_lit:gremlin');
    } else {
        loc.lit = 0;
        note_unported_read('set_lit:snuff_light_source');
    }
}

// src/read.c:2491 litroom() — light (on) or darken (!on) the hero's area.
//
// Radius is 5, or 9 for a blessed scroll. The darkening arm needs
// snuff_lit/artifact_light over the inventory and is recorded; the lighting
// arm is what a scroll of light reaches.
export async function litroom(on, obj) {
    const blessed_effect = !!(obj && obj.oclass === OCLASSES.SCROLL_CLASS
                              && obj.blessed);
    const no_op = !!game.u.uswallow;    /* Underwater/waterlevel not modelled */

    /* update object lights and produce message (provided you're not blind) */
    if (!on) {
        note_unported_read('litroom:darken');
        return;
    }
    if (blessed_effect)
        /* impact_arti_light over lamplit artifacts; none exist yet */
        note_unported_read('litroom:blessed_arti_light');

    if (game.u.uswallow) {
        note_unported_read('litroom:swallowed');
    } else if (!game.u.ublind
               && (!Is_rogue_level(game.u.uz)
                   || game.level?.at(game.u.ux, game.u.uy)?.typ !== CORR)) {
        await pline(`A lit field ${no_op ? 'briefly ' : ''}surrounds you!`);
    }

    /* No-op when swallowed or in water */
    if (no_op)
        return;

    do_clear_area(game.u.ux, game.u.uy, blessed_effect ? 9 : 5,
                  set_lit, on ? 1 : 0);

    /*
     *  If we are not blind, then force a redraw on all positions in sight
     *  by temporarily blinding the hero. The vision recalculation will
     *  correctly update all previously seen positions *and* correctly set
     *  the waslit bit.
     */
    if (!game.u.ublind)
        vision_recalc(2);

    game.vision_full_recalc = 1;        /* delayed vision recalculation */
}

// src/read.c:1627 seffect_enchant_weapon() — the scroll of enchant weapon.
//
// The confused arm rustproofs the weapon instead of enchanting it, and returns
// before chwepon(); erosion_matters() plus the ARMOR_CLASS exclusion is what
// keeps it to actual weapons. `s` guards its own uwep tests against a null
// pointer, which is why the !uwep case yields 1 rather than reading uwep->spe.
async function seffect_enchant_weapon(sobj) {
    const scursed = sobj.cursed;
    const confused = !!(game.u?.intrinsic?.HConfusion
                        || game.u?.uprops?.CONFUSION);
    const sblessed = sobj.blessed;
    const uwep = game.u.uwep;
    let s;

    /* [What about twoweapon mode?  Proofing/repairing/enchanting both
       would be too powerful, but shouldn't we choose randomly between
       primary and secondary instead of always acting on primary?] */
    if (confused && uwep && erosion_matters(uwep, game.objects)
        && uwep.oclass !== OCLASSES.ARMOR_CLASS) {
        note_unported_read('seffect_enchant_weapon:erodeproof');
        return false;
    }
    s = scursed ? -1
        : !uwep ? 1                     /* guard the tests below against null */
        : (uwep.spe >= 9) ? (rn2(uwep.spe) === 0)  /* usually 0, maybe 1 */
        : sblessed ? rnd(3 - Math.trunc(uwep.spe / 3)) /* >=9 prevents rnd(0) */
        : 1;                            /* uncursed */
    /* nothing enchanted: strange_feeling -> useup */
    const used_up = !(await chwepon(sobj, s));
    if (uwep)
        cap_spe(uwep);
    return used_up;
}

// src/read.c cap_spe() — clamp enchantment to the +/-SPE_LIM band.
function cap_spe(obj) {
    if (obj) {
        if (Math.abs(obj.spe) > SPE_LIM)
            obj.spe = sgn(obj.spe) * SPE_LIM;
    }
}

// src/read.c:2055 seffect_identify() — the scroll arm.
//
// The scroll is used up BEFORE the messages, and the cval roll only happens
// on the blessed or lucky path: `sblessed || (!scursed && !rn2(5))`, so an
// ordinary uncursed scroll spends one rn2(5) and usually identifies one item.
// identify_pack's menu needs the inventory-selection path and is recorded.
// Returns true because the scroll has already been used up.
async function seffect_identify(sobj) {
    const otyp = sobj.otyp;
    const sblessed = !!sobj.blessed;
    const scursed = !!sobj.cursed;
    const confused = !!game.u.uprops?.CONFUSION?.intrinsic
                     || !!game.u.intrinsic?.HConfusion;
    const already_known = !!game.objects[otyp].oc_name_known;

    useup(sobj);

    if (confused || (scursed && !already_known))
        await You('identify this as an identify scroll.');
    else if (!already_known)
        await pline('This is an identify scroll.');
    if (!already_known)
        learnscrolltyp(ONAMES.SCR_IDENTIFY);
    if (confused || (scursed && !already_known))
        return true;

    if ((game.invent || []).length) {
        let cval = 1;
        if (sblessed || (!scursed && !rn2(5))) {
            cval = rn2(5);
            /* note: if cval==0, identify all items */
            if (cval === 1 && sblessed && (game.u.uluck | 0) > 0)
                ++cval;
        }
        await identify_pack(cval, !already_known);
    }
    return true;
}

// src/read.c:2015 seffect_teleportation()
async function seffect_teleportation(sobj) {
    const scursed = !!sobj.cursed;
    const confused = !!game.u.uprops?.CONFUSION?.intrinsic
                     || !!game.u.intrinsic?.HConfusion;

    if (confused || scursed) {
        const { level_tele } = await import('./teleport.js');
        await level_tele();
        /* gives "materialize on different/same level!" message, must
           be a teleport scroll */
        game.known = true;
    } else {
        /* src/read.c:2090 — scrolltele(): controlled getpos teleport when
           Teleport_control/blessed, else a random destination */
        const { scrolltele } = await import('./teleport.js');
        await scrolltele(sobj);
        game.known = true;
    }
}

// src/read.c:2100 seffect_magic_mapping()
async function seffect_magic_mapping(sobj) {
    const sblessed = !!sobj.blessed, scursed = !!sobj.cursed;
    const confused = !!game.u.uprops?.CONFUSION?.intrinsic;

    if (game.level?.flags?.nommap) {
        note_unported_read('seffect_magic_mapping:nommap');
        return;
    }
    if (sblessed)
        note_unported_read('seffect_magic_mapping:blessed_reveal');
    game.known = true;

    await pline('A map coalesces in your mind!');
    const cval = (scursed && !confused);
    if (cval)
        note_unported_read('seffect_magic_mapping:cursed_confusion');
    /* notice_mon_off/_on wrap the mapping so newly drawn monsters are not
       announced */
    await do_mapping();
}


const CP_MALE = 0, CP_FEMALE = 1, CP_NEUTRAL = 2;

function title_to_mon(str) {
    const lower = str.toLowerCase();
    for (const role of roles) {
        for (const rank of role.rank || []) {
            for (const title of [rank.m, rank.f]) {
                if (title && lower.startsWith(title.toLowerCase()))
                    return role.mnum;
            }
        }
    }
    return NON_PM;
}

export function name_to_monclass(str) {
    if (!str)
        return { monclass: 0, which: NON_PM };

    if (str.length === 1) {
        let monclass = def_monsyms.indexOf(str);
        let which = NON_PM;
        if (monclass === MONSYMS.S_MIMIC_DEF)
            monclass = MONSYMS.S_MIMIC;
        else if (monclass === MONSYMS.S_WORM_TAIL) {
            monclass = MONSYMS.S_WORM;
            which = PMNAMES.PM_LONG_WORM;
        } else if (monclass < 0) {
            monclass = str === 'I' ? MONSYMS.S_invisible : 0;
        }
        return { monclass, which };
    }

    if (/^long$/i.test(str))
        return { monclass: 0, which: NON_PM };
    const singular = makesingular(str);
    if (/^(an|the|or|other|or other)$/i.test(singular))
        return { monclass: 0, which: NON_PM };

    const trueClasses = new Map([
        ['demon', MONSYMS.S_DEMON],
        ['devil', MONSYMS.S_DEMON],
        ['bug', MONSYMS.S_XAN],
        ['fish', MONSYMS.S_EEL],
    ]);
    const lower = singular.toLowerCase();
    if (lower === 'long worm') {
        return {
            monclass: game.mons[PMNAMES.PM_LONG_WORM].mlet,
            which: PMNAMES.PM_LONG_WORM,
        };
    }
    if (trueClasses.has(lower))
        return { monclass: trueClasses.get(lower), which: NON_PM };

    for (let i = 1; i < LIMITS.MAXMCLASSES; ++i) {
        const explanation = monexplain[i]?.toLowerCase() || '';
        const at = explanation.indexOf(lower);
        if (at >= 0 && (at === 0 || explanation[at - 1] === ' ')
            && (at + lower.length === explanation.length
                || explanation[at + lower.length] === ' ')) {
            return { monclass: i, which: NON_PM };
        }
    }

    const which = name_to_monplus(singular, {});
    return which >= 0
        ? { monclass: game.mons[which].mlet, which }
        : { monclass: 0, which: NON_PM };
}

async function parse_create_particular(str) {
    let bufp = str.trim().replace(/\s+/g, ' ');
    const commandCount = (game.multi || 0) > 0 ? game.multi : 0;
    let quan = 1 + commandCount;
    if (commandCount)
        game.multi = 0;
    const count = bufp.match(/^\d+/);
    if (count) {
        quan = Number.parseInt(count[0], 10);
        bufp = bufp.slice(count[0].length).trimStart();
    }
    const quanLimit = ROWNO * (COLNO - 1);
    if (quan < 1 || quan > quanLimit) {
        const { monster_census } = await import('./minion.js');
        quan = quanLimit - monster_census(false);
    }

    const takeModifier = (word) => {
        const re = new RegExp(`${word} `, 'i');
        const found = re.test(bufp);
        if (found)
            bufp = bufp.replace(re, ' ');
        return found;
    };
    const saddled = takeModifier('saddled');
    const sleeping = takeModifier('sleeping');
    const invisible = takeModifier('invisible');
    const hidden = takeModifier('hidden');
    let fem = -1;
    if (takeModifier('female'))
        fem = CP_FEMALE;
    if (takeModifier('male'))
        fem = CP_MALE;
    bufp = bufp.trim().replace(/\s+/g, ' ');

    let maketame = false, makepeaceful = false, makehostile = false;
    if (/^tame /i.test(bufp)) {
        maketame = true;
        bufp = bufp.slice(5);
    } else if (/^peaceful /i.test(bufp)) {
        makepeaceful = true;
        bufp = bufp.slice(9);
    } else if (/^hostile /i.test(bufp)) {
        makehostile = true;
        bufp = bufp.slice(8);
    }

    const base = {
        quan, monclass: LIMITS.MAXMCLASSES,
        which: game.urole.mnum, fem, genderconf: -1,
        randmonst: false, maketame, makepeaceful, makehostile,
        sleeping, saddled, invisible, hidden,
    };
    if (game.wizard && (bufp === '*' || /^random$/i.test(bufp)))
        return { valid: true, text: bufp, data: { ...base, randmonst: true } };

    const genderName = { v: CP_NEUTRAL };
    let which = name_to_monplus(bufp, {}, genderName);
    if (which < 0)
        which = title_to_mon(bufp);
    if (fem === CP_MALE || fem === CP_FEMALE) {
        if (genderName.v !== CP_NEUTRAL && fem !== genderName.v)
            base.genderconf = genderName.v;
    } else {
        base.fem = genderName.v;
    }
    if (which >= 0)
        return { valid: true, text: bufp, data: { ...base, which } };

    const byClass = name_to_monclass(bufp);
    if (byClass.which >= 0) {
        return {
            valid: true, text: bufp,
            data: { ...base, which: byClass.which },
        };
    }
    if (byClass.monclass === MONSYMS.S_invisible) {
        return {
            valid: true, text: bufp,
            data: { ...base, which: PMNAMES.PM_STALKER },
        };
    }
    if (byClass.monclass === MONSYMS.S_WORM_TAIL) {
        return {
            valid: true, text: bufp,
            data: { ...base, which: PMNAMES.PM_LONG_WORM },
        };
    }
    if (byClass.monclass > 0) {
        return {
            valid: true, text: bufp,
            data: { ...base, monclass: byClass.monclass },
        };
    }
    return { valid: false, text: bufp, data: null };
}

async function announce_created_monster(mtmp, mmflags) {
    const appearance = M_AP_TYPE(mtmp);
    let exclaim = !(mmflags & MM_NOEXCLAM);
    let what = null;

    if ((canseemon(mtmp) && (!appearance || appearance === M_AP_MONSTER))
        || sensemon(mtmp)) {
        what = Amonnam(mtmp);
        if (appearance === M_AP_MONSTER)
            exclaim = true;
    } else if (canseemon(mtmp)) {
        if (appearance === M_AP_OBJECT) {
            const fake = mksobj(mtmp.mappearance, false, false);
            if (fake.oclass === OCLASSES.COIN_CLASS)
                fake.quan = 2;
            const simple = simpleonames(fake);
            what = upstart(fake.quan === 1 ? an(simple) : simple);
        } else if (appearance === M_AP_FURNITURE) {
            what = upstart(an(defsyms[mtmp.mappearance]?.explain
                              || 'something'));
        } else {
            what = 'Something';
        }
    }
    if (!what)
        return;

    const near = Math.abs(mtmp.mx - game.u.ux) <= 1
              && Math.abs(mtmp.my - game.u.uy) <= 1;
    const where = near ? ' next to you'
                : distu(mtmp.mx, mtmp.my) <= BOLT_LIM * BOLT_LIM
                    ? ' close by' : '';
    set_msg_xy(mtmp.mx, mtmp.my);
    await Norep(`${what}${exclaim ? ' suddenly' : ''} ${
        vtense(what, 'appear')}${where}${exclaim ? '!' : '.'}`);
}

async function create_particular_creation(d) {
    let whichpm = null, firstchoice = NON_PM;
    let madeany = false;

    if (!d.randmonst) {
        firstchoice = d.which;
        if (d.which === PMNAMES.PM_GUARD
            || d.which === PMNAMES.PM_SHOPKEEPER
            || d.which === PMNAMES.PM_HIGH_CLERIC
            || d.which === PMNAMES.PM_ALIGNED_CLERIC
            || d.which === PMNAMES.PM_ANGEL) {
            d.which = PMNAMES.PM_HUMAN_ZOMBIE;
        } else if (d.which === PMNAMES.PM_LONG_WORM_TAIL) {
            d.which = PMNAMES.PM_LONG_WORM;
        } else if ((game.mons[d.which].geno & G_UNIQ) !== 0) {
            d.which = PMNAMES.PM_DOPPELGANGER;
        }

        if (d.which !== firstchoice
            && firstchoice !== PMNAMES.PM_LONG_WORM_TAIL) {
            const { tty_yn_function } = await import('./tty/topl.js');
            const answer = await tty_yn_function(
                `Creating ${mons_name(game.mons[d.which])} instead; force ${
                    mons_name(game.mons[firstchoice])}?`,
                'yn', 'n');
            if (answer === 'y')
                d.which = firstchoice;
        }
        whichpm = game.mons[d.which];
    }

    for (let i = 0; i < d.quan; ++i) {
        let mmflags = 0;
        if (d.monclass !== LIMITS.MAXMCLASSES)
            whichpm = mkclass(d.monclass, 0);
        else if (d.randmonst)
            whichpm = rndmonst();

        if (d.genderconf === -1) {
            if (d.fem !== -1
                && (!whichpm || (!is_male(whichpm) && !is_female(whichpm)))) {
                if (d.fem === CP_FEMALE)
                    mmflags |= MM_FEMALE;
                else if (d.fem === CP_MALE)
                    mmflags |= MM_MALE;
            }
            mmflags |= MM_NOEXCLAM;
        } else if (d.fem === CP_FEMALE) {
            mmflags |= MM_FEMALE;
        } else if (d.fem === CP_MALE) {
            mmflags |= MM_MALE;
        }
        if (d.invisible)
            mmflags |= MM_MINVIS;

        const mtmp = makemon(whichpm, game.u.ux, game.u.uy, mmflags);
        if (!mtmp) {
            if (d.monclass === LIMITS.MAXMCLASSES && !d.randmonst)
                break;
            continue;
        }
        const mx = mtmp.mx, my = mtmp.my;
        await announce_created_monster(mtmp, mmflags);

        if (d.maketame) {
            const { tamedog } = await import('./dog.js');
            await tamedog(mtmp, null, false);
        } else if (d.makepeaceful || d.makehostile) {
            mtmp.mtame = 0;
            mtmp.mpeaceful = d.makepeaceful ? 1 : 0;
            set_malign(mtmp);
        }
        if (d.saddled) {
            const { can_saddle, put_saddle_on_mon } = await import('./steed.js');
            if (can_saddle(mtmp) && !which_armor(mtmp, W_SADDLE))
                put_saddle_on_mon(null, mtmp);
        }
        if (d.hidden
            && ((is_hider(mtmp.data) && mtmp.data.mlet !== MONSYMS.S_MIMIC)
                || (hides_under(mtmp.data) && OBJ_AT(mx, my))
                || (mtmp.data.mlet === MONSYMS.S_EEL && is_pool(mx, my)))) {
            mtmp.mundetected = 1;
            newsym(mx, my);
        }
        if (d.sleeping)
            mtmp.msleeping = 1;

        madeany = true;
        if (mtmp.cham !== NON_PM && firstchoice !== NON_PM
            && mtmp.cham !== firstchoice) {
            const { newcham } = await import('./mon.js');
            newcham(mtmp, game.mons[firstchoice], 0);
        }
    }
    return madeany;
}

// src/read.c:3372 create_particular(), the wizard-mode monster maker.
export async function create_particular() {
    const CP_TRYLIM = 5;
    let tryct = CP_TRYLIM, altmsg = 0;
    let prompt = 'Create what kind of monster?';

    do {
        const buf = await getlin(prompt);
        if (buf === null || buf === '\x1b')
            return false;
        /* C's getlin prompt separates this command from the preceding Norep
           message. Our prompt renderer does not feed _prevmsg, so clear it
           before the first creation announcement. */
        game._prevmsg = null;
        const parsed = await parse_create_particular(buf);
        if (parsed.valid)
            return create_particular_creation(parsed.data);

        if (parsed.text || altmsg || tryct < 2) {
            await pline("I've never heard of such monsters.");
        } else {
            await pline('Try again (type * for random, ESC to cancel).');
            ++altmsg;
        }
        if (tryct === CP_TRYLIM)
            prompt += ' [type name or symbol]';
    } while (--tryct > 0);

    return false;
}

// src/wizcmds.c:203 wiz_genesis() — the ^G command.
export async function wiz_genesis() {
    if (game.wizard) {
        const mongen_saved = game.iflags?.debug_mongen;
        if (game.iflags) game.iflags.debug_mongen = false;
        await create_particular();
        if (game.iflags) game.iflags.debug_mongen = mongen_saved;
    } else {
        note_unported_read('wiz_genesis:unavailcmd');
    }
    return ECMD_OK;
}

// src/read.c:3019 punish(), a ball and chain (or a heavier ball).
export async function punish(sobj) {
    const reuse_ball = (sobj && sobj.otyp === ONAMES.HEAVY_IRON_BALL)
                        ? sobj : null;
    const cursed_levy = (sobj && sobj.cursed) ? 1 : 0;

    /* KMH -- Punishment is still okay when you are riding */
    if (!reuse_ball)
        await You('are being punished for your misbehavior!');
    if (game.u.uball) { /* Punished */
        await Your('iron ball gets heavier.');
        game.u.uball.owt += WT_IRON_BALL_INCR * (1 + cursed_levy);
        return;
    }

    if (amorphous(game.youmonst.data) || is_whirly(game.youmonst.data)
        || unsolid(game.youmonst.data)) {
        if (!reuse_ball) {
            await pline('A ball and chain appears, then falls away.');
            await dropy(mkobj(OCLASSES.BALL_CLASS, true));
        } else {
            await dropy(reuse_ball);
        }
        return;
    }

    setworn(mkobj(OCLASSES.CHAIN_CLASS, true), W_CHAIN);
    if (!reuse_ball)
        setworn(mkobj(OCLASSES.BALL_CLASS, true), W_BALL);
    else
        setworn(reuse_ball, W_BALL);

    if (!game.u.uswallow) {
        await placebc();
        if (Blind())
            set_bc(1);      /* set up ball and chain variables */
        newsym(game.u.ux, game.u.uy); /* see ball&chain if can't see self */
    }
}

// src/read.c:2035 seffect_gold_detection(); returns true when the scroll
// was already used up by strange_feeling().
async function seffect_gold_detection(sobj) {
    const scursed = !!sobj.cursed;
    const confused = !!(game.u.intrinsic?.HConfusion || game.u.uprops?.CONFUSION);

    if ((confused || scursed) ? await trap_detect(sobj) : await gold_detect(sobj))
        return true; /* failure: strange_feeling() -> useup() */
    return false;
}

// src/read.c:2046 seffect_food_detection(); returns true when the scroll
// was already used up by strange_feeling().
async function seffect_food_detection(sobj) {
    if (await food_detect(sobj))
        return true; /* nothing detected: strange_feeling -> useup */
    return false;
}

// src/read.c:2056 seffect_mail(), the scroll of mail.
async function seffect_mail(sobj) {
    const odd = (sobj.o_id % 2) === 1;

    game.known = true;
    switch (sobj.spe) {
    case 2:
        await pline(`This scroll is marked "${odd ? 'Postage Due' : 'Return to Sender'}".`);
        break;
    case 1:
        /* note to the puzzled: the game Larn actually sends you junk
           mail if you win! */
        await pline(`This seems to be ${
                    odd ? 'a chain letter threatening your luck'
                        : 'junk mail addressed to the finder of the Eye of Larn'}.`);
        break;
    default:
        await readmail(sobj);
        break;
    }
}

// src/read.c:3112 cant_revive(); mtype.v is the monster index (modified for
// some inputs); the types which can't be revived, resurrected or created
export function cant_revive(mtype, revival, from_obj) {
    /* SHOPKEEPERS can be revived now */
    if (mtype.v === PMNAMES.PM_GUARD || (mtype.v === PMNAMES.PM_SHOPKEEPER && !revival)
        || mtype.v === PMNAMES.PM_HIGH_CLERIC || mtype.v === PMNAMES.PM_ALIGNED_CLERIC
        || mtype.v === PMNAMES.PM_ANGEL) {
        mtype.v = PMNAMES.PM_HUMAN_ZOMBIE;
        return true;
    } else if (mtype.v === PMNAMES.PM_LONG_WORM_TAIL) { /* for create_particular() */
        mtype.v = PMNAMES.PM_LONG_WORM;
        return true;
    } else if (unique_corpstat(game.mons[mtype.v])
               && (!from_obj || !has_omonst(from_obj))) {
        /* unique corpses (from bones or wizard mode wish) or
           statues (bones or any wish) end up as shapechangers */
        mtype.v = PMNAMES.PM_DOPPELGANGER;
        return true;
    }
    return false;
}
