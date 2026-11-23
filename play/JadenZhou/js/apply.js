// apply.js -- applying tools.
// C ref: apply.c
//
// Ported so far: the #apply and #rub commands up to choosing the object
// (apply_ok(), rub_ok() and their getobj() calls); using the chosen
// object is not ported yet. The #jump command: dojump(), jump(),
// check_jump(), is_valid_jump_pos(), get_valid_jump_position().

import { game } from './gstate.js';
import { You } from './display.js';
import { getobj } from './invent.js';
import { check_capacity } from './hack.js';
import { is_pole, retouch_object } from './wield.js';
import { pick_lock } from './lock.js';
import * as O from './objects.js';
import { is_graystone, thesimpleoname } from './iactions.js';
import { Blind } from './display.js';
import { discover_object } from './o_init.js';
import { MAX_SPELL_STUDY, DEAF, HAND, SDOOR, SCORR, CORR, ARTICLE_A,
         SUPPRESS_IT, SUPPRESS_INVISIBLE, Is_stronghold } from './const.js';
import { surface } from './iactions.js';
import { can_reach_floor } from './engrave.js';
import { You_hear } from './sounds.js';
import { getdir } from './cmd.js';
import { confdir } from './hack.js';
import { freehand } from './wield.js';
import { body_part, mstatusline, ustatusline } from './insight.js';
import { rn2 } from './rng.js';
import { m_at } from './makemon.js';
import { x_monnam } from './do_name.js';
import { canspotmon, newsym, map_invisible, unmap_invisible,
         pline_The } from './display.js';
import { cvt_sdoor_to_door } from './detect.js';
import { recalc_block_point, unblock_point } from './vision.js';
import { mons, PM_HEALER, PM_AIR_ELEMENTAL, S_VORTEX } from './monsters.js';
/* C ref: mondata.h is_whirly() */
function is_whirly(ptr) {
    return ptr.mlet === S_VORTEX || ptr === mons[PM_AIR_ELEMENTAL];
}
import { GETOBJ_SUGGEST, GETOBJ_DOWNPLAY, GETOBJ_EXCLUDE,
         GETOBJ_EXCLUDE_SELECTABLE, GETOBJ_NOFLAGS, ECMD_OK, ECMD_CANCEL,
         HALLUC, P_AXE } from './const.js';
import { objects, TOOL_CLASS, WAND_CLASS, SPBOOK_CLASS, COIN_CLASS,
         WEAPON_CLASS, POTION_CLASS, BULLWHIP, POT_OIL, CREAM_PIE,
         EUCALYPTUS_LEAF, LUMP_OF_ROYAL_JELLY, BANANA, TOUCHSTONE, PICK_AXE,
         DWARVISH_MATTOCK, OIL_LAMP, MAGIC_LAMP, BRASS_LANTERN } from './objects.js';
import { M1_NOHANDS, M1_NOLIMBS, M1_SLITHY, M2_ROCKTHROW } from './monsters.js';
import { pline, You_cant, There } from './display.js';
import { near_capacity, nomul } from './hack.js';
import { teleds } from './teleport.js';
import { morehungry } from './eat.js';
import { rnd } from './rng.js';
import { TELEDS_NO_FLAGS } from './const.js';
import { getpos, getpos_sethilite } from './getpos.js';
import { walk_path, hurtle_jump } from './dothrow.js';
import { known_spell, spe_Fresh } from './spell.js';
import { dowrite } from './write.js';
import { cansee } from './vision.js';
import { closed_door, sobj_at } from './makemon.js';
import { t_at } from './trap.js';
import { dist2 } from './hacklib.js';
import { ACURR } from './attrib.js';
import { SPE_JUMPING, BOULDER } from './objects.js';
import { ECMD_TIME, ECMD_FAIL, JUMPING, PASSES_WALLS, LEVITATION, WOUNDED_LEGS,
         INTRINSIC, UNENCUMBERED, A_STR, TT_PIT, IS_STWALL, IS_DOOR, D_ISOPEN,
         ACCESSIBLE, isok, u_at, Is_airlevel, Is_waterlevel } from './const.js';
import { use_container } from './pickup.js';
import { do_play_instrument } from './music.js';

/* C ref: mondata.h nohands() */
function nohands(ptr) { return (ptr.mflags1 & M1_NOHANDS) !== 0; }
/* C ref: obj.h is_pick(), is_axe() */
function is_pick(otmp) {
    return otmp.otyp === PICK_AXE || otmp.otyp === DWARVISH_MATTOCK;
}
function is_axe(otmp) {
    return ((otmp.oclass === WEAPON_CLASS || otmp.oclass === TOOL_CLASS)
            && objects[otmp.otyp].oc_skill === P_AXE);
}
/* C ref: you.h Hallucination */
function Hallucination() {
    const p = game.u?.uprops?.[HALLUC];
    return !!(p?.intrinsic || p?.extrinsic);
}

/* C ref: display.c feel_newsym() -- feel_location() for a blind hero
   isn't ported */
function feel_newsym(x, y) {
    if (Blind())
        throw new Error('feel_newsym(): feel_location() not ported yet');
    newsym(x, y);
}

