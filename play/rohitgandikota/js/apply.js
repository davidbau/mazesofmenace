// apply.js — the 'a' command.
// C ref: src/apply.c

import { game } from './gstate.js';
import { ECMD_OK, ECMD_TIME } from './const.js';
import { getobj } from './invent.js';
import { getdir, get_adjacent_loc } from './cmd.js';
import { pick_lock } from './lock.js';
import { is_pick, is_axe } from './mon.js';
import { is_pole } from './u_init.js';
import { ECMD_FAIL } from './const.js';
import { Hallucination, Deaf } from './youprop.js';
import { GETOBJ_SUGGEST, GETOBJ_DOWNPLAY, GETOBJ_EXCLUDE, GETOBJ_EXCLUDE_SELECTABLE } from './invent.js';
import { OCLASSES } from './objects_data.js';
import { ustatusline } from './insight.js';
import { You_cant, You_hear } from './pline.js';
import { m_at } from './mon.js';
import { rn2 } from './rng.js';
import { isok, ECMD_CANCEL, ACCESSIBLE, IS_STWALL, IS_DOOR, D_ISOPEN } from './const.js';
import { walk_path } from './dothrow.js';
import { closed_door } from './cmd.js';
import { sobj_at } from './invent.js';
import { ONAMES } from './objects_data.js';
import { pline } from './display.js';
import { You, There } from './pline.js';
import { dist2 } from './hacklib.js';
import { cansee } from './vision.js';

function note_unported_apply(what) {
    (game.unported ||= new Set()).add(what);
}

/* src/apply.c:4285 — the lock tools. pick_lock() reaches get_adjacent_loc(),
   so applying one consumes a DIRECTION key. Missing that left the direction to
   run as a movement command, which is exactly what made an earlier attempt at
   this command cost seed0077 a screen: its rogue applies item `e`, the lock
   pick, and the `j` after it is a direction in C and a move in ours. */
const LOCK_TOOLS = [ONAMES.LOCK_PICK, ONAMES.CREDIT_CARD, ONAMES.SKELETON_KEY];

/* src/apply.c — these five reach getdir() through use_whip, use_stethoscope,
   use_mirror, use_camera and use_figurine. */
const NEEDS_DIR = [ONAMES.BULLWHIP, ONAMES.MIRROR,
                   ONAMES.EXPENSIVE_CAMERA, ONAMES.FIGURINE];

/* src/apply.c:4344 — use_lamp() is void, so doapply's `int res = ECMD_TIME`
   survives and applying a lamp takes a turn. */
const LAMPS = [ONAMES.OIL_LAMP, ONAMES.MAGIC_LAMP, ONAMES.BRASS_LANTERN];

// src/apply.c:4151 apply_ok() — the getobj filter for 'a'.
//
// The graystone dknown/touchstone refinement needs discovery state that is
// live, so it is ported whole; the final arm is EXCLUDE_SELECTABLE, which
// keeps unlisted items pickable via '*' with "Sorry, I don't know how to use
// that." when one is forced.
/* include/obj.h is_graystone() */
const is_graystone = (o) =>
    o.otyp === ONAMES.LUCKSTONE || o.otyp === ONAMES.LOADSTONE
    || o.otyp === ONAMES.FLINT || o.otyp === ONAMES.TOUCHSTONE;

