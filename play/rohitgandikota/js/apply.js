// apply.js — the 'a' command.
// C ref: src/apply.c

import { game } from './gstate.js';
import { ONAMES } from './objects_data.js';
import { ECMD_OK, ECMD_TIME } from './const.js';
import { getobj } from './invent.js';
import { getdir, get_adjacent_loc } from './cmd.js';
import { pick_lock } from './lock.js';
import { is_pick, is_axe } from './mon.js';
import { is_pole } from './u_init.js';
import { Hallucination, Deaf } from './youprop.js';
import { GETOBJ_SUGGEST, GETOBJ_DOWNPLAY, GETOBJ_EXCLUDE, GETOBJ_EXCLUDE_SELECTABLE } from './invent.js';
import { OCLASSES } from './objects_data.js';
import { ustatusline } from './insight.js';
import { You_cant, You_hear } from './pline.js';
import { m_at } from './mon.js';
import { rn2 } from './rng.js';
import { isok, ECMD_CANCEL } from './const.js';

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

    note_unported_apply(`apply:otyp=${obj.otyp}`);
    return ECMD_OK;
}
