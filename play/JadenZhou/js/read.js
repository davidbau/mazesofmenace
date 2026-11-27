// read.js — scroll/spellbook reading; wizard mode monster creation.
// C ref: read.c
//
// Ported: learnscrolltyp(), learnscroll(), cap_spe(), erode_obj_text(),
// tshirt_text(), hawaiian_motif(), hawaiian_design(), apron_text(), the
// candy wrapper helpers, read_ok(), doread() (every kind of readable
// object), stripspe(), p_glow1/2/3(), charge_ok(), recharge(), forget(),
// maybe_tame(), valid_cloud_pos(), can_center_cloud(),
// display_stinking_cloud_positions(), seffects() and every seffect_*()
// (paths that reach unported code throw 'not ported yet'),
// drop_boulder_on_player(), drop_boulder_on_monster(), set_lit(),
// litroom(), punish(), unpunish(), do_stinking_cloud(), create_particular()
// with create_particular_parse() and create_particular_creation() (used by
// #wizgenesis, ^G), and cant_revive(); plus makemon.c create_critters()
// and wield.c chwepon().  do_class_genocide()/do_genocide() and
// wand_explode() are not ported yet.

import { sokoban_guilt } from './trap.js';
import { shk_your } from './shk.js';
import { DEADMONSTER } from './mon.js';
import { is_art } from './artifact.js';
import { rn2, rnd, rn1, d } from './rng.js';
import { livelog_printf, You_hear } from './display.js';
import { LL_CONDUCT, Luck } from './const.js';
import { CANDY_BAR, Is_dragon_scales, is_shield, greatest_erosion,
         is_weptool } from './objects.js';
import { game } from './gstate.js';
import {
    NEUTRAL, MALE, FEMALE, MM_FEMALE, MM_MALE, MM_MINVIS, MM_NOEXCLAM,
    NO_MM_FLAGS, NON_PM, ROWNO, COLNO, ismnum,
} from './const.js';
import { mons, G_UNIQ, PM_GUARD, PM_SHOPKEEPER, PM_HIGH_CLERIC,
         PM_ALIGNED_CLERIC, PM_ANGEL, PM_LONG_WORM_TAIL, PM_LONG_WORM,
         PM_HUMAN_ZOMBIE, PM_DOPPELGANGER } from './monsters.js';
import { pline } from './display.js';
import { tty_getlin } from './wintty.js';
import { mungspaces, strstri, strncmpi, sgn, upstart,
         distu } from './hacklib.js';
import { name_to_mon, amorphous, noncorporeal, unsolid, unique_corpstat,
         passes_walls, is_male, is_female, is_whirly } from './mondata.js';
import { makemon, makemon_flush_msg } from './makemon.js';
import { SCROLL_CLASS, SPBOOK_CLASS } from './objects.js';
import { GETOBJ_EXCLUDE, GETOBJ_SUGGEST, GETOBJ_DOWNPLAY, GETOBJ_PROMPT,
         ECMD_OK, ECMD_CANCEL } from './const.js';
import { check_capacity } from './hack.js';
import { getobj } from './invent.js';
import * as O from './objects.js';
import { objects, COIN_CLASS, WEAPON_CLASS, ARMOR_CLASS, WAND_CLASS,
         RING_CLASS, TOOL_CLASS, GEM_CLASS, BALL_CLASS, CHAIN_CLASS } from './objects.js';
import { ECMD_TIME, GETOBJ_ALLOWCNT, GETOBJ_EXCLUDE_SELECTABLE, BY_COOKIE,
         CONFUSION, STUNNED, HALLUC, FIRE_RES, PASSES_WALLS, INVIS, SEE_INVIS,
         TIMEOUT, A_CON, A_STR, A_WIS, A_DEX, A_INT, SPE_LIM, ALL_SPELLS,
         W_BALL, W_CHAIN, W_ART, W_ARTI, W_SADDLE, TT_BURIEDBALL,
         WT_IRON_BALL_INCR, MM_EDOG, NO_MINVENT, MM_NOMSG, NOTELL,
         COST_UNCHRG, COST_DECHNT, COST_DEGRD, COST_UNCURS, KILLED_BY_AN,
         HAND, HEAD, M_SEEN_FIRE, G_GONE, M_AP_NOTHING, M_AP_MONSTER,
         M_AP_TYPE, In_endgame, Is_earthlevel, Is_rogue_level, Is_waterlevel,
         thats_enough_tries, Never_mind, nothing_happens, ROOMOFFSET,
         IS_OBSTRUCTED, IS_AIR, ACCESSIBLE, isok } from './const.js';
import {
    You, Your, You_feel, You_cant, pline_The, newsym, canspotmon, canseemon,
    sensemon, map_invisible, tmp_at, DISP_BEAM, DISP_END, cmap_to_glyph
} from './display.js';
import { useup, useupall, prinv, identify_pack, stackobj, obfree,
         silly_thing } from './invent.js';
import { strange_feeling, trycall, make_confused, make_stunned,
         burn_away_slime, hliquid } from './potion.js';
import { exercise, ACURR } from './attrib.js';
import { more_experienced } from './exper.js';
import { discover_object, makeknown } from './o_init.js';
import { study_book, can_chant, losespells } from './spell.js';
import { outrumor } from './rumors.js';
import { bcsign, curse, bless, uncurse, blessorcurse, costly_alteration,
         weight, mksobj, mkobj, erosion_matters } from './mkobj.js';
import { some_armor, adj_abon, destroy_arm, disintegrate_arm, count_worn_armor,
         any_worn_armor_ok, hard_helmet } from './do_wear.js';
import { remove_worn_item } from './steal.js';
import { Yobjnam2, Yname2, otense, an, xname, doname, makeplural,
         suit_simple_name, vtense, singular } from './objnam.js';
import { hcolor, Monnam, mon_nam, pmname } from './do_name.js';
import { simpleonames } from './iactions.js';
import { level_tele, scrolltele, enexto } from './teleport.js';
import { resist } from './zap.js';
import { monflee } from './monmove.js';
import { setmangry, killed, mondied, wakeup, wake_nearto } from './mon.js';
import { m_at, closed_door } from './makemon.js';
import { initedog, tamedog } from './dog.js';
import { body_part, has_ceiling } from './insight.js';
import { which_armor, setworn } from './worn.js';
import { create_gas_cloud } from './region.js';
import { getpos, getpos_sethilite } from './getpos.js';
import { cansee, do_clear_area, vision_recalc } from './vision.js';
import { dmgval } from './weapon.js';
import { losehp, Maybe_Half_Phys } from './trap.js';
import { flooreffects, dropy } from './do.js';
import { will_weld } from './wield.js';
import { wipeout_text } from './engrave.js';
import { ART_ORB_OF_FATE, ART_SUNSWORD, ART_MAGICBANE } from './artilist.js';
import { PM_TOURIST, PM_WIZARD, PM_ACID_BLOB, PM_BLACK_LIGHT,
         PM_YELLOW_LIGHT, PM_GIANT_EEL, PM_GREMLIN, PM_FIRE_ANT,
         PM_PYROLISK, PM_HELL_HOUND, PM_IMP, PM_LARGE_MIMIC, PM_LEOCROTTA,
         PM_SCORPION, PM_XAN, PM_GIANT_BAT, PM_WATER_MOCCASIN,
         PM_FLESH_GOLEM, PM_BARBED_DEVIL, PM_MARILITH, PM_PIRANHA,
         S_HUMAN, M1_AMORPHOUS, M1_WALLWALK, M1_UNSOLID, S_GHOST, S_VORTEX, PM_AIR_ELEMENTAL } from './monsters.js';
import { placebc, set_bc } from './ball.js';
import {
    Fire_resistance, Punished, HStun, HConfusion, Confusion, Blind, Hallucination, Deaf,
    Invisible, Underwater, Passes_walls
} from './youprop.js';
import { Role_if, u_at } from './const.js';
import { snuff_light_source } from './light.js';
import { drain_weapon_skill } from './weapon.js';
import { explode as explode_rd } from './explode.js';
import { EXPL_FIERY as EXPL_FIERY_RD } from './const.js';
import { gold_detect, food_detect, trap_detect, do_mapping,
         cvt_sdoor_to_door } from './detect.js';
import { unblock_point } from './vision.js';
import { is_pool as is_pool_rd, is_lava as is_lava_rd } from "./makemon.js";
import { place_object as place_object_rd } from './mkobj.js';
import { delobj as delobj_rd } from './invent.js';
import { monstseesu as monstseesu_rd, monstunseesu as monstunseesu_rd } from './uhitm.js';
import { SDOOR as SDOOR_RD, CORR as CORR_RD,
         W_ARMH as W_ARMH_RD, DEAF as DEAF_RD, In_sokoban as In_sokoban_rd } from './const.js';
import { ceiling as ceiling_rd } from './dungeon.js';
import { In_quest as In_quest_rd } from './const.js';
import { Ring_gone, Ring_off, Ring_on } from './do_wear.js';
import { LEFT_RING, RIGHT_RING } from './const.js';
import { restrict_name } from './artifact.js';
import { has_oname, ONAME } from './const.js';
import { mhim } from './mhitu.js';
import { move_bc } from './ball.js';
import { monster_census } from './minion.js';
import { mkclass, rndmonst, set_malign, put_saddle_on_mon, can_saddle } from './makemon.js';
import { NO_NC_FLAGS } from './const.js';
import { newcham } from './mon.js';
import { light_hits_gremlin } from './uhitm.js';
import { name_to_monclass as name_to_monclass_rd } from './mondata.js';
import { S_invisible as S_invisible_rd, S_WORM_TAIL as S_WORM_TAIL_RD,
         PM_STALKER as PM_STALKER_RD } from './monsters.js';
import { buried_ball_to_freedom } from './dig.js';
import { LEG } from './const.js';

/* C ref: color.h NH_* color names */
const NH_BLACK = "black", NH_AMBER = "amber", NH_GOLDEN = "golden",
      NH_SILVER = "silver", NH_PURPLE = "purple", NH_RED = "red",
      NH_BLUE = "blue";

/* C ref: obj.h is_elven_armor() */
function is_elven_armor(o) {
    return o.otyp === O.ELVEN_LEATHER_HELM || o.otyp === O.ELVEN_MITHRIL_COAT
           || o.otyp === O.ELVEN_CLOAK || o.otyp === O.ELVEN_SHIELD
           || o.otyp === O.ELVEN_BOOTS;
}
/* C ref: hacklib.c sgn(), upwords() */
function upwords(s) {
    let space = true;
    let out = '';
    for (const c of s) {
        if (c === ' ') {
            space = true;
        } else if (space && c >= 'a' && c <= 'z') {
            out += c.toUpperCase();
            space = false;
            continue;
        } else {
            space = false;
        }
        out += c;
    }
    return out;
}
const MAX_ERODE = 3;

// C ref: read.c learnscrolltyp()
function learnscrolltyp(scrolltyp) {
    if (!objects[scrolltyp].oc_name_known) {
        makeknown(scrolltyp);
        more_experienced(0, 10);
        return true;
    } else
        return false;
}

// C ref: read.c learnscroll()
/* also called from teleport.c for scroll of teleportation */
export function learnscroll(sobj) {
    /* it's implied that sobj->dknown is set;
       we couldn't be reading this scroll otherwise */
    if (sobj.oclass !== SPBOOK_CLASS)
        learnscrolltyp(sobj.otyp);
}

// C ref: read.c cap_spe()
/* max spe is +99, min is -99 */
function cap_spe(obj) {
    if (obj) {
        if (Math.abs(obj.spe) > SPE_LIM)
            obj.spe = sgn(obj.spe) * SPE_LIM;
    }
}

// C ref: read.c erode_obj_text()
function erode_obj_text(otmp, buf) {
    const erosion = greatest_erosion(otmp);

    if (erosion)
        buf = wipeout_text(buf, Math.trunc(buf.length * erosion / (2 * MAX_ERODE)),
                           (otmp.o_id ^ (game.ubirthday || 0)) >>> 0);
    return buf;
}

// C ref: read.c tshirt_text()
export function tshirt_text(tshirt) {
    return erode_obj_text(tshirt, shirt_msgs[tshirt.o_id % shirt_msgs.length]);
}

// C ref: read.c hawaiian_motif()
export function hawaiian_motif(shirt) {
    /* a tourist's starting shirt always has the same o_id; we need some
       additional randomness or else its design will never differ */
    const motif = (shirt.o_id ^ (game.ubirthday || 0)) >>> 0;

    return hawaiian_motifs[motif % hawaiian_motifs.length];
}

// C ref: read.c hawaiian_design()
function hawaiian_design(shirt) {
    /* This hash method is slightly different than the one in hawaiian_motif;
       using the same formula in both cases may lead to some shirt combos
       never appearing, if the sizes of the two lists have common factors. */
    const bg = (shirt.o_id ^ ~(game.ubirthday || 0)) >>> 0;

    return `${makeplural(hawaiian_motif(shirt))} on ${
        an(hawaiian_bgs[bg % hawaiian_bgs.length])} background`;
}

// C ref: read.c apron_text()
export function apron_text(apron) {
    return erode_obj_text(apron, apron_msgs[apron.o_id % apron_msgs.length]);
}

// C ref: read.c read_ok() -- getobj callback for object to read
function read_ok(obj) {
    if (!obj)
        return GETOBJ_EXCLUDE;

    if (obj.oclass === SCROLL_CLASS || obj.oclass === SPBOOK_CLASS)
        return GETOBJ_SUGGEST;

    return GETOBJ_DOWNPLAY;
}