export function apply_ok(obj) {
    if (!obj)
        return GETOBJ_EXCLUDE;

    /* all tools, all wands (breaking), all spellbooks (flipping through) */
    if (obj.oclass === OCLASSES.TOOL_CLASS || obj.oclass === OCLASSES.WAND_CLASS
        || obj.oclass === OCLASSES.SPBOOK_CLASS)
        return GETOBJ_SUGGEST;

    /* applying coins to flip them is a minor easter egg */
    if (obj.oclass === OCLASSES.COIN_CLASS)
        return GETOBJ_DOWNPLAY;

    /* certain weapons */
    if (obj.oclass === OCLASSES.WEAPON_CLASS
        && (is_pick(obj) || is_axe(obj) || is_pole(obj)
            || obj.otyp === ONAMES.BULLWHIP))
        return GETOBJ_SUGGEST;

    if (obj.oclass === OCLASSES.POTION_CLASS) {
        /* permit applying unknown potions, but don't suggest them */
        if (!obj.dknown || !game.objects[obj.otyp].oc_name_known)
            return GETOBJ_DOWNPLAY;

        /* only applicable potion is oil, suggested once discovered */
        if (obj.otyp === ONAMES.POT_OIL)
            return GETOBJ_SUGGEST;
    }

    /* certain foods */
    if (obj.otyp === ONAMES.CREAM_PIE || obj.otyp === ONAMES.EUCALYPTUS_LEAF
        || obj.otyp === ONAMES.LUMP_OF_ROYAL_JELLY)
        return GETOBJ_SUGGEST;

    if (obj.otyp === ONAMES.BANANA && Hallucination())
        return GETOBJ_DOWNPLAY;

    if (is_graystone(obj)) {
        if (!obj.dknown)
            return GETOBJ_SUGGEST;

        if (obj.otyp !== ONAMES.TOUCHSTONE
            && (game.objects[ONAMES.TOUCHSTONE].oc_name_known
                || game.objects[obj.otyp].oc_name_known))
            return GETOBJ_EXCLUDE_SELECTABLE;

        return GETOBJ_SUGGEST;
    }

    return GETOBJ_EXCLUDE_SELECTABLE;
}

// src/apply.c:318 use_stethoscope() — apply a stethoscope.
//
// THE TIME RULE: the first use in a hero turn is free; the second in the
// same turn costs the move (hero_seq vs context.stethoscope_seq). The
// engulfed-interference rn2 cannot fire (no engulfing yet); the steed,
// swallow, dz (floor/ceiling) and monster arms are recorded; the cursed
// heartbeat coin-flip rn2(2) is real.
async function use_stethoscope(obj) {
    /* nohands/freehand: un-polymorphed hero with free hands; a welded
       two-hander would matter and is recorded */
    if (Deaf()) {
        await You_cant("hear anything!");
        return ECMD_OK;
    }
    if (game.u.uwep && game.u.uwep.cursed && game.u.uwep.bknown)
        note_unported_apply('use_stethoscope:freehand');

    if (!await getdir(null))
        return ECMD_CANCEL;

    const res = (game.hero_seq === game.context.stethoscope_seq)
        ? ECMD_TIME : ECMD_OK;
    game.context.stethoscope_seq = game.hero_seq;

    if (game.u.usteed && game.u.dz > 0) {
        note_unported_apply('use_stethoscope:steed');
        return res;
    }
    if (game.u.dz) {
        note_unported_apply('use_stethoscope:dz');
        return res;
    }
    if (obj.cursed && !rn2(2)) {
        await You_hear("your heart beat.");
        return res;
    }
    /* confdir(FALSE) is a no-op for an unimpaired hero */
    if (game.u.uprops?.CONFUSION?.intrinsic || game.u.uprops?.STUNNED?.intrinsic)
        note_unported_apply('use_stethoscope:confdir');
    if (!game.u.dx && !game.u.dy) {
        await ustatusline();
        return res;
    }
    const rx = game.u.ux + game.u.dx, ry = game.u.uy + game.u.dy;
    if (!isok(rx, ry)) {
        await You_hear("a faint typing noise.");
        return ECMD_OK;
    }
    const mtmp = m_at(rx, ry);
    if (mtmp) {
        note_unported_apply('use_stethoscope:mstatusline');
        return res;
    }
    note_unported_apply('use_stethoscope:location');
    return res;
}

