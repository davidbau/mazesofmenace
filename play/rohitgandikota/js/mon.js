import { migrate_monster } from './trap.js';
import { um_dist } from './apply.js';
import { gazemu } from './mhitu.js';
import { aggravate } from './wizard.js';
import { stop_occupation } from './allmain.js';
import { ledger_no } from './dungeon.js';
import { level_difficulty } from './dungeon.js';
import { montoostrong } from './makemon.js';
import { monmax_difficulty } from './makemon.js';
import { simple_typename } from './objnam.js';
import { The } from './objnam.js';
import { pline_mon } from './pline.js';
import { MON_LIMBO } from './const.js';
import { MIGR_APPROX_XY } from './const.js';
import { NATTK } from './const.js';
import { c_obj_colors } from './const.js';
import { W_AMUL } from './const.js';
import { is_vampshifter } from './monst.js';
import { revive_corpse } from './do.js';
import { monsndx } from './makemon.js';
import { kill_egg } from './timeout.js';
import { Has_contents } from './obj.js';
import { dead_species } from './mkobj.js';
import { LOW_PM } from './const.js';
import { is_vampire, is_shapeshifter } from './mondata.js';
import { can_hide_under_obj } from './monmove.js';
import { u_at, OBJ_AT } from './const.js';
import { mon_explodes } from './explode.js';
import { fill_pit } from './trap.js';
import { remove_worm } from './worm.js';
import { mon_offmap, is_lightblocker_mappear } from './monst.js';
import { dist2 } from './hacklib.js';
import { m_dowear, mon_break_armor } from './worn.js';
import { is_hider, perceives, is_human, is_unicorn , regenerates, hides_under } from './mondata.js';
import { ceiling_hider, emits_light, resist_conflict, resists_fire } from './mondata.js';
import { new_light_source, del_light_source, any_light_source,
         LS_OBJECT, LS_MONSTER } from './light.js';
import { sensemon } from './display.js';
import { mdistu, mon_track_clear, m_everyturn_effect,
         set_apparxy as set_apparxy_ref, monflee, m_canseeu } from './monmove.js';
// mon.js — monster bookkeeping.
// C ref: src/mon.c
//
// Only the once-per-turn allotment is here so far. mcalcmove() is the first
// thing every game turn draws: one rn2(NORMAL_SPEED) per monster on the level,
// unconditionally, so the count is the monster census and a level generated
// with the wrong number of monsters desynchronises on its very first turn.

import { game } from './gstate.js';
import { get_wormno, initworm, place_worm_tail_randomly,
         worm_cross, worm_wire } from './worm.js';
import { adjalign, change_luck, exercise } from './attrib.js';
import { couldsee, cansee, does_block, unblock_point, vision_recalc } from './vision.js';
import { finish_meating } from './dogmove.js';
import { growl, maybe_gasp } from './sounds.js';
import { sengr_at } from './engrave.js';
import { Amonnam, Monnam, mon_nam, noname_monnam, x_monnam, upstart }
    from './do_name.js';
import { hot_pursuit, shkgone } from './shk.js';
import { is_metallic, is_mines_prize, is_soko_prize } from './obj.js';
import { bad_rock, disturb_buried_zombies, may_dig, may_passwall }
    from './hack.js';
import { which_armor } from './worn.js';
import { obj_resists, destroy_items, resist } from './zap.js';
import { mksobj_at, splitobj, mkobj, place_object, clear_splitobjs, mkgold,
         undead_to_corpse, zombie_form, discard_minvent,
         add_to_container } from './mkobj.js';
import { weight, update_inventory } from './invent.js';
import { newsym, canseemon, canspotmon, display_nhwindow_message, pline,
         see_monsters, unmap_invisible } from './display.js';
import { rn1, rn2, rnd, rnl, d } from './rng.js';
import { DEADMONSTER, MON_WEP } from './monst.js';
import { remove_monster, place_monster, goodpos, grow_up, makemon } from './makemon.js';
import { enexto_core, enexto, noteleport_level, rloc, tele_restrict,
         rloc_to_flag } from './teleport.js';
import { GP_CHECKSCARY, STRAT_WAITFORU, BOLT_LIM, NC_SHOW_MSG, ismnum,
         G_GENOD, A_NONE, A_CHAOTIC, A_STR, ARTICLE_NONE, ARTICLE_THE, ARTICLE_A,
         ARTICLE_YOUR, FIRE_RES, COLD_RES, SLEEP_RES, DISINT_RES,
         SHOCK_RES, POISON_RES, ACID_RES, STONE_RES, TELEPORT,
         TELEPORT_CONTROL, TELEPAT, LAST_PROP, INTRINSIC,
         SUPPRESS_SADDLE, SUPPRESS_HALLUCINATION, SUPPRESS_INVISIBLE,
         SUPPRESS_IT, PRONOUN_HALLU, NO_NC_FLAGS,
         NC_VIA_WAND_OR_SPELL } from './const.js';
import { G_UNIQ } from './const.js';
import { MON_DETACH, P_DAGGER, P_SABER, M_AP_TYPE, M_AP_NOTHING, M_AP_MONSTER, STRAT_WAITMASK, XKILL_GIVEMSG,
         M_AP_FURNITURE, M_AP_OBJECT, ROOM, is_pit, I_SPECIAL,
         XKILL_NOMSG, XKILL_NOCORPSE, MON_EXPLODE,
         PLNMSG_UNKNOWN, PLNMSG_GROWL } from './const.js';
import { NO_MM_FLAGS } from './const.js';
import { PMNAMES, MONSYMS, MFLAGS, ATTKS, MSOUND } from './monst_data.js';
import { def_monsyms } from './drawing_data.js';

import { has_ceiling, surface } from './dungeon.js';
import { in_rooms } from './hack.js';
import { m_harmless_trap } from './trap.js';
import { hastrack } from './track.js';

// include/trap.h:125 fixed_tele_trap()
const fixed_tele_trap = (t) => t.ttyp === TELEP_TRAP
                            && isok(t.teledest?.x, t.teledest?.y);
import { obfree, sobj_at, obj_extract_self, stackobj } from './invent.js';
import { OBJ_FLOOR } from './obj.js';
import { online2, isok } from './hacklib.js';
/* onscary() and in_your_sanctuary() are src/monmove.c and src/priest.c
   functions living in js/monmove.js, which imports this file. Both sides
   export function declarations, so the cycle resolves through hoisting. */
import { onscary, in_your_sanctuary, m_can_break_boulder, mon_knows_traps, can_fog, inhishop, mon_would_take_item } from './monmove.js';
import { Is_waterlevel, Is_rogue_level, engulfing_u, In_endgame,
         Is_astralevel, has_emin, has_epri, has_eshk, RLOC_NOMSG,
         RLOC_MSG, MON_OBLITERATE } from './const.js';
import { bigmonst, amorphous, is_whirly, noncorporeal, slithy, needspick, nohands, nolimbs, verysmall, is_giant, tunnels, passes_walls, throws_rocks, passes_bars, is_displacer, notake, strongmonst, is_covetous,
    is_clinger, is_flyer, is_floater, mindless, dmgtype, attacktype, mon_resistancebits, humanoid, is_undead, unsolid, breathless, amphibious, pronoun_gender, big_little_match } from './mondata.js';
import { ONAMES, OCLASSES, MATERIALS } from './objects_data.js';
import { distant_name, doname, makeplural } from './objnam.js';
import { You, You_feel, You_hear } from './pline.js';
import { Blind, Hallucination, Deaf } from './youprop.js';
import { experience, more_experienced, newexplevel } from './exper.js';
import { touch_petrifies, acidic, slimeproof, mon_hates_silver, could_reach_item } from './dog.js';
import { is_rider, set_mimic_sym, hideunder, is_male, is_female } from './makemon.js';
import { mpickobj } from './steal.js';
import { nonliving, is_neuter, is_animal, is_mplayer, has_head, haseyes,
         olfaction, is_orc } from './mondata.js';
import { mkcorpstat } from './mklev.js';
import { CORPSTAT_NONE, CORPSTAT_INIT, CORPSTAT_FEMALE, CORPSTAT_MALE,
         CORPSTAT_HISTORIC, ACCESSIBLE, TAINT_AGE,
         CORPSTAT_BURIED } from './const.js';
import { MAX_CARR_CAP, WT_HUMAN, W_ARMG, W_ARMS, P_AXE, P_PICK_AXE, IS_TREE } from './const.js';

// include/monflag.h:180 MZ_HUMAN is MZ_MEDIUM
const MZ_HUMAN = MFLAGS.MZ_MEDIUM;

import { COLNO, ROWNO, POOL, DRAWBRIDGE_UP, LAVAPOOL, LAVAWALL, IRONBARS,
         D_CLOSED, D_LOCKED, D_BROKEN, IS_OBSTRUCTED, IS_DOOR, IS_WATERWALL,
         ALLOW_ALL, ALLOW_U, ALLOW_SSM, ALLOW_WALL, ALLOW_DIG, ALLOW_BARS,
         ALLOW_TRAPS, ALLOW_M, ALLOW_SANCT, ALLOW_ROCK, NOTONL, OPENDOOR,
         UNLOCKDOOR, BUSTDOOR, ALLOW_TM, ALLOW_MDISP, NON_PM,
         NOGARLIC, TEMPLE, TRAPNUM, TELEP_TRAP, SHOPBASE,
         W_NONDIGGABLE } from './const.js';

// include/permonst.h:80
export const NORMAL_SPEED = 12;

// include/monst.h — mspeed values
const MSLOW = 1, MFAST = 2;

// src/mon.c:1130 mcalcmove()
export function mcalcmove(mon, m_moving) {
    let mmove = mon.data.mmove;

    if (mon.mspeed === MSLOW) {
        if (mmove < NORMAL_SPEED)
            mmove = Math.trunc((2 * mmove + 1) / 3);
        else
            mmove = 4 + Math.trunc(mmove / 3);
    } else if (mon.mspeed === MFAST) {
        mmove = Math.trunc((4 * mmove + 2) / 3);
    }

    /* the u.usteed gallop branch needs a steed; nothing rides yet */

    if (m_moving) {
        /* Randomly round the speed to a multiple of NORMAL_SPEED. The rn2 is
           evaluated before the comparison, so it fires even when mmove is
           already a multiple and mmove_adj is 0. */
        const mmove_adj = mmove % NORMAL_SPEED;
        mmove -= mmove_adj;
        if (rn2(NORMAL_SPEED) < mmove_adj)
            mmove += NORMAL_SPEED;
    }
    return mmove;
}

// src/mon.c mcalcdistress() — per-turn status effects. Everything it touches
// (stoning, sliming, timed invisibility, ...) needs subsystems that are not
// ported, and none of them draw for a monster with no such state.
export async function mcalcdistress() {
    /* src/mon.c:4527 iter_mons(m_calcdistress) */
    for (const mtmp of [...(game.level?.monsters || [])]) {
        if (mtmp.mhp <= 0) continue;
        await m_calcdistress(mtmp);
    }
}

// src/mon.c:1180 m_calcdistress() — once per turn per monster: regenerate,
// shapeshift, and time out temporary maladies.
async function m_calcdistress(mtmp) {
    /* non-moving monsters get a liquid check here */
    if (mtmp.data.mmove === 0 && await minliquid(mtmp))
        return;
    /* src/monmove.c:307 mon_regen(mtmp, FALSE) */
    if (game.moves % 20 === 0 || regenerates(game.mons[mtmp.mnum]))
        healmon(mtmp, 1, 0);
    if (mtmp.mspec_used)
        mtmp.mspec_used--;

    /* possibly polymorph shapechangers and lycanthropes */
    if (mtmp.cham != null && mtmp.cham >= 0)
        await decide_to_shapeshift(mtmp);
    {
        const { were_change } = await import('./were.js');
        await were_change(mtmp);
    }

    /* gradually time out temporary problems */
    if (mtmp.mblinded && !--mtmp.mblinded)
        mtmp.mcansee = 1;
    if (mtmp.mfrozen && !--mtmp.mfrozen)
        mtmp.mcanmove = 1;
    if (mtmp.mfleetim && !--mtmp.mfleetim)
        mtmp.mflee = 0;
}

// src/mon.c:298 movemon() — let every monster take its turn.
/* src/decl.c gs.somebody_can_move — a GLOBAL in C, set by
   movemon_singlemon the moment it subtracts a monster's movement ration
   and sees NORMAL_SPEED still banked. It is NOT the per-monster return
   value: the early-exit arms below (equipping, hiders, eels) return
   without acting, but the flag they already set is what makes movemon()
   run the whole sweep again so the monster gets its extra action THIS
   turn. Conflating the two deferred those extra actions to the next
   turn and reordered every monster interleave at occupation seams. */
var gs_somebody_can_move = false;

// src/mon.c:2487 dmonsfree(): unlink monsters detached during the sweep.
function dmonsfree() {
    const monsters = game.level?.monsters;
    if (!monsters)
        return;

    for (let i = monsters.length - 1; i >= 0; --i) {
        const mtmp = monsters[i];
        if (DEADMONSTER(mtmp) && !mtmp.isgd)
            monsters.splice(i, 1);
    }
    if (game.iflags)
        game.iflags.purge_monsters = 0;
}

export async function movemon() {
    gs_somebody_can_move = false;
    /* src/mon.c:4500 iter_mons_safe() — C snapshots fmon into itermonarr[]
       and iterates THAT, so a mid-loop death (mondead splices our array) or
       a mid-loop birth (clone_mon unshifts) cannot skip or repeat a mover.
       Iterating the live array skipped the monster that shifted into a
       spliced slot, which desynced follower pairs from C.
       A TRUE return from the per-monster body stops the sweep (C uses it
       for the hero-leaving-level abort), it does not mean "can move". */
    for (const mtmp of [...(game.level?.monsters || [])]) {
        if (mtmp.mhp <= 0) continue;   /* died earlier in this sweep */
        if (await movemon_singlemon(mtmp)) break;
    }
    /* src/mon.c:1332. Object light sources can move with their monster
       carriers. Monster-source parity still depends on missing movement
       cases, so only enable the fully resolved object arm for now. */
    if (any_light_source(LS_OBJECT))
        game.vision_full_recalc = 1;
    clear_splitobjs();
    dmonsfree();

    /* src/mon.c:1343, a monster can schedule the hero's departure, notably
       when a quest leader expels the hero. Finish it at the end of this
       monster sweep so no command is read on the level being left. */
    if (game.u?.utotype) {
        const { deferred_goto } = await import('./do.js');
        await deferred_goto();
        gs_somebody_can_move = false;
    }
    return gs_somebody_can_move;
}

// src/mon.c:1214 movemon_singlemon()
async function movemon_singlemon(mtmp) {
    /* src/mon.c:1219 — end monster movement early if hero is flagged to
       leave the level. TRUE stops iter_mons_safe's sweep. */
    if (game.u?.utotype) {
        gs_somebody_can_move = false;
        return true;
    }

    /* src/mon.c:1244 — a monster that is no longer on this map does not act. */
    if (mon_offmap(mtmp))
        return false;

    /* src/mon.c:1248 m_everyturn_effect() — fog clouds shed harmless
       vapor where they stand, before the movement-energy gate */
    m_everyturn_effect(mtmp);

    if (globalThis.__dog_trace && mtmp.mtame)
        console.error(`DOGNRG turn=${game.moves} mv=${mtmp.movement}`);
    if (globalThis.__dog_trace && mtmp.mnum === 158)
        console.error(`LICH t=${game.moves} mv=${mtmp.movement}`);
    if (mtmp.movement < NORMAL_SPEED)
        return false;
    mtmp.movement -= NORMAL_SPEED;
    /* src/mon.c:1256 — the flag is decided HERE, before the monster acts,
       and survives every early exit below. */
    if (mtmp.movement >= NORMAL_SPEED)
        gs_somebody_can_move = true;

    /* src/mon.c:1259 — vision! A monster whose move changed the light or
       blockage map recalculates before the NEXT monster acts, so its
       couldsee() gates read fresh data mid-sweep. */
    if (game.vision_full_recalc)
        vision_recalc(0);

    /* src/mon.c:1263-1264 — reset obj bypasses, forget the splitobj pair */
    clear_splitobjs();

    /* src/mon.c:1265 minliquid() runs for every moving monster. */
    if (await minliquid(mtmp))
        return false;

    /* src/mon.c:1268 — after losing equipment, try to put on replacement.
       C's comment: "hostiles only try to equip things if they think hero
       isn't nearby; if they think hero is nearby, leave the flag intact so
       that it can be checked again on subsequent moves". Note the distance is
       to mux/muy, where the monster BELIEVES the hero is, not u.ux/u.uy. */
    if (mtmp.misc_worn_check & I_SPECIAL) {
        if (mtmp.mpeaceful || mtmp.mtame
            || dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy) > (3 * 3)) {
            mtmp.misc_worn_check &= ~I_SPECIAL;
            const oldworn = mtmp.misc_worn_check;
            await m_dowear(mtmp, false);
            if (mtmp.misc_worn_check !== oldworn || !mtmp.mcanmove)
                return false; /* is spending this turn equipping */
        }
    }

    /* src/mon.c:1286 — the hider and eel arms are NOT wired here.
       js/mon.js has restrap() ported below and it is correct in isolation,
       but wiring these two arms measured -42 screens and -5217 RNG, so the
       gap is recorded instead. See docs/plan/STATUS.md for the measurement
       and the leading hypothesis (our mundetected is set more liberally than
       C's, so hiders stop moving where C moves them). */
    if (is_hider(mtmp.data)) {
        if (restrap(mtmp))
            return false;
        if (M_AP_TYPE(mtmp) === M_AP_FURNITURE
            || M_AP_TYPE(mtmp) === M_AP_OBJECT)
            return false;
        if (mtmp.mundetected)
            return false;
    } else if (mtmp.data.mlet === MONSYMS.S_EEL && !mtmp.mundetected
               && (mtmp.mflee || !m_next2u(mtmp))
               && !canseemon(mtmp) && !rn2(4)) {
        if (hideunder(mtmp))
            return false;
    }

    /* src/mon.c:1306 — under Conflict a monster that can see the hero and
       is within bolt range may spend its action fighting a neighbor
       instead. fightm's head rolls resist_conflict, so the call order
       against dochug is draw-visible. The call to fightm() must be _last_:
       the monster might have died if it returns 1. */
    if (game.u.uprops?.CONFLICT && !mtmp.iswiz && m_canseeu(mtmp)) {
        if (cansee(mtmp.mx, mtmp.my)
            && (mdistu(mtmp) <= BOLT_LIM * BOLT_LIM)
            && await fightm(mtmp))
            return false; /* mon might have died */
    }
    await dochugw(mtmp, true);
    return false;
}