/* C ref: read.c doread() card_msgs[] */
const card_msgs = [
    "Leprechaun Gold Tru$t - Shamrock Card",
    "Magic Memory Vault Charge Card",
    "Larn National Bank",                /* Larn */
    "First Bank of Omega",               /* Omega */
    "Bank of Zork - Frobozz Magic Card", /* Zork */
    "Ankh-Morpork Merchant's Guild Barter Card",
    "Ankh-Morpork Thieves' Guild Unlimited Transaction Card",
    "Ransmannsby Moneylenders Association",
    "Bank of Gehennom - 99% Interest Card",
    "Yendorian Express - Copper Card",
    "Yendorian Express - Silver Card",
    "Yendorian Express - Gold Card",
    "Yendorian Express - Mithril Card",
    "Yendorian Express - Platinum Card", /* must be last */
];

/* C ref: read.c doread() red_mons[] */
const red_mons = [
    PM_FIRE_ANT, PM_PYROLISK, PM_HELL_HOUND, PM_IMP,
    PM_LARGE_MIMIC, PM_LEOCROTTA, PM_SCORPION, PM_XAN,
    PM_GIANT_BAT, PM_WATER_MOCCASIN, PM_FLESH_GOLEM,
    PM_BARBED_DEVIL, PM_MARILITH, PM_PIRANHA,
];

/* C ref: read.c doread() --
   if (!u.uconduct.literate++) livelog_printf(LL_CONDUCT, ...) */
function literate_conduct(llmsg) {
    if (!game.u.uconduct.literate++)
        livelog_printf(LL_CONDUCT, llmsg);
}

// C ref: read.c doread() -- the #read command; read a scroll or spell
// book or various other things
export async function doread() {
    const find_any_braille = "feel any Braille writing.";
    const g = game;
    const u = g.u;
    let confused, nodisappear;

    /*
     * Reading while blind is allowed in most cases, including the
     * Book of the Dead but not regular spellbooks.  For scrolls, the
     * description has to have been seen or magically learned (so only
     * when scroll->dknown is true):  hero recites the label while
     * holding the unfurled scroll.  We deliberately don't require
     * free hands because that would cripple scroll of remove curse,
     * but we ought to be requiring hands or at least limbs.  The
     * recitation could be sub-vocal; actual speech isn't required.
     *
     * Reading while confused is allowed and can produce alternate
     * outcome.
     *
     * Reading while stunned is currently allowed but probably should
     * be prevented....
     */

    g.known = false;
    if (await check_capacity(null))
        return ECMD_OK;

    const scroll = await getobj("read", read_ok, GETOBJ_PROMPT);
    if (!scroll)
        return ECMD_CANCEL;
    const otyp = scroll.otyp;
    scroll.pickup_prev = 0; /* no longer 'just picked up' */

    /* outrumor has its own blindness check */
    if (otyp === O.FORTUNE_COOKIE) {
        if (g.flags.verbose)
            await You("break up the cookie and throw away the pieces.");
        await outrumor(bcsign(scroll), BY_COOKIE);
        if (!Blind())
            literate_conduct("became literate by reading a fortune cookie");
        useup(scroll);
        return ECMD_TIME;
    } else if (otyp === O.T_SHIRT || otyp === O.ALCHEMY_SMOCK
               || otyp === O.HAWAIIAN_SHIRT) {
        if (Blind()) {
            await You_cant(find_any_braille);
            return ECMD_OK;
        }
        /* can't read shirt worn under suit (under cloak is ok though) */
        if ((otyp === O.T_SHIRT || otyp === O.HAWAIIAN_SHIRT) && g.uarm
            && scroll === g.uarmu) {
            await pline(`${scroll.unpaid ? "That" : "Your"} shirt is obscured by ${
                shk_your(g.uarm)}${suit_simple_name(g.uarm)}.`);
            return ECMD_OK;
        }
        if (otyp === O.HAWAIIAN_SHIRT) {
            await pline(`${g.flags.verbose ? "The design" : "It"} features ${
                hawaiian_design(scroll)}.`);
            return ECMD_TIME;
        }
        literate_conduct(`became literate by reading ${
            (scroll.otyp === O.T_SHIRT) ? "a T-shirt" : "an apron"}`);

        /* populate 'buf[]' */
        const mesg = (otyp === O.T_SHIRT) ? tshirt_text(scroll)
                                          : apron_text(scroll);
        let endpunct = "";
        if (g.flags.verbose) {
            const ln = mesg.length;

            /* we will be displaying a sentence; need ending punctuation */
            if (ln > 0 && !".!?".includes(mesg[ln - 1]))
                endpunct = ".";
            await pline("It reads:");
        }
        await pline(`"${mesg}"${endpunct}`);
        return ECMD_TIME;
    } else if ((otyp === O.DUNCE_CAP || otyp === O.CORNUTHAUM)
               /* note: "DUNCE" isn't directly connected to tourists but
                  if everyone could read it, they would always be able to
                  trivially distinguish between the two types of conical hat;
                  limiting this to tourists is better than rejecting it */
               && Role_if(PM_TOURIST)) {
        const cap_text = (otyp === O.DUNCE_CAP) ? "DUNCE" : "WIZZARD";

        if (scroll.o_id % 3) {
            /* no need to vary this when blind; "on this ___" is important
               because it suggests that there might be something on others */
            await You_cant(`find anything to read on this ${simpleonames(scroll)}.`);
            return ECMD_OK;
        }
        await pline(`${!Blind() ? "There is writing" : "You feel lettering"} on the ${
            simpleonames(scroll)}.  It reads:  ${cap_text}.`);
        literate_conduct(`became literate by reading ${
            (otyp === O.DUNCE_CAP) ? "a dunce cap" : "a cornuthaum"}`);

        /* yet another note: despite the fact that player will recognize
           the object type, don't make it become a discovery for hero */
        await trycall(scroll);
        return ECMD_TIME;
    } else if (otyp === O.CREDIT_CARD) {
        if (Blind()) {
            await You("feel the embossed numbers:");
        } else {
            if (g.flags.verbose)
                await pline("It reads:");
            await pline(`"${scroll.oartifact
                            ? card_msgs[card_msgs.length - 1]
                            : card_msgs[scroll.o_id % (card_msgs.length - 1)]}"`);
        }
        /* Make a credit card number */
        const id = scroll.o_id;
        await pline(`"${(id % 89) + 10}0${id % 4} ${((id * 499) % 899999) + 100000}${
            id % 10}1 0${!(id % 3) ? 1 : 0}${(id * 7) % 10}0"${
            (g.flags.verbose || Blind()) ? "." : ""}`);
        literate_conduct("became literate by reading a credit card");

        return ECMD_TIME;
    } else if (otyp === O.CAN_OF_GREASE) {
        await pline(`This ${singular(scroll, xname)} has no label.`);
        return ECMD_OK;
    } else if (otyp === O.MAGIC_MARKER) {
        const pm = mons[red_mons[scroll.o_id % red_mons.length]];

        if (Blind()) {
            await You_cant(find_any_braille);
            return ECMD_OK;
        }
        if (g.flags.verbose)
            await pline("It reads:");
        const buf = pmname(pm, NEUTRAL);
        await pline(`"Magic Marker(TM) ${upwords(buf)} Red Ink Marker Pen.  Water Soluble."`);
        literate_conduct("became literate by reading a magic marker");

        return ECMD_TIME;
    } else if (scroll.oclass === COIN_CLASS) {
        if (Blind())
            await You("feel the embossed words:");
        else if (g.flags.verbose)
            await You("read:");
        await pline("\"1 Zorkmid.  857 GUE.  In Frobs We Trust.\"");
        literate_conduct("became literate by reading a coin's engravings");

        return ECMD_TIME;
    } else if (is_art(scroll, ART_ORB_OF_FATE)) {
        if (Blind())
            await You("feel the engraved signature:");
        else
            await pline("It is signed:");
        await pline("\"Odin.\"");
        literate_conduct("became literate by reading the divine signature of Odin");

        return ECMD_TIME;
    } else if (otyp === CANDY_BAR) {
        const wrapper = candy_wrapper_text(scroll);

        if (Blind()) {
            await You_cant(find_any_braille);
            return ECMD_OK;
        }
        if (!wrapper) {
            await pline("The candy bar's wrapper is blank.");
            return ECMD_OK;
        }
        await pline(`The wrapper reads: "${wrapper}".`);
        literate_conduct("became literate by reading a candy bar wrapper");

        return ECMD_TIME;
    } else if (scroll.oclass !== SCROLL_CLASS
               && scroll.oclass !== SPBOOK_CLASS) {
        await pline("That is a silly thing to read."); /* silly_thing_to */
        return ECMD_OK;
    } else if (Blind() && otyp !== O.SPE_BOOK_OF_THE_DEAD) {
        let what = null;

        if (otyp === O.SPE_NOVEL)
            /* unseen novels are already distinguishable from unseen
               spellbooks so this isn't revealing any extra information */
            what = "words";
        else if (scroll.oclass === SPBOOK_CLASS)
            what = "mystic runes";
        else if (!scroll.dknown)
            what = "formula on the scroll";
        if (what) {
            await pline(`Being blind, you cannot read the ${what}.`);
            return ECMD_OK;
        }
    }

    confused = Confusion();
    /* MAIL_STRUCTURES */
    if (otyp === O.SCR_MAIL) {
        confused = false; /* override */
        /* reading mail is a convenience for the player and takes
           place outside the game, so shouldn't affect gameplay;
           on the other hand, it starts by explicitly making the
           hero actively read something, which is pretty hard
           to simply ignore; as a compromise, if the player has
           maintained illiterate conduct so far, and this mail
           scroll didn't come from bones, ask for confirmation */
        if (!u.uconduct.literate) {
            if (!scroll.spe)
                throw new Error('doread(): "Reading mail will violate \\"illiterate\\" conduct." (y_n) not ported yet');
        }
    }

    /* Actions required to win the game aren't counted towards conduct */
    /* Novel conduct is handled in read_tribute so exclude it too */
    if (otyp !== O.SPE_BOOK_OF_THE_DEAD && otyp !== O.SPE_NOVEL
        && otyp !== O.SPE_BLANK_PAPER && otyp !== O.SCR_BLANK_PAPER)
        literate_conduct(`became literate by reading ${
            (scroll.oclass === SPBOOK_CLASS) ? "a book"
            : (scroll.oclass === SCROLL_CLASS) ? "a scroll"
              : "something"}`);

    if (scroll.oclass === SPBOOK_CLASS) {
        return (await study_book(scroll)) ? ECMD_TIME : ECMD_OK;
    }
    scroll.in_use = 1; /* scroll, not spellbook, now being read */
    if (otyp !== O.SCR_BLANK_PAPER) {
        const silently = !can_chant(g.youmonst);

        /* a few scroll feedback messages describe something happening
           to the scroll itself, so avoid "it disappears" for those */
        nodisappear = (otyp === O.SCR_FIRE
                       || (otyp === O.SCR_REMOVE_CURSE && scroll.cursed));
        if (Blind())
            await pline(nodisappear
                        ? `You ${silently ? "cogitate" : "pronounce"} the formula on the scroll.`
                        : `As you ${silently ? "cogitate" : "pronounce"} the formula on it, the scroll disappears.`);
        else
            await pline(nodisappear ? "You read the scroll."
                                    : "As you read the scroll, it disappears.");
        if (confused) {
            if (Hallucination())
                await pline("Being so trippy, you screw up...");
            else
                await pline(`Being confused, you ${
                    silently ? "misunderstand" : "mispronounce"} the magic words...`);
        }
    }
    if (!(await seffects(scroll))) {
        if (!objects[otyp].oc_name_known) {
            if (g.known)
                learnscroll(scroll);
            else
                await trycall(scroll);
        }
        scroll.in_use = 0;
        if (otyp !== O.SCR_BLANK_PAPER)
            useup(scroll);
    }
    return ECMD_TIME;
}

// C ref: read.c stripspe()
async function stripspe(obj) {
    if (obj.blessed || obj.spe <= 0) {
        await pline(nothing_happens);
    } else {
        /* order matters: message, shop handling, actual transformation */
        await pline(`${Yobjnam2(obj, "vibrate")} briefly.`);
        costly_alteration(obj, COST_UNCHRG);
        obj.spe = 0;
        if (obj.otyp === O.OIL_LAMP || obj.otyp === O.BRASS_LANTERN)
            obj.age = 0;
    }
}

// C ref: read.c p_glow1()
async function p_glow1(otmp) {
    await pline(`${Yobjnam2(otmp, Blind() ? "vibrate" : "glow")} briefly.`);
}

// C ref: read.c p_glow2()
async function p_glow2(otmp, color) {
    await pline(`${Yobjnam2(otmp, Blind() ? "vibrate" : "glow")}${
        Blind() ? "" : " "}${Blind() ? "" : hcolor(color)} for a moment.`);
}

// C ref: read.c p_glow3()
async function p_glow3(otmp, color) {
    await pline(`${Yobjnam2(otmp, Blind() ? "vibrate" : "glow")} feebly${
        Blind() ? "" : " "}${Blind() ? "" : hcolor(color)} for a moment.`);
}

