import { allow_all } from './pickup.js';
import { PICK_ANY } from './const.js';
import { USE_INVLET } from './const.js';
import { INVORDER_SORT } from './const.js';
import { Has_contents, bimanual } from './obj.js';
import { COST_DEGRD } from './const.js';
import { costly_alteration } from './shk.js';
import { distu } from './hacklib.js';
import { Tobjnam } from './objnam.js';
import { breakobj } from './dothrow.js';
import { obj_resists } from './zap.js';
import { is_plural } from './obj.js';
import { pudding_merge_message, obj_meld } from './mkobj.js';
import { WT_SPLASH_THRESHOLD, ER_DESTROYED, HMON_THROWN, TRAPDOOR, HOLE, NO_TRAP } from './const.js';
import { weight } from './invent.js';
import { map_background } from './display.js';
import { bury_objs } from './dig.js';
import { Passes_walls, Underwater, Flying } from './youprop.js';
import { is_vampshifter } from './monst.js';
import { nonliving, passes_walls, throws_rocks, is_whirly } from './mondata.js';
import { dmgval } from './weapon.js';
import { hmon } from './uhitm.js';
import { lava_damage, water_damage, delfloortrap, uteetering_at_seen_pit, uescaped_shaft } from './trap.js';
import { OBJ_MINVENT, OBJ_CONTAINED, CONTAINED_TOO, BURIED_TOO, CXN_SINGULAR } from './const.js';
import { MONSYMS } from './monst_data.js';
import { maketrap } from './mklev.js';
import { mdistu } from './monmove.js';
import { canspotmon } from './display.js';
import { Adjmonnam, mon_nam } from './do_name.js';
import { The, an, yname } from './objnam.js';
import { is_reviver, locomotion } from './mondata.js';
import { revive, get_obj_location, get_container_location } from './zap.js';
import { set_uinwater } from './hack.js';
import { set_ustuck } from './mon.js';
import { reset_utrap, fill_pit } from './trap.js';
import { impact_drop } from './dokick.js';
import { setuqwep, setuwep_with_feedback, setuswapwep,
         weldmsg } from './wield.js';
import { impact_disturbs_zombies } from './hack.js';
import { obfree, stackobj, useupf } from './invent.js';
// do.js — commands that move the hero between levels, and the level change
// itself.
// C ref: src/do.c
//
// Seven of the 44 public sessions have their FIRST divergence inside mklev()
// because C descends a staircase and this port does not. getbones() is simply
// the first draw the new level makes; the missing piece is everything above it.

import { game } from './gstate.js';
import { paranoid_ynq, reset_occupations, set_move_cmd } from './cmd.js';
import { welded } from './wield.js';
import { ONAMES } from './objects_data.js';
import { encumber_msg, exercise, weight_cap } from './attrib.js';
import { freeinv, getobj, any_obj_ok, obj_extract_self, useup }
    from './invent.js';
import { place_object, rider_revival_time, set_bknown, set_corpsenm,
         splitobj, zombie_form, obj_nexto_xy } from './mkobj.js';
import { canseemon, cls, docrt, pline, newsym } from './display.js';
import { Norep, pline_The, There, You, You_cant, You_feel, You_hear, Your }
    from './pline.js';
import { near_capacity } from './attrib.js';
import { u_locomotion, losehp, check_special_room } from './hack.js';
import { ECMD_OK, ECMD_TIME, ECMD_FAIL, LOST_DROPPED, GETOBJ_PROMPT, GETOBJ_ALLOWCNT, W_ARMOR, W_ACCESSORY, W_SADDLE, IS_ALTAR, IS_SOFT, UNENCUMBERED, DIR_DOWN, DIR_UP, SLT_ENCUMBER, is_pit, is_hole, u_at, OBJ_FREE, OBJ_INVENT, OBJ_FLOOR, OBJ_BURIED, VIBRATING_SQUARE, MAGIC_PORTAL, PIT, ROOM, CORR, GRAVE, A_STR, A_DEX, BOTH_SIDES, KILLED_BY_AN, KILLED_BY, NO_KILLER_PREFIX, FACE, HAND, BC_BALL, BC_CHAIN, MENU_FULL, ALL_TYPES_SELECTED, Is_rogue_level, Is_waterlevel, IS_WATERWALL, DRAWBRIDGE_UP, DB_UNDER, DB_FLOOR, NH_AMBER, NH_BLACK, NO_MINVENT, MM_NOWAIT, MM_NOCOUNTBIRTH, MM_NOMSG, MM_NOTAIL, MM_MALE, MM_FEMALE, CORPSTAT_GENDER, CORPSTAT_MALE, CORPSTAT_FEMALE, NON_PM, RLOC_NOMSG, st_all } from './const.js';
import { t_at, m_at, is_pool, is_lava, delobj_core, m_in_air, mondied,
         seemimic, wake_nearto } from './mon.js';
import { is_pick } from './mon.js';
import { cansee, recalc_block_point } from './vision.js';
import { Blind, Deaf, Fire_resistance, Hallucination, Levitation }
    from './youprop.js';
import { OCLASSES } from './objects_data.js';
import { rn2, rnd, d } from './rng.js';
import { can_reach_floor, u_safe_from_fatal_corpse,
         add_valid_menu_class, allow_category,
         query_drop_categories, query_objlist } from './pickup.js';
import { body_part } from './polyself.js';
import { dmgtype, is_displacer } from './mondata.js';
import { ATTKS, PMNAMES, MFLAGS } from './monst_data.js';
import { Amonnam, hliquid, Monnam, upstart, y_monnam } from './do_name.js';
import { corpse_xname, CXN_NOCORPSE, CXN_PFX_THE, the, vtense, xname }
    from './objnam.js';
import { waterbody_name } from './pager.js';
import { is_pool_or_lava } from './dbridge.js';
import { DEADMONSTER } from './monst.js';
import { LEFT_SIDE } from './const.js';
import { RIGHT_SIDE } from './const.js';
import { LEG } from './const.js';
import { makeplural } from './objnam.js';









/* mklev() lives in js/mklev.js, which this file's callers already pull in.
   A dynamic import() here hits the same partially-initialised module the
   somexy cycle did, so it goes through a wire like everything else. */
/* var, not let: wired from cmd.js's top level, which can run before this
   body evaluates (see the add_room_fn note in js/sp_lev.js). */
var mklev_fn;
export function do_wire_mklev(fn) { mklev_fn = fn; }

/* js/dokick.js holds ship_object(), which dropx() calls. It is wired rather
   than imported: importing it here re-enters do.js during its own
   initialisation and hits the mklev_fn dead zone above. js/cmd.js does the
   wiring, as it already does for mklev and sp_lev. */
/* var, not let: same reason as mklev_fn above. */
var ship_object_fn;
export function do_wire_dokick(fn) { ship_object_fn = fn; }

function note_unported_do(what) {
    (game.unported ||= new Set()).add(what);
}

// src/do.c:2111 revive_corpse(); corpse comes back to life: returns true if
// it did
export async function revive_corpse(corpse) {
    const u = game.u;
    let mtmp, mcarry;
    let is_uwep, chewed;
    let where;
    let cname;
    let container = null;
    const container_where = { v: 0 };
    let montype;
    let is_zomb;
    const cc = { x: 0, y: 0 };

    where = corpse.where;
    montype = corpse.corpsenm;
    /* treat buried auto-reviver (troll, Rider) as if already unearthed
       so that it can dig itself out of the ground if it revives */
    is_zomb = (game.mons[montype].mlet === MONSYMS.S_ZOMBIE
               || (where === OBJ_BURIED && is_reviver(game.mons[montype])));
    is_uwep = (corpse === u.uwep);
    chewed = (corpse.oeaten !== 0 && corpse.oeaten != null);
    cname = corpse_xname(corpse, chewed ? 'bite-covered' : null, CXN_SINGULAR);
    mcarry = (where === OBJ_MINVENT) ? corpse.ocarry : null;

    get_obj_location(corpse, cc, CONTAINED_TOO | BURIED_TOO);
    const corpsex = cc.x, corpsey = cc.y;

    if (where === OBJ_CONTAINED) {
        let mtmp2;

        container = corpse.ocontainer;
        mtmp2 = get_container_location(container, container_where, null);
        /* container_where is the outermost container's location */
        if (container_where.v === OBJ_MINVENT && mtmp2)
            mcarry = mtmp2;
    }
    mtmp = await revive(corpse, false); /* corpse is gone if successful */

    if (mtmp) {
        switch (where) {
        case OBJ_INVENT:
            if (is_uwep)
                await pline_The(`${cname} writhes out of your grasp!`);
            else
                await You_feel('squirming in your backpack!');
            break;

        case OBJ_FLOOR:
            if (cansee(corpsex, corpsey) || canseemon(mtmp)) {
                let effect = '';

                if (mtmp.data === game.mons[PMNAMES.PM_DEATH])
                    effect = ' in a whirl of spectral skulls';
                else if (mtmp.data === game.mons[PMNAMES.PM_PESTILENCE])
                    effect = ' in a churning pillar of flies';
                else if (mtmp.data === game.mons[PMNAMES.PM_FAMINE])
                    effect = ' in a ring of withered crops';
                if (canseemon(mtmp)) {
                    await pline(`${chewed ? Adjmonnam(mtmp, 'bite-covered')
                                         : Monnam(mtmp)} rises from the dead${effect}!`);
                } else {
                    await pline(`${The(cname)} disappears${effect}!`);
                }
            }
            break;

        case OBJ_MINVENT: /* probably a nymph's */
            if (cansee(mtmp.mx, mtmp.my)) {
                if (mcarry && canseemon(mcarry))
                    await pline(`Startled, ${mon_nam(mcarry)} drops ${an(cname)} as it ${
                        canspotmon(mtmp) ? 'revives' : 'disappears'}!`);
                else if (canspotmon(mtmp))
                    await pline(`${chewed ? Adjmonnam(mtmp, 'bite-covered')
                                         : Monnam(mtmp)} suddenly appears!`);
            }
            break;

        case OBJ_CONTAINED: {
            let sackname;
            /* Since the monster's identity is unknown to the hero,
               "Something" is used instead of "someone" or "somebody",
               for humanoid monsters, which seems like a distinction the hero
               doesn't have knowledge to make here. */
            const mnam = canspotmon(mtmp) ? Amonnam(mtmp) : 'Something';

            if (!container) {
                /* impossible("reviving corpse from non-existent container") */
            } else if (mcarry && canseemon(mcarry)) {
                await pline(`${mnam} writhes out of ${yname(container)}!`);
            } else if (container_where.v === OBJ_INVENT) {
                sackname = an(xname(container));
                await pline(`${mnam} ${locomotion(mtmp.data, 'writhes')} out of ${sackname} in your pack!`);
            } else if (container_where.v === OBJ_FLOOR
                       && cansee(corpsex, corpsey)) {
                sackname = an(xname(container));
                await pline(`${mnam} escapes from ${sackname}!`);
            }
            break;
        }
        case OBJ_BURIED:
            if (is_zomb) {
                maketrap(mtmp.mx, mtmp.my, PIT);
                if (cansee(mtmp.mx, mtmp.my)) {
                    let ttmp;

                    ttmp = t_at(mtmp.mx, mtmp.my);
                    if (ttmp)
                        ttmp.tseen = 1;
                    await pline(`${canspotmon(mtmp) ? Amonnam(mtmp) : 'Something'
                                } claws itself out of the ground!`);
                    newsym(mtmp.mx, mtmp.my);
                } else if (mdistu(mtmp) < 5 * 5) {
                    /* Soundeffect(se_scratching, 50) */
                    await You_hear('scratching noises.');
                }
                await fill_pit(mtmp.mx, mtmp.my);
                break;
            }
            /* FALLTHROUGH */
        default:
            /* we should be able to handle the other cases... */
            /* impossible("revive_corpse: lost corpse @ %d", where) */
            break;
        }
        return true;
    }
    return false;
}