// src/mon.c:947 minliquid(), including lava and the dry-land eel arm.
export async function minliquid(mtmp) {
    const ptr = mtmp.data;

    const inlava = is_lava(mtmp.mx, mtmp.my)
        && !(is_flyer(ptr) || is_floater(ptr));
    if (inlava && !is_clinger(ptr) && !likes_lava(ptr)) {
        const canTeleport = (ptr.mflags1 & MFLAGS.M1_TPORT) !== 0;
        if (canTeleport && !await tele_restrict(mtmp)
            && await rloc(mtmp, RLOC_MSG))
            return 0;

        if (!resists_fire(mtmp)) {
            if (cansee(mtmp.mx, mtmp.my)) {
                let fate = 'burns to a crisp';
                if (mtmp.mnum === PMNAMES.PM_WATER_ELEMENTAL
                    || mtmp.mnum === PMNAMES.PM_FOG_CLOUD
                    || mtmp.mnum === PMNAMES.PM_STEAM_VORTEX)
                    fate = 'boils away';
                else if (mtmp.mnum === PMNAMES.PM_ICE_VORTEX
                         || mtmp.mnum === PMNAMES.PM_GLASS_GOLEM)
                    fate = 'melts away';
                await pline(`${Monnam(mtmp)} ${fate}.`);
            }
            const x = mtmp.mx, y = mtmp.my;
            await mondead(mtmp);
            newsym(x, y);
        } else {
            mtmp.mhp--;
            if (DEADMONSTER(mtmp)) {
                if (cansee(mtmp.mx, mtmp.my))
                    await pline(`${Monnam(mtmp)} surrenders to the fire.`);
                const x = mtmp.mx, y = mtmp.my;
                await mondead(mtmp);
                newsym(x, y);
            } else if (cansee(mtmp.mx, mtmp.my)) {
                await pline(`${Monnam(mtmp)} burns slightly.`);
            }
        }

        if (!DEADMONSTER(mtmp)) {
            if (!m_in_air(mtmp) && !likes_lava(mtmp.data)) {
                if ((mtmp.minvent || []).length)
                    note_unported_mon('minliquid:fire_damage_chain');
                if (!await rloc(mtmp, RLOC_MSG))
                    note_unported_mon('minliquid:deal_with_overcrowding');
            }
            return 0;
        }
        return 1;
    }

    const inpool = is_pool(mtmp.mx, mtmp.my)
        && (!(is_flyer(ptr) || is_floater(ptr)) || Is_waterlevel(game.u.uz));
    if (inpool && !is_clinger(ptr)
        && !(is_swimmer(ptr) || amphibious(ptr) || breathless(ptr))) {
        const canTeleport = (ptr.mflags1 & MFLAGS.M1_TPORT) !== 0;
        if (canTeleport && !await tele_restrict(mtmp)
            && await rloc(mtmp, RLOC_MSG))
            return 0;

        if (cansee(mtmp.mx, mtmp.my)) {
            if (game.context?.mon_moving)
                await pline(`${Monnam(mtmp)} drowns.`);
            else
                await You(`drown ${mon_nam(mtmp)}.`);
        }
        if (game.context?.mon_moving)
            await mondied(mtmp);
        else
            await xkilled(mtmp, XKILL_NOMSG);
        if (DEADMONSTER(mtmp))
            return 1;

        if (!m_in_air(mtmp)) {
            if (!await rloc(mtmp, RLOC_NOMSG))
                note_unported_mon('minliquid:deal_with_overcrowding');
        }
        return 0;
    }

    if (!inpool && ptr.mlet === MONSYMS.S_EEL && !Is_waterlevel(game.u.uz)
        && !breathless(ptr)) {
        if (mtmp.mhp > 1 && rn2(mtmp.mhp) > rn2(8))
            mtmp.mhp--;
        monflee(mtmp, 2, false, false);
    }
    return 0;
}

import { dochugw } from './monmove.js';
import { fightm } from './mhitm.js';

// include/you.h:560 m_next2u() — distu((m)->mx, (m)->my) <= 2.
// Its C home is you.h; kept here because restrap() below is its only user so
// far and js/mon.js already exports mdistu's twin.
export const m_next2u = (mtmp) => mdistu(mtmp) <= 2;

// src/mon.c:961 restrap() — a hider that is not being watched hides again.
//
// The rn2(3) is FOURTH in the OR chain, after mcan, M_AP_TYPE and cansee, so
// it is reached only for a hider the hero cannot currently see. That ordering
// is the whole draw behaviour: put the roll earlier and every hider burns a
// draw every turn.
//
// Called from movemon_singlemon before the monster moves; returning TRUE means
// the monster spent its turn hiding and does not act.
export function restrap(mtmp) {
    let t;

    if (mtmp.mcan || M_AP_TYPE(mtmp) || cansee(mtmp.mx, mtmp.my)
        || rn2(3) || mtmp === game.u?.ustuck
        /* can't hide while trapped except in pits */
        || (mtmp.mtrapped && (t = t_at(mtmp.mx, mtmp.my))
            && !is_pit(t.ttyp))
        /* can't hide on ceiling if there isn't one */
        || (ceiling_hider(mtmp.data) && !has_ceiling(game.u?.uz))
        /* won't hide when adjacent to hero */
        || (sensemon(mtmp) && m_next2u(mtmp)))
        return false;

    if (mtmp.data.mlet === MONSYMS.S_MIMIC) {
        if (mtmp.msleeping || mtmp.mfrozen) {
            /*
             * The mimic needs to be awake to disguise itself
             * as something else.
             */
            return false;
        }
        set_mimic_sym(mtmp);
        return true;
    } else if (game.level?.at?.(mtmp.mx, mtmp.my)?.typ === ROOM) {
        mtmp.mundetected = 1;
        return true;
    }

    return false;
}

// src/mon.c:2140 mfndpos() — the squares a monster may move to.
//
// Draws NOTHING, but it decides `cnt`, and dog_move()'s and m_move()'s
// tie-breaks are rn2(++chcnt) and rn2(4 * (cnt - j)) over exactly this set. One
// extra or missing candidate square therefore changes the stream.
//
// The exotic branches — poison-gas regions, water walls, long-worm crossings,
// displacement, sanctuary, garlic — are guarded by predicates that no public
// session reaches on an ordinary early level. They are marked with
// note_unported_mon() where they would matter rather than silently dropped, so
// a session that does reach one shows up in game.unported instead of quietly
// diverging.
// src/mon.c:2130 m_in_air() — is this monster off the ground right now?
//
// mfndpos() reads it twice, for poolok and lavaok, and a flyer that cannot swim
// is exactly the case the port was getting wrong: without this, water and lava
// squares were dropped from the candidate list, so cnt came out short and the
// rn2(4 * (cnt - j)) inside m_move() drew the wrong bound.
export function m_in_air(mtmp) {
    return is_flyer(mtmp.data)
        || is_floater(mtmp.data)
        || (is_clinger(mtmp.data) && has_ceiling(game.u?.uz) && mtmp.mundetected);
}

export function mfndpos(mon, data, flag) {
    const mdat = mon.data;
    const map = game.level;
    const x = mon.mx, y = mon.my;
    const nowtyp = map.at(x, y)?.typ;
    let cnt = 0;

    data.poss = [];
    data.info = [];

    const nodiag = NODIAG(mdat);
    let wantpool = (mdat.mlet === MONSYMS.S_EEL);
    const poolok = ((!Is_waterlevel(game.u?.uz) && m_in_air(mon))
                    || (is_swimmer(mdat) && !wantpool));
    let lavaok = (m_in_air(mon) || likes_lava(mdat));
    if (mdat.pmidx === PMNAMES.PM_FLOATING_EYE)  /* prefers to avoid heat */
        lavaok = false;
    let rockok = false, treeok = false, mw_tmp;
    let thrudoor = ((flag & (ALLOW_WALL | BUSTDOOR)) !== 0);

    if (flag & ALLOW_DIG) {
        /* need to be specific about what can currently be dug */
        if (!needspick(mdat)) {
            rockok = treeok = true;
        } else if ((mw_tmp = MON_WEP(mon)) && mw_tmp.cursed
                   && mon.weapon_check === NO_WEAPON_WANTED) {
            rockok = is_pick(mw_tmp);
            treeok = is_axe(mw_tmp);
        } else {
            rockok = !!(m_carrying(mon, ONAMES.PICK_AXE)
                        || (m_carrying(mon, ONAMES.DWARVISH_MATTOCK)
                            && !which_armor(mon, W_ARMS)));
            treeok = !!(m_carrying(mon, ONAMES.AXE)
                        || (m_carrying(mon, ONAMES.BATTLE_AXE)
                            && !which_armor(mon, W_ARMS)));
        }
        if (rockok || treeok)
            thrudoor = true;
    }

    for (;;) {                                  /* nexttry: */
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
                const loc = map.at(nx, ny);
                if (!loc) continue;
                const ntyp = loc.typ;

                if (IS_OBSTRUCTED(ntyp)
                    && !((flag & ALLOW_WALL) && may_passwall(nx, ny))
                    && !((IS_TREE(ntyp) ? treeok : rockok) && may_dig(nx, ny)))
                    continue;
                /* src/mon.c:2218 — intelligent peacefuls will not dig
                   through a shop or temple wall to get somewhere, unless they
                   are already inside one. */
                if (IS_OBSTRUCTED(ntyp) && rockok
                    && !mindless(mon.data) && (mon.mpeaceful || mon.mtame)
                    && (in_rooms(nx, ny, TEMPLE) || in_rooms(nx, ny, SHOPBASE))
                    && !(in_rooms(x, y, TEMPLE) || in_rooms(x, y, SHOPBASE)))
                    continue;
                if (IS_WATERWALL(ntyp) && !is_swimmer(mdat))
                    continue;
                /* src/mon.c:2227 — KMH: iron bars. Rusting and corroding
                   attacks get through ordinary bars but not non-diggable
                   ones, so those reject the square even with ALLOW_BARS. */
                if (ntyp === IRONBARS
                    && (!(flag & ALLOW_BARS)
                        || ((loc.wall_info & W_NONDIGGABLE)
                            && (dmgtype(mdat, ATTKS.AD_RUST)
                                || dmgtype(mdat, ATTKS.AD_CORR)))))
                    continue;
                if (IS_DOOR(ntyp)
                    /* an amorphous creature can only move under or through a
                       closed door when it does not currently have the hero
                       engulfed */
                    && !((amorphous(mdat) || can_fog(mon)) && !engulfing_u(mon))
                    && (((loc.doormask & D_CLOSED) && !(flag & OPENDOOR))
                        || ((loc.doormask & D_LOCKED) && !(flag & UNLOCKDOOR)))
                    && !thrudoor)
                    continue;

                /* first diagonal checks (tight squeezes handled below) */
                const here = map.at(x, y);
                if (nx !== x && ny !== y
                    && (nodiag
                        || (IS_DOOR(nowtyp) && (here.doormask & ~D_BROKEN))
                        || (IS_DOOR(ntyp) && (loc.doormask & ~D_BROKEN))
                        /* no diagonal in or out of a doorway on the Rogue
                           level, where the display is the 1980 original */
                        || ((IS_DOOR(nowtyp) || IS_DOOR(ntyp))
                            && Is_rogue_level())
                        /* mustn't pass between adjacent long worm segments,
                           but can attack that way */
                        || (m_at(x, ny) && m_at(nx, y)
                            && worm_cross(x, y, nx, ny) && !m_at(nx, ny)
                            && (nx !== game.u.ux || ny !== game.u.uy))))
                    continue;

                if ((!lavaok || !(flag & ALLOW_WALL)) && ntyp === LAVAWALL)
                    continue;

                if ((poolok || is_pool(nx, ny) === wantpool)
                    && (lavaok || !is_lava(nx, ny))) {
                    let info = 0;

                    /* src/mon.c:2277 — Displacement moves the square the
                       scare check is made on, as long as the hero is visible
                       to this monster. Not modelled, so dispx/dispy are nx/ny. */
                    /* src/mon.c:2264 — with Displacement the monster tests
                       the square it BELIEVES the hero occupies against the
                       hero's real one, so scary checks read u.ux/u.uy. */
                    const monseeu = (mon.mcansee
                                     && (!game.u.uprops?.INVIS || perceives(mdat)));
                    let dispx = nx, dispy = ny;
                    if (game.u.uprops?.DISPLACED && monseeu
                        && mon.mux === nx && mon.muy === ny) {
                        dispx = game.u.ux;
                        dispy = game.u.uy;
                    }

                    /* src/mon.c:2278 — a scary square (Elbereth, a scroll of
                       scare monster) is rejected unless the monster ignores
                       them. No draw; it just removes a candidate. */
                    if (onscary(dispx, dispy, mon)) {
                        if (!(flag & ALLOW_SSM))
                            continue;
                        info |= ALLOW_SSM;
                    }

                    if (nx === game.u.ux && ny === game.u.uy) {
                        mon.mux = game.u.ux;
                        mon.muy = game.u.uy;
                        if (!(flag & ALLOW_U))
                            continue;
                        info |= ALLOW_U;
                    } else if (nx === mon.mux && ny === mon.muy) {
                        if (!(flag & ALLOW_U))
                            continue;
                        info |= ALLOW_U;
                    } else {
                        const mtmp2 = m_at(nx, ny);
                        if (mtmp2) {
                            const mmflag = flag | mm_aggression(mon, mtmp2);

                            if (mmflag & ALLOW_M) {
                                info |= ALLOW_M;
                                if (mtmp2.mtame) {
                                    if (!(mmflag & ALLOW_TM))
                                        continue;
                                    info |= ALLOW_TM;
                                }
                            } else {
                                flag &= ~ALLOW_MDISP; /* depends on defender */
                                const mmflag2 = flag | mm_displacement(mon, mtmp2);
                                if (!(mmflag2 & ALLOW_MDISP))
                                    continue;
                                info |= ALLOW_MDISP;
                            }
                        }
                    }

                    /* src/mon.c:2318 — ALLOW_SANCT only prevents MOVEMENT
                       into a temple, not attack, which is why it sits in the
                       else arm of the hero test. */
                    if (!(nx === game.u.ux && ny === game.u.uy)
                        && !(nx === mon.mux && ny === mon.muy)) {
                        if (game.level?.flags?.has_temple
                            && in_rooms(nx, ny, TEMPLE)
                            && !in_rooms(x, y, TEMPLE)
                            && in_your_sanctuary(null, nx, ny)) {
                            if (!(flag & ALLOW_SANCT))
                                continue;
                            info |= ALLOW_SANCT;
                        }
                    }

                    /* src/mon.c:2326 — C reads OBJ_AT once into `checkobj`
                       and gates both object tests on it. */
                    const checkobj = objects_here(nx, ny);

                    if (checkobj && sobj_at(ONAMES.CLOVE_OF_GARLIC, nx, ny)) {
                        if (flag & NOGARLIC)
                            continue;
                        info |= NOGARLIC;
                    }
                    if (checkobj && sobj_at(ONAMES.BOULDER, nx, ny)) {
                        if (!(flag & ALLOW_ROCK))
                            continue;
                        info |= ALLOW_ROCK;
                    }

                    /* src/mon.c:2338 — avoid standing in the hero's line;
                       reuses the monseeu computed above, as C does. */
                    if (monseeu && monlineu(mon, nx, ny)) {
                        if (flag & NOTONL)
                            continue;
                        info |= NOTONL;
                    }

                    /* diagonal tight squeeze — all THREE tests must hold.
                       Omitting cant_squeeze_thru() blocked every diagonal
                       between two walls, which cost real candidate squares:
                       seed8000 had cnt 5 where C had 8. */
                    if (nx !== x && ny !== y
                        && bad_rock(mdat, x, ny) && bad_rock(mdat, nx, y)
                        && cant_squeeze_thru(mon))
                        continue;

                    /* src/mon.c:2347 — a monster avoids a trap type it is
                       familiar with. Pets get ALLOW_TRAPS and dogmove.c does
                       the deciding instead. A HARMLESS trap is neither avoided
                       nor marked, which is the part that matters here: marking
                       it unconditionally set ALLOW_TRAPS on squares C leaves
                       clear, and m_move reads info[] to choose. */
                    const ttmp = t_at(nx, ny);
                    if (ttmp) {
                        if (ttmp.ttyp >= TRAPNUM || ttmp.ttyp === 0) {
                            /* impossible("A monster looked at a very strange
                               trap of type %d.") -- and then continues. */
                            continue;
                        }
                        /* a fixed-destination teleport trap the hero has used
                           is a route, not a hazard */
                        if (fixed_tele_trap(ttmp) && hastrack(nx, ny)) {
                            info |= ALLOW_TRAPS;
                        } else if (!m_harmless_trap(mon, ttmp)) {
                            if (!(flag & ALLOW_TRAPS)
                                && mon_knows_traps(mon, ttmp.ttyp))
                                continue;
                            info |= ALLOW_TRAPS;
                        }
                    }

                    data.poss[cnt] = { x: nx, y: ny };
                    data.info[cnt] = info;
                    cnt++;
                }
            }

        /* eels prefer water, but crawl over land when there is none nearby */
        if (!cnt && wantpool && !is_pool(x, y)) {
            wantpool = false;
            continue;
        }
        break;
    }

    data.cnt = cnt;
    return cnt;
}

// include/rm.h:500 OBJ_AT() — is there anything on this square?
function objects_here(x, y) {
    return (game.level?.objects || []).some(o => o.ox === x && o.oy === y);
}

// src/mon.c:2055 monlineu() — is <nx,ny> in a straight line from where this
// monster THINKS the hero is? Note it uses mux/muy, the remembered position,
// not the real one.
function monlineu(mon, nx, ny) {
    return online2(nx, ny, mon.mux, mon.muy);
}

/* src/mon.c m_at() */
export function m_at(x, y) {
    /* src/rm.h level.monsters[][] — C reads the GRID, not the fmon chain,
       and the grid holds a long worm at every one of its tail squares as
       well as at its head. Scanning the chain by mx/my finds only the head,
       so mfndpos saw tail squares as free and offered a monster more
       candidate positions than C does. */
    const m = game.level?.monAt?.get(`${x},${y}`);
    return (m && m.mhp > 0) ? m : null;
}

/* src/trap.c t_at() */
export function t_at(x, y) {
    return (game.level?.traps || []).find(t => t.tx === x && t.ty === y) || null;
}


// src/mon.c healmon() — heal a monster, raising mhpmax only past `overheal`.
export function healmon(mtmp, amt, overheal) {
    const oldhp = mtmp.mhp;

    if (mtmp.mhp + amt > mtmp.mhpmax + overheal) {
        mtmp.mhpmax += overheal;
        mtmp.mhp = mtmp.mhpmax;
    } else {
        mtmp.mhp += amt;
        if (mtmp.mhp > mtmp.mhpmax)
            mtmp.mhpmax = mtmp.mhp;
    }
    return mtmp.mhp - oldhp;
}

function monster_intrinsic_possible(type, ptr) {
    const conveys = ptr.mconveys | 0;
    switch (type) {
    case FIRE_RES:   return (conveys & MFLAGS.MR_FIRE) !== 0;
    case COLD_RES:   return (conveys & MFLAGS.MR_COLD) !== 0;
    case SLEEP_RES:  return (conveys & MFLAGS.MR_SLEEP) !== 0;
    case DISINT_RES: return (conveys & MFLAGS.MR_DISINT) !== 0;
    case SHOCK_RES:  return (conveys & MFLAGS.MR_ELEC) !== 0;
    case POISON_RES: return (conveys & MFLAGS.MR_POISON) !== 0;
    case ACID_RES:   return (conveys & MFLAGS.MR_ACID) !== 0;
    case STONE_RES:  return (conveys & MFLAGS.MR_STONE) !== 0;
    case TELEPORT:   return (ptr.mflags1 & MFLAGS.M1_TPORT) !== 0;
    case TELEPORT_CONTROL:
        return (ptr.mflags1 & MFLAGS.M1_TPORT_CNTRL) !== 0;
    case TELEPAT:
        return ptr.pmidx === PMNAMES.PM_FLOATING_EYE
            || ptr.pmidx === PMNAMES.PM_MIND_FLAYER
            || ptr.pmidx === PMNAMES.PM_MASTER_MIND_FLAYER;
    default:
        return false;
    }
}

function monster_corpse_intrinsic(ptr) {
    const conveysStrength = (ptr.mflags2 & MFLAGS.M2_GIANT) !== 0;
    let count = conveysStrength ? 1 : 0;
    let prop = conveysStrength ? -1 : 0;

    for (let i = 1; i <= LAST_PROP; i++) {
        if (!monster_intrinsic_possible(i, ptr))
            continue;
        if (!rn2(++count))
            prop = i;
    }
    if (conveysStrength && count === 1 && !rn2(2))
        prop = 0;
    return prop;
}

function monster_should_givit(prop, ptr) {
    let chance = 15;
    if (prop === POISON_RES
        && (ptr.pmidx === PMNAMES.PM_KILLER_BEE
            || ptr.pmidx === PMNAMES.PM_SCORPION)
        && !rn2(4))
        chance = 1;
    else if (prop === TELEPORT)
        chance = 10;
    else if (prop === TELEPORT_CONTROL)
        chance = 12;
    else if (prop === TELEPAT)
        chance = 1;
    return ptr.mlevel > rn2(chance);
}

