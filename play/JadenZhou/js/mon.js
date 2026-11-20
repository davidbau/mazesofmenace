// mon.js — Monster movement allotment and per-turn monster upkeep.
// C ref: mon.c
//
// Ported so far: mcalcmove(), mcalcdistress(), movemon(), mfndpos(),
// monnear(), mon_allowflags().

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import {
    MSLOW, MFAST, NORMAL_SPEED, LOW_PM, I_SPECIAL, CONFLICT, INVIS,
    DISPLACED, COLNO, ROWNO, IS_OBSTRUCTED, IS_TREE, IS_WATERWALL, IS_DOOR,
    IS_STWALL, IRONBARS, LAVAWALL, W_NONDIGGABLE, D_CLOSED, D_LOCKED,
    D_BROKEN, isok,
    ALLOW_U, ALLOW_M, ALLOW_TM, ALLOW_ALL, ALLOW_MDISP, ALLOW_TRAPS,
    ALLOW_SANCT, ALLOW_SSM, ALLOW_ROCK, ALLOW_WALL, ALLOW_DIG, ALLOW_BARS,
    NOTONL, OPENDOOR, UNLOCKDOOR, BUSTDOOR, NOGARLIC,
    M_AP_MONSTER, MON_DETACH, W_AMUL, NON_PM, NATTK, Is_rogue_level,
    G_GENOD,
} from './const.js';
import { dist2 } from './hacklib.js';
import { vision_recalc, cansee } from './vision.js';
import { newsym, pline } from './display.js';
import { m_at, sobj_at, is_pool, is_lava, may_passwall, accessible,
         nonliving, is_golem, is_mplayer } from './makemon.js';
import { set_mon_data } from './mondata.js';
import { Monnam } from './mhitm.js';
import {
    MS_NEMESIS, AT_BOOM, G_FREQ, AD_RBRE, AD_DCAY, AD_DGST, AD_FIRE,
    PM_LIZARD, PM_VLAD_THE_IMPALER, PM_WEREJACKAL, PM_HUMAN_WEREJACKAL,
    PM_WEREWOLF, PM_HUMAN_WEREWOLF, PM_WERERAT, PM_HUMAN_WERERAT,
    PM_PAPER_GOLEM, PM_STRAW_GOLEM, PM_IRON_GOLEM, PM_WOOD_GOLEM,
    PM_LEATHER_GOLEM, PM_STEAM_VORTEX, S_KOP,
} from './monsters.js';
import { t_at, TRAPNUM, fixed_tele_trap, m_harmless_trap } from './trap.js';
import { hastrack } from './track.js';
import { mon_knows_traps } from './mondata.js';
import { monsndx, is_flyer, is_floater, is_swimmer, passes_walls,
         perceives, is_were, is_human, is_undead, is_vampshifter,
         dmgtype } from './mondata.js';
import {
    mons, S_EEL, S_UNICORN, S_GHOST, S_VORTEX, S_ZOMBIE, S_LICH,
    M1_NOHANDS, M1_TUNNEL, M1_NEEDPICK, M1_AMORPHOUS, M1_UNSOLID,
    M1_SLITHY, M1_HIDE, M1_METALLIVORE, M2_GIANT, M2_ROCKTHROW, M2_MINION,
    M2_JEWELS, M3_DISPLACES, MZ_SMALL, MZ_LARGE, MS_LEADER, AD_RUST, AD_CORR,
    PM_GRID_BUG, PM_DEATH, PM_FAMINE, PM_PESTILENCE, PM_MINOTAUR,
    PM_FIRE_ELEMENTAL, PM_SALAMANDER, PM_FLOATING_EYE, PM_PURPLE_WORM,
    PM_BABY_PURPLE_WORM, PM_SHRIEKER, PM_GHOUL, PM_SKELETON,
    PM_AIR_ELEMENTAL, M1_ANIMAL, M1_MINDLESS, S_MUMMY,
} from './monsters.js';
import { BOULDER, CLOVE_OF_GARLIC, CREDIT_CARD, SKELETON_KEY,
         LOCK_PICK, EGG } from './objects.js';
import { dead_species } from './mkobj.js';
import { kill_egg } from './timeout.js';
import { dochugw, onscary, mon_regen, m_everyturn_effect } from './monmove.js';

/* monster inventory: makemon.js keeps mon->minvent as an array in pickup
   order; C prepends, so walk it newest first */
function minv(mon) { return (mon.minvent || []).slice().reverse(); }

// C ref: mon.c mcalcmove()
export function mcalcmove(mon,
                          m_moving) /* True: adjust for moving;
                                     * False: just adjust for speed */
{
    const u = game.u;
    let mmove = mon.data.mmove;
    let mmove_adj;

    /* Note: MSLOW's `+ 1' prevents slowed speed 1 getting reduced to 0;
     *       MFAST's `+ 2' prevents hasted speed 1 from becoming a no-op;
     *       both adjustments have negligible effect on higher speeds.
     */
    if (mon.mspeed === MSLOW) {
        /* slow-monster effects work better against faster monsters: they
           lose 1/3 of their speed below 12 but 2/3 of their speed above */
        if (mmove < NORMAL_SPEED)
            mmove = Math.trunc((2 * mmove + 1) / 3);
        else
            mmove = 4 + Math.trunc(mmove / 3);
    } else if (mon.mspeed === MFAST)
        mmove = Math.trunc((4 * mmove + 2) / 3);

    if (mon === u.usteed && u.ugallop && game.context.mv) {
        /* increase movement by a factor of 1.5; also increase variance of
           movement speed (if it's naturally 24, we don't want it to always
           become 36) */
        mmove = Math.trunc(((rn2(2) ? 4 : 5) * mmove) / 3);
    }

    if (m_moving) {
        /* Randomly round the monster's speed to a multiple of NORMAL_SPEED.
           This makes it impossible for the player to predict when they'll
           get a free turn (thus preventing exploits like "melee kiting"),
           while retaining guarantees about shopkeepers not being outsped
           by a normal-speed player, normal-speed players being unable
           to open up a gap when fleeing a normal-speed monster, etc. */
        mmove_adj = mmove % NORMAL_SPEED;
        mmove -= mmove_adj;
        if (rn2(NORMAL_SPEED) < mmove_adj)
            mmove += NORMAL_SPEED;
    }
    return mmove;
}