// C ref: read.c charge_ok() -- getobj callback for object to charge
export function charge_ok(obj) {
    if (!obj)
        return GETOBJ_EXCLUDE;

    if (obj.oclass === WAND_CLASS)
        return GETOBJ_SUGGEST;

    if (obj.oclass === RING_CLASS && objects[obj.otyp].oc_charged
        && obj.dknown && objects[obj.otyp].oc_name_known)
        return GETOBJ_SUGGEST;

    if (is_weptool(obj)) /* specific check before general tools */
        return GETOBJ_EXCLUDE;

    if (obj.oclass === TOOL_CLASS) {
        /* suggest tools that aren't oc_charged but can still be recharged */
        if (obj.otyp === O.BRASS_LANTERN
            || (obj.otyp === O.OIL_LAMP)
            /* only list magic lamps if they are not identified yet */
            || (obj.otyp === O.MAGIC_LAMP
                && !objects[O.MAGIC_LAMP].oc_name_known)) {
            return GETOBJ_SUGGEST;
        }
        /* suggest chargeable tools only if discovered, to prevent leaking
           info (e.g. revealing if an unidentified 'flute' is magic or not) */
        if (objects[obj.otyp].oc_charged) {
            return (obj.dknown && objects[obj.otyp].oc_name_known)
                     ? GETOBJ_SUGGEST : GETOBJ_DOWNPLAY;
        }
        return GETOBJ_EXCLUDE;
    }
    /* why are weapons/armor considered charged anyway?
     * make them selectable even so for "feeling of loss" message */
    return GETOBJ_EXCLUDE_SELECTABLE;
}

// C ref: read.c recharge() -- recharge an object; curse_bless is -1 if
// the recharging implement was cursed, +1 if blessed, 0 otherwise.
// Only the "feeling of loss" and stripspe() paths are ported so far.
export async function recharge(obj, curse_bless) {
    const is_cursed = curse_bless < 0;
    const is_blessed = curse_bless > 0;

    if (obj.oclass === RING_CLASS && objects[obj.otyp].oc_charged) {
        /* charging does not affect ring's curse/bless status */
        let s = is_blessed ? rnd(3) : is_cursed ? -rnd(2) : 1;
        const is_on = (obj === game.uleft || obj === game.uright);

        /* destruction depends on current state, not adjustment */
        if (obj.spe > rn2(7) || obj.spe <= -5) {
            await pline(`${Yobjnam2(obj, "pulsate")} momentarily, then ${
                otense(obj, "explode")}!`);
            if (is_on)
                await Ring_gone(obj);
            s = rnd(3 * Math.abs(obj.spe)); /* amount of damage */
            useup(obj), obj = null;
            await losehp(Maybe_Half_Phys(s), "exploding ring", KILLED_BY_AN);
        } else {
            const mask = is_on ? (obj === game.uleft ? LEFT_RING : RIGHT_RING) : 0;

            await pline(`${Yname2(obj)} spins ${s < 0 ? "counter" : ""}clockwise for a moment.`);
            if (s < 0)
                costly_alteration(obj, COST_DECHNT);
            /* cause attributes and/or properties to be updated */
            if (is_on)
                await Ring_off(obj);
            obj.spe += s; /* update the ring while it's off */
            if (is_on)
                setworn(obj, mask), Ring_on(obj);
            /* oartifact: if a touch-sensitive artifact ring is
               ever created the above will need to be revised  */
            /* update shop bill to reflect new higher price */
            if (s > 0 && obj.unpaid)
                throw new Error('recharge(): alter_cost() not ported yet');
        }
    } else if (obj.oclass === WAND_CLASS || obj.oclass === TOOL_CLASS) {
        if (is_cursed) {
            await stripspe(obj);
            return;
        }
        throw new Error('recharge(): recharging wands and tools not ported yet');
    } else {
        await You("have a feeling of loss.");
    }
}

// C ref: read.c forget()
/*
 * Forget some things (e.g. after reading a scroll of amnesia).  When called,
 * the following are always forgotten:
 *      - felt ball & chain
 *      - skill training
 *
 * Other things are subject to flags:
 *      howmuch & ALL_SPELLS    = forget all spells
 */
async function forget(howmuch) {
    const g = game, u = g.u;

    if (Punished())
        u.bc_felt = 0; /* forget felt ball&chain */

    if (howmuch & ALL_SPELLS)
        await losespells();

    /* Forget some skills. */
    await drain_weapon_skill(rnd(howmuch ? 5 : 3));

    /* forget having seen monsts (affects recognizing unseen ones by sound) */
    for (let mtmp = g.fmon; mtmp; mtmp = mtmp.nmon)
        if (mtmp !== u.usteed && mtmp !== u.ustuck)
            mtmp.meverseen = 0;
    /* [perhaps ought to forget having seen every monster on every level] */
    for (let mtmp = g.migrating_mons; mtmp; mtmp = mtmp.nmon)
        mtmp.meverseen = 0;
}

// C ref: read.c maybe_tame() -- monster is hit by scroll of taming's effect
async function maybe_tame(mtmp, sobj) {
    const was_tame = mtmp.mtame;
    const was_peaceful = mtmp.mpeaceful;

    if (sobj.cursed) {
        await setmangry(mtmp, false);
        if (was_peaceful && !mtmp.mpeaceful)
            return -1;
    } else {
        /* for a shopkeeper, tamedog() will call make_happy_shk() but
           not tame the target, so call it even if taming gets resisted */
        if (!resist(mtmp, sobj.oclass, 0, NOTELL) || mtmp.isshk)
            await tamedog(mtmp, sobj, false);

        if ((!was_peaceful && mtmp.mpeaceful) || was_tame !== mtmp.mtame)
            return 1;
    }
    return 0;
}

// C ref: read.c valid_cloud_pos()
/* Can a stinking cloud physically exist at a certain position?
 * NOT the same thing as can_center_cloud.
 */
export function valid_cloud_pos(x, y) {
    if (!isok(x, y))
        return false;
    return ACCESSIBLE(game.level.at(x, y).typ) || is_pool_rd(x, y)
           || is_lava_rd(x, y);
}

// C ref: read.c can_center_cloud()
/* Callback for getpos_sethilite, also used in determining whether a scroll
 * should have its regular effects, or not because it was out of range.
 */
function can_center_cloud(x, y) {
    if (!valid_cloud_pos(x, y))
        return false;
    return (cansee(x, y) && distu(x, y) < 32);
}

// C ref: read.c display_stinking_cloud_positions()
async function display_stinking_cloud_positions(on_off) {
    let x, y, dx, dy;
    const dist = 6;

    if (on_off) {
        /* on */
        await tmp_at(DISP_BEAM, 0); /* cmap_to_glyph(S_goodpos) */
        for (dx = -dist; dx <= dist; dx++)
            for (dy = -dist; dy <= dist; dy++) {
                x = game.u.ux + dx;
                y = game.u.uy + dy;
                /* hero's location is allowed but highlighting the hero's
                   spot makes map harder to read (if using '$' rather than
                   by changing background color) */
                if (u_at(x, y))
                    continue;
                if (can_center_cloud(x, y))
                    await tmp_at(x, y);
            }
    } else {
        /* off */
        await tmp_at(DISP_END, 0);
    }
}

// C ref: read.c seffect_enchant_armor()
async function seffect_enchant_armor(sobjp) {
    const g = game;
    const sobj = sobjp.obj;
    let s;
    let special_armor;
    let same_color;
    const otmp = some_armor(g.youmonst);
    const sblessed = sobj.blessed;
    const scursed = sobj.cursed;
    const confused = Confusion();
    let old_erodeproof, new_erodeproof;

    if (!otmp) {
        await strange_feeling(sobj, !Blind()
                              ? "Your skin glows then fades."
                              : "Your skin feels warm for a moment.");
        sobjp.obj = null; /* useup() in strange_feeling() */
        await exercise(A_CON, !scursed);
        await exercise(A_STR, !scursed);
        return;
    }
    if (confused) {
        old_erodeproof = (otmp.oerodeproof !== 0 && !!otmp.oerodeproof);
        new_erodeproof = !scursed;
        otmp.oerodeproof = 0; /* for messages */
        if (Blind()) {
            otmp.rknown = 0;
            await pline(`${Yobjnam2(otmp, "feel")} warm for a moment.`);
        } else {
            otmp.rknown = 1;
            await pline(`${Yobjnam2(otmp, "are")} covered by a ${
                scursed ? "mottled" : "shimmering"} ${
                hcolor(scursed ? NH_BLACK : NH_GOLDEN)} ${
                scursed ? "glow" : (is_shield(otmp) ? "layer" : "shield")}!`);
        }
        if (new_erodeproof && (otmp.oeroded || otmp.oeroded2)) {
            otmp.oeroded = otmp.oeroded2 = 0;
            await pline(`${Yobjnam2(otmp, Blind() ? "feel" : "look")} as good as new!`);
        }
        if (old_erodeproof && !new_erodeproof) {
            /* restore old_erodeproof before shop charges */
            otmp.oerodeproof = 1;
            costly_alteration(otmp, COST_DEGRD);
        }
        otmp.oerodeproof = new_erodeproof ? 1 : 0;
        return;
    }
    /* elven armor vibrates warningly when enchanted beyond a limit */
    special_armor = is_elven_armor(otmp)
        || (Role_if(PM_WIZARD) && otmp.otyp === O.CORNUTHAUM);
    if (scursed)
        same_color = (otmp.otyp === O.BLACK_DRAGON_SCALE_MAIL
                      || otmp.otyp === O.BLACK_DRAGON_SCALES);
    else
        same_color = (otmp.otyp === O.SILVER_DRAGON_SCALE_MAIL
                      || otmp.otyp === O.SILVER_DRAGON_SCALES
                      || otmp.otyp === O.SHIELD_OF_REFLECTION);
    if (Blind())
        same_color = false;

    /* KMH -- catch underflow */
    s = scursed ? -otmp.spe : otmp.spe;
    if (s > (special_armor ? 5 : 3) && rn2(s)) {
        otmp.in_use = 1;
        await pline(`${Yname2(otmp)} violently ${otense(otmp, Blind() ? "vibrate" : "glow")}${
            (!Blind() && !same_color) ? " " : ""}${
            (Blind() || same_color) ? "" : hcolor(scursed ? NH_BLACK : NH_SILVER)
        } for a while, then ${otense(otmp, "evaporate")}.`);
        await remove_worn_item(otmp, false);
        useup(otmp);
        return;
    }
    if (s < -100)
        s = -100; /* avoid integer overflow with very negative armor */

    /* Base power of the enchantment:

       2 for -1 to +0 armor;
       1 for +1 to +2 armor;
       0 for +3 to +4 armor, etc.

       When disenchanting, everything is done with reversed signs. */
    s = Math.trunc((4 - s) / 2);

    /* Elven/artifact and nonmagical armor is easier to enchant;
       blessed scrolls are more effective. */
    if (special_armor)
        ++s;
    if (!objects[otmp.otyp].oc_magic)
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
        s = 11; /* unlikely but possible: avoids an overflow later */

    if (scursed)
        s = -s;

    if (s >= 0 && Is_dragon_scales(otmp))
        throw new Error('seffect_enchant_armor(): dragon scales merging into scale mail not ported yet');
    await pline(`${Yname2(otmp)} ${(s === 0) ? "violently " : ""}${
        otense(otmp, Blind() ? "vibrate" : "glow")}${
        (!Blind() && !same_color) ? " " : ""}${
        (Blind() || same_color) ? "" : hcolor(scursed ? NH_BLACK : NH_SILVER)
    } for a ${(s * s > 1) ? "while" : "moment"}.`);
    /* [this cost handling will need updating if shop pricing is
       ever changed to care about curse/bless status of armor] */
    if (s < 0)
        costly_alteration(otmp, COST_DECHNT);
    if (scursed && !otmp.cursed)
        curse(otmp);
    else if (sblessed && !otmp.blessed)
        bless(otmp);
    else if (!scursed && otmp.cursed)
        uncurse(otmp);
    if (s) {
        const oldspe = otmp.spe;
        /* despite being schar, it shouldn't be possible for spe to wrap
           here because it has been capped at 99 and s is quite small;
           however, might need to change s if it takes spe past 99 */
        otmp.spe += s;
        cap_spe(otmp); /* make sure that it doesn't exceed SPE_LIM */
        s = otmp.spe - oldspe; /* cap_spe() might have throttled 's' */
        if (s) /* skip if it got changed to 0 */
            adj_abon(otmp, s); /* adjust armor bonus for Dex or Int+Wis */
        g.known = !!otmp.known;
        /* update shop bill to reflect new higher price */
        if (s > 0 && otmp.unpaid)
            throw new Error('seffect_enchant_armor(): alter_cost() not ported yet');
    }

    if ((otmp.spe > (special_armor ? 5 : 3))
        && (special_armor || !rn2(7)))
        await pline(`${Yobjnam2(otmp, "suddenly vibrate")} ${
            Blind() ? "again" : "unexpectedly"}.`);
}

// C ref: read.c disintegrate_cursed_armor()
/* destroy a random cursed armor worn by hero */
async function disintegrate_cursed_armor() {
    const g = game;
    const armors = [];

    if (g.uarm && g.uarm.cursed)
        armors.push(g.uarm);
    if (g.uarmc && g.uarmc.cursed)
        armors.push(g.uarmc);
    if (g.uarmh && g.uarmh.cursed)
        armors.push(g.uarmh);
    if (g.uarms && g.uarms.cursed)
        armors.push(g.uarms);
    if (g.uarmg && g.uarmg.cursed)
        armors.push(g.uarmg);
    if (g.uarmf && g.uarmf.cursed)
        armors.push(g.uarmf);
    if (g.uarmu && g.uarmu.cursed)
        armors.push(g.uarmu);
    if (!armors.length)
        return false;

    if (await disintegrate_arm(armors[rn2(armors.length)]))
        return true;

    return false;
}

