// pickup.js — Floor look / autopickup / manual `,` pickup.
// C ref: pickup.c — check_here(), pickup(), pickup_object(), pick_obj(),
//        describe_decor(); hack.c — spoteffects(), dopickup(), pickup_checks().

import { game } from './gstate.js';
import {
    objects_at, obj_extract_self, splitobj,
} from './mkobj.js';
import { look_here, observe_object, dfeature_at } from './invent.js';
import { nomul, check_special_room, is_pool, is_lava } from './hack.js';
import { flush_screen, pline, newsym } from './display.js';
import { addinv } from './u_init.js';
import { xprname, an } from './objnam.js';
import { can_reach_floor } from './engrave.js';
import {
    ECMD_OK, ECMD_TIME, OBJ_FLOOR, is_pit,
    STONE, ICE, DRAWBRIDGE_UP,
    IS_POOL, IS_LAVA, IS_FURNITURE, IS_WATERWALL,
    LOOKHERE_PICKED_SOME, LOOKHERE_SKIP_DFEATURE,
} from './const.js';
import { t_at, dotrap, NO_TRAP_FLAGS, drown, lava_effects } from './trap.js';

/** C ref: hacklib.c upstart — capitalize first letter. */
function upstart(str) {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * C ref: rm.h SURFACE_AT — under-typ for DRAWBRIDGE_UP deferred → raw typ.
 */
function surface_at(x, y) {
    const lev = game.level?.at(x, y);
    if (!lev) return STONE;
    // C: DRAWBRIDGE_UP → db_under_typ(drawbridgemask); deferred
    if (lev.typ === DRAWBRIDGE_UP) return lev.typ;
    return lev.typ;
}

/**
 * C ref: pickup.c describe_decor — mention_decor feedback for features.
 * Branch envelope: dfeature_at + skip open door/doorway; furniture/typ
 * change gate; verbose "There is %s here." Named omissions: Fumbling
 * deferred_decor, waterbody_name swamp/pool rename, ice Norep,
 * back_on_ground after pool/lava/ice, decor_fumble/levitate overrides.
 */
export async function describe_decor() {
    const u = game.u;
    if (!u) return false;

    if (!game.iflags) game.iflags = {};
    const iflags = game.iflags;
    if (iflags.prev_decor == null) iflags.prev_decor = STONE;

    const ltyp = surface_at(u.ux, u.uy);
    let dfeature = dfeature_at(u.ux, u.uy);

    // C: skip ordinary open door / doorway (broken/closed still mentioned)
    const doorhere = !!(dfeature && (dfeature === 'open door'
        || dfeature === 'doorway'));
    const waterhere = !!(dfeature && dfeature === 'pool of water');
    if (doorhere || u.Underwater
        || (ltyp === ICE && IS_POOL(iflags.prev_decor))) {
        dfeature = null;
    }

    let res = true;
    if (ltyp === iflags.prev_decor && !IS_FURNITURE(ltyp)) {
        res = false;
    } else if (dfeature) {
        // waterbody_name deferred — keep "pool of water"
        void waterhere;
        if (dfeature !== 'swamp' && ltyp !== ICE) {
            dfeature = an(dfeature);
        }
        let outbuf;
        if (game.flags?.verbose !== false) {
            outbuf = `There is ${dfeature} here.`;
        } else {
            outbuf = `${upstart(dfeature)}.`;
        }
        // C: ICE + mention_decor → Norep; use pline for all (Norep deferred)
        await pline(outbuf);
    } else if (!u.Underwater) {
        // C: back_on_ground when leaving pool/lava/ice — deferred
    }

    // C: only persist prev_decor when mention_decor is On
    iflags.prev_decor = game.flags?.mention_decor ? ltyp : STONE;
    return res;
}

/**
 * C ref: pickup.c check_here — count floor objects and look_here / engr.
 * Named omissions: uchain skip.
 */
export async function check_here(picked_some) {
    const u = game.u;
    if (!u) return;

    let lhflags = picked_some ? LOOKHERE_PICKED_SOME : 0;
    // C: flags.mention_decor → describe_decor; may set LOOKHERE_SKIP_DFEATURE
    if (game.flags?.mention_decor) {
        if (await describe_decor()) {
            lhflags |= LOOKHERE_SKIP_DFEATURE;
        }
    }

    let ct = 0;
    for (let obj = objects_at(u.ux, u.uy); obj; obj = obj.nexthere) {
        // C: if (obj != uchain) ct++;
        ct++;
    }

    if (ct) {
        if (game.context?.run) nomul(0);
        await flush_screen(1);
        await look_here(ct, lhflags);
    } else {
        // C: read_engr_at(u.ux, u.uy) when no floor objects
        const { read_engr_at } = await import('./engrave.js');
        await read_engr_at(u.ux, u.uy);
    }
}

/**
 * C ref: pickup.c pick_obj — extract from floor/minvent, addinv.
 * Named omissions: shop addtobill / remote_burglary; engulfer minvent path.
 */
export async function pick_obj(otmp) {
    if (!otmp) return otmp;
    const ox = otmp.ox | 0;
    const oy = otmp.oy | 0;
    const fromfloor = otmp.where === OBJ_FLOOR;
    obj_extract_self(otmp);
    if (fromfloor) newsym(ox, oy);
    return addinv(otmp);
}

/**
 * C ref: pickup.c pickup_prinv — encumbrance-prefix prinv.
 * Overload/nearload prefix deferred; bare prinv when capacity unchanged.
 */
async function pickup_prinv(obj, count) {
    void count;
    // C: prinv(prefix, obj, count) — null prefix → "ilet - doname."
    await pline(xprname(obj, undefined, true));
}

/**
 * C ref: pickup.c pickup_object — lift one floor/minvent object into invent.
 * Branch envelope: observe_object; splitobj when count < quan; pick_obj +
 * prinv. Named omissions: uchain; engulfer worn; touch_artifact; CORPSE
 * fatal/rider; SCR_SCARE_MONSTER dust; lift_object carry_count fail;
 * LOADSTONE no-split; ghostly; gold botl.
 */
export async function pickup_object(obj, count, telekinesis) {
    if (!obj) return 0;
    void telekinesis;

    if (!game.u?.Blind) observe_object(obj);

    let quan = count > 0 ? count : (obj.quan || 1);
    if (quan > (obj.quan || 1)) quan = obj.quan || 1;

    // lift_object carry_count deferred — always liftable for now
    // C: LOADSTONE never splits (named omission: always allow split here;
    // AUTOSELECT full-quan path never hits this branch)
    if (quan > 0 && quan < (obj.quan || 1)) {
        obj = splitobj(obj, quan);
    }

    obj = await pick_obj(obj);
    await pickup_prinv(obj, quan);
    return 1;
}

/**
 * C ref: pickup.c pickup(what).
 * Ported envelope: autopickup && (nopick / !OBJ_AT / pool / lava) →
 * describe_decor + read_engr_at; autopickup && !flags.pickup →
 * check_here(FALSE); manual `,` AUTOSELECT_SINGLE one object.
 * Deferred: unconscious skip, notake, autopick()/query_objlist multi,
 * traditional yn/query_classes, hideunder, newsym_force, full is_pool.
 */
export async function pickup(what) {
    const autopickup = what > 0;
    const count = what < 0 ? -what : 0;
    const u = game.u;
    if (!u) return 0;

    // C: autopickup && (nopick || !OBJ_AT || pool || lava)
    if (autopickup) {
        const loc = game.level?.at(u.ux, u.uy);
        const typ = loc?.typ;
        const poolish = IS_POOL(typ) && !u.Underwater;
        const lavaish = IS_LAVA(typ);
        if (game.context?.nopick || !objects_at(u.ux, u.uy)
            || poolish || lavaish) {
            if (game.flags?.mention_decor) await describe_decor();
            const { read_engr_at } = await import('./engrave.js');
            await read_engr_at(u.ux, u.uy);
            return 0;
        }
    }

    // C: autopickup && !flags.pickup → check_here(FALSE); return 0
    if (autopickup && !game.flags?.pickup) {
        if (objects_at(u.ux, u.uy)
            && game.context?.run && game.context.run !== 8
            && !game.context?.nopick) {
            nomul(0);
        }
        await check_here(false);
        return 0;
    }

    if (!can_reach_floor(true)) {
        // C: describe_decor even when !mention_decor; read_engr arms partial
        await describe_decor();
        return 0;
    }

    let ct = 0;
    let first = null;
    for (let obj = objects_at(u.ux, u.uy); obj; obj = obj.nexthere) {
        ct++;
        if (!first) first = obj;
    }
    if (ct === 0) return 0;

    // C: menu_style != TRADITIONAL → query_objlist + AUTOSELECT_SINGLE
    // One eligible object: auto-select without menu (no extra keys).
    if (ct === 1) {
        const lcount = count > 0
            ? Math.min(first.quan || 1, count)
            : 0;
        const res = await pickup_object(first, lcount, false);
        return res > 0 ? 1 : 0; // n_tried > 0
    }

    // Multi-object query_objlist / traditional path deferred
    await pline('There are several objects here.');
    return 0;
}

/**
 * C ref: hack.c pickup_checks — preflight for #pickup / `,`.
 * Returns >=0 → dopickup done (1=TIME, 0=OK); -1 → normal pickup;
 * -2 engulfer loot deferred as 0.
 * Named omissions: pool/lava dive plines; furniture-specific nothing msgs
 * (generic "nothing here" used); engulfer tongue/loot_mon.
 */
function pickup_checks() {
    const u = game.u;
    if (!u) return 0;

    if (u.uswallow) {
        // loot_mon / tongue paths deferred
        return 0;
    }
    if (!objects_at(u.ux, u.uy)) return 0; // nothing / furniture → ECMD_OK
    if (!can_reach_floor(true)) return 0;
    return -1;
}

/**
 * C ref: hack.c dopickup — `#pickup` / `,` command.
 * Clears multi + command_count; pickup_checks then pickup(-count).
 */
export async function dopickup() {
    const count = (game.context?.command_count | 0);
    if (game.context) game.context.command_count = 0;
    game.multi = 0;

    const ret = pickup_checks();
    if (ret >= 0) {
        if (ret === 0 && !objects_at(game.u?.ux, game.u?.uy)) {
            await pline('There is nothing here to pick up.');
        }
        return ret ? ECMD_TIME : ECMD_OK;
    }
    // ret == -1: normal floor pickup
    const tried = await pickup(-count);
    return tried ? ECMD_TIME : ECMD_OK;
}

/**
 * C ref: hack.c pooleffects(newspot).
 * Branch envelope: enter pool/lava → drown/lava_effects; leave-water /
 * steed / ceiling_hider / Wwalking arms deferred.
 * @returns {Promise<boolean>} true → skip rest of spoteffects
 */
export async function pooleffects(newspot) {
    const u = game.u;
    if (!u) return false;

    // leaving-water arm deferred

    if (!u.ustuck && !u.Levitation && !u.Flying
        && (is_pool(u.ux, u.uy) || is_lava(u.ux, u.uy))) {
        // steed / ceiling_hider deferred
        if (is_lava(u.ux, u.uy)) {
            if (await lava_effects()) return true;
        } else {
            // C: (!Wwalking || waterwall) && (newspot || !uinwater || !(Swim|…))
            const typ = game.level?.at(u.ux, u.uy)?.typ;
            const waterwall = IS_WATERWALL(typ);
            if (waterwall || newspot || !u.uinwater) {
                if (await drown()) return true;
            }
        }
    }
    return false;
}

/**
 * C ref: hack.c spoteffects(pick).
 * Ported envelope: pooleffects; check_special_room; when
 * !in_steed_dismounting — non-pit pickup then dotrap then pit pickup.
 * Deferred: recursion guards, sink fall, levitation timeout, Warning ice,
 * hidden monster surprise.
 */
export async function spoteffects(pick) {
    if (await pooleffects(true)) return;

    await check_special_room(false);

    // C: entire pickup/dotrap block gated on !gi.in_steed_dismounting
    if (game.in_steed_dismounting) return;
    const u = game.u;
    if (!u) return;

    const trap = t_at(u.ux, u.uy);
    const pit = !!(trap && is_pit(trap.ttyp));
    if (pick && !pit) await pickup(1);
    if (trap) await dotrap(trap, NO_TRAP_FLAGS);
    if (pick && pit) await pickup(1);
}