export async function revive_mon(body) {
    const mptr = game.mons[body.corpsenm];
    if (is_displacer(mptr) && body.where === OBJ_FLOOR
        && (game.level?.flags?.stasis_until ?? 0) < (game.moves ?? 0)) {
        const x = body.ox, y = body.oy;
        const obstacle = m_at(x, y);
        if (obstacle) {
            const noticed = canseemon(obstacle);
            const oldname = Monnam(obstacle);
            const { rloc } = await import('./teleport.js');
            if (await rloc(obstacle, RLOC_NOMSG)) {
                if (noticed && !canseemon(obstacle))
                    await pline(`${oldname} vanishes.`);
                else if (!noticed && canseemon(obstacle))
                    await pline(`${Monnam(obstacle)} appears.`);
                else if (noticed
                         && ((obstacle.mx - x) ** 2
                             + (obstacle.my - y) ** 2) > 2)
                    await pline(`${oldname} teleports.`);
            }
        }
    }

    const revived = await revive_corpse(body);
    if (!revived) {
        const { peek_timer, start_timer, TIMER_OBJECT, ROT_CORPSE, REVIVE_MON }
            = await import('./timeout.js');
        const rider = mptr.pmidx === PMNAMES.PM_DEATH
            || mptr.pmidx === PMNAMES.PM_PESTILENCE
            || mptr.pmidx === PMNAMES.PM_FAMINE;
        let action, when;
        if (rider && rn2(99)) {
            action = REVIVE_MON;
            when = rider_revival_time(body, true);
        } else {
            if (!peek_timer(ROT_CORPSE, body))
                await You_feel(`${rider ? 'much ' : ''}less hassled.`);
            action = ROT_CORPSE;
            when = d(5, 50) - ((game.moves ?? 0) - body.age);
            if (when < 1)
                when = 1;
        }
        if (!peek_timer(action, body))
            start_timer(when, TIMER_OBJECT, action, body);
    }
    return revived;
}

// src/do.c:2299 zombify_mon() - convert the corpse to its zombie species,
// then pass it through the ordinary timed-revival path.
export async function zombify_mon(body) {
    const active = body?.where === OBJ_FLOOR
        ? (game.level?.objects || []).includes(body)
        : body?.where === OBJ_BURIED
          && (game.level?.buriedobjs || []).includes(body);
    if (!body || body.otyp !== ONAMES.CORPSE
        || !active) {
        /* C keeps object timers on the saved level. The JS queue is global,
           so an off-level object must not consume RNG on the active level. */
        return;
    }

    const zmon = zombie_form(game.mons[body.corpsenm]);
    if (zmon !== NON_PM
        && !((game.mvitals[zmon]?.mvflags ?? 0) & MFLAGS.G_GENOD)) {
        delete body.omid;
        delete body.omonst;
        if (body.oextra) {
            delete body.oextra.omid;
            delete body.oextra.omonst;
        }
        set_corpsenm(body, zmon);
        if (await revive_mon(body)) {
            const { obj_stop_timers } = await import('./timeout.js');
            obj_stop_timers(body);
        }
    } else {
        const { rot_corpse } = await import('./dig.js');
        await rot_corpse(body);
    }
}

// src/ball.c:147 unplacebc_core(): detach punishment pieces from this level.
export function unplacebc() {
    const u = game.u;
    const ball = u.uball;
    const chain = u.uchain;
    if (!ball || !chain || u.uswallow)
        return;

    if (ball.where !== OBJ_INVENT) {
        const bx = ball.ox, by = ball.oy;
        obj_extract_self(ball);
        if (Blind() && ((u.bc_felt | 0) & BC_BALL)) {
            const loc = game.level?.at(bx, by);
            if (loc)
                loc.remembered_glyph = u.bglyph;
        }
        newsym(bx, by);
    }
    const cx = chain.ox, cy = chain.oy;
    obj_extract_self(chain);
    if (Blind() && ((u.bc_felt | 0) & BC_CHAIN)) {
        const loc = game.level?.at(cx, cy);
        if (loc)
            loc.remembered_glyph = u.cglyph;
    }
    newsym(cx, cy);
    u.bc_felt = 0;
}

// src/ball.c:120 placebc_core(): put punishment pieces under the arriving hero.
export async function placebc() {
    const u = game.u;
    const ball = u.uball;
    const chain = u.uchain;
    if (!ball || !chain)
        return;

    await flooreffects(chain, u.ux, u.uy, '');
    if (ball.where === OBJ_INVENT) {
        u.bc_order = 0; /* BCPOS_DIFFER */
    } else {
        await flooreffects(ball, u.ux, u.uy, '');
        place_object(ball, u.ux, u.uy);
        u.bc_order = 1; /* BCPOS_CHAIN */
    }
    place_object(chain, u.ux, u.uy);
    u.bglyph = u.cglyph = game.level?.at(u.ux, u.uy)?.remembered_glyph;
    newsym(u.ux, u.uy);
}

function maybe_half_physical(damage) {
    return game.u.uprops?.HALF_PHDAM
        ? Math.trunc((damage + 1) / 2)
        : damage;
}

// src/ball.c:966 litter(): the ball can knock carried objects down the stairs.
async function litter() {
    const capacity = weight_cap();
    const { setnotworn } = await import('./worn.js');
    const { yname, otense } = await import('./objnam.js');

    // C saves nextobj before removing the current object. A snapshot has the
    // same traversal semantics for this port's flat inventory array.
    for (const obj of [...(game.invent || [])]) {
        if (obj === game.u.uball || rnd(capacity) > obj.owt)
            continue;
        if (!canletgo(obj, ''))
            continue;

        await You(`drop ${yname(obj)} and ${obj.quan === 1 ? 'it' : 'they'} `
                  + `${otense(obj, 'fall')} down the stairs with you.`);
        setnotworn(obj);
        freeinv(obj);
        // hitfloor(obj, FALSE) reaches dropz(obj, TRUE) on ordinary stair
        // terrain. The existing drop path records a downward shipping gate.
        if (ship_object_fn
            && ship_object_fn(obj, game.u.ux, game.u.uy, false))
            continue;
        await dropz(obj, true);
    }
}

// src/ball.c:990 drag_down(): punishment damage during stair descent.
async function drag_down() {
    const u = game.u;
    const ball = u.uball;
    let dragchance = 3;
    const carried = ball?.where === OBJ_INVENT;
    const forward = carried
        && (u.uwep === ball || !u.uwep || !rn2(3));

    if (carried && !welded(ball))
        await You('lose your grip on the iron ball.');

    await cls();

    if (forward) {
        if (rn2(6)) {
            await pline_The('iron ball drags you downstairs!');
            await losehp(maybe_half_physical(rnd(6)),
                         'dragged downstairs by an iron ball',
                         NO_KILLER_PREFIX);
            await litter();
        }
    } else {
        if (rn2(2)) {
            await pline_The('iron ball smacks into you!');
            await losehp(maybe_half_physical(rnd(20)),
                         'iron ball collision', KILLED_BY_AN);
            exercise(A_STR, false);
            dragchance -= 2;
        }
        if (dragchance >= rnd(6)) {
            await pline_The('iron ball drags you downstairs!');
            await losehp(maybe_half_physical(rnd(3)),
                         'dragged downstairs by an iron ball',
                         NO_KILLER_PREFIX);
            exercise(A_STR, false);
            await litter();
        }
    }
}

// src/ball.c:23 ballrelease(FALSE): let go without placing the ball yet.
async function ballrelease() {
    const u = game.u;
    const ball = u.uball;
    if (!ball || ball.where !== OBJ_INVENT || welded(ball))
        return;

    if (u.uwep === ball)
        await setuwep_with_feedback(null);
    if (u.uswapwep === ball)
        setuswapwep(null);
    if (u.uquiver === ball)
        setuqwep(null);
    freeinv(ball);
    await encumber_msg();
}

// src/do.c:50 boulder_hits_pool(). A boulder fills ordinary water nine times
// in ten and lava one time in ten; otherwise it sinks. Pushed boulders use a
// direct push message when they fill, while falling boulders always splash.
export async function boulder_hits_pool(obj, x, y, pushing) {
    if (!obj || obj.otyp !== ONAMES.BOULDER || !is_pool_or_lava(x, y))
        return false;

    const lava = is_lava(x, y);
    const what = waterbody_name(x, y);
    const loc = game.level.at(x, y);
    const ltyp = loc.typ;
    const chance = rn2(10);
    const fillsUp = Is_waterlevel(game.u.uz) ? false
        : IS_WATERWALL(ltyp) ? chance < 5
          : lava ? chance === 0 : chance !== 0;

    if (fillsUp) {
        const trap = t_at(x, y);
        if (ltyp === DRAWBRIDGE_UP) {
            loc.drawbridgemask = ((loc.drawbridgemask ?? 0) & ~DB_UNDER)
                | DB_FLOOR;
        } else {
            loc.typ = ROOM;
            loc.flags = 0;
            recalc_block_point(x, y);
        }

        const mon = m_at(x, y);
        if (mon && !DEADMONSTER(mon) && !m_in_air(mon))
            await mondied(mon);
        if (trap) {
            const { deltrap } = await import('./trap.js');
            deltrap(trap);
        }
        const { bury_objs } = await import('./mklev.js');
        bury_objs(x, y);
        newsym(x, y);

        if (pushing) {
            const who = game.u.usteed ? y_monnam(game.u.usteed) : 'you';
            await pline(upstart(who) + ' ' + vtense(who, 'push') + ' '
                + the(xname(obj)) + ' into the ' + what + '.');
            if (game.flags?.verbose !== false && !Blind())
                await pline('Now you can cross it!');
        }
    }

    if (!fillsUp || !pushing) {
        if (!game.u.uinwater) {
            if (pushing ? !Blind() : cansee(x, y)) {
                await There('is a large splash as ' + the(xname(obj)) + ' '
                    + (fillsUp ? 'fills' : 'falls into') + ' the ' + what
                    + '.');
            } else if (!Deaf()) {
                await You_hear('a' + (lava ? ' sizzling' : '') + ' splash.');
            }
            await wake_nearto(x, y, 40);
        }

        if (fillsUp && game.u.uinwater
            && game.u.ux === x && game.u.uy === y) {
            game.u.uinwater = 0;
            await docrt();
            game.vision_full_recalc = 1;
            await You('find yourself on dry land again!');
        } else if (lava
                   && Math.max(Math.abs(game.u.ux - x),
                               Math.abs(game.u.uy - y)) <= 1) {
            await You('are hit by molten ' + hliquid('lava')
                + (Fire_resistance() ? '.' : '!'));
            if (game.u.uprops?.SLIMED)
                note_unported_do('boulder_hits_pool:burn_away_slime');
            let damage = d(Fire_resistance() ? 1 : 3, 6);
            if (game.u.uprops?.HALF_PHDAM)
                damage = Math.trunc((damage + 1) / 2);
            await losehp(damage, 'molten lava', KILLED_BY);
        } else if (!fillsUp && game.flags?.verbose !== false
                   && (pushing ? !Blind() : cansee(x, y))) {
            await pline('It sinks without a trace!');
        }
    }

    if (pushing)
        await useupf(obj, obj.quan);
    else
        obfree(obj);
    return true;
}