// ── C ref: mon.c mcalcdistress() / m_calcdistress() ──
export function mcalcdistress() {
    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        if (DEADMONSTER(mtmp)) continue; /* iter_mons() */
        m_calcdistress(mtmp);
    }
}

function m_calcdistress(mtmp) {
    /* must check non-moving monsters once/turn in case they managed
       to end up in water or lava; note: when not in liquid they regen,
       shape-shift, timeout temporary maladies just like other monsters */
    if (mtmp.data.mmove === 0) {
        if (game.vision_full_recalc)
            vision_recalc(0);
        if (minliquid(mtmp))
            return;
    }

    /* regenerate hit points */
    mon_regen(mtmp, false);

    /* possibly polymorph shapechangers and lycanthropes */
    if (mtmp.cham !== undefined && mtmp.cham >= LOW_PM) /* ismnum() */
        throw new Error('m_calcdistress(): decide_to_shapeshift() not ported yet');
    if (is_were(mtmp.data))
        throw new Error('m_calcdistress(): were_change() not ported yet');

    /* gradually time out temporary problems */
    if (mtmp.mblinded && !--mtmp.mblinded)
        mtmp.mcansee = 1;
    if (mtmp.mfrozen && !--mtmp.mfrozen)
        mtmp.mcanmove = 1;
    if (mtmp.mfleetim && !--mtmp.mfleetim)
        mtmp.mflee = 0;

    /* FIXME: mtmp->mlstmv ought to be updated here */
}

/* C ref: monst.h DEADMONSTER() */
function DEADMONSTER(mon) { return mon.mhp < 1; }

// C ref: mon.c mongone() -- the parts reached so far (level creation):
// unstuck(), mdrop_special_objs() and the vault guard case are not ported.
/* remove a monster from the game without leaving a corpse */
export function mongone(mdef) {
    mdef.mhp = 0; /* can skip some inventory bookkeeping */

    if (mdef.isgd)
        throw new Error('mongone: vault guards are not ported yet');
    /* release rest of monster's inventory--it is removed from game */
    /* discard_minvent(mdef, FALSE): obfree() each; nothing to free in JS */
    for (const o of mdef.minvent || [])
        o.where = 'OBJ_DELETED';
    mdef.minvent = null;
    m_detach(mdef, mdef.data, false);
}

// C ref: mon.c mon_leaving_level() -- the parts reached so far
function mon_leaving_level(mon) {
    const mx = mon.mx, my = mon.my;
    const lst = game.level.monsters || [];
    const i = lst.indexOf(mon);
    const onmap = (isok(mx, my) && i >= 0);

    /* to prevent an infinite relobj-flooreffects-hmon-killed loop */
    mon.mtrapped = 0;
    /* unstuck(mon) */
    if (game.u.ustuck === mon)
        throw new Error('mon_leaving_level(): unstuck() not ported yet');

    if (onmap) {
        if (mon.wormno)
            throw new Error('mon_leaving_level(): remove_worm() not ported yet');
        /* remove_monster(mx, my) */
        lst.splice(i, 1);
    }
    if (onmap) {
        mon.mundetected = 0; /* for migration; doesn't matter for death */
        if (mon.m_ap_type && mon.m_ap_type !== M_AP_MONSTER)
            throw new Error('mon_leaving_level(): seemimic() not ported yet');
        /* fill_pit(mx, my): boulders dropping into pits not ported */
        newsym(mx, my);
    }
}

// C ref: steal.c relobj() -- only an empty inventory is ported
function relobj(mtmp, show, is_pet) {
    const omx = mtmp.mx, omy = mtmp.my;

    void is_pet;
    if (mtmp.isgd)
        throw new Error('relobj(): vault guard gold not ported yet');
    if (mtmp.minvent && mtmp.minvent.length)
        throw new Error('relobj(): mdrop_obj() not ported yet');

    if (show && cansee(omx, omy))
        newsym(omx, omy);
}

// C ref: mon.c m_detach()
function m_detach(mtmp, mptr, due_to_death) {
    if (mtmp.mleashed)
        throw new Error('m_detach(): m_unleash() not ported yet');

    /* if (mx > 0 && emits_light(mptr)) del_light_source(): monster light
       sources are never created (makemon.js), so there is none to delete */
    void mptr;

    mon_leaving_level(mtmp);

    mtmp.mhp = 0; /* simplify some tests: force mhp to 0 */
    if (mtmp.iswiz)
        throw new Error('m_detach(): wizdeadorgone() not ported yet');
    if (due_to_death) {
        if (mtmp.data.msound === MS_NEMESIS)
            throw new Error('m_detach(): nemdead() not ported yet');
        if (mtmp.data.msound === MS_LEADER)
            throw new Error('m_detach(): leaddead() not ported yet');
        /* release (drop onto map) all objects carried by mtmp */
        relobj(mtmp, 1, false); /* drop mtmp->minvent, issue newsym(mx,my) */
    }

    if (game.stealmid && mtmp.m_id === game.stealmid)
        throw new Error('m_detach(): thiefdead() not ported yet');
    if (mtmp.isshk)
        throw new Error('m_detach(): shkgone() not ported yet');
    if (mtmp.wormno)
        throw new Error('m_detach(): wormgone() not ported yet');
    /* In_endgame(&u.uz): MON_ENDGAME_FREE -- the endgame isn't reached */

    mtmp.mstate = (mtmp.mstate || 0) | MON_DETACH;
    game.purge_monsters = (game.purge_monsters || 0) + 1;

    if (mtmp === game.u.usteed)
        throw new Error('m_detach(): dismount_steed() not ported yet');
}