async function monster_give_prop(mtmp, prop) {
    const messages = new Map([
        [FIRE_RES, 'shivers slightly.'],
        [COLD_RES, 'looks quite warm.'],
        [SLEEP_RES, 'looks wide awake.'],
        [DISINT_RES, 'looks very firm.'],
        [SHOCK_RES, 'crackles with static electricity.'],
        [POISON_RES, 'looks healthy.'],
    ]);
    const msg = messages.get(prop);
    if (!msg)
        return;

    const intrinsic = 1 << (prop - 1);
    const alreadyIntrinsic = ((mtmp.data.mresists | 0)
                              | (mtmp.mintrinsics | 0)) & intrinsic;
    mtmp.mintrinsics = (mtmp.mintrinsics | 0) | intrinsic;
    if (canseemon(mtmp) && !alreadyIntrinsic)
        await pline(Monnam(mtmp) + ' ' + msg);
}

async function monster_givit(mtmp, ptr) {
    const prop = monster_corpse_intrinsic(ptr);
    if (DEADMONSTER(mtmp))
        return;
    if (ptr.pmidx === PMNAMES.PM_STALKER) {
        note_unported_mon('m_consume_obj:stalker_invisibility');
        return;
    }
    if (prop && monster_should_givit(prop, ptr))
        await monster_give_prop(mtmp, prop);
}

// src/muse.c:2872 mcureblindness(), used by monster food effects.
export async function mcureblindness(mon, verbose) {
    if (!mon.mcansee) {
        mon.mcansee = 1;
        mon.mblinded = 0;
        if (verbose && haseyes(mon.data))
            await pline(`${Monnam(mon)} can see again.`);
    }
}

// src/mon.c m_consume_obj(): the monster swallows otmp.
//
// Wraith growth, polyfood, and ordinary corpse resistance conveyance are
// implemented. The remaining special food effects stay explicitly recorded.
export async function m_consume_obj(mtmp, otmp) {
    const ispet = mtmp.mtame;
    const vis = canseemon(mtmp);

    /* non-pet: Heal up to the object's weight in hp */
    if (!ispet && mtmp.mhp < mtmp.mhpmax)
        healmon(mtmp, game.objects[otmp.otyp].oc_weight, 0);

    if (otmp.cobj && otmp.cobj.length) {
        note_unported_mon('m_consume_obj:meatbox');
        return;
    }

    const corpsenm = (otmp.otyp === ONAMES.CORPSE) ? otmp.corpsenm : NON_PM;
    const has_effects = (corpsenm !== NON_PM
                         || otmp.otyp === ONAMES.GLOB_OF_GREEN_SLIME
                         || otmp.otyp === ONAMES.EGG
                         || otmp.otyp === ONAMES.CARROT);
    const foodCorpse = otmp.otyp === ONAMES.CORPSE
        || otmp.otyp === ONAMES.EGG || otmp.otyp === ONAMES.TIN;
    const effectpm = foodCorpse ? otmp.corpsenm : NON_PM;

    /* src/mon.c — C computes polyfood/mlevelgain/mhealup/mstoning (all pure
       predicates, no draws), then calls delobj() UNCONDITIONALLY, and only
       then applies the consequences. This used to return before delobj on the
       corpse arm, so the corpse was never eaten: seed0030's kitten "ate" the
       same newt corpse at step 30 and again at step 33, and the level's object
       count never dropped. The effects still need newcham/grow_up/monstone/
       mon_givit and are recorded, but the object must go either way. */
    delobj(otmp); /* munch */

    if (effectpm === PMNAMES.PM_WRAITH) {
        if ((!ispet
             || mtmp.m_lev < mtmp.data.mlevel + 15))
            grow_up(mtmp, null);
        return;
    }

    const corpseptr = game.mons[corpsenm];
    const effectptr = game.mons[effectpm];
    const polyfood = effectptr
        && ((effectptr.mflags2 & MFLAGS.M2_SHAPESHIFTER)
            || dmgtype(effectptr, ATTKS.AD_POLY));
    const deadmimic = otmp.otyp === ONAMES.CORPSE
        && (corpsenm === PMNAMES.PM_SMALL_MIMIC
            || corpsenm === PMNAMES.PM_LARGE_MIMIC
            || corpsenm === PMNAMES.PM_GIANT_MIMIC);
    if (polyfood) {
        await newcham(mtmp, null, vis ? NC_SHOW_MSG : 0);
        if (corpseptr)
            await monster_givit(mtmp, corpseptr);
        return;
    }

    if (otmp.otyp === ONAMES.CARROT) {
        await mcureblindness(mtmp, canseemon(mtmp));
        return;
    }

    if (otmp.otyp === ONAMES.GLOB_OF_GREEN_SLIME) {
        await newcham(mtmp, game.mons[PMNAMES.PM_GREEN_SLIME],
                      vis ? NC_SHOW_MSG : 0);
        return;
    }

    const specialEffect = effectpm === PMNAMES.PM_NURSE
        || (effectptr
            && (touch_petrifies(effectptr)
                || effectpm === PMNAMES.PM_MEDUSA))
        || deadmimic
        || (otmp.otyp === ONAMES.EGG
            && effectpm === PMNAMES.PM_PYROLISK);

    if (corpseptr && !specialEffect)
        return monster_givit(mtmp, corpseptr);

    if (has_effects) {
        if (specialEffect)
            note_unported_mon('m_consume_obj:corpse_effects');
        return;
    }
}

// src/mkobj.c delobj() — take the object off the floor and free it.
export function delobj(obj) {
    delobj_core(obj, false);
}

// src/invent.c:1438 delobj_core() — destroy an object; `force` is for reviving
// Rider corpses. The obj_resists() guard DRAWS rn2(100) on every call, which
// is why deleting an object is never draw-neutral.
export function delobj_core(obj, force) {
    /* obj_resists(obj,0,0) protects the Amulet, the invocation tools,
       and Rider corpses */
    if (!force && obj_resists(obj, 0, 0)) {
        obj.in_use = 0; /* in case caller has set this to 1 */
        return;
    }
    const update_map = (obj.where === OBJ_FLOOR);
    obj_extract_self(obj);
    const objs = game.level?.objects;
    if (objs) {
        const i = objs.indexOf(obj);
        if (i >= 0) objs.splice(i, 1);
    }
    if (update_map)  /* floor object's coordinates are always up to date */
        newsym(obj.ox, obj.oy);
    obfree(obj);
}

// src/mon.c:1465 meatmetal() — a rock mole or similar eats the topmost metal
// object it is standing on.
//
// Reached from m_move()'s post-move block. Its rn2(100) is obj_resists', and
// it is the first call seed0030 diverges on.
export function meatmetal(mtmp) {
    /* If a pet, eating is handled separately, in dog.c */
    if (mtmp.mtame)
        return 0;

    /* Eats topmost metal object if it is there */
    for (const otmp of (game.level?.objects || [])
                         .filter(o => o.ox === mtmp.mx && o.oy === mtmp.my)) {
        /* Don't eat indigestible/choking/inappropriate objects */
        if ((game.mons[mtmp.mnum].pmidx === PMNAMES.PM_RUST_MONSTER
             && !is_rustprone(otmp))
            || (otmp.otyp === ONAMES.AMULET_OF_STRANGULATION
                || otmp.otyp === ONAMES.RIN_SLOW_DIGESTION)
            || (otmp.opoisoned && !resists_poison(mtmp)))
            continue;
        if (is_metallic(otmp) && !obj_resists(otmp, 5, 95)
            && touch_artifact(otmp, mtmp)) {
            if (game.mons[mtmp.mnum].pmidx === PMNAMES.PM_RUST_MONSTER
                && otmp.oerodeproof) {
                /* The object's rustproofing is gone now */
                otmp.oerodeproof = 0;
                mtmp.mstun = 1;
                /* "%s spits %s out in disgust!" */
            } else {
                /* "%s eats %s!" / You_hear("a crunching sound.") */
                mtmp.meating = Math.trunc(otmp.owt / 2) + 1;
                m_consume_obj(mtmp, otmp);
                if (DEADMONSTER(mtmp))
                    return 2;
                /* Left behind a pile? */
                if (rnd(25) < 3)
                    mksobj_at(ONAMES.ROCK, mtmp.mx, mtmp.my, true, false);
                newsym(mtmp.mx, mtmp.my);
                return 1;
            }
        }
    }
    return 0;
}

// src/mon.c:1531 meatobj() lets a gelatinous cube devour every organic
// object in its square and carry the rest. The two obj_resists() calls on an
// ordinary meal are both significant: one decides whether to engulf it, and
// delobj() makes the second before destroying it.
export async function meatobj(mtmp) {
    if (mtmp.mtame)
        return 0;

    const original_mnum = mtmp.mnum;
    let count = 0, ecount = 0, engulf_message = '';
    const here = (game.level?.objects || [])
        .filter(o => o.where === OBJ_FLOOR
                     && o.ox === mtmp.mx && o.oy === mtmp.my);

    for (const otmp of here) {
        if (!(game.level?.objects || []).includes(otmp))
            continue;
        if (is_mines_prize(otmp) || is_soko_prize(otmp))
            continue;

        const corpsenm = otmp.corpsenm ?? NON_PM;
        const corpsepm = ismnum(corpsenm) ? game.mons[corpsenm] : null;

        /* touch sensitive items */
        if (otmp.otyp === ONAMES.CORPSE && corpsepm
            && is_rider(corpsepm)) {
            const ox = otmp.ox, oy = otmp.oy;
            const revived_it = await revive_corpse(otmp);

            newsym(ox, oy);
            /* Rider corpse isn't just inedible; can't engulf it either */
            if (!revived_it)
                continue;
            /* [should check whether revival forced 'mtmp' off the level
               and return 3 in that situation (if possible...)] */
            break;
        }

        if ((otmp.otyp === ONAMES.CORPSE && corpsepm
             && touch_petrifies(corpsepm) && !resists_ston(mtmp))
            || otmp.oclass === OCLASSES.ROCK_CLASS
            || otmp === game.u.uball || otmp === game.u.uchain
            || otmp.otyp === ONAMES.SCR_SCARE_MONSTER)
            continue;

        const is_organic = game.objects[otmp.otyp].oc_material
                           <= MATERIALS.WOOD;
        const mstoning = otmp.oclass === OCLASSES.FOOD_CLASS && corpsepm
                         && (touch_petrifies(corpsepm)
                             || corpsepm.pmidx === PMNAMES.PM_MEDUSA);
        let engulf = !is_organic;
        if (!engulf && obj_resists(otmp, 5, 95))
            engulf = true;
        if (!engulf && !touch_artifact(otmp, mtmp))
            engulf = true;
        if (!engulf && (otmp.otyp === ONAMES.AMULET_OF_STRANGULATION
                        || otmp.otyp === ONAMES.RIN_SLOW_DIGESTION))
            engulf = true;
        if (!engulf && otmp.opoisoned && !resists_poison(mtmp))
            engulf = true;
        if (!engulf && mstoning && !resists_ston(mtmp))
            engulf = true;
        if (!engulf && otmp.otyp === ONAMES.GLOB_OF_GREEN_SLIME
            && !slimeproof(game.mons[mtmp.mnum]))
            engulf = true;

        if (engulf) {
            ecount++;
            const otmpname = distant_name(otmp, doname);
            if (ecount === 1)
                engulf_message = `${Monnam(mtmp)} engulfs ${otmpname}.`;
            else if (ecount === 2)
                engulf_message = `${Monnam(mtmp)} engulfs several objects.`;
            obj_extract_self(otmp);
            mpickobj(mtmp, otmp);
        } else {
            count++;
            if (cansee(mtmp.mx, mtmp.my)) {
                const otmpname = distant_name(otmp, doname);
                if (game.flags?.verbose)
                    await pline(`${Monnam(mtmp)} eats ${otmpname}!`);
                if (otmp.oclass === OCLASSES.SCROLL_CLASS
                    && game.obj_descr?.[game.objects[otmp.otyp].oc_descr_idx]
                           ?.oc_descr === 'YUM YUM')
                    await pline(otmp.blessed ? 'Yum!' : 'Yum.');
            } else if (game.flags?.verbose) {
                await You_hear('a slurping sound.');
            }
            await m_consume_obj(mtmp, otmp);
            if (mtmp.mnum !== original_mnum || DEADMONSTER(mtmp))
                return DEADMONSTER(mtmp) ? 2 : 1;
        }

        if (mtmp.minvis)
            newsym(mtmp.mx, mtmp.my);
    }

    if (ecount > 0 && game.flags?.verbose) {
        if (cansee(mtmp.mx, mtmp.my) && engulf_message)
            await pline(engulf_message);
        else
            await You_hear(ecount === 1 ? 'a slurping sound.'
                                       : 'several slurping sounds.');
    }
    return (count > 0 || ecount > 0) ? 1 : 0;
}

// include/objclass.h:194,200 is_metallic() / is_rustprone()
const is_rustprone = (otmp) => game.objects[otmp.otyp].oc_material === MATERIALS.IRON;

/* src/mondata.c resists_poison() needs the resistance tables. */
function resists_poison(mon) {
    return !!((game.mons[mon.mnum]?.mresists ?? 0) & MFLAGS.MR_POISON);
}

/* src/artifact.c:907 touch_artifact() — the real check lives in
   js/artifact.js; imported and re-exported to keep the established path
   while this file's own callers still see a local binding. */
import { touch_artifact } from './artifact.js';
export { touch_artifact };
import { pick_nasty, mon_has_amulet } from './wizard.js';
import { tt_doppel } from './topten.js';
import { rloc_to } from './teleport.js';




/* include/mondata.h:93 polyok() */
const polyok = (ptr) => (ptr.mflags2 & MFLAGS.M2_NOPOLY) === 0;
/* gu.urole.guardnum — role table carries it as a PM index */
function guardnum_of_urole() {
    const g = game.urole?.guardnum;
    return (typeof g === 'string') ? PMNAMES[g] : (g ?? -1);
}

function leadernum_of_urole() {
    const leader = game.urole?.ldrnum;
    return (typeof leader === 'string') ? PMNAMES[leader] : (leader ?? -1);
}

// src/mon.c:5915 check_gear_next_turn() — flag the monster to reconsider its
// equipment on its next move.
//
// One line, but it is the trigger for the I_SPECIAL arm in
// movemon_singlemon() above: a monster that just picked something up sets
// this, and next turn that arm calls m_dowear() and may spend the turn
// equipping. C's comment: "this hides the details of that".
export function check_gear_next_turn(mon) {
    mon.misc_worn_check |= I_SPECIAL;
}

// src/mon.c m_carrying() — the monster's object of this type, or null.
//
// This lived in monmove.js and returned a bare {} placeholder. Every caller so
// far only tested truth, but mfndpos' dig arm reads the object itself, so the
// dummy would have been a silent wrong answer the moment it was used.
export function m_carrying(mtmp, type) {
    for (const otmp of (mtmp.minvent || []))
        if (otmp.otyp === type)
            return otmp;

    return null;
}

// include/monst.h NO_WEAPON_WANTED — see js/const.js for the full enum.
const NO_WEAPON_WANTED = 0;

// include/obj.h:213 is_blade() — a cutting weapon, dagger through saber.
// WEAPON_CLASS only, unlike is_axe and is_pick which also accept a weptool.
export const is_blade = (otmp) =>
    otmp.oclass === OCLASSES.WEAPON_CLASS
    && game.objects[otmp.otyp].oc_skill >= P_DAGGER
    && game.objects[otmp.otyp].oc_skill <= P_SABER;

// include/obj.h:217,220 is_axe() / is_pick()
export const is_pick = (otmp) => (otmp.oclass === OCLASSES.WEAPON_CLASS
                           || otmp.oclass === OCLASSES.TOOL_CLASS)
                          && game.objects[otmp.otyp].oc_skill === P_PICK_AXE;
export const is_axe  = (otmp) => (otmp.oclass === OCLASSES.WEAPON_CLASS
                           || otmp.oclass === OCLASSES.TOOL_CLASS)
                          && game.objects[otmp.otyp].oc_skill === P_AXE;

// src/hack.c:953 cant_squeeze_thru() — 0 means it CAN squeeze. A small monster
// slips between two walls diagonally; a big one does not.
function cant_squeeze_thru(mon) {
    const ptr = mon.data;

    if (passes_walls(ptr))
        return 0;
    if (bigmonst(ptr)
        && !(amorphous(ptr) || is_whirly(ptr) || noncorporeal(ptr)
             || slithy(ptr)))
        return 1;
    /* curr_mon_load() needs monster inventory; nothing carries anything yet,
       so the WT_TOOMUCH_DIAGONAL test cannot fire. */
    return 0;
}

/* include/mondata.h */


/* include/mondata.h:57 — vortices and the air elemental, by symbol not flag */

/* include/mondata.h:31 — ghosts */



// Records an unported call by name. Returns FALSE explicitly, not undefined,
// because several call sites use it in boolean position (seemimic's
// is_blocker_appear, growl's verb lookup) and relying on undefined being
// falsy there would read as an accident rather than a decision.
function note_unported_mon(what) {
    (game.unported ||= new Set()).add(what);
    return false;
}

// ---------------------------------------------------------------------------
// The predicates mfndpos() consults. All from include/mondata.h and
// include/rm.h; none of them draw.
// ---------------------------------------------------------------------------

// include/hack.h:1414 — only the grid bug cannot move diagonally.
function NODIAG(mdat) {
    return mdat?.pmidx === PMNAMES.PM_GRID_BUG;
}

// include/mondata.h:25
function is_swimmer(ptr) {
    return (ptr.mflags1 & MFLAGS.M1_SWIM) !== 0;
}

// include/mondata.h:190 — only these two actually like it.
function likes_lava(ptr) {
    return ptr?.pmidx === PMNAMES.PM_FIRE_ELEMENTAL
        || ptr?.pmidx === PMNAMES.PM_SALAMANDER;
}

// include/rm.h:129-130
export function is_pool(x, y) {
    const t = game.level?.at(x, y)?.typ;
    return t !== undefined && t >= POOL && t <= DRAWBRIDGE_UP;
}
export function is_lava(x, y) {
    const t = game.level?.at(x, y)?.typ;
    return t === LAVAPOOL || t === LAVAWALL;
}

// src/mon.c:2064 mon_allowflags() — what a monster is permitted to walk into.
// Draws nothing, but it is mfndpos()'s `flag` argument, so it decides the
// candidate set the pet's tie-break draws range over.
export function mon_allowflags(mtmp) {
    let allowflags = 0;
    const d = mtmp.data;

    const can_open = !(nohands(d) || verysmall(d));
    const haskey = (mtmp.minvent || []).some((obj) =>
        obj.otyp === ONAMES.CREDIT_CARD || obj.otyp === ONAMES.SKELETON_KEY
        || obj.otyp === ONAMES.LOCK_PICK);
    const can_unlock = (can_open && haskey) || mtmp.iswiz || is_rider(d);
    const doorbuster = is_giant(d);
    let can_tunnel = tunnels(d) && !Is_rogue_level(game.u.uz);
    if (can_tunnel && needspick(d)
        && ((!mtmp.mpeaceful || game.u.uprops?.CONFLICT)
            && dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy) <= 8))
        can_tunnel = false;

    if (mtmp.mtame)
        allowflags |= ALLOW_M | ALLOW_TRAPS | ALLOW_SANCT | ALLOW_SSM;
    else if (mtmp.mpeaceful)
        allowflags |= ALLOW_SANCT | ALLOW_SSM;
    else
        allowflags |= ALLOW_U;
    /* src/mon.c:2086 — a conflicted monster that fails to resist may
       attack the hero; the roll fires for every monster while the ring
       is worn */
    if (game.u.uprops?.CONFLICT && !resist_conflict(mtmp))
        allowflags |= ALLOW_U;

    if (mtmp.isshk) allowflags |= ALLOW_SSM;
    if (mtmp.ispriest) allowflags |= ALLOW_SSM | ALLOW_SANCT;
    if (passes_walls(d)) allowflags |= (ALLOW_ROCK | ALLOW_WALL);
    if (throws_rocks(d) || m_can_break_boulder(mtmp)) allowflags |= ALLOW_ROCK;
    if (can_tunnel) allowflags |= ALLOW_DIG;
    if (doorbuster) allowflags |= BUSTDOOR;
    if (can_open) allowflags |= OPENDOOR;
    if (can_unlock) allowflags |= UNLOCKDOOR;
    if (passes_bars(d)
        && (mtmp !== game.u.ustuck
            || unsolid(game.youmonst.data) || verysmall(game.youmonst.data)))
        allowflags |= ALLOW_BARS;
    if ((d.mflags2 & MFLAGS.M2_MINION) || is_rider(d))
        allowflags |= ALLOW_SANCT;
    if (is_unicorn(d) && !noteleport_level(mtmp))
        allowflags |= NOTONL;
    if (is_human(d) || d.pmidx === PMNAMES.PM_MINOTAUR)
        allowflags |= ALLOW_SSM;
    if ((is_undead(d) && d.mlet !== MONSYMS.S_GHOST)
        || is_vampshifter_mon(mtmp))
        allowflags |= NOGARLIC;

    return allowflags;
}