// C ref: apply.c its_dead() -- the stethoscope applied to a corpse or
// statue at <rx,ry>; returns TRUE if it gave a message
async function its_dead(rx, ry, resp) {
    void resp;
    const corpse = sobj_at(O.CORPSE, rx, ry),
          statue = sobj_at(O.STATUE, rx, ry);

    if (!corpse && !statue) {
        ; /* nothing to do */
    } else {
        throw new Error('its_dead(): a corpse or statue under the stethoscope not ported yet');
    }
    return false; /* no corpse or statue */
}

/* C ref: apply.c hollow_str[] */
const hollow_str = (what) => `a hollow sound.  This must be a secret ${what}!`;

// C ref: apply.c use_stethoscope()
/* Strictly speaking it makes no sense for usage of a stethoscope to
   not take any time; however, unless it did, the stethoscope would be
   almost useless.  As a compromise, one use per turn is free, another
   uses up the turn; this makes curse status have a tangible effect. */
async function use_stethoscope(obj) {
    const u = game.u;
    let mtmp;
    let res;
    const interference = (u.uswallow && is_whirly(u.ustuck.data)
                          && !rn2((game.urole.mnum === PM_HEALER) ? 10 : 3));

    if (nohands(game.youmonst.data)) {
        await You("have no hands!"); /* not `body_part(HAND)' */
        return ECMD_OK;
    } else if (uhave(DEAF) || u.uroleplay?.deaf) { /* Deaf */
        await You_cant("hear anything!");
        return ECMD_OK;
    } else if (!freehand()) {
        await You(`have no free ${body_part(HAND)}.`);
        return ECMD_OK;
    }
    if (!(await getdir(null)))
        return ECMD_CANCEL;

    res = (game.hero_seq === game.context.stethoscope_seq) ? ECMD_TIME : ECMD_OK;
    game.context.stethoscope_seq = game.hero_seq;

    game.bhitpos = { x: u.ux, y: u.uy }; /* tentative, reset below */
    game.notonhead = !!u.uswallow;
    if (u.usteed && u.dz > 0) {
        throw new Error('use_stethoscope(): applying to the steed not ported yet');
    } else if (u.uswallow && (u.dx || u.dy || u.dz)) {
        await mstatusline(u.ustuck);
        return res;
    } else if (u.uswallow && interference) {
        throw new Error('use_stethoscope(): engulfer interference not ported yet');
    } else if (u.dz) {
        if (u.uinwater) { /* Underwater */
            await You_hear("faint splashing.");
        } else if (u.dz < 0 || !can_reach_floor(true)) {
            throw new Error('use_stethoscope(): cant_reach_floor() not ported yet');
        } else if (await its_dead(u.ux, u.uy, res)) {
            ; /* message already given */
        } else if (Is_stronghold(u.uz)) {
            await You_hear("the crackling of hellfire.");
        } else {
            await pline_The(`${surface(u.ux, u.uy)} seems healthy enough.`);
        }
        return res;
    } else if (obj.cursed && !rn2(2)) {
        await You_hear("your heart beat.");
        return res;
    }
    confdir(false);
    if (!u.dx && !u.dy) {
        await ustatusline();
        return res;
    }
    const rx = u.ux + u.dx;
    const ry = u.uy + u.dy;
    if (!isok(rx, ry)) {
        await You_hear("a faint typing noise.");
        return ECMD_OK;
    }
    if ((mtmp = m_at(rx, ry)) !== null) {
        const mnm = x_monnam(mtmp, ARTICLE_A, null,
                             SUPPRESS_IT | SUPPRESS_INVISIBLE, false);

        /* gb.bhitpos needed by mstatusline() iff mtmp is a long worm */
        game.bhitpos = { x: rx, y: ry };
        game.notonhead = (mtmp.mx !== rx || mtmp.my !== ry);

        if (mtmp.mundetected) {
            if (!canspotmon(mtmp))
                await There(`is ${mnm} hidden there.`);
            mtmp.mundetected = 0;
            newsym(mtmp.mx, mtmp.my);
        } else if (mtmp.mappearance) {
            let what = "thing";
            let use_plural = false;

            switch (M_AP_TYPE_AP(mtmp)) {
            case M_AP_OBJECT_AP: {
                /* FIXME?
                 *  we should probably be using object_from_map() here
                 */
                const otyp = mtmp.mappearance; /* init_dummyobj(&dummyobj, mappearance, 1L) */
                /* simple_typename() yields "fruit" for any named fruit;
                   we want the same thing '//' or ';' shows: "slime mold"
                   or "grape" or "slice of pizza" */
                if (otyp === O.SLIME_MOLD && has_mcorpsenm_ap(mtmp)) {
                    throw new Error('use_stethoscope(): mimic shown as a named fruit (simpleonames()) not ported yet');
                } else {
                    what = simple_typename_ap(otyp);
                }
                /* is_boots(odummy) || is_gloves(odummy) || LENSES */
                use_plural = ((objects[otyp].oc_class === O.ARMOR_CLASS
                               && (objects[otyp].oc_armcat === O.ARM_BOOTS
                                   || objects[otyp].oc_armcat === O.ARM_GLOVES))
                              || otyp === O.LENSES);
                break;
            }
            case M_AP_MONSTER_AP: /* ignore Hallucination here */
                what = pmname_ap(mons[mtmp.mappearance], Mgender_ap(mtmp));
                break;
            case M_AP_FURNITURE_AP:
                what = defsyms_explanation_ap[mtmp.mappearance];
                break;
            }
            seemimic_ap(mtmp);
            await pline(`${use_plural ? "Those" : "That"} ${what} ${
                use_plural ? "are" : "is"} really ${mnm}.`);
        } else if ((game.flags.verbose ?? true) && !canspotmon(mtmp)) {
            await There(`is ${mnm} there.`);
        }

        await mstatusline(mtmp);
        if (!canspotmon(mtmp))
            map_invisible(rx, ry);
        return res;
    }
    if (unmap_invisible(rx, ry))
        await pline_The("invisible monster must have moved.");

    const lev = game.level.at(rx, ry);
    switch (lev.typ) {
    case SDOOR:
        await You_hear(hollow_str("door"));
        cvt_sdoor_to_door(lev); /* ->typ = DOOR */
        recalc_block_point(rx, ry);
        feel_newsym(rx, ry);
        return res;
    case SCORR:
        await You_hear(hollow_str("passage"));
        lev.typ = CORR, lev.flags = 0;
        unblock_point(rx, ry);
        feel_newsym(rx, ry);
        return res;
    }

    if (!(await its_dead(rx, ry, res)))
        await You("hear nothing special."); /* not You_hear()  */
    return res;
}