// C ref: mon.c mlifesaver()
/* find the worn amulet of life saving which will save a monster */
function mlifesaver(mon) {
    if (!nonliving(mon.data) || is_vampshifter(mon)) {
        if (mon.misc_worn_check & W_AMUL)
            throw new Error('mlifesaver(): which_armor() not ported yet');
    }
    return null;
}

// C ref: mon.c lifesaved_monster()
function lifesaved_monster(mtmp) {
    const lifesave = mlifesaver(mtmp);

    if (lifesave)
        throw new Error('lifesaved_monster(): life saving not ported yet');
}

// C ref: mon.c mondead()
export async function mondead(mtmp) {
    /* potential pet message; always clear global flag */
    const be_sad = !!game.sad_feeling;
    game.sad_feeling = false;

    mtmp.mhp = 0; /* in case caller hasn't done this */
    lifesaved_monster(mtmp);
    if (!DEADMONSTER(mtmp))
        return;

    /* vampire in bat/fog/wolf form reverts to vampire instead of dying */
    if (is_vampshifter(mtmp))
        throw new Error('mondead(): vamprises() not ported yet');

    if (be_sad)
        await pline('You have a sad feeling for a moment, then it passes.');

    if (mtmp.data === mons[PM_STEAM_VORTEX])
        throw new Error('mondead(): create_gas_cloud() not ported yet');

    if (mtmp.isgd)
        throw new Error('mondead(): grddead() not ported yet');

    const mptr = mtmp.data; /* save this for m_detach() */
    /* restore chameleon, lycanthropes to true form at death */
    if (mtmp.cham >= LOW_PM) { /* ismnum(mtmp->cham) */
        set_mon_data(mtmp, mons[mtmp.cham]);
        mtmp.cham = NON_PM;
    } else if (mtmp.data === mons[PM_WEREJACKAL])
        set_mon_data(mtmp, mons[PM_HUMAN_WEREJACKAL]);
    else if (mtmp.data === mons[PM_WEREWOLF])
        set_mon_data(mtmp, mons[PM_HUMAN_WEREWOLF]);
    else if (mtmp.data === mons[PM_WERERAT])
        set_mon_data(mtmp, mons[PM_HUMAN_WERERAT]);

    const mndx = monsndx(mtmp.data);
    if (game.mvitals[mndx].died < 255)
        game.mvitals[mndx].died++;

    /* if it's a (possibly polymorphed) quest leader, mark him as dead */
    if (game.quest_status?.leader_m_id
        && mtmp.m_id === game.quest_status.leader_m_id)
        game.quest_status.leader_is_dead = true;
    /* MAIL_STRUCTURES: no mail daemon in this build */

    if (mtmp.data.mlet === S_KOP)
        throw new Error('mondead(): dead Kops returning not ported yet');

    /* logdeadmon(mtmp, mndx): achievements/livelog have no game effect here */

    /* if (glyph_is_invisible(levl[mx][my].glyph)) unmap_object(): the
       remembered-invisible glyph is not ported */

    /* remove 'mtmp' from play; it will stay on the fmon list until end of
       current move, then dmonsfree() will get rid of it */
    m_detach(mtmp, mptr, true);
}

// C ref: mon.c corpse_chance()
/* TRUE if corpse might be dropped, magr may die if mon was swallowed */
export function corpse_chance(mon, magr, was_swallowed) {
    const mdat = mon.data;

    if (!magr && game.mswallower)
        throw new Error('corpse_chance(): engulfer explosions not ported yet');

    if (mdat === mons[PM_VLAD_THE_IMPALER] || mdat.mlet === S_LICH)
        throw new Error('corpse_chance(): body crumbles into dust not ported yet');

    /* Gas spores always explode upon death */
    for (let i = 0; i < NATTK; i++) {
        if (mdat.mattk[i].aatyp === AT_BOOM)
            throw new Error('corpse_chance(): mon_explodes() not ported yet');
    }
    void was_swallowed;

    /* must duplicate this below check in xkilled() since it results in
     * creating no objects as well as no corpse
     */
    /* LEVEL_SPECIFIC_NOCORPSE(mdat) */
    if (Is_rogue_level(game.u.uz)
        || !game.level.flags.deathdrops
        || (game.level.flags.graveyard && is_undead(mdat) && rn2(3)))
        return false;

    if (((bigmonst(mdat) || mdat === mons[PM_LIZARD]) && !mon.mcloned)
        || is_golem(mdat) || is_mplayer(mdat) || is_rider(mdat) || mon.isshk)
        return true;
    const tmp = 2 + ((mdat.geno & G_FREQ) < 2 ? 1 : 0) + (verysmall(mdat) ? 1 : 0);
    return !rn2(tmp);
}

// C ref: mon.c mondied()
/* drop (perhaps) a cadaver and remove monster */
export async function mondied(mdef) {
    await mondead(mdef);
    if (!DEADMONSTER(mdef))
        return; /* lifesaved */

    /* this assumes that the dead monster's map coordinates remain accurate */
    if (corpse_chance(mdef, null, false)
        && (accessible(mdef.mx, mdef.my) || is_pool(mdef.mx, mdef.my)))
        throw new Error('mondied(): make_corpse() not ported yet');
}