/* include/mondata.h — the body-plan predicates mon_allowflags consults. */







// src/mon.c:2428 mm_aggression() — may `magr` attack `mdef`?
export function mm_aggression(magr, mdef) {
    const mndx = magr.data?.pmidx;

    /* pets never fight each other */
    if (magr.mtame && mdef.mtame)
        return 0;

    /* purple worms eat shriekers */
    if ((mndx === PMNAMES.PM_PURPLE_WORM || mndx === PMNAMES.PM_BABY_PURPLE_WORM)
        && mdef.data?.pmidx === PMNAMES.PM_SHRIEKER)
        return ALLOW_M | ALLOW_TM;

    return mm_2way_aggression(magr, mdef) | mm_2way_aggression(mdef, magr);
}

// src/mon.c mm_2way_aggression() — the zombie-maker case is the only one that
// fires outside the Wizard's tower, and it needs zombie_form(), which is part
// of the death-drop tables rather than anything in the move loop.
function mm_2way_aggression(magr, mdef) {
    if (zombie_maker(magr) && zombie_form(mdef.data) !== NON_PM) {
        if (magr.mgenmklev && mdef.mgenmklev)
            return 0;
        return ALLOW_M | ALLOW_TM;
    }
    return 0;
}

// src/mon.c:2451 mm_displacement() — may `magr` barge past `mdef`?
export function mm_displacement(magr, mdef) {
    const pa = magr.data, pd = mdef.data;

    if (is_displacer(pa) && (!is_displacer(pd) || magr.m_lev > mdef.m_lev)
        && !(magr.mx !== mdef.mx && magr.my !== mdef.my && NODIAG(pd))
        && !mdef.mtrapped
        && (is_rider(pa) || pa.msize >= pd.msize))
        return ALLOW_MDISP;
    return 0;
}

/* include/mondata.h */

// src/mon.c:362 zombie_maker() — by CLASS, not by flag. There is no
// M3_ZOMBIFIER; reading one gave undefined and the predicate was always false.
function zombie_maker(mon) {
    const pm = mon.data;
    if (mon.mcan) return false;
    if (pm.mlet === MONSYMS.S_ZOMBIE)
        return pm.pmidx !== PMNAMES.PM_GHOUL && pm.pmidx !== PMNAMES.PM_SKELETON;
    if (pm.mlet === MONSYMS.S_LICH)
        return true;
    return false;
}
/* zombie_form() is shared with corpse conversion in mkobj.js. */
// src/mon.c curr_mon_load() — total weight the monster is already carrying.
export function curr_mon_load(mtmp) {
    let curload = 0;

    for (const obj of (mtmp.minvent || [])) {
        if (obj.otyp !== ONAMES.BOULDER || !throws_rocks(game.mons[mtmp.mnum]))
            curload += obj.owt;
    }

    return curload;
}

// src/mon.c max_mon_load() — human capacity scaled by the monster's weight, or
// by its size when it has no corpse weight, then halved unless strong.
export function max_mon_load(mtmp) {
    const mdat = game.mons[mtmp.mnum];
    let maxload;

    if (!mdat.cwt)
        maxload = Math.trunc((MAX_CARR_CAP * mdat.msize) / MZ_HUMAN);
    else if (!strongmonst(mdat) || (strongmonst(mdat) && mdat.cwt > WT_HUMAN))
        maxload = Math.trunc((MAX_CARR_CAP * mdat.cwt) / WT_HUMAN);
    else
        maxload = MAX_CARR_CAP; /* strong monsters w/cwt <= WT_HUMAN */

    if (!strongmonst(mdat))
        maxload = Math.trunc(maxload / 2);

    if (maxload < 1)
        maxload = 1;

    return maxload;
}

// src/mon.c:1990 can_carry() — how many of otmp the monster could pick up.
// dog_goal()'s APPORT branch tests this AFTER spending its rn2(8), so a wrong
// answer here changes the goal but not the draw count.
export function can_carry(mtmp, otmp) {
    const otyp = otmp.otyp;
    const newload = otmp.owt;
    const mdat = game.mons[mtmp.mnum];

    if (notake(mdat))
        return 0; /* can't carry anything */

    if (!can_touch_safely(mtmp, otmp))
        return 0;

    /* hostile monsters who like gold will pick up the whole stack;
       tame monsters with hands will pick up the partial stack */
    const iquan = otmp.quan;

    /* monsters without hands can't pick up multiple objects at once
       unless they have an engulfing attack */
    if (iquan > 1) {
        let glomper = false;

        if (mdat.mlet === MONSYMS.S_DRAGON
            && (otmp.oclass === OCLASSES.COIN_CLASS
                || otmp.oclass === OCLASSES.GEM_CLASS))
            glomper = true;
        else
            for (const atk of mdat.mattk)
                if (atk[0] === ATTKS.AT_ENGL) {
                    glomper = true;
                    break;
                }
        if ((mdat.mflags1 & MFLAGS.M1_NOHANDS) && !glomper)
            return 1;
    }

    /* steeds don't pick up stuff (to avoid shop abuse) */
    if (mtmp === game.u.usteed)
        return 0;
    if (mtmp.isshk)
        return iquan; /* no limit */
    if (mtmp.mpeaceful && !mtmp.mtame)
        return 0;

    /* special--boulder throwers carry unlimited amounts of boulders */
    if (throws_rocks(mdat) && otyp === ONAMES.BOULDER)
        return iquan;

    /* nymphs deal in stolen merchandise, but not boulders or statues */
    if (mdat.mlet === MONSYMS.S_NYMPH)
        return (otmp.oclass === OCLASSES.ROCK_CLASS) ? 0 : iquan;

    if (curr_mon_load(mtmp) + newload > max_mon_load(mtmp))
        return 0;

    return iquan;
}

/* include/mondata.h and src/mon.c — the two predicates can_carry gates on.
   can_touch_safely() covers cockatrice corpses and acidic items for a monster
   without the matching resistance; neither can be on a floor before the corpse
   and resistance code lands. */


// src/mon.c can_touch_safely() — would picking this up hurt the monster?
//
// Stubbed to TRUE, it let monsters pick up silver they hate and corpses that
// petrify them, which changes what can_carry() allows and therefore which
// square m_search_items() steers them to.
export function can_touch_safely(mtmp, otmp) {
    const otyp = otmp.otyp;
    const mdat = game.mons[mtmp.mnum];

    if (otyp === ONAMES.CORPSE && touch_petrifies(game.mons[otmp.corpsenm])
        && !(mtmp.misc_worn_check & W_ARMG) && !resists_ston(mtmp))
        return false;
    if (otyp === ONAMES.CORPSE && is_rider(game.mons[otmp.corpsenm]))
        return false;
    if (game.objects[otyp].oc_material === MATERIALS.SILVER
        && mon_hates_silver(mtmp)
        && (otyp !== ONAMES.BELL_OF_OPENING || !is_covetous(mdat)))
        return false;
    /* touch_artifact() is ported above: it answers TRUE for anything that is
       not an artifact, which is every object on an early level, and records
       its own gap for a real artifact. Calling it is strictly better than
       recording a second gap here, which was hiding the fact that the common
       path was already answerable. */
    if (!touch_artifact(otmp, mtmp))
        return false;
    return true;
}

// include/mondata.h is_covetous()

/* resists_ston is defined at the end of this file, ported from
   include/monst.h:279 via src/mondata.c:129. */


// src/mon.c:2734 m_detach() — take a monster off the map.
//
// C does NOT unlink from the fmon chain here: it flags MON_DETACH and bumps
// iflags.purge_monsters, and dmonsfree() does the unlinking later. That split
// matters because anything walking fmon between now and the purge still SEES
// this monster. What must happen immediately is the map slot, because m_at()
// is what mfndpos() counts free squares with.
//
// Ported: map removal, light cleanup, shop cleanup, mhp = 0, and the detach
// flag. The remaining special cases keep separate markers so a reached branch
// identifies the actual missing behavior.
export function m_detach(mtmp, mptr, due_to_death) {
    const mx = mtmp.mx, my = mtmp.my;
    const onmap = mx > 0
        && game.level?.monAt?.get(`${mx},${my}`) === mtmp;

    if (mtmp.mleashed)
        (game.unported ||= new Set()).add('mon:m_detach:m_unleash');
    if (mtmp.iswiz)
        (game.unported ||= new Set()).add('mon:m_detach:wizdeadorgone');
    if (mtmp.wormno)
        (game.unported ||= new Set()).add('mon:m_detach:wormgone');
    if (due_to_death)
        (game.unported ||= new Set()).add('mon:m_detach:due_to_death');
    if (In_endgame(game.u.uz))
        (game.unported ||= new Set()).add('mon:m_detach:endgame_free');
    if (mtmp === game.u.usteed)
        (game.unported ||= new Set()).add('mon:m_detach:dismount_steed');

    /* src/mon.c:2744 — a glowing monster takes its light with it */
    if (mx > 0 && emits_light(mptr))
        del_light_source(LS_MONSTER, mtmp.m_id);

    /* mon_leaving_level() — off the map, but still on the fmon chain */
    if (onmap) {
        remove_monster(mx, my);
        mtmp.mundetected = 0;
        newsym(mx, my);
    }

    mtmp.mhp = 0;               /* simplify some tests: force mhp to 0 */

    /* src/mon.c:2790, a removed shopkeeper no longer owns a shop */
    if (mtmp.isshk)
        shkgone(mtmp);

    mtmp.mstate = (mtmp.mstate || 0) | MON_DETACH;
    game.iflags = game.iflags || {};
    game.iflags.purge_monsters = (game.iflags.purge_monsters || 0) + 1;
}

// src/mon.c:3267 mongone() — monster disappears, not dies.
//
// The distinction from mondead() is the whole point: no corpse, no death
// message, no experience. mk_trap_statue() uses it to throw away the monster
// it made purely to source a statue's inventory.
//
// discard_minvent() removes the pack FROM THE GAME rather than dropping it,
// which is why mk_trap_statue moves the objects into the statue first.
export function mongone(mdef) {
    mdef.mhp = 0;               /* can skip some inventory bookkeeping */

    if (mdef.isgd)
        (game.unported ||= new Set()).add('mon:mongone:grddead');
    /* src/mon.c mdrop_special_objs() checks every carried object. Ordinary
       objects fail obj_resists(obj, 0, 0), but each check still draws
       rn2(100). Orcus-town removes its two shopkeepers after stocking their
       shops, so omitting these checks shifts the rest of level generation. */
    for (const obj of [...(mdef.minvent || [])]) {
        const protected_ = obj_resists(obj, 0, 0)
            || ((obj.oartifact ?? 0) === game.urole.questarti);
        if (!protected_)
            continue;
        obj_extract_self(obj);
        place_object(obj, mdef.mx, mdef.my);
        stackobj(obj);
    }

    /* discard_minvent(mdef, FALSE) — the pack leaves the game entirely */
    discard_minvent(mdef, false);

    m_detach(mdef, mdef.data, false);
}

// src/mon.c:3287 monstone(), turn a monster and its inventory into a statue.
export async function monstone(mdef) {
    const x = mdef.mx, y = mdef.my;
    let remains;

    mdef.mhp = 0;
    mdef.mtrapped = 0;

    const statueChance = 2
        + (((mdef.data.geno & MFLAGS.G_FREQ) > 2) ? 1 : 0);
    if (mdef.data.msize > MFLAGS.MZ_TINY || !rn2(statueChance)) {
        const held = [];
        while ((mdef.minvent || []).length) {
            const obj = mdef.minvent[0];
            obj.owornmask = 0;
            obj_extract_self(obj);
            if (obj.otyp === ONAMES.BOULDER || obj_resists(obj, 0, 0)) {
                place_object(obj, x, y);
            } else {
                held.unshift(obj);
            }
        }

        let flags = CORPSTAT_NONE;
        if (mdef.female)
            flags |= CORPSTAT_FEMALE;
        else if (!is_neuter(mdef.data))
            flags |= CORPSTAT_MALE;
        if (mdef.data.geno & G_UNIQ)
            flags |= CORPSTAT_HISTORIC;

        remains = mkcorpstat(ONAMES.STATUE, mdef, mdef.mnum,
                             x, y, flags);
        if (mdef.mgivenname)
            remains.oname = mdef.mgivenname;
        for (const obj of held)
            add_to_container(remains, obj);
        remains.owt = weight(remains);
    } else {
        remains = mksobj_at(ONAMES.ROCK, x, y, true, false);
    }

    stackobj(remains);
    if (cansee(x, y))
        newsym(x, y);
    await mondead(mdef);
    return remains;
}

/* mon_resistancebits lives in js/mondata.js, its C home. */

// include/monst.h:279 resists_ston(), via src/mondata.c:129 Resists_Elem().
//
// This function was CALLED at js/mon.js:831 and defined nowhere. It never
// threw only because the guard in front of it short-circuits on every path
// the public sessions take.
export function resists_ston(mon) {
    return (mon_resistancebits(mon) & MFLAGS.MR_STONE) !== 0;
}

// src/mon.c:3421 set_ustuck() — set or clear what the hero is stuck to.
//
// Draws nothing. The point of having it as a function rather than an
// assignment is the clearing side: releasing u.ustuck must also clear
// uswallow and uswldtim, or the hero stays "swallowed" by nothing.
export function set_ustuck(mtmp) {
    game.disp = game.disp || {};
    game.disp.botl = true;
    game.u.ustuck = mtmp;
    if (!game.u.ustuck) {
        game.u.uswallow = 0;
        game.u.uswldtim = 0;
    }
}

// src/mon.c:3438 unstuck() — release the hero from a holder/engulfer.
export async function unstuck(mtmp) {
    if (game.u.ustuck === mtmp) {
        const ptr = game.mons[mtmp.mnum];
        const swallowed = game.u.uswallow;

        set_ustuck(null);   /* clears uswallow too */

        if (swallowed) {
            game.mswallower = null;
            game.u.ux = mtmp.mx;
            game.u.uy = mtmp.my;
            /* Punished ball&chain placebc: no session is punished */
            game.vision_full_recalc = 1;
            const { docrt } = await import('./display.js');
            await docrt();
        }

        /* prevent holder/engulfer from immediately re-holding */
        if (!mtmp.mspec_used && (dmgtype(ptr, ATTKS.AD_STCK)
                                 || attacktype(ptr, ATTKS.AT_ENGL)
                                 || attacktype(ptr, ATTKS.AT_HUGS)))
            mtmp.mspec_used = rnd(2);
    }
}

// src/mon.c wakeup() — wake a monster, and if this was an attack, anger it.
//
// Both `was_sleeping` and `was_peaceful` are read BEFORE the calls that clear
// them. setmangry() clears mpeaceful, so a port that tested mtmp->mpeaceful
// after it would never take the priest/shopkeeper branch -- the same ordering
// trap as anger_guards in hmon().
//
// The forcefight branch is an ELSE of the mimic branch, not a sibling: a
// hiding mimic is revealed by seemimic, everything else hiding is revealed
// only when you deliberately F-fight its square.
//
// wake_msg, seemimic, finish_meating, growl, setmangry, ghod_hitsu and
// hot_pursuit are recorded where they are not ported.
export async function wakeup(mtmp, via_attack) {
    const was_sleeping = mtmp.msleeping;

    await wake_msg(mtmp, via_attack);
    mtmp.msleeping = 0;
    if (M_AP_TYPE(mtmp) !== M_AP_NOTHING) {
        /* mimics come out of hiding, but disguised Wizard doesn't
           have to lose his disguise */
        if (M_AP_TYPE(mtmp) !== M_AP_MONSTER)
            seemimic(mtmp);
    } else if (game.context?.forcefight && !game.context?.mon_moving
               && mtmp.mundetected) {
        mtmp.mundetected = 0;
        newsym(mtmp.mx, mtmp.my);
    }
    finish_meating(mtmp);
    if (via_attack) {
        const was_peaceful = mtmp.mpeaceful;

        if (was_sleeping)
            await growl(mtmp);
        await setmangry(mtmp, true);
        if (was_peaceful) {
            if (mtmp.ispriest && in_rooms(mtmp.mx, mtmp.my, TEMPLE)?.length)
                note_unported_mon('wakeup:ghod_hitsu');
            if (mtmp.isshk && !(game.u?.ushops || '').length)
                hot_pursuit(mtmp);
        }
    }
}

// src/mon.c:4143 qst_guardians_respond(). Quest guardians sense an attack on
// their leader even without line of sight. Visibility controls only the one
// summary message.
async function qst_guardians_respond() {
    const guardnum = guardnum_of_urole();
    let visible = 0;

    for (const mon of (game.level?.monsters || [])) {
        if (DEADMONSTER(mon) || mon.mnum !== guardnum || !mon.mpeaceful)
            continue;
        mon.mpeaceful = 0;
        if (canseemon(mon))
            ++visible;
    }
    if (visible && !Hallucination()) {
        let who = game.mons[guardnum]?.pmnames?.[2]
            ?? game.mons[guardnum]?.pmnames?.[0]
            ?? game.mons[guardnum]?.pmnames?.[1]
            ?? 'guardian';
        if (visible > 1)
            who = makeplural(who);
        await pline(`The ${who} ${visible > 1 ? 'appear' : 'appears'} to be angry too...`);
    }
}

const is_watch_mon = (mon) =>
    mon.mnum === PMNAMES.PM_WATCHMAN
    || mon.mnum === PMNAMES.PM_WATCH_CAPTAIN;

// src/mon.c:5711 angry_guards(). All peaceful Minetown watch members become
// hostile together. The counts only choose the message and do not draw RNG.
export async function angry_guards(silent) {
    let count = 0, near = 0, seen = 0, sleeping = 0;

    for (const mon of (game.level?.monsters || [])) {
        if (DEADMONSTER(mon) || !is_watch_mon(mon) || !mon.mpeaceful)
            continue;
        ++count;
        if (canspotmon(mon) && mon.mcanmove !== 0) {
            if (m_next2u(mon))
                ++near;
            else
                ++seen;
        }
        if (mon.msleeping || mon.mfrozen) {
            ++sleeping;
            mon.msleeping = 0;
            mon.mfrozen = 0;
        }
        mon.mpeaceful = 0;
    }

    if (count && !silent) {
        if (sleeping)
            await pline(`The guard${sleeping > 1 ? 's' : ''} ${sleeping > 1 ? 'wake' : 'wakes'} up.`);
        if (near) {
            await pline(`The guard${near > 1 ? 's' : ''} ${near > 1 ? 'get' : 'gets'} angry!`);
        } else if (seen) {
            await pline(`${seen === 1 ? 'An angry' : 'Angry'} guard${seen > 1 ? 's' : ''} ${seen > 1 ? 'are' : 'is'} approaching!`);
        } else {
            const who = count === 1 ? "a guard's" : "guards'";
            await You_hear(`the shrill sound of ${who} whistle${count > 1 ? 's' : ''}.`);
        }
    }
    return !!count;
}

