// trap.js — traps.
// C ref: src/trap.c
//
// Only the level-generation entry points are here so far. maketrap() itself
// still lives in js/mklev.js alongside the rest of the level builder; this file
// holds the pieces of src/trap.c it calls into, so that a grep for a C symbol
// finds it in the file its C twin lives in.

import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';
import { mksobj, place_object } from './mkobj.js';
import { weight } from './invent.js';
import { dmgval } from './weapon.js';
import { observe_object } from './o_init.js';
import { newsym, pline } from './display.js';
import { You, You_hear, You_feel, Your } from './pline.js';
import { an } from './objnam.js';
import { upstart } from './do_name.js';
import { losehp } from './hack.js';
import { exercise } from './attrib.js';
import { ONAMES } from './objects_data.js';
import { KILLED_BY_AN, A_STR } from './const.js';

/* src/trap.h — trapeffect_*() return values. */
const Trap_Effect_Finished = 0, Trap_Is_Gone = 2;

function note_unported_trap(what) {
    (game.unported ||= new Set()).add(what);
}

/* src/hacklib.c exclam() — the punctuation a damage amount earns. */
const exclam = (force) => (force < 0 ? '?' : (force <= 4) ? '.' : '!');
import { In_quest, TOOKPLUNGE, VIASITTING, HURTLING,
         ARROW_TRAP, DART_TRAP, ROCKTRAP, SQKY_BOARD, BEAR_TRAP, LANDMINE,
         ROLLING_BOULDER_TRAP, SLP_GAS_TRAP, RUST_TRAP, FIRE_TRAP, PIT,
         SPIKED_PIT, HOLE, TRAPDOOR, TELEP_TRAP, LEVEL_TELEP, MAGIC_PORTAL,
         WEB, STATUE_TRAP, MAGIC_TRAP, ANTI_MAGIC, POLY_TRAP,
         VIBRATING_SQUARE } from './const.js';
import { MFLAGS, PMNAMES, ATTKS } from './monst_data.js';
import { amorphous, is_whirly, unsolid, is_clinger, is_floater, is_flyer,
         webmaker, defended, resists_fire, resists_sleep,
         resists_magm } from './mondata.js';

// include/rm.h:538 Sokoban — the level flag, not the dungeon branch.
const Sokoban = () => game.level?.flags?.sokoban_rules === true;

// src/dungeon.c dunlevs_in_dungeon()
function dunlevs_in_dungeon(lev) {
    return game.dungeons[lev.dnum].num_dunlevs;
}

// src/dungeon.c dunlev()
function dunlev(lev) {
    return lev.dlevel;
}

// include/dungeon.h In_hell() — the Gehennom branch.
function In_hell(lev) {
    return lev.dnum === game.hell_dnum;
}

// src/trap.c:418 dng_bottom() — how far down a hole can reach, stopping at the
// quest's locate level and, before the invocation, one short of Gehennom's.
function dng_bottom(lev) {
    let bottom = dunlevs_in_dungeon(lev);

    if (In_quest(lev)) {
        const qlocate_depth = game.qlocate_level?.dlevel ?? bottom;
        if ((game.dungeons[lev.dnum].dunlev_ureached ?? 0) < qlocate_depth)
            bottom = qlocate_depth;
    } else if (In_hell(lev)) {
        if (!game.u?.uevent?.invoked)
            bottom -= 1;
    }
    return bottom;
}

// src/trap.c:442 hole_destination() — where a hole or trapdoor drops you.
//
// One rn2(4) per level of descent, so it usually stops after a single draw but
// occasionally tunnels several levels down. maketrap() calls this at CREATION
// time for every HOLE and TRAPDOOR, which is why a level with a trapdoor on it
// costs draws the rest of the stream depends on.
export function hole_destination(dst) {
    const bottom = dng_bottom(game.u.uz);

    dst.dnum = game.u.uz.dnum;
    dst.dlevel = dunlev(game.u.uz);
    while (dst.dlevel < bottom) {
        dst.dlevel++;
        if (rn2(4))
            break;
    }
}

// src/trap.c:1061 floor_trigger() — is this trap one that fires by being
// stepped ON, as opposed to one that catches anything passing through?
function floor_trigger(ttyp) {
    switch (ttyp) {
    case ARROW_TRAP:
    case DART_TRAP:
    case ROCKTRAP:
    case SQKY_BOARD:
    case BEAR_TRAP:
    case LANDMINE:
    case ROLLING_BOULDER_TRAP:
    case SLP_GAS_TRAP:
    case RUST_TRAP:
    case FIRE_TRAP:
    case PIT:
    case SPIKED_PIT:
    case HOLE:
    case TRAPDOOR:
        return true;
    default:
        return false;
    }
}

