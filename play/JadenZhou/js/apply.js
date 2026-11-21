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
import { is_graystone } from './iactions.js';
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
import { cansee } from './vision.js';
import { closed_door, sobj_at } from './makemon.js';
import { t_at } from './trap.js';
import { dist2 } from './hacklib.js';
import { ACURR } from './attrib.js';
import { SPE_JUMPING, BOULDER } from './objects.js';
import { ECMD_TIME, ECMD_FAIL, JUMPING, PASSES_WALLS, LEVITATION, WOUNDED_LEGS,
         INTRINSIC, UNENCUMBERED, A_STR, TT_PIT, IS_STWALL, IS_DOOR, D_ISOPEN,
         ACCESSIBLE, isok, u_at, Is_airlevel, Is_waterlevel } from './const.js';

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
    throw new Error('dorub(): rubbing (wield_tool()/dorub effects) not ported yet');
}

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
    if (!retouch_object(obj))
        return ECMD_TIME; /* evading your grasp costs a turn; just be
                             grateful that you don't drop it as well */

    if (obj.oclass === WAND_CLASS)
        throw new Error('doapply(): do_break_wand() not ported yet');

    if (obj.oclass === SPBOOK_CLASS)
        throw new Error('doapply(): flip_through_book() not ported yet');

    if (obj.oclass === COIN_CLASS)
        throw new Error('doapply(): flip_coin() not ported yet');

    switch (obj.otyp) {
    case O.BLINDFOLD:
    case O.LENSES:
        throw new Error('doapply(): Blindf_on()/Blindf_off() not ported yet');
    case CREAM_PIE:
        throw new Error('doapply(): use_cream_pie() not ported yet');
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
        throw new Error('doapply(): use_container() not ported yet');
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
        throw new Error('doapply(): use_stethoscope() not ported yet');
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
        throw new Error('doapply(): use_lamp() not ported yet');
    case POT_OIL:
        throw new Error('doapply(): light_cocktail() not ported yet');
    case O.EXPENSIVE_CAMERA:
        throw new Error('doapply(): use_camera() not ported yet');
    case O.TOWEL:
        throw new Error('doapply(): use_towel() not ported yet');
    case O.CRYSTAL_BALL:
        throw new Error('doapply(): use_crystal_ball() not ported yet');
    case O.MAGIC_MARKER:
        throw new Error('doapply(): dowrite() not ported yet');
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
        throw new Error('doapply(): do_play_instrument() not ported yet');
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