// src/mon.c:4168 peacefuls_respond(). Eligible bystanders react in monster
// list order. Keeping each short-circuit and draw in C order is essential.
async function peacefuls_respond(mtmp) {
    const guardnum = guardnum_of_urole();
    const leadernum = leadernum_of_urole();

    for (const mon of (game.level?.monsters || [])) {
        const ptr = game.mons[mon.mnum];
        if (mon === mtmp || DEADMONSTER(mon) || mindless(ptr)
            || !mon.mpeaceful || !couldsee(mon.mx, mon.my)
            || mon.msleeping || !mon.mcansee || !m_canseeu(mon))
            continue;

        if (humanoid(ptr) || mon.isshk || mon.ispriest) {
            if (is_watch_mon(mon)) {
                await pline('"Halt!  You\'re under arrest!"');
                await angry_guards(Deaf());
                continue;
            }

            let line = '';
            let exclaimed = false;
            let needsPunctuation = false;
            if (!Deaf() && !rn2(5)) {
                const gasp = maybe_gasp(mon);
                if (gasp) {
                    if (gasp.toLowerCase().startsWith('gasp')) {
                        line = `${Monnam(mon)} gasps`;
                        needsPunctuation = true;
                    } else {
                        line = `${Monnam(mon)} exclaims "${gasp}"`;
                    }
                    exclaimed = true;
                }
            }

            if (mon.isshk || mon.ispriest
                || (mon.mnum === leadernum && mtmp.mnum !== guardnum)) {
                if (exclaimed)
                    await pline(`${line} then shrugs.`);
                continue;
            }

            if (ptr.mlevel < rn2(10) && mon.mnum !== guardnum) {
                const alreadyFleeing = !!(mon.mflee || mon.mfleetim);
                await monflee(mon, rn2(50) + 25, true, !exclaimed);
                if (exclaimed) {
                    if (game.flags?.verbose !== false && !alreadyFleeing) {
                        line += ' and then turns to flee.';
                        needsPunctuation = false;
                    }
                } else {
                    exclaimed = true;
                }
            }
            if (line)
                await pline(`${line}${needsPunctuation ? '.' : ''}`);
            if (!mon.mtame) {
                mon.mpeaceful = 0;
                mon.mstrategy &= ~STRAT_WAITMASK;
                adjalign(-1);
                if (!exclaimed)
                    await pline(`${Monnam(mon)} gets angry!`);
            }
        } else if (ptr.mlet === game.mons[mtmp.mnum].mlet
                   && big_little_match(mtmp.mnum, mon.mnum) && !rn2(3)) {
            let exclaimed = false;
            if (!rn2(4)) {
                (game.iflags ||= {}).last_msg = PLNMSG_UNKNOWN;
                await growl(mon);
                exclaimed = game.iflags.last_msg === PLNMSG_GROWL;
            }
            if (rn2(6)) {
                const alreadyFleeing = !!(mon.mflee || mon.mfleetim);
                await monflee(mon, rn2(25) + 15, true, !exclaimed);
                if (exclaimed && !alreadyFleeing)
                    await pline('And then starts to flee.');
            }
        }
    }
}

// src/mon.c setmangry() — turn a peaceful monster hostile.
//
// The order of the three early exits is what carries the behaviour:
//   1. STRAT_WAITMASK is cleared for EVERY monster, hostile ones included,
//      before any return. A monster waiting to ambush stops waiting even if
//      it was already angry.
//   2. an already-hostile monster returns; there is nothing to anger.
//   3. a TAME monster returns too, still peaceful. Hitting your own pet does
//      not turn it hostile here, and costs no alignment. C flags this as
//      probably-wrong in a comment and keeps it; so do we.
//
// The Elbereth branch is the only source of a draw, rnd(5), and only when
// alignment is already at or below 5. sengr_at is part of the engraving
// subsystem, which is not ported, so no engraving exists to stand on and the
// branch is unreachable today -- that is the honest state, not a stub: when
// engravings land the condition starts being true on its own.
export async function setmangry(mtmp, via_attack, suppress_primary_message = false) {
    if (via_attack && sengr_at("Elbereth", game.u.ux, game.u.uy, true)
        && (onscary(game.u.ux, game.u.uy, mtmp) || mtmp.mpeaceful)) {
        /* unreachable until the engraving subsystem is ported */
        adjalign((game.u.ualign.record > 5) ? -5 : -rnd(5));
        note_unported_mon('setmangry:del_engr_at');
    }

    mtmp.mstrategy &= ~STRAT_WAITMASK;
    if (!mtmp.mpeaceful)
        return;
    if (mtmp.mtame)
        return;
    mtmp.mpeaceful = 0;
    if (mtmp.ispriest) {
        if (game.p_coaligned?.(mtmp))
            adjalign(-5); /* very bad */
        else
            adjalign(2);
    } else
        adjalign(-1); /* attacking peaceful monsters is bad */
    if (humanoid(game.mons[mtmp.mnum]) || mtmp.isshk || mtmp.isgd) {
        if (!suppress_primary_message && couldsee(mtmp.mx, mtmp.my))
            await pline(`${Monnam(mtmp)} gets angry!`);
    } else if (!suppress_primary_message) {
        await growl(mtmp);
    }

    /* attacking your own quest leader angers his or her guardians */
    if (mtmp.mnum === leadernum_of_urole())
        await qst_guardians_respond();

    /* make other peaceful monsters react */
    if (!game.context?.mon_moving)
        await peacefuls_respond(mtmp);
}

// src/mon.c:5971 see_monster_closeup(), remember first close sightings and
// photographs. Tourists receive ordinary monster experience for a first
// photograph, except for their unchanged starting pet.
export async function see_monster_closeup(mtmp, photo) {
    if (Hallucination() || (Blind() && !sensemon(mtmp)))
        return;

    let mndx = mtmp.mnum;
    if (M_AP_TYPE(mtmp) === M_AP_MONSTER && !sensemon(mtmp))
        mndx = mtmp.mappearance;
    if (mndx === PMNAMES.PM_LONG_WORM && game.notonhead)
        mndx = PMNAMES.PM_LONG_WORM_TAIL;

    const vitals = (game.mvitals ||= [])[mndx] ||= {};
    const lifelist = (game.context ||= {}).lifelist ||= {};
    if (!vitals.seen_close) {
        vitals.seen_close = 1;
        lifelist.total_seen_upclose = (lifelist.total_seen_upclose | 0) + 1;
    }

    if (!photo || mtmp.minvis || mtmp.mundetected
        || (M_AP_TYPE(mtmp) !== M_AP_NOTHING
            && M_AP_TYPE(mtmp) !== M_AP_MONSTER))
        return;

    if (M_AP_TYPE(mtmp) === M_AP_MONSTER)
        mndx = mtmp.mappearance;
    const photoVitals = (game.mvitals ||= [])[mndx] ||= {};
    if (photoVitals.photographed)
        return;

    photoVitals.photographed = 1;
    lifelist.total_photographed = (lifelist.total_photographed | 0) + 1;

    const role = game.urole?.mnum;
    const tourist = role === 'PM_TOURIST' || role === PMNAMES.PM_TOURIST;
    if (tourist
        && (mtmp.m_id !== game.context.startingpet_mid
            || mndx !== game.context.startingpet_typ)
        && mndx === mtmp.mnum) {
        more_experienced(experience(mtmp, 0), 0);
        await newexplevel();
    }
}


// src/mon.c:3470 killed() — the hero killed this monster, with a message.
// Three lines in C and a pure delegation; xkilled (263 lines) does the work
// and is recorded.
export async function killed(mtmp) {
    await xkilled(mtmp, XKILL_GIVEMSG);
}

// src/mon.c:3477 xkilled() — the hero killed this monster.
//
// The spine is the death message, mondead(), the "treasure drop" rn2(6), the
// corpse, the luck adjustments and the experience award, in that order; the
// order matters because three of those draw. Petrification and the murder
// penalty are live; the remaining engulfer, quest leader, priest, and
// shopkeeper branches stay recorded where they are not yet ported.
export async function xkilled(mtmp, xkill_flags) {
    const x = mtmp.mx, y = mtmp.my;
    const nomsg = (xkill_flags & XKILL_NOMSG) !== 0;
    let nocorpse = (xkill_flags & XKILL_NOCORPSE) !== 0;

    /* potential pet message; always clear global flag */
    const be_sad = game.iflags?.sad_feeling;
    if (game.iflags) game.iflags.sad_feeling = false;

    mtmp.mhp = 0; /* caller will usually have already done this */

    /* src/mon.c:3499 — KMH, conduct: the first kill is chronicled */
    if (!(xkill_flags & 0x4 /* XKILL_NOCONDUCT */)) {
        game.u.uconduct ||= {};
        if (!game.u.uconduct.killer) {
            const { livelog_add } = await import('./pline.js');
            livelog_add('killed for the first time');
        }
        game.u.uconduct.killer = (game.u.uconduct.killer | 0) + 1;
    }

    if (engulfing_u(mtmp))
        note_unported_mon('xkilled:wasinside');

    if (!nomsg) {
        const namedpet = mtmp.mgivenname && !game.u.uprops?.HALLUC;
        await You(`${nonliving(game.mons[mtmp.mnum]) ? 'destroy' : 'kill'} ${
            !canspotmon(mtmp) ? 'it'
              : !mtmp.mtame ? mon_nam(mtmp)
                : x_monnam(mtmp, namedpet ? ARTICLE_NONE : ARTICLE_THE,
                           'poor', namedpet ? SUPPRESS_SADDLE : 0, false)}!`);
    }

    if (mtmp.mtrapped) {
        const t = t_at(x, y);
        if (t && is_pit(t.ttyp)) {
            if (sobj_at(ONAMES.BOULDER, x, y))
                nocorpse = true;
            if (m_carrying(mtmp, ONAMES.BOULDER))
                note_unported_mon('xkilled:burycorpse');
        }
    }

    /* your pet knows who just killed it...watch out */
    if (mtmp.mtame && !mtmp.isminion && mtmp.edog)
        mtmp.edog.killed_by_u = 1;

    /* dispose of monster and make cadaver */
    const was_stoned = !!game.stoned;
    if (was_stoned)
        await monstone(mtmp);
    else
        await mondead(mtmp);

    if (be_sad)
        await You('have a sad feeling for a moment, then it passes.');

    const mdat = game.mons[mtmp.mnum]; /* mondead can change mtmp->data */
    const mndx = mtmp.mnum;

    if (!was_stoned && !nocorpse
        && (ACCESSIBLE(game.level?.at(x, y)?.typ) || is_pool(x, y))) {
        /* illogical but traditional "treasure drop" */
        if (!rn2(6) && !((game.mvitals?.[mndx]?.mvflags ?? 0) & MC_G_NOCORPSE)
            /* no extra item from swallower or steed */
            && (x !== game.u.ux || y !== game.u.uy)
            /* no extra item from kops--too easy to abuse */
            && mdat.mlet !== MONSYMS.S_KOP
            /* no items from cloned monsters */
            && !mtmp.mcloned) {
            const otmp = mkobj(OCLASSES.RANDOM_CLASS, true);
            /* don't create large objects from small monsters */
            const otyp = otmp.otyp;
            if (otmp.oclass === OCLASSES.FOOD_CLASS && !(mdat.mflags2 & MFLAGS.M2_COLLECT)
                && !otmp.oartifact) {
                /* newly created permafood from kills makes too much
                   nutrition in the late game */
                delobj(otmp);
            } else if (mdat.msize < MZ_HUMAN && otyp !== ONAMES.FIGURINE
                       && (otmp.owt > 30 || game.objects[otyp].oc_big)) {
                delobj(otmp);
            } else {
                /* flooreffects(otmp, x, y, "fall") is recorded; on ordinary
                   floor it is false and the object simply lands */
                place_object(otmp, x, y);
                stackobj(otmp);
            }
        }
        /* corpse--none if hero was inside the monster */
        if (await corpse_chance(mtmp, null, false))
            make_corpse(mtmp, CORPSTAT_NONE);
    }

    if (was_stoned) {
        game.stoned = false;
    } else {
        /* monster is gone, corpse or other object might now be visible */
        newsym(x, y);
    }

    /* Punish murder of a non-hostile human by a lawful or neutral hero. */
    if (is_human(mdat)
        && !(mdat.mflags2 & MFLAGS.M2_HOSTILE)
        && (mtmp.malign ?? 0) <= 0
        && (mndx < PMNAMES.PM_ARCHEOLOGIST || mndx > PMNAMES.PM_WIZARD)
        && mndx !== PMNAMES.PM_HUMAN
        && game.u.ualign.type !== A_CHAOTIC) {
        const intrinsic = game.u.intrinsic ||= {};
        intrinsic.HTelepat = (intrinsic.HTelepat | 0) & ~INTRINSIC;
        change_luck(-2);
        await You('murderer!');
        if (Blind()
            && !(intrinsic.HTelepat || game.u.uprops?.TELEPAT))
            see_monsters();
    }

    if ((mtmp.mpeaceful && !rn2(2)) || mtmp.mtame)
        change_luck(-1);
    if (is_unicorn(mdat)
        && sgn(game.u.ualign.type) === sgn(mdat.maligntyp)) {
        change_luck(-5);
        await You_feel('guilty...');
    }

    /* give experience points */
    const tmp = experience(mtmp, game.mvitals?.[mndx]?.died ?? 0);
    more_experienced(tmp, 0);
    await newexplevel(); /* will decide if you go up */

    /* src/mon.c:3674: apply special-kill adjustments, then the malign value
       fixed when the monster was created. */
    const alignlim = 10 + Math.trunc((game.moves || 0) / 200);
    if (mtmp.m_id === game.quest_status?.leader_m_id) {
        adjalign(-(game.u.ualign.record + Math.trunc(alignlim / 2)));
        game.u.ugangr = (game.u.ugangr || 0) + 7;
        change_luck(-20);
        note_unported_mon('xkilled:quest_leader');
    } else if (mdat.msound === MSOUND.MS_NEMESIS) {
        if (!game.quest_status?.killed_leader)
            adjalign(Math.trunc(alignlim / 4));
    } else if (mdat.msound === MSOUND.MS_GUARDIAN) {
        adjalign(-Math.trunc(alignlim / 8));
        game.u.ugangr = (game.u.ugangr || 0) + 1;
        change_luck(-4);
        note_unported_mon('xkilled:guardian_message');
    } else if (mtmp.ispriest) {
        const palign = mtmp.epri?.shralign
                    ?? mtmp.mextra?.epri?.shralign ?? A_NONE;
        const coaligned = sgn(palign) === sgn(game.u.ualign.type);
        adjalign(coaligned ? -2 : 2);
        if (coaligned)
            game.u.ublessed = 0;
        if (mdat.maligntyp === A_NONE)
            adjalign(Math.trunc(alignlim / 4));
    } else if (mtmp.mtame) {
        adjalign(-15);
        await You_hear(Hallucination()
            ? 'the studio audience applaud!'
            : 'the rumble of distant thunder...');
    } else if (mtmp.mpeaceful) {
        adjalign(-5);
    }
    adjalign(mtmp.malign || 0);
}

// src/mon.c:6058 shieldeff_mon() — the "resists!" flash.
//
// The two halves are gated DIFFERENTLY, and C's comment says why: the shield
// effect itself is visible whether or not you can make out the monster, so
// shieldeff() runs unconditionally, while the message needs cansee(). Gating
// both on cansee -- the obvious reading, since they describe one event --
// would drop the animation for an unseen resister.
//
// shieldeff (a display animation) and pline_mon are recorded; the cansee
// structure is real.
export function shieldeff_mon(mtmp) {
    note_unported_mon('shieldeff_mon:shieldeff');
    /* does not depend on seeing the monster; the shield effect is visible */
    if (cansee(mtmp.mx, mtmp.my))
        note_unported_mon('shieldeff_mon:pline_resists');
}

// src/mon.c:4322 wake_msg() — "%s wakes up!" when you see it happen.
//
// It tests mtmp->msleeping, so it MUST run before wakeup() clears that flag.
// C calls it as wakeup's first statement for exactly that reason; moving it
// after the clear silences the message permanently.
//
// `interesting` (wakeup's via_attack) only picks the punctuation: "!" for an
// attack, "." otherwise. A flesh golem additionally gets " It's alive!".
export async function wake_msg(mtmp, interesting) {
    if (mtmp.msleeping && canseemon(mtmp)) {
        const alive = mtmp.mnum === PMNAMES.PM_FLESH_GOLEM
            ? " It's alive!" : '';
        await pline(`${Monnam(mtmp)} wakes up${interesting ? '!' : '.'}${alive}`);
    }
}

// src/mon.c:4409 seemimic() — a mimic is discovered and drops its disguise.
//
// is_blocker_appear is captured FIRST, before m_ap_type is cleared, because
// once the disguise is gone the monster no longer appears as anything that
// blocks light. Reading it after the clear would always be false and the
// square would stay dark. Same save-before-mutate shape as wakeup's
// was_sleeping and hmon's anger_guards.
//
// The unblock is conditional on does_block() as well: the mimic may be
// standing somewhere that blocks light on its own account, and in that case
// the point stays blocked.
//
// freemcorpsenm leaves the extra slot allocated and resets its value to
// NON_PM. This port stores the same payload directly on the monster.
export function seemimic(mtmp) {
    const is_blocker_appear = is_lightblocker_mappear(mtmp);

    if (mtmp.mcorpsenm !== undefined && mtmp.mcorpsenm !== NON_PM)
        mtmp.mcorpsenm = NON_PM;

    mtmp.m_ap_type = M_AP_NOTHING;
    mtmp.mappearance = 0;

    /*  Discovered mimics don't block light. */
    if (is_blocker_appear
        && !does_block(mtmp.mx, mtmp.my, game.level.at(mtmp.mx, mtmp.my)))
        unblock_point(mtmp.mx, mtmp.my);

    newsym(mtmp.mx, mtmp.my);
}

// src/mon.c:4431 normal_shape(). Shape protection acts on every monster,
// including forms and disguises which the hero cannot currently see.
export async function normal_shape(mon) {
    const mcham = mon.cham ?? NON_PM;
    if (ismnum(mcham)) {
        const wasCancelled = mon.mcan;
        await newcham(mon, game.mons[mcham], NC_SHOW_MSG);
        mon.cham = NON_PM;
        if (wasCancelled)
            mon.mcan = 1;
        newsym(mon.mx, mon.my);
    }

    const { is_were, new_were } = await import('./were.js');
    if (is_were(mon.data) && mon.data.mlet !== MONSYMS.S_HUMAN)
        await new_were(mon);

    if (M_AP_TYPE(mon) !== M_AP_NOTHING) {
        if (!mon.meating) {
            if (M_AP_TYPE(mon) !== M_AP_MONSTER)
                mon.msleeping = 1;
            seemimic(mon);
        } else {
            finish_meating(mon);
        }
    }
}

// src/mon.c:4621 rescham().
export async function rescham() {
    for (const mon of (game.level?.monsters || []))
        await normal_shape(mon);
}

// src/mon.c:4627 m_restartcham() and restartcham().
export function restartcham() {
    for (const mon of (game.level?.monsters || [])) {
        if (!mon.mcan) {
            mon.cham = (mon.data?.mflags2 & MFLAGS.M2_SHAPESHIFTER)
                ? mon.mnum : NON_PM;
        }
        if (mon.data?.mlet === MONSYMS.S_MIMIC && mon.msleeping) {
            set_mimic_sym(mon);
            newsym(mon.mx, mon.my);
        }
    }
}