// C ref: mon.c monkilled()
/* monster mdef was killed by something other than the hero */
export async function monkilled(mdef, fltxt, how) {
    const mptr = mdef.data;

    /* C tests the pointer: "" is non-null and still gives the message */
    if (fltxt != null && (mdef.wormno ? worm_known(mdef)
                              : cansee(mdef.mx, mdef.my)))
        await pline(`${Monnam(mdef)} is ${nonliving(mptr) ? 'destroyed' : 'killed'}`
                    + `${fltxt ? ' by the ' : ''}${fltxt}!`);
    else
        /* sad feeling is deferred until after potential life-saving */
        game.sad_feeling = mdef.mtame ? true : false;

    /* no corpse if digested or disintegrated or flammable golem burnt up */
    game.disintegested = (how === AD_DGST || how === -AD_RBRE
                          || (how === AD_FIRE && completelyburns(mptr)));
    if (game.disintegested)
        await mondead(mdef); /* never leaves a corpse */
    else
        await mondied(mdef); /* calls mondead() and maybe leaves a corpse */

    if (!DEADMONSTER(mdef))
        return; /* life-saved */
    /* extra message if pet golem is completely destroyed */
    if (mdef.mtame) {
        const rxt = (how === AD_FIRE && completelyburns(mptr)) ? 'roast'
                    : (how === AD_RUST && completelyrusts(mptr)) ? 'rust'
                      : (how === AD_DCAY && completelyrots(mptr)) ? 'rot'
                        : null;
        if (rxt)
            throw new Error('monkilled(): noit_mon_nam() not ported yet');
    }
}
/* C ref: mondata.h completelyburns(), completelyrusts(), completelyrots() */
function completelyburns(ptr) {
    return ptr === mons[PM_PAPER_GOLEM] || ptr === mons[PM_STRAW_GOLEM];
}
function completelyrusts(ptr) { return ptr === mons[PM_IRON_GOLEM]; }
function completelyrots(ptr) {
    return ptr === mons[PM_WOOD_GOLEM] || ptr === mons[PM_LEATHER_GOLEM];
}
// C ref: worm.c worm_known()
function worm_known(worm) {
    void worm;
    throw new Error('worm_known() not ported yet');
}

// C ref: mon.c minliquid() -- monsters in pools or lava aren't ported yet
function minliquid(mtmp) {
    if (is_pool(mtmp.mx, mtmp.my) || is_lava(mtmp.mx, mtmp.my))
        throw new Error('minliquid() not ported yet');
    return 0;
}

function Conflict() {
    const p = game.u.uprops[CONFLICT];
    return !!(p.intrinsic || p.extrinsic);
}

// ── C ref: mon.c movemon_singlemon() ──
// perform movement for a single monster
async function movemon_singlemon(mtmp) {
    const u = game.u;
    /* end monster movement early if hero is flagged to leave the level */
    if (u.utotype) {
        game.somebody_can_move = false;
        return true;
    }

    /* one dead monster needs to perform a move after death: vault guard */
    if (mtmp.isgd && !mtmp.mx)
        throw new Error('movemon_singlemon(): gd_move() not ported yet');
    if (DEADMONSTER(mtmp))
        return false;

    /* monster isn't on this map anymore: migration isn't ported yet */

    m_everyturn_effect(mtmp);

    /* Find a monster that we have not treated yet. */
    if (mtmp.movement < NORMAL_SPEED)
        return false;

    mtmp.movement -= NORMAL_SPEED;
    if (mtmp.movement >= NORMAL_SPEED)
        game.somebody_can_move = true;

    if (game.vision_full_recalc)
        vision_recalc(0); /* vision! */

    /* reset obj bypasses before next monster moves: clear_bypasses() and
       clear_splitobjs() -- object bypass bits aren't ported yet */
    if (minliquid(mtmp))
        return false;

    /* after losing equipment, try to put on replacement */
    if ((mtmp.misc_worn_check ?? 0) & I_SPECIAL) {
        /* hostiles only try to equip things if they think hero isn't
         * nearby; if they think hero is nearby, leave the flag intact so
         * that it can be checked again on subsequent moves until the hero
         * is perceived to be farther away. */
        if (mtmp.mpeaceful || mtmp.mtame
            || dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy) > (3 * 3)) {
            mtmp.misc_worn_check &= ~I_SPECIAL;
            const oldworn = mtmp.misc_worn_check;
            m_dowear(mtmp, false);
            if (mtmp.misc_worn_check !== oldworn || !mtmp.mcanmove)
                return false; /* is spending this turn equipping */
        }
    }

    if ((mtmp.data.mflags1 & M1_HIDE) !== 0) { /* is_hider() */
        throw new Error('movemon_singlemon(): restrap() not ported yet');
    } else if (mtmp.data.mlet === S_EEL && !mtmp.mundetected) {
        throw new Error('movemon_singlemon(): eel hideunder() not ported yet');
    }

    /* continue if the monster died fighting */
    if (Conflict() && !mtmp.iswiz)
        throw new Error('movemon_singlemon(): fightm() not ported yet');
    await dochugw(mtmp, true); /* otherwise just move the monster */
    return false;
}