// C ref: read.c seffect_destroy_armor()
async function seffect_destroy_armor(sobjp) {
    const g = game;
    const sobj = sobjp.obj;
    let otmp = some_armor(g.youmonst);
    const scursed = sobj.cursed;
    const confused = Confusion();
    let old_erodeproof, new_erodeproof;

    if (confused) {
        if (!otmp) {
            await strange_feeling(sobj, "Your bones itch.");
            sobjp.obj = null; /* useup() in strange_feeling() */
            await exercise(A_STR, false);
            await exercise(A_CON, false);
            return;
        }
        old_erodeproof = !!otmp.oerodeproof;
        new_erodeproof = !!scursed;
        otmp.oerodeproof = 0; /* for messages */
        await p_glow2(otmp, NH_PURPLE);
        if (old_erodeproof && !new_erodeproof) {
            /* restore old_erodeproof before shop charges */
            otmp.oerodeproof = 1;
            costly_alteration(otmp, COST_DEGRD);
        }
        otmp.oerodeproof = new_erodeproof ? 1 : 0;
        return;
    }

    if (scursed) {
        if (otmp && otmp.cursed) {
            /* armor and scroll both cursed */
            await pline(`${Yobjnam2(otmp, "vibrate")}.`);
            if (otmp.spe >= -6) {
                otmp.spe += -1;
                adj_abon(otmp, -1);
            }
            await make_stunned((HStun() & TIMEOUT) + rn1(10, 10), true);
        } else if (await disintegrate_arm(otmp)) {
            g.known = true;
            return;
        }
    } else {
        const gets_choice = (otmp && sobj && sobj.blessed
                             && count_worn_armor() > 1);

        if (gets_choice) {
            if (!objects[sobj.otyp].oc_name_known)
                throw new Error('seffect_destroy_armor(): actualoname() not ported yet');
            g.known = true;
            const atmp = await getobj("destroy", any_worn_armor_ok, GETOBJ_PROMPT);
            /* check the return value, if user picked non-valid obj */
            if (any_worn_armor_ok(atmp) === GETOBJ_SUGGEST)
                otmp = atmp;
            if (await disintegrate_arm(otmp)) {
                g.known = true;
                return;
            }
        } else if (sobj.blessed && (await disintegrate_cursed_armor())) {
            g.known = true;
            return;
        } else if (!(await destroy_arm())) {
            await strange_feeling(sobj, "Your skin itches.");
            sobjp.obj = null; /* useup() in strange_feeling() */
            await exercise(A_STR, false);
            await exercise(A_CON, false);
            return;
        } else
            g.known = true;
    }
}

// C ref: read.c seffect_confuse_monster()
async function seffect_confuse_monster(sobjp) {
    const g = game, u = g.u;
    const sobj = sobjp.obj;
    const sblessed = sobj.blessed,
          scursed = sobj.cursed,
          confused = Confusion(),
          altfeedback = (Blind() || Invisible());
    const hands = makeplural(body_part(HAND));

    if (g.youmonst.data.mlet !== S_HUMAN || scursed) {
        if (!HConfusion())
            await You_feel("confused.");
        await make_confused(HConfusion() + rnd(100), false);
    } else if (confused) {
        if (!sblessed) {
            await Your(`${hands} begin to ${altfeedback ? "tingle" : "glow "}${
                altfeedback ? "" : hcolor(NH_PURPLE)}.`);
            await make_confused(HConfusion() + rnd(100), false);
        } else {
            await pline(`A ${altfeedback ? "" : hcolor(NH_RED)}${
                altfeedback ? "faint buzz" : " glow"} surrounds your ${body_part(HEAD)}.`);
            await make_confused(0, true);
        }
    } else {
        /* scroll vs spell */
        let incr = (sobj.oclass === SCROLL_CLASS) ? 3 : 0;

        if (!sblessed) {
            if (altfeedback)
                await Your(`${hands} tingle${u.umconf ? " even more" : ""}.`);
            else if (!u.umconf)
                await Your(`${hands} begin to glow ${hcolor(NH_RED)}.`);
            else
                await pline_The(`${hcolor(NH_RED)} glow of your ${hands} intensifies.`);
            incr += rnd(2);
        } else {
            if (altfeedback)
                await Your(`${hands} tingle ${u.umconf ? "even more" : "very"} sharply.`);
            else
                await Your(`${hands} glow ${u.umconf ? "an even more" : "a"} brilliant ${
                    hcolor(NH_RED)}.`);
            incr += rn1(8, 2);
        }
        /* after a while, repeated uses become less effective */
        if ((u.umconf || 0) >= 40)
            incr = 1;
        u.umconf = (u.umconf || 0) + incr;
    }
}

// C ref: read.c seffect_scare_monster()
async function seffect_scare_monster(sobjp) {
    const g = game;
    const sobj = sobjp.obj;
    const otyp = sobj.otyp;
    const scursed = sobj.cursed;
    const confused = Confusion();
    let ct = 0;

    for (let mtmp = g.fmon; mtmp; mtmp = mtmp.nmon) {
        if (DEADMONSTER(mtmp))
            continue;
        if (cansee(mtmp.mx, mtmp.my)) {
            if (confused || scursed) {
                mtmp.mflee = mtmp.mfrozen = mtmp.msleeping = 0;
                mtmp.mcanmove = 1;
            } else if (!resist(mtmp, sobj.oclass, 0, NOTELL))
                await monflee(mtmp, 0, false, false);
            if (!mtmp.mtame)
                ct++; /* pets don't laugh at you */
        }
    }
    if (otyp === O.SCR_SCARE_MONSTER || !ct) {
        /* Soundeffect(): no sound in the port */
        await You_hear(`${(confused || scursed) ? "sad wailing"
                                                : "maniacal laughter"} ${
            !ct ? "in the distance" : "close by"}.`);
    }
}

// C ref: read.c seffect_remove_curse()
async function seffect_remove_curse(sobjp) {
    const g = game, u = g.u;
    const sobj = sobjp.obj; /* scroll or fake spellbook */
    const otyp = sobj.otyp;
    const sblessed = sobj.blessed;
    const scursed = sobj.cursed;
    const confused = Confusion();
    let obj, nxto;
    let wornmask;

    await You_feel(!Hallucination()
                   ? (!confused ? "like someone is helping you."
                      : "like you need some help.")
                   : (!confused ? "in touch with the Universal Oneness."
                      : "the power of the Force against you!"));

    if (scursed) {
        await pline_The("scroll disintegrates.");
    } else {
        /* 5.0: this used to use a straight
               for (obj = invent; obj; obj = obj->nobj) {}
           traversal, but for the confused case, secondary weapon might
           become cursed and be dropped, moving it from the invent chain
           to the floor chain at hero's spot, so we have to remember the
           next object prior to processing the current one */
        for (obj = g.invent; obj; obj = nxto) {
            nxto = obj.nobj;
            /* gold isn't subject to cursing and blessing */
            if (obj.oclass === COIN_CLASS)
                continue;
            /* hide current scroll from itself so that perm_invent won't
               show known blessed scroll losing bknown when confused */
            if (obj === sobj && obj.quan === 1)
                continue;
            wornmask = ((obj.owornmask || 0) & ~(W_BALL | W_ART | W_ARTI));
            if (wornmask && !sblessed) {
                /* handle a couple of special cases; we don't
                   allow auxiliary weapon slots to be used to
                   artificially increase number of worn items */
                if (obj === g.uswapwep) {
                    if (!u.twoweap)
                        wornmask = 0;
                } else if (obj === g.uquiver) {
                    if (obj.oclass === WEAPON_CLASS) {
                        /* mergeable weapon test covers ammo,
                           missiles, spears, daggers & knives */
                        if (!objects[obj.otyp].oc_merge)
                            wornmask = 0;
                    } else if (obj.oclass === GEM_CLASS) {
                        /* possibly ought to check whether
                           alternate weapon is a sling... */
                        if (!uslinging())
                            wornmask = 0;
                    } else {
                        /* weptools don't merge and aren't
                           reasonable quivered weapons */
                        wornmask = 0;
                    }
                }
            }
            if (sblessed || wornmask || obj.otyp === O.LOADSTONE
                /* this treats an in-use leash as a worn item but does not
                   do the same for lit lamp/candle [seems inconsistent] */
                || (obj.otyp === O.LEASH && obj.leashmon)) {
                /* water price varies by curse/bless status */
                const shop_h2o = (obj.unpaid && obj.otyp === O.POT_WATER);

                if (confused) {
                    blessorcurse(obj, 2);
                    /* lose knowledge of this object's curse/bless
                       state (even if it didn't actually change) */
                    obj.bknown = 0;
                    /* blessorcurse() only affects uncursed items
                       so no need to worry about price of water
                       going down (hence no costly_alteration) */
                    if (shop_h2o && (obj.cursed || obj.blessed))
                        throw new Error('seffect_remove_curse(): alter_cost() not ported yet');
                } else if (obj.cursed) {
                    if (shop_h2o)
                        costly_alteration(obj, COST_UNCURS);
                    uncurse(obj);
                    /* if the object was known to be cursed and is now
                       known not to be, make the scroll known; it's
                       trivial to identify anyway by comparing inventory
                       before and after */
                    if (obj.bknown && otyp === O.SCR_REMOVE_CURSE)
                        learnscrolltyp(O.SCR_REMOVE_CURSE);
                }
            }
        }
        /* if riding, treat steed's saddle as if part of hero's invent */
        if (u.usteed && (obj = which_armor(u.usteed, W_SADDLE)) != null)
            throw new Error('seffect_remove_curse(): steed saddle not ported yet');
    }
    if (Punished() && !confused)
        await unpunish();
    if (u.utrap && u.utraptype === TT_BURIEDBALL) {
        await buried_ball_to_freedom();
        await pline_The(`clasp on your ${body_part(LEG)} vanishes.`);
    }
    /* update_inventory(): no perm_invent */
}

/* C ref: wield.c uslinging() */
function uslinging() {
    return !!(game.uwep && game.uwep.otyp === O.SLING);
}

// C ref: read.c seffect_create_monster()
async function seffect_create_monster(sobjp) {
    const sobj = sobjp.obj;
    const sblessed = sobj.blessed;
    const scursed = sobj.cursed;
    const confused = Confusion();

    if (await create_critters(1 + ((confused || scursed) ? 12 : 0)
                              + ((sblessed || rn2(73)) ? 0 : rnd(4)),
                              confused ? mons[PM_ACID_BLOB] : null,
                              false))
        game.known = true;
    /* no need to flush monsters; we ask for identification only if the
     * monsters are not visible
     */
}

// C ref: makemon.c create_critters()
export async function create_critters(cnt,
                                      mptr, /* usually null; used for confused reading */
                                      neverask) {
    const u = game.u;
    const c = { x: 0, y: 0 };
    let x, y;
    let mon;
    let known = false;
    let ask = (!!game.flags?.debug && !neverask);

    while (cnt--) {
        if (ask) {
            if (await create_particular()) {
                known = true;
                continue;
            } else
                ask = false; /* ESC will shut off prompting */
        }
        x = u.ux, y = u.uy;
        /* if in water, try to encourage an aquatic monster
           by finding and then specifying another wet location */
        if (!mptr && u.uinwater && enexto(c, x, y, mons[PM_GIANT_EEL]))
            x = c.x, y = c.y;

        game.makemon_want_msg = true; /* see makemon()'s Norep() comment */
        try {
            mon = makemon(mptr, x, y, NO_MM_FLAGS);
        } finally {
            game.makemon_want_msg = false;
        }
        await makemon_flush_msg();
        if (mon == null)
            continue; /* try again [should probably stop instead] */

        if ((canseemon(mon) && (M_AP_TYPE(mon) === M_AP_NOTHING
                                || M_AP_TYPE(mon) === M_AP_MONSTER))
            || sensemon(mon))
            known = true;
    }
    void ask;
    return known;
}

// C ref: read.c seffect_enchant_weapon()
async function seffect_enchant_weapon(sobjp) {
    const g = game;
    const sobj = sobjp.obj;
    const sblessed = sobj.blessed;
    const scursed = sobj.cursed;
    const confused = Confusion();
    let old_erodeproof, new_erodeproof;
    const uwep = g.uwep;

    /* [What about twoweapon mode?  Proofing/repairing/enchanting both
       would be too powerful, but shouldn't we choose randomly between
       primary and secondary instead of always acting on primary?] */
    if (confused && uwep
        && erosion_matters(uwep) && uwep.oclass !== ARMOR_CLASS) {
        old_erodeproof = !!uwep.oerodeproof;
        new_erodeproof = !scursed;
        uwep.oerodeproof = 0; /* for messages */
        if (Blind()) {
            uwep.rknown = 0;
            await Your("weapon feels warm for a moment.");
        } else {
            uwep.rknown = 1;
            await pline(`${Yobjnam2(uwep, "are")} covered by a ${
                scursed ? "mottled" : "shimmering"} ${
                hcolor(scursed ? NH_PURPLE : NH_GOLDEN)} ${
                scursed ? "glow" : "shield"}!`);
        }
        if (new_erodeproof && (uwep.oeroded || uwep.oeroded2)) {
            uwep.oeroded = uwep.oeroded2 = 0;
            await pline(`${Yobjnam2(uwep, Blind() ? "feel" : "look")} as good as new!`);
        }
        if (old_erodeproof && !new_erodeproof) {
            /* restore old_erodeproof before shop charges */
            uwep.oerodeproof = 1;
            costly_alteration(uwep, COST_DEGRD);
        }
        uwep.oerodeproof = new_erodeproof ? 1 : 0;
        return;
    }
    const s = scursed ? -1
        : !uwep ? 1 /* guard further tests against null pointer */
          : (uwep.spe >= 9) ? ((rn2(uwep.spe) === 0) ? 1 : 0) /* usually 0, maybe  1 */
            : sblessed ? rnd(3 - Math.trunc(uwep.spe / 3)) /* >= 9 case prevents rnd(0) */
              : 1; /* uncursed */
    if (!(await chwepon(sobj, s)))
        sobjp.obj = null; /* nothing enchanted: strange_feeling -> useup */
    if (g.uwep)
        cap_spe(g.uwep);
}

