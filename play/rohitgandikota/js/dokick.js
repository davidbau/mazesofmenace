// dokick.js — kicking, and the object-shipping machinery that lives with it.
// C ref: src/dokick.c
//
// Only down_gate() and ship_object()'s early returns so far; kicking itself
// is not ported.
//
// NOTE ON WIRING: js/do.js calls ship_object() but must NOT import this file.
// do.js does module-init-time wiring (do_wire_mklev), so any new module that
// pulls do.js back in during its initialisation hits a temporal dead zone on
// mklev_fn rather than a clean circular-import error, and the whole suite
// reads 0. js/cmd.js does the wiring instead, exactly as it already does for
// mklev and sp_lev.

import { game } from './gstate.js';
import { MIGR_NOWHERE, MIGR_RANDOM, MIGR_STAIRS_UP, MIGR_LADDER_UP,
         MIGR_SSTAIRS, TRAPDOOR, is_hole, SLT_ENCUMBER, STRAT_WAITMASK,
         ECMD_OK, ECMD_TIME, ECMD_FAIL, ECMD_CANCEL, isok } from './const.js';
import { rn2 } from './rng.js';
import { dist2 } from './hacklib.js';
import { near_capacity, acurrstr, ACURR, exercise } from './attrib.js';
import { rnl, rnd } from './rng.js';
import { A_STR, A_DEX, A_CON, D_ISOPEN, D_BROKEN, D_NODOOR, D_TRAPPED,
         IS_DOOR } from './const.js';
import { newsym } from './display.js';
import { You } from './pline.js';
import { is_pool } from './mon.js';
import { OBJ_AT } from './const.js';
import { sobj_at } from './invent.js';
import { ONAMES } from './objects_data.js';
import { pline, canspotmon, more } from './display.js';
import { Your } from './pline.js';
import { m_at } from './mon.js';
import { u_wipe_engr } from './engrave.js';
import { overexertion } from './hack.js';

import { attack_checks } from './uhitm.js';
import { getdir } from './cmd.js';

/* src/dokick.c:8 martial() — Samurai and Monk get the bonus, as do bigfoot
   forms and anyone wearing kicking boots. */
function martial() {
    const r = game.urole?.name?.m;
    return (r === 'Samurai' || r === 'Monk')
           || (game.uarmf && game.uarmf.otyp === ONAMES.KICKING_BOOTS);
}

function note_unported_dokick(what) {
    (game.unported ||= new Set()).add(what);
}

/* display_nhwindow(WIN_MESSAGE, TRUE) — the blocking --More-- C uses to make
   sure the refusal is read before the direction key arrives. */
async function display_nhwindow_message() {
    await more();
}

// src/dokick.c down_gate() — is there a way DOWN from (x,y) for a dropped
// object to fall through? Returns a MIGR_* code, or MIGR_NOWHERE for an
// ordinary square, which is what makes ship_object() a no-op almost
// everywhere.
//
// stairway_at() and t_at() arrive through the wiring below rather than by
// import, for the reason in the file header.
// var, not let: cmd.js wires these from its top level, which can run before
// this body evaluates (see the add_room_fn note in js/sp_lev.js).
var stairway_at_fn, t_at_fn;
export function dokick_wire(fns) {
    stairway_at_fn = fns.stairway_at;
    t_at_fn = fns.t_at;
}

export function down_gate(x, y) {
    const stway = stairway_at_fn ? stairway_at_fn(x, y) : null;

    game.gate_str = 0;
    /* this matches the player restriction in goto_level().
       on_level(&u.uz, &qstart_level) && !ok_to_quest() -- neither is ported,
       and the quest start level is not reachable in an early-dungeon
       session, so record rather than guess. */
    if (game.level?.flags?.is_qstart)
        (game.unported ||= new Set()).add('dokick:down_gate:quest');

    if (stway && !stway.up && !stway.isladder) {
        game.gate_str = 'down the stairs';
        return (stway.tolev?.dnum === game.u?.uz?.dnum) ? MIGR_STAIRS_UP
                                                        : MIGR_SSTAIRS;
    }
    if (stway && !stway.up && stway.isladder) {
        game.gate_str = 'down the ladder';
        return MIGR_LADDER_UP;
    }
    /* hole will always be flagged as seen; trap drop might or might not */
    const ttmp = t_at_fn ? t_at_fn(x, y) : null;
    if (ttmp && ttmp.tseen && is_hole(ttmp.ttyp)) {
        game.gate_str = (ttmp.ttyp === TRAPDOOR) ? 'through the trap door'
                                                 : 'through the hole';
        return MIGR_RANDOM;
    }
    return MIGR_NOWHERE;
}

