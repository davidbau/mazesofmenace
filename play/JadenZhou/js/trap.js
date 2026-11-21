// trap.js — trap creation.
// C ref: trap.c maketrap(), t_at() (in trap.c as of 3.7), choose_trapnote(),
// dng_bottom(), hole_destination().
//
// Not ported yet: mkroll_launch() (ROLLING_BOULDER_TRAP, difficulty >= 2), shop damage,
// set_levltyp()'s object/timer side effects, unearth_objs(),
// recalc_block_point(), Sokoban bookkeeping.

import { game } from './gstate.js';
import { rn2, rnl } from './rng.js';
import { dunlev, dunlevs_in_dungeon, In_hell } from './dungeon.js';
import {
    ROOM, CORR, DOOR, STONE, SCORR, SDOOR, DRAWBRIDGE_UP, STAIRS, LADDER,
    IS_FURNITURE, IS_WALL, IS_POOL, IS_ROOM, LAVAPOOL, In_quest,
    CORPSTAT_NONE, MM_NOCOUNTBIRTH, MM_NOMSG,
    TOOKPLUNGE, VIASITTING, HURTLING, isok,
    DEAF, BOLT_LIM, FORCETRAP, FORCEBUNGLE,
} from './const.js';
import { mons, S_UNICORN, M2_JEWELS, S_VORTEX, M1_AMORPHOUS, M1_UNSOLID,
         M1_CLING, MZ_SMALL, PM_AIR_ELEMENTAL, PM_CAVE_SPIDER,
         PM_GIANT_SPIDER, PM_IRON_GOLEM, AD_SLEE, AD_FIRE, AD_MAGM,
         M1_MINDLESS, M1_METALLIVORE, MZ_HUGE, PM_PIT_FIEND,
       } from './monsters.js';
import { is_flyer, is_floater, defended, resists_sleep, resists_fire,
         resists_magm, mon_knows_traps, mon_learns_traps,
         mons_see_trap } from './mondata.js';
import { STATUE, BOULDER, objects, ARROW, DART, ROCK, CORPSE, TOWEL,
         GEMSTONE, MINERAL, RING_CLASS, IRON } from './objects.js';
import { rnd, d } from './rng.js';
import { FAILEDUNTRAP, W_ARMF, W_ARMH, W_ARMS, W_ARMG, W_ARMC, W_ARM, W_ARMU,
         W_WEP, W_SWAPWEP, WT_ELF, STONE_RES } from './const.js';
import { AD_RBRE, AD_PHYS, AT_MAGC, AT_BREA, M1_BREATHLESS, M1_ACID,
         M2_NASTY, S_MIMIC, S_GIANT, S_DRAGON, PM_OWLBEAR, PM_BUGBEAR,
         PM_TITANOTHERE, PM_BALUCHITHERIUM, PM_PURPLE_WORM, PM_JABBERWOCK,
         PM_BALROG, PM_KRAKEN, PM_MASTODON, PM_ORION, PM_NORN, PM_CYCLOPS,
         PM_LORD_SURTUR, PM_GELATINOUS_CUBE, PM_FIRE_VORTEX,
         PM_FLAMING_SPHERE, PM_FIRE_ELEMENTAL, PM_SALAMANDER, PM_GREMLIN,
         PM_PIT_VIPER, PM_PAPER_GOLEM, PM_STRAW_GOLEM, PM_WOOD_GOLEM,
         PM_LEATHER_GOLEM, PM_COCKATRICE, PM_CHICKATRICE } from './monsters.js';
import { passes_walls, monsndx, Resists_Elem } from './mondata.js';
import { mksobj, place_object } from './mkobj.js';
import { stackobj } from './invent.js';
import { dmgval } from './weapon.js';
import { doname } from './objnam.js';
import { monkilled, maybe_unhide_at } from './mon.js';
import { find_mac, which_armor } from './worn.js';
import { mtele_trap, mlevel_tele_trap, tele_trap } from './teleport.js';
import { Can_fall_thru } from './mklev.js';
import { bimanual } from './wield.js';

/* C ref: mondata.h resists_ston() */
function resists_ston(mon) { return Resists_Elem(mon, STONE_RES); }
import { rndmonnum_adj, mkcorpstat, add_to_container, weight } from './mkobj.js';
import { makemon, sobj_at } from './makemon.js';
import { mongone, wake_nearto } from './mon.js';
import { newsym, pline } from './display.js';
import { cansee, couldsee } from './vision.js';
import { m_in_air } from './monmove.js';
import { canseemon } from './display.js';
import { mon_nam, Monnam } from './do_name.js';
import { You_hear } from './sounds.js';
import { just_an } from './objnam.js';
import { dist2 } from './hacklib.js';
import { rn1 } from './rng.js';
import { nomul, end_running } from './hack.js';
import { exercise, ATEMP } from './attrib.js';
import { body_part } from './insight.js';
import { encumber_msg } from './pickup.js';
import { You, Your, pline_The } from './display.js';
import { float_vs_flight } from './polyself.js';
import { s_suffix } from './hacklib.js';
import { m_at } from './makemon.js';
import { M1_SLITHY, M1_NOLIMBS } from './monsters.js';
import { CAN_OF_GREASE, SCROLL_CLASS, SPBOOK_CLASS, POTION_CLASS,
         GRAY_DRAGON_SCALE_MAIL, YELLOW_DRAGON_SCALE_MAIL, GRAY_DRAGON_SCALES,
         YELLOW_DRAGON_SCALES, ROBE, MUMMY_WRAPPING, ALCHEMY_SMOCK,
         is_metallic, is_rustprone, OBJ_NAME, OBJ_DESCR } from './objects.js';
import { Is_container, erosion_matters, is_flammable } from './mkobj.js';
import { TRAP_NOT_IMMUNE, TRAP_CLEARLY_IMMUNE, TRAP_HIDDEN_IMMUNE,
         In_endgame, In_sokoban, Is_earthlevel, FIRE_RES } from './const.js';
import { AMULET_OF_YENDOR, SCR_FIRE, SPE_FIREBALL } from './objects.js';
import { vtense } from './objnam.js';
import { on_level, at_dgn_entrance } from './dungeon.js';
import { is_neuter } from './mondata.js';
import { ART_MAGICBANE } from './artilist.js';
import { LEVITATION, FLYING, FUMBLING, ANTIMAGIC, HALF_PHDAM, HALF_SPDAM,
         PASSES_WALLS, DEAF as DEAF_PROP, WOUNDED_LEGS, TIMEOUT, FROMOUTSIDE,
         TT_BEARTRAP, TT_PIT, TT_NONE, FOOT, SPINE, HEAD, ARM,
         KILLED_BY_AN, KILLED_BY, A_DEX, RIGHT_SIDE, LEFT_SIDE,
         SLEEP_RES, BLINDED, HALLUC, HALLUC_RES, NO_MM_FLAGS,
       } from './const.js';

/* C ref: hack.h mdistu() */
function mdistu(mon) { return dist2(mon.mx, mon.my, game.u.ux, game.u.uy); }

// C ref: mondata.h likes_gems(), is_unicorn()
function likes_gems(ptr) { return (ptr.mflags2 & M2_JEWELS) !== 0; }
function is_unicorn(ptr) { return ptr.mlet === S_UNICORN && likes_gems(ptr); }
// C ref: hacklib.c sgn()
function sgn(n) { return (n < 0) ? -1 : (n !== 0); }

// C ref: trap.c mk_trap_statue()
/* create a "living" statue at x,y */
function mk_trap_statue(x, y) {
    let mtmp, otmp, statue, mptr;
    let trycount = 10;

    do { /* avoid ultimately hostile co-aligned unicorn */
        mptr = mons[rndmonnum_adj(3, 6)];
    } while (--trycount > 0 && is_unicorn(mptr)
             && sgn(game.u.ualign.type) === sgn(mptr.maligntyp));
    statue = mkcorpstat(STATUE, null, mptr, x, y, CORPSTAT_NONE);
    mtmp = makemon(mons[statue.corpsenm], 0, 0, MM_NOCOUNTBIRTH | MM_NOMSG);
    if (!mtmp)
        return; /* should never happen */
    /* C's minvent chain head is the most recently added item; JS keeps
       minvent as an array with the newest last */
    while (mtmp.minvent && mtmp.minvent.length) {
        otmp = mtmp.minvent.pop();
        otmp.owornmask = 0;
        /* obj_extract_self(otmp) */
        otmp.where = 'OBJ_FREE';
        add_to_container(statue, otmp);
    }
    statue.owt = weight(statue);
    mongone(mtmp);
}

export const NO_TRAP = 0;
export const ARROW_TRAP = 1;
export const DART_TRAP = 2;
export const ROCKTRAP = 3;
export const SQKY_BOARD = 4;
export const BEAR_TRAP = 5;
export const LANDMINE = 6;
export const ROLLING_BOULDER_TRAP = 7;
export const SLP_GAS_TRAP = 8;
export const RUST_TRAP = 9;
export const FIRE_TRAP = 10;
export const PIT = 11;
export const SPIKED_PIT = 12;
export const HOLE = 13;
export const TRAPDOOR = 14;
export const TELEP_TRAP = 15;
export const LEVEL_TELEP = 16;
export const MAGIC_PORTAL = 17;
export const WEB = 18;
export const STATUE_TRAP = 19;
export const MAGIC_TRAP = 20;
export const ANTI_MAGIC = 21;
export const POLY_TRAP = 22;
export const VIBRATING_SQUARE = 23;
export const TRAPPED_DOOR = 24;
export const TRAPPED_CHEST = 25;
export const TRAPNUM = 26;

// C ref: trap.h is_pit(), is_hole(), unhideable_trap(), undestroyable_trap()
export function is_pit(ttyp) { return ttyp === PIT || ttyp === SPIKED_PIT; }
export function is_hole(ttyp) { return ttyp === HOLE || ttyp === TRAPDOOR; }
function unhideable_trap(ttyp) { return ttyp === HOLE; }
function undestroyable_trap(ttyp) {
    return ttyp === MAGIC_PORTAL || ttyp === VIBRATING_SQUARE;
}

// C ref: rm.h CAN_OVERWRITE_TERRAIN()  (stairs and ladders can't be)
function CAN_OVERWRITE_TERRAIN(typ) {
    return typ !== STAIRS && typ !== LADDER;
}

function ftraps() {
    const lvl = game.level;
    if (!lvl.traps) lvl.traps = [];
    return lvl.traps;
}

// C ref: trap.c t_at()
export function t_at(x, y) {
    for (const trap of ftraps())
        if (trap.tx === x && trap.ty === y)
            return trap;
    return null;
}

