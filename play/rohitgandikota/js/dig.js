// dig.js — digging.
// C ref: src/dig.c
//
// Monster tunneling, hero tool digging, draft messages, and lateral wand or
// spell digging are ported. Deep holes and the rarer trap interactions remain
// partial.

import { game } from './gstate.js';
import { rn1, rn2, rnd } from './rng.js';
import { newsym, canseemon, display_cmap_at, flush_screen, pline }
    from './display.js';
import { You, You_cant, You_feel, You_hear, pline_The } from './pline.js';
import { cansee, does_block, unblock_point, recalc_block_point } from './vision.js';
import { cvt_sdoor_to_door } from './detect.js';
import { mksobj_at } from './mkobj.js';
import { sobj_at, obj_extract_self } from './invent.js';
import { ONAMES } from './objects_data.js';
import { ACURR, exercise } from './attrib.js';
import { abon } from './weapon.js';
import { greatest_erosion } from './do_wear.js';
import { isok, sgn } from './hacklib.js';
import { in_rooms, in_town, losehp, may_dig } from './hack.js';
import { Flying, Hallucination, Levitation, Underwater } from './youprop.js';
import { can_reach_floor } from './pickup.js';
import { set_occupation } from './allmain.js';
import { bimanual } from './obj.js';
import { Race_if } from './u_init.js';
import { dbon, do_attack } from './uhitm.js';
import { is_axe, is_lava, is_pick, is_pool, m_at, t_at,
         wake_nearby } from './mon.js';
import { ceiling, surface } from './dungeon.js';
import { simpleonames, Yobjnam2, yname, yobjnam } from './objnam.js';
import { u_wipe_engr } from './engrave.js';
import { PMNAMES } from './monst_data.js';
import { cmap_names } from './drawing_data.js';
import { CLR_WHITE } from './terminal.js';
import { IS_OBSTRUCTED, IS_TREE, IS_WALL, IS_STWALL, SDOOR, SCORR, CORR,
         ROOM, DOOR, D_NODOOR, D_BROKEN, D_TRAPPED, D_LOCKED, D_CLOSED,
         W_NONDIGGABLE, SHOPBASE, A_STR, A_DEX, A_CON, A_CHA, A_INT,
         A_WIS, STONE, Is_earthlevel, Is_airlevel, Is_waterlevel,
         DIGTYP_UNDIGGABLE, DIGTYP_ROCK, DIGTYP_STATUE, DIGTYP_BOULDER,
         DIGTYP_DOOR, DIGTYP_TREE, TT_PIT, KILLED_BY, ECMD_TIME,
         is_pit, SHOP_DOOR_COST, SHOP_WALL_COST } from './const.js';

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

function same_level(a, b) {
    return !!a && !!b && a.dnum === b.dnum && a.dlevel === b.dlevel;
}

function digging_context() {
    const context = game.context ||= {};
    return context.digging ||= {
        pos: { x: 0, y: 0 },
        level: null,
        down: false,
        chew: false,
        warned: false,
        effort: 0,
        quiet: false,
        lastdigtime: 0,
        did_dig_msg: false,
    };
}

function stairway_at(x, y) {
    for (let stway = game.stairs; stway; stway = stway.next)
        if (stway.sx === x && stway.sy === y)
            return stway;
    return null;
}

// src/dig.c:130 pick_can_reach(). The conjoined-pit state is not represented
// outside trap.js yet; every ordinary floor target follows the exact arms
// below.
function pick_can_reach(pick, x, y) {
    const trap = t_at(x, y);
    const target_in_pit = !!(trap && trap.tseen && is_pit(trap.ttyp));

    if (game.u.utrap && game.u.utraptype === TT_PIT) {
        if (target_in_pit) {
            note_unported_dig('pick_can_reach:conjoined_pits');
            return false;
        }
        return bimanual(pick);
    }
    if (bimanual(pick) || Flying())
        return true;
    return !target_in_pit;
}

// src/dig.c:169 dig_typ() -- classify what a pick or axe would strike.
export function dig_typ(obj, x, y) {
    if (!isok(x, y) || !obj || (!is_pick(obj) && !is_axe(obj)))
        return DIGTYP_UNDIGGABLE;

    const typ = game.level.at(x, y).typ;
    if (is_axe(obj)) {
        if (closed_door(x, y)) return DIGTYP_DOOR;
        if (IS_TREE(typ)) return DIGTYP_TREE;
        return DIGTYP_UNDIGGABLE;
    }
    if (sobj_at(ONAMES.STATUE, x, y) && pick_can_reach(obj, x, y))
        return DIGTYP_STATUE;
    if (sobj_at(ONAMES.BOULDER, x, y) && pick_can_reach(obj, x, y))
        return DIGTYP_BOULDER;
    if (closed_door(x, y))
        return DIGTYP_DOOR;
    if (IS_TREE(typ))
        return DIGTYP_UNDIGGABLE;
    if (IS_OBSTRUCTED(typ)
        && (!game.level.flags?.arboreal || IS_WALL(typ)))
        return DIGTYP_ROCK;
    return DIGTYP_UNDIGGABLE;
}