// src/trap.c:1085 check_in_air() — is this monster off the ground, allowing
// for the trap flags? A flyer that was pushed or sat down is NOT in the air.
function check_in_air(mtmp, trflags) {
    const plunged = (trflags & (TOOKPLUNGE | VIASITTING)) !== 0;

    return ((trflags & HURTLING) !== 0
            || is_floater(mtmp.data)
            || (is_flyer(mtmp.data) && !plunged));
}

// src/trap.c:1106 m_harmless_trap() — would this trap actually hurt `mtmp`?
//
// mfndpos() calls it to decide whether a square holding a trap is worth
// refusing. Nothing here draws; every arm is a species or resistance test.
//
// The opening line covers most of it: anything that triggers by being stepped
// on does nothing to a monster that is in the air. Sokoban suppresses that,
// because its pits and holes are the puzzle.
export function m_harmless_trap(mtmp, ttmp) {
    const mdat = mtmp.data;

    if (!Sokoban() && floor_trigger(ttmp.ttyp) && check_in_air(mtmp, 0))
        return true;

    switch (ttmp.ttyp) {
    case ARROW_TRAP:
    case DART_TRAP:
    case ROCKTRAP:
    case SQKY_BOARD:
        break;
    case BEAR_TRAP:
        if (mdat.msize <= MFLAGS.MZ_SMALL || amorphous(mdat)
            || is_whirly(mdat) || unsolid(mdat))
            return true;
        break;
    case LANDMINE:
    case ROLLING_BOULDER_TRAP:
        break;
    case SLP_GAS_TRAP:
        if (resists_sleep(mtmp) || defended(mtmp, ATTKS.AD_SLEE))
            return true;
        break;
    case RUST_TRAP:
        if (mdat.pmidx !== PMNAMES.PM_IRON_GOLEM)
            return true;
        break;
    case FIRE_TRAP:
        if (resists_fire(mtmp) || defended(mtmp, ATTKS.AD_FIRE))
            return true;
        break;
    case PIT:
    case SPIKED_PIT:
    case HOLE:
    case TRAPDOOR:
        if (is_clinger(mdat) && !Sokoban())
            return true;
        break;
    case TELEP_TRAP:
    case LEVEL_TELEP:
    case MAGIC_PORTAL:
        break;
    case WEB:
        if (amorphous(mdat) || webmaker(mdat)
            || is_whirly(mdat) || unsolid(mdat))
            return true;
        break;
    case STATUE_TRAP:
        return true;
    case MAGIC_TRAP:
        return true;                    /* usually */
    case ANTI_MAGIC:
        if (resists_magm(mtmp) || defended(mtmp, ATTKS.AD_MAGM))
            return true;
        break;
    case POLY_TRAP:
        break;
    case VIBRATING_SQUARE:
        return true;
    default:
        break;                          /* impossible() */
    }

    return false;
}

// src/trap.c:6776 unconscious()
export function unconscious() {
    if ((game.multi ?? 0) >= 0)
        return false;

    return !!(game.u.usleep
              || (game.nomovemsg
                  && (game.nomovemsg.startsWith("You awake")
                      || game.nomovemsg.startsWith("You regain con")
                      || game.nomovemsg.startsWith("You are consci"))));
}


// src/trap.c:3578 seetrap() — the hero notices a trap.
export function seetrap(trap) {
    if (!trap.tseen) {
        trap.tseen = 1;
        newsym(trap.tx, trap.ty);
    }
}

// src/trap.c:6531 deltrap() — take a trap off the level.
export function deltrap(trap) {
    const list = game.level?.traps;
    if (!list) return;
    const i = list.indexOf(trap);
    if (i >= 0) list.splice(i, 1);
}

// src/trap.c:1018 t_missile() — the projectile a trap fires.
function t_missile(otyp, trap) {
    const otmp = mksobj(otyp, true, false);

    otmp.quan = 1;
    otmp.owt = weight(otmp);
    otmp.opoisoned = 0;
    otmp.ox = trap.tx;
    otmp.oy = trap.ty;
    return otmp;
}

