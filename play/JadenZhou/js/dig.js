// dig.js -- burying objects (C ref: dig.c), plus dbridge.c is_ice().
//
// Only the parts reached during level creation are ported so far.

import { game } from './gstate.js';
import { in_town } from './hack.js';
import { rnd, rn2 } from './rng.js';
import { cvt_sdoor_to_door } from './detect.js';
import { canseemon, newsym, pline, Hallucination } from './display.js';
import { You_hear } from './sounds.js';
import { mksobj_at } from './mkobj.js';
import { acurr } from './attrib.js';
import { start_timer, obj_to_any } from './timeout.js';
import { TIMER_OBJECT, ROT_ORGANIC, CXN_NO_PFX, OBJ_AT, u_at } from './const.js';
import { corpse_xname, otense } from './objnam.js';
import { Your } from './display.js';
import { remove_worn_item } from './steal.js';
import { setmnotwielded } from './weapon.js';
import { hideunder_async as hideunder, m_at } from './makemon.js';
import { stop_occupation } from './allmain.js';
import { obfree } from './invent.js';
import { M1_CONCEAL } from './monsters.js';

/* C ref: mondata.h hides_under() */
function hides_under(ptr) { return (ptr.mflags1 & M1_CONCEAL) !== 0; }
/* C ref: invent.c update_inventory() -- no perm_invent window */
function update_inventory() { }
import { Unaware } from './eat.js';
import { D_TRAPPED, D_BROKEN, SCORR, A_STR, A_INT, A_WIS, A_DEX, A_CON,
         A_CHA } from './const.js';
import { ICE, DRAWBRIDGE_UP, DB_UNDER, DB_ICE, isok } from './const.js';
import {
    ROCK, BOULDER, CORPSE, LEASH, POT_OIL, POTION_CLASS, is_organic,
} from './objects.js';
import { obj_resists } from './dogmove.js';
import { DIGTYP_UNDIGGABLE, DIGTYP_ROCK, DIGTYP_STATUE, DIGTYP_BOULDER,
         DIGTYP_DOOR, DIGTYP_TREE, IS_OBSTRUCTED, IS_WALL, TREE, TT_PIT,
         FLYING, P_AXE, is_pit } from './const.js';
import { objects, STATUE, PICK_AXE, DWARVISH_MATTOCK, WEAPON_CLASS,
         TOOL_CLASS } from './objects.js';
import { closed_door, sobj_at } from './makemon.js';
import { t_at } from './trap.js';
import { bimanual } from './wield.js';
import { rn1 } from './rng.js';
import { SDOOR, DOOR, CORR, ROOM, FOUNTAIN, SHOPBASE, W_NONDIGGABLE, D_NODOOR,
         IS_STWALL, IS_TREE, Is_earthlevel } from './const.js';
import { in_rooms } from './hack.js';
import { cansee, recalc_block_point, unblock_point } from './vision.js';
import { pline_The, tmp_at, DISP_BEAM, DISP_END } from './display.js';
import { COLNO, TT_BURIEDBALL } from './const.js';
import { HEAVY_IRON_BALL } from './objects.js';
import { dist2 } from './hacklib.js';
import { reset_utrap } from './trap.js';
import { del_engr_at } from './engrave.js';
import { punish } from './read.js';
import { obj_extract_self as mkobj_obj_extract_self } from './mkobj.js';
import { ROWNO as ROWNO_DG, LAVAPOOL as LAVAPOOL_DG, MOAT as MOAT_DG,
         POOL as POOL_DG } from './const.js';
import { is_moat as is_moat_dg, is_pool as is_pool_dg,
         is_lava as is_lava_dg } from './makemon.js';
import { mb_trapped } from './monmove.js';

/* C ref: obj.h is_pick(), is_axe() */
function is_pick(otmp) {
    return otmp.otyp === PICK_AXE || otmp.otyp === DWARVISH_MATTOCK;
}
function is_axe(otmp) {
    return ((otmp.oclass === WEAPON_CLASS || otmp.oclass === TOOL_CLASS)
            && objects[otmp.otyp].oc_skill === P_AXE);
}