// C ref: apply.c flip_through_book()
async function flip_through_book(obj) {
    if (game.u.uinwater) { /* Underwater */
        await You("don't want to get the pages even more soggy, do you?");
        return ECMD_OK;
    }

    await You(`flip through the pages of ${thesimpleoname(obj)}.`);

    if (obj.otyp === O.SPE_BOOK_OF_THE_DEAD) {
        throw new Error('flip_through_book(): the Book of the Dead not ported yet');
    } else if (Blind()) {
        await pline(`The pages feel ${Hallucination() ? "freshly picked"
                                                      : "rough and dry"}.`);
    } else if (obj.otyp === O.SPE_BLANK_PAPER) {
        await pline(`This spellbook ${Hallucination()
                                       ? "doesn't have much of a plot"
                                       : "has nothing written in it"}.`);
        discover_object(obj.otyp, true, true, true); /* makeknown() */
    } else if (Hallucination()) {
        await You("enjoy the animated initials.");
    } else if (obj.otyp === O.SPE_NOVEL) {
        await pline("This looks like it might be interesting to read.");
    } else {
        const fadeness = [
            "fresh",
            "slightly faded",
            "very faded",
            "extremely faded",
            "barely visible"
        ];
        const findx = Math.min(obj.spestudied || 0, MAX_SPELL_STUDY);

        await pline(`The${objects[obj.otyp].oc_magic ? " magical" : ""}`
                    + ` ink in this spellbook is ${fadeness[findx]}.`);
    }

    return ECMD_TIME;
}

import { M_AP_TYPE as M_AP_TYPE_AP, M_AP_OBJECT as M_AP_OBJECT_AP,
         M_AP_MONSTER as M_AP_MONSTER_AP,
         M_AP_FURNITURE as M_AP_FURNITURE_AP } from './const.js';
import { obj_typename as obj_typename_ap } from './objnam.js';
/* C ref: mextra.h has_mcorpsenm() */
function has_mcorpsenm_ap(mtmp) { return mtmp.mextra?.mcorpsenm !== undefined; }
/* C ref: objnam.c simple_typename() -- obj_typename() without the
   user-assigned name or the appended description */
function simple_typename_ap(otyp) {
    const save_uname = objects[otyp].oc_uname;
    objects[otyp].oc_uname = null; /* suppress any name given by user */
    let bufp = obj_typename_ap(otyp);
    objects[otyp].oc_uname = save_uname;
    const pp = bufp.indexOf(" (");
    if (pp >= 0)
        bufp = bufp.slice(0, pp); /* strip the appended description */
    return bufp;
}
import { pmname as pmname_ap, Mgender as Mgender_ap } from './do_name.js';
import { defsyms_explanation as defsyms_explanation_ap } from './pager.js';
import { seemimic as seemimic_ap } from './mon.js';

// C ref: apply.c use_cream_pie()
async function use_cream_pie(obj) {
    const u = game.u;
    const wasblind = Blind();
    const wascreamed = u.ucreamed;
    let several = false;

    if (obj.quan > 1) {
        several = true;
        obj = splitobj_ap(obj, 1);
    }
    if (Hallucination())
        await You("give yourself a facial.");
    else
        await You(`immerse your ${body_part(FACE_AP)} in ${
            several ? "one of " : ""}${
            several ? makeplural_ap(the_ap(xname_ap(obj))) : the_ap(xname_ap(obj))}.`);
    if (can_blnd_ap(null, game.youmonst, AT_WEAP_AP, obj)) {
        const blindinc = rnd(25);

        u.ucreamed = (u.ucreamed || 0) + blindinc;
        await make_blinded_ap((u.uprops[BLINDED_AP].intrinsic & TIMEOUT_AP) /* BlindedTimeout */
                              + blindinc, false);
        if (!Blind() || (Blind() && wasblind))
            await pline(`There's ${wascreamed ? "more " : ""}sticky goop all over your ${
                body_part(FACE_AP)}.`);
        else /* Blind  && !wasblind */
            await You_cant(`see through all the sticky goop on your ${body_part(FACE_AP)}.`);
    }

    setnotworn_ap(obj);
    /* useup() is appropriate, but we want costly_alteration()'s message */
    costly_alteration_ap(obj, COST_SPLAT_AP);
    obj_extract_self_ap(obj);
    delobj_ap(obj);
    return ECMD_OK;
}
import { splitobj as splitobj_ap, costly_alteration as costly_alteration_ap,
         obj_extract_self as obj_extract_self_ap } from './mkobj.js';