// C ref: trap.c floor_trigger()
/* used for both the hero and monsters */
export function floor_trigger(ttyp) {
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

// C ref: trap.c check_in_air()
/* return TRUE if monster mtmp is up in the air, considering trap flags */
export function check_in_air(mtmp, trflags) {
    const is_you = (mtmp === game.youmonst),
          plunged = (trflags & (TOOKPLUNGE | VIASITTING)) !== 0;

    return ((trflags & HURTLING) !== 0
            || (is_you ? Levitation() : is_floater(mtmp.data))
            || ((is_you ? Flying() : is_flyer(mtmp.data)) && !plunged));
}

/* C ref: youprop.h -- the hero's properties used by the trap code;
   BLevitation/BFlying are uprops[].blocked */
function uprop(p) {
    return game.u.uprops[p] || { intrinsic: 0, extrinsic: 0, blocked: 0 };
}
function HLevitation() { return uprop(LEVITATION).intrinsic; }
function ELevitation() { return uprop(LEVITATION).extrinsic; }
function Levitation() {
    return !!((HLevitation() || ELevitation()) && !uprop(LEVITATION).blocked);
}
function Flying() {
    const p = uprop(FLYING);
    return !!((p.intrinsic || p.extrinsic
               || (game.u.usteed && is_flyer(game.u.usteed.data)))
              && !p.blocked);
}
function Fumbling() { return !!(uprop(FUMBLING).intrinsic || uprop(FUMBLING).extrinsic); }
function Upolyd() { return game.u.umonnum !== game.u.umonster; }
function Antimagic() {
    return !!(uprop(ANTIMAGIC).intrinsic || uprop(ANTIMAGIC).extrinsic
              || (Upolyd() && resists_magm(game.youmonst)));
}
function Half_physical_damage() {
    return !!(uprop(HALF_PHDAM).intrinsic || uprop(HALF_PHDAM).extrinsic);
}
function Half_spell_damage() {
    return !!(uprop(HALF_SPDAM).intrinsic || uprop(HALF_SPDAM).extrinsic);
}
function Passes_walls() {
    return !!(uprop(PASSES_WALLS).intrinsic || uprop(PASSES_WALLS).extrinsic);
}
function Sleep_resistance() {
    return !!(uprop(SLEEP_RES).intrinsic || uprop(SLEEP_RES).extrinsic);
}
function Blind() {
    const p = uprop(BLINDED);
    return !!((p.intrinsic || p.extrinsic) && !p.blocked);
}
function Hallucination() {
    return !!(uprop(HALLUC).intrinsic
              && !(uprop(HALLUC_RES).intrinsic || uprop(HALLUC_RES).extrinsic));
}
function Wounded_legs() {
    return !!(uprop(WOUNDED_LEGS).intrinsic || uprop(WOUNDED_LEGS).extrinsic);
}
/* C ref: hack.h Maybe_Half_Phys() */
export function Maybe_Half_Phys(dmg) {
    return Half_physical_damage() ? Math.trunc((dmg + 1) / 2) : dmg;
}

/* C ref: pline.c You_feel() -- Unaware dreaming isn't reached here */
async function You_feel(line) { await pline(`You feel ${line}`); }

// C ref: hack.c losehp() -- the not-polymorphed, surviving case
export async function losehp(n, knam, k_format) {
    const u = game.u;
    void knam; void k_format;
    game.disp_botl = true; /* u.uhp or u.mh is changing */
    end_running(true);
    if (Upolyd())
        throw new Error('losehp(): polymorphed hero not ported yet');

    u.uhp -= n;
    /* showdamage(n): the showdamage option isn't ported (default off) */
    if (u.uhp > u.uhpmax)
        u.uhpmax = u.uhp; /* perhaps n was negative */
    if (u.uhp < 1)
        throw new Error('losehp(): death (done(DIED)) not ported yet');
    else if (n > 0 && u.uhp * 10 < u.uhpmax)
        throw new Error('losehp(): maybe_wail() not ported yet');
}

// C ref: do.c set_wounded_legs()
export async function set_wounded_legs(side, timex) {
    const u = game.u;
    const W = u.uprops[WOUNDED_LEGS];
    /* KMH -- STEED
     * If you are riding, your steed gets the wounded legs instead.
     * You still call this function, but don't lose hp.
     * Caller is also responsible for adjusting messages.
     */
    game.disp_botl = true;
    if (!Wounded_legs())
        u.atemp.a[A_DEX]--;

    if (!Wounded_legs() || (W.intrinsic & TIMEOUT) < timex)
        W.intrinsic = (W.intrinsic & ~TIMEOUT) | (timex & TIMEOUT); /* set_itimeout() */
    /* the leg being wounded and its timeout might differ from one
       attack to the next, but we don't track the legs separately;
       5.0: both legs will ultimately heal together */
    W.extrinsic |= side;
    await encumber_msg();
}

// C ref: trap.c set_utrap()
export function set_utrap(tim, typ) {
    const u = game.u;
    /* if we get here through reset_utrap(), the caller of that might
       have already set u.utrap to 0 so this check won't be sufficient
       in that situation; caller will need to set context.botl itself */
    if (!u.utrap !== !tim)
        game.disp_botl = true;

    u.utrap = tim;
    u.utraptype = tim ? typ : TT_NONE;

    float_vs_flight(); /* maybe block Lev and/or Fly */
}

// C ref: trap.c reset_utrap()
export async function reset_utrap(msg) {
    const was_Lev = Levitation(), was_Fly = Flying();

    set_utrap(0, 0);

    if (msg) {
        if (!was_Lev && Levitation())
            throw new Error('reset_utrap(): float_up() not ported yet');
        if (!was_Fly && Flying())
            await You("can fly.");
    }
}

// C ref: defsym.h trap PCHAR() explanations, indexed by
// trap_to_defsym(ttyp) - S_arrow_trap (rm.h: S_arrow_trap + ttyp - 1)
const trap_explanations = [
    "arrow trap", "dart trap", "falling rock trap", "squeaky board",
    "bear trap", "land mine", "rolling boulder trap", "sleeping gas trap",
    "rust trap", "fire trap", "pit", "spiked pit", "hole", "trap door",
    "teleportation trap", "level teleporter", "magic portal", "web",
    "statue trap", "magic trap", "anti-magic field", "polymorph trap",
    "vibrating square", "trapped door", "trapped chest",
];

// C ref: trap.c immune_to_trap()
/*
 * Returns:
 *  TRAP_NOT_IMMUNE = not immune at the moment;
 *  TRAP_CLEARLY_IMMUNE = obviously immune (if player is polymorphed, assume
 *    they know which traps they are immune to in their current form);
 *  TRAP_HIDDEN_IMMUNE = immune but in non-obvious way such as an unidentified
 *    item or hidden intrinsic providing a resistance; the player should still
 *    be warned of this trap, while monsters implicitly know they're immune.
 */
export function immune_to_trap(mon, ttype) {
    if (!mon)
        return TRAP_NOT_IMMUNE; /* impossible("immune_to_trap: null monster") */
    const pm = mon.data;
    const is_you = (mon === game.youmonst);
    const u = game.u;
    /* C ref: wizard.c mon_has_amulet() -- youmonst.minvent is empty */
    const mon_has_amulet = (m) => !is_you
        && (m.minvent || []).some(o => o.otyp === AMULET_OF_YENDOR);
    /* C ref: dungeon.c has_ceiling() */
    const has_ceiling = (lev) => !(In_endgame(lev) && !Is_earthlevel(lev));

    switch (ttype) {
    case ARROW_TRAP:
    case DART_TRAP:
    case ROCKTRAP:
        /* can hit anything; even noncorporeal monsters might get a blessed
           projectile */
        return TRAP_NOT_IMMUNE;
    case BEAR_TRAP:
        if (pm.msize <= MZ_SMALL
            || amorphous(pm) || is_whirly(pm) || unsolid(pm))
            return TRAP_CLEARLY_IMMUNE;
        /*FALLTHRU*/
    case SQKY_BOARD:
    case LANDMINE:
    case ROLLING_BOULDER_TRAP:
    case HOLE:
    case TRAPDOOR:
    case PIT:
    case SPIKED_PIT:
        /* ground-based traps, which can be evaded by levitation, flying, or
           hanging to the ceiling */
        if (game.level.flags.sokoban_rules && (is_pit(ttype) || is_hole(ttype)))
            return TRAP_NOT_IMMUNE;
        if (In_sokoban(u.uz) && ttype === ROLLING_BOULDER_TRAP)
            return TRAP_CLEARLY_IMMUNE; /* not dangerous in Sokoban */
        if (is_floater(pm) || is_flyer(pm)
            || (is_clinger(pm) && has_ceiling(u.uz)))
            return TRAP_CLEARLY_IMMUNE;
        else if (is_you && (Levitation() || Flying()))
            return TRAP_CLEARLY_IMMUNE;
        return TRAP_NOT_IMMUNE;
    case SLP_GAS_TRAP:
        if (breathless(pm))
            return TRAP_CLEARLY_IMMUNE;
        else if (!is_you && resists_sleep(mon))
            return TRAP_CLEARLY_IMMUNE;
        else if (is_you && Sleep_resistance())
            return TRAP_HIDDEN_IMMUNE;
        return TRAP_NOT_IMMUNE;
    case LEVEL_TELEP:
    case TELEP_TRAP:
        /* consider unintended teleporting to be an adverse effect; if in
           the endgame or carrying the Amulet, the teleport trap won't work
           anyway, so anything hitting it is immune. */
        if (In_endgame(u.uz) || mon_has_amulet(mon))
            return TRAP_CLEARLY_IMMUNE;
        return TRAP_NOT_IMMUNE;
    case POLY_TRAP:
        if (resists_magm(mon))
            /* covers Antimagic for player */
            return (is_you ? TRAP_HIDDEN_IMMUNE : TRAP_CLEARLY_IMMUNE);
        return TRAP_NOT_IMMUNE;
    case STATUE_TRAP:
        /* no effect on monsters, only affects players */
        if (!is_you)
            return TRAP_CLEARLY_IMMUNE;
        return TRAP_NOT_IMMUNE;
    case WEB:
        /* most of this code is lifted from mu_maybe_destroy_web */
        if (webmaker(pm) || amorphous(pm) || is_whirly(pm) || flaming(pm)
            || unsolid(pm) || pm === mons[PM_GELATINOUS_CUBE])
            return TRAP_CLEARLY_IMMUNE;
        return TRAP_NOT_IMMUNE;
    case ANTI_MAGIC:
        /* doesn't hurt any non-magic-resistant monster with no magic */
        if (is_you) {
            if (Antimagic())
                return TRAP_NOT_IMMUNE;
            else if (u.uenmax === 0)
                /* player won't lose HP and can't lose more Pw */
                return TRAP_HIDDEN_IMMUNE;

        /* following conditional lifted from mintrap ANTI_MAGIC logic */
        } else if (!resists_magm(mon)
                   && (mon.mcan || (!attacktype(pm, AT_MAGC)
                                    && !attacktype(pm, AT_BREA)))) {
            return TRAP_CLEARLY_IMMUNE;
        }
        return TRAP_NOT_IMMUNE;
    case RUST_TRAP: {
        /* harmful if wearing anything rustable or if mon is an iron golem */
        if (pm === mons[PM_IRON_GOLEM])
            return TRAP_NOT_IMMUNE;

        const objs = [];
        if (is_you)
            for (let o = game.invent; o; o = o.nobj) objs.push(o);
        else
            objs.push(...(mon.minvent || []).slice().reverse());
        for (const obj of objs) {
            /* rust traps can currently hit only worn armor and weapons */
            if (objects[obj.otyp].oc_material === IRON /* is_rustprone() */
                && obj.owornmask) {
                if (is_you && (obj === game.uquiver
                               || (obj === game.uswapwep && !u.twoweap)))
                    continue;
                return TRAP_NOT_IMMUNE;
            }
        }
        return TRAP_CLEARLY_IMMUNE;
    }
    case MAGIC_TRAP:
        /* for player, any number of bad effects;
           for monsters, only replicates fire trap, so fall through */
        if (is_you)
            return TRAP_NOT_IMMUNE;
        /*FALLTHRU*/
    case FIRE_TRAP: { /* can always destroy items being carried */
        /* harmful if not resistant or if carrying anything that could burn */
        if (is_you ? !(uprop(FIRE_RES).intrinsic || uprop(FIRE_RES).extrinsic)
                   : !resists_fire(mon))
            return TRAP_NOT_IMMUNE;

        const objs = [];
        if (is_you)
            for (let o = game.invent; o; o = o.nobj) objs.push(o);
        else
            objs.push(...(mon.minvent || []).slice().reverse());
        for (const obj of objs) {
            if (obj.oclass === SCROLL_CLASS || obj.oclass === POTION_CLASS
                || obj.oclass === SPBOOK_CLASS
                || (obj.owornmask && is_flammable(obj))) {
                if ((obj.otyp === SCR_FIRE || obj.otyp === SPE_FIREBALL)
                    /* mon knows scroll of fire or spellbook of fireball
                       won't be affected; hero knows iff this one has been
                       seen and its type has been discovered */
                    && (!is_you
                        || (obj.dknown && objects[obj.otyp].oc_name_known)))
                    continue;
                return TRAP_NOT_IMMUNE;
            }
        }
        return (is_you ? TRAP_HIDDEN_IMMUNE : TRAP_CLEARLY_IMMUNE);
    }
    case MAGIC_PORTAL:
        /* never hurts anything, but player is considered non-immune so they
           can be asked about entering it */
        if (!is_you)
            return TRAP_CLEARLY_IMMUNE;
        return TRAP_NOT_IMMUNE;
    case VIBRATING_SQUARE:
        return TRAP_CLEARLY_IMMUNE;
    default:
        /* impossible("immune_to_trap: unknown trap type %u", ttype) */
        return TRAP_NOT_IMMUNE;
    }
}

// C ref: trap.c into_vs_onto()
/* whether moving to a trap location is moving "into" the trap or "onto" it */
export function into_vs_onto(traptype) {
    switch (traptype) {
    case BEAR_TRAP:
    case PIT:
    case SPIKED_PIT:
    case HOLE:
    case TELEP_TRAP:
    case LEVEL_TELEP:
    case MAGIC_PORTAL:
    case WEB:
        return true;
    }
    return false;
}

// C ref: trap.c trapname()
export function trapname(ttyp, override) /* if True, ignore Hallucination */ {
    if (Hallucination() && !override)
        throw new Error('trapname(): hallucinatory trap names not ported yet');
    return trap_explanations[ttyp - 1];
}

// C ref: hack.c u_locomotion()
export function u_locomotion(def) {
    const capitalize = (def[0] === def[0].toUpperCase());

    /* regular locomotion() takes a monster type rather than a specific
       monster, so can't tell whether it is operating on hero */
    if (Levitation())
        return capitalize ? "Float" : "float";
    if (Flying())
        return capitalize ? "Fly" : "fly";
    return locomotion(game.youmonst.data, def);
}

// C ref: mondata.c locomotion()
function locomotion(ptr, def) {
    const capitalize = (def[0] === def[0].toUpperCase());
    const levitate = ["float", "Float", "wobble", "Wobble"];
    const flys = ["fly", "Fly", "flutter", "Flutter"];
    const flyl = ["fly", "Fly", "stagger", "Stagger"];
    const slither = ["slither", "Slither", "falter", "Falter"];
    const ooze = ["ooze", "Ooze", "tremble", "Tremble"];
    const immobile = ["wiggle", "Wiggle", "pulsate", "Pulsate"];
    const crawl = ["crawl", "Crawl", "falter", "Falter"];
    const idx = capitalize ? 1 : 0;

    return (is_floater(ptr) ? levitate[idx]
            : (is_flyer(ptr) && ptr.msize <= MZ_SMALL) ? flys[idx]
              : (is_flyer(ptr) && ptr.msize > MZ_SMALL) ? flyl[idx]
                : (ptr.mflags1 & M1_SLITHY) ? slither[idx]
                  : amorphous(ptr) ? ooze[idx]
                    : !ptr.mmove ? immobile[idx]
                      : (ptr.mflags1 & M1_NOLIMBS) ? crawl[idx]
                        : def);
}

// C ref: trap.c conjoined_pits()
function conjoined_pits(trap2, trap1, u_entering_trap2) {
    const u = game.u;

    if (!trap1 || !trap2)
        return false;
    if (!isok(trap2.tx, trap2.ty) || !isok(trap1.tx, trap1.ty)
        || !is_pit(trap2.ttyp)
        || !is_pit(trap1.ttyp)
        || (u_entering_trap2 && !(u.utrap && u.utraptype === TT_PIT)))
        return false;
    throw new Error('conjoined_pits(): conjoined pit directions not ported yet');
}

// C ref: trap.c adj_nonconjoined_pit()
function adj_nonconjoined_pit(adjtrap) {
    const u = game.u;
    const trap_with_u = t_at(u.ux0, u.uy0);

    if (trap_with_u && adjtrap && u.utrap && u.utraptype === TT_PIT
        && is_pit(trap_with_u.ttyp) && is_pit(adjtrap.ttyp))
        throw new Error('adj_nonconjoined_pit(): xytodir() not ported yet');
    return false;
}

// C ref: trap.c dotrap()
export async function dotrap(trap, trflags) {
    const u = game.u;
    const ttype = trap.ttyp;
    const already_seen = trap.tseen;
    let forcetrap = ((trflags & FORCETRAP) !== 0
                     || (trflags & FAILEDUNTRAP) !== 0);
    const forcebungle = (trflags & FORCEBUNGLE) !== 0,
          plunged = (trflags & TOOKPLUNGE) !== 0,
          conj_pit = conjoined_pits(trap, t_at(u.ux0, u.uy0), true),
          adj_pit = adj_nonconjoined_pit(trap);
    const madeby_u = trap.madeby_u ? 1 : 0;

    nomul(0);

    if (fixed_tele_trap(trap)) {
        trflags |= FORCETRAP;
        forcetrap = true;
    }

    /* KMH -- You can't escape the Sokoban level traps */
    if (game.level.flags.sokoban_rules && (is_pit(ttype) || is_hole(ttype))) {
        throw new Error('dotrap(): Sokoban air currents not ported yet');
    } else if (!forcetrap) {
        if (floor_trigger(ttype) && check_in_air(game.youmonst, trflags)) {
            if (already_seen) {
                await You(`${u_locomotion("step")} over ${
                    (ttype === ARROW_TRAP && !trap.madeby_u)
                    ? "an" : a_your[madeby_u]} ${trapname(ttype, false)}.`);
            }
            return;
        }
        if (already_seen && !Fumbling() && !undestroyable_trap(ttype)
            && ttype !== ANTI_MAGIC && !forcebungle && !plunged
            && !conj_pit && !adj_pit
            && (!rn2(5) || (is_pit(ttype) && is_clinger(game.youmonst.data)))) {
            await You(`escape ${(ttype === ARROW_TRAP && !trap.madeby_u)
                                ? "an" : a_your[madeby_u]} ${
                trapname(ttype, false)}.`);
            return;
        }
    }

    if (u.usteed)
        mon_learns_traps(u.usteed, ttype);
    mons_see_trap(trap);

    /*
     * Note:
     *  Most references to trap types here don't use trapname() for
     *  hallucination.  This could be considered to be a bug but doing
     *  that would hide the actual trap situation from the player which
     *  would be somewhat harsh for what's usually a minor impairment.
     */

    await trapeffect_selector(game.youmonst, trap, trflags);
}

// C ref: trap.h fixed_tele_trap()
export function fixed_tele_trap(t) {
    return (t.ttyp === TELEP_TRAP && isok(t.launch.x, t.launch.y));
}

// C ref: trap.h enum trap_result
export const Trap_Effect_Finished = 0;
export const Trap_Is_Gone = 0;
export const Trap_Caught_Mon = 1;
export const Trap_Killed_Mon = 2;
export const Trap_Moved_Mon = 3; /* new location, or new level */

/* C ref: youprop.h Deaf */
function Deaf() {
    const P = game.u.uprops;
    return !!(P[DEAF].intrinsic || P[DEAF].extrinsic
              || game.u.uroleplay?.deaf);
}
/* mondata.h */
function mindless(ptr) { return (ptr.mflags1 & M1_MINDLESS) !== 0; }
function metallivorous(ptr) { return (ptr.mflags1 & M1_METALLIVORE) !== 0; }

// C ref: trap.c trapeffect_sqky_board()
async function trapeffect_sqky_board(mtmp, trap, trflags) {
    /* tsnds[] / Soundeffect(): sound effects aren't ported */
    if (mtmp === game.youmonst) {
        throw new Error('trapeffect_sqky_board(): hero branch not ported yet');
    } else {
        const in_sight = canseemon(mtmp) || (mtmp === game.u.usteed);

        if (m_in_air(mtmp))
            return Trap_Effect_Finished;
        /* stepped on a squeaky board */
        if (in_sight) {
            if (!Deaf()) {
                await pline(`A board beneath ${mon_nam(mtmp)} squeaks ${
                    trapnote(trap, false)} loudly.`);
                seetrap(trap);
            } else if (!mindless(mtmp.data)) {
                await pline(`${Monnam(mtmp)} stops momentarily and appears to cringe.`);
            }
        } else {
            /* same near/far threshold as mzapmsg() */
            const range = couldsee(mtmp.mx, mtmp.my) /* 9 or 5 */
                ? (BOLT_LIM + 1) : (BOLT_LIM - 3);

            await You_hear(`${trapnote(trap, false)} squeak ${
                (mdistu(mtmp) <= range * range)
                    ? "nearby" : "in the distance"}.`);
        }
        /* wake up nearby monsters */
        await wake_nearto(mtmp.mx, mtmp.my, 40);
    }
    return Trap_Effect_Finished;
}

// C ref: trap.c static strings
const a_your = ["a", "your"];
const tower_of_flame = "tower of flame";
const A_gush_of_water_hits = "A gush of water hits";

/* C ref: mondata.h passes_rocks(), grounded(), breathless(), flaming(),
   acidic(), extra_nasty(); obj.h stone_missile(); trap.c completelyrusts */
function passes_rocks(ptr) { return passes_walls(ptr) && !unsolid(ptr); }
function grounded(ptr) {
    /* has_ceiling(&u.uz): no air or water levels are generated yet */
    return !is_flyer(ptr) && !is_floater(ptr) && !is_clinger(ptr);
}
function breathless(ptr) { return (ptr.mflags1 & M1_BREATHLESS) !== 0; }
function flaming(ptr) {
    return ptr === mons[PM_FIRE_VORTEX] || ptr === mons[PM_FLAMING_SPHERE]
           || ptr === mons[PM_FIRE_ELEMENTAL] || ptr === mons[PM_SALAMANDER];
}
function acidic(ptr) { return (ptr.mflags1 & M1_ACID) !== 0; }
function extra_nasty(ptr) { return (ptr.mflags2 & M2_NASTY) !== 0; }
function stone_missile(o) {
    return ((objects[o.otyp].oc_material === GEMSTONE
             || objects[o.otyp].oc_material === MINERAL)
            && o.oclass !== RING_CLASS);
}
function helpless(mon) { return !!(mon.msleeping || !mon.mcanmove); }
function attacktype(ptr, atyp) { return ptr.mattk.some(a => a.aatyp === atyp); }

// C ref: trap.c wearing_iron_shoes()
function wearing_iron_shoes(mtmp) {
    const armf = which_armor(mtmp, W_ARMF);
    return !!armf && objects[armf.otyp].oc_material === IRON;
}

// C ref: trap.c feeltrap()
/* like seetrap() but overrides vision */
export function feeltrap(trap) {
    trap.tseen = 1;
    /* map_trap(trap, 1): newsym() below redisplays the remembered trap */
    /* in case it's beneath something, redisplay the something */
    newsym(trap.tx, trap.ty);
}

// C ref: trap.c deltrap()
export function deltrap(trap) {
    const traps = ftraps();

    if (is_pit(trap.ttyp) && trap.conjoined)
        throw new Error('deltrap(): clear_conjoined_pits() not ported yet');
    const i = traps.indexOf(trap);
    if (i < 0)
        throw new Error('deltrap: no preceding trap!');
    traps.splice(i, 1);
    if (game.level.flags.sokoban_rules
        && (trap.ttyp === PIT || trap.ttyp === HOLE))
        throw new Error('deltrap(): maybe_finish_sokoban() not ported yet');
    /* dealloc_trap(trap): garbage collected */
}

// C ref: trap.c t_missile()
/* make a single arrow/dart/rock for a trap to shoot or drop */
function t_missile(otyp, trap) {
    const otmp = mksobj(otyp, true, false);

    otmp.quan = 1;
    otmp.owt = weight(otmp);
    otmp.opoisoned = 0;
    otmp.ox = trap.tx, otmp.oy = trap.ty;
    return otmp;
}

// C ref: trap.c thitm()
/* Monster is hit by trap. */
async function thitm(tlev,          /* missile's attack level */
                     mon,           /* target */
                     obj,           /* missile; might be Null */
                     d_override,    /* non-zero: force hit for this amount
                                       of damage */
                     nocorpse) {    /* True: a trap is completely burning
                                       up the target */
    let strike;
    let trapkilled = false;

    if (d_override)
        strike = 1;
    else if (obj)
        strike = (find_mac(mon) + tlev + obj.spe <= rnd(20));
    else
        strike = (find_mac(mon) + tlev <= rnd(20));

    /* Actually more accurate than thitu, which doesn't take
     * obj->spe into account.
     */
    if (!strike) {
        if (obj && cansee(mon.mx, mon.my))
            await pline(`${Monnam(mon)} is almost hit by ${doname(obj)}!`);
    } else {
        let dam = 1;
        const harmless = (obj && stone_missile(obj)
                          && passes_rocks(mon.data));

        if (obj && cansee(mon.mx, mon.my))
            await pline(`${Monnam(mon)} is hit by ${doname(obj)}${
                harmless ? " but is not harmed." : "!"}`);
        if (d_override) {
            dam = d_override;
        } else if (obj) {
            dam = dmgval(obj, mon);
            if (dam < 1)
                dam = 1;
        }
        if (!harmless) {
            mon.mhp -= dam;
            if (mon.mhp <= 0) {
                const xx = mon.mx, yy = mon.my;

                await monkilled(mon, "", nocorpse ? -AD_RBRE : AD_PHYS);
                if (mon.mhp <= 0) { /* DEADMONSTER(mon) */
                    newsym(xx, yy);
                    trapkilled = true;
                }
            }
        } else {
            strike = 0; /* harmless; don't use up the missile */
        }
    }
    if (obj && (!strike || d_override)) {
        place_object(obj, mon.mx, mon.my);
        stackobj(obj);
    } else if (obj) {
        /* dealloc_obj(obj): garbage collected */
    }

    return trapkilled;
}

// C ref: trap.c trapeffect_arrow_trap()
async function trapeffect_arrow_trap(mtmp, trap, trflags) {
    let otmp;

    if (mtmp === game.youmonst) {
        throw new Error('trapeffect_arrow_trap(): hero branch not ported yet');
    } else {
        const in_sight = canseemon(mtmp) || (mtmp === game.u.usteed);
        const see_it = cansee(mtmp.mx, mtmp.my);
        let trapkilled = false;

        if (trap.once && trap.tseen && !rn2(15)) {
            if (in_sight && see_it)
                await pline(`${Monnam(mtmp)} triggers a trap but nothing happens.`);
            deltrap(trap);
            newsym(mtmp.mx, mtmp.my);
            return Trap_Is_Gone;
        }
        trap.once = 1;
        otmp = t_missile(ARROW, trap);
        if (in_sight)
            seetrap(trap);
        if (await thitm(8, mtmp, otmp, 0, false))
            trapkilled = true;

        return trapkilled ? Trap_Killed_Mon : mtmp.mtrapped
            ? Trap_Caught_Mon : Trap_Effect_Finished;
    }
}

// C ref: trap.c trapeffect_dart_trap()
async function trapeffect_dart_trap(mtmp, trap, trflags) {
    let otmp;

    if (mtmp === game.youmonst) {
        throw new Error('trapeffect_dart_trap(): hero branch not ported yet');
    } else {
        const in_sight = canseemon(mtmp) || (mtmp === game.u.usteed);
        const see_it = cansee(mtmp.mx, mtmp.my);
        let trapkilled = false;

        if (trap.once && trap.tseen && !rn2(15)) {
            if (in_sight && see_it)
                await pline(`${Monnam(mtmp)} triggers a trap but nothing happens.`);
            deltrap(trap);
            newsym(mtmp.mx, mtmp.my);
            return Trap_Is_Gone;
        }
        trap.once = 1;
        otmp = t_missile(DART, trap);
        if (!rn2(6))
            otmp.opoisoned = 1;
        if (in_sight)
            seetrap(trap);
        if (await thitm(7, mtmp, otmp, 0, false))
            trapkilled = true;

        return trapkilled ? Trap_Killed_Mon : mtmp.mtrapped
            ? Trap_Caught_Mon : Trap_Effect_Finished;
    }
}

// C ref: trap.c trapeffect_rocktrap()
async function trapeffect_rocktrap(mtmp, trap, trflags) {
    let otmp;

    if (mtmp === game.youmonst) {
        throw new Error('trapeffect_rocktrap(): hero branch not ported yet');
    } else {
        const in_sight = canseemon(mtmp) || (mtmp === game.u.usteed);
        const see_it = cansee(mtmp.mx, mtmp.my);
        let trapkilled = false;

        if (trap.once && trap.tseen && !rn2(15)) {
            if (in_sight && see_it)
                await pline(`A trap door above ${mon_nam(mtmp)} opens, but nothing falls out!`);
            deltrap(trap);
            newsym(mtmp.mx, mtmp.my);
            return Trap_Is_Gone;
        }
        trap.once = 1;
        otmp = t_missile(ROCK, trap);
        if (in_sight)
            seetrap(trap);
        if (await thitm(0, mtmp, otmp, d(2, 6), false))
            trapkilled = true;

        return trapkilled ? Trap_Killed_Mon : mtmp.mtrapped
            ? Trap_Caught_Mon : Trap_Effect_Finished;
    }
}

// C ref: trap.c trapeffect_bear_trap()
async function trapeffect_bear_trap(mtmp, trap, trflags) {
    const is_you = mtmp === game.youmonst,
          forcetrap = ((trflags & FORCETRAP) !== 0
                       || (trflags & FAILEDUNTRAP) !== 0
                       || (is_you && (trflags & VIASITTING) !== 0));

    if (is_you) {
        const dmg = d(2, 4);
        const u = game.u;
        const A_Your = ["A", "Your"];
        const madeby_u = trap.madeby_u ? 1 : 0;

        if ((Levitation() || Flying()) && !forcetrap)
            return Trap_Effect_Finished;
        feeltrap(trap);
        if (amorphous(game.youmonst.data) || is_whirly(game.youmonst.data)
            || unsolid(game.youmonst.data)) {
            await pline(`${A_Your[madeby_u]} bear trap closes harmlessly through you.`);
            return Trap_Effect_Finished;
        }
        if (!u.usteed && game.youmonst.data.msize <= MZ_SMALL) {
            await pline(`${A_Your[madeby_u]} bear trap closes harmlessly over you.`);
            return Trap_Effect_Finished;
        }
        set_utrap(rn1(4, 4), TT_BEARTRAP);
        if (u.usteed) {
            throw new Error('trapeffect_bear_trap(): steed caught (mbodypart()) not ported yet');
        } else {
            await pline(`${A_Your[madeby_u]} bear trap closes on your ${
                body_part(FOOT)}!`);
            if (u.umonnum === PM_OWLBEAR || u.umonnum === PM_BUGBEAR)
                await You("howl in anger!");
            if (wearing_iron_shoes(mtmp))
                throw new Error('trapeffect_bear_trap(): Yname2(uarmf) not ported yet');
            else {
                await set_wounded_legs(rn2(2) ? RIGHT_SIDE : LEFT_SIDE, rn1(10, 10));
                await losehp(Maybe_Half_Phys(dmg), "bear trap", KILLED_BY_AN);
            }
        }
        exercise(A_DEX, false);
    } else {
        const mptr = mtmp.data;
        const in_sight = canseemon(mtmp) || (mtmp === game.u.usteed);
        let trapkilled = false;

        if (mptr.msize > MZ_SMALL && !amorphous(mptr) && !m_in_air(mtmp)
            && !is_whirly(mptr) && !unsolid(mptr)) {
            mtmp.mtrapped = 1;
            if (in_sight) {
                await pline(`${Monnam(mtmp)} is caught in ${
                    a_your[trap.madeby_u ? 1 : 0]} bear trap!`);
                seetrap(trap);
            } else {
                if (mptr === mons[PM_OWLBEAR]
                    || mptr === mons[PM_BUGBEAR]) {
                    /* Soundeffect(se_roar, 100) */
                    await You_hear("the roaring of an angry bear!");
                }
            }
        } else if (forcetrap) {
            if (in_sight) {
                await pline(`${Monnam(mtmp)} evades ${
                    a_your[trap.madeby_u ? 1 : 0]} bear trap!`);
                seetrap(trap);
            }
        }
        if (mtmp.mtrapped && !wearing_iron_shoes(mtmp))
            trapkilled = await thitm(0, mtmp, null, d(2, 4), false);

        return trapkilled ? Trap_Killed_Mon : mtmp.mtrapped
            ? Trap_Caught_Mon : Trap_Effect_Finished;
    }
}

// C ref: mhitm.c sleep_monst()
/* `mon' is hit by a sleep attack; return 1 if it's affected, 0 otherwise */
function sleep_monst(mon, amt, how) {
    /* reveal mimic unless already asleep or paralyzed (won't be 'busy') */
    if (how >= 0)
        throw new Error('sleep_monst(): seemimic()/resist() not ported yet');

    if (resists_sleep(mon) || defended(mon, AD_SLEE)) {
        /* shieldeff(mon->mx, mon->my): display effect only */
    } else if (mon.mcanmove) {
        finish_meating(mon); /* terminate any meal-in-progress */
        amt += (mon.mfrozen || 0);
        if (amt > 0) { /* sleep for N turns */
            mon.mcanmove = 0;
            mon.mfrozen = Math.min(amt, 127);
        } else { /* sleep until awakened */
            mon.msleeping = 1;
        }
        return 1;
    }
    return 0;
}

// C ref: dogmove.c finish_meating()
function finish_meating(mtmp) {
    mtmp.meating = 0;
    if (mtmp.m_ap_type && mtmp.data.mlet !== S_MIMIC) {
        /* was eating a mimic and now appearance needs resetting */
        mtmp.m_ap_type = 0; /* M_AP_NOTHING */
        mtmp.mappearance = 0;
        newsym(mtmp.mx, mtmp.my);
    }
}

// C ref: trap.c trapeffect_slp_gas_trap()
async function trapeffect_slp_gas_trap(mtmp, trap, trflags) {
    if (mtmp === game.youmonst) {
        throw new Error('trapeffect_slp_gas_trap(): hero branch not ported yet');
    } else {
        const in_sight = canseemon(mtmp) || (mtmp === game.u.usteed);

        if (!resists_sleep(mtmp) && !breathless(mtmp.data)
            && !helpless(mtmp)) {
            if (sleep_monst(mtmp, rnd(25), -1) && in_sight) {
                await pline(`${Monnam(mtmp)} suddenly falls asleep!`);
                seetrap(trap);
            }
        }
    }
    return Trap_Effect_Finished;
}

// C ref: trap.c water_damage()
/* Get an object wet and damage it appropriately; ER_* result */
async function water_damage(obj, ostr, force) {
    const ER_NOTHING = 0;
    const in_invent = obj && obj.where === 'OBJ_INVENT';

    if (!obj)
        return ER_NOTHING;

    if (obj.lamplit) /* splash_lit(obj) */
        throw new Error('water_damage(): splash_lit() not ported yet');

    /* if (!ostr) ostr = cxname(obj): only erode_obj()'s messages use it */

    if (obj.otyp === CAN_OF_GREASE && obj.spe > 0) {
        return ER_NOTHING;
    } else if (obj.otyp === TOWEL && obj.spe < 7) {
        throw new Error('water_damage(): wet_a_towel() not ported yet');
    } else if (obj.greased) {
        throw new Error('water_damage(): greased object not ported yet');
    } else if (Is_container(obj)) {
        throw new Error('water_damage(): container contents not ported yet');
    } else if (!force && (Luck() + 5) > rn2(20)) {
        /*  chance per item of sustaining damage:
            *   max luck:               10%
            *   avg luck (Luck==0):     75%
            *   awful luck (Luck<-4):  100%
            */
        return ER_NOTHING;
    } else if (obj.oclass === SCROLL_CLASS || obj.oclass === SPBOOK_CLASS
               || obj.oclass === POTION_CLASS) {
        void in_invent;
        throw new Error('water_damage(): scroll/spellbook/potion damage not ported yet');
    } else {
        return await erode_obj(obj, ostr, ERODE_RUST, EF_NONE);
    }
}

/* C ref: you.h Luck */
function Luck() { return (game.u.uluck || 0) + (game.u.moreluck || 0); }

/* C ref: trap.h erode types, EF_* flags */
const ERODE_BURN = 0, ERODE_RUST = 1, ERODE_ROT = 2, ERODE_CORRODE = 3,
      ERODE_CRACK = 4;
const EF_NONE = 0, EF_GREASE = 0x01, EF_DESTROY = 0x02, EF_VERBOSE = 0x04,
      EF_PAY = 0x08;
const MAX_ERODE = 3;

// C ref: trap.c erode_obj() -- the rust case, as reached from water_damage()
/* returns ER_DAMAGED, ER_GREASED, ER_NOTHING or ER_DESTROYED */
async function erode_obj(otmp, ostr, type, ef_flags) {
    const ER_NOTHING = 0, ER_DAMAGED = 2;
    const action = ["smoulder", "rust", "rot", "corrode", "crack"],
          bythe = ["heat", "oxidation", "decay", "corrosion", "impact"];
    let vulnerable = false, is_primary = true;
    const check_grease = (ef_flags & EF_GREASE) !== 0,
          print = (ef_flags & EF_VERBOSE) !== 0;

    if (!otmp)
        return ER_NOTHING;

    const victim = (otmp.where === 'OBJ_INVENT') ? game.youmonst
                   : (otmp.where === 'OBJ_MINVENT') ? otmp.ocarry : null;
    const uvictim = (victim === game.youmonst);
    const vismon = victim && (victim !== game.youmonst) && canseemon(victim);
    if (!victim)
        throw new Error('erode_obj(): floor object (visobj) not ported yet');
    const visobj = false;

    switch (type) {
    case ERODE_RUST:
        vulnerable = is_rustprone(otmp);
        break;
    default:
        throw new Error('erode_obj(): erosion types other than rust not ported yet');
    }
    const erosion = is_primary ? otmp.oeroded : otmp.oeroded2;

    if (check_grease && otmp.greased) {
        throw new Error('erode_obj(): grease_protect() not ported yet');
    } else if (!erosion_matters(otmp)) {
        return ER_NOTHING;
    } else if (!vulnerable || (otmp.oerodeproof && otmp.rknown)) {
        if (game.flags.verbose && print && (uvictim || vismon))
            throw new Error('erode_obj(): "not affected" message not ported yet');
        return ER_NOTHING;
    } else if (otmp.oerodeproof || (otmp.blessed && !rnl(4))) {
        if (game.flags.verbose && (print || otmp.oerodeproof)
            && (uvictim || vismon || visobj)) {
            if (!uvictim || !ostr)
                throw new Error('erode_obj(): "Somehow" message not ported yet');
            await pline(`Somehow, your ${ostr} ${vtense(ostr, "are")} not affected by the ${bythe[type]}.`);
        }
        /* We assume here that if the object is protected because it
         * is blessed, it still shows some minor signs of wear, and
         * the hero can distinguish this from an object that is
         * actually proof against damage.
         */
        if (otmp.oerodeproof) {
            otmp.rknown = 1;
            /* update_inventory() */
        }
        return ER_NOTHING;
    } else if (erosion < MAX_ERODE) {
        const adverb = (erosion + 1 === MAX_ERODE) ? " completely"
                       : erosion ? " further" : "";

        if (uvictim || vismon || visobj) {
            if (!uvictim || !ostr)
                throw new Error('erode_obj(): erosion message for this object not ported yet');
            await pline(`Your ${ostr} ${vtense(ostr, action[type])}${adverb}!`);
        }

        if (ef_flags & EF_PAY)
            throw new Error('erode_obj(): costly_alteration() not ported yet');

        if (is_primary)
            otmp.oeroded++;
        else
            otmp.oeroded2++;

        /* update_inventory() */
        return ER_DAMAGED;
    } else if (ef_flags & EF_DESTROY) {
        throw new Error('erode_obj(): destroying an eroded object not ported yet');
    } else {
        if (game.flags.verbose && print)
            throw new Error('erode_obj(): "completely rusty" message not ported yet');
        return ER_NOTHING;
    }
}

/* C ref: objnam.c suit_simple_name(), cloak_simple_name(),
   helm_simple_name() */
function suit_simple_name(suit) {
    if (suit) {
        if (suit.otyp >= GRAY_DRAGON_SCALE_MAIL && suit.otyp <= YELLOW_DRAGON_SCALE_MAIL)
            return "dragon mail"; /* <color> dragon scale mail */
        else if (suit.otyp >= GRAY_DRAGON_SCALES && suit.otyp <= YELLOW_DRAGON_SCALES)
            return "dragon scales";
        const suitnm = OBJ_NAME(objects[suit.otyp]);
        if (suitnm.length > 5 && suitnm.endsWith(" mail"))
            return "mail"; /* most suits fall into this category */
        else if (suitnm.length > 7 && suitnm.endsWith(" jacket"))
            return "jacket"; /* leather jacket */
    }
    /* "suit" is lame but "armor" is ambiguous and "body armor" is absurd */
    return "suit";
}
function cloak_simple_name(cloak) {
    if (cloak) {
        switch (cloak.otyp) {
        case ROBE:
            return "robe";
        case MUMMY_WRAPPING:
            return "wrapping";
        case ALCHEMY_SMOCK:
            return (objects[cloak.otyp].oc_name_known && cloak.dknown)
                       ? "smock" : "apron";
        default:
            break;
        }
    }
    return "cloak";
}
function gloves_simple_name(gloves) {
    const gauntlets = "gauntlets";

    if (gloves && gloves.dknown) {
        const ocl = objects[gloves.otyp];
        const actualn = OBJ_NAME(ocl), descrpn = OBJ_DESCR(ocl);

        if ((ocl.oc_name_known ? actualn : descrpn || '').toLowerCase()
                .includes(gauntlets))
            return gauntlets;
    }
    return "gloves";
}
function helm_simple_name(helmet) {
    /* hard_helmet(): metallic helmets other than the elven leather helm */
    const hard = helmet && is_metallic(helmet);
    return !hard ? "hat" : "helm";
}

// C ref: trap.c trapeffect_rust_trap()
async function trapeffect_rust_trap(mtmp, trap, trflags) {
    if (mtmp === game.youmonst) {
        const u = game.u;
        seetrap(trap);

        /* Unlike monsters, traps cannot aim their rust attacks at
         * you, so instead of looping through and taking either the
         * first rustable one or the body, we take whatever we get,
         * even if it is not rustable.
         */
        switch (rn2(5)) {
        case 0:
            await pline(`${A_gush_of_water_hits} you on the ${body_part(HEAD)}!`);
            await water_damage(game.uarmh, game.uarmh ? helm_simple_name(game.uarmh) : null, true);
            break;
        case 1:
            await pline(`${A_gush_of_water_hits} your left ${body_part(ARM)}!`);
            if (await water_damage(game.uarms, "shield", true) !== 0 /* ER_NOTHING */)
                break;
            if (u.twoweap || (game.uwep && bimanual(game.uwep)))
                await water_damage(u.twoweap ? game.uswapwep : game.uwep, null, true);
            /* uglovecheck: */
            await water_damage(game.uarmg, gloves_simple_name(game.uarmg), true);
            break;
        case 2:
            await pline(`${A_gush_of_water_hits} your right ${body_part(ARM)}!`);
            await water_damage(game.uwep, null, true);
            /* goto uglovecheck */
            await water_damage(game.uarmg, gloves_simple_name(game.uarmg), true);
            break;
        default:
            await pline(`${A_gush_of_water_hits} you!`);
            /* note: exclude primary and secondary weapons from splashing
               because cases 1 and 2 target them [via water_damage()] */
            for (let otmp = game.invent, nextobj; otmp; otmp = nextobj) {
                nextobj = otmp.nobj;
                if (otmp.lamplit && otmp !== game.uwep
                    && (otmp !== game.uswapwep || !u.twoweap))
                    throw new Error('trapeffect_rust_trap(): splash_lit() not ported yet');
            }
            if (game.uarmc)
                await water_damage(game.uarmc, cloak_simple_name(game.uarmc), true);
            else if (game.uarm)
                await water_damage(game.uarm, suit_simple_name(game.uarm), true);
            else if (game.uarmu)
                await water_damage(game.uarmu, "shirt", true);
        }
        /* update_inventory(): no perm_invent window */

        if (u.umonnum === PM_IRON_GOLEM) {
            throw new Error('trapeffect_rust_trap(): hero iron golem rusting away not ported yet');
        } else if (u.umonnum === PM_GREMLIN && rn2(3)) {
            throw new Error('trapeffect_rust_trap(): split_mon() for the hero not ported yet');
        }
    } else {
        const in_sight = canseemon(mtmp) || (mtmp === game.u.usteed);
        const trapkilled = false;
        const mptr = mtmp.data;
        let target;

        if (in_sight)
            seetrap(trap);
        switch (rn2(5)) {
        case 0:
            if (in_sight)
                throw new Error('trapeffect_rust_trap(): mbodypart() message not ported yet');
            target = which_armor(mtmp, W_ARMH);
            water_damage(target, null, true);
            break;
        case 1:
            if (in_sight)
                throw new Error('trapeffect_rust_trap(): mbodypart() message not ported yet');
            target = which_armor(mtmp, W_ARMS);
            if (water_damage(target, "shield", true) !== 0 /* ER_NOTHING */)
                break;
            target = mtmp.mw; /* MON_WEP(mtmp) */
            if (target && bimanual(target))
                water_damage(target, null, true);
            /* mglovecheck: */
            target = which_armor(mtmp, W_ARMG);
            water_damage(target, null, true);
            break;
        case 2:
            if (in_sight)
                throw new Error('trapeffect_rust_trap(): mbodypart() message not ported yet');
            water_damage(mtmp.mw, null, true);
            /* goto mglovecheck */
            target = which_armor(mtmp, W_ARMG);
            water_damage(target, null, true);
            break;
        default:
            if (in_sight)
                await pline(`${A_gush_of_water_hits} ${mon_nam(mtmp)}!`);
            for (const otmp of mtmp.minvent || [])
                if (otmp.lamplit
                    /* exclude weapon(s) because cases 1 and 2 do them */
                    && (otmp.owornmask & (W_WEP | W_SWAPWEP)) === 0)
                    throw new Error('trapeffect_rust_trap(): splash_lit() not ported yet');
            if ((target = which_armor(mtmp, W_ARMC)) != null)
                water_damage(target, null, true);
            else if ((target = which_armor(mtmp, W_ARM)) != null)
                water_damage(target, null, true);
            else if ((target = which_armor(mtmp, W_ARMU)) != null)
                water_damage(target, "shirt", true);
        }

        if (mptr === mons[PM_IRON_GOLEM]) { /* completelyrusts(mptr) */
            throw new Error('trapeffect_rust_trap(): iron golem rusting away not ported yet');
        } else if (mptr === mons[PM_GREMLIN] && rn2(3)) {
            throw new Error('trapeffect_rust_trap(): split_mon() not ported yet');
        }

        return trapkilled ? Trap_Killed_Mon : mtmp.mtrapped
            ? Trap_Caught_Mon : Trap_Effect_Finished;
    }
}

// C ref: trap.c burnarmor()
/* called when you're hit by fire (dofiretrap,buzz,zapyourself,explode);
   returns TRUE if hit on torso */
function burnarmor(victim) {
    let item;

    if (!victim)
        return 0;
    if (victim === game.youmonst)
        throw new Error('burnarmor(): hero armor not ported yet');

    /* burning damage may dry wet towel */
    for (item of victim.minvent || [])
        if (item.otyp === TOWEL && item.spe > 0)
            throw new Error('burnarmor(): dry_a_towel() not ported yet');

    /* burn_dmg(obj, descr) is erode_obj(obj, descr, ERODE_BURN, EF_GREASE),
       which does nothing (ER_NOTHING) for a missing item */
    const burn_dmg = (obj) => {
        if (obj)
            throw new Error('burnarmor(): erode_obj() not ported yet');
        return 0;
    };
    while (true) {
        switch (rn2(5)) {
        case 0:
            item = which_armor(victim, W_ARMH);
            if (!burn_dmg(item))
                continue;
            break;
        case 1:
            item = which_armor(victim, W_ARMC);
            if (item) {
                burn_dmg(item);
                return true;
            }
            item = which_armor(victim, W_ARM);
            if (item) {
                burn_dmg(item);
                return true;
            }
            item = which_armor(victim, W_ARMU);
            if (item)
                burn_dmg(item);
            return true;
        case 2:
            item = which_armor(victim, W_ARMS);
            if (!burn_dmg(item))
                continue;
            break;
        case 3:
            item = which_armor(victim, W_ARMG);
            if (!burn_dmg(item))
                continue;
            break;
        case 4:
            item = which_armor(victim, W_ARMF);
            if (!burn_dmg(item))
                continue;
            break;
        }
        break; /* Out of while loop */
    }

    return false;
}

// C ref: trap.c trapeffect_fire_trap()
async function trapeffect_fire_trap(mtmp, trap, trflags) {
    if (mtmp === game.youmonst) {
        throw new Error('trapeffect_fire_trap(): dofiretrap() not ported yet');
    } else {
        const tx = trap.tx, ty = trap.ty;
        const in_sight = canseemon(mtmp) || (mtmp === game.u.usteed);
        const see_it = cansee(tx, ty);
        let trapkilled = false;
        const mptr = mtmp.data;
        const orig_dmg = d(2, 4);

        if (in_sight || see_it)
            throw new Error('trapeffect_fire_trap(): surface() message not ported yet');
        if (resists_fire(mtmp)) {
            /* in_sight: shieldeff() and "is uninjured" (not in sight here) */
        } else {
            let num = orig_dmg, alt;
            let immolate = false;

            /* paper burns very fast, assume straw is tightly packed
               and burns a bit slower
               (note: this is inconsistent with mattackm()'s AD_FIRE
               damage where completelyburns() includes straw golem) */
            switch (mptr) {
            case mons[PM_PAPER_GOLEM]:
                immolate = true;
                alt = mtmp.mhpmax;
                break;
            case mons[PM_STRAW_GOLEM]:
                alt = Math.trunc(mtmp.mhpmax / 2);
                break;
            case mons[PM_WOOD_GOLEM]:
                alt = Math.trunc(mtmp.mhpmax / 4);
                break;
            case mons[PM_LEATHER_GOLEM]:
                alt = Math.trunc(mtmp.mhpmax / 8);
                break;
            default:
                alt = 0;
                break;
            }
            if (alt > num)
                num = alt;

            if (await thitm(0, mtmp, null, num, immolate))
                trapkilled = true;
            else {
                mtmp.mhpmax -= rn2(num + 1);
                if (mtmp.mhp > mtmp.mhpmax)
                    mtmp.mhp = mtmp.mhpmax;
            }
        }
        if (burnarmor(mtmp) || rn2(3))
            throw new Error('trapeffect_fire_trap(): destroy_items() not ported yet');
        throw new Error('trapeffect_fire_trap(): burn_floor_objects() not ported yet');
    }
}

// C ref: trap.c selftouch()
export async function selftouch(arg) {
    const g = game;
    const Stone_resistance = !!(uprop(STONE_RES).intrinsic
                                || uprop(STONE_RES).extrinsic);
    void arg;
    if (g.uwep && g.uwep.otyp === CORPSE
        && (g.uwep.corpsenm === PM_COCKATRICE
            || g.uwep.corpsenm === PM_CHICKATRICE) /* touch_petrifies() */
        && !Stone_resistance)
        throw new Error('selftouch(): instapetrify() not ported yet');
    /* Or your secondary weapon, if wielded [hypothetical; we don't
       allow two-weapon combat when either weapon is a corpse] */
    if (g.u.twoweap && g.uswapwep && g.uswapwep.otyp === CORPSE
        && (g.uswapwep.corpsenm === PM_COCKATRICE
            || g.uswapwep.corpsenm === PM_CHICKATRICE)
        && !Stone_resistance)
        throw new Error('selftouch(): instapetrify() not ported yet');
}

// C ref: trap.c mselftouch()
async function mselftouch(mon, arg, byplayer) {
    const mwep = mon.mw; /* MON_WEP(mon) */

    if (mwep && mwep.otyp === CORPSE
        && (mwep.corpsenm === PM_COCKATRICE || mwep.corpsenm === PM_CHICKATRICE)
        && !resists_ston(mon))
        throw new Error('mselftouch(): minstapetrify() not ported yet');
}

// C ref: trap.c trapeffect_pit()
async function trapeffect_pit(mtmp, trap, trflags) {
    const ttype = trap.ttyp;
    /* relevant_spikes is initially always true for spiked pits, but
       set to false if the spikes are found to not be relevant */
    let relevant_spikes = ttype === SPIKED_PIT;

    if (mtmp === game.youmonst) {
        throw new Error('trapeffect_pit(): hero branch not ported yet');
    } else {
        const in_sight = canseemon(mtmp) || (mtmp === game.u.usteed);
        let trapkilled = false;
        const forcetrap = ((trflags & FORCETRAP) !== 0);
        const Sokoban = game.level.flags.sokoban_rules;
        const inescapable = (forcetrap || (Sokoban && !trap.madeby_u));
        const mptr = mtmp.data;
        let fallverb;

        fallverb = "falls";
        if (!grounded(mptr) || (mtmp.wormno /* && count_wsegs(mtmp) > 5 */)) {
            if (mtmp.wormno)
                throw new Error('trapeffect_pit(): count_wsegs() not ported yet');
            if (forcetrap && !Sokoban) {
                /* openfallingtrap; not inescapable here */
                if (in_sight) {
                    seetrap(trap);
                    await pline(`${Monnam(mtmp)} doesn't fall into the pit.`);
                }
                return Trap_Effect_Finished;
            }
            if (!inescapable)
                return Trap_Effect_Finished; /* avoids trap */
            fallverb = "is dragged"; /* sokoban pit */
        }
        if (!passes_walls(mptr))
            mtmp.mtrapped = 1;
        if (in_sight) {
            await pline(`${Monnam(mtmp)} ${fallverb} into ${
                a_your[trap.madeby_u ? 1 : 0]} pit!`);
            if (mptr === mons[PM_PIT_VIPER]
                || mptr === mons[PM_PIT_FIEND])
                await pline("How pitiful.  Isn't that the pits?");
            seetrap(trap);
        }
        await mselftouch(mtmp, "Falling, ", false);
        if (wearing_iron_shoes(mtmp)) relevant_spikes = false;
        if (mtmp.mhp < 1 /* DEADMONSTER(mtmp) */
            || await thitm(0, mtmp, null, rnd(relevant_spikes ? 10 : 6), false))
            trapkilled = true;

        return trapkilled ? Trap_Killed_Mon : mtmp.mtrapped
            ? Trap_Caught_Mon : Trap_Effect_Finished;
    }
}

// C ref: trap.c trapeffect_hole()
async function trapeffect_hole(mtmp, trap, trflags) {
    if (mtmp === game.youmonst) {
        throw new Error('trapeffect_hole(): fall_through() for the hero not ported yet');
    } else {
        const tt = trap.ttyp;
        const mptr = mtmp.data;
        const in_sight = canseemon(mtmp) || (mtmp === game.u.usteed);
        const forcetrap = ((trflags & FORCETRAP) !== 0);
        const Sokoban = game.level.flags.sokoban_rules;
        const inescapable = (forcetrap || (Sokoban && !trap.madeby_u));

        if (!Can_fall_thru(game.u.uz)) {
            /* impossible("mintrap: %ss cannot exist on this level.") */
            return Trap_Effect_Finished; /* don't activate it after all */
        }
        if (mtmp.wormno)
            throw new Error('trapeffect_hole(): count_wsegs() not ported yet');
        if (!grounded(mptr) || mptr.msize >= MZ_HUGE) {
            if (forcetrap && !Sokoban) {
                /* openfallingtrap; not inescapable here */
                if (in_sight) {
                    seetrap(trap);
                    if (tt === TRAPDOOR)
                        await pline(`A trap door opens, but ${mon_nam(mtmp)} doesn't fall through.`);
                    else /* (tt == HOLE) */
                        await pline(`${Monnam(mtmp)} doesn't fall through the hole.`);
                }
                return Trap_Effect_Finished; /* inescapable = FALSE; */
            }
            if (inescapable) { /* sokoban hole */
                if (in_sight) {
                    await pline(`${Monnam(mtmp)} seems to be yanked down!`);
                    seetrap(trap);
                }
            } else
                return Trap_Effect_Finished;
        }
        return trapeffect_level_telep(mtmp, trap, trflags);
    }
}

// C ref: trap.c trapeffect_telep_trap()
async function trapeffect_telep_trap(mtmp, trap, trflags) {
    if (mtmp === game.youmonst) {
        seetrap(trap);
        await tele_trap(trap);
    } else {
        const in_sight = canseemon(mtmp) || (mtmp === game.u.usteed);

        await mtele_trap(mtmp, trap, in_sight);
        return Trap_Moved_Mon;
    }
    return Trap_Effect_Finished;
}

// C ref: trap.c trapeffect_level_telep()
async function trapeffect_level_telep(mtmp, trap, trflags) {
    if (mtmp === game.youmonst) {
        throw new Error('trapeffect_level_telep(): level_tele_trap() for the hero not ported yet');
    } else {
        const in_sight = canseemon(mtmp) || (mtmp === game.u.usteed);
        const forcetrap = ((trflags & FORCETRAP) !== 0);

        return mlevel_tele_trap(mtmp, trap, forcetrap, in_sight);
    }
}

// C ref: trap.c mu_maybe_destroy_web()
async function mu_maybe_destroy_web(mtmp, domsg, trap) {
    const isyou = (mtmp === game.youmonst);
    const mptr = mtmp.data;

    if (amorphous(mptr) || is_whirly(mptr) || flaming(mptr)
        || unsolid(mptr) || mptr === mons[PM_GELATINOUS_CUBE]) {
        const x = trap.tx;
        const y = trap.ty;

        if (flaming(mptr) || acidic(mptr)) {
            if (domsg) {
                if (isyou)
                    throw new Error('mu_maybe_destroy_web(): hero branch not ported yet');
                else
                    await pline(`${Monnam(mtmp)} ${
                        (flaming(mptr)) ? "burns" : "dissolves"} ${
                        a_your[trap.madeby_u ? 1 : 0]} spider web!`);
            }
            deltrap(trap);
            newsym(x, y);
            return true;
        }
        if (domsg) {
            if (isyou) {
                throw new Error('mu_maybe_destroy_web(): hero branch not ported yet');
            } else {
                await pline(`${Monnam(mtmp)} flows through ${
                    a_your[trap.madeby_u ? 1 : 0]} spider web.`);
                seetrap(trap);
            }
        }
        return true;
    }
    return false;
}

// C ref: trap.c trapeffect_web()
async function trapeffect_web(mtmp, trap, trflags) {
    if (mtmp === game.youmonst) {
        throw new Error('trapeffect_web(): hero branch not ported yet');
    } else {
        /* Monster in a web. */
        let tear_web;
        const in_sight = canseemon(mtmp) || (mtmp === game.u.usteed);
        const forcetrap = ((trflags & FORCETRAP) !== 0);
        const mptr = mtmp.data;

        if (webmaker(mptr))
            return Trap_Effect_Finished;
        if (await mu_maybe_destroy_web(mtmp, in_sight, trap))
            return Trap_Effect_Finished;
        tear_web = false;
        const mndx = monsndx(mptr);
        let caught_default = true;
        switch (mndx) {
        case PM_OWLBEAR: /* Eric Backus */
        case PM_BUGBEAR:
            if (!in_sight) {
                /* Soundeffect(se_roar, 60) */
                await You_hear("the roaring of a confused bear!");
                mtmp.mtrapped = 1;
                caught_default = false;
            }
            break; /* FALLTHRU to default unless !in_sight */
            /* this list is fairly arbitrary; it deliberately
               excludes wumpus & giant/ettin zombies/mummies */
        case PM_TITANOTHERE:
        case PM_BALUCHITHERIUM:
        case PM_PURPLE_WORM:
        case PM_JABBERWOCK:
        case PM_IRON_GOLEM:
        case PM_BALROG:
        case PM_KRAKEN:
        case PM_MASTODON:
        case PM_ORION:
        case PM_NORN:
        case PM_CYCLOPS:
        case PM_LORD_SURTUR:
            tear_web = true;
            caught_default = false;
            break;
        default:
            break;
        }
        if (caught_default) { /* default: */
            if (mtmp.wormno)
                throw new Error('trapeffect_web(): count_wsegs() not ported yet');
            if (mptr.mlet === S_GIANT
                /* exclude baby dragons and relatively short worms */
                || (mptr.mlet === S_DRAGON && extra_nasty(mptr))) {
                tear_web = true;
            } else if (in_sight) {
                await pline(`${Monnam(mtmp)} is caught in ${
                    a_your[trap.madeby_u ? 1 : 0]} spider web.`);
                seetrap(trap);
            }
            mtmp.mtrapped = tear_web ? 0 : 1;
        }
        if (tear_web) {
            if (in_sight)
                await pline(`${Monnam(mtmp)} tears through ${
                    a_your[trap.madeby_u ? 1 : 0]} spider web!`);
            deltrap(trap);
            newsym(mtmp.mx, mtmp.my);
        } else if (forcetrap && !mtmp.mtrapped) {
            if (in_sight) {
                await pline(`${Monnam(mtmp)} avoids ${
                    a_your[trap.madeby_u ? 1 : 0]} spider web!`);
                seetrap(trap);
            }
        }
        return mtmp.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished;
    }
}

// C ref: trap.c trapeffect_statue_trap()
async function trapeffect_statue_trap(mtmp, trap, trflags) {
    if (mtmp === game.youmonst) {
        throw new Error('trapeffect_statue_trap(): activate_statue_trap() not ported yet');
    } else {
        /* monsters don't trigger statue traps */
    }
    return Trap_Effect_Finished;
}

// C ref: trap.c steedintrap()
/* 0 if trap doesn't affect steed, 1 if it does, 2 if steed dies */
async function steedintrap(trap, otmp) {
    const u = game.u;
    const steed = u.usteed;
    let trapkilled = false, steedhit = false;

    void otmp;
    if (!steed || !trap)
        return Trap_Effect_Finished;
    const tt = trap.ttyp;
    steed.mx = u.ux;
    steed.my = u.uy;

    switch (tt) {
    case SLP_GAS_TRAP:
        if (!resists_sleep(steed) && !breathless(steed.data)
            && !helpless(steed)) {
            if (sleep_monst(steed, rnd(25), -1))
                /* no in_sight check here; you can feel it even if blind */
                await pline(`${Monnam(steed)} suddenly falls asleep!`);
        }
        steedhit = true;
        break;
    case ARROW_TRAP:
    case DART_TRAP:
    case LANDMINE:
    case PIT:
    case SPIKED_PIT:
    case POLY_TRAP:
        throw new Error(`steedintrap(): steed hit by trap type ${tt} not ported yet`);
    default:
        break;
    }

    if (trapkilled)
        throw new Error('steedintrap(): dismount_steed() not ported yet');
    return steedhit ? 1 : 0;
}

// C ref: trap.c domagictrap()
async function domagictrap() {
    const u = game.u;
    const fate = rnd(20);

    /* What happened to the poor sucker? */

    if (fate < 10) {
        /* Most of the time, it creates some monsters. */
        throw new Error('domagictrap(): flash/roar monster creation not ported yet');
    } else {
        switch (fate) {
        case 10:
            /* sometimes nothing happens */
            break;
        case 11: /* toggle intrinsic invisibility */
            throw new Error('domagictrap(): invisibility toggle not ported yet');
        case 12: /* a flash of fire */
            throw new Error('domagictrap(): dofiretrap() not ported yet');

        /* odd feelings */
        case 13:
            await pline(`A shiver runs up and down your ${body_part(SPINE)}!`);
            break;
        case 14:
            await You_hear(Hallucination() ? "the moon howling at you."
                                           : "distant howling.");
            break;
        case 15:
            if (on_level(u.uz, game.dungeon_topology.d_qstart_level))
                await You_feel(`${(game.flags.female
                                   || (Upolyd() && is_neuter(game.youmonst.data)))
                                  ? "oddly " : ""}like the prodigal son.`);
            else
                await You(`suddenly yearn for ${
                    Hallucination() ? "Cleveland"
                    : (In_quest(u.uz) || at_dgn_entrance("The Quest"))
                      ? "your nearby homeland"
                      : "your distant homeland"}.`);
            break;
        case 16:
            await Your("pack shakes violently!");
            break;
        case 17:
            await You(Hallucination() ? "smell hamburgers." : "smell charred flesh.");
            break;
        case 18:
            await You_feel("tired.");
            break;

        /* very occasionally something nice happens. */
        case 19: /* tame nearby monsters */
            throw new Error('domagictrap(): taming nearby monsters not ported yet');
        case 20: /* uncurse stuff */
            throw new Error('domagictrap(): remove curse not ported yet');
        default:
            break;
        }
    }
}

// C ref: trap.c drain_en()
async function drain_en(n, max_already_drained) {
    const u = game.u;
    let mesg;
    let punct = max_already_drained ? '!' : '.';

    /*
     * FIXME?
     *  u.uenmax should probably have a higher minimum than 0;
     *  perhaps u.ulevel or (u.ulevel + 1) / 2
     */
    if (u.uenmax < 1) {
        /* energy is completely gone */
        if (u.uen || u.uenmax) { /* paranoia */
            u.uen = u.uenmax = 0;
            game.disp_botl = true;
        }
        mesg = "momentarily lethargic";
    } else {
        /* throttle further loss a bit when there's not much left to lose */
        if (n > Math.trunc((u.uen + u.uenmax) / 3))
            n = rnd(n);

        mesg = "your magical energy drain away";
        if (n > u.uen)
            punct = '!';

        u.uen -= n;
        if (u.uen < 0) {
            u.uenmax -= rnd(-u.uen);
            if (u.uenmax < 0)
                u.uenmax = 0;
            u.uen = 0;
        } else if (u.uen > u.uenmax) {
            /* uen might be greater than uenmax if caller reduced uenmax
               and then we throttled the loss being applied to current */
            u.uen = u.uenmax;
        }
        game.disp_botl = true;
    }
    /* after manipulating u.uen,uenmax and setting context.botl, so
       that You_feel() -> pline() will update status before the message */
    await You_feel(`${mesg}${punct}`);
}

// C ref: trap.c trapeffect_magic_trap()
async function trapeffect_magic_trap(mtmp, trap, trflags) {
    if (mtmp === game.youmonst) {
        const u = game.u;
        seetrap(trap);
        if (!rn2(30)) {
            deltrap(trap);
            newsym(u.ux, u.uy); /* update position */
            await You("are caught in a magical explosion!");
            await losehp(rnd(10), "magical explosion", KILLED_BY_AN);
            await Your("body absorbs some of the magical energy!");
            u.uen = (u.uenmax += 2);
            if (u.uenmax > u.uenpeak)
                u.uenpeak = u.uenmax;
            return Trap_Effect_Finished;
        } else {
            await domagictrap();
        }
        await steedintrap(trap, null);
    } else {
        /* A magic trap.  Monsters usually immune. */
        if (!rn2(21))
            return trapeffect_fire_trap(mtmp, trap, trflags);
    }
    return Trap_Effect_Finished;
}

// C ref: trap.c trapeffect_anti_magic()
async function trapeffect_anti_magic(mtmp, /* monster, possibly youmonst */
                                     trap, /* trap->ttyp == ANTI_MAGIC */
                                     trflags) {
    if (wearing_iron_shoes(mtmp)) {
        const shoes = which_armor(mtmp, W_ARMF);
        /* iron shoes protect against antimagic traps only if
           positively enchanted; the trap drains the enchantment
           rather than the wearer */
        if (shoes.spe > 0) {
            /* no message if a monster does this, it isn't visible enough */
            if (mtmp === game.youmonst)
                throw new Error('trapeffect_anti_magic(): "lethargic aura" (yname(), costly_alteration()) not ported yet');
            shoes.spe -= 1;
            /* update_inventory() */
            return Trap_Effect_Finished;
        }
    }

    if (mtmp === game.youmonst) {
        const u = game.u;
        let drain, halfd;
        let exclaim_it = false;

        seetrap(trap);
        if (Antimagic()) {
            let dmgval2 = rnd(4);
            const hp = Upolyd() ? u.mh : u.uhp;

            /* Half_XXX_damage has opposite its usual effect (approx)
               but isn't cumulative if hero has more than one */
            if (Half_physical_damage() || Half_spell_damage())
                dmgval2 += rnd(4);
            /* give Magicbane wielder dose of own medicine */
            if (game.uwep && game.uwep.oartifact === ART_MAGICBANE)
                dmgval2 += rnd(4);
            /* having an artifact--other than own quest one--which
               confers magic resistance simply by being carried
               also increases the effect */
            for (let otmp = game.invent; otmp; otmp = otmp.nobj)
                if (otmp.oartifact)
                    throw new Error('trapeffect_anti_magic(): artifacts (defends_when_carried()) not ported yet');
            if (Passes_walls())
                dmgval2 = Math.trunc((dmgval2 + 3) / 4);

            await You_feel((dmgval2 >= hp) ? "unbearably torpid!"
                           : (dmgval2 >= Math.trunc(hp / 4)) ? "very lethargic."
                             : "sluggish.");
            /* opposite of magical explosion */
            await losehp(dmgval2, "anti-magic implosion", KILLED_BY_AN);
        }

        /* if the drain amount is more than hero's maximum energy then up
           to half of the amount comes directly out of maximum, the rest
           comes out of current energy; drain_en() lowers the current
           amount and when doing so it will take even more from maximum
           if the new current value would drop below zero */
        drain = d(2, 6); /* 2d6 => 2..12 */
        halfd = rnd(Math.trunc(drain / 2)); /* 1..drain/2 (round down) */
        if (u.uenmax > drain) { /* [was u.uenmax > halfd] */
            u.uenmax -= halfd; /* drain_en() will set context.botl */
            drain -= halfd;
            exclaim_it = true;
        }
        await drain_en(drain, exclaim_it);
    } else {
        let trapkilled = false;
        const in_sight = canseemon(mtmp) || (mtmp === game.u.usteed);
        const see_it = cansee(mtmp.mx, mtmp.my);
        const mptr = mtmp.data;

        /* similar to hero's case, more or less */
        if (!resists_magm(mtmp)) { /* lose spell energy */
            if (!mtmp.mcan && (attacktype(mptr, AT_MAGC)
                               || attacktype(mptr, AT_BREA))) {
                mtmp.mspec_used = (mtmp.mspec_used || 0) + d(2, 6);
                if (in_sight) {
                    seetrap(trap);
                    await pline(`${Monnam(mtmp)} seems lethargic.`);
                }
            }
        } else { /* take some damage */
            let dmgval2 = rnd(4);

            if ((mtmp.minvent || []).some(o => o.oartifact))
                throw new Error('trapeffect_anti_magic(): artifacts (defends_when_carried()) not ported yet');
            if (passes_walls(mptr))
                dmgval2 = Math.trunc((dmgval2 + 3) / 4);

            if (in_sight)
                seetrap(trap);
            mtmp.mhp -= dmgval2;
            if (mtmp.mhp < 1)
                await monkilled(mtmp,
                                in_sight
                                ? "compression from an anti-magic field"
                                : null,
                                -AD_MAGM);
            if (mtmp.mhp < 1)
                trapkilled = true;
            if (see_it)
                newsym(trap.tx, trap.ty);
        }
        return trapkilled ? Trap_Killed_Mon : mtmp.mtrapped
            ? Trap_Caught_Mon : Trap_Effect_Finished;
    }
}

// C ref: trap.c trapeffect_landmine()
async function trapeffect_landmine(mtmp, trap, trflags) {
    let damage = rnd(16);
    /* iron shoes protect against much of the damage from the
       explosion, but you still take some damage (and wound legs)
       because they can't fully block the blast */
    if (wearing_iron_shoes(mtmp))
        damage = Math.trunc((damage + 3) / 4);

    if (mtmp === game.youmonst) {
        throw new Error('trapeffect_landmine(): hero branch not ported yet');
    } else {
        const in_sight = canseemon(mtmp) || (mtmp === game.u.usteed);

        /* heavier monsters are more likely to set off a land mine; on the
           other hand, any mon lighter than the trigger weight is immune */
        const MINE_TRIGGER_WT = Math.trunc(WT_ELF / 2);
        if (rn2(mtmp.data.cwt + 1) < MINE_TRIGGER_WT)
            return Trap_Effect_Finished;
        if (m_in_air(mtmp)) {
            const already_seen = trap.tseen;

            if (in_sight && !already_seen) {
                await pline(`A trigger appears in a pile of soil below ${mon_nam(mtmp)}.`);
                seetrap(trap);
            }
            if (rn2(3))
                return Trap_Effect_Finished;
            if (in_sight) {
                newsym(mtmp.mx, mtmp.my);
                await pline(`The air currents set ${
                    already_seen ? "a land mine" : "it"} off!`);
            }
        } else if (in_sight) {
            newsym(mtmp.mx, mtmp.my);
            await pline(`${!Deaf() ? "KAABLAMM!!!  " : ""}${Monnam(mtmp)} triggers ${
                a_your[trap.madeby_u ? 1 : 0]} land mine!`);
        }
        if (!in_sight && !Deaf())
            await pline("Kaablamm!  You hear an explosion in the distance!");
        throw new Error('trapeffect_landmine(): blow_up_landmine() not ported yet');
    }
}

// C ref: trap.c clamp_hole_destination()
export function clamp_hole_destination(dlev) {
    const bottom = dng_bottom(dlev);

    dlev.dlevel = Math.min(dlev.dlevel, bottom);
    return dlev;
}

// C ref: trap.c trapeffect_selector()
async function trapeffect_selector(mtmp, trap, trflags) {
    switch (trap.ttyp) {
    case ARROW_TRAP:
        return trapeffect_arrow_trap(mtmp, trap, trflags);
    case DART_TRAP:
        return trapeffect_dart_trap(mtmp, trap, trflags);
    case ROCKTRAP:
        return trapeffect_rocktrap(mtmp, trap, trflags);
    case SQKY_BOARD:
        return trapeffect_sqky_board(mtmp, trap, trflags);
    case BEAR_TRAP:
        return trapeffect_bear_trap(mtmp, trap, trflags);
    case SLP_GAS_TRAP:
        return trapeffect_slp_gas_trap(mtmp, trap, trflags);
    case RUST_TRAP:
        return trapeffect_rust_trap(mtmp, trap, trflags);
    case FIRE_TRAP:
        return trapeffect_fire_trap(mtmp, trap, trflags);
    case PIT:
    case SPIKED_PIT:
        return trapeffect_pit(mtmp, trap, trflags);
    case HOLE:
    case TRAPDOOR:
        return trapeffect_hole(mtmp, trap, trflags);
    case LEVEL_TELEP:
        return trapeffect_level_telep(mtmp, trap, trflags);
    case TELEP_TRAP:
        return trapeffect_telep_trap(mtmp, trap, trflags);
    case WEB:
        return trapeffect_web(mtmp, trap, trflags);
    case STATUE_TRAP:
        return trapeffect_statue_trap(mtmp, trap, trflags);
    case MAGIC_TRAP:
        return trapeffect_magic_trap(mtmp, trap, trflags);
    case ANTI_MAGIC:
        return trapeffect_anti_magic(mtmp, trap, trflags);
    case LANDMINE:
        return trapeffect_landmine(mtmp, trap, trflags);
    case MAGIC_PORTAL:
    case POLY_TRAP:
    case ROLLING_BOULDER_TRAP:
    case VIBRATING_SQUARE:
        throw new Error(`trapeffect_selector(): trap type ${trap.ttyp} not ported yet`);
    default:
        /* impossible("%s encountered a strange trap of type %d.") */
        break;
    }
    return Trap_Effect_Finished;
}

// C ref: trap.c trapnote()
function trapnote(trap, noprefix) {
    const tnnames = [
        "C note",  "D flat", "D note",  "E flat",
        "E note",  "F note", "F sharp", "G note",
        "G sharp", "A note", "B flat",  "B note",
    ];
    const tn = tnnames[trap.tnote];
    return (!noprefix ? just_an(tn) : '') + tn;
}

// C ref: trap.c seetrap()
export function seetrap(trap) {
    if (!trap.tseen) {
        trap.tseen = 1;
        newsym(trap.tx, trap.ty);
    }
}

// C ref: trap.c m_easy_escape_pit()
/* can monster escape from a pit easily */
function m_easy_escape_pit(mtmp) {
    return (mtmp.data === mons[PM_PIT_FIEND]
            || mtmp.data.msize >= MZ_HUGE);
}

// C ref: trap.c mintrap()
export async function mintrap(mtmp, mintrapflags) {
    const trap = t_at(mtmp.mx, mtmp.my);
    const mptr = mtmp.data;
    let trap_result = Trap_Effect_Finished;

    if (!trap) {
        mtmp.mtrapped = 0;      /* perhaps teleported? */
    } else if (mtmp.mtrapped) { /* is currently in the trap */
        if (!trap.tseen && cansee(mtmp.mx, mtmp.my) && canseemon(mtmp)
            && (is_pit(trap.ttyp) || trap.ttyp === BEAR_TRAP
                || trap.ttyp === HOLE
                || trap.ttyp === WEB)) {
            /* If you come upon an obviously trapped monster, then
               you must be able to see the trap it's in too. */
            seetrap(trap);
        }

        if (!rn2(40) || (is_pit(trap.ttyp) && m_easy_escape_pit(mtmp))) {
            if (sobj_at(BOULDER, mtmp.mx, mtmp.my)
                && is_pit(trap.ttyp)) {
                if (!rn2(2)) {
                    throw new Error('mintrap(): fill_pit() not ported yet');
                }
            } else {
                if (canseemon(mtmp)) {
                    /* set_msg_xy(mtmp->mx, mtmp->my) */
                    if (is_pit(trap.ttyp))
                        await pline(`${Monnam(mtmp)} climbs ${
                            m_easy_escape_pit(mtmp) ? "easily " : ""}out of the pit.`);
                    else if (trap.ttyp === BEAR_TRAP || trap.ttyp === WEB)
                        throw new Error('mintrap(): trapname() not ported yet');
                }
                mtmp.mtrapped = 0;
            }
        } else if (metallivorous(mptr)) {
            if (trap.ttyp === BEAR_TRAP || trap.ttyp === SPIKED_PIT)
                throw new Error('mintrap(): metallivore eating a trap not ported yet');
        }
        trap_result = mtmp.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished;
    } else {
        const tt = trap.ttyp;
        let forcetrap = ((mintrapflags & FORCETRAP) !== 0);
        const forcebungle = (mintrapflags & FORCEBUNGLE) !== 0;
        /* monster has seen such a trap before */
        const already_seen = (mon_knows_traps(mtmp, tt)
                              || (tt === HOLE && !mindless(mptr)));

        if (fixed_tele_trap(trap)) {
            mintrapflags |= FORCETRAP;
            forcetrap = true;
        }

        if (mtmp === game.u.usteed) {
            ; /* true when called from dotrap, inescapable is not an option */
        } else if (game.level.flags.sokoban_rules && (is_pit(tt) || is_hole(tt))
                   && !trap.madeby_u) {
            ; /* nothing here, the trap effects will handle messaging */
        } else if (!forcetrap) {
            if (floor_trigger(tt) && check_in_air(mtmp, mintrapflags)) {
                return Trap_Effect_Finished;
            }
            if (already_seen && rn2(4) && !forcebungle)
                return Trap_Effect_Finished;
        }

        mon_learns_traps(mtmp, tt);
        mons_see_trap(trap);

        /* Monster is aggravated by being trapped by you.
           Recognizing who made the trap isn't completely
           unreasonable; everybody has their own style. */
        if (trap.madeby_u && rnl(5))
            throw new Error('mintrap(): setmangry() not ported yet');

        trap_result = await trapeffect_selector(mtmp, trap, mintrapflags);

        /* mtmp can't stay hiding under an object if trapped in non-pit
           (mtmp hiding under object at armed bear trap location, hero
           zaps wand of locking or spell of wizard lock at spot triggering
           the trap and trapping mtmp there) */
        if (!(mtmp.mhp < 1) && mtmp.mtrapped)
            maybe_unhide_at(mtmp.mx, mtmp.my);
    }
    return trap_result;
}

/* mondata.h */
function amorphous(ptr) { return (ptr.mflags1 & M1_AMORPHOUS) !== 0; }
function unsolid(ptr) { return (ptr.mflags1 & M1_UNSOLID) !== 0; }
function is_clinger(ptr) { return (ptr.mflags1 & M1_CLING) !== 0; }
function is_whirly(ptr) {
    return ptr.mlet === S_VORTEX || ptr === mons[PM_AIR_ELEMENTAL];
}
function webmaker(ptr) {
    return ptr === mons[PM_CAVE_SPIDER] || ptr === mons[PM_GIANT_SPIDER];
}

// C ref: trap.c m_harmless_trap()
/* is trap ttmp harmless to monster mtmp? */
export function m_harmless_trap(mtmp, ttmp) {
    const mdat = mtmp.data;
    const Sokoban = game.level.flags.sokoban_rules;

    /* this handles most of the traps, but those are still included
       in the switch case below for completeness */
    if (!Sokoban && floor_trigger(ttmp.ttyp) && check_in_air(mtmp, 0))
        return true;

    switch (ttmp.ttyp) {
    case ARROW_TRAP:
        break;
    case DART_TRAP:
        break;
    case ROCKTRAP:
        break;
    case SQKY_BOARD:
        break;
    case BEAR_TRAP:
        if (mdat.msize <= MZ_SMALL || amorphous(mdat)
            || is_whirly(mdat) || unsolid(mdat))
            return true;
        break;
    case LANDMINE:
        break;
    case ROLLING_BOULDER_TRAP:
        break;
    case SLP_GAS_TRAP:
        if (resists_sleep(mtmp) || defended(mtmp, AD_SLEE))
            return true;
        break;
    case RUST_TRAP:
        if (mdat !== mons[PM_IRON_GOLEM])
            return true;
        break;
    case FIRE_TRAP:
        if (resists_fire(mtmp) || defended(mtmp, AD_FIRE))
            return true;
        break;
    case PIT:
    case SPIKED_PIT:
    case HOLE:
    case TRAPDOOR:
        if (is_clinger(mdat) && !Sokoban)
            return true;
        break;
    case TELEP_TRAP:
        break;
    case LEVEL_TELEP:
        break;
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
        return true; /* usually */
    case ANTI_MAGIC:
        if (resists_magm(mtmp) || defended(mtmp, AD_MAGM))
            return true;
        break;
    case POLY_TRAP:
        break;
    case VIBRATING_SQUARE:
        return true;
    default:
        /* impossible("m_harmless_trap: unknown trap %i") */
        break;
    }

    return false;
}

// C ref: trap.c choose_trapnote()
function choose_trapnote(ttmp) {
    const tavail = new Array(12).fill(0), tpick = new Array(12).fill(0);
    let tcnt = 0;

    for (const t of ftraps())
        if (t.ttyp === SQKY_BOARD && t !== ttmp)
            tavail[t.tnote] = 1;
    /* now populate tpick[] with the available indices */
    for (let k = 0; k < 12; ++k)
        if (tavail[k] === 0)
            tpick[tcnt++] = k;
    /* choose an unused note; if all are in use, pick a random one */
    return (tcnt > 0) ? tpick[rn2(tcnt)] : rn2(12);
}

// C ref: trap.c dng_bottom()
function dng_bottom(lev) {
    let bottom = dunlevs_in_dungeon(lev);

    /* when in the upper half of the quest, don't fall past the
       middle "quest locate" level if hero hasn't been there yet */
    if (In_quest(lev)) {
        const qlocate_depth = game.dungeon_topology?.d_qlocate_level?.dlevel;
        /* dunlev_reached() is not ported; the quest isn't generated yet */
        if (qlocate_depth != null && dunlev(lev) < qlocate_depth)
            bottom = qlocate_depth; /* early cut-off */
    } else if (In_hell(lev)) {
        if (!game.u.uevent?.invoked)
            bottom -= 1;
    }
    return bottom;
}

// C ref: trap.c hole_destination()
function hole_destination(dst) {
    const bottom = dng_bottom(game.u.uz);

    dst.dnum = game.u.uz.dnum;
    dst.dlevel = dunlev(game.u.uz);
    while (dst.dlevel < bottom) {
        dst.dlevel++;
        if (rn2(4))
            break;
    }
}

// C ref: trap.c maketrap()
export function maketrap(x, y, typ) {
    let oldplace;
    let ttmp;
    const lev = game.level.at(x, y);

    if (typ === TRAPPED_DOOR || typ === TRAPPED_CHEST)
        return null;

    if ((ttmp = t_at(x, y)) !== null) {
        if (undestroyable_trap(ttmp.ttyp))
            return null;
        oldplace = true;
        /* u.utrap handling: the hero isn't on the level during mklev */
    } else if (!CAN_OVERWRITE_TERRAIN(lev.typ) /* stairs */
               || IS_POOL(lev.typ) || lev.typ === LAVAPOOL
               || (IS_FURNITURE(lev.typ) && (typ !== PIT && typ !== HOLE))
               || (lev.typ === DRAWBRIDGE_UP && typ === MAGIC_PORTAL)) {
        /* IS_AIR and single_level_branch(LEVEL_TELEP) cases: no air
           levels or one-level branches are generated by this port yet */
        return null;
    } else {
        oldplace = false;
        ttmp = { tx: x, ty: y };
    }
    /* [re-]initialize all fields except ntrap (handled below) and <tx,ty> */
    ttmp.launch = { x: -1, y: -1 }; /* force error if used before set */
    ttmp.dst = { dnum: -1, dlevel: -1 };
    ttmp.madeby_u = 0;
    ttmp.once = 0;
    ttmp.tseen = unhideable_trap(typ);
    ttmp.ttyp = typ;

    switch (typ) {
    case SQKY_BOARD:
        ttmp.tnote = choose_trapnote(ttmp);
        break;
    case STATUE_TRAP: /* create a "living" statue */
        mk_trap_statue(x, y);
        break;
    case ROLLING_BOULDER_TRAP: /* boulder will roll towards trigger */
        /* mkroll_launch(ttmp, x, y, BOULDER, 1L): not ported yet */
        break;
    case PIT:
    case SPIKED_PIT:
        ttmp.conjoined = 0;
        /* FALLTHRU */
    case HOLE:
    case TRAPDOOR:
        if (is_hole(typ))
            hole_destination(ttmp.dst);
        /* shop damage (in_rooms(x, y, SHOPBASE)): no shops filled yet */
        if (lev.typ === DRAWBRIDGE_UP) {
            /* drawbridges aren't generated by this port yet */
        } else if (IS_ROOM(lev.typ)) {
            /* set_levltyp(x, y, ROOM) */
            lev.typ = ROOM;
        } else if (lev.typ === STONE || lev.typ === SCORR) {
            lev.typ = CORR;
        } else if (IS_WALL(lev.typ) || lev.typ === SDOOR) {
            lev.typ = game.level.flags.is_maze_lev ? ROOM
                      : game.level.flags.is_cavernous_lev ? CORR
                        : DOOR;
        }
        lev.flags = 0;
        break;
    case TELEP_TRAP:
        /* gl.launchplace is only set by special-level loaders */
        break;
    }

    if (!oldplace) {
        /* C prepends to gf.ftrap */
        ftraps().unshift(ttmp);
    }
    return ttmp;
}