// C ref: dig.c pick_can_reach()
function pick_can_reach(pick, x, y) {
    const u = game.u;
    const t = t_at(x, y);
    /* tseen: pit only affects item positioning when it is known */
    const target_in_pit = !!t && is_pit(t.ttyp) && !!t.tseen;

    /* if hero is in a pit, pick can only reach if the statue is too and
       the two pits are conjoined or the statue isn't and pick is two-handed;
       this applies to hero in pit trying to reach an adjcacent boulder too */
    if (u.utrap && u.utraptype === TT_PIT) {
        if (target_in_pit)
            throw new Error('pick_can_reach(): conjoined_pits() not ported yet');
        return bimanual(pick);
    }

    /* when hero isn't in a pit, a mattock or flying hero w/ pick can reach
       whether or not the statue is in a pit */
    const Flying = !!(u.uprops?.[FLYING]?.intrinsic || u.uprops?.[FLYING]?.extrinsic);
    if (bimanual(pick) || Flying)
        return true;
    /* one-handed pick-axe can reach if statue isn't in a pit */
    if (!target_in_pit)
        return true;

    return false;
}

// C ref: dig.c dig_typ()
/* When digging into location <x,y>, what are you actually digging into? */
export function dig_typ(otmp, x, y) {
    if (!isok(x, y) || !otmp || (!is_pick(otmp) && !is_axe(otmp)))
        return DIGTYP_UNDIGGABLE;

    const ltyp = game.level.at(x, y).typ;
    if (is_axe(otmp))
        return closed_door(x, y) ? DIGTYP_DOOR
               : (ltyp === TREE) ? DIGTYP_TREE /* axe vs tree */
                 : DIGTYP_UNDIGGABLE;
    /*assert(is_pick(otmp));*/
    return (sobj_at(STATUE, x, y) && pick_can_reach(otmp, x, y))
           ? DIGTYP_STATUE
           : (sobj_at(BOULDER, x, y) && pick_can_reach(otmp, x, y))
             ? DIGTYP_BOULDER
             : closed_door(x, y) ? DIGTYP_DOOR
               : (ltyp === TREE) ? DIGTYP_UNDIGGABLE /* pick vs tree */
                 : (IS_OBSTRUCTED(ltyp)
                    && (!game.level.flags?.arboreal || IS_WALL(ltyp)))
                   ? DIGTYP_ROCK
                   : DIGTYP_UNDIGGABLE;
}

// C ref: dbridge.c is_ice()
export function is_ice(x, y) {
    if (!isok(x, y))
        return false;
    const loc = game.level.at(x, y);
    const ltyp = loc.typ;
    if (ltyp === ICE || (ltyp === DRAWBRIDGE_UP
                         && ((loc.drawbridgemask || 0) & DB_UNDER) === DB_ICE))
        return true;
    return false;
}

// C ref: mkobj.c obj_extract_self() / remove_object() -- the cases
// bury_an_obj() reaches: floor objects live in game.level.objects.
function obj_extract_self(obj) {
    switch (obj.where) {
    case 'OBJ_FLOOR': {
        const fobj = game.level.objects || [];
        const i = fobj.indexOf(obj);
        if (i >= 0)
            fobj.splice(i, 1);
        obj.where = 'OBJ_FREE';
        break;
    }
    case 'OBJ_FREE':
        break;
    default:
        throw new Error(`obj_extract_self: where=${obj.where} is not ported yet`);
    }
}

// C ref: dig.c add_to_buried()
export function add_to_buried(obj) {
    if (obj.where !== 'OBJ_FREE')
        throw new Error('add_to_buried: obj not free');
    obj.where = 'OBJ_BURIED';
    /* obj->nobj = svl.level.buriedobjlist; buriedobjlist = obj; */
    if (!game.level.buriedobjlist) game.level.buriedobjlist = [];
    game.level.buriedobjlist.unshift(obj);
}

// C ref: dig.c bury_an_obj()
/* Returns the next object in the pile (otmp->nexthere); the floor pile
   is read from game.level.objects. dealloced (optional) gets .v set. */