// src/do.c:162 flooreffects() — what happens to an object landing at (x,y).
// Returns true when the object is consumed (drowned, burned, plugged a pit,
// shattered), so the caller must not place it. The common case, plain floor,
// takes no arm, draws nothing, and returns false.
//
// include/hack.h Maybe_Half_Phys()
const Maybe_Half_Phys = (dmg) =>
    (game.u.intrinsic?.HHalf_physical_damage || game.u.uprops?.HALF_PHDAM)
        ? Math.trunc((dmg + 1) / 2) : dmg;
const the_your = ['the', 'your'];

// src/do.c:162 flooreffects()
export async function flooreffects(obj, x, y, verb) {
    let t, mtmp, otmp;
    let tseen;
    let ttyp = NO_TRAP, res = false;

    /* C: panic("flooreffects: obj not free") */
    /* make sure things like water_damage() have no pointers to follow;
       this port's objects have no nobj/nexthere chain links to clear */
    /* erode_obj() (called from water_damage() or lava_damage()) needs
       bhitpos, but that was screwing up wand zapping that called us from
       rloco(), so we now restore bhitpos before we return */
    const save_bhitpos = game.bhitpos;
    game.bhitpos = { x, y };

    if (obj.otyp === ONAMES.BOULDER && await boulder_hits_pool(obj, x, y, false)) {
        res = true;
    } else if (obj.otyp === ONAMES.BOULDER && (t = t_at(x, y)) != null
               && (is_pit(t.ttyp) || is_hole(t.ttyp))) {
        let deletedwithboulder = false;

        ttyp = t.ttyp;
        tseen = t.tseen ? true : false;
        if (((mtmp = m_at(x, y)) && mtmp.mtrapped)
            || (game.u.utrap && u_at(x, y))) {
            if (verb && (cansee(x, y) || distu(x, y) === 0))
                await pline(`${Blind() ? 'A' : 'The'} boulder ${vtense(null, verb)} into the pit${mtmp ? '' : ' with you'}.`);
            if (mtmp) {
                if (!passes_walls(mtmp.data) && !throws_rocks(mtmp.data)) {
                    /* dieroll was rnd(20); 1: maximum chance to hit
                       since trapped target is a sitting duck */
                    let damage;
                    const dieroll = 1;

                    /* As of 3.6.2: this was calling hmon() unconditionally
                       so always credited/blamed the hero but the boulder
                       might have been thrown by a giant or launched by
                       a rolling boulder trap triggered by a monster or
                       dropped by a scroll of earth read by a monster */
                    if (game.context?.mon_moving) {
                        /* normally we'd use ohitmon() but it can call
                           drop_throw() which calls flooreffects() */
                        damage = dmgval(obj, mtmp);
                        mtmp.mhp -= damage;
                        if (DEADMONSTER(mtmp)) {
                            if (canspotmon(mtmp))
                                await pline(`${Monnam(mtmp)} is ${(nonliving(mtmp.data) || is_vampshifter(mtmp)) ? 'destroyed' : 'killed'}!`);
                            await mondied(mtmp);
                        }
                    } else {
                        await hmon(mtmp, obj, HMON_THROWN, dieroll);
                    }
                    if (!DEADMONSTER(mtmp) && !is_whirly(mtmp.data))
                        res = false; /* still alive, boulder still intact */
                }
                mtmp.mtrapped = 0;
            } else {
                if (!Passes_walls() && !throws_rocks(game.youmonst.data)) {
                    await losehp(Maybe_Half_Phys(rnd(15)),
                                 'squished under a boulder', NO_KILLER_PREFIX);
                    deletedwithboulder = true; /* goto deletedwithboulder */
                } else
                    await reset_utrap(true);
            }
        }
        if (!deletedwithboulder && verb) {
            if (Blind() && u_at(x, y)) {
                /* Soundeffect(se_crashing_boulder, 100) */
                await You_hear('a CRASH! beneath you.');
            } else if (!Blind() && cansee(x, y)) {
                await pline_The(`boulder ${(ttyp === TRAPDOOR && !tseen) ? 'triggers and ' : ''}${(ttyp === TRAPDOOR) ? 'plugs a trap door' : (ttyp === HOLE) ? 'plugs a hole' : 'fills a pit'}.`);
            } else {
                /* Soundeffect(se_boulder_drop, 100) */
                await You_hear(`a boulder ${verb}.`);
            }
        }
        /*
         * Note:  trap might have gone away via ((hmon -> killed -> xkilled)
         *  || mondied) -> mondead -> m_detach -> fill_pit.
         */
 /* deletedwithboulder: */
        /* creating a pit in ice results in that ice being turned into
           floor so we shouldn't need any special ice handing here */
        if ((t = t_at(x, y)) != null) {
            await delfloortrap(t);
            if (game.u.utrap && u_at(x, y))
                await reset_utrap(false);
        }
        useupf(obj, 1);
        await bury_objs(x, y);
        newsym(x, y);
        res = true;
    } else if (is_lava(x, y)) {
        res = await lava_damage(obj, x, y);
    } else if (is_pool(x, y)) {
        /* Reasonably bulky objects (arbitrary) splash when dropped.
         * If you're floating above the water even small things make
         * noise.  Stuff dropped near fountains always misses */
        if ((Blind() || (Levitation() || Flying())) && !Deaf() && u_at(x, y)) {
            if (!Underwater()) {
                if (weight(obj) > WT_SPLASH_THRESHOLD) {
                    await pline('Splash!');
                } else if (Levitation() || Flying()) {
                    await pline('Plop!');
                }
            }
            map_background(x, y, 0);
            newsym(x, y);
        }
        res = (await water_damage(obj, null, false)) === ER_DESTROYED;
    } else if (u_at(x, y) && (t = t_at(x, y)) != null
               && (uteetering_at_seen_pit(t) || uescaped_shaft(t))) {
        if (is_pit(t.ttyp)) {
            if (Blind() && !Deaf()) {
                /* Soundeffect(se_item_tumble_downwards, 50) */
                await You_hear(`${the(xname(obj))} tumble downwards.`);
            } else {
                await pline(`${Tobjnam(obj, 'tumble')} into ${the_your[t.madeby_u ? 1 : 0]} pit.`);
            }
        } else if (ship_object_fn && ship_object_fn(obj, x, y, false)) {
            /* ship_object will print an appropriate "the item falls
             * through the hole" message, so no need to do it here. */
            res = true;
        }
    } else if (obj.globby) {
        const globbyobj = { v: obj }; /* allow obj to be nonnull arg */

        /* Globby things like puddings might stick together */
        while (globbyobj.v
               && (otmp = obj_nexto_xy(globbyobj.v, x, y, true)) != null) {
            await pudding_merge_message(globbyobj.v, otmp);
            /* intentionally not getting the melded object; obj_meld may set
             * obj to null. */
            await obj_meld(globbyobj, { v: otmp });
        }
        res = !globbyobj.v;
    } else if (game.context?.mon_moving && IS_ALTAR(game.level.at(x, y)?.typ)
               && cansee(x, y)) {
        await doaltarobj(obj);
    } else if (obj.oclass === OCLASSES.POTION_CLASS
               && (game.level?.flags?.temperature ?? 0) > 0
               && (game.level.at(x, y).typ === ROOM || game.level.at(x, y).typ === CORR)) {
        /* Potions are sometimes destroyed when landing on very hot
           ground. The basic odds are 50% for nonblessed potions and
           30% for blessed potions; if you have handled the object
           (i.e. it is or was yours), these odds are adjusted by Luck
           (each Luck point affects them by 2%). Artifact potions
           would not be affected, if any existed.

           Oil is not affected because its boiling point (and flash
           point) are higher than that of water. For example, whale
           oil, one of the substances traditionally used in oil lamps,
           can survive over 100 degrees Centigrade more heat than
           water can.*/
        if (cansee(x, y)) {
            /* unconditional "ground" is safe as this only runs for
               room and corridor tiles */
            await pline(`${Tobjnam(obj, 'heat')} up as ${is_plural(obj) ? 'they hit' : 'it hits'} the hot ground.`);
        }

        const Luck = (game.u.uluck | 0) + (game.u.moreluck | 0);
        let survival_chance = obj.blessed ? 70 : 50;
        if (obj.invlet)
            survival_chance += Luck * 2;
        if (obj.otyp === ONAMES.POT_OIL)
            survival_chance = 100;

        if (!obj_resists(obj, survival_chance, 100)) {
            if (cansee(x, y)) {
                await pline(`${is_plural(obj) ? 'They shatter' : 'It shatters'} from the heat!`);
            } else {
                await You_hear('a shattering noise.');
            }
            await breakobj(obj, x, y, false, false);
            res = true;
        }
    }

    game.bhitpos = save_bhitpos;
    return res;
}

// src/dungeon.c stairway_at() — the staircase on this square, or null.
export function stairway_at(x, y) {
    for (let s = game.stairs; s; s = s.next)
        if (s.sx === x && s.sy === y)
            return s;
    return null;
}

// src/stairs.c:55 stairway_find_from(), find the arrival staircase whose
// remote end is the level the hero just left.
function stairway_find_from(fromdlev, isladder) {
    for (let s = game.stairs; s; s = s.next)
        if (s.tolev?.dnum === fromdlev?.dnum
            && s.tolev?.dlevel === fromdlev?.dlevel
            && !!s.isladder === !!isladder)
            return s;
    return null;
}

// src/do.c dodown() — the '>' command.
//
// Only the plain staircase path is ported. dodown's own two draws are the
// !rn2(3) / rnd(4) pair for falling through a trapdoor, which is a different
// branch; the staircase path spends none.
// src/do.c:1660 doup() — the '<' command.
//
// The ordinary staircase and top-level no-return confirmation paths are
// ported. Pit climbing, stuck steeds, and monster holds remain separate arms.
export async function doup() {
    const stway = stairway_at(game.u.ux, game.u.uy);

    set_move_cmd(DIR_UP, 0);

    if (!stway || !stway.up) {
        await You_cant('go up here.');
        return ECMD_OK;
    }
    if (near_capacity() > SLT_ENCUMBER) {
        note_unported_do('doup:load_too_heavy');
        return ECMD_TIME;
    }
    if (!game.u.uz.dnum && game.u.uz.dlevel === 1) {
        if (game.iflags?.debug_fuzzer)
            return ECMD_OK;
        const { tty_yn_function } = await import('./tty/topl.js');
        if ((await tty_yn_function(
            'Beware, there will be no return!  Still climb?', 'yn', 'n'))
            !== 'y')
            return ECMD_OK;
    }
    await prev_level(true);
    return ECMD_TIME;
}