// ── C ref: mon.c movemon() ──
// perform movement for all monsters
export async function movemon() {
    game.somebody_can_move = false;

    /* iter_mons_safe(movemon_singlemon) */
    const all = [];
    for (let m = game.fmon; m; m = m.nmon) all.push(m);
    for (const m of all) {
        if (await movemon_singlemon(m))
            break;
    }

    /* if (any_light_source()) vision_full_recalc = 1: light sources
       aren't ported yet */
    /* clear_bypasses(), clear_splitobjs(): not ported yet */
    /* remove dead monsters */
    dmonsfree();

    /* a monster may have levteleported player -dlc */
    if (game.u.utotype)
        throw new Error('movemon(): deferred_goto() not ported yet');

    return game.somebody_can_move;
}

// ── C ref: mon.c dmonsfree() ──
// really free dead monsters
function dmonsfree() {
    let prev = null;
    for (let m = game.fmon; m; m = m.nmon) {
        if (DEADMONSTER(m) && !m.isgd) {
            if (prev) prev.nmon = m.nmon; else game.fmon = m.nmon;
        } else prev = m;
    }
}

// ── C ref: mon.c monnear() ──
// Is the square close enough for the monster to move or attack into?
export function monnear(mon, x, y) {
    const distance = dist2(mon.mx, mon.my, x, y);

    if (distance === 2 && NODIAG(monsndx(mon.data)))
        return false;
    return (distance < 3);
}
/* C ref: mondata.h NODIAG() */
function NODIAG(monnum) { return monnum === PM_GRID_BUG; }

/* mondata.h */
function verysmall(ptr) { return ptr.msize < MZ_SMALL; }

// C ref: worn.c m_dowear() -- only the early returns are ported
function m_dowear(mon, creation) {
    /* Note the restrictions here are the same as in dowear in do_wear.c
     * except for the additional restriction on intelligence. */
    if (verysmall(mon.data) || (mon.data.mflags1 & M1_NOHANDS) !== 0
        || (mon.data.mflags1 & M1_ANIMAL) !== 0)
        return;
    /* give mummies a chance to wear their wrappings
     * and let skeletons wear their initial armor */
    if ((mon.data.mflags1 & M1_MINDLESS) !== 0
        && (!creation || (mon.data.mlet !== S_MUMMY
                          && mon.data !== mons[PM_SKELETON])))
        return;
    throw new Error('m_dowear(): m_dowear_type() not ported yet');
}
function bigmonst(ptr) { return ptr.msize >= MZ_LARGE; }
function slithy(ptr) { return (ptr.mflags1 & M1_SLITHY) !== 0; }
function amorphous(ptr) { return (ptr.mflags1 & M1_AMORPHOUS) !== 0; }
function tunnels(ptr) { return (ptr.mflags1 & M1_TUNNEL) !== 0; }
function needspick(ptr) { return (ptr.mflags1 & M1_NEEDPICK) !== 0; }
function is_whirly(ptr) {
    return ptr.mlet === S_VORTEX || ptr === mons[PM_AIR_ELEMENTAL];
}
function is_rider(ptr) {
    const n = monsndx(ptr);
    return n === PM_DEATH || n === PM_FAMINE || n === PM_PESTILENCE;
}

/* C ref: monmove.c m_can_break_boulder() */
function m_can_break_boulder(mtmp) {
    return (is_rider(mtmp.data)
            || (!mtmp.mspec_used
                && (mtmp.isshk || mtmp.ispriest
                    || (mtmp.data.msound === MS_LEADER))));
}
/* C ref: mthrowu.c m_carrying() */
function m_carrying(mtmp, type) {
    for (const otmp of minv(mtmp))
        if (otmp.otyp === type) return otmp;
    return null;
}
/* C ref: monmove.c monhaskey() */
function monhaskey(mon, for_unlocking) {
    if (for_unlocking && m_carrying(mon, CREDIT_CARD))
        return true;
    return !!(m_carrying(mon, SKELETON_KEY) || m_carrying(mon, LOCK_PICK));
}
/* C ref: mondata.c passes_bars() */
function passes_bars(mptr) {
    return (passes_walls(mptr) || amorphous(mptr)
            || (mptr.mflags1 & M1_UNSOLID) !== 0
            || is_whirly(mptr) || verysmall(mptr)
            /* rust monsters and some puddings can destroy bars */
            || dmgtype(mptr, AD_RUST) || dmgtype(mptr, AD_CORR)
            /* rock moles can eat bars */
            || (mptr.mflags1 & M1_METALLIVORE) !== 0
            || (slithy(mptr) && !bigmonst(mptr)));
}