export function bury_an_obj(otmp, dealloced) {
    if (dealloced)
        dealloced.v = false;
    if (otmp === game.uball)
        throw new Error('bury_an_obj: burying the iron ball is not ported yet');
    /* after unpunish(), or might get deallocated chain */
    const pile = (game.level.objects || []).filter(
        o => o.ox === otmp.ox && o.oy === otmp.oy);
    const otmp2 = pile[pile.indexOf(otmp) + 1] || null;
    /*
     * obj_resists(,0,0) prevents Rider corpses from being buried.
     * It also prevents The Amulet and invocation tools from being
     * buried.
     */
    if (otmp === game.uchain || obj_resists(otmp, 0, 0))
        return otmp2;

    if (otmp.otyp === LEASH && otmp.leashmon)
        throw new Error('bury_an_obj: o_unleash() is not ported yet');

    if (otmp.lamplit && otmp.otyp !== POT_OIL)
        throw new Error('bury_an_obj: end_burn() is not ported yet');

    obj_extract_self(otmp);

    const under_ice = is_ice(otmp.ox, otmp.oy);
    if ((otmp.otyp === ROCK && !under_ice) || otmp.otyp === BOULDER) {
        /* merges into burying material; boulder removal is for #wizbury */
        if (dealloced)
            dealloced.v = true;
        /* obfree(otmp, (struct obj *) 0): nothing to free in JS */
        otmp.where = 'OBJ_DELETED';
        return otmp2;
    }
    /*
     * Start a rot on organic material.  Not corpses -- they
     * are already handled.
     */
    if (otmp.otyp === CORPSE) {
        ; /* should cancel timer if under_ice */
    } else if ((under_ice ? (otmp.oclass === POTION_CLASS) : is_organic(otmp))
               && !obj_resists(otmp, 5, 95)) {
        start_timer((under_ice ? 0 : 250) + rnd(250),
                    TIMER_OBJECT, ROT_ORGANIC, obj_to_any(otmp));
    }
    add_to_buried(otmp);
    return otmp2;
}

// C ref: dig.c rot_organic()
/*
 * Called when a buried object has rotted away.
 */
export async function rot_organic(arg, timeout) {
    const obj = arg.a_obj;

    while (obj.cobj && obj.cobj.length) { /* Has_contents(obj) */
        /* We don't need to place contained object on the floor
           first, but we do need to update its map coordinates. */
        obj.cobj[0].ox = obj.ox, obj.cobj[0].oy = obj.oy;
        /* Everything which can be held in a container can also be
           buried, so bury_an_obj's use of obj_extract_self insures
           that Has_contents(obj) will eventually become false. */
        bury_an_obj(obj.cobj[0], null);
    }
    mkobj_obj_extract_self(obj);
    obfree(obj, null);
}

// C ref: dig.c rot_corpse()
/*
 * Called when a corpse has rotted completely away.
 */
export async function rot_corpse(arg, timeout) {
    let x = 0, y = 0;
    const obj = arg.a_obj;
    const on_floor = obj.where === 'OBJ_FLOOR',
        in_invent = obj.where === 'OBJ_INVENT';

    if (on_floor) {
        x = obj.ox;
        y = obj.oy;
    } else if (in_invent) {
        if (game.flags.verbose) {
            const cname = corpse_xname(obj, null, CXN_NO_PFX);

            await Your(`${(obj === game.uwep) ? "wielded " : ""}${cname} ${
                otense(obj, "rot")} away${(obj === game.uwep) ? '!' : '.'}`);
        }
        if (obj.owornmask) {
            await remove_worn_item(obj, true);
            await stop_occupation();
        }
    } else if (obj.where === 'OBJ_MINVENT') {
        if (obj.owornmask && obj === obj.ocarry.mw) /* MON_WEP(obj->ocarry) */
            setmnotwielded(obj.ocarry, obj); /* clears owornmask */
    } else if (obj.where === 'OBJ_MIGRATING') {
        /* clear destination flag so that obfree()'s check for
           freeing a worn object doesn't get a false hit */
        obj.owornmask = 0;
    }
    await rot_organic(arg, timeout);
    if (on_floor) {
        const mtmp = m_at(x, y);

        /* a hiding monster may be exposed */
        if (mtmp && !OBJ_AT(x, y) && mtmp.mundetected
            && hides_under(mtmp.data)) {
            mtmp.mundetected = 0;
        } else if (u_at(x, y)
                   && game.u.uundetected && hides_under(game.youmonst.data))
            await hideunder(game.youmonst);
        newsym(x, y);
    } else if (in_invent)
        update_inventory();
}

// C ref: dig.c holetime()
/* When will hole be finished? Very rough indication used by shopkeeper. */
export function holetime() {
    /* dig() (the digging occupation) is not ported yet, so go.occupation
       cannot be dig() */
    if (!game.occupation || game.occupation.name !== 'dig' || !game.u.ushops)
        return -1;
    throw new Error('holetime(): digging effort not ported yet');
}

/* C ref: hack.c may_dig() */
export function may_dig(x, y) {
    const lev = game.level.at(x, y);
    return !((IS_STWALL(lev.typ) || IS_TREE(lev.typ))
             && ((lev.wall_info ?? 0) & W_NONDIGGABLE));
}