// C ref: wield.c chwepon()
/* enchant wielded weapon */
export async function chwepon(otmp, amount) {
    const g = game;
    const color = hcolor((amount < 0) ? NH_BLACK : NH_BLUE);
    let xtime;
    let otyp = O.STRANGE_OBJECT;
    const uwep = g.uwep;

    if (!uwep || (uwep.oclass !== WEAPON_CLASS && !is_weptool(uwep))) {
        let buf;

        if (amount >= 0 && uwep && will_weld(uwep)) { /* cursed tin opener */
            if (!Blind()) {
                buf = `${Yobjnam2(uwep, "glow")} with ${an(hcolor(NH_AMBER))} aura.`;
                uwep.bknown = !Hallucination() ? 1 : 0; /* ok to bypass set_bknown() */
            } else {
                /* cursed tin opener is wielded in right hand */
                buf = `Your right ${body_part(HAND)} tingles.`;
            }
            uncurse(uwep);
            /* update_inventory(): no perm_invent */
        } else {
            buf = `Your ${makeplural(body_part(HAND))} ${
                (amount >= 0) ? "twitch" : "itch"}.`;
        }
        await strange_feeling(otmp, buf); /* pline()+docall()+useup() */
        await exercise(A_DEX, amount >= 0);
        return 0;
    }

    if (otmp && otmp.oclass === SCROLL_CLASS)
        otyp = otmp.otyp;

    if ((uwep.otyp === O.WORM_TOOTH && amount >= 0)
        || (uwep.otyp === O.CRYSKNIFE && amount < 0))
        throw new Error('chwepon(): worm tooth/crysknife transformation not ported yet');

    let wepname = "";
    if (has_oname(uwep))
        wepname = ONAME(uwep);
    if (amount < 0 && uwep.oartifact && restrict_name(uwep, wepname)) {
        if (!Blind())
            await pline(`${Yobjnam2(uwep, "faintly glow")} ${color}.`);
        return 1;
    }
    /* there is a (soft) upper and lower limit to uwep->spe */
    if (((uwep.spe > 5 && amount >= 0) || (uwep.spe < -5 && amount < 0))
        && rn2(3)) {
        if (!Blind())
            await pline(`${Yobjnam2(uwep, "violently glow")} ${color} for a while and then ${
                otense(uwep, "evaporate")}.`);
        else
            await pline(`${Yobjnam2(uwep, "evaporate")}.`);

        useupall(uwep); /* let all of them disappear */
        return 1;
    }
    if (!Blind()) {
        xtime = (amount * amount === 1) ? "moment" : "while";
        await pline(`${Yobjnam2(uwep, amount === 0 ? "violently glow" : "glow")} ${
            color} for a ${xtime}.`);
        if (otyp !== O.STRANGE_OBJECT && uwep.known
            && (amount > 0 || (amount < 0 && otmp.bknown)))
            makeknown(otyp);
    }
    if (amount < 0)
        costly_alteration(uwep, COST_DECHNT);
    uwep.spe += amount;
    if (amount > 0) {
        if (uwep.cursed)
            uncurse(uwep);
        /* update shop bill to reflect new higher price */
        if (uwep.unpaid)
            throw new Error('chwepon(): alter_cost() not ported yet');
    }

    /*
     * Enchantment, which normally improves a weapon, has an
     * additional adverse reaction on Magicbane whose effects are
     * spe dependent.  Give an obscure clue here.
     */
    if (is_art(uwep, ART_MAGICBANE) && uwep.spe >= 0) {
        await Your(`right ${body_part(HAND)} ${
            ((amount > 1) && (uwep.spe > 1)) ? "flin" : "it"}ches!`);
    }

    /* an elven magic clue, cookie@keebler */
    /* elven weapons vibrate warningly when enchanted beyond a limit */
    if ((uwep.spe > 5)
        && (is_elven_weapon(uwep) || uwep.oartifact || !rn2(7)))
        await pline(`${Yobjnam2(uwep, "suddenly vibrate")} unexpectedly.`);

    return 1;
}

/* C ref: obj.h is_elven_weapon() */
function is_elven_weapon(otmp) {
    return otmp.otyp === O.ELVEN_ARROW || otmp.otyp === O.ELVEN_SPEAR
           || otmp.otyp === O.ELVEN_DAGGER || otmp.otyp === O.ELVEN_SHORT_SWORD
           || otmp.otyp === O.ELVEN_BROADSWORD || otmp.otyp === O.ELVEN_BOW;
}

// C ref: read.c seffect_taming()
async function seffect_taming(sobjp) {
    const g = game, u = g.u;
    const sobj = sobjp.obj;
    const confused = Confusion();
    let candidates, res, results, vis_results;

    if (u.uswallow) {
        candidates = 1;
        results = vis_results = await maybe_tame(u.ustuck, sobj);
    } else {
        let i, j;
        const bd = confused ? 5 : 1;
        let mtmp;

        /* note: maybe_tame() can return either positive or
           negative values, but not both for the same scroll */
        candidates = results = vis_results = 0;
        for (i = -bd; i <= bd; i++)
            for (j = -bd; j <= bd; j++) {
                if (!isok(u.ux + i, u.uy + j))
                    continue;
                if ((mtmp = m_at(u.ux + i, u.uy + j)) != null
                    || (!i && !j && (mtmp = u.usteed) != null)) {
                    ++candidates;
                    res = await maybe_tame(mtmp, sobj);
                    results += res;
                    if (canspotmon(mtmp))
                        vis_results += res;
                }
            }
    }
    if (!results) {
        await pline(`Nothing interesting ${!candidates ? "happens" : "seems to happen"}.`);
    } else {
        await pline_The(`neighborhood ${vis_results ? "is" : "seems"} ${
            (results < 0) ? "un" : ""}friendlier.`);
        if (vis_results > 0)
            g.known = true;
    }
}

// C ref: read.c seffect_genocide()
async function seffect_genocide(sobjp) {
    const sobj = sobjp.obj;
    const otyp = sobj.otyp;
    const sblessed = sobj.blessed;
    const scursed = sobj.cursed;
    const already_known = (sobj.oclass === SPBOOK_CLASS /* spell */
                           || objects[otyp].oc_name_known);

    if (!already_known)
        await You("have found a scroll of genocide!");
    game.known = true;
    if (sblessed)
        throw new Error('seffect_genocide(): do_class_genocide() not ported yet');
    else
        throw new Error(`seffect_genocide(): do_genocide(${(!scursed ? 1 : 0)
                                                             | (2 * (Confusion() ? 1 : 0))}) not ported yet`);
}

// C ref: read.c seffect_light()
async function seffect_light(sobjp) {
    const g = game, u = g.u;
    const sobj = sobjp.obj;
    const sblessed = sobj.blessed;
    const scursed = sobj.cursed;
    const confused = Confusion();

    if (!confused) {
        if (!Blind())
            g.known = true;
        await litroom(!scursed, sobj);
        if (!scursed) {
            if (await lightdamage(sobj, true, 5))
                g.known = true;
        }
    } else {
        const pm = scursed ? PM_BLACK_LIGHT : PM_YELLOW_LIGHT;

        if ((g.mvitals[pm].mvflags & G_GONE)) {
            await pline("Tiny lights sparkle in the air momentarily.");
        } else {
            /* surround with cancelled tame lights which won't explode */
            let mon;
            let sawlights = false;
            let i;
            const numlights = rn1(2, 3) + (sblessed ? 2 : 0);

            for (i = 0; i < numlights; ++i) {
                mon = await makemon(mons[pm], u.ux, u.uy,
                                    MM_EDOG | NO_MINVENT | MM_NOMSG);
                if (mon) {
                    initedog(mon, true);
                    mon.msleeping = 0;
                    mon.mcan = 1;
                    if (canspotmon(mon))
                        sawlights = true;
                    newsym(mon.mx, mon.my);
                }
            }
            if (sawlights) {
                await pline("Lights appear all around you!");
                g.known = true;
            }
        }
    }
}

// C ref: zap.c lightdamage() -- light shining on a hero polymorphed
// into a gremlin; a hero in normal form takes no damage
export async function lightdamage(obj, ordinary, amt) {
    void obj, ordinary, amt;
    if (game.youmonst.data === mons[PM_GREMLIN])
        throw new Error('lightdamage(): light hurting a gremlin hero not ported yet');
    return false;
}

// C ref: read.c seffect_charging()
async function seffect_charging(sobjp) {
    const g = game, u = g.u;
    const sobj = sobjp.obj;
    const otyp = sobj.otyp;
    const sblessed = sobj.blessed;
    const scursed = sobj.cursed;
    const confused = Confusion();
    const already_known = (sobj.oclass === SPBOOK_CLASS /* spell */
                           || objects[otyp].oc_name_known);

    if (confused) {
        if (scursed) {
            await You_feel("discharged.");
            u.uen = 0;
        } else {
            await You_feel("charged up!");
            u.uen += d(sblessed ? 6 : 4, 4);
            if (u.uen > u.uenmax) /* if current energy is already at   */
                u.uenmax = u.uen; /* or near maximum, increase maximum */
            else
                u.uen = u.uenmax; /* otherwise restore current to max  */
        }
        g.disp_botl = true;
        return;
    }
    /* known = TRUE; -- handled inline here */
    if (!already_known) {
        await pline("This is a charging scroll.");
        learnscroll(sobj);
    }
    /* use it up now to prevent it from showing in the
       getobj picklist because the "disappears" message
       was already delivered */
    useup(sobj);
    sobjp.obj = null; /* it's gone */
    const otmp = await getobj("charge", charge_ok, GETOBJ_PROMPT | GETOBJ_ALLOWCNT);
    if (otmp)
        await recharge(otmp, scursed ? -1 : sblessed ? 1 : 0);
}

// C ref: read.c seffect_amnesia()
async function seffect_amnesia(sobjp) {
    const g = game;
    const sobj = sobjp.obj;
    const sblessed = sobj.blessed;

    g.known = true;
    await forget((!sblessed ? ALL_SPELLS : 0));
    if (Hallucination()) /* Ommmmmm! */
        await Your("mind releases itself from mundane concerns.");
    else if (!strncmpi(g.plname || '', "Maud", 4))
        await pline("As your mind turns inward on itself, you forget everything else.");
    else if (rn2(2))
        await pline("Who was that Maud person anyway?");
    else
        await pline("Thinking of Maud you forget everything else.");
    await exercise(A_WIS, false);
}

// C ref: read.c seffect_fire()
async function seffect_fire(sobjp) {
    const u = game.u;
    const sobj = sobjp.obj;
    const otyp = sobj.otyp;
    const sblessed = sobj.blessed;
    const confused = Confusion();
    const already_known = (sobj.oclass === SPBOOK_CLASS /* spell */
                           || objects[otyp].oc_name_known);
    const cc = { x: u.ux, y: u.uy };

    const cval = bcsign(sobj);
    let dam = Math.trunc((2 * (rn1(3, 3) + 2 * cval) + 1) / 3);
    useup(sobj);
    sobjp.obj = null; /* it's gone */
    if (!already_known)
        learnscrolltyp(O.SCR_FIRE);
    if (confused) {
        if (Underwater()) {
            await pline(`A little ${hliquid("water")} around you vaporizes.`);
        } else if (Fire_resistance()) {
            /* shieldeff(u.ux, u.uy): transient display only */
            monstseesu_rd(M_SEEN_FIRE);
            if (!Blind())
                await pline(`Oh, look, what a pretty fire in your ${
                    makeplural(body_part(HAND))}.`);
            else
                await You_feel(`a pleasant warmth in your ${makeplural(body_part(HAND))}.`);
        } else {
            monstunseesu_rd(M_SEEN_FIRE);
            await pline_The(`scroll catches fire and you burn your ${
                makeplural(body_part(HAND))}.`);
            await losehp(1, "scroll of fire", KILLED_BY_AN);
        }
        return;
    }
    if (Underwater()) {
        await pline_The(`${hliquid("water")} around you vaporizes violently!`);
    } else {
        if (sblessed) {
            if (!already_known)
                await pline("This is a scroll of fire!");
            dam *= 5;
            await pline("Where do you want to center the explosion?");
            await getpos_sethilite(display_stinking_cloud_positions,
                                   can_center_cloud);
            await getpos(cc, true, "the desired position");
            if (!can_center_cloud(cc.x, cc.y)) {
                /* try to reach too far, get burned */
                cc.x = u.ux;
                cc.y = u.uy;
            }
        }
        if (u_at(cc.x, cc.y)) {
            await pline_The("scroll erupts in a tower of flame!");
            game.iflags.last_msg = PLNMSG_TOWER_OF_FLAME; /* for explode() */
            await burn_away_slime();
        }
    }
    const ZT_SPELL_O_FIRE = 11; /* explained in splatter_burning_oil(explode.c) */
    await explode_rd(cc.x, cc.y, ZT_SPELL_O_FIRE, dam, O.SCROLL_CLASS, EXPL_FIERY_RD);
}
const PLNMSG_TOWER_OF_FLAME = 3; /* C ref: hack.h enum plnmsg_types */