// src/mon.c:1847 mpickstuff() — a monster picks up ONE object from its square.
//
// Three early returns before anything else, and their order matters because
// the second one DRAWS:
//   a shopkeeper in its own shop never picks up (it would leave the door);
//   a non-tame monster inside a shop returns on rn2(25), so 24 times in 25 it
//     does not shop -- this is the function's only draw and it is spent ONLY
//     inside a shop;
//   an item it cannot reach (a pool it cannot swim) is skipped.
//
// The corpse rule reads backwards until you follow the negations: most
// monsters SKIP corpses, and the exceptions -- nymphs, petrifying corpses,
// lizard, acidic -- fall through to can_carry() instead.
//
// Returns after the FIRST object taken; C's comment says "pick only one".
//
// distant_name/doname, mpickobj and check_gear_next_turn are recorded.
export async function mpickstuff(mtmp) {
    const mdat = game.mons[mtmp.mnum];

    /* prevent shopkeepers from leaving the door of their shop */
    if (mtmp.isshk && inhishop(mtmp))
        return false;

    /* non-tame monsters normally don't go shopping */
    if (!mtmp.mtame && in_rooms(mtmp.mx, mtmp.my, SHOPBASE)?.length
        && rn2(25))
        return false;

    /* item in a pool, but monster can't swim */
    if (!could_reach_item(mtmp, mtmp.mx, mtmp.my))
        return false;

    const here = (game.level.objects || [])
                     .filter(o => o.ox === mtmp.mx && o.oy === mtmp.my);
    for (const otmp of here) {
        /* avoid special items; once the hero picks them up they cease being
           special and become eligible for normal pickup */
        /* avoid special items; once the hero picks them up they cease being
           special and become eligible for normal pickup */
        if (is_mines_prize(otmp) || is_soko_prize(otmp))
            continue;

        if (mon_would_take_item(mtmp, otmp)) {
            /* Nymphs take everything.  Most monsters don't pick up corpses. */
            if (otmp.otyp === ONAMES.CORPSE && mdat.mlet !== MONSYMS.S_NYMPH
                && !touch_petrifies(game.mons[otmp.corpsenm])
                && otmp.corpsenm !== PMNAMES.PM_LIZARD
                && !acidic(game.mons[otmp.corpsenm]))
                continue;
            if (!can_touch_safely(mtmp, otmp))
                continue;
            const carryamt = can_carry(mtmp, otmp);
            if (carryamt === 0)
                continue;

            /* handle cases where the critter can only get some */
            let otmp3 = otmp;
            if (carryamt !== otmp.quan)
                otmp3 = splitobj(otmp, carryamt);

            if (cansee(mtmp.mx, mtmp.my)) {
                /* C calls distant_name() for its SIDE EFFECTS even when the
                   result is not printed, and does so BEFORE the extract */
                const otmpname = distant_name(otmp, doname);
                if (game.flags?.verbose)
                    await pline(`${Monnam(mtmp)} picks up ${otmpname}.`);
            }
            obj_extract_self(otmp3);        /* remove from floor */
            /* src/steal.c:618 mpickobj() may merge and free otmp3. Its
               conditional markers cover the unported billing, light, and
               figurine branches without flagging every ordinary pickup. */
            mpickobj(mtmp, otmp3);
            check_gear_next_turn(mtmp);
            newsym(mtmp.mx, mtmp.my);
            return true;                    /* pick only one object */
        }
    }
    return false;
}

/* include/monflag.h:201 — corpse-generation bits, via the MFLAGS table. */
const { G_NOCORPSE: MC_G_NOCORPSE, G_FREQ: MC_G_FREQ } = MFLAGS;

// src/mon.c:564 make_corpse() — drop the cadaver. The dragon-scale,
// unicorn-horn, golem and mummy/zombie special arms record when such a
// creature dies; the ordinary G_NOCORPSE-gated mkcorpstat path is real.
export function make_corpse(mtmp, corpseflags) {
    const mdat = game.mons[mtmp.mnum];
    const mndx = mtmp.mnum;
    const x = mtmp.mx, y = mtmp.my;
    let corpstatflags = corpseflags;
    let obj = null;
    let num;

    if (mtmp.female)
        corpstatflags |= CORPSTAT_FEMALE;
    else if (!is_neuter(mdat))
        corpstatflags |= CORPSTAT_MALE;

    const P = PMNAMES;
    const in_range = (lo, hi) => mndx >= lo && mndx <= hi;
    let default_1 = false;

    if (in_range(P.PM_GRAY_DRAGON, P.PM_YELLOW_DRAGON)) {
        /* dragon scales; relies on scales matching the dragon order */
        if (!rn2(mtmp.mrevived ? 20 : 3)) {
            num = ONAMES.GRAY_DRAGON_SCALES + mndx - P.PM_GRAY_DRAGON;
            obj = mksobj_at(num, x, y, false, false);
            obj.spe = 0;
            obj.cursed = obj.blessed = false;
        }
        default_1 = true;
    } else if (in_range(P.PM_WHITE_UNICORN, P.PM_BLACK_UNICORN)) {
        if (mtmp.mrevived && rn2(2)) {
            note_unported_mon('make_corpse:regrown horn crumbles');
        } else {
            obj = mksobj_at(ONAMES.UNICORN_HORN, x, y, true, false);
            if (obj && mtmp.mrevived)
                obj.degraded_horn = 1;
        }
        default_1 = true;
    } else if (mndx === P.PM_LONG_WORM) {
        mksobj_at(ONAMES.WORM_TOOTH, x, y, true, false);
        default_1 = true;
    } else if (mndx === P.PM_VAMPIRE || mndx === P.PM_VAMPIRE_LEADER) {
        /* include mtmp in the mkcorpstat() call */
        num = undead_to_corpse(mndx);
        corpstatflags |= CORPSTAT_INIT;
        obj = mkcorpstat(ONAMES.CORPSE, mtmp, num, x, y, corpstatflags);
        obj.age -= (TAINT_AGE + 1); /* this is an *OLD* corpse */
    } else if (mdat.mlet === MONSYMS.S_MUMMY
               || mdat.mlet === MONSYMS.S_ZOMBIE) {
        /* src/mon.c:668 — the named mummy/zombie cases; kinds without an
           undead_to_corpse mapping (were-, giant-class uniques) fall to
           default_1 in C via the explicit case list, matched here by
           undead_to_corpse returning the index unchanged */
        num = undead_to_corpse(mndx);
        if (num !== mndx) {
            corpstatflags |= CORPSTAT_INIT;
            obj = mkcorpstat(ONAMES.CORPSE, mtmp, num, x, y, corpstatflags);
            obj.age -= (TAINT_AGE + 1); /* this is an *OLD* corpse */
            mtmp.mgivenname = null; /* free_mgivenname */
        } else {
            default_1 = true;
        }
    } else if (mndx === P.PM_IRON_GOLEM) {
        num = d(2, 6);
        while (num--)
            obj = mksobj_at(ONAMES.IRON_CHAIN, x, y, true, false);
        mtmp.mgivenname = null;
    } else if (mndx === P.PM_GLASS_GOLEM) {
        num = d(2, 4); /* very low chance of creating all glass gems */
        while (num--)
            obj = mksobj_at(ONAMES.WORTHLESS_WHITE_GLASS + rn2(9),
                            x, y, true, false); /* FIRST..LAST_GLASS_GEM */
        mtmp.mgivenname = null;
    } else if (mndx === P.PM_CLAY_GOLEM) {
        obj = mksobj_at(ONAMES.ROCK, x, y, false, false);
        obj.quan = rn2(20) + 50;
        obj.owt = weight(obj);
        mtmp.mgivenname = null;
    } else if (mndx === P.PM_STONE_GOLEM) {
        corpstatflags &= ~CORPSTAT_INIT;
        obj = mkcorpstat(ONAMES.STATUE, null, mndx, x, y, corpstatflags);
    } else if (mndx === P.PM_WOOD_GOLEM) {
        num = d(2, 4);
        while (num--) {
            obj = mksobj_at(rn2(2) ? ONAMES.QUARTERSTAFF
                            : rn2(3) ? ONAMES.SMALL_SHIELD
                            : rn2(3) ? ONAMES.CLUB
                            : rn2(3) ? ONAMES.ELVEN_SPEAR
                            : ONAMES.BOOMERANG, x, y, true, false);
        }
        mtmp.mgivenname = null;
    } else if (mndx === P.PM_ROPE_GOLEM) {
        num = rn2(3);
        while (num-- > 0) {
            obj = mksobj_at(rn2(2) ? ONAMES.LEASH
                            : rn2(3) ? ONAMES.BULLWHIP
                            : ONAMES.GRAPPLING_HOOK, x, y, true, false);
        }
        mtmp.mgivenname = null;
    } else if (mndx === P.PM_LEATHER_GOLEM) {
        num = d(2, 4);
        while (num--)
            obj = mksobj_at(rn2(4) ? ONAMES.LEATHER_ARMOR
                            : rn2(3) ? ONAMES.LEATHER_CLOAK
                            : ONAMES.SADDLE, x, y, true, false);
        mtmp.mgivenname = null;
    } else if (mndx === P.PM_GOLD_GOLEM) {
        /* Good luck gives more coins */
        obj = mkgold(200 - rnl(101), x, y);
        mtmp.mgivenname = null;
    } else if (mndx === P.PM_PAPER_GOLEM) {
        num = rnd(4);
        while (num--)
            obj = mksobj_at(ONAMES.SCR_BLANK_PAPER, x, y, true, false);
        mtmp.mgivenname = null;
    } else if (mndx === P.PM_GRAY_OOZE || mndx === P.PM_BROWN_PUDDING
               || mndx === P.PM_GREEN_SLIME
               || mndx === P.PM_BLACK_PUDDING) {
        obj = mksobj_at(ONAMES.GLOB_OF_BLACK_PUDDING
                        - (P.PM_BLACK_PUDDING - mndx), x, y, true, false);
        /* obj_nexto/obj_meld glob merging is recorded when piles meet */
        note_unported_mon('make_corpse:glob merge check');
        mtmp.mgivenname = null;
        newsym(x, y);
        return obj;
    } else {
        default_1 = true;
    }

    if (default_1) {
        /* All special cases precede the G_NOCORPSE check (mon.c:910) */
        if ((game.mvitals?.[mndx]?.mvflags ?? 0) & MC_G_NOCORPSE)
            return null;
        corpstatflags |= CORPSTAT_INIT;
        /* preserve the unique traits of some creatures */
        const keep = (mtmp.isshk || mtmp.mtame
                      || (mdat.geno & G_UNIQ) !== 0
                      || is_rider(mdat) || mdat.mlet === MONSYMS.S_TROLL
                      || mtmp.m_id === game.quest_status?.leader_m_id
                      || dmgtype(mdat, ATTKS.AD_SEDU)
                      || dmgtype(mdat, ATTKS.AD_SSEX));
        obj = mkcorpstat(ONAMES.CORPSE, keep ? mtmp : null, mndx,
                         x, y, corpstatflags);
        if (corpseflags & CORPSTAT_BURIED)
            note_unported_mon('make_corpse:burythem');
    }

    if (!obj)
        return null;

    /* bypass_obj under context.bypasses is polymorph state; recorded */
    if (mtmp.mgivenname)
        note_unported_mon('make_corpse:oname');

    /* obj->dknown stays 0: "It was hidden under a green mold corpse!" */
    return obj;
}


// src/mon.c:3181 corpse_chance() -- does the kill leave a corpse at all?
// The ordinary tail is the draw: !rn2(2 + rare + verysmall).
export async function corpse_chance(mon, magr, was_swallowed) {
    const A = ATTKS;
    const mdat = game.mons[mon.mnum];

    if (mdat.mlet === MONSYMS.S_LICH) {
        note_unported_mon('corpse_chance:lich_crumble');
        return false;
    }

    for (let i = 0; i < 6; i++) {
        if (mdat.mattk[i][0] === A.AT_BOOM) {
            /* corpse_chance computes the contained-blast damage even when it
               goes on to call mon_explodes(), which rolls the damage again. */
            if (mdat.mattk[i][2])
                d(mdat.mattk[i][2], mdat.mattk[i][3]);
            else if (mdat.mattk[i][3])
                d(mdat.mlevel + 1, mdat.mattk[i][3]);
            if (was_swallowed && magr)
                note_unported_mon('corpse_chance:swallowed_AT_BOOM');
            else
                await mon_explodes(mon, mdat.mattk[i]);
            return false;
        }
    }

    /* LEVEL_SPECIFIC_NOCORPSE — Vlad's tower / astral; no such levels yet */

    if (((bigmonst(mdat) || mon.mnum === PMNAMES.PM_LIZARD) && !mon.mcloned)
        || mdat.mlet === MONSYMS.S_GOLEM || is_rider(mdat) || mon.isshk)
        return true;
    const tmp = 2 + ((mdat.geno & MC_G_FREQ) < 2 ? 1 : 0)
                + (verysmall(mdat) ? 1 : 0);
    return !rn2(tmp);
}

// src/mon.c:3253 mondied() — monster killed by another monster: mondead()
// plus the corpse. mondead's full detach (worm segments, shop bookkeeping,
// vault guards, life-saving) is a slice: the map removal, so the fight's
// survivor can occupy the square.
// src/mon.c:3086 mondead() — the monster dies, WITHOUT a corpse. The slice
// ported is the map and list removal plus m_detach()'s relobj (mon.c:2779),
// which drops what the creature carried at the square it died on.
export async function mondead(mdef) {
    const mx = mdef.mx, my = mdef.my;
    const be_sad = !!game.iflags?.sad_feeling;

    if (game.iflags)
        game.iflags.sad_feeling = false;

    mdef.mhp = 0;
    if (be_sad)
        await You('have a sad feeling for a moment, then it passes.');
    /* src/mon.c:3134 — mvitals[].died doubles as the total-dead count and
       the experience factor; #vanquished reads it */
    {
        const mv = (game.mvitals ||= [])[mdef.mnum] ||= {};
        if ((mv.died | 0) < 255)
            mv.died = (mv.died | 0) + 1;
    }
    /* src/mon.c:3147, dead Kops may return. The branch runs before the
       original is detached, and case 1 prefers the down staircase. */
    if (mdef.data.mlet === MONSYMS.S_KOP) {
        const roll = rnd(5);
        const down = (() => {
            for (let stway = game.stairs; stway; stway = stway.next)
                if (!stway.isladder && !stway.up)
                    return stway;
            return null;
        })();
        if (roll === 1 && down)
            makemon(mdef.data, down.sx, down.sy, NO_MM_FLAGS);
        else if (roll === 1 || roll === 2)
            makemon(mdef.data, 0, 0, NO_MM_FLAGS);
    }
    /* src/mon.c:3170, death proves the remembered invisible marker stale.
       Clear it before detaching so the corpse or dropped object can replace
       it on the same screen boundary. */
    unmap_invisible(mx, my);
    /* src/mon.c:3177 m_detach(). A dead glowing monster must not leave an
       orphaned source that forces vision recalculation on later turns. */
    if (mx > 0 && emits_light(mdef.data))
        del_light_source(LS_MONSTER, mdef.m_id);
    remove_monster(mx, my);
    const idx = (game.level?.monsters || []).indexOf(mdef);
    if (idx >= 0)
        game.level.monsters.splice(idx, 1);

    /* m_detach() handles quest deaths after taking the monster off the map
       and before dropping its inventory. The order keeps the death pager
       ahead of the Bell and quest artifact appearing on the floor. */
    if (mdef.data.msound === MSOUND.MS_NEMESIS) {
        const { nemdead, nemesis_stinks } = await import('./quest.js');
        await nemdead();
        const { stinky_nemesis } = await import('./questpgr.js');
        if (stinky_nemesis())
            await nemesis_stinks(mx, my);
    }
    if (mdef.data.msound === MSOUND.MS_LEADER) {
        const { leaddead } = await import('./quest.js');
        leaddead();
    }

    /* "this assumes that the dead monster's map coordinates remain accurate":
       both relobj and any corpse read mx,my after this point */
    mdef.mx = mx; mdef.my = my;
    if ((mdef.minvent || []).length) {
        const { relobj } = await import('./steal.js');
        await relobj(mdef, 1, false);
    }
    if (mdef.isshk)
        shkgone(mdef);
    /* src/mon.c:2808 m_detach(): a dead steed immediately stops being the
       hero's mount. DISMOUNT_GENERIC is deliberately silent, but its cleanup
       affects later display, targeting, and RNG through mattacku(). */
    if (mdef === game.u.usteed) {
        const { dismount_steed } = await import('./steed.js');
        await dismount_steed(0 /* DISMOUNT_GENERIC */);
    }
}

// src/mon.c:3253 mondied() — mondead() plus, maybe, a corpse.
export async function mondied(mdef) {
    const mx = mdef.mx, my = mdef.my;

    await mondead(mdef);

    if (await corpse_chance(mdef, null, false)
        && (ACCESSIBLE(game.level?.at(mx, my)?.typ) || is_pool(mx, my)))
        make_corpse(mdef, CORPSTAT_NONE);

    newsym(mx, my);
}

/* js/makemon.js (grow_up) needs mondied but a static import back into this
   file closes an eval-time cycle; publish on the shared game object, the same
   shape hack.js uses for in_rooms. */
game._mondied_ref = mondied;

// src/mon.c:3377 monkilled() — "<Monster> is killed!" when the hero can see
// it, then mondied(). The golem "May it rust in peace" arms and the
// disintegration special cases record.
export async function monkilled(mdef, fltxt, how) {
    const mptr = game.mons[mdef.mnum];

    if (fltxt !== null && fltxt !== undefined && cansee(mdef.mx, mdef.my))
        await pline(`${Monnam(mdef)} is ${
            nonliving(mptr) ? 'destroyed' : 'killed'}${
            fltxt ? ' by the ' + fltxt : ''}!`);
    else if (mdef.mtame)
        (game.iflags ||= {}).sad_feeling = true;

    await mondied(mdef);
}

// src/mon.c:3864 ok_to_obliterate() — monsters that should not be
// obliterated by elemental_clog. The C tests the mextra blocks; this port
// also honors the flag fields its monster records actually carry.
function ok_to_obliterate(mtmp) {
    const mdat = game.mons[mtmp.mnum];
    if (mdat === game.mons[PMNAMES.PM_WIZARD_OF_YENDOR] || is_rider(mdat)
        || has_emin(mtmp) || has_epri(mtmp) || has_eshk(mtmp)
        || mtmp.isminion || mtmp.ispriest || mtmp.isshk
        || mtmp === game.u.ustuck || mtmp === game.u.usteed)
        return false;
    return true;
}

// src/mon.c:3878 elemental_clog() — the endgame planes are so full of
// monsters that a monster with no place to go obliterates a less important
// one and takes its spot: an off-plane elemental first, then a home
// elemental, the weakest ordinary hostile, any other hostile, then a pet.
let elemental_clog_msgmv = 0;       /* static long msgmv = 0L */

export async function elemental_clog(mon) {
    let m_lev = 0;
    let m1 = null, m2 = null, m3 = null, m4 = null, m5 = null;
    const zm = null;

    if (In_endgame(game.u.uz)) {
        if (!elemental_clog_msgmv
            || (game.moves - elemental_clog_msgmv) > 200) {
            if (!elemental_clog_msgmv || rn2(2))
                await You_feel('besieged.');
            elemental_clog_msgmv = game.moves;
        }
        /*
         * m1 an elemental from another plane.
         * m2 an elemental from this plane.
         * m3 the least powerful monst encountered in loop so far.
         * m4 some other non-tame monster.
         * m5 a pet.
         */
        for (const mtmp of (game.level.monsters || [])) {
            if (DEADMONSTER(mtmp) || mtmp === mon)
                continue;
            if (mtmp.mx === 0 && mtmp.my === 0)
                continue;
            if (mon_has_amulet(mtmp) || !ok_to_obliterate(mtmp))
                continue;
            const mdat = game.mons[mtmp.mnum];
            if (mdat.mlet === MONSYMS.S_ELEMENTAL) {
                const { is_home_elemental } = await import('./makemon.js');
                if (!is_home_elemental(mdat)) {
                    if (!m1)
                        m1 = mtmp;
                } else {
                    if (!m2)
                        m2 = mtmp;
                }
            } else {
                if (!mtmp.mtame) {
                    if (!m_lev || mtmp.m_lev < m_lev) {
                        m_lev = mtmp.m_lev;
                        m3 = mtmp;
                    } else if (!m4) {
                        m4 = mtmp;
                    }
                } else {
                    if (!m5)
                        m5 = mtmp;
                    break;
                }
            }
        }
        const mtmp = m1 ? m1 : m2 ? m2 : m3 ? m3 : m4 ? m4 : m5 ? m5 : zm;
        if (mtmp) {
            const mx = mtmp.mx, my = mtmp.my;

            mtmp.mstate = (mtmp.mstate | 0) | MON_OBLITERATE;
            mongone(mtmp);
            /* rloc_to(mon, mx, my) — same remove/place reduction as
               mnexto below */
            if (mon.mx || mon.my)
                remove_monster(mon.mx, mon.my);
            place_monster(mon, mx, my);
            newsym(mon.mx, mon.my);

        /* last resort - migrate mon to the next plane */
        } else if (!Is_astralevel(game.u.uz)) {
            note_unported_mon('elemental_clog:migrate_mon');
        }
    }
}