// ── C ref: mon.c mon_allowflags() ──
// return flags based on monster data, for mfndpos()
export function mon_allowflags(mtmp) {
    const u = game.u;
    const ptr = mtmp.data;
    let allowflags = 0;
    const can_open = !((ptr.mflags1 & M1_NOHANDS) !== 0 || verysmall(ptr));
    const can_unlock = ((can_open && monhaskey(mtmp, true))
                        || mtmp.iswiz || is_rider(ptr));
    const doorbuster = (ptr.mflags2 & M2_GIANT) !== 0;
    /* don't tunnel if on rogue level or if hostile and close enough
       to prefer a weapon; same criteria as in m_move() */
    let can_tunnel = tunnels(ptr); /* && !Is_rogue_level(&u.uz) */

    if (can_tunnel && needspick(ptr)
        && ((!mtmp.mpeaceful || Conflict())
            && dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy) <= 8))
        can_tunnel = false;

    if (mtmp.mtame)
        allowflags |= ALLOW_M | ALLOW_TRAPS | ALLOW_SANCT | ALLOW_SSM;
    else if (mtmp.mpeaceful)
        allowflags |= ALLOW_SANCT | ALLOW_SSM;
    else
        allowflags |= ALLOW_U;
    if (Conflict())
        throw new Error('mon_allowflags(): resist_conflict() not ported yet');
    if (mtmp.isshk)
        allowflags |= ALLOW_SSM;
    if (mtmp.ispriest)
        allowflags |= ALLOW_SSM | ALLOW_SANCT;
    if (passes_walls(ptr))
        allowflags |= (ALLOW_ROCK | ALLOW_WALL);
    if ((ptr.mflags2 & M2_ROCKTHROW) || m_can_break_boulder(mtmp))
        allowflags |= ALLOW_ROCK;
    if (can_tunnel)
        allowflags |= ALLOW_DIG;
    if (doorbuster)
        allowflags |= BUSTDOOR;
    if (can_open)
        allowflags |= OPENDOOR;
    if (can_unlock)
        allowflags |= UNLOCKDOOR;
    if (passes_bars(ptr)
        /* restrict engulfer or holder who might try to pass iron bars while
           carrying hero; accept small subset for poly'd hero passes_bars() */
        && (mtmp !== u.ustuck))
        allowflags |= ALLOW_BARS;
    if ((ptr.mflags2 & M2_MINION) || is_rider(ptr))
        allowflags |= ALLOW_SANCT;
    /* unicorn may not be able to avoid hero on a noteleport level */
    if (ptr.mlet === S_UNICORN && (ptr.mflags2 & M2_JEWELS) /* is_unicorn */
        && !game.level.flags?.noteleport)
        allowflags |= NOTONL;
    if (is_human(ptr) || ptr === mons[PM_MINOTAUR])
        allowflags |= ALLOW_SSM;
    if ((is_undead(ptr) && ptr.mlet !== S_GHOST) || is_vampshifter(mtmp))
        allowflags |= NOGARLIC;

    return allowflags;
}

/* C ref: obj.h OBJ_AT() -- floor objects live in game.level.objects */
function OBJ_AT(x, y) {
    for (const o of game.level.objects || [])
        if (o.ox === x && o.oy === y) return true;
    return false;
}

/* C ref: hacklib.c online2() */
function online2(x0, y0, x1, y1) {
    const dx = x0 - x1, dy = y0 - y1;
    /*  If either delta is zero then they're on an orthogonal line,
     *  else if the deltas are equal (signs ignored) they're on a diagonal.
     */
    return (!dy || !dx || dy === dx || dy === -dx);
}
/* C ref: mon.c monlineu() */
function monlineu(mon, nx, ny) {
    return online2(nx, ny, mon.mux, mon.muy);
}

/* C ref: hack.c may_dig() */
function may_dig(x, y) {
    const lev = game.level.at(x, y);
    return !((IS_STWALL(lev.typ) || IS_TREE(lev.typ))
             && ((lev.wall_info ?? 0) & W_NONDIGGABLE));
}
/* C ref: hack.c bad_rock() */
function bad_rock(mdat, x, y) {
    return (/* (Sokoban && sobj_at(BOULDER, x, y)) || */
            (IS_OBSTRUCTED(game.level.at(x, y).typ)
             && (!tunnels(mdat) || needspick(mdat) || !may_dig(x, y))
             && !(passes_walls(mdat) && may_passwall(x, y))));
}
/* C ref: hack.c cant_squeeze_thru() */
function cant_squeeze_thru(mon) {
    const ptr = mon.data;

    if (passes_walls(ptr))
        return 0;

    /* too big? */
    if (bigmonst(ptr)
        && !(amorphous(ptr) || is_whirly(ptr) || ptr.mlet === S_GHOST
             || slithy(ptr) /* || can_fog(mon) */))
        return 1;

    /* lugging too much junk? curr_mon_load() */
    if (minv(mon).length)
        throw new Error('cant_squeeze_thru(): curr_mon_load() not ported yet');

    /* can squeeze through */
    return 0;
}

/* C ref: mon.c zombie_maker() */
export function zombie_maker(mon) {
    const pm = mon.data;
    if (mon.mcan) return false;
    switch (pm.mlet) {
    case S_ZOMBIE:
        /* Z-class monsters that aren't actually zombies go here */
        if (pm === mons[PM_GHOUL] || pm === mons[PM_SKELETON])
            return false;
        return true;
    case S_LICH:
        /* all liches will create zombies as well */
        return true;
    }
    return false;
}
/* C ref: mon.c mm_2way_aggression() */
function mm_2way_aggression(magr, mdef) {
    /* On_W_tower_level(): the Wizard's tower isn't ported yet */
    /* liches/zombies vs things that can be zombified */
    if (zombie_maker(magr))
        throw new Error('mm_2way_aggression(): zombie_form() not ported yet');
    return 0;
}
/* C ref: mon.c mm_aggression() */
function mm_aggression(magr, mdef) {
    const mndx = monsndx(magr.data);

    /* don't allow pets to fight each other */
    if (magr.mtame && mdef.mtame)
        return 0;

    /* supposedly purple worms are attracted to shrieking because they
       like to eat shriekers, so attack the latter when feasible */
    if ((mndx === PM_PURPLE_WORM || mndx === PM_BABY_PURPLE_WORM)
        && mdef.data === mons[PM_SHRIEKER])
        return ALLOW_M | ALLOW_TM;
    return (mm_2way_aggression(magr, mdef) | mm_2way_aggression(mdef, magr));
}
/* C ref: mon.c mm_displacement() */
function mm_displacement(magr, mdef) {
    const pa = magr.data, pd = mdef.data;
    const is_displacer = p => (p.mflags3 & M3_DISPLACES) !== 0;

    if (is_displacer(pa) && (!is_displacer(pd) || magr.m_lev > mdef.m_lev)
        /* no displacing grid bugs diagonally */
        && !(magr.mx !== mdef.mx && magr.my !== mdef.my
             && NODIAG(monsndx(pd)))
        /* no displacing trapped monsters or multi-location longworms
           (long worms aren't ported yet) */
        && !mdef.mtrapped && !mdef.wormno
        /* riders can move anything; others, same size or smaller only */
        && (is_rider(pa) || pa.msize >= pd.msize))
        return ALLOW_MDISP;
    return 0;
}