// src/dokick.c ship_object() — send a dropped object down a hole or stairs.
//
// Only the two early returns are ported, and they are what answers on any
// ordinary square: no object means FALSE, and no downward gate means FALSE.
// The actual shipping needs drop_to(), the migration lists and the shop arms,
// so a square that DOES have a gate records rather than guessing.
export function ship_object(otmp, x, y, shop_floor_obj) {
    if (!otmp)
        return false;
    if (down_gate(x, y) === MIGR_NOWHERE)
        return false;

    (game.unported ||= new Set()).add('dokick:ship_object:migration');
    return false;
}


// src/mon.c:4367 wake_nearby() — wake everything within ulevel*20 squared.
// Draws nothing: it clears msleeping and the waiting strategy bit.
function wake_nearby(petcall) {
    const distance = game.u.ulevel * 20;
    for (const mtmp of (game.level?.monsters || [])) {
        if (mtmp.mhp <= 0)
            continue;
        if (distance === 0
            || dist2(mtmp.mx, mtmp.my, game.u.ux, game.u.uy) < distance) {
            mtmp.msleeping = 0;
            mtmp.mstrategy &= ~STRAT_WAITMASK;
            if (petcall && mtmp.mtame)
                note_unported_dokick('wake_nearby:petcall');
        }
    }
}

// src/dokick.c:1213 maybe_kick_monster() — the checks that can call the kick
// off. forcefight is forced on for a hostile or unseen target so
// attack_checks does not ask "Really attack?"; overexertion() DRAWS.
async function maybe_kick_monster(mon, x, y) {
    if (!mon)
        return false;
    const save_forcefight = game.context.forcefight;

    game.bhitpos = { x, y };
    if (!mon.mpeaceful || !canspotmon(mon))
        game.context.forcefight = true; /* attack even if invisible */
    let ok = true;
    if ((await attack_checks(mon, null)) || (await overexertion()))
        ok = false;                     /* don't kick after all */
    game.context.forcefight = save_forcefight;
    return ok;
}

// src/dokick.c:1257 dokick() — the '^D' command.
//
// The refusal chain comes first and each arm ends the command after a
// --More--; only then is a direction read. What is ported is the chain, the
// direction, the swallowed and Levitation arms, and the monster kick; kicking
// objects, doors and terrain is recorded.
export async function dokick() {
    let no_kick = false;

    if (game.u.usteed) {
        note_unported_dokick('dokick:steed');
        return ECMD_OK;
    }
    if (near_capacity() > SLT_ENCUMBER) {
        await Your('load is too heavy to balance yourself for a kick.');
        no_kick = true;
    } else if (game.u.uinwater && !rn2(2)) {
        await Your("slow motion kick doesn't hit anything.");
        no_kick = true;
    } else if (game.u.utrap) {
        no_kick = true;
        note_unported_dokick('dokick:utrap');
    } else if (sobj_at(ONAMES.BOULDER, game.u.ux, game.u.uy)) {
        await pline("There's not enough room to kick in here.");
        no_kick = true;
    }

    if (no_kick) {
        /* ignore direction typed before the player notices the kick failed */
        await display_nhwindow_message();      /* --More-- */
        return ECMD_FAIL;
    }

    if (!(await getdir(null)))
        return ECMD_CANCEL;
    if (!game.u.dx && !game.u.dy)
        return ECMD_CANCEL;

    const x = game.u.ux + game.u.dx, y = game.u.uy + game.u.dy;
    game.kickedloc = { x, y };

    if (game.u.uswallow) {
        rn2(3);
        note_unported_dokick('dokick:uswallow');
        return ECMD_TIME;
    }
    if (game.u.uprops?.LEVITATION) {
        note_unported_dokick('dokick:levitation');
        return ECMD_OK;
    }

    const mtmp = isok(x, y) ? m_at(x, y) : null;
    if (mtmp) {
        if (!(await maybe_kick_monster(mtmp, x, y)))
            return game.context.move ? ECMD_TIME : ECMD_OK;
    }

    wake_nearby(false);
    u_wipe_engr(2);

    if (!isok(x, y)) {
        note_unported_dokick('dokick:kick_ouch_offmap');
        return ECMD_TIME;
    }

    /* The next five tests stay in C's order: monsters, pools, objects,
       non-doors, doors. */
    if (mtmp) {
        note_unported_dokick('dokick:kick_monster');
        return ECMD_TIME;
    }

    /* src/dokick.c:1328 — KMH: kicking boots always succeed */
    const avrg_attrib = (game.uarmf && game.uarmf.otyp === ONAMES.KICKING_BOOTS)
        ? 99
        : Math.trunc((acurrstr() + ACURR(A_DEX) + ACURR(A_CON)) / 3);

    /* src/dokick.c:1444 — kicking water or lava just splashes it */
    if (is_pool(x, y) !== !!game.u.uinwater) {
        note_unported_dokick('dokick:splash');
        return ECMD_TIME;
    }

    if (OBJ_AT(x, y)) {
        /* kick_object() moves the pile and has its own damage rolls */
        note_unported_dokick('dokick:kick_object');
        return ECMD_TIME;
    }

    const maploc = game.level.at(x, y);
    if (IS_DOOR(maploc.typ))
        await kick_door(x, y, avrg_attrib, maploc);
    else
        note_unported_dokick('dokick:kick_nondoor');
    return ECMD_TIME;
}