// src/trap.c:1250 trapeffect_dart_trap() — the hero's arm.
//
// Draw order: the once/tseen rn2(15) disarm check, then t_missile's mksobj,
// then the rn2(6) poison roll, then dmgval, then thitu's rnd(20).
async function trapeffect_dart_trap(mtmp, trap, trflags) {
    if (mtmp !== game.youmonst) {
        note_unported_trap('trapeffect_dart_trap:monster');
        return Trap_Effect_Finished;
    }

    if (trap.once && trap.tseen && !rn2(15)) {
        await You_hear('a soft click.');
        deltrap(trap);
        newsym(game.u.ux, game.u.uy);
        return Trap_Is_Gone;
    }
    trap.once = 1;
    seetrap(trap);
    await pline('A little dart shoots out at you!');
    let otmp = t_missile(ONAMES.DART, trap);
    if (!rn2(6))
        otmp.opoisoned = 1;
    const dam = dmgval(otmp, game.youmonst);
    if (await thitu(7, dam, { obj: otmp }, 'little dart')) {
        if (otmp.opoisoned)
            note_unported_trap('trapeffect_dart_trap:poisoned');
        /* obfree(otmp) — the dart is destroyed */
    } else {
        place_object(otmp, game.u.ux, game.u.uy);
        if (!game.u.ublind)
            observe_object(otmp);
        /* js/invent.js is reached through a cycle from here (trap -> invent
           -> pickup -> hack -> trap), so stackobj is bound at call time. */
        const { stackobj } = await import('./invent.js');
        stackobj(otmp);
        newsym(game.u.ux, game.u.uy);
    }
    return Trap_Effect_Finished;
}

// src/mthrowu.c:96 thitu() — does a trap's or monster's missile hit the hero?
//
// The rnd(20) is spent whatever the outcome; everything after it is message
// and damage. Returns 1 on a hit.
export async function thitu(tlev, dam, objp, name) {
    const onm = an(name);
    const dieroll = rnd(20);

    if (game.u.uac + tlev <= dieroll) {
        game.mesg_given = (game.mesg_given | 0) + 1;
        if (game.u.ublind || game.flags?.verbose === false)
            await pline('It misses.');
        else if (game.u.uac + tlev <= dieroll - 2)
            await pline(`${upstart(onm)} misses you.`);
        else
            await You(`are almost hit by ${onm}.`);
        return 0;
    }

    if (game.u.ublind || game.flags?.verbose === false)
        await You(`are hit${exclam(dam)}`);
    else
        await You(`are hit by ${onm}${exclam(dam)}`);

    losehp(dam, name, KILLED_BY_AN);
    exercise(A_STR, false);
    return 1;
}

// src/trap.c:1188 dotrap() — the hero steps on a trap.
//
// Only the arms whose effects are ported dispatch; every other trap type is
// recorded, so a session that walks onto one is visibly incomplete rather
// than silently wrong.
export async function dotrap(trap, trflags) {
    const ttype = trap.ttyp;

    game.u.utrap = 0;                   /* reset_utrap() */
    if (ttype === DART_TRAP)
        return await trapeffect_dart_trap(game.youmonst, trap, trflags);
    if (ttype === MAGIC_TRAP)
        return await trapeffect_magic_trap(game.youmonst, trap, trflags);

    note_unported_trap(`dotrap:ttyp=${ttype}`);
    return Trap_Effect_Finished;
}


// src/trap.c:4356 domagictrap() — the magic trap's effect roll.
//
// fate = rnd(20) drives everything. Under 10 is the blinding flash (which
// wakes nearby monsters); 10..19 are the individual arms. Only the pure
// message arms are live; the rest record, so a session that lands on one is
// visibly incomplete rather than silently wrong.
async function domagictrap() {
    const fate = rnd(20);

    if (fate < 10) {
        note_unported_trap('domagictrap:blinding_flash');
        return;
    }

    switch (fate) {
    case 13:  /* odd feelings */
        await pline('A shiver runs up and down your spine!');
        break;
    case 14:
        await You_hear('distant howling.');
        break;
    case 16:
        await Your('pack shakes violently!');
        break;
    case 17:
        await You('smell charred flesh.');
        break;
    case 18:
        await You_feel('tired.');
        break;
    default:
        note_unported_trap(`domagictrap:fate=${fate}`);
        break;
    }
}

// src/trap.c:2565 trapeffect_magic_trap() — the hero's arm.
async function trapeffect_magic_trap(mtmp, trap, trflags) {
    if (mtmp !== game.youmonst) {
        if (!rn2(21))
            note_unported_trap('trapeffect_magic_trap:monster_fire');
        return Trap_Effect_Finished;
    }

    seetrap(trap);
    if (!rn2(30)) {
        note_unported_trap('trapeffect_magic_trap:explosion');
        return Trap_Effect_Finished;
    }
    await domagictrap();
    /* steedintrap() — no steed on this tree */
    return Trap_Effect_Finished;
}