// C ref: read.c seffect_earth()
async function seffect_earth(sobjp) {
    const g = game, u = g.u;
    const sobj = sobjp.obj;
    const sblessed = sobj.blessed;
    const scursed = sobj.cursed;
    const confused = Confusion();

    /* TODO: handle steeds */
    if (!Is_rogue_level(u.uz) && has_ceiling(u.uz)
        && (!In_endgame(u.uz) || Is_earthlevel(u.uz))) {
        let x, y;
        let nboulders = 0;

        /* Identify the scroll */
        if (u.uswallow) {
            await You_hear("rumbling.");
        } else {
            if (!avoid_ceiling_rd(u.uz)) {
                await pline_The(`${ceiling_rd(u.ux, u.uy)} rumbles ${
                    sblessed ? "around" : "above"} you!`);
            } else {
                const avalanche = "avalanche";
                const matbuf = sblessed ? makeplural(avalanche) : an(avalanche);

                await pline(`${upstart(matbuf)} of boulders ${
                    vtense(matbuf, "materialize")} ${sblessed ? "around" : "above"} you!`);
            }
        }
        g.known = true;
        sokoban_guilt();

        /* Loop through the surrounding squares */
        if (!scursed)
            for (x = u.ux - 1; x <= u.ux + 1; x++) {
                for (y = u.uy - 1; y <= u.uy + 1; y++) {
                    /* Is this a suitable spot? */
                    if (isok(x, y) && !closed_door(x, y)
                        && !IS_OBSTRUCTED(g.level.at(x, y).typ)
                        && !IS_AIR(g.level.at(x, y).typ)
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
            await pline("But nothing else happens.");
    }
}

// C ref: read.c seffect_punishment()
async function seffect_punishment(sobjp) {
    const sobj = sobjp.obj;
    const sblessed = sobj.blessed;
    const confused = Confusion();

    game.known = true;
    if (confused || sblessed) {
        await You_feel("guilty.");
        return;
    }
    await punish(sobj);
}

// C ref: read.c seffect_stinking_cloud()
async function seffect_stinking_cloud(sobjp) {
    const sobj = sobjp.obj;
    const otyp = sobj.otyp;
    const already_known = (sobj.oclass === SPBOOK_CLASS /* spell */
                           || objects[otyp].oc_name_known);

    if (!already_known)
        await You("have found a scroll of stinking cloud!");
    game.known = true;
    await do_stinking_cloud(sobj, already_known);
}

// C ref: read.c seffect_blank_paper()
async function seffect_blank_paper(sobjp) {
    void sobjp;
    if (Blind())
        await You("don't remember there being any magic words on this scroll.");
    else
        await pline("This scroll seems to be blank.");
    game.known = true;
}

// C ref: read.c seffect_teleportation()
async function seffect_teleportation(sobjp) {
    const sobj = sobjp.obj;
    const scursed = sobj.cursed;
    const confused = Confusion();

    if (confused || scursed) {
        await level_tele();
        /* gives "materialize on different/same level!" message, must
           be a teleport scroll */
        game.known = true;
    } else {
        await scrolltele(sobj);
        /* this will call learnscroll() as appropriate, and has results
           which maybe shouldn't result in the scroll becoming known;
           either way, no need to set gk.known here */
    }
}

// C ref: read.c seffect_gold_detection()
async function seffect_gold_detection(sobjp) {
    const sobj = sobjp.obj;
    const scursed = sobj.cursed;
    const confused = Confusion();

    if ((confused || scursed) ? (await trap_detect(sobj)) : (await gold_detect(sobj)))
        sobjp.obj = null; /* failure: strange_feeling() -> useup() */
}

// C ref: read.c seffect_food_detection()
async function seffect_food_detection(sobjp) {
    const sobj = sobjp.obj;

    if (await food_detect(sobj))
        sobjp.obj = null; /* nothing detected: strange_feeling -> useup */
}

// C ref: read.c seffect_identify()
async function seffect_identify(sobjp) {
    const g = game;
    const sobj = sobjp.obj;
    const otyp = sobj.otyp;
    const is_scroll = (sobj.oclass === SCROLL_CLASS);
    const sblessed = sobj.blessed;
    const scursed = sobj.cursed;
    const confused = Confusion();
    const already_known = (sobj.oclass === SPBOOK_CLASS /* spell */
                           || objects[otyp].oc_name_known);

    if (is_scroll) { /* scroll of identify */
        /* known = TRUE; -- handled inline here */
        /* use up the scroll first, before learnscrolltyp() -> makeknown()
           performs perm_invent update; also simplifies empty invent check */
        useup(sobj);
        sobjp.obj = null; /* it's gone */
        /* scroll just identifies itself for any scroll read while confused
           or for cursed scroll read without knowing identify yet */
        if (confused || (scursed && !already_known))
            await You("identify this as an identify scroll.");
        else if (!already_known)
            await pline("This is an identify scroll.");
        if (!already_known)
            learnscrolltyp(O.SCR_IDENTIFY);
        if (confused || (scursed && !already_known))
            return;
    }

    if (g.invent) {
        let cval = 1;
        if (sblessed || (!scursed && !rn2(5))) {
            cval = rn2(5);
            /* note: if cval==0, identify all items */
            if (cval === 1 && sblessed && Luck() > 0)
                ++cval;
        }
        await identify_pack(cval, !already_known);
    } else {
        /* spell cast with inventory empty or scroll read when it's
           the only item leaving empty inventory after being used up */
        await pline(`You're not carrying anything${(is_scroll) ? " else" : ""} to be identified.`);
    }
}

// C ref: read.c seffect_magic_mapping()
async function seffect_magic_mapping(sobjp) {
    const g = game;
    const sobj = sobjp.obj;
    const is_scroll = (sobj.oclass === SCROLL_CLASS);
    const sblessed = sobj.blessed;
    const scursed = sobj.cursed;
    const confused = Confusion();

    if (is_scroll) {
        if (g.level.flags.nommap) {
            await Your("mind is filled with crazy lines!");
            if (Hallucination())
                await pline("Wow!  Modern art.");
            else
                await Your(`${body_part(HEAD)} spins in bewilderment.`);
            await make_confused(HConfusion() + rnd(30), false);
            return;
        }
        if (sblessed) {
            let x, y;

            for (x = 1; x < COLNO; x++)
                for (y = 0; y < ROWNO; y++)
                    if (g.level.at(x, y).typ === SDOOR_RD) {
                        cvt_sdoor_to_door(g.level.at(x, y));
                        if (Is_rogue_level(g.u.uz))
                            unblock_point(x, y);
                    }
            /* do_mapping() already reveals secret passages */
        }
        g.known = true;
    }

    if (g.level.flags.nommap) {
        await Your(`${body_part(HEAD)} spins as something blocks the spell!`);
        await make_confused(HConfusion() + rnd(30), false);
        return;
    }
    await pline("A map coalesces in your mind!");
    const cval = (scursed && !confused);
    if (cval)
        g.u.uprops[CONFUSION].intrinsic = 1; /* to screw up map */
    g.notice_mon_off = true; /* notice_mon_off() */
    await do_mapping();
    g.notice_mon_off = false; /* notice_mon_on() */
    if (cval) {
        g.u.uprops[CONFUSION].intrinsic = 0; /* restore */
        await pline("Unfortunately, you can't grasp the details.");
    }
}

// C ref: read.c seffect_mail()
async function seffect_mail(sobjp) {
    const sobj = sobjp.obj;
    const odd = (sobj.o_id % 2) === 1;

    game.known = true;
    switch (sobj.spe) {
    case 2:
        /* "stamped scroll" created via magic marker--without a stamp */
        await pline(`This scroll is marked "${odd ? "Postage Due" : "Return to Sender"}".`);
        break;
    case 1:
        /* scroll of mail obtained from bones file or from wishing;
           note to the puzzled: the game Larn actually sends you junk
           mail if you win! */
        await pline(`This seems to be ${odd ? "a chain letter threatening your luck"
                                            : "junk mail addressed to the finder of the Eye of Larn"}.`);
        break;
    default:
        throw new Error('seffect_mail(): readmail() not ported yet');
    }
}

// C ref: read.c seffects()
/* scroll effects; return 1 if we use up the scroll and possibly make it
   become discovered, 0 if caller should take care of those side-effects */
export async function seffects(sobj) { /* sobj - scroll or fake spellbook for spell */
    const otyp = sobj.otyp;
    const sobjp = { obj: sobj }; /* C passes &sobj */

    if (objects[otyp].oc_magic)
        await exercise(A_WIS, true); /* just for trying */

    switch (otyp) {
    case O.SCR_MAIL:
        await seffect_mail(sobjp);
        break;
    case O.SCR_ENCHANT_ARMOR:
        await seffect_enchant_armor(sobjp);
        break;
    case O.SCR_DESTROY_ARMOR:
        await seffect_destroy_armor(sobjp);
        break;
    case O.SCR_CONFUSE_MONSTER:
    case O.SPE_CONFUSE_MONSTER:
        await seffect_confuse_monster(sobjp);
        break;
    case O.SCR_SCARE_MONSTER:
    case O.SPE_CAUSE_FEAR:
        await seffect_scare_monster(sobjp);
        break;
    case O.SCR_BLANK_PAPER:
        await seffect_blank_paper(sobjp);
        break;
    case O.SCR_REMOVE_CURSE:
    case O.SPE_REMOVE_CURSE:
        await seffect_remove_curse(sobjp);
        break;
    case O.SCR_CREATE_MONSTER:
    case O.SPE_CREATE_MONSTER:
        await seffect_create_monster(sobjp);
        break;
    case O.SCR_ENCHANT_WEAPON:
        await seffect_enchant_weapon(sobjp);
        break;
    case O.SCR_TAMING:
    case O.SPE_CHARM_MONSTER:
        await seffect_taming(sobjp);
        break;
    case O.SCR_GENOCIDE:
        await seffect_genocide(sobjp);
        break;
    case O.SCR_LIGHT:
        await seffect_light(sobjp);
        break;
    case O.SCR_TELEPORTATION:
        await seffect_teleportation(sobjp);
        break;
    case O.SCR_GOLD_DETECTION:
        await seffect_gold_detection(sobjp);
        break;
    case O.SCR_FOOD_DETECTION:
    case O.SPE_DETECT_FOOD:
        await seffect_food_detection(sobjp);
        break;
    case O.SCR_IDENTIFY:
    case O.SPE_IDENTIFY:
        await seffect_identify(sobjp);
        break;
    case O.SCR_CHARGING:
        await seffect_charging(sobjp);
        break;
    case O.SCR_MAGIC_MAPPING:
    case O.SPE_MAGIC_MAPPING:
        await seffect_magic_mapping(sobjp);
        break;
    case O.SCR_AMNESIA:
        await seffect_amnesia(sobjp);
        break;
    case O.SCR_FIRE:
        await seffect_fire(sobjp);
        break;
    case O.SCR_EARTH:
        await seffect_earth(sobjp);
        break;
    case O.SCR_PUNISHMENT:
        await seffect_punishment(sobjp);
        break;
    case O.SCR_STINKING_CLOUD:
        await seffect_stinking_cloud(sobjp);
        break;
    default:
        console.error(`impossible: What weird effect is this? (${otyp})`);
    }
    /* if sobj is gone, we've already called useup() above and the
       update_inventory() that it performs might have come too soon
       (before charging an item, for instance) */
    /* if (!sobj) update_inventory(): no perm_invent */
    return sobjp.obj ? 0 : 1;
}

// C ref: read.c drop_boulder_on_player()
export async function drop_boulder_on_player(confused, helmet_protects, byu,
                                             skip_uswallow) {
    const g = game, u = g.u;
    let dmg;

    /* hit monster if swallowed */
    if (u.uswallow && !skip_uswallow) {
        await drop_boulder_on_monster(u.ux, u.uy, confused, byu);
        return;
    }

    const otmp2 = mksobj(confused ? O.ROCK : O.BOULDER, false, false);
    if (!otmp2)
        return;
    otmp2.quan = confused ? rn1(5, 2) : 1;
    otmp2.owt = weight(otmp2);
    if (!amorphous(g.youmonst.data) && !Passes_walls()
        && !noncorporeal(g.youmonst.data) && !unsolid(g.youmonst.data)) {
        await You(`are hit by ${doname(otmp2)}!`);
        dmg = Math.trunc(dmgval(otmp2, g.youmonst) * otmp2.quan);
        if (g.uarmh && helmet_protects) {
            if (hard_helmet(g.uarmh)) {
                await pline("Fortunately, you are wearing a hard helmet.");
                if (dmg > 2)
                    dmg = 2;
            } else if (g.flags.verbose) {
                await pline(`${Yname2(g.uarmh)} does not protect you.`);
            }
        }
    } else
        dmg = 0;
    await wake_nearto(u.ux, u.uy, 4 * 4);
    /* Must be before the losehp(), for bones files */
    if (!(await flooreffects(otmp2, u.ux, u.uy, "fall"))) {
        place_object_rd(otmp2, u.ux, u.uy);
        stackobj(otmp2);
        newsym(u.ux, u.uy);
    }
    if (dmg)
        await losehp(Maybe_Half_Phys(dmg), "scroll of earth", KILLED_BY_AN);
}

// C ref: read.c drop_boulder_on_monster()
export async function drop_boulder_on_monster(x, y, confused, byu) {
    /* Make the object(s) */
    const otmp2 = mksobj(confused ? O.ROCK : O.BOULDER, false, false);
    if (!otmp2)
        return false; /* Shouldn't happen */
    otmp2.quan = confused ? rn1(5, 2) : 1;
    otmp2.owt = weight(otmp2);

    /* Find the monster here (won't be player) */
    const mtmp = m_at(x, y);
    if (mtmp && !amorphous(mtmp.data) && !passes_walls(mtmp.data)
        && !noncorporeal(mtmp.data) && !unsolid(mtmp.data)) {
        const helmet = which_armor(mtmp, W_ARMH_RD);
        let mdmg;

        if (cansee(mtmp.mx, mtmp.my)) {
            await pline(`${Monnam(mtmp)} is hit by ${doname(otmp2)}!`);
            if (mtmp.minvis && !canspotmon(mtmp))
                map_invisible(mtmp.mx, mtmp.my);
        } else if (game.u.uswallow && mtmp === game.u.ustuck) { /* engulfing_u() */
            throw new Error('drop_boulder_on_monster(): "You hear something hit" (engulfer) not ported yet');
        }

        mdmg = dmgval(otmp2, mtmp) * otmp2.quan;
        if (helmet) {
            if (hard_helmet(helmet)) {
                if (canspotmon(mtmp))
                    await pline(`Fortunately, ${mon_nam(mtmp)} is wearing a hard helmet.`);
                else if (!Deaf())
                    await You_hear("a clanging sound.");
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
    } else if (game.u.uswallow && mtmp === game.u.ustuck) { /* engulfing_u() */
        obfree(otmp2, null);
        /* fall through to player */
        await drop_boulder_on_player(confused, true, false, true);
        return true;
    }
    /* Drop the rock/boulder to the floor */
    if (!(await flooreffects(otmp2, x, y, "fall"))) {
        place_object_rd(otmp2, x, y);
        stackobj(otmp2);
        newsym(x, y); /* map the rock */
    }
    return true;
}

// C ref: read.c set_lit() -- low-level lit-field update routine
function set_lit(x, y, val) {
    const lev = game.level.at(x, y);
    let mtmp;

    if (val) {
        lev.lit = 1;
        if ((mtmp = m_at(x, y)) != null && mtmp.data === mons[PM_GREMLIN])
            game.gremlins_rd.push(mtmp);
    } else {
        lev.lit = 0;
        snuff_light_source(x, y);
    }
}

// C ref: read.c litroom()
export async function litroom(on, /* True: make nearby area lit; False: cursed scroll */
                              obj) { /* scroll, spellbook (for spell), or wand of light */
    const g = game, u = g.u;
    let otmp, nextobj;
    const blessed_effect = !!(obj && obj.oclass === SCROLL_CLASS
                              && obj.blessed);
    const no_op = !!(u.uswallow || Underwater() || Is_waterlevel(u.uz));
    const is_lit = {}; /* value is irrelevant; it's a 'not null' flag for set_lit() */

    /* update object lights and produce message (provided you're not blind) */
    if (!on) {
        let still_lit = 0;

        /*
         * The magic douses lamps,&c too and might curse artifact lights.
         *
         * FIXME?
         *  Shouldn't this affect all lit objects in the area of effect
         *  rather than just those carried by the hero?
         */
        for (otmp = g.invent; otmp; otmp = nextobj) {
            nextobj = otmp.nobj;
            if (otmp.lamplit)
                throw new Error('litroom(): snuff_lit()/impact_arti_light() not ported yet');
        }
        /* scroll of light becomes discovered when not blind, so some
           message to justify that is needed */
        if (!Blind()) {
            /* for the still_lit case, we don't know at this point whether
               anything currently visibly lit is going to go dark; if this
               message came after the darkening, we could count visibly
               lit squares before and after to know; we do know that being
               swallowed won't be affected--the interior is still lit */
            if (still_lit)
                await pline_The("ambient light seems dimmer.");
            else if (u.uswallow)
                await pline("It seems even darker in here than before.");
            else
                await You("are surrounded by darkness!");
        }
    } else { /* on */
        if (blessed_effect) {
            /* might bless artifact lights; no effect on ordinary lights */
            for (otmp = g.invent; otmp; otmp = nextobj) {
                nextobj = otmp.nobj;
                if (otmp.lamplit && otmp.oartifact)
                    throw new Error('litroom(): impact_arti_light() not ported yet');
            }
        }
        if (u.uswallow) {
            if (Blind())
                ; /* no feedback */
            else
                throw new Error('litroom(): engulfer lit messages not ported yet');
        } else if (!Blind() && (!Is_rogue_level(u.uz)
                                || g.level.at(u.ux, u.uy).typ !== CORR_RD)) {
            await pline(`A lit field ${no_op ? "briefly " : ""}surrounds you!`);
        }
    }

    /* No-op when swallowed or in water */
    if (no_op)
        return;
    /*
     *  If we are darkening the room and the hero is punished but not
     *  blind, then we have to pick up and replace the ball and chain so
     *  that we don't remember them if they are out of sight.
     */
    if (Punished() && !on && !Blind())
        move_bc(1, 0, g.uball.ox, g.uball.oy, g.uchain.ox, g.uchain.oy);

    g.gremlins_rd = [];
    if (Is_rogue_level(u.uz)) {
        throw new Error('litroom(): rogue level lighting not ported yet');
    } else if (is_art(obj, ART_SUNSWORD)) {
        /* Sunsword's #invoke power directed up or down lights hero's spot
           (do_clear_area() rejects radius 0 so call set_lit() directly) */
        set_lit(u.ux, u.uy, is_lit);
    } else {
        do_clear_area(u.ux, u.uy, blessed_effect ? 9 : 5,
                      set_lit, on ? is_lit : null);
    }

    /*
     *  If we are not blind, then force a redraw on all positions in sight
     *  by temporarily blinding the hero.  The vision recalculation will
     *  correctly update all previously seen positions *and* correctly
     *  set the waslit bit [could be messed up from above].
     */
    if (!Blind()) {
        vision_recalc(2);

        /* replace ball&chain */
        if (Punished() && !on)
            move_bc(0, 0, g.uball.ox, g.uball.oy, g.uchain.ox, g.uchain.oy);
    }

    g.vision_full_recalc = 1; /* delayed vision recalculation */
    if (g.gremlins_rd.length) {
        /* can't delay vision recalc after all */
        vision_recalc(0);
        /* after vision has been updated, monsters who are affected
           when hit by light can now be hit by it */
        do { /* C's list is newest first */
            const gremlin = g.gremlins_rd.pop();
            await light_hits_gremlin(gremlin, rnd(5));
        } while (g.gremlins_rd.length);
    }
    return;
}

// C ref: read.c punish()
export async function punish(sobj) {
    const g = game, u = g.u;
    /* angrygods() calls this with NULL sobj arg */
    const reuse_ball = (sobj && sobj.otyp === O.HEAVY_IRON_BALL) ? sobj : null;
    /* analyzer doesn't know that the one caller that passes a NULL
     * sobj (angrygods) checks !Punished first, so add a guard */
    const cursed_levy = (sobj && sobj.cursed) ? 1 : 0;

    /* KMH -- Punishment is still okay when you are riding */
    if (!reuse_ball)
        await You("are being punished for your misbehavior!");
    if (Punished()) {
        await Your("iron ball gets heavier.");
        g.uball.owt += WT_IRON_BALL_INCR * (1 + cursed_levy);
        return;
    }
    if (amorphous(g.youmonst.data) || is_whirly(g.youmonst.data)
        || unsolid(g.youmonst.data)) {
        if (!reuse_ball) {
            await pline("A ball and chain appears, then falls away.");
            await dropy(mkobj(BALL_CLASS, true));
        } else {
            await dropy(reuse_ball);
        }
        return;
    }
    setworn(mkobj(CHAIN_CLASS, true), W_CHAIN);
    if (!reuse_ball)
        setworn(mkobj(BALL_CLASS, true), W_BALL);
    else
        setworn(reuse_ball, W_BALL);

    /*
     *  Place ball & chain if not swallowed.  If swallowed, the ball & chain
     *  variables will be set at the next call to placebc().
     */
    if (!u.uswallow) {
        await placebc();
        if (Blind())
            set_bc(1);      /* set up ball and chain variables */
        newsym(u.ux, u.uy); /* see ball&chain if can't see self */
    }
}

// C ref: read.c unpunish() -- remove the ball and chain
export async function unpunish() {
    const g = game;
    const savechain = g.uchain;

    /* chain goes away */
    setworn(null, W_CHAIN); /* sets 'uchain' to Null */
    /* for floor, unhides monster hidden under chain, calls newsym() */
    delobj_rd(savechain);

    /* the chain is gone but the no longer attached ball persists */
    setworn(null, W_BALL); /* sets 'uball' to Null */
}

// C ref: read.c do_stinking_cloud()
/* prompt the player to create a stinking cloud and then create it if they
   give a location */
async function do_stinking_cloud(sobj, mention_stinking) {
    const u = game.u;
    const cc = { x: u.ux, y: u.uy };

    await pline(`Where do you want to center the ${mention_stinking ? "stinking " : ""}cloud?`);
    await getpos_sethilite(display_stinking_cloud_positions, can_center_cloud);
    if ((await getpos(cc, true, "the desired position")) < 0) {
        await pline(Never_mind);
        return;
    } else if (!can_center_cloud(cc.x, cc.y)) {
        if (Hallucination())
            await pline("Ugh... someone cut the cheese.");
        else
            await pline(`${sobj.oclass === SCROLL_CLASS ? "The scroll crumbles with"
                                                       : "You smell"} a whiff of rotten eggs.`);
        return;
    }
    await create_gas_cloud(cc.x, cc.y, 15 + 10 * bcsign(sobj),
                           8 + 4 * bcsign(sobj));
}

/* C ref: detect.c -- the detection routines (detect.js) */

/* C ref: read.c tshirt_text() shirt_msgs[], hawaiian_motif()
   hawaiian_motifs[], hawaiian_design() hawaiian_bgs[], apron_text()
   apron_msgs[] */
const shirt_msgs = [
    "I explored the Dungeons of Doom and all I got was this lousy T-shirt!",
    "Is that Mjollnir in your pocket or are you just happy to see me?",
    "It's not the size of your sword, it's how #enhance'd you are with it.",
    "Madame Elvira's House O' Succubi Lifetime Customer",
    "Madame Elvira's House O' Succubi Employee of the Month",
    "Ludios Vault Guards Do It In Small, Dark Rooms",
    "Yendor Military Soldiers Do It In Large Groups",
    "I survived Yendor Military Boot Camp",
    "Ludios Accounting School Intra-Mural Lacrosse Team",
    "Oracle(TM) Fountains 10th Annual Wet T-Shirt Contest",
    "Hey, black dragon!  Disintegrate THIS!",
    "I'm With Stupid -->",
    "Don't blame me, I voted for Izchak!",
    "Don't Panic",
    "Furinkan High School Athletic Dept.",
    "Hel-LOOO, Nurse!",
    "=^.^=",
    "100% goblin hair - do not wash",
    "Aberzombie and Fitch",
    "cK -- Cockatrice touches the Kop",
    "Don't ask me, I only adventure here",
    "Down with pants!",
    "d, your dog or a killer?",
    "FREE PUG AND NEWT!",
    "Go team ant!",
    "Got newt?",
    "Hello, my darlings!",
    "Hey!  Nymphs!  Steal This T-Shirt!",
    "I <3 Dungeon of Doom",
    "I <3 Maud",
    "I am a Valkyrie.  If you see me running, try to keep up.",
    "I am not a pack rat - I am a collector",
    "I bounced off a rubber tree",
    "Plunder Island Brimstone Beach Club",
    "If you can read this, I can hit you with my polearm",
    "I'm confused!",
    "I scored with the princess",
    "I want to live forever or die in the attempt.",
    "Lichen Park",
    "LOST IN THOUGHT - please send search party",
    "Meat is Mordor",
    "Minetown Better Business Bureau",
    "Minetown Watch",
    "Ms. Palm's House of Negotiable Affection--A Very Reputable House Of Disrepute",
    "Protection Racketeer",
    "Real men love Crom",
    "Somebody stole my Mojo!",
    "The Hellhound Gang",
    "The Werewolves",
    "They Might Be Storm Giants",
    "Weapons don't kill people, I kill people",
    "White Zombie",
    "You're killing me!",
    "Anhur State University - Home of the Fighting Fire Ants!",
    "FREE HUGS",
    "Serial Ascender",
    "Real men are valkyries",
    "Young Men's Cavedigging Association",
    "Occupy Fort Ludios",
    "I couldn't afford this T-shirt so I stole it!",
    "Mind flayers suck",
    "I'm not wearing any pants",
    "Down with the living!",
    "Pudding farmer",
    "Vegetarian",
    "Hello, I'm War!",
    "It is better to light a candle than to curse the darkness",
    "It is easier to curse the darkness than to light a candle",
    "rock--paper--scissors--lizard--Spock!",
    "/Valar morghulis/ -- /Valar dohaeris/",
];
const hawaiian_motifs = [
    "flamingo",
    "parrot",
    "toucan",
    "bird of paradise",
    "sea turtle",
    "tropical fish",
    "jellyfish",
    "giant eel",
    "water nymph",
    "plumeria",
    "orchid",
    "hibiscus flower",
    "palm tree",
    "hula dancer",
    "sailboat",
    "ukulele",
];
const hawaiian_bgs = [
    "purple",
    "yellow",
    "red",
    "blue",
    "orange",
    "black",
    "green",
    "abstract",
    "geometric",
    "patterned",
    "naturalistic",
];
const apron_msgs = [
    "Kiss the cook",
    "I'm making SCIENCE!",
    "Don't mess with the chef",
    "Don't make me poison you",
    "Gehennom's Kitchen",
    "Rat: The other white meat",
    "If you can't stand the heat, get out of Gehennom!",
    "If we weren't meant to eat animals, why are they made out of meat?",
    "If you don't like the food, I'll stab you",
    "I am an alchemist; if you see me running, try to catch up...",
];

// C ref: read.c candy_wrappers[]
const candy_wrappers = [
    '',                         /* (none -- should never happen) */
    'Apollo',                   /* Lost */
    'Moon Crunchy',             /* South Park */
    'Snacky Cake',    'Chocolate Nuggie', 'The Small Bar',
    'Crispy Yum Yum', 'Nilla Crunchie',   'Berry Bar',
    'Choco Nummer',   'Om-nom', /* Cat Macro */
    'Fruity Oaty',              /* Serenity */
    'Wonka Bar',                /* Charlie and the Chocolate Factory */
];

// C ref: read.c candy_wrapper_text()
/* return the text of a candy bar's wrapper */
export function candy_wrapper_text(obj) {
    /* modulo operation is just bullet proofing; 'spe' is already in range */
    return candy_wrappers[obj.spe % candy_wrappers.length];
}

// C ref: read.c assign_candy_wrapper()
/* assign a wrapper to a candy bar stack */
export function assign_candy_wrapper(obj) {
    if (obj.otyp === CANDY_BAR) {
        /* skips candy_wrappers[0] */
        obj.spe = 1 + rn2(candy_wrappers.length - 1);
    }
    return;
}

/* C ref: read.c struct _create_particular_data */
function new_create_particular_data() {
    return {
        quan: 0, which: 0, fem: 0, genderconf: 0, monclass: 0,
        randmonst: false, maketame: false, makepeaceful: false,
        makehostile: false, sleeping: false, saddled: false,
        invisible: false, hidden: false,
    };
}

/* C ref: monsters.h MAXMCLASSES */
const MAXMCLASSES = 61;

// C ref: read.c cant_revive()
/* some creatures have special data structures that only make sense in their
 * normal locations -- if the player tries to create one elsewhere, or to
 * revive one, the disoriented creature becomes a zombie
 * (JS: mtype is { v }) */
export function cant_revive(mtype, revival, from_obj) {
    /* SHOPKEEPERS can be revived now */
    if (mtype.v === PM_GUARD || (mtype.v === PM_SHOPKEEPER && !revival)
        || mtype.v === PM_HIGH_CLERIC || mtype.v === PM_ALIGNED_CLERIC
        || mtype.v === PM_ANGEL) {
        mtype.v = PM_HUMAN_ZOMBIE;
        return true;
    } else if (mtype.v === PM_LONG_WORM_TAIL) { /* for create_particular() */
        mtype.v = PM_LONG_WORM;
        return true;
    } else if (unique_corpstat(mons[mtype.v])
               && (!from_obj || !from_obj.oextra?.omonst)) {
        /* unique corpses (from bones or wizard mode wish) or
           statues (bones or any wish) end up as shapechangers */
        mtype.v = PM_DOPPELGANGER;
        return true;
    }
    return false;
}

/* C ref: hacklib.c digit() */
function digit(c) { return c >= '0' && c <= '9'; }

// C ref: read.c create_particular_parse()
function create_particular_parse(str, d) {
    const gender_name_var = { v: NEUTRAL };
    let bufp = str;
    let tmpp;

    d.quan = 1 + ((game.multi > 0) ? game.multi : 0);
    d.monclass = MAXMCLASSES;
    d.which = game.urole.mnum; /* an arbitrary index into mons[] */
    d.fem = -1;     /* gender not specified */
    d.genderconf = -1;  /* no confusion on which gender to assign */
    d.randmonst = false;
    d.maketame = d.makepeaceful = d.makehostile = false;
    d.sleeping = d.saddled = d.invisible = d.hidden = false;

    /* quantity */
    if (digit(bufp[0] || '')) {
        d.quan = parseInt(bufp, 10);
        while (digit(bufp[0] || ''))
            bufp = bufp.slice(1);
        while (bufp[0] === ' ')
            bufp = bufp.slice(1);
    }
    const QUAN_LIMIT = (ROWNO * (COLNO - 1));
    /* maximum possible quantity is one per cell: (0..ROWNO-1) x (1..COLNO-1)
       [21*79==1659 for default map size; could subtract 1 for hero's spot] */
    if (d.quan < 1 || d.quan > QUAN_LIMIT)
        d.quan = QUAN_LIMIT - monster_census(false);
    /* gear -- extremely limited number of possibilities supported;
       memset(tmpp, ' ', ...) blanks out the word */
    const blank = (word) => {
        if ((tmpp = strstri(bufp, word)) >= 0) {
            bufp = bufp.slice(0, tmpp) + ' '.repeat(word.length)
                   + bufp.slice(tmpp + word.length);
            return true;
        }
        return false;
    };
    if (blank("saddled "))
        d.saddled = true;
    /* state -- limited number of possibilities supported */
    if (blank("sleeping "))
        d.sleeping = true;
    if (blank("invisible "))
        d.invisible = true;
    if (blank("hidden "))
        d.hidden = true;
    /* check "female" before "male" to avoid false hit mid-word */
    if (blank("female "))
        d.fem = 1;
    if (blank("male "))
        d.fem = 0;
    bufp = mungspaces(bufp); /* after potential memset(' ') */
    /* allow the initial disposition to be specified */
    if (!strncmpi(bufp, "tame ", 5)) {
        bufp = bufp.slice(5);
        d.maketame = true;
    } else if (!strncmpi(bufp, "peaceful ", 9)) {
        bufp = bufp.slice(9);
        d.makepeaceful = true;
    } else if (!strncmpi(bufp, "hostile ", 8)) {
        bufp = bufp.slice(8);
        d.makehostile = true;
    }
    /* decide whether a valid monster was chosen */
    if (game.flags?.debug && (bufp === "*" || bufp === "random")) {
        d.randmonst = true;
        return true;
    }
    d.which = name_to_mon(bufp, gender_name_var);
    /*
     * With the introduction of male and female monster names
     * in 5.0, preserve that detail.
     *
     * If d->fem is already set to MALE or FEMALE at this juncture, it means
     * one of those terms was explicitly specified.
     */
    if (d.fem === MALE || d.fem === FEMALE) {     /* explicitly expressed */
        if ((gender_name_var.v !== NEUTRAL) && (d.fem !== gender_name_var.v)) {
            /* apparent selection incompatibility */
            d.genderconf = gender_name_var.v;        /* resolve later */
        }
        /* otherwise keep the value of d->fem, as it's okay */
    } else {  /* no explicit gender term was specified */
        d.fem = gender_name_var.v;
    }
    if (ismnum(d.which))
        return true; /* got one */
    {
        const which_p = { v: d.which };
        d.monclass = name_to_monclass_rd(bufp, which_p);
        d.which = which_p.v;
    }
    if (ismnum(d.which)) {
        d.monclass = MAXMCLASSES; /* matters below */
        return true;
    } else if (d.monclass === S_invisible_rd) { /* not an actual monster class */
        d.which = PM_STALKER_RD;
        d.monclass = MAXMCLASSES;
        return true;
    } else if (d.monclass === S_WORM_TAIL_RD) { /* empty monster class */
        d.which = PM_LONG_WORM;
        d.monclass = MAXMCLASSES;
        return true;
    } else if (d.monclass > 0) {
        d.which = game.urole.mnum; /* reset from NON_PM */
        return true;
    }
    return false;
}

// C ref: read.c create_particular_creation()
async function create_particular_creation(d) {
    let whichpm = null;
    let i, firstchoice = NON_PM;
    let mtmp;
    let madeany = false;

    if (!d.randmonst) {
        firstchoice = d.which;
        const mtype = { v: d.which };
        const r = cant_revive(mtype, false, null);
        d.which = mtype.v;
        if (r && firstchoice !== PM_LONG_WORM_TAIL)
            throw new Error('create_particular_creation(): "Creating %s instead; force %s?" (y_n) not ported yet');
        whichpm = mons[d.which];
    }
    for (i = 0; i < d.quan; i++) {
        let mmflags = NO_MM_FLAGS;

        if (d.monclass !== MAXMCLASSES)
            whichpm = mkclass(d.monclass, 0);
        else if (d.randmonst)
            whichpm = rndmonst();
        if (d.genderconf === -1) {
            /* no conflict exists between explicit gender term and
               the specified monster name */
            if (d.fem !== -1 && (!whichpm || (!is_male(whichpm)
                                              && !is_female(whichpm))))
                mmflags |= (d.fem === FEMALE) ? MM_FEMALE
                               : (d.fem === MALE) ? MM_MALE : 0;
            /* no surprise; "<mon> appears." rather than "<mon> appears!" */
            mmflags |= MM_NOEXCLAM;
        } else {
            /* conundrum alert: an explicit gender term conflicts with an
               explicit gender-tied naming term (i.e. male cavewoman) */

            /* option chosen: let the explicit gender term (male or female)
               override the gender-tied naming term, so leave d->fem as-is */

            mmflags |= (d.fem === FEMALE) ? MM_FEMALE
                           : (d.fem === MALE) ? MM_MALE : 0;
        }
        if (d.invisible)
            mmflags |= MM_MINVIS;

        mtmp = makemon(whichpm, game.u.ux, game.u.uy, mmflags);
        await makemon_flush_msg();
        if (!mtmp) {
            /* quit trying if creation failed and is going to repeat */
            if (d.monclass === MAXMCLASSES && !d.randmonst)
                break;
            /* otherwise try again */
            continue;
        }
        if (d.maketame) {
            await tamedog(mtmp, null, false);
        } else if (d.makepeaceful || d.makehostile) {
            mtmp.mtame = 0; /* sanity precaution */
            mtmp.mpeaceful = d.makepeaceful ? 1 : 0;
            set_malign(mtmp);
        }
        if (d.saddled && can_saddle(mtmp) && !which_armor(mtmp, W_SADDLE)) {
            /* NULL obj arg means put_saddle_on_mon()
             * will create the saddle itself */
            put_saddle_on_mon(null, mtmp);
        }
        if (d.hidden)
            throw new Error('create_particular_creation(): hidden monsters not ported yet');
        if (d.sleeping)
            mtmp.msleeping = 1;
        /* if asking for 'hidden', show location of every created monster
           that can't be seen--whether that's due to successfully hiding
           or vision issues (line-of-sight, invisibility, blindness) */
        if (d.invisible)
            throw new Error('create_particular_creation(): flash_mon() not ported yet');

        madeany = true;
        /* in case we got a doppelganger instead of what was asked
           for, make it start out looking like what was asked for */
        if (mtmp.cham !== NON_PM && firstchoice !== NON_PM
            && mtmp.cham !== firstchoice)
            await newcham(mtmp, mons[firstchoice], NO_NC_FLAGS);
    }
    return madeany;
}

// C ref: read.c create_particular()
/*
 * Make a new monster with the type controlled by the user.
 *
 * Note:  when creating a monster by class letter, specifying the
 * "strange object" (']') symbol produces a random monster rather
 * than a mimic.  This behavior quirk is useful so don't "fix" it
 * (use 'm'--or "mimic"--to create a random mimic).
 *
 * Used in wizard mode only (for ^G command and for scroll or spell
 * of create monster).  Once upon a time, an earlier incarnation of
 * this code was also used for the scroll/spell in explore mode.
 */
export async function create_particular() {
    const CP_TRYLIM = 5;
    const d = new_create_particular_data();
    let bufp, buf;
    let prompt;
    let tryct = CP_TRYLIM, altmsg = 0;

    buf = ''; /* for EDIT_GETLIN */
    prompt = "Create what kind of monster?";
    do {
        buf = await tty_getlin(prompt);
        bufp = mungspaces(buf);
        if (bufp[0] === '\x1b')
            return false;

        if (create_particular_parse(bufp, d))
            break;

        /* no good; try again... */
        if (bufp || altmsg || tryct < 2) {
            await pline("I've never heard of such monsters.");
        } else {
            await pline("Try again (type * for random, ESC to cancel).");
            ++altmsg;
        }
        /* when a second try is needed, expand the prompt */
        if (tryct === CP_TRYLIM)
            prompt += " [type name or symbol]";
    } while (--tryct > 0);

    if (!tryct)
        await pline("That's enough tries!");
    else
        return await create_particular_creation(d);

    return false;
}

// C ref: dungeon.c avoid_ceiling()
function avoid_ceiling_rd(lev) {
    /* The quest is challenging since parts of the level
       may have ceilings and other parts may not; Avoid
       the ambiguity there by testing with avoid_ceiling()
       and using alternative messaging that avoids the term
       ceiling altogether there */
    if (In_quest_rd(lev) || !has_ceiling(lev))
        return true;
    return false;
}