// src/mon.c:3955 mnexto() — move a monster next to the hero: enexto()'s
// two-pass search (whose collect_coords ring shuffles are the draws), then
// rloc_to. Overcrowding sends the monster to limbo; recorded.
export function mnexto(mtmp, rlocflags) {
    if (mtmp === game.u.usteed) {
        mtmp.mx = game.u.ux;
        mtmp.my = game.u.uy;
        return;
    }

    const mm = { x: 0, y: 0 };
    const mdat = game.mons[mtmp.mnum];
    if (!(enexto_core(mm, game.u.ux, game.u.uy, mdat, GP_CHECKSCARY, goodpos)
          || enexto_core(mm, game.u.ux, game.u.uy, mdat, 0, goodpos))
        || !isok(mm.x, mm.y)) {
        note_unported_mon('mnexto:deal_with_overcrowding');
        return;
    }
    if ((rlocflags & RLOC_MSG) !== 0)
        return rloc_to_flag(mtmp, mm.x, mm.y, rlocflags);

    /* rloc_to_flag(mtmp, mm.x, mm.y, rlocflags): the no-message path is
       kept synchronous for level-arrival callers which do not await it. */
    if (mtmp.mx || mtmp.my) {
        const oldx = mtmp.mx, oldy = mtmp.my;
        remove_monster(oldx, oldy);
        newsym(oldx, oldy);
    }
    place_monster(mtmp, mm.x, mm.y);
    newsym(mtmp.mx, mtmp.my);
}

// src/mon.c:4031 mnearto() — like mnexto() but around <x,y>; with
// move_other, evict whoever stands there first and re-place them after.
// Returns 0 on failure, 1 on success, 2 when another monster was moved.
// rloc_to_flag is the same remove+place+newsym+set_apparxy reduction
// mnexto uses; the overcrowding fallback goes through elemental_clog in
// the endgame (deal_with_overcrowding, mon.c:3986) and records elsewhere.
export async function mnearto(mtmp, x, y, move_other, rlocflags) {
    let othermon = null;
    let newx, newy;
    const mm = { x: 0, y: 0 };
    let res = 1;

    if (mtmp.mx === x && mtmp.my === y && m_at(x, y) === mtmp)
        return res;

    if (move_other && (othermon = m_at(x, y)) != null) {
        /* take othermon off the map; it might end up immediately
           returning but for the moment it is leaving */
        remove_monster(othermon.mx, othermon.my); /* mon_leaving_level() */
        othermon.mx = othermon.my = 0; /* 'othermon' is not on the map */
        othermon.mstate = (othermon.mstate | 0) | 0x01; /* MON_OFFMAP */
    }

    newx = x;
    newy = y;
    if (!goodpos(newx, newy, mtmp, 0)) {
        /* Actually we have real problems if enexto ever fails. */
        if (!enexto(mm, newx, newy, mtmp.data)
            || !isok(mm.x, mm.y)) {
            if (othermon) {
                /* deal_with_overcrowding(othermon) */
                if (In_endgame(game.u.uz))
                    await elemental_clog(othermon);
                else
                    note_unported_mon('mnearto:m_into_limbo');
            }
            return 0;
        }
        newx = mm.x;
        newy = mm.y;
    }
    await rloc_to_flag(mtmp, newx, newy, rlocflags);

    if (move_other && othermon) {
        res = 2; /* moving another monster out of the way */
        /* 'move_other'==FALSE this time; fail rather than recurse */
        if (!await mnearto(othermon, x, y, false, rlocflags)) {
            if (In_endgame(game.u.uz))
                await elemental_clog(othermon);
            else
                note_unported_mon('mnearto:m_into_limbo');
        }
    }

    return res;
}

/* ==== shapechanger creation (src/mon.c) ==== */

/* animal_list for pick_animal(): every is_animal permonst, built once.
   src/mon.c:4837 — LOW_PM to SPECIAL_PM (330), is_animal is M1_ANIMAL
   (0x40000); this list held 62 entries instead of C's 98 because it used a
   wrong bit and a wrong bound, so every chameleon form re-roll drew a
   different modulus. */
let _animal_list = null;
function mon_animal_list() {
    _animal_list = [];
    for (let i = 0; i < PMNAMES.SPECIAL_PM; i++)
        if (game.mons[i] && is_animal(game.mons[i]))
            _animal_list.push(i);
}
const SPECIAL_PM_MON = PMNAMES?.SPECIAL_PM ?? 330;

// src/mon.c:4855 pick_animal()
function pick_animal() {
    if (!_animal_list)
        mon_animal_list();
    return _animal_list[rn2(_animal_list.length)];
}

// src/mon.c:4872 decide_to_shapeshift() — once per turn from m_calcdistress:
// a regular shapeshifter re-rolls its form when mspec_used is spent; a
// vampshifter manages the vampire/bat/fog/wolf cycle by health.
export async function decide_to_shapeshift(mon) {
    let ptr = null;
    let mndx;
    const was_female = mon.female;
    let dochng = false;

    if (!is_vampshifter_mon(mon)) {
        /* regular shapeshifter; 'ptr' is Null */
        if (!mon.mspec_used && !rn2(6)) {
            dochng = true;
            mon.mspec_used = 3 + rn2(10);
        }
    } else if (!(mon.mstrategy & STRAT_WAITFORU)) {
        /* The vampire has to be in good health (mhp) to maintain
         * its shifted form.
         *
         * If we're shifted and getting low on hp, maybe shift back, or
         * if we're a fog cloud at full hp, maybe pick a different shape.
         * If we're not already shifted and in good health, maybe shift.
         */
        if (game.mons[mon.mnum].mlet !== MONSYMS.S_VAMPIRE) {
            if ((mon.mhp <= Math.trunc((mon.mhpmax + 5) / 6)) && rn2(4)
                && ismnum(mon.cham)) {
                ptr = game.mons[mon.cham];
                dochng = true;
            } else if (mon.mnum === PMNAMES.PM_FOG_CLOUD
                       && mon.mhp === mon.mhpmax && !rn2(4)
                       && (!canseemon(mon)
                           || mdistu(mon) > BOLT_LIM * BOLT_LIM)) {
                /* if a fog cloud, maybe change to wolf or vampire bat;
                   those are more likely to take damage--at least when
                   tame--and then switch back to vampire; they'll also
                   switch to fog cloud if they encounter a closed door */
                mndx = pickvampshape(mon);
                if (ismnum(mndx)) {
                    ptr = game.mons[mndx];
                    dochng = (mndx !== mon.mnum);
                }
            }
            const { closed_door } = await import('./cmd.js');
            if (dochng && amorphous(game.mons[mon.mnum])
                && closed_door(mon.mx, mon.my)) {
                /* mon.c:4917 — an amorphous form re-solidifying inside a
                   closed doorway is teleported off it first: enexto()'s
                   collect_coords shuffles draw, then rloc_to(). */
                const new_xy = { x: 0, y: 0 };
                const { enexto } = await import('./teleport.js');
                if (enexto(new_xy, mon.mx, mon.my, ptr)) {
                    /* rloc_to(mon, new_xy.x, new_xy.y) */
                    remove_monster(mon.mx, mon.my);
                    const oldx = mon.mx, oldy = mon.my;
                    place_monster(mon, new_xy.x, new_xy.y);
                    newsym(oldx, oldy);
                    newsym(mon.mx, mon.my);
                }
            }
        } else {
            if (mon.mhp >= Math.trunc(9 * mon.mhpmax / 10) && !rn2(6)
                && (!canseemon(mon)
                    || mdistu(mon) > BOLT_LIM * BOLT_LIM))
                dochng = true; /* 'ptr' stays Null */
        }
    }
    if (dochng) {
        if (await newcham(mon, ptr, NC_SHOW_MSG)) {
            /* for vampshift, override the 10% chance for sex change
               (by forcing original gender in case that occurred) */
            if (is_vampshifter_mon(mon)) {
                ptr = game.mons[mon.mnum];
                if (!is_male(ptr) && !is_female(ptr) && !is_neuter(ptr))
                    mon.female = was_female;
            }
        }
    }
}

// src/mon.c:4941 pickvampshape()
function pickvampshape(mon) {
    let mndx = mon.cham, wolfchance = 10;
    const PM_VLAD = PMNAMES.PM_VLAD_THE_IMPALER,
          PM_VLORD = PMNAMES.PM_VAMPIRE_LEADER,
          PM_VAMP = PMNAMES.PM_VAMPIRE;

    switch (mndx) {
    case PM_VLAD:
        wolfchance = 3;
        /* FALLTHRU */
    case PM_VLORD:
        if (!rn2(wolfchance)
            && !is_pool_or_lava_mon(mon.mx, mon.my)) {
            mndx = PMNAMES.PM_WOLF;
            break;
        }
        /* FALLTHRU */
    case PM_VAMP:
        mndx = !rn2(4) ? PMNAMES.PM_FOG_CLOUD : PMNAMES.PM_VAMPIRE_BAT;
        break;
    }
    /* return to base form if the target is gone, or randomly when already
       in an alternate form */
    if (((game.mvitals?.[mndx]?.mvflags ?? 0) & 0x02 /* G_GENOD */)
        || (mon.mnum !== mon.cham && !rn2(4)))
        mndx = mon.cham;
    return mndx;
}

function is_pool_or_lava_mon(x, y) {
    const t = game.level?.at(x, y)?.typ ?? 0;
    return t === 16 /* POOL */ || t === 17 /* MOAT */ || t === 19 /* WATER */
        || t === 21 /* LAVAPOOL */;
}

// src/mon.c:5171 select_newcham_form() — creation-relevant arms.
function select_newcham_form(mon) {
    let mndx = -1;
    switch (mon.cham) {
    case PMNAMES.PM_SANDESTIN:
        if (rn2(7))
            mndx = pick_nasty(game.mons[PMNAMES.PM_ARCHON].difficulty - 1);
        break;
    case PMNAMES.PM_DOPPELGANGER:
        if (!rn2(7)) {
            mndx = pick_nasty(
                game.mons[PMNAMES.PM_JABBERWOCK].difficulty - 1);
        } else if (rn2(3)) { /* role monsters */
            mndx = tt_doppel(mon);
        } else if (!rn2(3)) { /* quest guardians */
            mndx = rn1(PMNAMES.PM_APPRENTICE - PMNAMES.PM_STUDENT + 1,
                       PMNAMES.PM_STUDENT);
            /* avoid own role's guardian */
            if (mndx === guardnum_of_urole())
                mndx = -1;
        } else { /* general humanoids */
            let tryct = 5;
            do {
                mndx = rn1(SPECIAL_PM_MON - 0 /* LOW_PM */, 0);
                if (humanoid(game.mons[mndx]) && polyok(game.mons[mndx]))
                    break;
            } while (--tryct > 0);
            if (!tryct)
                mndx = -1;
        }
        break;
    case PMNAMES.PM_CHAMELEON:
        if (!rn2(3))
            mndx = pick_animal();
        break;
    case PMNAMES.PM_VLAD_THE_IMPALER:
    case PMNAMES.PM_VAMPIRE_LEADER:
    case PMNAMES.PM_VAMPIRE:
        mndx = pickvampshape(mon);
        break;
    default:
        break;
    }
    /* the NON_PM dragon-armor arm needs worn dragon scales */

    /* src/mon.c:5213 — "if no form was specified above, pick one at random
       now". The modulus is the whole non-special monster table; the loop
       repeats only while the rogue-level uppercase clause holds, so off
       that level a single draw stands even when validspecmon rejects it
       (newcham's own accept loop re-rolls). */
    if (mndx === -1) {
        let tryct = 50;
        do {
            mndx = rn1(SPECIAL_PM_MON - 0 /* LOW_PM */, 0);
        } while (--tryct > 0 && !validspecmon(mon, mndx)
                 && (tryct > 40 && Is_rogue_level(game.u.uz)
                     && !/[A-Z]/.test(def_monsyms[game.mons[mndx].mlet] ?? '')));
    }
    return mndx;
}

// src/mon.c:5015 isspecmon() — nonshapechangers who warrant special
// polymorph handling.
function isspecmon(mon) {
    return (mon.isshk || mon.ispriest || mon.isgd
            || mon.m_id === game.quest_status?.leader_m_id);
}

// src/mon.c:5024 validspecmon()
export function validspecmon(mon, mndx) {
    if (mndx === NON_PM)
        return true; /* caller wants random */

    if (!accept_newcham_form(mon, mndx))
        return false; /* geno'd or !polyok */

    if (isspecmon(mon)) {
        const ptr = game.mons[mndx];

        /* reject notake because object manipulation is expected
           and nohead because speech capability is expected */
        if (notake(ptr) || !has_head(ptr))
            return false;
    }
    return true; /* potential new form is ok */
}

// src/mon.c:5228 accept_newcham_form() — mdat or null.
function accept_newcham_form(mon, mndx) {
    if (mndx === NON_PM || mndx < 0)
        return null;
    const mdat = game.mons[mndx];
    if (((game.mvitals?.[mndx]?.mvflags ?? 0) & G_GENOD) !== 0)
        return null;
    if (mndx === PMNAMES.PM_ORC || mndx === PMNAMES.PM_GIANT
        || mndx === PMNAMES.PM_ELF || mndx === PMNAMES.PM_HUMAN)
        return null; /* is_placeholder */
    /* select_newcham_form() might deliberately pick a player
       character type (random selection never does) which
       polyok() rejects, so we need a special case here */
    if (is_mplayer(mdat))
        return mdat;
    /* shapeshifters are rejected by polyok() but allow a shapeshifter
       to take on its 'natural' form */
    if ((mdat.mflags2 & MFLAGS.M2_SHAPESHIFTER) !== 0
        && (mon.cham ?? NON_PM) >= 0 && mndx === mon.cham)
        return mdat;
    /* polyok() rules out M2_NOPOLY */
    return polyok(mdat) ? mdat : null;
}

// src/mon.c:5255 mgender_from_permonst()
export function mgender_from_permonst(mtmp, mdat) {
    if (mdat.mflags2 & 0x10000 /* M2_MALE */) {
        mtmp.female = 0;
    } else if (mdat.mflags2 & 0x20000 /* M2_FEMALE */) {
        mtmp.female = 1;
    } else if (!(mdat.mflags2 & 0x40000 /* M2_NEUTER */)) {
        /* the roll fires before the vampire exemption is tested */
        if (!rn2(10) && !(mtmp.cham >= 0
                          && is_vampshifter_mon(mtmp)))
            mtmp.female = mtmp.female ? 0 : 1;
    }
}

const is_vampshifter_mon = (m) => m.cham === PMNAMES.PM_VAMPIRE
    || m.cham === PMNAMES.PM_VAMPIRE_LEADER
    || m.cham === PMNAMES.PM_VLAD_THE_IMPALER;

function restore_stoning_shapechanger(mtmp) {
    mtmp.mcanmove = 1;
    mtmp.mfrozen = 0;
    mtmp.mhpmax = Math.max(mtmp.mhpmax | 0, (mtmp.m_lev | 0) + 1, 10);
    mtmp.mhp = mtmp.mhpmax;
}

// src/mon.c:3766 vamp_stone(). A shifted vampire family member gets one
// chance to resume its natural form before petrification. Other
// shapechangers, notably sandestins, do the same when their natural form has
// intrinsic stone resistance.
export async function vamp_stone(mtmp) {
    if (is_vampshifter_mon(mtmp)) {
        const mndx = mtmp.cham;
        const x = mtmp.mx, y = mtmp.my;

        if (ismnum(mndx) && mndx !== mtmp.mnum
            && !((game.mvitals?.[mndx]?.mvflags ?? 0) & G_GENOD)) {
            const olddata = mtmp.data;
            const oldname = x_monnam(
                mtmp, ARTICLE_NONE, null,
                SUPPRESS_SADDLE | SUPPRESS_HALLUCINATION
                    | SUPPRESS_INVISIBLE | SUPPRESS_IT,
                false);
            const motion = amorphous(olddata) ? 'coalesces on the'
                : is_flyer(olddata) ? 'drops to the'
                                    : 'writhes on the';
            const firstMessage = `The lapidifying ${oldname} ${motion} ${
                surface(x, y)}`;

            restore_stoning_shapechanger(mtmp);
            if (engulfing_u(mtmp)) {
                const { expels } = await import('./mhitu.js');
                await expels(mtmp, olddata, false);
            }
            if (amorphous(olddata)) {
                const { closed_door } = await import('./cmd.js');
                if (closed_door(mtmp.mx, mtmp.my)) {
                    const new_xy = { x: 0, y: 0 };
                    if (enexto(new_xy, mtmp.mx, mtmp.my, game.mons[mndx]))
                        await rloc_to_flag(mtmp, new_xy.x, new_xy.y, 0);
                }
            }
            if (canspotmon(mtmp)) {
                await pline(`${firstMessage}!`);
                await display_nhwindow_message();
            }
            await newcham(mtmp, game.mons[mndx], NO_NC_FLAGS);
            mtmp.cham = mtmp.mnum === mndx ? NON_PM : mndx;
            if (canspotmon(mtmp)) {
                await pline(`${Amonnam(mtmp)} rises from the ${
                    surface(mtmp.mx, mtmp.my)} with renewed agility!`);
            }
            newsym(mtmp.mx, mtmp.my);
            return false;
        }
    } else if (ismnum(mtmp.cham)
               && ((game.mons[mtmp.cham]?.mresists ?? 0)
                   & MFLAGS.MR_STONE)) {
        restore_stoning_shapechanger(mtmp);
        await newcham(mtmp, game.mons[mtmp.cham], NC_SHOW_MSG);
        newsym(mtmp.mx, mtmp.my);
        return false;
    }
    return true;
}

/* rndmonst/newmonhp live in makemon.js which imports this file; wired */
let mon_fns_cham = null;
export function mon_wire_cham(fns) { mon_fns_cham = fns; }

// src/mon.c:5796 usmellmon(), used when a monster changes into an unseen
// form. The species exclusions prevent a unicorn or jellyfish from falling
// through to the generic class message.
async function usmellmon(mdat) {
    if (!mdat || !olfaction(game.youmonst.data))
        return false;

    const mndx = mdat.pmidx;
    let nonspecific = false;

    switch (mndx) {
    case PMNAMES.PM_ROTHE:
    case PMNAMES.PM_MINOTAUR:
        await You('notice a bovine smell.');
        return true;
    case PMNAMES.PM_CAVE_DWELLER:
    case PMNAMES.PM_BARBARIAN:
    case PMNAMES.PM_NEANDERTHAL:
        await You('smell body odor.');
        return true;
    case PMNAMES.PM_HORNED_DEVIL:
    case PMNAMES.PM_BALROG:
    case PMNAMES.PM_ASMODEUS:
    case PMNAMES.PM_DISPATER:
    case PMNAMES.PM_YEENOGHU:
    case PMNAMES.PM_ORCUS:
        return false;
    case PMNAMES.PM_HUMAN_WEREJACKAL:
    case PMNAMES.PM_HUMAN_WERERAT:
    case PMNAMES.PM_HUMAN_WEREWOLF:
    case PMNAMES.PM_WEREJACKAL:
    case PMNAMES.PM_WERERAT:
    case PMNAMES.PM_WEREWOLF:
    case PMNAMES.PM_OWLBEAR:
        await You("detect an odor reminiscent of an animal's den.");
        return true;
    case PMNAMES.PM_STEAM_VORTEX:
        await You('smell steam.');
        return true;
    case PMNAMES.PM_GREEN_SLIME:
        await pline('Something stinks.');
        return true;
    case PMNAMES.PM_VIOLET_FUNGUS:
    case PMNAMES.PM_SHRIEKER:
        await You('smell mushrooms.');
        return true;
    case PMNAMES.PM_WHITE_UNICORN:
    case PMNAMES.PM_GRAY_UNICORN:
    case PMNAMES.PM_BLACK_UNICORN:
    case PMNAMES.PM_JELLYFISH:
        return false;
    default:
        nonspecific = true;
        break;
    }

    if (!nonspecific)
        return false;

    switch (mdat.mlet) {
    case MONSYMS.S_DOG:
        await You('notice a dog smell.');
        return true;
    case MONSYMS.S_DRAGON:
        await You('smell a dragon!');
        return true;
    case MONSYMS.S_FUNGUS:
        await pline('Something smells moldy.');
        return true;
    case MONSYMS.S_UNICORN:
        await You(`detect a${mndx === PMNAMES.PM_PONY ? 'n' : ' strong'} odor reminiscent of a stable.`);
        return true;
    case MONSYMS.S_ZOMBIE:
        await You('smell rotting flesh.');
        return true;
    case MONSYMS.S_EEL:
        await You('smell fish.');
        return true;
    case MONSYMS.S_ORC: {
        const heroIsOrc = is_orc(game.youmonst.data)
            || game.urace?.filecode === 'Orc';
        if (heroIsOrc)
            await You('notice an attractive smell.');
        else
            await pline('A foul stench makes you feel a little nauseated.');
        return true;
    }
    default:
        return false;
    }
}

