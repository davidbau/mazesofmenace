// dig.js — digging.
// C ref: src/dig.c
//
// Only monster tunneling (mdig_tunnel) and its draft messages are ported so
// far; the hero's dig occupation and zap_dig record when reached.

import { game } from './gstate.js';
import { rn1, rn2, rnd } from './rng.js';
import { newsym, canseemon, pline } from './display.js';
import { You_feel, You_hear } from './pline.js';
import { unblock_point, recalc_block_point } from './vision.js';
import { cvt_sdoor_to_door } from './detect.js';
import { mksobj_at } from './mkobj.js';
import { sobj_at, obj_extract_self } from './invent.js';
import { ONAMES } from './objects_data.js';
import { ACURR, exercise } from './attrib.js';
import { sgn } from './hacklib.js';
import { Hallucination } from './youprop.js';
import { IS_OBSTRUCTED, IS_TREE, IS_WALL, IS_STWALL, SDOOR, SCORR, CORR,
         ROOM, DOOR, D_NODOOR, D_BROKEN, D_TRAPPED, D_LOCKED, D_CLOSED,
         W_NONDIGGABLE, SHOPBASE, A_STR, A_DEX, A_CON, A_CHA, A_INT,
         A_WIS } from './const.js';

function note_unported_dig(what) {
    (game.unported ||= new Set()).add(what);
}

/* pray.c STRIDENT */
const STRIDENT = 4;

/* src/mkobj.c:1978 treefruits[] */
const treefruits = [ONAMES.APPLE, ONAMES.ORANGE, ONAMES.PEAR,
                    ONAMES.BANANA, ONAMES.EUCALYPTUS_LEAF];

// src/mkobj.c:1984 rnd_treefruit_at()
export function rnd_treefruit_at(x, y) {
    return mksobj_at(treefruits[rn2(treefruits.length)], x, y, true, false);
}

/* include/rm.h closed_door() */
function closed_door(x, y) {
    const lev = game.level.at(x, y);
    return !!lev && lev.typ === DOOR
        && (lev.doormask & (D_LOCKED | D_CLOSED)) !== 0;
}

// src/dig.c:1503 draft_message() — feeling the air change when a door or
// passage is breached somewhere.
export async function draft_message(unexpected) {
    if (unexpected) {
        if (!Hallucination())
            await You_feel('an unexpected draft.');
        else
            await You_feel(`like you are ${
                (ACURR(A_STR) < 6 || ACURR(A_DEX) < 6 || ACURR(A_CON) < 6
                 || ACURR(A_CHA) < 6 || ACURR(A_INT) < 6 || ACURR(A_WIS) < 6)
                ? '4-F' : '1-A'}.`);
    } else {
        if (!Hallucination()) {
            await You_feel('a draft.');
        } else {
            const draft_reaction = ['enlisting', 'marching', 'protesting',
                                    'fleeing'];
            let dridx = rn1(2, 1 - sgn(game.u.ualign?.type ?? 0));
            if ((game.u.ualign?.record ?? 0) < STRIDENT)
                dridx += rn1(3, sgn(game.u.ualign?.type ?? 0) - 1);
            await You_feel(`like ${draft_reaction[dridx]}.`);
        }
    }
}