// src/apply.c doapply() — the 'a' command.
export async function doapply() {
    const obj = await getobj('use or apply', apply_ok, 0);

    if (!obj)
        return ECMD_OK; /* ECMD_CANCEL */

    if (LOCK_TOOLS.includes(obj.otyp)) {
        /* src/apply.c:4288 — ECMD_TIME when pick_lock() did anything at all
           (learned something or started picking), ECMD_OK otherwise */
        return (await pick_lock(obj, 0, 0, null)) !== 0 ? ECMD_TIME : ECMD_OK;
    }

    if (obj.otyp === ONAMES.STETHOSCOPE)
        return await use_stethoscope(obj);

    if (NEEDS_DIR.includes(obj.otyp)) {
        if (!await getdir(null))
            return ECMD_OK;
        note_unported_apply(`apply:dir otyp=${obj.otyp}`);
        return ECMD_TIME;
    }

    if (LAMPS.includes(obj.otyp))
        return ECMD_TIME;

    /* src/apply.c doapply's switch: an otyp with a real case whose handler
       is not ported yet is recorded; anything else falls to C's default
       arm, which is fully defined: pole-arms and diggers get their use
       functions, everything else is refused with a message. */
    if (APPLY_CASED_OTYPS.has(obj.otyp)) {
        note_unported_apply(`apply:otyp=${obj.otyp}`);
        return ECMD_OK;
    }
    if (is_pole(obj)) {
        note_unported_apply('apply:use_pole');
        return ECMD_OK;
    }
    if (is_pick(obj) || is_axe(obj)) {
        note_unported_apply('apply:use_pick_axe');
        return ECMD_OK;
    }
    await pline("Sorry, I don't know how to use that.");
    return ECMD_FAIL;
}

/* src/apply.c:4280 — the otyps doapply's switch names explicitly */
const APPLY_CASED_OTYPS = new Set([
    'BLINDFOLD', 'LENSES', 'CREAM_PIE', 'LUMP_OF_ROYAL_JELLY', 'BULLWHIP',
    'GRAPPLING_HOOK', 'LARGE_BOX', 'CHEST', 'ICE_BOX', 'SACK',
    'BAG_OF_HOLDING', 'OILSKIN_SACK', 'BAG_OF_TRICKS', 'CAN_OF_GREASE',
    'LOCK_PICK', 'CREDIT_CARD', 'SKELETON_KEY', 'PICK_AXE',
    'DWARVISH_MATTOCK', 'TINNING_KIT', 'LEASH', 'SADDLE', 'MAGIC_WHISTLE',
    'TIN_WHISTLE', 'EUCALYPTUS_LEAF', 'STETHOSCOPE', 'MIRROR', 'BELL',
    'BELL_OF_OPENING', 'CANDELABRUM_OF_INVOCATION', 'WAX_CANDLE',
    'TALLOW_CANDLE', 'OIL_LAMP', 'MAGIC_LAMP', 'BRASS_LANTERN', 'POT_OIL',
    'EXPENSIVE_CAMERA', 'TOWEL', 'CRYSTAL_BALL', 'MAGIC_MARKER',
    'TIN_OPENER', 'FIGURINE', 'UNICORN_HORN', 'WOODEN_FLUTE', 'MAGIC_FLUTE',
    'TOOLED_HORN', 'FROST_HORN', 'FIRE_HORN', 'WOODEN_HARP', 'MAGIC_HARP',
    'BUGLE', 'LEATHER_DRUM', 'DRUM_OF_EARTHQUAKE', 'HORN_OF_PLENTY',
    'LAND_MINE', 'BEARTRAP', 'FLINT', 'LUCKSTONE', 'LOADSTONE',
    'TOUCHSTONE', 'BANANA',
].map((k) => ONAMES[k]).filter((v) => v !== undefined));