// src/mon.c:5278 newcham(). The no-message creation path remains synchronous
// for makemon(); NC_SHOW_MSG callers await the conditional promise below.
export function newcham(mtmp, mdat, ncflags) {
    let mndx = -1;
    const msg = !!(ncflags & NC_SHOW_MSG);
    const seenorsensed = msg ? canspotmon(mtmp) : false;
    const oldname = msg
        ? upstart(x_monnam(mtmp, mtmp.mtame ? ARTICLE_YOUR : ARTICLE_THE,
                           null, SUPPRESS_SADDLE, false))
        : '';

    if (!mdat) {
        let tryct = 20;
        do {
            mndx = select_newcham_form(mtmp);
            mdat = accept_newcham_form(mtmp, mndx);
            if (mdat)
                break;
        } while (--tryct > 0);
        if (!mdat)
            return 0;
    } else {
        mndx = game.mons.indexOf(mdat);
    }

    if (mdat === game.mons[mtmp.mnum])
        return 0;

    mgender_from_permonst(mtmp, mdat);

    /* hp: same fraction of max as before */
    const hpn = mtmp.mhp, hpd = mtmp.mhpmax;
    mon_fns_cham?.newmonhp?.(mtmp, mndx);
    mtmp.mhp = Math.trunc((hpn * mtmp.mhp) / hpd);
    if (mtmp.mhp < 0 || mtmp.mhp > mtmp.mhpmax)
        mtmp.mhp = mtmp.mhpmax;
    if (!mtmp.mhp)
        mtmp.mhp = 1;

    /* take on the new form */
    const olddata = game.mons[mtmp.mnum];
    mtmp.mnum = mndx;
    mtmp.data = mdat;

    const leashNeedsRelease = mtmp.mleashed
        && (mtmp.mnum === PMNAMES.PM_LONG_WORM
            || unsolid(mtmp.data)
            || (nolimbs(mtmp.data) && !has_head(mtmp.data)));
    if (mtmp.mleashed && !leashNeedsRelease)
        update_inventory();

    const finishChange = () => {
        if (emits_light(olddata) !== emits_light(mdat)) {
            if (emits_light(olddata))
                del_light_source(LS_MONSTER, mtmp.m_id);
            if (emits_light(mdat))
                new_light_source(mtmp.mx, mtmp.my, emits_light(mdat),
                                 LS_MONSTER, mtmp.m_id);
        }

        if (mdat === game.mons[PMNAMES.PM_LONG_WORM]
            && (mtmp.wormno = get_wormno()) !== 0) {
            worm_wire(goodpos);
            initworm(mtmp, rn2(5));
            place_worm_tail_randomly(mtmp, mtmp.mx, mtmp.my);
        }

        mtmp.meverseen = 0;
        newsym(mtmp.mx, mtmp.my);
    };

    const showChange = async () => {
        if (!canspotmon(mtmp)) {
            if (seenorsensed)
                await pline(`${oldname} disappears!`);
            await usmellmon(mdat);
        } else if (!seenorsensed) {
            const newname = x_monnam(
                mtmp, mtmp.mtame ? ARTICLE_YOUR : ARTICLE_A,
                null, SUPPRESS_SADDLE, false);
            await pline(`${upstart(newname)} appears!`);
        } else {
            const newname = noname_monnam(mtmp, ARTICLE_A);
            await pline(`${oldname} turns into ${newname}!`);
        }
        return 1;
    };

    const finishPostChange = async () => {
        if (msg)
            await showChange();
        const { possibly_unwield } = await import('./weapon.js');
        await possibly_unwield(mtmp, !!(ncflags & NC_VIA_WAND_OR_SPELL));
        await mon_break_armor(
            mtmp, !!(ncflags & NC_VIA_WAND_OR_SPELL));
        return 1;
    };

    if (leashNeedsRelease) {
        return (async () => {
            if (canseemon(mtmp)) {
                const possessive = ['his', 'her', 'its', 'their'][
                    pronoun_gender(mtmp, PRONOUN_HALLU)];
                await pline(`${Monnam(mtmp)} pulls free of ${possessive} leash!`);
            } else {
                await pline('Your leash falls slack.');
            }
            const leash = (game.invent || []).find((obj) =>
                obj.otyp === ONAMES.LEASH && obj.leashmon === mtmp.m_id);
            if (leash) {
                leash.leashmon = 0;
                update_inventory();
            }
            mtmp.mleashed = 0;
            finishChange();
            return msg ? await finishPostChange() : 1;
        })();
    }

    finishChange();
    return msg ? finishPostChange() : 1;
}

// src/mon.c:4367 wake_nearby() / wake_nearto_core() — noise wakes monsters
// within u.ulevel*20 squared distance. Draw-neutral, but the waking matters:
// a monster left asleep moves differently on every later turn.
export async function wake_nearby(petcall) {
    await wake_nearto_core(game.u.ux, game.u.uy, game.u.ulevel * 20, petcall);
}

export async function wake_nearto_core(x, y, distance, petcall) {
    /* C walks the fmon chain; this port keeps it as game.level.monsters,
       newest-first (see makemon.js's unshift). There is no game.fmon. */
    for (const mtmp of (game.level?.monsters || [])) {
        if (DEADMONSTER(mtmp))
            continue;
        if (distance === 0 || dist2(mtmp.mx, mtmp.my, x, y) < distance) {
            /* sleep for N turns uses mtmp->mfrozen, but so does paralysis
               so we leave mfrozen monsters alone */
            await wake_msg(mtmp, false);
            mtmp.msleeping = 0; /* wake indeterminate sleep */
            if (!(game.mons[mtmp.mnum].geno & G_UNIQ))
                mtmp.mstrategy &= ~STRAT_WAITMASK; /* wake 'meditation' */
            if (game.context?.mon_moving || !petcall)
                continue;
            if (mtmp.mtame) {
                if (!mtmp.isminion)
                    (mtmp.edog ||= {}).whistletime = game.moves;
                /* src/mon.c:4393 — "Fix up a pet who is stuck 'fleeing' its
                   master". Skipping this left the pet's mtrack ring holding
                   stale squares, and m_move's backtrack test reads the INDEX
                   of the matching entry: `rn2(4 * (cnt - j))`. A stale ring
                   matches at the wrong j and draws the wrong modulus. */
                mon_track_clear(mtmp);
            }
        }
    }
    disturb_buried_zombies(x, y);
}

// src/mon.c:4402 wake_nearto()
export async function wake_nearto(x, y, distance) {
    await wake_nearto_core(x, y, distance, false);
}

// src/mon.c:4649 restore_cham() — reloaded shapechanger bookkeeping.
export function restore_cham(mon) {
    if (/* Protection_from_shape_changers: no source yet || */ mon.mcan) {
        /* force chameleon or mimic to revert to its natural shape */
        (game.unported ||= new Set()).add('mon:restore_cham:normal_shape');
    } else if ((mon.cham ?? NON_PM) === NON_PM) {
        /* chameleon doesn't change shape here, just gets allowed to do so;
           pm_to_cham: only M2_SHAPESHIFTER species map to themselves */
        const ptr = game.mons[mon.mnum];
        if (ptr && (ptr.mflags2 & MFLAGS.M2_SHAPESHIFTER))
            mon.cham = mon.mnum;
    }
}

// src/mon.c:4806 hide_monst() — unwatched hiders may hide again.
export function hide_monst(mon) {
    const ptr = game.mons[mon.mnum];
    const hider_under = hides_under(ptr) || ptr.mlet === MONSYMS.S_EEL;

    if ((is_hider(ptr) || hider_under)
        && !(mon.mundetected || M_AP_TYPE(mon))) {
        /* C forces the viz_array cell dark so cansee() can't block the
           re-hide; our restrap reads cansee() live, so mask via the same
           trick through the vision seam if present */
        if (is_hider(ptr))
            restrap(mon);
        /* try again if mimic missed its 1/3 chance to hide */
        if (ptr.mlet === MONSYMS.S_MIMIC && !M_AP_TYPE(mon))
            restrap(mon);
        if (hider_under)
            hideunder(mon);
    }
}

// src/mon.c:4552 get_iter_mons() — iterate all living monsters on the
// current level, calling bfunc for each until one returns true; returns
// that monster or null. The list is snapshotted the way C's nmon walk
// tolerates a mid-loop removal.
export async function get_iter_mons(bfunc) {
    for (const mtmp of [...(game.level?.monsters || [])]) {
        if (DEADMONSTER(mtmp) || mon_offmap(mtmp))
            continue;
        if (await bfunc(mtmp))
            return mtmp;
    }
    return null;
}

// src/mon.c:2696 mon_leaving_level(), bookkeeping for a monster leaving the
// level by migration or death: off the map, unstuck, mimicry revealed.
export async function mon_leaving_level(mon) {
    const mx = mon.mx, my = mon.my;
    const onmap = (isok(mx, my) && m_at(mx, my) === mon);

    /* to prevent an infinite relobj-flooreffects-hmon-killed loop */
    mon.mtrapped = 0;
    await unstuck(mon); /* mon is not swallowing or holding you nor held by you */

    /* vault guard might be at <0,0> */
    if (onmap || mon === m_at(0, 0)) {
        if (mon.wormno)
            await remove_worm(mon);
        else
            remove_monster(mx, my);
    }
    if (onmap) {
        mon.mundetected = 0; /* for migration; doesn't matter for death */
        /* mimic must be revealed if it is going to migrate to another level
           or it is accompanying the hero to another level */
        if (mon.m_ap_type !== M_AP_NOTHING && mon.m_ap_type !== M_AP_MONSTER)
            seemimic(mon);
        await fill_pit(mx, my);
        newsym(mx, my);
    }
    if (mon === game.context?.polearm?.hitmon)
        game.context.polearm.hitmon = null;
}

// src/mon.c:2561 relmon(), take a monster off the level's monster list,
// prepending it to migrating_mons or mydogs when a list is given.
export async function relmon(mon, monst_list) {
    if (!(game.level?.monsters || []).length)
        throw new Error('relmon: no fmon available.');

    await mon_leaving_level(mon);

    const idx = game.level.monsters.indexOf(mon);
    if (idx < 0)
        throw new Error('relmon: mon not in list.');
    game.level.monsters.splice(idx, 1);

    if (monst_list) /* put on migrating_mons or mydogs */
        monst_list.unshift(mon);
}

// src/mon.c:4698 maybe_unhide_at(), a hider at <x,y> that lost its cover
// stops hiding.
export function maybe_unhide_at(x, y) {
    let mtmp;
    let undetected = false, trapped = false;

    if ((mtmp = m_at(x, y)) != null) {
        undetected = !!mtmp.mundetected;
        trapped = !!mtmp.mtrapped;
    } else if (u_at(x, y)) {
        mtmp = game.youmonst;
        undetected = !!game.u.uundetected;
        trapped = !!game.u.utrap;
    } else {
        return;
    }
    if (undetected
        && ((hides_under(mtmp.data)
             && (!OBJ_AT(x, y) || trapped
                 || !can_hide_under_obj((game.level.objects || [])
                                        .find(o => o.ox === x && o.oy === y))))
            || (mtmp.data.mlet === MONSYMS.S_EEL && !is_pool(x, y))))
        hideunder(mtmp);
}

// src/mon.c pm_to_cham(); return the shapeshifter type for a monster index
export function pm_to_cham(mndx) {
    let mcham = NON_PM;

    /* the shapeshifters are the only monsters who use 'cham' field */
    if (ismnum(mndx) && is_shapeshifter(game.mons[mndx]))
        mcham = mndx;
    return mcham;
}

// src/mon.c:4527 iter_mons(); iterate all monsters on the level, calling
// vfunc for each
export function iter_mons(vfunc) {
    for (const mtmp of [...(game.level.monsters || [])]) {
        if (DEADMONSTER(mtmp) || mon_offmap(mtmp))
            continue;
        vfunc(mtmp);
    }
}

// src/mon.c:5015 valid_vampshiftform(); Is this a valid shapeshift form for
// a vampire?
export function valid_vampshiftform(base, form) {
    if (base >= LOW_PM && is_vampire(game.mons[base])) {
        if (form === PMNAMES.PM_VAMPIRE_BAT || form === PMNAMES.PM_FOG_CLOUD
            || (form === PMNAMES.PM_WOLF && base !== PMNAMES.PM_VAMPIRE))
            return true;
    }
    return false;
}

// src/mon.c:5538 BREEDER_EGG
const BREEDER_EGG = () => !rn2(77);

// src/mon.c:5569 egg_type_from_parent(); the type of egg a monster lays;
// caller must handle lays_eggs() check
export function egg_type_from_parent(mnum, force_ordinary) {
    if (force_ordinary || !BREEDER_EGG()) {
        if (mnum === PMNAMES.PM_QUEEN_BEE)
            mnum = PMNAMES.PM_KILLER_BEE;
        else if (mnum === PMNAMES.PM_WINGED_GARGOYLE)
            mnum = PMNAMES.PM_GARGOYLE;
    }
    return mnum;
}

// src/mon.c:5609 kill_eggs(); kill off any eggs of genocided monsters
export function kill_eggs(obj_list) {
    for (const otmp of (obj_list || [])) {
        if (otmp.otyp === ONAMES.EGG) {
            if (dead_species(otmp.corpsenm, true)) {
                /*
                 * It seems we could also just catch this when
                 * it attempted to hatch, so we wouldn't have to
                 * search all of the objlists.. or stop all
                 * hatch timers based on a corpsenm.
                 */
                kill_egg(otmp);
            }
        } else if (Has_contents(otmp)) {
            kill_eggs(otmp.cobj);
        }
    }
}

// src/mon.c:5639 kill_genocided_monsters(); kill all monsters of a genocided
// species (and their eggs, everywhere)
export async function kill_genocided_monsters() {
    let kill_cham;
    let mndx;

    /*
     * Called during genocide, and again upon level change.  The latter
     * catches up with any migrating monsters as they finally arrive at
     * their intended destinations, so possessions get deposited there.
     *
     * The initial genocide is what removes any level-resident monsters
     * of the genocided species.
     */
    for (const mtmp of [...(game.level.monsters || [])]) {
        if (DEADMONSTER(mtmp))
            continue;
        mndx = monsndx(mtmp.data);
        kill_cham = (ismnum(mtmp.cham ?? NON_PM)
                     && (game.mvitals[mtmp.cham].mvflags & G_GENOD));
        if ((game.mvitals[mndx].mvflags & G_GENOD) || kill_cham) {
            if (ismnum(mtmp.cham ?? NON_PM) && !kill_cham)
                newcham(mtmp, null, NC_SHOW_MSG);
            else
                await mondead(mtmp);
        }
        if (mtmp.minvent)
            kill_eggs(mtmp.minvent);
    }

    kill_eggs(game.invent);
    kill_eggs(game.level.objects);
    kill_eggs(game.migrating_objs);
    kill_eggs(game.level.buriedobjs);
}

// src/mon.c:2827 mlifesaver(); the worn amulet of life saving that would fire
export function mlifesaver(mon) {
    if (!nonliving(mon.data) || is_vampshifter(mon)) {
        const otmp = which_armor(mon, W_AMUL);

        if (otmp && otmp.otyp === ONAMES.AMULET_OF_LIFE_SAVING)
            return otmp;
    }
    return null;
}

// src/mon.c mimic_hit_msg(); a disguised mimic hit by healing magic
export async function mimic_hit_msg(mtmp, otyp) {
    const ap = mtmp.mappearance;

    switch (M_AP_TYPE(mtmp)) {
    case M_AP_NOTHING:
    case M_AP_FURNITURE:
    case M_AP_MONSTER:
        break;
    case M_AP_OBJECT:
        if (otyp === ONAMES.SPE_HEALING || otyp === ONAMES.SPE_EXTRA_HEALING) {
            await pline_mon(mtmp, `${The(simple_typename(ap))} seems a more vivid ${
                c_obj_colors[game.objects[ap].oc_color]} than before.`);
        }
        break;
    }
}

/* include/monst.h:261 monmax_difficulty_lev() */
const monmax_difficulty_lev = () => monmax_difficulty(level_difficulty());

// src/mon.c m_respond_shrieker(); a shrieker shrieks and may call a purple worm
async function m_respond_shrieker(mtmp) {
    if (!Deaf()) {
        await pline(`${Monnam(mtmp)} shrieks.`);
        await stop_occupation();
    }
    if (!rn2(10)) { /* 1/10 chance per shriek to create a monster */
        /* new monster has a 1/13 chance to be a purple worm, random
           otherwise; baby purple worm if adult is too difficult */
        await makemon(rn2(13) ? null
                      : game.mons[montoostrong(PMNAMES.PM_PURPLE_WORM,
                                               monmax_difficulty_lev())
                                  ? PMNAMES.PM_BABY_PURPLE_WORM : PMNAMES.PM_PURPLE_WORM],
                      0, 0, NO_MM_FLAGS);
    }
    aggravate();
}

// src/mon.c m_respond_medusa(); Medusa gazes back
async function m_respond_medusa(mtmp) {
    let i;

    for (i = 0; i < NATTK; i++)
        if (mtmp.data.mattk[i][0] === ATTKS.AT_GAZE) {
            await gazemu(mtmp, mtmp.data.mattk[i]);
            break;
        }
}

// src/mon.c m_respond(); a monster reacts to being disturbed
export async function m_respond(mtmp) {
    if (mtmp.data.msound === MSOUND.MS_SHRIEK && !um_dist(mtmp.mx, mtmp.my, 1))
        await m_respond_shrieker(mtmp);
    if (mtmp.data === game.mons[PMNAMES.PM_MEDUSA] && couldsee(mtmp.mx, mtmp.my))
        await m_respond_medusa(mtmp);
    /* Erinyes will inform surrounding monsters of your crimes */
    if (mtmp.data === game.mons[PMNAMES.PM_ERINYS] && !mtmp.mpeaceful && m_canseeu(mtmp))
        aggravate();
}

// src/mon.c m_into_limbo(); send mtmp off the level with no destination
export function m_into_limbo(mtmp) {
    const target_lev = ledger_no(game.u.uz), xyloc = MIGR_APPROX_XY;

    mtmp.mstate |= MON_LIMBO;
    migrate_monster(mtmp, target_lev, xyloc);
}

// src/mon.c get_iter_mons_xy(); call bfunc(mon, x, y) for every monster on
// the level until it returns True; returns that monster
export async function get_iter_mons_xy(bfunc, x, y) {
    for (const mtmp of [...(game.level?.monsters || [])]) {
        if (DEADMONSTER(mtmp) || mon_offmap(mtmp))
            continue;
        if (await bfunc(mtmp, x, y))
            return mtmp;
    }
    return null;
}

// src/mon.c maybe_mnexto(); move mtmp next to the hero if a visible spot can
// be found (evading a kick)
export async function maybe_mnexto(mtmp) {
    const mm = { x: 0, y: 0 };
    const ptr = mtmp.data;
    const diagok = !NODIAG(monsndx(ptr));
    let tryct = 20;

    do {
        if (!enexto(mm, game.u.ux, game.u.uy, ptr))
            return;
        if (couldsee(mm.x, mm.y)
            /* don't move grid bugs diagonally */
            && (diagok || mm.x === mtmp.mx || mm.y === mtmp.my)) {
            /* [this doesn't honor the 'montelecontrol' option] */
            await rloc_to(mtmp, mm.x, mm.y);
            return;
        }
    } while (--tryct > 0);
}