// C ref: dig.c fillholetyp()
/* When digging a hole or exploding a land mine next to liquid, the
   hole may fill in */
export function fillholetyp(x, y,
                            fill_if_any) { /* force filling if it exists at all */
    let x1, y1;
    const lo_x = Math.max(1, x - 1), hi_x = Math.min(x + 1, COLNO - 1),
          lo_y = Math.max(0, y - 1), hi_y = Math.min(y + 1, ROWNO_DG - 1);
    let pool_cnt = 0, moat_cnt = 0, lava_cnt = 0;

    for (x1 = lo_x; x1 <= hi_x; x1++)
        for (y1 = lo_y; y1 <= hi_y; y1++)
            if (is_moat_dg(x1, y1))
                moat_cnt++;
            else if (is_pool_dg(x1, y1))
                /* This must come after is_moat since moats are pools
                 * but not vice-versa. */
                pool_cnt++;
            else if (is_lava_dg(x1, y1))
                lava_cnt++;

    if (!fill_if_any)
        pool_cnt = Math.trunc(pool_cnt / 3); /* not as much liquid as the others */

    if ((lava_cnt > moat_cnt + pool_cnt && rn2(lava_cnt + 1))
        || (lava_cnt && fill_if_any))
        return LAVAPOOL_DG;
    else if ((moat_cnt > 0 && rn2(moat_cnt + 1)) || (moat_cnt && fill_if_any))
        return MOAT_DG;
    else if ((pool_cnt > 0 && rn2(pool_cnt + 1)) || (pool_cnt && fill_if_any))
        return POOL_DG;
    else
        return ROOM;
}

// C ref: dig.c is_digging()
/* the hero's occupation is the dig() occupation */
export function is_digging() {
    if (game.occupation && game.occupation.name === 'dig') {
        return true;
    }
    return false;
}

// C ref: dig.c watch_dig() -- town watchmen react to digging
export function watch_dig(mtmp, x, y, zap) {
    const lev = game.level.at(x, y);
    void mtmp; void zap;

    if (in_town(x, y)
        && (closed_door(x, y) || lev.typ === SDOOR || IS_WALL(lev.typ)
            || lev.typ === FOUNTAIN || IS_TREE(lev.typ)))
        throw new Error('watch_dig(): town watch reaction not ported yet');
}

// C ref: dig.c mdig_tunnel()
/* digging by monster.  No digging into hero's location.
   Returns TRUE if monster died, FALSE otherwise. */
export async function mdig_tunnel(mtmp) {
    const g = game;
    let sawit, seeit, trapped;
    const pile = rnd(12);

    const here = g.level.at(mtmp.mx, mtmp.my);
    if (here.typ === SDOOR)
        cvt_sdoor_to_door(here); /* ->typ = DOOR */

    /* Eats away door if present & closed or locked */
    if (closed_door(mtmp.mx, mtmp.my)) {
        if (in_rooms(mtmp.mx, mtmp.my, SHOPBASE).length)
            throw new Error('mdig_tunnel(): add_damage() not ported yet');
        /* sawit: closed door location is more visible than an open one */
        sawit = canseemon(mtmp); /* before door state change and unblock_pt */
        trapped = ((here.doormask ?? 0) & D_TRAPPED) ? true : false;
        here.doormask = trapped ? D_NODOOR : D_BROKEN;
        recalc_block_point(mtmp.mx, mtmp.my); /* vision */
        newsym(mtmp.mx, mtmp.my);
        if (trapped) {
            seeit = canseemon(mtmp);
            if (await mb_trapped(mtmp, sawit || seeit)) { /* mtmp is killed */
                newsym(mtmp.mx, mtmp.my);
                return true;
            }
        } else {
            if (g.flags.verbose) {
                if (!Unaware() && !rn2(3)) /* not too often.. */
                    await draft_message(true); /* "You feel an unexpected draft." */
            }
        }
        return false;
    } else if (here.typ === SCORR) {
        here.typ = CORR; here.flags = 0;
        unblock_point(mtmp.mx, mtmp.my);
        newsym(mtmp.mx, mtmp.my);
        await draft_message(false); /* "You feel a draft." */
        return false;
    } else if (!IS_OBSTRUCTED(here.typ) && !IS_TREE(here.typ)) { /* no dig */
        return false;
    }

    /* Only rock, trees, and walls fall through to this point. */
    if (((here.wall_info ?? 0) & W_NONDIGGABLE) !== 0) {
        /* impossible("mdig_tunnel:  %s at (%d,%d) is undiggable", ...) */
        return false; /* still alive */
    }

    if (IS_WALL(here.typ)) {
        /* KMH -- Okay on arboreal levels (room walls are still stone) */
        if (g.flags.verbose && !rn2(5)) {
            /* Soundeffect(se_crashing_rock, 75) */
            await You_hear("crashing rock.");
        }
        if (in_rooms(mtmp.mx, mtmp.my, SHOPBASE).length)
            throw new Error('mdig_tunnel(): add_damage() not ported yet');
        if (g.level.flags.is_maze_lev) {
            here.typ = ROOM; here.flags = 0;
        } else if (g.level.flags.is_cavernous_lev
                   && !in_town(mtmp.mx, mtmp.my)) {
            here.typ = CORR; here.flags = 0;
        } else {
            here.typ = DOOR; here.doormask = D_NODOOR;
        }
    } else if (IS_TREE(here.typ)) {
        here.typ = ROOM; here.flags = 0;
        if (pile && pile < 5)
            throw new Error('mdig_tunnel(): rnd_treefruit_at() not ported yet');
    } else {
        here.typ = CORR; here.flags = 0;
        if (pile && pile < 5)
            mksobj_at((pile === 1) ? BOULDER : ROCK, mtmp.mx, mtmp.my,
                      true, false);
    }
    newsym(mtmp.mx, mtmp.my);
    if (!sobj_at(BOULDER, mtmp.mx, mtmp.my))
        unblock_point(mtmp.mx, mtmp.my); /* vision */

    return false;
}