import { makeplural as makeplural_ap, xname as xname_ap } from './objnam.js';
import { the as the_ap } from './iactions.js';
import { can_blnd as can_blnd_ap } from './mondata.js';
import { AT_WEAP as AT_WEAP_AP } from './monsters.js';
import { make_blinded as make_blinded_ap } from './potion.js';
import { setnotworn as setnotworn_ap } from './worn.js';
import { delobj as delobj_ap } from './invent.js';
import { FACE as FACE_AP, BLINDED as BLINDED_AP, TIMEOUT as TIMEOUT_AP,
         COST_SPLAT as COST_SPLAT_AP } from './const.js';

// C ref: apply.c rub_ok() -- getobj callback for object to rub
function rub_ok(obj) {
    if (!obj)
        return GETOBJ_EXCLUDE;

    if (obj.otyp === OIL_LAMP || obj.otyp === MAGIC_LAMP
        || obj.otyp === BRASS_LANTERN || is_graystone(obj)
        || obj.otyp === LUMP_OF_ROYAL_JELLY)
        return GETOBJ_SUGGEST;

    return GETOBJ_EXCLUDE;
}

// C ref: apply.c dorub() -- the #rub command
export async function dorub() {
    if (nohands(game.youmonst.data)) {
        await You("aren't able to rub anything without hands.");
        return ECMD_OK;
    }
    const obj = await getobj("rub", rub_ok, GETOBJ_NOFLAGS);
    if (!obj)
        return ECMD_CANCEL;
    if (obj.oclass === O.GEM_CLASS || obj.oclass === O.FOOD_CLASS) {
        if (is_graystone(obj)) {
            throw new Error('dorub(): use_stone() not ported yet');
        } else if (obj.otyp === O.LUMP_OF_ROYAL_JELLY) {
            throw new Error('dorub(): use_royal_jelly() not ported yet');
        } else {
            await pline("Sorry, I don't know how to use that.");
            return ECMD_OK;
        }
    }
    if (obj !== game.uwep) {
        if (await wield_tool_ap(obj, "rub")) {
            /* cmdq_add_ec(CQ_CANNED, dorub);
               cmdq_add_key(CQ_CANNED, obj->invlet); */
            if (!game.cmdq) game.cmdq = [];
            game.cmdq.push({ typ: 'ec', fn: 'dorub' });
            game.cmdq.push({ typ: 'key', key: obj.invlet });
            return ECMD_TIME;
        }
        return ECMD_OK;
    }

    /* now uwep is obj */
    const uwep = game.uwep;
    if (uwep.otyp === MAGIC_LAMP) {
        if (uwep.spe > 0 && !rn2(3)) {
            /* check_unpaid_usage(uwep, TRUE): unusual item use */
            if (uwep.unpaid && game.u.ushops && game.u.ushops[0])
                throw new Error('dorub(): check_unpaid_usage() not ported yet');
            /* bones preparation:  perform the lamp transformation
               before releasing the djinni in case the latter turns out
               to be fatal (a hostile djinni has no chance to attack yet,
               but an indebted one who grants a wish might bestow an
               artifact which blasts the hero with lethal results) */
            uwep.otyp = OIL_LAMP;
            uwep.spe = 0; /* for safety */
            uwep.age = rn1_ap(500, 1000);
            if (uwep.lamplit)
                throw new Error('dorub(): begin_burn() of a lit lamp not ported yet');
            await djinni_from_bottle_ap(uwep);
            discover_object(MAGIC_LAMP, true, true, true); /* makeknown() */
            /* update_inventory(): no perm_invent */
        } else if (rn2(2)) {
            await You(`${!Blind() ? "see a puff of" : "smell"} smoke.`);
        } else
            await pline(nothing_happens_ap);
    } else if (obj.otyp === BRASS_LANTERN) {
        /* message from Adventure */
        await pline("Rubbing the electric lamp is not particularly rewarding.");
        await pline("Anyway, nothing exciting happens.");
    } else
        await pline(nothing_happens_ap);
    return ECMD_TIME;
}
import { wield_tool as wield_tool_ap } from './wield.js';
import { rn1 as rn1_ap } from './rng.js';
import { djinni_from_bottle as djinni_from_bottle_ap } from './potion.js';
import { nothing_happens as nothing_happens_ap } from './const.js';
import { nothing_seems_to_happen as nothing_seems_to_happen_lp, GLIB as GLIB_LP } from './const.js';
import { Shk_Your as Shk_Your_lp } from './wield.js';
import { yname as yname_lp, Tobjnam as Tobjnam_lp, otense as otense_lp } from './objnam.js';
import { Your as Your_lp } from './display.js';
import { begin_burn as begin_burn_lp, end_burn as end_burn_lp } from './timeout.js';
import { make_glib as make_glib_lp } from './potion.js';
import { fingers_or_gloves as fingers_or_gloves_lp } from './do_wear.js';
import { d as d_lp } from './rng.js';
import { check_unpaid as check_unpaid_lp } from './zap.js';