// src/dungeon.c:1518 prev_level() — one level up (or an up branch).
async function prev_level(at_stairs) {
    const stway = stairway_at(game.u.ux, game.u.uy);

    if (at_stairs && stway)
        stway.u_traversed = true;

    if (at_stairs && stway && stway.tolev
        && stway.tolev.dnum !== game.u.uz.dnum) {
        /* Taking an up dungeon branch. */
        if (!game.u.uz.dnum && game.u.uz.dlevel === 1
            && !game.u.uhave?.amulet) {
            const { done } = await import('./end.js');
            await done(3 /* ESCAPED */);
        } else {
            await goto_level({ dnum: stway.tolev.dnum,
                               dlevel: stway.tolev.dlevel },
                             at_stairs, false, false);
        }
    } else {
        /* Going up a stairs or rising through the ceiling. */
        await goto_level({ dnum: game.u.uz.dnum,
                           dlevel: game.u.uz.dlevel - 1 },
                         at_stairs, false, false);
    }
}

export async function dodown() {
    set_move_cmd(DIR_DOWN, 0);

    let stairs_down = false, ladder_down = false;
    const stway = stairway_at(game.u.ux, game.u.uy);

    if (stway && !stway.up) {
        stairs_down = !stway.isladder;
        ladder_down = !stairs_down;
    }

    /* levitation, being stuck, u_rooted and the hider arms sit above this
       in C; none is reachable without those subsystems */
    if (!stairs_down && !ladder_down) {
        const trap = t_at(game.u.ux, game.u.uy);
        if (trap && is_pit(trap.ttyp) && trap.tseen) {
            /* C: uteetering_at_seen_pit/uescaped_shaft -> dotrap(TOOKPLUNGE) */
            note_unported_do('dodown:pit_plunge');
            return ECMD_TIME;
        } else if (!trap || !is_hole(trap.ttyp) || !trap.tseen) {
            if (game.flags.autodig && !game.context?.nopick
                && game.u.uwep && is_pick(game.u.uwep)) {
                note_unported_do('dodown:autodig');
                return ECMD_OK;
            } else {
                await You_cant(`go down here${
                    (trap && trap.ttyp === VIBRATING_SQUARE) ? ' yet' : ''}.`);
                return ECMD_OK;
            }
        }
        /* a seen hole or trapdoor: the descent needs goto_level's fall arm */
        note_unported_do('dodown:fall_through_hole');
        return ECMD_OK;
    }

    await next_level(true);
    return ECMD_TIME;
}

// src/dungeon.c:1497 next_level() — descend to whatever this staircase leads to.
export async function next_level(at_stairs) {
    const stway = stairway_at(game.u.ux, game.u.uy);

    if (at_stairs && stway)
        stway.u_traversed = true;

    let newlevel;
    if (at_stairs && stway) {
        newlevel = { dnum: stway.tolev.dnum, dlevel: stway.tolev.dlevel };
    } else {
        newlevel = { dnum: game.u.uz.dnum, dlevel: game.u.uz.dlevel + 1 };
    }
    await goto_level(newlevel, at_stairs, false, false);
}