// ── C ref: mon.c mfndpos() ──
// return number of acceptable neighbour positions
export function mfndpos(mon, data, flag) {
    const u = game.u;
    const lev = game.level;
    const mdat = mon.data;
    let cnt = 0;
    const rockok = false, treeok = false;

    const x = mon.mx;
    const y = mon.my;
    const nowtyp = lev.at(x, y).typ;

    data.cnt = 0; data.poss = []; data.info = [];

    const nodiag = NODIAG(monsndx(mdat));
    let wantpool = (mdat.mlet === S_EEL);
    /* m_in_air(): clinging hiders aren't ported yet */
    const in_air = is_flyer(mdat) || is_floater(mdat);
    const poolok = ((/* !Is_waterlevel(&u.uz) && */ in_air)
                    || (is_swimmer(mdat) && !wantpool));
    let lavaok = (in_air || mdat === mons[PM_FIRE_ELEMENTAL]
                  || mdat === mons[PM_SALAMANDER]); /* likes_lava() */
    if (mdat === mons[PM_FLOATING_EYE]) /* prefers to avoid heat */
        lavaok = false;
    const thrudoor = ((flag & (ALLOW_WALL | BUSTDOOR)) !== 0);
    /* poison gas regions aren't ported yet (none exist) */

    if (flag & ALLOW_DIG)
        throw new Error('mfndpos(): ALLOW_DIG not ported yet');

    for (;;) { /* nexttry: eels prefer the water, but if there is no water
                  nearby, they will crawl over land */
        if (mon.mconf) {
            flag |= ALLOW_ALL;
            flag &= ~NOTONL;
        }
        if (!mon.mcansee)
            flag |= ALLOW_SSM;
        const maxx = Math.min(x + 1, COLNO - 1);
        const maxy = Math.min(y + 1, ROWNO - 1);
        for (let nx = Math.max(1, x - 1); nx <= maxx; nx++)
            for (let ny = Math.max(0, y - 1); ny <= maxy; ny++) {
                if (nx === x && ny === y)
                    continue;
                const nloc = lev.at(nx, ny);
                const ntyp = nloc.typ;
                if (IS_OBSTRUCTED(ntyp)
                    && !((flag & ALLOW_WALL) && may_passwall(nx, ny))
                    && !((IS_TREE(ntyp) ? treeok : rockok) && may_dig(nx, ny)))
                    continue;
                /* intelligent peacefuls avoid digging shop/temple walls:
                   only reachable with rockok (ALLOW_DIG, above) */
                if (IS_WATERWALL(ntyp) && !is_swimmer(mdat))
                    continue;
                /* KMH -- Added iron bars */
                if (ntyp === IRONBARS
                    && (!(flag & ALLOW_BARS)
                        || (((nloc.wall_info ?? 0) & W_NONDIGGABLE)
                            && (dmgtype(mdat, AD_RUST)
                                || dmgtype(mdat, AD_CORR)))))
                    continue;
                if (IS_DOOR(ntyp)
                    /* an amorphous creature can only move under/through a
                       closed door if it doesn't currently have hero
                       engulfed (can_fog(): vampshifters aren't ported) */
                    && !(amorphous(mdat) && !(u.uswallow && u.ustuck === mon))
                    && ((((nloc.doormask ?? 0) & D_CLOSED) && !(flag & OPENDOOR))
                        || (((nloc.doormask ?? 0) & D_LOCKED)
                            && !(flag & UNLOCKDOOR))) && !thrudoor)
                    continue;
                /* first diagonal checks (tight squeezes handled below) */
                if (nx !== x && ny !== y
                    && (nodiag
                        || (IS_DOOR(nowtyp) && ((lev.at(x, y).doormask ?? 0) & ~D_BROKEN))
                        || (IS_DOOR(ntyp) && ((nloc.doormask ?? 0) & ~D_BROKEN))
                        /* Is_rogue_level() and long worm segment crossing:
                           not ported yet */
                        ))
                    continue;
                if ((!lavaok || !(flag & ALLOW_WALL)) && ntyp === LAVAWALL)
                    continue;
                if ((poolok || is_pool(nx, ny) === wantpool)
                    && (lavaok || !is_lava(nx, ny))) {
                    let dispx, dispy;
                    const Invis = (u.uprops[INVIS].intrinsic
                                   || u.uprops[INVIS].extrinsic)
                                  && !u.uprops[INVIS].blocked;
                    const Displaced = (u.uprops[DISPLACED].intrinsic
                                       || u.uprops[DISPLACED].extrinsic)
                                      && !u.uprops[DISPLACED].blocked;
                    const monseeu = (mon.mcansee
                                     && (!Invis || perceives(mdat)));
                    const checkobj = OBJ_AT(nx, ny);

                    /* Displacement also displaces the Elbereth/scare monster,
                     * as long as you are visible.
                     */
                    if (Displaced && monseeu
                        && mon.mux === nx && mon.muy === ny) {
                        dispx = u.ux;
                        dispy = u.uy;
                    } else {
                        dispx = nx;
                        dispy = ny;
                    }

                    let info = 0;
                    if (onscary(dispx, dispy, mon)) {
                        if (!(flag & ALLOW_SSM))
                            continue;
                        info |= ALLOW_SSM;
                    }
                    if ((u.ux === nx && u.uy === ny)
                        || (nx === mon.mux && ny === mon.muy)) {
                        if (u.ux === nx && u.uy === ny) {
                            /* If it's right next to you, it found you,
                             * displaced or no.  We must set mux and muy
                             * right now, so when we return we can tell
                             * that the ALLOW_U means to attack _you_ and
                             * not the image.
                             */
                            mon.mux = u.ux;
                            mon.muy = u.uy;
                        }
                        if (!(flag & ALLOW_U))
                            continue;
                        info |= ALLOW_U;
                    } else {
                        const mtmp2 = m_at(nx, ny);
                        if (mtmp2) {
                            let mmflag = flag | mm_aggression(mon, mtmp2);

                            if (mmflag & ALLOW_M) {
                                info |= ALLOW_M;
                                if (mtmp2.mtame) {
                                    if (!(mmflag & ALLOW_TM))
                                        continue;
                                    info |= ALLOW_TM;
                                }
                            } else {
                                flag &= ~ALLOW_MDISP; /* depends upon defender */
                                mmflag = flag | mm_displacement(mon, mtmp2);
                                if (!(mmflag & ALLOW_MDISP))
                                    continue;
                                info |= ALLOW_MDISP;
                            }
                        }
                        /* Note: ALLOW_SANCT only prevents movement, not
                           attack, into a temple. */
                        if (lev.flags?.has_temple)
                            throw new Error('mfndpos(): temples not ported yet');
                    }
                    if (checkobj && sobj_at(CLOVE_OF_GARLIC, nx, ny)) {
                        if (flag & NOGARLIC)
                            continue;
                        info |= NOGARLIC;
                    }
                    if (checkobj && sobj_at(BOULDER, nx, ny)) {
                        if (!(flag & ALLOW_ROCK))
                            continue;
                        info |= ALLOW_ROCK;
                    }
                    if (monseeu && monlineu(mon, nx, ny)) {
                        if (flag & NOTONL)
                            continue;
                        info |= NOTONL;
                    }
                    /* check for diagonal tight squeeze */
                    if (nx !== x && ny !== y && bad_rock(mdat, x, ny)
                        && bad_rock(mdat, nx, y) && cant_squeeze_thru(mon))
                        continue;
                    /* The monster avoids a particular type of trap if it's
                     * familiar with the trap type.  Pets get ALLOW_TRAPS
                     * and checking is done in dogmove.c.  In either case,
                     * "harmless" traps are neither avoided nor marked in info[].
                     */
                    const ttmp = t_at(nx, ny);
                    if (ttmp) {
                        if (ttmp.ttyp >= TRAPNUM || ttmp.ttyp === 0) {
                            /* impossible("A monster looked at a very
                               strange trap of type %d.") */
                            continue;
                        }
                        /* fixed-destination teleport trap, was used by hero */
                        if (fixed_tele_trap(ttmp) && hastrack(nx, ny))
                            info |= ALLOW_TRAPS;
                        else if (!m_harmless_trap(mon, ttmp)) {
                            if (!(flag & ALLOW_TRAPS)) {
                                if (mon_knows_traps(mon, ttmp.ttyp))
                                    continue;
                            }
                            info |= ALLOW_TRAPS;
                        }
                    }
                    data.poss[cnt] = { x: nx, y: ny };
                    data.info[cnt] = info;
                    cnt++;
                }
            }
        if (!cnt && wantpool && !is_pool(x, y)) {
            wantpool = false;
            continue; /* goto nexttry */
        }
        break;
    }
    data.cnt = cnt;
    return cnt;
}