// C ref: apply.c apply_ok() -- getobj callback for object to apply
function apply_ok(obj) {
    if (!obj)
        return GETOBJ_EXCLUDE;

    /* all tools, all wands (breaking), all spellbooks (flipping through -
       including blank/novel/Book of the Dead) */
    if (obj.oclass === TOOL_CLASS || obj.oclass === WAND_CLASS
        || obj.oclass === SPBOOK_CLASS)
        return GETOBJ_SUGGEST;

    /* applying coins to flip them is a minor easter egg, so do not suggest
       coin application to the player */
    if (obj.oclass === COIN_CLASS)
        return GETOBJ_DOWNPLAY;

    /* certain weapons */
    if (obj.oclass === WEAPON_CLASS
        && (is_pick(obj) || is_axe(obj) || is_pole(obj)
            || obj.otyp === BULLWHIP))
        return GETOBJ_SUGGEST;

    if (obj.oclass === POTION_CLASS) {
        /* permit applying unknown potions, but don't suggest them */
        if (!obj.dknown || !objects[obj.otyp].oc_name_known)
            return GETOBJ_DOWNPLAY;

        /* only applicable potion is oil, and it will only be suggested as a
           choice when already discovered */
        if (obj.otyp === POT_OIL)
            return GETOBJ_SUGGEST;
    }

    /* certain foods */
    if (obj.otyp === CREAM_PIE || obj.otyp === EUCALYPTUS_LEAF
        || obj.otyp === LUMP_OF_ROYAL_JELLY)
        return GETOBJ_SUGGEST;

    if (obj.otyp === BANANA && Hallucination())
        return GETOBJ_DOWNPLAY;

    if (is_graystone(obj)) {
        /* The only case where we don't suggest a gray stone is if we KNOW it
           isn't a touchstone. */
        if (!obj.dknown)
            return GETOBJ_SUGGEST;

        if (obj.otyp !== TOUCHSTONE
            && (objects[TOUCHSTONE].oc_name_known
                || objects[obj.otyp].oc_name_known))
            return GETOBJ_EXCLUDE_SELECTABLE;

        return GETOBJ_SUGGEST;
    }

    /* item can't be applied; if picked anyway,
       _EXCLUDE would yield "That is a silly thing to apply.",
       _EXCLUDE_SELECTABLE yields "Sorry, I don't know how to use that." */
    return GETOBJ_EXCLUDE_SELECTABLE;
}