// src/do.c goto_level() — the level change.
//
// Only the "entering this level for the first time" arm is ported, which is
// the one a first descent takes:
//
//     if (!(svl.level_info[new_ledger].flags & LFILE_EXISTS)) {
//         mklev();          <- already ported
//         new = TRUE;
//     } else { ...reload the saved level from its file... }
//
// The mysterious force can add three or four draws to an Amulet ascent from
// Gehennom. A plain staircase descent spends no draw of its own.
export async function goto_level(newlevel, at_stairs, falling, portal) {
    const dist = depth_do(newlevel) - depth_do(game.u.uz);
    let up = (depth_do(newlevel) < depth_do(game.u.uz));
    let do_fall_dmg = false;
    const newdungeon = (game.u.uz.dnum !== newlevel.dnum);

    /* src/do.c:1492: the mysterious force must keep a hero who starts
       inside the Wizard's Tower inside it. The tower boundary is the
       excluded rectangle shared by the up/down arrival regions. */
    const onWTowerLevel = (lev) => ['wiz1_level', 'wiz2_level', 'wiz3_level']
        .some(key => {
            const sp = game.special_levels?.[key];
            return sp && sp.dnum === lev.dnum && sp.dlevel === lev.dlevel;
        });
    const towerBoundary = game.dndest || {};
    const wasInWTower = onWTowerLevel(game.u.uz)
        && towerBoundary.nlx
        && game.u.ux >= towerBoundary.nlx && game.u.ux <= towerBoundary.nhx
        && game.u.uy >= towerBoundary.nly && game.u.uy <= towerBoundary.nhy;

    /* src/do.c:1502 — dungeon-change arms. In_tutorial(lev) is
       lev.dnum == tutorial_dnum; entering stashes the whole game state
       (inventory included) via nhcore's enter_tutorial, leaving restores
       it and re-enters level 1 as if starting a new game. */
    {
        if (newdungeon) {
            const { tutorial } = await import('./nhlua.js');
            if (newlevel.dnum === game.tutorial_dnum) {
                tutorial(true); /* entering tutorial */
            } else if (game.u.uz.dnum === game.tutorial_dnum) {
                tutorial(false); /* leaving tutorial */
                up = false; /* re-enter level 1 as if starting new game */
            }
        }
    }

    /* src/do.c:1541: while carrying the real Amulet, one quarter of early
       Gehennom climbs initially trigger the mysterious force. It either
       sends the hero down one or more levels or teleports them on the same
       level. Repeated triggers become progressively less likely. */
    const dgn = game.dungeons?.[game.u.uz.dnum];
    if (dgn?.flags?.hellish && up && game.u.uhave?.amulet
        && !newdungeon && !portal
        && game.u.uz.dlevel < dgn.num_dunlevs - 3) {
        const mysteryforce = game.context?.mysteryforce | 0;
        if (!rn2(4 + mysteryforce)) {
            const odds = 3 + (game.u.ualign?.type | 0);
            let diff = odds <= 1 ? 0 : rn2(odds);

            if (diff !== 0) {
                newlevel.dnum = game.u.uz.dnum;
                newlevel.dlevel = game.u.uz.dlevel + rnd(diff);
                if (newlevel.dlevel > dgn.num_dunlevs)
                    newlevel.dlevel = dgn.num_dunlevs;
                diff = newlevel.dlevel - game.u.uz.dlevel;
                if (wasInWTower && !onWTowerLevel(newlevel))
                    diff = 0;
            }
            if (diff === 0) {
                newlevel.dnum = game.u.uz.dnum;
                newlevel.dlevel = game.u.uz.dlevel;
            }

            await pline('A mysterious force momentarily surrounds you...');
            game.context ||= {};
            game.context.mysteryforce = mysteryforce + rn2(diff + 2);

            if (newlevel.dnum === game.u.uz.dnum
                && newlevel.dlevel === game.u.uz.dlevel) {
                const { safe_teleds, TELEDS_NO_FLAGS } =
                    await import('./teleport.js');
                await safe_teleds(TELEDS_NO_FLAGS);
                return;
            }
            at_stairs = false;
        }
    }

    /* src/do.c:1577, the Quest start level blocks every descent within the
       same dungeon until the leader grants access. This also applies to a
       wizard-mode level teleport selected from the dungeon overview. */
    {
        const qstart = game.special_levels?.qstart_level;
        const atQstart = qstart && game.u.uz.dnum === qstart.dnum
                         && game.u.uz.dlevel === qstart.dlevel;
        if (atQstart && !newdungeon) {
            const { ok_to_quest } = await import('./quest.js');
            if (!await ok_to_quest()) {
                await pline('A mysterious force prevents you from descending.');
                return;
            }
        }
    }
    /* src/do.c:1499 — level temperature before the change, for
       temperature_change_msg() at the tail */
    const prev_temperature = game.level?.flags?.temperature | 0;

    /* src/do.c:1585 keepdogs() — adjacent followers leave the map with the
       hero BEFORE the old level is left */
    const { keepdogs, losedogs } = await import('./dog.js');
    /* src/do.c:1607 - a destination belongs to the level being left. */
    game.iflags = game.iflags || {};
    game.iflags.travelcc = { x: 0, y: 0 };
    /* digging context is level-aware and can actually be resumed if
       hero returns to the previous level without any intervening dig */

    if (falling) /* assuming this is only trap door or hole */
        await impact_drop(null, game.u.ux, game.u.uy, newlevel.dlevel);
    await check_special_room(true); /* probably was a trap door */
    if (game.u.uball)
        unplacebc();
    await reset_utrap(false); /* needed in level_tele */
    await fill_pit(game.u.ux, game.u.uy);
    set_ustuck(null); /* clear u.ustuck and u.uswallow */
    await set_uinwater(0); /* u.uinwater = 0 */
    game.u.uundetected = 0; /* not hidden, even if means are available */
    /* src/do.c:1623 — the tutorial transition sets iflags.nofollowers so
       the pet stays behind */
    if (!game.iflags?.nofollowers)
        keepdogs(false);
    /* src/do.c:1625, preserve the overview information from the level
       being left before its visibility and live structures are replaced. */
    {
        const { recalc_mapseen } = await import('./dungeon.js');
        recalc_mapseen();
    }
    /* src/do.c:1634: clear old visibility after followers leave. This
       redraws their former squares while the bones prompt is onscreen. */
    {
        const { vision_recalc } = await import('./vision.js');
        vision_recalc(2);
    }

    /* src/do.c:1660 savelev() — keep the outgoing level so a return
       restores it instead of regenerating. update_mlstmv() (dog.c:294)
       stamps every monster's last-move time first; getlev()'s catchup
       below draws against it. */
    if (game.level) {
        for (const mtmp of game.level.monsters || [])
            mtmp.mlstmv = game.moves;
        /* src/save.c:553 save_track() — the hero's track is saved WITH
           the level and cleared (track.c:88); getlev's rest_track()
           restores it on a return visit. Trackers (jackals, pets) read
           it via gettrack(), so both halves matter: leaving must blank
           it, returning must bring the old points back. */
        game.level._saved_track = {
            utcnt: game.utcnt | 0,
            utpnt: game.utpnt | 0,
            utrack: (game.utrack || []).map(p => ({ x: p.x, y: p.y })),
        };
        /* The stairway chain belongs to this level. savelev() writes it
           with the map, and getlev() restores it before arrival handling. */
        game.level._saved_stairs = game.stairs;
        /* src/save.c:550 save_regions() stores regions with this level and
           clears the live list. Regions from one level must never block or
           paint cells on the next one. */
        game.level._saved_regions = game.regions || [];
        game.level._saved_regions_moves = game.moves;
        game.regions = [];
        /* src/save.c savelev() stores both special-level arrival regions
           alongside the map. Restoring only the terrain made revisits use
           the whole level instead of the scripted destination area. */
        game.level._saved_updest = { ...(game.updest || {}) };
        game.level._saved_dndest = { ...(game.dndest || {}) };
        (game.saved_levels ||= new Map())
            .set(`${game.u.uz.dnum}:${game.u.uz.dlevel}`, game.level);
        /* src/save.c savelev() — leaving a Plane of Water/Air parks the
           bubble/cloud list with the level (and frees the live copy) */
        {
            const { Is_waterlevel, Is_airlevel } = await import('./const.js');
            if (Is_waterlevel(game.u.uz) || Is_airlevel(game.u.uz)) {
                const { save_waterlevel } = await import('./mkmaze.js');
                save_waterlevel();
            }
        }
        const { initrack } = await import('./track.js');
        initrack();
    }

    /* src/do.c:1674 — u.uz0 holds the level being left until the tail's
       "reset u.uz0" catches it up; onquest() and the arrival messages
       read it to tell a fresh arrival from a revisit. */
    game.u.uz0 = { dnum: game.u.uz.dnum, dlevel: game.u.uz.dlevel };
    if ((at_stairs || falling || portal)
        && game.u.uz.dnum !== newlevel.dnum) {
        const { recbranch_mapseen } = await import('./dungeon.js');
        recbranch_mapseen(game.u.uz, newlevel);
    }
    game.u.uz = { dnum: newlevel.dnum, dlevel: newlevel.dlevel };
    (game.visited_ledgers ||= new Set());

    /* src/do.c:1678 — track the deepest level reached in this dungeon
       (builds_up dungeons track their SHALLOWEST dlevel instead) */
    {
        const dgn = game.dungeons?.[game.u.uz.dnum];
        const { builds_up } = await import('./dungeon.js');
        if (dgn) {
            if (!builds_up(game.u.uz)) {
                if (game.u.uz.dlevel > (dgn.dunlev_ureached ?? 0))
                    dgn.dunlev_ureached = game.u.uz.dlevel;
            } else if (!dgn.dunlev_ureached
                       || game.u.uz.dlevel < dgn.dunlev_ureached) {
                dgn.dunlev_ureached = game.u.uz.dlevel;
            }
        }
    }

    /* src/do.c:1690 — reset the default level change destination areas;
       the special level code may override these */
    game.updest = { lx: 0, ly: 0, hx: 0, hy: 0,
                    nlx: 0, nly: 0, nhx: 0, nhy: 0 };
    game.dndest = { lx: 0, ly: 0, hx: 0, hy: 0,
                    nlx: 0, nly: 0, nhx: 0, nhy: 0 };

    const ledger = `${newlevel.dnum}:${newlevel.dlevel}`;
    let familiar_level = true;
    game.regions = [];
    /* C's test is "does the level file exist" (do.c:1706); the in-memory
       map is that file store. (visited_ledgers alone is wrong for the
       FIRST level, which newgame's mklev creates without registering.) */
    if (game.saved_levels?.has(ledger)) {
        /* src/do.c:1706 — returning to a previously visited level: C
           getlev()s it back from its level file. The in-memory swap is
           the same state; the visible cost is restore.c:1190's monster
           catchup against the time spent away. */
        game.level = game.saved_levels.get(ledger);
        game.stairs = game.level._saved_stairs || null;
        /* src/region.c rest_regions() subtracts the turns spent away and
           silently drops expired regions before the restored map is shown. */
        {
            const elapsed = Math.max(
                0, game.moves - (game.level._saved_regions_moves ?? game.moves));
            game.regions = (game.level._saved_regions || []).filter(reg => {
                if (reg.ttl >= 0)
                    reg.ttl = reg.ttl > elapsed ? reg.ttl - elapsed : 0;
                return reg.ttl !== 0 && reg.ttl !== -2;
            });
        }
        game.updest = { ...(game.level._saved_updest || game.updest) };
        game.dndest = { ...(game.level._saved_dndest || game.dndest) };
        const { oinit } = await import('./o_init.js');
        oinit();
        const { DEADMONSTER } = await import('./monst.js');
        const { mon_catchup_elapsed_time } = await import('./dog.js');
        const { restore_cham, hide_monst } = await import('./mon.js');
        for (const mtmp of game.level.monsters || []) {
            if (DEADMONSTER(mtmp))
                continue;
            const elapsed = game.moves - (mtmp.mlstmv ?? game.moves);
            /* ghostly (bones) monsters go through the peacefulness reset
               instead; a reloaded live level takes the elapsed arm */
            if (elapsed > 0)
                await mon_catchup_elapsed_time(mtmp, elapsed);
            /* update shape-changers in case protection against them is
               different now than when the level was saved */
            restore_cham(mtmp);
            /* give hiders a chance to hide before their next move */
            if (elapsed > 0 && elapsed > rnd(10))
                hide_monst(mtmp);
        }
        /* restore.c:1228 rest_track() — bring back the track saved with
           this level */
        const st = game.level._saved_track;
        if (st) {
            game.utcnt = st.utcnt;
            game.utpnt = st.utpnt;
            game.utrack = st.utrack.map(p => ({ x: p.x, y: p.y }));
        }
        /* src/restore.c getlev() — a returned-to Plane of Water/Air
           rebuilds its bubbles (mv_bubble(...,TRUE) per bubble, which on
           the Air plane draws the rn2(6) cloud-speed gate like C) */
        {
            const { Is_waterlevel, Is_airlevel } = await import('./const.js');
            if (Is_waterlevel(game.u.uz) || Is_airlevel(game.u.uz)) {
                const { restore_waterlevel } = await import('./mkmaze.js');
                await restore_waterlevel();
            }
        }
    } else {
        familiar_level = false;         /* src/do.c "new" is the inverse */
        game.visited_ledgers.add(ledger);

        /* entering this level for the first time; make it now */
        await mklev_fn();
    }

    /* src/do.c:1716-1720 — do this prior to level-change pline messages:
       clear the old level's line-of-sight and POSTPONE all map flushes.
       Every pline between here and the closing flush_screen(-1) paints its
       text over the OLD level's map, which is what the recordings show
       under "You descend the stairs.--More--". */
    {
        const { vision_reset } = await import('./vision.js');
        const { flush_screen } = await import('./display.js');
        vision_reset();
        game.vision_full_recalc = 0;
        await flush_screen(-1);
    }

    const { In_endgame } = await import('./const.js');
    if (portal && !In_endgame(game.u.uz)) {
        /* src/do.c:1722, portal travel lands on the matching portal without
           a random-position draw. Quest expulsion relies on this path. */
        const portal_trap = (game.level?.traps || [])
            .find(trap => trap.ttyp === MAGIC_PORTAL);
        if (portal_trap) {
            const { seetrap } = await import('./trap.js');
            const { u_on_newpos } = await import('./teleport.js');
            seetrap(portal_trap);
            u_on_newpos(portal_trap.tx, portal_trap.ty);
        } else {
            const { u_on_rndspot } = await import('./dungeon.js');
            await u_on_rndspot(0);
        }
    } else if (at_stairs && !In_endgame(game.u.uz)) {
        /* src/do.c:1747/1765, prefer the stair whose remote end is the
           level just left. Besides choosing the exact branch stair, C marks
           the arrival side traversed so known branch stairs turn yellow. */
        const arrival_stair = stairway_find_from(game.u.uz0, false);
        if (arrival_stair) {
            game.u.ux = arrival_stair.sx;
            game.u.uy = arrival_stair.sy;
            arrival_stair.u_traversed = true;
        } else if (up) {
            /* src/do.c — arriving from below lands on the DOWN staircase
               of the upper level (C u_on_dnstairs()) */
            await u_on_dnstairs();
        } else {
            await u_on_upstairs();
        }

        /* src/do.c:1774 — arrival message and stair-fall damage. `at_ladder`
           is false for this staircase path. */
        if (!game.u.dz) {
            ; /* stayed on same level? (no transit effects) */
        } else if (up) {
            const great_effort = !!game.u.uball && !Levitation();
            if (game.flags?.verbose || great_effort) {
                await pline(`${great_effort ? 'With great effort, you' : 'You'} `
                            + `${u_locomotion('climb')} up the stairs.`);
            }
        } else if (game.u.uprops?.FLYING) {
            if (game.flags?.verbose)
                await You('fly down the stairs.');
        } else if (near_capacity() > UNENCUMBERED || game.u.uball
                   || game.u.uprops?.FUMBLING
                   || game.u.intrinsic?.HFumbling) {
            await You('fall down the stairs.');
            if (game.u.uball) {
                await drag_down();
                if (!welded(game.u.uball))
                    await ballrelease();
            }
            if (game.u.usteed) {
                const { dismount_steed } = await import('./steed.js');
                await dismount_steed(1 /* DISMOUNT_FELL */);
            } else {
                await losehp(maybe_half_physical(rnd(3)),
                             'tumbling down a flight of stairs',
                             KILLED_BY);
            }
            /* selftouch("Falling, you") draws nothing unless a petrifying
               corpse is wielded; that fatal branch remains explicit. */
            if (game.u.uwep?.otyp === ONAMES.CORPSE
                || (game.u.twoweap
                    && game.u.uswapwep?.otyp === ONAMES.CORPSE))
                note_unported_do('goto_level:selftouch');
        } else { /* ordinary descent */
            if (game.flags?.verbose)
                await You('descend the stairs.');
        }
    } else { /* trap door or level_tele or In_endgame */
        const { u_on_rndspot } = await import('./dungeon.js');
        await u_on_rndspot(up ? 1 : 0);
        if (falling) {
            if (game.u.uball)
                note_unported_do('goto_level:ballfall');
            if (game.u.uwep?.otyp === ONAMES.CORPSE
                || (game.u.twoweap
                    && game.u.uswapwep?.otyp === ONAMES.CORPSE))
                note_unported_do('goto_level:selftouch');
            do_fall_dmg = true;
        }
    }

    if (game.u.uball)
        await placebc();

    /* C runs ordinary migrating-object delivery here before monster arrivals.
       Species-targeted loot is delivered through makemon()/mon_arrive(). */
    await losedogs();

    /* src/do.c:1826 — hero might be arriving at a spot containing a
       monster; u_collide_m moves one or the other */
    const { m_at, mnexto } = await import('./mon.js');
    const collider = m_at(game.u.ux, game.u.uy);
    if (collider)
        await u_collide_m(collider, m_at, mnexto);

    /* src/do.c:1830 — initial movement of bubbles (Plane of Water) or
       clouds (Plane of Air), or fumarole gas (Plane of Fire), just before
       vision_recalc */
    {
        const { Is_waterlevel, Is_airlevel } = await import('./const.js');
        if (Is_waterlevel(game.u.uz) || Is_airlevel(game.u.uz)) {
            const { movebubbles } = await import('./mkmaze.js');
            await movebubbles();
        } else if (game.level.flags?.fumaroles) {
            const { fumaroles } = await import('./mkmaze.js');
            await fumaroles();
        }
    }

    /* src/do.c:1837 — reset the screen: vision blockages for the new
       map, then a full redraw with vision recalc */
    const { vision_reset } = await import('./vision.js');
    const { docrt, flush_screen } = await import('./display.js');
    vision_reset();
    game.vision_full_recalc = 1;
    await docrt();
    await flush_screen(-1);

    /* src/do.c:1850 — the deferred arrival message for level teleport looks
       odd if given after the various messages below, so give it before
       them; maybe_lvltport_feedback() clears dfr_post_msg so
       deferred_goto() won't repeat it */
    if (game.dfr_post_msg && /^You materialize/i.test(game.dfr_post_msg)) {
        await pline(game.dfr_post_msg);
        game.dfr_post_msg = null;
    }

    /* src/do.c:1858 — special levels can have a custom arrival message */
    {
        const { deliver_splev_message } = await import('./questpgr.js');
        await deliver_splev_message();
    }

    /* src/do.c:1860: announce the first transition into Gehennom. */
    {
        const wasInHell = game.dungeons?.[game.u.uz0.dnum]?.flags?.hellish
                          === true;
        const inHell = game.dungeons?.[game.u.uz.dnum]?.flags?.hellish
                       === true;
        const valley = game.valley_level;
        const isValley = !!valley
            && game.u.uz.dnum === valley.dnum
            && game.u.uz.dlevel === valley.dlevel;

        if (!wasInHell && inHell && isValley) {
            await You('arrive at the Valley of the Dead...');
            await pline_The('odor of burnt flesh and decay pervades the air.');
            await You_hear('groans and moans everywhere.');
        }
        if (!wasInHell && inHell) {
            const { ACH_HELL, record_achievement } =
                await import('./insight.js');
            record_achievement(ACH_HELL);
        }
        if (inHell && !isValley)
            (game.u.uevent ||= {}).gehennom_entered = 1;
    }

    /* src/do.c:1879: after the new map and deferred arrival message, a
       same-named bones level gives one randomly chosen deja-vu message. */
    {
        const { bones_include_name } = await import('./bones.js');
        if (game.level?.bonesinfo && bones_include_name(game.plname)) {
            const fam_msgs = [
                'You have a sense of deja vu.',
                "You feel like you've been here before.",
                'This place %s familiar...', null ];
            /* halu variants recorded with the rest of Hallucination */
            let mesg = fam_msgs[rn2(4)];
            if (mesg && mesg.includes('%s'))
                mesg = mesg.replace('%s',
                                    !game.u.ublind ? 'looks' : 'seems');
            if (mesg)
                await pline(mesg);
        }
    }

    /* src/do.c:1879 — special location arrival messages/events. The
       endgame and quest arms are wired; the Knox, Mines and Sokoban arms
       are achievements and alarms that no ported session reaches yet. */
    {
        const { In_endgame, Is_astralevel } = await import('./const.js');
        const newdungeon = (game.u.uz0.dnum !== game.u.uz.dnum);
        if (In_endgame(game.u.uz)) {
            const { ACH_ENDG, ACH_ASTR, record_achievement } =
                await import('./insight.js');
            record_achievement(ACH_ENDG);
            if (!familiar_level && Is_astralevel(game.u.uz)) {
                await final_level(); /* guardian angel,&c */
                record_achievement(ACH_ASTR);
            } else if (newdungeon && game.u.uhave?.amulet) {
                const { resurrect } = await import('./wizard.js');
                await resurrect(); /* force confrontation with Wizard */
            }
        } else if (game.u.uz.dnum === game.quest_dnum) { /* In_quest() */
            const { onquest } = await import('./quest.js');
            await onquest();
        } else if (game.u.uz.dnum === game.mines_dnum) {
            if (newdungeon) {
                const { ACH_MINE, record_achievement } =
                    await import('./insight.js');
                record_achievement(ACH_MINE);
            }
        } else if (game.u.uz.dnum === game.sokoban_dnum) {
            if (newdungeon) {
                const { ACH_SOKO, record_achievement } =
                    await import('./insight.js');
                record_achievement(ACH_SOKO);
            }
        } else {
            if (!familiar_level && Is_rogue_level(game.u.uz))
                await You('enter what seems to be an older, more primitive world.');
            /* src/do.c:1918, the first arrival at the main-dungeon side
               of the Quest portal carries the leader's telepathic call. */
            const { at_dgn_entrance } = await import('./dungeon.js');
            const old_was_quest = game.u.uz0.dnum === game.quest_dnum;
            const qevent = game.u.uevent || (game.u.uevent = {});
            const qstat = game.quest_status || (game.quest_status = {});
            if (!old_was_quest && at_dgn_entrance('The Quest')
                && !(qevent.qcompleted || qevent.qexpelled
                     || qstat.leader_is_dead)) {
                const { com_pager } = await import('./questpgr.js');
                if (!qevent.qcalled) {
                    qevent.qcalled = 1;
                    await com_pager('quest_portal');
                } else {
                    await com_pager(game.urole.filecode === 'Rog'
                        ? 'quest_portal_demand' : 'quest_portal_again');
                }
            }
        }
    }

    /* src/do.c:1935 temperature_change_msg() — a message when the level
       temperature differs from the previous level's */
    {
        const temp = game.level?.flags?.temperature | 0;
        if (prev_temperature !== temp) {
            if (temp) {
                /* hellish_smoke_mesg() (do.c:2003) */
                await pline(`It is ${temp > 0 ? 'hot' : 'cold'} here.`);
                if (game.dungeons?.[game.u.uz.dnum]?.flags?.hellish
                    && temp > 0) {
                    const { olfaction } = await import('./mondata.js');
                    await You(`${olfaction(game.youmonst.data)
                        ? 'smell' : 'sense'} smoke...`);
                }
            } else if (prev_temperature > 0) {
                await pline(`The heat ${
                    game.dungeons?.[game.u.uz0.dnum]?.flags?.hellish
                        ? 'and smoke are' : 'is'} gone.`);
            } else if (prev_temperature < 0) {
                await You('are out of the cold.');
            }
        }
    }

    /* src/do.c:1942 — log every first visit before Tourist sightseeing
       experience, since gaining a level can append another event. */
    if (!familiar_level) {
        const { LL_ACHIEVE, LL_DEBUG, In_quest, In_endgame,
                Is_astralevel, Is_knox_level } = await import('./const.js');
        const { endgamelevelname } = await import('./dungeon.js');
        const uz = game.u.uz;
        let dloc, addbranch = true;

        /* src/botl.c describe_level(dloc, 2) */
        if (Is_knox_level(uz)) {
            dloc = game.dungeons[uz.dnum].dname;
            addbranch = false;
        } else if (In_quest(uz)) {
            dloc = `Home ${uz.dlevel}`;
        } else if (In_endgame(uz)) {
            dloc = endgamelevelname(depth_do(uz));
            addbranch = false;
        } else {
            dloc = `level ${depth_do(uz)}`;
        }
        if (addbranch) {
            dloc += `, ${game.dungeons[uz.dnum].dname}`;
            dloc = dloc.replace('The ', 'the ');
        }

        const major = ((In_endgame(uz) && !Is_astralevel(uz))
                       || In_quest(uz));
        const { livelog_printf } = await import('./pline.js');
        livelog_printf(major ? LL_ACHIEVE : LL_DEBUG, `entered ${dloc}`);

        if (game.urole?.name?.m === 'Tourist') {
            const { more_experienced, newexplevel } = await import('./exper.js');
            const { level_difficulty } = await import('./dungeon.js');
            more_experienced(level_difficulty(), 0);
            await newexplevel();
        }
    }

    /* src/do.c:1967 — reset u.uz0 */
    game.u.uz0 = { dnum: game.u.uz.dnum, dlevel: game.u.uz.dlevel };

    /* src/do.c:1974, a saved overview annotation is repeated on arrival,
       before room messages and the automatic pickup pass. */
    {
        const { print_level_annotation } = await import('./dungeon.js');
        await print_level_annotation();
    }

    /* src/do.c:1985: deliver one-time room and shop entry messages after
       all level-specific arrival messages, before pickup feedback. */
    await check_special_room(false);

    /* src/do.c:1989, a trapdoor or hole inflicts impact damage only after
       the new level is drawn and its arrival messages have been handled. */
    if (do_fall_dmg) {
        await losehp(maybe_half_physical(d(Math.max(dist, 1), 6)),
                     'falling down a mine shaft', KILLED_BY);
    }

    /* src/do.c:1996 — the arrival square gets its pickup pass, which is
       also what prints look_here/read_engr_at feedback on arrival */
    {
        const { pickup } = await import('./pickup.js');
        await pickup(1);
    }
}