const STRIDENT = 4; /* from pray.c */

// C ref: dig.c draft_message()
/* draft refers to air currents, but can be a pun on "draft" as conscription
   for military service (probably not a good pun if it has to be explained) */
async function draft_message(unexpected) {
    const u = game.u;
    /*
     * [Bug or TODO?  Have caller pass coordinates and use the travel
     * mechanism to determine whether there is a path between
     * destroyed door (or exposed secret corridor) and hero's location.
     * When there is no such path, no draft should be felt.]
     */

    if (unexpected) {
        if (!Hallucination())
            await pline("You feel an unexpected draft.");
        else
            /* U.S. classification system uses 1-A for eligible to serve
               and 4-F for ineligible due to physical or mental defect;
               some intermediate values exist but are rarely seen */
            await pline("You feel like you are "
                        + ((acurr(A_STR) < 6 || acurr(A_DEX) < 6
                            || acurr(A_CON) < 6 || acurr(A_CHA) < 6
                            || acurr(A_INT) < 6 || acurr(A_WIS) < 6) ? "4-F"
                                                                     : "1-A")
                        + ".");
    } else {
        if (!Hallucination()) {
            await pline("You feel a draft.");
        } else {
            /* "marching" is deliberately ambiguous; it might mean drills
                after entering military service or mean engaging in protests */
            const draft_reaction = [
                "enlisting", "marching", "protesting", "fleeing",
            ];
            const sgn = (n) => (n > 0) - (n < 0);

            /* Lawful: 0..1, Neutral: 1..2, Chaotic: 2..3 */
            let dridx = rn1(2, 1 - sgn(u.ualign.type));
            if (u.ualign.record < STRIDENT)
                /* L: +(0..2), N: +(-1..1), C: +(-2..0); all: 0..3 */
                dridx += rn1(3, sgn(u.ualign.type) - 1);
            await pline("You feel like " + draft_reaction[dridx] + ".");
        }
    }
}