// C ref: apply.c doapply() -- the #apply command
export async function doapply() {
    if (nohands(game.youmonst.data)) {
        await You("aren't able to use or apply tools in your current form.");
        return ECMD_OK;
    }
    if (await check_capacity(null))
        return ECMD_OK;

    const obj = await getobj("use or apply", apply_ok, GETOBJ_NOFLAGS);
    if (!obj)
        return ECMD_CANCEL;

    let res = ECMD_TIME;
    if (!(await retouch_object(obj, false)))
        return ECMD_TIME; /* evading your grasp costs a turn; just be
                             grateful that you don't drop it as well */

    if (obj.oclass === WAND_CLASS)
        throw new Error('doapply(): do_break_wand() not ported yet');

    if (obj.oclass === SPBOOK_CLASS)
        return await flip_through_book(obj);

    if (obj.oclass === COIN_CLASS)
        throw new Error('doapply(): flip_coin() not ported yet');

    switch (obj.otyp) {
    case O.BLINDFOLD:
    case O.LENSES:
        throw new Error('doapply(): Blindf_on()/Blindf_off() not ported yet');
    case CREAM_PIE:
        res = await use_cream_pie(obj);
        break;
    case LUMP_OF_ROYAL_JELLY:
        throw new Error('doapply(): use_royal_jelly() not ported yet');
    case BULLWHIP:
        throw new Error('doapply(): use_whip() not ported yet');
    case O.GRAPPLING_HOOK:
        throw new Error('doapply(): use_grapple() not ported yet');
    case O.LARGE_BOX:
    case O.CHEST:
    case O.ICE_BOX:
    case O.SACK:
    case O.BAG_OF_HOLDING:
    case O.OILSKIN_SACK:
        res = await use_container(obj, true, false);
        break;
    case O.BAG_OF_TRICKS:
        throw new Error('doapply(): bagotricks() not ported yet');
    case O.CAN_OF_GREASE:
        throw new Error('doapply(): use_grease() not ported yet');
    case O.LOCK_PICK:
    case O.CREDIT_CARD:
    case O.SKELETON_KEY:
        res = ((await pick_lock(obj, 0, 0, null)) !== 0) ? ECMD_TIME : ECMD_OK;
        break;
    case PICK_AXE:
    case DWARVISH_MATTOCK:
        throw new Error('doapply(): use_pick_axe() not ported yet');
    case O.TINNING_KIT:
        throw new Error('doapply(): use_tinning_kit() not ported yet');
    case O.LEASH:
        throw new Error('doapply(): use_leash() not ported yet');
    case O.SADDLE:
        throw new Error('doapply(): use_saddle() not ported yet');
    case O.MAGIC_WHISTLE:
        throw new Error('doapply(): use_magic_whistle() not ported yet');
    case O.TIN_WHISTLE:
        throw new Error('doapply(): use_whistle() not ported yet');
    case EUCALYPTUS_LEAF:
        throw new Error('doapply(): eucalyptus leaf whistle not ported yet');
    case O.STETHOSCOPE:
        res = await use_stethoscope(obj);
        break;
    case O.MIRROR:
        throw new Error('doapply(): use_mirror() not ported yet');
    case O.BELL:
    case O.BELL_OF_OPENING:
        throw new Error('doapply(): use_bell() not ported yet');
    case O.CANDELABRUM_OF_INVOCATION:
        throw new Error('doapply(): use_candelabrum() not ported yet');
    case O.WAX_CANDLE:
    case O.TALLOW_CANDLE:
        throw new Error('doapply(): use_candle() not ported yet');
    case OIL_LAMP:
    case MAGIC_LAMP:
    case BRASS_LANTERN:
        await use_lamp(obj);
        break;
    case POT_OIL:
        throw new Error('doapply(): light_cocktail() not ported yet');
    case O.EXPENSIVE_CAMERA:
        throw new Error('doapply(): use_camera() not ported yet');
    case O.TOWEL:
        throw new Error('doapply(): use_towel() not ported yet');
    case O.CRYSTAL_BALL:
        throw new Error('doapply(): use_crystal_ball() not ported yet');
    case O.MAGIC_MARKER:
        res = await dowrite(obj);
        break;
    case O.TIN_OPENER:
        throw new Error('doapply(): use_tin_opener() not ported yet');
    case O.FIGURINE:
        throw new Error('doapply(): use_figurine() not ported yet');
    case O.UNICORN_HORN:
        throw new Error('doapply(): use_unicorn_horn() not ported yet');
    case O.WOODEN_FLUTE:
    case O.MAGIC_FLUTE:
    case O.TOOLED_HORN:
    case O.FROST_HORN:
    case O.FIRE_HORN:
    case O.WOODEN_HARP:
    case O.MAGIC_HARP:
    case O.BUGLE:
    case O.LEATHER_DRUM:
    case O.DRUM_OF_EARTHQUAKE:
        res = await do_play_instrument(obj);
        break;
    case O.HORN_OF_PLENTY: /* not a musical instrument */
        throw new Error('doapply(): hornoplenty() not ported yet');
    case O.LAND_MINE:
    case O.BEARTRAP:
        throw new Error('doapply(): use_trap() not ported yet');
    case O.FLINT:
    case O.LUCKSTONE:
    case O.LOADSTONE:
    case TOUCHSTONE:
        throw new Error('doapply(): use_stone() not ported yet');
    case BANANA:
        if (Hallucination()) {
            await pline("It rings! ... But no-one answers.");
            break;
        }
        /*FALLTHRU*/
    default:
        /* Pole-weapons can strike at a distance */
        if (is_pole(obj)) {
            throw new Error('doapply(): use_pole() not ported yet');
        } else if (is_pick(obj) || is_axe(obj)) {
            throw new Error('doapply(): use_pick_axe() not ported yet');
        }
        await pline("Sorry, I don't know how to use that.");
        return ECMD_FAIL;
    }
    /* This assumes that anything that potentially destroyed obj has kept
     * track of it and set obj to null before this point. */
    if (obj && obj.oartifact)
        throw new Error('doapply(): arti_speak() not ported yet');
    return res;
}

// C ref: apply.c dojump() -- the #jump command
export async function dojump() {
    /* Physical jump */
    return await jump(0);
}

/* C ref: apply.c enum jump_trajectory */
const jAny = 0, /* any direction => magical jump */
    jHorz = 1,
    jVert = 2,
    jDiag = 3; /* jHorz|jVert */

function uprop(p) { return game.u?.uprops?.[p] || {}; }
function uhave(p) { const q = uprop(p); return !!(q.intrinsic || q.extrinsic); }
/* C ref: youprop.h Jumping, HJumping, EJumping */
function Jumping() { return uhave(JUMPING); }
function Passes_walls() { return uhave(PASSES_WALLS); }
function distu(x, y) { return dist2(x, y, game.u.ux, game.u.uy); }

// C ref: apply.c check_jump() -- callback routine for walk_path()
function check_jump(arg, x, y) {
    const traj = arg.traj;
    const lev = game.level.at(x, y);

    if (Passes_walls())
        return true;
    if (IS_STWALL(lev.typ))
        return false;
    if (IS_DOOR(lev.typ)) {
        if (closed_door(x, y))
            return false;
        if ((lev.doormask & D_ISOPEN) !== 0 && traj !== jAny
            /* reject diagonal jump into or out-of or through open door */
            && (traj === jDiag
                /* reject horizontal jump through horizontal open door
                   and non-horizontal (ie, vertical) jump through
                   non-horizontal (vertical) open door */
                || ((traj & jHorz) !== 0) === (!!lev.horizontal)))
            return false;
        /* empty doorways aren't restricted */
    }
    /* let giants jump over boulders */
    if (sobj_at(BOULDER, x, y) && !(game.youmonst.data.mflags2 & M2_ROCKTHROW))
        return false;
    return true;
}