// src/do.c:1411 u_collide_m() — the hero and a monster landed on the same
// square: half the time the hero steps aside (enexto draw), otherwise the
// monster is moved next to the hero (mnexto draws). The fallback rloc/limbo
// arm is recorded.
async function u_collide_m(mtmp, m_at, mnexto) {
    const { enexto_core } = await import('./teleport.js');
    const { goodpos } = await import('./makemon.js');
    const { GP_CHECKSCARY } = await import('./const.js');
    const { game: g } = await import('./gstate.js');

    const cc = { x: 0, y: 0 };
    const next2u = (x, y) => {
        const dx = x - g.u.ux, dy = y - g.u.uy;
        return dx * dx + dy * dy <= 2;
    };
    if (!rn2(2)
        && (enexto_core(cc, g.u.ux, g.u.uy, g.youmonst?.data, GP_CHECKSCARY,
                        goodpos)
            || enexto_core(cc, g.u.ux, g.u.uy, g.youmonst?.data, 0, goodpos))
        && next2u(cc.x, cc.y)) {
        g.u.ux = cc.x; /* u_on_newpos */
        g.u.uy = cc.y;
    } else {
        await mnexto(mtmp);
    }

    if (m_at(g.u.ux, g.u.uy))
        note_unported_do('u_collide_m:rloc_limbo');
}

/* src/dungeon.c depth() — local copy to keep this module's import graph
   acyclic (dungeon.js dynamically imports mkmaze.js which imports mklev.js
   which reaches back here through deferred_goto's users). */
function depth_do(dlev) {
    return (game.dungeons?.[dlev.dnum]?.depth_start ?? 1) + dlev.dlevel - 1;
}

// src/do.c:2043 final_level() — just arrived on the Astral Plane: resolve
// the placeholder alignments of the level's minions against the hero's,
// summon rn1(4,3) player-monsters, and grant the guardian angel.
async function final_level() {
    /* reset monster hostility relative to player: iter_mons() */
    const { reset_hostility } = await import('./priest.js');
    for (const mtmp of (game.level?.monsters || [])) {
        const { DEADMONSTER } = await import('./monst.js');
        if (!DEADMONSTER(mtmp))
            reset_hostility(mtmp);
    }

    /* create some player-monsters */
    const { create_mplayers } = await import('./mplayer.js');
    const { rn1 } = await import('./rng.js');
    create_mplayers(rn1(4, 3), true);

    /* create a guardian angel next to player, if worthy */
    const { gain_guardian_angel } = await import('./minion.js');
    await gain_guardian_angel();
}

// src/stairs.c u_on_sstairs(), u_on_upstairs(), u_on_dnstairs().
async function u_on_sstairs(upflag) {
    for (let stway = game.stairs; stway; stway = stway.next) {
        if (stway.tolev?.dnum !== game.u.uz.dnum
            && !!stway.up !== !!upflag) {
            game.u.ux = stway.sx;
            game.u.uy = stway.sy;
            return;
        }
    }
    const { u_on_rndspot } = await import('./dungeon.js');
    await u_on_rndspot(upflag);
}

async function u_on_upstairs() {
    for (let stway = game.stairs; stway; stway = stway.next) {
        if (stway.up) {
            game.u.ux = stway.sx;
            game.u.uy = stway.sy;
            return;
        }
    }
    await u_on_sstairs(0);
}

async function u_on_dnstairs() {
    for (let stway = game.stairs; stway; stway = stway.next) {
        if (!stway.up) {
            game.u.ux = stway.sx;
            game.u.uy = stway.sy;
            return;
        }
    }
    await u_on_sstairs(1);
}