// C ref: mon.c kill_eggs()
// Object chains here are either arrays (level.objects, minvent, cobj) or
// nobj-linked lists (invent).
function kill_eggs(obj_list) {
    if (!obj_list)
        return;
    const objs = [];
    if (Array.isArray(obj_list))
        objs.push(...obj_list);
    else
        for (let o = obj_list; o; o = o.nobj)
            objs.push(o);
    for (const otmp of objs)
        if (otmp.otyp === EGG) {
            if (dead_species(otmp.corpsenm, true)) {
                /*
                 * It seems we could also just catch this when
                 * it attempted to hatch, so we wouldn't have to
                 * search all of the objlists.. or stop all
                 * hatch timers based on a corpsenm.
                 */
                kill_egg(otmp);
            }
        } else if (otmp.cobj && otmp.cobj.length) { /* Has_contents() */
            kill_eggs(otmp.cobj);
        }
}

// C ref: mon.c kill_genocided_monsters()
/* kill all members of genocided species */
export function kill_genocided_monsters() {
    const g = game;
    let mtmp, mtmp2;
    let kill_cham;
    let mndx;

    for (mtmp = g.fmon; mtmp; mtmp = mtmp2) {
        mtmp2 = mtmp.nmon;
        if (mtmp.mhp <= 0) /* DEADMONSTER() */
            continue;
        mndx = monsndx(mtmp.data);
        kill_cham = (mtmp.cham !== undefined && mtmp.cham >= LOW_PM /* ismnum() */
                     && (g.mvitals[mtmp.cham].mvflags & G_GENOD));
        if ((g.mvitals[mndx].mvflags & G_GENOD) || kill_cham) {
            /* newcham(mtmp, NULL, NC_SHOW_MSG) or mondead(mtmp) */
            throw new Error('kill_genocided_monsters(): removing genocided monsters not ported yet');
        }
        if (mtmp.minvent)
            kill_eggs(mtmp.minvent);
    }

    kill_eggs(g.invent);
    kill_eggs(g.level.objects);
    kill_eggs(g.migrating_objs);
    kill_eggs(g.level.buriedobjlist);
}