// C ref: apply.c is_valid_jump_pos()
async function is_valid_jump_pos(x, y, magic, showmsg) {
    const u = game.u;
    const HJumping = uprop(JUMPING).intrinsic || 0;
    const EJumping = uprop(JUMPING).extrinsic || 0;

    if (!magic && !(HJumping & ~INTRINSIC) && !EJumping && distu(x, y) !== 5) {
        /* The Knight jumping restriction still applies when riding a
         * horse.  After all, what shape is the knight piece in chess?
         */
        if (showmsg)
            await pline("Illegal move!");
        return false;
    } else if (distu(x, y) > (magic ? 6 + magic * 3 : 9)) {
        if (showmsg)
            await pline("Too far!");
        return false;
    } else if (!isok(x, y)) {
        if (showmsg)
            await You("cannot jump there!");
        return false;
    } else if (!cansee(x, y)) {
        if (showmsg)
            await You("cannot see where to land!");
        return false;
    } else {
        const lev = game.level.at(u.ux, u.uy);
        /* we want to categorize trajectory for use in determining
           passage through doorways: horizontal, vertical, or diagonal;
           since knight's jump and other irregular directions are
           possible, we flatten those out to simplify door checks */
        const dx = x - u.ux, dy = y - u.uy;
        let ax = Math.abs(dx), ay = Math.abs(dy);

        /* diag: any non-orthogonal destination classified as diagonal */
        const diag = (magic || Passes_walls() || (!dx && !dy)) ? jAny
                     : !dy ? jHorz : !dx ? jVert : jDiag;
        /* traj: flatten out the trajectory => some diagonals re-classified */
        if (ax >= 2 * ay)
            ay = 0;
        else if (ay >= 2 * ax)
            ax = 0;
        const traj = (magic || Passes_walls() || (!ax && !ay)) ? jAny
                     : !ay ? jHorz : !ax ? jVert : jDiag;
        /* walk_path doesn't process the starting spot */
        if (diag === jDiag && IS_DOOR(lev.typ)
            && (lev.doormask & D_ISOPEN) !== 0
            && (traj === jDiag
                || ((traj & jHorz) !== 0) === (!!lev.horizontal))) {
            if (showmsg)
                await You_cant("jump diagonally out of a doorway.");
            return false;
        }
        const uc = { x: u.ux, y: u.uy };
        const tc = { x, y }; /* target */
        if (!(await walk_path(uc, tc, check_jump, { traj }))) {
            if (showmsg)
                await There("is an obstacle preventing that jump.");
            return false;
        }
    }
    return true;
}

// C ref: apply.c get_valid_jump_position() -- getpos callback
async function get_valid_jump_position(x, y) {
    return (isok(x, y)
            && (ACCESSIBLE(game.level.at(x, y).typ) || Passes_walls())
            && await is_valid_jump_pos(x, y, game.jumping_is_magic, false));
}

// C ref: apply.c display_jump_positions()
function display_jump_positions(on_off) {
    /* tmp_at(DISP_BEAM, cmap_to_glyph(S_goodpos)) ... */
    throw new Error('display_jump_positions(): tmp_at() not ported yet');
}