// include/you.h:354 enum utotypes
export const UTOTYPE_NONE = 0x00;
export const UTOTYPE_ATSTAIRS = 0x01;
export const UTOTYPE_FALLING = 0x02;
export const UTOTYPE_PORTAL = 0x04;
export const UTOTYPE_RMPORTAL = 0x10;
export const UTOTYPE_DEFERRED = 0x20;

// src/do.c schedule_goto() — arrange to change level at the END of this turn.
//
// The level change is DEFERRED rather than immediate: the command that asks
// for it finishes first, and moveloop_core acts on u.utotype after rhack()
// returns. UTOTYPE_DEFERRED is always ORed in so that UTOTYPE_NONE, which is
// zero, still leaves a non-zero value for that test to see.
export function schedule_goto(tolev, utotype_flags, pre_msg, post_msg) {
    game.u.utotype = utotype_flags | UTOTYPE_DEFERRED;
    game.u.utolev = { dnum: tolev.dnum, dlevel: tolev.dlevel };

    if (pre_msg) game.dfr_pre_msg = pre_msg;
    if (post_msg) game.dfr_post_msg = post_msg;
}

// src/do.c deferred_goto() — carry out a scheduled level change.
export async function deferred_goto() {
    const uz = game.u.uz, to = game.u.utolev;

    if (!(uz.dnum === to.dnum && uz.dlevel === to.dlevel)) {
        const typmask = game.u.utotype;   /* goto_level zeroes it */
        const dest = { dnum: to.dnum, dlevel: to.dlevel };
        const oldlev = { dnum: uz.dnum, dlevel: uz.dlevel };

        if (game.dfr_pre_msg)
            await pline(game.dfr_pre_msg);

        await goto_level(dest, !!(typmask & UTOTYPE_ATSTAIRS),
                         !!(typmask & UTOTYPE_FALLING),
                         !!(typmask & UTOTYPE_PORTAL));

        if (typmask & UTOTYPE_RMPORTAL)
            note_unported_do('deferred_goto:remove portal');

        if (game.dfr_post_msg
            && !(game.u.uz.dnum === oldlev.dnum
                 && game.u.uz.dlevel === oldlev.dlevel))
            await pline(game.dfr_post_msg);
    }

    game.u.utotype = UTOTYPE_NONE;      /* the caller keys off this */
    game.dfr_pre_msg = null;
    game.dfr_post_msg = null;
}

// src/do.c dropz() — put the object on the floor (or into the engulfer).
//
// The three wielded-slot clears come FIRST: an object being dropped must stop
// being the weapon, quiver or offhand before it leaves inventory, or those
// pointers dangle.
//
// flooreffects RETURNS EARLY when the object is destroyed on landing -- water,
// lava, a trapdoor -- so place_object is skipped entirely in that case. Calling
// place_object unconditionally would leave a destroyed object on the map.
//
// encumber_msg() runs at the very end and OUTSIDE the swallow branch, so
// dropping while engulfed still reports the weight change.
//
// The engulfer branch, flooreffects, container impact, zombie disturbance,
// ball dropping, shop selling, stackobj and the blind-levitation map_object
// are recorded.
export async function dropz(obj, with_impact) {
    if (obj === game.u.uwep)
        await setuwep_with_feedback(null); /* src/do.c:810 */
    if (obj === game.u.uquiver)
        setuqwep(null);         /* src/do.c:812 */
    if (obj === game.u.uswapwep)
        setuswapwep(null);      /* src/do.c:814 */

    if (game.u.uswallow) {
        note_unported_do('dropz:engulfer_branch');
    } else {
        if (await flooreffects(obj, game.u.ux, game.u.uy, 'drop'))
            return;
        place_object(obj, game.u.ux, game.u.uy);
        if (with_impact)
            note_unported_do('dropz:container_impact_dmg');
        impact_disturbs_zombies(obj, with_impact);
        if (obj === game.uball)
            note_unported_do('dropz:drop_ball');
        else if (game.level?.flags?.has_shop) {
            const { sellobj } = await import('./shk.js');
            await sellobj(obj, game.u.ux, game.u.uy);
        }
        stackobj(obj);
        newsym(game.u.ux, game.u.uy);   /* remap location under self */
    }
    await encumber_msg();
}

// src/do.c dropy() — dropz with no impact.
export async function dropy(obj) {
    await dropz(obj, false);
}

// src/do.c:363 doaltarobj() and src/dothrow.c:606 hitfloor().
// An object that falls while the hero cannot reach the floor still announces
// an altar landing, reveals its beatitude, and then enters the floor pile.
export async function doaltarobj(obj) {
    if (Blind())
        return;

    if (obj.oclass !== OCLASSES.COIN_CLASS) {
        game.u.uconduct ||= {};
        if (!game.context?.mon_moving)
            game.u.uconduct.gnostic = (game.u.uconduct.gnostic || 0) + 1;
    } else {
        obj.blessed = obj.cursed = 0;
    }

    const [{ doname, otense, an }, { upstart, hcolor }]
        = await Promise.all([import('./objnam.js'), import('./do_name.js')]);
    if (obj.blessed || obj.cursed) {
        const color = hcolor(obj.blessed ? NH_AMBER : NH_BLACK);
        await pline(`There is ${an(color)} flash as ${doname(obj)} ${otense(obj, 'hit')} the altar.`);
        if (!Hallucination())
            obj.bknown = 1;
    } else {
        await pline(`${upstart(doname(obj))} ${otense(obj, 'land')} on the altar.`);
        if (obj.oclass !== OCLASSES.COIN_CLASS)
            obj.bknown = 1;
    }
}

export async function hitfloor(obj, verbosely) {
    const loc = game.level.at(game.u.ux, game.u.uy);
    if (IS_SOFT(loc.typ) || game.u.uinwater || game.u.uswallow) {
        await dropy(obj);
        return;
    }
    if (IS_ALTAR(loc.typ)) {
        await doaltarobj(obj);
    } else if (verbosely) {
        const [{ doname, otense }, { upstart }, { surface }]
            = await Promise.all([
                import('./objnam.js'), import('./do_name.js'),
                import('./dungeon.js'),
            ]);
        await pline(`${upstart(doname(obj))} ${otense(obj, 'hit')} the ${surface(game.u.ux, game.u.uy)}.`);
    }
    if (obj.oclass === OCLASSES.POTION_CLASS) {
        const { hero_breaks_potion } = await import('./dothrow.js');
        if (await hero_breaks_potion(obj))
            return;
    }
    if (ship_object_fn
        && ship_object_fn(obj, game.u.ux, game.u.uy, false))
        return;
    await dropz(obj, true);
}

// src/do.c dropx() — take it out of inventory, then put it down.
//
// freeinv FIRST, then the placement. ship_object is the chute that swallows
// an object on a Sokoban or level-teleporter square and RETURNS EARLY, so
// nothing reaches the floor there; doaltarobj sets bknown when it lands on
// an altar.
export async function dropx(obj) {
    const oldcap = near_capacity();
    freeinv(obj);
    if (near_capacity() !== oldcap)
        game._encumber_status_stale = true;
    if (!game.u.uswallow) {
        /* src/do.c:298 — ship_object() sends the object down a hole or
           stairs and returns TRUE when it did, in which case dropy() must
           not also place it. */
        if (ship_object_fn && ship_object_fn(obj, game.u.ux, game.u.uy, false))
            return;
        if (IS_ALTAR(game.level.at(game.u.ux, game.u.uy)?.typ))
            await doaltarobj(obj);
    }
    await dropy(obj);
}

// src/do.c drop() — the guards, then dropx().
//
// Four ways to fail before anything moves: no object, canletgo says no
// (cursed-and-worn, or a container in use), a corpse better_not_try_to_drop,
// and a WELDED weapon -- which prints the weld message and fails rather than
// silently declining, so the player learns why.
//
// The wielded-slot clears happen HERE as well as in dropz. That is not
// redundant in C: drop() can return ECMD_TIME through the levitation path
// below without ever reaching dropz, and the slot still has to be cleared.
//
// how_lost = LOST_DROPPED is set immediately before dropx so the object
// records how it left inventory; bones and shop code read it.
//
// The engulfed branch, the Heart of Ahriman levitation dance (ELevitation is
// forced so hitfloor happens before float_down), doname messages, canletgo,
// welded/weldmsg and hitfloor are recorded.
async function better_not_try_to_drop_that(obj) {
    if (obj.otyp !== ONAMES.CORPSE
        || u_safe_from_fatal_corpse(obj, st_all))
        return false;

    const species = corpse_xname(obj, null, CXN_NOCORPSE);
    const prompt = `Drop the ${species} corpse without ${body_part(HAND)} protection on?`;
    return (await paranoid_ynq(true, prompt, false)) !== 'y';
}

export async function drop(obj) {
    if (!obj)
        return ECMD_FAIL;
    if (!await canletgo_with_feedback(obj, 'drop'))
        return ECMD_FAIL;
    if (await better_not_try_to_drop_that(obj))
        return ECMD_FAIL;
    if (obj === game.u.uwep) {
        if (welded(game.u.uwep)) {
            await weldmsg(obj);
            return ECMD_FAIL;
        }
        await setuwep_with_feedback(null); /* src/do.c:727 */
    }
    if (obj === game.u.uquiver)
        setuqwep(null);
    if (obj === game.u.uswapwep)
        setuswapwep(null);

    if (game.u.uswallow) {
        note_unported_do('drop:engulfed_branch');
    } else {
        /* src/do.c:747 — the sink-ring and can't-reach-floor (levitation)
           arms come first; on the ordinary path the drop is announced
           unless it lands on an altar (doaltarobj speaks there) */
        if (!can_reach_floor(true)) {
            note_unported_do('drop:levitation');
        } else if (!IS_ALTAR(game.level.at(game.u.ux, game.u.uy)?.typ)
                   && game.flags?.verbose !== false) {
            const { You } = await import('./pline.js');
            const { doname } = await import('./objnam.js');
            await You(`drop ${await doname(obj)}.`);
        }
    }
    obj.how_lost = LOST_DROPPED;
    await dropx(obj);
    return ECMD_TIME;
}

// src/do.c dodrop() — the 'd' command.
//
// sellobj_state brackets the getobj so a shop prices the item as a
// DELIBERATE sale rather than an accidental one, and is restored afterwards
// whether or not anything was dropped.
export async function dodrop() {
    if (game.u.ushops?.length) {
        const { sellobj_state } = await import('./shk.js');
        sellobj_state(1); // SELL_DELIBERATE
    }
    const result = await drop(await getobj('drop', any_obj_ok,
                                     GETOBJ_PROMPT | GETOBJ_ALLOWCNT));
    if (game.u.ushops?.length) {
        const { sellobj_state } = await import('./shk.js');
        sellobj_state(0); // SELL_NORMAL
    }
    if (result)
        reset_occupations();

    return result;
}