// src/dokick.c:890 kick_dumb() — kicking a doorway with nothing in it.
async function kick_dumb(x, y) {
    exercise(A_DEX, false);
    if (martial() || ACURR(A_DEX) >= 16 || rn2(3)) {
        await You('kick at empty space.');
        if (game.u.ublind)
            note_unported_dokick('kick_dumb:feel_location');
    } else {
        await pline('Dumb move!  You strain a muscle.');
        exercise(A_STR, false);
        note_unported_dokick('kick_dumb:wounded_legs');
        rnd(5);                 /* set_wounded_legs(RIGHT_SIDE, 5 + rnd(5)) */
    }
    /* the airlevel/Levitation hurtle needs neither here */
}

// src/dokick.c:910 kick_door() — kick a door.
async function kick_door(x, y, avrg_attrib, maploc) {
    if (maploc.doormask === D_ISOPEN || maploc.doormask === D_BROKEN
        || maploc.doormask === D_NODOOR) {
        await kick_dumb(x, y);
        return; /* uses a turn */
    }

    /* not enough leverage to kick open doors while levitating */
    if (game.u.uprops?.LEVITATION) {
        note_unported_dokick('kick_door:kick_ouch');
        return;
    }

    exercise(A_DEX, true);
    const doorbuster = false;   /* Upolyd && is_giant(youmonst.data) */
    /* door is known to be CLOSED or LOCKED */
    if (doorbuster
        || (rnl(35) < avrg_attrib + (!martial() ? 0 : ACURR(A_DEX)))) {
        const shopdoor = false; /* *in_rooms(x, y, SHOPBASE) */

        /* break the door */
        if (maploc.doormask & D_TRAPPED) {
            if (game.flags?.verbose)
                await You('kick the door.');
            exercise(A_STR, false);
            maploc.doormask = D_NODOOR;
            note_unported_dokick('kick_door:b_trapped');
        } else if (ACURR(A_STR) > 18 && !rn2(5) && !shopdoor) {
            await pline('As you kick the door, it shatters to pieces!');
            exercise(A_STR, true);
            maploc.doormask = D_NODOOR;
        } else {
            await pline('As you kick the door, it crashes open!');
            exercise(A_STR, true);
            maploc.doormask = D_BROKEN;
        }
        newsym(x, y);           /* feel_newsym: we know we broke it */
        /* unblock_point() needs the vision shadow map */
        note_unported_dokick('kick_door:unblock_point');
    } else {
        if (game.u.ublind)
            note_unported_dokick('kick_door:feel_location');
        exercise(A_STR, true);
        /* note: this used to be unconditional "WHAMMM!!!" but that has a
           fairly strong connotation of noise that a deaf hero shouldn't
           hear; we've kept the extra 'm's and one of the extra '!'s */
        await pline(`${(game.u.udeaf || !rn2(3)) ? 'Thwack' : 'Whammm'}!!`);
    }
    /* in_town() watchman reactions need town rooms */
}