function finish_digging(ctx) {
    ctx.lastdigtime = game.moves;
    ctx.quiet = false;
    ctx.level = null;
}

// src/dig.c:300 dig() -- one turn of the hero's digging occupation.
export async function dig() {
    const u = game.u, ctx = digging_context(), obj = u.uwep;
    const x = ctx.pos.x, y = ctx.pos.y;
    const adjacent = Math.abs(x - u.ux) <= 1 && Math.abs(y - u.uy) <= 1;

    if (u.uswallow || !obj || (!is_pick(obj) && !is_axe(obj))
        || !same_level(ctx.level, u.uz)
        || (ctx.down ? (x !== u.ux || y !== u.uy) : !adjacent))
        return 0;

    if (ctx.down) {
        if (stairway_at(u.ux, u.uy)) {
            await pline_The('stairs are too hard to dig in.');
            return 0;
        }
        note_unported_dig('dig:downward_hole');
    } else {
        const lev = game.level.at(x, y);
        const target = dig_typ(obj, x, y);
        if (IS_TREE(lev.typ) && !may_dig(x, y) && target === DIGTYP_TREE) {
            await pline('This tree seems to be petrified.');
            return 0;
        }
        if (IS_OBSTRUCTED(lev.typ) && !may_dig(x, y)
            && target === DIGTYP_ROCK) {
            await pline(`This wall is too hard to ${is_pick(obj) ? 'dig into'
                                                                  : 'chop through'}.`);
            return 0;
        }
    }

    ctx.effort += 10 + rn2(5) + abon() + (obj.spe || 0)
                  - greatest_erosion(obj) + (u.udaminc || 0);
    if (Race_if(PMNAMES.PM_DWARF))
        ctx.effort *= 2;

    if (ctx.down) {
        if (ctx.effort > 250) {
            note_unported_dig('dig:downward_hole');
            finish_digging(ctx);
            return 0;
        }
        return 1;
    }

    const lev = game.level.at(x, y);
    const target = dig_typ(obj, x, y);
    if (ctx.effort > 100) {
        let message = null;
        if (target === DIGTYP_STATUE || target === DIGTYP_BOULDER) {
            note_unported_dig(target === DIGTYP_STATUE
                              ? 'dig:break_statue' : 'dig:fracture_rock');
            return 0;
        } else if (lev.typ === STONE || lev.typ === SCORR
                   || IS_TREE(lev.typ)) {
            if (target === DIGTYP_TREE) {
                lev.typ = ROOM;
                lev.flags = 0;
                message = 'You cut down the tree.';
                if (!rn2(5))
                    rnd_treefruit_at(x, y);
            } else {
                lev.typ = CORR;
                lev.flags = 0;
                message = 'You succeed in cutting away some rock.';
            }
        } else if (IS_WALL(lev.typ)) {
            lev.typ = DOOR;
            lev.doormask = D_NODOOR;
            message = 'You make an opening in the wall.';
        } else if (lev.typ === SDOOR) {
            cvt_sdoor_to_door(lev);
            if (!(lev.doormask & D_TRAPPED))
                lev.doormask = D_BROKEN;
            message = 'You break through a secret door!';
        } else if (closed_door(x, y)) {
            if (!(lev.doormask & D_TRAPPED))
                lev.doormask = D_BROKEN;
            message = `You break through the door with your ${simpleonames(obj)}.`;
        } else {
            return 0;
        }

        if (!does_block(x, y, lev))
            unblock_point(x, y);
        newsym(x, y);
        if (message && !ctx.quiet)
            await pline(message);
        finish_digging(ctx);
        return 0;
    }

    if ((IS_WALL(lev.typ) || target === DIGTYP_DOOR)
        && in_rooms(x, y, SHOPBASE)) {
        await pline(`This ${IS_WALL(lev.typ) ? 'wall' : 'door'} seems too hard to ${
            is_pick(obj) ? 'dig into' : 'chop through'}.`);
        return 0;
    }
    if (target === DIGTYP_UNDIGGABLE
        || (target === DIGTYP_ROCK && !IS_OBSTRUCTED(lev.typ)))
        return 0;
    if (!ctx.did_dig_msg) {
        const names = ['', 'rock', 'statue', 'boulder', 'door', 'tree'];
        await You(`hit the ${names[target]} with all your might.`);
        wake_nearby(false);
        ctx.did_dig_msg = true;
    }
    return 1;
}