// src/dig.c:1414 mdig_tunnel() — a tunneling monster eats through the door,
// wall, tree or rock it stands on. TRUE means the monster died (trapped
// door explosion).
export async function mdig_tunnel(mtmp) {
    const pile = rnd(12);
    const here = game.level.at(mtmp.mx, mtmp.my);

    if (here.typ === SDOOR)
        cvt_sdoor_to_door(here);

    /* eats away door if present & closed or locked */
    if (closed_door(mtmp.mx, mtmp.my)) {
        if ((game.in_rooms?.(mtmp.mx, mtmp.my, SHOPBASE) ?? '').length)
            note_unported_dig('mdig_tunnel:add_damage');
        canseemon(mtmp); /* sawit — evaluated before the state change */
        const trapped = (here.doormask & D_TRAPPED) !== 0;
        here.doormask = trapped ? D_NODOOR : D_BROKEN;
        recalc_block_point(mtmp.mx, mtmp.my);
        newsym(mtmp.mx, mtmp.my);
        if (trapped) {
            note_unported_dig('mdig_tunnel:mb_trapped');
        } else {
            if (game.flags?.verbose !== false) {
                if (!rn2(3))    /* !Unaware && — not too often */
                    await draft_message(true);
            }
        }
        return false;
    } else if (here.typ === SCORR) {
        here.typ = CORR;
        here.flags = 0;
        unblock_point(mtmp.mx, mtmp.my);
        newsym(mtmp.mx, mtmp.my);
        await draft_message(false);
        return false;
    } else if (!IS_OBSTRUCTED(here.typ) && !IS_TREE(here.typ)) {
        return false; /* no dig */
    }

    /* only rock, trees, and walls fall through to this point */
    if ((here.wall_info & W_NONDIGGABLE) !== 0)
        return false; /* impossible(); still alive */

    if (IS_WALL(here.typ)) {
        if (game.flags?.verbose !== false && !rn2(5))
            await You_hear('crashing rock.');
        if ((game.in_rooms?.(mtmp.mx, mtmp.my, SHOPBASE) ?? '').length)
            note_unported_dig('mdig_tunnel:add_damage');
        if (game.level.flags?.is_maze_lev) {
            here.typ = ROOM;
            here.flags = 0;
        } else if (game.level.flags?.is_cavernous_lev
                   && !game.level.flags?.town) {
            here.typ = CORR;
            here.flags = 0;
        } else {
            here.typ = DOOR;
            here.doormask = D_NODOOR;
        }
    } else if (IS_TREE(here.typ)) {
        here.typ = ROOM;
        here.flags = 0;
        if (pile && pile < 5)
            rnd_treefruit_at(mtmp.mx, mtmp.my);
    } else {
        here.typ = CORR;
        here.flags = 0;
        if (pile && pile < 5)
            mksobj_at((pile === 1) ? ONAMES.BOULDER : ONAMES.ROCK,
                      mtmp.mx, mtmp.my, true, false);
    }
    newsym(mtmp.mx, mtmp.my);
    if (!sobj_at(ONAMES.BOULDER, mtmp.mx, mtmp.my))
        unblock_point(mtmp.mx, mtmp.my);

    return false;
}

// src/dig.c:2125 rot_organic() — an object rots away. Contents of a rotting
// container become buried objects; a corpse has none, and the burial
// machinery is absent, so a container with contents is recorded.
export function rot_organic(obj) {
    if (obj.cobj && obj.cobj.length)
        (game.unported ||= new Set()).add('dig:rot_organic:bury_contents');
    obj_extract_self(obj);
    /* obfree(obj, NULL) — the object leaves the game; extract already
       removed it from whichever chain held it */
}

// src/dig.c:2146 rot_corpse() — called when a corpse has rotted completely
// away. Draws nothing; the messages and the hider exposure are the
// observable effects.
export async function rot_corpse(obj) {
    const on_floor = obj.where === 1 /* OBJ_FLOOR */;
    const in_invent = obj.where === 3 /* OBJ_INVENT */;
    let x = 0, y = 0;

    if (on_floor) {
        x = obj.ox;
        y = obj.oy;
    } else if (in_invent) {
        if (game.flags?.verbose !== false) {
            const { corpse_xname } = await import('./objnam.js');
            const cname = corpse_xname(obj, null, 8 /* CXN_NO_PFX */);
            const { Your } = await import('./pline.js');
            await Your(`${obj === game.uwep ? 'wielded ' : ''}${cname} rot${
                (obj.quan ?? 1) > 1 ? '' : 's'} away${
                obj === game.uwep ? '!' : '.'}`);
        }
        if (obj.owornmask)
            (game.unported ||= new Set()).add('dig:rot_corpse:worn');
    } else if (obj.where === 4 /* OBJ_MINVENT */) {
        if (obj.owornmask)
            (game.unported ||= new Set()).add('dig:rot_corpse:mon_wep');
    }
    rot_organic(obj);
    if (on_floor) {
        const { m_at } = await import('./mon.js');
        const { hides_under } = await import('./mondata.js');
        const mtmp = m_at(x, y);
        /* a hiding monster may be exposed */
        const objs_left = (game.level?.objects || [])
            .some(o => o.ox === x && o.oy === y);
        if (mtmp && !objs_left && mtmp.mundetected
            && hides_under(game.mons[mtmp.mnum])) {
            mtmp.mundetected = 0;
        }
        newsym(x, y);
    } else if (in_invent) {
        /* update_inventory() — perm_invent only */
    }
}