// src/do.c:893 obj_no_longer_held()
export async function obj_no_longer_held(obj) {
    if (!obj) {
        return;
    } else if (Has_contents(obj)) {
        for (const contents of obj.cobj || [])
            await obj_no_longer_held(contents);
    }
    switch (obj.otyp) {
    case ONAMES.CRYSKNIFE:
        /* Normal crysknife reverts to worm tooth when not held by hero
         * or monster; fixed crysknife has only 10% chance of reverting.
         * When a stack of the latter is involved, it could be worthwhile
         * to give each individual crysknife its own separate 10% chance,
         * but we aren't in any position to handle stack splitting here.
         */
        if (!obj.oerodeproof || !rn2(10)) {
            /* if monsters aren't moving, assume player is responsible */
            if (!game.context?.mon_moving && !game.program_state_gameover)
                await costly_alteration(obj, COST_DEGRD);
            obj.otyp = ONAMES.WORM_TOOTH;
            obj.oerodeproof = 0;
        }
        break;
    }
}

// src/do.c:924 doddrop() and :980 menu_drop(), the 'D' command.
async function menudrop_split(obj, count) {
    let selected = obj;
    if (count && count < obj.quan) {
        if (welded(obj)) {
            /* welded stacks are not split */
        } else if (obj.otyp === ONAMES.LOADSTONE && obj.cursed) {
            obj.corpsenm = count;
        } else {
            selected = splitobj(obj, count);
        }
    }
    return drop(selected);
}

export async function doddrop() {
    if (!game.invent?.length) {
        await You('have nothing to drop.');
        return ECMD_OK;
    }

    add_valid_menu_class(0);
    if (game.u.ushops?.length) {
        const { sellobj_state } = await import('./shk.js');
        sellobj_state(1); // SELL_DELIBERATE
    }

    let result = ECMD_OK;
    if ((game.flags?.menu_style ?? MENU_FULL) === MENU_FULL) {
        let all_categories = false;
        let drop_everything = false;
        let autopick = false;
        const categories = await query_drop_categories(game.invent);

        for (const category of categories) {
            if (category === ALL_TYPES_SELECTED) {
                all_categories = true;
            } else if (category === 'A'.charCodeAt(0)) {
                drop_everything = autopick = true;
            } else {
                add_valid_menu_class(category);
                drop_everything = false;
            }
        }

        let dropped = 0;
        if (autopick) {
            for (const obj of [...game.invent]) {
                if (drop_everything || all_categories || allow_category(obj))
                    dropped += (await drop(obj)) === ECMD_TIME ? 1 : 0;
            }
        } else if (categories.length) {
            const eligible = game.invent.filter(
                (obj) => all_categories || allow_category(obj));
            const objects = await query_objlist(
                'What would you like to drop?', eligible,
                INVORDER_SORT | USE_INVLET, PICK_ANY, allow_all);
            for (const obj of objects) {
                if (game.invent.includes(obj)) {
                    const count = objects.counts?.get(obj) ?? obj.quan;
                    dropped += (await menudrop_split(obj, count)) === ECMD_TIME
                        ? 1 : 0;
                }
            }
        }
        result = dropped ? ECMD_TIME : ECMD_OK;
    } else {
        note_unported_do('doddrop:non_full_menu_style');
    }

    if (game.u.ushops?.length) {
        const { sellobj_state } = await import('./shk.js');
        sellobj_state(0); // SELL_NORMAL
    }
    if (result)
        reset_occupations();
    return result;
}

// src/do.c:665 canletgo() — may this object leave the hero's hands?
//
// Five refusals, and each one's MESSAGE is suppressed when `word` is empty:
// callers that only want the yes/no answer pass "" and get it silently. That
// is why the welded arm's comment warns that bknown can become set with no
// message shown.
//
//   worn armour or accessory   you cannot drop what you are wearing
//   welded uwep                and NO weldmsg here, unlike drop()
//   cursed LOADSTONE           the classic refusal, and it set_bknown()s
//   LEASH with a monster on it tied around your hand
//   the SADDLE you are on
//
// The loadstone arm carries a getobj kludge: corpsenm holds the count the
// player asked for when a stack split was refused, is used to word the
// message, and is RESET to 0 immediately after. Preserved because a leftover
// corpsenm on a loadstone would read as a corpse type.
//
// The messages, body_part/makeplural and set_bknown are recorded; every
// refusal itself is real.
export function canletgo(obj, word) {
    if (obj.owornmask & (W_ARMOR | W_ACCESSORY)) {
        if (word) {
            game._canletgo_message = `You cannot ${word} something you are wearing.`;
            game._canletgo_norep = true;
        }
        return false;
    }
    if (obj === game.u.uwep && welded(game.u.uwep)) {
        /* no weldmsg(), so uwep bknown might become set silently */
        if (word) {
            let hand = body_part(HAND);
            if (bimanual(game.u.uwep))
                hand = makeplural(hand);
            game._canletgo_message = `You cannot ${word} something welded to your ${hand}.`;
            game._canletgo_norep = true;
        }
        return false;
    }
    if (obj.otyp === ONAMES.LOADSTONE && obj.cursed) {
        if (word) {
            /* getobj ignores a count for throwing; replicate its kludge */
            if (word === 'throw' && obj.quan > 1)
                obj.corpsenm = 1;
            game._canletgo_message = `For some reason, you cannot ${word}${
                obj.corpsenm ? ' any of' : ''} the stone${obj.quan === 1 ? '' : 's'}!`;
        }
        obj.corpsenm = 0;               /* reset */
        set_bknown(obj, 1);
        return false;
    }
    if (obj.otyp === ONAMES.LEASH && obj.leashmon !== 0) {
        if (word)
            game._canletgo_message = `The leash is tied around your ${body_part(HAND)}.`;
        return false;
    }
    if (obj.owornmask & W_SADDLE) {
        if (word)
            game._canletgo_message = `You cannot ${word} something you are sitting on.`;
        return false;
    }
    return true;
}

/* canletgo() is a synchronous predicate because several AI and equipment
   callers use it silently. Command callers use this wrapper to emit the
   message through the same pline or Norep path as src/do.c:665-710. */
export async function canletgo_with_feedback(obj, word) {
    delete game._canletgo_message;
    delete game._canletgo_norep;
    if (canletgo(obj, word))
        return true;

    const message = game._canletgo_message;
    const norep = !!game._canletgo_norep;
    delete game._canletgo_message;
    delete game._canletgo_norep;
    if (message) {
        if (norep)
            await Norep(message);
        else
            await pline(message);
    }
    return false;
}

// src/do.c:2325 cmd_safety_prevention() — refuse a no-op command next to a
// spottable hostile (flags.safe_wait defaults On).
export async function cmd_safety_prevention(ucverb, cmddesc, act,
                                            flagname = 'did_nothing_flag') {
    if ((game.flags?.safe_wait ?? true) && !game.iflags?.menu_requested
        && !(game.multi ?? 0)) {
        const { monster_nearby } = await import('./hack.js');
        const { boolean_option } = await import('./options.js');
        const first = !(game[flagname] | 0);
        const buf = (boolean_option('cmdassist') || first)
            ? `  Use 'm' prefix to force ${cmddesc}.` : '';
        if (monster_nearby()) {
            game[flagname] = (game[flagname] | 0) + 1;
            /* C uses Norep: back-to-back refusals print only once */
            const { Norep } = await import('./pline.js');
            await Norep(`${act}${buf}`);
            return true;
        }
        /* danger_uprops(): Stoned/Slimed/Strangled/Sick — none tracked */
    }
    game[flagname] = 0;
    return false;
}

// src/do.c:2350 donull() — the '.' command: do nothing == rest.
export async function donull() {
    if (await cmd_safety_prevention('Waiting', 'a no-op (to rest)',
                                    'Are you waiting to get hit?'))
        return ECMD_OK;
    return ECMD_TIME; /* Do nothing, but let other things happen */
}

// src/do.c:2361 wipeoff() and :2390 dowipe(): wipe cream-pie goop from
// the hero's face as a multi-turn occupation.
async function wipeoff() {
    const u = game.u;
    u.ucreamed = Math.max(0, (u.ucreamed || 0)
                             - Math.min(u.ucreamed || 0, 4));
    const intr = (u.intrinsic ||= {});
    const blinded = intr.HBlinded || 0;
    intr.HBlinded = Math.max(0, blinded - Math.min(blinded, 4));

    if (!intr.HBlinded) {
        await pline("You've got the glop off.");
        u.ucreamed = 0;
        if (u.ublind && !u.ublindf) {
            u.ublind = 0;
            game.vision_full_recalc = 1;
            (game.disp ||= {}).botl = true;
            await You('can see again.');
        }
        return 0;
    }
    if (!u.ucreamed) {
        await Your(`${body_part(FACE)} feels clean now.`);
        return 0;
    }
    return 1;
}

export async function dowipe() {
    if (game.u.ucreamed) {
        const { set_occupation } = await import('./allmain.js');
        set_occupation(wipeoff, `wiping off your ${body_part(FACE)}`, 0);
        return ECMD_TIME;
    }
    await Your(`${body_part(FACE)} is already clean.`);
    return ECMD_TIME;
}


// src/do.c:2426 set_wounded_legs() — wound the hero's leg(s): one temporary
// Dex point the first time, a recovery timer (kept at the max of old and
// new), and which side, tracked with the worn-ring bits.
export async function set_wounded_legs(side, timex) {
    game.disp ||= {};
    game.disp.botl = true;
    const intr = (game.u.intrinsic ||= {});
    const wounded = (intr.HWounded_legs || 0) > 0 || (game.u.EWounded_legs || 0);
    if (!wounded)
        game.u.atemp.a[A_DEX]--;

    if (!wounded || (intr.HWounded_legs || 0) < timex)
        intr.HWounded_legs = timex;
    game.u.EWounded_legs = (game.u.EWounded_legs || 0) | side;
    await encumber_msg();   /* the Dex loss shifts carrying capacity */
}

// src/do.c:2449 heal_legs() — 0: ordinary, 1: dismounting, 2: petrifying.
export async function heal_legs(how) {
    const intr = game.u.intrinsic || {};
    const wounded = (intr.HWounded_legs || 0) > 0 || (game.u.EWounded_legs || 0);
    if (wounded) {
        game.disp ||= {};
        game.disp.botl = true;
        if (game.u.atemp.a[A_DEX] < 0)
            game.u.atemp.a[A_DEX]++;

        if (!game.u.usteed && how !== 2) {
            const both = (game.u.EWounded_legs & BOTH_SIDES) === BOTH_SIDES;
            const legs = both ? 'legs' : 'leg';
            await Your(`${legs} ${both ? 'feel' : 'feels'} better.`);
        }

        intr.HWounded_legs = 0;
        game.u.EWounded_legs = 0;

        if (how === 0)
            await encumber_msg();
    }
}

// src/do.c legs_in_no_shape(); wounded legs refuse jumping, kicking, riding
export async function legs_in_no_shape(for_what, /* jumping, kicking, riding */
                                       by_steed) {
    if (by_steed && game.u.usteed) {
        await pline(`${Monnam(game.u.usteed)} is in no shape for ${for_what}.`);
    } else {
        const wl = ((game.u.EWounded_legs | 0) & BOTH_SIDES);
        let bp = body_part(LEG);

        if (wl === BOTH_SIDES)
            bp = makeplural(bp);
        await Your(`${
            (wl === LEFT_SIDE) ? 'left ' : (wl === RIGHT_SIDE) ? 'right ' : ''}${
            bp} ${(wl === BOTH_SIDES) ? 'are' : 'is'} in no shape for ${for_what}.`);
    }
}