// C ref: apply.c jump()
/* 0=Physical, otherwise skill level */
export async function jump(magic) {
    const u = game.u;
    const cc = { x: 0, y: 0 };
    const ydata = game.youmonst.data;

    /* attempt "jumping" spell if hero has no innate jumping ability */
    if (!magic && !Jumping() && known_spell(SPE_JUMPING) >= spe_Fresh)
        throw new Error('jump(): spelleffects(SPE_JUMPING) not ported yet');

    if (!magic && ((ydata.mflags1 & M1_NOLIMBS) === M1_NOLIMBS
                   || (ydata.mflags1 & M1_SLITHY))) {
        /* normally (nolimbs || slithy) implies !Jumping,
           but that isn't necessarily the case for knights */
        await You_cant("jump; you have no legs!");
        return ECMD_OK;
    } else if (!magic && !Jumping()) {
        await You_cant("jump very far.");
        return ECMD_OK;
    /* if steed is immobile, can't do physical jump but can do spell one */
    } else if (!magic && u.usteed) {
        throw new Error('jump(): stucksteed() not ported yet');
    } else if (u.uswallow) {
        if (magic) {
            await You("bounce around a little.");
            return ECMD_TIME;
        }
        await pline("You've got to be kidding!");
        return ECMD_OK;
    } else if (u.uinwater) {
        if (magic) {
            await You("swish around a little.");
            return ECMD_TIME;
        }
        await pline("This calls for swimming, not jumping!");
        return ECMD_OK;
    } else if (u.ustuck) {
        throw new Error('jump(): jumping while stuck not ported yet');
    } else if (uhave(LEVITATION) || Is_airlevel(u.uz) || Is_waterlevel(u.uz)) {
        if (magic) {
            await You("flail around a little.");
            return ECMD_TIME;
        }
        await You("don't have enough traction to jump.");
        return ECMD_OK;
    } else if (!magic && near_capacity() > UNENCUMBERED) {
        await You("are carrying too much to jump!");
        return ECMD_OK;
    } else if (!magic && (u.uhunger <= 100 || ACURR(A_STR) < 6)) {
        await You("lack the strength to jump!");
        return ECMD_OK;
    } else if (!magic && uhave(WOUNDED_LEGS)) {
        throw new Error('jump(): legs_in_no_shape() not ported yet');
    } else if (u.usteed && u.utrap) {
        throw new Error('jump(): steed in a trap not ported yet');
    }

    await pline("Where do you want to jump?");
    cc.x = u.ux;
    cc.y = u.uy;
    game.jumping_is_magic = magic;
    await getpos_sethilite(display_jump_positions, get_valid_jump_position);
    if (await getpos(cc, true, "the desired position") < 0)
        return ECMD_CANCEL; /* user pressed ESC */
    if (!(await is_valid_jump_pos(cc.x, cc.y, magic, true))) {
        return ECMD_FAIL;
    } else if (u.usteed && u_at(cc.x, cc.y)) {
        throw new Error('jump(): jumping in place while riding not ported yet');
    } else {
        let wastrapped = false;

        if (u.utrap) {
            wastrapped = true;
            switch (u.utraptype) {
            case TT_PIT:
                await You("leap from the pit!");
                break;
            default:
                throw new Error(`jump(): jumping out of trap type ${u.utraptype} not ported yet`);
            }
            /* if we reach here, hero is no longer trapped */
            throw new Error('jump(): reset_utrap() not ported yet');
        }
        /* jumping on hero's same spot doesn't use walk_path() and isn't
           allowed when riding (handled above) */
        if (u_at(cc.x, cc.y)) {
            /* escaping from a trap takes precedence over jumping in place */
            if (wastrapped)
                throw new Error('jump(): morehungry() after escaping a trap not ported yet');
            /* jumping in place on a trap will trigger it */
            if (t_at(cc.x, cc.y))
                throw new Error('jump(): jumping in place on a trap not ported yet');
            /* jumping in place takes no time and doesn't exercise anything */
            await You(`${uhave(HALLUC) ? "hop up and down a bit"
                                       : "decide not to jump after all"}.`);
            return ECMD_OK;
        }

        /*
         * Check the path from uc to cc, calling hurtle_step at each
         * location.  The final position actually reached will be
         * in cc.
         */
        const uc = { x: u.ux, y: u.uy };
        /* calculate max(abs(dx), abs(dy)) as the range */
        let range = cc.x - uc.x;
        if (range < 0)
            range = -range;
        let temp = cc.y - uc.y;
        if (temp < 0)
            temp = -temp;
        if (range < temp)
            range = temp;
        await walk_path(uc, cc, hurtle_jump, { range });
        /* hurtle_jump -> hurtle_step results in <u.ux,u.uy> == <cc.x,cc.y>
         * and usually moves the ball if punished, but does not handle all
         * the effects of landing on the final position.
         */
        await teleds(cc.x, cc.y, TELEDS_NO_FLAGS);
        nomul(-1);
        game.multi_reason = "jumping around";
        game.nomovemsg = "";
        await morehungry(rnd(25));
        return ECMD_TIME;
    }
}

// C ref: apply.c use_lamp()
async function use_lamp(obj) {
    const u = game.u;
    const lamp = (obj.otyp === OIL_LAMP
                  || obj.otyp === MAGIC_LAMP) ? "lamp"
                 : (obj.otyp === BRASS_LANTERN) ? "lantern"
                   : null;
    const Is_candle = (obj.otyp === O.TALLOW_CANDLE || obj.otyp === O.WAX_CANDLE);

    /*
     * When blind, lamps' and candles' on/off state can be distinguished
     * by heat.  For brass lantern assume that there is an on/off switch
     * that can be felt.
     */

    if (obj.lamplit) {
        if (lamp) /* lamp or lantern */
            await pline(`${Shk_Your_lp(obj)}${lamp} is now off.`);
        else
            await You(`snuff out ${yname_lp(obj)}.`);
        end_burn_lp(obj, true);
        return;
    }
    if (u.uinwater) { /* Underwater */
        await pline(`${!Is_candle ? "This is not a diving lamp"
                                  : "Sorry, fire and water don't mix"}.`);
        return;
    }
    /* magic lamps with an spe == 0 (wished for) cannot be lit */
    if ((!Is_candle && obj.age === 0)
        || (obj.otyp === MAGIC_LAMP && obj.spe === 0)) {
        if (obj.otyp === BRASS_LANTERN) {
            if (!Blind())
                await Your_lp("lantern is out of power.");
            else
                await pline(nothing_seems_to_happen_lp);
        } else {
            await pline(`This ${xname_ap(obj)} has no oil.`);
        }
        return;
    }
    if (obj.cursed && !rn2(2)) {
        if ((obj.otyp === OIL_LAMP || obj.otyp === MAGIC_LAMP) && !rn2(3)) {
            await pline_The(`lamp spills and covers your ${fingers_or_gloves_lp(true)} with oil.`);
            make_glib_lp((u.uprops[GLIB_LP].intrinsic & TIMEOUT_AP) + d_lp(2, 10));
        } else if (!Blind()) {
            await pline(`${Tobjnam_lp(obj, "flicker")} for a moment, then ${otense_lp(obj, "die")}.`);
        } else {
            await pline(nothing_seems_to_happen_lp);
        }
    } else {
        if (lamp) { /* lamp or lantern */
            check_unpaid_lp(obj);
            await pline(`${Shk_Your_lp(obj)}${lamp} is now on.`);
        } else { /* candle(s) */
            throw new Error('use_lamp(): lighting candles not ported yet');
        }
        begin_burn_lp(obj, false);
    }
}

// C ref: apply.c fig_transform()
/* figurine timeout callback */
export async function fig_transform(arg, timeout) {
    throw new Error('fig_transform() not ported yet');
}