// src/apply.c:1997 is_valid_jump_pos() — can the hero jump to <x,y>?
//
// The first arm is the one every recorded jump takes: without a jumping
// intrinsic the destination must be a knight's move away, distu == 5. The
// door-trajectory tail (which decides whether a diagonal jump can leave or
// enter a doorway) is recorded.
/* src/apply.c:1997 — C prints inline and returns FALSE. Our pline is async
   and get_valid_jump_position() is called from a sync path, so the test
   returns the reason C would have printed (null when the jump is legal) and
   the caller with a message to give prints it. The tests and their order are
   C's exactly. */
export function jump_pos_failure(x, y, magic) {
    const distu = dist2(x, y, game.u.ux, game.u.uy);

    if (!magic && !game.u.uprops?.JUMPING && distu !== 5)
        return { pline: 'Illegal move!' };
    if (distu > (magic ? 6 + magic * 3 : 9))
        return { pline: 'Too far!' };
    if (!isok(x, y))
        return { You: 'cannot jump there!' };
    if (!cansee(x, y))
        return { You: 'cannot see where to land!' };

    /* src/apply.c:2003 — classify the trajectory so the door checks below
       can tell a horizontal jump from a vertical one. Knight's moves and
       other irregular directions are flattened onto the nearest axis. */
    const dx = x - game.u.ux, dy = y - game.u.uy;
    let ax = Math.abs(dx), ay = Math.abs(dy);
    const diag = (magic || game.u.uprops?.PASSES_WALLS || (!dx && !dy)) ? jAny
               : !dy ? jHorz : !dx ? jVert : jDiag;
    if (ax >= 2 * ay)
        ay = 0;
    else if (ay >= 2 * ax)
        ax = 0;
    const traj = (magic || game.u.uprops?.PASSES_WALLS || (!ax && !ay)) ? jAny
               : !ay ? jHorz : !ax ? jVert : jDiag;

    const lev = game.level?.at(game.u.ux, game.u.uy);
    if (diag === jDiag && IS_DOOR(lev?.typ) && (lev.doormask & D_ISOPEN))
        return { You_cant: 'jump diagonally out of a doorway.' };
    if (!walk_path({ x: game.u.ux, y: game.u.uy }, { x, y },
                   check_jump, traj))
        return { There: 'is an obstacle preventing that jump.' };
    return null;
}

// src/apply.c:2065 — the caller that wants the messages.
export async function is_valid_jump_pos(x, y, magic, showmsg) {
    const fail = jump_pos_failure(x, y, magic);
    if (!fail)
        return true;
    if (showmsg) {
        if (fail.pline) await pline(fail.pline);
        else if (fail.You) await You(fail.You);
        else if (fail.You_cant) await You_cant(fail.You_cant);
        else if (fail.There) await There(fail.There);
    }
    return false;
}

/* src/apply.c:1975 — the jump trajectory classes. */
const jAny = 0, jHorz = 1, jVert = 2, jDiag = 3;

// src/apply.c:1980 check_jump() — walk_path's per-square callback.
function check_jump(traj, x, y) {
    const lev = game.level?.at(x, y);

    if (game.u.uprops?.PASSES_WALLS)
        return true;
    if (IS_STWALL(lev?.typ))
        return false;
    if (IS_DOOR(lev?.typ)) {
        if (closed_door(x, y))
            return false;
        if ((lev.doormask & D_ISOPEN) && traj !== jAny
            && (traj === jDiag
                || ((traj & jHorz) !== 0) === (!!lev.horizontal)))
            return false;
        /* empty doorways aren't restricted */
    }
    if (sobj_at(ONAMES.BOULDER, x, y))
        return false;                   /* throws_rocks: no giant hero here */
    return true;
}

// src/apply.c:2035 get_valid_jump_position()
export function get_valid_jump_position(x, y) {
    return isok(x, y)
           && (ACCESSIBLE(game.level?.at(x, y)?.typ)
               || game.u.uprops?.PASSES_WALLS)
           && !jump_pos_failure(x, y, game.jumping_is_magic);
}