// src/dig.c:1162 use_pick_axe2() -- execute the direction already in u.d*.
export async function use_pick_axe2(obj) {
    const u = game.u;
    const ispick = is_pick(obj);
    const verbing = ispick ? 'digging' : 'chopping';

    if (u.uswallow) {
        note_unported_dig('use_pick_axe2:swallowed');
    } else if (Underwater()) {
        await pline(`Turbulence torpedoes your ${verbing} attempts.`);
    } else if (u.dz < 0) {
        if (Levitation())
            await You("don't have enough leverage.");
        else
            await You_cant(`reach the ${ceiling(u.ux, u.uy)}.`);
    } else if (!u.dx && !u.dy && !u.dz) {
        let damage = rnd(2) + dbon() + (obj.spe || 0);
        if (damage <= 0)
            damage = 1;
        if (u.uprops?.HALF_PHDAM)
            damage = Math.ceil(damage / 2);
        await You(`hit yourself with ${yname(u.uwep)}.`);
        await losehp(damage, `${game.flags.female ? 'her' : 'his'} own ${
                         game.objects[obj.otyp].oc_name}`,
                     KILLED_BY);
        (game.disp ||= {}).botl = true;
        return ECMD_TIME;
    } else if (!u.dz) {
        const { confdir } = await import('./cmd.js');
        confdir(false);
        const x = u.ux + u.dx, y = u.uy + u.dy;
        if (!isok(x, y)) {
            await pline('Clash!');
            return ECMD_TIME;
        }
        const mon = m_at(x, y);
        if (mon && await do_attack(mon))
            return ECMD_TIME;

        const target = dig_typ(obj, x, y);
        const lev = game.level.at(x, y);
        if (target === DIGTYP_UNDIGGABLE) {
            if (IS_TREE(lev.typ))
                await You('need an axe to cut down a tree.');
            else if (IS_OBSTRUCTED(lev.typ))
                await You('need a pick to dig rock.');
            else if (sobj_at(ONAMES.BOULDER, x, y)
                     || sobj_at(ONAMES.STATUE, x, y))
                await You_cant(`reach the ${sobj_at(ONAMES.BOULDER, x, y)
                                                ? 'boulder' : 'statue'}.`);
            else
                await You(`swing ${yobjnam(obj, null)} through thin air.`);
        } else {
            const ctx = digging_context();
            const actions = ['swinging', 'digging', 'chipping the statue',
                             'hitting the boulder', 'chopping at the door',
                             'cutting the tree'];
            ctx.did_dig_msg = false;
            ctx.quiet = false;
            if (ctx.pos.x !== x || ctx.pos.y !== y
                || !same_level(ctx.level, u.uz) || ctx.down) {
                ctx.down = false;
                ctx.chew = false;
                ctx.warned = false;
                ctx.pos = { x, y };
                ctx.level = { dnum: u.uz.dnum, dlevel: u.uz.dlevel };
                ctx.effort = 0;
                await You(`start ${actions[target]}.`);
            } else {
                await You(`${ctx.chew ? 'begin' : 'continue'} ${actions[target]}.`);
                ctx.chew = false;
            }
            set_occupation(dig, verbing, 0);
        }
    } else if (Is_airlevel(u.uz) || Is_waterlevel(u.uz)) {
        await You(`swing ${yobjnam(obj, null)} through thin air.`);
    } else if (!can_reach_floor(false)) {
        await pline(`You can't reach the ${surface(u.ux, u.uy)}.`);
    } else if (is_pool(u.ux, u.uy) || is_lava(u.ux, u.uy)) {
        await You(`cannot stay under${is_pool(u.ux, u.uy) ? 'water'
                                                            : ' the lava'} long enough.`);
    } else if (!ispick) {
        await pline(`${Yobjnam2(obj, null)} merely scratches the ${
            surface(u.ux, u.uy)}.`);
        u_wipe_engr(3);
    } else {
        const ctx = digging_context();
        if (ctx.pos.x !== u.ux || ctx.pos.y !== u.uy
            || !same_level(ctx.level, u.uz) || !ctx.down) {
            ctx.chew = false;
            ctx.down = true;
            ctx.warned = false;
            ctx.pos = { x: u.ux, y: u.uy };
            ctx.level = { dnum: u.uz.dnum, dlevel: u.uz.dlevel };
            ctx.effort = 0;
            await You(`start ${verbing} downward.`);
        } else {
            await You(`continue ${verbing} downward.`);
        }
        ctx.did_dig_msg = false;
        set_occupation(dig, verbing, 0);
    }
    return ECMD_TIME;
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

// src/dig.c:1548 zap_dig() -- a lateral digging beam opens doors, walls,
// trees, and rock until its randomized depth is spent.
export async function zap_dig() {
    const u = game.u;

    if (u.uswallow) {
        note_unported_dig('zap_dig:swallowed');
        return;
    }
    if (u.dz) {
        note_unported_dig('zap_dig:vertical');
        return;
    }

    let shopdoor = false, shopwall = false;
    const maze_dig = !!game.level.flags?.is_maze_lev
        && !Is_earthlevel(u.uz);
    let zx = u.ux + u.dx, zy = u.uy + u.dy;
    let digdepth = rn1(18, 8);
    const beamCells = [];

    if (u.utrap)
        note_unported_dig('zap_dig:pit');

    await flush_screen(0);
    while (--digdepth >= 0) {
        if (!isok(zx, zy))
            break;
        const room = game.level.at(zx, zy);

        if (cansee(zx, zy)) {
            display_cmap_at(cmap_names.S_digbeam, zx, zy, CLR_WHITE,
                            'dig-beam');
            beamCells.push([zx, zy]);
            await flush_screen(0);
        }
        if (game.animationFrame)
            await game.animationFrame();

        if (closed_door(zx, zy) || room.typ === SDOOR) {
            if (in_rooms(zx, zy, SHOPBASE)) {
                const { add_damage } = await import('./shk.js');
                add_damage(zx, zy, SHOP_DOOR_COST);
                shopdoor = true;
            }
            if (room.typ === SDOOR)
                room.typ = DOOR;
            else if (cansee(zx, zy))
                await pline_The('door is razed!');
            if (in_town(zx, zy))
                note_unported_dig('zap_dig:watch_dig');
            room.doormask = D_NODOOR;
            recalc_block_point(zx, zy);
            digdepth -= 2;
            if (maze_dig) {
                newsym(zx, zy);
                break;
            }
        } else if (maze_dig) {
            if (IS_WALL(room.typ)) {
                if (!(room.wall_info & W_NONDIGGABLE)) {
                    if (in_rooms(zx, zy, SHOPBASE)) {
                        const { add_damage } = await import('./shk.js');
                        add_damage(zx, zy, SHOP_WALL_COST);
                        shopwall = true;
                    }
                    room.typ = ROOM;
                    room.flags = 0;
                    unblock_point(zx, zy);
                } else if (!u.ublind) {
                    await pline_The('wall glows then fades.');
                }
                newsym(zx, zy);
                break;
            } else if (IS_TREE(room.typ)) {
                if (!(room.wall_info & W_NONDIGGABLE)) {
                    room.typ = ROOM;
                    room.flags = 0;
                    unblock_point(zx, zy);
                } else if (!u.ublind) {
                    await pline_The('tree shudders but is unharmed.');
                }
                newsym(zx, zy);
                break;
            } else if (room.typ === STONE || room.typ === SCORR) {
                if (!(room.wall_info & W_NONDIGGABLE)) {
                    room.typ = CORR;
                    room.flags = 0;
                    unblock_point(zx, zy);
                } else if (!u.ublind) {
                    await pline_The('rock glows then fades.');
                }
                newsym(zx, zy);
                break;
            }
        } else if (IS_OBSTRUCTED(room.typ)) {
            if (!may_dig(zx, zy)) {
                newsym(zx, zy);
                break;
            }
            if (IS_WALL(room.typ) || room.typ === SDOOR) {
                if (in_rooms(zx, zy, SHOPBASE)) {
                    const { add_damage } = await import('./shk.js');
                    add_damage(zx, zy, SHOP_WALL_COST);
                    shopwall = true;
                }
                if (in_town(zx, zy))
                    note_unported_dig('zap_dig:watch_dig');
                if (game.level.flags?.is_cavernous_lev
                    && !in_town(zx, zy)) {
                    room.typ = CORR;
                    room.flags = 0;
                } else {
                    room.typ = DOOR;
                    room.doormask = D_NODOOR;
                }
                digdepth -= 2;
            } else if (IS_TREE(room.typ)) {
                room.typ = ROOM;
                room.flags = 0;
                digdepth -= 2;
            } else {
                room.typ = CORR;
                room.flags = 0;
                digdepth--;
            }
            unblock_point(zx, zy);
        }
        zx += u.dx;
        zy += u.dy;
    }

    for (const [x, y] of beamCells)
        newsym(x, y);

    if (shopdoor || shopwall) {
        const { pay_for_damage } = await import('./shk.js');
        await pay_for_damage(shopdoor ? 'destroy' : 'dig into', false);
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