// C ref: dig.c zap_dig() -- digging via wand zap or spell cast
export async function zap_dig() {
    const g = game;
    const u = g.u;
    let room;
    let zx, zy;
    let digdepth;
    let shopdoor, shopwall;

    /*
     * Original effect (approximately):
     * from CORR: dig until we pierce a wall
     * from ROOM: pierce wall and dig until we reach
     * an ACCESSIBLE place.
     * Currently: dig for digdepth positions;
     * also down on request of Lennart Augustsson.
     * 3.6.0: from a PIT: dig one adjacent pit.
     */

    if (u.uswallow)
        throw new Error('zap_dig(): digging out of an engulfer not ported yet');

    if (u.dz)
        throw new Error('zap_dig(): digging up or down not ported yet');

    /* normal case: digging across the level */
    shopdoor = shopwall = false;
    const maze_dig = g.level.flags.is_maze_lev && !Is_earthlevel(u.uz);
    zx = u.ux + u.dx;
    zy = u.uy + u.dy;
    if (u.utrap && u.utraptype === TT_PIT && t_at(u.ux, u.uy))
        throw new Error('zap_dig(): digging sideways from a pit not ported yet');
    digdepth = rn1(18, 8);
    tmp_at(DISP_BEAM, 0); /* cmap_to_glyph(S_digbeam) */
    while (--digdepth >= 0) {
        if (!isok(zx, zy))
            break;
        room = g.level.at(zx, zy);
        tmp_at(zx, zy);
        /* nh_delay_output(): wait a little bit */

        if (closed_door(zx, zy) || room.typ === SDOOR) {
            if (in_rooms(zx, zy, SHOPBASE).length)
                throw new Error('zap_dig(): shop door damage (add_damage()) not ported yet');
            if (room.typ === SDOOR)
                room.typ = DOOR; /* doormask set below */
            else if (cansee(zx, zy))
                await pline_The("door is razed!");
            watch_dig(null, zx, zy, true);
            room.doormask = D_NODOOR;
            recalc_block_point(zx, zy); /* vision */
            digdepth -= 2;
            if (maze_dig)
                break;
        } else if (maze_dig) {
            throw new Error('zap_dig(): digging on a maze level not ported yet');
        } else if (IS_OBSTRUCTED(room.typ)) {
            if (!may_dig(zx, zy))
                break;
            if (IS_WALL(room.typ) || room.typ === SDOOR) {
                if (in_rooms(zx, zy, SHOPBASE).length)
                    throw new Error('zap_dig(): shop wall damage (add_damage()) not ported yet');
                watch_dig(null, zx, zy, true);
                if (g.level.flags.is_cavernous_lev && !in_town(zx, zy)) {
                    room.typ = CORR, room.flags = 0;
                } else {
                    room.typ = DOOR, room.doormask = D_NODOOR;
                }
                digdepth -= 2;
            } else if (IS_TREE(room.typ)) {
                room.typ = ROOM, room.flags = 0;
                digdepth -= 2;
            } else { /* IS_OBSTRUCTED but not IS_WALL or SDOOR */
                room.typ = CORR, room.flags = 0;
                digdepth--;
            }
            unblock_point(zx, zy); /* vision */
        }
        zx += u.dx;
        zy += u.dy;
    } /* while */
    tmp_at(DISP_END, 0); /* closing call */

    /* pitflow is only set by the (unported) pit case above */

    if (shopdoor || shopwall)
        throw new Error('zap_dig(): pay_for_damage() not ported yet');
}

// C ref: dig.c buried_ball()
/* cc is {x, y}; updated to the ball's spot when found nearby */
export function buried_ball(cc) {
    const u = game.u;
    let odist, bdist = COLNO;
    let ball = null;

    /* u.utrap might have already been cleared, in which case the value
       of u.utraptype is no longer meaningful; if u.utrap is still set
       then u.utraptype needs to be for buried ball */
    if (!u.utrap || u.utraptype === TT_BURIEDBALL) {
        for (const otmp of game.level.buriedobjlist || []) {
            if (otmp.otyp !== HEAVY_IRON_BALL)
                continue;
            /* if found at the target spot, we're done */
            if (otmp.ox === cc.x && otmp.oy === cc.y)
                return otmp;
            /* find nearest within allowable vicinity: +/-2
             *  4 5 8
             *  1 2 5
             *  0 1 4
             */
            odist = dist2(otmp.ox, otmp.oy, cc.x, cc.y);
            if (odist <= 8 && (!ball || odist < bdist)) {
                /* remember nearest buried ball but keep checking others */
                ball = otmp;
                bdist = odist;
            }
        }
    }
    if (ball) {
        /* found, but not at < cc->x, cc->y > */
        cc.x = ball.ox;
        cc.y = ball.oy;
    }
    return ball;
}

// C ref: dig.c buried_ball_to_punishment()
export async function buried_ball_to_punishment() {
    const u = game.u;
    const cc = { x: u.ux, y: u.uy };
    const ball = buried_ball(cc);

    if (ball) {
        mkobj_obj_extract_self(ball);
        await punish(ball); /* use ball as flag for unearthed buried ball */
        await reset_utrap(false);
        del_engr_at(cc.x, cc.y);
        newsym(cc.x, cc.y);
    }
}
